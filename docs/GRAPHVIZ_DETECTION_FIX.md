# Graphviz 自动检测修复说明

## 问题描述

在外部项目中安装 `node-plantuml-2` 后，即使 Graphviz 包作为 optional dependencies 已安装，也无法自动检测到 Graphviz，导致 PlantUML 图表渲染失败。

## 根本原因

`lib/dot-resolver.js` 中的 `resolveBundledGraphviz()` 函数在查找 Graphviz 包时，只检查了当前包的 `node_modules` 目录，但在外部项目中：

- `node-plantuml-2` 安装在：`external-project/node_modules/node-plantuml-2/`
- Graphviz 包安装在：`external-project/node_modules/@node-plantuml-2/graphviz-*/`
- 原代码只检查：`node-plantuml-2/node_modules/@node-plantuml-2/graphviz-*/`（错误）

## 修复方案

更新了 `resolveBundledGraphviz()` 函数，使用多层回退机制：

1. **Method 1**: 使用 `require.resolve()` - 这是最可靠的方法，在大多数情况下都能工作
2. **Method 2**: 通过 `require.resolve('node-plantuml-2')` 找到包的安装位置，然后查找同级的 `node_modules` 目录
3. **Method 3**: 检查当前包的 `node_modules`（用于开发环境）
4. **Method 4**: 递归向上搜索目录树

## 代码变更

### `lib/dot-resolver.js`

```javascript
function resolveBundledGraphviz () {
  // ... 获取包名 ...
  
  try {
    // Method 1: require.resolve (最可靠)
    var pkgJsonPath = require.resolve(pkgName + '/package.json')
    pkgPath = path.dirname(pkgJsonPath)
  } catch (e) {
    // Method 2: 通过 node-plantuml-2 的位置查找
    try {
      var nodePlantumlPath = require.resolve('node-plantuml-2')
      var nodeModulesDir = path.dirname(path.dirname(nodePlantumlPath))
      var possiblePath = path.join(nodeModulesDir, pkgName)
      if (fs.existsSync(path.join(possiblePath, 'package.json'))) {
        pkgPath = possiblePath
      } else {
        // Method 3 & 4: 其他回退机制
        // ...
      }
    } catch (resolveErr) {
      // 更多回退逻辑
    }
  }
  
  // 构建 dot 可执行文件路径
  // ...
}
```

## 测试方法

### 1. 本地测试（使用系统 Graphviz）

```bash
node test-local-render.js
```

### 2. 检测逻辑测试

```bash
node test-graphviz-detection.js
```

### 3. 外部项目模拟测试

```bash
node test-external-project.js
```

### 4. 实际外部项目测试

在一个新的目录中：

```bash
mkdir test-external
cd test-external
npm init -y
npm install node-plantuml-2

# 创建测试文件
cat > test.js << 'EOF'
var plantuml = require('node-plantuml-2');
var dotResolver = require('node-plantuml-2/lib/dot-resolver');

console.log('Graphviz detection:');
var dotPath = dotResolver.resolveDotExecutable({ dotPath: null });
console.log('Dot path:', dotPath || 'NOT FOUND');
console.log('Is bundled:', dotPath && dotPath.includes('@node-plantuml-2/graphviz-'));

// Test generation
var gen = plantuml.generate('@startuml\nAlice -> Bob: Hello\n@enduml', { format: 'png' });
var chunks = [];
gen.out.on('data', function(chunk) { chunks.push(chunk); });
gen.out.on('end', function() {
  var buffer = Buffer.concat(chunks);
  console.log('Generated:', buffer.length, 'bytes');
  console.log('Valid PNG:', buffer[0] === 0x89 && buffer[1] === 0x50);
});
EOF

node test.js
```

## 验证要点

1. ✅ `require.resolve()` 应该能在外部项目中找到 Graphviz 包
2. ✅ 如果 `require.resolve()` 失败，应该通过 `node-plantuml-2` 的位置找到
3. ✅ 路径解析应该正确处理 scoped packages (`@node-plantuml-2/...`)
4. ✅ 在开发环境中应该也能正常工作

## 注意事项

1. **Optional Dependencies**: Graphviz 包是 optional dependencies，如果安装失败不会阻止主包安装
2. **版本匹配**: 确保 Graphviz 包的版本与主包版本匹配（在 `package.json` 的 `optionalDependencies` 中）
3. **平台支持**: 只有支持的平台/架构组合才会安装对应的 Graphviz 包

## 相关文件

- `lib/dot-resolver.js` - Graphviz 路径解析逻辑
- `lib/node-plantuml.js` - PlantUML 生成时自动检测 dot 路径
- `lib/plantuml-executor.js` - 执行时设置环境变量
- `package.json` - optionalDependencies 配置

