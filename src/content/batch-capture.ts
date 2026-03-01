import { sessionStorage } from '../storage/session-storage';
import { createMessageExtractor } from '../utils/extractor';
import type { Platform, Session } from '../types';

export interface BatchCaptureProgress {
  total: number;
  current: number;
  currentTitle: string;
  captured: number;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  error?: string;
}

type ProgressCallback = (progress: BatchCaptureProgress) => void;

const BATCH_CAPTURE_STATE_KEY = 'batch_capture_state';

export class BatchCapture {
  private platform: Platform;
  private isPaused = false;
  private isCancelled = false;
  private onProgress: ProgressCallback | null = null;
  private processedSessions: Set<string> = new Set();
  private totalCaptured = 0;
  private floatingProgress: HTMLElement | null = null;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async start(onProgress: ProgressCallback): Promise<void> {
    this.onProgress = onProgress;
    this.isPaused = false;
    this.isCancelled = false;
    this.processedSessions.clear();
    this.totalCaptured = 0;

    // 创建浮动进度条
    this.createFloatingProgress();

    try {
      // 1. 先滚动侧边栏加载所有会话
      this.reportProgress({
        total: 0,
        current: 0,
        currentTitle: '正在加载会话列表...',
        captured: 0,
        status: 'running',
      });
      await this.scrollToLoadAllSessions();

      // 2. 获取会话列表
      const sessionElements = await this.getSessionListElements();

      if (sessionElements.length === 0) {
        this.reportProgress({
          total: 0,
          current: 0,
          currentTitle: '',
          captured: 0,
          status: 'error',
          error: '未找到会话列表',
        });
        return;
      }

      const total = sessionElements.length;
      console.log(`[OmniContext] Total sessions found: ${total}`);

      // 3. 逐个处理会话
      for (let i = 0; i < sessionElements.length; i++) {
        // 检查暂停/取消
        while (this.isPaused && !this.isCancelled) {
          await this.sleep(500);
        }
        if (this.isCancelled) {
          this.reportProgress({
            total,
            current: i,
            currentTitle: '',
            captured: this.totalCaptured,
            status: 'cancelled',
          });
          return;
        }

        const element = sessionElements[i];
        const title = this.getSessionTitle(element);

        // 预先获取会话ID（从元素属性）
        const preSessionId = this.getSessionIdFromElement(element);

        // 去重检查：如果已经处理过，跳过
        if (preSessionId && this.processedSessions.has(preSessionId)) {
          console.log(`[OmniContext] Skipping duplicate session: ${title} (${preSessionId})`);
          continue;
        }

        this.reportProgress({
          total,
          current: i + 1,
          currentTitle: title,
          captured: this.totalCaptured,
          status: 'running',
        });

        try {
          // 点击会话
          await this.clickSession(element);

          // 等待加载
          await this.waitForSessionLoad();

          // 滚动加载历史
          await this.scrollToLoadHistory();

          // 捕获当前会话
          const session = await this.captureCurrentSession();

          if (session) {
            this.processedSessions.add(session.id);
            this.totalCaptured += session.messageCount;
          }

          // 短暂延迟，避免过快操作
          await this.sleep(300);

        } catch (err) {
          console.error(`[OmniContext] Failed to capture session: ${title}`, err);
          // 继续下一个会话
        }
      }

      this.reportProgress({
        total,
        current: total,
        currentTitle: '',
        captured: this.totalCaptured,
        status: 'completed',
      });

      // 完成后3秒移除浮动进度条
      setTimeout(() => this.removeFloatingProgress(), 3000);

    } catch (err: any) {
      this.reportProgress({
        total: 0,
        current: 0,
        currentTitle: '',
        captured: 0,
        status: 'error',
        error: err.message || '未知错误',
      });
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  cancel(): void {
    this.isCancelled = true;
    this.removeFloatingProgress();
  }

  private reportProgress(progress: BatchCaptureProgress): void {
    // 1. 保存状态到 storage（用于恢复）
    this.saveState(progress);

    // 2. 回调给 popup
    if (this.onProgress) {
      this.onProgress(progress);
    }

    // 3. 更新浮动进度条
    this.updateFloatingProgress(progress);
  }

  private async saveState(progress: BatchCaptureProgress): Promise<void> {
    try {
      await chrome.storage.local.set({
        [BATCH_CAPTURE_STATE_KEY]: {
          ...progress,
          platform: this.platform,
          timestamp: Date.now(),
        }
      });
    } catch (err) {
      // 忽略存储错误
    }
  }

  // ========== 浮动进度条 ==========

  private createFloatingProgress(): void {
    if (this.floatingProgress) return;

    const container = document.createElement('div');
    container.id = 'omnicontext-batch-progress';
    container.innerHTML = `
      <div class="oc-progress-header">
        <span>📦 OmniContext 批量捕获</span>
        <button class="oc-progress-close">×</button>
      </div>
      <div class="oc-progress-bar">
        <div class="oc-progress-fill"></div>
      </div>
      <div class="oc-progress-info">
        <span class="oc-progress-count">0/?</span>
        <span class="oc-progress-title">准备中...</span>
      </div>
      <div class="oc-progress-captured">已捕获：<span>0</span> 条消息</div>
      <button class="oc-progress-cancel">取消</button>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #omnicontext-batch-progress {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
      }
      #omnicontext-batch-progress .oc-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-weight: 600;
      }
      #omnicontext-batch-progress .oc-progress-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
      }
      #omnicontext-batch-progress .oc-progress-bar {
        height: 6px;
        background: #e8e8e8;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      #omnicontext-batch-progress .oc-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 3px;
        transition: width 0.3s;
        width: 0%;
      }
      #omnicontext-batch-progress .oc-progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      #omnicontext-batch-progress .oc-progress-title {
        color: #666;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #omnicontext-batch-progress .oc-progress-captured {
        color: #888;
        font-size: 12px;
        margin-bottom: 10px;
      }
      #omnicontext-batch-progress .oc-progress-cancel {
        width: 100%;
        padding: 8px;
        background: #f5f5f5;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }
      #omnicontext-batch-progress .oc-progress-cancel:hover {
        background: #ff4d4f;
        color: white;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);
    this.floatingProgress = container;

    // 绑定事件
    container.querySelector('.oc-progress-close')?.addEventListener('click', () => {
      this.removeFloatingProgress();
    });
    container.querySelector('.oc-progress-cancel')?.addEventListener('click', () => {
      this.cancel();
    });
  }

  private updateFloatingProgress(progress: BatchCaptureProgress): void {
    if (!this.floatingProgress) return;

    const countEl = this.floatingProgress.querySelector('.oc-progress-count');
    const fillEl = this.floatingProgress.querySelector('.oc-progress-fill');
    const titleEl = this.floatingProgress.querySelector('.oc-progress-title');
    const capturedEl = this.floatingProgress.querySelector('.oc-progress-captured span');

    if (countEl) {
      countEl.textContent = `${progress.current}/${progress.total || '?'}`;
    }
    if (fillEl && progress.total > 0) {
      (fillEl as HTMLElement).style.width = `${(progress.current / progress.total) * 100}%`;
    }
    if (titleEl) {
      titleEl.textContent = progress.currentTitle || '处理中...';
    }
    if (capturedEl) {
      capturedEl.textContent = String(progress.captured);
    }
  }

  private removeFloatingProgress(): void {
    if (this.floatingProgress) {
      this.floatingProgress.remove();
      this.floatingProgress = null;
    }
    // 清除保存的状态
    chrome.storage.local.remove(BATCH_CAPTURE_STATE_KEY);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== 平台特定方法（由子类实现） ==========

  protected async getSessionListElements(): Promise<Element[]> {
    if (this.platform === 'doubao') {
      return this.getDoubaoSessionListElements();
    }
    // 其他平台待实现
    return [];
  }

  protected getSessionTitle(element: Element): string {
    if (this.platform === 'doubao') {
      return this.getDoubaoSessionTitle(element);
    }
    return '未知会话';
  }

  protected getSessionIdFromElement(element: Element): string | null {
    if (this.platform === 'doubao') {
      return this.getDoubaoSessionIdFromElement(element);
    }
    return null;
  }

  private getDoubaoSessionIdFromElement(element: Element): string | null {
    // 豆包会话元素可能有 data 属性或 href
    // 尝试多种方式获取 ID

    // 方式1: data-session-id 或类似属性
    const dataId = element.getAttribute('data-session-id') ||
                   element.getAttribute('data-id') ||
                   element.getAttribute('data-chat-id');
    if (dataId) return dataId;

    // 方式2: 从子元素的 href 提取
    const linkEl = element.querySelector('a[href*="/chat/"]');
    if (linkEl) {
      const href = linkEl.getAttribute('href');
      if (href) {
        const match = href.match(/\/chat\/([^/?]+)/);
        if (match) return match[1];
      }
    }

    // 方式3: 使用标题+内容的 hash 作为唯一标识
    const title = this.getDoubaoSessionTitle(element);
    const preview = element.textContent?.trim().slice(0, 100) || '';
    return `doubao-${this.simpleHash(title + preview)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  protected async clickSession(element: Element): Promise<void> {
    (element as HTMLElement).click();
  }

  protected async waitForSessionLoad(): Promise<void> {
    await this.sleep(1500); // 等待页面加载
  }

  protected async scrollToLoadHistory(): Promise<void> {
    if (this.platform === 'doubao') {
      return this.doubaoScrollToLoadHistory();
    }
  }

  protected async captureCurrentSession(): Promise<Session | null> {
    try {
      const extractor = createMessageExtractor(this.platform);
      const messages = extractor.extractMessages();
      const title = extractor.extractTitle();

      if (messages.length === 0) return null;

      // 从 URL 提取 session ID
      const url = window.location.href;
      const sessionId = this.extractSessionId(url);

      const session: Session = {
        id: sessionId,
        platform: this.platform,
        title: title || '未命名对话',
        sourceUrl: url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages,
        messageCount: messages.length,
      };

      // 检查是否已存在
      const existing = await sessionStorage.getSession(sessionId);
      if (existing) {
        session.createdAt = existing.createdAt;
      }

      await sessionStorage.saveSessionOptimized(session);
      return session;

    } catch (err) {
      console.error('[OmniContext] Capture failed:', err);
      return null;
    }
  }

  protected extractSessionId(url: string): string {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);

    for (const part of pathParts) {
      if (part && part !== 'chat' && part !== 'c' && part.length >= 4) {
        return part;
      }
    }

    // Fallback
    return `${this.platform}-${Date.now()}`;
  }

  // ========== 豆包平台特定实现 ==========

  private async scrollToLoadAllSessions(): Promise<void> {
    // 1. 首先确保侧边栏打开
    await this.ensureSidebarOpen();

    // 2. 查找侧边栏滚动容器
    const sidebarSelectors = [
      '#flow_chat_sidebar',
      '[data-testid="flow_chat_sidebar"]',
      '[class*="sidebar"]',
    ];

    let sidebar: Element | null = null;
    for (const selector of sidebarSelectors) {
      sidebar = document.querySelector(selector);
      if (sidebar) {
        console.log(`[OmniContext] Found sidebar: ${selector}`);
        break;
      }
    }

    if (!sidebar) {
      console.warn('[OmniContext] Sidebar not found for scrolling');
      return;
    }

    // 3. 滚动到底部加载所有会话
    let lastCount = 0;
    let noChangeCount = 0;

    while (noChangeCount < 3) {
      // 滚动到底部
      (sidebar as HTMLElement).scrollTop = sidebar.scrollHeight;
      await this.sleep(800);

      // 检查会话数量是否增加
      const currentCount = sidebar.querySelectorAll('[class*="chat-item"]').length;
      console.log(`[OmniContext] Sessions loaded: ${currentCount}`);

      if (currentCount === lastCount) {
        noChangeCount++;
      } else {
        lastCount = currentCount;
        noChangeCount = 0;
      }
    }

    console.log(`[OmniContext] Finished loading sessions, total: ${lastCount}`);
  }

  private async ensureSidebarOpen(): Promise<void> {
    // 检查侧边栏是否存在且可见
    const sidebar = document.querySelector('#flow_chat_sidebar');

    if (sidebar) {
      // 检查是否隐藏（豆包可能使用 translate 来隐藏）
      const style = window.getComputedStyle(sidebar);
      const transform = style.transform;
      const rect = sidebar.getBoundingClientRect();

      // 如果侧边栏被移出视图（translateX(-100%) 或类似）
      if (transform.includes('translate') && rect.x < 0) {
        console.log('[OmniContext] Sidebar is hidden, trying to open it');

        // 尝试找到打开侧边栏的按钮
        const openButtonSelectors = [
          '[class*="menu-button"]',
          '[class*="sidebar-toggle"]',
          '[class*="hamburger"]',
          '[data-testid="sidebar-toggle"]',
          'button[aria-label*="菜单"]',
          'button[aria-label*="侧边栏"]',
        ];

        for (const selector of openButtonSelectors) {
          const button = document.querySelector(selector);
          if (button) {
            console.log(`[OmniContext] Found open button: ${selector}`);
            (button as HTMLElement).click();
            await this.sleep(1000);

            // 检查是否成功打开
            const newRect = sidebar.getBoundingClientRect();
            if (newRect.x >= 0) {
              console.log('[OmniContext] Sidebar opened successfully');
              return;
            }
          }
        }

        console.warn('[OmniContext] Could not find button to open sidebar');
      } else {
        console.log('[OmniContext] Sidebar is already visible');
      }
    } else {
      console.warn('[OmniContext] Sidebar element not found');
    }
  }

  private getDoubaoSessionListElements(): Element[] {
    // 豆包的实际选择器
    const selectors = [
      '#flow_chat_sidebar [class*="chat-item"]',
      '[data-testid="flow_chat_sidebar"] [class*="chat-item"]',
      '[class*="chat-item"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`[OmniContext] Found ${elements.length} sessions with: ${selector}`);
        return Array.from(elements);
      }
    }

    console.warn('[OmniContext] No session list found');
    return [];
  }

  private getDoubaoSessionTitle(element: Element): string {
    // 豆包会话标题 - 尝试多种选择器
    const titleEl = element.querySelector('[class*="title"]') ||
                    element.querySelector('[class*="name"]') ||
                    element.querySelector('span[class*="text"]') ||
                    element.querySelector('span');
    return titleEl?.textContent?.trim() || '未命名会话';
  }

  private async doubaoScrollToLoadHistory(): Promise<void> {
    // 豆包消息容器选择器
    const containerSelectors = [
      '[class*="message-list"]',
      '[class*="chat-container"]',
      '[class*="conversation-content"]',
    ];

    let container: Element | null = null;
    for (const selector of containerSelectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log(`[OmniContext] Found message container: ${selector}`);
        break;
      }
    }

    if (!container) {
      console.warn('[OmniContext] Message container not found');
      return;
    }

    // 滚动到顶部加载历史
    let lastHeight = container.scrollHeight;
    let noChangeCount = 0;

    while (noChangeCount < 3) {
      (container as HTMLElement).scrollTop = 0;
      await this.sleep(500);

      if (container.scrollHeight === lastHeight) {
        noChangeCount++;
      } else {
        lastHeight = container.scrollHeight;
        noChangeCount = 0;
      }
    }
  }
}

// 单例实例
let batchCaptureInstance: BatchCapture | null = null;

export function startBatchCapture(platform: Platform, onProgress: ProgressCallback): void {
  if (batchCaptureInstance) {
    batchCaptureInstance.cancel();
  }
  batchCaptureInstance = new BatchCapture(platform);
  batchCaptureInstance.start(onProgress);
}

export function pauseBatchCapture(): void {
  batchCaptureInstance?.pause();
}

export function resumeBatchCapture(): void {
  batchCaptureInstance?.resume();
}

export function cancelBatchCapture(): void {
  batchCaptureInstance?.cancel();
  batchCaptureInstance = null;
}

export function isBatchCaptureRunning(): boolean {
  return batchCaptureInstance !== null;
}
