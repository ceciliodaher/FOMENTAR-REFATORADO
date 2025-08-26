// === CONSTANTES FOMENTAR ===
export const CFOP_ENTRADAS_INCENTIVADAS = [
  '1101', '1116', '1120', '1122', '1124', '1125', '1131', '1135', '1151', '1159',
  '1201', '1203', '1206', '1208', '1212', '1213', '1214', '1215', '1252', '1257',
  '1352', '1360', '1401', '1406', '1408', '1410', '1414', '1453', '1454', '1455',
  '1503', '1505', '1551', '1552', '1651', '1653', '1658', '1660', '1661', '1662',
  '1910', '1911', '1917', '1918', '1932', '1949',
  '2101', '2116', '2120', '2122', '2124', '2125', '2131', '2135', '2151', '2159',
  '2201', '2203', '2206', '2208', '2212', '2213', '2214', '2215', '2252', '2257',
  '2352', '2401', '2406', '2408', '2410', '2414', '2453', '2454', '2455',
  '2503', '2505', '2551', '2552', '2651', '2653', '2658', '2660', '2661', '2662', '2664',
  '2910', '2911', '2917', '2918', '2932', '2949',
  '3101', '3127', '3129', '3201', '3206', '3211', '3212', '3352', '3551', '3651', '3653', '3949'
];

export const CFOP_SAIDAS_INCENTIVADAS = [
  '5101', '5103', '5105', '5109', '5116', '5118', '5122', '5124', '5125', '5129',
  '5131', '5132', '5151', '5155', '5159', '5201', '5206', '5207', '5208', '5213',
  '5214', '5215', '5216', '5401', '5402', '5408', '5410', '5451', '5452', '5456',
  '5501', '5651', '5652', '5653', '5658', '5660', '5910', '5911', '5917', '5918',
  '5927', '5928',
  '6101', '6103', '6105', '6107', '6109', '6116', '6118', '6122', '6124', '6125',
  '6129', '6131', '6132', '6151', '6155', '6159', '6201', '6206', '6207', '6208',
  '6213', '6214', '6215', '6216', '6401', '6402', '6408', '6410', '6451', '6452',
  '6456', '6501', '6651', '6652', '6653', '6658', '6660', '6663', '6905', '6910',
  '6911', '6917', '6918', '6934',
  '7101', '7105', '7127', '7129', '7201', '7206', '7207', '7211', '7212', '7251',
  '7504', '7651', '7667'
];

export const CODIGOS_AJUSTE_INCENTIVADOS = [
  // Estorno de débitos
  'GO030003', 'GO20000000',
  // Outros créditos GO020xxx
  'GO020159', 'GO020007', 'GO020160', 'GO020162', 'GO020014', 'GO020021',
  'GO020023', 'GO020025', 'GO020026', 'GO020027', 'GO020029', 'GO020030',
  'GO020031', 'GO020033', 'GO020034', 'GO020035', 'GO020036', 'GO020039',
  'GO020041', 'GO020048', 'GO020050', 'GO020051', 'GO020052', 'GO020059',
  'GO020063', 'GO020069', 'GO020070', 'GO020072', 'GO020079', 'GO020081',
  'GO020093', 'GO020102', 'GO020103', 'GO020104', 'GO020105', 'GO020107',
  'GO020110', 'GO020111', 'GO020114', 'GO020122', 'GO020124', 'GO020125',
  'GO020128', 'GO020129', 'GO020133', 'GO020142', 'GO020151', 'GO020152',
  'GO020153', 'GO020155', 'GO020156', 'GO020157',
  // Outros créditos GO00xxx e GO10xxx
  'GO00009037', 'GO10990020', 'GO10990025', 'GO10991019', 'GO10991023',
  'GO10993022', 'GO10993024',
  // Estorno de créditos (débitos para o contribuinte)
  'GO010016', 'GO010017', 'GO010068', 'GO010063', 'GO010064', 'GO010026',
  'GO010028', 'GO010034', 'GO010036', 'GO010065', 'GO010066', 'GO010067',
  'GO010047', 'GO010053', 'GO010054', 'GO010055', 'GO010060', 'GO010061',
  // Outros débitos GO40xxx
  'GO40009035', 'GO40990021', 'GO40991022', 'GO40993020'
];

