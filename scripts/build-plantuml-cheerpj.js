#!/usr/bin/env node
'use strict'

/**
 * Build PlantUML WASM using CheerpJ (Official PlantUML WASM solution)
 * 
 * This uses the official plantuml-core project which uses CheerpJ
 * to compile PlantUML to pure JavaScript + WebAssembly
 * 
 * No Maven required - pure Node.js solution
 */

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')
var https = require('https')

var VENDOR_DIR = path.join(__dirname, '../vendor')
var WASM_DIR = path.join(__dirname, '../vendor/wasm')
var PLANTUML_CORE_REPO = 'https://github.com/plantuml/plantuml-core'
var PLANTUML_CORE_DIR = path.join(VENDOR_DIR, 'plantuml-core')
var PLANTUML_CORE_JAR = path.join(PLANTUML_CORE_DIR, 'plantuml-core.jar')
var PLANTUML_CORE_JS = path.join(WASM_DIR, 'plantuml-core.js')
var PLANTUML_CORE_WASM = path.join(WASM_DIR, 'plantuml-core.wasm')

/**
 * Check if git is available
 */
function checkGit (callback) {
  childProcess.exec('git --version', function (err) {
    if (err) {
      callback(new Error('Git not found. Please install Git: https://git-scm.com/'))
      return
    }
    console.log('✓ Git found')
    callback(null)
  })
}

/**
 * Clone or update plantuml-core repository
 */
