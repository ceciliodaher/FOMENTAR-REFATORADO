<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Documento Orientativo para Registro E115 - Empresas Beneficiárias do FOMENTAR

## Introdução

O registro E115 da Escrituração Fiscal Digital (EFD ICMS/IPI) é utilizado para informar **valores declaratórios adicionais** relacionados à apuração do ICMS para empresas beneficiárias do programa FOMENTAR em Goiás. Este documento fornece orientações práticas para o correto preenchimento deste registro obrigatório.

## 1. Fundamentação Legal

O preenchimento do registro E115 está fundamentado nas seguintes normas[^1][^2][^3]:

- **Instrução Normativa nº 885/07-GSF**: Norma principal sobre apuração do FOMENTAR
- **Instrução Normativa nº 1501/21-GSE**: Alterou significativamente os critérios de apuração (alterada pela IN 1524/22-GSE)
- **Tabela 5.2 do SPED Fiscal de Goiás**: Define os códigos específicos para informações adicionais


## 2. Obrigatoriedade e Periodicidade

### 2.1 Quem deve informar

- **Todas as empresas beneficiárias do FOMENTAR** obrigadas à EFD ICMS/IPI[^1][^4]
- Empresas que possuem Termo de Acordo de Regime Especial (TARE) do programa


### 2.2 Quando informar

- **Mensalmente** na EFD ICMS/IPI[^5][^6]
- **Mesmo quando não houver valores**, deve-se informar zero (0) no campo "VL_INF_ADIC"[^5][^6]
- O registro deve ser gerado para **todos os códigos aplicáveis** ao contribuinte


## 3. Códigos Vigentes

### 3.1 Alteração dos Códigos em 2023

A partir de **01 de janeiro de 2023**, houve mudança significativa nos códigos utilizados[^7][^1]:


| Período | Códigos Utilizados | Quantidade |
| :-- | :-- | :-- |
| Até 31/12/2022 | GO000001 a GO000056 | 56 códigos |
| A partir de 01/01/2023 | GO200001 a GO200054 | 54 códigos |

### 3.2 Base para Mudança

A alteração decorreu da **IN 1501/21-GSE**, que substituiu o critério de proporcionalidade pelo **critério de CFOPs específicos**[^8] listados nos Anexos I, II e III da norma.

## 4. Estrutura do Demonstrativo de Apuração

O registro E115 deve refletir os valores do **"Demonstrativo da Apuração Mensal - Fomentar/Produzir/Microproduzir"**[^9][^10], organizado em quadros específicos:

### Quadro A - Apuração dos Saldos das Operações Incentivadas

**Códigos GO200001 a GO200026**

- Débitos e créditos de operações incentivadas
- Cálculo do ICMS financiado
- Apuração da parcela não financiada


### Quadro B - Apuração dos Saldos das Operações Não Incentivadas

**Códigos GO200027 a GO200042**

- Débitos e créditos de operações não incentivadas
- Saldos credores transferíveis entre quadros


### Quadro C - Demonstrativo de Débitos de Mercadoria Importada

**Códigos GO200043 a GO200054** (apenas para FOMENTAR)

- Específico para empresas que importam mercadorias
- Cálculo de excedentes e parcelas sujeitas ao incentivo


## 5. Estrutura do Registro E115

### 5.1 Campos do Registro

| Campo | Descrição | Tipo | Tamanho |
| :-- | :-- | :-- | :-- |
| REG | Texto fixo "E115" | C | 004 |
| COD_INF_ADIC | Código da informação adicional (Tabela 5.2) | C | 008 |
| VL_INF_ADIC | Valor da informação adicional | N | - |
| DESCR_COMPL_AJ | Descrição complementar (opcional) | C | - |

### 5.2 Exemplo Prático de Preenchimento

```
|E115|GO200001|15000,00|Débito ICMS Operações Incentivadas|
|E115|GO200002|0,00||
|E115|GO200003|2500,00|Outros Débitos Operações Incentivadas|
```


## 6. Principais Códigos E115 para FOMENTAR

### 6.1 Códigos Essenciais (Amostra)

| Código | Descrição | Quadro |
| :-- | :-- | :-- |
| GO200001 | Débito do ICMS das Operações Incentivadas | A |
| GO200005 | Crédito do ICMS para Operações Incentivadas | A |
| GO200010 | Saldo Devedor do ICMS das Operações Incentivadas | A |
| GO200016 | ICMS Sujeito a Financiamento | A |
| GO200020 | ICMS Financiado | A |
| GO200027 | Débito do ICMS das Operações Não Incentivadas | B |
| GO200043 | Total das Mercadorias Importadas | C |

[^11]

## 7. Procedimentos Operacionais

### 7.1 Sequência de Preenchimento

