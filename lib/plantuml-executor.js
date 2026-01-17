'use strict'

var childProcess = require('child_process')
var path = require('path')
var nailgun = require('node-nailgun-server')
var ngClient = require('node-nailgun-client')

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

// TODO: proper error handling
function execWithSpawn (argv, cwd, cb) {
  cwd = cwd || process.cwd()
  var opts = [
    '-Dplantuml.include.path=' + cwd,
    '-Djava.awt.headless=true',
    '-Dfile.encoding=UTF-8',
    '-Duser.language=en',
    '-Duser.country=US',
    '-jar', PLANTUML_JAR
  ].concat(argv)
  return childProcess.spawn('java', opts)
}

module.exports.useWasm = function (callback) {
  var wasmExecutor = require('./plantuml-executor-wasm')
  if (wasmExecutor.isAvailable()) {
    return wasmExecutor.initWasm(callback)
  } else {
    console.warn('Wasm executor not available, falling back to Java executor')
    if (typeof callback === 'function') {
      callback(new Error('Wasm executor not available'))
    }
  }
}

module.exports.exec = function (argv, cwd, callback) {
  if (typeof argv === 'function') {
    callback = argv
    argv = undefined
    cwd = undefined
  } else if (typeof cwd === 'function') {
    callback = cwd
    cwd = undefined
  }

  // Priority 1: Try Wasm executor first (pure Node, no Java needed)
  var wasmExecutor = require('./plantuml-executor-wasm')
  var useJava = process.env.PLANTUML_USE_JAVA === 'true' || process.env.PLANTUML_USE_JAVA === '1'

  var task
  // Use Wasm by default, unless explicitly requested to use Java
  if (!useJava && wasmExecutor.isAvailable()) {
    try {
      // Try to initialize Wasm synchronously first
      if (!wasmExecutor.isReady()) {
        if (!wasmExecutor.initWasmSync()) {
          // Sync init failed, try async (non-blocking)
          wasmExecutor.initWasm(function (err) {
            if (err) {
              console.warn('Wasm initialization failed, falling back to Java:', err.message)
            }
          })
        }
      }

      // Try to use Wasm executor
      if (wasmExecutor.isReady()) {
        task = wasmExecutor.exec(argv, cwd, callback)
        // Wasm executor handles its own callback setup
        if (task && typeof callback === 'function') {
          // Setup callback for Wasm executor if needed
          var chunks = []
          if (task.stdout) {
            task.stdout.on('data', function (chunk) { chunks.push(chunk) })
            task.stdout.on('end', function () {
              var data = Buffer.concat(chunks)
              callback(null, data)
            })
            task.stdout.on('error', function () {
              callback(new Error('error while reading plantuml output'), null)
            })
          }
        }
        return task
      } else {
        // Wasm not ready yet, fallback to Java
        task = getJavaTask(argv, cwd, callback)
      }
    } catch (e) {
      console.warn('Wasm executor failed, falling back to Java:', e.message)
      task = getJavaTask(argv, cwd, callback)
    }
  } else {
    // Use Java executor (fallback or explicitly requested)
    task = getJavaTask(argv, cwd, callback)
  }

  return task
}

/**
 * Get Java executor task
 */
function getJavaTask (argv, cwd, callback) {
  var task
  if (nailgunRunning) {
    task = execWithNailgun(argv, cwd, callback)
  } else {
    task = execWithSpawn(argv, cwd, callback)
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
