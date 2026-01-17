# Wasm JVM 集成方案

## 概述

本项目计划通过 WebAssembly (Wasm) 替代本地 Java 调用，以实现更好的性能和跨平台兼容性。

## 技术方案

### 推荐方案：TeaVM / Bytecoder → Wasm → Node.js

**架构流程：**
```
PlantUML Java 源码
    ↓
JVM 字节码 (.class / .jar)
    ↓
TeaVM / Bytecoder (编译器)
    ↓
WebAssembly (.wasm)
    ↓
Node.js (WASI / wasmtime)
```

### 为什么选择 Node.js + Wasm

1. **性能优势**
   - Wasm 启动时间比 JVM 快一个量级
   - 内存占用更小
   - 执行效率接近原生代码

2. **跨平台兼容性**
   - 无需安装 Java 运行时
   - 统一的 Wasm 二进制格式
   - 支持 Windows/Linux/macOS

3. **Node.js 友好**
   - 支持 WASI (WebAssembly System Interface)
   - 可读写本地文件系统
   - 支持 Worker Threads
   - 非常适合 CLI 和桌面工具

## 实现步骤

### 步骤 1: 准备构建环境

#### 使用 TeaVM

```bash
# 添加 TeaVM Maven 插件
# 在 pom.xml 中配置
<plugin>
    <groupId>org.teavm</groupId>
    <artifactId>teavm-maven-plugin</artifactId>
    <version>0.8.0</version>
    <executions>
        <execution>
            <id>compile-to-wasm</id>
            <phase>package</phase>
            <goals>
                <goal>compile</goal>
            </goals>
            <configuration>
                <targetType>WASM</targetType>
                <mainClass>net.sourceforge.plantuml.Run</mainClass>
            </configuration>
        </execution>
    </executions>
</plugin>
```

#### 使用 Bytecoder

```bash
# 使用 Bytecoder 编译器
java -jar bytecoder-cli.jar \
  -classpath plantuml.jar \
  -mainclass net.sourceforge.plantuml.Run \
  -backend wasm \
  -builddirectory build
```

### 步骤 2: 处理依赖和限制

PlantUML 依赖的一些 Java 库可能无法直接转换为 Wasm：

1. **文件系统访问** - 使用 WASI 提供文件系统接口
2. **网络请求** - 在 Node.js 层提供 HTTP 客户端
3. **反射和动态加载** - TeaVM/Bytecoder 可能有限制
4. **多线程** - 使用 Worker Threads 模拟

### 步骤 3: 集成到 Node.js

#### 选项 A: 使用 WASI

```javascript
const { WASI } = require('wasi');
const fs = require('fs');

const wasi = new WASI({
  env: process.env,
  preopens: {
    '/': '.'
  }
});

const wasm = await WebAssembly.instantiate(
  fs.readFileSync('plantuml.wasm'),
  { wasi_snapshot_preview1: wasi.wasiImport }
);
```

#### 选项 B: 使用 wasmtime (推荐)

```javascript
const { WasmtimeEngine, WasmtimeModule } = require('@wasmtime/node');

const engine = new WasmtimeEngine();
const module = WasmtimeModule.fromFile(engine, 'plantuml.wasm');
const instance = module.instantiate(engine);
```

### 步骤 4: 实现文件系统桥接

Wasm 模块需要访问文件系统，可以通过 WASI 或自定义桥接：

```javascript
// 提供文件系统访问接口
const fsBridge = {
  readFile: (path) => fs.readFileSync(path),
  writeFile: (path, data) => fs.writeFileSync(path, data),
  listDir: (path) => fs.readdirSync(path),
  // ... 其他文件系统操作
};
```

### 步骤 5: 处理输入输出流

```javascript
// 将 Node.js Stream 转换为 Wasm 可用的格式
function createStreamBridge(stdin, stdout, stderr) {
  return {
    stdin: stdin ? Buffer.from(stdin) : null,
    stdout: (data) => stdout.write(data),
    stderr: (data) => stderr.write(data)
  };
}
```

## 构建脚本

创建一个构建脚本来自动化 Wasm 转换过程：

```bash
# scripts/build-wasm.sh
#!/bin/bash

# 1. 下载 PlantUML 源码或 JAR
# 2. 使用 TeaVM/Bytecoder 编译为 Wasm
# 3. 优化 Wasm 文件大小
# 4. 复制到 vendor/wasm/ 目录
```

## 当前状态

- [x] 框架结构已创建 (`lib/plantuml-executor-wasm.js`)
- [ ] Wasm 构建脚本
- [ ] TeaVM/Bytecoder 配置
- [ ] WASI 集成
- [ ] 文件系统桥接
- [ ] 测试和验证

## 注意事项

1. **兼容性**: 不是所有 Java 特性都能转换为 Wasm，可能需要代码调整
2. **性能测试**: 需要对比 Wasm 版本与 Java 版本的性能
3. **文件大小**: Wasm 文件可能较大，考虑压缩和优化
4. **调试**: Wasm 调试比 Java 更困难，需要合适的工具链

## 参考资料

- [TeaVM 文档](http://teavm.org/)
- [Bytecoder 文档](https://mirkosertic.github.io/Bytecoder/)
- [WASI 规范](https://wasi.dev/)
- [Node.js WASI](https://nodejs.org/api/wasi.html)
- [wasmtime-node](https://github.com/bytecodealliance/wasmtime-node)

