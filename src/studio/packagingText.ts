import { Textbox } from 'fabric';
import type { PackagingLayer } from './model';
import { mappedFont } from './fonts';
export function textOptions(layer: PackagingLayer, banderole = true) {
  return {
    width: layer.widthMm,
    text: layer.text ?? '',
    fontFamily: banderole ? mappedFont(layer.fontFamily) : layer.fontFamily || 'Arial',
    fontSize: (layer.fontSizePt * 25.4) / 72,
    fontWeight: layer.bold ? 'bold' : 'normal',
    fontStyle: layer.italic ? ('italic' as const) : ('normal' as const),
    fill: layer.color,
    scaleX: 1,
    scaleY: 1,
    strokeWidth: 0,
    lineHeight: 1.16,
  };
}
export function textView(layer: PackagingLayer) {
  return new Textbox(layer.text ?? '', {
    ...textOptions(layer),
    left: layer.xMm,
    top: layer.yMm,
    originX: 'center',
    originY: 'center',
    angle: layer.rotation,
  });
}
