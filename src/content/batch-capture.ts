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

export class BatchCapture {
  private platform: Platform;
  private isPaused = false;
  private isCancelled = false;
  private onProgress: ProgressCallback | null = null;
  private processedSessions: Set<string> = new Set();
  private totalCaptured = 0;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async start(onProgress: ProgressCallback): Promise<void> {
    this.onProgress = onProgress;
    this.isPaused = false;
    this.isCancelled = false;
    this.processedSessions.clear();
    this.totalCaptured = 0;

    try {
      // 1. 获取会话列表
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

      // 2. 逐个处理会话
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
  }

  private reportProgress(progress: BatchCaptureProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
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
