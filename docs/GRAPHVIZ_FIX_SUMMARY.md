# Graphviz 集成问题修复总结

## 问题描述

在使用 `node-plantuml-2` 时，出现以下错误：

```
java.lang.IllegalStateException
net.sourceforge.plantuml.svek.DotStringFactory.solve(DotStringFactory.java:343)
net.sourceforge.plantuml.svek.GraphvizImageBuilder.buildImage(GraphvizImageBuilder.java:285)
```

错误信息：`PlantUML cannot parse result from dot/GraphViz`

## 问题分析

### 1. 调用流程

MetaDoc 项目的调用方式：
```javascript
const plantuml = require('node-plantuml-2');
const gen = plantuml.generate({
  format: 'svg'
  // 注意：没有传递 dot 参数
});
```

### 2. 代码执行流程

1. `node-plantuml.js` 的 `joinOptions()` 函数：
   - 检测到没有 `options.dot`
   - 自动检测 Graphviz：`dotResolver.resolveDotExecutable()`
   - 将 `-graphvizdot` 和路径添加到 `argv` 中

2. `plantuml-executor.js` 的 `execWithSpawn()` 函数：
   - 创建 `opts = ['-D...', '-jar', PLANTUML_JAR].concat(argv)`
   - **问题**：检查 `-graphvizdot` 时只检查了 `argv`，但应该检查 `opts`
   - **问题**：更新 dotPath 时更新了 `argv`，但应该更新 `opts`

### 3. 根本原因

1. **索引计算错误**：当 dotPath 在 argv 中找到时，`dotPathIndex` 是相对于 argv 的索引，但应该计算在 opts 中的位置
2. **更新位置错误**：更新 dotPath 时应该更新 `opts[dotPathIndex]` 而不是 `argv[dotPathIndex]`
3. **环境变量传递**：Windows 上 PATH 环境变量可能没有正确传递给 Java 子进程

## 修复内容

### 修复1：正确检查 opts 中的 -graphvizdot 参数

**文件**：`lib/plantuml-executor.js`

**修复前**：
```javascript
// 只检查 argv
for (var i = 0; i < argv.length; i++) {
  if (argv[i] === '-graphvizdot' && i + 1 < argv.length) {
    dotPath = argv[i + 1]
    dotPathIndex = i + 1  // 错误：这是 argv 的索引
    break
  }
}
```

**修复后**：
```javascript
// 先检查 argv（计算在 opts 中的位置）
for (var i = 0; i < argv.length; i++) {
  if (argv[i] === '-graphvizdot' && i + 1 < argv.length) {
    dotPath = argv[i + 1]
    // 计算在 opts 中的索引（argv 在 opts 中的起始位置是 7）
    dotPathIndex = 7 + i + 1
    break
  }
}

// 如果没找到，再检查 opts（以防万一）
if (!dotPath) {
  for (var i = 0; i < opts.length; i++) {
    if (opts[i] === '-graphvizdot' && i + 1 < opts.length) {
      dotPath = opts[i + 1]
      dotPathIndex = i + 1
      break
    }
  }
}
```

### 修复2：正确更新 opts 中的 dotPath

**修复前**：
```javascript
if (dotPathIndex >= 0) {
  argv[dotPathIndex] = absoluteDotPath  // 错误：应该更新 opts
}
```

**修复后**：
```javascript
if (dotPathIndex >= 0) {
  opts[dotPathIndex] = absoluteDotPath  // 正确：更新 opts
}
```

### 修复3：改进 Windows PATH 设置

**文件**：`lib/plantuml-executor.js`

**改进**：
- 使用 `path.resolve()` 确保路径是绝对路径
- 同时设置 `PATH`、`Path`（混合大小写）以提升兼容性
- 改进路径规范化逻辑

### 修复4：确保自动检测的 dotPath 被添加到 argv

**文件**：`lib/plantuml-executor.js`

**修复**：如果 dotPath 是自动检测的（不在 argv 中），现在会将其添加到 opts 中：
```javascript
else if (dotPathAutoDetected) {
  // 将 -graphvizdot 和路径添加到 opts 中
  opts.splice(insertIndex, 0, '-graphvizdot', absoluteDotPath)
}
```

## 测试脚本

创建了以下测试脚本来验证修复：

1. **test-graphviz-detection.js**：测试 Graphviz 检测和配置
2. **test-external-usage.js**：测试外部项目的调用方式
3. **test-metadoc-simulation.js**：模拟 MetaDoc 项目的调用方式

## 验证步骤

1. 运行测试脚本：
   ```bash
   node scripts/test-graphviz-detection.js
   node scripts/test-metadoc-simulation.js
   ```

2. 检查输出：
   - 应该能正确检测到 Graphviz
   - 应该能生成有效的 SVG
   - 不应该出现 "cannot parse result from dot" 错误

3. 在 MetaDoc 项目中测试：
   - 使用需要 Graphviz 的 PlantUML 图表
   - 验证是否能正常渲染

## 注意事项

1. **Graphviz 包必须安装**：确保 `@node-plantuml-2/graphviz-{platform}-{arch}` 包已安装
2. **环境变量**：Windows 上 PATH 环境变量会自动设置，但需要确保 DLL 文件在 bin 目录中
3. **路径格式**：Windows 上使用反斜杠，Unix 上使用正斜杠

## 相关文件

- `lib/plantuml-executor.js`：主要修复文件
- `lib/dot-resolver.js`：Graphviz 检测逻辑
- `lib/node-plantuml.js`：PlantUML API 入口

