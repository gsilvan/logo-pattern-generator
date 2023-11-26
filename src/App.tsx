import React, { useState } from "react";
import "./App.css";
import Canvas from "./Canvas";

function App() {
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [xlogoPadding, setXLogoPadding] = useState(2);
  const [ylogoPadding, setYLogoPadding] = useState(2);
  const [image, setImage] = useState("");
  const [width, setWidth] = useState(25);
  const [height, setHeight] = useState(25);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);

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
      value: scale,
      setValue: setScale,
      min: 0,
      max: 100,
      unit: "%",
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
      name: "xOffset",
      description: "X Verschiebung",
      value: xOffset,
      setValue: setXOffset,
      min: -100,
      max: 100,
      unit: "px",
    },
    {
      name: "yOffset",
      description: "Y Verschiebung",
      value: yOffset,
      setValue: setYOffset,
      min: -100,
      max: 100,
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
            <div className="px-2.5">
              {setting.value} {setting.unit}
            </div>
          </div>
        ))}
        <div>
          <input type="file" onChange={handleImageUpload} accept="image/*" />
        </div>
      </div>
      <div className="w-3/5">
        <div className="w-full">
          <Canvas
            image={image}
            width={width}
            height={height}
            rotation={rotation}
            scale={scale}
            backgroundColor={"#0803AF"}
            xGap={xlogoPadding}
            yGap={ylogoPadding}
            xOffset={xOffset}
            yOffset={yOffset}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
