# Mac Graphviz 路径自动检测修复说明

## 问题描述

在 Mac 系统上，PlantUML 无法找到 Graphviz dot 可执行文件，出现错误：
```
Dot Executable:/opt/local/bin/dot
Dot executable does not exist
Cannot find Graphviz
```

这是因为 PlantUML 默认查找 MacPorts 的路径 (`/opt/local/bin/dot`)，但大多数 Mac 用户使用 Homebrew 安装 Graphviz，路径为：
- Apple Silicon (M1/M2): `/opt/homebrew/bin/dot`
- Intel Mac: `/usr/local/bin/dot`

## 解决方案

实现了 Graphviz dot 路径的自动检测和传递机制，支持多种安装方式。

## 修改内容

### 1. 创建 `lib/dot-resolver.js`

实现了 Graphviz dot 路径的自动检测，优先级顺序：

1. **用户指定路径** (`options.dotPath`) - 最高优先级
2. **常见安装路径**（平台特定）：
   - macOS Apple Silicon: `/opt/homebrew/bin/dot` (Homebrew)
   - macOS Intel: `/usr/local/bin/dot` (Homebrew)
   - macOS: `/opt/local/bin/dot` (MacPorts)
   - Windows: `C:\Program Files\Graphviz\bin\dot.exe`
   - Linux: `/usr/bin/dot`, `/usr/local/bin/dot`
3. **系统 PATH** - 使用 `which dot` 或 `where dot` 查找

### 2. 修改 `lib/node-plantuml.js`

#### 2.1 引入 dot-resolver
```javascript
var dotResolver = require('./dot-resolver')
```

#### 2.2 在 `joinOptions` 函数中自动检测
```javascript
// Auto-detect dot path if not specified
if (!options.dot) {
  var detectedDot = dotResolver.resolveDotExecutable({ dotPath: null })
  if (detectedDot) {
    options.dot = detectedDot
  }
}
```

这样，当用户调用 `plantuml.generate()` 时，如果没有指定 `options.dot`，会自动检测并设置。

#### 2.3 修复 `testdot` 函数

**问题**：之前向 `exec` 传递了 callback，导致输出处理冲突。

**修复**：
- 不再传递 callback 给 `exec`
- 自己处理 stdout 和 stderr
- 添加进程结束监听作为后备机制
- 同时检查 stdout 和 stderr 中的成功消息

### 3. 创建 GitHub Actions 测试

#### 3.1 `.github/workflows/test-mac-graphviz.yml`
专门的 Mac Graphviz 测试工作流，包括：
- 通过 Homebrew 安装 Graphviz
- 测试 dot 路径检测
- 测试 PlantUML testdot 命令
- 测试图表生成

#### 3.2 更新 `.github/workflows/ci.yml`
在 CI 中添加了 Mac runner 测试。

## 使用方法

### 自动安装和检测（推荐）

库会在 `npm install` 后自动尝试安装 Graphviz（如果未安装）：

```bash
npm install node-plantuml-2
# 安装过程中会自动检测并尝试安装 Graphviz
```

如果自动安装失败，可以手动运行：

```bash
npm run install:graphviz
```

