import Logger from './core/logger.js';
import { SpedParser } from './sped/parser.js';
import { SpedValidator } from './sped/validator.js';
import { FomentarCalculator } from './modules/fomentar/calculator.js';
import { FomentarExporter } from './modules/fomentar/exporter.js';
import { ProgoiasCalculator } from './modules/progoias/calculator.js';
import { ProgoiasExporter } from './modules/progoias/exporter.js';
import { LogproduzirCalculator } from './modules/logproduzir/calculator.js';
import { LogproduzirExporter } from './modules/logproduzir/exporter.js';
import { EventManager } from './ui/events.js';
import { ExcelGenerator } from './excel/generator.js';
import { MultiPeriodManager } from './modules/multiperiod.js';

class SpedWebApp {
    constructor() {
        // Inicializar logger
        const logWindow = document.getElementById('logWindow');
        this.logger = new Logger(logWindow, {
            enableConsole: true,
            enableUI: true,
            maxLogEntries: 1000
        });

        // Inicializar módulos core
        this.spedParser = new SpedParser(this.logger);
        this.spedValidator = new SpedValidator(this.logger);
        this.excelGenerator = new ExcelGenerator(this.logger);

        // Inicializar calculadoras
        this.fomentarCalculator = new FomentarCalculator(this.logger);
        this.progoiasCalculator = new ProgoiasCalculator(this.logger);
        this.logproduzirCalculator = new LogproduzirCalculator(this.logger);

        // Inicializar exportadores
        this.fomentarExporter = new FomentarExporter(this.logger);
        this.progoiasExporter = new ProgoiasExporter(this.logger);
        this.logproduzirExporter = new LogproduzirExporter(this.logger);

        // Inicializar gerenciador de eventos
        this.eventManager = new EventManager(this);

        // Estado da aplicação
        this.state = {
            currentFile: null,
            currentModule: 'converter',
            // Dados SPED
            registrosCompletos: null,
            headerInfo: null,
            // Dados por módulo
            fomentarData: null,
            progoiasData: null,
            logproduzirData: null,
            // Múltiplos períodos
            multiPeriodData: [],
            progoiasMultiPeriodData: [],
            logproduzirMultiPeriodData: [],
            // Configurações
            fomentarConfig: this.getDefaultFomentarConfig(),
            progoiasConfig: this.getDefaultProgoiasConfig(),
            logproduzirConfig: this.getDefaultLogproduzirConfig(),
            // Modos de operação
            importMode: 'single',
            progoiasImportMode: 'single',
            logproduzirImportMode: 'single'
        };

        // Inicializar gerenciador de múltiplos períodos
        this.multiPeriodManager = new MultiPeriodManager(this.logger);
    }

    initialize() {
        this.logger.info('Inicializando SPED Web App...');
        try {
            // Inicializar gerenciador de eventos
            this.eventManager.initialize();
            // Configurar estado inicial da UI
            this.initializeUI();
            // Log de inicialização
            this.logger.success('SPED Web App inicializado com sucesso!');
        } catch (error) {
            this.logger.error(`Erro na inicialização: ${error.message}`);
            throw error;
        }
    }

    initializeUI() {
        // Limpar logs iniciais
        this.logger.clearLogs();
        // Configurar abas
        this.eventManager.tabManager.switchTab('converter');
        // Esconder seções de resultados
        this.hideAllResults();
        // Configurar formulários com valores padrão
        this.loadDefaultConfigurations();
    }

