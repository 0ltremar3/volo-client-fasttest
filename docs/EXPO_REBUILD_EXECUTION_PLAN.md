# Expo 官方模板重建与迁移执行计划

> 编制日期：2026-08-27  
> 源项目：`/Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest`  
> 建议目标：`/Users/ryuchiang/Documents/ChatGPT/volo-client-expo`  
> 基线：Expo SDK 57 官方 `default` 模板

## 0. 新窗口启动提示

把下面这段直接粘贴到一个新 Codex 窗口中：

```text
请按以下执行计划推进 Expo 重建，不要在旧仓库上原地改造：
/Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest/docs/EXPO_REBUILD_EXECUTION_PLAN.md

源仓库是：
/Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest

目标 sibling 目录是：
/Users/ryuchiang/Documents/ChatGPT/volo-client-expo

执行约束：
1. 先完整阅读计划、源仓库 AGENTS.md、README.md，以及目标模板生成的 AGENTS.md。
2. 源仓库有未提交改动，必须当成只读迁移来源；不得 reset、checkout、stash、commit、删除或格式化源仓库文件。
3. 如果目标目录已存在，立即停止并报告，不得覆盖或删除。
4. 使用 2026-08-27 官方推荐的 default@sdk-57 模板；不要把 Vite、React Router、Tailwind/shadcn、DOM 组件搬进 Expo。
5. 每次只完成计划中的一个阶段，运行该阶段验收后再继续；保持小而可回退的提交。
6. 不 invent 后端字段、认证方式或流式事件。OpenAPI、认证和 streaming 合同缺失时只保留明确标注的 seam 或占位，不伪造实现。
7. 迁移的是产品规则、语义 Token、纯模型、状态流和 API 约束；原生 UI 必须用 React Native/Expo 重新实现。
8. 先让官方模板在 web 和当前可用的原生目标上原样运行，再开始迁移。

开始时先给我：源状态摘要、目标目录检查、将执行的阶段 1 清单。然后直接执行；遇到计划列出的停止条件再询问。
```

## 1. 总体决策

采用“新项目 + 受控迁移”，不做“在 Vite 项目里逐包替换”的原地改造。

原因：当前项目的运行层、导航层、样式层和大部分 UI 都绑定浏览器；直接改造会同时处理 Metro、React Native、Expo Router、CSS/DOM 清除和产品迁移，无法判断失败来自基线还是业务代码。独立目标目录可以把官方模板作为可验证基准，旧项目保持可运行、可比对、可回退。

迁移原则：

1. 先证明 Expo 官方基线能运行。
2. 迁移语义和行为，不复制浏览器实现。
3. 纯 TypeScript 先迁；平台适配后迁；像素细节最后迁。
4. 每加入一层，只从上一层的绿灯状态前进。
5. 旧项目在整个迁移期间只读。

## 2. 已确认的当前状态

### 源项目

- 当前分支为 `main`。
- 工作树有 17 个已修改/删除文件，另有 `src/assets/`、`src/features/coach/` 未跟踪内容。
- 当前是 React 19 + Vite + React Router + Tailwind CSS + shadcn/Radix + TanStack Query + Orval。
- 没有真实业务 REST、认证合同或 AI streaming 协议。
- Coach 产品流已有本地交互：welcome、schedule、home、conversation、Move、summary、history、new conversation。
- 主要实现集中在 `src/features/coach/coach-experience.tsx`，约 711 行；Prompt Bar 的 DOM 实现约 718 行。

### Expo 官方基线

已实际运行以下命令检查模板结构：

```bash
npx create-expo-app@latest <temp-dir>/expo-baseline --template default@sdk-57 --no-install --yes
```

2026-08-27 的模板包含：

- Expo `~57.0.17`
- React Native `0.86.3`
- React `19.2.3`
- Expo Router `~57.0.17`
- 严格 TypeScript、`@/*` alias
- React Compiler 开启
- `src/app` 文件路由
- `react-native-safe-area-context`
- web 静态输出
- 自动生成的 Expo 版本化 `AGENTS.md`

SDK 57 是本计划的固定基线。迁移中不要因 `latest` 变化而静默升级 SDK。

## 3. 迁移矩阵

