#!/usr/bin/env node
'use strict'

/**
 * 测试实际错误场景
 * 模拟用户报告的确切错误
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('Actual Error Scenario Test')
console.log('='.repeat(60))
console.log('')

// 使用 MetaDoc 项目的实际路径
var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var graphvizPath = path.join(nodeModulesPath, '@node-plantuml-2', 'graphviz-win32-x64', 'graphviz', 'bin', 'dot.exe')
var jrePath = path.join(nodeModulesPath, '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')
var plantumlJar = path.join(nodeModulesPath, 'node-plantuml-2', 'vendor', 'plantuml.jar')

// 测试代码：37 lines / 862 characters（用户报告的错误信息）
var testCode = `@startuml
!theme plain
start
:Initialize;
if (Check condition?) then (yes)
  :Process A;
  :More processing;
  if (Another check?) then (yes)
    :Sub-process A1;
  else (no)
    :Sub-process A2;
  endif
else (no)
  :Process B;
  :More processing B;
endif
:Finalize;
stop
@enduml`

console.log('Test code length:', testCode.length, 'chars')
console.log('Test code lines:', testCode.split('\n').length)
console.log('')

// 关键测试：检查环境变量是否正确传递
console.log('Testing environment variable passing...')
console.log('')

var binDir = path.dirname(graphvizPath)
var env = Object.assign({}, process.env)

// 模拟 plantuml-executor.js 的逻辑
var pathKey = 'PATH'
for (var key in process.env) {
  if (key.toUpperCase() === 'PATH') {
    pathKey = key
    break
  }
}

var existingPath = env[pathKey] || env.PATH || ''
var pathEntries = existingPath.split(';')
var alreadyInPath = false

for (var j = 0; j < pathEntries.length; j++) {
  var normalizedEntry = pathEntries[j].replace(/\//g, '\\').toLowerCase().trim()
  var normalizedBinDir = binDir.toLowerCase().trim()
  if (normalizedEntry && normalizedEntry === normalizedBinDir) {
    alreadyInPath = true
    break
  }
}

if (!alreadyInPath) {
  env[pathKey] = binDir + (existingPath ? ';' + existingPath : '')
  env.PATH = env[pathKey]
  env.Path = env[pathKey]
}

console.log('PATH key:', pathKey)
console.log('Bin directory:', binDir)
console.log('PATH (first 300 chars):', env[pathKey].substring(0, 300))
console.log('')

// 测试：直接调用 PlantUML，看看是否会出现错误
console.log('Testing PlantUML call...')
console.log('')

var plantumlArgs = [
  '-Dplantuml.include.path=' + process.cwd(),
  '-Djava.awt.headless=true',
  '-Dfile.encoding=UTF-8',
  '-Duser.language=en',
  '-Duser.country=US',
  '-jar', plantumlJar,
  '-tsvg',
  '-pipe',
  '-graphvizdot', graphvizPath
]

console.log('Command:', jrePath, plantumlArgs.join(' '))
console.log('')

var javaProcess = childProcess.spawn(jrePath, plantumlArgs, {
  env: env,
  stdio: ['pipe', 'pipe', 'pipe']
})

var stdoutChunks = []
var stderrChunks = []
var hasError = false

javaProcess.stdout.on('data', function (chunk) {
  stdoutChunks.push(chunk)
})

javaProcess.stderr.on('data', function (chunk) {
  stderrChunks.push(chunk)
  var errorText = chunk.toString('utf-8')
  
  // 检查是否是用户报告的错误
  if (errorText.includes('cannot parse result from dot') || 
      errorText.includes('IllegalStateException') ||
      errorText.includes('DotStringFactory')) {
    hasError = true
    console.error('')
    console.error('❌ ERROR DETECTED!')
    console.error('')
    console.error('This is the exact error from MetaDoc!')
    console.error('')
    console.error('Error output:')
    console.error(errorText)
    console.error('')
    
    // 分析错误原因
    console.error('Analysis:')
    console.error('1. PlantUML is calling Graphviz dot.exe')
    console.error('2. Graphviz is running but PlantUML cannot parse the output')
    console.error('3. This suggests:')
    console.error('   a) Graphviz output format is incompatible')
    console.error('   b) Graphviz is failing silently (DLL issue)')
    console.error('   c) Environment variables not passed to Graphviz subprocess')
    console.error('')
    
    // 检查 Graphviz 是否真的能工作
    console.log('Checking if Graphviz works directly...')
    var dotTest = childProcess.spawnSync(graphvizPath, ['-V'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: env
    })
    if (dotTest.stdout || dotTest.stderr) {
      console.log('✓ Graphviz works directly')
    } else {
      console.error('❌ Graphviz does not work!')
    }
  } else {
    console.log('⚠️  stderr:', errorText.substring(0, 200))
  }
})

javaProcess.stdin.write(testCode)
javaProcess.stdin.end()

new Promise(function (resolve) {
  javaProcess.on('close', function (code) {
    resolve(code)
  })
  
  setTimeout(function () {
    if (javaProcess.exitCode === null) {
      javaProcess.kill()
      resolve(-1)
    }
  }, 30000)
}).then(function (exitCode) {
  console.log('')
  console.log('Exit code:', exitCode)
  console.log('')
  
  if (hasError) {
    console.error('❌ Test failed with Graphviz error!')
    console.error('')
    console.error('This confirms the issue in MetaDoc.')
    console.error('')
    process.exit(1)
  }
  
  if (stderrChunks.length > 0) {
    var stderr = Buffer.concat(stderrChunks).toString('utf-8')
    console.log('Full stderr:')
    console.log(stderr)
    console.log('')
  }
  
  if (stdoutChunks.length > 0) {
    var stdout = Buffer.concat(stdoutChunks).toString('utf-8')
    if (stdout.includes('<svg')) {
      console.log('✅ Success! SVG generated')
      console.log('Size:', Buffer.concat(stdoutChunks).length, 'bytes')
      console.log('✅ Test passed!')
    } else {
      console.error('❌ Output is not SVG')
      console.error('Content:', stdout.substring(0, 500))
      process.exit(1)
    }
  } else {
    console.error('❌ No output')
    process.exit(1)
  }
})

