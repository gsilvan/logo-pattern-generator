import React from "react";
import jsPDF from "jspdf";
import { useState, useRef } from "react";

interface DownloadCanvasProps {
  canvasRef1: React.RefObject<HTMLCanvasElement>;
  canvasRef2: React.RefObject<HTMLCanvasElement>;
  canvasRef3: React.RefObject<HTMLCanvasElement>;
  canvasRef4: React.RefObject<HTMLCanvasElement>;
  isPacked: any; // Array of canvas indexes to download
}

export default function DownloadCanvas({
  canvasRef1,
  canvasRef2,
  canvasRef3,
  canvasRef4,
  isPacked,
}: DownloadCanvasProps) {
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const [showPngDropdown, setShowPngDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const togglePdfDropdown = () => setShowPdfDropdown((prev) => !prev);
  const togglePngDropdown = () => setShowPngDropdown((prev) => !prev);

  // Function to download a single canvas as PNG
  function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string) {
    const btns = document.querySelectorAll("interactive-btn");
    btns.forEach((btn) => {
      (btn as HTMLElement).style.display = "none";
    });
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
    const btns = document.querySelectorAll(".interactive-btn");
    btns.forEach((btn) => {
      (btn as HTMLElement).style.display = "none";
    });
  }

  // // Function to download selected canvases as PNGs
  // function downloadSelectedCanvasesAsPng() {
  //   canvasesToDownload.forEach((index) => {
  //     const canvas = canvasRefs[index - 1]?.current;
  //     if (canvas) downloadCanvasAsPng(canvas, `canvas-${index}.png`);
  //   });
  // }

  // // Function to download selected canvases as PDFs
  // function downloadSelectedCanvasesAsPdf() {
  //   canvasesToDownload.forEach((index) => {
  //     const canvas = canvasRefs[index - 1]?.current;
  //     if (canvas) downloadCanvasAsPdf(canvas, `canvas-${index}.pdf`);
  //   });
  // }

  return (
    <div className="download-btns flex gap-3">
      <div className=" relative inline-block">
        <button
          className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
          onClick={() => {
            if (!isPacked && canvasRef1.current) {
              downloadCanvasAsPdf(canvasRef1.current, "Muster");
            } else {
              togglePdfDropdown();
            }
          }}
        >
          Download as PDF
        </button>
        {/* Dropdown Menu */}
        {showPdfDropdown && (
          <div
            ref={dropdownRef}
            className="absolute mt-2 w-48 bg-white border rounded-lg shadow-lg"
          >
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (canvasRef2.current) {
                  downloadCanvasAsPdf(canvasRef2.current, "Vorderseite");
                }
                setShowPdfDropdown(false);
              }}
            >
              Vorderseite
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (canvasRef3.current) {
                  downloadCanvasAsPdf(canvasRef3.current, "Ruckseite");
                }
                setShowPdfDropdown(false);
              }}
            >
              Ruckseite
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (canvasRef4.current) {
                  downloadCanvasAsPdf(canvasRef4.current, "Banderole");
                }
                setShowPdfDropdown(false);
              }}
            >
              Banderole
            </button>
          </div>
        )}
      </div>
      <div className=" relative inline-block">
        <button
          className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
          onClick={() => {
            if (!isPacked && canvasRef1.current) {
              downloadCanvasAsPdf(canvasRef1.current, "Muster");
            } else {
              togglePngDropdown();
            }
          }}
        >
          Download as PNG
        </button>
        {/* Dropdown Menu */}
        {showPngDropdown && (
          <div
            ref={dropdownRef}
            className="absolute mt-2 w-48 bg-white border rounded-lg shadow-lg"
          >
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (canvasRef2.current) {
                  downloadCanvasAsPng(canvasRef2.current, "Vorderseite");
                }
                setShowPngDropdown(false);
              }}
            >
              Vorderseite
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (canvasRef3.current) {
                  downloadCanvasAsPng(canvasRef3.current, "Ruckseite");
                }
                setShowPngDropdown(false);
              }}
            >
              Ruckseite
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (canvasRef4.current) {
                  downloadCanvasAsPng(canvasRef4.current, "Banderole");
                }
                setShowPngDropdown(false);
              }}
            >
              Banderole
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
