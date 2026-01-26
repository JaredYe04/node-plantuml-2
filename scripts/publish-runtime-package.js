#!/usr/bin/env node
'use strict'

/**
 * Unified script to publish runtime packages (JRE or Graphviz)
 *
 * Usage:
 *   node scripts/publish-runtime-package.js <type> <platform> <arch> [--dry-run] [--version <version>]
 *
 * Examples:
 *   # Publish JRE
 *   node scripts/publish-runtime-package.js jre win32 x64
 *   node scripts/publish-runtime-package.js jre darwin arm64 --version 1.1.4
 *
 *   # Publish Graphviz
 *   node scripts/publish-runtime-package.js graphviz win32 x64
 *   node scripts/publish-runtime-package.js graphviz linux x64 --dry-run
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

var TYPE = process.argv[2]  // 'jre' or 'graphviz'
var PLATFORM = process.argv[3]
var ARCH = process.argv[4]
var DRY_RUN = process.argv.indexOf('--dry-run') !== -1
var VERSION_INDEX = process.argv.indexOf('--version')
var VERSION = VERSION_INDEX !== -1 ? process.argv[VERSION_INDEX + 1] : null

if (!TYPE || !PLATFORM || !ARCH) {
  console.error('Usage: node scripts/publish-runtime-package.js <type> <platform> <arch> [--dry-run] [--version <version>]')
  console.error('')
  console.error('Arguments:')
  console.error('  type      - Package type: "jre" or "graphviz"')
  console.error('  platform  - Platform: win32, darwin, linux')
  console.error('  arch      - Architecture: x64, arm64')
  console.error('')
  console.error('Options:')
  console.error('  --dry-run  - Test without actually publishing')
  console.error('  --version  - Override version (default: read from package.json)')
  console.error('')
  console.error('Examples:')
  console.error('  node scripts/publish-runtime-package.js jre win32 x64')
  console.error('  node scripts/publish-runtime-package.js graphviz darwin arm64 --version 1.1.4')
  console.error('  node scripts/publish-runtime-package.js jre linux x64 --dry-run')
  process.exit(1)
}

// Validate type
if (TYPE !== 'jre' && TYPE !== 'graphviz') {
  console.error('Error: type must be "jre" or "graphviz"')
  process.exit(1)
}

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

var packageDir = path.join(__dirname, '..', 'runtimes', '@node-plantuml-2', TYPE + '-' + PLATFORM + '-' + ARCH)
var packageJsonPath = path.join(packageDir, 'package.json')
var contentDir = path.join(packageDir, TYPE === 'jre' ? 'jre' : 'graphviz')

console.log('')
console.log('='.repeat(60))
console.log('Publishing Runtime Package')
console.log('='.repeat(60))
console.log('Type:', TYPE)
console.log('Platform:', PLATFORM)
console.log('Architecture:', ARCH)
console.log('Directory:', packageDir)
console.log('')

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found at:', packageJsonPath)
  console.error('')
  console.error('Please create package.json first:')
  if (TYPE === 'jre') {
    console.error('  node scripts/create-runtime-package-json.js', PLATFORM, ARCH, '<version>')
  } else {
    console.error('  node scripts/create-graphviz-package-json.js', PLATFORM, ARCH, '<version>')
  }
  process.exit(1)
}

// Check if content directory exists
if (!fs.existsSync(contentDir)) {
  console.error('❌ Error: Content directory not found at:', contentDir)
  console.error('')
  console.error('Please build the package first:')
  if (TYPE === 'jre') {
    console.error('  node scripts/build-jre.js', PLATFORM, ARCH)
  } else {
    console.error('  node scripts/build-graphviz.js', PLATFORM, ARCH)
  }
  process.exit(1)
}

// Read package.json
var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
var packageName = packageJson.name
var currentVersion = packageJson.version

// Override version if specified
if (VERSION) {
  packageJson.version = VERSION
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log('✓ Updated version to:', VERSION)
  console.log('')
}

var versionToPublish = VERSION || currentVersion

console.log('Package:', packageName)
console.log('Version:', versionToPublish)
console.log('')

// Verify content
console.log('Verifying package contents...')
if (TYPE === 'jre') {
  var javaExe = path.join(contentDir, 'bin', PLATFORM === 'win32' ? 'java.exe' : 'java')
  if (!fs.existsSync(javaExe)) {
    console.error('❌ Error: Java executable not found at:', javaExe)
    process.exit(1)
  }
  console.log('✓ Java executable found:', javaExe)
  
  // Test Java works
  try {
    var javaTest = childProcess.spawnSync(javaExe, ['-version'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000
    })
    if (javaTest.status === 0 || javaTest.stderr || javaTest.stdout) {
      console.log('✓ Java executable works')
    } else {
      console.error('❌ Error: Java executable does not work')
      process.exit(1)
    }
  } catch (e) {
    console.error('❌ Error: Could not test Java executable:', e.message)
    process.exit(1)
  }
} else {
  // For Graphviz, use the dedicated verification script
  console.log('Running comprehensive Graphviz verification...')
  var verifyScript = path.join(__dirname, 'verify-graphviz-package.js')
  var verifyResult = childProcess.spawnSync('node', [verifyScript, PLATFORM, ARCH, packageDir], {
    encoding: 'utf-8',
    stdio: 'inherit'
  })
  
  if (verifyResult.status !== 0) {
    console.error('❌ Error: Graphviz package verification failed')
    process.exit(1)
  }
  
  console.log('✓ Graphviz package verification passed')
}

// Check package size
var packageSize = calculateDirectorySize(contentDir)
var packageSizeMB = (packageSize / 1024 / 1024).toFixed(2)
console.log('✓ Package size:', packageSizeMB, 'MB')
console.log('')

if (DRY_RUN) {
  console.log('DRY RUN - Not actually publishing')
  console.log('')
  console.log('Would run:')
  console.log('  cd', packageDir)
  console.log('  npm publish --access public')
  console.log('')
  console.log('Package:', packageName + '@' + versionToPublish)
  process.exit(0)
}

// Configure npm authentication if NODE_AUTH_TOKEN is available
var nodeAuthToken = process.env.NODE_AUTH_TOKEN
if (nodeAuthToken) {
  console.log('Configuring npm authentication from NODE_AUTH_TOKEN...')
  // Use npm config set to configure authentication token
  // This works on all platforms and handles .npmrc location automatically
  var registryUrl = 'https://registry.npmjs.org/'
  var configKey = '//registry.npmjs.org/:_authToken'  // Use // prefix for better compatibility
  
  try {
    var configResult = childProcess.spawnSync('npm', ['config', 'set', configKey, nodeAuthToken], {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: Object.assign({}, process.env, { NODE_AUTH_TOKEN: nodeAuthToken }),
      shell: os.platform() === 'win32'  // Use shell on Windows for better compatibility
    })
    
    if (configResult.status === 0) {
      console.log('✓ npm authentication configured')
    } else {
      console.error('⚠️  Warning: Could not configure npm authentication via npm config')
      if (configResult.stderr) {
        console.error('   Error:', configResult.stderr.trim())
      }
      if (configResult.stdout) {
        console.error('   Output:', configResult.stdout.trim())
      }
      // Fallback: try to write .npmrc directly
      try {
        var npmrcPath = path.join(os.homedir(), '.npmrc')
        // On Windows, also try USERPROFILE if HOME is not set
        if (os.platform() === 'win32' && !process.env.HOME) {
          npmrcPath = path.join(process.env.USERPROFILE || os.homedir(), '.npmrc')
        }
        var authLine = '//registry.npmjs.org/:_authToken=' + nodeAuthToken + '\n'
        var existingContent = ''
        if (fs.existsSync(npmrcPath)) {
          existingContent = fs.readFileSync(npmrcPath, 'utf8')
        }
        var lines = existingContent.split('\n')
        var filteredLines = lines.filter(function (line) {
          // Remove any existing auth token lines for this registry
          return !line.includes('//registry.npmjs.org/:_authToken') && 
                 !line.includes('registry.npmjs.org/:_authToken')
        })
        filteredLines.push(authLine.trim())
        fs.writeFileSync(npmrcPath, filteredLines.join('\n') + '\n')
        console.log('✓ npm authentication configured (fallback method)')
        console.log('   .npmrc location:', npmrcPath)
      } catch (e) {
        console.error('⚠️  Warning: Could not write .npmrc file:', e.message)
        console.error('   File path attempted:', npmrcPath)
        console.error('   Continuing anyway...')
      }
    }
  } catch (e) {
    console.error('⚠️  Warning: Could not configure npm authentication:', e.message)
    console.error('   Continuing anyway...')
  }
  console.log('')
}

// Check if logged in to npm
console.log('Checking npm login status...')
var loginCheckEnv = {}
if (nodeAuthToken) {
  loginCheckEnv.NODE_AUTH_TOKEN = nodeAuthToken
}
var loginCheck = childProcess.spawnSync('npm', ['whoami'], {
  encoding: 'utf-8',
  stdio: 'pipe',
  env: Object.assign({}, process.env, loginCheckEnv)
})

if (loginCheck.status !== 0) {
  console.error('❌ Error: Not logged in to npm')
  if (loginCheck.stderr) {
    console.error('Error details:', loginCheck.stderr.trim())
  }
  if (loginCheck.stdout) {
    console.error('Output:', loginCheck.stdout.trim())
  }
  console.error('')
  console.error('Troubleshooting:')
  console.error('  1. Ensure NODE_AUTH_TOKEN environment variable is set')
  console.error('  2. Check that .npmrc file exists and contains authentication token')
  console.error('  3. Try running: npm login')
  process.exit(1)
}

console.log('✓ Logged in as:', loginCheck.stdout.trim())
console.log('')

// Check if version already exists
console.log('Checking if version already exists on npm...')
var checkVersionEnv = {}
if (nodeAuthToken) {
  checkVersionEnv.NODE_AUTH_TOKEN = nodeAuthToken
}
var checkVersion = childProcess.spawnSync('npm', ['view', packageName + '@' + versionToPublish, 'version'], {
  encoding: 'utf-8',
  stdio: 'pipe',
  env: Object.assign({}, process.env, checkVersionEnv)
})

if (checkVersion.status === 0) {
  var existingVersion = checkVersion.stdout.trim()
  if (existingVersion === versionToPublish) {
    console.log('⚠️  Warning: Version', versionToPublish, 'already exists on npm')
    console.log('')
    console.log('Options:')
    console.log('  1. Increment version in package.json')
    console.log('  2. Use --version flag to specify a new version')
    console.log('  3. Continue anyway (will fail if version is exact match)')
    console.log('')
    process.exit(1)
  }
}

console.log('✓ Version', versionToPublish, 'is available')
console.log('')

// Publish
console.log('Publishing package...')
console.log('')
var publishEnv = {}
if (nodeAuthToken) {
  publishEnv.NODE_AUTH_TOKEN = nodeAuthToken
}
var publishProcess = childProcess.spawn('npm', ['publish', '--access', 'public'], {
  cwd: packageDir,
  stdio: 'inherit',
  shell: true,
  env: Object.assign({}, process.env, publishEnv)
})

publishProcess.on('close', function (code) {
  if (code === 0) {
    console.log('')
    console.log('='.repeat(60))
    console.log('✅ Package published successfully!')
    console.log('='.repeat(60))
    console.log('Package:', packageName + '@' + versionToPublish)
    console.log('')
    console.log('Next steps:')
    console.log('  1. Verify on npm: npm view', packageName)
    console.log('  2. Test installation: npm install', packageName + '@' + versionToPublish)
    console.log('  3. Update main package.json optionalDependencies if needed')
  } else {
    console.error('')
    console.error('❌ Publish failed with exit code:', code)
    process.exit(1)
  }
})

publishProcess.on('error', function (err) {
  console.error('❌ Error publishing:', err.message)
  process.exit(1)
})

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

