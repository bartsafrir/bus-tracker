# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> Search Flow >> search for nonexistent line shows empty state
- Location: tests/app.spec.js:105:3

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
      - textbox "הקלד מספר קו..." [active] [ref=e21]: "99999"
      - button [ref=e22] [cursor=pointer]:
        - img [ref=e23]
    - generic [ref=e25]: תוצאות לקו 99999
    - generic [ref=e26]: לא נמצא קו 99999
```

# Test source

```ts
  9   |     await page.goto('/');
  10  |     // Map should be visible
  11  |     await expect(page.locator('.leaflet-container')).toBeVisible();
  12  |     // Search pill should be visible
  13  |     await expect(page.locator('.float-pill')).toBeVisible();
  14  |     await expect(page.locator('.float-pill')).toContainText('חפש קו');
  15  |   });
  16  | 
  17  |   test('map tiles load (not blank)', async ({ page }) => {
  18  |     await page.goto('/');
  19  |     // Wait for tiles to load
  20  |     await page.waitForSelector('.leaflet-tile-loaded', { timeout: 10000 });
  21  |     const tiles = await page.locator('.leaflet-tile-loaded').count();
  22  |     expect(tiles).toBeGreaterThan(0);
  23  |   });
  24  | 
  25  |   test('theme toggle switches dark/light', async ({ page }) => {
  26  |     await page.goto('/');
  27  |     // Default is dark
  28  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  29  |     // Click theme toggle (sun icon)
  30  |     await page.locator('.float-btn').last().click();
  31  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  32  |     // Click again — back to dark
  33  |     await page.locator('.float-btn').last().click();
  34  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  35  |   });
  36  | 
  37  |   test('theme persists after reload', async ({ page }) => {
  38  |     await page.goto('/');
  39  |     await page.locator('.float-btn').last().click();
  40  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  41  |     await page.reload();
  42  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  43  |   });
  44  | });
  45  | 
  46  | test.describe('Bottom Sheet', () => {
  47  |   test('shows on load with home content', async ({ page }) => {
  48  |     await page.goto('/');
  49  |     await expect(page.locator('.bottom-sheet')).toBeVisible();
  50  |     await expect(page.locator('.sheet-handle')).toBeVisible();
  51  |   });
  52  | 
  53  |   test('shows empty state when no usage history', async ({ page, context }) => {
  54  |     await context.clearCookies();
  55  |     await page.goto('/');
  56  |     await page.evaluate(() => localStorage.clear());
  57  |     await page.reload();
  58  |     // Should show "search to start" message
  59  |     await expect(page.locator('.sheet-content')).toContainText('חפש קו');
  60  |   });
  61  | });
  62  | 
  63  | test.describe('Search Flow', () => {
  64  |   test('opens search overlay when clicking search pill', async ({ page }) => {
  65  |     await page.goto('/');
  66  |     await page.locator('.float-pill').click();
  67  |     await expect(page.locator('.search-overlay')).toBeVisible();
  68  |     await expect(page.locator('.search-field')).toBeFocused();
  69  |   });
  70  | 
  71  |   test('close button returns to home', async ({ page }) => {
  72  |     await page.goto('/');
  73  |     await page.locator('.float-pill').click();
  74  |     await expect(page.locator('.search-overlay')).toBeVisible();
  75  |     await page.locator('.search-close').click();
  76  |     await expect(page.locator('.search-overlay')).not.toBeVisible();
  77  |   });
  78  | 
  79  |   test('search for line 1 shows results', async ({ page }) => {
  80  |     await page.goto('/');
  81  |     await page.locator('.float-pill').click();
  82  |     await page.locator('.search-field').fill('1');
  83  |     await page.locator('.search-go').click();
  84  |     // Should show operator results (line 1 has multiple operators)
  85  |     await expect(page.locator('.picker-item').first()).toBeVisible({ timeout: 20000 });
  86  |     // Should have multiple operators
  87  |     const items = await page.locator('.picker-item').count();
  88  |     expect(items).toBeGreaterThan(1);
  89  |   });
  90  | 
  91  |   test('search for line 1 shows operator names and status badges', async ({ page }) => {
  92  |     await page.goto('/');
  93  |     await page.locator('.float-pill').click();
  94  |     await page.locator('.search-field').fill('1');
  95  |     await page.locator('.search-go').click();
  96  |     await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  97  |     // Should have status badges
  98  |     const badges = await page.locator('.status-badge').count();
  99  |     expect(badges).toBeGreaterThan(0);
  100 |     // Should have line number badges with colors
  101 |     const lineBadges = await page.locator('.badge-line').count();
  102 |     expect(lineBadges).toBeGreaterThan(0);
  103 |   });
  104 | 
  105 |   test('search for nonexistent line shows empty state', async ({ page }) => {
  106 |     await page.goto('/');
  107 |     await page.locator('.float-pill').click();
  108 |     await page.locator('.search-field').fill('99999');
> 109 |     await page.locator('.search-go').click();
      |                                      ^ Error: locator.click: Test timeout of 45000ms exceeded.
  110 |     // Wait for loading to finish, then check for empty message
  111 |     await page.waitForTimeout(3000);
  112 |     await expect(page.locator('text=לא נמצא')).toBeVisible({ timeout: 20000 });
  113 |   });
  114 | 
  115 |   test('pressing Enter triggers search', async ({ page }) => {
  116 |     await page.goto('/');
  117 |     await page.locator('.float-pill').click();
  118 |     await page.locator('.search-field').fill('1');
  119 |     await page.locator('.search-field').press('Enter');
  120 |     await expect(page.locator('.picker-item').first()).toBeVisible({ timeout: 20000 });
  121 |   });
  122 | 
  123 |   test('picking operator shows direction picker', async ({ page }) => {
  124 |     await page.goto('/');
  125 |     await page.locator('.float-pill').click();
  126 |     await page.locator('.search-field').fill('1');
  127 |     await page.locator('.search-go').click();
  128 |     await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  129 |     // Click first operator
  130 |     await page.locator('.picker-item').first().click();
  131 |     // Should show directions or start tracking
  132 |     // Either direction picker appears or we go to tracking
  133 |     const hasDirections = await page.locator('.picker-icon').count();
  134 |     const isTracking = await page.locator('.stop-card, .dir-bar').count();
  135 |     expect(hasDirections + isTracking).toBeGreaterThan(0);
  136 |   });
  137 | });
  138 | 
  139 | test.describe('Line Tracking', () => {
  140 |   async function trackLine1(page) {
  141 |     await page.goto('/');
  142 |     await page.locator('.float-pill').click();
  143 |     await page.locator('.search-field').fill('1');
  144 |     await page.locator('.search-go').click();
  145 |     await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  146 |     // Click first operator
  147 |     await page.locator('.picker-item').first().click();
  148 |     // If direction picker shows, click first direction
  149 |     const dirItem = page.locator('.picker-icon').first();
  150 |     if (await dirItem.isVisible({ timeout: 3000 }).catch(() => false)) {
  151 |       await page.locator('.picker-item').nth(1).click(); // skip "all directions", pick first real one
  152 |     }
  153 |     // Wait for tracking view
  154 |     await expect(page.locator('.float-badge')).toBeVisible({ timeout: 20000 });
  155 |   }
  156 | 
  157 |   test('tracking shows route on map', async ({ page }) => {
  158 |     await trackLine1(page);
  159 |     // Route polyline should exist (may have multiple paths: route + walk)
  160 |     await expect(page.locator('.leaflet-overlay-pane path').first()).toBeVisible({ timeout: 15000 });
  161 |   });
  162 | 
  163 |   test('tracking shows back button', async ({ page }) => {
  164 |     await trackLine1(page);
  165 |     // Back button visible
  166 |     const backBtn = page.locator('.float-btn').first();
  167 |     await expect(backBtn).toBeVisible();
  168 |   });
  169 | 
  170 |   test('back button returns to home', async ({ page }) => {
  171 |     await trackLine1(page);
  172 |     await page.locator('.float-btn').first().click();
  173 |     // Should be back to home — search pill visible
  174 |     await expect(page.locator('.float-pill')).toContainText('חפש קו');
  175 |   });
  176 | 
  177 |   test('tracking shows stop markers on map', async ({ page }) => {
  178 |     await trackLine1(page);
  179 |     // Stop markers should appear
  180 |     await page.waitForTimeout(3000);
  181 |     const markers = await page.locator('.stop-dot').count();
  182 |     expect(markers).toBeGreaterThan(0);
  183 |   });
  184 | 
  185 |   test('closest stop is highlighted (if location set)', async ({ page, context }) => {
  186 |     await context.grantPermissions(['geolocation']);
  187 |     await context.setGeolocation({ latitude: HAIFA_LAT, longitude: HAIFA_LON });
  188 |     await trackLine1(page);
  189 |     await page.waitForTimeout(3000);
  190 |     // Should have a closest stop marker
  191 |     const closest = await page.locator('.stop-dot.closest').count();
  192 |     expect(closest).toBeGreaterThanOrEqual(0); // may not have if location not set
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
```