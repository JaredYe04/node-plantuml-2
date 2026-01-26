#!/usr/bin/env node
'use strict'

/**
 * 测试复杂的需要 Graphviz 的图表
 * 模拟用户实际使用的场景
 */

var path = require('path')
var fs = require('fs')

var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var nodeModulesPath = path.join(metadocRoot, 'node_modules')
var plantumlModulePath = path.join(nodeModulesPath, 'node-plantuml-2', 'index.js')

// 设置 DEBUG
process.env.DEBUG_PLANTUML = '1'

// 使用 MetaDoc 项目中的实际模块
var Module = require('module')
var originalRequire = Module.prototype.require
Module.prototype.require = function(id) {
  if (id === 'node-plantuml-2') {
    return originalRequire.call(this, plantumlModulePath)
  }
  return originalRequire.apply(this, arguments)
}

console.log('')
console.log('='.repeat(60))
console.log('Complex Diagram Test (Real User Scenario)')
console.log('='.repeat(60))
console.log('')

// 测试多个复杂的需要 Graphviz 的图表
var testCases = [
  {
    name: 'Activity Diagram with conditions',
    code: `@startuml
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
  },
  {
    name: 'State Diagram',
    code: `@startuml
!theme plain
[*] --> State1
State1 --> State2 : transition1
State2 --> State3 : transition2
State3 --> [*]
@enduml`
  },
  {
    name: 'Component Diagram',
    code: `@startuml
!theme plain
component [Component A]
component [Component B]
[Component A] --> [Component B]
@enduml`
  },
  {
    name: 'Complex Activity with loops',
    code: `@startuml
!theme plain
start
repeat
  :Read data;
  :Process data;
repeat while (More data?) is (yes)
->no;
:Finalize;
stop
@enduml`
  }
]

var passed = 0
var failed = 0
var errors = []

function testDiagram(name, code) {
  return new Promise(function (resolve) {
    console.log('Testing:', name)
    console.log('Code length:', code.length, 'chars')
    console.log('')
    
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
        })
      }
      
      gen.in.write(code)
      gen.in.end()
      
      new Promise(function (resolveInner) {
        var outEnded = false
        var errEnded = !gen.err
        
        gen.out.on('end', function () {
          outEnded = true
          if (outEnded && errEnded) {
            completed = true
            resolveInner()
          }
        })
        
        if (gen.err) {
          gen.err.on('end', function () {
            errEnded = true
            if (outEnded && errEnded) {
              completed = true
              resolveInner()
            }
          })
        }
        
        setTimeout(function () {
          if (!completed) {
            completed = true
            resolveInner()
          }
        }, 30000)
      }).then(function () {
        if (errorChunks.length > 0) {
          var errorOutput = Buffer.concat(errorChunks).toString('utf-8')
          if (errorOutput.includes('cannot parse result from dot') || 
              errorOutput.includes('IllegalStateException') ||
              errorOutput.includes('DotStringFactory')) {
            console.error('❌ Graphviz error!')
            console.error('Error:', errorOutput.substring(0, 500))
            console.error('')
            failed++
            errors.push({ name: name, error: errorOutput.substring(0, 500) })
            resolve()
            return
          }
        }
        
        if (chunks.length === 0) {
          console.error('❌ No output!')
          failed++
          errors.push({ name: name, error: 'No output generated' })
          resolve()
          return
        }
        
        var imageBuffer = Buffer.concat(chunks)
        var imageContent = imageBuffer.toString('utf-8')
        if (imageContent.includes('<svg')) {
          console.log('✅ Passed! Size:', imageBuffer.length, 'bytes')
          passed++
        } else {
          console.error('❌ Not valid SVG!')
          console.error('Content:', imageContent.substring(0, 200))
          failed++
          errors.push({ name: name, error: 'Not valid SVG: ' + imageContent.substring(0, 200) })
        }
        console.log('')
        resolve()
      })
    } catch (error) {
      console.error('❌ Error:', error.message)
      failed++
      errors.push({ name: name, error: error.message })
      console.log('')
      resolve()
    }
  })
}

// 运行所有测试
async function runTests() {
  for (var i = 0; i < testCases.length; i++) {
    await testDiagram(testCases[i].name, testCases[i].code)
    // 等待一下，避免资源竞争
    await new Promise(function (resolve) {
      setTimeout(resolve, 500)
    })
  }
  
  console.log('')
  console.log('='.repeat(60))
  console.log('Test Summary')
  console.log('='.repeat(60))
  console.log('Total:', testCases.length)
  console.log('Passed:', passed)
  console.log('Failed:', failed)
  console.log('')
  
  if (failed > 0) {
    console.error('❌ Some tests failed!')
    console.error('')
    console.error('Failed tests:')
    errors.forEach(function (err) {
      console.error('  -', err.name + ':', err.error.substring(0, 100))
    })
    process.exit(1)
  } else {
    console.log('✅ All tests passed!')
    process.exit(0)
  }
}

runTests().catch(function (error) {
  console.error('❌ Test runner error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
})

