
export type SelectedXdItem = {
  fill: object
  stroke: object
}

export class Color {
  r: number
  g: number
  b: number
  a: number
  toHex(toSix?: boolean): string // 轉換為十六進制顏色 #xxxxxx
  toRgba(): { r: number; g: number; b: number; a: number /* 0-255 */ }
}

export type ColorStop = {
  stop: number
  color: Color
}

export type GradientType = 'linear' | 'radial'

export type AssetsColor = {
  name?: string // 顏色名稱 (有改過名字才有)
  color?: Color // 顏色對象 (若是單色才有)
  gradientType?: GradientType // 漸層類型 (漸層才會有)
  colorStops?: ColorStop[] // 顏色停止點數組 (漸層才會有)
}

export type AllAssetsColorsItem = {
  colorName: string
  origin: AssetsColor
  isLightColor: boolean
  colorCss: string
  gradientType?: 'linear' | 'radial'
}

export type AllAssetsColors = Map<string, AllAssetsColorsItem>

export type ColorGroupItem = {
  name: string
  colorNameList: string[]
}

export type MyColorStop = {
  stop: number
  hex: string
  opacity?: number
}

// 轉化成 [@xxx:xxx] name 的 parse 後的 obj
export type MyAssetColor = {
  groupName: string
  groupSort: number
  name: string // 就是 colorName
  hex?: string // color 純色會轉這
  opacity?: number // color 純色會有
  gradientType?: GradientType // color 漸層會有
  colorStops?: MyColorStop[] // color 漸層會有
  description: string
}