export const CODIGOS_CREDITO_FOMENTAR = [
  'GO040007', // FOMENTAR
  'GO040008', // PRODUZIR
  'GO040009', // MICROPRODUZIR
  'GO040010', // FOMENTAR variação
  'GO040011', // PRODUZIR variação
  'GO040012', // MICROPRODUZIR variação
  'GO040137'  // Créditos oriundos do registro 1200
];

// === CONSTANTES PROGOIÁS ===
export const CODIGOS_AJUSTE_INCENTIVADOS_PROGOIAS = [
  // Mesmos códigos do FOMENTAR conforme IN 1478/2020
  ...CODIGOS_AJUSTE_INCENTIVADOS
];

export const PROGOIAS_CONFIG = {
  PERCENTUAIS_POR_ANO: {
    2021: 64,
    2022: 65,
    2023: 66,
    2024: 66,
    2025: 66,
    2026: 66,
    2027: 66,
    2028: 66,
    2029: 66,
    2030: 66
  },
  PERCENTUAL_PADRAO: 64,
  PERCENTUAL_META: 67,
  PROTEGE_PERCENTUAIS: {
    1: 10, // 1º ano
    2: 8,  // 2º ano
    3: 6   // 3º ano em diante
  },
  CARGA_TRIBUTARIA_BAIXO_IDH: 0.02 // 2%
};

// === CONSTANTES LOGPRODUZIR ===
export const CFOP_LOGPRODUZIR_FRETES_INTERESTADUAIS = [
  '6351', '6352', '6353', '6354', '6355', '6356', '6357', '6359', '6360', '6932'
];

export const CFOP_LOGPRODUZIR_FRETE_TOTAL = [
  // Prestações estaduais (5xxx)
  '5351', '5352', '5353', '5354', '5355', '5356', '5357', '5359', '5360', '5932',
  // Prestações interestaduais (6xxx)
  '6351', '6352', '6353', '6354', '6355', '6356', '6357', '6359', '6360', '6932'
];

export const LOGPRODUZIR_PERCENTUAIS = {
  'I': 0.50,   // Categoria I - 50%
  'II': 0.73,  // Categoria II - 73% (padrão)
  'III': 0.80  // Categoria III - 80%
};

export const LOGPRODUZIR_CONTRIBUICOES = {
  BOLSA_UNIVERSITARIA: 0.02, // 2%
  FUNPRODUZIR: 0.03,         // 3%
  PROTEGE_GOIAS: 0.15,       // 15%
  TOTAL: 0.20                // 20% total
};

// === CONSTANTES CFOPS GENÉRICOS ===
export const CFOPS_GENERICOS = [
  '1905', '1906', '1910', '1911', '1917', '1918', '1949', // Entradas genéricas
  '2905', '2910', '2911', '2917', '2918', '2934', '2949', // Transfer/Devoluções/Outras
  '3949', // Entrada genérica
  '5905', '5906', '5910', '5917', '5918', '5927', '5928', '5949', // Saídas genéricas
  '6905', '6906', '6910', '6917', '6918', '6934', '6949', // Saídas interestaduais genéricas
  '7949'  // Saída para exterior genérica
];

export const CFOPS_GENERICOS_DESCRICOES = {
  '1905': 'Transfer - Entrada via armazém geral (genérico)',
  '1906': 'Transfer - Entrada via armazém geral (genérico)',
  '1910': 'Entrada - Outros (genérico)',
  '1911': 'Entrada - Devolução (genérico)',
  '1917': 'Entrada - Aquisição de serviço (genérico)',
  '1918': 'Entrada - Operação diversa (genérico)',
  '1949': 'Entrada - Outra operação (genérico)',
  '2905': 'Transfer - Entrada via armazém geral (genérico)',
  '2910': 'Transfer - Entrada outros (genérico)',
  '2911': 'Transfer - Entrada devolução (genérico)',
  '2917': 'Transfer - Entrada serviço (genérico)',
  '2918': 'Transfer - Entrada operação diversa (genérico)',
  '2934': 'Transfer - Entrada complementar ICMS (genérico)',
  '2949': 'Transfer - Entrada outra operação (genérico)',
  '3949': 'Entrada - Outra operação (genérico)',
  '5905': 'Transfer - Entrada via armazém geral (genérico)',
  '5906': 'Transfer - Entrada via armazém geral (genérico)',
  '5910': 'Saída - Outros (genérico)',
  '5917': 'Saída - Prestação de serviço (genérico)',
  '5918': 'Saída - Operação diversa (genérico)',
  '5927': 'Saída - Lançamento efetuado a título de simples faturamento (genérico)',
  '5928': 'Saída - Lançamento efetuado a título de simples faturamento decorrente de venda (genérico)',
  '5949': 'Saída - Outra operação (genérico)',
  '6905': 'Saída Interestadual - Via armazém geral (genérico)',
  '6910': 'Saída Interestadual - Outros (genérico)',
  '6917': 'Saída Interestadual - Prestação de serviço (genérico)',
  '6918': 'Saída Interestadual - Operação diversa (genérico)',
  '6934': 'Saída Interestadual - Complementar ICMS (genérico)',
  '6949': 'Saída Interestadual - Outra operação (genérico)',
  '7949': 'Saída Exterior - Outra operação (genérico)'
};

