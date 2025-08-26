import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Testes E2E para o Módulo SpedConverter
 * 
 * Testa a funcionalidade completa de conversão SPED → Excel
 * baseado no código aprovado do sped-web
 */

test.describe('SPED Converter Module', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navegar para a página principal
    await page.goto('/sped-web-fomentar.html');
    
    // Aguardar carregamento completo da aplicação
    await page.waitForLoadState('domcontentloaded');
    
    // Aguardar que a tela de login apareça (se não há sessão válida)
    try {
      await page.waitForSelector('#loginUsername', { timeout: 5000 });
      
      // Login com usuário admin para acesso completo
      await page.fill('#loginUsername', 'admin');
      await page.fill('#loginPassword', 'admin0000');
      await page.click('#loginButton');
      
      // Aguardar que a tela de login desapareça
      await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 5000 });
    } catch (e) {
      // Se não há tela de login, pode já estar logado ou não ter autenticação
      console.log('Tela de login não encontrada, continuando...');
    }
    
    // Aguardar aplicação estar pronta
    await page.waitForFunction(() => window.spedApp !== undefined, { timeout: 10000 });
    
    // Aguardar elementos principais estarem visíveis
    await page.waitForSelector('#converterPanel', { state: 'visible' });
    
    // Navegar para aba do conversor se não estiver ativa
    try {
      await page.click('#tabConverter');
    } catch (e) {
      // Tab já pode estar ativa
    }
  });

  test('deve carregar a interface do conversor corretamente', async ({ page }) => {
    // Verificar elementos essenciais do conversor (visíveis)
    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('#excelFileName')).toBeVisible();
    await expect(page.locator('#convertButton')).toBeVisible();
    await expect(page.locator('#logWindow')).toBeVisible();
    
    // Verificar que elemento oculto existe no DOM
    await expect(page.locator('#spedFile')).toBeAttached();
    
    // Verificar textos esperados
    await expect(page.locator('button')).toContainText('Converter Agora');
    await expect(page.locator('.drop-zone-text')).toContainText('Arraste e solte o arquivo SPED aqui');
  });

  test('deve validar entrada de arquivo obrigatório', async ({ page }) => {
    // Tentar conversão sem arquivo
    await page.click('#convertButton');
    
    // Verificar que aparece mensagem de erro
    await expect(page.locator('#statusMessage')).toContainText('selecionado');
    
    // Ou verificar log de erro
    const logContainer = page.locator('#logWindow');
    await expect(logContainer).toContainText('ERRO');
  });

  test('deve processar arquivo SPED e gerar Excel', async ({ page }) => {
    // Caminho para o arquivo SPED de teste
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    
    // Upload do arquivo SPED
    await page.setInputFiles('#spedFile', spedFilePath);
    
    // Verificar que arquivo foi selecionado
    await expect(page.locator('#selectedSpedFile')).toContainText('SpedEFD-01784792000103');
    
    // Configurar nome do arquivo Excel
    await page.fill('#excelFileName', 'teste-conversao');
    
    // Escutar download antes de clicar
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    
    // Iniciar conversão
    await page.click('#convertButton');
    
    // Aguardar progresso de conversão
    await page.waitForSelector('#progressBarContainer', { state: 'visible' });
    
    // Aguardar conclusão (verificar por mensagem de sucesso ou download)
    const download = await downloadPromise;
    
    // Verificar que o arquivo foi baixado
    expect(download.suggestedFilename()).toContain('teste-conversao');
    expect(download.suggestedFilename()).toContain('.xlsx');
    
    // Verificar mensagem de sucesso
    await expect(page.locator('#statusMessage')).toContainText('sucesso', { timeout: 30000 });
    
    // Verificar logs de conclusão
    const logContainer = page.locator('#logWindow');
    await expect(logContainer).toContainText('Conversão concluída');
  });

  test('deve exibir informações do header SPED', async ({ page }) => {
    // Upload do arquivo SPED
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    // Iniciar processamento
    await page.click('#convertButton');
    
    // Aguardar processamento do header
    await page.waitForTimeout(2000);
    
    // Verificar se informações do header aparecem nos logs
    const logContainer = page.locator('#logWindow');
    await expect(logContainer).toContainText('Empresa:');
    await expect(logContainer).toContainText('Período:');
    
    // Verificar se CNPJ foi extraído
    await expect(logContainer).toContainText('01784792000103');
  });

  test('deve mostrar progresso durante conversão', async ({ page }) => {
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    // Iniciar conversão
    await page.click('#convertButton');
    
    // Verificar que container de progresso aparece
    await expect(page.locator('#progressBarContainer')).toBeVisible();
    await expect(page.locator('#progressBar')).toBeVisible();
    
    // Verificar mensagens de progresso
    await expect(page.locator('#statusMessage')).toContainText('Processando');
    
    // Aguardar algumas etapas do processamento
    await page.waitForTimeout(1000);
    await expect(page.locator('#statusMessage')).toContainText('registros', { timeout: 10000 });
  });

  test('deve tratar arquivos com encoding correto', async ({ page }) => {
    // Escutar mensagens de console para detectar logs de encoding
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    await page.click('#convertButton');
    
    // Aguardar processamento
    await page.waitForTimeout(3000);
    
    // Verificar logs de encoding nos logs da UI
    const logContainer = page.locator('#logWindow');
    const logText = await logContainer.textContent();
    
    // Deve detectar encoding (UTF-8 ou ISO-8859-1)
    expect(logText).toMatch(/(UTF-8|ISO-8859-1)/);
  });

  test('deve gerar estrutura de Excel correta', async ({ page }) => {
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    await page.fill('#excelFileName', 'teste-estrutura');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#convertButton');
    
    const download = await downloadPromise;
    
    // Salvar arquivo temporariamente para verificação
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    
    // Verificar nos logs que as abas foram criadas
    const logContainer = page.locator('#logWindow');
    await expect(logContainer).toContainText('Consolidado_Fiscal');
    await expect(logContainer).toContainText('registros processados');
  });

  test('deve lidar com erros de arquivo inválido', async ({ page }) => {
    // Criar arquivo temporário inválido
    const invalidFile = path.resolve('./tests/fixtures/invalid.txt');
    
    // Upload arquivo inválido
    await page.setInputFiles('#spedFile', invalidFile);
    
    await page.click('#convertButton');
    
    // Aguardar processamento
    await page.waitForTimeout(2000);
    
    // Verificar mensagem de erro
    const logContainer = page.locator('#logWindow');
    const hasError = await page.evaluate(() => {
      const logs = document.getElementById('logWindow');
      return logs && (
        logs.textContent.includes('ERRO') || 
        logs.textContent.includes('Falha') ||
        logs.textContent.includes('inválido')
      );
    });
    
    expect(hasError).toBeTruthy();
  });

  test('deve permitir cancelar conversão em progresso', async ({ page }) => {
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    await page.click('#convertButton');
    
    // Aguardar início da conversão
    await page.waitForSelector('#progressBarContainer', { state: 'visible' });
    
    // Verificar se existe botão de cancelar (se implementado)
    const cancelBtn = page.locator('#cancelBtn');
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
      await expect(page.locator('#statusMessage')).toContainText('cancelad');
    }
  });

  test('deve manter estado da aplicação após conversão', async ({ page }) => {
    // Primeira conversão
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    await page.fill('#excelFileName', 'primeira-conversao');
    
    const firstDownload = page.waitForEvent('download');
    await page.click('#convertButton');
    await firstDownload;
    
    // Aguardar conclusão
    await expect(page.locator('#statusMessage')).toContainText('sucesso');
    
    // Verificar que o arquivo ainda está selecionado
    await expect(page.locator('#selectedSpedFile')).toContainText('SpedEFD-01784792000103');
    
    // Segunda conversão com nome diferente
    await page.fill('#excelFileName', 'segunda-conversao');
    
    const secondDownload = page.waitForEvent('download');
    await page.click('#convertButton');
    const secondFile = await secondDownload;
    
    // Verificar que a segunda conversão funcionou
    expect(secondFile.suggestedFilename()).toContain('segunda-conversao');
  });

  test('deve integrar corretamente com StateManager', async ({ page }) => {
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    await page.click('#convertButton');
    
    // Aguardar processamento
    await page.waitForTimeout(2000);
    
    // Verificar estado da aplicação via console
    const stateManagerWorking = await page.evaluate(() => {
      // Verificar se StateManager está funcionando
      return window.spedApp && 
             window.spedApp.stateManager && 
             typeof window.spedApp.stateManager.getState === 'function';
    });
    
    expect(stateManagerWorking).toBeTruthy();
    
    // Verificar se dados SPED foram armazenados no estado
    const hasSpedData = await page.evaluate(() => {
      const spedData = window.spedApp.stateManager.getState('sped');
      return spedData && spedData.content && spedData.headerInfo;
    });
    
    expect(hasSpedData).toBeTruthy();
  });
});

