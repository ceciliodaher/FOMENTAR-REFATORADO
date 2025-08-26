// src/export/excel.js
import { addLog } from '../core/logger.js';
import { formatCurrency } from '../core/utils.js';

async function gerarExcel(registros, nomeEmpresa, periodo, caminhoSaida) {
    updateStatus('Preparando dados para Excel...', 60);
    
    try {
        const workbook = await XlsxPopulate.fromBlankAsync();
        addLog('Novo workbook Excel criado.', 'info');
        
        const context = {
            registros,
            workbook,
            writer: workbook,
            obterLayoutRegistro,
            logger: {
                info: (msg) => addLog(msg, 'info'),
                error: (msg) => addLog(msg, 'error'),
                warn: (msg) => addLog(msg, 'warn')
            },
            ajustarColunas: _ajustarColunas,
            formatarPlanilha: _formatarPlanilha,
            nomeEmpresa,
            periodo,
            addLog
        };
        
        // ... (copiar toda lógica de geração Excel até linha 1600)
        
        const excelData = await workbook.outputAsync();
        const blob = new Blob([excelData], { 
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = caminhoSaida;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        conversaoConcluida(true, caminhoSaida);
    } catch (error) {
        conversaoConcluida(false, `Erro ao gerar Excel: ${error.message}`);
    }
}

// ... (copiar funções auxiliares de Excel)

export {
    gerarExcel,
    _processarRegistros,
    _criarAbaConsolidada,
    _processarOutrasObrigacoes,
    _ajustarColunas,
    _formatarPlanilha
};
