import { 
  CFOP_ENTRADAS_INCENTIVADAS, 
  CFOP_SAIDAS_INCENTIVADAS,
  CODIGOS_AJUSTE_INCENTIVADOS,
  CODIGOS_CREDITO_FOMENTAR,
  CFOPS_GENERICOS 
} from '../../core/constants.js';
import { formatCurrency, parseFloatSafe } from '../../core/utils.js';

export class FomentarCalculator {
  constructor(logger) {
    this.logger = logger;
  }

  classifyOperations(registros, cfopsGenericosConfig = {}) {
    const operations = {
      entradasIncentivadas: [],
      entradasNaoIncentivadas: [],
      saidasIncentivadas: [],
      saidasNaoIncentivadas: [],
      creditosEntradas: 0,
      debitosOperacoes: 0,
      outrosCreditos: 0,
      outrosDebitos: 0,
      memoriaCalculo: {
        operacoesDetalhadas: [],
        ajustesE111: [],
        ajustesC197: [],
        ajustesD197: [],
        totalCreditos: { porEntradas: 0, porAjustesE111: 0, total: 0 },
        totalDebitos: { porOperacoes: 0, porAjustesE111: 0, porAjustesC197: 0, porAjustesD197: 0, total: 0 },
        exclusoes: []
      }
    };

    this.logger.info('Iniciando classificação de operações FOMENTAR...');

    // Processar registros consolidados
    this.processarRegistrosConsolidados(registros, operations, cfopsGenericosConfig);
    
    // Processar ajustes E111
    this.processarAjustesE111(registros, operations);
    
    // Processar outras obrigações C197/D197
    this.processarOutrasObrigacoes(registros, operations);
    
    // Finalizar totais
    operations.memoriaCalculo.totalCreditos.total = operations.creditosEntradas + operations.outrosCreditos;
    operations.memoriaCalculo.totalDebitos.total = operations.debitosOperacoes + operations.outrosDebitos;

    this.logResumoClassificacao(operations);
    
    return operations;
  }

  processarRegistrosConsolidados(registros, operations, cfopsGenericosConfig) {
    const tiposRegistros = ['C190', 'C590', 'D190', 'D590'];
    
    tiposRegistros.forEach(tipoRegistro => {
      if (!registros[tipoRegistro]) return;
      
      const layout = this.obterLayoutRegistro(tipoRegistro);
      if (!layout) return;
      
      this.logger.info(`Processando ${registros[tipoRegistro].length} registros ${tipoRegistro}`);
      
      registros[tipoRegistro].forEach((registro, index) => {
        const campos = registro.slice(1, -1);
        
        const cfop = campos[layout.indexOf('CFOP')] || '';
        const valorOperacao = parseFloatSafe(campos[layout.indexOf('VL_OPR')]);
        const valorIcms = parseFloatSafe(campos[layout.indexOf('VL_ICMS')]);
        
        if (!cfop || valorOperacao === 0) return;
        
        const tipoOperacao = this.determinarTipoOperacao(cfop);
        const isIncentivada = this.determinarSeIncentivada(cfop, tipoOperacao, cfopsGenericosConfig);
        
        const operacao = {
          tipo: tipoRegistro,
          cfop,
          valorOperacao,
          valorIcms,
          tipoOperacao,
          incentivada: isIncentivada
        };
        
        this.classificarOperacao(operacao, operations);
      });
    });
  }

  determinarTipoOperacao(cfop) {
    if (cfop.startsWith('1') || cfop.startsWith('2') || cfop.startsWith('3')) {
      return 'ENTRADA';
    }
    return 'SAIDA';
  }

  determinarSeIncentivada(cfop, tipoOperacao, cfopsGenericosConfig) {
    // Verificar se é CFOP genérico configurado
    if (CFOPS_GENERICOS.includes(cfop) && cfopsGenericosConfig[cfop]) {
      const config = cfopsGenericosConfig[cfop];
      if (config === 'incentivado') return true;
      if (config === 'nao-incentivado') return false;
      // Se 'padrao', continua para lógica normativa
    }
    
    // Lógica normativa padrão
    if (tipoOperacao === 'ENTRADA') {
      return CFOP_ENTRADAS_INCENTIVADAS.includes(cfop);
    } else {
      return CFOP_SAIDAS_INCENTIVADAS.includes(cfop);
    }
  }

