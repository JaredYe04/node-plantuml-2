#!/usr/bin/env node
'use strict'

/**
 * Build script for converting PlantUML JAR to WebAssembly
 *
 * This script uses Bytecoder or TeaVM to compile PlantUML JAR to Wasm
 *
 * Prerequisites:
 * - Java runtime installed
 * - PlantUML JAR downloaded to vendor/plantuml.jar
 * - Bytecoder CLI or TeaVM Maven plugin
 */

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')

var PLANTUML_JAR = path.join(__dirname, '../vendor/plantuml.jar')
var WASM_DIR = path.join(__dirname, '../vendor/wasm')
var WASM_OUTPUT = path.join(WASM_DIR, 'plantuml.wasm')
// Bytecoder CLI - try to get latest from GitHub API
var BYTECODER_GITHUB_API = 'https://api.github.com/repos/mirkosertic/Bytecoder/releases/latest'
var BYTECODER_JAR = path.join(__dirname, '../vendor/bytecoder-cli.jar')
// Bytecoder CLI dependencies
var PICOCLI_VERSION = '4.7.5' // Compatible with Bytecoder 2023-05-19
var PICOCLI_JAR = path.join(__dirname, '../vendor/picocli-' + PICOCLI_VERSION + '.jar')
var POM_FILE = path.join(__dirname, '../pom.xml')

var BUILD_METHOD = process.env.BUILD_METHOD || 'maven' // 'maven' (preferred), 'bytecoder', or 'teavm'

/**
 * Get latest Bytecoder CLI download URL
 * Uses Maven Central as primary source (more reliable than GitHub releases)
 */
function getBytecoderDownloadUrl (callback) {
  var https = require('https')

  // Maven Central is more reliable for JAR downloads
  // Format: https://repo1.maven.org/maven2/de/mirkosertic/bytecoder/bytecoder-cli/{version}/bytecoder-cli-{version}.jar
  var mavenVersions = [
    '2023-05-19', // Latest confirmed available version
    '2023-12-01',
    '2023-11-15',
    '2023-06-15',
    '2023-04-05',
    '2023-03-28'
  ]

  console.log('Fetching latest Bytecoder version from GitHub...')

  // First, get the latest release tag from GitHub
  https.get(BYTECODER_GITHUB_API, {
    headers: {
      'User-Agent': 'node-plantuml-builder'
    }
  }, function (res) {
    var data = ''
    res.on('data', function (chunk) { data += chunk })
    res.on('end', function () {
      var versionToUse = mavenVersions[0] // Default to latest known version

      if (res.statusCode === 200) {
        try {
          var release = JSON.parse(data)
          var tagName = release.tag_name
          console.log('Found latest release tag: ' + tagName)

          // Check if this version is in our known list
          if (mavenVersions.indexOf(tagName) !== -1) {
            versionToUse = tagName
          } else {
            console.warn('Release tag ' + tagName + ' not in known versions, using ' + versionToUse)
          }
        } catch (e) {
          console.warn('Failed to parse GitHub API response: ' + e.message)
        }
      } else {
        console.warn('GitHub API returned status ' + res.statusCode + ', using known version')
      }

      // Use Maven Central URL
      var mavenUrl = 'https://repo1.maven.org/maven2/de/mirkosertic/bytecoder/bytecoder-cli/' + versionToUse + '/bytecoder-cli-' + versionToUse + '.jar'
      console.log('Using Maven Central URL: ' + mavenUrl)

      // Verify the URL works by trying to download
      verifyUrl(mavenUrl, mavenVersions, 0, callback)
    })
  }).on('error', function (err) {
    console.warn('Failed to fetch from GitHub API: ' + err.message)
    console.warn('Using Maven Central with known version')
    var mavenUrl = 'https://repo1.maven.org/maven2/de/mirkosertic/bytecoder/bytecoder-cli/' + mavenVersions[0] + '/bytecoder-cli-' + mavenVersions[0] + '.jar'
    verifyUrl(mavenUrl, mavenVersions, 0, callback)
  })
}

/**
 * Verify URL exists and try fallbacks if needed
 */
