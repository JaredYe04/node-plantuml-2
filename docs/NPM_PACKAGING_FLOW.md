# NPM 打包流程与环境自适应机制

本文档详细说明 `node-plantuml-2` 的 npm 打包流程，特别是 Java 和 Graphviz 环境如何根据运行环境自动适配。

## 📦 整体架构

### 1. 主包结构

主包 `node-plantuml-2` 通过 `optionalDependencies` 机制自动安装平台特定的运行时包：

```json
{
  "optionalDependencies": {
    "@node-plantuml-2/jre-win32-x64": "^1.1.3",
    "@node-plantuml-2/jre-darwin-arm64": "^1.1.3",
    "@node-plantuml-2/jre-linux-x64": "^1.1.3",
    "@node-plantuml-2/graphviz-win32-x64": "^1.1.3",
    "@node-plantuml-2/graphviz-darwin-arm64": "^1.1.3",
    "@node-plantuml-2/graphviz-darwin-x64": "^1.1.3",
    "@node-plantuml-2/graphviz-linux-x64": "^1.1.3"
  }
}
```

**关键特性：**
- `optionalDependencies` 确保只安装匹配当前平台的包
- 安装失败不会阻止主包安装
- 每个平台包独立版本管理

---

## 🔧 Java 环境自适应机制

### 运行时解析策略（优先级顺序）

Java 解析器 (`lib/java-resolver.js`) 按以下优先级查找 Java：

```
1. 用户指定路径 (options.javaPath) ⭐ 最高优先级
   ↓
2. 捆绑的 JRE (Bundled JRE) ⭐ 主要方式
   ↓
3. JAVA_HOME 环境变量
   ↓
4. 系统 PATH 中的 java 命令
```

### 详细解析流程

#### 1. 用户指定路径

```javascript
// 用户可以通过选项指定 Java 路径
plantuml.generate(code, { 
  javaPath: '/custom/path/to/java' 
})
```

**实现位置：** `lib/java-resolver.js:21-39`

#### 2. 捆绑的 JRE（主要方式）

**包名映射：**
- Windows x64 → `@node-plantuml-2/jre-win32-x64`
- macOS ARM64 → `@node-plantuml-2/jre-darwin-arm64`
- macOS x64 → `@node-plantuml-2/jre-darwin-x64`
- Linux x64 → `@node-plantuml-2/jre-linux-x64`

**查找逻辑：**
1. 根据 `os.platform()` 和 `os.arch()` 确定包名
2. 使用 `require.resolve()` 尝试解析包路径
3. 如果失败，在 `node_modules` 中递归查找
4. 构造 Java 可执行文件路径：`{pkgPath}/jre/bin/java` (或 `java.exe` on Windows)
5. 设置可执行权限（Unix 平台）

**实现位置：** `lib/java-resolver.js:75-126`

**关键代码：**
```javascript
function resolveBundledJava() {
  var platform = os.platform()
  var arch = os.arch()
  var pkgName = getRuntimePackageName(platform, arch)
  
  // 尝试多种方式解析包路径
  var pkgPath = require.resolve(pkgName + '/package.json')
  // 或递归查找 node_modules
  
  var javaExe = platform === 'win32' ? 'java.exe' : 'java'
  var javaPath = path.join(pkgPath, 'jre', 'bin', javaExe)
  
  return javaPath
}
```

#### 3. JAVA_HOME 环境变量

```javascript
var javaHome = process.env.JAVA_HOME
var javaPath = path.join(javaHome, 'bin', 'java')
```

**实现位置：** `lib/java-resolver.js:47-54`

#### 4. 系统 PATH

使用 `which` (Unix) 或 `where` (Windows) 查找：

```javascript
var command = process.platform === 'win32' ? 'where' : 'which'
var result = childProcess.execSync(command + ' java')
```

**实现位置：** `lib/java-resolver.js:167-187`

### 执行器集成

**文件：** `lib/plantuml-executor.js`

执行器使用解析器获取 Java 路径：

```javascript
function findJavaExecutable(options) {
  var javaPath = javaResolver.resolveJavaExecutable(options)
  // 如果解析失败，回退到 'java'（向后兼容）
  return javaPath || 'java'
}
```

**调用链：**
```
plantuml.generate()
  ↓
plantumlExecutor.exec()
  ↓
findJavaExecutable(options)
  ↓
javaResolver.resolveJavaExecutable(options)
  ↓
返回 Java 可执行文件路径
```

---

## 📊 Graphviz 环境自适应机制

### 运行时解析策略（优先级顺序）

**重要：我们只使用捆绑的 Graphviz 包，不依赖系统安装！**

