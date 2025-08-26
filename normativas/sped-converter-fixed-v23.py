"""
SPED Converter - Versão Corrigida
Programa para converter arquivos SPED em planilhas Excel

Correções e melhorias implementadas:
1. Corrigida a indentação do método extrair_informacoes_header
2. Corrigida a posição dos métodos dentro da classe SpedConverterGUI
3. Adicionado tratamento de erros mais robusto
4. Melhorada a gestão de memória
5. Otimizada a detecção de encoding
6. Implementada validação de dados
7. Adicionado logging para rastreamento de erros
8. Melhorada a formatação do Excel
9. Implementado cleanup de recursos
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
from collections import defaultdict
import os
import threading
import chardet
import numpy as np
import logging
from datetime import datetime

# Configuração do logging
logging.basicConfig(
    filename='sped_converter.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class SpedConverterGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Conversor SPED para Excel")
        self.root.geometry("600x400")

        # Configuração do estilo
        style = ttk.Style()
        style.configure('TButton', padding=5)
        style.configure('TLabel', padding=5)

        # Frame principal
        main_frame = ttk.Frame(root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Variáveis
        self.arquivo_sped = tk.StringVar()
        self.arquivo_excel = tk.StringVar()
        self.status_var = tk.StringVar(value="Aguardando arquivo SPED...")
        self.registros = None

        self._criar_interface(main_frame)
        self._configurar_grid(main_frame)

        # Inicializar logger
        self.logger = logging.getLogger(__name__)

    def extrair_informacoes_header(self, registros):
        """Extrai informações do cabeçalho do SPED"""
        nome_empresa = ""
        periodo = ""

        if '0000' in registros and registros['0000']:
            reg_0000 = registros['0000'][0]
            nome_empresa = reg_0000[6] if len(reg_0000) > 6 else "Empresa"  # NOME está na posição 6
            data_inicial = reg_0000[4] if len(reg_0000) > 4 else ""  # DT_INI está na posição 4
            if len(data_inicial) == 8:
                periodo = f"{data_inicial[:2]}/{data_inicial[2:4]}/{data_inicial[4:8]}"

        return nome_empresa, periodo

    def _criar_interface(self, main_frame):
        """Cria os elementos da interface do usuário"""
        # Título
        ttk.Label(main_frame, text="Conversor de SPED para Excel",
                  font=('Helvetica', 14, 'bold')).grid(row=0, column=0, columnspan=2, pady=20)

        # Botão de seleção do arquivo SPED
        ttk.Button(main_frame, text="Selecionar Arquivo SPED",
                   command=self.selecionar_sped,
                   width=30).grid(row=1, column=0, columnspan=2, pady=10)

        # Label do arquivo SPED
        self.label_sped = ttk.Label(main_frame, text="Nenhum arquivo selecionado",
                                    wraplength=400)
        self.label_sped.grid(row=2, column=0, columnspan=2, pady=5)

        # Campo de nome do arquivo Excel
        ttk.Label(main_frame, text="Nome do arquivo Excel de saída:").grid(row=3,
                                                                           column=0, pady=10)
        self.entry_excel = ttk.Entry(main_frame, textvariable=self.arquivo_excel, width=30)
        self.entry_excel.grid(row=3, column=1, pady=10)

        # Barra de progresso
        self.progress = ttk.Progressbar(main_frame, length=400, mode='indeterminate')
        self.progress.grid(row=4, column=0, columnspan=2, pady=20)

        # Status
        ttk.Label(main_frame, textvariable=self.status_var).grid(row=5, column=0,
                                                                 columnspan=2)

        # Botão de conversão
        self.botao_converter = ttk.Button(main_frame, text="Converter",
                                          command=self.iniciar_conversao)
        self.botao_converter.grid(row=6, column=0, columnspan=2, pady=20)

    def _configurar_grid(self, frame):
        """Configura o grid layout"""
        frame.columnconfigure(0, weight=1)
        frame.columnconfigure(1, weight=1)

    def processar_nome_arquivo(self, nome_empresa, periodo):
        """Processa o nome do arquivo Excel baseado no nome da empresa e período"""
        try:
            # Extrai o primeiro nome da empresa
            primeiro_nome = nome_empresa.split()[0].strip()

            # Processa o período para extrair mês e ano
            if periodo:
                partes_data = periodo.split('/')
                if len(partes_data) == 3:
                    mes = partes_data[1]  # Mês está no formato MM
                    ano = partes_data[2]  # Ano está no formato YYYY
                    nome_sugerido = f"{primeiro_nome}_SPED_{mes}_{ano}.xlsx"
                    return nome_sugerido

            # Fallback se não conseguir processar o período
            return f"{primeiro_nome}_SPED.xlsx"
        except Exception as e:
            self.logger.error(f"Erro ao processar nome do arquivo: {str(e)}")
            return "SPED_convertido.xlsx"

    def selecionar_sped(self):
        """Permite ao usuário selecionar o arquivo SPED"""
        try:
            filename = filedialog.askopenfilename(
                title="Selecione o arquivo SPED",
                filetypes=[("Arquivos de texto", "*.txt"), ("Todos os arquivos", "*.*")]
            )
            if filename:
                self.arquivo_sped.set(filename)
                self.diretorio_origem = os.path.dirname(filename)

                # Detectar encoding e ler o arquivo para obter informações
                encoding = self.detectar_encoding(filename)
                registros = self.ler_arquivo_sped(filename, encoding)
                nome_empresa, periodo = self.extrair_informacoes_header(registros)

                # Gerar nome sugerido para o arquivo Excel
                excel_nome = self.processar_nome_arquivo(nome_empresa, periodo)
                self.arquivo_excel.set(excel_nome)

                nome_arquivo = os.path.basename(filename)
                self.label_sped.config(text=f"Arquivo selecionado: {nome_arquivo}")
                self.logger.info(f"Arquivo SPED selecionado: {filename}")
        except Exception as e:
            self.logger.error(f"Erro ao selecionar arquivo: {str(e)}")
            messagebox.showerror("Erro", f"Erro ao selecionar arquivo: {str(e)}")

    def iniciar_conversao(self):
        """Inicia o processo de conversão"""
        try:
            if not self.validar_entrada():
                return

            # Usar diretório de origem como padrão
            diretorio_inicial = self.diretorio_origem if hasattr(self, 'diretorio_origem') else os.getcwd()

            diretorio_saida = filedialog.askdirectory(
                title="Selecione onde salvar o arquivo Excel",
                initialdir=diretorio_inicial
            )

            # Se o usuário cancelar a seleção, usar o diretório de origem
            if not diretorio_saida:
                diretorio_saida = diretorio_inicial

            caminho_excel = os.path.join(diretorio_saida, self.arquivo_excel.get())
            if not caminho_excel.endswith('.xlsx'):
                caminho_excel += '.xlsx'

            self.botao_converter.state(['disabled'])
            self.progress.start(10)
            self.status_var.set("Convertendo...")

            thread = threading.Thread(
                target=lambda: self.converter(caminho_excel)
            )
            thread.daemon = True
            thread.start()

        except Exception as e:
            self.logger.error(f"Erro ao iniciar conversão: {str(e)}")
            self.conversao_concluida(False, str(e))

    def validar_entrada(self):
        """Valida os dados de entrada"""
        if not self.arquivo_sped.get():
            messagebox.showerror("Erro", "Selecione o arquivo SPED")
            return False

        if not self.arquivo_excel.get():
            messagebox.showerror("Erro", "Digite um nome para o arquivo Excel")
            return False

        if not os.path.exists(self.arquivo_sped.get()):
            messagebox.showerror("Erro", "Arquivo SPED não encontrado")
            return False

        return True

    def converter(self, caminho_excel):
        """Executa a conversão em uma thread separada"""
        try:
            arquivo_sped = self.arquivo_sped.get().strip('"\'')
            self.processar_sped_para_excel(arquivo_sped, caminho_excel)
            self.logger.info("Conversão concluída com sucesso")
            self.root.after(0, self.conversao_concluida, True)
        except Exception as e:
            self.logger.error(f"Erro durante a conversão: {str(e)}")
            self.root.after(0, self.conversao_concluida, False, str(e))

    def processar_sped_para_excel(self, caminho_arquivo_sped, caminho_saida_excel):
        """Processa o arquivo SPED e gera o Excel"""
        try:
            # Detectar encoding do arquivo
            encoding = self.detectar_encoding(caminho_arquivo_sped)

            # Armazena os registros como atributo da classe
            self.registros = self.ler_arquivo_sped(caminho_arquivo_sped, encoding)
            nome_empresa, periodo = self.extrair_informacoes_header(self.registros)

            self.gerar_excel(self.registros, nome_empresa, periodo, caminho_saida_excel)

        except Exception as e:
            self.logger.error(f"Erro no processamento: {str(e)}")
            raise

    def detectar_encoding(self, arquivo):
        """Detecta o encoding do arquivo, ignorando possíveis caracteres de assinatura"""
        try:
            # Lê os primeiros 50KB do arquivo para detecção
            with open(arquivo, 'rb') as f:
                raw_data = f.read(50 * 1024)
                result = chardet.detect(raw_data)
                return result['encoding']
        except Exception as e:
            self.logger.error(f"Erro ao detectar encoding: {str(e)}")
            return 'utf-8'

    def is_linha_valida(self, linha):
        """Verifica se a linha é uma linha válida do SPED"""
        # Remove espaços em branco e caracteres de controle
        linha = linha.strip()

        # Se a linha estiver vazia, não é válida
        if not linha:
            return False

        # Verifica se a linha começa e termina com pipe
        if not (linha.startswith('|') and linha.endswith('|')):
            return False

        # Divide a linha em campos
        campos = linha.split('|')

        # Uma linha SPED válida deve ter pelo menos 3 campos
        if len(campos) < 3:
            return False

        # Verifica se o segundo campo (tipo de registro) é um código válido
        reg_code = campos[1]
        if not reg_code:
            return False

        # Verifica se o código do registro segue o padrão esperado
        import re
        padrao_registro = re.compile(r'^[A-Z]?\d{3,4}$')
        return bool(padrao_registro.match(reg_code))

    def ler_arquivo_sped(self, arquivo, encoding):
        """Lê o arquivo SPED e retorna os registros, ignorando caracteres ilegíveis de assinatura"""
        registros = defaultdict(list)
        encodings = [encoding, 'latin1', 'cp1252', 'iso-8859-1', 'utf-8']

        for enc in encodings:
            try:
                linhas_validas = []
                with open(arquivo, 'r', encoding=enc) as f:
                    for linha in f:
                        try:
                            if self.is_linha_valida(linha):
                                linhas_validas.append(linha)
                        except UnicodeDecodeError:
                            continue

                # Processa apenas as linhas válidas
                for linha in linhas_validas:
                    campos = linha.split('|')
                    if len(campos) > 1:
                        tipo_registro = campos[1]
                        registros[tipo_registro].append(campos)

                return registros

            except UnicodeDecodeError:
                continue
            except Exception as e:
                self.logger.error(f"Erro na leitura do arquivo com encoding {enc}: {str(e)}")
                continue

        raise Exception("Não foi possível ler o arquivo com nenhuma codificação")

    def gerar_excel(self, registros, nome_empresa, periodo, caminho_saida):
        """Gera o arquivo Excel com os registros processados"""
        registros_fiscais = {
            'C190': [], 'C590': [], 'D190': [], 'D590': []
        }

        def formatar_data(data_str):
            if isinstance(data_str, str) and len(data_str) >= 8:
                return f"{data_str[:2]}/{data_str[2:4]}/{data_str[4:8]}"
            return data_str

        with pd.ExcelWriter(caminho_saida, engine='xlsxwriter') as writer:
            self._processar_registros(registros, registros_fiscais, writer, formatar_data)
            self._criar_aba_consolidada(writer, registros_fiscais, nome_empresa, periodo)
            self._processar_outras_obrigacoes(registros, writer)
            self._processar_registros_e110_e111(registros, writer)
            self._criar_aba_c170_com_ncm(writer, registros)  # NOVA LINHA ADICIONADA

    def _processar_registros(self, registros, registros_fiscais, writer, formatar_data):
        """Processa os registros e cria as abas do Excel"""
        # Define a ordem desejada dos blocos, incluindo todos os possíveis
        ordem_blocos = ['0', 'B', 'C', 'D', 'E', 'G', 'H', 'K', '1', '9']
        registros_ordenados = []

        # Agrupa os registros por bloco e ordena dentro de cada bloco
        for bloco in ordem_blocos:
            registros_bloco = [(k, v) for k, v in registros.items() if k.startswith(bloco)]
            registros_bloco.sort(key=lambda x: x[0])  # Ordena por código do registro
            registros_ordenados.extend(registros_bloco)

        # Adiciona quaisquer outros registros que não começam com os blocos definidos
        outros_registros = [(k, v) for k, v in registros.items()
                            if not any(k.startswith(b) for b in ordem_blocos)]
        if outros_registros:
            outros_registros.sort(key=lambda x: x[0])
            registros_ordenados.extend(outros_registros)

        e110_e111_processado = False  # Flag para controlar processamento do E110/E111

        # Processa os registros na ordem correta
        for tipo_registro, linhas in registros_ordenados:
            # Pula o processamento inicial de E110 e E111
            if tipo_registro in ['E110', 'E111']:
                continue

            if not linhas:
                continue

            try:
                df = pd.DataFrame(linhas)
                if not df.empty and df.shape[1] > 2:
                    df = df.iloc[:, 1:-1]

                    layout_colunas = self.obter_layout_registro(tipo_registro)
                    if layout_colunas:
                        colunas_ajustadas = self._ajustar_colunas(df, layout_colunas)
                        df.columns = colunas_ajustadas
                    else:
                        df.columns = [f'Campo_{i}' for i in range(1, len(df.columns) + 1)]

                    sheet_name = f'{tipo_registro}'[:31]
                    worksheet = writer.book.add_worksheet(sheet_name)

                    # Formato para cabeçalho
                    header_format = writer.book.add_format({
                        'bold': True,
                        'text_wrap': True,
                        'valign': 'top',
                        'fg_color': '#D7E4BC',
                        'border': 1
                    })

                    # Escrever cabeçalhos e dados
                    for col_num, value in enumerate(df.columns):
                        worksheet.write(0, col_num, value, header_format)

                    for row_num, row_data in enumerate(df.values):
                        for col_num, value in enumerate(row_data):
                            worksheet.write(row_num + 1, col_num, value)

                    self._formatar_planilha(writer, sheet_name, df)

                    if tipo_registro in registros_fiscais:
                        registros_fiscais[tipo_registro].extend(df.values.tolist())

                    # Se encontrou E100 e ainda não processou E110/E111
                    if tipo_registro == 'E100' and not e110_e111_processado:
                        self._processar_registros_e110_e111(registros, writer)
                        e110_e111_processado = True  # Marca como processado

            except Exception as e:
                self.logger.error(f"Erro ao processar registro {tipo_registro}: {str(e)}")
                continue

        # Log para debug
        self.logger.info(f"Registros processados: {[reg[0] for reg in registros_ordenados]}")

    def _ajustar_colunas(self, df, colunas):
        """Ajusta os nomes das colunas do DataFrame"""
        if len(colunas) > len(df.columns):
            colunas = colunas[:len(df.columns)]
        elif len(colunas) < len(df.columns):
            colunas.extend([f'Campo_{i}' for i in range(
                len(colunas) + 1, len(df.columns) + 1)])
        return colunas

    def _formatar_planilha(self, writer, sheet_name, df):
        """Formata as colunas da planilha Excel"""
        worksheet = writer.sheets[sheet_name]
        for i, col in enumerate(df.columns, start=0):  # start=1 para começar da coluna B
            try:
                col_length = df[col].astype(str).str.len().max()
                header_length = len(str(col))
                max_length = max(col_length if pd.notnull(col_length) else 0,
                                 header_length)
                worksheet.set_column(i, i, min(max_length + 2, 50))
            except Exception:
                worksheet.set_column(i, i, 15)

    def _criar_aba_consolidada(self, writer, registros_fiscais, nome_empresa, periodo):
        """Cria a aba consolidada com os registros fiscais"""
        try:
            dfs = []
            for tipo_reg, dados in registros_fiscais.items():
                try:
                    if dados:
                        df = pd.DataFrame(dados)
                        df['Tipo_Registro'] = tipo_reg
                        df['Data'] = periodo
                        dfs.append(df)
                except Exception as e:
                    self.logger.error(f"Erro ao processar registro {tipo_reg}: {str(e)}")
                    continue

            if dfs:
                df_consolidado = pd.concat(dfs, ignore_index=True)
                self._processar_consolidado(writer, df_consolidado, nome_empresa)

        except Exception as e:
            self.logger.error(f"Erro ao criar aba consolidada: {str(e)}")
            raise

    def _processar_outras_obrigacoes(self, registros, writer):
        """Processa os registros C197 e D197 e cria a aba de Outras Obrigações"""
        try:
            # Definir o layout para C197/D197
            layout_197 = ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM',
                          'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS']

            # Inicializar listas para armazenar os registros
            registros_197 = []

            # Processar C197
            if 'C197' in registros and registros['C197']:
                for linha in registros['C197']:
                    # Remover primeiro e último elementos (vazio e |)
                    registro = linha[1:-1]
                    # Preencher com valores vazios se necessário
                    while len(registro) < len(layout_197):
                        registro.append('')
                    registros_197.append(registro)

            # Processar D197
            if 'D197' in registros and registros['D197']:
                for linha in registros['D197']:
                    registro = linha[1:-1]
                    while len(registro) < len(layout_197):
                        registro.append('')
                    registros_197.append(registro)

            if registros_197:
                # Criar DataFrame com todos os registros
                df_197 = pd.DataFrame(registros_197, columns=layout_197)

                # Converter campos numéricos
                campos_numericos = ['VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS']
                for campo in campos_numericos:
                    df_197[campo] = pd.to_numeric(
                        df_197[campo].str.replace(',', '.'),
                        errors='coerce'
                    ).fillna(0)

                # Criar aba Outras_Obrigações_197
                worksheet = writer.book.add_worksheet('Outras_Obrigacoes_197')

                # Formato para cabeçalho
                header_format = writer.book.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })

                # Formato para números
                num_format = writer.book.add_format({
                    'num_format': '#,##0.00',
                    'border': 1
                })

                # Escrever cabeçalhos
                for col, header in enumerate(layout_197):
                    worksheet.write(0, col, header, header_format)

                # Escrever dados
                for row_idx, row in df_197.iterrows():
                    for col_idx, value in enumerate(row):
                        if col_idx in [4, 5, 6, 7]:  # Índices dos campos numéricos
                            worksheet.write(row_idx + 1, col_idx, value, num_format)
                        else:
                            worksheet.write(row_idx + 1, col_idx, value)

                # Criar tabela resumo
                self._criar_tabela_resumo_197(df_197, writer)

                # Ajustar largura das colunas
                for i, col in enumerate(layout_197):
                    worksheet.set_column(i, i, max(len(str(col)), 15))

        except Exception as e:
            self.logger.error(f"Erro ao processar outras obrigações: {str(e)}")
            raise

    def _criar_tabela_resumo_197(self, df_197, writer):
        """Cria a tabela resumo dos registros 197"""
        try:
            # Agrupar dados por REG, COD_AJ e DESCR_COMPL_AJ
            resumo = df_197.groupby(['REG', 'COD_AJ', 'DESCR_COMPL_AJ'])['VL_ICMS'].sum().reset_index()

            # Criar nova worksheet para o resumo
            worksheet = writer.book.add_worksheet('Resumo_Outras_Obrigacoes')

            # Formatos
            header_format = writer.book.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#D7E4BC',
                'border': 1
            })

            num_format = writer.book.add_format({
                'num_format': '#,##0.00',
                'border': 1
            })

            # Escrever cabeçalhos
            headers = ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'VL_ICMS']
            for col, header in enumerate(headers):
                worksheet.write(0, col, header, header_format)

            # Escrever dados
            for row_idx, row in resumo.iterrows():
                worksheet.write(row_idx + 1, 0, row['REG'])
                worksheet.write(row_idx + 1, 1, row['COD_AJ'])
                worksheet.write(row_idx + 1, 2, row['DESCR_COMPL_AJ'])
                worksheet.write(row_idx + 1, 3, row['VL_ICMS'], num_format)

            # Ajustar largura das colunas
            worksheet.set_column(0, 0, 15)  # REG
            worksheet.set_column(1, 1, 20)  # COD_AJ
            worksheet.set_column(2, 2, 50)  # DESCR_COMPL_AJ
            worksheet.set_column(3, 3, 15)  # VL_ICMS

        except Exception as e:
            self.logger.error(f"Erro ao criar tabela resumo: {str(e)}")
            raise

    def _processar_registros_e110_e111(self, registros, writer):
        """Processa os registros E110 e E111, convertendo campos numéricos"""
        try:
            # Definir os layouts
            layout_e110 = ['REG', 'VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS',
                           'VL_ESTORNOS_CRED', 'VL_TOT_CREDITOS', 'VL_AJ_CREDITOS',
                           'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB', 'VL_SLD_CREDOR_ANT',
                           'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER',
                           'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP']

            layout_e111 = ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR']

            # Processar E110
            if 'E110' in registros and registros['E110']:
                df_e110 = pd.DataFrame([reg[1:-1] for reg in registros['E110']], columns=layout_e110)

                # Converter todos os campos que começam com VL_ ou DEB_
                for col in df_e110.columns:
                    if col.startswith('VL_') or col.startswith('DEB_'):
                        df_e110[col] = pd.to_numeric(
                            df_e110[col].str.replace(',', '.'),
                            errors='coerce'
                        ).fillna(0)

                # Formatos
                header_format = writer.book.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })

                num_format = writer.book.add_format({
                    'num_format': '#,##0.00',
                    'border': 1
                })

                # Se a aba E110 já existe, usá-la; caso contrário, criar nova
                if 'E110' in writer.sheets:
                    worksheet = writer.sheets['E110']
                else:
                    worksheet = writer.book.add_worksheet('E110')
                    # Escrever cabeçalhos apenas se for uma nova planilha
                    for col, header in enumerate(layout_e110):
                        worksheet.write(0, col, header, header_format)
                        worksheet.set_column(col, col, max(len(header), 15))

                # Escrever dados
                for row_idx, row in df_e110.iterrows():
                    for col_idx, value in enumerate(row):
                        if layout_e110[col_idx].startswith(('VL_', 'DEB_')):
                            worksheet.write(row_idx + 1, col_idx, value, num_format)
                        else:
                            worksheet.write(row_idx + 1, col_idx, value)

            # Processar E111
            if 'E111' in registros and registros['E111']:
                df_e111 = pd.DataFrame([reg[1:-1] for reg in registros['E111']], columns=layout_e111)

                # Converter o campo VL_AJ_APUR para numérico
                df_e111['VL_AJ_APUR'] = pd.to_numeric(
                    df_e111['VL_AJ_APUR'].str.replace(',', '.'),
                    errors='coerce'
                ).fillna(0)

                # Se a aba E111 já existe, usá-la; caso contrário, criar nova
                if 'E111' in writer.sheets:
                    worksheet = writer.sheets['E111']
                else:
                    worksheet = writer.book.add_worksheet('E111')
                    # Escrever cabeçalhos apenas se for uma nova planilha
                    for col, header in enumerate(layout_e111):
                        worksheet.write(0, col, header, header_format)
                        worksheet.set_column(col, col, max(len(header), 20))

                # Escrever dados
                for row_idx, row in df_e111.iterrows():
                    for col_idx, value in enumerate(row):
                        if layout_e111[col_idx] == 'VL_AJ_APUR':
                            worksheet.write(row_idx + 1, col_idx, value, num_format)
                        else:
                            worksheet.write(row_idx + 1, col_idx, value)

        except Exception as e:
            self.logger.error(f"Erro ao processar registros E110/E111: {str(e)}")
            raise

    def _criar_aba_c170_com_ncm(self, writer, registros):
        """Cria aba C170 integrada com NCM do registro 0200 - VERSÃO FINAL CORRIGIDA"""
        try:
            # Verificar se existem os registros necessários
            if 'C170' not in registros or not registros['C170']:
                self.logger.info("Registro C170 não encontrado")
                return False

            if '0200' not in registros or not registros['0200']:
                self.logger.info("Registro 0200 não encontrado")
                return False

            self.logger.info("=== INICIANDO CRIAÇÃO DA ABA C170_com_NCM ===")

            # PASSO 1: Criar dicionário do registro 0200 com DEBUG COMPLETO
            self.logger.info("Passo 1: Criando catálogo de produtos do registro 0200...")
            catalogo_produtos = {}
            
            for i, linha_0200 in enumerate(registros['0200']):
                try:
                    # Debug: Mostrar estrutura das primeiras linhas
                    if i < 3:
                        self.logger.info(f"Debug 0200[{i}]: {linha_0200}")
                        self.logger.info(f"Comprimento: {len(linha_0200)}")
                    
                    # CORREÇÃO: Garantir que temos pelo menos 9 campos (incluindo NCM no índice 7)
                    if len(linha_0200) >= 9:
                        # Extrair dados removendo pipes vazios
                        dados_limpos = [campo.strip() for campo in linha_0200 if campo.strip() != ""]
                        
                        if len(dados_limpos) >= 8:
                            codigo_item = dados_limpos[1]  # COD_ITEM (campo 2)
                            descricao = dados_limpos[2] if len(dados_limpos) > 2 else ""  # DESCR_ITEM (campo 3)
                            ncm = dados_limpos[6] if len(dados_limpos) > 6 else ""  # COD_NCM (campo 7)
                            # CORREÇÃO: NCM está no campo 8 (índice 7)
                            tipo_item = dados_limpos[7] if len(dados_limpos) > 7 else ""  #TIPO_ITEM  (campo 8)

                            # Debug detalhado dos primeiros registros
                            if i < 5:
                                self.logger.info(f"0200[{i}] - COD: '{codigo_item}', NCM: '{ncm}', DESC: '{descricao[:20]}...'")

                            # Só adicionar se o código do item não estiver vazio
                            if codigo_item and codigo_item.strip():
                                catalogo_produtos[codigo_item] = {
                                    'ncm': ncm if ncm.strip() else "NCM VAZIO",
                                    'descricao': descricao if descricao.strip() else "DESCRIÇÃO VAZIA",
                                    'tipo': tipo_item if tipo_item.strip() else "TIPO VAZIO"
                                }
                                
                except Exception as e:
                    self.logger.warning(f"Erro linha {i} do 0200: {e}")
                    continue

            self.logger.info(f"Catálogo criado: {len(catalogo_produtos)} produtos")
            
            # Debug: Mostrar amostra do catálogo
            if catalogo_produtos:
                primeiros_5 = list(catalogo_produtos.items())[:5]
                self.logger.info("Primeiros 5 produtos no catálogo:")
                for codigo, info in primeiros_5:
                    self.logger.info(f"  '{codigo}' -> NCM: '{info['ncm']}', DESC: '{info['descricao'][:30]}...'")

            # PASSO 2: Processar C170
            self.logger.info("Passo 2: Processando registros C170...")
            dados_resultado = []
            contador_encontrados = 0
            contador_nao_encontrados = 0

            # Definir colunas
            colunas_c170 = [
                'REG', 'NUM_ITEM', 'COD_ITEM', 'DESCR_COMPL', 'QTD', 'UNID',
                'VL_ITEM', 'VL_DESC', 'IND_MOV', 'CST_ICMS', 'CFOP', 'COD_NAT',
                'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST',
                'ALIQ_ST', 'VL_ICMS_ST', 'IND_APUR', 'CST_IPI', 'COD_ENQ',
                'VL_BC_IPI', 'ALIQ_IPI', 'VL_IPI', 'CST_PIS', 'VL_BC_PIS',
                'ALIQ_PIS', 'QUANT_BC_PIS', 'ALIQ_PIS_QUANT', 'VL_PIS',
                'CST_COFINS', 'VL_BC_COFINS', 'ALIQ_COFINS', 'QUANT_BC_COFINS',
                'ALIQ_COFINS_QUANT', 'VL_COFINS', 'COD_CTA'
            ]
            
            colunas_0200 = ['NCM_PRODUTO', 'DESCR_CADASTRAL', 'TIPO_ITEM','STATUS_VINCULACAO']
            todas_colunas = colunas_c170 + colunas_0200

            for i, linha_c170 in enumerate(registros['C170']):
                try:
                    # Debug: Mostrar estrutura das primeiras linhas
                    if i < 3:
                        self.logger.info(f"Debug C170[{i}]: {linha_c170}")

                    if len(linha_c170) >= 4:
                        # Extrair dados removendo pipes vazios
                        dados_limpos = [campo.strip() for campo in linha_c170 if campo.strip() != ""]
                        
                        if len(dados_limpos) >= 3:
                            codigo_item_c170 = dados_limpos[2]  # COD_ITEM no C170 (campo 3)

                            # Debug dos códigos
                            if i < 5:
                                self.logger.info(f"C170[{i}] - COD: '{codigo_item_c170}'")

                            # Montar linha de resultado
                            linha_resultado = []
                            
                            # Preencher campos C170
                            for j, coluna in enumerate(colunas_c170):
                                if j < len(dados_limpos):
                                    linha_resultado.append(dados_limpos[j])
                                else:
                                    linha_resultado.append("")

                            # Buscar no catálogo
                            if codigo_item_c170 in catalogo_produtos:
                                produto = catalogo_produtos[codigo_item_c170]
                                linha_resultado.extend([
                                    produto['ncm'],
                                    produto['descricao'],
                                    produto['tipo'],
                                    'ENCONTRADO'
                                ])
                                contador_encontrados += 1
                                
                                # Debug para encontrados
                                if contador_encontrados <= 5:
                                    self.logger.info(f"✓ ENCONTRADO: '{codigo_item_c170}' -> NCM: '{produto['ncm']}'")
                            else:
                                linha_resultado.extend([
                                    'NCM NÃO LOCALIZADO',
                                    'DESCRIÇÃO NÃO LOCALIZADA', 
                                    'TIPO NÃO LOCALIZADO',
                                    'NÃO ENCONTRADO'
                                ])
                                contador_nao_encontrados += 1
                                
                                # Debug para não encontrados
                                if contador_nao_encontrados <= 5:
                                    self.logger.info(f"✗ NÃO ENCONTRADO: '{codigo_item_c170}'")

                            dados_resultado.append(linha_resultado)

                except Exception as e:
                    self.logger.error(f"Erro linha {i} do C170: {e}")
                    continue

            if not dados_resultado:
                self.logger.warning("Nenhum dado processado")
                return False

            # PASSO 3: Criar Excel
            self.logger.info("Passo 3: Gerando Excel...")
            
            # Garantir tamanho uniforme
            for linha in dados_resultado:
                while len(linha) < len(todas_colunas):
                    linha.append("")

            # Criar DataFrame e salvar
            df = pd.DataFrame(dados_resultado, columns=todas_colunas)
            nome_aba = 'C170_com_NCM'
            
            # CORREÇÃO: startrow=1 para alinhamento correto
            df.to_excel(writer, sheet_name=nome_aba, index=False, startrow=1, startcol=0)
            worksheet = writer.sheets[nome_aba]

            # Formatação
            formato_titulo = writer.book.add_format({
                'bold': True, 'font_size': 14, 'bg_color': '#366092',
                'font_color': 'white', 'align': 'center'
            })

            # Título com estatísticas
            percentual = (contador_encontrados / len(dados_resultado) * 100) if dados_resultado else 0
            titulo = f'C170 + NCM (Campo 8 do 0200) - Encontrados: {contador_encontrados} | Não Encontrados: {contador_nao_encontrados} | Taxa: {percentual:.1f}%'
            worksheet.merge_range(0, 0, 0, len(todas_colunas)-1, titulo, formato_titulo)

            # Ajustar colunas
            for col, cabecalho in enumerate(todas_colunas):
                if cabecalho == 'COD_ITEM':
                    worksheet.set_column(col, col, 15)
                elif cabecalho in ['DESCR_COMPL', 'DESCR_CADASTRAL']:
                    worksheet.set_column(col, col, 35)
                elif cabecalho == 'NCM_PRODUTO':
                    worksheet.set_column(col, col, 12)
                elif cabecalho == 'STATUS_VINCULACAO':
                    worksheet.set_column(col, col, 18)
                else:
                    worksheet.set_column(col, col, 12)

            # Log final
            self.logger.info(f"=== CONCLUÍDO ===")
            self.logger.info(f"Processados: {len(dados_resultado)}")
            self.logger.info(f"Encontrados: {contador_encontrados}")
            self.logger.info(f"Não encontrados: {contador_nao_encontrados}")
            self.logger.info(f"Taxa de sucesso: {percentual:.1f}%")

            return True

        except Exception as e:
            self.logger.error(f"ERRO CRÍTICO: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())
            return False

    def _processar_consolidado(self, writer, df_consolidado, nome_empresa):
        try:
            worksheet = writer.book.add_worksheet('Consolidado_Fiscal')

            header_format = writer.book.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#D7E4BC',
                'border': 1
            })

            # Get company info
            cnpj = self.registros.get('0000', [[]])[0][7] if self.registros.get('0000') else ""
            empresa_cnpj = f"{nome_empresa} - CNPJ: {cnpj}" if cnpj else nome_empresa
            worksheet.merge_range('A1:L1', empresa_cnpj, header_format)

            # Initialize verification counters
            verificacao = {
                'C190': {'origem': 0, 'processado': 0},
                'D190': {'origem': 0, 'processado': 0},
                'C590': {'origem': 0, 'processado': 0},
                'D590': {'origem': 0, 'processado': 0}
            }

            # Count records in source
            for tipo in verificacao.keys():
                verificacao[tipo]['origem'] = len(self.registros.get(tipo, []))

            registros_dados = []
            data_sped = ""

            # Get SPED date
            if '0000' in self.registros and self.registros['0000']:
                data_str = self.registros['0000'][0][4]
                if len(data_str) == 8:
                    data_sped = f"{data_str[:2]}/{data_str[2:4]}/{data_str[4:8]}"

            # Process records
            for tipo_reg in ['C190', 'C590', 'D190', 'D590']:
                if tipo_reg in self.registros:
                    for linha in self.registros[tipo_reg]:
                        dados = linha[1:-1]
                        try:
                            registro = self._processar_registro_fiscal(tipo_reg, dados, data_sped)
                            registros_dados.append(registro)
                            verificacao[tipo_reg]['processado'] += 1
                        except Exception as e:
                            self.logger.error(f"Erro processando registro {tipo_reg}: {str(e)}")
                            continue

            # Create consolidated DataFrame
            if registros_dados:
                df_consolidado = pd.DataFrame(registros_dados)

                # Define column order
                colunas_ordem = ['Data', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS',
                                 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI',
                                 'COD_OBS', 'Tipo_Registro']

                df_consolidado = df_consolidado[colunas_ordem]

                # Write consolidated data
                self._escrever_dados_consolidados(worksheet, df_consolidado, header_format, writer)

                # Write verification table
                self._escrever_tabela_verificacao(worksheet, verificacao, writer)

                return df_consolidado

            return pd.DataFrame()

        except Exception as e:
            self.logger.error(f"Erro ao processar aba consolidada: {str(e)}")
            raise

    def _processar_registro_fiscal(self, tipo_reg, dados, data_sped):
        """Process individual fiscal record"""
        registro = {
            'Data': data_sped,
            'CST_ICMS': int(dados[1]) if dados[1].strip() else 0,
            'CFOP': int(dados[2]) if dados[2].strip() else 0,
            'ALIQ_ICMS': float(dados[3].replace(',', '.')) if dados[3] else 0,
            'VL_OPR': float(dados[4].replace(',', '.')) if dados[4] else 0,
            'VL_BC_ICMS': float(dados[5].replace(',', '.')) if dados[5] else 0,
            'VL_ICMS': float(dados[6].replace(',', '.')) if dados[6] else 0
        }

        # Handle different record types
        if tipo_reg in ['C190', 'C590', 'D590']:
            registro.update({
                'VL_BC_ICMS_ST': float(dados[7].replace(',', '.')) if dados[7] else 0,
                'VL_ICMS_ST': float(dados[8].replace(',', '.')) if dados[8] else 0,
                'VL_RED_BC': float(dados[9].replace(',', '.')) if dados[9] else 0,
                'VL_IPI': float(dados[10].replace(',', '.')) if len(dados) > 10 and dados[
                    10] and tipo_reg == 'C190' else 0,
                'COD_OBS': dados[11] if len(dados) > 11 and tipo_reg == 'C190' else (
                    dados[10] if len(dados) > 10 else '')
            })
        else:  # D190
            registro.update({
                'VL_RED_BC': float(dados[7].replace(',', '.')) if dados[7] else 0,
                'COD_OBS': dados[8] if len(dados) > 8 else '',
                'VL_BC_ICMS_ST': 0,
                'VL_ICMS_ST': 0,
                'VL_IPI': 0
            })

        registro['Tipo_Registro'] = tipo_reg
        return registro

    def _escrever_dados_consolidados(self, worksheet, df_consolidado, header_format, writer):
        """Write consolidated data to worksheet with proper date formatting"""
        # Write headers
        for col_num, value in enumerate(df_consolidado.columns):
            worksheet.write(2, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 15)

        # Create date format
        date_format = writer.book.add_format({'num_format': 'dd/mm/yyyy'})
        num_format = writer.book.add_format({'num_format': '#,##0.00'})

        # Write data with date formatting
        for row_num, row in enumerate(df_consolidado.values):
            for col_num, value in enumerate(row):
                if col_num == 0 and value:  # Date column
                    try:
                        # Convert string date to Excel date
                        date_parts = value.split('/')
                        if len(date_parts) == 3:
                            day, month, year = map(int, date_parts)
                            excel_date = datetime(year, month, day)
                            worksheet.write_datetime(row_num + 3, col_num, excel_date, date_format)
                        else:
                            worksheet.write(row_num + 3, col_num, value)
                    except Exception as e:
                        self.logger.error(f"Erro ao converter data: {str(e)}")
                        worksheet.write(row_num + 3, col_num, value)
                elif col_num in [4, 5, 6, 7, 8, 9, 10]:  # Numeric columns
                    worksheet.write(row_num + 3, col_num, value, num_format)
                else:
                    worksheet.write(row_num + 3, col_num, value)

    def _escrever_tabela_verificacao(self, worksheet, verificacao, writer):
        """Write verification table"""
        # Start position for verification table
        row_start = 2
        col_start = len(['Data', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS',
                         'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI',
                         'COD_OBS', 'Tipo_Registro']) + 2

        # Formats
        header_format = writer.book.add_format({
            'bold': True,
            'bg_color': '#D7E4BC',
            'border': 1
        })

        cell_format = writer.book.add_format({'border': 1})

        warning_format = writer.book.add_format({
            'bg_color': '#FFC7CE',
            'font_color': '#9C0006',
            'border': 1
        })

        success_format = writer.book.add_format({
            'bg_color': '#C6EFCE',
            'font_color': '#006100',
            'border': 1
        })

        # Write headers
        headers = ['Registro', 'Registros na Origem', 'Registros Processados', 'Status']
        for col, header in enumerate(headers):
            worksheet.write(row_start, col_start + col, header, header_format)

        # Write data
        current_row = row_start + 1
        for tipo, contagem in verificacao.items():
            worksheet.write(current_row, col_start, tipo, cell_format)
            worksheet.write(current_row, col_start + 1, contagem['origem'], cell_format)
            worksheet.write(current_row, col_start + 2, contagem['processado'], cell_format)

            status = "OK" if contagem['origem'] == contagem['processado'] else "DIVERGENTE"
            format_to_use = success_format if status == "OK" else warning_format
            worksheet.write(current_row, col_start + 3, status, format_to_use)

            current_row += 1

        # Adjust column widths
        for col in range(4):
            worksheet.set_column(col_start + col, col_start + col, 20)

    def obter_layout_registro(self, tipo_registro):
        """Retorna o layout específico para cada tipo de registro"""
        layouts = {
            # Bloco 0 - Abertura e Identificação
            '0000': ['REG', 'COD_VER', 'COD_FIN', 'DT_INI', 'DT_FIN', 'NOME', 'CNPJ', 'CPF', 'UF', 'IE', 'COD_MUN',
                     'IM', 'SUFRAMA', 'IND_PERFIL', 'IND_ATIV'],

            # Bloco C - Documentos Fiscais I - Mercadorias (ICMS/IPI)
            'C100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'NUM_DOC', 'CHV_NFE',
                     'DT_DOC', 'DT_E_S', 'VL_DOC', 'IND_PGTO', 'VL_DESC', 'VL_ABAT_NT', 'VL_MERC', 'IND_FRT',
                     'VL_FRT', 'VL_SEG', 'VL_OUT_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST',
                     'VL_IPI', 'VL_PIS', 'VL_COFINS', 'VL_PIS_ST', 'VL_COFINS_ST'],

            'C170': ['REG', 'NUM_ITEM', 'COD_ITEM', 'DESCR_COMPL', 'QTD', 'UNID', 'VL_ITEM', 'VL_DESC', 'IND_MOV',
                     'CST_ICMS', 'CFOP', 'COD_NAT', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST',
                     'ALIQ_ST', 'VL_ICMS_ST', 'IND_APUR', 'CST_IPI', 'COD_ENQ', 'VL_BC_IPI', 'ALIQ_IPI', 'VL_IPI',
                     'CST_PIS', 'VL_BC_PIS', 'ALIQ_PIS', 'QUANT_BC_PIS', 'VL_PIS', 'CST_COFINS', 'VL_BC_COFINS',
                     'ALIQ_COFINS', 'QUANT_BC_COFINS', 'VL_COFINS', 'COD_CTA', 'VL_ABAT_NT'],

            'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST',
                     'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],

            'C500': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'COD_CONS',
                     'NUM_DOC', 'DT_DOC', 'DT_E_S', 'VL_DOC', 'VL_DESC', 'VL_FORN', 'VL_SERV_NT', 'VL_TERC',
                     'VL_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'COD_INF', 'VL_PIS',
                     'VL_COFINS'],

            'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST',
                     'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],

            # Bloco D - Documentos Fiscais II - Serviços (ICMS)
            'D100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'NUM_DOC',
                     'CHV_CTE', 'DT_DOC', 'DT_A_P', 'TP_CT-e', 'CHV_CTE_REF', 'VL_DOC', 'VL_DESC', 'IND_FRT',
                     'VL_SERV', 'VL_BC_ICMS', 'VL_ICMS', 'VL_NT', 'COD_INF', 'COD_CTA', 'COD_MUN_ORIG',
                     'COD_MUN_DEST'],

            'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC',
                     'COD_OBS'],

            'D500': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'NUM_DOC',
                     'DT_DOC', 'DT_A_P', 'VL_DOC', 'VL_DESC', 'VL_SERV', 'VL_SERV_NT', 'VL_TERC', 'VL_DA',
                     'VL_BC_ICMS', 'VL_ICMS', 'COD_INF', 'VL_PIS', 'VL_COFINS', 'COD_CTA', 'TP_ASSINANTE'],

            'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST',
                     'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],

            # Bloco E - Apuração do ICMS e do IPI
            'E100': ['REG', 'DT_INI', 'DT_FIN'],

            'E110': ['REG', 'VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS', 'VL_ESTORNOS_CRED',
                     'VL_TOT_CREDITOS', 'VL_AJ_CREDITOS', 'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB',
                     'VL_SLD_CREDOR_ANT', 'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER',
                     'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP'],

            'E111': ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR'],

            'E200': ['REG', 'UF', 'DT_INI', 'DT_FIN'],

            'E210': ['REG', 'IND_MOV_ST', 'VL_SLD_CRED_ANT_ST', 'VL_DEVOL_ST', 'VL_RESSARC_ST', 'VL_OUT_CRED_ST',
                     'VL_AJ_CREDITOS_ST', 'VL_RETENCAO_ST', 'VL_OUT_DEB_ST', 'VL_AJ_DEBITOS_ST',
                     'VL_SLD_DEV_ANT_ST', 'VL_DEDUCOES_ST', 'VL_ICMS_RECOL_ST', 'VL_SLD_CRED_ST_TRANSPORTAR',
                     'DEB_ESP_ST'],

            'E500': ['REG', 'IND_APUR', 'DT_INI', 'DT_FIN'],

            'E510': ['REG', 'CFOP', 'CST_IPI', 'VL_CONT_IPI', 'VL_BC_IPI', 'VL_IPI'],

            'E520': ['REG', 'VL_SD_ANT_IPI', 'VL_DEB_IPI', 'VL_CRED_IPI', 'VL_OD_IPI', 'VL_OC_IPI', 'VL_SC_IPI',
                     'VL_SD_IPI']
        }

        # Campos numéricos por registro
        NUMERIC_FIELDS = {
            'C100': ['VL_DOC', 'VL_DESC', 'VL_ABAT_NT', 'VL_MERC', 'VL_FRT', 'VL_SEG', 'VL_OUT_DA', 'VL_BC_ICMS',
                     'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_IPI', 'VL_PIS', 'VL_COFINS', 'VL_PIS_ST',
                     'VL_COFINS_ST'],

            'C190': ['ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC',
                     'VL_IPI'],

            'C590': ['ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC'],

            'D190': ['ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC'],

            'D590': ['ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC'],

            'E110': ['VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS', 'VL_ESTORNOS_CRED', 'VL_TOT_CREDITOS',
                     'VL_AJ_CREDITOS', 'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB', 'VL_SLD_CREDOR_ANT',
                     'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER', 'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP'],

            'E111': ['VL_AJ_APUR']
        }

        # Campos que devem permanecer como texto
        TEXT_FIELDS = {
            'C100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'NUM_DOC', 'CHV_NFE',
                     'DT_DOC', 'DT_E_S', 'IND_PGTO', 'IND_FRT'],

            'C190': ['REG', 'CST_ICMS', 'CFOP', 'COD_OBS'],

            'D190': ['REG', 'CST_ICMS', 'CFOP', 'COD_OBS']
        }

        # Retorna o layout específico ou None se não encontrar
        return layouts.get(tipo_registro, None)

    def conversao_concluida(self, sucesso, erro=None):
        """Callback chamado quando a conversão é concluída"""
        self.progress.stop()
        self.botao_converter.state(['!disabled'])

        if sucesso:
            self.status_var.set("Conversão concluída com sucesso!")
            messagebox.showinfo("Sucesso", "Arquivo Excel gerado com sucesso!")
            self.logger.info("Conversão finalizada com sucesso")
        else:
            self.status_var.set("Erro na conversão!")
            messagebox.showerror("Erro", f"Erro durante a conversão: {erro}")
            self.logger.error(f"Conversão finalizada com erro: {erro}")


def main():
    try:
        root = tk.Tk()
        app = SpedConverterGUI(root)
        root.mainloop()
    except Exception as e:
        logging.error(f"Erro na execução principal: {str(e)}")
        messagebox.showerror("Erro Fatal",
                             f"Ocorreu um erro fatal na aplicação: {str(e)}")


if __name__ == "__main__":
    main()