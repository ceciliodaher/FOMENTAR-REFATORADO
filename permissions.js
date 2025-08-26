// permissions.js - Sistema de Controle de Acesso
// CLAUDE-CONTEXT: Sistema modular para controle de permissões de usuário

const USER_PERMISSIONS = {
    // Configuração padrão: acesso completo (administrador)
    admin: {
        tabs: {
            converter: true,
            fomentar: true,
            progoias: true,
            logproduzir: true
        },
        fomentar: {
            periodoUnico: true,
            multiplosPeriodos: true,
            exportar: true,
            memoriaCalculo: true,
            registroE115: true,
            confrontoE115: true,
            correcaoCodigos: true
        },
        progoias: {
            periodoUnico: true,
            multiplosPeriodos: true,
            exportar: true,
            memoriaCalculo: true
        },
        converter: {
            importar: true,
            converter: true,
            exportar: true
        },
        logproduzir: {
            periodoUnico: true,
            multiplosPeriodos: true,
            exportar: true,
            memoriaCalculo: true
        }
    },
    
    // Perfil restrito: apenas FOMENTAR período único
    fomentarBasico: {
        tabs: {
            converter: false,
            fomentar: true,
            progoias: false,
            logproduzir: false
        },
        fomentar: {
            periodoUnico: true,
            multiplosPeriodos: false,
            exportar: true,
            memoriaCalculo: true,
            registroE115: false,
            confrontoE115: false,
            correcaoCodigos: false
        }
    },
    
    // Perfil FOMENTAR completo (sem outras abas)
    fomentarCompleto: {
        tabs: {
            converter: false,
            fomentar: true,
            progoias: false,
            logproduzir: false
        },
        fomentar: {
            periodoUnico: true,
            multiplosPeriodos: true,
            exportar: true,
            memoriaCalculo: true,
            registroE115: true,
            confrontoE115: true,
            correcaoCodigos: true
        }
    },
    
    // Perfil apenas conversor SPED
    converterApenas: {
        tabs: {
            converter: true,
            fomentar: false,
            progoias: false,
            logproduzir: false
        },
        converter: {
            importar: true,
            converter: true,
            exportar: true
        }
    },
    
    // Perfil ProGoiás básico: apenas período único
    progoiasBasico: {
        tabs: {
            converter: false,
            fomentar: false,
            progoias: true,
            logproduzir: false
        },
        progoias: {
            periodoUnico: true,
            multiplosPeriodos: false,
            exportar: true,
            memoriaCalculo: true
        }
    },
    
    // Perfil ProGoiás completo: todas as funcionalidades ProGoiás
    progoiasCompleto: {
        tabs: {
            converter: false,
            fomentar: false,
            progoias: true,
            logproduzir: false
        },
        progoias: {
            periodoUnico: true,
            multiplosPeriodos: true,
            exportar: true,
            memoriaCalculo: true
        }
    },
    
    // Perfil LogPRODUZIR básico: apenas período único
    logproduzirBasico: {
        tabs: {
            converter: false,
            fomentar: false,
            progoias: false,
            logproduzir: true
        },
        logproduzir: {
            periodoUnico: true,
            multiplosPeriodos: false,
            exportar: true,
            memoriaCalculo: true
        }
    },
    
    // Perfil LogPRODUZIR completo: todas as funcionalidades LogPRODUZIR
    logproduzirCompleto: {
        tabs: {
            converter: false,
            fomentar: false,
            progoias: false,
            logproduzir: true
        },
        logproduzir: {
            periodoUnico: true,
            multiplosPeriodos: true,
            exportar: true,
            memoriaCalculo: true
        }
    }
};

// CLAUDE-CONTEXT: Configuração do usuário - GERENCIADO AUTOMATICAMENTE pelo sistema de autenticação
let currentUserProfile = 'admin'; // Será definido automaticamente após login

// Classe para gerenciar permissões
class PermissionManager {
    constructor() {
        this.currentProfile = currentUserProfile;
    }
    
    // Obter permissões do usuário atual
    getCurrentPermissions() {
        return USER_PERMISSIONS[this.currentProfile] || USER_PERMISSIONS.admin;
    }
    
    // Verificar se o usuário tem permissão específica
    hasPermission(category, permission) {
        const permissions = this.getCurrentPermissions();
        return permissions[category] && permissions[category][permission];
    }
    
