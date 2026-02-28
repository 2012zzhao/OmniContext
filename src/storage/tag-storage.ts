import type { Tag } from '../types';

const TAGS_KEY = 'tags';
const SESSION_TAGS_KEY = 'session_tags';

export class TagStorage {
  /**
   * Create a new tag
   */
  async createTag(name: string, color: string): Promise<Tag | null> {
    const tags = await this.getAllTags();

    // Check for duplicate name
    if (tags.some(t => t.name === name)) {
      return null;
    }

    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      createdAt: Date.now(),
    };

    tags.push(newTag);
    await chrome.storage.local.set({ [TAGS_KEY]: tags });

    return newTag;
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<Tag[]> {
    const result = await chrome.storage.local.get(TAGS_KEY);
    return (result[TAGS_KEY] as Tag[]) || [];
  }

  /**
   * Get tag by ID
   */
  async getTag(id: string): Promise<Tag | null> {
    const tags = await this.getAllTags();
    return tags.find(t => t.id === id) || null;
  }

  /**
   * Update tag
   */
  async updateTag(id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>): Promise<void> {
    const tags = await this.getAllTags();
    const index = tags.findIndex(t => t.id === id);

    if (index >= 0) {
      tags[index] = { ...tags[index], ...updates };
      await chrome.storage.local.set({ [TAGS_KEY]: tags });
    }
  }

  /**
   * Delete tag
   */
  async deleteTag(id: string): Promise<void> {
    const tags = await this.getAllTags();
    const filtered = tags.filter(t => t.id !== id);
    await chrome.storage.local.set({ [TAGS_KEY]: filtered });

    // Remove from all sessions
    const sessionTags = await this.getAllSessionTags();
    for (const sessionId in sessionTags) {
      if (sessionTags[sessionId].includes(id)) {
        await this.removeTagFromSession(sessionId, id);
      }
    }
  }

  /**
   * Add tag to session
   */
  async addTagToSession(sessionId: string, tagId: string): Promise<void> {
    const sessionTags = await this.getAllSessionTags();

    if (!sessionTags[sessionId]) {
      sessionTags[sessionId] = [];
    }

    // Avoid duplicates
    if (!sessionTags[sessionId].includes(tagId)) {
      sessionTags[sessionId].push(tagId);
      await chrome.storage.local.set({ [SESSION_TAGS_KEY]: sessionTags });
    }
  }

  /**
   * Remove tag from session
   */
  async removeTagFromSession(sessionId: string, tagId: string): Promise<void> {
    const sessionTags = await this.getAllSessionTags();

    if (sessionTags[sessionId]) {
      sessionTags[sessionId] = sessionTags[sessionId].filter(id => id !== tagId);

      // Clean up empty arrays
      if (sessionTags[sessionId].length === 0) {
        delete sessionTags[sessionId];
      }

      await chrome.storage.local.set({ [SESSION_TAGS_KEY]: sessionTags });
    }
  }

  /**
   * Get session tags
   */
  async getSessionTags(sessionId: string): Promise<string[]> {
    const sessionTags = await this.getAllSessionTags();
    return sessionTags[sessionId] || [];
  }

  /**
   * Get all session-tag mappings
   */
  async getAllSessionTags(): Promise<Record<string, string[]>> {
    const result = await chrome.storage.local.get(SESSION_TAGS_KEY);
    return (result[SESSION_TAGS_KEY] as Record<string, string[]>) || {};
  }

  /**
   * Create tag with specific ID (for import)
   */
  async createTagWithId(tag: Tag): Promise<void> {
    const tags = await this.getAllTags();

    // Check for duplicate ID
    if (tags.some(t => t.id === tag.id)) {
      return;
    }

    tags.push(tag);
    await chrome.storage.local.set({ [TAGS_KEY]: tags });
  }

  /**
   * Set all session-tag mappings (for import)
   */
  async setAllSessionTags(sessionTags: Record<string, string[]>): Promise<void> {
    await chrome.storage.local.set({ [SESSION_TAGS_KEY]: sessionTags });
  }

  /**
   * Get sessions by tag
   */
  async getSessionsByTag(tagId: string): Promise<string[]> {
    const sessionTags = await this.getAllSessionTags();
    const sessionIds: string[] = [];

    for (const [sessionId, tagIds] of Object.entries(sessionTags)) {
      if (tagIds.includes(tagId)) {
        sessionIds.push(sessionId);
      }
    }

    return sessionIds;
  }
}

// Singleton instance
export const tagStorage = new TagStorage();
