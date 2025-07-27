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

const relativePluginXdPath = 'src'
const helperName = '__helper__'
const relativeProjectPath = `${relativePluginXdPath}/${projectName}`
const relativeHelperPath = `${relativePluginXdPath}/${helperName}`
const pluginXdPath = path.join(cwd, relativePluginXdPath)
const projectPath = path.join(cwd, relativeProjectPath)
const xdPluginDir = path.join(dir, projectName)

run()

async function run () {
  await copyProjectToXdPluginDir()
  console.log(`已將插件檔(${projectName})與 helper(${helperName}) 推至您的插件目錄 ${dir}`)

  if (isWatch) {
    const watcher = chokidar.watch([
      projectName,
      helperName,
    ], {
      cwd: pluginXdPath,
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
        console.log(`[add file] and copy "${relativeFilepath}" to goal directory`)
        copyFileToXdPluginDir(relativeFilepath)
      })
      .on('change', (relativeFilepath) => {
        console.log(`[change file] and copy "${relativeFilepath}" to goal directory`)
        copyFileToXdPluginDir(relativeFilepath)
      })
  }
}

async function copyProjectToXdPluginDir () {
  const projectHelperPath = path.join(relativeProjectPath, 'helper')

  await Promise.all([
    fse.copy(projectPath, xdPluginDir, {
      overwrite: true,
      errorOnExist: false,
    }),
    fse.copy(relativeHelperPath, projectHelperPath, {
      overwrite: true,
      errorOnExist: false,
    }),
  ])

  const helperGitIgnorePath = path.join(projectHelperPath, '.gitignore')
  if (!fse.existsSync(helperGitIgnorePath)) {
    fse.writeFileSync(helperGitIgnorePath, '*')
  }
}

async function copyFileToXdPluginDir (relativeFilepath: string) {
  if (relativeFilepath.startsWith(helperName)) {
    const noHelperNameRelativeFilepath = relativeFilepath.substring(helperName.length + 1)
    const pluginProjectPathList = (await fse.readdir(pluginXdPath)).filter(e => e !== helperName)

    return Promise.all(
      pluginProjectPathList.map(e => fse.copy(
        path.join(pluginXdPath, relativeFilepath),
        path.join(pluginXdPath, e, 'helper', noHelperNameRelativeFilepath),
        {
          overwrite: true,
          errorOnExist: false,
        }
      ))
    )
  } else {
    return fse.copy(
      path.join(pluginXdPath, relativeFilepath),
      path.join(dir, relativeFilepath),
      {
        overwrite: true,
        errorOnExist: false,
      }
    )
  }
}
