#!/usr/bin/env node
'use strict'

var fs = require('fs')
var path = require('path')
var installGraphviz = require('./install-graphviz')

var JAR_DIR_PATH = path.join(__dirname, '../vendor')
var VIZJS_JAR = path.join(JAR_DIR_PATH, 'vizjs.jar')

var plantuml = require('../lib/node-plantuml')

if (!fs.existsSync(JAR_DIR_PATH)) {
  fs.mkdirSync(JAR_DIR_PATH)
}

plantuml.testdot(function (isOk) {
  if (isOk) {
    console.info('✅ Graphviz was found on the system. Skipping download of vizjs.')
  } else {
    // Check if vizjs.jar already exists (e.g., from previous installation or bundled in package)
    if (fs.existsSync(VIZJS_JAR)) {
      console.info('vizjs.jar already exists. Skipping download.')
    } else {
      console.info('')
      console.info('⚠️  Graphviz was not found on the system.')
      console.info('')

      // Try to automatically install Graphviz
      var autoInstall = process.env.NODE_PLANTUML_AUTO_INSTALL_GRAPHVIZ !== 'false'

      if (autoInstall) {
        console.info('🔧 Attempting to automatically install Graphviz...')
        console.info('   (Set NODE_PLANTUML_AUTO_INSTALL_GRAPHVIZ=false to skip)')
        console.info('')

        installGraphviz.installGraphviz()
          .then(function (success) {
            if (success) {
              console.info('')
              console.info('✅ Graphviz installation completed!')
            } else {
              console.info('')
              console.info('⚠️  Automatic installation failed or was skipped.')
              console.info('')
              console.info('The package can still be used if:')
              console.info('  1. Graphviz is installed on the system (recommended)')
              console.info('  2. vizjs.jar is provided manually in vendor/ directory')
              console.info('  3. Only non-Graphviz diagram types are used')
              console.info('')
              console.info('To install Graphviz manually:')
              console.info('  - macOS: brew install graphviz')
              console.info('  - Linux: sudo apt-get install graphviz (or your package manager)')
              console.info('  - Windows: choco install graphviz -y (or download from graphviz.org)')
              console.info('')
              console.info('See http://plantuml.com/vizjs for more information.')
            }
          })
          .catch(function (err) {
            console.error('❌ Error during installation:', err.message)
            console.info('')
            console.info('Please install Graphviz manually.')
          })
      } else {
        console.info('Note: Automatic Graphviz installation is disabled.')
        console.info('The package can still be used if:')
        console.info('  1. Graphviz is installed on the system (recommended)')
        console.info('  2. vizjs.jar is provided manually in vendor/ directory')
        console.info('  3. Only non-Graphviz diagram types are used')
        console.info('')
        console.info('To install Graphviz manually:')
        console.info('  - macOS: brew install graphviz')
        console.info('  - Linux: sudo apt-get install graphviz (or your package manager)')
        console.info('  - Windows: choco install graphviz -y (or download from graphviz.org)')
        console.info('')
        console.info('See http://plantuml.com/vizjs for more information.')
      }
    }
  }
})
