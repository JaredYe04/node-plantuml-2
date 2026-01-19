#!/usr/bin/env node
'use strict'

/**
 * Debug test for PlantUML generation
 * Shows detailed error information
 */

var plantumlExecutor = require('../lib/plantuml-executor')
var javaResolver = require('../lib/java-resolver')
var path = require('path')
var fs = require('fs')

console.log('Debug: Testing PlantUML generation...')
console.log('')

// Check PlantUML JAR
var plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml.jar')
console.log('PlantUML JAR:', plantumlJar)
console.log('JAR exists:', fs.existsSync(plantumlJar))
console.log('JAR size:', fs.existsSync(plantumlJar) ? fs.statSync(plantumlJar).size : 'N/A', 'bytes')
console.log('')

// Resolve Java
var javaExe = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-win32-x64', 'jre', 'bin', 'java.exe')
console.log('Java executable:', javaExe)
console.log('Java exists:', fs.existsSync(javaExe))
console.log('')

// Test direct Java execution
if (fs.existsSync(javaExe) && fs.existsSync(plantumlJar)) {
  console.log('Testing direct Java execution...')
  var childProcess = require('child_process')
  
  var testArgs = [
    '-Djava.awt.headless=true',
    '-Dfile.encoding=UTF-8',
    '-jar', plantumlJar,
    '-version'
  ]
  
  console.log('Command:', javaExe, testArgs.join(' '))
  
  var child = childProcess.spawn(javaExe, testArgs, {
    stdio: 'pipe',
    shell: true
  })
  
  var stdout = []
  var stderr = []
  
  child.stdout.on('data', function (chunk) {
    stdout.push(chunk)
  })
  
  child.stderr.on('data', function (chunk) {
    stderr.push(chunk)
  })
  
  child.on('close', function (code) {
    console.log('Exit code:', code)
    if (stdout.length > 0) {
      console.log('STDOUT:', Buffer.concat(stdout).toString())
    }
    if (stderr.length > 0) {
      console.log('STDERR:', Buffer.concat(stderr).toString())
    }
    console.log('')
    
    if (code === 0) {
      console.log('✓ PlantUML JAR works with local JRE')
      
      // Now test actual generation
      console.log('')
      console.log('Testing PNG generation...')
      testGeneration()
    } else {
      console.log('✗ PlantUML JAR failed')
      process.exit(1)
    }
  })
  
  child.on('error', function (err) {
    console.error('✗ Error spawning process:', err.message)
    process.exit(1)
  })
} else {
  console.log('✗ Missing required files')
  process.exit(1)
}

function testGeneration () {
  var testCode = '@startuml\nAlice -> Bob: Hello\n@enduml'
  var options = {
    javaPath: javaExe
  }
  
  var child = plantumlExecutor.exec(['-pipe'], undefined, options)
  
  var stdout = []
  var stderr = []
  
  child.stdout.on('data', function (chunk) {
    stdout.push(chunk)
    console.log('Received chunk:', chunk.length, 'bytes')
  })
  
  child.stderr.on('data', function (chunk) {
    stderr.push(chunk)
    console.log('STDERR:', chunk.toString())
  })
  
  child.on('error', function (err) {
    console.error('✗ Process error:', err.message)
    process.exit(1)
  })
  
  child.on('close', function (code) {
    console.log('Exit code:', code)
    if (stdout.length > 0) {
      var buffer = Buffer.concat(stdout)
      console.log('Total output:', buffer.length, 'bytes')
      
      if (buffer.length > 0) {
        var outputPath = path.join(__dirname, 'output', 'test-debug.png')
        var outputDir = path.dirname(outputPath)
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        fs.writeFileSync(outputPath, buffer)
        console.log('✓ PNG saved to:', outputPath)
      } else {
        console.log('✗ Output is empty')
      }
    } else {
      console.log('✗ No output received')
    }
    
    if (stderr.length > 0) {
      console.log('STDERR:', Buffer.concat(stderr).toString())
    }
  })
  
  // Write test code to stdin
  child.stdin.write(testCode, 'utf8')
  child.stdin.end()
  
  setTimeout(function () {
    // Don't kill if already closed
    if (!child.killed) {
      console.log('Test timed out')
      child.kill()
      process.exit(1)
    }
  }, 30000)
}

