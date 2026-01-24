#!/usr/bin/env node
'use strict'

/**
 * Full integration test
 * Tests the complete flow with bundled JRE
 */

var plantuml = require('../lib/node-plantuml')
var path = require('path')
var fs = require('fs')

console.log('=== Full Integration Test ===')
console.log('')

var testCases = [
  {
    name: 'Simple sequence diagram',
    code: '@startuml\nAlice -> Bob: Hello\n@enduml',
    format: 'png'
  },
  {
    name: 'SVG output',
    code: '@startuml\nA -> B\n@enduml',
    format: 'svg'
  },
  {
    name: 'Chinese text',
    code: '@startuml\n用户 -> 系统: 登录\n@enduml',
    format: 'png'
  }
]

var passed = 0
var failed = 0

// Use local JRE if available
var localJrePath = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')
var useLocalJre = fs.existsSync(localJrePath)

if (useLocalJre) {
  console.log('Using local bundled JRE:', localJrePath)
} else {
  console.log('Using system Java (local JRE not found)')
}
console.log('')

function runTest (testCase, index) {
  return new Promise(function (resolve) {
    console.log(`Test ${index + 1}: ${testCase.name}`)

    var options = {
      format: testCase.format
    }

    if (useLocalJre) {
      options.javaPath = localJrePath
    }

    try {
      var gen = plantuml.generate(testCase.code, options)
      var outputPath = path.join(__dirname, 'output', `test-${index + 1}-${testCase.format}.${testCase.format === 'svg' ? 'svg' : 'png'}`)
      var outputDir = path.dirname(outputPath)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      var chunks = []
      var hasError = false

      gen.out.on('data', function (chunk) {
        chunks.push(chunk)
      })

      gen.out.on('error', function (err) {
        console.log('  ✗ Error:', err.message)
        hasError = true
        failed++
        resolve()
      })

      gen.out.on('end', function () {
        if (hasError) {
          resolve()
          return
        }

        var buffer = Buffer.concat(chunks)

        if (buffer.length > 0) {
          fs.writeFileSync(outputPath, buffer)
          console.log(`  ✓ Generated: ${outputPath} (${buffer.length} bytes)`)
          passed++
        } else {
          console.log('  ✗ Empty output')
          failed++
        }

        resolve()
      })

      // Timeout
      setTimeout(function () {
        if (chunks.length === 0 && !hasError) {
          console.log('  ✗ Timeout')
          failed++
          resolve()
        }
      }, 30000)
    } catch (err) {
      console.log('  ✗ Exception:', err.message)
      failed++
      resolve()
    }
  })
}

async function runAllTests () {
  for (var i = 0; i < testCases.length; i++) {
    await runTest(testCases[i], i)
    console.log('')
  }

  console.log('=== Test Summary ===')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${testCases.length}`)
  console.log('')

  if (failed === 0) {
    console.log('✓ All tests passed!')
    process.exit(0)
  } else {
    console.log('✗ Some tests failed')
    process.exit(1)
  }
}

runAllTests()
