# WASM 构建架构梳理

## 概述

本文档梳理了项目中关于 WASM 构建的相关逻辑，包括 Bytecoder 的作用、是否必要，以及何时使用 Maven。

## 构建流程总览

```
PlantUML JAR (Java 字节码)
    ↓
构建工具选择: Maven (首选) 或 Bytecoder CLI (备用)
    ↓
Bytecoder 编译器 (通过 Maven Plugin 或 CLI)
    ↓
WebAssembly (.wasm) 文件
    ↓
Node.js WASI 执行器
```

## 1. Bytecoder 是什么？

### 定义
**Bytecoder** 是一个 Java 字节码到 WebAssembly 的编译器，可以将 Java 字节码（.class 或 .jar 文件）编译成 WebAssembly (.wasm) 模块。

### 在项目中的作用
- **核心工具**：将 PlantUML 的 Java JAR 文件转换为 WASM 格式
- **输出格式**：生成可以在 Node.js 环境中运行的 `.wasm` 文件
- **位置**：`vendor/bytecoder-cli.jar` 和 `vendor/bytecoder-core-*.jar`

### 相关文件
- `vendor/bytecoder-cli.jar` - Bytecoder 命令行工具
- `vendor/bytecoder-core-2023-05-19.jar` - Bytecoder 核心库
- `pom.xml` - Maven 配置，使用 `bytecoder-maven-plugin`

## 2. Bytecoder 是否必要？

### 答案：是的，目前是必需的

**原因：**
1. **唯一可用方案**：项目中虽然提到了 TeaVM 作为替代方案，但 TeaVM 构建功能还未实现（见 `build-plantuml-wasm.js` 第 496-508 行）
2. **核心依赖**：无论是通过 Maven 还是 CLI 方式，最终都依赖 Bytecoder 来执行实际的编译工作
3. **Maven 插件**：`pom.xml` 中使用的 `bytecoder-maven-plugin` 底层仍然是 Bytecoder

### 可选的使用方式

Bytecoder 可以通过两种方式使用：

#### 方式 A：通过 Maven（推荐）
```bash
# 使用 Maven 构建（自动处理依赖）
mvn clean package
# 或
node scripts/build-plantuml-wasm.js --method maven
```

**优点：**
- 自动下载和管理所有依赖
- 配置集中（pom.xml）
- 更稳定的依赖版本管理

#### 方式 B：通过 Bytecoder CLI（备用）
```bash
# 使用 Bytecoder CLI 直接构建
node scripts/build-plantuml-wasm.js --method bytecoder
```

**使用场景：**
- Maven 不可用时
- 需要更细粒度的控制
- 调试构建过程

**缺点：**
- 需要手动下载依赖（bytecoder-cli.jar, bytecoder-core.jar, picocli.jar）
- 依赖管理复杂

## 3. 什么时候使用 Maven？

### 默认行为

从 `build-plantuml-wasm.js` 第 33 行可以看到：
```javascript
var BUILD_METHOD = process.env.BUILD_METHOD || 'maven' // 'maven' (preferred)
```

**Maven 是默认首选方式。**

### 使用 Maven 的场景

#### ✅ 推荐使用 Maven 当：
1. **环境中有 Maven**：系统已安装 Maven（通过 `mvn -version` 检查）
2. **首次构建**：需要自动下载和管理依赖
3. **CI/CD 环境**：在持续集成中使用（依赖管理更可靠）
4. **生产构建**：需要稳定、可重复的构建过程

#### 构建流程（Maven 方式）

```bash
# 1. 检查 Maven 是否可用（build-plantuml-wasm.js:395-405）
mvn -version

# 2. 执行 Maven 构建（build-plantuml-wasm.js:410-491）
mvn clean package -DskipTests

# 3. Maven 会：
#    - 从 pom.xml 读取配置
#    - 自动下载 bytecoder-maven-plugin 及其依赖
#    - 执行 bytecoder 编译（pom.xml:42-62）
#    - 生成 plantuml.wasm 到 target/ 或 vendor/wasm/
```

### 不使用 Maven 的场景

#### ⚠️ 回退到 Bytecoder CLI 当：
1. **Maven 不可用**：系统中没有安装 Maven
   - 脚本会自动检测并回退（见 `build-plantuml-wasm.js:516-524`）
2. **Maven 检查失败**：Maven 命令执行失败
3. **手动指定**：通过环境变量或参数强制使用 CLI
   ```bash
   BUILD_METHOD=bytecoder node scripts/build-plantuml-wasm.js
   ```

## 4. 构建方法对比

