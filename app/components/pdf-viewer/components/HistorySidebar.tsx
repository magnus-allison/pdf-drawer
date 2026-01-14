'use client';

import { HistoryItem } from '../types';

interface HistorySidebarProps {
	pageNumber: number;
	history: HistoryItem[];
	currentIndex: number;
	onSelectIndex: (index: number) => void;
}

export function HistorySidebar({ pageNumber, history, currentIndex, onSelectIndex }: HistorySidebarProps) {
	return (
		<div className='absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl z-20'>
			<div className='p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0'>
				<h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
					Page {pageNumber} History
				</h3>
			</div>
			<div className='p-2 overflow-y-auto flex-1 min-h-0'>
				{history.map((item, index) => (
					<button
						key={index}
						onClick={() => onSelectIndex(index)}
						className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
							index === currentIndex
								? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
								: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
						} ${index > currentIndex ? 'opacity-50' : ''}`}
					>
						{item.thumbnail ? (
							/* eslint-disable-next-line @next/next/no-img-element */
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
				))}
			</div>
		</div>
	);
}
