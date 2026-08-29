> 版本：v1.0 更新日期：2026-08-17

## 1. 产品架构

特性功能列表

[volo feature list](https://dcnu58u4g20w.feishu.cn/base/OsGmbjEnPaHfruscenic5x6Ynub?from=from_copylink)

### 1.1 信息架构

Volo 是一款 Life Coach 类产品，通过智能体与人的对话，慢慢引导用户找到自己想要的方向和结果。产品底部 Tab 导航包含 4 个主模块，账户中心从右上角入口进入。

### 1.2 功能模块总览

| 模块                   | 核心价值                                            | 主要功能                                                     |
| :--------------------- | :-------------------------------------------------- | :----------------------------------------------------------- |
| **Coach**              | 通过对话引导用户思考，产出可执行的 Move             | 即时对话、预约对话、对话中 Move 卡片、结束话题确认与编辑     |
| **Daily**              | 每日记录 + AI 洞察，沉淀日常成长                    | 日常输入（硬件）-先不做、AI 洞察生成、Period Moves 三态切换  |
| **Review**   | 从历史对话中提取 Take aways，回顾历史话题和成长轨迹 | 按日期展示 Coach 记录、对话详情（主标题+副标题）、Take aways 查阅 |
| **账户中心**（先不做） | 个人信息与偏好管理                                  | 个人资料、通知设置、隐私设置                                 |

## 2. Coach 模块详细设计

### 2.1 用户故事

- **US-CO-01**：作为用户，我可以随时进入 Coach 模块开始一段对话，智能体会先询问我是否需要预约一个时间沉浸式地 Coach，我可以选择即时开始或预约时间。
- **US-CO-02**：作为用户，在对话过程中，智能体会根据我的回答情况结合当前话题，适时给出 Move 卡片供我确认，不需要等到对话结束。
- **US-CO-03**：作为用户，每次 Coach 结束时，智能体会根据聊天内容建议一个对话标题，我可以确认或手动编辑改写。
- **US-CO-04**：作为用户，如果我已预约了一个话题还没开始，对话框上方会出现预约对话卡片，我可以点进去随时开始，也可以在预约开始前开启另一段对话。

### 2.2 页面与功能说明

#### 2.2.1 对话列表页

#### 2.2.2 对话详情页

**入口：点击底部coach tab即进入对话详情页**

**功能**：

- 预约对话卡片（仅当存在未开始的预约且当前对话不是该预约时显示在消息区顶部）
- 消息区：用户消息（右侧）+ 智能体消息（左侧）
- 底部输入框：支持文字输入 + 发送按钮
- 快捷回复建议（可选）

**预约对话卡片（消息区内）**：

- 位置：消息区顶部，悬浮于消息流之上
- 内容：预约话题标题 + 预约时间 + 「开始」按钮
- 交互：点击「开始」进入该预约的对话详情页
- 说明：用户可以忽略此卡片，继续当前对话或开启其他话题

**Move 卡片**：

- 触发时机：对话过程中，智能体判断用户已对某个 Move 有足够的思考和表达时
- 卡片内容：Move 描述、「确认」按钮、「修改」按钮
- 确认后：该 Move 被标记为已确认，卡片状态变为已确认态，不可再修改，后续在daily中可对move修改
- 修改后：弹出编辑框，用户可修改 Move 内容，提交后重新确认
- move的check机制：move卡片生成后不强制check，用户可自行选择，用户可为单项行动配置循环检查（Check）计划。系统支持按日、按周、按月三种循环模式。每日为自然日全匹配；每周需用户勾选具体星期值（可多选），按自然周循环；每月需用户输入1-28日或选择“月末”，按自然月循环，若遇29-31日不存在则【顺延/跳过】。所有类型均支持在匹配到的日期内设置任意数量的时间点（HH:mm），系统在匹配日期的各个时间点分别触发检查，各时间点独立计算逾期状态，循环无固定次数上限，直至用户主动终止。 

#### 2.2.3 话题确认（对话结束时）

**触发时机**：用户主动结束对话，或智能体判断本次 Coach 目标已达成

**交互流程**：

1. 智能体发送话题建议卡片，包含建议的对话标题
2. 用户可选择：
   1. 「确认」：使用该标题，对话标记为已结束
   2. 「编辑」：弹出输入框，用户手动修改标题，确认后对话结束
   3. 「继续对话」：不结束，回到对话状态

### 2.3 交互流程

#### 流程一：进入 Coach → 选择即时开始或预约

```undefined
用户进入 Coach 模块
    │
    ├─ 存在未开始的预约？
    │   ├─ 是 → 顶部显示预约对话卡片
    │   │       └─ 用户点击「开始对话」→ 进入预约话题的对话
    │   └─ 否 → 不显示预约卡片
    │
    └─ 用户点击「新对话」或选择已有对话
            │
            └─ 智能体首条消息：「你想现在开始，还是预约一个时间沉浸式地聊？」
                    │
                    ├─ 用户选择「现在开始」→ 进入即时对话
                    └─ 用户选择「预约时间」→ 选择日期时间 → 预约成功 → 生成预约卡片
```

#### 流程二：对话中 Move 卡片确认

```undefined
对话进行中
    │
    └─ 智能体判断时机成熟 → 发送 Move 卡片
            │
            ├─ 用户点击「确认」→ Move 标记为已确认 → 卡片变为已确认态
            ├─ 用户点击「修改」→ 弹出编辑框 → 用户修改后提交 → 卡片更新 → 再次确认
            └─ 用户忽略 → 卡片保持待确认态，对话继续
```

#### 流程三：对话结束 + 话题标题确认

```undefined
用户点击「结束对话」或 AI 判断目标达成
    │
    └─ 智能体生成话题建议标题 → 弹出确认卡片
            │
            ├─ 用户点击「确认」→ 对话结束，标题写入记录
            ├─ 用户点击「编辑」→ 编辑标题 → 确认 → 对话结束
            └─ 用户点击「继续对话」→ 返回对话状态，不结束
```

### 2.4 字段说明

#### Coach Session（对话会话）

| 字段         | 类型     | 说明                                                         |
| :----------- | :------- | :----------------------------------------------------------- |
| session_id   | string   | 会话唯一 ID                                                  |
| title        | string   | 对话标题，结束时由 AI 建议 + 用户确认                        |
| status       | enum     | `ongoing`（进行中）/ `completed`（已结束）/ `scheduled`（已预约） |
| scheduled_at | datetime | 预约时间（仅 scheduled 状态有值）                            |
| created_at   | datetime | 创建时间                                                     |
| updated_at   | datetime | 最后更新时间                                                 |
| move_count   | int      | 本次对话中确认的 Move 数量                                   |

#### Move（行动项）

| 字段         | 类型     | 说明                                       |
| :----------- | :------- | :----------------------------------------- |
| move_id      | string   | Move 唯一 ID                               |
| session_id   | string   | 所属会话 ID                                |
| description  | string   | Move 描述                                  |
| status       | enum     | `pending`（待确认）/ `confirmed`（已确认） |
| created_at   | datetime | 创建时间                                   |
| confirmed_at | datetime | 确认时间                                   |

### 2.5 异常处理

| 场景                     | 处理方式                                                     |
| :----------------------- | :----------------------------------------------------------- |
| 网络中断，消息发送失败   | 消息旁显示红色感叹号，点击可重发；已发送的消息本地缓存，恢复后自动同步 |
| 智能体长时间无响应       | 超过 30 秒显示「正在思考...」动画，超过 2 分钟显示「网络似乎有点慢，再等等？」+ 重试按钮 |
| 预约时间已过但用户未开始 | 预约卡片状态变为「已过期」，用户仍可点击开始（转为即时对话），或取消预约 |
| Move 卡片生成失败        | 不影响对话继续，智能体以文字形式继续引导，Move 可在对话结束时统一回顾 |

### 2.6 边界场景

1. **多个预约同时存在**：预约卡片堆叠展示，最新的预约在最上方，支持展开查看全部
2. **预约未开始，用户开启了另一段对话**：预约卡片仍悬浮在当前对话顶部，用户可随时切换
3. **同一段对话中出现多张 Move 卡片**：按出现顺序嵌入消息流，各自独立确认
4. **用户删除一条 Move**：Move 标记为已删除，不再出现在 Daily/Review 中
5. **对话进行中用户直接退出 App**：对话状态保持进行中，下次进入恢复
6. **预约时间到了，用户正在另一段对话中**：推送通知提醒，用户可选择结束当前对话开始预约对话，或忽略
7. **同一段对话中，用户既即时聊又预约了另一个话题**：两者独立，互不干扰

## 3. Daily 模块详细设计

### 3.1 用户故事

- **US-DA-01**：作为用户，我可以每天记录自己的心情和日记并且设定一个固定的冥想echo的固定节点，AI 会帮我生成洞察。
- **US-DA-02**：作为用户，我可以在 Period Moves 中查看当前周期的 Move 任务，每个 Move 有三种 check 状态可选。
- **US-DA-03**：作为用户，Period Moves 只展示我当前 check 的状态，不显示进度条或完成百分比。
- **US-DA-04**：作为用户，我可以随时回看过去某天的 Daily 记录和 AI 洞察。

### 3.2 页面与功能说明

#### 3.2.1 Daily 首页

**入口**：底部 Tab 点击 Daily

**功能**：

- 顶部：日期选择器（默认今天）
- Daily echo：初次使用需设定固定的echo时间，点击进入后进入到light版的coach
- Period moves：通过coach完后生成的move设定循环提醒的时间
- 今日回声DAILY SUMMARY**：**融合两部分的语料产生今天的总结，一是用户通过硬件的日常记录，二是通过daily echo形成的素材
- 今日片段（toady‘s traces)：通过时间轴来展示今日通过硬件记录下来的核心信息

