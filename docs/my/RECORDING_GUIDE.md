# CFMeeting - Cloudflare Meeting Recording လုပ်ငန်းစဉ် လမ်းညွှန် (မြန်မာဘာသာ)

ဤလမ်းညွှန်သည် **CFMeeting** တွင် Cloudflare RealtimeKit နှင့် Cloudflare R2 Storage တို့ကို ပေါင်းစပ်၍ အစည်းအဝေးဗီဒီယိုများကို Cloud ပေါ်သို့ တိုက်ရိုက် **Record (မှတ်တမ်းတင်)** ခြင်းနှင့် ပြန်လည်ရယူခြင်း လုပ်ငန်းစဉ်တစ်ခုလုံးကို အသေးစိတ် မှတ်တမ်းတင်ထားသော လမ်းညွှန်ဖြစ်ပါသည်။

---

## ၁။ အလုပ်လုပ်ပုံ အကျဉ်းချုပ် (Architecture Overview)

```
[Host / Participant]
        │ (Click "Start recording")
        ▼
[CFMeeting Web App] ─── POST /api/meetings/:ref/recording/start ───► [CFMeeting Worker]
                                                                            │
                                                                  (Cloudflare API Auth)
                                                                            ▼
                                                                [Cloudflare RealtimeKit]
                                                                            │ (Bot joins meeting & records)
                                                                            ▼
                                                                 [Cloudflare R2 Storage]
                                                              (cfmeeting-records/*.mp4)
```

1. **Host က Start Recording ခလုတ်နှိပ်ခြင်း**: Web App UI မှ Worker API သို့ Recording စတင်ရန် request ပို့သည်။
2. **Worker မှ Cloudflare API ကို ခေါ်ယူခြင်း**: လျှို့ဝှက် Token ဖြင့် Authenticate လုပ်ပြီး Cloudflare RealtimeKit API ထံသို့ Meeting ID ဖြင့် Recording request ပို့သည်။
3. **Recording Bot အစည်းအဝေးခန်းသို့ ဝင်ရောက်ခြင်း**: RealtimeKit က Recording Bot တစ်ခုကို အစည်းအဝေးခန်းထဲသို့ စေလွှတ်ပြီး Audio/Video များကို တစ်ပြိုင်နက် ဖမ်းယူမှတ်တမ်းတင်သည်။
4. **Cloudflare R2 ထဲသို့ MP4 အဖြစ် တိုက်ရိုက် သိမ်းဆည်းခြင်း**: အစည်းအဝေး ပြီးဆုံးချိန် သို့မဟုတ် "Stop recording" နှိပ်ချိန်တွင် ဗီဒီယိုဖိုင် (`.mp4`) ကို သတ်မှတ်ထားသော Cloudflare R2 Bucket ထဲသို့ အလိုအလျောက် ရောက်ရှိသိမ်းဆည်းပေးပါသည်။

---

## ၂။ လုံခြုံရေးဆိုင်ရာ Environment Variables များ (.env)

အရေးကြီးသော API Token များနှင့် Account ID များကို Code ထဲတွင် မရေးဘဲ Git မပါသွားစေရန် `.env` ဖိုင်တွင်သာ သိမ်းဆည်းထားပါသည် (Gitignore ထဲတွင် `.env` ထည့်သွင်းထားပြီး ဖြစ်ပါသည်)။

### (က) Root ရှိ `.env` ဖိုင်ဖွဲ့စည်းပုံ
ပရောဂျက် root (`/`) တွင် `.env` ဖိုင်ထားရှိပါသည်:

```env
# Cloudflare Account & RealtimeKit Credentials (သိမ်းဆည်းရမည့် ဥပမာ)
CF_ACCOUNT_ID=your_cloudflare_account_id
RTK_APP_ID=your_realtimekit_app_id
CF_API_TOKEN=your_cloudflare_api_token
HOST_KEY_SECRET=your_secret_host_key
R2_BUCKET_NAME=cfmeeting-records
```

> **အရေးကြီးသော လုံခြုံရေး အသိပေးချက်**: သင်၏ အမှန်တကယ် Token များနှင့် ID များကို Git ထဲသို့ မပါသွားစေရန် Root ရှိ `.env` နှင့် `apps/server/.dev.vars` ဖိုင်တို့တွင်သာ သီးသန့် ထည့်သွင်းသိမ်းဆည်းထားပါသည် (Gitignore ပြုလုပ်ထားပါသည်)။ အများပြည်သူသို့ ဖြန့်ဝေမည့် Repo တွင် `.env.example` ကိုသာ နမူနာအဖြစ် ထားရှိပါသည်။

