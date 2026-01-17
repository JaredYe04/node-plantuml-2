#!/usr/bin/env node
'use strict'

/**
 * Build Wasm module using Maven
 *
 * This script uses Maven to build PlantUML as Wasm module.
 * Maven handles all dependencies automatically.
 */

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')

var WASM_DIR = path.join(__dirname, '../vendor/wasm')
var WASM_OUTPUT = path.join(WASM_DIR, 'plantuml.wasm')
var POM_FILE = path.join(__dirname, '../pom.xml')

/**
 * Check if Maven is available
 */
function checkMaven (callback) {
  childProcess.exec('mvn -version', function (err, stdout, stderr) {
    if (err) {
      callback(new Error('Maven not found. Please install Maven: https://maven.apache.org/install.html'))
      return
    }
    console.log('✓ Maven found')
    console.log(stdout.split('\n')[0]) // Print Maven version
    callback(null)
  })
}

/**
 * Build Wasm using Maven
 */
function buildWithMaven (callback) {
  console.log('Building PlantUML Wasm module with Maven...')
  console.log('This may take several minutes on first run (downloading dependencies)...')
  console.log('')

  if (!fs.existsSync(POM_FILE)) {
    callback(new Error('pom.xml not found: ' + POM_FILE))
    return
  }

  // Create output directory
  if (!fs.existsSync(WASM_DIR)) {
    fs.mkdirSync(WASM_DIR, { recursive: true })
  }

  // Run Maven package
  var args = ['clean', 'package', '-DskipTests']

  console.log('Running: mvn ' + args.join(' '))
  console.log('')

  var child = childProcess.spawn('mvn', args, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: process.platform === 'win32'
  })

  child.on('close', function (code) {
    if (code === 0) {
      // Check if Wasm file was generated
      // Bytecoder may output to different locations, check common ones
      var possibleLocations = [
        path.join(__dirname, '../vendor/wasm/plantuml.wasm'),
        path.join(__dirname, '../target/plantuml.wasm'),
        path.join(__dirname, '../target/wasm/plantuml.wasm')
      ]

      var foundWasm = null
      for (var i = 0; i < possibleLocations.length; i++) {
        if (fs.existsSync(possibleLocations[i])) {
          foundWasm = possibleLocations[i]
          break
        }
      }

      if (foundWasm) {
        // Copy to final location
        if (fs.existsSync(WASM_OUTPUT)) {
          fs.unlinkSync(WASM_OUTPUT)
        }
        fs.copyFileSync(foundWasm, WASM_OUTPUT)
        console.log('')
        console.log('✓ Wasm module built successfully: ' + WASM_OUTPUT)
        callback(null)
      } else {
        console.error('')
        console.error('✗ Wasm file not found in expected locations')
        console.error('Checked:')
        possibleLocations.forEach(function (loc) {
          console.error('  - ' + loc)
        })
        callback(new Error('Build completed but Wasm file not found'))
      }
    } else {
      console.error('')
      console.error('✗ Maven build failed with exit code: ' + code)
      callback(new Error('Maven build failed with exit code: ' + code))
    }
  })

  child.on('error', function (err) {
    console.error('✗ Failed to spawn Maven process:', err.message)
    callback(err)
  })
}

/**
 * Main function
 */
function buildWasm (callback) {
  checkMaven(function (err) {
    if (err) {
      callback(err)
      return
    }

    buildWithMaven(callback)
  })
}

// Command line execution
if (require.main === module) {
  buildWasm(function (err) {
    if (err) {
      console.error('Build failed:', err.message)
      process.exit(1)
    }
  })
}

module.exports = { buildWasm, checkMaven, buildWithMaven }
