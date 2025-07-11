/** @type {import('../type/vue2/vue.js').Vue} */
const Vue = require('../../lib/vue@2.7.16.min.cjs')

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