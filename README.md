# node-plantuml-2

> **Node.js PlantUML Renderer with Java Backend**

[![npm version](https://img.shields.io/npm/v/node-plantuml-2)](https://www.npmjs.com/package/node-plantuml-2)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D12-green.svg)](https://nodejs.org/)

A powerful Node.js module and CLI for running [PlantUML](http://plantuml.sourceforge.net/). This project is a fork and enhancement of [node-plantuml](https://github.com/markushedvall/node-plantuml), providing improved performance with Nailgun optimization for faster Java startup.

<div align="center">

**[English](#english) | [中文](#中文)**

</div>

---

<a name="english"></a>

## ✨ Key Features

- 🎯 **Zero Java Installation Required** - **Java is automatically bundled!** Just `npm install` and it works - no manual Java setup needed
- 📦 **Auto-Integrated JRE** - Automatically installs a lightweight JRE (40-60MB) for your platform during `npm install`
- 🚀 **Optimized Java Execution** - Uses Nailgun for faster Java startup, keeping JVM resident in memory
- 🎨 **Multiple Output Formats** - Support for PNG, SVG, EPS, ASCII, and Unicode text
- 🌏 **Multi-language Support** - Perfect rendering for Chinese, Japanese, Korean, and other CJK characters with automatic font detection
- ⚡ **Fast Performance** - Nailgun optimization reduces Java startup overhead
- 📝 **CLI & API** - Both command-line interface and programmatic API
- 🎯 **Based on PlantUML** - Full compatibility with PlantUML syntax

---

## 📦 Installation

### Quick Install (Recommended)

```bash
npm install node-plantuml-2
```

**That's it! 🎉 No Java installation needed!**

The package **automatically detects your platform** and installs a lightweight, bundled JRE (40-60MB) during `npm install`. You don't need to install Java separately - it's handled automatically!

**How it works:**
- During `npm install`, the package detects your operating system and architecture
- Automatically downloads and installs the matching JRE runtime package for your platform:
  - **Windows x64** → `@node-plantuml-2/jre-win32-x64`
  - **macOS ARM64** → `@node-plantuml-2/jre-darwin-arm64`
  - **Linux x64** → `@node-plantuml-2/jre-linux-x64`
- Only the JRE for your platform is installed (others are skipped automatically)
- Works out of the box - no configuration needed!

For global CLI installation:

```bash
npm install node-plantuml-2 -g
```

**⚠️ Important:** You do NOT need to install Java on your system. The bundled JRE is automatically integrated when you install this npm package.

### Java Requirements

**🎯 Zero Java Installation Required!**

This package **automatically bundles a minimal JRE** during installation. You do **NOT** need to install Java on your system!

**Automatic JRE Integration:**

When you run `npm install node-plantuml-2`, the package:
1. **Detects your platform** (Windows/macOS/Linux and architecture)
2. **Automatically downloads** the matching lightweight JRE (40-60MB)
3. **Integrates it seamlessly** - no manual setup needed
4. **Works immediately** after installation completes

**Java Resolution Priority:**

The package uses the following priority to find Java:

1. **Bundled JRE** (Primary) ⭐ - Automatically installed during `npm install`
   - Platform-specific: only your platform's JRE is downloaded
   - Lightweight: ~40-60MB, built with `jlink` for optimal size
   - Zero configuration: works out of the box

2. **System Java** (Fallback) - If bundled JRE is unavailable, uses system Java if present
   - Checks `JAVA_HOME` environment variable
   - Checks system PATH for `java` command

3. **Custom Java** (Optional) - Override with custom Java path:
   ```javascript
   plantuml.generate(code, { javaPath: '/custom/path/to/java' })
   ```

**Supported Platforms (with automatic JRE):**
- ✅ Windows x64 - JRE automatically bundled
- ✅ macOS ARM64 (Apple Silicon) - JRE automatically bundled
- ✅ Linux x64 - JRE automatically bundled

**Summary: Install the npm package, Java is included automatically! No separate Java installation needed.**

---

## 🚀 Quick Start

### Basic Usage

```javascript
const plantuml = require('node-plantuml-2')
const fs = require('fs')

// Generate PNG diagram
const gen = plantuml.generate('@startuml\nA -> B: Hello\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

### Multiple Output Formats

```javascript
// PNG (default)
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })

// SVG (vector graphics)
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'svg' })

