# Graphviz 包验证指南

本文档说明如何确保不同环境下载到的 Graphviz 包是完整和正确的。

## 🔍 验证机制

### 1. 构建时验证

在构建 Graphviz 包后，使用验证脚本检查：

```bash
node scripts/verify-graphviz-package.js <platform> <arch>
```

**验证内容：**
- ✅ 包目录结构正确
- ✅ dot 可执行文件存在且可运行
- ✅ 库文件完整（Linux/macOS）
- ✅ 依赖关系正确（Linux ldd 检查）
- ✅ 包大小合理

### 2. 端到端测试（最重要！）

**实际生成 PlantUML 图表来验证 Graphviz 包是否真正可用：**

```bash
node scripts/test-graphviz-package-end-to-end.js <platform> <arch> [output-dir]
```

**测试内容：**
- ✅ 使用捆绑的 JRE 和 Graphviz
- ✅ 实际生成需要 Graphviz 的 PlantUML 图表：
  - Activity Diagram（活动图）
  - State Diagram（状态图）
  - Component Diagram（组件图）
  - Complex Activity Diagram（复杂活动图）
- ✅ 验证生成的图表文件存在且非空
- ✅ 输出 PNG 和 SVG 格式
- ✅ 生成的文件作为 artifact 保存（CI/CD）

**这是最关键的验证！** 只有能成功生成图表，才能确保 Graphviz 包真正可用。

### 3. 发布前验证

发布脚本会自动运行验证：

```bash
# 发布脚本会自动验证
node scripts/publish-runtime-package.js graphviz win32 x64
```

**验证步骤：**
1. 结构验证（`verify-graphviz-package.js`）
2. 端到端测试（`test-graphviz-package-end-to-end.js`）- **实际生成图表**
3. 只有所有测试通过才允许发布

### 4. CI/CD 验证

GitHub Actions 工作流在发布前自动验证：

```yaml
- name: Verify Graphviz package structure
  run: node scripts/verify-graphviz-package.js ${{ matrix.platform }} ${{ matrix.arch }}

- name: End-to-end test: Generate PlantUML diagrams with Graphviz
  run: node scripts/test-graphviz-package-end-to-end.js ${{ matrix.platform }} ${{ matrix.arch }}

- name: Upload generated diagrams as artifact
  uses: actions/upload-artifact@v4
  with:
    name: graphviz-test-output-${{ matrix.platform }}-${{ matrix.arch }}
    path: test-output-graphviz-e2e/*.png
```

**关键点：**
- ✅ 端到端测试失败会阻止发布
- ✅ 生成的图表作为 artifact 保存，可以下载检查
- ✅ 确保发布的包真正可用

---

## 📦 包完整性检查

### Windows

**必需文件：**
- `graphviz/bin/dot.exe` - 主可执行文件
- `graphviz/bin/*.dll` - 依赖的 DLL 文件
- `graphviz/lib/` - 可选（库文件）

**验证命令：**
```bash
# 检查 dot.exe 存在
ls runtimes/@node-plantuml-2/graphviz-win32-x64/graphviz/bin/dot.exe

# 测试运行
runtimes/@node-plantuml-2/graphviz-win32-x64/graphviz/bin/dot.exe -V
```

### Linux

**必需文件：**
- `graphviz/bin/dot` - 主可执行文件（可执行权限）
- `graphviz/lib/*.so*` - 所有依赖库文件
- `graphviz/share/` - 配置文件（可选）

**验证命令：**
```bash
# 检查 dot 存在
ls runtimes/@node-plantuml-2/graphviz-linux-x64/graphviz/bin/dot

# 检查库文件
ls runtimes/@node-plantuml-2/graphviz-linux-x64/graphviz/lib/*.so*

# 检查依赖（ldd）
ldd runtimes/@node-plantuml-2/graphviz-linux-x64/graphviz/bin/dot

# 测试运行
runtimes/@node-plantuml-2/graphviz-linux-x64/graphviz/bin/dot -V
```

**关键：** Linux 必须包含所有 `.so` 库文件，否则运行时会出现 "library not found" 错误。

### macOS

**必需文件：**
- `graphviz/bin/dot` - 主可执行文件（可执行权限）
- `graphviz/lib/*.dylib` - 依赖库文件
- `graphviz/share/` - 配置文件（可选）

**验证命令：**
```bash
# 检查 dot 存在
ls runtimes/@node-plantuml-2/graphviz-darwin-arm64/graphviz/bin/dot

# 检查库文件
ls runtimes/@node-plantuml-2/graphviz-darwin-arm64/graphviz/lib/*.dylib

# 测试运行
runtimes/@node-plantuml-2/graphviz-darwin-arm64/graphviz/bin/dot -V
```