| 当前资产                                                                 | 处理方式       | 目标形态                                      |
| ------------------------------------------------------------------------ | -------------- | --------------------------------------------- |
| `AGENTS.md` 中关于后端合同、状态归属、mock、安全、移动端与可访问性的规则 | 迁移并改写     | 与模板生成的 SDK 57 规则合并                  |
| `README.md` 中产品能力和“尚未实现”声明                                   | 迁移           | Expo 运行、环境变量、路由和验证文档           |
| `tokens.css` 与 light/dark 语义颜色                                      | 迁移语义和值   | 强类型 TypeScript Token 和主题对象            |
| Coach 类型、mock data、纯日期格式函数                                    | 优先迁移       | `src/features/coach/model/`                   |
| Coach 阶段与动作关系                                                     | 迁移行为       | 无第三方状态库的 `useReducer` 深模块          |
| QueryClient 的默认策略                                                   | 迁移思路       | 根 layout 中的 Query provider                 |
| `ApiError`、统一请求入口、Orval generated 只读约束                       | 迁移思路并改写 | Expo 环境变量 + native/web fetch mutator      |
| OpenAPI 为 REST 单一事实源                                               | 原样保留       | `orval.config.ts` + `src/api/generated/`      |
| streaming 必须先核对真实协议                                             | 原样保留       | 无协议前不实现 wire adapter                   |
| Coach 文案、信息层级、旅程顺序                                           | 迁移           | React Native screens/modules                  |
| Orb 的 SVG、渐变和动效意图                                               | 作为设计源迁移 | PNG/Expo Image 或经验证后的 vector 方案       |
| Beautiful UI attribution                                                 | 保留           | 若使用派生代码，保留 notice 和源头说明        |
| `main.tsx`、`index.html`、Vite 配置                                      | 不迁移         | Expo Router entry/Metro 取代                  |
| React Router route guard                                                 | 不迁移实现     | Expo Router `Stack.Protected` 重建            |
| `lib/theme.ts` 的 DOM/localStorage 操作                                  | 不迁移实现     | `useColorScheme` + ThemeProvider；持久化后议  |
| Tailwind class、shadcn/Radix DOM controls                                | 不迁移实现     | `StyleSheet` + React Native primitives        |
| Prompt Bar 的 DOM 测量、HTML refs、document listeners                    | 不迁移实现     | 原生 composer 从产品行为重建                  |
| HTML dialog、input/date/time、textarea                                   | 不迁移实现     | Modal、TextInput、Pressable 和原生选择器      |
| `sessionStorage` mock auth                                               | 不迁移实现     | dev-only 内存 session；真实合同后再安全持久化 |
| `@fontsource`、`lucide-react`                                            | 不迁移         | `expo-font` 和统一原生 icon wrapper           |
| CSS keyframes、media query、safe-area CSS                                | 不迁移实现     | RN animation、AccessibilityInfo、SafeAreaView |

## 4. 目标目录蓝图

只让 `src/app` 持有路由文件；业务实现放在 feature modules 中。

```text
volo-client-expo/
├── assets/
│   ├── fonts/
│   └── images/coach/
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # providers + protected route selection
│   │   ├── login.tsx
│   │   └── (app)/
│   │       ├── _layout.tsx          # native app shell
│   │       ├── index.tsx            # Coach route entry
│   │       └── debug.tsx            # dev-only, no secret output
│   ├── api/
│   │   ├── client.ts
│   │   └── generated/.gitkeep
│   ├── components/
│   │   └── ui/                      # small native base controls
│   ├── features/
│   │   ├── auth/
│   │   │   ├── session-provider.tsx
│   │   │   └── mock-auth.ts
│   │   └── coach/
│   │       ├── model/
│   │       │   ├── types.ts
│   │       │   ├── mock-data.ts
│   │       │   └── formatters.ts
│   │       ├── state/
│   │       │   └── coach-flow.ts
│   │       ├── components/
│   │       ├── screens/
│   │       └── coach-experience.tsx
│   ├── providers/
│   │   └── query-provider.tsx
│   └── theme/
│       ├── tokens.ts
│       ├── themes.ts
│       ├── theme-provider.tsx
│       └── navigation-theme.ts
├── .env.example
├── AGENTS.md
├── README.md
├── orval.config.ts
└── package.json
```

这不是要求一次创建所有目录。只有对应阶段真正有代码时才创建。

## 5. 分阶段执行

### 阶段 1：建立不可污染的官方运行基线

目标：在完全不读取旧 UI 代码的情况下，证明官方模板可安装、可检查、可打包、可运行。

