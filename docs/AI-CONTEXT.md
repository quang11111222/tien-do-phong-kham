# Ngữ cảnh làm việc chung - PTPK

## 1. Mục đích và nguồn thông tin

Codex và Claude dùng chung tài liệu trong repository này. Cơ chế này không đồng bộ lịch sử chat, bộ nhớ riêng, MCP hoặc quyền truy cập của hai công cụ; mỗi công cụ phải đọc file thực tế khi bắt đầu nhiệm vụ.

| Tài liệu | Vai trò |
|---|---|
| `README.md` | Cách chạy, kiểm tra và triển khai |
| `docs/PROJECT-BRIEF.md` | Yêu cầu, business rules và câu hỏi chưa chốt |
| `docs/DECISIONS.md` | Quyết định có ngày và lý do; quyết định mới có thể thay thế quyết định cũ |
| `docs/ARCHITECTURE.md` | Kiến trúc để đối chiếu với code hiện tại |
| `docs/AI-CONTEXT.md` | Quy tắc phối hợp chung |
| `docs/HANDOFF.md` | Công việc hiện tại và bàn giao giữa hai công cụ |

Yêu cầu mới nhất của người dùng xác định phạm vi nhiệm vụ, không mở rộng quyền xóa dữ liệu hoặc publish ngoài phạm vi đó. Bàn giao và tài liệu cũ có thể lỗi thời: nếu khác code, xác minh và nêu rõ chênh lệch; nếu khác nhau về nghiệp vụ quan trọng, hỏi người dùng trước khi tự quyết. Không coi hành vi trong code là nghiệp vụ đã được chấp thuận.

## 2. Khi bắt đầu nhiệm vụ

1. Đọc file hướng dẫn của công cụ (`AGENTS.md` hoặc `CLAUDE.md`), file này và `docs/HANDOFF.md`.
2. Đọc `README.md`, `docs/PROJECT-BRIEF.md`, `docs/DECISIONS.md`; đọc thêm tài liệu/skill liên quan theo nhiệm vụ.
3. Kiểm tra thư mục repository, nhánh, commit HEAD và `git status --short`. Giữ nguyên thay đổi có sẵn, kể cả file chưa được Git theo dõi.
4. Đối chiếu bàn giao với diff/code và bằng chứng kiểm tra. Phân biệt: đã xác minh trong phiên này, do phiên trước ghi lại, chưa kiểm tra.
5. Ghi phạm vi và công cụ đang thực hiện vào phần trạng thái hiện tại của bàn giao trước khi sửa. Nếu có công cụ khác đang thực hiện trên cùng thư mục, không tự giành việc hoặc ghi đè; xác nhận với người dùng khi trạng thái chưa rõ.

## 3. Các ranh giới cần giữ

- Không đổi kiến trúc hoặc thêm dependency nếu không cần thiết; giữ nghiệp vụ/UI ngoài phạm vi yêu cầu.
- Trước khi sửa symbol code phải chạy GitNexus impact; HIGH/CRITICAL phải cảnh báo, UNKNOWN phải xác minh thêm. Trước commit phải kiểm tra graph changes theo hướng dẫn GitNexus trong file của công cụ. Thay đổi tài liệu thuần túy không tạo symbol code để phân tích impact; không báo đã kiểm tra graph nếu chưa chạy.
- Chỉ test ghi dữ liệu tại dự án trình diễn/demo được cho phép. Không tạo, sửa, xóa dữ liệu tại Khe Tre hoặc Sơn Tây nếu không có yêu cầu riêng. Test khám phá không mặc định cho phép clean dữ liệu hoặc tạo tài khoản ngoài phạm vi đã cho phép.
- Không ghi mật khẩu, token, secret, nội dung bằng chứng hoặc thông tin cá nhân vào tài liệu bàn giao, source và Git. Chỉ ghi định danh kỹ thuật tối thiểu của dữ liệu demo khi cần.
- Không suy diễn “đã build” thành “đã deploy”, “đã deploy” thành “đã test web”, hoặc test giao diện thành đã xác minh quyền backend.
- Các quy tắc quyền, khóa bằng chứng và duyệt đọc ở Brief/Decisions; không tạo bản sao business rules trong file này để tránh lệch nhau.

