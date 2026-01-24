#!/usr/bin/env node
'use strict'

/**
 * Test script to verify Graphviz build and detection on different platforms
 * 
 * Usage:
 *   node scripts/test-graphviz-build.js [platform] [arch]
 * 
 * Example:
 *   node scripts/test-graphviz-build.js darwin arm64
 *   node scripts/test-graphviz-build.js win32 x64
 *   node scripts/test-graphviz-build.js linux x64
 */

var os = require('os')
var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')

var PLATFORM = process.argv[2] || os.platform()
var ARCH = process.argv[3] || os.arch()

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
console.log('=== Graphviz Build and Detection Test ===')
console.log('Platform:', PLATFORM)
console.log('Architecture:', ARCH)
console.log('Current platform:', os.platform(), os.arch())
console.log('')

// Test 1: Check if Graphviz is installed on system
console.log('Test 1: Checking system Graphviz installation...')
var dotResolver = require('../lib/dot-resolver')

function findSystemDot () {
  var dotName = PLATFORM === 'win32' ? 'dot.exe' : 'dot'
  var paths = []
  
  if (PLATFORM === 'darwin') {
    if (ARCH === 'arm64') {
      paths.push('/opt/homebrew/bin/dot')
    }
    paths.push('/usr/local/bin/dot')
    paths.push('/opt/local/bin/dot')
  } else if (PLATFORM === 'win32') {
    var programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    var programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    paths.push(path.join(programFiles, 'Graphviz', 'bin', 'dot.exe'))
    paths.push(path.join(programFilesX86, 'Graphviz', 'bin', 'dot.exe'))
    paths.push('C:\\ProgramData\\chocolatey\\bin\\dot.exe')
  } else if (PLATFORM === 'linux') {
    paths.push('/usr/bin/dot')
    paths.push('/usr/local/bin/dot')
  }
  
  for (var i = 0; i < paths.length; i++) {
    if (fs.existsSync(paths[i])) {
      return paths[i]
    }
  }
  
  try {
    var command = PLATFORM === 'win32' ? 'where' : 'which'
    var result = childProcess.execSync(command + ' ' + dotName, { encoding: 'utf-8' })
    var foundPath = result.trim().split('\n')[0]
    if (foundPath && fs.existsSync(foundPath)) {
      return foundPath
    }
  } catch (e) {
    // Not found
  }
  
  return null
}

