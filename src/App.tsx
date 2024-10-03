import React, { useState, useRef } from "react";
import Canvas from "./Canvas";
import DownloadCanvas from "./Download";
import convertPdfPageToImage from "./pdf";
import { GlobalWorkerOptions } from "pdfjs-dist";
import { ImageSelector } from "./image-selector";

GlobalWorkerOptions.workerSrc = process.env.PUBLIC_URL + "/pdf.worker.mjs";
function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function getRandomColor() {
  // Generate random values for red, green, and blue components
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Convert the decimal values to hexadecimal and format the color string
  const colorString =
    "#" +
    (r < 16 ? "0" : "") +
    r.toString(16) +
    (g < 16 ? "0" : "") +
    g.toString(16) +
    (b < 16 ? "0" : "") +
    b.toString(16);

  return colorString;
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
};

function App() {
  const [logoTargetWidth, setLogoTargetWidth] = useState(200);
  const [rotation, setRotation] = useState(0);
  const [xlogoPadding, setXLogoPadding] = useState(0);
  const [ylogoPadding, setYLogoPadding] = useState(0);
  const [image, setImage] = useState("");
  const [width, setWidth] = useState(25);
  const [height, setHeight] = useState(25);
  const [x2Offset, setX2Offset] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("#fff");
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSetting, setSelectedSetting] = useState(1)
  const [isToggled, setisToggled] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleNextClick = () => {
    setSelectedSetting(selectedSetting + 1);    
  }
  const handleBackClick = () => {
    setSelectedSetting(selectedSetting - 1);
  }

  const handleToggle = () => {
    !isToggled && setBackgroundColor("#fff");
    !isToggled && setSelectedImage("");
    setisToggled(!isToggled);

  }

  const isNotShow1 = window.screen.width < 900 && selectedSetting !== 1;
  const isNotShow2 = window.screen.width < 900 && selectedSetting !== 2;
  const isNotShow3 = window.screen.width < 900 && selectedSetting !== 3;
  const isNotShow4 = window.screen.width < 900 && selectedSetting !== 4;
  const isNotShow5 = window.screen.width < 900 && selectedSetting !== 5;



  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      if (file.type === "application/pdf") {
        console.log(file);
        try {
          const imageDataUrl = await convertPdfPageToImage(file, 1, 2);
          setImage(imageDataUrl);
        } catch (error) {
          console.error("Error converting PDF to image:", error);
        }
      } else {
        try {
          const imageDataUrl = await readFileAsDataURL(file);
          setImage(imageDataUrl);
        } catch (error) {
          console.error("Error reading file:", error);
        }
      }
    }
  };

  const settings = [
    {
      name: "scale",
      description: "Logogröße",
      value: logoTargetWidth,
      setValue: setLogoTargetWidth,
      min: 1,
      max: 1000,
      unit: "px",
      svg: `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 53.27941094696689 49.331057463361006' width='53.27941094696689' height='49.331057463361006'>
      <!-- svg-source:excalidraw -->
      <defs><style className='style-fonts'></style></defs>
      <g stroke-linecap='round'>
        <g transform='translate(14.529024289613517 24.412275979286846) rotate(37.96558000130607 12.71753012374279 -0.026437913773499133)'>
          <path d='M0 0 C3.48 0.35, 6.97 0.51, 11.86 -0.05 M0 0 C3.56 -0.02, 7.03 -0.22, 11.86 -0.05 M11.86 -0.05 C16.67 -0.1, 23.32 0.51, 25.44 -0.05 M11.86 -0.05 C15.83 -0.01, 19.05 -0.17, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(14.529024289613517 24.412275979286846) rotate(37.96558000130607 12.71753012374279 -0.026437913773499133)'>
          <path d='M5.64 -1.83 C3.77 -1.05, 1.91 -0.39, 0 0 M5.64 -1.83 C3.97 -1.28, 2.26 -0.83, 0 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(14.529024289613517 24.412275979286846) rotate(37.96558000130607 12.71753012374279 -0.026437913773499133)'>
          <path d='M5.5 2.22 C3.69 1.74, 1.87 1.13, 0 0 M5.5 2.22 C3.87 1.57, 2.19 0.81, 0 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(14.529024289613517 24.412275979286846) rotate(37.96558000130607 12.71753012374279 -0.026437913773499133)'>
          <path d='M19.04 2.21 C20.91 1.72, 22.79 1.11, 25.44 -0.05 M19.04 2.21 C20.96 1.54, 22.83 0.75, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(14.529024289613517 24.412275979286846) rotate(37.96558000130607 12.71753012374279 -0.026437913773499133)'>
          <path d='M19.08 -2.43 C20.92 -1.48, 22.79 -0.64, 25.44 -0.05 M19.08 -2.43 C20.99 -1.72, 22.85 -1.12, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
      </g>
      <mask></mask>
      <g stroke-linecap='round' transform='translate(10 10) rotate(0 16.639705473483446 14.665528731680503)'>
        <path d='M7.33 0 C14.58 0.71, 19.11 0.35, 25.95 0 M7.33 0 C11.45 0.61, 16.03 -0.2, 25.95 0 M25.95 0 C31.06 0.9, 33.49 1.22, 33.28 7.33 M25.95 0 C29.11 -1.87, 34.77 0.69, 33.28 7.33 M33.28 7.33 C33.22 11.58, 32.99 16.19, 33.28 22 M33.28 7.33 C33.86 13.42, 33.05 18.84, 33.28 22 M33.28 22 C34.14 26.14, 32.03 30.09, 25.95 29.33 M33.28 22 C31.47 25.51, 31.65 30.65, 25.95 29.33 M25.95 29.33 C17.75 27.79, 10.48 28.68, 7.33 29.33 M25.95 29.33 C19.87 28.28, 12.52 28.85, 7.33 29.33 M7.33 29.33 C1.51 31.24, 1.9 26.83, 0 22 M7.33 29.33 C2.1 29.52, -1.19 27.96, 0 22 M0 22 C-0.64 15.77, -1.09 11.87, 0 7.33 M0 22 C-0.23 18.25, 0.7 13.93, 0 7.33 M0 7.33 C0.21 0.71, 1.12 -1.82, 7.33 0 M0 7.33 C2.08 0.86, 1.08 -2.09, 7.33 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
      </g>
    </svg>`
    },
    {
      name: "rotation",
      description: "Drehung",
      value: rotation,
      setValue: setRotation,
      min: -180,
      max: 180,
      unit: "°",
      svg: `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 31.860144981970734 38.82271959137185' width='31.860144981970734' height='38.82271959137185'>
      <!-- svg-source:excalidraw -->
      
      <defs>
        <style className='style-fonts'>
          
        </style>
        
      </defs>
      <g stroke-linecap='round'>
        <g transform='translate(20.590763902559047 19.672201601018998) rotate(0 -4.456377878640524 -0.1041641577665331)'>
          <path d='M-0.4 -0.32 C-0.37 1.26, 1.66 8.61, 0.02 9.11 C-1.61 9.61, -10.38 5.64, -10.19 2.68 C-10 -0.29, -0.79 -6.65, 1.16 -8.69 M0.4 0.71 C0.39 2.15, 1.54 8.11, -0.3 8.29 C-2.13 8.47, -10.85 4.8, -10.59 1.8 C-10.32 -1.19, -0.67 -7.77, 1.27 -9.67' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(20.590763902559047 19.672201601018998) rotate(0 -4.456377878640524 -0.1041641577665331)'>
          <path d='M-2.81 -2.81 C-1.9 -4.51, -0.35 -6.62, 1.27 -9.67 M-2.81 -2.81 C-1.17 -5.54, 0.36 -7.86, 1.27 -9.67' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(20.590763902559047 19.672201601018998) rotate(0 -4.456377878640524 -0.1041641577665331)'>
          <path d='M-6.27 -7.04 C-4.43 -7.57, -1.93 -8.52, 1.27 -9.67 M-6.27 -7.04 C-3.35 -8.22, -0.55 -8.98, 1.27 -9.67' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
      </g>
      <mask></mask>
    </svg>`
    
    },
    {
      name: "x2Offset",
      description: "Logo-Versatz",
      value: x2Offset,
      setValue: setX2Offset,
      min: -1000,
      max: 1000,
      unit: "px",
      svg: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68.36000774271815 40.31107345304474" width="68.36000774271815" height="40.31107345304474">
      <!-- svg-source:excalidraw -->
      
      <defs>
        <style className="style-fonts">
          
        </style>
        
      </defs>
      <g stroke-linecap="round" transform="translate(18.603641184388835 18.02673508751218) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2.29 -0.04, 3.55 0.1, 4.33 0 M1.16 0 C2.09 -0.04, 3.11 0.01, 4.33 0 M4.33 0 C4.76 0.57, 5.79 1.01, 5.49 1.16 M4.33 0 C5.27 0.17, 6.2 0.91, 5.49 1.16 M5.49 1.16 C5.46 1.71, 5.45 2.05, 5.49 3.49 M5.49 1.16 C5.5 2.07, 5.53 3.03, 5.49 3.49 M5.49 3.49 C5.44 4.89, 4.89 4.91, 4.33 4.65 M5.49 3.49 C6.05 4.3, 4.39 4.7, 4.33 4.65 M4.33 4.65 C3.45 4.58, 2.84 4.65, 1.16 4.65 M4.33 4.65 C3.6 4.61, 2.8 4.64, 1.16 4.65 M1.16 4.65 C0.13 4.08, 0.09 3.73, 0 3.49 M1.16 4.65 C1.14 4.1, 0.63 4.18, 0 3.49 M0 3.49 C0.06 2.82, -0.05 2.27, 0 1.16 M0 3.49 C0.01 2.72, -0.04 2.04, 0 1.16 M0 1.16 C-0.05 0.6, 0.25 -0.41, 1.16 0 M0 1.16 C0.37 -0.25, 0.51 0.53, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(23.46578348715775 25.653161054469138) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2.34 0.07, 3.73 0.02, 4.33 0 M1.16 0 C2.4 -0.02, 3.69 0.02, 4.33 0 M4.33 0 C5.31 -0.37, 5.58 0.23, 5.49 1.16 M4.33 0 C4.9 0.22, 6.09 0.58, 5.49 1.16 M5.49 1.16 C5.51 1.93, 5.53 2.72, 5.49 3.49 M5.49 1.16 C5.52 1.88, 5.53 2.63, 5.49 3.49 M5.49 3.49 C5.49 4.22, 5.31 4.4, 4.33 4.65 M5.49 3.49 C4.97 4.03, 5.77 4.83, 4.33 4.65 M4.33 4.65 C3.29 4.73, 2.05 4.74, 1.16 4.65 M4.33 4.65 C3.47 4.6, 2.63 4.66, 1.16 4.65 M1.16 4.65 C0.88 4.73, -0.39 3.63, 0 3.49 M1.16 4.65 C0.14 5.34, 0.28 4.88, 0 3.49 M0 3.49 C-0.03 2.63, 0.03 1.94, 0 1.16 M0 3.49 C0 2.78, 0.03 2.05, 0 1.16 M0 1.16 C-0.14 0.24, -0.2 0.13, 1.16 0 M0 1.16 C-0.13 0.77, 0.82 -0.72, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(23.75189949908281 10.25665418887624) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C1.86 0.06, 2.62 0, 4.33 0 M1.16 0 C2.41 0.02, 3.7 -0.01, 4.33 0 M4.33 0 C4.59 -0.1, 5.32 0.54, 5.49 1.16 M4.33 0 C4.97 0.38, 4.74 0.34, 5.49 1.16 M5.49 1.16 C5.48 1.99, 5.55 2.72, 5.49 3.49 M5.49 1.16 C5.47 2.03, 5.5 2.95, 5.49 3.49 M5.49 3.49 C5.67 4.39, 4.47 5.06, 4.33 4.65 M5.49 3.49 C5.87 4.74, 5.8 4.86, 4.33 4.65 M4.33 4.65 C3.3 4.54, 2.1 4.61, 1.16 4.65 M4.33 4.65 C3.15 4.67, 2.04 4.62, 1.16 4.65 M1.16 4.65 C0.31 4.1, 0.17 3.72, 0 3.49 M1.16 4.65 C-0.06 5.16, 0.44 3.66, 0 3.49 M0 3.49 C0.03 2.96, 0.04 2.38, 0 1.16 M0 3.49 C-0.03 2.88, -0.05 2.26, 0 1.16 M0 1.16 C0.33 0.96, -0.23 0.33, 1.16 0 M0 1.16 C-0.3 0.82, 0.7 -0.74, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(28.85713384865221 18.0376193926125) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2.43 0.03, 3.62 -0.1, 4.33 0 M1.16 0 C1.9 -0.05, 2.58 -0.03, 4.33 0 M4.33 0 C4.79 -0.49, 4.94 0.34, 5.49 1.16 M4.33 0 C5.63 0.59, 5.82 0.95, 5.49 1.16 M5.49 1.16 C5.43 1.97, 5.41 2.68, 5.49 3.49 M5.49 1.16 C5.52 1.72, 5.45 2.22, 5.49 3.49 M5.49 3.49 C5.95 4.78, 4.5 4.48, 4.33 4.65 M5.49 3.49 C5.7 4, 5.61 5.26, 4.33 4.65 M4.33 4.65 C3.06 4.64, 1.82 4.64, 1.16 4.65 M4.33 4.65 C3.48 4.65, 2.59 4.67, 1.16 4.65 M1.16 4.65 C0.58 4.91, -0.06 3.65, 0 3.49 M1.16 4.65 C-0.16 5.03, -0.62 3.59, 0 3.49 M0 3.49 C-0.01 3.02, 0.04 2.45, 0 1.16 M0 3.49 C0.03 2.65, 0.03 1.88, 0 1.16 M0 1.16 C0.41 0.82, 0.06 0.37, 1.16 0 M0 1.16 C-0.5 1.11, -0.09 -0.54, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(33.76594587562295 25.664045359569485) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2.46 0.1, 3.64 0.11, 4.33 0 M1.16 0 C2.14 0.03, 3.19 0.02, 4.33 0 M4.33 0 C4.73 0.09, 5.33 0.21, 5.49 1.16 M4.33 0 C5.32 0.6, 5.68 0.54, 5.49 1.16 M5.49 1.16 C5.51 2.06, 5.56 2.89, 5.49 3.49 M5.49 1.16 C5.46 2.07, 5.47 2.9, 5.49 3.49 M5.49 3.49 C5.45 4.47, 4.86 4.19, 4.33 4.65 M5.49 3.49 C5.26 4.92, 5.29 5.03, 4.33 4.65 M4.33 4.65 C3.55 4.59, 2.69 4.62, 1.16 4.65 M4.33 4.65 C3.18 4.62, 2.14 4.68, 1.16 4.65 M1.16 4.65 C0.47 4.26, -0.63 4.05, 0 3.49 M1.16 4.65 C1.08 4.92, 0.62 4.6, 0 3.49 M0 3.49 C-0.05 2.63, 0.05 1.71, 0 1.16 M0 3.49 C0.03 3.04, 0.03 2.54, 0 1.16 M0 1.16 C-0.15 -0.2, 0.51 -0.12, 1.16 0 M0 1.16 C0.38 0.82, -0.33 0.41, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(34.052460774078554 10.244801961673744) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2.38 0, 3.5 0.1, 4.33 0 M1.16 0 C2.08 0.03, 2.93 -0.04, 4.33 0 M4.33 0 C5.01 -0.17, 5.65 0.27, 5.49 1.16 M4.33 0 C5.48 -0.75, 5.44 0.64, 5.49 1.16 M5.49 1.16 C5.54 2.11, 5.5 3.01, 5.49 3.49 M5.49 1.16 C5.45 1.84, 5.46 2.51, 5.49 3.49 M5.49 3.49 C5.62 3.62, 5.52 4.98, 4.33 4.65 M5.49 3.49 C5.97 4.95, 5.32 5.09, 4.33 4.65 M4.33 4.65 C3.59 4.69, 3.02 4.72, 1.16 4.65 M4.33 4.65 C3.23 4.64, 2.05 4.63, 1.16 4.65 M1.16 4.65 C-0.16 4.82, -0.54 3.87, 0 3.49 M1.16 4.65 C0.9 5.09, -0.6 3.87, 0 3.49 M0 3.49 C0.06 2.77, 0.05 1.95, 0 1.16 M0 3.49 C0.03 2.53, 0.03 1.68, 0 1.16 M0 1.16 C0.58 -0.23, 0.71 -0.26, 1.16 0 M0 1.16 C0.43 0.7, -0.35 0.69, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(39.641544486513794 17.792817430938754) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2 0.09, 2.83 0.09, 4.33 0 M1.16 0 C2.19 -0.04, 3.14 -0.03, 4.33 0 M4.33 0 C5.37 0.31, 6.01 0, 5.49 1.16 M4.33 0 C5.77 0.7, 6.23 -0.17, 5.49 1.16 M5.49 1.16 C5.53 1.7, 5.44 2.19, 5.49 3.49 M5.49 1.16 C5.5 2.01, 5.51 2.89, 5.49 3.49 M5.49 3.49 C6.07 4.42, 4.57 4.79, 4.33 4.65 M5.49 3.49 C5.77 4.19, 5.36 3.93, 4.33 4.65 M4.33 4.65 C3.59 4.62, 3 4.68, 1.16 4.65 M4.33 4.65 C3.32 4.61, 2.26 4.65, 1.16 4.65 M1.16 4.65 C-0.18 4.42, 0.02 3.93, 0 3.49 M1.16 4.65 C-0.1 4.78, -0.33 4.98, 0 3.49 M0 3.49 C-0.02 2.81, -0.05 2.23, 0 1.16 M0 3.49 C-0.04 2.91, -0.02 2.39, 0 1.16 M0 1.16 C0.06 0.49, 0.41 -0.24, 1.16 0 M0 1.16 C-0.42 1.12, 0.42 -0.67, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(44.50368678928362 25.39610797906127) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C2.23 0.01, 3.22 0.01, 4.33 0 M1.16 0 C1.93 0.02, 2.66 -0.02, 4.33 0 M4.33 0 C5.2 -0.16, 5.31 0.58, 5.49 1.16 M4.33 0 C5.7 0.19, 5.65 0.92, 5.49 1.16 M5.49 1.16 C5.53 1.83, 5.51 2.41, 5.49 3.49 M5.49 1.16 C5.53 1.97, 5.5 2.84, 5.49 3.49 M5.49 3.49 C5.7 4.01, 4.65 4.45, 4.33 4.65 M5.49 3.49 C6.15 4.44, 5.49 4.42, 4.33 4.65 M4.33 4.65 C3.06 4.73, 1.88 4.7, 1.16 4.65 M4.33 4.65 C3.26 4.65, 2.27 4.64, 1.16 4.65 M1.16 4.65 C0 4.02, -0.21 4.87, 0 3.49 M1.16 4.65 C0.66 5.27, 0.34 4.91, 0 3.49 M0 3.49 C0.04 2.76, 0.01 1.85, 0 1.16 M0 3.49 C0.02 2.94, -0.01 2.32, 0 1.16 M0 1.16 C-0.59 0.51, 0.27 0.33, 1.16 0 M0 1.16 C0.43 -0.33, 0.8 -0.19, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round" transform="translate(44.83687141194059 10) rotate(0 2.7451371106692477 2.3235140467376283)"><path d="M1.16 0 C1.84 -0.01, 2.63 -0.02, 4.33 0 M1.16 0 C2.04 -0.02, 2.83 -0.01, 4.33 0 M4.33 0 C4.94 0.16, 5.37 0.72, 5.49 1.16 M4.33 0 C4.35 -0.05, 5.74 1.03, 5.49 1.16 M5.49 1.16 C5.55 1.84, 5.56 2.5, 5.49 3.49 M5.49 1.16 C5.49 1.7, 5.5 2.29, 5.49 3.49 M5.49 3.49 C4.85 4.67, 5.43 5.07, 4.33 4.65 M5.49 3.49 C6.18 4.47, 5.54 3.89, 4.33 4.65 M4.33 4.65 C3.57 4.6, 2.81 4.7, 1.16 4.65 M4.33 4.65 C3.39 4.63, 2.45 4.61, 1.16 4.65 M1.16 4.65 C0.56 4.11, -0.39 4.71, 0 3.49 M1.16 4.65 C0.83 4.05, -0.39 4.46, 0 3.49 M0 3.49 C0.04 2.79, -0.03 2.06, 0 1.16 M0 3.49 C-0.03 2.91, 0.02 2.31, 0 1.16 M0 1.16 C-0.61 0.71, 0.13 0.38, 1.16 0 M0 1.16 C0.31 -0.35, 1.08 0.11, 1.16 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g><g stroke-linecap="round"><g transform="translate(53.018712110876095 16.83859369089808) rotate(180 2.506788690172243 1.6741845039072984)"><path d="M-0.1 -0.23 C0.83 0.34, 4.55 2.62, 5.36 3.21 M0.5 0.42 C1.43 1.06, 4.43 3.04, 5.26 3.6" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g></g><mask></mask><g stroke-linecap="round"><g transform="translate(53.23118444021111 23.522093930575437) rotate(180 2.448307834227535 -1.3744361166927632)"><path d="M-0.23 0.35 C0.6 -0.13, 3.91 -2.5, 4.76 -3 M0.29 0.22 C1.09 -0.22, 3.68 -2.27, 4.42 -2.68" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g></g><mask></mask><g stroke-linecap="round"><g transform="translate(10.312623261544104 20.512902065931144) rotate(0 2.506788690172243 1.6741845039072984)"><path d="M0.08 0.16 C0.95 0.76, 4.27 2.8, 5.06 3.3 M-0.31 -0.06 C0.54 0.61, 3.83 3.15, 4.8 3.72" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g></g><mask></mask><g stroke-linecap="round"><g transform="translate(10.180113087814789 20.473285235574338) rotate(0 2.448307834227535 -1.3744361166927632)"><path d="M0.16 0.04 C1.02 -0.46, 4.09 -2.46, 4.84 -2.96 M-0.18 -0.24 C0.64 -0.71, 3.61 -2.22, 4.54 -2.61" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g></g><mask></mask><g stroke-linecap="round"><g transform="translate(10.630863045164915 20.436192068938738) rotate(0 22.8904061940475 0)"><path d="M0 0 C7.63 0, 38.15 0, 45.78 0 M0 0 C7.63 0, 38.15 0, 45.78 0" stroke="#1e1e1e" stroke-width="1" fill="none"></path></g></g><mask></mask></svg>`
    },
    {
      name: "xLogoPadding",
      description: "Logo-Abstand-X",
      value: xlogoPadding,
      setValue: setXLogoPadding,
      min: -500,
      max: 500,
      unit: "px",
      svg: `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 57.26285757737014 27.85082748263298' width='57.26285757737014' height='27.85082748263298'>
      <!-- svg-source:excalidraw -->
      
      <defs>
        <style className='style-fonts'>
          
        </style>
        
      </defs>
      <g stroke-linecap='round'><g transform='translate(21.463545440502003 13.699218072333167) rotate(0 7.167883348182386 -0.027110892106982476)'><path d='M0 -0.01 C1.8 -0.03, 3.95 -0.23, 6.69 -0.04 M0 -0.01 C1.43 0.15, 2.82 -0.06, 6.69 -0.04 M6.69 -0.04 C8.98 -0.36, 12.14 0.09, 14.34 -0.04 M6.69 -0.04 C8.65 -0.26, 10.94 0.08, 14.34 -0.04' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(21.463545440502003 13.699218072333167) rotate(0 7.167883348182386 -0.027110892106982476)'><path d='M3.11 -1.23 C2.23 -0.9, 1.53 -0.65, 0 -0.01 M3.11 -1.23 C2.48 -0.92, 1.82 -0.76, 0 -0.01' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(21.463545440502003 13.699218072333167) rotate(0 7.167883348182386 -0.027110892106982476)'><path d='M3.17 1.05 C2.28 0.76, 1.57 0.38, 0 -0.01 M3.17 1.05 C2.51 0.89, 1.84 0.57, 0 -0.01' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(21.463545440502003 13.699218072333167) rotate(0 7.167883348182386 -0.027110892106982476)'><path d='M10.75 1.29 C11.71 0.91, 12.88 0.44, 14.34 -0.04 M10.75 1.29 C11.51 1.1, 12.25 0.71, 14.34 -0.04' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(21.463545440502003 13.699218072333167) rotate(0 7.167883348182386 -0.027110892106982476)'><path d='M10.73 -1.33 C11.7 -0.98, 12.87 -0.74, 14.34 -0.04 M10.73 -1.33 C11.51 -0.96, 12.26 -0.81, 14.34 -0.04' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g></g><mask></mask><g stroke-linecap='round' transform='translate(10 10) rotate(0 4.593316018617088 3.8878328695794053)'><path d='M1.94 0 C4.09 -0.16, 6.24 0.03, 7.24 0 M1.94 0 C3.77 0.06, 5.53 -0.03, 7.24 0 M7.24 0 C9.16 0.12, 8.83 0.64, 9.19 1.94 M7.24 0 C8.79 -0.71, 9.67 0.39, 9.19 1.94 M9.19 1.94 C9.25 2.83, 9.13 3.87, 9.19 5.83 M9.19 1.94 C9.17 3.14, 9.21 4.4, 9.19 5.83 M9.19 5.83 C8.75 7.04, 8.84 7.83, 7.24 7.78 M9.19 5.83 C9.9 6.75, 9.17 7.72, 7.24 7.78 M7.24 7.78 C5.16 7.73, 3.37 7.81, 1.94 7.78 M7.24 7.78 C5.09 7.73, 3.07 7.79, 1.94 7.78 M1.94 7.78 C-0.02 8.18, -0.27 7.08, 0 5.83 M1.94 7.78 C0.4 7.4, 0.28 6.73, 0 5.83 M0 5.83 C-0.02 4.76, -0.11 3.68, 0 1.94 M0 5.83 C-0.01 4.9, 0.02 4.07, 0 1.94 M0 1.94 C0.64 1.16, 0.57 0.47, 1.94 0 M0 1.94 C-0.38 0.62, 0.85 -0.09, 1.94 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g stroke-linecap='round' transform='translate(38.076225540135965 10.075161743474169) rotate(0 4.593316018617088 3.8878328695794053)'><path d='M1.94 0 C3.59 0.07, 5.59 0.06, 7.24 0 M1.94 0 C3.11 -0.01, 4.14 0.07, 7.24 0 M7.24 0 C8.66 -0.36, 9.18 0.87, 9.19 1.94 M7.24 0 C7.83 0.49, 8.93 0.25, 9.19 1.94 M9.19 1.94 C9.11 2.82, 9.18 3.82, 9.19 5.83 M9.19 1.94 C9.15 2.87, 9.17 3.7, 9.19 5.83 M9.19 5.83 C9.1 7.42, 8.59 8.4, 7.24 7.78 M9.19 5.83 C8.8 7.76, 8.48 8.32, 7.24 7.78 M7.24 7.78 C5.11 7.83, 3.1 7.93, 1.94 7.78 M7.24 7.78 C5.36 7.78, 3.57 7.68, 1.94 7.78 M1.94 7.78 C1.05 7.5, -0.05 6.91, 0 5.83 M1.94 7.78 C0.27 8.05, -0.4 7.07, 0 5.83 M0 5.83 C0.07 4.45, 0.12 3.2, 0 1.94 M0 5.83 C-0.06 4.58, 0 3.34, 0 1.94 M0 1.94 C0.51 0.57, 1.12 -0.33, 1.94 0 M0 1.94 C-0.02 0.85, 0.55 0.2, 1.94 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g></svg>`
    },
    {
      name: "yLogoPadding",
      description: "Logo-Abstand-Y",
      value: ylogoPadding,
      setValue: setYLogoPadding,
      min: -500,
      max: 500,
      unit: "px",
      svg: `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28.140650071594337 52.12083889936957' width='28.140650071594337' height='52.12083889936957'>
      <!-- svg-source:excalidraw -->
      
      <defs>
        <style className='style-fonts'>
          
        </style>
        
      </defs>
      <g stroke-linecap='round' transform='translate(10 10) rotate(0 4.070325035796714 3.445167586968253)'><path d='M1.72 0 C3.17 0.16, 4.4 0.13, 6.42 0 M1.72 0 C2.9 0.03, 4.07 -0.04, 6.42 0 M6.42 0 C8.05 0.35, 8.2 0.79, 8.14 1.72 M6.42 0 C6.81 0.28, 8.7 0.28, 8.14 1.72 M8.14 1.72 C8.09 2.53, 8.07 3.59, 8.14 5.17 M8.14 1.72 C8.19 2.7, 8.13 3.78, 8.14 5.17 M8.14 5.17 C8.78 6.26, 7.68 6.48, 6.42 6.89 M8.14 5.17 C7.85 6.78, 7.6 6.17, 6.42 6.89 M6.42 6.89 C5.2 7.04, 3.88 6.76, 1.72 6.89 M6.42 6.89 C5.4 6.92, 4.29 6.85, 1.72 6.89 M1.72 6.89 C-0.04 6.58, -0.22 6.25, 0 5.17 M1.72 6.89 C0.27 7.23, -0.07 5.85, 0 5.17 M0 5.17 C-0.11 4.29, -0.11 3.29, 0 1.72 M0 5.17 C0.05 4.32, 0.05 3.44, 0 1.72 M0 1.72 C0.52 -0.09, 0.26 0.04, 1.72 0 M0 1.72 C0.05 1.13, 0.99 0.1, 1.72 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g stroke-linecap='round' transform='translate(10.00000000000091 35.23050372543307) rotate(0 4.070325035796714 3.445167586968253)'><path d='M1.72 0 C3.07 0.07, 4.16 0.02, 6.42 0 M1.72 0 C3.43 0.06, 4.98 0.02, 6.42 0 M6.42 0 C7.48 -0.56, 8.26 0.04, 8.14 1.72 M6.42 0 C7.51 0.41, 8.44 1.15, 8.14 1.72 M8.14 1.72 C8.15 2.62, 8.06 3.66, 8.14 5.17 M8.14 1.72 C8.16 3.14, 8.15 4.41, 8.14 5.17 M8.14 5.17 C7.86 6.34, 7.87 7.5, 6.42 6.89 M8.14 5.17 C7.86 6.29, 7.4 6.45, 6.42 6.89 M6.42 6.89 C4.5 6.84, 2.8 6.83, 1.72 6.89 M6.42 6.89 C5.48 6.88, 4.5 6.91, 1.72 6.89 M1.72 6.89 C1.23 6.89, -0.54 6.93, 0 5.17 M1.72 6.89 C0.29 6.26, -0.67 6.22, 0 5.17 M0 5.17 C0.05 4.05, -0.09 2.95, 0 1.72 M0 5.17 C0.05 4.22, 0.03 3.39, 0 1.72 M0 1.72 C-0.18 0.5, 0.67 -0.2, 1.72 0 M0 1.72 C0.52 0.88, -0.08 0.09, 1.72 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g stroke-linecap='round'><g transform='translate(7.686802260664081 25.93133113390286) rotate(89.99999999999994 6.3517543594921335 -0.024024069417080796)'><path d='M0 -0.01 C2.01 0.04, 4.35 -0.26, 5.92 -0.04 M0 -0.01 C1.31 -0.06, 2.76 0.1, 5.92 -0.04 M5.92 -0.04 C7.59 0.19, 9.1 -0.39, 12.7 -0.04 M5.92 -0.04 C8.33 0.04, 10.71 -0.19, 12.7 -0.04' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(7.686802260664081 25.93133113390286) rotate(89.99999999999994 6.3517543594921335 -0.024024069417080796)'><path d='M2.76 -1.09 C1.63 -0.65, 0.67 -0.39, 0 -0.01 M2.76 -1.09 C2.08 -0.86, 1.47 -0.52, 0 -0.01' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(7.686802260664081 25.93133113390286) rotate(89.99999999999994 6.3517543594921335 -0.024024069417080796)'><path d='M2.81 0.93 C1.66 0.62, 0.68 0.12, 0 -0.01 M2.81 0.93 C2.11 0.69, 1.49 0.55, 0 -0.01' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(7.686802260664081 25.93133113390286) rotate(89.99999999999994 6.3517543594921335 -0.024024069417080796)'><path d='M9.49 1.03 C10.57 0.67, 11.85 0.11, 12.7 -0.04 M9.49 1.03 C10.19 0.76, 10.98 0.6, 12.7 -0.04' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g><g transform='translate(7.686802260664081 25.93133113390286) rotate(89.99999999999994 6.3517543594921335 -0.024024069417080796)'><path d='M9.55 -1.28 C10.61 -0.79, 11.87 -0.48, 12.7 -0.04 M9.55 -1.28 C10.25 -1.02, 11.03 -0.63, 12.7 -0.04' stroke='#1e1e1e' stroke-width='1' fill='none'></path></g></g><mask></mask></svg>`
    },
    {
      name: "width",
      description: "Breite",
      value: width,
      setValue: setWidth,
      min: 18,
      max: 35,
      unit: "cm",
      svg: `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 45.43506024748558 20.364185039134043' width='45.43506024748558' height='20.364185039134043'>
      <defs>
        <style className='style-fonts'>
        </style>
      </defs>
      <g stroke-linecap='round'>
        <g transform='translate(10 10.181775411953183) rotate(0 12.71753012374279 -0.026437913773499133)'>
          <path d='M0 0 C3.21 0.51, 6.32 -0.24, 11.86 -0.05 M0 0 C3.99 0.2, 7.71 -0.24, 11.86 -0.05 M11.86 -0.05 C16.57 0.06, 20.78 -0.13, 25.44 -0.05 M11.86 -0.05 C16.51 -0.21, 20.81 -0.24, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(10 10.181775411953183) rotate(0 12.71753012374279 -0.026437913773499133)'>
          <path d='M5.57 -2.05 C4.32 -1.27, 3.02 -1.13, 0 0 M5.57 -2.05 C3.74 -1.29, 1.77 -0.83, 0 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(10 10.181775411953183) rotate(0 12.71753012374279 -0.026437913773499133)'>
          <path d='M5.58 2.01 C4.32 1.78, 3.02 0.91, 0 0 M5.58 2.01 C3.74 1.41, 1.77 0.53, 0 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(10 10.181775411953183) rotate(0 12.71753012374279 -0.026437913773499133)'>
          <path d='M19 2.09 C20.74 1.86, 22.44 0.9, 25.44 -0.05 M19 2.09 C21.16 1.5, 23.18 0.54, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(10 10.181775411953183) rotate(0 12.71753012374279 -0.026437913773499133)'>
          <path d='M19.12 -2.55 C20.84 -1.63, 22.51 -1.43, 25.44 -0.05 M19.12 -2.55 C21.25 -1.59, 23.22 -1.01, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
      </g>
      <mask></mask>
    </svg>`
    },
    {
      name: "height",
      description: "Länge",
      value: height,
      setValue: setHeight,
      min: 18,
      max: 35,
      unit: "cm",
      svg: `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20.364185039133645 45.43506024748558' width='20.364185039133645' height='45.43506024748558'>
      <!-- svg-source:excalidraw -->
      
      <defs>
        <style className='style-fonts'>
          
        </style>
        
      </defs>
      <g stroke-linecap='round'>
        <g transform='translate(-2.562192625563057 22.74396803751651) rotate(270 12.71753012374279 -0.026437913773499133)'>
          <path d='M0 0 C3.21 0.51, 6.32 -0.24, 11.86 -0.05 M0 0 C3.99 0.2, 7.71 -0.24, 11.86 -0.05 M11.86 -0.05 C16.57 0.06, 20.78 -0.13, 25.44 -0.05 M11.86 -0.05 C16.51 -0.21, 20.81 -0.24, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(-2.562192625563057 22.74396803751651) rotate(270 12.71753012374279 -0.026437913773499133)'>
          <path d='M5.57 -2.05 C4.32 -1.27, 3.02 -1.13, 0 0 M5.57 -2.05 C3.74 -1.29, 1.77 -0.83, 0 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(-2.562192625563057 22.74396803751651) rotate(270 12.71753012374279 -0.026437913773499133)'>
          <path d='M5.58 2.01 C4.32 1.78, 3.02 0.91, 0 0 M5.58 2.01 C3.74 1.41, 1.77 0.53, 0 0' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(-2.562192625563057 22.74396803751651) rotate(270 12.71753012374279 -0.026437913773499133)'>
          <path d='M19 2.09 C20.74 1.86, 22.44 0.9, 25.44 -0.05 M19 2.09 C21.16 1.5, 23.18 0.54, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
        <g transform='translate(-2.562192625563057 22.74396803751651) rotate(270 12.71753012374279 -0.026437913773499133)'>
          <path d='M19.12 -2.55 C20.84 -1.63, 22.51 -1.43, 25.44 -0.05 M19.12 -2.55 C21.25 -1.59, 23.22 -1.01, 25.44 -0.05' stroke='#1e1e1e' stroke-width='1' fill='none'></path>
        </g>
      </g>
      <mask></mask>
    </svg>
    `
    },
  ];

  function makeRand() {
    setLogoTargetWidth(getRandomInt(100, 1000));
    setRotation(getRandomInt(-45, 45));
    setX2Offset(getRandomInt(-100, 100));
    setXLogoPadding(getRandomInt(0, 200));
    setYLogoPadding(getRandomInt(0, 200));
  }
  function makeBgColorRand() {
    setBackgroundColor(getRandomColor());
  }

  const img1 = require("./backgrounds/Design_01.png");
  const img2 = require("./backgrounds/Design_02.png");
  const img6 = require("./backgrounds/Design_06.png");
  const img7 = require("./backgrounds/Design_07.png");
  const img8 = require("./backgrounds/Design_08.png");
  const img11 = require("./backgrounds/Design_11.png");
  const img13 = require("./backgrounds/Design_13.png");
  const img14 = require("./backgrounds/Design_14.png");
  const images = [img1, img2, img6, img7, img8, img11, img13, img14];

  return (
    <>
    <section className="interfase">
      <div className="interfase-flex">
        <div className="settings">
          <div className="mobileSettingsbuttons">
            <button onClick={handleBackClick} className={isNotShow1 ? '' : 'not-show-button'}>
            <div className="slider-button left-arrow"></div>
            </button>
            <button onClick={handleNextClick} className={isNotShow5 ? '' : 'not-show-button'}>
              <div className="slider-button right-arrow"></div>    
            </button>
          </div>

         <div className={`setting-group-container upload-setting-group-container ${isNotShow1 ? 'not-show' : ''}`}>
            <div className="subtitle">
              <h3>1. Datei hochladen</h3>
            </div>
            <div className="logo-upload">
              <input
              className="input-btn"
              id="selectFile"
              type="file"
              onChange={handleImageUpload}
              accept="image/*, application/pdf"
              />
            </div>
         </div>
          <div className={`setting-group-container ${isNotShow2 ? 'not-show' : ''}`}>
            <div className="subtitle">
              <h3>2. Hintergrund auswählen</h3>
            </div>
            <div className="toggleDiv">
              <label htmlFor="hintergrundToggle">
              Kein Hintergrund
              </label>
              <label className="switch">
                <input 
                  id="hintergrundToggle"
                  type="checkbox"
                  onClick={handleToggle}/>
                <span className="slider round"></span>
              </label>        
            </div>      
            <div className={`setting-group background-settings ${isToggled && 'not-show'}`}>
              <div>
                <div className="color-picker-flex">
                  <label htmlFor="colorPicker">
                    Hintergrundfarbe
                  </label>
                  <input
                    id="colorPicker"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                </div>  
              </div>
              <div className="image-selector">
                <ImageSelector
                  images={images}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                />
              </div>
              <button
                className="zufall-btn text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
                onClick={makeBgColorRand}
              >
                Zufall
              </button>     
            </div>
          </div>   
              <div className={`setting-group-container setting-group-container ${isNotShow3 ? 'not-show' : ''}`}>
                <div className="subtitle">
                  <h3>3. Tuchgröße festlegen</h3>
                </div>                
                <div className="setting-group">
                  {[settings[5],settings[6]].map((setting) => (
                    <div className="setting" key={setting.name}>
                      <div className="setting-label">
                        <label htmlFor={setting.name}>{setting.description}</label>
                        <div
                        className="setting-svg"
                        dangerouslySetInnerHTML={{ __html: setting.svg || '' }} 
                      >
                      </div>
                      </div>
                      <input
                        className="range-input"
                        value={setting.value}
                        onChange={(e) => setting.setValue(parseInt(e.target.value))}
                        type="range"
                        id={setting.name}
                        name={setting.name}
                        min={setting.min}
                        max={setting.max}
                      />
                      <input
                        className="number-input"
                        type="number"
                        value={setting.value}
                        onChange={(e) => setting.setValue(parseInt(e.target.value))}
                        min={setting.min}
                        max={setting.max}
                      />
                      <div className="px-2.5 unit">{setting.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            <div className={`setting-group-container setting-group-container ${isNotShow4 ? 'not-show' : ''}`}>
              <div className="subtitle">
                <h3>4. Gestaltung</h3>
              </div>
              <div className="setting-group">
                {settings.slice(0,5).map((setting) => (
                  <div className="setting" key={setting.name}>
                    <div className="setting-label">
                      <label htmlFor={setting.name}>{setting.description}</label>
                      <div
                        className="setting-svg"
                        dangerouslySetInnerHTML={{ __html: setting.svg || '' }} 
                      >
                      </div>
                    </div>
                    <input
                      className="range-input"
                      value={setting.value}
                      onChange={(e) => setting.setValue(parseInt(e.target.value))}
                      type="range"
                      id={setting.name}
                      name={setting.name}
                      min={setting.min}
                      max={setting.max}
                    />
                    <input
                      className="number-input"
                      type="number"
                      value={setting.value}
                      onChange={(e) => setting.setValue(parseInt(e.target.value))}
                      min={setting.min}
                      max={setting.max}
                    />
                    <div className="px-2.5 unit">{setting.unit}</div>
                  </div>
                ))}
              </div>
              <button
                className="zufall-btn text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
                onClick={makeRand}
              >
                Zufall
              </button>     
            </div>
            <div className={`setting-group-container last-setting-group-container ${isNotShow5 ? 'not-show' : ''}`}>
              <div className="download-div">
                <div className="subtitle">
                  <h3>5. Download</h3>
                </div>
              <DownloadCanvas canvasRef={canvasRef}/>
              </div>
            </div>
        </div>
        <div className="canvas-div-container">
          <div className="subtitle">
            <h3>Streudruckersteller Design-Vorschau</h3>
          </div>
              <Canvas
              image={image}
              width={width}
              height={height}
              rotation={rotation}
              logoTargetWidth={logoTargetWidth}
              backgroundColor={backgroundColor}
              xGap={xlogoPadding}
              yGap={ylogoPadding}
              x2Offset={x2Offset}
              backgroundImage={selectedImage ? selectedImage : undefined}
              canvasRef={canvasRef}/>
        </div>
      </div>          
    </section>
    </>
  );
}

export default App;
