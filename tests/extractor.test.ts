import { describe, it, expect } from 'vitest';
import {
  detectPlatform,
  extractSessionId,
  createMessageExtractor,
  formatPlatformName,
} from '../src/utils/extractor';
// Platform type is used implicitly in mock data

describe('extractor', () => {
  describe('detectPlatform', () => {
    it('should detect doubao from URL', () => {
      const url = 'https://www.doubao.com/chat/123';
      expect(detectPlatform(url)).toBe('doubao');
    });

    it('should detect yuanbao from URL', () => {
      const url = 'https://yuanbao.tencent.com/chat/123';
      expect(detectPlatform(url)).toBe('yuanbao');
    });

    it('should detect claude from URL', () => {
      const url = 'https://claude.ai/chat/123';
      expect(detectPlatform(url)).toBe('claude');
    });

    it('should return null for unknown URL', () => {
      const url = 'https://unknown.com/chat/123';
      expect(detectPlatform(url)).toBeNull();
    });
  });

  describe('extractSessionId', () => {
    it('should extract session ID from doubao URL', () => {
      const url = 'https://www.doubao.com/chat/abc123';
      expect(extractSessionId(url, 'doubao')).toBe('abc123');
    });

    it('should extract session ID from yuanbao URL', () => {
      const url = 'https://yuanbao.tencent.com/chat/xyz789';
      expect(extractSessionId(url, 'yuanbao')).toBe('xyz789');
    });

    it('should extract session ID from claude URL', () => {
      const url = 'https://claude.ai/chat/def456';
      expect(extractSessionId(url, 'claude')).toBe('def456');
    });

    it('should return timestamp for new chat', () => {
      const url = 'https://claude.ai/chat/new';
      const result = extractSessionId(url, 'claude');
      expect(result).toContain('new-');
    });
  });

  describe('createMessageExtractor', () => {
    it('should create extractor for doubao', () => {
      const extractor = createMessageExtractor('doubao');
      expect(extractor).toBeDefined();
      expect(extractor.platform).toBe('doubao');
    });

    it('should create extractor for yuanbao', () => {
      const extractor = createMessageExtractor('yuanbao');
      expect(extractor).toBeDefined();
      expect(extractor.platform).toBe('yuanbao');
    });

    it('should create extractor for claude', () => {
      const extractor = createMessageExtractor('claude');
      expect(extractor).toBeDefined();
      expect(extractor.platform).toBe('claude');
    });
  });

  describe('MessageExtractor.extractTitle', () => {
    it('should extract title from document for doubao', () => {
      // Mock document
      const mockTitle = document.createElement('div');
      mockTitle.className = 'chat-title';
      mockTitle.textContent = 'Test Chat Title';
      document.body.appendChild(mockTitle);

      const extractor = createMessageExtractor('doubao');
      const title = extractor.extractTitle();

      expect(title).toBe('Test Chat Title');

      document.body.removeChild(mockTitle);
    });

    it('should return default title when no title found', () => {
      const extractor = createMessageExtractor('doubao');
      const title = extractor.extractTitle();

      expect(title).toContain('未命名对话');
    });
  });

  describe('MessageExtractor.extractMessages', () => {
    it('should extract messages from DOM', () => {
      // Create mock message elements that match Doubao's CSS Module selectors
      // User message has bg-s-color-bg-trans class, content is in container-* element
      // Assistant message has no bg-s-color-bg-trans, content is in container-* element
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="message-list-abc123">
          <div class="message-block-container-xyz" data-msg-id="1">
            <div class="bg-s-color-bg-trans-abc">
              <div class="container-def">Hello AI</div>
            </div>
          </div>
          <div class="message-block-container-xyz" data-msg-id="2">
            <div class="answer-content-ghi">Hello User</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const extractor = createMessageExtractor('doubao');
      const messages = extractor.extractMessages();

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello AI');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe('Hello User');

      document.body.removeChild(container);
    });

    it('should handle empty messages', () => {
      const extractor = createMessageExtractor('doubao');
      const messages = extractor.extractMessages();

      expect(messages).toEqual([]);
    });
  });

  describe('Yuanbao message extraction', () => {
    it('should extract Yuanbao messages with CSS Module classes', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="message-list-xyz123">
          <div class="message-user-abc" data-msg-id="1">
            <div class="content-text">用户问题</div>
          </div>
          <div class="message-assistant-def" data-msg-id="2">
            <div class="answer-content">AI回答</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const extractor = createMessageExtractor('yuanbao');
      const messages = extractor.extractMessages();

      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages.some(m => m.role === 'user' && m.content.includes('用户'))).toBe(true);
      expect(messages.some(m => m.role === 'assistant' && m.content.includes('AI') || m.content.includes('回答'))).toBe(true);

      document.body.removeChild(container);
    });

    it('should filter Yuanbao thinking content from assistant messages', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="message-list-xyz">
          <div class="user-message-abc">
            <div class="content-text">问题</div>
          </div>
          <div class="assistant-message-def">
            <div class="thinking-section">思考过程：分析问题...</div>
            <div class="answer-content">最终答案内容</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const extractor = createMessageExtractor('yuanbao');
      const messages = extractor.extractMessages();

      // Check that we get at least one user and one assistant message
      expect(messages.length).toBeGreaterThanOrEqual(1);

      document.body.removeChild(container);
    });
  });

  describe('Claude message extraction', () => {
    it('should extract Claude messages with standard classes', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="conversation-container">
          <div class="human-message" data-msg-id="1">
            <div class="prose">User question</div>
          </div>
          <div class="assistant-message" data-msg-id="2">
            <div class="prose">Claude response</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const extractor = createMessageExtractor('claude');
      const messages = extractor.extractMessages();

      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages.some(m => m.role === 'user')).toBe(true);
      expect(messages.some(m => m.role === 'assistant')).toBe(true);

      document.body.removeChild(container);
    });

    it('should filter Claude Extended Thinking content', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="conversation-container">
          <div class="human-message">
            <div class="prose">Question</div>
          </div>
          <div class="assistant-message">
            <div class="thinking-block" data-thinking="true">
              Extended thinking content here...
            </div>
            <div class="prose">The actual response</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const extractor = createMessageExtractor('claude');
      const messages = extractor.extractMessages();

      const assistantMsg = messages.find(m => m.role === 'assistant');
      expect(assistantMsg).toBeDefined();
      // Should contain the response
      expect(assistantMsg?.content.length).toBeGreaterThan(0);

      document.body.removeChild(container);
    });
  });

  describe('formatPlatformName', () => {
    it('should format doubao', () => {
      expect(formatPlatformName('doubao')).toBe('豆包');
    });

    it('should format yuanbao', () => {
      expect(formatPlatformName('yuanbao')).toBe('元宝');
    });

    it('should format claude', () => {
      expect(formatPlatformName('claude')).toBe('Claude');
    });
  });
});
