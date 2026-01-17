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
var BYTECODER_VERSION = '2023-05-19' // Bytecoder version
var PICOCLI_VERSION = '4.7.5' // Compatible with Bytecoder 2023-05-19
var PICOCLI_JAR = path.join(__dirname, '../vendor/picocli-' + PICOCLI_VERSION + '.jar')
var BYTECODER_CORE_JAR = path.join(__dirname, '../vendor/bytecoder-core-' + BYTECODER_VERSION + '.jar')
var BYTECODER_API_JAR = path.join(__dirname, '../vendor/bytecoder-api-' + BYTECODER_VERSION + '.jar')
var JAVABASE_JAR = path.join(__dirname, '../vendor/java.base-' + BYTECODER_VERSION + '.jar')
var JAVAutil_JAR = path.join(__dirname, '../vendor/java.util-' + BYTECODER_VERSION + '.jar')
// ASM library (required by Bytecoder for bytecode manipulation)
var ASM_VERSION = '9.5' // Compatible with Bytecoder 2023-05-19
var ASM_JAR = path.join(__dirname, '../vendor/asm-' + ASM_VERSION + '.jar')
var ASM_COMMONS_JAR = path.join(__dirname, '../vendor/asm-commons-' + ASM_VERSION + '.jar')
var ASM_TREE_JAR = path.join(__dirname, '../vendor/asm-tree-' + ASM_VERSION + '.jar')
// SLF4J logging library (required by Bytecoder)
var SLF4J_VERSION = '2.0.9' // Compatible with Bytecoder 2023-05-19
var SLF4J_API_JAR = path.join(__dirname, '../vendor/slf4j-api-' + SLF4J_VERSION + '.jar')
var SLF4J_SIMPLE_JAR = path.join(__dirname, '../vendor/slf4j-simple-' + SLF4J_VERSION + '.jar')
// Jackson JSON library (required by Bytecoder)
var JACKSON_VERSION = '2.15.2' // Compatible with Bytecoder 2023-05-19
var JACKSON_CORE_JAR = path.join(__dirname, '../vendor/jackson-core-' + JACKSON_VERSION + '.jar')
var JACKSON_DATABIND_JAR = path.join(__dirname, '../vendor/jackson-databind-' + JACKSON_VERSION + '.jar')
var JACKSON_ANNOTATIONS_JAR = path.join(__dirname, '../vendor/jackson-annotations-' + JACKSON_VERSION + '.jar')
// Apache Commons Lang (required by Bytecoder)
var COMMONS_LANG3_VERSION = '3.12.0' // Compatible with Bytecoder 2023-05-19
var COMMONS_LANG3_JAR = path.join(__dirname, '../vendor/commons-lang3-' + COMMONS_LANG3_VERSION + '.jar')
var POM_FILE = path.join(__dirname, '../pom.xml')

var BUILD_METHOD = process.env.BUILD_METHOD || 'cheerpj' // 'cheerpj' (preferred), 'teavm', 'maven', or 'bytecoder'

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
 * Verify Bytecoder dependencies are available
 * Checks if required JARs exist, and if bytecoder-api classes might be in core/cli
 */
