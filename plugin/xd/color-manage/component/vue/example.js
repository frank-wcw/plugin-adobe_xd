/**
 * @param Vue {import('../../type/vue2/vue.js').Vue}
 */
function setupComponent(Vue) {
  Vue.component('button-counter', {
    data: function () {
      return {
        count: 0,
      }
    },
    render(h) {
      const vm = this
      return h('div', { on: { click() { vm.count++ } } }, `You clicked me ${ vm.count } times.`)
    },
  })
}


module.exports = setupComponent