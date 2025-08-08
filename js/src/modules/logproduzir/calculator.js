import { 
  CFOP_LOGPRODUZIR_FRETES_INTERESTADUAIS,
  CFOP_LOGPRODUZIR_FRETE_TOTAL,
  LOGPRODUZIR_PERCENTUAIS,
  LOGPRODUZIR_CONTRIBUICOES
} from '../../core/constants.js';
import { formatCurrency, parseFloatSafe } from '../../core/utils.js';

export class LogproduzirCalculator {
  constructor(logger) {
    this.logger = logger;
  }

  calculateLogproduzir(registros, configuracoes) {
    this.logger.info('Iniciando cálculo LogPRODUZIR...');
    
    try {
      // 1. Identificar e somar fretes por tipo
      this.logger.info('Etapa 1: Processando fretes...');
      const fretesData = this.processarFretesLogproduzir(registros);
      this.logger.success(`Fretes processados: FI=R$${fretesData.fretesInterestaduais.toFixed(2)}, FT=R$${fretesData.freteTotal.toFixed(2)}`);

      // 2. Obter configurações
      this.logger.info('Etapa 2: Obtendo configurações...');
      const config = this.obterConfiguracoesLogproduzir(configuracoes);
      this.logger.info(`Config: categoria=${config.categoria}, mediaBase=R$${config.mediaBase.toFixed(2)}, IGP-DI=${config.igpDi}`);

      // 3. Calcular ICMS sobre fretes interestaduais
      const icmsFi = fretesData.fretesInterestaduais * 0.12; // 12% fixo
      this.logger.info(`Etapa 3: ICMS FI = R$${fretesData.fretesInterestaduais.toFixed(2)} x 12% = R$${icmsFi.toFixed(2)}`);

      // 4. Calcular créditos de ICMS
      const creditos = this.calcularCreditosLogproduzir(registros);
      this.logger.info(`Etapa 4: Créditos = R$${creditos.toFixed(2)}`);

      // 5. Saldo Devedor = ICMS - Créditos
      const saldoDevedor = Math.max(0, icmsFi - creditos);
      this.logger.info(`Etapa 5: Saldo Devedor = R$${icmsFi.toFixed(2)} - R$${creditos.toFixed(2)} = R$${saldoDevedor.toFixed(2)}`);

      // 6. Média corrigida por IGP-DI
      const mediaCorrigida = config.mediaBase * config.igpDi;
      this.logger.info(`Etapa 6: Média Corrigida = R$${config.mediaBase.toFixed(2)} x ${config.igpDi} = R$${mediaCorrigida.toFixed(2)}`);

      // 7. Excesso sobre média (base do incentivo)
      const excesso = Math.max(0, saldoDevedor - mediaCorrigida);
      this.logger.info(`Etapa 7: Excesso = R$${saldoDevedor.toFixed(2)} - R$${mediaCorrigida.toFixed(2)} = R$${excesso.toFixed(2)}`);

      // 8. Crédito bruto conforme categoria
      const percentualCategoria = LOGPRODUZIR_PERCENTUAIS[config.categoria];
      const creditoBruto = excesso * percentualCategoria;
      this.logger.info(`Etapa 8: Crédito Bruto = R$${excesso.toFixed(2)} x ${(percentualCategoria*100).toFixed(0)}% = R$${creditoBruto.toFixed(2)}`);

      // 9. Contribuições obrigatórias (20%)
      const contribuicoes = creditoBruto * LOGPRODUZIR_CONTRIBUICOES.TOTAL;
      this.logger.info(`Etapa 9: Contribuições = R$${creditoBruto.toFixed(2)} x 20% = R$${contribuicoes.toFixed(2)}`);

      // 10. Crédito líquido
      const creditoLiquido = creditoBruto - contribuicoes;
      this.logger.info(`Etapa 10: Crédito Líquido = R$${creditoBruto.toFixed(2)} - R$${contribuicoes.toFixed(2)} = R$${creditoLiquido.toFixed(2)}`);

      // 11. ICMS final a pagar
      const icmsFinal = Math.max(0, saldoDevedor - creditoLiquido);
      this.logger.info(`Etapa 11: ICMS Final = R$${saldoDevedor.toFixed(2)} - R$${creditoLiquido.toFixed(2)} = R$${icmsFinal.toFixed(2)}`);

      // 12. Economia com incentivo
      const economia = saldoDevedor - icmsFinal;
      const percentualEconomia = saldoDevedor > 0 ? (economia / saldoDevedor) * 100 : 0;
      this.logger.success(`Etapa 12: Economia = R$${economia.toFixed(2)} (${percentualEconomia.toFixed(2)}%)`);

      // Calcular detalhamento das contribuições obrigatórias
      const detalhesContribuicoes = {
        bolsaUniversitaria: creditoBruto * LOGPRODUZIR_CONTRIBUICOES.BOLSA_UNIVERSITARIA,
        funproduzir: creditoBruto * LOGPRODUZIR_CONTRIBUICOES.FUNPRODUZIR,
        protegeGoias: creditoBruto * LOGPRODUZIR_CONTRIBUICOES.PROTEGE_GOIAS
      };

      const resultado = {
        // Fretes e proporcionalidade
        fretesInterestaduais: fretesData.fretesInterestaduais,
        freteTotal: fretesData.freteTotal,
        proporcionalidade: fretesData.freteTotal > 0 ? (fretesData.fretesInterestaduais / fretesData.freteTotal) * 100 : 0,
        
        // ICMS e cálculos
        icmsFi: icmsFi,
        creditos: creditos,
        saldoDevedor: saldoDevedor,
        
        // Média e incentivo
        mediaBase: config.mediaBase,
        igpDi: config.igpDi,
        mediaCorrigida: mediaCorrigida,
        excesso: excesso,
        
        // Crédito outorgado
        categoria: config.categoria,
        percentualCategoria: percentualCategoria * 100,
        creditoBruto: creditoBruto,
        contribuicoes: contribuicoes,
        creditoLiquido: creditoLiquido,
        detalhesContribuicoes: detalhesContribuicoes,
        
        // Resultado final
        icmsFinal: icmsFinal,
        economia: economia,
        percentualEconomia: percentualEconomia,
        
        // Dados adicionais
        saldoCredorAnterior: config.saldoCredorAnterior,
        detalheFretes: fretesData.detalhes
      };

      this.logger.success(`LogPRODUZIR calculado: Economia de R$ ${economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentualEconomia.toFixed(2)}%)`);
      
      return resultado;
      
    } catch (error) {
      this.logger.error(`Erro no cálculo LogPRODUZIR: ${error.message}`);
      throw error;
    }
  }

