import { formatCurrency, parseFloatSafe, downloadBlob } from '../core/utils.js';

/**
 * Classe para geração e validação de registros E115
 */
export class E115Generator {
  constructor(logger) {
    this.logger = logger;
    
    // Mapeamento de códigos E115 para FOMENTAR/PRODUZIR/MICROPRODUZIR
    this.codigosE115 = {
      // Quadro A - Operações com ICMS (GO200001-GO200017)
      'GO200001': { descricao: 'Débito do ICMS das Operações Incentivadas', tipo: 'debito' },
      'GO200002': { descricao: 'Crédito do ICMS das Operações Incentivadas', tipo: 'credito' },
      'GO200003': { descricao: 'Saldo Devedor das Operações Incentivadas', tipo: 'saldo' },
      'GO200004': { descricao: 'Débito do ICMS das Operações Não Incentivadas', tipo: 'debito' },
      'GO200005': { descricao: 'Crédito do ICMS das Operações Não Incentivadas', tipo: 'credito' },
      'GO200006': { descricao: 'Saldo Devedor das Operações Não Incentivadas', tipo: 'saldo' },
      'GO200007': { descricao: 'Débito Total do ICMS (Incentivadas + Não Incentivadas)', tipo: 'total' },
      'GO200008': { descricao: 'Crédito Total do ICMS (Incentivadas + Não Incentivadas)', tipo: 'total' },
      'GO200009': { descricao: 'Saldo Devedor Total do ICMS', tipo: 'total' },
      'GO200010': { descricao: 'Base de Cálculo das Operações Incentivadas', tipo: 'base' },
      'GO200011': { descricao: 'Base de Cálculo das Operações Não Incentivadas', tipo: 'base' },
      'GO200012': { descricao: 'Base de Cálculo Total', tipo: 'base' },
      'GO200013': { descricao: 'Valor das Operações Incentivadas', tipo: 'operacao' },
      'GO200014': { descricao: 'Valor das Operações Não Incentivadas', tipo: 'operacao' },
      'GO200015': { descricao: 'Valor Total das Operações', tipo: 'operacao' },
      'GO200016': { descricao: 'Percentual de Operações Incentivadas', tipo: 'percentual' },
      'GO200017': { descricao: 'Percentual de Operações Não Incentivadas', tipo: 'percentual' },

      // Quadro B - Cálculos FOMENTAR (GO200018-GO200035)
      'GO200018': { descricao: 'ICMS devido pelas operações incentivadas (Base FOMENTAR)', tipo: 'calculo' },
      'GO200019': { descricao: 'ICMS financiado pelo FOMENTAR/PRODUZIR/MICROPRODUZIR', tipo: 'calculo' },
      'GO200020': { descricao: 'Parcela não financiada (a recolher)', tipo: 'calculo' },
      'GO200021': { descricao: 'Percentual de financiamento aplicado', tipo: 'config' },
      'GO200022': { descricao: 'Valor total a pagar (sem financiamento)', tipo: 'calculo' },
      'GO200023': { descricao: 'Valor do financiamento (economia)', tipo: 'calculo' },
      'GO200024': { descricao: 'Percentual de economia obtida', tipo: 'percentual' },
      'GO200025': { descricao: 'Crédito oriundo de saldo anterior', tipo: 'credito' },
      'GO200026': { descricao: 'Crédito a transportar para período seguinte', tipo: 'credito' },
      'GO200027': { descricao: 'Ajuste de débito - FOMENTAR', tipo: 'ajuste' },
      'GO200028': { descricao: 'Ajuste de crédito - FOMENTAR', tipo: 'ajuste' },
      'GO200029': { descricao: 'Estorno de débito - FOMENTAR', tipo: 'estorno' },
      'GO200030': { descricao: 'Estorno de crédito - FOMENTAR', tipo: 'estorno' },
      'GO200031': { descricao: 'ICMS ST das operações incentivadas', tipo: 'st' },
      'GO200032': { descricao: 'ICMS ST das operações não incentivadas', tipo: 'st' },
      'GO200033': { descricao: 'Total ICMS ST', tipo: 'st' },
      'GO200034': { descricao: 'Outras deduções', tipo: 'deducao' },
      'GO200035': { descricao: 'Valor líquido a recolher', tipo: 'final' },

      // Quadro C - Demonstrativo Fiscal (GO200036-GO200054)
      'GO200036': { descricao: 'Item 1 - Débito do período', tipo: 'demonstrativo' },
      'GO200037': { descricao: 'Item 2 - Ajustes de débito', tipo: 'demonstrativo' },
      'GO200038': { descricao: 'Item 3 - Estorno de crédito', tipo: 'demonstrativo' },
      'GO200039': { descricao: 'Item 4 - Total de débitos', tipo: 'demonstrativo' },
      'GO200040': { descricao: 'Item 5 - Crédito do período', tipo: 'demonstrativo' },
      'GO200041': { descricao: 'Item 6 - Ajustes de crédito', tipo: 'demonstrativo' },
      'GO200042': { descricao: 'Item 7 - Estorno de débito', tipo: 'demonstrativo' },
      'GO200043': { descricao: 'Item 8 - Total de créditos', tipo: 'demonstrativo' },
      'GO200044': { descricao: 'Item 9 - Saldo credor anterior', tipo: 'demonstrativo' },
      'GO200045': { descricao: 'Item 10 - Saldo apurado no período', tipo: 'demonstrativo' },
      'GO200046': { descricao: 'Item 11 - Deduções', tipo: 'demonstrativo' },
      'GO200047': { descricao: 'Item 12 - ICMS a recolher', tipo: 'demonstrativo' },
      'GO200048': { descricao: 'Item 13 - Saldo credor a transportar', tipo: 'demonstrativo' },
      'GO200049': { descricao: 'Confronto - Valor calculado vs SPED declarado', tipo: 'confronto' },
      'GO200050': { descricao: 'Diferença encontrada (calculado - declarado)', tipo: 'confronto' },
      'GO200051': { descricao: 'Status da conferência', tipo: 'status' },
      'GO200052': { descricao: 'Observações e ressalvas', tipo: 'observacao' },
      'GO200053': { descricao: 'Data do processamento', tipo: 'metadata' },
      'GO200054': { descricao: 'Versão do sistema utilizada', tipo: 'metadata' }
    };
  }