// EPS (PostScript)
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'eps' })

// ASCII text
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'ascii' })

// Unicode text
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'unicode' })
```

### Multi-language Support

```javascript
// Full UTF-8 support for Chinese, Japanese, Korean, and other CJK languages
// Automatic font detection and configuration
const gen = plantuml.generate('@startuml\n用户 -> 系统: 登录\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

---

## 📚 API Documentation

### `plantuml.generate(input, options?)`

Generate a diagram from PlantUML source.

**Parameters:**

- `input`: `string | undefined` - PlantUML source code, file path, or undefined (for stdin)
- `options`: `object` (optional)
  - `format`: `'png' | 'svg' | 'eps' | 'ascii' | 'unicode'` - Output format (default: `'png'`)
  - `config`: `string` - Path to config file or template name (`'classic'`, `'monochrome'`)
  - `dot`: `string` - Path to Graphviz dot executable
  - `include`: `string` - Include path for PlantUML files
  - `charset`: `string` - Character set (default: UTF-8)
  - `autoFix`: `boolean` - Enable automatic syntax fixing and formatting (default: `false`)
    - Automatically fixes common syntax errors like unquoted text with special characters
    - Adds quotes around labels, class names, participant names, etc. that contain special characters
    - Logs warnings to console when fixes are applied
  - `warnOnFix`: `boolean` - Show console warnings when auto-fixes are applied (default: `true`)
  - `normalizeWhitespace`: `boolean` - Normalize whitespace (remove trailing spaces, normalize blank lines) (default: `true` when autoFix is enabled)

**Returns:**

- `object` with:
  - `in`: `stream.Writable` - Input stream (if no input provided)
  - `out`: `stream.Readable` - Output stream (diagram data)

**Examples:**

```javascript
// From file
const gen = plantuml.generate('diagram.puml', { format: 'svg' })
gen.out.pipe(fs.createWriteStream('diagram.svg'))

// From text
const gen = plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))

// From stdin
const gen = plantuml.generate({ format: 'png' })
process.stdin.pipe(gen.in)
gen.out.pipe(process.stdout)

// With automatic syntax fixing
const gen = plantuml.generate('@startuml\nA -> B: label with <special> chars\n@enduml', { 
  format: 'png',
  autoFix: true  // Automatically fixes unquoted text with special characters
})
gen.out.pipe(fs.createWriteStream('output.png'))
// Console will show: [PlantUML Syntax Fixer] Applied 1 fix(es): - Fixed unquoted arrow label
```

### `plantuml.encode(input, options?, callback?)`

Encode PlantUML source to URL-safe format.

```javascript
plantuml.encode('@startuml\nA -> B\n@enduml', (err, encoded) => {
  console.log(encoded) // URL-safe encoded string
})
```

### `plantuml.decode(encoded, callback?)`

Decode URL-encoded PlantUML source.

```javascript
const decode = plantuml.decode('SrJGjLDmibBmICt9oGS0')
decode.out.pipe(process.stdout)
```

### `plantuml.fixSyntax(code, options?, callback?)`

Standalone syntax fixing service. Checks if PlantUML code has syntax errors by attempting to render it, and if errors are detected, automatically fixes common syntax issues.

**Key Features:**
- ✅ **Safe by default** - Only fixes code if syntax errors are detected
- ✅ **Non-destructive** - Returns original code unchanged if no errors found
- ✅ **Automatic detection** - Uses actual rendering to detect real syntax errors
- ✅ **Comprehensive fixes** - Fixes unquoted text with special characters, missing quotes, etc.

**Parameters:**
- `code`: `string` - PlantUML source code to check and fix
- `options`: `object` (optional)
  - `warnOnFix`: `boolean` - Show console warnings when fixes are applied (default: `true`)
  - `normalizeWhitespace`: `boolean` - Normalize whitespace (default: `true`)
- `callback`: `Function` - Callback with `(error, fixedCode, wasFixed)`
  - `error`: `Error | null` - Error if check failed
  - `fixedCode`: `string` - Fixed code (or original if no errors)
  - `wasFixed`: `boolean` - Whether code was actually fixed

**Examples:**

```javascript
// Fix syntax errors automatically
plantuml.fixSyntax('@startuml\nA -> B: label with <special> chars\n@enduml', (err, fixed, wasFixed) => {
  if (err) {
    console.error('Error:', err)
    return
  }
  if (wasFixed) {
    console.log('Code was fixed:', fixed)
  } else {
    console.log('Code is valid, no changes needed')
  }
})

// With options
plantuml.fixSyntax(code, {
  warnOnFix: false,  // Don't show warnings
  normalizeWhitespace: true
}, (err, fixed, wasFixed) => {
  // Use fixed code
})

// Valid code remains unchanged
plantuml.fixSyntax('@startuml\nA -> B\n@enduml', (err, fixed, wasFixed) => {
  // wasFixed will be false, fixed === original code
})
```

**How it works:**
1. Attempts to render the code as SVG
2. Checks for syntax errors in the output
3. If errors detected, applies automatic fixes
4. Verifies the fixed code works
5. Returns fixed code or original if no errors

---

## 🖥️ Command Line Interface

### Basic Commands

```bash
# Generate PNG from file
puml generate diagram.puml -o diagram.png

# Generate SVG
puml generate diagram.puml -s -o diagram.svg

# Generate ASCII text
puml generate diagram.puml -a

# Generate Unicode text
puml generate diagram.puml -u

# From stdin
cat diagram.puml | puml generate > output.png

# One-liner
puml generate --text "@startuml\nA -> B\n@enduml" -o output.png
```

### All CLI Options

```bash
Usage: puml [options] [command]

Commands:
  generate [options] [file]  Generate an UML diagram from PlantUML source
  encode [options] [file]     Encodes PlantUML source
  decode <url>                Decodes PlantUML source
  testdot                     Test the installation of Graphviz dot

Options:
  -h, --help                  output usage information
  -V, --version               output the version number

Generate Options:
  -p, --png                   output as PNG image (default)
  -s, --svg                   output as SVG image
  -e, --eps                   output as EPS image
  -u, --unicode               output as Unicode text
  -a, --ascii                 output as ASCII text
  -o, --output [file]         output file path
  -c, --config [file]         config file or template (classic, monochrome)
  -t, --text [text]           PlantUML text to generate from
  -d, --dot [file]            Graphviz dot executable path
  -i, --include [path]        include path for PlantUML files
  -C, --charset [charset]     charset of PlantUML source
```

---

## 🎨 Output Formats

### PNG (Default)

Raster image format, perfect for sharing and embedding.

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
```

### SVG

Vector graphics format, scalable and perfect for web.

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'svg' })
```

### EPS

PostScript format, ideal for print and LaTeX documents.

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'eps' })
```

### ASCII Text

Plain ASCII text representation.

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'ascii' })
// Output:
// +---+     +---+
// | A | --> | B |
// +---+     +---+
```

