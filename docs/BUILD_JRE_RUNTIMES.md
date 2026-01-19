# Building JRE Runtime Packages

## 📋 Overview

This guide explains how to build and publish the platform-specific JRE runtime packages using `jlink`.

## 🛠️ Prerequisites

### Required Tools

- **JDK 17+** with `jlink` tool
  - macOS: `brew install openjdk@17`
  - Ubuntu/Debian: `sudo apt-get install openjdk-17-jdk`
  - Windows: Download from [Adoptium](https://adoptium.net/)

### Verify Installation

```bash
java -version    # Should show JDK 17+
jlink -version   # Should show jlink version
```

## 📦 Building Runtime Packages

### Quick Start

```bash
# Build for current platform
node scripts/build-jre.js

# Build for specific platform
node scripts/build-jre.js darwin arm64
node scripts/build-jre.js darwin x64
node scripts/build-jre.js linux x64
node scripts/build-jre.js win32 x64
```

### Build Process

1. **Create JRE directory structure**:
   ```bash
   mkdir -p runtimes/@node-plantuml-2/jre-darwin-arm64
   ```

2. **Build minimal JRE**:
   ```bash
   node scripts/build-jre.js darwin arm64
   ```

   This will:
   - Create a minimal JRE using `jlink`
   - Include only required modules: `java.base`, `java.desktop`, `java.xml`, `java.logging`
   - Strip debug symbols and compress
   - Set executable permissions (Unix)

3. **Create package.json**:
   ```bash
   cd runtimes/@node-plantuml-2/jre-darwin-arm64
   cp ../../jre-package-template/package.json .
   # Edit package.json to replace PLATFORM and ARCH placeholders
   ```

4. **Test the JRE**:
   ```bash
   ./jre/bin/java -version
   ```

5. **Publish the package**:
   ```bash
   npm publish --access public
   ```

## 📝 Package.json Template

Each runtime package needs a `package.json`. Use the template:

```json
{
  "name": "@node-plantuml-2/jre-darwin-arm64",
  "version": "1.0.0",
  "description": "Minimal JRE for node-plantuml-2 on macOS ARM64",
  "os": ["darwin"],
  "cpu": ["arm64"],
  "files": [
    "jre/**"
  ],
  "license": "GPL-2.0 WITH Classpath-exception-2.0"
}
```

**Important fields**:
- `name`: Must match `@node-plantuml-2/jre-{platform}-{arch}`
- `os`: Platform filter (`["darwin"]`, `["linux"]`, `["win32"]`)
- `cpu`: Architecture filter (`["arm64"]`, `["x64"]`)
- `files`: Include only `jre/**` directory

## 🔧 Platform-Specific Notes

### macOS

**Executable permissions**:
```bash
chmod +x jre/bin/java
```

**Notarization**: Not required for npm packages (only for Electron apps)

### Linux

**Executable permissions**:
```bash
chmod +x jre/bin/java
chmod +x jre/bin/*
```

### Windows

**No special permissions needed** - Windows uses `.exe` extension

**Windows Defender**: Generally no issues, but avoid UPX compression

## 📊 JRE Size

Typical sizes after `jlink` compression:
- **macOS ARM64**: ~45-55 MB
- **macOS x64**: ~50-60 MB
- **Linux x64**: ~45-55 MB
- **Windows x64**: ~50-60 MB

## 🚀 Publishing

### First Time Setup

1. **Create npm organization** (if needed):
   ```bash
   npm org create node-plantuml-2
   ```

2. **Login to npm**:
   ```bash
   npm login
   ```

### Publish Each Package

For each platform:

```bash
cd runtimes/@node-plantuml-2/jre-{platform}-{arch}
npm publish --access public
```

### Version Management

- All runtime packages should use the same version
- Update version in `package.json` before publishing
- Use semantic versioning: `1.0.0`, `1.0.1`, etc.

## 🧪 Testing

### Test Locally

1. **Link the package locally**:
   ```bash
   cd runtimes/@node-plantuml-2/jre-darwin-arm64
   npm link
   ```

2. **Test in main package**:
   ```bash
   cd ../../..
   npm link @node-plantuml-2/jre-darwin-arm64
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

### Test Java Resolution

```javascript
const javaResolver = require('./lib/java-resolver')

// Should resolve to bundled JRE if installed
const javaPath = javaResolver.resolveJavaExecutable()
console.log('Java path:', javaPath)
```

## 📋 Checklist

Before publishing each runtime package:

- [ ] JRE built with `jlink` successfully
- [ ] `java -version` works from JRE
- [ ] Executable permissions set (Unix)
- [ ] `package.json` configured correctly
- [ ] `os` and `cpu` fields match platform
- [ ] `.gitignore` excludes `jre/` (large binary)
- [ ] Tested with PlantUML
- [ ] Version number updated
- [ ] Published to npm

## 🔍 Troubleshooting

### jlink not found

```bash
# Check if JDK is installed
java -version

# Check if jlink is in PATH
which jlink

# On macOS with Homebrew
brew install openjdk@17
export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
```

### Permission denied (macOS/Linux)

```bash
chmod +x jre/bin/java
chmod +x jre/bin/*
```

### JRE too large

- Check that `--compress=2` is used
- Verify `--strip-debug` is included
- Remove unnecessary modules (but keep required ones)

### Package not installing

- Check `os` and `cpu` fields in `package.json`
- Verify package name matches `@node-plantuml-2/jre-{platform}-{arch}`
- Check npm registry access permissions

## 📚 Additional Resources

- [jlink documentation](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jlink.html)
- [Java Modules](https://docs.oracle.com/javase/9/docs/api/java.base/module-summary.html)
- [npm optionalDependencies](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#optionaldependencies)

