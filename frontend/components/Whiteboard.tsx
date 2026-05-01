'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, Trash2, Pen } from 'lucide-react';
import { getSocket } from '@/lib/socket';

type Stroke = {
  points: [number, number][];
  color: string;
  width: number;
};

export default function Whiteboard({
  room,
  readOnly = false,
}: {
  room: string;
  readOnly?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#0f172a');
  const [width, setWidth] = useState(2);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  function getCtx() {
    const c = canvasRef.current;
    if (!c) return null;
    return c.getContext('2d');
  }

  function drawStroke(stroke: Stroke) {
    const ctx = getCtx();
    if (!ctx || stroke.points.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    ctx.stroke();
  }

  function clearCanvas() {
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }

  useEffect(() => {
    const socket = getSocket();
    socket.emit('whiteboard:join', { room });

    function onStroke({ stroke }: { stroke: Stroke }) {
      drawStroke(stroke);
    }
    function onClear() {
      clearCanvas();
    }
    socket.on('whiteboard:stroke', onStroke);
    socket.on('whiteboard:clear', onClear);

    return () => {
      socket.off('whiteboard:stroke', onStroke);
      socket.off('whiteboard:clear', onClear);
    };
  }, [room]);

  function getPos(e: React.MouseEvent | React.TouchEvent): [number, number] {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    return [
      ((point.clientX - rect.left) / rect.width) * c.width,
      ((point.clientY - rect.top) / rect.height) * c.height,
    ];
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    if (readOnly) return;
    drawingRef.current = true;
    currentStrokeRef.current = { points: [getPos(e)], color, width };
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    currentStrokeRef.current.points.push(getPos(e));
    drawStroke(currentStrokeRef.current);
  }

  function end() {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    drawingRef.current = false;
    const socket = getSocket();
    socket.emit('whiteboard:stroke', { room, stroke: currentStrokeRef.current });
    currentStrokeRef.current = null;
  }

  function clearAll() {
    clearCanvas();
    const socket = getSocket();
    socket.emit('whiteboard:clear', { room });
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 border-b border-slate-100 text-xs">
          <Pen className="w-3.5 h-3.5 text-slate-500" />
          {['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#f59e0b'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full border border-slate-200"
              style={{ backgroundColor: c, outline: color === c ? '2px solid #2563eb' : 'none' }}
              aria-label={`color ${c}`}
            />
          ))}
          <input
            type="range"
            min={1}
            max={10}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-20"
          />
          <button onClick={clearAll} className="ml-auto px-2 py-1 rounded-md hover:bg-slate-100 text-rose-600 inline-flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        className="flex-1 w-full h-full bg-white touch-none"
        style={{ cursor: readOnly ? 'default' : 'crosshair' }}
      />
      {readOnly && (
        <div className="p-2 text-[11px] text-slate-400 text-center border-t border-slate-100">
          The doctor is drawing — view only
        </div>
      )}
    </div>
  );
}
