import { expect, test } from '@playwright/test'

async function assertNoOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
}

async function finishDisplayCheck(page: import('@playwright/test').Page) {
  const skip = page.getByRole('button', { name: 'Skip' })
  if (await skip.isVisible()) await skip.click()
}

test('first choice persists, history is real, export and reset work', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await finishDisplayCheck(page)
  const cards = page.getByRole('button', { name: /^Choose/ })
  await expect(cards).toHaveCount(2)
  await cards.first().click()
  await expect(page.getByText('1 answer')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 answer')).toBeVisible()
  await page.getByRole('tab', { name: 'You' }).click()
  await expect(page.getByText('Not enough answers yet').first()).toBeVisible()
  await expect(page.getByText('93%')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Estimated color for/ })).toHaveCount(1)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  expect((await download).suggestedFilename()).toMatch(/^your-color-.*\.json$/)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reset local data' }).click()
  await page.getByRole('tab', { name: 'Discover' }).click()
  await expect(page.getByText('0 answers')).toBeVisible()
  expect(errors).toEqual([])
})

test('mobile 390px keeps equal cards, keyboard flow, and no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await finishDisplayCheck(page)
  await assertNoOverflow(page)
  await page.screenshot({ path: 'test-results/mobile-discover.png', fullPage: true })
  const cards = page.getByRole('button', { name: /^Choose/ })
  const firstBox = await cards.nth(0).boundingBox()
  const secondBox = await cards.nth(1).boundingBox()
  expect(Math.abs((firstBox?.width ?? 0) - (secondBox?.width ?? 0))).toBeLessThan(1)
  await cards.first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('1 answer')).toBeVisible()
  await page.getByRole('tab', { name: 'You' }).click()
  await assertNoOverflow(page)
  const sharing = page.getByRole('switch', { name: 'Help improve the model' })
  await expect(sharing).not.toBeChecked()
  await page.getByText('Help improve the model', { exact: true }).click()
  await expect(sharing).toBeChecked()
  const historyDay = await page.getByRole('button', { name: /Estimated color for/ }).boundingBox()
  expect(historyDay?.width).toBeGreaterThanOrEqual(44)
  expect(historyDay?.height).toBeGreaterThanOrEqual(44)
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'test-results/mobile-you.png', fullPage: true })
})

test('desktop analytics composition has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await finishDisplayCheck(page)
  await assertNoOverflow(page)
  await page.screenshot({ path: 'test-results/desktop-discover.png', fullPage: true })
  await page.getByRole('tab', { name: 'Discover' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'You' })).toBeFocused()
  await expect(page.getByRole('heading', { name: /Your color/ })).toBeVisible()
  await assertNoOverflow(page)
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'test-results/desktop-you.png', fullPage: true })
})

test('available-result notice stays in flow on mobile and desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await finishDisplayCheck(page)
  for (let count = 1; count <= 32; count++) {
    await page.locator('.color-card').first().click()
    await expect(page.locator('.choice-count strong')).toHaveText(String(count))
  }
  const notice = page.getByRole('status', { name: 'Your color is ready to view' })
  await expect(notice).toBeVisible()
  const noticeBox = await notice.boundingBox()
  const cardsBox = await page.locator('.comparison').boundingBox()
  expect((noticeBox?.x ?? -1) >= 0 && (noticeBox?.x ?? 0) + (noticeBox?.width ?? 0) <= 390).toBe(true)
  expect((noticeBox?.y ?? 0) + (noticeBox?.height ?? 0) <= (cardsBox?.y ?? 0)).toBe(true)
  await assertNoOverflow(page)
  await page.screenshot({ path: 'test-results/mobile-result-available.png', fullPage: true })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(notice).toBeVisible()
  await assertNoOverflow(page)
  await page.screenshot({ path: 'test-results/desktop-result-available.png', fullPage: true })
})
