#!/usr/bin/env node
'use strict'

/**
 * 模拟 MetaDoc 项目的调用方式
 * 测试 Graphviz 是否正确配置
 */

var plantuml = require('../index.js')
var fs = require('fs')
var path = require('path')

console.log('')
console.log('='.repeat(60))
console.log('MetaDoc Simulation Test')
console.log('='.repeat(60))
console.log('')

// 测试代码：需要 Graphviz 的活动图
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

// 模拟 MetaDoc 的调用方式：只传 format，不传 dot
console.log('Simulating MetaDoc call: plantuml.generate({ format: "svg" })')
console.log('')

var gen = plantuml.generate({
  format: 'svg'
})

console.log('✓ Generator created')
console.log('')

// 写入代码（模拟 MetaDoc 的方式）
var codeBuffer = Buffer.from(testCode, 'utf-8')
gen.in.write(codeBuffer)
gen.in.end()
console.log('✓ Code written to generator')
console.log('')

// 收集输出和错误
var chunks = []
var errorChunks = []

gen.out.on('data', function (chunk) {
  chunks.push(chunk)
})

if (gen.err) {
  gen.err.on('data', function (chunk) {
    errorChunks.push(chunk)
    var errorText = chunk.toString('utf-8')
    console.log('⚠️  stderr:', errorText.substring(0, 200))
  })
}

// 等待完成
var completed = false
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
    console.log('✓ stdout stream ended')
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
    if (!completed) {
      completed = true
      console.warn('⚠️  Timeout waiting for completion')
      resolve()
    }
  }, 30000)
}).then(function () {
  // 检查错误输出
  if (errorChunks.length > 0) {
    var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
    if (errorOutput.trim()) {
      console.log('')
      console.log('⚠️  Full stderr output:')
      console.log(errorOutput)
      console.log('')
      
      // 检查是否是 Graphviz 错误
      if (errorOutput.includes('cannot parse result from dot') || 
          errorOutput.includes('IllegalStateException') ||
          errorOutput.includes('Graphviz') ||
          errorOutput.includes('DotStringFactory')) {
        console.error('❌ Graphviz error detected!')
        console.error('This matches the error reported by the user.')
        console.error('')
        console.error('The error occurs in:')
        console.error('  - DotStringFactory.solve()')
        console.error('  - GraphvizImageBuilder.buildImage()')
        console.error('')
        console.error('This suggests:')
        console.error('1. Graphviz dot executable is being called')
        console.error('2. But PlantUML cannot parse the output from Graphviz')
        console.error('3. This could be due to:')
        console.error('   a) Graphviz version incompatibility')
        console.error('   b) Missing DLLs (Windows)')
        console.error('   c) Environment variables not set correctly')
        console.error('   d) Graphviz output format issue')
        console.error('')
        process.exit(1)
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
    var outputFile = path.join(__dirname, '..', 'test-output-metadoc-simulation.svg')
    fs.writeFileSync(outputFile, imageBuffer)
    console.log('✓ Saved to:', outputFile)
    console.log('')
    console.log('✅ Test passed!')
  } else {
    console.error('❌ Output is not valid SVG!')
    console.error('First 500 chars:', imageContent.substring(0, 500))
    process.exit(1)
  }
}).catch(function (error) {
  console.error('❌ Test failed:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
})

