/**
 * Orquestrador de fluxo de trabalho para processamento SPED
 * Gerencia a sequência: Upload → CFOPs → E111/C197/D197 → Configuração → Processamento → Resultados → Export
 */
export class WorkflowOrchestrator {
    constructor(logger, app) {
        this.logger = logger;
        this.app = app;
        
        // Estados do workflow
        this.currentStep = 'upload';
        this.currentProgram = null; // 'fomentar', 'progoias', 'logproduzir'
        this.workflowData = {};
        
        // Callbacks para cada etapa
        this.stepCallbacks = {
            cfopConfigured: null,
            correctionsApplied: null,
            calculationComplete: null
        };
    }

    /**
     * Inicia um novo workflow para um programa específico
     */
    initializeWorkflow(program, spedData) {
        this.currentProgram = program;
        this.currentStep = 'processing-cfops';
        
        this.workflowData = {
            program,
            spedData,
            cfopConfigurations: {},
            corrections: {
                e111: {},
                c197d197: {},
                cfopsGenericos: {}
            },
            finalCalculation: null
        };

        this.logger.info(`Workflow iniciado para programa: ${program.toUpperCase()}`);
        this.showCurrentStepProgress();
    }

    /**
     * Avança para a próxima etapa do workflow
     */
    proceedToNextStep(currentStepData = null) {
        // Salvar dados da etapa atual
        if (currentStepData) {
            this.saveStepData(this.currentStep, currentStepData);
        }

        const nextStep = this.determineNextStep();
        if (nextStep) {
            this.currentStep = nextStep;
            this.executeCurrentStep();
        } else {
            this.completeWorkflow();
        }
    }

    /**
     * Determina a próxima etapa baseada no estado atual
     */
    determineNextStep() {
        switch (this.currentStep) {
            case 'processing-cfops':
                return 'processing-c197d197';
            case 'processing-c197d197':
                return 'processing-e111';
            case 'processing-e111':
                return 'configuration';
            case 'configuration':
                return 'calculation';
            case 'calculation':
                return 'results';
            case 'results':
                return null; // Workflow completo
            default:
                return null;
        }
    }

    /**
     * Executa a etapa atual do workflow
     */
    executeCurrentStep() {
        this.logger.info(`Executando etapa: ${this.currentStep}`);
        this.showCurrentStepProgress();

        switch (this.currentStep) {
            case 'processing-cfops':
                this.processCfopsStep();
                break;
            case 'processing-c197d197':
                this.processC197D197Step();
                break;
            case 'processing-e111':
                this.processE111Step();
                break;
            case 'configuration':
                this.showConfigurationStep();
                break;
            case 'calculation':
                this.executeCalculationStep();
                break;
            case 'results':
                this.showResultsStep();
                break;
            default:
                this.logger.error(`Etapa desconhecida: ${this.currentStep}`);
        }
    }

    /**
     * Processa CFOPs genéricos
     */
    processCfopsStep() {
        if (!this.app.cfopManager) {
            this.logger.error('CfopManager não disponível');
            this.proceedToNextStep();
            return;
        }

        const cfopResult = this.app.cfopManager.processarCfopsGenericos(
            this.workflowData.spedData.registrosCompletos
        );

        if (cfopResult.needsConfiguration) {
            this.showCfopConfigurationInterface(cfopResult.cfops);
        } else {
            this.workflowData.cfopConfigurations = cfopResult.configurations;
            this.proceedToNextStep();
        }
    }

    /**
     * Processa códigos C197/D197
     */
    processC197D197Step() {
        if (!this.app.correctionInterface) {
            this.logger.error('CorrectionInterface não disponível');
            this.proceedToNextStep();
            return;
        }

        // Detectar códigos C197/D197
        this.app.correctionInterface.detectC197D197Codes(
            this.workflowData.spedData.registrosCompletos
        );

        if (this.app.correctionInterface.foundCodes.c197d197.length > 0) {
            this.showC197D197CorrectionInterface();
        } else {
            this.proceedToNextStep();
        }
    }

