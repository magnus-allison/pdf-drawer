'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

interface PagesSidebarProps {
	file: File;
	numPages: number | null;
	currentPage: number;
	onPageSelect: (page: number) => void;
}

export function PagesSidebar({ file, numPages, currentPage, onPageSelect }: PagesSidebarProps) {
	const sidebarRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (sidebarRef.current) {
			const currentPageButton = sidebarRef.current.querySelector(`[data-page="${currentPage}"]`);
			if (currentPageButton) {
				currentPageButton.scrollIntoView({ block: 'start' });
			}
		}
	}, [currentPage]);

	return (
		<div className='pages-sidebar absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl z-20'>
			<div className='p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0'>
				<h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
					All Pages ({numPages || 0})
				</h3>
			</div>
			<div ref={sidebarRef} className='p-2 overflow-y-auto flex-1 min-h-0'>
				{Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((page) => (
					<button
						key={page}
						data-page={page}
						onClick={() => onPageSelect(page)}
						className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors mb-2 border-2 ${
							page === currentPage
								? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
								: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent'
						}`}
					>
						<div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>Page {page}</div>
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
	);
}
