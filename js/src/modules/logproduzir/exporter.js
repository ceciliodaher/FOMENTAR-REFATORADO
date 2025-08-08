import { formatCurrency, downloadBlob } from '../../core/utils.js';

export class LogproduzirExporter {
  constructor(logger) {
    this.logger = logger;
  }

  async generateExcel(dados, nomeEmpresa, periodo) {
    try {
      this.logger.info('Iniciando geração do relatório LogPRODUZIR...');
      
      const workbook = await XlsxPopulate.fromBlankAsync();
      
      // Remover aba padrão
      if (workbook.sheets().length > 0) {
        workbook.deleteSheet(workbook.sheet(0));
      }
      
      // Criar abas principais
      await this.criarAbaDemonstrativo(workbook, dados, nomeEmpresa, periodo);
      await this.criarAbaMemoriaCalculo(workbook, dados);
      await this.criarAbaE115LogProduzir(workbook, dados);
      
      // Gerar arquivo
      const filename = this.gerarNomeArquivo(nomeEmpresa, periodo, 'LOGPRODUZIR');
      const blob = await workbook.outputAsync();
      
      downloadBlob(blob, filename);
      
      this.logger.success(`Relatório LogPRODUZIR exportado: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Erro ao exportar LogPRODUZIR: ${error.message}`);
      throw error;
    }
  }

  async criarAbaDemonstrativo(workbook, dados, nomeEmpresa, periodo) {
    const sheet = workbook.addSheet('Demonstrativo LogPRODUZIR');
    
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Cabeçalho
    linha = this.criarCabecalho(sheet, linha, nomeEmpresa, periodo, styles);
    
    // Dados dos fretes
    linha = this.criarSecaoFretes(sheet, linha, dados, styles);
    
    // Cálculos do ICMS
    linha = this.criarSecaoICMS(sheet, linha, dados, styles);
    
    // Média e incentivo
    linha = this.criarSecaoMediaIncentivo(sheet, linha, dados, styles);
    
    // Crédito outorgado
    linha = this.criarSecaoCreditoOutorgado(sheet, linha, dados, styles);
    
    // Resultado final
    linha = this.criarSecaoResultadoFinal(sheet, linha, dados, styles);
    
    this.ajustarColunas(sheet);
  }

