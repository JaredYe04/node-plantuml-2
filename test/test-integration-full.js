#!/usr/bin/env node
'use strict'

/**
 * Comprehensive integration test for node-plantuml-2
 * Tests JRE access, Graphviz detection, and PlantUML rendering
 *
 * Usage:
 *   node test/test-integration-full.js
 */

var plantuml = require('../lib/node-plantuml')
var javaResolver = require('../lib/java-resolver')
var dotResolver = require('../lib/dot-resolver')
var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

/**
 * Get environment with library path for bundled Graphviz
 */
function getEnvWithLibPath (dotPath) {
  var env = Object.assign({}, process.env)
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  
  if (libPath) {
    // Ensure libPath is absolute
    libPath = path.resolve(libPath)
    
    var platform = os.platform()
    if (platform === 'linux') {
      var existingLibPath = env.LD_LIBRARY_PATH || ''
      env.LD_LIBRARY_PATH = libPath + (existingLibPath ? ':' + existingLibPath : '')
    } else if (platform === 'darwin') {
      var existingDyldPath = env.DYLD_LIBRARY_PATH || ''
      env.DYLD_LIBRARY_PATH = libPath + (existingDyldPath ? ':' + existingDyldPath : '')
    }
  }
  
  return env
}

console.log('')
console.log('=== Comprehensive Integration Test ===')
console.log('Platform:', os.platform(), os.arch())
console.log('')

var testsPassed = 0
var testsFailed = 0
var testResults = []

function logTest (name, passed, message) {
  var status = passed ? '✓' : '✗'
  console.log(status, name + (message ? ': ' + message : ''))
  testResults.push({ name: name, passed: passed, message: message })
  if (passed) {
    testsPassed++
  } else {
    testsFailed++
  }
}

// Test 1: JRE Detection
console.log('Test 1: JRE Detection')
console.log('---')
try {
  var javaPath = javaResolver.resolveJavaExecutable({})
  if (javaPath) {
    logTest('JRE Detection', true, 'Found at: ' + javaPath)

    // Verify JRE works
    try {
      childProcess.execSync('"' + javaPath + '" -version', {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      })
      logTest('JRE Execution', true, 'Java version check passed')
    } catch (e) {
      logTest('JRE Execution', false, 'Failed to execute Java: ' + e.message)
    }
  } else {
    logTest('JRE Detection', false, 'No JRE found')
  }
} catch (e) {
  logTest('JRE Detection', false, 'Error: ' + e.message)
}
console.log('')

