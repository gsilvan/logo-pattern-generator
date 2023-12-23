import React, { useState } from "react";
import Canvas from "./Canvas";

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

function App() {
  const [logoTargetWidth, setLogoTargetWidth] = useState(200);
  const [rotation, setRotation] = useState(0);
  const [xlogoPadding, setXLogoPadding] = useState(2);
  const [ylogoPadding, setYLogoPadding] = useState(2);
  const [image, setImage] = useState("");
  const [width, setWidth] = useState(25);
  const [height, setHeight] = useState(25);
  const [x2Offset, setX2Offset] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("#fff");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };

      reader.readAsDataURL(file);
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
      description: "X_2 Verschiebung",
      value: x2Offset,
      setValue: setX2Offset,
      min: -1000,
      max: 1000,
      unit: "px",
    },
    {
      name: "xLogoPadding",
      description: "X Padding",
      value: xlogoPadding,
      setValue: setXLogoPadding,
      min: 0,
      max: 20,
      unit: "cm",
    },
    {
      name: "yLogoPadding",
      description: "Y Padding",
      value: ylogoPadding,
      setValue: setYLogoPadding,
      min: 0,
      max: 20,
      unit: "cm",
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
    setLogoTargetWidth(getRandomInt(100, 500));
    setRotation(getRandomInt(-45, 45));
    setX2Offset(getRandomInt(-100, 100));
    setXLogoPadding(getRandomInt(0, 6));
    setYLogoPadding(getRandomInt(0, 6));
    setBackgroundColor(getRandomColor());
  }

  return (
    <div className="flex w-full h-full">
      <div className="w-2/5 h-full">
        {settings.map((setting) => (
          <div className="flex">
            <div className="w-32">
              <label htmlFor={setting.name}>{setting.description}</label>
            </div>

            <input
              className="w-64"
              value={setting.value}
              onChange={(e) => setting.setValue(parseInt(e.target.value))}
              type="range"
              id={setting.name}
              name={setting.name}
              min={setting.min}
              max={setting.max}
            />
            <input
              className="w-12"
              type="number"
              value={setting.value}
              onChange={(e) => setting.setValue(parseInt(e.target.value))}
              min={setting.min}
              max={setting.max}
            />
            <div className="px-2.5">{setting.unit}</div>
          </div>
        ))}
        <div className="flex">
          <label className="w-32" htmlFor="selectFile">
            Logo einfügen
          </label>
          <input
            className="px-2.5"
            id="selectFile"
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
          />
        </div>
        <div className="flex">
          <label className="w-32" htmlFor="colorPicker">
            Hintergrundfarbe
          </label>
          <input
            id="colorPicker"
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
        </div>
        <div>
          <a className="btn btn-blue" onClick={makeRand}>
            Zufall
          </a>
        </div>
      </div>
      <div className="w-3/5">
        <div className="w-full">
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