    /**
     * Processa códigos E111
     */
    processE111Step() {
        if (!this.app.correctionInterface) {
            this.logger.error('CorrectionInterface não disponível');
            this.proceedToNextStep();
            return;
        }

        // Detectar códigos E111
        this.app.correctionInterface.detectE111Codes(
            this.workflowData.spedData.registrosCompletos
        );

        if (this.app.correctionInterface.foundCodes.e111.length > 0) {
            this.showE111CorrectionInterface();
        } else {
            this.proceedToNextStep();
        }
    }

    /**
     * Mostra interface de configuração de CFOPs
     */
    showCfopConfigurationInterface(cfopsGenericos) {
        const sectionId = `${this.currentProgram}CfopGenericoSection`;
        const section = document.getElementById(sectionId);
        
        if (!section) {
            this.logger.error(`Seção ${sectionId} não encontrada`);
            this.proceedToNextStep();
            return;
        }

        // Usar CfopModal se disponível, senão usar interface básica
        if (this.app.cfopModal) {
            this.app.cfopModal.criarModalCfopsGenericos(
                cfopsGenericos,
                this.currentProgram,
                (configuracao) => this.onCfopConfigurationComplete(configuracao)
            );
        } else {
            this.showBasicCfopInterface(section, cfopsGenericos);
        }
    }

    /**
     * Interface básica de CFOPs (fallback)
     */
    showBasicCfopInterface(section, cfopsGenericos) {
        let html = '<h4>🔧 Configuração de CFOPs Genéricos</h4>';
        html += '<p>Configure os CFOPs genéricos encontrados:</p>';
        
        cfopsGenericos.forEach((cfop, index) => {
            html += `
                <div class="cfop-config-item">
                    <strong>CFOP ${cfop.cfop}</strong> - ${cfop.descricao}
                    <div>
                        <label><input type="radio" name="cfop_${index}" value="incentivado"> Incentivado</label>
                        <label><input type="radio" name="cfop_${index}" value="nao-incentivado"> Não Incentivado</label>
                        <label><input type="radio" name="cfop_${index}" value="padrao" checked> Padrão</label>
                    </div>
                </div>
            `;
        });
        
        html += `
            <div class="workflow-actions">
                <button id="btn${this.currentProgram}AplicarCfops" class="btn btn-primary">Aplicar Configuração</button>
                <button id="btn${this.currentProgram}PularCfops" class="btn btn-secondary">Usar Padrão</button>
            </div>
        `;
        
        section.innerHTML = html;
        section.style.display = 'block';
        
        // Event listeners
        document.getElementById(`btn${this.currentProgram}AplicarCfops`)?.addEventListener('click', () => {
            const config = this.collectCfopConfiguration(cfopsGenericos);
            this.onCfopConfigurationComplete(config);
        });
        
        document.getElementById(`btn${this.currentProgram}PularCfops`)?.addEventListener('click', () => {
            this.onCfopConfigurationComplete({});
        });
    }

    /**
     * Coleta configuração de CFOPs da interface básica
     */
    collectCfopConfiguration(cfopsGenericos) {
        const config = {};
        cfopsGenericos.forEach((cfop, index) => {
            const selected = document.querySelector(`input[name="cfop_${index}"]:checked`);
            if (selected) {
                config[cfop.cfop] = selected.value;
            }
        });
        return config;
    }

    /**
     * Callback quando configuração de CFOPs é concluída
     */
    onCfopConfigurationComplete(configuracao) {
        this.workflowData.cfopConfigurations = configuracao;
        this.hideCurrentStepInterface();
        this.proceedToNextStep();
    }

    /**
     * Mostra interface de correção C197/D197
     */
    showC197D197CorrectionInterface() {
        const sectionId = `${this.currentProgram}CodigoCorrecaoSectionC197D197`;
        const section = document.getElementById(sectionId);
        
        if (!section) {
            this.logger.error(`Seção ${sectionId} não encontrada`);
            this.proceedToNextStep();
            return;
        }

        if (this.app.correctionInterface) {
            this.app.correctionInterface.showC197D197CorrectionInterface();
            
            // Sobrescrever callbacks para integrar com workflow
            this.setupCorrectionCallbacks('c197d197');
        } else {
            this.proceedToNextStep();
        }
    }

