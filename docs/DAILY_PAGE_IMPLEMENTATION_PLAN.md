# Daily 首页实施计划

> 编制日期：2026-08-27  
> 项目：`/Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest`  
> 目标：在现有 Volo Coach 视觉与前端架构上实现 Daily 首页；Echo 设置作为第二个切片延后。

## 新窗口启动提示

把下面整段粘贴到新的 Codex 窗口中：

```text
请严格按以下计划实现 Daily 首页：
/Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest/docs/DAILY_PAGE_IMPLEMENTATION_PLAN.md

项目目录：
/Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest

开始时：
1. 完整阅读仓库 AGENTS.md、README.md、DESIGN.md 和本计划。
2. 运行 git status --short。当前工作树有未提交的 Coach、背景和底栏改动；这些改动是实施基线，不得 reset、checkout、stash、删除或覆盖。
3. 使用 figma-design-to-code skill 读取计划列出的 Daily Figma 节点。主页面必须先调用 get_design_context，Figma 返回的 React/Tailwind 只作为参考，需适配当前代码。
4. 先运行现状的 format:check、typecheck、lint、build，并启动本地页面截图，确认基线可运行；若基线自身失败，先报告失败与涉及文件，不要把无关问题混入 Daily 实现。
5. 首轮只实现 Daily 首页。不要实现“修改 Echo 计划”或 Repeat Menu；不要新增真实 API、持久化、提醒、日历同步或 AI streaming。
6. 登录后的根路由从 /chat 改为 /daily；未登录仍进入 /login。
7. Daily 底栏右侧历史按钮打开现有 Coach 会话历史。选择会话后进入 /chat?session=<session-id>。
8. 每个阶段完成后按计划中的完成标准验收，再进入下一阶段。

先给我一段简短的基线摘要和将修改的文件清单，然后直接执行；只有遇到本计划列出的停止条件才询问。
```

## 已确认决策

1. 首轮只实现 Daily 首页。
2. “修改 Echo 计划”和 Repeat Menu 延后到第二个切片。
3. 登录后的 `/` 默认进入 `/daily`。
4. Daily 底栏右侧历史图标打开现有 Coach 会话历史。
5. 继续使用本地 mock 数据；后端合同缺失时不推断 API、认证或存储行为。

## Figma 来源

### 第一切片：Daily 首页

- [Daily 设计区总览，节点 1:266](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=1-266&m=dev)
- [Daily Ver2 主页面，节点 102:15348](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=102-15348&m=dev) — 首轮视觉主事实源
- [Daily 长内容参考 A，节点 37:9371](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=37-9371&m=dev) — 用于完整滚动内容和区块顺序
- [Daily 长内容参考 B，节点 37:9628](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=37-9628&m=dev) — 用于内容高度及变体核对

实现前必须对 `102:15348` 调用 `get_design_context`。如果返回 section 或稀疏 metadata，继续下钻到具体子节点；不得以截图猜测资产或组件细节。

### 第二切片：仅记录，不在本轮实现

- [修改 Echo 计划，节点 1:1260](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=1-1260&m=dev)
- [修改 Echo 计划状态，节点 37:10320](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=37-10320&m=dev)
- [修改 Echo 计划状态，节点 37:10738](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=37-10738&m=dev)
- [Repeat Menu，节点 37:10557](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=37-10557&m=dev)
- [Repeat Menu 紧凑状态，节点 37:11003](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=37-11003&m=dev)

第一切片不得创建这些界面的半成品、空路由或无效按钮。

## 当前代码事实

- `/chat` 由 `src/pages/ChatPage.tsx` 渲染 `CoachExperience`。
- 路由定义在 `src/router/index.tsx`。
- 登录后的根路由目的地定义在 `src/components/layout/route-boundaries.tsx`，目前为 `/chat`。
- 移动端 390px 外框由 `src/components/layout/app-shell.tsx` 提供。
- Coach 氛围背景和底栏目前位于 `src/features/coach/coach-experience.tsx`；底栏仍是 Coach 私有组件。
- Coach 历史弹层和 `mockSessions` 目前属于 Coach feature。
- 主题变量位于 `src/styles/tokens.css`、`src/styles/themes/default.css`、`src/styles/themes/dark.css`。
- 项目级视觉锚点为根目录 `DESIGN.md`。
- 当前仓库没有 Daily API、持久化、日历或提醒合同。

