#!/usr/bin/env node
'use strict'

/**
 * Verify workflow setup
 * Checks if all required files and configurations are in place
 */

var fs = require('fs')
var path = require('path')

console.log('Verifying GitHub Actions workflow setup...')
console.log('')

var errors = []
var warnings = []

// Check 1: Workflow file exists
var workflowPath = '.github/workflows/publish.yml'
if (fs.existsSync(workflowPath)) {
  console.log('✓ Workflow file exists:', workflowPath)
} else {
  errors.push('Workflow file not found: ' + workflowPath)
}

// Check 2: Build scripts exist
var buildScripts = [
  'scripts/build-jre.js',
  'scripts/create-runtime-package-json.js'
]

buildScripts.forEach(function (script) {
  if (fs.existsSync(script)) {
    console.log('✓ Build script exists:', script)
  } else {
    errors.push('Build script not found: ' + script)
  }
})

// Check 3: Runtime template exists
var templatePath = 'runtimes/jre-package-template/package.json'
if (fs.existsSync(templatePath)) {
  console.log('✓ Package template exists:', templatePath)
} else {
  warnings.push('Package template not found: ' + templatePath)
}

// Check 4: Java resolver exists
if (fs.existsSync('lib/java-resolver.js')) {
  console.log('✓ Java resolver exists: lib/java-resolver.js')
} else {
  errors.push('Java resolver not found: lib/java-resolver.js')
}

// Check 5: Package.json has optionalDependencies
var packageJsonPath = 'package.json'
if (fs.existsSync(packageJsonPath)) {
  var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  if (packageJson.optionalDependencies) {
    var runtimePackages = Object.keys(packageJson.optionalDependencies)
    console.log('✓ optionalDependencies found:', runtimePackages.length, 'packages')
    runtimePackages.forEach(function (pkg) {
      console.log('  -', pkg)
    })
  } else {
    warnings.push('optionalDependencies not found in package.json')
  }
} else {
  errors.push('package.json not found')
}

// Check 6: Workflow file syntax
if (fs.existsSync(workflowPath)) {
  try {
    var workflowContent = fs.readFileSync(workflowPath, 'utf8')
    // Basic checks
    if (workflowContent.includes('build-and-publish-runtimes')) {
      console.log('✓ Workflow includes runtime build job')
    } else {
      warnings.push('Workflow may be missing runtime build job')
    }
    
    if (workflowContent.includes('matrix')) {
      console.log('✓ Workflow uses matrix strategy')
    } else {
      warnings.push('Workflow may not use matrix strategy')
    }
    
    if (workflowContent.includes('needs.prepare.outputs.version')) {
      console.log('✓ Workflow passes version between jobs')
    } else {
      warnings.push('Workflow may not pass version correctly')
    }
  } catch (e) {
    warnings.push('Could not parse workflow file: ' + e.message)
  }
}

console.log('')

// Summary
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed!')
  console.log('')
  console.log('Workflow is ready to use.')
  console.log('Make sure to configure NPM_TOKEN secret in GitHub repository settings.')
  process.exit(0)
} else {
  if (errors.length > 0) {
    console.log('❌ Errors:')
    errors.forEach(function (err) {
      console.log('  -', err)
    })
    console.log('')
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:')
    warnings.forEach(function (warn) {
      console.log('  -', warn)
    })
    console.log('')
  }
  
  if (errors.length > 0) {
    process.exit(1)
  } else {
    console.log('⚠️  Some warnings, but workflow should work')
    process.exit(0)
  }
}

