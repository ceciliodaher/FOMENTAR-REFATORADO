import { formatCurrency } from '../core/utils.js';
import { ExcelGenerator } from '../excel/generator.js';

/**
 * Gerador de relatórios avançados - Memória de cálculo, validação, comparativos
 */
export class AdvancedReportGenerator {
    constructor(logger, excelGenerator) {
        this.logger = logger;
        this.excelGenerator = excelGenerator || new ExcelGenerator(logger);
    }

    /**
     * Gera memória de cálculo detalhada para auditoria
     */
    generateMemoriaCalculo(dadosPeriodo, tipoPrograma = 'FOMENTAR') {
        this.logger.info(`Gerando memória de cálculo detalhada - ${tipoPrograma}`);
        
        const memoria = {
            programa: tipoPrograma,
            periodo: dadosPeriodo.periodo || 'N/A',
            empresa: dadosPeriodo.nomeEmpresa || 'Empresa',
            dataGeracao: new Date().toLocaleDateString('pt-BR'),
            secoes: {
                metodologia: this.generateSecaoMetodologia(tipoPrograma),
                cfops: this.generateSecaoCFOPs(dadosPeriodo),
                e111: this.generateSecaoE111(dadosPeriodo),
                calculosQuadros: this.generateSecaoCalculosQuadros(dadosPeriodo, tipoPrograma),
                comparacaoSped: this.generateSecaoComparacaoSped(dadosPeriodo),
                auditoria: this.generateSecaoPontosAuditoria(dadosPeriodo),
                divergencias: this.identifyDivergencias(dadosPeriodo)
            }
        };

        this.logger.success('Memória de cálculo detalhada gerada com sucesso');
        return memoria;
    }

    /**
     * Gera seção de metodologia
     */
    generateSecaoMetodologia(tipoPrograma) {
        const metodologias = {
            'FOMENTAR': {
                titulo: 'Metodologia de Cálculo FOMENTAR',
                descricao: 'Cálculo baseado na Lei Nº 13.591/2000 e regulamentações',
                percentualFinanciamento: '70%',
                formula: 'Financiamento = (Saídas Incentivadas × 70%) - Entradas Incentivadas',
                observacoes: [
                    'Aplicável apenas para operações com CFOPs incentivados',
                    'Débitos especiais são subtraídos do cálculo',
                    'Saldo credor é transportado para o período seguinte'
                ]
            },
            'PROGOIAS': {
                titulo: 'Metodologia de Cálculo ProGoiás',
                descricao: 'Cálculo baseado no Decreto Nº 7.456/2011 e atualizações',
                percentualFinanciamento: 'Variável por ano de fruição',
                formula: 'Crédito = ((ICMS Saídas - ICMS Entradas - Outros Créditos + Outros Débitos) × Percentual)',
                observacoes: [
                    'Percentual decrescente conforme ano de fruição',
                    'PROTEGE incide sobre o crédito outorgado',
                    'Empresas de baixo IDH têm tratamento especial'
                ]
            }
        };

        return metodologias[tipoPrograma] || metodologias['FOMENTAR'];
    }

    /**
     * Gera seção de CFOPs
     */
    generateSecaoCFOPs(dadosPeriodo) {
        const cfopsData = {
            titulo: 'Análise de CFOPs',
            entradasIncentivadas: [],
            saidasIncentivadas: [],
            cfopsGenericos: [],
            resumo: {
                totalEntradas: 0,
                totalSaidas: 0,
                valorEntradas: 0,
                valorSaidas: 0,
                icmsEntradas: 0,
                icmsSaidas: 0
            }
        };

        if (dadosPeriodo.fomentarData || dadosPeriodo.operacoes) {
            const operacoes = dadosPeriodo.fomentarData || dadosPeriodo.operacoes;
            
            // Processar entradas incentivadas
            if (operacoes.entradasIncentivadas) {
                cfopsData.entradasIncentivadas = operacoes.entradasIncentivadas.map(op => ({
                    cfop: op.cfop,
                    valorOperacao: op.valorOperacao,
                    valorIcms: op.valorIcms,
                    cst: op.cst,
                    quantidade: 1
                }));
                
                cfopsData.resumo.totalEntradas = operacoes.entradasIncentivadas.length;
                cfopsData.resumo.valorEntradas = operacoes.entradasIncentivadas.reduce((sum, op) => sum + (op.valorOperacao || 0), 0);
                cfopsData.resumo.icmsEntradas = operacoes.entradasIncentivadas.reduce((sum, op) => sum + (op.valorIcms || 0), 0);
            }

            // Processar saídas incentivadas
            if (operacoes.saidasIncentivadas) {
                cfopsData.saidasIncentivadas = operacoes.saidasIncentivadas.map(op => ({
                    cfop: op.cfop,
                    valorOperacao: op.valorOperacao,
                    valorIcms: op.valorIcms,
                    cst: op.cst,
                    quantidade: 1
                }));
                
                cfopsData.resumo.totalSaidas = operacoes.saidasIncentivadas.length;
                cfopsData.resumo.valorSaidas = operacoes.saidasIncentivadas.reduce((sum, op) => sum + (op.valorOperacao || 0), 0);
                cfopsData.resumo.icmsSaidas = operacoes.saidasIncentivadas.reduce((sum, op) => sum + (op.valorIcms || 0), 0);
            }
        }

        return cfopsData;
    }

