export class ExcelGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  async createWorkbook() {
    try {
      const workbook = await XlsxPopulate.fromBlankAsync();
      this.logger.info('Novo workbook Excel criado');
      return workbook;
    } catch (error) {
      this.logger.error(`Erro ao criar workbook: ${error.message}`);
      throw error;
    }
  }

  createStandardStyles() {
    return {
      header: {
        bold: true,
        fontSize: 12,
        horizontalAlignment: 'center',
        fill: 'D7E4BC',
        border: true
      },
      title: {
        bold: true,
        fontSize: 14,
        horizontalAlignment: 'center',
        fill: 'E3F2FD',
        border: true
      },
      subtitle: {
        bold: true,
        fontSize: 11,
        fill: 'F0F8E8',
        border: true
      },
      label: {
        bold: true,
        border: true,
        verticalAlignment: 'center'
      },
      value: {
        border: true,
        horizontalAlignment: 'left'
      },
      currency: {
        numberFormat: '#,##0.00',
        border: true,
        horizontalAlignment: 'right'
      },
      percentage: {
        numberFormat: '0.00%',
        border: true,
        horizontalAlignment: 'right'
      },
      date: {
        numberFormat: 'dd/mm/yyyy',
        border: true,
        horizontalAlignment: 'center'
      },
      center: {
        border: true,
        horizontalAlignment: 'center'
      },
      highlight: {
        bold: true,
        fill: 'FFE699',
        border: true
      },
      success: {
        fill: 'C6EFCE',
        fontColor: '006100',
        border: true
      },
      error: {
        fill: 'FFC7CE',
        fontColor: '9C0006',
        border: true
      },
      warning: {
        fill: 'FFEB9C',
        fontColor: '9C6500',
        border: true
      }
    };
  }

  setColumnWidths(worksheet, widths) {
    try {
      widths.forEach((width, index) => {
        if (width > 0) {
          worksheet.column(index + 1).width(width);
        }
      });
    } catch (error) {
      this.logger.warn(`Erro ao definir larguras das colunas: ${error.message}`);
    }
  }

  autoFitColumns(worksheet, maxWidth = 50) {
    try {
      const range = worksheet.usedRange();
      if (!range) return;

      for (let col = 1; col <= range.endCell().columnNumber(); col++) {
        let maxLength = 0;
        
        for (let row = 1; row <= range.endCell().rowNumber(); row++) {
          const cell = worksheet.cell(row, col);
          const value = cell.value();
          
          if (value !== null && value !== undefined) {
            const length = String(value).length;
            maxLength = Math.max(maxLength, length);
          }
        }
        
        const width = Math.min(Math.max(maxLength + 2, 8), maxWidth);
        worksheet.column(col).width(width);
      }
    } catch (error) {
      this.logger.warn(`Erro no auto-fit das colunas: ${error.message}`);
    }
  }

  createTableHeaders(worksheet, startRow, startCol, headers, style) {
    headers.forEach((header, index) => {
      const cell = worksheet.cell(startRow, startCol + index);
      cell.value(header);
      if (style) {
        cell.style(style);
      }
    });
    
    return startRow + 1; // Return next row
  }

  createTableData(worksheet, startRow, startCol, data, columnFormats = []) {
    let currentRow = startRow;
    
    data.forEach(row => {
      row.forEach((value, colIndex) => {
        const cell = worksheet.cell(currentRow, startCol + colIndex);
        cell.value(value);
        
        // Apply format if specified
        const format = columnFormats[colIndex];
        if (format) {
          cell.style(format);
        }
      });
      currentRow++;
    });
    
    return currentRow; // Return next available row
  }

  mergeCells(worksheet, startRow, startCol, endRow, endCol, value, style) {
    try {
      const range = worksheet.range(startRow, startCol, endRow, endCol);
      range.merged(true);
      
      if (value !== undefined) {
        worksheet.cell(startRow, startCol).value(value);
      }
      
      if (style) {
        worksheet.cell(startRow, startCol).style(style);
      }
    } catch (error) {
      this.logger.warn(`Erro ao mesclar células: ${error.message}`);
    }
  }

  addFormula(worksheet, row, col, formula, style) {
    try {
      const cell = worksheet.cell(row, col);
      cell.formula(formula);
      
      if (style) {
        cell.style(style);
      }
    } catch (error) {
      this.logger.warn(`Erro ao adicionar fórmula: ${error.message}`);
    }
  }

  createSummarySection(worksheet, startRow, title, items, styles) {
    let currentRow = startRow;
    
    // Title
    this.mergeCells(worksheet, currentRow, 1, currentRow, 4, title, styles.title);
    currentRow += 2;
    
    // Items
    items.forEach(item => {
      worksheet.cell(currentRow, 1).value(item.label).style(styles.label);
      worksheet.cell(currentRow, 3).value(item.value);
      
      if (item.format === 'currency') {
        worksheet.cell(currentRow, 3).style(styles.currency);
      } else if (item.format === 'percentage') {
        worksheet.cell(currentRow, 3).style(styles.percentage);
      } else {
        worksheet.cell(currentRow, 3).style(styles.value);
      }
      
      currentRow++;
    });
    
    return currentRow + 1; // Return next row with spacing
  }

  async saveWorkbook(workbook, filename) {
    try {
      const blob = await workbook.outputAsync();
      this.downloadBlob(blob, filename);
      this.logger.success(`Arquivo Excel salvo: ${filename}`);
    } catch (error) {
      this.logger.error(`Erro ao salvar workbook: ${error.message}`);
      throw error;
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  formatCurrency(value) {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatPercentage(value) {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 2
    }).format(value / 100);
  }

  createValidationSheet(workbook, validationData) {
    const worksheet = workbook.addSheet('Validação');
    const styles = this.createStandardStyles();
    
    let row = 1;
    
    // Title
    worksheet.cell(row, 1).value('RELATÓRIO DE VALIDAÇÃO').style(styles.title);
    this.mergeCells(worksheet, row, 1, row, 6, undefined, styles.title);
    row += 2;
    
    // Summary
    if (validationData.summary) {
      row = this.createSummarySection(worksheet, row, 'RESUMO DA VALIDAÇÃO', 
        validationData.summary, styles);
    }
    
    // Details
    if (validationData.details && validationData.details.length > 0) {
      worksheet.cell(row, 1).value('DETALHES').style(styles.subtitle);
      row += 2;
      
      // Headers
      const headers = ['Tipo', 'Item', 'Status', 'Observação'];
      row = this.createTableHeaders(worksheet, row, 1, headers, styles.header);
      
      // Data
      const tableData = validationData.details.map(detail => [
        detail.type,
        detail.item,
        detail.status,
        detail.observation || ''
      ]);
      
      const formats = [styles.center, styles.value, styles.center, styles.value];
      this.createTableData(worksheet, row, 1, tableData, formats);
    }
    
    this.autoFitColumns(worksheet);
  }

  createComparisonChart(worksheet, startRow, title, periods, data) {
    // Para implementação futura com gráficos
    // Por enquanto, criar tabela comparativa
    
    let row = startRow;
    
    // Title
    worksheet.cell(row, 1).value(title).style(this.createStandardStyles().title);
    this.mergeCells(worksheet, row, 1, row, periods.length + 1);
    row += 2;
    
    // Headers
    worksheet.cell(row, 1).value('Item').style(this.createStandardStyles().header);
    periods.forEach((period, index) => {
      worksheet.cell(row, index + 2).value(period).style(this.createStandardStyles().header);
    });
    row++;
    
    // Data
    Object.keys(data).forEach(key => {
      worksheet.cell(row, 1).value(key).style(this.createStandardStyles().label);
      data[key].forEach((value, index) => {
        worksheet.cell(row, index + 2).value(value).style(this.createStandardStyles().currency);
      });
      row++;
    });
    
    return row + 1;
  }
}

export default ExcelGenerator;

