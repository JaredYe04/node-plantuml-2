'use strict'

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

/**
 * Resolve Java executable path with fallback strategy
 * 
 * Priority order:
 * 1. options.javaPath (user-specified)
 * 2. Bundled JRE (from optional dependencies)
 * 3. JAVA_HOME environment variable
 * 4. System 'java' in PATH (which java)
 * 
 * @param {Object} options - Options object
 * @param {string} options.javaPath - User-specified Java path (highest priority)
 * @returns {string|null} - Path to Java executable, or null if not found
 */
function resolveJavaExecutable (options) {
  options = options || {}
  
  // Priority 1: User-specified Java path
  if (options.javaPath) {
    var javaPath = path.resolve(options.javaPath)
    if (fs.existsSync(javaPath)) {
      try {
        // Make executable on Unix if needed
        if (process.platform !== 'win32') {
          fs.chmodSync(javaPath, 0o755)
        }
        return javaPath
      } catch (e) {
        // If can't make executable, still try to use it
        return javaPath
      }
    }
  }

  // Priority 2: Bundled JRE from optional dependencies
  var bundledJava = resolveBundledJava()
  if (bundledJava) {
    return bundledJava
  }

  // Priority 3: JAVA_HOME environment variable
  var javaHome = process.env.JAVA_HOME
  if (javaHome) {
    var javaHomeJava = getJavaFromHome(javaHome)
    if (javaHomeJava && fs.existsSync(javaHomeJava)) {
      return javaHomeJava
    }
  }

  // Priority 4: System 'java' in PATH
  try {
    var systemJava = findJavaInPath()
    if (systemJava) {
      return systemJava
    }
  } catch (e) {
    // Ignore errors when checking PATH
  }

  return null
}

/**
 * Resolve bundled JRE from optional dependencies
 * Based on platform and architecture
 * 
 * @returns {string|null} - Path to bundled Java executable
 */
function resolveBundledJava () {
  var platform = os.platform()
  var arch = os.arch()

  // Map platform and arch to package name
  var pkgName = getRuntimePackageName(platform, arch)
  if (!pkgName) {
    return null
  }

  try {
    // Try to resolve the runtime package
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

    // Construct Java executable path
    var javaExe = platform === 'win32' ? 'java.exe' : 'java'
    var javaPath = path.join(pkgPath, 'jre', 'bin', javaExe)

    if (fs.existsSync(javaPath)) {
      try {
        // Make executable on Unix
        if (platform !== 'win32') {
          fs.chmodSync(javaPath, 0o755)
        }
        return javaPath
      } catch (e) {
        // If chmod fails, still return the path (it might already be executable)
        return javaPath
      }
    }
  } catch (e) {
    // Silently fail - bundled JRE not available
    return null
  }

  return null
}

/**
 * Get runtime package name based on platform and architecture
 * 
 * @param {string} platform - OS platform (win32, darwin, linux)
 * @param {string} arch - Architecture (x64, arm64)
 * @returns {string|null} - Package name or null if unsupported
 */
function getRuntimePackageName (platform, arch) {
  if (platform === 'win32' && arch === 'x64') {
    return '@node-plantuml-2/jre-win32-x64'
  } else if (platform === 'darwin' && arch === 'arm64') {
    return '@node-plantuml-2/jre-darwin-arm64'
  } else if (platform === 'darwin' && arch === 'x64') {
    return '@node-plantuml-2/jre-darwin-x64'
  } else if (platform === 'linux' && arch === 'x64') {
    return '@node-plantuml-2/jre-linux-x64'
  }
  
  // Unsupported platform/arch combination
  return null
}

/**
 * Get Java executable from JAVA_HOME
 * 
 * @param {string} javaHome - JAVA_HOME path
 * @returns {string|null} - Path to java executable
 */
function getJavaFromHome (javaHome) {
  var javaExe = process.platform === 'win32' ? 'java.exe' : 'java'
  var javaPath = path.join(javaHome, 'bin', javaExe)
  return javaPath
}

/**
 * Find Java executable in system PATH
 * 
 * @returns {string|null} - Path to java executable
 */
function findJavaInPath () {
  try {
    // Use 'which' on Unix, 'where' on Windows
    var command = process.platform === 'win32' ? 'where' : 'which'
    var result = childProcess.execSync(command + ' java', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    
    if (result) {
      var javaPath = result.trim().split('\n')[0]
      if (javaPath && fs.existsSync(javaPath)) {
        return javaPath
      }
    }
  } catch (e) {
    // Java not found in PATH
  }
  
  return null
}

/**
 * Verify Java executable works
 * 
 * @param {string} javaPath - Path to Java executable
 * @returns {Promise<boolean>} - True if Java works
 */
function verifyJava (javaPath) {
  return new Promise(function (resolve) {
    try {
      var child = childProcess.spawn(javaPath, ['-version'], {
        stdio: 'pipe'
      })
      
      var hasOutput = false
      child.on('data', function () {
        hasOutput = true
      })
      
      child.on('close', function (code) {
        resolve(code === 0)
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
  resolveJavaExecutable: resolveJavaExecutable,
  resolveBundledJava: resolveBundledJava,
  getRuntimePackageName: getRuntimePackageName,
  verifyJava: verifyJava
}