1. 检查源和目标：

   ```bash
   git -C /Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest status --short
   test ! -e /Users/ryuchiang/Documents/ChatGPT/volo-client-expo
   ```

   若目标已存在，停止。不要删除或覆盖。

2. 创建目标：

   ```bash
   npx create-expo-app@latest /Users/ryuchiang/Documents/ChatGPT/volo-client-expo --template default@sdk-57 --yes
   ```

3. 完整阅读目标模板生成的 `AGENTS.md`。模板要求使用精确的 SDK 57 文档；保留这条规则。

4. 在未改模板前运行：

   ```bash
   cd /Users/ryuchiang/Documents/ChatGPT/volo-client-expo
   npx expo install --check
   npx expo-doctor
   npx tsc --noEmit
   npx expo export --platform all
   ```

5. 实际启动可用平台：

   ```bash
   npm run web
   npm run ios
   npm run android
   ```

   web 必须实跑。iOS/Android 只在本机工具链可用时实跑；不可用时记录环境限制，不得声称通过。先用 Expo Go 验证纯 JS 基线；只有出现自定义原生依赖或配置时才转 development build。

验收：

- 模板原样通过依赖检查、doctor、TypeScript 和 production export。
- 至少 web 可打开，无红屏。
- 记录 SDK、React Native、React、Expo Router 的确切版本。
- 不改源仓库。

建议提交：`chore: establish Expo SDK 57 baseline`

### 阶段 2：清理示例并合并项目规则

目标：保留官方运行层，移除教程产品层，建立新的项目约束。

1. 只在新目标里使用模板自带的 `reset-project`。选择把示例移动到 `example/`，不要立刻删除，直到最小新 app 能启动。
2. 建立最小 `src/app/_layout.tsx` 和 `src/app/index.tsx`，只显示可识别的 baseline screen。
3. 合并 `AGENTS.md`：
   - 保留模板“阅读 SDK 57 版本化文档”的规则。
   - 从旧规则迁移：OpenAPI 单一事实源、generated 只读、Query 管 server state、mock 仅开发、不得猜 auth/streaming、不得暴露 secret、移动端和可访问性、README 同步。
   - 删除或改写：Vite、React Router、shadcn/Radix、Beautiful UI Web primitive、CSS theme、375px DOM viewport 等 Web 专属要求。
   - 新增：Expo Router、React Native primitives、SafeArea、KeyboardAvoiding、Android back、动态字体、light/dark、iOS/Android/web 三端验收。
4. 配置 ESLint Flat config：首次运行 `npx expo lint` 让 Expo CLI 安装匹配依赖并生成配置。
5. 迁移 Prettier 规则时使用 Expo 官方安装方式，不复制旧 ESLint 依赖树。
6. 更新 README 为 Expo 当前事实，不描述尚未迁移的产品能力。

验收：最小 screen 在 web 和可用原生目标运行；lint、typecheck、export 通过；README 与真实能力一致。

建议提交：`chore: align Expo project rules and tooling`

### 阶段 3：迁移 Token 与主题，不迁移 CSS

目标：先建立可以被所有原生 UI 消费的稳定语义接口。

1. 把旧 CSS Token 分三类转成数字/字符串对象：
   - primitives：spacing、font size、line height、radius、duration。
   - semantic themes：background、surface、text、border、primary、success、warning、danger、Coach-specific colors。
   - platform values：shadow、font family、gradient/background treatment。
2. 保留以下已验证的关键值：
   - touch target `44`
   - page padding `16`，宽屏 `24`
   - body `15`，caption `12`
   - light/dark 的语义颜色和 Coach 专属颜色
   - motion `120/200/360ms`
3. 不直接搬运以下 CSS：`rem`、`clamp()`、`color-mix()`、CSS variables、media queries、box-shadow、linear-gradient。将其预计算或放进平台实现。
4. `ThemeProvider` 的小接口只暴露：当前 mode、resolved theme、tokens、切换动作。默认跟随系统主题。
5. 不用 `document`、`localStorage` 或 `sessionStorage`。主题偏好不是 secret；如果本阶段确实需要持久化，再选择非敏感偏好存储，不要滥用 SecureStore。
6. 将主题映射到 Expo Router/React Navigation 的 `ThemeProvider`，保证导航背景和 screen 背景一致。
7. 先做一个 theme showcase screen 验证所有语义色、文字层级、按钮和输入框，再迁产品页。

验收：light/dark 在 iOS、Android、web 可切换或跟随系统；没有裸 palette 值散落在 screen；所有 touch control 至少 44×44。

