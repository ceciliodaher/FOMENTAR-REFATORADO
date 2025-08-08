import { 
  CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS,
  CFOP_ENTRADAS_INCENTIVADAS,
  CFOP_SAIDAS_INCENTIVADAS,
  PROGOIAS_CONFIG
} from '../../core/constants.js';
import { formatCurrency, parseFloatSafe, parsePeriod } from '../../core/utils.js';

export class ProgoiasCalculator {
  constructor(logger) {
    this.logger = logger;
  }

  calculateProgoias(registros, configuracoes) {
    this.logger.info('Iniciando cálculo ProGoiás...');
    
    try {
      // 1. Classificar operações
      const operacoes = this.classifyOperationsProgoias(registros, configuracoes);
      
      // 2. Calcular base de cálculo
      const baseCalculo = this.calcularBaseCalculoProgoias(operacoes, configuracoes);
      
      // 3. Aplicar percentual ProGoiás
      const percentualProgoias = this.obterPercentualProgoias(configuracoes);
      
      // 4. Calcular crédito outorgado ou tratamento especial para baixo IDH
      let creditoProgoias, valorProtege, resultado;
      
      if (configuracoes.anoFruicao === 'baixo-idh') {
        // Tratamento especial para baixo IDH: carga tributária de 2%
        resultado = this.calcularBaixoIDH(operacoes, configuracoes);
        creditoProgoias = resultado.creditoAplicado;
        valorProtege = 0; // Não paga Protege
      } else {
        // Cálculo normal
        creditoProgoias = baseCalculo * (percentualProgoias / 100);
        
        // 5. Calcular PROTEGE (percentual decrescente)
        valorProtege = this.calcularProtege(creditoProgoias, configuracoes);
        
        // 6. Calcular resultado final
        resultado = this.calcularResultadoFinal(
          operacoes, 
          creditoProgoias, 
          valorProtege, 
          configuracoes
        );
      }
      
      const dadosCompletos = {
        configuracao: configuracoes,
        operacoes: operacoes,
        baseCalculo: baseCalculo,
        percentualProgoias: percentualProgoias,
        creditoProgoias: creditoProgoias,
        valorProtege: valorProtege,
        resultado: resultado,
        quadroA: this.gerarQuadroA(operacoes, baseCalculo, percentualProgoias, creditoProgoias),
        quadroB: this.gerarQuadroB(operacoes, creditoProgoias, valorProtege, resultado),
        registroE115: this.gerarRegistroE115ProGoias(creditoProgoias)
      };
      
      this.logger.success(`ProGoiás calculado - Crédito: ${formatCurrency(creditoProgoias)}`);
      
      return dadosCompletos;
      
    } catch (error) {
      this.logger.error(`Erro no cálculo ProGoiás: ${error.message}`);
      throw error;
    }
  }

  classifyOperationsProgoias(registros, configuracoes) {
    const operations = {
      saidasIncentivadas: [],
      entradasIncentivadas: [],
      outrosCreditosIncentivados: 0,
      outrosDebitosIncentivados: 0,
      icmsSaidasIncentivadas: 0,
      icmsEntradasIncentivadas: 0,
      memoriaCalculo: {
        operacoesDetalhadas: [],
        ajustesE111: [],
        exclusoes: []
      }
    };

    this.logger.info('Classificando operações para ProGoiás...');

    // Processar registros consolidados
    this.processarRegistrosConsolidadosProgoias(registros, operations, configuracoes);
    
    // Processar ajustes E111
    this.processarAjustesE111Progoias(registros, operations);
    
    // Log resumo
    this.logger.info(`ICMS Saídas Incentivadas: ${formatCurrency(operations.icmsSaidasIncentivadas)}`);
    this.logger.info(`ICMS Entradas Incentivadas: ${formatCurrency(operations.icmsEntradasIncentivadas)}`);
    this.logger.info(`Outros Créditos Incentivados: ${formatCurrency(operations.outrosCreditosIncentivados)}`);
    this.logger.info(`Outros Débitos Incentivados: ${formatCurrency(operations.outrosDebitosIncentivados)}`);
    
    return operations;
  }

