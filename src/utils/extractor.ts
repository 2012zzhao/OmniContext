import type { Platform, Message } from '../types';

interface PlatformConfig {
  hostname: string;
  titleSelectors: string[];
  messageSelectors: {
    container: string;
    user: string;
    assistant: string;
  };
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  doubao: {
    hostname: 'doubao.com',
    titleSelectors: [
      '[class*="chat-title"]',
      '[class*="header-title"]',
      'h1[class*="title"]',
      '[data-testid="chat-title"]',
      '[class*="conversation-title"]',
      '[class*="session-title"]',
      'title',
    ],
    messageSelectors: {
      container: '[class*="message-list"], [class*="chat-container"], [class*="conversation-content"], [class*="message-container"]',
      user: '[class*="message-block-container"] [class*="bg-s-color-bg-trans"], [class*="user-message"], [data-role="user"]',
      assistant: '[class*="message-block-container"]:not(:has([class*="bg-s-color-bg-trans"])), [class*="bot-message"], [class*="ai-message"], [data-role="assistant"]',
    },
  },
  yuanbao: {
    hostname: 'yuanbao.tencent.com',
    titleSelectors: ['.session-title', '.chat-title', '.active .title', '[data-testid="session-title"]'],
    messageSelectors: {
      container: '.message-container, .chat-content, .conversation-list',
      user: '.user-msg, .message.user, [data-role="user"]',
      assistant: '.assistant-msg, .message.assistant, .bot-reply, [data-role="assistant"]',
    },
  },
  claude: {
    hostname: 'claude.ai',
    titleSelectors: ['.conversation-title', '[aria-selected="true"] .title', '.chat-title'],
    messageSelectors: {
      container: '.conversation-content, .messages-container',
      user: '.human-message, .message.human, [data-testid="human-message"]',
      assistant: '.assistant-message, .message.assistant, [data-testid="assistant-message"]',
    },
  },
};

export function detectPlatform(url: string): Platform | null {
  const hostname = new URL(url).hostname;

  if (hostname.includes('doubao.com')) return 'doubao';
  if (hostname.includes('yuanbao.tencent.com')) return 'yuanbao';
  if (hostname.includes('claude.ai')) return 'claude';

  return null;
}

export function extractSessionId(url: string, _platform: Platform): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);

  // Try to find UUID or ID in path
  for (const part of pathParts) {
    if (part && part !== 'chat' && part !== 'c' && part.length >= 4) {
      return part;
    }
  }

  // Fallback: use timestamp for new chats
  return `new-${Date.now()}`;
}

export function formatPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    doubao: '豆包',
    yuanbao: '元宝',
    claude: 'Claude',
  };
  return names[platform];
}

export interface MessageExtractor {
  platform: Platform;
  extractTitle(): string;
  extractMessages(): Message[];
}

class PlatformMessageExtractor implements MessageExtractor {
  constructor(public platform: Platform) {}

  private get config(): PlatformConfig {
    return PLATFORM_CONFIGS[this.platform];
  }

