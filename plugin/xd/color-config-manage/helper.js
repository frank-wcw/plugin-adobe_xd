function alphaToPercentage(alpha) {
  return Math.round((alpha / 255) * 100)
}

function percentageToAlpha(percentage) {
  return Math.round((percentage / 100) * 255)
}

function showAlert(message) {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <form method="dialog" style="width: 400px; padding: 20px;">
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

module.exports = {
  alphaToPercentage,
  percentageToAlpha,
  showAlert,
}