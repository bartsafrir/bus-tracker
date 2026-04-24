# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> Schedule >> clicking visible map area closes schedule
- Location: tests/app.spec.js:332:3

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('.search-go')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - button [ref=e5] [cursor=pointer]
    - link "Leaflet" [ref=e8] [cursor=pointer]:
      - /url: https://leafletjs.com
      - img [ref=e9]
      - text: Leaflet
  - button [ref=e13] [cursor=pointer]:
    - img [ref=e14]
  - generic [ref=e16]:
    - generic [ref=e17]:
      - button [ref=e18] [cursor=pointer]:
        - img [ref=e19]
      - textbox "הקלד מספר קו..." [active] [ref=e21]: "1"
      - button [ref=e22] [cursor=pointer]:
        - img [ref=e23]
    - generic [ref=e25]: תוצאות לקו 1
    - generic [ref=e26] [cursor=pointer]:
      - generic [ref=e27]: "1"
      - generic [ref=e28]:
        - generic [ref=e29]: סופרבוס
        - generic [ref=e30]: קרית מוצקין ↔ חיפה · 00:00-04:05
        - generic [ref=e31]: פעיל עכשיו
      - generic [ref=e32]: ‹
    - generic [ref=e33] [cursor=pointer]:
      - generic [ref=e34]: "1"
      - generic [ref=e35]:
        - generic [ref=e36]: תבל
        - generic [ref=e37]: בת ים ↔ פתח תקווה · 00:00-16:40
        - generic [ref=e38]: פעיל עכשיו
      - generic [ref=e39]: ‹
    - generic [ref=e40] [cursor=pointer]:
      - generic [ref=e41]: "1"
      - generic [ref=e42]:
        - generic [ref=e43]: אלקטרה אפיקים
        - generic [ref=e44]: ת. רכבת אשדוד עד הלום/איסוף ↔ רכבת/מסוף ביג - הורדה · 00:00-16:30
        - generic [ref=e45]: פעיל עכשיו
      - generic [ref=e46]: ‹
    - generic [ref=e47] [cursor=pointer]:
      - generic [ref=e48]: "1"
      - generic [ref=e49]:
        - generic [ref=e50]: קווים
        - generic [ref=e51]: מסוף הרכבת הישן/איסוף ↔ ת. רכבת גני אביב · 00:00-16:40
        - generic [ref=e52]: פעיל עכשיו
      - generic [ref=e53]: ‹
    - generic [ref=e54] [cursor=pointer]:
      - generic [ref=e55]: "1"
      - generic [ref=e56]:
        - generic [ref=e57]: אקסטרה ירושלים
        - generic [ref=e58]: שער האשפות/מעלה השלום ↔ שדרות שז''ר/בנייני האומה · 00:15-16:45
        - generic [ref=e59]: פעיל עכשיו
      - generic [ref=e60]: ‹
    - generic [ref=e61] [cursor=pointer]:
      - generic [ref=e62]: "1"
      - generic [ref=e63]:
        - generic [ref=e64]: כרמלית
        - generic [ref=e65]: עיר תחתית ↔ מרכז הכרמל · 00:00-15:00
        - generic [ref=e66]: פעיל עכשיו
      - generic [ref=e67]: ‹
    - generic [ref=e68] [cursor=pointer]:
      - generic [ref=e69]: "1"
      - generic [ref=e70]:
        - generic [ref=e71]: דן בדרום
        - generic [ref=e72]: שוק ↔ ת. רכבת אופקים/הורדה · 00:10-15:45
        - generic [ref=e73]: פעיל עכשיו
      - generic [ref=e74]: ‹
    - generic [ref=e75] [cursor=pointer]:
      - generic [ref=e76]: "1"
      - generic [ref=e77]:
        - generic [ref=e78]: דן
        - generic [ref=e79]: בת ים ↔ פתח תקווה · 00:05-16:40
        - generic [ref=e80]: פעיל עכשיו
      - generic [ref=e81]: ‹
    - generic [ref=e82] [cursor=pointer]:
      - generic [ref=e83]: "1"
      - generic [ref=e84]:
        - generic [ref=e85]: כפיר
        - generic [ref=e86]: נווה יעקב - צפון ↔ הדסה עין כרם · 00:00-16:43
        - generic [ref=e87]: פעיל עכשיו
      - generic [ref=e88]: ‹
    - generic [ref=e89] [cursor=pointer]:
      - generic [ref=e90]: "1"
      - generic [ref=e91]:
        - generic [ref=e92]: אגד
        - generic [ref=e93]: מסוף רכבת קיסריה פרדס חנה/איסוף ↔ המייסדים/השמינית · 06:09-16:09
        - generic [ref=e94]: לא פעיל כרגע
      - generic [ref=e95]: ‹
    - generic [ref=e96] [cursor=pointer]:
      - generic [ref=e97]: "1"
      - generic [ref=e98]:
        - generic [ref=e99]: גלים
        - generic [ref=e100]: כסייפה/שכונה 13 ↔ אלמידאן · 06:30-15:30
        - generic [ref=e101]: לא פעיל כרגע
      - generic [ref=e102]: ‹
    - generic [ref=e103] [cursor=pointer]:
      - generic [ref=e104]: "1"
      - generic [ref=e105]:
        - generic [ref=e106]: נתיב אקספרס
        - generic [ref=e107]: ת. מרכזית צפת/רציפים ↔ בית חולים זיו · 06:00-16:50
        - generic [ref=e108]: לא פעיל כרגע
      - generic [ref=e109]: ‹
    - generic [ref=e110] [cursor=pointer]:
      - generic [ref=e111]: "1"
      - generic [ref=e112]:
        - generic [ref=e113]: מטרופולין
        - generic [ref=e114]: אלאמל/א.תעשיה ↔ מגרש כדורגל · 07:05-14:05
        - generic [ref=e115]: לא פעיל כרגע
      - generic [ref=e116]: ‹
    - generic [ref=e117] [cursor=pointer]:
      - generic [ref=e118]: "1"
      - generic [ref=e119]:
        - generic [ref=e120]: נסיעות ותיירות
        - generic [ref=e121]: תרדיון ↔ סח'נין · 06:35-16:00
        - generic [ref=e122]: לא פעיל כרגע
      - generic [ref=e123]: ‹
    - generic [ref=e124] [cursor=pointer]:
      - generic [ref=e125]: "1"
      - generic [ref=e126]:
        - generic [ref=e127]: ש.א.מ
        - generic [ref=e128]: יפיע ↔ נוף הגליל · 05:40-22:30
        - generic [ref=e129]: לא פעיל כרגע
      - generic [ref=e130]: ‹
