'use client';

import { useEffect, RefObject } from 'react';
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

export function useCanvasRenderer({
	canvasRef,
	strokes,
	currentStroke,
	scale,
	selectedColor,
	selectedLineSize,
	selectedOpacity
}: UseCanvasRendererOptions) {
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			console.log('Canvas renderer: no canvas ref');
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.log('Canvas renderer: no context');
			return;
		}

		console.log('Canvas renderer: drawing', strokes.length, 'strokes');

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw existing strokes
		strokes.forEach((stroke) => {
			if (stroke.points.length < 2) return;
			ctx.beginPath();
			ctx.globalAlpha = stroke.opacity ?? 1;
			ctx.strokeStyle = stroke.color;
			ctx.lineWidth = stroke.lineWidth * scale;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
			for (let i = 1; i < stroke.points.length; i++) {
				ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;
		});

		// Draw current stroke
		if (currentStroke.length >= 2 && selectedColor) {
			ctx.beginPath();
			ctx.globalAlpha = selectedOpacity;
			ctx.strokeStyle = selectedColor;
			ctx.lineWidth = selectedLineSize * scale;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.moveTo(currentStroke[0].x * scale, currentStroke[0].y * scale);
			for (let i = 1; i < currentStroke.length; i++) {
				ctx.lineTo(currentStroke[i].x * scale, currentStroke[i].y * scale);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}, [canvasRef, strokes, currentStroke, scale, selectedColor, selectedLineSize, selectedOpacity]);
}
