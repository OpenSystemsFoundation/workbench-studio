import type { Page } from '@playwright/test';

/**
 * Walk the Learn library's tree to a page, by the titles on the way down —
 * `openLearnPage(page, 'Jazz & groove harmony', 'Extensions')`. Shelves start
 * open, so a page that sits directly on a shelf needs only its own title.
 * Where the tree is folded behind BROWSE (phones, narrow windows) it is opened
 * first; picking a row closes it again, hence the check on every step.
 */
export async function openLearnPage(page: Page, ...titles: string[]): Promise<void> {
  const browse = page.getByTestId('learn-browse');
  for (const title of titles) {
    if (await browse.isVisible() && (await browse.getAttribute('aria-expanded')) !== 'true') await browse.click();
    await page.getByTestId('learn-tree').getByRole('button', { name: title, exact: true }).click();
  }
}