  classificarOperacao(operacao, operations) {
    // Adicionar à memória de cálculo
    operations.memoriaCalculo.operacoesDetalhadas.push({
      origem: operacao.tipo,
      cfop: operacao.cfop,
      tipoOperacao: operacao.tipoOperacao,
      incentivada: operacao.incentivada,
      valorOperacao: operacao.valorOperacao,
      valorIcms: operacao.valorIcms,
      categoria: `${operacao.tipoOperacao} ${operacao.incentivada ? 'INCENTIVADA' : 'NÃO INCENTIVADA'}`
    });

    // Classificar por tipo
    if (operacao.tipoOperacao === 'ENTRADA') {
      if (operacao.incentivada) {
        operations.entradasIncentivadas.push(operacao);
      } else {
        operations.entradasNaoIncentivadas.push(operacao);
      }
      operations.creditosEntradas += operacao.valorIcms;
      operations.memoriaCalculo.totalCreditos.porEntradas += operacao.valorIcms;
    } else {
      if (operacao.incentivada) {
        operations.saidasIncentivadas.push(operacao);
      } else {
        operations.saidasNaoIncentivadas.push(operacao);
      }
      operations.debitosOperacoes += operacao.valorIcms;
      operations.memoriaCalculo.totalDebitos.porOperacoes += operacao.valorIcms;
    }
  }

  processarAjustesE111(registros, operations) {
    if (!registros.E111 || registros.E111.length === 0) return;
    
    this.logger.info(`Processando ${registros.E111.length} registros E111`);
    
    const layout = this.obterLayoutRegistro('E111');
    
    registros.E111.forEach(registro => {
      const campos = registro.slice(1, -1);
      const codAjuste = campos[layout.indexOf('COD_AJ_APUR')] || '';
      const valorAjuste = parseFloatSafe(campos[layout.indexOf('VL_AJ_APUR')]);
      const descricao = campos[layout.indexOf('DESCR_COMPL_AJ')] || '';
      
      if (!codAjuste || valorAjuste === 0) return;
      
      // Verificar exclusões
      if (this.deveExcluirCodigo(codAjuste, valorAjuste, operations)) return;
      
      const tipoAjuste = this.determinarTipoAjustePorCodigo(codAjuste);
      const isIncentivado = CODIGOS_AJUSTE_INCENTIVADOS.some(cod => codAjuste.includes(cod));
      const valorAbsoluto = Math.abs(valorAjuste);
      
      const ajusteDetalhado = {
        origem: 'E111',
        codigo: codAjuste,
        descricao,
        valor: valorAbsoluto,
        tipo: tipoAjuste,
        incentivado: isIncentivado
      };
      
      operations.memoriaCalculo.ajustesE111.push(ajusteDetalhado);
      
      if (tipoAjuste === 'CRÉDITO') {
        operations.outrosCreditos += valorAbsoluto;
        operations.memoriaCalculo.totalCreditos.porAjustesE111 += valorAbsoluto;
      } else if (tipoAjuste === 'DÉBITO') {
        operations.outrosDebitos += valorAbsoluto;
        operations.memoriaCalculo.totalDebitos.porAjustesE111 += valorAbsoluto;
      }
    });
  }

