# 💬 Snikket - Private Messaging & Voice/Video Call - VPS တပ်ဆင်အသုံးပြုနည်း အပြည့်အစုံ လမ်းညွှန် (Snikket Setup Guide)

ဤမှတ်တမ်းသည် **Snikket (Modern XMPP Messaging + Voice & Video Call)** ကို Linux VPS (Ubuntu/Debian) ပေါ်တွင် **Docker Compose + Nginx Reverse Proxy + Auto-Renewing SSL** ဖြင့် လက်တွေ့ အောင်မြင်စွာ တပ်ဆင်အသုံးပြုခဲ့သည့် မှတ်တမ်းအပြည့်အစုံ ဖြစ်ပါသည်။

---

## 🌟 ၁။ Snikket မိတ်ဆက်နှင့် အားသာချက်များ (Overview & Benefits)

**Snikket** သည် WhatsApp / Signal ကဲ့သို့ အသုံးပြုရလွယ်ကူပြီး ကိုယ်ပိုင် VPS ပေါ်တွင် ၁၀၀% လုံခြုံစွာ Run နိုင်သော Open-Source Private Messaging & Calling Platform ဖြစ်ပါသည်။

### ✨ အဓိက အားသာချက်များ:
* **🇲🇲 မြန်မာပြည်အတွက် VPN လုံးဝ မလိုခြင်း:** စာတိုများ၊ ဖိုင်များနှင့် Voice/Video Call Stream များအားလုံးသည် မိမိ VPS ဆီသို့ တိုက်ရိုက် သွားရောက် ဆက်သွယ်သောကြောင့် **VPN ပိတ်ထားချိန်တွင်ပင် ကြည်လင်စွာ အသုံးပြုနိုင်ပါသည်**။
* **⚡ အလွန်ပေါ့ပါးသော Resource:** Server RAM **50MB - 80MB ခန့်သာ** သုံးစွဲသောကြောင့် လက်ရှိ VPS ပေါ်တွင် အခြား Service များနှင့်အတူ အလွန်ပေါ့ပါးစွာ Run နိုင်ပါသည်။
* **🔒 End-to-End Encryption (E2EE):** စာတိုများနှင့် ဖုန်းခေါ်ဆိုမှုများအားလုံးကို အဆင့်မြင့် Cryptography စနစ်ဖြင့် သိမ်းဆည်းသောကြောင့် Server ပိုင်ရှင်ကိုယ်တိုင်ပင် ဖတ်ရှုခိုးယူ၍ မရနိုင်ပါ။
* **📞 Voice & Video Call ပါဝင်ခြင်း:** စာပို့ရုံသာမက WhatsApp ကဲ့သို့ပင် **HD Voice Call နှင့် Video Call** တိုက်ရိုက် ခေါ်ဆိုနိုင်ပါသည်။
* **📱 အသုံးပြုရ လွယ်ကူမှု:** Invite Link သို့မဟုတ် QR Code scan ဖတ်လိုက်ရုံဖြင့် ဖုန်းထဲတွင် ချက်ချင်း အကောင့်ဖွင့် သုံးနိုင်ပါသည်။ (Android & iOS App အပြည့်အစုံ ရှိပါသည်)။

---

## 🖥️ ၂။ လက်တွေ့ တပ်ဆင်ခဲ့သော Server အချက်အလက်များ (Live Architecture)

