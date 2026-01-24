'use strict'

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

/**
 * Resolve Graphviz dot executable path with fallback strategy
 * 
 * Priority order:
 * 1. options.dotPath (user-specified)
 * 2. Common installation paths (platform-specific)
 * 3. System 'dot' in PATH (which dot)
 * 
 * @param {Object} options - Options object
 * @param {string} options.dotPath - User-specified dot path (highest priority)
 * @returns {string|null} - Path to dot executable, or null if not found
 */
function resolveDotExecutable (options) {
  options = options || {}
  
  // Priority 1: User-specified dot path
  if (options.dotPath) {
    var dotPath = path.resolve(options.dotPath)
    if (fs.existsSync(dotPath) && isExecutable(dotPath)) {
      return dotPath
    }
  }

  // Priority 2: Common installation paths (platform-specific)
  var commonPaths = getCommonDotPaths()
  for (var i = 0; i < commonPaths.length; i++) {
    var commonPath = commonPaths[i]
    if (fs.existsSync(commonPath) && isExecutable(commonPath)) {
      return commonPath
    }
  }

  // Priority 3: System 'dot' in PATH
  try {
    var systemDot = findDotInPath()
    if (systemDot) {
      return systemDot
    }
  } catch (e) {
    // Ignore errors when checking PATH
  }

  return null
}

/**
 * Get common Graphviz dot installation paths based on platform
 * 
 * @returns {string[]} - Array of common paths to check
 */
function getCommonDotPaths () {
  var platform = os.platform()
  var paths = []

  if (platform === 'darwin') {
    // macOS: Check Homebrew paths (most common)
    // Apple Silicon (M1/M2): /opt/homebrew/bin/dot
    // Intel: /usr/local/bin/dot
    // MacPorts: /opt/local/bin/dot
    paths.push('/opt/homebrew/bin/dot')  // Homebrew on Apple Silicon
    paths.push('/usr/local/bin/dot')     // Homebrew on Intel
    paths.push('/opt/local/bin/dot')     // MacPorts
  } else if (platform === 'win32') {
    // Windows: Common installation paths
    var programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    var programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    paths.push(path.join(programFiles, 'Graphviz', 'bin', 'dot.exe'))
    paths.push(path.join(programFilesX86, 'Graphviz', 'bin', 'dot.exe'))
    // Chocolatey
    paths.push('C:\\ProgramData\\chocolatey\\bin\\dot.exe')
  } else {
    // Linux: Common installation paths
    paths.push('/usr/bin/dot')
    paths.push('/usr/local/bin/dot')
    paths.push('/opt/local/bin/dot')
  }

  return paths
}

/**
 * Check if a file is executable
 * 
 * @param {string} filePath - Path to file
 * @returns {boolean} - True if file exists and is executable
 */
function isExecutable (filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false
    }
    
    // On Windows, just check if file exists
    if (process.platform === 'win32') {
      return true
    }
    
    // On Unix, check file mode
    var stats = fs.statSync(filePath)
    var mode = stats.mode
    var isExec = (mode & parseInt('111', 8)) !== 0
    return isExec
  } catch (e) {
    return false
  }
}

/**
 * Find dot executable in system PATH
 * 
 * @returns {string|null} - Path to dot executable
 */
function findDotInPath () {
  try {
    // Use 'which' on Unix, 'where' on Windows
    var command = process.platform === 'win32' ? 'where' : 'which'
    var result = childProcess.execSync(command + ' dot', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    
    if (result) {
      var dotPath = result.trim().split('\n')[0]
      if (dotPath && fs.existsSync(dotPath)) {
        return dotPath
      }
    }
  } catch (e) {
    // Dot not found in PATH
  }
  
  return null
}

/**
 * Verify dot executable works
 * 
 * @param {string} dotPath - Path to dot executable
 * @returns {Promise<boolean>} - True if dot works
 */
function verifyDot (dotPath) {
  return new Promise(function (resolve) {
    try {
      var child = childProcess.spawn(dotPath, ['-V'], {
        stdio: 'pipe'
      })
      
      var hasOutput = false
      child.stdout.on('data', function () {
        hasOutput = true
      })
      child.stderr.on('data', function () {
        hasOutput = true
      })
      
      child.on('close', function (code) {
        // dot -V returns non-zero exit code but still outputs version
        resolve(hasOutput)
      })
      
      child.on('error', function () {
        resolve(false)
      })
      
      // Timeout after 5 seconds
      setTimeout(function () {
        child.kill()
        resolve(false)
      }, 5000)
    } catch (e) {
      resolve(false)
    }
  })
}

module.exports = {
  resolveDotExecutable: resolveDotExecutable,
  getCommonDotPaths: getCommonDotPaths,
  findDotInPath: findDotInPath,
  verifyDot: verifyDot
}

