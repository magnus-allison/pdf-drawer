'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PDFDocument, rgb } from 'pdf-lib';
import ColorPalette from './ColorPalette';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });

const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), {
	ssr: false
});

// Initialize PDF.js worker on client side only
if (typeof window !== 'undefined') {
	import('react-pdf').then((pdfjs) => {
		pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
	});
}

const LINE_SIZES = [
	{ name: 'thin', value: 2 },
	{ name: 'medium', value: 4 },
	{ name: 'thick', value: 8 },
	{ name: 'extra thick', value: 12 }
];

interface Point {
	x: number;
	y: number;
}

interface Stroke {
	points: Point[];
	color: string;
	lineWidth: number;
}

interface HistoryItem {
	strokes: Stroke[];
	label: string;
	thumbnail: string;
}

interface PdfViewerProps {
	file: File;
	onBack: () => void;
}

export default function PdfViewer({ file, onBack }: PdfViewerProps) {
	const [numPages, setNumPages] = useState<number | null>(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1.0);
	const [selectedColor, setSelectedColor] = useState<string | null>(null);
	const [selectedLineSize, setSelectedLineSize] = useState(LINE_SIZES[1].value);
	const [isDrawing, setIsDrawing] = useState(false);
	const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>({});
	const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
	const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
	const [showHistory, setShowHistory] = useState(false);
	const [showPages, setShowPages] = useState(false);
	const [isEditingZoom, setIsEditingZoom] = useState(false);
	const [zoomInputValue, setZoomInputValue] = useState('');
	const [isPaletteExpanded, setIsPaletteExpanded] = useState(false);

	// History for undo/redo - per page
	const [pageHistory, setPageHistory] = useState<Record<number, HistoryItem[]>>({});
	const [pageHistoryIndex, setPageHistoryIndex] = useState<Record<number, number>>({});

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const pagesSidebarRef = useRef<HTMLDivElement>(null);
	const originalPageSizeRef = useRef<{ width: number; height: number } | null>(null);

	// Scroll pages sidebar to current page when opened
	useEffect(() => {
		if (showPages && pagesSidebarRef.current) {
			const currentPageButton = pagesSidebarRef.current.querySelector(`[data-page="${pageNumber}"]`);
			if (currentPageButton) {
				currentPageButton.scrollIntoView({ block: 'start' });
			}
		}
	}, [showPages, pageNumber]);

	const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
		setNumPages(numPages);
	}, []);

	const onPageLoadSuccess = useCallback(
		({ width, height }: { width: number; height: number }) => {
			// react-pdf returns scaled dimensions, so store original size only once
			if (!originalPageSizeRef.current) {
				originalPageSizeRef.current = { width: width / scale, height: height / scale };
			}
			setPageSize(originalPageSizeRef.current);
		},
		[scale]
	);

	// Make all PDF links open in new tab
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const setLinkTargets = () => {
			const links = container.querySelectorAll('.react-pdf__Page__annotations a');
			links.forEach((link) => {
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener noreferrer');
			});
		};

		// Run immediately and after a delay to catch dynamically rendered links
		setLinkTargets();
		const timeoutId = setTimeout(setLinkTargets, 500);

		// Also observe for new links being added
		const observer = new MutationObserver(() => {
			setLinkTargets();
		});
		observer.observe(container, { childList: true, subtree: true });

		return () => {
			clearTimeout(timeoutId);
			observer.disconnect();
		};
	}, [pageNumber, pageSize]);

	// Redraw canvas when annotations, page, or scale changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw existing strokes for current page
		const pageStrokes = annotations[pageNumber] || [];
		pageStrokes.forEach((stroke) => {
			if (stroke.points.length < 2) return;
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
		});

		// Draw current stroke
		if (currentStroke.length >= 2 && selectedColor) {
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
	}, [annotations, pageNumber, scale, currentStroke, selectedColor, selectedLineSize]);

	const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };

		const rect = canvas.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) / scale,
			y: (e.clientY - rect.top) / scale
		};
	};

	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!selectedColor) return;
		setIsDrawing(true);
		const point = getCanvasCoordinates(e);
		setCurrentStroke([point]);
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const point = getCanvasCoordinates(e);
		setCurrentStroke((prev) => [...prev, point]);
	};

	const handleMouseUp = () => {
		if (!isDrawing) return;
		setIsDrawing(false);

		if (currentStroke.length >= 2 && selectedColor) {
			const newStroke = { points: currentStroke, color: selectedColor, lineWidth: selectedLineSize };
			const currentPageStrokes = annotations[pageNumber] || [];
			const newPageStrokes = [...currentPageStrokes, newStroke];
			const newAnnotations = {
				...annotations,
				[pageNumber]: newPageStrokes
			};
			setAnnotations(newAnnotations);

			// Generate thumbnail for the new stroke only
			let thumbnail = '';
			if (newStroke.points.length >= 2) {
				// Find bounding box of the stroke
				const xs = newStroke.points.map((p) => p.x);
				const ys = newStroke.points.map((p) => p.y);
				const minX = Math.min(...xs);
				const maxX = Math.max(...xs);
				const minY = Math.min(...ys);
				const maxY = Math.max(...ys);
				const padding = newStroke.lineWidth;
				const strokeWidth = maxX - minX + padding * 2;
				const strokeHeight = maxY - minY + padding * 2;

				const thumbWidth = 80;
				const thumbHeight = 60;
				const thumbnailCanvas = document.createElement('canvas');
				thumbnailCanvas.width = thumbWidth;
				thumbnailCanvas.height = thumbHeight;
				const thumbCtx = thumbnailCanvas.getContext('2d');

				if (thumbCtx) {
					const scaleX = thumbWidth / strokeWidth;
					const scaleY = thumbHeight / strokeHeight;
					const thumbScale = Math.min(scaleX, scaleY, 2); // Cap at 2x to avoid huge strokes

					const scaledWidth = strokeWidth * thumbScale;
					const scaledHeight = strokeHeight * thumbScale;
					const offsetX = (thumbWidth - scaledWidth) / 2;
					const offsetY = (thumbHeight - scaledHeight) / 2;

					thumbCtx.clearRect(0, 0, thumbWidth, thumbHeight);

					thumbCtx.beginPath();
					thumbCtx.strokeStyle = newStroke.color;
					thumbCtx.lineWidth = Math.max(1, newStroke.lineWidth * thumbScale);
					thumbCtx.lineCap = 'round';
					thumbCtx.lineJoin = 'round';
					thumbCtx.moveTo(
						(newStroke.points[0].x - minX + padding) * thumbScale + offsetX,
						(newStroke.points[0].y - minY + padding) * thumbScale + offsetY
					);
					for (let i = 1; i < newStroke.points.length; i++) {
						thumbCtx.lineTo(
							(newStroke.points[i].x - minX + padding) * thumbScale + offsetX,
							(newStroke.points[i].y - minY + padding) * thumbScale + offsetY
						);
					}
					thumbCtx.stroke();
					thumbnail = thumbnailCanvas.toDataURL('image/png');
				}
			}

			// Add to page-specific history
			const currentPageHistory = pageHistory[pageNumber] || [
				{ strokes: [], label: 'Default Slide', thumbnail: '' }
			];
			const currentIndex = pageHistoryIndex[pageNumber] ?? 0;
			const newPageHistory = currentPageHistory.slice(0, currentIndex + 1);
			newPageHistory.push({
				strokes: newPageStrokes,
				label: `Stroke ${newPageHistory.length}`,
				thumbnail
			});
			setPageHistory((prev) => ({ ...prev, [pageNumber]: newPageHistory }));
			setPageHistoryIndex((prev) => ({ ...prev, [pageNumber]: newPageHistory.length - 1 }));
		}
		setCurrentStroke([]);
	};

	const handleMouseLeave = () => {
		if (isDrawing) {
			handleMouseUp();
		}
	};

	const undo = useCallback(() => {
		const currentIndex = pageHistoryIndex[pageNumber] ?? 0;
		const currentPageHistory = pageHistory[pageNumber] || [];
		if (currentIndex > 0) {
			const newIndex = currentIndex - 1;
			setPageHistoryIndex((prev) => ({ ...prev, [pageNumber]: newIndex }));
			setAnnotations((prev) => ({
				...prev,
				[pageNumber]: currentPageHistory[newIndex].strokes
			}));
		}
	}, [pageNumber, pageHistoryIndex, pageHistory]);

	const redo = useCallback(() => {
		const currentIndex = pageHistoryIndex[pageNumber] ?? 0;
		const currentPageHistory = pageHistory[pageNumber] || [];
		if (currentIndex < currentPageHistory.length - 1) {
			const newIndex = currentIndex + 1;
			setPageHistoryIndex((prev) => ({ ...prev, [pageNumber]: newIndex }));
			setAnnotations((prev) => ({
				...prev,
				[pageNumber]: currentPageHistory[newIndex].strokes
			}));
		}
	}, [pageNumber, pageHistoryIndex, pageHistory]);

	// Keyboard navigation for pages and undo/redo
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Undo: Cmd/Ctrl + Z
			if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				undo();
				return;
			}
			// Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
			if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
				e.preventDefault();
				redo();
				return;
			}
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				setPageNumber((prev) => Math.max(prev - 1, 1));
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [numPages, undo, redo]);

	const goToPrevPage = () => {
		setPageNumber((prev) => Math.max(prev - 1, 1));
	};

	const goToNextPage = () => {
		setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
	};

	const zoomIn = () => {
		setScale((prev) => Math.min(prev + 0.25, 3));
	};

	const zoomOut = () => {
		setScale((prev) => Math.max(prev - 0.25, 0.5));
	};

	const downloadPdfWithAnnotations = async () => {
		try {
			const fileArrayBuffer = await file.arrayBuffer();
			const pdfDoc = await PDFDocument.load(fileArrayBuffer);
			const pages = pdfDoc.getPages();

			// Draw annotations on each page
			Object.entries(annotations).forEach(([pageNum, strokes]) => {
				const pageIndex = parseInt(pageNum, 10) - 1;
				if (pageIndex < 0 || pageIndex >= pages.length) return;

				const page = pages[pageIndex];
				const { height } = page.getSize();

				strokes.forEach((stroke) => {
					if (stroke.points.length < 2) return;

					// Parse color from hex
					const hexColor = stroke.color.replace('#', '');
					const r = parseInt(hexColor.substring(0, 2), 16) / 255;
					const g = parseInt(hexColor.substring(2, 4), 16) / 255;
					const b = parseInt(hexColor.substring(4, 6), 16) / 255;

					// Draw line segments
					for (let i = 0; i < stroke.points.length - 1; i++) {
						const start = stroke.points[i];
						const end = stroke.points[i + 1];

						// PDF coordinates have origin at bottom-left, so flip Y
						page.drawLine({
							start: { x: start.x, y: height - start.y },
							end: { x: end.x, y: height - end.y },
							thickness: stroke.lineWidth,
							color: rgb(r, g, b),
							lineCap: 1 // Round cap
						});
					}
				});
			});

			const pdfBytes = await pdfDoc.save();
			const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);

			const link = document.createElement('a');
			link.href = url;
			link.download = file.name.replace('.pdf', '-annotated.pdf');
			link.click();

			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to download PDF:', error);
			alert('Failed to download PDF with annotations');
		}
	};

	return (
		<div className='flex flex-col min-h-screen bg-zinc-100 dark:bg-zinc-950'>
			{/* Toolbar */}
			<div className='sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm'>
				<div className='flex items-center gap-3'>
					<button
						onClick={onBack}
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
					</button>

					<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

					<span className='text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate max-w-xs'>
						{file.name}
					</span>

					<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

					{/* Undo/Redo buttons */}
					<div className='flex items-center gap-1'>
						<button
							onClick={undo}
							disabled={(pageHistoryIndex[pageNumber] ?? 0) <= 0}
							className='p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
							title='Undo (⌘Z)'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
								/>
							</svg>
						</button>
						<button
							onClick={redo}
							disabled={
								(pageHistoryIndex[pageNumber] ?? 0) >=
								(pageHistory[pageNumber]?.length ?? 1) - 1
							}
							className='p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
							title='Redo (⌘⇧Z)'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6'
								/>
							</svg>
						</button>
						<button
							onClick={() => setShowHistory(!showHistory)}
							className={`p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ${
								showHistory ? 'bg-zinc-200 dark:bg-zinc-700' : ''
							}`}
							title='History'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
								/>
							</svg>
						</button>
					</div>
				</div>

				<div className='flex items-center gap-4'>
					{/* Color palette */}
					<ColorPalette
						key={selectedColor ?? 'null'}
						selectedColor={selectedColor}
						onColorSelect={setSelectedColor}
						isExpanded={isPaletteExpanded}
						onExpandToggle={() => setIsPaletteExpanded(!isPaletteExpanded)}
					/>

					<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

					{/* Line size selector */}
					<div className='flex items-center gap-1.5 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
						{LINE_SIZES.map((size) => (
							<button
								key={size.name}
								onClick={() => setSelectedLineSize(size.value)}
								className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
									selectedLineSize === size.value
										? 'bg-zinc-300 dark:bg-zinc-600'
										: 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
								}`}
								title={size.name}
							>
								<div
									className='rounded-full bg-zinc-700 dark:bg-zinc-200'
									style={{ width: size.value + 2, height: size.value + 2 }}
								/>
							</button>
						))}
					</div>

					<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

					{/* Zoom controls */}
					<div className='flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
						<button
							onClick={zoomOut}
							disabled={scale <= 0.5}
							className='p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M20 12H4'
								/>
							</svg>
						</button>
						{isEditingZoom ? (
							<input
								type='number'
								value={zoomInputValue}
								onChange={(e) => {
									setZoomInputValue(e.target.value);
									const value = parseInt(e.target.value, 10);
									if (!isNaN(value) && value >= 10 && value <= 500) {
										setScale(value / 100);
									}
								}}
								onBlur={() => {
									setIsEditingZoom(false);
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === 'Escape') {
										setIsEditingZoom(false);
									}
								}}
								autoFocus
								className='w-14 px-1 py-0.5 text-sm font-medium text-center text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded outline-none'
							/>
						) : (
							<button
								onClick={() => {
									setZoomInputValue(Math.round(scale * 100).toString());
									setIsEditingZoom(true);
								}}
								className='text-sm font-medium text-zinc-700 dark:text-zinc-200 text-center hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded px-1 py-0.5 transition-colors'
								title='Click to set custom zoom'
							>
								{Math.round(scale * 100)}%
							</button>
						)}
						<button
							onClick={zoomIn}
							disabled={scale >= 3}
							className='p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M12 4v16m8-8H4'
								/>
							</svg>
						</button>
					</div>

					{/* Page navigation */}
					<div className='flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
						<button
							onClick={goToPrevPage}
							disabled={pageNumber <= 1}
							className='p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M15 19l-7-7 7-7'
								/>
							</svg>
						</button>
						<button
							onClick={() => setShowPages(!showPages)}
							className={`text-sm font-medium text-zinc-700 dark:text-zinc-200 text-center px-2 py-1 rounded transition-colors ${
								showPages
									? 'bg-zinc-200 dark:bg-zinc-700'
									: 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
							}`}
							title='Show all pages'
						>
							{pageNumber} / {numPages || '?'}
						</button>
						<button
							onClick={goToNextPage}
							disabled={pageNumber >= (numPages || 1)}
							className='p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M9 5l7 7-7 7'
								/>
							</svg>
						</button>
					</div>

					{/* Download button */}
					<button
						onClick={downloadPdfWithAnnotations}
						className='p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors'
						title='Download PDF with annotations'
					>
						<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
							/>
						</svg>
					</button>
				</div>
			</div>

			{/* Main content area with optional history sidebar */}
			<div className='relative flex flex-1 overflow-hidden'>
				{/* PDF Content */}
				<div className='flex-1 overflow-auto p-6'>
					<div className='flex justify-center'>
						<div
							ref={containerRef}
							className={`relative inline-block ${selectedColor ? 'drawing-mode' : ''}`}
						>
							<Document
								file={file}
								onLoadSuccess={onDocumentLoadSuccess}
								loading={null}
								error={
									<div className='flex flex-col items-center justify-center p-12 text-red-500'>
										<svg
											className='w-12 h-12 mb-4'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
											/>
										</svg>
										<p className='text-lg font-medium'>Failed to load PDF</p>
									</div>
								}
								className='flex justify-center'
							>
								<Page
									pageNumber={pageNumber}
									scale={scale}
									className='shadow-xl rounded-lg overflow-hidden'
									renderTextLayer={true}
									renderAnnotationLayer={true}
									onLoadSuccess={onPageLoadSuccess}
									loading={
										<div
											className='bg-black rounded-lg'
											style={{
												width: pageSize.width * scale || 612,
												height: pageSize.height * scale || 792
											}}
										/>
									}
								/>
							</Document>

							{/* Canvas overlay for annotations */}
							{pageSize.width > 0 && pageSize.height > 0 && (
								<canvas
									ref={canvasRef}
									width={pageSize.width * scale}
									height={pageSize.height * scale}
									className={`absolute top-0 left-0 z-10 ${
										selectedColor
											? 'cursor-crosshair pointer-events-auto'
											: 'pointer-events-none'
									}`}
									style={{
										width: pageSize.width * scale,
										height: pageSize.height * scale
									}}
									onMouseDown={handleMouseDown}
									onMouseMove={handleMouseMove}
									onMouseUp={handleMouseUp}
									onMouseLeave={handleMouseLeave}
								/>
							)}
						</div>
					</div>
				</div>

				{/* Pages Sidebar - Overlay */}
				{showPages && (
					<div className='pages-sidebar absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl z-20'>
						<div className='p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0'>
							<h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
								All Pages ({numPages || 0})
							</h3>
						</div>
						<div ref={pagesSidebarRef} className='p-2 overflow-y-auto flex-1 min-h-0'>
							{Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((page) => (
								<button
									key={page}
									data-page={page}
									onClick={() => {
										setPageNumber(page);
									}}
									className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors mb-2 border-2 ${
										page === pageNumber
											? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
											: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent'
									}`}
								>
									<div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
										Page {page}
									</div>
									<div className='rounded overflow-hidden [&_.react-pdf__Page]:bg-transparent! [&_canvas]:bg-transparent!'>
										<Document file={file} loading={null}>
											<Page
												pageNumber={page}
												width={248}
												renderTextLayer={false}
												renderAnnotationLayer={false}
												loading={
													<div className='w-full h-32 bg-zinc-200 dark:bg-zinc-700 animate-pulse' />
												}
											/>
										</Document>
									</div>
								</button>
							))}
						</div>
					</div>
				)}

				{/* History Sidebar - Overlay */}
				{showHistory && (
					<div className='absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl z-20'>
						<div className='p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0'>
							<h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
								Page {pageNumber} History
							</h3>
						</div>
						<div className='p-2 overflow-y-auto flex-1 min-h-0'>
							{(
								pageHistory[pageNumber] || [
									{ strokes: [], label: 'Default Slide', thumbnail: '' }
								]
							).map((item, index) => {
								const currentIndex = pageHistoryIndex[pageNumber] ?? 0;
								return (
									<button
										key={index}
										onClick={() => {
											setPageHistoryIndex((prev) => ({ ...prev, [pageNumber]: index }));
											setAnnotations((prev) => ({
												...prev,
												[pageNumber]: item.strokes
											}));
										}}
										className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
											index === currentIndex
												? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
												: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
										} ${index > currentIndex ? 'opacity-50' : ''}`}
									>
										{item.thumbnail ? (
											<img
												src={item.thumbnail}
												alt={item.label}
												className='w-full h-auto object-contain rounded'
											/>
										) : (
											<div className='flex items-center gap-2'>
												<div
													className={`w-2 h-2 rounded-full shrink-0 ${
														index === currentIndex
															? 'bg-blue-500'
															: 'bg-zinc-300 dark:bg-zinc-600'
													}`}
												/>
												<span className='truncate'>{item.label}</span>
											</div>
										)}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
