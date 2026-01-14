export interface Point {
	x: number;
	y: number;
}

export interface Stroke {
	points: Point[];
	color: string;
	lineWidth: number;
	opacity?: number;
}

export interface HistoryItem {
	strokes: Stroke[];
	label: string;
	thumbnail: string;
}

export const LINE_SIZES = [
	{ name: 'thin', value: 2 },
	{ name: 'medium', value: 4 },
	{ name: 'thick', value: 8 },
	{ name: 'extra thick', value: 12 }
] as const;

export const HIGHLIGHTER_SIZE = 20;
export const HIGHLIGHTER_OPACITY = 0.5;
