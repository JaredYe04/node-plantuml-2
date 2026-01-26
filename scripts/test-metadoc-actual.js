#!/usr/bin/env node
'use strict'

/**
 * 在 MetaDoc 项目的 node_modules 中测试实际代码
 */

var path = require('path')
var fs = require('fs')

// 使用 MetaDoc 项目中的 node-plantuml-2
var metadocNodeModules = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc', 'node_modules')
var plantumlPath = path.join(metadocNodeModules, 'node-plantuml-2')

console.log('')
console.log('='.repeat(60))
console.log('Testing MetaDoc Actual Installation')
console.log('='.repeat(60))
console.log('')

console.log('MetaDoc node_modules path:', metadocNodeModules)
console.log('PlantUML path:', plantumlPath)
console.log('')

if (!fs.existsSync(plantumlPath)) {
  console.error('❌ node-plantuml-2 not found in MetaDoc project!')
  process.exit(1)
}

// 检查 Graphviz 包
var graphvizPath = path.join(metadocNodeModules, '@node-plantuml-2', 'graphviz-win32-x64')
var jrePath = path.join(metadocNodeModules, '@node-plantuml-2', 'jre-win32-x64')

console.log('Checking Graphviz package...')
if (fs.existsSync(graphvizPath)) {
  console.log('✓ Graphviz package found:', graphvizPath)
  var dotExe = path.join(graphvizPath, 'graphviz', 'bin', 'dot.exe')
  if (fs.existsSync(dotExe)) {
    console.log('✓ dot.exe found:', dotExe)
  } else {
    console.error('❌ dot.exe not found!')
  }
} else {
  console.error('❌ Graphviz package not found!')
}

console.log('')
console.log('Checking JRE package...')
if (fs.existsSync(jrePath)) {
  console.log('✓ JRE package found:', jrePath)
  var javaExe = path.join(jrePath, 'jre', 'bin', 'java.exe')
  if (fs.existsSync(javaExe)) {
    console.log('✓ java.exe found:', javaExe)
  } else {
    console.error('❌ java.exe not found!')
  }
} else {
  console.error('❌ JRE package not found!')
}

console.log('')
console.log('Testing actual PlantUML call...')
console.log('')

// 切换到 MetaDoc 项目的 node_modules 目录
process.chdir(metadocNodeModules)

try {
  var plantuml = require('node-plantuml-2')
  
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
  
  console.log('Creating generator...')
  var gen = plantuml.generate({
    format: 'svg'
  })
  
  console.log('✓ Generator created')
  console.log('')
  
  // 写入代码
  var codeBuffer = Buffer.from(testCode, 'utf-8')
  gen.in.write(codeBuffer)
  gen.in.end()
  console.log('✓ Code written')
  console.log('')
  
  // 收集输出
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
  
  // 等待完成
  new Promise(function (resolve, reject) {
    var outEnded = false
    var errEnded = !gen.err
    
    var checkComplete = function () {
      if (outEnded && errEnded && !completed) {
        completed = true
        resolve()
      }
    }
    
    gen.out.on('end', function () {
      outEnded = true
      console.log('✓ stdout ended')
      checkComplete()
    })
    
    gen.out.on('error', function (err) {
      console.error('❌ stdout error:', err.message)
      if (!completed) {
        completed = true
        reject(err)
      }
    })
    
    if (gen.err) {
      gen.err.on('end', function () {
        errEnded = true
        console.log('✓ stderr ended')
        checkComplete()
      })
      
      gen.err.on('error', function (err) {
        console.warn('⚠️  stderr error:', err.message)
        errEnded = true
        checkComplete()
      })
    }
    
    setTimeout(function () {
      if (!completed) {
        completed = true
        console.warn('⚠️  Timeout')
        resolve()
      }
    }, 30000)
  }).then(function () {
    // 检查错误
    if (errorChunks.length > 0) {
      var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
      if (errorOutput.trim()) {
        console.log('')
        console.log('⚠️  Full stderr:')
        console.log(errorOutput)
        console.log('')
        
        if (errorOutput.includes('cannot parse result from dot') || 
            errorOutput.includes('IllegalStateException') ||
            errorOutput.includes('DotStringFactory')) {
          console.error('❌ Graphviz error detected!')
          console.error('This is the same error in MetaDoc project!')
          process.exit(1)
        }
      }
    }
    
    // 检查输出
    if (chunks.length === 0) {
      console.error('❌ No output!')
      process.exit(1)
    }
    
    var imageBuffer = Buffer.concat(chunks)
    console.log('✓ Output:', imageBuffer.length, 'bytes')
    
    var imageContent = imageBuffer.toString('utf-8')
    if (imageContent.includes('<svg')) {
      console.log('✅ Valid SVG generated!')
      console.log('✅ Test passed!')
    } else {
      console.error('❌ Not valid SVG!')
      console.error('First 500 chars:', imageContent.substring(0, 500))
      process.exit(1)
    }
  }).catch(function (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  })
  
} catch (error) {
  console.error('❌ Failed to load node-plantuml-2:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}

