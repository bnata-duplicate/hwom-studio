// ───────────────────────────────────────────────────────────────
// HumanSoft | Atlas · /api/chat  — tek beyin proxy ucu
// Uygulamanın (HWOM Studio, KPI Atlas Hattı, Report Engine, ATLAS SIA)
// HSI çağrılarını SUNUCUDA Anthropic'e iletir. API anahtarı client'a sızmaz.
//
// Konum: proje kökünde  api/chat.js   (Vercel serverless function)
// Çağrı : POST /api/chat  body: { model, max_tokens, messages, system? }
// Dönüş : Anthropic /v1/messages yanıtı aynen ({ content:[{type:'text',text}], ... })
//         → client zaten data.content[0].text okuyor.
// ───────────────────────────────────────────────────────────────

// İzinli origin(ler). Boş bırakılırsa same-origin dışı engellenmez (pilot için gevşek).
// Üretimde kendi alan adını yaz: ['https://humansoft-atlas.vercel.app']
const ALLOWED_ORIGINS = [];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Sadece POST' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY tanımlı değil. Vercel → Project → Settings → Environment Variables ekle, redeploy et.'
    });
  }

  try {
    // Vercel JSON gövdeyi otomatik parse eder; emniyet için kontrol
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { model, max_tokens, messages, system, temperature } = b;

    if (!model || !max_tokens || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Zorunlu alanlar: model, max_tokens, messages[]' });
    }

    const payload = { model, max_tokens, messages };
    if (system) payload.system = system;
    if (temperature != null) payload.temperature = temperature;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    // Anthropic ne döndürürse aynen geçir (hata kodu dahil) — client şemayı bilir.
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy hatası: ' + (e?.message || String(e)) });
  }
}