## 目标架构

建议最终形状：

```text
src/
├── assets/
│   ├── daily/                         # Figma 导出的 Daily 专属资产
│   └── navigation/                    # Daily/Coach 共用底栏资产
├── components/
│   ├── cards/
│   │   └── move-card-surface.tsx      # 只负责共用 Move 视觉结构
│   └── layout/
│       ├── app-atmosphere.tsx         # 共用天空/桃色氛围层
│       └── app-bottom-navigation.tsx  # /daily、/chat、历史动作
├── features/
│   ├── coach/
│   │   ├── coach-experience.tsx
│   │   ├── coach-model.ts
│   │   └── conversation-history-dialog.tsx
│   └── daily/
│       ├── daily-experience.tsx
│       └── daily-model.ts
├── pages/
│   ├── ChatPage.tsx
│   └── DailyPage.tsx
└── router/index.tsx
```

名称可在检查现有代码后微调，但必须守住以下边界：

- 共享组件使用领域中立名称，不以 Coach 命名。
- Daily mock 数据与交互留在 `features/daily`。
- Coach 会话数据和历史弹层留在 `features/coach`。
- 共享 Move 组件只承载视觉 anatomy；接受、编辑、跳过等行为由调用方组合。
- 路由页面只组装 feature，不包含业务状态机。

## 阶段 0：基线与保护

### 动作

1. 阅读 `AGENTS.md`、`README.md`、`DESIGN.md`。
2. 运行 `git status --short`，记录所有已有修改与未跟踪文件。
3. 运行：

```bash
npm run format:check
npm run typecheck
npm run lint
npm run build
```

4. 使用 `VITE_MOCK_MODE=true` 启动本地项目，登录后检查 `/chat`。
5. 在 390×844 截图并确认现有 Coach 背景、底栏和输入区域可运行。

### 完成标准

- 已区分“基线已有改动”和“本次 Daily 改动”。
- 四项命令结果已记录。
- Coach 页面可作为回归对照；若不可运行，已在 Daily 修改前说明原因。

## 阶段 1：设计锚点与资产

### 动作

1. 对 Daily 主节点 `102:15348` 调用 Figma `get_design_context`。
2. 对以下关键子区域按需下钻：
   - VOLO 顶栏和个人图标
   - 日期标题及 Week Strip
   - Daily Echo 卡片及装饰弧线
   - Period Moves 和 Move 卡片
   - Daily Summary
   - Today’s Traces
   - 底部导航
3. 使用 Figma 下载工具保存原始 SVG/PNG；URL 约 7 天过期，生产代码不得引用临时 URL。
4. 优先复用现有 `atmosphere-sky.svg` 和已经导出的底栏资产。只有字节或图形不一致时才新增资产。
5. 把 `DESIGN.md` 从 Coach 单页规范扩展为 Volo 应用规范：保留共享背景、排版、圆角、阴影和底栏章节，新增 Daily 日期、Echo、Summary、Trace 规范。

### 资产规则

- VOLO wordmark、装饰曲线、Dot、Chevron 和无法明确匹配的图标使用 Figma 导出资产。
- 只有 glyph 明确一致时才复用 Lucide。
- 所有 `<img>` 显式声明宽高；装饰资产 `alt=""`。
- 不创建手写 lookalike SVG。

### 完成标准

- 每个视觉资产都有本地稳定文件或明确复用来源。
- `DESIGN.md` 能解释 Daily 与 Coach 如何共享一套视觉语言。
- 尚未开始页面代码时，资产与 token 映射已经确定。

## 阶段 2：共享外壳、底栏和历史

### 2.1 共用氛围外壳

从 Coach 中抽出天空、桃色光域和画布背景，使 Daily 与 Coach 使用同一实现。保持：

- 375px 起无横向溢出。
- 390px 为 Figma 参考宽度。
- 外层桌面仍由 `AppShell` 居中。
- 氛围层覆盖完整视口，不使用固定 `32rem` 高度造成断层。
- 明暗主题 anatomy 相同。

### 2.2 共用底部导航

创建 `AppBottomNavigation`：

