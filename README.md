# VSOL Asset Management

Web app quản lý tài sản IT của VSOL, thay thế cho file Excel `Vsol Asset Management1 (1).xlsx`. Chạy hoàn toàn bằng Docker.

## Kiến trúc

- **backend/** — Node.js (Express) + PostgreSQL (Knex), REST API dưới `/api`
- **frontend/** — React (Vite) + Ant Design, build tĩnh phục vụ qua Nginx, Nginx proxy `/api` sang backend
- **db** — PostgreSQL 16, dữ liệu lưu trong Docker volume `vam_db_data`

Khi container backend khởi động lần đầu, nó tự động:
1. Chạy migration tạo bảng (`users`, `employees`, `assets`, `file_vault`, `windows_keys`)
2. Tạo tài khoản admin từ biến môi trường `ADMIN_USERNAME` / `ADMIN_PASSWORD`
3. Import toàn bộ dữ liệu từ file Excel gốc (đã copy sẵn vào `backend/seed/data/assets-source.xlsx`) — chỉ chạy một lần, các lần sau bỏ qua nếu đã có dữ liệu

## Chạy ứng dụng

```bash
cp .env.example .env
# sửa JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, mật khẩu Postgres trong .env

docker compose up --build -d
```

Truy cập: **http://localhost:8080** (đổi cổng qua `FRONTEND_PORT` trong `.env`)

Đăng nhập bằng tài khoản admin đã cấu hình trong `.env`.

## Tính năng

- **Dashboard**: tổng số thiết bị, phân bố theo trạng thái (In Use/In Stock/Damaged/Lost/Sold/Warranty), theo loại thiết bị, địa điểm, business unit, chip & dung lượng laptop — tính trực tiếp từ dữ liệu hiện tại (chính xác hơn sheet Dashboard tĩnh trong Excel gốc).
- **Tài sản**: bảng danh sách có lọc theo loại/trạng thái/địa điểm/business unit, tìm kiếm, thêm/sửa/xoá (chỉ admin), xuất Excel/CSV theo bộ lọc hiện tại.
- **Tra cứu theo nhân viên**: chọn nhân viên → xem toàn bộ tài sản đang giữ.
- **Nhân viên**: danh sách nhân viên từ sheet Employee.
- **Tài khoản** (chỉ admin): tạo/xoá tài khoản `admin` hoặc `viewer`. Viewer chỉ có quyền xem, không thêm/sửa/xoá được tài sản.

## Ghi chú dữ liệu

- Sheet `Detail` gốc có 530 dòng tài sản hợp lệ (536 dòng trừ 6 dòng trống) — nhiều hơn số 364 trên tab Dashboard tĩnh của Excel vì tab đó chỉ tổng hợp phạm vi HCM & HN tại thời điểm chốt số liệu, trong khi bảng Detail đầy đủ còn có địa điểm `IPL` và trạng thái `Warranty`.
- Các giá trị lỗi `#N/A` / `0` từ công thức Excel được chuẩn hoá thành `NULL` khi import.
- Muốn import lại từ đầu: `docker compose down -v` rồi `docker compose up --build -d` (sẽ xoá toàn bộ dữ liệu hiện có trong DB và nhập lại từ file Excel gốc).

## Phát triển local (không qua Docker)

```bash
# Backend
cd backend
npm install
npm run migrate
npm run seed:admin
npm run seed:import
npm start          # http://localhost:4000

# Frontend
cd frontend
npm install
npm run dev         # http://localhost:5173, proxy /api sang localhost:4000
```
