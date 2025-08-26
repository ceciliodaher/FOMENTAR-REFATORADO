/**
 * Módulo para gerenciar modais de configuração de CFOPs genéricos
 */
export class CfopModal {
    constructor(logger, cfopManager) {
        this.logger = logger;
        this.cfopManager = cfopManager;
        this.currentModal = null;
        this.currentProgram = null;
        this.onConfigurationComplete = null;
    }

    /**
     * Cria e exibe modal para configuração de CFOPs genéricos
     */
    criarModalCfopsGenericos(cfopsGenericos, program = 'fomentar', onComplete = null) {
        this.currentProgram = program;
        this.onConfigurationComplete = onComplete;

        if (cfopsGenericos.length === 0) {
            this.logger.info('Nenhum CFOP genérico para configurar');
            if (onComplete) onComplete({});
            return;
        }

        this.logger.info(`Criando modal para ${cfopsGenericos.length} CFOPs genéricos - Programa: ${program}`);

        // Remover modal existente se houver
        this.removerModalExistente();

        // Criar estrutura do modal
        const modalHtml = this.gerarHtmlModal(cfopsGenericos, program);
        
        // Inserir no DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Configurar event listeners
        this.configurarEventListeners();
        
        // Exibir modal
        this.currentModal = document.getElementById('cfopGenericoModal');
        if (this.currentModal) {
            this.currentModal.style.display = 'block';
            this.logger.success('Modal de CFOPs genéricos exibido');
        }
    }