    /**
     * Gera seção de códigos E111
     */
    generateSecaoE111(dadosPeriodo) {
        const e111Data = {
            titulo: 'Análise de Códigos E111',
            codigosIncentivados: [],
            codigosNaoIncentivados: [],
            resumo: {
                totalCreditos: 0,
                totalDebitos: 0,
                saldoLiquido: 0
            }
        };

        if (dadosPeriodo.fomentarData && dadosPeriodo.fomentarData.memoriaCalculo) {
            const ajustes = dadosPeriodo.fomentarData.memoriaCalculo.ajustesE111 || [];
            
            ajustes.forEach(ajuste => {
                const codigoData = {
                    codigo: ajuste.codigo,
                    tipo: ajuste.tipo,
                    valor: ajuste.valor,
                    incentivado: ajuste.incentivado,
                    descricao: ajuste.descricao || `Código ${ajuste.codigo}`
                };

                if (ajuste.incentivado) {
                    e111Data.codigosIncentivados.push(codigoData);
                } else {
                    e111Data.codigosNaoIncentivados.push(codigoData);
                }

                if (ajuste.tipo === 'CRÉDITO') {
                    e111Data.resumo.totalCreditos += Math.abs(ajuste.valor);
                } else if (ajuste.tipo === 'DÉBITO') {
                    e111Data.resumo.totalDebitos += Math.abs(ajuste.valor);
                }
            });

            e111Data.resumo.saldoLiquido = e111Data.resumo.totalCreditos - e111Data.resumo.totalDebitos;
        }

        return e111Data;
    }

