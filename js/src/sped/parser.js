import { isLinhaValida } from '../core/utils.js';
import { SPED_LAYOUTS } from '../core/constants.js';

export class SpedParser {
  constructor(logger) {
    this.logger = logger;
  }

  async detectAndRead(arrayBuffer) {
    const decoders = [
      { encoding: 'UTF-8', decoder: new TextDecoder('utf-8', { fatal: true }) },
      { encoding: 'ISO-8859-1', decoder: new TextDecoder('iso-8859-1') }
    ];
    
    for (const { encoding, decoder } of decoders) {
      try {
        const content = decoder.decode(arrayBuffer);
        this.logger.info(`Arquivo lido com sucesso usando ${encoding}`);
        return { encoding, content };
      } catch (e) {
        this.logger.warn(`Falha ao decodificar como ${encoding}: ${e.message}`);
      }
    }
    
    throw new Error('Não foi possível decodificar o arquivo com os encodings suportados.');
  }

  /**
   * Lê arquivo SPED apenas para extrair informações do header (otimizado)
   * Baseado no código aprovado do sped-web
   */
  lerArquivoSpedParaHeader(fileContent) {
    const registros = {};
    const linhas = fileContent.split('\n');
    
    // Ler apenas registros essenciais para o header
    for (let linha of linhas) {
      linha = linha.trim();
      if (linha && linha.startsWith('|') && linha.endsWith('|')) {
        const campos = linha.split('|');
        const tipoRegistro = campos[1];
        
        // Só ler registros necessários para header
        if (['0000', 'E100', 'E110'].includes(tipoRegistro)) {
          if (!registros[tipoRegistro]) {
            registros[tipoRegistro] = [];
          }
          registros[tipoRegistro].push(linha);
        }
        
        // Otimização: parar após encontrar registro básico
        if (registros['0000'] && registros['0000'].length > 0) {
          // Header principal encontrado
        }
      }
    }
    
    this.logger.info(`Header SPED extraído com ${Object.keys(registros).length} tipos de registros`);
    return registros;
  }

  lerArquivoSpedCompleto(fileContent) {
    const registros = {};
    const lines = fileContent.split('\n');
    let totalLinhasProcessadas = 0;
    let linhasValidas = 0;
    
    this.logger.info(`Iniciando leitura de ${lines.length} linhas do SPED`);
    
    for (const rawLine of lines) {
      totalLinhasProcessadas++;
      const linha = rawLine.trim();
      
      if (isLinhaValida(linha)) {
        linhasValidas++;
        const campos = linha.split('|');
        const tipoRegistro = campos[1];
        
        if (!registros[tipoRegistro]) {
          registros[tipoRegistro] = [];
        }
        
        registros[tipoRegistro].push(campos);
      }
    }
    
    this.logger.success(`SPED processado: ${linhasValidas}/${totalLinhasProcessadas} linhas válidas, ${Object.keys(registros).length} tipos de registro`);
    
    // Log detalhado dos tipos encontrados
    Object.entries(registros).forEach(([tipo, dados]) => {
      this.logger.debug(`Registro ${tipo}: ${dados.length} ocorrências`);
    });
    
    return registros;
  }

  extrairInformacoesHeader(registros) {
    let nomeEmpresa = "Empresa";
    let periodo = "";
    let cnpj = "";
    let uf = "";
    
    if (registros['0000'] && registros['0000'].length > 0) {
      const reg0000 = registros['0000'][0];
      
      // Usar layout para indexação correta
      const layout = this.obterLayoutRegistro('0000');
      
      if (layout && reg0000.length >= layout.length) {
        const dtIniIndex = layout.indexOf('DT_INI');
        const nomeIndex = layout.indexOf('NOME');
        const cnpjIndex = layout.indexOf('CNPJ');
        const ufIndex = layout.indexOf('UF');
        
        if (nomeIndex >= 0 && reg0000[nomeIndex + 1]) {
          nomeEmpresa = reg0000[nomeIndex + 1];
        }
        
        if (cnpjIndex >= 0 && reg0000[cnpjIndex + 1]) {
          cnpj = reg0000[cnpjIndex + 1];
        }
        
        if (ufIndex >= 0 && reg0000[ufIndex + 1]) {
          uf = reg0000[ufIndex + 1];
        }
        
        if (dtIniIndex >= 0 && reg0000[dtIniIndex + 1]) {
          const dataInicial = reg0000[dtIniIndex + 1];
          if (dataInicial && dataInicial.length === 8) {
            const dia = dataInicial.substring(0, 2);
            const mes = dataInicial.substring(2, 4);
            const ano = dataInicial.substring(4, 8);
            periodo = `${mes}/${ano}`;
          }
        }
      }
    }
    
    this.logger.info(`Header extraído: ${nomeEmpresa} (${cnpj}) - ${periodo} - ${uf}`);
    
    return { nomeEmpresa, periodo, cnpj, uf };
  }

