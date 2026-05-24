/* PRICE_SETTING_SHOPEE_MODULE_ONLY_V12_20260524
 * FILE RIÊNG CHO SHOPEE. Không render tab. Không chứa TikTok Shop.
 * NNV Marketing System - TMĐT > Thiết lập giá > Shopee
 * Version: V12 Shopee Module Only + Chi phí khác dạng tab nhỏ + giữ ô phí cùng một hàng
 */
(function () {
  "use strict";

  var VERSION_MARKER = "PRICE_SETTING_SHOPEE_MODULE_ONLY_V12_20260524";
  var MODULE_KEY = "NNV_PRICE_SETTING_SHOPEE_V6_CONFIG";
  var MODULE_HISTORY_KEY = "NNV_PRICE_SETTING_SHOPEE_V12_HISTORY";
  var FIREBASE_PATH = "system_settings/ecom_price_setting/shopee";
  var FIREBASE_HISTORY_PATH = "system_settings/ecom_price_setting_history/shopee";

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
    activeFileId: null
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
    var cfg = {
      markupPercent: toNumber($("ps-markup-percent") ? $("ps-markup-percent").value : DEFAULT_CONFIG.markupPercent),
      fixedFeePercent: toNumber($("ps-fixed-fee-percent") ? $("ps-fixed-fee-percent").value : DEFAULT_CONFIG.fixedFeePercent),
      transactionFeePercent: toNumber($("ps-transaction-fee-percent") ? $("ps-transaction-fee-percent").value : DEFAULT_CONFIG.transactionFeePercent),
      voucherXtraPercent: toNumber($("ps-voucher-xtra-percent") ? $("ps-voucher-xtra-percent").value : DEFAULT_CONFIG.voucherXtraPercent),
      infrastructureFee: toNumber($("ps-infrastructure-fee") ? $("ps-infrastructure-fee").value : DEFAULT_CONFIG.infrastructureFee),
      pishipFee: toNumber($("ps-piship-fee") ? $("ps-piship-fee").value : DEFAULT_CONFIG.pishipFee),
      otherCostType: $("ps-other-cost-type") ? $("ps-other-cost-type").value : DEFAULT_CONFIG.otherCostType,
      otherCostValue: toNumber($("ps-other-cost-value") ? $("ps-other-cost-value").value : DEFAULT_CONFIG.otherCostValue),
      roundingStep: toNumber($("ps-rounding-step") ? $("ps-rounding-step").value : DEFAULT_CONFIG.roundingStep),
      appliedSince: new Date().toISOString(),
      updatedBy: getCurrentEditor().name,
      updatedByEmail: getCurrentEditor().email
    };

    if (cfg.otherCostType !== "amount" && cfg.otherCostType !== "percent") cfg.otherCostType = "amount";
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
      "ps-other-cost-value": cfg.otherCostValue,
      "ps-rounding-step": cfg.roundingStep
    };

    Object.keys(map).forEach(function (id) {
      var el = $(id);
      if (el) el.value = map[id];
    });

    var otherType = $("ps-other-cost-type");
    if (otherType) otherType.value = cfg.otherCostType || "amount";
    syncOtherCostTabs();

    renderFeePreview();
    renderSavedInfo(cfg);
    renderDirectCalculator();
  }

  function syncOtherCostTabs() {
    var hidden = $("ps-other-cost-type");
    var type = hidden ? (hidden.value || "amount") : "amount";
    var tabs = document.querySelectorAll(".ps-other-cost-tab");
    for (var i = 0; i < tabs.length; i++) {
      var btn = tabs[i];
      var active = btn.getAttribute("data-other-cost-type") === type;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    var input = $("ps-other-cost-value");
    if (input) {
      input.placeholder = type === "percent" ? "0" : "0";
      input.title = type === "percent" ? "Nhập chi phí khác theo % giá bán" : "Nhập chi phí khác theo số tiền/đơn";
    }
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
        showToast("Anh cần nhập ít nhất 1 file giá gốc Shopee.", "error");
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

    var queue = files.map(function (file) {
      return readOneFile(file);
    });

    Promise.all(queue).then(function (loaded) {
      loaded.forEach(function (item) {
        if (item) state.files.push(item);
      });
      renderFilesArea();
      showToast("Đã nhập " + loaded.filter(Boolean).length + " file.", "success");
      event.target.value = "";
    }).catch(function (e) {
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

  function renderFilesArea() {
    var el = $("ps-files-area");
    if (!el) return;

    if (!state.files.length) {
      el.innerHTML =
        '<div class="ps-empty-state">' +
          '<div>📦</div>' +
          '<b>Chưa có file Shopee nào</b>' +
          '<span>Thông thường anh có thể nhập cùng lúc 4 file cho 4 công ty.</span>' +
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
            '<span>Đã áp dụng: <b>' + formatVnd(s.applied) + '</b></span>' +
            '<span>% cộng giá nên ≥ <b>' + formatPercent(s.minRequiredMarkup) + '</b></span>' +
          '</div>';
      } else {
        summaryHtml = '<div class="ps-file-summary muted">Chưa tính giá.</div>';
      }

      var warningButton = "";
      if (s && s.warning > 0) {
        warningButton =
          '<button class="ps-btn warn" onclick="window.psShopeeApplyAllWarnings(\'' + f.id + '\')">Áp dụng tất cả sản phẩm cảnh báo</button>';
      }

      html +=
        '<div class="ps-file-card">' +
          '<div class="ps-file-head">' +
            '<div>' +
              '<div class="ps-file-index">File ' + (index + 1) + ' · Shopee</div>' +
              '<div class="ps-file-name">' + escapeHtml(f.fileName) + '</div>' +
              '<div class="ps-file-meta">Sheet: <b>' + escapeHtml(f.sheetName) + '</b> · Sản phẩm: <b>' + formatVnd(f.products.length) + '</b></div>' +
            '</div>' +
            '<button class="ps-icon-btn" title="Xóa file" onclick="window.psShopeeRemoveFile(\'' + f.id + '\')">×</button>' +
          '</div>' +
          summaryHtml +
          renderWarningsTable(f) +
          '<div class="ps-file-actions">' +
            '<button class="ps-btn secondary" onclick="window.psShopeeDownloadPriceFile(\'' + f.id + '\')">Tải file giá %</button>' +
            '<button class="ps-btn secondary" onclick="window.psShopeeDownloadDiscountFile(\'' + f.id + '\')">Tải file chiết khấu</button>' +
            '<button class="ps-btn secondary" onclick="window.psShopeeDownloadCheckFile(\'' + f.id + '\')">Tải file kiểm tra</button>' +
            warningButton +
          '</div>' +
        '</div>';
    });

    el.innerHTML = html;
  }

  function renderWarningsTable(f) {
    if (!f.summary || !f.checkRows || !f.summary.warning) {
      return "";
    }

    var bodyRows = f.checkRows.slice(1).filter(function (r) {
      return r[13];
    }).slice(0, 30);

    if (!bodyRows.length) return "";

    var html =
      '<div class="ps-warning-wrap">' +
        '<div class="ps-section-small-title">Sản phẩm cảnh báo</div>' +
        '<div class="ps-table-scroll">' +
          '<table class="ps-table">' +
            '<thead><tr>' +
              '<th>STT</th><th>SKU</th><th>Giá gốc</th><th>Giá %</th><th>Giá tối thiểu</th><th>Tiền về</th><th>Cảnh báo</th>' +
            '</tr></thead><tbody>';

    bodyRows.forEach(function (r) {
      html +=
        '<tr>' +
          '<td>' + r[0] + '</td>' +
          '<td>' + escapeHtml(r[3] || "") + '</td>' +
          '<td class="num">' + formatVnd(r[4]) + '</td>' +
          '<td class="num">' + formatVnd(r[5]) + '</td>' +
          '<td class="num"><b>' + formatVnd(r[6]) + '</b></td>' +
          '<td class="num">' + formatVnd(r[10]) + '</td>' +
          '<td class="bad-text">' + escapeHtml(r[13]) + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div></div>';
    return html;
  }

  function injectStyles() {
    if ($("ps-modern-style-v11")) return;

    var css = document.createElement("style");
    css.id = "ps-modern-style-v11";
    css.textContent = `
      .ps-shell{
        font-family:"Segoe UI","Noto Sans",Arial,"Helvetica Neue",sans-serif;
        color:#202124;
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
      .ps-field select{cursor:pointer;appearance:auto;font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif!important;}
      .ps-other-cost-row{display:grid;grid-template-columns:1fr;gap:7px;align-items:center;}
      .ps-other-cost-tabs{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:4px;
        background:#edf2f7;
        border:1px solid #dfe5ee;
        border-radius:9px;
        padding:3px;
      }
      .ps-other-cost-tab{
        border:none;
        background:transparent;
        color:#5f6368;
        border-radius:7px;
        padding:7px 6px;
        font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;
        font-size:11.5px;
        font-weight:600;
        line-height:1.2;
        cursor:pointer;
        white-space:nowrap;
      }
      .ps-other-cost-tab.active{
        background:#fff;
        color:#1a73e8;
        box-shadow:0 1px 4px rgba(60,64,67,.12);
      }
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
        font-family:"Segoe UI","Noto Sans",Arial,"Helvetica Neue",sans-serif;
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
        font-family:"Segoe UI","Noto Sans",Arial,"Helvetica Neue",sans-serif;
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
      .ps-warning-wrap{
        margin-top:14px;
      }
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
      }
      .ps-table td{
        padding:8px 9px;
        border-bottom:1px solid #f1f3f4;
        color:#202124;
        font-size:12px;
      }
      .ps-table .num{
        text-align:right;
        font-weight:700;
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
        .ps-fee-grid{grid-template-columns:repeat(8,minmax(132px,1fr));overflow-x:auto;}
        .ps-other-cost-row{grid-template-columns:1fr;}
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
      '<div class="ps-field ps-field-combo">' +
        '<label>Chi phí khác</label>' +
        '<div class="ps-other-cost-row">' +
          '<div class="ps-other-cost-tabs" role="tablist" aria-label="Chọn loại chi phí khác">' +
            '<button type="button" class="ps-other-cost-tab active" data-other-cost-type="amount" role="tab" aria-selected="true">Số tiền</button>' +
            '<button type="button" class="ps-other-cost-tab" data-other-cost-type="percent" role="tab" aria-selected="false">% giá bán</button>' +
          '</div>' +
          '<input id="ps-other-cost-value" type="number" step="0.01" value="0" placeholder="0">' +
          '<input id="ps-other-cost-type" type="hidden" value="amount">' +
        '</div>' +
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
            '<h3>2. Nhập file giá gốc Shopee</h3>' +
            '<span>Có thể chọn nhiều file cùng lúc</span>' +
          '</div>' +
          '<div class="ps-upload" id="ps-upload-zone">' +
            '' +
            '<b>Chọn file giá gốc Shopee</b>' +
            '<span>Hỗ trợ .xlsx, .xls, .csv · Có thể chọn nhiều file cùng lúc</span>' +
            '<input type="file" id="ps-file-input" accept=".xlsx,.xls,.csv" multiple style="display:none;">' +
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
      "ps-other-cost-type",
      "ps-rounding-step"
    ];

    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", function () {
        renderFeePreview();
        renderDirectCalculator();
      });
    });

    var otherTabs = document.querySelectorAll(".ps-other-cost-tab");
    for (var i = 0; i < otherTabs.length; i++) {
      otherTabs[i].addEventListener("click", function () {
        var type = this.getAttribute("data-other-cost-type") || "amount";
        var hidden = $("ps-other-cost-type");
        if (hidden) hidden.value = type;
        syncOtherCostTabs();
        renderFeePreview();
        renderDirectCalculator();
      });
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


    var zone = $("ps-upload-zone");
    var input = $("ps-file-input");
    if (zone && input) {
      zone.onclick = function () {
        input.click();
      };
      input.onchange = handleFiles;
    }

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
    renderUI();

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
