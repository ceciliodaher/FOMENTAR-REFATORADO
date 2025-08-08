import { formatCurrency, parseFloatSafe } from '../core/utils.js';
import { 
    CODIGOS_AJUSTE_INCENTIVADOS,
    CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS,
    CFOPS_GENERICOS 
} from '../core/constants.js';

/**
 * Interface para correção de códigos E111, C197/D197 e configuração de CFOPs genéricos
 */
export class CorrectionInterface {
    constructor(logger, app) {
        this.logger = logger;
        this.app = app;
        
        // Estado das correções
        this.corrections = {
            e111: {},
            c197d197: {},
            cfopsGenericos: {}
        };
        
        // Dados encontrados para correção
        this.foundCodes = {
            e111: [],
            c197d197: [],
            cfopsGenericos: []
        };
        
        // Flags de controle
        this.isMultiplePeriods = false;
        this.currentProgram = null; // 'fomentar' ou 'progoias'
    }

    /**
     * Inicializa o fluxo de correções para um programa específico
     */
    initializeCorrectionFlow(program, registros, isMultiplePeriods = false) {
        this.currentProgram = program;
        this.isMultiplePeriods = isMultiplePeriods;
        
        this.logger.info(`Iniciando fluxo de correções para ${program.toUpperCase()}`);
        
        // 1. Verificar CFOPs genéricos
        this.detectCfopsGenericos(registros);
        
        // 2. Verificar códigos C197/D197 
        this.detectC197D197Codes(registros);
        
        // 3. Verificar códigos E111
        this.detectE111Codes(registros);
        
        // 4. Iniciar fluxo de correções
        this.startCorrectionFlow();
    }

