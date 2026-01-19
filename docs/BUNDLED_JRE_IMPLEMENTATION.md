# Bundled JRE Implementation Summary

## ✅ Completed Implementation

### 1. Java Resolution Module

**File**: `lib/java-resolver.js`

- ✅ Implemented fallback strategy with 4 priority levels:
  1. User-specified `javaPath` (options.javaPath)
  2. Bundled JRE from optional dependencies
  3. JAVA_HOME environment variable
  4. System Java in PATH

- ✅ Platform detection and runtime package resolution
- ✅ Automatic executable permission setting (Unix)
- ✅ Error handling and graceful fallbacks

### 2. Executor Integration

**File**: `lib/plantuml-executor.js`

- ✅ Updated to use `java-resolver.js`
- ✅ Support for `options.javaPath` parameter
- ✅ Backward compatible (falls back to 'java' if resolver fails)
- ✅ Updated all call sites in `node-plantuml.js` and `plantuml-syntax-fixer.js`

### 3. Package Configuration

**File**: `package.json`

- ✅ Added `optionalDependencies` for all platform JRE packages:
  - `@node-plantuml-2/jre-win32-x64`
  - `@node-plantuml-2/jre-darwin-arm64`
  - `@node-plantuml-2/jre-darwin-x64`
  - `@node-plantuml-2/jre-linux-x64`

### 4. Build Scripts

**Files**:
- `scripts/build-jre.js` (Node.js version)
- `scripts/build-jre.sh` (Shell version)
- `runtimes/jre-package-template/package.json` (Template)

- ✅ Automated JRE building with `jlink`
- ✅ Platform-specific JRE creation
- ✅ Executable permission handling
- ✅ JRE verification

### 5. Documentation

**Files**:
- `docs/BUNDLED_JRE_ARCHITECTURE.md` - Architecture overview
- `docs/BUILD_JRE_RUNTIMES.md` - Build and publish guide
- Updated `README.md` - User-facing documentation

## 🚧 Next Steps (Required)

### 1. Build Runtime Packages

You need to build and publish the JRE runtime packages for each platform:

```bash
# For each platform, run:
node scripts/build-jre.js <platform> <arch>

# Example:
node scripts/build-jre.js darwin arm64
node scripts/build-jre.js darwin x64
node scripts/build-jre.js linux x64
node scripts/build-jre.js win32 x64
```

**Requirements**:
- JDK 17+ installed
- Build on target platform (or use cross-compilation)
- Create `package.json` for each package
- Test JRE works with PlantUML
- Publish to npm

### 2. Create Package.json for Each Runtime

For each runtime package:

1. Copy template:
   ```bash
   cp runtimes/jre-package-template/package.json runtimes/@node-plantuml-2/jre-darwin-arm64/
   ```

2. Edit `package.json`:
   - Replace `PLATFORM` with actual platform (`darwin`, `linux`, `win32`)
   - Replace `ARCH` with actual architecture (`arm64`, `x64`)
   - Update `name` field to match package name

3. Example for macOS ARM64:
   ```json
   {
     "name": "@node-plantuml-2/jre-darwin-arm64",
     "version": "1.0.0",
     "description": "Minimal JRE for node-plantuml-2 on macOS ARM64",
     "os": ["darwin"],
     "cpu": ["arm64"],
     "files": ["jre/**"]
   }
   ```

### 3. Test Locally

Before publishing:

1. **Build JRE locally**:
   ```bash
   node scripts/build-jre.js darwin arm64  # Or your platform
   ```

2. **Link package locally**:
   ```bash
   cd runtimes/@node-plantuml-2/jre-darwin-arm64
   npm link
   ```

3. **Test in main package**:
   ```bash
   cd ../../..
   npm link @node-plantuml-2/jre-darwin-arm64
   npm test
   ```

4. **Verify Java resolution**:
   ```javascript
   const javaResolver = require('./lib/java-resolver')
   const javaPath = javaResolver.resolveJavaExecutable()
   console.log('Resolved Java:', javaPath)
   ```

### 4. Publish Runtime Packages

For each platform:

```bash
cd runtimes/@node-plantuml-2/jre-{platform}-{arch}
npm publish --access public
```

**Note**: You may need to create an npm organization `@node-plantuml-2` first.

### 5. Update Main Package

After all runtime packages are published:

1. Update version in main `package.json` if needed
2. Update `optionalDependencies` versions if changed
3. Test installation:
   ```bash
   npm install node-plantuml-2
   ```

## 📋 Platform Support Matrix

| Platform | Architecture | Package Name | Status |
|----------|--------------|--------------|--------|
| Windows | x64 | `@node-plantuml-2/jre-win32-x64` | ⏳ To build |
| macOS | ARM64 | `@node-plantuml-2/jre-darwin-arm64` | ⏳ To build |
| macOS | x64 | `@node-plantuml-2/jre-darwin-x64` | ⏳ To build |
| Linux | x64 | `@node-plantuml-2/jre-linux-x64` | ⏳ To build |

## 🎯 Usage Examples

### Basic Usage (Automatic)

```javascript
const plantuml = require('node-plantuml-2')

// Automatically uses bundled JRE if available
// Falls back to system Java if not
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
```

### Custom Java Path

```javascript
plantuml.generate(code, {
  format: 'png',
  javaPath: '/path/to/custom/java'
})
```

## 📝 Notes

- Runtime packages are **large** (~50-100MB each)
- Only one platform package is downloaded per user (thanks to `optionalDependencies`)
- Packages are versioned independently from main package
- JRE uses minimal modules: `java.base`, `java.desktop`, `java.xml`

## 🔍 Testing Checklist

Before considering implementation complete:

- [ ] All 4 platform packages built
- [ ] All 4 platform packages published to npm
- [ ] Test installation on each platform
- [ ] Verify Java resolution works on each platform
- [ ] Test PlantUML generation with bundled JRE
- [ ] Test fallback to system Java
- [ ] Test custom javaPath option
- [ ] Verify npm installation only downloads matching platform
- [ ] Update main package version if needed

## 🐛 Known Issues / Limitations

- **First-time build**: Requires JDK 17+ with `jlink`
- **Cross-platform building**: May need to build on each target platform
- **Package size**: Large packages (~50-100MB each)
- **macOS notarization**: Not required for npm packages (only Electron apps)

## 📚 Reference

See:
- `docs/BUNDLED_JRE_ARCHITECTURE.md` - Architecture details
- `docs/BUILD_JRE_RUNTIMES.md` - Build instructions
- `lib/java-resolver.js` - Java resolution implementation

