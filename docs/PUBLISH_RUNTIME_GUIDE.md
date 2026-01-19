# Publishing Runtime Packages Guide

## ✅ Pre-requisites

1. **Build JRE** - Ensure JRE is built for the target platform
2. **Create package.json** - Package.json should exist in the runtime directory
3. **Test locally** - Verify JRE works with PlantUML
4. **npm login** - Must be logged in to npm

## 🚀 Quick Start

### For Windows x64

```bash
# 1. Build JRE
node scripts/build-jre-windows.js

# 2. Test locally
node test/test-full-integration.js

# 3. Publish
node scripts/publish-runtime.js win32 x64
```

### Dry Run (Test without publishing)

```bash
node scripts/publish-runtime.js win32 x64 --dry-run
```

## 📋 Manual Steps

### 1. Build JRE

```bash
# Windows
node scripts/build-jre-windows.js

# Or use generic script
node scripts/build-jre.js win32 x64
```

### 2. Verify Package.json

Ensure `runtimes/@node-plantuml-2/jre-{platform}-{arch}/package.json` exists and is correct:

```json
{
  "name": "@node-plantuml-2/jre-win32-x64",
  "version": "1.0.0",
  "os": ["win32"],
  "cpu": ["x64"],
  "files": ["jre/**"]
}
```

### 3. Test Locally

```bash
node test/test-full-integration.js
```

All tests should pass.

### 4. Check npm Login

```bash
npm whoami
```

If not logged in:
```bash
npm login
```

### 5. Publish

#### Using Script

```bash
node scripts/publish-runtime.js win32 x64
```

#### Manual

```bash
cd runtimes/@node-plantuml-2/jre-win32-x64
npm publish --access public
```

## 📦 Version Management

Update version in `package.json` before publishing:

```json
{
  "version": "1.0.1"  // Increment as needed
}
```

## ✅ Verification

After publishing, verify the package:

1. **Check npm registry**:
   ```bash
   npm view @node-plantuml-2/jre-win32-x64
   ```

2. **Test installation**:
   ```bash
   npm install @node-plantuml-2/jre-win32-x64
   ```

3. **Verify in node_modules**:
   ```bash
   ls node_modules/@node-plantuml-2/jre-win32-x64/jre/bin/java.exe
   ```

## 🐛 Troubleshooting

### "Package already exists"

If package with same version already exists:
- Increment version in `package.json`
- Or use `npm publish --access public --tag beta` for beta releases

### "Not logged in"

```bash
npm login
```

### "Access denied"

Ensure you have access to `@node-plantuml-2` organization:
```bash
npm org ls node-plantuml-2
```

## 📝 Checklist

Before publishing each runtime package:

- [ ] JRE built successfully
- [ ] `package.json` exists and is correct
- [ ] Version number updated
- [ ] Local tests pass
- [ ] npm login verified
- [ ] Dry run successful (optional)
- [ ] Ready to publish

