import { CFOP_ENTRADAS_INCENTIVADAS, CFOP_SAIDAS_INCENTIVADAS, CODIGOS_AJUSTE_INCENTIVADOS } from '../core/constants.js';

export class SpedValidator {
  constructor(logger) {
    this.logger = logger;
  }

  validarConsistenciaOperacoes(registros) {
    const inconsistencias = [];
    let totalValidacoes = 0;
    
    this.logger.info('Iniciando validação de consistência das operações...');
    
    // Validar registros consolidados
    ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
      if (registros[tipoRegistro]) {
        const layout = this.obterLayoutRegistro(tipoRegistro);
        
        registros[tipoRegistro].forEach((registro, index) => {
          totalValidacoes++;
          const campos = registro.slice(1, -1);
          
          // Validar CFOP
          const cfopIndex = layout.indexOf('CFOP');
          const cfop = campos[cfopIndex];
          
          if (!this.validarCFOP(cfop)) {
            inconsistencias.push({
              tipo: tipoRegistro,
              linha: index + 1,
              campo: 'CFOP',
              valor: cfop,
              erro: 'CFOP inválido ou não catalogado'
            });
          }
          
          // Validar valores numéricos
          const camposNumericos = layout.filter(campo => 
            campo.startsWith('VL_') || campo.startsWith('ALIQ_')
          );
          
          camposNumericos.forEach(campo => {
            const valorIndex = layout.indexOf(campo);
            const valor = campos[valorIndex];
            
            if (valor && !this.validarValorNumerico(valor)) {
              inconsistencias.push({
                tipo: tipoRegistro,
                linha: index + 1,
                campo: campo,
                valor: valor,
                erro: 'Valor numérico inválido'
              });
            }
          });
        });
      }
    });
    
    // Validar códigos de ajuste E111
    if (registros.E111) {
      const layout = this.obterLayoutRegistro('E111');
      
      registros.E111.forEach((registro, index) => {
        totalValidacoes++;
        const campos = registro.slice(1, -1);
        
        const codigoIndex = layout.indexOf('COD_AJ_APUR');
        const codigo = campos[codigoIndex];
        
        if (!this.validarCodigoAjuste(codigo)) {
          inconsistencias.push({
            tipo: 'E111',
            linha: index + 1,
            campo: 'COD_AJ_APUR',
            valor: codigo,
            erro: 'Código de ajuste com formato inválido'
          });
        }
      });
    }
    
    this.logger.info(`Validação concluída: ${totalValidacoes} validações, ${inconsistencias.length} inconsistências`);
    
    if (inconsistencias.length > 0) {
      this.logger.warn(`Encontradas ${inconsistencias.length} inconsistências nos dados`);
      inconsistencias.slice(0, 10).forEach(inc => {
        this.logger.warn(`${inc.tipo}[${inc.linha}].${inc.campo}: ${inc.erro} (${inc.valor})`);
      });
    }
    
    return {
      valido: inconsistencias.length === 0,
      totalValidacoes,
      inconsistencias,
      resumo: this.gerarResumoInconsistencias(inconsistencias)
    };
  }

  validarCFOP(cfop) {
    if (!cfop) return false;
    
    // CFOP deve ter 4 dígitos
    if (!/^\d{4}$/.test(cfop)) return false;
    
    // Primeiro dígito deve ser 1-7
    const primeiroDigito = parseInt(cfop.charAt(0));
    if (primeiroDigito < 1 || primeiroDigito > 7) return false;
    
    return true;
  }

  validarValorNumerico(valor) {
    if (!valor) return true; // Valores vazios são aceitos
    
    // Remover vírgulas e verificar se é numérico
    const valorLimpo = valor.replace(',', '.');
    return !isNaN(parseFloat(valorLimpo));
  }

  validarCodigoAjuste(codigo) {
    if (!codigo) return false;
    
    // Código de ajuste deve ter 8 caracteres no formato GOXXXXXX
    if (!/^GO\d{6}$/.test(codigo)) return false;
    
    return true;
  }

  classificarCFOPsPorIncentivo(registros) {
    const classificacao = {
      incentivados: {
        entradas: 0,
        saidas: 0,
        cfops: new Set()
      },
      naoIncentivados: {
        entradas: 0,
        saidas: 0,
        cfops: new Set()
      },
      naoClassificados: {
        entradas: 0,
        saidas: 0,
        cfops: new Set()
      }
    };
    
    ['C190', 'C590', 'D190', 'D590'].forEach(tipoRegistro => {
      if (registros[tipoRegistro]) {
        const layout = this.obterLayoutRegistro(tipoRegistro);
        const cfopIndex = layout.indexOf('CFOP');
        
        registros[tipoRegistro].forEach(registro => {
          const campos = registro.slice(1, -1);
          const cfop = campos[cfopIndex];
          
          if (cfop) {
            const isEntrada = cfop.startsWith('1') || cfop.startsWith('2') || cfop.startsWith('3');
            const isSaida = cfop.startsWith('5') || cfop.startsWith('6') || cfop.startsWith('7');
            
            if (isEntrada) {
              if (CFOP_ENTRADAS_INCENTIVADAS.includes(cfop)) {
                classificacao.incentivados.entradas++;
                classificacao.incentivados.cfops.add(cfop);
              } else {
                classificacao.naoIncentivados.entradas++;
                classificacao.naoIncentivados.cfops.add(cfop);
              }
            } else if (isSaida) {
              if (CFOP_SAIDAS_INCENTIVADAS.includes(cfop)) {
                classificacao.incentivados.saidas++;
                classificacao.incentivados.cfops.add(cfop);
              } else {
                classificacao.naoIncentivados.saidas++;
                classificacao.naoIncentivados.cfops.add(cfop);
              }
            } else {
              classificacao.naoClassificados.entradas++;
              classificacao.naoClassificados.cfops.add(cfop);
            }
          }
        });
      }
    });
    
    // Converter Sets para Arrays para logging
    const resultado = {
      incentivados: {
        ...classificacao.incentivados,
        cfops: Array.from(classificacao.incentivados.cfops)
      },
      naoIncentivados: {
        ...classificacao.naoIncentivados,
        cfops: Array.from(classificacao.naoIncentivados.cfops)
      },
      naoClassificados: {
        ...classificacao.naoClassificados,
        cfops: Array.from(classificacao.naoClassificados.cfops)
      }
    };
    
    this.logger.info(`CFOPs classificados: ${resultado.incentivados.cfops.length} incentivados, ${resultado.naoIncentivados.cfops.length} não incentivados`);
    
    return resultado;
  }

  gerarResumoInconsistencias(inconsistencias) {
    const resumo = {
      porTipo: {},
      porCampo: {},
      porErro: {}
    };
    
    inconsistencias.forEach(inc => {
      // Por tipo de registro
      if (!resumo.porTipo[inc.tipo]) {
        resumo.porTipo[inc.tipo] = 0;
      }
      resumo.porTipo[inc.tipo]++;
      
      // Por campo
      if (!resumo.porCampo[inc.campo]) {
        resumo.porCampo[inc.campo] = 0;
      }
      resumo.porCampo[inc.campo]++;
      
      // Por tipo de erro
      if (!resumo.porErro[inc.erro]) {
        resumo.porErro[inc.erro] = 0;
      }
      resumo.porErro[inc.erro]++;
    });
    
    return resumo;
  }

  obterLayoutRegistro(tipoRegistro) {
    const layouts = {
      'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],
      'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
      'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC', 'COD_OBS'],
      'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
      'E111': ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR'],
      '0000': ['REG', 'COD_VER', 'COD_FIN', 'DT_INI', 'DT_FIN', 'NOME', 'CNPJ', 'CPF', 'UF', 'IE', 'COD_MUN', 'IM', 'SUFRAMA', 'IND_PERFIL', 'IND_ATIV']
    };
    
    return layouts[tipoRegistro] || null;
  }
}

export default SpedValidator;

