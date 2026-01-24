#!/usr/bin/env node
'use strict'

/**
 * Test with locally built JRE (not installed via npm)
 * This simulates what happens when the runtime package is installed
 */

var javaResolver = require('../lib/java-resolver')
var path = require('path')
var fs = require('fs')

console.log('Testing with local JRE...')
console.log('')

// Simulate the runtime package being installed
// by temporarily modifying require.resolve behavior
var localJrePath = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-win32-x64')
var javaExe = path.join(localJrePath, 'jre', 'bin', 'java.exe')

if (!fs.existsSync(javaExe)) {
  console.error('✗ Local JRE not found at:', javaExe)
  console.error('Please build JRE first: node scripts/build-jre-windows.js')
  process.exit(1)
}

console.log('✓ Local JRE found:', javaExe)

// Test direct resolution with the local path
console.log('Testing Java resolution with local JRE path...')
var resolved = javaResolver.resolveJavaExecutable({
  javaPath: javaExe
})

if (resolved && fs.existsSync(resolved)) {
  console.log('✓ Java resolved:', resolved)

  // Verify it works
  var childProcess = require('child_process')
  try {
    var result = childProcess.spawnSync(resolved, ['-version'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000
    })
    if (result.stderr) {
      console.log('✓ Java works')
      console.log('Version:', result.stderr.split('\n')[0])
    } else {
      console.log('⚠ Java version check returned no output')
    }
  } catch (e) {
    console.log('✗ Error verifying Java:', e.message)
  }
} else {
  console.log('✗ Failed to resolve Java')
  process.exit(1)
}

// Test PlantUML generation with local JRE
console.log('')
console.log('Testing PlantUML generation with local JRE...')
var plantuml = require('../lib/node-plantuml')
var testCode = '@startuml\nAlice -> Bob: Hello\n@enduml'

try {
  var gen = plantuml.generate(testCode, {
    format: 'png',
    javaPath: javaExe
  })

  var outputPath = path.join(__dirname, 'output', 'test-local-jre.png')
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
    if (buffer.length > 0) {
      fs.writeFileSync(outputPath, buffer)
      console.log('✓ PNG generated successfully:', outputPath)
      console.log('File size:', buffer.length, 'bytes')
      console.log('')
      console.log('=== Test Passed ===')
      process.exit(0)
    } else {
      console.log('✗ Generated file is empty')
      process.exit(1)
    }
  })

  gen.out.on('error', function (err) {
    console.error('✗ Error generating PNG:', err.message)
    process.exit(1)
  })

  setTimeout(function () {
    console.error('✗ Test timed out after 30 seconds')
    process.exit(1)
  }, 30000)
} catch (err) {
  console.error('✗ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
}
