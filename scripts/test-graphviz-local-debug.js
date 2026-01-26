#!/usr/bin/env node
'use strict'

/**
 * Local debug script to test Graphviz package end-to-end
 * Simulates the CI/CD environment locally
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

var PLATFORM = os.platform()
var ARCH = os.arch()
var OUTPUT_DIR = path.join(__dirname, '..', 'test-output-graphviz-debug')

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

console.log('')
console.log('='.repeat(60))
console.log('Local Graphviz Package Debug Test')
console.log('='.repeat(60))
console.log('Platform:', PLATFORM)
console.log('Architecture:', ARCH)
console.log('Output directory:', OUTPUT_DIR)
console.log('')

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Test 1: Check Graphviz package
var packageDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'graphviz-' + PLATFORM + '-' + ARCH)
var graphvizDir = path.join(packageDir, 'graphviz')
var dotExe = PLATFORM === 'win32' ? 'dot.exe' : 'dot'
var dotPath = path.join(graphvizDir, 'bin', dotExe)

console.log('Test 1: Checking Graphviz package...')
if (!fs.existsSync(dotPath)) {
  console.log('❌ Graphviz package not found:', dotPath)
  console.log('   Expected at:', packageDir)
  console.log('   Please build Graphviz package first:')
  console.log('   node scripts/build-graphviz.js', PLATFORM, ARCH)
  process.exit(1)
}
console.log('✓ Graphviz package found:', dotPath)

// Test 2: Check Java
var javaPath = 'java'
try {
  childProcess.execSync('java -version', { stdio: 'ignore' })
  console.log('✓ Using system Java')
} catch (e) {
  console.log('❌ No Java found')
  process.exit(1)
}

// Test 3: Check PlantUML JAR
var plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml.jar')
console.log('Test 3: Checking PlantUML JAR...')
if (!fs.existsSync(plantumlJar)) {
  console.log('❌ PlantUML JAR not found:', plantumlJar)
  console.log('   Run: node scripts/get-plantuml-jar.js --latest')
  process.exit(1)
}
console.log('✓ PlantUML JAR found:', plantumlJar)

// Test 4: Test dot executable
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
    console.log('❌ Dot executable failed to run')
    process.exit(1)
  }
} catch (e) {
  console.log('❌ Error testing dot:', e.message)
  process.exit(1)
}

// Test 5: Set up environment variables
console.log('Test 5: Setting up environment variables...')
var env = Object.assign({}, process.env)

if (PLATFORM === 'win32') {
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
  var libDir = path.join(graphvizDir, 'lib')
  if (fs.existsSync(libDir)) {
    env.LD_LIBRARY_PATH = libDir + ':' + (env.LD_LIBRARY_PATH || '')
    console.log('✓ Set LD_LIBRARY_PATH:', libDir)
  } else {
    console.log('⚠️  Warning: lib directory not found, may cause issues')
  }
} else if (PLATFORM === 'darwin') {
  var libDir = path.join(graphvizDir, 'lib')
  if (fs.existsSync(libDir)) {
    env.DYLD_LIBRARY_PATH = libDir + ':' + (env.DYLD_LIBRARY_PATH || '')
    console.log('✓ Set DYLD_LIBRARY_PATH:', libDir)
  } else {
    console.log('⚠️  Warning: lib directory not found, may cause issues')
  }
}

// Test 6: Simple PlantUML test
console.log('')
console.log('Test 6: Testing PlantUML with Graphviz...')
console.log('')

var testCode = '@startuml\n!theme plain\nstart\n:Initialize;\nif (Check condition?) then (yes)\n  :Process A;\nelse (no)\n  :Process B;\nendif\nstop\n@enduml'

var inputFile = path.join(OUTPUT_DIR, 'test.puml')
fs.writeFileSync(inputFile, testCode, 'utf8')

var absoluteDotPath = path.resolve(dotPath)
if (PLATFORM === 'win32') {
  absoluteDotPath = absoluteDotPath.replace(/\//g, '\\')
}

var absoluteInputFile = path.resolve(inputFile)
var absoluteOutputDir = path.resolve(OUTPUT_DIR)

var plantumlArgs = [
  '-Djava.awt.headless=true',
  '-Dfile.encoding=UTF-8',
  '-jar', plantumlJar,
  '-tpng',
  '-o', absoluteOutputDir,
  '-graphvizdot', absoluteDotPath,
  absoluteInputFile
]

console.log('Command:', javaPath, plantumlArgs.join(' '))
console.log('')

var result = childProcess.spawnSync(javaPath, plantumlArgs, {
  cwd: OUTPUT_DIR,
  env: env,
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 30000
})

console.log('Exit code:', result.status || 0)
console.log('')

if (result.stderr) {
  var stderrText = result.stderr.trim()
  if (stderrText.length > 0) {
    console.log('stderr (' + stderrText.length + ' chars):')
    console.log(stderrText)
    console.log('')
  } else {
    console.log('stderr: (empty)')
    console.log('')
  }
} else {
  console.log('stderr: (null)')
  console.log('')
}

if (result.stdout) {
  var stdoutText = result.stdout.trim()
  if (stdoutText.length > 0) {
    console.log('stdout (' + stdoutText.length + ' chars):')
    console.log(stdoutText)
    console.log('')
  } else {
    console.log('stdout: (empty)')
    console.log('')
  }
} else {
  console.log('stdout: (null)')
  console.log('')
}

// Check output files
console.log('Files in output directory:')
try {
  var files = fs.readdirSync(OUTPUT_DIR)
  if (files.length > 0) {
    files.forEach(function (file) {
      var filePath = path.join(OUTPUT_DIR, file)
      var stats = fs.statSync(filePath)
      console.log('  - ' + file + ' (' + (stats.size / 1024).toFixed(2) + ' KB, ' + (stats.isDirectory() ? 'dir' : 'file') + ')')
    })
  } else {
    console.log('  (directory is empty)')
  }
} catch (e) {
  console.log('  (error listing directory:', e.message + ')')
}

// Check expected output
var expectedOutput = path.join(OUTPUT_DIR, 'test.png')
if (fs.existsSync(expectedOutput)) {
  var stats = fs.statSync(expectedOutput)
  console.log('')
  console.log('✓ Output file found:', expectedOutput, '(' + (stats.size / 1024).toFixed(2) + ' KB)')
  console.log('✅ Test passed!')
} else {
  console.log('')
  console.log('❌ Output file not found:', expectedOutput)
  console.log('❌ Test failed!')
  process.exit(1)
}

