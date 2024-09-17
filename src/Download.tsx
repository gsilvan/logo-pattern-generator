import React from "react";
import jsPDF from "jspdf";

export default function DownloadCanvas({
    canvasRef,
  }: {
    canvasRef: React.RefObject<HTMLCanvasElement>;
  }) {
  function downloadCanvas() {
    const canvas = document.getElementById("mycanvas") as HTMLCanvasElement;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "preview.png";
    link.click();
  }

  function downloadCanvasAsPdf() {
    if (canvasRef.current) {
      const canvas = document.getElementById("mycanvas") as HTMLCanvasElement;
      const imgData = canvas.toDataURL("image/png");

      // Create a PDF document
      const pdf = new jsPDF({
        unit: "px",
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

      // Download the PDF
      pdf.save("export.pdf");
    }
  }


  return (
    <>
        <div className="download-btns flex gap-3">
          <button
            className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
            onClick={downloadCanvasAsPdf}
          >
            Download PDF
          </button>
          <button
            className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
            onClick={downloadCanvas}
          >
            Download PNG
          </button>
        </div>
    </>
  );
}