Graphviz 解析器 (`lib/dot-resolver.js`) 按以下优先级查找 Graphviz：

```
1. 用户指定路径 (options.dotPath) ⭐ 最高优先级
   ↓
2. 捆绑的 Graphviz (Bundled Graphviz) ⭐ 唯一运行时方式
   ↓
   ❌ 不再查找系统安装的 Graphviz
```

**设计原则：**
- ✅ **只使用捆绑的 Graphviz 包** - 确保所有用户使用相同版本，避免环境差异
- ✅ **如果找不到捆绑包，抛出清晰的错误** - 提示用户安装对应的运行时包
- ❌ **不再回退到系统查找** - 避免不一致的行为和版本冲突

### 详细解析流程

#### 1. 用户指定路径

```javascript
plantuml.generate(code, { 
  dotPath: '/custom/path/to/dot' 
})
```

**实现位置：** `lib/dot-resolver.js:182-191`

#### 2. 捆绑的 Graphviz（主要方式）

**包名映射：**
- Windows x64 → `@node-plantuml-2/graphviz-win32-x64`
- macOS ARM64 → `@node-plantuml-2/graphviz-darwin-arm64`
- macOS x64 → `@node-plantuml-2/graphviz-darwin-x64`
- Linux x64 → `@node-plantuml-2/graphviz-linux-x64`

**查找逻辑：**
1. 根据平台和架构确定包名
2. 使用多种方式解析包路径：
   - `require.resolve()` (首选)
   - 通过 `node-plantuml-2` 包定位父级 `node_modules`
   - 递归向上查找目录树
3. 构造 dot 可执行文件路径：`{pkgPath}/graphviz/bin/dot` (或 `dot.exe` on Windows)
4. 设置可执行权限（Unix 平台）

**实现位置：** `lib/dot-resolver.js:13-105`

**关键代码：**
```javascript
function resolveBundledGraphviz() {
  var platform = os.platform()
  var arch = os.arch()
  var pkgName = getGraphvizPackageName(platform, arch)
  
  // 多种方式解析包路径
  var pkgPath = require.resolve(pkgName + '/package.json')
  // 或通过 node-plantuml-2 定位
  // 或递归查找
  
  var dotExe = platform === 'win32' ? 'dot.exe' : 'dot'
  var dotPath = path.join(pkgPath, 'graphviz', 'bin', dotExe)
  
  return dotPath
}
```

#### 3. 错误处理（如果找不到捆绑的 Graphviz）

如果找不到捆绑的 Graphviz 包，函数会抛出清晰的错误：

```javascript
throw new Error(
  'Bundled Graphviz not found. Please install the Graphviz runtime package:\n' +
  '  npm install @node-plantuml-2/graphviz-{platform}-{arch}\n\n' +
  'This package should be automatically installed via optionalDependencies.\n' +
  'If it failed to install, please check:\n' +
  '  1. Your platform is supported\n' +
  '  2. Network connection during npm install\n' +
  '  3. npm install logs for errors\n\n' +
  'Alternatively, you can specify a custom Graphviz path:\n' +
  '  plantuml.generate(code, { dotPath: "/path/to/dot" })'
)
```

**注意：** 
- 系统安装的 Graphviz **不再被使用**（除非通过 `options.dotPath` 显式指定）
- 这确保了所有用户使用相同版本的 Graphviz，避免环境差异导致的渲染不一致
- 如果图表类型不需要 Graphviz，PlantUML 会优雅地处理缺失情况

**实现位置：** `lib/dot-resolver.js:186-250`

### 环境变量设置（关键！）

为了确保捆绑的 Graphviz 能正常工作，执行器会设置必要的环境变量：

#### Linux - LD_LIBRARY_PATH

```javascript
if (platform === 'linux' && libPath) {
  env.LD_LIBRARY_PATH = libPath + ':' + (env.LD_LIBRARY_PATH || '')
}
```

#### macOS - DYLD_LIBRARY_PATH

```javascript
if (platform === 'darwin' && libPath) {
  env.DYLD_LIBRARY_PATH = libPath + ':' + (env.DYLD_LIBRARY_PATH || '')
}
```

#### Windows - PATH

```javascript
if (platform === 'win32' && dotPath) {
  var binDir = path.dirname(dotPath)
  env.PATH = binDir + ';' + (env.PATH || '')
}
```

**实现位置：** `lib/plantuml-executor.js:88-215`

