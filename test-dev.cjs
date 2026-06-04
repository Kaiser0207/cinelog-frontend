const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.toString());
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (err) {
    console.log('NAVIGATION ERROR:', err.message);
  }
  
  console.log('Done waiting.');
  await browser.close();
})();
