/**
 * Testes Unitários para SpedConverter
 * 
 * Testa métodos individuais da classe SpedConverter
 * em isolamento usando mocks quando necessário
 */

import { test, expect } from '@playwright/test';

test.describe('SpedConverter Unit Tests', () => {
  let mockLogger, mockStateManager, mockUIManager, mockSpedParser;

  test.beforeEach(async ({ page }) => {
    await page.goto('/sped-web-fomentar.html');
    await page.waitForFunction(() => window.spedApp !== undefined);
    
    // Login
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin0000');
    await page.click('#loginBtn');
  });

  test('deve instanciar SpedConverter corretamente', async ({ page }) => {
    const hasConverter = await page.evaluate(() => {
      return !!(window.spedApp && window.spedApp.spedConverter);
    });
    
    expect(hasConverter).toBeTruthy();
    
    // Verificar propriedades essenciais
    const converterProperties = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      return {
        hasLogger: !!(converter.logger),
        hasStateManager: !!(converter.stateManager),
        hasUIManager: !!(converter.uiManager),
        hasSpedParser: !!(converter.spedParser)
      };
    });
    
    expect(converterProperties.hasLogger).toBeTruthy();
    expect(converterProperties.hasStateManager).toBeTruthy();
    expect(converterProperties.hasUIManager).toBeTruthy();
    expect(converterProperties.hasSpedParser).toBeTruthy();
  });

  test('deve obter layout de registro corretamente', async ({ page }) => {
    const layoutTest = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      
      // Testar layouts conhecidos
      const layout0000 = converter.obterLayoutRegistro('0000');
      const layoutC190 = converter.obterLayoutRegistro('C190');
      const layoutInexistente = converter.obterLayoutRegistro('XXXX');
      
      return {
        layout0000: layout0000,
        layoutC190: layoutC190,
        layoutInexistente: layoutInexistente,
        layout0000IsArray: Array.isArray(layout0000),
        layoutC190IsArray: Array.isArray(layoutC190)
      };
    });
    
    expect(layoutTest.layout0000IsArray).toBeTruthy();
    expect(layoutTest.layoutC190IsArray).toBeTruthy();
    expect(layoutTest.layoutInexistente).toEqual(['REG', 'DADOS']); // Default fallback
    
    // Layout 0000 deve conter campos esperados
    expect(layoutTest.layout0000).toContain('REG');
    expect(layoutTest.layout0000).toContain('COD_VER');
    
    // Layout C190 deve conter campos esperados
    expect(layoutTest.layoutC190).toContain('REG');
    expect(layoutTest.layoutC190).toContain('CFOP');
    expect(layoutTest.layoutC190).toContain('VL_OPR');
  });

  test('deve processar SPED para registros completos', async ({ page }) => {
    // Mock de conteúdo SPED simples
    const mockSpedContent = `|0000|0011|01012024|31012024|EMPRESA TESTE|01234567000100|GO|1234|5678||
|C100|0|1|123456|55|00|1|01234567000100|12345678901234|01012024|01012024|100.00|0|100.00|0||
|C190|01012024|5101|00|18.00|100.00|18.00|18.00|0.00|0.00|0.00|0.00|0.00|0.00||
|9999|5||`;

    const registrosProcessados = await page.evaluate((spedContent) => {
      const converter = window.spedApp.spedConverter;
      return converter.lerArquivoSpedCompleto(spedContent);
    }, mockSpedContent);
    
    // Verificar que registros foram processados
    expect(typeof registrosProcessados).toBe('object');
    expect(registrosProcessados['0000']).toBeDefined();
    expect(registrosProcessados['C100']).toBeDefined();
    expect(registrosProcessados['C190']).toBeDefined();
    expect(registrosProcessados['9999']).toBeDefined();
    
    // Verificar estrutura dos registros
    expect(Array.isArray(registrosProcessados['0000'])).toBeTruthy();
    expect(registrosProcessados['0000'].length).toBe(1);
    expect(registrosProcessados['C190'].length).toBe(1);
  });

  test('deve ajustar colunas corretamente', async ({ page }) => {
    const ajusteTest = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      
      // Teste 1: Colunas a mais que dados
      const colunas1 = ['A', 'B', 'C', 'D', 'E'];
      const ajuste1 = converter._ajustarColunas(3, colunas1);
      
      // Teste 2: Dados a mais que colunas
      const colunas2 = ['A', 'B'];
      const ajuste2 = converter._ajustarColunas(5, colunas2);
      
      // Teste 3: Mesmo número
      const colunas3 = ['A', 'B', 'C'];
      const ajuste3 = converter._ajustarColunas(3, colunas3);
      
      return {
        ajuste1,
        ajuste2,
        ajuste3
      };
    });
    
    // Verificar ajustes
    expect(ajusteTest.ajuste1).toEqual(['A', 'B', 'C']); // Truncado
    expect(ajusteTest.ajuste2.length).toBe(5); // Expandido
    expect(ajusteTest.ajuste2).toEqual(['A', 'B', 'Campo_3', 'Campo_4', 'Campo_5']);
    expect(ajusteTest.ajuste3).toEqual(['A', 'B', 'C']); // Inalterado
  });

  test('deve validar entrada de arquivo corretamente', async ({ page }) => {
    // Teste sem arquivo
    const validacaoSemArquivo = await page.evaluate(async () => {
      try {
        const converter = window.spedApp.spedConverter;
        await converter.processSpedFile();
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    });
    
    expect(validacaoSemArquivo.success).toBeFalsy();
    expect(validacaoSemArquivo.message).toContain('Nenhum arquivo SPED selecionado');
  });

  test('deve inicializar estado do conversor', async ({ page }) => {
    const estadoInicialTest = await page.evaluate(async () => {
      const converter = window.spedApp.spedConverter;
      const stateManager = window.spedApp.stateManager;
      
      // Simular início de conversão
      stateManager.updateState({
        converter: {
          isProcessing: true,
          progress: 0,
          status: 'processing'
        }
      });
      
      return stateManager.getState('converter');
    });
    
    expect(estadoInicialTest.isProcessing).toBe(true);
    expect(estadoInicialTest.progress).toBe(0);
    expect(estadoInicialTest.status).toBe('processing');
  });

  test('deve integrar com UIManager para feedback', async ({ page }) => {
    const integracaoUI = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      const uiManager = converter.uiManager;
      
      // Verificar métodos essenciais do UIManager
      return {
        hasUpdateStatus: typeof uiManager.updateStatus === 'function',
        hasShowError: typeof uiManager.showError === 'function',
        hasConversaoConcluida: typeof uiManager.conversaoConcluida === 'function'
      };
    });
    
    expect(integracaoUI.hasUpdateStatus).toBeTruthy();
    expect(integracaoUI.hasShowError).toBeTruthy();
    expect(integracaoUI.hasConversaoConcluida).toBeTruthy();
  });

  test('deve tratar erros de processamento', async ({ page }) => {
    const tratamentoErros = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      
      try {
        // Tentar processar conteúdo inválido
        const registrosInvalidos = converter.lerArquivoSpedCompleto('conteudo_invalido');
        
        // Deve retornar objeto vazio para conteúdo inválido
        return {
          success: true,
          registrosVazios: Object.keys(registrosInvalidos).length === 0,
          tipoRetorno: typeof registrosInvalidos
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(tratamentoErros.success).toBeTruthy();
    expect(tratamentoErros.tipoRetorno).toBe('object');
    expect(tratamentoErros.registrosVazios).toBeTruthy();
  });

  test('deve preservar dados no StateManager', async ({ page }) => {
    const preservacaoDados = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      const stateManager = converter.stateManager;
      
      // Mock de dados SPED processados
      const mockRegistros = {
        '0000': ['|0000|0011|01012024|31012024|EMPRESA TESTE|01234567000100|'],
        'C190': ['|C190|01012024|5101|00|18.00|100.00|18.00|18.00|']
      };
      
      // Simular atualização de estado
      stateManager.updateState({
        sped: {
          registrosCompletos: mockRegistros,
          headerInfo: {
            nomeEmpresa: 'EMPRESA TESTE',
            periodo: '01/2024',
            cnpj: '01234567000100'
          }
        }
      });
      
      // Verificar persistência
      const estadoSped = stateManager.getState('sped');
      
      return {
        temRegistros: !!(estadoSped.registrosCompletos),
        temHeaderInfo: !!(estadoSped.headerInfo),
        nomeEmpresaCorreto: estadoSped.headerInfo?.nomeEmpresa === 'EMPRESA TESTE',
        periodoCorreto: estadoSped.headerInfo?.periodo === '01/2024'
      };
    });
    
    expect(preservacaoDados.temRegistros).toBeTruthy();
    expect(preservacaoDados.temHeaderInfo).toBeTruthy();
    expect(preservacaoDados.nomeEmpresaCorreto).toBeTruthy();
    expect(preservacaoDados.periodoCorreto).toBeTruthy();
  });

  test('deve integrar com SpedParser corretamente', async ({ page }) => {
    const integracaoParser = await page.evaluate(() => {
      const converter = window.spedApp.spedConverter;
      const spedParser = converter.spedParser;
      
      return {
        temSpedParser: !!(spedParser),
        temDetectAndRead: typeof spedParser.detectAndRead === 'function',
        temLerArquivoSpedParaHeader: typeof spedParser.lerArquivoSpedParaHeader === 'function',
        temExtrairInformacoesHeader: typeof spedParser.extrairInformacoesHeader === 'function'
      };
    });
    
    expect(integracaoParser.temSpedParser).toBeTruthy();
    expect(integracaoParser.temDetectAndRead).toBeTruthy();
    expect(integracaoParser.temLerArquivoSpedParaHeader).toBeTruthy();
    expect(integracaoParser.temExtrairInformacoesHeader).toBeTruthy();
  });
});