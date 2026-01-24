#!/usr/bin/env node
'use strict'

/**
 * Cross-platform Graphviz installation script
 * Attempts to automatically install Graphviz on Windows, Linux, and macOS
 */

var os = require('os')
var childProcess = require('child_process')
var dotResolver = require('../lib/dot-resolver')

var platform = os.platform()
var isWindows = platform === 'win32'
var isMac = platform === 'darwin'
var isLinux = platform === 'linux'

/**
 * Check if a command exists
 */
function commandExists (command) {
  try {
    if (isWindows) {
      childProcess.execSync('where ' + command + ' >nul 2>&1', { stdio: 'ignore' })
    } else {
      childProcess.execSync('which ' + command + ' > /dev/null 2>&1', { stdio: 'ignore' })
    }
    return true
  } catch (e) {
    return false
  }
}

/**
 * Execute command and return result
 */
function execCommand (command, args, options) {
  return new Promise(function (resolve, reject) {
    var child = childProcess.spawn(command, args, {
      stdio: 'pipe',
      shell: isWindows,
      ...options
    })

    var stdout = []
    var stderr = []

    child.stdout.on('data', function (chunk) {
      stdout.push(chunk)
    })

    child.stderr.on('data', function (chunk) {
      stderr.push(chunk)
    })

    child.on('close', function (code) {
      resolve({
        code: code,
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString()
      })
    })

    child.on('error', function (err) {
      reject(err)
    })
  })
}

/**
 * Install Graphviz on macOS using Homebrew
 */
async function installOnMac () {
  console.log('🍺 Attempting to install Graphviz on macOS using Homebrew...')

  // Check if Homebrew is installed
  if (!commandExists('brew')) {
    console.log('')
    console.log('❌ Homebrew is not installed.')
    console.log('')
    console.log('Please install Homebrew first:')
    console.log('  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')
    console.log('')
    console.log('Then run: brew install graphviz')
    return false
  }

  try {
    console.log('Installing Graphviz via Homebrew...')
    var result = await execCommand('brew', ['install', 'graphviz'])
    
    if (result.code === 0) {
      console.log('✅ Graphviz installed successfully!')
      return true
    } else {
      // Try upgrade if already installed
      console.log('Attempting to upgrade Graphviz...')
      var upgradeResult = await execCommand('brew', ['upgrade', 'graphviz'])
      if (upgradeResult.code === 0) {
        console.log('✅ Graphviz upgraded successfully!')
        return true
      } else {
        console.log('⚠️  Installation failed. Please install manually:')
        console.log('  brew install graphviz')
        return false
      }
    }
  } catch (err) {
    console.log('❌ Error installing Graphviz:', err.message)
    console.log('Please install manually: brew install graphviz')
    return false
  }
}

/**
 * Install Graphviz on Linux
 */
async function installOnLinux () {
  console.log('🐧 Attempting to install Graphviz on Linux...')

  // Detect package manager
  var packageManager = null
  var installCommand = null
  var packageName = 'graphviz'

  var installArgs = null

  if (commandExists('apt-get')) {
    packageManager = 'apt-get'
    installArgs = ['apt-get', 'install', '-y', packageName]
  } else if (commandExists('yum')) {
    packageManager = 'yum'
    installArgs = ['yum', 'install', '-y', packageName]
  } else if (commandExists('dnf')) {
    packageManager = 'dnf'
    installArgs = ['dnf', 'install', '-y', packageName]
  } else if (commandExists('pacman')) {
    packageManager = 'pacman'
    installArgs = ['pacman', '-S', '--noconfirm', packageName]
  } else if (commandExists('zypper')) {
    packageManager = 'zypper'
    installArgs = ['zypper', 'install', '-y', packageName]
  } else {
    console.log('❌ Could not detect package manager.')
    console.log('Please install Graphviz manually using your system package manager.')
    return false
  }

  console.log('Detected package manager: ' + packageManager)
  console.log('Note: This requires sudo/administrator privileges.')

  try {
    // For apt-get, we need to run update first
    if (packageManager === 'apt-get') {
      console.log('Updating package list...')
      var updateResult = await execCommand('sudo', ['apt-get', 'update'])
      if (updateResult.code !== 0) {
        console.log('⚠️  Failed to update package list. Trying installation anyway...')
      }
    }

    console.log('Installing Graphviz...')
    var result = await execCommand('sudo', installArgs)

    if (result.code === 0) {
      console.log('✅ Graphviz installed successfully!')
      return true
    } else {
      console.log('⚠️  Installation failed. Please install manually:')
      if (packageManager === 'apt-get') {
        console.log('  sudo apt-get update && sudo apt-get install -y graphviz')
      } else {
        console.log('  sudo ' + installArgs.join(' '))
      }
      return false
    }
  } catch (err) {
    console.log('❌ Error installing Graphviz:', err.message)
    console.log('Please install manually:')
    if (packageManager === 'apt-get') {
      console.log('  sudo apt-get update && sudo apt-get install -y graphviz')
    } else {
      console.log('  sudo ' + installArgs.join(' '))
    }
    return false
  }
}

