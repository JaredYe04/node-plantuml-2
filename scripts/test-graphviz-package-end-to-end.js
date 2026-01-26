#!/usr/bin/env node
'use strict'

/**
 * End-to-end test for Graphviz package
 * Actually generates PlantUML diagrams that require Graphviz
 *
 * Usage:
 *   node scripts/test-graphviz-package-end-to-end.js <platform> <arch> [output-dir]
 *
 * Example:
 *   node scripts/test-graphviz-package-end-to-end.js win32 x64 ./test-output
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

var PLATFORM = process.argv[2] || os.platform()
var ARCH = process.argv[3] || os.arch()
var OUTPUT_DIR = process.argv[4] || path.join(__dirname, '..', 'test-output-graphviz-e2e')

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

var packageDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'graphviz-' + PLATFORM + '-' + ARCH)
var graphvizDir = path.join(packageDir, 'graphviz')
var dotExe = PLATFORM === 'win32' ? 'dot.exe' : 'dot'
var dotPath = path.join(graphvizDir, 'bin', dotExe)

var jreDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-' + PLATFORM + '-' + ARCH)
var javaExe = PLATFORM === 'win32' ? 'java.exe' : 'java'
var javaPath = path.join(jreDir, 'jre', 'bin', javaExe)

var plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml.jar')

var errors = []
var testResults = []

console.log('')
console.log('='.repeat(60))
console.log('Graphviz Package End-to-End Test')
console.log('='.repeat(60))
console.log('Platform:', PLATFORM)
console.log('Architecture:', ARCH)
console.log('Output directory:', OUTPUT_DIR)
console.log('')

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Test 1: Check Graphviz package exists
console.log('Test 1: Checking Graphviz package...')
if (!fs.existsSync(dotPath)) {
  errors.push('Graphviz dot executable not found: ' + dotPath)
  console.log('❌ Graphviz package not found')
  console.log('   Expected at:', packageDir)
  process.exit(1)
}
console.log('✓ Graphviz package found:', dotPath)

// Test 2: Check JRE exists (optional, but preferred)
console.log('Test 2: Checking JRE...')
var useBundledJRE = false
if (fs.existsSync(javaPath)) {
  useBundledJRE = true
  console.log('✓ Bundled JRE found:', javaPath)
} else {
  // Try system Java
  try {
    childProcess.execSync('java -version', { stdio: 'ignore' })
    javaPath = 'java'
    console.log('✓ Using system Java')
  } catch (e) {
    errors.push('No Java found (neither bundled JRE nor system Java)')
    console.log('❌ No Java found')
    process.exit(1)
  }
}

// Test 3: Check PlantUML JAR exists
console.log('Test 3: Checking PlantUML JAR...')
if (!fs.existsSync(plantumlJar)) {
  errors.push('PlantUML JAR not found: ' + plantumlJar)
  console.log('❌ PlantUML JAR not found')
  console.log('   Run: node scripts/get-plantuml-jar.js --latest')
  process.exit(1)
}
console.log('✓ PlantUML JAR found:', plantumlJar)

// Test 4: Test dot executable works
console.log('Test 4: Testing dot executable...')
try {
  var dotTest = childProcess.spawnSync(dotPath, ['-V'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10000
  })
  if (dotTest.status === 0 || dotTest.stdout || dotTest.stderr) {
    var version = (dotTest.stdout || dotTest.stderr || '').trim().split('\n')[0]
    console.log('✓ Dot executable works:', version)
  } else {
    errors.push('Dot executable failed to run')
    console.log('❌ Dot executable failed')
    process.exit(1)
  }
} catch (e) {
  errors.push('Error testing dot: ' + e.message)
  console.log('❌ Error testing dot:', e.message)
  process.exit(1)
}

// Test 5: Set up environment variables for Graphviz
console.log('Test 5: Setting up environment variables...')
var env = Object.assign({}, process.env)

if (PLATFORM === 'win32') {
  // Windows: Add bin directory to PATH
  var binDir = path.dirname(dotPath)
  var pathKey = 'PATH'
  for (var key in process.env) {
    if (key.toUpperCase() === 'PATH') {
      pathKey = key
      break
    }
  }
  env[pathKey] = binDir + ';' + (env[pathKey] || '')
  console.log('✓ Added Graphviz bin to PATH:', binDir)
} else if (PLATFORM === 'linux') {
  // Linux: Set LD_LIBRARY_PATH
  var libDir = path.join(graphvizDir, 'lib')
  if (fs.existsSync(libDir)) {
    env.LD_LIBRARY_PATH = libDir + ':' + (env.LD_LIBRARY_PATH || '')
    console.log('✓ Set LD_LIBRARY_PATH:', libDir)
  } else {
    console.log('⚠️  Warning: lib directory not found, may cause issues')
  }
} else if (PLATFORM === 'darwin') {
  // macOS: Set DYLD_LIBRARY_PATH
  var libDir = path.join(graphvizDir, 'lib')
  if (fs.existsSync(libDir)) {
    env.DYLD_LIBRARY_PATH = libDir + ':' + (env.DYLD_LIBRARY_PATH || '')
    console.log('✓ Set DYLD_LIBRARY_PATH:', libDir)
  } else {
    console.log('⚠️  Warning: lib directory not found, may cause issues')
  }
}

// Test diagrams that require Graphviz
var testDiagrams = [
  {
    name: 'Activity Diagram',
    code: '@startuml\n!theme plain\nstart\n:Initialize;\nif (Check condition?) then (yes)\n  :Process A;\nelse (no)\n  :Process B;\nendif\nstop\n@enduml',
    format: 'png',
    requiresGraphviz: true
  },
  {
    name: 'State Diagram',
    code: '@startuml\n!theme plain\n[*] --> State1\nState1 --> State2 : transition1\nState2 --> State3 : transition2\nState3 --> [*]\n@enduml',
    format: 'png',
    requiresGraphviz: true
  },
  {
    name: 'Component Diagram',
    code: '@startuml\n!theme plain\ncomponent [Component A]\ncomponent [Component B]\n[Component A] --> [Component B]\n@enduml',
    format: 'svg',
    requiresGraphviz: true
  },
  {
    name: 'Complex Activity Diagram',
    code: '@startuml\n!theme plain\nstart\nrepeat\n  :Read data;\n  :Process data;\nrepeat while (More data?) is (yes)\n->no;\n:Finalize;\nstop\n@enduml',
    format: 'png',
    requiresGraphviz: true
  }
]

console.log('')
console.log('Test 6: Generating PlantUML diagrams with Graphviz...')
console.log('')

var successCount = 0
var failCount = 0

for (var i = 0; i < testDiagrams.length; i++) {
  var test = testDiagrams[i]
  var testName = test.name
  var outputFile = path.join(OUTPUT_DIR, 'test-' + (i + 1) + '-' + testName.toLowerCase().replace(/\s+/g, '-') + '.' + test.format)
  
  console.log('Generating:', testName, '...')
  
  try {
    // Create temporary input file
    var inputFile = path.join(OUTPUT_DIR, 'input-' + i + '.puml')
    fs.writeFileSync(inputFile, test.code, 'utf8')
    
    // Build PlantUML command
    // Use absolute path for dot (required by PlantUML Java process)
    var absoluteDotPath = path.resolve(dotPath)
    if (PLATFORM === 'win32') {
      absoluteDotPath = absoluteDotPath.replace(/\//g, '\\')
    }
    
    var plantumlArgs = [
      '-Djava.awt.headless=true',
      '-Dfile.encoding=UTF-8',
      '-jar', plantumlJar,
      '-t' + test.format,
      '-graphvizdot', absoluteDotPath,
      inputFile
    ]
    
    // Execute PlantUML
    var result = childProcess.spawnSync(javaPath, plantumlArgs, {
      cwd: OUTPUT_DIR,
      env: env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000
    })
    
    // Log stderr for debugging (PlantUML often outputs warnings to stderr)
    if (result.stderr && result.stderr.length > 0) {
      var stderrLines = result.stderr.split('\n').slice(0, 5) // First 5 lines
      var hasError = stderrLines.some(function (line) {
        return line.toLowerCase().includes('error') || 
               line.toLowerCase().includes('exception') ||
               line.toLowerCase().includes('cannot')
      })
      if (hasError) {
        console.log('  ⚠️  PlantUML stderr:', stderrLines.join('; '))
      }
    }
    
    // Check if output file was created
    var expectedOutput = path.join(OUTPUT_DIR, path.basename(inputFile, '.puml') + '.' + test.format)
    if (fs.existsSync(expectedOutput)) {
      // Move to desired location
      if (expectedOutput !== outputFile) {
        fs.renameSync(expectedOutput, outputFile)
      }
      
      var stats = fs.statSync(outputFile)
      if (stats.size > 0) {
        console.log('  ✓ Success! Output:', outputFile, '(' + (stats.size / 1024).toFixed(2) + ' KB)')
        testResults.push({
          name: testName,
          success: true,
          file: outputFile,
          size: stats.size
        })
        successCount++
      } else {
        console.log('  ❌ Failed: Output file is empty')
        testResults.push({
          name: testName,
          success: false,
          error: 'Output file is empty'
        })
        failCount++
      }
    } else {
      var errorMsg = 'Output file not created'
      if (result.stderr) {
        errorMsg += ': ' + result.stderr.substring(0, 200)
      }
      console.log('  ❌ Failed:', errorMsg)
      testResults.push({
        name: testName,
        success: false,
        error: errorMsg
      })
      failCount++
    }
    
    // Clean up input file
    if (fs.existsSync(inputFile)) {
      fs.unlinkSync(inputFile)
    }
  } catch (e) {
    console.log('  ❌ Error:', e.message)
    testResults.push({
      name: testName,
      success: false,
      error: e.message
    })
    failCount++
  }
}

// Summary
console.log('')
console.log('='.repeat(60))
console.log('Test Summary')
console.log('='.repeat(60))
console.log('Total tests:', testDiagrams.length)
console.log('Successful:', successCount)
console.log('Failed:', failCount)
console.log('')

if (failCount === 0) {
  console.log('✅ All tests passed! Graphviz package works correctly.')
  console.log('')
  console.log('Generated files:')
  testResults.forEach(function (result) {
    if (result.success) {
      console.log('  ✓', result.name + ':', result.file, '(' + (result.size / 1024).toFixed(2) + ' KB)')
    }
  })
  console.log('')
  console.log('Output directory:', OUTPUT_DIR)
  process.exit(0)
} else {
  console.log('❌ Some tests failed!')
  console.log('')
  console.log('Failed tests:')
  testResults.forEach(function (result) {
    if (!result.success) {
      console.log('  ❌', result.name + ':', result.error)
    }
  })
  console.log('')
  process.exit(1)
}

