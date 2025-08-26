import { formatCurrency, parseFloatSafe, downloadBlob } from '../core/utils.js';

/**
 * Classe para validação e confronto de dados fiscais
 */
export class ValidationManager {
  constructor(logger) {
    this.logger = logger;
    
    // Configurações de validação
    this.validationConfig = {
      toleranciaMonetaria: 0.01, // R$ 0,01
      toleranciaPercentual: 0.01, // 1%
      camposObrigatorios: {
        E110: ['vlTotDebitos', 'vlTotCreditos', 'vlIcmsRecolher'],
        E111: ['codAjApur', 'vlAjApur'],
        E115: ['codInfAdic', 'vlInfAdic']
      }
    };
  }

  /**
   * Extrai dados de validação do SPED
   * @param {Object} registros - Registros SPED completos
   * @returns {Object} Dados de validação extraídos
   */
  extractSpedValidationData(registros) {
    this.logger.info('Extraindo dados de validação do SPED...');
    
    const validationData = {
      // Dados básicos
      empresa: null,
      periodo: null,
      cnpj: null,
      
      // Apuração ICMS (E110)
      e110: null,
      icmsApurado: 0,
      icmsRecolher: 0,
      saldoCredorAnterior: 0,
      saldoCredorTransportar: 0,
      
      // Ajustes (E111)
      e111: [],
      totalAjustesDebito: 0,
      totalAjustesCredito: 0,
      ajustesFomentar: [],
      ajustesProgoias: [],
      
      // Informações adicionais (E115)
      e115: [],
      beneficiosFomentar: 0,
      beneficiosProgoias: 0,
      
      // Totalizadores
      totalDebitos: 0,
      totalCreditos: 0,
      saldoApurado: 0,
      
      // Operações
      operacoesIncentivadas: [],
      operacoesNaoIncentivadas: [],
      totalOperacoesIncentivadas: 0,
      totalOperacoesNaoIncentivadas: 0,
      
      // Status de validação
      validationStatus: {
        estruturaValida: true,
        dadosConsistentes: true,
        erros: [],
        alertas: []
      }
    };

    try {
      // 1. Extrair dados da empresa (0000)
      this.extractCompanyData(registros, validationData);
      
      // 2. Extrair dados do E110 (Apuração do ICMS)
      this.extractE110Data(registros, validationData);
      
      // 3. Extrair dados do E111 (Ajustes)
      this.extractE111Data(registros, validationData);
      
      // 4. Extrair dados do E115 (Informações Adicionais)
      this.extractE115Data(registros, validationData);
      
      // 5. Extrair dados de operações (C190, C590, D190, D590)
      this.extractOperationsData(registros, validationData);
      
      // 6. Validar consistência dos dados
      this.validateDataConsistency(validationData);
      
      this.logger.info('Dados de validação extraídos com sucesso');
      
    } catch (error) {
      validationData.validationStatus.estruturaValida = false;
      validationData.validationStatus.erros.push(`Erro na extração: ${error.message}`);
      this.logger.error(`Erro ao extrair dados de validação: ${error.message}`);
    }

    return validationData;
  }

  /**
   * Extrai dados da empresa (registro 0000)
   * @param {Object} registros - Registros SPED
   * @param {Object} validationData - Dados de validação
   */
  extractCompanyData(registros, validationData) {
    if (registros['0000'] && registros['0000'].length > 0) {
      const header = registros['0000'][0];
      
      validationData.empresa = header[6] || 'Empresa não informada';
      validationData.cnpj = header[7] || '';
      
      // Extrair período das datas
      const dtIni = header[4] || '';
      const dtFin = header[5] || '';
      
      if (dtIni && dtIni.length >= 6) {
        const mes = dtIni.substring(2, 4);
        const ano = dtIni.substring(4, 8);
        validationData.periodo = `${mes}/${ano}`;
      }
      
      this.logger.info(`Empresa: ${validationData.empresa} | Período: ${validationData.periodo}`);
    }
  }

