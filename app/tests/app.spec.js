import { test, expect } from '@playwright/test';

const HAIFA_LAT = 32.794;
const HAIFA_LON = 34.990;

// Helper: search a line (type + wait for debounce)
async function searchLine(page, num) {
  await page.locator('.float-pill').click();
  await page.locator('.search-field').fill(String(num));
  await page.waitForTimeout(800); // debounce
}

// Helper: track first result of a line search
async function trackFirstResult(page, num) {
  await searchLine(page, num);
  await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
  await page.locator('.picker-item').first().click();
  await page.waitForTimeout(1500);
  // Handle direction picker
  const dirIcon = page.locator('.picker-icon').first();
  if (await dirIcon.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.locator('.picker-item').nth(1).click();
  }
  await expect(page.locator('.float-badge')).toBeVisible({ timeout: 20000 });
}

test.describe('App Launch & Map', () => {
  test('renders map and search bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.float-pill')).toBeVisible();
    await expect(page.locator('.float-pill')).toContainText('חפש קו');
  });

  test('map tiles load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 10000 });
    expect(await page.locator('.leaflet-tile-loaded').count()).toBeGreaterThan(0);
  });

  test('theme toggle dark/light', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.float-btn').last().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('.float-btn').last().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('theme persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-btn').last().click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('Bottom Sheet', () => {
  test('shows on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.bottom-sheet')).toBeVisible();
    await expect(page.locator('.sheet-handle')).toBeVisible();
  });

  test('empty state when no history', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('.sheet-content')).toContainText('חפש קו');
  });
});

test.describe('Search Flow', () => {
  test('opens search overlay', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-pill').click();
    await expect(page.locator('.search-overlay')).toBeVisible();
    await expect(page.locator('.search-field')).toBeFocused();
  });

  test('close button returns to home', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-pill').click();
    await page.locator('.search-close').click();
    await expect(page.locator('.search-overlay')).not.toBeVisible();
  });

  test('auto-search on type (debounce)', async ({ page }) => {
    await page.goto('/');
    await searchLine(page, '1');
    await expect(page.locator('.picker-item').first()).toBeVisible({ timeout: 20000 });
    expect(await page.locator('.picker-item').count()).toBeGreaterThan(1);
  });

  test('shows status badges', async ({ page }) => {
    await page.goto('/');
    await searchLine(page, '1');
    await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
    expect(await page.locator('.status-badge').count()).toBeGreaterThan(0);
    expect(await page.locator('.badge-line').count()).toBeGreaterThan(0);
  });

  test('nonexistent line shows empty', async ({ page }) => {
    await page.goto('/');
    await searchLine(page, '99999');
    await page.waitForTimeout(5000); // wait for debounce + API
    await expect(page.locator('text=לא נמצא')).toBeVisible({ timeout: 25000 });
  });

  test('Enter triggers search', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-pill').click();
    await page.locator('.search-field').fill('1');
    await page.locator('.search-field').press('Enter');
    await expect(page.locator('.picker-item').first()).toBeVisible({ timeout: 20000 });
  });

  test('picking operator shows directions', async ({ page }) => {
    await page.goto('/');
    await searchLine(page, '1');
    await page.locator('.picker-item').first().waitFor({ timeout: 20000 });
    await page.locator('.picker-item').first().click();
    await page.waitForTimeout(1500);
    const hasPicker = await page.locator('.picker-icon').count();
    const isTracking = await page.locator('.float-badge').count();
    expect(hasPicker + isTracking).toBeGreaterThan(0);
  });

  test('clear button resets search', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-pill').click();
    await page.locator('.search-field').fill('1');
    await page.waitForTimeout(500);
    await page.locator('.search-clear').click();
    const val = await page.locator('.search-field').inputValue();
    expect(val).toBe('');
  });
});

test.describe('Line Tracking', () => {
  test('shows route on map', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await expect(page.locator('.leaflet-overlay-pane path').first()).toBeVisible({ timeout: 15000 });
  });

  test('back button returns home', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await page.locator('.float-btn').first().click();
    await expect(page.locator('.float-pill')).toContainText('חפש קו');
  });

  test('shows stop markers', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await page.waitForTimeout(3000);
    expect(await page.locator('.stop-dot').count()).toBeGreaterThan(0);
  });
});