#### 3.2.2 Daily echo

- 计划设定：通过用户首开后提醒用户设定每日的echo时间，此环节需配合外部硬件共同使用，设定的每日循环模式同move的模式一的设定，后面支持用户随时修改echo的既定计划
- 点击daily echo卡片后进入到light版的coach，echo完后不会生成任何的move卡片，也不会生成话题，作为独立的对话界面存在，对话详情页保存所有echo的聊天历史，支持话题的临时退出
- 对话完后会结合当天的外部硬件的日常输入（今日片段）+daily echo 综合形成信息摘录卡片，最上面是今日的总结，下面是今日的take aways

![img](https://dcnu58u4g20w.feishu.cn/space/api/box/stream/download/asynccode/?code=NWEzNGI5MDgzNmUyN2M4ODU3M2Y4YjJlOTZiNWJiZDZfOTlyMFk4Y0xRc3Y4cHFLREFibWZNeFRCWXhpSFFYRHhfVG9rZW46SE9CSWJ1ZHpmb2cwZmp4aW1DRWNHQzhBbkZoXzE3ODc4MTgzMzE6MTc4NzgyMTkzMV9WNA&add_watermark=true&scene_type=CCM)

#### 3.2.3 Period Moves

**展示规则**：

- 展示当前周期内的 Move 任务列表（从 Coach 对话中确认的 Move 同步而来）
- 每个 Move 卡片展示：Move 描述、当前 check 状态
- 卡片的顺序按照临近的日期进行排序
- **不显示进度条、不显示完成百分比、不显示 check 次数**（本版本不做进度功能）

**Move 三态切换**：

- 每个 Move 有三种 check 状态，用户点击切换：
  - 有进展，状态不错：X色
  - 没进展，貌似卡住了：X色
  - 需要调整move：X色
- 点击选择切换check状态
- 当选择需要调整move时，弹窗确认是否需要调整，确认后会进入到生成的move话题对话中，开始coach的新一轮move调整对话
- move的删除：长按或者其他交互形式删除move计划
- 只展示当前状态，不记录历史切换次数

![img](https://dcnu58u4g20w.feishu.cn/space/api/box/stream/download/asynccode/?code=Y2M3OGVmNjY1YmUxMzE5Njc1MDVlOWY1NzM4ZWU3YjlfQzdXejQweFFDNDVuVDJGTDlXSzhGY2dROGlUcUlpMDNfVG9rZW46V3hteGJscXdXb1U5TGx4UVhGcmNvSXYwbkplXzE3ODc4MTgzMzE6MTc4NzgyMTkzMV9WNA&add_watermark=true&scene_type=CCM)

#### 3.2.4 今日片段

- 通过外部硬件的日常碎片化的记录形成以时间为轴的轨迹，展示的片段仅提取核心信息内容

![img](https://dcnu58u4g20w.feishu.cn/space/api/box/stream/download/asynccode/?code=OGMxMzUzYTk4YTg0NzQwMGQ0NDY1MzVjNmVhZTExYjZfYzNMaTlRempJeVpzRnphcHNiejVUUmp1Z3NmTHBiaWRfVG9rZW46SnBoOGJJT0V6b2s5S1F4MzNtYmNKUTBTbjJlXzE3ODc4MTgzMzE6MTc4NzgyMTkzMV9WNA&add_watermark=true&scene_type=CCM)

### 3.3 交互流程

#### 流程一：每日记录 + AI 洞察生成

```undefined
用户进入 Daily 页
    │
    ├─ 设定echo计划 → 自动保存
    ├─ 进入echo → 保存对话记录
```

#### 流程二：Period Moves 状态切换

```undefined
用户查看 Period Moves 列表
    │
    └─ 点击某个 Move 的状态标记
            │
            └─ 状态循环切换：选择状态
                    │
                    └─ 即时保存，无进度统计
```

### 3.4 字段说明

#### Daily Record（每日记录）

| 字段                 | 类型     | 说明                    |
| :------------------- | :------- | :---------------------- |
| record_id            | string   | 记录唯一 ID             |
| date                 | date     | 记录日期（YYYY-MM-DD）  |
| trace                | string   | 记录当天的记录内容      |
| trace_at             | datetime | 记录时间                |
| summery              | object   | AI 总结（关键词、摘要） |
| summery_generated_at | datetime | AI总结生成时间          |
| Take aways           | object   | AI 摘要                 |
| created_at           | datetime | 创建时间                |
| updated_at           | datetime | 更新时间                |

#### Period Move（周期 Move）

| 字段         | 类型   | 说明                                    |
| :----------- | :----- | :-------------------------------------- |
| move_id      | string | Move 唯一 ID（与 Coach 中的 Move 同源） |
| description  | string | Move 描述                               |
| check_status | enum   | 不错/ 卡住了/ 需调整                    |
| period_start | date   | 周期开始日期                            |
| period_end   | date   | 周期结束日期                            |

### 3.5 异常处理

| 场景                   | 处理方式                           |
| :--------------------- | :--------------------------------- |
| 同一天多次生成今日回声 | 覆盖之前的echo结果，以最新一次为准 |
| Today traces内容为空   | 不显示                             |

### 3.6 边界场景

1. **用户当天没有任何硬件记录**：今天留下的片段显示空白状态，引导用户记录
2. **跨天未关闭页面**：零点后自动切换到新的一天，前一天的内容自动保存
3. **Period Moves 为空**：显示空状态，引导用户去 Coach 对话中确认 Move
4. **Move 状态在同一天内多次切换**：只保留最后一次状态，不记录历史
5. **周期结束后 Move 怎么处理**：本版本不处理周期归档，始终展示当前周期的 Move
6. **用户手动添加 Move**：本版本不支持手动添加，Move 只能从 Coach 对话同步

## 4. Review 模块详细设计

### 4.1 用户故事

- **US-RE-01**：作为用户，我可以按日期查看历史 Coach 记录，找到某天的对话。
- **US-RE-02**：作为用户，每条 Coach 记录的主标题是对话确认的主题，副标题是简短的内容总结。
- **US-RE-03**：作为用户，点击一条 Coach 记录进入详情，可以查看完整对话内容和 Take aways。
- **US-RE-04**：作为用户，进入历史对话详情后，顶部没有黑色阶段总结卡片。

### 4.2 页面与功能说明

#### 4.2.1 Review 列表页

**入口**：底部 Tab 点击 Review

**展示规则**：

- **按日期分组展示**，不按话题分组
- 日期倒序排列（最新的在最上面）
- 每个日期下展示当天所有的 Coach 记录

**每条记录展示**：

- **主标题**：对话结束时确认的主题
- **副标题**：对话内容的简短总结（尽量简短，1-2 行）
- 时间：对话结束时间
- Move 数量标签（可选）

#### 4.2.2 对话详情页

**入口**：点击 Review 列表中的任一条记录

**页面结构**：

- 顶部：返回按钮 + 对话标题
- **没有黑色阶段总结卡片**（本版本移除）
- 消息区：完整对话内容（只读）
- Take aways 区域：本次对话中确认的所有 Move 列表
- 底部操作：重新开始类似话题、分享

**Take aways 区域**：

- 列出本次对话中所有已确认的 Move
- 每条 Move 展示标题 + 描述
- 可点击跳转到 Daily 模块的 Period Moves（如关联）

### 4.3 交互流程

#### 流程一：按日期浏览 Coach 记录

```undefined
用户进入 Review 页
    │
    └─ 按日期倒序展示 Coach 记录
            │
            ├─ 日期分组标题（如「今天」「昨天」「8月15日」）
            └─ 每个日期下的对话卡片
                    │
                    └─ 主标题（确认的主题）+ 副标题（简短总结）+ 时间
```

#### 流程二：查看对话详情

```undefined
用户点击一条 Coach 记录
    │
    └─ 进入对话详情页
            │
            ├─ 顶部：返回 + 标题（无黑色阶段总结卡片）
            ├─ 消息区：完整对话内容（只读，可滚动）
            └─ Take aways：本次对话确认的 Move 列表
```

### 4.4 字段说明

#### Coach Record（Review 展示用）

| 字段         | 类型     | 说明                         |
| :----------- | :------- | :--------------------------- |
| session_id   | string   | 会话 ID（与 Coach 模块同源） |
| title        | string   | 主标题：对话结束时确认的主题 |
| summary      | string   | 副标题：对话内容简短总结     |
| completed_at | datetime | 对话结束时间                 |
| move_count   | int      | 本次对话确认的 Move 数量     |
| date         | date     | 对话日期（用于按日期分组）   |

### 4.5 异常处理

| 场景             | 处理方式                                    |
| :--------------- | :------------------------------------------ |
| 没有 Coach 记录  | 显示空状态，引导用户去 Coach 开始第一次对话 |
| 某天有多条对话   | 同一日期分组下堆叠展示，按时间倒序          |
| 对话总结生成失败 | 副标题显示对话的前几句文字作为 fallback     |
| 对话详情加载失败 | 显示加载失败 + 重试按钮                     |

### 4.6 边界场景

1. **对话进行中（未结束）出现在 Review 里吗**：不出现，Review 只展示已结束的对话
2. **用户删除了一条对话**：从 Review 列表中移除，不可恢复（或放入回收站，本版本不做）
3. **同一天跨午夜的对话**：按对话结束时间归属日期
4. **对话标题很长**：主标题最多 2 行，超出省略
5. **副标题总结很短**：仍显示，不会因为短就隐藏
6. **用户在详情页想继续这个话题**：底部提供「继续聊这个话题」按钮，点击跳转到 Coach 并开启新对话
7. **Take aways 为空**：不显示 Take aways 区域

## 5. 账户中心详细设计

### 5.1 用户故事

- **US-AC-01**：作为用户，我可以查看和编辑自己的个人资料。
- **US-AC-02**：作为用户，我可以管理通知开关，选择接收哪些类型的通知。
- **US-AC-03**：作为用户，我可以查看和管理隐私设置，了解我的数据如何被使用。
- **US-AC-04**：作为用户，账户中心从各页面的右上角入口进入，不占底部 Tab。

### 5.2 页面与功能说明

#### 5.2.1 账户中心首页

**入口**：各页面右上角的头像/齿轮图标

**功能列表**：

- 个人资料
- 通知设置
- 隐私设置
- 帮助与反馈
- 退出登录

#### 5.2.2 个人资料页

- 头像（可更换）
- 昵称（可编辑）
- 邮箱（不可编辑或可编辑）
- 加入时间

#### 5.2.3 通知设置页

- 每日提醒开关（提醒用户记录 Daily）
- 预约对话提醒开关
- 新洞察通知开关
- 通知时间段设置（免打扰时段）

#### 5.2.4 隐私设置页

- 数据存储说明
- 对话数据删除入口
- 隐私政策链接

### 5.3 字段说明

#### User Profile

| 字段       | 类型     | 说明        |
| :--------- | :------- | :---------- |
| user_id    | string   | 用户唯一 ID |
| nickname   | string   | 昵称        |
| avatar_url | string   | 头像 URL    |
| email      | string   | 邮箱        |
| created_at | datetime | 注册时间    |

#### Notification Settings

| 字段                 | 类型   | 说明                    |
| :------------------- | :----- | :---------------------- |
| daily_reminder       | bool   | 每日记录提醒            |
| session_reminder     | bool   | 预约对话提醒            |
| insight_notification | bool   | 新洞察通知              |
| quiet_hours_start    | string | 免打扰开始时间（HH:mm） |
| quiet_hours_end      | string | 免打扰结束时间（HH:mm） |

### 5.4 边界场景

1. **用户未设置头像**：显示默认头像
2. **免打扰时段跨天**：支持（如 22:00 - 08:00）
3. **所有通知都关掉**：仍保留系统级通知（如安全提醒）
4. **用户请求删除所有数据**：二次确认后，进入删除流程，提示不可逆

## 6. 非功能需求

### 6.1 性能需求 TBD

| 指标           | 要求                 |
| :------------- | :------------------- |
| 页面首屏加载   | ≤ 2 秒（4G 网络下）  |
| 消息发送到展示 | ≤ 500ms（本地展示）  |
| AI 首字响应    | ≤ 3 秒（正常网络下） |
| AI 洞察生成    | ≤ 30 秒              |
| App 冷启动     | ≤ 2 秒               |

### 6.2 安全与隐私

- 所有对话数据加密存储
- 用户可随时删除自己的对话记录
- 对话数据不用于模型训练（需在隐私政策中明确）
- 支持生物识别解锁（指纹/面容）
- 所有 API 请求走 HTTPS

### 6.3 可用性与兼容性 TBD

- 支持 iOS 15+ 和 Android 10+
- 支持深色模式 / 浅色模式自动切换
- 支持字体大小动态调整（系统级）
- 离线状态下可查看已缓存的历史对话和 Daily 记录
- 离线发送的消息在恢复网络后自动同步

## 7. 数据埋点

### 7.1 Coach 模块

| 事件名                | 触发时机            | 关键参数                                   |
| :-------------------- | :------------------ | :----------------------------------------- |
| coach_entry           | 进入 Coach 模块     | entry_source（tab / 推送 / 其他）          |
| coach_new_session     | 开始新对话          | start_type（instant / scheduled）          |
| coach_schedule_create | 创建预约对话        | scheduled_time                             |
| coach_schedule_start  | 从预约卡片开始对话  | schedule_id, wait_minutes                  |
| coach_move_card_show  | Move 卡片展示       | session_id, move_index                     |
| coach_move_confirm    | Move 确认           | session_id, move_id                        |
| coach_move_edit       | Move 修改           | session_id, move_id, edit_count            |
| coach_end_confirm     | 对话结束 + 标题确认 | title_source（ai_suggested / user_edited） |
| coach_end_edit_title  | 用户编辑标题        | edit_count                                 |

### 7.2 Daily 模块

| 事件名                 | 触发时机        | 关键参数                        |
| :--------------------- | :-------------- | :------------------------------ |
| daily_entry            | 进入 Daily 模块 | date                            |
| daily_mood_select      | 选择心情        | mood_level                      |
| daily_insight_generate | 点击生成洞察    | has_journal, mood_selected      |
| daily_insight_result   | 洞察生成完成    | success / fail, duration_ms     |
| daily_move_check       | 切换 Move 状态  | move_id, from_status, to_status |

### 7.3 Review 模块

| 事件名                | 触发时机            | 关键参数               |
| :-------------------- | :------------------ | :--------------------- |
| review_entry          | 进入 Review 模块    | -                      |
| review_record_click   | 点击一条 Coach 记录 | session_id, date       |
| review_detail_view    | 查看对话详情        | session_id, move_count |
| review_takeaway_click | 点击 Take away      | move_id                |

### 7.4 账户中心

| 事件名                      | 触发时机     | 关键参数                     |
| :-------------------------- | :----------- | :--------------------------- |
| account_entry               | 进入账户中心 | entry_page                   |
| account_profile_edit        | 编辑个人资料 | field（nickname / avatar）   |
| account_notification_toggle | 切换通知开关 | notification_type, new_value |
| account_privacy_view        | 查看隐私设置 | -                            |