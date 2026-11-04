# 🏯 Chùa Online v4 — Đại tự giữa non nước

Không gian chùa 3D multiplayer (Three.js + Socket.IO), lấy cảm hứng từ các đại tự như Tam Chúc, Ba Vàng.

## Chạy
```bash
npm install
npm start
```
Mở http://localhost:3000. Mở thêm tab hoặc máy khác trong cùng mạng (http://<IP-máy>:3000) để chơi nhiều người.

## Có gì trong chùa
- Cổng Tam Quan → sân dưới (đường thần đạo, đèn lồng, cờ Phật giáo, mai vàng) → **đại bậc thang có rồng đá** → sân lư hương → **Đại Hùng Bảo Điện** hai tầng mái, rồng chầu, thờ Tam Thế Phật
- Gác chuông, gác trống, dãy hành lang tả hữu, bảo tháp 9 tầng, hồ sen có cá koi
- Hồ lớn, núi đá vôi và tượng Quan Âm trên mặt hồ

## Hoạt cảnh
- Chú tiểu quét lá đa dưới gốc đa cổ thụ: lá rơi thật, chú tiểu gom lá thành đống rồi hốt đi
- Chư Tăng kinh hành quanh lư hương
- Thầy tụng kinh gõ mõ trong chánh điện (lại gần mới nghe)
- Cứ 2 phút chú tiểu thỉnh chuông một lần, mọi người chơi cùng nghe
- Chim bồ câu bay, cá koi bơi, cờ bay theo gió, đèn lồng lắc lư

## Thời tiết ngẫu nhiên (đồng bộ cho cả chùa)
Nắng đẹp · Hoàng hôn · Âm u · Mưa · Giông bão (sấm sét) · Sương mù · Đêm trăng (đèn lồng sáng, đom đóm).
Trời tự đổi sau mỗi 2,5–4,5 phút. Có thể bấm nút thời tiết trên giao diện để “khấn” đổi trời cho mọi người.

## Điều khiển
| Phím | Tác dụng |
|---|---|
| W A S D / mũi tên | Di chuyển (Shift để đi nhanh) |
| Kéo chuột / cuộn | Xoay / zoom camera |
| E | Thắp nhang · Thỉnh chuông · Đánh trống · Gõ mõ · Thả hoa đăng (khi đứng gần) |
| B | Lễ Phật |
| Enter | Chat |
| H | Ẩn giao diện để chụp ảnh |

Điện thoại: joystick góc trái, vuốt màn hình để xoay camera.

## Deploy
Render / Railway / Fly.io: Build `npm install`, Start `npm start`. Trạng thái lưu trong RAM.
Trình duyệt cần Internet để tải Three.js và font từ CDN.

## Nhân vật (v4)
- Tỉ lệ người thật; chú tiểu có tỉ lệ trẻ em (đầu to hơn, người nhỏ)
- Khuôn mặt: mắt có lòng trắng, tròng đen, mí mắt chớp tự nhiên, lông mày, mũi, môi, gò má, tai
- Áo tràng cổ chéo, tay áo loe rộng, gấu áo; chư Tăng đắp ca-sa vắt vai
- Bàn tay có ngón; tay chuyển động bằng IK (chắp tay, cầm chổi, kéo chuông, cầm dùi mõ đúng vị trí)
- Bước chân có dép, cúi lạy gập ở hông, thở nhẹ; thầy tụng kinh nhắm mắt