### Unicode Text

Unicode text with box-drawing characters.

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'unicode' })
// Output:
// ┌───┐     ┌───┐
// │ A │ ──> │ B │
// └───┘     └───┘
```

---

## 🌏 Multi-language & UTF-8 Support

Full UTF-8 support with automatic font configuration for multiple languages. The library automatically detects and configures appropriate fonts for:

- **Chinese (中文)** - Simplified and Traditional
- **Japanese (日本語)** - Hiragana, Katakana, Kanji
- **Korean (한국어)** - Hangul characters
- **Other CJK languages** - With fallback to system fonts

**Automatic Font Selection:**
- Windows: Microsoft YaHei (Chinese/Japanese), Malgun Gothic (Korean)
- macOS: PingFang SC (Chinese/Japanese), AppleGothic (Korean)
- Linux: Noto Sans CJK SC (all CJK languages)

**Examples:**

```javascript
// Chinese
const gen = plantuml.generate(`
@startuml
用户 -> 系统: 发送请求
系统 -> 数据库: 查询数据
数据库 --> 系统: 返回结果
系统 --> 用户: 响应数据
@enduml
`, { format: 'png' })

// Japanese
const gen2 = plantuml.generate(`
@startuml
ユーザー -> システム: リクエスト送信
システム -> データベース: データ照会
@enduml
`, { format: 'png' })

// Korean
const gen3 = plantuml.generate(`
@startuml
사용자 -> 시스템: 요청 전송
시스템 -> 데이터베이스: 데이터 조회
@enduml
`, { format: 'png' })
```

The font configuration is automatically added when CJK characters are detected in your PlantUML code.

---

## ⚙️ Advanced Usage

### Using Config Templates

```javascript
// Classic black and white style
plantuml.generate('diagram.puml', { 
  format: 'png',
  config: 'classic' 
})

