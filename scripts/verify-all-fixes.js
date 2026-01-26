#!/usr/bin/env node
'use strict'

/**
 * 验证所有修复是否都在 MetaDoc 项目中
 */

var path = require('path')
var fs = require('fs')

console.log('')
console.log('='.repeat(60))
console.log('Verify All Fixes in MetaDoc')
console.log('='.repeat(60))
console.log('')

var metadocRoot = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc')
var executorPath = path.join(metadocRoot, 'node_modules', 'node-plantuml-2', 'lib', 'plantuml-executor.js')

if (!fs.existsSync(executorPath)) {
  console.error('❌ File not found:', executorPath)
  process.exit(1)
}

var content = fs.readFileSync(executorPath, 'utf-8')

console.log('Checking fixes...')
console.log('')

var fixes = [
  {
    name: 'opts[dotPathIndex] fix (not argv)',
    check: content.includes('opts[dotPathIndex] = absoluteDotPath'),
    critical: true
  },
  {
    name: 'dotPathIndex calculation (7 + i + 1)',
    check: content.includes('dotPathIndex = 7 + i + 1'),
    critical: true
  },
  {
    name: 'dotPathAutoDetected flag',
    check: content.includes('dotPathAutoDetected = true'),
    critical: true
  },
  {
    name: 'Auto-detected dotPath added to opts',
    check: content.includes('opts.splice(insertIndex, 0, \'-graphvizdot\''),
    critical: true
  },
  {
    name: 'Check both argv and opts',
    check: content.includes('If not found in argv, check opts'),
    critical: true
  },
  {
    name: 'Windows PATH fix (env.Path)',
    check: content.includes('env.Path = env[pathKey]'),
    critical: true
  },
  {
    name: 'Windows PATH fix (env.PATH)',
    check: content.includes('env.PATH = env[pathKey]'),
    critical: true
  },
  {
    name: 'spawnOptions.env set',
    check: content.includes('spawnOptions.env = env'),
    critical: true
  },
  {
    name: 'envModified flag',
    check: content.includes('var envModified = true'),
    critical: true
  },
  {
    name: 'Object.assign process.env',
    check: content.includes('var env = Object.assign({}, process.env)'),
    critical: true
  }
]

var allPassed = true
var criticalFailed = false

for (var i = 0; i < fixes.length; i++) {
  var fix = fixes[i]
  if (fix.check) {
    console.log('✓', fix.name)
  } else {
    console.error('❌', fix.name, '- MISSING!')
    allPassed = false
    if (fix.critical) {
      criticalFailed = true
    }
  }
}

console.log('')

if (criticalFailed) {
  console.error('❌ CRITICAL FIXES ARE MISSING!')
  console.error('')
  console.error('Please run: node scripts/patch-metadoc.js')
  process.exit(1)
}

if (!allPassed) {
  console.warn('⚠️  Some non-critical fixes are missing')
  console.warn('But all critical fixes are present')
} else {
  console.log('✅ All fixes are present!')
}

console.log('')
console.log('Checking version...')
var packagePath = path.join(metadocRoot, 'node_modules', 'node-plantuml-2', 'package.json')
if (fs.existsSync(packagePath)) {
  var pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
  console.log('Version:', pkg.version)
}

console.log('')
console.log('✅ Verification complete!')

