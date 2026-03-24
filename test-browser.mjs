import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "https://familyplate.onrender.com";
const TEST_EMAIL = `test-${Date.now()}@familyplate.test`;
const TEST_PASSWORD = "TestPass123!";

async function test() {
  console.log("=== FamilyPlate Debug Sign-Up v3 ===\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  
  const allLogs = [];
  page.on("console", (msg) => allLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => allLogs.push(`[PAGE_ERROR] ${err.message}`));

  try {
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    // Switch to sign-up
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text?.includes("account")) { await btn.click(); break; }
    }
    await new Promise(r => setTimeout(r, 500));

    // Inject debug interceptor on the submit button
    await page.evaluate(() => {
      // Override the form submit to add console logging
      const form = document.querySelector('form');
      if (form) {
        const origSubmit = form.onsubmit;
        form.addEventListener('submit', () => {
          console.log('[DEBUG] Form submitted');
        });
      }
      
      // Monitor fetch/XHR for auth calls
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        console.log('[DEBUG FETCH]', args[0]?.toString?.() || args[0]);
        try {
          const resp = await origFetch.apply(this, args);
          console.log('[DEBUG FETCH RESP]', resp.status, resp.url);
          return resp;
        } catch(e) {
          console.log('[DEBUG FETCH ERROR]', e.message);
          throw e;
        }
      };
    });

    // Fill form
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);

    allLogs.length = 0;
    console.log("Submitting sign-up...\n");
    await page.click('button[type="submit"]');
    
    // Check frequently
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const url = page.url();
      if (url !== URL + "/") {
        console.log(`  ${i}s: Redirected to ${url}`);
        break;
      }
      // Check for error or button state
      const btnText = await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]');
        return btn?.textContent || 'no button';
      });
      const errorText = await page.evaluate(() => {
        const err = document.querySelector('[class*="destructive"]');
        return err?.textContent || '';
      });
      if (i <= 3 || errorText || btnText.includes("Creating") || btnText.includes("Signing")) {
        console.log(`  ${i}s: btn="${btnText}" ${errorText ? 'error="'+errorText+'"' : ''}`);
      }
    }

    console.log("\n--- Logs after submit ---");
    allLogs.forEach(l => console.log(`  ${l}`));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
}

test();
