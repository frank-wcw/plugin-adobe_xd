/// xd 插件開發文檔可參閱
/// https://developer.adobe.com/xd/uxp/develop/tutorials/quick-start/

const assets = require('assets')
const clipboard = require("clipboard")
const { showAlert, alphaToPercentage, sortColorNameList } = require("./helper/v1")

function copyAllAssetColors() {
  const assetAllColors = assets.colors.get()

  if (!assetAllColors.length) {
    showAlert('assets 沒有任一顏色，嘗試添加顏色以嘗試複製功能')
    return
  }

  const copyTexts = []
  assetAllColors.forEach(e => {
    const {
      name,
      color, // 若是單色才有
      gradientType, // linear, radial 漸層才會有
      colorStops, // 看起來是 color[]
    } = e
    const [, colorName] = name.match(/^([A-z]+\d+).*$/) || [undefined, '???']

    if (color) {
      copyTexts.push(`${colorName}: ${toUnoColorValue(color)}, // ${name}`)
    } else if (gradientType) {
      colorStops.forEach((f, i) => {
        const { color } = f
        copyTexts.push(`${colorName}_${i + 1}: ${toUnoColorValue(color)}, // ${name}`)
      })
    }
  })

  if (!copyTexts.length) {
    showAlert('未匹配到任何可以複製的顏色！')
    return
  }

  const colorText = sortColorNameList(copyTexts).join('\n  ')

  clipboard.copyText(`{
  ${colorText}
}`)
  showAlert('顏色已成功複製到剪貼簿！')
}

function toUnoColorValue (color) {
  const hexColor = color.toHex(true)
  if (!color.a || color.a === 255) return `'${hexColor}'`
  return `rgba('${hexColor}', ${alphaToPercentage(color.a) / 100})`
}

module.exports = {
  commands: {
    copyAllAssetColors,
  },
}
