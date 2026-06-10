/* PRICE_SETTING_TIKTOK_MODULE_ONLY_V8_20260610
 * NNV Marketing System - TMĐT > Thiết lập giá > TikTok Shop
 * FILE RIÊNG CHO TIKTOK SHOP.
 * Version: V8 - giao diện đồng bộ Shopee, icon TikTok Shop, đổi nhãn file giá %, dùng chung bảng giá công ty.
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_TIKTOK_MODULE_ONLY_V8_20260610';
  var MODULE_KEY = 'NNV_PRICE_SETTING_TIKTOK_V6_CONFIG';
  var MODULE_HISTORY_KEY = 'NNV_PRICE_SETTING_TIKTOK_V6_HISTORY';
  var COMPANY_PRICE_KEY = 'NNV_PRICE_SETTING_SHOPEE_V15_COMPANY_PRICE_BOOK_CACHE'; // Dùng chung cache bảng giá công ty với Shopee

  var FIREBASE_PATH = 'system_settings/ecom_price_setting/tiktok';
  var FIREBASE_HISTORY_PATH = 'system_settings/ecom_price_setting_history/tiktok';
  var COMPANY_PRICE_FIREBASE_PATH = 'system_settings/ecom_price_company_book/shopee/current'; // Dùng chung bảng giá công ty với Shopee
  var COMPANY_PRICE_HISTORY_FIREBASE_PATH = 'system_settings/ecom_price_company_book_history/shopee'; // Ghi chung lịch sử bảng giá công ty

  if (window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ === VERSION_MARKER) return;
  window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ = VERSION_MARKER;

  var DEFAULT_CONFIG = {
    markupPercent: 50,
    commissionFeePercent: 11,
    transactionFeePercent: 6,
    voucherExtraPercent: 5.5,
    orderProcessingFee: 3000,
    otherCostType: 'amount',
    otherCostValue: 0,
    roundingStep: 1000,
    appliedSince: '',
    updatedBy: '',
    updatedByEmail: ''
  };

  var state = {
    config: clone(DEFAULT_CONFIG),
    files: [],
    companyPriceBook: null,
    companyPriceListenerAttached: false
  };

  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj || {})); }
    catch (e) { return {}; }
  }

  function $(id) { return document.getElementById(id); }

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

  function formatVnd(value) {
    var n = Number(value || 0);
    try { return Math.round(n).toLocaleString('vi-VN'); }
    catch (e) { return String(Math.round(n)); }
  }

  function formatPercent(value) {
    var n = Number(value || 0);
    return String(Math.round(n * 100) / 100).replace('.', ',') + '%';
  }

  function getCurrentEditor() {
    var name = '';
    var email = '';
    try {
      if (window.myIdentity) name = String(window.myIdentity);
      var header = document.getElementById('header-user-display');
      if (!name && header && header.innerText) name = header.innerText.trim();
      if (window.sysAuth && window.sysAuth.currentUser) {
        email = window.sysAuth.currentUser.email || '';
        if (!name && window.sysAuth.currentUser.displayName) name = window.sysAuth.currentUser.displayName;
      }
    } catch (e) {}
    return { name: name || 'Không xác định', email: email || '' };
  }

  function todayFileName() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' +
      String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  function safeName(name) {
    return String(name || 'FILE')
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function showToast(message, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(message);
      return;
    }
    var el = $('ptk-toast');
    if (!el) { alert(message); return; }
    el.className = 'ptk-toast show ' + (type || '');
    el.innerText = message;
    setTimeout(function () { el.className = 'ptk-toast'; }, 3200);
  }

  function totalPercentFee(cfg) {
    cfg = cfg || {};
    var otherPercent = cfg.otherCostType === 'percent' ? Number(cfg.otherCostValue || 0) : 0;
    return Number(cfg.commissionFeePercent || 0) +
      Number(cfg.transactionFeePercent || 0) +
      Number(cfg.voucherExtraPercent || 0) +
      otherPercent;
  }

  function totalFixedFee(cfg) {
    cfg = cfg || {};
    var otherAmount = cfg.otherCostType === 'amount' || !cfg.otherCostType ? Number(cfg.otherCostValue || 0) : 0;
    return Number(cfg.orderProcessingFee || 0) + otherAmount;
  }

  function formatOtherCost(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var value = Number(cfg.otherCostValue || 0);
    return cfg.otherCostType === 'percent' ? formatPercent(value) : formatVnd(value) + 'đ/đơn';
  }

  function parseOtherCostInput(rawValue) {
    var raw = rawValue === null || rawValue === undefined ? '' : String(rawValue).trim();
    var isPercent = raw.indexOf('%') >= 0;
    return { type: isPercent ? 'percent' : 'amount', value: toNumber(raw) };
  }

  function formatOtherCostInput(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var value = Number(cfg.otherCostValue || 0);
    if (!value) return '0';
    return cfg.otherCostType === 'percent' ? String(value).replace('.', ',') + '%' : String(value);
  }

  function ceilToStep(value, step) {
    step = Number(step || 1);
    if (step < 1) step = 1;
    return Math.ceil(Number(value || 0) / step) * step;
  }

  function calcMinimumPrice(basePrice, cfg) {
    var percentRate = totalPercentFee(cfg) / 100;
    var fixedFee = totalFixedFee(cfg);
    if (percentRate >= 1) throw new Error('Tổng phí phần trăm phải nhỏ hơn 100%.');
    return ceilToStep((Number(basePrice || 0) + fixedFee) / (1 - percentRate), cfg.roundingStep || 1);
  }

  function calcNetRevenue(sellingPrice, cfg) {
    return Number(sellingPrice || 0) * (1 - totalPercentFee(cfg) / 100) - totalFixedFee(cfg);
  }

  function getFormConfig() {
    var parsedOtherCost = parseOtherCostInput($('ptk-other-cost-value') ? $('ptk-other-cost-value').value : DEFAULT_CONFIG.otherCostValue);
    var cfg = {
      markupPercent: toNumber($('ptk-markup-percent') ? $('ptk-markup-percent').value : DEFAULT_CONFIG.markupPercent),
      commissionFeePercent: toNumber($('ptk-commission-fee-percent') ? $('ptk-commission-fee-percent').value : DEFAULT_CONFIG.commissionFeePercent),
      transactionFeePercent: toNumber($('ptk-transaction-fee-percent') ? $('ptk-transaction-fee-percent').value : DEFAULT_CONFIG.transactionFeePercent),
      voucherExtraPercent: toNumber($('ptk-voucher-extra-percent') ? $('ptk-voucher-extra-percent').value : DEFAULT_CONFIG.voucherExtraPercent),
      orderProcessingFee: toNumber($('ptk-order-processing-fee') ? $('ptk-order-processing-fee').value : DEFAULT_CONFIG.orderProcessingFee),
      otherCostType: parsedOtherCost.type,
      otherCostValue: parsedOtherCost.value,
      roundingStep: toNumber($('ptk-rounding-step') ? $('ptk-rounding-step').value : DEFAULT_CONFIG.roundingStep),
      appliedSince: new Date().toISOString(),
      updatedBy: getCurrentEditor().name,
      updatedByEmail: getCurrentEditor().email
    };
    if (cfg.markupPercent < 0) throw new Error('Tỷ lệ cộng giá không được âm.');
    if (cfg.otherCostValue < 0) throw new Error('Chi phí khác không được âm.');
    if (cfg.roundingStep < 1) throw new Error('Bước làm tròn phải từ 1 trở lên.');
    if (totalPercentFee(cfg) >= 100) throw new Error('Tổng phí % đang lớn hơn hoặc bằng 100%.');
    return cfg;
  }

  function applyConfigToForm(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    var map = {
      'ptk-markup-percent': cfg.markupPercent,
      'ptk-commission-fee-percent': cfg.commissionFeePercent,
      'ptk-transaction-fee-percent': cfg.transactionFeePercent,
      'ptk-voucher-extra-percent': cfg.voucherExtraPercent,
      'ptk-order-processing-fee': cfg.orderProcessingFee,
      'ptk-other-cost-value': formatOtherCostInput(cfg),
      'ptk-rounding-step': cfg.roundingStep
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
    var input = $('ptk-other-cost-value');
    if (!input) return;
    var parsed = parseOtherCostInput(input.value);
    input.title = parsed.type === 'percent' ? 'Đang tính chi phí khác theo % giá bán' : 'Đang tính chi phí khác theo số tiền mỗi đơn';
  }

  function loadLocalConfig() {
    try { return JSON.parse(localStorage.getItem(MODULE_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function saveLocalConfig(cfg) {
    try { localStorage.setItem(MODULE_KEY, JSON.stringify(cfg)); }
    catch (e) {}
  }

  function loadLocalHistory() {
    try {
      var arr = JSON.parse(localStorage.getItem(MODULE_HISTORY_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveLocalHistory(list) {
    try { localStorage.setItem(MODULE_HISTORY_KEY, JSON.stringify((list || []).slice(0, 200))); }
    catch (e) {}
  }

  function normalizeHeader(value) {
    return String(value === null || value === undefined ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  function normalizeProductCode(value) {
    return String(value === null || value === undefined ? '' : value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  function loadCompanyPriceBook() {
    try {
      var raw = localStorage.getItem(COMPANY_PRICE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.map) return null;
      return data;
    } catch (e) { return null; }
  }

  function saveCompanyPriceBook(book) {
    try {
      if (!book) localStorage.removeItem(COMPANY_PRICE_KEY);
      else localStorage.setItem(COMPANY_PRICE_KEY, JSON.stringify(book));
      return true;
    } catch (e) { return false; }
  }

  function packCompanyPriceBookForFirebase(book) {
    if (!book || !book.map) return null;
    var items = [];
    Object.keys(book.map).forEach(function (key) {
      var item = book.map[key] || {};
      items.push({ key: key, code: item.code || key, price: Number(item.price || 0), rowIndex: item.rowIndex || '' });
    });
    return {
      fileName: book.fileName || 'Bảng giá công ty',
      sourceFiles: Array.isArray(book.sourceFiles) ? book.sourceFiles : [],
      savedAt: book.savedAt || new Date().toISOString(),
      systemSavedAt: new Date().toISOString(),
      updatedBy: book.updatedBy || getCurrentEditor().name,
      updatedByEmail: book.updatedByEmail || getCurrentEditor().email,
      count: items.length,
      duplicates: book.duplicates || 0,
      duplicateDetails: normalizeDuplicateDetails(book.duplicateDetails || []),
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
      map[key] = { code: item.code || item.key || key, price: Number(item.price || 0), rowIndex: item.rowIndex || '' };
    });
    if (!Object.keys(map).length) return null;
    data.map = map;
    data.count = Object.keys(map).length;
    return data;
  }

  function normalizeDuplicateDetails(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (!item) return;
      var code = normalizeProductCode(item.code || item.key || item.maSp || item.sku);
      if (!code) return;
      out.push({
        code: code,
        displayCode: item.displayCode || item.code || code,
        previousSource: item.previousSource || item.previousRow || item.oldSource || '',
        currentSource: item.currentSource || item.currentRow || item.newSource || '',
        usedSource: item.usedSource || item.currentSource || item.currentRow || '',
        note: item.note || 'Dùng giá ở dòng xuất hiện sau cùng'
      });
    });
    return out;
  }

  function getDuplicateCodeSummary(book) {
    var details = normalizeDuplicateDetails(book && book.duplicateDetails ? book.duplicateDetails : []);
    var map = {};
    details.forEach(function (item) {
      var key = normalizeProductCode(item.code);
      if (!key) return;
      if (!map[key]) map[key] = { code: item.displayCode || item.code || key, count: 0, sources: [] };
      map[key].count += 1;
      if (item.previousSource) map[key].sources.push(item.previousSource);
      if (item.currentSource) map[key].sources.push(item.currentSource);
    });
    return Object.keys(map).sort().map(function (key) {
      var item = map[key];
      var seen = {};
      item.sources = item.sources.filter(function (src) {
        if (!src || seen[src]) return false;
        seen[src] = true;
        return true;
      });
      return item;
    });
  }

  function renderDuplicateCodesHtml(book) {
    if (!book || !book.duplicates) return '';
    var summary = getDuplicateCodeSummary(book);
    if (!summary.length) return '<div>Có <b>' + formatVnd(book.duplicates) + '</b> mã bị trùng, hệ thống dùng giá ở dòng xuất hiện sau cùng.</div>';
    var chips = summary.map(function (item) {
      var title = item.sources.length ? ' title="' + escapeHtml(item.sources.join(' | ')) + '"' : '';
      return '<span class="ptk-dup-chip"' + title + '>' + escapeHtml(item.code) + (item.count > 1 ? ' ×' + item.count : '') + '</span>';
    }).join('');
    return '<div class="ptk-dup-box"><div><b>Mã bị trùng:</b> ' + formatVnd(summary.length) + ' mã · ' + formatVnd(book.duplicates) + ' lần trùng. Hệ thống dùng giá ở dòng xuất hiện sau cùng.</div><div class="ptk-dup-list">' + chips + '</div></div>';
  }

  function loadRemoteCompanyPriceBook() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) { resolve(null); return; }
      try {
        window.sysDb.ref(COMPANY_PRICE_FIREBASE_PATH).once('value').then(function (snap) {
          resolve(unpackCompanyPriceBookFromFirebase(snap.val()));
        }).catch(function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  function attachCompanyPriceRealtimeSync() {
    if (state.companyPriceListenerAttached || !window.sysDb || !window.sysDb.ref) return;
    state.companyPriceListenerAttached = true;
    try {
      window.sysDb.ref(COMPANY_PRICE_FIREBASE_PATH).on('value', function (snap) {
        var remoteBook = unpackCompanyPriceBookFromFirebase(snap.val());
        if (remoteBook && remoteBook.map) {
          state.companyPriceBook = remoteBook;
          saveCompanyPriceBook(remoteBook);
        } else {
          state.companyPriceBook = null;
          saveCompanyPriceBook(null);
        }
        renderCompanyPriceStatus();
      });
    } catch (e) {}
  }

  function buildCompanyHistoryItem(action, packed, extra) {
    var editor = getCurrentEditor();
    extra = extra || {};
    return Object.assign({
      action: action,
      platform: 'tiktok',
      fileName: packed && packed.fileName ? packed.fileName : (extra.fileName || ''),
      sourceFilesCount: packed && Array.isArray(packed.sourceFiles) ? packed.sourceFiles.length : 0,
      savedAt: packed && packed.savedAt ? packed.savedAt : '',
      systemSavedAt: packed && packed.systemSavedAt ? packed.systemSavedAt : new Date().toISOString(),
      updatedBy: packed && packed.updatedBy ? packed.updatedBy : '',
      updatedByEmail: packed && packed.updatedByEmail ? packed.updatedByEmail : '',
      count: packed && packed.count ? packed.count : 0,
      duplicates: packed && packed.duplicates ? packed.duplicates : 0,
      duplicateDetails: normalizeDuplicateDetails(packed && packed.duplicateDetails ? packed.duplicateDetails : []),
      invalid: packed && packed.invalid ? packed.invalid : 0,
      actor: editor.name,
      actorEmail: editor.email,
      actedAt: new Date().toISOString()
    }, extra);
  }

  function saveRemoteCompanyPriceBook(book) {
    return new Promise(function (resolve, reject) {
      if (!window.sysDb || !window.sysDb.ref) { resolve(false); return; }
      var packed = packCompanyPriceBookForFirebase(book);
      if (!packed) { resolve(false); return; }
      var historyItem = buildCompanyHistoryItem('upload', packed);
      try {
        var historyRef = window.sysDb.ref(COMPANY_PRICE_HISTORY_FIREBASE_PATH).push();
        var updates = {};
        updates[COMPANY_PRICE_FIREBASE_PATH] = packed;
        updates[COMPANY_PRICE_HISTORY_FIREBASE_PATH + '/' + historyRef.key] = historyItem;
        window.sysDb.ref().update(updates).then(function () { resolve(true); }).catch(reject);
      } catch (e) { reject(e); }
    });
  }

  function deleteRemoteCompanyPriceBook(book) {
    return new Promise(function (resolve, reject) {
      if (!window.sysDb || !window.sysDb.ref) { resolve(false); return; }
      var packed = packCompanyPriceBookForFirebase(book) || packCompanyPriceBookForFirebase(state.companyPriceBook) || {};
      var editor = getCurrentEditor();
      var historyItem = buildCompanyHistoryItem('delete', packed, {
        deletedBy: editor.name,
        deletedByEmail: editor.email,
        deletedAt: new Date().toISOString(),
        originalUpdatedBy: packed.updatedBy || '',
        originalUpdatedByEmail: packed.updatedByEmail || ''
      });
      try {
        var historyRef = window.sysDb.ref(COMPANY_PRICE_HISTORY_FIREBASE_PATH).push();
        var updates = {};
        updates[COMPANY_PRICE_FIREBASE_PATH] = null;
        updates[COMPANY_PRICE_HISTORY_FIREBASE_PATH + '/' + historyRef.key] = historyItem;
        window.sysDb.ref().update(updates).then(function () { resolve(true); }).catch(reject);
      } catch (e) { reject(e); }
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
        if (h === 'MASP' || h.indexOf('MASP') >= 0 || h.indexOf('MAHANG') >= 0 || h.indexOf('SKU') >= 0) {
          if (codeCol < 0) codeCol = c;
        }
        if (h === 'GIANDSAUTHUE' || h.indexOf('GIANDSAUTHUE') >= 0 || h.indexOf('GIASAUTHUE') >= 0) {
          if (priceCol < 0) priceCol = c;
        }
      }
      if (codeCol >= 0 && priceCol >= 0) return { headerRow: r, codeCol: codeCol, priceCol: priceCol };
    }
    throw new Error('Không tìm thấy cột "MÃ SP" và "GIÁ ND SAU THUẾ" trong bảng giá công ty.');
  }

  function parseCompanyPriceBookRows(rows, fileName) {
    var meta = findCompanyPriceHeader(rows);
    var map = {};
    var duplicates = 0;
    var duplicateDetails = [];
    var invalid = 0;
    for (var r = meta.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var rawCode = getCell(row, meta.codeCol);
      var code = normalizeProductCode(rawCode);
      var price = toNumber(getCell(row, meta.priceCol));
      if (!code) continue;
      if (!price || price <= 0) { invalid += 1; continue; }
      if (map[code]) {
        duplicates += 1;
        duplicateDetails.push({
          code: code,
          displayCode: String(rawCode).trim(),
          previousSource: map[code].sourceLabel || ((fileName || 'Bảng giá công ty') + ' - dòng ' + (map[code].rowIndex || '')),
          currentSource: (fileName || 'Bảng giá công ty') + ' - dòng ' + (r + 1),
          usedSource: (fileName || 'Bảng giá công ty') + ' - dòng ' + (r + 1),
          note: 'Dùng giá ở dòng xuất hiện sau cùng'
        });
      }
      map[code] = {
        code: String(rawCode).trim(),
        price: price,
        rowIndex: r + 1,
        sourceLabel: (fileName || 'Bảng giá công ty') + ' - dòng ' + (r + 1)
      };
    }
    var keys = Object.keys(map);
    if (!keys.length) throw new Error('Bảng giá công ty không có dòng giá hợp lệ.');
    return {
      fileName: fileName || 'Bảng giá công ty',
      sourceFiles: [fileName || 'Bảng giá công ty'],
      savedAt: new Date().toISOString(),
      updatedBy: getCurrentEditor().name,
      updatedByEmail: getCurrentEditor().email,
      count: keys.length,
      duplicates: duplicates,
      duplicateDetails: duplicateDetails,
      invalid: invalid,
      headerRow: meta.headerRow,
      codeCol: meta.codeCol,
      priceCol: meta.priceCol,
      map: map
    };
  }

  function mergeCompanyPriceBooks(books) {
    books = (books || []).filter(function (book) { return book && book.map; });
    if (!books.length) throw new Error('Không có bảng giá công ty hợp lệ để lưu.');
    if (books.length === 1) {
      books[0].sourceFiles = Array.isArray(books[0].sourceFiles) ? books[0].sourceFiles : [books[0].fileName || 'Bảng giá công ty'];
      books[0].duplicateDetails = normalizeDuplicateDetails(books[0].duplicateDetails || []);
      return books[0];
    }
    var editor = getCurrentEditor();
    var mergedMap = {};
    var sourceFiles = [];
    var duplicates = 0;
    var duplicateDetails = [];
    var invalid = 0;
    var totalRows = 0;
    books.forEach(function (book) {
      if (book.fileName) sourceFiles.push(book.fileName);
      duplicates += Number(book.duplicates || 0);
      duplicateDetails = duplicateDetails.concat(normalizeDuplicateDetails(book.duplicateDetails || []));
      invalid += Number(book.invalid || 0);
      Object.keys(book.map || {}).forEach(function (key) {
        var item = book.map[key] || {};
        totalRows += 1;
        if (mergedMap[key]) {
          duplicates += 1;
          duplicateDetails.push({
            code: key,
            displayCode: item.code || key,
            previousSource: mergedMap[key].sourceLabel || mergedMap[key].rowIndex || '',
            currentSource: (book.fileName || 'File') + ' - dòng ' + (item.rowIndex || ''),
            usedSource: (book.fileName || 'File') + ' - dòng ' + (item.rowIndex || ''),
            note: 'Dùng giá ở dòng xuất hiện sau cùng'
          });
        }
        mergedMap[key] = {
          code: item.code || key,
          price: Number(item.price || 0),
          rowIndex: (book.fileName || 'File') + ' - dòng ' + (item.rowIndex || ''),
          sourceLabel: (book.fileName || 'File') + ' - dòng ' + (item.rowIndex || '')
        };
      });
    });
    var keys = Object.keys(mergedMap);
    if (!keys.length) throw new Error('Các bảng giá công ty không có mã hợp lệ.');
    return {
      fileName: sourceFiles.length + ' file bảng giá công ty',
      sourceFiles: sourceFiles,
      savedAt: new Date().toISOString(),
      updatedBy: editor.name,
      updatedByEmail: editor.email,
      count: keys.length,
      totalRows: totalRows,
      duplicates: duplicates,
      duplicateDetails: duplicateDetails,
      invalid: invalid,
      headerRow: 'multiple',
      codeCol: 'multiple',
      priceCol: 'multiple',
      map: mergedMap
    };
  }

  function renderCompanyPriceStatus() {
    var el = $('ptk-company-price-status');
    if (!el) return;
    var book = state.companyPriceBook;
    if (!book || !book.map) {
      el.innerHTML = '<div class="ptk-company-status muted">Chưa có bảng giá công ty dùng chung trên hệ thống. Nếu bên Shopee đã upload rồi thì TikTok sẽ tự dùng chung; nếu chưa có, hãy upload file có cột <b>MÃ SP</b> và <b>GIÁ ND SAU THUẾ</b>.</div>';
      return;
    }
    var d = book.savedAt ? new Date(book.savedAt) : null;
    var timeText = d && !isNaN(d.getTime()) ? d.toLocaleString('vi-VN') : 'Không rõ thời gian';
    var editor = book.updatedBy || 'Không xác định';
    var email = book.updatedByEmail ? ' · ' + escapeHtml(book.updatedByEmail) : '';
    el.innerHTML =
      '<div class="ptk-company-status ok">' +
        '<div class="ptk-company-top">' +
          '<div>' +
            '<div><b>Đã lưu bảng giá công ty dùng chung:</b> ' + escapeHtml(book.fileName || '') + '</div>' +
            '<div>Mã hợp lệ: <b>' + formatVnd(book.count || 0) + '</b> · Lưu lúc: <b>' + escapeHtml(timeText) + '</b> · Người lưu: <b>' + escapeHtml(editor) + '</b>' + email + '</div>' +
            '<div><b>Dùng chung:</b> Shopee + TikTok Shop. Xóa tại đây sẽ xóa bảng giá dùng chung trên Firebase.</div>' +
            (Array.isArray(book.sourceFiles) && book.sourceFiles.length > 1 ? '<div>Nguồn dữ liệu: <b>' + formatVnd(book.sourceFiles.length) + '</b> file bảng giá công ty.</div>' : '') +
          '</div>' +
          '<button type="button" class="ptk-mini-danger" id="ptk-delete-company-price">Xóa bảng giá</button>' +
        '</div>' +
        renderDuplicateCodesHtml(book) +
      '</div>';
    var delBtn = $('ptk-delete-company-price');
    if (delBtn) delBtn.onclick = deleteCompanyPriceBook;
  }

  function readCompanyPriceFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, { type: 'array', raw: true, cellDates: false });
          var parsedBooks = [];
          var errors = [];
          (workbook.SheetNames || []).forEach(function (sheetName) {
            try {
              var sheet = workbook.Sheets[sheetName];
              if (!sheet) return;
              var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
              var book = parseCompanyPriceBookRows(rows, file.name + ' / ' + sheetName);
              book.workbookFileName = file.name;
              book.sheetName = sheetName;
              parsedBooks.push(book);
            } catch (sheetErr) {
              errors.push(sheetName + ': ' + sheetErr.message);
            }
          });
          if (!parsedBooks.length) {
            throw new Error('Không tìm thấy sheet nào có đủ cột "MÃ SP" và "GIÁ ND SAU THUẾ". File này có các sheet: ' + (workbook.SheetNames || []).join(', '));
          }
          var merged = mergeCompanyPriceBooks(parsedBooks);
          merged.fileName = file.name;
          merged.sourceFiles = parsedBooks.map(function (book) { return (book.workbookFileName || file.name) + ' / ' + (book.sheetName || ''); });
          merged.sheetCount = parsedBooks.length;
          merged.readSheetErrors = errors;
          resolve(merged);
        } catch (err) { reject(new Error('Lỗi đọc ' + file.name + ': ' + err.message)); }
      };
      reader.onerror = function () { reject(new Error('Không đọc được file ' + file.name)); };
      reader.readAsArrayBuffer(file);
    });
  }

  function handleCompanyPriceFile(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;
    ensureXlsx();
    showToast('Đang đọc ' + formatVnd(files.length) + ' file bảng giá công ty...', 'success');
    Promise.allSettled(files.map(readCompanyPriceFile)).then(function (results) {
      var books = [];
      var errors = [];
      results.forEach(function (result) {
        if (result.status === 'fulfilled' && result.value) books.push(result.value);
        else errors.push(result.reason && result.reason.message ? result.reason.message : 'Có file không đọc được.');
      });
      if (!books.length) {
        showToast('Không có file bảng giá công ty hợp lệ. ' + errors.join(' | '), 'error');
        return;
      }
      try {
        var book = mergeCompanyPriceBooks(books);
        state.companyPriceBook = book;
        saveCompanyPriceBook(book);
        renderCompanyPriceStatus();
        showToast('Đang lưu ' + formatVnd(books.length) + ' file bảng giá công ty dùng chung lên hệ thống...', 'success');
        saveRemoteCompanyPriceBook(book).then(function (savedRemote) {
          if (savedRemote) {
            state.companyPriceBook.systemSavedAt = new Date().toISOString();
            saveCompanyPriceBook(state.companyPriceBook);
            renderCompanyPriceStatus();
            var msg = 'Đã lưu bảng giá công ty dùng chung lên hệ thống: ' + formatVnd(book.count) + ' mã sản phẩm';
            if (books.length > 1) msg += ' từ ' + formatVnd(books.length) + ' file';
            if (errors.length) msg += '. Có ' + formatVnd(errors.length) + ' file lỗi.';
            showToast(msg, errors.length ? 'error' : 'success');
          } else {
            showToast('Chưa kết nối được Firebase. Bảng giá đang lưu tạm trên máy này.', 'error');
          }
        }).catch(function () {
          showToast('Chưa lưu được bảng giá công ty lên hệ thống. Dữ liệu đang dùng tạm trong phiên hiện tại.', 'error');
        });
      } catch (err) { showToast('Lỗi xử lý bảng giá công ty: ' + err.message, 'error'); }
    }).finally(function () { event.target.value = ''; });
  }

  function deleteCompanyPriceBook() {
    if (!state.companyPriceBook || !state.companyPriceBook.map) {
      showToast('Không có bảng giá công ty dùng chung để xóa.', 'error');
      return;
    }
    var book = clone(state.companyPriceBook);
    var ok = true;
    try { ok = window.confirm('Xóa bảng giá công ty dùng chung khỏi hệ thống và Firebase? Hành động này ảnh hưởng cả Shopee và TikTok, và sẽ được ghi lịch sử.'); }
    catch (e) {}
    if (!ok) return;
    showToast('Đang xóa bảng giá công ty dùng chung khỏi hệ thống...', 'success');
    deleteRemoteCompanyPriceBook(book).then(function (remoteDeleted) {
      state.companyPriceBook = null;
      saveCompanyPriceBook(null);
      renderCompanyPriceStatus();
      if (remoteDeleted) showToast('Đã xóa bảng giá công ty dùng chung và ghi lịch sử.', 'success');
      else showToast('Đã xóa cache trên máy, nhưng chưa xóa được Firebase.', 'error');
    }).catch(function () {
      showToast('Chưa xóa được bảng giá dùng chung trên Firebase. Kiểm tra quyền tài khoản hoặc Firebase Rules.', 'error');
    });
  }

  function historySnapshot(cfg) {
    cfg = Object.assign({}, DEFAULT_CONFIG, cfg || {});
    return {
      action: 'save_config',
      platform: 'tiktok',
      appliedSince: cfg.appliedSince || new Date().toISOString(),
      updatedBy: cfg.updatedBy || getCurrentEditor().name || 'Không xác định',
      updatedByEmail: cfg.updatedByEmail || getCurrentEditor().email || '',
      markupPercent: Number(cfg.markupPercent || 0),
      commissionFeePercent: Number(cfg.commissionFeePercent || 0),
      transactionFeePercent: Number(cfg.transactionFeePercent || 0),
      voucherExtraPercent: Number(cfg.voucherExtraPercent || 0),
      orderProcessingFee: Number(cfg.orderProcessingFee || 0),
      otherCostType: cfg.otherCostType || 'amount',
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
      if (!window.sysDb || !window.sysDb.ref) { resolve(false); return; }
      try {
        window.sysDb.ref(FIREBASE_HISTORY_PATH).push(item).then(function () { resolve(true); }).catch(function () { resolve(false); });
      } catch (e) { resolve(false); }
    });
  }

  function loadRemoteHistory() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) { resolve([]); return; }
      try {
        window.sysDb.ref(FIREBASE_HISTORY_PATH).once('value').then(function (snap) {
          var val = snap.val() || {};
          var arr = [];
          Object.keys(val).forEach(function (key) { if (val[key]) arr.push(Object.assign({ _key: key }, val[key])); });
          resolve(arr);
        }).catch(function () { resolve([]); });
      } catch (e) { resolve([]); }
    });
  }

  function mergeHistory(localList, remoteList) {
    var map = {};
    var all = [];
    function add(item) {
      if (!item || !item.appliedSince) return;
      var key = [item.appliedSince, item.updatedBy || '', item.updatedByEmail || '', item.markupPercent, item.totalPercentFee, item.totalFixedFee].join('|');
      if (map[key]) return;
      map[key] = true;
      all.push(item);
    }
    (remoteList || []).forEach(add);
    (localList || []).forEach(add);
    all.sort(function (a, b) { return new Date(b.appliedSince || 0).getTime() - new Date(a.appliedSince || 0).getTime(); });
    return all;
  }

  function loadAllHistory() {
    return loadRemoteHistory().then(function (remoteList) { return mergeHistory(loadLocalHistory(), remoteList); });
  }

  function loadRemoteConfig() {
    return new Promise(function (resolve) {
      if (!window.sysDb || !window.sysDb.ref) { resolve(null); return; }
      try {
        window.sysDb.ref(FIREBASE_PATH).once('value').then(function (snap) { resolve(snap.val() || null); }).catch(function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  function saveRemoteConfig(cfg) {
    return new Promise(function (resolve, reject) {
      if (!window.sysDb || !window.sysDb.ref) { resolve(false); return; }
      try { window.sysDb.ref(FIREBASE_PATH).set(cfg).then(function () { resolve(true); }).catch(reject); }
      catch (e) { reject(e); }
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
          if (remoteSaved && historySaved) showToast('Đã lưu cấu hình TikTok và lịch sử thay đổi lên hệ thống.', 'success');
          else if (remoteSaved) showToast('Đã lưu cấu hình dùng chung lên hệ thống. Lịch sử đã lưu trên trình duyệt.', 'success');
          else showToast('Đã lưu cấu hình TikTok và lịch sử trên trình duyệt.', 'success');
        });
      }).catch(function () { showToast('Đã lưu local, nhưng chưa lưu được Firebase.', 'error'); });
    } catch (e) { showToast(e.message, 'error'); }
  }

  function renderSavedInfo(cfg) {
    var el = $('ptk-saved-info');
    if (!el) return;
    var mainText;
    if (cfg && cfg.appliedSince) {
      var d = new Date(cfg.appliedSince);
      var editor = cfg.updatedBy || 'Không xác định';
      var email = cfg.updatedByEmail ? ' · ' + cfg.updatedByEmail : '';
      mainText = 'Lần lưu gần nhất: <b>' + d.toLocaleString('vi-VN') + '</b> · Người thay đổi: <b>' + escapeHtml(editor) + '</b>' + escapeHtml(email);
    } else {
      mainText = 'Chưa có lịch sử lưu. Bấm <b>Lưu cấu hình</b> để hệ thống ghi nhận thời gian và người thay đổi.';
    }
    el.innerHTML =
      '<div class="ptk-saved-row">' +
        '<div class="ptk-saved-main">' + mainText + '</div>' +
        '<button type="button" class="ptk-history-btn" id="ptk-history-toggle">Xem toàn bộ lịch sử</button>' +
      '</div>' +
      '<div class="ptk-history-panel" id="ptk-history-panel" style="display:none;"></div>';
    bindHistoryToggle();
  }

  function bindHistoryToggle() {
    var btn = $('ptk-history-toggle');
    var panel = $('ptk-history-panel');
    if (!btn || !panel) return;
    btn.onclick = function () {
      var isOpen = panel.style.display !== 'none';
      if (isOpen) { panel.style.display = 'none'; btn.innerText = 'Xem toàn bộ lịch sử'; return; }
      panel.style.display = 'block';
      panel.innerHTML = '<div class="ptk-history-loading">Đang tải lịch sử...</div>';
      btn.innerText = 'Thu gọn lịch sử';
      loadAllHistory().then(renderHistoryPanel);
    };
  }

  function renderHistoryPanel(list) {
    var panel = $('ptk-history-panel');
    if (!panel) return;
    list = list || [];
    if (!list.length) { panel.innerHTML = '<div class="ptk-history-empty">Chưa có lịch sử thay đổi cấu hình.</div>'; return; }
    var html = '<div class="ptk-history-head"><b>Toàn bộ lịch sử thay đổi</b><span>' + list.length + ' lần lưu</span></div><div class="ptk-history-list">';
    list.forEach(function (item) {
      var d = item.appliedSince ? new Date(item.appliedSince) : null;
      var timeText = d && !isNaN(d.getTime()) ? d.toLocaleString('vi-VN') : 'Không rõ thời gian';
      var editor = item.updatedBy || 'Không xác định';
      var email = item.updatedByEmail || '';
      html +=
        '<div class="ptk-history-item">' +
          '<div class="ptk-history-top"><b>' + escapeHtml(timeText) + '</b><span>' + escapeHtml(editor) + (email ? ' · ' + escapeHtml(email) : '') + '</span></div>' +
          '<div class="ptk-history-meta">' +
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
    var el = $('ptk-fee-preview');
    if (!el) return;
    var cfg;
    try { cfg = getFormConfig(); }
    catch (e) { cfg = state.config || DEFAULT_CONFIG; }
    var totalPct = totalPercentFee(cfg);
    var fixed = totalFixedFee(cfg);
    el.innerHTML =
      '<div class="ptk-stat-card"><span>Tổng phí %</span><b>' + formatPercent(totalPct) + '</b></div>' +
      '<div class="ptk-stat-card"><span>Phí cố định/đơn</span><b>' + formatVnd(fixed) + 'đ</b></div>' +
      '<div class="ptk-stat-card"><span>Chi phí khác</span><b>' + formatOtherCost(cfg) + '</b></div>' +
      '<div class="ptk-stat-card wide"><span>Công thức giá tối thiểu</span><b>P_min = ceil((T + ' + formatVnd(fixed) + ') / ' + (1 - totalPct / 100).toFixed(3) + ')</b></div>';
  }

  function renderDirectCalculator() {
    var result = $('ptk-direct-result');
    if (!result) return;
    var cfg;
    try { cfg = getFormConfig(); }
    catch (e) { result.innerHTML = '<div class="ptk-alert bad">' + escapeHtml(e.message) + '</div>'; return; }
    var base = toNumber($('ptk-direct-base') ? $('ptk-direct-base').value : 0);
    var testPrice = toNumber($('ptk-direct-selling') ? $('ptk-direct-selling').value : 0);
    if (!base) { result.innerHTML = '<div class="ptk-direct-empty">Nhập giá gốc cần thu về để tính nhanh giá bán tối thiểu.</div>'; return; }
    var marked = Math.round(base * (1 + cfg.markupPercent / 100));
    var minPrice = calcMinimumPrice(base, cfg);
    var netAtMin = calcNetRevenue(minPrice, cfg);
    var diffAtMin = netAtMin - base;
    var html =
      '<div class="ptk-direct-grid">' +
        '<div><span>Giá sau cộng ' + formatPercent(cfg.markupPercent) + '</span><b>' + formatVnd(marked) + 'đ</b></div>' +
        '<div><span>Giá bán tối thiểu</span><b>' + formatVnd(minPrice) + 'đ</b></div>' +
        '<div><span>Tiền về sau phí</span><b>' + formatVnd(netAtMin) + 'đ</b></div>' +
        '<div><span>Chênh lệch</span><b class="' + (diffAtMin >= 0 ? 'ok-text' : 'bad-text') + '">' + formatVnd(diffAtMin) + 'đ</b></div>' +
      '</div>';
    if (testPrice > 0) {
      var netTest = calcNetRevenue(testPrice, cfg);
      var diffTest = netTest - base;
      html += '<div class="ptk-test-box"><div><b>Kiểm tra giá bán nhập tay: ' + formatVnd(testPrice) + 'đ</b></div><div>Tiền về sau phí: <b>' + formatVnd(netTest) + 'đ</b></div><div>Chênh lệch so với giá gốc: <b class="' + (diffTest >= 0 ? 'ok-text' : 'bad-text') + '">' + formatVnd(diffTest) + 'đ</b></div><div class="' + (diffTest >= 0 ? 'ptk-alert ok' : 'ptk-alert bad') + '">' + (diffTest >= 0 ? 'ĐẠT - Thu về không thấp hơn giá gốc.' : 'KHÔNG ĐẠT - Giá này làm tiền về thấp hơn giá gốc.') + '</div></div>';
    }
    result.innerHTML = html;
  }

  function ensureXlsx() {
    if (typeof XLSX === 'undefined') throw new Error('Không tìm thấy thư viện XLSX. Kiểm tra dòng xlsx.full.min.js đã load trước price-setting-tiktok.js.');
  }

  function getCell(row, col) { return row && row[col] !== undefined ? row[col] : null; }

  function findHeaderColumn(row, variants) {
    var normalizedVariants = variants.map(normalizeHeader);
    for (var c = 0; c < (row || []).length; c++) {
      var h = normalizeHeader(row[c]);
      if (!h) continue;
      for (var i = 0; i < normalizedVariants.length; i++) {
        if (h === normalizedVariants[i]) return c;
      }
    }
    return -1;
  }

  function detectTiktokFormat(rows) {
    if (!rows || !rows.length) throw new Error('File không có dữ liệu.');
    var headerIndex = -1;
    var productIdCol = -1;
    var skuIdCol = -1;
    var priceCol = -1;
    var sellerSkuCol = -1;
    var productNameCol = -1;
    var variationCol = -1;
    for (var r = 0; r < Math.min(rows.length, 30); r++) {
      var row = rows[r] || [];
      var pCol = findHeaderColumn(row, ['product_id', 'ID sản phẩm']);
      var sCol = findHeaderColumn(row, ['sku_id', 'ID SKU']);
      var prCol = findHeaderColumn(row, ['price', 'Giá bán lẻ (Nội tệ)']);
      var ssCol = findHeaderColumn(row, ['seller_sku', 'SKU người bán']);
      if (pCol >= 0 && sCol >= 0 && prCol >= 0 && ssCol >= 0) {
        headerIndex = r;
        productIdCol = pCol;
        skuIdCol = sCol;
        priceCol = prCol;
        sellerSkuCol = ssCol;
        productNameCol = findHeaderColumn(row, ['product_name', 'Tên sản phẩm']);
        variationCol = findHeaderColumn(row, ['variation_value', 'Tùy chọn biến thể']);
        break;
      }
    }
    if (headerIndex < 0) throw new Error('Không tìm thấy các cột TikTok: ID Sản phẩm, ID SKU, Giá bán lẻ và SKU người bán.');
    var dataStartIndex = -1;
    for (var i = headerIndex + 1; i < rows.length; i++) {
      var dataRow = rows[i] || [];
      var productId = getCell(dataRow, productIdCol);
      var skuId = getCell(dataRow, skuIdCol);
      var price = toNumber(getCell(dataRow, priceCol));
      if (productId !== null && productId !== undefined && String(productId).trim() !== '' && skuId !== null && skuId !== undefined && String(skuId).trim() !== '' && price > 0) {
        dataStartIndex = i;
        break;
      }
    }
    if (dataStartIndex < 0) throw new Error('Không tìm thấy dòng sản phẩm hợp lệ trong file TikTok.');
    return {
      headerIndex: headerIndex,
      dataStartIndex: dataStartIndex,
      productIdCol: productIdCol,
      skuIdCol: skuIdCol,
      priceCol: priceCol,
      sellerSkuCol: sellerSkuCol,
      productNameCol: productNameCol,
      variationCol: variationCol
    };
  }

  function collectProducts(rows, meta) {
    var list = [];
    for (var i = meta.dataStartIndex; i < rows.length; i++) {
      var row = rows[i] || [];
      var productId = getCell(row, meta.productIdCol);
      var skuId = getCell(row, meta.skuIdCol);
      var price = toNumber(getCell(row, meta.priceCol));
      var hasProduct = productId !== null && productId !== undefined && String(productId).trim() !== '' && skuId !== null && skuId !== undefined && String(skuId).trim() !== '';
      if (hasProduct && price > 0) {
        list.push({
          rowIndex: i,
          row: row,
          productId: productId,
          skuId: skuId,
          productName: meta.productNameCol >= 0 ? getCell(row, meta.productNameCol) : '',
          variationName: meta.variationCol >= 0 ? getCell(row, meta.variationCol) : '',
          sellerSku: getCell(row, meta.sellerSkuCol),
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
      var skuId = getCell(row, meta.skuIdCol);
      var hasProduct = productId !== null && productId !== undefined && String(productId).trim() !== '' && skuId !== null && skuId !== undefined && String(skuId).trim() !== '';
      if (!hasProduct) continue;
      var sellerSkuRaw = getCell(row, meta.sellerSkuCol) || '';
      var sellerSku = normalizeProductCode(sellerSkuRaw);
      var priceItem = sellerSku ? bookMap[sellerSku] : null;
      var common = {
        rowIndex: i,
        row: row,
        productId: productId,
        skuId: skuId,
        productName: meta.productNameCol >= 0 ? getCell(row, meta.productNameCol) : '',
        variationName: meta.variationCol >= 0 ? getCell(row, meta.variationCol) : '',
        sellerSku: sellerSkuRaw
      };
      if (priceItem && Number(priceItem.price || 0) > 0) {
        matched.push(Object.assign({}, common, { basePrice: Number(priceItem.price || 0), companyCode: priceItem.code, companyPriceRow: priceItem.rowIndex }));
      } else {
        missing.push(Object.assign({}, common, { missingReason: sellerSku ? 'Không tìm thấy SKU người bán trong bảng giá công ty' : 'Dòng TikTok không có SKU người bán để đối chiếu' }));
      }
    }
    return { matched: matched, missing: missing };
  }

  function cloneWorkbook(workbook) {
    var wb = clone(workbook);
    if (!wb.Sheets || !workbook.Sheets) return wb;
    Object.keys(workbook.Sheets).forEach(function (sheetName) {
      if (!wb.Sheets[sheetName]) wb.Sheets[sheetName] = {};
      ['!cols', '!rows', '!merges', '!freeze', '!autofilter'].forEach(function (key) {
        if (workbook.Sheets[sheetName][key]) wb.Sheets[sheetName][key] = clone(workbook.Sheets[sheetName][key]);
      });
    });
    return wb;
  }

  function setSheetCellValue(sheet, rowIndex, colIndex, value) {
    var addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    var oldCell = sheet[addr] || {};
    sheet[addr] = Object.assign({}, oldCell, { t: 'n', v: Number(value || 0), w: String(Math.round(Number(value || 0))) });
  }

  function updatePriceWorkbook(fileState, useAppliedWarnings) {
    var cfg = state.config;
    var wb = cloneWorkbook(fileState.workbook);
    var sheet = wb.Sheets[fileState.sheetName];
    var meta = fileState.meta;
    var warningMap = {};
    if (useAppliedWarnings) (fileState.appliedWarningRowIndexes || []).forEach(function (rowIndex) { warningMap[rowIndex] = true; });
    fileState.products.forEach(function (p) {
      var marked = Math.round(p.basePrice * (1 + cfg.markupPercent / 100));
      var finalPrice = calcMinimumPrice(p.basePrice, cfg);
      var value = warningMap[p.rowIndex] ? finalPrice : marked;
      setSheetCellValue(sheet, p.rowIndex, meta.priceCol, value);
    });
    return wb;
  }

  function calculateFile(fileState) {
    var cfg = state.config;
    var percentFee = totalPercentFee(cfg);
    var fixedFee = totalFixedFee(cfg);
    var warningRowIndexes = [];
    var appliedWarningRowIndexes = fileState.appliedWarningRowIndexes || [];
    var discountRows = [[
      'Product_id (required)',
      'SKU_id (required)',
      'Deal Price (required)',
      'Total Purchase Limit (optional)\n1. Total Purchase Limit ≤ Stock\n2. Blank refers to no limit',
      'Buyer purchase limit（optional）\n1. 1 ≤ Buyer purchase limit ≤ 99\n2. Blank refers to no limit'
    ]];
    var checkRows = [[
      'STT','ID sản phẩm','ID SKU','Tên sản phẩm','SKU người bán','Giá gốc','Giá sau cộng %','Deal Price đề xuất','Tổng phí %','Tổng phí cố định','Tiền sàn thu %','Tiền về sau phí','Chênh lệch','Trạng thái','Cảnh báo','Đã áp dụng'
    ]];
    var summary = { total: fileState.products.length, ok: 0, fail: 0, warning: 0, applied: 0, minRequiredMarkup: 0 };
    var appliedMap = {};
    appliedWarningRowIndexes.forEach(function (rowIndex) { appliedMap[rowIndex] = true; });
    fileState.products.forEach(function (p, index) {
      var base = p.basePrice;
      var marked = Math.round(base * (1 + cfg.markupPercent / 100));
      var minPrice = calcMinimumPrice(base, cfg);
      var percentFeeValue = Math.round(minPrice * percentFee / 100);
      var net = calcNetRevenue(minPrice, cfg);
      var diff = net - base;
      var warning = [];
      var status = diff >= -0.0001 ? 'ĐẠT' : 'KHÔNG ĐẠT';
      var isWarning = false;
      if (status === 'ĐẠT') summary.ok += 1;
      else { summary.fail += 1; isWarning = true; warning.push('Tiền về thấp hơn giá gốc'); }
      if (minPrice > marked) { isWarning = true; warning.push('Deal Price tối thiểu cao hơn giá sau cộng ' + formatPercent(cfg.markupPercent)); }
      if (isWarning) { summary.warning += 1; warningRowIndexes.push(p.rowIndex); }
      if (appliedMap[p.rowIndex]) summary.applied += 1;
      var requiredMarkup = base > 0 ? ((minPrice / base) - 1) * 100 : 0;
      if (requiredMarkup > summary.minRequiredMarkup) summary.minRequiredMarkup = requiredMarkup;
      discountRows.push([p.productId, p.skuId, Math.round(minPrice), null, null]);
      checkRows.push([
        index + 1,
        p.productId,
        p.skuId,
        p.productName,
        p.sellerSku,
        Math.round(base),
        marked,
        Math.round(minPrice),
        percentFee / 100,
        fixedFee,
        percentFeeValue,
        Math.round(net * 100) / 100,
        Math.round(diff * 100) / 100,
        status,
        warning.join(' | '),
        appliedMap[p.rowIndex] ? 'Đã áp dụng' : ''
      ]);
    });
    (fileState.missingProducts || []).forEach(function (p, idx) {
      summary.warning += 1;
      checkRows.push([
        fileState.products.length + idx + 1,
        p.productId,
        p.skuId,
        p.productName,
        p.sellerSku,
        '', '', '', percentFee / 100, fixedFee, '', '', '', 'CHƯA TÍNH', 'Không tìm thấy SKU người bán trong bảng giá công ty', ''
      ]);
    });
    summary.missing = (fileState.missingProducts || []).length;
    summary.minRequiredMarkup = Math.ceil(summary.minRequiredMarkup * 10) / 10;
    fileState.discountRows = discountRows;
    fileState.checkRows = checkRows;
    fileState.warningRowIndexes = warningRowIndexes;
    fileState.summary = summary;
    fileState.priceWorkbook = updatePriceWorkbook(fileState, true);
  }

  function calculateAllFiles() {
    try {
      state.config = getFormConfig();
      if (!state.files.length) { showToast('Anh cần nhập ít nhất 1 file TikTok để tính giá.', 'error'); return; }
      state.files.forEach(calculateFile);
      renderFilesArea();
      showToast('Đã tính xong ' + state.files.length + ' file TikTok.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  function applyAllWarnings(fileId) {
    var fileState = getFile(fileId);
    if (!fileState) return;
    if (!fileState.summary) calculateFile(fileState);
    if (!fileState.warningRowIndexes || !fileState.warningRowIndexes.length) {
      showToast('File này không có sản phẩm cảnh báo để áp dụng.', 'success');
      return;
    }
    fileState.appliedWarningRowIndexes = fileState.warningRowIndexes.slice();
    calculateFile(fileState);
    renderFilesArea();
    showToast('Đã áp dụng tất cả sản phẩm cảnh báo cho file: ' + fileState.fileName, 'success');
  }

  function getFile(fileId) {
    for (var i = 0; i < state.files.length; i++) if (state.files[i].id === fileId) return state.files[i];
    return null;
  }

  function removeFile(fileId) {
    state.files = state.files.filter(function (f) { return f.id !== fileId; });
    renderFilesArea();
  }

  function chooseTikTokSheet(workbook) {
    if (workbook.Sheets && workbook.Sheets.Template) return 'Template';
    return workbook.SheetNames && workbook.SheetNames.length ? workbook.SheetNames[0] : '';
  }

  function readOneFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, { type: 'array', raw: true, cellDates: false, cellStyles: true, bookVBA: false });
          var sheetName = chooseTikTokSheet(workbook);
          var sheet = workbook.Sheets[sheetName];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
          var meta = detectTiktokFormat(rows);
          var products = collectProducts(rows, meta);
          if (!products.length) throw new Error('File ' + file.name + ' không có sản phẩm hợp lệ.');
          resolve({
            id: 'PTK_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            fileName: file.name,
            workbook: workbook,
            sheetName: sheetName,
            rows: rows,
            meta: meta,
            products: products,
            missingProducts: [],
            sourceMode: 'direct-base-price',
            appliedWarningRowIndexes: [],
            warningRowIndexes: [],
            priceWorkbook: null,
            discountRows: null,
            checkRows: null,
            summary: null
          });
        } catch (err) { reject(new Error('Lỗi đọc file TikTok ' + file.name + ': ' + err.message)); }
      };
      reader.onerror = function () { reject(new Error('Không đọc được file ' + file.name)); };
      reader.readAsArrayBuffer(file);
    });
  }

  function readOneTiktokFileWithCompanyPrice(file, priceBook) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, { type: 'array', raw: true, cellDates: false, cellStyles: true, bookVBA: false });
          var sheetName = chooseTikTokSheet(workbook);
          var sheet = workbook.Sheets[sheetName];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
          var meta = detectTiktokFormat(rows);
          var collected = collectProductsWithCompanyPrice(rows, meta, priceBook);
          if (!collected.matched.length && !collected.missing.length) throw new Error('File ' + file.name + ' không có sản phẩm hợp lệ.');
          resolve({
            id: 'PTK_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            fileName: file.name,
            workbook: workbook,
            sheetName: sheetName,
            rows: rows,
            meta: meta,
            products: collected.matched,
            missingProducts: collected.missing,
            sourceMode: 'company-price',
            companyPriceBookName: priceBook.fileName || 'Bảng giá công ty',
            companyPriceBookSavedAt: priceBook.savedAt || '',
            appliedWarningRowIndexes: [],
            warningRowIndexes: [],
            priceWorkbook: null,
            discountRows: null,
            checkRows: null,
            summary: null
          });
        } catch (err) { reject(new Error('Lỗi đọc file TikTok ' + file.name + ': ' + err.message)); }
      };
      reader.onerror = function () { reject(new Error('Không đọc được file ' + file.name)); };
      reader.readAsArrayBuffer(file);
    });
  }

  function handleFiles(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;
    ensureXlsx();
    renderProcessingMessage('Đang đọc và xử lý ' + files.length + ' file giá gốc TikTok...');
    Promise.all(files.map(readOneFile)).then(function (loaded) {
      var validFiles = loaded.filter(Boolean);
      state.config = getFormConfig();
      validFiles.forEach(function (item) { calculateFile(item); state.files.push(item); });
      renderFilesArea();
      showToast('Đã nhập và xử lý ' + validFiles.length + ' file TikTok. Bảng kiểm tra đã hiển thị bên dưới.', 'success');
      event.target.value = '';
    }).catch(function (e) { renderFilesArea(); showToast(e.message, 'error'); event.target.value = ''; });
  }

  function handleTiktokFilesFromCompany(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;
    if (!state.companyPriceBook || !state.companyPriceBook.map) {
      showToast('Anh cần có bảng giá công ty dùng chung trước. Nếu bên Shopee đã upload thì tải lại trang để đồng bộ Firebase.', 'error');
      event.target.value = '';
      return;
    }
    ensureXlsx();
    renderProcessingMessage('Đang đối chiếu SKU người bán và xử lý ' + files.length + ' file giá TikTok...');
    var queue = files.map(function (file) { return readOneTiktokFileWithCompanyPrice(file, state.companyPriceBook); });
    Promise.all(queue).then(function (loaded) {
      var validFiles = loaded.filter(Boolean);
      state.config = getFormConfig();
      validFiles.forEach(function (item) { calculateFile(item); state.files.push(item); });
      renderFilesArea();
      showToast('Đã nhập, đối chiếu và xử lý ' + validFiles.length + ' file TikTok. Bảng kiểm tra đã hiển thị bên dưới.', 'success');
      event.target.value = '';
    }).catch(function (e) { renderFilesArea(); showToast(e.message, 'error'); event.target.value = ''; });
  }

  function downloadWorkbook(wb, fileName) {
    ensureXlsx();
    XLSX.writeFile(wb, fileName);
  }

  function aoaToWorkbook(rows, sheetName) {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);
    autosizeColumns(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    return wb;
  }

  function autosizeColumns(ws, rows) {
    if (!rows || !rows.length) return;
    var maxCols = 0;
    rows.forEach(function (row) { if (row && row.length > maxCols) maxCols = row.length; });
    var cols = [];
    for (var c = 0; c < maxCols; c++) {
      var len = 10;
      for (var r = 0; r < Math.min(rows.length, 100); r++) {
        var value = rows[r] && rows[r][c] !== undefined && rows[r][c] !== null ? String(rows[r][c]) : '';
        if (value.length > len) len = Math.min(45, value.length + 2);
      }
      cols.push({ wch: len });
    }
    ws['!cols'] = cols;
  }

  function downloadPriceFile(fileId) {
    var f = getFile(fileId);
    if (!f) return;
    if (!f.summary) calculateFile(f);
    var name = safeName(f.fileName) + ' - GIA ' + formatPercent(state.config.markupPercent).replace('%', 'PCT') + ' TIKTOK ' + todayFileName() + '.xlsx';
    downloadWorkbook(f.priceWorkbook, name);
  }

  function downloadDiscountFile(fileId) {
    var f = getFile(fileId);
    if (!f) return;
    if (!f.summary) calculateFile(f);
    var name = safeName(f.fileName) + ' - CK TIKTOK ' + formatPercent(totalPercentFee(state.config)).replace('%', 'PCT') + '+' + totalFixedFee(state.config) + ' ' + todayFileName() + '.xlsx';
    downloadWorkbook(aoaToWorkbook(f.discountRows, 'Sheet1'), name);
  }

  function downloadCheckFile(fileId) {
    var f = getFile(fileId);
    if (!f) return;
    if (!f.summary) calculateFile(f);
    var name = safeName(f.fileName) + ' - KIEM TRA GIA TIKTOK ' + todayFileName() + '.xlsx';
    downloadWorkbook(aoaToWorkbook(f.checkRows, 'Kiem tra'), name);
  }

  function downloadAll(type) {
    if (!state.files.length) { showToast('Chưa có file để tải.', 'error'); return; }
    state.files.forEach(function (f) {
      if (!f.summary) calculateFile(f);
      if (type === 'price') downloadPriceFile(f.id);
      if (type === 'discount') downloadDiscountFile(f.id);
      if (type === 'check') downloadCheckFile(f.id);
    });
  }

  function renderProcessingMessage(message) {
    var el = $('ptk-files-area');
    if (!el) return;
    el.innerHTML = '<div class="ptk-processing-card"><div class="ptk-processing-spinner"></div><div><b>' + escapeHtml(message || 'Đang xử lý dữ liệu...') + '</b><span>Hệ thống đang đọc file, tính giá %, tạo Deal Price và dựng bảng kiểm tra.</span></div></div>';
  }

  function renderFilesArea() {
    var el = $('ptk-files-area');
    if (!el) return;
    if (!state.files.length) {
      el.innerHTML = '<div class="ptk-empty-state"><div class="ptk-empty-icon" aria-label="TikTok Shop"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="20" width="36" height="34" rx="8" fill="#111827"></rect><path d="M23 22c0-7 4-12 9-12s9 5 9 12" fill="none" stroke="#1a73e8" stroke-width="4" stroke-linecap="round"></path><path d="M36 25v17c0 6-4 10-10 10-5 0-9-3-9-8 0-5 4-8 9-8 1 0 2 .1 3 .5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"></path><path d="M36 25c3 5 7 7 12 7" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"></path></svg></div><b>Chưa có file TikTok nào</b><span>Chọn file TikTok ở khu vực phía trên để bắt đầu tính giá.</span></div>';
      return;
    }
    var html = '';
    state.files.forEach(function (f, index) {
      var s = f.summary;
      var summaryHtml = '';
      if (s) {
        summaryHtml = '<div class="ptk-file-summary"><span>Tổng: <b>' + formatVnd(s.total) + '</b></span><span>Đạt: <b class="ok-text">' + formatVnd(s.ok) + '</b></span><span>Cảnh báo: <b class="' + (s.warning ? 'bad-text' : 'ok-text') + '">' + formatVnd(s.warning) + '</b></span>' + (s.missing ? '<span>Chưa khớp mã: <b class="bad-text">' + formatVnd(s.missing) + '</b></span>' : '') + '<span>Đã áp dụng: <b>' + formatVnd(s.applied) + '</b></span><span>% cộng giá nên ≥ <b>' + formatPercent(s.minRequiredMarkup) + '</b></span></div>';
      } else {
        summaryHtml = '<div class="ptk-file-summary muted">Chưa tính giá.</div>';
      }
      html +=
        '<div class="ptk-file-card">' +
          '<div class="ptk-file-head">' +
            '<div>' +
              '<div class="ptk-file-index">File ' + (index + 1) + ' · TikTok Shop</div>' +
              '<div class="ptk-file-name">' + escapeHtml(f.fileName) + '</div>' +
              '<div class="ptk-file-meta">Sheet: <b>' + escapeHtml(f.sheetName) + '</b> · Sản phẩm tính được: <b>' + formatVnd(f.products.length) + '</b>' + (f.missingProducts && f.missingProducts.length ? ' · Chưa khớp mã: <b class="bad-text">' + formatVnd(f.missingProducts.length) + '</b>' : '') + '</div>' +
              (f.sourceMode === 'company-price' ? '<div class="ptk-file-meta">Giá gốc lấy từ bảng giá công ty: <b>' + escapeHtml(f.companyPriceBookName || '') + '</b></div>' : '') +
            '</div>' +
            '<button class="ptk-icon-btn" title="Xóa file" onclick="window.ptkTiktokRemoveFile(\'' + f.id + '\')">×</button>' +
          '</div>' +
          summaryHtml +
          renderCheckPreviewTable(f) +
          '<div class="ptk-file-actions">' +
            '<button class="ptk-btn secondary" onclick="window.ptkTiktokDownloadPriceFile(\'' + f.id + '\')">Tải file giá %</button>' +
            '<button class="ptk-btn secondary" onclick="window.ptkTiktokDownloadDiscountFile(\'' + f.id + '\')">Tải file chiết khấu</button>' +
            '<button class="ptk-btn secondary" onclick="window.ptkTiktokDownloadCheckFile(\'' + f.id + '\')">Tải file kiểm tra</button>' +
          '</div>' +
        '</div>';
    });
    el.innerHTML = html;
  }

  function renderCheckPreviewTable(f) {
    if (!f.summary || !f.checkRows) return '';
    var rows = f.checkRows.slice(1);
    if (!rows.length) return '';
    var warningRows = rows.filter(function (r) { return !!r[14]; });
    var normalRows = rows.filter(function (r) { return !r[14]; });
    var bodyRows = warningRows.concat(normalRows).slice(0, 60);
    var hiddenCount = Math.max(0, rows.length - bodyRows.length);
    var html =
      '<div class="ptk-check-wrap">' +
        '<div class="ptk-check-head">' +
          '<div><div class="ptk-section-small-title">Bảng kiểm tra sau khi xử lý</div><span>Cảnh báo được ưu tiên hiển thị đầu bảng. Dòng nào cần chỉnh sẽ có đề xuất áp dụng.</span></div>' +
          (f.warningRowIndexes && f.warningRowIndexes.length ? '<button class="ptk-btn warn ptk-small-btn" onclick="window.ptkTiktokApplyAllWarnings(\'' + f.id + '\')">Áp dụng tất cả đề xuất</button>' : '') +
        '</div>' +
        '<div class="ptk-table-scroll"><table class="ptk-table ptk-check-table"><colgroup><col style="width:54px"><col style="width:130px"><col style="width:130px"><col style="width:120px"><col style="width:100px"><col style="width:100px"><col style="width:105px"><col style="width:90px"><col style="width:260px"></colgroup><thead><tr><th>STT</th><th>ID SP</th><th>ID SKU</th><th>SKU người bán</th><th>Giá gốc</th><th>Giá %</th><th>Deal Price</th><th>Trạng thái</th><th>Cảnh báo / đề xuất</th></tr></thead><tbody>';
    bodyRows.forEach(function (r) {
      var noBase = r[5] === '' || r[5] === null || r[5] === undefined;
      var isBad = !!r[14];
      var suggestion = '';
      if (r[14]) {
        if (String(r[14]).indexOf('Deal Price') >= 0) suggestion = 'Đề xuất: bấm Áp dụng tất cả đề xuất để đưa Deal Price đề xuất vào file giá TikTok.';
        else if (String(r[14]).indexOf('Không tìm thấy') >= 0) suggestion = 'Đề xuất: kiểm tra lại SKU người bán/MÃ SP trong bảng giá công ty.';
        else suggestion = 'Đề xuất: kiểm tra lại cấu hình phí hoặc giá gốc.';
      }
      html +=
        '<tr class="' + (isBad ? 'ptk-row-warn' : '') + '">' +
          '<td>' + r[0] + '</td>' +
          '<td>' + escapeHtml(r[1] || '') + '</td>' +
          '<td>' + escapeHtml(r[2] || '') + '</td>' +
          '<td>' + escapeHtml(r[4] || '') + '</td>' +
          '<td class="num">' + (noBase ? '-' : formatVnd(r[5])) + '</td>' +
          '<td class="num">' + (noBase ? '-' : formatVnd(r[6])) + '</td>' +
          '<td class="num"><b>' + (noBase ? '-' : formatVnd(r[7])) + '</b></td>' +
          '<td class="' + (r[13] === 'ĐẠT' ? 'ok-text' : 'bad-text') + '"><b>' + escapeHtml(r[13] || '') + '</b></td>' +
          '<td>' + (r[14] ? '<div class="bad-text"><b>' + escapeHtml(r[14]) + '</b></div><div class="ptk-suggest-text">' + escapeHtml(suggestion) + '</div>' : '<span class="ok-text">Đạt, không cần áp dụng đề xuất.</span>') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    if (hiddenCount > 0) html += '<div class="ptk-table-note">Đang hiển thị 60 dòng đầu theo thứ tự ưu tiên cảnh báo. Tải file kiểm tra để xem đầy đủ ' + formatVnd(rows.length) + ' dòng.</div>';
    html += '</div>';
    return html;
  }

  function injectStyles() {
    if ($('ptk-modern-style-v8')) return;
    var css = document.createElement('style');
    css.id = 'ptk-modern-style-v8';
    css.textContent = `
      .ptk-shell{--ptk-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-family:var(--ptk-font)!important;color:#202124;font-size:14px;letter-spacing:0;line-height:1.45;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:geometricPrecision;font-synthesis:none;font-variant-ligatures:normal;}
      .ptk-shell *{font-family:var(--ptk-font)!important;text-rendering:geometricPrecision;font-synthesis:none;font-variant-ligatures:normal;}
      .ptk-shell b,.ptk-shell label,.ptk-shell th,.ptk-btn,.ptk-source-tab,.ptk-history-btn{font-weight:600!important;text-transform:none!important;letter-spacing:0!important;}
      .ptk-hero{background:linear-gradient(135deg,#e8f0fe,#f8fbff 55%,#e6f4ea);border:1px solid #dfe8fb;border-radius:16px;padding:15px 16px;margin-bottom:12px;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;}
      .ptk-hero h2{margin:0;color:#1a73e8;font-size:20px;line-height:1.25;font-weight:650;letter-spacing:-.01em;}
      .ptk-hero p{margin:8px 0 0;color:#5f6368;font-size:13.5px;line-height:1.55;}
      .ptk-version{background:#fff;border:1px solid #d2e3fc;color:#1a73e8;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:600;white-space:nowrap;}
      .ptk-panel{background:#fff;border:1px solid #e8eaed;border-radius:16px;padding:14px;box-shadow:0 6px 18px rgba(60,64,67,.05);margin-bottom:12px;}
      .ptk-panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
      .ptk-panel-title h3{margin:0;font-size:16px;line-height:1.3;font-weight:650;color:#202124;}
      .ptk-panel-title span{color:#5f6368;font-size:13px;}
      .ptk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;}
      .ptk-fee-grid{grid-template-columns:repeat(7,minmax(132px,1fr));overflow-x:auto;overflow-y:hidden;padding-bottom:4px;scrollbar-width:thin;}
      .ptk-fee-grid .ptk-field{min-width:132px;}
      .ptk-field{background:#f8f9fa;border:1px solid #edf0f3;border-radius:12px;padding:10px;}
      .ptk-field label{display:block;font-size:12px;color:#5f6368;font-weight:500;margin-bottom:7px;}
      .ptk-field input{width:100%;border:1px solid #dadce0!important;border-radius:9px!important;padding:9px 10px!important;background:#fff!important;color:#202124!important;font-size:14px!important;font-weight:500!important;outline:none!important;box-sizing:border-box;}
      .ptk-field input:focus{border-color:#1a73e8!important;box-shadow:0 0 0 3px rgba(26,115,232,.12)!important;}
      .ptk-actions,.ptk-file-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;}
      .ptk-btn{border:none;border-radius:11px;padding:10px 14px;font-size:14px;line-height:1.3;cursor:pointer;background:#1a73e8;color:#fff;transition:.18s ease;}
      .ptk-btn:hover{transform:translateY(-1px);filter:brightness(.98);box-shadow:0 4px 10px rgba(26,115,232,.18);}
      .ptk-btn.secondary{background:#fff;color:#1a73e8;border:1px solid #dfe8fb;}
      .ptk-btn.green{background:#1e8e3e;}.ptk-btn.warn{background:#fbbc04;color:#202124;}
      .ptk-icon-btn{width:34px;height:34px;border:none;border-radius:50%;background:#fce8e6;color:#d93025;font-size:18px;line-height:1;cursor:pointer;}
      .ptk-mini-danger{border:1px solid #f4b4ae;background:#fff;color:#d93025;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
      .ptk-stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin:14px 0 8px;}
      .ptk-stat-card{background:#f8fbff;border:1px solid #d2e3fc;border-radius:14px;padding:12px;}
      .ptk-stat-card span{display:block;font-size:13px;color:#5f6368;font-weight:500;margin-bottom:5px;}
      .ptk-stat-card b{display:block;color:#1a73e8;font-size:18px;}
      .ptk-stat-card.wide{grid-column:span 2;}
      .ptk-saved-info{font-size:13px;color:#5f6368;margin-top:8px;background:#f8f9fa;border:1px solid #e8eaed;border-radius:12px;padding:10px 12px;line-height:1.55;}
      .ptk-saved-row{display:flex;align-items:center;justify-content:space-between;gap:12px;}.ptk-saved-main{min-width:0;}
      .ptk-history-btn{margin-left:auto;flex-shrink:0;border:1px solid #d2e3fc;background:#fff;color:#1a73e8;border-radius:999px;padding:7px 11px;font-size:13px;cursor:pointer;white-space:nowrap;}
      .ptk-history-panel{margin-top:10px;background:#fff;border:1px solid #e8eaed;border-radius:12px;padding:10px;max-height:330px;overflow:auto;}
      .ptk-history-loading,.ptk-history-empty{color:#5f6368;font-size:12px;padding:8px;}
      .ptk-history-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:2px 2px 8px;border-bottom:1px solid #f1f3f4;margin-bottom:8px;}
      .ptk-history-list{display:grid;gap:8px;}.ptk-history-item{border:1px solid #f1f3f4;background:#fbfcff;border-radius:10px;padding:10px;}
      .ptk-history-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:7px;}.ptk-history-top span{text-align:right;color:#5f6368;}
      .ptk-history-meta{display:flex;flex-wrap:wrap;gap:6px;}.ptk-history-meta span{background:#fff;border:1px solid #e8eaed;border-radius:999px;padding:4px 8px;font-size:11px;color:#5f6368;}
      .ptk-upload{border:2px dashed #1a73e8;background:#f8fbff;border-radius:16px;padding:18px;text-align:center;cursor:pointer;transition:.18s ease;}
      .ptk-upload:hover{background:#e8f0fe;}.ptk-upload b{color:#1a73e8;font-size:15.5px;}.ptk-upload span{display:block;color:#5f6368;font-size:13px;margin-top:5px;}
      .ptk-direct-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;}.ptk-direct-grid>div,.ptk-test-box{background:#f8f9fa;border:1px solid #e8eaed;border-radius:14px;padding:12px;}
      .ptk-direct-grid span{display:block;font-size:11px;color:#5f6368;font-weight:600;margin-bottom:5px;}.ptk-direct-grid b{font-size:18px;color:#202124;}.ptk-direct-empty{background:#f8f9fa;color:#5f6368;border-radius:12px;padding:14px;font-size:13px;}.ptk-test-box{margin-top:12px;line-height:1.7;font-size:14px;}
      .ptk-alert{margin-top:8px;padding:9px 11px;border-radius:10px;font-weight:600;}.ptk-alert.ok{background:#e6f4ea;color:#137333;}.ptk-alert.bad{background:#fce8e6;color:#d93025;}
      .ptk-source-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}.ptk-source-tab{border:1px solid #d2e3fc;background:#fff;color:#1a73e8;border-radius:999px;padding:8px 12px;font-size:14px;cursor:pointer;transition:.18s ease;}.ptk-source-tab.active{background:#1a73e8;color:#fff;border-color:#1a73e8;box-shadow:0 4px 12px rgba(26,115,232,.16);}.ptk-source-body{display:none;}.ptk-source-body.active{display:block;}.ptk-company-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .ptk-company-status{margin:10px 0 12px;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.55;background:#f8f9fa;border:1px solid #e8eaed;color:#5f6368;}.ptk-company-status.ok{background:#e6f4ea;border-color:#ceead6;color:#137333;}.ptk-company-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}
      .ptk-dup-box{margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.72);border:1px solid rgba(19,115,51,.18);}.ptk-dup-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;max-height:96px;overflow:auto;}.ptk-dup-chip{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid rgba(19,115,51,.22);color:#137333;font-size:12px;font-weight:500;line-height:1.2;}
      .ptk-file-card{background:#fff;border:1px solid #e8eaed;border-radius:18px;padding:16px;margin-bottom:10px;box-shadow:0 5px 16px rgba(60,64,67,.04);}.ptk-file-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}.ptk-file-index{font-size:11px;color:#1a73e8;font-weight:600;}.ptk-file-name{margin-top:4px;color:#202124;font-weight:600;font-size:15.5px;}.ptk-file-meta{margin-top:5px;color:#5f6368;font-size:12px;}.ptk-file-summary{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px;}.ptk-file-summary span{background:#f8f9fa;border:1px solid #e8eaed;border-radius:999px;padding:7px 10px;font-size:13px;color:#5f6368;}.ptk-file-summary.muted{color:#5f6368;font-size:13px;}
      .ptk-check-wrap{margin-top:14px;}.ptk-check-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px;}.ptk-check-head span{display:block;color:#5f6368;font-size:12px;margin-top:3px;}.ptk-small-btn{padding:9px 14px;font-size:13px;border-radius:999px;white-space:nowrap;}.ptk-section-small-title{font-size:12px;color:#d93025;font-weight:600;margin-bottom:8px;}.ptk-suggest-text{color:#5f6368;font-size:12px;margin-top:4px;line-height:1.45;}.ptk-row-warn{background:#fff8e1;}.ptk-table-note{margin-top:8px;color:#5f6368;font-size:13px;background:#f8f9fa;border:1px solid #e8eaed;border-radius:10px;padding:8px 10px;}
      .ptk-table-scroll{overflow:auto;border:1px solid #e8eaed;border-radius:14px;max-height:360px;}.ptk-table{width:100%;border-collapse:collapse;min-width:900px;background:#fff;}.ptk-table th{position:sticky;top:0;background:#f5f5f5;color:#5f6368;font-size:12px;padding:9px;border-bottom:1px solid #dadce0;z-index:2;text-align:center;vertical-align:middle;}.ptk-table td{padding:8px 9px;border-bottom:1px solid #f1f3f4;color:#202124;font-size:13px;vertical-align:middle;text-align:center;word-break:break-word;}.ptk-table .num{text-align:center;font-weight:600;}.ptk-check-table{table-layout:fixed;}.ptk-check-table th:nth-child(9),.ptk-check-table td:nth-child(9){text-align:left;min-width:230px;}
      .ok-text{color:#137333!important;}.bad-text{color:#d93025!important;}.ptk-empty-state{text-align:center;padding:30px;color:#5f6368;background:#f8f9fa;border:1px dashed #dadce0;border-radius:18px;}.ptk-empty-state div{font-size:34px;margin-bottom:8px;}.ptk-empty-state b{display:block;color:#202124;margin-bottom:5px;}.ptk-empty-state span{font-size:14px;}.ptk-empty-state .ptk-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;margin:0 auto 8px;border-radius:14px;background:#fff;border:1px solid #d2e3fc;font-size:0;box-shadow:0 4px 12px rgba(26,115,232,.08);}.ptk-empty-state .ptk-empty-icon svg{display:block;width:44px;height:44px;}
      .ptk-processing-card{display:flex;align-items:center;gap:12px;background:#f8fbff;border:1px solid #d2e3fc;border-radius:16px;padding:16px;margin-bottom:12px;color:#1a73e8;}.ptk-processing-card b{display:block;font-size:15px;color:#1a73e8;}.ptk-processing-card span{display:block;margin-top:4px;font-size:13px;color:#5f6368;}.ptk-processing-spinner{width:26px;height:26px;border:3px solid #e8f0fe;border-top-color:#1a73e8;border-radius:50%;animation:ptkSpin .8s linear infinite;flex-shrink:0;}@keyframes ptkSpin{to{transform:rotate(360deg)}}
      .ptk-toast{display:none;position:fixed;left:50%;bottom:26px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:#202124;color:#fff;z-index:999999;font-size:14px;font-weight:600;}.ptk-toast.show{display:block;}.ptk-toast.success{background:#137333;}.ptk-toast.error{background:#d93025;}
      @media(max-width:768px){.ptk-shell{font-size:13px;}.ptk-hero{display:block;padding:14px;}.ptk-version{display:inline-block;margin-top:10px;max-width:100%;white-space:normal;word-break:break-word;}.ptk-panel{padding:13px;border-radius:15px;}.ptk-panel-title{display:block;}.ptk-panel-title span{display:block;margin-top:4px;}.ptk-grid{grid-template-columns:1fr;}.ptk-company-grid{grid-template-columns:1fr;}.ptk-source-tabs{display:grid;grid-template-columns:1fr;}.ptk-source-tab{width:100%;text-align:center;}.ptk-fee-grid{grid-template-columns:repeat(7,minmax(132px,1fr));overflow-x:auto;}.ptk-stat-card.wide{grid-column:span 1;}.ptk-actions,.ptk-file-actions{display:grid;grid-template-columns:1fr;}.ptk-btn{width:100%;min-height:40px;}.ptk-saved-row,.ptk-history-top,.ptk-file-head,.ptk-company-top{display:block;}.ptk-history-btn{width:100%;margin-top:8px;text-align:center;}.ptk-history-top span{display:block;text-align:left;margin-top:4px;}.ptk-upload{padding:16px;}.ptk-icon-btn,.ptk-mini-danger{margin-top:8px;}.ptk-table{min-width:760px;}}
      @media(max-width:420px){.ptk-hero h2{font-size:18px;}.ptk-version{display:none;}.ptk-panel-title h3{font-size:15px;}}
    `;
    document.head.appendChild(css);
  }

  function fieldHtml(id, label, value, type) {
    return '<div class="ptk-field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'number') + '" step="0.01" value="' + value + '"></div>';
  }

  function otherCostFieldHtml() {
    return '<div class="ptk-field"><label for="ptk-other-cost-value">Chi phí khác</label><input id="ptk-other-cost-value" type="text" inputmode="decimal" value="0" placeholder="0 hoặc 2%" title="Nhập số tiền nếu không có %, nhập 2% nếu tính theo phần trăm giá bán"></div>';
  }

  function renderUI() {
    var containerId = window.__NNV_PRICE_SETTING_TIKTOK_CONTAINER_ID__ || 'price-setting-tiktok-container';
    var container = $(containerId) || $('price-setting-container');
    if (!container) return;
    injectStyles();
    container.innerHTML =
      '<div class="ptk-shell">' +
        '<div class="ptk-hero"><div><h2>Thiết lập giá TikTok Shop</h2><p>Tạo file giá %, file chiết khấu Deal Price và kiểm tra tiền về theo cấu trúc file TikTok Shop.</p></div><div class="ptk-version">' + VERSION_MARKER + '</div></div>' +
        '<div class="ptk-panel">' +
          '<div class="ptk-panel-title"><h3>1. Cấu hình phí sàn TikTok</h3><span>Lưu xong sẽ áp dụng cho các lần tính tiếp theo</span></div>' +
          '<div class="ptk-grid ptk-fee-grid">' +
            fieldHtml('ptk-markup-percent', 'Tỷ lệ cộng giá (%)', DEFAULT_CONFIG.markupPercent) +
            fieldHtml('ptk-commission-fee-percent', 'Phí hoa hồng nền tảng (%)', DEFAULT_CONFIG.commissionFeePercent) +
            fieldHtml('ptk-transaction-fee-percent', 'Phí giao dịch (%)', DEFAULT_CONFIG.transactionFeePercent) +
            fieldHtml('ptk-voucher-extra-percent', 'Voucher Extra (%)', DEFAULT_CONFIG.voucherExtraPercent) +
            fieldHtml('ptk-order-processing-fee', 'Phí xử lý đơn hàng (đ)', DEFAULT_CONFIG.orderProcessingFee) +
            otherCostFieldHtml() +
            fieldHtml('ptk-rounding-step', 'Làm tròn lên bội số', DEFAULT_CONFIG.roundingStep) +
          '</div>' +
          '<div class="ptk-stat-row" id="ptk-fee-preview"></div>' +
          '<div class="ptk-saved-info" id="ptk-saved-info"></div>' +
          '<div class="ptk-actions"><button class="ptk-btn green" id="ptk-save-config">Lưu cấu hình</button><button class="ptk-btn secondary" id="ptk-toggle-direct" type="button">Tính nhanh 1 sản phẩm</button></div>' +
          '<div id="ptk-direct-body" class="ptk-direct-body" style="display:none; margin-top:14px;">' +
            '<div class="ptk-panel-title"><div><h3>Tính nhanh 1 sản phẩm</h3><span>Kiểm tra nhanh giá bán tối thiểu theo cấu hình phí hiện tại</span></div></div>' +
            '<div class="ptk-grid">' + fieldHtml('ptk-direct-base', 'Giá gốc cần thu về', '') + fieldHtml('ptk-direct-selling', 'Giá bán muốn kiểm tra', '') + '</div>' +
            '<div id="ptk-direct-result" style="margin-top:12px;"></div>' +
          '</div>' +
        '</div>' +
        '<div class="ptk-panel">' +
          '<div class="ptk-panel-title"><h3>2. Nhập dữ liệu TikTok</h3><span>Chọn cách lấy giá gốc để hệ thống tính Deal Price</span></div>' +
          '<div class="ptk-source-tabs"><button type="button" class="ptk-source-tab active" id="ptk-source-tab-original">Nhập file giá gốc TikTok</button><button type="button" class="ptk-source-tab" id="ptk-source-tab-company">Nhập file giá TikTok</button></div>' +
          '<div class="ptk-source-body active" id="ptk-source-body-original"><div class="ptk-upload" id="ptk-upload-zone-original"><b>Chọn file giá gốc TikTok Shop</b><span>File TikTok có cột Giá bán lẻ đang là giá gốc cần thu về · Hỗ trợ .xlsx, .xls, .csv</span><input type="file" id="ptk-file-input-original" accept=".xlsx,.xls,.csv" multiple style="display:none;"></div></div>' +
          '<div class="ptk-source-body" id="ptk-source-body-company"><div id="ptk-company-price-status"></div><div class="ptk-company-grid"><div class="ptk-upload" id="ptk-company-price-zone"><b>1. Upload bảng giá công ty dùng chung</b><span>Dùng chung với Shopee. Cần có cột MÃ SP và GIÁ ND SAU THUẾ. Nếu Shopee đã upload rồi thì không cần upload lại.</span><input type="file" id="ptk-company-price-input" accept=".xlsx,.xls,.csv" multiple style="display:none;"></div><div class="ptk-upload" id="ptk-tiktok-price-zone"><b>2. Upload file giá TikTok tải từ sàn</b><span>Hệ thống lấy SKU người bán đối chiếu MÃ SP trong bảng giá công ty dùng chung để thay giá gốc bằng GIÁ ND SAU THUẾ.</span><input type="file" id="ptk-tiktok-price-input" accept=".xlsx,.xls,.csv" multiple style="display:none;"></div></div></div>' +
          '<div class="ptk-actions"><button class="ptk-btn" id="ptk-calc-all">Tính giá tất cả file</button><button class="ptk-btn secondary" id="ptk-download-all-price">Tải tất cả file giá %</button><button class="ptk-btn secondary" id="ptk-download-all-discount">Tải tất cả file chiết khấu</button><button class="ptk-btn secondary" id="ptk-download-all-check">Tải tất cả file kiểm tra</button></div>' +
        '</div>' +
        '<div id="ptk-files-area"></div><div id="ptk-toast" class="ptk-toast"></div>' +
      '</div>';
    bindUI();
    applyConfigToForm(state.config);
    renderFilesArea();
  }

  function bindUI() {
    ['ptk-markup-percent','ptk-commission-fee-percent','ptk-transaction-fee-percent','ptk-voucher-extra-percent','ptk-order-processing-fee','ptk-other-cost-value','ptk-rounding-step'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () { renderFeePreview(); renderDirectCalculator(); });
    });
    var otherCostInput = $('ptk-other-cost-value');
    if (otherCostInput) otherCostInput.addEventListener('input', syncOtherCostInputHint);
    ['ptk-direct-base','ptk-direct-selling'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', renderDirectCalculator);
    });
    var toggleDirect = $('ptk-toggle-direct');
    if (toggleDirect) toggleDirect.onclick = function () {
      var body = $('ptk-direct-body');
      if (!body) return;
      var open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      toggleDirect.innerText = open ? 'Tính nhanh 1 sản phẩm' : 'Thu gọn tính nhanh';
      if (!open) renderDirectCalculator();
    };
    var saveBtn = $('ptk-save-config');
    if (saveBtn) saveBtn.onclick = saveConfig;

    function activateSourceTab(mode) {
      var originalTab = $('ptk-source-tab-original');
      var companyTab = $('ptk-source-tab-company');
      var originalBody = $('ptk-source-body-original');
      var companyBody = $('ptk-source-body-company');
      if (originalTab) originalTab.classList.toggle('active', mode === 'original');
      if (companyTab) companyTab.classList.toggle('active', mode === 'company');
      if (originalBody) originalBody.classList.toggle('active', mode === 'original');
      if (companyBody) companyBody.classList.toggle('active', mode === 'company');
      if (mode === 'company') renderCompanyPriceStatus();
    }

    var originalTab = $('ptk-source-tab-original');
    var companyTab = $('ptk-source-tab-company');
    if (originalTab) originalTab.onclick = function () { activateSourceTab('original'); };
    if (companyTab) companyTab.onclick = function () { activateSourceTab('company'); };

    var originalZone = $('ptk-upload-zone-original');
    var originalInput = $('ptk-file-input-original');
    if (originalZone && originalInput) { originalZone.onclick = function () { originalInput.click(); }; originalInput.onchange = handleFiles; }

    var companyZone = $('ptk-company-price-zone');
    var companyInput = $('ptk-company-price-input');
    if (companyZone && companyInput) { companyZone.onclick = function () { companyInput.click(); }; companyInput.onchange = handleCompanyPriceFile; }

    var tiktokZone = $('ptk-tiktok-price-zone');
    var tiktokInput = $('ptk-tiktok-price-input');
    if (tiktokZone && tiktokInput) { tiktokZone.onclick = function () { tiktokInput.click(); }; tiktokInput.onchange = handleTiktokFilesFromCompany; }

    renderCompanyPriceStatus();

    var calcBtn = $('ptk-calc-all');
    if (calcBtn) calcBtn.onclick = calculateAllFiles;
    var allPrice = $('ptk-download-all-price');
    if (allPrice) allPrice.onclick = function () { downloadAll('price'); };
    var allDiscount = $('ptk-download-all-discount');
    if (allDiscount) allDiscount.onclick = function () { downloadAll('discount'); };
    var allCheck = $('ptk-download-all-check');
    if (allCheck) allCheck.onclick = function () { downloadAll('check'); };
  }

  window.ptkTiktokApplyAllWarnings = applyAllWarnings;
  window.ptkTiktokRemoveFile = removeFile;
  window.ptkTiktokDownloadPriceFile = downloadPriceFile;
  window.ptkTiktokDownloadDiscountFile = downloadDiscountFile;
  window.ptkTiktokDownloadCheckFile = downloadCheckFile;

  window.initPriceSettingTiktokModule = function (containerId) {
    window.__NNV_PRICE_SETTING_TIKTOK_CONTAINER_ID__ = containerId || 'price-setting-tiktok-container';
    state.config = Object.assign({}, DEFAULT_CONFIG, loadLocalConfig() || {});
    state.companyPriceBook = loadCompanyPriceBook();
    renderUI();
    attachCompanyPriceRealtimeSync();
    loadRemoteCompanyPriceBook().then(function (remoteBook) {
      if (remoteBook && remoteBook.map) {
        state.companyPriceBook = remoteBook;
        saveCompanyPriceBook(remoteBook);
        renderCompanyPriceStatus();
      } else {
        state.companyPriceBook = null;
        saveCompanyPriceBook(null);
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
    return true;
  };

  window.NNV_PRICE_SETTING_TIKTOK_MARKER = VERSION_MARKER;
})();
