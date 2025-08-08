import { formatCurrency, formatPercentage, downloadBlob } from '../../core/utils.js';

export class FomentarExporter {
  constructor(logger) {
    this.logger = logger;
  }

  async generateExcel(dados, nomeEmpresa, periodo) {
    try {
      this.logger.info('Iniciando geração do relatório FOMENTAR...');
      
      const workbook = await XlsxPopulate.fromBlankAsync();
      
      // Remover aba padrão
      if (workbook.sheets().length > 0) {
        workbook.deleteSheet(workbook.sheet(0));
      }
      
      // Criar abas principais
      await this.criarAbaDemonstrativo(workbook, dados, nomeEmpresa, periodo);
      await this.criarAbaMemoriaCalculo(workbook, dados);
      await this.criarAbaValidacao(workbook, dados);
      await this.criarAbaE115(workbook, dados);
      
      // Gerar arquivo
      const filename = this.gerarNomeArquivo(nomeEmpresa, periodo, 'FOMENTAR');
      const blob = await workbook.outputAsync();
      
      downloadBlob(blob, filename);
      
      this.logger.success(`Relatório FOMENTAR exportado: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Erro ao exportar FOMENTAR: ${error.message}`);
      throw error;
    }
  }

  async criarAbaDemonstrativo(workbook, dados, nomeEmpresa, periodo) {
    const sheet = workbook.addSheet('Demonstrativo FOMENTAR');
    
    // Configurar estilos
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Cabeçalho
    linha = this.criarCabecalho(sheet, linha, nomeEmpresa, periodo, styles);
    
    // Quadro A - Proporção dos Créditos
    linha = this.criarQuadroA(sheet, linha, dados.quadroA, styles);
    
    // Quadro B - Operações Incentivadas
    linha = this.criarQuadroB(sheet, linha, dados.quadroB, styles);
    
    // Quadro C - Operações Não Incentivadas
    linha = this.criarQuadroC(sheet, linha, dados.quadroC, styles);
    
    // Resumo Final
    linha = this.criarResumoFinal(sheet, linha, dados.resumoFinal, styles);
    
    // Ajustar largura das colunas
    this.ajustarColunas(sheet);
  }

