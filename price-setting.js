(function () {
  'use strict';

  var MODULE_KEY = 'NNV_ECOM_PRICE_SETTING_V1';
  var FIREBASE_PATH = 'system_settings/ecom_price_setting/shopee';

  var DEFAULT_CONFIG = {
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
    config: clone(DEFAULT_CONFIG),
    fileName: '',
    sourceRows: null,
    priceRows: null,
    discountRows: null,
    checkRows: null,
    summary: null,
    workbookMeta: null
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function fmtNumber(n) {
    n = Number(n || 0);
    try {
      return n.toLocaleString('vi-VN');
    } catch (e) {
      return String(Math.round(n));
    }
  }

  function fmtPercent(n) {
    n = Number(n || 0);
    return String(n).replace('.', ',') + '%';
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    var s = String(value).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, '').replace(/đ|₫|vnd|VND/g, '');
    // Nếu là kiểu 1.090.000 hoặc 1,090,000 thì bỏ dấu phân cách.
    s = s.replace(/[.,](?=\d{3}(\D|$))/g, '');
    // Nếu còn dấu phẩy thập phân thì đổi sang chấm.
    s = s.replace(',', '.');
    var n = Number(s.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function roundVnd(n) {
    return Math.round(Number(n || 0));
  }

  function ceilToStep(value, step) {
    step = Number(step || 1);
    if (!step || step < 1) step = 1;
    return Math.ceil(Number(value || 0) / step) * step;
  }

  function safeCell(row, index) {
    return row && row[index] !== undefined ? row[index] : null;
  }

  function getInputNumber(id, fallback) {
    var el = qs(id);
    if (!el) return fallback;
    var n = toNumber(el.value);
    return isNaN(n) ? fallback : n;
  }

  function totalPercentFee(config) {
    return Number(config.fixedFeePercent || 0) + Number(config.transactionFeePercent || 0) + Number(config.voucherXtraPercent || 0);
  }

  function totalFixedFee(config) {
    return Number(config.infrastructureFee || 0) + Number(config.pishipFee || 0);
  }

  function calcFinalPrice(basePrice, config) {
    var percentRate = totalPercentFee(config) / 100;
    var fixedFee = totalFixedFee(config);
    var roundingStep = Number(config.roundingStep || 1000);

    if (percentRate >= 1) {
      throw new Error('Tổng phí phần trăm phải nhỏ hơn 100%.');
    }

    var rawPrice = (Number(basePrice || 0) + fixedFee) / (1 - percentRate);
    return ceilToStep(rawPrice, roundingStep);
  }

  function calcNetRevenue(sellingPrice, config) {
    var percentRate = totalPercentFee(config) / 100;
    return Number(sellingPrice || 0) * (1 - percentRate) - totalFixedFee(config);
  }

  function parseWorkbookRows(arrayBuffer, fileName) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Không tìm thấy thư viện XLSX. Hãy kiểm tra dòng xlsx.full.min.js đã được load trước price-setting.js.');
    }

    var workbook = XLSX.read(arrayBuffer, { type: 'array', raw: true, cellDates: false });
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

    return {
      workbook: workbook,
      sheetName: sheetName,
      fileName: fileName || '',
      rows: rows
    };
  }

  function detectShopeeFormat(rows) {
    if (!rows || !rows.length) {
      throw new Error('File không có dữ liệu.');
    }

    var techHeaderIndex = -1;
    var vnHeaderIndex = -1;
    var dataStartIndex = -1;

    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var joined = (rows[i] || []).join('|').toLowerCase();
      if (joined.indexOf('et_title_product_id') >= 0 && joined.indexOf('et_title_variation_price') >= 0) {
        techHeaderIndex = i;
      }
      if (joined.indexOf('mã sản phẩm') >= 0 && joined.indexOf('giá') >= 0) {
        vnHeaderIndex = i;
      }
    }

    // File mẫu Shopee của anh có 6 dòng đầu là phần header/hướng dẫn, dữ liệu bắt đầu từ dòng 7.
    if (techHeaderIndex === 0 && vnHeaderIndex === 2) {
      dataStartIndex = 6;
    }

    if (dataStartIndex < 0) {
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r] || [];
        var productId = safeCell(row, 0);
        var price = toNumber(safeCell(row, 6));
        if (productId !== null && productId !== '' && price > 0) {
          dataStartIndex = r;
          break;
        }
      }
    }

    if (dataStartIndex < 0) {
      throw new Error('Không tìm thấy dòng dữ liệu sản phẩm. File cần có cột Mã sản phẩm và Giá.');
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

  function collectProductRows(rows, meta) {
    var list = [];
    for (var i = meta.dataStartIndex; i < rows.length; i++) {
      var row = rows[i] || [];
      var productId = safeCell(row, meta.productIdCol);
      var price = toNumber(safeCell(row, meta.priceCol));
      var hasProduct = productId !== null && productId !== undefined && String(productId).trim() !== '';
      if (hasProduct && price > 0) {
        list.push({ rowIndex: i, row: row, basePrice: price });
      }
    }
    return list;
  }

  function normalizeShopeePriceMetaRows(rows) {
    // Bám theo file mẫu thứ 2: chỉ giữ các ô bắt buộc ở cột Giá/Số lượng, các ô hướng dẫn khác để trống.
    if (!rows || rows.length < 6) return rows;
    var width = Math.max(10, rows[0] ? rows[0].length : 10);

    function blankRow() {
      var arr = [];
      for (var i = 0; i < width; i++) arr.push(null);
      return arr;
    }

    rows[3] = blankRow();
    rows[3][6] = 'Bắt buộc';
    rows[3][8] = 'Bắt buộc';

    rows[4] = blankRow();

    rows[5] = blankRow();
    rows[5][6] = 'Vui lòng nhập 1000 đến 120000000 để biết giá sản phẩm. Giá của sản phẩm đắt nhất chia cho giá của giới hạn sản phẩm rẻ nhất: 5';

    return rows;
  }

  function buildPriceRows(sourceRows, meta, config) {
    var rows = clone(sourceRows);
    rows = normalizeShopeePriceMetaRows(rows);
    var factor = 1 + Number(config.markupPercent || 0) / 100;

    for (var i = meta.dataStartIndex; i < rows.length; i++) {
      var row = rows[i] || [];
      var basePrice = toNumber(row[meta.priceCol]);
      var productId = safeCell(row, meta.productIdCol);
      if (productId !== null && productId !== undefined && String(productId).trim() !== '' && basePrice > 0) {
        row[meta.priceCol] = roundVnd(basePrice * factor);
      }
      rows[i] = row;
    }
    return rows;
  }

  function buildDiscountAndCheckRows(sourceRows, meta, config) {
    var products = collectProductRows(sourceRows, meta);
    var percentFee = totalPercentFee(config);
    var fixedFee = totalFixedFee(config);
    var factor = 1 + Number(config.markupPercent || 0) / 100;

    var discountRows = [[
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

    var checkRows = [[
      'STT',
      'Mã sản phẩm',
      'Tên sản phẩm',
      'SKU sản phẩm',
      'Giá gốc',
      'Giá sau cộng %',
      'Giá bán/CK đề xuất',
      'Tổng phí %',
      'Tổng phí cố định',
      'Tiền sàn thu %',
      'Tiền về sau phí',
      'Chênh lệch tiền về - giá gốc',
      'Trạng thái',
      'Cảnh báo'
    ]];

    var summary = {
      total: products.length,
      ok: 0,
      fail: 0,
      warnDiscountHigherThanMarked: 0,
      warnInvalid: 0,
      minSuggestedMarkupPercent: 0
    };

    for (var i = 0; i < products.length; i++) {
      var item = products[i];
      var row = item.row;
      var basePrice = item.basePrice;
      var markedPrice = roundVnd(basePrice * factor);
      var finalPrice = calcFinalPrice(basePrice, config);
      var platformPercentFeeValue = roundVnd(finalPrice * (percentFee / 100));
      var netRevenue = calcNetRevenue(finalPrice, config);
      var diff = netRevenue - basePrice;
      var status = diff >= -0.0001 ? 'ĐẠT' : 'KHÔNG ĐẠT';
      var warnings = [];

      if (status === 'ĐẠT') summary.ok += 1;
      else summary.fail += 1;

      if (finalPrice > markedPrice) {
        summary.warnDiscountHigherThanMarked += 1;
        warnings.push('Giá CK cao hơn giá đã cộng %. Nên tăng % cộng giá hoặc giảm bước làm tròn.');
      }

      if (!basePrice || basePrice <= 0) {
        summary.warnInvalid += 1;
        warnings.push('Giá gốc không hợp lệ.');
      }

      var requiredMarkup = basePrice > 0 ? ((finalPrice / basePrice) - 1) * 100 : 0;
      if (requiredMarkup > summary.minSuggestedMarkupPercent) {
        summary.minSuggestedMarkupPercent = requiredMarkup;
      }

      discountRows.push([
        safeCell(row, meta.productIdCol),
        safeCell(row, meta.productNameCol),
        safeCell(row, meta.productSkuCol),
        safeCell(row, meta.variationIdCol),
        safeCell(row, meta.variationNameCol),
        safeCell(row, meta.variationSkuCol),
        roundVnd(basePrice),
        roundVnd(finalPrice),
        null
      ]);

      checkRows.push([
        i + 1,
        safeCell(row, meta.productIdCol),
        safeCell(row, meta.productNameCol),
        safeCell(row, meta.productSkuCol),
        roundVnd(basePrice),
        markedPrice,
        roundVnd(finalPrice),
        percentFee / 100,
        fixedFee,
        platformPercentFeeValue,
        Math.round(netRevenue * 100) / 100,
        Math.round(diff * 100) / 100,
        status,
        warnings.join(' | ')
      ]);
    }

    summary.minSuggestedMarkupPercent = Math.ceil(summary.minSuggestedMarkupPercent * 10) / 10;

    return {
      discountRows: discountRows,
      checkRows: checkRows,
      summary: summary
    };
  }

  function autosizeColumns(ws, rows, maxWidth) {
    maxWidth = maxWidth || 45;
    if (!rows || !rows.length) return;
    var colCount = 0;
    rows.forEach(function (r) {
      if (r && r.length > colCount) colCount = r.length;
    });
    var widths = [];
    for (var c = 0; c < colCount; c++) {
      var len = 10;
      for (var r = 0; r < Math.min(rows.length, 80); r++) {
        var v = rows[r] && rows[r][c] !== null && rows[r][c] !== undefined ? String(rows[r][c]) : '';
        if (v.length > len) len = Math.min(maxWidth, v.length + 2);
      }
      widths.push({ wch: Math.max(10, len) });
    }
    ws['!cols'] = widths;
  }

  function downloadAoa(rows, sheetName, fileName, mode) {
    if (!rows || !rows.length) {
      showToast('Chưa có dữ liệu để tải.', 'error');
      return;
    }
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);
    autosizeColumns(ws, rows, mode === 'check' ? 35 : 45);

    if (mode === 'check') {
      // Format cột phần trăm và tiền nếu trình đọc hỗ trợ.
      var range = XLSX.utils.decode_range(ws['!ref']);
      for (var R = 1; R <= range.e.r; R++) {
        var percentCell = ws[XLSX.utils.encode_cell({ r: R, c: 7 })];
        if (percentCell) percentCell.z = '0.00%';
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    XLSX.writeFile(wb, fileName);
  }

  function todayName() {
    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '.' + mm + '.' + yyyy;
  }

  function fileSafePercent(n) {
    return String(Number(n || 0)).replace('.', '_');
  }

  function buildFileNames() {
    var cfg = state.config;
    var date = todayName();
    return {
      price: 'BANG GIA ' + fileSafePercent(cfg.markupPercent) + '% SHOPEE ' + date + '.xlsx',
      discount: 'CK SHOPEE NNV ' + fileSafePercent(totalPercentFee(cfg)) + '%+' + totalFixedFee(cfg) + ' ' + date + '.xlsx',
      check: 'KIEM TRA GIA SHOPEE ' + date + '.xlsx'
    };
  }

  function getFormConfig() {
    var cfg = {
      markupPercent: getInputNumber('ps-markup-percent', DEFAULT_CONFIG.markupPercent),
      fixedFeePercent: getInputNumber('ps-fixed-fee-percent', DEFAULT_CONFIG.fixedFeePercent),
      transactionFeePercent: getInputNumber('ps-transaction-fee-percent', DEFAULT_CONFIG.transactionFeePercent),
      voucherXtraPercent: getInputNumber('ps-voucher-xtra-percent', DEFAULT_CONFIG.voucherXtraPercent),
      infrastructureFee: getInputNumber('ps-infrastructure-fee', DEFAULT_CONFIG.infrastructureFee),
      pishipFee: getInputNumber('ps-piship-fee', DEFAULT_CONFIG.pishipFee),
      roundingStep: getInputNumber('ps-rounding-step', DEFAULT_CONFIG.roundingStep),
      appliedSince: new Date().toISOString()
    };

    if (totalPercentFee(cfg) >= 100) {
      throw new Error('Tổng phí phần trăm đang >= 100%, không thể tính giá.');
    }
    if (cfg.markupPercent < 0) {
      throw new Error('Tỷ lệ cộng giá không được âm.');
    }
    if (cfg.roundingStep < 1) {
      throw new Error('Bước làm tròn phải lớn hơn hoặc bằng 1.');
    }
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
      var el = qs(id);
      if (el) el.value = map[id];
    });
    updateFeePreview();
    renderSavedInfo(cfg);
  }

  function renderSavedInfo(cfg) {
    var el = qs('ps-saved-info');
    if (!el) return;
    if (cfg && cfg.appliedSince) {
      var time = new Date(cfg.appliedSince);
      el.innerHTML = 'Đang áp dụng từ: <b>' + time.toLocaleString('vi-VN') + '</b>';
    } else {
      el.innerHTML = 'Chưa có cấu hình đã lưu. Đang dùng mặc định.';
    }
  }

  function updateFeePreview() {
    var cfg;
    try {
      cfg = getFormConfig();
    } catch (e) {
      cfg = clone(DEFAULT_CONFIG);
    }
    var totalPct = totalPercentFee(cfg);
    var fixed = totalFixedFee(cfg);
    var box = qs('ps-fee-preview');
    if (box) {
      box.innerHTML =
        '<span>Tổng phí %: <b>' + fmtPercent(totalPct) + '</b></span>' +
        '<span>Tổng phí cố định: <b>' + fmtNumber(fixed) + 'đ/đơn</b></span>' +
        '<span>Công thức: <b>Giá bán = làm tròn lên((Giá gốc + phí cố định) / (1 - phí %))</b></span>';
    }
  }

  function loadLocalConfig() {
    try {
      var raw = localStorage.getItem(MODULE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
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
      if (!window.sysDb || !window.sysDb.ref) return resolve(false);
      try {
        window.sysDb.ref(FIREBASE_PATH).set(cfg).then(function () {
          resolve(true);
        }).catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  function showToast(message, type) {
    if (window.showToast) {
      window.showToast(message);
      return;
    }
    var toast = qs('ps-toast');
    if (!toast) return alert(message);
    toast.className = 'ps-toast show ' + (type || '');
    toast.innerText = message;
    setTimeout(function () {
      toast.className = 'ps-toast';
    }, 2600);
  }

  function setStatus(message, type) {
    var el = qs('ps-status');
    if (!el) return;
    el.className = 'ps-status ' + (type || '');
    el.innerHTML = message || '';
  }

  function saveConfigFromForm() {
    try {
      var cfg = getFormConfig();
      state.config = cfg;
      saveLocalConfig(cfg);
      renderSavedInfo(cfg);
      updateFeePreview();

      saveRemoteConfig(cfg).then(function (savedRemote) {
        if (savedRemote) showToast('Đã lưu cấu hình phí lên hệ thống.', 'success');
        else showToast('Đã lưu cấu hình phí trên trình duyệt này.', 'success');
      }).catch(function () {
        showToast('Đã lưu local, nhưng chưa lưu được lên Firebase.', 'error');
      });
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function resetDefaultConfig() {
    state.config = clone(DEFAULT_CONFIG);
    applyConfigToForm(state.config);
    saveLocalConfig(state.config);
    showToast('Đã đưa cấu hình về mặc định.', 'success');
  }

  function handleFileInput(evt) {
    var file = evt.target.files && evt.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    setStatus('Đang đọc file: <b>' + file.name + '</b>...', 'loading');

    reader.onload = function (e) {
      try {
        var parsed = parseWorkbookRows(e.target.result, file.name);
        var meta = detectShopeeFormat(parsed.rows);
        var products = collectProductRows(parsed.rows, meta);
        if (!products.length) {
          throw new Error('Không tìm thấy sản phẩm có giá hợp lệ trong file.');
        }

        state.fileName = file.name;
        state.sourceRows = parsed.rows;
        state.workbookMeta = meta;
        state.priceRows = null;
        state.discountRows = null;
        state.checkRows = null;
        state.summary = null;

        setStatus('Đã nhận file <b>' + file.name + '</b> - tìm thấy <b>' + products.length + '</b> dòng sản phẩm.', 'success');
        renderSourcePreview(products.slice(0, 8), meta);
        updateActionButtons();
      } catch (err) {
        state.sourceRows = null;
        state.workbookMeta = null;
        updateActionButtons();
        setStatus('Lỗi đọc file: ' + err.message, 'error');
      }
    };

    reader.onerror = function () {
      setStatus('Không thể đọc file. Anh thử tải lại file Excel khác.', 'error');
    };

    reader.readAsArrayBuffer(file);
  }

  function runCalculation() {
    try {
      if (!state.sourceRows || !state.workbookMeta) {
        showToast('Anh cần nhập file giá gốc trước.', 'error');
        return;
      }
      var cfg = getFormConfig();
      state.config = cfg;

      state.priceRows = buildPriceRows(state.sourceRows, state.workbookMeta, cfg);
      var built = buildDiscountAndCheckRows(state.sourceRows, state.workbookMeta, cfg);
      state.discountRows = built.discountRows;
      state.checkRows = built.checkRows;
      state.summary = built.summary;

      renderResultSummary();
      renderCheckTable();
      updateActionButtons();
      setStatus('Đã tính xong. Có thể tải file giá % và file chiết khấu.', 'success');
    } catch (e) {
      setStatus('Lỗi tính giá: ' + e.message, 'error');
    }
  }

  function updateActionButtons() {
    var hasSource = !!state.sourceRows;
    var hasResult = !!(state.priceRows && state.discountRows && state.checkRows);
    ['ps-btn-calc'].forEach(function (id) {
      var el = qs(id);
      if (el) el.disabled = !hasSource;
    });
    ['ps-btn-download-price', 'ps-btn-download-discount', 'ps-btn-download-check'].forEach(function (id) {
      var el = qs(id);
      if (el) el.disabled = !hasResult;
    });
  }

  function renderSourcePreview(products, meta) {
    var box = qs('ps-preview');
    if (!box) return;
    var html = '<div class="ps-mini-title">Xem nhanh file giá gốc</div>';
    html += '<div class="ps-table-wrap"><table class="ps-table"><thead><tr>' +
      '<th>STT</th><th>Mã SP</th><th>Tên sản phẩm</th><th>SKU</th><th>Giá gốc</th></tr></thead><tbody>';

    products.forEach(function (item, idx) {
      var row = item.row;
      html += '<tr>' +
        '<td>' + (idx + 1) + '</td>' +
        '<td>' + (safeCell(row, meta.productIdCol) || '') + '</td>' +
        '<td>' + escapeHtml(safeCell(row, meta.productNameCol) || '') + '</td>' +
        '<td>' + (safeCell(row, meta.productSkuCol) || '') + '</td>' +
        '<td class="num">' + fmtNumber(item.basePrice) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    box.innerHTML = html;
  }

  function renderResultSummary() {
    var box = qs('ps-result-summary');
    if (!box || !state.summary) return;
    var s = state.summary;
    var warnClass = s.fail > 0 || s.warnDiscountHigherThanMarked > 0 ? 'warn' : 'ok';
    box.innerHTML =
      '<div class="ps-summary-grid">' +
        '<div class="ps-card"><div class="ps-label">Tổng sản phẩm</div><div class="ps-value">' + fmtNumber(s.total) + '</div></div>' +
        '<div class="ps-card ok"><div class="ps-label">Tiền về đạt</div><div class="ps-value">' + fmtNumber(s.ok) + '</div></div>' +
        '<div class="ps-card ' + (s.fail ? 'bad' : 'ok') + '"><div class="ps-label">Không đạt</div><div class="ps-value">' + fmtNumber(s.fail) + '</div></div>' +
        '<div class="ps-card ' + warnClass + '"><div class="ps-label">CK cao hơn giá %</div><div class="ps-value">' + fmtNumber(s.warnDiscountHigherThanMarked) + '</div></div>' +
      '</div>' +
      '<div class="ps-note">Gợi ý: với cấu hình hiện tại, % cộng giá tối thiểu nên khoảng <b>' + fmtPercent(s.minSuggestedMarkupPercent) + '</b> để giá đã cộng % không thấp hơn giá CK đề xuất. Mặc định 50% vẫn dùng được, nhưng các sản phẩm giá thấp có thể bị cảnh báo do phí cố định và làm tròn.</div>';
  }

  function renderCheckTable() {
    var box = qs('ps-check-table');
    if (!box || !state.checkRows) return;
    var rows = state.checkRows.slice(1);
    var invalidFirst = rows.filter(function (r) { return r[12] !== 'ĐẠT' || r[13]; });
    var showRows = (invalidFirst.length ? invalidFirst : rows).slice(0, 50);

    var html = '<div class="ps-mini-title">Bảng kiểm tra ' + (invalidFirst.length ? '(ưu tiên dòng có cảnh báo)' : '(50 dòng đầu)') + '</div>';
    html += '<div class="ps-table-wrap"><table class="ps-table"><thead><tr>' +
      '<th>STT</th><th>SKU</th><th>Giá gốc</th><th>Giá %</th><th>Giá CK</th><th>Tiền về</th><th>Chênh lệch</th><th>Trạng thái</th><th>Cảnh báo</th>' +
      '</tr></thead><tbody>';

    showRows.forEach(function (r) {
      var statusClass = r[12] === 'ĐẠT' ? 'ok-text' : 'bad-text';
      html += '<tr>' +
        '<td>' + r[0] + '</td>' +
        '<td>' + (r[3] || '') + '</td>' +
        '<td class="num">' + fmtNumber(r[4]) + '</td>' +
        '<td class="num">' + fmtNumber(r[5]) + '</td>' +
        '<td class="num">' + fmtNumber(r[6]) + '</td>' +
        '<td class="num">' + fmtNumber(r[10]) + '</td>' +
        '<td class="num ' + (r[11] >= 0 ? 'ok-text' : 'bad-text') + '">' + fmtNumber(r[11]) + '</td>' +
        '<td class="' + statusClass + '"><b>' + r[12] + '</b></td>' +
        '<td>' + escapeHtml(r[13] || '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    box.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function downloadPriceFile() {
    var names = buildFileNames();
    downloadAoa(state.priceRows, 'Sheet1', names.price, 'price');
  }

  function downloadDiscountFile() {
    var names = buildFileNames();
    downloadAoa(state.discountRows, 'Sheet', names.discount, 'discount');
  }

  function downloadCheckFile() {
    var names = buildFileNames();
    downloadAoa(state.checkRows, 'Kiem tra', names.check, 'check');
  }

  function injectStyle() {
    if (qs('price-setting-style')) return;
    var style = document.createElement('style');
    style.id = 'price-setting-style';
    style.innerHTML =
      '.ps-wrap{font-family:Segoe UI,Tahoma,sans-serif;color:#202124}' +
      '.ps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:14px}' +
      '.ps-field{background:#fff;border:1px solid #e8eaed;border-radius:12px;padding:12px}' +
      '.ps-field label{display:block;font-size:11px;font-weight:900;color:#5f6368;text-transform:uppercase;margin-bottom:6px}' +
      '.ps-field input{width:100%;border:1px solid #dadce0!important;border-radius:8px!important;padding:10px!important;font-size:14px!important;background:#fff!important;font-weight:700;color:#202124!important}' +
      '.ps-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0}' +
      '.ps-btn{border:none;border-radius:10px;padding:11px 16px;font-weight:900;cursor:pointer;background:#1a73e8;color:white;transition:.2s}' +
      '.ps-btn:hover{filter:brightness(.95);transform:translateY(-1px)}' +
      '.ps-btn.secondary{background:#fff;color:#1a73e8;border:1px solid #1a73e8}' +
      '.ps-btn.green{background:#1e8e3e}' +
      '.ps-btn.orange{background:#ee4d2d}' +
      '.ps-btn.gray{background:#f1f3f4;color:#3c4043}' +
      '.ps-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}' +
      '.ps-upload{border:2px dashed #1a73e8;background:#f8fbff;border-radius:14px;padding:22px;text-align:center;cursor:pointer;margin:16px 0}' +
      '.ps-upload:hover{background:#e8f0fe}' +
      '.ps-upload strong{color:#1a73e8;font-size:15px}' +
      '.ps-sub{font-size:12px;color:#5f6368;margin-top:6px}' +
      '.ps-fee-preview{display:flex;gap:10px;flex-wrap:wrap;background:#f8f9fa;border-left:5px solid #1a73e8;border-radius:10px;padding:12px;margin:10px 0;font-size:13px}' +
      '.ps-saved-info{font-size:12px;color:#5f6368;margin-top:6px}' +
      '.ps-status{padding:12px;border-radius:10px;background:#f8f9fa;color:#5f6368;margin:12px 0;font-size:13px}' +
      '.ps-status.success{background:#e6f4ea;color:#137333}.ps-status.error{background:#fce8e6;color:#d93025}.ps-status.loading{background:#e8f0fe;color:#1a73e8}' +
      '.ps-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:15px 0}' +
      '.ps-card{background:#fff;border:1px solid #e8eaed;border-radius:14px;padding:14px;box-shadow:0 2px 10px rgba(0,0,0,.03)}' +
      '.ps-card.ok{border-left:5px solid #1e8e3e}.ps-card.bad{border-left:5px solid #d93025}.ps-card.warn{border-left:5px solid #fbbc04}' +
      '.ps-label{font-size:11px;font-weight:900;color:#5f6368;text-transform:uppercase}.ps-value{font-size:22px;font-weight:900;color:#202124;margin-top:5px}' +
      '.ps-note{background:#fff8e1;border:1px solid #fbbc04;border-radius:10px;padding:12px;font-size:13px;color:#5f6368;line-height:1.5}' +
      '.ps-mini-title{font-size:13px;font-weight:900;margin:16px 0 8px;color:#202124;text-transform:uppercase}' +
      '.ps-table-wrap{width:100%;overflow:auto;border:1px solid #e8eaed;border-radius:12px;max-height:420px;background:#fff}' +
      '.ps-table{width:100%;border-collapse:collapse;min-width:900px}' +
      '.ps-table th{position:sticky;top:0;background:#f5f5f5;color:#5f6368;font-size:11px;text-transform:uppercase;padding:10px;border-bottom:1px solid #dadce0;z-index:2}' +
      '.ps-table td{padding:9px;border-bottom:1px solid #f1f3f4;font-size:12px;vertical-align:top}' +
      '.ps-table .num{text-align:right;font-weight:700}.ok-text{color:#137333}.bad-text{color:#d93025}' +
      '.ps-toast{display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#202124;color:white;padding:12px 18px;border-radius:999px;z-index:999999;font-weight:700}' +
      '.ps-toast.show{display:block}.ps-toast.error{background:#d93025}.ps-toast.success{background:#137333}' +
      '@media(max-width:768px){.ps-actions{display:grid;grid-template-columns:1fr}.ps-btn{width:100%}.ps-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function renderUI() {
    var container = qs('price-setting-container');
    if (!container) return;
    injectStyle();

    container.innerHTML =
      '<div class="ps-wrap">' +
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
          '<div class="ps-sub">Hỗ trợ .xlsx, .xls, .csv. File đúng dạng Shopee có cột Giá ở cột G.</div>' +
          '<input id="ps-file-input" type="file" accept=".xlsx,.xls,.csv" style="display:none" />' +
        '</div>' +

        '<div id="ps-status" class="ps-status">Chưa nhập file giá gốc.</div>' +
        '<div id="ps-preview"></div>' +

        '<div class="ps-actions">' +
          '<button class="ps-btn orange" id="ps-btn-calc" disabled>⚙️ Bước 2: Tính giá</button>' +
          '<button class="ps-btn secondary" id="ps-btn-download-price" disabled>⬇️ Tải file giá %</button>' +
          '<button class="ps-btn secondary" id="ps-btn-download-discount" disabled>⬇️ Tải file chiết khấu</button>' +
          '<button class="ps-btn secondary" id="ps-btn-download-check" disabled>⬇️ Tải file kiểm tra</button>' +
        '</div>' +

        '<div id="ps-result-summary"></div>' +
        '<div id="ps-check-table"></div>' +
        '<div id="ps-toast" class="ps-toast"></div>' +
      '</div>';

    bindEvents();
    updateActionButtons();
  }

  function fieldHtml(id, label, value) {
    return '<div class="ps-field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="number" step="0.01" value="' + value + '" /></div>';
  }

  function bindEvents() {
    var uploadBox = qs('ps-upload-box');
    var fileInput = qs('ps-file-input');
    if (uploadBox && fileInput) {
      uploadBox.onclick = function () { fileInput.click(); };
      fileInput.onchange = handleFileInput;
    }

    ['ps-markup-percent', 'ps-fixed-fee-percent', 'ps-transaction-fee-percent', 'ps-voucher-xtra-percent', 'ps-infrastructure-fee', 'ps-piship-fee', 'ps-rounding-step'].forEach(function (id) {
      var el = qs(id);
      if (el) el.oninput = updateFeePreview;
    });

    qs('ps-btn-save').onclick = saveConfigFromForm;
    qs('ps-btn-reset').onclick = resetDefaultConfig;
    qs('ps-btn-calc').onclick = runCalculation;
    qs('ps-btn-download-price').onclick = downloadPriceFile;
    qs('ps-btn-download-discount').onclick = downloadDiscountFile;
    qs('ps-btn-download-check').onclick = downloadCheckFile;
  }

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
  };
})();