    /**
     * Mostra interface de correção E111
     */
    showE111CorrectionInterface() {
        const sectionId = `${this.currentProgram}CodigoCorrecaoSection`;
        const section = document.getElementById(sectionId);
        
        if (!section) {
            this.logger.error(`Seção ${sectionId} não encontrada`);
            this.proceedToNextStep();
            return;
        }

        if (this.app.correctionInterface) {
            this.app.correctionInterface.showE111CorrectionInterface();
            
            // Sobrescrever callbacks para integrar com workflow
            this.setupCorrectionCallbacks('e111');
        } else {
            this.proceedToNextStep();
        }
    }

    /**
     * Configura callbacks para interfaces de correção
     */
    setupCorrectionCallbacks(correctionType) {
        const originalProceed = this.app.correctionInterface.proceedToCalculation;
        
        this.app.correctionInterface.proceedToCalculation = () => {
            // Coletar correções aplicadas
            if (correctionType === 'e111') {
                this.workflowData.corrections.e111 = this.app.correctionInterface.corrections.e111;
            } else if (correctionType === 'c197d197') {
                this.workflowData.corrections.c197d197 = this.app.correctionInterface.corrections.c197d197;
            }
            
            // Restaurar método original
            this.app.correctionInterface.proceedToCalculation = originalProceed;
            
            // Prosseguir no workflow
            this.proceedToNextStep();
        };
    }

    /**
     * Mostra etapa de configuração do programa
     */
    showConfigurationStep() {
        const configSectionId = `${this.currentProgram}ConfigSection`;
        const configSection = document.getElementById(configSectionId);
        
        if (configSection) {
            configSection.style.display = 'block';
            this.logger.info(`Seção de configuração ${this.currentProgram} exibida`);
        }

        // Auto-prosseguir para cálculo (configurações já devem estar definidas)
        setTimeout(() => {
            this.proceedToNextStep();
        }, 500);
    }

    /**
     * Executa o cálculo do programa
     */
    executeCalculationStep() {
        this.logger.info(`Executando cálculo para ${this.currentProgram}`);
        
        try {
            if (this.currentProgram === 'fomentar') {
                this.executeFomentarCalculation();
            } else if (this.currentProgram === 'progoias') {
                this.executeProgoiasCalculation();
            } else if (this.currentProgram === 'logproduzir') {
                this.executeLogproduzirCalculation();
            }
        } catch (error) {
            this.logger.error(`Erro no cálculo ${this.currentProgram}: ${error.message}`);
            this.handleWorkflowError(error);
        }
    }

    /**
     * Executa cálculo FOMENTAR
     */
    executeFomentarCalculation() {
        if (!this.app.fomentarCalculator) {
            throw new Error('FomentarCalculator não disponível');
        }

        // Aplicar correções aos registros se necessário
        let registros = this.workflowData.spedData.registrosCompletos;
        
        if (Object.keys(this.workflowData.corrections.e111).length > 0) {
            registros = this.app.fomentarCalculator.applyE111Corrections(
                registros, 
                this.workflowData.corrections.e111
            );
        }
        
        if (Object.keys(this.workflowData.corrections.c197d197).length > 0) {
            registros = this.app.fomentarCalculator.applyC197D197Corrections(
                registros, 
                this.workflowData.corrections.c197d197
            );
        }

        // Classificar operações
        const operacoes = this.app.fomentarCalculator.classifyOperations(
            registros,
            this.workflowData.cfopConfigurations
        );

        // Obter configurações
        const configuracoes = this.app.getFomentarConfig();

        // Calcular
        const resultado = this.app.fomentarCalculator.calculateFomentar(operacoes, configuracoes);
        
        this.workflowData.finalCalculation = resultado;
        this.proceedToNextStep();
    }

