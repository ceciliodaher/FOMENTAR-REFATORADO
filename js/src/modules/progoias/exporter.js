import { formatCurrency, formatPercentage, downloadBlob } from '../../core/utils.js';

export class ProgoiasExporter {
  constructor(logger) {
    this.logger = logger;
  }

  async generateExcel(dados, nomeEmpresa, periodo) {
    try {
      this.logger.info('Iniciando geração do relatório ProGoiás...');
      
      const workbook = await XlsxPopulate.fromBlankAsync();
      
      // Remover aba padrão
      if (workbook.sheets().length > 0) {
        workbook.deleteSheet(workbook.sheet(0));
      }
      
      // Criar abas principais
      await this.criarAbaDemonstrativo(workbook, dados, nomeEmpresa, periodo);
      await this.criarAbaMemoriaCalculo(workbook, dados);
      await this.criarAbaE115ProGoias(workbook, dados);
      
      // Gerar arquivo
      const filename = this.gerarNomeArquivo(nomeEmpresa, periodo, 'PROGOIAS');
      const blob = await workbook.outputAsync();
      
      downloadBlob(blob, filename);
      
      this.logger.success(`Relatório ProGoiás exportado: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Erro ao exportar ProGoiás: ${error.message}`);
      throw error;
    }
  }

  async criarAbaDemonstrativo(workbook, dados, nomeEmpresa, periodo) {
    const sheet = workbook.addSheet('Demonstrativo ProGoiás');
    
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Cabeçalho
    linha = this.criarCabecalho(sheet, linha, nomeEmpresa, periodo, styles);
    
    // Quadro A - Cálculo do ProGoiás
    linha = this.criarQuadroAProGoias(sheet, linha, dados.quadroA, styles);
    
    // Quadro B - Apuração do ICMS
    linha = this.criarQuadroBProGoias(sheet, linha, dados.quadroB, styles);
    
    // Resumo Final
    linha = this.criarResumoFinalProGoias(sheet, linha, dados, styles);
    
    this.ajustarColunas(sheet);
  }

