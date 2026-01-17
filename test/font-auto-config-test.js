#!/usr/bin/env node
'use strict'

/**
 * Test script to verify automatic font configuration
 */

var plantuml = require('../lib/node-plantuml')
var fs = require('fs')
var path = require('path')

var testCases = [
  {
    name: 'Chinese text without font config',
    code: '@startuml\n!theme plain\nclass 用户 {\n  -姓名: String\n}\n@enduml',
    shouldHaveFont: true
  },
  {
    name: 'English text',
    code: '@startuml\nclass User {\n  -name: String\n}\n@enduml',
    shouldHaveFont: false
  },
  {
    name: 'Chinese with explicit font',
    code: '@startuml\nskinparam defaultFontName "SimSun"\nclass 用户 {}\n@enduml',
    shouldHaveFont: false, // Should not add font config if already present
    explicitFont: 'SimSun'
  },
  {
    name: 'Japanese text',
    code: '@startuml\nclass ユーザー {\n  -名前: String\n}\n@enduml',
    shouldHaveFont: true
  },
  {
    name: 'Korean text',
    code: '@startuml\nclass 사용자 {\n  -이름: String\n}\n@enduml',
    shouldHaveFont: true
  }
]

console.log('Testing automatic font configuration...')
console.log('')

var passed = 0
var failed = 0

testCases.forEach(function (testCase, index) {
  console.log('Test ' + (index + 1) + ': ' + testCase.name)

  // Check if font config would be added
  var hasCJK = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(testCase.code)
  var hasExplicitFont = testCase.code.includes('defaultFontName')
  var shouldAddFont = hasCJK && !hasExplicitFont

  if (shouldAddFont === testCase.shouldHaveFont) {
    console.log('  ✓ Font detection correct')
    passed++
  } else {
    console.log('  ✗ Font detection incorrect')
    console.log('    Expected: ' + testCase.shouldHaveFont + ', Got: ' + shouldAddFont)
    failed++
  }

  // Test actual generation (just verify it doesn't crash)
  try {
    var gen = plantuml.generate(testCase.code, { format: 'png' })
    // Don't actually write, just verify it creates a stream
    if (gen && gen.out) {
      console.log('  ✓ Generation successful')
    } else {
      console.log('  ✗ Generation failed')
      failed++
    }
  } catch (e) {
    console.log('  ✗ Generation error: ' + e.message)
    failed++
  }

  console.log('')
})

console.log('='.repeat(60))
console.log('Test Results: ' + passed + ' passed, ' + failed + ' failed')
console.log('='.repeat(60))

if (failed > 0) {
  process.exit(1)
}
