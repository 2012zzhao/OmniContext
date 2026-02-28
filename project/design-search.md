# OmniContext 搜索功能设计文档

> 状态：已确认，开发中
> 日期：2026-02-28

---

## 评审结论

| 功能 | 决定 | 备注 |
|------|------|------|
| 实时搜索 | ✅ 采用 | 输入即搜索，无需回车 |
| 搜索历史 | ❌ 暂不做 | 记录到未来功能 |
| 标签筛选 | ✅ 多选 | 作为集合匹配 |
| 时间筛选 | ❌ 暂不做 | 记录到未来功能 |

---

## 一、功能概述

为用户提供快速定位历史会话的能力，支持多维度搜索和筛选。

---

## 二、交互设计

### 2.1 搜索入口位置

**方案A：顶部固定搜索栏（推荐）**
```
┌─────────────────────────────────┐
│ 🧠 OmniContext          [⚙️]   │  ← 标题栏
├─────────────────────────────────┤
│ [🔍 搜索会话...        ] [×]   │  ← 搜索栏（固定）
├─────────────────────────────────┤
│ [豆包 ▼] [元宝 ▼] [标签 ▼]     │  ← 筛选栏（展开搜索时显示）
├─────────────────────────────────┤
│ ▼ 豆包 (5)                      │
│   └─ 会话列表...                │
│ ▼ 元宝 (3)                      │
│   └─ 会话列表...                │
└─────────────────────────────────┘
```

**方案B：悬浮搜索按钮**
```
┌─────────────────────────────────┐
│ 🧠 OmniContext    [🔍] [⚙️]    │
├─────────────────────────────────┤
│ （点击🔍后展开搜索框）          │
└─────────────────────────────────┘
```

**推荐方案A**：搜索是高频功能，固定在顶部更便捷。

---

### 2.2 搜索交互流程

```
初始状态                    输入时                      有结果
┌──────────────┐      ┌──────────────┐       ┌──────────────┐
│🔍 搜索会话...│  →   │🔍 深度学习   │   →   │🔍 深度学习 × │
└──────────────┘      └──────────────┘       └──────────────┘
                             │                       │
                             ▼                       ▼
                      显示筛选栏              显示匹配结果
                      实时高亮匹配            高亮匹配文字
```

---

### 2.3 筛选器设计

**紧凑型筛选器（推荐）**
```
┌─────────────────────────────────┐
│ [全部平台 ▼] [全部标签 ▼]       │
└─────────────────────────────────┘
```

点击展开下拉菜单：
```
┌─────────────────┐
│ ○ 全部平台      │
│ ● 豆包          │
│ ○ 元宝          │
│ ○ Claude        │
└─────────────────┘
```

---

### 2.4 搜索结果展示

**高亮匹配文字**
```
┌─────────────────────────────────┐
│ 📝 如何实现**深度学习**模型...  │  ← 标题匹配高亮
│    豆包 · 3条消息 · 今天        │
│    ...关于**深度学习**的...     │  ← 内容匹配预览
└─────────────────────────────────┘
```

**无结果状态**
```
┌─────────────────────────────────┐
│         🔍                       │
│    没有找到相关会话              │
│    试试其他关键词？              │
└─────────────────────────────────┘
```

---

## 三、UI 细节设计

### 3.1 搜索框样式

```css
.search-container {
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  padding-left: 32px;  /* 搜索图标位置 */
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

### 3.2 颜色规范

| 元素 | 颜色 | 说明 |
|------|------|------|
| 搜索图标 | #94a3b8 | 默认灰色 |
| 输入框边框 | #e2e8f0 | 默认边框 |
| 聚焦边框 | #6366f1 | 品牌紫色 |
| 高亮文字 | #6366f1 + 背景#eef2ff | 匹配文字 |
| 筛选按钮 | #f1f5f9 | 灰色背景 |

### 3.3 尺寸规范

| 元素 | 尺寸 |
|------|------|
| 搜索框高度 | 36px |
| 筛选按钮高度 | 28px |
| 图标大小 | 16px |
| 内边距 | 8px 12px |

---

## 四、技术方案

### 4.1 数据结构

```typescript
interface SearchParams {
  keyword: string;           // 搜索关键词
  platforms?: Platform[];    // 平台筛选
  tags?: string[];           // 标签筛选
  dateRange?: {              // 日期范围
    start: number;
    end: number;
  };
}

interface SearchResult {
  session: Session;
  matches: {
    titleMatch: boolean;     // 标题是否匹配
    contentMatches: string[]; // 内容匹配片段
  };
}
```

### 4.2 搜索逻辑

```typescript
async function searchSessions(params: SearchParams): Promise<SearchResult[]> {
  // 1. 获取所有会话
  const sessions = await sessionStorage.getAllSessions();

  // 2. 筛选
  let filtered = sessions;

  // 平台筛选
  if (params.platforms?.length) {
    filtered = filtered.filter(s => params.platforms!.includes(s.platform));
  }

  // 标签筛选
  if (params.tags?.length) {
    const sessionTags = await tagStorage.getSessionsByTags(params.tags);
    filtered = filtered.filter(s => sessionTags.includes(s.id));
  }

  // 3. 关键词搜索
  if (params.keyword) {
    return filtered.map(session => {
      const titleMatch = session.title.includes(params.keyword);
      const contentMatches = session.messages
        .filter(m => m.content.includes(params.keyword))
        .map(m => extractMatch(m.content, params.keyword));

      return { session, matches: { titleMatch, contentMatches } };
    }).filter(r => r.matches.titleMatch || r.matches.contentMatches.length > 0);
  }

  return filtered.map(s => ({ session: s, matches: { titleMatch: false, contentMatches: [] } }));
}
```

### 4.3 防抖处理

```typescript
// 输入防抖，300ms 后执行搜索
const debouncedSearch = debounce((keyword: string) => {
  performSearch(keyword);
}, 300);
```

---

## 五、实现计划

### Phase 1: 基础搜索（优先）
- [ ] 搜索框 UI
- [ ] 关键词搜索（标题 + 内容）
- [ ] 搜索结果高亮
- [ ] 清空搜索按钮

### Phase 2: 筛选功能
- [ ] 平台筛选下拉
- [ ] 标签筛选下拉
- [ ] 筛选状态保持

### Phase 3: 增强功能
- [ ] 搜索历史
- [ ] 快捷键支持（Ctrl/Cmd + K）
- [ ] 时间范围筛选

---

## 六、备选方案

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| A. 固定搜索栏 | 快速访问，一目了然 | 占用空间 |
| B. 悬浮按钮 | 节省空间 | 多一次点击 |
| C. 标签页式 | 功能分离清晰 | 交互复杂 |

**推荐方案A**，因为搜索是核心高频功能。

---

## 七、待讨论问题

1. **实时搜索 vs 提交搜索？**
   - 实时：输入即搜索，体验流畅
   - 提交：按回车搜索，节省性能

2. **是否需要搜索历史？**
   - 方便重复搜索常用关键词
   - 需要额外存储

3. **标签筛选是单选还是多选？**
   - 单选：简单清晰
   - 多选：更灵活，但UI复杂

4. **是否需要时间筛选？**
   - 快捷选项：今天、本周、本月
   - 自定义日期范围

---

## 八、设计稿预览

（待补充 Figma/Sketch 设计稿链接）

---

**请评审以上设计，有任何意见或建议请反馈。**