建议提交：`feat: add cross-platform theme foundation`

### 阶段 4：建立 providers 与路由壳

目标：建立小而稳定的运行 seam，不带业务接口猜测。

1. 安装 TanStack Query；不要搬旧 lockfile：

   ```bash
   npx expo install @tanstack/react-query
   ```

2. 迁移 QueryClient 策略：query stale time 30 秒、query retry 1、mutation retry 0。`refetchOnWindowFocus` 的 Web 语义不直接等同 native；先关闭，后续只有在真实需求出现时再用 AppState 适配 focusManager。
3. 根 layout 中组合：SafeArea/必要的 framework provider、Theme、Query、Auth session、Expo Router Stack。避免多层 pass-through provider。
4. 使用 Expo Router `Stack.Protected` 表达 login 与 app route 的可访问性。它只是客户端导航保护，不是后端授权。
5. 暂时不要引入 tabs。当前产品只有一个主要 Coach 体验和 debug，不需要模板的导航复杂度。

验收：无 session 时到 login；mock session 后到 `(app)`；状态切换会清理不可访问 route history；deep link 到受保护页会回到 login。

建议提交：`feat: add app providers and protected routes`

### 阶段 5：迁移纯 Coach 模型和状态流

目标：先迁移不依赖 React DOM/React Native 的产品核心。

1. 从旧 `coach-model.ts` 迁移：`CoachMessage`、`CoachSession`、`CoachSchedule`、mock sessions、opening message、Move copy、日期/时间 formatter。
2. 把 `CoachScreen` 改名为更准确的 `CoachPhase`，保留五个阶段：welcome、schedule、home、conversation、summary。
3. 把当前散布的 `useState` 收敛为纯 `coachReducer`，至少覆盖：
   - 开始/取消 scheduling
   - 更新/确认 schedule
   - 开始/重置 conversation
   - 用户发送本地消息
   - mock reply 完成
   - Move suggested/edit/accept/skip/save
   - 打开历史 session
   - 进入/离开 summary
4. 不引入 XState、Redux 或 Zustand。这个 flow 目前足以用一个 reducer 形成深模块。
5. timer 属于 local mock implementation，不写进产品模型，也不伪装成 streaming event。
6. 不把每个瞬态 phase 都强行做成 route。先把 Coach 当作一个产品 flow；只有明确需要 deep link、恢复或原生 back history 的阶段再提升为 route。

验收：纯 reducer 可以无 UI 演示完整旅程；重置会清除 reply/move/session 临时状态；没有 `window.setTimeout`。

建议提交：`feat: migrate coach model and flow`

### 阶段 6：按旅程重建原生 UI

目标：每次只重建一个可完成的纵向切片，不复制 711 行 Web 组件。

顺序：

1. App shell + Coach header
2. Welcome
3. Schedule
4. Home + session card
5. Conversation + message bubbles
6. Move card
7. Summary
8. History modal/screen

每个切片都必须：

- 使用 `View`、`Text`、`Pressable`、`TextInput`、`ScrollView/FlatList`、`Modal` 等原生 primitive。
- 消费 theme tokens，不使用 Tailwind class 或 CSS variable。
- 覆盖 empty/loading/error/disabled 状态中实际存在的部分。
- 处理 safe area、键盘、Android back、动态字体、长文本、窄屏和横屏。
- 使用 `accessibilityRole`、`accessibilityLabel`、明确 focus/disabled state。
- 把 platform-specific 视觉差异留在小 adapter 或 `.ios/.android/.web` 文件中，不复制整页。
- 每个 screen module 尽量低于约 250 行；共享产品行为放深模块，避免把旧 monolith 原样分文件。

Orb：

- 旧 SVG 是设计参考，不是可直接 import 的 RN 组件。
- 先做一个 asset spike：优先把静态层导出为本地 PNG，交给模板已带的 `expo-image`；只在 PNG 明显不满足缩放/动画时才增加 vector 依赖。
- speaking/listening 动效只改变 transform/opacity；系统减少动态效果时停用非必要循环动画。

验收：每完成一个切片就在 light/dark、web、iOS/Android 可用目标验证；不能等所有页面搬完才首次运行。

建议按切片独立提交，例如：`feat: rebuild coach welcome for Expo`

### 阶段 7：重建 Composer，不移植 Prompt Bar DOM

