function alphaToPercentage(alpha) {
  return Math.round((alpha / 255) * 100)
}

function percentageToAlpha(percentage) {
  return Math.round((percentage / 100) * 255)
}

function showAlert(message) {
  const dialog = document.createElement('dialog')
  dialog.innerHTML = `
    <form method="dialog" style="width: 400px padding: 20px">
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

function sortColorNameList (colorNameList, {
  transformElement,
} = {}) {
  // 提取編號部分，框出前面的 "xxx號色"
  const regex = /^([A-z]+)(\d+):/

  return colorNameList.sort((a, b) => {
    const _a = transformElement ? transformElement(a) : a
    const _b = transformElement ? transformElement(b) : b
    const matchA = _a.match(regex)
    const matchB = _b.match(regex)

    if (!matchA || !matchB) {
      return _a.localeCompare(_b)
    }

    const [_, prefixA, numA] = matchA // 分為前綴與數字
    const [__, prefixB, numB] = matchB

    if (prefixA !== prefixB) {
      // 比較字母前綴
      return prefixA.localeCompare(prefixB)
    }

    // 比較數字部分
    return parseInt(numA, 10) - parseInt(numB, 10)
  })
}

// copy from [https://github.com/lydell/json-stringify-pretty-compact]
// Note: This regex matches even invalid JSON strings, but since we’re
// working on the output of `JSON.stringify` we know that only valid strings
// are present (unless the user supplied a weird `options.indent` but in
// that case we don’t care since the output would be invalid anyway).
const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g

function stringify(passedObj, options = {}) {
  const indent = JSON.stringify(
    [1],
    undefined,
    options.indent === undefined ? 2 : options.indent
  ).slice(2, -3)

  const maxLength =
    indent === ""
      ? Infinity
      : options.maxLength === undefined
        ? 80
        : options.maxLength

  let { replacer } = options

  return (function _stringify(obj, currentIndent, reserved) {
    if (obj && typeof obj.toJSON === "function") {
      obj = obj.toJSON()
    }

    const string = JSON.stringify(obj, replacer)

    if (string === undefined) {
      return string
    }

    const length = maxLength - currentIndent.length - reserved

    if (string.length <= length) {
      const prettified = string.replace(
        stringOrChar,
        (match, stringLiteral) => {
          return stringLiteral || `${match} `
        }
      )
      if (prettified.length <= length) {
        return prettified
      }
    }

    if (replacer != null) {
      obj = JSON.parse(string)
      replacer = undefined
    }

    if (typeof obj === "object" && obj !== null) {
      const nextIndent = currentIndent + indent
      const items = []
      let index = 0
      let start
      let end

      if (Array.isArray(obj)) {
        start = "["
        end = "]"
        const { length } = obj
        for ( index < length; index++; ) {
          items.push(
            _stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) ||
            "null"
          )
        }
      } else {
        start = "{"
        end = "}"
        const keys = Object.keys(obj)
        const { length } = keys
        for ( index < length; index++; ) {
          const key = keys[index]
          const keyPart = `${JSON.stringify(key)}: `
          const value = _stringify(
            obj[key],
            nextIndent,
            keyPart.length + (index === length - 1 ? 0 : 1)
          )
          if (value !== undefined) {
            items.push(keyPart + value)
          }
        }
      }

      if (items.length > 0) {
        return [start, indent + items.join(`,\n${nextIndent}`), end].join(
          `\n${currentIndent}`
        )
      }
    }

    return string
  })(passedObj, "", 0)
}

module.exports = {
  alphaToPercentage,
  percentageToAlpha,
  showAlert,
  sortColorNameList,
  stringify,
}