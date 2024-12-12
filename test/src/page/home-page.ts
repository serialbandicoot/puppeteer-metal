import { Page } from "puppeteer";
import { BasePage, UIElementButton, UIElementInput, UITableElement } from "./base-page";

export class HomePage extends BasePage {
    
    readonly accept: UIElementButton;
    readonly login: UIElementButton;
    readonly signIn: UIElementButton;
    readonly username: UIElementInput;
    readonly password: UIElementInput;
    readonly table: UITableElement;

    constructor(page: Page) {
        super(page);
        this.accept = this.UIElementButton("accept", "auth-detection");
        this.login = this.UIElementButton("login", "auth-detection");
        this.signIn = this.UIElementButton("sign-in", "auth-detection");
        this.username = this.UIElementInput("username", "form-segmentation");
        this.password = this.UIElementInput("password", "form-segmentation");
        this.table = this.UITableElement("table", "tables-extraction/1");
    }
   
}