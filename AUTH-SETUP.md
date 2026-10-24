# วิธีเชื่อม Google / Facebook Login

อีเมล + รหัสผ่าน **ใช้งานได้จริงแล้ว** ไม่ต้องตั้งค่าอะไรเพิ่ม (PBKDF2 + HttpOnly session cookie)

ส่วน Google / Facebook โค้ดฝั่ง Worker เสร็จและทดสอบครบวงจรแล้ว (28 checks กับ mock provider —
ดูหัวข้อ "ทดสอบบนเครื่อง") แต่ยังต้องมี **OAuth app ของคุณเอง** เพราะ Google/Meta ต้องยืนยันตัวตน
เจ้าของบัญชีก่อนออก Client ID ให้ — ผมสร้างแทนไม่ได้

ทำตามขั้นตอนด้านล่าง (~5 นาทีต่อเจ้า) แล้วใส่ค่าใน **Sites → Secrets** และ redeploy หนึ่งครั้ง
ปุ่มทั้งสองจะเริ่มทำงานทันที โดยไม่ต้องแก้โค้ดเลย

---

## ค่า Redirect URI ที่ต้องใช้

ต้องตรง **ตัวอักษรต่อตัวอักษร** กับที่ลงทะเบียนไว้ใน Google/Meta (ผิดนิดเดียวได้ `redirect_uri_mismatch`)

| ใช้ที่ไหน | Google | Facebook |
| --- | --- | --- |
| เว็บจริง | `https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/callback/google` | `https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/callback/facebook` |
| เครื่องตัวเอง | `http://localhost:8788/api/auth/callback/google` | `http://localhost:8788/api/auth/callback/facebook` |

> **ใช้ `localhost` ไม่ใช่ `127.0.0.1` ตอนเทสต์ Google** — Google ยอมรับ `http://localhost` สำหรับงานพัฒนา
> แต่จะปฏิเสธ redirect URI ที่เป็น http บนโดเมนอื่น
>
> Worker สร้าง redirect URI จาก origin ของ request เอง ดังนั้นถ้าเปิดเว็บด้วยโดเมนไหน มันจะส่งโดเมนนั้นไป
> — แปลว่าต้องลงทะเบียน URI ของโดเมนนั้นไว้ล่วงหน้า (ถ้าจะใช้ custom domain ให้เพิ่มเข้าไปด้วย)

---

## 1) Google

### 1.1 สร้างโปรเจกต์
1. เปิด https://console.cloud.google.com/ → dropdown โปรเจกต์ด้านบน → **New Project**
2. ตั้งชื่อ เช่น `Khui AI Clone` → **Create** แล้วเลือกโปรเจกต์นั้น

### 1.2 ตั้ง OAuth consent screen
3. เมนูซ้าย **APIs & Services → OAuth consent screen** (เวอร์ชันใหม่อยู่ใต้ **Google Auth Platform**)
4. **Get started**: App name = `Khui AI Clone`, User support email = อีเมลคุณ, Audience = **External**, Developer contact = อีเมลคุณ → Save
5. **Data access → Add or remove scopes** → เพิ่ม 3 ตัว:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
6. **Audience → Test users** → เพิ่มอีเมล Google ที่จะใช้ทดสอบ (โหมด Testing ล็อกอินได้เฉพาะบัญชีในลิสต์นี้)
7. ถ้าจะให้คนทั่วไปใช้: กด **Publish app** (แอปจะเปลี่ยนเป็น In production — ไม่ต้องผ่านรีวิวถ้าใช้แค่ email/profile)

### 1.3 สร้าง OAuth client
8. **APIs & Services → Credentials → Create credentials → OAuth client ID**
9. Application type = **Web application**, name = `Khui AI Clone Web`
10. **Authorized JavaScript origins** (ไม่บังคับสำหรับ flow ฝั่ง server แต่ใส่ไว้ไม่มีผลเสีย):
    - `https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page`
    - `http://localhost:8788`
11. **Authorized redirect URIs** → ใส่ 2 บรรทัดนี้ (กด Add URI ทีละอัน):
    - `https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/callback/google`
    - `http://localhost:8788/api/auth/callback/google`
12. **Create** → คัดลอก **Client ID** และ **Client secret** (secret โชว์ครั้งเดียว เก็บไว้ก่อน)

---

## 2) Facebook

### 2.1 สร้างแอป
1. เปิด https://developers.facebook.com/apps/ → **Create app**
2. Use case → **Authenticate and request data from users with Facebook Login** → Next
3. App name = `Khui AI Clone`, contact email = อีเมลคุณ → **Create app**

### 2.2 เปิด Facebook Login
4. ในหน้าแอป → **Add product → Facebook Login → Set up → Web**
5. **Facebook Login → Settings**
   - **Client OAuth Login**: On
   - **Web OAuth Login**: On
   - **Valid OAuth Redirect URIs**:
     - `https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/callback/facebook`
     - `http://localhost:8788/api/auth/callback/facebook`
   - **Save changes**