**关键点：**
- 必须使用绝对路径
- Windows 需要将 Graphviz bin 目录添加到 PATH（用于查找 DLL）
- Linux/macOS 需要设置库路径（用于查找 .so/.dylib 文件）
- **只对捆绑的 Graphviz 设置环境变量** - 系统 Graphviz 不再使用

---

## 🏗️ 构建流程

### 1. JRE 运行时包构建

**脚本：** `scripts/build-jre.js`

**步骤：**
1. 检查 `jlink` 工具（JDK 17+）
2. 使用 `jlink` 构建最小 JRE：
   ```bash
   jlink --add-modules java.base,java.desktop,java.xml,java.logging \
         --strip-debug \
         --no-man-pages \
         --no-header-files \
         --compress=2 \
         --output jre
   ```
3. 设置可执行权限（Unix）
4. 验证 JRE 可用性

**输出结构：**
```
runtimes/@node-plantuml-2/jre-{platform}-{arch}/
├── package.json
└── jre/
    └── bin/
        └── java (或 java.exe)
```

**创建 package.json：**
```bash
node scripts/create-runtime-package-json.js <platform> <arch> <version>
```

**发布：**
```bash
cd runtimes/@node-plantuml-2/jre-{platform}-{arch}
npm publish --access public
```

### 2. Graphviz 运行时包构建

**脚本：** `scripts/build-graphviz.js`

**步骤：**
1. 查找系统安装的 Graphviz
2. 复制 Graphviz 文件：
   - `bin/` - 可执行文件（dot 等）
   - `lib/` - 库文件（.so/.dylib/.dll）
   - `share/` - 配置文件
   - `etc/` - 其他配置（Windows）
3. **Linux 特殊处理：** 使用 `ldd` 递归查找并复制所有依赖库
4. 设置可执行权限（Unix）
5. 验证包大小（警告超过 200MB）

**输出结构：**
```
runtimes/@node-plantuml-2/graphviz-{platform}-{arch}/
├── package.json
└── graphviz/
    ├── bin/
    │   └── dot (或 dot.exe)
    ├── lib/
    │   └── *.so (或 *.dylib 或 *.dll)
    └── share/
```

**创建 package.json：**
```bash
node scripts/create-graphviz-package-json.js <platform> <arch> <version>
```

**发布：**
```bash
cd runtimes/@node-plantuml-2/graphviz-{platform}-{arch}
npm publish --access public
```

### 3. 主包构建

**脚本：** `scripts/build-all.js`

**步骤：**
1. 下载最新 PlantUML JAR
2. 构建 Nailgun JAR（可选，用于性能优化）

**发布主包：**
```bash
npm publish
```

---

## 📥 安装流程（用户视角）

### npm install 时发生什么

1. **npm 解析依赖**
   - 读取 `package.json` 的 `optionalDependencies`
   - 根据当前平台（`process.platform`, `process.arch`）匹配包

2. **自动安装匹配的运行时包**
   - 只安装匹配当前平台的 JRE 和 Graphviz 包
   - 其他平台的包被跳过（`optionalDependencies` 特性）

3. **安装后脚本（postinstall）**
   - 执行 `scripts/get-vizjs.js`（下载 viz.js，用于某些功能）

### 运行时发生什么

1. **首次调用 `plantuml.generate()`**
   - Java 解析器按优先级查找 Java（支持系统回退）
   - **Graphviz 解析器只查找捆绑的包**（不再查找系统安装）
   - 如果找到捆绑的运行时，使用它们
   - **如果找不到捆绑的 Graphviz，抛出清晰的错误**（不再回退到系统）

2. **环境变量设置**
   - 如果使用捆绑的 Graphviz，自动设置：
     - Linux: `LD_LIBRARY_PATH`
     - macOS: `DYLD_LIBRARY_PATH`
     - Windows: `PATH`
   - **只对捆绑的 Graphviz 设置环境变量**

3. **执行 PlantUML**
   - 使用找到的 Java 执行 `plantuml.jar`
   - 如果图表需要 Graphviz，传递 dot 路径给 PlantUML
   - 如果 Graphviz 缺失且图表类型不需要它，PlantUML 会优雅处理

---

## 🔍 调试与验证

### 检查 Java 解析

```javascript
const javaResolver = require('node-plantuml-2/lib/java-resolver')

// 检查捆绑的 JRE
const bundledJava = javaResolver.resolveBundledJava()
console.log('Bundled Java:', bundledJava)

// 检查完整解析
const javaPath = javaResolver.resolveJavaExecutable()
console.log('Resolved Java:', javaPath)
```

### 检查 Graphviz 解析

