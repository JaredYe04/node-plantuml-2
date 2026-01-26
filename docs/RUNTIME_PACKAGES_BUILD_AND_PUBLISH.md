# 运行时包构建和发布指南

本文档说明如何构建和发布 JRE 和 Graphviz 运行时包。

## 📦 支持的运行时包

### JRE 运行时包
- `@node-plantuml-2/jre-win32-x64`
- `@node-plantuml-2/jre-darwin-arm64`
- `@node-plantuml-2/jre-darwin-x64`
- `@node-plantuml-2/jre-linux-x64`

### Graphviz 运行时包
- `@node-plantuml-2/graphviz-win32-x64`
- `@node-plantuml-2/graphviz-darwin-arm64`
- `@node-plantuml-2/graphviz-darwin-x64`
- `@node-plantuml-2/graphviz-linux-x64`

---

## 🚀 快速开始

### 统一发布脚本（推荐）

我们提供了一个统一的发布脚本，支持 JRE 和 Graphviz：

```bash
# 发布 JRE
node scripts/publish-runtime-package.js jre <platform> <arch> [--version <version>]

# 发布 Graphviz
node scripts/publish-runtime-package.js graphviz <platform> <arch> [--version <version>]
```

**示例：**
```bash
# 发布 Windows x64 JRE
node scripts/publish-runtime-package.js jre win32 x64

# 发布 macOS ARM64 Graphviz，指定版本
node scripts/publish-runtime-package.js graphviz darwin arm64 --version 1.1.4

#  dry-run（测试，不实际发布）
node scripts/publish-runtime-package.js jre linux x64 --dry-run
```

---

## 📋 完整流程

### 1. 构建运行时包

#### 构建 JRE

```bash
# 使用通用脚本
node scripts/build-jre.js <platform> <arch>

# 示例
node scripts/build-jre.js win32 x64
node scripts/build-jre.js darwin arm64
node scripts/build-jre.js linux x64
```

**要求：**
- JDK 17+ 已安装
- `JAVA_HOME` 环境变量已设置（或 `jlink` 在 PATH 中）

#### 构建 Graphviz

```bash
# 使用通用脚本
node scripts/build-graphviz.js <platform> <arch>

# 示例
node scripts/build-graphviz.js win32 x64
node scripts/build-graphviz.js darwin arm64
node scripts/build-graphviz.js linux x64
```

**要求：**
- 系统已安装 Graphviz（用于复制文件）
- macOS: `brew install graphviz`
- Linux: `sudo apt-get install graphviz` 或使用系统包管理器
- Windows: 通过 Chocolatey 或手动安装

### 2. 创建 package.json

#### JRE package.json

```bash
node scripts/create-runtime-package-json.js <platform> <arch> <version>

# 示例
node scripts/create-runtime-package-json.js win32 x64 1.1.3
```

#### Graphviz package.json

```bash
node scripts/create-graphviz-package-json.js <platform> <arch> <version>

# 示例
node scripts/create-graphviz-package-json.js win32 x64 1.1.3
```

**注意：** 版本号应该与主包的版本号保持一致（或根据需要进行版本管理）。

### 3. 验证包内容

#### 验证 JRE

```bash
# 检查 Java 可执行文件
ls runtimes/@node-plantuml-2/jre-<platform>-<arch>/jre/bin/java
# 或 Windows
ls runtimes/@node-plantuml-2/jre-<platform>-<arch>/jre/bin/java.exe

# 测试 Java
runtimes/@node-plantuml-2/jre-<platform>-<arch>/jre/bin/java -version
```

#### 验证 Graphviz

```bash
# 检查 dot 可执行文件
ls runtimes/@node-plantuml-2/graphviz-<platform>-<arch>/graphviz/bin/dot
# 或 Windows
ls runtimes/@node-plantuml-2/graphviz-<platform>-<arch>/graphviz/bin/dot.exe

# 测试 dot
runtimes/@node-plantuml-2/graphviz-<platform>-<arch>/graphviz/bin/dot -V
```

### 4. 发布包

#### 使用统一脚本（推荐）

```bash
# 发布 JRE
node scripts/publish-runtime-package.js jre <platform> <arch>

# 发布 Graphviz
node scripts/publish-runtime-package.js graphviz <platform> <arch>

# 指定版本
node scripts/publish-runtime-package.js jre win32 x64 --version 1.1.4

# Dry-run（测试）
node scripts/publish-runtime-package.js graphviz darwin arm64 --dry-run
```

#### 手动发布

```bash
cd runtimes/@node-plantuml-2/<type>-<platform>-<arch>
npm publish --access public
```

### 5. 验证发布

```bash
# 查看已发布的包
npm view @node-plantuml-2/jre-win32-x64
npm view @node-plantuml-2/graphviz-win32-x64

# 测试安装
npm install @node-plantuml-2/jre-win32-x64@<version>
npm install @node-plantuml-2/graphviz-win32-x64@<version>
```

---

## 🔄 完整示例：发布 Windows x64 包

### JRE

