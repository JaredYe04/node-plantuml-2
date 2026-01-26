# Graphviz 包端到端测试

## 🎯 核心目标

**在实际发布前，使用构建的 JRE、PlantUML 和 Graphviz 包，真实生成需要 Graphviz 的 PlantUML 图表，确保包真正可用！**

---

## 🧪 端到端测试流程

### 测试脚本

`scripts/test-graphviz-package-end-to-end.js`

### 测试步骤

1. **检查环境**
   - ✅ Graphviz 包是否存在
   - ✅ JRE 是否存在（优先使用捆绑的 JRE）
   - ✅ PlantUML JAR 是否存在

2. **设置环境变量**
   - Windows: 将 Graphviz `bin` 目录添加到 `PATH`
   - Linux: 设置 `LD_LIBRARY_PATH` 指向 `lib` 目录
   - macOS: 设置 `DYLD_LIBRARY_PATH` 指向 `lib` 目录

3. **实际生成图表**
   - Activity Diagram（活动图）
   - State Diagram（状态图）
   - Component Diagram（组件图）
   - Complex Activity Diagram（复杂活动图）

4. **验证输出**
   - ✅ 生成的图表文件存在
   - ✅ 文件大小 > 0
   - ✅ 输出 PNG 和 SVG 格式

---

## 🚀 使用方法

### 本地测试

```bash
# 基本用法
node scripts/test-graphviz-package-end-to-end.js win32 x64

# 指定输出目录
node scripts/test-graphviz-package-end-to-end.js linux x64 ./my-test-output

# 查看生成的图表
ls test-output-graphviz-e2e/
```

### CI/CD 自动测试

GitHub Actions 工作流自动运行：

```yaml
- name: End-to-end test: Generate PlantUML diagrams with Graphviz
  run: |
    node scripts/test-graphviz-package-end-to-end.js ${{ matrix.platform }} ${{ matrix.arch }} ./test-output-graphviz-e2e

- name: Upload generated PNG diagrams as artifact
  uses: actions/upload-artifact@v4
  with:
    name: graphviz-test-output-${{ matrix.platform }}-${{ matrix.arch }}
    path: test-output-graphviz-e2e/*.png
```

---

## ✅ 测试验证内容

### 1. 环境检查

- Graphviz 包路径正确
- JRE 可用（捆绑或系统）
- PlantUML JAR 存在

### 2. 可执行性测试

- dot 可执行文件可以运行
- 返回版本信息

### 3. 实际图表生成

**测试的图表类型：**

1. **Activity Diagram** - 活动图（需要 Graphviz）
   ```plantuml
   @startuml
   start
   :Initialize;
   if (Check condition?) then (yes)
     :Process A;
   else (no)
     :Process B;
   endif
   stop
   @enduml
   ```

2. **State Diagram** - 状态图（需要 Graphviz）
   ```plantuml
   @startuml
   [*] --> State1
   State1 --> State2 : transition1
   State2 --> State3 : transition2
   State3 --> [*]
   @enduml
   ```

3. **Component Diagram** - 组件图（需要 Graphviz）
   ```plantuml
   @startuml
   component [Component A]
   component [Component B]
   [Component A] --> [Component B]
   @enduml
   ```

4. **Complex Activity Diagram** - 复杂活动图（需要 Graphviz）
   ```plantuml
   @startuml
   start
   repeat
     :Read data;
     :Process data;
   repeat while (More data?) is (yes)
   ->no;
   :Finalize;
   stop
   @enduml
   ```

### 4. 输出验证

- ✅ 文件存在
- ✅ 文件大小 > 0
- ✅ 格式正确（PNG/SVG）

---

## 📊 测试输出

### 成功示例

```
============================================================
Graphviz Package End-to-End Test
============================================================
Platform: win32
Architecture: x64

Test 1: Checking Graphviz package...
✓ Graphviz package found
Test 2: Checking JRE...
✓ Bundled JRE found
Test 3: Checking PlantUML JAR...
✓ PlantUML JAR found
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
```

### 失败示例

```
Generating: Activity Diagram ...
  ❌ Failed: Output file not created: Error executing PlantUML
  ❌ Error: Graphviz library not found

============================================================
Test Summary
============================================================
Total tests: 4
Successful: 0
Failed: 4

❌ Some tests failed!
```

---

## 🔧 故障排除

### 问题 1: "Graphviz package not found"

**原因：** 包未构建

**解决：**
```bash
node scripts/build-graphviz.js <platform> <arch>
```

### 问题 2: "No Java found"

**原因：** JRE 未构建或系统未安装 Java

**解决：**
```bash
# 构建 JRE
node scripts/build-jre.js <platform> <arch>

# 或安装系统 Java
```

### 问题 3: "PlantUML JAR not found"

**原因：** PlantUML JAR 未下载

**解决：**
```bash
node scripts/get-plantuml-jar.js --latest
```

### 问题 4: "Output file not created"

**原因：** Graphviz 包不完整或环境变量未设置

**解决：**
```bash
# 检查包完整性
node scripts/verify-graphviz-package.js <platform> <arch>

# 重新构建
node scripts/build-graphviz.js <platform> <arch>
```

### 问题 5: "Library not found" (Linux/macOS)

**原因：** 缺少依赖库文件

**解决：**
```bash
# 重新构建（确保使用 ldd 复制所有依赖）
node scripts/build-graphviz.js linux x64
```

---

## 📦 CI/CD 集成

### GitHub Actions 工作流

在 `.github/workflows/publish.yml` 中：

1. **构建 Graphviz 包**
2. **验证包结构**
3. **端到端测试** - 实际生成图表
4. **上传 artifact** - 保存生成的图表
5. **发布包** - 只有测试通过才发布

### Artifact 下载

测试生成的图表会作为 artifact 保存：

- `graphviz-test-output-{platform}-{arch}` - PNG 图表
- `graphviz-test-output-svg-{platform}-{arch}` - SVG 图表

可以在 GitHub Actions 运行后下载检查。

---

## 🎯 关键优势

1. **真实验证** - 不是只检查文件存在，而是实际生成图表
2. **完整流程** - 测试整个链路：JRE → PlantUML → Graphviz
3. **多格式测试** - 测试 PNG 和 SVG 输出
4. **Artifact 保存** - 可以下载检查生成的图表
5. **阻止发布** - 测试失败会阻止发布，确保质量

---

## 📚 相关文档

- `docs/GRAPHVIZ_PACKAGE_VERIFICATION.md` - 完整验证指南
- `docs/RUNTIME_PACKAGES_BUILD_AND_PUBLISH.md` - 构建和发布指南
- `scripts/test-graphviz-package-end-to-end.js` - 测试脚本源码

