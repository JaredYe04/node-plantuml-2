# Changelog

All notable changes to this project will be documented in this file.

## [0.9.0] - 2024

### ✨ Added

- **Pure Node.js Support** - WebAssembly-based execution, no Java required
- **Multiple Output Formats** - Support for PNG, SVG, EPS, ASCII, and Unicode text
- **Full UTF-8 Support** - Perfect Chinese character rendering with automatic font configuration
- **Auto-update PlantUML JAR** - Automatic download of latest PlantUML from GitHub Releases
- **Smart Executor Selection** - Automatically uses Wasm (pure Node) with Java fallback
- **Batch Conversion Test Framework** - Test framework for batch processing PlantUML files
- **GitHub Actions CI/CD** - Automated testing and publishing workflows

### 🔧 Changed

- **Default Executor** - Now uses Wasm executor by default (pure Node.js)
- **Character Encoding** - Added UTF-8 support with proper JVM encoding parameters
- **Download Source** - Migrated from SourceForge to GitHub Releases for PlantUML JAR

### 📚 Documentation

- Complete bilingual README (English & Chinese)
- Pure Node.js usage guide
- Wasm integration documentation
- Build and implementation guides

### 🏗️ Architecture

- Hybrid execution model (Wasm primary, Java fallback)
- WebAssembly executor framework
- Maven-based Wasm build system
- Enhanced error handling and logging

### 🔄 Migration from node-plantuml

This project is a fork of [node-plantuml](https://github.com/markushedvall/node-plantuml) with the following enhancements:

- ✅ Pure Node.js support (no Java required)
- ✅ Multiple output formats
- ✅ Full UTF-8 and Chinese support
- ✅ Automatic PlantUML updates
- ✅ Improved error handling

All APIs remain compatible with the original node-plantuml package.

---

## Acknowledgments

This project is based on:

- **[PlantUML](http://plantuml.sourceforge.net/)** - The powerful diagramming tool by Arnaud Roques
- **[node-plantuml](https://github.com/markushedvall/node-plantuml)** - Original Node.js wrapper by Markus Hedvall
- **[Bytecoder](https://github.com/mirkosertic/Bytecoder)** - Java to WebAssembly compiler

Special thanks to all contributors and the PlantUML community!
