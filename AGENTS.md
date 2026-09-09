# AGENTS.md

## Mục tiêu dự án

Xây dựng ứng dụng **Tiến độ dự án PTPK** theo hướng đơn giản, dễ sử dụng và dễ bảo trì. Dự án đang ở giai đoạn làm rõ yêu cầu; không tự giả định ý nghĩa nghiệp vụ của PTPK hoặc chọn kiến trúc lớn khi chưa có đủ dữ liệu.

## Cách làm việc

- Trao đổi với người dùng chủ yếu bằng tiếng Việt; giữ nguyên thuật ngữ kỹ thuật tiếng Anh khi rõ nghĩa hơn.
- Trước khi thay đổi, đọc `README.md`, `docs/PROJECT-BRIEF.md`, `docs/DECISIONS.md` và kiểm tra trạng thái repository.
- Phân biệt rõ Business Problem, User Need, Business Rule và Technical Solution.
- Chỉ hỏi lại khi thiếu quyết định có thể làm thay đổi đáng kể phạm vi, dữ liệu hoặc kiến trúc.
- Với quyết định nhỏ, chọn phương án đơn giản, phổ biến và có thể đảo ngược; nêu rõ giả định.
- Không thêm dependency, service trả phí hoặc hạ tầng mới nếu chưa chứng minh được sự cần thiết.
- Không ghi secret, token, mật khẩu hoặc dữ liệu nhạy cảm vào source code và tài liệu Git.
- Không xóa dữ liệu, thay đổi cấu hình máy hoặc publish ra ngoài khi chưa được yêu cầu rõ ràng.

## Khi phân tích nghiệp vụ

- Làm rõ stakeholder, current state, desired state, phạm vi, business rule, ngoại lệ và edge case.
- Khi phù hợp, chuyển yêu cầu thành User Story và Acceptance Criteria kiểm thử được.
- Cập nhật kết quả đã chốt vào `docs/PROJECT-BRIEF.md`; ghi quyết định quan trọng vào `docs/DECISIONS.md`.

## Khi viết code

- Tuân theo cấu trúc và convention đã có; ưu tiên thay đổi nhỏ, dễ review.
- Không thay đổi hành vi hiện có ngoài phạm vi yêu cầu.
- Xử lý trạng thái loading, empty, error và quyền truy cập khi có liên quan.
- Có validation ở ranh giới nhập liệu và thông báo lỗi dễ hiểu.
- Sau khi chỉnh sửa, chạy formatter, lint, type-check, test và build tương ứng với stack đang dùng.
- Nếu ứng dụng có giao diện, chạy ứng dụng và kiểm tra luồng chính trên trình duyệt trước khi kết luận hoàn thành.

## Definition of Done

Một hạng mục chỉ hoàn thành khi:

1. Đáp ứng Acceptance Criteria đã thống nhất.
2. Không làm hỏng hành vi liên quan.
3. Các kiểm tra tự động liên quan đều đạt.
4. Luồng giao diện chính đã được xác minh nếu có UI.
5. Tài liệu hoặc quyết định liên quan đã được cập nhật.
6. Tóm tắt rõ file đã đổi, cách kiểm tra và rủi ro còn lại.
