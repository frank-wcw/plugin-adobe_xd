function alphaToPercentage(alpha) {
  return Math.round((alpha / 255) * 100)
}

function percentageToAlpha(percentage) {
  return Math.round((percentage / 100) * 255)
}

/**
 * 根據背景色決定文字顏色應該是黑色還是白色
 * @param {number} red - 紅色通道值 (0-255)
 * @param {number} green - 綠色通道值 (0-255)
 * @param {number} blue - 藍色通道值 (0-255)
 * @param {number} alpha - 透明度 (0-1)
 * @returns {boolean} 若應該使用黑色文字則返回 true，否則返回 false
 */
function shouldUseBlackText(red, green, blue, alpha) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const finalLuminance = (luminance * alpha) + (1 - alpha);

  return finalLuminance > 0.5;
}

/**
 * 計算漸層在特定位置的顏色，並判斷應該使用黑色還是白色文字
 * @param {Array<{
 *   stop: number,
 *   color: {r: number, g: number, b: number, a: number}
 * }>} colorStops - 漸層的顏色停止點列表
 * @param {number} [position=0.5] - 要判斷的位置（0-1）
 * @returns {boolean} 若應該使用黑色文字則返回 true，否則返回 false
 */
function shouldUseBlackTextForGradient(colorStops, position = 0.5) {
  const sortedStops = [...colorStops].sort((a, b) => a.stop - b.stop);

  let startStop = sortedStops[0];
  let endStop = sortedStops[sortedStops.length - 1];

  for (let i = 0; i < sortedStops.length - 1; i++) {
    if (position >= sortedStops[i].stop && position <= sortedStops[i + 1].stop) {
      startStop = sortedStops[i];
      endStop = sortedStops[i + 1];
      break;
    }
  }

  const stopDiff = endStop.stop - startStop.stop;
  const progress = stopDiff === 0 ? 0 : (position - startStop.stop) / stopDiff;

  const r = interpolate(startStop.color.r, endStop.color.r, progress);
  const g = interpolate(startStop.color.g, endStop.color.g, progress);
  const b = interpolate(startStop.color.b, endStop.color.b, progress);
  const a = interpolate(startStop.color.a, endStop.color.a, progress);

  return shouldUseBlackText(r, g, b, a);
}

/**
 * 計算漸層的平均顏色，並判斷應該使用黑色還是白色文字
 * @param {Array<{
 *   stop: number,
 *   color: {r: number, g: number, b: number, a: number}
 * }>} colorStops - 漸層的顏色停止點列表
 * @returns {boolean} 若應該使用黑色文字則返回 true，否則返回 false
 */
function shouldUseBlackTextForGradientAverage(colorStops) {
  let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
  let totalWeight = 0;

  for (let i = 0; i < colorStops.length - 1; i++) {
    const current = colorStops[i];
    const next = colorStops[i + 1];
    const weight = next.stop - current.stop;

    totalR += (current.color.r + next.color.r) / 2 * weight;
    totalG += (current.color.g + next.color.g) / 2 * weight;
    totalB += (current.color.b + next.color.b) / 2 * weight;
    totalA += (current.color.a + next.color.a) / 2 * weight;
    totalWeight += weight;
  }

  const avgR = totalR / totalWeight;
  const avgG = totalG / totalWeight;
  const avgB = totalB / totalWeight;
  const avgA = totalA / totalWeight;

  return shouldUseBlackText(avgR, avgG, avgB, avgA);
}

/**
 * 線性插值
 * @param {number} start - 起始值
 * @param {number} end - 結束值
 * @param {number} progress - 進度（0-1）
 * @returns {number} 插值結果
 */
function interpolate(start, end, progress) {
  return start + (end - start) * progress;
}

