# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> API Resilience >> app handles API errors gracefully
- Location: tests/app.spec.js:478:3

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
  - generic [ref=e17]:
    - button [ref=e18] [cursor=pointer]:
      - img [ref=e19]
    - textbox "הקלד מספר קו..." [active] [ref=e21]: "1"
    - button [ref=e22] [cursor=pointer]:
      - img [ref=e23]
```

# Test source

```ts
  386 |   test('operator colors return valid colors', async ({ page }) => {
  387 |     await page.goto('/');
  388 |     const result = await page.evaluate(() => {
  389 |       // Access the module — need to test via the rendered output
  390 |       return true;
  391 |     });
  392 |     expect(result).toBe(true);
  393 |   });
  394 | 
  395 |   test('extractCities handles same-city routes', async ({ page }) => {
  396 |     await page.goto('/');
  397 |     const result = await page.evaluate(() => {
  398 |       // Test with a route that has same city on both sides
  399 |       const name = 'כרמלית-תל אביב יפו<->ת. מרכזית-תל אביב יפו-1#';
  400 |       const cleaned = name.replace(/-\d+[#0-9\u05D0-\u05EA]*$/, '');
  401 |       const parts = cleaned.split('<->');
  402 |       const parse = s => {
  403 |         const m = s.match(/^(.+)-([^-]+)$/);
  404 |         return m ? { stop: m[1].trim(), city: m[2].trim() } : { stop: s.trim(), city: '' };
  405 |       };
  406 |       const a = parse(parts[0]);
  407 |       const b = parse(parts[1]);
  408 |       const sameCity = a.city && b.city && a.city === b.city;
  409 |       return { sameCity, from: sameCity ? a.stop : a.city, to: sameCity ? b.stop : b.city };
  410 |     });
  411 |     expect(result.sameCity).toBe(true);
  412 |     expect(result.from).not.toBe(result.to);
  413 |   });
  414 | 
  415 |   test('formatCountdown returns correct Hebrew strings', async ({ page }) => {
  416 |     await page.goto('/');
  417 |     const results = await page.evaluate(() => {
  418 |       const formatCountdown = (d) => {
  419 |         if (d <= 0) return 'עכשיו';
  420 |         if (d < 60) return `בעוד ${d} דק'`;
  421 |         return `בעוד ${Math.floor(d / 60)} שע' ${d % 60} דק'`;
  422 |       };
  423 |       return [formatCountdown(0), formatCountdown(5), formatCountdown(90)];
  424 |     });
  425 |     expect(results[0]).toBe('עכשיו');
  426 |     expect(results[1]).toBe("בעוד 5 דק'");
  427 |     expect(results[2]).toBe("בעוד 1 שע' 30 דק'");
  428 |   });
  429 | });
  430 | 
  431 | test.describe('Data Persistence', () => {
  432 |   test('localStorage stores theme', async ({ page }) => {
  433 |     await page.goto('/');
  434 |     const theme = await page.evaluate(() => localStorage.getItem('bt_theme'));
  435 |     expect(theme).toBe('dark');
  436 |   });
  437 | 
  438 |   test('localStorage stores location', async ({ page, context }) => {
  439 |     await context.grantPermissions(['geolocation']);
  440 |     await context.setGeolocation({ latitude: HAIFA_LAT, longitude: HAIFA_LON });
  441 |     await page.goto('/');
  442 |     await page.locator('.location-fab').click();
  443 |     await page.waitForTimeout(3000);
  444 |     const loc = await page.evaluate(() => JSON.parse(localStorage.getItem('bt_loc') || 'null'));
  445 |     if (loc) {
  446 |       expect(loc.lat).toBeCloseTo(HAIFA_LAT, 1);
  447 |       expect(loc.lon).toBeCloseTo(HAIFA_LON, 1);
  448 |     }
  449 |   });
  450 | 
  451 |   test('double-tap sheet handle clears data', async ({ page }) => {
  452 |     await page.goto('/');
  453 |     // Set some data
  454 |     await page.evaluate(() => {
  455 |       localStorage.setItem('bt_usage', JSON.stringify([{ lineRef: 1, lineName: 'test' }]));
  456 |     });
  457 |     // Double-click handle — auto-accept dialog
  458 |     page.on('dialog', dialog => dialog.accept());
  459 |     await page.locator('.sheet-handle-area').dblclick();
  460 |     await page.waitForTimeout(1000);
  461 |     const usage = await page.evaluate(() => localStorage.getItem('bt_usage'));
  462 |     expect(usage).toBeNull();
  463 |   });
  464 | });
  465 | 
  466 | test.describe('API Resilience', () => {
  467 |   test('app does not crash with slow API', async ({ page }) => {
  468 |     // Slow down API responses
  469 |     await page.route('**/open-bus-stride-api**', route => {
  470 |       setTimeout(() => route.continue(), 5000);
  471 |     });
  472 |     await page.goto('/');
  473 |     // App should still render
  474 |     await expect(page.locator('.leaflet-container')).toBeVisible();
  475 |     await expect(page.locator('.float-pill')).toBeVisible();
  476 |   });
  477 | 
  478 |   test('app handles API errors gracefully', async ({ page }) => {
  479 |     // Make API return 500
  480 |     await page.route('**/gtfs_routes/list**', route => {
  481 |       route.fulfill({ status: 500, body: 'Server Error' });
  482 |     });
  483 |     await page.goto('/');
  484 |     await page.locator('.float-pill').click();
  485 |     await page.locator('.search-field').fill('1');
> 486 |     await page.locator('.search-go').click();
      |                                      ^ Error: locator.click: Test timeout of 45000ms exceeded.
  487 |     // Should not crash — loading should eventually stop
  488 |     await page.waitForTimeout(5000);
  489 |     await expect(page.locator('.leaflet-container')).toBeVisible();
  490 |   });
  491 | });
  492 | 
```