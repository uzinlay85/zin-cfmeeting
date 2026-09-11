# 🎛️ CFMeeting ဗားရှင်း (၃) မျိုး နှိုင်းယှဉ်ချက်နှင့် အသုံးပြုနည်းလမ်းညွှန် (Versions Guide)

ဤ Repository တွင် CFMeeting ကို မိမိ အသုံးပြုလိုသည့် အခြေအနေ၊ လိုအပ်ချက်နှင့် Server အခြေခံအဆောက်အအုံပေါ် မူတည်၍ **ဗားရှင်း (၃) မျိုးလုံးကို တစ်ပြိုင်နက်တည်း ကွဲပြားစွာ ထည့်သွင်းတည်ဆောက်ထားပါသည်**။

တစ်မျိုးနှင့် တစ်မျိုး ပဋိပက္ခမဖြစ်ဘဲ သီးခြားစီ Run နိုင်/Deploy တင်နိုင်အောင် Monorepo ဖွဲ့စည်းပုံဖြင့် သေသပ်စွာ ခွဲထုတ်ထားပါသည်။

---

## 📊 ဗားရှင်း (၃) မျိုး ခြုံငုံနှိုင်းယှဉ်ချက် ဇယား

| အချက်အလက် | ၁။ Original Worker (`apps/server-original`) | ၂။ Enhanced Custom Worker (`apps/server`) | ၃။ VPS Docker Edition (`apps/server-vps`) |
| :--- | :--- | :--- | :--- |
| **အမျိုးအစား** | Cloudflare Worker (မူရင်း Upstream) | Cloudflare Worker (စိတ်ကြိုက်ပြင်ဆင်ထားသော ဗားရှင်း) | Standalone VPS (Docker + Node.js + Caddy) |
| **လည်ပတ်ရာ နေရာ** | Cloudflare Edge Network | Cloudflare Edge Network | ကိုယ်ပိုင် VPS Server (e.g. Ubuntu) |
| **Worker Name** | `cfmeeting-original` | `cfmeeting` | Serverless မဟုတ်ပါ (VPS Container) |
| **Live Domain ဥပမာ** | `https://cfmeeting-original.<user>.workers.dev` | `https://cfmeeting.uzinlay85.workers.dev` | `https://zinmeet.duckdns.org` |
| **WebRTC Media Backend**| Cloudflare RealtimeKit | Cloudflare RealtimeKit | Cloudflare RealtimeKit |
| **Meeting Access Code** | မပါဝင်ပါ (မူရင်းအတိုင်း မည်သူမဆို ခန်းမဖွင့်နိုင်) | ပါဝင်သည် (`CREATE_ACCESS_CODE` ဖြင့် ထိန်းချုပ်) | ပါဝင်သည် (`CREATE_ACCESS_CODE` ဖြင့် ထိန်းချုပ်) |
| **Video Grid Layout** | မူရင်းအတိုင်း | Google Meet ပုံစံ Mobile Responsive 3:4 Grid | Google Meet ပုံစံ Mobile Responsive 3:4 Grid |
| **Recording သိမ်းဆည်းမှု**| Cloudflare R2 / Cloud Storage | Cloudflare R2 Storage ချိတ်ဆက်မှု | VPS Hard Disk ပေါ်တွင် သိမ်းဆည်းမှု (Local MP4) |
| **Recording Dashboard** | R2 Dashboard / S3 Client | R2 Dashboard / S3 Client | `/recordings` Web Dashboard (Password ခံထား) |
| **Server ကုန်ကျစရိတ်** | $0 (Cloudflare Free Tier) | $0 (Cloudflare Free Tier) | VPS ငှားရမ်းခ (လက်ရှိ VPS ရှိလျှင် $0) |

---

## ၁။ Version 1: Original Upstream Worker (`apps/server-original`)

