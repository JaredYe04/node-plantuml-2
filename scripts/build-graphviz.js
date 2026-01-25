#!/usr/bin/env node
'use strict'

/**
 * Build Graphviz package for a specific platform
 * Copies Graphviz binaries from system installation to npm package
 *
 * Usage:
 *   node scripts/build-graphviz.js <platform> <arch> [output-dir]
 *
 * Example:
 *   node scripts/build-graphviz.js darwin arm64
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

var PLATFORM = process.argv[2] || os.platform()
var ARCH = process.argv[3] || os.arch()
var OUTPUT_DIR = process.argv[4] || path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'graphviz-' + PLATFORM + '-' + ARCH)

// Normalize platform names
if (PLATFORM === 'macos' || PLATFORM === 'osx') {
  PLATFORM = 'darwin'
} else if (PLATFORM === 'windows' || PLATFORM === 'cygwin' || PLATFORM === 'msys') {
  PLATFORM = 'win32'
}

// Normalize architecture
if (ARCH === 'x86_64' || ARCH === 'amd64') {
  ARCH = 'x64'
} else if (ARCH === 'aarch64') {
  ARCH = 'arm64'
}

console.log('Building Graphviz package for platform:', PLATFORM, 'architecture:', ARCH)
console.log('Output directory:', OUTPUT_DIR)
console.log('')

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

var graphvizDir = path.join(OUTPUT_DIR, 'graphviz')
if (!fs.existsSync(graphvizDir)) {
  fs.mkdirSync(graphvizDir, { recursive: true })
}

/**
 * Find dot executable on system
 */
function findSystemDot () {
  var dotName = PLATFORM === 'win32' ? 'dot.exe' : 'dot'
  var paths = []

  if (PLATFORM === 'darwin') {
    // macOS paths
    if (ARCH === 'arm64') {
      paths.push('/opt/homebrew/bin/dot')
    }
    paths.push('/usr/local/bin/dot')
    paths.push('/opt/local/bin/dot')
  } else if (PLATFORM === 'win32') {
    // Windows paths
    var programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    var programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    paths.push(path.join(programFiles, 'Graphviz', 'bin', 'dot.exe'))
    paths.push(path.join(programFilesX86, 'Graphviz', 'bin', 'dot.exe'))
    paths.push('C:\\ProgramData\\chocolatey\\bin\\dot.exe')
  } else if (PLATFORM === 'linux') {
    // Linux paths
    paths.push('/usr/bin/dot')
    paths.push('/usr/local/bin/dot')
  }

  // Check paths
  for (var i = 0; i < paths.length; i++) {
    if (fs.existsSync(paths[i])) {
      return paths[i]
    }
  }

  // Try which/where command
  try {
    var command = PLATFORM === 'win32' ? 'where' : 'which'
    var result = childProcess.execSync(command + ' ' + dotName, { encoding: 'utf-8' })
    var foundPath = result.trim().split('\n')[0]
    if (foundPath && fs.existsSync(foundPath)) {
      return foundPath
    }
  } catch (e) {
    // Not found in PATH
  }

  return null
}

/**
 * Copy file or directory recursively
 * Handles symbolic links to avoid infinite loops
 */
var visitedPaths = new Set()

