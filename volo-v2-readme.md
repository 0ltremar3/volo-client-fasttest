# Volo V2 本地全栈运行说明

本文说明如何在本机运行 Volo V2 前端与真实 EverEcho 后端，并区分以下三种模式：

| 模式               | 前端数据            | 后端   | AI                  | 适用场景           |
| ------------------ | ------------------- | ------ | ------------------- | ------------------ |
| Mock               | 本地 fixture        | 不需要 | 不需要              | 纯 UI 开发         |
| 真实 API + Fake AI | PostgreSQL / V2 API | 真实   | 确定性假实现        | 推荐的全栈联调起点 |
| 真实 API + 真实 AI | PostgreSQL / V2 API | 真实   | Mastra + 模型供应商 | 最终 AI 行为验证   |

## 1. 当前 5173 是什么模式

当前前端 `.env.local` 为：

```env
VITE_API_BASE_URL=
VITE_MOCK_MODE=true
```

因此当前 `http://127.0.0.1:5173` 是 **Mock 模式**：使用 `demo@example.com` / `demo1234`，不会请求 Volo V2 后端。

Vite 只在进程启动时读取环境变量。修改 `.env.local` 后必须停止并重新运行前端，刷新浏览器不够。

## 2. 仓库与前置条件

本机仓库：

```text
前端 /Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest
后端 /Users/ryuchiang/Documents/ryuCodeLand/EverEcho-workspace/EverEcho-backend
```

需要：

- Node.js 22.x
- pnpm 10.x（后端）
- npm（前端）
- PostgreSQL 16，或 Docker Desktop

所有浏览器和 API 地址建议统一使用 `127.0.0.1`，不要混用 `localhost`，以免 Better Auth cookie 的站点上下文不一致。

## 3. 推荐路径：真实 API + Fake AI

该模式使用真实登录、数据库、Coach、Daily、Echo、Review 和 SSE API，但不调用外部模型。先用它确认全栈链路，再切换真实 AI。

### 3.1 启动 PostgreSQL

后端 Docker Compose 的数据库映射到宿主机 `5433`：

```bash
cd /Users/ryuchiang/Documents/ryuCodeLand/EverEcho-workspace/EverEcho-backend
docker compose up -d db
```

对应连接串：

```env
DATABASE_URL=postgres://everecho:everecho@127.0.0.1:5433/everecho
```

也可以使用已经运行的本机 PostgreSQL，只要替换成实际连接串。

### 3.2 配置后端

后端会先加载 `.env`，再加载并覆盖 `.env.development`。本地开发应编辑 gitignored 的 `.env.development`；不要只改 `.env`，也不要提交任何环境文件。

最低配置示例：

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=debug

DATABASE_URL=postgres://everecho:everecho@127.0.0.1:5433/everecho
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://127.0.0.1:8000

EMAIL_PROVIDER=console
EMAIL_FROM=EverEcho <login@example.com>

AI_PROVIDER=fake
LANGFUSE_ENABLED=false
LANGFUSE_PROMPT_SOURCE=code
```

`EMAIL_PROVIDER=console` 会把六位登录验证码打印到后端终端，仅用于本地开发。

安装依赖、应用 V2 migration 并启动：

```bash
cd /Users/ryuchiang/Documents/ryuCodeLand/EverEcho-workspace/EverEcho-backend
pnpm install
pnpm db:migrate
pnpm dev
```

验证后端：

```bash
curl http://127.0.0.1:8000/v1/health
```

预期：

```json
{ "ok": true, "service": "everecho-api" }
```

### 3.3 配置真实前端

将前端 `.env.local` 改为：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MOCK_MODE=false
```

停止旧的 Vite 进程，再重新启动：

```bash
cd /Users/ryuchiang/Documents/ChatGPT/volo-client-fasttest
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

打开 `http://127.0.0.1:5173/login`。真实模式不显示 Mock mode 卡片，登录流程为：

1. 输入任意本地测试邮箱，点击 `Send code`。
2. 回到后端终端，找到 `[EverEcho] email login code ...` 日志。
3. 输入六位验证码，点击 `Sign in`。
4. 登录后应进入 `/daily`，Coach 使用 `/v2/coach/*`，Daily Echo 使用 `/v2/daily/echo/*`，Review 使用 `/v2/review*`。

前端请求已经设置 `credentials: include`；开发后端允许来自 `127.0.0.1` 和 `localhost` 任意端口的 credentialed CORS 请求。

## 4. 切换到真实 AI

先确保第 3 节全部可用，再修改后端 `.env.development`：

