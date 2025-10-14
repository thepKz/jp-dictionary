# Từ điển tính từ kinh tế tiếng Nhật

Ứng dụng web từ điển chuyên tính từ kinh tế tiếng Nhật với giao diện hiện đại và đa nguồn dữ liệu.

## ✨ Tính năng

- **Tìm kiếm thông minh**: Hỗ trợ kanji, kana, romaji và nghĩa tiếng Việt/Anh
- **Đa nguồn dữ liệu**: Jisho.org, Jotoba.de với fallback tự động
- **Lọc chuyên ngành**: Chỉ hiển thị tính từ kinh tế (経済的, 金融的, 商業的, v.v.)
- **Giao diện hiện đại**: Dark/Light mode, responsive, font Noto Sans JP
- **Chi tiết đầy đủ**: Furigana, romaji, ví dụ từ Tatoeba, audio (nếu có)
- **Tương tác**: Sao chép, chia sẻ, yêu thích, chế độ compact/chi tiết
- **Hiệu suất**: Cache, rate limiting, debounced search

## 🚀 Cài đặt

```bash
git clone <repo>
cd jp-econ-dict
npm install
npm run dev
```

Mở http://localhost:3000

## 🛠️ Cấu trúc dự án

```
src/
├── app/
│   ├── api/
│   │   ├── search/route.ts    # API tìm kiếm đa nguồn
│   │   └── examples/route.ts   # API ví dụ từ Tatoeba
│   ├── _components/
│   │   ├── SearchBox.tsx      # Component tìm kiếm chính
│   │   ├── DetailPanel.tsx    # Panel chi tiết từ vựng
│   │   └── ThemeToggle.tsx    # Toggle dark/light mode
│   ├── globals.css            # Styles và theme
│   ├── layout.tsx             # Layout với fonts
│   └── page.tsx               # Trang chủ
└── ...
```

## 🔧 API Endpoints

### `GET /api/search?q={query}&source={jisho|jotoba|auto}`

Tìm kiếm tính từ kinh tế từ nhiều nguồn.

**Parameters:**
- `q`: Từ khóa tìm kiếm (bắt buộc)
- `source`: Nguồn dữ liệu (`jisho`, `jotoba`, `auto` - mặc định)

**Response:**
```json
{
  "q": "経済的",
  "source": "jisho",
  "count": 1,
  "data": [
    {
      "kanji": "経済的",
      "reading": "けいざいてき",
      "isCommon": true,
      "senses": [
        {
          "pos": ["Na-adjective (keiyodoshi)"],
          "defs": ["economic", "financial"],
          "tags": []
        }
      ],
      "audio": []
    }
  ]
}
```

### `GET /api/examples?q={query}&to={lang}&limit={n}`

Lấy ví dụ câu từ Tatoeba.

**Parameters:**
- `q`: Từ khóa (bắt buộc)
- `to`: Ngôn ngữ dịch (`vie`, `eng` - mặc định `vie`)
- `limit`: Số lượng ví dụ (1-10, mặc định 5)

## 🎨 Customization

### Thêm từ vựng kinh tế mới

Chỉnh sửa `ECON_KEYWORDS` trong `src/app/api/search/route.ts`:

```typescript
const ECON_KEYWORDS = [
  "経済", "金融", "商業", "国際", "消費", "効率", "合理",
  // Thêm từ khóa mới
  "投資", "市場", "企業"
];
```

### Thêm nguồn API mới

1. Thêm types trong `src/app/api/search/route.ts`
2. Implement `normalize{Source}()` và `isEconomicAdjective{Source}()`
3. Thêm logic fallback trong `GET` handler

### Tùy chỉnh UI

- **Fonts**: Chỉnh sửa `src/app/layout.tsx` và `src/app/globals.css`
- **Theme**: Cập nhật CSS variables trong `globals.css`
- **Presets**: Thay đổi `PRESETS` trong `SearchBox.tsx`

## 📄 License & Attribution

### Dự án
MIT License - Xem [LICENSE](LICENSE)

### Dữ liệu nguồn

**Jisho.org API**
- Nguồn: https://jisho.org/api/
- License: Public API, không yêu cầu attribution
- Sử dụng: Tìm kiếm từ vựng chính

**Jotoba.de API**
- Nguồn: https://jotoba.de/api
- License: Public API
- Sử dụng: Fallback khi Jisho không có kết quả

**Tatoeba API**
- Nguồn: https://tatoeba.org/en/api
- License: CC BY 2.0 FR
- Sử dụng: Ví dụ câu tiếng Nhật

**Google Fonts**
- Noto Sans JP, Noto Serif JP
- License: Open Font License
- Sử dụng: Hiển thị tiếng Nhật

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

### Guidelines

- **Code style**: ESLint + Prettier
- **Commits**: Theo [Conventional Commits](https://conventionalcommits.org/)
- **Testing**: Test API endpoints và UI components
- **Documentation**: Cập nhật README khi cần

### Thêm tính năng mới

1. **API**: Thêm route trong `src/app/api/`
2. **UI**: Component trong `src/app/_components/`
3. **Types**: Định nghĩa TypeScript interfaces
4. **Tests**: Unit tests cho logic quan trọng

## 🐛 Troubleshooting

### Lỗi thường gặp

**API không trả về kết quả**
- Kiểm tra từ khóa có chứa từ kinh tế không
- Thử với `source=jisho` hoặc `source=jotoba`

**Font tiếng Nhật không hiển thị**
- Kiểm tra Google Fonts đã load
- Fallback fonts trong `globals.css`

**Rate limit exceeded**
- API có rate limiting (20 requests/phút/IP)
- Cache tự động sau 60s

### Debug

```bash
# Check API trực tiếp
curl "http://localhost:3000/api/search?q=経済的"

# Check examples
curl "http://localhost:3000/api/examples?q=経済的&to=vie&limit=3"
```

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Made with ❤️ for Japanese economic vocabulary learners**