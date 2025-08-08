/**
 * Sistema de logging centralizado
 */

export class Logger {
  constructor(logWindow = null, options = {}) {
    this.logWindow = logWindow;
    this.options = {
      enableConsole: true,
      enableUI: true,
      maxLogEntries: 1000,
      timestampFormat: 'HH:mm:ss',
      ...options
    };
    this.logEntries = [];
    this.logLevel = options.logLevel || 'info';
  }

  addLog(message, type = 'info', data = null) {
    const timestamp = new Date();
    const entry = {
      id: this.generateId(),
      timestamp,
      type,
      message,
      data
    };

    // Adicionar à lista interna
    this.logEntries.push(entry);
    
    // Limitar número de entradas
    if (this.logEntries.length > this.options.maxLogEntries) {
      this.logEntries.shift();
    }

    // Log no console se habilitado
    if (this.options.enableConsole) {
      this.logToConsole(entry);
    }

    // Log na UI se habilitado
    if (this.options.enableUI && this.logWindow) {
      this.logToUI(entry);
    }

    // Emitir evento customizado
    this.emit('log', entry);
  }

  logToConsole(entry) {
    const timeStr = this.formatTimestamp(entry.timestamp);
    const logMessage = `[${timeStr}] ${entry.message}`;
    
    switch (entry.type) {
      case 'error':
        console.error(logMessage, entry.data);
        break;
      case 'warn':
      case 'warning':
        console.warn(logMessage, entry.data);
        break;
      case 'success':
        console.log(`✅ ${logMessage}`, entry.data);
        break;
      case 'debug':
        console.debug(logMessage, entry.data);
        break;
      default:
        console.log(logMessage, entry.data);
    }
  }

  logToUI(entry) {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-message', `log-${entry.type}`);
    logEntry.setAttribute('data-log-id', entry.id);
    
    const timeStr = this.formatTimestamp(entry.timestamp);
    logEntry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-content">${this.escapeHtml(entry.message)}</span>
    `;

    this.logWindow.appendChild(logEntry);
    this.scrollToBottom();
  }

  clearLogs() {
    this.logEntries = [];
    
    if (this.logWindow) {
      this.logWindow.innerHTML = '';
    }
    
    this.addLog("Log inicializado. Aguardando ação...", "info");
  }

  scrollToBottom() {
    if (this.logWindow) {
      this.logWindow.scrollTop = this.logWindow.scrollHeight;
    }
  }

  formatTimestamp(timestamp) {
    return timestamp.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Métodos de conveniência
  info(message, data = null) {
    this.addLog(message, 'info', data);
  }

  warn(message, data = null) {
    this.addLog(message, 'warn', data);
  }

  error(message, data = null) {
    this.addLog(message, 'error', data);
  }

  success(message, data = null) {
    this.addLog(message, 'success', data);
  }

  debug(message, data = null) {
    this.addLog(message, 'debug', data);
  }

  // Sistema de eventos simples
  emit(eventName, data) {
    if (this.listeners && this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erro no listener de log:', error);
        }
      });
    }
  }

  on(eventName, callback) {
    if (!this.listeners) {
      this.listeners = {};
    }
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  // Exportar logs
  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logEntries, null, 2);
    } else if (format === 'txt') {
      return this.logEntries.map(entry => {
        const timeStr = this.formatTimestamp(entry.timestamp);
        return `[${timeStr}] [${entry.type.toUpperCase()}] ${entry.message}`;
      }).join('\n');
    }
  }

  // Filtrar logs
  filterLogs(criteria) {
    return this.logEntries.filter(entry => {
      if (criteria.type && entry.type !== criteria.type) return false;
      if (criteria.message && !entry.message.toLowerCase().includes(criteria.message.toLowerCase())) return false;
      if (criteria.since && entry.timestamp < criteria.since) return false;
      if (criteria.until && entry.timestamp > criteria.until) return false;
      return true;
    });
  }

  // Estatísticas
  getStats() {
    const stats = {
      total: this.logEntries.length,
      byType: {}
    };

    this.logEntries.forEach(entry => {
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
    });

    return stats;
  }
}

export default Logger;

