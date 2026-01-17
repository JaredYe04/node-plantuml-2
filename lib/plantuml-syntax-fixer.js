'use strict'

/**
 * PlantUML Syntax Fixer and Formatter
 * Automatically fixes common syntax errors in PlantUML code
 */

/**
 * PlantUML special characters that need to be escaped or quoted
 */
var SPECIAL_CHARS = /[<>{}[\]():;,|&!@#$%^*/+\-=~`'"]/

/**
 * Common patterns that might need fixing
 */
var PATTERNS = {
  // Arrow labels with special characters (not quoted)
  // Matches: A -> B: label with special chars
  // More precise: matches arrow followed by colon and label
  unquotedArrowLabel: /([\w"']+(?:\s*\[[^\]]*\])?)\s*(->|-->|<-|<-|--|\.\.|\.\.>|\.\.\.|\.\.\.>)\s*([\w"']+(?:\s*\[[^\]]*\])?)\s*:\s*([^"\n]+?)(?:\n|$)/g,

  // Class/method names with special characters
  // Matches: class MyClass<Type>, class MyClass {, etc.
  unquotedClassName: /(class|interface|abstract\s+class|enum|package|namespace)\s+([^{"'\n]+?)(?:\s*\{|\s*extends|\s*implements|\n|$)/g,

  // Participant names with special characters
  unquotedParticipant: /(participant|actor|boundary|control|entity|database|collections?)\s+([^"'\s]+(?:\s+as|\s*$|\n))/g,

  // State names with special characters
  unquotedState: /(state|start|end|fork|join)\s+([^{:\n"']+?)(?:\s*\{|:|\n|$)/g,

  // Note/legend text with special characters
  unquotedNote: /(note\s+(?:left|right|top|bottom|of)\s+[^:]+?:\s*)([^"\n]+)/gi,

  // Title with special characters
  unquotedTitle: /(title\s+)([^"\n]+)/gi,

  // Simple arrow label (without colon, just after arrow)
  simpleArrowLabel: /(->|-->|<-|<-|--|\.\.|\.\.>|\.\.\.|\.\.\.>)\s+([^"\n\s][^"\n]*?)(?=\s*(?:->|-->|<-|<-|--|\.\.|@|$|\n))/g
}

/**
 * Check if a string contains special characters that need quoting
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains special characters
 */
function needsQuoting (text) {
  if (!text || typeof text !== 'string') {
    return false
  }

  // Trim whitespace
  text = text.trim()

  // Already quoted
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) {
    return false
  }

  // Check for special characters
  if (SPECIAL_CHARS.test(text)) {
    return true
  }

  // Check for multiple words (spaces) - might need quoting for clarity
  if (/\s+/.test(text) && text.length > 0) {
    return true
  }

  return false
}

/**
 * Quote a string if needed
 * @param {string} text - Text to quote
 * @returns {string} - Quoted text
 */
function quoteIfNeeded (text) {
  if (!text || typeof text !== 'string') {
    return text
  }

  text = text.trim()

  // Already quoted
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) {
    return text
  }

  // Escape internal quotes and wrap
  var escaped = text.replace(/"/g, '\\"')
  return '"' + escaped + '"'
}

/**
 * Fix arrow labels that contain special characters
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function fixArrowLabels (code) {
  var warnings = []
  var fixed = code

  // Fix arrow labels with colon (A -> B: label)
  fixed = fixed.replace(PATTERNS.unquotedArrowLabel, function (match, from, arrow, to, label) {
    label = label.trim()

    // Skip if already quoted or empty
    if (!label || label.startsWith('"') || label.startsWith("'")) {
      return match
    }

    // Check if needs quoting
    if (needsQuoting(label)) {
      var quoted = quoteIfNeeded(label)
      warnings.push('Fixed unquoted arrow label: "' + label + '" -> ' + quoted)
      return from + ' ' + arrow + ' ' + to + ': ' + quoted + (match.endsWith('\n') ? '\n' : '')
    }

    return match
  })

  // Fix simple arrow labels (without colon)
  fixed = fixed.replace(PATTERNS.simpleArrowLabel, function (match, arrow, label) {
    label = label.trim()

    // Skip if already quoted, empty, or is just whitespace
    if (!label || label.startsWith('"') || label.startsWith("'") || /^\s*$/.test(label)) {
      return match
    }

    // Only fix if it contains special characters (not just a simple identifier)
    if (needsQuoting(label)) {
      var quoted = quoteIfNeeded(label)
      warnings.push('Fixed unquoted arrow label: "' + label + '" -> ' + quoted)
      return arrow + ' ' + quoted
    }

    return match
  })

  return { fixed: fixed, warnings: warnings }
}

/**
 * Fix class/interface names that contain special characters
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function fixClassNames (code) {
  var warnings = []
  var fixed = code.replace(PATTERNS.unquotedClassName, function (match, keyword, name) {
    name = name.trim()

    // Skip if already quoted, empty
    if (!name || name.startsWith('"') || name.startsWith("'")) {
      return match
    }

    // Check if it's a simple identifier without any special chars
    // Simple identifier: letters, numbers, underscore, Unicode (Chinese, etc.), but no special chars
    var isSimpleIdentifier = /^[a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*$/.test(name)
    
    if (isSimpleIdentifier) {
      return match
    }

    // If it contains special characters (including < > for generics), it needs quoting
    if (SPECIAL_CHARS.test(name) || name.includes('<') || name.includes('>')) {
      var quoted = quoteIfNeeded(name)
      warnings.push('Fixed unquoted class/interface name: "' + name + '" -> ' + quoted)
      // Reconstruct the match with quoted name
      var keywordMatch = match.match(new RegExp('^' + keyword.replace(/\s+/g, '\\s+') + '\\s+'))
      var afterKeyword = match.substring(keywordMatch[0].length)
      var rest = afterKeyword.substring(name.length)
      return keywordMatch[0] + quoted + rest
    }

    return match
  })

  return { fixed: fixed, warnings: warnings }
}

/**
 * Fix participant names that contain special characters
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function fixParticipantNames (code) {
  var warnings = []
  var fixed = code.replace(PATTERNS.unquotedParticipant, function (match, keyword, name) {
    // Extract the name part (before "as" or end of line)
    var nameMatch = name.match(/^([^"'\s]+)/)
    if (!nameMatch) {
      return match
    }

    var actualName = nameMatch[1]

    // Skip if already quoted or empty
    if (!actualName || actualName.startsWith('"') || actualName.startsWith("'")) {
      return match
    }

    // Check if needs quoting
    if (needsQuoting(actualName)) {
      var quoted = quoteIfNeeded(actualName)
      warnings.push('Fixed unquoted participant name: "' + actualName + '" -> ' + quoted)
      // Reconstruct: replace the name part
      return match.replace(actualName, quoted)
    }

    return match
  })

  return { fixed: fixed, warnings: warnings }
}

/**
 * Fix note/legend text that contains special characters
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function fixNoteText (code) {
  var warnings = []
  var fixed = code.replace(PATTERNS.unquotedNote, function (match, prefix, text) {
    text = text.trim()

    // Skip if already quoted or empty
    if (!text || text.startsWith('"') || text.startsWith("'")) {
      return match
    }

    // Check if needs quoting
    if (needsQuoting(text)) {
      var quoted = quoteIfNeeded(text)
      warnings.push('Fixed unquoted note text: "' + text + '" -> ' + quoted)
      return prefix + quoted
    }

    return match
  })

  return { fixed: fixed, warnings: warnings }
}

/**
 * Fix title text that contains special characters
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function fixTitleText (code) {
  var warnings = []
  var fixed = code.replace(PATTERNS.unquotedTitle, function (match, prefix, text) {
    text = text.trim()

    // Skip if already quoted or empty
    if (!text || text.startsWith('"') || text.startsWith("'")) {
      return match
    }

    // Title usually should be quoted if it has special chars
    if (needsQuoting(text)) {
      var quoted = quoteIfNeeded(text)
      warnings.push('Fixed unquoted title text: "' + text + '" -> ' + quoted)
      return prefix + quoted
    }

    return match
  })

  return { fixed: fixed, warnings: warnings }
}

/**
 * Fix method/attribute names in class definitions that contain special characters
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function fixMethodNames (code) {
  var warnings = []

  // Match class definitions with methods/attributes
  // Pattern: visibility name(params): returnType
  var methodPattern = /([+\-~#])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?::\s*[^\n{]+)?/g
  var attributePattern = /([+\-~#])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[^\n{]+/g

  var fixed = code.replace(methodPattern, function (match, visibility, name) {
    // Method names usually don't need quoting unless they have special chars
    if (SPECIAL_CHARS.test(name)) {
      var quoted = quoteIfNeeded(name)
      warnings.push('Fixed method name with special characters: "' + name + '" -> ' + quoted)
      return match.replace(name, quoted)
    }
    return match
  })

  fixed = fixed.replace(attributePattern, function (match, visibility, name) {
    // Attribute names usually don't need quoting unless they have special chars
    if (SPECIAL_CHARS.test(name)) {
      var quoted = quoteIfNeeded(name)
      warnings.push('Fixed attribute name with special characters: "' + name + '" -> ' + quoted)
      return match.replace(name, quoted)
    }
    return match
  })

  return { fixed: fixed, warnings: warnings }
}

/**
 * Normalize whitespace and formatting
 * @param {string} code - PlantUML code
 * @returns {Object} - {fixed: string, warnings: Array}
 */
function normalizeWhitespace (code) {
  var warnings = []
  var fixed = code

  // Remove trailing whitespace from lines
  var lines = fixed.split('\n')
  var modified = false
  lines = lines.map(function (line, index) {
    var trimmed = line.replace(/[ \t]+$/, '')
    if (trimmed !== line) {
      modified = true
    }
    return trimmed
  })

  if (modified) {
    warnings.push('Removed trailing whitespace')
  }

  // Normalize multiple consecutive blank lines to maximum 2
  fixed = lines.join('\n')
  var normalized = fixed.replace(/\n{3,}/g, '\n\n')
  if (normalized !== fixed) {
    warnings.push('Normalized excessive blank lines')
    fixed = normalized
  }

  return { fixed: fixed, warnings: warnings }
}

/**
 * Main function to fix PlantUML syntax
 * @param {string} code - PlantUML source code
 * @param {Object} options - Options object
 * @param {boolean} options.autoFix - Enable auto-fixing (default: false)
 * @param {boolean} options.warnOnFix - Show warnings when fixes are applied (default: true)
 * @returns {string} - Fixed PlantUML code
 */
function fixPlantUmlSyntax (code, options) {
  if (!code || typeof code !== 'string') {
    return code
  }

  options = options || {}
  var autoFix = options.autoFix === true // Default to false, must be explicitly enabled
  var warnOnFix = options.warnOnFix !== false // Default to true

  if (!autoFix) {
    return code
  }

  var allWarnings = []
  var fixed = code

  // Apply all fixes
  var result

  // Fix arrow labels
  result = fixArrowLabels(fixed)
  fixed = result.fixed
  allWarnings = allWarnings.concat(result.warnings)

  // Fix class/interface names
  result = fixClassNames(fixed)
  fixed = result.fixed
  allWarnings = allWarnings.concat(result.warnings)

  // Fix participant names
  result = fixParticipantNames(fixed)
  fixed = result.fixed
  allWarnings = allWarnings.concat(result.warnings)

  // Fix note text
  result = fixNoteText(fixed)
  fixed = result.fixed
  allWarnings = allWarnings.concat(result.warnings)

  // Fix title text
  result = fixTitleText(fixed)
  fixed = result.fixed
  allWarnings = allWarnings.concat(result.warnings)

  // Fix method/attribute names
  result = fixMethodNames(fixed)
  fixed = result.fixed
  allWarnings = allWarnings.concat(result.warnings)

  // Normalize whitespace (optional, less critical)
  if (options.normalizeWhitespace !== false) {
    result = normalizeWhitespace(fixed)
    fixed = result.fixed
    allWarnings = allWarnings.concat(result.warnings)
  }

  // Log warnings if any fixes were applied
  if (allWarnings.length > 0 && warnOnFix) {
    console.warn('[PlantUML Syntax Fixer] Applied ' + allWarnings.length + ' fix(es):')
    allWarnings.forEach(function (warning) {
      console.warn('  - ' + warning)
    })
  }

  return fixed
}

/**
 * Check if PlantUML code has syntax errors by attempting to render it
 * @param {string} code - PlantUML source code
 * @param {Function} callback - Callback with (error, hasError, svgOutput)
 * @returns {void}
 */
function checkSyntaxError (code, callback) {
  if (!code || typeof code !== 'string') {
    return callback(null, false, null)
  }

  var plantumlExecutor = require('./plantuml-executor')
  var SVG = '-tsvg'
  var PIPE = '-pipe'

  var child = plantumlExecutor.exec([PIPE, SVG])
  var svgChunks = []
  var errorChunks = []

  child.stdout.on('data', function (chunk) {
    svgChunks.push(chunk)
  })

  child.stderr.on('data', function (chunk) {
    errorChunks.push(chunk)
  })

  child.on('error', function (err) {
    callback(err, true, null)
  })

  child.on('close', function (code) {
    var svg = Buffer.concat(svgChunks).toString()
    var errorOutput = Buffer.concat(errorChunks).toString()

    // Check for error indicators
    // Primary indicators: stderr and exit code (most reliable)
    var hasError = false

    // Check stderr for errors (most reliable indicator)
    if (errorOutput && errorOutput.length > 0) {
      // PlantUML outputs "Syntax Error? (Assumed diagram type: ...)" to stderr as a warning
      // This is NOT a real error, just PlantUML being uncertain about diagram type
      var isOnlyWarning = /^ERROR\s*\d+\s*Syntax Error\? \(Assumed diagram type:/.test(errorOutput.trim())
      
      if (!isOnlyWarning) {
        // Check if stderr contains actual error messages (not just warnings)
        var stderrLower = errorOutput.toLowerCase()
        if (stderrLower.includes('error') || 
            stderrLower.includes('exception') ||
            stderrLower.includes('cannot') ||
            stderrLower.includes('failed')) {
          hasError = true
        }
      }
      // If isOnlyWarning is true, we don't set hasError (it's just a warning, not an error)
    }

    // Check exit code (reliable indicator)
    // Exit code 200 is used by PlantUML for the "Syntax Error? (Assumed..." warning
    // This is not a real error, so we should ignore it
    if (code !== 0 && code !== 200) {
      hasError = true
    }

    // Only check SVG content if stderr/exit code didn't indicate error
    // This avoids false positives from normal text containing keywords
    if (!hasError && svg) {
      // Check if SVG is suspiciously small or empty (might indicate error)
      if (svg.length < 200 && !svg.includes('<svg')) {
        hasError = true
      } else {
        // PlantUML shows "Syntax Error? (Assumed diagram type: ...)" as a warning, not a real error
        // If SVG only contains this warning and nothing else suspicious, it's not a real error
        var hasOnlyWarning = svg.includes('Syntax Error? (Assumed diagram type:')
        
        if (!hasOnlyWarning) {
          // Check for actual error messages in SVG (very strict)
          // Only flag if we see clear error patterns that are NOT warnings
          var clearErrorPatterns = [
            /syntax error[^?]/i,  // "syntax error" but not "syntax error?"
            /parse error/i,
            /cannot parse/i,
            /unexpected token/i
          ]

          var foundClearError = false
          for (var i = 0; i < clearErrorPatterns.length; i++) {
            if (clearErrorPatterns[i].test(svg)) {
              foundClearError = true
              break
            }
          }

          if (foundClearError) {
            hasError = true
          }
        }
        // If hasOnlyWarning is true, we don't set hasError (it's just a warning, not an error)
      }
    } else if (!svg || svg.length === 0) {
      // No SVG output at all is likely an error (only if we don't have stderr/exit code info)
      if (code === 0 && (!errorOutput || errorOutput.length === 0)) {
        // This shouldn't happen, but if it does, it's suspicious
        hasError = true
      }
    }

    callback(null, hasError, svg)
  })

  // Write code to stdin
  child.stdin.write(code, 'utf-8')
  child.stdin.end()
}

module.exports = {
  fixPlantUmlSyntax: fixPlantUmlSyntax,
  needsQuoting: needsQuoting,
  quoteIfNeeded: quoteIfNeeded,
  checkSyntaxError: checkSyntaxError
}
