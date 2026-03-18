import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const pins = await kv.get('tmark-pins') || [];
      return res.status(200).json({ pins });
    }

    if (req.method === 'POST') {
      const pin = req.body;
      const pins = await kv.get('tmark-pins') || [];
      pins.unshift(pin);
      await kv.set('tmark-pins', pins);
      return res.status(201).json({ ok: true, count: pins.length });
    }

    if (req.method === 'PUT') {
      const { id, action, data } = req.body;
      let pins = await kv.get('tmark-pins') || [];
      pins = pins.map(p => {
        if (p.id !== id) return p;
        if (action === 'status') return { ...p, status: data };
        if (action === 'reply') return { ...p, replies: [...(p.replies || []), data] };
        return p;
      });
      await kv.set('tmark-pins', pins);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (id === '__ALL__') {
        await kv.set('tmark-pins', []);
        return res.status(200).json({ ok: true });
      }
      let pins = await kv.get('tmark-pins') || [];
      pins = pins.filter(p => p.id !== id);
      await kv.set('tmark-pins', pins);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
