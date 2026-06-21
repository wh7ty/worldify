import { expect, test } from '@playwright/test'

test.describe('worldify smoke flows', () => {
  test('dashboard and settings data tab render in e2e mode', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Aethoria' })).toBeVisible()
    await expect(page.getByText('Ein ruhiges High-Fantasy-Universum mit alten Waldern und zersplitterten Reichen.')).toBeVisible()

    await page.getByRole('button', { name: 'Benutzermenü öffnen' }).click()
    await page.getByRole('button', { name: 'Settings' }).last().click()

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Data' }).click()

    await expect(page.getByText('Automatische Backups', { exact: true })).toBeVisible()
    await expect(page.getByText('Intervall', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jetzt testen' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jetzt testen' })).toBeDisabled()
  })

  test('delete confirm dialog opens from entity page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /Elara Moonwhisper/i }).first().click()
    await expect(page).toHaveURL(/\/entities\//)

    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByRole('heading', { name: /wirklich löschen/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'In Papierkorb verschieben' })).toBeVisible()
    await page.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(page.getByRole('button', { name: 'In Papierkorb verschieben' })).toHaveCount(0)
  })

  test('delete confirm dialog can be confirmed from entity page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /Elara Moonwhisper/i }).first().click()
    await expect(page).toHaveURL(/\/entities\//)

    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'In Papierkorb verschieben' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText(/wiederhergestellt|Papierkorb|gelöscht/i)).toHaveCount(0)
  })

  test('trash page empty state renders', async ({ page }) => {
    await page.goto('/trash')

    await expect(page.getByRole('heading', { name: 'Papierkorb' })).toBeVisible()
    await expect(page.getByText('Papierkorb ist leer')).toBeVisible()
  })

  test('trash page shows restorable entity after confirmed delete', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /Elara Moonwhisper/i }).first().click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'In Papierkorb verschieben' }).click()

    await page.goto('/trash')
    await expect(page.getByRole('heading', { name: 'Papierkorb' })).toBeVisible()
    await expect(page.getByText('Elara Moonwhisper')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wiederherstellen' })).toBeVisible()
  })

  test('import dialog opens from dashboard', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Import' }).click()

    await expect(page.getByRole('heading', { name: 'Backup importieren' })).toBeVisible()
    await expect(page.getByPlaceholder('z.B. Mein Worldbuilding')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Importieren' })).toBeDisabled()
  })
})
