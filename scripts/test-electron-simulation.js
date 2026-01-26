#!/usr/bin/env node
'use strict'

/**
 * 模拟 Electron 环境测试
 * Electron 主进程可能有不同的环境变量设置
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('Electron Environment Simulation Test')
console.log('='.repeat(60))
console.log('')

// 模拟 Electron 环境：可能没有某些环境变量
var electronEnv = {}
// 只复制关键的环境变量
var keyVars = ['PATH', 'Path', 'TEMP', 'TMP', 'USERPROFILE', 'HOME', 'SystemRoot', 'WINDIR', 'ProgramFiles', 'ProgramFiles(x86)']
for (var key in process.env) {
  if (keyVars.indexOf(key) !== -1 || keyVars.indexOf(key.toUpperCase()) !== -1) {
    electronEnv[key] = process.env[key]
  }
}

console.log('Simulating Electron environment...')
console.log('Original env vars:', Object.keys(process.env).length)
console.log('Electron env vars:', Object.keys(electronEnv).length)
console.log('')

var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var graphvizPath = path.join(nodeModulesPath, '@node-plantuml-2', 'graphviz-win32-x64', 'graphviz', 'bin', 'dot.exe')
var jrePath = path.join(nodeModulesPath, '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')
var plantumlJar = path.join(nodeModulesPath, 'node-plantuml-2', 'vendor', 'plantuml.jar')

var testCode = '@startuml\nA -> B\n@enduml'

// 模拟 plantuml-executor.js 的逻辑
var binDir = path.dirname(graphvizPath)
var env = Object.assign({}, electronEnv)  // 使用 Electron 环境，而不是 process.env

// 设置 PATH
var pathKey = 'PATH'
for (var key in electronEnv) {
  if (key.toUpperCase() === 'PATH') {
    pathKey = key
    break
  }
}

var existingPath = env[pathKey] || env.PATH || ''
env[pathKey] = binDir + (existingPath ? ';' + existingPath : '')
env.PATH = env[pathKey]
env.Path = env[pathKey]

console.log('Environment setup:')
console.log('PATH key:', pathKey)
console.log('Bin directory:', binDir)
console.log('PATH (first 300 chars):', env[pathKey].substring(0, 300))
console.log('')

// 测试
var plantumlArgs = [
  '-Djava.awt.headless=true',
  '-Dfile.encoding=UTF-8',
  '-jar', plantumlJar,
  '-tsvg',
  '-pipe',
  '-graphvizdot', graphvizPath
]

console.log('Testing with Electron-like environment...')
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
  if (errorText.includes('cannot parse result from dot')) {
    hasError = true
    console.error('')
    console.error('❌ Graphviz error in Electron-like environment!')
    console.error('Error:', errorText.substring(0, 500))
    console.error('')
    console.error('This suggests the issue is with environment variable inheritance')
    console.error('in Electron main process!')
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
  }, 10000)
}).then(function (exitCode) {
  if (hasError) {
    console.error('❌ Test failed!')
    process.exit(1)
  }
  
  if (stdoutChunks.length > 0) {
    var stdout = Buffer.concat(stdoutChunks).toString('utf-8')
    if (stdout.includes('<svg')) {
      console.log('✅ Success in Electron-like environment!')
    } else {
      console.error('❌ Not valid SVG')
      process.exit(1)
    }
  } else {
    console.error('❌ No output')
    process.exit(1)
  }
})

