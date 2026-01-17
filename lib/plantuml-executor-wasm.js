'use strict'

/**
 * PlantUML Wasm Executor
 *
 * This module provides Wasm-based execution of PlantUML using TeaVM/Bytecoder.
 *
 * Implementation Strategy:
 * 1. Use TeaVM or Bytecoder to convert PlantUML JAR to WebAssembly
 * 2. Run Wasm module in Node.js using WASI or WebAssembly API
 * 3. Provide file system access through WASI or Node.js FS API
 */

var fs = require('fs')
var path = require('path')
var stream = require('stream')

// WASI is available in Node.js 12+ as experimental, stable in 20+
var WASI
try {
  // Try Node.js 20+ stable API
  WASI = require('wasi').WASI
} catch (e) {
  try {
    // Try experimental API (Node.js 12-19)
    WASI = require('wasi').WASI
  } catch (e2) {
    // WASI not available
    WASI = null
  }
}

var WASM_DIR = path.join(__dirname, '../vendor/wasm')
var PLANTUML_WASM = path.join(WASM_DIR, 'plantuml.wasm')
// CheerpJ files (official PlantUML WASM solution)
var PLANTUML_CORE_JS = path.join(WASM_DIR, 'plantuml-core.js')
var PLANTUML_CORE_WASM = path.join(WASM_DIR, 'plantuml-core.wasm')
var wasmInstance = null
var wasmMemory = null
var wasi = null
var wasmReady = false

/**
 * Initialize Wasm module
 * @param {Function} callback - Callback when ready
 */
function initWasm (callback) {
  if (wasmReady && wasmInstance) {
    if (typeof callback === 'function') {
      callback(null)
    }
    return
  }

  if (!fs.existsSync(PLANTUML_WASM)) {
    var err = new Error('Wasm module not found: ' + PLANTUML_WASM + '\nPlease run: node scripts/build-plantuml-wasm.js')
    if (typeof callback === 'function') {
      callback(err)
    } else {
      throw err
    }
    return
  }

  try {
    // Check Node.js version for WASI support (Node.js 12+)
    var nodeVersion = process.version
    var majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
    if (majorVersion < 12) {
      throw new Error('WASI requires Node.js 12+. Current version: ' + nodeVersion)
    }

    // Initialize WASI
    var cwd = process.cwd()
    wasi = new WASI({
      version: 'preview1',
      env: process.env,
      preopens: {
        '/': cwd,
        '/tmp': require('os').tmpdir()
      },
      args: []
    })

    // Load Wasm module
    var wasmBuffer = fs.readFileSync(PLANTUML_WASM)

    // Create import object for WASI
    var importObject = {
      wasi_snapshot_preview1: wasi.wasiImport
    }

    // Instantiate Wasm module
    /* global WebAssembly */
    WebAssembly.instantiate(wasmBuffer, importObject)
      .then(function (result) {
        wasmInstance = result.instance
        wasmMemory = wasmInstance.exports.memory

        // Initialize WASI
        wasi.initialize(wasmInstance)

        wasmReady = true
        console.log('✓ Wasm module loaded successfully')

        if (typeof callback === 'function') {
          callback(null)
        }
      })
      .catch(function (err) {
        console.error('Failed to load Wasm module:', err)
        if (typeof callback === 'function') {
          callback(err)
        } else {
          throw err
        }
      })
  } catch (err) {
    if (typeof callback === 'function') {
      callback(err)
    } else {
      throw err
    }
  }
}

/**
 * Create a process-like object for Wasm execution
 * @param {Array} argv - Command line arguments
 * @param {string} cwd - Working directory
 * @param {Function} callback - Callback function
 * @returns {Object} Child process-like object with stdin/stdout/stderr
 */
function execWithWasm (argv, cwd, callback) {
  if (!wasmReady || !wasmInstance) {
    throw new Error('Wasm module not initialized. Call initWasm() first.')
  }

  // Create streams for stdin/stdout/stderr
  var stdinStream = new stream.PassThrough()
  var stdoutStream = new stream.PassThrough()
  var stderrStream = new stream.PassThrough()

  // Collect stdin data
  var stdinData = []
  stdinStream.on('data', function (chunk) {
    stdinData.push(chunk)
  })

  stdinStream.on('end', function () {
    // Process input when stdin ends
    var inputBuffer = Buffer.concat(stdinData)
    processWasmExecution(argv, inputBuffer, stdoutStream, stderrStream, cwd, callback)
  })

  // If no stdin data expected, process immediately
  setTimeout(function () {
    if (stdinData.length === 0 && stdinStream.readableEnded) {
      processWasmExecution(argv, null, stdoutStream, stderrStream, cwd, callback)
    }
  }, 100)

  // Return process-like object
  return {
    stdin: stdinStream,
    stdout: stdoutStream,
    stderr: stderrStream
  }
}

