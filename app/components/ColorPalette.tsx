'use client';

const PRIMARY_COLORS = [
	{ name: 'black', value: '#000000' },
	{ name: 'white', value: '#ffffff' },
	{ name: 'red', value: '#ef4444' },
	{ name: 'green', value: '#22c55e' },
	{ name: 'dark blue', value: '#1e40af' }
];

const EXTRA_COLORS = [
	{ name: 'orange', value: '#f97316' },
	{ name: 'purple', value: '#a855f7' },
	{ name: 'yellow', value: '#eab308' },
	{ name: 'pink', value: '#ec4899' },
	{ name: 'cyan', value: '#06b6d4' },
	{ name: 'blue', value: '#3b82f6' }
];

interface ColorPaletteProps {
	selectedColor: string | null;
	onColorSelect: (color: string | null) => void;
	isExpanded: boolean;
	onExpandToggle: () => void;
}

export default function ColorPalette({
	selectedColor,
	onColorSelect,
	isExpanded,
	onExpandToggle
}: ColorPaletteProps) {
	// If collapsed but an extra color is selected, include it in the displayed colors
	const selectedExtraColor = EXTRA_COLORS.find((c) => c.value === selectedColor);
	const displayedColors = isExpanded
		? [...PRIMARY_COLORS, ...EXTRA_COLORS]
		: selectedExtraColor
		? [...PRIMARY_COLORS, selectedExtraColor]
		: PRIMARY_COLORS;

	return (
		<div className='flex items-center gap-1.5 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg'>
			{/* Pointer/deselect button */}
			<button
				onClick={() => onColorSelect(null)}
				className={`w-6 h-6 rounded-full transition-all flex items-center justify-center bg-zinc-200 dark:bg-zinc-600 border-2 ${
					selectedColor === null
						? 'scale-110 border-blue-500'
						: 'hover:scale-110 border-transparent'
				}`}
				title='Select (disable drawing)'
			>
				<svg
					className='w-4 h-4 text-zinc-600 dark:text-zinc-300'
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth={2}
						d='M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122'
					/>
				</svg>
			</button>

			<div className='w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-0.5' />

			{/* Color buttons */}
			{displayedColors.map((color) => (
				<button
					key={color.name}
					onClick={() => onColorSelect(color.value)}
					className={`w-6 h-6 rounded-full transition-all border-2 ${
						selectedColor === color.value
							? 'scale-110 border-blue-500'
							: 'hover:scale-110 border-transparent'
					}`}
					style={{ backgroundColor: color.value }}
					title={color.name}
				/>
			))}

			<div className='w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-0.5' />

			{/* Expand/collapse chevron */}
			<button
				onClick={onExpandToggle}
				className='w-6 h-6 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors'
				title={isExpanded ? 'Show less colors' : 'Show more colors'}
			>
				<svg
					className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
				>
					<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
				</svg>
			</button>
		</div>
	);
}
