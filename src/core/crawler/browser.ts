


import { chromium, Browser, BrowserContext } from 'playwright';

export class BrowserInitError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'BrowserInitError';
    Object.setPrototypeOf(this, BrowserInitError.prototype);
  }
}

let browserInstance: Browser | null = null;
const activeContexts = new Set<BrowserContext>();

export async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }

  const launchArgs = ['--disable-blink-features=AutomationControlled', '--no-sandbox'];

  // Try 1: Bundled Chromium
  try {
    browserInstance = await chromium.launch({
      headless: true,
      args: launchArgs,
    });
    return browserInstance;
  } catch (error: any) {
    console.warn('Failed to launch bundled Playwright browser, trying system browser fallback...', error.message);
  }

  // Try 2: System Chromium
  const systemPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (systemPath) {
    try {
      browserInstance = await chromium.launch({
        executablePath: systemPath,
        headless: true,
        args: launchArgs,
      });
      return browserInstance;
    } catch (error: any) {
      console.warn(`Failed to launch system browser at ${systemPath}:`, error.message);
    }
  } else {
    console.warn('PLAYWRIGHT_CHROMIUM_PATH env var is not set.');
  }

  // If both failed, log and throw typed error
  const errMessage = 'Playwright browser launch failed: bundled browser not found and system browser fallback failed or was not configured.';
  console.error(errMessage);
  throw new BrowserInitError(errMessage);
}

export async function newContext(): Promise<BrowserContext> {
  const b = await getBrowser();
  const context = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  // Block images, fonts, media via context route interception
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'media'].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  activeContexts.add(context);

  // Clean up references when context is closed externally
  context.on('close', () => {
    activeContexts.delete(context);
  });

  return context;
}

export async function cleanup(): Promise<void> {
  // Close all active contexts
  for (const context of activeContexts) {
    try {
      await context.close();
    } catch (e) {
      console.error('Error closing context during cleanup:', e);
    }
  }
  activeContexts.clear();

  // Close browser instance
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      console.error('Error closing browser during cleanup:', e);
    }
    browserInstance = null;
  }
}

// Register exit handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, cleaning up browser pool...');
    await cleanup();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    console.log('SIGINT received, cleaning up browser pool...');
    await cleanup();
    process.exit(0);
  });
}
