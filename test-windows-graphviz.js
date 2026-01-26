#!/usr/bin/env node
'use strict'

/**
 * Windows Graphviz 诊断测试脚本
 * 用于诊断 Windows 上 PlantUML 无法解析 Graphviz 输出的问题
 */

var plantuml = require('./lib/node-plantuml')
var dotResolver = require('./lib/dot-resolver')
var javaResolver = require('./lib/java-resolver')
var childProcess = require('child_process')
var path = require('path')
var os = require('os')
var fs = require('fs')

console.log('=== Windows Graphviz 诊断测试 ===')
console.log('')

// 1. 检查平台
console.log('1. 平台信息:')
console.log('   Platform:', os.platform())
console.log('   Arch:', os.arch())
console.log('')

// 2. 检查 JRE
console.log('2. JRE 检测:')
var javaPath = javaResolver.resolveJavaExecutable({})
console.log('   Java Path:', javaPath || 'NOT FOUND')
if (javaPath) {
  try {
    var javaVersion = childProcess.execSync('"' + javaPath + '" -version', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    console.log('   Java Version:', javaVersion.split('\n')[0])
  } catch (e) {
    console.log('   Error getting Java version:', e.message)
  }
}
console.log('')

// 3. 检查 Graphviz
console.log('3. Graphviz 检测:')
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
console.log('   Dot Path:', dotPath || 'NOT FOUND')
if (dotPath) {
  console.log('   Dot Dir:', path.dirname(dotPath))
  console.log('   Dot Exists:', fs.existsSync(dotPath))
  
  // 检查 Graphviz 版本
  try {
    var dotVersion = childProcess.execSync('"' + dotPath + '" -V', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    console.log('   Graphviz Version:', dotVersion.trim().split('\n')[0])
  } catch (e) {
    console.log('   Error getting Graphviz version:', e.message)
    if (e.stderr) {
      console.log('   Stderr:', e.stderr.toString().substring(0, 200))
    }
  }
  
  // 检查 bin 目录中的 DLL
  var binDirCheck = path.dirname(dotPath)
  if (fs.existsSync(binDirCheck)) {
    var dllFiles = fs.readdirSync(binDirCheck).filter(function (f) {
      return f.toLowerCase().endsWith('.dll')
    })
    console.log('   DLL files in bin:', dllFiles.length)
    if (dllFiles.length > 0) {
      console.log('   Sample DLLs:', dllFiles.slice(0, 5).join(', '))
    }
  }
}
console.log('')

// 4. 检查 PATH 环境变量
console.log('4. PATH 环境变量:')
var currentPath = process.env.PATH || ''
var pathEntries = currentPath.split(';')
console.log('   PATH entries:', pathEntries.length)
if (dotPath) {
  var binDirPath = path.dirname(dotPath).replace(/\//g, '\\')
  var inPath = pathEntries.some(function (entry) {
    return entry.replace(/\//g, '\\').toLowerCase() === binDirPath.toLowerCase()
  })
  console.log('   Graphviz bin in PATH:', inPath)
  if (!inPath) {
    console.log('   ⚠️  Graphviz bin directory NOT in PATH!')
    console.log('   Should add:', binDirPath)
  }
}
console.log('   PATH (first 300 chars):', currentPath.substring(0, 300))
console.log('')

// 5. 测试 Graphviz 直接调用
console.log('5. 测试 Graphviz 直接调用:')
if (dotPath) {
  try {
    var testGraph = 'digraph G { A -> B }'
    var tempFile = path.join(os.tmpdir(), 'test-graphviz-' + Date.now() + '.dot')
    fs.writeFileSync(tempFile, testGraph, 'utf8')
    
    // 设置环境变量
    var env = Object.assign({}, process.env)
    var binDirTest = path.dirname(dotPath).replace(/\//g, '\\')
    env.PATH = binDirTest + ';' + (env.PATH || '')
    
    console.log('   Testing with PATH:', binDirTest)
    var dotOutput = childProcess.execSync('"' + dotPath + '" -Tpng "' + tempFile + '"', {
      encoding: 'buffer',
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024
    })
    
    // 检查 PNG 签名
    var isPng = dotOutput.length > 8 &&
                dotOutput[0] === 0x89 &&
                dotOutput[1] === 0x50 &&
                dotOutput[2] === 0x4E &&
                dotOutput[3] === 0x47
    
    if (isPng) {
      console.log('   ✓ Graphviz can generate PNG:', dotOutput.length, 'bytes')
    } else {
      console.log('   ✗ Graphviz output is not valid PNG')
      console.log('   First 50 bytes:', Array.from(dotOutput.slice(0, 50)).map(function (b) {
        return '0x' + b.toString(16).padStart(2, '0')
      }).join(' '))
    }
    
    fs.unlinkSync(tempFile)
  } catch (e) {
    console.log('   ✗ Graphviz test failed:', e.message)
    if (e.stderr) {
      console.log('   Stderr:', e.stderr.toString().substring(0, 500))
    }
  }
}
console.log('')

// 6. 测试 PlantUML testdot
console.log('6. 测试 PlantUML testdot:')
plantuml.testdot(function (isOk) {
  console.log('   testdot result:', isOk ? 'OK' : 'FAILED')
  console.log('')
  
  // 7. 测试实际图表生成
  console.log('7. 测试实际图表生成 (需要 Graphviz):')
  if (isOk) {
    var testCode = '@startuml\nstart\n:Hello World;\nstop\n@enduml'
    var gen = plantuml.generate(testCode, { format: 'png' })
    
    var chunks = []
    var hasError = false
    var errorMessage = ''
    
    gen.out.on('data', function (chunk) {
      chunks.push(chunk)
    })
    
    gen.out.on('error', function (err) {
      hasError = true
      errorMessage = err.message
      console.log('   ✗ Stream error:', err.message)
    })
    
    // Capture stderr if available
    if (gen.err) {
      gen.err.on('data', function (chunk) {
        var stderrData = chunk.toString()
        if (stderrData.includes('cannot parse result') || 
            stderrData.includes('IllegalStateException') ||
            stderrData.includes('GraphViz')) {
          hasError = true
          errorMessage = stderrData.substring(0, 500)
          console.log('   ✗ Error in stderr:', stderrData.substring(0, 500))
        }
      })
    }
    
    gen.out.on('end', function () {
      if (hasError) {
        console.log('   ✗ Diagram generation failed')
        if (errorMessage) {
          console.log('   Error:', errorMessage)
        }
      } else {
        var buffer = Buffer.concat(chunks)
        if (buffer.length > 0) {
          var isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
          if (isPng) {
            console.log('   ✓ Diagram generated successfully:', buffer.length, 'bytes')
          } else {
            console.log('   ✗ Output is not valid PNG')
            console.log('   First 200 chars:', buffer.toString('utf-8', 0, 200))
          }
        } else {
          console.log('   ✗ Empty output')
        }
      }
      console.log('')
      console.log('=== 诊断完成 ===')
    })
    
    setTimeout(function () {
      if (chunks.length === 0 && !hasError) {
        console.log('   ✗ Timeout waiting for output')
        console.log('')
        console.log('=== 诊断完成 ===')
      }
    }, 30000)
  } else {
    console.log('   Skipping (testdot failed)')
    console.log('')
    console.log('=== 诊断完成 ===')
  }
})

