# Bundled JRE Architecture

## 📋 Overview

This document describes the architecture for providing a bundled, lightweight JRE using `jlink`, allowing users to use `node-plantuml-2` without requiring Java to be installed on their system.

## 🏗️ Architecture

### Package Structure

```
node-plantuml-2/                    (Main package)
├── package.json
├── lib/
│   ├── java-resolver.js            (Java path resolution with fallback)
│   └── plantuml-executor.js        (Uses java-resolver)
└── ...

runtimes/                           (Separate runtime packages)
├── @node-plantuml-2/jre-win32-x64/
│   ├── package.json
│   └── jre/
│       └── bin/
│           └── java.exe
├── @node-plantuml-2/jre-darwin-arm64/
│   ├── package.json
│   └── jre/
│       └── bin/
│           └── java
├── @node-plantuml-2/jre-darwin-x64/
│   ├── package.json
│   └── jre/
│       └── bin/
│           └── java
└── @node-plantuml-2/jre-linux-x64/
    ├── package.json
    └── jre/
        └── bin/
            └── java
```

### Main Package Configuration

**package.json**:
```json
{
  "name": "node-plantuml-2",
  "optionalDependencies": {
    "@node-plantuml-2/jre-win32-x64": "^1.0.0",
    "@node-plantuml-2/jre-darwin-arm64": "^1.0.0",
    "@node-plantuml-2/jre-darwin-x64": "^1.0.0",
    "@node-plantuml-2/jre-linux-x64": "^1.0.0"
  }
}
```

**Benefits of `optionalDependencies`**:
- npm only installs the package matching the current platform
- Other platform packages are skipped automatically
- Installation failures don't break the main package
- Reduces package size for users (only one platform JRE downloaded)

## 🔍 Java Resolution Strategy

The `java-resolver.js` module implements a fallback strategy with the following priority:

### Priority Order

1. **User-specified path** (`options.javaPath`)
   - Highest priority - user explicitly wants to use a specific Java

2. **Bundled JRE** (from optional dependencies)
   - Resolves `@node-plantuml-2/jre-{platform}-{arch}` package
   - Extracts path to `jre/bin/java` (or `java.exe` on Windows)

3. **JAVA_HOME environment variable**
   - Uses `$JAVA_HOME/bin/java` (or `%JAVA_HOME%\bin\java.exe` on Windows)

4. **System Java in PATH**
   - Uses `which java` (Unix) or `where java` (Windows)
   - Fallback for users with system Java installed

### Resolution Flow

```
resolveJavaExecutable(options)
  ↓
Priority 1: options.javaPath
  ├─ Found → Return path ✅
  └─ Not found → Continue
  ↓
Priority 2: Bundled JRE
  ├─ Platform/arch supported?
  ├─ Package installed? (require.resolve)
  ├─ JRE exists? (fs.existsSync)
  ├─ Make executable (chmod +x on Unix)
  └─ Return path ✅
  └─ Not found → Continue
  ↓
Priority 3: JAVA_HOME
  ├─ Environment variable set?
  ├─ java executable exists?
  └─ Return path ✅
  └─ Not found → Continue
  ↓
Priority 4: System Java
  ├─ Try which/where java
  ├─ Executable exists?
  └─ Return path ✅
  └─ Not found → Return null ❌
```

## 🔧 JRE Creation with jlink

Each runtime package contains a minimal JRE created using `jlink`.

### Required Java Modules

For PlantUML to run, we need:
- `java.base` - Core Java runtime
- `java.desktop` - Required for AWT/headless mode
- `java.xml` - XML parsing (used by PlantUML)

### jlink Command

```bash
jlink \
  --add-modules java.base,java.desktop,java.xml \
  --strip-debug \
  --no-man-pages \
  --no-header-files \
  --compress=2 \
  --output jre
```

**Options explanation**:
- `--add-modules`: Include only required modules (minimal size)
- `--strip-debug`: Remove debug symbols (smaller size)
- `--no-man-pages`: Don't include manual pages
- `--no-header-files`: Don't include header files
- `--compress=2`: Use maximum compression
- `--output jre`: Output directory

