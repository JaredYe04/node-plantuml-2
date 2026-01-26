#!/usr/bin/env node
'use strict'

/**
 * 测试外部项目如何使用 node-plantuml-2
 * 模拟 MetaDoc 项目的调用方式
 */

var plantuml = require('../index.js')
var fs = require('fs')
var path = require('path')
var os = require('os')

console.log('')
console.log('='.repeat(60))
console.log('Testing External Usage (MetaDoc Style)')
console.log('='.repeat(60))
console.log('')

// 测试代码：一个需要 Graphviz 的图表
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

console.log('Test code:')
console.log(testCode)
console.log('')

// 模拟 MetaDoc 的调用方式
console.log('Testing SVG generation (MetaDoc style)...')
console.log('')

try {
  // 方式1：只传 format，不传 dot（让库自动检测）
  var gen = plantuml.generate({
    format: 'svg'
  })
  
  console.log('✓ Generator created')
  console.log('')
  
  // 写入代码
  var codeBuffer = Buffer.from(testCode, 'utf-8')
  gen.in.write(codeBuffer)
  gen.in.end()
  console.log('✓ Code written to generator')
  console.log('')
  
  // 收集输出
  var chunks = []
  var errorChunks = []
  
  gen.out.on('data', function (chunk) {
    chunks.push(chunk)
  })
  
  if (gen.err) {
    gen.err.on('data', function (chunk) {
      errorChunks.push(chunk)
      console.log('⚠️  stderr data received:', chunk.length, 'bytes')
    })
  }
  
  // 等待完成
  new Promise(function (resolve, reject) {
    var outEnded = false
    var errEnded = !gen.err
    
    var checkComplete = function () {
      if (outEnded && errEnded) {
        resolve()
      }
    }
    
    gen.out.on('end', function () {
      outEnded = true
      console.log('✓ stdout stream ended')
      checkComplete()
    })
    
    gen.out.on('error', function (err) {
      console.error('❌ stdout error:', err.message)
      reject(err)
    })
    
    if (gen.err) {
      gen.err.on('end', function () {
        errEnded = true
        console.log('✓ stderr stream ended')
        checkComplete()
      })
      
      gen.err.on('error', function (err) {
        console.warn('⚠️  stderr error:', err.message)
        errEnded = true
        checkComplete()
      })
    }
    
    // 超时保护
    setTimeout(function () {
      if (!outEnded || !errEnded) {
        console.warn('⚠️  Timeout waiting for completion')
        resolve()
      }
    }, 30000)
  })
  
  // 检查错误输出
  if (errorChunks.length > 0) {
    var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
    if (errorOutput.trim()) {
      console.log('')
      console.log('⚠️  stderr output:')
      console.log(errorOutput.substring(0, 500))
      console.log('')
      
      // 检查是否是 Graphviz 错误
      if (errorOutput.includes('cannot parse result from dot') || 
          errorOutput.includes('IllegalStateException') ||
          errorOutput.includes('Graphviz')) {
        console.error('❌ Graphviz error detected!')
        console.error('This is the same error reported by the user.')
        console.error('')
        console.error('Possible causes:')
        console.error('1. Graphviz dot executable not found or not in PATH')
        console.error('2. Graphviz DLLs not found (Windows)')
        console.error('3. Graphviz version incompatible')
        console.error('4. Environment variables not set correctly')
        console.error('')
      }
    }
  }
  
  // 检查输出
  if (chunks.length === 0) {
    console.error('❌ No output generated!')
    process.exit(1)
  }
  
  var imageBuffer = Buffer.concat(chunks)
  console.log('✓ Output generated:', imageBuffer.length, 'bytes')
  console.log('')
  
  // 验证输出
  var imageContent = imageBuffer.toString('utf-8')
  if (imageContent.includes('<svg')) {
    console.log('✅ Valid SVG generated!')
    
    // 保存到文件
    var outputFile = path.join(__dirname, '..', 'test-output-external-usage.svg')
    fs.writeFileSync(outputFile, imageBuffer)
    console.log('✓ Saved to:', outputFile)
  } else {
    console.error('❌ Output is not valid SVG!')
    console.error('First 200 chars:', imageContent.substring(0, 200))
    process.exit(1)
  }
  
  console.log('')
  console.log('✅ Test passed!')
  
} catch (error) {
  console.error('❌ Test failed:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}

