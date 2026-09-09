export function SetupPage() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <span className="brand-mark">TTH</span>
        <p className="eyebrow">TIẾN ĐỘ DỰ ÁN PTPK</p>
        <h1>Ứng dụng đã sẵn sàng kết nối dữ liệu</h1>
        <p>
          Tạo file <code>.env.local</code> từ <code>.env.example</code>, sau đó điền URL và publishable
          key của Supabase.
        </p>
        <div className="alert info">
          Ứng dụng không sử dụng dữ liệu giả hoặc localStorage làm nguồn dữ liệu nghiệp vụ.
        </div>
      </section>
    </main>
  )
}
