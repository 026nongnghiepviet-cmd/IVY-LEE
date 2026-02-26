/**
 * app.js (ONE FILE ONLY)
 * Run:
 *   npm i express multer pdf-parse pdfjs-dist @napi-rs/canvas sharp tesseract.js
 *   node app.js
 * Open:
 *   http://localhost:3000
 */

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { createCanvas } = require("@napi-rs/canvas");
const sharp = require("sharp");
const { createWorker } = require("tesseract.js");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

/* ------------------------- UI (served from this JS) ------------------------- */
const HTML = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Parse Bill Shopee</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#0b1220;color:#e7eefc;margin:0}
    .wrap{max-width:980px;margin:24px auto;padding:18px}
    .card{background:#121b2f;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}
    h1{margin:0 0 8px;font-size:20px}
    p{margin:6px 0 14px;color:rgba(231,238,252,.8)}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
    input[type=file]{padding:10px;background:#0e1730;border:1px dashed rgba(255,255,255,.18);border-radius:12px;color:#e7eefc;width:420px}
    button{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#1b2a52;color:#e7eefc;cursor:pointer}
    button:disabled{opacity:.55;cursor:not-allowed}
    .status{margin-top:10px;font-size:13px;color:rgba(231,238,252,.8)}
    textarea{width:100%;min-height:220px;margin-top:12px;background:#0e1730;color:#e7eefc;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;resize:vertical}
    pre{white-space:pre-wrap;word-break:break-word;background:#0e1730;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px}
    details{margin-top:10px}
    .hint{font-size:12px;color:rgba(231,238,252,.65)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Parser Bill Shopee (PDF) — xuất đúng format</h1>
      <p>Upload PDF bill → lấy MVĐ / Khách / Địa chỉ / Tên SP / NVC (GHN hoặc Shopee Express) / Mã đơn.</p>

      <div class="row">
        <input id="file" type="file" accept="application/pdf"/>
        <button id="parse" disabled>Phân tích</button>
        <button id="copy" disabled>Copy text</button>
      </div>

      <div id="status" class="status">Chưa có file.</div>
      <textarea id="out" placeholder="Kết quả sẽ hiện ở đây..."></textarea>

      <details>
        <summary class="hint">Xem dữ liệu trích xuất (JSON)</summary>
        <pre id="json"></pre>
      </details>

      <p class="hint">* Nếu NVC nằm ở logo dạng hình (GHN/SPX) không có chữ trong PDF, hệ thống sẽ OCR vùng góc trên.</p>
    </div>
  </div>

<script>
  const $file = document.getElementById("file");
  const $parse = document.getElementById("parse");
  const $copy = document.getElementById("copy");
  const $status = document.getElementById("status");
  const $out = document.getElementById("out");
  const $json = document.getElementById("json");

  function setStatus(s){ $status.textContent = s; }

  $file.addEventListener("change", ()=>{
    $parse.disabled = !$file.files?.[0];
    $copy.disabled = true;
    $out.value = "";
    $json.textContent = "";
    setStatus($file.files?.[0] ? ("Đã chọn file: " + $file.files[0].name) : "Chưa có file.");
  });

  $copy.addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText($out.value || "");
      setStatus("Đã copy ✅");
    }catch{
      setStatus("Clipboard bị chặn bởi trình duyệt.");
    }
  });

  $parse.addEventListener("click", async ()=>{
    const f = $file.files?.[0];
    if(!f) return;

    $parse.disabled = true;
    $copy.disabled = true;
    setStatus("Đang upload & phân tích...");

    try{
      const fd = new FormData();
      fd.append("file", f);

      const res = await fetch("/parse", { method:"POST", body: fd });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || "Parse lỗi");

      $out.value = data.formatted || "";
      $json.textContent = JSON.stringify(data.info || {}, null, 2);

      $copy.disabled = false;
      setStatus("Xong ✅");
    }catch(e){
      setStatus("Lỗi: " + (e?.message || e));
    }finally{
      $parse.disabled = false;
    }
  });
</script>
</body>
</html>`;

app.get("/", (_, res) => res.type("html").send(HTML));

/* ------------------------- Helpers: parsing + OCR -------------------------- */
function normalize(s = "") {
  return String(s).replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\u00A0/g, " ").trim();
}

function pickFirstMatch(text, regex) {
  const m = text.match(regex);
  return m?.[1] ? normalize(m[1]) : "";
}

function normalizeCarrierName(raw = "") {
  const s = String(raw).toLowerCase().replace(/\s+/g, "");

  // GHN
  if (s.includes("giaohangnhanh") || s.includes("giaohàngnhanh") || s.includes("ghn")) return "GHN";

  // SPX -> Shopee Express
  if (
    s.includes("spx") ||
    s.includes("shopeeexpress") ||
    s.includes("shopeex") ||
    s.includes("shopeexpress") ||
    s.includes("shopeexress")
  ) return "Shopee Express";

  return "";
}

function detectCarrierFromText(text = "") {
  const candidates = [
    /Giao\s*Hang\s*Nhanh/i,
    /GiaoHangNhanh/i,
    /\bGHN\b/i,
    /\bSPX\b/i,
    /Shopee\s*Express/i,
    /Shopee\s*Xpress/i,
  ];

  for (const r of candidates) {
    const m = text.match(r);
    if (m?.[0]) {
      const mapped = normalizeCarrierName(m[0]);
      if (mapped) return mapped;
    }
  }
  return normalizeCarrierName(text);
}

function parseShopeeBillText(rawText = "") {
  const text = rawText || "";
  const lines = text
    .split("\n")
    .map((l) => normalize(l))
    .filter(Boolean);

  // MVĐ + Mã đơn hàng
  const mvd = pickFirstMatch(text, /Mã vận đơn\s*:\s*([A-Z0-9-]+)/i);
  const maDon = pickFirstMatch(text, /Mã đơn hàng\s*:\s*([A-Z0-9-]+)/i);

  // Tên sản phẩm (dòng kiểu "1. ... SL: 1")
  let tenSanPham = "";
  const prodLine = lines.find((l) => /^\d+\.\s+/.test(l) && /SL\s*:\s*\d+/i.test(l));
  if (prodLine) {
    tenSanPham = prodLine
      .replace(/^\d+\.\s+/, "")
      .replace(/\s*\|\s*.*$/i, "")
      .replace(/,?\s*SL\s*:\s*\d+.*$/i, "")
      .trim();
  } else {
    const prod = pickFirstMatch(text, /\d+\.\s*([\s\S]*?)SL\s*:\s*\d+/i);
    tenSanPham = normalize(prod).split("|")[0]?.replace(/,$/, "").trim() || "";
  }

  // Khách hàng + Địa chỉ: thường sau "SĐT:"
  let khachHang = "";
  let diaChi = "";

  const idxSdt = lines.findIndex((l) => /^SĐT\s*:/i.test(l));
  if (idxSdt >= 0) {
    khachHang = lines[idxSdt + 1] || "";

    const stopRegex =
      /^(600-|Được |Ngày đặt hàng|Mã vận đơn|Mã đơn hàng|Khối lượng|Chữ ký|Xác nhận|Phí|Tiền thu)/i;

    const addrParts = [];
    for (let i = idxSdt + 2; i < lines.length; i++) {
      const l = lines[i];
      if (stopRegex.test(l)) break;
      addrParts.push(l);
      if (addrParts.join(" ").length > 260) break;
    }
    diaChi = normalize(addrParts.join(" "));
  }

  // NVC text (có thể rỗng)
  const nvcText = detectCarrierFromText(text);

  return { mvd, khachHang, diaChi, tenSanPham, nvcText, maDon };
}

function formatOutput(info) {
  return [
    `MVĐ: ${info.mvd || ""}`,
    `Khách hàng: ${info.khachHang || ""}`,
    `Địa chỉ: ${info.diaChi || ""}`,
    `Địa chỉ mới: `,
    `Tên sản phẩm: ${info.tenSanPham || ""}`,
    `NVC: ${info.nvc || ""}`,
    `Đơn hàng Shopee: ${info.maDon || ""}`,
  ].join("\n");
}

/* --------------------------- OCR: carrier logo ---------------------------- */
let OCR_WORKER = null;
async function getOcrWorker() {
  if (OCR_WORKER) return OCR_WORKER;
  OCR_WORKER = await createWorker("eng");
  await OCR_WORKER.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz& ",
  });
  return OCR_WORKER;
}

async function renderFirstPageToPng(pdfBuffer, scale = 2) {
  const doc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer("image/png");
}

async function ocrCarrierFromLogoArea(pdfBuffer) {
  const png = await renderFirstPageToPng(pdfBuffer, 2);
  const meta = await sharp(png).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;

  // Crop vùng góc trên (ăn nhiều mẫu)
  const crop = {
    left: 0,
    top: 0,
    width: Math.max(1, Math.round(w * 0.70)),
    height: Math.max(1, Math.round(h * 0.25)),
  };

  // Preprocess để OCR dễ hơn
  const pre = await sharp(png)
    .extract(crop)
    .resize({ width: Math.round(crop.width * 1.6) }) // phóng to
    .grayscale()
    .threshold(180)
    .toBuffer();

  const worker = await getOcrWorker();
  const { data } = await worker.recognize(pre);
  const raw = (data?.text || "").trim();

  return normalizeCarrierName(raw);
}

/* --------------------------------- API ----------------------------------- */
app.post("/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Thiếu file PDF (field name: file)" });

    const pdfBuffer = req.file.buffer;

    // 1) Parse text
    const parsed = await pdfParse(pdfBuffer);
    const baseInfo = parseShopeeBillText(parsed.text || "");

    // 2) Detect NVC: ưu tiên text, không có thì OCR logo
    let nvc = baseInfo.nvcText || "";
    if (!nvc) {
      try {
        nvc = await ocrCarrierFromLogoArea(pdfBuffer);
      } catch {
        nvc = "";
      }
    }

    const info = { ...baseInfo, nvc };
    const formatted = formatOutput(info);

    res.json({ info, formatted });
  } catch (e) {
    res.status(500).json({ error: "Parse PDF lỗi", detail: String(e?.message || e) });
  }
});

/* ------------------------------ Start server ------------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Running: http://localhost:${PORT}`));

process.on("SIGINT", async () => {
  try { if (OCR_WORKER) await OCR_WORKER.terminate(); } catch {}
  process.exit(0);
});