  deveExcluirCodigo(codAjuste, valorAjuste, operations) {
    // Excluir créditos do próprio FOMENTAR/PRODUZIR/MICROPRODUZIR
    const isCreditoFomentar = CODIGOS_CREDITO_FOMENTAR.some(cod => codAjuste.includes(cod));
    
    if (isCreditoFomentar) {
      operations.memoriaCalculo.exclusoes.push({
        origem: 'E111',
        codigo: codAjuste,
        valor: Math.abs(valorAjuste),
        motivo: 'Crédito FOMENTAR/PRODUZIR/MICROPRODUZIR - excluído da base de cálculo',
        tipo: 'CREDITO_PROGRAMA_INCENTIVO'
      });
      
      this.logger.warn(`E111 EXCLUÍDO (crédito programa): ${codAjuste} = ${formatCurrency(Math.abs(valorAjuste))}`);
      return true;
    }
    
    // Excluir crédito ProGoiás
    if (codAjuste.includes('GO020158')) {
      operations.memoriaCalculo.exclusoes.push({
        origem: 'E111',
        codigo: codAjuste,
        valor: Math.abs(valorAjuste),
        motivo: 'Crédito ProGoiás - excluído da base de cálculo',
        tipo: 'CREDITO_PROGOIAS'
      });
      
      this.logger.warn(`E111 EXCLUÍDO (crédito ProGoiás): ${codAjuste} = ${formatCurrency(Math.abs(valorAjuste))}`);
      return true;
    }
    
    return false;
  }

  determinarTipoAjustePorCodigo(codigoAjuste) {
    if (!codigoAjuste || codigoAjuste.length !== 8) {
      return 'INDEFINIDO';
    }

    const quartoDigito = codigoAjuste.charAt(3);
    
    switch (quartoDigito) {
      case '0': return 'DÉBITO';        // Outros débitos
      case '1': return 'DÉBITO';        // Estorno de créditos
      case '2': return 'CRÉDITO';       // Outros créditos
      case '3': return 'CRÉDITO';       // Estorno de débitos
      case '4': return 'DEDUÇÃO';       // Deduções do imposto
      case '5': return 'DÉBITO';        // Débitos especiais
      case '9': return 'CONTROLE';      // Controle extra-apuração
      default: return 'INDEFINIDO';
    }
  }

  processarOutrasObrigacoes(registros, operations) {
    // Processar C197
    this.processarRegistrosC197D197(registros.C197, 'C197', operations);
    
    // Processar D197
    this.processarRegistrosC197D197(registros.D197, 'D197', operations);
  }

  processarRegistrosC197D197(registrosTipo, origem, operations) {
    if (!registrosTipo || registrosTipo.length === 0) return;
    
    this.logger.info(`Processando ${registrosTipo.length} registros ${origem}`);
    
    registrosTipo.forEach(registro => {
      const campos = registro.slice(1, -1);
      const codAjuste = campos[1] || ''; // COD_AJ
      const valorIcms = parseFloatSafe(campos[6]); // VL_ICMS
      
      if (!codAjuste || valorIcms === 0) return;
      
      const ehDebitoEspecial = this.isDebitoEspecial(codAjuste);
      const ehIncentivado = CODIGOS_AJUSTE_INCENTIVADOS.some(cod => codAjuste.includes(cod));
      
      const ajusteDetalhado = {
        origem,
        codigo: codAjuste,
        valor: Math.abs(valorIcms),
        tipo: 'DEBITO_ADICIONAL',
        incentivado: ehIncentivado,
        incluido: !ehDebitoEspecial
      };
      
      if (origem === 'C197') {
        operations.memoriaCalculo.ajustesC197.push(ajusteDetalhado);
      } else {
        operations.memoriaCalculo.ajustesD197.push(ajusteDetalhado);
      }
      
      if (ehDebitoEspecial) {
        // Excluir débitos especiais GO7*
        operations.memoriaCalculo.exclusoes.push({
          origem,
          codigo: codAjuste,
          valor: Math.abs(valorIcms),
          motivo: 'Débito especial GO7* - duplicidade evitada',
          tipo: 'DEBITO_ESPECIAL_GO7_EXCLUIDO'
        });
        
        this.logger.warn(`${origem} EXCLUÍDO (débito especial): ${codAjuste} = ${formatCurrency(Math.abs(valorIcms))}`);
      } else {
        // Incluir no cálculo
        operations.outrosDebitos += Math.abs(valorIcms);
        
        if (origem === 'C197') {
          operations.memoriaCalculo.totalDebitos.porAjustesC197 += Math.abs(valorIcms);
        } else {
          operations.memoriaCalculo.totalDebitos.porAjustesD197 += Math.abs(valorIcms);
        }
      }
    });
  }

