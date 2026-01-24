# CI/CD 测试说明

## 概述

CI/CD 工作流现在包含全面的跨平台测试，确保在不同环境下（Windows、Linux、macOS）JRE、Graphviz 和 PlantUML 都能正常工作。

## 测试覆盖

### 平台覆盖

- **Linux** (`ubuntu-latest`) - Node.js 16.x, 18.x, 20.x
- **macOS** (`macos-latest`) - Node.js 18.x, 20.x
- **Windows** (`windows-latest`) - Node.js 18.x, 20.x

### 测试内容

每个平台都运行以下测试：

#### 1. JRE 检测和访问测试
- 检测 JRE 路径（捆绑的 JRE 或系统 Java）
- 验证 JRE 可以正常执行
- 测试 Java 版本命令

#### 2. Graphviz 检测和调用测试
- 检测 Graphviz dot 路径（捆绑的 Graphviz 或系统安装）
- 验证 Graphviz 可以正常执行
- 测试 dot 版本命令
- 测试 PlantUML testdot 命令

#### 3. PlantUML 渲染测试
- 简单 PNG 生成测试
- SVG 生成测试
- Graphviz 依赖图表测试（如果 Graphviz 可用）
- 多格式测试

#### 4. 综合集成测试
运行 `test/test-integration-full.js`，包含：
- JRE 检测和执行
- Graphviz 检测和执行
- PlantUML JAR 验证
- PlantUML testdot
- PNG 生成
- SVG 生成
- Graphviz 依赖图表生成

## 工作流结构

### `.github/workflows/ci.yml`

包含三个主要 job：

1. **test-linux** - Linux 平台测试
2. **test-mac** - macOS 平台测试
3. **test-windows** - Windows 平台测试

每个 job 都包含：
- 环境设置（Node.js、Graphviz）
- 依赖安装
- PlantUML JAR 下载
- 单元测试
- 综合集成测试

## 测试脚本

### `test/test-integration-full.js`

综合集成测试脚本，测试：

1. **JRE Detection** - JRE 检测和执行
2. **Graphviz Detection** - Graphviz 检测和执行
3. **PlantUML JAR** - JAR 文件存在性检查
4. **PlantUML testdot** - Graphviz 集成测试
5. **PNG Generation** - PNG 格式生成测试
6. **SVG Generation** - SVG 格式生成测试
7. **Graphviz Diagram** - Graphviz 依赖图表测试
8. **Multiple Formats** - 多格式测试

### 使用方法

```bash
# 运行综合集成测试
npm run test:integration

# 或直接运行
node test/test-integration-full.js
```

## 平台特定设置

### Linux

- 使用 `ubuntu-latest` runner
- 通过 `apt-get` 安装 Graphviz（如果需要）
- 测试捆绑的 JRE 和 Graphviz

### macOS

- 使用 `macos-latest` runner
- 通过 Homebrew 安装 Graphviz
- 支持 Apple Silicon 和 Intel Mac
- 测试 Graphviz 路径自动检测

### Windows

- 使用 `windows-latest` runner
- 通过 Chocolatey 或 Winget 安装 Graphviz
- 使用 PowerShell 脚本
- 测试 Windows 路径格式

## 测试结果

测试会输出详细的测试结果：

```
=== Comprehensive Integration Test ===
Platform: win32 x64

Test 1: JRE Detection
---
✓ JRE Detection: Found at: ...
✓ JRE Execution: Java version check passed

Test 2: Graphviz Detection
---
✓ Graphviz Detection: Found at: ...
✓ Graphviz Source: Using bundled/system Graphviz
✓ Graphviz Execution: dot version check passed

Test 3: PlantUML JAR
---
✓ PlantUML JAR Exists: Size: 25.64 MB

Test 4: PlantUML testdot
---
✓ PlantUML testdot: Graphviz integration OK

Test 5: Simple PNG Generation
---
✓ PNG Generation: Generated 1571 bytes, valid PNG: Yes

Test 6: SVG Generation
---
✓ SVG Generation: Generated 2847 bytes, valid SVG: Yes

Test 7: Graphviz-dependent Diagram
---
✓ Graphviz Diagram: Generated 1366 bytes

=== Test Summary ===
Total tests: 10
Passed: 10
Failed: 0

✅ All tests passed!
```

## 故障排查

### JRE 未找到

- 检查 optionalDependencies 是否正确安装
- 检查 JAVA_HOME 环境变量
- 验证系统 Java 安装

### Graphviz 未找到

- 检查系统 Graphviz 安装
- 检查捆绑的 Graphviz 包是否安装
- 验证 PATH 环境变量

### PlantUML 渲染失败

- 检查 PlantUML JAR 是否存在
- 验证 JRE 可以执行 Java 命令
- 检查 Graphviz 是否正确配置

## 持续改进

- [x] 跨平台测试覆盖
- [x] JRE 检测测试
- [x] Graphviz 检测测试
- [x] PlantUML 渲染测试
- [x] 综合集成测试
- [ ] 性能基准测试
- [ ] 压力测试
- [ ] 错误恢复测试

