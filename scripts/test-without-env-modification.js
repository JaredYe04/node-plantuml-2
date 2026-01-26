#!/usr/bin/env node
'use strict'

/**
 * 测试：如果 envModified 逻辑有问题会怎样
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('Test: Environment Variable Modification Logic')
console.log('='.repeat(60))
console.log('')

var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var graphvizPath = path.join(nodeModulesPath, '@node-plantuml-2', 'graphviz-win32-x64', 'graphviz', 'bin', 'dot.exe')
var jrePath = path.join(nodeModulesPath, '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')
var plantumlJar = path.join(nodeModulesPath, 'node-plantuml-2', 'vendor', 'plantuml.jar')

var testCode = '@startuml\nA -> B\n@enduml'

// 测试1：使用 envModified = true（当前逻辑）
console.log('Test 1: With envModified = true (current logic)')
var binDir = path.dirname(graphvizPath)
var env1 = Object.assign({}, process.env)
var envModified1 = true

// 设置 PATH
var pathKey1 = 'PATH'
for (var key in process.env) {
  if (key.toUpperCase() === 'PATH') {
    pathKey1 = key
    break
  }
}
var existingPath1 = env1[pathKey1] || env1.PATH || ''
env1[pathKey1] = binDir + (existingPath1 ? ';' + existingPath1 : '')
env1.PATH = env1[pathKey1]
env1.Path = env1[pathKey1]

var spawnOptions1 = { cwd: process.cwd() }
if (envModified1) {
  spawnOptions1.env = env1
}

console.log('spawnOptions.env set:', !!spawnOptions1.env)
console.log('PATH in env:', spawnOptions1.env ? spawnOptions1.env.PATH.substring(0, 200) : 'not set')
console.log('')

// 测试2：检查是否所有环境变量都被复制
console.log('Test 2: Checking if all env vars are copied...')
var env2 = Object.assign({}, process.env)
console.log('Original env keys count:', Object.keys(process.env).length)
console.log('Copied env keys count:', Object.keys(env2).length)
console.log('')

// 测试3：实际调用
console.log('Test 3: Actual PlantUML call...')
var plantumlArgs = [
  '-Djava.awt.headless=true',
  '-Dfile.encoding=UTF-8',
  '-jar', plantumlJar,
  '-tsvg',
  '-pipe',
  '-graphvizdot', graphvizPath
]

var javaProcess = childProcess.spawn(jrePath, plantumlArgs, spawnOptions1)

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
    console.error('❌ Graphviz error!')
    console.error('Error:', errorText.substring(0, 500))
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
    console.error('')
    console.error('❌ Test failed with Graphviz error!')
    console.error('')
    console.error('This means the environment variable passing is not working!')
    process.exit(1)
  }
  
  if (stdoutChunks.length > 0) {
    var stdout = Buffer.concat(stdoutChunks).toString('utf-8')
    if (stdout.includes('<svg')) {
      console.log('✅ Success!')
      console.log('Size:', Buffer.concat(stdoutChunks).length, 'bytes')
    } else {
      console.error('❌ Not valid SVG')
      process.exit(1)
    }
  } else {
    console.error('❌ No output')
    process.exit(1)
  }
})

