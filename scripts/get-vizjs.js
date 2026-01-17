#!/usr/bin/env node
'use strict'

var fs = require('fs')
var path = require('path')
var download = require('./download')

var JAR_DIR_PATH = path.join(__dirname, '../vendor')
var VIZJS_JAR = path.join(JAR_DIR_PATH, 'vizjs.jar')
var J2V8_WIN_JAR = path.join(JAR_DIR_PATH, 'j2v8_win32_x86_64-3.1.6.jar')
var J2V8_LINUX_JAR = path.join(JAR_DIR_PATH, 'j2v8_linux_x86_64-3.1.6.jar')
var J2V8_MAC_JAR = path.join(JAR_DIR_PATH, 'j2v8_macosx_x86_64-3.1.6.jar')

var VIZJS_URL = 'http://beta.plantuml.net/vizjs.jar'
var J2V8_WIN_URL = 'http://beta.plantuml.net/j2v8_win32_x86_64-3.1.6.jar'
var J2V8_LINUX_URL = 'http://beta.plantuml.net/j2v8_linux_x86_64-3.1.6.jar'
var J2V8_MAC_URL = 'http://beta.plantuml.net/j2v8_macosx_x86_64-3.1.6.jar'

var plantuml = require('../lib/node-plantuml')

if (!fs.existsSync(JAR_DIR_PATH)) {
  fs.mkdirSync(JAR_DIR_PATH)
}

plantuml.testdot(function (isOk) {
  if (isOk) {
    console.info('graphviz was found on the system. Skipping download of vizjs.')
  } else {
    // Check if vizjs.jar already exists (e.g., from previous installation or bundled in package)
    if (fs.existsSync(VIZJS_JAR)) {
      console.info('vizjs.jar already exists. Skipping download.')
    } else {
      console.info('graphviz was not found on the system. Downloading vizjs instead. See http://plantuml.com/vizjs. This may take a few minutes.')

      // download additional libraries for working without dot installed.
      download(VIZJS_URL, VIZJS_JAR, false, function (err) {
        if (err) {
          console.warn('Warning: Failed to download vizjs.jar:', err)
          console.warn('The package can still be used if graphviz is installed on the system, or if vizjs.jar is provided manually.')
          console.warn('You can retry the download later or install graphviz to avoid this dependency.')
          // Don't exit with error code - this is a non-critical dependency
        } else {
          // also install the V8 engine just in case the currently installed Java does not have Nashorn
          switch (process.platform) {
            case 'win32':
              download(J2V8_WIN_URL, J2V8_WIN_JAR, false, function (err) {
                if (err) {
                  console.warn('Warning: Failed to download j2v8 Windows jar:', err)
                }
              })
              break
            case 'linux':
              download(J2V8_LINUX_URL, J2V8_LINUX_JAR, false, function (err) {
                if (err) {
                  console.warn('Warning: Failed to download j2v8 Linux jar:', err)
                }
              })
              break
            case 'darwin':
              download(J2V8_MAC_URL, J2V8_MAC_JAR, false, function (err) {
                if (err) {
                  console.warn('Warning: Failed to download j2v8 macOS jar:', err)
                }
              })
              break
            default:
              console.error('Unsupported operating system for V8 jars.')
          }
        }
      })
    }
  }
})