  obterLayoutRegistro(tipoRegistro) {
    return SPED_LAYOUTS[tipoRegistro] || null;
  }

  validarEstruturaSped(registros) {
    const erros = [];
    const avisos = [];
    
    // Verificar registro obrigatório 0000
    if (!registros['0000'] || registros['0000'].length === 0) {
      erros.push('Registro 0000 (Abertura) não encontrado');
    }
    
    // Verificar registros de encerramento
    if (!registros['9900'] || registros['9900'].length === 0) {
      avisos.push('Registro 9900 (Controle) não encontrado');
    }
    
    if (!registros['9990'] || registros['9990'].length === 0) {
      avisos.push('Registro 9990 (Encerramento do Bloco 9) não encontrado');
    }
    
    if (!registros['9999'] || registros['9999'].length === 0) {
      avisos.push('Registro 9999 (Encerramento do Arquivo) não encontrado');
    }
    
    // Verificar consistência de blocos
    const blocosEncontrados = new Set();
    Object.keys(registros).forEach(tipo => {
      if (tipo.length > 0) {
        blocosEncontrados.add(tipo.charAt(0));
      }
    });
    
    this.logger.info(`Blocos encontrados: ${Array.from(blocosEncontrados).sort().join(', ')}`);
    
    // Verificar operações consolidadas
    const temOperacoes = ['C190', 'C590', 'D190', 'D590'].some(tipo => 
      registros[tipo] && registros[tipo].length > 0
    );
    
    if (!temOperacoes) {
      avisos.push('Nenhum registro consolidado de operações encontrado (C190, C590, D190, D590)');
    }
    
    // Log dos resultados da validação
    if (erros.length > 0) {
      erros.forEach(erro => this.logger.error(`Validação SPED: ${erro}`));
    }
    
    if (avisos.length > 0) {
      avisos.forEach(aviso => this.logger.warn(`Validação SPED: ${aviso}`));
    }
    
    if (erros.length === 0 && avisos.length === 0) {
      this.logger.success('SPED validado com sucesso - estrutura consistente');
    }
    
    return {
      valido: erros.length === 0,
      erros,
      avisos,
      blocosEncontrados: Array.from(blocosEncontrados),
      temOperacoes
    };
  }

  extrairEstatisticas(registros) {
    const stats = {
      totalRegistros: 0,
      tiposRegistro: Object.keys(registros).length,
      registrosPorTipo: {},
      blocosDetalhados: {}
    };
    
    Object.entries(registros).forEach(([tipo, dados]) => {
      const quantidade = dados.length;
      stats.totalRegistros += quantidade;
      stats.registrosPorTipo[tipo] = quantidade;
      
      // Agrupar por bloco
      const bloco = tipo.charAt(0);
      if (!stats.blocosDetalhados[bloco]) {
        stats.blocosDetalhados[bloco] = {
          tipos: 0,
          registros: 0,
          tiposDetalhados: {}
        };
      }
      
      stats.blocosDetalhados[bloco].tipos++;
      stats.blocosDetalhados[bloco].registros += quantidade;
      stats.blocosDetalhados[bloco].tiposDetalhados[tipo] = quantidade;
    });
    
    this.logger.info(`Estatísticas SPED: ${stats.totalRegistros} registros, ${stats.tiposRegistro} tipos`);
    
    return stats;
  }
}

export default SpedParser;

