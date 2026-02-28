import { sessionStorage } from '../storage/session-storage';
import { tagStorage } from '../storage/tag-storage';
import { formatSessionForInjection } from '../utils/formatter';
import { formatPlatformName, detectPlatform } from '../utils/extractor';
import type { Platform, Session, Tag } from '../types';

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
const searchInput = document.getElementById('search-input')! as HTMLInputElement;
const searchClear = document.getElementById('search-clear')! as HTMLButtonElement;
const filterPlatform = document.getElementById('filter-platform')! as HTMLSelectElement;
const filterTags = document.getElementById('filter-tags')! as HTMLSelectElement;

// State
let currentPlatform: Platform | null = null;
let allTags: Tag[] = [];
let allSessions: Session[] = [];

// Search state
let searchKeyword = '';
let selectedPlatform: Platform | '' = '';
let selectedTagIds: string[] = [];

// Track collapsed state of each platform (persisted in session)
const collapsedPlatforms = new Set<string>();

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

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

  // Search events
  searchInput.addEventListener('input', debounce(handleSearch, 300));
  searchClear.addEventListener('click', clearSearch);
  filterPlatform.addEventListener('change', handleFilterChange);
  filterTags.addEventListener('change', handleTagFilterChange);
}

function handleSearch() {
  searchKeyword = searchInput.value.trim();
  searchClear.style.display = searchKeyword ? 'flex' : 'none';
  renderSessions();
}

function clearSearch() {
  searchInput.value = '';
  searchKeyword = '';
  searchClear.style.display = 'none';
  renderSessions();
}

function handleFilterChange() {
  selectedPlatform = filterPlatform.value as Platform | '';
  renderSessions();
}

function handleTagFilterChange() {
  // Get all selected options from multi-select
  selectedTagIds = Array.from(filterTags.selectedOptions).map(opt => opt.value);
  renderSessions();
}

function highlightText(text: string, keyword: string): string {
  if (!keyword) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return escaped.replace(regex, '<span class="highlight">$1</span>');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  // Load all tags
  allTags = await tagStorage.getAllTags();

  // Update tag filter dropdown
  filterTags.innerHTML = '<option value="">全部标签</option>' +
    allTags.map(tag =>
    `<option value="${tag.id}">${tag.name}</option>`
  ).join('');

  const sessions = await sessionStorage.getAllSessions();
  allSessions = sessions;

  renderSessions();
}

async function renderSessions() {
  if (allSessions.length === 0) {
    sessionListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>还没有保存的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">在豆包、元宝或Claude聊天时<br>会自动保存</p>
      </div>
    `;
    return;
  }

  // Filter sessions
  let filtered = [...allSessions];

  // Platform filter
  if (selectedPlatform) {
    filtered = filtered.filter(s => s.platform === selectedPlatform);
  }

  // Tag filter (multi-select) - session must have ALL selected tags
  if (selectedTagIds.length > 0) {
    const sessionWithTagPromises = filtered.map(async session => {
    const sessionTagIds = await tagStorage.getSessionTags(session.id);
    return { session, sessionTagIds };
  });

  const sessionsWithTags = await Promise.all(sessionWithTagPromises);
  filtered = sessionsWithTags
    .filter(item => selectedTagIds.every(tagId => item.sessionTagIds.includes(tagId)))
    .map(item => item.session);
  }

  // Keyword search
  if (searchKeyword) {
    const keyword = searchKeyword.toLowerCase();
    filtered = filtered.filter(session => {
      const titleMatch = session.title.toLowerCase().includes(keyword);
      const contentMatch = session.messages.some(m =>
        m.content.toLowerCase().includes(keyword)
      );
      return titleMatch || contentMatch;
    });
  }

  // Render results
  if (filtered.length === 0 && (searchKeyword || selectedPlatform || selectedTagIds.length > 0)) {
    sessionListEl.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <p>没有找到匹配的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">试试其他关键词或筛选条件</p>
      </div>
    `;
    return;
  }

  // Group by platform (preserving collapse state)
  const grouped = filtered.reduce((acc, session) => {
    if (!acc[session.platform]) {
      acc[session.platform] = [];
    }
    acc[session.platform].push(session);
    return acc;
  }, {} as Record<Platform, Session[]>);

  // Render
  const platformHtmls = await Promise.all(
    Object.entries(grouped).map(async ([platform, platformSessions]) => {
      const sessionHtmls = await Promise.all(
        platformSessions.map(session => renderSessionItemWithTags(session))
      );
      return renderPlatformGroupWithHtml(platform as Platform, sessionHtmls);
    })
  );

  sessionListEl.innerHTML = platformHtmls.join('');

  // Bind events
  bindSessionEvents();
}

