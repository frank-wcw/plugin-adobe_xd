/// xd 插件開發文檔可參閱
/// https://developer.adobe.com/xd/uxp/develop/tutorials/quick-start/

const assets = require('assets')
const clipboard = require('clipboard')
const { Color, LinearGradient, RadialGradient, Artboard } = require('scenegraph')
const uxp = require('uxp')
const { id: pluginId } = require('./manifest.json')
const fs = uxp.storage.localFileSystem
const {
  showAlert,
  sortColorNameList,
  stringify,
  alphaToPercentage,
  createValueStorage,
  updateVueStorageData,
} = require('./helper/v1')

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

  const allAssetsColors = assets.colors.get().reduce((p, e) => {
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

        const name = `${colorName}號色 ${toColorDescName(hex, opacity)} - ${description}`

        const oldColor = allAssetsColors[colorName]
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

        const name = `${colorName}號色 ${ascStopColorStops.map(e => toColorDescName(e.hex, e.opacity)).join(' - ')} - ${description}`

        const oldColor = allAssetsColors[colorName]
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

function toColorDescName (hex, opacity) {
  return `${hex}${opacity ? `(${opacity * 100}%)` : ''}`
}

async function exportAssetsColors () {
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    showAlert('assets 沒有任一顏色，請嘗試添加顏色以導出顏色配置')
    return
  }

  const exportDataList = []

  allAssetsColors.forEach(e => {
    const [_, colorName, afterText, dash, desc] = e.name.match(/^([A-z]+\d+)(.+(\s-\s)(.*)$)?/) || []
    const description = desc || afterText || e.name

    if (e.color instanceof Color) {
      const data = {
        colorName,
        description,
        hex: e.color.toHex(true),
      }
      if (e.color.a && e.color.a !== 255) data.opacity = alphaToPercentage(e.color.a) / 100
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
          if (f.color.a && f.color.a !== 255) color.opacity = alphaToPercentage(f.color.a) / 100
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
    const resultJsonString = stringify(sortColorNameList(exportDataList, {
      transformElement: e => e.colorName
    }).reduce((p, { colorName, ...other }) => {
      p[colorName] = other
      return p
    }, {}), { maxLength: 60 })

    await file.write(resultJsonString)
  }
}

function copyAssetsColors() {
  const allAssetsColors = assets.colors.get()

  if (!allAssetsColors.length) {
    showAlert('assets 沒有任一顏色，嘗試添加顏色以嘗試複製功能')
    return
  }

  const copyTexts = []
  allAssetsColors.forEach(e => {
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

function drawAssetsColors (selection, documentRoot) {
  const space = 100
  let minX = 0, minY = 0

  documentRoot.children.forEach(e => {
    const { x, y, width, height } = e.globalBounds
    if (x < minX) minX = x
    if (y < minY) minY = y
  })

  const allAssetsColors = assets.colors.get()
  const artboard = new Artboard()
  let width = 500, height = 500

  artboard.fill = new Color('#ffffff')
  artboard.moveInParentCoordinates(minX - space - width, minY)
  artboard.width = width
  artboard.height = height

  for (let i = 0; i < allAssetsColors.length; i++) {

  }

  documentRoot.addChild(artboard)
}

let configPanelDom, configPanelApp
function showPanelConfig (event) {
  if (configPanelDom) return

  const Vue = require('./lib/vue@2.7.16.cjs')
  const application = require("application")
  const { name: documentFilename, guid: documentGuid } = application.activeDocument

  configPanelDom = document.createElement('div')
  configPanelDom.innerHTML = '<div id="config-panel"></div>'
  event.node.appendChild(configPanelDom)

  const storageName = name => `${documentGuid}_config_panel_${name}`
  const storage = {
    groupList: createValueStorage(storageName('group_list'), []),
  }
  const vueData = {
    isCreatingGroup: false,
    inputGroupName: '',
    /** @type {{ name: string; colors: { colorName: string; name: string; color: object }[] }[]} */
    groupList: storage.groupList.defaultValue,
    /** @type {Map<string, true>} */
    collapsedGroupNameMap: new Map(),
    options: assets.colors.get(),
    selectOptionValue: '',
  }

  vueData.groupList.forEach(e => {
    vueData.collapsedGroupNameMap.set(e.name, true)
  })

  configPanelApp = new Vue({
    el: '#config-panel',
    data: vueData,
    render(h) {
      /** @type {typeof vueData} */
      const vm = this
      const basePL = 8
      const basePR = 8
      const baseLabelStyle = { style: { fontSize: 12, paddingLeft: basePL } }

      return h('div', [
        h('div', baseLabelStyle, '選擇要添加到群組的色號'),
        h(
          'select',
          {
            attrs: { name: 'color-name' },
            domProps: { value: vm.selectOptionValue },
            on: {
              change(event) {
                vm.selectOptionValue = event.target.selectOptionValue
              },
            },
          },
          [
            vm.options.map(e => {
              const [, colorName] = e.name.match(/^([A-z]+\d+).*$/) || []
              return h('option', { attrs: { value: colorName } }, e.name)
            })
          ]
        ),
        h('hr'),
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: basePR } },
          [
            h('div', baseLabelStyle, '顏色群組'),
            h(
              'div',
              {
                style: { fontSize: 18, fontWeight: 700, cursor: 'pointer' },
                on: {
                  click() {
                    vm.isCreatingGroup = !vm.isCreatingGroup
                    if (vm.isCreatingGroup) vm.inputGroupName = ''
                  }
                }
              },
              vm.isCreatingGroup ? 'x' : '+'
            ),
          ],
        ),
        vm.isCreatingGroup && h(
          'input',
          {
            attrs: { placeholder: '請輸入群組名稱' },
            domProps: { type: vm.inputGroupName },
            on: {
              input(event) {
                vm.inputGroupName = event.target.value
              },
              keydown(event) {
                if (!(event.key === 'Enter' || event.keyCode === 13)) return

                if (vm.groupList.some(e => e.name === vm.inputGroupName)) {
                  showAlert('已存在該群組，請嘗試替換其他群組名')
                  return
                }

                const newGroupList = [
                  ...vm.groupList,
                  {
                    name: vm.inputGroupName,
                    colors: [],
                  },
                ]
                updateVueStorageData(vm, storage, 'groupList', newGroupList)
                vm.isCreatingGroup = false
                vm.inputGroupName = ''
              },
            }
          },
        ),
        vm.groupList.length > 0 && h('hr'),
        h(
          'div',
          { style: { paddingLeft: basePL } },
          [
            vm.groupList.map(({ name }) => {
              const isCollapsed = vm.collapsedGroupNameMap.get(name)

              return h(
                'div',
                { style: { display: 'flex', paddingTop: 4, paddingBottom: 4 } },
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
                    isCollapsed ? '-' : '+'
                  ),
                  h('div', name),
                ],
              )
            }),
          ]
        ),
        // h('button', { attrs: { 'uxp-variant': 'cta' } }, 'Apply'),
      ])
    }
  })
}

function updatePanelConfig (selection, documentRoot) {}

module.exports = {
  panels: {
    panelConfig: {
      show: showPanelConfig,
      update: updatePanelConfig,
    },
  },
  commands: {
    copyAssetsColors,
    importAssetsColors,
    exportAssetsColors,
    drawAssetsColors,
  },
}
