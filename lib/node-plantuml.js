'use strict'

var plantumlExecutor = require('./plantuml-executor')
var fs = require('fs')
var stream = require('stream')
var util = require('util')
var path = require('path')
var plantumlEncoder = require('plantuml-encoder')
var syntaxFixer = require('./plantuml-syntax-fixer')

var DECODE = '-decodeurl'
var PIPE = '-pipe'
var UNICODE = '-tutxt'
var ASCII = '-ttxt'
var SVG = '-tsvg'
var EPS = '-eps'
var CONFIG = '-config'
var TESTDOT = '-testdot'
var DOT = '-graphvizdot'
var CHARSET = '-charset'

var CONFIGS = {
  classic: path.join(__dirname, '../resources/classic.puml'),
  monochrome: path.join(__dirname, '../resources/monochrome.puml')
}

module.exports.useNailgun = plantumlExecutor.useNailgun

function PlantumlEncodeStream () {
  stream.Transform.call(this)
  this.chunks = []
}

util.inherits(PlantumlEncodeStream, stream.Transform)

PlantumlEncodeStream.prototype._transform = function (chunk, encoding, done) {
  this.chunks.push(chunk)
  done()
}

PlantumlEncodeStream.prototype._flush = function (done) {
  var uml = Buffer.concat(this.chunks).toString()
  var encoded = plantumlEncoder.encode(uml)
  this.push(Buffer.from(encoded, 'ascii'))
  done()
}

function isPath (input) {
  try {
    fs.lstatSync(input)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Detect if text contains characters that need special font support
 * (Chinese, Japanese, Korean, etc.)
 */
function needsFontSupport (text) {
  if (!text || typeof text !== 'string') {
    return false
  }
  // Check for CJK characters (Chinese, Japanese Hiragana/Katakana, Korean)
  return /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text)
}

/**
 * Detect if text contains Korean characters
 */
function hasKorean (text) {
  if (!text || typeof text !== 'string') {
    return false
  }
  // Korean Hangul Syllables: \uac00-\ud7af
  return /[\uac00-\ud7af]/.test(text)
}

/**
 * Get default font name based on platform and detected languages
 * @param {string} code - PlantUML source code to detect languages from
 */
function getDefaultFont (code) {
  var platform = process.platform
  var hasKR = hasKorean(code || '')

  if (platform === 'win32') {
    // Windows: Use Malgun Gothic (맑은 고딕) for Korean, Microsoft YaHei for CJ
    if (hasKR) {
      return 'Malgun Gothic'
    }
    return 'Microsoft YaHei'
  } else if (platform === 'darwin') {
    // macOS: Use AppleGothic for Korean, PingFang SC for CJ
    if (hasKR) {
      return 'AppleGothic'
    }
    return 'PingFang SC'
  } else {
    // Linux: Use Noto Sans CJK (supports all CJK languages)
    return 'Noto Sans CJK SC'
  }
}

/**
 * Add font configuration to PlantUML code if needed
 * @param {string} code - PlantUML source code
 * @param {Object} options - Options object (may contain fontName)
 * @returns {string} - Modified code with font config if needed
 */
function addFontConfigIfNeeded (code, options) {
  if (!code || typeof code !== 'string') {
    return code
  }

  // If user explicitly specified a font, don't override
  if (options && options.fontName) {
    return code
  }

  // Check if font config already exists
  if (code.includes('defaultFontName') || code.includes('skinparam defaultFontName')) {
    return code
  }

  // Check if code needs font support
  if (!needsFontSupport(code)) {
    return code
  }

  // Get default font for platform, considering detected languages in code
  var fontName = getDefaultFont(code)
  var fontSize = options && options.fontSize ? options.fontSize : 12

  // Add font configuration
  // Priority: after !theme (if exists), otherwise after @startuml/@startgantt/@startmindmap
  var fontConfig = 'skinparam defaultFontName "' + fontName + '"\n'

  // Check if fontSize is already set, if not add it
  if (!code.includes('defaultFontSize') && !code.includes('skinparam defaultFontSize')) {
    fontConfig += 'skinparam defaultFontSize ' + fontSize + '\n'
  }

  // Try to insert after !theme first (theme may override fonts, so we add after it)
  var themePattern = /(!theme\s+[^\n]+\n)/i
  if (themePattern.test(code)) {
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
      return code.replace(patterns[i], '$1' + fontConfig)
    }
  }

  // If no start directive found, prepend to the beginning
  return fontConfig + code
}

function arrangeArguments (input, options, callback) {
  if (typeof input === 'function') {
    callback = input
    input = undefined
  } else {
    if (typeof options === 'function') {
      callback = options
      options = undefined
    }
    if (typeof input !== 'string' && !(input instanceof String)) {
      options = input
      input = undefined
    }
  }

  return {
    input: input,
    options: options,
    callback: callback
  }
}

function joinOptions (argv, options) {
  options.format = options.format || 'png'
  switch (options.format) {
    case 'ascii':
      argv.push(ASCII)
      break
    case 'unicode':
      argv.push(UNICODE)
      break
    case 'svg':
      argv.push(SVG)
      break
    case 'eps':
      argv.push(EPS)
      break
    case 'png':
    default:
      break
  }

  if (options.config) {
    var template = CONFIGS[options.config]
    var file = template || options.config
    argv.push(CONFIG)
    argv.push(file)
  }

  if (options.dot) {
    argv.push(DOT)
    argv.push(options.dot)
  }

  if (options.charset) {
    argv.push(CHARSET)
    argv.push(options.charset)
  }

  return argv
}

