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
    console.log('Checking for jlink at:', jlinkPath)

    // Check if file exists
    if (fs.existsSync(jlinkPath)) {
      try {
        var stats = fs.statSync(jlinkPath)
        if (stats.isFile()) {
          console.log('✓ Found jlink file at:', jlinkPath)
          // Check executable permissions on Unix
          if (process.platform !== 'win32') {
            var mode = stats.mode
            var isExecutable = (mode & parseInt('111', 8)) !== 0
            if (!isExecutable) {
              console.warn('Warning: jlink exists but may not be executable')
            }
          }
          return jlinkPath
        } else {
          console.warn('Warning: jlink path exists but is not a file:', jlinkPath)
        }
      } catch (e) {
        console.warn('Warning: Could not access jlink at:', jlinkPath, '-', e.message)
      }
    } else {
      console.log('jlink not found at:', jlinkPath)
    }
  } else {
    console.log('JAVA_HOME not set')
  }

  // Fallback to 'jlink' in PATH
  console.log('Trying system jlink from PATH...')
  return 'jlink'
}

// Check if jlink is available
function checkJlink (jlinkPath) {
  return new Promise(function (resolve, reject) {
    var isAbsolutePath = path.isAbsolute(jlinkPath) || jlinkPath.includes(path.sep)

    if (isAbsolutePath) {
      // Try execFile first (for binaries)
      childProcess.execFile(jlinkPath, ['--version'], function (err, stdout, stderr) {
        if (err) {
          // If execFile fails, try with shell (for shell scripts)
          console.log('execFile failed, trying with shell...')
          childProcess.exec('"' + jlinkPath + '" --version', function (err2, stdout2, stderr2) {
            if (err2) {
              console.error('Error: Failed to execute jlink at:', jlinkPath)
              console.error('Error details:', err2.message)
              console.error('Please ensure JAVA_HOME points to a valid JDK installation.')
              reject(new Error('jlink execution failed'))
            } else {
              // jlink outputs version to stderr
              if (stderr2) {
                console.log('jlink version:', stderr2.trim().split('\n')[0])
              }
              resolve()
            }
          })
        } else {
          // jlink outputs version to stderr
          if (stderr) {
            console.log('jlink version:', stderr.trim().split('\n')[0])
          }
          resolve()
        }
      })
    } else {
      // Use exec for commands in PATH
      childProcess.exec('jlink --version', function (err, stdout, stderr) {
        if (err) {
          console.error('Error: jlink not found in PATH')
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
    }
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

    // Helper function to attach event handlers to child process
    function attachHandlers (childProcessInstance) {
      childProcessInstance.on('close', function (code) {
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
        var verifyJavaExe = path.join(jrePath, 'bin', PLATFORM === 'win32' ? 'java.exe' : 'java')

        var verifyChild = childProcess.spawn(verifyJavaExe, ['-version'], {
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
    }

    // Use spawn - for absolute paths, try without shell first, fallback to shell if needed
    var isAbsolutePath = path.isAbsolute(jlinkPath) || jlinkPath.includes(path.sep)
    var child

    if (isAbsolutePath) {
      // For absolute paths, try without shell first (works for binaries)
      child = childProcess.spawn(jlinkPath, jlinkArgs, {
        stdio: 'inherit'
      })

      // If spawn fails immediately (ENOENT/EACCES), try with shell (for shell scripts)
      child.on('error', function (spawnErr) {
        if (spawnErr.code === 'ENOENT' || spawnErr.code === 'EACCES') {
          console.log('Direct spawn failed, trying with shell...')
          // Retry with shell
          var shellChild = childProcess.spawn(jlinkPath, jlinkArgs, {
            stdio: 'inherit',
            shell: true
          })
          // Attach handlers to the shell child
          attachHandlers(shellChild)
          shellChild.on('error', function (shellErr) {
            reject(new Error('Failed to spawn jlink: ' + shellErr.message))
          })
        } else {
          reject(new Error('Failed to spawn jlink: ' + spawnErr.message))
        }
      })

      // Attach handlers if spawn succeeds
      attachHandlers(child)
    } else {
      // For commands in PATH, use spawn with shell on Windows
      child = childProcess.spawn(jlinkPath, jlinkArgs, {
        stdio: 'inherit',
        shell: process.platform === 'win32'
      })
      attachHandlers(child)
      child.on('error', function (err) {
        reject(new Error('Failed to spawn jlink: ' + err.message))
      })
    }
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
