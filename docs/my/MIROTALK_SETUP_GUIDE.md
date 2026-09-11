# 🎥 MiroTalk WebRTC - VPS တပ်ဆင်အသုံးပြုနည်း အပြည့်အစုံ လမ်းညွှန် (MiroTalk Setup Guide)

ဤမှတ်တမ်းသည် **MiroTalk (WebRTC P2P)** ကို Linux VPS (Ubuntu/Debian) ပေါ်တွင် **Docker Compose + Nginx Reverse Proxy + Let's Encrypt SSL (HTTPS)** ဖြင့် အလွယ်ကူဆုံးနှင့် အပေါ့ပါးဆုံး တပ်ဆင်အသုံးပြုခဲ့သည့် လက်တွေ့ မှတ်တမ်းအပြည့်အစုံ ဖြစ်ပါသည်။

---

## 🌟 ၁။ MiroTalk မိတ်ဆက်နှင့် အားသာချက်များ (Overview & Benefits)

**MiroTalk** သည် 100% Free & Open-Source ဖြစ်ပြီး Node.js + WebRTC နည်းပညာဖြင့် တည်ဆောက်ထားသော ခေတ်မီ Video Conferencing စနစ် ဖြစ်ပါသည်။

### ✨ အဓိက အားသာချက်များ:
* **🇲🇲 မြန်မာပြည်အတွက် VPN လုံးဝ မလိုခြင်း:** Video/Audio Data အားလုံးသည် မိမိ VPS ဆီသို့ တိုက်ရိုက် သွားရောက် ဆက်သွယ်သောကြောင့် မြန်မာ ISP Firewall များ၏ ပိတ်ဆို့မှုကို ခံရခြင်းမရှိဘဲ **VPN ပိတ်ထားချိန်တွင်ပင် ကြည်လင်စွာ အသုံးပြုနိုင်ပါသည်**။
* **⚡ အလွန်ပေါ့ပါးသော Resource:** Jitsi Meet ကဲ့သို့ RAM 4GB-8GB မလိုဘဲ **1 vCPU / 512MB - 1GB RAM VPS** ဖြင့်ပင် အလွန်ပေါ့ပါးစွာ Run နိုင်ပါသည်။
* **🔒 လုံခြုံရေးနှင့် သီးသန့်ဖြစ်မှု (Privacy):** Third-party Cloud များသို့ မသွားဘဲ မိမိကိုယ်ပိုင် VPS ပေါ်တွင်သာ အပြည့်အဝ ထိန်းချုပ်ထားနိုင်ပါသည်။
* **🛠️ ပါဝင်သော စွမ်းဆောင်ရည်များ:**
  - Video / Audio HD Call
  - Screen Sharing (မျက်နှာပြင် မျှဝေခြင်း)
  - **Local Recording (အသံ/ဗီဒီယိုကို Browser ထဲသို့ တိုက်ရိုက် Record ဆွဲသိမ်းနိုင်ခြင်း)**
  - Interactive Whiteboard (ကျောက်သင်ပုန်း ရေးဆွဲပြသနိုင်ခြင်း)
  - Group Chat & File Sharing
  - Mobile Browser & PWA Support (ဖုန်းတွင် App ကဲ့သို့ သွင်းယူသုံးနိုင်ခြင်း)

---

## 🖥️ ၂။ လက်တွေ့ တပ်ဆင်ခဲ့သော Server အချက်အလက်များ (Live Architecture)