var systemDot = findSystemDot()
if (systemDot) {
  console.log('✓ System Graphviz found at:', systemDot)
  try {
    var version = childProcess.execSync('"' + systemDot + '" -V', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
    console.log('  Version:', version.split('\n')[0])
  } catch (e) {
    console.log('  ⚠️  Could not get version')
  }
} else {
  console.log('✗ System Graphviz not found')
  console.log('  Please install Graphviz first:')
  if (PLATFORM === 'darwin') {
    console.log('    brew install graphviz')
  } else if (PLATFORM === 'linux') {
    console.log('    sudo apt-get install graphviz')
  } else if (PLATFORM === 'win32') {
    console.log('    choco install graphviz -y')
  }
  console.log('')
  process.exit(1)
}

console.log('')

// Test 2: Test dot-resolver detection
console.log('Test 2: Testing dot-resolver detection...')
var detected = dotResolver.resolveDotExecutable({ dotPath: null })
if (detected) {
  console.log('✓ dot-resolver detected:', detected)
  if (fs.existsSync(detected)) {
    console.log('  Path exists: ✓')
    try {
      var stats = fs.statSync(detected)
      if (PLATFORM !== 'win32') {
        var isExec = (stats.mode & parseInt('111', 8)) !== 0
        console.log('  Is executable:', isExec ? '✓' : '✗')
      } else {
        console.log('  Is executable: ✓ (Windows)')
      }
    } catch (e) {
      console.log('  ⚠️  Error checking file:', e.message)
    }
  } else {
    console.log('  ✗ Path does not exist!')
  }
} else {
  console.log('✗ dot-resolver could not detect Graphviz')
}

console.log('')

// Test 3: Test bundled Graphviz detection
console.log('Test 3: Testing bundled Graphviz detection...')
var bundledGraphviz = dotResolver.resolveBundledGraphviz()
if (bundledGraphviz) {
  console.log('✓ Bundled Graphviz found at:', bundledGraphviz)
  if (fs.existsSync(bundledGraphviz)) {
    console.log('  Path exists: ✓')
  } else {
    console.log('  ✗ Path does not exist!')
  }
} else {
  console.log('ℹ️  Bundled Graphviz not found (this is OK if package is not installed)')
  var pkgName = dotResolver.getGraphvizPackageName(PLATFORM, ARCH)
  if (pkgName) {
    console.log('  Expected package:', pkgName)
    console.log('  Install with: npm install ' + pkgName)
  }
}

console.log('')

// Test 4: Build Graphviz package (if system Graphviz is available)
if (systemDot) {
  console.log('Test 4: Building Graphviz package...')
  try {
    var buildScript = path.join(__dirname, 'build-graphviz.js')
    console.log('Running build script...')
    
    var buildResult = childProcess.execSync(
      'node "' + buildScript + '" ' + PLATFORM + ' ' + ARCH,
      { encoding: 'utf-8', stdio: 'inherit' }
    )
    
    console.log('✓ Build completed')
    
    // Verify built package
    var outputDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'graphviz-' + PLATFORM + '-' + ARCH)
    var dotExe = PLATFORM === 'win32' ? 'dot.exe' : 'dot'
    var builtDotPath = path.join(outputDir, 'graphviz', 'bin', dotExe)
    
    if (fs.existsSync(builtDotPath)) {
      console.log('✓ Built dot executable found at:', builtDotPath)
      
      // Test the built executable
      try {
        var builtVersion = childProcess.execSync('"' + builtDotPath + '" -V', {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe']
        })
        console.log('✓ Built dot executable works!')
        console.log('  Version:', builtVersion.split('\n')[0])
      } catch (e) {
        console.log('✗ Built dot executable failed to run:', e.message)
      }
    } else {
      console.log('✗ Built dot executable not found at:', builtDotPath)
    }
    
  } catch (e) {
    console.log('✗ Build failed:', e.message)
    if (e.stdout) console.log('STDOUT:', e.stdout)
    if (e.stderr) console.log('STDERR:', e.stderr)
  }
} else {
  console.log('Test 4: Skipping build (system Graphviz not found)')
}

console.log('')

// Test 5: Test package.json creation
console.log('Test 5: Testing package.json creation...')
try {
  var createScript = path.join(__dirname, 'create-graphviz-package-json.js')
  var testVersion = '1.0.0-test'
  var outputDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'graphviz-' + PLATFORM + '-' + ARCH)
  
  childProcess.execSync(
    'node "' + createScript + '" ' + PLATFORM + ' ' + ARCH + ' ' + testVersion,
    { encoding: 'utf-8', stdio: 'inherit' }
  )
  
  var packageJsonPath = path.join(outputDir, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    console.log('✓ package.json created at:', packageJsonPath)
    var pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    console.log('  Package name:', pkg.name)
    console.log('  Version:', pkg.version)
    console.log('  OS:', pkg.os)
    console.log('  CPU:', pkg.cpu)
  } else {
    console.log('✗ package.json not found')
  }
} catch (e) {
  console.log('✗ package.json creation failed:', e.message)
}

console.log('')
console.log('=== Test Summary ===')
console.log('Platform:', PLATFORM, ARCH)
console.log('System Graphviz:', systemDot ? '✓ Found' : '✗ Not found')
console.log('dot-resolver detection:', detected ? '✓ Working' : '✗ Failed')
console.log('Bundled Graphviz:', bundledGraphviz ? '✓ Found' : 'ℹ️  Not installed')
console.log('')

