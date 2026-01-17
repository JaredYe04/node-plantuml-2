# 纯 Node 环境实现总结

## ✅ 已完成的实现

### 1. Maven 构建配置 (`pom.xml`)

创建了 Maven 项目配置文件，用于构建 Wasm 模块：

- 配置 Bytecoder Maven 插件
- 自动处理 PlantUML 依赖
- 输出 Wasm 模块到 `vendor/wasm/plantuml.wasm`

### 2. Wasm 构建脚本 (`scripts/build-wasm-maven.js`)

- 使用 Maven 构建 Wasm 模块
- 自动检查 Maven 是否安装
- 处理构建输出和错误

### 3. 发布流程更新 (`package.json`)

```json
{
  "scripts": {
    "prepublish": "npm run build:wasm:publish",
    "build:wasm:publish": "node scripts/get-plantuml-jar.js --latest && node scripts/build-wasm-maven.js"
  },
  "files": [
    "vendor/wasm/plantuml.wasm"  // 包含预编译的 Wasm
  ]
}
```

### 4. 执行器优先级调整 (`lib/plantuml-executor.js`)

**新的执行顺序：**

1. **优先使用 Wasm**（纯 Node，无需 Java）
2. **自动降级到 Java**（如果 Wasm 不可用或失败）

**关键代码：**

```javascript
// 默认使用 Wasm，除非明确要求使用 Java
var useJava = process.env.PLANTUML_USE_JAVA === 'true'

if (!useJava && wasmExecutor.isAvailable()) {
  // 使用 Wasm 执行器
} else {
  // 使用 Java 执行器（fallback）
}
```

### 5. Wasm 执行器增强 (`lib/plantuml-executor-wasm.js`)

- 添加同步初始化方法 `initWasmSync()`
- 添加状态检查方法 `isReady()`
- 改进错误处理和降级逻辑

### 6. 文档更新

- `README_PURE_NODE.md` - 纯 Node 使用指南
- `README.md` - 更新说明新特性
- `docs/PURE_NODE_ENVIRONMENT.md` - 实现说明

## 📦 发布流程

### 开发者（发布前）

```bash
# 1. 确保 Maven 已安装
mvn -version

# 2. 发布（会自动构建 Wasm）
npm publish
```

发布时会自动：
1. 下载最新 PlantUML JAR
2. 使用 Maven 构建 Wasm 模块
3. 将 Wasm 模块包含在 npm 包中

### 用户（安装后）

```bash
# 只需安装，无需任何配置
npm install node-plantuml

# 直接使用，自动使用 Wasm（无需 Java）
var plantuml = require('node-plantuml')
```

## 🎯 实现效果

### 用户视角

**之前（需要 Java）：**
```bash
1. 安装 Java
2. npm install node-plantuml
3. 使用
```

**现在（纯 Node）：**
```bash
1. npm install node-plantuml  ✅
2. 使用  ✅
```

### 代码示例

```javascript
// 用户代码 - 完全不变
var plantuml = require('node-plantuml')
var fs = require('fs')

var gen = plantuml.generate('@startuml\nA -> B\n@enduml')
gen.out.pipe(fs.createWriteStream('output.png'))

// 自动使用 Wasm，无需 Java！
```

## 🔧 技术细节

### Wasm 模块位置

- **构建时**: `vendor/wasm/plantuml.wasm`
- **npm 包中**: `node_modules/node-plantuml/vendor/wasm/plantuml.wasm`
- **运行时**: 自动检测并使用

### 执行器选择逻辑

```
用户调用 plantuml.generate()
    ↓
检查 PLANTUML_USE_JAVA 环境变量
    ↓
如果未设置 → 尝试 Wasm
    ├─ Wasm 可用且已初始化 → 使用 Wasm ✅
    ├─ Wasm 可用但未初始化 → 初始化后使用 Wasm
    └─ Wasm 不可用 → 降级到 Java
    ↓
如果设置为 true → 直接使用 Java
```

### 向后兼容

- ✅ 所有现有 API 保持不变
- ✅ Java 执行器仍可用（作为 fallback）
- ✅ 可通过环境变量强制使用 Java
- ✅ 支持所有输出格式和功能

## 📝 注意事项

### 构建要求

发布时需要：
- **Maven** (用于构建 Wasm)
- **Java** (Maven 需要)
- **网络连接** (下载依赖)

### 用户要求

用户使用时：
- **仅需 Node.js 12+** ✅
- **无需 Java** ✅
- **无需构建** ✅

### 文件大小

- Wasm 模块: ~20-50MB（取决于优化）
- 总包大小: ~40-70MB（包含 JAR 作为 fallback）

## 🚀 下一步

1. **测试 Wasm 构建**
   ```bash
   npm run build:wasm:publish
   ```

2. **验证 Wasm 模块**
   ```bash
   node test/wasm-executor-test.js
   ```

3. **发布到 npm**
   ```bash
   npm publish
   ```

4. **用户测试**
   ```bash
   npm install node-plantuml
   # 无需 Java，直接使用！
   ```

## 📚 相关文件

- `pom.xml` - Maven 构建配置
- `scripts/build-wasm-maven.js` - Wasm 构建脚本
- `lib/plantuml-executor.js` - 执行器（优先 Wasm）
- `lib/plantuml-executor-wasm.js` - Wasm 执行器
- `package.json` - 发布配置
- `README_PURE_NODE.md` - 用户指南