// Monochrome style
plantuml.generate('diagram.puml', { 
  format: 'png',
  config: 'monochrome' 
})

// Custom config file
plantuml.generate('diagram.puml', { 
  format: 'png',
  config: './my-config.puml' 
})
```

### Web Server Example

```javascript
const express = require('express')
const plantuml = require('node-plantuml-2')

const app = express()

app.get('/png/:uml', (req, res) => {
  res.set('Content-Type', 'image/png')
  const decode = plantuml.decode(req.params.uml)
  const gen = plantuml.generate({ format: 'png' })
  decode.out.pipe(gen.in)
  gen.out.pipe(res)
})

app.get('/svg/:uml', (req, res) => {
  res.set('Content-Type', 'image/svg+xml')
  const decode = plantuml.decode(req.params.uml)
  const gen = plantuml.generate({ format: 'svg' })
  decode.out.pipe(gen.in)
  gen.out.pipe(res)
})

app.listen(8080)
```

---

## 🏗️ Architecture

This project uses **Java execution** with automatic JRE bundling and optimization:

1. **Bundled JRE** (Automatic)
   - Lightweight minimal JRE (~40-60MB) installed automatically via `optionalDependencies`
   - Built with `jlink` for optimal size
   - Platform-specific packages ensure only relevant JRE is installed
   - **No manual Java installation required!**

2. **Java Executor** (Primary)
   - Uses bundled JRE or system Java to execute `java -jar plantuml.jar`
   - Full compatibility with PlantUML features
   - Automatic Java path resolution with fallback strategy

3. **Nailgun Optimization** (Optional, for performance)
   - Keeps JVM resident in memory for faster startup
   - Use `plantumlExecutor.useNailgun()` to enable
   - Reduces startup overhead significantly

### Execution Flow

```
User Code
    ↓
plantuml.generate()
    ↓
plantumlExecutor.exec()
    ↓
Java Path Resolution (Priority Order)
    ├─ options.javaPath (User specified)
    ├─ Bundled JRE (Auto-installed)
    ├─ JAVA_HOME (System env var)
    └─ System PATH java
    ↓
Check if Nailgun is running
    ├─ Running → Use Nailgun (faster)
    └─ Not running → Use spawn('java', ...)
    ↓
Execute PlantUML JAR
    ↓
Generate Diagram
    ↓
Return Stream
```

---

## 📋 System Requirements

- **Node.js 12+** - That's it!
- ~~**Java Runtime Environment (JRE)**~~ - **NOT REQUIRED!** Automatically bundled during `npm install`
- **Graphviz** (optional, for advanced diagram types)

**✅ Supported Platforms (with automatic JRE integration):**
- Windows x64 - JRE automatically installed during `npm install`
- macOS ARM64 (Apple Silicon) - JRE automatically installed during `npm install`
- Linux x64 - JRE automatically installed during `npm install`

**🎯 Key Point:** You only need Node.js installed. The Java runtime is automatically downloaded and integrated when you install this package. **No manual Java installation or configuration needed!**

The bundled JRE is lightweight (~40-60MB) and specifically built for your platform.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Batch conversion test
npm run test:batch

# Test specific format
npm run test:batch:svg
npm run test:batch:png
```

---

## 📝 Changelog

### v1.0.2

- 🌏 **Multi-language Support** - Perfect rendering for Chinese, Japanese, Korean with automatic font detection
- 📦 **Auto-update** - Automatic PlantUML JAR updates from GitHub Releases
- 🎨 **Multiple Formats** - PNG, SVG, EPS, ASCII, Unicode support
- ⚡ **Performance Optimization** - Nailgun support for faster Java startup
- 🧹 **Code Cleanup** - Removed non-functional Wasm implementation (see docs/WASM_BUILD_LIMITATIONS.md)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

This project is based on:

- **[PlantUML](http://plantuml.sourceforge.net/)** - The powerful diagramming tool
- **[node-plantuml](https://github.com/markushedvall/node-plantuml)** - Original Node.js wrapper by Markus Hedvall

Special thanks to the PlantUML community and all contributors!

---

**Made with ❤️ for developers who need PlantUML in pure Node.js**

---

<a name="中文"></a>

<div align="center">

**[English](#english) | [中文](#中文)**

</div>

---

# node-plantuml-2

> **Node.js PlantUML 渲染器 - 基于 Java 后端**

[![npm version](https://img.shields.io/npm/v/node-plantuml-2)](https://www.npmjs.com/package/node-plantuml-2)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D12-green.svg)](https://nodejs.org/)

一个强大的 Node.js 模块和 CLI，用于运行 [PlantUML](http://plantuml.sourceforge.net/)。本项目基于 [node-plantuml](https://github.com/markushedvall/node-plantuml) Fork 并增强，通过 Nailgun 优化提供更快的 Java 启动性能。

## ✨ 核心特性

- 🎯 **零 Java 安装要求** - **Java 自动集成！** 只需 `npm install` 即可使用 - 无需手动安装 Java
- 📦 **自动集成 JRE** - 安装 npm 包时自动为您的平台下载并安装轻量级 JRE（40-60MB）
- 🚀 **优化的 Java 执行** - 使用 Nailgun 加速 Java 启动，保持 JVM 常驻内存
- 🎨 **多种输出格式** - 支持 PNG、SVG、EPS、ASCII 和 Unicode 文本
- 🌏 **多语言支持** - 完美支持中文、日文、韩文等多种 CJK 字符渲染，自动字体检测和配置
- ⚡ **高性能** - Nailgun 优化减少 Java 启动开销
- 📝 **CLI 和 API** - 同时提供命令行界面和编程 API
- 🏗️ **基于 PlantUML** - 完全兼容 PlantUML 语法

---

## 📦 安装

### 快速安装（推荐）

```bash
npm install node-plantuml-2
```

**就这么简单！🎉 无需安装 Java！**

该包会在安装时**自动检测您的平台**并安装轻量级 JRE（40-60MB）。您无需单独安装 Java - 一切自动处理！

**工作原理：**
- 运行 `npm install` 时，包会自动检测您的操作系统和架构
- 自动下载并安装匹配平台的 JRE runtime 包：
  - **Windows x64** → `@node-plantuml-2/jre-win32-x64`
  - **macOS ARM64** → `@node-plantuml-2/jre-darwin-arm64`
  - **Linux x64** → `@node-plantuml-2/jre-linux-x64`
- 只安装您平台的 JRE（其他平台自动跳过）
- 开箱即用 - 无需配置！

全局安装 CLI：

```bash
npm install node-plantuml-2 -g
```

**⚠️ 重要提示：** 您**无需**在系统上安装 Java。JRE 会在安装此 npm 包时自动集成。

### Java 要求

**🎯 零 Java 安装要求！**

此包在安装时**自动集成最小 JRE**。您**无需**在系统上安装 Java！

**自动 JRE 集成：**

当您运行 `npm install node-plantuml-2` 时，包会：
1. **检测您的平台**（Windows/macOS/Linux 和架构）
2. **自动下载**匹配的轻量级 JRE（40-60MB）
3. **无缝集成** - 无需手动设置
4. **立即可用** - 安装完成后即可使用

**Java 解析优先级：**

包使用以下优先级查找 Java：

1. **捆绑的 JRE**（主要方式）⭐ - 在 `npm install` 时自动安装
   - 平台特定：只下载您平台的 JRE
   - 轻量级：约 40-60MB，使用 `jlink` 构建以获得最佳体积
   - 零配置：开箱即用

2. **系统 Java**（后备方案）- 如果捆绑的 JRE 不可用，会使用系统 Java（如果存在）
   - 检查 `JAVA_HOME` 环境变量
   - 检查系统 PATH 中的 `java` 命令

3. **自定义 Java**（可选）- 使用自定义 Java 路径覆盖：
   ```javascript
   plantuml.generate(code, { javaPath: '/custom/path/to/java' })
   ```

**支持的平台（带自动 JRE）：**
- ✅ Windows x64 - 自动集成 JRE
- ✅ macOS ARM64 (Apple Silicon) - 自动集成 JRE
- ✅ Linux x64 - 自动集成 JRE

**总结：安装 npm 包，Java 自动包含在内！无需单独安装 Java。**

---

## 🚀 快速开始

### 基础用法

```javascript
const plantuml = require('node-plantuml-2')
const fs = require('fs')

// 生成 PNG 图表
const gen = plantuml.generate('@startuml\nA -> B: Hello\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

### 多种输出格式

```javascript
// PNG（默认）
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })

// SVG（矢量图形）
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'svg' })

// EPS（PostScript）
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'eps' })