function verifyUrl (url, versions, index, callback) {
  var https = require('https')

  console.log('Verifying URL: ' + url)

  https.get(url, {
    headers: {
      'User-Agent': 'node-plantuml-builder'
    }
  }, function (res) {
    if (res.statusCode === 200) {
      console.log('✓ URL verified successfully')
      callback(null, url)
    } else if (index < versions.length - 1) {
      // Try next version
      console.warn('URL returned status ' + res.statusCode + ', trying next version...')
      var nextUrl = 'https://repo1.maven.org/maven2/de/mirkosertic/bytecoder/bytecoder-cli/' + versions[index + 1] + '/bytecoder-cli-' + versions[index + 1] + '.jar'
      verifyUrl(nextUrl, versions, index + 1, callback)
    } else {
      // All versions failed
      callback(new Error('All Maven Central URLs failed. Last status: ' + res.statusCode))
    }
  }).on('error', function (err) {
    if (index < versions.length - 1) {
      console.warn('URL failed: ' + err.message + ', trying next version...')
      var nextUrl = 'https://repo1.maven.org/maven2/de/mirkosertic/bytecoder/bytecoder-cli/' + versions[index + 1] + '/bytecoder-cli-' + versions[index + 1] + '.jar'
      verifyUrl(nextUrl, versions, index + 1, callback)
    } else {
      callback(err)
    }
  })
}

/**
 * Download a JAR from Maven Central
 */
function downloadMavenJar (groupId, artifactId, version, outputPath, callback) {
  var download = require('./download')
  // Convert groupId to path (e.g., "de.mirkosertic.bytecoder" -> "de/mirkosertic/bytecoder")
  var groupPath = groupId.replace(/\./g, '/')
  var mavenUrl = 'https://repo1.maven.org/maven2/' + groupPath + '/' + artifactId + '/' + version + '/' + artifactId + '-' + version + '.jar'

  console.log('Downloading ' + artifactId + ' from Maven Central...')
  console.log('URL: ' + mavenUrl)

  download(mavenUrl, outputPath, false, function (downloadErr) {
    if (downloadErr) {
      callback(downloadErr)
    } else {
      console.log('✓ ' + artifactId + ' downloaded: ' + outputPath)
      callback(null)
    }
  })
}

/**
 * Download Bytecoder CLI dependencies (picocli, etc.)
 */
function ensureBytecoderDependencies (callback) {
  var download = require('./download')
  var dependencies = []

  // Check if picocli exists
  if (!fs.existsSync(PICOCLI_JAR)) {
    dependencies.push({
      groupId: 'info.picocli',
      artifactId: 'picocli',
      version: PICOCLI_VERSION,
      outputPath: PICOCLI_JAR
    })
  }

  if (dependencies.length === 0) {
    callback(null)
    return
  }

  console.log('Downloading Bytecoder CLI dependencies...')
  var remaining = dependencies.length
  var hasError = false

  dependencies.forEach(function (dep) {
    downloadMavenJar(dep.groupId, dep.artifactId, dep.version, dep.outputPath, function (err) {
      if (err && !hasError) {
        hasError = true
        callback(err)
        return
      }
      remaining--
      if (remaining === 0 && !hasError) {
        callback(null)
      }
    })
  })
}

/**
 * Download Bytecoder CLI if not exists
 */
function ensureBytecoder (callback) {
  if (fs.existsSync(BYTECODER_JAR)) {
    console.log('Bytecoder CLI found: ' + BYTECODER_JAR)
    callback(null)
    return
  }

  console.log('Downloading Bytecoder CLI...')
  var download = require('./download')

  getBytecoderDownloadUrl(function (err, downloadUrl) {
    if (err) {
      callback(err)
      return
    }

    console.log('Downloading from: ' + downloadUrl)
    download(downloadUrl, BYTECODER_JAR, false, function (downloadErr) {
      if (downloadErr) {
        console.error('Failed to download Bytecoder CLI:', downloadErr.message)
        callback(downloadErr)
      } else {
        console.log('✓ Bytecoder CLI downloaded: ' + BYTECODER_JAR)
        callback(null)
      }
    })
  })
}

/**
 * Build Wasm using Bytecoder
 */
