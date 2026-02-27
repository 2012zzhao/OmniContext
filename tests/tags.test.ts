import { describe, it, expect, beforeEach, vi } from 'vitest';

declare const global: typeof globalThis;
import { TagStorage } from '../src/storage/tag-storage';

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

  describe('deleteTag', () => {
    it('should delete tag by id', async () => {
      const tag = await tagStorage.createTag('临时', '#999');
      expect(tag).not.toBeNull();
      await tagStorage.deleteTag(tag!.id);

      const tags = await tagStorage.getAllTags();
      expect(tags).toHaveLength(0);
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
  });
});
