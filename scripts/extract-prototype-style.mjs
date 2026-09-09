import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'prototype', 'index.html'), 'utf8')
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1])
if (!styles.length) throw new Error('Không tìm thấy style trong prototype')
fs.writeFileSync(path.join(root, 'src', 'styles', 'prototype.css'), styles.at(-1), 'utf8')
console.log(`Đã tách ${styles.at(-1).split('\n').length} dòng CSS từ prototype`)
