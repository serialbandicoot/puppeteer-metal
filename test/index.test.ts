
import { PageManager } from './src/page-manager';
import { HomePage } from './src/page/home-page';

describe('ML Flerovium Test', () => {
    let pageManager: PageManager;
    let homePage: HomePage;

    test('should login to a site', async () => {
        pageManager = new PageManager();
        await pageManager.initialize();
        await pageManager.navigateTo("https://www.codecademy.com", { skipNetworkIdle: false });
        homePage = new HomePage(pageManager.getPage());
        await homePage.accept.click();
        await homePage.login.click();
        await homePage.username.fill("username@example.com");
        await homePage.password.fill("Password123!");
        await homePage.login.click();

    }, 100000);


    test('should extract table', async () => {
        pageManager = new PageManager();
        await pageManager.initialize();
        await pageManager.navigateTo("https://www.ibm.com/docs/en/i/7.3?topic=tables-sales-table-sales");
        homePage = new HomePage(pageManager.getPage());
        await homePage.accept.click();
        await homePage.scrollDown();

        const table = await homePage.table.getTable();
        console.log(table);
        await pageManager.close();

    }, 100000);

});