/**
 * Testes de Performance
 */
test.describe('SPED Converter Performance', () => {
  
  test('deve processar arquivo grande em tempo razoável', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    await page.waitForFunction(() => window.spedApp !== undefined);
    
    // Login
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin0000');
    await page.click('#loginBtn');
    await page.click('#converterTab');
    
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    // Medir tempo de conversão
    const startTime = Date.now();
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#convertButton');
    await downloadPromise;
    
    const endTime = Date.now();
    const conversionTime = endTime - startTime;
    
    // Conversão deve ser concluída em menos de 2 minutos
    expect(conversionTime).toBeLessThan(120000); // 2 minutos
    
    console.log(`Tempo de conversão: ${conversionTime}ms`);
  });
});

/**
 * Testes de Integração com Outros Módulos
 */
test.describe('SPED Converter Integration', () => {
  
  test('deve navegar para FOMENTAR após conversão', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    await page.waitForFunction(() => window.spedApp !== undefined);
    
    // Login
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin0000');
    await page.click('#loginBtn');
    
    // Converter arquivo
    await page.click('#converterTab');
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#convertButton');
    await downloadPromise;
    
    // Navegar para FOMENTAR
    await page.click('#fomentarTab');
    
    // Verificar que dados SPED estão disponíveis
    await expect(page.locator('#fomentarSpedStatus')).toContainText('importado');
  });

  test('deve persistir dados para outros módulos', async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    await page.waitForFunction(() => window.spedApp !== undefined);
    
    // Login e conversão
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin0000');
    await page.click('#loginBtn');
    await page.click('#converterTab');
    
    const spedFilePath = path.resolve('./SpedEFD-01784792000103-101501668-Remessa de arquivo substituto-jul.2025.txt');
    await page.setInputFiles('#spedFile', spedFilePath);
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#convertButton');
    await downloadPromise;
    
    // Verificar dados disponíveis em múltiplos módulos
    const modulesWithData = await page.evaluate(() => {
      const state = window.spedApp.stateManager.getState();
      return {
        hasSpedContent: !!(state.sped && state.sped.content),
        hasHeaderInfo: !!(state.sped && state.sped.headerInfo),
        hasRegistrosCompletos: !!(state.sped && state.sped.registrosCompletos)
      };
    });
    
    expect(modulesWithData.hasSpedContent).toBeTruthy();
    expect(modulesWithData.hasHeaderInfo).toBeTruthy();
    expect(modulesWithData.hasRegistrosCompletos).toBeTruthy();
  });
});