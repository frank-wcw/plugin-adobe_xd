import path from "node:path";
import {fileURLToPath} from "node:url";
import yargs from 'yargs'
import chokidar from 'chokidar'
import fse from 'fs-extra'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cwd = path.join(__dirname, '..')

const argv = yargs(process.argv.slice(2))
  .option({
    dir: {
      alias: 'd',
      type: 'string',
      describe: 'xd plugin 目錄位置',
      demandOption: true,
      coerce: arg => arg.replace(/\\/g, '/')
    },
    proj: {
      alias: 'p',
      type: 'string',
      describe: 'xd plugin 專案名稱',
      demandOption: true,
    },
    watch: {
      alias: 'w',
      type: 'boolean',
      describe: '是否監聽',
    },
  })
  .requiresArg('dir')
  .parseSync()

const { dir, proj: projectName, watch: isWatch } = argv

const relativeProjectPath = `plugin/xd/${projectName}`
const absoluteProjectPath = path.join(cwd, relativeProjectPath)
const xdPluginDir = path.join(dir, projectName)

run()

async function run () {
  await copyProjectToXdPluginDir()
  console.log(`已將插件檔推至您的插件目錄 ${dir}`)

  if (isWatch) {
    const watcher = chokidar.watch('.', {
      cwd: absoluteProjectPath,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {    // 添加此設定以確保檔案寫入完成
        stabilityThreshold: 300,
        pollInterval: 100
      },
      usePolling: true,      // Windows 上建議開啟
      interval: 100
    })

    watcher
      .on('add', (relativeFilepath) => {
        console.log(`[add file] and copy "${relativeFilepath}" to plugin directory`)
        copyFileToXdPluginDir(relativeFilepath)
      })
      .on('change', (relativeFilepath) => {
        console.log(`[change file] and copy "${relativeFilepath}" to plugin directory`)
        copyFileToXdPluginDir(relativeFilepath)
      })
  }
}

function copyProjectToXdPluginDir () {
  return fse.copy(absoluteProjectPath, xdPluginDir, {
    overwrite: true,
    errorOnExist: false,
  })
}

function copyFileToXdPluginDir (relativeFilepath: string) {
  return fse.copy(
    path.join(absoluteProjectPath, relativeFilepath),
    path.join(xdPluginDir, relativeFilepath),
    {
      overwrite: true,
      errorOnExist: false,
    }
  )
}
