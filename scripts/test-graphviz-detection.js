#!/usr/bin/env node
'use strict'

/**
 * Test script to verify Graphviz detection and reference logic
 * This simulates how the package detects and uses Graphviz in an external project
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var dotResolver = require('../lib/dot-resolver')

console.log('=== Graphviz Detection Test ===\n')
console.log('Platform:', os.platform(), os.arch())
console.log('')

// Test 1: Check if Graphviz package is installed
console.log('1. Checking Graphviz package installation...')
var platform = os.platform()
var arch = os.arch()
var pkgName = dotResolver.getGraphvizPackageName(platform, arch)
console.log('   Expected package:', pkgName || 'NOT SUPPORTED')

if (pkgName) {
  // Try multiple resolution methods
  var resolvedPaths = []
  
  // Method 1: require.resolve
  try {
    var pkgJsonPath = require.resolve(pkgName + '/package.json')
    resolvedPaths.push({
      method: 'require.resolve',
      path: path.dirname(pkgJsonPath),
      exists: true
    })
    console.log('   ✓ Found via require.resolve:', path.dirname(pkgJsonPath))
  } catch (e) {
    resolvedPaths.push({
      method: 'require.resolve',
      path: null,
      exists: false,
      error: e.message
    })
    console.log('   ✗ require.resolve failed:', e.message)
  }
  
  // Method 2: Check in current package's node_modules
  var thisPkgPath = path.join(__dirname, 'node_modules', pkgName)
  if (fs.existsSync(path.join(thisPkgPath, 'package.json'))) {
    resolvedPaths.push({
      method: 'local node_modules',
      path: thisPkgPath,
      exists: true
    })
    console.log('   ✓ Found in local node_modules:', thisPkgPath)
  } else {
    resolvedPaths.push({
      method: 'local node_modules',
      path: thisPkgPath,
      exists: false
    })
    console.log('   ✗ Not found in local node_modules:', thisPkgPath)
  }
  
  // Method 3: Check in parent node_modules (for external projects)
  var parentNodeModules = path.join(__dirname, '..', 'node_modules', pkgName)
  if (fs.existsSync(path.join(parentNodeModules, 'package.json'))) {
    resolvedPaths.push({
      method: 'parent node_modules',
      path: parentNodeModules,
      exists: true
    })
    console.log('   ✓ Found in parent node_modules:', parentNodeModules)
  } else {
    resolvedPaths.push({
      method: 'parent node_modules',
      path: parentNodeModules,
      exists: false
    })
    console.log('   ✗ Not found in parent node_modules:', parentNodeModules)
  }
  
  // Method 4: Recursive search up the directory tree
  var currentDir = __dirname
  var foundInTree = false
  while (currentDir !== path.dirname(currentDir)) {
    var possiblePath = path.join(currentDir, 'node_modules', pkgName)
    if (fs.existsSync(path.join(possiblePath, 'package.json'))) {
      resolvedPaths.push({
        method: 'recursive search',
        path: possiblePath,
        exists: true
      })
      console.log('   ✓ Found via recursive search:', possiblePath)
      foundInTree = true
      break
    }
    currentDir = path.dirname(currentDir)
  }
  if (!foundInTree) {
    console.log('   ✗ Not found via recursive search')
  }
  
  console.log('')
}

// Test 2: Test resolveBundledGraphviz
console.log('2. Testing resolveBundledGraphviz()...')
var bundledGraphviz = dotResolver.resolveBundledGraphviz()
if (bundledGraphviz) {
  console.log('   ✓ Found bundled Graphviz:', bundledGraphviz)
  console.log('   Exists:', fs.existsSync(bundledGraphviz))
  
  // Check if it's executable
  if (fs.existsSync(bundledGraphviz)) {
    try {
      var stats = fs.statSync(bundledGraphviz)
      if (platform !== 'win32') {
        var isExec = (stats.mode & parseInt('111', 8)) !== 0
        console.log('   Is executable:', isExec)
      } else {
        console.log('   Is executable: true (Windows)')
      }
    } catch (e) {
      console.log('   Error checking stats:', e.message)
    }
  }
} else {
  console.log('   ✗ No bundled Graphviz found')
}
console.log('')

// Test 3: Test resolveDotExecutable (should prioritize bundled)
console.log('3. Testing resolveDotExecutable()...')
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
if (dotPath) {
  console.log('   ✓ Found dot executable:', dotPath)
  console.log('   Exists:', fs.existsSync(dotPath))
  
  // Check if it's bundled
  var isBundled = dotPath.includes('@node-plantuml-2/graphviz-')
  console.log('   Is bundled:', isBundled)
  
  if (isBundled) {
    var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
    console.log('   Library path:', libPath || 'NOT FOUND')
    if (libPath) {
      console.log('   Library path exists:', fs.existsSync(libPath))
      if (fs.existsSync(libPath)) {
        var libFiles = fs.readdirSync(libPath).filter(function (f) {
          return f.includes('libgvc') || f.includes('libgraph')
        })
        console.log('   Library files found:', libFiles.length)
      }
    }
  }
} else {
  console.log('   ✗ No dot executable found')
  console.log('')
  console.log('   Checking system paths...')
  var commonPaths = dotResolver.getCommonDotPaths()
  for (var i = 0; i < commonPaths.length; i++) {
    var commonPath = commonPaths[i]
    var exists = fs.existsSync(commonPath)
    console.log('   ', exists ? '✓' : '✗', commonPath)
  }
}
console.log('')

// Test 4: Test in a simulated external project scenario
console.log('4. Simulating external project scenario...')
console.log('   Current working directory:', process.cwd())
console.log('   Script directory:', __dirname)
console.log('   Package root (assumed):', path.join(__dirname, '..'))

// Try to find node-plantuml-2 package location
var nodePlantumlPath = null
try {
  var mainModulePath = require.resolve('node-plantuml-2')
  nodePlantumlPath = path.dirname(mainModulePath)
  console.log('   node-plantuml-2 package found at:', nodePlantumlPath)
  
  // Check if Graphviz package is in the same node_modules
  var graphvizInSameNodeModules = path.join(path.dirname(nodePlantumlPath), '..', pkgName)
  if (fs.existsSync(path.join(graphvizInSameNodeModules, 'package.json'))) {
    console.log('   ✓ Graphviz package in same node_modules:', graphvizInSameNodeModules)
  } else {
    console.log('   ✗ Graphviz package NOT in same node_modules')
  }
} catch (e) {
  console.log('   ⚠️  Could not resolve node-plantuml-2 package:', e.message)
  console.log('   (This is normal if running from source)')
}

console.log('')
console.log('=== Summary ===')
if (bundledGraphviz && fs.existsSync(bundledGraphviz)) {
  console.log('✅ Bundled Graphviz is available and accessible')
} else if (dotPath && !dotPath.includes('@node-plantuml-2')) {
  console.log('⚠️  Using system Graphviz (bundled not available)')
} else {
  console.log('❌ No Graphviz found (neither bundled nor system)')
}

