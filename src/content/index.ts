import { sessionStorage } from '../storage/session-storage';
import { detectPlatform, extractSessionId, createMessageExtractor } from '../utils/extractor';
import { startBatchCapture, pauseBatchCapture, resumeBatchCapture, cancelBatchCapture, isBatchCaptureRunning } from './batch-capture';
import type { Platform, Session, Message } from '../types';

const DEBUG = false;  // Disable verbose logging

function log(...args: any[]) {
  if (DEBUG) console.log('[OmniContext]', ...args);
}

let currentPlatform: Platform | null = null;
let currentSessionId: string | null = null;
let lastMessageCount = 0;
let lastMessageHash = '';
let pendingSave: number | null = null;
let observer: MutationObserver | null = null;

// Check if extension context is still valid
function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime.id;
  } catch {
    return false;
  }
}

// Fast hash for message comparison (avoid full JSON.stringify)
function hashMessages(messages: Message[]): string {
  if (messages.length === 0) return '';
  // Hash based on count + first & last message (more stable)
  const first = messages[0];
  const last = messages[messages.length - 1];
  return `${messages.length}:${first.role}:${first.content.slice(0, 50)}:${last.role}:${last.content.slice(-50)}`;
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

  // Initial capture
  setTimeout(tryCapture, 300);

  // Use MutationObserver for instant response to DOM changes
  observer = new MutationObserver(() => {
    // Debounce: only check after a short delay
    if (pendingSave) clearTimeout(pendingSave);
    pendingSave = window.setTimeout(tryCapture, 200);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Fallback polling (less frequent, just in case)
  setInterval(tryCapture, 2000);
}

function tryCapture() {
  if (!currentPlatform || !isExtensionContextValid()) return;

  try {
    const extractor = createMessageExtractor(currentPlatform);
    const messages = extractor.extractMessages();

    if (messages.length === 0) return;

    // Fast comparison: count + hash of last message
    const currentHash = hashMessages(messages);
    if (messages.length !== lastMessageCount || currentHash !== lastMessageHash) {
      lastMessageCount = messages.length;
      lastMessageHash = currentHash;

      // Save asynchronously without blocking
      saveSessionDebounced(messages);
    }
  } catch (err) {
    log('Capture error:', err);
  }
}

let saveTimeout: number | null = null;
let lastSavedMessages: Message[] = [];

function saveSessionDebounced(messages: Message[]) {
  // Debounce saves: wait 500ms before actually saving
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = window.setTimeout(async () => {
    // Final check: compare content hash with last saved
    const saveHash = hashMessages(messages);
    const lastSaveHash = hashMessages(lastSavedMessages);

    if (saveHash === lastSaveHash && messages.length === lastSavedMessages.length) {
      return; // No actual change
    }

    lastSavedMessages = [...messages]; // Copy to avoid reference issues
    await doSave(messages);
  }, 500);
}

async function doSave(messages: Message[]) {
  if (!currentPlatform || !currentSessionId) return;

  try {
    const extractor = createMessageExtractor(currentPlatform);
    const title = extractor.extractTitle();

    const now = Date.now();
    const session: Session = {
      id: currentSessionId,
      platform: currentPlatform,
      title: title || '未命名对话',
      sourceUrl: window.location.href,
      createdAt: now,
      updatedAt: now,
      messages: messages,
      messageCount: messages.length,
    };

    await sessionStorage.saveSessionOptimized(session);
    console.log('[OmniContext] ✓ Saved:', title, `(${messages.length}条消息)`);
  } catch (err: any) {
    if (!err?.message?.includes('Extension context invalidated')) {
      console.error('[OmniContext] Save failed:', err);
    }
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (observer) observer.disconnect();
  if (pendingSave) clearTimeout(pendingSave);
  if (saveTimeout) clearTimeout(saveTimeout);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-init on URL change (for SPAs)
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (observer) observer.disconnect();
    currentPlatform = null;
    currentSessionId = null;
    lastMessageCount = 0;
    lastMessageHash = '';
    lastSavedMessages = [];
    init();
  }
}, 1000);

// Listen for batch capture commands from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'BATCH_CAPTURE_START') {
    if (!currentPlatform) {
      sendResponse({ success: false, error: '未检测到支持的平台' });
      return true;
    }

    startBatchCapture(currentPlatform, (progress) => {
      // Send progress updates to popup
      chrome.runtime.sendMessage({
        type: 'BATCH_CAPTURE_PROGRESS',
        progress,
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'BATCH_CAPTURE_PAUSE') {
    pauseBatchCapture();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'BATCH_CAPTURE_RESUME') {
    resumeBatchCapture();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'BATCH_CAPTURE_CANCEL') {
    cancelBatchCapture();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'BATCH_CAPTURE_STATUS') {
    sendResponse({ running: isBatchCaptureRunning() });
    return true;
  }

  return false;
});
