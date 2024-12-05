import { Page } from "puppeteer";
import fs from 'fs';
import path from 'path';

export class Screenshot {
  private page: Page;
  baseUrl: string | URL | undefined;

  constructor(page: Page) {
    this.page = page; 
  }

  async capture(): Promise<string> {
    // Define the path where the screenshot will be saved
    const screenshotDir = path.resolve(__dirname, "data");
    const screenshotPath = path.join(screenshotDir, `${new URL(this.page.url()).hostname}-${Date.now()}.png`);

    // Ensure the 'data' directory exists, create it if not
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Capture the screenshot
    await this.page.screenshot({ path: screenshotPath });

    return screenshotPath;
  }

}
