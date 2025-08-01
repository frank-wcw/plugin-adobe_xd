/// xd 插件開發文檔可參閱
/// https://developer.adobe.com/xd/uxp/develop/tutorials/quick-start/

const application = require("application")
const assets = require('assets')
const clipboard = require('clipboard')
const scenegraph = require('scenegraph')
const uxp = require('uxp')
const fs = uxp.storage.localFileSystem
const helper = require('./helper/v1')

const simpleToComplexNameKeyMap = new Map()
const complexToSimpleNameKeyMap = new Map()

// 群組名稱
simpleToComplexNameKeyMap.set('G', 'groupName')
complexToSimpleNameKeyMap.set('groupName', 'G')
// 群組排序
simpleToComplexNameKeyMap.set('GS', 'groupSort')
complexToSimpleNameKeyMap.set('groupSort', 'GS')
// 顏色名
simpleToComplexNameKeyMap.set('N', 'name')
complexToSimpleNameKeyMap.set('name', 'N')
// 最終非純色會被轉化成 colorStops
simpleToComplexNameKeyMap.set('C', 'color')
complexToSimpleNameKeyMap.set('color', 'C')
// 漸層類型
simpleToComplexNameKeyMap.set('CGT', 'gradientType')
complexToSimpleNameKeyMap.set('gradientType', 'CGT')
// 描述
simpleToComplexNameKeyMap.set('D', 'description')
complexToSimpleNameKeyMap.set('description', 'D')

const simpleNameKeySortList = ['GS', 'G', 'N', 'D', 'C', 'CGT']
const complexNameKeySortList = simpleNameKeySortList.map(e => simpleToComplexNameKeyMap.get(e))

// test data
// const nameList = [
//   '[@groupName  : 群組名稱][@groupSort:1] [@ name :com1] [@color:#2e2e2e][@test:跳脫\\]測試]  [@D:應用於驚喜包(搶禮物) 區塊背景色][@test2:測試2',
//   '[@groupName:群組名稱][@groupSort:1][@name:com2][@color:#2e2e2e][@description:應用於驚喜包(搶禮物) 區塊背景色][@test:\\[跳脫\\]測試]',
//   '[@groupName:群組名稱][@groupSort:1][@name:spec3][@color:#2e2e2e][@description:應用於驚喜包(搶禮物) 區塊背景色][@test:跳脫]測試]',
//   '[@groupName:群組名稱][@groupSort:1][@name:a02][@description:應用於驚喜包(搶禮物) 區塊背景色][@color:#2e2e2e 0-#CBFF2E(90%) 1][@gradientType:linear]',
//   '[@G:群組名稱][@GS:1][@N:a01][@C:#2e2e2e(20%)][@D:應用於驚喜包(搶禮物) 區塊背景色]',
// ]

