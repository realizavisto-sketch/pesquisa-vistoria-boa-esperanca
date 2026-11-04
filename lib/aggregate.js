// Agregação SERVQUAL / SERVPERF — usada pelo painel e pelos testes.
// Regras metodológicas (documentadas no painel e no README):
// - NS/NA (null) é excluído do cálculo de médias, mas contado à parte.
// - Média de um item = média dos valores 1-5 válidos daquele item.
// - Escore de uma dimensão por respondente = média dos itens válidos
//   da dimensão naquele respondente. O escore da dimensão no conjunto
//   é a média desses escores individuais (não a média simples das
//   médias dos itens, que pesaria itens com n diferente de forma distinta).
// - Desvio-padrão amostral (n-1). Se n < 2, DP = null.
// - % 4-5 = proporção de respostas 4 ou 5 entre as válidas.

export const ITEMS = {
  T1: { dim: 'Tangibilidade', text: 'As instalações da ECV são modernas, limpas e confortáveis.' },
  T2: { dim: 'Tangibilidade', text: 'A área de vistoria é coberta e adequada ao atendimento.' },
  T4: { dim: 'Tangibilidade', text: 'As informações escritas (avisos, placas e laudo) são claras e de fácil leitura.' },
  C1: { dim: 'Confiabilidade', text: 'O atendimento foi realizado no prazo / horário informado.' },
  C2: { dim: 'Confiabilidade', text: 'O laudo foi entregue sem erros que exigissem correção.' },
  C3: { dim: 'Confiabilidade', text: 'O valor cobrado foi o mesmo informado antes da vistoria.' },
  R1: { dim: 'Responsividade', text: 'O agendamento foi fácil de conseguir.' },
  R2: { dim: 'Responsividade', text: 'O tempo de espera até o início da vistoria foi aceitável.' },
  R3: { dim: 'Responsividade', text: 'Os funcionários estavam dispostos a ajudar e a responder dúvidas.' },
  S1: { dim: 'Segurança', text: 'Os vistoriadores demonstraram conhecimento técnico sobre o serviço.' },
  S2: { dim: 'Segurança', text: 'O atendimento transmitiu confiança e segurança.' },
  S4: { dim: 'Segurança', text: 'Senti segurança quanto ao uso das minhas informações e ao pagamento.' },
  E1: { dim: 'Empatia', text: 'O atendimento foi atencioso com a minha situação.' },
  E2: { dim: 'Empatia', text: 'O horário de atendimento foi conveniente para mim.' },
  E3: { dim: 'Empatia', text: 'Os funcionários explicaram o resultado da vistoria de forma compreensível.' },
  CP1: { dim: 'Comparação com o modelo antigo', text: 'Prazo para conseguir a vistoria.' },
  CP4: { dim: 'Comparação com o modelo antigo', text: 'Qualidade geral do atendimento.' },
  CP5: { dim: 'Comparação com o modelo antigo', text: 'Facilidade de acesso e agendamento (proximidade, horários, conseguir vaga).' },
  CP6: { dim: 'Comparação com o modelo antigo', text: 'Rapidez do atendimento no dia (tempo de espera e duração da vistoria).' },
  D1: { dim: 'Avaliação geral', text: 'Estou satisfeito(a) com o atendimento recebido hoje.' },
  D3: { dim: 'Avaliação geral', text: 'O valor total cobrado é justo pelo serviço recebido.' },
};

