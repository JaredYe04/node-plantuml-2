# 测试框架说明

## 批量转换测试

该测试框架支持批量处理 PlantUML 代码文件，并生成多种格式的图表。

### 目录结构

```
test/
├── fixtures/
│   └── txt/              # 放置 PlantUML 代码的 .txt 文件
│       ├── example1.txt
│       ├── example2.txt
│       └── ...
├── output/
│   ├── svg/              # SVG 格式输出目录
│   └── png/              # PNG 格式输出目录
└── batch-convert-test.js # 批量转换测试脚本
```

### 使用方法

#### 1. 准备测试文件

在 `test/fixtures/txt/` 目录下放置包含 PlantUML 代码的 `.txt` 文件：

```txt
@startuml
Alice -> Bob: 你好！
Bob -> Alice: Hello!
@enduml
```

#### 2. 运行批量转换

**生成所有格式 (SVG + PNG):**
```bash
npm run test:batch
```

**仅生成 SVG:**
```bash
npm run test:batch:svg
# 或
node test/batch-convert-test.js --svg
```

**仅生成 PNG:**
```bash
npm run test:batch:png
# 或
node test/batch-convert-test.js --png
```

**同时指定多种格式:**
```bash
node test/batch-convert-test.js --svg --png
```

### 示例测试文件

项目已包含以下示例文件：

1. **example1.txt** - 中英文混合的序列图
2. **example2.txt** - 中文类图
3. **sequence.txt** - 复杂的序列图示例

### 输出格式

- **SVG**: 矢量图形，适合在网页中使用
- **PNG**: 位图格式，适合打印和分享

### 注意事项

- 确保已安装 Java 运行环境
- PlantUML JAR 文件需要已下载到 `vendor/plantuml.jar`
- 支持 UTF-8 编码的中文内容
- 输出文件与输入文件同名，仅扩展名不同

### 扩展

可以轻松添加更多输入文件到 `test/fixtures/txt/` 目录，脚本会自动处理所有 `.txt` 文件。

