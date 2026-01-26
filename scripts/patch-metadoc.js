#!/usr/bin/env node
'use strict'

/**
 * 修复 MetaDoc 项目中的 node-plantuml-2 代码
 * 应用我们的修复到已安装的版本
 */

var fs = require('fs')
var path = require('path')

console.log('')
console.log('='.repeat(60))
console.log('Patching MetaDoc node-plantuml-2')
console.log('='.repeat(60))
console.log('')

var metadocPath = path.join('D:', 'MetaDoc', 'MetaDoc', 'meta-doc', 'node_modules', 'node-plantuml-2', 'lib', 'plantuml-executor.js')
var sourcePath = path.join(__dirname, '..', 'lib', 'plantuml-executor.js')

console.log('MetaDoc file:', metadocPath)
console.log('Source file:', sourcePath)
console.log('')

if (!fs.existsSync(metadocPath)) {
  console.error('❌ MetaDoc file not found!')
  process.exit(1)
}

if (!fs.existsSync(sourcePath)) {
  console.error('❌ Source file not found!')
  process.exit(1)
}

// 读取源文件
var sourceContent = fs.readFileSync(sourcePath, 'utf-8')
var targetContent = fs.readFileSync(metadocPath, 'utf-8')

// 检查是否需要修复
if (targetContent.includes('opts[dotPathIndex] = absoluteDotPath')) {
  console.log('✓ File already patched!')
  process.exit(0)
}

console.log('Applying patch...')

// 修复1: 更新索引计算逻辑
targetContent = targetContent.replace(
  /  \/\/ Extract dot path from argv if present\n  for \(var i = 0; i < argv\.length; i\+\+\) \{\n    if \(argv\[i\] === '-graphvizdot' && i \+ 1 < argv\.length\) \{\n      dotPath = argv\[i \+ 1\]\n      dotPathIndex = i \+ 1\n      break\n    \}\n  \}/,
  `  // CRITICAL FIX: Check both argv and opts for -graphvizdot parameter
  // node-plantuml.js may have already added it to argv, which is then in opts
  // First check argv (before it's concatenated to opts)
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === '-graphvizdot' && i + 1 < argv.length) {
      dotPath = argv[i + 1]
      // Calculate the index in opts (argv starts after the initial opts)
      dotPathIndex = 7 + i + 1  // 7 = length of initial opts array
      break
    }
  }
  
  // If not found in argv, check opts (in case it was added elsewhere)
  if (!dotPath) {
    for (var i = 0; i < opts.length; i++) {
      if (opts[i] === '-graphvizdot' && i + 1 < opts.length) {
        dotPath = opts[i + 1]
        dotPathIndex = i + 1
        break
      }
    }
  }`
)

// 修复2: 添加 dotPathAutoDetected 标志
targetContent = targetContent.replace(
  /  \/\/ If no dot path in argv, try to detect it \(ONLY from bundled Graphviz\)\n  if \(!dotPath\) \{/,
  `  // If no dot path in argv, try to detect it (ONLY from bundled Graphviz)
  var dotPathAutoDetected = false
  if (!dotPath) {`
)

targetContent = targetContent.replace(
  /    try \{\n      dotPath = dotResolver\.resolveDotExecutable\(\{ dotPath: null \}\)\n    \} catch \(err\) \{/,
  `    try {
      dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
      dotPathAutoDetected = true
    } catch (err) {`
)

// 修复3: 更新 opts 而不是 argv
targetContent = targetContent.replace(
  /    \/\/ Update argv with absolute path if it was found in argv\n    if \(dotPathIndex >= 0\) \{\n      argv\[dotPathIndex\] = absoluteDotPath\n    \}/,
  `    // Update opts with absolute path
    if (dotPathIndex >= 0) {
      // If dot path was found in argv/opts, update it in opts
      // dotPathIndex is already calculated for opts array
      opts[dotPathIndex] = absoluteDotPath
    } else if (dotPathAutoDetected) {
      // CRITICAL FIX: If dot path was auto-detected, add it to opts
      // PlantUML needs -graphvizdot parameter to know which Graphviz to use
      // Find the position to insert (before any input files)
      var insertIndex = opts.length
      // Look for input file arguments (usually at the end)
      for (var j = opts.length - 1; j >= 0; j--) {
        if (opts[j] && !opts[j].startsWith('-')) {
          insertIndex = j
          break
        }
      }
      // Insert -graphvizdot and path before input files
      opts.splice(insertIndex, 0, '-graphvizdot', absoluteDotPath)
    }`
)

// 写入修复后的文件
fs.writeFileSync(metadocPath, targetContent, 'utf-8')

console.log('✅ Patch applied successfully!')
console.log('')
console.log('The following fixes were applied:')
console.log('1. Fixed dotPathIndex calculation for opts array')
console.log('2. Added check for -graphvizdot in both argv and opts')
console.log('3. Fixed update to use opts instead of argv')
console.log('4. Added auto-detected dotPath to opts if not found')
console.log('')
console.log('Please test the fix in MetaDoc project!')

