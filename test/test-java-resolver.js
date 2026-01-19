#!/usr/bin/env node
'use strict'

/**
 * Test script for Java resolver
 * Tests the Java path resolution with fallback strategy
 */

var javaResolver = require('../lib/java-resolver')
var path = require('path')
var fs = require('fs')

console.log('Testing Java Resolver...')
console.log('')
console.log('Platform:', process.platform)
console.log('Architecture:', process.arch)
console.log('')

// Test 1: Resolve bundled JRE
console.log('Test 1: Resolving bundled JRE...')
var bundledJava = javaResolver.resolveBundledJava()
if (bundledJava) {
  console.log('✓ Bundled JRE found:', bundledJava)
  if (fs.existsSync(bundledJava)) {
    console.log('✓ Bundled JRE executable exists')
  } else {
    console.log('✗ Bundled JRE executable not found')
  }
} else {
  console.log('⚠ Bundled JRE not found (this is OK if package not installed)')
}
console.log('')

// Test 2: Resolve with default options
console.log('Test 2: Resolving Java with default options...')
var defaultJava = javaResolver.resolveJavaExecutable({})
if (defaultJava) {
  console.log('✓ Java resolved:', defaultJava)
  if (fs.existsSync(defaultJava)) {
    console.log('✓ Java executable exists')
  } else {
    console.log('✗ Java executable not found')
  }
} else {
  console.log('✗ No Java found')
}
console.log('')

// Test 3: Resolve with custom javaPath
console.log('Test 3: Resolving Java with custom path...')
var customJava = javaResolver.resolveJavaExecutable({
  javaPath: 'C:\\Program Files\\Java\\jdk-22\\bin\\java.exe'
})
if (customJava) {
  console.log('✓ Custom Java resolved:', customJava)
  if (fs.existsSync(customJava)) {
    console.log('✓ Custom Java executable exists')
  } else {
    console.log('✗ Custom Java executable not found')
  }
} else {
  console.log('✗ Custom Java not found')
}
console.log('')

// Test 4: Verify Java works
console.log('Test 4: Verifying Java executable...')
if (defaultJava && fs.existsSync(defaultJava)) {
  var childProcess = require('child_process')
  try {
    var result = childProcess.spawnSync(defaultJava, ['-version'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000
    })
    if (result.status === 0 || result.stderr) {
      console.log('✓ Java executable works')
      console.log('Version output:', result.stderr.split('\n')[0])
    } else {
      console.log('✗ Java executable failed')
    }
  } catch (e) {
    console.log('✗ Error verifying Java:', e.message)
  }
} else {
  console.log('⚠ Skipping verification (Java not found)')
}
console.log('')

// Test 5: Test runtime package name resolution
console.log('Test 5: Testing runtime package name resolution...')
var pkgName = javaResolver.getRuntimePackageName(process.platform, process.arch)
console.log('Expected package:', pkgName || '(unsupported platform)')
console.log('')

console.log('=== Test Summary ===')
if (defaultJava && fs.existsSync(defaultJava)) {
  console.log('✓ Java resolver is working correctly')
  console.log('Resolved Java:', defaultJava)
  process.exit(0)
} else {
  console.log('✗ Java resolver could not find a working Java installation')
  console.log('Please ensure Java is installed or bundled JRE is available')
  process.exit(1)
}