### (ခ) Cloudflare Workers Production သို့ Secret ထည့်သွင်းနည်း
Live Worker ပေါ်တွင် အဆိုပါ Credentials များကို သိမ်းဆည်းရန်အတွက် အောက်ပါအတိုင်း သတ်မှတ်ထားပြီး ဖြစ်ပါသည်:

```powershell
npx wrangler secret put CF_ACCOUNT_ID -w apps/server
npx wrangler secret put RTK_APP_ID -w apps/server
npx wrangler secret put CF_API_TOKEN -w apps/server
npx wrangler secret put HOST_KEY_SECRET -w apps/server
```

---

## ၃။ Cloudflare R2 Bucket ချိတ်ဆက်ပြင်ဆင်ခြင်း

Recording ဖိုင်များကို သိမ်းဆည်းရန် Cloudflare R2 တွင် Bucket တစ်ခု ဆောက်ထားရပါမည်:

1. **Cloudflare Dashboard** -> **R2 Object Storage** သို့ သွားပါ။
2. **"Create bucket"** နှိပ်ပြီး Bucket အမည်ကို **`cfmeeting-records`** ဟု ပေးပါ။
3. Location ကို `Automatic` ထားပြီး Create လုပ်ပါ။
4. ထို့နောက် **RealtimeKit** နှင့် ချိတ်ဆက်ရန်:
   - Dashboard -> **Realtime** -> **RealtimeKit** -> သင်၏ RealtimeKit App သို့ သွားပါ။
   - ဘယ်ဘက်မီနူးရှိ **"Recordings"** (သို့မဟုတ် Settings -> Storage) သို့ သွားပါ။
   - Storage Provider တွင် **Cloudflare R2** ကို ရွေးပြီး Bucket အမည် **`cfmeeting-records`** ကို ချိတ်ဆက်ပေးထားပါ။

---

## ၄။ Server Backend API Endpoints

Server ဖက်ခြမ်း (`apps/server/src/index.ts`) တွင် Recording စတင်ခြင်းနှင့် ရပ်တန့်ခြင်းအတွက် အောက်ပါ Endpoint (၂) ခုကို တည်ဆောက်ထားပါသည်:

### ၁။ POST `/api/meetings/:ref/recording/start`
- **လုပ်ဆောင်ချက်**: Meeting Ref (Short code သို့မဟုတ် UUID) ကို စစ်ဆေးပြီး Cloudflare API (`POST /accounts/:accountId/realtime/kit/:appId/recordings`) သို့ `{ meeting_id }` ပေးပို့ကာ Recording Bot ကို နှိုးပေးသည်။
- **Response**: `{ ok: true, recording: { id: "...", status: "INVOKED" } }`

### ၂။ POST `/api/meetings/:ref/recording/stop`
- **လုပ်ဆောင်ချက်**: Meeting တွင် လက်ရှိ Run နေသော Recording session ID ကို ရှာပြီး Cloudflare API (`PUT /accounts/:accountId/realtime/kit/:appId/recordings/:recordingId`) သို့ Status "STOPPED" ပို့ကာ ရပ်တန့်စေသည်။
- **Response**: `{ ok: true, message: "Recording stopped" }`

---

## ၅။ Frontend UI ပြင်ဆင်မှုနှင့် Z-Index ပြဿနာ ဖြေရှင်းချက်

ယခင်က မီနူးထဲရှိ **Start recording** အပါအဝင် ခလုတ်များ နှိပ်မရသည့် ပြဿနာကို အောက်ပါအတိုင်း ဖြေရှင်းခဲ့ပါသည်:

1. **Backdrop Z-Index ခွဲထုတ်ခြင်း (`apps/web/src/styles.css`)**:
   - မမြင်ရသော overlay ကို `.more-backdrop` (`z-index: 1000`) သို့ ပြောင်းလဲပြီး၊ မီနူး box ဖြစ်သော `.more-menu` ကို အပေါ်ဆုံးဖြစ်စေရန် `z-index: 1001` သို့ တင်ပေးခဲ့သည်။