    // Configurar perfil do usuário
    setUserProfile(profile) {
        if (USER_PERMISSIONS[profile]) {
            this.currentProfile = profile;
            currentUserProfile = profile; // Atualizar variável global
            this.applyPermissions();
            if (typeof addLog === 'function') {
                addLog(`Perfil aplicado: ${profile}`, 'info');
            }
            return true;
        } else {
            if (typeof addLog === 'function') {
                addLog(`Perfil inválido: ${profile}`, 'error');
            }
            return false;
        }
    }
    
    // Aplicar permissões na interface
    applyPermissions() {
        const permissions = this.getCurrentPermissions();
        
        // Aguardar DOM estar carregado
        const applyNow = () => {
            // Controle de abas
            this.controlTabVisibility(permissions);
            
            // Aplicar permissões específicas por aba
            this.applyFomentarPermissions(permissions);
            this.applyProgoiasPermissions(permissions);
            this.applyConverterPermissions(permissions);
            this.applyLogproduzirPermissions(permissions);
            
            // Se a aba ativa não tem permissão, trocar para primeira aba disponível
            this.switchToFirstAvailableTab(permissions);
        };
        
        // Se DOM não está pronto, aguardar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyNow);
        } else {
            // DOM já carregado, aplicar após delay para garantir que todos elementos existam
            setTimeout(applyNow, 200);
        }
    }
    
    // Controlar visibilidade das abas - agora usando estilo opaco ao invés de ocultar
    controlTabVisibility(permissions) {
        const tabConverter = document.getElementById('tabConverter');
        const tabFomentar = document.getElementById('tabFomentar');
        const tabProgoias = document.getElementById('tabProgoias');
        const tabLogproduzir = document.getElementById('tabLogproduzir');
        
        // Sempre mostrar todas as abas, mas aplicar classe 'disabled' nas não autorizadas
        if (tabConverter) {
            tabConverter.style.display = 'inline-block';
            if (permissions.tabs.converter) {
                tabConverter.classList.remove('disabled');
            } else {
                tabConverter.classList.add('disabled');
            }
        }
        if (tabFomentar) {
            tabFomentar.style.display = 'inline-block';
            if (permissions.tabs.fomentar) {
                tabFomentar.classList.remove('disabled');
            } else {
                tabFomentar.classList.add('disabled');
            }
        }
        if (tabProgoias) {
            tabProgoias.style.display = 'inline-block';
            if (permissions.tabs.progoias) {
                tabProgoias.classList.remove('disabled');
            } else {
                tabProgoias.classList.add('disabled');
            }
        }
        if (tabLogproduzir) {
            tabLogproduzir.style.display = 'inline-block';
            if (permissions.tabs.logproduzir) {
                tabLogproduzir.classList.remove('disabled');
            } else {
                tabLogproduzir.classList.add('disabled');
            }
        }
    }
    
    // Aplicar permissões específicas da aba FOMENTAR
    applyFomentarPermissions(permissions) {
        if (!permissions.tabs.fomentar) return;
        
        const fomentarPermissions = permissions.fomentar || {};
        
        // Controlar modo de importação
        const multiplePeriodsRadio = document.querySelector('input[name="importMode"][value="multiple"]');
        const multiplePeriodsLabel = multiplePeriodsRadio?.parentElement;
        
        console.log('[PERMISSION-DEBUG] FOMENTAR múltiplos períodos permitidos:', fomentarPermissions.multiplosPeriodos);
        console.log('[PERMISSION-DEBUG] Elemento radio múltiplos encontrado:', !!multiplePeriodsRadio);
        
        if (multiplePeriodsRadio && multiplePeriodsLabel) {
            if (!fomentarPermissions.multiplosPeriodos) {
                console.log('[PERMISSION] Desabilitando múltiplos períodos FOMENTAR');
                multiplePeriodsRadio.disabled = true;
                multiplePeriodsLabel.style.opacity = '0.5';
                multiplePeriodsLabel.style.pointerEvents = 'none';
                multiplePeriodsLabel.style.cursor = 'not-allowed';
                
                // Forçar seleção do período único
                const singlePeriodRadio = document.querySelector('input[name="importMode"][value="single"]');
                if (singlePeriodRadio) {
                    singlePeriodRadio.checked = true;
                    console.log('[PERMISSION] Forçado período único FOMENTAR');
                }
            } else {
                console.log('[PERMISSION] Habilitando múltiplos períodos FOMENTAR');
                multiplePeriodsRadio.disabled = false;
                multiplePeriodsLabel.style.opacity = '1';
                multiplePeriodsLabel.style.pointerEvents = 'auto';
                multiplePeriodsLabel.style.cursor = 'pointer';
            }
        }
        
        // Controlar botões específicos
        this.controlButtonVisibility('exportarExcelFomentar', fomentarPermissions.exportar);
        this.controlButtonVisibility('gerarMemoriaCalculoFomentar', fomentarPermissions.memoriaCalculo);
        this.controlButtonVisibility('gerarRegistroE115Button', fomentarPermissions.registroE115);
        this.controlButtonVisibility('confrontoE115Button', fomentarPermissions.confrontoE115);
        
        // Controlar seções de correção
        if (!fomentarPermissions.correcaoCodigos) {
            this.hideElement('correcaoCodigosSection');
            this.hideElement('correcaoC197D197Section');
        }
    }
    
    // Aplicar permissões específicas da aba ProGoiás
    applyProgoiasPermissions(permissions) {
        if (!permissions.tabs.progoias) return;
        
        const progoiasPermissions = permissions.progoias || {};
        
        // Controlar modo de importação ProGoiás
        const progoiasMultipleRadio = document.querySelector('input[name="importModeProgoias"][value="multiple"]');
        const progoiasMultipleLabel = progoiasMultipleRadio?.parentElement;
        
        console.log('[PERMISSION-DEBUG] ProGoiás múltiplos períodos permitidos:', progoiasPermissions.multiplosPeriodos);
        console.log('[PERMISSION-DEBUG] Elemento radio ProGoiás múltiplos encontrado:', !!progoiasMultipleRadio);
        
        if (progoiasMultipleRadio && progoiasMultipleLabel) {
            if (!progoiasPermissions.multiplosPeriodos) {
                console.log('[PERMISSION] Desabilitando múltiplos períodos ProGoiás');
                progoiasMultipleRadio.disabled = true;
                progoiasMultipleLabel.style.opacity = '0.5';
                progoiasMultipleLabel.style.pointerEvents = 'none';
                progoiasMultipleLabel.style.cursor = 'not-allowed';
                
                // Forçar seleção do período único
                const progoiasSingleRadio = document.querySelector('input[name="importModeProgoias"][value="single"]');
                if (progoiasSingleRadio) {
                    progoiasSingleRadio.checked = true;
                    console.log('[PERMISSION] Forçado período único ProGoiás');
                }
            } else {
                console.log('[PERMISSION] Habilitando múltiplos períodos ProGoiás');
                progoiasMultipleRadio.disabled = false;
                progoiasMultipleLabel.style.opacity = '1';
                progoiasMultipleLabel.style.pointerEvents = 'auto';
                progoiasMultipleLabel.style.cursor = 'pointer';
            }
        }
        
        // Controlar botões ProGoiás
        this.controlButtonVisibility('exportarExcelProgoias', progoiasPermissions.exportar);
        this.controlButtonVisibility('gerarMemoriaCalculoProgoias', progoiasPermissions.memoriaCalculo);
    }
    
    // Aplicar permissões específicas da aba Converter
    applyConverterPermissions(permissions) {
        if (!permissions.tabs.converter) return;
        
        const converterPermissions = permissions.converter || {};
        
        // Controlar elementos do conversor
        this.controlButtonVisibility('convertButton', converterPermissions.converter);
        
        if (!converterPermissions.importar) {
            this.hideElement('dropZone');
            this.hideElement('spedFile');
        }
    }
    
    // Trocar para primeira aba disponível
    switchToFirstAvailableTab(permissions) {
        const activeTab = document.querySelector('.tab-button.active');
        let needsSwitch = false;
        
        if (activeTab) {
            const tabId = activeTab.id;
            if (tabId === 'tabConverter' && !permissions.tabs.converter) needsSwitch = true;
            if (tabId === 'tabFomentar' && !permissions.tabs.fomentar) needsSwitch = true;
            if (tabId === 'tabProgoias' && !permissions.tabs.progoias) needsSwitch = true;
            if (tabId === 'tabLogproduzir' && !permissions.tabs.logproduzir) needsSwitch = true;
        }
        
        if (needsSwitch || !activeTab) {
            // Encontrar primeira aba disponível
            if (permissions.tabs.converter) {
                document.getElementById('tabConverter')?.click();
            } else if (permissions.tabs.fomentar) {
                document.getElementById('tabFomentar')?.click();
            } else if (permissions.tabs.progoias) {
                document.getElementById('tabProgoias')?.click();
            } else if (permissions.tabs.logproduzir) {
                document.getElementById('tabLogproduzir')?.click();
            }
        }
    }
    
    // Aplicar permissões específicas da aba LogPRODUZIR
    applyLogproduzirPermissions(permissions) {
        if (!permissions.tabs.logproduzir) return;
        
        const logproduzirPermissions = permissions.logproduzir || {};
        
        // Controlar modo de importação LogPRODUZIR
        const logproduzirMultipleRadio = document.querySelector('input[name="importModeLogproduzir"][value="multiple"]');
        const logproduzirMultipleLabel = logproduzirMultipleRadio?.parentElement;
        
        console.log('[PERMISSION-DEBUG] LogPRODUZIR múltiplos períodos permitidos:', logproduzirPermissions.multiplosPeriodos);
        console.log('[PERMISSION-DEBUG] Elemento radio LogPRODUZIR múltiplos encontrado:', !!logproduzirMultipleRadio);
        
        if (logproduzirMultipleRadio && logproduzirMultipleLabel) {
            if (!logproduzirPermissions.multiplosPeriodos) {
                console.log('[PERMISSION] Desabilitando múltiplos períodos LogPRODUZIR');
                logproduzirMultipleRadio.disabled = true;
                logproduzirMultipleLabel.style.opacity = '0.5';
                logproduzirMultipleLabel.style.pointerEvents = 'none';
                logproduzirMultipleLabel.style.cursor = 'not-allowed';
                
                // Forçar seleção do período único
                const logproduzirSingleRadio = document.querySelector('input[name="importModeLogproduzir"][value="single"]');
                if (logproduzirSingleRadio) {
                    logproduzirSingleRadio.checked = true;
                    console.log('[PERMISSION] Forçado período único LogPRODUZIR');
                }
            } else {
                console.log('[PERMISSION] Habilitando múltiplos períodos LogPRODUZIR');
                logproduzirMultipleRadio.disabled = false;
                logproduzirMultipleLabel.style.opacity = '1';
                logproduzirMultipleLabel.style.pointerEvents = 'auto';
                logproduzirMultipleLabel.style.cursor = 'pointer';
            }
        }
        
        // Controlar botões LogPRODUZIR
        this.controlButtonVisibility('exportarExcelLogproduzir', logproduzirPermissions.exportar);
        this.controlButtonVisibility('gerarMemoriaCalculoLogproduzir', logproduzirPermissions.memoriaCalculo);
    }
    
    // Utilitários para controle de elementos
    controlButtonVisibility(elementId, hasPermission) {
        const element = document.getElementById(elementId);
        if (element) {
            if (hasPermission) {
                element.style.display = '';
                element.disabled = false;
            } else {
                element.style.display = 'none';
            }
        }
    }
    
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }
    
    // Obter lista de perfis disponíveis
    getAvailableProfiles() {
        return Object.keys(USER_PERMISSIONS);
    }
    
    // Obter descrição do perfil atual
    getCurrentProfileDescription() {
        const descriptions = {
            admin: 'Administrador - Acesso completo',
            fomentarBasico: 'FOMENTAR Básico - Apenas período único',
            fomentarCompleto: 'FOMENTAR Completo - Todas as funcionalidades FOMENTAR',
            converterApenas: 'Conversor - Apenas conversão SPED para Excel',
            progoiasBasico: 'ProGoiás Básico - Apenas período único',
            progoiasCompleto: 'ProGoiás Completo - Todas as funcionalidades ProGoiás',
            logproduzirBasico: 'LogPRODUZIR Básico - Apenas período único',
            logproduzirCompleto: 'LogPRODUZIR Completo - Todas as funcionalidades LogPRODUZIR'
        };
        return descriptions[this.currentProfile] || 'Perfil desconhecido';
    }
}

// Instância global do gerenciador de permissões
const permissionManager = new PermissionManager();

// Funções globais para compatibilidade
function getCurrentPermissions() {
    return permissionManager.getCurrentPermissions();
}

function hasPermission(category, permission) {
    return permissionManager.hasPermission(category, permission);
}

function setUserProfile(profile) {
    return permissionManager.setUserProfile(profile);
}

function applyPermissions() {
    return permissionManager.applyPermissions();
}

// Aplicar permissões quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno delay para garantir que todos os elementos foram criados
    setTimeout(() => {
        permissionManager.applyPermissions();
    }, 100);
});