```bash
# 1. 构建 JRE
node scripts/build-jre.js win32 x64

# 2. 创建 package.json
node scripts/create-runtime-package-json.js win32 x64 1.1.3

# 3. 验证
runtimes/@node-plantuml-2/jre-win32-x64/jre/bin/java.exe -version

# 4. 发布（dry-run 先测试）
node scripts/publish-runtime-package.js jre win32 x64 --dry-run

# 5. 实际发布
node scripts/publish-runtime-package.js jre win32 x64
```

### Graphviz

```bash
# 1. 确保系统已安装 Graphviz
# Windows: choco install graphviz -y

# 2. 构建 Graphviz 包
node scripts/build-graphviz.js win32 x64

# 3. 创建 package.json
node scripts/create-graphviz-package-json.js win32 x64 1.1.3

# 4. 验证
runtimes/@node-plantuml-2/graphviz-win32-x64/graphviz/bin/dot.exe -V

# 5. 发布（dry-run 先测试）
node scripts/publish-runtime-package.js graphviz win32 x64 --dry-run

# 6. 实际发布
node scripts/publish-runtime-package.js graphviz win32 x64
```

---

## 📝 版本管理

### 版本号策略

运行时包的版本号通常与主包版本号保持一致：

- 主包版本：`1.1.3`
- JRE 包版本：`1.1.3`
- Graphviz 包版本：`1.1.3`

### 更新版本

1. **更新 package.json**：
   ```bash
   # 手动编辑
   vim runtimes/@node-plantuml-2/jre-win32-x64/package.json
   
   # 或使用脚本时指定版本
   node scripts/publish-runtime-package.js jre win32 x64 --version 1.1.4
   ```

2. **更新主包的 optionalDependencies**：
   ```json
   {
     "optionalDependencies": {
       "@node-plantuml-2/jre-win32-x64": "^1.1.4",
       "@node-plantuml-2/graphviz-win32-x64": "^1.1.4"
     }
   }
   ```

### 版本检查

发布脚本会自动检查版本是否已存在：

```bash
# 如果版本已存在，会提示错误
node scripts/publish-runtime-package.js jre win32 x64
# ❌ Error: Version 1.1.3 already exists on npm
```

---

## ✅ 发布前检查清单

### JRE 包
- [ ] JRE 已构建（`jre/` 目录存在）
- [ ] `package.json` 存在且版本正确
- [ ] Java 可执行文件存在且可运行
- [ ] 已测试 JRE 与 PlantUML 兼容
- [ ] npm 已登录（`npm whoami`）
- [ ] 版本号未在 npm 上存在

### Graphviz 包
- [ ] Graphviz 包已构建（`graphviz/` 目录存在）
- [ ] `package.json` 存在且版本正确
- [ ] dot 可执行文件存在且可运行
- [ ] 库文件已正确复制（Linux/macOS）
- [ ] 包大小合理（< 200MB）
- [ ] npm 已登录（`npm whoami`）
- [ ] 版本号未在 npm 上存在

---

## 🐛 故障排除

### "package.json not found"

```bash
# 创建 package.json
node scripts/create-runtime-package-json.js <platform> <arch> <version>
# 或
node scripts/create-graphviz-package-json.js <platform> <arch> <version>
```

### "Content directory not found"

```bash
# 构建包
node scripts/build-jre.js <platform> <arch>
# 或
node scripts/build-graphviz.js <platform> <arch>
```

### "Version already exists"

- 递增版本号
- 或使用 `--version` 指定新版本

### "Not logged in to npm"

```bash
npm login
```

### "Access denied"

确保你有 `@node-plantuml-2` 组织的访问权限：

```bash
npm org ls node-plantuml-2
```

---

## 🔧 高级用法

### 批量构建和发布

可以编写脚本批量处理所有平台：

```bash
#!/bin/bash
# build-and-publish-all.sh

PLATFORMS=("win32:x64" "darwin:arm64" "darwin:x64" "linux:x64")
VERSION="1.1.3"

for platform_arch in "${PLATFORMS[@]}"; do
  IFS=':' read -r platform arch <<< "$platform_arch"
  
  echo "Building JRE for $platform $arch..."
  node scripts/build-jre.js $platform $arch
  node scripts/create-runtime-package-json.js $platform $arch $VERSION
  node scripts/publish-runtime-package.js jre $platform $arch
  
  echo "Building Graphviz for $platform $arch..."
  node scripts/build-graphviz.js $platform $arch
  node scripts/create-graphviz-package-json.js $platform $arch $VERSION
  node scripts/publish-runtime-package.js graphviz $platform $arch
done
```

---

## 📚 相关文件

- `scripts/publish-runtime-package.js` - 统一发布脚本
- `scripts/build-jre.js` - JRE 构建脚本
- `scripts/build-graphviz.js` - Graphviz 构建脚本
- `scripts/create-runtime-package-json.js` - JRE package.json 创建脚本
- `scripts/create-graphviz-package-json.js` - Graphviz package.json 创建脚本
- `docs/NPM_PACKAGING_FLOW.md` - npm 打包流程文档

---

## 🎯 最佳实践

1. **始终先 dry-run**：发布前使用 `--dry-run` 测试
2. **版本一致性**：保持运行时包版本与主包版本一致
3. **测试验证**：发布前验证包内容正确
4. **文档更新**：发布后更新相关文档
5. **CI/CD 集成**：使用 GitHub Actions 自动化发布流程