// === LAYOUTS SPED ===
export const SPED_LAYOUTS = {
  '0000': ['REG', 'COD_VER', 'COD_FIN', 'DT_INI', 'DT_FIN', 'NOME', 'CNPJ', 'CPF', 'UF', 'IE', 'COD_MUN', 'IM', 'SUFRAMA', 'IND_PERFIL', 'IND_ATIV'],
  'C100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'NUM_DOC', 'CHV_NFE', 'DT_DOC', 'DT_E_S', 'VL_DOC', 'IND_PGTO', 'VL_DESC', 'VL_ABAT_NT', 'VL_MERC', 'IND_FRT', 'VL_FRT', 'VL_SEG', 'VL_OUT_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_IPI', 'VL_PIS', 'VL_COFINS', 'VL_PIS_ST', 'VL_COFINS_ST'],
  'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],
  'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
  'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC', 'COD_OBS'],
  'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
  'E100': ['REG', 'DT_INI', 'DT_FIN'],
  'E110': ['REG', 'VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS', 'VL_ESTORNOS_CRED', 'VL_TOT_CREDITOS', 'VL_AJ_CREDITOS', 'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB', 'VL_SLD_CREDOR_ANT', 'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER', 'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP'],
  'E111': ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR'],
  'E115': ['REG', 'COD_INF_ADIC', 'VL_INF_ADIC', 'DESCR_COMPL_AJ'],
  'C197': ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS'],
  'D197': ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS']
};

// === CÓDIGOS E115 FOMENTAR ===
export const CODIGOS_E115_FOMENTAR = {
  'GO200001': 'Valor do ICMS das saídas com alíquota de 17%',
  'GO200002': 'Valor do ICMS das saídas com alíquota de 12%',
  'GO200003': 'Valor do ICMS das saídas com alíquota de 7%',
  'GO200004': 'Valor do ICMS das saídas com alíquota de 4%',
  'GO200005': 'Valor do ICMS das saídas com alíquota de 25%',
  'GO200006': 'Valor do ICMS das saídas com alíquota de 19%',
  'GO200007': 'Valor do ICMS das saídas com outras alíquotas',
  'GO200008': 'Valor do ICMS das saídas isentas',
  'GO200009': 'Valor do ICMS das saídas não tributadas',
  'GO200010': 'Valor do ICMS das entradas com alíquota de 17%',
  'GO200011': 'Valor do ICMS das entradas com alíquota de 12%',
  'GO200012': 'Valor do ICMS das entradas com alíquota de 7%',
  'GO200013': 'Valor do ICMS das entradas com alíquota de 4%',
  'GO200014': 'Valor do ICMS das entradas com alíquota de 25%',
  'GO200015': 'Valor do ICMS das entradas com alíquota de 19%',
  'GO200016': 'Valor do ICMS das entradas com outras alíquotas',
  'GO200017': 'Valor do ICMS das entradas isentas',
  'GO200018': 'Valor do ICMS das entradas não tributadas',
  'GO200019': 'Valor das operações de saída',
  'GO200020': 'Valor das operações de entrada',
  'GO200021': 'Valor do ICMS Substituição Tributária - Saídas',
  'GO200022': 'Valor do ICMS Substituição Tributária - Entradas',
  'GO200023': 'Valor das saídas incentivadas',
  'GO200024': 'Valor das entradas incentivadas',
  'GO200025': 'Valor do ICMS das saídas incentivadas',
  'GO200026': 'Valor do ICMS das entradas incentivadas',
  'GO200027': 'Valor das saídas não incentivadas',
  'GO200028': 'Valor das entradas não incentivadas',
  'GO200029': 'Valor do ICMS das saídas não incentivadas',
  'GO200030': 'Valor do ICMS das entradas não incentivadas',
  'GO200031': 'Outros créditos incentivados',
  'GO200032': 'Outros débitos incentivados',
  'GO200033': 'Outros créditos não incentivados',
  'GO200034': 'Outros débitos não incentivados',
  'GO200035': 'Estorno de créditos incentivados',
  'GO200036': 'Estorno de débitos incentivados',
  'GO200037': 'Estorno de créditos não incentivados',
  'GO200038': 'Estorno de débitos não incentivados',
  'GO200039': 'Saldo devedor do período anterior',
  'GO200040': 'Saldo credor do período anterior',
  'GO200041': 'ICMS a recolher no período',
  'GO200042': 'Saldo credor a transportar',
  'GO200043': 'Deduções do ICMS a recolher',
  'GO200044': 'Ajustes de período anterior',
  'GO200045': 'Valor do benefício apurado no período',
  'GO200046': 'Valor do benefício utilizado no período',
  'GO200047': 'Saldo do benefício do período anterior',
  'GO200048': 'Saldo do benefício a transportar',
  'GO200049': 'Base de cálculo das saídas incentivadas',
  'GO200050': 'Base de cálculo das entradas incentivadas',
  'GO200051': 'Base de cálculo das saídas não incentivadas',
  'GO200052': 'Base de cálculo das entradas não incentivadas',
  'GO200053': 'Percentual do benefício aplicado',
  'GO200054': 'Valor excedente do benefício'
};