### 2.3 ตั้งค่าพื้นฐานของแอป (จำเป็นก่อนกด Live)
6. **App settings → Basic**
   - **App domains**: `site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page`
   - **Privacy Policy URL** และ **Terms of Service URL** — ต้องมีจริง (เช่นหน้าเพจของคุณ) ไม่งั้นกด Live ไม่ได้
   - **User data deletion** — ใส่ URL หรือ callback ที่อธิบายวิธีลบข้อมูล
   - **Category**: เช่น Entertainment
7. คัดลอก **App ID** และ **App secret** (กด Show)

### 2.4 โหมดของแอป
- **Development mode** (ค่าเริ่มต้น): ล็อกอินได้เฉพาะ Admin / Developer / Tester ของแอป → เพิ่มบัญชีทดสอบได้ที่ **App roles → Roles**
- **Live mode**: คนทั่วไปล็อกอินได้ (permission `email` และ `public_profile` ใช้ standard access ไม่ต้องยื่นรีวิว)
- ถ้าผู้ใช้ไม่อนุญาตให้เข้าถึงอีเมล ระบบจะสร้างอีเมลภายในให้เป็น `<facebook-id>@facebook.local` เพื่อไม่ให้สมัครซ้ำ

---

## 3) ใส่ค่าให้ Worker

ต้องมี 4 ค่า — **อย่าส่งค่าเหล่านี้ในแชท**

| ชื่อ secret | ค่า |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID จากข้อ 12 |
| `GOOGLE_CLIENT_SECRET` | Client secret จากข้อ 12 |
| `FACEBOOK_APP_ID` | App ID จากข้อ 7 |
| `FACEBOOK_APP_SECRET` | App secret จากข้อ 7 |

**บนเว็บจริง:** Sites → โปรเจกต์นี้ → **Secrets** → เพิ่มทีละชื่อ → บันทึก → **redeploy หนึ่งครั้ง**

**บนเครื่อง:**
```bash
cp .dev.vars.example .dev.vars      # แล้วเติมค่าจริงในไฟล์ .dev.vars (ถูก gitignore ไว้)
npm run build && npm run worker     # เปิด http://localhost:8788
```

---

## 4) ตรวจสอบว่าใช้งานได้

```bash
# ต้องเห็น true ทั้งสามช่อง
curl https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/providers
# {"email":true,"google":true,"facebook":true}

# ดูว่า Worker เริ่ม redirect ไปเจ้าของ provider จริง
curl -sI "https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/oauth/google" | grep -i location
```

ในเบราว์เซอร์: `/login` → กด **ดำเนินการต่อด้วย Google / Facebook** → หน้าเลือกบัญชีของเจ้าของ provider
→ ยินยอม → กลับมาที่ `/` พร้อมล็อกอิน (ได้ 170 คอยน์ถ้าเป็นบัญชีใหม่)

ดู log ฝั่ง Worker ได้ที่ Sites → Logs หรือ `npx wrangler tail` (ข้อความ error จะขึ้นต้นด้วย `[oauth:google]`
หรือ `[oauth:facebook]`)

---

## 5) แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
| --- | --- |
| `redirect_uri_mismatch` (Google) | URI ในข้อ 11 ไม่ตรงกับที่ Worker ส่งไป — ต้องมี `https`, ไม่มี `/` ปิดท้าย, โดเมนตรงเป๊ะ, และใช้ `localhost` (ไม่ใช่ `127.0.0.1`) ตอนเทสต์ |
| `invalid_client` / `401` ตอน callback | Client ID กับ Secret ไม่เข้าคู่กัน หรือ secret มีช่องว่าง/ขึ้นบรรทัดใหม่ตอนวาง |
| `URL Blocked: This redirect failed` (Facebook) | ยังไม่ได้ใส่ Valid OAuth Redirect URI ในข้อ 5 หรือยังไม่ Save |
| `App not active` / `403` (Facebook) | แอปยัง Development mode และบัญชีนั้นไม่ใช่ Admin/Tester → เพิ่มใน Roles หรือกด Live |
| Google ขึ้น `access_denied` | บัญชีนั้นไม่อยู่ใน Test users ขณะแอปเป็น Testing หรือกดยกเลิกเอง |
| กลับมาแล้วขึ้น "เข้าสู่ระบบไม่สำเร็จ" | token exchange ล้มเหลว — ดู log Worker ว่าบรรทัด `[oauth:...]` บอกอะไร (มักเป็น secret ผิดหรือ redirect URI ไม่ตรง) |
| ขึ้น "state ไม่ถูกต้อง" | เปิด callback ซ้ำ/ย้อนกลับด้วยปุ่ม Back หรือ cookie/DB ถูกเคลียร์ — เริ่มล็อกอินใหม่ |
| ขึ้น "หมดเวลายืนยันตัวตน" | ค้างหน้ายินยอมเกิน 10 นาที (state มีอายุ 10 นาที) — เริ่มใหม่ |
| ล็อกอินแล้วแต่ไม่มี cookie | เปิดผ่าน `http://` บนโดเมนที่ไม่ใช่ localhost — cookie เป็น `Secure` จึงต้องใช้ `https` (หรือ localhost) |
| ล็อกอิน Facebook แล้วไม่ได้อีเมล | ผู้ใช้ไม่ได้ให้สิทธิ์ `email` — ระบบใช้ `<id>@facebook.local` แทน (หรือขอ permission ใหม่ด้วย `auth_type=rerequest`) |

