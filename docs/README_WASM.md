# PlantUML Wasm 执行器

本项目现在支持通过 WebAssembly (Wasm) 运行 PlantUML，无需本地 Java 运行时！

## 快速开始

### 1. 构建 Wasm 模块

```bash
# 下载最新 PlantUML JAR
node scripts/get-plantuml-jar.js --latest

# 构建 Wasm 模块
npm run build:wasm
```

### 2. 使用 Wasm 执行器

```javascript
// 启用 Wasm 模式
process.env.PLANTUML_USE_WASM = 'true'

var plantuml = require('node-plantuml')
var fs = require('fs')

var gen = plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

### 3. 命令行使用

```bash
# 使用 Wasm 模式生成图表
PLANTUML_USE_WASM=true puml generate input.puml -o output.png
```

## 优势

✅ **无需 Java**: 不需要安装 Java 运行时  
✅ **跨平台**: 统一的 Wasm 二进制格式  
✅ **启动更快**: Wasm 模块加载比 JVM 快  
✅ **内存更小**: Wasm 模块内存占用更小  
✅ **自动降级**: Wasm 不可用时自动使用 Java 执行器  

## 系统要求

- **Node.js 12+** (推荐 20+ 以获得稳定的 WASI 支持)
- **PlantUML JAR** (自动下载到 `vendor/plantuml.jar`)
- **Wasm 模块** (通过 `npm run build:wasm` 构建)

## 架构

```
PlantUML Java 源码
    ↓
JVM 字节码 (.jar)
    ↓
Bytecoder/TeaVM 编译器
    ↓
WebAssembly (.wasm)
    ↓
Node.js (WASI)
    ↓
图片输出 (SVG/PNG/EPS)
```

## 更多信息

- [Wasm 集成文档](docs/WASM_INTEGRATION.md)
- [实现指南](docs/WASM_IMPLEMENTATION.md)
- [测试脚本](test/wasm-executor-test.js)

