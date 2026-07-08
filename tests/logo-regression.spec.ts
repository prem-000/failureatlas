import { test, expect } from '@playwright/test';

// Define the viewports to test for responsiveness and visual regression
const VIEWPORTS = [
  { width: 320, height: 568, name: 'mobile-xs' },
  { width: 375, height: 812, name: 'mobile-md' },
  { width: 768, height: 1024, name: 'tablet-portrait' },
  { width: 1024, height: 768, name: 'tablet-landscape' },
  { width: 1440, height: 900, name: 'desktop-md' },
  { width: 1920, height: 1080, name: 'desktop-lg' },
];

test.describe('Praxis Logo Visual Regression & Responsiveness', () => {
  
  for (const viewport of VIEWPORTS) {
    test(`Capture and compare Logo showcase at ${viewport.width}x${viewport.height} (${viewport.name})`, async ({ page }) => {
      // Set the viewport size
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // Navigate to the Logo design system showcase page
      await page.goto('/design/logo');

      // Wait for the page structure and logo styles to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Ensure the logo element is visible on the screen
      const logoHeader = page.locator('.logo-animation-container');
      if (await logoHeader.count() > 0) {
        await expect(logoHeader.first()).toBeVisible();
      }

      // Hide cursor/blinking animations if any to avoid visual diff noise
      await page.addStyleTag({
        content: `
          * {
            animation-play-state: paused !important;
            transition: none !important;
          }
        `,
      });

      // Assert visual regression screenshot matches baseline
      await expect(page).toHaveScreenshot(`logo-showcase-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.1, // strictly match visual elements
      });
    });
  }

  test('Interactive elements accessibility checks', async ({ page }) => {
    await page.goto('/design/logo');
    await page.waitForLoadState('networkidle');

    // Select the interactive logo button
    const interactiveLogo = page.locator('button[aria-label="Praxis"]').first();
    await expect(interactiveLogo).toBeVisible();

    // Verify touch target is at least 44x44px
    const boundingBox = await interactiveLogo.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox.height).toBeGreaterThanOrEqual(44);
    }

    // Verify keyboard navigation
    await page.keyboard.press('Tab');
    
    // Focus the interactive logo using standard keyboard tab
    await expect(interactiveLogo).toBeFocused();

    // Trigger keyboard actions
    await page.keyboard.press('Enter');
    
    // Check that we can hit Spacebar
    await page.keyboard.press('Space');
  });
});
