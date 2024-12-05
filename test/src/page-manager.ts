import puppeteer, { Page, Browser } from 'puppeteer';

export class PageManager {
    private browser!: Browser; 
    private page: Page | null = null;

  // Launch the browser and create a new page
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({ headless: false });
    const [page] = await this.browser.pages();
    this.page = page;
    await this.page.setViewport({ width: 1024, height: 800 });
  }

  async navigateTo(url: string, options?: { skipNetworkIdle?: boolean }): Promise<void> {
    if (!this.page) {
      throw new Error("Page is not initialized.");
    }
    await this.page.goto(url);
    
    if (!options?.skipNetworkIdle) {
      await this.page.waitForNetworkIdle();
    }
    await this.page.waitForFunction('document.readyState === "complete"');
  }

  // Get the page instance
  getPage(): Page {
    if (!this.page) {
      throw new Error("Page is not initialized.");
    }
    return this.page;
  }

  // Close the browser
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}