import { describe, it, expect, beforeEach, vi } from 'vitest';

declare const global: typeof globalThis;
import { SessionStorage } from '../src/storage/session-storage';
import type { Session } from '../src/types';

// Mock chrome.storage
describe('SessionStorage', () => {
  let storage: SessionStorage;
  let mockStorage: Map<string, any>;

  beforeEach(() => {
    mockStorage = new Map();

    // Mock chrome.storage.local
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string | string[] | null) => {
            if (keys === null) {
              return Promise.resolve(Object.fromEntries(mockStorage));
            }
            const keyArray = Array.isArray(keys) ? keys : [keys];
            const result: Record<string, any> = {};
            for (const key of keyArray) {
              if (mockStorage.has(key)) {
                result[key] = mockStorage.get(key);
              }
            }
            return Promise.resolve(result);
          }),
          set: vi.fn((items: Record<string, any>) => {
            Object.entries(items).forEach(([key, value]) => {
              mockStorage.set(key, value);
            });
            return Promise.resolve();
          }),
          remove: vi.fn((keys: string | string[]) => {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            for (const key of keyArray) {
              mockStorage.delete(key);
            }
            return Promise.resolve();
          }),
        },
      },
    } as any;

    storage = new SessionStorage();
  });

  describe('saveSession', () => {
    it('should save a new session', async () => {
      const session: Session = {
        id: 'test-1',
        platform: 'doubao',
        title: 'Test Session',
        sourceUrl: 'https://www.doubao.com/chat/123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        messageCount: 0,
      };

      await storage.saveSession(session);

      const saved = mockStorage.get('sessions');
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('test-1');
      expect(saved[0].platform).toBe('doubao');
    });

    it('should update existing session by id', async () => {
      const session: Session = {
        id: 'test-1',
        platform: 'doubao',
        title: 'Original Title',
        sourceUrl: 'https://www.doubao.com/chat/123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        messageCount: 0,
      };

      await storage.saveSession(session);

      const updatedSession = { ...session, title: 'Updated Title' };
      await storage.saveSession(updatedSession);

      const saved = mockStorage.get('sessions');
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Updated Title');
    });
  });

  describe('getSession', () => {
    it('should return session by id', async () => {
      const session: Session = {
        id: 'test-1',
        platform: 'doubao',
        title: 'Test Session',
        sourceUrl: 'https://www.doubao.com/chat/123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: Date.now() }],
        messageCount: 1,
      };

      await storage.saveSession(session);
      const result = await storage.getSession('test-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-1');
      expect(result?.title).toBe('Test Session');
    });

    it('should return null for non-existent session', async () => {
      const result = await storage.getSession('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions', async () => {
      const sessions: Session[] = [
        {
          id: 'test-1',
          platform: 'doubao',
          title: 'Session 1',
          sourceUrl: 'https://www.doubao.com/chat/1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          messageCount: 0,
        },
        {
          id: 'test-2',
          platform: 'claude',
          title: 'Session 2',
          sourceUrl: 'https://claude.ai/chat/2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          messageCount: 0,
        },
      ];

      for (const session of sessions) {
        await storage.saveSession(session);
      }

      const result = await storage.getAllSessions();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no sessions', async () => {
      const result = await storage.getAllSessions();
      expect(result).toEqual([]);
    });
  });

  describe('getSessionsByPlatform', () => {
    it('should return sessions filtered by platform', async () => {
      const sessions: Session[] = [
        {
          id: 'test-1',
          platform: 'doubao',
          title: 'Doubao Session',
          sourceUrl: 'https://www.doubao.com/chat/1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          messageCount: 0,
        },
        {
          id: 'test-2',
          platform: 'claude',
          title: 'Claude Session',
          sourceUrl: 'https://claude.ai/chat/2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          messageCount: 0,
        },
        {
          id: 'test-3',
          platform: 'doubao',
          title: 'Another Doubao',
          sourceUrl: 'https://www.doubao.com/chat/3',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          messageCount: 0,
        },
      ];

      for (const session of sessions) {
        await storage.saveSession(session);
      }

      const doubaoSessions = await storage.getSessionsByPlatform('doubao');
      expect(doubaoSessions).toHaveLength(2);
      expect(doubaoSessions.every(s => s.platform === 'doubao')).toBe(true);
    });
  });

  describe('deleteSession', () => {
    it('should delete session by id', async () => {
      const session: Session = {
        id: 'test-1',
        platform: 'doubao',
        title: 'Test Session',
        sourceUrl: 'https://www.doubao.com/chat/123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        messageCount: 0,
      };

      await storage.saveSession(session);
      await storage.deleteSession('test-1');

      const result = await storage.getSession('test-1');
      expect(result).toBeNull();
    });
  });

  describe('updateSessionTitle', () => {
    it('should update session title', async () => {
      const session: Session = {
        id: 'test-1',
        platform: 'doubao',
        title: 'Original Title',
        sourceUrl: 'https://www.doubao.com/chat/123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        messageCount: 0,
      };

      await storage.saveSession(session);
      await storage.updateSessionTitle('test-1', 'New Title');

      const updated = await storage.getSession('test-1');
      expect(updated?.title).toBe('New Title');
    });
  });
});
