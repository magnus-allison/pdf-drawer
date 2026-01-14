'use client';

import ColorPalette from '../../ColorPalette';
import { LINE_SIZES } from '../types';

interface ToolbarProps {
	fileName: string;
	onBack: () => void;
	// Undo/Redo
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	showHistory: boolean;
	onToggleHistory: () => void;
	// Color
	selectedColor: string | null;
	onColorSelect: (color: string | null) => void;
	isPaletteExpanded: boolean;
	onPaletteToggle: () => void;
	// Line size
	selectedLineSize: number;
	onLineSizeSelect: (size: number) => void;
	// Highlighter
	isHighlighter: boolean;
	onToggleHighlighter: () => void;
	// Zoom
	scale: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	isEditingZoom: boolean;
	zoomInputValue: string;
	onZoomInputChange: (value: string) => void;
	onZoomInputBlur: () => void;
	onZoomInputKeyDown: (key: string) => void;
	onZoomClick: () => void;
	// Pages
	pageNumber: number;
	numPages: number | null;
	onPrevPage: () => void;
	onNextPage: () => void;
	showPages: boolean;
	onTogglePages: () => void;
	// Download
	onDownload: () => void;
}

export function Toolbar({
	fileName,
	onBack,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	showHistory,
	onToggleHistory,
	selectedColor,
	onColorSelect,
	isPaletteExpanded,
	onPaletteToggle,
	selectedLineSize,
	onLineSizeSelect,
	isHighlighter,
	onToggleHighlighter,
	scale,
	onZoomIn,
	onZoomOut,
	isEditingZoom,
	zoomInputValue,
	onZoomInputChange,
	onZoomInputBlur,
	onZoomInputKeyDown,
	onZoomClick,
	pageNumber,
	numPages,
	onPrevPage,
	onNextPage,
	showPages,
	onTogglePages,
	onDownload
}: ToolbarProps) {
	return (
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
					{fileName}
				</span>

				<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

				{/* Undo/Redo buttons */}
				<div className='flex items-center gap-1'>
					<button
						onClick={onUndo}
						disabled={!canUndo}
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
						onClick={onRedo}
						disabled={!canRedo}
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
						onClick={onToggleHistory}
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
					onColorSelect={onColorSelect}
					isExpanded={isPaletteExpanded}
					onExpandToggle={onPaletteToggle}
				/>

				<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

				{/* Line size selector */}
				<div className='flex items-center gap-1.5 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
					{LINE_SIZES.map((size) => (
						<button
							key={size.name}
							onClick={() => {
								onLineSizeSelect(size.value);
								if (isHighlighter) onToggleHighlighter();
							}}
							className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
								selectedLineSize === size.value && !isHighlighter
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
					{/* Highlighter */}
					<button
						onClick={onToggleHighlighter}
						className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
							isHighlighter ? '' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
						}`}
						style={
							isHighlighter && selectedColor
								? { backgroundColor: selectedColor, opacity: 0.5 }
								: undefined
						}
						title='Highlighter'
					>
						<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
							/>
						</svg>
					</button>
				</div>

				<div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

				{/* Zoom controls */}
				<div className='flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
					<button
						onClick={onZoomOut}
						disabled={scale <= 0.5}
						className='p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
					>
						<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 12H4' />
						</svg>
					</button>
					{isEditingZoom ? (
						<input
							type='number'
							value={zoomInputValue}
							onChange={(e) => onZoomInputChange(e.target.value)}
							onBlur={onZoomInputBlur}
							onKeyDown={(e) => onZoomInputKeyDown(e.key)}
							autoFocus
							className='w-14 px-1 py-0.5 text-sm font-medium text-center text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded outline-none'
						/>
					) : (
						<button
							onClick={onZoomClick}
							className='text-sm font-medium text-zinc-700 dark:text-zinc-200 text-center hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded px-1 py-0.5 transition-colors'
							title='Click to set custom zoom'
						>
							{Math.round(scale * 100)}%
						</button>
					)}
					<button
						onClick={onZoomIn}
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
						onClick={onPrevPage}
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
						onClick={onTogglePages}
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
						onClick={onNextPage}
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
					onClick={onDownload}
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
	);
}
