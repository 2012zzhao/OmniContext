import type { Session, Platform } from '../types';

const STORAGE_KEY = 'sessions';

export class SessionStorage {
  /**
   * Save or update a session
   */
  async saveSession(session: Session): Promise<void> {
    const sessions = await this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = {
        ...session,
        updatedAt: Date.now(),
      };
    } else {
      sessions.push(session);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
  }

  /**
   * Optimized save - preserves createdAt without double-reading
   */
  async saveSessionOptimized(session: Session): Promise<void> {
    const sessions = await this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    if (existingIndex >= 0) {
      // Preserve original createdAt
      session.createdAt = sessions[existingIndex].createdAt;
      sessions[existingIndex] = {
        ...session,
        updatedAt: Date.now(),
      };
    } else {
      sessions.push(session);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
  }

  /**
   * Get a session by ID
   */
  async getSession(id: string): Promise<Session | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<Session[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as Session[]) || [];
  }

  /**
   * Get sessions filtered by platform
   */
  async getSessionsByPlatform(platform: Platform): Promise<Session[]> {
    const sessions = await this.getAllSessions();
    return sessions.filter(s => s.platform === platform);
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(id: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const filtered = sessions.filter(s => s.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }

  /**
   * Update session title
   */
  async updateSessionTitle(id: string, title: string): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      session.title = title;
      session.updatedAt = Date.now();
      await this.saveSession(session);
    }
  }

  /**
   * Export all sessions as JSON
   */
  async exportAllSessions(): Promise<string> {
    const sessions = await this.getAllSessions();
    return JSON.stringify(sessions, null, 2);
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  }

  /**
   * Import sessions (add or replace based on mode)
   */
  async importSessions(sessions: Session[], mode: 'merge-keep' | 'merge-overwrite' | 'replace'): Promise<number> {
    if (mode === 'replace') {
      await this.clearAllSessions();
      await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
      return sessions.length;
    }

    const existingSessions = await this.getAllSessions();
    const existingMap = new Map(existingSessions.map(s => [s.id, s]));

    for (const session of sessions) {
      if (mode === 'merge-keep') {
        // Only add if not exists
        if (!existingMap.has(session.id)) {
          existingMap.set(session.id, session);
        }
      } else {
        // merge-overwrite: add or replace
        existingMap.set(session.id, session);
      }
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: Array.from(existingMap.values()) });
    return sessions.length;
  }
}

// Singleton instance
export const sessionStorage = new SessionStorage();
