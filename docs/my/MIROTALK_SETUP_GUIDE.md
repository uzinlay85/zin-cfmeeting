# 🎥 MiroTalk SFU (Mediasoup) - VPS တပ်ဆင်အသုံးပြုနည်း အပြည့်အစုံ လမ်းညွှန် (MiroTalk SFU Setup Guide)

ဤမှတ်တမ်းသည် **MiroTalk SFU (Selective Forwarding Unit / Mediasoup Multi-Party Grid)** ကို Linux VPS (Ubuntu/Debian) ပေါ်တွင် **Docker Compose + Nginx Reverse Proxy + Let's Encrypt SSL (HTTPS)** ဖြင့် လက်တွေ့အောင်မြင်စွာ တပ်ဆင်အသုံးပြုခဲ့သည့် မှတ်တမ်းအပြည့်အစုံ ဖြစ်ပါသည်။

---

## 🌟 ၁။ MiroTalk SFU မိတ်ဆက်နှင့် P2P နှင့် ကွာခြားချက်များ

### (က) MiroTalk SFU ဆိုတာ ဘာလဲ?
**MiroTalk SFU** သည် ကမ္ဘာ့အဆင့်မီ **Mediasoup SFU** အင်ဂျင်ကို အခြေခံထားသော High-Performance Multi-Party Video Conferencing စနစ် ဖြစ်ပါသည်။ 

### (ခ) MiroTalk P2P နှင့် MiroTalk SFU မည်သို့ ကွာခြားသလဲ?

| အချက်အလက် | MiroTalk P2P (`mirotalk/p2p`) | MiroTalk SFU (`mirotalk/sfu`) |
| :--- | :--- | :--- |
| **ဗိသုကာပုံစံ (Architecture)** | Peer-to-Peer (စက်အချင်းချင်း တိုက်ရိုက်ချိတ်ဆက်) | Selective Forwarding Unit (ဗဟို Server မှ ဖြန့်ဝေ) |
| **ပါဝင်နိုင်သူ ဦးရေ** | ၂ ဦးမှ ၄ ဦးခန့်သာ အဆင်ပြေ (လူများပါက နှေးကွေး) | **လူအများအပြား (Grid View / Gallery View) ချောမွေ့စွာ သုံးနိုင်** |
| **အင်တာနက် Upload သုံးစွဲမှု** | တစ်ဦးစီတိုင်းဆီ Upload တိုက်ရိုက်လှမ်းပို့ရသဖြင့် Bandwidth အလွန်ကုန်ကျ | Server ဆီသို့ မိမိ Video Stream (၁) ခုတည်းသာ ပို့ရသဖြင့် **Upload Bandwidth အလွန်သက်သာ** |
| **စက်ပစ္စည်း ဝန်ထုပ်ဝန်ပိုး** | ဖုန်း/ကွန်ပျူတာ CPU နှင့် Battery အလွန်ပူ/စားနိုင် | Client ဘက်တွင် ပေါ့ပါးသွက်လက် |
| **Port လိုအပ်ချက်** | Signaling Port သာ လိုအပ် | Web Signaling Port အပြင် **WebRTC Media Ports (UDP/TCP)** လိုအပ် |

---

## 🇲🇲 ၂။ မြန်မာပြည်အတွက် အဓိက အားသာချက်များ

* **VPN လုံးဝ မလိုခြင်း:** Video/Audio နှင့် Media Stream အားလုံးသည် မိမိကိုယ်ပိုင် VPS သို့ တိုက်ရိုက် ဆက်သွယ်သောကြောင့် ISP များ၏ DPI/Firewall ပိတ်ဆို့မှုကို လွတ်ကင်းပြီး **VPN ပိတ်ထားချိန်တွင်ပင် ကြည်လင်ပြတ်သားစွာ အသုံးပြုနိုင်ပါသည်**။
* **End-to-End Privacy:** Third-party Cloud များဆီသို့ ဒေတာများ မရောက်ဘဲ မိမိ VPS ပေါ်တွင်သာ လုံခြုံစွာ ရှိနေပါသည်။
* **ပါဝင်သော Features များ:**
  - Multi-Party HD Video / Audio Grid
  - Screen Sharing (အသံပါ မျှဝေနိုင်ခြင်း)
  - **Local Recording (Browser ထဲသို့ တိုက်ရိုက် Record ဆွဲယူသိမ်းဆည်းနိုင်ခြင်း)**
  - Interactive Whiteboard (ကျောက်သင်ပုန်း ရေးဆွဲပြသခြင်း)
  - Group Chat & File Sharing
  - Polls / Voting စနစ်
  - Room Moderation (Mute All, Ban, Eject)
  - Mobile Browser & PWA Support (ဖုန်းတွင် Application ကဲ့သို့ သွင်းယူသုံးနိုင်ခြင်း)