    /**
     * Gera HTML do modal
     */
    gerarHtmlModal(cfopsGenericos, program) {
        const programTitle = program.toUpperCase();
        
        let cfopItemsHtml = '';
        cfopsGenericos.forEach((cfopInfo, index) => {
            cfopItemsHtml += this.gerarItemCfop(cfopInfo, index);
        });

        return `
            <div id="cfopGenericoModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
                <div class="modal-content" style="background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; border-radius: 10px; width: 80%; max-width: 900px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007bff; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="color: #007bff; margin: 0;">
                            <i class="fas fa-cogs"></i> Configuração de CFOPs Genéricos - ${programTitle}
                        </h2>
                        <span class="close" style="color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="this.parentElement.parentElement.parentElement.style.display='none';">&times;</span>
                    </div>
                    
                    <div class="modal-body">
                        <div class="alert alert-info" style="background-color: #d1ecf1; border: 1px solid #b8daff; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>CFOPs Genéricos Encontrados:</strong> Os seguintes CFOPs genéricos foram identificados no SPED. 
                            Configure se devem ser tratados como <strong>incentivados</strong> ou <strong>não incentivados</strong> para o programa ${programTitle}.
                        </div>
                        
                        <div class="cfops-container" style="max-height: 400px; overflow-y: auto;">
                            ${cfopItemsHtml}
                        </div>
                        
                        <div class="configuracao-global" style="border-top: 2px solid #dee2e6; padding-top: 20px; margin-top: 20px;">
                            <h5><i class="fas fa-magic"></i> Configuração Rápida</h5>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button id="btnTodosIncentivados" class="btn btn-success btn-sm">
                                    <i class="fas fa-check-double"></i> Todos Incentivados
                                </button>
                                <button id="btnTodosNaoIncentivados" class="btn btn-warning btn-sm">
                                    <i class="fas fa-times-circle"></i> Todos Não Incentivados
                                </button>
                                <button id="btnConfiguracaoPadrao" class="btn btn-info btn-sm">
                                    <i class="fas fa-book"></i> Configuração Normativa
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer" style="border-top: 2px solid #dee2e6; padding-top: 15px; margin-top: 20px; text-align: right;">
                        <button id="btnSalvarConfiguracao" class="btn btn-primary" style="margin-right: 10px;">
                            <i class="fas fa-save"></i> Salvar Configuração
                        </button>
                        <button id="btnConfiguracaoAutomatica" class="btn btn-secondary" style="margin-right: 10px;">
                            <i class="fas fa-magic"></i> Configuração Automática
                        </button>
                        <button id="btnCancelar" class="btn btn-outline-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Gera HTML para um item de CFOP
     */
    gerarItemCfop(cfopInfo, index) {
        const valorOperacaoFormatted = cfopInfo.valorOperacao.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const valorIcmsFormatted = cfopInfo.valorIcms.toLocaleString('pt-BR', {
            style: 'currency', 
            currency: 'BRL'
        });

        return `
            <div class="cfop-item" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f8f9fa;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div class="cfop-info" style="flex: 1;">
                        <h5 style="color: #495057; margin-bottom: 10px;">
                            <span class="badge badge-primary" style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px;">
                                CFOP ${cfopInfo.cfop}
                            </span>
                            <small style="color: #6c757d; margin-left: 10px;">(${cfopInfo.tipoOperacao})</small>
                        </h5>
                        <p style="margin-bottom: 8px; font-size: 14px; color: #6c757d;">
                            <strong>Descrição:</strong> ${cfopInfo.descricao}
                        </p>
                        <div style="display: flex; gap: 20px; font-size: 13px; color: #6c757d;">
                            <span><i class="fas fa-chart-line"></i> <strong>Valor Operação:</strong> ${valorOperacaoFormatted}</span>
                            <span><i class="fas fa-money-bill-wave"></i> <strong>ICMS:</strong> ${valorIcmsFormatted}</span>
                            <span><i class="fas fa-file-alt"></i> <strong>Registro:</strong> ${cfopInfo.tipoRegistro}</span>
                        </div>
                    </div>
                    
                    <div class="cfop-opcoes" style="display: flex; flex-direction: column; gap: 8px; min-width: 200px;">
                        <label style="display: flex; align-items: center; cursor: pointer; font-size: 14px;">
                            <input type="radio" name="cfop_${index}" value="incentivado" style="margin-right: 8px;">
                            <span class="text-success"><i class="fas fa-check-circle"></i> Incentivado</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer; font-size: 14px;">
                            <input type="radio" name="cfop_${index}" value="nao-incentivado" style="margin-right: 8px;">
                            <span class="text-warning"><i class="fas fa-exclamation-circle"></i> Não Incentivado</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer; font-size: 14px;">
                            <input type="radio" name="cfop_${index}" value="padrao" checked style="margin-right: 8px;">
                            <span class="text-info"><i class="fas fa-book"></i> Padrão (Normativa)</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configura event listeners do modal
     */
    configurarEventListeners() {
        // Botões de configuração rápida
        document.getElementById('btnTodosIncentivados')?.addEventListener('click', () => {
            this.aplicarConfiguracaoRapida('incentivado');
        });
        
        document.getElementById('btnTodosNaoIncentivados')?.addEventListener('click', () => {
            this.aplicarConfiguracaoRapida('nao-incentivado');
        });
        
        document.getElementById('btnConfiguracaoPadrao')?.addEventListener('click', () => {
            this.aplicarConfiguracaoRapida('padrao');
        });

        // Botões principais
        document.getElementById('btnSalvarConfiguracao')?.addEventListener('click', () => {
            this.salvarConfiguracao();
        });
        
        document.getElementById('btnConfiguracaoAutomatica')?.addEventListener('click', () => {
            this.aplicarConfiguracaoAutomatica();
        });
        
        document.getElementById('btnCancelar')?.addEventListener('click', () => {
            this.fecharModal();
        });

        // Fechar modal clicando fora
        window.addEventListener('click', (event) => {
            if (event.target === this.currentModal) {
                this.fecharModal();
            }
        });
    }

    /**
     * Aplica configuração rápida a todos os CFOPs
     */
    aplicarConfiguracaoRapida(opcao) {
        const radios = document.querySelectorAll(`input[type="radio"][value="${opcao}"]`);
        radios.forEach(radio => {
            radio.checked = true;
        });
        
        this.logger.info(`Configuração rápida aplicada: ${opcao} para todos os CFOPs`);
    }

    /**
     * Salva a configuração selecionada
     */
    salvarConfiguracao() {
        const configuracao = this.coletarConfiguracao();
        
        if (Object.keys(configuracao).length === 0) {
            this.logger.warn('Nenhuma configuração selecionada');
            return;
        }

        // Salvar no CfopManager
        this.cfopManager.salvarConfiguracaoCfops(configuracao);
        
        this.logger.success(`Configuração salva: ${Object.keys(configuracao).length} CFOPs configurados`);
        
        // Fechar modal e chamar callback
        this.fecharModal();
        if (this.onConfigurationComplete) {
            this.onConfigurationComplete(configuracao);
        }
    }

    /**
     * Aplica configuração automática baseada na normativa
     */
    aplicarConfiguracaoAutomatica() {
        const configuracao = this.cfopManager.aplicarConfiguracaoAutomatica();
        
        this.logger.success('Configuração automática aplicada');
        
        // Fechar modal e chamar callback
        this.fecharModal();
        if (this.onConfigurationComplete) {
            this.onConfigurationComplete(configuracao);
        }
    }

    /**
     * Coleta a configuração selecionada no modal
     */
    coletarConfiguracao() {
        const configuracao = {};
        const cfopsGenericos = this.cfopManager.detectedCfops;
        
        cfopsGenericos.forEach((cfopInfo, index) => {
            const selectedOption = document.querySelector(`input[name="cfop_${index}"]:checked`);
            if (selectedOption) {
                configuracao[cfopInfo.cfop] = selectedOption.value;
            }
        });
        
        return configuracao;
    }

    /**
     * Fecha o modal atual
     */
    fecharModal() {
        if (this.currentModal) {
            this.currentModal.style.display = 'none';
            // Remover do DOM após um tempo
            setTimeout(() => {
                this.removerModalExistente();
            }, 300);
        }
    }

    /**
     * Remove modal existente do DOM
     */
    removerModalExistente() {
        const modalExistente = document.getElementById('cfopGenericoModal');
        if (modalExistente) {
            modalExistente.remove();
        }
        this.currentModal = null;
    }

    /**
     * Cria modal de informações sobre CFOPs configurados
     */
    criarModalInformacoes(configuracoes) {
        if (Object.keys(configuracoes).length === 0) {
            this.logger.info('Nenhuma configuração de CFOP para exibir');
            return;
        }

        let configItens = '';
        Object.entries(configuracoes).forEach(([cfop, config]) => {
            const badgeClass = config === 'incentivado' ? 'success' : 
                             config === 'nao-incentivado' ? 'warning' : 'info';
            const badgeText = config === 'incentivado' ? 'Incentivado' :
                             config === 'nao-incentivado' ? 'Não Incentivado' : 'Padrão';
                             
            configItens += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #dee2e6;">
                    <span><strong>CFOP ${cfop}</strong></span>
                    <span class="badge badge-${badgeClass}">${badgeText}</span>
                </div>
            `;
        });

        const modalHtml = `
            <div id="cfopInfoModal" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
                <div class="modal-content" style="background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; border-radius: 10px; width: 60%; max-width: 600px;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007bff; padding-bottom: 15px; margin-bottom: 20px;">
                        <h3 style="color: #007bff; margin: 0;">
                            <i class="fas fa-info-circle"></i> Configurações de CFOPs Atuais
                        </h3>
                        <span class="close" style="color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="this.parentElement.parentElement.parentElement.remove();">&times;</span>
                    </div>
                    
                    <div class="modal-body">
                        ${configItens}
                    </div>
                    
                    <div class="modal-footer" style="border-top: 2px solid #dee2e6; padding-top: 15px; margin-top: 20px; text-align: right;">
                        <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove();">
                            <i class="fas fa-check"></i> OK
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Verifica se há modal ativo
     */
    hasActiveModal() {
        return this.currentModal !== null && this.currentModal.style.display === 'block';
    }

    /**
     * Obtém programa atual
     */
    getCurrentProgram() {
        return this.currentProgram;
    }
}

export default CfopModal;