2. **Event Propagation ဖြေရှင်းခြင်း (`apps/web/src/components/room/Room.tsx`)**:
   - မီနူးပေါ် ကလစ်နှိပ်သည့်အခါ backdrop ဆီ ကလစ်မလွင့်စေရန် `onClick={(e) => e.stopPropagation()}` ထည့်သွင်းပေးခဲ့သည်။
   - မီနူးအတွင်းရှိ ခလုတ်များ အားလုံးကို `type="button"` တိကျစွာ သတ်မှတ်ပေးခဲ့သည်။
3. **အခြေအနေပြ Toast အကြောင်းကြားချက်**:
   - Recording စတင်ချိန်တွင် `"Recording started"` နှင့် ရပ်တန့်ချိန်တွင် `"Recording stopped"` ဟု စခရင်ထိပ်တွင် ချက်ချင်း အသိပေးသည်။
   - Recording လုပ်နေစဉ် Meeting ထိပ်ဘားတွင် အနီရောင်အစက်နှင့်အတူ **"Recording"** ဟူသော indicator ပေါ်နေမည် ဖြစ်သည်။

---

## ၆။ Recording စတင်အသုံးပြုပုံ အဆင့်ဆင့်

1. **အစည်းအဝေးသို့ ဝင်ရောက်ခြင်း**:
   - Browser တွင် `https://cfmeeting.uzinlay85.workers.dev` သို့ ဝင်ပါ။
   - အစည်းအဝေးအသစ် စတင်ပါ (Start Meeting)။
2. **Recording စတင်ရန်**:
   - အစည်းအဝေးခန်း အောက်ခြေ Controls ဘားရှိ **More (`...`)** ခလုတ်ကို နှိပ်ပါ။
   - ပေါ်လာသော မီနူးထဲမှ **"Start recording"** ခလုတ်ကို နှိပ်ပါ။
   - မျက်နှာပြင်ထိပ်တွင် `"Recording started"` အသိပေးချက် ပေါ်လာမည်ဖြစ်ပြီး ဘယ်ဘက်အပေါ်ထောင့်တွင် အနီရောင် **"Recording"** တံဆိပ် ပေါ်လာပါမည်။
3. **Recording ရပ်တန့်ရန်**:
   - အစည်းအဝေး ပြီးဆုံးပါက **More (`...`)** ကို ပြန်နှိပ်ပြီး **"Stop recording"** ကို နှိပ်ပါ (သို့မဟုတ် အစည်းအဝေး အခန်းကို အားလုံးအတွက် ပိတ်လိုက်ပါက အလိုအလျောက် ရပ်သွားပါမည်)။
4. **ဗီဒီယိုဖိုင် ရယူကြည့်ရှုခြင်း**:
   - Cloudflare Dashboard -> **R2 Object Storage** -> **`cfmeeting-records`** bucket ထဲသို့ သွားပါ။
   - အစည်းအဝေးပြီးဆုံးပြီး မိနစ်အနည်းငယ်အတွင်း အဆိုပါ Bucket ထဲတွင် ရက်စွဲနှင့် Meeting ID အလိုက် **`.mp4`** ဗီဒီယိုဖိုင် အဆင်သင့် ရောက်ရှိနေမည် ဖြစ်ပြီး တိုက်ရိုက် Download ပြုလုပ်နိုင်ပါသည်။

---

## ၇။ အမေးများသော မေးခွန်းများနှင့် အကြံပြုချက်များ (FAQ & Troubleshooting)

* **မေး: "Start recording" နှိပ်ပြီးရင် ဗီဒီယိုဖိုင် ဘယ်ရောက်သွားမလဲ?**
  * **ဖြေ**: သင်၏ Cloudflare R2 bucket ဖြစ်သည့် `cfmeeting-records` ထဲသို့ တိုက်ရိုက်ရောက်ရှိသိမ်းဆည်းသွားပါသည်။
* **မေး: Recording စတင်ဖို့ ဘယ်သူတွေမှာ အခွင့်အရေး (Permission) ရှိသလဲ?**
  * **ဖြေ**: အစည်းအဝေးကို ဖန်တီးခဲ့သော Host (အစည်းအဝေးခေါင်းဆောင်) သာလျှင် Record စတင်ခွင့်နှင့် ရပ်တန့်ခွင့်ရှိပါသည်။
* **မေး: Cloudflare R2 Storage မှာ ကုန်ကျစရိတ် ရှိပါသလား?**
  * **ဖြေ**: Cloudflare R2 တွင် လစဉ် **10 GB** အထိ အခမဲ့ (Free Tier) ပေးထားသောကြောင့် သာမန်အစည်းအဝေးများ မှတ်တမ်းတင်ရန် လုံလောက်ပါသည်။