    /**
     * Gera seção de cálculos dos quadros
     */
    generateSecaoCalculosQuadros(dadosPeriodo, tipoPrograma) {
        const calculosData = {
            titulo: `Quadros de Cálculo - ${tipoPrograma}`,
            quadros: {}
        };

        if (tipoPrograma === 'FOMENTAR') {
            if (dadosPeriodo.calculatedValues) {
                const calc = dadosPeriodo.calculatedValues;
                
                calculosData.quadros = {
                    quadroA: {
                        titulo: 'Quadro A - Operações Incentivadas',
                        itens: [
                            { item: '01', descricao: 'Valor das saídas incentivadas', valor: calc.valorSaidasIncentivadas || 0 },
                            { item: '02', descricao: 'ICMS das saídas incentivadas', valor: calc.icmsSaidasIncentivadas || 0 },
                            { item: '03', descricao: 'Financiamento (70%)', valor: calc.financiamento || 0 },
                            { item: '04', descricao: 'Valor das entradas incentivadas', valor: calc.valorEntradasIncentivadas || 0 },
                            { item: '05', descricao: 'ICMS das entradas incentivadas', valor: calc.icmsEntradasIncentivadas || 0 }
                        ]
                    },
                    quadroB: {
                        titulo: 'Quadro B - Ajustes e Outros Débitos',
                        itens: [
                            { item: '06', descricao: 'Outros créditos', valor: calc.outrosCreditos || 0 },
                            { item: '07', descricao: 'Outros débitos', valor: calc.outrosDebitos || 0 },
                            { item: '08', descricao: 'Débitos especiais', valor: calc.debitosEspeciais || 0 }
                        ]
                    },
                    quadroC: {
                        titulo: 'Quadro C - Resultado Final',
                        itens: [
                            { item: '09', descricao: 'Saldo a financiar', valor: calc.saldoFinanciar || 0 },
                            { item: '10', descricao: 'Saldo credor anterior', valor: calc.saldoCredorAnterior || 0 },
                            { item: '11', descricao: 'Saldo a pagar', valor: calc.saldoPagar || 0 }
                        ]
                    }
                };
            }
        } else if (tipoPrograma === 'PROGOIAS') {
            if (dadosPeriodo.calculatedValues) {
                const calc = dadosPeriodo.calculatedValues;
                
                calculosData.quadros = {
                    baseCalculo: {
                        titulo: 'Base de Cálculo ProGoiás',
                        itens: [
                            { item: '01', descricao: 'ICMS das saídas incentivadas', valor: calc.icmsSaidasIncentivadas || 0 },
                            { item: '02', descricao: 'ICMS das entradas incentivadas', valor: calc.icmsEntradasIncentivadas || 0 },
                            { item: '03', descricao: 'Outros créditos incentivados', valor: calc.outrosCreditosIncentivados || 0 },
                            { item: '04', descricao: 'Outros débitos incentivados', valor: calc.outrosDebitosIncentivados || 0 },
                            { item: '05', descricao: 'Base de cálculo', valor: calc.baseCalculo || 0 }
                        ]
                    },
                    credito: {
                        titulo: 'Crédito ProGoiás',
                        itens: [
                            { item: '06', descricao: 'Percentual ProGoiás', valor: `${calc.percentualProgoias || 0}%`, isPercentual: true },
                            { item: '07', descricao: 'Crédito outorgado', valor: calc.creditoProgoias || 0 },
                            { item: '08', descricao: 'PROTEGE', valor: calc.valorProtege || 0 },
                            { item: '09', descricao: 'Crédito líquido', valor: calc.creditoLiquido || 0 }
                        ]
                    }
                };
            }
        }

        return calculosData;
    }

    /**
     * Gera seção de comparação com SPED
     */
    generateSecaoComparacaoSped(dadosPeriodo) {
        const comparacaoData = {
            titulo: 'Comparação com SPED',
            registrosE115: [],
            divergencias: [],
            consistencia: 'OK'
        };

        if (dadosPeriodo.spedValidation) {
            // Processar registros E115 do SPED
            if (dadosPeriodo.spedValidation.registrosE115) {
                comparacaoData.registrosE115 = dadosPeriodo.spedValidation.registrosE115.map(reg => ({
                    codigo: reg.codigo,
                    valor: reg.valor,
                    origem: 'SPED'
                }));
            }

            // Comparar com valores calculados
            if (dadosPeriodo.calculatedValues && dadosPeriodo.calculatedValues.registrosE115) {
                const calculados = dadosPeriodo.calculatedValues.registrosE115;
                
                calculados.forEach(calc => {
                    const spedEquivalente = comparacaoData.registrosE115.find(s => s.codigo === calc.codigo);
                    
                    if (!spedEquivalente) {
                        comparacaoData.divergencias.push({
                            tipo: 'AUSENTE_SPED',
                            codigo: calc.codigo,
                            valorCalculado: calc.valor,
                            valorSped: 0,
                            diferenca: calc.valor
                        });
                    } else if (Math.abs(calc.valor - spedEquivalente.valor) > 0.01) {
                        comparacaoData.divergencias.push({
                            tipo: 'VALOR_DIVERGENTE',
                            codigo: calc.codigo,
                            valorCalculado: calc.valor,
                            valorSped: spedEquivalente.valor,
                            diferenca: calc.valor - spedEquivalente.valor
                        });
                    }
                });
            }

            comparacaoData.consistencia = comparacaoData.divergencias.length === 0 ? 'OK' : 'DIVERGENTE';
        }

        return comparacaoData;
    }

