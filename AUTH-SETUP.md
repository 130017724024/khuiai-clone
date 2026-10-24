# วิธีเชื่อม Google / Facebook Login

อีเมล + รหัสผ่าน **ใช้งานได้จริงแล้ว** (ไม่ต้องตั้งค่าอะไรเพิ่ม)
ระบบเก็บผู้ใช้ใน D1, รหัสผ่านถูก hash ด้วย PBKDF2 และ session อยู่ใน HttpOnly cookie

ส่วน Google / Facebook ต้องสร้าง OAuth App ของคุณเอง (ผมสร้างแทนไม่ได้ เพราะต้องยืนยันตัวตน
เจ้าของบัญชี Google Cloud / Meta) — ทำตามขั้นตอนด้านล่างแล้วใส่ค่าในหน้า **Sites → Secrets**
ปุ่มทั้งสองจะเริ่มทำงานทันทีโดยไม่ต้องแก้โค้ด

## ค่า Redirect URI ที่ต้องใช้

```
https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/callback/google
https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/callback/facebook
```

(ถ้าอยากใช้โดเมนของตัวเอง ให้เปลี่ยนโดเมนใน URL ให้ตรงกับโดเมนจริง และเพิ่มโดเมนนั้นใน
Google / Meta ด้วย)

---

## 1) Google

1. ไปที่ https://console.cloud.google.com/ แล้วสร้าง Project ใหม่
2. **APIs & Services → OAuth consent screen** → เลือก *External*
   - App name: `Khui AI Clone`
   - User support email + Developer contact: อีเมลของคุณ
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - ถ้าแอปยังอยู่โหมด *Testing* ต้องเพิ่มอีเมลที่จะล็อกอินใน **Test users**
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page`
   - Authorized redirect URIs: ใส่ URL ด้านบนของ Google
4. คัดลอก **Client ID** และ **Client secret**

## 2) Facebook

1. ไปที่ https://developers.facebook.com/apps/ → **Create app** → เลือก **Consumer**
2. เพิ่ม product **Facebook Login** → **Settings**
   - Valid OAuth Redirect URIs: ใส่ URL ด้านบนของ Facebook
3. **App settings → Basic**
   - App Domains: `site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page`
   - ใส่ Privacy Policy URL และ Terms of Service URL (จำเป็นก่อนกด Live)
   - คัดลอก **App ID** และ **App secret**
4. ระหว่างที่แอปยังเป็น *Development mode* จะล็อกอินได้เฉพาะ Admin/Tester ของแอป
   ถ้าจะให้คนทั่วไปใช้ ต้องกด **Live** (และผ่านการรีวิว `email` permission ถ้าจำเป็น)

## 3) ใส่ค่าใน Sites

Sites → โปรเจกต์นี้ → **Secrets** แล้วเพิ่ม 4 ตัวนี้ (ค่า **ไม่ต้องส่งมาทางแชท**):

| ชื่อ | ค่า |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID จาก Google |
| `GOOGLE_CLIENT_SECRET` | Client secret จาก Google |
| `FACEBOOK_APP_ID` | App ID จาก Facebook |
| `FACEBOOK_APP_SECRET` | App secret จาก Facebook |

หลังบันทึก secrets แล้ว deploy อีกครั้ง (หรือกด redeploy) — ปุ่ม Google/Facebook จะพาไปหน้า
ยินยอมสิทธิ์ของเจ้าของบัญชี แล้วกลับมาพร้อม session ที่ล็อกอินแล้ว

ตรวจสอบว่าติดตั้งครบด้วย:

```bash
curl https://site-41c7ca1fcc6241fd9a641857cd57fcae.freebuff.page/api/auth/providers
# {"email":true,"google":true,"facebook":true}
```

## โครงสร้างที่รองรับ

| Endpoint | หน้าที่ |
| --- | --- |
| `POST /api/auth/signup` | สมัครด้วยอีเมล (รับ 170 คอยน์) |
| `POST /api/auth/login` | เข้าสู่ระบบ |
| `POST /api/auth/logout` | ออกจากระบบ (ลบ session) |
| `GET /api/auth/me` | ผู้ใช้ปัจจุบัน |
| `GET /api/auth/providers` | เปิด provider ไหนอยู่ |
| `GET /api/auth/oauth/:provider` | เริ่ม OAuth |
| `GET /api/auth/callback/:provider` | callback สร้าง session |
| `GET/POST /api/chat/:characterId` | ประวัติแชท / ส่งข้อความ (หัก 2 คอยน์) |

ตารางใน D1: `users`, `sessions`, `oauth_states`, `messages`
