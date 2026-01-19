#!/usr/bin/env node
'use strict'

/**
 * Complete build script - one command to build everything
 *
 * This script performs all necessary steps:
 * 1. Download latest PlantUML JAR
 *
 * Usage:
 *   node scripts/build-all.js [options]
 *   npm run build:all
 */

var path = require('path')
var childProcess = require('child_process')

var currentStep = 0
var totalSteps = 2
var errors = []

/**
 * Execute a command and return promise
 */
function execCommand (command, args, options) {
  return new Promise(function (resolve, reject) {
    console.log('')
    console.log('▶ Running: ' + command + ' ' + args.join(' '))
    console.log('')

    var child = childProcess.spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options
    })

    child.on('close', function (code) {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error('Command failed with exit code ' + code))
      }
    })

    child.on('error', function (err) {
      reject(err)
    })
  })
}

/**
 * Run a build step
 */
function runStep (step, callback) {
  currentStep++
  console.log('')
  console.log('='.repeat(60))
  console.log(`[${currentStep}/${totalSteps}] ${step.name}`)
  console.log('='.repeat(60))

  var scriptPath = path.join(__dirname, step.script)
  var args = step.args || []
  var isOptional = step.optional === true

  execCommand('node', [scriptPath].concat(args), { cwd: path.join(__dirname, '..') })
    .then(function () {
      console.log('')
      console.log(`✓ ${step.name} completed successfully`)
      callback(null)
    })
    .catch(function (err) {
      console.log('')
      if (isOptional) {
        console.warn(`⚠ ${step.name} failed (optional step):`, err.message)
        console.warn('  This is an experimental feature. Continuing with Java executor...')
        errors.push({ step: step.name, error: err.message, optional: true })
        callback(null) // Don't fail on optional steps
      } else {
        console.error(`✗ ${step.name} failed:`, err.message)
        errors.push({ step: step.name, error: err.message })
        callback(err)
      }
    })
}

/**
 * Check prerequisites
 */
function checkPrerequisites () {
  console.log('Checking prerequisites...')

  // Check Node.js version
  var nodeVersion = process.version
  var majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
  if (majorVersion < 12) {
    console.error('✗ Node.js 12+ required. Current version: ' + nodeVersion)
    return false
  }
  console.log('✓ Node.js version: ' + nodeVersion)

  // Check Java (required for running PlantUML)
  try {
    childProcess.execSync('java -version', {
      stdio: 'pipe',
      encoding: 'utf-8'
    })
    console.log('✓ Java found (required for PlantUML execution)')
  } catch (e) {
    console.warn('⚠ Java not found - PlantUML execution requires Java')
    console.warn('  Install Java to use this library: https://www.java.com/')
  }

  return true
}

/**
 * Main build function
 */
function buildAll (options, callback) {
  options = options || {}
  var skipJar = options.skipJar === true

  console.log('')
  console.log('╔'.repeat(30))
  console.log('║  PlantUML Complete Build Script')
  console.log('╚'.repeat(30))
  console.log('')

  if (!checkPrerequisites()) {
    if (typeof callback === 'function') {
      callback(new Error('Prerequisites check failed'))
    }
    return
  }

  var steps = []

  // Step 1: Download PlantUML JAR
  if (!skipJar) {
    steps.push({
      name: 'Download PlantUML JAR',
      script: 'get-plantuml-jar.js',
      args: ['--latest']
    })
  }

  totalSteps = steps.length
  currentStep = 0

  function runNextStep () {
    if (steps.length === 0) {
      // All steps completed
      console.log('')
      console.log('='.repeat(60))
      console.log('Build Summary')
      console.log('='.repeat(60))

      var criticalErrors = errors.filter(function (err) { return !err.optional })

      if (criticalErrors.length === 0) {
        if (errors.length === 0) {
          console.log('✓ All steps completed successfully!')
        } else {
          console.log('✓ All critical steps completed successfully!')
          console.log('⚠ Some optional steps had warnings (see above)')
        }
        console.log('')
        console.log('Next steps:')
        console.log('  - Run tests: npm test')
        console.log('  - Run batch conversion: npm run test:batch')
        if (typeof callback === 'function') {
          callback(null)
        }
      } else {
        console.log('✗ Some critical steps failed:')
        criticalErrors.forEach(function (err) {
          console.log('  ✗ ' + err.step + ': ' + err.error)
        })
        if (errors.length > criticalErrors.length) {
          console.log('')
          console.log('⚠ Additional optional step warnings:')
          errors.filter(function (err) { return err.optional }).forEach(function (err) {
            console.log('  ⚠ ' + err.step + ': ' + err.error)
          })
        }
        var buildError = new Error('Build completed with critical errors')
        if (typeof callback === 'function') {
          callback(buildError)
        } else {
          throw buildError
        }
      }
      return
    }

    var step = steps.shift()
    runStep(step, function (err) {
      // Continue to next step even if current step failed
      // Error is already logged in runStep, just continue
      if (err) {
        // Error logged, continue anyway for optional steps
      }
      setTimeout(runNextStep, 500)
    })
  }

  runNextStep()
}

// Command line execution
if (require.main === module) {
  var args = process.argv.slice(2)
  var options = {
    skipJar: args.indexOf('--skip-jar') !== -1
  }

  if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
    console.log('Usage: node scripts/build-all.js [options]')
    console.log('')
    console.log('Options:')
    console.log('  --skip-jar      Skip downloading PlantUML JAR')
    console.log('  -h, --help      Show this help message')
    console.log('')
    console.log('This script will:')
    console.log('  1. Download latest PlantUML JAR from GitHub')
    console.log('')
    process.exit(0)
  }
  
  // Remove --skip-wasm option (no longer needed)
  if (args.indexOf('--skip-wasm') !== -1) {
    console.log('Note: --skip-wasm option is deprecated (Wasm build removed)')
  }

  buildAll(options, function (err) {
    if (err) {
      console.error('Build failed:', err.message)
      process.exit(1)
    }
  })
}

module.exports = { buildAll, checkPrerequisites }
