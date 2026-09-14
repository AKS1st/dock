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
- **设置窗口**：内置设置对话框展示各插件注册的设置项；支持校验、排序、键盘焦点管理与跨刷新持久化。
- **开放注册表**：`registerActivityBarItem` / `registerPanel` / `registerEditorView` / `registerStatusBarItem` / `registerCommand` / `registerSetting`，全部返回反注册函数，配合 `ctx.effect` 使用可随插件停用自动清理。

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

## 设置 API

从 0.2.0 起，工作台公开设置注册 API。功能插件通过 `ctx.workbench.registerSetting` 注册设置项；返回的反注册函数应交给 `ctx.effect`，这样插件停用或热更新时会自动移除注册。设置窗口会按 `order`（再按 `id`）排序，编辑器只接收当前值、`onChange` 回调和当前语言，并在写入前执行 `validate`：

```ts
ctx.effect(() => ctx.workbench.registerSetting({
  id: 'my-plugin:compact',
  pluginId: 'my-plugin',
  // 文案可以是字符串，也可以是按语言求值的工厂函数
  title: (locale) => locale === 'zh' ? '紧凑模式' : 'Compact mode',
  defaultValue: false,
  component: CompactToggle,
  validate: (value): value is boolean => typeof value === 'boolean',
}))
```

`pluginId` 决定设置显示在哪个插件的设置页里。插件还应通过 `registerPlugin({ id, title, description, icon, hasEntry })` 注册元数据，设置窗口才能列出它（没有图标时使用 dock 自带的通用插件图标）。有 dock 入口（`hasEntry: true`）的插件，列表中会提供“打开”按钮和“在 dock 中显示”开关；入口隐藏后仍可从设置里打开。

用户可从工作台打开设置窗口；设置值保存在 `localStorage` 的 `dock:settings` 中，刷新后恢复。存储不可用或数据损坏时，工作台使用内存值和默认值继续运行。插件也可通过 `getSetting` / `setSetting` / `onDidChangeSetting` 读取、更新和订阅设置变化。

### 通用设置

dock 自身在设置窗口的“通用设置”里提供位置、自动隐藏、“为 dock 预留空间”和两档放大倍数。dock 栏末尾的 dock 图标点开就是设置窗口：

- **Dock 位置**：左/右/上/下四联切换，右键菜单里的停靠项与它共享同一份状态。
- **自动隐藏**：鼠标远离后以滑出、缩放和淡化动画收起；停靠边缘保留可见提示条，移入边缘即可展开。关闭自动隐藏时，即使 dock 正在隐藏也会立即强制展开。
- **为 dock 预留空间**（默认开启）：只将右停靠时的会话进度导航栏向左移动实测 dock 宽度 + 12px，不改变页面宽度或滚动条位置。dock 栏尺寸变化、窗口缩放和该开关切换时都会重新计算，关闭该开关时偏移归零。
- **悬停图标放大 / 相邻图标放大**（默认 1.6× / 1.2×）：dock 模式下的鱼眼放大倍数，两个滑块分别在 1.0–2.5× 和 1.0–2.0× 之间以 0.05 步进调节，拖动即时生效；相邻倍数不会超过悬停倍数。
- **Dock 图标**：dock 栏末尾的 dock 图标（三个方块立在横栏上）点开即设置窗口。它和其他入口一样可以在“插件 → 入口 → Dock”里隐藏；隐藏后仍可右键 dock 栏打开设置。

## 依赖

| 依赖 | 类型 | 说明 |
| --- | --- | --- |
| DSH Web 环境 | 运行时 | 必需，最低版本 `>=0.1.3-alpha.2`。客户端平台为 Web，通过 `dsh plugin --profile web add` 安装 |
| `cordis` ^4.0.0-rc.7 | peer | 插件框架（DSH 自带） |
| `react` / `react-dom` ^18.2.0 | peer（可选） | 客户端渲染需要；未提供时工作台 UI 不激活 |

dock 自身不依赖任何其他 dock 系列插件——它是系列的地基，反过来其他五个都依赖它。

## 安装

需要 DSH Web 环境（`dsh plugin --profile web add`），且 Harness 版本至少为 `0.1.3-alpha.2`。

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