  processarRegistrosConsolidadosProgoias(registros, operations, configuracoes) {
    const tiposRegistros = ['C190', 'C590', 'D190', 'D590'];
    
    tiposRegistros.forEach(tipoRegistro => {
      if (!registros[tipoRegistro]) return;
      
      const layout = this.obterLayoutRegistro(tipoRegistro);
      if (!layout) return;
      
      registros[tipoRegistro].forEach((registro, index) => {
        const campos = registro.slice(1, -1);
        
        const cfop = campos[layout.indexOf('CFOP')] || '';
        const valorOperacao = parseFloatSafe(campos[layout.indexOf('VL_OPR')]);
        const valorIcms = parseFloatSafe(campos[layout.indexOf('VL_ICMS')]);
        
        if (!cfop || valorOperacao === 0) return;
        
        const tipoOperacao = this.determinarTipoOperacao(cfop);
        const isIncentivada = this.determinarSeIncentivadaProgoias(cfop, tipoOperacao, configuracoes);
        
        if (isIncentivada) {
          const operacao = {
            tipo: tipoRegistro,
            cfop,
            valorOperacao,
            valorIcms,
            tipoOperacao
          };
          
          if (tipoOperacao === 'ENTRADA') {
            operations.entradasIncentivadas.push(operacao);
            operations.icmsEntradasIncentivadas += valorIcms;
          } else {
            operations.saidasIncentivadas.push(operacao);
            operations.icmsSaidasIncentivadas += valorIcms;
          }
          
          operations.memoriaCalculo.operacoesDetalhadas.push({
            origem: tipoRegistro,
            cfop,
            tipoOperacao,
            incentivada: true,
            valorOperacao,
            valorIcms
          });
        }
      });
    });
  }

  processarAjustesE111Progoias(registros, operations) {
    if (!registros.E111 || registros.E111.length === 0) return;
    
    this.logger.info(`Processando ${registros.E111.length} registros E111 para ProGoiás...`);
    
    const layout = this.obterLayoutRegistro('E111');
    
    registros.E111.forEach(registro => {
      const campos = registro.slice(1, -1);
      const codAjuste = campos[layout.indexOf('COD_AJ_APUR')] || '';
      const valorAjuste = parseFloatSafe(campos[layout.indexOf('VL_AJ_APUR')]);
      
      if (!codAjuste || valorAjuste === 0) return;
      
      // Verificar se é código incentivado conforme ProGoiás
      const isIncentivado = CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS.some(cod => 
        codAjuste.includes(cod)
      );
      
      if (isIncentivado) {
        const tipoAjuste = this.determinarTipoAjustePorCodigo(codAjuste);
        const valorAbsoluto = Math.abs(valorAjuste);
        
        if (tipoAjuste === 'CRÉDITO') {
          operations.outrosCreditosIncentivados += valorAbsoluto;
        } else if (tipoAjuste === 'DÉBITO') {
          operations.outrosDebitosIncentivados += valorAbsoluto;
        }
        
        operations.memoriaCalculo.ajustesE111.push({
          codigo: codAjuste,
          valor: valorAbsoluto,
          tipo: tipoAjuste,
          incentivado: true
        });
      }
    });
  }

  calcularBaseCalculoProgoias(operacoes, configuracoes) {
    // Base de cálculo ProGoiás conforme IN 1478/2020 Art. 6º: ICMSS - ICMSE - AJCRED + AJDEB
    const icmss = operacoes.icmsSaidasIncentivadas;
    const icmse = operacoes.icmsEntradasIncentivadas;
    const ajcred = operacoes.outrosCreditosIncentivados;
    const ajdeb = operacoes.outrosDebitosIncentivados;
    
    const baseCalculo = Math.max(0, icmss - icmse - ajcred + ajdeb);
    
    this.logger.info(`Fórmula ProGoiás: ICMSS(${formatCurrency(icmss)}) - ICMSE(${formatCurrency(icmse)}) - AJCRED(${formatCurrency(ajcred)}) + AJDEB(${formatCurrency(ajdeb)}) = ${formatCurrency(baseCalculo)}`);
    
    if (baseCalculo === 0) {
      this.logger.warn(`Base de cálculo zero devido a: Entradas(${formatCurrency(icmse)}) + Créditos(${formatCurrency(ajcred)}) >= Saídas(${formatCurrency(icmss)}) + Débitos(${formatCurrency(ajdeb)})`);
    }
    
    return baseCalculo;
  }

