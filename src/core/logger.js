// src/core/logger.js

function addLog(message, type = 'info') {
    // Sempre mostrar no console para debug
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    if (type === 'error') {
        console.error(logMessage);
    } else if (type === 'warn') {
        console.warn(logMessage);
    } else if (type === 'success') {
        console.log(`✅ ${logMessage}`);
    } else {
        console.log(logMessage);
    }

    // Também adicionar à interface se existir
    if (logWindow) {
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-message');
        logEntry.classList.add(`log-${type}`);
        logEntry.textContent = logMessage;
        logWindow.appendChild(logEntry);
        logWindow.scrollTop = logWindow.scrollHeight;
    }
}

function clearLogs() {
    if (logWindow) {
        logWindow.innerHTML = '';
    }
    addLog("Log inicializado. Aguardando ação...", "info");
}

export { addLog, clearLogs };
