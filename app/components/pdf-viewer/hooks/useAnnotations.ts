'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LZString from 'lz-string';
import { Stroke, HistoryItem, Point } from '../types';

const getStorageKey = (file: File) => `pdf-annotations-${file.name}-${file.size}`;

// Simplify a path by removing points that don't significantly change direction
function simplifyPath(points: Point[], tolerance: number = 1): Point[] {
	if (points.length <= 2) return points;

	const result: Point[] = [points[0]];
	let lastKept = points[0];

	for (let i = 1; i < points.length - 1; i++) {
		const current = points[i];
		const distSq = (current.x - lastKept.x) ** 2 + (current.y - lastKept.y) ** 2;

		// Keep point if it's far enough from the last kept point
		if (distSq >= tolerance * tolerance) {
			result.push(current);
			lastKept = current;
		}
	}

	// Always keep the last point
	result.push(points[points.length - 1]);
	return result;
}

// Compress stroke data for storage - only save annotations (not full history)
function compressForStorage(annotations: Record<number, Stroke[]>) {
	// Round coordinates and simplify paths
	const compressed: Record<number, Stroke[]> = {};

	for (const [page, strokes] of Object.entries(annotations)) {
		compressed[Number(page)] = strokes.map((stroke) => ({
			...stroke,
			points: simplifyPath(stroke.points).map((p) => ({
				x: Math.round(p.x * 10) / 10,
				y: Math.round(p.y * 10) / 10
			}))
		}));
	}

	// LZ compress the JSON - only store annotations, not history (history is session-only)
	return LZString.compressToUTF16(JSON.stringify({ annotations: compressed }));
}

// Decompress stored data
function decompressFromStorage(compressed: string) {
	try {
		const decompressed = LZString.decompressFromUTF16(compressed);
		if (decompressed) {
			return JSON.parse(decompressed);
		}
	} catch {
		// Try parsing as uncompressed JSON (for backwards compatibility)
		try {
			return JSON.parse(compressed);
		} catch {
			return null;
		}
	}
	return null;
}

function getSavedAnnotations(file: File) {
	const storageKey = getStorageKey(file);
	try {
		const saved = localStorage.getItem(storageKey);
		if (saved) {
			const parsed = decompressFromStorage(saved);
			if (parsed) {
				const hasAnnotations = Object.values(parsed.annotations || {}).some(
					(strokes) => (strokes as Stroke[]).length > 0
				);
				if (hasAnnotations) {
					return parsed;
				}
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
			if (saved.annotations) {
				setAnnotations(saved.annotations);
				// Rebuild minimal history from loaded annotations
				const newHistory: Record<number, HistoryItem[]> = {};
				const newIndex: Record<number, number> = {};
				for (const [page, strokes] of Object.entries(saved.annotations)) {
					newHistory[Number(page)] = [
						{ strokes: strokes as Stroke[], label: 'Restored', thumbnail: '' }
					];
					newIndex[Number(page)] = 0;
				}
				setPageHistory(newHistory);
				setPageHistoryIndex(newIndex);
			}
			hasUserMadeChanges.current = true; // Enable auto-save after restore
		}
		setShowRestoreBanner(false);
	}, [file]);

	const dismissRestoreBanner = useCallback(() => {
		setShowRestoreBanner(false);
	}, []);

	// Auto-save annotations to localStorage with debounce
	useEffect(() => {
		// Only save if the user has actually drawn something
		if (!hasUserMadeChanges.current) {
			return;
		}

		// Debounce saves to avoid performance issues during rapid drawing
		const timeoutId = setTimeout(() => {
			const storageKey = getStorageKey(file);
			try {
				const compressed = compressForStorage(annotations);
				localStorage.setItem(storageKey, compressed);
				console.log('Auto-saved annotations to localStorage (compressed)');
			} catch (e) {
				console.warn('Failed to save annotations:', e);
			}
		}, 1000); // Wait 1 second after last change

		return () => clearTimeout(timeoutId);
	}, [file, annotations]);

	// Expose load/clear functions to window for console access
	useEffect(() => {
		const storageKey = getStorageKey(file);

		(window as unknown as Record<string, unknown>).loadAnnotations = () => {
			try {
				const saved = localStorage.getItem(storageKey);
				console.log('Storage key:', storageKey);
				console.log('Raw saved data length:', saved?.length);
				if (saved) {
					const parsed = decompressFromStorage(saved);
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

		// Show storage stats
		(window as unknown as Record<string, unknown>).storageStats = () => {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const decompressed = LZString.decompressFromUTF16(saved);
				console.log('Compressed size:', saved.length, 'chars');
				console.log('Decompressed size:', decompressed?.length || 'N/A', 'chars');
				console.log(
					'Compression ratio:',
					decompressed ? ((1 - saved.length / decompressed.length) * 100).toFixed(1) + '%' : 'N/A'
				);
			} else {
				console.log('No saved data');
			}
		};

		console.log('PDF Drawer: Use loadAnnotations(), clearAnnotations(), or storageStats() in console');
		console.log('Storage key for this file:', storageKey);

		return () => {
			delete (window as unknown as Record<string, unknown>).loadAnnotations;
			delete (window as unknown as Record<string, unknown>).clearAnnotations;
			delete (window as unknown as Record<string, unknown>).storageStats;
		};
	}, [file]);

	const addStroke = useCallback(
		(pageNumber: number, stroke: Stroke, thumbnail: string) => {
			// Mark that user has made changes so auto-save kicks in
			hasUserMadeChanges.current = true;

			setAnnotations((prev) => {
				const currentPageStrokes = prev[pageNumber] || [];
				return {
					...prev,
					[pageNumber]: [...currentPageStrokes, stroke]
				};
			});

			// Add to page-specific history (limit to 50 items to prevent memory issues)
			setPageHistory((prev) => {
				const currentPageHistory = prev[pageNumber] || [
					{ strokes: [], label: 'Default Slide', thumbnail: '' }
				];
				const currentIndex = pageHistoryIndex[pageNumber] ?? 0;
				const newPageStrokes = [...(annotations[pageNumber] || []), stroke];

				// Slice history up to current index, then add new entry
				let newPageHistory = currentPageHistory.slice(0, currentIndex + 1);
				newPageHistory.push({
					strokes: newPageStrokes,
					label: `Stroke ${newPageHistory.length}`,
					thumbnail
				});

				// Limit history depth to prevent memory bloat
				const MAX_HISTORY = 50;
				if (newPageHistory.length > MAX_HISTORY) {
					newPageHistory = newPageHistory.slice(-MAX_HISTORY);
				}

				return { ...prev, [pageNumber]: newPageHistory };
			});

			setPageHistoryIndex((prev) => {
				const currentIndex = prev[pageNumber] ?? 0;
				const newLength = Math.min(currentIndex + 2, 50); // +2 because we're adding one
				return { ...prev, [pageNumber]: newLength - 1 };
			});
		},
		[annotations, pageHistoryIndex]
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