---

## 🔗 运行时引用机制

### 自动解析流程

1. **用户安装包**
   ```bash
   npm install node-plantuml-2
   ```
   - npm 自动安装匹配平台的 Graphviz 包（通过 `optionalDependencies`）
   - 例如：Windows x64 → `@node-plantuml-2/graphviz-win32-x64`

2. **运行时解析**
   ```javascript
   // lib/dot-resolver.js
   resolveBundledGraphviz()
     ↓
   // 1. 根据平台确定包名
   getGraphvizPackageName(platform, arch)
     → '@node-plantuml-2/graphviz-win32-x64'
     ↓
   // 2. 解析包路径（多种方式）
   require.resolve('@node-plantuml-2/graphviz-win32-x64/package.json')
     ↓
   // 3. 构造 dot 路径
   {pkgPath}/graphviz/bin/dot.exe
   ```

3. **环境变量设置**
   ```javascript
   // lib/plantuml-executor.js
   // Windows: 添加到 PATH
   env.PATH = binDir + ';' + env.PATH
   
   // Linux: 设置 LD_LIBRARY_PATH
   env.LD_LIBRARY_PATH = libDir + ':' + env.LD_LIBRARY_PATH
   
   // macOS: 设置 DYLD_LIBRARY_PATH
   env.DYLD_LIBRARY_PATH = libDir + ':' + env.DYLD_LIBRARY_PATH
   ```

### 包路径解析策略

`lib/dot-resolver.js` 使用多种方式确保能找到包：

1. **require.resolve()** - 标准方式
2. **通过 node-plantuml-2 定位** - 查找父级 node_modules
3. **递归向上查找** - 支持嵌套依赖场景
4. **本地开发环境** - 支持 npm link

### 验证引用是否正确

```javascript
const dotResolver = require('node-plantuml-2/lib/dot-resolver')

// 检查捆绑的 Graphviz
const bundledGraphviz = dotResolver.resolveBundledGraphviz()
console.log('Bundled Graphviz:', bundledGraphviz)

// 检查完整解析
try {
  const dotPath = dotResolver.resolveDotExecutable()
  console.log('Resolved Graphviz:', dotPath)
  
  // 验证路径正确
  const fs = require('fs')
  if (fs.existsSync(dotPath)) {
    console.log('✅ Graphviz path is valid')
  } else {
    console.log('❌ Graphviz path does not exist')
  }
} catch (err) {
  console.error('❌ Graphviz not found:', err.message)
}
```

---

## ✅ 完整性保证措施

### 1. 构建时检查

`scripts/build-graphviz.js` 在构建时：
- ✅ 复制所有必需文件
- ✅ Linux 使用 `ldd` 递归查找所有依赖
- ✅ 设置正确的可执行权限
- ✅ 检查包大小（警告超过 200MB）

### 2. 验证脚本

`scripts/verify-graphviz-package.js` 检查：
- ✅ 目录结构
- ✅ 可执行文件存在且可运行
- ✅ 库文件完整（Linux/macOS）
- ✅ 依赖关系（ldd）
- ✅ 实际渲染功能
- ✅ 包大小合理

### 3. 发布前验证

`scripts/publish-runtime-package.js` 在发布前：
- ✅ 自动运行验证脚本
- ✅ 检查版本冲突
- ✅ 验证 npm 认证

### 4. CI/CD 验证

GitHub Actions 工作流：
- ✅ 构建后自动验证
- ✅ 发布前再次验证
- ✅ 失败时阻止发布

---

## 🐛 常见问题

### 问题 1: Linux 上 "library not found"

**原因：** 缺少依赖库文件

**解决：**
```bash
# 检查库文件
ls runtimes/@node-plantuml-2/graphviz-linux-x64/graphviz/lib/

# 重新构建（确保使用 ldd 复制所有依赖）
node scripts/build-graphviz.js linux x64
node scripts/verify-graphviz-package.js linux x64
```

### 问题 2: macOS 上 "dyld: Library not loaded"

**原因：** 缺少 `.dylib` 文件或路径不正确

**解决：**
```bash
# 检查库文件
ls runtimes/@node-plantuml-2/graphviz-darwin-arm64/graphviz/lib/*.dylib

# 验证 DYLD_LIBRARY_PATH 设置
# 应该由 plantuml-executor.js 自动设置
```

### 问题 3: Windows 上 "The system cannot find the file specified"

**原因：** DLL 文件缺失或 PATH 未设置

