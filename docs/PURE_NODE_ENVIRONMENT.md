# 纯 Node 环境支持说明

## 当前状态

### ❌ 目前不是纯 Node 环境

当前实现需要：

1. **Java 运行时**：用户必须安装 Java（JRE 或 JDK）
   - 执行器通过 `child_process.spawn('java', ...)` 调用 Java
   - 代码位置：`lib/plantuml-executor.js:61`

2. **构建步骤**：
   - `prepublish` 脚本会在发布时下载 PlantUML JAR
   - `postinstall` 脚本会在安装后下载 vizjs（如果没有 Graphviz）
   - 但用户仍需要 Java 运行时才能使用

### 当前依赖

```javascript
// lib/plantuml-executor.js
function execWithSpawn (argv, cwd, cb) {
  // ...
  return childProcess.spawn('java', opts)  // ← 需要 Java
}
```

## 实现纯 Node 环境的目标

要实现"用户只需 `npm install` 就能用，无需 Java"，需要：

### 方案 1: Wasm 预编译（推荐）

1. **预编译 Wasm 模块**
   - 在发布前将 PlantUML JAR 编译为 Wasm
   - 将 Wasm 模块打包到 npm 包中

2. **修改执行器**
   - 优先使用 Wasm 执行器
   - 无需 Java 运行时

3. **发布流程**
   ```bash
   # 发布前构建
   npm run build:all        # 下载 JAR + 构建 Wasm
   npm publish              # 包含 Wasm 模块
   ```

### 方案 2: 使用纯 JS 实现

- 使用其他纯 JavaScript 的 PlantUML 实现
- 但功能可能不如官方 PlantUML 完整

## 实现步骤

### 步骤 1: 完成 Wasm 构建

当前 Wasm 构建失败，因为 Bytecoder CLI 需要完整的 Maven 依赖。需要：

1. 使用 Maven 项目配置 Bytecoder
2. 或者使用其他工具（如 TeaVM）
3. 或者手动构建 Wasm 模块

### 步骤 2: 将 Wasm 模块打包

修改 `package.json`：

```json
{
  "files": [
    "index.js",
    "lib/",
    "vendor/plantuml.jar",      // 保留作为 fallback
    "vendor/wasm/plantuml.wasm", // ← 新增：预编译的 Wasm
    "resources/",
    "scripts/download.js"
  ],
  "scripts": {
    "prepublish": "npm run build:all",  // 构建 Wasm
    "postinstall": "node scripts/get-vizjs.js"
  }
}
```

### 步骤 3: 修改执行器优先级

```javascript
// lib/plantuml-executor.js
module.exports.exec = function (argv, cwd, callback) {
  // 1. 优先尝试 Wasm（如果可用）
  var wasmExecutor = require('./plantuml-executor-wasm')
  if (wasmExecutor.isAvailable()) {
    try {
      return wasmExecutor.exec(argv, cwd, callback)
    } catch (e) {
      // Fallback to Java
    }
  }
  
  // 2. Fallback to Java（如果用户有 Java）
  // ...
}
```

## 当前使用方式

### 用户需要：

1. **安装 Java**
   ```bash
   # Windows
   # 下载并安装 Java JDK
   
   # macOS
   brew install openjdk
   
   # Linux
   sudo apt-get install openjdk-11-jdk
   ```

2. **安装包**
   ```bash
   npm install node-plantuml
   ```

3. **使用**
   ```javascript
   var plantuml = require('node-plantuml')
   // 需要 Java 运行时
   ```

## 目标使用方式（纯 Node）

### 用户只需：

1. **安装包**
   ```bash
   npm install node-plantuml
   ```

2. **直接使用**
   ```javascript
   var plantuml = require('node-plantuml')
   // 无需 Java，使用 Wasm
   ```

## 建议

要实现纯 Node 环境，建议：

1. **短期**：完善 Wasm 构建流程
   - 解决 Bytecoder 依赖问题
   - 或使用其他工具（TeaVM、GraalVM Native Image）

2. **中期**：预编译 Wasm 模块
   - 在 CI/CD 中自动构建
   - 将 Wasm 模块包含在 npm 包中

3. **长期**：完全移除 Java 依赖
   - 默认使用 Wasm 执行器
   - Java 执行器作为可选 fallback

## 相关文件

- `lib/plantuml-executor.js` - 当前使用 Java
- `lib/plantuml-executor-wasm.js` - Wasm 执行器（框架已实现）
- `scripts/build-plantuml-wasm.js` - Wasm 构建脚本
- `package.json` - 发布配置

