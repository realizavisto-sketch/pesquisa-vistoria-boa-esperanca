// Validação estrita do questionário — usada pela API e pelos testes.
// Nenhum dado pessoal é aceito: o formulário não coleta nome, CPF,
// placa, telefone ou e-mail, e qualquer campo extra é rejeitado.

export const ITEM_KEYS = [
  'T1', 'T2', 'T4', 'C1', 'C2', 'C3', 'R1', 'R2', 'R3',
  'S1', 'S2', 'S4', 'E1', 'E2', 'E3', 'CP1', 'CP4', 'D1', 'D3',
];

const A1_VALUES = ['transferencia', 'mudanca_municipio', 'alteracao_dados', 'regularizacao', 'outro'];

function isScore(v) {
  return v === null || (Number.isInteger(v) && v >= 1 && v <= 5);
}

export function validateResponse(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['Corpo da resposta inválido.'];

  const allowed = new Set(['A1', 'A2', 'A3', ...ITEM_KEYS]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) errors.push(`Campo não permitido: ${key}.`);
  }

  if (!A1_VALUES.includes(body.A1)) errors.push('A1 (motivo da vistoria) é obrigatório.');
  if (!['sim', 'nao'].includes(body.A2)) errors.push('A2 (mora em Boa Esperança?) é obrigatório.');
  if (!['sim', 'nao'].includes(body.A3)) errors.push('A3 (já fez vistoria no modelo antigo?) é obrigatório.');

  // Seção B e D: sempre obrigatórias (1-5 ou NS/NA = null).
  const requiredAlways = ['T1', 'T2', 'T4', 'C1', 'C2', 'C3', 'R1', 'R2', 'R3', 'S1', 'S2', 'S4', 'E1', 'E2', 'E3', 'D1', 'D3'];
  for (const key of requiredAlways) {
    if (!(key in body)) errors.push(`${key} é obrigatório.`);
    else if (!isScore(body[key])) errors.push(`${key} deve ser de 1 a 5 ou NS/NA.`);
  }

  // Seção C: somente para quem fez o modelo antigo.
  if (body.A3 === 'sim') {
    for (const key of ['CP1', 'CP4']) {
      if (!(key in body)) errors.push(`${key} é obrigatório para quem fez o modelo antigo.`);
      else if (!isScore(body[key])) errors.push(`${key} deve ser de 1 a 5 ou NS/NA.`);
    }
  } else if (body.A3 === 'nao') {
    for (const key of ['CP1', 'CP4']) {
      if (key in body && body[key] !== null) errors.push(`${key} só deve ser respondido por quem fez o modelo antigo.`);
    }
  }

  return errors;
}

export function sanitizeResponse(body) {
  const out = { A1: body.A1, A2: body.A2, A3: body.A3 };
  for (const key of ITEM_KEYS) out[key] = key in body ? body[key] : null;
  if (body.A3 === 'nao') { out.CP1 = null; out.CP4 = null; }
  return out;
}
