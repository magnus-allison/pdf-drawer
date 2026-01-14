'use client';

import { forwardRef } from 'react';

interface DrawingCanvasProps {
	width: number;
	height: number;
	selectedColor: string | null;
	selectedLineSize: number;
	selectedOpacity: number;
	scale: number;
	onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onMouseUp: () => void;
	onMouseLeave: () => void;
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(
	(
		{
			width,
			height,
			selectedColor,
			selectedLineSize,
			selectedOpacity,
			scale,
			onMouseDown,
			onMouseMove,
			onMouseUp,
			onMouseLeave
		},
		ref
	) => {
		const cursorSize = Math.max(8, selectedLineSize * scale);

		return (
			<canvas
				ref={ref}
				width={width}
				height={height}
				className={`absolute top-0 left-0 z-10 ${
					selectedColor ? 'pointer-events-auto' : 'pointer-events-none'
				}`}
				style={{
					width,
					height,
					cursor: selectedColor
						? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${cursorSize}' height='${cursorSize}' viewBox='0 0 ${cursorSize} ${cursorSize}'><circle cx='${
								cursorSize / 2
						  }' cy='${cursorSize / 2}' r='${Math.max(
								3,
								cursorSize / 2 - 1
						  )}' fill='${encodeURIComponent(
								selectedColor
						  )}' fill-opacity='${selectedOpacity}' stroke='${
								selectedColor === '#ffffff' ? '%23999' : 'white'
						  }' stroke-width='1'/></svg>") ${cursorSize / 2} ${cursorSize / 2}, crosshair`
						: undefined
				}}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				onMouseLeave={onMouseLeave}
			/>
		);
	}
);

DrawingCanvas.displayName = 'DrawingCanvas';
