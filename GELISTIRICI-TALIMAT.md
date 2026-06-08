# HumanSoft | Atlas — Devreye Alma Talimatı (geliştirici için)

> **Amaç:** HWOM Studio'da KPI Takip → "Atlas Hattı" sayfasının canlı AI yorumu (HSI_YORUM) çalışması.
> **Tahmini süre:** ~10 dakika. Yeni mimari yok; iki dosya + bir ortam değişkeni.

---

## Kesin adresler (tahmin yok)

- **Vercel projesi:** `hwom-studio` → yayında `hwom-studio.vercel.app`
- **Bağlı GitHub deposu:** `bnata-duplicate/hwom-studio` (Vercel → Settings → Git ile doğrulandı)
- **Dal:** `main`
- ⚠️ **Not:** Hesapta benzer adlı başka depolar var (`hwom_studio_V6`, `humansoft-ai-atlas` vb.). **Onlara DOKUNMA.** Canlı site yalnızca `bnata-duplicate/hwom-studio`'dan yayınlanıyor. Tüm değişiklik bu depoya.

---

## Yapılacaklar

### 1. `index.html` güncelle
- Ekteki **`index.html`**'i deponun **kökündeki** mevcut `index.html` ile değiştir.
- İçindeki değişiklik: KPI Takip'e izole "Atlas Hattı" alt-sayfası eklendi + monokrom kimlik. Regresyon yok (mevcut 13 sekme/menü korunur).

### 2. `api/chat.js` ekle
- Depoda kökte **`api/`** klasörü yoksa oluştur.
- Ekteki **`chat.js`**'i bu klasörün içine koy → tam yol: **`api/chat.js`**.
- Bu, Anthropic'e giden sunucu-taraflı proxy (tek beyin ucu). API anahtarı client'a sızmaz.

### 3. Ortam değişkeni
- Vercel → `hwom-studio` projesi → **Settings → Environment Variables**.
- Yoksa ekle:
  - **Name:** `ANTHROPIC_API_KEY`
  - **Value:** Anthropic API anahtarı (console.anthropic.com → Settings → API keys)
  - Environment: Production (+ Preview istenirse)
- (Hesapta 1 env değişkeni görünüyor ama Vercel'de değişkenler **proje bazlı** — başka projedeki anahtar bu projede geçerli değil. `hwom-studio` projesinde olduğundan emin ol.)

### 4. Yayınla
- `index.html` + `api/chat.js`'i `bnata-duplicate/hwom-studio` `main` dalına **commit + push**.
- Vercel otomatik deploy eder.
- Env değişkeni **3. adımda yeni eklendiyse**: deploy'dan sonra **Redeploy** (yoksa fonksiyon anahtarı görmez).

### 5. Test
1. `hwom-studio.vercel.app` aç.
2. Üst menü **12 KPI Takip** → sol alt-menü **Atlas Hattı**.
3. Bir KPI seç → **HSI_YORUM çağır**.
4. Gerçek yorum (sabit şablon değil) gelirse → **canlı.** ✅

---

## Sözleşme (dokunma)

`chat.js` Anthropic `/v1/messages`'a şu sabitlerle gider — değiştirme:
- `POST https://api.anthropic.com/v1/messages`
- header: `x-api-key: <env>` · `anthropic-version: 2023-06-01` · `content-type: application/json`
- body: `{ model, max_tokens, messages, system? }` (client gönderir, proxy geçirir)
- model proxy'de **sabit değil** — client ne gönderirse o (model güncellemesinde dosyaya dokunulmaz).
- yanıt aynen geçer; client `data.content[0].text` okur.

---

## Hata olursa

| Belirti | Sebep | Çözüm |
|---|---|---|
| "ANTHROPIC_API_KEY tanımlı değil" | env eksik / redeploy yapılmadı | 3 + 4. adım |
| 401 / auth error | anahtar yanlış/iptal | anahtarı yenile |
| Yanıt yerine sabit şablon + "canlı değil" notu | proxy'ye ulaşılamıyor (yol/origin) | `api/chat.js` yolu doğru mu, aynı projede mi |
| CORS | farklı origin | `index.html` ile `api/chat.js` **aynı projede** olmalı (öyle) |

---

## Pilot sonrası (şimdi şart değil, not)

- **Güvenlik:** `chat.js` içindeki `ALLOWED_ORIGINS`'e `https://hwom-studio.vercel.app` yaz → uç dışa açık kalmasın.
- **Depo temizliği:** 7 benzer depo → tek kanonik (`hwom-studio`) bırakılması önerilir.
- API anahtarı **asla** `index.html` veya repoda olmasın — yalnız Vercel env.

---

*Hazırlayan: Atlas mimari oturumu. Dosyalar bu talimatla birlikte: `index.html`, `chat.js`.*
