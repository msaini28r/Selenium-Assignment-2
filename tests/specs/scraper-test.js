const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Function to safely click elements with retries
async function safeClick(element) {
  let retries = 3;
  while (retries > 0) {
    try {
      await element.waitForClickable({ timeout: 5000 });
      await element.click();
      return;
    } catch (error) {
      if (error.name === "stale element reference") {
        retries--;
        console.log("Retrying due to stale element...");
      } else {
        throw error;
      }
    }
  }
  throw new Error("Failed to click element after retries.");
}

// Function to translate text using Google Translate API
async function translateText(text, targetLanguage = 'en') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    console.log('Warning: No API key found. Using placeholder translation.');
    return `[Mock Translation: ${text}]`;
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const postData = JSON.stringify({
    q: text,
    target: targetLanguage,
    source: 'es',
    format: 'text'
  });

  return new Promise((resolve) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (jsonData.data && jsonData.data.translations.length > 0) {
              resolve(jsonData.data.translations[0].translatedText);
            } else {
              resolve(`[Translation failed: Invalid response]`);
            }
          } catch (error) {
            resolve(`[Translation failed: JSON parse error]`);
          }
        });
      }
    );

    req.on('error', (error) => {
      console.error(`Translation API error: ${error.message}`);
      resolve(`[Translation failed: ${error.message}]`);
    });

    req.write(postData);
    req.end();
  });
}

// Function to download images
async function downloadImage(imageUrl, filename) {
  if (!imageUrl) {
    console.log(`No image URL found for ${filename}`);
    return false;
  }

  const imagesDir = path.join(process.cwd(), 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const filepath = path.join(imagesDir, filename);
  const file = fs.createWriteStream(filepath);

  return new Promise((resolve) => {
    https
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          console.error(`Failed to download image: HTTP ${response.statusCode}`);
          resolve(false);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Image saved as ${filepath}`);
            resolve(true);
          });
        }
      })
      .on('error', (error) => {
        console.error(`Error downloading image: ${error.message}`);
        resolve(false);
      });
  });
}

// Web Scraper Test
describe('El País Web Scraper', () => {
  it('should scrape and analyze articles from the Opinion section', async () => {
    console.log('Starting El País web scraper with WebdriverIO...');

    await browser.url('https://elpais.com/');
    console.log('Navigated to El País');

    const bodyText = await browser.$('body').getText();
    const spanishIndicators = ['Suscríbete', 'Iniciar sesión', 'Opinión', 'Noticias', 'El País'];
    const isSpanish = spanishIndicators.some(indicator => bodyText.includes(indicator));

    console.log(isSpanish ? 'Website is displayed in Spanish ✓' : 'Warning: Website might not be in Spanish!');

    try {
      const acceptCookiesButton = await browser.$('button[title="Aceptar"]');
      if (await acceptCookiesButton.isExisting()) {
        await safeClick(acceptCookiesButton);
        console.log('Accepted cookies');
      }
    } catch (error) {
      console.log('No cookie acceptance dialog found');
    }
    
    try {
      const opinionLink = await browser.$('a=Opinión');
      await safeClick(opinionLink);
      await browser.waitUntil(async () => (await browser.getTitle()).includes('Opinión'), { timeout: 10000 });
      console.log('Navigated to Opinion section');
    } catch (error) {
      console.log(`Opinion link not found, using direct URL: ${error.message}`);
      await browser.url('https://elpais.com/opinion/');
      await browser.waitUntil(async () => (await browser.getTitle()).includes('Opinión'), { timeout: 10000 });
      console.log('Navigated to Opinion section via direct URL');
    }

    // Wait for articles to load
    await browser.waitUntil(async () => (await browser.$$('article')).length > 0, { timeout: 10000 });

    // 3. Scrape article titles & images
    const articleElements = await browser.$$('article');
    const articles = [];

    for (let i = 0; i < Math.min(5, articleElements.length); i++) {
      let title = '[No title found]';
      let imageUrl = null;
      
      try {
        const titleElement = await articleElements[i].$('h2, h3');
        if (await titleElement.isExisting()) {
          title = await titleElement.getText();
        }
      } catch (error) {
        console.log(`Error fetching title for article ${i + 1}: ${error.message}`);
      }

      try {
        const imgElement = await articleElements[i].$('img');
        if (await imgElement.isExisting()) {
          imageUrl = await imgElement.getAttribute('src');
        }
      } catch (error) {
        console.log(`Error fetching image for article ${i + 1}: ${error.message}`);
      }

      articles.push({ title, imageUrl });
      console.log(`Found article ${i + 1}: ${title}`);
    }

    console.log(`Found ${articles.length} articles to process`);

    // 4. Translate article titles
    console.log('\n=== Translated Titles ===');
    for (let i = 0; i < articles.length; i++) {
      articles[i].translatedTitle = await translateText(articles[i].title);
      console.log(`Original [${i + 1}]: ${articles[i].title}`);
      console.log(`Translated [${i + 1}]: ${articles[i].translatedTitle}`);
    }

    // 5. Download images
    console.log('\n=== Downloading Images ===');
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].imageUrl) {
        const safeFilename = articles[i].title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) + '.jpg';
        await downloadImage(articles[i].imageUrl, safeFilename);
      } else {
        console.log(`No image found for article ${i + 1}`);
      }
    }

    console.log('\n=== Script completed successfully ===');
  });
});
