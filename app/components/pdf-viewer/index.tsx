'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAnnotations, useDrawing, useCanvasRenderer, useKeyboardShortcuts } from './hooks';
import { Toolbar, PagesSidebar, HistorySidebar, DrawingCanvas } from './components';
import { downloadPdfWithAnnotations } from './utils/downloadPdf';
import { LINE_SIZES, HIGHLIGHTER_SIZE, HIGHLIGHTER_OPACITY } from './types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

// Initialize PDF.js worker on client side only
if (typeof window !== 'undefined') {
	import('react-pdf').then((pdfjs) => {
		pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
	});
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
	const [selectedLineSize, setSelectedLineSize] = useState<number>(LINE_SIZES[1].value);
	const [isHighlighter, setIsHighlighter] = useState(false);
	const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
	const [showHistory, setShowHistory] = useState(false);
	const [showPages, setShowPages] = useState(false);
	const [isEditingZoom, setIsEditingZoom] = useState(false);
	const [zoomInputValue, setZoomInputValue] = useState('');
	const [isPaletteExpanded, setIsPaletteExpanded] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const originalPageSizeRef = useRef<{ width: number; height: number } | null>(null);

	// Annotations hook
	const {
		annotations,
		addStroke,
		undo,
		redo,
		canUndo,
		canRedo,
		getHistoryIndex,
		getPageHistory,
		goToHistoryIndex,
		showRestoreBanner,
		restoreSavedAnnotations,
		dismissRestoreBanner
	} = useAnnotations(file);

	// Computed values for highlighter mode
	const activeLineSize = isHighlighter ? HIGHLIGHTER_SIZE : selectedLineSize;
	const activeOpacity = isHighlighter ? HIGHLIGHTER_OPACITY : 1;

	// Drawing hook
	const { currentStroke, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDrawing({
		canvasRef,
		scale,
		selectedColor,
		selectedLineSize: activeLineSize,
		selectedOpacity: activeOpacity,
		onStrokeComplete: (stroke, thumbnail) => addStroke(pageNumber, stroke, thumbnail)
	});

	// Canvas renderer
	useCanvasRenderer({
		canvasRef,
		strokes: annotations[pageNumber] || [],
		currentStroke,
		scale,
		selectedColor,
		selectedLineSize: activeLineSize,
		selectedOpacity: activeOpacity
	});

	// Keyboard shortcuts
	const handleUndo = useCallback(() => undo(pageNumber), [undo, pageNumber]);
	const handleRedo = useCallback(() => redo(pageNumber), [redo, pageNumber]);
	const handlePrevPage = useCallback(() => setPageNumber((prev) => Math.max(prev - 1, 1)), []);
	const handleNextPage = useCallback(
		() => setPageNumber((prev) => Math.min(prev + 1, numPages || 1)),
		[numPages]
	);

	useKeyboardShortcuts({
		onUndo: handleUndo,
		onRedo: handleRedo,
		onPrevPage: handlePrevPage,
		onNextPage: handleNextPage
	});

	const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
		setNumPages(numPages);
	}, []);

	const onPageLoadSuccess = useCallback(
		({ width, height }: { width: number; height: number }) => {
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

		setLinkTargets();
		const timeoutId = setTimeout(setLinkTargets, 500);
		const observer = new MutationObserver(() => setLinkTargets());
		observer.observe(container, { childList: true, subtree: true });

		return () => {
			clearTimeout(timeoutId);
			observer.disconnect();
		};
	}, [pageNumber, pageSize]);

	// Zoom handlers
	const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
	const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

	const handleZoomInputChange = (value: string) => {
		setZoomInputValue(value);
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue) && numValue >= 10 && numValue <= 500) {
			setScale(numValue / 100);
		}
	};

	const handleDownload = () => downloadPdfWithAnnotations(file, annotations);

	return (
		<div className='flex flex-col min-h-screen bg-zinc-100 dark:bg-zinc-950'>
			<Toolbar
				fileName={file.name}
				onBack={onBack}
				canUndo={canUndo(pageNumber)}
				canRedo={canRedo(pageNumber)}
				onUndo={handleUndo}
				onRedo={handleRedo}
				showHistory={showHistory}
				onToggleHistory={() => setShowHistory(!showHistory)}
				selectedColor={selectedColor}
				onColorSelect={setSelectedColor}
				isPaletteExpanded={isPaletteExpanded}
				onPaletteToggle={() => setIsPaletteExpanded(!isPaletteExpanded)}
				selectedLineSize={selectedLineSize}
				onLineSizeSelect={setSelectedLineSize}
				isHighlighter={isHighlighter}
				onToggleHighlighter={() => setIsHighlighter(!isHighlighter)}
				scale={scale}
				onZoomIn={zoomIn}
				onZoomOut={zoomOut}
				isEditingZoom={isEditingZoom}
				zoomInputValue={zoomInputValue}
				onZoomInputChange={handleZoomInputChange}
				onZoomInputBlur={() => setIsEditingZoom(false)}
				onZoomInputKeyDown={(key) => {
					if (key === 'Enter' || key === 'Escape') setIsEditingZoom(false);
				}}
				onZoomClick={() => {
					setZoomInputValue(Math.round(scale * 100).toString());
					setIsEditingZoom(true);
				}}
				pageNumber={pageNumber}
				numPages={numPages}
				onPrevPage={handlePrevPage}
				onNextPage={handleNextPage}
				showPages={showPages}
				onTogglePages={() => setShowPages(!showPages)}
				onDownload={handleDownload}
			/>

			{/* Restore Annotations Banner */}
			{showRestoreBanner && (
				<div className='bg-blue-600 text-white px-4 py-2 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
							/>
						</svg>
						<span className='text-sm font-medium'>
							Saved annotations found for this file. Would you like to restore them?
						</span>
					</div>
					<div className='flex items-center gap-2'>
						<button
							onClick={restoreSavedAnnotations}
							className='p-1.5 rounded hover:bg-blue-500 transition-colors'
							title='Restore annotations'
						>
							<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M5 13l4 4L19 7'
								/>
							</svg>
						</button>
						<button
							onClick={dismissRestoreBanner}
							className='p-1.5 rounded hover:bg-blue-500 transition-colors'
							title='Dismiss'
						>
							<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M6 18L18 6M6 6l12 12'
								/>
							</svg>
						</button>
					</div>
				</div>
			)}

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

							{pageSize.width > 0 && pageSize.height > 0 && (
								<DrawingCanvas
									ref={canvasRef}
									width={pageSize.width * scale}
									height={pageSize.height * scale}
									selectedColor={selectedColor}
									selectedLineSize={activeLineSize}
									selectedOpacity={activeOpacity}
									scale={scale}
									onMouseDown={handleMouseDown}
									onMouseMove={handleMouseMove}
									onMouseUp={handleMouseUp}
									onMouseLeave={handleMouseLeave}
								/>
							)}
						</div>
					</div>
				</div>

				{showPages && (
					<PagesSidebar
						file={file}
						numPages={numPages}
						currentPage={pageNumber}
						onPageSelect={setPageNumber}
					/>
				)}

				{showHistory && (
					<HistorySidebar
						pageNumber={pageNumber}
						history={getPageHistory(pageNumber)}
						currentIndex={getHistoryIndex(pageNumber)}
						onSelectIndex={(index) => goToHistoryIndex(pageNumber, index)}
					/>
				)}
			</div>
		</div>
	);
}
