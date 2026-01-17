'use strict'

var url = require('url')
var fs = require('fs')

var trace = []
var MAX_RETRIES = 5
var INITIAL_RETRY_DELAY = 2000 // 2 seconds

function sleep (ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

function downloadWithRetry (uri, filename, changeExitCodeOnError, callback, retryCount) {
  retryCount = retryCount || 0
  trace.push('GET ' + uri + (retryCount > 0 ? ' (retry ' + retryCount + ')' : ''))
  var protocol = url.parse(uri).protocol.slice(0, -1)

  require(protocol).get(uri, function (res) {
    trace.push('Reponse: ' + res.statusCode)
    if (res.statusCode === 200) {
      // Success, pipe to file
      var fileStream = fs.createWriteStream(filename)
      res.pipe(fileStream)
      if (callback) {
        res.on('end', function () {
          callback()
        })
      }
      fileStream.on('error', function (err) {
        if (callback) {
          callback(err)
        }
      })
    } else if (res.headers.location) {
      // Follow redirect
      downloadWithRetry(res.headers.location, filename, changeExitCodeOnError, callback, retryCount)
    } else if ((res.statusCode === 429 || res.statusCode === 503 || res.statusCode === 502) && retryCount < MAX_RETRIES) {
      // Rate limited or server error - retry with exponential backoff
      var retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
      var retryAfter = res.headers['retry-after']
      if (retryAfter) {
        retryDelay = parseInt(retryAfter) * 1000
      }
      console.log('Rate limited or server error (' + res.statusCode + '). Retrying in ' + (retryDelay / 1000) + ' seconds...')
      sleep(retryDelay).then(function () {
        downloadWithRetry(uri, filename, changeExitCodeOnError, callback, retryCount + 1)
      })
    } else {
      // Error
      trace.forEach(function (line) {
        console.error(line)
      })
      var error = 'Failed to download ' + filename
      console.error(error)

      if (changeExitCodeOnError) {
        process.exitCode = 1
      }

      if (callback) {
        callback(error)
      }
    }
  }).on('error', function (err) {
    if (retryCount < MAX_RETRIES) {
      // Network error - retry with exponential backoff
      var retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
      console.log('Network error. Retrying in ' + (retryDelay / 1000) + ' seconds...')
      sleep(retryDelay).then(function () {
        downloadWithRetry(uri, filename, changeExitCodeOnError, callback, retryCount + 1)
      })
    } else {
      trace.forEach(function (line) {
        console.error(line)
      })
      var error = 'Failed to download ' + filename + ': ' + err.message
      console.error(error)

      if (changeExitCodeOnError) {
        process.exitCode = 1
      }

      if (callback) {
        callback(error)
      }
    }
  })
}

module.exports = function download (uri, filename, changeExitCodeOnError, callback) {
  downloadWithRetry(uri, filename, changeExitCodeOnError, callback, 0)
}
