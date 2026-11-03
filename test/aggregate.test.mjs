import assert from 'node:assert';
import { aggregate, toCsvRaw } from '../lib/aggregate.js';
import { validateResponse, sanitizeResponse } from '../lib/validate.js';

const base = (over = {}) => ({
  A1: 'transferencia', A2: 'sim', A3: 'sim',
  T1: 5, T2: 4, T4: null, C1: 5, C2: 5, C3: 4, R1: 3, R2: 4, R3: 5,
  S1: 5, S2: 5, S4: 4, E1: 5, E2: 4, E3: 5, CP1: 5, CP4: 4, D1: 5, D3: 3,
  ...over,
});

// Validação: resposta completa passa; falta de item reprova; CP indevido reprova.
assert.deepStrictEqual(validateResponse(base()), []);
assert.ok(validateResponse({ ...base(), T1: undefined }).length > 0);
assert.ok(validateResponse(base({ A3: 'nao', CP1: 5 })).length > 0);
assert.deepStrictEqual(validateResponse(base({ A3: 'nao', CP1: null, CP4: null })).filter((e) => e.includes('CP')), []);
assert.strictEqual(sanitizeResponse(base({ A3: 'nao' })).CP1, null);

// Agregação: NS/NA excluído; média de Tangibilidade do respondente 1 = (5+4)/2 = 4,5.
const responses = [
  base(),
  base({ T1: 3, T2: 3, T4: 3, C1: 2, D1: 2, D3: 2, CP1: 2, CP4: 2 }),
  base({ A3: 'nao', CP1: null, CP4: null, T1: null, T2: null, T4: null }),
];
const agg = aggregate(responses);
assert.strictEqual(agg.total, 3);
assert.strictEqual(agg.items.T4.n, 1); // só o segundo respondente marcou T4 (os demais marcaram NS/NA)
assert.strictEqual(agg.items.T4.mean, 3);
assert.strictEqual(agg.items.T1.mean, 4); // (5+3)/2, terceiro null
assert.strictEqual(agg.dimensions.find((d) => d.dim === 'Tangibilidade').n, 2);
assert.strictEqual(agg.items.CP1.n, 2); // terceiro pulou a Seção C
assert.ok(toCsvRaw(responses).includes('transferencia'));

console.log('Todos os testes de agregação e validação passaram.');
