// src/validation/e115.js
import { addLog } from '../core/logger.js';
import { formatCurrency } from '../core/utils.js';

function generateRegistroE115(dadosCalculo, programType = 'FOMENTAR') {
    if (!dadosCalculo || !dadosCalculo.calculatedValues) {
        addLog('Erro: Dados de cálculo não disponíveis para geração E115', 'error');
        return [];
    }
    
    const values = dadosCalculo.calculatedValues;
    const registrosE115 = [];
    addLog(`Gerando registro E115 para ${programType} com códigos GO200001-GO200054...`, 'info');
    
    // Quadro B - Operações Incentivadas (GO200001-GO200026)
    registrosE115.push(
        { codigo: 'GO200001', descricao: 'Débito do ICMS das Operações Incentivadas', valor: values.debitoIncentivadas || 0 },
        // ... (copiar todos os códigos até linha 3800)
    );
    
    addLog(`E115 gerado com sucesso: ${registrosE115.length} registros`, 'success');
    return registrosE115;
}

function extractE115FromSped(registrosCompletos) {
    if (!registrosCompletos || !registrosCompletos.E115) {
        addLog('SPED não contém registros E115', 'warning');
        return [];
    }
    
    const registrosE115Sped = [];
    // ... (copiar lógica de extração)
    
    return registrosE115Sped;
}

// ... (copiar funções E115 até linha 3800)

export {
    generateRegistroE115,
    extractE115FromSped,
    confrontarE115,
    generateE115SpedText,
    exportRegistroE115,
    exportConfrontoE115Excel
};
