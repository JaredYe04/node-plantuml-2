#!/usr/bin/env node
'use strict'

/**
 * Graphviz 渲染测试脚本
 * 自动生成图片并验证内容是否正确
 */

// Try to require from installed package first, fallback to local lib
var plantuml, dotResolver, javaResolver
try {
  plantuml = require('node-plantuml-2')
  dotResolver = require('node-plantuml-2/lib/dot-resolver')
  javaResolver = require('node-plantuml-2/lib/java-resolver')
} catch (e) {
  // Fallback to local lib (for development)
  plantuml = require('./lib/node-plantuml')
  dotResolver = require('./lib/dot-resolver')
  javaResolver = require('./lib/java-resolver')
}
var fs = require('fs')
var path = require('path')
var os = require('os')

console.log('=== Graphviz 渲染测试 ===')
console.log('')

// 创建输出目录
var outputDir = path.join(__dirname, 'test-output-graphviz')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

var testResults = []
var totalTests = 0
var passedTests = 0
var failedTests = 0

function logTest(name, passed, message) {
  var status = passed ? '[OK]' : '[FAIL]'
  console.log(status, name + (message ? ': ' + message : ''))
  testResults.push({ name: name, passed: passed, message: message })
  totalTests++
  if (passed) {
    passedTests++
  } else {
    failedTests++
  }
}

function validateImage(buffer, testName) {
  if (buffer.length === 0) {
    logTest(testName, false, 'Empty output')
    return false
  }
  
  // Check PNG signature
  var isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
  if (!isPng) {
    logTest(testName, false, 'Invalid PNG signature')
    return false
  }
  
  // Check minimum size
  if (buffer.length < 500) {
    logTest(testName, false, 'Image too small (' + buffer.length + ' bytes)')
    return false
  }
  
  // Check for error messages in image (PlantUML sometimes embeds errors in images)
  var checkSize = Math.min(10000, buffer.length)
  var bufferStr = buffer.toString('utf-8', 0, checkSize)
  var errorPatterns = [
    'ERROR', 'Error', 'Exception', 'Cannot', 'Failed', 
    'syntax error', 'ParseException', 'IllegalStateException',
    'cannot parse result', 'GraphViz', 'PlantUML.*crashed'
  ]
  
  for (var i = 0; i < errorPatterns.length; i++) {
    var regex = new RegExp(errorPatterns[i], 'i')
    if (regex.test(bufferStr)) {
      // Extract error context
      var matchIndex = bufferStr.search(regex)
      var contextStart = Math.max(0, matchIndex - 100)
      var contextEnd = Math.min(bufferStr.length, matchIndex + 200)
      var context = bufferStr.substring(contextStart, contextEnd)
      logTest(testName, false, 'Error message detected: ' + errorPatterns[i] + ' (context: ' + context.substring(0, 150) + '...)')
      return false
    }
  }
  
  // Check PNG structure (IHDR chunk)
  if (buffer.length >= 16) {
    var ihdrCheck = buffer.toString('ascii', 12, 16)
    if (ihdrCheck !== 'IHDR') {
      logTest(testName, false, 'Invalid PNG structure (IHDR not found)')
      return false
    }
  }
  
  logTest(testName, true, buffer.length + ' bytes, valid PNG')
  return true
}