目标：先交付真实需要的输入与发送，再恢复可证实的增强功能。

1. 第一版接口保持小：`value/draft` 由内部管理、`onSend(text)`、placeholder、sending/disabled。
2. 使用 `TextInput` 多行、自适应合理上限、`Pressable` send、`KeyboardAvoidingView` 和 safe-area bottom inset。
3. 当前 `@source`、slash command、model menu 都是 demo capability；后端没有支持前不要暗示真实可用。可保留为显式 mock，或暂不迁移。
4. 如果恢复菜单，用原生 Modal/Popover-like sheet + FlatList，实现键盘/读屏选择；不要重做 DOM offset 测量和 document 事件。
5. 若代码或视觉明显派生自 Beautiful UI，迁移 `THIRD_PARTY_NOTICES.md` 并在源文件保留 attribution。若只根据产品需求全新实现，也在迁移记录中说明判断。

验收：软键盘不遮挡 composer；发送、换行、禁用、loading、长文本、screen reader label 可用；没有 HTML element refs。

建议提交：`feat: rebuild native coach composer`

### 阶段 8：Mock auth 与字体/图标

Mock auth：

- 环境变量改为 `process.env.EXPO_PUBLIC_MOCK_MODE`，必须使用 dot notation。
- 开关必须同时满足 `__DEV__`，避免 production bundle 静默启用 mock。
- 不持久化密码。第一版 mock session 可只放内存，重启 app 后重新登录。
- 真实 auth 合同出来前，不添加 bearer、cookie、refresh 或 SecureStore 行为。
- 真实 session token 出现后，native 用 SecureStore；web 存储策略必须按后端认证合同决定。

字体：

- 不迁移 `@fontsource`。
- 获取有明确许可的 Playfair Display 字体文件，放入 `assets/fonts/`，使用模板已带的 `expo-font`。
- native 优先 config plugin 嵌入；web 验证 family name 和 fallback。
- 字体没加载前保持 splash 或稳定 fallback，避免布局跳动。

图标：

- 不迁移 `lucide-react`。
- 建一个小 icon wrapper，内部选择模板已有的 Expo icon 能力或一个经验证的跨平台库。
- 不把各平台 icon naming 暴露给 feature screens。

验收：production export 中 mock 不可启用；字体三端一致或有明确 fallback；icon 有 accessible name/隐藏规则。

建议提交：`feat: add Expo mock auth and product assets`

### 阶段 9：恢复 API/Orval seam

目标：迁移 API 纪律，不假装已有业务 API。

1. 添加：

   ```bash
   npm install --save-dev orval
   ```

2. 保留 `OPENAPI_SCHEMA` 为 Node/CLI 环境变量；它不加 `EXPO_PUBLIC_`，也不进入 app bundle。
3. client runtime 只读取 `process.env.EXPO_PUBLIC_API_BASE_URL`。native 没有“same origin”，所以缺失时在开发环境给出清晰配置错误，不沿用 Vite 的空字符串回退。
4. `.env.example` 只列公开配置：

   ```env
   EXPO_PUBLIC_API_BASE_URL=
   EXPO_PUBLIC_MOCK_MODE=false
   ```

5. 继续生成到 `src/api/generated/`，generated 只读。Orval 仍使用 TanStack Query 和统一 mutator。
6. 重写 `apiFetch` 时保留：URL 归一化、JSON header、204、JSON/text parsing、`ApiError(status,payload)`、AbortSignal。必须在 native 和 web 上实际 smoke test。
7. 不设置 credentials/auth header/refresh。等待后端合同。
8. OpenAPI 未提供时，`generate:api` 继续明确失败；generated 目录只有 `.gitkeep`。
9. Streaming 仍不实现。只有真实 transport/event/cancellation/error/metadata 协议到位后，才定义 UI-facing adapter；不要先发明 SSE/WebSocket 类型。

验收：无 schema 时失败信息明确；有真实 schema 时生成可重复、无手改；feature 不直接 fetch；bundle 不含 secret。

建议提交：`chore: restore OpenAPI and request boundaries`

### 阶段 10：三端验收与依赖收尾

自动验收：

```bash
npx expo install --check
npx expo-doctor
npx expo lint
npx tsc --noEmit
npx expo export --platform all
```

若配置 Prettier，再加格式检查脚本；所有命令必须零 warning 或记录为何由上游造成。

人工矩阵：

