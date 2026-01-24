# Graphviz npm 包实现说明

## 概述

为了确保跨平台的 Graphviz 支持，我们将 Graphviz 二进制文件打包为独立的 npm 包，类似于 JRE 包的方式。这样用户无需手动安装 Graphviz，也避免了依赖外部 CDN 的不稳定性。

## 架构设计

### 包结构

为每个支持的平台创建独立的 npm 包：

- `@node-plantuml-2/graphviz-win32-x64` - Windows x64
- `@node-plantuml-2/graphviz-darwin-arm64` - macOS ARM64 (Apple Silicon)
- `@node-plantuml-2/graphviz-darwin-x64` - macOS x64 (Intel)
- `@node-plantuml-2/graphviz-linux-x64` - Linux x64

### 优先级顺序

`dot-resolver.js` 按以下优先级查找 Graphviz：

1. **用户指定路径** (`options.dotPath`) - 最高优先级
2. **捆绑的 Graphviz** (npm 包) - **新增，优先于系统安装**
3. **系统安装路径** (常见安装位置)
4. **PATH 中的 dot** (系统 PATH)

## 实现文件

### 1. `scripts/build-graphviz.js`

从系统安装的 Graphviz 复制二进制文件到 npm 包结构。

**功能：**
- 查找系统安装的 Graphviz
- 复制 `bin`、`lib`、`share` 等目录
- 创建标准的 npm 包结构

**使用方法：**
```bash
node scripts/build-graphviz.js <platform> <arch>
```

### 2. `scripts/create-graphviz-package-json.js`

为 Graphviz 运行时包创建 `package.json`。

**功能：**
- 设置正确的包名、版本、OS/CPU 限制
- 配置 files 字段（只包含 graphviz 目录）

**使用方法：**
```bash
node scripts/create-graphviz-package-json.js <platform> <arch> <version>
```

### 3. `lib/dot-resolver.js` (更新)

添加了捆绑 Graphviz 的检测功能。

**新增函数：**
- `resolveBundledGraphviz()` - 解析捆绑的 Graphviz 路径
- `getGraphvizPackageName()` - 根据平台和架构获取包名

**更新：**
- `resolveDotExecutable()` 现在优先查找捆绑的 Graphviz

### 4. `package.json` (更新)

添加了 Graphviz 包的 optionalDependencies：

```json
{
  "optionalDependencies": {
    "@node-plantuml-2/graphviz-win32-x64": "^1.0.4",
    "@node-plantuml-2/graphviz-darwin-arm64": "^1.0.4",
    "@node-plantuml-2/graphviz-darwin-x64": "^1.0.4",
    "@node-plantuml-2/graphviz-linux-x64": "^1.0.4"
  }
}
```

### 5. `.github/workflows/publish.yml` (更新)

添加了 `build-and-publish-graphviz` job，在发布时：

1. 在每个平台的 runner 上安装 Graphviz
2. 使用 `build-graphviz.js` 构建包
3. 创建 package.json
4. 发布到 npm

## 测试脚本

### `scripts/test-graphviz-build.js`

测试当前平台的 Graphviz 构建和检测。

**测试内容：**
1. 检查系统 Graphviz 安装
2. 测试 dot-resolver 检测
3. 测试捆绑 Graphviz 检测
4. 构建 Graphviz 包
5. 测试 package.json 创建

**使用方法：**
```bash
npm run test:graphviz
# 或
node scripts/test-graphviz-build.js [platform] [arch]
```

### `scripts/test-all-platforms-graphviz.js`

测试所有支持平台的 Graphviz 支持情况。

**功能：**
- 检查所有平台的包名
- 检查已安装的包
- 检查是否可以构建

**使用方法：**
```bash
node scripts/test-all-platforms-graphviz.js
```

## 工作流程

### 发布流程

1. **准备阶段** (`prepare` job)
   - 确定版本号
   - 下载 PlantUML JAR

2. **构建 Graphviz 包** (`build-and-publish-graphviz` job)
   - 在 4 个平台的 runner 上并行运行
   - 安装系统 Graphviz
   - 构建并发布 npm 包

3. **构建 JRE 包** (`build-and-publish-runtimes` job)
   - 构建 JRE 包（现有流程）

4. **发布主包** (`publish-main` job)
   - 更新 optionalDependencies
   - 发布主包

### 用户安装流程

1. 用户运行 `npm install node-plantuml-2`
2. npm 自动安装对应平台的 Graphviz 包（optionalDependencies）
3. `dot-resolver.js` 优先使用捆绑的 Graphviz
4. 如果包未安装，回退到系统安装的 Graphviz

## 验证测试

### 在 Windows 上测试

```bash
# 测试所有平台支持
node scripts/test-all-platforms-graphviz.js

# 测试当前平台构建
npm run test:graphviz
```

**预期结果：**
- ✓ 系统 Graphviz 检测正常
- ✓ dot-resolver 检测正常
- ✓ 可以成功构建 Graphviz 包
- ✓ 构建的包包含 dot.exe

### 在 macOS 上测试

```bash
# 确保安装了 Graphviz
brew install graphviz

# 运行测试
npm run test:graphviz
```

### 在 Linux 上测试

```bash
# 确保安装了 Graphviz
sudo apt-get install graphviz

# 运行测试
npm run test:graphviz
```

## 包结构

构建后的包结构：

```
graphviz-<platform>-<arch>/
├── package.json
└── graphviz/
    ├── bin/
    │   └── dot (或 dot.exe)
    ├── lib/
    │   └── (Graphviz 库文件)
    └── share/
        └── (配置文件等)
```

## 优势

1. **无需手动安装** - 用户无需手动安装 Graphviz
2. **避免网络问题** - 二进制文件打包在 npm 包中，不依赖外部 CDN
3. **跨平台支持** - 自动为每个平台提供正确的二进制文件
4. **版本一致** - 与主包版本同步
5. **自动回退** - 如果包未安装，自动使用系统安装的 Graphviz

## 注意事项

1. **包大小** - Graphviz 二进制文件较大（约 10-50MB），但这是必要的
2. **许可证** - Graphviz 使用 EPL-2.0 许可证
3. **构建要求** - 在发布时，每个平台的 runner 需要先安装 Graphviz
4. **可选依赖** - 使用 optionalDependencies，安装失败不会阻止主包安装

## 未来改进

- [ ] 支持更多平台（如 Linux ARM64）
- [ ] 压缩二进制文件以减小包大小
- [ ] 提供 Graphviz 版本信息
- [ ] 支持自定义 Graphviz 版本

