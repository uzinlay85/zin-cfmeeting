# 🇲🇲 CFMeeting - မြန်မာဘာသာ မှတ်တမ်းနှင့် လမ်းညွှန်များ (Myanmar Documentation)

ဤဖိုဒါသည် [CFMeeting (uzinlay85/zin-cfmeeting)](https://github.com/uzinlay85/zin-cfmeeting) နှင့် ပတ်သက်သည့် မြန်မာဘာသာ လမ်းညွှန်မှတ်တမ်းများ အားလုံးကို တစ်နေရာတည်းတွင် စုစည်းထားရှိသော နေရာဖြစ်ပါသည်။

* **တရားဝင် Live ဝဘ်ဆိုက်:** [https://cfmeeting.uzinlay85.workers.dev](https://cfmeeting.uzinlay85.workers.dev)
* **GitHub Repository:** [uzinlay85/zin-cfmeeting](https://github.com/uzinlay85/zin-cfmeeting)

---

## 📚 မာတိကာနှင့် လမ်းညွှန်များ (Documentation Index)

အောက်ပါ လမ်းညွှန်များကို မိမိ လိုအပ်ချက်အလိုက် ရွေးချယ်ဖတ်ရှုနိုင်ပါသည်:

### ၁။ [စနစ်မိတ်ဆက်နှင့် အသုံးဝင်ပုံ လုပ်ဆောင်ချက်များ (OVERVIEW.md)](OVERVIEW.md)
* CFMeeting ဆိုတာ ဘာလဲ?
* အခြား Zoom / Google Meet / VPS များနှင့် နှိုင်းယှဉ်ချက် ဇယား (Server စရိတ် Zero Cost, Zero Maintenance, မြန်နှုန်းမြင့် ကွန်ရက်)
* ပါဝင်သော စွမ်းဆောင်ရည်များ (Conference, Webinar, Screen Share, Chat, Polls, Mute All, Breakout Rooms)
* စက်ပစ္စည်းမျိုးစုံ ပံ့ပိုးမှု (Web, PWA, Android APK, Windows Installer)
* အသုံးပြုနည်း အဆင့်ဆင့် လုပ်ငန်းစဉ်

---

### ၂။ [Cloudflare Setup & Deploy လုပ်နည်း လမ်းညွှန် (SETUP_GUIDE.md)](SETUP_GUIDE.md)
* ကြိုတင်လိုအပ်ချက်များ (Node.js, Cloudflare Account)
* Cloudflare API Token နှင့် Account ID ရယူနည်း
* Cloudflare Workers ပေါ်သို့ ၁၀၀% Serverless အပြည့်အစုံ Deploy တင်နည်း
* အစည်းအဝေး ဖန်တီးခွင့် လျှို့ဝှက်ကုဒ် သတ်မှတ်ခြင်း (Meeting Access Code Protection)
* ကြုံတွေ့ရတတ်သော ပြဿနာများနှင့် ဖြေရှင်းနည်းများ (Troubleshooting)

---

### ၃။ [Cloud Recording လုပ်ငန်းစဉ် လမ်းညွှန် (RECORDING_GUIDE.md)](RECORDING_GUIDE.md)
* Cloudflare RealtimeKit နှင့် Cloudflare R2 Storage ပေါင်းစပ်အလုပ်လုပ်ပုံ
* Cloudflare R2 Bucket (`cfmeeting-records`) ဆောက်လုပ်ပြီး ချိတ်ဆက်နည်း
* လုံခြုံရေးဆိုင်ရာ Environment Variables များ (`.env` နှင့် `wrangler secret`)
* အစည်းအဝေးခန်းထဲတွင် Record စတင်ခြင်းနှင့် R2 မှ MP4 ဗီဒီယို Download ရယူခြင်း
* မေးလေ့ရှိသော မေးခွန်းများနှင့် အကြံပြုချက်များ (FAQ)

---

[⬅️ မူရင်းပင်မ စာမျက်နှာ (Main README) သို့ ပြန်သွားရန်](../../README.md)
