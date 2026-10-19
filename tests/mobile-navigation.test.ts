import { chromium } from '@playwright/test';
import * as assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3001';

const VIEWPORTS = [
  { width: 320, height: 600, name: '320px (iPhone SE 1st gen)' },
  { width: 375, height: 667, name: '375px (iPhone SE 2nd/3rd gen)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 430, height: 932, name: '430px (iPhone 14/15 Pro Max)' },
];

const EXPECTED_TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/problems', label: 'Problems' },
  { href: '/graph', label: 'Graph' },
  { href: '/diagnosis', label: 'Diagnosis' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/settings', label: 'Settings' },
];

async function runMobileNavigationTests() {
  console.log('--- Launching Browser for Mobile Navigation Verification ---');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // Mock auth to allow AppShell to render
      await page.addInitScript(() => {
        localStorage.setItem('token', 'mock-test-token');
        localStorage.setItem('user', JSON.stringify({ name: 'Test User', email: 'test@example.com' }));
      });

      // 1. Visit /dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Verify mobile-tab-bar is visible and nav-rail is hidden
      const mobileTabBar = page.locator('.mobile-tab-bar');
      const isMobileBarVisible = await mobileTabBar.isVisible();
      assert.strictEqual(isMobileBarVisible, true, `mobile-tab-bar must be visible at ${vp.width}px`);

      const navRail = page.locator('.nav-rail');
      const isNavRailVisible = await navRail.isVisible();
      assert.strictEqual(isNavRailVisible, false, `desktop nav-rail must be hidden at ${vp.width}px`);

      // Verify all 6 tabs exist
      const tabItems = mobileTabBar.locator('.mobile-tab-item');
      const count = await tabItems.count();
      assert.strictEqual(count, 6, `Expected exactly 6 tabs on mobile, found ${count}`);

      // Verify tab labels and links
      for (let i = 0; i < EXPECTED_TABS.length; i++) {
        const tab = tabItems.nth(i);
        const expected = EXPECTED_TABS[i];
        const href = await tab.getAttribute('href');
        const text = (await tab.locator('.mobile-tab-label').textContent())?.trim();
        assert.strictEqual(href, expected.href, `Tab ${i} href should be ${expected.href}`);
        assert.strictEqual(text, expected.label, `Tab ${i} label should be ${expected.label}`);

        // Check bounding box for touch target & clipping
        const box = await tab.boundingBox();
        assert.ok(box, `Tab ${expected.label} bounding box must exist`);
        assert.ok(box.width >= 40, `Tab ${expected.label} width (${box.width}px) should be >= 40px`);
        assert.ok(box.height >= 44, `Tab ${expected.label} height (${box.height}px) should be >= 44px (touch target)`);

        // Check that label text doesn't overflow
        const labelOverflow = await tab.locator('.mobile-tab-label').evaluate((el) => {
          return el.scrollWidth > el.clientWidth;
        });
        assert.strictEqual(
          labelOverflow,
          false,
          `Tab label "${expected.label}" overflows or clips at ${vp.width}px! scrollWidth > clientWidth`
        );
      }

      // Check active state on /dashboard
      const dashboardTab = mobileTabBar.locator('a[href="/dashboard"]');
      const dashboardClass = await dashboardTab.getAttribute('class');
      assert.ok(dashboardClass?.includes('active'), 'Dashboard tab must be active on /dashboard');

      // 2. Click or Navigate to /diagnosis
      const diagnosisTab = mobileTabBar.locator('a[href="/diagnosis"]');
      await diagnosisTab.click();
      await page.waitForURL('**/diagnosis**', { timeout: 15000 });
      await page.waitForTimeout(300);

      // Verify URL updated to /diagnosis
      assert.ok(page.url().includes('/diagnosis'), `Expected URL to include /diagnosis, got ${page.url()}`);

      // Verify diagnosis tab is active
      const diagnosisClass = await diagnosisTab.getAttribute('class');
      assert.ok(diagnosisClass?.includes('active'), 'Diagnosis tab must be active on /diagnosis');

      // Verify dashboard is no longer active
      const newDashboardClass = await dashboardTab.getAttribute('class');
      assert.ok(!newDashboardClass?.includes('active'), 'Dashboard tab must not be active on /diagnosis');

      console.log(`  ✓ All 6 tabs verified and fit cleanly at ${vp.width}px`);
      console.log(`  ✓ Diagnosis tab accessible and highlights active on navigation`);

      await context.close();
    }

    // 3. Desktop verification (width: 1280px)
    console.log('\nTesting desktop navigation: 1280x800');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-token');
      localStorage.setItem('user', JSON.stringify({ name: 'Test User', email: 'test@example.com' }));
    });
    await desktopPage.goto(`${BASE_URL}/diagnosis`, { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(500);

    const desktopNavRail = desktopPage.locator('.nav-rail');
    assert.strictEqual(await desktopNavRail.isVisible(), true, 'Desktop nav rail must be visible at 1280px');

    const desktopMobileBar = desktopPage.locator('.mobile-tab-bar');
    assert.strictEqual(await desktopMobileBar.isVisible(), false, 'Mobile tab bar must be hidden at 1280px');

    const desktopDiagnosisItem = desktopNavRail.locator('a[href="/diagnosis"]');
    assert.strictEqual(await desktopDiagnosisItem.isVisible(), true, 'Desktop diagnosis nav item must be visible');
    const desktopItemClass = await desktopDiagnosisItem.getAttribute('class');
    assert.ok(desktopItemClass?.includes('active'), 'Desktop diagnosis item must be active on /diagnosis');

    console.log('  ✓ Desktop nav-rail preserved with diagnosis active');

    await desktopContext.close();
    console.log('\n========================================');
    console.log('ALL MOBILE AND DESKTOP NAVIGATION TESTS PASSED!');
    console.log('========================================');
  } finally {
    await browser.close();
  }
}

runMobileNavigationTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
