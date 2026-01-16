import { McpAgent } from '@cloudflare/mcp-agent';

interface Env {
  METABASE_URL: string;
  METABASE_API_KEY?: string;
  METABASE_USERNAME?: string;
  METABASE_PASSWORD?: string;
}

const IGNORED_SCHEMAS = new Set([
  'information_schema', 'pg_catalog', 'pg_toast',
  'auth', 'storage', 'graphql', 'realtime', 'vault',
  'supabase_functions', '_realtime', 'net', 'extensions'
]);

// Helper untuk autentikasi
async function getSessionHeaders(env: Env): Promise<Record<string, string>> {
  if (!env.METABASE_URL) {
    throw new Error("METABASE_URL belum diset");
  }

  const baseUrl = env.METABASE_URL.replace(/\/+$/, '');

  if (env.METABASE_API_KEY) {
    return {
      'x-api-key': env.METABASE_API_KEY,
      'Content-Type': 'application/json'
    };
  }

  if (env.METABASE_USERNAME && env.METABASE_PASSWORD) {
    const authUrl = `${baseUrl}/api/session`;
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: env.METABASE_USERNAME,
        password: env.METABASE_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Gagal Login. Status: ${response.status}`);
    }

    const data = await response.json() as { id: string };
    return {
      'X-Metabase-Session': data.id,
      'Content-Type': 'application/json'
    };
  }

  throw new Error("Set API Key atau Username/Password");
}

// Tool definitions
const tools = [
  {
    name: 'debug_connection',
    description: 'Cek koneksi ke Metabase dan tampilkan URL yang dipakai',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_databases',
    description: 'Menampilkan daftar semua database di Metabase',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_collections',
    description: 'Menampilkan daftar folder/koleksi di Metabase',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_tables',
    description: 'Menampilkan daftar tabel dalam database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number', description: 'ID Database' }
      },
      required: ['database_id']
    }
  },
  {
    name: 'get_table_schema',
    description: 'Mengambil schema lengkap (kolom & tipe data) dari database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number', description: 'ID Database' }
      },
      required: ['database_id']
    }
  },
  {
    name: 'generate_sql_template',
    description: 'Membuat draft SQL Query yang valid berdasarkan Schema Database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number', description: 'ID Database' },
        table_name: { type: 'string', description: 'Nama tabel' },
        limit: { type: 'number', description: 'Batas jumlah baris', default: 100 }
      },
      required: ['database_id', 'table_name']
    }
  },
  {
    name: 'run_sql_query',
    description: 'Menjalankan SQL query untuk testing',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number', description: 'ID Database' },
        sql_query: { type: 'string', description: 'SQL Query' }
      },
      required: ['database_id', 'sql_query']
    }
  },
  {
    name: 'create_visualization_card',
    description: 'Membuat card/visualisasi baru',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nama card' },
        database_id: { type: 'number', description: 'ID Database' },
        sql_query: { type: 'string', description: 'SQL Query' },
        display_type: { type: 'string', description: 'Tipe visualisasi', default: 'table' },
        collection_id: { type: 'number', description: 'ID Folder (optional)' },
        viz_settings_json: { type: 'string', description: 'JSON settings', default: '{}' }
      },
      required: ['name', 'database_id', 'sql_query']
    }
  },
  {
    name: 'create_dashboard',
    description: 'Membuat Dashboard baru',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nama Dashboard' },
        description: { type: 'string', description: 'Deskripsi', default: '' },
        collection_id: { type: 'number', description: 'ID Folder' },
        is_full_width: { type: 'boolean', description: 'Full width?', default: true }
      },
      required: ['name']
    }
  },
  {
    name: 'list_dashboards',
    description: 'Menampilkan daftar dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        collection_id: { type: 'number', description: 'Filter by collection ID' }
      },
      required: []
    }
  },
  {
    name: 'add_card_to_dashboard',
    description: 'Menambahkan Card ke Dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'number', description: 'ID Dashboard' },
        card_id: { type: 'number', description: 'ID Card' },
        width: { type: 'number', description: 'Lebar (1-24)', default: 24 },
        height: { type: 'number', description: 'Tinggi', default: 9 }
      },
      required: ['dashboard_id', 'card_id']
    }
  },
  {
    name: 'set_dashboard_width',
    description: 'Mengubah lebar Dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'number', description: 'ID Dashboard' },
        full_width: { type: 'boolean', description: 'Full width?', default: true }
      },
      required: ['dashboard_id']
    }
  },
  {
    name: 'resize_dashboard_card',
    description: 'Mengubah ukuran Card di Dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'number', description: 'ID Dashboard' },
        card_id: { type: 'number', description: 'ID Card' },
        width: { type: 'number', description: 'Lebar baru' },
        height: { type: 'number', description: 'Tinggi baru' }
      },
      required: ['dashboard_id', 'card_id', 'width', 'height']
    }
  },
  {
    name: 'update_card',
    description: 'Memperbaiki/Update Card yang sudah ada',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number', description: 'ID Card' },
        sql_query: { type: 'string', description: 'Query SQL baru' },
        viz_settings_json: { type: 'string', description: 'Setting visual baru' },
        name: { type: 'string', description: 'Judul baru' }
      },
      required: ['card_id']
    }
  },
  {
    name: 'remove_card_from_dashboard',
    description: 'Menghapus Card dari Dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'number', description: 'ID Dashboard' },
        card_id: { type: 'number', description: 'ID Card' }
      },
      required: ['dashboard_id', 'card_id']
    }
  },
  {
    name: 'auto_arrange_dashboard',
    description: 'Merapikan posisi semua Card di Dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'number', description: 'ID Dashboard' }
      },
      required: ['dashboard_id']
    }
  },
  {
    name: 'create_collection',
    description: 'Membuat folder/koleksi baru',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nama folder' },
        parent_id: { type: 'number', description: 'ID Parent folder' }
      },
      required: ['name']
    }
  },
  {
    name: 'share_dashboard_publicly',
    description: 'Generate public link untuk dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'number', description: 'ID Dashboard' }
      },
      required: ['dashboard_id']
    }
  }
];

// Tool handlers
async function handleToolCall(name: string, args: any, env: Env): Promise<string> {
  const baseUrl = env.METABASE_URL.replace(/\/+$/, '');
  const headers = await getSessionHeaders(env);

  try {
    switch (name) {
      case 'debug_connection': {
        const url = `${baseUrl}/api/user/current`;
        const response = await fetch(url, { headers });
        return `[DEBUG INFO]\nTarget URL: ${url}\nStatus: ${response.status}\nResponse: ${await response.text()}`;
      }

      case 'list_databases': {
        const response = await fetch(`${baseUrl}/api/database`, { headers });
        if (!response.ok) return `Error: ${response.status}`;
        const dbs = await response.json() as any[];
        return dbs.map(db => `ID: ${db.id} | Name: ${db.name}`).join('\n');
      }

      case 'list_collections': {
        const response = await fetch(`${baseUrl}/api/collection`, { headers });
        const cols = await response.json() as any[];
        const result = ['ID: null (Root)'];
        cols.forEach(c => result.push(`ID: ${c.id} | Name: ${c.name}`));
        return result.join('\n');
      }

      case 'list_tables': {
        const response = await fetch(`${baseUrl}/api/database/${args.database_id}/metadata`, { headers });
        const meta = await response.json() as any;
        const tables = meta.tables || [];
        return tables
          .filter((t: any) => !IGNORED_SCHEMAS.has(t.schema))
          .map((t: any) => `${t.schema}.${t.name}`)
          .join('\n');
      }

      case 'get_table_schema': {
        const response = await fetch(`${baseUrl}/api/database/${args.database_id}/metadata`, { headers });
        const meta = await response.json() as any;
        const result: string[] = [];
        
        for (const t of meta.tables || []) {
          if (IGNORED_SCHEMAS.has(t.schema)) continue;
          const fullName = `${t.schema}.${t.name}`;
          const cols = (t.fields || []).map((c: any) => `${c.name} (${c.base_type})`);
          result.push(`Table: ${fullName}\nCols: ${cols.join(', ')}`);
        }
        return result.join('\n\n');
      }

      case 'generate_sql_template': {
        const response = await fetch(`${baseUrl}/api/database/${args.database_id}/metadata`, { headers });
        const meta = await response.json() as any;
        const tables = meta.tables || [];
        
        const target = tables.find((t: any) => 
          !IGNORED_SCHEMAS.has(t.schema) && 
          t.name.toLowerCase().includes(args.table_name.toLowerCase())
        );
        
        if (!target) return `Tabel '${args.table_name}' tidak ditemukan`;
        
        const fullName = `${target.schema}.${target.name}`;
        const columns = (target.fields || []).map((f: any) => f.name);
        const columnsStr = columns.map((c: string) => `    ${c}`).join(',\n');
        const limit = args.limit || 100;
        
        return `SELECT\n${columnsStr}\nFROM ${fullName}\nLIMIT ${limit};`;
      }

      case 'run_sql_query': {
        const response = await fetch(`${baseUrl}/api/dataset`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            database: args.database_id,
            type: 'native',
            native: { query: args.sql_query }
          })
        });
        const result = await response.json() as any;
        return result.data ? JSON.stringify(result.data.rows.slice(0, 5)) : 'No Data';
      }

      case 'create_visualization_card': {
        const settings = JSON.parse(args.viz_settings_json || '{}');
        const response = await fetch(`${baseUrl}/api/card`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            dataset_query: {
              database: args.database_id,
              type: 'native',
              native: { query: args.sql_query }
            },
            display: args.display_type || 'table',
            visualization_settings: settings,
            collection_id: args.collection_id
          })
        });
        if (response.ok) {
          const data = await response.json() as any;
          return `Sukses! ID: ${data.id}`;
        }
        return `Gagal: ${await response.text()}`;
      }

      case 'create_dashboard': {
        const response = await fetch(`${baseUrl}/api/dashboard`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            description: args.description || '',
            collection_id: args.collection_id,
            parameters: [],
            width: args.is_full_width !== false ? 'full' : 'fixed'
          })
        });
        if (response.ok) {
          const data = await response.json() as any;
          return `Dashboard '${args.name}' Berhasil! ID: ${data.id}`;
        }
        return `Gagal: ${await response.text()}`;
      }

      case 'list_dashboards': {
        const response = await fetch(`${baseUrl}/api/dashboard`, { headers });
        const dbs = await response.json() as any[];
        return dbs
          .filter(db => !args.collection_id || db.collection_id === args.collection_id)
          .map(db => `ID: ${db.id} | Name: ${db.name}`)
          .join('\n');
      }

      case 'add_card_to_dashboard': {
        const dashUrl = `${baseUrl}/api/dashboard/${args.dashboard_id}`;
        const getResp = await fetch(dashUrl, { headers });
        if (!getResp.ok) return `Gagal: ${getResp.status}`;
        
        const dashData = await getResp.json() as any;
        const cards = dashData.dashcards || [];
        
        const fakeId = -Math.floor(Math.random() * 9000) - 1000;
        cards.push({
          id: fakeId,
          card_id: args.card_id,
          size_x: args.width || 24,
          size_y: args.height || 9,
          row: 0,
          col: 0,
          parameter_mappings: [],
          visualization_settings: {},
          series: []
        });
        
        const putResp = await fetch(dashUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ dashcards: cards })
        });
        
        return putResp.ok 
          ? `Berhasil! Card ${args.card_id} masuk Dashboard ${args.dashboard_id}` 
          : `Gagal: ${await putResp.text()}`;
      }

      case 'set_dashboard_width': {
        const response = await fetch(`${baseUrl}/api/dashboard/${args.dashboard_id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            width: args.full_width !== false ? 'full' : 'fixed'
          })
        });
        return response.ok 
          ? `Dashboard ${args.dashboard_id} diset ke ${args.full_width ? 'FULL' : 'FIXED'} WIDTH` 
          : `Gagal: ${await response.text()}`;
      }

      case 'resize_dashboard_card': {
        const dashUrl = `${baseUrl}/api/dashboard/${args.dashboard_id}`;
        const getResp = await fetch(dashUrl, { headers });
        if (!getResp.ok) return `Gagal: ${getResp.status}`;
        
        const dashData = await getResp.json() as any;
        const cards = dashData.dashcards || [];
        let found = false;
        
        for (const dc of cards) {
          const cardId = dc.card_id || dc.card?.id;
          if (cardId === args.card_id) {
            dc.size_x = args.width;
            dc.size_y = args.height;
            found = true;
          }
        }
        
        if (!found) return `Card ${args.card_id} tidak ditemukan`;
        
        const putResp = await fetch(dashUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ dashcards: cards })
        });
        
        return putResp.ok 
          ? `Ukuran Card ${args.card_id} diubah jadi ${args.width}x${args.height}` 
          : `Gagal: ${await putResp.text()}`;
      }

      case 'update_card': {
        const cardUrl = `${baseUrl}/api/card/${args.card_id}`;
        const getResp = await fetch(cardUrl, { headers });
        if (!getResp.ok) return `Gagal: ${getResp.status}`;
        
        const cardData = await getResp.json() as any;
        
        if (args.name) cardData.name = args.name;
        if (args.sql_query) {
          if (!cardData.dataset_query) cardData.dataset_query = { type: 'native', native: {} };
          cardData.dataset_query.native.query = args.sql_query;
        }
        if (args.viz_settings_json) {
          const newSettings = JSON.parse(args.viz_settings_json);
          cardData.visualization_settings = { ...cardData.visualization_settings, ...newSettings };
        }
        
        ['created_at', 'updated_at', 'creator', 'last_edit_info'].forEach(f => delete cardData[f]);
        
        const putResp = await fetch(cardUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(cardData)
        });
        
        return putResp.ok ? `Card ${args.card_id} diupdate!` : `Gagal: ${await putResp.text()}`;
      }

      case 'remove_card_from_dashboard': {
        const dashUrl = `${baseUrl}/api/dashboard/${args.dashboard_id}`;
        const getResp = await fetch(dashUrl, { headers });
        if (!getResp.ok) return `Gagal: ${getResp.status}`;
        
        const dashData = await getResp.json() as any;
        const cards = (dashData.dashcards || []).filter((dc: any) => {
          const cardId = dc.card_id || dc.card?.id;
          return cardId !== args.card_id;
        });
        
        const putResp = await fetch(dashUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ dashcards: cards })
        });
        
        return putResp.ok 
          ? `Card ${args.card_id} dihapus dari Dashboard ${args.dashboard_id}` 
          : `Gagal: ${await putResp.text()}`;
      }

      case 'auto_arrange_dashboard': {
        const dashUrl = `${baseUrl}/api/dashboard/${args.dashboard_id}`;
        const getResp = await fetch(dashUrl, { headers });
        if (!getResp.ok) return `Gagal: ${getResp.status}`;
        
        const dashData = await getResp.json() as any;
        const cards = dashData.dashcards || [];
        if (cards.length === 0) return 'Dashboard kosong';
        
        cards.sort((a: any, b: any) => (a.row - b.row) || (a.col - b.col));
        
        let row = 0, col = 0, maxHeight = 0;
        
        for (const card of cards) {
          const w = card.size_x || 4;
          const h = card.size_y || 4;
          
          if (col + w > 24) {
            row += maxHeight;
            col = 0;
            maxHeight = 0;
          }
          
          card.col = col;
          card.row = row;
          col += w;
          maxHeight = Math.max(maxHeight, h);
        }
        
        const putResp = await fetch(dashUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ dashcards: cards })
        });
        
        return putResp.ok 
          ? `${cards.length} Card dirapikan!` 
          : `Gagal: ${await putResp.text()}`;
      }

      case 'create_collection': {
        const response = await fetch(`${baseUrl}/api/collection`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            parent_id: args.parent_id,
            color: '#509EE3'
          })
        });
        if (response.ok) {
          const data = await response.json() as any;
          return `ID: ${data.id}`;
        }
        return await response.text();
      }

      case 'share_dashboard_publicly': {
        const response = await fetch(`${baseUrl}/api/dashboard/${args.dashboard_id}/public_link`, {
          method: 'POST',
          headers
        });
        if (response.ok) {
          const data = await response.json() as any;
          return `Link: ${baseUrl}/public/dashboard/${data.uuid}`;
        }
        return `Gagal: ${await response.text()}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Main worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const agent = new McpAgent({
      name: 'Metabase Manager',
      version: '2.0.0',
      tools,
      prompts: [
        {
          name: 'data_analyst_sop',
          description: 'Panduan SOP lengkap untuk AI Data Analyst Metabase',
          arguments: []
        }
      ]
    });

    agent.onToolCall(async (name: string, args: any) => {
      return await handleToolCall(name, args, env);
    });

    agent.onGetPrompt(async (name: string) => {
      if (name === 'data_analyst_sop') {
        return `SYSTEM ROLE: EXPERT DATA ANALYST, POSTGRESQL QUERY BUILDER & METABASE ADMIN

Anda adalah asisten elit pengelola Metabase. Tugas Anda adalah mengubah pertanyaan bisnis menjadi visualisasi data yang akurat, estetik, dan valid secara statistik.

---

A. SOP ALUR KERJA (WORKFLOW) - WAJIB DIPATUHI:

1. FASE EKSPLORASI (Anti-Halusinasi)
   - JANGAN PERNAH menebak nama tabel atau kolom.
   - Langkah 1: Jalankan list_databases.
   - Langkah 2: Jalankan list_tables untuk melihat isi global.
   - Langkah 3: Jalankan get_table_schema pada tabel target untuk melihat tipe data kolom.

2. FASE VALIDASI SQL
   - Gunakan generate_sql_template untuk mendapatkan nama kolom yang PASTI BENAR.
   - Sebelum membuat visualisasi, WAJIB test query menggunakan run_sql_query.
   - Pastikan query tidak error dan data yang keluar sesuai logika bisnis.
   - Gunakan LIMIT saat testing agar tidak berat.
   - alias kolom jangan langsung dipakai di GROUP BY dan ORDER BY pada level query yang sama.

3. FASE ORGANISASI (Penting!)
   - SEBELUM menyimpan visualisasi (create_visualization_card), jalankan list_collections.
   - Tanyakan kepada user: "Mau disimpan di folder mana?" (Kecuali user sudah menyebutkan).
   - Jika folder belum ada, tawarkan create_collection.

4. FASE FINALISASI (Dashboard)
   - Setelah card dibuat, cek dashboard di folder tersebut (list_dashboards).
   - Tanyakan: "Tempel ke dashboard ada atau buat baru?"
   - Pastikan card tidak error sebelum menjalankan add_card_to_dashboard.
   - Gunakan add_card_to_dashboard untuk menempelkan.
   - Jalankan set_dashboard_width.

5. SHARE: Jika diminta link, gunakan share_dashboard_publicly.

---

B. STANDAR VISUALISASI & STATISTIK (Estetika Grafik)

Saat menggunakan create_visualization_card, parameter viz_settings_json HARUS diisi JSON string untuk menjamin grafik mudah dibaca.

1. BAR / LINE / AREA CHART:
   - Wajib ada label angka: "graph.show_values": true
   - Wajib nama sumbu X/Y: "graph.x_axis.title_text": "...", "graph.y_axis.title_text": "..."
   - Warna: Gunakan hex profesional (misal: #509EE3 untuk biru utama).

2. PIE CHART:
   - Tampilkan persentase dan legenda jelas.
   - "pie.show_legend": true, "pie.show_data_labels": true

3. FORMAT MATA UANG (Currency):
   - Jika kolom adalah uang, format ke IDR/USD.
   - "column_settings": {"nama_kolom": {"number_style": "currency", "currency": "IDR"}}

4. KEILMUAN STATISTIK:
   - Jika membandingkan Time Series: Gunakan Line Chart.
   - Jika membandingkan Kategori: Gunakan Bar Chart (Horizontal jika label panjang).
   - Jika Komposisi: Gunakan Stacked Bar atau Pie (maksimal 5 slice).

5. DASHBOARD LAYOUT (PENTING):
   - Jalankan set_dashboard_width
   - Metabase Grid Width = 24 kolom.
   - DEFAULT: Selalu buat dashboard dengan is_full_width=True agar visualisasi terlihat jelas di layar besar.
   - Untuk semua jenis visualisasi: Gunakan width=24 (Full Width).
   - Default Height = 9 agar mudah dibaca.
   - JIKA USER MINTA UBAH UKURAN: Gunakan resize_dashboard_card.
   - JIKA SALAH PASANG / DUPLIKAT: Gunakan remove_card_from_dashboard untuk menghapusnya.
   - SETELAH MENAMBAHKAN BANYAK KARTU: Jalankan auto_arrange_dashboard agar tampilan rapi dan tidak tumpang tindih.

6. DATA SAFETY: Gunakan Fake ID negatif saat add_card_to_dashboard.

7. PERBAIKAN (RECOVERY):
   - Jika visualisasi kosong/error: JANGAN hapus card.
   - Test query perbaikan dengan run_sql_query.
   - Jika sukses, gunakan update_card untuk menimpa query lama.`;
      }
      return '';
    });

    return await agent.handleRequest(request);
  }
};