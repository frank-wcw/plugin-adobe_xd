/// xd 插件開發文檔可參閱
/// https://developer.adobe.com/xd/uxp/develop/tutorials/quick-start/

const assets = require('assets')
const { Color, LinearGradient, RadialGradient } = require("scenegraph")
const uxp = require("uxp")
const fs = uxp.storage.localFileSystem
const { showAlert } = require('./helper')

async function importAssetsColors(selection, documentRoot
) {
  const aFile = await fs.getFileForOpening({ types: ["json"] })
  if (!aFile) return

  let config
  try {
    config = JSON.parse(await aFile.read())
  } catch (error) {
    showAlert(`導入的顏色檔有問題 (${error.message})`)
    return
  }

  const assetAllColors = assets.colors.get().reduce((p, e) => {
    const [, colorName] = e.name.match(/^([A-z]+\d+).*$/) || [undefined, '???']
    p[colorName] = e
    return p
  }, {})
  const addColors = []
  const deleteColors = []
  // 匹配到相同的色號 <color 舊, color 新>
  const sameColorMap = new Map()

  try {
    for (const colorName in config) {
      const {
        description,
        hex, // 有表示純色
        opacity, // 給純色用的
        gradientType,  // 有表示漸層 (linear|radial)
        colorStops, // 漸層色列表 color[]
      } = config[colorName]

      // 純色
      if (hex) {
        let color
        if (opacity) color = new Color(hex, opacity)
        else color = new Color(hex)

        const name = `${colorName}號色 ${hex} - ${description}`

        const oldColor = assetAllColors[colorName]
        if (oldColor) {
          const oldColorKey = colorToKey(oldColor.color)
          if (colorToKey(color) === oldColorKey) continue
          sameColorMap.set(oldColorKey, color)
          deleteColors.push(oldColor)
        }

        addColors.push({
          name,
          color,
        })
      } else if (gradientType) {
        const ascStopColorStops = colorStops.sort((a, b) => a.stop - b.stop)

        const gradient = new LinearGradient()

        gradient.colorStops = ascStopColorStops.map(({ stop, hex, opacity }) => ({
          stop,
          color: opacity != null ? new Color(hex, opacity) : new Color(hex),
        }))

        const name = `${colorName}號色 ${ascStopColorStops.map(e => e.hex).join(' - ')} - ${description}`

        const oldColor = assetAllColors[colorName]
        if (oldColor) {
          const oldColorKey = gradientLinearToKey(oldColor)
          if (gradientLinearToKey(gradient) === oldColorKey) continue
          sameColorMap.set(oldColorKey, gradient)
          deleteColors.push(oldColor)
        }

        addColors.push({
          name,
          gradientType,
          colorStops: gradient.colorStops,
        })
      }
    }
  } catch (error) {
    showAlert(`顏色匹配過程出現錯誤 (${error.message})`)
    console.error(error)
    return
  }

  try {
    recursiveFindChild(documentRoot, sameColorMap)

    deleteColors.forEach(color => {
      assets.colors.delete(color)
    })

    if (addColors.length) {
      console.log(`已新增或調整了 ${assets.colors.add(addColors)} 筆色號`)
    }
  } catch (error) {
    showAlert(`元素顏色轉換時出現錯誤 (${error.message})`)
    console.error(error)
  }
}

function recursiveFindChild (node, sameColorMap) {
  node.children.forEach(child => {
    if (child.fill != null) {
      if (child.fill instanceof Color) {
        const newColor = sameColorMap.get(colorToKey(child.fill))
        if (newColor) child.fill = newColor
      } else if (child.fill instanceof LinearGradient || child.fill instanceof RadialGradient) {
        const newColor = sameColorMap.get(gradientLinearToKey(child.fill))
        if (newColor) {
          const newGradient = child.fill.clone()
          newGradient.colorStops = newColor.colorStops
          child.fill = newGradient
        }
      }
    }

    if (child.stroke != null) {
      if (child.stroke instanceof Color) {
        const newColor = sameColorMap.get(colorToKey(child.stroke))
        if (newColor) child.stroke = newColor
      }
    }

    recursiveFindChild(child, sameColorMap)
  })
}

function gradientLinearToKey (color) {
  return color.colorStops.map(e => `${colorToKey(e.color)}${e.stop}`).join('')
}

function colorToKey (color) {
  return `${color.toHex(true)}${color.a ? color.a : 255}`
}

function exportAssetsColors () {
}

module.exports = {
  commands: {
    importAssetsColors,
    exportAssetsColors,
  },
}
