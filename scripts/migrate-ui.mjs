#!/usr/bin/env node
import { createServer } from 'http';
import { readdir, readFile, access, stat } from 'fs/promises';
import { join, resolve, basename } from 'path';
import { migrateNovel, updateIndex } from './migrate-raw.mjs';

const PORT = 4400;
const RAW_BASE = 'public/raw';
const NOVELS_DIR = 'public/novels';

// --- API Handlers ---

async function listRawNovels() {
  const novels = [];
  try {
    const dirs = await readdir(RAW_BASE);
    for (const d of dirs) {
      try {
        const metaPath = join(RAW_BASE, d, 'meta.json');
        await access(metaPath);
        const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
        const novel = meta.novel;
        if (novel) {
          const jsonDir = join(RAW_BASE, d, 'json');
          let chapterCount = 0;
          try {
            const files = await readdir(jsonDir);
            chapterCount = files.filter(f => f.endsWith('.json')).length;
          } catch { /* no json dir */ }
          novels.push({
            folder: d,
            title: novel.title,
            authors: novel.authors || [],
            chapters: chapterCount,
            source: novel.url || '',
          });
        }
      } catch { /* skip invalid */ }
    }
  } catch { /* raw dir doesn't exist */ }
  return novels;
}

async function validateCustomPath(folderPath) {
  const resolved = resolve(folderPath);
  try {
    const metaPath = join(resolved, 'meta.json');
    await access(metaPath);
    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    if (!meta.novel) return { valid: false, error: 'meta.json missing "novel" key' };
    const jsonDir = join(resolved, 'json');
    let chapterCount = 0;
    try {
      const files = await readdir(jsonDir);
      chapterCount = files.filter(f => f.endsWith('.json')).length;
    } catch {
      return { valid: false, error: 'json/ directory not found' };
    }
    return {
      valid: true,
      folder: basename(resolved),
      title: meta.novel.title,
      authors: meta.novel.authors || [],
      chapters: chapterCount,
      resolvedPath: resolved,
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function runMigration(sources, log) {
  const indexEntries = [];
  let failures = 0;

  for (const src of sources) {
    const rawDir = src.resolvedPath || join(RAW_BASE, src.folder);
    try {
      log(`📖 Migrating: ${src.title || src.folder}...`);

      // Capture console output
      const origLog = console.log;
      const origErr = console.error;
      console.log = (...args) => log(args.join(' '));
      console.error = (...args) => log(`❌ ${args.join(' ')}`);

      const entry = await migrateNovel(rawDir, NOVELS_DIR);
      indexEntries.push(entry);

      console.log = origLog;
      console.error = origErr;
      log(`✅ ${src.title || src.folder} migrated successfully`);
    } catch (err) {
      log(`❌ Failed: ${src.title || src.folder} — ${err.message}`);
      failures++;
    }
  }

  if (indexEntries.length > 0) {
    await updateIndex(NOVELS_DIR, indexEntries);
    log(`📋 index.json updated with ${indexEntries.length} novel(s)`);
  }

  return { success: indexEntries.length, failures };
}

// --- HTML UI ---

function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novel Migration Tool</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    h1 span { font-size: 1.8rem; }

    .section {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #888;
      margin-bottom: 1rem;
    }

    .novel-list { list-style: none; }
    .novel-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .novel-item:hover { background: #222; }
    .novel-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #6366f1;
    }
    .novel-info { flex: 1; }
    .novel-title { font-weight: 500; color: #fff; }
    .novel-meta { font-size: 0.8rem; color: #888; margin-top: 2px; }

    .custom-path {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .custom-path input {
      flex: 1;
      padding: 0.6rem 0.8rem;
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .custom-path input:focus { border-color: #6366f1; }
    .custom-path input::placeholder { color: #555; }

    .btn {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #6366f1;
      color: #fff;
    }
    .btn-primary:hover { background: #5558e6; }
    .btn-primary:disabled {
      background: #333;
      color: #666;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #2a2a2a;
      color: #ccc;
    }
    .btn-secondary:hover { background: #333; }

    .actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .selection-count {
      font-size: 0.8rem;
      color: #888;
      margin-left: auto;
    }

    .log-container {
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.8rem;
      line-height: 1.6;
      display: none;
    }
    .log-container.active { display: block; }
    .log-line { white-space: pre-wrap; word-break: break-all; }
    .log-line.error { color: #f87171; }
    .log-line.success { color: #4ade80; }
    .log-line.info { color: #60a5fa; }

    .validated-path {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #1a2e1a;
      border: 1px solid #2d4a2d;
      border-radius: 6px;
      font-size: 0.8rem;
      display: none;
    }
    .validated-path.show { display: block; }
    .validated-path.error {
      background: #2e1a1a;
      border-color: #4a2d2d;
      color: #f87171;
    }
    .validated-path.success { color: #4ade80; }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #555;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #333;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 0.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1><span>📚</span> Novel Migration Tool</h1>

    <div class="section">
      <div class="section-title">Available in public/raw/</div>
      <ul class="novel-list" id="novelList">
        <li class="empty-state">Loading...</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-title">Custom Folder Path</div>
      <div class="custom-path">
        <input type="text" id="customPath" placeholder="/path/to/novel/folder (with meta.json + json/)">
        <button class="btn btn-secondary" id="validateBtn">Validate</button>
      </div>
      <div class="validated-path" id="validatedResult"></div>
    </div>

    <div class="section">
      <div class="actions">
        <button class="btn btn-primary" id="migrateBtn" disabled>
          Migrate Selected
        </button>
        <span class="selection-count" id="selectionCount">0 selected</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Output Log</div>
      <div class="log-container active" id="logContainer">
        <div class="log-line info">Ready. Select novels and click Migrate.</div>
      </div>
    </div>
  </div>

  <script>
    let novels = [];
    let customSource = null;
    let migrating = false;

    async function loadNovels() {
      const res = await fetch('/api/novels');
      novels = await res.json();
      renderList();
    }

    function renderList() {
      const list = document.getElementById('novelList');
      if (novels.length === 0) {
        list.innerHTML = '<li class="empty-state">No novels found in public/raw/</li>';
        return;
      }
      list.innerHTML = novels.map((n, i) => \`
        <li class="novel-item">
          <input type="checkbox" id="novel-\${i}" data-index="\${i}" onchange="updateSelection()">
          <label class="novel-info" for="novel-\${i}">
            <div class="novel-title">\${esc(n.title)}</div>
            <div class="novel-meta">\${n.chapters} chapters · \${esc(n.authors.join(', ') || 'Unknown')} · \${esc(n.folder)}</div>
          </label>
        </li>
      \`).join('');
    }

    function esc(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    function updateSelection() {
      const checked = document.querySelectorAll('.novel-item input:checked');
      const count = checked.length + (customSource ? 1 : 0);
      document.getElementById('selectionCount').textContent = count + ' selected';
      document.getElementById('migrateBtn').disabled = count === 0 || migrating;
    }

    document.getElementById('validateBtn').addEventListener('click', async () => {
      const path = document.getElementById('customPath').value.trim();
      if (!path) return;
      const result = document.getElementById('validatedResult');
      result.className = 'validated-path show';
      result.textContent = 'Validating...';

      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();

      if (data.valid) {
        result.className = 'validated-path show success';
        result.textContent = \`✓ \${data.title} — \${data.chapters} chapters (\${data.authors.join(', ') || 'Unknown'})\`;
        customSource = data;
      } else {
        result.className = 'validated-path show error';
        result.textContent = \`✗ \${data.error}\`;
        customSource = null;
      }
      updateSelection();
    });

    document.getElementById('migrateBtn').addEventListener('click', async () => {
      if (migrating) return;
      migrating = true;
      const btn = document.getElementById('migrateBtn');
      btn.innerHTML = '<span class="spinner"></span>Migrating...';
      btn.disabled = true;

      const sources = [];
      document.querySelectorAll('.novel-item input:checked').forEach(cb => {
        const idx = parseInt(cb.dataset.index);
        sources.push({ folder: novels[idx].folder, title: novels[idx].title });
      });
      if (customSource) {
        sources.push({ resolvedPath: customSource.resolvedPath, title: customSource.title, folder: customSource.folder });
      }

      const log = document.getElementById('logContainer');
      log.innerHTML = '';
      addLog('🚀 Starting migration of ' + sources.length + ' novel(s)...', 'info');

      try {
        const res = await fetch('/api/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources }),
        });
        const data = await res.json();

        for (const line of data.logs) {
          const type = line.includes('✅') || line.includes('✓') ? 'success'
            : line.includes('❌') ? 'error' : 'info';
          addLog(line, type);
        }

        if (data.failures === 0) {
          addLog(\`\\n🎉 Done! \${data.success} novel(s) migrated successfully.\`, 'success');
        } else {
          addLog(\`\\n⚠ Done with \${data.failures} failure(s). \${data.success} succeeded.\`, 'error');
        }
      } catch (err) {
        addLog('💥 Request failed: ' + err.message, 'error');
      }

      migrating = false;
      btn.innerHTML = 'Migrate Selected';
      updateSelection();
    });

    function addLog(text, type = 'info') {
      const log = document.getElementById('logContainer');
      const line = document.createElement('div');
      line.className = 'log-line ' + type;
      line.textContent = text;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }

    loadNovels();
  </script>
</body>
</html>`;
}

// --- Server ---

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
    return;
  }

  if (url.pathname === '/api/novels' && req.method === 'GET') {
    const novels = await listRawNovels();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(novels));
    return;
  }

  if (url.pathname === '/api/validate' && req.method === 'POST') {
    const body = await readBody(req);
    const { path: folderPath } = JSON.parse(body);
    const result = await validateCustomPath(folderPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === '/api/migrate' && req.method === 'POST') {
    const body = await readBody(req);
    const { sources } = JSON.parse(body);
    const logs = [];
    const log = (msg) => logs.push(msg);

    const result = await runMigration(sources, log);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...result, logs }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n🚀 Migration UI running at http://localhost:${PORT}\n`);
  console.log(`   Open in your browser to select and migrate novels.\n`);
});
