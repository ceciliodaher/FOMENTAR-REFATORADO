// src/sped/parser.js
import { addLog } from '../core/logger.js';

function lerArquivoSpedParaHeader(fileContent) {
    const registros = { '0000': [] };
    const lines = fileContent.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (isLinhaValida(trimmedLine)) {
            const campos = trimmedLine.split('|');
            if (campos.length > 1 && campos[1] === '0000') {
                registros['0000'].push(campos.slice(1, -1));
            }
        }
        if (registros['0000'].length > 0) break;
    }
    return registros;
}

function lerArquivoSpedCompleto(fileContent) {
    const registros = {};
    const lines = fileContent.split('\n');
    
    for (const rawLine of lines) {
        const linha = rawLine.trim();
        if (isLinhaValida(linha)) {
            const campos = linha.split('|');
            const tipoRegistro = campos[1];
            const dadosRegistro = campos;
            
            if (!registros[tipoRegistro]) {
                registros[tipoRegistro] = [];
            }
            registros[tipoRegistro].push(dadosRegistro);
        }
    }
    
    console.log("SPED Completo Lido e Estruturado. Contagem de Tipos:", Object.keys(registros).length);
    return registros;
}

// ... (copiar até linha 780)

export {
    lerArquivoSpedParaHeader,
    lerArquivoSpedCompleto,
    isLinhaValida,
    extrairDadosEmpresa,
    obterLayoutRegistro
};

