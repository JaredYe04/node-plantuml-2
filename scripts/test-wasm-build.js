#!/usr/bin/env node
'use strict'

/**
 * Test script for WASM build
 * 
 * This script tests the WASM build process locally to verify fixes
 */

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')

var VENDOR_DIR = path.join(__dirname, '../vendor')
var WASM_DIR = path.join(VENDOR_DIR, 'wasm')

console.log('🧪 Testing WASM build process...')
console.log('')

// Step 1: Check if PlantUML JAR exists
var PLANTUML_JAR = path.join(VENDOR_DIR, 'plantuml.jar')
if (!fs.existsSync(PLANTUML_JAR)) {
  console.log('⚠️  PlantUML JAR not found. Downloading...')
  var downloadScript = path.join(__dirname, 'get-plantuml-jar.js')
  childProcess.execSync('node ' + downloadScript, { stdio: 'inherit' })
}

// Step 2: Check Java availability
console.log('🔍 Checking Java availability...')
try {
  var javaVersion = childProcess.execSync('java -version', { encoding: 'utf8', stdio: 'pipe' })
  console.log('✓ Java is available')
} catch (e) {
  console.error('❌ Java is not available. Please install Java 11+')
  process.exit(1)
}

// Step 3: Test CheerpJ build method (official PlantUML WASM solution)
console.log('')
console.log('🔨 Testing CheerpJ build method (official PlantUML WASM solution)...')
console.log('')

var buildScript = path.join(__dirname, 'build-plantuml-wasm.js')

try {
  // Use CheerpJ method (official solution, pure Node.js)
  process.env.BUILD_METHOD = 'cheerpj'
  
  console.log('Running: node scripts/build-plantuml-wasm.js --method cheerpj')
  console.log('')
  
  childProcess.execSync('node ' + buildScript + ' --method cheerpj', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env
  })
  
  // Check if WASM/JS files were created (CheerpJ uses JS + WASM)
  var wasmFile = path.join(WASM_DIR, 'plantuml.wasm')
  var jsFile = path.join(WASM_DIR, 'plantuml-core.js')
  var coreWasmFile = path.join(WASM_DIR, 'plantuml-core.wasm')
  
  var foundFiles = []
  if (fs.existsSync(wasmFile)) {
    var stats = fs.statSync(wasmFile)
    foundFiles.push({ file: wasmFile, size: stats.size })
  }
  if (fs.existsSync(jsFile)) {
    var stats = fs.statSync(jsFile)
    foundFiles.push({ file: jsFile, size: stats.size })
  }
  if (fs.existsSync(coreWasmFile)) {
    var stats = fs.statSync(coreWasmFile)
    foundFiles.push({ file: coreWasmFile, size: stats.size })
  }
  
  if (foundFiles.length > 0) {
    console.log('')
    console.log('✅ WASM build successful!')
    foundFiles.forEach(function (f) {
      console.log('   File: ' + f.file)
      console.log('   Size: ' + (f.size / 1024 / 1024).toFixed(2) + ' MB')
    })
  } else {
    console.log('')
    console.error('❌ No WASM/JS files found after build')
    console.error('   Expected: plantuml.wasm, plantuml-core.js, or plantuml-core.wasm')
    process.exit(1)
  }
} catch (e) {
  console.log('')
  console.error('❌ Build failed:', e.message)
  process.exit(1)
}

console.log('')
console.log('✅ All tests passed!')