  /**
   * Gera registros E115 completos para FOMENTAR
   * @param {Object} dadosCalculo - Dados do cálculo FOMENTAR
   * @param {string} programType - Tipo do programa (FOMENTAR, PRODUZIR, MICROPRODUZIR)
   * @param {Object} headerInfo - Informações do header SPED
   * @returns {Array} Array de objetos com códigos E115
   */
  generateRegistroE115(dadosCalculo, programType = 'FOMENTAR', headerInfo = {}) {
    this.logger.info(`Gerando registro E115 para ${programType}...`);
    
    if (!dadosCalculo || !dadosCalculo.calculatedValues) {
      this.logger.error('Dados de cálculo não disponíveis para geração E115');
      return [];
    }

    const values = dadosCalculo.calculatedValues;
    const registrosE115 = [];

    try {
      // Quadro A - Operações com ICMS (GO200001-GO200017)
      registrosE115.push(
        { codigo: 'GO200001', descricao: this.codigosE115['GO200001'].descricao, valor: values.debitoIncentivadas || 0 },
        { codigo: 'GO200002', descricao: this.codigosE115['GO200002'].descricao, valor: values.creditoIncentivadas || 0 },
        { codigo: 'GO200003', descricao: this.codigosE115['GO200003'].descricao, valor: values.saldoDevedorIncentivadas || 0 },
        { codigo: 'GO200004', descricao: this.codigosE115['GO200004'].descricao, valor: values.debitoNaoIncentivadas || 0 },
        { codigo: 'GO200005', descricao: this.codigosE115['GO200005'].descricao, valor: values.creditoNaoIncentivadas || 0 },
        { codigo: 'GO200006', descricao: this.codigosE115['GO200006'].descricao, valor: values.saldoDevedorNaoIncentivadas || 0 },
        { codigo: 'GO200007', descricao: this.codigosE115['GO200007'].descricao, valor: values.debitoTotal || 0 },
        { codigo: 'GO200008', descricao: this.codigosE115['GO200008'].descricao, valor: values.creditoTotal || 0 },
        { codigo: 'GO200009', descricao: this.codigosE115['GO200009'].descricao, valor: values.saldoDevedorTotal || 0 },
        { codigo: 'GO200010', descricao: this.codigosE115['GO200010'].descricao, valor: values.baseCalculoIncentivadas || 0 },
        { codigo: 'GO200011', descricao: this.codigosE115['GO200011'].descricao, valor: values.baseCalculoNaoIncentivadas || 0 },
        { codigo: 'GO200012', descricao: this.codigosE115['GO200012'].descricao, valor: values.baseCalculoTotal || 0 },
        { codigo: 'GO200013', descricao: this.codigosE115['GO200013'].descricao, valor: values.valorOperacoesIncentivadas || 0 },
        { codigo: 'GO200014', descricao: this.codigosE115['GO200014'].descricao, valor: values.valorOperacoesNaoIncentivadas || 0 },
        { codigo: 'GO200015', descricao: this.codigosE115['GO200015'].descricao, valor: values.valorOperacoesTotal || 0 },
        { codigo: 'GO200016', descricao: this.codigosE115['GO200016'].descricao, valor: values.percentualIncentivadas || 0 },
        { codigo: 'GO200017', descricao: this.codigosE115['GO200017'].descricao, valor: values.percentualNaoIncentivadas || 0 }
      );

      // Quadro B - Cálculos FOMENTAR (GO200018-GO200035)
      const percentualFinanciamento = this.getPercentualPrograma(programType);
      registrosE115.push(
        { codigo: 'GO200018', descricao: this.codigosE115['GO200018'].descricao, valor: values.icmsBaseFomentar || 0 },
        { codigo: 'GO200019', descricao: this.codigosE115['GO200019'].descricao, valor: values.icmsFinanciado || 0 },
        { codigo: 'GO200020', descricao: this.codigosE115['GO200020'].descricao, valor: values.parcelaNaoFinanciada || 0 },
        { codigo: 'GO200021', descricao: this.codigosE115['GO200021'].descricao, valor: percentualFinanciamento },
        { codigo: 'GO200022', descricao: this.codigosE115['GO200022'].descricao, valor: values.totalGeralPagar || 0 },
        { codigo: 'GO200023', descricao: this.codigosE115['GO200023'].descricao, valor: values.valorFinanciamento || 0 },
        { codigo: 'GO200024', descricao: this.codigosE115['GO200024'].descricao, valor: values.percentualEconomia || 0 },
        { codigo: 'GO200025', descricao: this.codigosE115['GO200025'].descricao, valor: values.creditoSaldoAnterior || 0 },
        { codigo: 'GO200026', descricao: this.codigosE115['GO200026'].descricao, valor: values.creditoTransportar || 0 },
        { codigo: 'GO200027', descricao: this.codigosE115['GO200027'].descricao, valor: values.ajusteDebito || 0 },
        { codigo: 'GO200028', descricao: this.codigosE115['GO200028'].descricao, valor: values.ajusteCredito || 0 },
        { codigo: 'GO200029', descricao: this.codigosE115['GO200029'].descricao, valor: values.estornoDebito || 0 },
        { codigo: 'GO200030', descricao: this.codigosE115['GO200030'].descricao, valor: values.estornoCredito || 0 },
        { codigo: 'GO200031', descricao: this.codigosE115['GO200031'].descricao, valor: values.icmsStIncentivadas || 0 },
        { codigo: 'GO200032', descricao: this.codigosE115['GO200032'].descricao, valor: values.icmsStNaoIncentivadas || 0 },
        { codigo: 'GO200033', descricao: this.codigosE115['GO200033'].descricao, valor: values.icmsStTotal || 0 },
        { codigo: 'GO200034', descricao: this.codigosE115['GO200034'].descricao, valor: values.outrasDeducoes || 0 },
        { codigo: 'GO200035', descricao: this.codigosE115['GO200035'].descricao, valor: values.valorLiquidoRecolher || 0 }
      );

      // Quadro C - Demonstrativo Fiscal (GO200036-GO200054)
      const demonstrativo = values.demonstrativo || {};
      registrosE115.push(
        { codigo: 'GO200036', descricao: this.codigosE115['GO200036'].descricao, valor: demonstrativo.item01 || 0 },
        { codigo: 'GO200037', descricao: this.codigosE115['GO200037'].descricao, valor: demonstrativo.item02 || 0 },
        { codigo: 'GO200038', descricao: this.codigosE115['GO200038'].descricao, valor: demonstrativo.item03 || 0 },
        { codigo: 'GO200039', descricao: this.codigosE115['GO200039'].descricao, valor: demonstrativo.item04 || 0 },
        { codigo: 'GO200040', descricao: this.codigosE115['GO200040'].descricao, valor: demonstrativo.item05 || 0 },
        { codigo: 'GO200041', descricao: this.codigosE115['GO200041'].descricao, valor: demonstrativo.item06 || 0 },
        { codigo: 'GO200042', descricao: this.codigosE115['GO200042'].descricao, valor: demonstrativo.item07 || 0 },
        { codigo: 'GO200043', descricao: this.codigosE115['GO200043'].descricao, valor: demonstrativo.item08 || 0 },
        { codigo: 'GO200044', descricao: this.codigosE115['GO200044'].descricao, valor: demonstrativo.item09 || 0 },
        { codigo: 'GO200045', descricao: this.codigosE115['GO200045'].descricao, valor: demonstrativo.item10 || 0 },
        { codigo: 'GO200046', descricao: this.codigosE115['GO200046'].descricao, valor: demonstrativo.item11 || 0 },
        { codigo: 'GO200047', descricao: this.codigosE115['GO200047'].descricao, valor: demonstrativo.item12 || 0 },
        { codigo: 'GO200048', descricao: this.codigosE115['GO200048'].descricao, valor: demonstrativo.item13 || 0 }
      );

      // Metadata e confronto
      const confronto = values.confronto || {};
      const dataProcessamento = new Date().toLocaleDateString('pt-BR');
      registrosE115.push(
        { codigo: 'GO200049', descricao: this.codigosE115['GO200049'].descricao, valor: confronto.valorSpedDeclarado || 0 },
        { codigo: 'GO200050', descricao: this.codigosE115['GO200050'].descricao, valor: confronto.diferenca || 0 },
        { codigo: 'GO200051', descricao: this.codigosE115['GO200051'].descricao, valor: confronto.status || 'OK' },
        { codigo: 'GO200052', descricao: this.codigosE115['GO200052'].descricao, valor: confronto.observacoes || '' },
        { codigo: 'GO200053', descricao: this.codigosE115['GO200053'].descricao, valor: dataProcessamento },
        { codigo: 'GO200054', descricao: this.codigosE115['GO200054'].descricao, valor: 'FOMENTAR-Refatorado v2.0' }
      );

      this.logger.success(`E115 gerado com sucesso: ${registrosE115.length} registros para ${programType}`);
      
    } catch (error) {
      this.logger.error(`Erro ao gerar E115: ${error.message}`);
      throw error;
    }

    return registrosE115;
  }

