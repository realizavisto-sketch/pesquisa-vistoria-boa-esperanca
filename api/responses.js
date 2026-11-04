import { list, put, del } from '@vercel/blob';
import { validateResponse, sanitizeResponse } from '../lib/validate.js';

// Cada resposta é um blob próprio (responses/<id>.json), em vez de um
// único arquivo responses.json lido-modificado-escrito. O modelo antigo
// perdia respostas: o list() pode devolver várias versões do mesmo
// pathname e o find() pegava a versão antiga, sobrescrevendo as novas.
// Com um arquivo por resposta não há leitura prévia nem corrida entre
// envios simultâneos no campo.
const PREFIX = 'responses/';
const LEGACY_KEY = 'responses.json';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

async function loadResponses() {
  const out = [];
  const seen = new Set();
  const { blobs } = await list({ prefix: PREFIX });
  for (const blob of blobs) {
    if (!blob.pathname.endsWith('.json')) continue;
    const data = await fetchJson(blob.url);
    if (data && data.id && !seen.has(data.id)) { seen.add(data.id); out.push(data); }
  }
  // Compatibilidade: arquivo único da primeira versão, se existir.
  const legacy = await list({ prefix: LEGACY_KEY });
  const old = legacy.blobs.find((b) => b.pathname === LEGACY_KEY);
  if (old) {
    const data = await fetchJson(old.url);
    if (Array.isArray(data)) {
      for (const r of data) {
        if (r && r.id && !seen.has(r.id)) { seen.add(r.id); out.push(r); }
      }
    }
  }
  out.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return out;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const responses = await loadResponses();
      return res.status(200).json({ count: responses.length, responses });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const errors = validateResponse(body);
      if (errors.length) return res.status(400).json({ errors });
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'Armazenamento não configurado: BLOB_READ_WRITE_TOKEN ausente no ambiente.' });
      }
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date().toISOString(),
        ...sanitizeResponse(body),
      };
      // Store público: put com access 'public'. As respostas já são
      // anônimas (sem nome, CPF, placa ou contato) e a própria API as
      // lista no painel do pesquisador, então o blob público não expõe
      // nenhum dado pessoal a mais.
      await put(`${PREFIX}${record.id}.json`, JSON.stringify(record, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      return res.status(201).json({ ok: true, id: record.id });
    }

    if (req.method === 'DELETE') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = req.headers['x-admin-key'];
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Chave de pesquisador inválida.' });
      }
      const { blobs } = await list({ prefix: PREFIX });
      const legacy = await list({ prefix: LEGACY_KEY });
      const urls = [
        ...blobs.map((b) => b.url),
        ...legacy.blobs.filter((b) => b.pathname === LEGACY_KEY).map((b) => b.url),
      ];
      if (urls.length) await del(urls);
      return res.status(200).json({ ok: true, count: 0 });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao processar a resposta.', detail: err && err.message ? err.message : String(err) });
  }
}