/**
 * Install Graphviz on Windows
 */
async function installOnWindows () {
  console.log('🪟 Attempting to install Graphviz on Windows...')

  // Try Chocolatey first
  if (commandExists('choco')) {
    console.log('Detected Chocolatey package manager.')
    try {
      console.log('Installing Graphviz via Chocolatey...')
      var result = await execCommand('choco', ['install', 'graphviz', '-y'], {
        shell: true
      })

      if (result.code === 0 || result.stdout.indexOf('installed') !== -1) {
        console.log('✅ Graphviz installed successfully!')
        return true
      }
    } catch (err) {
      console.log('⚠️  Chocolatey installation failed, trying other methods...')
    }
  }

  // Try Winget
  if (commandExists('winget')) {
    console.log('Detected Winget package manager.')
    try {
      console.log('Installing Graphviz via Winget...')
      var result = await execCommand('winget', ['install', 'Graphviz.Graphviz', '--accept-package-agreements', '--accept-source-agreements'], {
        shell: true
      })

      if (result.code === 0) {
        console.log('✅ Graphviz installed successfully!')
        return true
      }
    } catch (err) {
      console.log('⚠️  Winget installation failed...')
    }
  }

  // If both failed, provide manual instructions
  console.log('')
  console.log('❌ Could not automatically install Graphviz.')
  console.log('')
  console.log('Please install Graphviz manually:')
  console.log('')
  console.log('Option 1: Using Chocolatey (if installed):')
  console.log('  choco install graphviz -y')
  console.log('')
  console.log('Option 2: Using Winget (Windows 10/11):')
  console.log('  winget install Graphviz.Graphviz')
  console.log('')
  console.log('Option 3: Download installer:')
  console.log('  https://graphviz.org/download/')
  console.log('')

  return false
}

/**
 * Main installation function
 */
async function installGraphviz () {
  console.log('')
  console.log('🔍 Checking if Graphviz is already installed...')
  console.log('')

  // First check if Graphviz is already installed
  var detected = dotResolver.resolveDotExecutable({ dotPath: null })
  if (detected) {
    console.log('✅ Graphviz is already installed at: ' + detected)
    console.log('')
    try {
      var testResult = await execCommand(detected, ['-V'])
      if (testResult.code === 0 || testResult.stdout) {
        console.log('Version info:')
        console.log(testResult.stdout.split('\n')[0])
      }
    } catch (e) {
      // Ignore
    }
    return true
  }

  console.log('❌ Graphviz is not installed.')
  console.log('')

  // Attempt automatic installation based on platform
  var installed = false

  if (isMac) {
    installed = await installOnMac()
  } else if (isLinux) {
    installed = await installOnLinux()
  } else if (isWindows) {
    installed = await installOnWindows()
  } else {
    console.log('❌ Unsupported platform: ' + platform)
    console.log('Please install Graphviz manually.')
    return false
  }

  if (installed) {
    // Verify installation
    console.log('')
    console.log('🔍 Verifying installation...')
    var newDetected = dotResolver.resolveDotExecutable({ dotPath: null })
    if (newDetected) {
      console.log('✅ Graphviz is now available at: ' + newDetected)
      return true
    } else {
      console.log('⚠️  Graphviz was installed but cannot be found.')
      console.log('You may need to restart your terminal or add it to PATH.')
      return false
    }
  }

  return false
}

// Run if called directly
if (require.main === module) {
  installGraphviz()
    .then(function (success) {
      if (success) {
        console.log('')
        console.log('✅ Graphviz installation completed successfully!')
        process.exit(0)
      } else {
        console.log('')
        console.log('⚠️  Automatic installation failed. Please install Graphviz manually.')
        process.exit(1)
      }
    })
    .catch(function (err) {
      console.error('❌ Error:', err.message)
      process.exit(1)
    })
}

module.exports = {
  installGraphviz: installGraphviz,
  installOnMac: installOnMac,
  installOnLinux: installOnLinux,
  installOnWindows: installOnWindows
}

