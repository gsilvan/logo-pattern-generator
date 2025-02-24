import React from "react";
import jsPDF from "jspdf";

interface DownloadCanvasProps {
  canvasRef1: React.RefObject<HTMLCanvasElement>;
  canvasRef2: React.RefObject<HTMLCanvasElement>;
  canvasRef3: React.RefObject<HTMLCanvasElement>;
  canvasRef4: React.RefObject<HTMLCanvasElement>;
  canvasesToDownload: number[]; // Array of canvas indexes to download
}

export default function DownloadCanvas({
  canvasRef1,
  canvasRef2,
  canvasRef3,
  canvasRef4,
  canvasesToDownload,
}: DownloadCanvasProps) {
  const canvasRefs = [canvasRef1, canvasRef2, canvasRef3, canvasRef4];

  // Function to download a single canvas as PNG
  function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string) {
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  }

  // Function to download a single canvas as PDF
  function downloadCanvasAsPdf(canvas: HTMLCanvasElement, fileName: string) {
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      canvas.width,
      canvas.height,
      undefined,
      "SLOW",
    );
    pdf.save(fileName);
  }

  // Function to download selected canvases as PNGs
  function downloadSelectedCanvasesAsPng() {
    canvasesToDownload.forEach((index) => {
      const canvas = canvasRefs[index - 1]?.current;
      if (canvas) downloadCanvasAsPng(canvas, `canvas-${index}.png`);
    });
  }

  // Function to download selected canvases as PDFs
  function downloadSelectedCanvasesAsPdf() {
    canvasesToDownload.forEach((index) => {
      const canvas = canvasRefs[index - 1]?.current;
      if (canvas) downloadCanvasAsPdf(canvas, `canvas-${index}.pdf`);
    });
  }

  return (
    <div className="download-btns flex gap-3">
      <button
        className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
        onClick={downloadSelectedCanvasesAsPdf}
      >
        Download as PDF
      </button>
      <button
        className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
        onClick={downloadSelectedCanvasesAsPng}
      >
        Download as PNG
      </button>
    </div>
  );
}
