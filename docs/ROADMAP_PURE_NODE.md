# 纯 Node 环境实现路线图

## 目标

让用户只需 `npm install node-plantuml` 就能使用，无需：
- ❌ 安装 Java
- ❌ 运行构建命令
- ❌ 下载额外文件

## 实现步骤

### 阶段 1: 完善 Wasm 构建 ✅ (部分完成)

- [x] Wasm 执行器框架
- [x] Wasm 构建脚本
- [ ] 解决 Bytecoder 依赖问题
- [ ] 成功构建 Wasm 模块

### 阶段 2: 预编译和打包

1. **修改发布流程**
   ```json
   {
     "scripts": {
       "prepublish": "npm run build:all",  // 构建 Wasm
       "postinstall": "node scripts/check-wasm.js"  // 检查 Wasm 可用性
     },
     "files": [
       "vendor/wasm/plantuml.wasm"  // 包含预编译的 Wasm
     ]
   }
   ```

2. **CI/CD 自动构建**
   - GitHub Actions 自动构建 Wasm
   - 验证 Wasm 模块可用性
   - 发布到 npm

### 阶段 3: 执行器优先级调整

```javascript
// lib/plantuml-executor.js
module.exports.exec = function (argv, cwd, callback) {
  // 1. 优先使用 Wasm（如果可用）
  var wasmExecutor = require('./plantuml-executor-wasm')
  if (wasmExecutor.isAvailable()) {
    return wasmExecutor.exec(argv, cwd, callback)
  }
  
  // 2. Fallback to Java（可选，向后兼容）
  if (process.env.PLANTUML_USE_JAVA === 'true') {
    return execWithSpawn(argv, cwd, callback)
  }
  
  // 3. 错误提示
  throw new Error('Wasm module not found. Please reinstall the package.')
}
```

## 当前状态

### ✅ 已完成

- Wasm 执行器框架
- Wasm 构建脚本
- 一键构建脚本
- 测试框架

### ⚠️ 待完成

- Wasm 模块构建（需要解决 Bytecoder 依赖）
- Wasm 模块打包到 npm
- 执行器优先级调整

## 用户影响

### 当前（需要 Java）

```bash
# 用户需要
1. 安装 Java
2. npm install node-plantuml
3. 使用
```

### 目标（纯 Node）

```bash
# 用户只需
1. npm install node-plantuml
2. 使用（自动使用 Wasm）
```

## 技术挑战

1. **Bytecoder 依赖**：需要完整的 Maven 依赖树
2. **Wasm 文件大小**：可能较大，需要优化
3. **兼容性**：确保 Wasm 模块在所有平台可用

## 时间估算

- 解决 Wasm 构建：1-2 周
- 完善打包流程：1 周
- 测试和优化：1 周
- **总计：3-4 周**

