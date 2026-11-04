// Validação estrita do questionário — usada pela API e pelos testes.
// Nenhum dado pessoal é aceito: o formulário não coleta nome, CPF,
// placa, telefone ou e-mail, e qualquer campo extra é rejeitado.

export const ITEM_KEYS = [
  'T1', 'T2', 'T4', 'C1', 'C2', 'C3', 'R1', 'R2', 'R3',
  'S1', 'S2', 'S4', 'E1', 'E2', 'E3', 'CP1', 'CP4', 'D1', 'D3',
];

// Unidades de Boa Esperança (MG) — códigos neutros, sem nome de empresa
// no código. O pesquisador mapeia ECV 1-4 para as empresas reais em
// suas anotações privadas, e o TCC pode apresentar os resultados por
// código, sem identificar a empresa, salvo autorização expressa.
export const ECV_VALUES = ['1', '2', '3', '4'];

// Nomes das empresas de Boa Esperança (MG), na ordem informada pelo
// usuário. O nome aparece no questionário e no painel do pesquisador,
// mas NÃO na página impressa do QR Code (lá só vai o código ECV 1-4,
// com uma folha do pesquisador, fora do cartaz, para identificar a
// empresa de cada QR).
export const ECV_NAMES = {
  '1': 'Realiza Vistoria LTDA',
  '2': 'WR Vistorias LTDA',
  '3': 'BOA ESPERANÇA Vistoria LTDA',
  '4': 'Triângulo Vistorias LTDA',
};

const A1_VALUES = ['transferencia', 'mudanca_municipio', 'alteracao_dados', 'regularizacao', 'outro'];

function isScore(v) {
  return v === null || (Number.isInteger(v) && v >= 1 && v <= 5);
}

export function validateResponse(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['Corpo da resposta inválido.'];

  const allowed = new Set(['ecv', 'A1', 'A2', 'A3', ...ITEM_KEYS]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) errors.push(`Campo não permitido: ${key}.`);
  }

  if (!ECV_VALUES.includes(body.ecv)) errors.push('ecv (unidade de Boa Esperança: 1, 2, 3 ou 4) é obrigatório.');
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
  const out = { ecv: body.ecv, A1: body.A1, A2: body.A2, A3: body.A3 };
  for (const key of ITEM_KEYS) out[key] = key in body ? body[key] : null;
  if (body.A3 === 'nao') { out.CP1 = null; out.CP4 = null; }
  return out;
}
