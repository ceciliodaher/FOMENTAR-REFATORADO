/**
 * Gerenciador de Interface do Usuário
 * Responsável por todos os elementos visuais e feedback ao usuário
 */
export class UIManager {
  constructor(logger) {
    this.logger = logger;
    
    // Elementos DOM principais
    this.elements = {
      progressBar: null,
      progressBarContainer: null,
      statusMessage: null,
      convertButton: null,
      selectedSpedFileText: null,
      excelFileNameInput: null,
      logWindow: null
    };
    
    // Estado da interface
    this.state = {
      isProcessing: false,
      currentProgress: 0,
      currentStatus: 'Aguardando arquivo SPED...'
    };
    
    this.initializeElements();
  }

  /**
   * Inicializa referências aos elementos DOM
   */
  initializeElements() {
    try {
      this.elements.progressBar = document.getElementById('progressBar');
      this.elements.progressBarContainer = document.getElementById('progressBarContainer');
      this.elements.statusMessage = document.getElementById('statusMessage');
      this.elements.convertButton = document.getElementById('convertButton');
      this.elements.selectedSpedFileText = document.getElementById('selectedSpedFile');
      this.elements.excelFileNameInput = document.getElementById('excelFileName');
      this.elements.logWindow = document.getElementById('logWindow');
      
      // Verificar elementos críticos
      const criticalElements = ['progressBar', 'statusMessage', 'convertButton'];
      const missingElements = [];
      
      for (const elementName of criticalElements) {
        if (!this.elements[elementName]) {
          missingElements.push(elementName);
        }
      }
      
      if (missingElements.length > 0) {
        this.logger.warn(`Elementos DOM faltantes: ${missingElements.join(', ')}`);
      } else {
        this.logger.info('Elementos DOM da interface inicializados com sucesso');
      }
      
    } catch (error) {
      this.logger.error(`Erro ao inicializar elementos DOM: ${error.message}`);
    }
  }

  /**
   * Atualiza status e barra de progresso
   * @param {string} message - Mensagem de status
   * @param {number} progressPercent - Percentual de progresso (0-100, -1 para não alterar)
   * @param {boolean} error - Se é uma mensagem de erro
   * @param {boolean} indeterminate - Se deve mostrar progresso indeterminado
   */
  updateStatus(message, progressPercent = -1, error = false, indeterminate = false) {
    try {
      // Atualizar mensagem de status
      if (this.elements.statusMessage) {
        this.elements.statusMessage.textContent = message;
        
        // Aplicar estilo de erro se necessário
        if (error) {
          this.elements.statusMessage.classList.add('error');
          this.elements.statusMessage.style.color = '#dc3545';
        } else {
          this.elements.statusMessage.classList.remove('error');
          this.elements.statusMessage.style.color = '';
        }
      }

      // Atualizar barra de progresso
      if (this.elements.progressBar && progressPercent >= 0) {
        if (indeterminate) {
          this.elements.progressBar.classList.add('indeterminate');
          this.elements.progressBar.style.width = '100%';
          this.elements.progressBar.textContent = '⏳';
        } else {
          this.elements.progressBar.classList.remove('indeterminate');
          this.elements.progressBar.style.width = `${progressPercent}%`;
          this.elements.progressBar.textContent = `${Math.round(progressPercent)}%`;
          
          // Cor da barra baseada no progresso
          if (error) {
            this.elements.progressBar.style.backgroundColor = '#ff8a80';
          } else if (progressPercent === 100) {
            this.elements.progressBar.style.backgroundColor = '#4caf50';
          } else {
            this.elements.progressBar.style.backgroundColor = '#2196f3';
          }
        }
        
        this.state.currentProgress = progressPercent;
      }
      
      this.state.currentStatus = message;
      this.logger.info(`Status atualizado: ${message} (${progressPercent}%)`);
      
    } catch (error) {
      this.logger.error(`Erro ao atualizar status: ${error.message}`);
    }
  }

  /**
   * Mostra mensagem de erro
   * @param {string} message - Mensagem de erro
   */
  showError(message) {
    this.logger.error(`Interface Error: ${message}`);
    this.updateStatus(`Erro: ${message}`, -1, true);
    
    // Adicionar classe de erro ao container se existir
    if (this.elements.progressBarContainer) {
      this.elements.progressBarContainer.classList.add('error');
      setTimeout(() => {
        this.elements.progressBarContainer.classList.remove('error');
      }, 5000);
    }
  }

  /**
   * Mostra mensagem de sucesso
   * @param {string} message - Mensagem de sucesso
   */
  showSuccess(message) {
    this.logger.success(message);
    this.updateStatus(message, 100);
    
    // Adicionar classe de sucesso
    if (this.elements.progressBarContainer) {
      this.elements.progressBarContainer.classList.add('success');
      setTimeout(() => {
        this.elements.progressBarContainer.classList.remove('success');
      }, 3000);
    }
  }

