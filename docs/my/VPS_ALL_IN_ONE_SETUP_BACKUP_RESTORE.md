# 🌐 VPS All-in-One Multi-Service Setup, Backup & Restore Guide
## (ZIN-CFMeeting + MiroTalk SFU + Snikket Chat)

ဤလမ်းညွှန်သည် အောက်ပါ **စနစ် (၃) ခုစလုံးကို Linux VPS တစ်ခုတည်း (2 vCPU / 3GB+ RAM) ပေါ်တွင် အချင်းချင်း Port မတိုက်ဘဲ အတူတကွ ငြိမ်သက်စွာ လည်ပတ်နိုင်စေရန်** Fresh VPS တွင် A to Z Setup လုပ်နည်း၊ **Backup ပြုလုပ်နည်း** နှင့် **အသစ်ပြန်လည် Restore လုပ်နည်း** လက်တွေ့ လုပ်ငန်းစဉ် အပြည့်အစုံ ဖြစ်ပါသည်။

---

## 📊 ၁။ စနစ် (၃) ခုလုံး၏ ဗိသုကာနှင့် Port ခွဲဝေမှု ဇယား (Architecture Matrix)

စနစ် (၃) ခုစလုံးသည် ပြင်ပမှ **Port 80 (HTTP) နှင့် Port 443 (HTTPS)** ကို အတူတကွ ခွဲဝေ အသုံးပြုနိုင်ရန် **Nginx Reverse Proxy** ကို အသုံးပြုထားပါသည်:

| စနစ်အမည် | Domain Name | Host Internal Port | External Media / WebRTC Ports | အဓိက အခန်းကဏ္ဍ |
| :--- | :--- | :--- | :--- | :--- |
| **၁။ ZIN-CFMeeting** | `zinmeet-rn.truehand.top` | `127.0.0.1:3030` | Cloudflare Calls (Serverless WebRTC) | Multi-Party Meeting + Cloudflare R2 / VPS Recording |
| **၂။ MiroTalk SFU** | `miro.truehand.top` | `127.0.0.1:3040` | `40000-40100` (UDP / TCP) | Mediasoup Multi-Party Grid + Local Recording |
| **၃။ Snikket Chat** | `chat.truehand.top`<br>`groups.chat.truehand.top`<br>`share.chat.truehand.top` | `127.0.0.1:5080` (HTTP)<br>`127.0.0.1:5443` (HTTPS) | `5222, 5269` (TCP)<br>`3478, 50000-50100` (UDP)<br>`5349` (TCP) | E2EE Private Messaging + Direct Voice & Video Call |

---

## 🌐 ၂။ Cloudflare (DNS) Records ကြိုတင် သတ်မှတ်ခြင်း

VPS အသစ်တွင် စတင်မတပ်ဆင်မီ Cloudflare DNS Dashboard တွင် အောက်ပါ Records (၅) ခုကို ကြိုတင် ထည့်သွင်းထားပါ (Proxy Status ကို **DNS Only / Grey Cloud ☁️** ထားပေးပါ):

| Type | Name | Content / Target | Proxy Status | မှတ်ချက် |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `zinmeet-rn` | `[မိမိ VPS IP]` | DNS only ☁️ | ZIN-CFMeeting |
| **A** | `miro` | `[မိမိ VPS IP]` | DNS only ☁️ | MiroTalk SFU |
| **A** | `chat` | `[မိမိ VPS IP]` | DNS only ☁️ | Snikket Main |
| **CNAME** | `groups.chat` | `chat.truehand.top` | DNS only ☁️ | Snikket Groups |
| **CNAME** | `share.chat` | `chat.truehand.top` | DNS only ☁️ | Snikket File Sharing |

---

## 🛡️ ၃။ Fresh VPS တွင် အခြေခံစနစ်များနှင့် Firewall ပြင်ဆင်ခြင်း

VPS အသစ် စတင်ရရှိချိန်တွင် အောက်ပါ Command များကို Copy ယူပြီး Run ပါ:

```bash
# ၁။ System Update & လိုအပ်သော Packages များ သွင်းယူခြင်း
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx tar

# ၂။ Docker & Docker Compose Plugin တပ်ဆင်ခြင်း
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# ၃။ UFW Firewall တွင် လိုအပ်သော Ports အားလုံး ဖွင့်ပေးခြင်း
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH & Web
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# MiroTalk SFU WebRTC Ports
sudo ufw allow 40000:40100/udp
sudo ufw allow 40000:40100/tcp

# Snikket XMPP & STUN/TURN (Call) Ports
sudo ufw allow 5222/tcp
sudo ufw allow 5269/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 50000:50100/udp

# Firewall စတင် Enable လုပ်ခြင်း
sudo ufw --force enable
sudo ufw status verbose
```

---

## 🚀 ၄။ စနစ် (၃) ခု တပ်ဆင်နည်း အဆင့်ဆင့် (Installation)

### 🔹 (က) ZIN-CFMeeting တပ်ဆင်ခြင်း

```bash
# 1. Repository Clone လုပ်ပါ
cd ~
git clone https://github.com/uzinlay85/zin-cfmeeting.git ~/zin-cfmeeting
cd ~/zin-cfmeeting/apps/server-vps

# 2. .env ဖိုင် ဖန်တီးပါ
cat << 'EOF' > ~/zin-cfmeeting/apps/server-vps/.env
DOMAIN=zinmeet-rn.truehand.top
CF_ACCOUNT_ID=1fd15eea3027d60cc30686fde4935fb0
RTK_APP_ID=b6c79f6b-4355-469d-85b2-1b6da50c8169
CF_API_TOKEN=your_cloudflare_api_token_here

APP_NAME=ZIN-Meeting
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
ALLOWED_ORIGINS=*

CREATE_ACCESS_CODE=Zinmeet456
HOST_KEY_SECRET=cfmeeting_host_secret_key_2026_zin

RTK_HOST_PRESET=cfmeeting_host
RTK_PARTICIPANT_PRESET=cfmeeting_participant
RTK_WEBINAR_HOST_PRESET=cfmeeting_webinar_host
RTK_WEBINAR_PARTICIPANT_PRESET=cfmeeting_webinar_participant

ALLOW_RECORDING=true
RECORDINGS_DIR=/app/recordings
AUTO_DOWNLOAD_RECORDINGS=true
SYNC_INTERVAL_SECS=30
EOF

# 3. Docker Compose ဖြင့် Build လုပ်ပြီး Run ပါ (Port 3030:3000)
cd ~/zin-cfmeeting/apps/server-vps
sudo docker compose up -d --build
```

---

### 🔹 (ခ) MiroTalk SFU တပ်ဆင်ခြင်း

```bash
# 1. Directory ဆောက်ပါ
mkdir -p ~/mirotalk && cd ~/mirotalk

# 2. docker-compose.yml ဖိုင် ဖန်တီးပါ (Port 3040:3010)
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

# 3. MiroTalk SFU စတင် Run ပါ
cd ~/mirotalk
sudo docker rm -f mirotalk-app 2>/dev/null || true
sudo docker compose up -d
```

---

### 🔹 (ဂ) Snikket Chat တပ်ဆင်ခြင်း

```bash
# 1. Directory ဆောက်ပြီး docker-compose.yml ဒေါင်းလုဒ်ဆွဲပါ
sudo mkdir -p /etc/snikket && cd /etc/snikket
sudo curl -o docker-compose.yml https://snikket.org/service/resources/docker-compose.yml

# 2. snikket.conf ဖိုင် ဖန်တီးပါ (Port 5080/5443)
sudo tee /etc/snikket/snikket.conf > /dev/null << 'EOF'
SNIKKET_DOMAIN=chat.truehand.top
SNIKKET_ADMIN_EMAIL=uzinlay@gmail.com
SNIKKET_TWEAK_HTTP_PORT=5080
SNIKKET_TWEAK_HTTPS_PORT=5443
EOF

# 3. Snikket စတင် Run ပါ
cd /etc/snikket
sudo docker compose up -d
```

---

## 🔀 ၅။ Master Nginx Reverse Proxy & SSL Configuration

Services (၃) ခုလုံးအတွက် Nginx Config ဖိုင်များကို ထည့်သွင်းပေးပါမည်:

```bash
# ၁။ ZIN-CFMeeting Config
sudo tee /etc/nginx/conf.d/zinmeet.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name zinmeet-rn.truehand.top;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name zinmeet-rn.truehand.top;

    ssl_certificate /etc/letsencrypt/live/zinmeet-rn.truehand.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zinmeet-rn.truehand.top/privkey.pem;

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

# ၂။ MiroTalk SFU Config
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
    }
}
EOF

# ၃။ Snikket Chat Config
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

    ssl_certificate /var/lib/docker/volumes/snikket_snikket_data/_data/letsencrypt/live/chat.truehand.top/fullchain.pem;
    ssl_certificate_key /var/lib/docker/volumes/snikket_snikket_data/_data/letsencrypt/live/chat.truehand.top/privkey.pem;

    location / {
        proxy_pass https://127.0.0.1:5443;
        proxy_ssl_verify off;
        proxy_ssl_server_name on;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 100M;
        proxy_read_timeout 900s;
    }
}
EOF

# ၄။ Certbot ဖြင့် SSL ရယူခြင်း (ZIN-CFMeeting နှင့် MiroTalk အတွက်)
sudo certbot --nginx -d zinmeet-rn.truehand.top --non-interactive --agree-tos -m uzinlay@gmail.com
sudo certbot --nginx -d miro.truehand.top --non-interactive --agree-tos -m uzinlay@gmail.com

# ၅။ Nginx စစ်ဆေးပြီး Reload ပြုလုပ်ခြင်း
sudo nginx -t && sudo systemctl reload nginx
```

---

## 💾 ၆။ စနစ် (၃) ခုလုံးကို Backup ပြုလုပ်နည်း (Complete Backup Strategy)

Server တစ်ခုလုံး ပျက်စီးသွားချိန် သို့မဟုတ် အသစ်ပြောင်းရွှေ့ချိန်တွင် စက္ကန့်ပိုင်းအတွင်း ပြန်ယူနိုင်ရန် အောက်ပါ Backup Script ကို ဖန်တီးထားပါသည်:

### (က) Backup ဖိုင်ထဲတွင် ပါဝင်မည့် အရာများ:
1. Nginx Reverse Proxy Configs (`/etc/nginx/conf.d/`)
2. Let's Encrypt SSL Certificates (`/etc/letsencrypt/`)
3. ZIN-CFMeeting Code, `.env` နှင့် Local Recordings များ
4. MiroTalk SFU Compose file
5. Snikket Configs (`/etc/snikket/`) နှင့် Docker Volume Data (Accounts, Chat history, Certificates)

### (ခ) တစ်ချက်နှိပ်ရုံဖြင့် Backup ဆွဲသည့် Script ဖန်တီးခြင်း

```bash
sudo tee /usr/local/bin/backup-all-services.sh > /dev/null << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_FILE="$BACKUP_DIR/vps_services_backup_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "=== [1/4] Backing up Snikket Docker Volume Data ==="
mkdir -p /tmp/snikket_volume_backup
docker run --rm \
  -v snikket_snikket_data:/data:ro \
  -v /tmp/snikket_volume_backup:/backup \
  alpine tar -czf /backup/snikket_data.tar.gz -C /data .

echo "=== [2/4] Packaging All Configs, Secrets and Data ==="
tar -czf "$TARGET_FILE" \
  /etc/nginx/conf.d \
  /etc/letsencrypt \
  /etc/snikket \
  /home/zinko/mirotalk \
  /home/zinko/zin-cfmeeting/apps/server-vps/.env \
  /home/zinko/zin-cfmeeting/apps/server-vps/recordings \
  /tmp/snikket_volume_backup/snikket_data.tar.gz \
  2>/dev/null || true

rm -rf /tmp/snikket_volume_backup

echo "=== [3/4] Keeping only last 7 backups ==="
ls -dt $BACKUP_DIR/vps_services_backup_*.tar.gz | tail -n +8 | xargs -r rm -f

echo "=== [4/4] Backup Completed Successfully ==="
ls -lh "$TARGET_FILE"
EOF

sudo chmod +x /usr/local/bin/backup-all-services.sh
```