    /**
     * Executa cálculo ProGoiás (placeholder)
     */
    executeProgoiasCalculation() {
        this.logger.info('Executando cálculo ProGoiás (implementação pendente)');
        // TODO: Implementar cálculo ProGoiás
        this.proceedToNextStep();
    }

    /**
     * Executa cálculo LogPRODUZIR (placeholder)
     */
    executeLogproduzirCalculation() {
        this.logger.info('Executando cálculo LogPRODUZIR (implementação pendente)');
        // TODO: Implementar cálculo LogPRODUZIR
        this.proceedToNextStep();
    }

    /**
     * Mostra resultados do cálculo
     */
    showResultsStep() {
        this.logger.success(`Cálculo ${this.currentProgram} concluído com sucesso!`);
        
        // Exibir seções de resultados e processamento
        const processingSectionId = `${this.currentProgram}ProcessingSection`;
        const processingSection = document.getElementById(processingSectionId);
        
        if (processingSection) {
            processingSection.style.display = 'block';
            this.logger.info(`Seção de processamento ${this.currentProgram} exibida`);
        }

        // Atualizar interface com resultados
        if (this.workflowData.finalCalculation) {
            this.updateResultsInterface();
        }

        this.completeWorkflow();
    }

    /**
     * Atualiza interface com resultados do cálculo
     */
    updateResultsInterface() {
        // Esta funcionalidade será expandida conforme necessário
        this.logger.info('Interface de resultados atualizada');
    }

    /**
     * Completa o workflow
     */
    completeWorkflow() {
        this.currentStep = 'completed';
        this.logger.success(`Workflow ${this.currentProgram} concluído com sucesso!`);
        
        if (this.stepCallbacks.calculationComplete) {
            this.stepCallbacks.calculationComplete(this.workflowData.finalCalculation);
        }
    }

    /**
     * Trata erros no workflow
     */
    handleWorkflowError(error) {
        this.logger.error(`Erro no workflow: ${error.message}`);
        this.currentStep = 'error';
        
        // Exibir mensagem de erro na interface
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <h4>Erro no Processamento</h4>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Reiniciar</button>
        `;
        
        document.body.appendChild(errorDiv);
    }

    /**
     * Salva dados da etapa atual
     */
    saveStepData(step, data) {
        this.workflowData[`${step}_data`] = data;
        this.logger.info(`Dados da etapa ${step} salvos`);
    }

    /**
     * Esconde interface da etapa atual
     */
    hideCurrentStepInterface() {
        const stepSections = [
            `${this.currentProgram}CfopGenericoSection`,
            `${this.currentProgram}CodigoCorrecaoSection`,
            `${this.currentProgram}CodigoCorrecaoSectionC197D197`,
            'cfopGenericoModal'
        ];
        
        stepSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    /**
     * Mostra progresso da etapa atual
     */
    showCurrentStepProgress() {
        const stepNames = {
            'upload': 'Upload de Arquivo',
            'processing-cfops': 'Processando CFOPs Genéricos',
            'processing-c197d197': 'Processando Códigos C197/D197',
            'processing-e111': 'Processando Códigos E111',
            'configuration': 'Configuração',
            'calculation': 'Executando Cálculo',
            'results': 'Exibindo Resultados',
            'completed': 'Concluído'
        };
        
        const stepName = stepNames[this.currentStep] || this.currentStep;
        this.logger.info(`📋 Etapa atual: ${stepName}`);
    }

    /**
     * Reinicia o workflow
     */
    resetWorkflow() {
        this.currentStep = 'upload';
        this.currentProgram = null;
        this.workflowData = {};
        this.hideCurrentStepInterface();
        this.logger.info('Workflow reiniciado');
    }

    /**
     * Obtém estado atual do workflow
     */
    getWorkflowState() {
        return {
            currentStep: this.currentStep,
            currentProgram: this.currentProgram,
            hasData: Object.keys(this.workflowData).length > 0,
            isComplete: this.currentStep === 'completed'
        };
    }

    /**
     * Define callbacks para etapas específicas
     */
    setStepCallback(step, callback) {
        this.stepCallbacks[step] = callback;
    }
}

export default WorkflowOrchestrator;