export const DIMENSIONS = ['Tangibilidade', 'Confiabilidade', 'Responsividade', 'Segurança', 'Empatia'];

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sd(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  const variance = values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function itemStats(responses, key) {
  const valid = responses.map((r) => r[key]).filter((v) => Number.isInteger(v) && v >= 1 && v <= 5);
  const nsna = responses.filter((r) => r[key] === null).length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  valid.forEach((v) => { dist[v] += 1; });
  return {
    key,
    dim: ITEMS[key].dim,
    text: ITEMS[key].text,
    n: valid.length,
    nsna,
    mean: mean(valid),
    sd: sd(valid),
    pct45: valid.length ? (valid.filter((v) => v >= 4).length / valid.length) * 100 : null,
    dist,
  };
}

export function aggregate(responses) {
  const total = responses.length;
  const items = {};
  for (const key of Object.keys(ITEMS)) items[key] = itemStats(responses, key);

  const dimensions = DIMENSIONS.map((dim) => {
    const keys = Object.keys(ITEMS).filter((k) => ITEMS[k].dim === dim);
    const perRespondent = responses
      .map((r) => {
        const vals = keys.map((k) => r[k]).filter((v) => Number.isInteger(v));
        return vals.length ? mean(vals) : null;
      })
      .filter((v) => v !== null);
    return {
      dim,
      n: perRespondent.length,
      mean: mean(perRespondent),
      sd: sd(perRespondent),
      pct45: perRespondent.length ? (perRespondent.filter((v) => v >= 4).length / perRespondent.length) * 100 : null,
    };
  });

  const count = (field, value) => responses.filter((r) => r[field] === value).length;
  const sectionA = {
    motivo: {
      transferencia: count('A1', 'transferencia'),
      mudanca_municipio: count('A1', 'mudanca_municipio'),
      alteracao_dados: count('A1', 'alteracao_dados'),
      regularizacao: count('A1', 'regularizacao'),
      outro: count('A1', 'outro'),
    },
    mora_boa_esperanca: { sim: count('A2', 'sim'), nao: count('A2', 'nao') },
    fez_modelo_antigo: { sim: count('A3', 'sim'), nao: count('A3', 'nao') },
  };

  const timestamps = responses.map((r) => r.createdAt).filter(Boolean).sort();
  const byEcv = {};
  for (const ecv of ['1', '2', '3', '4', 'nao-identificada']) {
    const subset = responses.filter((r) => (r.ecv || 'nao-identificada') === ecv);
    if (!subset.length) continue;
    const sub = aggregateSubset(subset);
    byEcv[ecv] = sub;
  }
  // Função auxiliar definida abaixo via closure: calculada de forma
  // independente para evitar recursão infinita em byEcv.
  function aggregateSubset(subset) {
    const dims = DIMENSIONS.map((dim) => {
      const keys = Object.keys(ITEMS).filter((k) => ITEMS[k].dim === dim);
      const per = subset.map((r) => {
        const vals = keys.map((k) => r[k]).filter((v) => Number.isInteger(v));
        return vals.length ? mean(vals) : null;
      }).filter((v) => v !== null);
      return { dim, n: per.length, mean: mean(per), sd: sd(per) };
    });
    return { total: subset.length, dimensions: dims, D1: itemStats(subset, 'D1'), D3: itemStats(subset, 'D3') };
  }
  return {
    total,
    firstAt: timestamps[0] || null,
    lastAt: timestamps[timestamps.length - 1] || null,
    items,
    dimensions,
    byEcv,
    sectionA,
    comparison: {
      CP1: items.CP1,
      CP4: items.CP4,
      CP5: items.CP5,
      CP6: items.CP6,
      pctMelhor: (key) => {
        const s = items[key];
        return s.n ? ((s.dist[4] + s.dist[5]) / s.n) * 100 : null;
      },
    },
  };
}

export function toCsvRaw(responses) {
  const cols = ['id', 'createdAt', 'ecv', 'A1', 'A2', 'A3', ...Object.keys(ITEMS)];
  const esc = (v) => (v === null || v === undefined ? '' : String(v).replace(/"/g, '""'));
  const lines = [cols.join(',')];
  for (const r of responses) {
    lines.push(cols.map((c) => `"${esc(r[c])}"`).join(','));
  }
  return lines.join('\n');
}

export function toCsvSummary(agg) {
  const lines = ['item,dimensao,n_valido,ns_na,media,desvio_padrao,pct_4_5,n1,n2,n3,n4,n5'];
  for (const key of Object.keys(ITEMS)) {
    const s = agg.items[key];
    lines.push([
      key,
      `"${s.dim}"`,
      s.n,
      s.nsna,
      s.mean === null ? '' : s.mean.toFixed(2),
      s.sd === null ? '' : s.sd.toFixed(2),
      s.pct45 === null ? '' : s.pct45.toFixed(1),
      s.dist[1], s.dist[2], s.dist[3], s.dist[4], s.dist[5],
    ].join(','));
  }
  return lines.join('\n');
}
