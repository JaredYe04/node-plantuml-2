#!/usr/bin/env node
'use strict'

/**
 * 测试 Graphviz 检测和配置
 * 检查自动检测是否正常工作
 */

var dotResolver = require('../lib/dot-resolver.js')
var plantumlExecutor = require('../lib/plantuml-executor.js')
var os = require('os')
var path = require('path')

console.log('')
console.log('='.repeat(60))
console.log('Graphviz Detection Test')
console.log('='.repeat(60))
console.log('')

var platform = os.platform()
var arch = os.arch()

console.log('Platform:', platform)
console.log('Architecture:', arch)
console.log('')

// 测试1：检测 Graphviz
console.log('Test 1: Detecting Graphviz...')
try {
  var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
  if (dotPath) {
    console.log('✓ Graphviz found:', dotPath)
    console.log('  Path exists:', require('fs').existsSync(dotPath))
    console.log('  Absolute path:', path.resolve(dotPath))
    
    // 测试 dot 是否可执行
    var childProcess = require('child_process')
    try {
      var testResult = childProcess.spawnSync(dotPath, ['-V'], {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 5000
      })
      if (testResult.stdout || testResult.stderr) {
        var version = (testResult.stdout || testResult.stderr || '').trim().split('\n')[0]
        console.log('✓ Dot executable works:', version)
      } else {
        console.warn('⚠️  Dot executable did not produce output')
      }
    } catch (e) {
      console.error('❌ Dot executable test failed:', e.message)
    }
  } else {
    console.error('❌ Graphviz not found!')
    console.error('')
    console.error('This means:')
    console.error('1. Bundled Graphviz package is not installed')
    console.error('2. Or the package is installed but not found')
    console.error('')
    console.error('Please check:')
    var pkgName = dotResolver.getGraphvizPackageName(platform, arch)
    if (pkgName) {
      console.error('  Expected package:', pkgName)
      try {
        var pkgPath = require.resolve(pkgName + '/package.json')
        console.error('  Package found at:', pkgPath)
      } catch (e) {
        console.error('  Package NOT found in node_modules')
        console.error('  Run: npm install', pkgName)
      }
    }
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error detecting Graphviz:', error.message)
  process.exit(1)
}

console.log('')

// 测试2：检查库路径（Linux/macOS）
if (platform === 'linux' || platform === 'darwin') {
  console.log('Test 2: Checking library path...')
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  if (libPath) {
    console.log('✓ Library path:', libPath)
    var fs = require('fs')
    if (fs.existsSync(libPath)) {
      var libs = fs.readdirSync(libPath).filter(function (f) {
        return f.endsWith('.so') || f.endsWith('.dylib')
      })
      console.log('✓ Library directory exists, found', libs.length, 'libraries')
      if (libs.length > 0) {
        console.log('  Sample libraries:', libs.slice(0, 5).join(', '))
      }
    } else {
      console.warn('⚠️  Library directory does not exist!')
    }
  } else {
    console.warn('⚠️  No library path (may be OK for this platform)')
  }
  console.log('')
}

// 测试3：检查 Windows PATH 设置
if (platform === 'win32') {
  console.log('Test 3: Checking Windows PATH setup...')
  var binDir = path.dirname(dotPath)
  console.log('  Bin directory:', binDir)
  
  // 检查 DLL 文件
  var fs = require('fs')
  try {
    var dlls = fs.readdirSync(binDir).filter(function (f) {
      return f.toLowerCase().endsWith('.dll')
    })
    console.log('✓ Found', dlls.length, 'DLL files in bin directory')
    if (dlls.length > 0) {
      console.log('  Sample DLLs:', dlls.slice(0, 5).join(', '))
    } else {
      console.warn('⚠️  No DLL files found! This will cause runtime errors.')
    }
  } catch (e) {
    console.error('❌ Error reading bin directory:', e.message)
  }
  console.log('')
}

// 测试4：模拟实际调用
console.log('Test 4: Simulating actual PlantUML call...')
console.log('')

var testCode = '@startuml\nA -> B\n@enduml'

// 检查环境变量设置
console.log('Environment variables:')
if (platform === 'win32') {
  var pathEnv = process.env.PATH || process.env.Path || ''
  var binDir = path.dirname(dotPath).replace(/\//g, '\\')
  if (pathEnv.toLowerCase().includes(binDir.toLowerCase())) {
    console.log('✓ Graphviz bin directory is in PATH')
  } else {
    console.warn('⚠️  Graphviz bin directory NOT in PATH')
    console.warn('  This may cause DLL loading issues!')
    console.warn('  Bin directory should be:', binDir)
  }
} else if (platform === 'linux') {
  var ldPath = process.env.LD_LIBRARY_PATH || ''
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  if (libPath && ldPath.includes(libPath)) {
    console.log('✓ LD_LIBRARY_PATH is set correctly')
  } else {
    console.warn('⚠️  LD_LIBRARY_PATH may not be set correctly')
    if (libPath) {
      console.warn('  Should include:', libPath)
    }
  }
} else if (platform === 'darwin') {
  var dyldPath = process.env.DYLD_LIBRARY_PATH || ''
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  if (libPath && dyldPath.includes(libPath)) {
    console.log('✓ DYLD_LIBRARY_PATH is set correctly')
  } else {
    console.warn('⚠️  DYLD_LIBRARY_PATH may not be set correctly')
    if (libPath) {
      console.warn('  Should include:', libPath)
    }
  }
}
console.log('')

console.log('✅ All detection tests completed!')
console.log('')
console.log('If Graphviz was found but PlantUML still fails,')
console.log('the issue is likely in how environment variables are passed')
console.log('to the Java subprocess.')