1. **Processar a apuração do ICMS** no sistema contábil/fiscal
2. **Gerar o Demonstrativo de Apuração Mensal** conforme modelo oficial[^12]
3. **Extrair os valores** de cada quadro do demonstrativo
4. **Informar no registro E115** utilizando os códigos GO200001 a GO200054
5. **Validar** se todos os códigos aplicáveis foram informados

### 7.2 Campos com Valor Zero

- **Sempre informar** o registro E115 mesmo quando o valor for zero[^5][^6]
- Preencher o campo "VL_INF_ADIC" com 0,00
- Não omitir códigos aplicáveis ao contribuinte


### 7.3 Integração com Outros Registros

O registro E115 deve ser consistente com:

- **Registro E110**: Apuração do ICMS próprio
- **Registro E111**: Ajustes/benefícios/incentivos da apuração
- **Registro 1200**: Controle de créditos fiscais


## 8. Controles e Validações

### 8.1 Validações Internas

- Conferir se a **soma dos quadros** está matematicamente correta
- Verificar **consistência** entre valores informados no E115 e no demonstrativo
- Validar se os **CFOPs utilizados** estão conforme Anexos da IN 1501/21-GSE


### 8.2 Documentação de Apoio

- Manter **cópia do demonstrativo** de apuração mensal
- Arquivar **documentação** que comprove os valores informados
- Conservar **memória de cálculo** detalhada


## 9. Penalidades e Consequências

### 9.1 Não Cumprimento

- **Multa** por informação incorreta ou omissa
- **Obrigatoriedade de reapresentação** do arquivo EFD
- **Questionamentos fiscais** sobre a apuração do incentivo


### 9.2 Melhores Práticas

- **Revisão mensal** dos lançamentos
- **Capacitação** da equipe fiscal
- **Atualização constante** sobre mudanças normativas


## 10. Considerações Finais

O correto preenchimento do registro E115 é fundamental para:

- **Manutenção** dos benefícios do FOMENTAR
- **Transparência** na apuração fiscal
- **Cumprimento** das obrigações acessórias

**Importante**: Este documento deve ser utilizado em conjunto com a legislação vigente e orientações específicas da Secretaria da Economia de Goiás. Em caso de dúvidas, consulte sempre a legislação atualizada ou procure orientação técnica especializada.

*Documento baseado na legislação vigente até julho de 2025. Sujeito a alterações conforme mudanças normativas.*

<div style="text-align: center">⁂</div>

[^1]: https://orientacaotributaria.economia.go.gov.br/spo-web/perguntasfrequentes/perguntafrequente/20742

[^2]: https://appasp.economia.go.gov.br/Legislacao/arquivos/secretario/in/IN_0885_2007.htm

[^3]: https://www.legisweb.com.br/legislacao/?legislacao=417977

[^4]: https://orientacaotributaria.economia.go.gov.br/spo-web/perguntasfrequentes/perguntafrequente/20741

[^5]: https://goias.gov.br/economia/wp-content/uploads/sites/45/2024/12/Guia_pratico_5.7.pdf

[^6]: https://goias.gov.br/economia/wp-content/uploads/sites/45/2019/08/GuiaPraticoGoiasv4.7-265.pdf

[^7]: https://goias.gov.br/economia/codigos-do-fomentar-produzir-e-microproduzir-mudam-em-janeiro/

[^8]: https://appasp.economia.go.gov.br/Legislacao/arquivos/secretario/in/IN_1501_2021.htm

[^9]: https://orientacaotributaria.economia.go.gov.br/spo-web/perguntasfrequentes/perguntafrequente/20610

[^10]: https://goias.gov.br/economia/wp-content/uploads/sites/45/2012/08/instrucao-de-preenchimento-do-demonstrativo-versao-34-d21.pdf

[^11]: https://saamauditoria.com.br/noticias/produzir-e-fomentar-go-como-realizar-o-calculo/

[^12]: https://goias.gov.br/economia/apuracao-do-icms/

[^13]: https://atendimento.inventsoftware.info/kb/pt-br/article/475450/taxplus-sped-fiscal-registro-e115-automatizacao-protegego

[^14]: https://help.foccoerp.com.br/Programas/FoccoERP/Administrativo/Livros Fiscais/Apuração de Saldos/FFIS0345/

[^15]: https://portalsped.fazenda.mg.gov.br/spedmg/export/sites/spedmg/efd/downloads/EFD-Manual-introdutorio-para-lancamentos-e-ajustes-na-EFD-MG-V.2024.01.pdf

[^16]: https://docs.questor.com.br/Produtos/GestãoContábilCloud/Fiscal/ICMS-ISS/ICMS/GO/incentivo-fomentar-e-produzir

[^17]: https://orientacaotributaria.economia.go.gov.br/spo-web/busca?s=E115

[^18]: https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=2519

[^19]: https://goias.gov.br/economia/wp-content/uploads/sites/45/2019/08/TabelasCodEFDGoias_janeiroo2024-241.pdf