function copyRecursive (src, dest) {
  // Normalize paths to avoid issues with different path formats
  var normalizedSrc = path.resolve(src)

  // Check for circular references
  if (visitedPaths.has(normalizedSrc)) {
    console.log('Skipping circular reference:', src)
    return
  }

  visitedPaths.add(normalizedSrc)

  try {
    // Use lstatSync to detect symlinks without following them
    var stat = fs.lstatSync(src)

    if (stat.isSymbolicLink()) {
      // For Graphviz dot executable, follow the symlink and copy the actual file
      // Otherwise, just copy the symlink
      var basename = path.basename(src)
      if (basename === 'dot' || basename === 'dot.exe') {
        try {
          // Follow symlink and copy the actual file
          var resolvedPath = fs.realpathSync(src)
          if (fs.existsSync(resolvedPath)) {
            var resolvedStat = fs.statSync(resolvedPath)
            if (resolvedStat.isFile()) {
              var destDir = path.dirname(dest)
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true })
              }
              fs.copyFileSync(resolvedPath, dest)
              console.log('  Copied dot executable (resolved symlink):', resolvedPath, '->', dest)
              return
            }
          }
        } catch (err) {
          console.log('  Warning: Could not resolve symlink for dot, copying symlink instead:', err.message)
        }
      }
      // For other symlinks, copy the symlink itself
      var linkTarget = fs.readlinkSync(src)
      if (!fs.existsSync(dest)) {
        fs.symlinkSync(linkTarget, dest)
      }
      return
    }

    if (stat.isDirectory()) {
      // Skip known problematic directories
      var basename = path.basename(src)
      if (basename === 'X11' && src.includes('/usr/bin')) {
        console.log('Skipping problematic X11 symlink directory:', src)
        return
      }

      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }
      var entries = fs.readdirSync(src)
      for (var i = 0; i < entries.length; i++) {
        var entrySrc = path.join(src, entries[i])
        var entryDest = path.join(dest, entries[i])
        copyRecursive(entrySrc, entryDest)
      }
    } else {
      // Regular file
      var destDir = path.dirname(dest)
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }
      fs.copyFileSync(src, dest)
    }
  } catch (err) {
    // If we can't access the file, skip it
    if (err.code === 'ELOOP' || err.code === 'EACCES') {
      console.log('Skipping inaccessible path:', src, err.message)
      return
    }
    throw err
  } finally {
    // Remove from visited set after processing
    visitedPaths.delete(normalizedSrc)
  }
}

/**
 * Main build function
 */