  /**
   * Extrai dados do registro E110
   * @param {Object} registros - Registros SPED
   * @param {Object} validationData - Dados de validação
   */
  extractE110Data(registros, validationData) {
    if (!registros.E110 || registros.E110.length === 0) {
      validationData.validationStatus.alertas.push('Registro E110 não encontrado');
      return;
    }

    const e110 = registros.E110[0];
    
    if (typeof e110 === 'object' && e110.vlTotDebitos !== undefined) {
      // Dados já processados
      validationData.e110 = e110;
      validationData.totalDebitos = e110.vlTotDebitos || 0;
      validationData.totalCreditos = e110.vlTotCreditos || 0;
      validationData.icmsRecolher = e110.vlIcmsRecolher || 0;
      validationData.saldoCredorAnterior = e110.vlSldCredorAnt || 0;
      validationData.saldoCredorTransportar = e110.vlSldCredorTransportar || 0;
      validationData.saldoApurado = e110.vlSldApurado || 0;
    } else {
      // Dados brutos do SPED
      validationData.e110 = {
        vlTotDebitos: parseFloatSafe(e110[2]) || 0,
        vlAjDebitos: parseFloatSafe(e110[3]) || 0,
        vlTotAjDebitos: parseFloatSafe(e110[4]) || 0,
        vlEstornosCred: parseFloatSafe(e110[5]) || 0,
        vlTotCreditos: parseFloatSafe(e110[6]) || 0,
        vlAjCreditos: parseFloatSafe(e110[7]) || 0,
        vlTotAjCreditos: parseFloatSafe(e110[8]) || 0,
        vlEstornosDeb: parseFloatSafe(e110[9]) || 0,
        vlSldCredorAnt: parseFloatSafe(e110[10]) || 0,
        vlSldApurado: parseFloatSafe(e110[11]) || 0,
        vlTotDed: parseFloatSafe(e110[12]) || 0,
        vlIcmsRecolher: parseFloatSafe(e110[13]) || 0,
        vlSldCredorTransportar: parseFloatSafe(e110[14]) || 0
      };
      
      validationData.totalDebitos = validationData.e110.vlTotDebitos;
      validationData.totalCreditos = validationData.e110.vlTotCreditos;
      validationData.icmsRecolher = validationData.e110.vlIcmsRecolher;
      validationData.saldoCredorAnterior = validationData.e110.vlSldCredorAnt;
      validationData.saldoCredorTransportar = validationData.e110.vlSldCredorTransportar;
      validationData.saldoApurado = validationData.e110.vlSldApurado;
    }

    this.logger.info(`E110 extraído: ICMS a Recolher = ${formatCurrency(validationData.icmsRecolher)}`);
  }

  /**
   * Extrai dados do registro E111
   * @param {Object} registros - Registros SPED
   * @param {Object} validationData - Dados de validação
   */
  extractE111Data(registros, validationData) {
    if (!registros.E111 || registros.E111.length === 0) {
      validationData.validationStatus.alertas.push('Registros E111 não encontrados');
      return;
    }

    let totalAjustesDebito = 0;
    let totalAjustesCredito = 0;
    
    for (const e111Raw of registros.E111) {
      let e111;
      
      if (typeof e111Raw === 'object' && e111Raw.codAjApur !== undefined) {
        // Dados já processados
        e111 = e111Raw;
      } else {
        // Dados brutos
        e111 = {
          codAjApur: e111Raw[2] || '',
          descrComplAj: e111Raw[3] || '',
          vlAjApur: parseFloatSafe(e111Raw[4]) || 0
        };
      }
      
      validationData.e111.push(e111);
      
      // Classificar como débito ou crédito baseado no código
      const codigo = e111.codAjApur.toUpperCase();
      const valor = Math.abs(e111.vlAjApur);
      
      if (this.isCodigoDebito(codigo)) {
        totalAjustesDebito += valor;
      } else if (this.isCodigoCredito(codigo)) {
        totalAjustesCredito += valor;
      }
      
      // Identificar ajustes de incentivos fiscais
      if (this.isAjusteFomentar(codigo)) {
        validationData.ajustesFomentar.push(e111);
        validationData.beneficiosFomentar += valor;
      }
      
      if (this.isAjusteProgoias(codigo)) {
        validationData.ajustesProgoias.push(e111);
        validationData.beneficiosProgoias += valor;
      }
    }
    
    validationData.totalAjustesDebito = totalAjustesDebito;
    validationData.totalAjustesCredito = totalAjustesCredito;
    
    this.logger.info(`E111 extraído: ${validationData.e111.length} ajustes, Benefícios FOMENTAR = ${formatCurrency(validationData.beneficiosFomentar)}`);
  }