  obterPercentualProgoias(configuracoes) {
    const anoFruicao = configuracoes.anoFruicao || 1;
    const tipoEmpresa = configuracoes.tipoEmpresa || 'optante';
    
    let percentual;
    
    if (configuracoes.opcaoCalculo === 'manual' && configuracoes.percentualManual) {
      percentual = configuracoes.percentualManual;
      this.logger.info(`Percentual manual aplicado: ${percentual}%`);
    } else if (anoFruicao === 'meta') {
      // Empresa com meta de arrecadação
      percentual = PROGOIAS_CONFIG.PERCENTUAL_META;
      this.logger.info(`Percentual ProGoiás com meta: ${percentual}%`);
    } else if (anoFruicao === 'baixo-idh') {
      // Região de baixo IDH - carga tributária de 2%
      percentual = 0; // Será tratado especialmente no cálculo
      this.logger.info('Modo baixo IDH: carga tributária de 2%');
    } else {
      // Aplicar percentuais conforme decreto por ano
      if (tipoEmpresa === 'optante') {
        const ano = parseInt(anoFruicao);
        if (ano === 1) {
          percentual = 64;
        } else if (ano === 2) {
          percentual = 65;
        } else {
          percentual = 66;
        }
      } else {
        // Não optante - percentuais diferentes (simplificado)
        percentual = Math.max(50, PROGOIAS_CONFIG.PERCENTUAL_PADRAO - (parseInt(anoFruicao) * 3));
      }
      
      this.logger.info(`Percentual ProGoiás ${anoFruicao}º ano: ${percentual}%`);
    }
    
    return percentual;
  }

  calcularResultadoFinal(operacoes, creditoProgoias, valorProtege, configuracoes) {
    const icmsPorMedia = configuracoes.icmsPorMedia || 0;
    const saldoCredorAnterior = configuracoes.saldoCredorAnterior || 0;
    
    // Calcular ICMS devido antes dos incentivos
    const icmsDevido = operacoes.icmsSaidasIncentivadas + operacoes.outrosDebitosIncentivados;
    const creditosDisponiveis = operacoes.icmsEntradasIncentivadas + operacoes.outrosCreditosIncentivados + saldoCredorAnterior;
    
    const saldoDevedorBruto = Math.max(0, icmsDevido - creditosDisponiveis);
    const icmsBase = Math.max(0, saldoDevedorBruto - icmsPorMedia);
    
    // Aplicar crédito ProGoiás
    const icmsAposProgoias = Math.max(0, icmsBase - creditoProgoias);
    
    // Aplicar PROTEGE
    const icmsFinal = Math.max(0, icmsAposProgoias - valorProtege);
    
    // Calcular economia
    const economiaProgoias = creditoProgoias;
    const economiaProtege = Math.min(valorProtege, icmsAposProgoias);
    const economiaTotal = economiaProgoias + economiaProtege;
    
    return {
      icmsDevido,
      creditosDisponiveis,
      saldoDevedorBruto,
      icmsBase,
      icmsAposProgoias,
      icmsFinal,
      economiaProgoias,
      economiaProtege,
      economiaTotal
    };
  }

  gerarQuadroA(operacoes, baseCalculo, percentualProgoias, creditoProgoias) {
    return {
      GO100001: percentualProgoias, // Percentual ProGoiás
      GO100002: operacoes.icmsSaidasIncentivadas, // ICMS Saídas Incentivadas
      GO100003: operacoes.icmsEntradasIncentivadas, // ICMS Entradas Incentivadas
      GO100004: operacoes.outrosCreditosIncentivados, // Outros Créditos
      GO100005: operacoes.outrosDebitosIncentivados, // Outros Débitos
      baseCalculo: baseCalculo,
      GO100009: creditoProgoias // Crédito ProGoiás
    };
  }

  gerarQuadroB(operacoes, creditoProgoias, valorProtege, resultado) {
    return {
      item01_debitoIcms: operacoes.icmsSaidasIncentivadas,
      item02_outrosDebitos: operacoes.outrosDebitosIncentivados,
      item04_totalDebitos: operacoes.icmsSaidasIncentivadas + operacoes.outrosDebitosIncentivados,
      item05_creditosEntradas: operacoes.icmsEntradasIncentivadas,
      item06_outrosCreditos: operacoes.outrosCreditosIncentivados,
      item09_creditoProgoias: creditoProgoias,
      item13_icmsARecolher: resultado.icmsAposProgoias,
      item14_valorProtege: valorProtege,
      item15_icmsFinal: resultado.icmsFinal,
      economiaTotal: resultado.economiaTotal
    };
  }

