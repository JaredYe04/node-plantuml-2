#!/usr/bin/env node
'use strict'

/**
 * Create package.json for runtime package
 *
 * Usage:
 *   node scripts/create-runtime-package-json.js <platform> <arch> <version> [output-dir]
 */

var fs = require('fs')
var path = require('path')

var PLATFORM = process.argv[2]
var ARCH = process.argv[3]
var VERSION = process.argv[4]
var OUTPUT_DIR = process.argv[5] || path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'jre-' + PLATFORM + '-' + ARCH)

if (!PLATFORM || !ARCH || !VERSION) {
  console.error('Usage: node scripts/create-runtime-package-json.js <platform> <arch> <version> [output-dir]')
  process.exit(1)
}

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

var packageName = '@node-plantuml-2/jre-' + PLATFORM + '-' + ARCH

var packageJson = {
  name: packageName,
  version: VERSION,
  description: 'Minimal JRE for node-plantuml-2 on ' + PLATFORM + ' ' + ARCH,
  os: [PLATFORM],
  cpu: [ARCH],
  keywords: [
    'jre',
    'java',
    'plantuml',
    'runtime'
  ],
  files: [
    'jre/**'
  ],
  repository: {
    type: 'git',
    url: 'https://github.com/JaredYe04/node-plantuml-2.git',
    directory: 'runtimes/@node-plantuml-2/jre-' + PLATFORM + '-' + ARCH
  },
  license: 'MIT',
  author: 'JaredYe04 <1010268129@outlook.com>'
}

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

var packageJsonPath = path.join(OUTPUT_DIR, 'package.json')
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

console.log('Created package.json:', packageJsonPath)
console.log('Package:', packageName + '@' + VERSION)
