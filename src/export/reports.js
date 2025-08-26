// src/export/reports.js
import { addLog } from '../core/logger.js';
import { formatCurrency } from '../core/utils.js';

async function exportFomentarReport() {
    const isMultiplePeriods = multiPeriodData.length > 1;
    const periodsData = isMultiplePeriods ? multiPeriodData : [{
        periodo: sharedPeriodo,
        nomeEmpresa: sharedNomeEmpresa,
        fomentarData: fomentarData,
        calculatedValues: fomentarData.calculatedValues
    }];
    
    if (!periodsData.length || (!isMultiplePeriods && !fomentarData)) {
        addLog('Erro: Nenhum dado FOMENTAR disponível para exportação', 'error');
        return;
    }
    
    try {
        addLog('Gerando relatório FOMENTAR para exportação...', 'info');
        const workbook = await XlsxPopulate.fromBlankAsync();
        
        // ... (copiar lógica completa de relatórios até linha 3000)
        
        const blob = await workbook.outputAsync();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('Relatório FOMENTAR exportado com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao exportar relatório FOMENTAR:', error);
        addLog('Erro ao exportar relatório FOMENTAR: ' + error.message, 'error');
    }
}

// ... (copiar funções de exportação de relatórios)

export {
    exportFomentarReport,
    exportProgoisReport,
    exportLogproduzirReport,
    exportFomentarMemoriaCalculo,
    printFomentarReport
};
