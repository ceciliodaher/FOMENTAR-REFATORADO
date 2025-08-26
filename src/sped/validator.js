// src/sped/validator.js

function isLinhaValida(linha) {
    linha = linha.trim();
    if (!linha) return false;
    if (!linha.startsWith('|') || !linha.endsWith('|')) return false;
    
    const campos = linha.split('|');
    if (campos.length < 3) return false;
    
    const regCode = campos[1];
    if (!regCode) return false;
    
    const padraoRegistro = /^[A-Z0-9]?\d{3,4}$/;
    return padraoRegistro.test(regCode);
}

function validarEntrada() {
    if (!spedFile) {
        showError("Selecione o arquivo SPED");
        return false;
    }
    
    if (!excelFileNameInput.value.trim()) {
        showError("Digite um nome para o arquivo Excel");
        return false;
    }
    
    return true;
}

export { isLinhaValida, validarEntrada };