  /**
   * Extrai registros E115 existentes do SPED
   * @param {Object} registrosCompletos - Registros SPED completos
   * @returns {Array} Registros E115 do SPED
   */
  extractE115FromSped(registrosCompletos) {
    this.logger.info('Extraindo registros E115 do SPED...');
    
    if (!registrosCompletos || !registrosCompletos.E115) {
      this.logger.warn('SPED não contém registros E115');
      return [];
    }

    const registrosE115Sped = [];
    
    try {
      for (const registro of registrosCompletos.E115) {
        const e115Item = {
          codigo: registro.codInfAdic || registro[2] || '',
          valor: parseFloatSafe(registro.vlInfAdic || registro[3]) || 0,
          descricao: registro.descrComplAj || registro[4] || '',
          origem: 'SPED'
        };
        
        // Filtrar apenas códigos GO200xxx (FOMENTAR/PRODUZIR)
        if (e115Item.codigo.startsWith('GO200')) {
          registrosE115Sped.push(e115Item);
        }
      }
      
      this.logger.info(`Extraídos ${registrosE115Sped.length} registros E115 do SPED`);
      
    } catch (error) {
      this.logger.error(`Erro ao extrair E115 do SPED: ${error.message}`);
    }

    return registrosE115Sped;
  }

  /**
   * Confronta registros E115 calculados vs SPED
   * @param {Array} registrosCalculados - E115 calculados
   * @param {Array} registrosSped - E115 do SPED
   * @returns {Object} Resultado do confronto
   */
  confrontarE115(registrosCalculados, registrosSped) {
    this.logger.info('Confrontando registros E115 calculados vs SPED...');
    
    const confronto = {
      totalCalculados: registrosCalculados.length,
      totalSped: registrosSped.length,
      coincidencias: [],
      divergencias: [],
      ausentes: [],
      extras: [],
      resumo: {
        percentualCoincidencia: 0,
        valorTotalCalculado: 0,
        valorTotalSped: 0,
        diferencaTotal: 0
      }
    };

    try {
      // Criar maps para comparação eficiente
      const mapCalculados = new Map();
      const mapSped = new Map();
      
      registrosCalculados.forEach(reg => {
        mapCalculados.set(reg.codigo, reg);
        confronto.resumo.valorTotalCalculado += parseFloatSafe(reg.valor) || 0;
      });
      
      registrosSped.forEach(reg => {
        mapSped.set(reg.codigo, reg);
        confronto.resumo.valorTotalSped += parseFloatSafe(reg.valor) || 0;
      });

      // Verificar coincidências e divergências
      for (const [codigo, regCalculado] of mapCalculados) {
        const regSped = mapSped.get(codigo);
        
        if (regSped) {
          const valorCalculado = parseFloatSafe(regCalculado.valor) || 0;
          const valorSped = parseFloatSafe(regSped.valor) || 0;
          const diferenca = Math.abs(valorCalculado - valorSped);
          
          if (diferenca < 0.01) { // Tolerância de 1 centavo
            confronto.coincidencias.push({
              codigo,
              descricao: regCalculado.descricao,
              valorCalculado,
              valorSped,
              status: 'COINCIDE'
            });
          } else {
            confronto.divergencias.push({
              codigo,
              descricao: regCalculado.descricao,
              valorCalculado,
              valorSped,
              diferenca,
              percentualDivergencia: valorSped !== 0 ? ((diferenca / valorSped) * 100) : 0,
              status: 'DIVERGE'
            });
          }
        } else {
          confronto.ausentes.push({
            codigo,
            descricao: regCalculado.descricao,
            valorCalculado: parseFloatSafe(regCalculado.valor) || 0,
            status: 'AUSENTE_NO_SPED'
          });
        }
      }

      // Verificar registros extras no SPED
      for (const [codigo, regSped] of mapSped) {
        if (!mapCalculados.has(codigo)) {
          confronto.extras.push({
            codigo,
            descricao: regSped.descricao,
            valorSped: parseFloatSafe(regSped.valor) || 0,
            status: 'EXTRA_NO_SPED'
          });
        }
      }

      // Calcular estatísticas
      confronto.resumo.diferencaTotal = Math.abs(confronto.resumo.valorTotalCalculado - confronto.resumo.valorTotalSped);
      confronto.resumo.percentualCoincidencia = 
        confronto.totalCalculados > 0 ? 
        ((confronto.coincidencias.length / confronto.totalCalculados) * 100) : 0;

      this.logger.info(`Confronto E115 concluído: ${confronto.coincidencias.length} coincidências, ${confronto.divergencias.length} divergências`);
      
    } catch (error) {
      this.logger.error(`Erro no confronto E115: ${error.message}`);
    }

    return confronto;
  }