| 项目                 | iOS    | Android | Web              |
| -------------------- | ------ | ------- | ---------------- |
| 冷启动/恢复          | 必测   | 必测    | 必测             |
| light/dark           | 必测   | 必测    | 必测             |
| safe area            | 必测   | 必测    | N/A/浏览器 inset |
| keyboard composer    | 必测   | 必测    | 必测             |
| Android back         | N/A    | 必测    | browser back     |
| 375pt/窄屏           | 必测   | 必测    | 375 CSS px       |
| 大字体/长文案        | 必测   | 必测    | 必测             |
| reduced motion       | 必测   | 必测    | 必测             |
| mock auth guard      | 必测   | 必测    | 必测             |
| deep link 到受保护页 | 必测   | 必测    | 必测             |
| production export    | bundle | bundle  | static output    |

最后用 `rg` 查遗留 Web 绑定：

```bash
rg -n "react-router-dom|react-dom|import\.meta\.env|document\.|window\.|sessionStorage|localStorage|HTMLElement|HTML[A-Za-z]+Element|className=|@radix|tailwind|lucide-react|@fontsource" src package.json
```

允许的例外必须是显式 `.web.tsx` adapter，并在代码旁说明原因。

依赖收尾：

- 用 `rg` 证明依赖是否被使用。
- 删除官方 demo 遗留的未使用源文件和依赖，但不要为了“更轻”删除 Expo Router、SafeArea 等运行基础。
- 删除 `example/` 前确认新实现不再需要参考；这是目标项目中的可恢复模板示例，不触碰源仓库。
- 更新 README、环境变量、routes、mock 能力、API generation、已知限制。

建议提交：`test: verify Expo migration across platforms`

### 阶段 11：切换决策

新项目达到以下条件前，不替换旧项目：

- 所有当前 Coach 旅程已覆盖，或差异被明确接受。
- web + 至少一个 iOS 目标 + 一个 Android 目标实际运行。
- 自动验收全绿。
- OpenAPI/auth/streaming 的未决项没有被伪实现。
- attribution、字体和资产许可已检查。
- README 与项目事实一致。

然后由用户选择：

1. 保留新项目为独立 repo，并把 remote/CI/部署转过去；推荐。
2. 把新项目的提交历史整合回原 repo；需要单独的 Git cutover 计划。
3. 暂时双轨运行，旧项目只用于视觉回归。

不要在本迁移任务里擅自重命名目录、删除旧仓库、改 remote、发布应用、创建 EAS 项目或提交商店。

## 6. 停止条件

遇到以下任一情况，停止当前阶段并报告，不做猜测：

- 目标目录已经存在。
- 源仓库在迁移过程中发生新的改动，且与正在迁移的同一资产重叠。
- Expo 官方 SDK 57 模板无法原样通过 doctor/export。
- 需要真实 OpenAPI、auth、streaming 合同才能继续。
- 需要增加 native dependency，但 Expo Go/SDK 57 兼容性未经验证。
- 需要修改 app scheme、bundle identifier、权限、entitlements 或 EAS 账户状态。
- 字体或 Beautiful UI/资产的许可与派生关系不清楚。
- 三端行为必须做出不可逆产品决策，例如是否把 Coach phase 提升为 deep-link route。

## 7. 完成定义

这次重建完成，不是指“页面看起来差不多”，而是同时满足：

- 运行层来自未经污染的 Expo SDK 57 官方模板。
- 旧仓库只作为可追溯参考，未被破坏。
- 语义 Token、产品旅程、纯模型和 API 纪律已迁移。
- 浏览器实现已被原生实现替换，而非通过兼容层硬塞进 RN。
- 不存在假认证、假 API、假 streaming 能力。
- iOS、Android、web 的真实验证结果被记录。
- 新 README、AGENTS、环境变量和命令与实际项目一致。

## 8. 官方参考

- [create-expo-app 与模板选择](https://docs.expo.dev/more/create-expo/)
- [创建 Expo 项目](https://docs.expo.dev/get-started/create-a-project/)
- [SDK 57 版本化文档](https://docs.expo.dev/versions/v57.0.0/)
- [Expo 环境变量](https://docs.expo.dev/guides/environment-variables/)
- [Expo Router Protected Routes](https://docs.expo.dev/router/advanced/protected/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/)
- [Expo SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Expo ESLint/Prettier](https://docs.expo.dev/guides/using-eslint/)
- [Expo CLI：install、doctor、export](https://docs.expo.dev/more/expo-cli/)