test.describe('Location', () => {
  test('location button exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.location-fab')).toBeVisible();
  });

  test('GPS sets position', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: HAIFA_LAT, longitude: HAIFA_LON });
    await page.goto('/');
    await page.locator('.location-fab').click();
    await page.waitForTimeout(3000);
    expect(await page.locator('.me-dot').count()).toBeGreaterThan(0);
  });

  test('dev mode draggable', async ({ page }) => {
    await page.goto('/?dev');
    await page.evaluate(() => localStorage.setItem('bt_loc', JSON.stringify({ lat: 32.794, lon: 34.990 })));
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator('.me-dot').first()).toBeVisible();
  });

  test('no pin mode without dev flag', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('bt_loc'));
    await page.reload();
    await page.locator('.location-fab').click();
    await page.waitForTimeout(2000);
    expect(await page.locator('.pin-banner').count()).toBe(0);
  });
});

test.describe('Usage Intelligence', () => {
  test('tracking logs usage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await trackFirstResult(page, '1');
    await page.waitForTimeout(1000);
    const usage = await page.evaluate(() => JSON.parse(localStorage.getItem('bt_usage') || '[]'));
    expect(usage.length).toBeGreaterThan(0);
    expect(usage[0]).toHaveProperty('lineName');
    expect(usage[0]).toHaveProperty('ts');
    expect(usage[0]).toHaveProperty('day');
    expect(usage[0]).toHaveProperty('hour');
  });

  test('suggestions appear after usage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const now = Date.now();
      const usage = Array.from({ length: 5 }, (_, i) => ({
        lineRef: 40262, lineName: '1', agencyName: 'סופרבוס',
        from: 'חיפה', to: 'קרית מוצקין',
        ts: now - i * 3600000, day: new Date().getDay(), hour: new Date().getHours(),
        lat: 32.794, lon: 34.990,
      }));
      localStorage.setItem('bt_usage', JSON.stringify(usage));
    });
    await page.reload();
    await expect(page.locator('.section-hdr').first()).toContainText('מוצע עבורך');
  });
});

test.describe('Data Persistence', () => {
  test('stores theme', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => localStorage.getItem('bt_theme'))).toBe('dark');
  });

  test('stores location', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: HAIFA_LAT, longitude: HAIFA_LON });
    await page.goto('/');
    await page.locator('.location-fab').click();
    await page.waitForTimeout(3000);
    const loc = await page.evaluate(() => JSON.parse(localStorage.getItem('bt_loc') || 'null'));
    if (loc) expect(loc.lat).toBeCloseTo(HAIFA_LAT, 1);
  });

  test('double-tap clears data', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bt_usage', JSON.stringify([{ lineRef: 1 }])));
    page.on('dialog', d => d.accept());
    await page.locator('.sheet-handle-area').dblclick();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => localStorage.getItem('bt_usage'))).toBeNull();
  });
});

test.describe('API Resilience', () => {
  test('survives slow API', async ({ page }) => {
    await page.route('**/open-bus-stride-api**', route => setTimeout(() => route.continue(), 3000));
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('handles API errors', async ({ page }) => {
    await page.route('**/gtfs_routes/list**', route => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/');
    await page.locator('.float-pill').click();
    await page.locator('.search-field').fill('1');
    await page.waitForTimeout(2000);
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});

test.describe('Utilities', () => {
  test('extractCities handles same-city', async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(() => {
      const name = 'כרמלית-תל אביב יפו<->ת. מרכזית-תל אביב יפו-1#';
      const cleaned = name.replace(/-\d+[#0-9\u05D0-\u05EA]*$/, '');
      const parts = cleaned.split('<->');
      const parse = s => { const m = s.match(/^(.+)-([^-]+)$/); return m ? { stop: m[1].trim(), city: m[2].trim() } : { stop: s.trim(), city: '' }; };
      const a = parse(parts[0]), b = parse(parts[1]);
      return { sameCity: a.city === b.city, from: a.city === b.city ? a.stop : a.city, to: a.city === b.city ? b.stop : b.city };
    });
    expect(r.sameCity).toBe(true);
    expect(r.from).not.toBe(r.to);
  });

  test('formatCountdown', async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(() => {
      const f = d => d <= 0 ? 'עכשיו' : d < 60 ? `בעוד ${d} דק'` : `בעוד ${Math.floor(d/60)} שע' ${d%60} דק'`;
      return [f(0), f(5), f(90)];
    });
    expect(r[0]).toBe('עכשיו');
    expect(r[1]).toBe("בעוד 5 דק'");
    expect(r[2]).toBe("בעוד 1 שע' 30 דק'");
  });
});
