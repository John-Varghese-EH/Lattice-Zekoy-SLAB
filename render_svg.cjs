const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      executablePath: '/home/j0x/.local/bin/google-chrome', 
      args: ['--no-sandbox'] 
    });
    const page = await browser.newPage();
    const svg = fs.readFileSync('public/icons.svg', 'utf8');
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
          svg { width: 100vw; height: 100vh; display: block; }
        </style>
      </head>
      <body>${svg}</body>
      </html>
    `);
    
    await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 1 });
    await page.screenshot({ path: 'public/logo-128.png', omitBackground: true });
    
    await page.setViewport({ width: 48, height: 48, deviceScaleFactor: 1 });
    await page.screenshot({ path: 'public/logo-48.png', omitBackground: true });
    
    await page.setViewport({ width: 16, height: 16, deviceScaleFactor: 1 });
    await page.screenshot({ path: 'public/logo-16.png', omitBackground: true });

    await browser.close();
    console.log("Successfully generated all icons with Puppeteer!");
  } catch (error) {
    console.error("Error generating icons:", error);
  }
})();
