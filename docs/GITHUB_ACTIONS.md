# GitHub Actions CI/CD 工作流说明

## 概述

本项目配置了完整的 GitHub Actions CI/CD 工作流，支持自动化测试和发布。

## 工作流文件

### 1. CI 工作流 (`.github/workflows/ci.yml`)

**触发条件：**
- Push 到 `main`, `master`, `develop` 分支
- Pull Request 到 `main`, `master`, `develop` 分支

**执行内容：**
- 多版本 Node.js 测试（16.x, 18.x, 20.x）
- 安装依赖
- 下载 PlantUML JAR
- 运行构建
- 代码检查（linting）
- 运行测试

### 2. 发布工作流 (`.github/workflows/publish.yml`)

**触发条件：**
- 创建 GitHub Release
- 手动触发（workflow_dispatch）

**执行内容：**
- 版本号管理（自动递增或使用 Release 标签）
- 下载 PlantUML JAR
- 构建 Wasm 模块（可选，实验性）
- 验证 npm 认证
- 发布到 npm
- 创建 Git 标签
- 创建 GitHub Release

## 使用方法

### 自动发布（推荐）

1. **创建 GitHub Release**
   - 在 GitHub 上创建新的 Release
   - 标签格式：`v0.9.0`
   - 工作流会自动发布到 npm

### 手动发布

1. **在 GitHub Actions 中手动触发**
   - 进入 Actions 标签页
   - 选择 "Publish to npm" 工作流
   - 点击 "Run workflow"
   - 选择版本类型（patch/minor/major）

2. **版本号自动管理**
   - 工作流会自动检查 npm 上的最新版本
   - 自动递增版本号
   - 避免版本冲突

## 配置要求

### NPM Token

需要在 GitHub 仓库中配置 NPM_TOKEN secret：

1. 进入仓库 Settings > Secrets and variables > Actions
2. 添加新 secret：`NPM_TOKEN`
3. 使用 npm access token（从 https://www.npmjs.com/settings/YOUR_USERNAME/tokens 创建）
4. Token 类型必须是 "Automation" 才能发布

### 权限设置

发布工作流需要以下权限：
- `contents: write` - 创建 Git 标签和 Release
- `packages: write` - 发布到 npm

## 工作流步骤详解

### CI 工作流

```yaml
1. Checkout code
2. Setup Node.js (多版本矩阵)
3. Install dependencies
4. Download PlantUML JAR
5. Build
6. Run linting
7. Run tests
```

### 发布工作流

```yaml
1. Checkout code
2. Setup Node.js
3. Setup Java & Maven (for Wasm build)
4. Configure Git
5. Sync with remote (if manual)
6. Install dependencies
7. Bump version
8. Verify version
9. Download PlantUML JAR
10. Build Wasm (optional)
11. Verify NPM authentication
12. Publish to npm
13. Create Git tag and push
14. Create GitHub Release
```

## 版本管理

### 自动版本递增

工作流会自动：
1. 检查 npm 上的最新版本
2. 与本地版本比较
3. 根据选择的类型（patch/minor/major）递增
4. 避免版本冲突

### Release 标签

- 创建 Release 时，使用标签中的版本号
- 格式：`v0.9.0`
- 工作流会自动提取版本号并发布

## 故障排除

### 发布失败

**常见原因：**
- NPM_TOKEN 未配置或无效
- 版本号已存在
- 网络问题

**解决方法：**
1. 检查 GitHub Secrets 中的 NPM_TOKEN
2. 检查 npm 上的版本号
3. 查看工作流日志

### Wasm 构建失败

Wasm 构建是实验性的，失败不会阻止发布：
- 工作流会继续执行
- 用户可以使用 Java 执行器作为 fallback

## 最佳实践

1. **测试优先**：确保 CI 测试通过后再发布
2. **版本管理**：使用语义化版本（SemVer）
3. **Release Notes**：在 GitHub Release 中添加详细的更新说明
4. **监控**：发布后检查 npm 包是否正确发布

## 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [npm 发布指南](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [语义化版本](https://semver.org/)