  /**
   * Extrai dados do registro E115
   * @param {Object} registros - Registros SPED
   * @param {Object} validationData - Dados de validação
   */
  extractE115Data(registros, validationData) {
    if (!registros.E115 || registros.E115.length === 0) {
      validationData.validationStatus.alertas.push('Registros E115 não encontrados');
      return;
    }

    for (const e115Raw of registros.E115) {
      let e115;
      
      if (typeof e115Raw === 'object' && e115Raw.codInfAdic !== undefined) {
        // Dados já processados
        e115 = e115Raw;
      } else {
        // Dados brutos
        e115 = {
          codInfAdic: e115Raw[2] || '',
          vlInfAdic: parseFloatSafe(e115Raw[3]) || 0,
          descrComplAj: e115Raw[4] || ''
        };
      }
      
      validationData.e115.push(e115);
      
      // Identificar códigos específicos de FOMENTAR/ProGoiás
      const codigo = e115.codInfAdic.toUpperCase();
      if (codigo.startsWith('GO200') || codigo.includes('FOMENTAR')) {
        validationData.beneficiosFomentar += Math.abs(e115.vlInfAdic);
      }
    }
    
    this.logger.info(`E115 extraído: ${validationData.e115.length} informações adicionais`);
  }

  /**
   * Extrai dados de operações
   * @param {Object} registros - Registros SPED
   * @param {Object} validationData - Dados de validação
   */
  extractOperationsData(registros, validationData) {
    const tiposOperacao = ['C190', 'C590', 'D190', 'D590'];
    
    for (const tipo of tiposOperacao) {
      if (registros[tipo] && registros[tipo].length > 0) {
        for (const operacao of registros[tipo]) {
          const cfop = operacao.cfop || operacao[3] || '';
          const valor = parseFloatSafe(operacao.vlOpr || operacao[5]) || 0;
          const icms = parseFloatSafe(operacao.vlIcms || operacao[7]) || 0;
          
          const operacaoData = {
            tipo,
            cfop,
            valor,
            icms,
            incentivada: this.isCfopIncentivado(cfop)
          };
          
          if (operacaoData.incentivada) {
            validationData.operacoesIncentivadas.push(operacaoData);
            validationData.totalOperacoesIncentivadas += valor;
          } else {
            validationData.operacoesNaoIncentivadas.push(operacaoData);
            validationData.totalOperacoesNaoIncentivadas += valor;
          }
        }
      }
    }
    
    this.logger.info(`Operações extraídas: ${validationData.operacoesIncentivadas.length} incentivadas, ${validationData.operacoesNaoIncentivadas.length} não incentivadas`);
  }

  /**
   * Valida consistência dos dados
   * @param {Object} validationData - Dados de validação
   */
  validateDataConsistency(validationData) {
    const erros = validationData.validationStatus.erros;
    const alertas = validationData.validationStatus.alertas;
    
    // Validar E110
    if (validationData.e110) {
      const calculatedSaldo = validationData.totalDebitos - validationData.totalCreditos + validationData.saldoCredorAnterior;
      const declaredSaldo = validationData.saldoApurado;
      
      if (Math.abs(calculatedSaldo - declaredSaldo) > this.validationConfig.toleranciaMonetaria) {
        erros.push(`Inconsistência no saldo apurado: calculado ${formatCurrency(calculatedSaldo)} vs declarado ${formatCurrency(declaredSaldo)}`);
      }
    }
    
    // Validar campos obrigatórios
    if (!validationData.empresa || validationData.empresa === 'Empresa não informada') {
      alertas.push('Nome da empresa não informado');
    }
    
    if (!validationData.cnpj) {
      alertas.push('CNPJ não informado');
    }
    
    if (!validationData.periodo) {
      alertas.push('Período não identificado');
    }
    
    // Validar valores negativos onde não deveria haver
    if (validationData.icmsRecolher < 0) {
      alertas.push('ICMS a recolher com valor negativo');
    }
    
    // Definir status geral
    validationData.validationStatus.dadosConsistentes = erros.length === 0;
    
    if (erros.length > 0) {
      this.logger.warn(`Validação encontrou ${erros.length} erros e ${alertas.length} alertas`);
    } else {
      this.logger.info('Dados de validação consistentes');
    }
  }

