import React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import convertPdfPageToImage from "./pdf";


function cmToPixel(cm: number): number {
  return Math.round(118 * cm);
}

export default function Canvas({
  canvasRef,
  width,
  height,
  image,
  banderoleImage,
  rotation,
  logoTargetWidth,
  backgroundColor,
  xGap,
  yGap,
  x2Offset,
  backgroundImage,
  imgOnLoad,
  isPacked,
  packedHeight,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  width: number;
  height: number;
  image: string;
  banderoleImage: string;
  rotation: number;
  logoTargetWidth: number;
  backgroundColor: string;
  xGap: number;
  yGap: number;
  x2Offset: number;
  backgroundImage: string | undefined;
  imgOnLoad: any;
  isPacked: any;
  packedHeight: number;
}) {
  
  
  
  const canvasSize = {
    width: isPacked ? cmToPixel(10) : cmToPixel(width),
    height: isPacked ? cmToPixel(packedHeight) : cmToPixel(height),
  };
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [pdfImage, setPdfImage] = useState<string | null>(null);

  // Memoize the logo image to prevent it from being recreated on every render
  const logo = useMemo(() => {
    const img = new Image();
    setIsLogoLoaded(false);
    img.src = image;
    img.onload = () => {
      imgOnLoad();  
      setIsLogoLoaded(true);
    }
    return img;
  }, [image]);

  const banderoleLogo = useMemo(() => {
    const img = new Image();
    setIsLogoLoaded(false);
    img.src = banderoleImage;
    img.onload = () => {
      imgOnLoad();  
      setIsLogoLoaded(true);
    }
    return img;
  }, [banderoleImage]);
  
  

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
    scaleFactor =  canvasPrevWidth / 4800;
  }

  //coordinate system size
  const coordSystemWidth = canvasSize.width * scaleFactor + 7;
  const coordSystemHeight = canvasSize.height * scaleFactor + 7 ;
  const coordinateSystemDivStyle = {
    height: `${coordSystemHeight}px`,
    width: `${coordSystemWidth}px`,
  };

  const coordinateSystemContainerDivStyle = {
    height: `${4130 * scaleFactor + 30}px`,
    width: `${4130 * scaleFactor + 30}px`,
  }


  useEffect(() => {
    if (isPacked) {
      convertPdfPageToImage("/banderolle/Druckstanze_Banderole_235x47mm_Beispiel_1.pdf") 
        .then((imageDataUrl) => {
          setPdfImage(imageDataUrl);
        })
        .catch((error) => console.error("Failed to load PDF image:", error));
    }
  }, [isPacked]);

  useEffect(() => {
    if (previewCanvasRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const previewCtx = previewCanvasRef.current.getContext("2d");

      if (ctx && previewCtx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        ctx.save();
        ctx.translate(canvasSize.width / 2, canvasSize.height / 2);
        
        ctx.rotate((rotation * Math.PI) / 180);
  

        for (let i = -100; i < 100; i++) {
          for (let j = -100; j < 100; j++) {
            ctx.drawImage(
              _backgroundImage,
              i * _backgroundImage.width,
              j * _backgroundImage.height,
              _backgroundImage.width,
              _backgroundImage.height
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
              logo.height * _scale
            );
          }
        }
        ctx.restore();

        if (isPacked && pdfImage) {
          const img = new Image();
          img.src = pdfImage;

          const imgAspectRatio = img.width / img.height;
          const imgWidth = canvasSize.width;
          const imgHeight = img.width / imgAspectRatio;


          const bLAspectRatio = banderoleLogo.width / banderoleLogo.height
          const bLHeight = imgHeight;
          const bLWidth = bLAspectRatio * bLHeight;
          
          if (imgWidth && imgHeight) {
            const centerX = (canvasSize.width - imgWidth) / 2 ;
            const centerY = (canvasSize.height - imgHeight) / 2;
      
            ctx.drawImage(img, centerX, centerY, imgWidth, imgHeight);

            if (bLWidth && bLHeight) { 
              const centerBLX = (canvasSize.width - bLWidth) / 2 ;
              const centerBLY = (canvasSize.height - bLHeight) / 2;
              ctx.drawImage(banderoleLogo, centerBLX, centerBLY, bLWidth, bLHeight);
              console.log(banderoleLogo, bLAspectRatio, bLHeight,bLWidth);
            }
          }
        }


        const scaledWidth = canvasRef.current.width * scaleFactor;
        const scaledHeight = canvasRef.current.height * scaleFactor;

        previewCanvasRef.current.width = scaledWidth;
        previewCanvasRef.current.height = scaledHeight;
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
    isLogoLoaded,
    isPacked,
    pdfImage
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
          <span className="y-label">{isPacked ? packedHeight : height + 'cm'}</span>
          <span className="x-label">{isPacked ? 10 : width + 'cm'}</span>
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
