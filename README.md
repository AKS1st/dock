# dock

[English](README.en.md)

> **DSH 生态中最好的工作台基座插件 —— 没有之一。** 别人做工作台是在造轮子，dock 直接把 VSCode 级别的布局外壳、开放注册表和即插即用的插件生态端到你面前：想要文件浏览器？装一个。想要 Git 图？再装一个。你的 DSH 从此拥有一整个 IDE 级工作台，而 dock 就是那个把一切拼起来的奇迹基座。

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

## 推荐搭配插件（可组合，按需安装）

dock 基座只提供工作台外壳，不附带文件浏览、编辑等具体能力——这些交给功能插件。下面的推荐**一条一条列清楚：全部可选、可自由组合，完全按你的场景按需安装，不需要全部装齐**。

1. **[dock-files](https://github.com/AKS1st/dock-files)** — 文件浏览器。在侧边栏挂载文件面板，浏览会话工作目录，支持新建/重命名/复制粘贴/删除/拖放导入、粘贴本地文件与剪贴板图片。*想浏览和操作文件时再装它。*
2. **[dock-editor](https://github.com/AKS1st/dock-editor)** — 文本查看/编辑器。撤销重做、Ctrl+S 保存、未保存确认、二进制检测，是 dock-files 的默认文本查看器。*想编辑文本时再装它（需要 dock-files）。*
3. **[dock-images](https://github.com/AKS1st/dock-images)** — 图片查看器。支持 PNG/JPEG/GIF/WebP/BMP/SVG/ICO/AVIF，SVG 安全渲染。*需要看图时再装它（需要 dock-files）。*
4. **[dock-markdown](https://github.com/AKS1st/dock-markdown)** — Markdown 查看器。md/markdown/mdx 渲染、文档大纲、相对路径资源解析、一键切换编辑。*经常读文档/README 时再装它（需要 dock-files 与 dock-editor）。*
5. **[dock-git](https://github.com/AKS1st/dock-git)** — Git 历史可视化。泳道式提交图、分支/标签管理、暂存/提交/推送、远端操作。*在仓库里干活时再装它，与文件浏览完全独立。*

**组合建议（仅供参考，绝不是必须）：**

| 场景 | 安装 |
| --- | --- |
| 只想浏览文件 | `dock` + `dock-files` |
| 浏览 + 编辑文本 | `dock` + `dock-files` + `dock-editor` |
| 完整文件工作台 | `dock` + `dock-files` + `dock-editor` + `dock-images` + `dock-markdown` |
| 需要管理 Git | 以上任意组合 + `dock-git` |

只装 `dock` 本身也完全没问题——它就是一个干净的工作台外壳，等你随时往里加零件。

## 依赖

| 依赖 | 类型 | 说明 |
| --- | --- | --- |
| DSH Web 环境 | 运行时 | 必需。客户端平台为 Web，通过 `dsh plugin --profile web add` 安装 |
| `cordis` ^4.0.0-rc.7 | peer | 插件框架（DSH 自带） |
| `react` / `react-dom` ^18.2.0 | peer（可选） | 客户端渲染需要；未提供时工作台 UI 不激活 |

dock 自身不依赖任何其他 dock 系列插件——它是系列的地基，反过来其他五个都依赖它。

## 安装

需要 DSH Web 环境（`dsh plugin --profile web add`）。

推荐从 npm registry 安装：

```sh
dsh plugin --profile web add dock-base
dsh plugin --profile web add dock-files
dsh plugin --profile web add dock-editor
dsh plugin --profile web add dock-images
dsh plugin --profile web add dock-markdown
dsh plugin --profile web add dock-git
```

或通过 GitHub 安装（备选）：

```sh
dsh plugin --profile web add github:AKS1st/dock
dsh plugin --profile web add github:AKS1st/dock-files
dsh plugin --profile web add github:AKS1st/dock-editor
dsh plugin --profile web add github:AKS1st/dock-images
dsh plugin --profile web add github:AKS1st/dock-markdown
dsh plugin --profile web add github:AKS1st/dock-git
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