  calcularProtege(creditoProgoias, configuracoes) {
    const anoFruicao = configuracoes.anoFruicao;
    
    if (anoFruicao === 'baixo-idh') {
      return 0; // Baixo IDH não paga Protege
    }
    
    // Obter percentual Protege decrescente
    let percentualProtege;
    if (configuracoes.percentualProtege !== undefined) {
      percentualProtege = parseFloat(configuracoes.percentualProtege) / 100;
    } else {
      // Usar configuração automática baseada no ano
      const ano = parseInt(anoFruicao) || 1;
      if (ano === 1) {
        percentualProtege = PROGOIAS_CONFIG.PROTEGE_PERCENTUAIS[1] / 100; // 10%
      } else if (ano === 2) {
        percentualProtege = PROGOIAS_CONFIG.PROTEGE_PERCENTUAIS[2] / 100; // 8%
      } else {
        percentualProtege = PROGOIAS_CONFIG.PROTEGE_PERCENTUAIS[3] / 100; // 6%
      }
    }
    
    const valorProtege = creditoProgoias * percentualProtege;
    this.logger.info(`Protege ${(percentualProtege * 100).toFixed(0)}%: ${formatCurrency(valorProtege)}`);
    
    return valorProtege;
  }

  calcularBaixoIDH(operacoes, configuracoes) {
    const icmsPorMedia = configuracoes.icmsPorMedia || 0;
    const saldoCredorAnterior = configuracoes.saldoCredorAnterior || 0;
    
    // Calcular ICMS devido antes dos incentivos
    const icmsDevido = operacoes.icmsSaidasIncentivadas + operacoes.outrosDebitosIncentivados;
    const creditosDisponiveis = operacoes.icmsEntradasIncentivadas + operacoes.outrosCreditosIncentivados + saldoCredorAnterior;
    
    const saldoDevedorBruto = Math.max(0, icmsDevido - creditosDisponiveis);
    const icmsBase = Math.max(0, saldoDevedorBruto - icmsPorMedia);
    
    // Calcular crédito para atingir carga tributária de 2%
    const cargaTributariaDesejada = icmsBase * PROGOIAS_CONFIG.CARGA_TRIBUTARIA_BAIXO_IDH;
    const creditoNecessario = icmsBase - cargaTributariaDesejada;
    const creditoAplicado = Math.max(0, Math.min(creditoNecessario, icmsBase));
    
    const icmsFinal = Math.max(0, icmsBase - creditoAplicado);
    
    this.logger.info(`Baixo IDH - Carga tributária 2%: ${formatCurrency(icmsFinal)} de ${formatCurrency(icmsBase)}`);
    
    return {
      icmsDevido,
      creditosDisponiveis,
      saldoDevedorBruto,
      icmsBase,
      creditoAplicado,
      icmsFinal,
      economiaTotal: creditoAplicado,
      icmsAposProgoias: icmsFinal,
      economiaProgoias: creditoAplicado,
      economiaProtege: 0
    };
  }

  gerarRegistroE115ProGoias(creditoProgoias) {
    if (creditoProgoias <= 0) return [];
    
    return [{
      codigo: 'GO020158',
      valor: creditoProgoias,
      descricao: 'Crédito outorgado pelo PROGOIÁS',
      registroSped: `|E115|GO020158|${creditoProgoias.toFixed(2)}|PROGOIÁS - Crédito Outorgado|`
    }];
  }

  // Métodos auxiliares
  determinarTipoOperacao(cfop) {
    if (cfop.startsWith('1') || cfop.startsWith('2') || cfop.startsWith('3')) {
      return 'ENTRADA';
    }
    return 'SAIDA';
  }

  determinarSeIncentivadaProgoias(cfop, tipoOperacao, configuracoes) {
    // Usar mesma lógica do FOMENTAR para ProGoiás
    if (tipoOperacao === 'ENTRADA') {
      return CFOP_ENTRADAS_INCENTIVADAS.includes(cfop);
    } else {
      return CFOP_SAIDAS_INCENTIVADAS.includes(cfop);
    }
  }

  determinarTipoAjustePorCodigo(codigoAjuste) {
    if (!codigoAjuste || codigoAjuste.length !== 8) {
      return 'INDEFINIDO';
    }

    const quartoDigito = codigoAjuste.charAt(3);
    
    switch (quartoDigito) {
      case '0': return 'DÉBITO';
      case '1': return 'DÉBITO';
      case '2': return 'CRÉDITO';
      case '3': return 'CRÉDITO';
      case '4': return 'DEDUÇÃO';
      case '5': return 'DÉBITO';
      case '9': return 'CONTROLE';
      default: return 'INDEFINIDO';
    }
  }