// ASCII 文本
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'ascii' })

// Unicode 文本
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'unicode' })
```

### 多语言支持

```javascript
// 完整 UTF-8 支持，支持中文、日文、韩文等多种 CJK 语言
// 自动字体检测和配置
const gen = plantuml.generate('@startuml\n用户 -> 系统: 登录\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

---

## 📚 API 文档

### `plantuml.generate(input, options?)`

从 PlantUML 源码生成图表。

**参数：**

- `input`: `string | undefined` - PlantUML 源码、文件路径或 undefined（用于 stdin）
- `options`: `object` (可选)
  - `format`: `'png' | 'svg' | 'eps' | 'ascii' | 'unicode'` - 输出格式（默认：`'png'`）
  - `config`: `string` - 配置文件路径或模板名称（`'classic'`, `'monochrome'`）
  - `dot`: `string` - Graphviz dot 可执行文件路径
  - `include`: `string` - PlantUML 文件的包含路径
  - `charset`: `string` - 字符集（默认：UTF-8）

**返回值：**

- `object` 包含：
  - `in`: `stream.Writable` - 输入流（如果未提供输入）
  - `out`: `stream.Readable` - 输出流（图表数据）

**示例：**

```javascript
// 从文件
const gen = plantuml.generate('diagram.puml', { format: 'svg' })
gen.out.pipe(fs.createWriteStream('diagram.svg'))

// 从文本
const gen = plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))

// 从标准输入
const gen = plantuml.generate({ format: 'png' })
process.stdin.pipe(gen.in)
gen.out.pipe(process.stdout)
```

### `plantuml.encode(input, options?, callback?)`

将 PlantUML 源码编码为 URL 安全格式。

```javascript
plantuml.encode('@startuml\nA -> B\n@enduml', (err, encoded) => {
  console.log(encoded) // URL 安全编码字符串
})
```

### `plantuml.decode(encoded, callback?)`

解码 URL 编码的 PlantUML 源码。

```javascript
const decode = plantuml.decode('SrJGjLDmibBmICt9oGS0')
decode.out.pipe(process.stdout)
```

### `plantuml.fixSyntax(code, options?, callback?)`

独立的语法修复服务。通过实际渲染来检测 PlantUML 代码是否有语法错误，如果检测到错误，则自动修复常见的语法问题。

**核心特性：**
- ✅ **默认安全** - 仅在检测到语法错误时才修复
- ✅ **非破坏性** - 如果没有错误，返回原始代码不变
- ✅ **自动检测** - 使用实际渲染来检测真正的语法错误
- ✅ **全面修复** - 修复包含特殊字符的未加引号文本、缺少引号等问题

**参数：**
- `code`: `string` - 要检查和修复的 PlantUML 源码
- `options`: `object` (可选)
  - `warnOnFix`: `boolean` - 应用修复时显示控制台警告（默认：`true`）
  - `normalizeWhitespace`: `boolean` - 规范化空白字符（默认：`true`）
- `callback`: `Function` - 回调函数 `(error, fixedCode, wasFixed)`
  - `error`: `Error | null` - 检查失败时的错误
  - `fixedCode`: `string` - 修复后的代码（如果没有错误则返回原始代码）
  - `wasFixed`: `boolean` - 代码是否实际被修复

**示例：**

```javascript
// 自动修复语法错误
plantuml.fixSyntax('@startuml\nA -> B: label with <special> chars\n@enduml', (err, fixed, wasFixed) => {
  if (err) {
    console.error('错误:', err)
    return
  }
  if (wasFixed) {
    console.log('代码已修复:', fixed)
  } else {
    console.log('代码有效，无需更改')
  }
})

// 带选项
plantuml.fixSyntax(code, {
  warnOnFix: false,  // 不显示警告
  normalizeWhitespace: true
}, (err, fixed, wasFixed) => {
  // 使用修复后的代码
})

// 有效代码保持不变
plantuml.fixSyntax('@startuml\nA -> B\n@enduml', (err, fixed, wasFixed) => {
  // wasFixed 将为 false，fixed === 原始代码
})
```

**工作原理：**
1. 尝试将代码渲染为 SVG
2. 检查输出中的语法错误
3. 如果检测到错误，应用自动修复
4. 验证修复后的代码是否有效
5. 返回修复后的代码，如果没有错误则返回原始代码

---

## 🖥️ 命令行界面

### 基础命令

```bash
# 从文件生成 PNG
puml generate diagram.puml -o diagram.png

# 生成 SVG
puml generate diagram.puml -s -o diagram.svg

# 生成 ASCII 文本
puml generate diagram.puml -a

# 生成 Unicode 文本
puml generate diagram.puml -u

# 从标准输入
cat diagram.puml | puml generate > output.png

# 一行命令
puml generate --text "@startuml\nA -> B\n@enduml" -o output.png
```

### 所有 CLI 选项

```bash
用法: puml [选项] [命令]

命令:
  generate [选项] [文件]  从 PlantUML 源码生成 UML 图表
  encode [选项] [文件]    编码 PlantUML 源码
  decode <url>            解码 PlantUML 源码
  testdot                 测试 Graphviz dot 安装

选项:
  -h, --help              显示帮助信息
  -V, --version          显示版本号

生成选项:
  -p, --png              输出为 PNG 图片（默认）
  -s, --svg              输出为 SVG 图片
  -e, --eps              输出为 EPS 图片
  -u, --unicode          输出为 Unicode 文本
  -a, --ascii            输出为 ASCII 文本
  -o, --output [文件]    输出文件路径
  -c, --config [文件]    配置文件或模板（classic, monochrome）
  -t, --text [文本]      要生成的 PlantUML 文本
  -d, --dot [文件]       Graphviz dot 可执行文件路径
  -i, --include [路径]   PlantUML 文件的包含路径
  -C, --charset [字符集] PlantUML 源码的字符集
```

---

## 🎨 输出格式

### PNG（默认）

位图格式，适合分享和嵌入。

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
```

### SVG

矢量图形格式，可缩放，适合网页使用。

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'svg' })
```

### EPS

PostScript 格式，适合打印和 LaTeX 文档。

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'eps' })
```

### ASCII 文本

纯 ASCII 文本表示。

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'ascii' })
// 输出:
// +---+     +---+
// | A | --> | B |
// +---+     +---+
```

