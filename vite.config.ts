import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages phục vụ ứng dụng trong thư mục mang tên repository.
  // Dev server vẫn dùng / để giữ nguyên địa chỉ localhost hiện tại.
  base: command === 'build' ? '/tien-do-phong-kham/' : '/',
}))