- 左侧：Daily，导航到 `/daily`。
- 中间：Coach，导航到 `/chat`。
- 右侧：History，打开 Coach 会话历史弹层，不创建新路由。
- 使用现有 Figma 底栏 surface 和图标资产。
- 保留安全区和至少 44×44px 的触控热区。
- 使用真实 `<NavLink>` 或 `<Link>` 完成页面导航；History 使用 `<button>`。
- active 状态独立于 History 弹层开关，不用一个全局布尔值驱动全部图标。

### 2.3 共用 Coach 历史

把历史弹层从 `coach-experience.tsx` 提取为 `ConversationHistoryDialog`，数据继续来自 `coach-model.ts`。

- Daily 和 Coach 都能打开同一弹层。
- 选择历史会话后导航到 `/chat?session=<session-id>`。
- `CoachExperience` 从 URL 读取 `session`，找到对应 mock session 后显示其消息。
- 未知 session id 显示正常 Coach 默认态，并清除或忽略无效参数；不能渲染破碎页面。
- 关闭弹层后焦点返回 History 按钮；Esc 可关闭。

### 完成标准

- `/chat` 的现有状态和交互未退化。
- Daily 与 Coach 使用同一个底栏组件和同一历史弹层。
- 从 Daily 选择历史会话能进入正确 Coach 会话，浏览器前进/后退正常。

## 阶段 3：Daily 数据模型

在 `daily-model.ts` 定义最小模型：

```ts
type DailyTrace = {
  id: string
  time: string
  text: string
  kind: 'pebble' | 'note'
}

type DailyEcho = {
  lead: string
  takeaway: string
  traceCount: number
}

type DailyMove = {
  id: string
  schedule: string
  text: string
  source: string
  dueLabel: string
}

type DailySummary = {
  sourceLabel: string
  dateLabel: string
  body: string
  takeaway: string
}

type DailyRecord = {
  date: string
  echo: DailyEcho | null
  moves: DailyMove[]
  summary: DailySummary | null
  traces: DailyTrace[]
}
```

要求：

- fixture 默认日期为 `2026-05-27`，与 Figma 一致。
- 日期显示通过 `Intl.DateTimeFormat` 生成，不手写格式化逻辑。
- fixtures 只表达设计中已有的信息，不添加假统计或后台字段。
- 不用 TanStack Query 包装本地 mock 数据。

### 完成标准

- 页面内容完全由 typed fixtures 驱动。
- Daily 组件不包含散落的业务常量。
- 空 Echo、空 Moves、空 Summary/Traces 都能由模型自然表达。

## 阶段 4：Daily 首页组件

### 4.1 顶栏

- 中央 VOLO wordmark 使用 Figma 导出资产。
- 右侧个人图标在首轮只作为非交互品牌元素；不要暗示未实现的账户页。
- 不复制 iOS 状态栏或 Dynamic Island；浏览器/PWA 使用真实安全区。

### 4.2 日期与 Week Strip

- 标题显示选中日期的 weekday；右侧显示 month/year。
- 七个日期是独立按钮，视觉宽度按 Figma，交互热区至少 44px。
- 当前日期同时通过字重、颜色和下方长刻度表达，不只靠颜色。
- 选择日期写入 URL：`/daily?date=YYYY-MM-DD`。
- URL 缺失时使用 fixture 默认日期；无效日期回退默认值。
- 浏览器前进/后退恢复选择。
- 第一切片只实现 Week Strip 日期切换。Month/year 在没有 Figma 展开态时保持静态文本，不伪造完整月历。

### 4.3 Daily Echo

- 350px 宽、22px 圆角、玻璃表面、暖色阴影。
- 标题、装饰弧线、Dot、主摘要和 takeaway 按 Figma 层级实现。
- 第一切片渲染为 `<article>`；Chevron 为装饰且 `aria-hidden`。
- Echo 编辑上线后再把整卡转换为按钮/链接，本轮不创建无效 CTA。

### 4.4 Period Moves

- Section header 显示 `Period Moves` 和真实数组长度。
- 复用 `MoveCardSurface`；Daily 版本为只读。
- 0 条时显示简洁空态和下一步说明，不显示数字 0 徽标。
- 1、2、超长文字时布局不破版。