### Unicode 文本

使用框线字符的 Unicode 文本。

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'unicode' })
// 输出:
// ┌───┐     ┌───┐
// │ A │ ──> │ B │
// └───┘     └───┘
```

---

## 🌏 多语言和 UTF-8 支持

完整 UTF-8 支持，自动为多种语言配置合适的字体。库会自动检测并配置以下语言的字体：

- **中文** - 简体中文和繁体中文
- **日文（日本語）** - 平假名、片假名、汉字
- **韩文（한국어）** - 韩文字符
- **其他 CJK 语言** - 使用系统字体作为后备方案

**自动字体选择：**
- Windows: Microsoft YaHei（中文/日文）、Malgun Gothic（韩文）
- macOS: PingFang SC（中文/日文）、AppleGothic（韩文）
- Linux: Noto Sans CJK SC（所有 CJK 语言）

**示例：**

```javascript
// 中文
const gen = plantuml.generate(`
@startuml
用户 -> 系统: 发送请求
系统 -> 数据库: 查询数据
数据库 --> 系统: 返回结果
系统 --> 用户: 响应数据
@enduml
`, { format: 'png' })

// 日文
const gen2 = plantuml.generate(`
@startuml
ユーザー -> システム: リクエスト送信
システム -> データベース: データ照会
@enduml
`, { format: 'png' })

// 韩文
const gen3 = plantuml.generate(`
@startuml
사용자 -> 시스템: 요청 전송
시스템 -> 데이터베이스: 데이터 조회
@enduml
`, { format: 'png' })
```

当检测到 PlantUML 代码中包含 CJK 字符时，会自动添加字体配置。

---

## ⚙️ 高级用法

### 使用配置模板

```javascript
// 经典黑白风格
plantuml.generate('diagram.puml', { 
  format: 'png',
  config: 'classic' 
})

// 单色风格
plantuml.generate('diagram.puml', { 
  format: 'png',
  config: 'monochrome' 
})

// 自定义配置文件
plantuml.generate('diagram.puml', { 
  format: 'png',
  config: './my-config.puml' 
})
```

### Web 服务器示例

```javascript
const express = require('express')
const plantuml = require('node-plantuml-2')

