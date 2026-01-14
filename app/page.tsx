'use client';

import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import PdfViewer from './components/pdf-viewer';

export default function Home() {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	useEffect(() => {
		if (selectedFile) {
			document.title = selectedFile.name;
		} else {
			document.title = 'Welcome';
		}
	}, [selectedFile]);

	const handleFileSelect = (file: File) => {
		setSelectedFile(file);
	};

	const handleBack = () => {
		setSelectedFile(null);
	};

	if (selectedFile) {
		return <PdfViewer file={selectedFile} onBack={handleBack} />;
	}

	return <FileUpload onFileSelect={handleFileSelect} />;
}