function testDiagram(code, format, filename, testName) {
  return new Promise(function (resolve) {
    try {
      var gen = plantuml.generate(code, { format: format })
      
      var chunks = []
      var stderrChunks = []
      var hasError = false
      var errorMessage = ''
      
      gen.out.on('data', function (chunk) {
        chunks.push(chunk)
      })
      
      gen.out.on('error', function (err) {
        hasError = true
        errorMessage = err.message
        logTest(testName, false, 'Stream error: ' + err.message)
        resolve(false)
      })
      
      // Capture stderr
      if (gen.err) {
        gen.err.on('data', function (chunk) {
          stderrChunks.push(chunk)
        })
      }
      
      gen.out.on('end', function () {
        if (hasError) {
          resolve(false)
          return
        }
        
        var buffer = Buffer.concat(chunks)
        var stderr = stderrChunks.length > 0 ? Buffer.concat(stderrChunks).toString() : ''
        
        // Check stderr for errors
        if (stderr) {
          var hasStderrError = false
          var errorPatterns = ['ERROR', 'Error', 'Exception', 'cannot parse result', 'IllegalStateException']
          for (var i = 0; i < errorPatterns.length; i++) {
            if (stderr.includes(errorPatterns[i])) {
              hasStderrError = true
              logTest(testName, false, 'Error in stderr: ' + stderr.substring(0, 300))
              resolve(false)
              return
            }
          }
        }
        
        // Validate image
        var isValid = validateImage(buffer, testName)
        
        if (isValid) {
          // Save image for inspection
          var outputPath = path.join(outputDir, filename)
          fs.writeFileSync(outputPath, buffer)
          console.log('  Saved to:', outputPath)
        } else {
          // Save anyway for debugging
          var outputPath = path.join(outputDir, filename)
          fs.writeFileSync(outputPath, buffer)
          console.log('  Saved (with errors) to:', outputPath)
        }
        
        resolve(isValid)
      })
      
      setTimeout(function () {
        if (chunks.length === 0 && !hasError) {
          logTest(testName, false, 'Timeout')
          resolve(false)
        }
      }, 30000)
      
    } catch (err) {
      logTest(testName, false, 'Exception: ' + err.message)
      resolve(false)
    }
  })
}

// Check prerequisites
console.log('1. Checking prerequisites...')
var javaPath = javaResolver.resolveJavaExecutable({})
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })

console.log('   JRE:', javaPath || 'NOT FOUND')
console.log('   Graphviz:', dotPath || 'NOT FOUND')
console.log('')

if (!javaPath) {
  console.log('[ERROR] Java not found!')
  process.exit(1)
}

if (!dotPath) {
  console.log('[WARN] Graphviz not found - some tests will be skipped')
}

// Test testdot
console.log('2. Testing PlantUML testdot...')
plantuml.testdot(function (isOk) {
  console.log('   testdot:', isOk ? 'OK' : 'FAILED')
  console.log('')
  
  if (!isOk && dotPath) {
    console.log('[WARN] testdot failed, but continuing with tests...')
    console.log('')
  }
  
  // Run tests
  console.log('3. Running diagram generation tests...')
  console.log('')
  
  var tests = [
    {
      code: '@startuml\nAlice -> Bob: Hello\n@enduml',
      format: 'png',
      filename: 'test-1-simple-sequence.png',
      name: 'Simple Sequence Diagram'
    },
    {
      code: '@startuml\nclass User {\n  -name: String\n  +getName(): String\n}\n@enduml',
      format: 'png',
      filename: 'test-2-class-diagram.png',
      name: 'Class Diagram'
    },
    {
      code: '@startuml\nstart\n:Hello World;\nstop\n@enduml',
      format: 'png',
      filename: 'test-3-activity-diagram.png',
      name: 'Activity Diagram (requires Graphviz)'
    },
    {
      code: '@startuml\n[*] --> State1\nState1 --> State2\nState2 --> [*]\n@enduml',
      format: 'png',
      filename: 'test-4-state-diagram.png',
      name: 'State Diagram (requires Graphviz)'
    },
    {
      code: '@startuml\ncomponent Component1\ncomponent Component2\nComponent1 --> Component2\n@enduml',
      format: 'png',
      filename: 'test-5-component-diagram.png',
      name: 'Component Diagram (requires Graphviz)'
    }
  ]
  
  var testPromises = []
  for (var i = 0; i < tests.length; i++) {
    testPromises.push(testDiagram(tests[i].code, tests[i].format, tests[i].filename, tests[i].name))
  }
  
  Promise.all(testPromises).then(function (results) {
    console.log('')
    console.log('=== Test Summary ===')
    console.log('Total tests:', totalTests)
    console.log('Passed:', passedTests)
    console.log('Failed:', failedTests)
    console.log('')
    
    if (failedTests > 0) {
      console.log('Failed tests:')
      for (var j = 0; j < testResults.length; j++) {
        if (!testResults[j].passed) {
          console.log('  -', testResults[j].name + ':', testResults[j].message || '')
        }
      }
      console.log('')
      console.log('Generated images saved to:', outputDir)
      console.log('Please check the images manually to see what went wrong.')
      process.exit(1)
    } else {
      console.log('✅ All tests passed!')
      console.log('Generated images saved to:', outputDir)
      process.exit(0)
    }
  })
})

