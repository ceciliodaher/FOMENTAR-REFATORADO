import { test, expect } from '@playwright/test';

/**
 * Teste Simples para Verificar Funcionamento Básico
 */

test.describe('Teste Simples do Sistema', () => {
  
  test('deve carregar a página principal', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    
    // Verificar que a página carregou
    await expect(page).toHaveTitle(/Conversor SPED/);
    
    // Verificar elementos básicos
    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('#convertButton')).toBeVisible();
    
    console.log('✅ Página carregou corretamente');
  });

  test('deve tentar conversão sem arquivo e mostrar erro', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    
    // Aguardar carregamento
    await page.waitForSelector('#convertButton');
    
    // Tentar conversão sem arquivo
    await page.click('#convertButton');
    
    // Aguardar um pouco para processar
    await page.waitForTimeout(2000);
    
    // Verificar se há mensagem de erro em qualquer lugar
    const bodyText = await page.textContent('body');
    const hasError = bodyText.includes('selecionado') || 
                    bodyText.includes('ERRO') || 
                    bodyText.includes('arquivo');
    
    expect(hasError).toBeTruthy();
    
    console.log('✅ Validação de arquivo funcionando');
  });

  test('deve mostrar aplicação carregada', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    
    // Aguardar aplicação principal
    await page.waitForFunction(() => window.spedApp !== undefined, { timeout: 10000 });
    
    // Verificar se a aplicação foi inicializada
    const appInitialized = await page.evaluate(() => {
      return !!(window.spedApp && 
               window.spedApp.spedConverter && 
               window.spedApp.logger);
    });
    
    expect(appInitialized).toBeTruthy();
    
    console.log('✅ Aplicação modular inicializada');
  });
});