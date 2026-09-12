# 🇲🇲 CFMeeting - မြန်မာဘာသာ မှတ်တမ်းနှင့် လမ်းညွှန်များ (Myanmar Documentation)

ဤဖိုဒါသည် [CFMeeting (uzinlay85/zin-cfmeeting)](https://github.com/uzinlay85/zin-cfmeeting) နှင့် ပတ်သက်သည့် မြန်မာဘာသာ လမ်းညွှန်မှတ်တမ်းများ အားလုံးကို တစ်နေရာတည်းတွင် စုစည်းထားရှိသော နေရာဖြစ်ပါသည်။

* **တရားဝင် Live ဝဘ်ဆိုက်:** [https://cfmeeting.uzinlay85.workers.dev](https://cfmeeting.uzinlay85.workers.dev)
* **GitHub Repository:** [uzinlay85/zin-cfmeeting](https://github.com/uzinlay85/zin-cfmeeting)

---

## 📚 မာတိကာနှင့် လမ်းညွှန်များ (Documentation Index)

အောက်ပါ လမ်းညွှန်များကို မိမိ လိုအပ်ချက်အလိုက် ရွေးချယ်ဖတ်ရှုနိုင်ပါသည်:

### ၁။ [CFMeeting ဗားရှင်း (၃) မျိုး နှိုင်းယှဉ်ချက်နှင့် အသုံးပြုနည်းလမ်းညွှန် (VERSIONS_GUIDE.md)](VERSIONS_GUIDE.md)
* Original Worker (`apps/server-original`) vs Enhanced Custom Worker (`apps/server`) vs VPS Docker Edition (`apps/server-vps`)
* ဗားရှင်း (၃) မျိုး ခြုံငုံနှိုင်းယှဉ်ချက် ဇယား
* မိမိ လိုအပ်ချက်အလိုက် မည်သည့်ဗားရှင်းကို ရွေးချယ်အသုံးပြုသင့်သလဲ

---

### ၂။ [စနစ်မိတ်ဆက်နှင့် အသုံးဝင်ပုံ လုပ်ဆောင်ချက်များ (OVERVIEW.md)](OVERVIEW.md)
* CFMeeting ဆိုတာ ဘာလဲ?
* အခြား Zoom / Google Meet / VPS များနှင့် နှိုင်းယှဉ်ချက် ဇယား (Server စရိတ် Zero Cost, Zero Maintenance, မြန်နှုန်းမြင့် ကွန်ရက်)
* ပါဝင်သော စွမ်းဆောင်ရည်များ (Conference, Webinar, Screen Share, Chat, Polls, Mute All, Breakout Rooms)
* စက်ပစ္စည်းမျိုးစုံ ပံ့ပိုးမှု (Web, PWA, Android APK, Windows Installer)
* အသုံးပြုနည်း အဆင့်ဆင့် လုပ်ငန်းစဉ်

---

### ၃။ [Cloudflare Setup & Deploy လုပ်နည်း လမ်းညွှန် (SETUP_GUIDE.md)](SETUP_GUIDE.md)
* ကြိုတင်လိုအပ်ချက်များ (Node.js, Cloudflare Account)
* Cloudflare API Token နှင့် Account ID ရယူနည်း
* Cloudflare Workers ပေါ်သို့ ၁၀၀% Serverless အပြည့်အစုံ Deploy တင်နည်း
* အစည်းအဝေး ဖန်တီးခွင့် လျှို့ဝှက်ကုဒ် သတ်မှတ်ခြင်း (Meeting Access Code Protection)
* ကြုံတွေ့ရတတ်သော ပြဿနာများနှင့် ဖြေရှင်းနည်းများ (Troubleshooting)

---

### ၄။ [Cloud Recording လုပ်ငန်းစဉ် လမ်းညွှန် (RECORDING_GUIDE.md)](RECORDING_GUIDE.md)
* Cloudflare RealtimeKit နှင့် Cloudflare R2 Storage ပေါင်းစပ်အလုပ်လုပ်ပုံ
* Cloudflare R2 Bucket (`cfmeeting-records`) ဆောက်လုပ်ပြီး ချိတ်ဆက်နည်း
* လုံခြုံရေးဆိုင်ရာ Environment Variables များ (`.env` နှင့် `wrangler secret`)
* အစည်းအဝေးခန်းထဲတွင် Record စတင်ခြင်းနှင့် R2 မှ MP4 ဗီဒီယို Download ရယူခြင်း
* မေးလေ့ရှိသော မေးခွန်းများနှင့် အကြံပြုချက်များ (FAQ)

---

### ၅။ [VPS Version တပ်ဆင်အသုံးပြုနည်း လမ်းညွှန် (VPS_SETUP_GUIDE.md)](VPS_SETUP_GUIDE.md)
* VPS Hybrid Architecture (Node.js/Docker + Cloudflare RealtimeKit + VPS Local Recording Storage)
* VPS Hardware လိုအပ်ချက်များ
* Docker & Docker Compose (Caddy Auto-SSL) ဖြင့် တစ်ဆင့်ချင်း တပ်ဆင်နည်း
* Node.js & PM2 ဖြင့် တပ်ဆင်နည်း
* Recording ဖိုင်များကို VPS Hard Disk ပေါ်တွင် သိမ်းဆည်းခြင်းနှင့် Stream/Download API များ
* Domain နှင့် SSL ချိတ်ဆက်ပုံ

---

### ၆။ [🛠️ VPS လက်တွေ့တပ်ဆင်မှု မှတ်တမ်းနှင့် အခက်အခဲများ ဖြေရှင်းနည်း (VPS_REAL_CASE_SETUP_TROUBLESHOOTING.md)](VPS_REAL_CASE_SETUP_TROUBLESHOOTING.md)
* `https://zinmeet-rn.truehand.top` လက်တွေ့ တပ်ဆင်ခဲ့သော Server အချက်အလက်များ
* ကြုံတွေ့ခဲ့ရသော အခက်အခဲ (၅) မျိုး (Port Collisions, Nginx Reverse Proxy, `.env` Setup, In-meeting Recording Controls, `/recordings` SPA Routing, Single/Batch Delete & Tombstone Auto-Sync Protection) နှင့် ဖြေရှင်းခဲ့သည့် နည်းလမ်းများ
* Fresh VPS အသစ်တွင် A to Z Setup ပြုလုပ်နည်း အဆင့်ဆင့်
* နေ့စဉ် အသုံးဝင်သော VPS Command များနှင့် စစ်ဆေးနည်းများ
* အနာဂတ်တွင် Code Update ပြုလုပ်နည်း One-liner Command

---

### ၇။ [🎥 MiroTalk SFU (Mediasoup) - VPS တပ်ဆင်အသုံးပြုနည်း အပြည့်အစုံ လမ်းညွှန် (MIROTALK_SETUP_GUIDE.md)](MIROTALK_SETUP_GUIDE.md)
* MiroTalk SFU မိတ်ဆက်နှင့် P2P vs SFU နှိုင်းယှဉ်ချက် (Multi-party Grid View၊ Client Upload သက်သာမှု)
* `https://miro.truehand.top` လက်တွေ့ တပ်ဆင်ခဲ့သော Docker Compose, Mediasoup UDP Ports, Nginx HTTPS Proxy Config များ
* Fresh VPS တွင် A to Z Setup ပြုလုပ်နည်း အဆင့်ဆင့်
* လက်တွေ့ကြုံတွေ့ခဲ့ရသော Gotchas (Port 3010, internal SSL, container conflict) နှင့် Maintenance Commands များ

---

### ၈။ [💬 Snikket - Private Messaging & Voice/Video Call - VPS တပ်ဆင်အသုံးပြုနည်း အပြည့်အစုံ လမ်းညွှန် (SNIKKET_SETUP_GUIDE.md)](SNIKKET_SETUP_GUIDE.md)
* Snikket မိတ်ဆက်နှင့် မြန်မာပြည်အတွက် အားသာချက်များ (VPN မလို၊ E2EE Encryption၊ Voice & Video Call အပြည့်အစုံ)
* `https://chat.truehand.top` လက်တွေ့ တပ်ဆင်ခဲ့သော DNS Subdomains (၃) ခုနှင့် Nginx Reverse Proxy Config
* Port 80/443 Conflict မဖြစ်စေရန် Port 5080/5443 Tweaks နှင့် Docker Compose Setup
* Admin / User Invite Links ထုတ်ယူပုံနှင့် Mobile App ချိတ်ဆက် အသုံးပြုပုံ လမ်းညွှန်

---

### ၉။ [🌐 VPS All-in-One Multi-Service Setup, Backup & Restore Guide (VPS_ALL_IN_ONE_SETUP_BACKUP_RESTORE.md)](VPS_ALL_IN_ONE_SETUP_BACKUP_RESTORE.md)
* စနစ် (၃) ခုစလုံး (**ZIN-CFMeeting + MiroTalk SFU + Snikket Chat**) ကို Linux VPS တစ်ခုတည်းပေါ်တွင် Port Conflict လုံးဝ မဖြစ်စေဘဲ ငြိမ်သက်စွာ ပူးတွဲ Run ထားသည့် Master Architecture နှင့် Port Mapping Matrix
* Cloudflare DNS Records (၅) ခုနှင့် Unified UFW Firewall ပြင်ဆင်ပုံ
* Fresh VPS အသစ်တွင် A to Z Setup လုပ်နည်း အဆင့်ဆင့်
* **တစ်ချက်နှိပ်ရုံဖြင့် Services အားလုံး (Configs, SSL, Volumes, DB, Recordings) ကို အလိုအလျောက် Archive ပြုလုပ်ပေးမည့် `backup-all-services.sh` Script**
* **Disaster Recovery:** Server အသစ်တွင် ၅ မိနစ်အတွင်း အပြည့်အစုံ ပြန်လည် အသက်သွင်းမည့် Restore လုပ်ငန်းစဉ် အပြည့်အစုံ

---

[⬅️ မူရင်းပင်မ စာမျက်နှာ (Main README) သို့ ပြန်သွားရန်](../../README.md)
