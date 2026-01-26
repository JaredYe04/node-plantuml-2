# Graphviz 包质量保证

## 🎯 确保包完整性和正确性的机制

### 1. 三层验证体系

#### 第一层：构建时验证
- **位置：** `scripts/build-graphviz.js`
- **检查：**
  - 文件复制完整性
  - Linux 依赖库递归查找（ldd）
  - 可执行权限设置
  - 包大小检查

#### 第二层：发布前验证
- **位置：** `scripts/verify-graphviz-package.js`
- **检查：**
  - ✅ 目录结构完整性
  - ✅ dot 可执行文件存在且可运行
  - ✅ 库文件完整（Linux/macOS 必需）
  - ✅ 依赖关系正确（Linux ldd 检查）
  - ✅ 实际渲染功能测试
  - ✅ 包大小合理性

#### 第三层：CI/CD 自动验证
- **位置：** `.github/workflows/publish.yml`
- **检查：**
  - 构建后自动运行验证
  - 发布前再次验证
  - 验证失败阻止发布

---

## 📦 不同平台的完整性要求

### Windows
- ✅ `graphviz/bin/dot.exe` - 必需
- ✅ `graphviz/bin/*.dll` - 必需（所有依赖 DLL）
- ⚠️ `graphviz/lib/` - 可选

**验证重点：** DLL 文件完整性

### Linux
- ✅ `graphviz/bin/dot` - 必需（可执行权限）
- ✅ `graphviz/lib/*.so*` - **必需**（所有依赖库）
- ⚠️ `graphviz/share/` - 可选

**验证重点：** 
- 库文件完整性（使用 ldd 递归查找）
- 依赖关系正确性

### macOS
- ✅ `graphviz/bin/dot` - 必需（可执行权限）
- ✅ `graphviz/lib/*.dylib` - **必需**（所有依赖库）
- ⚠️ `graphviz/share/` - 可选

**验证重点：** 动态库文件完整性

---

## 🔗 运行时引用机制

### 自动解析流程

```
用户安装 node-plantuml-2
  ↓
npm 自动安装匹配平台的 Graphviz 包
  (通过 optionalDependencies)
  ↓
运行时调用 plantuml.generate()
  ↓
dot-resolver.resolveDotExecutable()
  ↓
1. 检查用户指定路径 (options.dotPath)
  ↓ (如果未指定)
2. 解析捆绑的 Graphviz 包
  - require.resolve('@node-plantuml-2/graphviz-{platform}-{arch}')
  - 或递归查找 node_modules
  ↓
3. 构造 dot 路径
  {pkgPath}/graphviz/bin/dot
  ↓
4. 设置环境变量
  - Windows: PATH += bin目录
  - Linux: LD_LIBRARY_PATH += lib目录
  - macOS: DYLD_LIBRARY_PATH += lib目录
  ↓
5. 传递给 PlantUML Java 进程
```

### 包路径解析策略

`lib/dot-resolver.js` 使用 4 种方式确保能找到包：

1. **require.resolve()** - 标准 npm 解析
2. **通过 node-plantuml-2 定位** - 查找父级 node_modules
3. **递归向上查找** - 支持嵌套依赖
4. **本地开发环境** - 支持 npm link

---

## ✅ 质量保证检查清单

### 构建阶段
- [ ] 所有必需文件已复制
- [ ] Linux 依赖库完整（ldd 检查）
- [ ] 可执行权限正确设置
- [ ] 包大小合理（< 200MB）

### 验证阶段
- [ ] 目录结构正确
- [ ] dot 可执行文件存在且可运行
- [ ] 库文件完整（平台特定）
- [ ] 依赖关系正确（Linux）
- [ ] 实际渲染功能正常
- [ ] 包大小合理

### 发布阶段
- [ ] 验证脚本通过
- [ ] 版本号正确
- [ ] npm 认证成功
- [ ] 版本未冲突

### 安装后验证
- [ ] 包能正确安装
- [ ] 路径能正确解析
- [ ] 环境变量正确设置
- [ ] 实际使用正常

---

## 🛠️ 使用验证工具

### 手动验证

```bash
# 验证特定平台的包
node scripts/verify-graphviz-package.js win32 x64
node scripts/verify-graphviz-package.js linux x64
node scripts/verify-graphviz-package.js darwin arm64
```

### 发布时自动验证

```bash
# 发布脚本会自动验证
node scripts/publish-runtime-package.js graphviz win32 x64
```

### CI/CD 自动验证

GitHub Actions 工作流自动运行验证，无需手动操作。

---

## 📊 验证报告解读

### 成功示例
```
✅ All checks passed! Package is complete and correct.
```

### 警告示例
```
⚠️  Package verification passed with warnings
  - Some library dependencies may be missing: 2
```

### 失败示例
```
❌ Package verification FAILED
  - Lib directory does not exist (required for linux)
  - Dot executable failed to run
```

---

## 🔧 故障排除

### 验证失败时的处理

1. **检查构建日志**
   ```bash
   node scripts/build-graphviz.js <platform> <arch>
   ```

2. **运行详细验证**
   ```bash
   node scripts/verify-graphviz-package.js <platform> <arch>
   ```

3. **检查系统 Graphviz**
   ```bash
   # 确保系统已安装 Graphviz
   dot -V
   ```

4. **重新构建**
   ```bash
   # 清理并重新构建
   rm -rf runtimes/@node-plantuml-2/graphviz-<platform>-<arch>
   node scripts/build-graphviz.js <platform> <arch>
   node scripts/verify-graphviz-package.js <platform> <arch>
   ```

---

## 📚 相关文档

- `docs/GRAPHVIZ_PACKAGE_VERIFICATION.md` - 详细验证指南
- `docs/RUNTIME_PACKAGES_BUILD_AND_PUBLISH.md` - 构建和发布指南
- `docs/NPM_PACKAGING_FLOW.md` - npm 打包流程