或者手动安装：
- macOS: `brew install graphviz`
- Linux: `sudo apt-get install graphviz` (或使用你的包管理器)
- Windows: `choco install graphviz -y` 或从 [graphviz.org](https://graphviz.org/download/) 下载

### 自动检测路径（无需配置）

安装 Graphviz 后，无需任何配置，库会自动检测路径：

```javascript
var plantuml = require('node-plantuml-2')

// 自动检测 dot 路径
plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
```

### 手动指定路径

如果需要手动指定 dot 路径：

```javascript
plantuml.generate('@startuml\nA -> B\n@enduml', {
  format: 'png',
  dot: '/opt/homebrew/bin/dot'  // 或任何其他路径
})
```

### 测试 Graphviz 安装

```javascript
plantuml.testdot(function(isOk) {
  if (isOk) {
    console.log('Graphviz is working!')
  } else {
    console.log('Graphviz not found or not working')
  }
})
```

### 禁用自动安装

如果不想自动安装 Graphviz，可以设置环境变量：

```bash
NODE_PLANTUML_AUTO_INSTALL_GRAPHVIZ=false npm install
```

## 支持的安装方式

### 自动安装（推荐）

库会在 `npm install` 时自动尝试安装 Graphviz：

```bash
npm install node-plantuml-2
# 自动检测并安装 Graphviz（如果需要）
```

### 手动安装

#### macOS - Homebrew (推荐)

```bash
# 安装
brew install graphviz

# 验证
dot -V
```

安装后路径：
- Apple Silicon: `/opt/homebrew/bin/dot`
- Intel: `/usr/local/bin/dot`

#### macOS - MacPorts

```bash
# 安装
sudo port install graphviz

# 验证
/opt/local/bin/dot -V
```

#### Linux

```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y graphviz

# RedHat/CentOS
sudo yum install -y graphviz

# Fedora
sudo dnf install -y graphviz

# Arch Linux
sudo pacman -S graphviz
```

#### Windows

```bash
# 使用 Chocolatey
choco install graphviz -y

# 使用 Winget (Windows 10/11)
winget install Graphviz.Graphviz

# 或从官网下载安装包
# https://graphviz.org/download/
```

## 验证修复

### 1. 检查 dot 路径检测

```javascript
var dotResolver = require('./lib/dot-resolver')
var detected = dotResolver.resolveDotExecutable({ dotPath: null })
console.log('Detected dot path:', detected)
```

### 2. 测试 PlantUML testdot

```javascript
var plantuml = require('./lib/node-plantuml')
plantuml.testdot(function(isOk) {
  console.log('testdot result:', isOk ? 'OK' : 'FAILED')
})
```

### 3. 生成测试图表

```javascript
var plantuml = require('./lib/node-plantuml')
var gen = plantuml.generate('@startuml\nA -> B\n@enduml', { format: 'png' })
// 应该能正常生成，不会出现 Graphviz 错误
```

## 技术细节

### 路径检测逻辑

1. **检查文件存在性**：使用 `fs.existsSync()`
2. **检查可执行权限**：在 Unix 系统上检查文件模式
3. **平台特定路径**：根据 `os.platform()` 返回不同路径列表
4. **PATH 搜索**：使用 `which` (Unix) 或 `where` (Windows)

### PlantUML 参数传递

检测到 dot 路径后，会通过 `-graphvizdot` 参数传递给 PlantUML：

```bash
java -jar plantuml.jar -graphvizdot /opt/homebrew/bin/dot ...
```

### 错误处理

- 如果找不到 dot，不会报错，只是不传递 `-graphvizdot` 参数
- 如果 dot 路径无效，PlantUML 会输出错误，但不会导致程序崩溃
- `testdot` 函数会返回 `false` 如果 Graphviz 不可用

## 测试状态

✅ 在 GitHub Actions Mac runner 上测试通过
✅ 支持 Apple Silicon (M1/M2) 和 Intel Mac
✅ 支持 Homebrew 和 MacPorts 安装方式
✅ 自动检测和手动指定路径都工作正常

## 相关文件

- `lib/dot-resolver.js` - Graphviz 路径检测实现
- `lib/node-plantuml.js` - PlantUML 接口，集成 dot 检测
- `.github/workflows/test-mac-graphviz.yml` - Mac 测试工作流
- `.github/workflows/ci.yml` - CI 测试，包含 Mac runner

## 注意事项

1. **权限问题**：确保 dot 文件有执行权限
2. **PATH 环境变量**：如果通过 PATH 查找，确保 PATH 包含 Graphviz 目录
3. **版本兼容性**：不同版本的 Graphviz 可能有不同的行为
4. **性能**：路径检测是同步的，但很快（只是文件系统检查）

## 自动安装功能

### 工作原理

1. **检测阶段**：在 `npm install` 后运行 `postinstall` 脚本
2. **检查 Graphviz**：使用 `testdot` 检查是否已安装
3. **自动安装**：如果未安装，尝试自动安装（可通过环境变量禁用）
4. **验证**：安装后验证是否成功

### 支持的平台和包管理器

- **macOS**: Homebrew (`brew install graphviz`)
- **Linux**: 
  - apt-get (Debian/Ubuntu)
  - yum (RedHat/CentOS)
  - dnf (Fedora)
  - pacman (Arch Linux)
  - zypper (openSUSE)
- **Windows**: 
  - Chocolatey (`choco install graphviz`)
  - Winget (`winget install Graphviz.Graphviz`)

### 环境变量

- `NODE_PLANTUML_AUTO_INSTALL_GRAPHVIZ=false` - 禁用自动安装

### 手动运行安装

```bash
npm run install:graphviz
```

## 未来改进

- [x] 支持通过环境变量指定 dot 路径
- [x] 跨平台自动安装 Graphviz
- [ ] 缓存检测结果，避免重复检测
- [ ] 支持更多安装方式（如 conda, snap）
- [ ] 提供更详细的错误信息和建议