  isDebitoEspecial(codigo) {
    return codigo.startsWith('GO7');
  }

  calculateFomentar(operacoes, configuracoes) {
    this.logger.info('Iniciando cálculo FOMENTAR...');
    
    const config = {
      percentualFinanciamento: configuracoes.percentualFinanciamento || 0.70,
      icmsPorMedia: configuracoes.icmsPorMedia || 0,
      saldoCredorAnterior: configuracoes.saldoCredorAnterior || 0,
      programType: configuracoes.programType || 'FOMENTAR'
    };
    
    // Quadro A - Proporção dos Créditos Apropriados
    const quadroA = this.calcularQuadroA(operacoes, config);
    
    // Quadro B - Operações Incentivadas
    const quadroB = this.calcularQuadroB(operacoes, config, quadroA);
    
    // Quadro C - Operações Não Incentivadas
    const quadroC = this.calcularQuadroC(operacoes, config, quadroB);
    
    // Resumo Final
    const resumoFinal = this.calcularResumoFinal(quadroB, quadroC);
    
    const resultado = {
      configuracao: config,
      quadroA,
      quadroB,
      quadroC,
      resumoFinal,
      memoriaCalculo: operacoes.memoriaCalculo
    };
    
    this.logger.success(`Cálculo FOMENTAR concluído - Financiamento: ${formatCurrency(resumoFinal.valorFinanciamento)}`);
    
    return resultado;
  }

  calcularQuadroA(operacoes, config) {
    const totalSaidas = operacoes.saidasIncentivadas.reduce((sum, op) => sum + op.valorOperacao, 0) +
                       operacoes.saidasNaoIncentivadas.reduce((sum, op) => sum + op.valorOperacao, 0);
    
    const saidasIncentivadas = operacoes.saidasIncentivadas.reduce((sum, op) => sum + op.valorOperacao, 0);
    
    const percentualSaidasIncentivadas = totalSaidas > 0 ? (saidasIncentivadas / totalSaidas) * 100 : 0;
    
    const totalCreditos = operacoes.creditosEntradas + operacoes.outrosCreditos + config.saldoCredorAnterior;
    
    const creditoIncentivadas = totalCreditos * (percentualSaidasIncentivadas / 100);
    const creditoNaoIncentivadas = totalCreditos - creditoIncentivadas;
    
    return {
      saidasIncentivadas,
      totalSaidas,
      percentualSaidasIncentivadas,
      creditosEntradas: operacoes.creditosEntradas,
      outrosCreditos: operacoes.outrosCreditos,
      saldoCredorAnterior: config.saldoCredorAnterior,
      totalCreditos,
      creditoIncentivadas,
      creditoNaoIncentivadas
    };
  }

  calcularQuadroB(operacoes, config, quadroA) {
    const debitoIncentivadas = operacoes.saidasIncentivadas.reduce((sum, op) => sum + op.valorIcms, 0);
    
    // Calcular outros débitos incentivados (simplificado)
    const outrosDebitosIncentivadas = operacoes.memoriaCalculo.ajustesE111
      .filter(ajuste => ajuste.tipo === 'DÉBITO' && ajuste.incentivado)
      .reduce((sum, ajuste) => sum + ajuste.valor, 0);
    
    const saldoDevedorIncentivadas = debitoIncentivadas + outrosDebitosIncentivadas - quadroA.creditoIncentivadas;
    
    const icmsBaseFomentar = Math.max(0, saldoDevedorIncentivadas - config.icmsPorMedia);
    const icmsFinanciado = icmsBaseFomentar * config.percentualFinanciamento;
    const parcelaNaoFinanciada = icmsBaseFomentar - icmsFinanciado;
    
    const saldoPagarParcelaNaoFinanciada = Math.max(0, parcelaNaoFinanciada);
    
    return {
      debitoIncentivadas,
      outrosDebitosIncentivadas,
      creditoOperacoesIncentivadas: quadroA.creditoIncentivadas,
      saldoDevedorIncentivadas,
      icmsPorMedia: config.icmsPorMedia,
      icmsBaseFomentar,
      percentualFinanciamento: config.percentualFinanciamento * 100,
      icmsFinanciado,
      parcelaNaoFinanciada,
      saldoPagarParcelaNaoFinanciada
    };
  }

