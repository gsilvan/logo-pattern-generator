import React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
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
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);

  // Memoize the logo image to prevent it from being recreated on every render
  const logo = useMemo(() => {
    const img = new Image();
    setIsLogoLoaded(false);
    img.src = image;
    img.onload = () => {
      setIsLogoLoaded(true);
    }
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

  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height
  let scaleFactor = 0.24
  // Responsive scale factor for canvas preview
  if (screenWidth > 900) {
    const canvasPrevWidth = screenHeight * 0.67;
    scaleFactor =  canvasPrevWidth / 4130;
  } else {
    const canvasPrevWidth = screenWidth * 0.80;
    scaleFactor =  canvasPrevWidth / 4130;
  }

  //coordinate system size
  const coordSystemWidth = canvasSize.width * scaleFactor + 7;
  const coordSystemHeight = canvasSize.height * scaleFactor + 7 ;
  const coordinateSystemDivStyle = {
    height: `${coordSystemHeight}px`,
    width: `${coordSystemWidth}px`,
  };

  const coordinateSystemContainerDivStyle = {
    height: `${4130 * scaleFactor + 8}px`,
    width: `${4130 * scaleFactor + 8}px`,
  }


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
    scaleFactor,
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
    isLogoLoaded
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
      <div className="coordinate-system-container" style={coordinateSystemContainerDivStyle}>
        <div className="coordinate-system" style={coordinateSystemDivStyle}>
          <span className="y-label">{height + 'cm'}</span>
          <span className="x-label">{width + 'cm'}</span>
          <canvas
            id="preview-canvas"
            ref={previewCanvasRef}
            width={800}
            height={600}
          />
        </div>
      </div>
    </>
  );
}
