'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Stroke, HistoryItem } from '../types';

const getStorageKey = (file: File) => `pdf-annotations-${file.name}-${file.size}`;

function getSavedAnnotations(file: File) {
	const storageKey = getStorageKey(file);
	try {
		const saved = localStorage.getItem(storageKey);
		if (saved) {
			const parsed = JSON.parse(saved);
			const hasAnnotations = Object.values(parsed.annotations || {}).some(
				(strokes) => (strokes as Stroke[]).length > 0
			);
			if (hasAnnotations) {
				return parsed;
			}
		}
	} catch (e) {
		console.warn('Failed to check saved annotations:', e);
	}
	return null;
}

function checkHasSavedAnnotations(file: File): boolean {
	if (typeof window === 'undefined') return false;
	return getSavedAnnotations(file) !== null;
}

export function useAnnotations(file: File) {
	const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>({});
	const [pageHistory, setPageHistory] = useState<Record<number, HistoryItem[]>>({});
	const [pageHistoryIndex, setPageHistoryIndex] = useState<Record<number, number>>({});
	const [showRestoreBanner, setShowRestoreBanner] = useState(() => checkHasSavedAnnotations(file));
	const hasUserMadeChanges = useRef(false);

	const restoreSavedAnnotations = useCallback(() => {
		const saved = getSavedAnnotations(file);
		if (saved) {
			if (saved.annotations) setAnnotations(saved.annotations);
			if (saved.pageHistory) setPageHistory(saved.pageHistory);
			if (saved.pageHistoryIndex) setPageHistoryIndex(saved.pageHistoryIndex);
			hasUserMadeChanges.current = true; // Enable auto-save after restore
		}
		setShowRestoreBanner(false);
	}, [file]);

	const dismissRestoreBanner = useCallback(() => {
		setShowRestoreBanner(false);
	}, []);

	// Auto-save annotations to localStorage only after user has made changes
	useEffect(() => {
		// Only save if the user has actually drawn something
		if (!hasUserMadeChanges.current) {
			return;
		}

		const storageKey = getStorageKey(file);
		try {
			const data = { annotations, pageHistory, pageHistoryIndex };
			localStorage.setItem(storageKey, JSON.stringify(data));
			console.log('Auto-saved annotations to localStorage');
		} catch (e) {
			console.warn('Failed to save annotations:', e);
		}
	}, [file, annotations, pageHistory, pageHistoryIndex]);

	// Expose load/clear functions to window for console access
	useEffect(() => {
		const storageKey = getStorageKey(file);

		(window as unknown as Record<string, unknown>).loadAnnotations = () => {
			try {
				const saved = localStorage.getItem(storageKey);
				console.log('Storage key:', storageKey);
				console.log('Raw saved data:', saved);
				if (saved) {
					const parsed = JSON.parse(saved);
					console.log('Parsed data:', parsed);
					const {
						annotations: savedAnnotations,
						pageHistory: savedHistory,
						pageHistoryIndex: savedIndex
					} = parsed;
					if (savedAnnotations) {
						console.log('Setting annotations:', savedAnnotations);
						setAnnotations(savedAnnotations);
					}
					if (savedHistory) setPageHistory(savedHistory);
					if (savedIndex) setPageHistoryIndex(savedIndex);
					hasUserMadeChanges.current = true;
					console.log('✓ Annotations loaded from localStorage');
				} else {
					console.log('No saved annotations found for this file');
				}
			} catch (e) {
				console.error('Failed to load:', e);
			}
		};

		(window as unknown as Record<string, unknown>).clearAnnotations = () => {
			try {
				localStorage.removeItem(storageKey);
				console.log('✓ Saved annotations cleared from localStorage');
			} catch (e) {
				console.error('Failed to clear:', e);
			}
		};

		console.log('PDF Drawer: Use loadAnnotations() or clearAnnotations() in console');
		console.log('Storage key for this file:', storageKey);

		return () => {
			delete (window as unknown as Record<string, unknown>).loadAnnotations;
			delete (window as unknown as Record<string, unknown>).clearAnnotations;
		};
	}, [file]);

	const addStroke = useCallback(
		(pageNumber: number, stroke: Stroke, thumbnail: string) => {
			// Mark that user has made changes so auto-save kicks in
			hasUserMadeChanges.current = true;

			const currentPageStrokes = annotations[pageNumber] || [];
			const newPageStrokes = [...currentPageStrokes, stroke];

			setAnnotations((prev) => ({
				...prev,
				[pageNumber]: newPageStrokes
			}));

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
		},
		[annotations, pageHistory, pageHistoryIndex]
	);

	const undo = useCallback(
		(pageNumber: number) => {
			// Mark that user has made changes so auto-save kicks in
			hasUserMadeChanges.current = true;

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
		},
		[pageHistoryIndex, pageHistory]
	);

	const redo = useCallback(
		(pageNumber: number) => {
			// Mark that user has made changes so auto-save kicks in
			hasUserMadeChanges.current = true;

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
		},
		[pageHistoryIndex, pageHistory]
	);

	const goToHistoryIndex = useCallback(
		(pageNumber: number, index: number) => {
			// Mark that user has made changes so auto-save kicks in
			hasUserMadeChanges.current = true;

			const currentPageHistory = pageHistory[pageNumber] || [];
			if (index >= 0 && index < currentPageHistory.length) {
				setPageHistoryIndex((prev) => ({ ...prev, [pageNumber]: index }));
				setAnnotations((prev) => ({
					...prev,
					[pageNumber]: currentPageHistory[index].strokes
				}));
			}
		},
		[pageHistory]
	);

	const canUndo = useCallback(
		(pageNumber: number) => (pageHistoryIndex[pageNumber] ?? 0) > 0,
		[pageHistoryIndex]
	);

	const canRedo = useCallback(
		(pageNumber: number) =>
			(pageHistoryIndex[pageNumber] ?? 0) < (pageHistory[pageNumber]?.length ?? 1) - 1,
		[pageHistoryIndex, pageHistory]
	);

	const getHistoryIndex = useCallback(
		(pageNumber: number) => pageHistoryIndex[pageNumber] ?? 0,
		[pageHistoryIndex]
	);

	const getPageHistory = useCallback(
		(pageNumber: number) =>
			pageHistory[pageNumber] || [{ strokes: [], label: 'Default Slide', thumbnail: '' }],
		[pageHistory]
	);

	return {
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
	};
}