  /**
   * Gera texto no formato SPED para registros E115
   * @param {Array} registrosE115 - Registros E115
   * @returns {string} Texto no formato SPED
   */
  generateE115SpedText(registrosE115) {
    this.logger.info('Gerando texto SPED para registros E115...');
    
    if (!registrosE115 || registrosE115.length === 0) {
      return '';
    }

    let spedText = '';
    
    try {
      for (const registro of registrosE115) {
        const valor = parseFloatSafe(registro.valor) || 0;
        const valorFormatado = valor.toFixed(2).replace('.', ',');
        const descricao = (registro.descricao || '').substring(0, 1000); // Limitar descrição
        
        spedText += `|E115|${registro.codigo}|${valorFormatado}|${descricao}|\n`;
      }
      
      this.logger.info(`Texto SPED gerado para ${registrosE115.length} registros E115`);
      
    } catch (error) {
      this.logger.error(`Erro ao gerar texto SPED E115: ${error.message}`);
    }

    return spedText;
  }

  /**
   * Exporta registros E115 para Excel
   * @param {Array} registrosE115 - Registros E115
   * @param {Object} headerInfo - Informações do header
   * @param {string} programType - Tipo do programa
   */
  async exportRegistroE115(registrosE115, headerInfo = {}, programType = 'FOMENTAR') {
    this.logger.info('Exportando registros E115 para Excel...');
    
    try {
      const workbook = await XlsxPopulate.fromBlankAsync();
      const worksheet = workbook.sheet(0);
      
      // Configurar cabeçalho
      worksheet.name(`E115_${programType}`);
      worksheet.cell('A1').value('REGISTRO E115 - DEMONSTRATIVO FISCAL').style({
        bold: true,
        fontSize: 14,
        horizontalAlignment: 'center'
      });
      
      // Informações da empresa
      worksheet.cell('A3').value(`Empresa: ${headerInfo.nomeEmpresa || 'N/A'}`);
      worksheet.cell('A4').value(`CNPJ: ${headerInfo.cnpj || 'N/A'}`);
      worksheet.cell('A5').value(`Período: ${headerInfo.periodo || 'N/A'}`);
      worksheet.cell('A6').value(`Programa: ${programType}`);
      
      // Cabeçalho da tabela
      const headers = ['Código', 'Descrição', 'Valor', 'Valor Formatado'];
      headers.forEach((header, index) => {
        worksheet.cell(8, index + 1).value(header).style({
          bold: true,
          fill: 'CCCCCC',
          border: true
        });
      });
      
      // Dados
      registrosE115.forEach((registro, index) => {
        const row = index + 9;
        const valor = parseFloatSafe(registro.valor) || 0;
        
        worksheet.cell(row, 1).value(registro.codigo);
        worksheet.cell(row, 2).value(registro.descricao);
        worksheet.cell(row, 3).value(valor);
        worksheet.cell(row, 4).value(formatCurrency(valor));
        
        // Aplicar bordas
        for (let col = 1; col <= 4; col++) {
          worksheet.cell(row, col).style({ border: true });
        }
      });
      
      // Ajustar larguras das colunas
      worksheet.column('A').width(15);
      worksheet.column('B').width(60);
      worksheet.column('C').width(15);
      worksheet.column('D').width(20);
      
      // Gerar e baixar arquivo
      const filename = `E115_${programType}_${headerInfo.periodo || 'periodo'}.xlsx`;
      const data = await workbook.outputAsync();
      downloadBlob(data, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      this.logger.success(`Registros E115 exportados: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Erro ao exportar E115: ${error.message}`);
      throw error;
    }
  }

  /**
   * Exporta confronto E115 para Excel
   * @param {Object} confrontoData - Dados do confronto
   * @param {Object} headerInfo - Informações do header
   */
  async exportConfrontoE115Excel(confrontoData, headerInfo = {}) {
    this.logger.info('Exportando confronto E115 para Excel...');
    
    try {
      const workbook = await XlsxPopulate.fromBlankAsync();
      
      // Aba de resumo
      const resumoSheet = workbook.sheet(0);
      resumoSheet.name('Resumo');
      this.createResumoSheet(resumoSheet, confrontoData, headerInfo);
      
      // Aba de coincidências
      if (confrontoData.coincidencias.length > 0) {
        const coincidenciasSheet = workbook.addSheet('Coincidências');
        this.createDetalhamentoSheet(coincidenciasSheet, confrontoData.coincidencias, 'Registros que Coincidem');
      }
      
      // Aba de divergências
      if (confrontoData.divergencias.length > 0) {
        const divergenciasSheet = workbook.addSheet('Divergências');
        this.createDetalhamentoSheet(divergenciasSheet, confrontoData.divergencias, 'Registros com Divergências');
      }
      
      // Aba de ausentes
      if (confrontoData.ausentes.length > 0) {
        const ausentesSheet = workbook.addSheet('Ausentes');
        this.createDetalhamentoSheet(ausentesSheet, confrontoData.ausentes, 'Registros Ausentes no SPED');
      }
      
      // Gerar arquivo
      const filename = `Confronto_E115_${headerInfo.periodo || 'periodo'}.xlsx`;
      const data = await workbook.outputAsync();
      downloadBlob(data, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      this.logger.success(`Confronto E115 exportado: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Erro ao exportar confronto E115: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria planilha de resumo do confronto
   * @param {Object} sheet - Planilha
   * @param {Object} confrontoData - Dados do confronto
   * @param {Object} headerInfo - Informações do header
   */
  createResumoSheet(sheet, confrontoData, headerInfo) {
    // Título
    sheet.cell('A1').value('CONFRONTO E115 - RESUMO EXECUTIVO').style({
      bold: true,
      fontSize: 16,
      horizontalAlignment: 'center'
    });
    
    // Informações gerais
    sheet.cell('A3').value(`Empresa: ${headerInfo.nomeEmpresa || 'N/A'}`);
    sheet.cell('A4').value(`Período: ${headerInfo.periodo || 'N/A'}`);
    sheet.cell('A5').value(`Data do Confronto: ${new Date().toLocaleDateString('pt-BR')}`);
    
    // Estatísticas
    sheet.cell('A7').value('ESTATÍSTICAS').style({ bold: true });
    sheet.cell('A8').value('Total de Registros Calculados:');
    sheet.cell('B8').value(confrontoData.totalCalculados);
    
    sheet.cell('A9').value('Total de Registros no SPED:');
    sheet.cell('B9').value(confrontoData.totalSped);
    
    sheet.cell('A10').value('Coincidências:');
    sheet.cell('B10').value(confrontoData.coincidencias.length);
    
    sheet.cell('A11').value('Divergências:');
    sheet.cell('B11').value(confrontoData.divergencias.length);
    
    sheet.cell('A12').value('Ausentes no SPED:');
    sheet.cell('B12').value(confrontoData.ausentes.length);
    
    sheet.cell('A13').value('Extras no SPED:');
    sheet.cell('B13').value(confrontoData.extras.length);
    
    sheet.cell('A14').value('% de Coincidência:');
    sheet.cell('B14').value(`${confrontoData.resumo.percentualCoincidencia.toFixed(2)}%`);
    
    // Valores totais
    sheet.cell('A16').value('VALORES TOTAIS').style({ bold: true });
    sheet.cell('A17').value('Total Calculado:');
    sheet.cell('B17').value(formatCurrency(confrontoData.resumo.valorTotalCalculado));
    
    sheet.cell('A18').value('Total SPED:');
    sheet.cell('B18').value(formatCurrency(confrontoData.resumo.valorTotalSped));
    
    sheet.cell('A19').value('Diferença:');
    sheet.cell('B19').value(formatCurrency(confrontoData.resumo.diferencaTotal));
    
    // Ajustar colunas
    sheet.column('A').width(30);
    sheet.column('B').width(25);
  }

  /**
   * Cria planilha de detalhamento
   * @param {Object} sheet - Planilha
   * @param {Array} dados - Dados para detalhar
   * @param {string} titulo - Título da planilha
   */
  createDetalhamentoSheet(sheet, dados, titulo) {
    sheet.cell('A1').value(titulo).style({
      bold: true,
      fontSize: 14,
      horizontalAlignment: 'center'
    });
    
    const headers = ['Código', 'Descrição', 'Valor Calculado', 'Valor SPED', 'Diferença', 'Status'];
    headers.forEach((header, index) => {
      sheet.cell(3, index + 1).value(header).style({
        bold: true,
        fill: 'CCCCCC',
        border: true
      });
    });
    
    dados.forEach((item, index) => {
      const row = index + 4;
      sheet.cell(row, 1).value(item.codigo);
      sheet.cell(row, 2).value(item.descricao);
      sheet.cell(row, 3).value(formatCurrency(item.valorCalculado || 0));
      sheet.cell(row, 4).value(formatCurrency(item.valorSped || 0));
      sheet.cell(row, 5).value(formatCurrency(item.diferenca || 0));
      sheet.cell(row, 6).value(item.status);
      
      // Aplicar bordas e cores
      for (let col = 1; col <= 6; col++) {
        const cellStyle = { border: true };
        
        if (item.status === 'DIVERGE') {
          cellStyle.fill = 'FFE6E6'; // Vermelho claro
        } else if (item.status === 'COINCIDE') {
          cellStyle.fill = 'E6FFE6'; // Verde claro
        }
        
        sheet.cell(row, col).style(cellStyle);
      }
    });
    
    // Ajustar colunas
    sheet.column('A').width(15);
    sheet.column('B').width(50);
    sheet.column('C').width(20);
    sheet.column('D').width(20);
    sheet.column('E').width(20);
    sheet.column('F').width(20);
  }

  /**
   * Obtém percentual do programa
   * @param {string} programType - Tipo do programa
   * @returns {number} Percentual
   */
  getPercentualPrograma(programType) {
    const percentuais = {
      'FOMENTAR': 70,
      'PRODUZIR': 73,
      'MICROPRODUZIR': 90
    };
    
    return percentuais[programType] || 70;
  }

  /**
   * Valida estrutura dos dados de cálculo
   * @param {Object} dadosCalculo - Dados para validar
   * @returns {boolean} True se válido
   */
  validateCalculationData(dadosCalculo) {
    if (!dadosCalculo) {
      this.logger.error('Dados de cálculo não fornecidos');
      return false;
    }
    
    if (!dadosCalculo.calculatedValues) {
      this.logger.error('Valores calculados não encontrados');
      return false;
    }
    
    const requiredFields = [
      'debitoIncentivadas',
      'creditoIncentivadas',
      'icmsBaseFomentar',
      'icmsFinanciado'
    ];
    
    for (const field of requiredFields) {
      if (dadosCalculo.calculatedValues[field] === undefined) {
        this.logger.warn(`Campo obrigatório ausente: ${field}`);
      }
    }
    
    return true;
  }
}