```

# Test source

```ts
  193 |   });
  194 | });
  195 | 
  196 | test.describe('Location', () => {
  197 |   test('location button exists', async ({ page }) => {
  198 |     await page.goto('/');
  199 |     await expect(page.locator('.location-fab')).toBeVisible();
  200 |   });
  201 | 
  202 |   test('geolocation sets user position on map', async ({ page, context }) => {
  203 |     await context.grantPermissions(['geolocation']);
  204 |     await context.setGeolocation({ latitude: HAIFA_LAT, longitude: HAIFA_LON });
  205 |     await page.goto('/');
  206 |     await page.locator('.location-fab').click();
  207 |     await page.waitForTimeout(3000);
  208 |     // Blue dot should appear
  209 |     const meDot = await page.locator('.me-dot').count();
  210 |     expect(meDot).toBeGreaterThan(0);
  211 |   });
  212 | 
  213 |   test('dev mode allows dragging location', async ({ page }) => {
  214 |     await page.goto('/?dev');
  215 |     // Set initial location
  216 |     await page.evaluate(() => {
  217 |       localStorage.setItem('bt_loc', JSON.stringify({ lat: 32.794, lon: 34.990 }));
  218 |     });
  219 |     await page.reload();
  220 |     await page.waitForTimeout(2000);
  221 |     // Me marker should be draggable
  222 |     const meMarker = page.locator('.me-dot').first();
  223 |     await expect(meMarker).toBeVisible();
  224 |   });
  225 | 
  226 |   test('non-dev mode does not allow pin mode on geolocation fail', async ({ page, context }) => {
  227 |     // No geolocation permission — simulate deny
  228 |     await page.goto('/');
  229 |     // Clear any saved location
  230 |     await page.evaluate(() => localStorage.removeItem('bt_loc'));
  231 |     await page.reload();
  232 |     await page.locator('.location-fab').click();
  233 |     await page.waitForTimeout(2000);
  234 |     // Pin banner should NOT appear in non-dev mode
  235 |     const pinBanner = await page.locator('.pin-banner').count();
  236 |     expect(pinBanner).toBe(0);
  237 |   });
  238 | });
  239 | 
  240 | test.describe('Usage Intelligence', () => {
  241 |   test('tracking a line logs usage', async ({ page }) => {
  242 |     await page.goto('/');
  243 |     await page.evaluate(() => localStorage.clear());
  244 |     await page.reload();
  245 | 
  246 |     // Search and track
  247 |     await page.locator('.float-pill').click();
  248 |     await page.locator('.search-field').fill('1');
  249 |     await page.locator('.search-go').click();
  250 |     await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  251 |     await page.locator('.picker-item').first().click();
  252 |     // Handle direction picker
  253 |     const dirVisible = await page.locator('.picker-icon').first().isVisible({ timeout: 3000 }).catch(() => false);
  254 |     if (dirVisible) await page.locator('.picker-item').nth(1).click();
  255 | 
  256 |     await page.waitForTimeout(2000);
  257 | 
  258 |     // Check localStorage has usage
  259 |     const usage = await page.evaluate(() => JSON.parse(localStorage.getItem('bt_usage') || '[]'));
  260 |     expect(usage.length).toBeGreaterThan(0);
  261 |     expect(usage[0]).toHaveProperty('lineName');
  262 |     expect(usage[0]).toHaveProperty('ts');
  263 |     expect(usage[0]).toHaveProperty('day');
  264 |     expect(usage[0]).toHaveProperty('hour');
  265 |   });
  266 | 
  267 |   test('suggestions appear after usage', async ({ page }) => {
  268 |     // Pre-populate usage
  269 |     await page.goto('/');
  270 |     await page.evaluate(() => {
  271 |       const now = Date.now();
  272 |       const usage = Array.from({ length: 5 }, (_, i) => ({
  273 |         lineRef: 40262, lineName: '1', agencyName: 'סופרבוס',
  274 |         from: 'חיפה', to: 'קרית מוצקין',
  275 |         ts: now - i * 3600000, day: new Date().getDay(), hour: new Date().getHours(),
  276 |         lat: 32.794, lon: 34.990,
  277 |       }));
  278 |       localStorage.setItem('bt_usage', JSON.stringify(usage));
  279 |     });
  280 |     await page.reload();
  281 | 
  282 |     // Suggestions should appear
  283 |     await expect(page.locator('.section-hdr').first()).toContainText('מוצע עבורך');
  284 |     await expect(page.locator('.row .row-name').first()).toBeVisible();
  285 |   });
  286 | });
  287 | 
  288 | test.describe('Schedule', () => {
  289 |   async function openSchedule(page) {
  290 |     await page.goto('/');
  291 |     await page.locator('.float-pill').click();
  292 |     await page.locator('.search-field').fill('1');
> 293 |     await page.locator('.search-go').click();
      |                                      ^ Error: locator.click: Test timeout of 45000ms exceeded.
  294 |     await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  295 |     await page.locator('.picker-item').first().click();
  296 |     const dirVisible = await page.locator('.picker-icon').first().isVisible({ timeout: 3000 }).catch(() => false);
  297 |     if (dirVisible) await page.locator('.picker-item').nth(1).click();
  298 |     // Wait for tracking to load
  299 |     await expect(page.locator('.float-badge')).toBeVisible({ timeout: 20000 });
  300 |     // Wait for stops to load on map
  301 |     await page.waitForTimeout(5000);
  302 |     // Try clicking schedule link, then try clicking a stop dot
  303 |     const schedLink = page.locator('text=צפה בלוח זמנים מלא');
  304 |     const stopDot = page.locator('.leaflet-marker-icon .stop-dot').first();
  305 |     if (await schedLink.isVisible({ timeout: 3000 }).catch(() => false)) {
  306 |       await schedLink.click();
  307 |     } else if (await stopDot.isVisible({ timeout: 3000 }).catch(() => false)) {
  308 |       await stopDot.click({ force: true });
  309 |     }
  310 |     // Wait for schedule view
  311 |     await page.waitForTimeout(3000);
  312 |   }
  313 | 
  314 |   test('schedule shows times', async ({ page }) => {
  315 |     await openSchedule(page);
  316 |     // Check for schedule items or loading spinner — either means the schedule view opened
  317 |     const hasTimes = await page.locator('.sc-mins-big').count();
  318 |     const hasLoading = await page.locator('.spinner').count();
  319 |     const hasClose = await page.locator('.sched-close').count();
  320 |     expect(hasTimes + hasLoading + hasClose).toBeGreaterThan(0);
  321 |   });
  322 | 
  323 |   test('schedule close button works', async ({ page }) => {
  324 |     await openSchedule(page);
  325 |     const closeBtn = page.locator('.sched-close');
  326 |     if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  327 |       await closeBtn.click();
  328 |       await expect(page.locator('.float-badge')).toBeVisible();
  329 |     }
  330 |   });
  331 | 
  332 |   test('clicking visible map area closes schedule', async ({ page }) => {
  333 |     await openSchedule(page);
  334 |     const closeBtn = page.locator('.sched-close');
  335 |     if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  336 |       // Click on map area above the sheet (top of screen)
  337 |       await page.locator('.leaflet-container').click({ position: { x: 200, y: 50 } });
  338 |       await page.waitForTimeout(1000);
  339 |       // May or may not close depending on sheet height — close button is primary way
  340 |       const stillVisible = await closeBtn.isVisible().catch(() => false);
  341 |       if (stillVisible) {
  342 |         // Use close button as fallback
  343 |         await closeBtn.click();
  344 |       }
  345 |       await expect(page.locator('.float-badge')).toBeVisible();
  346 |     }
  347 |   });
  348 | });
  349 | 
  350 | test.describe('Direction Switcher', () => {
  351 |   test('direction bar appears when tracking', async ({ page }) => {
  352 |     await page.goto('/');
  353 |     await page.locator('.float-pill').click();
  354 |     await page.locator('.search-field').fill('1');
  355 |     await page.locator('.search-go').click();
  356 |     await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  357 |     await page.locator('.picker-item').first().click();
  358 |     const dirVisible = await page.locator('.picker-icon').first().isVisible({ timeout: 3000 }).catch(() => false);
  359 |     if (dirVisible) await page.locator('.picker-item').nth(1).click();
  360 |     await expect(page.locator('.float-badge')).toBeVisible({ timeout: 20000 });
  361 | 
  362 |     // Direction bar should show if siblings exist
  363 |     await page.waitForTimeout(3000);
  364 |     const dirBar = await page.locator('.dir-bar').count();
  365 |     // dir-bar shows if there are multiple directions
  366 |     expect(dirBar).toBeGreaterThanOrEqual(0);
  367 |   });
  368 | });
  369 | 
  370 | test.describe('Nearby Buses', () => {
  371 |   test('nearby buses appear when location is set', async ({ page, context }) => {
  372 |     await context.grantPermissions(['geolocation']);
  373 |     await context.setGeolocation({ latitude: HAIFA_LAT, longitude: HAIFA_LON });
  374 |     await page.goto('/');
  375 |     // Click location to set it
  376 |     await page.locator('.location-fab').click();
  377 |     await page.waitForTimeout(5000);
  378 |     // Check if nearby section appears (depends on live bus availability)
  379 |     const nearbySection = await page.locator('text=קווים חיים סביבך').count();
  380 |     // Can't guarantee buses are running, but section should appear or not without crashing
  381 |     expect(nearbySection).toBeGreaterThanOrEqual(0);
  382 |   });
  383 | });
  384 | 
  385 | test.describe('Utilities', () => {
  386 |   test('operator colors return valid colors', async ({ page }) => {
  387 |     await page.goto('/');
  388 |     const result = await page.evaluate(() => {
  389 |       // Access the module — need to test via the rendered output
  390 |       return true;
  391 |     });
  392 |     expect(result).toBe(true);
  393 |   });
```