function buildWithBytecoder (callback) {
  console.log('Building PlantUML Wasm module with Bytecoder...')
  console.log('JAR: ' + PLANTUML_JAR)
  console.log('Output: ' + WASM_OUTPUT)

  if (!fs.existsSync(PLANTUML_JAR)) {
    callback(new Error('PlantUML JAR not found: ' + PLANTUML_JAR + '\nPlease run: node scripts/get-plantuml-jar.js'))
    return
  }

  // Create output directory
  if (!fs.existsSync(WASM_DIR)) {
    fs.mkdirSync(WASM_DIR, { recursive: true })
  }

  // Try different ways to run Bytecoder
  // Method 1: Try as executable JAR
  var args1 = [
    '-jar', BYTECODER_JAR,
    '-classpath', PLANTUML_JAR,
    '-mainclass', 'net.sourceforge.plantuml.Run',
    '-builddirectory', path.join(WASM_DIR, 'build'),
    '-backend', 'wasm',
    '-minify', 'true'
  ]

  // Method 2: Try with -cp (classpath) including dependencies
  // Build classpath with all required JARs
  var classpathParts = [BYTECODER_JAR]
  if (fs.existsSync(PICOCLI_JAR)) {
    classpathParts.push(PICOCLI_JAR)
  }
  classpathParts.push(PLANTUML_JAR)
  var classpath = classpathParts.join(path.delimiter)

  var args2 = [
    '-cp', classpath,
    'de.mirkosertic.bytecoder.cli.BytecoderCLI',
    '-classpath', PLANTUML_JAR,
    '-mainclass', 'net.sourceforge.plantuml.Run',
    '-builddirectory', path.join(WASM_DIR, 'build'),
    '-backend', 'wasm',
    '-minify', 'true'
  ]

  console.log('Attempting Method 1: java -jar...')
  console.log('Running: java ' + args1.join(' '))

  var child = childProcess.spawn('java', args1, {
    stdio: 'inherit',
    cwd: __dirname,
    shell: process.platform === 'win32'
  })

  child.on('close', function (code) {
    if (code === 0) {
      // Check for output
      var builtWasm = path.join(WASM_DIR, 'build', 'plantuml.wasm')
      if (fs.existsSync(builtWasm)) {
        // Move to final location
        if (fs.existsSync(WASM_OUTPUT)) {
          fs.unlinkSync(WASM_OUTPUT)
        }
        fs.renameSync(builtWasm, WASM_OUTPUT)
        console.log('✓ Wasm module built successfully: ' + WASM_OUTPUT)
        callback(null)
      } else {
        console.error('✗ Wasm file not found in build directory')
        callback(new Error('Build failed: Wasm file not generated'))
      }
    } else {
      // Try Method 2 if Method 1 failed
      console.log('')
      console.log('Method 1 failed, trying Method 2: java -cp...')
      console.log('Running: java ' + args2.join(' '))

      var child2 = childProcess.spawn('java', args2, {
        stdio: 'inherit',
        cwd: __dirname,
        shell: process.platform === 'win32'
      })

      child2.on('close', function (code2) {
        if (code2 === 0) {
          var builtWasm2 = path.join(WASM_DIR, 'build', 'plantuml.wasm')
          if (fs.existsSync(builtWasm2)) {
            if (fs.existsSync(WASM_OUTPUT)) {
              fs.unlinkSync(WASM_OUTPUT)
            }
            fs.renameSync(builtWasm2, WASM_OUTPUT)
            console.log('✓ Wasm module built successfully: ' + WASM_OUTPUT)
            callback(null)
          } else {
            console.error('✗ Wasm file not found in build directory')
            callback(new Error('Build failed: Wasm file not generated'))
          }
        } else {
          console.error('✗ Both methods failed')
          console.error('')
          console.error('Note: Bytecoder CLI may require Maven project setup.')
          console.error('For now, Wasm build is experimental and may not work with all PlantUML versions.')
          console.error('You can still use the Java executor by not setting PLANTUML_USE_WASM=true')
          callback(new Error('Build failed: Both execution methods failed'))
        }
      })

      child2.on('error', function (err) {
        console.error('✗ Method 2 also failed:', err.message)
        callback(err)
      })
    }
  })

  child.on('error', function (err) {
    console.error('✗ Failed to spawn Java process:', err.message)
    callback(err)
  })
}

/**
 * Check if Maven is available
 */
function checkMaven (callback) {
  childProcess.exec('mvn -version', function (err, stdout, stderr) {
    if (err) {
      callback(new Error('Maven not found'))
      return
    }
    console.log('✓ Maven found')
    console.log(stdout.split('\n')[0]) // Print Maven version
    callback(null)
  })
}

/**
 * Build Wasm using Maven (preferred method - handles all dependencies automatically)
 */
