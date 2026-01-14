'use client';

import { useEffect, useRef, RefObject } from 'react';
import { Stroke, Point } from '../types';

interface UseCanvasRendererOptions {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	strokes: Stroke[];
	currentStroke: Point[];
	scale: number;
	selectedColor: string | null;
	selectedLineSize: number;
	selectedOpacity: number;
}

// Helper to draw a stroke on a context
function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) {
	if (stroke.points.length === 0) return;
	ctx.globalAlpha = stroke.opacity ?? 1;

	if (stroke.points.length === 1) {
		ctx.beginPath();
		ctx.fillStyle = stroke.color;
		ctx.arc(
			stroke.points[0].x * scale,
			stroke.points[0].y * scale,
			(stroke.lineWidth * scale) / 2,
			0,
			Math.PI * 2
		);
		ctx.fill();
	} else {
		ctx.beginPath();
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.lineWidth * scale;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
		for (let i = 1; i < stroke.points.length; i++) {
			ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
		}
		ctx.stroke();
	}
	ctx.globalAlpha = 1;
}

export function useCanvasRenderer({
	canvasRef,
	strokes,
	currentStroke,
	scale,
	selectedColor,
	selectedLineSize,
	selectedOpacity
}: UseCanvasRendererOptions) {
	// Cache for rendered strokes
	const cacheCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cachedStrokesCountRef = useRef<number>(0);
	const cachedScaleRef = useRef<number>(scale);

	// Update cache when strokes change (but not during active drawing)
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// Create cache canvas if needed
		if (!cacheCanvasRef.current) {
			cacheCanvasRef.current = document.createElement('canvas');
		}

		const cacheCanvas = cacheCanvasRef.current;

		// Resize cache if needed
		if (cacheCanvas.width !== canvas.width || cacheCanvas.height !== canvas.height) {
			cacheCanvas.width = canvas.width;
			cacheCanvas.height = canvas.height;
			cachedStrokesCountRef.current = 0; // Force full redraw
		}

		// Check if scale changed
		if (cachedScaleRef.current !== scale) {
			cachedScaleRef.current = scale;
			cachedStrokesCountRef.current = 0; // Force full redraw
		}

		const cacheCtx = cacheCanvas.getContext('2d');
		if (!cacheCtx) return;

		// Only redraw if strokes changed
		if (cachedStrokesCountRef.current !== strokes.length) {
			// If strokes were removed (undo), clear and redraw all
			if (strokes.length < cachedStrokesCountRef.current) {
				cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
				strokes.forEach((stroke) => drawStroke(cacheCtx, stroke, scale));
			} else {
				// Only draw new strokes (incremental)
				for (let i = cachedStrokesCountRef.current; i < strokes.length; i++) {
					drawStroke(cacheCtx, strokes[i], scale);
				}
			}
			cachedStrokesCountRef.current = strokes.length;
		}
	}, [canvasRef, strokes, scale]);

	// Render: copy cache + draw current stroke
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear main canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Copy from cache
		if (cacheCanvasRef.current) {
			ctx.drawImage(cacheCanvasRef.current, 0, 0);
		}

		// Draw current stroke being drawn
		if (currentStroke.length >= 1 && selectedColor) {
			ctx.globalAlpha = selectedOpacity;

			if (currentStroke.length === 1) {
				ctx.beginPath();
				ctx.fillStyle = selectedColor;
				ctx.arc(
					currentStroke[0].x * scale,
					currentStroke[0].y * scale,
					(selectedLineSize * scale) / 2,
					0,
					Math.PI * 2
				);
				ctx.fill();
			} else {
				ctx.beginPath();
				ctx.strokeStyle = selectedColor;
				ctx.lineWidth = selectedLineSize * scale;
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				ctx.moveTo(currentStroke[0].x * scale, currentStroke[0].y * scale);
				for (let i = 1; i < currentStroke.length; i++) {
					ctx.lineTo(currentStroke[i].x * scale, currentStroke[i].y * scale);
				}
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
		}
	}, [canvasRef, currentStroke, scale, selectedColor, selectedLineSize, selectedOpacity]);
}