---

## 🖥️ ၃။ လက်တွေ့ တပ်ဆင်ခဲ့သော Server အချက်အလက်များ (Live Architecture)

* **တရားဝင် Live Domain:** [`https://miro.truehand.top`](https://miro.truehand.top)
* **VPS Server IP:** `172.245.210.149` (RackNerd VPS)
* **Docker Image:** `mirotalk/sfu:latest`
* **Container Port Mapping:**
  - Web & Signaling: `127.0.0.1:3040 -> 3010` (Container အတွင်း Port `3010` ကို Host ၏ Port `3040` သို့ ချိတ်ထားသည်)
  - WebRTC Media Ports: `40000-40100:40000-40100/udp` နှင့် `40000-40100:40000-40100/tcp`
* **Nginx Reverse Proxy:** SSL Termination ပြုလုပ်ပြီး Container ၏ HTTPS internal port ဆီသို့ Proxy လှမ်းချိတ်သည် (`proxy_pass https://127.0.0.1:3040;` + `proxy_ssl_verify off;`)
* **SSL Certificate:** Let's Encrypt Free SSL (Certbot)

---

## 🚀 ၄။ Fresh VPS တွင် A to Z Setup လုပ်နည်း အဆင့်ဆင့် (Step-by-Step Installation)

### အဆင့် (၁) - DNS Subdomain ချိတ်ဆက်ခြင်း
မိမိ၏ DNS Provider (ဥပမာ Cloudflare) တွင် Record ထည့်ပါ:
* **Type:** `A`
* **Name:** `miro` (သို့မဟုတ် မိမိစိတ်ကြိုက် subdomain)
* **IPv4 Address:** `172.245.210.149` (မိမိ VPS Public IP)
* **Proxy Status:** DNS Only (Grey Cloud ☁️)

---

### အဆင့် (၂) - Firewall (UFW) တွင် WebRTC Media Ports ဖွင့်ပေးခြင်း

MiroTalk SFU တွင် ဗီဒီယို/အသံ အပြန်အလှန် ပို့ဆောင်နိုင်ရန် Mediasoup Media Ports များကို Firewall တွင် ခွင့်ပြုပေးရပါမည်:

```bash
sudo ufw allow 40000:40100/udp
sudo ufw allow 40000:40100/tcp
sudo ufw reload
```

---

### အဆင့် (၃) - Docker Compose ဖိုင် ဖန်တီးခြင်း

```bash
# 1. Directory ဆောက်ပြီး ဝင်ပါ
mkdir -p ~/mirotalk && cd ~/mirotalk

# 2. docker-compose.yml ဖိုင် ဖန်တီးပါ
cat << 'EOF' > ~/mirotalk/docker-compose.yml
services:
  mirotalk:
    image: mirotalk/sfu:latest
    container_name: mirotalk-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:3040:3010"
      - "40000-40100:40000-40100/udp"
      - "40000-40100:40000-40100/tcp"
    environment:
      - MEDIASOUP_LISTEN_IP=0.0.0.0
      - MEDIASOUP_ANNOUNCED_IP=172.245.210.149
      - MEDIASOUP_MIN_PORT=40000
      - MEDIASOUP_MAX_PORT=40100
EOF
```

> **မှတ်ချက်:** `MEDIASOUP_ANNOUNCED_IP` နေရာတွင် မိမိ VPS ၏ Public IP ကို ထည့်ပေးရပါမည်။ သို့မှသာ အင်တာနက်ပြင်ပမှ User များ အသံ/ဗီဒီယို Stream ကို တိုက်ရိုက် ဖလှယ်နိုင်မည် ဖြစ်ပါသည်။

---

### အဆင့် (၄) - Nginx Reverse Proxy Configuration သတ်မှတ်ခြင်း

MiroTalk SFU Container သည် အတွင်းပိုင်းတွင် Self-signed SSL ဖြင့် **`https://` on port `3010`** Run ထားသောကြောင့် Nginx မှ `proxy_pass https://...` ဖြင့် ချိတ်ဆက်ရပါသည်:

```bash
sudo tee /etc/nginx/conf.d/miro.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name miro.truehand.top;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name miro.truehand.top;

    ssl_certificate /etc/letsencrypt/live/miro.truehand.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/miro.truehand.top/privkey.pem;

    location / {
        proxy_pass https://127.0.0.1:3040;
        proxy_ssl_verify off;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF
```

Nginx Syntax စစ်ဆေးပြီး Reload လုပ်ပါ:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

> **မှတ်ချက်:** အကယ်၍ SSL Certificate မရှိသေးပါက `sudo certbot --nginx -d miro.truehand.top` ဖြင့် အလွယ်တကူ ရယူနိုင်ပါသည်။

---

### အဆင့် (၅) - MiroTalk SFU Container ကို Run ခြင်း

```bash
# အရင် container အဟောင်း ရှိနေပါက ရှင်းလင်းပါ
sudo docker rm -f mirotalk-app 2>/dev/null || true

# MiroTalk SFU ကို စတင် Run ပါ
cd ~/mirotalk
sudo docker compose up -d
```

Container အခြေအနေ စစ်ဆေးရန်:
```bash
sudo docker compose ps
```
`Up ... (healthy/running)` ဟု ပြသနေပါက အောင်မြင်စွာ အလုပ်လုပ်နေပါပြီ။

---

## ⚠️ ၅။ လက်တွေ့ကြုံတွေ့ခဲ့ရသော ပြဿနာများနှင့် ဖြေရှင်းချက်များ (Real-World Gotchas)

### ပြဿနာ (၁) - `502 Bad Gateway` ဖြစ်ပေါ်ရသည့် အကြောင်းရင်းများ
1. **Container Port ကွဲပြားမှု:**
   - MiroTalk P2P သည် Container အတွင်း Port `3000` ကို သုံးသော်လည်း **MiroTalk SFU သည် Port `3010` ကို အသုံးပြုပါသည်**။
   - **ဖြေရှင်းချက်:** Docker port mapping ကို `127.0.0.1:3040:3010` ဟု ပြောင်းလဲပေးခဲ့ရပါသည်။
2. **Container Protocol (HTTPS vs HTTP):**
   - MiroTalk SFU သည် Container အတွင်းပိုင်း၌ self-signed SSL ဖြင့် `https://localhost:3010` အဖြစ် Run ပါသည်။ Nginx မှ `http://` ဖြင့် ချိတ်ဆက်ပါက 502 Error ဖြစ်ပေါ်ပါသည်။
   - **ဖြေရှင်းချက်:** Nginx ထဲတွင် `proxy_pass https://127.0.0.1:3040;` နှင့် `proxy_ssl_verify off;` ထည့်သွင်းပေးခဲ့ရပါသည်။

### ပြဿနာ (၂) - Container Name Conflict Error
- Docker compose recreate လုပ်ချိန်တွင် `Error response from daemon: Conflict. The container name "/mirotalk-app" is already in use` ဟု ပေါ်တတ်ပါသည်။
- **ဖြေရှင်းချက်:** `sudo docker rm -f mirotalk-app` ဖြင့် အရင် ဖယ်ရှားပြီးမှ `sudo docker compose up -d` ပြန် run ရပါမည်။

### ပြဿနာ (၃) - Video/Audio မကြားရခြင်း သို့မဟုတ် ချိတ်မရခြင်း
- Mediasoup သည် Signaling အပြင် Media (RTP/RTCP) အတွက် UDP ports များကို အသုံးပြုပါသည်။
- **ဖြေရှင်းချက်:** `MEDIASOUP_ANNOUNCED_IP` တွင် မိမိ Public IP မှန်ကန်စွာ ထည့်သွင်းထားရမည်ဖြစ်ပြီး VPS Firewall တွင် `40000:40100/udp` ဖွင့်ထားပေးရပါမည်။

---

## 🛠️ ၆။ နေ့စဉ် အသုံးဝင်သော Maintenance Command များ

### (က) Container Logs ကြည့်ရှုရန်
```bash
cd ~/mirotalk
sudo docker compose logs -f --tail=50
```

### (ခ) MiroTalk SFU ကို Restart လုပ်ရန်
```bash
cd ~/mirotalk
sudo docker compose restart
```

### (ဂ) MiroTalk SFU ကို Update ပြုလုပ်ရန်
```bash
cd ~/mirotalk
sudo docker compose pull
sudo docker rm -f mirotalk-app
sudo docker compose up -d
```

### (ဃ) Container ကို ခေတ္တ ပိတ်ထားရန် / ပြန်ဖွင့်ရန်
```bash
# ရပ်တန့်ရန်
sudo docker compose down

# ပြန်ဖွင့်ရန်
sudo docker compose up -d
```

---

[⬅️ မြန်မာဘာသာ မာတိကာသို့ ပြန်သွားရန်](README.md)
