# 自动字体配置功能

## 概述

本库现在自动处理中文字体配置，调用者无需手动添加字体设置。当检测到代码中包含中文、日文或韩文字符时，会自动添加合适的字体配置。

## 工作原理

### 自动检测

系统会自动检测以下字符：
- **中文**: `\u4e00-\u9fa5` (CJK统一汉字)
- **日文**: `\u3040-\u309f` (平假名), `\u30a0-\u30ff` (片假名)
- **韩文**: `\uac00-\ud7af` (韩文音节)

### 自动字体选择

根据运行平台自动选择字体：

- **Windows**: `Microsoft YaHei` (微软雅黑)
- **macOS**: `PingFang SC`
- **Linux**: `Noto Sans CJK SC`

### 字体配置位置

字体配置会自动插入到 `@startuml`、`@startgantt` 或 `@startmindmap` 之后：

```plantuml
@startuml
skinparam defaultFontName "Microsoft YaHei"
skinparam defaultFontSize 12
!theme your-theme
...
@enduml
```

## 使用方式

### 基本使用（自动处理）

```javascript
var plantuml = require('node-plantuml')

// 包含中文的代码，无需手动添加字体配置
var code = '@startuml\n!theme plain\nclass 用户 {\n  -姓名: String\n}\n@enduml'

var gen = plantuml.generate(code, { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
// 字体配置会自动添加
```

### 显式指定字体

如果用户想要使用特定字体，可以通过 `options.fontName` 指定：

```javascript
var gen = plantuml.generate(code, {
  format: 'png',
  fontName: 'SimSun',  // 使用宋体
  fontSize: 14         // 可选：指定字体大小
})
```

**注意**: 如果代码中已经包含 `skinparam defaultFontName`，系统不会覆盖用户的设置。

### 禁用自动字体配置

如果代码中已经包含字体配置，系统会自动跳过：

```plantuml
@startuml
skinparam defaultFontName "SimSun"  // 已有字体配置，不会重复添加
class 用户 {}
@enduml
```

## 支持的输入方式

自动字体配置支持所有输入方式：

1. **文本输入**
   ```javascript
   plantuml.generate('@startuml\nclass 用户 {}\n@enduml')
   ```

2. **文件输入**
   ```javascript
   plantuml.generate('path/to/file.puml')
   ```

3. **标准输入**
   ```javascript
   var gen = plantuml.generate()
   process.stdin.pipe(gen.in)
   ```

## 示例

### 示例 1: 中文类图（自动字体）

```javascript
var plantuml = require('node-plantuml')
var fs = require('fs')

var code = `
@startuml
!theme plain
class 用户 {
  -姓名: String
  +登录()
}
@enduml
`

// 无需手动添加字体配置，系统会自动处理
var gen = plantuml.generate(code, { format: 'png' })
gen.out.pipe(fs.createWriteStream('output.png'))
```

### 示例 2: 使用自定义字体

```javascript
var gen = plantuml.generate(code, {
  format: 'png',
  fontName: 'SimHei',  // 使用黑体
  fontSize: 16
})
```

### 示例 3: 多语言支持

```javascript
// 日文
var japaneseCode = '@startuml\nclass ユーザー {}\n@enduml'

// 韩文
var koreanCode = '@startuml\nclass 사용자 {}\n@enduml'

// 都会自动添加字体配置
```

## 技术细节

### 检测逻辑

1. 检查代码是否包含 CJK 字符
2. 检查是否已有字体配置（`defaultFontName`）
3. 检查用户是否显式指定字体（`options.fontName`）
4. 如果满足条件，自动添加字体配置

### 字体配置格式

```plantuml
skinparam defaultFontName "字体名称"
skinparam defaultFontSize 12
```

### 平台字体映射

| 平台 | 默认字体 | 备选字体 |
|------|---------|---------|
| Windows | Microsoft YaHei | SimSun, SimHei |
| macOS | PingFang SC | STHeiti, Arial Unicode MS |
| Linux | Noto Sans CJK SC | WenQuanYi Micro Hei, SimSun |

## 注意事项

1. **字体可用性**: 确保系统已安装相应的字体，否则 PlantUML 会使用默认字体
2. **性能影响**: 字体检测和配置添加的开销很小，几乎可以忽略
3. **兼容性**: 如果代码中已有字体配置，系统不会重复添加
4. **用户控制**: 用户可以通过 `options.fontName` 完全控制字体选择

## 故障排除

### 中文仍然显示为方框

1. 检查系统是否安装了相应字体
2. 尝试显式指定字体：`{ fontName: 'SimSun' }`
3. 检查代码中是否已有字体配置（可能被覆盖）

### 字体配置未添加

1. 确认代码中包含 CJK 字符
2. 检查代码中是否已有 `defaultFontName` 配置
3. 查看是否有 `options.fontName` 设置

## 更新日志

- **v0.9.3**: 添加自动字体配置功能
  - 自动检测 CJK 字符
  - 根据平台选择合适字体
  - 支持用户显式指定字体

