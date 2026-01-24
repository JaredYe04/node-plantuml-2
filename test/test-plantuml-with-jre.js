#!/usr/bin/env node
'use strict'

/**
 * Test PlantUML generation with bundled JRE
 * This script tests the full flow from Java resolution to PlantUML generation
 */

var plantuml = require('../lib/node-plantuml')
var javaResolver = require('../lib/java-resolver')
var fs = require('fs')
var path = require('path')

console.log('Testing PlantUML with JRE...')
console.log('')

// Step 1: Check Java resolution
console.log('Step 1: Resolving Java...')
var javaPath = javaResolver.resolveJavaExecutable({})
if (!javaPath) {
  console.error('✗ Could not resolve Java executable')
  process.exit(1)
}
console.log('✓ Java resolved:', javaPath)
console.log('')

// Step 2: Test simple PlantUML generation
console.log('Step 2: Testing simple PlantUML generation...')
var testCode = '@startuml\nAlice -> Bob: Hello\n@enduml'

try {
  var gen = plantuml.generate(testCode, { format: 'png' })
  var outputPath = path.join(__dirname, 'output', 'test-jre-output.png')

  // Create output directory if it doesn't exist
  var outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  var chunks = []
  gen.out.on('data', function (chunk) {
    chunks.push(chunk)
  })

  gen.out.on('end', function () {
    var buffer = Buffer.concat(chunks)
    fs.writeFileSync(outputPath, buffer)
    console.log('✓ PNG generated successfully:', outputPath)
    console.log('File size:', buffer.length, 'bytes')
    console.log('')
    console.log('=== Test Passed ===')
    process.exit(0)
  })

  gen.out.on('error', function (err) {
    console.error('✗ Error generating PNG:', err.message)
    process.exit(1)
  })

  // Timeout after 30 seconds
  setTimeout(function () {
    console.error('✗ Test timed out after 30 seconds')
    process.exit(1)
  }, 30000)
} catch (err) {
  console.error('✗ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
}
