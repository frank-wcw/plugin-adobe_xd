declare module 'application' {
  export const activeDocument: {
    name: string,
    guid: string,
  }

  export const editDocument: (callback: () => void) => void
}

declare module 'scenegraph' {
  export class Color {
    r: number
    g: number
    b: number
    a: number
    toHex(toSix?: boolean): string // 轉換為十六進制顏色 #xxxxxx
    toRgba(): { r: number; g: number; b: number; a: number /* 0-255 */ }
    constructor()
    constructor(hex: string)
    constructor(hex: string, opacity: number)
  }

  export type ColorStop = {
    stop: number
    color: Color
  }

  export type GradientType = 'linear' | 'radial'

  export class LinearGradient {
    colorStops: ColorStop[]
  }

  export class RadialGradient extends LinearGradient {}

  export class SymbolInstance {}
  export class LinkedGraphic {}
  export class BooleanGroup {}
  export class Group {}
}