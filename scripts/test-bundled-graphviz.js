#!/usr/bin/env node
'use strict'

/**
 * Test script to verify bundled Graphviz works correctly
 * This test ensures we're using the bundled Graphviz from npm package,
 * not the system-installed one
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var dotResolver = require('../lib/dot-resolver')
var plantuml = require('../lib/node-plantuml')

console.log('=== Bundled Graphviz Test ===\n')
console.log('Platform:', os.platform(), os.arch())
console.log('')

// Test 1: Verify we can find bundled Graphviz
console.log('1. Checking for bundled Graphviz...')
var bundledGraphviz = dotResolver.resolveBundledGraphviz()
if (bundledGraphviz) {
  console.log('   ✓ Bundled Graphviz found:', bundledGraphviz)
  console.log('   Exists:', fs.existsSync(bundledGraphviz))
  
  // Verify it's actually bundled (not system)
  var isBundled = bundledGraphviz.includes('@node-plantuml-2/graphviz-')
  console.log('   Is bundled package:', isBundled)
  
  if (!isBundled) {
    console.log('   ⚠️  WARNING: Found Graphviz but it\'s not from bundled package!')
    console.log('   This test requires bundled Graphviz to work correctly.')
    console.log('   Please ensure Graphviz packages are installed as optional dependencies.')
    process.exit(1)
  }
  
  // Check library path for Linux/macOS
  var libPath = dotResolver.getBundledGraphvizLibPath(bundledGraphviz)
  if (libPath) {
    console.log('   Library path:', libPath)
    console.log('   Library path exists:', fs.existsSync(libPath))
  }
} else {
  console.log('   ✗ No bundled Graphviz found!')
  console.log('   This test requires bundled Graphviz to be installed.')
  console.log('   Please run: npm install')
  console.log('   Or install the appropriate Graphviz package manually:')
  var pkgName = dotResolver.getGraphvizPackageName(os.platform(), os.arch())
  if (pkgName) {
    console.log('   npm install', pkgName)
  }
  process.exit(1)
}
console.log('')

// Test 2: Force use of bundled Graphviz (bypass system detection)
console.log('2. Testing with forced bundled Graphviz path...')
var dotPath = dotResolver.resolveDotExecutable({ dotPath: bundledGraphviz })
if (dotPath === bundledGraphviz) {
  console.log('   ✓ Successfully forced bundled Graphviz')
} else {
  console.log('   ✗ Failed to force bundled Graphviz')
  console.log('   Expected:', bundledGraphviz)
  console.log('   Got:', dotPath)
  process.exit(1)
}
console.log('')

// Test 3: Test complex diagrams that REQUIRE Graphviz
console.log('3. Testing complex diagrams that REQUIRE Graphviz...')
console.log('   (These diagrams cannot be rendered without Graphviz)')
console.log('')

var outputDir = path.join(__dirname, 'test-output-bundled')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Test cases that absolutely require Graphviz
var testCases = [
  {
    name: 'Activity Diagram (requires Graphviz)',
    code: '@startuml\n!theme plain\nstart\n:Initialize;\nif (Check condition?) then (yes)\n  :Do something;\nelse (no)\n  :Do something else;\nendif\n:Finalize;\nstop\n@enduml',
    format: 'png',
    description: 'Activity diagrams with decision nodes require Graphviz'
  },
  {
    name: 'State Diagram (requires Graphviz)',
    code: '@startuml\n[*] --> State1\nState1 --> State2 : transition1\nState2 --> State3 : transition2\nState3 --> [*]\n@enduml',
    format: 'png',
    description: 'State diagrams require Graphviz for layout'
  },
  {
    name: 'Component Diagram (requires Graphviz)',
    code: '@startuml\ncomponent Component1\ncomponent Component2\ncomponent Component3\nComponent1 --> Component2 : uses\nComponent2 --> Component3 : depends on\n@enduml',
    format: 'png',
    description: 'Component diagrams require Graphviz'
  },
  {
    name: 'Use Case Diagram (requires Graphviz)',
    code: '@startuml\nactor User\nusecase "Login" as UC1\nusecase "Logout" as UC2\nusecase "View Profile" as UC3\nUser --> UC1\nUser --> UC2\nUser --> UC3\n@enduml',
    format: 'png',
    description: 'Use case diagrams require Graphviz'
  },
  {
    name: 'Complex Class Diagram (requires Graphviz)',
    code: '@startuml\nclass User {\n  -id: int\n  -name: string\n  +login()\n  +logout()\n}\nclass Admin extends User {\n  -permissions: array\n  +manageUsers()\n}\nclass Session {\n  -token: string\n  +validate()\n}\nUser --> Session : uses\n@enduml',
    format: 'png',
    description: 'Complex class diagrams with relationships require Graphviz'
  },
  {
    name: 'Deployment Diagram (requires Graphviz)',
    code: '@startuml\ndeployment "Web Server" as WS\nartifact "Web App" as WA\nartifact "Database" as DB\nWS --> WA : hosts\nWA --> DB : connects to\n@enduml',
    format: 'png',
    description: 'Deployment diagrams require Graphviz'
  },
  {
    name: 'Object Diagram (requires Graphviz)',
    code: '@startuml\nobject user1 as "User: John"\nobject user2 as "User: Jane"\nuser1 --> user2 : knows\n@enduml',
    format: 'png',
    description: 'Object diagrams require Graphviz'
  },
  {
    name: 'Timing Diagram (requires Graphviz)',
    code: '@startuml\n@startuml\ntiming "Signal A" as A\nA is high\nA is low\nA is high\n@enduml',
    format: 'png',
    description: 'Timing diagrams require Graphviz'
  }
]

var passed = 0
var failed = 0
var errors = []

function runTest(testCase, index) {
  return new Promise(function (resolve) {
    console.log('   Test ' + (index + 1) + ': ' + testCase.name)
    console.log('   Description: ' + testCase.description)
    
    var outputFile = path.join(outputDir, 'test-' + (index + 1) + '-' + testCase.name.toLowerCase().replace(/\s+/g, '-') + '.' + testCase.format)
    
    try {
      // Force use of bundled Graphviz
      var gen = plantuml.generate(testCase.code, {
        format: testCase.format,
        dot: bundledGraphviz  // Force bundled Graphviz
      })
      
      var writeStream = fs.createWriteStream(outputFile)
      gen.out.pipe(writeStream)
      
      var hasError = false
      var errorMessage = ''
      var chunks = []
      
      // Capture stderr
      if (gen.err) {
        gen.err.on('data', function (chunk) {
          var errorText = chunk.toString()
          errorMessage += errorText
          // Check for Graphviz-related errors
          if (errorText.includes('Graphviz') || 
              errorText.includes('dot') || 
              errorText.includes('管道已结束') ||
              errorText.includes('IllegalStateException') ||
              errorText.includes('Timeout')) {
            hasError = true
          }
        })
      }
      
      gen.out.on('data', function (chunk) {
        chunks.push(chunk)
      })
      
      writeStream.on('finish', function () {
        setTimeout(function () {
          if (fs.existsSync(outputFile)) {
            var stats = fs.statSync(outputFile)
            if (stats.size > 0) {
              // Validate file
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
                var svgText = buffer.toString('utf8', 0, Math.min(100, buffer.length))
                isValid = svgText.includes('<svg')
              }
              
              if (isValid && !hasError) {
                console.log('      ✓ PASSED - Output:', outputFile, '(' + stats.size + ' bytes)')
                passed++
                resolve(true)
              } else {
                console.log('      ✗ FAILED - Invalid output or error')
                if (hasError) {
                  console.log('      Error:', errorMessage.substring(0, 200))
                }
                failed++
                errors.push({
                  test: testCase.name,
                  error: hasError ? errorMessage.substring(0, 200) : 'Invalid file format'
                })
                resolve(false)
              }
            } else {
              console.log('      ✗ FAILED - Empty output file')
              failed++
              errors.push({
                test: testCase.name,
                error: 'Empty output file'
              })
              resolve(false)
            }
          } else {
            console.log('      ✗ FAILED - Output file not created')
            failed++
            errors.push({
              test: testCase.name,
              error: 'Output file not created'
            })
            resolve(false)
          }
        }, 2000)
      })
      
      writeStream.on('error', function (err) {
        console.log('      ✗ FAILED - Write error:', err.message)
        failed++
        errors.push({
          test: testCase.name,
          error: err.message
        })
        resolve(false)
      })
      
    } catch (err) {
      console.log('      ✗ FAILED - Exception:', err.message)
      failed++
      errors.push({
        test: testCase.name,
        error: err.message
      })
      resolve(false)
    }
  })
}

// Run all tests sequentially
var testPromises = []
testCases.forEach(function (testCase, index) {
  testPromises.push(runTest(testCase, index))
})

Promise.all(testPromises).then(function () {
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
  
  if (failed > 0) {
    console.log('')
    console.log('❌ Some tests failed!')
    console.log('This indicates that bundled Graphviz is not working correctly.')
    process.exit(1)
  } else {
    console.log('')
    console.log('✅ All tests passed!')
    console.log('Bundled Graphviz is working correctly.')
    process.exit(0)
  }
})