  calcularQuadroC(operacoes, config, quadroB) {
    const debitoNaoIncentivadas = operacoes.saidasNaoIncentivadas.reduce((sum, op) => sum + op.valorIcms, 0);
    
    const outrosDebitosNaoIncentivadas = operacoes.memoriaCalculo.ajustesE111
      .filter(ajuste => ajuste.tipo === 'DÉBITO' && !ajuste.incentivado)
      .reduce((sum, ajuste) => sum + ajuste.valor, 0);
    
    const saldoDevedorNaoIncentivadas = debitoNaoIncentivadas + outrosDebitosNaoIncentivadas;
    const saldoPagarNaoIncentivadas = Math.max(0, saldoDevedorNaoIncentivadas);
    
    return {
      debitoNaoIncentivadas,
      outrosDebitosNaoIncentivadas,
      saldoDevedorNaoIncentivadas,
      saldoPagarNaoIncentivadas
    };
  }

  calcularResumoFinal(quadroB, quadroC) {
    const totalGeralPagar = quadroB.saldoPagarParcelaNaoFinanciada + quadroC.saldoPagarNaoIncentivadas;
    const valorFinanciamento = quadroB.icmsFinanciado;
    
    return {
      totalIncentivadas: quadroB.saldoPagarParcelaNaoFinanciada,
      totalNaoIncentivadas: quadroC.saldoPagarNaoIncentivadas,
      totalGeralPagar,
      valorFinanciamento,
      economia: valorFinanciamento,
      percentualEconomia: (quadroB.saldoDevedorIncentivadas + quadroC.saldoDevedorNaoIncentivadas) > 0 
        ? (valorFinanciamento / (quadroB.saldoDevedorIncentivadas + quadroC.saldoDevedorNaoIncentivadas)) * 100 
        : 0
    };
  }

  logResumoClassificacao(operations) {
    this.logger.success(`Operações classificadas:`);
    this.logger.info(`- Entradas incentivadas: ${operations.entradasIncentivadas.length}`);
    this.logger.info(`- Entradas não incentivadas: ${operations.entradasNaoIncentivadas.length}`);
    this.logger.info(`- Saídas incentivadas: ${operations.saidasIncentivadas.length}`);
    this.logger.info(`- Saídas não incentivadas: ${operations.saidasNaoIncentivadas.length}`);
    this.logger.info(`- Créditos de entradas: ${formatCurrency(operations.creditosEntradas)}`);
    this.logger.info(`- Outros créditos: ${formatCurrency(operations.outrosCreditos)}`);
    this.logger.info(`- Débitos de operações: ${formatCurrency(operations.debitosOperacoes)}`);
    this.logger.info(`- Outros débitos: ${formatCurrency(operations.outrosDebitos)}`);
    this.logger.info(`- Exclusões aplicadas: ${operations.memoriaCalculo.exclusoes.length}`);
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
   * Analisa códigos E111 para possível correção
   */
  analyzeE111Codes(registros, isMultiplePeriods = false) {
    const codigosEncontrados = [];
    
    if (registros['E111']) {
      registros['E111'].forEach((registro, index) => {
        const codAjuste = registro[3]; // COD_AJ_APUR na posição 3  
        const valorAjuste = parseFloatSafe(registro[5] || '0'); // VL_AJ_APUR na posição 5
        
        if (codAjuste && valorAjuste !== 0) {
          const tipoAjuste = this.determinarTipoAjustePorCodigo(codAjuste);
          const isIncentivado = CODIGOS_AJUSTE_INCENTIVADOS.includes(codAjuste);
          
          codigosEncontrados.push({
            codigo: codAjuste,
            valor: valorAjuste,
            tipo: tipoAjuste,
            isIncentivado,
            indiceRegistro: index,
            registro: registro,
            descricao: `Código de ajuste ${codAjuste}`,
            periodo: isMultiplePeriods ? 'múltiplo' : 'único'
          });
        }
      });
    }
    
    this.logger.info(`Códigos E111 analisados: ${codigosEncontrados.length} encontrados`);
    return codigosEncontrados;
  }

  /**
   * Analisa códigos C197/D197 para possível correção
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
              periodo: isMultiplePeriods ? 'múltiplo' : 'único'
            });
          }
        });
      }
    });
    
    this.logger.info(`Códigos C197/D197 analisados: ${codigosEncontrados.length} encontrados`);
    return codigosEncontrados;
  }

  /**
   * Detecta CFOPs genéricos que precisam de configuração
   */
  analyzeCfopsGenericos(registros) {
    const cfopsEncontrados = [];
    const cfopsUnicos = new Set();
    
    ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
      if (registros[tipoRegistro]) {
        registros[tipoRegistro].forEach((registro, index) => {
          const cfop = registro[2]; // CFOP está na posição 2
          
          if (CFOPS_GENERICOS.includes(cfop) && !cfopsUnicos.has(cfop)) {
            cfopsUnicos.add(cfop);
            
            const valorOperacao = parseFloatSafe(registro[3] || '0');
            const valorIcms = parseFloatSafe(registro[5] || '0');
            
            cfopsEncontrados.push({
              cfop,
              tipoRegistro,
              indiceRegistro: index,
              valorOperacao,
              valorIcms,
              descricao: this.getCfopDescription(cfop)
            });
          }
        });
      }
    });
    
