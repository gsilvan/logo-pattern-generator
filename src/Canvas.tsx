import React from "react";
import { useRef, useEffect } from "react";
import jsPDF from "jspdf";

function cmToPixel(cm: number): number {
  return Math.round(118 * cm);
}

export default function Canvas({
  width,
  height,
  image,
  rotation,
  logoTargetWidth,
  backgroundColor,
  xGap,
  yGap,
  x2Offset,
  backgroundImage,
}: {
  width: number;
  height: number;
  image: string;
  rotation: number;
  logoTargetWidth: number;
  backgroundColor: string;
  xGap: number;
  yGap: number;
  x2Offset: number;
  backgroundImage: string | undefined;
}) {
  const canvasSize = {
    width: cmToPixel(width),
    height: cmToPixel(height),
  };
  const canvasRef = useRef(null);

  const logo = new Image();
  logo.src = image;
  const _backgroundImage = new Image();
  if (typeof backgroundImage === "string") {
    _backgroundImage.src = backgroundImage;
  }

  const _scale = logoTargetWidth / (logo.width ?? logoTargetWidth);

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

  useEffect(() => {
    console.log("use effect");
    const canvas = canvasRef.current;
    // @ts-ignore
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.save(); // Save the current state
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2); // Move the origin to the center
    ctx.rotate((rotation * Math.PI) / 180);
    for (let i = -100; i < 100; i++) {
      for (let j = -100; j < 100; j++) {
        ctx.drawImage(
          _backgroundImage,
          i * _backgroundImage.width,
          j * _backgroundImage.height,
          _backgroundImage.width,
          _backgroundImage.height,
        );
      }
    }
    for (let i = -100; i < 100; i++) {
      for (let j = -100; j < 100; j++) {
        ctx.drawImage(
          logo,
          i * logo.width * _scale + i * xGap + (j % 2) * x2Offset,
          j * logo.height * _scale + j * yGap,
          logo.width * _scale,
          logo.height * _scale,
        );
      }
    }
    ctx.restore();
  }, [
    width,
    height,
    image,
    rotation,
    _scale,
    backgroundColor,
    logo,
    logo.src,
    _backgroundImage,
    _backgroundImage.src,
    canvasSize.width,
    canvasSize.height,
    xGap,
    yGap,
    x2Offset,
  ]);

  return (
    <>
      <canvas
        id="mycanvas"
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      <div className="fixed right-14 bottom-5">
        <div className="flex gap-3">
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
      </div>
    </>
  );
}
