/**
 * Stage Manager — load the-amazon project into FrameForge
 * Run: node stage-manager-load.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  await page.goto('http://localhost:8765/index.html');
  await page.waitForLoadState('networkidle');
  console.log('App loaded');

  // Step 3: Inject JSON
  const jsonResult = await page.evaluate(async () => {
    const response = await fetch('/frameforge/data/test-projects/the-amazon/the-amazon.json');
    const jsonText = await response.text();
    const file = new File([jsonText], 'the-amazon.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('#input-json');
    if (!input) return 'ERROR: #input-json not found';
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'JSON injected';
  });
  console.log('Step 3:', jsonResult);

  // Wait for filmstrip to populate
  await page.waitForTimeout(1500);

  // Step 4: Inject images
  const imageResult = await page.evaluate(async () => {
    const images = [
      ['aerial-amazon-river',      '/frameforge/data/test-projects/the-amazon/images/aerial-amazon-river.jpg'],
      ['aerial-river-descent',     '/frameforge/data/test-projects/the-amazon/images/aerial-river-descent.jpg'],
      ['canoe-interior-river-view','/frameforge/data/test-projects/the-amazon/images/canoe-interior-river-view.jpg'],
      ['canoe-dusk-silhouette',    '/frameforge/data/test-projects/the-amazon/images/canoe-dusk-silhouette.jpg'],
      ['canoes-water-hyacinths',   '/frameforge/data/test-projects/the-amazon/images/canoes-water-hyacinths.jpg'],
      ['jungle-canopy-vertical',   '/frameforge/data/test-projects/the-amazon/images/jungle-canopy-vertical.jpg'],
      ['buttress-roots-closeup',   '/frameforge/data/test-projects/the-amazon/images/buttress-roots-closeup.jpg'],
      ['yellow-tree-frog',         '/frameforge/data/test-projects/the-amazon/images/yellow-tree-frog.jpg'],
      ['howler-monkey-portrait',   '/frameforge/data/test-projects/the-amazon/images/howler-monkey-portrait.jpg'],
      ['squirrel-monkey-branch',   '/frameforge/data/test-projects/the-amazon/images/squirrel-monkey-branch.jpg'],
      ['hoatzin-perched',          '/frameforge/data/test-projects/the-amazon/images/hoatzin-perched.jpg'],
      ['kingfisher-amazon',        '/frameforge/data/test-projects/the-amazon/images/kingfisher-amazon.jpg'],
      ['trogon-red-black',         '/frameforge/data/test-projects/the-amazon/images/trogon-red-black.jpg'],
      ['heron-golden-light',       '/frameforge/data/test-projects/the-amazon/images/heron-golden-light.jpg'],
      ['spider-closeup-eyes',      '/frameforge/data/test-projects/the-amazon/images/spider-closeup-eyes.jpg'],
      ['boy-canoe-bw',             '/frameforge/data/test-projects/the-amazon/images/boy-canoe-bw.jpg'],
      ['family-stilt-house-window','/frameforge/data/test-projects/the-amazon/images/family-stilt-house-window.jpg'],
      ['children-football-field',  '/frameforge/data/test-projects/the-amazon/images/children-football-field.jpg'],
      ['two-canoe-bw',             '/frameforge/data/test-projects/the-amazon/images/two-canoe-bw.jpg'],
      ['woman-heart-invitation',   '/frameforge/data/test-projects/the-amazon/images/woman-heart-invitation.jpg'],
    ];
    const files = await Promise.all(images.map(async ([name, imagePath]) => {
      const blob = await fetch(imagePath).then(r => r.blob());
      return new File([blob], name, { type: 'image/jpeg' });
    }));
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    const input = document.querySelector('#input-images');
    if (!input) return 'ERROR: #input-images not found';
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return `Injected ${files.length} images`;
  });
  console.log('Step 4:', imageResult);

  // Step 5: Wait for tray to populate (20 frames expected)
  const readyResult = await page.evaluate(() => new Promise((resolve) => {
    const expected = 20;
    const check = () => {
      const draggables = document.querySelectorAll('[class*="tray"] [draggable]');
      if (draggables.length >= expected) {
        resolve(`ready — ${draggables.length} images in tray`);
        return;
      }
      setTimeout(check, 200);
    };
    check();
    setTimeout(() => resolve(`timeout — only ${document.querySelectorAll('[class*="tray"] [draggable]').length} images found`), 8000);
  }));
  console.log('Step 5:', readyResult);

  // Screenshot
  await page.screenshot({ path: 'C:/Projects/frameforge/frameforge/data/test-projects/amazon/screenshots/stage-manager-snapshot.png', fullPage: false });
  console.log('Screenshot saved');

  await browser.close();
})();
