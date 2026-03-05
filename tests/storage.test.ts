import { describe, it, expect, beforeEach, vi } from 'vitest';

declare const global: typeof globalThis;
import { SessionStorage } from '../src/storage/session-storage';
import type { Session, Message } from '../src/types';

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

  const createTestSession = (id: string, platform: Session['platform'] = 'doubao', messages: Message[] = []): Session => ({
    id,
    platform,
    title: `Test Session ${id}`,
    sourceUrl: `https://www.doubao.com/chat/${id}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages,
    messageCount: messages.length,
  });

  const createTestMessage = (id: string, role: Message['role'] = 'user', content = 'Test content'): Message => ({
    id,
    role,
    content,
    timestamp: Date.now(),
  });

  describe('saveSession', () => {
    it('should save a new session', async () => {
      const session = createTestSession('test-1');

      await storage.saveSession(session);

      const saved = mockStorage.get('sessions');
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('test-1');
      expect(saved[0].platform).toBe('doubao');
    });

    it('should update existing session by id', async () => {
      const session = createTestSession('test-1');
      await storage.saveSession(session);

      const updatedSession = { ...session, title: 'Updated Title' };
      await storage.saveSession(updatedSession);

      const saved = mockStorage.get('sessions');
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Updated Title');
    });

    it('should preserve createdAt when updating', async () => {
      const session = createTestSession('test-1');
      session.createdAt = 1000;
      await storage.saveSession(session);

      const updatedSession = { ...session, title: 'Updated' };
      await storage.saveSession(updatedSession);

      const saved = mockStorage.get('sessions');
      expect(saved[0].createdAt).toBe(1000);
    });

    it('should save session with messages', async () => {
      const messages = [
        createTestMessage('m1', 'user', 'Hello'),
        createTestMessage('m2', 'assistant', 'Hi there'),
      ];
      const session = createTestSession('test-1', 'doubao', messages);

      await storage.saveSession(session);

      const saved = mockStorage.get('sessions');
      expect(saved[0].messages).toHaveLength(2);
      expect(saved[0].messageCount).toBe(2);
    });
  });

  describe('saveSessionOptimized', () => {
    it('should preserve createdAt on update', async () => {
      const session = createTestSession('test-opt-1');
      session.createdAt = 5000;
      await storage.saveSessionOptimized(session);

      // Update with new data
      const updated = { ...session, title: 'Optimized Update' };
      await storage.saveSessionOptimized(updated);

      const saved = await storage.getSession('test-opt-1');
      expect(saved?.createdAt).toBe(5000);
      expect(saved?.title).toBe('Optimized Update');
    });

    it('should set createdAt for new session', async () => {
      const session = createTestSession('test-opt-new');
      await storage.saveSessionOptimized(session);

      const saved = await storage.getSession('test-opt-new');
      expect(saved?.createdAt).toBeGreaterThan(0);
    });
  });

  describe('getSession', () => {
    it('should return session by id', async () => {
      const session = createTestSession('test-1', 'doubao', [
        createTestMessage('m1', 'user', 'Hello'),
      ]);
      await storage.saveSession(session);

      const result = await storage.getSession('test-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-1');
      expect(result?.title).toBe('Test Session test-1');
    });

    it('should return null for non-existent session', async () => {
      const result = await storage.getSession('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions', async () => {
      await storage.saveSession(createTestSession('test-1'));
      await storage.saveSession(createTestSession('test-2'));

      const result = await storage.getAllSessions();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no sessions', async () => {
      const result = await storage.getAllSessions();
      expect(result).toEqual([]);
    });

    it('should return sessions with messages', async () => {
      const messages = [createTestMessage('m1', 'user', 'Test')];
      await storage.saveSession(createTestSession('test-1', 'doubao', messages));

      const result = await storage.getAllSessions();
      expect(result[0].messages).toHaveLength(1);
    });
  });

  describe('getSessionsByPlatform', () => {
    it('should return sessions filtered by platform', async () => {
      await storage.saveSession(createTestSession('test-1', 'doubao'));
      await storage.saveSession(createTestSession('test-2', 'claude'));
      await storage.saveSession(createTestSession('test-3', 'doubao'));

      const doubaoSessions = await storage.getSessionsByPlatform('doubao');
      expect(doubaoSessions).toHaveLength(2);
      expect(doubaoSessions.every(s => s.platform === 'doubao')).toBe(true);
    });

    it('should return empty array for platform with no sessions', async () => {
      await storage.saveSession(createTestSession('test-1', 'doubao'));

      const kimiSessions = await storage.getSessionsByPlatform('kimi');
      expect(kimiSessions).toEqual([]);
    });
  });

  describe('deleteSession', () => {
    it('should delete session by id', async () => {
      await storage.saveSession(createTestSession('test-1'));
      await storage.deleteSession('test-1');

      const result = await storage.getSession('test-1');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(storage.deleteSession('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('updateSessionTitle', () => {
    it('should update session title', async () => {
      await storage.saveSession(createTestSession('test-1'));
      await storage.updateSessionTitle('test-1', 'New Title');

      const updated = await storage.getSession('test-1');
      expect(updated?.title).toBe('New Title');
    });

    it('should not throw when updating non-existent session', async () => {
      await expect(storage.updateSessionTitle('non-existent', 'Title')).resolves.toBeUndefined();
    });
  });

  describe('exportAllSessions', () => {
    it('should export sessions as JSON string', async () => {
      await storage.saveSession(createTestSession('test-1'));
      await storage.saveSession(createTestSession('test-2'));

      const exported = await storage.exportAllSessions();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should export empty array when no sessions', async () => {
      const exported = await storage.exportAllSessions();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual([]);
    });
  });

  describe('importSessions', () => {
    it('should import new sessions', async () => {
      const sessions = [
        createTestSession('import-1'),
        createTestSession('import-2'),
      ];

      const count = await storage.importSessions(sessions, 'merge-keep');
      expect(count).toBe(2);

      const all = await storage.getAllSessions();
      expect(all).toHaveLength(2);
    });

    it('should merge with existing sessions (keep existing)', async () => {
      await storage.saveSession(createTestSession('existing'));

      const sessions = [
        createTestSession('existing'),
        createTestSession('new'),
      ];

      const count = await storage.importSessions(sessions, 'merge-keep');
      expect(count).toBe(2); // Returns input sessions count

      const all = await storage.getAllSessions();
      expect(all).toHaveLength(2); // But only 2 stored (existing kept, new added)
    });

    it('should merge with existing sessions (overwrite)', async () => {
      await storage.saveSession(createTestSession('existing'));

      const sessions = [
        { ...createTestSession('existing'), title: 'Overwritten' },
        createTestSession('new'),
      ];

      const count = await storage.importSessions(sessions, 'merge-overwrite');
      expect(count).toBe(2);

      const existing = await storage.getSession('existing');
      expect(existing?.title).toBe('Overwritten');
    });

    it('should replace all sessions', async () => {
      await storage.saveSession(createTestSession('old-1'));
      await storage.saveSession(createTestSession('old-2'));

      const sessions = [
        createTestSession('new-1'),
        createTestSession('new-2'),
        createTestSession('new-3'),
      ];

      const count = await storage.importSessions(sessions, 'replace');
      expect(count).toBe(3);

      const all = await storage.getAllSessions();
      expect(all).toHaveLength(3);
      expect(all.map(s => s.id)).toEqual(['new-1', 'new-2', 'new-3']);
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions', async () => {
      await storage.saveSession(createTestSession('test-1'));
      await storage.saveSession(createTestSession('test-2'));

      await storage.clearAllSessions();

      const all = await storage.getAllSessions();
      expect(all).toEqual([]);
    });
  });

  describe('All platforms', () => {
    it('should save and retrieve doubao session', async () => {
      await storage.saveSession(createTestSession('doubao-1', 'doubao'));
      const sessions = await storage.getSessionsByPlatform('doubao');
      expect(sessions).toHaveLength(1);
    });

    it('should save and retrieve yuanbao session', async () => {
      await storage.saveSession(createTestSession('yuanbao-1', 'yuanbao'));
      const sessions = await storage.getSessionsByPlatform('yuanbao');
      expect(sessions).toHaveLength(1);
    });

    it('should save and retrieve claude session', async () => {
      await storage.saveSession(createTestSession('claude-1', 'claude'));
      const sessions = await storage.getSessionsByPlatform('claude');
      expect(sessions).toHaveLength(1);
    });

    it('should save and retrieve deepseek session', async () => {
      await storage.saveSession(createTestSession('deepseek-1', 'deepseek'));
      const sessions = await storage.getSessionsByPlatform('deepseek');
      expect(sessions).toHaveLength(1);
    });

    it('should save and retrieve kimi session', async () => {
      await storage.saveSession(createTestSession('kimi-1', 'kimi'));
      const sessions = await storage.getSessionsByPlatform('kimi');
      expect(sessions).toHaveLength(1);
    });
  });
});
