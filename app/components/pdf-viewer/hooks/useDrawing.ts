'use client';

import { useState, useCallback, useEffect, RefObject } from 'react';
import { Point, Stroke } from '../types';

function generateThumbnail(stroke: Stroke): string {
	if (stroke.points.length < 2) return '';

	const xs = stroke.points.map((p) => p.x);
	const ys = stroke.points.map((p) => p.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const padding = stroke.lineWidth;
	const strokeWidth = maxX - minX + padding * 2;
	const strokeHeight = maxY - minY + padding * 2;

	const thumbWidth = 80;
	const thumbHeight = 60;
	const thumbnailCanvas = document.createElement('canvas');
	thumbnailCanvas.width = thumbWidth;
	thumbnailCanvas.height = thumbHeight;
	const thumbCtx = thumbnailCanvas.getContext('2d');

	if (!thumbCtx) return '';

	const scaleX = thumbWidth / strokeWidth;
	const scaleY = thumbHeight / strokeHeight;
	const thumbScale = Math.min(scaleX, scaleY, 2);

	const scaledWidth = strokeWidth * thumbScale;
	const scaledHeight = strokeHeight * thumbScale;
	const offsetX = (thumbWidth - scaledWidth) / 2;
	const offsetY = (thumbHeight - scaledHeight) / 2;

	thumbCtx.clearRect(0, 0, thumbWidth, thumbHeight);
	thumbCtx.beginPath();
	thumbCtx.globalAlpha = stroke.opacity ?? 1;
	thumbCtx.strokeStyle = stroke.color;
	thumbCtx.lineWidth = Math.max(1, stroke.lineWidth * thumbScale);
	thumbCtx.lineCap = 'round';
	thumbCtx.lineJoin = 'round';
	thumbCtx.moveTo(
		(stroke.points[0].x - minX + padding) * thumbScale + offsetX,
		(stroke.points[0].y - minY + padding) * thumbScale + offsetY
	);
	for (let i = 1; i < stroke.points.length; i++) {
		thumbCtx.lineTo(
			(stroke.points[i].x - minX + padding) * thumbScale + offsetX,
			(stroke.points[i].y - minY + padding) * thumbScale + offsetY
		);
	}
	thumbCtx.stroke();
	thumbCtx.globalAlpha = 1;

	return thumbnailCanvas.toDataURL('image/png');
}

interface UseDrawingOptions {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	scale: number;
	selectedColor: string | null;
	selectedLineSize: number;
	selectedOpacity: number;
	onStrokeComplete: (stroke: Stroke, thumbnail: string) => void;
}

export function useDrawing({
	canvasRef,
	scale,
	selectedColor,
	selectedLineSize,
	selectedOpacity,
	onStrokeComplete
}: UseDrawingOptions) {
	const [isDrawing, setIsDrawing] = useState(false);
	const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
	const [isShiftHeld, setIsShiftHeld] = useState(false);
	const [startPoint, setStartPoint] = useState<Point | null>(null);

	// Track shift key for straight line tool
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Shift') setIsShiftHeld(true);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Shift') setIsShiftHeld(false);
		};
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	const getCanvasCoordinates = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return { x: 0, y: 0 };

			const rect = canvas.getBoundingClientRect();
			return {
				x: (e.clientX - rect.left) / scale,
				y: (e.clientY - rect.top) / scale
			};
		},
		[canvasRef, scale]
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!selectedColor) return;
			setIsDrawing(true);
			const point = getCanvasCoordinates(e);
			setStartPoint(point);
			setCurrentStroke([point]);
		},
		[selectedColor, getCanvasCoordinates]
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDrawing) return;
			const point = getCanvasCoordinates(e);
			if (isShiftHeld && startPoint) {
				setCurrentStroke([startPoint, point]);
			} else {
				setCurrentStroke((prev) => [...prev, point]);
			}
		},
		[isDrawing, getCanvasCoordinates, isShiftHeld, startPoint]
	);

	const handleMouseUp = useCallback(() => {
		if (!isDrawing) return;
		setIsDrawing(false);
		setStartPoint(null);

		if (currentStroke.length >= 2 && selectedColor) {
			const newStroke: Stroke = {
				points: currentStroke,
				color: selectedColor,
				lineWidth: selectedLineSize,
				opacity: selectedOpacity
			};
			const thumbnail = generateThumbnail(newStroke);
			onStrokeComplete(newStroke, thumbnail);
		}
		setCurrentStroke([]);
	}, [isDrawing, currentStroke, selectedColor, selectedLineSize, selectedOpacity, onStrokeComplete]);

	const handleMouseLeave = useCallback(() => {
		if (isDrawing) {
			handleMouseUp();
		}
	}, [isDrawing, handleMouseUp]);

	return {
		currentStroke,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave
	};
}
