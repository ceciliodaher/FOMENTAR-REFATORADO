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
     * WORKFLOW SEQUENCIAL: CFOPs → C197/D197 → E111 → Cálculo (para em cada etapa)
     */
    startCorrectionFlow() {
        this.logger.info('Iniciando workflow sequencial de correções');
        
        // ETAPA 1: CFOPs genéricos (sempre verificar primeiro)
        if (this.foundCodes.cfopsGenericos.length > 0) {
            this.logger.info('CFOPs genéricos detectados - parando workflow e aguardando usuário');
            this.showCfopGenericInterface();
            return; // PARA AQUI e espera usuário
        }
        
        // ETAPA 2: Prosseguir para C197/D197 (replicando prosseguirParaE111)
        this.prosseguirParaC197D197();
    }
    
    /**
     * Prossegue para verificação C197/D197 (replicando prosseguirParaE111 do legado)
     */
    prosseguirParaC197D197() {
        this.logger.info('Verificando códigos C197/D197...');
        
        if (this.foundCodes.c197d197.length > 0) {
            this.logger.info('Códigos C197/D197 detectados - parando workflow e aguardando usuário');
            this.showC197D197CorrectionInterface();
            return; // PARA AQUI e espera usuário
        }
        
        // Se não tem C197/D197, prosseguir para E111
        this.prosseguirParaE111();
    }
    
    /**
     * Prossegue para verificação E111 (última etapa antes do cálculo)
     */
    prosseguirParaE111() {
        this.logger.info('Verificando códigos E111...');
        
        if (this.foundCodes.e111.length > 0) {
            this.logger.info('Códigos E111 detectados - parando workflow e aguardando usuário');
            this.showE111CorrectionInterface();
            return; // PARA AQUI e espera usuário
        }
        
        // Se não tem E111, prosseguir direto para cálculo
        this.proceedToCalculation();
    }

    /**
     * Mostra interface para configuração de CFOPs genéricos
     */
    showCfopGenericInterface() {
        const containerId = this.getContainerId('cfop');
        const container = document.getElementById(containerId);
        if (!container) {
            this.logger.error(`Seção ${containerId} não encontrada no HTML`);
            this.proceedToC197D197();
            return;
        }
        
        let html = `
            <h3>🔧 Configuração de CFOPs Genéricos (${this.foundCodes.cfopsGenericos.length} encontrados)</h3>
            <p>Os seguintes CFOPs genéricos foram encontrados. Configure se devem ser tratados como incentivados ou não incentivados:</p>
            
            <table class="table table-striped" style="font-size: 12px;">
                <thead style="background-color: #2E8B8B; color: white;">
                    <tr>
                        <th>CFOP</th>
                        <th>Descrição</th>
                        <th>Registro</th>
                        <th>Valor Operação</th>
                        <th>ICMS</th>
                        <th>Classificação</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.foundCodes.cfopsGenericos.forEach((cfopInfo, index) => {
            const valorOperacao = formatCurrency(cfopInfo.valorOperacao || 0);
            const valorIcms = formatCurrency(cfopInfo.valorIcms || 0);
            
            html += `
                <tr>
                    <td><strong>${cfopInfo.cfop}</strong></td>
                    <td>${cfopInfo.descricao}</td>
                    <td>${cfopInfo.tipoRegistro}[${cfopInfo.indiceRegistro + 1}]</td>
                    <td style="color: green;">${valorOperacao}</td>
                    <td style="color: red;">${valorIcms}</td>
                    <td>
                        <label style="margin-right: 10px;">
                            <input type="radio" name="cfop_${index}" value="incentivado">
                            <span style="color: green;">✅ Incentivado</span>
                        </label>
                        <label style="margin-right: 10px;">
                            <input type="radio" name="cfop_${index}" value="nao-incentivado">
                            <span style="color: red;">❌ Não Incentivado</span>
                        </label>
                        <label>
                            <input type="radio" name="cfop_${index}" value="padrao" checked>
                            <span style="color: blue;">📋 Padrão (Normativa)</span>
                        </label>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            
            <div class="cfop-actions" style="margin-top: 20px; text-align: center;">
                <button id="btnAplicarCfops" class="btn btn-primary" style="margin-right: 10px;">
                    ✅ Aplicar Configuração
                </button>
                <button id="btnPularCfops" class="btn btn-secondary">
                    ⏭️ Usar Configuração Padrão
                </button>
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
        const containerId = this.getContainerId('cfop');
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Prossegue para correções C197/D197 (após CFOPs genéricos)
     */
    proceedToC197D197() {
        this.logger.info('Prosseguindo de CFOPs para C197/D197...');
        this.prosseguirParaC197D197();
    }

    /**
     * Mostra interface para correção de códigos C197/D197
     */
    showC197D197CorrectionInterface() {
        const containerId = this.getContainerId('c197d197');
        const container = document.getElementById(containerId);
        
        if (!container) {
            this.logger.error(`Seção ${containerId} não encontrada no HTML`);
            this.proceedToE111();
            return;
        }
        
        if (this.foundCodes.c197d197.length === 0) {
            container.style.display = 'none';
            this.proceedToE111();
            return;
        }
        
        let html = `
            <h3>🔧 Correção de Códigos C197/D197</h3>
            <p>Encontrados ${this.foundCodes.c197d197.length} códigos C197/D197 para possível correção:</p>
            
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-striped table-sm" style="font-size: 12px;">
                    <thead style="background-color: #2E8B8B; color: white; position: sticky; top: 0;">
                        <tr>
                            <th>Origem</th>
                            <th>Código</th>
                            <th>Valor</th>
                            <th>Registro</th>
                            <th>Ação</th>
                            <th>Novo Código</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        this.foundCodes.c197d197.forEach((codigoInfo, index) => {
            const valorFormatado = formatCurrency(Math.abs(codigoInfo.valor));
            const isPositivo = codigoInfo.valor >= 0;
            const corValor = isPositivo ? 'color: green;' : 'color: red;';
            
            html += `
                <tr>
                    <td><strong>${codigoInfo.origem}</strong></td>
                    <td>${codigoInfo.codigo}</td>
                    <td style="${corValor}">${valorFormatado} ${isPositivo ? '(Crédito)' : '(Débito)'}</td>
                    <td>${codigoInfo.origem}[${codigoInfo.indiceRegistro + 1}]</td>
                    <td>
                        <select name="acao_${index}" class="form-select form-select-sm">
                            <option value="manter" selected>Manter</option>
                            <option value="excluir">Excluir</option>
                            <option value="alterar">Alterar</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" name="novoCodigo_${index}" class="form-control form-control-sm" 
                               placeholder="Novo código" disabled style="width: 120px;">
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div class="correction-actions mt-3 text-center">
                <button id="btnAplicarCorrecoesC197D197" class="btn btn-primary me-2">
                    ✅ Aplicar Correções C197/D197 e Continuar
                </button>
                <button id="btnPularCorrecoesC197D197" class="btn btn-secondary">
                    ⏭️ Pular Correções C197/D197
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Event listeners para selects
        this.foundCodes.c197d197.forEach((_, index) => {
            const select = document.querySelector(`select[name="acao_${index}"]`);
            const input = document.querySelector(`input[name="novoCodigo_${index}"]`);
            
            select.addEventListener('change', () => {
                input.disabled = select.value !== 'alterar';
                if (select.value !== 'alterar') {
                    input.value = '';
                }
            });
        });
        
        // Event listeners para botões (IDs corretos do HTML)
        document.getElementById('btnAplicarCorrecoesC197D197').addEventListener('click', () => this.applyC197D197Corrections());
        document.getElementById('btnPularCorrecoesC197D197').addEventListener('click', () => this.skipC197D197Corrections());
        
        this.logger.info('Interface de correção C197/D197 exibida');
    }


    /**
     * Aplica correções de códigos C197/D197
     */
    applyC197D197Corrections() {
        this.corrections.c197d197 = {};
        
        this.foundCodes.c197d197.forEach((codigoInfo, index) => {
            const acaoSelect = document.querySelector(`select[name="acao_${index}"]`);
            if (acaoSelect) {
                const action = acaoSelect.value;
                let correction = { action };
                
                if (action === 'alterar') {
                    const newCodeInput = document.querySelector(`input[name="novoCodigo_${index}"]`);
                    if (newCodeInput) {
                        correction.newCode = newCodeInput.value.trim();
                    }
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
        const containerId = this.getContainerId('c197d197');
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Prossegue para correções E111 (após C197/D197)
     */
    proceedToE111() {
        this.logger.info('Prosseguindo de C197/D197 para E111...');
        this.prosseguirParaE111();
    }

    /**
     * Mostra interface para correção de códigos E111
     */
    showE111CorrectionInterface() {
        const containerId = this.getContainerId('e111');
        const container = document.getElementById(containerId);
        if (!container) {
            this.logger.error(`Seção ${containerId} não encontrada no HTML`);
            this.proceedToCalculation();
            return;
        }
        
        if (this.foundCodes.e111.length === 0) {
            container.style.display = 'none';
            this.proceedToCalculation();
            return;
        }
        
        let html = `
            <h3>🔧 Correção de Códigos E111</h3>
            <p>Encontrados ${this.foundCodes.e111.length} códigos E111 para possível correção:</p>
            
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-striped table-sm" style="font-size: 12px;">
                    <thead style="background-color: #2E8B8B; color: white; position: sticky; top: 0;">
                        <tr>
                            <th>Código</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Incentivado</th>
                            <th>Descrição</th>
                            <th>Ação</th>
                            <th>Novo Código</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        this.foundCodes.e111.forEach((codigoInfo, index) => {
            const valorFormatado = formatCurrency(Math.abs(codigoInfo.valor));
            const incentivadoIcon = codigoInfo.isIncentivado ? '✅' : '❌';
            const incentivadoColor = codigoInfo.isIncentivado ? 'color: green;' : 'color: red;';
            
            html += `
                <tr>
                    <td><strong>${codigoInfo.codigo}</strong></td>
                    <td>${codigoInfo.tipo}</td>
                    <td>${valorFormatado}</td>
                    <td style="${incentivadoColor}">${incentivadoIcon} ${codigoInfo.isIncentivado ? 'Sim' : 'Não'}</td>
                    <td style="font-size: 11px;">${codigoInfo.descricao}</td>
                    <td>
                        <select name="acao_e111_${index}" class="form-select form-select-sm">
                            <option value="manter" selected>Manter</option>
                            <option value="excluir">Excluir</option>
                            <option value="alterar">Alterar</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" name="novoCodigo_e111_${index}" class="form-control form-control-sm" 
                               placeholder="Novo código" disabled style="width: 120px;">
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div class="correction-actions mt-3 text-center">
                <button id="btnAplicarCorrecoes" class="btn btn-primary me-2">
                    ✅ Aplicar Correções E111 e Calcular
                </button>
                <button id="btnPularCorrecoes" class="btn btn-secondary">
                    ⏭️ Pular Correções E111
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Event listeners para selects
        this.foundCodes.e111.forEach((_, index) => {
            const select = document.querySelector(`select[name="acao_e111_${index}"]`);
            const input = document.querySelector(`input[name="novoCodigo_e111_${index}"]`);
            
            if (select && input) {
                select.addEventListener('change', () => {
                    input.disabled = select.value !== 'alterar';
                    if (select.value !== 'alterar') {
                        input.value = '';
                    }
                });
            }
        });
        
        // Event listeners para botões (IDs corretos do HTML)
        document.getElementById('btnAplicarCorrecoes').addEventListener('click', () => this.applyE111Corrections());
        document.getElementById('btnPularCorrecoes').addEventListener('click', () => this.skipE111Corrections());
        
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
        const containerId = this.getContainerId('e111');
        const container = document.getElementById(containerId);
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
        
        // Garantir que a seção de resultados seja exibida
        const resultsSection = document.getElementById('fomentarResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            this.logger.info('Seção de resultados FOMENTAR exibida');
        }
        
        // Chamar método wrapper que prepara parâmetros corretamente
        if (this.currentProgram === 'fomentar') {
            this.app.calculateFomentar();
        } else if (this.currentProgram === 'progoias') {
            this.app.calculateProgoias();
        } else if (this.currentProgram === 'logproduzir') {
            this.app.calculateLogproduzir();
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
    
    /**
     * Determina o programa atual baseado no estado da aplicação
     */
    getCurrentProgram() {
        // Verificar se foi definido diretamente
        if (this.currentProgram) {
            return this.currentProgram;
        }
        
        // Verificar estado da aplicação
        if (this.app && this.app.state) {
            if (this.app.state.currentModule) {
                return this.app.state.currentModule;
            }
        }
        
        // Fallback: verificar qual aba está ativa
        const tabs = ['fomentar', 'progoias', 'logproduzir', 'converter'];
        for (const tab of tabs) {
            const tabElement = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
            if (tabElement && tabElement.classList.contains('active')) {
                return tab;
            }
        }
        
        // Fallback final: assumir fomentar
        return 'fomentar';
    }
    
    /**
     * Obtém ID correto do container baseado no programa e tipo de seção
     */
    getContainerId(sectionType) {
        const currentProgram = this.getCurrentProgram();
        
        // Para FOMENTAR e CONVERTER, usar IDs genéricos (conforme HTML atual)
        if (currentProgram === 'fomentar' || currentProgram === 'converter') {
            switch (sectionType) {
                case 'cfop': return 'cfopGenericoSection';
                case 'e111': return 'codigoCorrecaoSection';
                case 'c197d197': return 'codigoCorrecaoSectionC197D197';
            }
        }
        
        // Para outros programas, usar IDs específicos com prefixo
        switch (sectionType) {
            case 'cfop': return `${currentProgram}CfopGenericoSection`;
            case 'e111': return `${currentProgram}CodigoCorrecaoSection`;
            case 'c197d197': return `${currentProgram}CodigoCorrecaoSectionC197D197`;
        }
        
        return null;
    }
}

export default CorrectionInterface;