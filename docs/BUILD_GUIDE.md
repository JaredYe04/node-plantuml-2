# 一键构建指南

## 快速开始

### 完整构建（推荐）

一键执行所有构建步骤（下载 PlantUML JAR + 构建 Wasm 模块）：

```bash
npm run build:all
```

这个命令会自动：
1. ✅ 从 GitHub Releases 下载最新的 PlantUML JAR
2. ✅ 下载 Bytecoder CLI（如需要）
3. ✅ 构建 Wasm 模块

### 分步构建

如果需要单独执行某个步骤：

```bash
# 仅下载 PlantUML JAR
npm run build:all:jar-only

# 仅构建 Wasm 模块（需要已有 JAR）
npm run build:all:wasm-only

# 使用原始脚本
npm run build:wasm
```

## 构建选项

### 完整构建脚本选项

```bash
# 跳过 JAR 下载（如果已存在）
node scripts/build-all.js --skip-jar

# 跳过 Wasm 构建（仅下载 JAR）
node scripts/build-all.js --skip-wasm

# 显示帮助
node scripts/build-all.js --help
```

## 系统要求

- **Node.js 12+** (推荐 20+)
- **Java 运行时** (用于构建 Wasm)
- **网络连接** (下载 JAR 和 Bytecoder CLI)

## 构建流程

```
开始
  ↓
检查系统要求（Node.js、Java）
  ↓
步骤 1: 下载 PlantUML JAR
  ├─ 获取最新版本（GitHub API）
  ├─ 下载 JAR 文件
  └─ 更新 package.json 版本号
  ↓
步骤 2: 构建 Wasm 模块
  ├─ 下载 Bytecoder CLI（如需要）
  ├─ 使用 Bytecoder 编译 JAR → Wasm
  └─ 输出到 vendor/wasm/plantuml.wasm
  ↓
完成
```

## 故障排除

### Bytecoder CLI 下载失败

如果遇到 404 错误，脚本会自动：
1. 尝试从 GitHub API 获取最新版本
2. 如果 API 失败，使用已知可用的 fallback 版本
3. 如果仍然失败，检查网络连接

**手动解决：**
```bash
# 检查网络连接
ping github.com

# 手动下载 Bytecoder CLI
# 访问: https://github.com/mirkosertic/Bytecoder/releases
```

### Java 未找到

如果系统未安装 Java，Wasm 构建将失败。

**解决方法：**
- Windows: 下载并安装 [Java JDK](https://adoptium.net/)
- macOS: `brew install openjdk`
- Linux: `apt-get install openjdk-11-jdk` 或 `yum install java-11-openjdk`

### PlantUML JAR 下载失败

**可能原因：**
- 网络连接问题
- GitHub API 限制

**解决方法：**
```bash
# 重试构建
npm run build:all

# 或手动下载
node scripts/get-plantuml-jar.js --latest
```

### Wasm 构建失败

**可能原因：**
- Bytecoder CLI 不兼容
- PlantUML JAR 版本问题
- 内存不足

**解决方法：**
```bash
# 检查 Java 内存设置
export JAVA_OPTS="-Xmx2048m"

# 清理并重试
rm -rf vendor/wasm/build
npm run build:all:wasm-only
```

## 输出文件

构建完成后，你会看到以下文件：

```
vendor/
├── plantuml.jar          # PlantUML JAR 文件
├── bytecoder-cli.jar     # Bytecoder CLI（自动下载）
└── wasm/
    ├── plantuml.wasm     # Wasm 模块（构建输出）
    └── build/            # 构建临时文件
```

## 验证构建

构建完成后，可以验证：

```bash
# 测试 Wasm 执行器
node test/wasm-executor-test.js

# 运行批量转换测试
npm run test:batch
```

## 使用构建结果

构建完成后，可以使用 Wasm 执行器：

```javascript
// 启用 Wasm 模式
process.env.PLANTUML_USE_WASM = 'true'

var plantuml = require('node-plantuml')
var gen = plantuml.generate('@startuml\nA -> B\n@enduml')
gen.out.pipe(fs.createWriteStream('output.png'))
```

## 持续集成

在 CI/CD 中使用：

```yaml
# GitHub Actions 示例
- name: Build PlantUML Wasm
  run: |
    npm install
    npm run build:all
```

```yaml
# GitLab CI 示例
build:
  script:
    - npm install
    - npm run build:all
```

## 性能提示

- **首次构建**：需要下载 ~20MB 的 JAR 和 CLI，可能需要几分钟
- **后续构建**：仅重新编译 Wasm 模块，通常更快
- **增量构建**：如果 JAR 和 CLI 已存在，会跳过下载步骤

## 常见问题

### Q: 可以离线构建吗？

A: 可以，如果所有依赖（JAR、CLI）已下载，可以离线构建 Wasm 模块：
```bash
npm run build:all:wasm-only
```

### Q: 如何更新到最新版本？

A: 运行完整构建会自动获取最新版本：
```bash
npm run build:all
```

### Q: 构建失败后如何清理？

A: 删除构建输出并重试：
```bash
rm -rf vendor/wasm/build vendor/wasm/plantuml.wasm
npm run build:all:wasm-only
```

## 更多信息

- [Wasm 集成文档](WASM_INTEGRATION.md)
- [实现指南](WASM_IMPLEMENTATION.md)
- [测试框架](../test/README.md)

