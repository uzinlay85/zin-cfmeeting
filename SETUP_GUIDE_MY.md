# CFMeeting - Cloudflare Setup & Deployment လမ်းညွှန် (မြန်မာဘာသာ)

ဤလမ်းညွှန်သည် [uzinlay85/zin-cfmeeting](https://github.com/uzinlay85/zin-cfmeeting) ကို Cloudflare Workers & Static Assets ပေါ်တွင် **၁၀၀% Serverless အပြည့်အစုံ** လွှင့်တင်အသုံးပြုခဲ့သည့် လက်တွေ့အဆင့်ဆင့် မှတ်တမ်းဖြစ်ပါသည်။

---

## ၁။ မိတ်ဆက်နှင့် အလုပ်လုပ်ပုံ (Architecture)

**CFMeeting** သည် Cloudflare ၏ နည်းပညာများကိုသာ သီးသန့် အသုံးပြုထားသည့် Open-source Video Meeting Platform ဖြစ်ပါသည်:
* **Frontend (Web App)**: React + Vite (PWA) ဖြင့် တည်ဆောက်ထားပြီး Cloudflare Worker Static Assets မှတစ်ဆင့် တိုက်ရိုက် host လုပ်ပေးပါသည်။
* **Backend (API)**: Cloudflare Workers (Hono framework) ဖြင့် အစည်းအဝေး ဖန်တီးခြင်းနှင့် token ထုတ်ပေးခြင်းများကို ဆောင်ရွက်ပါသည်။
* **Media & Audio/Video**: Cloudflare RealtimeKit (WebRTC) ဖြင့် ချိတ်ဆက်ဆောင်ရွက်ပါသည်။
* **အကျိုးကျေးဇူး**: VPS သီးသန့်ဝယ်စရာမလို၊ Database သီးသန့်ထည့်စရာမလိုဘဲ အခမဲ့ စတင်အသုံးပြုနိုင်ပါသည်။

---

## ၂။ ကြိုတင်လိုအပ်ချက်များ (Prerequisites)

1. **Node.js**: Version `22.x` သို့မဟုတ် အထက်
2. **Git**: Installed ဖြစ်ထားရန်
3. **Cloudflare Account**: [dash.cloudflare.com](https://dash.cloudflare.com) တွင် အခမဲ့ အကောင့်ဖွင့်ထားရန်

---

## ၃။ အဆင့်ဆင့် Setup & Deploy ပြုလုပ်နည်း

### အဆင့် (၁) - Code ကို Clone ယူပြီး Dependencies သွင်းခြင်း

PowerShell (သို့မဟုတ် Terminal) ကို ဖွင့်၍ အောက်ပါအတိုင်း ရိုက်ပါ:

```powershell
git clone https://github.com/uzinlay85/zin-cfmeeting.git
cd zin-cfmeeting
npm install
```

---

### အဆင့် (၂) - Cloudflare API Token နှင့် Account ID ရယူခြင်း

> **မှတ်ချက်**: `npx wrangler login` ဖြင့် Browser OAuth ဝင်ရောက်ရာတွင် ဒေသတွင်း ကွန်ရက်/VPN သို့မဟုတ် Firewall ကြောင့် `localhost:8976 connection refused` သို့မဟုတ် `OAuth 403 Forbidden` ဖြစ်ပေါ်တတ်ပါသည်။ ထို့ကြောင့် **API Token** နည်းလမ်းသည် အသေချာဆုံးနှင့် အကောင်းဆုံး ဖြစ်ပါသည်။

#### (က) API Token ထုတ်ယူနည်း
1. Browser တွင် [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) သို့ သွားပါ။
2. **"Create Token"** ခလုတ်ကို နှိပ်ပါ။
3. **"Edit Cloudflare Workers"** template ဘေးရှိ **"Use template"** ကို နှိပ်ပါ။
4. Resource ရွေးချယ်မှုများတွင်:
   - **Account Resources**: `Include` -> သင်၏ **Cloudflare Account အမည်** ကို ရွေးပါ။
   - **Zone Resources**: `Include` -> အလယ်တွင် **`All zones from an account`** (သို့မဟုတ် `All zones`) ကို ရွေးပြီး ညာဘက်တွင် သင်၏ **Cloudflare Account အမည်** ကို ရွေးပါ။
5. စာမျက်နှာအောက်ခြေရှိ **"Continue to summary"** ကို နှိပ်ပြီး နောက်စာမျက်နှာတွင် **"Create Token"** ကို နှိပ်ပါ။
6. ထွက်လာသော **API Token** စာတန်းရှည်ကို ကူးယူ (Copy) ထားပါ။

#### (ခ) Account ID ရယူနည်း
1. [Cloudflare Dashboard](https://dash.cloudflare.com) ၏ ဘယ်ဘက် Menu ရှိ **Workers & Pages** သို့ သွားပါ။
2. ညာဘက်ခြမ်းအောက်နားရှိ **Account ID** ကို Copy ယူထားပါ။

---

### အဆင့် (၃) - Environment Variables သတ်မှတ်ခြင်း

PowerShell တွင် အောက်ပါအတိုင်း သင်၏ Token နှင့် Account ID တို့ကို ထည့်သွင်းပါ:

```powershell
$env:CLOUDFLARE_API_TOKEN="သင်၏_API_Token_ကိုဒီမှာထည့်ပါ"
$env:CLOUDFLARE_ACCOUNT_ID="သင်၏_Account_ID_ကိုဒီမှာထည့်ပါ"
```

Authentication အောင်မြင်မှု ရှိ/မရှိ စစ်ဆေးရန်:
```powershell
npx wrangler whoami
```
*(အကယ်၍ `Authenticated via API Token` ဟု ပေါ်လာပါက အောင်မြင်ပါပြီ)*

---

### အဆင့် (၄) - Cloudflare ပေါ်သို့ Deploy လုပ်ခြင်း

အောက်ပါ command တစ်ခုတည်းကို ရိုက်လိုက်ရုံဖြင့် Frontend ဝဘ်ဆိုက်ကို အလိုအလျောက် build လုပ်ပြီး Cloudflare Workers ပေါ်သို့ တစ်ပြိုင်နက် Deploy လုပ်ပေးသွားပါမည်:

```powershell
npm run deploy
```

Deploy လုပ်ငန်းစဉ် ပြီးဆုံးသွားပါက အောက်ပါအတိုင်း ကိုယ်ပိုင် Live Meeting Link ထွက်ပေါ်လာပါမည်:

```text
Uploaded cfmeeting (8.89 sec)
Deployed cfmeeting triggers (1.44 sec)
  https://cfmeeting.uzinlay85.workers.dev
```

အဆိုပါ URL ကို Browser တွင် ဖွင့်၍ အစည်းအဝေးများကို စတင်ဖန်တီးအသုံးပြုနိုင်ပါပြီ။

---

## ၄။ အခြား အသုံးဝင်သော အမိန့်များ (Useful Commands)

| Command | အသုံးဝင်ပုံ |
| :--- | :--- |
| `npm run preview` | ကွန်ပျူတာပေါ်တွင် UI Preview Panel (`localhost:5173/preview`) စမ်းသပ် run ခြင်း |
| `npm run dev` | Web App Frontend ကို Development server ဖြင့် စမ်းသပ် run ခြင်း |
| `npm run desktop:dev` | Windows/Mac Electron Desktop App ဖြင့် စမ်းသပ် run ခြင်း |
| `npm run desktop:build` | Windows Installer (`.exe`) တည်ဆောက်ခြင်း (ရလဒ်: `apps/desktop/release/`) |
| `npm run android:build` | Android APK ထုတ်ယူခြင်း (ရလဒ်: `apps/android/.../app-debug.apk`) |
| `npm run deploy` | Web Frontend နှင့် Cloudflare Worker ကို Live Server သို့ Deploy လုပ်ခြင်း |

---

## ၅။ ကြုံတွေ့ရတတ်သော ပြဿနာများနှင့် ဖြေရှင်းနည်းများ (Troubleshooting)

### ပြဿနာ ၁: `localhost:8976 connection refused`
* **အကြောင်းရင်း**: `npx wrangler login` ပြုလုပ်ချိန်တွင် Browser က ပြန်ပို့သော Auth Callback ကို Local Port (8976) က လက်ခံမရခြင်း (VPN/Proxy ကြောင့် လမ်းကြောင်းလွဲခြင်း သို့မဟုတ် Firewall ကြောင့် ဖြစ်တတ်သည်)။
* **ဖြေရှင်းနည်း**: OAuth ကို မသုံးဘဲ အထက်ပါ **အဆင့် (၂)** တွင် ဖော်ပြထားသည့်အတိုင်း `CLOUDFLARE_API_TOKEN` ကို အသုံးပြုပါ။

### ပြဿနာ ၂: `OAuth error: HTTP 403 Forbidden`
* **အကြောင်းရင်း**: Cloudflare ဘက်မှ `--device` flow ကို ကန့်သတ်ထားခြင်း သို့မဟုတ် IP/Region အခြေအနေကြောင့် ဖြစ်သည်။
* **ဖြေရှင်းနည်း**: API Token နည်းလမ်းကို အသုံးပြုခြင်းဖြင့် ၁၀၀% ကျော်လွှားနိုင်ပါသည်။

---

## ၆။ အပြီးသတ် ရလဒ်

* **Live Web App**: [https://cfmeeting.uzinlay85.workers.dev](https://cfmeeting.uzinlay85.workers.dev)
* မည်သည့် ဖုန်း/ကွန်ပျူတာ Browser မှမဆို Link ကို ဖွင့်ပြီး ကင်မရာ/မိုက်ခရိုဖုန်း ခွင့်ပြုချက် ပေးကာ Meeting တန်းတက်နိုင်ပါသည်။
* မိုဘိုင်းဖုန်းများတွင် Browser ၏ **"Add to Home Screen"** ကို နှိပ်ပြီး PWA App အဖြစ်လည်း အသုံးပြုနိုင်ပါသည်။
