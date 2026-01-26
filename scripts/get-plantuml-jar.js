#!/usr/bin/env node
'use strict'

var fs = require('fs')
var path = require('path')
var https = require('https')

var download = require('./download')

var PACKAGE_JSON_PATH = path.join(__dirname, '../package.json')
var packageJson = require(PACKAGE_JSON_PATH)
var plantumlVersion = packageJson.plantumlVersion

var JAR_DIR_PATH = path.join(__dirname, '../vendor')
var PLANTUML_JAR = path.join(JAR_DIR_PATH, 'plantuml.jar')

// GitHub Releases API for latest version
var GITHUB_API_LATEST = 'https://api.github.com/repos/plantuml/plantuml/releases/latest'
var GITHUB_RELEASES_BASE = 'https://github.com/plantuml/plantuml/releases/download/'

// License type: MIT (default), LGPL, ASL, BSD, EPL, MIT
var LICENSE_TYPE = process.env.PLANTUML_LICENSE || 'MIT'
var LICENSE_SUFFIX = LICENSE_TYPE === 'MIT' ? '' : '-' + LICENSE_TYPE.toLowerCase()

if (!fs.existsSync(JAR_DIR_PATH)) {
  fs.mkdirSync(JAR_DIR_PATH)
}

function getLatestVersion (callback) {
  console.log('Fetching latest PlantUML version from GitHub...')
  https.get(GITHUB_API_LATEST, {
    headers: {
      'User-Agent': 'node-plantuml-downloader'
    }
  }, function (res) {
    var data = ''
    res.on('data', function (chunk) { data += chunk })
    res.on('end', function () {
      if (res.statusCode === 200) {
        try {
          var release = JSON.parse(data)
          var version = release.tag_name.replace(/^v/, '') // Remove 'v' prefix if present
          callback(null, version)
        } catch (e) {
          callback(new Error('Failed to parse GitHub API response: ' + e.message))
        }
      } else {
        callback(new Error('GitHub API returned status code: ' + res.statusCode))
      }
    })
  }).on('error', function (err) {
    callback(err)
  })
}

function downloadJar (version, callback) {
  var jarFilename = 'plantuml' + LICENSE_SUFFIX + '-' + version + '.jar'
  var downloadUrl = GITHUB_RELEASES_BASE + 'v' + version + '/' + jarFilename

  console.log('Downloading plantuml.jar version ' + version + ' (' + LICENSE_TYPE + ' license)')
  console.log('URL: ' + downloadUrl)

  download(downloadUrl, PLANTUML_JAR, true, function (err) {
    if (err) {
      // Fallback: try without license suffix (for older versions)
      if (LICENSE_SUFFIX) {
        console.log('Retrying with standard GPL version...')
        var fallbackUrl = GITHUB_RELEASES_BASE + 'v' + version + '/plantuml-' + version + '.jar'
        download(fallbackUrl, PLANTUML_JAR, true, callback)
      } else {
        callback(err)
      }
    } else {
      // Update package.json with latest version
      packageJson.plantumlVersion = version
      fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n')
      console.log('Updated package.json with version: ' + version)
      callback(null)
    }
  })
}

// Main execution
if (process.argv.indexOf('--latest') !== -1 || process.argv.indexOf('-l') !== -1) {
  // Download latest version
  getLatestVersion(function (err, version) {
    if (err) {
      console.error('Error fetching latest version:', err.message)
      console.log('Falling back to version from package.json: ' + plantumlVersion)
      downloadJar(plantumlVersion, function (err) {
        if (err) {
          console.error('Download failed:', err)
          process.exit(1)
        }
      })
    } else {
      downloadJar(version, function (err) {
        if (err) {
          console.error('Download failed:', err)
          process.exit(1)
        }
      })
    }
  })
} else {
  // Use version from package.json
  downloadJar(plantumlVersion, function (err) {
    if (err) {
      console.error('Download failed:', err)
      process.exit(1)
    }
  })
}