    /**
     * Gera seção de pontos de auditoria
     */
    generateSecaoPontosAuditoria(dadosPeriodo) {
        const auditoriaData = {
            titulo: 'Pontos de Auditoria',
            alertas: [],
            verificacoes: [],
            recomendacoes: []
        };

        // Verificações automáticas
        if (dadosPeriodo.calculatedValues) {
            const calc = dadosPeriodo.calculatedValues;

            // Alerta: Valores muito altos
            if (calc.financiamento && calc.financiamento > 1000000) {
                auditoriaData.alertas.push({
                    tipo: 'VALOR_ALTO',
                    descricao: 'Financiamento acima de R$ 1.000.000,00',
                    valor: calc.financiamento,
                    recomendacao: 'Verificar se todas as operações são realmente incentivadas'
                });
            }

            // Alerta: Saldo credor muito alto
            if (calc.saldoCredorAnterior && calc.saldoCredorAnterior > 500000) {
                auditoriaData.alertas.push({
                    tipo: 'SALDO_CREDOR_ALTO',
                    descricao: 'Saldo credor anterior alto',
                    valor: calc.saldoCredorAnterior,
                    recomendacao: 'Verificar origem do saldo credor'
                });
            }

            // Verificação: Operações sem ICMS
            if (calc.valorSaidasIncentivadas && calc.icmsSaidasIncentivadas === 0) {
                auditoriaData.verificacoes.push({
                    tipo: 'ICMS_ZERO',
                    descricao: 'Operações de saída sem ICMS',
                    recomendacao: 'Verificar se CSTs estão corretos'
                });
            }
        }

        // Verificações de CFOPs genéricos
        if (dadosPeriodo.cfopsGenericos && dadosPeriodo.cfopsGenericos.length > 0) {
            auditoriaData.verificacoes.push({
                tipo: 'CFOPS_GENERICOS',
                descricao: `${dadosPeriodo.cfopsGenericos.length} CFOPs genéricos encontrados`,
                recomendacao: 'Verificar classificação correta dos CFOPs genéricos'
            });
        }

        return auditoriaData;
    }

    /**
     * Identifica divergências
     */
    identifyDivergencias(dadosPeriodo) {
        const divergenciasData = {
            titulo: 'Análise de Divergências',
            divergencias: [],
            status: 'OK'
        };

        // Comparar valores calculados vs SPED
        if (dadosPeriodo.calculatedValues && dadosPeriodo.spedValidation) {
            const calc = dadosPeriodo.calculatedValues;
            const sped = dadosPeriodo.spedValidation;

            // Exemplo de verificações
            if (calc.totalIcmsCalculado && sped.totalIcmsSped) {
                const diferenca = Math.abs(calc.totalIcmsCalculado - sped.totalIcmsSped);
                if (diferenca > 0.01) {
                    divergenciasData.divergencias.push({
                        campo: 'Total ICMS',
                        valorCalculado: calc.totalIcmsCalculado,
                        valorSped: sped.totalIcmsSped,
                        diferenca: diferenca,
                        percentual: (diferenca / sped.totalIcmsSped) * 100
                    });
                }
            }
        }

        divergenciasData.status = divergenciasData.divergencias.length === 0 ? 'OK' : 'DIVERGENTE';
        return divergenciasData;
    }

