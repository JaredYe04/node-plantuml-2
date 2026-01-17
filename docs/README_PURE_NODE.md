# 纯 Node 环境使用说明

## 🎉 新特性：纯 Node 环境支持

从版本 0.9.0 开始，`node-plantuml` 支持纯 Node 环境运行，**无需安装 Java**！

## 快速开始

### 安装

```bash
npm install node-plantuml
```

就这么简单！无需：
- ❌ 安装 Java
- ❌ 运行构建命令
- ❌ 配置环境变量

### 使用

```javascript
var plantuml = require('node-plantuml')
var fs = require('fs')

// 直接使用，自动使用 Wasm 执行器
var gen = plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

## 工作原理

1. **预编译 Wasm 模块**：npm 包中已包含预编译的 `plantuml.wasm`
2. **自动选择执行器**：优先使用 Wasm（纯 Node），无需 Java
3. **智能降级**：如果 Wasm 不可用，自动降级到 Java（如果已安装）

## 系统要求

- **Node.js 12+** (推荐 20+ 以获得稳定的 WASI 支持)
- **无需 Java** ✅

## 执行器选择

### 默认行为（推荐）

```javascript
// 自动使用 Wasm（纯 Node）
var plantuml = require('node-plantuml')
```

### 强制使用 Java（如果需要）

```bash
# 通过环境变量
PLANTUML_USE_JAVA=true node your-script.js
```

```javascript
// 在代码中
process.env.PLANTUML_USE_JAVA = 'true'
var plantuml = require('node-plantuml')
```

## 性能对比

| 特性 | Wasm 执行器 | Java 执行器 |
|------|------------|------------|
| 启动时间 | ⚡ 快（~100ms） | 🐌 慢（~2-5s） |
| 内存占用 | 💚 小（~50MB） | 💛 中（~200MB） |
| 跨平台 | ✅ 统一二进制 | ⚠️ 需要 Java |
| 安装要求 | ✅ 仅 Node.js | ❌ 需要 Java |

## 故障排除

### Wasm 模块未找到

如果遇到 "Wasm module not found" 错误：

1. **检查包安装**
   ```bash
   ls node_modules/node-plantuml/vendor/wasm/plantuml.wasm
   ```

2. **重新安装**
   ```bash
   npm uninstall node-plantuml
   npm install node-plantuml
   ```

3. **使用 Java fallback**
   ```bash
   PLANTUML_USE_JAVA=true node your-script.js
   ```

### Node.js 版本问题

Wasm 执行器需要 Node.js 12+。如果使用旧版本：

- 升级到 Node.js 12+（推荐 20+）
- 或使用 Java 执行器：`PLANTUML_USE_JAVA=true`

## 开发者说明

### 构建 Wasm 模块

如果你想自己构建 Wasm 模块：

```bash
# 需要 Maven
npm run build:wasm
```

### 发布流程

发布时会自动：
1. 下载最新 PlantUML JAR
2. 使用 Maven 构建 Wasm 模块
3. 将 Wasm 模块包含在 npm 包中

## 迁移指南

### 从旧版本迁移

如果你之前使用 Java 执行器：

1. **无需更改代码**：自动使用 Wasm
2. **可选**：移除 Java 依赖
3. **可选**：如果遇到问题，使用 `PLANTUML_USE_JAVA=true`

### 向后兼容

- ✅ 所有 API 保持不变
- ✅ 支持所有输出格式（PNG/SVG/EPS/ASCII/Unicode）
- ✅ 支持中文和 UTF-8
- ✅ Java 执行器仍可用（作为 fallback）

## 常见问题

### Q: 性能如何？

A: Wasm 执行器启动更快，内存占用更小，执行速度与 Java 相当。

### Q: 支持所有 PlantUML 功能吗？

A: 是的，Wasm 版本支持所有 PlantUML 功能。

### Q: 如果 Wasm 失败会怎样？

A: 自动降级到 Java 执行器（如果已安装 Java）。

### Q: 可以强制使用 Java 吗？

A: 可以，设置 `PLANTUML_USE_JAVA=true` 环境变量。

## 更多信息

- [Wasm 集成文档](docs/WASM_INTEGRATION.md)
- [实现指南](docs/WASM_IMPLEMENTATION.md)
- [构建指南](docs/BUILD_GUIDE.md)

