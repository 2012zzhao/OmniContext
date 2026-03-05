import { describe, it, expect, beforeEach, vi } from 'vitest';

declare const global: typeof globalThis;
import { TagStorage } from '../src/storage/tag-storage';
import type { Tag } from '../src/types';

describe('TagStorage', () => {
  let tagStorage: TagStorage;
  let mockStorage: Map<string, any>;

  beforeEach(() => {
    mockStorage = new Map();

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
        },
      },
    } as any;

    tagStorage = new TagStorage();
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');

      expect(tag).not.toBeNull();
      expect(tag!.name).toBe('工作');
      expect(tag!.color).toBe('#ff4d4f');
      expect(tag!.id).toBeDefined();
      expect(tag!.createdAt).toBeDefined();
    });

    it('should not create duplicate tag names', async () => {
      await tagStorage.createTag('工作', '#ff4d4f');
      const duplicate = await tagStorage.createTag('工作', '#1890ff');

      expect(duplicate).toBeNull();
    });
  });

  describe('getAllTags', () => {
    it('should return all tags', async () => {
      await tagStorage.createTag('工作', '#ff4d4f');
      await tagStorage.createTag('学习', '#52c41a');

      const tags = await tagStorage.getAllTags();

      expect(tags).toHaveLength(2);
      expect(tags.map(t => t.name)).toContain('工作');
      expect(tags.map(t => t.name)).toContain('学习');
    });

    it('should return empty array when no tags', async () => {
      const tags = await tagStorage.getAllTags();
      expect(tags).toEqual([]);
    });
  });

  describe('getTag', () => {
    it('should return tag by id', async () => {
      const created = await tagStorage.createTag('工作', '#ff4d4f');
      expect(created).not.toBeNull();

      const tag = await tagStorage.getTag(created!.id);
      expect(tag).not.toBeNull();
      expect(tag!.name).toBe('工作');
    });

    it('should return null for non-existent tag', async () => {
      const tag = await tagStorage.getTag('non-existent-id');
      expect(tag).toBeNull();
    });
  });

  describe('deleteTag', () => {
    it('should delete tag by id', async () => {
      const tag = await tagStorage.createTag('临时', '#999');
      expect(tag).not.toBeNull();
      await tagStorage.deleteTag(tag!.id);

      const tags = await tagStorage.getAllTags();
      expect(tags).toHaveLength(0);
    });

    it('should remove tag from all sessions when deleted', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();

      // Add tag to multiple sessions
      await tagStorage.addTagToSession('session-1', tag!.id);
      await tagStorage.addTagToSession('session-2', tag!.id);

      // Delete tag
      await tagStorage.deleteTag(tag!.id);

      // Verify tag removed from sessions
      const tags1 = await tagStorage.getSessionTags('session-1');
      const tags2 = await tagStorage.getSessionTags('session-2');
      expect(tags1).not.toContain(tag!.id);
      expect(tags2).not.toContain(tag!.id);
    });
  });

  describe('updateTag', () => {
    it('should update tag color', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();
      await tagStorage.updateTag(tag!.id, { color: '#1890ff' });

      const tags = await tagStorage.getAllTags();
      expect(tags[0].color).toBe('#1890ff');
    });

    it('should update tag name', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();
      await tagStorage.updateTag(tag!.id, { name: 'Work' });

      const tags = await tagStorage.getAllTags();
      expect(tags[0].name).toBe('Work');
    });

    it('should not update non-existent tag', async () => {
      // Should not throw
      await tagStorage.updateTag('non-existent', { color: '#000' });
      const tags = await tagStorage.getAllTags();
      expect(tags).toHaveLength(0);
    });
  });

  describe('addTagToSession', () => {
    it('should add tag to session', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();
      await tagStorage.addTagToSession('session-1', tag!.id);

      const sessionTags = await tagStorage.getSessionTags('session-1');
      expect(sessionTags).toContain(tag!.id);
    });

    it('should not add duplicate tags to session', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();
      await tagStorage.addTagToSession('session-1', tag!.id);
      await tagStorage.addTagToSession('session-1', tag!.id);

      const sessionTags = await tagStorage.getSessionTags('session-1');
      expect(sessionTags).toHaveLength(1);
    });

    it('should add multiple tags to same session', async () => {
      const tag1 = await tagStorage.createTag('工作', '#ff4d4f');
      const tag2 = await tagStorage.createTag('重要', '#faad14');
      expect(tag1).not.toBeNull();
      expect(tag2).not.toBeNull();

      await tagStorage.addTagToSession('session-1', tag1!.id);
      await tagStorage.addTagToSession('session-1', tag2!.id);

      const sessionTags = await tagStorage.getSessionTags('session-1');
      expect(sessionTags).toHaveLength(2);
    });
  });

  describe('removeTagFromSession', () => {
    it('should remove tag from session', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();
      await tagStorage.addTagToSession('session-1', tag!.id);
      await tagStorage.removeTagFromSession('session-1', tag!.id);

      const sessionTags = await tagStorage.getSessionTags('session-1');
      expect(sessionTags).not.toContain(tag!.id);
    });

    it('should clean up empty session entry', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();
      await tagStorage.addTagToSession('session-1', tag!.id);
      await tagStorage.removeTagFromSession('session-1', tag!.id);

      const allSessionTags = await tagStorage.getAllSessionTags();
      expect(allSessionTags['session-1']).toBeUndefined();
    });

    it('should handle non-existent session', async () => {
      // Should not throw
      await tagStorage.removeTagFromSession('non-existent', 'tag-id');
    });
  });

  describe('getSessionTags', () => {
    it('should return empty array for session with no tags', async () => {
      const tags = await tagStorage.getSessionTags('no-tags-session');
      expect(tags).toEqual([]);
    });
  });

  describe('getAllSessionTags', () => {
    it('should return all session-tag mappings', async () => {
      const tag1 = await tagStorage.createTag('工作', '#ff4d4f');
      const tag2 = await tagStorage.createTag('学习', '#52c41a');
      expect(tag1).not.toBeNull();
      expect(tag2).not.toBeNull();

      await tagStorage.addTagToSession('session-1', tag1!.id);
      await tagStorage.addTagToSession('session-2', tag2!.id);

      const allMappings = await tagStorage.getAllSessionTags();
      expect(allMappings['session-1']).toContain(tag1!.id);
      expect(allMappings['session-2']).toContain(tag2!.id);
    });

    it('should return empty object when no mappings', async () => {
      const mappings = await tagStorage.getAllSessionTags();
      expect(mappings).toEqual({});
    });
  });

  describe('createTagWithId', () => {
    it('should create tag with specific ID', async () => {
      const customTag: Tag = {
        id: 'custom-id-123',
        name: '自定义标签',
        color: '#purple',
        createdAt: Date.now(),
      };

      await tagStorage.createTagWithId(customTag);

      const tag = await tagStorage.getTag('custom-id-123');
      expect(tag).not.toBeNull();
      expect(tag!.name).toBe('自定义标签');
    });

    it('should not create tag with duplicate ID', async () => {
      const tag1: Tag = {
        id: 'same-id',
        name: 'First Tag',
        color: '#ff0000',
        createdAt: Date.now(),
      };

      const tag2: Tag = {
        id: 'same-id',
        name: 'Second Tag',
        color: '#00ff00',
        createdAt: Date.now(),
      };

      await tagStorage.createTagWithId(tag1);
      await tagStorage.createTagWithId(tag2); // Should be ignored

      const tags = await tagStorage.getAllTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('First Tag');
    });
  });

  describe('setAllSessionTags', () => {
    it('should set all session-tag mappings', async () => {
      const mappings: Record<string, string[]> = {
        'session-1': ['tag-1', 'tag-2'],
        'session-2': ['tag-3'],
      };

      await tagStorage.setAllSessionTags(mappings);

      const result = await tagStorage.getAllSessionTags();
      expect(result).toEqual(mappings);
    });

    it('should replace existing mappings', async () => {
      await tagStorage.setAllSessionTags({ 'old-session': ['old-tag'] });
      await tagStorage.setAllSessionTags({ 'new-session': ['new-tag'] });

      const result = await tagStorage.getAllSessionTags();
      expect(result['old-session']).toBeUndefined();
      expect(result['new-session']).toContain('new-tag');
    });
  });

  describe('getSessionsByTag', () => {
    it('should return sessions with specific tag', async () => {
      const tag = await tagStorage.createTag('工作', '#ff4d4f');
      expect(tag).not.toBeNull();

      await tagStorage.addTagToSession('session-1', tag!.id);
      await tagStorage.addTagToSession('session-2', tag!.id);
      await tagStorage.addTagToSession('session-3', 'other-tag');

      const sessions = await tagStorage.getSessionsByTag(tag!.id);
      expect(sessions).toHaveLength(2);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
      expect(sessions).not.toContain('session-3');
    });

    it('should return empty array when no sessions have tag', async () => {
      const sessions = await tagStorage.getSessionsByTag('non-existent-tag');
      expect(sessions).toEqual([]);
    });
  });
});
