

import { Page } from 'puppeteer';

export class BaseElement {
    constructor(private page: Page, private x: number, private y: number) {}

    async click() {
        await this.mark();
        await this.page.mouse.click(this.x, this.y);
    }

    async type(text: string) {
        await this.page.mouse.click(this.x, this.y);  
        await this.page.keyboard.type(text);   
    }

    async mark() {
        await this.page.evaluate((x, y) => {
            const highlight = document.createElement('div');
            highlight.style.position = 'absolute';
            highlight.style.left = `${x}px`;
            highlight.style.top = `${y}px`;
            highlight.style.width = '30px';
            highlight.style.height = '30px';
            highlight.style.borderRadius = '50%';
            highlight.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
            highlight.style.zIndex = '9999';
            document.body.appendChild(highlight);
        }, this.x, this.y);
    }
}