    hideAllResults() {
        const sections = [
            'fomentarResults',
            'progoiasResults',
            'logproduzirResults',
            'multiPeriodResults',
            'progoiasMultiPeriodResults',
            'logproduzirMultiPeriodResults'
        ];

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    loadDefaultConfigurations() {
        // FOMENTAR
        this.setFormValue('programType', this.state.fomentarConfig.programType);
        this.setFormValue('percentualFinanciamento', this.state.fomentarConfig.percentualFinanciamento * 100);
        this.setFormValue('icmsPorMedia', this.state.fomentarConfig.icmsPorMedia);
        this.setFormValue('saldoCredorAnterior', this.state.fomentarConfig.saldoCredorAnterior);

        // ProGoiás
        this.setFormValue('progoiasTipoEmpresa', this.state.progoiasConfig.tipoEmpresa);
        this.setFormValue('progoiasOpcaoCalculo', this.state.progoiasConfig.opcaoCalculo);
        this.setFormValue('progoiasAnoFruicao', this.state.progoiasConfig.anoFruicao);
        this.setFormValue('progoiasPercentualProtege', this.state.progoiasConfig.percentualProtege);
        this.setFormValue('progoiasIcmsPorMedia', this.state.progoiasConfig.icmsPorMedia);

        // LogPRODUZIR
        this.setFormValue('logproduzirCategoria', this.state.logproduzirConfig.categoria);
        this.setFormValue('logproduzirMediaBase', this.state.logproduzirConfig.mediaBase);
        this.setFormValue('logproduzirIgpDi', this.state.logproduzirConfig.igpDi);
    }

    setFormValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined) {
            element.value = value;
        }
    }

    // Métodos principais de processamento
    async processSpedFile(file, module = 'converter') {
        try {
            this.logger.info(`Processando arquivo: ${file.name} (módulo: ${module})`);

            // Ler arquivo
            const arrayBuffer = await file.arrayBuffer();
            const { encoding, content } = await this.spedParser.detectAndRead(arrayBuffer);

            // Processar registros completos
            this.state.registrosCompletos = this.spedParser.lerArquivoSpedCompleto(content);
            this.state.headerInfo = this.spedParser.extrairInformacoesHeader(this.state.registrosCompletos);
            this.state.currentFile = file;

            // Validar estrutura
            const validation = this.spedValidator.validarConsistenciaOperacoes(this.state.registrosCompletos);
            this.logger.success(`Arquivo processado: ${this.state.headerInfo.nomeEmpresa} - ${this.state.headerInfo.periodo}`);

            // Processar conforme módulo específico
            switch(module) {
                case 'fomentar':
                    this.updateFomentarStatus();
                    await this.processFomentar();
                    break;
                case 'progoias':
                    this.updateProgoiasStatus();
                    await this.processProgoias();
                    break;
                case 'logproduzir':
                    this.updateLogproduzirStatus();
                    await this.processLogproduzir();
                    break;
                case 'converter':
                default:
                    this.updateConverterStatus();
                    break;
            }
        } catch (error) {
            this.logger.error(`Erro ao processar arquivo: ${error.message}`);
            throw error;
        }
    }

    async processFomentar() {
        try {
            this.logger.info('Processando dados para FOMENTAR...');

            // Verificar se há CFOPs genéricos que precisam de configuração
            const temCfopsGenericos = this.verificarCfopsGenericos(this.state.registrosCompletos);
            if (temCfopsGenericos) {
                this.logger.warn('CFOPs genéricos detectados - configuração necessária');
                this.state.currentModule = 'fomentar';
                this.mostrarConfiguradorCfops();
                return;
            }

            // Verificar se há códigos de ajuste que precisam de correção
            const temCodigosParaCorrigir = this.verificarCodigosAjuste(this.state.registrosCompletos, 'E111');
            if (temCodigosParaCorrigir) {
                this.logger.warn('Códigos de ajuste E111 encontrados - revisão recomendada');
                this.mostrarCorretorCodigos('E111');
                return;
            }

            // Processar classificação de operações
            const operacoes = this.fomentarCalculator.classifyOperations(
                this.state.registrosCompletos,
                this.state.fomentarConfig.cfopsGenericosConfig
            );

            // Executar cálculo FOMENTAR
            this.state.fomentarData = this.fomentarCalculator.calculateFomentar(
                operacoes,
                this.state.fomentarConfig
            );

            // Atualizar interface
            this.updateFomentarUI();
            this.logger.success('FOMENTAR processado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao processar FOMENTAR: ${error.message}`);
            throw error;
        }
    }

    async processProgoias() {
        try {
            this.logger.info('Processando dados para ProGoiás...');

            // Verificar se há CFOPs genéricos que precisam de configuração
            const temCfopsGenericos = this.verificarCfopsGenericos(this.state.registrosCompletos);
            if (temCfopsGenericos) {
                this.logger.warn('CFOPs genéricos detectados - configuração necessária');
                this.state.currentModule = 'progoias';
                this.mostrarConfiguradorCfops();
                return;
            }

            // Verificar se há códigos de ajuste que precisam de correção
            const temCodigosParaCorrigir = this.verificarCodigosAjuste(this.state.registrosCompletos, 'E111');
            if (temCodigosParaCorrigir) {
                this.logger.warn('Códigos de ajuste E111 encontrados - revisão recomendada');
                this.mostrarCorretorCodigos('E111', 'progoias');
                return;
            }

            // Executar cálculo ProGoiás
            this.state.progoiasData = this.progoiasCalculator.calculateProgoias(
                this.state.registrosCompletos,
                this.state.progoiasConfig
            );

            // Atualizar interface
            this.updateProgoiasUI();
            this.logger.success('ProGoiás processado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao processar ProGoiás: ${error.message}`);
            throw error;
        }
    }

    async processLogproduzir() {
        try {
            this.logger.info('Processando dados para LogPRODUZIR...');

            // Verificar se há CFOPs genéricos que precisam de configuração
            const temCfopsGenericos = this.verificarCfopsGenericos(this.state.registrosCompletos);
            if (temCfopsGenericos) {
                this.logger.warn('CFOPs genéricos detectados - configuração necessária');
                this.state.currentModule = 'logproduzir';
                this.mostrarConfiguradorCfops();
                return;
            }

            // Executar cálculo LogPRODUZIR
            this.state.logproduzirData = this.logproduzirCalculator.calculateLogproduzir(
                this.state.registrosCompletos,
                this.state.logproduzirConfig
            );

            // Atualizar interface
            this.updateLogproduzirUI();
            this.logger.success('LogPRODUZIR processado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao processar LogPRODUZIR: ${error.message}`);
            throw error;
        }
    }

    // Métodos de atualização da UI
    updateConverterStatus() {
        const statusElement = document.getElementById('selectedSpedFile');
        if (statusElement && this.state.currentFile) {
            statusElement.textContent = `Arquivo selecionado: ${this.state.currentFile.name}`;
        }
    }

    updateFomentarStatus() {
        const statusElement = document.getElementById('fomentarSpedStatus');
        if (statusElement && this.state.currentFile) {
            statusElement.textContent = `Arquivo SPED importado: ${this.state.currentFile.name}`;
            statusElement.style.color = '#28a745';
        }
    }

    updateProgoiasStatus() {
        const statusElement = document.getElementById('progoiasSpedStatus');
        if (statusElement && this.state.currentFile) {
            statusElement.textContent = `Arquivo SPED importado: ${this.state.currentFile.name}`;
            statusElement.style.color = '#28a745';
        }
    }

    updateLogproduzirStatus() {
        const statusElement = document.getElementById('logproduzirSpedStatus');
        if (statusElement && this.state.currentFile) {
            statusElement.textContent = `Arquivo SPED importado: ${this.state.currentFile.name}`;
            statusElement.style.color = '#28a745';
        }
    }

    updateFomentarUI() {
        if (!this.state.fomentarData) return;

        // Mostrar seção de resultados
        const resultsSection = document.getElementById('fomentarResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Atualizar valores na interface
        this.updateElement('fomentarEmpresa', this.state.headerInfo?.nomeEmpresa || 'N/A');
        this.updateElement('fomentarPeriodo', this.state.headerInfo?.periodo || 'N/A');

        // Quadro A
        if (this.state.fomentarData.quadroA) {
            this.updateElement('fomentarSaidasIncentivadas',
                this.formatCurrency(this.state.fomentarData.quadroA.saidasIncentivadas));
            this.updateElement('fomentarTotalSaidas',
                this.formatCurrency(this.state.fomentarData.quadroA.totalSaidas));
            this.updateElement('fomentarPercentualIncentivadas',
                `${this.state.fomentarData.quadroA.percentualSaidasIncentivadas.toFixed(2)}%`);
            this.updateElement('fomentarCreditoIncentivadas',
                this.formatCurrency(this.state.fomentarData.quadroA.creditoIncentivadas));
        }

        // Quadro B
        if (this.state.fomentarData.quadroB) {
            this.updateElement('fomentarIcmsBaseFomentar',
                this.formatCurrency(this.state.fomentarData.quadroB.icmsBaseFomentar));
            this.updateElement('fomentarIcmsFinanciado',
                this.formatCurrency(this.state.fomentarData.quadroB.icmsFinanciado));
            this.updateElement('fomentarParcelaNaoFinanciada',
                this.formatCurrency(this.state.fomentarData.quadroB.parcelaNaoFinanciada));
        }

        // Resumo Final
        if (this.state.fomentarData.resumoFinal) {
            this.updateElement('fomentarTotalGeralPagar',
                this.formatCurrency(this.state.fomentarData.resumoFinal.totalGeralPagar));
            this.updateElement('fomentarValorFinanciamento',
                this.formatCurrency(this.state.fomentarData.resumoFinal.valorFinanciamento));
            this.updateElement('fomentarEconomia',
                this.formatCurrency(this.state.fomentarData.resumoFinal.economia));
        }

        this.logger.info('Interface FOMENTAR atualizada');
    }

    updateProgoiasUI() {
        if (!this.state.progoiasData) return;

        // Mostrar seção de resultados
        const resultsSection = document.getElementById('progoiasResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Atualizar valores na interface
        this.updateElement('progoiasEmpresa', this.state.headerInfo?.nomeEmpresa || 'N/A');
        this.updateElement('progoiasPeriodo', this.state.headerInfo?.periodo || 'N/A');

        // Quadro A
        if (this.state.progoiasData.quadroA) {
            this.updateElement('progoiasPercentual',
                `${this.state.progoiasData.quadroA.GO100001.toFixed(2)}%`);
            this.updateElement('progoiasBaseCalculo',
                this.formatCurrency(this.state.progoiasData.quadroA.baseCalculo));
            this.updateElement('progoiasCreditoOutorgado',
                this.formatCurrency(this.state.progoiasData.quadroA.GO100009));
        }

        // Quadro B
        if (this.state.progoiasData.quadroB) {
            this.updateElement('progoiasIcmsARecolher',
                this.formatCurrency(this.state.progoiasData.quadroB.item13_icmsARecolher));
            this.updateElement('progoiasValorProtege',
                this.formatCurrency(this.state.progoiasData.quadroB.item14_valorProtege));
            this.updateElement('progoiasIcmsFinal',
                this.formatCurrency(this.state.progoiasData.quadroB.item15_icmsFinal));
            this.updateElement('progoiasEconomiaTotal',
                this.formatCurrency(this.state.progoiasData.quadroB.economiaTotal));
        }

        this.logger.info('Interface ProGoiás atualizada');
    }

    updateLogproduzirUI() {
        if (!this.state.logproduzirData) return;

        // Mostrar seção de resultados
        const resultsSection = document.getElementById('logproduzirResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Atualizar valores na interface
        this.updateElement('logproduzirEmpresa', this.state.headerInfo?.nomeEmpresa || 'N/A');
        this.updateElement('logproduzirPeriodo', this.state.headerInfo?.periodo || 'N/A');

        // Dados dos fretes
        this.updateElement('logproduzirFretesInterestaduais',
            this.formatCurrency(this.state.logproduzirData.fretesInterestaduais));
        this.updateElement('logproduzirFreteTotal',
            this.formatCurrency(this.state.logproduzirData.freteTotal));
        this.updateElement('logproduzirProporcionalidade',
            `${this.state.logproduzirData.proporcionalidade.toFixed(2)}%`);

        // Cálculos
        this.updateElement('logproduzirIcmsFi',
            this.formatCurrency(this.state.logproduzirData.icmsFi));
        this.updateElement('logproduzirSaldoDevedor',
            this.formatCurrency(this.state.logproduzirData.saldoDevedor));
        this.updateElement('logproduzirExcesso',
            this.formatCurrency(this.state.logproduzirData.excesso));
        this.updateElement('logproduzirCreditoLiquido',
            this.formatCurrency(this.state.logproduzirData.creditoLiquido));

        // Resultado final
        this.updateElement('logproduzirIcmsFinal',
            this.formatCurrency(this.state.logproduzirData.icmsFinal));
        this.updateElement('logproduzirEconomia',
            `${this.formatCurrency(this.state.logproduzirData.economia)} (${this.state.logproduzirData.percentualEconomia.toFixed(2)}%)`);

        this.logger.info('Interface LogPRODUZIR atualizada');
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatCurrency(value) {
        if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    // Métodos de exportação
    async exportFomentarReport() {
        if (!this.state.fomentarData) {
            this.logger.warn('Nenhum dado FOMENTAR para exportar');
            return;
        }

        try {
            await this.fomentarExporter.generateExcel(
                this.state.fomentarData,
                this.state.headerInfo?.nomeEmpresa || 'Empresa',
                this.state.headerInfo?.periodo || 'Período'
            );
            this.logger.success('Relatório FOMENTAR exportado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao exportar FOMENTAR: ${error.message}`);
            throw error;
        }
    }

    async exportProgoiasReport() {
        if (!this.state.progoiasData) {
            this.logger.warn('Nenhum dado ProGoiás para exportar');
            return;
        }

        try {
            await this.progoiasExporter.generateExcel(
                this.state.progoiasData,
                this.state.headerInfo?.nomeEmpresa || 'Empresa',
                this.state.headerInfo?.periodo || 'Período'
            );
            this.logger.success('Relatório ProGoiás exportado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao exportar ProGoiás: ${error.message}`);
            throw error;
        }
    }

    async exportLogproduzirReport() {
        if (!this.state.logproduzirData) {
            this.logger.warn('Nenhum dado LogPRODUZIR para exportar');
            return;
        }

        try {
            await this.logproduzirExporter.generateExcel(
                this.state.logproduzirData,
                this.state.headerInfo?.nomeEmpresa || 'Empresa',
                this.state.headerInfo?.periodo || 'Período'
            );
            this.logger.success('Relatório LogPRODUZIR exportado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao exportar LogPRODUZIR: ${error.message}`);
            throw error;
        }
    }

    async convertToExcel() {
        if (!this.state.registrosCompletos) {
            this.logger.warn('Nenhum arquivo SPED para converter');
            return;
        }

        try {
            const filename = document.getElementById('excelFileName')?.value?.trim() ||
                'SPED_convertido.xlsx';

            // Usar gerador de Excel genérico
            const workbook = await this.excelGenerator.createWorkbook();

            // Processar registros SPED
            await this.processSpedForExcel(workbook, this.state.registrosCompletos);

            // Salvar arquivo
            await this.excelGenerator.saveWorkbook(workbook, filename);
            this.logger.success(`Conversão concluída: ${filename}`);
        } catch (error) {
            this.logger.error(`Erro na conversão: ${error.message}`);
            throw error;
        }
    }

    async processSpedForExcel(workbook, registros) {
        const styles = this.excelGenerator.createStandardStyles();

        // Criar aba consolidada
        const consolidatedSheet = workbook.addSheet('Consolidado_Fiscal');
        this.createConsolidatedSheet(consolidatedSheet, registros, styles);

        // Criar abas por tipo de registro
        const orderedTypes = ['0000', 'C100', 'C190', 'C590', 'D100', 'D190', 'D590', 'E110', 'E111'];
        for (const tipo of orderedTypes) {
            if (registros[tipo] && registros[tipo].length > 0) {
                const sheet = workbook.addSheet(tipo);
                this.createRecordSheet(sheet, tipo, registros[tipo], styles);
            }
        }

        // Remover aba padrão se existir
        if (workbook.sheets().length > 0) {
            const firstSheet = workbook.sheet(0);
            if (firstSheet.name() === 'Sheet1' || firstSheet.name() === 'Sheet') {
                workbook.deleteSheet(firstSheet);
            }
        }
    }

    createConsolidatedSheet(sheet, registros, styles) {
        let row = 1;

        // Cabeçalho
        sheet.cell(row, 1).value('SPED FISCAL - CONSOLIDADO')
            .style(styles.title);
        this.excelGenerator.mergeCells(sheet, row, 1, row, 10);
        row += 2;

        // Informações da empresa
        if (this.state.headerInfo) {
            sheet.cell(row, 1).value('Empresa:').style(styles.label);
            sheet.cell(row, 2).value(this.state.headerInfo.nomeEmpresa);
            row++;
            sheet.cell(row, 1).value('Período:').style(styles.label);
            sheet.cell(row, 2).value(this.state.headerInfo.periodo);
            row++;
            sheet.cell(row, 1).value('CNPJ:').style(styles.label);
            sheet.cell(row, 2).value(this.state.headerInfo.cnpj || 'N/A');
            row += 2;
        }

        // Cabeçalhos da tabela consolidada
        const headers = ['Data', 'CFOP', 'CST_ICMS', 'VL_OPR', 'VL_ICMS', 'Tipo_Registro'];
        row = this.excelGenerator.createTableHeaders(sheet, row, 1, headers, styles.header);

        // Dados consolidados
        const consolidatedData = this.getConsolidatedData(registros);
        const tableData = consolidatedData.map(record => [
            record.data || '',
            record.cfop || '',
            record.cst_icms || '',
            record.vl_opr || 0,
            record.vl_icms || 0,
            record.tipo_registro || ''
        ]);

        const formats = [
            styles.date, styles.center, styles.center,
            styles.currency, styles.currency, styles.center
        ];

        this.excelGenerator.createTableData(sheet, row, 1, tableData, formats);
        this.excelGenerator.autoFitColumns(sheet);
    }

    getConsolidatedData(registros) {
        const consolidatedData = [];
        const consolidatedTypes = ['C190', 'C590', 'D190', 'D590'];

        consolidatedTypes.forEach(tipo => {
            if (registros[tipo]) {
                const layout = this.spedParser.obterLayoutRegistro(tipo);
                if (layout) {
                    registros[tipo].forEach(registro => {
                        const campos = registro.slice(1, -1);
                        const record = {
                            data: this.extractDateFromSped(registros),
                            cfop: campos[layout.indexOf('CFOP')] || '',
                            cst_icms: campos[layout.indexOf('CST_ICMS')] || '',
                            vl_opr: parseFloat((campos[layout.indexOf('VL_OPR')] || '0').replace(',', '.')),
                            vl_icms: parseFloat((campos[layout.indexOf('VL_ICMS')] || '0').replace(',', '.')),
                            tipo_registro: tipo
                        };
                        consolidatedData.push(record);
                    });
                }
            }
        });

        return consolidatedData;
    }

    extractDateFromSped(registros) {
        if (registros['0000'] && registros['0000'][0]) {
            const reg0000 = registros['0000'][0];
            const dataInicial = reg0000[4]; // DT_INI
            if (dataInicial && dataInicial.length === 8) {
                const dia = dataInicial.substring(0, 2);
                const mes = dataInicial.substring(2, 4);
                const ano = dataInicial.substring(4, 8);
                return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
            }
        }
        return new Date();
    }

    createRecordSheet(sheet, tipo, registros, styles) {
        let row = 1;

        // Título
        sheet.cell(row, 1).value(`REGISTRO ${tipo}`)
            .style(styles.title);
        row += 2;

        // Layout do registro
        const layout = this.spedParser.obterLayoutRegistro(tipo);
        if (!layout) return;

        // Cabeçalhos
        row = this.excelGenerator.createTableHeaders(sheet, row, 1, layout, styles.header);

        // Dados
        const tableData = registros.map(registro => registro.slice(1, -1));
        const formats = layout.map(field => {
            if (field.startsWith('VL_') || field.startsWith('ALIQ_')) {
                return styles.currency;
            } else if (field.startsWith('DT_')) {
                return styles.date;
            } else {
                return styles.value;
            }
        });

        this.excelGenerator.createTableData(sheet, row, 1, tableData, formats);
        this.excelGenerator.autoFitColumns(sheet);
    }

    // Métodos de configuração
    getDefaultFomentarConfig() {
        return {
            programType: 'FOMENTAR',
            percentualFinanciamento: 0.70,
            icmsPorMedia: 0,
            saldoCredorAnterior: 0,
            cfopsGenericosConfig: {}
        };
    }

    getDefaultProgoiasConfig() {
        return {
            tipoEmpresa: 'optante',
            opcaoCalculo: 'automatico',
            anoFruicao: 1,
            percentualManual: null,
            percentualProtege: 10,
            icmsPorMedia: 0,
            saldoCredorAnterior: 0,
            ajustePeriodoAnterior: 0
        };
    }

    getDefaultLogproduzirConfig() {
        return {
            categoria: 'II',
            mediaBase: 0,
            igpDi: 1.0,
            saldoCredorAnterior: 0
        };
    }

    // Métodos utilitários
    verificarCfopsGenericos(registros) {
        const cfopsGenericos = [];
        const tiposRegistros = ['C190', 'C590', 'D190', 'D590'];
        
        tiposRegistros.forEach(tipoRegistro => {
            if (!registros[tipoRegistro]) return;
            
            const layout = this.obterLayoutRegistro(tipoRegistro);
            if (!layout) return;
            
            registros[tipoRegistro].forEach(registro => {
                const campos = registro.slice(1, -1);
                const cfop = campos[layout.indexOf('CFOP')] || '';
                
                if (this.isCfopGenerico(cfop) && !cfopsGenericos.includes(cfop)) {
                    cfopsGenericos.push(cfop);
                }
            });
        });
        
        return cfopsGenericos.length > 0;
    }

    verificarCodigosAjuste(registros, tipo) {
        if (tipo === 'E111' && registros.E111) {
            const layout = this.obterLayoutRegistro('E111');
            return registros.E111.some(registro => {
                const campos = registro.slice(1, -1);
                const codAjuste = campos[layout.indexOf('COD_AJ_APUR')] || '';
                return codAjuste && codAjuste.length >= 6; // Códigos relevantes
            });
        }
        return false;
    }

    isCfopGenerico(cfop) {
        const cfopsGenericos = [
            '1905', '1906', '1910', '1911', '1917', '1918', '1949',
            '2905', '2910', '2911', '2917', '2918', '2934', '2949',
            '3949',
            '5905', '5906', '5910', '5917', '5918', '5927', '5928', '5949',
            '6905', '6906', '6910', '6917', '6918', '6934', '6949',
            '7949'
        ];
        return cfopsGenericos.includes(cfop);
    }

    mostrarConfiguradorCfops() {
        const cfopsEncontrados = this.detectarCfopsGenericos();
        if (cfopsEncontrados.length === 0) {
            this.logger.info('Nenhum CFOP genérico encontrado');
            return;
        }

        this.logger.warn(`CFOPs genéricos detectados: ${cfopsEncontrados.join(', ')}`);
        
        // Criar modal para configuração de CFOPs
        this.criarModalConfiguradorCfops(cfopsEncontrados);
    }

    criarModalConfiguradorCfops(cfopsGenericos) {
        // Remover modal existente se houver
        const modalExistente = document.getElementById('cfopConfigModal');
        if (modalExistente) {
            modalExistente.remove();
        }

        // Criar estrutura do modal
        const modal = document.createElement('div');
        modal.id = 'cfopConfigModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Configuração de CFOPs Genéricos</h3>
                    <span class="close-modal" onclick="document.getElementById('cfopConfigModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Os seguintes CFOPs genéricos foram detectados no SPED e precisam ser classificados:</p>
                    <div class="cfops-config-list">
                        ${cfopsGenericos.map(cfop => `
                            <div class="cfop-config-item">
                                <span class="cfop-code">${cfop}</span>
                                <span class="cfop-description">${this.getDescricaoCfop(cfop)}</span>
                                <div class="cfop-options">
                                    <label>
                                        <input type="radio" name="cfop_${cfop}" value="incentivado" 
                                               ${this.getSugestaoConfiguracao(cfop) === 'incentivado' ? 'checked' : ''}>
                                        Incentivado
                                    </label>
                                    <label>
                                        <input type="radio" name="cfop_${cfop}" value="nao-incentivado"
                                               ${this.getSugestaoConfiguracao(cfop) === 'nao-incentivado' ? 'checked' : ''}>
                                        Não Incentivado
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.aplicarConfiguracaoAutomatica()">
                            Configuração Automática
                        </button>
                        <button class="btn btn-primary" onclick="this.salvarConfiguracaoCfops()">
                            Salvar Configuração
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos CSS necessários
        if (!document.getElementById('cfopModalStyles')) {
            const styles = document.createElement('style');
            styles.id = 'cfopModalStyles';
            styles.innerHTML = `
                .modal {
                    display: block;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                }
                .modal-content {
                    background-color: #fefefe;
                    margin: 5% auto;
                    padding: 0;
                    border: 1px solid #888;
                    border-radius: 8px;
                    width: 80%;
                    max-width: 600px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .modal-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 8px 8px 0 0;
                    position: relative;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.5em;
                }
                .close-modal {
                    position: absolute;
                    right: 20px;
                    top: 15px;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                }
                .modal-body {
                    padding: 20px;
                }
                .cfops-config-list {
                    max-height: 400px;
                    overflow-y: auto;
                }
                .cfop-config-item {
                    display: flex;
                    align-items: center;
                    padding: 15px 0;
                    border-bottom: 1px solid #eee;
                }
                .cfop-code {
                    font-weight: bold;
                    min-width: 60px;
                    color: #2c3e50;
                }
                .cfop-description {
                    flex: 1;
                    margin: 0 20px;
                    color: #666;
                    font-size: 0.9em;
                }
                .cfop-options {
                    display: flex;
                    gap: 20px;
                }
                .cfop-options label {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    cursor: pointer;
                    font-size: 0.9em;
                }
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .btn-primary {
                    background-color: #007bff;
                    color: white;
                }
                .btn-secondary {
                    background-color: #6c757d;
                    color: white;
                }
                .btn:hover {
                    opacity: 0.9;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(modal);
        
        // Adicionar event listeners para os botões
        modal.querySelector('.btn-primary').addEventListener('click', () => this.salvarConfiguracaoCfops());
        modal.querySelector('.btn-secondary').addEventListener('click', () => this.aplicarConfiguracaoAutomatica());
    }

    getSugestaoConfiguracao(cfop) {
        // Sugestão baseada no tipo de operação
        const isEntrada = cfop.startsWith('1') || cfop.startsWith('2') || cfop.startsWith('3');
        return isEntrada ? 'incentivado' : 'nao-incentivado';
    }

    getDescricaoCfop(cfop) {
        const descricoes = {
            '1949': 'Outras entradas de mercadorias ou aquisições de serviços não especificados',
            '2949': 'Outras entradas de mercadorias por conta e ordem de terceiros',
            '3949': 'Outras entradas para industrialização por conta e ordem do adquirente',
            '5949': 'Outras saídas de mercadorias ou prestações de serviços não especificados',
            '6949': 'Outras saídas de mercadorias por conta e ordem de terceiros',
            '7949': 'Outras saídas para industrialização por conta e ordem do encomendante'
        };
        return descricoes[cfop] || 'CFOP genérico - classificação necessária';
    }

    aplicarConfiguracaoAutomatica() {
        const cfopsGenericos = this.detectarCfopsGenericos();
        
        if (!this.state.fomentarConfig.cfopsGenericosConfig) {
            this.state.fomentarConfig.cfopsGenericosConfig = {};
        }

        cfopsGenericos.forEach(cfop => {
            const config = this.getSugestaoConfiguracao(cfop);
            this.state.fomentarConfig.cfopsGenericosConfig[cfop] = config;
            this.logger.info(`CFOP ${cfop} configurado automaticamente como: ${config}`);
        });
        
        // Fechar modal e continuar processamento
        document.getElementById('cfopConfigModal').remove();
        this.continuarProcessamentoAposCfops();
    }

    salvarConfiguracaoCfops() {
        const cfopsGenericos = this.detectarCfopsGenericos();
        
        if (!this.state.fomentarConfig.cfopsGenericosConfig) {
            this.state.fomentarConfig.cfopsGenericosConfig = {};
        }

        cfopsGenericos.forEach(cfop => {
            const radioSelecionado = document.querySelector(`input[name="cfop_${cfop}"]:checked`);
            if (radioSelecionado) {
                const config = radioSelecionado.value;
                this.state.fomentarConfig.cfopsGenericosConfig[cfop] = config;
                this.logger.info(`CFOP ${cfop} configurado como: ${config}`);
            }
        });
        
        // Fechar modal e continuar processamento
        document.getElementById('cfopConfigModal').remove();
        this.continuarProcessamentoAposCfops();
    }

    continuarProcessamentoAposCfops() {
        this.logger.info('Continuando processamento com CFOPs configurados...');
        // Continuar o processamento do módulo atual
        const moduloAtual = this.state.currentModule;
        if (moduloAtual === 'fomentar') {
            this.processFomentar();
        } else if (moduloAtual === 'progoias') {
            this.processProgoias();
        } else if (moduloAtual === 'logproduzir') {
            this.processLogproduzir();
        }
    }

    detectarCfopsGenericos() {
        const cfopsGenericos = [];
        const tiposRegistros = ['C190', 'C590', 'D190', 'D590'];
        
        tiposRegistros.forEach(tipoRegistro => {
            if (!this.state.registrosCompletos[tipoRegistro]) return;
            
            const layout = this.obterLayoutRegistro(tipoRegistro);
            if (!layout) return;
            
            this.state.registrosCompletos[tipoRegistro].forEach(registro => {
                const campos = registro.slice(1, -1);
                const cfop = campos[layout.indexOf('CFOP')] || '';
                
                if (this.isCfopGenerico(cfop) && !cfopsGenericos.includes(cfop)) {
                    cfopsGenericos.push(cfop);
                }
            });
        });
        
        return cfopsGenericos;
    }

    mostrarCorretorCodigos(tipo, modulo = 'fomentar') {
        this.logger.info(`${tipo} códigos de ajuste detectados para revisão`);
        this.logger.warn(`Recomenda-se revisar os códigos ${tipo} antes do cálculo final`);
        
        // Por simplicidade, continua sem correção por enquanto
        // Em uma implementação completa, mostraria interface para correção
        this.logger.info('Continuando cálculo sem correções (pode afetar precisão)...');
    }

    // Métodos de recálculo
    recalculateFomentar() {
        if (this.state.registrosCompletos && this.state.fomentarData) {
            this.updateFomentarConfigFromUI();
            this.processFomentar();
        }
    }

    recalculateProgoias() {
        if (this.state.registrosCompletos && this.state.progoiasData) {
            this.updateProgoiasConfigFromUI();
            this.processProgoias();
        }
    }

    recalculateLogproduzir() {
        if (this.state.registrosCompletos && this.state.logproduzirData) {
            this.updateLogproduzirConfigFromUI();
            this.processLogproduzir();
        }
    }

    updateFomentarConfigFromUI() {
        this.state.fomentarConfig.programType =
            document.getElementById('programType')?.value || 'FOMENTAR';
        this.state.fomentarConfig.percentualFinanciamento =
            (parseFloat(document.getElementById('percentualFinanciamento')?.value) || 70) / 100;
        this.state.fomentarConfig.icmsPorMedia =
            parseFloat(document.getElementById('icmsPorMedia')?.value) || 0;
        this.state.fomentarConfig.saldoCredorAnterior =
            parseFloat(document.getElementById('saldoCredorAnterior')?.value) || 0;
    }

    updateProgoiasConfigFromUI() {
        this.state.progoiasConfig.tipoEmpresa =
            document.getElementById('progoiasTipoEmpresa')?.value || 'optante';
        this.state.progoiasConfig.opcaoCalculo =
            document.getElementById('progoiasOpcaoCalculo')?.value || 'automatico';
        this.state.progoiasConfig.anoFruicao =
            document.getElementById('progoiasAnoFruicao')?.value || 1;
        this.state.progoiasConfig.percentualManual =
            parseFloat(document.getElementById('progoiasPercentualManual')?.value) || null;
        this.state.progoiasConfig.percentualProtege =
            parseFloat(document.getElementById('progoiasPercentualProtege')?.value) || null;
        this.state.progoiasConfig.icmsPorMedia =
            parseFloat(document.getElementById('progoiasIcmsPorMedia')?.value) || 0;
        this.state.progoiasConfig.saldoCredorAnterior =
            parseFloat(document.getElementById('progoiasSaldoCredorAnterior')?.value) || 0;
        this.state.progoiasConfig.ajustePeriodoAnterior =
            parseFloat(document.getElementById('progoiasAjustePeriodoAnterior')?.value) || 0;
    }

    updateLogproduzirConfigFromUI() {
        this.state.logproduzirConfig.categoria =
            document.getElementById('logproduzirCategoria')?.value || 'II';
        this.state.logproduzirConfig.mediaBase =
            parseFloat(document.getElementById('logproduzirMediaBase')?.value) || 0;
        this.state.logproduzirConfig.igpDi =
            parseFloat(document.getElementById('logproduzirIgpDi')?.value) || 1.0;
        this.state.logproduzirConfig.saldoCredorAnterior =
            parseFloat(document.getElementById('logproduzirSaldoCredorAnterior')?.value) || 0;
    }

    // Métodos de múltiplos períodos (placeholder para implementação futura)
    async processMultipleSpeds() {
        try {
            this.logger.info('Iniciando processamento de múltiplos períodos FOMENTAR...');
            
            // Usar MultiPeriodManager para processar arquivos
            const multiPeriodData = await this.multiPeriodManager.processMultipleSpeds(this.spedParser);
            
            if (multiPeriodData && multiPeriodData.length > 0) {
                // Processar com calculadora FOMENTAR
                const resultados = this.fomentarCalculator.processMultiplePeriods(
                    multiPeriodData, 
                    this.state.fomentarConfig
                );
                
                // Atualizar estado da aplicação
                this.state.multiPeriodData = resultados;
                
                // Atualizar interface
                this.updateMultiPeriodUI();
                
                this.logger.success(`Processamento de múltiplos períodos concluído: ${resultados.length} períodos`);
            } else {
                this.logger.warn('Nenhum período válido foi processado');
            }
        } catch (error) {
            this.logger.error(`Erro no processamento de múltiplos períodos: ${error.message}`);
            throw error;
        }
    }

    handleMultipleSpedSelection(event) {
        this.multiPeriodManager.handleMultipleSpedSelection(event);
    }

    handleProgoiasMultipleSpedSelection(event) {
        // Para ProGoiás, usar o mesmo manager mas com contexto específico
        this.multiPeriodManager.handleMultipleSpedSelection(event);
        // TODO: Implementar processamento específico ProGoiás se necessário
    }

    handleLogproduzirMultipleSpedSelection(event) {
        // Para LogPRODUZIR, usar o mesmo manager mas com contexto específico
        this.multiPeriodManager.handleMultipleSpedSelection(event);
        // TODO: Implementar processamento específico LogPRODUZIR se necessário
    }

    // Métodos de impressão
    // Métodos de atualização UI para múltiplos períodos
    updateMultiPeriodUI() {
        if (!this.state.multiPeriodData || this.state.multiPeriodData.length === 0) {
            this.logger.warn('Nenhum dado de múltiplos períodos para atualizar UI');
            return;
        }

        // Mostrar seção de resultados de múltiplos períodos
        const resultsSection = document.getElementById('multiPeriodResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Atualizar tabela comparativa usando o MultiPeriodManager
        this.multiPeriodManager.setMultiPeriodData(this.state.multiPeriodData);
        this.multiPeriodManager.displayComparativeResults();

        this.logger.success(`Interface de múltiplos períodos atualizada: ${this.state.multiPeriodData.length} períodos`);
    }

    // Métodos de exportação para múltiplos períodos
    async exportComparativeReport() {
        if (!this.state.multiPeriodData || this.state.multiPeriodData.length === 0) {
            this.logger.warn('Nenhum dado de múltiplos períodos para exportar');
            return;
        }

        try {
            await this.multiPeriodManager.exportComparativeReport();
            this.logger.success('Relatório comparativo exportado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao exportar relatório comparativo: ${error.message}`);
            throw error;
        }
    }

    async exportComparativePDF() {
        if (!this.state.multiPeriodData || this.state.multiPeriodData.length === 0) {
            this.logger.warn('Nenhum dado de múltiplos períodos para exportar em PDF');
            return;
        }

        try {
            await this.multiPeriodManager.exportComparativePDF();
            this.logger.success('PDF comparativo gerado com sucesso');
        } catch (error) {
            this.logger.error(`Erro ao exportar PDF comparativo: ${error.message}`);
            throw error;
        }
    }

    // Métodos específicos para processamento ProGoiás múltiplos períodos
    async processProgoiasMultipleSpeds() {
        try {
            this.logger.info('Iniciando processamento de múltiplos períodos ProGoiás...');
            
            const multiPeriodData = await this.multiPeriodManager.processMultipleSpeds(this.spedParser);
            
            if (multiPeriodData && multiPeriodData.length > 0) {
                // Processar com calculadora ProGoiás
                const resultados = this.progoiasCalculator.processMultiplePeriods(
                    multiPeriodData, 
                    this.state.progoiasConfig
                );
                
                // Atualizar estado da aplicação
                this.state.progoiasMultiPeriodData = resultados;
                
                // Atualizar interface específica do ProGoiás
                this.updateProgoiasMultiPeriodUI();
                
                this.logger.success(`Processamento ProGoiás de múltiplos períodos concluído: ${resultados.length} períodos`);
            } else {
                this.logger.warn('Nenhum período válido foi processado para ProGoiás');
            }
        } catch (error) {
            this.logger.error(`Erro no processamento ProGoiás de múltiplos períodos: ${error.message}`);
            throw error;
        }
    }

    updateProgoiasMultiPeriodUI() {
        if (!this.state.progoiasMultiPeriodData || this.state.progoiasMultiPeriodData.length === 0) {
            return;
        }

        const resultsSection = document.getElementById('progoiasMultiPeriodResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        this.logger.success(`Interface ProGoiás múltiplos períodos atualizada: ${this.state.progoiasMultiPeriodData.length} períodos`);
    }

    // Métodos específicos para processamento LogPRODUZIR múltiplos períodos
    async processLogproduzirMultipleSpeds() {
        try {
            this.logger.info('Iniciando processamento de múltiplos períodos LogPRODUZIR...');
            
            const multiPeriodData = await this.multiPeriodManager.processMultipleSpeds(this.spedParser);
            
            if (multiPeriodData && multiPeriodData.length > 0) {
                // Processar com calculadora LogPRODUZIR
                const resultados = this.logproduzirCalculator.processMultiplePeriods(
                    multiPeriodData, 
                    this.state.logproduzirConfig
                );
                
                // Atualizar estado da aplicação
                this.state.logproduzirMultiPeriodData = resultados;
                
                // Atualizar interface específica do LogPRODUZIR
                this.updateLogproduzirMultiPeriodUI();
                
                this.logger.success(`Processamento LogPRODUZIR de múltiplos períodos concluído: ${resultados.length} períodos`);
            } else {
                this.logger.warn('Nenhum período válido foi processado para LogPRODUZIR');
            }
        } catch (error) {
            this.logger.error(`Erro no processamento LogPRODUZIR de múltiplos períodos: ${error.message}`);
            throw error;
        }
    }

    updateLogproduzirMultiPeriodUI() {
        if (!this.state.logproduzirMultiPeriodData || this.state.logproduzirMultiPeriodData.length === 0) {
            return;
        }

        const resultsSection = document.getElementById('logproduzirMultiPeriodResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        this.logger.success(`Interface LogPRODUZIR múltiplos períodos atualizada: ${this.state.logproduzirMultiPeriodData.length} períodos`);
    }

    printFomentarReport() {
        if (!this.state.fomentarData) {
            this.logger.warn('Nenhum dado FOMENTAR para imprimir');
            return;
        }

        this.logger.info('Enviando para impressão...');
        window.print();
    }

    printProgoiasReport() {
        if (!this.state.progoiasData) {
            this.logger.warn('Nenhum dado ProGoiás para imprimir');
            return;
        }

        this.logger.info('Enviando para impressão...');
        window.print();
    }

    printLogproduzirReport() {
        if (!this.state.logproduzirData) {
            this.logger.warn('Nenhum dado LogPRODUZIR para imprimir');
            return;
        }

        this.logger.info('Enviando para impressão...');
        window.print();
    }

    // Métodos de mudança de modo/visualização
    switchView(view) {
        this.logger.info(`Mudando para visualização: ${view}`);
        this.multiPeriodManager.switchView(view);
    }

    switchProgoiasView(view) {
        this.logger.info(`Mudando para visualização ProGoiás: ${view}`);
        // Usar o mesmo manager para ProGoiás
        this.multiPeriodManager.switchView(view);
    }

    handleImportModeChange(mode) {
        this.state.importMode = mode;
        this.logger.info(`Modo de importação alterado para: ${mode}`);
        this.multiPeriodManager.handleImportModeChange({ target: { value: mode } });
    }

    handleProgoiasImportModeChange(mode) {
        this.state.progoiasImportMode = mode;
        this.logger.info(`Modo de importação ProGoiás alterado para: ${mode}`);
        // Usar o mesmo manager, mas com contexto ProGoiás
        this.multiPeriodManager.handleImportModeChange({ target: { value: mode } });
    }

    handleLogproduzirImportModeChange(mode) {
        this.state.logproduzirImportMode = mode;
        this.logger.info(`Modo de importação LogPRODUZIR alterado para: ${mode}`);
        // Usar o mesmo manager, mas com contexto LogPRODUZIR
        this.multiPeriodManager.handleImportModeChange({ target: { value: mode } });
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.spedApp = new SpedWebApp();
        window.spedApp.initialize();
        console.log('SPED Web App inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar SPED Web App:', error);
    }
});

// Exportar para uso global se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpedWebApp;
} else if (typeof window !== 'undefined') {
    window.SpedWebApp = SpedWebApp;
}
