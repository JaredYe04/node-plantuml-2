#!/usr/bin/env node
'use strict'

/**
 * 真实 MetaDoc 错误场景测试
 * 使用实际的错误代码和配置
 */

var path = require('path')
var fs = require('fs')
var childProcess = require('child_process')

console.log('')
console.log('='.repeat(60))
console.log('Real MetaDoc Error Test')
console.log('='.repeat(60))
console.log('')

// 使用 MetaDoc 项目的实际路径
var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')

// 直接使用 MetaDoc 项目中的代码
var Module = require('module')
var originalRequire = Module.prototype.require
var plantumlModulePath = path.join(nodeModulesPath, 'node-plantuml-2', 'index.js')
Module.prototype.require = function(id) {
  if (id === 'node-plantuml-2') {
    return originalRequire.call(this, plantumlModulePath)
  }
  return originalRequire.apply(this, arguments)
}

// 设置 DEBUG
process.env.DEBUG_PLANTUML = '1'

// 测试代码：37 lines / 862 characters（用户报告的错误）
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

console.log('Test code:', testCode.length, 'chars,', testCode.split('\n').length, 'lines')
console.log('')

try {
  var plantuml = require(plantumlModulePath)
  
  console.log('Calling: plantuml.generate({ format: "svg" })')
  console.log('')
  
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
  
  // 收集输出和错误
  var chunks = []
  var errorChunks = []
  var completed = false
  var hasGraphvizError = false
  
  gen.out.on('data', function (chunk) {
    chunks.push(chunk)
  })
  
  if (gen.err) {
    gen.err.on('data', function (chunk) {
      errorChunks.push(chunk)
      var errorText = chunk.toString('utf-8')
      
      // 检查是否是用户报告的错误
      if (errorText.includes('cannot parse result from dot') || 
          errorText.includes('IllegalStateException') ||
          errorText.includes('DotStringFactory') ||
          errorText.includes('GraphvizImageBuilder')) {
        hasGraphvizError = true
        console.error('')
        console.error('❌❌❌ GRAPHVIZ ERROR DETECTED! ❌❌❌')
        console.error('')
        console.error('This is the EXACT error from MetaDoc!')
        console.error('')
        console.error('Full error output:')
        console.error(errorText)
        console.error('')
      } else {
        console.log('⚠️  stderr:', errorText.substring(0, 200))
      }
    })
  }
  
  // 等待完成
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
    
    gen.out.on('error', function (err) {
      console.error('❌ stdout error:', err.message)
      if (!completed) {
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
    }, 30000)
  }).then(function () {
    console.log('')
    console.log('='.repeat(60))
    console.log('Final Results')
    console.log('='.repeat(60))
    console.log('')
    
    if (hasGraphvizError) {
      console.error('❌ TEST FAILED: Graphviz error occurred!')
      console.error('')
      console.error('This confirms the issue in MetaDoc.')
      console.error('')
      console.error('The error occurs when:')
      console.error('1. PlantUML calls Graphviz dot.exe')
      console.error('2. Graphviz runs but PlantUML cannot parse the output')
      console.error('3. This suggests Graphviz DLLs are not accessible')
      console.error('')
      console.error('Possible causes:')
      console.error('1. PATH environment variable not correctly passed to Java subprocess')
      console.error('2. Java subprocess does not inherit PATH correctly on Windows')
      console.error('3. Graphviz dot.exe cannot find its DLL dependencies')
      console.error('')
      
      // 检查实际的环境变量传递
      console.log('Checking environment variable passing...')
      var executorCode = fs.readFileSync(path.join(nodeModulesPath, 'node-plantuml-2', 'lib', 'plantuml-executor.js'), 'utf-8')
      if (executorCode.includes('spawnOptions.env = env')) {
        console.log('✓ spawnOptions.env is set')
      } else {
        console.error('❌ spawnOptions.env is NOT set!')
      }
      
      process.exit(1)
    }
    
    if (errorChunks.length > 0) {
      var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
      if (errorOutput.trim() && !hasGraphvizError) {
        console.log('⚠️  stderr output (non-critical):')
        console.log(errorOutput.substring(0, 500))
        console.log('')
      }
    }
    
    if (chunks.length === 0) {
      console.error('❌ No output generated!')
      process.exit(1)
    }
    
    var imageBuffer = Buffer.concat(chunks)
    var imageContent = imageBuffer.toString('utf-8')
    
    if (imageContent.includes('<svg')) {
      console.log('✅ SUCCESS! Valid SVG generated!')
      console.log('Size:', imageBuffer.length, 'bytes')
      console.log('')
      console.log('✅✅✅ TEST PASSED! ✅✅✅')
    } else {
      console.error('❌ Output is not valid SVG!')
      console.error('Content:', imageContent.substring(0, 500))
      process.exit(1)
    }
  })
  
} catch (error) {
  console.error('❌ Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}

