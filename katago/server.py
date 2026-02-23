#!/usr/bin/env python3
"""
HTTP wrapper for KataGo analysis engine.
POST /analyze  { board, boardSize, komi, nextPlayer }
             → { ownership, scoreLead, winrate }
GET  /health  → { ok }
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys

from aiohttp import web

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger(__name__)

MODEL   = os.environ.get("MODEL_PATH",  "/model.bin.gz")
CONFIG  = os.environ.get("CONFIG_PATH", "/app/analysis.cfg")
KATAGO  = os.environ.get("KATAGO_BIN",  "katago")

# Column letters used by KataGo (no 'I')
COLS = "ABCDEFGHJKLMNOPQRST"

katago: asyncio.subprocess.Process | None = None
pending: dict[str, asyncio.Future] = {}
counter = 0
write_sem = asyncio.Semaphore(1)


async def launch() -> None:
    global katago
    cmd = [KATAGO, "analysis", "-model", MODEL, "-config", CONFIG]
    log.info("Launching: %s", " ".join(cmd))
    katago = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    asyncio.create_task(read_stdout())
    asyncio.create_task(pipe_stderr())
    log.info("KataGo started (pid %d)", katago.pid)


async def pipe_stderr() -> None:
    async for line in katago.stderr:  # type: ignore[union-attr]
        log.info("[katago] %s", line.decode().rstrip())


async def read_stdout() -> None:
    async for line in katago.stdout:  # type: ignore[union-attr]
        try:
            resp = json.loads(line)
        except json.JSONDecodeError:
            log.warning("Non-JSON from katago: %s", line[:200])
            continue
        qid = resp.get("id")
        fut = pending.pop(qid, None)
        if fut and not fut.done():
            fut.set_result(resp)


def board_to_stones(board_str: str, board_size: int) -> list:
    """Convert our 'B'/'W'/'.' string to KataGo initialStones list."""
    stones = []
    for idx, ch in enumerate(board_str):
        if ch == ".":
            continue
        y, x = divmod(idx, board_size)
        # KataGo: column letter (A=0) + row number (1 = bottom row)
        coord = COLS[x] + str(board_size - y)
        stones.append(["B" if ch == "B" else "W", coord])
    return stones


async def query_katago(
    board_str: str, board_size: int, komi: float, next_player: str
) -> dict:
    global counter
    counter += 1
    qid = f"q{counter}"

    stones = board_to_stones(board_str, board_size)

    req = {
        "id": qid,
        "initialStones": stones,
        "initialPlayer": "B" if next_player == "black" else "W",
        "moves": [],
        "rules": "chinese",
        "komi": komi,
        "boardXSize": board_size,
        "boardYSize": board_size,
        "analyzeTurns": [0],
        "includeOwnership": True,
        "maxVisits": 1,
    }

    loop = asyncio.get_event_loop()
    fut: asyncio.Future = loop.create_future()
    pending[qid] = fut

    async with write_sem:
        katago.stdin.write((json.dumps(req) + "\n").encode())  # type: ignore
        await katago.stdin.drain()  # type: ignore

    return await asyncio.wait_for(fut, timeout=30.0)


async def handle_analyze(req: web.Request) -> web.Response:
    if katago is None:
        return web.json_response({"error": "KataGo not ready"}, status=503)
    try:
        data = await req.json()
        result = await query_katago(
            data["board"],
            int(data["boardSize"]),
            float(data.get("komi", 6.5)),
            data.get("nextPlayer", "black"),
        )
        root = result.get("rootInfo", {})
        return web.json_response({
            "ownership": result.get("ownership", []),
            "scoreLead": root.get("scoreLead", 0.0),
            "winrate":   root.get("winrate",   0.5),
        })
    except asyncio.TimeoutError:
        return web.json_response({"error": "timeout"}, status=504)
    except Exception as exc:
        log.exception("analyze error")
        return web.json_response({"error": str(exc)}, status=500)


async def handle_health(req: web.Request) -> web.Response:
    return web.json_response({"ok": katago is not None})


async def main() -> None:
    await launch()

    app = web.Application()
    app.router.add_post("/analyze", handle_analyze)
    app.router.add_get("/health",   handle_health)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)
    await site.start()
    log.info("Listening on :8080")

    await asyncio.Event().wait()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
