#!/usr/bin/env node
'use strict'

/**
 * Debug script to check if font config is being added
 */

var fs = require('fs')
var path = require('path')

// Read the actual file
var filePath = path.join(__dirname, 'fixtures', 'txt', 'class-diagram-zh.txt')
var code = fs.readFileSync(filePath, 'utf-8')

console.log('Original code:')
console.log('='.repeat(60))
console.log(code)
console.log('='.repeat(60))
console.log('')

// Simulate what addFontConfigIfNeeded does
function needsFontSupport (text) {
  if (!text || typeof text !== 'string') {
    return false
  }
  return /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text)
}

function getDefaultFont () {
  var platform = process.platform
  if (platform === 'win32') {
    return 'Microsoft YaHei'
  } else if (platform === 'darwin') {
    return 'PingFang SC'
  } else {
    return 'Noto Sans CJK SC'
  }
}

function addFontConfigIfNeeded (code, options) {
  if (!code || typeof code !== 'string') {
    return code
  }

  if (options && options.fontName) {
    return code
  }

  if (code.includes('defaultFontName') || code.includes('skinparam defaultFontName')) {
    console.log('Font config already exists, skipping')
    return code
  }

  if (!needsFontSupport(code)) {
    console.log('No CJK characters detected, skipping font config')
    return code
  }

  var fontName = getDefaultFont()
  var fontSize = options && options.fontSize ? options.fontSize : 12

  var fontConfig = 'skinparam defaultFontName "' + fontName + '"\n'

  // Check if fontSize is already set
  if (!code.includes('defaultFontSize') && !code.includes('skinparam defaultFontSize')) {
    fontConfig += 'skinparam defaultFontSize ' + fontSize + '\n'
  }

  // Try to insert after !theme first
  var themePattern = /(!theme\s+[^\n]+\n)/i
  if (themePattern.test(code)) {
    console.log('Font config added after !theme')
    return code.replace(themePattern, '$1' + fontConfig)
  }

  // Otherwise, insert after @startuml, @startgantt, or @startmindmap
  var patterns = [
    /(@startuml\s*\n)/i,
    /(@startgantt\s*\n)/i,
    /(@startmindmap\s*\n)/i
  ]

  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].test(code)) {
      console.log('Font config added after @start directive')
      return code.replace(patterns[i], '$1' + fontConfig)
    }
  }

  console.log('Font config prepended to beginning')
  return fontConfig + code
}

console.log('Checking if font config needed...')
var hasCJK = needsFontSupport(code)
console.log('Has CJK characters: ' + hasCJK)
console.log('Has font config: ' + code.includes('defaultFontName'))
console.log('')

var modified = addFontConfigIfNeeded(code, {})
console.log('Modified code:')
console.log('='.repeat(60))
console.log(modified)
console.log('='.repeat(60))
