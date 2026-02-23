'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Board, Position, Color } from '@/lib/go/types';
import { getStarPoints } from '@/lib/go/constants';

interface GoBoardProps {
  board: Board;
  currentPlayer: Color;
  lastMove: Position | null;
  deadStones?: Position[];
  territoryBlack?: Position[];
  territoryWhite?: Position[];
  isMyTurn: boolean;
  isScoring?: boolean;
  showTerritory?: boolean;
  isSubmitting?: boolean;
  ownership?: number[] | null;   // KataGo ownership: -1 (white) to 1 (black)
  isAnalyzing?: boolean;
  onPlace: (pos: Position) => void;
  onDeadStoneToggle?: (pos: Position) => void;
}

const BOARD_COLOR = '#DCB35C';
const LINE_COLOR = '#1a1a1a';
const STAR_POINT_RADIUS_RATIO = 0.12;

export default function GoBoard({
  board,
  currentPlayer,
  lastMove,
  deadStones = [],
  territoryBlack = [],
  territoryWhite = [],
  isMyTurn,
  isScoring = false,
  showTerritory = false,
  isSubmitting = false,
  ownership = null,
  isAnalyzing = false,
  onPlace,
  onDeadStoneToggle,
}: GoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<Position | null>(null);
  // Store CSS display size (not internal pixel size) for coordinate math
  const cssSizeRef = useRef(0);
  const [pendingPos, setPendingPos] = useState<Position | null>(null);

  const boardSize = board.length;

  // Reset pending selection when turn changes or game phase changes
  useEffect(() => {
    setPendingPos(null);
  }, [isMyTurn, isScoring]);

  // Cell size in CSS pixels (independent of DPR)
  const getCellSize = useCallback(() => {
    return cssSizeRef.current > 0 ? cssSizeRef.current / (boardSize + 1) : 0;
  }, [boardSize]);

  // Convert pixel coordinates (CSS) to board position
  const pixelToBoard = useCallback(
    (px: number, py: number): Position | null => {
      const cellSize = getCellSize();
      if (cellSize === 0) return null;

      const x = Math.round(px / cellSize - 1);
      const y = Math.round(py / cellSize - 1);

      if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return null;

      const ix = (x + 1) * cellSize;
      const iy = (y + 1) * cellSize;
      const dist = Math.sqrt((px - ix) ** 2 + (py - iy) ** 2);
      if (dist > cellSize * 0.45) return null;

      return { x, y };
    },
    [getCellSize, boardSize]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = getCellSize();
    if (cellSize === 0) return;
    const stoneRadius = cellSize * 0.45;
    const cssSize = cssSizeRef.current;

    // Background
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, cssSize, cssSize);

    // Grid lines
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i < boardSize; i++) {
      const pos = (i + 1) * cellSize;
      ctx.beginPath();
      ctx.moveTo(pos, cellSize);
      ctx.lineTo(pos, boardSize * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cellSize, pos);
      ctx.lineTo(boardSize * cellSize, pos);
      ctx.stroke();
    }

    // Star points
    for (const [sx, sy] of getStarPoints(boardSize)) {
      const px = (sx + 1) * cellSize;
      const py = (sy + 1) * cellSize;
      ctx.fillStyle = LINE_COLOR;
      ctx.beginPath();
      ctx.arc(px, py, cellSize * STAR_POINT_RADIUS_RATIO, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Territory / Ownership rendering ────────────────────────────────────────

    // BFS-based territory circles (used for scoring phase, or fallback)
    const drawTerritory = (positions: Position[], isBlack: boolean, actual: boolean) => {
      const r = cellSize * (actual ? 0.28 : 0.22);
      for (const pos of positions) {
        const px = (pos.x + 1) * cellSize;
        const py = (pos.y + 1) * cellSize;
        ctx.fillStyle = isBlack
          ? (actual ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.38)')
          : (actual ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.62)');
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (!isBlack) {
          ctx.strokeStyle = actual ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    // KataGo ownership heatmap (used for territory estimation when data available)
    const drawOwnership = (ow: number[]) => {
      const r = cellSize * 0.26;
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          if (board[y][x] !== null) continue; // skip existing stones
          const val = ow[y * boardSize + x];  // +1=black, -1=white
          if (Math.abs(val) < 0.12) continue; // skip heavily contested (dame)
          const alpha = Math.min(Math.abs(val) * 1.3, 0.88);
          const px = (x + 1) * cellSize;
          const py = (y + 1) * cellSize;
          if (val > 0) {
            ctx.fillStyle = `rgba(0,0,0,${alpha})`;
          } else {
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
          }
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          if (val < 0) {
            ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.35})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    if (isScoring) {
      // Scoring phase: BFS territory (dead stones already removed)
      drawTerritory(territoryBlack, true, true);
      drawTerritory(territoryWhite, false, true);
    } else if (showTerritory) {
      if (ownership && ownership.length === boardSize * boardSize) {
        // KataGo ownership heatmap
        drawOwnership(ownership);
      } else {
        // Fallback: BFS territory circles
        drawTerritory(territoryBlack, true, false);
        drawTerritory(territoryWhite, false, false);
      }
    }

    // Stones
    const deadSet = new Set(deadStones.map(p => `${p.x},${p.y}`));

    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const stone = board[y][x];
        if (!stone) continue;

        const px = (x + 1) * cellSize;
        const py = (y + 1) * cellSize;
        const isDead = deadSet.has(`${x},${y}`);

        if (!isDead) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.arc(px + 1.5, py + 1.5, stoneRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (stone === 'black') {
          const grad = ctx.createRadialGradient(
            px - stoneRadius * 0.3,
            py - stoneRadius * 0.3,
            stoneRadius * 0.1,
            px,
            py,
            stoneRadius
          );
          grad.addColorStop(0, '#555');
          grad.addColorStop(1, '#000');
          ctx.fillStyle = isDead ? 'rgba(0,0,0,0.3)' : grad;
        } else {
          const grad = ctx.createRadialGradient(
            px - stoneRadius * 0.3,
            py - stoneRadius * 0.3,
            stoneRadius * 0.1,
            px,
            py,
            stoneRadius
          );
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#ccc');
          ctx.fillStyle = isDead ? 'rgba(200,200,200,0.3)' : grad;
        }

        ctx.beginPath();
        ctx.arc(px, py, stoneRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isDead) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2.5;
          const s = stoneRadius * 0.5;
          ctx.beginPath();
          ctx.moveTo(px - s, py - s);
          ctx.lineTo(px + s, py + s);
          ctx.moveTo(px + s, py - s);
          ctx.lineTo(px - s, py + s);
          ctx.stroke();
        }
      }
    }

    // Last move marker
    if (
      lastMove &&
      lastMove.x >= 0 && lastMove.x < boardSize &&
      lastMove.y >= 0 && lastMove.y < boardSize
    ) {
      const stone = board[lastMove.y][lastMove.x];
      if (stone) {
        const px = (lastMove.x + 1) * cellSize;
        const py = (lastMove.y + 1) * cellSize;
        ctx.fillStyle = stone === 'black' ? '#fff' : '#000';
        ctx.beginPath();
        ctx.arc(px, py, stoneRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pending position — selected but not yet confirmed
    if (pendingPos && isMyTurn && !isScoring) {
      const { x, y } = pendingPos;
      if (
        x >= 0 && x < boardSize && y >= 0 && y < boardSize &&
        board[y][x] === null
      ) {
        const px = (x + 1) * cellSize;
        const py = (y + 1) * cellSize;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(px + 2, py + 2, stoneRadius, 0, Math.PI * 2);
        ctx.fill();

        // Stone body (slightly transparent)
        if (currentPlayer === 'black') {
          const grad = ctx.createRadialGradient(
            px - stoneRadius * 0.3, py - stoneRadius * 0.3, stoneRadius * 0.1,
            px, py, stoneRadius
          );
          grad.addColorStop(0, '#555');
          grad.addColorStop(1, '#000');
          ctx.fillStyle = grad;
        } else {
          const grad = ctx.createRadialGradient(
            px - stoneRadius * 0.3, py - stoneRadius * 0.3, stoneRadius * 0.1,
            px, py, stoneRadius
          );
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#ccc');
          ctx.fillStyle = grad;
        }
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.arc(px, py, stoneRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Amber confirmation ring
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, stoneRadius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Hover preview — only when no pending position, only on my turn
    if (hoverRef.current && isMyTurn && !isScoring && !pendingPos) {
      const { x, y } = hoverRef.current;
      if (
        x >= 0 && x < boardSize && y >= 0 && y < boardSize &&
        board[y][x] === null
      ) {
        const px = (x + 1) * cellSize;
        const py = (y + 1) * cellSize;
        ctx.fillStyle =
          currentPlayer === 'black'
            ? 'rgba(0,0,0,0.3)'
            : 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(px, py, stoneRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [
    board,
    currentPlayer,
    lastMove,
    deadStones,
    territoryBlack,
    territoryWhite,
    isMyTurn,
    isScoring,
    showTerritory,
    ownership,
    pendingPos,
    getCellSize,
    boardSize,
  ]);

  // Resize canvas with proper DPR (HiDPI/Retina support)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cssSize = Math.min(container.clientWidth, container.clientHeight);
    if (cssSize === 0) return;

    const dpr = window.devicePixelRatio || 1;
    cssSizeRef.current = cssSize;

    // Setting canvas.width resets the canvas and clears transforms — do this first
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height = Math.floor(cssSize * dpr);
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    // Re-apply DPR scale after reset (drawing coords remain in CSS pixels)
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const pos = pixelToBoard(coords.x, coords.y);
    if (!pos) return;

    if (isScoring && onDeadStoneToggle) {
      onDeadStoneToggle(pos);
    } else if (isMyTurn && !isSubmitting) {
      // Select (or reselect) position — confirm via button
      if (board[pos.y][pos.x] === null) {
        setPendingPos(pos);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const coords = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const pos = pixelToBoard(coords.x, coords.y);
    if (!pos) return;

    if (isScoring && onDeadStoneToggle) {
      onDeadStoneToggle(pos);
    } else if (isMyTurn && !isSubmitting) {
      if (board[pos.y][pos.x] === null) {
        setPendingPos(pos);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const pos = pixelToBoard(coords.x, coords.y);
    hoverRef.current = pos;
    draw();
  };

  const handleMouseLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const handleConfirmPlace = () => {
    if (!pendingPos || isSubmitting) return;
    onPlace(pendingPos);
    setPendingPos(null);
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        ref={containerRef}
        className="w-full aspect-square max-w-[min(100vw,100vh-200px)]"
      >
        <canvas
          ref={canvasRef}
          className="cursor-pointer touch-none"
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Confirm / cancel row — only visible after selecting a position */}
      <div className="h-10 flex items-center justify-center gap-2">
        {isAnalyzing && showTerritory && !isScoring ? (
          <span className="text-xs text-stone-400 animate-pulse">AI 분석 중...</span>
        ) : pendingPos && isMyTurn && !isScoring ? (
          <>
            <button
              onClick={handleConfirmPlace}
              disabled={isSubmitting}
              className="px-6 py-2 bg-stone-800 text-white rounded-lg font-semibold text-sm hover:bg-stone-700 active:bg-stone-900 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '...' : '착수'}
            </button>
            <button
              onClick={() => setPendingPos(null)}
              className="px-4 py-2 text-stone-600 border border-stone-300 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            >
              취소
            </button>
          </>
        ) : isMyTurn && !isScoring ? (
          <span className="text-xs text-stone-400">위치를 선택하세요</span>
        ) : null}
      </div>
    </div>
  );
}
