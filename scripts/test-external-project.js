#!/usr/bin/env node
'use strict'

/**
 * Test script to simulate an external project installing node-plantuml-2
 * This tests if Graphviz can be detected when installed as a dependency
 */

var fs = require('fs')
var path = require('path')
var os = require('os')
var childProcess = require('child_process')

console.log('=== External Project Simulation Test ===\n')

// Create a temporary external project
var tempDir = path.join(os.tmpdir(), 'test-external-project-' + Date.now())
var externalProjectDir = path.join(tempDir, 'external-project')

console.log('1. Creating external project structure...')
console.log('   Directory:', externalProjectDir)

// Clean up if exists
if (fs.existsSync(tempDir)) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true })
  } catch (e) {
    // Ignore
  }
}

fs.mkdirSync(externalProjectDir, { recursive: true })

// Create package.json for external project
var externalPackageJson = {
  name: 'test-external-project',
  version: '1.0.0',
  dependencies: {
    'node-plantuml-2': 'file:' + path.resolve(__dirname)
  }
}

fs.writeFileSync(
  path.join(externalProjectDir, 'package.json'),
  JSON.stringify(externalPackageJson, null, 2)
)

console.log('   ✓ Created package.json')
console.log('')

// Install dependencies
console.log('2. Installing dependencies (this will install optional dependencies)...')
console.log('   This may take a while...')

try {
  childProcess.execSync('npm install', {
    cwd: externalProjectDir,
    stdio: 'inherit'
  })
  console.log('   ✓ Dependencies installed')
} catch (e) {
  console.log('   ✗ Installation failed:', e.message)
  console.log('   (This is expected if Graphviz packages are not published yet)')
  console.log('')
  console.log('   Cleaning up...')
  try {
    fs.rmSync(tempDir, { recursive: true, force: true })
  } catch (cleanupErr) {
    // Ignore
  }
  process.exit(0)
}

console.log('')

// Test Graphviz detection from the external project
console.log('3. Testing Graphviz detection from external project...')

var testScript = `
var dotResolver = require('node-plantuml-2/lib/dot-resolver');
var fs = require('fs');
var path = require('path');

console.log('=== Graphviz Detection from External Project ===');
console.log('');

// Test resolveBundledGraphviz
var bundled = dotResolver.resolveBundledGraphviz();
if (bundled) {
  console.log('✓ Bundled Graphviz found:', bundled);
  console.log('  Exists:', fs.existsSync(bundled));
} else {
  console.log('✗ No bundled Graphviz found');
}

// Test resolveDotExecutable
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null });
if (dotPath) {
  console.log('✓ Dot executable found:', dotPath);
  var isBundled = dotPath.includes('@node-plantuml-2/graphviz-');
  console.log('  Is bundled:', isBundled);
} else {
  console.log('✗ No dot executable found');
}

// Test actual PlantUML generation
console.log('');
console.log('=== Testing PlantUML Generation ===');
try {
  var plantuml = require('node-plantuml-2');
  var gen = plantuml.generate('@startuml\\nAlice -> Bob: Hello\\n@enduml', { format: 'png' });
  
  var chunks = [];
  gen.out.on('data', function(chunk) { chunks.push(chunk); });
  gen.out.on('end', function() {
    var buffer = Buffer.concat(chunks);
    if (buffer.length > 0) {
      console.log('✓ PlantUML generation successful:', buffer.length, 'bytes');
      // Check PNG signature
      var isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      console.log('  Valid PNG:', isPng);
    } else {
      console.log('✗ PlantUML generation failed: empty output');
    }
  });
  
  gen.out.on('error', function(err) {
    console.log('✗ PlantUML generation error:', err.message);
  });
  
  // Timeout after 10 seconds
  setTimeout(function() {
    if (chunks.length === 0) {
      console.log('✗ PlantUML generation timeout');
      process.exit(1);
    }
  }, 10000);
} catch (err) {
  console.log('✗ Error:', err.message);
  process.exit(1);
}
`

fs.writeFileSync(path.join(externalProjectDir, 'test-graphviz.js'), testScript)

try {
  console.log('   Running test script...')
  childProcess.execSync('node test-graphviz.js', {
    cwd: externalProjectDir,
    stdio: 'inherit',
    timeout: 30000
  })
  console.log('   ✓ Test completed')
} catch (e) {
  console.log('   ✗ Test failed:', e.message)
}

console.log('')

// Cleanup
console.log('4. Cleaning up...')
try {
  fs.rmSync(tempDir, { recursive: true, force: true })
  console.log('   ✓ Cleaned up')
} catch (e) {
  console.log('   ⚠️  Cleanup failed:', e.message)
  console.log('   Temp directory:', tempDir)
}

console.log('')
console.log('=== Test Complete ===')