[^20]: https://tdn.totvs.com/pages/viewpage.action?pageId=379318308

[^21]: https://www.econeteditora.com.br/icms_go/guia-prAtico-da-efd-goiAs---versAo-3_5.pdf

[^22]: https://centraldeatendimento.totvs.com/hc/pt-br/articles/360027776931-MP-FIS-Demonstrativo-da-Apuração-Mensal-Fomentar-Produzir-Microproduzir

[^23]: https://www.legisweb.com.br/legislacao/?id=282471

[^24]: http://sped.rfb.gov.br/arquivo/download/3045

[^25]: https://tdn.totvs.com/pages/viewpage.action?pageId=822243325

[^26]: https://www.legisweb.com.br/legislacao/?id=465915

[^27]: https://movidesk.consistem.com.br/kb/article/414857/como-gerar-o-registro-e115-do-sped-fiscal-informacoes-adicionais-da-apuracao-valores-declaratorios-de-forma-manual

[^28]: ftp://ftp.sefaz.go.gov.br/sefazgo/Guia pratico da EDF de Goias.pdf

[^29]: https://goias.gov.br/economia/wp-content/uploads/sites/45/2024/07/Guia_pratico_5.5.pdf

[^30]: http://static.fazenda.df.gov.br/arquivos/servico-821/Tutorial_Escrituracao_Fiscal_EFD_ICMS_IPI_Distrito_Federal_-v_1_9_24_05_2023.pdf

[^31]: https://orientacaotributaria.economia.go.gov.br/spo-web/perguntasfrequentes/perguntafrequente/20801

[^32]: https://www.abc.gov.br/Content/ABC/docs/PRJCTI.pdf

[^33]: https://docs.inventsoftware.info/TaxOne/RelatoriosMagneticos/DAPIMG/DetalhamentoCFOPOperacao.html

[^34]: https://sped.fazenda.pr.gov.br/sites/sped/arquivos_restritos/files/documento/2022-09/TABELA_5_2_COMPLETA.pdf

[^35]: https://www.pwc.com.br/pt/estudos/guia-demonstracoes-financeiras/2025/ABC-Aberta-IFRS-2024.pdf

[^36]: https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=9871

[^37]: ftp://ftp.sefaz.go.gov.br/sefazgo/Codigos de ajustes da EFD de Goias.pdf

[^38]: http://sped.rfb.gov.br/estatico/28/40FAAC1C636CC110D4C12D2790B43C641C6BCA/Manual da EFD-Reinf versão 2.1.2.1.pdf

[^39]: http://sped.rfb.gov.br/item/show/1932

[^40]: https://www.pwc.com.br/pt/estudos/guia-demonstracoes-financeiras/2024/ABC-Aberta-IFRS-2023.pdf

[^41]: https://portalsped.fazenda.mg.gov.br/spedmg/export/sites/spedmg/efd/downloads/Resumo-Leiaute-EFD-v.3.1.4-e-Portaria-SAIF-38.2023.xlsx

[^42]: http://sped.rfb.gov.br/item/show/1578

[^43]: https://cfc.org.br/wp-content/uploads/2018/04/LRF_volume_03.pdf

[^44]: https://ajuda.sankhya.com.br/hc/pt-br/articles/360044028994-Como-configurar-e-gerar-o-Registro-E115-no-EFD-Fiscal

[^45]: https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=6106

[^46]: https://www.fazenda.mg.gov.br/governo/contadoria_geral/legislacao/tipolegisl/mdf05.pdf

[^47]: https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=7627

[^48]: https://contabilidade.ro.gov.br/wp-content/uploads/2017/07/MDF-9a-Edicao.pdf

[^49]: https://portal.fazenda.rj.gov.br/efd/wp-content/uploads/sites/32/2023/09/Manual_EFD.pdf

[^50]: http://app1.sefaz.mt.gov.br/Sistema/legislacao/respostaconsulta.nsf/5540d90afcacd4f204257057004b655c/3c0032e576341e7403258c3800488f93?OpenDocument

[^51]: https://cnm.org.br/storage/noticias/2024/Links/MCASP - 11ª Edição.pdf

[^52]: http://ajudaonline.ebs.com.br/sgc/registro_e115.htm

[^53]: https://goias.gov.br/industriaecomercio/fomentar/

[^54]: http://sped.rfb.gov.br/arquivo/download/3041

[^55]: https://ajuda.wk.com.br/714/ef/MTFiscal/Relatórios/Apurações/ICMS/Botão_E115/Bot%C3%A3o_E115.htm

[^56]: https://www.gov.br/esporte/pt-br/acesso-a-informacao/assessoria-de-participacao-social-e-diversidade

[^57]: https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/82c12e7298de89fa96a3c07e35949ee2/f3df433c-8d70-4408-9f7b-6644ba3836bf/7029ed78.csv

