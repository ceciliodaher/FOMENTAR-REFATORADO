export class DragDropManager {
  constructor(spedApp) {
    this.spedApp = spedApp;
  }

  setupConverterDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
      this.setupDropZone(dropZone, {
        onDrop: (files) => this.handleConverterDrop(files),
        allowMultiple: false,
        fileType: '.txt'
      });
    }
  }

  setupFomentarDropZone() {
    const dropZone = document.getElementById('fomentarDropZone');
    if (dropZone) {
      this.setupDropZone(dropZone, {
        onDrop: (files) => this.handleFomentarDrop(files),
        allowMultiple: false,
        fileType: '.txt'
      });
    }
  }

  setupProgoiasDropZone() {
    const dropZone = document.getElementById('progoiasDropZone');
    if (dropZone) {
      this.setupDropZone(dropZone, {
        onDrop: (files) => this.handleProgoiasDrop(files),
        allowMultiple: false,
        fileType: '.txt'
      });
    }
  }

  setupLogproduzirDropZone() {
    const dropZone = document.getElementById('logproduzirDropZone');
    if (dropZone) {
      this.setupDropZone(dropZone, {
        onDrop: (files) => this.handleLogproduzirDrop(files),
        allowMultiple: false,
        fileType: '.txt'
      });
    }
  }

  setupMultipleDropZones() {
    // FOMENTAR multiple
    const multipleDropZone = document.getElementById('multipleDropZone');
    if (multipleDropZone) {
      this.setupDropZone(multipleDropZone, {
        onDrop: (files) => this.handleMultipleDrop(files),
        allowMultiple: true,
        fileType: '.txt'
      });
    }

    // ProGoiás multiple
    const multipleDropZoneProgoias = document.getElementById('multipleDropZoneProgoias');
    if (multipleDropZoneProgoias) {
      this.setupDropZone(multipleDropZoneProgoias, {
        onDrop: (files) => this.handleProgoiasMultipleDrop(files),
        allowMultiple: true,
        fileType: '.txt'
      });
    }

    // LogPRODUZIR multiple
    const multipleDropZoneLogproduzir = document.getElementById('multipleDropZoneLogproduzir');
    if (multipleDropZoneLogproduzir) {
      this.setupDropZone(multipleDropZoneLogproduzir, {
        onDrop: (files) => this.handleLogproduzirMultipleDrop(files),
        allowMultiple: true,
        fileType: '.txt'
      });
    }
  }

  setupDropZone(element, options) {
    const {
      onDrop,
      allowMultiple = false,
      fileType = '.txt'
    } = options;

    // Prevent default browser behavior
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      element.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      element.addEventListener(eventName, () => this.highlight(element), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      element.addEventListener(eventName, () => this.unhighlight(element), false);
    });

    // Handle dropped files
    element.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = this.filterValidFiles(files, fileType);
      
      if (validFiles.length === 0) {
        this.spedApp.logger.error(`Nenhum arquivo ${fileType} válido encontrado`);
        return;
      }

      if (!allowMultiple && validFiles.length > 1) {
        this.spedApp.logger.warn('Múltiplos arquivos detectados. Usando apenas o primeiro.');
        onDrop([validFiles[0]]);
      } else {
        onDrop(validFiles);
      }
    }, false);
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight(element) {
    element.classList.add('highlight', 'dragover');
  }

  unhighlight(element) {
    element.classList.remove('highlight', 'dragover');
  }

  filterValidFiles(files, fileType) {
    const extension = fileType.replace('.', '').toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().endsWith(`.${extension}`)
    );
  }

  async handleConverterDrop(files) {
    const file = files[0];
    this.spedApp.logger.info(`Arquivo detectado para conversão: ${file.name}`);
    
    try {
      await this.spedApp.processSpedFile(file);
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  async handleFomentarDrop(files) {
    const file = files[0];
    this.spedApp.logger.info(`Arquivo SPED detectado para FOMENTAR: ${file.name}`);
    
    try {
      await this.spedApp.processSpedFile(file, 'fomentar');
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar arquivo FOMENTAR: ${error.message}`);
    }
  }

  async handleProgoiasDrop(files) {
    const file = files[0];
    this.spedApp.logger.info(`Arquivo SPED detectado para ProGoiás: ${file.name}`);
    
    try {
      await this.spedApp.processSpedFile(file, 'progoias');
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar arquivo ProGoiás: ${error.message}`);
    }
  }

  async handleLogproduzirDrop(files) {
    const file = files[0];
    this.spedApp.logger.info(`Arquivo SPED detectado para LogPRODUZIR: ${file.name}`);
    
    try {
      await this.spedApp.processSpedFile(file, 'logproduzir');
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar arquivo LogPRODUZIR: ${error.message}`);
    }
  }

  handleMultipleDrop(files) {
    this.spedApp.logger.info(`${files.length} arquivo(s) SPED adicionado(s) via drag & drop`);
    
    try {
      // Simular seleção de arquivos múltiplos
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      
      const multipleFilesInput = document.getElementById('multipleSpedFiles');
      if (multipleFilesInput) {
        multipleFilesInput.files = dt.files;
        this.spedApp.handleMultipleSpedSelection({ target: { files } });
      }
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar múltiplos arquivos: ${error.message}`);
    }
  }

  handleProgoiasMultipleDrop(files) {
    this.spedApp.logger.info(`${files.length} arquivo(s) SPED ProGoiás adicionado(s) via drag & drop`);
    
    try {
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      
      const multipleFilesInput = document.getElementById('multipleSpedFilesProgoias');
      if (multipleFilesInput) {
        multipleFilesInput.files = dt.files;
        this.spedApp.handleProgoiasMultipleSpedSelection({ target: { files } });
      }
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar múltiplos arquivos ProGoiás: ${error.message}`);
    }
  }

  handleLogproduzirMultipleDrop(files) {
    this.spedApp.logger.info(`${files.length} arquivo(s) SPED LogPRODUZIR adicionado(s) via drag & drop`);
    
    try {
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      
      const multipleFilesInput = document.getElementById('multipleSpedFilesLogproduzir');
      if (multipleFilesInput) {
        multipleFilesInput.files = dt.files;
        this.spedApp.handleLogproduzirMultipleSpedSelection({ target: { files } });
      }
    } catch (error) {
      this.spedApp.logger.error(`Erro ao processar múltiplos arquivos LogPRODUZIR: ${error.message}`);
    }
  }

  // Método utilitário para criar indicador visual de drag
  createDragIndicator(text) {
    const indicator = document.createElement('div');
    indicator.className = 'drag-indicator';
    indicator.innerHTML = `
      <div class="drag-icon">📄</div>
      <div class="drag-text">${text}</div>
    `;
    return indicator;
  }

  // Método para validar tipos de arquivo
  validateFileType(file, allowedTypes) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.some(type => 
      type.replace('.', '').toLowerCase() === fileExtension
    );
  }

  // Método para obter informações do arquivo
  getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      extension: file.name.split('.').pop().toLowerCase()
    };
  }
}

export default DragDropManager;

