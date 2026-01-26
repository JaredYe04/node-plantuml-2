#!/usr/bin/env node
'use strict'

/**
 * 测试 Java 子进程是否正确继承环境变量
 * 这是关键问题：Windows 上 Java 子进程可能无法找到 DLL
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('Java Environment Variable Inheritance Test')
console.log('='.repeat(60))
console.log('')

var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var graphvizPath = path.join(nodeModulesPath, '@node-plantuml-2', 'graphviz-win32-x64', 'graphviz', 'bin', 'dot.exe')
var jrePath = path.join(nodeModulesPath, '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')
var plantumlJar = path.join(nodeModulesPath, 'node-plantuml-2', 'vendor', 'plantuml.jar')

console.log('Graphviz:', graphvizPath)
console.log('JRE:', jrePath)
console.log('PlantUML JAR:', plantumlJar)
console.log('')

// 测试1：直接调用 dot，检查 PATH
console.log('Test 1: Testing dot with PATH set...')
var binDir = path.dirname(graphvizPath)
var env = Object.assign({}, process.env)
env.PATH = binDir + ';' + (env.PATH || '')
env.Path = env.PATH

var dotTest = childProcess.spawnSync(graphvizPath, ['-V'], {
  encoding: 'utf-8',
  stdio: 'pipe',
  env: env
})

if (dotTest.stdout || dotTest.stderr) {
  console.log('✓ Dot works with PATH set')
} else {
  console.error('❌ Dot failed with PATH set')
  console.error('stdout:', dotTest.stdout)
  console.error('stderr:', dotTest.stderr)
  process.exit(1)
}

console.log('')

// 测试2：通过 Java 调用 dot，检查环境变量传递
console.log('Test 2: Testing Java -> Graphviz call...')
console.log('')

var testCode = '@startuml\nA -> B\n@enduml'
var inputFile = path.join(__dirname, '..', 'test-input.puml')
fs.writeFileSync(inputFile, testCode, 'utf-8')

var plantumlArgs = [
  '-Djava.awt.headless=true',
  '-Dfile.encoding=UTF-8',
  '-jar', plantumlJar,
  '-tsvg',
  '-pipe',
  '-graphvizdot', graphvizPath
]

console.log('Command:', jrePath, plantumlArgs.join(' '))
console.log('')
console.log('Environment PATH (first 300 chars):', env.PATH.substring(0, 300))
console.log('')

var javaProcess = childProcess.spawn(jrePath, plantumlArgs, {
  env: env,
  stdio: ['pipe', 'pipe', 'pipe']
})

var stdoutChunks = []
var stderrChunks = []

javaProcess.stdout.on('data', function (chunk) {
  stdoutChunks.push(chunk)
})

javaProcess.stderr.on('data', function (chunk) {
  stderrChunks.push(chunk)
  var errorText = chunk.toString('utf-8')
  console.log('⚠️  Java stderr:', errorText.substring(0, 300))
  
  if (errorText.includes('cannot parse result from dot') || 
      errorText.includes('IllegalStateException')) {
    console.error('')
    console.error('❌ Graphviz error detected!')
    console.error('')
    console.error('This is the exact error from MetaDoc!')
    console.error('')
    console.error('The problem is: Java subprocess cannot find Graphviz DLLs')
    console.error('Even though PATH is set, Java may not inherit it correctly')
    console.error('')
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
  console.log('')
  console.log('Java process exit code:', exitCode)
  console.log('')
  
  if (stderrChunks.length > 0) {
    var stderr = Buffer.concat(stderrChunks).toString('utf-8')
    if (stderr.includes('cannot parse result from dot')) {
      console.error('❌ Confirmed: Graphviz error occurs!')
      console.error('')
      console.error('Root cause: Java subprocess cannot access Graphviz DLLs')
      console.error('')
      console.error('Solution: We need to ensure PATH is set correctly')
      console.error('and that Java can access the DLLs')
      console.error('')
      
      // 检查是否是因为 PATH 没有正确传递
      console.log('Checking if PATH was correctly set...')
      console.log('Original PATH:', process.env.PATH ? process.env.PATH.substring(0, 200) : 'not set')
      console.log('Modified PATH:', env.PATH.substring(0, 200))
      console.log('')
      
      process.exit(1)
    }
  }
  
  if (stdoutChunks.length > 0) {
    var stdout = Buffer.concat(stdoutChunks).toString('utf-8')
    if (stdout.includes('<svg')) {
      console.log('✅ Success! SVG generated')
      console.log('Size:', Buffer.concat(stdoutChunks).length, 'bytes')
    } else {
      console.error('❌ Output is not SVG')
      console.error('Content:', stdout.substring(0, 200))
      process.exit(1)
    }
  } else {
    console.error('❌ No output')
    process.exit(1)
  }
  
  // 清理
  if (fs.existsSync(inputFile)) {
    fs.unlinkSync(inputFile)
  }
})

