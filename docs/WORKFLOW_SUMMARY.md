# GitHub Actions 工作流完整说明

## ✅ 已创建/更新的文件

1. **`.github/workflows/publish.yml`** - 完整的多平台发布工作流
2. **`scripts/create-runtime-package-json.js`** - 自动创建 runtime 包 package.json
3. **`docs/GITHUB_ACTIONS_WORKFLOW.md`** - 详细的工作流文档

## 🏗️ 工作流架构

```
prepare (ubuntu-latest)
  ↓ 确定版本号
  ↓
build-and-publish-runtimes (matrix: 4 个平台并行)
  ├─ linux x64 (ubuntu-latest)
  ├─ win32 x64 (windows-latest)
  ├─ darwin x64 (macos-12)
  └─ darwin arm64 (macos-14)
  ↓ 所有平台发布完成后
  ↓
publish-main (ubuntu-latest)
  ↓ 发布主包
```

## 📋 执行流程

### 阶段 1: 准备 (prepare)

**目标**: 确定要发布的版本号

**步骤**:
1. 检出代码
2. 同步远程仓库（workflow_dispatch）
3. 安装依赖
4. 确定版本号:
   - `workflow_dispatch`: 基于 npm 现有版本递增（patch/minor/major）
   - `release`: 使用 release tag 的版本号
5. 更新主包 `package.json` 版本
6. 输出版本号到 `$GITHUB_OUTPUT`

### 阶段 2: 构建和发布 Runtime 包

**矩阵策略**: 4 个平台并行执行

**每个平台执行**:

1. **环境准备**
   - Setup Node.js 20
   - Setup Java 17 (Temurin)
   - 验证 Java 和 jlink

2. **构建准备**
   - 安装依赖
   - 下载 PlantUML JAR
   - 创建 runtime 目录

3. **创建 package.json**
   ```bash
   node scripts/create-runtime-package-json.js <platform> <arch> <version>
   ```

4. **构建 JRE**
   ```bash
   node scripts/build-jre.js <platform> <arch>
   ```

5. **验证和测试**
   - 验证 JRE 可执行文件存在
   - 运行 `java -version`
   - 使用 PlantUML 生成测试图表

6. **发布**
   - 检查版本是否已存在
   - 如果不存在，发布到 npm
   - 如果存在，跳过并输出警告

### 阶段 3: 发布主包

**等待**: 所有 runtime 包发布完成

**步骤**:

1. **更新版本和依赖**
   - 更新主包版本
   - 更新 `optionalDependencies` 为相同版本

2. **发布准备**
   - 下载 PlantUML JAR
   - 验证 npm 认证
   - 验证版本不存在

3. **发布**
   - 发布主包到 npm

4. **Git 操作** (workflow_dispatch)
   - 提交版本更改
   - 创建并推送 Git tag
   - 创建 GitHub Release

## 🔧 关键特性

### 1. 版本同步

所有包使用相同版本号：
- Runtime 包: `@node-plantuml-2/jre-*-*@1.0.3`
- 主包: `node-plantuml-2@1.0.3`
- 主包的 `optionalDependencies`: `^1.0.3`

### 2. 智能版本检查

- 发布前检查版本是否已存在
- 如果存在，跳过发布（避免错误）
- 主包发布前验证所有 runtime 包

### 3. 跨平台支持

- Linux x64: Ubuntu runner
- Windows x64: Windows runner  
- macOS x64: macOS 12 runner
- macOS ARM64: macOS 14 runner

### 4. 错误处理

- PlantUML 测试失败不会阻止发布 (`continue-on-error: true`)
- 版本已存在时优雅跳过
- 详细的日志输出

## 📦 发布的包

### Runtime 包（4 个）

每次发布会创建并发布以下包：

1. `@node-plantuml-2/jre-linux-x64@<version>`
2. `@node-plantuml-2/jre-win32-x64@<version>`
3. `@node-plantuml-2/jre-darwin-x64@<version>`
4. `@node-plantuml-2/jre-darwin-arm64@<version>`

### 主包（1 个）

`node-plantuml-2@<version>`

包含更新的 `optionalDependencies`，指向相同版本的 runtime 包。

## 🚀 使用方法

### 手动触发

1. 访问 GitHub Actions 页面
2. 选择 "Publish to npm" 工作流
3. 点击 "Run workflow"
4. 选择版本类型：
   - `patch`: 1.0.2 → 1.0.3
   - `minor`: 1.0.2 → 1.1.0
   - `major`: 1.0.2 → 2.0.0
5. 点击 "Run workflow"

### Release 触发

1. 在 GitHub 创建 Release
2. Tag 格式: `v1.0.3`
3. 工作流自动执行
4. 使用 release tag 的版本号

## ⚙️ 必需的配置

### GitHub Secrets

在 GitHub 仓库设置中配置：

- **`NPM_TOKEN`**: npm 发布令牌
  - 获取: npm → Access Tokens → Generate New Token
  - 类型: Automation
  - 权限: Read and Publish packages
  - 作用域: 整个组织或特定包

### npm 组织

确保 npm 组织 `@node-plantuml-2` 存在，并且 GitHub Actions 使用的 npm token 有发布权限。

## 🔍 验证发布

发布完成后，验证所有包：

```bash
# 检查所有包的版本（应该相同）
npm view node-plantuml-2 version
npm view @node-plantuml-2/jre-linux-x64 version
npm view @node-plantuml-2/jre-win32-x64 version
npm view @node-plantuml-2/jre-darwin-x64 version
npm view @node-plantuml-2/jre-darwin-arm64 version
```

## 📊 执行时间

- **准备阶段**: ~1-2 分钟
- **Runtime 包构建**: ~5-10 分钟/平台（并行执行，取决于最慢的平台）
- **主包发布**: ~1-2 分钟

**总时间**: 约 10-15 分钟

## 🐛 常见问题

### Q: Runtime 包构建失败

**A**: 检查：
- Java 版本是否正确（需要 17+）
- jlink 是否可用
- GitHub Actions 日志中的错误信息

### Q: 版本已存在错误

**A**: 
- 工作流会自动跳过已存在的版本
- 如果需要重新发布，使用新的版本号

### Q: npm 认证失败

**A**: 
- 检查 `NPM_TOKEN` secret 是否正确配置
- 验证 token 是否有发布权限
- 检查 token 是否过期

### Q: Windows 构建失败

**A**: 
- 所有步骤已设置为使用 `shell: bash`
- GitHub Actions 的 Windows runner 支持 bash
- 检查路径是否正确（使用正斜杠或 path.join）

## ✅ 工作流已就绪

工作流已配置完成，可以：
- ✅ 自动在 4 个平台构建 JRE
- ✅ 自动发布所有 runtime 包
- ✅ 自动同步版本号
- ✅ 自动发布主包
- ✅ 创建 Git tag 和 Release

只需要配置 `NPM_TOKEN` secret 即可使用！

