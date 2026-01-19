#!/usr/bin/env node
'use strict'

/**
 * Build minimal JRE using jlink for Windows
 * Uses specified Java JDK path
 */

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')

// Use the specified Java 22 path directly
var JAVA_HOME = 'C:\\Program Files\\Java\\jdk-22'
var JAVA_BIN = path.join(JAVA_HOME, 'bin')
var JLINK_EXE = path.join(JAVA_BIN, 'jlink.exe')

var PLATFORM = 'win32'
var ARCH = 'x64'
var OUTPUT_DIR = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-' + PLATFORM + '-' + ARCH)

console.log('Building JRE for platform:', PLATFORM, 'architecture:', ARCH)
console.log('Java Home:', JAVA_HOME)
console.log('Output directory:', OUTPUT_DIR)
console.log('')

// Check if jlink exists
if (!fs.existsSync(JLINK_EXE)) {
  console.error('Error: jlink not found at:', JLINK_EXE)
  console.error('Please set JAVA_HOME or update JAVA_HOME in this script')
  process.exit(1)
}

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

var jrePath = path.join(OUTPUT_DIR, 'jre')

console.log('Running jlink...')

var jlinkArgs = [
  '--add-modules', 'java.base,java.desktop,java.xml,java.logging',
  '--strip-debug',
  '--no-man-pages',
  '--no-header-files',
  '--compress=2',
  '--output', jrePath
]

// On Windows, use quotes around executable path if it contains spaces
var child = childProcess.spawn('"' + JLINK_EXE + '"', jlinkArgs, {
  stdio: 'inherit',
  shell: true
})

child.on('close', function (code) {
  if (code !== 0) {
    console.error('jlink failed with exit code', code)
    process.exit(1)
  }

  // Verify JRE
  console.log('')
  console.log('Verifying JRE...')
  var javaExe = path.join(jrePath, 'bin', 'java.exe')
  
  if (!fs.existsSync(javaExe)) {
    console.error('Error: Java executable not found at:', javaExe)
    process.exit(1)
  }

  var verifyChild = childProcess.spawn(javaExe, ['-version'], {
    stdio: 'inherit',
    shell: true
  })

  verifyChild.on('close', function (verifyCode) {
    if (verifyCode !== 0) {
      console.warn('Warning: JRE verification failed')
      process.exit(1)
    } else {
      console.log('')
      console.log('✓ JRE built successfully:', jrePath)
      console.log('')
      console.log('Next steps:')
      console.log('  1. Create package.json in', OUTPUT_DIR)
      console.log('  2. Test the JRE with PlantUML')
      console.log('  3. Publish the package: cd ' + OUTPUT_DIR + ' && npm publish --access public')
      process.exit(0)
    }
  })

  verifyChild.on('error', function (err) {
    console.error('Error verifying JRE:', err.message)
    process.exit(1)
  })
})

child.on('error', function (err) {
  console.error('Error running jlink:', err.message)
  process.exit(1)
})