  criarCabecalho(sheet, linha, nomeEmpresa, periodo, styles) {
    // Título principal
    sheet.cell(linha, 1).value('DEMONSTRATIVO FOMENTAR/PRODUZIR/MICROPRODUZIR')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    // Subtitle
    sheet.cell(linha, 1).value('Conforme Instrução Normativa nº 885/07-GSF')
         .style(styles.subtitulo);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    linha++; // Linha em branco
    
    // Informações da empresa
    sheet.cell(linha, 1).value('Empresa:').style(styles.label);
    sheet.cell(linha, 2).value(nomeEmpresa).style(styles.valor);
    linha++;
    
    sheet.cell(linha, 1).value('Período:').style(styles.label);
    sheet.cell(linha, 2).value(periodo).style(styles.valor);
    linha++;
    
    sheet.cell(linha, 1).value('Data de Geração:').style(styles.label);
    sheet.cell(linha, 2).value(new Date().toLocaleDateString('pt-BR')).style(styles.valor);
    linha++;
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarQuadroA(sheet, linha, quadroA, styles) {
    // Cabeçalho do Quadro A
    sheet.cell(linha, 1).value('QUADRO A - PROPORÇÃO DOS CRÉDITOS APROPRIADOS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    // Itens do Quadro A
    const itensQuadroA = [
      ['1. Saídas de Mercadorias em Operações Incentivadas', quadroA.saidasIncentivadas],
      ['2. Total das Saídas do Período', quadroA.totalSaidas],
      ['3. Percentual das Operações Incentivadas [(1÷2)×100]', quadroA.percentualSaidasIncentivadas, '%'],
      ['4. Créditos de Entradas do Período', quadroA.creditosEntradas],
      ['5. Outros Créditos', quadroA.outrosCreditos],
      ['6. Saldo Credor do Período Anterior', quadroA.saldoCredorAnterior],
      ['7. Total de Créditos (4+5+6)', quadroA.totalCreditos],
      ['8. Créditos Atribuíveis às Operações Incentivadas [(7×3)÷100]', quadroA.creditoIncentivadas],
      ['9. Créditos Atribuíveis às Operações Não Incentivadas (7-8)', quadroA.creditoNaoIncentivadas]
    ];
    
    itensQuadroA.forEach(([descricao, valor, formato]) => {
      sheet.cell(linha, 1).value(descricao).style(styles.item);
      
      if (formato === '%') {
        sheet.cell(linha, 3).value(valor / 100).style(styles.percentual);
      } else {
        sheet.cell(linha, 3).value(valor).style(styles.monetario);
      }
      
      linha++;
    });
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarQuadroB(sheet, linha, quadroB, styles) {
    // Cabeçalho do Quadro B
    sheet.cell(linha, 1).value('QUADRO B - OPERAÇÕES INCENTIVADAS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensQuadroB = [
      ['10. Débitos de Operações Incentivadas', quadroB.debitoIncentivadas],
      ['11. Outros Débitos de Operações Incentivadas', quadroB.outrosDebitosIncentivadas],
      ['12. Créditos de Operações Incentivadas (Item 8)', quadroB.creditoOperacoesIncentivadas],
      ['13. Saldo Devedor Bruto das Operações Incentivadas (10+11-12)', quadroB.saldoDevedorIncentivadas],
      ['14. ICMS Por Média', quadroB.icmsPorMedia],
      ['15. Base do FOMENTAR (13-14)', quadroB.icmsBaseFomentar],
      ['16. Percentual de Financiamento', quadroB.percentualFinanciamento, '%'],
      ['17. ICMS Financiado [(15×16)÷100]', quadroB.icmsFinanciado],
      ['18. Parcela Não Financiada (15-17)', quadroB.parcelaNaoFinanciada],
      ['19. Saldo a Pagar da Parcela Não Financiada', quadroB.saldoPagarParcelaNaoFinanciada]
    ];
    
    itensQuadroB.forEach(([descricao, valor, formato]) => {
      sheet.cell(linha, 1).value(descricao).style(styles.item);
      
      if (formato === '%') {
        sheet.cell(linha, 3).value(valor / 100).style(styles.percentual);
      } else {
        sheet.cell(linha, 3).value(valor).style(styles.monetario);
      }
      
      linha++;
    });
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarQuadroC(sheet, linha, quadroC, styles) {
    // Cabeçalho do Quadro C
    sheet.cell(linha, 1).value('QUADRO C - OPERAÇÕES NÃO INCENTIVADAS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensQuadroC = [
      ['20. Débitos de Operações Não Incentivadas', quadroC.debitoNaoIncentivadas],
      ['21. Outros Débitos de Operações Não Incentivadas', quadroC.outrosDebitosNaoIncentivadas],
      ['22. Saldo Devedor das Operações Não Incentivadas (20+21)', quadroC.saldoDevedorNaoIncentivadas],
      ['23. Saldo a Pagar das Operações Não Incentivadas', quadroC.saldoPagarNaoIncentivadas]
    ];
    
    itensQuadroC.forEach(([descricao, valor]) => {
      sheet.cell(linha, 1).value(descricao).style(styles.item);
      sheet.cell(linha, 3).value(valor).style(styles.monetario);
      linha++;
    });
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarResumoFinal(sheet, linha, resumo, styles) {
    // Cabeçalho do Resumo
    sheet.cell(linha, 1).value('RESUMO FINAL')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensResumo = [
      ['Total a Pagar - Operações Incentivadas (Item 19)', resumo.totalIncentivadas],
      ['Total a Pagar - Operações Não Incentivadas (Item 23)', resumo.totalNaoIncentivadas],
      ['TOTAL GERAL A PAGAR', resumo.totalGeralPagar],
      ['VALOR DO FINANCIAMENTO CONCEDIDO (Item 17)', resumo.valorFinanciamento],
      ['ECONOMIA COM O INCENTIVO', resumo.economia]
    ];
    
    itensResumo.forEach(([descricao, valor], index) => {
      const isDestaque = index >= 2; // Destacar últimos 3 itens
      
      sheet.cell(linha, 1).value(descricao)
           .style(isDestaque ? styles.itemDestaque : styles.item);
      sheet.cell(linha, 3).value(valor)
           .style(isDestaque ? styles.monetarioDestaque : styles.monetario);
      linha++;
    });
    
    return linha;
  }

  async criarAbaMemoriaCalculo(workbook, dados) {
    const sheet = workbook.addSheet('Memória de Cálculo');
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Título
    sheet.cell(linha, 1).value('MEMÓRIA DE CÁLCULO DETALHADA')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 6).merged(true);
    linha += 2;
    
    // Operações Detalhadas
    if (dados.memoriaCalculo.operacoesDetalhadas.length > 0) {
      linha = this.adicionarSecaoOperacoes(sheet, linha, dados.memoriaCalculo.operacoesDetalhadas, styles);
    }
    
    // Ajustes E111
    if (dados.memoriaCalculo.ajustesE111.length > 0) {
      linha = this.adicionarSecaoAjustesE111(sheet, linha, dados.memoriaCalculo.ajustesE111, styles);
    }
    
    // Exclusões
    if (dados.memoriaCalculo.exclusoes.length > 0) {
      linha = this.adicionarSecaoExclusoes(sheet, linha, dados.memoriaCalculo.exclusoes, styles);
    }
    
    this.ajustarColunas(sheet);
  }

  adicionarSecaoOperacoes(sheet, linha, operacoes, styles) {
    // Cabeçalho da seção
    sheet.cell(linha, 1).value('OPERAÇÕES CONSOLIDADAS')
         .style(styles.tituloSecao);
    linha++;
    
    // Cabeçalhos da tabela
    const headers = ['Origem', 'CFOP', 'Tipo', 'Incentivada', 'Valor Operação', 'Valor ICMS'];
    headers.forEach((header, index) => {
      sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
    });
    linha++;
    
    // Dados das operações
    operacoes.slice(0, 1000).forEach(op => { // Limitar para evitar arquivos muito grandes
      sheet.cell(linha, 1).value(op.origem).style(styles.dadoTabela);
      sheet.cell(linha, 2).value(op.cfop).style(styles.dadoTabela);
      sheet.cell(linha, 3).value(op.tipoOperacao).style(styles.dadoTabela);
      sheet.cell(linha, 4).value(op.incentivada ? 'SIM' : 'NÃO').style(styles.dadoTabela);
      sheet.cell(linha, 5).value(op.valorOperacao).style(styles.monetarioTabela);
      sheet.cell(linha, 6).value(op.valorIcms).style(styles.monetarioTabela);
      linha++;
    });
    
    linha += 2; // Espaço entre seções
    
    return linha;
  }

  adicionarSecaoAjustesE111(sheet, linha, ajustesE111, styles) {
  // Cabeçalho da seção
  sheet.cell(linha, 1).value('AJUSTES DA APURAÇÃO - E111')
       .style(styles.tituloSecao);
  linha++;

  // Cabeçalhos da tabela
  const headers = ['Código', 'Descrição', 'Tipo', 'Incentivado', 'Valor'];
  headers.forEach((header, index) => {
    sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
  });
  linha++;

  // Dados dos ajustes
  ajustesE111.slice(0, 500).forEach(ajuste => { // Limitar para evitar arquivos muito grandes
    sheet.cell(linha, 1).value(ajuste.codigo).style(styles.dadoTabela);
    sheet.cell(linha, 2).value(ajuste.descricao || '').style(styles.dadoTabela);
    sheet.cell(linha, 3).value(ajuste.tipo).style(styles.dadoTabela);
    sheet.cell(linha, 4).value(ajuste.incentivado ? 'SIM' : 'NÃO').style(styles.dadoTabela);
    sheet.cell(linha, 5).value(ajuste.valor).style(styles.monetarioTabela);
    linha++;
  });

  linha += 2; // Espaço entre seções

  return linha;
  }

  adicionarSecaoExclusoes(sheet, linha, exclusoes, styles) {
  // Cabeçalho da seção
  sheet.cell(linha, 1).value('EXCLUSÕES APLICADAS')
       .style(styles.tituloSecao);
  linha++;

  // Cabeçalhos da tabela
  const headers = ['Origem', 'Código', 'Valor', 'Motivo'];
  headers.forEach((header, index) => {
    sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
  });
  linha++;

  // Dados das exclusões
  exclusoes.forEach(exclusao => {
    sheet.cell(linha, 1).value(exclusao.origem).style(styles.dadoTabela);
    sheet.cell(linha, 2).value(exclusao.codigo).style(styles.dadoTabela);
    sheet.cell(linha, 3).value(exclusao.valor).style(styles.monetarioTabela);
    sheet.cell(linha, 4).value(exclusao.motivo).style(styles.dadoTabela);
    linha++;
  });

  this.ajustarColunas(sheet);

  return linha;
  }

  async criarAbaValidacao(workbook, dados) {
  const sheet = workbook.addSheet('Validação SPED');
  const styles = this.criarEstilos();
  
  let linha = 1;
  
  // Título
  sheet.cell(linha, 1).value('RELATÓRIO DE VALIDAÇÃO SPED')
       .style(styles.titulo);
  sheet.range(linha, 1, linha, 6).merged(true);
  linha += 2;

  // Validação estrutural
  if (dados.memoriaCalculo.validacaoEstrutura) {
    linha = this.adicionarValidacaoEstrutura(sheet, linha, dados.memoriaCalculo.validacaoEstrutura, styles);
  }

  // Consistência de dados
  if (dados.memoriaCalculo.consistenciaDados) {
    linha = this.adicionarConsistenciaDados(sheet, linha, dados.memoriaCalculo.consistenciaDados, styles);
  }

  // Totalizadores
  if (dados.memoriaCalculo.totalizadores) {
    linha = this.adicionarTotalizadores(sheet, linha, dados.memoriaCalculo.totalizadores, styles);
  }

  this.ajustarColunas(sheet);
  }

  adicionarValidacaoEstrutura(sheet, linha, validacao, styles) {
  sheet.cell(linha, 1).value('VALIDAÇÃO ESTRUTURAL DO SPED')
       .style(styles.tituloSecao);
  linha++;

  const items = [
    ['Registro 0000 (Abertura)', validacao.temRegistro0000 ? 'OK' : 'ERRO'],
    ['Registros E110/E111', validacao.temApuracao ? 'OK' : 'AVISO'],
    ['Operações consolidadas', validacao.temOperacoes ? 'OK' : 'ERRO'],
    ['Blocos encontrados', validacao.blocos?.join(', ') || 'N/A']
  ];

  items.forEach(([item, status]) => {
    sheet.cell(linha, 1).value(item).style(styles.label);
    sheet.cell(linha, 2).value(status).style(
      status === 'OK' ? styles.statusOk : 
      status === 'ERRO' ? styles.statusErro : styles.statusAviso
    );
    linha++;
  });

  linha += 2;
  return linha;
  }

  adicionarConsistenciaDados(sheet, linha, consistencia, styles) {
  sheet.cell(linha, 1).value('CONSISTÊNCIA DE DADOS')
       .style(styles.tituloSecao);
  linha++;

  // Cabeçalhos da tabela
  const headers = ['Tipo Registro', 'Qtd. Origem', 'Qtd. Processada', 'Status'];
  headers.forEach((header, index) => {
    sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
  });
  linha++;

  // Dados de consistência
  const tiposRegistros = ['C190', 'C590', 'D190', 'D590', 'E111'];
  tiposRegistros.forEach(tipo => {
    const dados = consistencia[tipo] || { origem: 0, processada: 0 };
    const status = dados.origem === dados.processada ? 'OK' : 'DIVERGENTE';
    
    sheet.cell(linha, 1).value(tipo).style(styles.dadoTabela);
    sheet.cell(linha, 2).value(dados.origem).style(styles.dadoTabela);
    sheet.cell(linha, 3).value(dados.processada).style(styles.dadoTabela);
    sheet.cell(linha, 4).value(status).style(
      status === 'OK' ? styles.statusOk : styles.statusErro
    );
    linha++;
  });

  linha += 2;
  return linha;
  }

  async criarAbaE115(workbook, dados) {
  const sheet = workbook.addSheet('Registro E115');
  const styles = this.criarEstilos();
  
  let linha = 1;
  
  // Título
  sheet.cell(linha, 1).value('REGISTRO E115 - INFORMAÇÕES ADICIONAIS DA APURAÇÃO')
       .style(styles.titulo);
  sheet.range(linha, 1, linha, 5).merged(true);
  linha += 2;

  // Instruções
  sheet.cell(linha, 1).value('Os códigos abaixo devem ser incluídos no registro E115 do SPED:')
       .style(styles.subtitulo);
  linha += 2;

  // Cabeçalhos da tabela E115
  const headers = ['Código', 'Valor', 'Descrição', 'Registro SPED'];
  headers.forEach((header, index) => {
    sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
  });
  linha++;

  // Gerar registros E115
  const registrosE115 = this.gerarRegistrosE115(dados);
  
  registrosE115.forEach(registro => {
    sheet.cell(linha, 1).value(registro.codigo).style(styles.dadoTabela);
    sheet.cell(linha, 2).value(registro.valor).style(styles.monetarioTabela);
    sheet.cell(linha, 3).value(registro.descricao).style(styles.dadoTabela);
    sheet.cell(linha, 4).value(registro.registroSped).style(styles.dadoTabela);
    linha++;
  });

  // Código SPED para cópia
  linha += 2;
  sheet.cell(linha, 1).value('CÓDIGO SPED PARA CÓPIA:')
       .style(styles.tituloSecao);
  linha++;

  const codigoSped = this.gerarCodigoSpedE115(registrosE115);
  sheet.cell(linha, 1).value(codigoSped)
       .style(styles.codigoSped);
  sheet.range(linha, 1, linha, 5).merged(true);

  this.ajustarColunas(sheet);
  }

  gerarRegistrosE115(dados) {
  const registros = [];
  
  // Crédito FOMENTAR/PRODUZIR/MICROPRODUZIR
  if (dados.resumoFinal.valorFinanciamento > 0) {
    const programType = dados.configuracao.programType || 'FOMENTAR';
    let codigo = 'GO040007'; // FOMENTAR padrão
    
    if (programType === 'PRODUZIR') {
      codigo = 'GO040008';
    } else if (programType === 'MICROPRODUZIR') {
      codigo = 'GO040009';
    }
    
    registros.push({
      codigo: codigo,
      valor: dados.resumoFinal.valorFinanciamento,
      descricao: `Crédito outorgado pelo programa ${programType}`,
      registroSped: `|E115|${codigo}|${dados.resumoFinal.valorFinanciamento.toFixed(2)}|Crédito ${programType}|`
    });
  }

  return registros;
  }

  gerarCodigoSpedE115(registros) {
  return registros.map(r => r.registroSped).join('\n');
  }

  criarEstilos() {
  return {
    titulo: {
      bold: true,
      fontSize: 14,
      horizontalAlignment: 'center',
      fill: 'D7E4BC',
      border: true
    },
    subtitulo: {
      bold: true,
      fontSize: 12,
      fill: 'E8F5E8',
      border: true
    },
    tituloQuadro: {
      bold: true,
      fontSize: 12,
      fill: 'FFF2CC',
      border: true,
      horizontalAlignment: 'center'
    },
    tituloSecao: {
      bold: true,
      fontSize: 11,
      fill: 'E1D5E7',
      border: true
    },
    label: {
      bold: true,
      border: true,
      wrapText: true,
      verticalAlignment: 'center'
    },
    valor: {
      border: true,
      horizontalAlignment: 'left'
    },
    item: {
      border: true,
      wrapText: true,
      verticalAlignment: 'top'
    },
    itemDestaque: {
      bold: true,
      border: true,
      fill: 'FFE699',
      wrapText: true
    },
    monetario: {
      numberFormat: '#,##0.00',
      border: true,
      horizontalAlignment: 'right'
    },
    monetarioDestaque: {
      numberFormat: '#,##0.00',
      border: true,
      horizontalAlignment: 'right',
      bold: true,
      fill: 'C6EFCE'
    },
    percentual: {
      numberFormat: '0.00%',
      border: true,
      horizontalAlignment: 'right'
    },
    cabecalhoTabela: {
      bold: true,
      fill: 'B4C6E7',
      border: true,
      horizontalAlignment: 'center',
      wrapText: true
    },
    dadoTabela: {
      border: true,
      verticalAlignment: 'top'
    },
    monetarioTabela: {
      numberFormat: '#,##0.00',
      border: true,
      horizontalAlignment: 'right'
    },
    statusOk: {
      border: true,
      fill: 'C6EFCE',
      fontColor: '006100',
      bold: true
    },
    statusErro: {
      border: true,
      fill: 'FFC7CE',
      fontColor: '9C0006',
      bold: true
    },
    statusAviso: {
      border: true,
      fill: 'FFEB9C',
      fontColor: '9C6500',
      bold: true
    },
    codigoSped: {
      fontFamily: 'Courier New',
      fontSize: 10,
      border: true,
      fill: 'F2F2F2',
      wrapText: true
    }
  };
  }

  ajustarColunas(sheet) {
  // Ajustar largura das colunas automaticamente
  for (let col = 1; col <= 10; col++) {
    try {
      sheet.column(col).width(15);
    } catch (error) {
      // Ignorar erro se coluna não existir
    }
  }
  
  // Ajustes específicos para colunas conhecidas
  try {
    sheet.column(1).width(25); // Descrições
    sheet.column(2).width(20); // Valores
    sheet.column(3).width(18); // Valores secundários
    sheet.column(4).width(15); // Status/Outros
  } catch (error) {
    // Ignorar se colunas não existirem
  }
  }

  gerarNomeArquivo(nomeEmpresa, periodo, tipoRelatorio) {
  const nomeEmpresaLimpo = (nomeEmpresa || 'Empresa')
    .split(' ')[0]
    .replace(/[^a-zA-Z0-9]/g, '');
  
  const periodoLimpo = (periodo || 'Periodo')
    .replace(/\//g, '_');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  
  return `${tipoRelatorio}_${nomeEmpresaLimpo}_${periodoLimpo}_${timestamp}.xlsx`;
  }

  // Função auxiliar para logging personalizado
  log(message, type = 'info') {
  if (this.logger) {
    this.logger.addLog(`[FOMENTAR-EXPORT] ${message}`, type);
  } else {
    console.log(`[FOMENTAR-EXPORT] ${message}`);
  }
}
}

export default FomentarExporter;

