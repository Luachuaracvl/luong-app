# Deploy lên Vercel + Firebase Firestore

App dùng **Firebase Firestore** làm database (không còn Neon/PostgreSQL).

---

## PHẦN A: Tạo Firebase & lấy credentials

### A1. Tạo project Firebase

1. Vào **https://console.firebase.google.com**
2. **Add project** → đặt tên (vd: `luong-app`)
3. Google Analytics: bật/tắt tuỳ ý → **Create project**

### A2. Bật Firestore

1. Menu trái → **Build → Firestore Database**
2. **Create database**
3. Chọn **Production mode** (app dùng Admin SDK, rules mặc định chặn client — OK)
4. Location: chọn **asia-southeast1 (Singapore)** hoặc gần VN nhất
5. **Enable**

### A3. Tạo Service Account (cho server/Vercel)

1. Bấm **⚙ Project settings** (góc trái)
2. Tab **Service accounts**
3. **Generate new private key** → **Generate key**
4. Tải file JSON (vd: `luong-app-firebase-adminsdk.json`) — **giữ bí mật, không commit lên GitHub**

File JSON có dạng:
```json
{
  "type": "service_account",
  "project_id": "luong-app-xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-xxx@luong-app-xxxxx.iam.gserviceaccount.com"
}
```

---

## PHẦN B: Gắn Firebase vào Vercel

1. Vercel → project `luong-app` → **Settings → Environment Variables**
2. **Xóa** biến `DATABASE_URL` cũ (Neon) nếu còn
3. Thêm các biến sau:

### Cách 1 — khuyến nghị (1 biến duy nhất)

| Key | Value |
|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT` | Dán **nguyên nội dung file JSON** (1 dòng) |
| `JWT_SECRET` | Chuỗi bí mật, vd: `LuongApp2026BiMat` |

### Cách 2 — tách 3 biến

| Key | Value |
|-----|-------|
| `FIREBASE_PROJECT_ID` | `project_id` trong JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` trong JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` trong JSON (giữ `\n`) |
| `JWT_SECRET` | Chuỗi bí mật |

Tick **Production**, **Preview**, **Development** → **Save**

4. **Deployments → Redeploy** (hoặc push code mới lên GitHub)

---

## PHẦN C: Khởi tạo admin lần đầu

Sau deploy thành công, chọn **một** cách:

**Cách 1:** Mở app → trang login → đăng nhập `admin` / `admin123`  
(App tự tạo admin lần đầu khi login)

**Cách 2:** Mở trình duyệt:
```
https://TEN-APP.vercel.app/api/setup/seed
```
(phải là POST — dùng extension REST client hoặc curl)

**Cách 3:** Local:
```powershell
npm run db:seed
```

---

## PHẦN D: Xem data trên Firebase

1. **https://console.firebase.google.com** → chọn project
2. **Firestore Database → Data**

Collections app tạo:

| Collection | Nội dung |
|------------|----------|
| `users` | Admin + nhân viên |
| `dailyRevenues` | Doanh thu theo ngày (doc id = `2026-07-04`) |
| `salaryRecords` | Lương đã tính |
| `percentageHistory` | Lịch sử đổi % lương |

---

## PHẦN E: Deploy code mới

Upload lại lên GitHub (hoặc `git push`) → Vercel tự deploy.

---

## Chạy local

1. Copy `.env.example` → `.env`
2. Dán credentials Firebase
3. ```powershell
   npm install
   npm run db:seed
   npm run dev
   ```

---

## Lưu ý

- Dữ liệu trên **Neon cũ không tự chuyển** sang Firebase — cần tạo lại nhân viên / nhập lại doanh thu
- **Không commit** file JSON service account lên GitHub
- Firebase **Spark (free)** đủ cho app quản lý lương nhỏ
- Mật khẩu user trong Firestore là `passwordHash` (đã mã hóa), không xem được mật khẩu gốc

---

## Sửa lỗi Deploy failed trên Vercel

### Lỗi: `npm run build` exited with 1

**Nguyên nhân thường gặp:** trên GitHub vẫn còn file Prisma cũ (`prisma/`, `src/lib/prisma.ts`) trong khi app đã chuyển Firebase — TypeScript báo lỗi `Cannot find module '@prisma/client'`.

**Cách sửa trên GitHub:**

1. Vào repo → xóa các mục sau:
   - thư mục `prisma/`
   - file `src/lib/prisma.ts`
   - file `tsconfig.tsbuildinfo` (nếu có)
2. Upload lại file `tsconfig.json` mới nhất từ máy bạn
3. Vercel → **Redeploy**

**Cách sửa trên Vercel (nếu vẫn lỗi ESLint):** upload thêm `eslint.config.mjs`.

### Kiểm tra biến môi trường Firebase

Trên Vercel phải có **một trong hai**:

- `FIREBASE_SERVICE_ACCOUNT` (JSON đầy đủ), **hoặc**
- `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

Và `JWT_SECRET`. **Xóa** `DATABASE_URL` cũ (Neon) nếu còn.

### Sau deploy thành công

Mở: `https://TEN-APP.vercel.app/api/setup/seed`  
Rồi đăng nhập `admin` / `admin123`
