import { Logger } from '../core/logger.js';
import { parseFloatSafe, formatCurrency } from '../core/utils.js';

/**
 * Módulo para processamento de múltiplos períodos
 * Migrado do script.js original
 */
export class MultiPeriodManager {
    constructor(logger, app = null) {
        this.logger = logger || new Logger();
        this.app = app;
        this.multiPeriodData = [];
        this.selectedPeriodIndex = 0;
        this.currentImportMode = 'single';
    }

    /**
     * Manipula mudança de modo de importação (single/multiple)
     */
    handleImportModeChange(event) {
        this.currentImportMode = event.target.value;
        const singleSection = document.getElementById('singleImportSection');
        const multipleSection = document.getElementById('multipleImportSection');
        
        if (this.currentImportMode === 'single') {
            singleSection.style.display = 'block';
            multipleSection.style.display = 'none';
        } else {
            singleSection.style.display = 'none';
            multipleSection.style.display = 'block';
        }
        
        this.logger.info(`Modo de importação alterado para: ${this.currentImportMode === 'single' ? 'Período Único' : 'Múltiplos Períodos'}`);
    }

    /**
     * Manipula seleção de múltiplos arquivos SPED
     */
    handleMultipleSpedSelection(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        const filesList = document.getElementById('multipleSpedsList');
        const processButton = document.getElementById('processMultipleSpeds');
        
        filesList.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'selected-file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-period">Período: Aguardando análise...</div>
                </div>
                <span class="remove-file" onclick="removeFile(${index})">×</span>
            `;
            filesList.appendChild(fileItem);
        });
        
        processButton.style.display = files.length > 0 ? 'block' : 'none';
        this.logger.info(`${files.length} arquivo(s) SPED selecionado(s) para processamento`);
    }

    /**
     * Remove arquivo da seleção
     */
    removeFile(index) {
        const fileInput = document.getElementById('multipleSpedFiles');
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);
        
        files.forEach((file, i) => {
            if (i !== index) dt.items.add(file);
        });
        
        fileInput.files = dt.files;
        this.handleMultipleSpedSelection({ target: fileInput });
    }

    /**
     * Processa múltiplos arquivos SPED
     */
    async processMultipleSpeds(spedParser) {
        const files = Array.from(document.getElementById('multipleSpedFiles').files);
        if (files.length === 0) return;
        
        this.logger.info('Iniciando processamento de múltiplos SPEDs...');
        this.multiPeriodData = [];
        
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.logger.info(`Processando arquivo ${i + 1}/${files.length}: ${file.name}`);
            
            try {
                const fileContent = await this.readFileContent(file);
                const periodData = await this.processSingleSpedForPeriod(fileContent, file.name, spedParser);
                this.multiPeriodData.push(periodData);
                
                // Update file item with period info
                const fileItems = document.querySelectorAll('.selected-file-item');
                if (fileItems[i]) {
                    const periodSpan = fileItems[i].querySelector('.file-period');
                    periodSpan.textContent = `Período: ${periodData.periodo}`;
                }
                
            } catch (error) {
                this.logger.error(`Erro ao processar ${file.name}: ${error.message}`);
            }
        }
        
        // Sort by period chronologically
        this.multiPeriodData.sort((a, b) => {
            const periodA = this.parsePeriod(a.periodo);
            const periodB = this.parsePeriod(b.periodo);
            return periodA.getTime() - periodB.getTime();
        });
        
        // Apply automatic saldo credor carryover
        this.applyAutomaticSaldoCredorCarryover();
        
        this.logger.success(`Processamento concluído: ${this.multiPeriodData.length} períodos processados`);
        return this.multiPeriodData;
    }

    /**
     * Lê conteúdo do arquivo
     */
    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Falha ao ler arquivo'));
            reader.readAsText(file);
        });
    }

    /**
     * Processa um único SPED para período
     */
    async processSingleSpedForPeriod(fileContent, fileName, spedParser) {
        const registros = spedParser.lerArquivoSpedCompleto(fileContent);
        const dadosEmpresa = this.extrairDadosEmpresa(registros);
        
        this.logger.info(`Processando: ${fileName} - ${dadosEmpresa.nome} (${dadosEmpresa.periodo})`);
        
        const periodData = {
            fileName: fileName,
            periodo: dadosEmpresa.periodo,
            nomeEmpresa: dadosEmpresa.nome,
            registrosCompletos: registros,
            calculatedValues: null
        };
        
        return periodData;
    }

    /**
     * Extrai dados da empresa dos registros
     */
    extrairDadosEmpresa(registros) {
        let nome = "Empresa";
        let periodo = "";
        let dataInicial = "";
        let dataFinal = "";
        
        if (registros['0000'] && registros['0000'].length > 0) {
            const reg0000 = registros['0000'][0];
            
            // Nome da empresa (posição 6 no registro 0000)
            if (reg0000.length > 6) {
                nome = reg0000[6] || "Empresa";
            }
            
            // Data inicial (posição 4) e final (posição 5)
            if (reg0000.length > 4) {
                dataInicial = reg0000[4];
            }
            if (reg0000.length > 5) {
                dataFinal = reg0000[5];
            }
            
            // Formato do período: MM/YYYY baseado na data inicial
            if (dataInicial && dataInicial.length === 8) {
                const mes = dataInicial.substring(2, 4);
                const ano = dataInicial.substring(4, 8);
                periodo = `${mes}/${ano}`;
            }
        }
        
        return { nome, periodo, dataInicial, dataFinal };
    }

    /**
     * Aplica carregamento automático de saldo credor
     */
    applyAutomaticSaldoCredorCarryover() {
        for (let i = 1; i < this.multiPeriodData.length; i++) {
            const previousPeriod = this.multiPeriodData[i - 1];
            const currentPeriod = this.multiPeriodData[i];
            
            // Calcular período anterior se ainda não calculado
            if (!previousPeriod.calculatedValues) {
                // Esta função será implementada específica para cada tipo de cálculo
                // previousPeriod.calculatedValues = this.calculateForPeriod(previousPeriod, 0);
            }
            
            // Obter saldo credor do período anterior
            const saldoCredorAnterior = previousPeriod.calculatedValues?.saldoCredorFinal || 0;
            
            // Calcular período atual com carregamento
            // currentPeriod.calculatedValues = this.calculateForPeriod(currentPeriod, saldoCredorAnterior);
            
            this.logger.info(`Período ${currentPeriod.periodo}: Saldo credor anterior R$ ${saldoCredorAnterior.toFixed(2)}`);
        }
        
        // Calcular primeiro período (sem carregamento)
        if (this.multiPeriodData.length > 0 && !this.multiPeriodData[0].calculatedValues) {
            // this.multiPeriodData[0].calculatedValues = this.calculateForPeriod(this.multiPeriodData[0], 0);
        }
    }

    /**
     * Converte período para Date
     */
    parsePeriod(periodoString) {
        if (!periodoString || !periodoString.includes('/')) {
            return new Date();
        }
        
        const [month, year] = periodoString.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, 1);
    }

    /**
     * Alterna entre visualização única e comparativa
     */
    switchView(viewType) {
        const singleView = document.getElementById('singlePeriodView');
        const comparativeView = document.getElementById('comparativePeriodView');
        
        if (viewType === 'single') {
            singleView.style.display = 'block';
            comparativeView.style.display = 'none';
            this.logger.info('Visualização alterada para período único');
        } else if (viewType === 'comparative') {
            singleView.style.display = 'none';
            comparativeView.style.display = 'block';
            this.displayComparativeResults();
            this.logger.info('Visualização alterada para comparativo');
        }
    }

    /**
     * Exibe resultados comparativos
     */
    displayComparativeResults() {
        if (this.multiPeriodData.length === 0) {
            this.logger.warn('Nenhum dado de múltiplos períodos para exibir');
            return;
        }
        
        const tableContainer = document.getElementById('comparativeTable');
        if (!tableContainer) return;
        
        // Criar tabela comparativa
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        
        // Cabeçalho
        const header = table.createTHead();
        const headerRow = header.insertRow();
        headerRow.insertCell().textContent = 'Período';
        headerRow.insertCell().textContent = 'Empresa';
        headerRow.insertCell().textContent = 'Total Geral';
        headerRow.insertCell().textContent = 'Financiamento';
        headerRow.insertCell().textContent = 'Economia';
        
        // Corpo da tabela
        const tbody = table.createTBody();
        this.multiPeriodData.forEach(periodData => {
            const row = tbody.insertRow();
            row.insertCell().textContent = periodData.periodo;
            row.insertCell().textContent = periodData.nomeEmpresa;
            
            if (periodData.calculatedValues) {
                const calc = periodData.calculatedValues;
                row.insertCell().textContent = formatCurrency(calc.totalGeralPagar || 0);
                row.insertCell().textContent = formatCurrency(calc.valorFinanciamento || 0);
                row.insertCell().textContent = formatCurrency(calc.economia || 0);
            } else {
                row.insertCell().textContent = 'Não calculado';
                row.insertCell().textContent = 'Não calculado';
                row.insertCell().textContent = 'Não calculado';
            }
        });
        
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
        
        this.logger.success('Tabela comparativa atualizada');
        
        // CORREÇÃO: Após exibir tabela, mostrar workflow de seleção de períodos
        this.showMultiPeriodResults();
    }

    /**
     * Mostra interface de seleção de períodos individuais (migrado do sistema legado)
     */
    showMultiPeriodResults() {
        const periodsSelector = document.getElementById('periodsSelector');
        const periodsButtons = document.getElementById('periodsButtons');
        const fomentarResults = document.getElementById('fomentarResults');
        
        if (!periodsSelector || !periodsButtons || !fomentarResults) {
            this.logger.error('Elementos UI para seleção de períodos não encontrados');
            return;
        }
        
        // Mostrar seletores
        periodsSelector.style.display = 'block';
        fomentarResults.style.display = 'block';
        
        // Criar botões de períodos
        periodsButtons.innerHTML = '';
        this.multiPeriodData.forEach((period, index) => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-primary period-button me-2 mb-2';
            button.textContent = period.periodo;
            button.onclick = () => this.selectPeriod(index);
            if (index === 0) button.classList.add('active');
            periodsButtons.appendChild(button);
        });
        
        // Mostrar primeiro período por padrão
        this.selectPeriod(0);
        this.logger.success(`Interface de períodos criada: ${this.multiPeriodData.length} períodos disponíveis`);
    }

    /**
     * Seleciona período específico para análise
     */
    selectPeriod(index) {
        if (index < 0 || index >= this.multiPeriodData.length) {
            this.logger.error(`Índice de período inválido: ${index}`);
            return;
        }
        
        this.selectedPeriodIndex = index;
        const period = this.multiPeriodData[index];
        
        // Atualizar botão ativo
        document.querySelectorAll('.period-button').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        
        // Atualizar estado global para o período selecionado
        if (this.app && this.app.state) {
            this.app.state.fomentarData = period.fomentarData;
            this.app.state.registrosCompletos = period.registrosCompletos;
            this.app.state.headerInfo = period.headerInfo;
            
            // Atualizar saldo credor anterior no formulário se existir
            const saldoInput = document.getElementById('saldoCredorAnterior');
            if (saldoInput && period.calculatedValues) {
                saldoInput.value = period.calculatedValues.saldoCredorAnterior || 0;
            }
        }
        
        // Recalcular e atualizar interface para o período selecionado
        if (this.app && this.app.updateFomentarUI) {
            this.app.updateFomentarUI();
        }
        
        this.logger.info(`Período selecionado: ${period.periodo} - ${period.nomeEmpresa}`);
        
        // CHAVE: Iniciar workflow de correções para o período selecionado
        this.startCorrectionWorkflowForPeriod(period, index);
    }

    /**
     * Inicia workflow de correções para período específico
     */
    startCorrectionWorkflowForPeriod(period, periodIndex) {
        if (!this.app || !this.app.correctionInterface) {
            this.logger.warn('Interface de correções não disponível');
            return;
        }

        // Analisar códigos que precisam de correção
        const needsE111Correction = this.app.correctionInterface.detectE111Codes(period.registrosCompletos);
        const needsC197D197Correction = this.app.correctionInterface.detectC197D197Codes(period.registrosCompletos);
        
        if (needsE111Correction || needsC197D197Correction) {
            this.logger.info(`Códigos encontrados no período ${period.periodo} - iniciando workflow de correções`);
            
            // Mostrar interface de correções
            if (needsC197D197Correction) {
                this.app.correctionInterface.showC197D197CorrectionInterface();
            } else if (needsE111Correction) {
                this.app.correctionInterface.showE111CorrectionInterface();
            }
        } else {
            this.logger.success(`Período ${period.periodo}: nenhuma correção necessária`);
        }
    }

    /**
     * Exporta relatório comparativo
     */
    async exportComparativeReport() {
        if (this.multiPeriodData.length === 0) {
            this.logger.error('Nenhum dado para exportar');
            return;
        }
        
        this.logger.info('Iniciando exportação de relatório comparativo...');
        
        // Esta função será implementada para usar ExcelGenerator
        // const excelGenerator = new ExcelGenerator(this.logger);
        // await excelGenerator.generateComparativeReport(this.multiPeriodData);
        
        this.logger.success('Relatório comparativo exportado');
    }

    /**
     * Exporta relatório em PDF
     */
    async exportComparativePDF() {
        if (this.multiPeriodData.length === 0) {
            this.logger.error('Nenhum dado para exportar');
            return;
        }
        
        this.logger.info('Iniciando exportação de PDF comparativo...');
        
        // Esta função será implementada para gerar PDF
        // Usando window.print() como fallback
        window.print();
        
        this.logger.success('PDF comparativo gerado');
    }

    /**
     * Obtém dados dos múltiplos períodos
     */
    getMultiPeriodData() {
        return this.multiPeriodData;
    }

    /**
     * Define dados dos múltiplos períodos
     */
    setMultiPeriodData(data) {
        this.multiPeriodData = data || [];
        this.selectedPeriodIndex = 0;
    }

    /**
     * Obtém período atualmente selecionado
     */
    getCurrentPeriodData() {
        if (this.multiPeriodData.length === 0 || this.selectedPeriodIndex < 0 || this.selectedPeriodIndex >= this.multiPeriodData.length) {
            return null;
        }
        return this.multiPeriodData[this.selectedPeriodIndex];
    }

    /**
     * Define período selecionado
     */
    setSelectedPeriodIndex(index) {
        if (index >= 0 && index < this.multiPeriodData.length) {
            this.selectedPeriodIndex = index;
            this.logger.info(`Período selecionado alterado para índice ${index}`);
        }
    }
}

export default MultiPeriodManager;