* **ပင်မ Live Chat Domain:** [`https://chat.truehand.top`](https://chat.truehand.top)
* **Group Chat Domain:** `groups.chat.truehand.top` (CNAME -> `chat.truehand.top`)
* **File Sharing Domain:** `share.chat.truehand.top` (CNAME -> `chat.truehand.top`)
* **VPS Server IP:** `172.245.210.149` (RackNerd VPS)
* **Web Reverse Proxy:** Nginx (`/etc/nginx/conf.d/snikket.conf`)
* **Snikket Config Directory:** `/etc/snikket`
* **Port Mappings (Reverse Proxy Mode):**
  - Web HTTP Port: `5080` (`SNIKKET_TWEAK_HTTP_PORT=5080`)
  - Web HTTPS Port: `5443` (`SNIKKET_TWEAK_HTTPS_PORT=5443`)
* **Open System Ports (Firewall):**
  - XMPP Client/Server: `5222/tcp`, `5269/tcp`
  - STUN / TURN (Voice & Video Calls): `3478/udp`, `5349/tcp`, `50000:50100/udp`

---

## 🚀 ၃။ Fresh VPS တွင် A to Z Setup လုပ်နည်း အဆင့်ဆင့် (Step-by-Step Installation)

### အဆင့် (၁) - DNS Subdomain (၃) ခု ချိတ်ဆက်ခြင်း

Cloudflare DNS Dashboard တွင် အောက်ပါ Records (၃) ခုကို ထည့်သွင်းပါ (Proxy Status ကို **DNS Only / Grey Cloud ☁️** ထားပေးပါ):

| Type | Name | Content / Target | Proxy Status |
| :--- | :--- | :--- | :--- |
| **A** | `chat` | `172.245.210.149` (မိမိ VPS IP) | DNS only ☁️ |
| **CNAME** | `groups.chat` | `chat.truehand.top` | DNS only ☁️ |
| **CNAME** | `share.chat` | `chat.truehand.top` | DNS only ☁️ |

---

### အဆင့် (၂) - Firewall (UFW) တွင် Chat & Call Ports များ ဖွင့်ပေးခြင်း

VPS Terminal (SSH) ထဲတွင် အောက်ပါအတိုင်း run ပါ:

```bash
# XMPP Messaging Ports
sudo ufw allow 5222/tcp
sudo ufw allow 5269/tcp

# Voice & Video Call (STUN / TURN) Media Ports
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 50000:50100/udp

# Firewall Reload
sudo ufw reload
```

---

### အဆင့် (၃) - Snikket Configuration ပြင်ဆင်ခြင်း

Port 80/443 ကို Nginx က သုံးထားပြီးဖြစ်၍ Snikket ကို Port `5080` နှင့် `5443` သို့ ပြောင်းလဲသတ်မှတ်ပါမည်:

```bash
# 1. Directory ဆောက်ပြီး docker-compose.yml ဒေါင်းလုဒ်ဆွဲပါ
sudo mkdir -p /etc/snikket && cd /etc/snikket
sudo curl -o docker-compose.yml https://snikket.org/service/resources/docker-compose.yml

# 2. snikket.conf ဖိုင် ဖန်တီးပါ
sudo tee /etc/snikket/snikket.conf > /dev/null << 'EOF'
# ပင်မ Domain
SNIKKET_DOMAIN=chat.truehand.top

# Admin Email (Let's Encrypt SSL အတွက် အီးမေးလ်အစစ် ဖြစ်ရပါမည်)
SNIKKET_ADMIN_EMAIL=uzinlay@gmail.com

# Nginx နှင့် Port မတိုက်စေရန် Port 5080/5443 သို့ လွှဲခြင်း
SNIKKET_TWEAK_HTTP_PORT=5080
SNIKKET_TWEAK_HTTPS_PORT=5443
EOF
```

---

### အဆင့် (၄) - Nginx Reverse Proxy Configuration သတ်မှတ်ခြင်း

```bash
sudo tee /etc/nginx/conf.d/snikket.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name chat.truehand.top groups.chat.truehand.top share.chat.truehand.top;

    location / {
        proxy_pass http://127.0.0.1:5080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}

server {
    listen 443 ssl;
    server_name chat.truehand.top groups.chat.truehand.top share.chat.truehand.top;

    # Snikket Certificate Directory (Docker volume ထဲမှ တိုက်ရိုက်ယူသည်)
    ssl_certificate /var/lib/docker/volumes/snikket_snikket_data/_data/letsencrypt/live/chat.truehand.top/fullchain.pem;
    ssl_certificate_key /var/lib/docker/volumes/snikket_snikket_data/_data/letsencrypt/live/chat.truehand.top/privkey.pem;

    location / {
        proxy_pass https://127.0.0.1:5443;
        proxy_ssl_verify off;
        proxy_ssl_server_name on;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSockets & BOSH Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 100M;
        proxy_read_timeout 900s;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx
```

---

### အဆင့် (၅) - Snikket စတင် Run ခြင်းနှင့် Admin Invite Link ရယူခြင်း

```bash
cd /etc/snikket
sudo docker compose up -d
```

စက္ကန့် ၃၀ ခန့်အကြာတွင် Container များ အားလုံး အဆင်သင့်ဖြစ်ပါက Admin Invitation URL ကို ထုတ်ယူပါ:

```bash
sudo docker exec snikket create-invite --admin --group default
```

ထုတ်ပေးလာသော Invitation Link (ဥပမာ `https://chat.truehand.top/invite/...`) ကို Browser တွင် ဖွင့်ပြီး Admin Account စတင် ဖွင့်လှစ်နိုင်ပါပြီ။

---

## 📱 ၄။ အသုံးပြုနည်း လမ်းညွှန် (User Guide)

1. ဖုန်းထဲတွင် **Snikket** App ကို သွင်းပါ:
   - **Android:** Google Play Store သို့မဟုတ် F-Droid မှ [Snikket](https://play.google.com/store/apps/details?id=org.snikket.android) ကို ဒေါင်းလုဒ်ဆွဲပါ။
   - **iOS (iPhone/iPad):** App Store မှ [Snikket](https://apps.apple.com/app/snikket/id1545164649) ကို ဒေါင်းလုဒ်ဆွဲပါ။
2. ကွန်ပျူတာ သို့မဟုတ် ဖုန်း Browser တွင် ပေါ်လာသော **QR Code** ကို Snikket App ဖြင့် Scan ဖတ်လိုက်ရုံဖြင့် အကောင့်တန်းဝင်သွားပါမည်။
3. **Voice & Video Call ခေါ်ဆိုခြင်း:** Contact စာရင်းထဲမှ မိတ်ဆွေကို ရွေးချယ်ပြီး ညာဘက်အပေါ်ထောင့်ရှိ Phone သို့မဟုတ် Camera အိုင်ကွန်ကို နှိပ်၍ တိုက်ရိုက် Call ခေါ်ဆိုနိုင်ပါသည်။

---

## ⚠️ ၅။ လက်တွေ့ကြုံတွေ့ခဲ့ရသော ပြဿနာများနှင့် ဖြေရှင်းချက်များ (Real-World Troubleshooting)

### ပြဿနာ (၁) - `snikket-certs` မှ `invalid email address` ဟု ပြပြီး SSL မရရှိခြင်း
* **အကြောင်းရင်း:** `snikket.conf` ထဲတွင် `zinko@example.com` ကဲ့သို့ စမ်းသပ်စာသား ထည့်ထားပါက Let's Encrypt Server က ပယ်ချပါသည်။
* **ဖြေရှင်းချက်:** `SNIKKET_ADMIN_EMAIL=uzinlay@gmail.com` ဟု တကယ့် Email အစစ် ထည့်သွင်းပြီး `sudo docker compose down && sudo docker compose up -d` ဖြင့် ပြန်လည် စတင်ပေးရပါသည်။

### ပြဿနာ (၂) - Nginx နှင့် Port 80/443 တိုက်ခြင်း
* **အကြောင်းရင်း:** Snikket သည် Default အားဖြင့် Host ၏ Port 80/443 ကို ယူရန် ကြိုးစားသဖြင့် လက်ရှိ Nginx ရှိနေပါက Conflict ဖြစ်ပါသည်။
* **ဖြေရှင်းချက်:** `SNIKKET_TWEAK_HTTP_PORT=5080` နှင့် `SNIKKET_TWEAK_HTTPS_PORT=5443` သတ်မှတ်ပြီး Nginx မှတဆင့် Proxy Pass လုပ်ပေးရပါသည်။

---

## 🛠️ ၆။ နေ့စဉ် အသုံးဝင်သော Maintenance Command များ

### (က) Invite Link အသစ်များ ထုတ်ယူရန်
```bash
# သာမန် User ဖိတ်ခေါ် Link ထုတ်ရန်
sudo docker exec snikket create-invite

# Admin User ဖိတ်ခေါ် Link ထုတ်ရန်
sudo docker exec snikket create-invite --admin --group default
```

### (ခ) Container Logs ကြည့်ရှုရန်
```bash
# Server Logs
sudo docker logs snikket -f --tail=50

# Cert Manager Logs
sudo docker logs snikket-certs -f --tail=50
```

### (ဂ) Service ကို Restart ပြုလုပ်ရန်
```bash
cd /etc/snikket
sudo docker compose restart
```

### (ဃ) Snikket ကို Version အသစ်သို့ Update ပြုလုပ်ရန်
```bash
cd /etc/snikket
sudo docker compose pull
sudo docker compose down
sudo docker compose up -d
```

---

[⬅️ မြန်မာဘာသာ မာတိကာသို့ ပြန်သွားရန်](README.md)