**解决：**
```bash
# 检查 DLL 文件
ls runtimes/@node-plantuml-2/graphviz-win32-x64/graphviz/bin/*.dll

# 验证 PATH 设置
# 应该由 plantuml-executor.js 自动设置
```

### 问题 4: 包找不到（require.resolve 失败）

**原因：** 包未安装或路径解析失败

**解决：**
```bash
# 检查包是否安装
ls node_modules/@node-plantuml-2/

# 手动安装
npm install @node-plantuml-2/graphviz-<platform>-<arch>

# 检查解析
node -e "console.log(require.resolve('@node-plantuml-2/graphviz-win32-x64/package.json'))"
```

---

## 📊 验证报告示例

### 结构验证报告

运行 `verify-graphviz-package.js` 的输出：

```
============================================================
Verifying Graphviz Package
============================================================
Platform: win32
Architecture: x64
Package directory: runtimes/@node-plantuml-2/graphviz-win32-x64

✓ Checking package directory...
✓ Package directory exists
✓ Checking graphviz directory...
✓ Graphviz directory exists
✓ Checking dot executable...
✓ Dot executable found
  Size: 245.67 KB
✓ Testing dot executable...
✓ Dot executable works!
  Version: dot - graphviz version 2.50.0
✓ Checking bin directory...
  Found 89 files in bin directory
  Graphviz-related files: 45
✓ Checking package size...
  Package size: 45.23 MB
✓ Package size is reasonable

============================================================
Verification Summary
============================================================
✅ All checks passed! Package is complete and correct.
```

### 端到端测试报告

运行 `test-graphviz-package-end-to-end.js` 的输出：

```
============================================================
Graphviz Package End-to-End Test
============================================================
Platform: win32
Architecture: x64

Test 1: Checking Graphviz package...
✓ Graphviz package found: .../graphviz/bin/dot.exe
Test 2: Checking JRE...
✓ Bundled JRE found: .../jre/bin/java.exe
Test 3: Checking PlantUML JAR...
✓ PlantUML JAR found: vendor/plantuml.jar
Test 4: Testing dot executable...
✓ Dot executable works: dot - graphviz version 2.50.0
Test 5: Setting up environment variables...
✓ Added Graphviz bin to PATH

Test 6: Generating PlantUML diagrams with Graphviz...

Generating: Activity Diagram ...
  ✓ Success! Output: test-1-activity-diagram.png (12.45 KB)
Generating: State Diagram ...
  ✓ Success! Output: test-2-state-diagram.png (8.23 KB)
Generating: Component Diagram ...
  ✓ Success! Output: test-3-component-diagram.svg (3.56 KB)
Generating: Complex Activity Diagram ...
  ✓ Success! Output: test-4-complex-activity-diagram.png (15.67 KB)

============================================================
Test Summary
============================================================
Total tests: 4
Successful: 4
Failed: 0

✅ All tests passed! Graphviz package works correctly.

Generated files:
  ✓ Activity Diagram: test-1-activity-diagram.png (12.45 KB)
  ✓ State Diagram: test-2-state-diagram.png (8.23 KB)
  ✓ Component Diagram: test-3-component-diagram.svg (3.56 KB)
  ✓ Complex Activity Diagram: test-4-complex-activity-diagram.png (15.67 KB)

Output directory: test-output-graphviz-e2e
```

---

## 🎯 最佳实践

1. **构建后立即验证**
   ```bash
   node scripts/build-graphviz.js win32 x64
   node scripts/verify-graphviz-package.js win32 x64
   ```

2. **发布前再次验证**
   ```bash
   node scripts/publish-runtime-package.js graphviz win32 x64 --dry-run
   ```

3. **CI/CD 自动验证**
   - GitHub Actions 已配置自动验证
   - 验证失败会阻止发布

4. **定期测试安装**
   ```bash
   # 在干净环境中测试
   npm install @node-plantuml-2/graphviz-win32-x64
   # 验证是否能正确解析和使用
   ```

---

## 📚 相关文件

- `scripts/verify-graphviz-package.js` - 结构验证脚本
- `scripts/test-graphviz-package-end-to-end.js` - **端到端测试脚本（实际生成图表验证）**
- `scripts/build-graphviz.js` - 构建脚本（包含完整性检查）
- `scripts/publish-runtime-package.js` - 发布脚本（自动验证）
- `lib/dot-resolver.js` - 运行时解析器
- `lib/plantuml-executor.js` - 执行器（环境变量设置）
- `.github/workflows/publish.yml` - CI/CD 工作流（包含端到端测试和 artifact 上传）

