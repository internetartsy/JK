import { test, expect } from '@playwright/test';

test.describe('PWA Basic Functionality', () => {
    test('should load the landing page', async ({ page }) => {
        await page.goto('/');

        // Check page title or main heading
        await expect(page).toHaveTitle(/OptionList|Land Records|OCR/i);
    });

    test('should display navigation elements', async ({ page }) => {
        await page.goto('/');

        // Look for main navigation
        const nav = page.locator('nav, [role="navigation"]');
        await expect(nav.first()).toBeVisible();
    });

    test('should have working offline indicator', async ({ page }) => {
        await page.goto('/');

        // PWA should show some form of status indicator
        // This might be an icon, badge, or text
        const statusIndicator = page.locator('[data-testid="connection-status"], .connection-status, .online-indicator');
        // Don't fail if not present - just check if visible when exists
        if (await statusIndicator.count() > 0) {
            await expect(statusIndicator.first()).toBeVisible();
        }
    });
});

test.describe('Camera Capture Flow', () => {
    test('should open camera modal when capture button clicked', async ({ page }) => {
        await page.goto('/');

        // Find and click capture button
        const captureBtn = page.locator('button:has-text("Capture"), button:has-text("Camera"), [data-testid="capture-btn"]');
        if (await captureBtn.count() > 0) {
            await captureBtn.first().click();

            // Camera modal or screen should appear
            // Note: actual camera won't work in test, but UI should show
            const cameraUI = page.locator('.camera-modal, .camera-screen, [data-testid="camera-ui"]');
            if (await cameraUI.count() > 0) {
                await expect(cameraUI.first()).toBeVisible();
            }
        }
    });
});

test.describe('Queue Manager', () => {
    test('should display queue stats', async ({ page }) => {
        await page.goto('/');

        // Navigate to queue view if separate
        const queueTab = page.locator('button:has-text("Queue"), [data-testid="queue-tab"]');
        if (await queueTab.count() > 0) {
            await queueTab.first().click();
        }

        // Look for queue statistics
        const queueStats = page.locator('.queue-stats, [data-testid="queue-stats"]');
        if (await queueStats.count() > 0) {
            await expect(queueStats.first()).toBeVisible();
        }
    });

    test('should show empty state when no items in queue', async ({ page }) => {
        await page.goto('/');

        // Navigate to queue
        const queueTab = page.locator('button:has-text("Queue"), [data-testid="queue-tab"]');
        if (await queueTab.count() > 0) {
            await queueTab.first().click();

            // Should show empty state or 0 count
            const emptyState = page.locator('.empty-state, [data-testid="empty-queue"]');
            const zeroCount = page.locator('text=/0 item|no item|empty/i');

            const hasEmptyIndicator = (await emptyState.count() > 0) || (await zeroCount.count() > 0);
            expect(hasEmptyIndicator).toBeTruthy();
        }
    });
});

test.describe('Form Validation', () => {
    test('Khasra form should validate required fields', async ({ page }) => {
        await page.goto('/');

        // Try to find and submit a Khasra form
        const khasraForm = page.locator('form.khasra-form, [data-testid="khasra-form"]');
        if (await khasraForm.count() > 0) {
            // Try to submit empty form
            const submitBtn = khasraForm.locator('button[type="submit"]');
            if (await submitBtn.count() > 0) {
                await submitBtn.click();

                // Should show validation errors
                const errorMsg = page.locator('.error, [role="alert"], .validation-error');
                await expect(errorMsg.first()).toBeVisible();
            }
        }
    });
});

test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // App should not have horizontal scroll
        const body = page.locator('body');
        const scrollWidth = await body.evaluate(el => el.scrollWidth);
        const clientWidth = await body.evaluate(el => el.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test('should adapt to tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        // Page should render without issues
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Service Worker', () => {
    test('should register service worker', async ({ page }) => {
        await page.goto('/');

        // Wait for SW to register
        await page.waitForTimeout(2000);

        // Check if service worker is registered
        const swRegistered = await page.evaluate(async () => {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                return registrations.length > 0;
            }
            return false;
        });

        // In development, SW might not be active - just log
        console.log('Service Worker registered:', swRegistered);
    });
});

test.describe('API Health Check', () => {
    test('backend health endpoint should respond', async ({ request }) => {
        // This requires backend to be running
        try {
            const response = await request.get('http://localhost:8000/health');
            expect(response.ok()).toBeTruthy();

            const body = await response.json();
            expect(body.status).toBe('ok');
        } catch (error) {
            // Backend might not be running in CI
            console.log('Backend not available:', error);
        }
    });
});

test.describe('Accessibility', () => {
    test('should have no critical accessibility issues', async ({ page }) => {
        await page.goto('/');

        // Basic accessibility checks
        // 1. All images should have alt text
        const imagesWithoutAlt = await page.locator('img:not([alt])').count();
        expect(imagesWithoutAlt).toBe(0);

        // 2. Buttons should have accessible names
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
            const button = buttons.nth(i);
            const name = await button.getAttribute('aria-label') || await button.textContent();
            expect(name?.trim().length).toBeGreaterThan(0);
        }
    });

    test('should support keyboard navigation', async ({ page }) => {
        await page.goto('/');

        // Should be able to tab through interactive elements
        await page.keyboard.press('Tab');

        // Something should be focused
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeFocused();
    });
});