  processarFretesLogproduzir(registros) {
    this.logger.info('Iniciando processamento de fretes...');
    
    if (!registros) {
      this.logger.error('ERRO: registros é null/undefined');
      throw new Error('Registros não fornecidos');
    }

    let fretesInterestaduais = 0;
    let freteTotal = 0;
    const detalhes = {
      registrosInterestaduais: [],
      registrosTotal: []
    };

    this.logger.info(`CFOPs interestaduais: ${CFOP_LOGPRODUZIR_FRETES_INTERESTADUAIS.join(', ')}`);
    this.logger.info(`CFOPs frete total: ${CFOP_LOGPRODUZIR_FRETE_TOTAL.join(', ')}`);

    // Processar registros consolidados de transporte
    ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
      this.logger.info(`Processando tipo ${tipoRegistro}...`);
      
      if (registros[tipoRegistro]) {
        const qtdRegistros = registros[tipoRegistro].length;
        this.logger.info(`${tipoRegistro}: ${qtdRegistros} registros encontrados`);
        
        registros[tipoRegistro].forEach((registro, index) => {
          const layout = this.obterLayoutRegistro(tipoRegistro);
          if (!layout) {
            if (index === 0) this.logger.error(`Layout não encontrado para ${tipoRegistro}`);
            return;
          }

          const campos = registro.slice(1, -1); // Remove '' do início e fim
          const cfopIndex = layout.indexOf('CFOP');
          const valorIndex = layout.indexOf('VL_OPR');
          
          const cfop = campos[cfopIndex] || '';
          const valorStr = campos[valorIndex] || '0';
          const valor = parseFloatSafe(valorStr);

          // Log DEBUG para primeiros registros
          if (index < 3) {
            this.logger.info(`DEBUG ${tipoRegistro}[${index}]: CFOP=${cfop}, VL_OPR=${valor}`);
          }

          // Detectar CFOPs de transporte
          if (CFOP_LOGPRODUZIR_FRETE_TOTAL.includes(cfop)) {
            this.logger.success(`ENCONTRADO CFOP TRANSPORTE: ${cfop} com valor R$${valor.toFixed(2)} no ${tipoRegistro}[${index}]`);
          }

          if (valor > 0) {
            // Verificar se é frete interestadual (FI)
            if (CFOP_LOGPRODUZIR_FRETES_INTERESTADUAIS.includes(cfop)) {
              fretesInterestaduais += valor;
              detalhes.registrosInterestaduais.push({
                tipo: tipoRegistro,
                cfop: cfop,
                valor: valor,
                descricao: `Frete interestadual - ${cfop}`
              });
              this.logger.success(`FI encontrado: ${cfop} = R$${valor.toFixed(2)}`);
            }

            // Verificar se compõe o frete total (FT)
            if (CFOP_LOGPRODUZIR_FRETE_TOTAL.includes(cfop)) {
              freteTotal += valor;
              detalhes.registrosTotal.push({
                tipo: tipoRegistro,
                cfop: cfop,
                valor: valor,
                descricao: `Frete total - ${cfop}`
              });
            }
          }
        });
      } else {
        this.logger.warn(`${tipoRegistro}: não encontrado no SPED`);
      }
    });

    // Análise de CFOPs encontrados
    const cfopsEncontrados = new Set();
    const cfopsComValor = new Set();
    
    ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
      if (registros[tipoRegistro]) {
        registros[tipoRegistro].forEach(registro => {
          const layout = this.obterLayoutRegistro(tipoRegistro);
          if (layout) {
            const campos = registro.slice(1, -1);
            const cfop = campos[layout.indexOf('CFOP')] || '';
            const valor = parseFloatSafe(campos[layout.indexOf('VL_OPR')] || '0');
            
            if (cfop) {
              cfopsEncontrados.add(cfop);
              if (valor > 0) cfopsComValor.add(cfop);
            }
          }
        });
      }
    });

    this.logger.info(`CFOPs únicos encontrados no SPED: ${Array.from(cfopsEncontrados).sort().join(', ')}`);
    this.logger.info(`CFOPs com valor > 0: ${Array.from(cfopsComValor).sort().join(', ')}`);

    const cfopsTransportePresentes = Array.from(cfopsEncontrados).filter(cfop => 
      CFOP_LOGPRODUZIR_FRETE_TOTAL.includes(cfop)
    );
    const cfopsTransporteComValor = Array.from(cfopsComValor).filter(cfop => 
      CFOP_LOGPRODUZIR_FRETE_TOTAL.includes(cfop)
    );

    this.logger.info(`CFOPs de transporte presentes: ${cfopsTransportePresentes.join(', ') || 'NENHUM'}`);
    this.logger.info(`CFOPs de transporte com valor > 0: ${cfopsTransporteComValor.join(', ') || 'NENHUM'}`);

    this.logger.success(`RESULTADO: FI=R$ ${fretesInterestaduais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, FT=R$ ${freteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    return {
      fretesInterestaduais,
      freteTotal,
      detalhes
    };
  }

  calcularCreditosLogproduzir(registros) {
    // LogPRODUZIR: créditos de ICMS sobre transporte (se houver)
    // Por simplicidade, assumimos 0 por enquanto
    // Em implementação futura, processar créditos específicos de transporte
    return 0;
  }

  obterConfiguracoesLogproduzir(configuracoes = {}) {
    return {
      categoria: configuracoes.categoria || 'II',
      mediaBase: configuracoes.mediaBase || 0,
      igpDi: configuracoes.igpDi || 1.0,
      saldoCredorAnterior: configuracoes.saldoCredorAnterior || 0
    };
  }

  obterLayoutRegistro(tipoRegistro) {
    const layouts = {
      'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],
      'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
      'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC', 'COD_OBS'],
      'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS']
    };
    
    return layouts[tipoRegistro] || null;
  }

  /**
   * Processamento específico para múltiplos períodos - LogPRODUZIR
   */
  processMultiplePeriods(multiPeriodData, configuracoes = {}) {
    this.logger.info('Iniciando processamento LogPRODUZIR para múltiplos períodos...');
    
    const resultados = [];
    
    for (let i = 0; i < multiPeriodData.length; i++) {
      const periodData = multiPeriodData[i];
      
      // Obter saldo credor do período anterior
      const saldoCredorAnterior = i > 0 && resultados[i - 1] ? 
        (resultados[i - 1].saldoCredorFinal || 0) : 
        (configuracoes.saldoCredorInicial || 0);
      
      // Configuração para este período
      const configPeriodo = {
        ...configuracoes,
        saldoCredorAnterior: saldoCredorAnterior
      };
      
      // Calcular LogPRODUZIR
      const resultado = this.calculateLogproduzir(periodData.registrosCompletos, configPeriodo);
      
      // Adicionar informações do período
      resultado.periodo = periodData.periodo;
      resultado.nomeEmpresa = periodData.nomeEmpresa;
      resultado.fileName = periodData.fileName;
      
      resultados.push(resultado);
      
      this.logger.success(`Período ${periodData.periodo} processado - Crédito LogPRODUZIR: ${formatCurrency(resultado.creditoLogproduzir || 0)}`);
    }
    
    this.logger.success(`Processamento LogPRODUZIR concluído: ${resultados.length} períodos calculados`);
    return resultados;
  }

  /**
   * Calcula LogPRODUZIR para um período específico
   */
  calculateLogproduzirForPeriod(registros, configuracoes = {}) {
    return this.calculateLogproduzir(registros, configuracoes);
  }

  /**
   * Analisa fretes em múltiplos períodos
   */
  analyzeMultiplePeriodFretes(multiPeriodData) {
    const allFretes = [];
    
    multiPeriodData.forEach((periodData, periodIndex) => {
      const fretes = this.processarFretesLogproduzir(periodData.registrosCompletos);
      
      // Adicionar informações do período
      fretes.forEach(frete => {
        frete.periodoIndex = periodIndex;
        frete.periodo = periodData.periodo;
        frete.nomeEmpresa = periodData.nomeEmpresa;
      });
      
      allFretes.push({
        periodo: periodData.periodo,
        nomeEmpresa: periodData.nomeEmpresa,
        fretes: fretes,
        totalFreteInterestadual: fretes.filter(f => f.tipoFrete === 'INTERESTADUAL').reduce((sum, f) => sum + f.valorOperacao, 0),
        totalFreteTotal: fretes.reduce((sum, f) => sum + f.valorOperacao, 0)
      });
    });
    
    this.logger.info(`Fretes analisados: ${allFretes.reduce((sum, p) => sum + p.fretes.length, 0)} registros em ${multiPeriodData.length} períodos`);
    return allFretes;
  }

  /**
   * Gera relatório consolidado para múltiplos períodos
   */
  generateConsolidatedReport(multiPeriodResults) {
    const consolidado = {
      totalPeriodos: multiPeriodResults.length,
      periodoInicial: multiPeriodResults[0]?.periodo || '',
      periodoFinal: multiPeriodResults[multiPeriodResults.length - 1]?.periodo || '',
      nomeEmpresa: multiPeriodResults[0]?.nomeEmpresa || '',
      totais: {
        freteInterestadual: 0,
        freteTotal: 0,
        creditoLogproduzir: 0,
        contribuicoes: 0,
        liquidoLogproduzir: 0
      },
      periodos: []
    };
    
    multiPeriodResults.forEach(resultado => {
      const resumoPeriodo = {
        periodo: resultado.periodo,
        freteInterestadual: resultado.freteInterestadual || 0,
        freteTotal: resultado.freteTotal || 0,
        creditoLogproduzir: resultado.creditoLogproduzir || 0,
        contribuicoes: resultado.contribuicoes || 0,
        liquidoLogproduzir: resultado.liquidoLogproduzir || 0
      };
      
      consolidado.periodos.push(resumoPeriodo);
      
      // Somar totais
      consolidado.totais.freteInterestadual += resumoPeriodo.freteInterestadual;
      consolidado.totais.freteTotal += resumoPeriodo.freteTotal;
      consolidado.totais.creditoLogproduzir += resumoPeriodo.creditoLogproduzir;
      consolidado.totais.contribuicoes += resumoPeriodo.contribuicoes;
      consolidado.totais.liquidoLogproduzir += resumoPeriodo.liquidoLogproduzir;
    });
    
    // Calcular médias
    consolidado.medias = {
      freteInterestadual: consolidado.totais.freteInterestadual / consolidado.totalPeriodos,
      freteTotal: consolidado.totais.freteTotal / consolidado.totalPeriodos,
      creditoLogproduzir: consolidado.totais.creditoLogproduzir / consolidado.totalPeriodos,
      contribuicoes: consolidado.totais.contribuicoes / consolidado.totalPeriodos,
      liquidoLogproduzir: consolidado.totais.liquidoLogproduzir / consolidado.totalPeriodos
    };
    
    this.logger.success(`Relatório consolidado gerado: ${consolidado.totalPeriodos} períodos`);
    return consolidado;
  }
}

export default LogproduzirCalculator;

