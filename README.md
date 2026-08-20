# dock

[English](README.en.md)

DSH Web 工作台基础插件：提供 VSCode 风格布局外壳（活动栏 / 侧边栏 / 编辑器区 / 面板 / 状态栏），并通过注册表服务 `ctx.workbench` 让功能插件挂载面板、编辑器视图、活动项、状态项与命令。本插件是 **dock 系列**的基础：`dock-files`、`dock-editor`、`dock-images`、`dock-markdown`、`dock-git` 都依赖它提供的工作台外壳。

## 功能

- **活动栏**：左侧垂直条带，可注册图标项，点击切换侧边栏面板。
- **侧边栏**：承载功能面板（文件浏览、Git 启动器等）。
- **编辑器区**：多标签编辑器视图（文件查看器、Git 提交图等）。
- **停靠模式**：整个工作台可停靠在屏幕四边，支持悬浮窗口（独立浮窗，可拖动/缩放）。
- **状态栏**：底部状态项注册。
- **命令系统**：`executeCommand` 命令注册与调用。
- **布局持久化**：面板/悬浮窗口布局保存在 localStorage，刷新后恢复。
- **开放注册表**：`registerActivityBarItem` / `registerPanel` / `registerEditorView` / `registerStatusBarItem` / `registerCommand`，全部返回反注册函数，配合 `ctx.effect` 使用可随插件停用自动清理。

## 安装

需要 DSH Web 环境（`dsh plugin add`）。与其他 dock 系列插件一起安装：

```sh
dsh plugin add github:AKS1st/dock
dsh plugin add github:AKS1st/dock-files
dsh plugin add github:AKS1st/dock-editor
dsh plugin add github:AKS1st/dock-images
dsh plugin add github:AKS1st/dock-markdown
dsh plugin add github:AKS1st/dock-git
```

或按你的 profile 依赖写法使用 `link:` 本地安装。`dock` 提供 `ctx.workbench` 服务；功能插件通过该服务协作，安装顺序不敏感（Cordis 按依赖激活）。

## 开发

```sh
pnpm install
pnpm run build    # tsc 类型声明 + tsdown 打包
pnpm run check    # 仅类型检查
```

## 插件契约

`src/client/contract.ts` 是工作台对外契约（`WorkbenchService`、`ViewProps`、`EditorOpenSeed` 等）。功能插件只做类型导入（编译期擦除），运行时全部通过 `ctx.workbench` 方法调用协作。各功能插件内有一份该契约的 vendored 副本，改动本文件时需同步更新。

## License

MIT
