#!/usr/bin/env node
'use strict'

/**
 * Test Graphviz build and detection across all supported platforms
 * This script simulates testing on different platforms by checking
 * the build scripts and detection logic
 * 
 * Usage:
 *   node scripts/test-all-platforms-graphviz.js
 */

var os = require('os')
var fs = require('fs')
var path = require('path')
var dotResolver = require('../lib/dot-resolver')

console.log('')
console.log('=== Testing Graphviz Support Across All Platforms ===')
console.log('')

var platforms = [
  { platform: 'win32', arch: 'x64', name: 'Windows x64' },
  { platform: 'darwin', arch: 'arm64', name: 'macOS ARM64 (Apple Silicon)' },
  { platform: 'darwin', arch: 'x64', name: 'macOS x64 (Intel)' },
  { platform: 'linux', arch: 'x64', name: 'Linux x64' }
]

var currentPlatform = os.platform()
var currentArch = os.arch()

console.log('Current platform:', currentPlatform, currentArch)
console.log('')

var results = []

for (var i = 0; i < platforms.length; i++) {
  var test = platforms[i]
  console.log('Testing:', test.name)
  console.log('  Platform:', test.platform, 'Arch:', test.arch)
  
  var result = {
    platform: test.platform,
    arch: test.arch,
    name: test.name,
    packageName: null,
    bundledPath: null,
    canBuild: false,
    isCurrentPlatform: false
  }
  
  // Check if this is the current platform
  var normalizedCurrent = currentPlatform === 'win32' ? 'win32' : (currentPlatform === 'darwin' ? 'darwin' : 'linux')
  var normalizedCurrentArch = currentArch === 'x64' ? 'x64' : (currentArch === 'arm64' ? 'arm64' : 'x64')
  
  if (test.platform === normalizedCurrent && test.arch === normalizedCurrentArch) {
    result.isCurrentPlatform = true
    console.log('  ✓ This is the current platform')
  }
  
  // Get package name
  result.packageName = dotResolver.getGraphvizPackageName(test.platform, test.arch)
  if (result.packageName) {
    console.log('  Package name:', result.packageName)
    
    // Check if package is installed
    try {
      var pkgPath = require.resolve(result.packageName + '/package.json')
      var pkgDir = path.dirname(pkgPath)
      var dotExe = test.platform === 'win32' ? 'dot.exe' : 'dot'
      var dotPath = path.join(pkgDir, 'graphviz', 'bin', dotExe)
      
      if (fs.existsSync(dotPath)) {
        result.bundledPath = dotPath
        console.log('  ✓ Bundled Graphviz found at:', dotPath)
      } else {
        console.log('  ℹ️  Package installed but dot executable not found')
      }
    } catch (e) {
      console.log('  ℹ️  Package not installed (this is OK)')
    }
  } else {
    console.log('  ✗ Unsupported platform/arch combination')
  }
  
  // Check if we can build on this platform
  if (result.isCurrentPlatform) {
    // Check if system Graphviz is available
    var systemDot = null
    var dotName = test.platform === 'win32' ? 'dot.exe' : 'dot'
    
    // Try common paths
    var paths = []
    if (test.platform === 'darwin') {
      if (test.arch === 'arm64') {
        paths.push('/opt/homebrew/bin/dot')
      }
      paths.push('/usr/local/bin/dot')
      paths.push('/opt/local/bin/dot')
    } else if (test.platform === 'win32') {
      var programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
      var programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
      paths.push(path.join(programFiles, 'Graphviz', 'bin', 'dot.exe'))
      paths.push(path.join(programFilesX86, 'Graphviz', 'bin', 'dot.exe'))
      paths.push('C:\\ProgramData\\chocolatey\\bin\\dot.exe')
    } else if (test.platform === 'linux') {
      paths.push('/usr/bin/dot')
      paths.push('/usr/local/bin/dot')
    }
    
    for (var j = 0; j < paths.length; j++) {
      if (fs.existsSync(paths[j])) {
        systemDot = paths[j]
        break
      }
    }
    
    // Try which/where
    if (!systemDot) {
      try {
        var command = test.platform === 'win32' ? 'where' : 'which'
        var whichResult = require('child_process').execSync(command + ' ' + dotName, { encoding: 'utf-8' })
        var foundPath = whichResult.trim().split('\n')[0]
        if (foundPath && fs.existsSync(foundPath)) {
          systemDot = foundPath
        }
      } catch (e) {
        // Not found
      }
    }
    
    if (systemDot) {
      result.canBuild = true
      console.log('  ✓ System Graphviz available for building:', systemDot)
    } else {
      console.log('  ⚠️  System Graphviz not found (cannot test build)')
    }
  } else {
    console.log('  ℹ️  Not current platform (cannot test build)')
  }
  
  results.push(result)
  console.log('')
}

// Summary
console.log('=== Summary ===')
console.log('')

var supportedCount = 0
var installedCount = 0
var canBuildCount = 0

for (var k = 0; k < results.length; k++) {
  var r = results[k]
  if (r.packageName) {
    supportedCount++
    console.log('✓', r.name, '- Supported')
    if (r.bundledPath) {
      installedCount++
      console.log('  → Bundled package installed')
    } else {
      console.log('  → Bundled package not installed')
    }
    if (r.canBuild) {
      canBuildCount++
      console.log('  → Can build on this platform')
    }
  } else {
    console.log('✗', r.name, '- Not supported')
  }
}

console.log('')
console.log('Supported platforms:', supportedCount, '/', platforms.length)
console.log('Installed packages:', installedCount, '/', supportedCount)
console.log('Can build on current platform:', canBuildCount > 0 ? 'Yes' : 'No')
console.log('')

// Recommendations
console.log('=== Recommendations ===')
console.log('')

if (canBuildCount === 0) {
  console.log('⚠️  System Graphviz not found on current platform.')
  console.log('   Install Graphviz to test building:')
  if (currentPlatform === 'darwin') {
    console.log('     brew install graphviz')
  } else if (currentPlatform === 'linux') {
    console.log('     sudo apt-get install graphviz')
  } else if (currentPlatform === 'win32') {
    console.log('     choco install graphviz -y')
  }
  console.log('')
}

if (installedCount < supportedCount) {
  console.log('ℹ️  To test bundled Graphviz detection, install packages:')
  for (var m = 0; m < results.length; m++) {
    var res = results[m]
    if (res.packageName && !res.bundledPath) {
      console.log('     npm install', res.packageName)
    }
  }
  console.log('')
}

console.log('To test build on current platform:')
console.log('  npm run test:graphviz')
console.log('')

