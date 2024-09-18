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

  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    },
    {
      name: "rotation",
      description: "Drehung",
      value: rotation,
      setValue: setRotation,
      min: -180,
      max: 180,
      unit: "°",
    },
    {
      name: "x2Offset",
      description: "Logo-Versatz",
      value: x2Offset,
      setValue: setX2Offset,
      min: -1000,
      max: 1000,
      unit: "px",
    },
    {
      name: "xLogoPadding",
      description: "Logo-Abstand-X",
      value: xlogoPadding,
      setValue: setXLogoPadding,
      min: -500,
      max: 500,
      unit: "px",
    },
    {
      name: "yLogoPadding",
      description: "Logo-Abstand-Y",
      value: ylogoPadding,
      setValue: setYLogoPadding,
      min: -500,
      max: 500,
      unit: "px",
    },
    {
      name: "width",
      description: "Breite",
      value: width,
      setValue: setWidth,
      min: 18,
      max: 35,
      unit: "cm",
    },
    {
      name: "height",
      description: "Länge",
      value: height,
      setValue: setHeight,
      min: 18,
      max: 35,
      unit: "cm",
    },
  ];

  function makeRand() {
    setLogoTargetWidth(getRandomInt(100, 1000));
    setRotation(getRandomInt(-45, 45));
    setX2Offset(getRandomInt(-100, 100));
    setXLogoPadding(getRandomInt(0, 200));
    setYLogoPadding(getRandomInt(0, 200));
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
         <div className="setting-group-container">
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
          <div className="setting-group-container">
            <div className="subtitle">
              <h3>2. Hintergrund auswählen</h3>
            </div>      
            <div className="setting-group background-settings">
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
            </div>
          </div>   
              <div className="setting-group-container">
                <div className="subtitle">
                  <h3>3. Tuchgröße festlegen</h3>
                </div>                
                <div className="setting-group">
                  {[settings[5],settings[6]].map((setting) => (
                    <div className="setting" key={setting.name}>
                      <div className="setting-label">
                        <label htmlFor={setting.name}>{setting.description}</label>
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
            <div className="setting-group-container">
              <div className="subtitle">
                <h3>4. Gestaltung</h3>
              </div>
              <div className="setting-group">
                {settings.slice(0,5).map((setting) => (
                  <div className="setting" key={setting.name}>
                    <div className="setting-label">
                      <label htmlFor={setting.name}>{setting.description}</label>
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
            <div className="setting-group-container">
              <div className="download-div">
                <div className="subtitle">
                  <h3>4. Download</h3>
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
      <div>
      <button
        className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800"
        onClick={makeRand}
      >
        Zufall
      </button>
    </div>               
    </section>
    </>
  );
}

export default App;
