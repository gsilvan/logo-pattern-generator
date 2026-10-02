import { Textbox } from 'fabric';
import type { PackagingLayer } from './model';
import { fontRenderFamily } from './fonts';
export function textOptions(layer: PackagingLayer) {
  return {
    width: layer.widthMm,
    text: layer.text ?? '',
    fontFamily: fontRenderFamily(layer),
    fontSize: (layer.fontSizePt * 25.4) / 72,
    fontWeight: layer.fontPostscriptName ? 'normal' : layer.bold ? 'bold' : 'normal',
    fontStyle: layer.fontPostscriptName
      ? ('normal' as const)
      : layer.italic
        ? ('italic' as const)
        : ('normal' as const),
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