  criarCabecalho(sheet, linha, nomeEmpresa, periodo, styles) {
    // Título principal
    sheet.cell(linha, 1).value('DEMONSTRATIVO LOGPRODUZIR')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    // Subtitle
    sheet.cell(linha, 1).value('Conforme Lei nº 14.244/2002 e Decreto nº 5.835/2003')
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
    
    sheet.cell(linha, 1).value('Categoria:').style(styles.label);
    sheet.cell(linha, 2).value(`${dados.categoria} (${dados.percentualCategoria.toFixed(0)}%)`).style(styles.valor);
    linha++;
    
    sheet.cell(linha, 1).value('Data de Geração:').style(styles.label);
    sheet.cell(linha, 2).value(new Date().toLocaleDateString('pt-BR')).style(styles.valor);
    linha++;
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarSecaoFretes(sheet, linha, dados, styles) {
    // Cabeçalho da seção
    sheet.cell(linha, 1).value('DADOS DOS FRETES')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensFretes = [
      ['Fretes Interestaduais (FI)', dados.fretesInterestaduais],
      ['Frete Total (FT)', dados.freteTotal],
      ['Proporcionalidade (FI/FT)', dados.proporcionalidade, '%']
    ];
    
    itensFretes.forEach(([descricao, valor, formato]) => {
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

  criarSecaoICMS(sheet, linha, dados, styles) {
    // Cabeçalho da seção
    sheet.cell(linha, 1).value('CÁLCULOS DO ICMS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensICMS = [
      ['ICMS sobre FI (12%)', dados.icmsFi],
      ['Créditos de ICMS (CI)', dados.creditos],
      ['Saldo Devedor (SD)', dados.saldoDevedor]
    ];
    
    itensICMS.forEach(([descricao, valor]) => {
      sheet.cell(linha, 1).value(descricao).style(styles.item);
      sheet.cell(linha, 3).value(valor).style(styles.monetario);
      linha++;
    });
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarSecaoMediaIncentivo(sheet, linha, dados, styles) {
    // Cabeçalho da seção
    sheet.cell(linha, 1).value('MÉDIA E INCENTIVO')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensMedia = [
      ['Média Base Histórica', dados.mediaBase],
      ['Índice IGP-DI', dados.igpDi],
      ['Média Corrigida', dados.mediaCorrigida],
      ['Excesso sobre Média (SDC)', dados.excesso]
    ];
    
    itensMedia.forEach(([descricao, valor]) => {
      sheet.cell(linha, 1).value(descricao).style(styles.item);
      sheet.cell(linha, 3).value(valor).style(styles.monetario);
      linha++;
    });
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarSecaoCreditoOutorgado(sheet, linha, dados, styles) {
    // Cabeçalho da seção
    sheet.cell(linha, 1).value('CRÉDITO OUTORGADO')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensCredito = [
      [`Categoria ${dados.categoria} (${dados.percentualCategoria.toFixed(0)}%)`, dados.percentualCategoria, '%'],
      ['Crédito Bruto (COLP)', dados.creditoBruto],
      ['Contribuições Obrigatórias (20%)', dados.contribuicoes],
      ['  - Bolsa Universitária (2%)', dados.detalhesContribuicoes.bolsaUniversitaria],
      ['  - FUNPRODUZIR (3%)', dados.detalhesContribuicoes.funproduzir],
      ['  - PROTEGE GOIÁS (15%)', dados.detalhesContribuicoes.protegeGoias],
      ['Crédito Líquido', dados.creditoLiquido]
    ];
    
    itensCredito.forEach(([descricao, valor, formato]) => {
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

  criarSecaoResultadoFinal(sheet, linha, dados, styles) {
    // Cabeçalho da seção
    sheet.cell(linha, 1).value('RESULTADO FINAL')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensResultado = [
      ['ICMS a Pagar', dados.icmsFinal],
      ['Economia com Incentivo', dados.economia],
      ['Percentual de Economia', dados.percentualEconomia, '%']
    ];
    
    itensResultado.forEach(([descricao, valor, formato], index) => {
      const isDestaque = index >= 1; // Destacar economia
      
      sheet.cell(linha, 1).value(descricao)
           .style(isDestaque ? styles.itemDestaque : styles.item);
      
      if (formato === '%') {
        sheet.cell(linha, 3).value(valor / 100)
             .style(isDestaque ? styles.percentualDestaque : styles.percentual);
      } else {
        sheet.cell(linha, 3).value(valor)
             .style(isDestaque ? styles.monetarioDestaque : styles.monetario);
      }
      
      linha++;
    });
    
    return linha;
  }

  async criarAbaMemoriaCalculo(workbook, dados) {
    const sheet = workbook.addSheet('Memória de Cálculo');
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Título
    sheet.cell(linha, 1).value('MEMÓRIA DE CÁLCULO DETALHADA - LOGPRODUZIR')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 6).merged(true);
    linha += 2;

    // Fórmulas detalhadas
    sheet.cell(linha, 1).value('FÓRMULAS APLICADAS').style(styles.tituloSecao);
    linha += 2;

    const formulas = [
      ['1. Proporcionalidade (FI/FT)', `${dados.fretesInterestaduais} ÷ ${dados.freteTotal} = ${dados.proporcionalidade.toFixed(2)}%`],
      ['2. ICMS sobre FI', `${dados.fretesInterestaduais} × 12% = ${dados.icmsFi}`],
      ['3. Saldo Devedor (SD)', `ICMS FI - CI = ${dados.icmsFi} - ${dados.creditos} = ${dados.saldoDevedor}`],
      ['4. Média Corrigida', `Média Base × IGP-DI = ${dados.mediaBase} × ${dados.igpDi} = ${dados.mediaCorrigida}`],
      ['5. Excesso (SDC)', `Max(0, SD - Média Corrigida) = Max(0, ${dados.saldoDevedor} - ${dados.mediaCorrigida}) = ${dados.excesso}`],
      ['6. Crédito Bruto (COLP)', `SDC × ${dados.percentualCategoria.toFixed(0)}% = ${dados.excesso} × ${dados.percentualCategoria/100} = ${dados.creditoBruto}`],
      ['7. Contribuições', `COLP × 20% = ${dados.creditoBruto} × 0,20 = ${dados.contribuicoes}`],
      ['8. Crédito Líquido', `COLP - Contribuições = ${dados.creditoBruto} - ${dados.contribuicoes} = ${dados.creditoLiquido}`],
      ['9. ICMS Final', `SD - Crédito Líquido = ${dados.saldoDevedor} - ${dados.creditoLiquido} = ${dados.icmsFinal}`]
    ];

    formulas.forEach(([formula, calculo]) => {
      sheet.cell(linha, 1).value(formula).style(styles.itemDestaque);
      sheet.cell(linha, 2).value(calculo);
      linha++;
    });

    // Detalhes dos fretes
    if (dados.detalheFretes && dados.detalheFretes.registrosInterestaduais.length > 0) {
      linha += 2;
      sheet.cell(linha, 1).value('DETALHES DOS FRETES INTERESTADUAIS').style(styles.tituloSecao);
      linha++;
      
      // Cabeçalhos
      sheet.cell(linha, 1).value('CFOP').style(styles.cabecalhoTabela);
      sheet.cell(linha, 2).value('Descrição').style(styles.cabecalhoTabela);
      sheet.cell(linha, 3).value('Valor').style(styles.cabecalhoTabela);
      linha++;

      dados.detalheFretes.registrosInterestaduais.slice(0, 10).forEach(registro => {
        sheet.cell(linha, 1).value(registro.cfop).style(styles.dadoTabela);
        sheet.cell(linha, 2).value(registro.descricao).style(styles.dadoTabela);
        sheet.cell(linha, 3).value(registro.valor).style(styles.monetarioTabela);
        linha++;
      });
    }

    this.ajustarColunas(sheet);
  }

  async criarAbaE115LogProduzir(workbook, dados) {
    const sheet = workbook.addSheet('Registro E115');
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Título
    sheet.cell(linha, 1).value('REGISTRO E115 - LOGPRODUZIR')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 5).merged(true);
    linha += 2;

    if (dados.creditoLiquido > 0) {
      // Cabeçalhos da tabela
      const headers = ['Código', 'Valor', 'Descrição', 'Registro SPED'];
      headers.forEach((header, index) => {
        sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
      });
      linha++;

      // Dados do registro E115
      const registroE115 = {
        codigo: 'GO020003',
        valor: dados.creditoLiquido,
        descricao: `LOGPRODUZIR - Crédito Outorgado Categoria ${dados.categoria}`,
        registroSped: `|E115|GO020003|${dados.creditoLiquido.toFixed(2)}|LOGPRODUZIR - Credito Outorgado Categoria ${dados.categoria}|`
      };

      sheet.cell(linha, 1).value(registroE115.codigo).style(styles.dadoTabela);
      sheet.cell(linha, 2).value(registroE115.valor).style(styles.monetarioTabela);
      sheet.cell(linha, 3).value(registroE115.descricao).style(styles.dadoTabela);
      sheet.cell(linha, 4).value(registroE115.registroSped).style(styles.dadoTabela);
      linha++;

      // Código SPED para cópia
      linha += 2;
      sheet.cell(linha, 1).value('CÓDIGO SPED PARA CÓPIA:')
           .style(styles.tituloSecao);
      linha++;

      sheet.cell(linha, 1).value(registroE115.registroSped)
           .style(styles.codigoSped);
      sheet.range(linha, 1, linha, 5).merged(true);
    } else {
      sheet.cell(linha, 1).value('Nenhum crédito LogPRODUZIR para gerar registro E115')
           .style(styles.item);
    }

    this.ajustarColunas(sheet);
  }

  criarEstilos() {
    return {
      titulo: {
        bold: true,
        fontSize: 14,
        horizontalAlignment: 'center',
        fill: 'FFE6CC',
        border: true
      },
      subtitulo: {
        bold: true,
        fontSize: 12,
        fill: 'FFF2E6',
        border: true
      },
      tituloQuadro: {
        bold: true,
        fontSize: 12,
        fill: 'FFCC99',
        border: true,
        horizontalAlignment: 'center'
      },
      tituloSecao: {
        bold: true,
        fontSize: 11,
        fill: 'E6E6FA',
        border: true
      },
      label: {
        bold: true,
        border: true
      },
      valor: {
        border: true
      },
      item: {
        border: true,
        wrapText: true,
        verticalAlignment: 'top'
      },
      itemDestaque: {
        bold: true,
        border: true,
        fill: 'E6FFE6',
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
        fill: 'E6FFE6'
      },
      percentual: {
        numberFormat: '0.00%',
        border: true,
        horizontalAlignment: 'right'
      },
      percentualDestaque: {
        numberFormat: '0.00%',
        border: true,
        horizontalAlignment: 'right',
        bold: true,
        fill: 'E6FFE6'
      },
      cabecalhoTabela: {
        bold: true,
        fill: 'D4E6F1',
        border: true,
        horizontalAlignment: 'center'
      },
      dadoTabela: {
        border: true
      },
      monetarioTabela: {
        numberFormat: '#,##0.00',
        border: true,
        horizontalAlignment: 'right'
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
    try {
      sheet.column(1).width(35); // Descrições
      sheet.column(2).width(20); // Valores
      sheet.column(3).width(18); // Valores secundários
      sheet.column(4).width(50); // SPED
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
}

export default LogproduzirExporter;

