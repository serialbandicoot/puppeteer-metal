import { Page } from 'puppeteer';
import { Screenshot } from '../screenshot';
import { PredictionResult, TablePrediction, TablePredictionResult, TextPredictionResult, XYCoords } from '../types';
import { Prediction } from '../prediction';
import { console } from 'inspector';
import {toDataFrame, TableData} from 'html-table-to-dataframe'

export type UIElementButton = {
    click: () => Promise<void>;
    label: string;
    model: "form-segmentation" | "auth-detection";
}

export type UITableElement = {
    getTable: () => Promise<TableData>;
    label: string;
    model: string;
}

export type UIElementInput = {
    click: () => Promise<void>;
    fill: (keys: string) => Promise<void>;
    label: string;
    model: "form-segmentation" | "auth-detection";
}

export class BasePage {
    
    readonly page: Page; 

    constructor(page: Page) {
        this.page = page;
    }

    async takeScreenshot() {
        const screenshot = new Screenshot(this.page);
        return await screenshot.capture();
    }

    async mark(xyCoords: XYCoords | undefined, color: string = 'rgba(255, 0, 0, 0.5)') {
        if (!xyCoords) {
            throw new Error('Invalid coordinates');
        }

        await this.page.evaluate((x, y, color) => {
            const highlight = document.createElement('div');
            highlight.style.position = 'absolute';
            highlight.style.left = `${x}px`;
            highlight.style.top = `${y}px`;
            highlight.style.width = '30px';
            highlight.style.height = '30px';
            highlight.style.borderRadius = '50%';
            highlight.style.backgroundColor = color;
            highlight.style.zIndex = '9999';
            document.body.appendChild(highlight);
        }, xyCoords.x, xyCoords.y, color);
    }

    async removeMarks() {   
        try {
            await this.page.evaluate(() => {
              const highlights = document.querySelectorAll('div[style*="z-index: 9999"]');
              highlights.forEach(highlight => highlight.remove());
            });
          } catch {
            console.error("ERROR: While removing highlights");
          }
    }

    async click(xyCoords: XYCoords | undefined) {
        if (!xyCoords) {
            throw new Error('Invalid coordinates');
        }
        await this.page.mouse.click(xyCoords.x, xyCoords.y);
        await this.page.waitForFunction('document.readyState === "complete"');
        await this.sleep(100);
    }

    getHighestProbabilityIndexByLabel(predictions: TextPredictionResult[], label: string) {
        // Initialize variables to track the highest probability and its index
        let highestIndex = -1;
        let highestProbability = -Infinity;
    
        // Loop through the predictions to find the highest probability for the specified label
        predictions.forEach((prediction, index) => {
            if (prediction.label === label && prediction.probability > highestProbability) {
                highestProbability = prediction.probability;
                highestIndex = index;
            }
        });
    
        return highestIndex; // Returns -1 if no match is found
    }

    async handleClick(label: string, model: "form-segmentation" | "auth-detection") {
        const filePath = await this.takeScreenshot();
        const prediction = new Prediction(filePath);
        const predictions: PredictionResult[] = await prediction.getPredictions(model);
        const xyCoords = prediction.getPredictionByLabel(predictions, label);
        await this.mark(xyCoords);
        await this.click(xyCoords);
        await this.removeMarks();
    }

    async handleFill(label: string, model: "form-segmentation" | "auth-detection", keys: string) {
        const filePath = await this.takeScreenshot();
        const prediction = new Prediction(filePath);
        const predictions: PredictionResult[] = await prediction.getPredictions(model);

        const results = predictions[0].model_1.map(element => element.result);
        const sentiment = await prediction.getFormPrediction(results)

        const highestIndex = this.getHighestProbabilityIndexByLabel(sentiment, label);

        const highestPrediction = predictions[0].model_predictions.predictions.predictions[highestIndex]
        const xyCoords = {
            x: highestPrediction.x,
            y: highestPrediction.y
        } as XYCoords;

        await this.mark(xyCoords);
        await this.click(xyCoords);
        await this.page.keyboard.type(keys, { delay: 100 }); 
        await this.removeMarks();
    }

    async handleTable(model: string): Promise<TableData> {
        const filePath = await this.takeScreenshot();
        const prediction = new Prediction(filePath);
        const result: TablePredictionResult = await prediction.getTablePrediction(model);
        
        if (!result.predictions || result.predictions.length === 0) {
            throw new Error("No predictions found.");
          }

        const topPrediction = result.predictions.reduce((highest, current) =>
            current.confidence > highest.confidence ? current : highest
        );;

        const xyCoords = {
            x: topPrediction.x,
            y: topPrediction.y
        } as XYCoords;

        const { insideTable, locator, outerHTML } = await this.page.evaluate((x, y) => {
            // Get the element at the given coordinates
            const element = document.elementFromPoint(x, y);
          
            // Navigate up the DOM tree to check if it’s inside a table
            let currentElement = element;
            while (currentElement) {
              if (currentElement.tagName === 'TABLE') {
                // If the table is found, generate a query selector for it
                const selector = currentElement.id
                  ? `#${currentElement.id}` // If the table has an id
                  : currentElement.className
                  ? `.${currentElement.className.split(' ').join('.')}` // If the table has a class
                  : 'table'; // If the table doesn't have id or class, fallback to the tag name
          
                // Get the outerHTML of the table
                const outerHTML = currentElement.outerHTML;
          
                return { insideTable: true, locator: selector, outerHTML }; // Return all the relevant data
              }
              currentElement = currentElement.parentElement;
            }
          
            return { insideTable: false, locator: null, outerHTML: null }; // Return nulls if no table is found
          }, xyCoords.x, xyCoords.y);
          
          if (insideTable) {
            console.log(`Click at (${xyCoords.x}, ${xyCoords.y}) is inside a table.`);
            console.log(`Table locator: document.querySelector('${locator}')`);
            console.log('OuterHTML of the table:', outerHTML);
          } else {
            console.log(`Click at (${xyCoords.x}, ${xyCoords.y}) is NOT inside a table.`);
          }

          if (!outerHTML) {
            throw new Error('No table found');
          }
          await this.mark(xyCoords);
          const dataFrame = toDataFrame(outerHTML)

        return dataFrame;
    }

    UITableElement(label: string, model: string): UITableElement {
        return {
            label,
            getTable: async () => {
                return this.handleTable(model);
            },
            model,
        };
    }

    UIElementButton(label: string, model: "form-segmentation" | "auth-detection"): UIElementButton {
        return {
            label,
            click: async () => {
                await this.handleClick(label, model);
            },
            model,
        };
    }

    UIElementInput(label: string, model: "form-segmentation" | "auth-detection", keys?: string | undefined): UIElementInput {
        return {
            label,
            click: async () => {
                await this.handleClick(label, model);
            },
            fill: async (keys: string) => {
                await this.handleFill(label, model, keys);          
            },
            model
        };
    }

    sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    scrollDown = async () => {
        await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight); // Scroll down by one page height
      });
    }
}