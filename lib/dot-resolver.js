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
      // Method 1: Try require.resolve (works in most cases, including external projects)
      var pkgJsonPath = require.resolve(pkgName + '/package.json')
      pkgPath = path.dirname(pkgJsonPath)
    } catch (e) {
      // Method 2: Package might not be installed (optional dependency)
      // Try to find it by locating node-plantuml-2 package first, then look in its parent node_modules
      try {
        // Find where node-plantuml-2 is installed
        var nodePlantumlPath = require.resolve('node-plantuml-2')
        // Get the node_modules directory that contains node-plantuml-2
        // node-plantuml-2 is at: .../node_modules/node-plantuml-2/lib/...
        // So node_modules is at: .../node_modules/
        var nodeModulesDir = path.dirname(path.dirname(nodePlantumlPath))
        
        // For scoped packages like @node-plantuml-2/graphviz-win32-x64,
        // the path structure is: node_modules/@node-plantuml-2/graphviz-win32-x64/
        // So we need to handle the @scope/package format
        var possiblePath = path.join(nodeModulesDir, pkgName)
        if (fs.existsSync(path.join(possiblePath, 'package.json'))) {
          pkgPath = possiblePath
        } else {
          // Method 3: Try in current package's node_modules (for development)
          var thisPkgPath = path.join(__dirname, '..')
          var devPath = path.join(thisPkgPath, 'node_modules', pkgName)
          if (fs.existsSync(path.join(devPath, 'package.json'))) {
            pkgPath = devPath
          } else {
            // Method 4: Recursive search up the directory tree
            var currentDir = thisPkgPath
            var found = false
            while (currentDir !== path.dirname(currentDir)) {
              var searchPath = path.join(currentDir, 'node_modules', pkgName)
              if (fs.existsSync(path.join(searchPath, 'package.json'))) {
                pkgPath = searchPath
                found = true
                break
              }
              currentDir = path.dirname(currentDir)
            }
            if (!found) {
              return null
            }
          }
        }
      } catch (resolveErr) {
        // If we can't even resolve node-plantuml-2, try local fallback
        var thisPkgPath = path.join(__dirname, '..')
        var possiblePath = path.join(thisPkgPath, 'node_modules', pkgName)
        if (fs.existsSync(path.join(possiblePath, 'package.json'))) {
          pkgPath = possiblePath
        } else {
          return null
        }
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
 * Get Graphviz library path for bundled Graphviz (for LD_LIBRARY_PATH on Linux)
 *
 * @param {string} dotPath - Path to dot executable (from resolveBundledGraphviz)
 * @returns {string|null} - Path to Graphviz lib directory, or null if not bundled
 */
function getBundledGraphvizLibPath (dotPath) {
  if (!dotPath) {
    return null
  }

  var platform = os.platform()

  // Only needed on Linux (and possibly macOS with DYLD_LIBRARY_PATH)
  if (platform !== 'linux' && platform !== 'darwin') {
    return null
  }

  try {
    // Normalize path separators for checking
    var normalizedPath = dotPath.replace(/\\/g, '/')
    
    // Check if this is a bundled Graphviz path
    // Bundled path format: .../node_modules/@node-plantuml-2/graphviz-*/graphviz/bin/dot
    // Handle both / and \ path separators (Windows uses \)
    var isBundled = normalizedPath.includes('@node-plantuml-2/graphviz-') &&
                    normalizedPath.includes('/graphviz/bin/')
    if (isBundled) {
      // Extract the graphviz directory
      // Go up from bin/ to graphviz/
      var graphvizDir = path.dirname(path.dirname(dotPath))
      var libDir = path.join(graphvizDir, 'lib')

      if (fs.existsSync(libDir)) {
        return libDir
      }
    }
  } catch (e) {
    // Silently fail
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
 * Resolve Graphviz dot executable path
 *
 * Priority order:
 * 1. options.dotPath (user-specified)
 * 2. Bundled Graphviz (from optional dependencies) - REQUIRED
 *
 * NOTE: We ONLY use bundled Graphviz packages. System Graphviz is NOT used.
 * This ensures consistent behavior across all environments.
 *
 * @param {Object} options - Options object
 * @param {string} options.dotPath - User-specified dot path (highest priority)
 * @param {boolean} options.allowSystemFallback - If true, allow system Graphviz as fallback (for install scripts only)
 * @returns {string|null} - Path to dot executable, or null if not found
 * @throws {Error} - If bundled Graphviz is not found and allowSystemFallback is false
 */
function resolveDotExecutable (options) {
  options = options || {}
  var allowSystemFallback = options.allowSystemFallback === true

  // Priority 1: User-specified dot path
  if (options.dotPath) {
    var dotPath = path.resolve(options.dotPath)
    if (fs.existsSync(dotPath) && isExecutable(dotPath)) {
      return dotPath
    }
  }

  // Priority 2: Bundled Graphviz from optional dependencies (REQUIRED)
  var bundledGraphviz = resolveBundledGraphviz()
  if (bundledGraphviz) {
    return bundledGraphviz
  }

  // If bundled Graphviz is not found, we should NOT fallback to system
  // This ensures all users use the same Graphviz version
  if (!allowSystemFallback) {
    var platform = os.platform()
    var arch = os.arch()
    var pkgName = getGraphvizPackageName(platform, arch)
    
    if (pkgName) {
      throw new Error(
        'Bundled Graphviz not found. Please install the Graphviz runtime package:\n' +
        '  npm install ' + pkgName + '\n\n' +
        'This package should be automatically installed via optionalDependencies.\n' +
        'If it failed to install, please check:\n' +
        '  1. Your platform is supported: ' + platform + ' ' + arch + '\n' +
        '  2. Network connection during npm install\n' +
        '  3. npm install logs for errors\n\n' +
        'Alternatively, you can specify a custom Graphviz path:\n' +
        '  plantuml.generate(code, { dotPath: "/path/to/dot" })'
      )
    } else {
      throw new Error(
        'Graphviz is required but not available.\n' +
        'Your platform (' + platform + ' ' + arch + ') is not supported.\n' +
        'Please install Graphviz manually and specify the path:\n' +
        '  plantuml.generate(code, { dotPath: "/path/to/dot" })'
      )
    }
  }

  // System fallback (ONLY for install scripts, NOT for runtime)
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
    paths.push('/opt/homebrew/bin/dot') // Homebrew on Apple Silicon
    paths.push('/usr/local/bin/dot') // Homebrew on Intel
    paths.push('/opt/local/bin/dot') // MacPorts
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
  getBundledGraphvizLibPath: getBundledGraphvizLibPath,
  getGraphvizPackageName: getGraphvizPackageName,
  getCommonDotPaths: getCommonDotPaths,
  findDotInPath: findDotInPath,
  verifyDot: verifyDot
}