    this.logger.info(`CFOPs genéricos analisados: ${cfopsEncontrados.length} encontrados`);
    return cfopsEncontrados;
  }

  /**
   * Aplica correções de códigos E111 aos registros
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
    
    this.logger.info(`Correções E111 aplicadas: ${corrigidos} códigos alterados`);
    return registros;
  }

  /**
   * Aplica correções de códigos C197/D197 aos registros
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
    
    this.logger.info(`Correções C197/D197 aplicadas: ${corrigidos} códigos alterados`);
    return registros;
  }

  /**
   * Aplica configuração de CFOPs genéricos
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
    
    this.logger.info(`Configuração de CFOPs genéricos aplicada: ${Object.keys(config).length} CFOPs configurados`);
    return config;
  }

  /**
   * Obtém descrição de CFOP genérico
   */
  getCfopDescription(cfop) {
    const descriptions = {
      '5949': 'Outra saída de mercadoria ou prestação de serviço não especificado',
      '6949': 'Outra saída de mercadoria ou prestação de serviço não especificado', 
      '1949': 'Outra entrada de mercadoria ou prestação de serviço não especificado',
      '2949': 'Outra entrada de mercadoria ou prestação de serviço não especificado'
    };
    
    return descriptions[cfop] || 'CFOP genérico';
  }

  /**
   * Processamento específico para múltiplos períodos - FOMENTAR
   */
  processMultiplePeriods(multiPeriodData, configuracoes = {}) {
    this.logger.info('Iniciando processamento FOMENTAR para múltiplos períodos...');
    
    const resultados = [];
    
    for (let i = 0; i < multiPeriodData.length; i++) {
      const periodData = multiPeriodData[i];
      
      // Obter saldo credor do período anterior
      const saldoCredorAnterior = i > 0 && resultados[i - 1] ? 
        (resultados[i - 1].resumoFinal?.saldoCredorFinal || 0) : 
        (configuracoes.saldoCredorInicial || 0);
      
      // Configuração para este período
      const configPeriodo = {
        ...configuracoes,
        saldoCredorAnterior: saldoCredorAnterior
      };
      
      // Classificar operações
      const operacoes = this.classifyOperations(
        periodData.registrosCompletos, 
        configuracoes.cfopsGenericosConfig || {}
      );
      
      // Calcular FOMENTAR
      const resultado = this.calculateFomentar(operacoes, configPeriodo);
      
      // Adicionar informações do período
      resultado.periodo = periodData.periodo;
      resultado.nomeEmpresa = periodData.nomeEmpresa;
      resultado.fileName = periodData.fileName;
      
      resultados.push(resultado);
      
      this.logger.success(`Período ${periodData.periodo} processado - Financiamento: ${formatCurrency(resultado.resumoFinal.valorFinanciamento)}`);
    }
    
    this.logger.success(`Processamento concluído: ${resultados.length} períodos calculados`);
    return resultados;
  }

  /**
   * Calcula FOMENTAR para um período específico com saldo credor anterior
   */
  calculateFomentarForPeriod(fomentarData, saldoCredorAnterior, configOverrides = {}) {
    const configuracoes = {
      percentualFinanciamento: 0.70,
      icmsPorMedia: 0,
      saldoCredorAnterior: saldoCredorAnterior,
      programType: 'FOMENTAR',
      ...configOverrides
    };
    
    return this.calculateFomentar(fomentarData, configuracoes);
  }

  /**
   * Aplica correções em múltiplos períodos
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
    
    this.logger.info(`Correções aplicadas em ${totalCorrigidos} períodos`);
    return multiPeriodData;
  }

  /**
   * Analisa códigos em múltiplos períodos
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
      });
      
      allCodes.push(...codes);
    });
    
    this.logger.info(`Códigos ${codeType} analisados: ${allCodes.length} encontrados em ${multiPeriodData.length} períodos`);
    return allCodes;
  }

  /**
   * Atualiza valores do Quadro A - Proporção dos Créditos
   */
  updateQuadroA(resultado) {
    if (!resultado) return;
    
    // Item 1: Saídas de Operações Incentivadas
    this.updateTableValue('itemA1', resultado.saidasIncentivadas || 0);
    
    // Item 2: Total das Saídas
    this.updateTableValue('itemA2', resultado.totalSaidas || 0);
    
    // Item 3: Percentual das Saídas de Operações Incentivadas (%)
    const percentual = resultado.totalSaidas > 0 ? 
      ((resultado.saidasIncentivadas / resultado.totalSaidas) * 100) : 0;
    this.updateTableValue('itemA3', percentual, true);
    
    // Item 4: Créditos por Entradas
    this.updateTableValue('itemA4', resultado.creditosEntradas || 0);
    
    // Item 5: Outros Créditos
    this.updateTableValue('itemA5', resultado.outrosCreditos || 0);
    
    // Item 6: Estorno de Débitos
    this.updateTableValue('itemA6', resultado.estornoDebitos || 0);
    
    // Item 7: Saldo Credor do Período Anterior
    this.updateTableValue('itemA7', resultado.saldoCredorAnterior || 0);
    
    // Item 8: Total dos Créditos do Período
    this.updateTableValue('itemA8', resultado.totalCreditosPeriodo || 0);
    
    // Item 9: Crédito para Operações Incentivadas
    this.updateTableValue('itemA9', resultado.creditoIncentivadas || 0);
    
    // Item 10: Crédito para Operações Não Incentivadas
    this.updateTableValue('itemA10', resultado.creditoNaoIncentivadas || 0);
  }

  /**
   * Atualiza valores do Quadro B - Operações Incentivadas
   */
  updateQuadroB(resultado) {
    if (!resultado) return;
    
    // B11-B16: Débitos
    this.updateTableValue('itemB11', resultado.debitoIncentivadas || 0);
    this.updateTableValue('itemB12', resultado.estornoCreditos || 0);
    this.updateTableValue('itemB13', resultado.outrosDebitosIncentivadas || 0);
    this.updateTableValue('itemB14', resultado.c197IncentivadaDebitos || 0);
    this.updateTableValue('itemB15', resultado.d197IncentivadaDebitos || 0);
    this.updateTableValue('itemB16', resultado.totalDebitosIncentivadas || 0);
    
    // B17-B21: Créditos
    this.updateTableValue('itemB17', resultado.creditoIncentivadas || 0);
    this.updateTableValue('itemB18', resultado.estornoDebitosIncentivadas || 0);
    this.updateTableValue('itemB19', resultado.outrosCreditosIncentivadas || 0);
    this.updateTableValue('itemB20', resultado.creditosST || 0);
    this.updateTableValue('itemB21', resultado.totalCreditosIncentivadas || 0);
    
    // B22-B31: Apuração
    this.updateTableValue('itemB22', resultado.saldoDevedor || 0);
    this.updateTableValue('itemB23', resultado.deducoes || 0);
    this.updateTableValue('itemB24', resultado.icmsIncentivadas || 0);
    this.updateTableValue('itemB25', resultado.saldoCredorIncentivadas || 0);
    this.updateTableValue('itemB26', resultado.icmsRecolherIncentivadas || 0);
    this.updateTableValue('itemB27', resultado.saldoCredorTransportarIncentivadas || 0);
    this.updateTableValue('itemB28', resultado.icmsFinalIncentivadas || 0);
    this.updateTableValue('itemB29', resultado.valorFinanciamento || 0);
    this.updateTableValue('itemB30', resultado.valorPagarIncentivadas || 0);
    this.updateTableValue('itemB31', resultado.economia || 0);
  }

  /**
   * Atualiza valores do Quadro C - Operações Não Incentivadas
   */
  updateQuadroC(resultado) {
    if (!resultado) return;
    
    // C32-C36: Débitos
    this.updateTableValue('itemC32', resultado.debitoNaoIncentivadas || 0);
    this.updateTableValue('itemC33', resultado.estornoCreditosNaoIncentivadas || 0);
    this.updateTableValue('itemC34', resultado.outrosDebitosNaoIncentivadas || 0);
    this.updateTableValue('itemC35', resultado.c197NaoIncentivadaDebitos || 0);
    this.updateTableValue('itemC36', resultado.totalDebitosNaoIncentivadas || 0);
    
    // C37-C40: Créditos
    this.updateTableValue('itemC37', resultado.creditoNaoIncentivadas || 0);
    this.updateTableValue('itemC38', resultado.estornoDebitosNaoIncentivadas || 0);
    this.updateTableValue('itemC39', resultado.outrosCreditosNaoIncentivadas || 0);
    this.updateTableValue('itemC40', resultado.totalCreditosNaoIncentivadas || 0);
    
    // C41-C44: Apuração
    this.updateTableValue('itemC41', resultado.saldoDevedorNaoIncentivadas || 0);
    this.updateTableValue('itemC42', resultado.icmsRecolherNaoIncentivadas || 0);
    this.updateTableValue('itemC43', resultado.saldoCredorNaoIncentivadas || 0);
    this.updateTableValue('itemC44', resultado.saldoCredorTransportarNaoIncentivadas || 0);
  }

  /**
   * Atualiza valor em célula da tabela
   */
  updateTableValue(elementId, value, isPercentage = false) {
    const element = document.getElementById(elementId);
    if (element) {
      if (isPercentage) {
        element.textContent = `${value.toFixed(2)}%`;
      } else {
        element.textContent = formatCurrency(value);
      }
      
      // Adicionar classe para valores negativos
      if (value < 0) {
        element.classList.add('negative-value');
      } else {
        element.classList.remove('negative-value');
      }
      
      // Adicionar animação de atualização
      element.classList.add('value-updated');
      setTimeout(() => {
        element.classList.remove('value-updated');
      }, 500);
    }
  }

  /**
   * Atualiza resumo geral
   */
  updateResumo(resultado) {
    // Atualizar elementos do resumo se existirem
    this.updateTableValue('resumoTotalGeral', resultado.totalGeralPagar || 0);
    this.updateTableValue('resumoFinanciamento', resultado.valorFinanciamento || 0);
    this.updateTableValue('resumoEconomia', resultado.economia || 0);
    this.updateTableValue('resumoPercentualFinanciamento', 
      resultado.percentualFinanciamento ? resultado.percentualFinanciamento * 100 : 0, 
      true
    );
  }

  /**
   * Renderiza todas as tabelas com os resultados
   */
  renderAllTables(resultado) {
    this.updateQuadroA(resultado);
    this.updateQuadroB(resultado);
    this.updateQuadroC(resultado);
    this.updateResumo(resultado);
    
    this.logger.success('Tabelas FOMENTAR atualizadas com sucesso');
  }
}

export default FomentarCalculator;

