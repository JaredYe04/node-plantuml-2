#!/usr/bin/env node
'use strict'

/**
 * Test script for Wasm executor
 *
 * This script tests the Wasm executor functionality
 */

var fs = require('fs')
var path = require('path')

console.log('Testing Wasm executor...')
console.log('Node.js version: ' + process.version)
console.log('')

// Check if Wasm module exists
var wasmPath = path.join(__dirname, '../vendor/wasm/plantuml.wasm')
if (!fs.existsSync(wasmPath)) {
  console.log('✗ Wasm module not found: ' + wasmPath)
  console.log('  Please run: npm run build:wasm')
  console.log('')
  console.log('Note: Wasm executor requires:')
  console.log('  1. PlantUML JAR downloaded to vendor/plantuml.jar')
  console.log('  2. Wasm module built using Bytecoder/TeaVM')
  console.log('  3. Node.js 12+ for WASI support')
  process.exit(1)
}

console.log('✓ Wasm module found: ' + wasmPath)
console.log('')

// Try to initialize Wasm executor
console.log('Attempting to initialize Wasm executor...')
process.env.PLANTUML_USE_WASM = 'true'

var wasmExecutor = require('../lib/plantuml-executor-wasm')
if (wasmExecutor.isAvailable()) {
  console.log('✓ Wasm executor is available')
  console.log('')

  wasmExecutor.initWasm(function (err) {
    if (err) {
      console.error('✗ Failed to initialize Wasm executor:', err.message)
      console.log('')
      console.log('Falling back to Java executor...')
      process.exit(1)
    } else {
      console.log('✓ Wasm executor initialized successfully')
      console.log('')
      console.log('Note: Full integration requires:')
      console.log('  - PlantUML Wasm module with proper exports (main/_start)')
      console.log('  - WASI-compatible module interface')
      console.log('  - File system bridge for I/O operations')
      console.log('')
      console.log('For now, the executor will fall back to Java when Wasm is not fully functional.')
      process.exit(0)
    }
  })
} else {
  console.log('✗ Wasm executor is not available')
  console.log('  Check if plantuml.wasm exists in vendor/wasm/')
  process.exit(1)
}
