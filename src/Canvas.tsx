import React from "react";
import { useRef, useEffect, useMemo } from "react";
import { log } from "util";

function cmToPixel(cm: number): number {
  return Math.round(28 * cm);
}

export default function Canvas({
  width,
  height,
  image,
  rotation,
  scale,
  backgroundColor,
  xGap,
  yGap,
}: {
  width: number;
  height: number;
  image: string;
  rotation: number;
  scale: number;
  backgroundColor: string;
  xGap: number;
  yGap: number;
}) {
  const canvasSize = {
    width: 1100,
    height: 1100,
  };
  const pixelWidth = cmToPixel(width);
  const pixelHeight = cmToPixel(height);
  const canvasRef = useRef(null);

  const logo = new Image();
  logo.src = image;

  const _scale = scale / 100;

  const downloadCanvas = () => {
    const canvas = document.getElementById("mycanvas") as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "canvas_image.png";
      link.click();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    // @ts-ignore
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 1200, 1200);

    ctx.save(); // Save the current state
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2); // Move the origin to the center
    ctx.rotate((rotation * Math.PI) / 180);
    for (let i = -10; i < 10; i++) {
      for (let j = -10; j < 10; j++) {
        ctx.drawImage(
          logo,
          i * logo.width * _scale + i * cmToPixel(xGap),
          j * logo.height * _scale + j * cmToPixel(yGap),
          logo.width * _scale,
          logo.height * _scale,
        );
      }
    }
    ctx.restore();

    ctx.lineWidth = 20;
    ctx.strokeStyle = "red";
    ctx.strokeRect(20, 20, pixelWidth, pixelHeight);

    ctx.fillStyle = "#000";

    ctx.font = "24px Mono";
    ctx.fillStyle = "#fff";
    ctx.fillText(
      `${width} cm x ${height} cm`,
      pixelWidth - 250,
      pixelHeight + 28,
    );
  }, [
    width,
    height,
    image,
    rotation,
    scale,
    backgroundColor,
    logo,
    pixelHeight,
    pixelWidth,
    canvasSize.width,
    canvasSize.height,
    xGap,
    yGap,
  ]);

  return (
    <>
      <canvas
        id="mycanvas"
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      <button onClick={downloadCanvas}>Download PNG</button>
    </>
  );
}
