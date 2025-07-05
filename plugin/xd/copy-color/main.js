/// xd 插件開發文檔可參閱
/// https://developer.adobe.com/xd/uxp/develop/tutorials/quick-start/

const assets = require('assets')
const clipboard = require("clipboard")

function copyAllAssetColors() {
  const assetAllColors = assets.colors.get()

  if (!assetAllColors.length) {
    showAlert('assets 沒有任一顏色，嘗試添加顏色以嘗試複製功能')
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

  const colorText = copyTexts.sort((a, b) => {
    // 提取編號部分，框出前面的 "xxx號色"
    const regex = /^([A-z]+)(\d+):/;

    const matchA = a.match(regex);
    const matchB = b.match(regex);

    if (!matchA || !matchB) {
      return a.localeCompare(b); // Fallback to normal string compare
    }

    const [_, prefixA, numA] = matchA; // 分為前綴與數字
    const [__, prefixB, numB] = matchB;

    if (prefixA !== prefixB) {
      // 比較字母前綴
      return prefixA.localeCompare(prefixB);
    }

    // 比較數字部分
    return parseInt(numA, 10) - parseInt(numB, 10);
  }).join('\n  ')

  clipboard.copyText(`{
  ${colorText}
}`)
  showAlert('顏色已成功複製到剪貼簿！')
}

function alphaToPercentage(alpha) {
  return Math.round((alpha / 255) * 100)
}

function percentageToAlpha(percentage) {
  return Math.round((percentage / 100) * 255)
}

function toUnoColorValue (color) {
  const hexColor = color.toHex(true)
  if (!color.a || color.a === 255) return `'${hexColor}'`
  return `rgba('${hexColor}', ${alphaToPercentage(color.a) / 100})`
}

function showAlert(message) {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <form method="dialog" style="width: 400px; padding: 20px;">
      <h1>通知</h1>
      <p>${message}</p>
      <footer>
          <button uxp-variant="cta" type="submit">確定</button>
      </footer>
    </form>
  `
  document.body.appendChild(dialog)
  dialog.showModal().then(() => dialog.remove())
}

module.exports = {
  commands: {
    copyAllAssetColors,
  },
}
