# 废弃代码清理清单

## 📋 概述

本文档列出所有需要删除或标记为废弃的代码，这些代码是在尝试迁移到纯Node环境时添加的，但由于技术限制（Bytecoder不支持PlantUML所需的所有Java特性），这些代码无法正常工作。

---

## 🔴 完全废弃 - 建议删除

### 1. Wasm执行器实现

**文件**: `lib/plantuml-executor-wasm.js`
- **行数**: 329行
- **状态**: 完全不可用
- **原因**: 
  - Wasm模块无法正确初始化
  - Bytecoder不支持 `ResourceBundle.getBundle()`
  - 所有执行都会fallback到Java
- **依赖**: 无其他文件依赖此文件（内部require）
- **删除影响**: 无，代码路径从未真正执行成功
- **操作**: ✅ **删除**

### 2. Wasm构建脚本 - Bytecoder/TeaVM

**文件**: `scripts/build-plantuml-wasm.js`
- **行数**: 900行
- **状态**: 构建失败
- **原因**: Bytecoder/TeaVM无法完整编译PlantUML
- **操作**: ✅ **删除**

**文件**: `scripts/build-wasm-maven.js`
- **行数**: 138行
- **状态**: Maven构建也失败
- **操作**: ✅ **删除**

**文件**: `scripts/test-wasm-build.js`（如果存在）
- **状态**: Wasm构建测试
- **操作**: ✅ **删除**

### 3. CheerpJ构建脚本

**文件**: `scripts/build-plantuml-cheerpj.js`
- **行数**: 293行
- **状态**: 未完成集成
- **原因**: 虽然CheerpJ可能有潜力，但当前实现未完成且未集成到主流程
- **操作**: ⚠️ **建议删除或移至 `scripts/deprecated/` 目录供未来参考**

### 4. Maven配置文件

**文件**: `pom.xml`
- **行数**: 84行
- **状态**: 用于Wasm构建，但构建失败
- **操作**: ✅ **删除**（如果不再尝试Maven构建）

### 5. Wasm测试文件

**文件**: `test/wasm-executor-test.js`
- **行数**: 65行
- **状态**: 测试Wasm执行器，但Wasm不可用
- **操作**: ✅ **删除**

---

## 🟡 部分废弃 - 需要清理/简化

### 1. plantuml-executor.js 中的Wasm尝试逻辑

**文件**: `lib/plantuml-executor.js`

#### 1.1 useWasm() 函数（第64-74行）

```javascript
module.exports.useWasm = function (callback) {
  var wasmExecutor = require('./plantuml-executor-wasm')
  if (wasmExecutor.isAvailable()) {
    return wasmExecutor.initWasm(callback)
  } else {
    console.warn('Wasm executor not available, falling back to Java executor')
    if (typeof callback === 'function') {
      callback(new Error('Wasm executor not available'))
    }
  }
}
```

- **状态**: 导出但从未被外部调用
- **操作**: ✅ **删除**

#### 1.2 exec() 函数中的Wasm尝试逻辑（第86-132行）

```javascript
// Priority 1: Try Wasm executor first (pure Node, no Java needed)
var wasmExecutor = require('./plantuml-executor-wasm')
var useJava = process.env.PLANTUML_USE_JAVA === 'true' || process.env.PLANTUML_USE_JAVA === '1'

var task
// Use Wasm by default, unless explicitly requested to use Java
if (!useJava && wasmExecutor.isAvailable()) {
  try {
    // ... 大量Wasm尝试代码 ...
    // 总是失败，最终fallback到Java
  } catch (e) {
    // fallback到Java
  }
} else {
  // Use Java executor
  task = getJavaTask(argv, cwd, callback)
}
```

- **状态**: 代码路径总是fallback到Java
- **操作**: ✅ **简化**，直接使用Java执行器

**简化后的代码**:

```javascript
module.exports.exec = function (argv, cwd, callback) {
  if (typeof argv === 'function') {
    callback = argv
    argv = undefined
    cwd = undefined
  } else if (typeof cwd === 'function') {
    callback = cwd
    cwd = undefined
  }

  // Use Java executor (Wasm executor is not available due to Bytecoder limitations)
  return getJavaTask(argv, cwd, callback)
}
```

---

## 📄 废弃文档

### 应删除的文档

以下文档提到Wasm支持，但实际不可用，会造成用户误导：

1. **docs/WASM_IMPLEMENTATION.md**
   - 描述Wasm实现，但实际不工作
   - **操作**: ✅ **删除**

2. **docs/WASM_BUILD_ARCHITECTURE.md**
   - Wasm构建架构说明
   - **操作**: ✅ **删除**

3. **docs/WASM_INTEGRATION.md**
   - Wasm集成指南
   - **操作**: ✅ **删除**

4. **docs/README_WASM.md**
   - Wasm使用说明
   - **操作**: ✅ **删除**

5. **docs/PURE_NODE_IMPLEMENTATION.md**
   - 提到Wasm但实际未完成
   - **操作**: ✅ **删除**

6. **docs/ROADMAP_PURE_NODE.md**
   - 纯Node路线图（Wasm方案失败）
   - **操作**: ✅ **删除或更新**

### 应保留的文档

1. **docs/WASM_BUILD_LIMITATIONS.md** ✅ **保留**
   - 说明为什么Wasm方案失败
   - 作为技术参考和历史记录

---

## 📦 package.json 清理

### 废弃的npm脚本

