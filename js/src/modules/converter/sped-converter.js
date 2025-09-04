/**
 * SpedConverter - Módulo de conversão SPED para Excel
 * 
 * Baseado no código aprovado de /Users/ceciliodaher/Documents/git/sped-web/script.js
 * Adaptado para arquitetura ES6 modular com integração ao StateManager
 * 
 * @module modules/converter/sped-converter
 */

import { APP_CONFIG, SPED_LAYOUTS } from '../../core/constants.js';

export class SpedConverter {
    constructor(logger, stateManager, uiManager, spedParser) {
        this.logger = logger;
        this.stateManager = stateManager;
        this.uiManager = uiManager;
        this.spedParser = spedParser;
    }

    /**
     * Execução principal da conversão SPED → Excel
     * Baseado na função iniciarConversao() do sped-web aprovado
     */
    async executeConversion() {
        try {
            this.logger.info('CONVERSOR: Iniciando processo de conversão...');
            
            // Atualizar estado do conversor
            this.stateManager.updateState({
                converter: {
                    isProcessing: true,
                    progress: 0,
                    status: 'processing'
                }
            });

            // Obter e processar arquivo SPED
            await this.processSpedFile();

            // Obter nome do arquivo Excel
            const excelFileNameInput = document.getElementById('excelFileName');
            let outputFileName = excelFileNameInput?.value?.trim() || 'SPED_convertido';
            if (!outputFileName.toLowerCase().endsWith('.xlsx')) {
                outputFileName += '.xlsx';
            }

            // Atualizar estado com arquivo de saída
            this.stateManager.updateState({
                converter: { outputFileName, progress: 10 }
            });

            this.logger.info(`CONVERSOR: Iniciando conversão para: ${outputFileName}`);

            // Executar conversão usando o fluxo aprovado
            await this.converter(outputFileName);

            // Finalizar conversão
            this.stateManager.updateState({
                converter: {
                    isProcessing: false,
                    progress: 100,
                    status: 'completed'
                }
            });

            this.logger.success('CONVERSOR: Conversão concluída com sucesso!');
            return true;

        } catch (error) {
            this.logger.error(`CONVERSOR: Erro na conversão: ${error.message}`);
            this.stateManager.updateState({
                converter: { isProcessing: false, status: 'error' }
            });
            throw error;
        }
    }