```javascript
const dotResolver = require('node-plantuml-2/lib/dot-resolver')

// 检查捆绑的 Graphviz
const bundledGraphviz = dotResolver.resolveBundledGraphviz()
console.log('Bundled Graphviz:', bundledGraphviz)

// 检查完整解析（只查找捆绑的 Graphviz）
try {
  const dotPath = dotResolver.resolveDotExecutable()
  console.log('Resolved Graphviz:', dotPath)
} catch (err) {
  console.error('Graphviz not found:', err.message)
}
```

### 验证运行时包安装

```bash
# 检查已安装的运行时包
ls node_modules/@node-plantuml-2/

# 应该只看到当前平台的包，例如：
# jre-win32-x64/
# graphviz-win32-x64/
```

---

## 🎯 关键设计决策

### 1. 为什么使用 optionalDependencies？

- **优点：**
  - 只安装匹配平台的包（节省空间和时间）
  - 安装失败不会阻止主包安装
  - 支持跨平台开发（不同开发者自动获取对应平台包）

- **缺点：**
  - 需要手动构建和发布多个运行时包
  - 版本管理更复杂

### 2. 为什么只使用捆绑的 Graphviz，不查找系统？

- **一致性：** 确保所有用户使用相同版本的 Graphviz，避免环境差异
- **可预测性：** 不依赖用户系统配置，行为完全可预测
- **简化部署：** 不需要用户手动安装 Graphviz，一切通过 npm 自动管理
- **避免冲突：** 不会因为系统 Graphviz 版本不同导致渲染差异

### 3. 为什么需要环境变量设置？

- **Linux/macOS：** 动态链接器需要知道在哪里查找 `.so`/`.dylib` 文件
- **Windows：** 需要将 DLL 目录添加到 PATH，以便找到依赖的 DLL
- **只对捆绑的 Graphviz 设置** - 系统 Graphviz 不再使用

### 4. 为什么使用多种方式解析包路径？

- `require.resolve()` 在大多数情况下工作，但在某些嵌套依赖场景可能失败
- 递归查找确保在各种安装场景下都能找到运行时包
- 支持开发环境（本地链接）和生产环境（npm 安装）

---

## 📚 相关文件

### 核心实现
- `lib/java-resolver.js` - Java 环境解析
- `lib/dot-resolver.js` - Graphviz 环境解析
- `lib/plantuml-executor.js` - 执行器（集成解析器）

### 构建和发布脚本
- `scripts/publish-runtime-package.js` - **统一发布脚本（推荐）** - 支持 JRE 和 Graphviz
- `scripts/build-jre.js` - 构建 JRE 运行时包
- `scripts/build-graphviz.js` - 构建 Graphviz 运行时包
- `scripts/create-runtime-package-json.js` - 创建 JRE 包配置
- `scripts/create-graphviz-package-json.js` - 创建 Graphviz 包配置
- `scripts/build-all.js` - 完整构建流程
- `scripts/publish-runtime.js` - ⚠️ 已废弃（仅支持 JRE，请使用统一脚本）

### 文档
- `docs/RUNTIME_PACKAGES_BUILD_AND_PUBLISH.md` - **运行时包构建和发布完整指南**
- `docs/GRAPHVIZ_PACKAGE_VERIFICATION.md` - Graphviz 包验证指南
- `docs/END_TO_END_TESTING.md` - 端到端测试指南
- `docs/GRAPHVIZ_QUALITY_ASSURANCE.md` - Graphviz 质量保证
- `README.md` - 用户文档

---

## 🚀 快速参考

### 构建和发布运行时包

**推荐使用统一脚本：**

```bash
# 构建 JRE
node scripts/build-jre.js win32 x64
node scripts/create-runtime-package-json.js win32 x64 1.1.3
node scripts/publish-runtime-package.js jre win32 x64

# 构建 Graphviz
node scripts/build-graphviz.js win32 x64
node scripts/create-graphviz-package-json.js win32 x64 1.1.3
node scripts/publish-runtime-package.js graphviz win32 x64
```

**详细文档：** 参见 `docs/RUNTIME_PACKAGES_BUILD_AND_PUBLISH.md`

### 测试环境自适应

```javascript
const plantuml = require('node-plantuml-2')

// 自动使用捆绑的运行时（如果可用）
const gen = plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })

// 或指定自定义路径
const gen2 = plantuml.generate('@startuml\nA -> B\n@enduml', {
  format: 'png',
  javaPath: '/custom/java',
  dotPath: '/custom/dot'
})
```

---

**总结：** 这个库通过 `optionalDependencies` + 智能解析器实现了完全自动化的环境适配，用户只需 `npm install`，无需手动配置 Java 或 Graphviz！

