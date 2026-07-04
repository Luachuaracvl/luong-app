# Quản lý Lương

Công cụ web giúp admin cập nhật doanh thu hàng ngày và tính lương nhân viên theo **phần trăm doanh thu**. Nhân viên đăng nhập để xem lương từng ngày và tổng lương.

## Tính năng

- **Đăng nhập** phân quyền Admin / Nhân viên
- **Admin**
  - Tạo tài khoản nhân viên (tên, username, mật khẩu, % lương)
  - Cập nhật doanh thu cuối ngày → tự tính lương cho tất cả nhân viên
  - Xem thống kê doanh thu & lương theo ngày
  - Click vào nhân viên để xem chi tiết lương và tổng lương
  - Đổi % lương nhân viên (chỉ áp dụng từ ngày đổi trở đi, lương cũ không đổi)
- **Nhân viên**
  - Xem lương hôm nay (nếu admin đã cập nhật doanh thu)
  - Xem tổng lương và lịch sử lương theo ngày

## Cài đặt & chạy local

Cần project **Firebase Firestore** (miễn phí). Xem hướng dẫn tạo trong **[DEPLOY.md](./DEPLOY.md)**.

```bash
cp .env.example .env
# Dán FIREBASE_SERVICE_ACCOUNT hoặc 3 biến Firebase + JWT_SECRET

npm install
npm run db:seed
npm run dev
```

Deploy lên Vercel + Firebase: xem **[DEPLOY.md](./DEPLOY.md)**.

Mở trình duyệt: **http://localhost:3000**

### Tài khoản mặc định

| Vai trò | Username | Mật khẩu |
|---------|----------|----------|
| Admin   | admin    | admin123 |

> Đổi mật khẩu admin sau khi triển khai thực tế.

## Logic tính lương

- Lương ngày = `Doanh thu ngày × % lương / 100`
- Khi admin nhập doanh thu lần đầu cho một ngày, hệ thống **khóa** lương đã tính (lưu % tại thời điểm tính)
- Khi admin **đổi % lương**, chỉ các ngày **tính sau** mới dùng % mới
- Nếu sửa doanh thu của ngày đã tính lương, doanh thu được cập nhật nhưng **lương đã tính không thay đổi**

## Công nghệ

- Next.js 15 + TypeScript
- Firebase Firestore
- Tailwind CSS