  extractTitle(): string {
    // Try each selector
    for (const selector of this.config.titleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback: use first user message or default
    const firstUserMessage = document.querySelector(this.config.messageSelectors.user);
    if (firstUserMessage?.textContent?.trim()) {
      const text = firstUserMessage.textContent.trim();
      return text.slice(0, 20) + (text.length > 20 ? '...' : '');
    }

    return `未命名对话 - ${new Date().toLocaleDateString()}`;
  }

  extractMessages(): Message[] {
    // Special handling for Doubao
    if (this.platform === 'doubao') {
      return this.extractDoubaoMessages();
    }

    const messages: Message[] = [];
    const container = document.querySelector(this.config.messageSelectors.container);

    if (!container) {
      return this.extractMessagesFromDocument();
    }

    const allElements = container.querySelectorAll(
      `${this.config.messageSelectors.user}, ${this.config.messageSelectors.assistant}`
    );

    allElements.forEach((el, index) => {
      const isUser = el.matches(this.config.messageSelectors.user);
      const content = this.extractTextContent(el);

      if (content) {
        messages.push({
          id: `${this.platform}-msg-${index}`,
          role: isUser ? 'user' : 'assistant',
          content,
          timestamp: Date.now(),
        });
      }
    });

    return messages;
  }

  private extractDoubaoMessages(): Message[] {
    const messages: Message[] = [];

    // Find all message blocks
    const messageBlocks = document.querySelectorAll('[class*="message-block-container"]');

    messageBlocks.forEach((block, index) => {
      // Check if this block has user indicator (bg-s-color-bg-trans class)
      const userElement = block.querySelector('[class*="bg-s-color-bg-trans"]');
      const contentElement = block.querySelector('[class*="container-"]');

      if (contentElement) {
        const content = this.extractTextContent(contentElement);
        if (content && content.length > 0) {
          messages.push({
            id: `doubao-msg-${index}`,
            role: userElement ? 'user' : 'assistant',
            content,
            timestamp: Date.now(),
          });
        }
      }
    });

    return messages;
  }

  private extractMessagesFromDocument(): Message[] {
    const messages: Message[] = [];

    const userElements = document.querySelectorAll(this.config.messageSelectors.user);
    const assistantElements = document.querySelectorAll(this.config.messageSelectors.assistant);

    // Merge and sort by DOM order
    const allElements: Array<{ el: Element; isUser: boolean }> = [
      ...Array.from(userElements).map(el => ({ el, isUser: true })),
      ...Array.from(assistantElements).map(el => ({ el, isUser: false })),
    ];

    // Sort by document position
    allElements.sort((a, b) => {
      const position = a.el.compareDocumentPosition(b.el);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    allElements.forEach(({ el, isUser }, index) => {
      const content = this.extractTextContent(el);
      if (content) {
        messages.push({
          id: `${this.platform}-msg-${index}`,
          role: isUser ? 'user' : 'assistant',
          content,
          timestamp: Date.now(),
        });
      }
    });

    return messages;
  }

  private extractTextContent(element: Element): string {
    // Try to find text content in common structures
    const textSelectors = [
      '.text-content',
      '.message-content',
      '.content',
      'p',
      '.text',
    ];

    for (const selector of textSelectors) {
      const textEl = element.querySelector(selector);
      if (textEl?.textContent?.trim()) {
        return textEl.textContent.trim();
      }
    }

    // Fallback to element's own text
    return element.textContent?.trim() || '';
  }
}

export function createMessageExtractor(platform: Platform): MessageExtractor {
  return new PlatformMessageExtractor(platform);
}

// Debug function to help identify selectors
export function debugPlatformElements(platform: Platform): void {
  console.log(`[OmniContext] Debugging ${platform}...`);

  const config = PLATFORM_CONFIGS[platform];

  // Check title selectors
  console.log('=== Title Selectors ===');
  for (const selector of config.titleSelectors) {
    const el = document.querySelector(selector);
    console.log(`${selector}: ${el ? '✓' : '✗'} ${el?.textContent?.slice(0, 50) || ''}`);
  }

  // Check container
  console.log('=== Message Container ===');
  const container = document.querySelector(config.messageSelectors.container);
  console.log(`Container found: ${container ? '✓' : '✗'}`);

  // Check user messages
  console.log('=== User Messages ===');
  const userMessages = document.querySelectorAll(config.messageSelectors.user);
  console.log(`Found ${userMessages.length} user messages`);
  userMessages.forEach((el, i) => {
    if (i < 3) {
      console.log(`  [${i}] ${el.className?.slice(0, 50)}: ${el.textContent?.slice(0, 50)}`);
    }
  });

  // Check assistant messages
  console.log('=== Assistant Messages ===');
  const assistantMessages = document.querySelectorAll(config.messageSelectors.assistant);
  console.log(`Found ${assistantMessages.length} assistant messages`);
  assistantMessages.forEach((el, i) => {
    if (i < 3) {
      console.log(`  [${i}] ${el.className?.slice(0, 50)}: ${el.textContent?.slice(0, 50)}`);
    }
  });

  // Try to find any element containing common chat text patterns
  console.log('=== Auto-detect Attempt ===');
  const allElements = document.querySelectorAll('div');
  const candidates = Array.from(allElements).filter(el => {
    const text = el.textContent || '';
    return text.length > 20 && text.length < 500 &&
           (el.className?.toLowerCase().includes('message') ||
            el.className?.toLowerCase().includes('chat') ||
            el.className?.toLowerCase().includes('bubble'));
  }).slice(0, 5);

  console.log('Possible message elements:');
  candidates.forEach((el, i) => {
    console.log(`  [${i}] class="${el.className}" text="${el.textContent?.slice(0, 80)}"`);
  });
}
