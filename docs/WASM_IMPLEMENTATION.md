# Wasm JVM 集成实现指南

## 概述

本文档说明如何构建和使用 Wasm 版本的 PlantUML。

## 前提条件

1. **Node.js 12+** (推荐 Node.js 20+ 以获得稳定的 WASI 支持)
2. **Java 运行时** (用于运行 Bytecoder/TeaVM 编译器)
3. **PlantUML JAR** (已下载到 `vendor/plantuml.jar`)

## 构建 Wasm 模块

### 方法 1: 使用 Bytecoder (推荐用于测试)

```bash
# 1. 确保 PlantUML JAR 已下载
node scripts/get-plantuml-jar.js --latest

# 2. 构建 Wasm 模块
npm run build:wasm

# 或者使用自定义方法
node scripts/build-plantuml-wasm.js --method bytecoder
```

构建脚本会：
1. 自动下载 Bytecoder CLI (如果不存在)
2. 使用 Bytecoder 将 PlantUML JAR 编译为 Wasm
3. 输出到 `vendor/wasm/plantuml.wasm`

### 方法 2: 使用 TeaVM (需要 Maven)

```bash
# 使用 TeaVM 构建 (需要 Maven 配置)
node scripts/build-plantuml-wasm.js --method teavm
```

## 使用 Wasm 执行器

### 通过环境变量启用

```bash
# 启用 Wasm 模式
PLANTUML_USE_WASM=true node your-script.js

# 或在代码中
process.env.PLANTUML_USE_WASM = 'true'
var plantuml = require('node-plantuml')
```

### 在代码中初始化

```javascript
var plantumlExecutor = require('node-plantuml/lib/plantuml-executor')

// 初始化 Wasm 执行器
plantumlExecutor.useWasm(function(err) {
  if (err) {
    console.log('Wasm not available, using Java executor')
  } else {
    console.log('Wasm executor ready')
  }
})
```

## 测试 Wasm 执行器

```bash
# 运行 Wasm 执行器测试
node test/wasm-executor-test.js
```

## 架构说明

### Wasm 执行流程

```
Node.js 应用
    ↓
plantuml.generate()
    ↓
plantuml-executor.exec()
    ↓
检查 PLANTUML_USE_WASM 环境变量
    ↓
Wasm 模式? → plantuml-executor-wasm.exec()
    ↓
加载 plantuml.wasm
    ↓
WASI 初始化 (文件系统、环境变量)
    ↓
调用 Wasm 模块导出函数
    ↓
通过 WASI 获取 stdout
    ↓
返回图片流
```

### 文件系统桥接

Wasm 模块通过 WASI 访问文件系统：

```javascript
var wasi = new WASI({
  version: 'preview1',
  env: process.env,
  preopens: {
    '/': process.cwd(),      // 当前工作目录
    '/tmp': os.tmpdir()      // 临时目录
  },
  args: []
})
```

## 已知限制

### 1. PlantUML 依赖

PlantUML 依赖的一些 Java 库可能无法完全转换为 Wasm：

- **Graphviz**: 需要外部 Graphviz 二进制或 JS 实现
- **字体**: 需要包含字体文件或使用系统字体
- **图像处理**: PNG 生成可能需要额外的图像库支持

### 2. 性能考虑

- **启动时间**: Wasm 模块加载可能比 JVM 快
- **内存占用**: Wasm 模块内存占用可能更小
- **执行速度**: 取决于 Wasm 模块优化程度

### 3. 兼容性

- **Node.js 版本**: WASI 在 Node.js 12+ 是实验性的，20+ 是稳定的
- **平台**: Windows/Linux/macOS 都应该支持
- **字节码兼容性**: 不是所有 Java 特性都能转换

## 故障排除

### Wasm 模块未找到

```
Error: Wasm module not found: vendor/wasm/plantuml.wasm
```

**解决方法:**
```bash
npm run build:wasm
```

### WASI 不支持

```
Error: WASI requires Node.js 12+
```

**解决方法:**
- 升级到 Node.js 12+ (推荐 20+)
- 或回退到 Java 执行器

### Wasm 模块加载失败

```
Error: Failed to load Wasm module
```

**可能原因:**
- Wasm 文件损坏
- 不兼容的 Wasm 版本
- 缺少必要的导入函数

**解决方法:**
- 重新构建 Wasm 模块
- 检查 Bytecoder/TeaVM 版本兼容性
- 查看构建日志

### 执行时出错

```
Error: Wasm module does not export expected functions
```

**说明:**
- PlantUML Wasm 模块可能需要自定义 API
- 当前实现是通用框架，可能需要针对 PlantUML 调整

**解决方法:**
- 检查 PlantUML Wasm 模块导出的函数
- 可能需要修改 `processWasmExecution` 函数

## 下一步

1. **完善 PlantUML Wasm 构建**
   - 配置 Bytecoder/TeaVM 以正确处理 PlantUML 依赖
   - 优化 Wasm 文件大小

2. **实现自定义 API**
   - 如果 PlantUML Wasm 模块使用自定义 API，需要实现对应的桥接

3. **性能优化**
   - 对比 Wasm 与 Java 版本的性能
   - 优化内存使用和启动时间

4. **测试覆盖**
   - 添加更多测试用例
   - 测试各种图表类型和格式

## 参考资料

- [Bytecoder 文档](https://mirkosertic.github.io/Bytecoder/)
- [TeaVM 文档](http://teavm.org/)
- [WASI 规范](https://wasi.dev/)
- [Node.js WASI](https://nodejs.org/api/wasi.html)
- [PlantUML 文档](http://plantuml.com/)

