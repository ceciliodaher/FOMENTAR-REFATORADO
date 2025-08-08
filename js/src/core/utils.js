/**
 * Utilitários gerais do sistema SPED Web App
 */

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00%';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

export function parsePeriod(periodo) {
  if (!periodo) return new Date();
  
  if (periodo.includes('/')) {
    const [mes, ano] = periodo.split('/');
    return new Date(parseInt(ano), parseInt(mes) - 1, 1);
  }
  return new Date();
}

export function isLinhaValida(linha) {
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

export function processarNomeArquivo(nomeEmpresa, periodo, originalName = "SPED_convertido") {
  try {
    const primeiroNome = nomeEmpresa.split(' ')[0].trim() || "Empresa";
    if (periodo) {
      const partesData = periodo.split('/');
      if (partesData.length === 3) {
        const mes = partesData[1];
        const ano = partesData[2];
        return `${primeiroNome}_SPED_${mes}_${ano}.xlsx`;
      }
    }
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || primeiroNome + "_SPED";
    return `${baseName}.xlsx`;
  } catch (error) {
    console.error("Erro ao processar nome do arquivo:", error);
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || "SPED_convertido";
    return `${baseName}.xlsx`;
  }
}

export function parseFloatSafe(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? defaultValue : parsed;
}

export function parseIntSafe(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const parsed = parseInt(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

export function normalizeString(str) {
  if (!str) return '';
  return str.toString().trim().toUpperCase();
}

export function createUniqueId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Campo obrigatório não preenchido: ${fieldName}`);
  }
  return true;
}

export function validateNumeric(value, fieldName, min = null, max = null) {
  const num = parseFloatSafe(value);
  if (isNaN(num)) {
    throw new Error(`Campo deve ser numérico: ${fieldName}`);
  }
  if (min !== null && num < min) {
    throw new Error(`Campo ${fieldName} deve ser maior ou igual a ${min}`);
  }
  if (max !== null && num > max) {
    throw new Error(`Campo ${fieldName} deve ser menor ou igual a ${max}`);
  }
  return num;
}

export function validatePercentage(value, fieldName) {
  const num = validateNumeric(value, fieldName, 0, 100);
  return num;
}

export function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createProgressBar(current, total, showPercentage = true) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const text = showPercentage ? ` ${percentage}%` : ` ${current}/${total}`;
  return {
    percentage,
    text,
    width: `${percentage}%`
  };
}

