import { aggregate, toCsvRaw, toCsvSummary, ITEMS } from './lib/aggregate.js';

let currentResponses = [];
let currentAgg = null;
let fullAgg = null;

const fmt = (v, digits = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(digits));
const pct = (v) => (v === null ? '—' : `${Number(v).toFixed(1)}%`);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

function download(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

async function load() {
  const status = document.getElementById('status');
  status.textContent = 'Carregando respostas…';
  try {
    const res = await fetch('/api/responses');
    if (!res.ok) throw new Error('Falha ao carregar respostas.');
    const data = await res.json();
    currentResponses = data.responses || [];
    fullAgg = aggregate(currentResponses);
    applyFilter();
    document.getElementById('content').hidden = false;
    status.textContent = `Total de respostas registradas: ${fullAgg.total}.`;
  } catch (err) {
    status.textContent = `Erro: ${err.message}`;
  }
}

function applyFilter() {
  const filter = document.getElementById('ecvFilter')?.value || 'all';
  if (filter === 'all') currentAgg = fullAgg;
  else currentAgg = aggregate(currentResponses.filter((r) => (r.ecv || 'nao-identificada') === filter));
  render();
}

function render() {
  const agg = currentAgg;
  const full = fullAgg || agg;
  const byEcvRows = Object.entries(full.byEcv || {}).map(([ecv, sub]) => {
    const dims = sub.dimensions.map((d) => `${d.dim}: ${fmt(d.mean)} (n=${d.n})`).join(' · ');
    return `<tr><td>ECV ${ecv}</td><td class="num">${sub.total}</td><td>${dims}</td><td class="num">${fmt(sub.D1.mean)}</td><td class="num">${fmt(sub.D3.mean)}</td></tr>`;
  }).join('');
  document.getElementById('byEcv').innerHTML =
    `<table><tr><th>Unidade</th><th class="num">n</th><th>Dimensões (média)</th><th class="num">D1 Satisfação</th><th class="num">D3 Preço justo</th></tr>${byEcvRows || '<tr><td colspan="5">Nenhuma resposta ainda.</td></tr>'}</table>`;
  document.getElementById('sample').innerHTML =
    `<strong>n = ${agg.total}</strong> respostas · Primeira: ${fmtDate(agg.firstAt)} · Última: ${fmtDate(agg.lastAt)}`;

  const a = agg.sectionA;
  const pctOf = (n) => (agg.total ? ((n / agg.total) * 100).toFixed(1) : '0.0');
  document.getElementById('sectionA').innerHTML = `
    <table><tr><th>Motivo (A1)</th><th class="num">n</th><th class="num">%</th></tr>
    <tr><td>Transferência de propriedade</td><td class="num">${a.motivo.transferencia}</td><td class="num">${pctOf(a.motivo.transferencia)}%</td></tr>
    <tr><td>Mudança de município</td><td class="num">${a.motivo.mudanca_municipio}</td><td class="num">${pctOf(a.motivo.mudanca_municipio)}%</td></tr>
    <tr><td>Alteração de dados do veículo</td><td class="num">${a.motivo.alteracao_dados}</td><td class="num">${pctOf(a.motivo.alteracao_dados)}%</td></tr>
    <tr><td>Regularização</td><td class="num">${a.motivo.regularizacao}</td><td class="num">${pctOf(a.motivo.regularizacao)}%</td></tr>
    <tr><td>Outro</td><td class="num">${a.motivo.outro}</td><td class="num">${pctOf(a.motivo.outro)}%</td></tr></table>
    <p>Mora em Boa Esperança: <strong>${a.mora_boa_esperanca.sim}</strong> sim / ${a.mora_boa_esperanca.nao} não. Já fez vistoria no modelo antigo: <strong>${a.fez_modelo_antigo.sim}</strong> sim / ${a.fez_modelo_antigo.nao} não.</p>`;

  document.getElementById('dimensions').innerHTML = agg.dimensions.map((d) => `
    <p><strong>${d.dim}</strong> — média ${fmt(d.mean)} · DP ${fmt(d.sd)} · n válido ${d.n} · % de escores ≥ 4: ${pct(d.pct45)}</p>
    <div class="bar"><div style="width:${d.mean ? (d.mean / 5) * 100 : 0}%"></div></div>`).join('');

  const rows = Object.keys(ITEMS).map((key) => {
    const s = agg.items[key];
    return `<tr><td>${key}</td><td>${s.dim}</td><td>${s.text}</td><td class="num">${s.n}</td><td class="num">${s.nsna}</td><td class="num">${fmt(s.mean)}</td><td class="num">${fmt(s.sd)}</td><td class="num">${pct(s.pct45)}</td><td class="num">${s.dist[1]} / ${s.dist[2]} / ${s.dist[3]} / ${s.dist[4]} / ${s.dist[5]}</td></tr>`;
  }).join('');
  document.getElementById('itemsTable').innerHTML =
    `<table><tr><th>Item</th><th>Dimensão</th><th>Afirmação</th><th class="num">n válido</th><th class="num">NS/NA</th><th class="num">Média</th><th class="num">DP</th><th class="num">% 4–5</th><th class="num">Distribuição 1–5</th></tr>${rows}</table>`;

  const cp = (key) => {
    const s = agg.items[key];
    return `<p><strong>${key} — ${s.text}</strong>: média ${fmt(s.mean)} · n válido ${s.n} · NS/NA ${s.nsna} · melhor/muito melhor (4–5): ${pct(agg.comparison.pctMelhor(key))}</p>`;
  };
  document.getElementById('comparison').innerHTML = cp('CP1') + cp('CP4');

  document.getElementById('general').innerHTML =
    `<p><strong>D1 — Satisfação geral:</strong> média ${fmt(agg.items.D1.mean)} · n válido ${agg.items.D1.n} · % 4–5: ${pct(agg.items.D1.pct45)}</p>
     <p><strong>D3 — Preço justo:</strong> média ${fmt(agg.items.D3.mean)} · n válido ${agg.items.D3.n} · % 4–5: ${pct(agg.items.D3.pct45)}</p>`;
}

function tccText() {
  const agg = currentAgg;
  const lines = [];
  lines.push('## Resultados da pesquisa de campo — ECVs de Boa Esperança (MG)');
  if (fullAgg && fullAgg.byEcv) {
    lines.push('');
    lines.push('### Amostra por ECV');
    lines.push('');
    lines.push('| Unidade | n | D1 Satisfação (média) | D3 Preço justo (média) |');
    lines.push('|---|---:|---:|---:|');
    for (const [ecv, sub] of Object.entries(fullAgg.byEcv)) {
      lines.push(`| ECV ${ecv} | ${sub.total} | ${fmt(sub.D1.mean)} | ${fmt(sub.D3.mean)} |`);
    }
  }
  lines.push('');
  lines.push(`Amostra: n = ${agg.total} respostas anônimas e voluntárias. Período: ${fmtDate(agg.firstAt)} a ${fmtDate(agg.lastAt)}.`);
  lines.push('Instrumento: SERVQUAL, versão percepção (SERVPERF), escala de 1 a 5, com opção NS/NA. NS/NA foi excluído das médias e contado à parte.');
  lines.push('Escore da dimensão: média dos escores individuais, sendo o escore individual a média dos itens válidos da dimensão naquele respondente.');
  lines.push('');
  lines.push('### Tabela 1 — Dimensões SERVQUAL');
  lines.push('');
  lines.push('| Dimensão | n válido | Média | Desvio-padrão | % de escores ≥ 4 |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const d of agg.dimensions) lines.push(`| ${d.dim} | ${d.n} | ${fmt(d.mean)} | ${fmt(d.sd)} | ${pct(d.pct45)} |`);
  lines.push('');
  lines.push('### Tabela 2 — Itens');
  lines.push('');
  lines.push('| Item | Dimensão | n válido | NS/NA | Média | Desvio-padrão | % 4–5 |');
  lines.push('|---|---|---:|---:|---:|---:|---:|');
  for (const key of Object.keys(ITEMS)) {
    const s = agg.items[key];
    lines.push(`| ${key} | ${s.dim} | ${s.n} | ${s.nsna} | ${fmt(s.mean)} | ${fmt(s.sd)} | ${pct(s.pct45)} |`);
  }
  lines.push('');
  lines.push('### Comparação com o modelo antigo (somente quem fez vistoria no modelo antigo)');
  lines.push('');
  lines.push(`- CP1 (prazo): média ${fmt(agg.items.CP1.mean)}, n válido ${agg.items.CP1.n}, melhor/muito melhor: ${pct(agg.comparison.pctMelhor('CP1'))}.`);
  lines.push(`- CP4 (qualidade geral): média ${fmt(agg.items.CP4.mean)}, n válido ${agg.items.CP4.n}, melhor/muito melhor: ${pct(agg.comparison.pctMelhor('CP4'))}.`);
  lines.push('');
  lines.push('### Avaliação geral');
  lines.push('');
  lines.push(`- D1 (satisfação): média ${fmt(agg.items.D1.mean)}, n válido ${agg.items.D1.n}, % 4–5: ${pct(agg.items.D1.pct45)}.`);
  lines.push(`- D3 (preço justo): média ${fmt(agg.items.D3.mean)}, n válido ${agg.items.D3.n}, % 4–5: ${pct(agg.items.D3.pct45)}.`);
  lines.push('');
  lines.push('Limitação: amostra local, por adesão voluntária, na ECV de Boa Esperança (MG). Os resultados não devem ser generalizados para todo o estado sem essa ressalva.');
  return lines.join('\n');
}

document.getElementById('reloadBtn').addEventListener('click', load);
document.getElementById('ecvFilter').addEventListener('change', applyFilter);
document.getElementById('csvRawBtn').addEventListener('click', () => download('respostas-brutas-servqual.csv', toCsvRaw(currentResponses)));
document.getElementById('csvSumBtn').addEventListener('click', () => download('resumo-servqual.csv', toCsvSummary(currentAgg)));
document.getElementById('jsonBtn').addEventListener('click', () => download('respostas-servqual.json', JSON.stringify(currentResponses, null, 2), 'application/json'));
document.getElementById('tccBtn').addEventListener('click', async () => {
  const text = tccText();
  try { await navigator.clipboard.writeText(text); alert('Texto copiado. Cole no seu trabalho e revise os números antes da entrega.'); }
  catch { download('texto-tcc-servqual.md', text, 'text/markdown'); }
});
document.getElementById('resetBtn').addEventListener('click', async () => {
  const key = document.getElementById('adminKey').value;
  const msg = document.getElementById('resetMsg');
  if (!confirm('Apagar TODAS as respostas? Esta ação não pode ser desfeita.')) return;
  const res = await fetch('/api/responses', { method: 'DELETE', headers: { 'x-admin-key': key } });
  if (!res.ok) { msg.textContent = 'Chave inválida ou erro ao apagar.'; return; }
  msg.textContent = ''; load();
});

load();
