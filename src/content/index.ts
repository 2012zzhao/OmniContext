import { sessionStorage } from '../storage/session-storage';
import { detectPlatform, extractSessionId, createMessageExtractor } from '../utils/extractor';
import type { Platform, Session, Message } from '../types';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) console.log('[OmniContext]', ...args);
}

let currentPlatform: Platform | null = null;
let currentSessionId: string | null = null;
let lastMessages: Message[] = [];
let captureInterval: number | null = null;
let isContextValid = true;

// Check if extension context is still valid
function isExtensionContextValid(): boolean {
  try {
    // This will throw if context is invalidated
    return !!chrome.runtime.id;
  } catch {
    return false;
  }
}

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

    startCapturing();
  } catch (err) {
    console.error('[OmniContext] Init failed:', err);
  }
}

function startCapturing() {
  log('Starting capture...');

  // Initial capture with short delay
  setTimeout(() => {
    tryCapture();
  }, 500);

  // Capture every 1 second for faster response
  captureInterval = window.setInterval(() => {
    if (!isExtensionContextValid()) {
      if (isContextValid) {
        isContextValid = false;
        log('Extension context invalidated. Stopping capture.');
        if (captureInterval) {
          clearInterval(captureInterval);
          captureInterval = null;
        }
      }
      return;
    }
    tryCapture();
  }, 1000);
}

function tryCapture() {
  if (!currentPlatform) return;

  try {
    const extractor = createMessageExtractor(currentPlatform);
    const messages = extractor.extractMessages();

    if (messages.length > 0) {
      if (JSON.stringify(messages) !== JSON.stringify(lastMessages)) {
        log('New messages detected:', messages.length);
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

  // Check context before attempting save
  if (!isExtensionContextValid()) {
    if (isContextValid) {
      isContextValid = false;
      log('Extension context invalidated. Stopping save.');
    }
    return;
  }

  try {
    const extractor = createMessageExtractor(currentPlatform);
    const title = extractor.extractTitle();

    if (lastMessages.length === 0) return;

    const now = Date.now();
    const session: Session = {
      id: currentSessionId,
      platform: currentPlatform,
      title: title || '未命名对话',
      sourceUrl: window.location.href,
      createdAt: now,
      updatedAt: now,
      messages: lastMessages,
      messageCount: lastMessages.length,
    };

    // Use optimized save that doesn't double-read
    await sessionStorage.saveSessionOptimized(session);
    log('✓ Saved:', title, `(${lastMessages.length}条消息)`);
  } catch (err: any) {
    // Handle extension context invalidated gracefully
    if (err?.message?.includes('Extension context invalidated')) {
      if (isContextValid) {
        isContextValid = false;
        log('Extension context invalidated. Please refresh the page.');
      }
    } else {
      console.error('[OmniContext] Save failed:', err);
    }
  }
}

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