    /**
     * Exporta memória de cálculo para Excel
     */
    async exportMemoriaCalculoExcel(memoriaCalculo, nomeArquivo) {
        try {
            this.logger.info('Exportando memória de cálculo para Excel...');
            
            // Criar workbook
            const workbook = await this.excelGenerator.createWorkbook();
            
            // Adicionar planilhas
            await this.addMetodologiaSheet(workbook, memoriaCalculo.secoes.metodologia);
            await this.addCFOPsSheet(workbook, memoriaCalculo.secoes.cfops);
            await this.addE111Sheet(workbook, memoriaCalculo.secoes.e111);
            await this.addCalculosSheet(workbook, memoriaCalculo.secoes.calculosQuadros);
            await this.addAuditoriaSheet(workbook, memoriaCalculo.secoes.auditoria);
            
            // Salvar arquivo
            const fileName = nomeArquivo || `memoria-calculo-${memoriaCalculo.programa}-${memoriaCalculo.periodo}.xlsx`;
            await this.excelGenerator.saveWorkbook(workbook, fileName);
            
            this.logger.success(`Memória de cálculo exportada: ${fileName}`);
            return fileName;
            
        } catch (error) {
            this.logger.error(`Erro ao exportar memória de cálculo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Adiciona planilha de metodologia
     */
    async addMetodologiaSheet(workbook, metodologia) {
        const sheet = workbook.addSheet('Metodologia');
        
        let row = 1;
        
        // Título
        sheet.cell(row, 1).value(metodologia.titulo).style({ font: { bold: true, size: 16 } });
        row += 2;
        
        // Descrição
        sheet.cell(row, 1).value('Descrição:').style({ font: { bold: true } });
        sheet.cell(row, 2).value(metodologia.descricao);
        row++;
        
        // Percentual
        sheet.cell(row, 1).value('Percentual de Financiamento:').style({ font: { bold: true } });
        sheet.cell(row, 2).value(metodologia.percentualFinanciamento);
        row++;
        
        // Fórmula
        sheet.cell(row, 1).value('Fórmula:').style({ font: { bold: true } });
        sheet.cell(row, 2).value(metodologia.formula);
        row += 2;
        
        // Observações
        sheet.cell(row, 1).value('Observações:').style({ font: { bold: true } });
        row++;
        
        metodologia.observacoes.forEach(obs => {
            sheet.cell(row, 2).value(`• ${obs}`);
            row++;
        });
        
        // Ajustar colunas
        sheet.column(1).width(25);
        sheet.column(2).width(60);
    }

    /**
     * Adiciona planilha de CFOPs
     */
    async addCFOPsSheet(workbook, cfopsData) {
        const sheet = workbook.addSheet('CFOPs');
        
        let row = 1;
        
        // Título
        sheet.cell(row, 1).value(cfopsData.titulo).style({ font: { bold: true, size: 16 } });
        row += 2;
        
        // Resumo
        sheet.cell(row, 1).value('RESUMO').style({ font: { bold: true, size: 14 } });
        row++;
        
        const resumoHeaders = ['Descrição', 'Quantidade', 'Valor Operações', 'Valor ICMS'];
        resumoHeaders.forEach((header, index) => {
            sheet.cell(row, index + 1).value(header).style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
        });
        row++;
        
        // Dados do resumo
        const resumoData = [
            ['Entradas Incentivadas', cfopsData.resumo.totalEntradas, cfopsData.resumo.valorEntradas, cfopsData.resumo.icmsEntradas],
            ['Saídas Incentivadas', cfopsData.resumo.totalSaidas, cfopsData.resumo.valorSaidas, cfopsData.resumo.icmsSaidas]
        ];
        
        resumoData.forEach(rowData => {
            rowData.forEach((value, index) => {
                if (index === 0) {
                    sheet.cell(row, index + 1).value(value);
                } else if (index === 1) {
                    sheet.cell(row, index + 1).value(value);
                } else {
                    sheet.cell(row, index + 1).value(value).style({ numberFormat: 'R$ #,##0.00' });
                }
            });
            row++;
        });
        
        // Ajustar colunas
        sheet.column(1).width(25);
        sheet.column(2).width(15);
        sheet.column(3).width(20);
        sheet.column(4).width(20);
    }

    /**
     * Adiciona planilha de códigos E111
     */
    async addE111Sheet(workbook, e111Data) {
        const sheet = workbook.addSheet('Códigos E111');
        
        let row = 1;
        
        // Título
        sheet.cell(row, 1).value(e111Data.titulo).style({ font: { bold: true, size: 16 } });
        row += 2;
        
        // Headers
        const headers = ['Código', 'Tipo', 'Incentivado', 'Valor', 'Descrição'];
        headers.forEach((header, index) => {
            sheet.cell(row, index + 1).value(header).style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
        });
        row++;
        
        // Códigos incentivados
        e111Data.codigosIncentivados.forEach(codigo => {
            sheet.cell(row, 1).value(codigo.codigo);
            sheet.cell(row, 2).value(codigo.tipo);
            sheet.cell(row, 3).value('Sim');
            sheet.cell(row, 4).value(codigo.valor).style({ numberFormat: 'R$ #,##0.00' });
            sheet.cell(row, 5).value(codigo.descricao);
            row++;
        });
        
        // Códigos não incentivados
        e111Data.codigosNaoIncentivados.forEach(codigo => {
            sheet.cell(row, 1).value(codigo.codigo);
            sheet.cell(row, 2).value(codigo.tipo);
            sheet.cell(row, 3).value('Não');
            sheet.cell(row, 4).value(codigo.valor).style({ numberFormat: 'R$ #,##0.00' });
            sheet.cell(row, 5).value(codigo.descricao);
            row++;
        });
        
        // Ajustar colunas
        sheet.column(1).width(12);
        sheet.column(2).width(15);
        sheet.column(3).width(12);
        sheet.column(4).width(15);
        sheet.column(5).width(40);
    }

    /**
     * Adiciona planilha de cálculos
     */
    async addCalculosSheet(workbook, calculosData) {
        const sheet = workbook.addSheet('Cálculos');
        
        let row = 1;
        
        // Título
        sheet.cell(row, 1).value(calculosData.titulo).style({ font: { bold: true, size: 16 } });
        row += 2;
        
        // Processar cada quadro
        Object.entries(calculosData.quadros).forEach(([quadroNome, quadro]) => {
            // Título do quadro
            sheet.cell(row, 1).value(quadro.titulo).style({ font: { bold: true, size: 14 } });
            row++;
            
            // Headers
            sheet.cell(row, 1).value('Item').style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
            sheet.cell(row, 2).value('Descrição').style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
            sheet.cell(row, 3).value('Valor').style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
            row++;
            
            // Itens do quadro
            quadro.itens.forEach(item => {
                sheet.cell(row, 1).value(item.item);
                sheet.cell(row, 2).value(item.descricao);
                if (item.isPercentual) {
                    sheet.cell(row, 3).value(item.valor);
                } else {
                    sheet.cell(row, 3).value(item.valor).style({ numberFormat: 'R$ #,##0.00' });
                }
                row++;
            });
            
            row++; // Espaço entre quadros
        });
        
        // Ajustar colunas
        sheet.column(1).width(8);
        sheet.column(2).width(40);
        sheet.column(3).width(20);
    }

    /**
     * Adiciona planilha de auditoria
     */
    async addAuditoriaSheet(workbook, auditoriaData) {
        const sheet = workbook.addSheet('Auditoria');
        
        let row = 1;
        
        // Título
        sheet.cell(row, 1).value(auditoriaData.titulo).style({ font: { bold: true, size: 16 } });
        row += 2;
        
        // Alertas
        if (auditoriaData.alertas.length > 0) {
            sheet.cell(row, 1).value('ALERTAS').style({ font: { bold: true, size: 14 }, fill: { color: 'FFCCCC' } });
            row++;
            
            auditoriaData.alertas.forEach(alerta => {
                sheet.cell(row, 1).value(alerta.tipo);
                sheet.cell(row, 2).value(alerta.descricao);
                if (alerta.valor) {
                    sheet.cell(row, 3).value(alerta.valor).style({ numberFormat: 'R$ #,##0.00' });
                }
                sheet.cell(row, 4).value(alerta.recomendacao);
                row++;
            });
            
            row++;
        }
        
        // Verificações
        if (auditoriaData.verificacoes.length > 0) {
            sheet.cell(row, 1).value('VERIFICAÇÕES').style({ font: { bold: true, size: 14 }, fill: { color: 'FFFFCC' } });
            row++;
            
            auditoriaData.verificacoes.forEach(verificacao => {
                sheet.cell(row, 1).value(verificacao.tipo);
                sheet.cell(row, 2).value(verificacao.descricao);
                sheet.cell(row, 4).value(verificacao.recomendacao);
                row++;
            });
        }
        
        // Ajustar colunas
        sheet.column(1).width(20);
        sheet.column(2).width(40);
        sheet.column(3).width(15);
        sheet.column(4).width(50);
    }

    /**
     * Gera relatório de validação Excel
     */
    async exportValidationExcel(dadosValidacao, nomeArquivo) {
        try {
            this.logger.info('Exportando relatório de validação para Excel...');
            
            const workbook = await this.excelGenerator.createWorkbook();
            const sheet = workbook.addSheet('Validação');
            
            let row = 1;
            
            // Título
            sheet.cell(row, 1).value('Relatório de Validação').style({ font: { bold: true, size: 16 } });
            row += 2;
            
            // Informações gerais
            sheet.cell(row, 1).value('Empresa:').style({ font: { bold: true } });
            sheet.cell(row, 2).value(dadosValidacao.empresa || 'N/A');
            row++;
            
            sheet.cell(row, 1).value('Período:').style({ font: { bold: true } });
            sheet.cell(row, 2).value(dadosValidacao.periodo || 'N/A');
            row++;
            
            sheet.cell(row, 1).value('Data Geração:').style({ font: { bold: true } });
            sheet.cell(row, 2).value(new Date().toLocaleDateString('pt-BR'));
            row += 2;
            
            // Resultados da validação
            if (dadosValidacao.items) {
                // Headers
                const headers = ['Item', 'Descrição', 'Calculado', 'SPED', 'Diferença', 'Status'];
                headers.forEach((header, index) => {
                    sheet.cell(row, index + 1).value(header).style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
                });
                row++;
                
                // Dados
                dadosValidacao.items.forEach(item => {
                    sheet.cell(row, 1).value(item.codigo);
                    sheet.cell(row, 2).value(item.descricao);
                    sheet.cell(row, 3).value(item.valorCalculado).style({ numberFormat: 'R$ #,##0.00' });
                    sheet.cell(row, 4).value(item.valorSped).style({ numberFormat: 'R$ #,##0.00' });
                    sheet.cell(row, 5).value(item.diferenca).style({ numberFormat: 'R$ #,##0.00' });
                    sheet.cell(row, 6).value(item.status).style({ 
                        fill: { color: item.status === 'OK' ? 'CCFFCC' : 'FFCCCC' } 
                    });
                    row++;
                });
            }
            
            // Ajustar colunas
            sheet.column(1).width(8);
            sheet.column(2).width(30);
            sheet.column(3).width(15);
            sheet.column(4).width(15);
            sheet.column(5).width(15);
            sheet.column(6).width(10);
            
            // Salvar arquivo
            const fileName = nomeArquivo || `validacao-${dadosValidacao.periodo}.xlsx`;
            await this.excelGenerator.saveWorkbook(workbook, fileName);
            
            this.logger.success(`Relatório de validação exportado: ${fileName}`);
            return fileName;
            
        } catch (error) {
            this.logger.error(`Erro ao exportar relatório de validação: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gera relatório comparativo multi-período
     */
    async exportComparativeReport(dadosMultiPeriodo, nomeArquivo) {
        try {
            this.logger.info('Exportando relatório comparativo multi-período...');
            
            const workbook = await this.excelGenerator.createWorkbook();
            const sheet = workbook.addSheet('Comparativo');
            
            let row = 1;
            
            // Título
            sheet.cell(row, 1).value('Relatório Comparativo Multi-Período').style({ font: { bold: true, size: 16 } });
            row += 2;
            
            if (dadosMultiPeriodo && dadosMultiPeriodo.length > 0) {
                // Headers
                const headers = ['Período'];
                const metricas = ['Financiamento', 'Saldo Pagar', 'Saldo Credor', 'Valor Saídas', 'Valor Entradas'];
                headers.push(...metricas);
                
                headers.forEach((header, index) => {
                    sheet.cell(row, index + 1).value(header).style({ font: { bold: true }, fill: { color: 'E0E0E0' } });
                });
                row++;
                
                // Dados por período
                dadosMultiPeriodo.forEach(periodo => {
                    if (periodo.calculatedValues) {
                        const calc = periodo.calculatedValues;
                        
                        sheet.cell(row, 1).value(periodo.periodo);
                        sheet.cell(row, 2).value(calc.financiamento || 0).style({ numberFormat: 'R$ #,##0.00' });
                        sheet.cell(row, 3).value(calc.saldoPagar || 0).style({ numberFormat: 'R$ #,##0.00' });
                        sheet.cell(row, 4).value(calc.saldoCredor || 0).style({ numberFormat: 'R$ #,##0.00' });
                        sheet.cell(row, 5).value(calc.valorSaidasIncentivadas || 0).style({ numberFormat: 'R$ #,##0.00' });
                        sheet.cell(row, 6).value(calc.valorEntradasIncentivadas || 0).style({ numberFormat: 'R$ #,##0.00' });
                        row++;
                    }
                });
            }
            
            // Ajustar colunas
            for (let col = 1; col <= 6; col++) {
                sheet.column(col).width(col === 1 ? 12 : 18);
            }
            
            // Salvar arquivo
            const fileName = nomeArquivo || `comparativo-multi-periodo.xlsx`;
            await this.excelGenerator.saveWorkbook(workbook, fileName);
            
            this.logger.success(`Relatório comparativo exportado: ${fileName}`);
            return fileName;
            
        } catch (error) {
            this.logger.error(`Erro ao exportar relatório comparativo: ${error.message}`);
            throw error;
        }
    }
}

export default AdvancedReportGenerator;