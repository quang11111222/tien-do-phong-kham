-- Giữ trường đơn vị chủ trì của mốc kiểm soát như prototype đã duyệt.
alter table public.milestones add column if not exists owner_text text;

update public.milestones milestone
set owner_text = source.owner_text
from (values
  ('Hoàn thành thiết kế', 'Phòng Thiết kế'),
  ('Hoàn thành lập dự toán', 'Phòng Kỹ thuật'),
  ('Hoàn thành mời chào và lựa chọn nhà thầu', 'Phòng HCTH'),
  ('Hoàn thành phá dỡ chính', 'Phòng Kỹ thuật'),
  ('Hoàn thành kết cấu bể XLNT', 'Phòng Kỹ thuật'),
  ('Hoàn thành phần MEP chính', 'Phòng Kỹ thuật/TBTN'),
  ('Hoàn thành máy móc, thiết bị y tế', 'Phòng Cung ứng/ TBYT'),
  ('Hoàn thành tuyển dụng bổ sung', 'Phòng PTPK'),
  ('Hoàn thành Website, mail, HIS', 'Phòng Số hóa'),
  ('Hoàn thành thi công TBA 300 kVA', 'Phòng Kỹ thuật'),
  ('Hoàn thành hệ thống RO', 'Phòng Kỹ thuật/TBTN'),
  ('Kết thúc tiến độ tổng thể', 'Phòng Kỹ thuật'),
  ('Hoàn thành Giấy phép hoạt động', 'Phòng NVY chủ trì'),
  ('Hoàn thành ký hợp đồng KCB BHYT', 'Phòng NVY chủ trì / PTPK phối hợp')
) as source(name, owner_text)
where milestone.name = source.name and milestone.owner_text is null;
