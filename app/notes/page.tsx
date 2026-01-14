'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Point {
	x: number;
	y: number;
}

interface Stroke {
	points: Point[];
	color: string;
	lineWidth: number;
	opacity?: number;
}

interface HistoryItem {
	strokes: Stroke[];
	label: string;
	thumbnail: string;
}

interface SavedAnnotation {
	key: string;
	fileName: string;
	annotations: Record<number, Stroke[]>;
	pageHistory: Record<number, HistoryItem[]>;
	pageHistoryIndex: Record<number, number>;
}

function AnnotationPreview({
	strokes,
	width = 200,
	height = 150
}: {
	strokes: Stroke[];
	width?: number;
	height?: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || strokes.length === 0) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Find bounding box of all strokes
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		strokes.forEach((stroke) => {
			stroke.points.forEach((point) => {
				minX = Math.min(minX, point.x);
				minY = Math.min(minY, point.y);
				maxX = Math.max(maxX, point.x);
				maxY = Math.max(maxY, point.y);
			});
		});

		// Add padding
		const padding = 20;
		minX -= padding;
		minY -= padding;
		maxX += padding;
		maxY += padding;

		const contentWidth = maxX - minX;
		const contentHeight = maxY - minY;

		// Calculate scale to fit
		const scaleX = width / contentWidth;
		const scaleY = height / contentHeight;
		const scale = Math.min(scaleX, scaleY, 2);

		// Clear and fill white background
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, width, height);

		// Center the content
		const scaledWidth = contentWidth * scale;
		const scaledHeight = contentHeight * scale;
		const offsetX = (width - scaledWidth) / 2;
		const offsetY = (height - scaledHeight) / 2;

		// Draw strokes
		strokes.forEach((stroke) => {
			if (stroke.points.length < 2) return;
			ctx.beginPath();
			ctx.globalAlpha = stroke.opacity ?? 1;
			ctx.strokeStyle = stroke.color;
			ctx.lineWidth = Math.max(1, stroke.lineWidth * scale);
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.moveTo(
				(stroke.points[0].x - minX) * scale + offsetX,
				(stroke.points[0].y - minY) * scale + offsetY
			);
			for (let i = 1; i < stroke.points.length; i++) {
				ctx.lineTo(
					(stroke.points[i].x - minX) * scale + offsetX,
					(stroke.points[i].y - minY) * scale + offsetY
				);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;
		});
	}, [strokes, width, height]);

	if (strokes.length === 0) {
		return (
			<div
				className='flex items-center justify-center bg-zinc-100 rounded text-zinc-400 text-sm'
				style={{ width, height }}
			>
				No strokes
			</div>
		);
	}

	return (
		<canvas
			ref={canvasRef}
			width={width}
			height={height}
			className='rounded shadow-sm border border-zinc-200'
		/>
	);
}

function loadSavedAnnotations(): SavedAnnotation[] {
	if (typeof window === 'undefined') return [];

	const annotations: SavedAnnotation[] = [];

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith('pdf-annotations-')) {
			try {
				const data = localStorage.getItem(key);
				if (data) {
					const parsed = JSON.parse(data);
					// Extract filename from key: pdf-annotations-{filename}-{size}
					const match = key.match(/^pdf-annotations-(.+)-\d+$/);
					const fileName = match ? match[1] : key;

					annotations.push({
						key,
						fileName,
						annotations: parsed.annotations || {},
						pageHistory: parsed.pageHistory || {},
						pageHistoryIndex: parsed.pageHistoryIndex || {}
					});
				}
			} catch (e) {
				console.error('Failed to parse annotation:', key, e);
			}
		}
	}

	return annotations;
}

export default function NotesPage() {
	const [savedAnnotations, setSavedAnnotations] = useState<SavedAnnotation[]>([]);

	// Load on mount using a microtask to satisfy the linter
	useEffect(() => {
		queueMicrotask(() => {
			setSavedAnnotations(loadSavedAnnotations());
		});
	}, []);

	const deleteAnnotation = (key: string) => {
		if (confirm('Delete this annotation?')) {
			localStorage.removeItem(key);
			setSavedAnnotations((prev) => prev.filter((a) => a.key !== key));
		}
	};

	const getTotalStrokes = (annotations: Record<number, Stroke[]>) => {
		return Object.values(annotations).reduce((sum, strokes) => sum + strokes.length, 0);
	};

	const getAllStrokes = (annotations: Record<number, Stroke[]>) => {
		return Object.values(annotations).flat();
	};

	return (
		<div className='flex flex-col min-h-screen bg-zinc-100 dark:bg-zinc-950'>
			{/* Header */}
			<div className='sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm'>
				<div className='flex items-center gap-3'>
					<Link
						href='/'
						className='p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors'
						title='Back'
					>
						<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M15 19l-7-7 7-7'
							/>
						</svg>
					</Link>
					<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />
					<h1 className='text-sm font-medium text-zinc-700 dark:text-zinc-200'>
						Saved Annotations
					</h1>
				</div>
			</div>

			{/* Content */}
			<div className='flex-1 overflow-auto p-6'>
				{savedAnnotations.length === 0 ? (
					<div className='flex flex-col items-center justify-center h-full min-h-[400px] text-zinc-500 dark:text-zinc-400'>
						<svg
							className='w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-600'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={1.5}
								d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
							/>
						</svg>
						<p className='text-lg font-medium text-zinc-700 dark:text-zinc-300'>
							No saved annotations found
						</p>
						<p className='text-sm mt-2'>
							Draw on a PDF and your annotations will be saved automatically
						</p>
					</div>
				) : (
					<div className='max-w-6xl mx-auto'>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
							{savedAnnotations.map((annotation) => (
								<div
									key={annotation.key}
									className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-lg transition-shadow'
								>
									<div className='mb-3'>
										<h3
											className='font-medium text-zinc-900 dark:text-zinc-100 truncate'
											title={annotation.fileName}
										>
											{annotation.fileName}
										</h3>
										<p className='text-sm text-zinc-500 dark:text-zinc-400'>
											{Object.keys(annotation.annotations).length} page(s) •{' '}
											{getTotalStrokes(annotation.annotations)} stroke(s)
										</p>
									</div>

									<AnnotationPreview strokes={getAllStrokes(annotation.annotations)} />

									<div className='mt-3 flex items-center justify-between'>
										<div className='text-xs text-zinc-400 dark:text-zinc-500'>
											{annotation.key.split('-').pop()} bytes
										</div>
										<button
											onClick={() => deleteAnnotation(annotation.key)}
											className='text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors'
										>
											Delete
										</button>
									</div>

									{/* Per-page previews */}
									{Object.keys(annotation.annotations).length > 1 && (
										<div className='mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800'>
											<p className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
												By page:
											</p>
											<div className='flex flex-wrap gap-2'>
												{Object.entries(annotation.annotations).map(
													([pageNum, strokes]) => (
														<div key={pageNum} className='text-center'>
															<AnnotationPreview
																strokes={strokes}
																width={80}
																height={60}
															/>
															<p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
																Page {pageNum}
															</p>
														</div>
													)
												)}
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
