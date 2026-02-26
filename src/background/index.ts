// Background service worker
// Handles extension lifecycle events

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[OmniContext] Extension installed', details);

  // Initialize storage
  chrome.storage.local.get('sessions', (result) => {
    if (!result.sessions) {
      chrome.storage.local.set({ sessions: [] });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'SAVE_SESSION') {
    // Session is saved directly by content script via storage module
    sendResponse({ success: true });
  }
  return true;
});

// Update icon based on current tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateIconForUrl(tab.url);
  } catch (e) {
    // Ignore errors
  }
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    updateIconForUrl(changeInfo.url);
  }
});

function updateIconForUrl(url?: string) {
  if (!url) return;

  const isSupported =
    url.includes('doubao.com') ||
    url.includes('yuanbao.tencent.com') ||
    url.includes('claude.ai');

  // Set badge to indicate support status
  if (isSupported) {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#52c41a' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}