const app = express()

app.get('/png/:uml', (req, res) => {
  res.set('Content-Type', 'image/png')
  const decode = plantuml.decode(req.params.uml)
  const gen = plantuml.generate({ format: 'png' })
  decode.out.pipe(gen.in)
  gen.out.pipe(res)
})

app.get('/svg/:uml', (req, res) => {
  res.set('Content-Type', 'image/svg+xml')
  const decode = plantuml.decode(req.params.uml)
  const gen = plantuml.generate({ format: 'svg' })
  decode.out.pipe(gen.in)
  gen.out.pipe(res)
})

app.listen(8080)
```

### 强制使用 Java 执行器（可选）

如果希望使用 Java 执行器（需要安装 Java）：

```bash
PLANTUML_USE_JAVA=true node your-script.js
```

---

## 🏗️ 架构

本项目使用**Java 执行**，并自动捆绑 JRE 和进行优化：

1. **捆绑的 JRE**（自动）
   - 轻量级最小 JRE（约 40-60MB）通过 `optionalDependencies` 自动安装
   - 使用 `jlink` 构建以获得最佳体积
   - 特定平台的包确保只安装相关的 JRE
   - **无需手动安装 Java！**

2. **Java 执行器**（主要）
   - 使用捆绑的 JRE 或系统 Java 执行 `java -jar plantuml.jar`
   - 完全支持 PlantUML 的所有功能
   - 自动 Java 路径解析，带后备策略

3. **Nailgun 优化**（可选，用于性能提升）
   - 保持 JVM 常驻内存以加速启动
   - 使用 `plantumlExecutor.useNailgun()` 启用
   - 显著减少启动开销

### 执行流程

```
用户代码
    ↓
plantuml.generate()
    ↓
plantumlExecutor.exec()
    ↓
Java 路径解析（优先级顺序）
    ├─ options.javaPath（用户指定）
    ├─ 捆绑的 JRE（自动安装）
    ├─ JAVA_HOME（系统环境变量）
    └─ 系统 PATH 中的 java
    ↓
检查 Nailgun 是否运行
    ├─ 运行中 → 使用 Nailgun（更快）
    └─ 未运行 → 使用 spawn('java', ...)
    ↓
执行 PlantUML JAR
    ↓
生成图表
    ↓
返回流
```

---

## 📋 系统要求

- **Node.js 12+** - 仅此而已！
- ~~**Java Runtime Environment (JRE)**~~ - **不需要！** 在 `npm install` 时自动集成
- **Graphviz**（可选，用于高级图表类型）

**✅ 支持的平台（带自动 JRE 集成）：**
- Windows x64 - 在 `npm install` 时自动安装 JRE
- macOS ARM64 (Apple Silicon) - 在 `npm install` 时自动安装 JRE
- Linux x64 - 在 `npm install` 时自动安装 JRE

**🎯 关键点：** 您只需要安装 Node.js。Java 运行时会在您安装此包时自动下载并集成。**无需手动安装或配置 Java！**

捆绑的 JRE 轻量级（约 40-60MB），专门为您的平台构建。

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 批量转换测试
npm run test:batch

# 测试特定格式
npm run test:batch:svg
npm run test:batch:png
```

---

## 📝 更新日志

### v1.0.2

- 🌏 **多语言支持** - 完美支持中文、日文、韩文等多种语言，自动字体检测
- 📦 **自动更新** - 从 GitHub Releases 自动更新 PlantUML JAR
- 🎨 **多种格式** - PNG、SVG、EPS、ASCII、Unicode 支持
- ⚡ **性能优化** - Nailgun 支持以加速 Java 启动
- 🧹 **代码清理** - 移除了不可用的 Wasm 实现（参见 docs/WASM_BUILD_LIMITATIONS.md）

---

## 🤝 贡献

欢迎贡献！请随时提交 Issue 和 Pull Request。

---

## 📄 许可证

MIT License

---

## 🙏 致谢

本项目基于：

- **[PlantUML](http://plantuml.sourceforge.net/)** - 强大的图表工具
- **[node-plantuml](https://github.com/markushedvall/node-plantuml)** - Markus Hedvall 的原始 Node.js 包装器

特别感谢 PlantUML 社区和所有贡献者！

---

**Made with ❤️ for developers who need PlantUML in pure Node.js**