  /**
   * Cria relatório de validação
   * @param {Object} calculatedValues - Valores calculados pela aplicação
   * @param {Object} spedValidationData - Dados extraídos do SPED
   * @param {string} periodo - Período
   * @param {string} nomeEmpresa - Nome da empresa
   * @returns {Object} Relatório de validação
   */
  createValidationReport(calculatedValues, spedValidationData, periodo, nomeEmpresa) {
    this.logger.info('Criando relatório de validação...');
    
    const report = {
      // Metadados
      metadata: {
        empresa: nomeEmpresa || spedValidationData.empresa,
        periodo: periodo || spedValidationData.periodo,
        dataRelatorio: new Date().toLocaleDateString('pt-BR'),
        horaRelatorio: new Date().toLocaleTimeString('pt-BR')
      },
      
      // Confronto principal
      confronto: {
        icmsRecolher: {
          calculado: calculatedValues.icmsRecolher || 0,
          sped: spedValidationData.icmsRecolher || 0,
          diferenca: 0,
          status: 'OK'
        },
        totalDebitos: {
          calculado: calculatedValues.totalDebitos || 0,
          sped: spedValidationData.totalDebitos || 0,
          diferenca: 0,
          status: 'OK'
        },
        totalCreditos: {
          calculado: calculatedValues.totalCreditos || 0,
          sped: spedValidationData.totalCreditos || 0,
          diferenca: 0,
          status: 'OK'
        },
        beneficiosFomentar: {
          calculado: calculatedValues.valorFinanciamento || 0,
          sped: spedValidationData.beneficiosFomentar || 0,
          diferenca: 0,
          status: 'OK'
        }
      },
      
      // Análise detalhada
      analise: {
        percentualCoincidencia: 0,
        principaisDivergencias: [],
        alertasImportantes: [],
        recomendacoes: []
      },
      
      // Resumo executivo
      resumo: {
        statusGeral: 'OK',
        totalVerificacoes: 0,
        verificacoesOK: 0,
        verificacoesAlerta: 0,
        verificacoesErro: 0,
        principaisAchados: []
      },
      
      // Dados brutos para referência
      dadosBrutos: {
        calculados: calculatedValues,
        sped: spedValidationData
      }
    };

    try {
      // Calcular diferenças e status
      for (const [campo, dados] of Object.entries(report.confronto)) {
        dados.diferenca = Math.abs(dados.calculado - dados.sped);
        
        if (dados.diferenca <= this.validationConfig.toleranciaMonetaria) {
          dados.status = 'OK';
          report.resumo.verificacoesOK++;
        } else if (dados.diferenca <= (Math.max(dados.calculado, dados.sped) * this.validationConfig.toleranciaPercentual)) {
          dados.status = 'ALERTA';
          report.resumo.verificacoesAlerta++;
          report.analise.alertasImportantes.push(`${campo}: diferença de ${formatCurrency(dados.diferenca)}`);
        } else {
          dados.status = 'ERRO';
          report.resumo.verificacoesErro++;
          report.analise.principaisDivergencias.push(`${campo}: calculado ${formatCurrency(dados.calculado)} vs SPED ${formatCurrency(dados.sped)}`);
        }
        
        report.resumo.totalVerificacoes++;
      }
      
      // Calcular percentual de coincidência
      report.analise.percentualCoincidencia = 
        report.resumo.totalVerificacoes > 0 ? 
        ((report.resumo.verificacoesOK / report.resumo.totalVerificacoes) * 100) : 0;
      
      // Definir status geral
      if (report.resumo.verificacoesErro > 0) {
        report.resumo.statusGeral = 'ERRO';
      } else if (report.resumo.verificacoesAlerta > 0) {
        report.resumo.statusGeral = 'ALERTA';
      } else {
        report.resumo.statusGeral = 'OK';
      }
      
      // Gerar recomendações
      this.generateRecommendations(report);
      
      // Principais achados
      this.generateKeyFindings(report);
      
      this.logger.info(`Relatório de validação criado: ${report.resumo.statusGeral} (${report.analise.percentualCoincidencia.toFixed(1)}% de coincidência)`);
      
    } catch (error) {
      this.logger.error(`Erro ao criar relatório de validação: ${error.message}`);
      report.resumo.statusGeral = 'ERRO';
      report.analise.alertasImportantes.push(`Erro na geração do relatório: ${error.message}`);
    }

    return report;
  }