### (ဂ) လက်တွေ့ Backup ပြုလုပ်ခြင်း
```bash
sudo /usr/local/bin/backup-all-services.sh
```
အထက်ပါ command ကို run လိုက်ပါက `/root/backups/vps_services_backup_YYYYMMDD_HHMMSS.tar.gz` အဖြစ် ဖိုင်တစ်ခုတည်း အသင့် သိမ်းဆည်းပေးပါမည်။ ဤဖိုင်ကို မိမိ၏ ကွန်ပျူတာ သို့မဟုတ် Cloud Drive ထဲသို့ ကူးယူသိမ်းထားနိုင်ပါသည်။

> **Auto-Backup Cron Job:** နေ့စဉ် ည ၁၂:၀၀ နာရီတိုင်း အလိုအလျောက် Backup ဆွဲလိုပါက:
> ```bash
> (crontab -l 2>/dev/null; echo "0 0 * * * /usr/local/bin/backup-all-services.sh > /dev/null 2>&1") | crontab -
> ```

---

## ♻️ ၇။ Server အသစ်တွင် ပြန်လည် Restore လုပ်နည်း (Disaster Recovery)

Server အသစ်ပေါ်တွင် Backup ဖိုင်ကို အသုံးပြုပြီး **၅ မိနစ်အတွင်း အပြည့်အစုံ ပြန်လည် အသက်သွင်းနည်း**:

### အဆင့် (၁) - Server အသစ်တွင် Docker နှင့် Nginx သွင်းခြင်း
အထက်ဖော်ပြပါ **အပိုင်း ၃ (အခြေခံစနစ်များနှင့် Firewall ပြင်ဆင်ခြင်း)** အတိုင်း Packages များနှင့် Docker ကို အရင်ဆုံး သွင်းပါ။

### အဆင့် (၂) - Backup ဖိုင်ကို Server သို့ တင်ပြီး ပြန်ဖြေထုတ်ခြင်း
Backup ဖိုင်ကို `/root/` သို့ ကူးယူပြီး အောက်ပါအတိုင်း Restore လုပ်ပါ:

```bash
# 1. ဖိုင်များကို မူလနေရာများသို့ ပြန်ဖြန့်ပါ
sudo tar -xzf /root/vps_services_backup_*.tar.gz -C /

# 2. Snikket Docker Volume ကို ပြန်ဆောက်ပြီး Data သွင်းပါ
docker volume create snikket_snikket_data
docker run --rm \
  -v snikket_snikket_data:/data \
  -v /tmp/snikket_data.tar.gz:/backup.tar.gz \
  alpine sh -c "tar -xzf /backup.tar.gz -C /data"

# 3. ZIN-CFMeeting ကို စတင် Run ပါ
cd /home/zinko/zin-cfmeeting/apps/server-vps
docker compose up -d --build

# 4. MiroTalk SFU ကို စတင် Run ပါ
cd /home/zinko/mirotalk
docker compose up -d

# 5. Snikket Chat ကို စတင် Run ပါ
cd /etc/snikket
docker compose up -d

# 6. Nginx စစ်ဆေးပြီး Restart ချပါ
sudo nginx -t && sudo systemctl restart nginx
```
အထက်ပါ အဆင့်များ ပြီးစီးသည်နှင့် Services (၃) ခုစလုံး အကောင့်များ၊ Record ဖိုင်များနှင့်တကွ မူလအတိုင်း ချက်ချင်း အဆင်သင့် ပြန်လည် အလုပ်လုပ်ပါမည်။

---

## 🛠️ ၈။ နေ့စဉ် အသုံးဝင်သော စစ်ဆေးရေး Commands များ

### (က) Resource (CPU/RAM) သုံးစွဲမှု စစ်ဆေးရန်
```bash
docker stats --no-stream
```

### (ခ) Services များ အားလုံး အခြေအနေ စစ်ဆေးရန်
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### (ဂ) Service တစ်ခုချင်းစီ Restart ပြုလုပ်ရန်
```bash
# ZIN-CFMeeting
cd ~/zin-cfmeeting/apps/server-vps && docker compose restart

# MiroTalk SFU
cd ~/mirotalk && docker compose restart

# Snikket Chat
cd /etc/snikket && docker compose restart

# Nginx
sudo systemctl reload nginx
```

---

[⬅️ မြန်မာဘာသာ မာတိကာသို့ ပြန်သွားရန်](README.md)