/**
 * Process Wasm execution
 * @private
 */
function processWasmExecution (argv, stdinData, stdoutStream, stderrStream, cwd, callback) {
  try {
    // Convert argv to string array for Wasm
    var args = argv || []
    var argsString = args.join(' ')

    // Prepare input data
    var inputText = stdinData ? stdinData.toString('utf-8') : ''

    // Call Wasm main function
    // Note: This is a simplified version. Actual PlantUML Wasm module
    // may have different function signatures
    if (wasmInstance.exports.main) {
      // If main function exists, call it with arguments
      var result = wasmInstance.exports.main(args.length, argsString, inputText)

      // Read output from memory
      if (wasmMemory && result !== undefined) {
        // Parse result and write to stdout
        // This is simplified - actual implementation depends on Wasm module API
        stdoutStream.end(Buffer.from(result))
      } else {
        stdoutStream.end()
      }
    } else if (wasmInstance.exports._start) {
      // WASI entry point
      wasi.start(wasmInstance)
      stdoutStream.end()
    } else {
      // Fallback: try to find PlantUML-specific export
      console.warn('Wasm module does not export expected functions. PlantUML Wasm module may need custom integration.')
      stdoutStream.end()
    }

    if (typeof callback === 'function') {
      var chunks = []
      stdoutStream.on('data', function (chunk) {
        chunks.push(chunk)
      })
      stdoutStream.on('end', function () {
        var data = Buffer.concat(chunks)
        callback(null, data)
      })
    }
  } catch (err) {
    stderrStream.write('Error executing Wasm module: ' + err.message + '\n')
    stderrStream.end()
    if (typeof callback === 'function') {
      callback(err)
    }
  }
}

/**
 * Initialize CheerpJ runtime (official PlantUML WASM solution)
 */
function initCheerpJ (callback) {
  try {
    // CheerpJ uses a different loading mechanism
    // The JS file contains the runtime and can be loaded as a module
    console.log('Loading CheerpJ PlantUML-core...')
    
    // For now, we'll use a simple approach - load the JS file
    // In a real implementation, you'd need to handle CheerpJ's runtime API
    var cheerpjCode = fs.readFileSync(PLANTUML_CORE_JS, 'utf8')
    
    // Note: CheerpJ requires a browser-like environment or special runtime
    // This is a placeholder - actual implementation would need CheerpJ runtime
    console.log('✓ CheerpJ PlantUML-core loaded (runtime initialization needed)')
    
    wasmReady = true
    if (typeof callback === 'function') {
      callback(null)
    }
  } catch (err) {
    if (typeof callback === 'function') {
      callback(err)
    } else {
      throw err
    }
  }
}

/**
 * Check if Wasm executor is available
 * @returns {boolean}
 */
function isWasmAvailable () {
  return fs.existsSync(PLANTUML_WASM) || fs.existsSync(PLANTUML_CORE_JS)
}

/**
 * Check if Wasm executor is ready (initialized)
 * @returns {boolean}
 */
function isReady () {
  return wasmReady && wasmInstance !== null
}

/**
 * Initialize Wasm synchronously (for immediate use)
 */
function initWasmSync () {
  if (wasmReady && wasmInstance) {
    return true
  }

  if (!fs.existsSync(PLANTUML_WASM)) {
    return false
  }

  try {
    var nodeVersion = process.version
    var majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
    if (majorVersion < 12) {
      return false
    }

    var cwd = process.cwd()
    wasi = new WASI({
      version: 'preview1',
      env: process.env,
      preopens: {
        '/': cwd,
        '/tmp': require('os').tmpdir()
      },
      args: []
    })

    var wasmBuffer = fs.readFileSync(PLANTUML_WASM)
    var importObject = {
      wasi_snapshot_preview1: wasi.wasiImport
    }

    /* global WebAssembly */
    var result = WebAssembly.instantiateSync(wasmBuffer, importObject)
    wasmInstance = result.instance
    wasmMemory = wasmInstance.exports.memory
    wasi.initialize(wasmInstance)
    wasmReady = true
    return true
  } catch (e) {
    console.warn('Failed to initialize Wasm synchronously:', e.message)
    return false
  }
}

module.exports = {
  initWasm: initWasm,
  exec: execWithWasm,
  isAvailable: isWasmAvailable,
  isReady: isReady,
  initWasmSync: initWasmSync
}