// === PERCENTUAIS DE BENEFÍCIO ===
export const FOMENTAR_PERCENTUAIS = {
  FOMENTAR: 0.70,      // 70%
  PRODUZIR: 0.73,      // 73%
  MICROPRODUZIR: 0.90  // 90%
};

// === CÓDIGOS EXCLUSÃO AUTOMÁTICA ===
export const CODIGOS_EXCLUSAO_AUTOMATICA = [
  'GO040007', // FOMENTAR - crédito circular
  'GO040008', // PRODUZIR - crédito circular
  'GO040009', // MICROPRODUZIR - crédito circular
  'GO040010'  // FOMENTAR variação - crédito circular
];

// === CONFIGURAÇÕES DE APLICAÇÃO ===
export const APP_CONFIG = {
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  SUPPORTED_ENCODINGS: ['UTF-8', 'ISO-8859-1', 'windows-1252'],
  DEFAULT_ENCODING: 'UTF-8',
  CHUNK_SIZE: 64 * 1024, // 64KB para leitura em chunks
  PROGRESS_UPDATE_INTERVAL: 100, // ms
  SESSION_TIMEOUT: 4 * 60 * 60 * 1000, // 4 horas
  LOG_LEVELS: ['error', 'warn', 'info', 'debug'],
  DEFAULT_LOG_LEVEL: 'info'
};

// === TIPOS DE OPERAÇÃO SPED ===
export const OPERATION_TYPES = {
  ENTRADA: '0',
  SAIDA: '1'
};

// === CSTs MAIS COMUNS ===
export const CST_ICMS = {
  '000': 'Tributada integralmente',
  '010': 'Tributada e com cobrança do ICMS por substituição tributária',
  '020': 'Com redução de base de cálculo',
  '030': 'Isenta ou não tributada e com cobrança do ICMS por substituição tributária',
  '040': 'Isenta',
  '041': 'Não tributada',
  '050': 'Suspensão',
  '051': 'Diferimento',
  '060': 'ICMS cobrado anteriormente por substituição tributária',
  '070': 'Com redução de base de cálculo e cobrança do ICMS por substituição tributária',
  '090': 'Outras',
  '101': 'Tributada pelo Simples Nacional com permissão de crédito',
  '102': 'Tributada pelo Simples Nacional sem permissão de crédito',
  '103': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta',
  '201': 'Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária',
  '202': 'Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária',
  '203': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por substituição tributária',
  '300': 'Imune',
  '400': 'Não tributada pelo Simples Nacional',
  '500': 'ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação',
  '900': 'Outros'
};

