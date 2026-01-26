#!/usr/bin/env node
'use strict'

/**
 * 诊断 MetaDoc 项目中的问题
 * 检查所有可能的问题点
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('MetaDoc Issue Diagnosis')
console.log('='.repeat(60))
console.log('')

var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var plantumlPath = path.join(nodeModulesPath, 'node-plantuml-2', 'lib', 'plantuml-executor.js')

console.log('Checking plantuml-executor.js...')
if (!fs.existsSync(plantumlPath)) {
  console.error('❌ File not found:', plantumlPath)
  process.exit(1)
}

var content = fs.readFileSync(plantumlPath, 'utf-8')

// 检查关键修复
console.log('')
console.log('Checking fixes...')

var checks = {
  'opts[dotPathIndex] fix': content.includes('opts[dotPathIndex] = absoluteDotPath'),
  'dotPathIndex calculation': content.includes('dotPathIndex = 7 + i + 1'),
  'dotPathAutoDetected flag': content.includes('dotPathAutoDetected = true'),
  'Auto-detected dotPath added to opts': content.includes('opts.splice(insertIndex, 0, \'-graphvizdot\''),
  'Windows PATH fix': content.includes('env.Path = env[pathKey]'),
  'Check both argv and opts': content.includes('If not found in argv, check opts')
}

var allPassed = true
for (var check in checks) {
  if (checks[check]) {
    console.log('✓', check)
  } else {
    console.error('❌', check, '- MISSING!')
    allPassed = false
  }
}

if (!allPassed) {
  console.error('')
  console.error('❌ Some fixes are missing!')
  console.error('Please run: node scripts/patch-metadoc.js')
  process.exit(1)
}

console.log('')
console.log('✅ All fixes are present!')
console.log('')

// 检查 Graphviz 包
console.log('Checking Graphviz package...')
var graphvizPath = path.join(nodeModulesPath, '@node-plantuml-2', 'graphviz-win32-x64')
var dotExe = path.join(graphvizPath, 'graphviz', 'bin', 'dot.exe')

if (fs.existsSync(dotExe)) {
  console.log('✓ Graphviz found:', dotExe)
  
  // 测试 dot
  try {
    var dotTest = childProcess.spawnSync(dotExe, ['-V'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
      env: process.env
    })
    if (dotTest.stdout || dotTest.stderr) {
      console.log('✓ Dot works')
    } else {
      console.error('❌ Dot did not produce output')
    }
  } catch (e) {
    console.error('❌ Dot test failed:', e.message)
  }
  
  // 检查 DLL 文件
  var binDir = path.dirname(dotExe)
  var dlls = fs.readdirSync(binDir).filter(function (f) {
    return f.toLowerCase().endsWith('.dll')
  })
  console.log('✓ Found', dlls.length, 'DLL files in bin directory')
  
} else {
  console.error('❌ Graphviz not found!')
  process.exit(1)
}

console.log('')
console.log('Checking JRE package...')
var jrePath = path.join(nodeModulesPath, '@node-plantuml-2', 'jre-win32-x64')
var javaExe = path.join(jrePath, 'jre', 'bin', 'java.exe')

if (fs.existsSync(javaExe)) {
  console.log('✓ JRE found:', javaExe)
} else {
  console.error('❌ JRE not found!')
  process.exit(1)
}

console.log('')
console.log('Testing actual call with DEBUG enabled...')
console.log('')

// 设置 DEBUG 环境变量
process.env.DEBUG_PLANTUML = '1'

// 直接测试
var testCode = '@startuml\nA -> B\n@enduml'

// 使用 MetaDoc 项目中的实际模块
var Module = require('module')
var originalRequire = Module.prototype.require
var plantumlModulePath = path.join(nodeModulesPath, 'node-plantuml-2', 'index.js')
Module.prototype.require = function(id) {
  if (id === 'node-plantuml-2') {
    return originalRequire.call(this, plantumlModulePath)
  }
  return originalRequire.apply(this, arguments)
}

try {
  var plantuml = require(plantumlModulePath)
  
  var gen = plantuml.generate({
    format: 'svg'
  })
  
  var chunks = []
  var errorChunks = []
  var completed = false
  
  gen.out.on('data', function (chunk) {
    chunks.push(chunk)
  })
  
  if (gen.err) {
    gen.err.on('data', function (chunk) {
      errorChunks.push(chunk)
      var errorText = chunk.toString('utf-8')
      console.log('⚠️  stderr:', errorText.substring(0, 300))
    })
  }
  
  gen.in.write(testCode)
  gen.in.end()
  
  new Promise(function (resolve) {
    var outEnded = false
    var errEnded = !gen.err
    
    gen.out.on('end', function () {
      outEnded = true
      if (outEnded && errEnded) {
        completed = true
        resolve()
      }
    })
    
    if (gen.err) {
      gen.err.on('end', function () {
        errEnded = true
        if (outEnded && errEnded) {
          completed = true
          resolve()
        }
      })
    }
    
    setTimeout(function () {
      if (!completed) {
        completed = true
        resolve()
      }
    }, 10000)
  }).then(function () {
    if (errorChunks.length > 0) {
      var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
      if (errorOutput.includes('cannot parse result from dot')) {
        console.error('')
        console.error('❌ Graphviz error still occurs!')
        console.error('')
        console.error('This means the fix is not working in MetaDoc.')
        console.error('')
        console.error('Possible reasons:')
        console.error('1. MetaDoc is using a different code path')
        console.error('2. Environment variables are not being passed correctly')
        console.error('3. Java subprocess is not inheriting PATH correctly')
        console.error('')
        console.error('Let me check the actual command being executed...')
        console.error('')
        process.exit(1)
      }
    }
    
    if (chunks.length > 0) {
      var imageBuffer = Buffer.concat(chunks)
      var imageContent = imageBuffer.toString('utf-8')
      if (imageContent.includes('<svg')) {
        console.log('✅ Test passed! SVG generated successfully!')
        console.log('Size:', imageBuffer.length, 'bytes')
      } else {
        console.error('❌ Output is not valid SVG!')
        console.error('Content:', imageContent.substring(0, 200))
        process.exit(1)
      }
    } else {
      console.error('❌ No output generated!')
      process.exit(1)
    }
  })
  
} catch (error) {
  console.error('❌ Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}