    /**
     * Processa arquivo SPED para conversão
     */
    async processSpedFile() {
        try {
            // Obter arquivo SPED do estado da aplicação
            const file = window.spedApp?.state?.currentFile;
            
            if (!file) {
                throw new Error('Nenhum arquivo SPED selecionado');
            }

            this.logger.info(`CONVERSOR: Processando arquivo: ${file.name}`);
            
            // Atualizar estado com arquivo selecionado
            this.stateManager.updateState({
                sped: { file }
            });
            
            // Ler arquivo como ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Detectar encoding e ler conteúdo
            const { encoding, content } = await this.spedParser.detectAndRead(arrayBuffer);
            
            // Extrair informações do header
            const registrosHeader = this.spedParser.lerArquivoSpedParaHeader(content);
            const headerInfo = this.spedParser.extrairInformacoesHeader(registrosHeader);
            
            // Atualizar estado com conteúdo processado
            this.stateManager.updateState({
                sped: {
                    content,
                    encoding,
                    headerInfo
                }
            });
            
            this.logger.info(`CONVERSOR: Arquivo processado - Empresa: ${headerInfo.nomeEmpresa}, Período: ${headerInfo.periodo}`);
            
        } catch (error) {
            this.logger.error(`CONVERSOR: Erro ao processar arquivo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Função converter() baseada no sped-web aprovado
     * Migrada de sped-web/script.js (linha 374)
     */
    async converter(caminhoExcel) {
        try {
            this.uiManager.updateStatus('Processando arquivo SPED...', 10);
            await new Promise(resolve => setTimeout(resolve, 200));

            // Obter conteúdo SPED do estado
            const spedContent = this.stateManager.getState('sped.content');
            if (!spedContent) {
                throw new Error('Conteúdo SPED não encontrado no estado');
            }

            await this.processarSpedParaExcel(spedContent, caminhoExcel);

        } catch (error) {
            this.logger.error(`CONVERSOR: Erro durante a conversão: ${error.message}`);
            
            // Só chama conversaoConcluida se não foi chamado pelos sub-processos
            const statusMessage = document.getElementById('statusMessage');
            if (!statusMessage?.textContent.includes("Erro na conversão") && 
                !statusMessage?.textContent.includes("sucesso")) {
                this.uiManager.conversaoConcluida(false, error.message);
            }
            throw error;
        }
    }

    /**
     * Função processarSpedParaExcel() baseada no sped-web aprovado
     * Migrada de sped-web/script.js (linha 401)
     */
    async processarSpedParaExcel(fileContent, caminhoSaidaExcel) {
        try {
            this.uiManager.updateStatus('Lendo e normalizando registros SPED...', 20);
            this.logger.info('CONVERSOR: Lendo e normalizando todos os registros SPED...');
            await new Promise(resolve => setTimeout(resolve, 100));

            const registros = this.lerArquivoSpedCompleto(fileContent);
            this.logger.info(`CONVERSOR: Total de ${Object.keys(registros).length} tipos de registros lidos.`);

            // Obter informações do header do estado
            const headerInfo = this.stateManager.getState('sped.headerInfo');
            const nomeEmpresa = headerInfo?.nomeEmpresa || 'Empresa';
            const periodo = headerInfo?.periodo || '';

            this.uiManager.updateStatus('Gerando arquivo Excel...', 50);
            this.logger.info('CONVERSOR: Iniciando geração do arquivo Excel...');
            await new Promise(resolve => setTimeout(resolve, 100));

            await this.gerarExcel(registros, nomeEmpresa, periodo, caminhoSaidaExcel);

        } catch (error) {
            this.logger.error(`CONVERSOR: Falha em processarSpedParaExcel: ${error.message}`);
            this.uiManager.conversaoConcluida(false, `Falha na geração do Excel: ${error.message}`);
            throw error;
        }
    }

    /**
     * Função lerArquivoSpedCompleto() baseada no sped-web aprovado
     * Migrada de sped-web/script.js (linha 427)
     */
    lerArquivoSpedCompleto(fileContent) {
        const registros = {};
        const linhas = fileContent.split('\n');

        for (let linha of linhas) {
            linha = linha.trim();
            if (linha && linha.startsWith('|') && linha.endsWith('|')) {
                const campos = linha.split('|');
                const tipoRegistro = campos[1];
                
                if (tipoRegistro) {
                    if (!registros[tipoRegistro]) {
                        registros[tipoRegistro] = [];
                    }
                    registros[tipoRegistro].push(linha);
                }
            }
        }

        // Atualizar estado com registros processados
        this.stateManager.updateState({
            sped: { registrosCompletos: registros }
        });

        return registros;
    }

    /**
     * Função gerarExcel() baseada no sped-web aprovado
     * Migrada de sped-web/script.js (linha 455)
     */
    async gerarExcel(registros, nomeEmpresa, periodo, caminhoSaida) {
        try {
            this.uiManager.updateStatus('Preparando dados para Excel...', 60);

            // Criar workbook usando XlsxPopulate (como no sped-web aprovado)
            const workbook = await XlsxPopulate.fromBlankAsync();
            this.logger.info('CONVERSOR: Novo workbook Excel criado.');

            // Criar contexto como no sped-web aprovado
            const context = {
                registros, 
                workbook,
                writer: workbook, 
                obterLayoutRegistro: this.obterLayoutRegistro.bind(this), 
                logger: { 
                    info: (msg) => this.logger.info(`CONVERSOR: ${msg}`),
                    error: (msg) => this.logger.error(`CONVERSOR: ${msg}`),
                    warn: (msg) => this.logger.warn(`CONVERSOR: ${msg}`)
                },
                ajustarColunas: this._ajustarColunas.bind(this), 
                formatarPlanilha: this._formatarPlanilha.bind(this), 
                nomeEmpresa,
                periodo,
                addLog: (msg, type) => this.logger.log(type, `CONVERSOR: ${msg}`)
            };

            this.uiManager.updateStatus('Processando registros principais...', 70);
            this.logger.info('CONVERSOR: Processando registros principais para abas individuais...');
            await this._processarRegistros(context);
            this.logger.info('CONVERSOR: Registros principais processados.');

            this.uiManager.updateStatus('Criando aba consolidada...', 80);
            this.logger.info('CONVERSOR: Criando aba consolidada...');
            await this._criarAbaConsolidada(context);
            this.logger.info('CONVERSOR: Aba consolidada criada.');

            this.uiManager.updateStatus('Processando outras obrigações...', 85);
            this.logger.info('CONVERSOR: Processando outras obrigações (C197/D197)...');
            await this._processarOutrasObrigacoes(context);
            this.logger.info('CONVERSOR: Outras obrigações processadas.');

            // Remove a aba padrão criada automaticamente
            try {
                const defaultSheet = workbook.sheet(0);
                if (defaultSheet && (defaultSheet.name() === 'Sheet1' || defaultSheet.name() === 'Sheet')) {
                    workbook.deleteSheet(defaultSheet);
                }
            } catch (e) {
                // Se não conseguir deletar, apenas continua
            }

            this.uiManager.updateStatus('Finalizando arquivo Excel...', 95);
            this.logger.info('CONVERSOR: Gerando blob do arquivo Excel...');
            const excelData = await workbook.outputAsync();
            const blob = new Blob([excelData], { 
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
            });

            this.logger.info('CONVERSOR: Iniciando download do arquivo Excel...');
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = caminhoSaida;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            this.uiManager.conversaoConcluida(true, caminhoSaida);

        } catch (error) {
            this.logger.error(`CONVERSOR: Erro em gerarExcel: ${error.message}`);
            this.uiManager.conversaoConcluida(false, `Erro ao gerar Excel: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obter layout do registro SPED
     * Baseado na função obterLayoutRegistro() do sped-web
     */
    obterLayoutRegistro(tipoRegistro) {
        return SPED_LAYOUTS[tipoRegistro] || ['REG', 'DADOS'];
    }

    /**
     * Processa registros principais para abas individuais
     * Migrado de sped-web/script.js (função _processarRegistros)
     */
    async _processarRegistros(context) {
        const { registros, writer, obterLayoutRegistro, logger, ajustarColunas, formatarPlanilha } = context;
        
        const ordemBlocos = ['0', 'B', 'C', 'D', 'E', 'G', 'H', 'K', '1', '9'];
        let registrosOrdenados = [];

        for (const bloco of ordemBlocos) {
            let registrosBloco = Object.entries(registros)
                .filter(([k, v]) => k.startsWith(bloco))
                .sort(([ka], [kb]) => ka.localeCompare(kb));
            registrosOrdenados.push(...registrosBloco);
        }

        let outrosRegistros = Object.entries(registros)
            .filter(([k, v]) => !ordemBlocos.some(b => k.startsWith(b)))
            .sort(([ka], [kb]) => ka.localeCompare(kb));
        registrosOrdenados.push(...outrosRegistros);
        
        context.e110E111Processado = false;

        for (const [tipoRegistro, linhas] of registrosOrdenados) {
            if (!linhas || linhas.length === 0) continue;

            try {
                const dadosParaDf = linhas.map(linhaCompleta => linhaCompleta.split('|').slice(1, -1));
                
                if (dadosParaDf.length === 0 || dadosParaDf[0].length === 0) continue;

                let colunasNomes = obterLayoutRegistro(tipoRegistro);
                if (colunasNomes) {
                    colunasNomes = ajustarColunas(dadosParaDf[0].length, colunasNomes);
                } else {
                    colunasNomes = Array.from({ length: dadosParaDf[0].length }, (_, i) => `Campo_${i + 1}`);
                }

                const sheetName = tipoRegistro.substring(0, 31);
                const worksheet = writer.addSheet(sheetName);

                // Header style
                const headerStyle = { bold: true, fill: "D7E4BC", border: true };
                colunasNomes.forEach((colName, colIdx) => {
                    worksheet.cell(1, colIdx + 1).value(colName).style(headerStyle);
                });

                // Data
                dadosParaDf.forEach((row, rowIdx) => {
                    row.forEach((cellValue, colIdx) => {
                        let finalValue = cellValue;
                        const isNumericField = colunasNomes[colIdx] && 
                            (colunasNomes[colIdx].startsWith('VL_') || 
                             colunasNomes[colIdx].startsWith('ALIQ_') || 
                             colunasNomes[colIdx].startsWith('QTD'));
                        if (isNumericField && typeof cellValue === 'string' && cellValue.trim() !== '') {
                            const num = parseFloat(cellValue.replace(',', '.'));
                            if (!isNaN(num)) {
                                finalValue = num;
                            }
                        }
                        worksheet.cell(rowIdx + 2, colIdx + 1).value(finalValue);
                    });
                });
                
                formatarPlanilha(worksheet, colunasNomes, dadosParaDf);

            } catch (e) {
                logger.error(`Erro ao processar registro ${tipoRegistro} em _processarRegistros: ${e.message}`);
                console.error(e);
            }
        }
        logger.info(`Registros processados: ${registrosOrdenados.map(r => r[0]).join(', ')}`);
    }

    /**
     * Cria aba consolidada fiscal
     * Migrado de sped-web/script.js (função _criarAbaConsolidada)
     */
    async _criarAbaConsolidada(context) {
        const { registros, writer, logger, nomeEmpresa, periodo, obterLayoutRegistro } = context;
        logger.info("Iniciando _criarAbaConsolidada...");

        try {
            const worksheet = writer.addSheet('Consolidado_Fiscal');
            
            const mainHeaderStyle = { bold: true, horizontalAlignment: "center", fill: "D7E4BC", border: true };
            const headerStyle = { bold: true, fill: "D7E4BC", border: true };
            const numStyle = { numberFormat: "#,##0.00", border: true };
            const codeStyle = { numberFormat: "0", border: true };
            const dateStyle = { numberFormat: "dd/mm/yyyy", border: true };
            const cellStyle = { border: true };

            let cnpj = "";
            if (registros['0000'] && registros['0000'][0]) {
                const campos0000 = registros['0000'][0].split('|');
                if (campos0000.length > 7) {
                    cnpj = campos0000[7];
                }
            }
            const empresaCnpj = cnpj ? `${nomeEmpresa} - CNPJ: ${cnpj}` : nomeEmpresa;
            worksheet.range("A1:L1").merged(true).value(empresaCnpj).style(mainHeaderStyle);

            const colunasOrdem = ['Data', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS',
                                 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI',
                                 'COD_OBS', 'Tipo_Registro'];

            colunasOrdem.forEach((colName, idx) => {
                worksheet.cell(3, idx + 1).value(colName).style(headerStyle);
            });

            let dataSped = null;
            if (registros['0000'] && registros['0000'][0]) {
                const campos0000 = registros['0000'][0].split('|');
                if (campos0000.length > 4) {
                    const dataStr = campos0000[4];
                    if (dataStr && dataStr.length === 8) {
                        const dia = dataStr.substring(0, 2);
                        const mes = dataStr.substring(2, 4);
                        const ano = dataStr.substring(4, 8);
                        dataSped = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                    }
                }
            }

            let currentRow = 4;
            const registrosDadosConsolidados = []; 

            const tiposRegConsolidado = ['C190', 'C590', 'D190', 'D590'];
            tiposRegConsolidado.forEach(tipoReg => {
                if (registros[tipoReg]) {
                    const layout = obterLayoutRegistro(tipoReg);
                    if (!layout) {
                        logger.warn(`Layout não encontrado para o registro ${tipoReg} na aba consolidada.`);
                        return;
                    }
                    
                    const getValue = (dadosRegistro, fieldName, defaultValue = 0, isNumeric = true) => {
                        const index = layout.indexOf(fieldName);
                        if (index === -1 || index >= dadosRegistro.length || dadosRegistro[index] === '') {
                            return defaultValue;
                        }
                        const val = dadosRegistro[index];
                        if (isNumeric) {
                            const num = parseFloat(String(val).replace(',', '.'));
                            return isNaN(num) ? defaultValue : num;
                        }
                        return val;
                    };

                    registros[tipoReg].forEach(linhaCompleta => {
                        const dados = linhaCompleta.split('|').slice(1, -1);

                        const registroConsolidado = {
                            'Data': dataSped,
                            'CST_ICMS': parseInt(getValue(dados, 'CST_ICMS', '0', false)) || 0,
                            'CFOP': parseInt(getValue(dados, 'CFOP', '0', false)) || 0,
                            'ALIQ_ICMS': getValue(dados, 'ALIQ_ICMS', 0),
                            'VL_OPR': getValue(dados, 'VL_OPR', 0),
                            'VL_BC_ICMS': getValue(dados, 'VL_BC_ICMS', 0),
                            'VL_ICMS': getValue(dados, 'VL_ICMS', 0),
                            'VL_BC_ICMS_ST': getValue(dados, 'VL_BC_ICMS_ST', 0),
                            'VL_ICMS_ST': getValue(dados, 'VL_ICMS_ST', 0),
                            'VL_RED_BC': getValue(dados, 'VL_RED_BC', 0),
                            'VL_IPI': getValue(dados, 'VL_IPI', 0),
                            'COD_OBS': getValue(dados, 'COD_OBS', '', false),
                            'Tipo_Registro': tipoReg
                        };
                        registrosDadosConsolidados.push(registroConsolidado);

                        worksheet.cell(currentRow, 1).value(registroConsolidado.Data).style(dateStyle);
                        worksheet.cell(currentRow, 2).value(registroConsolidado.CST_ICMS).style(codeStyle);
                        worksheet.cell(currentRow, 3).value(registroConsolidado.CFOP).style(codeStyle);
                        worksheet.cell(currentRow, 4).value(registroConsolidado.ALIQ_ICMS).style(numStyle);
                        worksheet.cell(currentRow, 5).value(registroConsolidado.VL_OPR).style(numStyle);
                        worksheet.cell(currentRow, 6).value(registroConsolidado.VL_BC_ICMS).style(numStyle);
                        worksheet.cell(currentRow, 7).value(registroConsolidado.VL_ICMS).style(numStyle);
                        worksheet.cell(currentRow, 8).value(registroConsolidado.VL_BC_ICMS_ST).style(numStyle);
                        worksheet.cell(currentRow, 9).value(registroConsolidado.VL_ICMS_ST).style(numStyle);
                        worksheet.cell(currentRow, 10).value(registroConsolidado.VL_RED_BC).style(numStyle);
                        worksheet.cell(currentRow, 11).value(registroConsolidado.VL_IPI).style(numStyle);
                        worksheet.cell(currentRow, 12).value(registroConsolidado.COD_OBS).style(cellStyle);
                        worksheet.cell(currentRow, 13).value(registroConsolidado.Tipo_Registro).style(cellStyle);
                        currentRow++;
                    });
                }
            });

            // Tabela de Conferência
            const ultimaColunaDados = colunasOrdem.length;
            const inicioConferenciaCol = ultimaColunaDados + 2;
            const linhaInicioConferencia = 3;

            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol).value("Tipo de Registro").style(headerStyle);
            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol + 1).value("Registros na Origem").style(headerStyle);
            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol + 2).value("Registros Consolidados").style(headerStyle);
            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol + 3).value("Status").style(headerStyle);

            const statusOkStyle = { border: true, fill: "C6EFCE", fontColor: "006100", bold: true };
            const statusDivergenteStyle = { border: true, fill: "FFC7CE", fontColor: "9C0006", bold: true };
            const intStyle = { numberFormat: "#,##0", border: true };

            let linhaAtualConf = linhaInicioConferencia + 1;
            tiposRegConsolidado.forEach(tipoReg => {
                const qtdOrigem = registros[tipoReg] ? registros[tipoReg].length : 0;
                const qtdConsolidado = registrosDadosConsolidados.filter(r => r.Tipo_Registro === tipoReg).length;
                const status = (qtdOrigem === qtdConsolidado) ? "OK" : "DIVERGENTE";
                const statusStyleToApply = (status === "OK") ? statusOkStyle : statusDivergenteStyle;

                worksheet.cell(linhaAtualConf, inicioConferenciaCol).value(tipoReg).style(cellStyle);
                worksheet.cell(linhaAtualConf, inicioConferenciaCol + 1).value(qtdOrigem).style(intStyle);
                worksheet.cell(linhaAtualConf, inicioConferenciaCol + 2).value(qtdConsolidado).style(intStyle);
                worksheet.cell(linhaAtualConf, inicioConferenciaCol + 3).value(status).style(statusStyleToApply);
                linhaAtualConf++;
            });

            // Ajustar larguras das colunas
            for (let i = 1; i <= ultimaColunaDados; i++) worksheet.column(i).width(15);
            worksheet.column(inicioConferenciaCol).width(20);
            worksheet.column(inicioConferenciaCol + 1).width(20);
            worksheet.column(inicioConferenciaCol + 2).width(22);
            worksheet.column(inicioConferenciaCol + 3).width(15);

            logger.info("_criarAbaConsolidada concluída.");
        } catch (e) {
            logger.error(`Erro em _criarAbaConsolidada: ${e.message}`);
            console.error(e);
            throw e;
        }
    }

    /**
     * Processa outras obrigações (C197/D197)
     * Migrado de sped-web/script.js (função _processarOutrasObrigacoes)
     */
    async _processarOutrasObrigacoes(context) {
        const { registros, writer, logger } = context;
        logger.info("Iniciando _processarOutrasObrigacoes...");

        try {
            const layout197 = ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM',
                               'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS'];
            const registros197Data = [];

            ['C197', 'D197'].forEach(tipoReg => {
                if (registros[tipoReg]) {
                    registros[tipoReg].forEach(linhaCompleta => {
                        const registro = linhaCompleta.split('|').slice(1, -1);
                        const paddedRegistro = [...registro];
                        while (paddedRegistro.length < layout197.length) {
                            paddedRegistro.push('');
                        }
                        registros197Data.push(paddedRegistro.slice(0, layout197.length));
                    });
                }
            });

            if (registros197Data.length > 0) {
                const worksheet = writer.addSheet('Outras_Obrigacoes_197');
                const headerStyle = { bold: true, fill: "D7E4BC", border: true, wrapText: true, verticalAlignment: 'top' };
                const numStyle = { numberFormat: "#,##0.00", border: true };
                const defaultCellStyle = { border: true };

                layout197.forEach((header, idx) => {
                    worksheet.cell(1, idx + 1).value(header).style(headerStyle);
                });

                const camposNumericosIndices = [4, 5, 6, 7];

                registros197Data.forEach((row, rowIdx) => {
                    row.forEach((value, colIdx) => {
                        let cellValue = value;
                        let currentStyle = defaultCellStyle;

                        if (camposNumericosIndices.includes(colIdx)) {
                            if (String(value).trim() !== '') {
                                const num = parseFloat(String(value).replace(',', '.'));
                                cellValue = isNaN(num) ? 0 : num;
                            } else {
                                cellValue = 0;
                            }
                            currentStyle = numStyle;
                        }
                        worksheet.cell(rowIdx + 2, colIdx + 1).value(cellValue).style(currentStyle);
                    });
                });
                
                // Auto width
                layout197.forEach((col, i) => worksheet.column(i + 1).width(Math.max(col.length, 15) + 2));
            }

            logger.info("_processarOutrasObrigacoes concluída.");
        } catch (e) {
            logger.error(`Erro em _processarOutrasObrigacoes: ${e.message}`);
            console.error(e);
            throw e;
        }
    }

    /**
     * Ajusta colunas para o layout correto
     * Migrado de sped-web/script.js (função _ajustarColunas)
     */
    _ajustarColunas(dfWidth, colunasOriginal) {
        let colunas = [...colunasOriginal];
        if (colunas.length > dfWidth) {
            return colunas.slice(0, dfWidth);
        } else if (colunas.length < dfWidth) {
            for (let i = colunas.length; i < dfWidth; i++) {
                colunas.push(`Campo_${i + 1}`);
            }
        }
        return colunas;
    }

    /**
     * Formata planilha com larguras de coluna adequadas
     * Migrado de sped-web/script.js (função _formatarPlanilha)
     */
    _formatarPlanilha(worksheet, columns, data) {
        columns.forEach((colName, colIdx) => {
            let maxLength = colName.length;
            data.forEach(row => {
                const cellValue = row[colIdx];
                if (cellValue !== null && cellValue !== undefined) {
                    const cellLength = String(cellValue).length;
                    if (cellLength > maxLength) {
                        maxLength = cellLength;
                    }
                }
            });
            worksheet.column(colIdx + 1).width(Math.min(maxLength + 5, 50));
        });
    }
}

export default SpedConverter;