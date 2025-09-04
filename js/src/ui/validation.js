/**
 * Validador de Interface do Usuário
 * Responsável por todas as validações de entrada e formulários
 */
export class UIValidator {
  constructor(logger) {
    this.logger = logger;
    
    // Configurações de validação
    this.config = {
      maxFileSize: 200 * 1024 * 1024, // 200MB
      allowedExtensions: ['.txt'],
      minFileNameLength: 1,
      maxFileNameLength: 255,
      reservedNames: ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    };
  }

  /**
   * Valida entrada principal do conversor
   * @returns {Object} Resultado da validação
   */
  validarEntrada() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // 1. Verificar se arquivo SPED foi selecionado
      const fileValidation = this.validateSpedFile();
      if (!fileValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...fileValidation.errors);
      }

      // 2. Verificar nome do arquivo Excel
      const excelNameValidation = this.validateExcelFileName();
      if (!excelNameValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...excelNameValidation.errors);
      }
      validation.warnings.push(...excelNameValidation.warnings);

      // 3. Verificar estado geral da interface
      const interfaceValidation = this.validateInterfaceState();
      validation.warnings.push(...interfaceValidation.warnings);

      // Log do resultado
      if (validation.isValid) {
        this.logger.info('Validação de entrada: OK');
      } else {
        this.logger.error(`Validação de entrada falhou: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(`Avisos de validação: ${validation.warnings.join(', ')}`);
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Erro interno na validação: ${error.message}`);
      this.logger.error(`Erro na validação de entrada: ${error.message}`);
    }

    return validation;
  }

  /**
   * Valida arquivo SPED selecionado
   * @returns {Object} Resultado da validação
   */
  validateSpedFile() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Obter arquivo SPED do estado da aplicação
      const spedFile = window.spedApp?.state?.currentFile;
      
      if (!spedFile) {
        validation.isValid = false;
        validation.errors.push('Selecione um arquivo SPED (.txt)');
        return validation;
      }

      // Validar arquivo da aplicação
      return this.validateFileObject(spedFile);

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Erro ao validar arquivo SPED: ${error.message}`);
    }

    return validation;
  }

  /**
   * Valida objeto File
   * @param {File} file - Arquivo para validar
   * @returns {Object} Resultado da validação
   */
  validateFileObject(file) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!file) {
      validation.isValid = false;
      validation.errors.push('Arquivo não fornecido');
      return validation;
    }

    // 1. Verificar extensão
    const fileName = file.name.toLowerCase();
    const hasValidExtension = this.config.allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      validation.isValid = false;
      validation.errors.push(`Arquivo deve ter extensão: ${this.config.allowedExtensions.join(', ')}`);
    }

    // 2. Verificar tamanho
    if (file.size > this.config.maxFileSize) {
      validation.errors.push(`Arquivo muito grande. Máximo: ${Math.round(this.config.maxFileSize / 1024 / 1024)}MB`);
      validation.isValid = false;
    }

    if (file.size === 0) {
      validation.errors.push('Arquivo está vazio');
      validation.isValid = false;
    }

    // 3. Verificar se é realmente um arquivo SPED (verificação básica)
    if (!this.isSpedFileName(file.name)) {
      validation.warnings.push('Nome do arquivo não segue padrão SPED típico');
    }

    // 4. Verificar data de modificação
    if (file.lastModified) {
      const fileDate = new Date(file.lastModified);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (fileDate < oneYearAgo) {
        validation.warnings.push('Arquivo parece ser muito antigo (mais de 1 ano)');
      }
    }

    return validation;
  }

  /**
   * Valida nome do arquivo Excel de saída
   * @returns {Object} Resultado da validação
   */
  validateExcelFileName() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const excelInput = document.getElementById('excelFileName');
      
      if (!excelInput) {
        validation.warnings.push('Campo de nome do Excel não encontrado');
        return validation;
      }

      const fileName = excelInput.value.trim();

      // 1. Verificar se foi preenchido
      if (!fileName) {
        validation.isValid = false;
        validation.errors.push('Digite um nome para o arquivo Excel de saída');
        return validation;
      }

      // 2. Verificar comprimento
      if (fileName.length < this.config.minFileNameLength) {
        validation.isValid = false;
        validation.errors.push('Nome do arquivo muito curto');
      }

      if (fileName.length > this.config.maxFileNameLength) {
        validation.isValid = false;
        validation.errors.push(`Nome do arquivo muito longo (máximo ${this.config.maxFileNameLength} caracteres)`);
      }

      // 3. Verificar caracteres inválidos
      const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
      if (invalidChars.test(fileName)) {
        validation.isValid = false;
        validation.errors.push('Nome contém caracteres inválidos: < > : " / \\ | ? *');
      }

      // 4. Verificar nomes reservados
      const baseFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove extensão
      if (this.config.reservedNames.includes(baseFileName.toUpperCase())) {
        validation.isValid = false;
        validation.errors.push(`"${baseFileName}" é um nome reservado do sistema`);
      }

      // 5. Verificar extensão
      if (!fileName.toLowerCase().endsWith('.xlsx')) {
        validation.warnings.push('Recomendado adicionar extensão .xlsx');
      }

      // 6. Verificar se não termina com ponto ou espaço
      if (fileName.endsWith('.') || fileName.endsWith(' ')) {
        validation.isValid = false;
        validation.errors.push('Nome não pode terminar com ponto ou espaço');
      }

    } catch (error) {
      validation.warnings.push(`Erro ao validar nome do Excel: ${error.message}`);
    }

    return validation;
  }

  /**
   * Valida estado geral da interface
   * @returns {Object} Resultado da validação
   */
  validateInterfaceState() {
    const validation = {
      warnings: []
    };

    try {
      // 1. Verificar se elementos críticos existem
      const criticalElements = ['progressBar', 'statusMessage', 'convertButton'];
      const missingElements = [];

      for (const elementId of criticalElements) {
        if (!document.getElementById(elementId)) {
          missingElements.push(elementId);
        }
      }

      if (missingElements.length > 0) {
        validation.warnings.push(`Elementos de interface ausentes: ${missingElements.join(', ')}`);
      }

      // 2. Verificar se há processamento em andamento
      if (window.spedApp?.uiManager?.state?.isProcessing) {
        validation.warnings.push('Há um processamento em andamento');
      }

      // 3. Verificar se há dados carregados
      if (window.spedApp?.state?.registrosCompletos) {
        validation.warnings.push('Já existem dados SPED carregados na memória');
      }

    } catch (error) {
      validation.warnings.push(`Erro ao verificar estado da interface: ${error.message}`);
    }

    return validation;
  }

  /**
   * Valida dados de entrada para módulos específicos
   * @param {string} module - Nome do módulo (fomentar, progoias, logproduzir)
   * @param {Object} data - Dados para validar
   * @returns {Object} Resultado da validação
   */
  validateModuleData(module, data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      switch (module.toLowerCase()) {
        case 'fomentar':
          return this.validateFomentarData(data);
        case 'progoias':
          return this.validateProgoiasData(data);
        case 'logproduzir':
          return this.validateLogproduzirData(data);
        default:
          validation.warnings.push(`Módulo ${module} não tem validação específica`);
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Erro na validação do módulo ${module}: ${error.message}`);
    }

    return validation;
  }

  /**
   * Valida dados FOMENTAR
   * @param {Object} data - Dados FOMENTAR
   * @returns {Object} Resultado da validação
   */
  validateFomentarData(data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!data || !data.registrosCompletos) {
      validation.isValid = false;
      validation.errors.push('Dados SPED não carregados para FOMENTAR');
      return validation;
    }

    // Verificar registros essenciais
    const requiredRegisters = ['C190', 'E110'];
    for (const register of requiredRegisters) {
      if (!data.registrosCompletos[register] || data.registrosCompletos[register].length === 0) {
        validation.warnings.push(`Registro ${register} não encontrado - pode afetar cálculo FOMENTAR`);
      }
    }

    return validation;
  }

  /**
   * Valida dados ProGoiás
   * @param {Object} data - Dados ProGoiás
   * @returns {Object} Resultado da validação
   */
  validateProgoiasData(data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!data || !data.registrosCompletos) {
      validation.isValid = false;
      validation.errors.push('Dados SPED não carregados para ProGoiás');
      return validation;
    }

    // Verificações específicas ProGoiás
    if (!data.registrosCompletos.E110) {
      validation.errors.push('Registro E110 (apuração ICMS) necessário para ProGoiás');
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Valida dados LogPRODUZIR
   * @param {Object} data - Dados LogPRODUZIR
   * @returns {Object} Resultado da validação
   */
  validateLogproduzirData(data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!data || !data.registrosCompletos) {
      validation.isValid = false;
      validation.errors.push('Dados SPED não carregados para LogPRODUZIR');
      return validation;
    }

    // Verificar registros de transporte
    const transportRegisters = ['D190', 'D590'];
    let hasTransportData = false;

    for (const register of transportRegisters) {
      if (data.registrosCompletos[register] && data.registrosCompletos[register].length > 0) {
        hasTransportData = true;
        break;
      }
    }

    if (!hasTransportData) {
      validation.warnings.push('Nenhum registro de transporte encontrado - LogPRODUZIR pode não ter dados para processar');
    }

    return validation;
  }

  /**
   * Verifica se nome do arquivo parece ser SPED
   * @param {string} fileName - Nome do arquivo
   * @returns {boolean} True se parece ser SPED
   */
  isSpedFileName(fileName) {
    const spedPatterns = [
      /sped/i,
      /efd/i,
      /icms/i,
      /\d{14}/,  // CNPJ
      /\d{6,8}/, // Período (MMAAAA ou MMDDAAAA)
    ];

    return spedPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Sanitiza nome de arquivo
   * @param {string} fileName - Nome do arquivo
   * @returns {string} Nome sanitizado
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Substituir caracteres inválidos
      .replace(/^\.+/, '') // Remove pontos do início
      .replace(/\.+$/, '') // Remove pontos do final
      .replace(/\s+$/, '') // Remove espaços do final
      .substring(0, this.config.maxFileNameLength); // Truncar se muito longo
  }

  /**
   * Gera nome sugerido para arquivo Excel
   * @param {string} spedFileName - Nome do arquivo SPED
   * @param {string} empresa - Nome da empresa
   * @param {string} periodo - Período
   * @returns {string} Nome sugerido
   */
  generateExcelFileName(spedFileName, empresa = '', periodo = '') {
    try {
      let baseName = 'SPED_Convertido';
      
      if (empresa && periodo) {
        const empresaClean = empresa.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        baseName = `${empresaClean}_${periodo}`;
      } else if (spedFileName) {
        baseName = spedFileName.replace(/\.[^/.]+$/, ""); // Remove extensão
        baseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
      }
      
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const suggestedName = `${baseName}_${timestamp}.xlsx`;
      
      return this.sanitizeFileName(suggestedName);
      
    } catch (error) {
      this.logger.error(`Erro ao gerar nome do Excel: ${error.message}`);
      return 'SPED_Convertido.xlsx';
    }
  }

  /**
   * Valida configurações do usuário
   * @param {Object} config - Configurações
   * @returns {Object} Resultado da validação
   */
  validateUserConfig(config) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Validar percentuais
      if (config.percentualFinanciamento !== undefined) {
        const percentual = parseFloat(config.percentualFinanciamento);
        if (isNaN(percentual) || percentual < 0 || percentual > 100) {
          validation.isValid = false;
          validation.errors.push('Percentual de financiamento deve estar entre 0 e 100');
        }
      }

      // Validar períodos
      if (config.periodo) {
        const periodoRegex = /^\d{2}\/\d{4}$/;
        if (!periodoRegex.test(config.periodo)) {
          validation.warnings.push('Formato de período recomendado: MM/AAAA');
        }
      }

    } catch (error) {
      validation.warnings.push(`Erro ao validar configurações: ${error.message}`);
    }

    return validation;
  }

  /**
   * Obtém configurações de validação
   * @returns {Object} Configurações atuais
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Atualiza configurações de validação
   * @param {Object} newConfig - Novas configurações
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configurações de validação atualizadas');
  }
}