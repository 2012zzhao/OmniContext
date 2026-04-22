<h1 align="center"><img src="icons/context-drop.svg" width="32" height="32" alt="ContextDrop">  ContextDrop: 跨会话跨平台无缝流转你的AI记忆</h1>

<p align="center"><b>新建会话后AI仿佛失忆？切换平台就丢失历史？ContextDrop帮你在任意会话、任意平台之间流转对话记忆</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/豆包-Supported-ff6a00" alt="豆包 已支持">
  <img src="https://img.shields.io/badge/元宝-Supported-00c853" alt="元宝 已支持">
  <img src="https://img.shields.io/badge/Claude-Supported-d97757?logo=anthropic" alt="Claude Supported">
  <img src="https://img.shields.io/badge/DeepSeek-Supported-4d6bfa" alt="DeepSeek Supported">
  <img src="https://img.shields.io/badge/Gemini-Supported-4285f4?logo=google" alt="Gemini Supported">
  <img src="https://img.shields.io/badge/ChatGPT-Supported-10a37f?logo=openai" alt="ChatGPT Supported">
</p>

<p align="center">
  <a href="https://github.com/Jackie2049/ContextDrop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Chrome%20Extension-MV3-green.svg?logo=googlechrome" alt="Chrome Extension MV3">
</p>

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

**ContextDrop**是一款专注于**AI助手记忆管理**的浏览器插件。它可以：<br>

💾 **捕获会话**：用户使用AI助手时，插件自动保存用户和AI助手之间的会话记录<br> 
✏️ **注入记忆**：按需将已捕获的AI记忆从插件注入当前会话，内容支持二次编辑<br>
🌍 **跨平台**：支持跨会话、跨平台操作，无缝流转你的AI记忆————就像AirDrop那样<br>

数据本地存储，支持导出导入，隐私安全无忧<br>
现已适配豆包、DeepSeek、ChatGPT、Gemini、元宝、Kimi、Claude等主流AI助手<br>

---

## 功能演示

### ① 自动捕获会话 ———— 你只管聊，我来记录

打开「自动捕获」开关，ContextDrop会自动捕获会话记录，并将AI记忆缓存到本地，无需手动操作

<p align="center">
  <img src="assets/demo_auto-capture-memory.gif" width="720" alt="自动捕获会话演示：开启自动捕获后，ContextDrop 将对话记忆缓存到本地">
</p>

### ② 一键注入记忆 ———— 你和AI的故事，再也不用从头说起

找到相关记忆卡片，点击右侧「🧠」按钮，即可将AI记忆一键注入当前对话，实现跨会话、跨平台流转

<p align="center">
  <img src="assets/demo_inject-ai-memory.gif" width="720" alt="一键注入记忆演示：点击记忆卡片「🧠」将记忆注入当前对话">
</p>

### ③ 批量捕获会话 ———— 定期批量归档即可，无需逐个操作

点击「批量捕获」按钮，ContextDrop会扫描整个会话列表，将AI助手的所有记忆一键归档保存

<p align="center">
  <img src="assets/demo_batch-capture-memory.gif" width="720" alt="批量捕获会话演示：一键捕获多个平台的AI会话">
</p>

---

## 安装使用

### 第一步：下载插件

前往 [Releases 页面](https://github.com/Jackie2049/ContextDrop/releases)，下载最新版本压缩包 `ContextDrop-*.zip`到本地，并解压到任意目录。

### 第二步：安装插件

1. 打开 Chrome（或 Edge）浏览器，地址栏输入 `chrome://extensions/`（Edge 用户请输入 `edge://extensions/`）并回车
2. 开启页面右上角的 **「开发者模式（Developer mode）」** 开关
3. 点击左上角的 **「加载已解压的扩展程序（Load unpacked）」** 按钮
4. 在弹出的文件夹选择器中，选中刚才解压出来的 **ContextDrop** 文件夹
5. 加载成功后， **「所有扩展程序（All Extensions）」** 会出现 ContextDrop 的图标 🧠
6. 点击浏览器右上角拼图形状🧩的 **「扩展程序（Extensions）」** 按钮，点击大头钉标志固定

### 第三步：开始使用

- 打开任意 AI 助手（如豆包、ChatGPT、Claude 等），正常开始对话
- 扩展会 **自动捕获** 你与 AI 助手的对话记录，并保存到本地
- 点击浏览器工具栏的 **「🧠」** 按钮，即可查看、管理历史会话

---

## 最新动态

---

## 平台适配


| 平台       | 状态  | 备注   |
| -------- | --- | ---- |
| [豆包](https://www.doubao.com/)       | ✅   | 现已支持网页版AI助手 |
| [元宝](https://yuanbao.tencent.com/)       | ✅   | 现已支持网页版AI助手 |
| [Claude](https://claude.ai/)   | ✅   | 现已支持网页版AI助手 |
| [DeepSeek](https://chat.deepseek.com/) | ✅   | 现已支持网页版AI助手 |
| [Kimi](https://www.kimi.com/)     | ✅   | 现已支持网页版AI助手 |
| [Gemini](https://gemini.google.com/)   | ✅   | 现已支持网页版AI助手 |
| [ChatGPT](https://chatgpt.com/)  | ✅   | 现已支持网页版AI助手 |


---

## 贡献

欢迎提交 Issue 和 PR！

---

## 许可

MIT License