  obterLayoutRegistro(tipoRegistro) {
    const layouts = {
      'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],
      'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
      'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC', 'COD_OBS'],
      'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
      'E111': ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR']
    };
    
    return layouts[tipoRegistro] || null;
  }

  /**
   * Analisa códigos E111 para possível correção (ProGoiás)
   */
  analyzeE111Codes(registros, isMultiplePeriods = false) {
    const codigosEncontrados = [];
    
    if (registros['E111']) {
      registros['E111'].forEach((registro, index) => {
        const codAjuste = registro[3]; // COD_AJ_APUR na posição 3  
        const valorAjuste = parseFloatSafe(registro[5] || '0'); // VL_AJ_APUR na posição 5
        
        if (codAjuste && valorAjuste !== 0) {
          const tipoAjuste = this.determinarTipoAjustePorCodigo(codAjuste);
          const isIncentivado = CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS.includes(codAjuste);
          
          codigosEncontrados.push({
            codigo: codAjuste,
            valor: valorAjuste,
            tipo: tipoAjuste,
            isIncentivado,
            indiceRegistro: index,
            registro: registro,
            descricao: `Código de ajuste ${codAjuste} (ProGoiás)`,
            periodo: isMultiplePeriods ? 'múltiplo' : 'único'
          });
        }
      });
    }
    
    this.logger.info(`Códigos E111 ProGoiás analisados: ${codigosEncontrados.length} encontrados`);
    return codigosEncontrados;
  }

  /**
   * Analisa códigos C197/D197 para possível correção (ProGoiás)
   */
  analyzeC197D197Codes(registros, isMultiplePeriods = false) {
    const codigosEncontrados = [];
    
    ['C197', 'D197'].forEach(origem => {
      if (registros[origem]) {
        registros[origem].forEach((registro, index) => {
          const codAjuste = registro[3]; // COD_AJ na posição 3
          const valorAjuste = parseFloatSafe(registro[4] || '0'); // VL_AJ na posição 4
          
          if (codAjuste && valorAjuste !== 0) {
            codigosEncontrados.push({
              origem,
              codigo: codAjuste,
              valor: valorAjuste,
              indiceRegistro: index,
              registro: registro,
              periodo: isMultiplePeriods ? 'múltiplo' : 'único',
              programa: 'progoias'
            });
          }
        });
      }
    });
    
    this.logger.info(`Códigos C197/D197 ProGoiás analisados: ${codigosEncontrados.length} encontrados`);
    return codigosEncontrados;
  }

  /**
   * Detecta CFOPs genéricos que precisam de configuração (ProGoiás)
   */
  analyzeCfopsGenericos(registros) {
    const cfopsEncontrados = [];
    const cfopsUnicos = new Set();
    
    ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
      if (registros[tipoRegistro]) {
        registros[tipoRegistro].forEach((registro, index) => {
          const cfop = registro[2]; // CFOP está na posição 2
          
          if (CFOPS_GENERICOS && CFOPS_GENERICOS.includes(cfop) && !cfopsUnicos.has(cfop)) {
            cfopsUnicos.add(cfop);
            
            const valorOperacao = parseFloatSafe(registro[3] || '0');
            const valorIcms = parseFloatSafe(registro[5] || '0');
            
            cfopsEncontrados.push({
              cfop,
              tipoRegistro,
              indiceRegistro: index,
              valorOperacao,
              valorIcms,
              descricao: this.getCfopDescription(cfop),
              programa: 'progoias'
            });
          }
        });
      }
    });
    
    this.logger.info(`CFOPs genéricos ProGoiás analisados: ${cfopsEncontrados.length} encontrados`);
    return cfopsEncontrados;
  }

  /**
   * Aplica correções de códigos E111 aos registros (ProGoiás)
   */
  applyE111Corrections(registros, corrections) {
    if (!registros['E111'] || Object.keys(corrections).length === 0) {
      return registros;
    }
    
    let corrigidos = 0;
    
    Object.entries(corrections).forEach(([indiceStr, correction]) => {
      const indice = parseInt(indiceStr);
      
      if (registros['E111'][indice]) {
        switch (correction.action) {
          case 'excluir':
            registros['E111'][indice][5] = '0.00'; // Zerar valor
            corrigidos++;
            break;
            
          case 'alterar':
            if (correction.newCode) {
              registros['E111'][indice][3] = correction.newCode; // Alterar código
              corrigidos++;
            }
            break;
            
          case 'manter':
          default:
            // Não faz nada
            break;
        }
      }
    });
    
    this.logger.info(`Correções E111 ProGoiás aplicadas: ${corrigidos} códigos alterados`);
    return registros;
  }

  /**
   * Aplica correções de códigos C197/D197 aos registros (ProGoiás)
   */
  applyC197D197Corrections(registros, corrections) {
    if (Object.keys(corrections).length === 0) {
      return registros;
    }
    
    let corrigidos = 0;
    
    Object.entries(corrections).forEach(([chave, correction]) => {
      const [origem, indiceStr] = chave.split('_');
      const indice = parseInt(indiceStr);
      
      if (registros[origem] && registros[origem][indice]) {
        switch (correction.action) {
          case 'excluir':
            registros[origem][indice][4] = '0.00'; // Zerar valor
            corrigidos++;
            break;
            
          case 'alterar':
            if (correction.newCode) {
              registros[origem][indice][3] = correction.newCode; // Alterar código
              corrigidos++;
            }
            break;
            
          case 'manter':
          default:
            // Não faz nada
            break;
        }
      }
    });
    
    this.logger.info(`Correções C197/D197 ProGoiás aplicadas: ${corrigidos} códigos alterados`);
    return registros;
  }

  /**
   * Aplica configuração de CFOPs genéricos (ProGoiás)
   */
  applyCfopConfiguration(cfopsConfig) {
    if (Object.keys(cfopsConfig).length === 0) {
      return {};
    }
    
    const config = {};
    Object.entries(cfopsConfig).forEach(([cfop, configuracao]) => {
      if (configuracao !== 'padrao') {
        config[cfop] = configuracao;
      }
    });
    
    this.logger.info(`Configuração de CFOPs genéricos ProGoiás aplicada: ${Object.keys(config).length} CFOPs configurados`);
    return config;
  }

  /**
   * Obtém descrição de CFOP genérico
   */
  getCfopDescription(cfop) {
    const descriptions = {
      '5949': 'Outra saída de mercadoria ou prestação de serviço não especificado',
      '6949': 'Outra saída de mercadoria ou prestação de servião não especificado', 
      '1949': 'Outra entrada de mercadoria ou prestação de serviço não especificado',
      '2949': 'Outra entrada de mercadoria ou prestação de serviço não especificado'
    };
    
    return descriptions[cfop] || 'CFOP genérico';
  }

  /**
   * Processamento específico para múltiplos períodos - ProGoiás
   */
  processMultiplePeriods(multiPeriodData, configuracoes = {}) {
    this.logger.info('Iniciando processamento ProGoiás para múltiplos períodos...');
    
    const resultados = [];
    
    for (let i = 0; i < multiPeriodData.length; i++) {
      const periodData = multiPeriodData[i];
      
      // Obter saldo credor do período anterior
      const saldoCredorAnterior = i > 0 && resultados[i - 1] ? 
        (resultados[i - 1].saldoCredorFinal || 0) : 
        (configuracoes.saldoCredorInicial || 0);
      
      // Calcular ano de fruição baseado no período inicial e índice
      const anoFruicao = this.calcularAnoFruicao(configuracoes.anoInicioFruicao, i);
      
      // Configuração para este período
      const configPeriodo = {
        ...configuracoes,
        saldoCredorAnterior: saldoCredorAnterior,
        anoFruicao: anoFruicao
      };
      
      // Classificar operações
      const operacoes = this.classifyOperationsProgoias(
        periodData.registrosCompletos, 
        configuracoes.cfopsGenericosConfig || {}
      );
      
      // Calcular ProGoiás
      const resultado = this.calculateProgoias(operacoes, configPeriodo);
      
      // Adicionar informações do período
      resultado.periodo = periodData.periodo;
      resultado.nomeEmpresa = periodData.nomeEmpresa;
      resultado.fileName = periodData.fileName;
      resultado.anoFruicao = anoFruicao;
      
      resultados.push(resultado);
      
      this.logger.success(`Período ${periodData.periodo} (Ano ${anoFruicao}) processado - Crédito ProGoiás: ${formatCurrency(resultado.creditoProgoias || 0)}`);
    }
    
    this.logger.success(`Processamento concluído: ${resultados.length} períodos calculados`);
    return resultados;
  }

  /**
   * Calcula ano de fruição para múltiplos períodos
   */
  calcularAnoFruicao(anoInicial, indicePeriodo) {
    if (!anoInicial) {
      // Se não especificado, tentar extrair do primeiro período
      return new Date().getFullYear();
    }
    
    // Incrementar ano a cada 12 períodos (assumindo períodos mensais)
    return parseInt(anoInicial) + Math.floor(indicePeriodo / 12);
  }

  /**
   * Calcula ProGoiás para um período específico com configurações
   */
  calculateProgoiasForPeriod(progoiasData, configuracoes = {}) {
    return this.calculateProgoias(progoiasData, configuracoes);
  }

  /**
   * Aplica correções em múltiplos períodos ProGoiás
   */
  applyMultiplePeriodCorrections(multiPeriodData, corrections) {
    if (!corrections || Object.keys(corrections).length === 0) {
      return multiPeriodData;
    }
    
    let totalCorrigidos = 0;
    
    multiPeriodData.forEach((periodData, periodIndex) => {
      const periodKey = `periodo_${periodIndex}`;
      
      if (corrections.e111 && corrections.e111[periodKey]) {
        periodData.registrosCompletos = this.applyE111Corrections(
          periodData.registrosCompletos, 
          corrections.e111[periodKey]
        );
        totalCorrigidos++;
      }
      
      if (corrections.c197d197 && corrections.c197d197[periodKey]) {
        periodData.registrosCompletos = this.applyC197D197Corrections(
          periodData.registrosCompletos, 
          corrections.c197d197[periodKey]
        );
        totalCorrigidos++;
      }
    });
    
    this.logger.info(`Correções ProGoiás aplicadas em ${totalCorrigidos} períodos`);
    return multiPeriodData;
  }

  /**
   * Analisa códigos em múltiplos períodos ProGoiás
   */
  analyzeMultiplePeriodCodes(multiPeriodData, codeType = 'e111') {
    const allCodes = [];
    
    multiPeriodData.forEach((periodData, periodIndex) => {
      let codes = [];
      
      if (codeType === 'e111') {
        codes = this.analyzeE111Codes(periodData.registrosCompletos, true);
      } else if (codeType === 'c197d197') {
        codes = this.analyzeC197D197Codes(periodData.registrosCompletos, true);
      } else if (codeType === 'cfops') {
        codes = this.analyzeCfopsGenericos(periodData.registrosCompletos);
      }
      
      // Adicionar informações do período
      codes.forEach(code => {
        code.periodoIndex = periodIndex;
        code.periodo = periodData.periodo;
        code.nomeEmpresa = periodData.nomeEmpresa;
        code.programa = 'ProGoiás';
      });
      
      allCodes.push(...codes);
    });
    
    this.logger.info(`Códigos ProGoiás ${codeType} analisados: ${allCodes.length} encontrados em ${multiPeriodData.length} períodos`);
    return allCodes;
  }

  /**
   * Gera configuração automática para múltiplos períodos
   */
  generateMultiPeriodConfig(periodoInicial, tipoEmpresa = 'OPTANTE_SIMPLES') {
    const [mes, ano] = periodoInicial.split('/');
    const anoInicial = parseInt(ano);
    
    return {
      tipoEmpresa: tipoEmpresa,
      anoInicioFruicao: anoInicial,
      mesInicioFruicao: parseInt(mes),
      opcaoCalculo: 'AUTOMATICO', // Percentual automático por ano
      saldoCredorInicial: 0
    };
  }

  /**
   * Determina o tipo de ajuste por código
   */
  determinarTipoAjustePorCodigo(codigoAjuste) {
    if (!codigoAjuste || codigoAjuste.length !== 8) {
      return 'DESCONHECIDO';
    }
    
    const quartoDigito = codigoAjuste.charAt(3);
    
    switch (quartoDigito) {
      case '1':
        return 'DÉBITO';
      case '2':
        return 'CRÉDITO';
      case '3':
        return 'ESTORNO DE DÉBITO';
      case '0':
        return 'ESTORNO DE CRÉDITO';
      default:
        return 'OUTROS';
    }
  }
}

export default ProgoiasCalculator;

