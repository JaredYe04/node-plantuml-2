# GitHub Actions 工作流说明

## 📋 概述

`.github/workflows/publish.yml` 实现了自动化的多平台构建和发布流程。

## 🏗️ 工作流结构

### 阶段 1: 准备版本 (prepare)

**Runner**: `ubuntu-latest`

- 检出代码
- 同步远程仓库
- 确定发布版本（从 npm 或手动指定）
- 更新主包的版本号

**输出**:
- `version`: 要发布的版本号

### 阶段 2: 构建和发布 Runtime 包 (build-and-publish-runtimes)

**策略**: Matrix strategy（并行运行）

在以下平台上并行构建和发布 JRE runtime 包：

| 平台 | 架构 | Runner | 包名 |
|------|------|--------|------|
| Linux | x64 | `ubuntu-latest` | `@node-plantuml-2/jre-linux-x64` |
| Windows | x64 | `windows-latest` | `@node-plantuml-2/jre-win32-x64` |
| macOS | x64 | `macos-12` | `@node-plantuml-2/jre-darwin-x64` |
| macOS | ARM64 | `macos-14` | `@node-plantuml-2/jre-darwin-arm64` |

**每个平台执行**:
1. Setup Node.js 20
2. Setup Java 17 (Temurin)
3. 验证 Java 和 jlink
4. 安装依赖
5. 下载 PlantUML JAR
6. 创建 runtime 目录
7. 创建 `package.json`（使用脚本）
8. 构建 JRE（使用 jlink）
9. 验证 JRE
10. 测试 JRE 与 PlantUML
11. 检查版本是否已存在
12. 发布到 npm（如果版本不存在）

### 阶段 3: 发布主包 (publish-main)

**Runner**: `ubuntu-latest`

**依赖**: 等待所有 runtime 包发布完成

1. 更新主包版本
2. 更新 `optionalDependencies` 版本（匹配所有 runtime 包）
3. 下载 PlantUML JAR
4. 验证版本
5. 发布主包到 npm
6. 创建 Git tag 和推送（workflow_dispatch）
7. 创建 GitHub Release（workflow_dispatch）

## 🔄 版本同步

所有包的版本保持一致：

1. **准备阶段**：确定版本号（例如 `1.0.3`）
2. **Runtime 包**：每个包使用相同版本号 `1.0.3`
3. **主包**：使用相同版本号，并更新 `optionalDependencies` 为 `^1.0.3`

## 📦 发布的包

### Runtime 包（4 个）

- `@node-plantuml-2/jre-linux-x64@1.0.3`
- `@node-plantuml-2/jre-win32-x64@1.0.3`
- `@node-plantuml-2/jre-darwin-x64@1.0.3`
- `@node-plantuml-2/jre-darwin-arm64@1.0.3`

### 主包（1 个）

- `node-plantuml-2@1.0.3`
  - `optionalDependencies`:
    - `@node-plantuml-2/jre-linux-x64: ^1.0.3`
    - `@node-plantuml-2/jre-win32-x64: ^1.0.3`
    - `@node-plantuml-2/jre-darwin-x64: ^1.0.3`
    - `@node-plantuml-2/jre-darwin-arm64: ^1.0.3`

## 🚀 触发方式

### 方式 1: 手动触发 (workflow_dispatch)

```yaml
on:
  workflow_dispatch:
    inputs:
      version: patch | minor | major
```

**使用**:
1. 在 GitHub Actions 页面点击 "Run workflow"
2. 选择版本类型（patch/minor/major）
3. 工作流自动执行

### 方式 2: Release 创建

```yaml
on:
  release:
    types: [created]
```

**使用**:
1. 在 GitHub 创建 Release（例如 `v1.0.3`）
2. 工作流自动执行
3. 使用 Release tag 的版本号

## ⚙️ 环境变量和 Secrets

### 必需的 Secrets

- `NPM_TOKEN`: npm 发布令牌
  - 获取方式: npm → Access Tokens → Generate New Token (Automation)
  - 权限: Read and Publish packages

### 环境变量

- `NODE_AUTH_TOKEN`: 自动从 `secrets.NPM_TOKEN` 设置

## 🔍 关键步骤说明

### 版本检查

每个 runtime 包发布前会检查版本是否已存在：
- 如果存在：跳过发布，输出警告
- 如果不存在：正常发布

### JRE 测试

每个平台构建后都会：
1. 验证 JRE 可执行文件存在
2. 运行 `java -version`
3. 使用 PlantUML JAR 生成测试图表
4. 验证输出文件非空

### 错误处理

- `continue-on-error: true`: PlantUML 测试失败不会阻止发布
- 版本检查失败会跳过发布（避免重复发布）
- 主包发布前验证所有 runtime 包版本

## 📊 执行时间

- **准备阶段**: ~1-2 分钟
- **Runtime 包构建**（并行）: ~5-10 分钟/平台
- **主包发布**: ~1-2 分钟

**总时间**: 约 10-15 分钟（取决于最慢的平台）

## ✅ 验证发布

发布后验证：

```bash
# 检查主包
npm view node-plantuml-2 version

# 检查 runtime 包
npm view @node-plantuml-2/jre-linux-x64 version
npm view @node-plantuml-2/jre-win32-x64 version
npm view @node-plantuml-2/jre-darwin-x64 version
npm view @node-plantuml-2/jre-darwin-arm64 version

# 应该都是相同的版本号
```

## 🐛 故障排除

### Runtime 包构建失败

**可能原因**:
- Java/jlink 不可用
- jlink 命令失败
- JRE 验证失败

**检查**:
- GitHub Actions 日志
- Java 版本是否正确（需要 17+）
- jlink 是否可用

### 版本已存在

**处理**: 工作流会自动跳过已存在的版本

**解决**: 使用新的版本号，或删除 npm 上的包（不推荐）

### npm 认证失败

**检查**:
- `NPM_TOKEN` secret 是否正确配置
- Token 是否过期
- Token 是否有发布权限

## 📝 注意事项

1. **版本一致性**: 所有包必须使用相同版本号
2. **顺序发布**: 先发布 runtime 包，再发布主包
3. **GitHub Actions 限制**: 并行任务数量有限制
4. **macOS Runner**: macOS runner 可能需要更长时间

## 🔗 相关文件

- `.github/workflows/publish.yml` - 工作流定义
- `scripts/build-jre.js` - JRE 构建脚本
- `scripts/create-runtime-package-json.js` - package.json 创建脚本
- `docs/BUILD_JRE_RUNTIMES.md` - JRE 构建指南