async function renderSessionItemWithTags(session: Session): Promise<string> {
  const sessionTags = await tagStorage.getSessionTags(session.id);
  const tagObjects = allTags.filter(t => sessionTags.includes(t.id));
  return renderSessionItemWithHighlight(session, tagObjects);
}

function renderSessionItemWithHighlight(session: Session, tags: Tag[]): string {
  const date = new Date(session.updatedAt).toLocaleDateString('zh-CN');
  const tagsHtml = tags.map(tag =>
    `<span class="tag" style="background: ${tag.color}">${escapeHtml(tag.name)}</span>`
  ).join('');

  // Highlight title if searching
  const titleHtml = highlightText(session.title, searchKeyword);

  return `
    <div class="session-item" data-id="${session.id}">
      <div class="session-info">
        <div class="session-title">${titleHtml}</div>
        <div class="session-tags">${tagsHtml}</div>
        <div class="session-meta">${date} · ${session.messageCount}条消息</div>
      </div>
      <div class="session-actions">
        <button class="btn-icon copy" title="复制上下文" data-action="copy">📋</button>
        <button class="btn-icon tag-btn" title="管理标签" data-action="tags">🏷️</button>
        <button class="btn-icon edit" title="编辑标题" data-action="edit">✏️</button>
        <button class="btn-icon delete" title="删除" data-action="delete">🗑️</button>
      </div>
    </div>
  `;
}

function renderPlatformGroupWithHtml(platform: Platform, sessionHtmls: string[]): string {
  const icon = PLATFORM_ICONS[platform];
  const name = formatPlatformName(platform);
  const isCurrent = currentPlatform === platform;
  const isCollapsed = collapsedPlatforms.has(platform);

  return `
    <div class="platform-group">
      <div class="platform-header ${isCollapsed ? 'collapsed' : ''}" data-platform="${platform}">
        ${icon} ${name}
        ${isCurrent ? '<span style="margin-left: 8px; font-size: 10px; background: #1890ff; color: white; padding: 2px 6px; border-radius: 4px;">当前</span>' : ''}
        <span class="platform-count">${sessionHtmls.length}个会话</span>
      </div>
      <div class="platform-sessions" style="display: ${isCollapsed ? 'none' : 'block'}">
        ${sessionHtmls.join('')}
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

  // Tag buttons
  document.querySelectorAll('[data-action="tags"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
    const item = (e.target as HTMLElement).closest('.session-item');
    const id = item?.getAttribute('data-id');
    if (id) {
      await handleManageTags(id);
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
    const platform = header.getAttribute('data-platform') as Platform;
    header.classList.toggle('collapsed');
    const isNowCollapsed = header.classList.contains('collapsed');

    // Track collapsed state
    if (isNowCollapsed) {
    collapsedPlatforms.add(platform);
  } else {
    collapsedPlatforms.delete(platform);
  }

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

async function handleManageTags(sessionId: string) {
  const session = await sessionStorage.getSession(sessionId);
  if (!session) return;

  // Get current tags for this session
  const sessionTagIds = await tagStorage.getSessionTags(sessionId);
  const allTagsList = await tagStorage.getAllTags();

  // Show simple prompt-based UI for now
  const options = allTagsList.map((tag, index) =>
    `${index + 1}. ${tag.name} ${sessionTagIds.includes(tag.id) ? '(已添加)' : ''}`
  ).join('\n');

  const choice = prompt(
    `管理 "${session.title}" 的标签:\n\n${options}\n\n输入编号添加/删除标签，或输入新标签名称创建：`
  );

  if (!choice) return;

  const numChoice = parseInt(choice, 10);
  if (!isNaN(numChoice) && numChoice > 0 && numChoice <= allTagsList.length) {
    // Toggle existing tag
    const selectedTag = allTagsList[numChoice - 1];
    if (sessionTagIds.includes(selectedTag.id)) {
      await tagStorage.removeTagFromSession(sessionId, selectedTag.id);
      showToast(`已移除标签: ${selectedTag.name}`);
    } else {
      await tagStorage.addTagToSession(sessionId, selectedTag.id);
      showToast(`已添加标签: ${selectedTag.name}`);
    }
  } else {
    // Create new tag
    const color = '#1890ff'; // Default blue
    const newTag = await tagStorage.createTag(choice.trim(), color);
    if (newTag) {
    await tagStorage.addTagToSession(sessionId, newTag.id);
    showToast(`已创建并添加标签: ${newTag.name}`);
  } else {
    showToast('标签已存在或创建失败');
  }
  }

  await loadSessions();
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