---

## 6) เบื้องหลังที่ระบบทำ

```
ผู้ใช้กดปุ่ม
  └─ GET /api/auth/oauth/google?redirect=/wallet
       ├─ สร้าง state สุ่ม เก็บในตาราง oauth_states (TTL 10 นาที, ลบของเก่าอัตโนมัติ)
       └─ 302 → accounts.google.com/o/oauth2/v2/auth?client_id&redirect_uri&scope&state

ผู้ใช้ยินยอมที่ Google
  └─ GET /api/auth/callback/google?code=...&state=...
       ├─ ตรวจ state ว่ามีจริง ยังไม่หมดอายุ และเป็นของ provider เดียวกัน แล้วลบทิ้ง (ใช้ซ้ำไม่ได้)
       ├─ POST ขอ token (client_secret อยู่ฝั่ง Worker เท่านั้น)
       ├─ GET userinfo → ต้องมี email และ email_verified != false
       ├─ upsert ผู้ใช้: มีอีเมลนี้แล้ว → ใช้บัญชีเดิม (คอยน์/ประวัติคงอยู่), ยังไม่มี → สร้างใหม่ +170 คอยน์
       └─ ตั้ง cookie session (HttpOnly; Secure; SameSite=Lax; 30 วัน) แล้ว 302 กลับหน้าเดิม
```

ถ้าอะไรผิดพลาดระหว่างทาง ผู้ใช้จะถูกพากลับไป `/login?error=...` พร้อมข้อความภาษาไทย
และรายละเอียดจริงถูกเขียนลง log ของ Worker (`console.error`) ไม่หลุดไปฝั่ง client

**หมายเหตุความปลอดภัย:** การผูกบัญชีดูจากอีเมลที่ผู้ให้บริการยืนยันแล้วเท่านั้น (Google ต้อง `email_verified`,
Facebook ส่งอีเมลที่ยืนยันแล้ว) — บัญชีอีเมล/รหัสผ่านเดิมที่ใช้อีเมลเดียวกันจะถูกใช้ต่อ ไม่สร้างซ้ำและคอยน์ไม่หาย

---

## 7) ทดสอบบนเครื่องโดยไม่ต้องมี OAuth app จริง

ตอนพัฒนาโค้ดชุดนี้ ผมทดสอบ flow เต็มวงจรด้วย mock provider (เซิร์ฟเวอร์จำลองที่ทำหน้าที่เป็น Google/Facebook)
โดยสลับแค่ URL ปลายทาง 6 จุดในสำเนาของ `worker.js` — โค้ดจริงที่ commit ไม่มีอะไรเกี่ยวกับ mock

ผลที่ผ่าน 28 ข้อ: redirect parameter ครบ (client_id, redirect_uri, scope, response_type, state) ·
callback สร้างผู้ใช้ + cookie · ล็อกอินซ้ำได้บัญชีเดิม · state ใช้ซ้ำไม่ได้ · state ข้าม provider ไม่ได้ ·
`email_verified=false` ถูกปฏิเสธ · Facebook ใช้อีเมลจาก Graph API · บัญชีอีเมลเดิมผูกกับ Google ได้โดยคอยน์ไม่หาย

บนเบราว์เซอร์จริงก็ทดสอบแล้วทั้งสองเส้นทาง: ตั้งค่าแล้วกดปุ่ม → ล็อกอินสำเร็จกลับหน้าแรก,
ยังไม่ตั้งค่า → ขึ้นข้อความ "ยังไม่ได้ตั้งค่า Google OAuth" โดยไม่พาออกจากหน้า

---

## 8) Endpoint ที่เกี่ยวกับ auth

| Method | Path | หน้าที่ |
| --- | --- | --- |
| POST | `/api/auth/signup` | สมัครด้วยอีเมล (รับ 170 คอยน์) |
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/logout` | ออกจากระบบ (ลบ session) |
| GET | `/api/auth/me` | ผู้ใช้ปัจจุบัน (`null` ถ้าไม่ล็อกอิน) |
| GET | `/api/auth/providers` | provider ไหนถูกตั้งค่าแล้ว |
| GET | `/api/auth/oauth/:provider` | เริ่ม OAuth (`?redirect=/path`) |
| GET | `/api/auth/callback/:provider` | รับ code → สร้าง session |

ตารางที่เกี่ยวข้องใน D1: `users`, `sessions`, `oauth_states`
