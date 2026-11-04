import { ITEMS } from './lib/aggregate.js';

const A1_OPTIONS = [
  ['transferencia', 'Transferência de propriedade'],
  ['mudanca_municipio', 'Mudança de município'],
  ['alteracao_dados', 'Alteração de dados do veículo'],
  ['regularizacao', 'Regularização'],
  ['outro', 'Outro'],
];

const GROUPS_B = [
  ['B1. Tangibilidade — instalações, equipamentos e materiais', ['T1', 'T2', 'T4']],
  ['B2. Confiabilidade — cumprir o prometido, com precisão', ['C1', 'C2', 'C3']],
  ['B3. Responsividade — rapidez e disposição para ajudar', ['R1', 'R2', 'R3']],
  ['B4. Segurança — confiança, conhecimento e cortesia', ['S1', 'S2', 'S4']],
  ['B5. Empatia — atenção individual e comunicação', ['E1', 'E2', 'E3']],
];

function radioGroup(key, labels) {
  const div = document.createElement('div');
  div.className = 'q';
  const p = document.createElement('p');
  p.textContent = `${key}. ${ITEMS[key].text}`;
  div.appendChild(p);
  const opts = document.createElement('div');
  opts.className = 'opts';
  for (const [value, label] of labels) {
    const lab = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = key; input.value = value; input.required = true;
    lab.append(input, document.createTextNode(` ${label}`));
    opts.appendChild(lab);
  }
  div.appendChild(opts);
  return div;
}

const scaleB = [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['nsna', 'NS / NA']];
const scaleC = [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['nsna', 'NS / NA']];

const ECV_NAMES = {
  '1': 'Realiza Vistoria LTDA',
  '2': 'WR Vistorias LTDA',
  '3': 'BOA ESPERANÇA Vistoria LTDA',
  '4': 'Triângulo Vistorias LTDA',
};
const ecvParam = new URLSearchParams(window.location.search).get('ecv');
const ecvEl = document.getElementById('ecvopts');
for (const v of ['1', '2', '3', '4']) {
  const lab = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'radio'; input.name = 'ecv'; input.value = v; input.required = true;
  if (ecvParam === v) input.checked = true;
  lab.append(input, document.createTextNode(` ${ECV_NAMES[v]}`));
  ecvEl.appendChild(lab);
}
if (ecvParam && ['1', '2', '3', '4'].includes(ecvParam)) {
  document.getElementById('ecvNote').textContent = `Você está respondendo sobre a ${ECV_NAMES[ecvParam]}, em Boa Esperança (MG), conforme o QR Code da unidade.`;
  ecvEl.querySelectorAll('input').forEach((i) => { i.disabled = i.value !== ecvParam; });
}

const a1 = document.getElementById('a1opts');
for (const [value, label] of A1_OPTIONS) {
  const lab = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'radio'; input.name = 'A1'; input.value = value; input.required = true;
  lab.append(input, document.createTextNode(` ${label}`));
  a1.appendChild(lab);
}

const sectionB = document.getElementById('sectionB');
for (const [title, keys] of GROUPS_B) {
  const h = document.createElement('h3'); h.textContent = title; sectionB.appendChild(h);
  for (const key of keys) sectionB.appendChild(radioGroup(key, scaleB));
}

const sectionCItems = document.getElementById('sectionCItems');
for (const key of ['CP1', 'CP4']) sectionCItems.appendChild(radioGroup(key, scaleC));

const sectionD = document.getElementById('sectionD');
for (const key of ['D1', 'D3']) sectionD.appendChild(radioGroup(key, scaleB));

const form = document.getElementById('survey');
const sectionC = document.getElementById('sectionC');
const errorEl = document.getElementById('formError');

function updateCVisibility() {
  const a3 = form.querySelector('input[name="A3"]:checked')?.value;
  const show = a3 === 'sim';
  sectionC.hidden = !show;
  for (const key of ['CP1', 'CP4']) {
    form.querySelectorAll(`input[name="${key}"]`).forEach((i) => { i.required = show; if (!show) i.checked = false; });
  }
}
form.addEventListener('change', (e) => { if (e.target.name === 'A3') updateCVisibility(); });

function getValue(name) {
  const checked = form.querySelector(`input[name="${name}"]:checked`);
  if (!checked) return undefined;
  return checked.value === 'nsna' ? null : checked.value;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const payload = {
      ecv: getValue('ecv'),
      A1: getValue('A1'),
      A2: getValue('A2'),
      A3: getValue('A3'),
    };
    const keys = ['T1', 'T2', 'T4', 'C1', 'C2', 'C3', 'R1', 'R2', 'R3', 'S1', 'S2', 'S4', 'E1', 'E2', 'E3', 'D1', 'D3'];
    if (payload.A3 === 'sim') keys.push('CP1', 'CP4');
    const missing = [];
    if (!payload.ecv) missing.push('ECV');
    if (!payload.A1) missing.push('A1');
    if (!payload.A2) missing.push('A2');
    if (!payload.A3) missing.push('A3');
    for (const key of keys) {
      const v = getValue(key);
      if (v === undefined) missing.push(key);
      else payload[key] = v === null ? null : parseInt(v, 10);
    }
    if (missing.length) throw new Error(`Faltam respostas: ${missing.join(', ')}. Marque 1 a 5 ou NS/NA em cada item.`);
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errors ? data.errors.join(' ') : (data.error || 'Não foi possível enviar. Tente novamente.'));
    form.hidden = true;
    document.getElementById('thanks').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    errorEl.textContent = err.message;
    btn.disabled = false; btn.textContent = 'Enviar resposta anônima';
  }
});

document.getElementById('againBtn').addEventListener('click', () => {
  form.reset(); updateCVisibility();
  form.hidden = false; document.getElementById('thanks').hidden = true;
});
