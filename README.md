# Pesquisa de campo — Vistoria veicular em Boa Esperança (MG)

Ferramenta para aplicar, via QR Code, o questionário de pesquisa de campo do TCC sobre a terceirização das vistorias de identificação veicular em Minas Gerais, e organizar os resultados de forma pronta para uso no trabalho.

## O que a ferramenta faz

- **Questionário (`/`)**: versão digital fiel ao questionário SERVQUAL, versão percepção (SERVPERF), enviado para o TCC. Anônimo e voluntário: não coleta nome, CPF, placa, telefone ou e-mail. Cada resposta é marcada com a ECV de Boa Esperança (1, 2, 3 ou 4) — por QR Code específico da unidade ou por seleção no início do formulário.
- **QR Codes (`/qr.html`)**: gera automaticamente 4 QR Codes, um por ECV, cada um abrindo o questionário com a unidade já selecionada e travada. As páginas dos QR Codes mostram apenas o código ECV 1–4, sem o nome da empresa; a primeira página é uma folha do pesquisador (não fixar) com o mapeamento: ECV 1 = Realiza Vistoria LTDA, ECV 2 = WR Vistorias LTDA, ECV 3 = BOA ESPERANÇA Vistoria LTDA, ECV 4 = Triângulo Vistorias LTDA. No questionário e no painel, o nome da empresa aparece.
- **Painel do pesquisador (`/resultados.html`)**: agrega as respostas em tempo real e entrega (a quebra por ECV no painel serve apenas para controle da coleta; os resultados para o TCC são considerados como um todo, sem comparação entre empresas):
  - total de respostas (n) e período da coleta;
  - perfil da Seção A (motivo, mora em Boa Esperança, modelo antigo);
  - médias, desvios-padrão e % de respostas 4–5 por dimensão SERVQUAL e por item;
  - comparação com o modelo antigo (Seção C) e avaliação geral (Seção D);
  - exportações em CSV bruto, CSV resumo, JSON e texto pronto para o TCC (tabelas em Markdown).
- **API (`/api/responses`)**: recebe, lista e (com chave do pesquisador) apaga respostas. Cada resposta é um arquivo próprio no Vercel Blob público do projeto v2 (`responses/<id>.json`), não no navegador do respondente. As respostas são anônimas (sem nome, CPF, placa ou contato) e a própria API já as lista no painel do pesquisador, então o blob público não expõe nenhum dado pessoal a mais. A primeira versão usava um store privado e um arquivo único, o que rejeitava o envio e perdia respostas — não usar a URL v1.

## Regras metodológicas aplicadas

- Escala de 1 a 5; NS/NA é registrado como nulo, excluído das médias e contado à parte.
- Escore de uma dimensão por respondente = média dos itens válidos da dimensão naquele respondente. O escore da dimensão no conjunto é a média desses escores individuais.
- Seção C só é apresentada e exigida para quem marcou SIM em A3 (já fez vistoria no modelo antigo). Quem marcou NÃO pula a Seção C.
- A API rejeita campos extras e qualquer tentativa de envio de dados pessoais pelo formulário.

## Itens do questionário

- **A1**: motivo — transferência, mudança de município, alteração de dados, regularização, outro.
- **A2**: mora em Boa Esperança? **A3**: já fez vistoria no modelo antigo?
- **B1 Tangibilidade**: T1, T2, T4. **B2 Confiabilidade**: C1, C2, C3. **B3 Responsividade**: R1, R2, R3. **B4 Segurança**: S1, S2, S4. **B5 Empatia**: E1, E2, E3.
- **C**: CP1 (prazo), CP5 (acesso/agendamento), CP6 (rapidez no dia) e CP4 (qualidade geral), escala de muito pior a muito melhor que o modelo antigo. CP1 e CP4 são os itens originais; CP5 e CP6 foram acrescentados pelo autor para ampliar a comparação, mantendo a redação e a escala dos originais — registrar essa ampliação na metodologia do TCC.
- **D**: D1 (satisfação) e D3 (preço justo).

## Como usar na coleta

1. Acesse `/qr.html` no endereço de produção, imprima e fixe o QR Code no local de atendimento.
2. Informe que a participação é anônima, voluntária e apenas para fins acadêmicos.
3. Acompanhe o total de respostas em `/resultados.html`.
4. Ao encerrar a coleta, baixe o CSV bruto (para anexar/arquivar) e o texto pronto para o TCC (para colar e revisar).
5. No TCC, reporte sempre o n total e o n válido de cada item/dimensão, o período da coleta e a limitação de amostra local por adesão voluntária. Não generalize para todo o estado sem essa ressalva.

## Desenvolvimento local e testes

```bash
npm install
npm test
```

Os testes (`test/aggregate.test.mjs`) cobrem validação do questionário (itens obrigatórios, NS/NA, Seção C condicional) e agregação (exclusão de NS/NA, médias de itens e de dimensões, contagens da Seção C).

Para testar a API completa é necessário um Vercel Blob: em produção, o Blob é conectado ao projeto e a variável `BLOB_READ_WRITE_TOKEN` é gerada automaticamente pela Vercel. Sem ela, a API retorna erro — o que é intencional, para não perder respostas em um armazenamento improvisado.

## Variáveis de ambiente (produção)

- `BLOB_READ_WRITE_TOKEN`: gerada pela Vercel ao conectar o Blob Store ao projeto.
- `ADMIN_KEY`: chave do pesquisador para apagar todas as respostas no painel. Defina um valor forte no projeto da Vercel e não o coloque no código. Sem essa variável, o botão de apagar é recusado.

## Estrutura

```
index.html        Questionário
qr.html           Página do QR Code (imprimível)
resultados.html   Painel do pesquisador
form.js           Renderização e envio do questionário
dashboard.js      Painel, gráficos, exportações e texto para o TCC
styles.css        Estilo mobile-first
api/responses.js  API de respostas (GET / POST / DELETE com chave)
lib/aggregate.js  Agregação SERVQUAL (usada pelo painel e pelos testes)
lib/validate.js   Validação estrita do questionário (usada pela API e pelos testes)
test/aggregate.test.mjs  Testes automatizados
```

## Ética da pesquisa

O questionário reproduz o termo do instrumento original: participação anônima e voluntária, possibilidade de parar a qualquer momento, uso apenas para fins acadêmicos e de forma agregada. Nenhuma resposta individual identificável deve ser publicada no TCC.
