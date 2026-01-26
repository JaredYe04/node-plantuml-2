#!/usr/bin/env node
'use strict'

/**
 * 直接测试 MetaDoc 项目中的调用
 * 使用实际的路径和代码
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('Direct Test in MetaDoc Project')
console.log('='.repeat(60))
console.log('')

// 使用 MetaDoc 项目的实际路径
var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var plantumlModulePath = path.join(nodeModulesPath, 'node-plantuml-2')

console.log('MetaDoc root:', metadocRoot)
console.log('PlantUML module:', plantumlModulePath)
console.log('')

// 检查文件是否存在
if (!fs.existsSync(plantumlModulePath)) {
  console.error('❌ node-plantuml-2 not found!')
  process.exit(1)
}

// 检查 Graphviz
var graphvizPath = path.join(nodeModulesPath, '@node-plantuml-2', 'graphviz-win32-x64', 'graphviz', 'bin', 'dot.exe')
var jrePath = path.join(nodeModulesPath, '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')

console.log('Checking Graphviz...')
if (fs.existsSync(graphvizPath)) {
  console.log('✓ Graphviz found:', graphvizPath)
} else {
  console.error('❌ Graphviz not found!')
  process.exit(1)
}

console.log('Checking JRE...')
if (fs.existsSync(jrePath)) {
  console.log('✓ JRE found:', jrePath)
} else {
  console.error('❌ JRE not found!')
  process.exit(1)
}

console.log('')
console.log('Testing dot executable...')
try {
  var dotTest = childProcess.spawnSync(graphvizPath, ['-V'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 5000
  })
  if (dotTest.stdout || dotTest.stderr) {
    var version = (dotTest.stdout || dotTest.stderr || '').trim().split('\n')[0]
    console.log('✓ Dot works:', version)
  } else {
    console.error('❌ Dot did not produce output')
    process.exit(1)
  }
} catch (e) {
  console.error('❌ Dot test failed:', e.message)
  process.exit(1)
}

console.log('')
console.log('Testing Java executable...')
try {
  var javaTest = childProcess.spawnSync(jrePath, ['-version'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 5000
  })
  if (javaTest.stdout || javaTest.stderr) {
    var version = (javaTest.stdout || javaTest.stderr || '').trim().split('\n')[0]
    console.log('✓ Java works:', version)
  } else {
    console.error('❌ Java did not produce output')
    process.exit(1)
  }
} catch (e) {
  console.error('❌ Java test failed:', e.message)
  process.exit(1)
}

console.log('')
console.log('Testing PlantUML with Graphviz...')
console.log('')

// 创建测试代码
var testCode = `@startuml
!theme plain
start
:Initialize;
if (Check condition?) then (yes)
  :Process A;
else (no)
  :Process B;
endif
stop
@enduml`

// 创建临时文件
var tempDir = path.join(metadocRoot, 'temp-test')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

var inputFile = path.join(tempDir, 'test.puml')
fs.writeFileSync(inputFile, testCode, 'utf-8')

// 获取 PlantUML JAR
var plantumlJar = path.join(plantumlModulePath, 'vendor', 'plantuml.jar')
if (!fs.existsSync(plantumlJar)) {
  console.error('❌ PlantUML JAR not found:', plantumlJar)
  process.exit(1)
}

console.log('PlantUML JAR:', plantumlJar)
console.log('Input file:', inputFile)
console.log('')

// 设置环境变量
var binDir = path.dirname(graphvizPath)
var env = Object.assign({}, process.env)
env.PATH = binDir + ';' + (env.PATH || '')
env.Path = env.PATH

console.log('Environment:')
console.log('  PATH (first 200 chars):', env.PATH.substring(0, 200))
console.log('')

// 运行 PlantUML
var outputFile = path.join(tempDir, 'test.svg')
var plantumlArgs = [
  '-Djava.awt.headless=true',
  '-Dfile.encoding=UTF-8',
  '-jar', plantumlJar,
  '-tsvg',
  '-o', tempDir,
  '-graphvizdot', graphvizPath,
  inputFile
]

console.log('Running PlantUML...')
console.log('Command:', jrePath, plantumlArgs.join(' '))
console.log('')

var result = childProcess.spawnSync(jrePath, plantumlArgs, {
  cwd: tempDir,
  env: env,
  encoding: 'utf-8',
  stdio: 'pipe',
  timeout: 30000
})

console.log('Exit code:', result.status)
console.log('')

if (result.stdout) {
  console.log('stdout:', result.stdout.substring(0, 500))
  console.log('')
}

if (result.stderr) {
  var stderr = result.stderr
  console.log('stderr:', stderr.substring(0, 1000))
  console.log('')
  
  if (stderr.includes('cannot parse result from dot') || 
      stderr.includes('IllegalStateException') ||
      stderr.includes('DotStringFactory')) {
    console.error('❌ Graphviz error detected!')
    console.error('This is the same error in MetaDoc!')
    console.error('')
    console.error('Possible causes:')
    console.error('1. PATH environment variable not set correctly')
    console.error('2. DLL files not found by dot.exe')
    console.error('3. Graphviz version incompatibility')
    console.error('')
    
    // 检查 DLL 文件
    console.log('Checking DLL files in bin directory...')
    var dlls = fs.readdirSync(binDir).filter(function (f) {
      return f.toLowerCase().endsWith('.dll')
    })
    console.log('Found', dlls.length, 'DLL files')
    if (dlls.length === 0) {
      console.error('❌ No DLL files found! This is the problem!')
    }
    
    process.exit(1)
  }
}

// 检查输出文件
var expectedOutput = path.join(tempDir, 'test.svg')
if (fs.existsSync(expectedOutput)) {
  var stats = fs.statSync(expectedOutput)
  if (stats.size > 0) {
    console.log('✅ Output file created:', expectedOutput)
    console.log('Size:', stats.size, 'bytes')
    console.log('✅ Test passed!')
    
    // 清理
    fs.unlinkSync(inputFile)
    // fs.unlinkSync(expectedOutput)  // 保留输出文件供检查
  } else {
    console.error('❌ Output file is empty!')
    process.exit(1)
  }
} else {
  console.error('❌ Output file not created!')
  console.error('Expected:', expectedOutput)
  process.exit(1)
}