  criarCabecalho(sheet, linha, nomeEmpresa, periodo, styles) {
    // Título principal
    sheet.cell(linha, 1).value('DEMONSTRATIVO PROGOIÁS')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    // Subtitle
    sheet.cell(linha, 1).value('Conforme Instrução Normativa nº 1478/2020')
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
    
    sheet.cell(linha, 1).value('Ano de Fruição:').style(styles.label);
    sheet.cell(linha, 2).value(`${dados.configuracao.anoFruicao || 1}º ano`).style(styles.valor);
    linha++;
    
    sheet.cell(linha, 1).value('Data de Geração:').style(styles.label);
    sheet.cell(linha, 2).value(new Date().toLocaleDateString('pt-BR')).style(styles.valor);
    linha++;
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarQuadroAProGoias(sheet, linha, quadroA, styles) {
    // Cabeçalho do Quadro A
    sheet.cell(linha, 1).value('ABA 1 - CÁLCULO DO PROGOIÁS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensQuadroA = [
      ['GO 100.001 - Percentual ProGoiás (%)', quadroA.GO100001, '%'],
      ['GO 100.002 - ICMS devido por saídas incentivadas', quadroA.GO100002],
      ['GO 100.003 - ICMS por entradas incentivadas', quadroA.GO100003],
      ['GO 100.004 - Outros créditos de operações incentivadas', quadroA.GO100004],
      ['GO 100.005 - Outros débitos de operações incentivadas', quadroA.GO100005],
      ['Base de Cálculo [(GO 100.002 - GO 100.003 - GO 100.004 + GO 100.005)]', quadroA.baseCalculo],
      ['GO 100.009 - Crédito ProGoiás', quadroA.GO100009]
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

  criarQuadroBProGoias(sheet, linha, quadroB, styles) {
    // Cabeçalho do Quadro B
    sheet.cell(linha, 1).value('ABA 2 - APURAÇÃO DO ICMS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensQuadroB = [
      ['01 - Débito do ICMS', quadroB.item01_debitoIcms],
      ['02 - Outros débitos', quadroB.item02_outrosDebitos],
      ['04 - Total de débitos (01+02)', quadroB.item04_totalDebitos],
      ['05 - Crédito do ICMS por entradas', quadroB.item05_creditosEntradas],
      ['06 - Outros créditos do ICMS', quadroB.item06_outrosCreditos],
      ['09 - Crédito outorgado ProGoiás', quadroB.item09_creditoProgoias],
      ['13 - ICMS a recolher antes PROTEGE', quadroB.item13_icmsARecolher],
      ['14 - PROTEGE (15% do crédito ProGoiás)', quadroB.item14_valorProtege],
      ['15 - ICMS final a recolher', quadroB.item15_icmsFinal]
    ];
    
    itensQuadroB.forEach(([descricao, valor]) => {
      sheet.cell(linha, 1).value(descricao).style(styles.item);
      sheet.cell(linha, 3).value(valor).style(styles.monetario);
      linha++;
    });
    
    linha++; // Linha em branco
    
    return linha;
  }

  criarResumoFinalProGoias(sheet, linha, dados, styles) {
    // Cabeçalho do Resumo
    sheet.cell(linha, 1).value('RESUMO DOS BENEFÍCIOS')
         .style(styles.tituloQuadro);
    sheet.range(linha, 1, linha, 4).merged(true);
    linha++;
    
    const itensResumo = [
      ['CRÉDITO PROGOIÁS OUTORGADO', dados.quadroA.GO100009],
      ['ECONOMIA COM PROTEGE', dados.quadroB.item14_valorProtege],
      ['ECONOMIA FISCAL TOTAL', dados.quadroB.economiaTotal],
      ['PERCENTUAL DE ECONOMIA (%)', dados.resultado.economiaTotal > 0 ? 
        (dados.resultado.economiaTotal / dados.quadroB.item04_totalDebitos) * 100 : 0, '%']
    ];
    
    itensResumo.forEach(([descricao, valor, formato], index) => {
      const isDestaque = index >= 2; // Destacar últimos 2 itens
      
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

  async criarAbaE115ProGoias(workbook, dados) {
    const sheet = workbook.addSheet('Registro E115');
    const styles = this.criarEstilos();
    
    let linha = 1;
    
    // Título
    sheet.cell(linha, 1).value('REGISTRO E115 - PROGOIÁS')
         .style(styles.titulo);
    sheet.range(linha, 1, linha, 5).merged(true);
    linha += 2;

    if (dados.registroE115 && dados.registroE115.length > 0) {
      // Cabeçalhos da tabela
      const headers = ['Código', 'Valor', 'Descrição', 'Registro SPED'];
      headers.forEach((header, index) => {
        sheet.cell(linha, index + 1).value(header).style(styles.cabecalhoTabela);
      });
      linha++;

      // Dados do registro E115
      dados.registroE115.forEach(registro => {
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

      const codigoSped = dados.registroE115.map(r => r.registroSped).join('\n');
      sheet.cell(linha, 1).value(codigoSped)
           .style(styles.codigoSped);
      sheet.range(linha, 1, linha, 5).merged(true);
    } else {
      sheet.cell(linha, 1).value('Nenhum crédito ProGoiás para gerar registro E115')
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
        fill: 'E8F5E8',
        border: true
      },
      subtitulo: {
        bold: true,
        fontSize: 12,
        fill: 'F0F8E8',
        border: true
      },
      tituloQuadro: {
        bold: true,
        fontSize: 12,
        fill: 'D5E8D4',
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
        fill: 'C6EFCE',
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
      percentualDestaque: {
        numberFormat: '0.00%',
        border: true,
        horizontalAlignment: 'right',
        bold: true,
        fill: 'C6EFCE'
      },
      cabecalhoTabela: {
        bold: true,
        fill: 'B4C6E7',
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
      sheet.column(1).width(45); // Descrições
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

export default ProgoiasExporter;

