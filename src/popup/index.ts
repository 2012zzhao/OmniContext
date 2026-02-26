import { sessionStorage } from '../storage/session-storage';
import { formatSessionForInjection } from '../utils/formatter';
import { formatPlatformName, detectPlatform } from '../utils/extractor';
import type { Platform, Session } from '../types';

// Platform icons
const PLATFORM_ICONS: Record<Platform, string> = {
  doubao: '🔴',
  yuanbao: '🟡',
  claude: '🟣',
};

// DOM Elements
const sessionListEl = document.getElementById('session-list')!;
const currentPageEl = document.getElementById('current-page')!;
const exportBtn = document.getElementById('export-btn')!;
const refreshBtn = document.getElementById('refresh-btn')!;
const toastEl = document.getElementById('toast')!;

// State
let currentPlatform: Platform | null = null;

// Initialize
async function init() {
  // Detect current platform
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      currentPlatform = detectPlatform(tab.url);
      updateCurrentPage();
    }
  } catch (e) {
    console.error('Failed to detect platform:', e);
  }

  // Load sessions
  await loadSessions();

  // Bind events
  exportBtn.addEventListener('click', handleExport);
  refreshBtn.addEventListener('click', loadSessions);
}

function updateCurrentPage() {
  if (currentPlatform) {
    const name = formatPlatformName(currentPlatform);
    currentPageEl.textContent = `📍 当前: ${name}`;
  } else {
    currentPageEl.textContent = '📍 未在支持的AI平台';
  }
}

async function loadSessions() {
  sessionListEl.innerHTML = '<div class="loading">加载中...</div>';

  const sessions = await sessionStorage.getAllSessions();

  if (sessions.length === 0) {
    sessionListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>还没有保存的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">在豆包、元宝或Claude聊天时<br>会自动保存</p>
      </div>
    `;
    return;
  }

  // Group by platform
  const grouped = sessions.reduce((acc, session) => {
    if (!acc[session.platform]) {
      acc[session.platform] = [];
    }
    acc[session.platform].push(session);
    return acc;
  }, {} as Record<Platform, Session[]>);

  // Render
  sessionListEl.innerHTML = Object.entries(grouped)
    .map(([platform, platformSessions]) => renderPlatformGroup(platform as Platform, platformSessions))
    .join('');

  // Bind events
  bindSessionEvents();
}

function renderPlatformGroup(platform: Platform, sessions: Session[]): string {
  const icon = PLATFORM_ICONS[platform];
  const name = formatPlatformName(platform);
  const isCurrent = currentPlatform === platform;

  return `
    <div class="platform-group">
      <div class="platform-header" data-platform="${platform}">
        ${icon} ${name}
        ${isCurrent ? '<span style="margin-left: 8px; font-size: 10px; background: #1890ff; color: white; padding: 2px 6px; border-radius: 4px;">当前</span>' : ''}
        <span class="platform-count">${sessions.length}个会话</span>
      </div>
      <div class="platform-sessions">
        ${sessions.map(session => renderSessionItem(session)).join('')}
      </div>
    </div>
  `;
}

function renderSessionItem(session: Session): string {
  const date = new Date(session.updatedAt).toLocaleDateString('zh-CN');

  return `
    <div class="session-item" data-id="${session.id}">
      <div class="session-info">
        <div class="session-title">${escapeHtml(session.title)}</div>
        <div class="session-meta">${date} · ${session.messageCount}条消息</div>
      </div>
      <div class="session-actions">
        <button class="btn-icon copy" title="复制上下文" data-action="copy">📋</button>
        <button class="btn-icon edit" title="编辑标题" data-action="edit">✏️</button>
        <button class="btn-icon delete" title="删除" data-action="delete">🗑️</button>
      </div>
    </div>
  `;
}

function bindSessionEvents() {
  // Copy buttons
  document.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const item = (e.target as HTMLElement).closest('.session-item');
      const id = item?.getAttribute('data-id');
      if (id) {
        await handleCopy(id);
      }
    });
  });

  // Edit buttons
  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const item = (e.target as HTMLElement).closest('.session-item');
      const id = item?.getAttribute('data-id');
      if (id) {
        await handleEdit(id);
      }
    });
  });

  // Delete buttons
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const item = (e.target as HTMLElement).closest('.session-item');
      const id = item?.getAttribute('data-id');
      if (id && confirm('确定要删除这个会话吗？')) {
        await handleDelete(id);
      }
    });
  });

  // Platform header toggle
  document.querySelectorAll('.platform-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      const sessions = header.nextElementSibling as HTMLElement;
      if (sessions) {
        sessions.style.display = sessions.style.display === 'none' ? 'block' : 'none';
      }
    });
  });
}

async function handleCopy(sessionId: string) {
  const session = await sessionStorage.getSession(sessionId);
  if (!session) {
    showToast('会话不存在');
    return;
  }

  const formatted = formatSessionForInjection(session, 'full');

  try {
    await navigator.clipboard.writeText(formatted);
    showToast('已复制到剪贴板！请粘贴到目标AI助手的输入框');
  } catch (err) {
    // Fallback for extension context
    const textArea = document.createElement('textarea');
    textArea.value = formatted;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('已复制到剪贴板！请粘贴到目标AI助手的输入框');
  }
}

async function handleEdit(sessionId: string) {
  const session = await sessionStorage.getSession(sessionId);
  if (!session) return;

  const newTitle = prompt('编辑会话标题:', session.title);
  if (newTitle && newTitle !== session.title) {
    await sessionStorage.updateSessionTitle(sessionId, newTitle);
    await loadSessions();
    showToast('标题已更新');
  }
}

async function handleDelete(sessionId: string) {
  await sessionStorage.deleteSession(sessionId);
  await loadSessions();
  showToast('会话已删除');
}

async function handleExport() {
  const data = await sessionStorage.exportAllSessions();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `omnicontext-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('备份文件已下载');
}

function showToast(message: string) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