### သဘောတရားနှင့် ရည်ရွယ်ချက်
မူရင်း upstream repository ဖြစ်သော [`qianyubtc/cfmeeting`](https://github.com/qianyubtc/cfmeeting) ၏ မူရင်း Worker ကုဒ်သန့်သန့်အတိုင်း ဖြစ်ပါသည်။ သင်၏ ကိုယ်ပိုင် Cloudflare Account ID နှင့် RTK App ID များကို ချိတ်ဆက်ပြီး မူရင်း Developer ရေးသားထားသော အတိုင်း စမ်းသပ်လိုသည့်အခါ အသုံးပြုနိုင်ပါသည်။

### ဖိုင်လမ်းကြောင်း
- `apps/server-original/` (Worker Name: `cfmeeting-original`)
- `apps/server-original/wrangler.jsonc`

### အသုံးပြုနည်း အဆင့်ဆင့်

#### (က) Environment Variables သတ်မှတ်ခြင်း
`apps/server-original/.dev.vars` ဖိုင်အသစ်ဖွင့်၍ (သို့မဟုတ် `apps/server/.dev.vars` ရှိ credentials ကို မျှဝေသုံးစွဲ၍) ထည့်ပါ:
```ini
CF_ACCOUNT_ID=1fd15eea3027d60cc30686fde4935fb0
CF_API_TOKEN=your_cloudflare_api_token_here
RTK_APP_ID=79b99bec-35c6-43a6-beb6-33fdf9bc3062
```

#### (ခ) Presets များ စတင်ဖန်တီးခြင်း
```bash
npm run setup:presets:original
```

#### (ဂ) Local Dev စမ်းသပ်ခြင်း
```bash
npm run dev:original
```

#### (ဃ) Cloudflare Workers ပေါ်သို့ Deploy တင်ခြင်း
```bash
npm run deploy:original
```
*(Deploy တင်ပြီးပါက `https://cfmeeting-original.<subdomain>.workers.dev` အဖြစ် သီးသန့် အလုပ်လုပ်ပါမည်။ မူရင်း `cfmeeting` worker ကို ထိခိုက်ခြင်း မရှိပါ။)*

---

## ၂။ Version 2: Enhanced Custom Worker (`apps/server`)

### သဘောတရားနှင့် ရည်ရွယ်ချက်
မူရင်း စနစ်ကို ကျွန်ုပ်တို့ကိုယ်တိုင် စိတ်ကြိုက် အဆင့်မြှင့်တင်ထားသော Cloudflare Serverless ဗားရှင်း ဖြစ်ပါသည်။
- Meeting Access Code ထည့်သွင်းထားသဖြင့် ခွင့်ပြုချက်မရှိဘဲ မည်သူမျှ အစည်းအဝေးခန်းမ အသစ်ဖွင့်၍ မရအောင် ကာကွယ်ထားသည်။
- Mobile ဖုန်းများတွင် ကင်မရာမြင်ကွင်း နေရာကျဉ်းကျပ်မှု မရှိစေရန် Google Meet ကဲ့သို့ 3:4 portrait grid responsive layout အဖြစ် ပြင်ဆင်ထားသည်။
- Cloudflare R2 Storage ဖြင့် Cloud Recording စနစ် ချိတ်ဆက်ထားသည်။

### ဖိုင်လမ်းကြောင်း
- `apps/server/` (Worker Name: `cfmeeting`)
- `apps/server/wrangler.jsonc`

### အသုံးပြုနည်း အဆင့်ဆင့်

#### (က) Local Dev စမ်းသပ်ခြင်း
```bash
npm run dev:server
```

#### (ခ) Cloudflare Workers ပေါ်သို့ Deploy တင်ခြင်း
```bash
npm run deploy
```
*(Live URL: `https://cfmeeting.uzinlay85.workers.dev`)*

---

## ၃။ Version 3: Standalone VPS Docker Edition (`apps/server-vps`)

### သဘောတရားနှင့် ရည်ရွယ်ချက်
Cloudflare Workers မသုံးချင်သူများ၊ သို့မဟုတ် မိမိ၏ ကိုယ်ပိုင် VPS (Virtual Private Server) ပေါ်တွင် 100% သီးခြား Hosting တင်လိုသူများအတွက် ဖန်တီးထားသော ဗားရှင်း ဖြစ်ပါသည်။
- **Caddy Web Server** ပါဝင်သဖြင့် DuckDNS သို့မဟုတ် Custom Domain ထည့်ပေးရုံဖြင့် Auto HTTPS/SSL Certificate ကို အလိုအလျောက် ရယူပေးသည်။
- **Local MP4 Recording Storage**: အစည်းအဝေးများကို Record ပြုလုပ်ပါက Cloudflare R2 ဝယ်စရာမလိုဘဲ VPS Hard Disk ပေါ်တွင် MP4 ဖိုင်အဖြစ် တိုက်ရိုက် သိမ်းဆည်းပေးသည်။
- **Password-Protected Recording Dashboard**: `https://zinmeet.duckdns.org/recordings` သို့ ဝင်ရောက်၍ သိမ်းဆည်းထားသော အစည်းအဝေး မှတ်တမ်းများကို Browser ပေါ်မှ တိုက်ရိုက် Play ကြည့်ရှုနိုင်ပြီး Download ရယူနိုင်ပါသည်။

### ဖိုင်လမ်းကြောင်း
- `apps/server-vps/`
- `apps/server-vps/docker-compose.yml`
- `apps/server-vps/Caddyfile`

### အသုံးပြုနည်း အဆင့်ဆင့် (VPS ပေါ်တွင်)

#### (က) Code ရယူပြီး Build & Run ပြုလုပ်ခြင်း
```bash
cd ~/zin-cfmeeting/apps/server-vps
git pull origin main
sudo docker compose up -d --build
```

#### (ခ) Dashboard နှင့် Meeting အသုံးပြုခြင်း
- **အစည်းအဝေး ပြုလုပ်ရန်:** `https://zinmeet.duckdns.org`
- **မှတ်တမ်းဗီဒီယိုများ ကြည့်ရန်/ဒေါင်းလုဒ်ဆွဲရန်:** `https://zinmeet.duckdns.org/recordings`

---

## 💡 ဘယ်အချိန်မှာ ဘယ် Version ကို သုံးသင့်သလဲ?

1. **VPS အပိုမရှိဘဲ Cloudflare Free Tier ဖြင့် Zero Cost အသုံးပြုလိုလျှင်** 👉 **Version 2 (Custom Worker)** ကို အသုံးပြုပါ။
2. **မူရင်း Upstream developer ၏ Features များ အတိုင်း pure စမ်းသပ်လိုလျှင်** 👉 **Version 1 (Original Worker)** ကို အသုံးပြုပါ။
3. **အစည်းအဝေး မှတ်တမ်းဗီဒီယို (MP4) များကို VPS Hard Disk တွင် သိမ်းဆည်းပြီး ကိုယ်ပိုင် Domain ဖြင့် အသုံးပြုလိုလျှင်** 👉 **Version 3 (VPS Edition)** ကို အသုံးပြုပါ။
