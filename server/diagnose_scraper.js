import puppeteer from "puppeteer-core";
import fs from "fs";

const BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowser() {
  for (const path of BROWSER_PATHS) {
    if (fs.existsSync(path)) return path;
  }
  return null;
}

async function runHtmlDump() {
  const executablePath = findBrowser();
  const browser = await puppeteer.launch({ executablePath, headless: "new", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto("https://enam.gov.in/web/dashboard/live_price", { waitUntil: "domcontentloaded" });
    
    // Wait a bit for any initial JS
    await new Promise(r => setTimeout(r, 5000));
    
    const tableHtml = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll("table"));
      return tables.map((t, i) => `--- Table ${i} ---\n${t.outerHTML.substring(0, 1500)}`).join("\n\n");
    });
    
    console.log("Table HTML Dump:\n", tableHtml);
  } finally {
    await browser.close();
  }
}

runHtmlDump();
