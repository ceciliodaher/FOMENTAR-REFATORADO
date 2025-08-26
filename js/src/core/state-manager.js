/**
 * StateManager - Gerenciador centralizado de estado
 * 
 * Responsável por gerenciar todo o estado da aplicação de forma centralizada,
 * eliminando variáveis globais e garantindo consistência entre módulos.
 * 
 * @module core/state-manager
 */

export class StateManager {
    constructor() {
        this.state = {
            // Estado compartilhado do SPED
            sped: {
                file: null,                    // Arquivo SPED original
                content: '',                   // Conteúdo do arquivo
                encoding: 'UTF-8',             // Encoding detectado
                registrosCompletos: null,      // Registros processados
                headerInfo: {
                    nomeEmpresa: '',
                    periodo: '',
                    cnpj: '',
                    ie: '',
                    dataInicial: null,
                    dataFinal: null
                }
            },
            
            // Estado do conversor
            converter: {
                isProcessing: false,
                progress: 0,
                outputFileName: '',
                status: 'idle' // idle | processing | completed | error
            },
            
            // Estado FOMENTAR
            fomentar: {
                data: null,                    // Dados calculados FOMENTAR
                registrosCompletos: null,      // Registros específicos FOMENTAR
                corrections: {
                    e111: {},                  // Correções E111: {codigo: novoValor}
                    c197d197: {},              // Correções C197/D197
                    cfopsGenericos: {}         // CFOPs genéricos configurados
                },
                multiPeriod: [],               // Array de dados multi-período
                selectedPeriodIndex: 0,
                importMode: 'single',          // single | multiple
                isMultiplePeriods: false,
                codigosEncontrados: {
                    e111: [],
                    c197d197: []
                },
                cfopsDetectados: []
            },
            
            // Estado ProGoiás
            progoias: {
                data: null,                    // Dados calculados ProGoiás
                registrosCompletos: null,      // Registros específicos ProGoiás
                corrections: {
                    e111: {},
                    c197d197: {},
                    cfopsGenericos: {}
                },
                multiPeriod: [],
                selectedPeriodIndex: 0,
                importMode: 'single',
                isMultiplePeriods: false,
                codigosEncontrados: {
                    e111: [],
                    c197d197: []
                },
                cfopsDetectados: [],
                config: {
                    tipoEmpresa: 'industria',
                    anoFruicao: new Date().getFullYear(),
                    percentualManual: null,
                    opcaoCalculo: 'automatico'
                }
            },
            
            // Estado LogPRODUZIR
            logproduzir: {
                data: null,                    // Dados calculados LogPRODUZIR
                registrosCompletos: null,      // Registros específicos LogPRODUZIR
                multiPeriod: [],
                selectedPeriodIndex: 0,
                importMode: 'single',
                config: {
                    categoria: 'II',           // I | II | III
                    mediaBase: 0,
                    igpDi: 0,
                    saldoCredorAnterior: 0
                }
            },
            
            // Estado da interface
            ui: {
                activeTab: 'converter',        // converter | fomentar | progoias | logproduzir
                isLoading: false,
                messages: [],
                logs: [],
                validationErrors: []
            },
            
            // Configurações globais
            config: {
                maxFileSize: 200 * 1024 * 1024, // 200MB
                enableLogs: true,
                autoDownload: true,
                theme: 'light'
            }
        };
        
        // Observers para notificar mudanças
        this.observers = new Map();
    }
    
    /**
     * Obtém o estado completo ou uma parte específica
     * @param {string} path - Caminho para parte específica (ex: 'fomentar.data')
     * @returns {any} Estado ou parte do estado
     */
    getState(path = null) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    /**
     * Atualiza o estado de forma imutável
     * @param {Object} updates - Objeto com atualizações
     * @param {boolean} notify - Se deve notificar observers
     */
    updateState(updates, notify = true) {
        // Deep merge mantendo imutabilidade
        this.state = this.deepMerge(this.state, updates);
        
        if (notify) {
            this.notifyObservers(updates);
        }
    }
    
