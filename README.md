# Metabase MCP Server - Cloudflare Workers

Remote MCP Server untuk mengelola Metabase melalui Cloudflare Workers.

## 🚀 Quick Start

### 1. Setup Project

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

### 2. Konfigurasi Environment Variables

#### Opsi A: Menggunakan API Key (Recommended)

```bash
# Set Metabase URL
npx wrangler secret put METABASE_URL
# Masukkan: https://your-metabase.com

# Set API Key
npx wrangler secret put METABASE_API_KEY
# Masukkan API key Anda
```

#### Opsi B: Menggunakan Username/Password

```bash
npx wrangler secret put METABASE_URL
npx wrangler secret put METABASE_USERNAME
npx wrangler secret put METABASE_PASSWORD
```

### 3. Deploy

```bash
# Deploy ke production
npm run deploy

# Atau deploy ke environment tertentu
npm run deploy:dev
npm run deploy:prod
```

### 4. Test Server

```bash
# Development local
npm run dev

# Test endpoint
curl https://metabase-mcp-server.your-account.workers.dev
```

## 📁 Struktur Project

```
metabase-mcp-server/
├── src/
│   └── index.ts          # Main worker code
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

## 🔧 Cara Menggunakan di Claude Desktop

### 1. Update Config Claude Desktop

Edit file config di:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "metabase": {
      "url": "https://metabase-mcp-server.your-account.workers.dev",
      "transport": {
        "type": "http"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

Setelah restart, MCP server akan otomatis terhubung.

## 📋 Available Tools

### Database Management
- `list_databases` - List semua database
- `list_tables` - List tabel dalam database
- `get_table_schema` - Ambil schema lengkap
- `generate_sql_template` - Generate SQL template otomatis

### Query & Visualization
- `run_sql_query` - Test SQL query
- `create_visualization_card` - Buat visualisasi baru
- `update_card` - Update card yang sudah ada

### Dashboard Management
- `create_dashboard` - Buat dashboard baru
- `list_dashboards` - List semua dashboard
- `add_card_to_dashboard` - Tambah card ke dashboard
- `resize_dashboard_card` - Resize card
- `remove_card_from_dashboard` - Hapus card dari dashboard
- `auto_arrange_dashboard` - Rapikan layout otomatis
- `set_dashboard_width` - Set full-width/fixed

### Organization
- `list_collections` - List folder/koleksi
- `create_collection` - Buat folder baru

### Sharing
- `share_dashboard_publicly` - Generate public link

## 🛠️ Development

```bash
# Run local development server
npm run dev

# View logs
npm run tail

# Type check
npx tsc --noEmit
```

## 📊 Contoh Penggunaan di Claude

```
User: "Buat dashboard penjualan bulanan untuk database Supabase"

Claude akan:
1. List databases untuk cari ID Supabase
2. List tables untuk cari tabel transaksi
3. Get schema untuk validasi kolom
4. Generate & test SQL query
5. Create visualization card
6. Create dashboard (full-width)
7. Add card ke dashboard
8. Auto-arrange layout
9. Share public link
```

## 🔐 Security Best Practices

1. **Jangan commit secrets** - Gunakan `wrangler secret`
2. **Gunakan API Key** - Lebih aman dari username/password
3. **Enable CORS jika perlu** - Tambahkan headers di worker
4. **Rate Limiting** - Pertimbangkan batasi request per IP

## 🐛 Troubleshooting

### Error: "METABASE_URL belum diset"
```bash
npx wrangler secret put METABASE_URL
```

### Error: "Gagal Login"
Cek username/password atau API key:
```bash
npx wrangler secret put METABASE_USERNAME
npx wrangler secret put METABASE_PASSWORD
```

### Error: Module not found "@cloudflare/mcp-agent"
```bash
npm install @cloudflare/mcp-agent
```

### Testing Connection
Gunakan tool `debug_connection` untuk cek koneksi.

## 📈 Monitoring

```bash
# View real-time logs
npm run tail

# Check deployment status
npx wrangler deployments list
```

## 🔄 Update & Rollback

```bash
# Deploy update baru
npm run deploy

# Rollback ke deployment sebelumnya
npx wrangler rollback

# List deployment history
npx wrangler deployments list
```

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [MCP Documentation](https://developers.cloudflare.com/agents/model-context-protocol/)
- [Metabase API Docs](https://www.metabase.com/docs/latest/api-documentation)

## 📝 License

MIT

## 🤝 Contributing

Pull requests are welcome!

---

**Made with ❤️ for Data Analysts**