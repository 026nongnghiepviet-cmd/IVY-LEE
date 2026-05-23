(function () {
  'use strict';

  var MODULE_KEY = 'NNV_ECOM_PRICE_SETTING_SHOPEE_V2';
  var FIREBASE_PATH = 'system_settings/ecom_price_setting/shopee';

  var DEFAULT_CONFIG = {
    platform: 'shopee',
    markupPercent: 50,
    fixedFeePercent: 14,
    transactionFeePercent: 6,
    voucherXtraPercent: 5.5,
    infrastructureFee: 3000,
    pishipFee: 2700,
    roundingStep: 1000,
    appliedSince: ''
  };

  var state = {
    config: copy(DEFAULT_CONFIG),
    files: [],
    fileSeq: 1
  };

  function copy(obj) {
    if (obj === undefined || obj === null) return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    var s = String(value).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, '').replace(/đ|₫|vnd|VND/g, '');
    s = s.replace(/[.,](?=\d{3}(\D|$))/g, '');
    s = s.replace(',', '.');
    var n = Number(s.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function formatNumber(n) {
    n = Number(n || 0);
    try { return n.toLocaleString('vi-VN'); } catch (e) { return String(Math.round(n)); }
  }

  function formatPercent(n) {
    return String(Number(n || 0)).replace('.', ',') + '%';
  }

  function ceilToStep(value, step) {
    step = Number(step || 1);
    if (step < 1) step = 1;
    return Math.ceil(Number(value || 0) / step) * step;
  }

  function totalPercentFee(config) {
    return Number(config.fixedFeePercent || 0) +
      Number(config.transactionFeePercent || 0) +
      Number(config.voucherXtraPercent || 0);
  }

  function totalFixedFee(config) {
    return Number(config.infrastructureFee || 0) + Number(config.pishipFee || 0);
  }

  function minSellingPrice(basePrice, config) {
    var rate = totalPercentFee(config) / 100;
    if (rate >= 1) throw new Error('Tổng phí phần trăm phải nhỏ hơn 100%.');
    var raw = (Number(basePrice || 0) + totalFixedFee(config)) / (1 - rate);
    return ceilToStep(raw, config.roundingStep || 1000);
  }

  function netRevenue(sellingPrice, config) {
    return Number(sellingPrice || 0) * (1 - totalPercentFee(config) / 100) - totalFixedFee(config);
  }

  function todayText() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  function slugFileName(name) {
    return String(name || 'file')
      .replace(/\.xlsx$|\.xls$|\.csv$/i, '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .trim();
  }

  function showToast(message, type) {
    if (window.showToast) {
      window.showToast(message);
      return;
    }
    var el = $('ps-toast');
    if (!el) return alert(message);
    el.className = 'ps-toast show ' + (type || '');
    el.innerText = message;
    setTimeout(function () { el.className = 'ps-toast'; }, 2500);
  }

  function readConfigFromForm() {
    var cfg = {
      platform: 'shopee',
      markupPercent: toNumber($('ps-markup-percent').value),
      fixedFeePercent: toNumber($('ps-fixed-fee-percent').value),
      transactionFeePercent: toNumber($('ps-transaction-fee-percent').value),
      voucherXtraPercent: toNumber($('ps-voucher-xtra-percent').value),
      infrastructureFee: toNumber($('ps-infrastructure-fee').value),
      pishipFee: toNumber($('ps-piship-fee').value),
      roundingStep: toNumber($('ps-rounding-step').value),
      appliedSince: new Date().toISOString()
    };

    if (cfg.markupPercent < 0) throw new Error('Tỷ lệ cộng giá không được âm.');
    if (totalPercentFee(cfg) >= 100) throw new Error('Tổng phí phần trăm đang lớn hơn hoặc bằng 100%.');
    if (cfg.roundingStep < 1) throw new Error('Bước làm tròn phải lớn hơn hoặc bằng 1.');
    return cfg;
  }

  function applyConfigToForm(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var map = {
      'ps-markup-percent': cfg.markupPercent,
      'ps-fixed-fee-percent': cfg.fixedFeePercent,
      'ps-transaction-fee-percent': cfg.transactionFeePercent,
      'ps-voucher-xtra-percent': cfg.voucherXtraPercent,
      'ps-infrastructure-fee': cfg.infrastructureFee,
      'ps-piship-fee': cfg.pishipFee,
      'ps-rounding-step': cfg.roundingStep
    };

    Object.keys(map).forEach(function (id) {
      var el = $(id);
      if (el) el.value = map[id];
    });
    updateFeePreview();
    renderSavedInfo(cfg);
  }

  function updateFeePreview() {
    var cfg;
    try { cfg = readConfigFromForm(); } catch (e) { cfg = state.config; }
    var el = $('ps-fee-preview');
    if (!el) return;
    el.innerHTML =
      '<span>Tổng phí %: <b>' + formatPercent(totalPercentFee(cfg)) + '</b></span>' +
      '<span>Tổng phí cố định: <b>' + formatNumber(totalFixedFee(cfg)) + 'đ/đơn</b></span>' +
      '<span>Công thức Shopee: <b>P_min = ceil((T + ' + formatNumber(totalFixedFee(cfg)) + ') / ' + (1 - totalPercentFee(cfg) / 100).toFixed(3) + ')</b></span>';
  }

  function renderSavedInfo(cfg) {
    var el = $('ps-saved-info');
    if (!el) return;
    if (cfg && cfg.appliedSince) {
      el.innerHTML = 'Cấu hình đang áp dụng từ: <b>' + new Date(cfg.appliedSince).toLocaleString('vi-VN') + '</b>';
    } else {
      el.innerHTML = 'Đang dùng cấu hình mặc định Shopee.';
    }
  }

  function loadLocalConfig() {
    try { return JSON.parse(localStorage.getItem(MODULE_KEY) || 'null'); } catch (e) { return null; }
  }

  function saveLocalConfig(cfg) {
    localStorage.setItem(MODULE_KEY, JSON.stringify(cfg));
  }

  function loadRemoteConfig() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) return resolve(null);
      try {
        window.sysDb.ref(FIREBASE_PATH).once('value').then(function (snap) {
          resolve(snap.val() || null);
        }).catch(function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  function saveRemoteConfig(cfg) {
    return new Promise(function (resolve, reject) {
      if (!window.sysDb || !window.sysDb.ref) return resolve(false);
      try {
        window.sysDb.ref(FIREBASE_PATH).set(cfg).then(function () { resolve(true); }).catch(reject);
      } catch (e) { reject(e); }
    });
  }

  function saveConfig() {
    try {
      state.config = readConfigFromForm();
      saveLocalConfig(state.config);
      renderSavedInfo(state.config);
      updateFeePreview();

      saveRemoteConfig(state.config).then(function (remoteSaved) {
        showToast(remoteSaved ? 'Đã lưu cấu hình phí Shopee lên hệ thống.' : 'Đã lưu cấu hình phí Shopee trên trình duyệt này.', 'success');
      }).catch(function () {
        showToast('Đã lưu local, nhưng chưa lưu được Firebase.', 'error');
      });
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function resetConfig() {
    state.config = copy(DEFAULT_CONFIG);
    saveLocalConfig(state.config);
    applyConfigToForm(state.config);
    showToast('Đã đưa phí Shopee về mặc định.', 'success');
  }

  function cloneWorkbookPreserveFormat(workbook) {
    var cloned = {
      SheetNames: workbook.SheetNames.slice(),
      Sheets: {},
      Workbook: workbook.Workbook ? copy(workbook.Workbook) : undefined,
      Props: workbook.Props ? copy(workbook.Props) : undefined,
      Custprops: workbook.Custprops ? copy(workbook.Custprops) : undefined
    };

    workbook.SheetNames.forEach(function (sheetName) {
      var src = workbook.Sheets[sheetName];
      var dst = {};
      Object.keys(src).forEach(function (key) {
        var value = src[key];
        if (key.charAt(0) === '!') dst[key] = copy(value);
        else dst[key] = Object.assign({}, value);
      });
      cloned.Sheets[sheetName] = dst;
    });

    return cloned;
  }

  function getCell(sheet, r, c) {
    var addr = XLSX.utils.encode_cell({ r: r, c: c });
    if (!sheet[addr]) sheet[addr] = { t: 'n', v: 0 };
    return sheet[addr];
  }

  function setNumberCell(sheet, r, c, value) {
    var cell = getCell(sheet, r, c);
    cell.t = 'n';
    cell.v = Number(value || 0);
    delete cell.w;
  }

  function sheetRows(sheet) {
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  }

  function detectShopeeMeta(rows) {
    if (!rows || !rows.length) throw new Error('File không có dữ liệu.');

    var techHeaderIndex = -1;
    var vnHeaderIndex = -1;
    var dataStartIndex = -1;

    for (var i = 0; i < Math.min(rows.length, 20); i++) {
      var joined = (rows[i] || []).join('|').toLowerCase();
      if (joined.indexOf('et_title_product_id') >= 0 && joined.indexOf('et_title_variation_price') >= 0) techHeaderIndex = i;
      if (joined.indexOf('mã sản phẩm') >= 0 && joined.indexOf('giá') >= 0) vnHeaderIndex = i;
    }

    if (techHeaderIndex === 0 && vnHeaderIndex >= 0) dataStartIndex = 6;

    if (dataStartIndex < 0) {
      for (var r = 0; r < rows.length; r++) {
        var productId = rows[r] && rows[r][0];
        var price = toNumber(rows[r] && rows[r][6]);
        if (productId !== null && productId !== undefined && String(productId).trim() !== '' && price > 0) {
          dataStartIndex = r;
          break;
        }
      }
    }

    if (dataStartIndex < 0) throw new Error('Không tìm thấy dòng sản phẩm. File Shopee cần có cột Giá tại cột G.');

    return {
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

  function collectItems(rows, meta) {
    var items = [];
    for (var r = meta.dataStartIndex; r < rows.length; r++) {
      var row = rows[r] || [];
      var productId = row[meta.productIdCol];
      var basePrice = toNumber(row[meta.priceCol]);
      if (productId !== null && productId !== undefined && String(productId).trim() !== '' && basePrice > 0) {
        items.push({
          rowIndex: r,
          originalRow: row,
          productId: productId,
          productName: row[meta.productNameCol],
          variationId: row[meta.variationIdCol],
          variationName: row[meta.variationNameCol],
          productSku: row[meta.productSkuCol],
          variationSku: row[meta.variationSkuCol],
          basePrice: basePrice,
          markedPrice: 0,
          appliedMarkedPrice: 0,
          finalPrice: 0,
          platformFeeValue: 0,
          net: 0,
          diff: 0,
          warning: '',
          applied: false
        });
      }
    }
    return items;
  }

  function normalizeShopeePriceTemplateRows(sheet) {
    // Giữ nguyên format/độ rộng/chiều cao, chỉ dọn nội dung hướng dẫn giống file giá 50%.
    if (!sheet['!ref']) return;
    var range = XLSX.utils.decode_range(sheet['!ref']);
    if (range.e.r < 5 || range.e.c < 8) return;

    for (var c = 0; c <= range.e.c; c++) {
      ['4', '5', '6'].forEach(function (rowNo) {
        var addr = XLSX.utils.encode_cell({ r: Number(rowNo) - 1, c: c });
        if (sheet[addr]) {
          var old = sheet[addr];
          sheet[addr] = Object.assign({}, old, { t: 'z', v: null });
          delete sheet[addr].w;
        }
      });
    }

    var g4 = getCell(sheet, 3, 6);
    g4.t = 's'; g4.v = 'Bắt buộc'; delete g4.w;
    var i4 = getCell(sheet, 3, 8);
    i4.t = 's'; i4.v = 'Bắt buộc'; delete i4.w;
    var g6 = getCell(sheet, 5, 6);
    g6.t = 's';
    g6.v = 'Vui lòng nhập 1000 đến 120000000 để biết giá sản phẩm. Giá của sản phẩm đắt nhất chia cho giá của giới hạn sản phẩm rẻ nhất: 5';
    delete g6.w;
  }

  function recalcFile(fileObj) {
    var cfg = state.config;
    var factor = 1 + Number(cfg.markupPercent || 0) / 100;
    var priceSheet = fileObj.priceWorkbook.Sheets[fileObj.sheetName];
    normalizeShopeePriceTemplateRows(priceSheet);

    fileObj.items.forEach(function (item) {
      item.markedPrice = Math.round(item.basePrice * factor);
      item.finalPrice = minSellingPrice(item.basePrice, cfg);
      if (!item.applied) item.appliedMarkedPrice = item.markedPrice;

      item.platformFeeValue = Math.round(item.finalPrice * totalPercentFee(cfg) / 100);
      item.net = Math.round(netRevenue(item.finalPrice, cfg) * 100) / 100;
      item.diff = Math.round((item.net - item.basePrice) * 100) / 100;

      var warnings = [];
      if (item.finalPrice > item.appliedMarkedPrice) warnings.push('Giá CK cao hơn giá % đang áp dụng');
      if (item.diff < 0) warnings.push('Tiền về thấp hơn giá gốc');
      item.warning = warnings.join(' | ');

      setNumberCell(priceSheet, item.rowIndex, fileObj.meta.priceCol, item.appliedMarkedPrice);
    });

    buildExportRows(fileObj);
    summarizeFile(fileObj);
  }

  function buildExportRows(fileObj) {
    fileObj.discountRows = [[
      'Mã sản phẩm',
      'Tên Sản phẩm (Tùy chọn)',
      'Số SKU Sản phẩm (Tùy chọn)',
      'Mã phân loại hàng',
      'Tên phân loại hàng (Tùy chọn)',
      'Số SKU Phân loại hàng (Tùy chọn)',
      'Giá gốc (Tùy chọn)',
      'Giá đã giảm',
      'Giới hạn đặt hàng (Tùy chọn)'
    ]];

    fileObj.checkRows = [[
      'STT',
      'File',
      'Mã sản phẩm',
      'Tên sản phẩm',
      'SKU sản phẩm',
      'Mã phân loại',
      'SKU phân loại',
      'Giá gốc',
      'Giá % đang áp dụng',
      'Giá bán/CK tối thiểu',
      'Tổng phí %',
      'Tổng phí cố định',
      'Tiền sàn thu %',
      'Tiền về sau phí',
      'Chênh lệch',
      'Trạng thái',
      'Cảnh báo',
      'Đã áp dụng cảnh báo'
    ]];

    fileObj.items.forEach(function (item, idx) {
      fileObj.discountRows.push([
        item.productId,
        item.productName,
        item.productSku,
        item.variationId,
        item.variationName,
        item.variationSku,
        Math.round(item.appliedMarkedPrice),
        Math.round(item.finalPrice),
        null
      ]);

      fileObj.checkRows.push([
        idx + 1,
        fileObj.fileName,
        item.productId,
        item.productName,
        item.productSku,
        item.variationId,
        item.variationSku,
        Math.round(item.basePrice),
        Math.round(item.appliedMarkedPrice),
        Math.round(item.finalPrice),
        totalPercentFee(state.config) / 100,
        totalFixedFee(state.config),
        Math.round(item.platformFeeValue),
        item.net,
        item.diff,
        item.diff >= 0 ? 'ĐẠT' : 'KHÔNG ĐẠT',
        item.warning,
        item.applied ? 'Có' : 'Không'
      ]);
    });
  }

  function summarizeFile(fileObj) {
    var total = fileObj.items.length;
    var warned = fileObj.items.filter(function (x) { return !!x.warning; }).length;
    var applied = fileObj.items.filter(function (x) { return !!x.applied; }).length;
    var failed = fileObj.items.filter(function (x) { return x.diff < 0; }).length;
    fileObj.summary = { total: total, warned: warned, applied: applied, failed: failed };
  }

  function parseFile(file) {
    return new Promise(function (resolve, reject) {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Thiếu thư viện XLSX. Hãy load xlsx.full.min.js trước price-setting.js.'));
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, {
            type: 'array',
            raw: true,
            cellDates: false,
            cellStyles: true
          });
          var sheetName = workbook.SheetNames[0];
          var sheet = workbook.Sheets[sheetName];
          var rows = sheetRows(sheet);
          var meta = detectShopeeMeta(rows);
          var items = collectItems(rows, meta);
          if (!items.length) throw new Error('Không tìm thấy sản phẩm có giá hợp lệ.');

          var fileObj = {
            id: 'file-' + (state.fileSeq++),
            fileName: file.name,
            baseName: slugFileName(file.name),
            workbook: workbook,
            sheetName: sheetName,
            meta: meta,
            rows: rows,
            items: items,
            priceWorkbook: cloneWorkbookPreserveFormat(workbook),
            discountRows: [],
            checkRows: [],
            summary: null,
            error: ''
          };
          recalcFile(fileObj);
          resolve(fileObj);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Không thể đọc file.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function handleFileUpload(evt) {
    var files = Array.prototype.slice.call(evt.target.files || []);
    if (!files.length) return;

    var status = $('ps-status');
    if (status) status.innerHTML = 'Đang đọc <b>' + files.length + '</b> file Shopee...';

    Promise.all(files.map(function (file) {
      return parseFile(file).then(function (fileObj) {
        return { ok: true, fileObj: fileObj };
      }).catch(function (err) {
        return { ok: false, fileName: file.name, error: err.message };
      });
    })).then(function (results) {
      var okFiles = results.filter(function (x) { return x.ok; }).map(function (x) { return x.fileObj; });
      var badFiles = results.filter(function (x) { return !x.ok; });

      state.files = state.files.concat(okFiles);
      renderAll();

      var msg = 'Đã nhập ' + okFiles.length + '/' + files.length + ' file.';
      if (badFiles.length) {
        msg += '<br><span style="color:#d93025">File lỗi: ' + badFiles.map(function (x) { return escapeHtml(x.fileName + ' - ' + x.error); }).join('; ') + '</span>';
      }
      if (status) status.innerHTML = msg;
      evt.target.value = '';
    });
  }

  function calculateAll() {
    try {
      state.config = readConfigFromForm();
      if (!state.files.length) {
        showToast('Anh cần nhập ít nhất 1 file giá gốc Shopee.', 'error');
        return;
      }
      state.files.forEach(function (fileObj) {
        recalcFile(fileObj);
      });
      renderAll();
      showToast('Đã tính lại giá cho tất cả file Shopee.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function clearFiles() {
    state.files = [];
    renderAll();
    var status = $('ps-status');
    if (status) status.innerHTML = 'Đã xóa danh sách file. Anh có thể nhập file mới.';
  }

  function findFile(fileId) {
    return state.files.filter(function (x) { return x.id === fileId; })[0] || null;
  }

  function applyWarning(fileId, itemIndex) {
    var fileObj = findFile(fileId);
    if (!fileObj) return;
    var item = fileObj.items[itemIndex];
    if (!item || !item.warning) return;
    item.appliedMarkedPrice = item.finalPrice;
    item.applied = true;
    recalcFile(fileObj);
    renderAll();
    showToast('Đã áp dụng giá tối thiểu cho sản phẩm cảnh báo.', 'success');
  }

  function applyAllWarnings(fileId) {
    var fileObj = findFile(fileId);
    if (!fileObj) return;
    var count = 0;
    fileObj.items.forEach(function (item) {
      if (item.warning) {
        item.appliedMarkedPrice = item.finalPrice;
        item.applied = true;
        count++;
      }
    });
    recalcFile(fileObj);
    renderAll();
    showToast('Đã áp dụng ' + count + ' sản phẩm cảnh báo trong file này.', 'success');
  }

  function removeFile(fileId) {
    state.files = state.files.filter(function (x) { return x.id !== fileId; });
    renderAll();
  }

  function autoWidth(ws, rows) {
    if (!rows || !rows.length) return;
    var colCount = 0;
    rows.forEach(function (r) { if (r && r.length > colCount) colCount = r.length; });
    var cols = [];
    for (var c = 0; c < colCount; c++) {
      var w = 10;
      for (var r = 0; r < Math.min(rows.length, 120); r++) {
        var text = rows[r] && rows[r][c] !== null && rows[r][c] !== undefined ? String(rows[r][c]) : '';
        w = Math.max(w, Math.min(50, text.length + 2));
      }
      cols.push({ wch: w });
    }
    ws['!cols'] = cols;
  }

  function downloadWorkbook(workbook, fileName) {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', cellStyles: true });
  }

  function downloadRows(rows, sheetName, fileName, mode) {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);
    autoWidth(ws, rows);
    if (mode === 'check' && ws['!ref']) {
      var range = XLSX.utils.decode_range(ws['!ref']);
      for (var r = 1; r <= range.e.r; r++) {
        var pctCell = ws[XLSX.utils.encode_cell({ r: r, c: 10 })];
        if (pctCell) pctCell.z = '0.00%';
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    XLSX.writeFile(wb, fileName);
  }

  function outputNames(fileObj) {
    var date = todayText();
    var pct = String(Number(state.config.markupPercent || 0)).replace('.', '_');
    var feePct = String(Number(totalPercentFee(state.config))).replace('.', '_');
    return {
      price: fileObj.baseName + ' - GIA ' + pct + '% SHOPEE ' + date + '.xlsx',
      discount: fileObj.baseName + ' - CK SHOPEE ' + feePct + '%+' + totalFixedFee(state.config) + ' ' + date + '.xlsx',
      check: fileObj.baseName + ' - KIEM TRA GIA SHOPEE ' + date + '.xlsx'
    };
  }

  function downloadPrice(fileId) {
    var fileObj = findFile(fileId);
    if (!fileObj) return;
    downloadWorkbook(fileObj.priceWorkbook, outputNames(fileObj).price);
  }

  function downloadDiscount(fileId) {
    var fileObj = findFile(fileId);
    if (!fileObj) return;
    downloadRows(fileObj.discountRows, 'Sheet', outputNames(fileObj).discount, 'discount');
  }

  function downloadCheck(fileId) {
    var fileObj = findFile(fileId);
    if (!fileObj) return;
    downloadRows(fileObj.checkRows, 'Kiem tra', outputNames(fileObj).check, 'check');
  }

  function downloadAll(type) {
    if (!state.files.length) return showToast('Chưa có file để tải.', 'error');
    state.files.forEach(function (fileObj, idx) {
      setTimeout(function () {
        if (type === 'price') downloadPrice(fileObj.id);
        if (type === 'discount') downloadDiscount(fileObj.id);
        if (type === 'check') downloadCheck(fileObj.id);
      }, idx * 450);
    });
  }

  function renderAll() {
    renderOverview();
    renderFileCards();
    updateMainButtons();
  }

  function renderOverview() {
    var box = $('ps-overview');
    if (!box) return;
    if (!state.files.length) {
      box.innerHTML = '';
      return;
    }

    var totalFiles = state.files.length;
    var totalItems = 0, warned = 0, failed = 0, applied = 0;
    state.files.forEach(function (f) {
      totalItems += f.summary.total;
      warned += f.summary.warned;
      failed += f.summary.failed;
      applied += f.summary.applied;
    });

    box.innerHTML =
      '<div class="ps-summary-grid">' +
      '<div class="ps-card"><div class="ps-label">Số file</div><div class="ps-value">' + formatNumber(totalFiles) + '</div></div>' +
      '<div class="ps-card"><div class="ps-label">Sản phẩm</div><div class="ps-value">' + formatNumber(totalItems) + '</div></div>' +
      '<div class="ps-card ' + (warned ? 'warn' : 'ok') + '"><div class="ps-label">Cảnh báo</div><div class="ps-value">' + formatNumber(warned) + '</div></div>' +
      '<div class="ps-card ok"><div class="ps-label">Đã áp dụng</div><div class="ps-value">' + formatNumber(applied) + '</div></div>' +
      '<div class="ps-card ' + (failed ? 'bad' : 'ok') + '"><div class="ps-label">Không đạt tiền về</div><div class="ps-value">' + formatNumber(failed) + '</div></div>' +
      '</div>';
  }

  function renderFileCards() {
    var box = $('ps-file-list');
    if (!box) return;
    if (!state.files.length) {
      box.innerHTML = '<div class="ps-empty">Chưa có file nào. Anh có thể upload cùng lúc nhiều file giá gốc Shopee.</div>';
      return;
    }

    var html = '';
    state.files.forEach(function (fileObj) {
      html += renderFileCard(fileObj);
    });
    box.innerHTML = html;
  }

  function renderFileCard(fileObj) {
    var warningItems = fileObj.items
      .map(function (item, idx) { return { item: item, idx: idx }; })
      .filter(function (x) { return !!x.item.warning; });

    var html = '<div class="ps-file-card">';
    html += '<div class="ps-file-head">' +
      '<div><div class="ps-file-name">📄 ' + escapeHtml(fileObj.fileName) + '</div>' +
      '<div class="ps-file-sub">' + formatNumber(fileObj.summary.total) + ' sản phẩm · ' + formatNumber(fileObj.summary.warned) + ' cảnh báo · ' + formatNumber(fileObj.summary.applied) + ' đã áp dụng</div></div>' +
      '<button class="ps-link danger" onclick="window.psRemoveFile(\'' + fileObj.id + '\')">Xóa</button>' +
      '</div>';

    html += '<div class="ps-actions small">' +
      '<button class="ps-btn secondary" onclick="window.psDownloadPrice(\'' + fileObj.id + '\')">Tải file giá %</button>' +
      '<button class="ps-btn secondary" onclick="window.psDownloadDiscount(\'' + fileObj.id + '\')">Tải file chiết khấu</button>' +
      '<button class="ps-btn secondary" onclick="window.psDownloadCheck(\'' + fileObj.id + '\')">Tải file kiểm tra</button>' +
      (warningItems.length ? '<button class="ps-btn orange" onclick="window.psApplyAllWarnings(\'' + fileObj.id + '\')">Áp dụng tất cả cảnh báo</button>' : '') +
      '</div>';

    if (!warningItems.length) {
      html += '<div class="ps-ok-line">✅ Không có sản phẩm cảnh báo. Giá % và giá CK đang ổn.</div>';
    } else {
      html += '<div class="ps-mini-title">Sản phẩm cảnh báo</div>';
      html += '<div class="ps-table-wrap"><table class="ps-table"><thead><tr>' +
        '<th>STT</th><th>Mã SP</th><th>Tên sản phẩm</th><th>SKU</th><th>Giá gốc</th><th>Giá % hiện tại</th><th>Giá cần áp dụng</th><th>Cảnh báo</th><th>Áp dụng</th>' +
        '</tr></thead><tbody>';
      warningItems.forEach(function (x, showIdx) {
        var item = x.item;
        html += '<tr>' +
          '<td>' + (showIdx + 1) + '</td>' +
          '<td>' + escapeHtml(item.productId) + '</td>' +
          '<td>' + escapeHtml(item.productName) + '</td>' +
          '<td>' + escapeHtml(item.productSku || item.variationSku || '') + '</td>' +
          '<td class="num">' + formatNumber(item.basePrice) + '</td>' +
          '<td class="num">' + formatNumber(item.appliedMarkedPrice) + '</td>' +
          '<td class="num bad-text">' + formatNumber(item.finalPrice) + '</td>' +
          '<td class="bad-text">' + escapeHtml(item.warning) + '</td>' +
          '<td><button class="ps-apply" onclick="window.psApplyWarning(\'' + fileObj.id + '\',' + x.idx + ')">Áp dụng</button></td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';
    return html;
  }

  function updateMainButtons() {
    var hasFiles = state.files.length > 0;
    ['ps-btn-calc', 'ps-btn-download-all-price', 'ps-btn-download-all-discount', 'ps-btn-download-all-check', 'ps-btn-clear'].forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = !hasFiles;
    });
  }

  function injectStyle() {
    if ($('price-setting-style')) return;
    var style = document.createElement('style');
    style.id = 'price-setting-style';
    style.innerHTML =
      '.ps-wrap{font-family:"Segoe UI",Arial,sans-serif;color:#202124}' +
      '.ps-platform-note{background:#fff8e1;border:1px solid #fbbc04;border-radius:12px;padding:12px;margin-bottom:14px;color:#5f6368;font-size:13px;line-height:1.5}' +
      '.ps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:14px}' +
      '.ps-field{background:#fff;border:1px solid #e8eaed;border-radius:12px;padding:12px}' +
      '.ps-field label{display:block;font-size:11px;font-weight:800;color:#5f6368;text-transform:uppercase;margin-bottom:6px}' +
      '.ps-field input{width:100%;border:1px solid #dadce0!important;border-radius:8px!important;padding:10px!important;font-size:14px!important;background:#fff!important;font-weight:600;color:#202124!important;font-family:"Segoe UI",Arial,sans-serif!important}' +
      '.ps-fee-preview{display:flex;gap:10px;flex-wrap:wrap;background:#f8f9fa;border-left:5px solid #1a73e8;border-radius:10px;padding:12px;margin:10px 0;font-size:13px}' +
      '.ps-saved-info{font-size:12px;color:#5f6368;margin-top:6px}' +
      '.ps-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0}.ps-actions.small{margin:10px 0}' +
      '.ps-btn{border:none;border-radius:10px;padding:10px 14px;font-family:"Segoe UI",Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0;cursor:pointer;background:#1a73e8;color:#fff;transition:.2s;line-height:1.3}' +
      '.ps-btn:hover{filter:brightness(.96);transform:translateY(-1px)}.ps-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}' +
      '.ps-btn.secondary{background:#fff;color:#1a73e8;border:1px solid #1a73e8}.ps-btn.green{background:#1e8e3e}.ps-btn.orange{background:#ee4d2d}.ps-btn.gray{background:#f1f3f4;color:#3c4043}' +
      '.ps-upload{border:2px dashed #1a73e8;background:#f8fbff;border-radius:14px;padding:22px;text-align:center;cursor:pointer;margin:16px 0}.ps-upload:hover{background:#e8f0fe}.ps-upload strong{color:#1a73e8;font-size:15px}.ps-sub{font-size:12px;color:#5f6368;margin-top:6px}' +
      '.ps-status{padding:12px;border-radius:10px;background:#f8f9fa;color:#5f6368;margin:12px 0;font-size:13px}.ps-empty{padding:25px;text-align:center;color:#9aa0a6;background:#f8f9fa;border-radius:12px;font-weight:600}' +
      '.ps-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:15px 0}.ps-card{background:#fff;border:1px solid #e8eaed;border-radius:14px;padding:14px;box-shadow:0 2px 10px rgba(0,0,0,.03)}.ps-card.ok{border-left:5px solid #1e8e3e}.ps-card.bad{border-left:5px solid #d93025}.ps-card.warn{border-left:5px solid #fbbc04}.ps-label{font-size:11px;font-weight:800;color:#5f6368;text-transform:uppercase}.ps-value{font-size:22px;font-weight:800;color:#202124;margin-top:5px}' +
      '.ps-file-card{background:#fff;border:1px solid #e8eaed;border-radius:16px;padding:16px;margin:16px 0;box-shadow:0 4px 15px rgba(0,0,0,.04)}.ps-file-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.ps-file-name{font-size:15px;font-weight:800;color:#202124}.ps-file-sub{font-size:12px;color:#5f6368;margin-top:5px}.ps-link{border:none;background:transparent;color:#1a73e8;font-weight:700;cursor:pointer}.ps-link.danger{color:#d93025}.ps-ok-line{background:#e6f4ea;color:#137333;border-radius:10px;padding:12px;font-weight:700;font-size:13px}' +
      '.ps-mini-title{font-size:13px;font-weight:800;margin:16px 0 8px;color:#202124;text-transform:uppercase}.ps-table-wrap{width:100%;overflow:auto;border:1px solid #e8eaed;border-radius:12px;max-height:430px;background:#fff}.ps-table{width:100%;border-collapse:collapse;min-width:1050px}.ps-table th{position:sticky;top:0;background:#f5f5f5;color:#5f6368;font-size:11px;text-transform:uppercase;padding:10px;border-bottom:1px solid #dadce0;z-index:2}.ps-table td{padding:9px;border-bottom:1px solid #f1f3f4;font-size:12px;vertical-align:top}.ps-table .num{text-align:right;font-weight:700}.ok-text{color:#137333}.bad-text{color:#d93025}' +
      '.ps-apply{font-family:"Segoe UI",Arial,sans-serif;border:none;background:#1e8e3e;color:#fff;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer}.ps-apply:hover{filter:brightness(.95)}' +
      '.ps-toast{display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#202124;color:white;padding:12px 18px;border-radius:999px;z-index:999999;font-weight:700}.ps-toast.show{display:block}.ps-toast.error{background:#d93025}.ps-toast.success{background:#137333}' +
      '@media(max-width:768px){.ps-actions{display:grid;grid-template-columns:1fr}.ps-btn{width:100%}.ps-grid{grid-template-columns:1fr}.ps-file-head{display:block}}';
    document.head.appendChild(style);
  }

  function fieldHtml(id, label, value) {
    return '<div class="ps-field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="number" step="0.01" value="' + value + '"></div>';
  }

  function renderUI() {
    var container = $('price-setting-container');
    if (!container) return;
    injectStyle();

    container.innerHTML =
      '<div class="ps-wrap">' +
      '<div class="ps-platform-note"><b>🛒 Công cụ này hiện chỉ dùng cho Shopee.</b> Phần TikTok Shop nên tách module riêng sau vì cấu trúc file khác Shopee.</div>' +
      '<div class="ps-grid">' +
      fieldHtml('ps-markup-percent', 'Tỷ lệ cộng giá (%)', DEFAULT_CONFIG.markupPercent) +
      fieldHtml('ps-fixed-fee-percent', 'Phí cố định (%)', DEFAULT_CONFIG.fixedFeePercent) +
      fieldHtml('ps-transaction-fee-percent', 'Phí xử lý giao dịch (%)', DEFAULT_CONFIG.transactionFeePercent) +
      fieldHtml('ps-voucher-xtra-percent', 'Phí Voucher Xtra (%)', DEFAULT_CONFIG.voucherXtraPercent) +
      fieldHtml('ps-infrastructure-fee', 'Phí hạ tầng (đ/đơn)', DEFAULT_CONFIG.infrastructureFee) +
      fieldHtml('ps-piship-fee', 'Phí Piship (đ/đơn)', DEFAULT_CONFIG.pishipFee) +
      fieldHtml('ps-rounding-step', 'Làm tròn lên bội số', DEFAULT_CONFIG.roundingStep) +
      '</div>' +
      '<div class="ps-fee-preview" id="ps-fee-preview"></div>' +
      '<div class="ps-saved-info" id="ps-saved-info"></div>' +
      '<div class="ps-actions">' +
      '<button class="ps-btn green" id="ps-btn-save">💾 Lưu cấu hình phí</button>' +
      '<button class="ps-btn gray" id="ps-btn-reset">↩️ Về mặc định</button>' +
      '</div>' +
      '<div class="ps-upload" id="ps-upload-box">' +
      '<strong>📂 Bước 1: Nhập file giá gốc Shopee</strong>' +
      '<div class="ps-sub">Có thể chọn cùng lúc nhiều file, ví dụ 4 file cho 4 công ty.</div>' +
      '<input id="ps-file-input" type="file" multiple accept=".xlsx,.xls,.csv" style="display:none">' +
      '</div>' +
      '<div id="ps-status" class="ps-status">Chưa nhập file giá gốc.</div>' +
      '<div class="ps-actions">' +
      '<button class="ps-btn orange" id="ps-btn-calc" disabled>⚙️ Bước 2: Tính lại giá</button>' +
      '<button class="ps-btn secondary" id="ps-btn-download-all-price" disabled>Tải tất cả file giá %</button>' +
      '<button class="ps-btn secondary" id="ps-btn-download-all-discount" disabled>Tải tất cả file chiết khấu</button>' +
      '<button class="ps-btn secondary" id="ps-btn-download-all-check" disabled>Tải tất cả file kiểm tra</button>' +
      '<button class="ps-btn gray" id="ps-btn-clear" disabled>Xóa danh sách file</button>' +
      '</div>' +
      '<div id="ps-overview"></div>' +
      '<div id="ps-file-list"></div>' +
      '<div id="ps-toast" class="ps-toast"></div>' +
      '</div>';

    bindEvents();
  }

  function bindEvents() {
    $('ps-upload-box').onclick = function () { $('ps-file-input').click(); };
    $('ps-file-input').onchange = handleFileUpload;
    $('ps-btn-save').onclick = saveConfig;
    $('ps-btn-reset').onclick = resetConfig;
    $('ps-btn-calc').onclick = calculateAll;
    $('ps-btn-download-all-price').onclick = function () { downloadAll('price'); };
    $('ps-btn-download-all-discount').onclick = function () { downloadAll('discount'); };
    $('ps-btn-download-all-check').onclick = function () { downloadAll('check'); };
    $('ps-btn-clear').onclick = clearFiles;

    ['ps-markup-percent', 'ps-fixed-fee-percent', 'ps-transaction-fee-percent', 'ps-voucher-xtra-percent', 'ps-infrastructure-fee', 'ps-piship-fee', 'ps-rounding-step'].forEach(function (id) {
      var el = $(id);
      if (el) el.oninput = updateFeePreview;
    });
  }

  window.psApplyWarning = applyWarning;
  window.psApplyAllWarnings = applyAllWarnings;
  window.psRemoveFile = removeFile;
  window.psDownloadPrice = downloadPrice;
  window.psDownloadDiscount = downloadDiscount;
  window.psDownloadCheck = downloadCheck;

  window.initPriceSettingModule = function () {
    renderUI();

    var localCfg = loadLocalConfig();
    state.config = Object.assign({}, DEFAULT_CONFIG, localCfg || {});
    applyConfigToForm(state.config);

    loadRemoteConfig().then(function (remoteCfg) {
      if (remoteCfg) {
        state.config = Object.assign({}, DEFAULT_CONFIG, remoteCfg);
        saveLocalConfig(state.config);
        applyConfigToForm(state.config);
      }
    });

    renderAll();
  };
})();
