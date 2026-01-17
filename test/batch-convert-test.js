#!/usr/bin/env node
'use strict'

var fs = require('fs')
var path = require('path')
var plantuml = require('../lib/node-plantuml')
var syntaxFixer = require('../lib/plantuml-syntax-fixer')

var FIXTURES_DIR = path.join(__dirname, 'fixtures', 'txt')
var OUTPUT_SVG_DIR = path.join(__dirname, 'output', 'svg')
var OUTPUT_PNG_DIR = path.join(__dirname, 'output', 'png')

// Create output directories if they don't exist
if (!fs.existsSync(OUTPUT_SVG_DIR)) {
  fs.mkdirSync(OUTPUT_SVG_DIR, { recursive: true })
}
if (!fs.existsSync(OUTPUT_PNG_DIR)) {
  fs.mkdirSync(OUTPUT_PNG_DIR, { recursive: true })
}

// Parse command line arguments
var formats = []
var args = process.argv.slice(2)

if (args.indexOf('--svg') !== -1 || args.indexOf('-s') !== -1) {
  formats.push('svg')
}
if (args.indexOf('--png') !== -1 || args.indexOf('-p') !== -1) {
  formats.push('png')
}

// Default to both formats if none specified
if (formats.length === 0) {
  formats = ['svg', 'png']
}

function convertFile (txtFile, formats, callback) {
  var basename = path.basename(txtFile, '.txt')
  var plantumlCode = fs.readFileSync(txtFile, 'utf-8')

  console.log('Processing: ' + basename)

  // Check for syntax errors first
  syntaxFixer.checkSyntaxError(plantumlCode, function (err, hasError, svgOutput) {
    if (err) {
      console.log('  ⚠ Syntax check failed:', err.message)
    } else if (hasError) {
      console.log('  ⚠ Syntax error detected in: ' + basename)
      console.log('     SVG length:', svgOutput ? svgOutput.length : 0)
    } else {
      console.log('  ✓ No syntax errors detected')
    }

    // Continue with conversion
    var conversions = formats.map(function (format) {
    return new Promise(function (resolve, reject) {
      var outputDir = format === 'svg' ? OUTPUT_SVG_DIR : OUTPUT_PNG_DIR
      var outputFile = path.join(outputDir, basename + '.' + format)

      console.log('  Generating ' + format.toUpperCase() + ': ' + outputFile)

      var gen = plantuml.generate(plantumlCode, { format: format })
      var writeStream = fs.createWriteStream(outputFile)

      gen.out.pipe(writeStream)

      writeStream.on('finish', function () {
        console.log('  ✓ ' + format.toUpperCase() + ' generated: ' + outputFile)
        resolve()
      })

      gen.out.on('error', function (err) {
        console.error('  ✗ Error generating ' + format + ':', err)
        reject(err)
      })

      writeStream.on('error', function (err) {
        console.error('  ✗ Error writing ' + format + ':', err)
        reject(err)
      })
      })
    })

    Promise.all(conversions)
      .then(function () {
        callback(null)
      })
      .catch(function (err) {
        callback(err)
      })
  })
}

function batchConvert (formats, callback) {
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.log('Creating fixtures directory: ' + FIXTURES_DIR)
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })
    console.log('Please add .txt files containing PlantUML code to: ' + FIXTURES_DIR)
    callback(null)
    return
  }

  var files = fs.readdirSync(FIXTURES_DIR)
    .filter(function (file) {
      return file.endsWith('.txt')
    })
    .map(function (file) {
      return path.join(FIXTURES_DIR, file)
    })

  if (files.length === 0) {
    console.log('No .txt files found in: ' + FIXTURES_DIR)
    console.log('Please add .txt files containing PlantUML code to this directory')
    callback(null)
    return
  }

  console.log('Found ' + files.length + ' .txt file(s)')
  console.log('Output formats: ' + formats.join(', '))
  console.log('')

  var index = 0
  function processNext () {
    if (index >= files.length) {
      console.log('')
      console.log('✓ All files processed successfully!')
      callback(null)
      return
    }

    convertFile(files[index], formats, function (err) {
      if (err) {
        callback(err)
        return
      }
      index++
      processNext()
    })
  }

  processNext()
}

// Main execution
if (require.main === module) {
  batchConvert(formats, function (err) {
    if (err) {
      console.error('Batch conversion failed:', err)
      process.exit(1)
    }
  })
}

module.exports = { batchConvert, convertFile }