function ensurePlantUMLCore (callback) {
  if (fs.existsSync(PLANTUML_CORE_DIR)) {
    console.log('PlantUML-core repository found, updating...')
    var child = childProcess.spawn('git', ['pull'], {
      cwd: PLANTUML_CORE_DIR,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    
    child.on('close', function (code) {
      if (code === 0) {
        console.log('✓ PlantUML-core updated')
        callback(null)
      } else {
        console.warn('⚠️  Git pull failed, but continuing with existing code')
        callback(null)
      }
    })
    
    child.on('error', function (err) {
      console.warn('⚠️  Git pull error:', err.message, '- continuing with existing code')
      callback(null)
    })
  } else {
    console.log('Cloning PlantUML-core repository...')
    console.log('This may take a few minutes...')
    
    // Create vendor directory if it doesn't exist
    if (!fs.existsSync(VENDOR_DIR)) {
      fs.mkdirSync(VENDOR_DIR, { recursive: true })
    }
    
    var child = childProcess.spawn('git', ['clone', PLANTUML_CORE_REPO, PLANTUML_CORE_DIR], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    
    child.on('close', function (code) {
      if (code === 0) {
        console.log('✓ PlantUML-core cloned')
        callback(null)
      } else {
        callback(new Error('Failed to clone PlantUML-core repository'))
      }
    })
    
    child.on('error', function (err) {
      callback(new Error('Failed to clone PlantUML-core: ' + err.message))
    })
  }
}

/**
 * Check if plantuml-core.jar exists or needs to be built
 */
function checkPlantUMLCoreJar (callback) {
  if (fs.existsSync(PLANTUML_CORE_JAR)) {
    console.log('✓ PlantUML-core JAR found: ' + PLANTUML_CORE_JAR)
    callback(null)
    return
  }
  
  console.log('PlantUML-core JAR not found')
  console.log('Checking if we need to build it...')
  
  // Check if there's a build script
  var buildScript = path.join(PLANTUML_CORE_DIR, 'build.sh')
  var buildScriptWin = path.join(PLANTUML_CORE_DIR, 'build.bat')
  
  if (fs.existsSync(buildScript) || fs.existsSync(buildScriptWin)) {
    console.log('Found build script, but building requires CheerpJ setup')
    console.log('Please follow instructions at: https://github.com/plantuml/plantuml-core')
    callback(new Error('PlantUML-core JAR not found and build requires CheerpJ setup'))
  } else {
    // Try to download pre-built JAR from releases
    console.log('Attempting to download pre-built JAR from GitHub releases...')
    downloadPrebuiltJAR(callback)
  }
}

/**
 * Download pre-built JAR from GitHub releases
 */
function downloadPrebuiltJAR (callback) {
  // Try to get latest release
  var apiUrl = 'https://api.github.com/repos/plantuml/plantuml-core/releases/latest'
  
  https.get(apiUrl, {
    headers: {
      'User-Agent': 'node-plantuml-2-builder'
    }
  }, function (res) {
    var data = ''
    res.on('data', function (chunk) { data += chunk })
    res.on('end', function () {
      if (res.statusCode === 200) {
        try {
          var release = JSON.parse(data)
          // Look for plantuml-core.jar in assets
          var jarAsset = release.assets.find(function (asset) {
            return asset.name === 'plantuml-core.jar' || asset.name.endsWith('.jar')
          })
          
          if (jarAsset) {
            console.log('Found release asset: ' + jarAsset.name)
            console.log('Downloading from: ' + jarAsset.browser_download_url)
            
            var download = require('./download')
            download(jarAsset.browser_download_url, PLANTUML_CORE_JAR, false, function (err) {
              if (err) {
                callback(err)
              } else {
                console.log('✓ PlantUML-core JAR downloaded')
                callback(null)
              }
            })
          } else {
            callback(new Error('No JAR asset found in latest release'))
          }
        } catch (e) {
          callback(new Error('Failed to parse GitHub API response: ' + e.message))
        }
      } else {
        callback(new Error('GitHub API returned status ' + res.statusCode))
      }
    })
  }).on('error', function (err) {
    callback(new Error('Failed to fetch GitHub releases: ' + err.message))
  })
}

/**
 * Copy or link the built files to vendor/wasm
 */
function copyWasmFiles (callback) {
  // Create wasm directory
  if (!fs.existsSync(WASM_DIR)) {
    fs.mkdirSync(WASM_DIR, { recursive: true })
  }
  
  // Look for built files in plantuml-core directory
  var possibleJsFiles = [
    path.join(PLANTUML_CORE_DIR, 'docs', 'plantuml-core.jar.js'), // Found in docs directory
    path.join(PLANTUML_CORE_DIR, 'plantuml-core.jar.js'),
    path.join(PLANTUML_CORE_DIR, 'dist', 'plantuml-core.js'),
    path.join(PLANTUML_CORE_DIR, 'build', 'plantuml-core.js'),
    path.join(PLANTUML_CORE_DIR, 'plantuml-core', 'dist', 'plantuml-core.js')
  ]
  
  var possibleWasmFiles = [
    path.join(PLANTUML_CORE_DIR, 'docs', 'plantuml-core.wasm'),
    path.join(PLANTUML_CORE_DIR, 'plantuml-core.wasm'),
    path.join(PLANTUML_CORE_DIR, 'dist', 'plantuml-core.wasm'),
    path.join(PLANTUML_CORE_DIR, 'build', 'plantuml-core.wasm'),
    path.join(PLANTUML_CORE_DIR, 'plantuml-core', 'dist', 'plantuml-core.wasm')
  ]
  
  var foundJs = null
  var foundWasm = null
  
  for (var i = 0; i < possibleJsFiles.length; i++) {
    if (fs.existsSync(possibleJsFiles[i])) {
      foundJs = possibleJsFiles[i]
      break
    }
  }
  
  for (var j = 0; j < possibleWasmFiles.length; j++) {
    if (fs.existsSync(possibleWasmFiles[j])) {
      foundWasm = possibleWasmFiles[j]
      break
    }
  }
  
  if (foundJs) {
    fs.copyFileSync(foundJs, PLANTUML_CORE_JS)
    console.log('✓ Copied JS file: ' + PLANTUML_CORE_JS)
  }
  
  if (foundWasm) {
    fs.copyFileSync(foundWasm, PLANTUML_CORE_WASM)
    console.log('✓ Copied WASM file: ' + PLANTUML_CORE_WASM)
  }
  
  if (foundJs || foundWasm) {
    callback(null)
  } else {
    console.warn('⚠️  No built JS/WASM files found in plantuml-core directory')
    console.warn('   You may need to build plantuml-core using CheerpJ')
    console.warn('   See: https://github.com/plantuml/plantuml-core')
    callback(null) // Don't fail, just warn
  }
}

/**
 * Main build function
 */
function build (callback) {
  console.log('Building PlantUML WASM using CheerpJ (official solution)...')
  console.log('')
  
  checkGit(function (err) {
    if (err) {
      callback(err)
      return
    }
    
    ensurePlantUMLCore(function (err2) {
      if (err2) {
        callback(err2)
        return
      }
      
      checkPlantUMLCoreJar(function (err3) {
        if (err3) {
          console.warn('⚠️  ' + err3.message)
          console.warn('   Continuing to check for pre-built WASM files...')
        }
        
        copyWasmFiles(function (err4) {
          if (err4) {
            callback(err4)
          } else {
            console.log('')
            console.log('✓ Build process completed')
            console.log('')
            console.log('Note: If WASM files were not found, you may need to:')
            console.log('  1. Install CheerpJ: https://cheerpj.com/')
            console.log('  2. Build plantuml-core: cd vendor/plantuml-core && ./build.sh')
            console.log('  3. Or use pre-built files from: https://github.com/plantuml/plantuml-core/releases')
            callback(null)
          }
        })
      })
    })
  })
}

// Command line execution
if (require.main === module) {
  build(function (err) {
    if (err) {
      console.error('Build failed:', err.message)
      process.exit(1)
    }
  })
}

module.exports = { build }

