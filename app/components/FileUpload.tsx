'use client';

import { useCallback, useState } from 'react';

interface FileUploadProps {
	onFileSelect: (file: File) => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				const file = files[0];
				if (file.type === 'application/pdf') {
					onFileSelect(file);
				} else {
					alert('Please select a PDF file');
				}
			}
		},
		[onFileSelect]
	);

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				const file = files[0];
				if (file.type === 'application/pdf') {
					onFileSelect(file);
				} else {
					alert('Please select a PDF file');
				}
			}
		},
		[onFileSelect]
	);

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4'>
			<div
				className={`relative flex flex-col items-center justify-center w-full max-w-xl aspect-[4/3] rounded-2xl border-2 border-dashed transition-all duration-200 ${
					isDragging
						? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
						: 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
				}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<input
					type='file'
					accept='application/pdf'
					onChange={handleFileInput}
					className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
				/>

				<div className='flex flex-col items-center gap-4 pointer-events-none'>
					<div className='p-4 rounded-full bg-zinc-100 dark:bg-zinc-800'>
						<svg
							className='w-12 h-12 text-zinc-400 dark:text-zinc-500'
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
					</div>

					<div className='text-center'>
						<p className='text-lg font-medium text-zinc-900 dark:text-zinc-100'>
							Drop your PDF here
						</p>
						<p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>or click to browse</p>
					</div>

					<div className='flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800'>
						<svg className='w-4 h-4 text-red-500' fill='currentColor' viewBox='0 0 24 24'>
							<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z' />
						</svg>
						<span className='text-sm font-medium text-zinc-600 dark:text-zinc-300'>
							PDF files only
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