```env
AI_PROVIDER=mastra
AI_MODEL_PROVIDER=openrouter
AI_MODEL=your-provider-model-id
OPENROUTER_API_KEY=your-key

# 可选：只为 Free Coach / Volo Coach 指定模型；两个值必须一起设置
FREE_COACH_AI_MODEL_PROVIDER=openrouter
FREE_COACH_AI_MODEL=your-coach-model-id

AI_REQUEST_TIMEOUT_MS=180000
LANGFUSE_ENABLED=false
LANGFUSE_PROMPT_SOURCE=code
```

也可使用 OpenAI、Anthropic、Google/Gemini、DeepSeek、Qwen、GLM 或 Bedrock。按所选 `AI_MODEL_PROVIDER` 配置对应 key，不要把任何 key 写入 `VITE_*`；`VITE_*` 会被打包进浏览器。

真实 Volo Coach 依赖后端仓库中的：

```text
skills/transformational-coach/SKILL.md
```

该 skill 缺失、模型不支持所需工具或模型调用失败时，Volo Coach 会 fail closed，不会静默退回 fake AI。

修改后重启 `pnpm dev`。可在浏览器 Network 中确认 `/v2/coach/sessions/:id/messages/stream` 返回 SSE，而不是前端 fixture。

## 5. Docker 后端替代方案

如需让数据库、migration 和 API 全部运行在 Docker：

```bash
cd /Users/ryuchiang/Documents/ryuCodeLand/EverEcho-workspace/EverEcho-backend
cp .env.docker.example .env.docker
```

本地前端从 `5173` 跨域访问 Docker API 时，`.env.docker` 至少设置：

```env
NODE_ENV=development
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://127.0.0.1:8080
EMAIL_PROVIDER=console
AI_PROVIDER=fake
LANGFUSE_ENABLED=false
```

这里使用 `NODE_ENV=development` 是为了启用本地 credentialed CORS。生产部署不应照搬此设置，应通过同源反向代理或明确的生产 CORS 策略提供前端。

启动：

```bash
docker compose up --build
curl http://127.0.0.1:8080/v1/health
```

此时前端 `.env.local` 使用：

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_MOCK_MODE=false
```

修改后同样需要重启 Vite。

## 6. 如何确认没有误跑 Mock

检查以下项目：

- 登录页没有 `Mock mode`、测试邮箱和测试密码提示。
- 浏览器 Network 中出现 `http://127.0.0.1:8000/v1/me` 或 Docker 的 `:8080/v1/me`。
- `/v2/coach/home`、`/v2/daily`、`/v2/review` 返回后端数据。
- 新建或完成会话后刷新页面，数据仍然存在。
- 后端终端能看到对应 HTTP 请求；真实 AI 模式还能看到模型与 SSE 相关日志。

## 7. 常见问题

### 页面仍显示 Mock mode

- 确认 `.env.local` 是 `VITE_MOCK_MODE=false`。
- 完全停止并重启 Vite。
- 确认启动命令的工作目录是前端仓库根目录。

### 请求打到 5173 并返回 404

`VITE_API_BASE_URL` 为空时，请求会走同源 `5173`。将它设置为实际后端地址并重启 Vite。

### Network Error 或 CORS 错误

- 本地 API 必须使用 `NODE_ENV=development`。
- 前端和后端统一使用 `127.0.0.1`。
- 确认后端端口与 `VITE_API_BASE_URL` 一致。
- 先用 `/v1/health` 排除后端未启动问题。

### 登录后立即回到 `/login`

- 后端合同是 `Authorization: Bearer <token>`，token 来自 `POST /v1/auth/sign-in/email-otp`。只带 cookie 不够：从 `localhost:5173` 调 `127.0.0.1:8000` 时，后续 `/v1/me` 会 401 并被踢回登录页。
- 确认前端把 sign-in 返回的 `token` 存下来，并在 REST / SSE 请求里带上 Bearer。
- 确认 `BETTER_AUTH_URL` 与浏览器访问的 API 基址完全一致。
- 确认响应没有被 CORS 拦截。

### 数据刷新后消失

- 确认配置了 `DATABASE_URL`。
- 确认已运行 `pnpm db:migrate`。
- 未配置数据库时后端会回退到内存存储，只适合临时联调。

### Coach 有界面但消息失败

- `AI_PROVIDER=fake`：检查后端请求日志和 session 状态。
- `AI_PROVIDER=mastra`：检查模型 key、模型 ID、请求超时和 `transformational-coach` skill。
- 如果启用了 Langfuse，再检查 prompt source、label 和 Langfuse 凭据；本地首轮联调建议先禁用 Langfuse。

## 8. 推荐启动顺序

每次全栈联调按此顺序：

1. PostgreSQL / Docker db
2. `pnpm db:migrate`
3. 后端 `pnpm dev`
4. `curl /v1/health`
5. 前端 `npm run dev`
6. 邮箱 OTP 登录
7. 依次验证 Daily → Coach → Done → Into Your Day → Review
