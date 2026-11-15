import { test, expect } from '@playwright/test';
import { openLearnPage } from './learn';

// The Learn tab as a library: one catalogue drives the tree, the breadcrumbs,
// the index pages, the pager, the search box and the command palette.

test.describe('learn library · desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'learn' }).click();
  });

  test('opens on the front desk with every shelf, and the tree beside it', async ({ page }) => {
    const index = page.getByTestId('learn-index');
    for (const shelf of ['Harmony', 'Scales & melody', 'Fretboard', 'Rhythm', 'Bass', 'Song form', 'Practice']) {
      await expect(index.getByRole('button', { name: shelf, exact: true })).toBeVisible();
    }
    await expect(page.getByTestId('learn-tree')).toBeVisible();
    await expect(page.getByTestId('learn-browse')).toBeHidden();
  });

  test('shelf → book → page through the index cards, with a breadcrumb back', async ({ page }) => {
    const index = page.getByTestId('learn-index');
    await index.getByRole('button', { name: 'Jazz & groove harmony' }).click();
    await expect(page.getByRole('heading', { name: 'Jazz & groove harmony' })).toBeVisible();
    await index.getByRole('button', { name: 'The ii–V–I' }).click();
    await expect(page.getByTestId('learn-page')).toHaveAttribute('data-page', 'harmony/jazz/the-ii-v-i');

    const crumbs = page.getByTestId('learn-crumbs');
    await expect(crumbs).toHaveText(/Library\s*›\s*Harmony\s*›\s*Jazz & groove harmony\s*›\s*The ii–V–I/);
    // the tree shows where you are
    await expect(page.getByTestId('learn-tree').getByRole('button', { name: 'The ii–V–I', exact: true })).toHaveAttribute('aria-current', 'page');

    await crumbs.getByRole('button', { name: 'Harmony', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Harmony', exact: true })).toBeVisible();
    await expect(page.getByTestId('learn-index').getByRole('button', { name: 'Chord palettes' })).toBeVisible();
  });

  test('the pager reads on across books and shelves', async ({ page }) => {
    await openLearnPage(page, 'Jazz & groove harmony', 'Funky Basslines');
    const pager = page.getByTestId('learn-pager');
    await pager.getByRole('button', { name: /Next/ }).click();
    await expect(page.getByRole('heading', { name: 'The jazz palette' })).toBeVisible();
    await pager.getByRole('button', { name: /Previous/ }).click();
    await expect(page.getByRole('heading', { name: 'Funky Basslines' })).toBeVisible();
  });

  test('folding a book hides its pages; the open page keeps its branch open', async ({ page }) => {
    const tree = page.getByTestId('learn-tree');
    await expect(tree.getByRole('button', { name: 'Extensions', exact: true })).toBeHidden();
    await tree.getByRole('button', { name: 'expand Jazz & groove harmony' }).click();
    await expect(tree.getByRole('button', { name: 'Extensions', exact: true })).toBeVisible();
    await tree.getByRole('button', { name: 'collapse Jazz & groove harmony' }).click();
    await expect(tree.getByRole('button', { name: 'Extensions', exact: true })).toBeHidden();

    await openLearnPage(page, 'Jazz & groove harmony', 'Extensions');
    await expect(tree.getByRole('button', { name: 'collapse Jazz & groove harmony' })).toBeDisabled();
  });

  test('search finds a page by what it is about', async ({ page }) => {
    await page.getByTestId('learn-search').fill('clave');
    await page.getByTestId('learn-search-results').getByRole('button', { name: /The building blocks/ }).click();
    await expect(page.getByText('The Clave — a Timeline', { exact: true })).toBeVisible();
    await expect(page.getByTestId('learn-search')).toHaveValue('');
  });

  test('a palette chip still places its chord into the progression', async ({ page }) => {
    await openLearnPage(page, 'Chord palettes', 'The jazz palette');
    await page.getByRole('button', { name: 'add Dm7 to the progression' }).click();
    await openLearnPage(page, 'What you can do to a chord');
    await expect(page.getByText('EDITING')).toBeVisible();
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'chords' }).click();
    await expect(page.getByText(/Empty — type the changes above/)).toBeHidden();
  });

  test('the ? links on the tool tabs land on the page that explains them', async ({ page }) => {
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'drums' }).click();
    await page.getByRole('button', { name: 'how this groove is built' }).click();
    await expect(page.getByTestId('learn-page')).toHaveAttribute('data-page', 'rhythm/your-groove');
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'bass' }).click();
    await page.getByRole('button', { name: 'the moves behind a bassline' }).click();
    await expect(page.getByTestId('learn-page')).toHaveAttribute('data-page', 'bass/moves');
  });

  test('the command palette jumps straight to a page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('learn caged');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('learn-page')).toHaveAttribute('data-page', 'fretboard/caged');
  });

  test('comes back to the page you were reading', async ({ page }) => {
    await openLearnPage(page, 'Song structures');
    await page.reload();
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'learn' }).click();
    await expect(page.getByTestId('learn-page')).toHaveAttribute('data-page', 'song-form/structures');
  });
});

test.describe('learn library · phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the tree folds behind BROWSE and nothing overflows sideways', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mobile-tabs').getByRole('tab', { name: 'learn' }).click();
    await expect(page.getByTestId('learn-tree')).toBeHidden();
    await expect(page.getByTestId('learn-index')).toBeVisible();

    await page.getByTestId('learn-browse').click();
    await expect(page.getByTestId('learn-tree')).toBeVisible();
    await page.getByTestId('learn-tree').getByRole('button', { name: 'CAGED', exact: true }).click();
    // picking a page puts the tree away again
    await expect(page.getByTestId('learn-tree')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'CAGED' })).toBeVisible();

    for (const title of ['The jazz palette', 'The groove library', 'Song structures']) {
      await openLearnPage(page, ...(title === 'The jazz palette' ? ['Chord palettes', title] : [title]));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, title).toBeLessThanOrEqual(0);
    }
  });
});
