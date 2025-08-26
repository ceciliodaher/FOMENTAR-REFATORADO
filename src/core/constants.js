// src/core/constants.js

// CLAUDE-FISCAL: CFOPs específicos de transporte conforme documentação LogPRODUZIR
// CFOPs que geram incentivo (Fretes Interestaduais - FI)
const CFOP_LOGPRODUZIR_FRETES_INTERESTADUAIS = [
'6351', // Transporte para execução de serviço da mesma natureza
// ... (copiar até linha 99)

// CLAUDE-FISCAL: Constantes LogPRODUZIR movidas para escopo global (linha ~61-99)
// === CONSTANTES CFOP GENÉRICO ===
const CFOPS_GENERICOS = [
// ... (copiar até linha 189)

// CFOPs para classificação de operações incentivadas (baseado na IN 885/07-GSF)
const CFOP_ENTRADAS_INCENTIVADAS = [
// ... (copiar até linha 250)

// Exportar todas as constantes
export {
    CFOP_LOGPRODUZIR_FRETES_INTERESTADUAIS,
    CFOP_LOGPRODUZIR_FRETE_TOTAL,
    LOGPRODUZIR_PERCENTUAIS,
    LOGPRODUZIR_CONTRIBUICOES,
    CFOPS_GENERICOS,
    CFOPS_GENERICOS_DESCRICOES,
    CFOP_ENTRADAS_INCENTIVADAS,
    CFOP_SAIDAS_INCENTIVADAS,
    CODIGOS_AJUSTE_INCENTIVADOS,
    CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS,
    CODIGOS_CREDITO_FOMENTAR
};
