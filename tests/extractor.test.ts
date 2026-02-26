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
      // Create mock message elements
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="message user">
          <div class="content">Hello AI</div>
        </div>
        <div class="message assistant">
          <div class="content">Hello User</div>
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
