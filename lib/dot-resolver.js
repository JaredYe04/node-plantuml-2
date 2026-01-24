'use strict'

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

/**
 * Resolve bundled Graphviz from npm package
 * 
 * @returns {string|null} - Path to bundled dot executable
 */
function resolveBundledGraphviz () {
  var platform = os.platform()
  var arch = os.arch()

  // Map platform and arch to package name
  var pkgName = getGraphvizPackageName(platform, arch)
  if (!pkgName) {
    return null
  }

  try {
    // Try to resolve the package
    var pkgPath
    try {
      // Try to require.resolve the package
      var pkgJsonPath = require.resolve(pkgName + '/package.json')
      pkgPath = path.dirname(pkgJsonPath)
    } catch (e) {
      // Package might not be installed (optional dependency)
      // Try to find it in node_modules relative to this package
      var thisPkgPath = path.join(__dirname, '..')
      var possiblePath = path.join(thisPkgPath, 'node_modules', pkgName)
      if (fs.existsSync(path.join(possiblePath, 'package.json'))) {
        pkgPath = possiblePath
      } else {
        return null
      }
    }

    // Construct dot executable path
    var dotExe = platform === 'win32' ? 'dot.exe' : 'dot'
    var dotPath = path.join(pkgPath, 'graphviz', 'bin', dotExe)

    if (fs.existsSync(dotPath)) {
      try {
        // Make executable on Unix
        if (platform !== 'win32') {
          fs.chmodSync(dotPath, 0o755)
        }
        return dotPath
      } catch (e) {
        // If chmod fails, still return the path (it might already be executable)
        return dotPath
      }
    }
  } catch (e) {
    // Silently fail - bundled Graphviz not available
    return null
  }

  return null
}

/**
 * Get Graphviz package name based on platform and architecture
 * 
 * @param {string} platform - OS platform (win32, darwin, linux)
 * @param {string} arch - Architecture (x64, arm64)
 * @returns {string|null} - Package name or null if unsupported
 */
function getGraphvizPackageName (platform, arch) {
  if (platform === 'win32' && arch === 'x64') {
    return '@node-plantuml-2/graphviz-win32-x64'
  } else if (platform === 'darwin' && arch === 'arm64') {
    return '@node-plantuml-2/graphviz-darwin-arm64'
  } else if (platform === 'darwin' && arch === 'x64') {
    return '@node-plantuml-2/graphviz-darwin-x64'
  } else if (platform === 'linux' && arch === 'x64') {
    return '@node-plantuml-2/graphviz-linux-x64'
  }
  
  // Unsupported platform/arch combination
  return null
}

/**
 * Resolve Graphviz dot executable path with fallback strategy
 * 
 * Priority order:
 * 1. options.dotPath (user-specified)
 * 2. Bundled Graphviz (from optional dependencies)
 * 3. Common installation paths (platform-specific)
 * 4. System 'dot' in PATH (which dot)
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

  // Priority 2: Bundled Graphviz from optional dependencies
  var bundledGraphviz = resolveBundledGraphviz()
  if (bundledGraphviz) {
    return bundledGraphviz
  }

  // Priority 3: Common installation paths (platform-specific)
  var commonPaths = getCommonDotPaths()
  for (var i = 0; i < commonPaths.length; i++) {
    var commonPath = commonPaths[i]
    if (fs.existsSync(commonPath) && isExecutable(commonPath)) {
      return commonPath
    }
  }

  // Priority 4: System 'dot' in PATH
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
  resolveBundledGraphviz: resolveBundledGraphviz,
  getGraphvizPackageName: getGraphvizPackageName,
  getCommonDotPaths: getCommonDotPaths,
  findDotInPath: findDotInPath,
  verifyDot: verifyDot
}

