# OmniContext 产品设计文档

> 倒排式记录，最新记录在最上方。只增不减。

---

## 2026-02-28 思考模式通用架构设计

**摘要：** 设计跨平台思考模式内容过滤方案

**正文：**

### 背景
主流AI平台（豆包、元宝、Claude）都推出了"思考模式"功能：
- 豆包：思考功能
- 元宝：深度思考
- Claude：Extended Thinking

这些功能会在回答前显示思考过程，但用户注入上下文时通常只需要最终回答。

### 架构设计

```
┌─────────────────────────────────────────────────────┐
│              extractMessages()                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ if (platform === 'doubao') → extractDoubaoMessages()
│  │ if (platform === 'yuanbao') → extractYuanbaoMessages()
│  │ if (platform === 'claude') → extractClaudeMessages()
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 各平台思考模式处理

#### 豆包 (Doubao)
```typescript
// 选择器
'[class*="message-block-container"]'
'[class*="bg-s-color-bg-trans"]'  // 用户标识

// 思考识别
'[class*="answer-content"], [class*="final-answer"]'
思考中... | thinking...
```

#### 元宝 (Yuanbao)
```typescript
// 选择器
'[class*="message-list"], [class*="chat-list"]'
'[class*="user-message"], [class*="assistant-message"]'

// 思考识别
思考过程 | 思考中 | 正在思考 | Think | Thinking
'[class*="thinking"], [class*="thought"], [class*="reasoning"]'
```

#### Claude
```typescript
// 选择器
'[class*="conversation"], [class*="messages"]'
'[class*="human"], [class*="assistant"]'

// 思考识别 (Extended Thinking)
'[class*="thinking"], [class*="thought"], [data-thinking]'
Thinking: | Extended thinking | Let me think
<thinking>...</thinking> | [Thinking]...[/Thinking]
```

### 通用处理流程

```
1. 查找消息容器
   ↓
2. 遍历消息块
   ↓
3. 判断角色（用户/助手）
   ↓
4. 助手消息 → 检测思考区块
   ↓
5. 克隆DOM，移除思考内容
   ↓
6. 返回纯净的最终回答
```

### 方法签名

```typescript
// 各平台专用提取
private extractDoubaoMessages(): Message[]
private extractYuanbaoMessages(): Message[]
private extractClaudeMessages(): Message[]

// 思考内容识别
private isDoubaoThinkingContent(text: string): boolean
private isYuanbaoThinkingContent(text: string): boolean
private isClaudeThinkingContent(text: string): boolean

// 内容清理
private extractDoubaoAssistantContent(element: Element): string
private extractYuanbaoAssistantContent(element: Element): string
private extractClaudeAssistantContent(element: Element): string
```

---

## 2026-02-27 AgenticEngineering 文档体系

**摘要：** 建立面向Agent协作的项目管理规范

**正文：**

### 文档组织原则

| 原则 | 说明 |
|------|------|
| 只增不减 | 历史记录保留，新内容追加 |
| 倒排记录 | 最新内容在上方，便于查看 |
| 结构化 | 时间 + 摘要 + 正文三层结构 |
| Markdown | 纯文本、版本友好、Agent可读 |

### 文档职责划分

| 文档 | 职责 |
|------|------|
| `worklog.md` | 工作日志、里程碑、阶段性进展 |
| `designs.md` | 产品设计、技术方案、架构决策 |

---

## 2026-02-27 品牌与命名规范

**摘要：** 项目正式命名为 OmniContext

**正文：**

### 品牌含义
- **Omni**：全域、全平台
- **Context**：上下文、语境、记忆

### GitHub描述
```
Seamlessly share chat context across different AI assistants (including Doubao and more) with conversation auto-captures and one-click context injection.

在不同AI助手间无缝共享对话上下文，支持豆包、元宝、Claude等平台，自动捕获聊天记录，一键注入上下文，让AI协作更连贯。
```

### 技术命名规范
- 存储键名：`sessions`
- Session ID：`{platform}-{timestamp}` 或 URL提取的ID
- 控制台前缀：`[OmniContext]`

---

## 2026-02-27 构建与部署流程

**摘要：** 标准化开发测试流程

**正文：**

### 开发流程
```
编码 → 测试 (npm test) → 构建 (npm run build) → 复制到桌面 → Chrome加载测试
```

### 桌面部署
- 目标路径：`C:\Users\73523\Desktop\OmniContext\`
- 内容：dist/ 目录完整复制
- Chrome加载：`chrome://extensions/` → 加载已解压的扩展程序

---

## 2026-02-26 豆包平台DOM解析方案

**摘要：** CSS Modules环境下的选择器策略

**正文：**

### 问题
豆包使用CSS Modules，类名包含随机哈希（如 `message-block-container-PggqdK`）

### 解决方案
```typescript
// 使用属性包含选择器
const messageBlocks = document.querySelectorAll('[class*="message-block-container"]');

// 区分用户消息：检查是否存在用户样式类
const isUser = block.querySelector('[class*="bg-s-color-bg-trans"]') !== null;
```

### 选择器配置
| 元素 | 选择器 |
|------|--------|
| 消息块 | `[class*="message-block-container"]` |
| 用户标识 | `[class*="bg-s-color-bg-trans"]` |
| 内容容器 | `[class*="container-"]` |

---

## 2026-02-26 软件架构设计

**摘要：** Chrome扩展Manifest V3架构

**正文：**

### 架构图
```
┌─────────────────────────────────────────┐
│           Chrome Extension              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Content │ │Background│ │  Popup   │ │
│  │ Script  │ │  Script  │ │   UI     │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ │
│       └─────────────┴──────────┘         │
│              chrome.storage              │
└─────────────────────────────────────────┘
```

### 模块职责
| 模块 | 职责 |
|------|------|
| Content Script | 页面DOM监听、消息提取 |
| Background | 生命周期管理、图标状态 |
| Popup | 用户界面、会话管理 |
| Storage | IndexedDB封装、CRUD |
| Extractor | 平台特定选择器、DOM解析 |
| Formatter | 格式化输出、剪贴板操作 |

### 数据流
```
AI平台页面 → Content Script → Extractor → Storage → Popup显示 → 复制注入
```

---

## 2026-02-26 产品功能设计

**摘要：** MVP功能定义与数据模型

**正文：**

### 核心功能
1. **自动捕获**：访问豆包/元宝/Claude时自动记录对话
2. **Session管理**：按平台分组、编辑标题、删除会话
3. **上下文注入**：选择历史会话，格式化复制到剪贴板
4. **数据导出**：JSON格式备份

### 数据模型
```typescript
interface Session {
  id: string;              // 唯一标识
  platform: Platform;      // 平台类型
  title: string;           // 会话标题（可编辑）
  sourceUrl: string;       // 来源链接
  createdAt: number;       // 创建时间
  updatedAt: number;       // 更新时间
  messages: Message[];     // 消息列表
  messageCount: number;    // 消息数量
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

### 注入格式模板
```markdown
【上下文引用】
以下是我之前在{平台名}的对话记录：

---
会话: {标题}
日期: {YYYY-MM-DD}

[用户] {内容}
[{平台}] {回复}
...
---

基于以上背景，请帮我继续...
```

---
