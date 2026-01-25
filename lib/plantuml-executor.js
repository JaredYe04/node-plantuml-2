'use strict'

var childProcess = require('child_process')
var path = require('path')
var nailgun = require('node-nailgun-server')
var ngClient = require('node-nailgun-client')
var javaResolver = require('./java-resolver')
var dotResolver = require('./dot-resolver')

var INCLUDED_PLANTUML_JAR = path.join(__dirname, '../vendor/plantuml.jar')
var PLANTUML_JAR = process.env.PLANTUML_HOME || INCLUDED_PLANTUML_JAR

var PLANTUML_NAIL_JAR = path.join(__dirname, '../nail/plantumlnail.jar')
var PLANTUML_NAIL_CLASS = 'PlantumlNail'

var LOCALHOST = 'localhost'
var GENERATE_PORT = 0

var nailgunServer
var clientOptions
var nailgunRunning = false

module.exports.useNailgun = function (callback) {
  var options = { address: LOCALHOST, port: GENERATE_PORT }
  nailgunServer = nailgun.createServer(options, function (port) {
    clientOptions = {
      host: LOCALHOST,
      port: port
    }

    ngClient.exec('ng-cp', [PLANTUML_JAR], clientOptions)
    ngClient.exec('ng-cp', [PLANTUML_NAIL_JAR], clientOptions)

    // Give Nailgun some time to load the classpath
    setTimeout(function () {
      nailgunRunning = true
      if (typeof callback === 'function') {
        callback()
      }
    }, 50)
  })

  return nailgunServer
}

// TODO: proper error handling
function execWithNailgun (argv, cwd, cb) {
  clientOptions.cwd = cwd || process.cwd()
  return ngClient.exec(PLANTUML_NAIL_CLASS, argv, clientOptions)
}

/**
 * Find Java executable with fallback strategy
 * @param {Object} options - Options with optional javaPath
 * @returns {string} - Java executable path
 */
function findJavaExecutable (options) {
  options = options || {}

  // Try to resolve Java executable
  var javaPath = javaResolver.resolveJavaExecutable(options)

  if (!javaPath) {
    // Fallback to 'java' in PATH if resolver fails
    // This maintains backward compatibility
    return 'java'
  }

  return javaPath
}

// TODO: proper error handling
function execWithSpawn (argv, cwd, options, cb) {
  cwd = cwd || process.cwd()
  options = options || {}

  var javaExe = findJavaExecutable(options)

  var opts = [
    '-Dplantuml.include.path=' + cwd,
    '-Djava.awt.headless=true',
    '-Dfile.encoding=UTF-8',
    '-Duser.language=en',
    '-Duser.country=US',
    '-jar', PLANTUML_JAR
  ].concat(argv)

  // Set LD_LIBRARY_PATH for bundled Graphviz on Linux
  var spawnOptions = {
    cwd: cwd
  }

  // Check if we're using bundled Graphviz and need to set library path
  var dotPath = null
  // Extract dot path from argv if present
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === '-graphvizdot' && i + 1 < argv.length) {
      dotPath = argv[i + 1]
      break
    }
  }

  // If no dot path in argv, try to detect it
  if (!dotPath) {
    dotPath = dotResolver.resolveDotExecutable({ dotPath: null })
  }

  // Get library path for bundled Graphviz
  var libPath = dotResolver.getBundledGraphvizLibPath(dotPath)
  if (libPath) {
    var platform = require('os').platform()
    var env = Object.assign({}, process.env)

    if (platform === 'linux') {
      // Set LD_LIBRARY_PATH for Linux
      var existingLibPath = env.LD_LIBRARY_PATH || ''
      env.LD_LIBRARY_PATH = libPath + (existingLibPath ? ':' + existingLibPath : '')
    } else if (platform === 'darwin') {
      // Set DYLD_LIBRARY_PATH for macOS
      var existingDyldPath = env.DYLD_LIBRARY_PATH || ''
      env.DYLD_LIBRARY_PATH = libPath + (existingDyldPath ? ':' + existingDyldPath : '')
    }

    spawnOptions.env = env
  }

  return childProcess.spawn(javaExe, opts, spawnOptions)
}

module.exports.exec = function (argv, cwd, callbackOrOptions, callback) {
  var options = {}
  var actualCallback

  // Handle flexible argument signature
  if (typeof argv === 'function') {
    actualCallback = argv
    argv = undefined
    cwd = undefined
  } else if (typeof cwd === 'function') {
    actualCallback = cwd
    cwd = undefined
  } else if (typeof callbackOrOptions === 'function') {
    actualCallback = callbackOrOptions
  } else if (callbackOrOptions && typeof callbackOrOptions === 'object') {
    options = callbackOrOptions
    actualCallback = callback
  } else if (typeof callback === 'function') {
    actualCallback = callback
  }

  // Use Java executor (Wasm executor is not available due to Bytecoder limitations)
  // See docs/WASM_BUILD_LIMITATIONS.md for details
  return getJavaTask(argv, cwd, options, actualCallback)
}

/**
 * Get Java executor task
 */
function getJavaTask (argv, cwd, options, callback) {
  options = options || {}
  var task

  if (nailgunRunning) {
    task = execWithNailgun(argv, cwd, callback)
  } else {
    task = execWithSpawn(argv, cwd, options, callback)
  }

  if (typeof callback === 'function') {
    var chunks = []
    task.stdout.on('data', function (chunk) { chunks.push(chunk) })
    task.stdout.on('end', function () {
      var data = Buffer.concat(chunks)
      callback(null, data)
    })
    task.stdout.on('error', function () {
      callback(new Error('error while reading plantuml output'), null)
    })
  }

  return task
}
