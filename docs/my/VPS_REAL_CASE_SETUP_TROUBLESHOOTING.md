# 🛠️ CFMeeting VPS (RackNerd) လက်တွေ့ တပ်ဆင်မှု မှတ်တမ်းနှင့် အခက်အခဲများ ဖြေရှင်းနည်း လမ်းညွှန်

ဤမှတ်တမ်းသည် **`https://zinmeet-rn.truehand.top`** ကို **RackNerd VPS** ပေါ်တွင် လက်တွေ့ တပ်ဆင်၊ စမ်းသပ်၊ ပြင်ဆင်ခဲ့သော အတွေ့အကြုံများ၊ တွေ့ကြုံခဲ့ရသည့် အခက်အခဲများနှင့် ဖြေရှင်းခဲ့သည့် နည်းလမ်းများကို နောင်တစ်ချိန်တွင် အလွယ်တကူ ပြန်လည် ကိုးကား တပ်ဆင်နိုင်စေရန် အပြည့်အစုံ မှတ်တမ်းတင်ထားခြင်း ဖြစ်ပါသည်။

---

## 📌 ၁။ လက်တွေ့ တပ်ဆင်ခဲ့သော Server အချက်အလက်များ

* **Live Domain:** [https://zinmeet-rn.truehand.top](https://zinmeet-rn.truehand.top)
* **Recordings Dashboard:** [https://zinmeet-rn.truehand.top/recordings](https://zinmeet-rn.truehand.top/recordings)
* **VPS Provider:** RackNerd (Ubuntu Linux)
* **Server IP:** `172.245.210.149`
* **Access Code (Meeting & Recording Unlock):** `Zinmeet456`
* **Backend Framework:** Node.js (Hono Framework) + Vite React PWA
* **Containerization:** Docker Compose
* **Web Server / SSL:** Host Nginx Reverse Proxy + Let's Encrypt SSL (Certbot)
* **WebRTC Network:** Cloudflare RealtimeKit
* **Recordings Storage:** VPS Local Hard Disk (`~/zin-cfmeeting/apps/server-vps/recordings/`)

---

## ⚠️ ၂။ ကြုံတွေ့ခဲ့ရသော အခက်အခဲ (၅) မျိုးနှင့် ဖြေရှင်းခဲ့သည့် နည်းလမ်းများ

### အခက်အခဲ (၁) - `.env` ဖိုင် မရှိသေးဘဲ Docker Run မိခြင်း
* **အခြေအနေ:** `sudo docker compose up -d --build` run သည့်အခါ `env file apps/server-vps/.env not found` ဆိုပြီး Error ပြခဲ့သည်။
* **ဖြေရှင်းချက်:** `apps/server-vps` ဖိုဒါထဲတွင် အောက်ပါအတိုင်း `.env` ဖိုင်ကို ရေးသားထည့်သွင်းပေးခဲ့သည်-

```bash
cat << 'EOF' > ~/zin-cfmeeting/apps/server-vps/.env
# Domain configuration
DOMAIN=zinmeet-rn.truehand.top

# Cloudflare RealtimeKit API Credentials
CF_ACCOUNT_ID=1fd15eea3027d60cc30686fde4935fb0
RTK_APP_ID=b6c79f6b-4355-469d-85b2-1b6da50c8169
CF_API_TOKEN=your_cloudflare_api_token_here

# Application Settings
APP_NAME=ZIN-Meeting
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
ALLOWED_ORIGINS=*

# Security & Access Control
CREATE_ACCESS_CODE=Zinmeet456
HOST_KEY_SECRET=cfmeeting_host_secret_key_2026_zin

# Presets
RTK_HOST_PRESET=cfmeeting_host
RTK_PARTICIPANT_PRESET=cfmeeting_participant
RTK_WEBINAR_HOST_PRESET=cfmeeting_webinar_host
RTK_WEBINAR_PARTICIPANT_PRESET=cfmeeting_webinar_participant

# Local VPS Storage Recording Settings
ALLOW_RECORDING=true
RECORDINGS_DIR=/app/recordings
AUTO_DOWNLOAD_RECORDINGS=true
SYNC_INTERVAL_SECS=30
EOF
```

---

### အခက်အခဲ (၂) - Port 80/443 နှင့် Port 3000 တိုက်မိခြင်း (Port Collisions)
* **အခြေအနေ:**
  1. Docker Compose ထဲရှိ Caddy Container က Port 80 ကို Bind လုပ်ရန် ကြိုးစားရာ Server ပေါ်တွင် အခြား Nginx Run နေသောကြောင့် `address already in use (Port 80)` ဖြစ်ခဲ့သည်။
  2. CFMeeting App Container ကို Host Port 3000 ပေးရာ Server ပေါ်တွင် အခြား Docker Container တစ်ခုက Port 3000 ကို အသုံးပြုနေသောကြောင့် `Port 3000 is already allocated` ဖြစ်ခဲ့သည်။
* **ဖြေရှင်းချက်:**
  1. Caddy ကို မသုံးတော့ဘဲ CFMeeting App Container ကို Localhost Port `3030` သို့ Mapping ပြောင်းလဲခဲ့သည် (`127.0.0.1:3030:3000`)။
  2. Host Nginx တွင် `zinmeet-rn.truehand.top` အတွက် Reverse Proxy Config ရေးပြီး Port 3030 သို့ လွှဲပေးခဲ့သည်။

```bash
# Nginx Configuration ရေးသားခြင်း
sudo tee /etc/nginx/conf.d/zinmeet-rn.conf << 'EOF'
server {
    listen 80;
    server_name zinmeet-rn.truehand.top;

    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Nginx Test လုပ်ပြီး Reload ပြုလုပ်ခြင်း
sudo nginx -t && sudo systemctl reload nginx

# Let's Encrypt SSL ရယူခြင်း
sudo certbot --nginx -d zinmeet-rn.truehand.top --non-interactive --agree-tos -m your-email@gmail.com
```

---

### အခက်အခဲ (၃) - Meeting Room ထဲတွင် Record ခလုတ် မပေါ်ခြင်း
* **အခြေအနေ:** Meeting ခန်းထဲ ရောက်သည့်အခါ Host ဖြစ်သော်လည်း `... (More)` Menu ထဲတွင် Record / Stop Record ခလုတ် ပျောက်နေခဲ့သည်။
* **ဖြေရှင်းချက်:** `apps/web/src/components/room/Room.tsx` ထဲတွင် Host Permissions စစ်ဆေးမှု (`canRecord`) နှင့် Recording စတင်/ရပ်တန့်သည့် API (`/api/meetings/:ref/recording/start`, `stop`) ကို ပြန်လည် ချိတ်ဆက်ထည့်သွင်းပေးခဲ့သည်။

---

### အခက်အခဲ (၄) - `/recordings` URL သို့ ဝင်ရာတွင် Home (`/`) သို့ Auto Redirect ဖြစ်သွားခြင်း
* **အခြေအနေ:** Browser မှ `https://zinmeet-rn.truehand.top/recordings` သို့ ဝင်ရောက်သည့်အခါ Service Worker နှင့် React Router ကြောင့် Home Page (`/`) သို့ ပြန်လည် ရောက်ရှိသွားခဲ့သည်။
* **ဖြေရှင်းချက်:**
  1. React App ထဲတွင် Dedicated `RecordingsPage.tsx` Component အသစ်ကို တည်ဆောက်ခဲ့သည်။
  2. `App.tsx` ထဲတွင် `<Route path="/recordings" element={<RecordingsPage />} />` လမ်းကြောင်းကို ထည့်သွင်းပေးခဲ့သည်။
  3. Header Bar တွင်လည်း 🎥 Video Icon ဖြင့် အလွယ်တကူ ဝင်ရောက်နိုင်သော Navigation Button ထည့်သွင်းပေးခဲ့သည်။

---

### အခက်အခဲ (၅) - Record ဖိုင်များ ဖျက်ခြင်းနှင့် Auto-Sync ပြန်မဆွဲစေရန် ကာကွယ်ခြင်း
* **အခြေအနေ:** VPS Storage ပြည့်မသွားစေရန်နှင့် မလိုလားအပ်သော Record ဖိုင်များကို ဖျက်နိုင်ရန် လိုအပ်ခဲ့သည်။ သို့သော် ဖိုင်ဖျက်လိုက်ပါက နောက် ၃၀ စက္ကန့်အကြာတွင် Cloudflare Background Sync က ထိုဖိုင်ကို ပြန်လည် Download ဆွဲယူလာနိုင်သည့် ပြဿနာ ရှိခဲ့သည်။
* **ဖြေရှင်းချက်:**
  1. **Tombstone Tracking System:** `RecordingManager` တွင် ဖျက်လိုက်သော Recording ID များကို `.deleted.json` ထဲတွင် အလိုအလျောက် မှတ်သားစေပြီး နောက်ပိုင်း Sync ပြုလုပ်ရာတွင် ထိုဖိုင်များကို ကျော်သွားစေရန် (Skip) ပြုလုပ်ခဲ့သည်။
  2. **Single & Batch Delete API:** `DELETE /api/vps/recordings/:filename` နှင့် `POST /api/vps/recordings/delete-batch` Endpoint များကို ထည့်သွင်းခဲ့သည်။
  3. **User-Friendly UI:** Recordings Dashboard တွင် တစ်ခုချင်း ဖျက်နိုင်သော 🗑️ Delete ခလုတ်အပြင် အများအပြား ရွေးချယ်ဖျက်နိုင်သည့် `Select Mode (Select All / Delete Selected)` ကိုပါ ထည့်သွင်းပေးခဲ့သည်။

---

## 🚀 ၃။ Fresh VPS အသစ်တွင် A to Z Setup လုပ်နည်း (Step-by-Step)

အကယ်၍ VPS အသစ်တစ်ခုတွင် ထပ်မံ တပ်ဆင်လိုပါက အောက်ပါ အဆင့် ၅ ဆင့်အတိုင်း ဆောင်ရွက်နိုင်ပါသည်-

### အဆင့် (၁) - VPS System Update နှင့် Docker သွင်းပါ
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### အဆင့် (၂) - Source Code ကို Clone ဆွဲပါ
```bash
git clone https://github.com/uzinlay85/zin-cfmeeting.git ~/zin-cfmeeting
cd ~/zin-cfmeeting/apps/server-vps
```

### အဆင့် (၃) - `.env` ဖိုင် တည်ဆောက်ပါ
```bash
cat << 'EOF' > .env
DOMAIN=meet.yourdomain.com
CF_ACCOUNT_ID=1fd15eea3027d60cc30686fde4935fb0
RTK_APP_ID=b6c79f6b-4355-469d-85b2-1b6da50c8169
CF_API_TOKEN=your_token_here
APP_NAME=ZIN-Meeting
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
ALLOWED_ORIGINS=*
CREATE_ACCESS_CODE=Zinmeet456
HOST_KEY_SECRET=your_host_secret_key_here
RTK_HOST_PRESET=cfmeeting_host
RTK_PARTICIPANT_PRESET=cfmeeting_participant
RTK_WEBINAR_HOST_PRESET=cfmeeting_webinar_host
RTK_WEBINAR_PARTICIPANT_PRESET=cfmeeting_webinar_participant
ALLOW_RECORDING=true
RECORDINGS_DIR=/app/recordings
AUTO_DOWNLOAD_RECORDINGS=true
SYNC_INTERVAL_SECS=30
EOF
```

### အဆင့် (၄) - Docker Container စတင် Run ပါ
```bash
cd ~/zin-cfmeeting/apps/server-vps
sudo docker compose up -d --build app
```

### အဆင့် (၅) - Nginx Reverse Proxy နှင့် SSL တပ်ဆင်ပါ
```bash
# Nginx Config ဖိုင် ဆောက်လုပ်ခြင်း
sudo tee /etc/nginx/conf.d/cfmeeting.conf << 'EOF'
server {
    listen 80;
    server_name meet.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Nginx Reload
sudo nginx -t && sudo systemctl reload nginx

# SSL Certificate ရယူခြင်း
sudo certbot --nginx -d meet.yourdomain.com
```

---

## 🛠️ ၄။ နေ့စဉ် အသုံးဝင်သော Command များ (Daily Operations)

### (က) Container အခြေအနေနှင့် Health စစ်ဆေးရန်
```bash
# Docker Container စစ်ဆေးခြင်း
sudo docker ps | grep server-vps

# Server API ကျန်းမာရေး စစ်ဆေးခြင်း
curl -s http://127.0.0.1:3030/api/health
```

### (ခ) သိမ်းထားသော Recording MP4 ဖိုင်များ စစ်ဆေးရန်
```bash
ls -lh ~/zin-cfmeeting/apps/server-vps/recordings/
```

### (ဂ) Live Logs ကြည့်ရှုရန် (အမှားအယွင်း စစ်ဆေးခြင်း)
```bash
cd ~/zin-cfmeeting/apps/server-vps
sudo docker compose logs -f --tail=50 app
```

### (င) Recording ဖိုင် အမည်ပေးပုံစံ (Human-Friendly Naming Format)
Cloudflare Background Sync Service မှ VPS Hard Disk သို့ MP4 ဖိုင်များ ဒေါင်းလုဒ်ဆွဲသည့်အခါ အောက်ပါအတိုင်း အစည်းအဝေးခေါင်းစဉ်၊ ရက်စွဲနှင့် အချိန်ဖြင့် စနစ်တကျ အမည်ပေးသိမ်းဆည်းပါသည်:

- **ပုံစံ (Format):** `[MeetingTitle]_[YYYY-MM-DD]_[HH-mm-ss]_[ShortID].mp4`
- **ဥပမာ (Example):** `General_Meeting_2026-09-11_21-35-10_fff37534.mp4`
- ဖိုင်တစ်ခုချင်းစီအတွက် RealtimeKit အချက်အလက်များကို enriched `.json` metadata ဖိုင်အဖြစ်ပါ သိမ်းဆည်းပေးထားပါသည်။

---

## 🔄 ၅။ နောင်တွင် Code အသစ်များ Update ပြုလုပ်နည်း (One-liner Update)

GitHub ပေါ်တွင် Code အပြောင်းအလဲများ ရှိပါက VPS ပေါ်တွင် အောက်ပါ command ဖြင့် စက္ကန့်ပိုင်းအတွင်း Update ပြုလုပ်နိုင်ပါသည်:

```bash
cd ~/zin-cfmeeting && git pull origin main && cd apps/server-vps && sudo docker compose up -d --build app
```

---

[⬅️ မူရင်း မြန်မာဘာသာ မာတိကာသို့ ပြန်သွားရန်](README.md)
