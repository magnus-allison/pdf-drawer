'use client';

import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
	onUndo: () => void;
	onRedo: () => void;
	onPrevPage: () => void;
	onNextPage: () => void;
}

export function useKeyboardShortcuts({
	onUndo,
	onRedo,
	onPrevPage,
	onNextPage
}: UseKeyboardShortcutsOptions) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Undo: Cmd/Ctrl + Z
			if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				onUndo();
				return;
			}
			// Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
			if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
				e.preventDefault();
				onRedo();
				return;
			}
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				onPrevPage();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				onNextPage();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onUndo, onRedo, onPrevPage, onNextPage]);
}
