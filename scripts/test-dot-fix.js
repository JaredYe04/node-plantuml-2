#!/usr/bin/env node
'use strict'

/**
 * Test script to verify dot (Graphviz) integration fix
 * This script tests:
 * 1. Dot path resolution
 * 2. Library path detection for bundled Graphviz
 * 3. Direct dot execution with proper environment
 * 4. PlantUML testdot function
 */

var plantuml = require('../lib/node-plantuml')
var dotResolver = require('../lib/dot-resolver')
var javaResolver = require('../lib/java-resolver')
var childProcess = require('child_process')
var path = require('path')
var os = require('os')
var fs = require('fs')

console.log('=== Dot (Graphviz) Integration Test ===')
console.log('')

var testResults = []
var platform = os.platform()

function logTest(name, passed, message) {
  var status = passed ? '✓' : '✗'
  console.log(status, name + (message ? ': ' + message : ''))
  testResults.push({ name: name, passed: passed, message: message })
}

// Test 1: Java detection
console.log('Test 1: Java Detection')
console.log('---')
var javaPath = javaResolver.resolveJavaExecutable({})
logTest('Java Path', !!javaPath, javaPath || 'NOT FOUND')
console.log('')

// Test 2: Dot path resolution
console.log('Test 2: Dot Path Resolution')
console.log('---')
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
logTest('Dot Path', !!dotPath, dotPath || 'NOT FOUND')

if (dotPath) {
  // Verify dot path exists
  var dotExists = fs.existsSync(dotPath)
  logTest('Dot Path Exists', dotExists, dotExists ? 'File exists' : 'File does not exist')
  
  // Check if it's bundled Graphviz
  var isBundled = dotPath.includes('@node-plantuml-2/graphviz-')
  console.log('  Info: ' + (isBundled ? 'Using bundled Graphviz' : 'Using system Graphviz'))
  
  // Get library path
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  if (libPath) {
    console.log('  Info: Library path:', libPath)
    var libExists = fs.existsSync(libPath)
    logTest('Library Path Exists', libExists, libExists ? 'Directory exists' : 'Directory does not exist')
  } else {
    console.log('  Info: Library path not needed (system Graphviz)')
  }
}
console.log('')

// Test 3: Direct dot execution with proper environment
console.log('Test 3: Direct Dot Execution')
console.log('---')
if (dotPath && fs.existsSync(dotPath)) {
  try {
    var env = Object.assign({}, process.env)
    var absoluteDotPath = path.resolve(dotPath)
    
    // Normalize path separators
    if (platform === 'win32') {
      absoluteDotPath = absoluteDotPath.replace(/\//g, '\\')
    } else {
      absoluteDotPath = absoluteDotPath.replace(/\\/g, '/')
    }
    
    // Set library path for bundled Graphviz
    if (libPath) {
      libPath = path.resolve(libPath)
      if (platform === 'linux') {
        var existingLibPath = env.LD_LIBRARY_PATH || ''
        env.LD_LIBRARY_PATH = libPath + (existingLibPath ? ':' + existingLibPath : '')
        console.log('  LD_LIBRARY_PATH:', env.LD_LIBRARY_PATH)
      } else if (platform === 'darwin') {
        var existingDyldPath = env.DYLD_LIBRARY_PATH || ''
        env.DYLD_LIBRARY_PATH = libPath + (existingDyldPath ? ':' + existingDyldPath : '')
        console.log('  DYLD_LIBRARY_PATH:', env.DYLD_LIBRARY_PATH)
      }
    }
    
    // For Windows, add bin directory to PATH
    if (platform === 'win32') {
      var binDir = path.dirname(absoluteDotPath).replace(/\//g, '\\')
      var pathKey = 'PATH'
      for (var key in process.env) {
        if (key.toUpperCase() === 'PATH') {
          pathKey = key
          break
        }
      }
      var existingPath = env[pathKey] || env.PATH || ''
      env[pathKey] = binDir + (existingPath ? ';' + existingPath : '')
      env.PATH = env[pathKey]
      console.log('  PATH (first entry):', binDir)
    }
    
    // Test dot -V command
    var dotVersion = childProcess.execSync('"' + absoluteDotPath + '" -V', {
      encoding: 'utf-8',
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000
    })
    logTest('Dot -V Command', true, 'Executed successfully')
    console.log('  Version output (first 150 chars):', dotVersion.substring(0, 150))
  } catch (e) {
    logTest('Dot -V Command', false, e.message)
    if (e.stderr) {
      console.log('  Stderr:', e.stderr.toString().substring(0, 200))
    }
  }
} else {
  logTest('Dot -V Command', false, 'Dot path not found or does not exist')
}
console.log('')

// Test 4: PlantUML testdot
console.log('Test 4: PlantUML testdot')
console.log('---')
var testdotPromise = new Promise(function (resolve) {
  var timeout = setTimeout(function () {
    logTest('PlantUML testdot', false, 'Timeout (30 seconds)')
    resolve()
  }, 30000)
  
  plantuml.testdot(function (isOk) {
    clearTimeout(timeout)
    logTest('PlantUML testdot', isOk, isOk ? 'Graphviz integration OK' : 'Graphviz integration failed')
    resolve()
  })
})

testdotPromise.then(function () {
  // Summary
  console.log('')
  console.log('=== Test Summary ===')
  var passed = testResults.filter(function (r) { return r.passed }).length
  var failed = testResults.filter(function (r) { return !r.passed }).length
  console.log('Passed:', passed)
  console.log('Failed:', failed)
  console.log('')
  
  if (failed > 0) {
    console.log('Failed tests:')
    testResults.forEach(function (r) {
      if (!r.passed) {
        console.log('  ✗', r.name, r.message || '')
      }
    })
    process.exit(1)
  } else {
    console.log('✅ All tests passed!')
    process.exit(0)
  }
}).catch(function (err) {
  console.error('✗ Test execution error:', err.message)
  console.error(err.stack)
  process.exit(1)
})