// function generateFromStdin (child) {
//   return {
//     in: child.stdin,
//     out: child.stdout
//   }
// }

function generateFromFile (filePath, child, options) {
  // Read file content, fix syntax if enabled, add font config if needed, then write to stdin
  var code = fs.readFileSync(filePath, 'utf-8')
  code = syntaxFixer.fixPlantUmlSyntax(code, options)
  code = addFontConfigIfNeeded(code, options)
  child.stdin.write(code, 'utf-8')
  child.stdin.end()

  return {
    out: child.stdout
  }
}

function generateFromText (text, child, options) {
  text = syntaxFixer.fixPlantUmlSyntax(text, options)
  text = addFontConfigIfNeeded(text, options)
  child.stdin.write(text)
  child.stdin.end()

  return {
    out: child.stdout
  }
}

module.exports.generate = function (input, options, callback) {
  var args = arrangeArguments(input, options, callback)
  input = args.input
  options = args.options || {}
  callback = args.callback

  var o = joinOptions([PIPE], options)
  var child = plantumlExecutor.exec(o, options.include, callback)

  if (!input) {
    // For stdin, we need to handle font config in a transform stream
    var Transform = stream.Transform
    var fontTransform = new Transform({
      transform: function (chunk, encoding, done) {
        // Collect all chunks first
        if (!this._chunks) {
          this._chunks = []
        }
        this._chunks.push(chunk)
        done()
      },
      flush: function (done) {
        var code = Buffer.concat(this._chunks).toString('utf-8')
        code = syntaxFixer.fixPlantUmlSyntax(code, options)
        code = addFontConfigIfNeeded(code, options)
        this.push(Buffer.from(code, 'utf-8'))
        done()
      }
    })
    fontTransform.pipe(child.stdin)
    return {
      in: fontTransform,
      out: child.stdout
    }
  } else {
    if (isPath(input)) {
      return generateFromFile(input, child, options)
    } else {
      return generateFromText(input, child, options)
    }
  }
}

function encodeFromStdin (encodeStream) {
  return {
    in: encodeStream,
    out: encodeStream
  }
}

function encodeFromFile (path, encodeStream) {
  var rs = fs.createReadStream(path)
  rs.pipe(encodeStream)

  return {
    out: encodeStream
  }
}

function encodeFromText (text, encodeStream) {
  encodeStream.write(text)
  encodeStream.end()

  return {
    out: encodeStream
  }
}

module.exports.encode = function (input, options, callback) {
  var args = arrangeArguments(input, options, callback)
  input = args.input
  options = args.options || {}
  callback = args.callback

  var encodeStream = new PlantumlEncodeStream()

  if (typeof callback === 'function') {
    var chunks = []
    encodeStream.on('data', function (chunk) { chunks.push(chunk) })
    encodeStream.on('end', function () {
      var data = Buffer.concat(chunks)
      callback(null, data.toString())
    })
  }

  if (!input) {
    return encodeFromStdin(encodeStream)
  } else {
    if (isPath(input)) {
      return encodeFromFile(input, encodeStream)
    } else {
      return encodeFromText(input, encodeStream)
    }
  }
}

module.exports.decode = function (encoded, callback) {
  var child = plantumlExecutor.exec([DECODE, encoded], callback)

  return {
    out: child.stdout
  }
}

module.exports.testdot = function (callback) {
  var child = plantumlExecutor.exec([TESTDOT])

  var chunks = []
  child.stdout.on('data', function (chunk) { chunks.push(chunk) })
  child.stdout.on('end', function () {
    var data = Buffer.concat(chunks)
    var dotOkCheck = 'Installation seems OK. File generation OK'
    var dotOk = data.toString().indexOf(dotOkCheck) !== -1
    if (typeof callback === 'function') callback(dotOk)
  })

  return {
    out: child.stdout
  }
}

/**
 * Standalone syntax fixing service
 * Checks if code has syntax errors, and if so, attempts to fix them
 * @param {string} code - PlantUML source code
 * @param {Object} options - Options object
 * @param {Function} callback - Callback with (error, fixedCode, wasFixed)
 * @returns {void}
 */
module.exports.fixSyntax = function (code, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  options = options || {}

  if (!code || typeof code !== 'string') {
    if (typeof callback === 'function') {
      return callback(null, code, false)
    }
    return
  }

  // First, check if there's a syntax error
  syntaxFixer.checkSyntaxError(code, function (err, hasError, svgOutput) {
    if (err) {
      // If check failed, assume there's an error and try to fix
      hasError = true
    }

    // If no error detected, return original code unchanged
    if (!hasError) {
      if (typeof callback === 'function') {
        return callback(null, code, false)
      }
      return
    }

    // There's an error, try to fix it
    var fixOptions = {
      autoFix: true,
      warnOnFix: options.warnOnFix !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false
    }

    var fixedCode = syntaxFixer.fixPlantUmlSyntax(code, fixOptions)

    // Check again if the fixed code works
    syntaxFixer.checkSyntaxError(fixedCode, function (err2, stillHasError, svgOutput2) {
      if (err2) {
        // If second check failed, still return the fixed code
        if (typeof callback === 'function') {
          return callback(null, fixedCode, true)
        }
        return
      }

      // If fixed code still has errors, return it anyway (we tried our best)
      // If fixed code works, return it
      if (typeof callback === 'function') {
        return callback(null, fixedCode, true)
      }
    })
  })
}
