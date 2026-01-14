import {
	PDFDocument,
	rgb,
	pushGraphicsState,
	popGraphicsState,
	setGraphicsState,
	moveTo,
	lineTo,
	stroke,
	setStrokingColor,
	setLineWidth,
	setLineCap,
	setLineJoin,
	LineCapStyle,
	PDFName
} from 'pdf-lib';
import { Stroke } from '../types';

export async function downloadPdfWithAnnotations(file: File, annotations: Record<number, Stroke[]>) {
	try {
		const fileArrayBuffer = await file.arrayBuffer();
		const pdfDoc = await PDFDocument.load(fileArrayBuffer, { ignoreEncryption: true });
		const pages = pdfDoc.getPages();

		// Draw annotations on each page
		for (const [pageNum, strokes] of Object.entries(annotations)) {
			const pageIndex = parseInt(pageNum, 10) - 1;
			if (pageIndex < 0 || pageIndex >= pages.length) continue;

			const page = pages[pageIndex];
			const { height } = page.getSize();

			for (const strokeData of strokes) {
				if (strokeData.points.length < 2) continue;

				// Parse color from hex
				const hexColor = strokeData.color.replace('#', '');
				const r = parseInt(hexColor.substring(0, 2), 16) / 255;
				const g = parseInt(hexColor.substring(2, 4), 16) / 255;
				const b = parseInt(hexColor.substring(4, 6), 16) / 255;
				const opacity = strokeData.opacity ?? 1;

				if (opacity < 1) {
					// For semi-transparent strokes, use graphics state with operators
					// to draw the entire path at once
					const gsKey = PDFName.of(`GS_${pageIndex}_${Math.random().toString(36).substr(2, 9)}`);

					// Create and register the graphics state
					const extGState = pdfDoc.context.obj({ CA: opacity, ca: opacity });
					const extGStateRef = pdfDoc.context.register(extGState);

					// Add to page resources
					page.node.setExtGState(gsKey, extGStateRef);

					// Build operators for the path
					const operators = [
						pushGraphicsState(),
						setGraphicsState(gsKey),
						setStrokingColor(rgb(r, g, b)),
						setLineWidth(strokeData.lineWidth),
						setLineCap(LineCapStyle.Round),
						setLineJoin(1 as Parameters<typeof setLineJoin>[0]),
						moveTo(strokeData.points[0].x, height - strokeData.points[0].y),
						...strokeData.points.slice(1).map((p) => lineTo(p.x, height - p.y)),
						stroke(),
						popGraphicsState()
					];

					page.pushOperators(...operators);
				} else {
					// For fully opaque strokes, draw line segments
					for (let i = 0; i < strokeData.points.length - 1; i++) {
						const start = strokeData.points[i];
						const end = strokeData.points[i + 1];

						page.drawLine({
							start: { x: start.x, y: height - start.y },
							end: { x: end.x, y: height - end.y },
							thickness: strokeData.lineWidth,
							color: rgb(r, g, b),
							lineCap: LineCapStyle.Round
						});
					}
				}
			}
		}

		const pdfBytes = await pdfDoc.save();
		const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = file.name.replace('.pdf', '-annotated.pdf');
		link.click();

		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Failed to download PDF:', error);
		alert('Failed to download PDF with annotations');
	}
}
