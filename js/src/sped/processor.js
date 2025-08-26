import { SpedParser } from './parser.js';
import { SpedValidator } from './validator.js';
import { formatCurrency, parseFloatSafe } from '../core/utils.js';

export class SpedProcessor {
  constructor(logger) {
    this.logger = logger;
    this.parser = new SpedParser(logger);
    this.validator = new SpedValidator(logger);
    
    // Cache para dados processados
    this.cache = {
      registrosCompletos: null,
      headerInfo: null,
      lastFileHash: null
    };
  }

  /**
   * Processa arquivo SPED completo
   * @param {File} file - Arquivo SPED
   * @returns {Promise<Object>} Dados processados
   */
  async processSpedFile(file) {
    this.logger.info(`Processando arquivo SPED: ${file.name}`);
    
    try {
      // 1. Ler conteúdo do arquivo
      const fileContent = await this.readFileContent(file);
      const fileHash = this.generateHash(fileContent);
      
      // Verificar cache
      if (this.cache.lastFileHash === fileHash && this.cache.registrosCompletos) {
        this.logger.info('Usando dados do cache');
        return {
          registrosCompletos: this.cache.registrosCompletos,
          headerInfo: this.cache.headerInfo
        };
      }
      
      // 2. Extrair informações do header
      const headerInfo = this.parser.extractHeaderInfo(fileContent);
      this.logger.info(`Empresa: ${headerInfo.nomeEmpresa} | Período: ${headerInfo.periodo}`);
      
      // 3. Validar estrutura básica
      if (!this.validator.validateBasicStructure(fileContent)) {
        throw new Error('Estrutura básica do SPED inválida');
      }
      
      // 4. Processar todos os registros
      const registrosCompletos = this.parser.parseCompleteFile(fileContent);
      
      // 5. Validar registros críticos
      this.validateCriticalRecords(registrosCompletos);
      
      // 6. Processar dados por tipo de registro
      const processedData = this.processRegistryData(registrosCompletos);
      
      // Atualizar cache
      this.cache = {
        registrosCompletos: processedData,
        headerInfo,
        lastFileHash: fileHash
      };
      
      this.logger.success('Arquivo SPED processado com sucesso');
      
      return {
        registrosCompletos: processedData,
        headerInfo
      };
      
    } catch (error) {
      this.logger.error(`Erro ao processar SPED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lê conteúdo do arquivo detectando encoding
   * @param {File} file - Arquivo
   * @returns {Promise<string>} Conteúdo do arquivo
   */
  async readFileContent(file) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Detectar encoding (UTF-8, ISO-8859-1, etc.)
    let content;
    try {
      // Tentar UTF-8 primeiro
      const decoder = new TextDecoder('utf-8', { fatal: true });
      content = decoder.decode(bytes);
    } catch {
      // Fallback para ISO-8859-1 (Windows-1252)
      const decoder = new TextDecoder('iso-8859-1');
      content = decoder.decode(bytes);
      this.logger.warn('Arquivo detectado como ISO-8859-1');
    }
    
    return content;
  }

  /**
   * Gera hash simples do conteúdo para cache
   * @param {string} content - Conteúdo
   * @returns {string} Hash
   */
  generateHash(content) {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Valida registros críticos do SPED
   * @param {Object} registros - Registros processados
   */
  validateCriticalRecords(registros) {
    const requiredRecords = ['0000', 'C100', 'E110'];
    const missingRecords = [];
    
    for (const record of requiredRecords) {
      if (!registros[record] || registros[record].length === 0) {
        missingRecords.push(record);
      }
    }
    
    if (missingRecords.length > 0) {
      this.logger.warn(`Registros críticos ausentes: ${missingRecords.join(', ')}`);
    }
    
    // Validações específicas
    this.validateRegistro0000(registros['0000']);
    this.validateRegistroE110(registros['E110']);
  }

  /**
   * Valida registro 0000 (header)
   * @param {Array} registros0000 - Registros 0000
   */
  validateRegistro0000(registros0000) {
    if (!registros0000 || registros0000.length === 0) {
      throw new Error('Registro 0000 (header) não encontrado');
    }
    
    const header = registros0000[0];
    
    // Verificar campos obrigatórios
    const requiredFields = [2, 3, 4, 5, 6, 7, 9, 10]; // Índices dos campos obrigatórios
    for (const fieldIndex of requiredFields) {
      if (!header[fieldIndex] || header[fieldIndex].trim() === '') {
        this.logger.warn(`Campo obrigatório vazio no registro 0000, posição ${fieldIndex}`);
      }
    }
    
    // Validar CNPJ
    const cnpj = header[7];
    if (cnpj && cnpj.length !== 14) {
      this.logger.warn(`CNPJ com formato inválido: ${cnpj}`);
    }
  }

  /**
   * Valida registro E110 (apuração ICMS)
   * @param {Array} registrosE110 - Registros E110
   */
  validateRegistroE110(registrosE110) {
    if (!registrosE110 || registrosE110.length === 0) {
      this.logger.warn('Registro E110 (apuração ICMS) não encontrado');
      return;
    }
    
    for (const registro of registrosE110) {
      // Verificar valores numéricos
      const numericFields = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      for (const fieldIndex of numericFields) {
        const value = registro[fieldIndex];
        if (value && isNaN(parseFloat(value.replace(',', '.')))) {
          this.logger.warn(`Valor não numérico no E110, posição ${fieldIndex}: ${value}`);
        }
      }
    }
  }

  /**
   * Processa dados dos registros por tipo
   * @param {Object} registros - Registros brutos
   * @returns {Object} Registros processados
   */
  processRegistryData(registros) {
    const processed = { ...registros };
    
    // Processar registros consolidados (C190, C590, D190, D590)
    this.processConsolidatedRecords(processed);
    
    // Processar registros de apuração (E110, E111, E115)
    this.processApurationRecords(processed);
    
    // Processar outras obrigações (C197, D197)
    this.processOtherObligations(processed);
    
    this.logger.info(`Processamento concluído: ${Object.keys(processed).length} tipos de registros`);
    
    return processed;
  }

  /**
   * Processa registros consolidados
   * @param {Object} registros - Registros
   */
  processConsolidatedRecords(registros) {
    const consolidatedTypes = ['C190', 'C590', 'D190', 'D590'];
    
    for (const type of consolidatedTypes) {
      if (registros[type]) {
        registros[type] = registros[type].map(registro => this.processConsolidatedRecord(registro, type));
        this.logger.info(`Processados ${registros[type].length} registros ${type}`);
      }
    }
  }

  /**
   * Processa um registro consolidado individual
   * @param {Array} registro - Registro bruto
   * @param {string} type - Tipo do registro
   * @returns {Object} Registro processado
   */
  processConsolidatedRecord(registro, type) {
    const processed = {
      tipo: type,
      cstIcms: registro[2] || '',
      cfop: registro[3] || '',
      aliqIcms: parseFloatSafe(registro[4]) || 0,
      vlOpr: parseFloatSafe(registro[5]) || 0,
      vlBcIcms: parseFloatSafe(registro[6]) || 0,
      vlIcms: parseFloatSafe(registro[7]) || 0
    };

    // Campos específicos por tipo
    if (type === 'C190' || type === 'C590') {
      processed.vlBcIcmsSt = parseFloatSafe(registro[8]) || 0;
      processed.vlIcmsSt = parseFloatSafe(registro[9]) || 0;
      processed.vlRedBc = parseFloatSafe(registro[10]) || 0;
    } else if (type === 'D190' || type === 'D590') {
      processed.vlRedBc = parseFloatSafe(registro[8]) || 0;
    }

    return processed;
  }

  /**
   * Processa registros de apuração
   * @param {Object} registros - Registros
   */
  processApurationRecords(registros) {
    // Processar E110
    if (registros.E110) {
      registros.E110 = registros.E110.map(reg => this.processE110Record(reg));
    }
    
    // Processar E111
    if (registros.E111) {
      registros.E111 = registros.E111.map(reg => this.processE111Record(reg));
    }
    
    // Processar E115
    if (registros.E115) {
      registros.E115 = registros.E115.map(reg => this.processE115Record(reg));
    }
  }

  /**
   * Processa registro E110
   * @param {Array} registro - Registro E110
   * @returns {Object} Registro processado
   */
  processE110Record(registro) {
    return {
      vlTotDebitos: parseFloatSafe(registro[2]) || 0,
      vlAjDebitos: parseFloatSafe(registro[3]) || 0,
      vlTotAjDebitos: parseFloatSafe(registro[4]) || 0,
      vlEstornosCred: parseFloatSafe(registro[5]) || 0,
      vlTotCreditos: parseFloatSafe(registro[6]) || 0,
      vlAjCreditos: parseFloatSafe(registro[7]) || 0,
      vlTotAjCreditos: parseFloatSafe(registro[8]) || 0,
      vlEstornosDeb: parseFloatSafe(registro[9]) || 0,
      vlSldCredorAnt: parseFloatSafe(registro[10]) || 0,
      vlSldApurado: parseFloatSafe(registro[11]) || 0,
      vlTotDed: parseFloatSafe(registro[12]) || 0,
      vlIcmsRecolher: parseFloatSafe(registro[13]) || 0,
      vlSldCredorTransportar: parseFloatSafe(registro[14]) || 0,
      debEsp: registro[15] || ''
    };
  }

  /**
   * Processa registro E111
   * @param {Array} registro - Registro E111
   * @returns {Object} Registro processado
   */
  processE111Record(registro) {
    return {
      codAjApur: registro[2] || '',
      descrComplAj: registro[3] || '',
      vlAjApur: parseFloatSafe(registro[4]) || 0
    };
  }

  /**
   * Processa registro E115
   * @param {Array} registro - Registro E115
   * @returns {Object} Registro processado
   */
  processE115Record(registro) {
    return {
      codInfAdic: registro[2] || '',
      vlInfAdic: parseFloatSafe(registro[3]) || 0,
      descrComplAj: registro[4] || ''
    };
  }

  /**
   * Processa outras obrigações (C197, D197)
   * @param {Object} registros - Registros
   */
  processOtherObligations(registros) {
    const obligationTypes = ['C197', 'D197'];
    
    for (const type of obligationTypes) {
      if (registros[type]) {
        registros[type] = registros[type].map(reg => this.processObligationRecord(reg, type));
        this.logger.info(`Processados ${registros[type].length} registros ${type}`);
      }
    }
  }

  /**
   * Processa registro de outras obrigações
   * @param {Array} registro - Registro
   * @param {string} type - Tipo
   * @returns {Object} Registro processado
   */
  processObligationRecord(registro, type) {
    return {
      tipo: type,
      codAj: registro[2] || '',
      descrComplAj: registro[3] || '',
      codItem: registro[4] || '',
      vlBcIcms: parseFloatSafe(registro[5]) || 0,
      aliqIcms: parseFloatSafe(registro[6]) || 0,
      vlIcms: parseFloatSafe(registro[7]) || 0,
      vlOutros: parseFloatSafe(registro[8]) || 0
    };
  }

  /**
   * Extrai resumo estatístico dos dados
   * @param {Object} registros - Registros processados
   * @returns {Object} Estatísticas
   */
  getStatistics(registros) {
    const stats = {
      totalRegistros: Object.keys(registros).length,
      tipos: {},
      valores: {
        totalOperacoes: 0,
        totalIcms: 0,
        totalCreditos: 0,
        totalDebitos: 0
      }
    };
    
    // Contar registros por tipo
    for (const [tipo, records] of Object.entries(registros)) {
      stats.tipos[tipo] = Array.isArray(records) ? records.length : 1;
    }
    
    // Somar valores principais
    const consolidatedTypes = ['C190', 'C590', 'D190', 'D590'];
    for (const type of consolidatedTypes) {
      if (registros[type]) {
        for (const registro of registros[type]) {
          stats.valores.totalOperacoes += registro.vlOpr || 0;
          stats.valores.totalIcms += registro.vlIcms || 0;
        }
      }
    }
    
    // Valores de apuração
    if (registros.E110 && registros.E110.length > 0) {
      const e110 = registros.E110[0];
      stats.valores.totalCreditos = e110.vlTotCreditos || 0;
      stats.valores.totalDebitos = e110.vlTotDebitos || 0;
    }
    
    return stats;
  }

  /**
   * Limpa cache
   */
  clearCache() {
    this.cache = {
      registrosCompletos: null,
      headerInfo: null,
      lastFileHash: null
    };
    this.logger.info('Cache limpo');
  }

  /**
   * Exporta dados processados para formato específico
   * @param {Object} dados - Dados processados
   * @param {string} formato - Formato ('json', 'csv', etc.)
   * @returns {string|Object} Dados exportados
   */
  exportData(dados, formato = 'json') {
    switch (formato.toLowerCase()) {
      case 'json':
        return JSON.stringify(dados, null, 2);
      case 'csv':
        return this.convertToCSV(dados);
      default:
        throw new Error(`Formato não suportado: ${formato}`);
    }
  }

  /**
   * Converte dados para CSV
   * @param {Object} dados - Dados
   * @returns {string} CSV
   */
  convertToCSV(dados) {
    // Implementação básica de conversão CSV
    let csv = '';
    
    for (const [tipo, registros] of Object.entries(dados)) {
      if (Array.isArray(registros) && registros.length > 0) {
        csv += `\n--- ${tipo} ---\n`;
        
        // Header
        const headers = Object.keys(registros[0]);
        csv += headers.join(',') + '\n';
        
        // Data
        for (const registro of registros) {
          const values = headers.map(header => registro[header] || '');
          csv += values.join(',') + '\n';
        }
      }
    }
    
    return csv;
  }
}