#!/usr/bin/env node
'use strict'

/**
 * Verify Graphviz package is complete and correct
 *
 * Usage:
 *   node scripts/verify-graphviz-package.js <platform> <arch> [package-dir]
 *
 * Example:
 *   node scripts/verify-graphviz-package.js win32 x64
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

var PLATFORM = process.argv[2] || os.platform()
var ARCH = process.argv[3] || os.arch()
var PACKAGE_DIR = process.argv[4] || path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', 'graphviz-' + PLATFORM + '-' + ARCH)

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

var graphvizDir = path.join(PACKAGE_DIR, 'graphviz')
var dotExe = PLATFORM === 'win32' ? 'dot.exe' : 'dot'
var dotPath = path.join(graphvizDir, 'bin', dotExe)

var errors = []
var warnings = []

console.log('')
console.log('='.repeat(60))
console.log('Verifying Graphviz Package')
console.log('='.repeat(60))
console.log('Platform:', PLATFORM)
console.log('Architecture:', ARCH)
console.log('Package directory:', PACKAGE_DIR)
console.log('')

// Check 1: Package directory exists
console.log('✓ Checking package directory...')
if (!fs.existsSync(PACKAGE_DIR)) {
  errors.push('Package directory does not exist: ' + PACKAGE_DIR)
  console.log('❌ Package directory not found')
} else {
  console.log('✓ Package directory exists')
}

// Check 2: Graphviz directory exists
console.log('✓ Checking graphviz directory...')
if (!fs.existsSync(graphvizDir)) {
  errors.push('Graphviz directory does not exist: ' + graphvizDir)
  console.log('❌ Graphviz directory not found')
} else {
  console.log('✓ Graphviz directory exists')
}

// Check 3: Dot executable exists
console.log('✓ Checking dot executable...')
if (!fs.existsSync(dotPath)) {
  errors.push('Dot executable not found: ' + dotPath)
  console.log('❌ Dot executable not found')
} else {
  var dotStat = fs.statSync(dotPath)
  if (!dotStat.isFile()) {
    errors.push('Dot path is not a regular file: ' + dotPath)
    console.log('❌ Dot path is not a file')
  } else {
    console.log('✓ Dot executable found')
    console.log('  Size:', (dotStat.size / 1024).toFixed(2), 'KB')
    
    // Check executable permissions (Unix)
    if (PLATFORM !== 'win32') {
      var mode = dotStat.mode
      var isExecutable = (mode & parseInt('111', 8)) !== 0
      if (!isExecutable) {
        warnings.push('Dot executable does not have execute permissions')
        console.log('⚠️  Warning: Dot executable is not executable')
        // Try to fix
        try {
          fs.chmodSync(dotPath, 0o755)
          console.log('✓ Fixed execute permissions')
        } catch (e) {
          errors.push('Could not set execute permissions: ' + e.message)
        }
      } else {
        console.log('✓ Dot executable has correct permissions')
      }
    }
  }
}

// Check 4: Test dot executable
if (fs.existsSync(dotPath)) {
  console.log('✓ Testing dot executable...')
  try {
    var testResult = childProcess.spawnSync(dotPath, ['-V'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000
    })
    
    if (testResult.status === 0 || testResult.stdout || testResult.stderr) {
      var versionOutput = (testResult.stdout || testResult.stderr || '').trim()
      if (versionOutput) {
        console.log('✓ Dot executable works!')
        console.log('  Version:', versionOutput.split('\n')[0])
      } else {
        warnings.push('Dot executable runs but produces no output')
        console.log('⚠️  Warning: Dot executable runs but produces no output')
      }
    } else {
      errors.push('Dot executable failed to run (exit code: ' + testResult.status + ')')
      console.log('❌ Dot executable failed to run')
    }
  } catch (e) {
    errors.push('Error testing dot executable: ' + e.message)
    console.log('❌ Error testing dot executable:', e.message)
  }
}

// Check 5: Bin directory contents
console.log('✓ Checking bin directory...')
var binDir = path.join(graphvizDir, 'bin')
if (fs.existsSync(binDir)) {
  var binFiles = fs.readdirSync(binDir)
  var graphvizBinaries = binFiles.filter(function (file) {
    return file === dotExe || 
           file.startsWith('dot') || 
           file.startsWith('neato') ||
           file.startsWith('fdp') ||
           file.startsWith('sfdp') ||
           (PLATFORM === 'win32' && file.endsWith('.dll'))
  })
  
  console.log('  Found', binFiles.length, 'files in bin directory')
  console.log('  Graphviz-related files:', graphvizBinaries.length)
  
  if (graphvizBinaries.length === 0) {
    warnings.push('No Graphviz binaries found in bin directory')
  }
} else {
  errors.push('Bin directory does not exist: ' + binDir)
  console.log('❌ Bin directory not found')
}

// Check 6: Lib directory (critical for Linux/macOS)
console.log('✓ Checking lib directory...')
var libDir = path.join(graphvizDir, 'lib')
if (PLATFORM === 'linux' || PLATFORM === 'darwin') {
  if (!fs.existsSync(libDir)) {
    errors.push('Lib directory does not exist (required for ' + PLATFORM + '): ' + libDir)
    console.log('❌ Lib directory not found (REQUIRED for ' + PLATFORM + ')')
  } else {
    var libFiles = fs.readdirSync(libDir)
    var graphvizLibs = libFiles.filter(function (file) {
      return file.startsWith('libgv') ||
             file.startsWith('libgraph') ||
             file.startsWith('libgvc') ||
             file.startsWith('libcdt') ||
             file.startsWith('libcgraph') ||
             file.startsWith('libpathplan') ||
             file.startsWith('libxdot')
    })
    
    console.log('  Found', libFiles.length, 'files in lib directory')
    console.log('  Graphviz libraries:', graphvizLibs.length)
    
    if (graphvizLibs.length === 0) {
      errors.push('No Graphviz libraries found in lib directory (required for ' + PLATFORM + ')')
      console.log('❌ No Graphviz libraries found (REQUIRED)')
    } else {
      console.log('✓ Graphviz libraries found')
      
      // On Linux, check dependencies using ldd
      if (PLATFORM === 'linux' && fs.existsSync(dotPath)) {
        console.log('✓ Checking library dependencies (ldd)...')
        try {
          var lddResult = childProcess.execSync('ldd "' + dotPath + '"', {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024
          })
          
          var missingLibs = []
          var lines = lddResult.split('\n')
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim()
            if (line.includes('not found') || line.includes('No such file')) {
              // Check if it's a system library (should be OK)
              if (!line.includes('libc.so') && 
                  !line.includes('libm.so') && 
                  !line.includes('libdl.so') &&
                  !line.includes('libpthread.so')) {
                missingLibs.push(line)
              }
            }
          }
          
          if (missingLibs.length > 0) {
            warnings.push('Some library dependencies may be missing: ' + missingLibs.length)
            console.log('⚠️  Warning: Found', missingLibs.length, 'potentially missing dependencies')
            console.log('  Sample:', missingLibs[0])
          } else {
            console.log('✓ All library dependencies resolved')
          }
        } catch (e) {
          warnings.push('Could not check library dependencies: ' + e.message)
          console.log('⚠️  Warning: Could not check dependencies (ldd failed)')
        }
      }
    }
  }
} else {
  // Windows - lib directory is optional (DLLs are in bin)
  if (fs.existsSync(libDir)) {
    console.log('  Lib directory exists (optional for Windows)')
  } else {
    console.log('  Lib directory not found (OK for Windows, DLLs should be in bin)')
  }
}

// Check 7: Test actual rendering (if dot works)
if (fs.existsSync(dotPath) && errors.length === 0) {
  console.log('✓ Testing actual Graphviz rendering...')
  try {
    var testDot = 'digraph G { A -> B; }'
    var renderResult = childProcess.spawnSync(dotPath, ['-Tsvg'], {
      input: testDot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    })
    
    if (renderResult.status === 0 && renderResult.stdout) {
      if (renderResult.stdout.includes('<svg') || renderResult.stdout.includes('<?xml')) {
        console.log('✓ Graphviz rendering works!')
        console.log('  Output size:', (renderResult.stdout.length / 1024).toFixed(2), 'KB')
      } else {
        warnings.push('Graphviz rendering produces unexpected output')
        console.log('⚠️  Warning: Rendering output format unexpected')
      }
    } else {
      warnings.push('Graphviz rendering failed (exit code: ' + renderResult.status + ')')
      console.log('⚠️  Warning: Rendering test failed')
      if (renderResult.stderr) {
        console.log('  Error:', renderResult.stderr.substring(0, 200))
      }
    }
  } catch (e) {
    warnings.push('Error testing rendering: ' + e.message)
    console.log('⚠️  Warning: Could not test rendering:', e.message)
  }
}

// Check 8: Package size
console.log('✓ Checking package size...')
var packageSize = calculateDirectorySize(graphvizDir)
var packageSizeMB = (packageSize / 1024 / 1024).toFixed(2)
console.log('  Package size:', packageSizeMB, 'MB')

if (packageSize < 1024 * 1024) { // Less than 1MB
  errors.push('Package size is too small (' + packageSizeMB + 'MB), likely incomplete')
  console.log('❌ Package size is too small (likely incomplete)')
} else if (packageSize > 200 * 1024 * 1024) { // More than 200MB
  warnings.push('Package size is very large (' + packageSizeMB + 'MB), may cause npm issues')
  console.log('⚠️  Warning: Package size is very large')
} else {
  console.log('✓ Package size is reasonable')
}

// Summary
console.log('')
console.log('='.repeat(60))
console.log('Verification Summary')
console.log('='.repeat(60))

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Package is complete and correct.')
  process.exit(0)
} else {
  if (errors.length > 0) {
    console.log('❌ Errors found:', errors.length)
    errors.forEach(function (error) {
      console.log('  -', error)
    })
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:', warnings.length)
    warnings.forEach(function (warning) {
      console.log('  -', warning)
    })
  }
  
  if (errors.length > 0) {
    console.log('')
    console.log('❌ Package verification FAILED')
    process.exit(1)
  } else {
    console.log('')
    console.log('⚠️  Package verification passed with warnings')
    process.exit(0)
  }
}

/**
 * Calculate total size of a directory recursively
 */
function calculateDirectorySize (dirPath) {
  var totalSize = 0
  try {
    var entries = fs.readdirSync(dirPath)
    for (var i = 0; i < entries.length; i++) {
      var entryPath = path.join(dirPath, entries[i])
      try {
        var stat = fs.statSync(entryPath)
        if (stat.isDirectory()) {
          totalSize += calculateDirectorySize(entryPath)
        } else if (stat.isFile()) {
          totalSize += stat.size
        }
      } catch (e) {
        // Skip files we can't access
      }
    }
  } catch (e) {
    // Skip directories we can't access
  }
  return totalSize
}

