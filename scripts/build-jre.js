#!/usr/bin/env node
'use strict'

/**
 * Build minimal JRE using jlink for a specific platform
 * 
 * Usage:
 *   node scripts/build-jre.js <platform> <arch> [output-dir]
 * 
 * Example:
 *   node scripts/build-jre.js darwin arm64
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

var PLATFORM = process.argv[2] || os.platform()
var ARCH = process.argv[3] || os.arch()
var OUTPUT_DIR = process.argv[4] || path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-' + PLATFORM + '-' + ARCH)

// Normalize platform names
if (PLATFORM === 'macos' || PLATFORM === 'osx') {
  PLATFORM = 'darwin'
} else if (PLATFORM === 'windows' || PLATFORM === 'cygwin' || PLATFORM === 'msys') {
  PLATFORM = 'win32'
}

// Normalize architecture
if (ARCH === 'x86_64' || ARCH === 'amd64') {
  ARCH = 'x64'
} else if (ARCH === 'aarch64') {
  ARCH = 'arm64'
}

console.log('Building JRE for platform:', PLATFORM, 'architecture:', ARCH)
console.log('Output directory:', OUTPUT_DIR)
console.log('')

// Get jlink executable path
function getJlinkPath () {
  // Try JAVA_HOME first
  var javaHome = process.env.JAVA_HOME
  if (javaHome) {
    var jlinkPath = path.join(javaHome, 'bin', process.platform === 'win32' ? 'jlink.exe' : 'jlink')
    if (fs.existsSync(jlinkPath)) {
      console.log('Using jlink from JAVA_HOME:', jlinkPath)
      return jlinkPath
    }
  }
  
  // Fallback to 'jlink' in PATH
  console.log('JAVA_HOME not set or jlink not found, trying system jlink...')
  return 'jlink'
}

// Check if jlink is available
function checkJlink (jlinkPath) {
  return new Promise(function (resolve, reject) {
    childProcess.exec('"' + jlinkPath + '" -version', function (err, stdout, stderr) {
      if (err) {
        console.error('Error: jlink not found at:', jlinkPath)
        console.error('Please ensure JAVA_HOME is set or jlink is in PATH.')
        console.error('On macOS: brew install openjdk@17')
        console.error('On Ubuntu: sudo apt-get install openjdk-17-jdk')
        reject(new Error('jlink not found'))
      } else {
        // jlink outputs version to stderr
        if (stderr) {
          console.log('jlink version:', stderr.trim().split('\n')[0])
        }
        resolve()
      }
    })
  })
}

// Build JRE with jlink
function buildJRE (jlinkPath) {
  return new Promise(function (resolve, reject) {
    var jrePath = path.join(OUTPUT_DIR, 'jre')
    
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    console.log('Running jlink...')
    console.log('Using jlink:', jlinkPath)
    
    var jlinkArgs = [
      '--add-modules', 'java.base,java.desktop,java.xml,java.logging',
      '--strip-debug',
      '--no-man-pages',
      '--no-header-files',
      '--compress=2',
      '--output', jrePath
    ]

    var child = childProcess.spawn(jlinkPath, jlinkArgs, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })

    child.on('close', function (code) {
      if (code !== 0) {
        reject(new Error('jlink failed with exit code ' + code))
        return
      }

      // Set executable permissions (Unix platforms)
      if (PLATFORM !== 'win32') {
        console.log('Setting executable permissions...')
        var javaExe = path.join(jrePath, 'bin', 'java')
        if (fs.existsSync(javaExe)) {
          try {
            fs.chmodSync(javaExe, 0o755)
            
            // Set permissions for all executables in bin/
            var binDir = path.join(jrePath, 'bin')
            if (fs.existsSync(binDir)) {
              var files = fs.readdirSync(binDir)
              files.forEach(function (file) {
                var filePath = path.join(binDir, file)
                try {
                  fs.chmodSync(filePath, 0o755)
                } catch (e) {
                  // Ignore chmod errors
                }
              })
            }
          } catch (e) {
            console.warn('Warning: Could not set executable permissions:', e.message)
          }
        }
      }

      // Verify JRE
      console.log('')
      console.log('Verifying JRE...')
      var javaExe = path.join(jrePath, 'bin', PLATFORM === 'win32' ? 'java.exe' : 'java')
      
      var verifyChild = childProcess.spawn(javaExe, ['-version'], {
        stdio: 'inherit',
        shell: process.platform === 'win32'
      })

      verifyChild.on('close', function (verifyCode) {
        if (verifyCode !== 0) {
          console.warn('Warning: JRE verification failed')
        } else {
          console.log('')
          console.log('✓ JRE built successfully:', jrePath)
          console.log('')
          console.log('Next steps:')
          console.log('  1. Create package.json in', OUTPUT_DIR)
          console.log('  2. Test the JRE with PlantUML')
          console.log('  3. Publish the package: cd ' + OUTPUT_DIR + ' && npm publish --access public')
        }
        resolve()
      })

      verifyChild.on('error', function (err) {
        console.warn('Warning: Could not verify JRE:', err.message)
        resolve()
      })
    })

    child.on('error', function (err) {
      reject(err)
    })
  })
}

// Main
var jlinkPath = getJlinkPath()
checkJlink(jlinkPath)
  .then(function () {
    return buildJRE(jlinkPath)
  })
  .then(function () {
    process.exit(0)
  })
  .catch(function (err) {
    console.error('Build failed:', err.message)
    process.exit(1)
  })

