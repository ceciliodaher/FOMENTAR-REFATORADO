// src/main.js

// Importações dos módulos
import { addLog, clearLogs } from './core/logger.js';
import { initializeEventListeners, setProgoiasData } from './ui/handlers.js';
import { processSpedFile } from './sped/processor.js';
import { calculateFomentar } from './calculators/fomentar.js';
import { calculateProgoias } from './calculators/progoias.js';
import { calculateLogproduzir } from './calculators/logproduzir.js';

// Variáveis globais
let spedFile = null;
let spedFileContent = '';
let sharedNomeEmpresa = "Empresa";
let sharedPeriodo = "";
let fomentarData = null;
let registrosCompletos = null;
let progoiasRegistrosCompletos = null;
let progoiasCurrentImportMode = 'single';


// Inicialização principal
document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const spedFileButtonLabel = document.querySelector('label[for="spedFile"]');
    const spedFileInput = document.getElementById('spedFile');
    
    // Inicializar módulos
    initializeEventListeners();
    setProgoiasData(progoiasRegistrosCompletos, progoiasCurrentImportMode);
    clearLogs();
    addLog("Sistema inicializado. Pronto para uso.", "success");
});

// Funções de orquestração que conectam os módulos
async function iniciarConversao() {
    if (!validarEntrada()) {
        addLog("Validação de entrada falhou.", "warn");
        return;
    }
    
    addLog("Validação de entrada bem-sucedida.", "info");
    // ... (lógica de orquestração)
}

// Exportar para uso global se necessário
window.app = {
    processSpedFile,
    calculateFomentar,
    calculateProgoias,
    calculateLogproduzir
};