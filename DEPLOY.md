# Deploy lên Vercel

App cần **PostgreSQL** (Neon miễn phí). SQLite không dùng được trên Vercel.

## Bước 1: Tạo database Neon

1. Vào **https://neon.tech** → đăng ký miễn phí
2. **New Project** → đặt tên (vd: `luong-app`)
3. Copy **Connection string** (PostgreSQL) — dạng:
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

## Bước 2: Tạo tài khoản Vercel

1. Vào **https://vercel.com** → đăng ký (có thể dùng GitHub)
2. Cài Git nếu chưa có: **https://git-scm.com/download/win**

## Bước 3: Đưa code lên GitHub

Mở PowerShell trong thư mục project:

```powershell
cd "d:\download\backup\newest re\bACKUP\Lương"
git init
git add .
git commit -m "Initial commit - app quan ly luong"
```

Tạo repo mới trên **https://github.com/new** (tên vd: `luong-app`), rồi:

```powershell
git branch -M main
git remote add origin https://github.com/TEN-GITHUB-CUA-BAN/luong-app.git
git push -u origin main
```

## Bước 4: Import project trên Vercel

1. Vercel → **Add New** → **Project**
2. Import repo GitHub vừa push
3. **Environment Variables** — thêm:

| Tên | Giá trị |
|-----|---------|
| `DATABASE_URL` | Connection string Neon (bước 1) |
| `JWT_SECRET` | Chuỗi bí mật dài (vd: `my-super-secret-key-2026`) |

4. **Deploy**

Lần build đầu sẽ tự tạo bảng DB và tài khoản admin.

## Bước 5: Gửi link cho nhân viên

Sau deploy, Vercel cho link kiểu:

`https://luong-app-xxx.vercel.app`

- **Admin:** `admin` / `admin123` (đổi mật khẩu sau khi vào được)
- Tạo tài khoản nhân viên trong app → gửi link + username/mật khẩu

---

## Cách deploy nhanh không cần GitHub (Vercel CLI)

```powershell
cd "d:\download\backup\newest re\bACKUP\Lương"
npm i -g vercel
vercel login
vercel
```

Lần đầu hỏi project name → Enter. Sau đó thêm biến môi trường trên **Vercel Dashboard → Project → Settings → Environment Variables**, rồi:

```powershell
vercel --prod
```

---

## Cập nhật code sau này

```powershell
git add .
git commit -m "Mo ta thay doi"
git push
```

Vercel tự deploy lại khi push lên GitHub.

## Lưu ý

- Dữ liệu local (file `dev.db` cũ) **không** tự chuyển lên Neon — trên Vercel là database mới, tạo lại nhân viên hoặc nhập lại doanh thu
- Nếu build lỗi DB: kiểm tra `DATABASE_URL` có `?sslmode=require` ở cuối
- Đổi `JWT_SECRET` trên production, không dùng giá trị mặc định