function buildGraphviz () {
  try {
    console.log('Searching for Graphviz installation on system...')

    // Find system dot executable
    var dotPath = findSystemDot()

    if (!dotPath) {
      throw new Error('Graphviz not found on system. Please install Graphviz first:\n' +
        '  - macOS: brew install graphviz\n' +
        '  - Linux: sudo apt-get install graphviz (or your package manager)\n' +
        '  - Windows: choco install graphviz -y')
    }

    console.log('✓ Found dot executable at:', dotPath)

    // Resolve dot path to actual file (follow symlinks)
    var actualDotPath = dotPath
    try {
      var dotStat = fs.lstatSync(dotPath)
      if (dotStat.isSymbolicLink()) {
        actualDotPath = fs.realpathSync(dotPath)
        console.log('  Resolved symlink to:', actualDotPath)
      }
    } catch (e) {
      console.log('  Warning: Could not resolve dot path, using as-is:', e.message)
    }

    // Get Graphviz installation directory from the actual dot path
    var actualDotDir = path.dirname(actualDotPath)
    var graphvizInstallDir = path.dirname(actualDotDir) // Go up from bin/
    var binDir = path.join(graphvizInstallDir, 'bin')
    var libDir = path.join(graphvizInstallDir, 'lib')

    // Verify that binDir contains dot (safety check)
    var expectedDotInBin = path.join(binDir, path.basename(actualDotPath))
    if (!fs.existsSync(expectedDotInBin) && actualDotDir !== binDir) {
      console.log('  Warning: Dot not found in calculated binDir, using actualDotDir instead')
      console.log('  binDir:', binDir)
      console.log('  actualDotDir:', actualDotDir)
      binDir = actualDotDir
    }

    console.log('Graphviz installation directory:', graphvizInstallDir)
    console.log('Actual dot directory:', actualDotDir)
    console.log('Bin directory to copy from:', binDir)
    console.log('')

    // Copy bin directory
    var destBinDir = path.join(graphvizDir, 'bin')
    var destDotPath = path.join(destBinDir, path.basename(dotPath))

    // Ensure dot executable is copied first, then copy rest of bin directory
    console.log('Copying dot executable first...')
    console.log('  Source:', actualDotPath)
    console.log('  Destination:', destDotPath)
    if (!fs.existsSync(destBinDir)) {
      fs.mkdirSync(destBinDir, { recursive: true })
    }
    
    // Always copy the actual file, not the symlink
    fs.copyFileSync(actualDotPath, destDotPath)
    if (PLATFORM !== 'win32') {
      fs.chmodSync(destDotPath, 0o755)
    }
    console.log('✓ Copied dot executable')

    // Verify dot was copied successfully
    if (!fs.existsSync(destDotPath)) {
      throw new Error('Dot executable not found after copying. Expected at: ' + destDotPath)
    }
    
    // Additional verification: check if it's a file (not a symlink or directory)
    var destStat = fs.statSync(destDotPath)
    if (!destStat.isFile()) {
      throw new Error('Dot executable is not a regular file at: ' + destDotPath + ' (isDirectory: ' + destStat.isDirectory() + ')')
    }
    
    // On Unix, verify it's executable
    if (PLATFORM !== 'win32') {
      var destMode = destStat.mode
      var isExecutable = (destMode & parseInt('111', 8)) !== 0
      if (!isExecutable) {
        console.log('  Warning: Dot executable does not have execute permissions, setting them...')
        fs.chmodSync(destDotPath, 0o755)
      }
    }
    
    console.log('✓ Verified dot executable exists at:', destDotPath)
    console.log('  File size:', destStat.size, 'bytes')
    console.log('  Is file:', destStat.isFile())

    // Now copy the rest of the bin directory (if it exists and is different from where dot is)
    if (fs.existsSync(binDir) && binDir !== actualDotDir) {
      console.log('Copying remaining bin directory contents...')
      console.log('  Source:', binDir)
      console.log('  Destination:', destBinDir)
      visitedPaths.clear() // Reset visited paths for each directory
      
      var entries = fs.readdirSync(binDir)
      var dotName = path.basename(dotPath)
      
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i]
        // Skip dot executable as we already copied it
        if (entry === dotName || entry === 'dot' || entry === 'dot.exe') {
          continue
        }
        
        var entrySrc = path.join(binDir, entry)
        var entryDest = path.join(destBinDir, entry)
        
        // Skip if already exists (dot)
        if (fs.existsSync(entryDest)) {
          continue
        }
        
        try {
          copyRecursive(entrySrc, entryDest)
        } catch (err) {
          console.log('  Warning: Could not copy', entry, ':', err.message)
        }
      }
      console.log('✓ Copied remaining bin directory contents')
    } else if (fs.existsSync(binDir)) {
      // binDir is the same as actualDotDir, just copy other files
      console.log('Copying other files from bin directory...')
      visitedPaths.clear()
      var entries = fs.readdirSync(binDir)
      var dotName = path.basename(dotPath)
      
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i]
        if (entry === dotName || entry === 'dot' || entry === 'dot.exe') {
          continue
        }
        
        var entrySrc = path.join(binDir, entry)
        var entryDest = path.join(destBinDir, entry)
        
        if (fs.existsSync(entryDest)) {
          continue
        }
        
        try {
          copyRecursive(entrySrc, entryDest)
        } catch (err) {
          console.log('  Warning: Could not copy', entry, ':', err.message)
        }
      }
      console.log('✓ Copied other bin directory files')
    }

    // Copy lib directory if exists
    if (fs.existsSync(libDir)) {
      console.log('Copying lib directory...')
      visitedPaths.clear() // Reset visited paths for each directory
      var destLibDir = path.join(graphvizDir, 'lib')
      copyRecursive(libDir, destLibDir)
      console.log('✓ Copied lib directory')
    }

    // Copy share directory if exists (for config files, etc.)
    var shareDir = path.join(graphvizInstallDir, 'share')
    if (fs.existsSync(shareDir)) {
      console.log('Copying share directory...')
      visitedPaths.clear() // Reset visited paths for each directory
      var destShareDir = path.join(graphvizDir, 'share')
      copyRecursive(shareDir, destShareDir)
      console.log('✓ Copied share directory')
    }

    // On Windows, also check for Graphviz installation in Program Files
    if (PLATFORM === 'win32') {
      var etcDir = path.join(graphvizInstallDir, 'etc')
      if (fs.existsSync(etcDir)) {
        console.log('Copying etc directory...')
        visitedPaths.clear() // Reset visited paths for each directory
        var destEtcDir = path.join(graphvizDir, 'etc')
        copyRecursive(etcDir, destEtcDir)
        console.log('✓ Copied etc directory')
      }
    }

    console.log('')
    console.log('✅ Graphviz package built successfully!')
    console.log('Output directory:', OUTPUT_DIR)
    console.log('Graphviz directory:', graphvizDir)
  } catch (err) {
    console.error('❌ Error building Graphviz package:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  buildGraphviz()
}

module.exports = {
  buildGraphviz: buildGraphviz
}