function showAlert(message) {
  const dialog = document.createElement('dialog')
  dialog.innerHTML = `
    <form method="dialog" style="width: 400px; padding: 20px">
      <h1>通知</h1>
      <p>${message}</p>
      <footer>
          <button id="alert-submit" uxp-variant="cta" type="submit">確定</button>
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
const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;

function stringify(passedObj, options = {}) {
  const indent = JSON.stringify(
    [1],
    undefined,
    options.indent === undefined ? 2 : options.indent
  ).slice(2, -3);

  const maxLength =
    indent === ""
      ? Infinity
      : options.maxLength === undefined
        ? 80
        : options.maxLength;

  let { replacer } = options;

  return (function _stringify(obj, currentIndent, reserved) {
    if (obj && typeof obj.toJSON === "function") {
      obj = obj.toJSON();
    }

    const string = JSON.stringify(obj, replacer);

    if (string === undefined) {
      return string;
    }

    const length = maxLength - currentIndent.length - reserved;

    if (string.length <= length) {
      const prettified = string.replace(
        stringOrChar,
        (match, stringLiteral) => {
          return stringLiteral || `${match} `;
        }
      );
      if (prettified.length <= length) {
        return prettified;
      }
    }

    if (replacer != null) {
      obj = JSON.parse(string);
      replacer = undefined;
    }

    if (typeof obj === "object" && obj !== null) {
      const nextIndent = currentIndent + indent;
      const items = [];
      let index = 0;
      let start;
      let end;

      if (Array.isArray(obj)) {
        start = "[";
        end = "]";
        const { length } = obj;
        for (; index < length; index++) {
          items.push(
            _stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) ||
            "null"
          );
        }
      } else {
        start = "{";
        end = "}";
        const keys = Object.keys(obj);
        const { length } = keys;
        for (; index < length; index++) {
          const key = keys[index];
          const keyPart = `${JSON.stringify(key)}: `;
          const value = _stringify(
            obj[key],
            nextIndent,
            keyPart.length + (index === length - 1 ? 0 : 1)
          );
          if (value !== undefined) {
            items.push(keyPart + value);
          }
        }
      }

      if (items.length > 0) {
        return [start, indent + items.join(`,\n${nextIndent}`), end].join(
          `\n${currentIndent}`
        );
      }
    }

    return string;
  })(passedObj, "", 0);
}


const storageEmptyTexts = ['undefined', 'null']

/**
 * @template T
 * @param key {string}
 * @param defaultValue {T}
 * @param storage {Storage}
 * @param ignoreEmptyText {boolean?}
 * @returns {{
 *  defaultValue: T
 *  getItem: () => T
 *  setItem: (key: string, value: T) => void
 *  removeItem: () => void
 * }}
 */
function createValueStorage (
  key,
  defaultValue,
  storage = localStorage,
  ignoreEmptyText = true,
) {
  const getItem = () => _getStorageItem(storage, key, defaultValue, ignoreEmptyText)

  return {
    defaultValue: getItem(),
    getItem,
    setItem: (value) => _setStorageItem(storage, key, value, ignoreEmptyText),
    removeItem: () => storage.removeItem(key),
  }
}

function _getStorageItem(storage, key, defaultValue, ignoreEmptyText = true) {
  const value = storage.getItem(key)

  if (value == null) return defaultValue
  if (ignoreEmptyText && storageEmptyTexts.includes(value)) return defaultValue

  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

function _setStorageItem(storage, key, value, ignoreEmptyText = true) {
  if (value == null) {
    storage.removeItem(key)
    return
  }

  try {
    const stringifyValue = JSON.stringify(value)

    if (ignoreEmptyText && storageEmptyTexts.includes(stringifyValue)) {
      storage.removeItem(key)
      return
    }

    storage.setItem(key, stringifyValue)
  } catch {
    storage.removeItem(key)
  }
}

function updateVueStorageData (vm, storage, key, value) {
  vm[key] = value
  storage[key].setItem(value)
}

module.exports = {
  alphaToPercentage,
  percentageToAlpha,
  shouldUseBlackText,
  shouldUseBlackTextForGradient,
  shouldUseBlackTextForGradientAverage,
  showAlert,
  sortColorNameList,
  stringify,
  createValueStorage,
  updateVueStorageData,
}