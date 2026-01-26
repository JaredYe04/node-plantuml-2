# 修复验证报告

## 修复内容

### 1. 修复 dotPathIndex 计算错误
**问题**：当 `-graphvizdot` 参数在 `argv` 中找到时，`dotPathIndex` 是相对于 `argv` 的索引，但实际使用的是 `opts` 数组。

**修复**：
- 正确计算 `dotPathIndex` 在 `opts` 中的位置：`dotPathIndex = 7 + i + 1`（7 是初始 opts 数组的长度）
- 同时检查 `argv` 和 `opts` 中的 `-graphvizdot` 参数

### 2. 修复更新位置错误
**问题**：更新 dotPath 时更新了 `argv[dotPathIndex]`，但应该更新 `opts[dotPathIndex]`。

**修复**：
- 改为更新 `opts[dotPathIndex] = absoluteDotPath`

### 3. 确保自动检测的 dotPath 被添加到 opts
**问题**：如果 dotPath 是自动检测的（不在 argv 中），没有将其添加到 opts 中。

**修复**：
- 添加 `dotPathAutoDetected` 标志
- 如果自动检测到 dotPath，将其添加到 opts 中

### 4. 改进 Windows PATH 环境变量设置
**修复**：
- 使用 `path.resolve()` 确保路径是绝对路径
- 同时设置 `PATH`、`Path`（混合大小写）以提升兼容性

## 测试结果

### ✅ 测试通过
1. **test-metadoc-simulation.js**：模拟 MetaDoc 调用方式 - ✅ 通过
2. **test-direct-call.js**：直接调用 PlantUML - ✅ 通过
3. **test-graphviz-detection.js**：Graphviz 检测测试 - ✅ 通过

### 补丁应用
- ✅ 已成功应用到 MetaDoc 项目中的 node-plantuml-2@1.1.6

## package.json 配置

### optionalDependencies 已正确配置
```json
"optionalDependencies": {
  "@node-plantuml-2/jre-win32-x64": "^1.1.6",
  "@node-plantuml-2/jre-darwin-arm64": "^1.1.6",
  "@node-plantuml-2/jre-linux-x64": "^1.1.6",
  "@node-plantuml-2/graphviz-win32-x64": "^1.1.6",
  "@node-plantuml-2/graphviz-darwin-arm64": "^1.1.6",
  "@node-plantuml-2/graphviz-darwin-x64": "^1.1.6",
  "@node-plantuml-2/graphviz-linux-x64": "^1.1.6"
}
```

**说明**：
- `optionalDependencies` 会在 `npm install` 时自动安装匹配平台的包
- 如果安装失败，不会阻止主包的安装
- 这是正确的配置方式

## 下一步

1. **发布新版本**：将修复发布为新版本（如 1.1.7）
2. **更新 MetaDoc**：在 MetaDoc 项目中更新到新版本
3. **验证**：在 MetaDoc 项目中测试修复是否有效

## 验证命令

在 MetaDoc 项目中测试：
```bash
# 在 MetaDoc 项目中运行
node -e "const plantuml = require('node-plantuml-2'); const gen = plantuml.generate({ format: 'svg' }); gen.in.write('@startuml\nA -> B\n@enduml'); gen.in.end(); gen.out.on('data', (c) => process.stdout.write(c));"
```

