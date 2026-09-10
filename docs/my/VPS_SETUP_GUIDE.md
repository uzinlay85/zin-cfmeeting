# 🖥️ CFMeeting VPS Version - အသေးစိတ် Setup နှင့် တပ်ဆင်အသုံးပြုနည်း လမ်းညွှန်

ဤလမ်းညွှန်သည် **CFMeeting** ကို သင်၏ ကိုယ်ပိုင် **VPS (Virtual Private Server)** ပေါ်တွင် တင်ပြီး အစည်းအဝေး မှတ်တမ်းတင်ထားသော ဗီဒီယို (MP4 Recording) များကို **VPS Local Hard Disk** ပေါ်တွင် တိုက်ရိုက် သိမ်းဆည်း၊ စီမံ၊ ကြည့်ရှုနိုင်စေရန် ပြုလုပ်ပေးမည့် အဆင့်ဆင့် လမ်းညွှန်ဖြစ်ပါသည်။

---

## 📑 မာတိကာ (Table of Contents)

1. [စနစ်တည်ဆောက်ပုံနှင့် အားသာချက်များ (Overview & Benefits)](#၁-စနစ်တည်ဆောက်ပုံနှင့်-အားသာချက်များ)
2. [VPS အနိမ့်ဆုံး လိုအပ်ချက်များ (System Requirements)](#၂-vps-အနိမ့်ဆုံး-လိုအပ်ချက်များ)
3. [Cloudflare RealtimeKit Keys များ ကြိုတင်ရယူခြင်း](#၃-cloudflare-realtimekit-keys-များ-ကြိုတင်ရယူခြင်း)
4. [နည်းလမ်း (၁) - Docker & Docker Compose ဖြင့် တပ်ဆင်ခြင်း (အကြံပြုချက်)](#၄-နည်းလမ်း-၁---docker--docker-compose-ဖြင့်-တပ်ဆင်ခြင်း-အကြံပြုချက်)
5. [နည်းလမ်း (၂) - Node.js & PM2 ဖြင့် တပ်ဆင်ခြင်း (Manual Setup)](#၅-နည်းလမ်း-၂---nodejs--pm2-ဖြင့်-တပ်ဆင်ခြင်း-manual-setup)
6. [Recording ဖိုင်များ သိမ်းဆည်းခြင်းနှင့် စီမံခန့်ခွဲခြင်း (Recording Management)](#၆-recording-ဖိုင်များ-သိမ်းဆည်းခြင်းနှင့်-စီမံခန့်ခွဲခြင်း)
7. [Domain Name နှင့် SSL/HTTPS ချိတ်ဆက်ခြင်း](#၇-domain-name-နှင့်-sslhttps-ချိတ်ဆက်ခြင်း)
8. [မကြာခဏ မေးလေ့ရှိသော မေးခွန်းများနှင့် အကြံပြုချက်များ (FAQ & Troubleshooting)](#၈-faq--troubleshooting)

---

## ၁။ စနစ်တည်ဆောက်ပုံနှင့် အားသာချက်များ

VPS Version သည် **Hybrid Architecture** ပုံစံဖြင့် အလုပ်လုပ်ပါသည်:

* **WebRTC Video/Audio Streaming:** ကမ္ဘာ့အဆင့်မီ latency အလွန်နည်းသော Cloudflare RealtimeKit Edge Network က တာဝန်ယူပေးပါသည်။ (VPS Bandwidth မကုန်ပါ)
* **Backend Server & Web App:** သင်၏ VPS ပေါ်ရှိ Node.js (Hono) Container က Web App (Frontend SPA) ကို ဝန်ဆောင်မှုပေးပါသည်။
* **Recordings Storage (ဗီဒီယိုမှတ်တမ်းများ):** Meeting ပြီးဆုံးသည်နှင့် Cloudflare R2 ပေါ်မှ MP4 ဗီဒီယိုများကို VPS Local Disk (`./recordings/`) သို့ **Auto-Sync စနစ်ဖြင့် အလိုအလျောက် Download ဆွဲယူသိမ်းဆည်း** ပေးပါသည်။
* **Streaming & Playback:** VPS ပေါ်ရှိ Local MP4 ဖိုင်များကို Browser ထဲမှ တိုက်ရိုက် play ကြည့်နိုင်ရန် Range-request streaming API (`/api/vps/recordings/:filename`) ပါဝင်ပါသည်။

```
[ အသုံးပြုသူများ (Web / Mobile) ]
       │                   │
  (WebRTC Video)     (HTTP/HTTPS)
       │                   ▼
       │             [ Caddy (Auto-SSL) ]
       │                   ▼
       │             [ CFMeeting VPS Server ]
       │                   │ (Auto-Sync Worker)
       ▼                   ▼
[ Cloudflare RTK ] ──> [ VPS Local Hard Disk ]
  (Video Stream)       (./recordings/*.mp4)
```

---

## ၂။ VPS အနိမ့်ဆုံး လိုအပ်ချက်များ

| အချက်အလက် | အနိမ့်ဆုံး လိုအပ်ချက် (Minimum) | အကြံပြုချက် (Recommended) |
| :--- | :--- | :--- |
| **OS** | Ubuntu 22.04 / 24.04 LTS, Debian 12 | Ubuntu 24.04 LTS |
| **CPU** | 1 Core | 2 Cores |
| **RAM** | 1 GB | 2 GB သို့မဟုတ် 4 GB |
| **Disk Space** | 20 GB SSD | 50 GB ~ 100 GB+ (Recording အရေအတွက်အပေါ် မူတည်) |
| **Network** | 1 IPv4 Public Address | Static Public IPv4 |
| **Ports** | 80 (HTTP), 443 (HTTPS), 3000 (App) | 80 & 443 ဖွင့်ထားရန် လိုအပ် |

---

## ၃။ Cloudflare RealtimeKit Keys များ ကြိုတင်ရယူခြင်း

VPS မတပ်ဆင်မီ Cloudflare Dashboard မှ အောက်ပါ အချက်အလက် (၄) ခုကို ရယူထားပါ:

1. **`CF_ACCOUNT_ID`:** Cloudflare Dashboard ညာဘက်ခြမ်းတွင် တွေ့နိုင်သော **Account ID** (စာလုံး ၃၂ လုံး)
2. **`CF_API_TOKEN`:** Cloudflare Dashboard -> **My Profile** -> **API Tokens** -> **Create Custom Token**:
   * Permissions: `Account` -> `Cloudflare Calls / Realtime` -> `Edit` (သို့မဟုတ် အပြည့်အစုံ)
3. **`RTK_APP_ID`:** RealtimeKit Dashboard ထဲရှိ သင်၏ Application ID (UUID ပုံစံ ဥပမာ- `b6c79f6b-4355-469d-85b2-1b6da50c8169`)
4. **`RTK_HOST_SECRET`:** Host တာဝန်ရှိသူ key များကို လုံခြုံစွာ လက်မှတ်ထိုးရန် စိတ်ကြိုက် Random စာသားရှည် (ဥပမာ- `my_super_secret_host_key_12345`)

---

## ၄။ နည်းလမ်း (၁) - Docker & Docker Compose ဖြင့် တပ်ဆင်ခြင်း (အကြံပြုချက်)

ဤနည်းလမ်းသည် အလွယ်ကူဆုံးနှင့် အကောင်းဆုံး နည်းလမ်းဖြစ်ပြီး Caddy Web Server က Let's Encrypt SSL/HTTPS ကို အလိုအလျောက် ရယူတပ်ဆင်ပေးပါမည်။

### အဆင့် (၁) - VPS ထဲသို့ SSH ဝင်ရောက်ပြီး Docker သွင်းပါ

```bash
# Ubuntu/Debian Update ပြုလုပ်ခြင်း
sudo apt update && sudo apt upgrade -y

# Docker & Docker Compose Plugin သွင်းခြင်း
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### အဆင့် (၂) - Source Code ကို VPS ပေါ်သို့ Clone ရယူပါ

```bash
# Git မရှိပါက သွင်းပါ
sudo apt install -y git

# Repository clone ပြုလုပ်ခြင်း
git clone https://github.com/uzinlay85/zin-cfmeeting.git
cd zin-cfmeeting
```

### အဆင့် (၃) - VPS Environment File (.env) ပြင်ဆင်ပါ

```bash
cd apps/server-vps
cp .env.example .env
nano .env
```

အောက်ပါအတိုင်း ဖြည့်သွင်းပြင်ဆင်ပါ:

```env
# Server Port
PORT=3000
NODE_ENV=production

# သင်၏ Domain Name (SSL အလိုအလျောက် ရရှိရန်)
DOMAIN=meet.yourdomain.com

# Cloudflare RealtimeKit Credentials
CF_ACCOUNT_ID=1fd15eea3027d60cc30686fde4935fb0
CF_API_TOKEN=your_cloudflare_api_token_here
RTK_APP_ID=b6c79f6b-4355-469d-85b2-1b6da50c8169
RTK_HOST_SECRET=my_custom_secure_secret_key_8899

# Presets
RTK_HOST_PRESET=cfmeeting_host
RTK_PARTICIPANT_PRESET=cfmeeting_participant
RTK_WEBINAR_HOST_PRESET=cfmeeting_webinar_host
RTK_WEBINAR_PARTICIPANT_PRESET=cfmeeting_webinar_participant

# လုံခြုံရေး: အစည်းအဝေး ဖန်တီးခွင့် လျှို့ဝှက်ကုဒ် (သတ်မှတ်ထားပါက ကုဒ်သိသူသာ Meeting အသစ် ဖွင့်နိုင်မည်)
ACCESS_CODE=secret123

# VPS Local Recordings Settings
RECORDINGS_DIR=./recordings
AUTO_DOWNLOAD_RECORDINGS=true
SYNC_INTERVAL_SEC=30
```

> **မှတ်ချက်:** `nano` ထဲတွင် ပြင်ဆင်ပြီးပါက `Ctrl + O` နှိပ်၍ သိမ်းပါ၊ `Ctrl + X` နှိပ်၍ ထွက်ပါ။

### အဆင့် (၄) - Docker Container စတင် Run ပါ

```bash
# apps/server-vps ဖိုဒါထဲတွင်
docker compose up -d --build
```

Container အခြေအနေကို စစ်ဆေးရန်:
```bash
docker compose ps
docker compose logs -f app
```

---

## ၅။ နည်းလမ်း (၂) - Node.js & PM2 ဖြင့် တပ်ဆင်ခြင်း (Manual Setup)

Docker မသုံးလိုဘဲ VPS ပေါ်တွင် Node.js တိုက်ရိုက် run လိုပါက:

### အဆင့် (၁) - Node.js 22 သွင်းပါ

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### အဆင့် (၂) - Dependencies သွင်းပြီး Build လုပ်ပါ

```bash
cd zin-cfmeeting
npm install
npm run build:vps
```

### အဆင့် (၃) - PM2 ဖြင့် စတင် Run ပါ

```bash
cd apps/server-vps
cp .env.example .env
# .env ထဲတွင် လိုအပ်သော keys များ ပြင်ဆင်ပါ
nano .env

# PM2 ဖြင့် Background Process အဖြစ် စတင်ပါ
pm2 start dist/index.js --name "cfmeeting-vps"
pm2 save
pm2 startup
```

---

## ၆။ Recording ဖိုင်များ သိမ်းဆည်းခြင်းနှင့် စီမံခန့်ခွဲခြင်း

### ဖိုင်များ သိမ်းဆည်းသည့် တည်နေရာ
VPS ပေါ်ရှိ `apps/server-vps/recordings/` ဖိုဒါထဲတွင် အောက်ပါအတိုင်း အလိုအလျောက် သိမ်းဆည်းပေးပါသည်:
* `YYYY-MM-DD_<meetingId>_<recordingId>.mp4` (ဗီဒီယိုဖိုင် အပြည့်အစုံ)
* `YYYY-MM-DD_<meetingId>_<recordingId>.json` (အစည်းအဝေး အချက်အလက်နှင့် ကြာမြင့်ချိန် Metadata)

### Local Recordings API များ
VPS Server မှ အောက်ပါ API endpoint များကို ပံ့ပိုးပေးထားပါသည်:

1. **သိမ်းထားသော Record စာရင်း ကြည့်ရန်:**
   ```
   GET https://yourdomain.com/api/vps/recordings
   ```
2. **အသံ/ဗီဒီယို တိုက်ရိုက် Play ကြည့်ရန် (Stream):**
   ```
   GET https://yourdomain.com/api/vps/recordings/<filename>.mp4
   ```
3. **ဗီဒီယိုဖိုင် ဒေါင်းလုဒ်ဆွဲရန်:**
   ```
   GET https://yourdomain.com/api/vps/recordings/<filename>.mp4?download=1
   ```
4. **Cloudflare မှ ချက်ချင်း Manual Sync ပြုလုပ်ရန်:**
   ```
   POST https://yourdomain.com/api/vps/recordings/sync
   ```

---

## ၇။ Domain Name နှင့် SSL/HTTPS ချိတ်ဆက်ခြင်း

WebRTC (Camera / Mic / Screen Share) သည် **HTTPS မဖြစ်မနေ လိုအပ်ပါသည်**။

1. သင်၏ Domain DNS Management (ဥပမာ Cloudflare DNS သို့မဟုတ် Namecheap/GoDaddy) သို့ သွားပါ။
2. **A Record** တစ်ခု ထည့်ပါ:
   * **Name:** `meet` (သို့မဟုတ် `@`)
   * **IPv4 Address:** သင်၏ VPS Public IP (ဥပမာ `123.45.67.89`)
   * **Proxy status:** DNS Only (သို့မဟုတ် Proxied)
3. `.env` ဖိုင်ထဲရှိ `DOMAIN` တွင် သင်၏ Domain (ဥပမာ `meet.yourdomain.com`) ဟု ထည့်ထားပါက Docker Compose ဖြင့် run သောအခါ **Caddy က အခမဲ့ Let's Encrypt SSL ကို မိနစ်ပိုင်းအတွင်း အလိုအလျောက် ချိတ်ဆက်ပေးပါမည်**။

---

## ၈။ FAQ & Troubleshooting

### မေး။ VPS ရဲ့ Disk Space ပြည့်သွားရင် ဘယ်လိုလုပ်ရမလဲ?
**ဖြေ။** `apps/server-vps/recordings/` ဖိုဒါထဲမှ ရက်လွန်နေသော MP4 ဖိုင်များကို ဖျက်ပေးနိုင်ပါသည်။ (ဥပမာ ရက် ၃၀ ကျော်သော ဗီဒီယိုများကို အလိုအလျောက် ရှင်းလင်းသည့် cron job ထည့်သွင်းနိုင်ပါသည်)
```bash
# ရက် ၃၀ ကျော်သော recording ဖိုင်ဟောင်းများကို ရှာဖျက်ရန်
find /path/to/apps/server-vps/recordings/ -type f -name "*.mp4" -mtime +30 -delete
```

### မေး။ Cloudflare Worker version နဲ့ VPS version ဘာတွေ ကွာခြားပါသလဲ?
**ဖြေ။** 
* **Cloudflare Worker Version:** ၁၀၀% Serverless ဖြစ်ပြီး Server စရိတ် မရှိပါ။ Recording များကို Cloudflare R2 Storage ပေါ်တွင် သိမ်းဆည်းပါသည်။
* **VPS Version:** Node.js/Docker ဖြင့် ကိုယ်ပိုင် Server ပေါ်တွင် run နိုင်ပြီး Recording များကို VPS Local Hard Disk ပေါ်သို့ Auto-Sync ဖြင့် သိမ်းဆည်းပေးပါသည်။
* နှစ်ခုလုံးသည် ပင်မ WebRTC အသံ/ရုပ်သံအတွက် Cloudflare RealtimeKit ကို အသုံးပြုသဖြင့် အလွန်မြန်ဆန် ချောမွေ့ပါသည်။

---

[⬅️ မူရင်း မြန်မာဘာသာ မာတိကာသို့ ပြန်သွားရန်](README.md)