function transformOldAssetsColorsToPluginType () {
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    helper.showAlert('assets 沒有任一顏色，請嘗試添加顏色以轉換顏色配置')
    return
  }

  const noMatchNameList = []
  const changeColorList = []
  allAssetsColors.forEach(e => {
    const [_, colorName, color, desc] = e.name?.match(/^([A-z]+\d+)號色\s*(#.+)\s-\s(.+)$/) || []

    if (!colorName) {
      noMatchNameList.push(e.name)
      return
    }

    const nameKeyObj = {
      groupName: '未分類',
      groupSort: 1,
      description: desc.replace(/([\[\]])/g, '\\$1'),
      name: colorName,
    }

    if (e.gradientType) {
      nameKeyObj.gradientType = e.gradientType
      nameKeyObj.color = e.colorStops.map(f => {
        const hex = f.color.toHex(true)
        return `${hex}${f.color.a === 0 ? '(0%)' : f.color.a < 255 ? `(${helper.alphaToPercentage(f.color.a)}%)` : ''} ${f.stop}`
      }).join('-')
    } else {
      const hex = e.color.toHex(true)
      nameKeyObj.color = `${hex}${e.color.a === 0 ? '(0%)' : e.color.a < 255 ? `(${helper.alphaToPercentage(e.color.a)}%)` : ''}`
    }

    changeColorList.push({
      old: e,
      new: {
        ...e,
        name: transformObjToNameKey(nameKeyObj),
      }
    })
  })

  if (noMatchNameList.length) {
    const max = 10
    const isExtraMax = noMatchNameList.length > max
    helper.showAlert(`${noMatchNameList.slice(0, max).join('\n')}\n${isExtraMax ? `...等${noMatchNameList.length - max}筆\n` : ''}這些顏色匹配格式失敗，請自行編輯後重新嘗試`)
    return
  }

  changeColorList.forEach(e => {
    assets.colors.delete(e.old)
    assets.colors.add(e.new)
  })
}

function transformObjToNameKey (obj, isToSimple = true) {
  let result = ''
  const keyMap = isToSimple ? complexToSimpleNameKeyMap : simpleToComplexNameKeyMap
  const keyNameSortList = isToSimple ? complexNameKeySortList : simpleNameKeySortList

  for (let i = 0; i < keyNameSortList.length; i++) {
    const k = keyNameSortList[i]
    if (obj[k] == null) continue
    result += `[@${keyMap.get(k)}:${obj[k]}]`
  }

  return result
}

/**
 * @param myAssetColor {import('./type/common.d.ts').MyAssetColor}
 * @param index {number}
 * @param originItem {import('./type/common.d.ts').AssetsColor | string}
 */
function mapToColorInstance (myAssetColor, index, originItem) {
  if (myAssetColor == null) return

  if (myAssetColor.hex) {
    myAssetColor.colorInstance = myAssetColor.opacity
      ? new scenegraph.Color(myAssetColor.hex, myAssetColor.opacity)
      : new scenegraph.Color(myAssetColor.hex)
  } else if (myAssetColor.gradientType) {
    const Gradient = myAssetColor.gradientType === 'linear' ? scenegraph.LinearGradient : scenegraph.RadialGradient
    const gradient = new Gradient()
    gradient.colorStops = myAssetColor.colorStops.map(({ stop, hex, opacity }) => ({
      stop,
      color: opacity != null ? new scenegraph.Color(hex, opacity) : new scenegraph.Color(hex),
    }))
    myAssetColor.gradientInstance = gradient
  }

  if (typeof originItem === 'object') {
    myAssetColor.originAssetColor = originItem
  }
}

async function importAssetsColors(selection, documentRoot) {
  const aFile = await fs.getFileForOpening({ types: ["json"] })
  if (!aFile) return

  let nameList
  try {
    nameList = JSON.parse(await aFile.read())
  } catch (error) {
    helper.showAlert(`導入的顏色檔有問題 (${error.message})`)
    return
  }

  if (!nameList.length) {
    helper.showAlert('導入的顏色為空')
    return
  }

  const { map: importAssetsColorsMap , skipIdxList } = assetsColorsToColorInfoMap(nameList, mapToColorInstance)

  if (skipIdxList.length === nameList.length) {
    helper.showAlert('導入的顏色名稱全數不匹配')
    return
  }

  const { map: allAssetsColorsMap } = assetsColorsToColorInfoMap(assets.colors.get(), mapToColorInstance)
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const addColors = []
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const deleteColors = []
  // 匹配到相同的色號 <color 舊, color 新>
  const sameColorMap = new Map()

  try {
    importAssetsColorsMap.forEach((colorItem) => {
      // 純色
      if (colorItem.colorInstance) {
        const oldColorItem = allAssetsColorsMap.get(colorItem.name)

        if (oldColorItem) {
          let oldColorKey

          if (oldColorItem.colorInstance) {
            oldColorKey = colorToKey(oldColorItem.colorInstance)
            if (colorToKey(colorItem.colorInstance) === oldColorKey) return
          } else if (oldColorItem.gradientInstance) {
            oldColorKey = gradientLinearToKey(oldColorItem.gradientInstance)
          }

          if (oldColorKey) {
            sameColorMap.set(oldColorKey, colorItem.colorInstance)
            deleteColors.push(oldColorItem.originAssetColor)
          }
        }

        addColors.push({
          name: colorItem.originName,
          color: colorItem.colorInstance,
        })
      } else if (colorItem.gradientInstance) {
        const ascStopColorStops = colorItem.colorStops.sort((a, b) => a.stop - b.stop)

        const gradient = new (colorItem.gradientType === 'linear' ? scenegraph.LinearGradient : scenegraph.RadialGradient)()

        gradient.colorStops = ascStopColorStops.map(({ stop, hex, opacity }) => ({
          stop,
          color: opacity != null ? new scenegraph.Color(hex, opacity) : new scenegraph.Color(hex),
        }))

        const oldColorItem = allAssetsColorsMap.get(colorItem.name)
        if (oldColorItem) {
          let oldColorKey

          if (oldColorItem.colorInstance) {
            oldColorKey = colorToKey(oldColorItem.colorInstance)
          } else if (oldColorItem.gradientInstance) {
            oldColorKey = gradientLinearToKey(oldColorItem.gradientInstance)
            if (gradientLinearToKey(gradient) === oldColorKey) return
          }

          if (oldColorKey) {
            sameColorMap.set(oldColorKey, gradient)
            deleteColors.push(oldColorItem.originAssetColor)
          }
        }

        addColors.push({
          name: colorItem.originName,
          gradientType: colorItem.gradientType,
          colorStops: gradient.colorStops,
        })
      }
    })
  } catch (error) {
    helper.showAlert(`顏色匹配過程出現錯誤 (${error.message})`)
    console.error(error)
    return
  }

  try {
    if (addColors.length || deleteColors.length) {
      recursiveUpdateChildColorByImport(documentRoot, sameColorMap)

      deleteColors.forEach(color => {
        assets.colors.delete(color)
      })

      if (addColors.length) {
        const addLength = assets.colors.add(addColors)

        if (addLength) {
          helper.showAlert(`已新增了 ${addColors.length} 筆顏色${deleteColors.length > 0 ? `，並調整了 ${deleteColors.length} 筆顏色` : ''}`)
        } else if (deleteColors.length > 0) {
          helper.showAlert(`調整了 ${deleteColors.length} 筆顏色`)
        }
      } else if (deleteColors.length) {
        helper.showAlert(`調整了 ${deleteColors.length} 筆顏色`)
      }
    } else {
      helper.showAlert('未新增或調整任一筆顏色')
    }
  } catch (error) {
    helper.showAlert(`元素顏色轉換時出現錯誤 (${error.message})`)
    console.error(error)
  }
}

async function importOldAssetsColors(selection, documentRoot
) {
  const aFile = await fs.getFileForOpening({ types: ["json"] })
  if (!aFile) return

  let config
  try {
    config = JSON.parse(await aFile.read())
  } catch (error) {
    helper.showAlert(`導入的顏色檔有問題 (${error.message})`)
    return
  }

  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = assets.colors.get().reduce((p, e) => {
    const [, colorName] = e.name?.match(/^([A-z]+\d+).*$/) || []
    if (!colorName) return p
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
        if (opacity) color = new scenegraph.Color(hex, opacity)
        else color = new scenegraph.Color(hex)

        const name = `${colorName}號色 ${toColorDescName(hex, opacity)} - ${description}`

        const oldColor = allAssetsColors[colorName]
        if (oldColor) {
          let oldColorKey

          if (oldColor.color instanceof scenegraph.Color) {
            oldColorKey = colorToKey(oldColor.color)
            if (colorToKey(color) === oldColorKey) continue
          } else {
            oldColorKey = gradientLinearToKey(oldColor)
          }

          sameColorMap.set(oldColorKey, color)
          deleteColors.push(oldColor)
        }

        addColors.push({
          name,
          color,
        })
      } else if (gradientType) {
        const ascStopColorStops = colorStops.sort((a, b) => a.stop - b.stop)

        const gradient = new scenegraph.LinearGradient()

        gradient.colorStops = ascStopColorStops.map(({ stop, hex, opacity }) => ({
          stop,
          color: opacity != null ? new scenegraph.Color(hex, opacity) : new scenegraph.Color(hex),
        }))

        const name = `${colorName}號色 ${ascStopColorStops.map(e => toColorDescName(e.hex, e.opacity)).join(' - ')} - ${description}`

        const oldColor = allAssetsColors[colorName]
        if (oldColor) {
          let oldColorKey

          if (oldColor.color instanceof scenegraph.Color) {
            oldColorKey = colorToKey(oldColor.color)
          } else {
            oldColorKey = gradientLinearToKey(oldColor)
            if (gradientLinearToKey(gradient) === oldColorKey) continue
          }

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
    helper.showAlert(`顏色匹配過程出現錯誤 (${error.message})`)
    console.error(error)
    return
  }

  try {
    recursiveUpdateChildColorByImport(documentRoot, sameColorMap)

    deleteColors.forEach(color => {
      assets.colors.delete(color)
    })

    if (addColors.length) {
      helper.showAlert(`已新增或調整了 ${assets.colors.add(addColors)} 筆色號`)
    }
  } catch (error) {
    helper.showAlert(`元素顏色轉換時出現錯誤 (${error.message})`)
    console.error(error)
  }
}

async function exportAssetsColors() {
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    helper.showAlert('assets 沒有任一顏色，請嘗試添加顏色以導出顏色配置')
    return
  }

  const exportDataList = allAssetsColors.map(e => e.name)

  const currentDate = new Date()
  let filename = 'xd_assets_colors_'

  filename += currentDate.getFullYear()
  filename += (currentDate.getMonth() + 1).toString().padStart(2, '0')
  filename += currentDate.getDate().toString().padStart(2, '0')

  const file = await fs.getFileForSaving(`${filename}.json`)
  if (file) {
    const resultJsonString = JSON.stringify(helper.sortColorNameList(exportDataList, {
      transformElement: e => (e.match(/\[@N:([A-z0-9]+)]/) || [])[1] || ''
    }), null, 2)

    await file.write(resultJsonString)
  }
}

async function exportOldAssetsColors () {
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    helper.showAlert('assets 沒有任一顏色，請嘗試添加顏色以導出顏色配置')
    return
  }

  const exportDataList = []

  allAssetsColors.forEach(e => {
    const [_, colorName, afterText, dash, desc] = e.name?.match(/^([A-z]+\d+)(.+(\s-\s)(.*)$)?/) || []
    if (!colorName) return

    const description = desc || afterText || e.name

    if (e.color instanceof scenegraph.Color) {
      const data = {
        colorName,
        description,
        hex: e.color.toHex(true),
      }
      if (e.color.a && e.color.a !== 255) data.opacity = helper.alphaToPercentage(e.color.a) / 100
      exportDataList.push(data)
    } else if (e.gradientType) {
      const data = {
        colorName,
        description,
        gradientType: e.gradientType,
        colorStops: e.colorStops.map(f => {
          const color = {
            stop: f.stop,
            hex: f.color.toHex(true),
          }
          if (f.color.a && f.color.a !== 255) color.opacity = helper.alphaToPercentage(f.color.a) / 100
          return color
        })
      }
      exportDataList.push(data)
    }
  })

  const currentDate = new Date()
  let filename = 'xd_assets_colors_'

  filename += currentDate.getFullYear()
  filename += (currentDate.getMonth() + 1).toString().padStart(2, '0')
  filename += currentDate.getDate().toString().padStart(2, '0')

  const file = await fs.getFileForSaving(`${filename}.json`)
  if (file) {
    const resultJsonString = helper.stringify(helper.sortColorNameList(exportDataList, {
      transformElement: e => e.colorName
    }).reduce((p, { colorName, ...other }) => {
      p[colorName] = other
      return p
    }, {}), { maxLength: 60 })

    await file.write(resultJsonString)
  }
}

function getAllProperties(obj) {
  const props = new Set();
  let currentObj = obj;

  do {
    Object.getOwnPropertyNames(currentObj).forEach(name => props.add(name));
  } while ((currentObj = Object.getPrototypeOf(currentObj)) &&
  currentObj !== Object.prototype);

  return [...props];
}

function recursiveUpdateChildColorByImport (node, sameColorMap) {
  node.children.forEach(e => {
    if (e instanceof scenegraph.SymbolInstance || e.mask) return
    if (e.isContainer) return recursiveUpdateChildColorByImport(e, sameColorMap)

    // if (e instanceof scenegraph.LinkedGraphic || e instanceof scenegraph.SymbolInstance || e instanceof scenegraph.BooleanGroup || e instanceof scenegraph.Group) {
    //   recursiveUpdateChildColorByImport(e, sameColorMap)
    //   return
    // }


    if (e.fill != null) {
      if (e.fill instanceof scenegraph.Color) {
        const newColor = sameColorMap.get(colorToKey(e.fill))
        if (newColor) e.fill = newColor
      } else if (e.fill instanceof scenegraph.LinearGradient || e.fill instanceof scenegraph.RadialGradient) {
        const newColor = sameColorMap.get(gradientLinearToKey(e.fill))
        if (newColor) {
          if (newColor instanceof scenegraph.Color) {
            e.fill = newColor
          } else {
            const newGradient = e.fill.clone()
            newGradient.colorStops = newColor.colorStops
            e.fill = newGradient
          }
        }
      }
    }

    if (e.stroke != null) {
      if (e.stroke instanceof scenegraph.Color) {
        const newColor = sameColorMap.get(colorToKey(e.stroke))
        if (newColor) e.stroke = newColor
      }
    }

    recursiveUpdateChildColorByImport(e, sameColorMap)
  })
}

/**
 * @template T extends (string | { name: string })
 * @param nameList {T[]}
 * @param [tap] {(el: import('./type/common.d.ts').MyAssetColor | null, i: number, originEl: T) => void}
 * @returns {{map: Map<string, import('./type/common.d.ts').MyAssetColor>, skipIdxList: number[]}}
 */
function assetsColorsToColorInfoMap (nameList, tap) {
  const colorInfoMap = new Map()
  const skipIdxList = []

  nameList.forEach((e, i) => {
    const name = typeof e === 'string' ? e : e.name

    if (!name) {
      skipIdxList.push(i)
      tap?.(null, i, e)
      return
    }

    /** @desc 類型會有為落差，懶得申明主要是 color 哈
     * @type {import('./type/common.d.ts').MyAssetColor} */
    const kvMap = {
      originName: name,
    }
    let sbBeginIdx = -1 // [
    let keyBeginIdx = sbBeginIdx // @x
    let keyEndIdx = sbBeginIdx // x:
    let isEscape = false // \\

    for (let j = 0; j < name.length; j++) {
      if (name[j] === '\\') {
        isEscape = true
        continue
      }
      if (isEscape) {
        isEscape = false
        continue
      }
      if (name[j] === '[') sbBeginIdx = j
      if (sbBeginIdx > -1) {
        if (name[j] === ']') {
          const key = name.substring(keyBeginIdx, keyEndIdx + 1).trim()
          kvMap[simpleToComplexNameKeyMap.get(key) || key] = name.substring(keyEndIdx + 2, j).trim()
          sbBeginIdx = -1
          keyBeginIdx = -1
          keyEndIdx = -1
        }
        else if (j === sbBeginIdx + 1) {
          if (name[j] !== '@') {
            sbBeginIdx = -1
          } else {
            keyBeginIdx = j + 1
          }
        } else if (keyEndIdx === -1 && keyBeginIdx > sbBeginIdx && name[j] === ':') {
          keyEndIdx = j - 1
        }
      }
    }

    if (kvMap.name && kvMap.color) {
      const colors = kvMap.color.split('-')

      if (colors.length > 1) {
        kvMap.colorStops = colors.map(e => {
          const [m, hex, , opacity, stop] = e.match(/^(#[A-z0-9]+)(\((\d+)%\))?\s*([\d.]+)$/) || []

          if (!m) return null

          const result = { stop: Number(stop), hex }

          if (opacity != null) result.opacity = Number(opacity) / 100

          return result
        }).filter(e => e).sort((a, b) => a.stop - b.stop)

        if (!kvMap.colorStops.length) {
          console.warn(`略過了【${kvMap.name}】，漸層色的配置有問題 ${kvMap.color}`)
          skipIdxList.push(i)
          return
        }

        delete kvMap.color
        colorInfoMap.set(kvMap.name, kvMap)
      } else {
        const [m, hex, , opacity] = kvMap.color.match(/^(#[A-z0-9]+)(\((\d+)%\))?$/) || []

        if (!m) {
          console.warn(`略過了【${kvMap.name}】，純色的配置有問題 ${kvMap.color}`)
          skipIdxList.push(i)
          return
        }

        kvMap.hex = hex
        if (opacity != null) kvMap.opacity = Number(opacity) / 100

        delete kvMap.color
        colorInfoMap.set(kvMap.name, kvMap)
      }

      tap?.(kvMap, i, e)
    } else {
      console.warn(`略過了【${name}】，匹配不到 key-name 或是 key-color`)
      skipIdxList.push(i)
      tap?.(null, i, e)
    }
  })

  return {
    map: colorInfoMap,
    skipIdxList,
  }
}

function gradientLinearToKey (color) {
  return color.colorStops.map(e => `${colorToKey(e.color)}${e.stop}`).join('')
}

function colorToKey (color) {
  return `${color.toHex(true).toLowerCase()}${color.a ? color.a : 255}`
}

function toColorDescName (hex, opacity) {
  return `${hex}${opacity ? `(${opacity * 100}%)` : ''}`
}

function copyOldUnoAssetsColors() {
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    helper.showAlert('assets 沒有任一顏色，嘗試添加顏色以嘗試複製功能')
    return
  }

  const copyTextList = []

  allAssetsColors.forEach(({
    name,
    color,
    gradientType,
    colorStops,
  }) => {
    const [, colorName] = name?.match(/^([A-z]+\d+).*$/) || []
    if (!colorName) return

    if (color) {
      copyTextList.push(`${colorName}: ${toOldUnoColorValue(color)}, // ${name}`)
    } else if (gradientType) {
      colorStops.forEach((f, i) => {
        const { color } = f
        copyTextList.push(`${colorName}_${i + 1}: ${toOldUnoColorValue(color)}, // ${name}`)
      })
    }
  })

  if (!copyTextList.length) {
    helper.showAlert('未匹配到任何可以複製的顏色！')
    return
  }

  const colorText = helper.sortColorNameList(copyTextList).join('\n  ')

  clipboard.copyText(`{
  ${colorText}
}`)

  helper.showAlert('顏色已成功複製到剪貼簿！')
}

function copyUnoAssetsColors() {
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    helper.showAlert('assets 沒有任一顏色，嘗試添加顏色以嘗試複製功能')
    return
  }

  const copyTextList = []

  const { skipIdxList } = assetsColorsToColorInfoMap(allAssetsColors, e => {
    if (!e) return

    if (e.hex) {
      copyTextList.push(`${e.name}: ${toUnoColorValue(e)}, // ${e.description}`)
    } else if (e.colorStops) {
      e.colorStops.forEach((f, i) => {
        copyTextList.push(`${e.name}_${i + 1}: ${toUnoColorValue(f)}, // ${e.description}`)
      })
    }
  })

  if (!copyTextList.length) {
    helper.showAlert('未匹配到任何可以複製的顏色！')
    return
  }

  const colorText = helper.sortColorNameList(copyTextList).join('\n  ')

  clipboard.copyText(`{
  ${colorText}
}`)

  helper.showAlert(`顏色共${allAssetsColors.length}筆已成功複製到剪貼簿！${skipIdxList.length ? `(但略過了${skipIdxList.length}筆色號未成功複製)` : ''}`)
}

function toOldUnoColorValue (color) {
  const hexColor = color.toHex(true)
  if (color.a == null || color.a === 255) return `'${hexColor}'`
  return `rgba('${hexColor}', ${helper.alphaToPercentage(color.a) / 100})`
}

/**
 * @param color {{hex: string; opacity?: number; stop?: number}}
 */
function toUnoColorValue (color) {
  if (color.opacity != null) return `rgba('${color.hex}', ${color.opacity})`
  return `'${color.hex}'`
}

function drawAssetsColors (selection, documentRoot) {
  const space = 100
  let minX = 0, minY = 0

  documentRoot.children.forEach(e => {
    const { x, y, width, height } = e.globalBounds
    if (x < minX) minX = x
    if (y < minY) minY = y
  })

  const artboard = new scenegraph.Artboard()
  let width = 500, height = 500

  artboard.name = '色塊圖'
  artboard.fill = new scenegraph.Color('#ffffff')
  artboard.moveInParentCoordinates(minX - space - width, minY)
  artboard.width = width
  artboard.height = height

  documentRoot.addChild(artboard)
}

let configPanelDom, configPanelApp
let _ddd
function showPanelConfig (event) {
  /** @type {import('./type/common.d.ts').AssetsColor[]} */
  const allAssetsColors = helper.sortColorNameList(assets.colors.get(), {
    transformElement: e => e.name || 'a00', // !name 就名字隨意讓裡面取得到職判斷就好
  })
  /** @desc key 為 colorName */
  /** @type {import('./type/common.d.ts').AllAssetsColors} */
  const allAssetsColorsMap = new Map()
  /** @type {import('./type/common.d.ts').ColorGroupItem[]} */
  const defaultGroupList = [
    { name: '未分類', colorNameList: [] },
  ]

  allAssetsColors.forEach((e) => {
    const {
      name,
      color,
      gradientType,
      colorStops,
    } = e

    const [, colorName] = name?.match(/^([A-z]+\d+).*$/) || []
    if (!colorName) return
    if (color instanceof scenegraph.Color) {
      const { r, g, b, a } = color.toRgba()
      const percentAlpha = helper.alphaToPercentage(a) / 100
      allAssetsColorsMap.set(colorName, {
        colorName,
        origin: e,
        isLightColor: helper.shouldUseBlackText(r, g, b, percentAlpha),
        colorCss: `rgba(${r}, ${g}, ${b}, ${percentAlpha})`,
      })
    } else if (gradientType) {
      const isLightColorCheckGradientStops = []
      let colorCss = gradientType === 'linear' ? 'linear-gradient(to bottom' : 'radial-gradient(circle at center'

      colorStops.forEach(({ stop, color }) => {
        const percentAlphaColor = color.toRgba()
        const percentAlpha = helper.alphaToPercentage(percentAlphaColor.a)
        percentAlphaColor.a = percentAlpha / 100

        isLightColorCheckGradientStops.push({
          stop,
          color: percentAlphaColor,
        })

        colorCss += `, rgba(${percentAlphaColor.r}, ${percentAlphaColor.g}, ${percentAlphaColor.b}, ${percentAlphaColor.a}) ${stop * 100}%`
      })

      allAssetsColorsMap.set(colorName, {
        colorName,
        origin: e,
        isLightColor: helper.shouldUseBlackTextForGradient(isLightColorCheckGradientStops),
        colorCss: colorCss + ')',
        gradientType,
      })
    }
    defaultGroupList[0].colorNameList.push(colorName)
  })

  if (configPanelDom) {
    configPanelApp._data.groupList = defaultGroupList
    return
  }

  /** @type {import('./type/vue2/vue.js').Vue} */
  const Vue = require('./lib/vue@2.7.16.min.cjs')
  require('./component/vue/color-item.js')(Vue)

  const { name: documentFilename, guid: documentGuid } = application.activeDocument

  configPanelDom = document.createElement('div')
  configPanelDom.innerHTML = '<div id="config-panel"></div>'
  event.node.appendChild(configPanelDom)

  const storageName = name => `${documentGuid}_config_panel_${name}`
  const storage = {
    groupList: helper.createValueStorage(storageName('group_list_v5'), defaultGroupList),
  }
  const vueData = {
    /** @type {import('./type/common.d.ts').SelectedXdItem[]} */
    selectedXdItemList: null,
    isCreatingGroup: false,
    inputGroupName: '',
    /** @type {import('./type/common.d.ts').ColorGroupItem[]} */
    groupList: defaultGroupList,
    // groupList: storage.groupList.defaultValue,
    /** @type {Map<string, true>} */
    collapsedGroupNameMap: new Map(),
  }

  vueData.groupList.forEach(e => {
    vueData.collapsedGroupNameMap.set(e.name, true)
  })

  configPanelApp = Vue.prototype.$cpApp = new Vue({
    el: '#config-panel',
    data: vueData,
    render(h) {
      /** @type {typeof vueData} */
      const vm = this
      const basePL = 8
      const basePR = 8
      const baseLabelStyle = { style: { fontSize: 12, paddingLeft: basePL } }

      // height: 'calc(100vh - 104px)' 可以滿高
      return h('div', { class: 'bel-app-scroll-view' }, [
        // h(
        //   'select',
        //   {
        //     attrs: { name: 'color-name' },
        //     domProps: { value: vm.selectOptionValue },
        //     on: {
        //       change(event) {
        //         vm.selectOptionValue = event.target.selectOptionValue
        //       },
        //     },
        //   },
        //   [
        //     vm.options.map(e => {
        //       const [, colorName] = e.name?.match(/^([A-z]+\d+).*$/) || []
        //       return h('option', { attrs: { value: colorName } }, e.name)
        //     })
        //   ]
        // ),
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: basePR } },
          [
            h('div', baseLabelStyle, '顏色群組'),
            // h(
            //   'div',
            //   {
            //     style: { fontSize: 18, fontWeight: 700, cursor: 'pointer' },
            //     on: {
            //       click() {
            //         vm.isCreatingGroup = !vm.isCreatingGroup
            //         if (vm.isCreatingGroup) vm.inputGroupName = ''
            //       }
            //     }
            //   },
            //   vm.isCreatingGroup ? 'x' : '+'
            // ),
          ],
        ),
        vm.isCreatingGroup && h(
          'input',
          {
            attrs: { placeholder: '請輸入要新增的群組名稱' },
            domProps: { type: vm.inputGroupName },
            on: {
              input(event) {
                vm.inputGroupName = event.target.value
              },
              keydown(event) {
                if (!(event.key === 'Enter' || event.keyCode === 13)) return

                if (vm.groupList.some(e => e.name === vm.inputGroupName)) {
                  helper.showAlert('已存在該群組，請嘗試替換其他群組名')
                  return
                }

                const newGroupList = [
                  ...vm.groupList,
                  {
                    name: vm.inputGroupName,
                    colorNameList: [],
                  },
                ]
                helper.updateVueStorageData(vm, storage, 'groupList', newGroupList)
                vm.isCreatingGroup = false
                vm.inputGroupName = ''
              },
            }
          },
        ),
        vm.groupList.length > 0 && h('hr'),
        h(
          'div',
          [
            vm.groupList.map(({ name, colorNameList }) => {
              const isCollapsed = vm.collapsedGroupNameMap.get(name)

              return h(
                'div',
                [
                  // group label
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', paddingLeft: basePL, paddingTop: 4, paddingBottom: 4 } },
                    [
                      h(
                        'div',
                        {
                          style: { cursor: 'pointer', fontWeight: 700, marginRight: 4 },
                          on: {
                            click() {
                              if (isCollapsed) vm.collapsedGroupNameMap.delete(name)
                              else vm.collapsedGroupNameMap.set(name, true)

                              vm.collapsedGroupNameMap = new Map(vm.collapsedGroupNameMap)
                            },
                          },
                        },
                        isCollapsed ? '-' : '+',
                      ),
                      h('div', { style: { fontSize: 12 } }, name),
                    ]
                  ),
                  // group 顏色列表
                  isCollapsed && !!colorNameList?.length && colorNameList.map(colorName =>
                    h('color-item', { props: { allAssetsColorsItem: allAssetsColorsMap.get(colorName) } })
                  )
                ],
              )
            }),
          ]
        ),
      ])
    }
  })
}

function updatePanelConfig (selection, documentRoot) {
  if (configPanelApp && configPanelApp._data) {
    configPanelApp._data.selectedXdItemList = !!selection?.items.length ? selection.items : []
  }

  _ddd = documentRoot
}

module.exports = {
  panels: {
    panelConfig: {
      show: showPanelConfig,
      update: updatePanelConfig,
    },
  },
  commands: {
    copyOldUnoAssetsColors,
    copyUnoAssetsColors,
    transformOldAssetsColorsToPluginType,
    importAssetsColors,
    importOldAssetsColors,
    exportAssetsColors,
    exportOldAssetsColors,
    drawAssetsColors,
  },
}