    /**
     * Detecta CFOPs genéricos que precisam de configuração
     */
    detectCfopsGenericos(registros) {
        this.foundCodes.cfopsGenericos = [];
        const cfopsEncontrados = new Set();
        
        // Analisar registros C190, C590, D190, D590
        ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
            if (registros[tipoRegistro]) {
                registros[tipoRegistro].forEach((registro, index) => {
                    const cfop = registro[2]; // CFOP está na posição 2
                    
                    if (CFOPS_GENERICOS.includes(cfop) && !cfopsEncontrados.has(cfop)) {
                        cfopsEncontrados.add(cfop);
                        
                        const valorOperacao = parseFloatSafe(registro[3] || '0');
                        const valorIcms = parseFloatSafe(registro[5] || '0');
                        
                        this.foundCodes.cfopsGenericos.push({
                            cfop,
                            tipoRegistro,
                            indiceRegistro: index,
                            valorOperacao,
                            valorIcms,
                            descricao: this.getCfopDescription(cfop)
                        });
                    }
                });
            }
        });
        
        this.logger.info(`CFOPs genéricos detectados: ${this.foundCodes.cfopsGenericos.length}`);
    }

    /**
     * Detecta códigos C197/D197 para correção
     */
    detectC197D197Codes(registros) {
        this.foundCodes.c197d197 = [];
        
        ['C197', 'D197'].forEach(origem => {
            if (registros[origem]) {
                registros[origem].forEach((registro, index) => {
                    const codAjuste = registro[3]; // COD_AJ na posição 3
                    const valorAjuste = parseFloatSafe(registro[4] || '0'); // VL_AJ na posição 4
                    
                    if (codAjuste && valorAjuste !== 0) {
                        this.foundCodes.c197d197.push({
                            origem,
                            codigo: codAjuste,
                            valor: valorAjuste,
                            periodo: this.isMultiplePeriods ? 'múltiplo' : 'único',
                            indiceRegistro: index,
                            registro: registro
                        });
                    }
                });
            }
        });
        
        this.logger.info(`Códigos C197/D197 detectados: ${this.foundCodes.c197d197.length}`);
    }

    /**
     * Detecta códigos E111 para correção
     */
    detectE111Codes(registros) {
        this.foundCodes.e111 = [];
        
        if (registros['E111']) {
            registros['E111'].forEach((registro, index) => {
                const codAjuste = registro[3]; // COD_AJ_APUR na posição 3
                const valorAjuste = parseFloatSafe(registro[5] || '0'); // VL_AJ_APUR na posição 5
                
                if (codAjuste && valorAjuste !== 0) {
                    const tipoAjuste = this.determinarTipoAjustePorCodigo(codAjuste);
                    const isIncentivado = this.isCodigoIncentivado(codAjuste);
                    
                    this.foundCodes.e111.push({
                        codigo: codAjuste,
                        valor: valorAjuste,
                        tipo: tipoAjuste,
                        isIncentivado,
                        descricao: this.getCodigoDescription(codAjuste),
                        indiceRegistro: index,
                        registro: registro,
                        periodo: this.isMultiplePeriods ? 'múltiplo' : 'único'
                    });
                }
            });
        }
        
        this.logger.info(`Códigos E111 detectados: ${this.foundCodes.e111.length}`);
    }

    /**
     * Inicia o fluxo de correções baseado nos códigos encontrados
     */
    startCorrectionFlow() {
        // Prioridade: CFOPs genéricos -> C197/D197 -> E111
        
        if (this.foundCodes.cfopsGenericos.length > 0) {
            this.showCfopGenericInterface();
        } else if (this.foundCodes.c197d197.length > 0) {
            this.showC197D197CorrectionInterface();
        } else if (this.foundCodes.e111.length > 0) {
            this.showE111CorrectionInterface();
        } else {
            // Não há correções necessárias, prosseguir com cálculo
            this.proceedToCalculation();
        }
    }

    /**
     * Mostra interface para configuração de CFOPs genéricos
     */
    showCfopGenericInterface() {
        const container = document.getElementById('cfopGenericoSection');
        if (!container) {
            this.logger.error('Seção cfopGenericoSection não encontrada no HTML');
            this.proceedToC197D197();
            return;
        }
        
        let html = '<h3>🔧 Configuração de CFOPs Genéricos</h3>';
        html += '<p>Os seguintes CFOPs genéricos foram encontrados. Configure se devem ser tratados como incentivados ou não incentivados:</p>';
        
        html += '<div class="cfops-individuais">';
        this.foundCodes.cfopsGenericos.forEach((cfopInfo, index) => {
            html += `
                <div class="cfop-individual-item">
                    <div class="cfop-info">
                        <strong>CFOP ${cfopInfo.cfop}</strong> - ${cfopInfo.descricao}<br>
                        <small>Registro: ${cfopInfo.tipoRegistro}[${cfopInfo.indiceRegistro + 1}] | 
                        Valor Op: R$ ${cfopInfo.valorOperacao.toLocaleString('pt-BR', {minimumFractionDigits: 2})} | 
                        ICMS: R$ ${cfopInfo.valorIcms.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</small>
                    </div>
                    <div class="cfop-opcoes">
                        <label>
                            <input type="radio" name="cfop_${index}" value="incentivado">
                            Incentivado
                        </label>
                        <label>
                            <input type="radio" name="cfop_${index}" value="nao-incentivado">
                            Não Incentivado
                        </label>
                        <label>
                            <input type="radio" name="cfop_${index}" value="padrao" checked>
                            Padrão (Conforme Normativa)
                        </label>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        html += `
            <div class="cfop-actions">
                <button id="btnAplicarCfops" class="btn-style">✅ Aplicar Configuração</button>
                <button id="btnPularCfops" class="btn-style">⏭️ Usar Configuração Padrão</button>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Adicionar event listeners
        document.getElementById('btnAplicarCfops').addEventListener('click', () => this.applyCfopConfiguration());
        document.getElementById('btnPularCfops').addEventListener('click', () => this.skipCfopConfiguration());
        
        this.logger.info('Interface de CFOPs genéricos exibida');
    }

    /**
     * Aplica configuração de CFOPs genéricos
     */
    applyCfopConfiguration() {
        this.corrections.cfopsGenericos = {};
        
        this.foundCodes.cfopsGenericos.forEach((cfopInfo, index) => {
            const selectedOption = document.querySelector(`input[name="cfop_${index}"]:checked`);
            if (selectedOption) {
                this.corrections.cfopsGenericos[cfopInfo.cfop] = selectedOption.value;
            }
        });
        
        this.logger.info(`Configuração de CFOPs aplicada: ${Object.keys(this.corrections.cfopsGenericos).length} CFOPs configurados`);
        this.hideCfopInterface();
        this.proceedToC197D197();
    }

    /**
     * Pula configuração de CFOPs genéricos
     */
    skipCfopConfiguration() {
        this.logger.info('Configuração de CFOPs genéricos pulada - usando padrão');
        this.hideCfopInterface();
        this.proceedToC197D197();
    }

    /**
     * Esconde interface de CFOPs
     */
    hideCfopInterface() {
        const container = document.getElementById('cfopGenericoSection');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Prossegue para correções C197/D197
     */
    proceedToC197D197() {
        if (this.foundCodes.c197d197.length > 0) {
            this.showC197D197CorrectionInterface();
        } else {
            this.proceedToE111();
        }
    }

    /**
     * Mostra interface para correção de códigos C197/D197
     */
    showC197D197CorrectionInterface() {
        const container = document.getElementById('codigosC197D197Section');
        if (!container) {
            this.logger.error('Seção codigosC197D197Section não encontrada no HTML');
            this.proceedToE111();
            return;
        }
        
        if (this.foundCodes.c197d197.length === 0) {
            container.style.display = 'none';
            this.proceedToE111();
            return;
        }
        
        let html = '<h3>🔧 Correção de Códigos C197/D197</h3>';
        html += `<p>Encontrados ${this.foundCodes.c197d197.length} códigos C197/D197 para possível correção:</p>`;
        
        html += '<div class="codigos-c197d197">';
        this.foundCodes.c197d197.forEach((codigoInfo, index) => {
            const elemento = this.createC197D197CorrectionElement(codigoInfo, index);
            html += elemento;
        });
        html += '</div>';
        
        html += `
            <div class="correction-actions">
                <button id="btnAplicarC197D197" class="btn-style">✅ Aplicar Correções</button>
                <button id="btnPularC197D197" class="btn-style">⏭️ Pular Correções</button>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Adicionar event listeners
        document.getElementById('btnAplicarC197D197').addEventListener('click', () => this.applyC197D197Corrections());
        document.getElementById('btnPularC197D197').addEventListener('click', () => this.skipC197D197Corrections());
        
        this.logger.info('Interface de correção C197/D197 exibida');
    }

    /**
     * Cria elemento de correção para código C197/D197
     */
    createC197D197CorrectionElement(codigoInfo, index) {
        const valorAbsoluto = Math.abs(codigoInfo.valor);
        const isPositivo = codigoInfo.valor >= 0;
        
        return `
            <div class="codigo-c197d197-item">
                <div class="codigo-info">
                    <h4>${codigoInfo.codigo} (${codigoInfo.origem})</h4>
                    <p><strong>Valor:</strong> R$ ${formatCurrency(valorAbsoluto)} ${isPositivo ? '(Crédito)' : '(Débito)'}</p>
                    <p><strong>Registro:</strong> ${codigoInfo.origem}[${codigoInfo.indiceRegistro + 1}]</p>
                </div>
                <div class="codigo-correcao">
                    <label>
                        <input type="radio" name="c197d197_${index}" value="manter" checked>
                        Manter Código Original
                    </label>
                    <label>
                        <input type="radio" name="c197d197_${index}" value="excluir">
                        Excluir Código
                    </label>
                    <label>
                        <input type="radio" name="c197d197_${index}" value="alterar">
                        Alterar Código para:
                        <input type="text" class="codigo-novo" placeholder="Novo código" disabled>
                    </label>
                </div>
            </div>
        `;
    }

    /**
     * Aplica correções de códigos C197/D197
     */
    applyC197D197Corrections() {
        this.corrections.c197d197 = {};
        
        this.foundCodes.c197d197.forEach((codigoInfo, index) => {
            const selectedOption = document.querySelector(`input[name="c197d197_${index}"]:checked`);
            if (selectedOption) {
                const action = selectedOption.value;
                let correction = { action };
                
                if (action === 'alterar') {
                    const newCodeInput = selectedOption.parentElement.querySelector('.codigo-novo');
                    correction.newCode = newCodeInput.value.trim();
                }
                
                this.corrections.c197d197[`${codigoInfo.origem}_${codigoInfo.indiceRegistro}`] = correction;
            }
        });
        
        this.logger.info(`Correções C197/D197 aplicadas: ${Object.keys(this.corrections.c197d197).length} códigos processados`);
        this.hideC197D197Interface();
        this.proceedToE111();
    }

    /**
     * Pula correções de códigos C197/D197
     */
    skipC197D197Corrections() {
        this.logger.info('Correções C197/D197 puladas');
        this.hideC197D197Interface();
        this.proceedToE111();
    }

    /**
     * Esconde interface de correção C197/D197
     */
    hideC197D197Interface() {
        const container = document.getElementById('codigosC197D197Section');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Prossegue para correções E111
     */
    proceedToE111() {
        if (this.foundCodes.e111.length > 0) {
            this.showE111CorrectionInterface();
        } else {
            this.proceedToCalculation();
        }
    }

    /**
     * Mostra interface para correção de códigos E111
     */
    showE111CorrectionInterface() {
        const container = document.getElementById('codigoCorrecaoSection');
        if (!container) {
            this.logger.error('Seção codigoCorrecaoSection não encontrada no HTML');
            this.proceedToCalculation();
            return;
        }
        
        if (this.foundCodes.e111.length === 0) {
            container.style.display = 'none';
            this.proceedToCalculation();
            return;
        }
        
        let html = '<h3>🔧 Correção de Códigos E111</h3>';
        html += `<p>Encontrados ${this.foundCodes.e111.length} códigos E111 para possível correção:</p>`;
        
        html += '<div class="codigos-e111">';
        this.foundCodes.e111.forEach((codigoInfo, index) => {
            const elemento = this.createE111CorrectionElement(codigoInfo, index);
            html += elemento;
        });
        html += '</div>';
        
        html += `
            <div class="correction-actions">
                <button id="btnAplicarE111" class="btn-style">✅ Aplicar Correções</button>
                <button id="btnPularE111" class="btn-style">⏭️ Pular Correções</button>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Adicionar event listeners
        document.getElementById('btnAplicarE111').addEventListener('click', () => this.applyE111Corrections());
        document.getElementById('btnPularE111').addEventListener('click', () => this.skipE111Corrections());
        
        this.logger.info('Interface de correção E111 exibida');
    }

    /**
     * Cria elemento de correção para código E111
     */
    createE111CorrectionElement(codigoInfo, index) {
        const valorAbsoluto = Math.abs(codigoInfo.valor);
        const incentivadoClass = codigoInfo.isIncentivado ? 'incentivado' : 'nao-incentivado';
        
        return `
            <div class="codigo-e111-item ${incentivadoClass}">
                <div class="codigo-info">
                    <h4>${codigoInfo.codigo}</h4>
                    <p><strong>Tipo:</strong> ${codigoInfo.tipo}</p>
                    <p><strong>Incentivado:</strong> ${codigoInfo.isIncentivado ? 'Sim' : 'Não'}</p>
                    <p><strong>Valor:</strong> R$ ${formatCurrency(valorAbsoluto)}</p>
                    <p><strong>Descrição:</strong> ${codigoInfo.descricao}</p>
                </div>
                <div class="codigo-correcao">
                    <label>
                        <input type="radio" name="e111_${index}" value="manter" checked>
                        Manter Código Original
                    </label>
                    <label>
                        <input type="radio" name="e111_${index}" value="excluir">
                        Excluir Código (Zerar Valor)
                    </label>
                    <label>
                        <input type="radio" name="e111_${index}" value="alterar">
                        Alterar Código para:
                        <input type="text" class="codigo-novo" placeholder="Novo código" disabled>
                    </label>
                </div>
            </div>
        `;
    }

    /**
     * Aplica correções de códigos E111
     */
    applyE111Corrections() {
        this.corrections.e111 = {};
        
        this.foundCodes.e111.forEach((codigoInfo, index) => {
            const selectedOption = document.querySelector(`input[name="e111_${index}"]:checked`);
            if (selectedOption) {
                const action = selectedOption.value;
                let correction = { action };
                
                if (action === 'alterar') {
                    const newCodeInput = selectedOption.parentElement.querySelector('.codigo-novo');
                    correction.newCode = newCodeInput.value.trim();
                }
                
                this.corrections.e111[codigoInfo.indiceRegistro] = correction;
            }
        });
        
        this.logger.info(`Correções E111 aplicadas: ${Object.keys(this.corrections.e111).length} códigos processados`);
        this.hideE111Interface();
        this.proceedToCalculation();
    }

    /**
     * Pula correções de códigos E111
     */
    skipE111Corrections() {
        this.logger.info('Correções E111 puladas');
        this.hideE111Interface();
        this.proceedToCalculation();
    }

    /**
     * Esconde interface de correção E111
     */
    hideE111Interface() {
        const container = document.getElementById('codigoCorrecaoSection');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Prossegue para o cálculo final
     */
    proceedToCalculation() {
        this.logger.success('Fluxo de correções concluído - prosseguindo para cálculo');
        
        // Aplicar correções aos registros se necessário
        this.applyCorrectionsToRegisters();
        
        // Chamar método de cálculo apropriado
        if (this.currentProgram === 'fomentar') {
            this.app.calculateFomentar();
        } else if (this.currentProgram === 'progoias') {
            this.app.calculateProgoias();
        }
    }

    /**
     * Aplica as correções selecionadas aos registros
     */
    applyCorrectionsToRegisters() {
        // Esta funcionalidade será implementada junto com a extensão dos calculadores
        this.logger.info('Aplicando correções aos registros...');
        
        // TODO: Implementar aplicação das correções
        // - CFOPs genéricos: atualizar classificação nas operações
        // - C197/D197: alterar/excluir códigos nos registros
        // - E111: alterar/excluir códigos nos registros
    }

    // Métodos utilitários
    
    determinarTipoAjustePorCodigo(codigoAjuste) {
        if (!codigoAjuste || codigoAjuste.length !== 8) {
            return 'DESCONHECIDO';
        }
        
        const quartoDigito = codigoAjuste.charAt(3);
        
        switch (quartoDigito) {
            case '1':
                return 'DÉBITO';
            case '2':
                return 'CRÉDITO';
            case '3':
                return 'ESTORNO DE DÉBITO';
            case '0':
                return 'ESTORNO DE CRÉDITO';
            default:
                return 'OUTROS';
        }
    }
    
    isCodigoIncentivado(codigo) {
        const incentivados = this.currentProgram === 'progoias' 
            ? CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS 
            : CODIGOS_AJUSTE_INCENTIVADOS;
            
        return incentivados.includes(codigo);
    }
    
    getCfopDescription(cfop) {
        // Descrições básicas dos CFOPs genéricos mais comuns
        const descriptions = {
            '5949': 'Outra saída de mercadoria ou prestação de serviço não especificado',
            '6949': 'Outra saída de mercadoria ou prestação de serviço não especificado',
            '1949': 'Outra entrada de mercadoria ou prestação de serviço não especificado',
            '2949': 'Outra entrada de mercadoria ou prestação de serviço não especificado'
        };
        
        return descriptions[cfop] || 'CFOP genérico';
    }
    
    getCodigoDescription(codigo) {
        // Esta função poderia ser expandida com um mapeamento completo de códigos
        return `Código de ajuste ${codigo}`;
    }
}

export default CorrectionInterface;