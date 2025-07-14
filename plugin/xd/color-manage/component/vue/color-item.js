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
      /** @type {import('../../type/common.d.ts').AllAssetsColorsItem} */
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
        /** @type {import('../../type/common.d.ts').AllAssetsColorsItem} */
        allAssetsColorsItem,
      } = vm.$props

      return h('div', { style: { display: 'flex', alignItems: 'center', padding: '4px 8px' } }, [
        h(
          'div',
          {
            style: {
              position: 'relative',
              width: 24,
              minWidth: 24,
              height: 24,
              marginRight: 8,
              border: '1px solid #c0c1cc',
              borderRadius: 3,
              overflow: 'hidden',
            },
          },
          [
            h(
              'img',
              {
                style: {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '36px',
                  height: '36px',
                },
                attrs: { src: '/img/bg_transparent_grid.png' },
              },
            ),
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  background: allAssetsColorsItem.colorCss
                    ? allAssetsColorsItem.colorCss
                    : undefined,
                },
              },
            ),
          ]
        ),
        h(
          'div',
          {
            style: {
              flex: 1,
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          allAssetsColorsItem.origin.name,
        )
      ])
    },
  })
}


module.exports = setupComponent