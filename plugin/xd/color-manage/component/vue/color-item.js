const { updateNodesColor } = require('../../helper/v1.js')

/**
 * @param Vue {import('../../type/vue2/vue.js').Vue}
 */
function setupComponent(Vue) {
  const { LinearGradient, RadialGradient } = require('scenegraph')

  /**
   * @param selectedXdItemList {import('../../type/common.d.ts').SelectedXdItem[]}
   */
  function handleClick (ev) {
    const {
      /** @type {import('../../type/common.d.ts').SelectedXdItem[]} */
      selectedXdItemList,
    } = this.$cpApp._data
    const {
      /** @type {import('../../type/common.d.ts').AllAssetsColors} */
      allAssetsColorsItem,
    } = this.$props

    if (selectedXdItemList.length) {
      const target = ev.target.closest('.bel-group-color-item')
      const rect = target.getBoundingClientRect()
      const centerY = rect.top + (rect.height / 2)
      const clickY = ev.clientY
      const changeItemKey = clickY < centerY ? 'fill' : 'stroke'
      const { updateNodesColor } = require('../../helper/v1.js')

      if (allAssetsColorsItem.origin.color) {
        updateNodesColor(selectedXdItemList, changeItemKey, allAssetsColorsItem.origin.color)
      } else if (allAssetsColorsItem.origin.gradientType && changeItemKey === 'fill') {
        const gradientColor = allAssetsColorsItem.origin.gradientType === 'linear'
          ? new LinearGradient()
          : new RadialGradient()
        gradientColor.colorStops = allAssetsColorsItem.origin.colorStops
        updateNodesColor(selectedXdItemList, changeItemKey, gradientColor)
      }

      return
    }
  }

  Vue.component('color-item', {
    props: {
      allAssetsColorsItem: Object,
    },
    render(h) {
      const vm = this
      const {
        /** @type {import('../../type/common.d.ts').AllAssetsColors} */
        allAssetsColorsItem,
      } = vm.$props

      return h(
        'div',
        {
          class: 'bel-group-color-item',
          style: {
            position: 'relative',
            width: '25%',
            padding: '2',
            cursor: 'pointer',
          },
          on: {
            click: handleClick.bind(vm),
          },
        },
        [
          h(
            'div',
            {
              style: {
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '100%',
                background: allAssetsColorsItem.colorCss
                  ? allAssetsColorsItem.colorCss
                  : undefined,
                pointerEvents: 'none',
              },
            },
          ),
          h(
            'div',
            {
              style: {
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: allAssetsColorsItem.shouldBlackText ? '#000000' : '#ffffff',
                padding: 4,
              },
              on: {
                click: handleClick.bind(vm),
              }
            },
            allAssetsColorsItem.colorName,
          ),
        ]
      )
    },
  })
}


module.exports = setupComponent