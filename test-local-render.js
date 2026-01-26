#!/usr/bin/env node
'use strict'

/**
 * Local test script to verify PlantUML rendering functionality
 * Tests various diagram types and output formats
 */

var plantuml = require('./lib/node-plantuml')
var fs = require('fs')
var path = require('path')
var dotResolver = require('./lib/dot-resolver')

console.log('=== PlantUML Local Render Test ===\n')

// Test cases
var testCases = [
  {
    name: 'Simple Sequence Diagram',
    code: '@startuml\nAlice -> Bob: Hello\n@enduml',
    format: 'png'
  },
  {
    name: 'Class Diagram',
    code: '@startuml\nclass Test {\n  +test()\n}\n@enduml',
    format: 'png'
  },
  {
    name: 'Activity Diagram',
    code: '@startuml\nstart\n:Hello World;\nstop\n@enduml',
    format: 'svg'
  },
  {
    name: 'Use Case Diagram',
    code: '@startuml\nactor User\nUser --> (Use Case)\n@enduml',
    format: 'png'
  }
]

// Check Graphviz
console.log('1. Checking Graphviz...')
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
if (dotPath) {
  console.log('   ✓ Graphviz found at:', dotPath)
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  if (libPath) {
    console.log('   ✓ Bundled Graphviz library path:', libPath)
  } else {
    console.log('   ℹ Using system Graphviz')
  }
} else {
  console.log('   ⚠ No Graphviz found (some diagrams may fail)')
}
console.log('')

// Create output directory
var outputDir = path.join(__dirname, 'test-output-local')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir)
}

// Run tests
var passed = 0
var failed = 0
var errors = []

testCases.forEach(function (testCase, index) {
  console.log((index + 2) + '. Testing: ' + testCase.name)
  console.log('   Code:', testCase.code.split('\n')[0] + '...')
  
  var outputFile = path.join(outputDir, 'test-' + (index + 1) + '-' + testCase.name.toLowerCase().replace(/\s+/g, '-') + '.' + testCase.format)
  
  try {
    var gen = plantuml.generate(testCase.code, {
      format: testCase.format
    })
    
    var writeStream = fs.createWriteStream(outputFile)
    gen.out.pipe(writeStream)
    
    var hasError = false
    var errorMessage = ''
    
    // Handle stderr if available (gen.err might be the child process)
    if (gen.err) {
      gen.err.on('data', function (chunk) {
        var errorText = chunk.toString()
        errorMessage += errorText
        // Don't treat warnings as errors
        if (errorText.includes('Exception') || errorText.includes('Error') || errorText.includes('管道已结束')) {
          hasError = true
        }
      })
    }
    
    // Listen to child process errors if gen is the child process
    if (gen.on && typeof gen.on === 'function') {
      gen.on('error', function (err) {
        hasError = true
        errorMessage += err.message
      })
    }
    
    writeStream.on('finish', function () {
      setTimeout(function () {
        if (fs.existsSync(outputFile)) {
          var stats = fs.statSync(outputFile)
          if (stats.size > 0) {
            // Check file signature
            var buffer = fs.readFileSync(outputFile)
            var isValid = false
            
            if (testCase.format === 'png') {
              // PNG signature: 89 50 4E 47
              isValid = buffer.length >= 8 &&
                        buffer[0] === 0x89 &&
                        buffer[1] === 0x50 &&
                        buffer[2] === 0x4E &&
                        buffer[3] === 0x47
            } else if (testCase.format === 'svg') {
              // SVG should contain <svg
              var svgText = buffer.toString('utf8', 0, Math.min(100, buffer.length))
              isValid = svgText.includes('<svg')
            }
            
            if (isValid && !hasError) {
              console.log('   ✓ PASSED - Output:', outputFile, '(' + stats.size + ' bytes)')
              passed++
            } else {
              console.log('   ✗ FAILED - Invalid output file')
              if (hasError) {
                console.log('   Error:', errorMessage.substring(0, 200))
              }
              failed++
              errors.push({
                test: testCase.name,
                error: hasError ? errorMessage.substring(0, 200) : 'Invalid file format'
              })
            }
          } else {
            console.log('   ✗ FAILED - Empty output file')
            failed++
            errors.push({
              test: testCase.name,
              error: 'Empty output file'
            })
          }
        } else {
          console.log('   ✗ FAILED - Output file not created')
          failed++
          errors.push({
            test: testCase.name,
            error: 'Output file not created'
          })
        }
        
        // Check if this is the last test
        if (index === testCases.length - 1) {
          printSummary()
        }
      }, 1000)
    })
    
    writeStream.on('error', function (err) {
      console.log('   ✗ FAILED - Write error:', err.message)
      failed++
      errors.push({
        test: testCase.name,
        error: err.message
      })
      
      if (index === testCases.length - 1) {
        printSummary()
      }
    })
    
  } catch (err) {
    console.log('   ✗ FAILED - Exception:', err.message)
    failed++
    errors.push({
      test: testCase.name,
      error: err.message
    })
    
    if (index === testCases.length - 1) {
      printSummary()
    }
  }
})

function printSummary () {
  console.log('')
  console.log('=== Test Summary ===')
  console.log('Passed:', passed)
  console.log('Failed:', failed)
  console.log('Total:', passed + failed)
  
  if (errors.length > 0) {
    console.log('')
    console.log('Errors:')
    errors.forEach(function (err) {
      console.log('  - ' + err.test + ':', err.error)
    })
  }
  
  console.log('')
  console.log('Output files saved to:', outputDir)
}

