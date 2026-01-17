#!/usr/bin/env node
'use strict'

/**
 * Verify that Chinese font is automatically added
 */

var plantuml = require('../lib/node-plantuml')
var fs = require('fs')
var path = require('path')

// Test code with Chinese but no font config
var testCode = '@startuml\n!theme plain\nclass 用户 {\n  -姓名: String\n}\n@enduml'

console.log('Original code:')
console.log(testCode)
console.log('')

// Check what addFontConfigIfNeeded would do
// We need to access the internal function, so let's test via actual generation
var outputFile = path.join(__dirname, 'output', 'font-test.png')
var outputDir = path.dirname(outputFile)

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

console.log('Generating diagram with Chinese text (no explicit font config)...')
var gen = plantuml.generate(testCode, { format: 'png' })
var writeStream = fs.createWriteStream(outputFile)

gen.out.pipe(writeStream)

writeStream.on('finish', function () {
  console.log('✓ Diagram generated: ' + outputFile)
  console.log('')
  console.log('Note: Font configuration should be automatically added.')
  console.log('Check the generated image to verify Chinese characters display correctly.')

  // Check file size to verify it was generated
  var stats = fs.statSync(outputFile)
  if (stats.size > 0) {
    console.log('✓ File generated successfully (' + stats.size + ' bytes)')
  } else {
    console.log('✗ File is empty')
  }
})

writeStream.on('error', function (err) {
  console.error('✗ Error:', err)
  process.exit(1)
})
