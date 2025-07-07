const html = `
<style>
ul {
  list-style: none;
  font: 16px Arial, Helvetica, sans-serif;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  height: 100%;
  padding: 40px 10vw;
}

li {
  cursor: pointer;
  user-select: none;
  color: #1C94C4;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background-color: #f6f6f6;
  padding: 10px;
  width: 100%;
  margin: 4px 0;
  text-align: center;
}

.hidden {
  color: transparent;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  background-color: transparent;
}
</style>
<div id="sort-app"></div>
`

export function setupVue2BasicDndSortable (element) {
  const script = document.createElement('script')
  script.src = '/lib/vue@2.7.16.min.js'
  script.onload = () => {
    const template = document.createElement('template')
    template.innerHTML = html
    element.append(template.content)

    new Vue({
      el: '#sort-app',
      render(h) {
        const vm = this
        let el

        function dragOver(ev) {
          ev.preventDefault()
          el.classList.add('hidden')

          const target = ev.target.closest('.bel-dli')
          if (isBefore(el, target))
            target.parentNode.insertBefore(el, target)
          else
            target.parentNode.insertBefore(el, target.nextSibling)
        }

        function dragEnd() {
          el.classList.remove('hidden')
          el = null
        }

        function dragStart(ev) {
          el = ev.target.closest('.bel-dli')
        }

        function isBefore(el1, el2) {
          if (el1.parentNode === el2.parentNode)
            for (let cur = el1.previousSibling; cur; cur = cur.previousSibling)
              if (cur === el2)
                return true;
          return false;
        }

        const itemAttrs = {
          class: 'bel-dli',
          attrs: { draggable: 'true' },
          on: { dragstart: dragStart, dragover: dragOver, dragend: dragEnd },
        }

        return h(
          'ul',
          [
            h('li', itemAttrs, 'Apples'),
            h('li', itemAttrs, 'Orange'),
            h('li', itemAttrs, 'Bananas'),
            h('li', itemAttrs, 'Strawberries'),
          ]
        )
      },
    })
  }
  document.head.append(script)
}