### 4.5 Daily Summary 与 Today’s Traces

- Daily Summary 卡片包含来源、日期、主体、分隔线、TAKE AWAY。
- Today’s Traces 保留时间列、正文和类型 chip。
- Trace 列表用语义 `<ol>`/`<li>`；时间使用 `<time>`。
- 空 traces 与无 summary 分开表达，不合并成模糊空态。

### 4.6 滚动结构

- 页面根节点使用 `h-dvh`，内容区 `min-h-0 overflow-y-auto`。
- 顶栏与日期区随内容滚动或按 Figma固定关系实现；底栏固定在根布局末端。
- 底栏不得遮挡最后一个内容块；滚动区底部预留安全距离。
- 初始渲染 `scrollTop = 0`，不自动滚到底部。

### 完成标准

- 390×844 首屏与节点 `102:15348` 的层级、间距、背景、底栏一致。
- 可以滚动看到长页面参考中的全部区块。
- 日期切换、URL 状态和空态均可操作。

## 阶段 5：路由与文档

### 路由

在 `src/router/index.tsx` 新增：

```tsx
{ path: '/daily', element: <DailyPage /> }
```

在 `HomeRedirect` 中：

- 已登录 mock session → `/daily`
- 未登录 → `/login`

保留 `/chat` 与 `/debug`。

### README

更新：

- 路由表新增 `/daily`。
- `/` 登录后默认进入 Daily。
- Daily 当前为本地 mock 首页。
- Echo 设置、日历同步、提醒、持久化和业务 API 尚未实现。
- Figma 与 `DESIGN.md` 是视觉来源。

### 完成标准

- 直接访问、刷新、前进/后退 `/daily` 和 `/chat?session=...` 均正常。
- README 不声称任何未实现能力。

## 阶段 6：验证

### 自动检查

```bash
npm run format:check
npm run typecheck
npm run lint
npm run build
```

四项必须无 warning、无 error。

### 浏览器矩阵

| 场景          | 必查项                                     |
| ------------- | ------------------------------------------ |
| 375×812 light | 无横向溢出、日期可点、卡片完整、底栏不遮挡 |
| 390×844 light | 与 Figma 主节点逐项比较                    |
| 390×844 dark  | anatomy、对比度、底栏和资产可见            |
| 1280×900      | 390px 画布居中，外层背景正确               |
| 键盘          | Tab 顺序、日期选择、History、Esc、焦点返还 |
| 长内容        | Move、Summary、Trace 不裁切                |
| 空数据        | Echo、Moves、Summary、Traces 状态各自正确  |

### Coach 回归

- `/chat` 初始 Focus 卡片仍在顶部，不被自动滚动卷走。
- 输入框和 Inspiration 选项可用。
- Move 接受/编辑/跳过可用。
- 共用底栏尺寸和背景没有回归。
- Daily 打开历史并选择会话后，Coach 展示对应消息。

### 最终完成标准

- Figma 主节点中的 Daily 首页结构全部实现。
- 第一切片没有 Echo 设置半成品。
- `/` 已登录后进入 `/daily`。
- Daily 和 Coach 共用底栏与历史弹层。
- 四项仓库命令通过。
- 375px、390px、桌面和两种主题均通过截图与交互验证。

## 停止条件

只有出现以下情况才暂停并询问：

1. Figma 资产或关键节点无访问权限，且本地没有可验证的等价资产。
2. 当前未提交改动与计划修改同一代码段，无法确认哪一份应保留。
3. Daily 的实际后台合同被提供，且与“本地 mock”范围冲突。
4. 用户要求把第二切片 Echo 设置合并进首轮。
5. 共用 History 的选择行为不再是 `/chat?session=<id>`。

除此之外，按计划做合理假设并继续，不因命名或轻微实现细节阻塞。

## 第二切片入口

第一切片交付后，另开任务实现：

1. Echo 设置入口从 Daily Echo 卡片启用。
2. 设置页、时间、重复规则和启停状态。
3. Repeat Menu 两种状态。
4. 本地草稿、取消、保存和恢复。
5. 后端合同仍缺失时不实现真实提醒或持久化。

第二切片开始前重新读取其 Figma 节点并单独写执行计划，不在第一切片中预埋无用抽象。
