'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Board, Position, Color } from '@/lib/go/types';
import { BOARD_SIZE, STAR_POINTS } from '@/lib/go/constants';

interface GoBoardProps {
  board: Board;
  currentPlayer: Color;
  lastMove: Position | null;
  deadStones?: Position[];
  territoryBlack?: Position[];
  territoryWhite?: Position[];
  isMyTurn: boolean;
  isScoring?: boolean;
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
  onPlace,
  onDeadStoneToggle,
}: GoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<Position | null>(null);

  // Calculate cell size from canvas dimensions
  const getCellSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    return canvas.width / (BOARD_SIZE + 1);
  }, []);

  // Convert pixel coordinates to board position
  const pixelToBoard = useCallback(
    (px: number, py: number): Position | null => {
      const cellSize = getCellSize();
      if (cellSize === 0) return null;

      const x = Math.round(px / cellSize - 1);
      const y = Math.round(py / cellSize - 1);

      if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;

      // Check if click is close enough to intersection
      const ix = (x + 1) * cellSize;
      const iy = (y + 1) * cellSize;
      const dist = Math.sqrt((px - ix) ** 2 + (py - iy) ** 2);
      if (dist > cellSize * 0.45) return null;

      return { x, y };
    },
    [getCellSize]
  );

  // Draw the board
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = getCellSize();
    const stoneRadius = cellSize * 0.45;

    // Background
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = (i + 1) * cellSize;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, cellSize);
      ctx.lineTo(pos, BOARD_SIZE * cellSize);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(cellSize, pos);
      ctx.lineTo(BOARD_SIZE * cellSize, pos);
      ctx.stroke();
    }

    // Star points
    for (const [sx, sy] of STAR_POINTS) {
      const px = (sx + 1) * cellSize;
      const py = (sy + 1) * cellSize;
      ctx.fillStyle = LINE_COLOR;
      ctx.beginPath();
      ctx.arc(px, py, cellSize * STAR_POINT_RADIUS_RATIO, 0, Math.PI * 2);
      ctx.fill();
    }

    // Territory markers
    const drawTerritory = (positions: Position[], color: string) => {
      for (const pos of positions) {
        const px = (pos.x + 1) * cellSize;
        const py = (pos.y + 1) * cellSize;
        ctx.fillStyle = color;
        ctx.fillRect(
          px - cellSize * 0.15,
          py - cellSize * 0.15,
          cellSize * 0.3,
          cellSize * 0.3
        );
      }
    };

    if (isScoring) {
      drawTerritory(territoryBlack, 'rgba(0,0,0,0.4)');
      drawTerritory(territoryWhite, 'rgba(255,255,255,0.6)');
    }

    // Stones
    const deadSet = new Set(deadStones.map(p => `${p.x},${p.y}`));

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const stone = board[y][x];
        if (!stone) continue;

        const px = (x + 1) * cellSize;
        const py = (y + 1) * cellSize;
        const isDead = deadSet.has(`${x},${y}`);

        // Stone shadow
        if (!isDead) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.arc(px + 1.5, py + 1.5, stoneRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stone body
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

        // Dead stone X marker
        if (isDead) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
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
    if (lastMove) {
      const px = (lastMove.x + 1) * cellSize;
      const py = (lastMove.y + 1) * cellSize;
      const stone = board[lastMove.y][lastMove.x];
      ctx.fillStyle = stone === 'black' ? '#fff' : '#000';
      ctx.beginPath();
      ctx.arc(px, py, stoneRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hover preview
    if (hoverRef.current && isMyTurn && !isScoring) {
      const { x, y } = hoverRef.current;
      if (board[y][x] === null) {
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
    getCellSize,
  ]);

  // Resize canvas to fit container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const size = Math.min(container.clientWidth, container.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    // Recalculate with CSS size for drawing
    canvas.width = size;
    canvas.height = size;

    draw();
  }, [draw]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
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
    } else if (isMyTurn) {
      onPlace(pos);
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
    } else if (isMyTurn) {
      onPlace(pos);
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

  return (
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
  );
}
