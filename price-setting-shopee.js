/* PRICE_SETTING_SHOPEE_MODULE_ONLY_V18_20260524
 * FILE RIÊNG CHO SHOPEE. Không render tab. Không chứa TikTok Shop.
 * NNV Marketing System - TMĐT > Thiết lập giá > Shopee
 * Version: V18 Shopee Module Only + chỉnh font tiếng Việt, căn giữa số liệu và đổi nút áp dụng đề xuất
 */
(function () {
  "use strict";

  var VERSION_MARKER = "PRICE_SETTING_SHOPEE_MODULE_ONLY_V18_20260524";
  var MODULE_KEY = "NNV_PRICE_SETTING_SHOPEE_V6_CONFIG";
  var MODULE_HISTORY_KEY = "NNV_PRICE_SETTING_SHOPEE_V13_HISTORY";
  var COMPANY_PRICE_KEY = "NNV_PRICE_SETTING_SHOPEE_V15_COMPANY_PRICE_BOOK_CACHE"; // Giữ key V15 để không mất cache cũ
  var FIREBASE_PATH = "system_settings/ecom_price_setting/shopee";
  var FIREBASE_HISTORY_PATH = "system_settings/ecom_price_setting_history/shopee";
  var COMPANY_PRICE_FIREBASE_PATH = "system_settings/ecom_price_company_book/shopee/current";
  var COMPANY_PRICE_HISTORY_FIREBASE_PATH = "system_settings/ecom_price_company_book_history/shopee";

  if (window.__NNV_PRICE_SETTING_SHOPEE_VERSION__ === VERSION_MARKER) {
    return;
  }
  window.__NNV_PRICE_SETTING_SHOPEE_VERSION__ = VERSION_MARKER;

  var DEFAULT_CONFIG = {
    markupPercent: 50,
    fixedFeePercent: 14,
    transactionFeePercent: 6,
    voucherXtraPercent: 5.5,
    infrastructureFee: 3000,
    pishipFee: 2700,
    otherCostType: "amount",
    otherCostValue: 0,
    roundingStep: 1000,
    appliedSince: "",
    updatedBy: "",
    updatedByEmail: ""
  };

  var state = {
    config: clone(DEFAULT_CONFIG),
    files: [],
    activeFileId: null,
    companyPriceBook: null
  };

  function clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj || {}));
    } catch (e) {
      return {};
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    var s = String(value).trim();
    if (!s) return 0;

    s = s.replace(/\s/g, "").replace(/đ|₫|vnd|VND/g, "");
    s = s.replace(/[.,](?=\d{3}(\D|$))/g, "");
    s = s.replace(",", ".");

    var n = Number(s.replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function formatVnd(value) {
    var n = Number(value || 0);
    try {
      return Math.round(n).toLocaleString("vi-VN");
    } catch (e) {
      return String(Math.round(n));
    }
  }

  function formatPercent(value) {
    var n = Number(value || 0);
    return String(Math.round(n * 100) / 100).replace(".", ",") + "%";
  }

  function getCurrentEditor() {
    var name = "";
    var email = "";

    try {
      if (window.myIdentity) name = String(window.myIdentity);
      var header = document.getElementById("header-user-display");
      if (!name && header && header.innerText) name = header.innerText.trim();
      if (window.sysAuth && window.sysAuth.currentUser) {
        email = window.sysAuth.currentUser.email || "";
        if (!name && window.sysAuth.currentUser.displayName) name = window.sysAuth.currentUser.displayName;
      }
    } catch (e) {}

    return {
      name: name || "Không xác định",
      email: email || ""
    };
  }

  function todayFileName() {
    var d = new Date();
    return String(d.getDate()).padStart(2, "0") + "." +
      String(d.getMonth() + 1).padStart(2, "0") + "." +
      d.getFullYear();
  }

  function safeName(name) {
    return String(name || "FILE")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function showToast(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }

    var el = $("ps-toast");
    if (!el) {
      alert(message);
      return;
    }

    el.className = "ps-toast show " + (type || "");
    el.innerText = message;
    setTimeout(function () {
      el.className = "ps-toast";
    }, 2800);
  }

  function totalPercentFee(cfg) {
    cfg = cfg || {};
    var otherPercent = cfg.otherCostType === "percent" ? Number(cfg.otherCostValue || 0) : 0;
    return Number(cfg.fixedFeePercent || 0) +
      Number(cfg.transactionFeePercent || 0) +
      Number(cfg.voucherXtraPercent || 0) +
      otherPercent;
  }

  function totalFixedFee(cfg) {
    cfg = cfg || {};
    var otherAmount = cfg.otherCostType === "amount" || !cfg.otherCostType ? Number(cfg.otherCostValue || 0) : 0;
    return Number(cfg.infrastructureFee || 0) + Number(cfg.pishipFee || 0) + otherAmount;
  }

  function formatOtherCost(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var value = Number(cfg.otherCostValue || 0);
    return cfg.otherCostType === "percent" ? formatPercent(value) : formatVnd(value) + "đ/đơn";
  }

  function parseOtherCostInput(rawValue) {
    var raw = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
    var isPercent = raw.indexOf("%") >= 0;
    return {
      type: isPercent ? "percent" : "amount",
      value: toNumber(raw)
    };
  }

  function formatOtherCostInput(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var value = Number(cfg.otherCostValue || 0);
    if (!value) return "0";
    return cfg.otherCostType === "percent" ? String(value).replace(".", ",") + "%" : String(value);
  }

  function ceilToStep(value, step) {
    step = Number(step || 1);
    if (step < 1) step = 1;
    return Math.ceil(Number(value || 0) / step) * step;
  }

  function calcMinimumPrice(basePrice, cfg) {
    var percentRate = totalPercentFee(cfg) / 100;
    var fixedFee = totalFixedFee(cfg);

    if (percentRate >= 1) {
      throw new Error("Tổng phí phần trăm phải nhỏ hơn 100%.");
    }

    var rawPrice = (Number(basePrice || 0) + fixedFee) / (1 - percentRate);
    return ceilToStep(rawPrice, cfg.roundingStep || 1);
  }

  function calcNetRevenue(sellingPrice, cfg) {
    var percentRate = totalPercentFee(cfg) / 100;
    return Number(sellingPrice || 0) * (1 - percentRate) - totalFixedFee(cfg);
  }

  function getFormConfig() {
    var parsedOtherCost = parseOtherCostInput($("ps-other-cost-value") ? $("ps-other-cost-value").value : DEFAULT_CONFIG.otherCostValue);
    var cfg = {
      markupPercent: toNumber($("ps-markup-percent") ? $("ps-markup-percent").value : DEFAULT_CONFIG.markupPercent),
      fixedFeePercent: toNumber($("ps-fixed-fee-percent") ? $("ps-fixed-fee-percent").value : DEFAULT_CONFIG.fixedFeePercent),
      transactionFeePercent: toNumber($("ps-transaction-fee-percent") ? $("ps-transaction-fee-percent").value : DEFAULT_CONFIG.transactionFeePercent),
      voucherXtraPercent: toNumber($("ps-voucher-xtra-percent") ? $("ps-voucher-xtra-percent").value : DEFAULT_CONFIG.voucherXtraPercent),
      infrastructureFee: toNumber($("ps-infrastructure-fee") ? $("ps-infrastructure-fee").value : DEFAULT_CONFIG.infrastructureFee),
      pishipFee: toNumber($("ps-piship-fee") ? $("ps-piship-fee").value : DEFAULT_CONFIG.pishipFee),
      otherCostType: parsedOtherCost.type,
      otherCostValue: parsedOtherCost.value,
      roundingStep: toNumber($("ps-rounding-step") ? $("ps-rounding-step").value : DEFAULT_CONFIG.roundingStep),
      appliedSince: new Date().toISOString(),
      updatedBy: getCurrentEditor().name,
      updatedByEmail: getCurrentEditor().email
    };

    if (cfg.markupPercent < 0) throw new Error("Tỷ lệ cộng giá không được âm.");
    if (cfg.otherCostValue < 0) throw new Error("Chi phí khác không được âm.");
    if (cfg.roundingStep < 1) throw new Error("Bước làm tròn phải từ 1 trở lên.");
    if (totalPercentFee(cfg) >= 100) throw new Error("Tổng phí % đang lớn hơn hoặc bằng 100%.");

    return cfg;
  }

  function applyConfigToForm(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var map = {
      "ps-markup-percent": cfg.markupPercent,
      "ps-fixed-fee-percent": cfg.fixedFeePercent,
      "ps-transaction-fee-percent": cfg.transactionFeePercent,
      "ps-voucher-xtra-percent": cfg.voucherXtraPercent,
      "ps-infrastructure-fee": cfg.infrastructureFee,
      "ps-piship-fee": cfg.pishipFee,
      "ps-other-cost-value": formatOtherCostInput(cfg),
      "ps-rounding-step": cfg.roundingStep
    };

    Object.keys(map).forEach(function (id) {
      var el = $(id);
      if (el) el.value = map[id];
    });

    syncOtherCostInputHint();

    renderFeePreview();
    renderSavedInfo(cfg);
    renderDirectCalculator();
  }

  function syncOtherCostInputHint() {
    var input = $("ps-other-cost-value");
    if (!input) return;
    var parsed = parseOtherCostInput(input.value);
    input.title = parsed.type === "percent" ? "Đang tính chi phí khác theo % giá bán" : "Đang tính chi phí khác theo số tiền mỗi đơn";
  }


  function loadLocalConfig() {
    try {
      return JSON.parse(localStorage.getItem(MODULE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveLocalConfig(cfg) {
    try {
      localStorage.setItem(MODULE_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }

  function loadLocalHistory() {
    try {
      var arr = JSON.parse(localStorage.getItem(MODULE_HISTORY_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalHistory(list) {
    try {
      localStorage.setItem(MODULE_HISTORY_KEY, JSON.stringify((list || []).slice(0, 200)));
    } catch (e) {}
  }


  function normalizeHeader(value) {
    return String(value === null || value === undefined ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function normalizeProductCode(value) {
    return String(value === null || value === undefined ? "" : value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function loadCompanyPriceBook() {
    try {
      var raw = localStorage.getItem(COMPANY_PRICE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.map) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function saveCompanyPriceBook(book) {
    // Chỉ lưu cache trên máy để mở nhanh. Nguồn chính là Firebase/hệ thống.
    try {
      localStorage.setItem(COMPANY_PRICE_KEY, JSON.stringify(book || null));
      return true;
    } catch (e) {
      return false;
    }
  }

  function packCompanyPriceBookForFirebase(book) {
    if (!book || !book.map) return null;
    var items = [];
    Object.keys(book.map).forEach(function (key) {
      var item = book.map[key] || {};
      items.push({
        key: key,
        code: item.code || key,
        price: Number(item.price || 0),
        rowIndex: item.rowIndex || ""
      });
    });

    return {
      fileName: book.fileName || "Bảng giá công ty",
      sourceFiles: Array.isArray(book.sourceFiles) ? book.sourceFiles : [],
      savedAt: book.savedAt || new Date().toISOString(),
      systemSavedAt: new Date().toISOString(),
      updatedBy: book.updatedBy || "",
      updatedByEmail: book.updatedByEmail || "",
      count: items.length,
      duplicates: book.duplicates || 0,
      invalid: book.invalid || 0,
      headerRow: book.headerRow,
      codeCol: book.codeCol,
      priceCol: book.priceCol,
      items: items
    };
  }

  function unpackCompanyPriceBookFromFirebase(data) {
    if (!data) return null;
    if (data.map) return data;
    var items = Array.isArray(data.items) ? data.items : [];
    var map = {};
    items.forEach(function (item) {
      var key = normalizeProductCode(item.key || item.code);
      if (!key) return;
      map[key] = {
        code: item.code || item.key || key,
        price: Number(item.price || 0),
        rowIndex: item.rowIndex || ""
      };
    });
    if (!Object.keys(map).length) return null;
    data.map = map;
    data.count = Object.keys(map).length;
    return data;
  }

  function loadRemoteCompanyPriceBook() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) {
        resolve(null);
        return;
      }
      try {
        window.sysDb.ref(COMPANY_PRICE_FIREBASE_PATH).once("value").then(function (snap) {
          resolve(unpackCompanyPriceBookFromFirebase(snap.val()));
        }).catch(function () {
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function saveRemoteCompanyPriceBook(book) {
    return new Promise(function (resolve, reject) {
      if (!window.sysDb || !window.sysDb.ref) {
        resolve(false);
        return;
      }
      var packed = packCompanyPriceBookForFirebase(book);
      if (!packed) {
        resolve(false);
        return;
      }
      var historyItem = {
        fileName: packed.fileName,
        sourceFilesCount: Array.isArray(packed.sourceFiles) ? packed.sourceFiles.length : 0,
        savedAt: packed.savedAt,
        systemSavedAt: packed.systemSavedAt,
        updatedBy: packed.updatedBy,
        updatedByEmail: packed.updatedByEmail,
        count: packed.count,
        duplicates: packed.duplicates,
        invalid: packed.invalid
      };

      try {
        window.sysDb.ref(COMPANY_PRICE_FIREBASE_PATH).set(packed).then(function () {
          try {
            window.sysDb.ref(COMPANY_PRICE_HISTORY_FIREBASE_PATH).push(historyItem).finally(function () {
              resolve(true);
            });
          } catch (historyErr) {
            resolve(true);
          }
        }).catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  function findCompanyPriceHeader(rows) {
    for (var r = 0; r < Math.min(rows.length, 40); r++) {
      var row = rows[r] || [];
      var codeCol = -1;
      var priceCol = -1;

      for (var c = 0; c < row.length; c++) {
        var h = normalizeHeader(row[c]);
        if (!h) continue;
        if (h === "MASP" || h.indexOf("MASP") >= 0 || h.indexOf("MAHANG") >= 0 || h.indexOf("SKU") >= 0) {
          if (codeCol < 0) codeCol = c;
        }
        if (h === "GIANDSAUTHUE" || h.indexOf("GIANDSAUTHUE") >= 0 || h.indexOf("GIASAUTHUE") >= 0) {
          if (priceCol < 0) priceCol = c;
        }
      }

      if (codeCol >= 0 && priceCol >= 0) {
        return { headerRow: r, codeCol: codeCol, priceCol: priceCol };
      }
    }

    throw new Error('Không tìm thấy cột "MÃ SP" và "GIÁ ND SAU THUẾ" trong bảng giá công ty.');
  }

  function parseCompanyPriceBookRows(rows, fileName) {
    var meta = findCompanyPriceHeader(rows);
    var map = {};
    var duplicates = 0;
    var invalid = 0;

    for (var r = meta.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var rawCode = getCell(row, meta.codeCol);
      var code = normalizeProductCode(rawCode);
      var price = toNumber(getCell(row, meta.priceCol));

      if (!code) continue;
      if (!price || price <= 0) {
        invalid += 1;
        continue;
      }
      if (map[code]) duplicates += 1;

      map[code] = {
        code: String(rawCode).trim(),
        price: price,
        rowIndex: r + 1
      };
    }

    var keys = Object.keys(map);
    if (!keys.length) {
      throw new Error("Bảng giá công ty không có dòng giá hợp lệ.");
    }

    return {
      fileName: fileName || "Bảng giá công ty",
      sourceFiles: [fileName || "Bảng giá công ty"],
      savedAt: new Date().toISOString(),
      updatedBy: getCurrentEditor().name,
      updatedByEmail: getCurrentEditor().email,
      count: keys.length,
      duplicates: duplicates,
      invalid: invalid,
      headerRow: meta.headerRow,
      codeCol: meta.codeCol,
      priceCol: meta.priceCol,
      map: map
    };
  }

  function mergeCompanyPriceBooks(books) {
    books = (books || []).filter(function (book) {
      return book && book.map;
    });

    if (!books.length) {
      throw new Error("Không có bảng giá công ty hợp lệ để lưu.");
    }

    if (books.length === 1) {
      books[0].sourceFiles = Array.isArray(books[0].sourceFiles) ? books[0].sourceFiles : [books[0].fileName || "Bảng giá công ty"];
      return books[0];
    }

    var editor = getCurrentEditor();
    var mergedMap = {};
    var sourceFiles = [];
    var duplicates = 0;
    var invalid = 0;
    var totalRows = 0;

    books.forEach(function (book) {
      if (book.fileName) sourceFiles.push(book.fileName);
      duplicates += Number(book.duplicates || 0);
      invalid += Number(book.invalid || 0);

      Object.keys(book.map || {}).forEach(function (key) {
        var item = book.map[key] || {};
        totalRows += 1;
        if (mergedMap[key]) duplicates += 1;
        mergedMap[key] = {
          code: item.code || key,
          price: Number(item.price || 0),
          rowIndex: (book.fileName || "File") + " - dòng " + (item.rowIndex || "")
        };
      });
    });

    var keys = Object.keys(mergedMap);
    if (!keys.length) {
      throw new Error("Các bảng giá công ty không có mã hợp lệ.");
    }

    return {
      fileName: sourceFiles.length + " file bảng giá công ty",
      sourceFiles: sourceFiles,
      savedAt: new Date().toISOString(),
      updatedBy: editor.name,
      updatedByEmail: editor.email,
      count: keys.length,
      totalRows: totalRows,
      duplicates: duplicates,
      invalid: invalid,
      headerRow: "multiple",
      codeCol: "multiple",
      priceCol: "multiple",
      map: mergedMap
    };
  }

  function renderCompanyPriceStatus() {
    var el = $("ps-company-price-status");
    if (!el) return;

    var book = state.companyPriceBook;
    if (!book || !book.map) {
      el.innerHTML = '<div class="ps-company-status muted">Chưa có bảng giá công ty trên hệ thống. Hãy upload file có cột <b>MÃ SP</b> và <b>GIÁ ND SAU THUẾ</b>.</div>';
      return;
    }

    var d = book.savedAt ? new Date(book.savedAt) : null;
    var timeText = d && !isNaN(d.getTime()) ? d.toLocaleString("vi-VN") : "Không rõ thời gian";
    var editor = book.updatedBy || "Không xác định";
    var email = book.updatedByEmail ? " · " + escapeHtml(book.updatedByEmail) : "";

    el.innerHTML =
      '<div class="ps-company-status ok">' +
        '<div><b>Đã lưu bảng giá công ty:</b> ' + escapeHtml(book.fileName || "") + '</div>' +
        '<div>Mã hợp lệ: <b>' + formatVnd(book.count || 0) + '</b> · Lưu hệ thống lúc: <b>' + escapeHtml(timeText) + '</b> · Người lưu: <b>' + escapeHtml(editor) + '</b>' + email + '</div>' +
        (Array.isArray(book.sourceFiles) && book.sourceFiles.length > 1 ? '<div>Nguồn dữ liệu: <b>' + formatVnd(book.sourceFiles.length) + '</b> file bảng giá công ty.</div>' : '') +
        (book.duplicates ? '<div>Có <b>' + formatVnd(book.duplicates) + '</b> mã bị trùng, hệ thống dùng giá ở dòng xuất hiện sau cùng.</div>' : '') +
      '</div>';
  }

  function readCompanyPriceFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, { type: "array", raw: true, cellDates: false });
          var sheetName = workbook.SheetNames[0];
          var sheet = workbook.Sheets[sheetName];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
          resolve(parseCompanyPriceBookRows(rows, file.name));
        } catch (err) {
          reject(new Error("Lỗi đọc " + file.name + ": " + err.message));
        }
      };
      reader.onerror = function () {
        reject(new Error("Không đọc được file " + file.name));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function handleCompanyPriceFile(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;

    ensureXlsx();
    showToast("Đang đọc " + formatVnd(files.length) + " file bảng giá công ty...", "success");

    Promise.allSettled(files.map(readCompanyPriceFile)).then(function (results) {
      var books = [];
      var errors = [];

      results.forEach(function (result) {
        if (result.status === "fulfilled" && result.value) books.push(result.value);
        else errors.push(result.reason && result.reason.message ? result.reason.message : "Có file không đọc được.");
      });

      if (!books.length) {
        showToast("Không có file bảng giá công ty hợp lệ. " + errors.join(" | "), "error");
        return;
      }

      try {
        var book = mergeCompanyPriceBooks(books);
        state.companyPriceBook = book;
        saveCompanyPriceBook(book);
        renderCompanyPriceStatus();

        showToast("Đang lưu " + formatVnd(books.length) + " file bảng giá công ty lên hệ thống...", "success");

        saveRemoteCompanyPriceBook(book).then(function (savedRemote) {
          if (savedRemote) {
            state.companyPriceBook.systemSavedAt = new Date().toISOString();
            saveCompanyPriceBook(state.companyPriceBook);
            renderCompanyPriceStatus();
            var msg = "Đã lưu bảng giá công ty lên hệ thống: " + formatVnd(book.count) + " mã sản phẩm";
            if (books.length > 1) msg += " từ " + formatVnd(books.length) + " file";
            if (errors.length) msg += ". Có " + formatVnd(errors.length) + " file lỗi.";
            showToast(msg, errors.length ? "error" : "success");
          } else {
            showToast("Chưa kết nối được Firebase. Bảng giá đang lưu tạm trên máy này.", "error");
          }
        }).catch(function () {
          showToast("Chưa lưu được bảng giá công ty lên hệ thống. Dữ liệu đang dùng tạm trong phiên hiện tại.", "error");
        });
      } catch (err) {
        showToast("Lỗi xử lý bảng giá công ty: " + err.message, "error");
      }
    }).finally(function () {
      event.target.value = "";
    });
  }

  function historySnapshot(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    return {
      appliedSince: cfg.appliedSince || new Date().toISOString(),
      updatedBy: cfg.updatedBy || getCurrentEditor().name || "Không xác định",
      updatedByEmail: cfg.updatedByEmail || getCurrentEditor().email || "",
      markupPercent: Number(cfg.markupPercent || 0),
      fixedFeePercent: Number(cfg.fixedFeePercent || 0),
      transactionFeePercent: Number(cfg.transactionFeePercent || 0),
      voucherXtraPercent: Number(cfg.voucherXtraPercent || 0),
      infrastructureFee: Number(cfg.infrastructureFee || 0),
      pishipFee: Number(cfg.pishipFee || 0),
      otherCostType: cfg.otherCostType || "amount",
      otherCostValue: Number(cfg.otherCostValue || 0),
      roundingStep: Number(cfg.roundingStep || 0),
      totalPercentFee: totalPercentFee(cfg),
      totalFixedFee: totalFixedFee(cfg)
    };
  }

  function recordLocalHistory(cfg) {
    var item = historySnapshot(cfg);
    var list = loadLocalHistory();
    list.unshift(item);
    saveLocalHistory(list);
    return item;
  }

  function recordRemoteHistory(item) {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) {
        resolve(false);
        return;
      }
      try {
        window.sysDb.ref(FIREBASE_HISTORY_PATH).push(item).then(function () {
          resolve(true);
        }).catch(function () {
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function loadRemoteHistory() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) {
        resolve([]);
        return;
      }
      try {
        window.sysDb.ref(FIREBASE_HISTORY_PATH).once("value").then(function (snap) {
          var val = snap.val() || {};
          var arr = [];
          Object.keys(val).forEach(function (key) {
            if (val[key]) arr.push(Object.assign({ _key: key }, val[key]));
          });
          resolve(arr);
        }).catch(function () {
          resolve([]);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  function mergeHistory(localList, remoteList) {
    var map = {};
    var all = [];
    function add(item) {
      if (!item || !item.appliedSince) return;
      var key = [item.appliedSince, item.updatedBy || "", item.updatedByEmail || "", item.markupPercent, item.totalPercentFee, item.totalFixedFee].join("|");
      if (map[key]) return;
      map[key] = true;
      all.push(item);
    }
    (remoteList || []).forEach(add);
    (localList || []).forEach(add);
    all.sort(function (a, b) {
      return new Date(b.appliedSince || 0).getTime() - new Date(a.appliedSince || 0).getTime();
    });
    return all;
  }

  function loadAllHistory() {
    return loadRemoteHistory().then(function (remoteList) {
      return mergeHistory(loadLocalHistory(), remoteList);
    });
  }

  function loadRemoteConfig() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) {
        resolve(null);
        return;
      }

      try {
        window.sysDb.ref(FIREBASE_PATH).once("value").then(function (snap) {
          resolve(snap.val() || null);
        }).catch(function () {
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function saveRemoteConfig(cfg) {
    return new Promise(function (resolve, reject) {
      if (!window.sysDb || !window.sysDb.ref) {
        resolve(false);
        return;
      }

      try {
        window.sysDb.ref(FIREBASE_PATH).set(cfg).then(function () {
          resolve(true);
        }).catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  function saveConfig() {
    try {
      var cfg = getFormConfig();
      state.config = cfg;
      saveLocalConfig(cfg);
      var historyItem = recordLocalHistory(cfg);
      renderSavedInfo(cfg);
      renderFeePreview();
      renderDirectCalculator();

      saveRemoteConfig(cfg).then(function (remoteSaved) {
        return recordRemoteHistory(historyItem).then(function (historySaved) {
          if (remoteSaved && historySaved) {
            showToast("Đã lưu cấu hình và lịch sử thay đổi lên hệ thống.", "success");
          } else if (remoteSaved) {
            showToast("Đã lưu cấu hình lên hệ thống. Lịch sử đã lưu trên trình duyệt.", "success");
          } else {
            showToast("Đã lưu cấu hình và lịch sử trên trình duyệt.", "success");
          }
        });
      }).catch(function () {
        showToast("Đã lưu local, nhưng chưa lưu được Firebase.", "error");
      });
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function resetConfig() {
    state.config = clone(DEFAULT_CONFIG);
    saveLocalConfig(state.config);
    applyConfigToForm(state.config);
    showToast("Đã đưa cấu hình Shopee về mặc định.", "success");
  }

  function renderSavedInfo(cfg) {
    var el = $("ps-saved-info");
    if (!el) return;

    var mainText;
    if (cfg && cfg.appliedSince) {
      var d = new Date(cfg.appliedSince);
      var editor = cfg.updatedBy || "Không xác định";
      var email = cfg.updatedByEmail ? " · " + cfg.updatedByEmail : "";
      mainText =
        "Lần lưu gần nhất: <b>" + d.toLocaleString("vi-VN") +
        "</b> · Người thay đổi: <b>" + escapeHtml(editor) + "</b>" + escapeHtml(email);
    } else {
      mainText = "Chưa có lịch sử lưu. Bấm <b>Lưu cấu hình</b> để hệ thống ghi nhận thời gian và người thay đổi.";
    }

    el.innerHTML =
      '<div class="ps-saved-row">' +
        '<div class="ps-saved-main">' + mainText + '</div>' +
        '<button type="button" class="ps-history-btn" id="ps-history-toggle">Xem toàn bộ lịch sử</button>' +
      '</div>' +
      '<div class="ps-history-panel" id="ps-history-panel" style="display:none;"></div>';

    bindHistoryToggle();
  }

  function bindHistoryToggle() {
    var btn = $("ps-history-toggle");
    var panel = $("ps-history-panel");
    if (!btn || !panel) return;

    btn.onclick = function () {
      var isOpen = panel.style.display !== "none";
      if (isOpen) {
        panel.style.display = "none";
        btn.innerText = "Xem toàn bộ lịch sử";
        return;
      }

      panel.style.display = "block";
      panel.innerHTML = '<div class="ps-history-loading">Đang tải lịch sử...</div>';
      btn.innerText = "Thu gọn lịch sử";

      loadAllHistory().then(function (list) {
        renderHistoryPanel(list);
      });
    };
  }

  function renderHistoryPanel(list) {
    var panel = $("ps-history-panel");
    if (!panel) return;

    list = list || [];
    if (!list.length) {
      panel.innerHTML = '<div class="ps-history-empty">Chưa có lịch sử thay đổi cấu hình.</div>';
      return;
    }

    var html =
      '<div class="ps-history-head">' +
        '<b>Toàn bộ lịch sử thay đổi</b>' +
        '<span>' + list.length + ' lần lưu</span>' +
      '</div>' +
      '<div class="ps-history-list">';

    list.forEach(function (item) {
      var d = item.appliedSince ? new Date(item.appliedSince) : null;
      var timeText = d && !isNaN(d.getTime()) ? d.toLocaleString("vi-VN") : "Không rõ thời gian";
      var editor = item.updatedBy || "Không xác định";
      var email = item.updatedByEmail || "";
      html +=
        '<div class="ps-history-item">' +
          '<div class="ps-history-top">' +
            '<b>' + escapeHtml(timeText) + '</b>' +
            '<span>' + escapeHtml(editor) + (email ? ' · ' + escapeHtml(email) : '') + '</span>' +
          '</div>' +
          '<div class="ps-history-meta">' +
            '<span>Cộng giá: <b>' + formatPercent(item.markupPercent || 0) + '</b></span>' +
            '<span>Tổng phí %: <b>' + formatPercent(item.totalPercentFee || totalPercentFee(item)) + '</b></span>' +
            '<span>Phí cố định: <b>' + formatVnd(item.totalFixedFee || totalFixedFee(item)) + 'đ</b></span>' +
            '<span>Chi phí khác: <b>' + formatOtherCost(item) + '</b></span>' +
            '<span>Làm tròn: <b>' + formatVnd(item.roundingStep || 0) + 'đ</b></span>' +
          '</div>' +
        '</div>';
    });

    html += '</div>';
    panel.innerHTML = html;
  }

  function renderFeePreview() {
    var el = $("ps-fee-preview");
    if (!el) return;

    var cfg;
    try {
      cfg = getFormConfig();
    } catch (e) {
      cfg = state.config || DEFAULT_CONFIG;
    }

    var totalPct = totalPercentFee(cfg);
    var fixed = totalFixedFee(cfg);

    el.innerHTML =
      '<div class="ps-stat-card">' +
        '<span>Tổng phí %</span><b>' + formatPercent(totalPct) + '</b>' +
      '</div>' +
      '<div class="ps-stat-card">' +
        '<span>Phí cố định/đơn</span><b>' + formatVnd(fixed) + 'đ</b>' +
      '</div>' +
      '<div class="ps-stat-card">' +
        '<span>Chi phí khác</span><b>' + formatOtherCost(cfg) + '</b>' +
      '</div>' +
      '<div class="ps-stat-card wide">' +
        '<span>Công thức giá tối thiểu</span><b>P_min = ceil((T + ' + formatVnd(fixed) + ') / ' + (1 - totalPct / 100).toFixed(3) + ')</b>' +
      '</div>';
  }

  function renderDirectCalculator() {
    var result = $("ps-direct-result");
    if (!result) return;

    var cfg;
    try {
      cfg = getFormConfig();
    } catch (e) {
      result.innerHTML = '<div class="ps-alert bad">' + escapeHtml(e.message) + "</div>";
      return;
    }

    var base = toNumber($("ps-direct-base") ? $("ps-direct-base").value : 0);
    var testPrice = toNumber($("ps-direct-selling") ? $("ps-direct-selling").value : 0);

    if (!base) {
      result.innerHTML =
        '<div class="ps-direct-empty">Nhập giá gốc cần thu về để tính nhanh giá bán tối thiểu.</div>';
      return;
    }

    var marked = Math.round(base * (1 + cfg.markupPercent / 100));
    var minPrice = calcMinimumPrice(base, cfg);
    var netAtMin = calcNetRevenue(minPrice, cfg);
    var diffAtMin = netAtMin - base;

    var html =
      '<div class="ps-direct-grid">' +
        '<div><span>Giá sau cộng ' + formatPercent(cfg.markupPercent) + '</span><b>' + formatVnd(marked) + 'đ</b></div>' +
        '<div><span>Giá bán tối thiểu</span><b>' + formatVnd(minPrice) + 'đ</b></div>' +
        '<div><span>Tiền về sau phí</span><b>' + formatVnd(netAtMin) + 'đ</b></div>' +
        '<div><span>Chênh lệch</span><b class="' + (diffAtMin >= 0 ? "ok-text" : "bad-text") + '">' + formatVnd(diffAtMin) + 'đ</b></div>' +
      '</div>';

    if (testPrice > 0) {
      var netTest = calcNetRevenue(testPrice, cfg);
      var diffTest = netTest - base;

      html +=
        '<div class="ps-test-box">' +
          '<div><b>Kiểm tra giá bán nhập tay: ' + formatVnd(testPrice) + 'đ</b></div>' +
          '<div>Tiền về sau phí: <b>' + formatVnd(netTest) + 'đ</b></div>' +
          '<div>Chênh lệch so với giá gốc: <b class="' + (diffTest >= 0 ? "ok-text" : "bad-text") + '">' + formatVnd(diffTest) + 'đ</b></div>' +
          '<div class="' + (diffTest >= 0 ? "ps-alert ok" : "ps-alert bad") + '">' +
            (diffTest >= 0 ? "ĐẠT - Thu về không thấp hơn giá gốc." : "KHÔNG ĐẠT - Giá này làm tiền về thấp hơn giá gốc.") +
          '</div>' +
        '</div>';
    }

    result.innerHTML = html;
  }

  function ensureXlsx() {
    if (typeof XLSX === "undefined") {
      throw new Error("Không tìm thấy thư viện XLSX. Kiểm tra dòng xlsx.full.min.js đã load trước price-setting.js.");
    }
  }

  function getCell(row, col) {
    return row && row[col] !== undefined ? row[col] : null;
  }

  function detectShopeeFormat(rows) {
    if (!rows || !rows.length) throw new Error("File không có dữ liệu.");

    var techHeaderIndex = -1;
    var vnHeaderIndex = -1;
    var dataStartIndex = -1;

    for (var i = 0; i < Math.min(rows.length, 20); i++) {
      var joined = (rows[i] || []).join("|").toLowerCase();
      if (joined.indexOf("et_title_product_id") >= 0 && joined.indexOf("et_title_variation_price") >= 0) {
        techHeaderIndex = i;
      }
      if (joined.indexOf("mã sản phẩm") >= 0 && joined.indexOf("giá") >= 0) {
        vnHeaderIndex = i;
      }
    }

    if (techHeaderIndex === 0 && vnHeaderIndex === 2) {
      dataStartIndex = 6;
    }

    if (dataStartIndex < 0) {
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r] || [];
        var productId = getCell(row, 0);
        var price = toNumber(getCell(row, 6));
        if (productId !== null && productId !== "" && price > 0) {
          dataStartIndex = r;
          break;
        }
      }
    }

    if (dataStartIndex < 0) {
      throw new Error("Không tìm thấy dòng sản phẩm hợp lệ. File Shopee cần có giá ở cột G.");
    }

    return {
      techHeaderIndex: techHeaderIndex,
      vnHeaderIndex: vnHeaderIndex,
      dataStartIndex: dataStartIndex,
      productIdCol: 0,
      productNameCol: 1,
      variationIdCol: 2,
      variationNameCol: 3,
      productSkuCol: 4,
      variationSkuCol: 5,
      priceCol: 6,
      stockCol: 8
    };
  }

  function collectProducts(rows, meta) {
    var list = [];

    for (var i = meta.dataStartIndex; i < rows.length; i++) {
      var row = rows[i] || [];
      var productId = getCell(row, meta.productIdCol);
      var price = toNumber(getCell(row, meta.priceCol));
      var hasProduct = productId !== null && productId !== undefined && String(productId).trim() !== "";

      if (hasProduct && price > 0) {
        list.push({
          rowIndex: i,
          row: row,
          productId: getCell(row, meta.productIdCol),
          productName: getCell(row, meta.productNameCol),
          variationId: getCell(row, meta.variationIdCol),
          variationName: getCell(row, meta.variationNameCol),
          productSku: getCell(row, meta.productSkuCol),
          variationSku: getCell(row, meta.variationSkuCol),
          basePrice: price
        });
      }
    }

    return list;
  }


  function collectProductsWithCompanyPrice(rows, meta, priceBook) {
    var matched = [];
    var missing = [];
    var bookMap = priceBook && priceBook.map ? priceBook.map : {};

    for (var i = meta.dataStartIndex; i < rows.length; i++) {
      var row = rows[i] || [];
      var productId = getCell(row, meta.productIdCol);
      var hasProduct = productId !== null && productId !== undefined && String(productId).trim() !== "";
      if (!hasProduct) continue;

      var productSku = getCell(row, meta.productSkuCol);
      var variationSku = getCell(row, meta.variationSkuCol);
      var skuRaw = variationSku || productSku || "";
      var sku = normalizeProductCode(skuRaw);
      var priceItem = sku ? bookMap[sku] : null;
      var common = {
        rowIndex: i,
        row: row,
        productId: productId,
        productName: getCell(row, meta.productNameCol),
        variationId: getCell(row, meta.variationIdCol),
        variationName: getCell(row, meta.variationNameCol),
        productSku: productSku,
        variationSku: variationSku,
        sku: skuRaw
      };

      if (priceItem && Number(priceItem.price || 0) > 0) {
        matched.push(Object.assign({}, common, {
          basePrice: Number(priceItem.price || 0),
          companyCode: priceItem.code,
          companyPriceRow: priceItem.rowIndex
        }));
      } else {
        missing.push(Object.assign({}, common, {
          missingReason: sku ? 'Không tìm thấy SKU trong bảng giá công ty' : 'Dòng Shopee không có SKU để đối chiếu'
        }));
      }
    }

    return { matched: matched, missing: missing };
  }

  function cloneWorkbook(workbook) {
    var wb = clone(workbook);
    if (!wb.Sheets || !workbook.Sheets) return wb;

    // Giữ các thuộc tính sheet đặc biệt tốt nhất có thể.
    Object.keys(workbook.Sheets).forEach(function (sheetName) {
      if (!wb.Sheets[sheetName]) wb.Sheets[sheetName] = {};
      ["!cols", "!rows", "!merges", "!freeze", "!autofilter"].forEach(function (key) {
        if (workbook.Sheets[sheetName][key]) {
          wb.Sheets[sheetName][key] = clone(workbook.Sheets[sheetName][key]);
        }
      });
    });

    return wb;
  }

  function setSheetCellValue(sheet, rowIndex, colIndex, value) {
    var addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    var oldCell = sheet[addr] || {};
    sheet[addr] = Object.assign({}, oldCell, {
      t: "n",
      v: Number(value || 0),
      w: String(Math.round(Number(value || 0)))
    });
  }

  function updatePriceWorkbook(fileState, useAppliedWarnings) {
    var cfg = state.config;
    var wb = cloneWorkbook(fileState.workbook);
    var sheet = wb.Sheets[fileState.sheetName];
    var meta = fileState.meta;
    var warningMap = {};

    if (useAppliedWarnings) {
      (fileState.appliedWarningRowIndexes || []).forEach(function (rowIndex) {
        warningMap[rowIndex] = true;
      });
    }

    fileState.products.forEach(function (p) {
      var marked = Math.round(p.basePrice * (1 + cfg.markupPercent / 100));
      var finalPrice = calcMinimumPrice(p.basePrice, cfg);
      var value = warningMap[p.rowIndex] ? finalPrice : marked;
      setSheetCellValue(sheet, p.rowIndex, meta.priceCol, value);
    });

    return wb;
  }

  function normalizeShopeeMetaRowsForPriceFile(wb, sheetName) {
    var sheet = wb.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) return;

    // Bám theo file giá Shopee: giữ hàng/cột gốc, chỉ tinh gọn các ô hướng dẫn ở dòng 4-6 nếu tồn tại.
    // Không xóa width/height/merge.
    try {
      setTextCell(sheet, 3, 6, "Bắt buộc");
      setTextCell(sheet, 3, 8, "Bắt buộc");
    } catch (e) {}
  }

  function setTextCell(sheet, rowIndex, colIndex, value) {
    var addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    var oldCell = sheet[addr] || {};
    sheet[addr] = Object.assign({}, oldCell, { t: "s", v: value, w: value });
  }

  function calculateFile(fileState) {
    var cfg = state.config;
    var percentFee = totalPercentFee(cfg);
    var fixedFee = totalFixedFee(cfg);
    var warningRowIndexes = [];
    var appliedWarningRowIndexes = fileState.appliedWarningRowIndexes || [];

    var discountRows = [[
      "Mã sản phẩm",
      "Tên Sản phẩm (Tùy chọn)",
      "Số SKU Sản phẩm (Tùy chọn)",
      "Mã phân loại hàng",
      "Tên phân loại hàng (Tùy chọn)",
      "Số SKU Phân loại hàng (Tùy chọn)",
      "Giá gốc (Tùy chọn)",
      "Giá đã giảm",
      "Giới hạn đặt hàng (Tùy chọn)"
    ]];

    var checkRows = [[
      "STT",
      "Mã sản phẩm",
      "Tên sản phẩm",
      "SKU sản phẩm",
      "Giá gốc",
      "Giá sau cộng %",
      "Giá bán tối thiểu",
      "Tổng phí %",
      "Tổng phí cố định",
      "Tiền sàn thu %",
      "Tiền về sau phí",
      "Chênh lệch",
      "Trạng thái",
      "Cảnh báo",
      "Đã áp dụng"
    ]];

    var summary = {
      total: fileState.products.length,
      ok: 0,
      fail: 0,
      warning: 0,
      applied: 0,
      minRequiredMarkup: 0
    };

    var appliedMap = {};
    appliedWarningRowIndexes.forEach(function (rowIndex) {
      appliedMap[rowIndex] = true;
    });

    fileState.products.forEach(function (p, index) {
      var base = p.basePrice;
      var marked = Math.round(base * (1 + cfg.markupPercent / 100));
      var minPrice = calcMinimumPrice(base, cfg);
      var percentFeeValue = Math.round(minPrice * percentFee / 100);
      var net = calcNetRevenue(minPrice, cfg);
      var diff = net - base;
      var warning = [];
      var status = diff >= -0.0001 ? "ĐẠT" : "KHÔNG ĐẠT";
      var isWarning = false;

      if (status === "ĐẠT") summary.ok += 1;
      else {
        summary.fail += 1;
        isWarning = true;
        warning.push("Tiền về thấp hơn giá gốc");
      }

      if (minPrice > marked) {
        isWarning = true;
        warning.push("Giá tối thiểu cao hơn giá sau cộng " + formatPercent(cfg.markupPercent));
      }

      if (isWarning) {
        summary.warning += 1;
        warningRowIndexes.push(p.rowIndex);
      }

      if (appliedMap[p.rowIndex]) {
        summary.applied += 1;
      }

      var requiredMarkup = base > 0 ? ((minPrice / base) - 1) * 100 : 0;
      if (requiredMarkup > summary.minRequiredMarkup) summary.minRequiredMarkup = requiredMarkup;

      discountRows.push([
        p.productId,
        p.productName,
        p.productSku,
        p.variationId,
        p.variationName,
        p.variationSku,
        Math.round(base),
        Math.round(minPrice),
        null
      ]);

      checkRows.push([
        index + 1,
        p.productId,
        p.productName,
        p.productSku || p.variationSku || "",
        Math.round(base),
        marked,
        Math.round(minPrice),
        percentFee / 100,
        fixedFee,
        percentFeeValue,
        Math.round(net * 100) / 100,
        Math.round(diff * 100) / 100,
        status,
        warning.join(" | "),
        appliedMap[p.rowIndex] ? "Đã áp dụng" : ""
      ]);
    });

    (fileState.missingProducts || []).forEach(function (p, idx) {
      summary.warning += 1;
      checkRows.push([
        fileState.products.length + idx + 1,
        p.productId,
        p.productName,
        p.productSku || p.variationSku || p.sku || "",
        "",
        "",
        "",
        percentFee / 100,
        fixedFee,
        "",
        "",
        "",
        "CHƯA TÍNH",
        'Không tìm thấy SKU trong bảng giá công ty',
        ""
      ]);
    });

    summary.missing = (fileState.missingProducts || []).length;
    summary.minRequiredMarkup = Math.ceil(summary.minRequiredMarkup * 10) / 10;

    fileState.discountRows = discountRows;
    fileState.checkRows = checkRows;
    fileState.warningRowIndexes = warningRowIndexes;
    fileState.summary = summary;
    fileState.priceWorkbook = updatePriceWorkbook(fileState, true);
    normalizeShopeeMetaRowsForPriceFile(fileState.priceWorkbook, fileState.sheetName);
  }

  function calculateAllFiles() {
    try {
      state.config = getFormConfig();
      if (!state.files.length) {
        showToast("Anh cần nhập ít nhất 1 file Shopee để tính giá.", "error");
        return;
      }

      state.files.forEach(calculateFile);
      renderFilesArea();
      showToast("Đã tính xong " + state.files.length + " file Shopee.", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function applyAllWarnings(fileId) {
    var fileState = getFile(fileId);
    if (!fileState) return;

    if (!fileState.summary) {
      calculateFile(fileState);
    }

    if (!fileState.warningRowIndexes || !fileState.warningRowIndexes.length) {
      showToast("File này không có sản phẩm cảnh báo để áp dụng.", "success");
      return;
    }

    fileState.appliedWarningRowIndexes = fileState.warningRowIndexes.slice();
    calculateFile(fileState);
    renderFilesArea();
    showToast("Đã áp dụng tất cả sản phẩm cảnh báo cho file: " + fileState.fileName, "success");
  }

  function getFile(fileId) {
    for (var i = 0; i < state.files.length; i++) {
      if (state.files[i].id === fileId) return state.files[i];
    }
    return null;
  }

  function removeFile(fileId) {
    state.files = state.files.filter(function (f) {
      return f.id !== fileId;
    });
    renderFilesArea();
  }

  function handleFiles(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;

    ensureXlsx();
    renderProcessingMessage("Đang đọc và xử lý " + files.length + " file giá gốc Shopee...");

    var queue = files.map(function (file) {
      return readOneFile(file);
    });

    Promise.all(queue).then(function (loaded) {
      var validFiles = loaded.filter(Boolean);
      state.config = getFormConfig();
      validFiles.forEach(function (item) {
        calculateFile(item);
        state.files.push(item);
      });
      renderFilesArea();
      showToast("Đã nhập và xử lý " + validFiles.length + " file. Bảng kiểm tra đã hiển thị bên dưới.", "success");
      event.target.value = "";
    }).catch(function (e) {
      renderFilesArea();
      showToast(e.message, "error");
      event.target.value = "";
    });
  }

  function readOneFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, {
            type: "array",
            raw: true,
            cellDates: false,
            cellStyles: true,
            bookVBA: false
          });

          var sheetName = workbook.SheetNames[0];
          var sheet = workbook.Sheets[sheetName];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
          var meta = detectShopeeFormat(rows);
          var products = collectProducts(rows, meta);

          if (!products.length) {
            throw new Error("File " + file.name + " không có sản phẩm hợp lệ.");
          }

          resolve({
            id: "PSF_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
            fileName: file.name,
            workbook: workbook,
            sheetName: sheetName,
            rows: rows,
            meta: meta,
            products: products,
            missingProducts: [],
            sourceMode: "direct-base-price",
            appliedWarningRowIndexes: [],
            warningRowIndexes: [],
            priceWorkbook: null,
            discountRows: null,
            checkRows: null,
            summary: null
          });
        } catch (err) {
          reject(new Error("Lỗi đọc file " + file.name + ": " + err.message));
        }
      };

      reader.onerror = function () {
        reject(new Error("Không đọc được file " + file.name));
      };

      reader.readAsArrayBuffer(file);
    });
  }



  function handleShopeeFilesFromCompany(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;

    if (!state.companyPriceBook || !state.companyPriceBook.map) {
      showToast("Anh cần upload bảng giá công ty trước.", "error");
      event.target.value = "";
      return;
    }

    ensureXlsx();
    renderProcessingMessage("Đang đối chiếu SKU và xử lý " + files.length + " file giá Shopee...");
    var queue = files.map(function (file) {
      return readOneShopeeFileWithCompanyPrice(file, state.companyPriceBook);
    });

    Promise.all(queue).then(function (loaded) {
      var validFiles = loaded.filter(Boolean);
      state.config = getFormConfig();
      validFiles.forEach(function (item) {
        calculateFile(item);
        state.files.push(item);
      });
      renderFilesArea();
      showToast("Đã nhập, đối chiếu và xử lý " + validFiles.length + " file Shopee. Bảng kiểm tra đã hiển thị bên dưới.", "success");
      event.target.value = "";
    }).catch(function (e) {
      renderFilesArea();
      showToast(e.message, "error");
      event.target.value = "";
    });
  }

  function readOneShopeeFileWithCompanyPrice(file, priceBook) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, {
            type: "array",
            raw: true,
            cellDates: false,
            cellStyles: true,
            bookVBA: false
          });

          var sheetName = workbook.SheetNames[0];
          var sheet = workbook.Sheets[sheetName];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
          var meta = detectShopeeFormat(rows);
          var collected = collectProductsWithCompanyPrice(rows, meta, priceBook);

          if (!collected.matched.length && !collected.missing.length) {
            throw new Error("File " + file.name + " không có sản phẩm hợp lệ.");
          }

          resolve({
            id: "PSF_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
            fileName: file.name,
            workbook: workbook,
            sheetName: sheetName,
            rows: rows,
            meta: meta,
            products: collected.matched,
            missingProducts: collected.missing,
            sourceMode: "company-price",
            companyPriceBookName: priceBook.fileName || "Bảng giá công ty",
            companyPriceBookSavedAt: priceBook.savedAt || "",
            appliedWarningRowIndexes: [],
            warningRowIndexes: [],
            priceWorkbook: null,
            discountRows: null,
            checkRows: null,
            summary: null
          });
        } catch (err) {
          reject(new Error("Lỗi đọc file Shopee " + file.name + ": " + err.message));
        }
      };

      reader.onerror = function () {
        reject(new Error("Không đọc được file " + file.name));
      };

      reader.readAsArrayBuffer(file);
    });
  }
  function downloadWorkbook(wb, fileName) {
    ensureXlsx();
    XLSX.writeFile(wb, fileName);
  }

  function aoaToWorkbook(rows, sheetName) {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);
    autosizeColumns(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
    return wb;
  }

  function autosizeColumns(ws, rows) {
    if (!rows || !rows.length) return;

    var maxCols = 0;
    rows.forEach(function (row) {
      if (row && row.length > maxCols) maxCols = row.length;
    });

    var cols = [];
    for (var c = 0; c < maxCols; c++) {
      var len = 10;
      for (var r = 0; r < Math.min(rows.length, 100); r++) {
        var value = rows[r] && rows[r][c] !== undefined && rows[r][c] !== null ? String(rows[r][c]) : "";
        if (value.length > len) len = Math.min(45, value.length + 2);
      }
      cols.push({ wch: len });
    }
    ws["!cols"] = cols;
  }

  function downloadPriceFile(fileId) {
    var f = getFile(fileId);
    if (!f) return;

    if (!f.summary) calculateFile(f);
    var name = safeName(f.fileName) + " - GIA " + formatPercent(state.config.markupPercent).replace("%", "PCT") + " SHOPEE " + todayFileName() + ".xlsx";
    downloadWorkbook(f.priceWorkbook, name);
  }

  function downloadDiscountFile(fileId) {
    var f = getFile(fileId);
    if (!f) return;

    if (!f.summary) calculateFile(f);
    var name = safeName(f.fileName) + " - CK SHOPEE " + formatPercent(totalPercentFee(state.config)).replace("%", "PCT") + "+" + totalFixedFee(state.config) + " " + todayFileName() + ".xlsx";
    downloadWorkbook(aoaToWorkbook(f.discountRows, "Sheet"), name);
  }

  function downloadCheckFile(fileId) {
    var f = getFile(fileId);
    if (!f) return;

    if (!f.summary) calculateFile(f);
    var name = safeName(f.fileName) + " - KIEM TRA GIA SHOPEE " + todayFileName() + ".xlsx";
    downloadWorkbook(aoaToWorkbook(f.checkRows, "Kiem tra"), name);
  }

  function downloadAll(type) {
    if (!state.files.length) {
      showToast("Chưa có file để tải.", "error");
      return;
    }

    state.files.forEach(function (f) {
      if (!f.summary) calculateFile(f);
      if (type === "price") downloadPriceFile(f.id);
      if (type === "discount") downloadDiscountFile(f.id);
      if (type === "check") downloadCheckFile(f.id);
    });
  }

  function renderProcessingMessage(message) {
    var el = $("ps-files-area");
    if (!el) return;

    el.innerHTML =
      '<div class="ps-processing-card">' +
        '<div class="ps-processing-spinner"></div>' +
        '<div>' +
          '<b>' + escapeHtml(message || "Đang xử lý dữ liệu...") + '</b>' +
          '<span>Hệ thống đang đọc file, tính giá %, tính chiết khấu và dựng bảng kiểm tra.</span>' +
        '</div>' +
      '</div>';
  }

  function renderFilesArea() {
    var el = $("ps-files-area");
    if (!el) return;

    if (!state.files.length) {
      el.innerHTML =
        '<div class="ps-empty-state">' +
          '<div>📦</div>' +
          '<b>Chưa có file Shopee nào</b>' +
          '<span>Chọn file Shopee ở khu vực phía trên để bắt đầu tính giá.</span>' +
        '</div>';
      return;
    }

    var html = "";

    state.files.forEach(function (f, index) {
      var s = f.summary;
      var summaryHtml = "";

      if (s) {
        summaryHtml =
          '<div class="ps-file-summary">' +
            '<span>Tổng: <b>' + formatVnd(s.total) + '</b></span>' +
            '<span>Đạt: <b class="ok-text">' + formatVnd(s.ok) + '</b></span>' +
            '<span>Cảnh báo: <b class="' + (s.warning ? "bad-text" : "ok-text") + '">' + formatVnd(s.warning) + '</b></span>' +
            (s.missing ? '<span>Chưa khớp mã: <b class="bad-text">' + formatVnd(s.missing) + '</b></span>' : '') +
            '<span>Đã áp dụng: <b>' + formatVnd(s.applied) + '</b></span>' +
            '<span>% cộng giá nên ≥ <b>' + formatPercent(s.minRequiredMarkup) + '</b></span>' +
          '</div>';
      } else {
        summaryHtml = '<div class="ps-file-summary muted">Chưa tính giá.</div>';
      }

      var warningButton = "";
      if (s && f.warningRowIndexes && f.warningRowIndexes.length > 0) {
        warningButton =
          '<button class="ps-btn warn" onclick="window.psShopeeApplyAllWarnings(\'' + f.id + '\')">Áp dụng tất cả đề xuất</button>';
      }

      html +=
        '<div class="ps-file-card">' +
          '<div class="ps-file-head">' +
            '<div>' +
              '<div class="ps-file-index">File ' + (index + 1) + ' · Shopee</div>' +
              '<div class="ps-file-name">' + escapeHtml(f.fileName) + '</div>' +
              '<div class="ps-file-meta">Sheet: <b>' + escapeHtml(f.sheetName) + '</b> · Sản phẩm tính được: <b>' + formatVnd(f.products.length) + '</b>' + (f.missingProducts && f.missingProducts.length ? ' · Chưa khớp mã: <b class="bad-text">' + formatVnd(f.missingProducts.length) + '</b>' : '') + '</div>' +
              (f.sourceMode === "company-price" ? '<div class="ps-file-meta">Giá gốc lấy từ bảng giá công ty: <b>' + escapeHtml(f.companyPriceBookName || "") + '</b></div>' : '') +
            '</div>' +
            '<button class="ps-icon-btn" title="Xóa file" onclick="window.psShopeeRemoveFile(\'' + f.id + '\')">×</button>' +
          '</div>' +
          summaryHtml +
          renderCheckPreviewTable(f) +
          '<div class="ps-file-actions">' +
            '<button class="ps-btn secondary" onclick="window.psShopeeDownloadPriceFile(\'' + f.id + '\')">Tải file giá %</button>' +
            '<button class="ps-btn secondary" onclick="window.psShopeeDownloadDiscountFile(\'' + f.id + '\')">Tải file chiết khấu</button>' +
            '<button class="ps-btn secondary" onclick="window.psShopeeDownloadCheckFile(\'' + f.id + '\')">Tải file kiểm tra</button>' +
          '</div>' +
        '</div>';
    });

    el.innerHTML = html;
  }

  function renderCheckPreviewTable(f) {
    if (!f.summary || !f.checkRows) {
      return "";
    }

    var rows = f.checkRows.slice(1);
    if (!rows.length) return "";

    var warningRows = rows.filter(function (r) { return !!r[13]; });
    var normalRows = rows.filter(function (r) { return !r[13]; });
    var bodyRows = warningRows.concat(normalRows).slice(0, 60);
    var hiddenCount = Math.max(0, rows.length - bodyRows.length);

    var html =
      '<div class="ps-check-wrap">' +
        '<div class="ps-check-head">' +
          '<div>' +
            '<div class="ps-section-small-title">Bảng kiểm tra sau khi xử lý</div>' +
            '<span>Cảnh báo được ưu tiên hiển thị đầu bảng. Dòng nào cần chỉnh sẽ có đề xuất áp dụng.</span>' +
          '</div>' +
          (f.warningRowIndexes && f.warningRowIndexes.length ? '<button class="ps-btn warn ps-small-btn" onclick="window.psShopeeApplyAllWarnings(\'' + f.id + '\')">Áp dụng tất cả đề xuất</button>' : '') +
        '</div>' +
        '<div class="ps-table-scroll">' +
          '<table class="ps-table ps-check-table">' +
            '<colgroup>' +
              '<col style="width:54px">' +
              '<col style="width:120px">' +
              '<col style="width:95px">' +
              '<col style="width:95px">' +
              '<col style="width:105px">' +
              '<col style="width:95px">' +
              '<col style="width:95px">' +
              '<col style="width:90px">' +
              '<col style="width:260px">' +
            '</colgroup>' +
            '<thead><tr>' +
              '<th>STT</th><th>SKU</th><th>Giá gốc</th><th>Giá %</th><th>Giá đề xuất</th><th>Tiền về</th><th>Chênh lệch</th><th>Trạng thái</th><th>Cảnh báo / đề xuất</th>' +
            '</tr></thead><tbody>';

    bodyRows.forEach(function (r) {
      var noBase = r[4] === "" || r[4] === null || r[4] === undefined;
      var isBad = !!r[13];
      var suggestion = "";

      if (r[13]) {
        if (String(r[13]).indexOf("Giá tối thiểu") >= 0) {
          suggestion = "Đề xuất: bấm Áp dụng tất cả đề xuất để đưa giá đề xuất vào file giá %.";
        } else if (String(r[13]).indexOf("Không tìm thấy") >= 0) {
          suggestion = "Đề xuất: kiểm tra lại SKU/MÃ SP trong bảng giá công ty.";
        } else {
          suggestion = "Đề xuất: kiểm tra lại cấu hình phí hoặc giá gốc.";
        }
      }

      html +=
        '<tr class="' + (isBad ? 'ps-row-warn' : '') + '">' +
          '<td>' + r[0] + '</td>' +
          '<td>' + escapeHtml(r[3] || "") + '</td>' +
          '<td class="num">' + (noBase ? "-" : formatVnd(r[4])) + '</td>' +
          '<td class="num">' + (noBase ? "-" : formatVnd(r[5])) + '</td>' +
          '<td class="num"><b>' + (noBase ? "-" : formatVnd(r[6])) + '</b></td>' +
          '<td class="num">' + (noBase ? "-" : formatVnd(r[10])) + '</td>' +
          '<td class="num ' + (Number(r[11] || 0) >= 0 ? 'ok-text' : 'bad-text') + '">' + (noBase ? "-" : formatVnd(r[11])) + '</td>' +
          '<td class="' + (r[12] === "ĐẠT" ? 'ok-text' : 'bad-text') + '"><b>' + escapeHtml(r[12] || "") + '</b></td>' +
          '<td>' + (r[13] ? '<div class="bad-text"><b>' + escapeHtml(r[13]) + '</b></div><div class="ps-suggest-text">' + escapeHtml(suggestion) + '</div>' : '<span class="ok-text">Đạt, không cần áp dụng đề xuất.</span>') + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';
    if (hiddenCount > 0) {
      html += '<div class="ps-table-note">Đang hiển thị 60 dòng đầu theo thứ tự ưu tiên cảnh báo. Tải file kiểm tra để xem đầy đủ ' + formatVnd(rows.length) + ' dòng.</div>';
    }
    html += '</div>';
    return html;
  }

  function injectStyles() {
    if ($("ps-modern-style-v18")) return;

    var css = document.createElement("style");
    css.id = "ps-modern-style-v18";
    css.textContent = `
      .ps-shell{
        font-family:Arial,Tahoma,"Segoe UI",Roboto,sans-serif!important;
        color:#202124;
        letter-spacing:0;
      }
      .ps-shell button,
      .ps-shell input,
      .ps-shell select,
      .ps-shell table,
      .ps-shell textarea{
        font-family:Arial,Tahoma,"Segoe UI",Roboto,sans-serif!important;
        letter-spacing:0;
      }
      .ps-hero{
        background:linear-gradient(135deg,#e8f0fe,#f8fbff 55%,#e6f4ea);
        border:1px solid #dfe8fb;
        border-radius:16px;
        padding:15px 16px;
        margin-bottom:12px;
        display:flex;
        justify-content:space-between;
        gap:18px;
        align-items:flex-start;
      }
      .ps-hero h2{
        margin:0;
        color:#1a73e8;
        font-size:18px;
        letter-spacing:0;
      }
      .ps-hero p{
        margin:8px 0 0;
        color:#5f6368;
        font-size:12.5px;
        line-height:1.45;
      }
      .ps-version{
        background:#fff;
        border:1px solid #d2e3fc;
        color:#1a73e8;
        border-radius:999px;
        padding:6px 10px;
        font-size:10.5px;
        font-weight:600;
        white-space:nowrap;
      }
      .ps-panel{
        background:#fff;
        border:1px solid #e8eaed;
        border-radius:16px;
        padding:14px;
        box-shadow:0 6px 18px rgba(60,64,67,.05);
        margin-bottom:12px;
      }
      .ps-panel-title{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:10px;
      }
      .ps-panel-title h3{
        margin:0;
        font-size:15px;
        color:#202124;
      }
      .ps-panel-title span{
        color:#5f6368;
        font-size:12px;
      }
      .ps-grid{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(165px,1fr));
        gap:12px;
      }
      .ps-fee-grid{
        grid-template-columns:repeat(8,minmax(132px,1fr));
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:4px;
        scrollbar-width:thin;
      }
      .ps-fee-grid .ps-field{
        min-width:132px;
      }
      .ps-field{
        background:#f8f9fa;
        border:1px solid #edf0f3;
        border-radius:12px;
        padding:10px;
      }
      .ps-field label{
        display:block;
        font-size:11px;
        color:#5f6368;
        font-weight:600;
        text-transform:none;
        margin-bottom:7px;
      }
      .ps-field input{
        width:100%;
        border:1px solid #dadce0!important;
        border-radius:9px!important;
        padding:9px 10px!important;
        background:#fff!important;
        color:#202124!important;
        font-size:13.5px!important;
        font-weight:500!important;
        outline:none!important;
      }
      .ps-field select{cursor:pointer;appearance:auto;font-family:Arial,Tahoma,"Segoe UI",Roboto,sans-serif!important;}
      .ps-field input:focus{
        border-color:#1a73e8!important;
        box-shadow:0 0 0 3px rgba(26,115,232,.12)!important;
      }
      .ps-actions,.ps-file-actions{
        display:flex;
        gap:10px;
        align-items:center;
        flex-wrap:wrap;
        margin-top:14px;
      }
      .ps-btn{
        border:none;
        border-radius:11px;
        padding:10px 14px;
        font-family:Arial,Tahoma,"Segoe UI",Roboto,sans-serif;
        font-size:13px;
        font-weight:600;
        line-height:1.3;
        cursor:pointer;
        background:#1a73e8;
        color:#fff;
        transition:.18s ease;
      }
      .ps-btn:hover{
        transform:translateY(-1px);
        filter:brightness(.98);
        box-shadow:0 4px 10px rgba(26,115,232,.18);
      }
      .ps-btn.secondary{
        background:#fff;
        color:#1a73e8;
        border:1px solid #d2e3fc;
      }
      .ps-btn.green{background:#1e8e3e;}
      .ps-btn.gray{background:#f1f3f4;color:#3c4043;}
      .ps-btn.warn{background:#fbbc04;color:#202124;}
      .ps-icon-btn{
        width:34px;
        height:34px;
        border:none;
        border-radius:50%;
        background:#fce8e6;
        color:#d93025;
        font-size:18px;
        line-height:1;
        cursor:pointer;
      }
      .ps-stat-row{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(165px,1fr));
        gap:10px;
        margin:14px 0 8px;
      }
      .ps-stat-card{
        background:#f8fbff;
        border:1px solid #d2e3fc;
        border-radius:14px;
        padding:12px;
      }
      .ps-stat-card span{
        display:block;
        font-size:11px;
        color:#5f6368;
        font-weight:600;
        text-transform:none;
        margin-bottom:5px;
      }
      .ps-stat-card b{
        display:block;
        color:#1a73e8;
        font-size:16px;
      }
      .ps-stat-card.wide{
        grid-column:span 2;
      }
      .ps-saved-info{
        font-size:12px;
        color:#5f6368;
        margin-top:8px;
        background:#f8f9fa;
        border:1px solid #e8eaed;
        border-radius:12px;
        padding:10px 12px;
        line-height:1.55;
      }
      .ps-saved-row{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }
      .ps-saved-main{
        min-width:0;
      }
      .ps-history-btn{
        margin-left:auto;
        flex-shrink:0;
        border:1px solid #d2e3fc;
        background:#fff;
        color:#1a73e8;
        border-radius:999px;
        padding:7px 11px;
        font-family:Arial,Tahoma,"Segoe UI",Roboto,sans-serif;
        font-size:12px;
        font-weight:600;
        cursor:pointer;
        white-space:nowrap;
      }
      .ps-history-btn:hover{
        background:#e8f0fe;
      }
      .ps-history-panel{
        margin-top:10px;
        background:#fff;
        border:1px solid #e8eaed;
        border-radius:12px;
        padding:10px;
        max-height:330px;
        overflow:auto;
      }
      .ps-history-loading,.ps-history-empty{
        color:#5f6368;
        font-size:12px;
        padding:8px;
      }
      .ps-history-head{
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:center;
        padding:2px 2px 8px;
        border-bottom:1px solid #f1f3f4;
        margin-bottom:8px;
      }
      .ps-history-head b{
        color:#202124;
      }
      .ps-history-head span{
        color:#5f6368;
        font-size:11px;
      }
      .ps-history-list{
        display:grid;
        gap:8px;
      }
      .ps-history-item{
        border:1px solid #f1f3f4;
        background:#fbfcff;
        border-radius:10px;
        padding:10px;
      }
      .ps-history-top{
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:flex-start;
        margin-bottom:7px;
      }
      .ps-history-top b{
        color:#202124;
      }
      .ps-history-top span{
        text-align:right;
        color:#5f6368;
      }
      .ps-history-meta{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
      }
      .ps-history-meta span{
        background:#fff;
        border:1px solid #e8eaed;
        border-radius:999px;
        padding:4px 8px;
        font-size:11px;
        color:#5f6368;
      }
      .ps-upload{
        border:2px dashed #1a73e8;
        background:#f8fbff;
        border-radius:16px;
        padding:18px;
        text-align:center;
        cursor:pointer;
        transition:.18s ease;
      }
      .ps-upload:hover{
        background:#e8f0fe;
      }
      .ps-upload .icon{
        font-size:30px;
        margin-bottom:4px;
      }
      .ps-upload b{
        color:#1a73e8;
        font-size:15px;
      }
      .ps-upload span{
        display:block;
        color:#5f6368;
        font-size:12px;
        margin-top:5px;
      }
      .ps-direct-grid{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
        gap:10px;
      }
      .ps-direct-grid>div,.ps-test-box{
        background:#f8f9fa;
        border:1px solid #e8eaed;
        border-radius:14px;
        padding:12px;
      }
      .ps-direct-grid span{
        display:block;
        font-size:11px;
        color:#5f6368;
        text-transform:uppercase;
        font-weight:700;
        margin-bottom:5px;
      }
      .ps-direct-grid b{
        font-size:18px;
        color:#202124;
      }
      .ps-direct-empty{
        background:#f8f9fa;
        color:#5f6368;
        border-radius:12px;
        padding:14px;
        font-size:13px;
      }
      .ps-test-box{
        margin-top:12px;
        line-height:1.7;
        font-size:13px;
      }
      .ps-alert{
        margin-top:8px;
        padding:9px 11px;
        border-radius:10px;
        font-weight:600;
      }
      .ps-alert.ok{background:#e6f4ea;color:#137333;}
      .ps-alert.bad{background:#fce8e6;color:#d93025;}
      .ps-file-card{
        background:#fff;
        border:1px solid #e8eaed;
        border-radius:18px;
        padding:16px;
        margin-bottom:10px;
        box-shadow:0 5px 16px rgba(60,64,67,.04);
      }
      .ps-file-head{
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
      }
      .ps-file-index{
        font-size:11px;
        color:#1a73e8;
        font-weight:800;
        text-transform:uppercase;
      }
      .ps-file-name{
        margin-top:4px;
        color:#202124;
        font-weight:800;
        font-size:15px;
      }
      .ps-file-meta{
        margin-top:5px;
        color:#5f6368;
        font-size:12px;
      }
      .ps-panel-title,
      .ps-direct-title{
        align-items:flex-start;
        text-align:left;
      }
      .ps-direct-title>div{
        min-width:0;
      }
      .ps-small-btn{
        padding:9px 14px;
        font-size:13px;
        border-radius:999px;
        white-space:nowrap;
      }
      .ps-direct-compact{
        border-style:dashed;
        background:linear-gradient(135deg,#ffffff,#f8fbff);
      }
      .ps-file-summary{
        display:flex;
        gap:9px;
        flex-wrap:wrap;
        margin-top:13px;
      }
      .ps-file-summary span{
        background:#f8f9fa;
        border:1px solid #e8eaed;
        border-radius:999px;
        padding:7px 10px;
        font-size:12px;
        color:#5f6368;
      }
      .ps-file-summary.muted{
        color:#5f6368;
        font-size:13px;
      }
      .ps-warning-wrap,
      .ps-check-wrap{
        margin-top:14px;
      }
      .ps-check-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:8px;
      }
      .ps-check-head span{
        display:block;
        color:#5f6368;
        font-size:12px;
        margin-top:3px;
      }
      .ps-check-table th,
      .ps-check-table td{
        white-space:normal;
      }
      .ps-row-warn{
        background:#fff8e1;
      }
      .ps-suggest-text{
        color:#5f6368;
        font-size:11.5px;
        margin-top:4px;
        line-height:1.45;
      }
      .ps-table-note{
        margin-top:8px;
        color:#5f6368;
        font-size:12px;
        background:#f8f9fa;
        border:1px solid #e8eaed;
        border-radius:10px;
        padding:8px 10px;
      }
      .ps-processing-card{
        display:flex;
        align-items:center;
        gap:12px;
        background:#f8fbff;
        border:1px solid #d2e3fc;
        border-radius:16px;
        padding:16px;
        margin-bottom:12px;
        color:#1a73e8;
      }
      .ps-processing-card b{
        display:block;
        font-size:14px;
        color:#1a73e8;
      }
      .ps-processing-card span{
        display:block;
        margin-top:4px;
        font-size:12px;
        color:#5f6368;
      }
      .ps-processing-spinner{
        width:26px;
        height:26px;
        border:3px solid #e8f0fe;
        border-top-color:#1a73e8;
        border-radius:50%;
        animation:psSpin .8s linear infinite;
        flex-shrink:0;
      }
      @keyframes psSpin{to{transform:rotate(360deg)}}
      .ps-section-small-title{
        font-size:12px;
        color:#d93025;
        font-weight:800;
        text-transform:uppercase;
        margin-bottom:8px;
      }
      .ps-table-scroll{
        overflow:auto;
        border:1px solid #e8eaed;
        border-radius:14px;
        max-height:360px;
      }
      .ps-table{
        width:100%;
        border-collapse:collapse;
        min-width:900px;
        background:#fff;
      }
      .ps-table th{
        position:sticky;
        top:0;
        background:#f5f5f5;
        color:#5f6368;
        font-size:11px;
        text-transform:uppercase;
        padding:9px;
        border-bottom:1px solid #dadce0;
        z-index:2;
        text-align:center;
        vertical-align:middle;
      }
      .ps-table td{
        padding:8px 9px;
        border-bottom:1px solid #f1f3f4;
        color:#202124;
        font-size:12px;
        vertical-align:middle;
      }
      .ps-table .num{
        text-align:center;
        font-weight:700;
      }
      .ps-check-table{
        table-layout:fixed;
      }
      .ps-check-table th,
      .ps-check-table td{
        text-align:center;
        vertical-align:middle;
        word-break:break-word;
      }
      .ps-check-table th:nth-child(9),
      .ps-check-table td:nth-child(9){
        text-align:left;
        min-width:230px;
      }
      .ok-text{color:#137333!important;}
      .bad-text{color:#d93025!important;}
      .ps-empty-state{
        text-align:center;
        padding:30px;
        color:#5f6368;
        background:#f8f9fa;
        border:1px dashed #dadce0;
        border-radius:18px;
      }
      .ps-empty-state div{
        font-size:34px;
        margin-bottom:8px;
      }
      .ps-empty-state b{
        display:block;
        color:#202124;
        margin-bottom:5px;
      }
      .ps-empty-state span{
        font-size:13px;
      }
      .ps-source-tabs{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-bottom:12px;
      }
      .ps-source-tab{
        border:1px solid #d2e3fc;
        background:#fff;
        color:#1a73e8;
        border-radius:999px;
        padding:8px 12px;
        font-family:Arial,Tahoma,"Segoe UI",Roboto,sans-serif;
        font-size:13px;
        font-weight:600;
        cursor:pointer;
        transition:.18s ease;
      }
      .ps-source-tab.active{
        background:#1a73e8;
        color:#fff;
        border-color:#1a73e8;
        box-shadow:0 4px 12px rgba(26,115,232,.16);
      }
      .ps-source-body{display:none;}
      .ps-source-body.active{display:block;}
      .ps-company-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      }
      .ps-company-status{
        margin:10px 0 12px;
        padding:10px 12px;
        border-radius:12px;
        font-size:12.5px;
        line-height:1.5;
        background:#f8f9fa;
        border:1px solid #e8eaed;
        color:#5f6368;
      }
      .ps-company-status.ok{
        background:#e6f4ea;
        border-color:#ceead6;
        color:#137333;
      }
      .ps-company-status.muted{
        background:#f8f9fa;
        color:#5f6368;
      }
      .ps-toast{
        display:none;
        position:fixed;
        left:50%;
        bottom:26px;
        transform:translateX(-50%);
        padding:12px 18px;
        border-radius:999px;
        background:#202124;
        color:#fff;
        z-index:999999;
        font-size:13px;
        font-weight:700;
      }
      .ps-toast.show{display:block;}
      .ps-toast.success{background:#137333;}
      .ps-toast.error{background:#d93025;}
      @media(max-width:768px){
        .ps-shell{font-size:13px;}
        .ps-hero{display:block;padding:14px;}
        .ps-version{display:inline-block;margin-top:10px;max-width:100%;white-space:normal;word-break:break-word;}
        .ps-panel{padding:13px;border-radius:15px;}
        .ps-panel-title{display:block;}
        .ps-panel-title span{display:block;margin-top:4px;}
        .ps-grid{grid-template-columns:1fr;}
        .ps-company-grid{grid-template-columns:1fr;}
        .ps-source-tabs{display:grid;grid-template-columns:1fr;}
        .ps-source-tab{width:100%;text-align:center;}
        .ps-fee-grid{grid-template-columns:repeat(8,minmax(132px,1fr));overflow-x:auto;}
        .ps-stat-card.wide{grid-column:span 1;}
        .ps-actions,.ps-file-actions{display:grid;grid-template-columns:1fr;}
        .ps-btn{width:100%;min-height:40px;}
        .ps-saved-row,.ps-history-top{display:block;}
        .ps-history-btn{width:100%;margin-top:8px;text-align:center;}
        .ps-history-top span{display:block;text-align:left;margin-top:4px;}
        .ps-upload{padding:16px;}
        .ps-file-head{display:block;}
        .ps-icon-btn{margin-top:8px;}
        .ps-table{min-width:760px;}
      }
      @media(max-width:420px){
        .ps-hero h2{font-size:17px;}
        .ps-version{display:none;}
        .ps-panel-title h3{font-size:14.5px;}
      }
    `;

    document.head.appendChild(css);
  }

  function fieldHtml(id, label, value) {
    return '' +
      '<div class="ps-field">' +
        '<label for="' + id + '">' + label + '</label>' +
        '<input id="' + id + '" type="number" step="0.01" value="' + value + '">' +
      '</div>';
  }

  function otherCostFieldHtml() {
    return '' +
      '<div class="ps-field">' +
        '<label for="ps-other-cost-value">Chi phí khác</label>' +
        '<input id="ps-other-cost-value" type="text" inputmode="decimal" value="0" placeholder="0 hoặc 2%" title="Nhập số tiền nếu không có %, nhập 2% nếu tính theo phần trăm giá bán">' +
      '</div>';
  }

  function renderUI() {
    var containerId = window.__NNV_PRICE_SETTING_SHOPEE_CONTAINER_ID__ || "price-setting-shopee-container";
    var container = $(containerId) || $("price-setting-container");
    if (!container) return;

    injectStyles();

    container.innerHTML =
      '<div class="ps-shell">' +
        '<div class="ps-hero">' +
          '<div>' +
            '<h2>Thiết lập giá Shopee</h2>' +
            '<p>Tạo file giá %, file chiết khấu và kiểm tra tiền về theo cấu trúc file Shopee.</p>' +
          '</div>' +
          '<div class="ps-version">' + VERSION_MARKER + '</div>' +
        '</div>' +

        '<div class="ps-panel">' +
          '<div class="ps-panel-title">' +
            '<h3>1. Cấu hình phí sàn</h3>' +
            '<span>Lưu xong sẽ áp dụng cho các lần tính tiếp theo</span>' +
          '</div>' +
          '<div class="ps-grid ps-fee-grid">' +
            fieldHtml("ps-markup-percent", "Tỷ lệ cộng giá (%)", DEFAULT_CONFIG.markupPercent) +
            fieldHtml("ps-fixed-fee-percent", "Phí cố định (%)", DEFAULT_CONFIG.fixedFeePercent) +
            fieldHtml("ps-transaction-fee-percent", "Phí xử lý giao dịch (%)", DEFAULT_CONFIG.transactionFeePercent) +
            fieldHtml("ps-voucher-xtra-percent", "Phí Voucher Xtra (%)", DEFAULT_CONFIG.voucherXtraPercent) +
            fieldHtml("ps-infrastructure-fee", "Phí hạ tầng (đ/đơn)", DEFAULT_CONFIG.infrastructureFee) +
            fieldHtml("ps-piship-fee", "Phí Piship (đ/đơn)", DEFAULT_CONFIG.pishipFee) +
            otherCostFieldHtml() +
            fieldHtml("ps-rounding-step", "Làm tròn lên bội số", DEFAULT_CONFIG.roundingStep) +
          '</div>' +
          '<div class="ps-stat-row" id="ps-fee-preview"></div>' +
          '<div class="ps-saved-info" id="ps-saved-info"></div>' +
          '<div class="ps-actions">' +
            '<button class="ps-btn green" id="ps-save-config">Lưu cấu hình</button>' +
            '<button class="ps-btn secondary" id="ps-toggle-direct" type="button">Tính nhanh 1 sản phẩm</button>' +
          '</div>' +
          '<div id="ps-direct-body" class="ps-direct-body" style="display:none; margin-top:14px;">' +
            '<div class="ps-panel-title ps-direct-title">' +
              '<div>' +
                '<h3>Tính nhanh 1 sản phẩm</h3>' +
                '<span>Kiểm tra nhanh giá bán tối thiểu theo cấu hình phí hiện tại</span>' +
              '</div>' +
            '</div>' +
            '<div class="ps-grid">' +
              fieldHtml("ps-direct-base", "Giá gốc cần thu về", "") +
              fieldHtml("ps-direct-selling", "Giá bán muốn kiểm tra", "") +
            '</div>' +
            '<div id="ps-direct-result" style="margin-top:12px;"></div>' +
          '</div>' +
        '</div>' +

        '<div class="ps-panel">' +
          '<div class="ps-panel-title">' +
            '<h3>2. Nhập dữ liệu Shopee</h3>' +
            '<span>Chọn cách lấy giá gốc để hệ thống tính giá bán</span>' +
          '</div>' +
          '<div class="ps-source-tabs">' +
            '<button type="button" class="ps-source-tab active" id="ps-source-tab-original">Nhập file giá gốc Shopee</button>' +
            '<button type="button" class="ps-source-tab" id="ps-source-tab-company">Nhập file giá Shopee</button>' +
          '</div>' +
          '<div class="ps-source-body active" id="ps-source-body-original">' +
            '<div class="ps-upload" id="ps-upload-zone-original">' +
              '<b>Chọn file giá gốc Shopee</b>' +
              '<span>File Shopee có cột Giá đang là giá gốc cần thu về · Hỗ trợ .xlsx, .xls, .csv</span>' +
              '<input type="file" id="ps-file-input-original" accept=".xlsx,.xls,.csv" multiple style="display:none;">' +
            '</div>' +
          '</div>' +
          '<div class="ps-source-body" id="ps-source-body-company">' +
            '<div id="ps-company-price-status"></div>' +
            '<div class="ps-company-grid">' +
              '<div class="ps-upload" id="ps-company-price-zone">' +
                '<b>1. Upload bảng giá công ty</b>' +
                '<span>Cần có cột MÃ SP và GIÁ ND SAU THUẾ. Có thể chọn nhiều file cùng lúc, hệ thống sẽ gộp và lưu dùng chung.</span>' +
                '<input type="file" id="ps-company-price-input" accept=".xlsx,.xls,.csv" multiple style="display:none;">' +
              '</div>' +
              '<div class="ps-upload" id="ps-shopee-price-zone">' +
                '<b>2. Upload file giá Shopee tải từ sàn</b>' +
                '<span>Hệ thống lấy SKU Shopee đối chiếu MÃ SP để thay giá gốc bằng GIÁ ND SAU THUẾ.</span>' +
                '<input type="file" id="ps-shopee-price-input" accept=".xlsx,.xls,.csv" multiple style="display:none;">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ps-actions">' +
            '<button class="ps-btn" id="ps-calc-all">Tính giá tất cả file</button>' +
            '<button class="ps-btn secondary" id="ps-download-all-price">Tải tất cả file giá %</button>' +
            '<button class="ps-btn secondary" id="ps-download-all-discount">Tải tất cả file chiết khấu</button>' +
            '<button class="ps-btn secondary" id="ps-download-all-check">Tải tất cả file kiểm tra</button>' +
          '</div>' +
        '</div>' +

        '<div id="ps-files-area"></div>' +
        '<div id="ps-toast" class="ps-toast"></div>' +
      '</div>';

    bindUI();
    applyConfigToForm(state.config);
    renderFilesArea();
  }

  function bindUI() {
    var ids = [
      "ps-markup-percent",
      "ps-fixed-fee-percent",
      "ps-transaction-fee-percent",
      "ps-voucher-xtra-percent",
      "ps-infrastructure-fee",
      "ps-piship-fee",
      "ps-other-cost-value",
      "ps-rounding-step"
    ];

    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", function () {
        renderFeePreview();
        renderDirectCalculator();
      });
    });

    var otherCostInput = $("ps-other-cost-value");
    if (otherCostInput) {
      otherCostInput.addEventListener("input", syncOtherCostInputHint);
    }

    ["ps-direct-base", "ps-direct-selling"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", renderDirectCalculator);
    });

    var toggleDirect = $("ps-toggle-direct");
    if (toggleDirect) {
      toggleDirect.onclick = function () {
        var body = $("ps-direct-body");
        if (!body) return;
        var open = body.style.display !== "none";
        body.style.display = open ? "none" : "block";
        toggleDirect.innerText = open ? "Tính nhanh 1 sản phẩm" : "Thu gọn tính nhanh";
        if (!open) renderDirectCalculator();
      };
    }

    var saveBtn = $("ps-save-config");
    if (saveBtn) saveBtn.onclick = saveConfig;


    function activateSourceTab(mode) {
      var originalTab = $("ps-source-tab-original");
      var companyTab = $("ps-source-tab-company");
      var originalBody = $("ps-source-body-original");
      var companyBody = $("ps-source-body-company");

      if (originalTab) originalTab.classList.toggle("active", mode === "original");
      if (companyTab) companyTab.classList.toggle("active", mode === "company");
      if (originalBody) originalBody.classList.toggle("active", mode === "original");
      if (companyBody) companyBody.classList.toggle("active", mode === "company");
      if (mode === "company") renderCompanyPriceStatus();
    }

    var originalTab = $("ps-source-tab-original");
    var companyTab = $("ps-source-tab-company");
    if (originalTab) originalTab.onclick = function () { activateSourceTab("original"); };
    if (companyTab) companyTab.onclick = function () { activateSourceTab("company"); };

    var originalZone = $("ps-upload-zone-original");
    var originalInput = $("ps-file-input-original");
    if (originalZone && originalInput) {
      originalZone.onclick = function () { originalInput.click(); };
      originalInput.onchange = handleFiles;
    }

    var companyZone = $("ps-company-price-zone");
    var companyInput = $("ps-company-price-input");
    if (companyZone && companyInput) {
      companyZone.onclick = function () { companyInput.click(); };
      companyInput.onchange = handleCompanyPriceFile;
    }

    var shopeeZone = $("ps-shopee-price-zone");
    var shopeeInput = $("ps-shopee-price-input");
    if (shopeeZone && shopeeInput) {
      shopeeZone.onclick = function () { shopeeInput.click(); };
      shopeeInput.onchange = handleShopeeFilesFromCompany;
    }

    renderCompanyPriceStatus();

    var calcBtn = $("ps-calc-all");
    if (calcBtn) calcBtn.onclick = calculateAllFiles;

    var allPrice = $("ps-download-all-price");
    if (allPrice) allPrice.onclick = function () { downloadAll("price"); };

    var allDiscount = $("ps-download-all-discount");
    if (allDiscount) allDiscount.onclick = function () { downloadAll("discount"); };

    var allCheck = $("ps-download-all-check");
    if (allCheck) allCheck.onclick = function () { downloadAll("check"); };
  }

  window.psShopeeApplyAllWarnings = applyAllWarnings;
  window.psShopeeRemoveFile = removeFile;
  window.psShopeeDownloadPriceFile = downloadPriceFile;
  window.psShopeeDownloadDiscountFile = downloadDiscountFile;
  window.psShopeeDownloadCheckFile = downloadCheckFile;

  window.initPriceSettingShopeeModule = function (containerId) {
    window.__NNV_PRICE_SETTING_SHOPEE_CONTAINER_ID__ = containerId || "price-setting-shopee-container";
    state.config = Object.assign({}, DEFAULT_CONFIG, loadLocalConfig() || {});
    state.companyPriceBook = loadCompanyPriceBook();
    renderUI();

    loadRemoteCompanyPriceBook().then(function (remoteBook) {
      if (remoteBook && remoteBook.map) {
        state.companyPriceBook = remoteBook;
        saveCompanyPriceBook(remoteBook);
        renderCompanyPriceStatus();
      }
    });

    loadRemoteConfig().then(function (remoteCfg) {
      if (remoteCfg) {
        state.config = Object.assign({}, DEFAULT_CONFIG, remoteCfg);
        saveLocalConfig(state.config);
        applyConfigToForm(state.config);
      }
    });
  };

  // Giúp anh kiểm tra nhanh ở Console:
  window.NNV_PRICE_SETTING_SHOPEE_MARKER = VERSION_MARKER;
})();
