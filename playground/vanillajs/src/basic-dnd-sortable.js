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
<ul>
  <li class="bel-dli" draggable="true">Apples</li>
  <li class="bel-dli" draggable="true">Orange <span>aaa <i>bbb</i></span></li>
  <li class="bel-dli" draggable="true">Bananas</li>
  <li class="bel-dli" draggable="true">Strawberries</li>
</ul>
`

export function setupBasicDndSortable (element) {
  const template = document.createElement('template')
  template.innerHTML = html
  element.append(template.content)

  let el
  const liEls = document.getElementsByTagName('li')

  for (let i = 0; i < liEls.length; i++) {
    const liEl = liEls[i]
    liEl.addEventListener('dragover', dragOver)
    liEl.addEventListener('dragstart', dragStart)
    liEl.addEventListener('dragend', dragEnd)
  }

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
}