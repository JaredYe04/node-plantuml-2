#!/usr/bin/env node
'use strict'

/**
 * 完整测试 MetaDoc 的调用流程
 * 模拟真实的调用场景
 */

var path = require('path')
var fs = require('fs')

// 使用 MetaDoc 项目中的实际代码
var metadocNodeModules = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc', 'node_modules')
var plantumlModulePath = path.join(metadocNodeModules, 'node-plantuml-2')

console.log('')
console.log('='.repeat(60))
console.log('Full MetaDoc Flow Test')
console.log('='.repeat(60))
console.log('')

// 设置环境变量 DEBUG_PLANTUML 以查看详细信息
process.env.DEBUG_PLANTUML = '1'

// 直接使用 MetaDoc 项目中的模块
var plantumlPath = path.join(plantumlModulePath, 'index.js')
if (!fs.existsSync(plantumlPath)) {
  console.error('❌ node-plantuml-2 not found at:', plantumlPath)
  process.exit(1)
}

// 将 node_modules 添加到 require 路径
var Module = require('module')
var originalRequire = Module.prototype.require
Module.prototype.require = function(id) {
  if (id === 'node-plantuml-2') {
    return originalRequire.call(this, plantumlPath)
  }
  return originalRequire.apply(this, arguments)
}

try {
  var plantuml = require(plantumlPath)
  
  console.log('✓ node-plantuml-2 loaded')
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
  
  // 模拟 MetaDoc 的调用：只传 format
  console.log('Calling: plantuml.generate({ format: "svg" })')
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
  console.log('✓ Code written, size:', codeBuffer.length, 'bytes')
  console.log('')
  
  // 收集输出和错误
  var chunks = []
  var errorChunks = []
  var completed = false
  
  gen.out.on('data', function (chunk) {
    chunks.push(chunk)
    console.log('📥 Received stdout chunk:', chunk.length, 'bytes')
  })
  
  if (gen.err) {
    gen.err.on('data', function (chunk) {
      errorChunks.push(chunk)
      var errorText = chunk.toString('utf-8')
      console.log('⚠️  stderr chunk:', chunk.length, 'bytes')
      // 立即打印错误，不要等到最后
      if (errorText.includes('cannot parse result from dot') || 
          errorText.includes('IllegalStateException') ||
          errorText.includes('DotStringFactory')) {
        console.error('')
        console.error('❌ Graphviz error detected in stderr!')
        console.error('Error text:', errorText.substring(0, 500))
        console.error('')
      }
    })
  }
  
  // 等待完成
  new Promise(function (resolve, reject) {
    var outEnded = false
    var errEnded = !gen.err
    var timeout = false
    
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
        timeout = true
        completed = true
        console.warn('⚠️  Timeout after 30 seconds')
        resolve()
      }
    }, 30000)
  }).then(function () {
    console.log('')
    console.log('='.repeat(60))
    console.log('Results')
    console.log('='.repeat(60))
    console.log('')
    
    // 检查错误输出
    if (errorChunks.length > 0) {
      var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
      if (errorOutput.trim()) {
        console.log('⚠️  Full stderr output:')
        console.log(errorOutput)
        console.log('')
        
        if (errorOutput.includes('cannot parse result from dot') || 
            errorOutput.includes('IllegalStateException') ||
            errorOutput.includes('DotStringFactory')) {
          console.error('❌ Graphviz error confirmed!')
          console.error('')
          console.error('This is the exact error from MetaDoc!')
          console.error('')
          console.error('Let me check what went wrong...')
          console.error('')
          
          // 检查 Graphviz 路径
          var dotResolver = require('node-plantuml-2/lib/dot-resolver')
          try {
            var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
            console.log('Graphviz detected:', dotPath)
            console.log('Graphviz exists:', fs.existsSync(dotPath))
            
            // 测试 dot 是否工作
            var childProcess = require('child_process')
            var dotTest = childProcess.spawnSync(dotPath, ['-V'], {
              encoding: 'utf-8',
              stdio: 'pipe',
              timeout: 5000
            })
            if (dotTest.stdout || dotTest.stderr) {
              console.log('Dot test output:', (dotTest.stdout || dotTest.stderr).substring(0, 100))
            }
          } catch (e) {
            console.error('Error checking Graphviz:', e.message)
          }
          
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
      console.log('✅ Test passed!')
      
      // 保存到文件
      var outputFile = path.join(__dirname, '..', 'test-output-full-metadoc.svg')
      fs.writeFileSync(outputFile, imageBuffer)
      console.log('✓ Saved to:', outputFile)
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
  
} catch (error) {
  console.error('❌ Failed to load node-plantuml-2:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}