### Platform-Specific Considerations

#### macOS

1. **Executable permissions**:
   ```bash
   chmod +x jre/bin/java
   ```

2. **Notarization**:
   - Not required for npm packages
   - Only needed for Electron apps distributing outside Mac App Store
   - npm packages don't trigger Gatekeeper checks

#### Windows

1. **Windows Defender**:
   - Generally no issues with `jlink`-created JREs
   - Avoid UPX compression (can trigger false positives)

#### Linux

1. **Executable permissions**:
   ```bash
   chmod +x jre/bin/java
   ```

## 📦 Runtime Package Structure

Each runtime package follows this structure:

```
@node-plantuml-2/jre-{platform}-{arch}/
├── package.json
└── jre/
    ├── bin/
    │   └── java (or java.exe)
    ├── lib/
    │   └── modules (compressed modules)
    └── release (version info)
```

### Example package.json

```json
{
  "name": "@node-plantuml-2/jre-darwin-arm64",
  "version": "1.0.0",
  "description": "Minimal JRE for node-plantuml-2 on macOS ARM64",
  "os": ["darwin"],
  "cpu": ["arm64"],
  "files": [
    "jre/**"
  ]
}
```

## 🚀 Usage

### For Users

Users simply install the package:

```bash
npm install node-plantuml-2
```

npm automatically:
- Installs main package
- Installs matching runtime package (e.g., `@node-plantuml-2/jre-darwin-arm64` on macOS ARM64)
- Skips other platform packages

### For Developers

The Java resolver is used automatically:

```javascript
const plantuml = require('node-plantuml-2')

// Uses bundled JRE automatically if available
// Falls back to system Java if not
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
```

### Custom Java Path

Users can specify a custom Java path:

```javascript
plantuml.generate(code, {
  format: 'png',
  javaPath: '/path/to/custom/java'
})
```

## 📊 Benefits

### For Users

✅ **Zero Java installation required**
- `npm install` is all that's needed
- No system-level Java installation
- Works like `esbuild` or `sharp` (bundled binaries)

✅ **Platform-specific downloads**
- Only downloads JRE for their platform
- Smaller total package size

### For Maintainers

✅ **No licensing issues**
- Uses standard OpenJDK with GPL+CE license
- Same license as Java itself

✅ **No complex porting**
- Standard Java runtime, no WASM conversion
- Full PlantUML compatibility

✅ **Standard npm patterns**
- Uses `optionalDependencies` (same as `sharp`, `esbuild`)
- No custom build processes for users

## 🛠️ Building Runtime Packages

### Prerequisites

- JDK 17+ (for `jlink`)
- Platform-specific JDK for each target platform (or cross-compilation)

### Build Process

1. **Create minimal JRE**:
   ```bash
   jlink --add-modules java.base,java.desktop,java.xml \
         --strip-debug \
         --no-man-pages \
         --no-header-files \
         --compress=2 \
         --output jre
   ```

2. **Set executable permissions** (Unix):
   ```bash
   chmod +x jre/bin/java
   ```

3. **Package**:
   ```bash
   npm pack
   ```

4. **Publish**:
   ```bash
   npm publish --access public
   ```

### Automated Build Scripts

See `scripts/build-jre-{platform}.js` for platform-specific build scripts.

## 🔍 Troubleshooting

### JRE not found

If bundled JRE is not available:
1. Check that optional dependency is installed: `npm ls @node-plantuml-2/jre-*`
2. Check platform/arch is supported
3. Falls back to system Java automatically

### Permission errors (macOS/Linux)

Ensure executable permissions:
```bash
chmod +x node_modules/@node-plantuml-2/jre-*/jre/bin/java
```

### Windows Defender warnings

- Normal with `jlink`-created JREs
- Users may need to allow in Windows Defender
- Not an issue for npm package distribution

## 📝 Notes

- JRE packages are large (~50-100MB), but only one is downloaded per user
- Packages are published separately for easier versioning
- Main package version can be independent of JRE package versions

