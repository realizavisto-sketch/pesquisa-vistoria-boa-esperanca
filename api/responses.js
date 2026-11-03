import { list, put } from '@vercel/blob';
import { validateResponse, sanitizeResponse } from '../lib/validate.js';

const KEY = 'responses.json';

async function loadResponses() {
  const { blobs } = await list({ prefix: KEY });
  const blob = blobs.find((b) => b.pathname === KEY);
  if (!blob) return [];
  const res = await fetch(blob.url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function saveResponses(responses) {
  await put(KEY, JSON.stringify(responses, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
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
      const responses = await loadResponses();
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date().toISOString(),
        ...sanitizeResponse(body),
      };
      responses.push(record);
      await saveResponses(responses);
      return res.status(201).json({ ok: true, id: record.id, count: responses.length });
    }

    if (req.method === 'DELETE') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = req.headers['x-admin-key'];
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Chave de pesquisador inválida.' });
      }
      await saveResponses([]);
      return res.status(200).json({ ok: true, count: 0 });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao processar a resposta.' });
  }
}