  /**
   * Finaliza processo de conversão
   * @param {boolean} sucesso - Se o processo foi bem-sucedido
   * @param {string} mensagemOuErro - Mensagem de sucesso ou erro
   */
  conversaoConcluida(sucesso, mensagemOuErro = "") {
    try {
      // Remover indicador indeterminado
      if (this.elements.progressBar) {
        this.elements.progressBar.classList.remove('indeterminate');
      }

      // Reabilitar botão de conversão
      this.setButtonState('convert', true);
      
      // Atualizar estado interno
      this.state.isProcessing = false;

      if (sucesso) {
        this.showSuccess(mensagemOuErro || "Conversão concluída com sucesso!");
        
        // Efeito visual de sucesso
        this.animateSuccess();
        
      } else {
        this.showError(mensagemOuErro || "Erro durante a conversão");
        
        // Resetar progresso em caso de erro
        if (this.elements.progressBar) {
          this.elements.progressBar.style.width = '0%';
          this.elements.progressBar.textContent = '0%';
        }
      }
      
      this.logger.info(`Conversão finalizada: ${sucesso ? 'SUCESSO' : 'ERRO'}`);
      
    } catch (error) {
      this.logger.error(`Erro ao finalizar conversão: ${error.message}`);
    }
  }

  /**
   * Controla estado dos botões (habilitado/desabilitado)
   * @param {string} buttonType - Tipo do botão ('convert', 'export', etc.)
   * @param {boolean} enabled - Se deve estar habilitado
   */
  setButtonState(buttonType, enabled) {
    try {
      let button = null;
      
      switch (buttonType) {
        case 'convert':
          button = this.elements.convertButton;
          break;
        default:
          button = document.getElementById(`${buttonType}Button`);
      }
      
      if (button) {
        button.disabled = !enabled;
        
        // Adicionar classes visuais
        if (enabled) {
          button.classList.remove('disabled', 'processing');
        } else {
          button.classList.add('disabled');
          if (this.state.isProcessing) {
            button.classList.add('processing');
          }
        }
        
        this.logger.info(`Botão ${buttonType}: ${enabled ? 'habilitado' : 'desabilitado'}`);
      }
      
    } catch (error) {
      this.logger.error(`Erro ao controlar botão ${buttonType}: ${error.message}`);
    }
  }

  /**
   * Inicia indicador de processamento
   * @param {string} message - Mensagem inicial
   */
  startProcessing(message = 'Processando...') {
    this.state.isProcessing = true;
    this.updateStatus(message, 0, false, true);
    this.setButtonState('convert', false);
    
    // Adicionar classe de processamento ao body
    document.body.classList.add('processing');
  }

  /**
   * Para indicador de processamento
   */
  stopProcessing() {
    this.state.isProcessing = false;
    this.setButtonState('convert', true);
    
    // Remover classe de processamento
    document.body.classList.remove('processing');
    
    if (this.elements.progressBar) {
      this.elements.progressBar.classList.remove('indeterminate');
    }
  }

  /**
   * Atualiza texto do arquivo selecionado
   * @param {string} fileName - Nome do arquivo
   * @param {boolean} isSelected - Se um arquivo está selecionado
   */
  updateSelectedFile(fileName, isSelected = true) {
    if (this.elements.selectedSpedFileText) {
      if (isSelected) {
        this.elements.selectedSpedFileText.textContent = `Arquivo selecionado: ${fileName}`;
        this.elements.selectedSpedFileText.style.color = '#28a745';
      } else {
        this.elements.selectedSpedFileText.textContent = 'Nenhum arquivo selecionado';
        this.elements.selectedSpedFileText.style.color = '#666';
      }
    }
  }

  /**
   * Atualiza sugestão de nome do arquivo Excel
   * @param {string} baseName - Nome base para o arquivo
   */
  updateExcelFileName(baseName) {
    if (this.elements.excelFileNameInput && baseName) {
      const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const suggestedName = `${baseName}_${timestamp}.xlsx`;
      this.elements.excelFileNameInput.value = suggestedName;
    }
  }

  /**
   * Animação de sucesso
   */
  animateSuccess() {
    try {
      if (this.elements.progressBarContainer) {
        // Efeito de pulso verde
        this.elements.progressBarContainer.style.animation = 'pulse-success 1s ease-in-out';
        
        setTimeout(() => {
          this.elements.progressBarContainer.style.animation = '';
        }, 1000);
      }
    } catch (error) {
      this.logger.error(`Erro na animação de sucesso: ${error.message}`);
    }
  }

  /**
   * Obtém estado atual da interface
   * @returns {Object} Estado atual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Limpa estado da interface
   */
  reset() {
    this.updateStatus('Aguardando arquivo SPED...', 0);
    this.updateSelectedFile('', false);
    this.setButtonState('convert', false);
    this.state.isProcessing = false;
    
    if (this.elements.excelFileNameInput) {
      this.elements.excelFileNameInput.value = '';
    }
    
    this.logger.info('Interface resetada');
  }

  /**
   * Adiciona CSS personalizado para melhorar visual
   */
  injectCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .processing .progress-bar-style {
        background: linear-gradient(45deg, #2196f3, #21cbf3);
        background-size: 200% 200%;
        animation: gradient-shift 2s ease-in-out infinite;
      }
      
      @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes pulse-success {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
        50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }
      
      .btn-convert.processing {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .btn-convert.processing::after {
        content: '⏳';
        margin-left: 10px;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
    this.logger.info('Estilos customizados da interface injetados');
  }

  /**
   * Inicializa a interface completa
   */
  initialize() {
    this.initializeElements();
    this.injectCustomStyles();
    this.reset();
    this.logger.success('UIManager inicializado completamente');
  }
}