    /**
     * Reseta uma parte específica do estado
     * @param {string} module - Módulo a resetar (sped | fomentar | progoias | logproduzir)
     */
    resetModule(module) {
        switch(module) {
            case 'sped':
                this.updateState({
                    sped: {
                        file: null,
                        content: '',
                        encoding: 'UTF-8',
                        registrosCompletos: null,
                        headerInfo: {
                            nomeEmpresa: '',
                            periodo: '',
                            cnpj: '',
                            ie: '',
                            dataInicial: null,
                            dataFinal: null
                        }
                    }
                });
                break;
                
            case 'fomentar':
                this.updateState({
                    fomentar: {
                        ...this.getInitialModuleState('fomentar')
                    }
                });
                break;
                
            case 'progoias':
                this.updateState({
                    progoias: {
                        ...this.getInitialModuleState('progoias')
                    }
                });
                break;
                
            case 'logproduzir':
                this.updateState({
                    logproduzir: {
                        ...this.getInitialModuleState('logproduzir')
                    }
                });
                break;
        }
    }
    
    /**
     * Obtém estado inicial de um módulo
     * @private
     */
    getInitialModuleState(module) {
        const initialStates = {
            fomentar: {
                data: null,
                registrosCompletos: null,
                corrections: { e111: {}, c197d197: {}, cfopsGenericos: {} },
                multiPeriod: [],
                selectedPeriodIndex: 0,
                importMode: 'single',
                isMultiplePeriods: false,
                codigosEncontrados: { e111: [], c197d197: [] },
                cfopsDetectados: []
            },
            progoias: {
                data: null,
                registrosCompletos: null,
                corrections: { e111: {}, c197d197: {}, cfopsGenericos: {} },
                multiPeriod: [],
                selectedPeriodIndex: 0,
                importMode: 'single',
                isMultiplePeriods: false,
                codigosEncontrados: { e111: [], c197d197: [] },
                cfopsDetectados: [],
                config: {
                    tipoEmpresa: 'industria',
                    anoFruicao: new Date().getFullYear(),
                    percentualManual: null,
                    opcaoCalculo: 'automatico'
                }
            },
            logproduzir: {
                data: null,
                registrosCompletos: null,
                multiPeriod: [],
                selectedPeriodIndex: 0,
                importMode: 'single',
                config: {
                    categoria: 'II',
                    mediaBase: 0,
                    igpDi: 0,
                    saldoCredorAnterior: 0
                }
            }
        };
        
        return initialStates[module] || {};
    }
    
    /**
     * Registra um observer para mudanças no estado
     * @param {string} key - Chave única do observer
     * @param {Function} callback - Função a ser chamada nas mudanças
     */
    subscribe(key, callback) {
        this.observers.set(key, callback);
    }
    
    /**
     * Remove um observer
     * @param {string} key - Chave do observer
     */
    unsubscribe(key) {
        this.observers.delete(key);
    }
    
    /**
     * Notifica todos os observers sobre mudanças
     * @private
     */
    notifyObservers(changes) {
        this.observers.forEach(callback => {
            try {
                callback(changes, this.state);
            } catch (error) {
                console.error('Erro ao notificar observer:', error);
            }
        });
    }
    
    /**
     * Deep merge de objetos mantendo imutabilidade
     * @private
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        
        return result;
    }
    
    /**
     * Salva correções de códigos E111/C197/D197
     * @param {string} module - Módulo (fomentar | progoias)
     * @param {string} type - Tipo de correção (e111 | c197d197)
     * @param {Object} corrections - Objeto com correções
     */
    saveCorrections(module, type, corrections) {
        this.updateState({
            [module]: {
                corrections: {
                    [type]: corrections
                }
            }
        });
    }
    
    /**
     * Adiciona dados de um período para processamento multi-período
     * @param {string} module - Módulo (fomentar | progoias | logproduzir)
     * @param {Object} periodData - Dados do período
     */
    addPeriodData(module, periodData) {
        const currentData = this.getState(`${module}.multiPeriod`) || [];
        
        this.updateState({
            [module]: {
                multiPeriod: [...currentData, periodData],
                isMultiplePeriods: true
            }
        });
    }
    
    /**
     * Limpa todos os dados multi-período de um módulo
     * @param {string} module - Módulo a limpar
     */
    clearMultiPeriod(module) {
        this.updateState({
            [module]: {
                multiPeriod: [],
                selectedPeriodIndex: 0,
                isMultiplePeriods: false
            }
        });
    }
    
    /**
     * Exporta o estado para debugging
     * @returns {string} JSON do estado
     */
    exportState() {
        return JSON.stringify(this.state, null, 2);
    }
    
    /**
     * Importa estado (útil para testes)
     * @param {Object} state - Estado a importar
     */
    importState(state) {
        this.state = state;
        this.notifyObservers(state);
    }
}

// Singleton para garantir uma única instância
export default new StateManager();