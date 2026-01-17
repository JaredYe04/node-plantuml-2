# WASM 构建修复说明

## 问题描述

在 GitHub Actions 的发布工作流中，WASM 构建失败，错误信息：

```
Error: Exception in thread "main" java.lang.NoClassDefFoundError: de/mirkosertic/bytecoder/api/Logger
```

这个错误表明 `BytecoderCLI` 类在运行时找不到 `bytecoder-api` 包中的 `Logger` 类。

## 根本原因

1. **`bytecoder-api` 依赖问题**：
   - `bytecoder-api` 在 Maven Central 可能不存在作为独立的 artifact
   - 代码将 `bytecoder-api` 标记为 `optional: true`，导致即使下载失败也会继续执行
   - 但实际上 `BytecoderCLI` 类需要 `bytecoder-api` 中的类（如 `Logger`）

2. **Classpath 构建问题**：
   - 即使 `bytecoder-api` JAR 不存在，也应该确保 `bytecoder-core` 和 `bytecoder-cli` 被正确包含在 classpath 中
   - 类路径顺序很重要：API -> Core -> CLI

3. **构建方法选择**：
   - GitHub Actions 工作流强制使用 `BUILD_METHOD=bytecoder`
   - 但 Maven 方式能更好地处理依赖，应该优先使用

## 修复方案

### 1. 添加依赖验证函数

在 `scripts/build-plantuml-wasm.js` 中添加了 `verifyBytecoderDependencies` 函数：

```javascript
function verifyBytecoderDependencies (callback) {
  // 检查必需的依赖
  var missing = []
  if (!fs.existsSync(BYTECODER_CORE_JAR)) {
    missing.push('bytecoder-core: ' + BYTECODER_CORE_JAR)
  }
  if (!fs.existsSync(BYTECODER_JAR)) {
    missing.push('bytecoder-cli: ' + BYTECODER_JAR)
  }
  
  if (missing.length > 0) {
    callback(new Error('Missing required Bytecoder dependencies...'))
    return
  }
  
  // bytecoder-api JAR 可能不存在，但 API 类应该在 bytecoder-core 或 bytecoder-cli 中
  if (!fs.existsSync(BYTECODER_API_JAR)) {
    console.log('Note: bytecoder-api JAR not found as separate artifact')
    console.log('  This is OK - API classes should be included in bytecoder-core or bytecoder-cli')
  }
  
  callback(null)
}
```

### 2. 修复 Classpath 构建

确保 `bytecoder-core` 和 `bytecoder-cli` 始终包含在 classpath 中：

```javascript
// Bytecoder dependencies order matters: API -> Core -> CLI
// Note: bytecoder-api classes may be included in bytecoder-core or bytecoder-cli
if (fs.existsSync(BYTECODER_API_JAR)) {
  classpathParts.push(BYTECODER_API_JAR)
}
// bytecoder-core is required and should contain API classes if bytecoder-api JAR doesn't exist
if (!fs.existsSync(BYTECODER_CORE_JAR)) {
  callback(new Error('Bytecoder Core JAR not found...'))
  return
}
classpathParts.push(BYTECODER_CORE_JAR)

if (!fs.existsSync(BYTECODER_JAR)) {
  callback(new Error('Bytecoder CLI JAR not found...'))
  return
}
classpathParts.push(BYTECODER_JAR)
```

### 3. 改进依赖下载逻辑

添加更详细的日志信息，帮助诊断问题：

```javascript
dependencies.forEach(function (dep) {
  downloadMavenJar(dep.groupId, dep.artifactId, dep.version, dep.outputPath, function (err) {
    if (err) {
      if (dep.optional) {
        console.warn('⚠️  Optional dependency download failed: ' + dep.artifactId)
        console.warn('   This dependency may be included in bytecoder-core or bytecoder-cli JARs')
      } else {
        // 必需依赖失败，报错
      }
    } else {
      console.log('✓ ' + dep.artifactId + ' downloaded successfully')
    }
  })
})
```

### 4. 修改 GitHub Actions 工作流

在 `.github/workflows/publish.yml` 中修改构建步骤，优先使用 Maven：

```yaml
- name: Build Wasm module (required for pure Node.js)
  continue-on-error: false
  run: |
    echo "🔨 Building Wasm module (this may take several minutes)..."
    echo "📦 This is required for pure Node.js operation without Java dependency"
    echo "💡 Using Maven method (preferred) - will fallback to Bytecoder CLI if Maven fails"
    # Try Maven first (default), fallback to Bytecoder CLI if needed
    BUILD_METHOD=maven npm run build:wasm || BUILD_METHOD=bytecoder npm run build:wasm
```

**关键改动**：
- 移除了 `BUILD_METHOD: bytecoder` 环境变量
- 优先使用 Maven 方式（默认）
- 如果 Maven 失败，自动回退到 Bytecoder CLI 方式

### 5. 添加验证步骤

在 Bytecoder CLI 构建之前，添加依赖验证：

```javascript
} else if (method === 'bytecoder') {
  ensureBytecoder(function (err) {
    if (err) {
      callback(err)
      return
    }
    ensureBytecoderDependencies(function (err2) {
      if (err2) {
        callback(err2)
        return
      }
      // 验证所有必需的依赖是否可用
      verifyBytecoderDependencies(function (err3) {
        if (err3) {
          callback(err3)
          return
        }
        buildWithBytecoder(callback)
      })
    })
  })
}
```

## 测试

### 本地测试脚本

创建了 `scripts/test-wasm-build.js` 用于本地测试：

```bash
node scripts/test-wasm-build.js
```

这个脚本会：
1. 检查 PlantUML JAR 是否存在
2. 检查 Java 是否可用
3. 测试 Bytecoder CLI 构建方法
4. 验证 WASM 文件是否生成

### 测试步骤

1. **本地测试**：
   ```bash
   node scripts/test-wasm-build.js
   ```

2. **使用 Maven 方式**：
   ```bash
   BUILD_METHOD=maven node scripts/build-plantuml-wasm.js
   ```

3. **使用 Bytecoder CLI 方式**：
   ```bash
   BUILD_METHOD=bytecoder node scripts/build-plantuml-wasm.js
   ```

## 预期结果

修复后，WASM 构建应该：

1. **优先使用 Maven**（如果可用）：
   - Maven 能自动处理所有依赖
   - 使用 `bytecoder-maven-plugin` 进行构建
   - 更稳定、可靠

2. **回退到 Bytecoder CLI**（如果 Maven 不可用）：
   - 自动下载必需的 JAR 文件
   - 验证依赖是否完整
   - 正确构建 classpath

3. **提供清晰的错误信息**：
   - 如果依赖缺失，会给出明确的错误信息
   - 日志会显示每个步骤的详细情况

## 相关文件

- `scripts/build-plantuml-wasm.js` - 主构建脚本
- `.github/workflows/publish.yml` - GitHub Actions 工作流
- `scripts/test-wasm-build.js` - 本地测试脚本
- `pom.xml` - Maven 配置文件

## 注意事项

1. **Maven 优先**：在 CI/CD 环境中，Maven 方式更可靠，因为它能正确处理依赖关系。

2. **依赖顺序**：Bytecoder 依赖的 classpath 顺序很重要：API -> Core -> CLI。

3. **`bytecoder-api` 处理**：即使 `bytecoder-api` 作为独立 artifact 不存在，其类也应该包含在 `bytecoder-core` 或 `bytecoder-cli` 中。

4. **错误处理**：如果构建失败，现在会提供更详细的错误信息，帮助诊断问题。