  /**
   * Gera recomendações para o relatório
   * @param {Object} report - Relatório
   */
  generateRecommendations(report) {
    const recomendacoes = report.analise.recomendacoes;
    
    if (report.resumo.verificacoesErro > 0) {
      recomendacoes.push('Revisar cálculos que apresentaram divergências significativas');
      recomendacoes.push('Verificar se todos os registros SPED foram processados corretamente');
    }
    
    if (report.confronto.beneficiosFomentar.diferenca > 1000) {
      recomendacoes.push('Revisar cálculo dos benefícios FOMENTAR - diferença relevante detectada');
    }
    
    if (report.resumo.verificacoesAlerta > 0) {
      recomendacoes.push('Monitorar alertas identificados em próximas apurações');
    }
    
    if (report.analise.percentualCoincidencia < 90) {
      recomendacoes.push('Investigar causas das divergências para melhorar precisão dos cálculos');
    }
    
    if (recomendacoes.length === 0) {
      recomendacoes.push('Cálculos estão consistentes com os dados declarados no SPED');
    }
  }

  /**
   * Gera principais achados
   * @param {Object} report - Relatório
   */
  generateKeyFindings(report) {
    const achados = report.resumo.principaisAchados;
    
    // Maior divergência
    let maiorDivergencia = { campo: '', valor: 0 };
    for (const [campo, dados] of Object.entries(report.confronto)) {
      if (dados.diferenca > maiorDivergencia.valor) {
        maiorDivergencia = { campo, valor: dados.diferenca };
      }
    }
    
    if (maiorDivergencia.valor > this.validationConfig.toleranciaMonetaria) {
      achados.push(`Maior divergência: ${maiorDivergencia.campo} (${formatCurrency(maiorDivergencia.valor)})`);
    }
    
    // Status geral
    achados.push(`Status geral: ${report.resumo.statusGeral}`);
    achados.push(`Percentual de coincidência: ${report.analise.percentualCoincidencia.toFixed(1)}%`);
    
    // Benefícios identificados
    const beneficioTotal = report.confronto.beneficiosFomentar.calculado;
    if (beneficioTotal > 0) {
      achados.push(`Benefício fiscal FOMENTAR identificado: ${formatCurrency(beneficioTotal)}`);
    }
  }

  /**
   * Mostra relatório de validação na interface
   * @param {Object} report - Relatório
   */
  showValidationReport(report) {
    // Esta função será implementada pela interface específica
    this.logger.info('Relatório de validação disponível para exibição');
    console.log('Validation Report:', report);
  }

