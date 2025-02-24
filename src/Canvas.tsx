import React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { CSSProperties } from "react";

function cmToPixel(cm: number): number {
  return Math.round(118 * cm);
}

export default function Canvas({
  canvasRef1,
  canvasRef2,
  canvasRef3,
  canvasRef4,
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
  blLogoTargetWidth,
  blRotation,
  blXPosition,
  blYPosition,
  companyName,
  companyStreet,
  companyZipCode,
  companyCity,
  screenWidth,
}: {
  canvasRef1: React.RefObject<HTMLCanvasElement>;
  canvasRef2: React.RefObject<HTMLCanvasElement>;
  canvasRef3: React.RefObject<HTMLCanvasElement>;
  canvasRef4: React.RefObject<HTMLCanvasElement>;
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
  blLogoTargetWidth: number;
  blRotation: number;
  blXPosition: number;
  blYPosition: number;
  companyName: string;
  companyStreet: string;
  companyZipCode: string;
  companyCity: string;
  screenWidth: number;
}) {
  const canvasSize = {
    width: cmToPixel(width),
    height: cmToPixel(height),
  };
  const previewCanvas1Ref = useRef<HTMLCanvasElement>(null);
  const previewCanvas2Ref = useRef<HTMLCanvasElement | null>(null);
  const previewCanvas3Ref = useRef<HTMLCanvasElement | null>(null);
  const previewCanvas4Ref = useRef<HTMLCanvasElement | null>(null);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);

  // Memoize the logo image to prevent it from being recreated on every render
  const logo = useMemo(() => {
    const img = new Image();
    setIsLogoLoaded(false);
    img.src = image;
    img.onload = () => {
      imgOnLoad();
      setIsLogoLoaded(true);
    };
    return img;
  }, [image]);

  const banderoleLogo = useMemo(() => {
    const img = new Image();
    setIsLogoLoaded(false);
    img.src = banderoleImage;
    img.onload = () => {
      imgOnLoad();
      setIsLogoLoaded(true);
    };
    return img;
  }, [banderoleImage]);

  const banderoleBackside = useMemo(() => {
    const img = new Image();

    img.src = "/banderole/Banderole_Backside.svg";
    img.onload = () => {};
    return img;
  }, []);

  const banderole = useMemo(() => {
    const img = new Image();
    img.src = "/banderole/path3.png";
    img.onload = () => {};
    return img;
  }, []);
  // Memoize the background image to prevent it from being recreated on every render
  const _backgroundImage = useMemo(() => {
    const img = new Image();
    if (typeof backgroundImage === "string") {
      img.src = backgroundImage;
    }
    return img;
  }, [backgroundImage]);

  const _scale = logoTargetWidth / (logo.width ?? logoTargetWidth);

  const screenHeight = window.screen.height;
  let scaleFactor = 0.24;
  // Responsive scale factor for canvas preview
  if (screenWidth > 900) {
    const canvasPrevWidth = screenHeight * 0.67;
    scaleFactor = canvasPrevWidth / 4130;
  } else {
    const canvasPrevWidth = screenWidth * 0.85;
    scaleFactor = canvasPrevWidth / 4800;
  }

  //coordinate system size
  const coordSystemWidth = isPacked
    ? cmToPixel(10) * scaleFactor + 7
    : canvasSize.width * scaleFactor + 7;
  const coordSystemHeight = isPacked
    ? (canvasSize.height / 2) * scaleFactor + 7
    : canvasSize.height * scaleFactor + 7;
  const coordinateSystemDivStyle = {
    height: `${coordSystemHeight}px`,
    width: `${coordSystemWidth}px`,
  };

  const coordinateSystemContainerDivStyle = {
    height: `${4130 * scaleFactor + 5}px`,
    width: `${4130 * scaleFactor + 5}px`,
    display: isPacked ? "none" : "block",
  };
  const coordinateSystemContainerPackedDivStyle: CSSProperties = {
    height: `${4130 * scaleFactor + 5}px`,
    width: `${4130 * scaleFactor + 5}px`,
    display: isPacked ? "flex" : "none",
    gap: screenWidth > 900 ? "100px" : "50px",
    flexDirection: "column",
    justifyContent: "center",
    paddingTop: "30px",
  };

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    isBold: boolean = false,
  ) {
    if (isBold) {
      ctx.font = "bold 20px Arial"; // Apply bold font for titles
    } else {
      ctx.font = "20px Arial"; // Regular font for paragraphs
    }

    const words = text.split(" ");
    let line = "";
    let yOffset = 0;

    for (let i = 0; i < words.length; i++) {
      let testLine = line + words[i] + " ";
      let testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, y + yOffset);
        line = words[i] + " ";
        yOffset += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + yOffset);

    return y + yOffset + lineHeight; // Return new Y position after wrapping
  }

  useEffect(() => {
    if (previewCanvas1Ref.current && canvasRef1.current) {
      const ctx1 = canvasRef1.current.getContext("2d");
      const previewCtx1 = previewCanvas1Ref.current.getContext("2d");

      if (ctx1 && previewCtx1) {
        ctx1.fillStyle = backgroundColor;
        ctx1.fillRect(0, 0, canvasSize.width, canvasSize.height);

        ctx1.save();
        ctx1.translate(canvasSize.width / 2, canvasSize.height / 2);

        ctx1.rotate((rotation * Math.PI) / 180);

        for (let i = -100; i < 100; i++) {
          for (let j = -100; j < 100; j++) {
            ctx1.drawImage(
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
            ctx1.drawImage(
              logo,
              i * logo.width * _scale + i * xGap + (j % 2) * x2Offset,
              j * logo.height * _scale + j * yGap,
              logo.width * _scale,
              logo.height * _scale,
            );
          }
        }
        ctx1.restore();

        const scaledWidth = canvasRef1.current.width * scaleFactor;
        const scaledHeight = canvasRef1.current.height * scaleFactor;

        previewCanvas1Ref.current.width = scaledWidth;
        previewCanvas1Ref.current.height = scaledHeight;
        previewCtx1.scale(scaleFactor, scaleFactor);
        previewCtx1.drawImage(canvasRef1.current, 0, 0);
      }
    }
    if (previewCanvas2Ref.current && canvasRef2.current) {
      const ctx2 = canvasRef2.current.getContext("2d");
      const previewCtx2 = previewCanvas2Ref.current.getContext("2d");

      if (ctx2 && previewCtx2) {
        ctx2.fillStyle = backgroundColor;
        ctx2.fillRect(0, 0, cmToPixel(10), canvasSize.height / 2);

        ctx2.save();
        ctx2.translate(canvasSize.width / 2, canvasSize.height / 2);

        ctx2.rotate((rotation * Math.PI) / 180);

        for (let i = -100; i < 100; i++) {
          for (let j = -100; j < 100; j++) {
            ctx2.drawImage(
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
            ctx2.drawImage(
              logo,
              i * logo.width * _scale + i * xGap + (j % 2) * x2Offset,
              j * logo.height * _scale + j * yGap,
              logo.width * _scale,
              logo.height * _scale,
            );
          }
        }
        ctx2.restore();
        const height = cmToPixel(4.7);
        const width = cmToPixel(10);
        const centerY = (canvasSize.height / 2 - height) / 2;
        ctx2.fillStyle = "white";
        ctx2.fillRect(0, centerY, width, height);

        ctx2.save();

        let logoWidth = blLogoTargetWidth;
        let logoHeight =
          (banderoleLogo.height / banderoleLogo.width) * logoWidth;
        if (logoHeight > 554) {
          logoHeight = 554;
          logoWidth = (banderoleLogo.width / banderoleLogo.height) * logoHeight;
        }

        const logoX = (cmToPixel(10) - logoWidth) / 2 + blXPosition;
        const logoY = (canvasSize.height / 2 - logoHeight) / 2 + blYPosition;

        // Move pivot point to center of logo
        ctx2.translate(logoX + logoWidth / 2, logoY + logoHeight / 2);

        // Rotate around new pivot point
        ctx2.rotate((blRotation * Math.PI) / 180);

        // Draw image centered at the new (0,0) pivot
        ctx2.drawImage(
          banderoleLogo,
          -logoWidth / 2, // Shift left to center the image
          -logoHeight / 2, // Shift up to center the image
          logoWidth,
          logoHeight,
        );

        ctx2.restore(); // Restore canvas state

        const scaledWidth = canvasRef2.current.width * scaleFactor;
        const scaledHeight = canvasRef2.current.height * scaleFactor;

        previewCanvas2Ref.current.width = scaledWidth;
        previewCanvas2Ref.current.height = scaledHeight;
        previewCtx2.scale(scaleFactor, scaleFactor);
        previewCtx2.drawImage(canvasRef2.current, 0, 0);
      }
    }
    if (previewCanvas3Ref.current && canvasRef3.current) {
      const ctx3 = canvasRef3.current.getContext("2d");
      const previewCtx3 = previewCanvas3Ref.current.getContext("2d");

      if (ctx3 && previewCtx3) {
        ctx3.fillStyle = backgroundColor;
        ctx3.fillRect(0, 0, cmToPixel(10), canvasSize.height / 2);

        ctx3.save();
        ctx3.translate(canvasSize.width / 2, canvasSize.height / 2);

        ctx3.rotate((rotation * Math.PI) / 180);

        for (let i = -100; i < 100; i++) {
          for (let j = -100; j < 100; j++) {
            ctx3.drawImage(
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
            ctx3.drawImage(
              logo,
              i * logo.width * _scale + i * xGap + (j % 2) * x2Offset,
              j * logo.height * _scale + j * yGap,
              logo.width * _scale,
              logo.height * _scale,
            );
          }
        }
        ctx3.restore();

        const height = cmToPixel(4.7);
        const centerY = (canvasSize.height / 2 - height) / 2;
        ctx3.drawImage(banderoleBackside, 0, centerY, cmToPixel(10), height);

        // Drawing the formatted text
        ctx3.textAlign = "left";
        ctx3.textBaseline = "top";
        ctx3.fillStyle = "black";

        let x = cmToPixel(10) - 420;
        let y = (canvasRef3.current.height - height) / 2 + 50;
        let maxWidth = 400;
        let lineHeight = 30;

        // Bold Title: "Anleitung:"
        y = wrapText(ctx3, "Anleitung:", x, y, maxWidth, lineHeight, true);

        // Normal Paragraph
        y = wrapText(
          ctx3,
          "Circa 1 Jahr wiederverwendbar. Kein rohes Fleisch, keinen rohen Fisch einwickeln. Vor direkter Sonneneinstrahlung schützen und nicht über 25 Grad lagern.",
          x,
          y,
          maxWidth,
          lineHeight,
        );

        // Add extra space before next section
        y += lineHeight;

        // Bold Title: "Reinigung:"
        y = wrapText(ctx3, "Reinigung:", x, y, maxWidth, lineHeight, true);

        // Normal Paragraph
        y = wrapText(
          ctx3,
          "Unter kaltem Wasser abspülen. Evtl. Bio-Spülmittel, sanft schrubben (kein heißes Wasser). Nicht auf der Heizung trocknen.",
          x,
          y,
          maxWidth,
          lineHeight,
        );

        // Add extra space before next section
        y += lineHeight;

        // Bold Title: "Inhaltsstoffe:"
        y = wrapText(ctx3, "Inhaltsstoffe:", x, y, maxWidth, lineHeight, true);

        // Normal Paragraph
        y = wrapText(
          ctx3,
          "GOTS zertifizierte Biobaumwolle, Kiefernharz aus Portugal, Bienenwachs aus kontrolliert biologischem Anbau (kba).",
          x,
          y,
          maxWidth,
          lineHeight,
        );

        ctx3.restore();

        ctx3.fillStyle = "black";
        ctx3.textAlign = "left";
        ctx3.textBaseline = "top";

        x = 50;
        y = (canvasRef3.current.height - height) / 2 + height - 150;
        maxWidth = 400;
        lineHeight = 30;

        // Bold title: "Inverkehrbringer:"
        y = wrapText(
          ctx3,
          "Inverkehrbringer:",
          x,
          y,
          maxWidth,
          lineHeight,
          true,
        );

        // Normal text (address)
        y = wrapText(ctx3, companyName, x, y, maxWidth, lineHeight);
        y = wrapText(ctx3, companyStreet, x, y, maxWidth, lineHeight);
        y = wrapText(
          ctx3,
          companyZipCode + " " + companyCity,
          x,
          y,
          maxWidth,
          lineHeight,
        );

        ctx3.restore();

        const scaledWidth = canvasRef3.current.width * scaleFactor;
        const scaledHeight = canvasRef3.current.height * scaleFactor;
        previewCanvas3Ref.current.width = scaledWidth;
        previewCanvas3Ref.current.height = scaledHeight;
        previewCtx3.scale(scaleFactor, scaleFactor);
        previewCtx3.drawImage(canvasRef3.current, 0, 0);
      }
    }
    if (previewCanvas4Ref.current && canvasRef4.current) {
      const ctx4 = canvasRef4.current.getContext("2d");
      const previewCtx4 = previewCanvas4Ref.current.getContext("2d");

      if (ctx4 && previewCtx4) {
        const img = banderole;
        img.src = "/banderole/path3.png";

        // Set the original canvas to the exact image size
        canvasRef4.current.width = img.width;
        canvasRef4.current.height = img.height;

        // Draw the image exactly on the original canvas
        ctx4.fillRect(0, 0, img.width, img.height);
        ctx4.drawImage(img, 0, 0, img.width, img.height);
        ctx4.restore();
        ctx4.save(); // Save canvas state

        let logoWidth = blLogoTargetWidth;
        let logoHeight =
          (banderoleLogo.height / banderoleLogo.width) * logoWidth;
        if (logoHeight > 554) {
          logoHeight = 554;
          logoWidth = (banderoleLogo.width / banderoleLogo.height) * logoHeight;
        }
        const logoX = (img.width - logoWidth) / 2 + blXPosition;
        const logoY = (img.height - logoHeight) / 2 + blYPosition;
        // Move pivot point to center of logo
        ctx4.translate(logoX + logoWidth / 2, logoY + logoHeight / 2);

        // Rotate around new pivot point
        ctx4.rotate((blRotation * Math.PI) / 180);

        // Draw image centered at the new (0,0) pivot
        ctx4.drawImage(
          banderoleLogo,
          -logoWidth / 2, // Shift left to center the image
          -logoHeight / 2, // Shift up to center the image
          logoWidth,
          logoHeight,
        );

        // Drawing the formatted text
        ctx4.restore();
        ctx4.textAlign = "left";
        ctx4.textBaseline = "top";

        let x = 200;
        let y = 50;
        let maxWidth = 400;
        let lineHeight = 30;

        // Bold Title: "Anleitung:"
        y = wrapText(ctx4, "Anleitung:", x, y, maxWidth, lineHeight, true);

        // Normal Paragraph
        y = wrapText(
          ctx4,
          "Circa 1 Jahr wiederverwendbar. Kein rohes Fleisch, keinen rohen Fisch einwickeln. Vor direkter Sonneneinstrahlung schützen und nicht über 25 Grad lagern.",
          x,
          y,
          maxWidth,
          lineHeight,
        );

        // Add extra space before next section
        y += lineHeight;

        // Bold Title: "Reinigung:"
        y = wrapText(ctx4, "Reinigung:", x, y, maxWidth, lineHeight, true);

        // Normal Paragraph
        y = wrapText(
          ctx4,
          "Unter kaltem Wasser abspülen. Evtl. Bio-Spülmittel, sanft schrubben (kein heißes Wasser). Nicht auf der Heizung trocknen.",
          x,
          y,
          maxWidth,
          lineHeight,
        );

        // Add extra space before next section
        y += lineHeight;

        // Bold Title: "Inhaltsstoffe:"
        y = wrapText(ctx4, "Inhaltsstoffe:", x, y, maxWidth, lineHeight, true);

        // Normal Paragraph
        y = wrapText(
          ctx4,
          "GOTS zertifizierte Biobaumwolle, Kiefernharz aus Portugal, Bienenwachs aus kontrolliert biologischem Anbau (kba).",
          x,
          y,
          maxWidth,
          lineHeight,
        );

        ctx4.restore();

        ctx4.fillStyle = "black";
        ctx4.textAlign = "left";
        ctx4.textBaseline = "bottom";

        x = img.width - 650;
        y = img.height - 110;
        maxWidth = 400;
        lineHeight = 30;

        // Bold title: "Inverkehrbringer:"
        y = wrapText(
          ctx4,
          "Inverkehrbringer:",
          x,
          y,
          maxWidth,
          lineHeight,
          true,
        );

        // Normal text (address)
        y = wrapText(ctx4, companyName, x, y, maxWidth, lineHeight);
        y = wrapText(ctx4, companyStreet, x, y, maxWidth, lineHeight);
        y = wrapText(
          ctx4,
          companyZipCode + " " + companyCity,
          x,
          y,
          maxWidth,
          lineHeight,
        );

        ctx4.restore();

        // Calculate preview size (half screen width while keeping aspect ratio)
        const previewWidth = 4130 * scaleFactor + 30;
        const aspectRatio = previewWidth / img.width;
        const previewHeight = img.height * aspectRatio;

        // Set preview canvas size
        previewCanvas4Ref.current.width = previewWidth;
        previewCanvas4Ref.current.height = previewHeight;

        // Draw the scaled image onto the preview canvas
        previewCtx4.scale(aspectRatio, aspectRatio);
        if (canvasRef4) {
          previewCtx4.drawImage(canvasRef4.current, 0, 0);
        }
      }
    }
  }, [
    scaleFactor,
    canvasRef1,
    canvasRef2,
    canvasRef3,
    canvasRef4,
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
    blLogoTargetWidth,
    blRotation,
    blXPosition,
    blYPosition,
    companyName,
    companyStreet,
    companyZipCode,
    companyCity,
  ]);

  return (
    <>
      <canvas
        className="hidden"
        id="mycanvas1"
        ref={canvasRef1}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      <canvas
        className="hidden"
        id="mycanvas2"
        ref={canvasRef2}
        width={cmToPixel(10)}
        height={canvasSize.height / 2}
      />
      <canvas
        className="hidden"
        id="mycanvas3"
        ref={canvasRef3}
        width={cmToPixel(10)}
        height={canvasSize.height / 2}
      />
      <canvas className="hidden" id="mycanvas4" ref={canvasRef4} />
      <div
        className="coordinate-system-container"
        style={coordinateSystemContainerDivStyle}
      >
        <div className="coordinate-system" style={coordinateSystemDivStyle}>
          <span className="y-label">{height + "cm"}</span>
          <span className="x-label">{width + "cm"}</span>
          <canvas
            id="preview-canvas-1"
            ref={previewCanvas1Ref}
            width={800}
            height={600}
          />
        </div>
      </div>
      <div
        className="coordinate-system-container"
        style={coordinateSystemContainerPackedDivStyle}
      >
        <div
          className="canvas-flex"
          style={{
            display: "flex",
            justifyContent:
              screenWidth < 900 ? "space-between" : "space-evenly",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <span className="packung-tag">Vorderseite</span>
            <div className="coordinate-system" style={coordinateSystemDivStyle}>
              <span className="y-label">{height / 2 + "cm"}</span>
              <span className="x-label">{"10 " + "cm"}</span>
              <canvas
                id="preview-canvas-2"
                ref={previewCanvas2Ref}
                width={800}
                height={600}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <span className="packung-tag">Ruckseite</span>
            <div className="coordinate-system" style={coordinateSystemDivStyle}>
              <span className="y-label">{height / 2 + "cm"}</span>
              <span className="x-label">{"10 " + "cm"}</span>
              <canvas
                id="preview-canvas-3"
                ref={previewCanvas3Ref}
                width={800}
                height={600}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <span className="packung-tag">Banderole</span>
          <canvas
            style={{ position: "initial" }}
            id="preview-canvas-4"
            ref={previewCanvas4Ref}
            width={1200}
            height={400}
          />
        </div>
      </div>
    </>
  );
}
