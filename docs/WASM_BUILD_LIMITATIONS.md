# WASM 构建限制说明

## 当前状态

经过修复，WASM 构建脚本已经能够：
- ✅ 正确下载所有必需的依赖（bytecoder-api, bytecoder-core, ASM, SLF4J, Jackson, Commons Lang3, java.base）
- ✅ 正确配置 classpath
- ✅ 成功启动 Bytecoder 编译过程

## 遇到的限制

### ResourceBundle.getBundle() 不支持

**错误信息：**
```
IllegalStateException: No such method: java/util/ResourceBundle.getBundle(Ljava/lang/String;Ljava/util/Locale;Ljava/lang/ClassLoader;)Ljava/util/ResourceBundle;
```

**原因：**
Bytecoder 是一个 Java 到 WebAssembly 的编译器，但它**不是完整的 Java 运行时实现**。它只支持 Java 标准库的一个子集，不支持某些动态特性，包括：
- `ResourceBundle.getBundle()` - 动态资源加载
- 反射相关的高级功能
- 某些 I/O 操作

PlantUML 使用了 `ResourceBundle.getBundle()` 来处理国际化资源，这是 Bytecoder 无法支持的。

## 解决方案

### 方案 1：使用 Java 执行器（推荐）

项目已经实现了基于 Java 的执行器，使用 Nailgun 来加速 Java 启动：

```javascript
// 默认使用 Java 执行器（不需要设置环境变量）
const plantuml = require('node-plantuml-2')
const gen = plantuml.generate('@startuml\nA -> B\n@enduml')
```

**优点：**
- ✅ 完全支持 PlantUML 的所有功能
- ✅ 使用 Nailgun 加速，启动速度快
- ✅ 稳定可靠

**缺点：**
- ⚠️ 需要安装 Java 运行时

### 方案 2：等待 Bytecoder 更新

如果未来 Bytecoder 添加了对 `ResourceBundle` 的支持，可以重新尝试 WASM 构建。

### 方案 3：修改 PlantUML 源码（不推荐）

理论上可以修改 PlantUML 源码，替换 `ResourceBundle.getBundle()` 的调用，但：
- 维护成本高
- 每次 PlantUML 更新都需要重新 patch
- 可能影响其他功能

## 建议

**对于生产环境：** 使用 Java 执行器（方案 1），这是最稳定可靠的方案。

**对于纯 Node.js 环境：** 当前 Bytecoder 的限制使得完整的 PlantUML WASM 构建不可行。可以考虑：
1. 使用简化版的 PlantUML 功能
2. 等待 Bytecoder 或替代工具（如 TeaVM）的支持
3. 使用其他图表库（如 Mermaid.js）

## 构建脚本状态

虽然 WASM 构建无法完成，但构建脚本已经修复了所有依赖问题，可以用于：
- 测试其他 Java 应用的 WASM 编译
- 作为未来 Bytecoder 更新的基础
- 学习 Bytecoder 的使用方法

## 相关文件

- `scripts/build-plantuml-wasm.js` - WASM 构建脚本（已修复依赖问题）
- `lib/plantuml-executor.js` - Java 执行器（推荐使用）
- `lib/plantuml-executor-wasm.js` - WASM 执行器（当前不可用）