  /**
   * Exporta validação para Excel
   * @param {Object} report - Relatório de validação
   */
  async exportValidationExcel(report) {
    this.logger.info('Exportando relatório de validação para Excel...');
    
    try {
      const workbook = await XlsxPopulate.fromBlankAsync();
      
      // Aba de resumo executivo
      const resumoSheet = workbook.sheet(0);
      resumoSheet.name('Resumo Executivo');
      this.createResumoExecutivoSheet(resumoSheet, report);
      
      // Aba de confronto detalhado
      const confrontoSheet = workbook.addSheet('Confronto Detalhado');
      this.createConfrontoDetalhadoSheet(confrontoSheet, report);
      
      // Aba de recomendações
      const recomendacoesSheet = workbook.addSheet('Recomendações');
      this.createRecomendacoesSheet(recomendacoesSheet, report);
      
      // Gerar arquivo
      const filename = `Validacao_${report.metadata.empresa}_${report.metadata.periodo}.xlsx`;
      const data = await workbook.outputAsync();
      downloadBlob(data, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      this.logger.success(`Relatório de validação exportado: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Erro ao exportar validação: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria aba de resumo executivo
   * @param {Object} sheet - Planilha
   * @param {Object} report - Relatório
   */
  createResumoExecutivoSheet(sheet, report) {
    const metadata = report.metadata;
    const resumo = report.resumo;
    
    // Título
    sheet.cell('A1').value('RELATÓRIO DE VALIDAÇÃO - RESUMO EXECUTIVO').style({
      bold: true,
      fontSize: 16,
      horizontalAlignment: 'center'
    });
    
    // Informações gerais
    sheet.cell('A3').value(`Empresa: ${metadata.empresa}`);
    sheet.cell('A4').value(`Período: ${metadata.periodo}`);
    sheet.cell('A5').value(`Data/Hora: ${metadata.dataRelatorio} ${metadata.horaRelatorio}`);
    
    // Status geral
    sheet.cell('A7').value('STATUS GERAL').style({ bold: true });
    sheet.cell('B7').value(resumo.statusGeral).style({
      bold: true,
      fill: this.getStatusColor(resumo.statusGeral)
    });
    
    // Estatísticas
    sheet.cell('A9').value('ESTATÍSTICAS DE VALIDAÇÃO').style({ bold: true });
    sheet.cell('A10').value('Total de Verificações:');
    sheet.cell('B10').value(resumo.totalVerificacoes);
    
    sheet.cell('A11').value('Verificações OK:');
    sheet.cell('B11').value(resumo.verificacoesOK).style({ fill: 'E6FFE6' });
    
    sheet.cell('A12').value('Verificações com Alerta:');
    sheet.cell('B12').value(resumo.verificacoesAlerta).style({ fill: 'FFF2CC' });
    
    sheet.cell('A13').value('Verificações com Erro:');
    sheet.cell('B13').value(resumo.verificacoesErro).style({ fill: 'FFE6E6' });
    
    sheet.cell('A14').value('% de Coincidência:');
    sheet.cell('B14').value(`${report.analise.percentualCoincidencia.toFixed(1)}%`);
    
    // Principais achados
    let row = 16;
    sheet.cell(`A${row}`).value('PRINCIPAIS ACHADOS').style({ bold: true });
    row++;
    
    for (const achado of resumo.principaisAchados) {
      sheet.cell(`A${row}`).value(`• ${achado}`);
      row++;
    }
    
    // Ajustar colunas
    sheet.column('A').width(35);
    sheet.column('B').width(25);
  }

  /**
   * Cria aba de confronto detalhado
   * @param {Object} sheet - Planilha
   * @param {Object} report - Relatório
   */
  createConfrontoDetalhadoSheet(sheet, report) {
    sheet.cell('A1').value('CONFRONTO DETALHADO - CALCULADO vs SPED').style({
      bold: true,
      fontSize: 14,
      horizontalAlignment: 'center'
    });
    
    const headers = ['Campo', 'Valor Calculado', 'Valor SPED', 'Diferença', 'Status'];
    headers.forEach((header, index) => {
      sheet.cell(3, index + 1).value(header).style({
        bold: true,
        fill: 'CCCCCC',
        border: true
      });
    });
    
    let row = 4;
    for (const [campo, dados] of Object.entries(report.confronto)) {
      sheet.cell(row, 1).value(campo);
      sheet.cell(row, 2).value(formatCurrency(dados.calculado));
      sheet.cell(row, 3).value(formatCurrency(dados.sped));
      sheet.cell(row, 4).value(formatCurrency(dados.diferenca));
      sheet.cell(row, 5).value(dados.status).style({
        fill: this.getStatusColor(dados.status)
      });
      
      // Aplicar bordas
      for (let col = 1; col <= 5; col++) {
        sheet.cell(row, col).style({ border: true });
      }
      
      row++;
    }
    
    // Ajustar colunas
    sheet.column('A').width(25);
    sheet.column('B').width(20);
    sheet.column('C').width(20);
    sheet.column('D').width(20);
    sheet.column('E').width(15);
  }

  /**
   * Cria aba de recomendações
   * @param {Object} sheet - Planilha
   * @param {Object} report - Relatório
   */
  createRecomendacoesSheet(sheet, report) {
    sheet.cell('A1').value('RECOMENDAÇÕES E ALERTAS').style({
      bold: true,
      fontSize: 14,
      horizontalAlignment: 'center'
    });
    
    let row = 3;
    
    // Principais divergências
    if (report.analise.principaisDivergencias.length > 0) {
      sheet.cell(`A${row}`).value('PRINCIPAIS DIVERGÊNCIAS:').style({ bold: true, fill: 'FFE6E6' });
      row++;
      
      for (const divergencia of report.analise.principaisDivergencias) {
        sheet.cell(`A${row}`).value(`• ${divergencia}`);
        row++;
      }
      row++;
    }
    
    // Alertas importantes
    if (report.analise.alertasImportantes.length > 0) {
      sheet.cell(`A${row}`).value('ALERTAS IMPORTANTES:').style({ bold: true, fill: 'FFF2CC' });
      row++;
      
      for (const alerta of report.analise.alertasImportantes) {
        sheet.cell(`A${row}`).value(`• ${alerta}`);
        row++;
      }
      row++;
    }
    
    // Recomendações
    sheet.cell(`A${row}`).value('RECOMENDAÇÕES:').style({ bold: true, fill: 'E6FFE6' });
    row++;
    
    for (const recomendacao of report.analise.recomendacoes) {
      sheet.cell(`A${row}`).value(`• ${recomendacao}`);
      row++;
    }
    
    sheet.column('A').width(80);
  }

  /**
   * Obtém cor baseada no status
   * @param {string} status - Status
   * @returns {string} Código da cor
   */
  getStatusColor(status) {
    switch (status.toUpperCase()) {
      case 'OK': return 'E6FFE6';      // Verde claro
      case 'ALERTA': return 'FFF2CC';   // Amarelo claro
      case 'ERRO': return 'FFE6E6';     // Vermelho claro
      default: return 'FFFFFF';         // Branco
    }
  }

  // Métodos auxiliares para classificação de códigos

  /**
   * Verifica se é código de débito
   * @param {string} codigo - Código de ajuste
   * @returns {boolean} True se for débito
   */
  isCodigoDebito(codigo) {
    return codigo.startsWith('GO010') || codigo.startsWith('GO030') || codigo.startsWith('GO040');
  }

  /**
   * Verifica se é código de crédito
   * @param {string} codigo - Código de ajuste
   * @returns {boolean} True se for crédito
   */
  isCodigoCredito(codigo) {
    return codigo.startsWith('GO020') || codigo.startsWith('GO000');
  }

  /**
   * Verifica se é ajuste FOMENTAR
   * @param {string} codigo - Código de ajuste
   * @returns {boolean} True se for FOMENTAR
   */
  isAjusteFomentar(codigo) {
    const codigosFomentar = ['GO040007', 'GO040008', 'GO040009', 'GO040010', 'GO040011', 'GO040012'];
    return codigosFomentar.includes(codigo);
  }

  /**
   * Verifica se é ajuste ProGoiás
   * @param {string} codigo - Código de ajuste
   * @returns {boolean} True se for ProGoiás
   */
  isAjusteProgoias(codigo) {
    return codigo.includes('PROGOIAS') || codigo.includes('PRO_GOIAS');
  }

  /**
   * Verifica se CFOP é incentivado
   * @param {string} cfop - CFOP
   * @returns {boolean} True se for incentivado
   */
  isCfopIncentivado(cfop) {
    // Esta lógica deve ser importada das constantes
    // Por simplicidade, implementação básica
    const cfopsIncentivados = [
      '5101', '5103', '5105', '5109', '5116', '5118', '5122', '5124', '5125',
      '6101', '6103', '6105', '6107', '6109', '6116', '6118', '6122', '6124'
    ];
    
    return cfopsIncentivados.includes(cfop);
  }
}