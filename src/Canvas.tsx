import React from "react";
import { useRef, useEffect, useMemo } from "react";

function cmToPixel(cm: number): number {
  return Math.round(118 * cm);
}

export default function Canvas({
  canvasRef,
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
  canvasRef: React.RefObject<HTMLCanvasElement>;
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
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize the logo image to prevent it from being recreated on every render
  const logo = useMemo(() => {
    const img = new Image();
    img.src = image;
    return img;
  }, [image]);

  // Memoize the background image to prevent it from being recreated on every render
  const _backgroundImage = useMemo(() => {
    const img = new Image();
    if (typeof backgroundImage === "string") {
      img.src = backgroundImage;
    }
    return img;
  }, [backgroundImage]);


  const _scale = logoTargetWidth / (logo.width ?? logoTargetWidth);

  useEffect(() => {
    if (previewCanvasRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const previewCtx = previewCanvasRef.current.getContext("2d");
      if (ctx && previewCtx) {
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

        const scaleFactor = 0.24;
        const scaledWidth = canvasRef.current.width * scaleFactor;
        const scaledHeight = canvasRef.current.height * scaleFactor;

        // Set preview canvas size
        previewCanvasRef.current.width = scaledWidth;
        previewCanvasRef.current.height = scaledHeight;

        // Scale and draw the original canvas content on the preview canvas
        previewCtx.scale(scaleFactor, scaleFactor);
        previewCtx.drawImage(canvasRef.current, 0, 0);
      }
    }
  }, [
    canvasRef,
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
        className="hidden"
        id="mycanvas"
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      <canvas
        id="preview-canvas"
        ref={previewCanvasRef}
        width={800}
        height={600}
      />
    </>
  );
}