// Test 2: Graphviz Detection
console.log('Test 2: Graphviz Detection')
console.log('---')
try {
  var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
  if (dotPath) {
    logTest('Graphviz Detection', true, 'Found at: ' + dotPath)

    // Check if bundled or system
    var bundled = dotResolver.resolveBundledGraphviz()
    if (bundled && bundled === dotPath) {
      logTest('Graphviz Source', true, 'Using bundled Graphviz')
    } else {
      logTest('Graphviz Source', true, 'Using system Graphviz')
    }

    // Verify Graphviz works
    try {
      var env = getEnvWithLibPath(dotPath)
      var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
      if (libPath) {
        // Ensure libPath is absolute
        libPath = path.resolve(libPath)
        
        console.log('  Library path:', libPath)
        console.log('  LD_LIBRARY_PATH:', env.LD_LIBRARY_PATH || env.DYLD_LIBRARY_PATH || 'not set')
        // Verify lib directory exists
        if (fs.existsSync(libPath)) {
          var libFiles = fs.readdirSync(libPath).filter(function (f) { return f.includes('libgvc') || f.includes('libgraph') })
          console.log('  Found library files:', libFiles.length > 0 ? libFiles.slice(0, 5).join(', ') : 'none')
          
          // On Linux, check and create missing symlinks for library files
          if (os.platform() === 'linux') {
            // Find library files that need symlinks (e.g., libgvc.so.6.0.0 needs libgvc.so.6)
            libFiles.forEach(function (libFile) {
              // Match pattern: libname.so.major.minor.patch (e.g., libgvc.so.6.0.0)
              var match = libFile.match(/^(lib\w+)\.so\.(\d+)\.(\d+)\.(\d+)$/)
              if (match) {
                var libBase = match[1] // e.g., libgvc
                var major = match[2] // e.g., 6
                var minor = match[3] // e.g., 0
                var patch = match[4] // e.g., 0
                
                // Create symlinks: libgvc.so.6 -> libgvc.so.6.0.0
                var symlinkPath = path.join(libPath, libBase + '.so.' + major)
                var targetPath = libFile
                
                if (!fs.existsSync(symlinkPath)) {
                  try {
                    fs.symlinkSync(targetPath, symlinkPath)
                    console.log('  ✓ Created symlink:', path.basename(symlinkPath), '->', targetPath)
                  } catch (symlinkErr) {
                    // Ignore symlink creation errors (may already exist or permission issue)
                  }
                }
                
                // Also create libgvc.so -> libgvc.so.6 symlink
                var soSymlinkPath = path.join(libPath, libBase + '.so')
                if (!fs.existsSync(soSymlinkPath)) {
                  try {
                    fs.symlinkSync(libBase + '.so.' + major, soSymlinkPath)
                    console.log('  ✓ Created symlink:', path.basename(soSymlinkPath), '->', libBase + '.so.' + major)
                  } catch (symlinkErr) {
                    // Ignore symlink creation errors
                  }
                }
              }
            })
          }
        } else {
          console.log('  Warning: Library directory does not exist:', libPath)
        }
      }
      childProcess.execSync('"' + dotPath + '" -V', {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: env
      })
      logTest('Graphviz Execution', true, 'dot version check passed')
    } catch (e) {
      logTest('Graphviz Execution', false, 'Failed to execute dot: ' + e.message)
    }
  } else {
    logTest('Graphviz Detection', false, 'No Graphviz found')
  }
} catch (e) {
  logTest('Graphviz Detection', false, 'Error: ' + e.message)
}
console.log('')

// Test 3: PlantUML JAR
console.log('Test 3: PlantUML JAR')
console.log('---')
var plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml.jar')
if (fs.existsSync(plantumlJar)) {
  var stats = fs.statSync(plantumlJar)
  logTest('PlantUML JAR Exists', true, 'Size: ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB')
} else {
  logTest('PlantUML JAR Exists', false, 'Not found at: ' + plantumlJar)
}
console.log('')

// Test 4: PlantUML testdot
console.log('Test 4: PlantUML testdot')
console.log('---')
var testdotPromise = new Promise(function (resolve) {
  plantuml.testdot(function (isOk) {
    logTest('PlantUML testdot', isOk, isOk ? 'Graphviz integration OK' : 'Graphviz integration failed')
    resolve()
  })
})

// Test 5: Simple PNG Generation
function testPngGeneration () {
  return new Promise(function (resolve) {
    console.log('Test 5: Simple PNG Generation')
    console.log('---')
    var testCode = '@startuml\nAlice -> Bob: Hello\n@enduml'
    var gen = plantuml.generate(testCode, { format: 'png' })

    var chunks = []
    var hasError = false

    gen.out.on('data', function (chunk) {
      chunks.push(chunk)
    })

    gen.out.on('error', function (err) {
      logTest('PNG Generation', false, 'Error: ' + err.message)
      hasError = true
      resolve()
    })

    gen.out.on('end', function () {
      if (hasError) {
        resolve()
        return
      }

      var buffer = Buffer.concat(chunks)
      if (buffer.length > 0) {
        // Verify it's a valid PNG (starts with PNG signature)
        var isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
        logTest('PNG Generation', true, 'Generated ' + buffer.length + ' bytes, valid PNG: ' + (isPng ? 'Yes' : 'No'))
      } else {
        logTest('PNG Generation', false, 'Empty output')
      }
      console.log('')
      resolve()
    })

    setTimeout(function () {
      if (chunks.length === 0 && !hasError) {
        logTest('PNG Generation', false, 'Timeout')
        console.log('')
        resolve()
      }
    }, 30000)
  })
}

