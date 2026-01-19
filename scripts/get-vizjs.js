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
      console.info('graphviz was not found on the system.')
      console.info('Note: vizjs and j2v8 downloads are disabled to avoid rate limiting.')
      console.info('The package can still be used if:')
      console.info('  1. Graphviz is installed on the system (recommended)')
      console.info('  2. vizjs.jar is provided manually in vendor/ directory')
      console.info('  3. Only non-Graphviz diagram types are used')
      console.info('See http://plantuml.com/vizjs for more information.')
      // Don't download to avoid rate limiting (429 errors)
      // Users should install graphviz or provide vizjs.jar manually if needed
    }
  }
})
