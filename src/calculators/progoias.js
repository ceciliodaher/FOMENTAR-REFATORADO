// src/calculators/progoias.js
import { addLog } from '../core/logger.js';
import { formatCurrency } from '../core/utils.js';

// ProGoiás Configuration Constants
const PROGOIAS_CONFIG = {
    PERCENTUAIS_POR_ANO: {
        1: 64, // 1º ano - 64%
        2: 55, // 2º ano - 55%
        3: 46  // 3º ano - 46%
    }
};

function calculateProgoias(registros) {
    // Obter percentual calculado ou usar default
    let percentualIncentivo = 64;
    
    const opcaoCalculo = document.getElementById('progoiasOpcaoCalculo').value;
    // ... (copiar lógica completa de cálculo ProGoiás)
}

function calculateProgoisApuracao(operacoes, config) {
    addLog('=== ABA 1: CÁLCULO DO PROGOIÁS (Planilha Oficial) ===', 'info');
    // ... (copiar cálculo completo)
}

// ... (copiar todas as funções ProGoiás até linha 5400)

export {
    calculateProgoias,
    calculateProgoisApuracao,
    calculateIcmsComProgoias,
    updateProgoisUI,
    PROGOIAS_CONFIG
};
