import { test, expect } from '@playwright/test';

/**
 * Teste Funcional do Conversor SPED
 * Inclui autenticação correta e validação da funcionalidade
 */

test.describe('Converter SPED - Funcional', () => {
  
  test('deve fazer login e acessar conversor', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    
    // Aguardar tela de login aparecer
    await page.waitForSelector('#loginUsername', { timeout: 10000 });
    
    // Fazer login
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    
    // Aguardar login ser processado e tela principal aparecer
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    
    // Verificar que chegou na aplicação principal
    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('#convertButton')).toBeVisible();
    await expect(page.locator('#excelFileName')).toBeVisible();
    
    console.log('✅ Login realizado e interface do conversor carregada');
  });

  test('deve validar arquivo obrigatório', async ({ page }) => {
    // Login primeiro
    await page.goto('/sped-web-fomentar.html');
    await page.waitForSelector('#loginUsername');
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    await page.waitForSelector('#dropZone', { state: 'visible' });
    
    // Tentar conversão sem arquivo
    await page.click('#convertButton');
    
    // Aguardar um pouco para processar
    await page.waitForTimeout(2000);
    
    // Verificar se há mensagem de erro
    const statusMessage = await page.textContent('#statusMessage');
    const logWindow = await page.textContent('#logWindow');
    
    const hasError = (statusMessage && statusMessage.includes('selecionado')) ||
                    (logWindow && logWindow.includes('ERRO')) ||
                    (logWindow && logWindow.includes('Nenhum arquivo'));
    
    expect(hasError).toBeTruthy();
    
    console.log('✅ Validação de arquivo funcionando corretamente');
  });

  test('deve carregar aplicação modular', async ({ page }) => {
    // Login primeiro
    await page.goto('/sped-web-fomentar.html');
    await page.waitForSelector('#loginUsername');
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    await page.waitForSelector('#dropZone', { state: 'visible' });
    
    // Verificar se a aplicação modular foi inicializada
    const appModules = await page.evaluate(() => {
      return {
        spedApp: !!(window.spedApp),
        spedConverter: !!(window.spedApp && window.spedApp.spedConverter),
        stateManager: !!(window.spedApp && window.spedApp.stateManager),
        logger: !!(window.spedApp && window.spedApp.logger),
        spedParser: !!(window.spedApp && window.spedApp.spedParser),
        uiManager: !!(window.spedApp && window.spedApp.uiManager),
        uiValidator: !!(window.spedApp && window.spedApp.uiValidator)
      };
    });
    
    // Verificar módulos principais
    expect(appModules.spedApp).toBeTruthy();
    expect(appModules.spedConverter).toBeTruthy();
    expect(appModules.stateManager).toBeTruthy();
    expect(appModules.logger).toBeTruthy();
    expect(appModules.spedParser).toBeTruthy();
    expect(appModules.uiManager).toBeTruthy();
    expect(appModules.uiValidator).toBeTruthy();
    
    console.log('✅ Todos os módulos da arquitetura ES6 carregados');
  });

  test('deve testar funcionalidade de upload de arquivo', async ({ page }) => {
    // Login primeiro
    await page.goto('/sped-web-fomentar.html');
    await page.waitForSelector('#loginUsername');
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    await page.waitForSelector('#dropZone', { state: 'visible' });
    
    // Configurar nome do arquivo de saída
    await page.fill('#excelFileName', 'teste-upload');
    
    // Verificar que campo de nome do arquivo funciona
    const fileName = await page.inputValue('#excelFileName');
    expect(fileName).toBe('teste-upload');
    
    // Verificar se elementos de upload estão presentes
    await expect(page.locator('#spedFile')).toBeAttached();
    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('.drop-zone-text')).toContainText('Arraste e solte');
    
    console.log('✅ Funcionalidade de upload configurada');
  });

  test('deve navegar entre abas', async ({ page }) => {
    // Login primeiro
    await page.goto('/sped-web-fomentar.html');
    await page.waitForSelector('#loginUsername');
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    await page.waitForSelector('#dropZone', { state: 'visible' });
    
    // Verificar abas disponíveis
    await expect(page.locator('#tabConverter')).toBeVisible();
    await expect(page.locator('#tabFomentar')).toBeVisible();
    await expect(page.locator('#tabProgoias')).toBeVisible();
    await expect(page.locator('#tabLogproduzir')).toBeVisible();
    
    // Navegar para FOMENTAR
    await page.click('#tabFomentar');
    await page.waitForTimeout(500);
    
    // Voltar para Conversor
    await page.click('#tabConverter');
    await expect(page.locator('#dropZone')).toBeVisible();
    
    console.log('✅ Navegação entre abas funcionando');
  });

  test('deve mostrar logs durante o processo', async ({ page }) => {
    // Login primeiro
    await page.goto('/sped-web-fomentar.html');
    await page.waitForSelector('#loginUsername');
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    await page.waitForSelector('#dropZone', { state: 'visible' });
    
    // Verificar que container de logs está presente
    await expect(page.locator('#logWindow')).toBeVisible();
    await expect(page.locator('#logContainer')).toBeVisible();
    
    // Tentar conversão para gerar logs
    await page.click('#convertButton');
    await page.waitForTimeout(1000);
    
    // Verificar se apareceram logs
    const logContent = await page.textContent('#logWindow');
    expect(logContent).toBeTruthy();
    
    console.log('✅ Sistema de logs funcionando');
  });

  test('deve validar StateManager funcionando', async ({ page }) => {
    // Login primeiro
    await page.goto('/sped-web-fomentar.html');
    await page.waitForSelector('#loginUsername');
    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin0000');
    await page.click('#loginButton');
    await page.waitForSelector('#dropZone', { state: 'visible' });
    
    // Testar StateManager
    const stateManagerTest = await page.evaluate(() => {
      const stateManager = window.spedApp.stateManager;
      
      // Testar funcionalidades básicas
      stateManager.updateState({
        converter: {
          testValue: 'teste123'
        }
      });
      
      const testValue = stateManager.getState('converter.testValue');
      const allState = stateManager.getState();
      
      return {
        canUpdateState: testValue === 'teste123',
        hasAllState: !!(allState && allState.converter),
        hasConverterState: !!(allState.converter),
        hasSpedState: !!(allState.sped)
      };
    });
    
    expect(stateManagerTest.canUpdateState).toBeTruthy();
    expect(stateManagerTest.hasAllState).toBeTruthy();
    expect(stateManagerTest.hasConverterState).toBeTruthy();
    expect(stateManagerTest.hasSpedState).toBeTruthy();
    
    console.log('✅ StateManager funcionando corretamente');
  });
});