import { 
    CFOPS_GENERICOS, 
    CFOPS_GENERICOS_DESCRICOES,
    CFOP_ENTRADAS_INCENTIVADAS,
    CFOP_SAIDAS_INCENTIVADAS
} from '../../core/constants.js';
import { parseFloatSafe } from '../../core/utils.js';

/**
 * Gerenciador de CFOPs genéricos - responsável pela detecção e configuração
 */
export class CfopManager {
    constructor(logger) {
        this.logger = logger;
        this.detectedCfops = [];
        this.configurations = {};
    }

    /**
     * Detecta CFOPs genéricos nos registros SPED
     */
    detectCfopsGenericos(registros) {
        this.logger.info('Iniciando detecção de CFOPs genéricos...');
        
        this.detectedCfops = [];
        const cfopsEncontrados = new Set();
        
        // Analisar registros C190, C590, D190, D590
        ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
            if (!registros[tipoRegistro]) return;
            
            registros[tipoRegistro].forEach((registro, index) => {
                const cfop = registro[2]; // CFOP está na posição 2
                
                if (this.isCfopGenerico(cfop) && !cfopsEncontrados.has(cfop)) {
                    cfopsEncontrados.add(cfop);
                    
                    const valorOperacao = parseFloatSafe(registro[4] || '0'); // VL_OPR
                    const valorIcms = parseFloatSafe(registro[6] || '0'); // VL_ICMS
                    
                    const cfopInfo = {
                        cfop,
                        tipoRegistro,
                        indiceRegistro: index,
                        valorOperacao,
                        valorIcms,
                        descricao: this.getCfopDescription(cfop),
                        tipoOperacao: this.getTipoOperacao(cfop)
                    };
                    
                    this.detectedCfops.push(cfopInfo);
                    this.logger.info(`CFOP genérico detectado: ${cfop} - ${cfopInfo.descricao}`);
                }
            });
        });
        
        this.logger.success(`Detecção concluída: ${this.detectedCfops.length} CFOPs genéricos encontrados`);
        return this.detectedCfops;
    }

    /**
     * Verifica se um CFOP é genérico
     */
    isCfopGenerico(cfop) {
        return CFOPS_GENERICOS.includes(cfop);
    }

    /**
     * Determina o tipo de operação baseado no CFOP
     */
    getTipoOperacao(cfop) {
        if (cfop.startsWith('1') || cfop.startsWith('2') || cfop.startsWith('3')) {
            return 'ENTRADA';
        }
        return 'SAIDA';
    }

    /**
     * Obtém descrição do CFOP genérico
     */
    getCfopDescription(cfop) {
        return CFOPS_GENERICOS_DESCRICOES[cfop] || `CFOP genérico ${cfop}`;
    }

    /**
     * Salva configuração de CFOPs genéricos
     */
    salvarConfiguracaoCfops(configuracao) {
        this.configurations = { ...this.configurations, ...configuracao };
        
        this.logger.info(`Configuração de CFOPs salva: ${Object.keys(configuracao).length} CFOPs configurados`);
        
        // Log individual das configurações
        Object.entries(configuracao).forEach(([cfop, config]) => {
            this.logger.info(`- CFOP ${cfop}: ${config}`);
        });
        
        return this.configurations;
    }

    /**
     * Aplica configuração automática baseada na normativa
     */
    aplicarConfiguracaoAutomatica() {
        const configuracaoAutomatica = {};
        
        this.detectedCfops.forEach(cfopInfo => {
            const isIncentivado = this.isIncentivadoPorNormativa(cfopInfo.cfop, cfopInfo.tipoOperacao);
            configuracaoAutomatica[cfopInfo.cfop] = isIncentivado ? 'incentivado' : 'nao-incentivado';
        });
        
        this.configurations = { ...this.configurations, ...configuracaoAutomatica };
        
        this.logger.success(`Configuração automática aplicada para ${Object.keys(configuracaoAutomatica).length} CFOPs`);
        return this.configurations;
    }

    /**
     * Verifica se CFOP é incentivado pela normativa
     */
    isIncentivadoPorNormativa(cfop, tipoOperacao) {
        if (tipoOperacao === 'ENTRADA') {
            return CFOP_ENTRADAS_INCENTIVADAS.includes(cfop);
        } else {
            return CFOP_SAIDAS_INCENTIVADAS.includes(cfop);
        }
    }

    /**
     * Determina se operação é incentivada considerando configuração
     */
    determinarSeIncentivada(cfop, tipoOperacao) {
        // Verificar se é CFOP genérico configurado
        if (CFOPS_GENERICOS.includes(cfop) && this.configurations[cfop]) {
            const config = this.configurations[cfop];
            if (config === 'incentivado') return true;
            if (config === 'nao-incentivado') return false;
            // Se 'padrao', continua para lógica normativa
        }
        
        // Lógica normativa padrão
        return this.isIncentivadoPorNormativa(cfop, tipoOperacao);
    }

    /**
     * Obtém configurações atuais
     */
    getConfiguracoes() {
        return this.configurations;
    }

    /**
     * Limpa configurações
     */
    limparConfiguracoes() {
        this.configurations = {};
        this.detectedCfops = [];
        this.logger.info('Configurações de CFOPs limpos');
    }

    /**
     * Verifica se há CFOPs genéricos pendentes de configuração
     */
    hasCfopsGenericosPendentes(registros) {
        const cfopsDetectados = this.detectCfopsGenericos(registros);
        
        // Filtrar apenas os que não estão configurados
        const cfopsPendentes = cfopsDetectados.filter(cfopInfo => {
            return !this.configurations[cfopInfo.cfop];
        });
        
        return cfopsPendentes.length > 0;
    }

    /**
     * Gera estatísticas dos CFOPs detectados
     */
    getEstatisticas() {
        const stats = {
            totalDetectados: this.detectedCfops.length,
            configurados: Object.keys(this.configurations).length,
            pendentes: 0,
            porTipo: {
                entradas: 0,
                saidas: 0
            },
            porConfiguracao: {
                incentivado: 0,
                naoIncentivado: 0,
                padrao: 0
            }
        };

        this.detectedCfops.forEach(cfopInfo => {
            // Contar por tipo
            if (cfopInfo.tipoOperacao === 'ENTRADA') {
                stats.porTipo.entradas++;
            } else {
                stats.porTipo.saidas++;
            }

            // Contar por configuração
            const config = this.configurations[cfopInfo.cfop];
            if (config) {
                if (config === 'incentivado') stats.porConfiguracao.incentivado++;
                else if (config === 'nao-incentivado') stats.porConfiguracao.naoIncentivado++;
                else stats.porConfiguracao.padrao++;
            } else {
                stats.pendentes++;
            }
        });

        return stats;
    }

    /**
     * Exporta configurações para JSON
     */
    exportarConfiguracoes() {
        return {
            timestamp: new Date().toISOString(),
            configurations: this.configurations,
            detectedCfops: this.detectedCfops.map(cfop => ({
                cfop: cfop.cfop,
                descricao: cfop.descricao,
                tipoOperacao: cfop.tipoOperacao,
                configuracao: this.configurations[cfop.cfop] || 'pendente'
            }))
        };
    }

    /**
     * Importa configurações de JSON
     */
    importarConfiguracoes(configData) {
        if (configData && configData.configurations) {
            this.configurations = { ...this.configurations, ...configData.configurations };
            this.logger.success(`Configurações importadas: ${Object.keys(configData.configurations).length} CFOPs`);
            return true;
        }
        
        this.logger.error('Dados de configuração inválidos');
        return false;
    }

    /**
     * Valida configurações
     */
    validarConfiguracoes() {
        const errors = [];
        
        Object.entries(this.configurations).forEach(([cfop, config]) => {
            if (!CFOPS_GENERICOS.includes(cfop)) {
                errors.push(`CFOP ${cfop} não é reconhecido como genérico`);
            }
            
            if (!['incentivado', 'nao-incentivado', 'padrao'].includes(config)) {
                errors.push(`Configuração inválida para CFOP ${cfop}: ${config}`);
            }
        });
        
        if (errors.length > 0) {
            this.logger.error(`Erros na validação: ${errors.join(', ')}`);
            return false;
        }
        
        this.logger.success('Configurações validadas com sucesso');
        return true;
    }

    /**
     * Processa CFOPs genéricos detectados e retorna necessidade de configuração
     */
    processarCfopsGenericos(registros) {
        const cfopsDetectados = this.detectCfopsGenericos(registros);
        
        if (cfopsDetectados.length === 0) {
            this.logger.info('Nenhum CFOP genérico detectado');
            return { 
                needsConfiguration: false, 
                cfops: [], 
                configurations: this.configurations 
            };
        }

        // Verificar se todos já estão configurados
        const cfopsNaoConfigurados = cfopsDetectados.filter(cfopInfo => {
            return !this.configurations[cfopInfo.cfop];
        });

        if (cfopsNaoConfigurados.length === 0) {
            this.logger.info('Todos os CFOPs genéricos já estão configurados');
            return { 
                needsConfiguration: false, 
                cfops: cfopsDetectados, 
                configurations: this.configurations 
            };
        }

        this.logger.info(`${cfopsNaoConfigurados.length} CFOPs genéricos precisam de configuração`);
        return {
            needsConfiguration: true,
            cfops: cfopsNaoConfigurados,
            allCfops: cfopsDetectados,
            configurations: this.configurations
        };
    }
}

export default CfopManager;