| 特性 | Maven 方式 | Bytecoder CLI 方式 |
|------|-----------|-------------------|
| **默认方式** | ✅ 是（首选） | ❌ 备用方案 |
| **依赖管理** | ✅ 自动（通过 pom.xml） | ❌ 需手动下载 |
| **配置复杂度** | ✅ 简单（pom.xml） | ⚠️ 较复杂（命令行参数） |
| **稳定性** | ✅ 高 | ⚠️ 中等 |
| **适用场景** | 生产环境、CI/CD | 调试、快速测试 |
| **Maven 依赖** | ✅ 需要 | ❌ 不需要 |

## 5. 代码实现细节

### Maven 构建配置（pom.xml）

```xml
<plugin>
  <groupId>de.mirkosertic.bytecoder</groupId>
  <artifactId>bytecoder-maven-plugin</artifactId>
  <version>2023-05-19</version>
  <configuration>
    <mainClass>net.sourceforge.plantuml.Run</mainClass>
    <backend>wasm</backend>
    <minify>true</minify>
    <outputDirectory>${project.basedir}/vendor/wasm</outputDirectory>
    <outputFileName>plantuml.wasm</outputFileName>
  </configuration>
</plugin>
```

### 构建方法选择逻辑（build-plantuml-wasm.js）

```javascript
// 1. 默认使用 Maven（第 33 行）
var BUILD_METHOD = process.env.BUILD_METHOD || 'maven'

// 2. Maven 构建入口（第 513-527 行）
function build(method, callback) {
  if (method === 'maven') {
    checkMaven(function (err) {
      if (err) {
        // Maven 不可用时，自动回退到 Bytecoder CLI
        console.warn('⚠️  Maven not found, falling back to Bytecoder CLI...')
        method = 'bytecoder'
        build(method, callback)
        return
      }
      buildWithMaven(callback)
    })
  } else if (method === 'bytecoder') {
    // Bytecoder CLI 构建
    // ...
  }
}
```

### Bytecoder 依赖下载（build-plantuml-wasm.js）

当使用 Bytecoder CLI 方式时，脚本会自动下载以下依赖：

1. **bytecoder-cli.jar** - CLI 工具（第 231-258 行）
2. **bytecoder-core-*.jar** - 核心库（第 161-226 行）
3. **picocli-*.jar** - 命令行解析库（第 161-226 行）

## 6. 构建输出

### WASM 文件位置

构建完成后，WASM 文件可能位于以下位置之一：

```javascript
// build-plantuml-wasm.js:446-449
var possibleLocations = [
  path.join(__dirname, '../vendor/wasm/plantuml.wasm'),  // 最终位置
  path.join(__dirname, '../target/plantuml.wasm'),       // Maven 输出
  path.join(__dirname, '../target/wasm/plantuml.wasm')   // 备用位置
]
```

脚本会自动查找并将文件复制到最终位置：`vendor/wasm/plantuml.wasm`

## 7. 执行流程

### 使用 WASM 执行器

```javascript
// lib/plantuml-executor-wasm.js
// 1. 初始化 WASM 模块
initWasm(function(err) {
  if (err) {
    // 回退到 Java 执行器
  } else {
    // 使用 WASM 执行
    execWithWasm(argv, cwd, callback)
  }
})
```

### 环境变量控制

```bash
# 启用 WASM 模式
PLANTUML_USE_WASM=true node your-script.js

# 选择构建方法
BUILD_METHOD=maven node scripts/build-plantuml-wasm.js
BUILD_METHOD=bytecoder node scripts/build-plantuml-wasm.js
```

## 8. 总结

### Bytecoder
- **是否必要**：✅ 是的，目前是必需的（TeaVM 未实现）
- **作用**：将 Java 字节码编译为 WebAssembly
- **位置**：通过 Maven Plugin 或 CLI 使用

### Maven
- **何时使用**：默认首选方式，当 Maven 可用时优先使用
- **优势**：自动依赖管理、配置简单、稳定性高
- **回退**：Maven 不可用时自动回退到 Bytecoder CLI

### 推荐实践

1. **开发环境**：使用 Maven（如果已安装）
2. **CI/CD**：使用 Maven（更可靠）
3. **无 Maven 环境**：自动回退到 Bytecoder CLI
4. **调试构建问题**：可以手动切换到 CLI 方式查看详细日志

## 9. 相关文件

- `scripts/build-plantuml-wasm.js` - 主构建脚本
- `scripts/build-wasm-maven.js` - Maven 构建辅助脚本
- `pom.xml` - Maven 配置文件
- `lib/plantuml-executor-wasm.js` - WASM 执行器
- `docs/WASM_IMPLEMENTATION.md` - WASM 实现文档
- `docs/WASM_INTEGRATION.md` - WASM 集成文档