// Test 6: SVG Generation
function testSvgGeneration () {
  return new Promise(function (resolve) {
    console.log('Test 6: SVG Generation')
    console.log('---')
    var testCode = '@startuml\nA -> B\n@enduml'
    var gen = plantuml.generate(testCode, { format: 'svg' })

    var chunks = []
    var hasError = false

    gen.out.on('data', function (chunk) {
      chunks.push(chunk)
    })

    gen.out.on('error', function (err) {
      logTest('SVG Generation', false, 'Error: ' + err.message)
      hasError = true
      resolve()
    })

    gen.out.on('end', function () {
      if (hasError) {
        resolve()
        return
      }

      var buffer = Buffer.concat(chunks)
      if (buffer.length > 0) {
        var isSvg = buffer.toString('utf-8', 0, Math.min(100, buffer.length)).indexOf('<svg') !== -1
        logTest('SVG Generation', true, 'Generated ' + buffer.length + ' bytes, valid SVG: ' + (isSvg ? 'Yes' : 'No'))
      } else {
        logTest('SVG Generation', false, 'Empty output')
      }
      console.log('')
      resolve()
    })

    setTimeout(function () {
      if (chunks.length === 0 && !hasError) {
        logTest('SVG Generation', false, 'Timeout')
        console.log('')
        resolve()
      }
    }, 30000)
  })
}

// Test 7: Graphviz-dependent diagram
function testGraphvizDiagram () {
  return new Promise(function (resolve) {
    console.log('Test 7: Graphviz-dependent Diagram')
    console.log('---')
    var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
    if (dotPath) {
      // Use a simple activity diagram that requires Graphviz
      var testCode = '@startuml\nstart\n:Hello;\nstop\n@enduml'
      var gen = plantuml.generate(testCode, { format: 'png' })

      var chunks = []
      var hasError = false

      gen.out.on('data', function (chunk) {
        chunks.push(chunk)
      })

      gen.out.on('error', function (err) {
        logTest('Graphviz Diagram', false, 'Error: ' + err.message)
        hasError = true
        resolve()
      })

      gen.out.on('end', function () {
        if (hasError) {
          resolve()
          return
        }

        var buffer = Buffer.concat(chunks)
        if (buffer.length > 0) {
          logTest('Graphviz Diagram', true, 'Generated ' + buffer.length + ' bytes')
        } else {
          logTest('Graphviz Diagram', false, 'Empty output')
        }
        console.log('')
        resolve()
      })

      setTimeout(function () {
        if (chunks.length === 0 && !hasError) {
          logTest('Graphviz Diagram', false, 'Timeout')
          console.log('')
          resolve()
        }
      }, 30000)
    } else {
      logTest('Graphviz Diagram', false, 'Skipped (Graphviz not available)')
      console.log('')
      resolve()
    }
  })
}

// Run all tests
testdotPromise
  .then(function () {
    return testPngGeneration()
  })
  .then(function () {
    return testSvgGeneration()
  })
  .then(function () {
    return testGraphvizDiagram()
  })
  .then(function () {
    // Summary
    console.log('=== Test Summary ===')
    console.log('')
    console.log('Total tests:', testsPassed + testsFailed)
    console.log('Passed:', testsPassed)
    console.log('Failed:', testsFailed)
    console.log('')

    if (testsFailed > 0) {
      console.log('Failed tests:')
      for (var j = 0; j < testResults.length; j++) {
        if (!testResults[j].passed) {
          console.log('  ✗', testResults[j].name, testResults[j].message || '')
        }
      }
      console.log('')
      process.exit(1)
    } else {
      console.log('✅ All tests passed!')
      process.exit(0)
    }
  })
  .catch(function (err) {
    console.error('❌ Test execution error:', err)
    console.error(err.stack)
    process.exit(1)
  })