```json
{
  "scripts": {
    "build:wasm": "...",                    // ✅ 删除
    "build:wasm:cheerpj": "...",            // ✅ 删除
    "build:wasm:bytecoder": "...",          // ✅ 删除
    "build:wasm:publish": "...",            // ✅ 删除
    "build:all": "...",                     // ⚠️ 检查是否只包含wasm，如果是则删除
    "build:all:wasm-only": "..."            // ✅ 删除
  }
}
```

### files 字段清理

```json
{
  "files": [
    "vendor/wasm/plantuml.wasm",  // ✅ 删除（如果不存在或不可用）
    // ... 其他文件保留
  ]
}
```

---

## 🔍 环境变量清理

### 废弃的环境变量引用

**文件**: `lib/plantuml-executor.js:88`

```javascript
// 当前代码检查 PLANTUML_USE_JAVA
var useJava = process.env.PLANTUML_USE_JAVA === 'true' || process.env.PLANTUML_USE_JAVA === '1'

// 但没有实际使用 PLANTUML_USE_WASM（虽然在某些地方被引用）
```

**其他文件中的引用**:
- `test/wasm-executor-test.js:35` - `process.env.PLANTUML_USE_WASM = 'true'`
- `docs/WASM_IMPLEMENTATION.md` - 多处提到 `PLANTUML_USE_WASM`

**操作**: 
- ✅ 删除所有 `PLANTUML_USE_WASM` 引用
- ✅ 保留 `PLANTUML_USE_JAVA`（虽然当前默认使用Java，但保留作为显式控制选项）

---

## 📁 目录清理

### vendor/wasm/ 目录

**目录**: `vendor/wasm/`

**内容**:
- `plantuml.wasm` - 如果存在但不可用
- `plantuml-core.js` - CheerpJ相关，未使用
- `plantuml-core.wasm` - CheerpJ相关，未使用
- `*.js` - CheerpJ运行时文件
- `*.wasm` - Wasm文件

**操作**: 
- ⚠️ **检查** 这些文件是否真的不存在或被使用
- 如果确实未被使用，可以删除或移至 `vendor/deprecated/`

---

## 📊 清理统计

| 类别 | 文件数 | 行数估计 | 操作 |
|------|--------|----------|------|
| Wasm执行器代码 | 1 | ~330 | 删除 |
| Wasm构建脚本 | 3 | ~1330 | 删除 |
| CheerpJ脚本 | 1 | ~290 | 删除或移至deprecated |
| Maven配置 | 1 | ~84 | 删除 |
| Wasm测试 | 1 | ~65 | 删除 |
| 废弃文档 | 6 | ~1000+ | 删除 |
| 部分废弃代码 | ~50行 | 简化 | 简化 |
| **总计** | **13+** | **~3150+** | - |

---

## ✅ 清理步骤建议

### 步骤1: 备份（可选）
```bash
git checkout -b cleanup/deprecated-code
```

### 步骤2: 删除废弃文件
```bash
# Wasm执行器
rm lib/plantuml-executor-wasm.js

# Wasm构建脚本
rm scripts/build-plantuml-wasm.js
rm scripts/build-wasm-maven.js
rm scripts/test-wasm-build.js  # 如果存在

# CheerpJ脚本（或移至deprecated）
rm scripts/build-plantuml-cheerpj.js
# 或: mkdir -p scripts/deprecated && mv scripts/build-plantuml-cheerpj.js scripts/deprecated/

# Maven配置
rm pom.xml

# Wasm测试
rm test/wasm-executor-test.js

# 废弃文档
rm docs/WASM_IMPLEMENTATION.md
rm docs/WASM_BUILD_ARCHITECTURE.md
rm docs/WASM_INTEGRATION.md
rm docs/README_WASM.md
rm docs/PURE_NODE_IMPLEMENTATION.md
rm docs/ROADMAP_PURE_NODE.md
```

### 步骤3: 简化代码
编辑 `lib/plantuml-executor.js`:
- 删除 `useWasm()` 函数
- 简化 `exec()` 函数，移除Wasm尝试逻辑

### 步骤4: 更新package.json
- 删除Wasm相关脚本
- 清理files字段

### 步骤5: 更新README.md
- 移除"Pure Node.js"声明
- 明确说明需要Java环境

### 步骤6: 测试
```bash
npm test
# 确保所有测试通过
```

### 步骤7: 提交
```bash
git add .
git commit -m "chore: remove deprecated Wasm-related code

- Remove non-functional Wasm executor implementation
- Remove Wasm build scripts (Bytecoder/TeaVM/CheerpJ)
- Remove misleading documentation about Wasm support
- Simplify executor to use Java only (with Nailgun optimization)
- Update README to clarify Java requirement

Wasm approach failed due to Bytecoder limitations with ResourceBundle.getBundle().
See docs/WASM_BUILD_LIMITATIONS.md for details."
```

---

## 🎯 清理后的架构

清理后的项目将：

1. ✅ **清晰的架构**: 只有Java执行器（spawn + Nailgun）
2. ✅ **无误导文档**: 明确说明需要Java环境
3. ✅ **简化的代码**: 移除所有Wasm尝试逻辑
4. ✅ **易于维护**: 代码量减少约3000行

---

## 📝 注意事项

1. **保留历史**: 删除前可以创建git tag标记当前状态
2. **文档更新**: 确保README和主要文档反映实际架构
3. **测试覆盖**: 清理后确保所有测试通过
4. **向后兼容**: 检查是否有外部代码依赖废弃的API（如`useWasm()`）