function verifyBytecoderDependencies (callback) {
  // Check required dependencies
  var missing = []
  if (!fs.existsSync(BYTECODER_CORE_JAR)) {
    missing.push('bytecoder-core: ' + BYTECODER_CORE_JAR)
  }
  if (!fs.existsSync(BYTECODER_JAR)) {
    missing.push('bytecoder-cli: ' + BYTECODER_JAR)
  }
  
  if (missing.length > 0) {
    callback(new Error('Missing required Bytecoder dependencies:\n  - ' + missing.join('\n  - ') + '\n\nPlease run: node scripts/build-plantuml-wasm.js'))
    return
  }
  
  // bytecoder-api JAR might not exist, but API classes should be in bytecoder-core or bytecoder-cli
  // This is normal - many Bytecoder distributions include API classes in the core JAR
  if (!fs.existsSync(BYTECODER_API_JAR)) {
    console.log('Note: bytecoder-api JAR not found as separate artifact')
    console.log('  This is OK - API classes should be included in bytecoder-core or bytecoder-cli')
  }
  
  callback(null)
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

  // Check if bytecoder-core exists (required by bytecoder-cli)
  if (!fs.existsSync(BYTECODER_CORE_JAR)) {
    dependencies.push({
      groupId: 'de.mirkosertic.bytecoder',
      artifactId: 'bytecoder-core',
      version: BYTECODER_VERSION,
      outputPath: BYTECODER_CORE_JAR
    })
  }

  // Check if java.base module exists (contains classlib classes like VM)
  // This is a Bytecoder module that provides JRE simulation
  var JAVABASE_JAR = path.join(__dirname, '../vendor/java.base-' + BYTECODER_VERSION + '.jar')
  if (!fs.existsSync(JAVABASE_JAR)) {
    dependencies.push({
      groupId: 'de.mirkosertic.bytecoder',
      artifactId: 'java.base',
      version: BYTECODER_VERSION,
      outputPath: JAVABASE_JAR,
      optional: true // Try to download, might be needed for classlib support
    })
  }

  // Check if java.util module exists (might contain ResourceBundle support)
  var JAVAutil_JAR = path.join(__dirname, '../vendor/java.util-' + BYTECODER_VERSION + '.jar')
  if (!fs.existsSync(JAVAutil_JAR)) {
    dependencies.push({
      groupId: 'de.mirkosertic.bytecoder',
      artifactId: 'java.util',
      version: BYTECODER_VERSION,
      outputPath: JAVAutil_JAR,
      optional: true
    })
  }

  // Check if ASM libraries exist (required by Bytecoder for bytecode manipulation)
  if (!fs.existsSync(ASM_JAR)) {
    dependencies.push({
      groupId: 'org.ow2.asm',
      artifactId: 'asm',
      version: ASM_VERSION,
      outputPath: ASM_JAR
    })
  }
  if (!fs.existsSync(ASM_COMMONS_JAR)) {
    dependencies.push({
      groupId: 'org.ow2.asm',
      artifactId: 'asm-commons',
      version: ASM_VERSION,
      outputPath: ASM_COMMONS_JAR
    })
  }
  if (!fs.existsSync(ASM_TREE_JAR)) {
    dependencies.push({
      groupId: 'org.ow2.asm',
      artifactId: 'asm-tree',
      version: ASM_VERSION,
      outputPath: ASM_TREE_JAR
    })
  }

  // Check if SLF4J libraries exist (required by Bytecoder for logging)
  if (!fs.existsSync(SLF4J_API_JAR)) {
    dependencies.push({
      groupId: 'org.slf4j',
      artifactId: 'slf4j-api',
      version: SLF4J_VERSION,
      outputPath: SLF4J_API_JAR
    })
  }
  if (!fs.existsSync(SLF4J_SIMPLE_JAR)) {
    dependencies.push({
      groupId: 'org.slf4j',
      artifactId: 'slf4j-simple',
      version: SLF4J_VERSION,
      outputPath: SLF4J_SIMPLE_JAR
    })
  }

  // Check if Jackson libraries exist (required by Bytecoder for JSON processing)
  if (!fs.existsSync(JACKSON_CORE_JAR)) {
    dependencies.push({
      groupId: 'com.fasterxml.jackson.core',
      artifactId: 'jackson-core',
      version: JACKSON_VERSION,
      outputPath: JACKSON_CORE_JAR
    })
  }
  if (!fs.existsSync(JACKSON_DATABIND_JAR)) {
    dependencies.push({
      groupId: 'com.fasterxml.jackson.core',
      artifactId: 'jackson-databind',
      version: JACKSON_VERSION,
      outputPath: JACKSON_DATABIND_JAR
    })
  }
  if (!fs.existsSync(JACKSON_ANNOTATIONS_JAR)) {
    dependencies.push({
      groupId: 'com.fasterxml.jackson.core',
      artifactId: 'jackson-annotations',
      version: JACKSON_VERSION,
      outputPath: JACKSON_ANNOTATIONS_JAR
    })
  }

  // Check if Apache Commons Lang3 exists (required by Bytecoder)
  if (!fs.existsSync(COMMONS_LANG3_JAR)) {
    dependencies.push({
      groupId: 'org.apache.commons',
      artifactId: 'commons-lang3',
      version: COMMONS_LANG3_VERSION,
      outputPath: COMMONS_LANG3_JAR
    })
  }

  // Note: bytecoder-api is required at runtime (BytecoderCLI needs Logger class)
  // Try both artifact IDs: bytecoder.api (with dot) first, then bytecoder-api (with dash)
  if (!fs.existsSync(BYTECODER_API_JAR)) {
    // Try bytecoder.api first (this is often the correct artifact ID in Maven Central)
    dependencies.push({
      groupId: 'de.mirkosertic.bytecoder',
      artifactId: 'bytecoder.api',
      version: BYTECODER_VERSION,
      outputPath: BYTECODER_API_JAR,
      optional: false, // This is required, not optional
      fallbackArtifactId: 'bytecoder-api' // If bytecoder.api fails, try bytecoder-api
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
      if (err) {
        if (dep.optional) {
          console.warn('⚠️  Optional dependency download failed: ' + dep.artifactId + ' - ' + err.message)
          console.warn('   This dependency may be included in bytecoder-core or bytecoder-cli JARs')
          // For bytecoder-api, it's OK if it doesn't exist as separate artifact
          // The classes should be in bytecoder-core or bytecoder-cli
        } else {
          if (!hasError) {
            hasError = true
            callback(err)
            return
          }
        }
      } else {
        console.log('✓ ' + dep.artifactId + ' downloaded successfully')
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
  var classpathParts = []
  
  // Bytecoder dependencies order matters: API -> Core -> CLI
  // Note: bytecoder-api classes may be included in bytecoder-core or bytecoder-cli
  // So even if bytecoder-api JAR doesn't exist as separate artifact, we include core/cli
  if (fs.existsSync(BYTECODER_API_JAR)) {
    classpathParts.push(BYTECODER_API_JAR)
  }
  // bytecoder-core is required and should contain API classes if bytecoder-api JAR doesn't exist
  if (!fs.existsSync(BYTECODER_CORE_JAR)) {
    callback(new Error('Bytecoder Core JAR not found: ' + BYTECODER_CORE_JAR + '\nPlease run: node scripts/build-plantuml-wasm.js'))
    return
  }
  classpathParts.push(BYTECODER_CORE_JAR)
  
  // java.base module (contains classlib classes like VM for JRE simulation)
  if (fs.existsSync(JAVABASE_JAR)) {
    classpathParts.push(JAVABASE_JAR)
  }
  
  // java.util module (might contain ResourceBundle support)
  if (fs.existsSync(JAVAutil_JAR)) {
    classpathParts.push(JAVAutil_JAR)
  }
  
  // Then CLI and other dependencies
  if (!fs.existsSync(BYTECODER_JAR)) {
    callback(new Error('Bytecoder CLI JAR not found: ' + BYTECODER_JAR + '\nPlease run: node scripts/build-plantuml-wasm.js'))
    return
  }
  classpathParts.push(BYTECODER_JAR)
  
  // ASM libraries (required by Bytecoder for bytecode manipulation)
  if (fs.existsSync(ASM_JAR)) {
    classpathParts.push(ASM_JAR)
  }
  if (fs.existsSync(ASM_COMMONS_JAR)) {
    classpathParts.push(ASM_COMMONS_JAR)
  }
  if (fs.existsSync(ASM_TREE_JAR)) {
    classpathParts.push(ASM_TREE_JAR)
  }
  
  // SLF4J logging libraries (required by Bytecoder)
  if (fs.existsSync(SLF4J_API_JAR)) {
    classpathParts.push(SLF4J_API_JAR)
  }
  if (fs.existsSync(SLF4J_SIMPLE_JAR)) {
    classpathParts.push(SLF4J_SIMPLE_JAR)
  }
  
  // Jackson JSON libraries (required by Bytecoder)
  if (fs.existsSync(JACKSON_ANNOTATIONS_JAR)) {
    classpathParts.push(JACKSON_ANNOTATIONS_JAR)
  }
  if (fs.existsSync(JACKSON_CORE_JAR)) {
    classpathParts.push(JACKSON_CORE_JAR)
  }
  if (fs.existsSync(JACKSON_DATABIND_JAR)) {
    classpathParts.push(JACKSON_DATABIND_JAR)
  }
  
  // Apache Commons Lang3 (required by Bytecoder)
  if (fs.existsSync(COMMONS_LANG3_JAR)) {
    classpathParts.push(COMMONS_LANG3_JAR)
  }
  
  if (fs.existsSync(PICOCLI_JAR)) {
    classpathParts.push(PICOCLI_JAR)
  }
  // PlantUML JAR is passed as -classpath parameter separately
  var classpath = classpathParts.join(path.delimiter)

  // Method 2: Use compile wasm subcommand with proper arguments (-option=value format)
  // Try to add additional resources and classes that might be needed
  var args2 = [
    '-cp', classpath,
    'de.mirkosertic.bytecoder.cli.BytecoderCLI',
    'compile', 'wasm',
    '-classpath=' + PLANTUML_JAR,
    '-mainclass=net.sourceforge.plantuml.Run',
    '-builddirectory=' + path.join(WASM_DIR, 'build'),
    '-optimizationlevel=DEFAULT', // Use DEFAULT instead of ALL to avoid aggressive optimizations
    '-filenameprefix=plantuml',
    '-debugoutput' // Enable debug output to see what's happening
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
 * TeaVM is more mature than Bytecoder and has better Java SE support
 */
function buildWithTeaVM (callback) {
  console.log('Building PlantUML Wasm module with TeaVM...')
  console.log('TeaVM provides better Java SE compatibility than Bytecoder')
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

  // Run Maven package with TeaVM
  var args = ['clean', 'package', '-DskipTests']

  console.log('Running: mvn ' + args.join(' '))
  console.log('This may take several minutes (downloading TeaVM dependencies)...')
  console.log('')

  var child = childProcess.spawn('mvn', args, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: process.platform === 'win32'
  })

  child.on('close', function (code) {
    if (code === 0) {
      // TeaVM outputs to target/wasm/classes.wasm or similar
      var possibleLocations = [
        path.join(__dirname, '../target/wasm/classes.wasm'),
        path.join(__dirname, '../target/wasm/main.wasm'),
        path.join(__dirname, '../target/classes.wasm'),
        path.join(__dirname, '../target/plantuml.wasm'),
        path.join(__dirname, '../vendor/wasm/plantuml.wasm')
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
        console.log('✓ Wasm module built successfully with TeaVM: ' + WASM_OUTPUT)
        callback(null)
      } else {
        console.error('')
        console.error('✗ Wasm file not found in expected locations')
        console.error('Checked:')
        possibleLocations.forEach(function (loc) {
          console.error('  - ' + loc)
        })
        callback(new Error('TeaVM build completed but Wasm file not found'))
      }
    } else {
      console.error('')
      console.error('✗ TeaVM Maven build failed with exit code: ' + code)
      callback(new Error('TeaVM Maven build failed with exit code: ' + code))
    }
  })

  child.on('error', function (err) {
    console.error('✗ Failed to spawn Maven process:', err.message)
    callback(err)
  })
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
        // Verify all required dependencies are available before building
        verifyBytecoderDependencies(function (err3) {
          if (err3) {
            callback(err3)
            return
          }
          buildWithBytecoder(callback)
        })
      })
    })
  } else if (method === 'cheerpj') {
    // Use CheerpJ (official PlantUML WASM solution - pure Node.js, no Maven)
    var cheerpjBuild = require('./build-plantuml-cheerpj')
    cheerpjBuild.build(callback)
  } else if (method === 'teavm') {
    // Try TeaVM first (preferred - better Java SE support)
    checkMaven(function (err) {
      if (err) {
        console.warn('⚠️  Maven not found, TeaVM requires Maven')
        console.warn('   Install Maven for TeaVM build: https://maven.apache.org/install.html')
        console.warn('   Falling back to Bytecoder CLI...')
        // Fall back to bytecoder
        method = 'bytecoder'
        build(method, callback)
        return
      }
      buildWithTeaVM(callback)
    })
  } else {
    callback(new Error('Unknown build method: ' + method + '. Use: cheerpj (preferred), teavm, maven, or bytecoder'))
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
    console.log('  cheerpj            Use CheerpJ (official PlantUML WASM solution, pure Node.js)')
    console.log('  teavm              Use TeaVM (requires Maven)')
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

module.exports = { build, ensureBytecoder, ensureBytecoderDependencies, verifyBytecoderDependencies, buildWithBytecoder, buildWithMaven, buildWithTeaVM, checkMaven }