function buildWithMaven (callback) {
  console.log('Building PlantUML Wasm module with Maven...')
  console.log('This may take several minutes on first run (downloading dependencies)...')
  console.log('')

  if (!fs.existsSync(POM_FILE)) {
    callback(new Error('pom.xml not found: ' + POM_FILE))
    return
  }

  if (!fs.existsSync(PLANTUML_JAR)) {
    callback(new Error('PlantUML JAR not found: ' + PLANTUML_JAR + '\nPlease run: node scripts/get-plantuml-jar.js'))
    return
  }

  // Create output directory
  if (!fs.existsSync(WASM_DIR)) {
    fs.mkdirSync(WASM_DIR, { recursive: true })
  }

  // Run Maven package
  var args = ['clean', 'package', '-DskipTests']

  console.log('Running: mvn ' + args.join(' '))
  console.log('')

  var child = childProcess.spawn('mvn', args, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: process.platform === 'win32'
  })

  child.on('close', function (code) {
    if (code === 0) {
      // Check if Wasm file was generated
      // Bytecoder may output to different locations, check common ones
      var possibleLocations = [
        path.join(__dirname, '../vendor/wasm/plantuml.wasm'),
        path.join(__dirname, '../target/plantuml.wasm'),
        path.join(__dirname, '../target/wasm/plantuml.wasm')
      ]

      var foundWasm = null
      for (var i = 0; i < possibleLocations.length; i++) {
        if (fs.existsSync(possibleLocations[i])) {
          foundWasm = possibleLocations[i]
          break
        }
      }

      if (foundWasm) {
        // Copy to final location
        if (fs.existsSync(WASM_OUTPUT)) {
          fs.unlinkSync(WASM_OUTPUT)
        }
        if (foundWasm !== WASM_OUTPUT) {
          fs.copyFileSync(foundWasm, WASM_OUTPUT)
        }
        console.log('')
        console.log('✓ Wasm module built successfully: ' + WASM_OUTPUT)
        callback(null)
      } else {
        console.error('')
        console.error('✗ Wasm file not found in expected locations')
        console.error('Checked:')
        possibleLocations.forEach(function (loc) {
          console.error('  - ' + loc)
        })
        callback(new Error('Build completed but Wasm file not found'))
      }
    } else {
      console.error('')
      console.error('✗ Maven build failed with exit code: ' + code)
      callback(new Error('Maven build failed with exit code: ' + code))
    }
  })

  child.on('error', function (err) {
    console.error('✗ Failed to spawn Maven process:', err.message)
    callback(err)
  })
}

/**
 * Build Wasm using TeaVM (Maven-based)
 */
function buildWithTeaVM (callback) {
  console.log('Building PlantUML Wasm module with TeaVM...')
  console.log('Note: TeaVM build requires Maven and pom.xml configuration')

  // TODO: Implement TeaVM build
  // This requires:
  // 1. Create Maven project structure
  // 2. Configure TeaVM Maven plugin
  // 3. Run Maven build
  // 4. Extract generated Wasm file

  callback(new Error('TeaVM build not implemented yet. Use --method maven or bytecoder'))
}

/**
 * Main build function
 */
function build (method, callback) {
  if (method === 'maven') {
    // Try Maven first (preferred - handles all dependencies automatically)
    checkMaven(function (err) {
      if (err) {
        console.warn('⚠️  Maven not found, falling back to Bytecoder CLI...')
        console.warn('   Install Maven for better dependency handling: https://maven.apache.org/install.html')
        console.warn('')
        // Fall back to bytecoder
        method = 'bytecoder'
        build(method, callback)
        return
      }
      buildWithMaven(callback)
    })
  } else if (method === 'bytecoder') {
    // Download Bytecoder CLI and its dependencies
    ensureBytecoder(function (err) {
      if (err) {
        callback(err)
        return
      }
      ensureBytecoderDependencies(function (err2) {
        if (err2) {
          callback(err2)
          return
        }
        buildWithBytecoder(callback)
      })
    })
  } else if (method === 'teavm') {
    buildWithTeaVM(callback)
  } else {
    callback(new Error('Unknown build method: ' + method + '. Use: maven, bytecoder, or teavm'))
  }
}

// Command line execution
if (require.main === module) {
  var method = BUILD_METHOD
  var args = process.argv.slice(2)

  if (args.indexOf('--method') !== -1) {
    var idx = args.indexOf('--method')
    method = args[idx + 1] || method
  }

  if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
    console.log('Usage: node scripts/build-plantuml-wasm.js [options]')
    console.log('')
    console.log('Options:')
    console.log('  --method <method>  Build method: maven (default, preferred), bytecoder, or teavm')
    console.log('  -h, --help         Show this help message')
    console.log('')
    console.log('Build methods:')
    console.log('  maven              Use Maven (recommended - handles all dependencies automatically)')
    console.log('  bytecoder          Use Bytecoder CLI (requires downloading dependencies manually)')
    console.log('  teavm              Use TeaVM (not implemented yet)')
    console.log('')
    console.log('Environment variables:')
    console.log('  BUILD_METHOD       Build method to use (maven, bytecoder, or teavm)')
    process.exit(0)
  }

  build(method, function (err) {
    if (err) {
      console.error('Build failed:', err.message)
      process.exit(1)
    }
  })
}

module.exports = { build, ensureBytecoder, ensureBytecoderDependencies, buildWithBytecoder, buildWithMaven, buildWithTeaVM, checkMaven }