## 4. Khi kết thúc hoặc chuyển công cụ

- Cập nhật bàn giao kể cả khi chưa hoàn thành hoặc đang bị chặn. Ghi chính xác file đã sửa, bước đã kiểm tra và bằng chứng; tách rõ kiểm tra chưa chạy.
- Yêu cầu/nghiệp vụ mới đã chốt: cập nhật Brief. Quyết định quan trọng hoặc thay thế quyết định cũ: ghi Decisions. Không chỉ để chúng trong chat hoặc bàn giao.
- Thay đổi code: chạy lint/type-check/test/build liên quan và kiểm tra UI khi có giao diện. Thay đổi tài liệu thuần túy: kiểm tra nội dung, đường dẫn và diff; không cần chạy test sản phẩm chỉ để sửa Markdown.
- Ghi trạng thái commit/push/deploy riêng. Không tự commit/push/deploy chỉ để cập nhật ngữ cảnh; thực hiện theo yêu cầu người dùng và hướng dẫn dự án. Không stage hàng loạt file có sẵn hoặc output chứa dữ liệu nhạy cảm.
- Mỗi lần được yêu cầu deploy, cập nhật `docs/HANDOFF.md` và đồng bộ qua Git: ghi commit/phiên bản triển khai, trạng thái migration database, kết quả workflow, kiểm thử web trực tiếp và việc còn thiếu. Không ghi “đã deploy/đã test” khi mới push hoặc build; sau triển khai phải cập nhật kết quả thực tế để công cụ tiếp theo tiếp nhận được.
- Thêm một mục vào lịch sử bàn giao ngắn, mới nhất ở trên; giữ các việc chưa giải quyết. Chi tiết dài đặt ở tài liệu/biên bản kiểm tra phù hợp và dẫn đường dẫn.

## 5. Quy tắc commit

Mỗi khi được yêu cầu commit, phải:

1. **Kiểm tra toàn bộ git status**, bao gồm file mới chưa được theo dõi.
2. **Commit đầy đủ** code và tài liệu liên quan đến nhiệm vụ, kể cả cập nhật `HANDOFF.md`, `AI-CONTEXT.md`, `AGENTS.md`, `CLAUDE.md` và project skills nếu có thay đổi.
3. **Không dùng `git add .` một cách máy móc.** Chỉ add các file cụ thể liên quan đến nhiệm vụ.
4. **Không đưa vào commit:** secret, `.env`, cấu hình riêng của máy, `outputs/` hoặc thay đổi không liên quan.
5. **Liệt kê rõ và giải thích lý do** những file chưa commit.
6. **Tuân thủ kiểm tra GitNexus** trước commit theo hướng dẫn trong `CLAUDE.md`/`AGENTS.md`.

## 6. Dùng một hoặc nhiều bản checkout

Ưu tiên làm luân phiên trên cùng repository: một công cụ sửa tại một thời điểm. `HANDOFF.md` là sổ phối hợp, không phải khóa kỹ thuật và không ngăn ghi đè tự động.

Nếu cần làm đồng thời, dùng nhánh/worktree riêng, chia phạm vi file rõ ràng và tránh cùng sửa tài liệu chung. Trước khi chuyển công cụ, ghi bàn giao tại checkout đang làm; khi hợp nhất, giữ các mục bàn giao của cả hai, không chọn toàn bộ một phía để mất nội dung phía còn lại.

Khác máy/checkout chỉ thấy ngữ cảnh sau khi file được đồng bộ qua Git hoặc phương thức người dùng chọn. Cập nhật file không làm cuộc trò chuyện đang mở tự nạp lại: sau khi chuyển bên, yêu cầu đọc lại `docs/AI-CONTEXT.md`, `docs/HANDOFF.md` và kiểm tra Git trước khi tiếp tục.
