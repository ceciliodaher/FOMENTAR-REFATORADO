// src/ui/dragdrop.js
import { addLog } from '../core/logger.js';

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragEnter(e) {
    preventDefaults(e);
    highlight(e);
}

function handleDragOver(e) {
    preventDefaults(e);
    highlight(e);
}

function handleDragLeave(e) {
    preventDefaults(e);
    if (!dropZone.contains(e.relatedTarget)) {
        unhighlight(e);
    }
}

function handleFileDrop(e) {
    preventDefaults(e);
    unhighlight(e);
    
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const fileToProcess = files[0];
        addLog(`Arquivo "${fileToProcess.name}" solto na área.`, "info");
        
        if (fileToProcess.name.toLowerCase().endsWith('.txt')) {
            processSpedFile(fileToProcess);
        } else {
            addLog(`Tipo de arquivo "${fileToProcess.name}" não suportado. Use .txt.`, 'error');
            showError("Por favor, solte apenas arquivos .txt (SPED).");
        }
    }
}

// ... (copiar todas as funções de drag & drop até linha 580)

export {
    preventDefaults,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleFileDrop,
    highlight,
    unhighlight
};
