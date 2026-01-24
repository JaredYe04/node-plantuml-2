#!/usr/bin/env node
'use strict'

/**
 * Publish runtime package script
 *
 * Usage:
 *   node scripts/publish-runtime.js <platform> <arch> [--dry-run]
 *
 * Example:
 *   node scripts/publish-runtime.js win32 x64
 */

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')

var PLATFORM = process.argv[2]
var ARCH = process.argv[3]
var DRY_RUN = process.argv.indexOf('--dry-run') !== -1

if (!PLATFORM || !ARCH) {
  console.error('Usage: node scripts/publish-runtime.js <platform> <arch> [--dry-run]')
  console.error('Example: node scripts/publish-runtime.js win32 x64')
  process.exit(1)
}

var runtimeDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-' + PLATFORM + '-' + ARCH)
var packageJsonPath = path.join(runtimeDir, 'package.json')
var jrePath = path.join(runtimeDir, 'jre')

console.log('Publishing runtime package...')
console.log('Platform:', PLATFORM)
console.log('Architecture:', ARCH)
console.log('Directory:', runtimeDir)
console.log('')

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found at:', packageJsonPath)
  process.exit(1)
}

// Check if JRE exists
if (!fs.existsSync(jrePath)) {
  console.error('Error: JRE not found at:', jrePath)
  console.error('Please build JRE first: node scripts/build-jre-windows.js')
  process.exit(1)
}

// Read package.json
var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
console.log('Package:', packageJson.name)
console.log('Version:', packageJson.version)
console.log('')

if (DRY_RUN) {
  console.log('DRY RUN - Not actually publishing')
  console.log('Would run: cd', runtimeDir, '&& npm publish --access public')
  process.exit(0)
}

// Check if logged in to npm
console.log('Checking npm login status...')
var loginCheck = childProcess.spawnSync('npm', ['whoami'], {
  encoding: 'utf-8',
  stdio: 'pipe'
})

if (loginCheck.status !== 0) {
  console.error('Error: Not logged in to npm')
  console.error('Please run: npm login')
  process.exit(1)
}

console.log('Logged in as:', loginCheck.stdout.trim())
console.log('')

// Publish
console.log('Publishing package...')
var publishProcess = childProcess.spawn('npm', ['publish', '--access', 'public'], {
  cwd: runtimeDir,
  stdio: 'inherit',
  shell: true
})

publishProcess.on('close', function (code) {
  if (code === 0) {
    console.log('')
    console.log('✓ Package published successfully!')
    console.log('Package:', packageJson.name + '@' + packageJson.version)
  } else {
    console.error('')
    console.error('✗ Publish failed with exit code:', code)
    process.exit(1)
  }
})

publishProcess.on('error', function (err) {
  console.error('Error publishing:', err.message)
  process.exit(1)
})
