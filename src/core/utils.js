// src/core/utils.js

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function parsePeriod(periodo) {
    // Convert period string like "01/2024" to Date object
    const [month, year] = periodo.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, 1);
}

// ... (copiar funções utilitárias até linha 3120)

export {
    formatCurrency,
    parsePeriod,
    preventDefaults,
    convertPeriodToSortable,
    detectAndRead,
    processarNomeArquivo,
    extrairInformacoesHeader
};
