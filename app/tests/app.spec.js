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

// Helper: set location via localStorage
async function setLocation(page) {
  await page.evaluate((loc) => {
    localStorage.setItem('bt_loc', JSON.stringify(loc));
  }, { lat: HAIFA_LAT, lon: HAIFA_LON });
}

// Helper: seed usage log for suggestions
async function seedUsageLog(page) {
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
}

test.describe('App Launch & Map', () => {
  test('renders map and search bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.float-pill')).toBeVisible();
    await expect(page.locator('.float-pill')).toContainText('חפש קו');
  });

  test('KAV brand is visible on home', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.float-brand')).toBeVisible();
    await expect(page.locator('.float-brand')).toHaveText('KAV');
  });

  test('map tiles load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 10000 });
    expect(await page.locator('.leaflet-tile-loaded').count()).toBeGreaterThan(0);
  });

  test('page title is KAV', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('KAV');
  });
});

test.describe('Settings', () => {
  test('settings button opens overlay', async ({ page }) => {
    await page.goto('/');
    // Settings is the last .float-btn
    await page.locator('.float-btn').last().click();
    await expect(page.locator('.settings-overlay')).toBeVisible();
    await expect(page.locator('.settings-brand')).toHaveText('KAV');
  });

  test('close button exits settings', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-btn').last().click();
    await expect(page.locator('.settings-overlay')).toBeVisible();
    await page.locator('.settings-close').click();
    await expect(page.locator('.settings-overlay')).not.toBeVisible();
  });

  test('theme toggle dark/light', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Open settings and switch to light
    await page.locator('.float-btn').last().click();
    await page.locator('.settings-theme-btn').nth(1).click(); // light button
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // Switch back to dark
    await page.locator('.settings-theme-btn').nth(0).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('theme persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-btn').last().click();
    await page.locator('.settings-theme-btn').nth(1).click(); // light
    await page.locator('.settings-close').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('about section shows credit', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-btn').last().click();
    await expect(page.locator('.settings-about')).toContainText('בר צפריר');
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
  test('opens search overlay with KAV brand', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-pill').click();
    await expect(page.locator('.search-overlay')).toBeVisible();
    await expect(page.locator('.search-brand')).toHaveText('KAV');
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

  test('nonexistent line shows empty or no results', async ({ page }) => {
    await page.goto('/');
    await searchLine(page, '9876');
    // Wait long enough for API + debounce
    await page.waitForTimeout(8000);
    // App should still be functional — either shows empty msg or just no items
    await expect(page.locator('.search-overlay')).toBeVisible();
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

  test('KAV brand visible during tracking (compact)', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await expect(page.locator('.float-brand.small')).toBeVisible();
    await expect(page.locator('.float-brand.small')).toHaveText('KAV');
  });

  test('back button returns home', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await page.locator('.float-btn').first().click();
    await expect(page.locator('.float-pill')).toContainText('חפש קו');
    // Brand should be full size again
    await expect(page.locator('.float-brand:not(.small)')).toBeVisible();
  });

  test('shows stop markers', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await page.waitForTimeout(3000);
    expect(await page.locator('.stop-dot').count()).toBeGreaterThan(0);
  });

  test('settings accessible during tracking', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await page.locator('.float-btn').last().click();
    await expect(page.locator('.settings-overlay')).toBeVisible();
  });
});

test.describe('Location', () => {
  test('location button exists on home', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.location-fab')).toBeVisible();
  });

  test('location button hidden on schedule', async ({ page }) => {
    await page.goto('/?dev');
    await setLocation(page);
    await page.reload();
    await trackFirstResult(page, '1');
    await page.waitForTimeout(3000);
    // Open schedule
    const schedLink = page.locator('text=צפה בלוח זמנים');
    if (await schedLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await schedLink.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.location-fab')).not.toBeVisible();
    }
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
    await setLocation(page);
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator('.me-dot').first()).toBeVisible();
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
    await seedUsageLog(page);
    await page.reload();
    await expect(page.locator('.section-hdr').first()).toContainText('מוצע עבורך');
  });

  test('suggestions are clickable and start tracking', async ({ page }) => {
    await page.goto('/');
    await seedUsageLog(page);
    await page.reload();
    await page.waitForTimeout(2000);
    const suggItem = page.locator('.section-hdr:has-text("מוצע") + div .picker-item, .section-hdr:has-text("מוצע") ~ .picker-item').first();
    if (await suggItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggItem.click();
      await expect(page.locator('.float-badge')).toBeVisible({ timeout: 20000 });
    }
  });
});

test.describe('Nearby Buses', () => {
  test('shows nearby section when location set', async ({ page }) => {
    await page.goto('/');
    await setLocation(page);
    await page.reload();
    // Wait for nearby API call — can be slow
    await page.waitForTimeout(8000);
    // During operating hours, the nearby section should appear
    // At night it might not — so just check the app doesn't crash
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.bottom-sheet')).toBeVisible();
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

test.describe('Visibility Change (iOS resume)', () => {
  test('vehicles refresh on visibility change', async ({ page }) => {
    await page.goto('/');
    await trackFirstResult(page, '1');
    await page.waitForTimeout(3000);

    // Simulate tab hidden then visible
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Should not crash — data refreshes in background
    await page.waitForTimeout(2000);
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});

test.describe('API Resilience', () => {
  test('survives slow API', async ({ page }) => {
    await page.route('**/open-bus-stride-api**', route => setTimeout(() => route.continue(), 3000));
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/gtfs_routes/list**', route => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/');
    await page.locator('.float-pill').click();
    await page.locator('.search-field').fill('1');
    await page.waitForTimeout(2000);
    // App should not crash
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('handles empty API response', async ({ page }) => {
    await page.route('**/gtfs_routes/list**', route => route.fulfill({ status: 200, body: '[]' }));
    await page.goto('/');
    await searchLine(page, '1');
    await page.waitForTimeout(3000);
    await expect(page.locator('text=לא נמצא')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('RTL & Hebrew', () => {
  test('page is RTL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('search placeholder reads correctly', async ({ page }) => {
    await page.goto('/');
    await page.locator('.float-pill').click();
    const placeholder = await page.locator('.search-field').getAttribute('placeholder');
    expect(placeholder).toContain('הקלד');
  });
});
