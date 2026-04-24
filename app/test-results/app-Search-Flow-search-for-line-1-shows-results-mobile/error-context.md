# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> Search Flow >> search for line 1 shows results
- Location: tests/app.spec.js:79:3

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
        - generic [ref=e36]: קווים
        - generic [ref=e37]: מסוף הרכבת הישן/איסוף ↔ ת. רכבת גני אביב · 00:00-16:40
        - generic [ref=e38]: פעיל עכשיו
      - generic [ref=e39]: ‹
    - generic [ref=e40] [cursor=pointer]:
      - generic [ref=e41]: "1"
      - generic [ref=e42]:
        - generic [ref=e43]: אקסטרה ירושלים
        - generic [ref=e44]: שער האשפות/מעלה השלום ↔ שדרות שז''ר/בנייני האומה · 00:15-16:45
        - generic [ref=e45]: פעיל עכשיו
      - generic [ref=e46]: ‹
    - generic [ref=e47] [cursor=pointer]:
      - generic [ref=e48]: "1"
      - generic [ref=e49]:
        - generic [ref=e50]: כרמלית
        - generic [ref=e51]: עיר תחתית ↔ מרכז הכרמל · 00:00-15:00
        - generic [ref=e52]: פעיל עכשיו
      - generic [ref=e53]: ‹
    - generic [ref=e54] [cursor=pointer]:
      - generic [ref=e55]: "1"
      - generic [ref=e56]:
        - generic [ref=e57]: דן בדרום
        - generic [ref=e58]: שוק ↔ ת. רכבת אופקים/הורדה · 00:10-15:45
        - generic [ref=e59]: פעיל עכשיו
      - generic [ref=e60]: ‹
    - generic [ref=e61] [cursor=pointer]:
      - generic [ref=e62]: "1"
      - generic [ref=e63]:
        - generic [ref=e64]: דן
        - generic [ref=e65]: בת ים ↔ פתח תקווה · 00:05-16:40
        - generic [ref=e66]: פעיל עכשיו
      - generic [ref=e67]: ‹
    - generic [ref=e68] [cursor=pointer]:
      - generic [ref=e69]: "1"
      - generic [ref=e70]:
        - generic [ref=e71]: כפיר
        - generic [ref=e72]: נווה יעקב - צפון ↔ הדסה עין כרם · 00:00-16:43
        - generic [ref=e73]: פעיל עכשיו
      - generic [ref=e74]: ‹
    - generic [ref=e75] [cursor=pointer]:
      - generic [ref=e76]: "1"
      - generic [ref=e77]:
        - generic [ref=e78]: אגד
        - generic [ref=e79]: מסוף רכבת קיסריה פרדס חנה/איסוף ↔ המייסדים/השמינית · 06:09-16:09
        - generic [ref=e80]: לא פעיל כרגע
      - generic [ref=e81]: ‹
    - generic [ref=e82] [cursor=pointer]:
      - generic [ref=e83]: "1"
      - generic [ref=e84]:
        - generic [ref=e85]: גלים
        - generic [ref=e86]: כסייפה/שכונה 13 ↔ אלמידאן · 06:30-15:30
        - generic [ref=e87]: לא פעיל כרגע
      - generic [ref=e88]: ‹
    - generic [ref=e89] [cursor=pointer]:
      - generic [ref=e90]: "1"
      - generic [ref=e91]:
        - generic [ref=e92]: נתיב אקספרס
        - generic [ref=e93]: ת. מרכזית צפת/רציפים ↔ בית חולים זיו
        - generic [ref=e94]: לא פעיל היום
      - generic [ref=e95]: ‹
    - generic [ref=e96] [cursor=pointer]:
      - generic [ref=e97]: "1"
      - generic [ref=e98]:
        - generic [ref=e99]: תבל
        - generic [ref=e100]: בת ים ↔ פתח תקווה
        - generic [ref=e101]: לא פעיל היום
      - generic [ref=e102]: ‹
    - generic [ref=e103] [cursor=pointer]:
      - generic [ref=e104]: "1"
      - generic [ref=e105]:
        - generic [ref=e106]: מטרופולין
        - generic [ref=e107]: אלאמל/א.תעשיה ↔ מגרש כדורגל · 07:05-14:05
        - generic [ref=e108]: לא פעיל כרגע
      - generic [ref=e109]: ‹
    - generic [ref=e110] [cursor=pointer]:
      - generic [ref=e111]: "1"
      - generic [ref=e112]:
        - generic [ref=e113]: אלקטרה אפיקים
        - generic [ref=e114]: ת. רכבת אשדוד עד הלום/איסוף ↔ רכבת/מסוף ביג - הורדה
        - generic [ref=e115]: לא פעיל היום
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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Haifa area — buses should be running on Sunday
  4   | const HAIFA_LAT = 32.794;
  5   | const HAIFA_LON = 34.990;
  6   | 
  7   | test.describe('App Launch & Map', () => {
  8   |   test('renders map and search bar on load', async ({ page }) => {
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
> 83  |     await page.locator('.search-go').click();
      |                                      ^ Error: locator.click: Test timeout of 45000ms exceeded.
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
  109 |     await page.locator('.search-go').click();
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
```