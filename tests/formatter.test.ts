import { describe, it, expect } from 'vitest';
import { formatSessionForInjection, formatTimestamp } from '../src/utils/formatter';
import type { Session, Platform } from '../src/types';

describe('formatter', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp to readable date', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      const result = formatTimestamp(timestamp);
      expect(result).toContain('2024');
      expect(result).toContain('01');
      expect(result).toContain('15');
    });

    it('should handle current timestamp', () => {
      const now = Date.now();
      const result = formatTimestamp(now);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatSessionForInjection', () => {
    const mockSession: Session = {
      id: 'test-1',
      platform: 'doubao' as Platform,
      title: 'Java学习路线',
      sourceUrl: 'https://www.doubao.com/chat/123',
      createdAt: new Date('2024-01-15T10:00:00').getTime(),
      updatedAt: new Date('2024-01-15T11:00:00').getTime(),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: '我想学Java，有什么建议？',
          timestamp: new Date('2024-01-15T10:00:00').getTime(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Java是一门很好的编程语言，建议从基础开始...',
          timestamp: new Date('2024-01-15T10:01:00').getTime(),
        },
        {
          id: 'msg-3',
          role: 'user',
          content: '具体需要学哪些内容？',
          timestamp: new Date('2024-01-15T10:05:00').getTime(),
        },
      ],
      messageCount: 3,
    };

    it('should format session with full messages', () => {
      const result = formatSessionForInjection(mockSession, 'full');

      expect(result).toContain('【上下文引用】');
      expect(result).toContain('豆包');
      expect(result).toContain('Java学习路线');
      expect(result).toContain('我想学Java，有什么建议？');
      expect(result).toContain('Java是一门很好的编程语言');
      expect(result).toContain('具体需要学哪些内容？');
    });

    it('should format session in full mode', () => {
      const result = formatSessionForInjection(mockSession, 'full');

      expect(result).toContain('[用户]');
      expect(result).toContain('[豆包]');
      expect(result).toHaveLength(result.length);
    });

    it('should handle empty messages', () => {
      const emptySession: Session = {
        ...mockSession,
        messages: [],
        messageCount: 0,
      };

      const result = formatSessionForInjection(emptySession, 'full');

      expect(result).toContain('【上下文引用】');
      expect(result).toContain('豆包');
      expect(result).toContain('Java学习路线');
    });

    it('should handle different platforms', () => {
      const claudeSession: Session = {
        ...mockSession,
        platform: 'claude' as Platform,
        title: 'System Design',
      };

      const result = formatSessionForInjection(claudeSession, 'full');

      expect(result).toContain('Claude');
      expect(result).toContain('System Design');
      expect(result).toContain('[Claude]');
    });

    it('should handle yuanbao platform', () => {
      const yuanbaoSession: Session = {
        ...mockSession,
        platform: 'yuanbao' as Platform,
        title: '旅游攻略',
      };

      const result = formatSessionForInjection(yuanbaoSession, 'full');

      expect(result).toContain('元宝');
      expect(result).toContain('旅游攻略');
    });

    it('should truncate long messages in preview', () => {
      const longSession: Session = {
        ...mockSession,
        messages: [
          {
            id: 'msg-long',
            role: 'assistant',
            content: 'a'.repeat(500),
            timestamp: Date.now(),
          },
        ],
      };

      const result = formatSessionForInjection(longSession, 'full');

      // Should include the message
      expect(result).toContain('a'.repeat(100));
    });
  });
});