* **တရားဝင် Live Domain:** [`https://miro.truehand.top`](https://miro.truehand.top)
* **VPS Server IP:** `172.245.210.149` (RackNerd VPS)
* **Container Port Mapping:** `127.0.0.1:3040 -> 3000` (Container အတွင်း 3000 ကို Host ၏ Port 3040 သို့ ချိတ်ထားသည်)
* **Web Server:** Nginx Reverse Proxy (WebSocket Proxy Headers ပါဝင်သည်)
* **SSL Certificate:** Let's Encrypt Free SSL (Certbot)
* **Docker Image:** `mirotalk/p2p:latest`

---

## 🚀 ၃။ Fresh VPS တွင် A to Z Setup လုပ်နည်း အဆင့်ဆင့် (Step-by-Step Installation)

### အဆင့် (၁) - DNS Subdomain ချိတ်ဆက်ခြင်း
မိမိ၏ Domain Provider (Cloudflare / Namecheap စသည်) ထဲတွင် Subdomain အသစ် ထည့်ပါ:
* **Type:** `A`
* **Name:** `miro` (သို့မဟုတ် မိမိစိတ်ကြိုက် subdomain)
* **IPv4 Address:** `172.245.210.149` (မိမိ VPS IP)
* **Proxy Status:** DNS Only (Grey Cloud ☁️)

---

### အဆင့် (၂) - MiroTalk Directory နှင့် Docker Compose ဖန်တီးခြင်း
VPS Terminal (SSH) သို့ ဝင်ရောက်ပြီး အောက်ပါ command များကို Run ပါ:

```bash
# 1. MiroTalk Directory ဖန်တီးပြီး ဝင်ရောက်ပါ
mkdir -p ~/mirotalk && cd ~/mirotalk

# 2. docker-compose.yml ဖိုင် ဖန်တီးပါ
cat << 'EOF' > docker-compose.yml
services:
  mirotalk:
    image: mirotalk/p2p:latest
    container_name: mirotalk-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:3040:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0
EOF
```

---

### အဆင့် (၃) - Nginx Reverse Proxy Configuration သတ်မှတ်ခြင်း

WebRTC Signaling (WebSocket) ချောမွေ့စွာ အလုပ်လုပ်ရန် Nginx Config ဖိုင် ဖန်တီးပါမည်:

```bash
sudo tee /etc/nginx/conf.d/miro.conf << 'EOF'
server {
    listen 80;
    server_name miro.truehand.top;

    location / {
        proxy_pass http://127.0.0.1:3040;
        proxy_http_version 1.1;

        # WebSocket Headers (WebRTC Signaling အတွက် မဖြစ်မနေ လိုအပ်သည်)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

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

---

### အဆင့် (၄) - Certbot ဖြင့် HTTPS SSL Certificate ရယူခြင်း

Browser များတွင် Camera နှင့် Microphone ကို HTTPS (SSL) ရှိမှသာ ခွင့်ပြုသောကြောင့် Let's Encrypt SSL ရယူပါမည်:

```bash
sudo certbot --nginx -d miro.truehand.top
```
*(Email မေးပါက မိမိ Email ထည့်ပြီး Terms သဘောတူရန် `Y` နှိပ်ပါ)*

---

### အဆင့် (၅) - MiroTalk Docker Container ကို စတင် Run ခြင်း

```bash
cd ~/mirotalk
sudo docker compose up -d
```

Container အခြေအနေ စစ်ဆေးရန်:
```bash
sudo docker compose ps
```
`Up ... (running)` ဟု ပေါ်နေပါက အောင်မြင်စွာ အလုပ်လုပ်နေပါပြီ။

---

## 📱 ၄။ စတင် အသုံးပြုနည်း (User Guide)

1. Browser မှ **`https://miro.truehand.top`** သို့ ဝင်ရောက်ပါ။
2. **Room Name** (ဥပမာ `general-meeting`) ရိုက်ထည့်ပြီး **Join Room** ကို နှိပ်ပါ။
3. အခြားသူများကို ဖိတ်ခေါ်လိုပါက Room Link (ဥပမာ `https://miro.truehand.top/join/general-meeting`) ကို Copy ယူပြီး ပေးပို့လိုက်ရုံ ဖြစ်ပါသည်။

---

## 🛠️ ၅။ နေ့စဉ် အသုံးဝင်သော Maintenance Command များ

### (က) Container Logs ကြည့်ရှုရန် (Error စစ်ဆေးခြင်း)
```bash
cd ~/mirotalk
sudo docker compose logs -f --tail=50
```

### (ခ) MiroTalk ကို Restart လုပ်ရန်
```bash
cd ~/mirotalk
sudo docker compose restart
```

### (ဂ) MiroTalk ကို Version အသစ်သို့ Update ပြုလုပ်ရန်
```bash
cd ~/mirotalk
sudo docker compose pull
sudo docker compose up -d
```

### (ဃ) MiroTalk ကို ခေတ္တ ရပ်တန့်ထားရန် / ပြန်လည် စတင်ရန်
```bash
# ရပ်တန့်ရန်
sudo docker compose down

# ပြန်လည် စတင်ရန်
sudo docker compose up -d
```

---

[⬅️ မြန်မာဘာသာ မာတိကာသို့ ပြန်သွားရန်](README.md)
