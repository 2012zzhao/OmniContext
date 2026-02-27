import { sessionStorage } from '../storage/session-storage';
import { detectPlatform, extractSessionId, createMessageExtractor, debugPlatformElements } from '../utils/extractor';
import type { Platform, Session, Message } from '../types';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) console.log('[OmniContext]', ...args);
}

let currentPlatform: Platform | null = null;
let currentSessionId: string | null = null;
let lastMessages: Message[] = [];

function init() {
  try {
    const url = window.location.href;
    currentPlatform = detectPlatform(url);

    if (!currentPlatform) {
      log('Platform not detected');
      return;
    }

    currentSessionId = extractSessionId(url, currentPlatform);
    log('Detected:', currentPlatform, 'Session:', currentSessionId);

    // Debug: show what elements we can find
    try {
      debugPlatformElements(currentPlatform);
    } catch (e) {
      log('Debug failed:', e);
    }

    startCapturing();
  } catch (err) {
    console.error('[OmniContext] Init failed:', err);
  }
}

function startCapturing() {
  log('Starting capture...');

  // Delay initial capture to ensure DOM is ready
  setTimeout(() => {
    tryCapture();
  }, 2000);

  setInterval(tryCapture, 3000);
}

function tryCapture() {
  if (!currentPlatform) return;

  try {
    const extractor = createMessageExtractor(currentPlatform);
    const messages = extractor.extractMessages();

    log('Found messages:', messages.length);

    if (messages.length > 0) {
      if (JSON.stringify(messages) !== JSON.stringify(lastMessages)) {
        log('New messages detected, saving...');
        lastMessages = messages;
        saveSession();
      }
    }
  } catch (err) {
    log('Capture error:', err);
  }
}

async function saveSession() {
  if (!currentPlatform || !currentSessionId) return;

  try {
    const extractor = createMessageExtractor(currentPlatform);
    const title = extractor.extractTitle();

    if (lastMessages.length === 0) return;

    const session: Session = {
      id: currentSessionId,
      platform: currentPlatform,
      title: title || '未命名对话',
      sourceUrl: window.location.href,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: lastMessages,
      messageCount: lastMessages.length,
    };

    const existing = await sessionStorage.getSession(currentSessionId);
    if (existing) session.createdAt = existing.createdAt;

    await sessionStorage.saveSession(session);
    log('✓ Saved:', title, `(${lastMessages.length}条消息)`);
  } catch (err) {
    console.error('[OmniContext] Save failed:', err);
  }
}

// Expose debug function to window for manual debugging
(window as any).debugAIMemoryBridge = () => {
  if (currentPlatform) {
    debugPlatformElements(currentPlatform);
  } else {
    console.log('No platform detected');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-init on URL change
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    currentPlatform = null;
    currentSessionId = null;
    lastMessages = [];
    init();
  }
}, 1000);
