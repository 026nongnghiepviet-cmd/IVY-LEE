/**

 * ADS MODULE V137 META LIVE (NGÂN SÁCH NHÓM TẮT LẤY LẦN GẦN NHẤT)

 * - FIX LỖI SẬP CHART: Loại bỏ plugin gây trắng Tab 3.

 * - FIX LỖI POPUP: Thêm hàm escapeHtml bọc thép dữ liệu chống gãy Layout khi click.

 * - LOGIC: Mốc Máy Học 500k. ROAS > 5 là kim bài miễn tử / không được tắt. Dưới 500k chỉ TEST TỐT khi đạt đủ 4/4 tiêu chí.

 * - Gộp cột Giá Tin và Giá Đơn (CPA) đồng bộ trên tất cả các bảng.
 * - Tài chính lấy chi phí gốc, lượt mua và chỉ số hiệu quả trực tiếp từ Meta Live.
 * - V138: Tài chính/Báo cáo MKT dùng Meta Live + doanh thu mới nhất + sao kê mới nhất; file chi phí cũ chỉ giữ lịch sử.
 * - V139: Bộ lọc ngày và kỳ báo cáo mặc định từ ngày 01 đến hôm nay; tự chuyển tháng mới khi người dùng chưa chọn kỳ riêng.
 * - Nhóm còn chạy chỉ cộng ngân sách các nhóm đang chạy; nhóm tắt toàn bộ chỉ lấy ngân sách của nhóm tắt gần nhất, không cộng dồn các nhóm trùng.
 * - V144: Riêng ROAS tổng theo Chiến dịch/Nhân sự chỉ cộng ngân sách các nhóm sau gom đang chạy; nếu tắt hết hiển thị Đã tắt.
 * - V145: Bấm toàn bộ ô Kỳ báo cáo để mở lịch; thêm tab Tổng quan/Marketing cho bảng Meta Live và Tài chính.
 * - V146: Bỏ bộ chọn kỳ riêng trong Báo cáo MKT; toàn bộ báo cáo chỉ dùng bộ lọc chung phía trên.
 * - V147: Hiển thị toàn bộ nhóm/bài đã thiết lập dù chưa có Insights; đồng bộ trạng thái và đánh dấu hàng chưa phát sinh dữ liệu.
 * - V148: Tách nhóm chưa phát sinh thành hàng riêng ở cấp nhóm; bổ sung nhóm còn thiếu từ quan hệ bài quảng cáo → nhóm quảng cáo.
 * - V149: Thêm khối Hoạt động quảng cáo riêng dưới Báo cáo MKT trong sidebar, cập nhật trực tiếp theo trạng thái nhóm/bài từ Meta.
 * - V150: Thêm chuyển động nhẹ cho các chấm trạng thái xanh tại Hệ thống hoạt động, Hoạt động quảng cáo và Nguồn hiệu quả.
 * - V151: Đồng bộ trạng thái giao hàng sát Ads Manager; ACTIVE chưa phân phối hiển thị Đang chuẩn bị; loại nhóm hết kỳ khỏi tháng mới.
 * - V152: Hoạt động quảng cáo lưu dòng thời gian chuyển trạng thái riêng cho từng nhóm/bài và hiển thị đúng thời điểm từng trạng thái.
 * - V154: Dọn trạng thái Không xác định cũ; bài/nhóm không còn trên Meta được nhận diện Đã xóa và không xuất hiện trong Hoạt động quảng cáo.
 * - V155: Responsive toàn diện cho tablet/mobile; xuất Báo cáo MKT dạng workbook sạch, loại nút, bộ lọc, icon và ký tự điều khiển.
 * - V156: Bỏ cột Đánh giá Campaign; mặc định ROAS giảm dần; xuất ROAS tổng không kèm bài con; cập nhật bảng năng lực nhân sự và làm nổi bật ROAS.

 */



if (!window.EXCEL_STYLE_LOADED) {

    const script = document.createElement('script');

    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';

    script.onload = () => { window.EXCEL_STYLE_LOADED = true; };

    document.head.appendChild(script);

    window.EXCEL_STYLE_LOADED = 'loading';

}



if (!window.CHART_JS_LOADED) {

    const script = document.createElement('script');

    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';

    script.onload = () => { 

        window.CHART_JS_LOADED = true; 

        if(typeof applyFilters === 'function') applyFilters();

    };

    document.head.appendChild(script);

    window.CHART_JS_LOADED = 'loading';

}



let db;



function getDatabase() {

    if (!db && typeof firebase !== 'undefined' && firebase.apps.length > 0) {

        db = firebase.database();

    }

    return db;

}



const COMPANIES = [

    { id: 'NNV', name: 'Nông Nghiệp Việt', keywords: ['nông nghiệp việt', 'nong nghiep viet', 'nnv'] },

    { id: 'VN', name: 'Việt Nhật', keywords: ['việt nhật', 'viet nhat', 'hóa nông việt nhật'] },

    { id: 'KF', name: 'King Farm', keywords: ['king farm', 'kingfarm', 'kf'] },

    { id: 'ABC', name: 'ABC Việt Nam', keywords: ['abc', 'abc việt nam'] }

];



let GLOBAL_ADS_DATA = [];

let GLOBAL_HISTORY_LIST = [];

let GLOBAL_EXPORT_LIST = []; 



let RAW_UPLOAD_LOGS = {};

let RAW_EXPORT_LOGS = {};



let CURRENT_FILTERED_DATA = []; 

let SHOW_ALL_HISTORY = false;

let HISTORY_SEARCH_TERM = "";



let ACTIVE_BATCH_ID = null;

let CURRENT_TAB = 'performance'; 

let CURRENT_COMPANY = 'NNV'; 

let USER_EXPLICIT_VIEW_ALL = false; 



let VIEW_MODE = 'employee'; 

let SORT_MODE = 'spend'; 

let REPORT_MONTH = ''; // YYYY-MM, lọc theo tháng báo cáo

let DATE_FROM = '';

let DATE_TO = '';

// V145: phạm vi hiển thị riêng cho hai bảng Meta Live và Tài chính.
// overview = toàn bộ dữ liệu; marketing = chỉ chiến dịch/nhóm có chữ marketing.
let META_LIVE_DATA_SCOPE = 'overview';
let FINANCE_DATA_SCOPE = 'overview';

// V139: mặc định luôn xem từ ngày 01 của tháng hiện tại đến hôm nay.
// Khi người dùng chủ động đổi kỳ, hệ thống giữ nguyên lựa chọn đó.
let PERIOD_FILTER_USER_CHANGED = false;
let PERIOD_DEFAULT_SIGNATURE = '';
let PERIOD_DEFAULT_WATCH_TIMER = null;

// =========================================================
// META LIVE SMART SEARCH V135
// - Gõ tới đâu lọc bảng tới đó.
// - Gợi ý ưu tiên: Tên chiến dịch → Nhóm quảng cáo → Ngân sách → Trạng thái.
// - Tab/Enter chọn gợi ý, Backspace xóa thẻ gần nhất.
// =========================================================
let META_LIVE_SEARCH_QUERY = '';
let META_LIVE_SEARCH_TOKENS = [];
let META_LIVE_SEARCH_SUGGESTIONS = [];
let META_LIVE_SEARCH_ACTIVE_INDEX = 0;
let META_LIVE_SEARCH_OPEN = false;
let META_LIVE_SEARCH_RESULT_COUNT = 0;


// =========================================================
// META LIVE V134 — GỢI Ý GẦN ĐÚNG CHỈ CHO CHIẾN DỊCH/NHÓM + LỌC NGÂN SÁCH THEO TỪNG CHỮ SỐ
// - Một tab trình duyệt được bầu làm leader cho từng công ty/khoảng ngày.
// - Chỉ leader gọi Apps Script / Meta rồi ghi đè snapshot Firebase.
// - Các máy còn lại chỉ nghe snapshot thời gian thực.
// - Không lưu lịch sử từng lần đồng bộ.
// - Tài chính/Báo cáo MKT dùng Meta Live + nguồn doanh thu/sao kê mới nhất; Ma trận vẫn dùng dữ liệu upload lịch sử.
// =========================================================
let META_LIVE_DATA = [];

// V150 — Bảng thông báo hoạt động nhỏ trong sidebar + chấm trạng thái chuyển động nhẹ.
// Chỉ hiển thị trạng thái hiện tại từ Meta, không tạo thêm request API.
const META_SIDEBAR_ACTIVITY_MAX_ITEMS = 5;
const META_SIDEBAR_STATUS_HISTORY_LIMIT = 30;
const META_SIDEBAR_ACTIVITY_SUCCESS_TTL_MS = 30000;
const META_SIDEBAR_ACTIVITY_TERMINAL_TTL_MS = 30000;
let META_SIDEBAR_ACTIVITY_EXPIRY_TIMER = null;
const META_SIDEBAR_ACTIVITY_IMPORTANT_STATUSES = new Set([
    'Đang xét duyệt',
    'Đang chuẩn bị',
    'Đang xử lý',
    'Đã lên lịch',
    'Chờ thông tin thanh toán',
    'Không được duyệt',
    'Có vấn đề',
    'Bị hạn chế'
]);

let META_LIVE_CACHE = {};
let META_LIVE_TIMER = null;
let META_LIVE_IN_FLIGHT = {}; // requestKey -> Promise

let META_LIVE_STATE = {
    loading: false,
    company: '',
    from: '',
    to: '',
    key: '',
    syncedAt: '',
    checkedAt: 0,
    error: '',
    rowCount: 0,
    source: 'firebase_snapshot',
    leader: false
};

const META_LIVE_SNAPSHOT_ROOT = 'meta_live_snapshots_v1';
const META_LIVE_LOCK_ROOT = 'meta_live_locks_v1';
const META_LIVE_REFRESH_REQUEST_ROOT = 'meta_live_refresh_requests_v1';
const META_LIVE_REFRESH_INTERVAL_MS = Math.max(
    30000,
    Number(window.META_ADS_FIREBASE_REFRESH_MS || 30000)
);
const META_LIVE_STALE_AFTER_MS = Math.max(28000, META_LIVE_REFRESH_INTERVAL_MS - 1500);
const META_LIVE_LOCK_LEASE_MS = 120000;

// Thời gian giữ màu đỏ khi số liệu Meta Live thay đổi.
// Có thể cấu hình trước khi tải file bằng một trong các biến:
// window.META_LIVE_CHANGE_HIGHLIGHT_MS = 5000;
// window.META_ADS_FIREBASE_FLASH_MS = 5000;
// window.META_LIVE_CHANGE_HIGHLIGHT_SECONDS = 5;
const META_LIVE_CHANGE_HIGHLIGHT_RAW_MS = Number(
    window.META_LIVE_CHANGE_HIGHLIGHT_MS ??
    window.META_ADS_FIREBASE_FLASH_MS ??
    window.META_LIVE_FLASH_MS ??
    (Number(window.META_LIVE_CHANGE_HIGHLIGHT_SECONDS || 0) * 1000) ??
    5000
);
const META_LIVE_CHANGE_HIGHLIGHT_MS = (
    Number.isFinite(META_LIVE_CHANGE_HIGHLIGHT_RAW_MS) &&
    META_LIVE_CHANGE_HIGHLIGHT_RAW_MS > 0
)
    ? Math.max(1000, META_LIVE_CHANGE_HIGHLIGHT_RAW_MS)
    : 5000;

let META_LIVE_SERVER_OFFSET_MS = 0;
let META_LIVE_CLOCK_READY = false;
let META_LIVE_ACTIVE_CONTEXT = null;
let META_LIVE_SNAPSHOT_REF = null;
let META_LIVE_REFRESH_REQUEST_REF = null;
let META_LIVE_CURRENT_SNAPSHOT = null;
let META_LIVE_LAST_HANDLED_REQUEST_AT = 0;
let META_LIVE_VISIBILITY_BOUND = false;
let META_LIVE_CLIENT_ID = '';

// META LIVE V138 — SNAPSHOT REALTIME + NGUỒN TÀI CHÍNH ĐỘC LẬP
let META_LIVE_REPORT_ROWS_BY_COMPANY = {};
let META_LIVE_REPORT_DATA = [];
let META_LIVE_REPORT_REFS = {};
let META_LIVE_REPORT_PERIOD_KEY = '';
let META_LIVE_REPORT_RENDER_TIMER = null;
let META_LIVE_REPORT_LAST_REFRESH_AT = 0;
const META_LIVE_REPORT_REFRESH_INTERVAL_MS = Math.max(
    60000,
    Number(window.META_ADS_REPORT_REFRESH_MS || 60000)
);

// Nguồn tài chính hiện tại được lưu độc lập bên trong upload_logs để tương thích Rules hiện có.
// Cấu trúc: upload_logs/_meta_live_finance_sources_v1/{COMPANY}/{FROM_TO}/{revenue|statement}
const META_LIVE_FINANCE_SOURCE_NODE = '_meta_live_finance_sources_v1';
let META_LIVE_FINANCE_SOURCES = {};

// V141 — tương thích dữ liệu tài chính đã upload trước khi chuyển sang Meta Live.
// Dữ liệu cũ chỉ được dùng để khởi tạo nguồn doanh thu/sao kê mới một lần;
// chi phí quảng cáo luôn lấy từ snapshot Meta Live, tuyệt đối không lấy lại từ file Ads cũ.
const META_LIVE_LEGACY_FINANCE_MIGRATION_VERSION = 'legacy_finance_to_meta_live_v3_month_latest_statement_repair';
let META_LIVE_LEGACY_FINANCE_SOURCES = {};
let META_LIVE_FINANCE_MIGRATION_TIMER = null;
let META_LIVE_FINANCE_MIGRATION_RUNNING = false;
let META_LIVE_FINANCE_MIGRATION_LAST_SIGNATURE = '';
let META_LIVE_LEGACY_ADS_DATA_READY = false;

let META_LIVE_LAST_APPLIED_KEY = '';
let META_LIVE_CHANGED_FIELDS = new Map();
let META_LIVE_PREVIOUS_VALUE_MAP = new Map();

(function injectMetaLiveDigitChangeStyle() {
    if (document.getElementById('meta-live-digit-change-style')) return;

    const style = document.createElement('style');
    style.id = 'meta-live-digit-change-style';
    style.textContent = `
        @keyframes metaLiveDigitColorHold {
            0%, 99% {
                color: #d93025;
            }
            100% {
                color: inherit;
            }
        }

        @keyframes metaLiveDigitPulse {
            0% {
                opacity: 0.72;
                transform: translateY(-1px) scale(1.035);
            }
            55% {
                opacity: 1;
                transform: translateY(0) scale(1.015);
            }
            100% {
                opacity: 1;
                transform: none;
            }
        }

        .meta-live-digit-change {
            display: inline-block;
            animation:
                metaLiveDigitColorHold ${META_LIVE_CHANGE_HIGHLIGHT_MS}ms linear both,
                metaLiveDigitPulse 650ms ease-out both;
            transform-origin: center bottom;
            font-variant-numeric: tabular-nums;
            will-change: color, opacity, transform;
        }

        @media (prefers-reduced-motion: reduce) {
            .meta-live-digit-change {
                animation:
                    metaLiveDigitColorHold ${META_LIVE_CHANGE_HIGHLIGHT_MS}ms linear both;
                transform: none;
            }
        }
    `;
    document.head.appendChild(style);
})();

(function injectAdsVietnameseFontStyle() {
    if (document.getElementById('ads-vietnamese-font-style')) return;

    const style = document.createElement('style');
    style.id = 'ads-vietnamese-font-style';
    style.textContent = `
        #ads-analysis-result,
        #ads-analysis-result *,
        #meta-live-original-rows-modal,
        #meta-live-original-rows-modal * {
            font-family: Tahoma, Arial, "Segoe UI", sans-serif !important;
            font-synthesis: none !important;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        #ads-analysis-result strong,
        #ads-analysis-result b,
        #ads-analysis-result th,
        #meta-live-original-rows-modal strong,
        #meta-live-original-rows-modal b,
        #meta-live-original-rows-modal th {
            font-weight: 700 !important;
        }

        #meta-live-original-rows-modal .meta-live-adset-row:hover td {
            background: #f1f6ff !important;
        }

        #meta-live-original-rows-modal .meta-live-ad-detail-row td {
            background: #f7f9fc !important;
        }
    `;
    document.head.appendChild(style);
})();

/**
 * So sánh số cũ và số mới theo từng chữ số.
 * Chữ số đầu tiên khác và toàn bộ phần số phía sau sẽ đổi đỏ.
 */
function renderMetaLiveDigitDifference(previousDisplay, nextDisplay, shouldAnimate = true) {
    const before = String(previousDisplay ?? '');
    const after = String(nextDisplay ?? '');

    if (!shouldAnimate || !before || before === after) {
        return escapeHtml(after);
    }

    const beforeDigits = Array.from(before).filter(char => /\d/.test(char));
    const afterChars = Array.from(after);
    const afterDigitPositions = [];

    afterChars.forEach((char, index) => {
        if (/\d/.test(char)) {
            afterDigitPositions.push(index);
        }
    });

    const afterDigits = afterDigitPositions.map(index => afterChars[index]);
    const maxDigits = Math.max(beforeDigits.length, afterDigits.length);
    let firstChangedDigitIndex = -1;

    for (let index = 0; index < maxDigits; index++) {
        if (beforeDigits[index] !== afterDigits[index]) {
            firstChangedDigitIndex = index;
            break;
        }
    }

    if (
        firstChangedDigitIndex < 0 ||
        firstChangedDigitIndex >= afterDigitPositions.length
    ) {
        return escapeHtml(after);
    }

    const startCharIndex = afterDigitPositions[firstChangedDigitIndex];
    const lastDigitCharIndex = afterDigitPositions[afterDigitPositions.length - 1];

    const prefix = afterChars.slice(0, startCharIndex).join('');
    const changedPart = afterChars
        .slice(startCharIndex, lastDigitCharIndex + 1)
        .join('');
    const suffix = afterChars.slice(lastDigitCharIndex + 1).join('');

    return (
        escapeHtml(prefix) +
        '<span class="meta-live-digit-change">' +
            escapeHtml(changedPart) +
        '</span>' +
        escapeHtml(suffix)
    );
}

function getMetaLivePreviousValues(item) {
    return META_LIVE_PREVIOUS_VALUE_MAP.get(getMetaLiveRowKey(item)) || null;
}

function formatMetaLiveInteger(value) {
    return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function renderMetaLiveRowNumber(item, fields, currentDisplay, previousDisplay) {
    return renderMetaLiveDigitDifference(
        previousDisplay,
        currentDisplay,
        isMetaLiveValueChanged(item, fields)
    );
}

function setMetaLiveMetricValue(elementId, displayValue, rawValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const nextDisplay = String(displayValue ?? '');
    const nextRawValue = String(rawValue ?? '');
    const previousDisplay = element.dataset.metaLiveDisplay;
    const previousRawValue = element.dataset.metaLiveValue;

    const changed = (
        CURRENT_TAB === 'performance' &&
        previousDisplay !== undefined &&
        previousRawValue !== undefined &&
        previousRawValue !== nextRawValue &&
        previousDisplay !== nextDisplay
    );

    if (changed) {
        element.innerHTML = renderMetaLiveDigitDifference(
            previousDisplay,
            nextDisplay,
            true
        );
    } else {
        element.textContent = nextDisplay;
    }

    element.dataset.metaLiveDisplay = nextDisplay;
    element.dataset.metaLiveValue = nextRawValue;
}

function getMetaActionValue(actions, actionType) {
    if (!Array.isArray(actions)) return 0;

    const match = actions.find(action => (
        String(action && action.action_type || '') === String(actionType || '')
    ));

    return Number(match && match.value || 0);
}

function getMetaLinkClicksFromRow(row) {
    if (!row) return 0;

    const directValue = Number(
        row.linkClicks ??
        row.link_clicks ??
        row.inline_link_clicks ??
        0
    );

    if (directValue > 0) return directValue;

    const actionValue = getMetaActionValue(row.actions, 'link_click');
    return actionValue > 0 ? actionValue : 0;
}

function calculateLinkClickCtr(linkClicks, impressions, fallbackCtr = 0) {
    const safeLinkClicks = Number(linkClicks || 0);
    const safeImpressions = Number(impressions || 0);

    if (safeImpressions > 0) {
        return (safeLinkClicks / safeImpressions) * 100;
    }

    return Number(fallbackCtr || 0);
}

function calculateAggregatedCtr(linkClicks, impressions, weightedCtrSum, spend) {
    const safeImpressions = Number(impressions || 0);

    if (safeImpressions > 0) {
        return calculateLinkClickCtr(linkClicks, safeImpressions, 0);
    }

    const safeSpend = Number(spend || 0);
    return safeSpend > 0
        ? Number(weightedCtrSum || 0) / safeSpend
        : 0;
}

function getMetaLiveRowKey(item) {
    if (!item) return '';

    return String(
        item.meta_live_row_key ||
        [
            item.company || '',
            normalizeAdsText(item.employee || ''),
            normalizeAdsText(item.adName || '')
        ].join('||')
    );
}

function buildMetaLiveValueMap(rows) {
    const map = new Map();

    (Array.isArray(rows) ? rows : []).forEach(item => {
        const key = getMetaLiveRowKey(item);
        if (!key) return;

        map.set(key, {
            spend: Number(item.spend || 0),
            messages: Number(item.messages || 0),
            result: Number(item.result || 0),
            ctr: Number(item.ctr || 0),
            linkClicks: Number(item.linkClicks || 0),
            impressions: Number(item.impressions || 0),
            rawCpm: Number(item.rawCpm || 0),
            rawCpa: Number(item.rawCpa || 0),
            budget: Number(getEffectiveGroupedBudgetInfo(item).amount || 0),
            activeBudget: Number(
                item.active_budget !== undefined
                    ? item.active_budget
                    : (item.status === 'Đang chạy' ? item.budget : 0)
            ),
            budgetUsesCampaign: getEffectiveGroupedBudgetInfo(item).usesCampaignBudget ? 1 : 0,
            activeBudgetUsesCampaign: item.active_budget_uses_campaign ? 1 : 0
        });
    });

    return map;
}

function prepareMetaLiveChangedFields(previousRows, nextRows, sameContext) {
    META_LIVE_CHANGED_FIELDS = new Map();
    META_LIVE_PREVIOUS_VALUE_MAP = new Map();

    if (!sameContext || !Array.isArray(previousRows) || previousRows.length === 0) {
        return;
    }

    const previousMap = buildMetaLiveValueMap(previousRows);
    const nextMap = buildMetaLiveValueMap(nextRows);

    META_LIVE_PREVIOUS_VALUE_MAP = previousMap;

    const fields = [
        'spend',
        'messages',
        'result',
        'ctr',
        'linkClicks',
        'impressions',
        'rawCpm',
        'rawCpa',
        'budget',
        'activeBudget',
        'budgetUsesCampaign',
        'activeBudgetUsesCampaign'
    ];

    nextMap.forEach((nextValue, key) => {
        const previousValue = previousMap.get(key);
        if (!previousValue) return;

        const changed = new Set();

        fields.forEach(field => {
            const before = Number(previousValue[field] || 0);
            const after = Number(nextValue[field] || 0);

            if (Math.abs(before - after) > 0.000001) {
                changed.add(field);
            }
        });

        if (changed.size > 0) {
            META_LIVE_CHANGED_FIELDS.set(key, changed);
        }
    });
}

function isMetaLiveValueChanged(item, fields) {
    if (CURRENT_TAB !== 'performance') return false;

    const changed = META_LIVE_CHANGED_FIELDS.get(getMetaLiveRowKey(item));
    if (!changed) return false;

    return (Array.isArray(fields) ? fields : [fields]).some(field => changed.has(field));
}





function createMetaLiveClientId() {
    if (META_LIVE_CLIENT_ID) return META_LIVE_CLIENT_ID;

    let randomPart = '';
    try {
        const bytes = new Uint8Array(12);
        window.crypto.getRandomValues(bytes);
        randomPart = Array.from(bytes)
            .map(value => value.toString(16).padStart(2, '0'))
            .join('');
    } catch (error) {
        randomPart = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    META_LIVE_CLIENT_ID = `meta_${randomPart}`.replace(/[^A-Za-z0-9_-]/g, '');
    return META_LIVE_CLIENT_ID;
}

function getMetaLiveFirebaseNow() {
    return Date.now() + Number(META_LIVE_SERVER_OFFSET_MS || 0);
}

function initMetaLiveServerClock() {
    if (META_LIVE_CLOCK_READY || !db) return;
    META_LIVE_CLOCK_READY = true;

    db.ref('.info/serverTimeOffset').on('value', snapshot => {
        META_LIVE_SERVER_OFFSET_MS = Number(snapshot.val() || 0);
    }, error => {
        console.warn('Không đọc được Firebase serverTimeOffset:', error.message);
    });
}

function getLocalIsoDate(dateValue) {
    const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCurrentMonthToDatePeriod() {
    const today = getLocalIsoDate(new Date());
    const month = today.slice(0, 7);
    return {
        month,
        from: `${month}-01`,
        to: today,
        signature: `${month}-01_${today}`
    };
}

function getReportMonthDateRange(monthValue) {
    const month = String(monthValue || '').trim();
    const match = month.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    if (!year || monthNumber < 1 || monthNumber > 12) return null;

    const today = getLocalIsoDate(new Date());
    const from = `${month}-01`;
    let to = getLocalIsoDate(new Date(year, monthNumber, 0));

    // Kỳ hiện tại chỉ chạy đến hôm nay; kỳ cũ lấy hết ngày cuối tháng.
    if (month === today.slice(0, 7) && to > today) to = today;

    return { month, from, to };
}

function syncSelectedReportMonthToDateRange(monthValue) {
    const range = getReportMonthDateRange(monthValue);
    if (!range) return null;

    REPORT_MONTH = range.month;
    DATE_FROM = range.from;
    DATE_TO = range.to;
    window.CURRENT_REPORT_PERIOD = range.month;

    const monthEl = document.getElementById('report-month-filter');
    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');

    if (monthEl) monthEl.value = range.month;
    if (fromEl) fromEl.value = range.from;
    if (toEl) toEl.value = range.to;

    return range;
}

function syncPeriodFilterControls() {
    const period = getCurrentMonthToDatePeriod();
    const monthEl = document.getElementById('report-month-filter');
    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');

    if (monthEl) {
        monthEl.value = REPORT_MONTH || period.month;
        monthEl.max = period.month;
    }
    if (fromEl) {
        fromEl.value = DATE_FROM || period.from;
        fromEl.max = period.to;
    }
    if (toEl) {
        toEl.value = DATE_TO || period.to;
        toEl.max = period.to;
    }
}

function applyCurrentMonthToDateDefaults(force) {
    if (PERIOD_FILTER_USER_CHANGED && !force) return false;

    const period = getCurrentMonthToDatePeriod();
    const changed = PERIOD_DEFAULT_SIGNATURE !== period.signature
        || REPORT_MONTH !== period.month
        || DATE_FROM !== period.from
        || DATE_TO !== period.to;

    REPORT_MONTH = period.month;
    DATE_FROM = period.from;
    DATE_TO = period.to;
    PERIOD_DEFAULT_SIGNATURE = period.signature;
    window.CURRENT_REPORT_PERIOD = period.month;
    syncPeriodFilterControls();
    return changed;
}

function startDefaultPeriodWatcher() {
    if (PERIOD_DEFAULT_WATCH_TIMER) return;
    PERIOD_DEFAULT_WATCH_TIMER = setInterval(() => {
        if (PERIOD_FILTER_USER_CHANGED) return;
        const changed = applyCurrentMonthToDateDefaults(false);
        if (!changed) return;

        ACTIVE_BATCH_ID = null;
        USER_EXPLICIT_VIEW_ALL = true;
        renderHistoryUI();

        if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
            refreshMetaLive(true, false).catch(() => {});
        } else {
            applyFilters();
        }

        if (CURRENT_TAB === 'report') {
            refreshMetaLiveReport(true, true).catch(() => {});
            renderReportPreview();
        }
    }, 60000);
}

function getMetaLivePeriod() {
    const today = getLocalIsoDate(new Date());
    let from = '';
    let to = '';

    if (DATE_FROM || DATE_TO) {
        from = DATE_FROM || (DATE_TO ? `${DATE_TO.slice(0, 8)}01` : `${today.slice(0, 8)}01`);
        to = DATE_TO || today;
    } else if (REPORT_MONTH) {
        const parts = REPORT_MONTH.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);

        if (!year || !month || month < 1 || month > 12) {
            throw new Error('Kỳ báo cáo không hợp lệ.');
        }

        from = `${REPORT_MONTH}-01`;
        to = getLocalIsoDate(new Date(year, month, 0));
        if (to > today) to = today;
    } else {
        from = `${today.slice(0, 8)}01`;
        to = today;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new Error('Ngày Meta Live phải có định dạng YYYY-MM-DD.');
    }

    if (from > to) {
        throw new Error('Khoảng ngày Meta Live không hợp lệ hoặc đang nằm trong tương lai.');
    }

    return { from, to };
}

function getMetaLiveRequestKey(company, from, to) {
    return `${company}||${from}||${to}`;
}

function getMetaLivePeriodKey(period) {
    return `${period.from}_${period.to}`;
}

function buildMetaLiveContextForCompany(companyId) {
    const period = getMetaLivePeriod();
    const company = String(companyId || CURRENT_COMPANY || 'NNV').toUpperCase();
    const periodKey = getMetaLivePeriodKey(period);

    return {
        company,
        period,
        periodKey,
        requestKey: getMetaLiveRequestKey(company, period.from, period.to),
        snapshotPath: `${META_LIVE_SNAPSHOT_ROOT}/${company}/${periodKey}`,
        lockPath: `${META_LIVE_LOCK_ROOT}/${company}/${periodKey}`,
        requestPath: `${META_LIVE_REFRESH_REQUEST_ROOT}/${company}/${periodKey}`
    };
}

function buildMetaLiveContext() {
    return buildMetaLiveContextForCompany(CURRENT_COMPANY);
}

function mapMetaStatus(statusValue) {
    const status = String(statusValue || '').toUpperCase();

    if (status === 'ACTIVE') return 'Đang chạy';
    if (status === 'PREPARING' || status === 'IN_PROCESS') return 'Đang chuẩn bị';
    if (status === 'CAMPAIGN_PAUSED') return 'Chiến dịch đã tắt';
    if (status === 'ADSET_PAUSED' || status === 'PAUSED') return 'Đã tắt';
    if (status === 'ARCHIVED') return 'Đã lưu trữ';
    if (status === 'DELETED') return 'Đã xóa';
    if (status === 'PENDING_REVIEW') return 'Đang xét duyệt';
    if (status === 'PENDING_BILLING_INFO') return 'Chờ thông tin thanh toán';
    if (status === 'PREAPPROVED') return 'Đã duyệt trước';
    if (status === 'SCHEDULED') return 'Đã lên lịch';
    if (status === 'DISAPPROVED') return 'Không được duyệt';
    if (status === 'WITH_ISSUES') return 'Có vấn đề';
    if (status === 'LIMITED') return 'Bị hạn chế';

    return statusValue || 'Không xác định';
}

function isMetaLiveUnknownStatus(statusValue) {
    const value = String(statusValue || '').trim().toUpperCase();
    return !value || [
        'UNKNOWN',
        'UNSPECIFIED',
        'KHÔNG XÁC ĐỊNH',
        'N/A',
        'NULL',
        'UNDEFINED'
    ].includes(value);
}

function hasMetaLiveDeliveryData(item) {
    if (!item) return false;

    if (item.has_delivery_data === true || item.data_state === 'delivered') {
        return true;
    }

    return (
        Number(item.spend || 0) > 0 ||
        Number(item.impressions || 0) > 0 ||
        Number(item.reach || 0) > 0 ||
        Number(item.clicks || 0) > 0 ||
        Number(item.linkClicks || 0) > 0 ||
        Number(item.messages || 0) > 0 ||
        Number(item.result || 0) > 0
    );
}

function getMetaLiveTodayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Tương thích snapshot cũ: ACTIVE nhưng chưa có dữ liệu phân phối không được
 * hiển thị Đang chạy. Ads Manager thường đang ở giai đoạn chuẩn bị/phân phối.
 */
function resolveMetaLiveDisplayStatus(statusValue, hasDeliveryData, startIso) {
    const mapped = mapMetaStatus(statusValue);

    if (mapped === 'Đang chạy' && !hasDeliveryData) {
        const start = String(startIso || '').slice(0, 10);
        const today = getMetaLiveTodayIso();
        if (start && start > today) return 'Đã lên lịch';
        return 'Đang chuẩn bị';
    }

    return mapped;
}

function getMetaLiveStatusVisual(status, hasDeliveryData) {
    const value = String(status || 'Không xác định');

    if (value === 'Đang chạy' && hasDeliveryData) {
        return { color:'#0f9d58', dot:true, note:'', tone:'running' };
    }

    if ([
        'Đang chuẩn bị',
        'Đang xét duyệt',
        'Đã lên lịch',
        'Đang xử lý',
        'Chờ thông tin thanh toán',
        'Đã duyệt trước'
    ].includes(value)) {
        return {
            color:'#c58a00',
            dot:true,
            note: hasDeliveryData ? '' : 'Chưa phát sinh dữ liệu',
            tone:'pending'
        };
    }

    if (['Không được duyệt', 'Có vấn đề', 'Bị hạn chế'].includes(value)) {
        return {
            color:'#c5221f',
            dot:true,
            note: hasDeliveryData ? '' : 'Chưa phát sinh dữ liệu',
            tone:'error'
        };
    }

    if (['Đã tắt', 'Chiến dịch đã tắt', 'Đã lưu trữ', 'Đã xóa'].includes(value)) {
        return {
            color:'#64748b',
            dot:false,
            note: hasDeliveryData ? '' : 'Không phát sinh dữ liệu trong kỳ',
            tone:'stopped'
        };
    }

    return {
        color: hasDeliveryData ? '#475569' : '#8a6d1d',
        dot: !hasDeliveryData,
        note: hasDeliveryData ? '' : 'Chưa phát sinh dữ liệu',
        tone:'neutral'
    };
}

function renderMetaLiveStatusHtml(status, hasDeliveryData, runEnd) {
    const visual = getMetaLiveStatusVisual(status, hasDeliveryData);
    const dot = visual.dot ? '● ' : '';
    const note = visual.note
        ? `<div style="font-size:9px;color:${visual.color};margin-top:3px;font-weight:700;">${escapeHtml(visual.note)}</div>`
        : '';
    const end = runEnd && visual.tone === 'stopped'
        ? `<div style="font-size:9px;color:#888;margin-top:3px;">${escapeHtml(runEnd)}</div>`
        : '';

    return `<span style="color:${visual.color};font-weight:700;white-space:nowrap;">${dot}${escapeHtml(status || 'Không xác định')}</span>${note}${end}`;
}

function parseMetaLiveAdsetName(fullName, fallbackEmployee, fallbackAdName) {
    const raw = String(fullName || '').replace(/\s+/g, ' ').trim();

    if (!raw) {
        return {
            employee: String(fallbackEmployee || 'KHÁC').trim().toUpperCase(),
            adName: String(fallbackAdName || 'Chung').trim()
        };
    }

    const hyphenIndex = raw.indexOf('-');

    if (hyphenIndex === -1) {
        return {
            employee: String(fallbackEmployee || raw).trim().toUpperCase(),
            adName: String(fallbackAdName || 'Chung').trim()
        };
    }

    return {
        employee: raw.substring(0, hyphenIndex).trim().toUpperCase() || 'KHÁC',
        adName: raw.substring(hyphenIndex + 1).trim() || 'Chung'
    };
}

function normalizeMetaLiveAdDetails(adRows, period) {
    return (Array.isArray(adRows) ? adRows : Object.values(adRows || {})).map(ad => {
        const impressions = Number(ad.impressions || 0);
        const linkClicks = getMetaLinkClicksFromRow(ad);
        const messages = Number(ad.messages || 0);
        const purchases = Number(ad.result || 0);
        const spend = Number(ad.spend || 0);
        const statusValue = ad.delivery_status || ad.deliveryStatus || ad.status || ad.effective_status || ad.configured_status || '';
        const hasDeliveryData = (
            ad.has_delivery_data === true ||
            ad.data_state === 'delivered' ||
            spend > 0 ||
            impressions > 0 ||
            Number(ad.reach || 0) > 0 ||
            Number(ad.clicks || 0) > 0 ||
            linkClicks > 0 ||
            messages > 0 ||
            purchases > 0
        );
        const displayStatus = resolveMetaLiveDisplayStatus(
            statusValue,
            hasDeliveryData,
            ad.start_time || ad.run_start || ''
        );

        return {
            adId: String(ad.adId || ad.ad_id || ''),
            adName: String(ad.adName || ad.ad_name || 'Bài quảng cáo').trim(),
            adsetId: String(ad.adsetId || ad.adset_id || ''),
            adsetName: String(ad.adsetName || ad.adset_name || '').trim(),
            campaignId: String(ad.campaignId || ad.campaign_id || ''),
            campaignName: String(ad.campaignName || ad.campaign_name || '').trim(),
            status: displayStatus,
            rawStatus: statusValue,
            spend: spend,
            messages: messages,
            result: purchases,
            ctr: calculateLinkClickCtr(
                linkClicks,
                impressions,
                Number(ad.ctr || ad.linkCtr || 0)
            ),
            linkClicks: linkClicks,
            impressions: impressions,
            clicks: Number(ad.clicks || 0),
            reach: Number(ad.reach || 0),
            freq: Number(ad.freq || ad.frequency || 0),
            rawCpm: Number(ad.rawCpm || (messages > 0 ? spend / messages : 0)),
            rawCpa: Number(ad.rawCpa || (purchases > 0 ? spend / purchases : 0)),
            has_delivery_data: hasDeliveryData,
            data_state: hasDeliveryData ? 'delivered' : 'configured_only',
            effectiveStatus: ad.effective_status || ad.raw_effective_status || '',
            configuredStatus: ad.configured_status || ad.raw_configured_status || '',
            reportStartIso: String(ad.report_start_iso || ad.report_start || period.from || '').slice(0, 10),
            reportEndIso: String(ad.report_end_iso || ad.report_end || period.to || '').slice(0, 10),
            createdAt: ad.created_time || ad.createdAt || '',
            updatedAt: ad.updated_time || ad.updatedAt || '',
            status_history: normalizeMetaLiveStatusHistory(ad.status_history || ad.statusHistory || []),
            statusHistory: normalizeMetaLiveStatusHistory(ad.status_history || ad.statusHistory || [])
        };
    }).sort((a, b) => {
        const aRunning = a.status === 'Đang chạy' ? 1 : 0;
        const bRunning = b.status === 'Đang chạy' ? 1 : 0;
        if (aRunning !== bRunning) return bRunning - aRunning;
        return Number(b.spend || 0) - Number(a.spend || 0);
    });
}

function normalizeMetaLiveRows(rows, company, period, syncedAt) {
    const normalized = (Array.isArray(rows) ? rows : Object.values(rows || {})).map(row => {
        const fullName = String(row.fullName || row.adsetName || '').trim();
        const nameParts = parseMetaLiveAdsetName(fullName, row.employee, row.adName);

        const runStartIso = String(row.run_start || row.start_time || '').slice(0, 10);
        const runEndIso = String(row.run_end || row.end_time || '').slice(0, 10);

        const dailyBudget = Number(row.daily_budget || 0);
        const lifetimeBudget = Number(row.lifetime_budget || 0);
        const budget = dailyBudget > 0 ? dailyBudget : lifetimeBudget;
        const budgetType = dailyBudget > 0
            ? 'Ngân sách hằng ngày'
            : (lifetimeBudget > 0 ? 'Ngân sách trọn đời' : '');

        const effectiveStatus = row.delivery_status || row.deliveryStatus || row.status || row.effective_status || row.configured_status || '';

        const impressions = Number(row.impressions || 0);
        const linkClicks = getMetaLinkClicksFromRow(row);
        const linkClickCtr = calculateLinkClickCtr(
            linkClicks,
            impressions,
            Number(
                row.linkCtr ??
                row.link_ctr ??
                row.inline_link_click_ctr ??
                row.ctr_link ??
                row.ctr ??
                0
            )
        );

        const hasDeliveryData = (
            row.has_delivery_data === true ||
            row.data_state === 'delivered' ||
            Number(row.spend || 0) > 0 ||
            impressions > 0 ||
            Number(row.reach || 0) > 0 ||
            Number(row.clicks || 0) > 0 ||
            linkClicks > 0 ||
            Number(row.messages || 0) > 0 ||
            Number(row.result || 0) > 0
        );
        const status = resolveMetaLiveDisplayStatus(
            effectiveStatus,
            hasDeliveryData,
            runStartIso
        );

        return {
            source: 'meta_api',
            company: company,
            accountId: row.accountId || '',
            campaignId: row.campaignId || '',
            campaignName: row.campaignName || '',
            adsetId: row.adsetId || '',
            ads: normalizeMetaLiveAdDetails(row.ads || row.adRows || [], period),
            adCount: Array.isArray(row.ads || row.adRows)
                ? (row.ads || row.adRows).length
                : Object.keys(row.ads || row.adRows || {}).length,

            fullName: fullName || `${nameParts.employee} - ${nameParts.adName}`,
            employee: nameParts.employee,
            adName: nameParts.adName,

            spend: Number(row.spend || 0),
            result: Number(row.result || 0),
            messages: Number(row.messages || 0),
            // CTR chuẩn: lượt nhấp vào liên kết / lượt hiển thị.
            ctr: linkClickCtr,
            ctr_type: 'link_click',
            linkClicks: linkClicks,
            freq: Number(row.freq || row.frequency || 0),
            rawCpm: Number(row.rawCpm || 0),
            rawCpa: Number(row.rawCpa || 0),

            impressions: impressions,
            reach: Number(row.reach || 0),
            // clicks là tổng lượt nhấp; linkClicks mới dùng để tính CTR.
            clicks: Number(row.clicks || 0),

            budget: budget,
            budget_type: budgetType,
            budget_uses_campaign: budget <= 0,
            budget_display: budget > 0 ? budget : 'Sử dụng ngân sách chiến dịch',
            active_budget: status === 'Đang chạy' ? budget : 0,
            active_budget_uses_campaign: status === 'Đang chạy' && budget <= 0,

            run_start: runStartIso ? isoToDisplayDate(runStartIso) : '',
            run_end: status === 'Đang chạy'
                ? 'Đang diễn ra'
                : (runEndIso ? isoToDisplayDate(runEndIso) : ''),
            run_start_iso: runStartIso,
            run_end_iso: status === 'Đang chạy' ? '' : runEndIso,
            status: status,
            rawStatus: effectiveStatus,
            effectiveStatus: row.effective_status || row.raw_effective_status || '',
            configuredStatus: row.configured_status || row.raw_configured_status || '',
            createdAt: row.created_time || row.createdAt || '',
            updatedAt: row.updated_time || row.updatedAt || '',
            status_history: normalizeMetaLiveStatusHistory(row.status_history || row.statusHistory || []),
            statusHistory: normalizeMetaLiveStatusHistory(row.status_history || row.statusHistory || []),

            report_start: isoToDisplayDate(row.report_start_iso || row.report_start || period.from),
            report_end: isoToDisplayDate(row.report_end_iso || row.report_end || period.to),
            report_start_iso: String(row.report_start_iso || row.report_start || period.from).slice(0, 10),
            report_end_iso: String(row.report_end_iso || row.report_end || period.to).slice(0, 10),
            report_month: String(row.report_month || period.to).slice(0, 7),

            batchId: `META_LIVE_${company}_${period.from}_${period.to}`,
            revenue: 0,
            fee: 0,
            syncedAt: row.syncedAt || syncedAt || '',
            budgetHistory: normalizeMetaLiveBudgetHistory(
                row.budget_history || row.budgetHistory || []
            ),
            has_delivery_data: hasDeliveryData,
            data_state: hasDeliveryData ? 'delivered' : 'configured_only'
        };
    });

    const periodFrom = String(period && period.from || '').slice(0, 10);
    const periodSafeRows = normalized.filter(item => {
        if (!periodFrom || hasMetaLiveDeliveryData(item)) return true;
        const endIso = String(item.run_end_iso || '').slice(0, 10);
        return !(endIso && endIso < periodFrom);
    });

    return mergeDuplicateAdsData(periodSafeRows);
}


function getMetaSidebarActivityTimestamp(value) {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMetaSidebarActivityTime(value) {
    const time = getMetaSidebarActivityTimestamp(value);
    if (!time) return '';

    const date = new Date(time);
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();

    return sameDay
        ? date.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })
        : `${date.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' })} ${date.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })}`;
}

function getMetaSidebarActivityStatusMeta(status, hasDeliveryData, entityType) {
    const normalizedStatus = String(status || 'Không xác định');
    const typeLabel = entityType === 'ad' ? 'Bài' : 'Nhóm';

    const map = {
        'Đang xét duyệt': { text:'đang chờ Meta duyệt', tone:'warning', priority:96 },
        'Đang chuẩn bị': { text:'đang được Meta chuẩn bị phân phối', tone:'warning', priority:94 },
        'Đang xử lý': { text:'đang được thiết lập', tone:'info', priority:94 },
        'Đã lên lịch': { text:'đã lên lịch chạy', tone:'info', priority:92 },
        'Chờ thông tin thanh toán': { text:'đang chờ thanh toán', tone:'warning', priority:98 },
        'Không được duyệt': { text:'không được duyệt', tone:'danger', priority:110 },
        'Có vấn đề': { text:'đang có vấn đề', tone:'danger', priority:108 },
        'Bị hạn chế': { text:'đang bị hạn chế', tone:'danger', priority:106 },
        'Chiến dịch đã tắt': { text:'đã dừng theo chiến dịch', tone:'muted', priority:30 },
        'Đã tắt': { text:'đã tắt', tone:'muted', priority:25 },
        'Đã lưu trữ': { text:'đã lưu trữ', tone:'muted', priority:20 },
        'Đã xóa': { text:'đã xóa', tone:'muted', priority:15 }
    };

    if (map[normalizedStatus]) return map[normalizedStatus];

    if (normalizedStatus === 'Đang chạy' && !hasDeliveryData) {
        return {
            text: entityType === 'ad'
                ? 'đã bật, đang chờ phân phối'
                : 'đã setup, đang chờ phân phối',
            tone:'warning',
            priority:88
        };
    }

    if (normalizedStatus === 'Đang chạy') {
        return { text:'đang phân phối', tone:'success', priority:45 };
    }

    return {
        text:`${typeLabel.toLowerCase()} đang ở trạng thái ${normalizedStatus.toLowerCase()}`,
        tone:'muted',
        priority:10
    };
}

function getMetaSidebarActivitySourceRows(rows) {
    const result = [];
    const seen = new Set();

    (Array.isArray(rows) ? rows : []).forEach(item => {
        const sourceRows = Array.isArray(item && item.original_adset_rows)
            && item.original_adset_rows.length
            ? item.original_adset_rows
            : [item];

        sourceRows.forEach(source => {
            if (!source) return;
            const key = String(
                source.adsetId
                || source.fullName
                || `${source.employee || ''}-${source.adName || ''}`
            ).trim();
            if (!key || seen.has(key)) return;
            seen.add(key);
            result.push(source);
        });
    });

    return result;
}

function collectMetaSidebarActivities(rows) {
    const activities = [];
    const sourceRows = getMetaSidebarActivitySourceRows(rows);
    const seenEvents = new Set();
    const nowMs = Date.now();

    function getLatestEvent(history, fallback) {
        const normalized = normalizeMetaLiveStatusHistory(history);
        if (normalized.length) return normalized[normalized.length - 1];
        return fallback || null;
    }

    function pushCurrentActivity(payload) {
        const status = String(payload.status || '');

        // Xóa và trạng thái Không xác định chỉ thuộc dữ liệu bảng/legacy,
        // không phải thông báo Hoạt động quảng cáo.
        if (status === 'Đã xóa' || isMetaLiveUnknownStatus(status)) return;

        const atMs = getMetaSidebarActivityTimestamp(payload.timeValue);
        if (!atMs) return;

        let expiresAt = 0;
        const isDeliveredRunning = status === 'Đang chạy' && payload.hasDeliveryData === true;
        const isTerminalNotice = [
            'Đã tắt',
            'Chiến dịch đã tắt',
            'Đã lưu trữ'
        ].includes(status);

        // Khi đã chạy/đang phân phối, chỉ báo thêm 30 giây rồi tự biến mất.
        if (isDeliveredRunning) {
            expiresAt = atMs + META_SIDEBAR_ACTIVITY_SUCCESS_TTL_MS;
        } else if (isTerminalNotice) {
            // Các thao tác kết thúc cũng chỉ là thông báo ngắn, không để mãi.
            expiresAt = atMs + META_SIDEBAR_ACTIVITY_TERMINAL_TTL_MS;
        }

        if (expiresAt && nowMs >= expiresAt) return;

        const signature = [
            payload.type,
            payload.entityKey,
            status,
            atMs
        ].join('|');
        if (seenEvents.has(signature)) return;
        seenEvents.add(signature);

        activities.push({
            ...payload,
            expiresAt
        });
    }

    sourceRows.forEach(row => {
        const rowTitle = String(row.fullName || `${row.employee || ''} - ${row.adName || ''}`).trim() || 'Nhóm quảng cáo';
        const rowKey = String(row.adsetId || row.fullName || rowTitle).trim();
        const rowHasDelivery = row.hasDeliveryData === true
            || row.has_delivery_data === true
            || row.dataState === 'delivered'
            || row.data_state === 'delivered'
            || hasMetaLiveDeliveryData(row);
        const rowStatus = String(row.status || 'Không xác định');
        const rowEvent = getLatestEvent(
            row.status_history || row.statusHistory,
            {
                status: rowStatus,
                hasDeliveryData: rowHasDelivery,
                at: row.updatedAt || row.createdAt || row.runStartIso || row.run_start_iso || ''
            }
        );
        const rowEventStatus = String(rowEvent && rowEvent.status || rowStatus);
        const rowEventHasDelivery = rowEvent && typeof rowEvent.hasDeliveryData === 'boolean'
            ? rowEvent.hasDeliveryData
            : rowHasDelivery;
        const rowStatusMeta = getMetaSidebarActivityStatusMeta(
            rowEventStatus,
            rowEventHasDelivery,
            'adset'
        );

        pushCurrentActivity({
            type:'Nhóm',
            entityKey:rowKey,
            title:rowTitle,
            status:rowEventStatus,
            hasDeliveryData:rowEventHasDelivery,
            message:rowStatusMeta.text,
            tone:rowStatusMeta.tone,
            priority:rowStatusMeta.priority,
            timeValue:rowEvent && rowEvent.at
                ? rowEvent.at
                : (row.updatedAt || row.createdAt || row.runStartIso || row.run_start_iso || '')
        });

        (Array.isArray(row.ads) ? row.ads : []).forEach(ad => {
            const adKey = String(ad.adId || ad.adName || '').trim();
            if (!adKey) return;

            const adTitle = String(ad.adName || 'Bài quảng cáo').trim();
            const adHasDelivery = ad.has_delivery_data === true
                || ad.data_state === 'delivered'
                || hasMetaLiveDeliveryData(ad);
            const adStatus = String(ad.status || 'Không xác định');
            const adEvent = getLatestEvent(
                ad.status_history || ad.statusHistory,
                {
                    status: adStatus,
                    hasDeliveryData: adHasDelivery,
                    at: ad.updatedAt || ad.createdAt || ''
                }
            );
            const adEventStatus = String(adEvent && adEvent.status || adStatus);
            const adEventHasDelivery = adEvent && typeof adEvent.hasDeliveryData === 'boolean'
                ? adEvent.hasDeliveryData
                : adHasDelivery;
            const adStatusMeta = getMetaSidebarActivityStatusMeta(
                adEventStatus,
                adEventHasDelivery,
                'ad'
            );

            pushCurrentActivity({
                type:'Bài',
                entityKey:adKey,
                title:adTitle,
                status:adEventStatus,
                hasDeliveryData:adEventHasDelivery,
                message:adStatusMeta.text,
                context:rowTitle,
                tone:adStatusMeta.tone,
                priority:adStatusMeta.priority + 1,
                timeValue:adEvent && adEvent.at
                    ? adEvent.at
                    : (ad.updatedAt || ad.createdAt || '')
            });
        });
    });

    // Chỉ hiện trạng thái hiện tại của từng đối tượng, mới nhất đứng đầu.
    activities.sort((a, b) => {
        const timeDiff = getMetaSidebarActivityTimestamp(b.timeValue)
            - getMetaSidebarActivityTimestamp(a.timeValue);
        if (timeDiff) return timeDiff;
        return b.priority - a.priority;
    });

    return activities.slice(0, META_SIDEBAR_ACTIVITY_MAX_ITEMS);
}

function getMetaSidebarRunningSummary(rows) {
    const sourceRows = getMetaSidebarActivitySourceRows(rows);
    const adsetCount = sourceRows.filter(row => row.status === 'Đang chạy').length;
    let adCount = 0;
    let pendingCount = 0;

    sourceRows.forEach(row => {
        (Array.isArray(row.ads) ? row.ads : []).forEach(ad => {
            if (ad.status === 'Đang chạy') adCount += 1;
            if (META_SIDEBAR_ACTIVITY_IMPORTANT_STATUSES.has(String(ad.status || ''))) pendingCount += 1;
        });
    });

    return { adsetCount, adCount, pendingCount };
}

function renderMetaSidebarActivity() {
    const list = document.getElementById('ads-sidebar-activity-list');
    const badge = document.getElementById('ads-sidebar-activity-badge');
    if (!list) return;

    if (META_SIDEBAR_ACTIVITY_EXPIRY_TIMER) {
        clearTimeout(META_SIDEBAR_ACTIVITY_EXPIRY_TIMER);
        META_SIDEBAR_ACTIVITY_EXPIRY_TIMER = null;
    }

    const activities = collectMetaSidebarActivities(META_LIVE_DATA);
    const summary = getMetaSidebarRunningSummary(META_LIVE_DATA);

    const nextExpiry = activities
        .map(item => Number(item.expiresAt || 0))
        .filter(value => value > Date.now())
        .sort((a, b) => a - b)[0];

    if (nextExpiry) {
        META_SIDEBAR_ACTIVITY_EXPIRY_TIMER = setTimeout(
            renderMetaSidebarActivity,
            Math.max(100, nextExpiry - Date.now() + 80)
        );
    }

    if (badge) {
        badge.textContent = activities.length ? String(activities.length) : 'LIVE';
        badge.classList.toggle('has-alert', activities.some(item => item.tone === 'danger'));
    }

    if (!META_LIVE_DATA.length) {
        list.innerHTML = `
            <div class="ads-sidebar-activity-empty">
                <span class="ads-sidebar-activity-pulse"></span>
                <div><b>Đang chờ dữ liệu Meta</b><small>Hoạt động mới sẽ xuất hiện tại đây.</small></div>
            </div>
        `;
        return;
    }

    if (!activities.length) {
        list.innerHTML = `
            <div class="ads-sidebar-activity-empty is-success">
                <span class="ads-sidebar-activity-pulse"></span>
                <div>
                    <b>${summary.adsetCount} nhóm đang chạy</b>
                    <small>${summary.adCount} bài đang phân phối ổn định.</small>
                </div>
            </div>
        `;
        return;
    }

    list.innerHTML = activities.map(item => {
        const timeText = formatMetaSidebarActivityTime(item.timeValue);
        const contextText = item.context
            ? `<small class="ads-sidebar-activity-context" title="${escapeHtml(item.context)}">${escapeHtml(item.context)}</small>`
            : '';
        return `
            <div class="ads-sidebar-activity-item tone-${escapeHtml(item.tone)}" title="${escapeHtml(item.type + ': ' + item.title)}">
                <span class="ads-sidebar-activity-dot"></span>
                <div class="ads-sidebar-activity-copy">
                    <div class="ads-sidebar-activity-line">
                        <b>${escapeHtml(item.type)} · ${escapeHtml(item.title)}</b>
                        ${timeText ? `<time>${escapeHtml(timeText)}</time>` : ''}
                    </div>
                    <small>${escapeHtml(item.message)}</small>
                    ${contextText}
                </div>
            </div>
        `;
    }).join('');
}

function formatMetaLiveSyncTime(value) {
    if (!value) return 'Chưa đồng bộ';

    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (isNaN(date.getTime())) return String(value);

    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function updateMetaLiveStatus(mode, message) {
    const chip = document.getElementById('meta-live-status-chip');
    const textEl = document.getElementById('meta-live-status-text');
    const refreshBtn = document.getElementById('meta-live-refresh-btn');

    if (chip) {
        chip.classList.remove('is-loading', 'is-success', 'is-error');
        if (mode) chip.classList.add(`is-${mode}`);
    }

    if (textEl) {
        textEl.textContent = message || 'Meta Live';
    }

    if (refreshBtn) {
        refreshBtn.disabled = mode === 'loading';
        refreshBtn.innerHTML = mode === 'loading' ? '⏳ Đang đồng bộ...' : '↻ Cập nhật Meta';
    }
}

function clearMetaLiveView() {
    META_LIVE_DATA = [];
    CURRENT_FILTERED_DATA = [];
    renderMetaSidebarActivity();

    const perfBody = document.getElementById('ads-table-perf');
    if (perfBody) {
        perfBody.innerHTML = `
            <tr>
                <td colspan="10" style="padding:28px;text-align:center;color:#7c8c9d;font-weight:700;">
                    Đang chuẩn bị dữ liệu Meta Live từ Firebase...
                </td>
            </tr>
        `;
    }
}

function metaLiveStableHash(value) {
    const text = JSON.stringify(value || null);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (`00000000${(hash >>> 0).toString(16)}`).slice(-8);
}

let META_LIVE_AUTH_WAIT_PROMISE = null;
let META_LIVE_PERMISSION_RETRY_KEYS = new Set();

function getMetaLiveAuthUser() {
    return window.sysAuth && window.sysAuth.currentUser
        ? window.sysAuth.currentUser
        : null;
}

function isMetaLivePermissionDeniedError(error) {
    const code = String(error && error.code || '').toLowerCase();
    const message = String(error && error.message || '').toLowerCase();
    return code.indexOf('permission_denied') !== -1 ||
        code.indexOf('permission-denied') !== -1 ||
        message.indexOf('permission_denied') !== -1 ||
        message.indexOf("doesn't have permission") !== -1 ||
        message.indexOf('permission denied') !== -1;
}

/**
 * Chờ Firebase Authentication thực sự có user và token trước khi đọc RTDB.
 *
 * Khi đăng nhập Khách, signInAnonymously() hoàn tất trước khi token được gắn
 * ổn định vào kết nối Realtime Database trong một số phiên trình duyệt. Nếu
 * listener Meta Live được mở ngay lúc đó, Rules sẽ nhìn thấy auth = null và
 * trả permission_denied dù anonymous user đã xuất hiện trên giao diện.
 */
function waitForMetaLiveFirebaseAuth(timeoutMs = 30000) {
    const auth = window.sysAuth || (
        typeof firebase !== 'undefined' &&
        firebase.apps && firebase.apps.length &&
        typeof firebase.auth === 'function'
            ? firebase.auth()
            : null
    );

    if (!auth) {
        return Promise.reject(new Error('Firebase Authentication chưa sẵn sàng.'));
    }

    const finalizeUser = user => {
        if (!user) {
            return Promise.reject(new Error('Chưa có phiên đăng nhập Firebase.'));
        }

        const tokenPromise = typeof user.getIdToken === 'function'
            ? user.getIdToken(false)
            : Promise.resolve('');

        return Promise.resolve(tokenPromise)
            .catch(() => '')
            .then(() => new Promise(resolve => {
                // Cho Realtime Database một nhịp ngắn để nhận token mới.
                setTimeout(() => resolve(user), 100);
            }));
    };

    if (auth.currentUser) {
        return finalizeUser(auth.currentUser);
    }

    if (META_LIVE_AUTH_WAIT_PROMISE) {
        return META_LIVE_AUTH_WAIT_PROMISE;
    }

    META_LIVE_AUTH_WAIT_PROMISE = new Promise((resolve, reject) => {
        let finished = false;
        let unsubscribe = null;
        let timer = null;

        const finish = (handler, value) => {
            if (finished) return;
            finished = true;
            if (timer) clearTimeout(timer);
            try {
                if (typeof unsubscribe === 'function') unsubscribe();
            } catch (error) {}
            handler(value);
        };

        timer = setTimeout(() => {
            finish(reject, new Error('Hết thời gian chờ phiên đăng nhập Firebase.'));
        }, Math.max(3000, Number(timeoutMs || 30000)));

        unsubscribe = auth.onAuthStateChanged(user => {
            if (!user) return;
            finalizeUser(user)
                .then(readyUser => finish(resolve, readyUser))
                .catch(error => finish(reject, error));
        }, error => finish(reject, error));
    }).finally(() => {
        META_LIVE_AUTH_WAIT_PROMISE = null;
    });

    return META_LIVE_AUTH_WAIT_PROMISE;
}

/**
 * Đọc snapshot hiện tại một lần trước khi quyết định tranh lock.
 *
 * Listener Firebase là bất đồng bộ. Nếu vừa mở trang mà listener chưa kịp
 * trả dữ liệu, không được vội kết luận snapshot chưa tồn tại rồi gọi Meta dư.
 *
 * Mọi tài khoản đã đăng nhập (guest/view/edit/admin) đều có thể làm leader.
 * RBAC chỉ tiếp tục giới hạn các thao tác upload, sửa và xóa dữ liệu nghiệp vụ.
 */
function readMetaLiveSnapshotOnce(context) {
    if (!db || !context) return Promise.resolve(null);

    return db.ref(context.snapshotPath).once('value').then(snapshot => {
        const value = snapshot.val();

        if (
            value &&
            META_LIVE_ACTIVE_CONTEXT &&
            META_LIVE_ACTIVE_CONTEXT.requestKey === context.requestKey
        ) {
            const currentCheckedAt = Number(
                META_LIVE_CURRENT_SNAPSHOT &&
                (
                    META_LIVE_CURRENT_SNAPSHOT.checkedAt ||
                    META_LIVE_CURRENT_SNAPSHOT.updatedAt
                ) ||
                0
            );

            const nextCheckedAt = Number(
                value.checkedAt ||
                value.updatedAt ||
                0
            );

            if (
                !META_LIVE_CURRENT_SNAPSHOT ||
                currentCheckedAt !== nextCheckedAt ||
                String(META_LIVE_CURRENT_SNAPSHOT.dataHash || '') !==
                    String(value.dataHash || '')
            ) {
                applyMetaLiveSnapshot(value, context);
            } else {
                META_LIVE_CURRENT_SNAPSHOT = value;
            }
        }

        return value || null;
    });
}

function isMetaSnapshotFresh(snapshotValue) {
    if (!snapshotValue) return false;
    const checkedAt = Number(snapshotValue.checkedAt || snapshotValue.updatedAt || 0);
    if (!checkedAt) return false;
    return (getMetaLiveFirebaseNow() - checkedAt) < META_LIVE_STALE_AFTER_MS;
}

function isMetaLivePageVisible() {
    const adsPage = document.getElementById('page-ads');
    return (
        (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') &&
        !document.hidden &&
        adsPage &&
        adsPage.classList.contains('active')
    );
}

function unbindMetaLiveSnapshot() {
    if (META_LIVE_SNAPSHOT_REF) {
        META_LIVE_SNAPSHOT_REF.off();
        META_LIVE_SNAPSHOT_REF = null;
    }

    if (META_LIVE_REFRESH_REQUEST_REF) {
        META_LIVE_REFRESH_REQUEST_REF.off();
        META_LIVE_REFRESH_REQUEST_REF = null;
    }

    META_LIVE_ACTIVE_CONTEXT = null;
    META_LIVE_CURRENT_SNAPSHOT = null;
    META_LIVE_LAST_HANDLED_REQUEST_AT = 0;
}

function applyMetaLiveSnapshot(snapshotValue, context) {
    if (!snapshotValue || !context) return false;

    if (
        snapshotValue.company !== context.company ||
        snapshotValue.from !== context.period.from ||
        snapshotValue.to !== context.period.to
    ) {
        return false;
    }

    const syncedAt = snapshotValue.syncedAt || snapshotValue.checkedAt || snapshotValue.updatedAt || '';
    const rows = normalizeMetaLiveRows(
        snapshotValue.rows || [],
        context.company,
        context.period,
        syncedAt
    );

    const sameContext = META_LIVE_LAST_APPLIED_KEY === context.requestKey;

    prepareMetaLiveChangedFields(
        META_LIVE_DATA,
        rows,
        sameContext
    );

    META_LIVE_DATA = rows;
    META_LIVE_LAST_APPLIED_KEY = context.requestKey;
    META_LIVE_CURRENT_SNAPSHOT = snapshotValue;
    renderMetaSidebarActivity();
    META_LIVE_STATE = {
        loading: false,
        company: context.company,
        from: context.period.from,
        to: context.period.to,
        key: context.requestKey,
        syncedAt,
        checkedAt: Number(snapshotValue.checkedAt || snapshotValue.updatedAt || 0),
        error: '',
        rowCount: rows.length,
        source: 'firebase_snapshot',
        leader: snapshotValue.writerId === createMetaLiveClientId()
    };

    applyFilters();
    updateMetaLiveStatus(
        'success',
        `Meta Live • ${formatMetaLiveSyncTime(syncedAt)}`
    );

    return true;
}

function bindMetaLiveSnapshot(forceRebind = false) {
    return waitForMetaLiveFirebaseAuth().then(() => (
        bindMetaLiveSnapshotAuthenticated(forceRebind)
    ));
}

function bindMetaLiveSnapshotAuthenticated(forceRebind = false) {
    if (!db) db = getDatabase();
    if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));

    initMetaLiveServerClock();

    let context;
    try {
        context = buildMetaLiveContext();
    } catch (error) {
        return Promise.reject(error);
    }

    if (
        !forceRebind &&
        META_LIVE_ACTIVE_CONTEXT &&
        META_LIVE_ACTIVE_CONTEXT.requestKey === context.requestKey &&
        META_LIVE_SNAPSHOT_REF
    ) {
        return Promise.resolve(context);
    }

    unbindMetaLiveSnapshot();
    META_LIVE_ACTIVE_CONTEXT = context;
    META_LIVE_STATE.key = context.requestKey;
    META_LIVE_STATE.company = context.company;
    META_LIVE_STATE.from = context.period.from;
    META_LIVE_STATE.to = context.period.to;
    META_LIVE_STATE.error = '';

    META_LIVE_SNAPSHOT_REF = db.ref(context.snapshotPath);
    META_LIVE_REFRESH_REQUEST_REF = db.ref(context.requestPath);

    updateMetaLiveStatus(
        'loading',
        `Đang kết nối Firebase • ${context.company} • ${isoToDisplayDate(context.period.from)} - ${isoToDisplayDate(context.period.to)}`
    );

    META_LIVE_SNAPSHOT_REF.on('value', snapshot => {
        if (!META_LIVE_ACTIVE_CONTEXT || META_LIVE_ACTIVE_CONTEXT.requestKey !== context.requestKey) return;

        META_LIVE_PERMISSION_RETRY_KEYS.delete(context.requestKey);
        const value = snapshot.val();
        if (value) {
            applyMetaLiveSnapshot(value, context);
        } else {
            META_LIVE_CURRENT_SNAPSHOT = null;
            META_LIVE_STATE.loading = false;
            updateMetaLiveStatus('loading', 'Chưa có snapshot • đang chọn máy đồng bộ Meta...');
        }
    }, error => {
        if (
            isMetaLivePermissionDeniedError(error) &&
            !META_LIVE_PERMISSION_RETRY_KEYS.has(context.requestKey)
        ) {
            META_LIVE_PERMISSION_RETRY_KEYS.add(context.requestKey);
            updateMetaLiveStatus('loading', 'Đang xác nhận lại quyền Firebase của phiên đăng nhập...');

            const user = getMetaLiveAuthUser();
            const refreshToken = user && typeof user.getIdToken === 'function'
                ? user.getIdToken(true)
                : Promise.resolve('');

            Promise.resolve(refreshToken)
                .catch(() => '')
                .then(() => new Promise(resolve => setTimeout(resolve, 250)))
                .then(() => bindMetaLiveSnapshotAuthenticated(true))
                .catch(retryError => {
                    META_LIVE_STATE.loading = false;
                    META_LIVE_STATE.error = retryError.message || error.message || 'Không đọc được snapshot Firebase.';
                    updateMetaLiveStatus('error', `Lỗi Firebase: ${META_LIVE_STATE.error}`);
                });
            return;
        }

        META_LIVE_STATE.loading = false;
        META_LIVE_STATE.error = error.message || 'Không đọc được snapshot Firebase.';
        updateMetaLiveStatus('error', `Lỗi Firebase: ${META_LIVE_STATE.error}`);
    });

    META_LIVE_REFRESH_REQUEST_REF.on('value', snapshot => {
        if (!META_LIVE_ACTIVE_CONTEXT || META_LIVE_ACTIVE_CONTEXT.requestKey !== context.requestKey) return;

        const request = snapshot.val();
        const requestedAt = Number(request && request.requestedAt || 0);
        const checkedAt = Number(META_LIVE_CURRENT_SNAPSHOT && (META_LIVE_CURRENT_SNAPSHOT.checkedAt || META_LIVE_CURRENT_SNAPSHOT.updatedAt) || 0);

        if (!requestedAt || requestedAt <= META_LIVE_LAST_HANDLED_REQUEST_AT || requestedAt <= checkedAt) return;

        META_LIVE_LAST_HANDLED_REQUEST_AT = requestedAt;
        ensureMetaSnapshotFresh(true, true).catch(error => {
            console.warn('Không xử lý được yêu cầu cập nhật Meta:', error.message);
        });
    });

    return Promise.resolve(context);
}

function releaseMetaLiveLock(lockRef) {
    if (!lockRef) return Promise.resolve();

    const ownerId = createMetaLiveClientId();
    return lockRef.transaction(current => {
        if (current && current.ownerId === ownerId) return null;
        return current;
    }, undefined, false).catch(error => {
        console.warn('Không giải phóng được Meta Live lock:', error.message);
    });
}


function getMetaLiveRawRowKey(row) {
    if (!row) return '';

    const directId = String(
        row.adsetId ||
        row.adset_id ||
        row.id ||
        ''
    ).trim();

    if (directId) return `id:${directId}`;

    return [
        normalizeAdsText(row.campaignName || row.campaign_name || ''),
        normalizeAdsText(row.fullName || row.adsetName || row.adset_name || ''),
        normalizeAdsText(row.employee || ''),
        normalizeAdsText(row.adName || '')
    ].join('||');
}

function getMetaLiveRawBudgetInfo(row) {
    const dailyBudget = Number(row && (row.daily_budget ?? row.dailyBudget) || 0);
    const lifetimeBudget = Number(row && (row.lifetime_budget ?? row.lifetimeBudget) || 0);
    const value = dailyBudget > 0 ? dailyBudget : lifetimeBudget;

    return {
        value,
        type: dailyBudget > 0
            ? 'Ngân sách hằng ngày'
            : (lifetimeBudget > 0 ? 'Ngân sách trọn đời' : 'Ngân sách chiến dịch'),
        usesCampaign: value <= 0
    };
}

function normalizeMetaLiveBudgetHistory(history) {
    return (Array.isArray(history) ? history : Object.values(history || {}))
        .map(entry => ({
            at: String(entry && entry.at || ''),
            atMs: Number(entry && entry.atMs || 0),
            fromBudget: Number(entry && entry.fromBudget || 0),
            toBudget: Number(entry && entry.toBudget || 0),
            increase: Number(entry && entry.increase || 0),
            fromType: String(entry && entry.fromType || ''),
            toType: String(entry && entry.toType || ''),
            fromUsesCampaign: !!(entry && entry.fromUsesCampaign),
            toUsesCampaign: !!(entry && entry.toUsesCampaign)
        }))
        .filter(entry => entry.toBudget > entry.fromBudget)
        .sort((a, b) => Number(a.atMs || 0) - Number(b.atMs || 0))
        .slice(-50);
}

/**
 * Ghép lịch sử tăng ngân sách vào từng nhóm quảng cáo trước khi ghi snapshot.
 * Dữ liệu được lưu ngay trong rows của snapshot hiện tại nên không cần thêm root Firebase.
 */
function mergeMetaLiveBudgetHistory(previousRows, nextRows, syncedAt) {
    const previousMap = new Map();

    (Array.isArray(previousRows) ? previousRows : Object.values(previousRows || {})).forEach(row => {
        const key = getMetaLiveRawRowKey(row);
        if (key) previousMap.set(key, row || {});
    });

    const eventAt = String(syncedAt || new Date().toISOString());
    const eventAtMs = (() => {
        const parsed = new Date(eventAt).getTime();
        return Number.isFinite(parsed) ? parsed : Date.now();
    })();

    return (Array.isArray(nextRows) ? nextRows : Object.values(nextRows || {})).map(sourceRow => {
        const row = { ...(sourceRow || {}) };
        const key = getMetaLiveRawRowKey(row);
        const previousRow = key ? previousMap.get(key) : null;
        const previousHistory = normalizeMetaLiveBudgetHistory(
            previousRow && (previousRow.budget_history || previousRow.budgetHistory)
        );

        if (!previousRow) {
            row.budget_history = previousHistory;
            return row;
        }

        const before = getMetaLiveRawBudgetInfo(previousRow);
        const after = getMetaLiveRawBudgetInfo(row);
        const increased = after.value > before.value;

        if (increased) {
            const signature = [
                before.value,
                after.value,
                before.type,
                after.type,
                eventAt
            ].join('|');
            const duplicated = previousHistory.some(entry => (
                [
                    entry.fromBudget,
                    entry.toBudget,
                    entry.fromType,
                    entry.toType,
                    entry.at
                ].join('|') === signature
            ));

            if (!duplicated) {
                previousHistory.push({
                    at: eventAt,
                    atMs: eventAtMs,
                    fromBudget: before.value,
                    toBudget: after.value,
                    increase: after.value - before.value,
                    fromType: before.type,
                    toType: after.type,
                    fromUsesCampaign: before.usesCampaign,
                    toUsesCampaign: after.usesCampaign
                });
            }
        }

        row.budget_history = normalizeMetaLiveBudgetHistory(previousHistory);
        return row;
    });
}



function getMetaLiveRawAdKey(ad) {
    if (!ad) return '';
    const directId = String(ad.adId || ad.ad_id || ad.id || '').trim();
    if (directId) return `id:${directId}`;
    return [
        normalizeAdsText(ad.campaignName || ad.campaign_name || ''),
        normalizeAdsText(ad.adsetName || ad.adset_name || ''),
        normalizeAdsText(ad.adName || ad.ad_name || '')
    ].join('||');
}

function getMetaLiveRawDeliveryInfo(entity) {
    entity = entity || {};
    const impressions = Number(entity.impressions || 0);
    const linkClicks = getMetaLinkClicksFromRow(entity);
    const spend = Number(entity.spend || 0);
    const messages = Number(entity.messages || 0);
    const purchases = Number(entity.result || 0);
    const hasDeliveryData = (
        entity.has_delivery_data === true ||
        entity.data_state === 'delivered' ||
        spend > 0 ||
        impressions > 0 ||
        Number(entity.reach || 0) > 0 ||
        Number(entity.clicks || 0) > 0 ||
        linkClicks > 0 ||
        messages > 0 ||
        purchases > 0
    );
    const rawStatus = String(
        entity.deleted_from_meta === true
            ? 'DELETED'
            : (
                entity.delivery_status ||
                entity.deliveryStatus ||
                entity.status ||
                entity.effective_status ||
                entity.configured_status ||
                ''
            )
    );
    const displayStatus = resolveMetaLiveDisplayStatus(
        rawStatus,
        hasDeliveryData,
        entity.start_time || entity.run_start || ''
    );

    return {
        status: displayStatus,
        rawStatus,
        effectiveStatus: String(entity.effective_status || entity.raw_effective_status || ''),
        configuredStatus: String(entity.configured_status || entity.raw_configured_status || ''),
        hasDeliveryData
    };
}

function normalizeMetaLiveStatusHistory(history) {
    const normalized = (Array.isArray(history) ? history : Object.values(history || {}))
        .map(entry => {
            const at = String(entry && (entry.at || entry.time || entry.observedAt) || '');
            let atMs = Number(entry && entry.atMs || 0);
            if (!atMs && at) {
                const parsed = new Date(at).getTime();
                if (Number.isFinite(parsed)) atMs = parsed;
            }
            return {
                at,
                atMs,
                status: String(entry && entry.status || ''),
                rawStatus: String(entry && entry.rawStatus || ''),
                effectiveStatus: String(entry && entry.effectiveStatus || ''),
                configuredStatus: String(entry && entry.configuredStatus || ''),
                hasDeliveryData: !!(entry && entry.hasDeliveryData),
                sourceUpdatedAt: String(entry && entry.sourceUpdatedAt || '')
            };
        })
        // V154: dọn lịch sử rác từ các snapshot cũ. Trạng thái rỗng/Không xác định
        // không phải một hoạt động hợp lệ và không được giữ trong sidebar.
        .filter(entry => entry.status && !isMetaLiveUnknownStatus(entry.status) && entry.atMs > 0)
        .sort((a, b) => a.atMs - b.atMs);

    const deduped = [];
    normalized.forEach(entry => {
        const last = deduped[deduped.length - 1];
        const signature = [
            entry.status,
            entry.rawStatus,
            entry.effectiveStatus,
            entry.configuredStatus,
            entry.hasDeliveryData ? '1' : '0'
        ].join('|');
        const lastSignature = last ? [
            last.status,
            last.rawStatus,
            last.effectiveStatus,
            last.configuredStatus,
            last.hasDeliveryData ? '1' : '0'
        ].join('|') : '';

        if (last && signature === lastSignature) {
            // Cùng trạng thái: giữ mốc mới nhất thay vì để thời gian đầu tiên đứng mãi.
            if (entry.atMs >= last.atMs) deduped[deduped.length - 1] = entry;
            return;
        }
        deduped.push(entry);
    });

    return deduped.slice(-META_SIDEBAR_STATUS_HISTORY_LIMIT);
}

function makeMetaLiveStatusHistoryEntry(entity, info, atValue, sourceUpdatedAt) {
    const fallbackAt = String(atValue || new Date().toISOString());
    let atMs = new Date(fallbackAt).getTime();
    if (!Number.isFinite(atMs)) atMs = Date.now();

    return {
        at: new Date(atMs).toISOString(),
        atMs,
        status: info.status,
        rawStatus: info.rawStatus,
        effectiveStatus: info.effectiveStatus,
        configuredStatus: info.configuredStatus,
        hasDeliveryData: info.hasDeliveryData,
        sourceUpdatedAt: String(sourceUpdatedAt || entity.updated_time || entity.updatedAt || '')
    };
}

function appendMetaLiveStatusEvent(history, entity, info, syncedAt, isInitial) {
    const normalized = normalizeMetaLiveStatusHistory(history);
    const last = normalized[normalized.length - 1];
    const currentSignature = [
        info.status,
        info.rawStatus,
        info.effectiveStatus,
        info.configuredStatus,
        info.hasDeliveryData ? '1' : '0'
    ].join('|');
    const lastSignature = last ? [
        last.status,
        last.rawStatus,
        last.effectiveStatus,
        last.configuredStatus,
        last.hasDeliveryData ? '1' : '0'
    ].join('|') : '';

    if (!last || currentSignature !== lastSignature) {
        const sourceUpdatedAt = entity.updated_time || entity.updatedAt || '';
        const initialAt = sourceUpdatedAt || entity.created_time || entity.createdAt || syncedAt;
        normalized.push(makeMetaLiveStatusHistoryEntry(
            entity,
            info,
            isInitial ? initialAt : syncedAt,
            sourceUpdatedAt
        ));
    }

    return normalizeMetaLiveStatusHistory(normalized);
}

/**
 * Lưu dòng thời gian trạng thái của từng nhóm và từng bài ngay trong snapshot.
 * Mốc mới được tạo khi trạng thái giao hàng, trạng thái cấu hình hoặc trạng thái
 * "đã bắt đầu có dữ liệu" thay đổi.
 */
function mergeMetaLiveStatusHistory(previousRows, nextRows, syncedAt) {
    const previousMap = new Map();
    (Array.isArray(previousRows) ? previousRows : Object.values(previousRows || {})).forEach(row => {
        const key = getMetaLiveRawRowKey(row);
        if (key) previousMap.set(key, row || {});
    });

    return (Array.isArray(nextRows) ? nextRows : Object.values(nextRows || {})).map(sourceRow => {
        const row = { ...(sourceRow || {}) };
        const key = getMetaLiveRawRowKey(row);
        const previousRow = key ? previousMap.get(key) : null;
        let rowHistory = normalizeMetaLiveStatusHistory(
            previousRow && (previousRow.status_history || previousRow.statusHistory)
        );

        // Snapshot cũ chưa có lịch sử: khởi tạo trạng thái trước đó trước khi so sánh trạng thái mới.
        if (!rowHistory.length && previousRow) {
            const previousInfo = getMetaLiveRawDeliveryInfo(previousRow);
            rowHistory = appendMetaLiveStatusEvent(rowHistory, previousRow, previousInfo, syncedAt, true);
        }

        const currentInfo = getMetaLiveRawDeliveryInfo(row);
        row.status_history = appendMetaLiveStatusEvent(
            rowHistory,
            row,
            currentInfo,
            syncedAt,
            !previousRow
        );

        const previousAds = new Map();
        const previousAdRows = previousRow
            ? (Array.isArray(previousRow.ads || previousRow.adRows)
                ? (previousRow.ads || previousRow.adRows)
                : Object.values(previousRow.ads || previousRow.adRows || {}))
            : [];
        previousAdRows.forEach(ad => {
            const adKey = getMetaLiveRawAdKey(ad);
            if (adKey) previousAds.set(adKey, ad || {});
        });

        const nextAdRows = Array.isArray(row.ads || row.adRows)
            ? (row.ads || row.adRows)
            : Object.values(row.ads || row.adRows || {});
        row.ads = nextAdRows.map(sourceAd => {
            const ad = { ...(sourceAd || {}) };
            const adKey = getMetaLiveRawAdKey(ad);
            const previousAd = adKey ? previousAds.get(adKey) : null;
            let adHistory = normalizeMetaLiveStatusHistory(
                previousAd && (previousAd.status_history || previousAd.statusHistory)
            );

            if (!adHistory.length && previousAd) {
                const previousAdInfo = getMetaLiveRawDeliveryInfo(previousAd);
                adHistory = appendMetaLiveStatusEvent(adHistory, previousAd, previousAdInfo, syncedAt, true);
            }

            const currentAdInfo = getMetaLiveRawDeliveryInfo(ad);
            ad.status_history = appendMetaLiveStatusEvent(
                adHistory,
                ad,
                currentAdInfo,
                syncedAt,
                !previousAd
            );
            return ad;
        });
        row.adRows = row.ads;
        return row;
    });
}

function publishMetaLiveSnapshot(context, result, lockRef, baseSnapshot = null) {
    if (!result || result.success === false || !result.data) {
        throw new Error(
            result && result.error && result.error.message
                ? result.error.message
                : 'Meta không trả về dữ liệu hợp lệ.'
        );
    }

    const user = getMetaLiveAuthUser();
    const rawRows = Array.isArray(result.data.rows)
        ? result.data.rows
        : Object.values(result.data.rows || {});
    const totals = result.data.totals || {};
    const syncedAt = result.data.syncedAt || new Date().toISOString();
    const contextSnapshot = baseSnapshot || (
        META_LIVE_ACTIVE_CONTEXT &&
        META_LIVE_ACTIVE_CONTEXT.requestKey === context.requestKey
            ? META_LIVE_CURRENT_SNAPSHOT
            : null
    );
    const previousSnapshotRows = contextSnapshot
        ? (contextSnapshot.rows || [])
        : [];
    const rowsWithBudgetHistory = mergeMetaLiveBudgetHistory(
        previousSnapshotRows,
        rawRows,
        syncedAt
    );
    const rowsWithHistories = mergeMetaLiveStatusHistory(
        previousSnapshotRows,
        rowsWithBudgetHistory,
        syncedAt
    );
    const dataHash = metaLiveStableHash({
        company: context.company,
        from: context.period.from,
        to: context.period.to,
        totals,
        rows: rowsWithHistories
    });

    const writerInfo = {
        writerUid: user ? user.uid : '',
        writerId: createMetaLiveClientId(),
        writerName: window.myIdentity || (user && user.email) || 'Marketing System',
        syncedAt,
        checkedAt: firebase.database.ServerValue.TIMESTAMP,
        dataHash
    };

    const snapshotRef = db.ref(context.snapshotPath);
    const currentHash = String(contextSnapshot && contextSnapshot.dataHash || '');

    let writePromise;
    if (currentHash && currentHash === dataHash && contextSnapshot) {
        // Dữ liệu không đổi: chỉ cập nhật metadata nhỏ, không ghi lại toàn bộ rows.
        writePromise = snapshotRef.update(writerInfo);
    } else {
        writePromise = snapshotRef.set({
            version: 1,
            source: 'meta_api',
            company: context.company,
            from: context.period.from,
            to: context.period.to,
            periodKey: context.periodKey,
            totals,
            rows: rowsWithHistories,
            rowCount: rowsWithHistories.length,
            createdAt: contextSnapshot && contextSnapshot.createdAt
                ? contextSnapshot.createdAt
                : firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            ...writerInfo
        });
    }

    return writePromise.then(() => {
        if (
            META_LIVE_ACTIVE_CONTEXT &&
            META_LIVE_ACTIVE_CONTEXT.requestKey === context.requestKey
        ) {
            META_LIVE_STATE.loading = false;
            META_LIVE_STATE.error = '';
            META_LIVE_STATE.leader = true;
        }

        return releaseMetaLiveLock(lockRef).then(() => ({
            company: context.company,
            period: context.period,
            syncedAt,
            rowCount: rowsWithHistories.length,
            changed: currentHash !== dataHash
        }));
    });
}

function fetchAndPublishMetaSnapshot(context, lockRef, silent, baseSnapshot = null) {
    if (typeof window.requestMetaAdsLive !== 'function') {
        return releaseMetaLiveLock(lockRef).then(() => {
            throw new Error('Cầu nối Meta Ads chưa sẵn sàng.');
        });
    }

    if (META_LIVE_IN_FLIGHT[context.requestKey]) {
        return META_LIVE_IN_FLIGHT[context.requestKey];
    }

    const isCurrentContext = () => (
        META_LIVE_ACTIVE_CONTEXT &&
        META_LIVE_ACTIVE_CONTEXT.requestKey === context.requestKey
    );

    if (isCurrentContext()) {
        META_LIVE_STATE.loading = true;
        META_LIVE_STATE.leader = true;
        META_LIVE_STATE.error = '';

        updateMetaLiveStatus(
            'loading',
            `Đang đồng bộ Meta → Firebase • ${context.company}`
        );
    }

    const requestPromise = window.requestMetaAdsLive({
        company: context.company,
        from: context.period.from,
        to: context.period.to,
        force: true
    }).then(result => {
        return publishMetaLiveSnapshot(context, result, lockRef, baseSnapshot);
    }).then(info => {
        if (!info) return null;

        if (!silent && isCurrentContext()) {
            showToast(
                info.changed
                    ? `✅ Đã cập nhật Meta ${info.company} lên Firebase`
                    : `✅ Meta ${info.company} đã là dữ liệu mới nhất`,
                'success'
            );
        }

        return info;
    }).catch(error => {
        if (isCurrentContext()) {
            META_LIVE_STATE.loading = false;
            META_LIVE_STATE.error = error.message || 'Không đồng bộ được Meta Live.';
            META_LIVE_STATE.leader = false;

            updateMetaLiveStatus('error', `Lỗi Meta Live: ${META_LIVE_STATE.error}`);

            if (!silent) showToast(`❌ ${META_LIVE_STATE.error}`, 'error');
        }

        return releaseMetaLiveLock(lockRef).then(() => {
            throw error;
        });
    }).finally(() => {
        delete META_LIVE_IN_FLIGHT[context.requestKey];
    });

    META_LIVE_IN_FLIGHT[context.requestKey] = requestPromise;
    return requestPromise;
}

function tryAcquireMetaLiveLeader(context, silent = true, baseSnapshot = null) {
    const user = getMetaLiveAuthUser();
    if (!user) return Promise.reject(new Error('Bạn chưa đăng nhập Firebase.'));

    /*
     * Không kiểm tra role hoặc permissions.ads tại đây.
     * Guest, view, edit và admin đều được tham gia bầu leader Meta Live.
     * Firebase transaction quyết định duy nhất một máy được đồng bộ.
     */
    const lockRef = db.ref(context.lockPath);
    const ownerId = createMetaLiveClientId();
    const now = getMetaLiveFirebaseNow();

    return lockRef.transaction(current => {
        const currentExpiresAt = Number(current && current.expiresAt || 0);
        const canTakeLock = !current || currentExpiresAt < now || current.ownerId === ownerId;

        if (!canTakeLock) return;

        return {
            ownerUid: user.uid,
            ownerId,
            ownerName: window.myIdentity || user.email || 'Marketing System',
            company: context.company,
            from: context.period.from,
            to: context.period.to,
            acquiredAt: current && current.ownerId === ownerId && current.acquiredAt
                ? current.acquiredAt
                : now,
            heartbeatAt: now,
            expiresAt: now + META_LIVE_LOCK_LEASE_MS
        };
    }, undefined, false).then(result => {
        const lockValue = result.snapshot && result.snapshot.val();
        const isLeader = !!(
            result.committed &&
            lockValue &&
            lockValue.ownerId === ownerId
        );

        if (!isLeader) {
            META_LIVE_STATE.leader = false;
            if (!META_LIVE_CURRENT_SNAPSHOT) {
                updateMetaLiveStatus('loading', 'Một máy khác đang đồng bộ Meta lên Firebase...');
            }
            return null;
        }

        META_LIVE_STATE.leader = true;
        // Không dùng onDisconnect().remove() vì nhiều tab có thể đăng nhập cùng một UID.
        // Nếu tab leader bị đóng đột ngột, lock tự hết hạn sau META_LIVE_LOCK_LEASE_MS.
        return fetchAndPublishMetaSnapshot(context, lockRef, silent, baseSnapshot);
    });
}

function ensureMetaSnapshotFresh(forceRefresh = false, silent = true) {
    if (CURRENT_TAB !== 'performance' && CURRENT_TAB !== 'finance') return Promise.resolve(null);
    if (!db) db = getDatabase();
    if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));

    return bindMetaLiveSnapshot(false).then(context => {
        if (META_LIVE_IN_FLIGHT[context.requestKey]) {
            return META_LIVE_IN_FLIGHT[context.requestKey];
        }

        /*
         * Luôn đọc snapshot một lần trước khi tranh lock.
         * Sau bước này, nếu dữ liệu còn mới thì tất cả tài khoản chỉ đọc.
         * Nếu dữ liệu cũ/chưa có thì mọi tài khoản đã đăng nhập cùng tranh lock;
         * Firebase transaction bảo đảm chỉ một máy thắng và gọi Meta.
         */
        return readMetaLiveSnapshotOnce(context).then(snapshotValue => {
            const currentSnapshot =
                snapshotValue ||
                META_LIVE_CURRENT_SNAPSHOT;

            if (
                !forceRefresh &&
                isMetaSnapshotFresh(currentSnapshot)
            ) {
                return {
                    source: 'firebase_snapshot',
                    fresh: true,
                    snapshot: currentSnapshot
                };
            }

            return tryAcquireMetaLiveLeader(
                context,
                silent
            );
        });
    });
}

function requestSharedMetaLiveRefresh() {
    if (!db) db = getDatabase();
    if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));

    const user = getMetaLiveAuthUser();
    if (!user) return Promise.reject(new Error('Bạn chưa đăng nhập Firebase.'));

    return bindMetaLiveSnapshot(false).then(context => {
        return db.ref(context.requestPath).set({
            requestedAt: firebase.database.ServerValue.TIMESTAMP,
            requestedByUid: user.uid,
            requestedByName: window.myIdentity || user.email || 'Marketing System',
            nonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`
        }).then(() => ensureMetaSnapshotFresh(true, false));
    });
}

function refreshMetaLive(forceRefresh = false, silent = false) {
    if (CURRENT_TAB !== 'performance' && CURRENT_TAB !== 'finance') return Promise.resolve(null);

    let period;
    try {
        period = getMetaLivePeriod();
    } catch (error) {
        META_LIVE_STATE.error = error.message;
        updateMetaLiveStatus('error', error.message);
        if (!silent) showToast(`❌ ${error.message}`, 'error');
        return Promise.reject(error);
    }

    if (forceRefresh) {
        return requestSharedMetaLiveRefresh();
    }

    return bindMetaLiveSnapshot(false)
        .then(() => ensureMetaSnapshotFresh(false, silent))
        .catch(error => {
            META_LIVE_STATE.loading = false;
            META_LIVE_STATE.error = error.message || 'Không tải được Meta Live từ Firebase.';
            updateMetaLiveStatus('error', `Lỗi Meta Live: ${META_LIVE_STATE.error}`);
            if (!silent) showToast(`❌ ${META_LIVE_STATE.error}`, 'error');
            throw error;
        });
}


function scheduleMetaLiveReportRender() {
    clearTimeout(META_LIVE_REPORT_RENDER_TIMER);
    META_LIVE_REPORT_RENDER_TIMER = setTimeout(() => {
        if (CURRENT_TAB === 'report') renderReportPreview();
    }, 80);
}

function rebuildMetaLiveReportData() {
    META_LIVE_REPORT_DATA = COMPANIES.flatMap(company => (
        Array.isArray(META_LIVE_REPORT_ROWS_BY_COMPANY[company.id])
            ? META_LIVE_REPORT_ROWS_BY_COMPANY[company.id].filter(hasMetaLiveDeliveryData)
            : []
    ));
}

function unbindMetaLiveReportSnapshots() {
    Object.keys(META_LIVE_REPORT_REFS).forEach(companyId => {
        const ref = META_LIVE_REPORT_REFS[companyId];
        try {
            if (ref && typeof ref.off === 'function') ref.off();
        } catch (error) {}
    });

    META_LIVE_REPORT_REFS = {};
    META_LIVE_REPORT_ROWS_BY_COMPANY = {};
    META_LIVE_REPORT_DATA = [];
    META_LIVE_REPORT_PERIOD_KEY = '';
}

function bindMetaLiveReportSnapshots(forceRebind = false) {
    return waitForMetaLiveFirebaseAuth().then(() => (
        bindMetaLiveReportSnapshotsAuthenticated(forceRebind)
    ));
}

function bindMetaLiveReportSnapshotsAuthenticated(forceRebind = false) {
    if (!db) db = getDatabase();
    if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));

    const period = getMetaLivePeriod();
    const periodKey = getMetaLivePeriodKey(period);

    if (
        !forceRebind &&
        META_LIVE_REPORT_PERIOD_KEY === periodKey &&
        Object.keys(META_LIVE_REPORT_REFS).length === COMPANIES.length
    ) {
        return Promise.resolve({ period, periodKey });
    }

    unbindMetaLiveReportSnapshots();
    META_LIVE_REPORT_PERIOD_KEY = periodKey;

    COMPANIES.forEach(company => {
        const context = buildMetaLiveContextForCompany(company.id);
        const ref = db.ref(context.snapshotPath);
        META_LIVE_REPORT_REFS[company.id] = ref;

        ref.on('value', snapshot => {
            if (META_LIVE_REPORT_PERIOD_KEY !== periodKey) return;

            const value = snapshot.val();
            if (
                value &&
                value.company === company.id &&
                value.from === period.from &&
                value.to === period.to
            ) {
                const syncedAt = value.syncedAt || value.checkedAt || value.updatedAt || '';
                META_LIVE_REPORT_ROWS_BY_COMPANY[company.id] = normalizeMetaLiveRows(
                    value.rows || [],
                    company.id,
                    period,
                    syncedAt
                );
            } else {
                META_LIVE_REPORT_ROWS_BY_COMPANY[company.id] = [];
            }

            rebuildMetaLiveReportData();
            scheduleMetaLiveReportRender();
        }, error => {
            console.warn(`Không đọc được Meta Live báo cáo ${company.id}:`, error.message);
        });
    });

    return Promise.resolve({ period, periodKey });
}

function ensureMetaSnapshotFreshForContext(context, forceRefresh = false, silent = true) {
    return waitForMetaLiveFirebaseAuth().then(() => (
        ensureMetaSnapshotFreshForContextAuthenticated(context, forceRefresh, silent)
    ));
}

function ensureMetaSnapshotFreshForContextAuthenticated(context, forceRefresh = false, silent = true) {
    if (!db) db = getDatabase();
    if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));

    return db.ref(context.snapshotPath).once('value').then(snapshot => {
        const currentSnapshot = snapshot.val();

        if (!forceRefresh && isMetaSnapshotFresh(currentSnapshot)) {
            return {
                source: 'firebase_snapshot',
                fresh: true,
                snapshot: currentSnapshot
            };
        }

        return tryAcquireMetaLiveLeader(context, silent, currentSnapshot);
    });
}

function refreshMetaLiveReport(forceRefresh = false, silent = true) {
    if (CURRENT_TAB !== 'report') return Promise.resolve(null);
    if (!db) db = getDatabase();
    if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));

    return bindMetaLiveReportSnapshots(false).then(() => {
        // Chạy tuần tự để tránh gọi đồng thời cả 4 tài khoản Meta.
        return COMPANIES.reduce((chain, company) => {
            return chain.then(() => {
                const context = buildMetaLiveContextForCompany(company.id);
                return ensureMetaSnapshotFreshForContext(context, forceRefresh, silent)
                    .catch(error => {
                        console.warn(`Không cập nhật được Meta báo cáo ${company.id}:`, error.message);
                        return null;
                    });
            });
        }, Promise.resolve());
    }).then(() => {
        META_LIVE_REPORT_LAST_REFRESH_AT = Date.now();
        return META_LIVE_REPORT_DATA;
    });
}

function startMetaLiveAutoRefresh() {
    if (!META_LIVE_TIMER) {
        META_LIVE_TIMER = setInterval(() => {
            if (document.hidden) return;

            if (CURRENT_TAB === 'report') {
                const elapsed = Date.now() - Number(META_LIVE_REPORT_LAST_REFRESH_AT || 0);
                if (elapsed < META_LIVE_REPORT_REFRESH_INTERVAL_MS) return;

                refreshMetaLiveReport(false, true).catch(error => {
                    console.warn('Meta Live báo cáo auto refresh:', error.message);
                });
                return;
            }

            if (!isMetaLivePageVisible() || META_LIVE_STATE.loading) return;

            bindMetaLiveSnapshot(false)
                .then(() => ensureMetaSnapshotFresh(false, true))
                .catch(error => {
                    console.warn('Meta Live Firebase auto refresh:', error.message);
                });
        }, META_LIVE_REFRESH_INTERVAL_MS);
    }

    if (!META_LIVE_VISIBILITY_BOUND) {
        META_LIVE_VISIBILITY_BOUND = true;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                unbindMetaLiveSnapshot();
                unbindMetaLiveReportSnapshots();
                return;
            }

            if (CURRENT_TAB === 'report') {
                refreshMetaLiveReport(false, true).catch(error => {
                    console.warn('Không nối lại được Meta Live báo cáo:', error.message);
                });
                return;
            }

            if (isMetaLivePageVisible()) {
                refreshMetaLive(false, true).catch(error => {
                    console.warn('Không nối lại được Meta Live Firebase:', error.message);
                });
            }
        });
    }
}

function getMetaLiveFirebaseStatus() {
    return {
        version: 'V139_DEFAULT_CURRENT_PERIOD',
        clientId: createMetaLiveClientId(),
        refreshMs: META_LIVE_REFRESH_INTERVAL_MS,
        staleAfterMs: META_LIVE_STALE_AFTER_MS,
        changeHighlightMs: META_LIVE_CHANGE_HIGHLIGHT_MS,
        connected: !!META_LIVE_SNAPSHOT_REF,
        context: META_LIVE_ACTIVE_CONTEXT,
        state: { ...META_LIVE_STATE },
        snapshotCheckedAt: META_LIVE_CURRENT_SNAPSHOT
            ? Number(META_LIVE_CURRENT_SNAPSHOT.checkedAt || META_LIVE_CURRENT_SNAPSHOT.updatedAt || 0)
            : 0
    };
}



let REPORT_CAMPAIGN_SORT = { key: 'roas', dir: 'desc' }; // Mặc định Campaign xếp ROAS cao xuống thấp
let REPORT_EMPLOYEE_ROAS_SORT = { key: 'roas', dir: 'desc' }; // Sắp xếp bảng ROAS theo Chiến dịch / Nhân sự


// NGƯỠNG CHUẨN MEDIA BUYING V89
const ADS_TEST_BUDGET_DEFAULT = 500000;
const ADS_CPA_TARGET_DEFAULT = 50000;
const ADS_ROAS_SAFE_THRESHOLD = 5.0;



// HÀM CHỐNG LỖI HTML INJECTION KHI TÊN AD CÓ CHỨA KÝ TỰ <, >

function escapeHtml(unsafe) {

    return (unsafe || "").toString()

         .replace(/&/g, "&amp;")

         .replace(/</g, "&lt;")

         .replace(/>/g, "&gt;")

         .replace(/"/g, "&quot;")

         .replace(/'/g, "&#039;");

}



function initAdsAnalysis() {

    console.log("Ads Module V156 Report ROAS Personnel Loaded");

    db = getDatabase();

    

    injectCustomStyles();

    // V139: trước khi dựng giao diện, đặt kỳ mặc định là ngày 01 đến hôm nay.
    applyCurrentMonthToDateDefaults(false);
    resetInterface();
    syncPeriodFilterControls();
    startDefaultPeriodWatcher();
    setTimeout(setupMetaLiveSmartSearch, 0);



    const inputAds = document.getElementById('ads-file-input');

    if(inputAds) {

        const newInput = inputAds.cloneNode(true);

        inputAds.parentNode.replaceChild(newInput, inputAds);

        newInput.addEventListener('change', handleFirebaseUpload);

    }



    if(db) {
        waitForMetaLiveFirebaseAuth()
            .then(() => {
                loadUploadHistory();
                loadAdsData();
            })
            .catch(error => {
                console.warn('Chưa thể mở dữ liệu Ads sau đăng nhập:', error.message);
            });
    }

    window.refreshMetaAdsLive = function(forceRefresh) {
        return refreshMetaLive(forceRefresh === true, false).catch(error => {
            console.warn('Meta Live:', error.message);
            return null;
        });
    };

    window.getMetaLiveFirebaseStatus = getMetaLiveFirebaseStatus;
    window.waitForMetaLiveFirebaseAuth = waitForMetaLiveFirebaseAuth;
    window.clearMetaLiveSmartSearch = clearMetaLiveSmartSearch;
    window.removeMetaLiveSearchToken = removeMetaLiveSearchToken;
    window.resetMetaLiveFirebaseListener = function() {
        unbindMetaLiveSnapshot();
        return refreshMetaLive(false, true);
    };

    startMetaLiveAutoRefresh();

    if (CURRENT_TAB === 'performance') {
        setTimeout(() => {
            refreshMetaLive(false, true).catch(error => {
                console.warn('Không khởi tạo được Meta Live:', error.message);
            });
        }, 120);
    }

    

    window.deleteUploadBatch = deleteUploadBatch;

    window.selectUploadBatch = selectUploadBatch;

    window.viewAllData = viewAllData;

    window.switchAdsTab = switchAdsTab;

    window.changeCompany = changeCompany;

    window.toggleHistoryView = toggleHistoryView;

    window.searchHistory = searchHistory;

    window.exportFinanceToExcel = exportFinanceToExcel; 

    window.toggleExportHistory = toggleExportHistory;
    window.toggleAdsSidebar = toggleAdsSidebar;
    window.toggleDataHistory = toggleDataHistory;

    

    window.handleRevenueUpload = handleRevenueUpload;

    window.handleStatementUpload = handleStatementUpload;



    window.changeViewMode = function(mode) {

        VIEW_MODE = mode;

        if (mode === 'employee') {

            SORT_MODE = 'spend'; 

        } else if (mode === 'product') {

            SORT_MODE = 'purchases'; 

        }

        const sortEl = document.getElementById('sort-mode-selector');

        if (sortEl) sortEl.value = SORT_MODE;

        applyFilters();

    };



    window.changeSortMode = function(mode) {

        SORT_MODE = mode;

        applyFilters();

    };



    window.applyReportMonthFilter = function() {
    PERIOD_FILTER_USER_CHANGED = true;
    const selectedMonth = document.getElementById('report-month-filter').value;
    const range = syncSelectedReportMonthToDateRange(selectedMonth);

    if (range) {
        ACTIVE_BATCH_ID = null;
        USER_EXPLICIT_VIEW_ALL = true;
        renderHistoryUI();
    }

    if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        ACTIVE_BATCH_ID = null;
        refreshMetaLive(true, false).catch(() => {});
        return;
    }

    applyFilters();

    if (CURRENT_TAB === 'report') {
        refreshMetaLiveReport(true, true).catch(() => {});
        renderReportPreview();
    }
};

window.applyDateFilter = function() {
    PERIOD_FILTER_USER_CHANGED = true;
    DATE_FROM = document.getElementById('date-from').value;
    DATE_TO = document.getElementById('date-to').value;

    REPORT_MONTH = '';

    const monthEl = document.getElementById('report-month-filter');
    if (monthEl) monthEl.value = '';

    if (DATE_FROM || DATE_TO) {
        ACTIVE_BATCH_ID = null;
        USER_EXPLICIT_VIEW_ALL = true;
        renderHistoryUI();
    }

    if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        ACTIVE_BATCH_ID = null;
        refreshMetaLive(true, false).catch(() => {});
        return;
    }

    applyFilters();

    if (CURRENT_TAB === 'report') {
        refreshMetaLiveReport(true, true).catch(() => {});
        renderReportPreview();
    }
};

window.clearDateFilter = function() {
    // V139: “Xóa lọc” đưa hệ thống về kỳ mặc định hiện tại, không để trống.
    PERIOD_FILTER_USER_CHANGED = false;
    ACTIVE_BATCH_ID = null;
    USER_EXPLICIT_VIEW_ALL = true;
    applyCurrentMonthToDateDefaults(true);

    updateHistoryAndExport();

    if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        refreshMetaLive(true, false).catch(() => {});
        return;
    }

    applyFilters();

    if (CURRENT_TAB === 'report') {
        refreshMetaLiveReport(true, true).catch(() => {});
        renderReportPreview();
    }
};


window.changeReportPeriod = function(value) {
    PERIOD_FILTER_USER_CHANGED = true;
    let selectedValue = value;

    if (value === 'latest') {
        const months = Array.from(new Set([
            getLocalIsoDate(new Date()).slice(0, 7),
            ...Object.values(RAW_UPLOAD_LOGS)
                .map(log => getLogReportMonth(log))
                .filter(Boolean)
        ].filter(Boolean))).sort((a, b) => b.localeCompare(a));

        selectedValue = months[0] || '';
        window.CURRENT_REPORT_PERIOD = selectedValue || 'latest';
    } else {
        window.CURRENT_REPORT_PERIOD = value;
    }

    if (selectedValue) {
        syncSelectedReportMonthToDateRange(selectedValue);
        ACTIVE_BATCH_ID = null;
        USER_EXPLICIT_VIEW_ALL = true;
    }

    applyFilters();
    renderHistoryUI();
    refreshMetaLiveReport(true, true).catch(() => {});
    renderReportPreview();
};



    window.triggerRevenueUpload = () => {

        if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");

        try { buildMetaLiveContextForCompany(CURRENT_COMPANY); }
        catch (error) { return showToast(error.message, 'error'); }

        const input = document.getElementById('revenue-file-input');

        if(input) input.click();

    };

    

    window.triggerStatementUpload = () => {

        if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");

        try { buildMetaLiveContextForCompany(CURRENT_COMPANY); }
        catch (error) { return showToast(error.message, 'error'); }

        const input = document.getElementById('statement-file-input');

        if(input) input.click();

    };



    enforceGuestRestrictions();

}



function isGuestMode() { return (window.myIdentity && window.myIdentity.includes("Khách")); }

function isViewOnlyMode() { return (window.USER_PERMISSIONS && window.USER_PERMISSIONS.ads === 'view'); }

function isSuperAdmin() {

    if (window.myIdentity === "SUPER_ADMIN") return true;

    if (window.SYS_DB_USERS) {

        for (let k in window.SYS_DB_USERS) {

            if (window.SYS_DB_USERS[k].name === window.myIdentity && window.SYS_DB_USERS[k].role === 'admin') return true;

        }

    }

    return false;

}



function enforceGuestRestrictions() {

    setTimeout(() => {

        if (isGuestMode() || isViewOnlyMode()) {

            const upArea = document.getElementById('ads-upload-area');

            if(upArea) upArea.style.display = 'none';

            const upRow = document.getElementById('upload-buttons-row');

            if(upRow) upRow.style.display = 'none';

            document.querySelectorAll('.delete-btn-admin').forEach(btn => btn.style.display = 'none');

        }

    }, 500);

}



function formatDateTime(isoString) {

    if(!isoString) return "";

    const d = new Date(isoString);

    if(isNaN(d)) return "";

    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function parseExcelDateToISO(input) {
    if (input === null || input === undefined || input === '') return '';

    if (typeof input === 'number') {
        const utcDays = Math.floor(input - 25569);
        const date = new Date(utcDays * 86400 * 1000);
        if (isNaN(date.getTime())) return '';

        return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
    }

    let str = input.toString().trim();
    if (!str || str.toLowerCase().includes('đang diễn ra') || str.toLowerCase().includes('ongoing')) return '';

    str = str.split(/[ T]/)[0];

    let m = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

    m = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

    return '';
}

function getMonthFromISO(isoDate) {
    return isoDate ? isoDate.slice(0, 7) : '';
}

function getBatchReportInfo(parsedRows) {
    const starts = parsedRows.map(x => x.report_start_iso).filter(Boolean).sort();
    const ends = parsedRows.map(x => x.report_end_iso).filter(Boolean).sort();

    const reportStart = starts[0] || '';
    const reportEnd = ends[ends.length - 1] || reportStart;
    const reportMonth = getMonthFromISO(reportEnd || reportStart);

    return {
        reportStart,
        reportEnd,
        reportMonth,
        reportLabel: reportMonth ? `Tháng ${reportMonth.slice(5, 7)}/${reportMonth.slice(0, 4)}` : 'Chưa xác định kỳ báo cáo'
    };
}

function getLogReportMonth(log) {
    if (!log) return '';

    return log.reportMonth 
        || (log.reportEnd ? log.reportEnd.slice(0, 7) : '')
        || (log.reportStart ? log.reportStart.slice(0, 7) : '')
        || (log.timestamp ? log.timestamp.slice(0, 7) : '');
}

function isLogInReportRange(log, from, to) {
    const start = log.reportStart || (log.timestamp ? log.timestamp.slice(0, 10) : '');
    const end = log.reportEnd || start;

    if (!start && !end) return false;

    const fromDate = from || '0000-01-01';
    const toDate = to || '9999-12-31';

    return start <= toDate && end >= fromDate;
}

function getLatestBatchIdsByReport({ companyId = null, month = '', from = '', to = '', groupByMonth = false } = {}) {
    const list = Object.entries(RAW_UPLOAD_LOGS)
        .filter(([key, log]) => !companyId || log.company === companyId)
        .filter(([key, log]) => {
            if (month) return getLogReportMonth(log) === month;
            if (from || to) return isLogInReportRange(log, from, to);
            return true;
        })
        .sort((a, b) => new Date(b[1].timestamp || 0) - new Date(a[1].timestamp || 0));

    const latestMap = {};

    list.forEach(([key, log]) => {
        const reportMonth = getLogReportMonth(log);
        const groupKey = `${log.company || 'UNKNOWN'}${groupByMonth ? '||' + reportMonth : ''}`;

        if (!latestMap[groupKey]) {
            latestMap[groupKey] = key;
        }
    });

    return Object.values(latestMap);
}


function normalizeRevenueMatchText(value) {
    return (value === null || value === undefined ? '' : value.toString())
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanRevenueAdName(value) {
    return (value === null || value === undefined ? '' : value.toString())
        .replace(/\([^)]+\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildRevenueMatchKey(employeeName, adName = '', hasAdColumn = false) {
    const employeeKey = normalizeRevenueMatchText(employeeName);
    if (!employeeKey) return '';

    if (!hasAdColumn) return `FULL||${employeeKey}`;

    const adKey = normalizeRevenueMatchText(cleanRevenueAdName(adName));
    return adKey ? `EMP_AD||${employeeKey}||${adKey}` : '';
}


function normalizeFirebaseList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
    return [];
}


function normalizeLegacyFinanceCompany(value) {
    const company = String(value || '').trim().toUpperCase();
    if (company === 'VIETNHAT' || company === 'VIET_NHAT') return 'VN';
    return company;
}

function getLegacyFinanceBatchRowsMap() {
    const map = new Map();
    (Array.isArray(GLOBAL_ADS_DATA) ? GLOBAL_ADS_DATA : []).forEach(item => {
        const batchId = String(item && item.batchId || '');
        if (!batchId) return;
        if (!map.has(batchId)) map.set(batchId, []);
        map.get(batchId).push(item || {});
    });
    return map;
}

function extractLegacyFinancePeriodFromText(value) {
    const text = String(value || '').trim();
    if (!text) return null;

    const dates = [];
    const pushDate = (year, month, day) => {
        const y = Number(year);
        const m = Number(month);
        const d = Number(day);
        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return;
        if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return;
        const date = new Date(Date.UTC(y, m - 1, d));
        if (date.getUTCFullYear() !== y || date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) return;
        dates.push(`${y}-${pad2(m)}-${pad2(d)}`);
    };

    let match;
    const dmy = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g;
    while ((match = dmy.exec(text))) pushDate(match[3], match[2], match[1]);

    const ymd = /(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/g;
    while ((match = ymd.exec(text))) pushDate(match[1], match[2], match[3]);

    if (dates.length) {
        const uniqueDates = Array.from(new Set(dates)).sort();
        return {
            from: uniqueDates[0],
            to: uniqueDates[uniqueDates.length - 1],
            source: 'filename_date_range'
        };
    }

    const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .toLowerCase();

    const monthPatterns = [
        /(?:thang|month)\s*(\d{1,2})\s*[.\/-]?\s*(\d{4})/,
        /\b(0?[1-9]|1[0-2])[.\/-](\d{4})\b/
    ];

    for (const pattern of monthPatterns) {
        const monthMatch = normalized.match(pattern);
        if (!monthMatch) continue;
        const month = Number(monthMatch[1]);
        const year = Number(monthMatch[2]);
        if (year < 2000 || year > 2100 || month < 1 || month > 12) continue;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return {
            from: `${year}-${pad2(month)}-01`,
            to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
            source: 'filename_month'
        };
    }

    return null;
}

function resolveLegacyFinancePeriod(log, rows) {
    const starts = [];
    const ends = [];
    const addStart = value => {
        const iso = parseExcelDateToISO(value) || String(value || '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) starts.push(iso);
    };
    const addEnd = value => {
        const iso = parseExcelDateToISO(value) || String(value || '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) ends.push(iso);
    };

    addStart(log && log.reportStart);
    addEnd(log && log.reportEnd);

    (Array.isArray(rows) ? rows : []).forEach(row => {
        addStart(row && (row.report_start_iso || row.report_start));
        addEnd(row && (row.report_end_iso || row.report_end));
    });

    starts.sort();
    ends.sort();

    let from = starts[0] || '';
    let to = ends[ends.length - 1] || from;
    let periodSource = (from || to) ? 'report_data' : '';

    // Dữ liệu cũ có thể được upload sang đầu tháng sau. Khi thiếu reportStart/reportEnd,
    // phải xác định kỳ từ tên file chi phí/doanh thu/sao kê, tuyệt đối không lấy tháng upload trước.
    if (!from || !to) {
        const fileCandidates = [
            log && log.fileName,
            log && log.revenueFileName,
            log && log.statementFileName,
            log && log.reportLabel
        ].filter(Boolean);

        for (const candidate of fileCandidates) {
            const inferred = extractLegacyFinancePeriodFromText(candidate);
            if (!inferred) continue;
            from = from || inferred.from;
            to = to || inferred.to || inferred.from;
            periodSource = inferred.source;
            break;
        }
    }

    // Timestamp chỉ là phương án cuối cùng cho record quá cũ không còn bất kỳ dấu vết kỳ báo cáo nào.
    if (!from && log && log.timestamp) {
        from = String(log.timestamp).slice(0, 10);
        to = from;
        periodSource = 'upload_timestamp_fallback';
    }

    if (!from || !to) return null;
    if (to < from) {
        const temp = from;
        from = to;
        to = temp;
    }

    return {
        from,
        to,
        periodKey: `${from}_${to}`,
        monthKey: String(to || from).slice(0, 7),
        source: periodSource || 'unknown'
    };
}

function getLegacyFinancePartTime(log, type) {
    const raw = type === 'revenue'
        ? (log && (log.revenueTime || log.timestamp))
        : (log && (log.statementTime || log.timestamp));
    const time = new Date(raw || 0).getTime();
    return Number.isFinite(time) ? time : 0;
}

function buildLegacyRevenueSource(log, batchId, rows, company, period) {
    const groups = new Map();
    let total = 0;

    (Array.isArray(rows) ? rows : []).forEach(row => {
        const revenue = parseCleanNumber(row && row.revenue);
        if (!Number.isFinite(revenue) || revenue === 0) return;

        const employeeName = String(row && row.employee || '').trim();
        const adName = String(row && (row.adName || row.cleanAdName) || '').trim();
        const fullName = String(row && row.fullName || '').trim();

        let matchKey = buildRevenueMatchKey(employeeName, adName, true);
        let effectiveEmployee = employeeName;
        let effectiveAdName = adName;

        if (!matchKey && fullName) {
            matchKey = buildRevenueMatchKey(fullName, '', false);
            effectiveEmployee = fullName;
            effectiveAdName = '';
        }
        if (!matchKey) return;

        const old = groups.get(matchKey) || {
            matchKey,
            employeeName: effectiveEmployee,
            adName: effectiveAdName,
            fullName: fullName || `${effectiveEmployee || ''} - ${effectiveAdName || ''}`,
            revenue: 0
        };
        old.revenue += revenue;
        groups.set(matchKey, old);
        total += revenue;
    });

    const entries = Array.from(groups.values());
    const hasAdColumn = entries.some(entry => !!String(entry.adName || '').trim());

    return {
        fileName: String(log && log.revenueFileName || log && log.fileName || 'Doanh thu đã chuyển từ dữ liệu cũ'),
        time: String(log && (log.revenueTime || log.timestamp) || new Date().toISOString()),
        uploader: String(log && log.revenueUploader || log && log.uploader || 'Dữ liệu hệ thống cũ'),
        company,
        from: period.from,
        to: period.to,
        periodKey: period.periodKey,
        hasAdColumn,
        sourceRowCount: Number(log && log.revenueSourceRowCount || entries.length),
        uniqueMatchCount: entries.length,
        total,
        entries,
        sourceMode: 'legacy_migrated_from_ads_data',
        migrationVersion: META_LIVE_LEGACY_FINANCE_MIGRATION_VERSION,
        legacyBatchId: String(batchId || ''),
        legacyCostFileName: String(log && log.fileName || ''),
        migratedFromLegacy: true
    };
}

function buildLegacyStatementSource(log, batchId, company, period, rows) {
    const total = parseCleanNumber(log && log.statementTotal);
    const oldMetaWithVat = (Array.isArray(rows) ? rows : []).reduce(
        (sum, row) => sum + Number(row && row.spend || 0) * 1.1,
        0
    );

    return {
        fileName: String(log && log.statementFileName || 'Sao kê đã chuyển từ dữ liệu cũ'),
        time: String(log && (log.statementTime || log.timestamp) || new Date().toISOString()),
        uploader: String(log && log.statementUploader || log && log.uploader || 'Dữ liệu hệ thống cũ'),
        company,
        from: period.from,
        to: period.to,
        periodKey: period.periodKey,
        total,
        sourceRowCount: Number(log && log.statementSourceRowCount || 0),
        metaCostWithVatAtUpload: oldMetaWithVat,
        feeDifferenceAtUpload: Math.max(total - oldMetaWithVat, 0),
        sourceMode: 'legacy_migrated_from_upload_log',
        migrationVersion: META_LIVE_LEGACY_FINANCE_MIGRATION_VERSION,
        legacyBatchId: String(batchId || ''),
        legacyCostFileName: String(log && log.fileName || ''),
        migratedFromLegacy: true
    };
}

function rebuildLegacyFinanceSources() {
    const rowsByBatch = getLegacyFinanceBatchRowsMap();
    const latestByMonth = new Map();

    Object.entries(RAW_UPLOAD_LOGS || {}).forEach(([batchId, log]) => {
        if (batchId === META_LIVE_FINANCE_SOURCE_NODE || !log || typeof log !== 'object') return;

        const rows = rowsByBatch.get(String(batchId)) || [];
        const company = normalizeLegacyFinanceCompany(log.company || (rows[0] && rows[0].company));
        if (!company) return;

        const period = resolveLegacyFinancePeriod(log, rows);
        if (!period) return;

        // File cũ được chọn theo công ty + tháng dữ liệu thực tế, không theo ngày upload.
        // Trong mỗi tháng, doanh thu và sao kê được chọn độc lập theo lần cập nhật cuối cùng.
        const monthKey = period.monthKey || String(period.to || period.from).slice(0, 7);
        const groupKey = `${company}||${monthKey}`;
        const current = latestByMonth.get(groupKey) || {
            company,
            monthKey,
            revenue: null,
            statement: null
        };

        const hasLegacyRevenue = !!(
            log.revenueFileName ||
            log.revenueUploaded === true ||
            log.revenueTime ||
            rows.some(row => Number(row && row.revenue || 0) !== 0)
        );
        if (hasLegacyRevenue) {
            const sortTime = getLegacyFinancePartTime(log, 'revenue');
            if (!current.revenue || sortTime >= current.revenue.sortTime) {
                current.revenue = {
                    sortTime,
                    batchId: String(batchId),
                    period,
                    source: buildLegacyRevenueSource(log, batchId, rows, company, period)
                };
            }
        }

        const hasLegacyStatement = !!(
            log.statementFileName ||
            log.statementTime ||
            Object.prototype.hasOwnProperty.call(log, 'statementTotal')
        );
        if (hasLegacyStatement) {
            const sortTime = getLegacyFinancePartTime(log, 'statement');
            if (!current.statement || sortTime >= current.statement.sortTime) {
                current.statement = {
                    sortTime,
                    batchId: String(batchId),
                    period,
                    source: buildLegacyStatementSource(log, batchId, company, period, rows)
                };
            }
        }

        latestByMonth.set(groupKey, current);
    });

    const result = {};
    latestByMonth.forEach(item => {
        if (!item.revenue && !item.statement) return;
        result[item.company] = result[item.company] || {};

        if (item.revenue) {
            const periodKey = item.revenue.period.periodKey;
            result[item.company][periodKey] = result[item.company][periodKey] || {};
            result[item.company][periodKey].revenue = {
                ...item.revenue.source,
                determinedMonth: item.monthKey,
                periodSource: item.revenue.period.source || ''
            };
        }

        if (item.statement) {
            const periodKey = item.statement.period.periodKey;
            result[item.company][periodKey] = result[item.company][periodKey] || {};
            result[item.company][periodKey].statement = {
                ...item.statement.source,
                determinedMonth: item.monthKey,
                periodSource: item.statement.period.source || ''
            };
        }
    });

    META_LIVE_LEGACY_FINANCE_SOURCES = result;
    return result;
}

function parseMetaLiveFinancePeriodKey(periodKey) {
    const match = String(periodKey || '').match(/^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/);
    return match ? { from: match[1], to: match[2] } : null;
}

function findLegacyFinancePart(company, periodKey, type) {
    const companySources = META_LIVE_LEGACY_FINANCE_SOURCES && META_LIVE_LEGACY_FINANCE_SOURCES[company];
    if (!companySources) return null;

    const desired = parseMetaLiveFinancePeriodKey(periodKey);
    if (!desired) return null;
    const desiredMonth = desired.to.slice(0, 7);

    // Không ưu tiên mù quáng periodKey trùng tuyệt đối vì file 01→31 có thể cũ hơn
    // file 01→24 được cập nhật sau. Quy tắc là file cuối cùng được xác định thuộc tháng đó.
    return Object.values(companySources)
        .map(source => source && source[type])
        .filter(Boolean)
        .filter(source => {
            const sourceMonth = String(source.determinedMonth || source.to || source.from || '').slice(0, 7);
            return sourceMonth === desiredMonth;
        })
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0] || null;
}


function findMigratedFinancePartInCurrentSources(companySources, periodKey, type) {
    if (!companySources || typeof companySources !== 'object') return null;

    const desired = parseMetaLiveFinancePeriodKey(periodKey);
    if (!desired) return null;
    const desiredMonth = desired.to.slice(0, 7);

    return Object.values(companySources)
        .map(source => source && source[type])
        .filter(Boolean)
        .filter(source => source.migratedFromLegacy === true)
        .filter(source => {
            const sourceMonth = String(source.determinedMonth || source.to || source.from || '').slice(0, 7);
            return sourceMonth === desiredMonth;
        })
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0] || null;
}

function getFinanceRevenueSourceEntries(source) {
    return normalizeFirebaseList(source && source.entries)
        .filter(entry => Number(entry && (entry.revenue ?? entry.amount) || 0) !== 0);
}

function isUsableFinanceRevenueSource(source) {
    return !!(source && getFinanceRevenueSourceEntries(source).length > 0);
}

function shouldRepairMigratedRevenueSource(currentSource, nextSource) {
    if (!isUsableFinanceRevenueSource(nextSource)) return false;
    if (!currentSource) return true;
    if (currentSource.migratedFromLegacy !== true) return false;

    const currentEntries = getFinanceRevenueSourceEntries(currentSource);
    const nextEntries = getFinanceRevenueSourceEntries(nextSource);
    const currentTotal = Number(currentSource.total || 0);
    const nextTotal = Number(nextSource.total || 0);
    const currentTime = new Date(currentSource.time || 0).getTime() || 0;
    const nextTime = new Date(nextSource.time || 0).getTime() || 0;
    const currentMonth = String(currentSource.determinedMonth || currentSource.to || currentSource.from || '').slice(0, 7);
    const nextMonth = String(nextSource.determinedMonth || nextSource.to || nextSource.from || '').slice(0, 7);

    return currentEntries.length === 0 ||
        currentMonth !== nextMonth ||
        nextTime > currentTime ||
        String(currentSource.legacyBatchId || '') !== String(nextSource.legacyBatchId || '') ||
        nextEntries.length > currentEntries.length ||
        (currentTotal === 0 && nextTotal !== 0);
}

function isUsableFinanceStatementSource(source) {
    if (!source || typeof source !== 'object') return false;
    const total = Number(source.total);
    return Number.isFinite(total) && !!(
        source.fileName ||
        source.time ||
        source.legacyBatchId ||
        total !== 0
    );
}

function shouldRepairMigratedStatementSource(currentSource, nextSource) {
    if (!isUsableFinanceStatementSource(nextSource)) return false;
    if (!currentSource) return true;
    if (currentSource.migratedFromLegacy !== true) return false;

    const currentTime = new Date(currentSource.time || 0).getTime() || 0;
    const nextTime = new Date(nextSource.time || 0).getTime() || 0;
    const currentMonth = String(currentSource.determinedMonth || currentSource.to || currentSource.from || '').slice(0, 7);
    const nextMonth = String(nextSource.determinedMonth || nextSource.to || nextSource.from || '').slice(0, 7);
    const currentTotal = Number(currentSource.total || 0);
    const nextTotal = Number(nextSource.total || 0);

    return currentMonth !== nextMonth ||
        nextTime > currentTime ||
        (currentTotal === 0 && nextTotal !== 0) ||
        String(currentSource.legacyBatchId || '') !== String(nextSource.legacyBatchId || '');
}

function getCanonicalLegacyPeriodForBatch(batchId) {
    const log = RAW_UPLOAD_LOGS && RAW_UPLOAD_LOGS[String(batchId)];
    if (!log || typeof log !== 'object') return null;
    const rows = getLegacyFinanceBatchRowsMap().get(String(batchId)) || [];
    return resolveLegacyFinancePeriod(log, rows);
}

function canMigrateLegacyFinanceSources() {
    if (!db) return false;
    try {
        if (typeof isGuestMode === 'function' && isGuestMode()) return false;
        if (typeof isViewOnlyMode === 'function' && isViewOnlyMode()) return false;
        if (window.MKTRBAC && typeof window.MKTRBAC.canEdit === 'function' && !window.MKTRBAC.canEdit('ads')) return false;
    } catch (error) {
        return false;
    }
    return true;
}

function migrateLegacyFinanceSources() {
    rebuildLegacyFinanceSources();
    if (!META_LIVE_LEGACY_ADS_DATA_READY) return Promise.resolve(false);
    if (!canMigrateLegacyFinanceSources() || META_LIVE_FINANCE_MIGRATION_RUNNING) return Promise.resolve(false);

    const currentSources = RAW_UPLOAD_LOGS && RAW_UPLOAD_LOGS[META_LIVE_FINANCE_SOURCE_NODE] || {};
    const updates = {};
    let revenueCount = 0;
    let statementCount = 0;

    Object.entries(META_LIVE_LEGACY_FINANCE_SOURCES || {}).forEach(([company, periods]) => {
        Object.entries(periods || {}).forEach(([periodKey, source]) => {
            const current = currentSources && currentSources[company] && currentSources[company][periodKey] || {};

            if (source.revenue && shouldRepairMigratedRevenueSource(current.revenue, source.revenue)) {
                updates[`/upload_logs/${META_LIVE_FINANCE_SOURCE_NODE}/${company}/${periodKey}/revenue`] = {
                    ...source.revenue,
                    migratedAt: new Date().toISOString(),
                    repairedEmptyMigration: !!current.revenue
                };
                revenueCount++;
            }

            if (source.statement && shouldRepairMigratedStatementSource(current.statement, source.statement)) {
                updates[`/upload_logs/${META_LIVE_FINANCE_SOURCE_NODE}/${company}/${periodKey}/statement`] = {
                    ...source.statement,
                    migratedAt: new Date().toISOString(),
                    repairedLegacyStatement: !!current.statement
                };
                statementCount++;
            }
        });
    });

    // V143: dọn các nguồn migrated cũ bị lưu nhầm vào tháng upload.
    // Chỉ xóa record do migration tạo; nguồn người dùng upload theo cơ chế mới không bị đụng tới.
    Object.entries(currentSources || {}).forEach(([company, periods]) => {
        Object.entries(periods || {}).forEach(([storedPeriodKey, parts]) => {
            ['revenue', 'statement'].forEach(type => {
                const part = parts && parts[type];
                if (!part || part.migratedFromLegacy !== true || !part.legacyBatchId) return;
                const canonicalPeriod = getCanonicalLegacyPeriodForBatch(part.legacyBatchId);
                if (!canonicalPeriod || canonicalPeriod.periodKey === storedPeriodKey) return;
                updates[`/upload_logs/${META_LIVE_FINANCE_SOURCE_NODE}/${company}/${storedPeriodKey}/${type}`] = null;
            });
        });
    });

    const paths = Object.keys(updates).sort();
    if (!paths.length) return Promise.resolve(false);

    const signature = paths.join('|');
    if (signature === META_LIVE_FINANCE_MIGRATION_LAST_SIGNATURE) return Promise.resolve(false);

    META_LIVE_FINANCE_MIGRATION_LAST_SIGNATURE = signature;
    META_LIVE_FINANCE_MIGRATION_RUNNING = true;

    return db.ref().update(updates).then(() => {
        console.info(`V143: Đã chuyển và sửa ${revenueCount} nguồn doanh thu và ${statementCount} nguồn sao kê cũ sang cấu trúc Meta Live.`);
        return true;
    }).catch(error => {
        META_LIVE_FINANCE_MIGRATION_LAST_SIGNATURE = '';
        console.warn('V143: Không thể tự chuyển dữ liệu tài chính cũ:', error && error.message ? error.message : error);
        return false;
    }).finally(() => {
        META_LIVE_FINANCE_MIGRATION_RUNNING = false;
    });
}

function scheduleLegacyFinanceSourceMigration() {
    rebuildLegacyFinanceSources();
    clearTimeout(META_LIVE_FINANCE_MIGRATION_TIMER);
    META_LIVE_FINANCE_MIGRATION_TIMER = setTimeout(() => {
        migrateLegacyFinanceSources();
        try { applyFilters(); } catch (error) {}
        try { renderMetaLiveFinanceSourceStatus(); } catch (error) {}
    }, 350);
}

function getMetaLiveFinanceContext(companyId = CURRENT_COMPANY) {
    const context = buildMetaLiveContextForCompany(companyId);
    return {
        ...context,
        sourcePath: `upload_logs/${META_LIVE_FINANCE_SOURCE_NODE}/${context.company}/${context.periodKey}`
    };
}

function getFinanceSourceTime(source) {
    const value = new Date(source && source.time || 0).getTime();
    return Number.isFinite(value) ? value : 0;
}

function chooseLatestLegacyFinancePart(candidates, type) {
    const usable = (Array.isArray(candidates) ? candidates : [])
        .filter(Boolean)
        .filter(source => type === 'revenue'
            ? isUsableFinanceRevenueSource(source)
            : isUsableFinanceStatementSource(source));

    usable.sort((a, b) => getFinanceSourceTime(b) - getFinanceSourceTime(a));
    return usable[0] || null;
}

function getMetaLiveFinanceSource(companyId = CURRENT_COMPANY, explicitPeriodKey = '') {
    const company = normalizeLegacyFinanceCompany(companyId || CURRENT_COMPANY || 'NNV');
    let periodKey = explicitPeriodKey;

    if (!periodKey) {
        try { periodKey = getMetaLivePeriodKey(getMetaLivePeriod()); }
        catch (error) { return {}; }
    }

    const companySources = META_LIVE_FINANCE_SOURCES && META_LIVE_FINANCE_SOURCES[company];
    const current = companySources && companySources[periodKey]
        ? companySources[periodKey]
        : {};

    const exactRevenue = isUsableFinanceRevenueSource(current.revenue) ? current.revenue : null;
    const migratedRevenue = findMigratedFinancePartInCurrentSources(companySources, periodKey, 'revenue');
    const legacyRevenue = findLegacyFinancePart(company, periodKey, 'revenue');

    // Nguồn upload mới theo V138+ luôn thắng. Nếu nguồn exact là migrated cũ,
    // phải so thời gian với toàn bộ nguồn migrated/legacy cùng tháng để lấy file cuối cùng của tháng đó.
    const revenue = exactRevenue && exactRevenue.migratedFromLegacy !== true
        ? exactRevenue
        : chooseLatestLegacyFinancePart([exactRevenue, migratedRevenue, legacyRevenue], 'revenue');

    const exactStatement = isUsableFinanceStatementSource(current.statement) ? current.statement : null;
    const migratedStatement = findMigratedFinancePartInCurrentSources(companySources, periodKey, 'statement');
    const legacyStatement = findLegacyFinancePart(company, periodKey, 'statement');
    const statement = exactStatement && exactStatement.migratedFromLegacy !== true
        ? exactStatement
        : chooseLatestLegacyFinancePart([exactStatement, migratedStatement, legacyStatement], 'statement');

    return {
        ...current,
        revenue: revenue || null,
        statement: statement || null,
        legacyFallback: !!(
            (revenue && revenue !== current.revenue) ||
            (statement && statement !== current.statement)
        )
    };
}

function getRevenueCandidateKeysForMetaRow(item, hasAdColumn) {
    const keys = new Set();

    const add = (employee, adName, fullName) => {
        const key = hasAdColumn
            ? buildRevenueMatchKey(employee, adName, true)
            : buildRevenueMatchKey(fullName || `${employee || ''} - ${adName || ''}`, '', false);
        if (key) keys.add(key);
    };

    add(item && item.employee, item && item.adName, item && item.fullName);

    const originals = Array.isArray(item && item.original_adset_rows)
        ? item.original_adset_rows
        : (Array.isArray(item && item._duplicateRows) ? item._duplicateRows : []);

    originals.forEach(row => {
        add(
            row && (row.employee || item.employee),
            row && (row.adName || row.cleanAdName || item.adName),
            row && (row.fullName || `${row.employee || item.employee || ''} - ${row.adName || row.cleanAdName || item.adName || ''}`)
        );
    });

    return Array.from(keys);
}

function getRevenueLooseSignatures(employeeName, adName, fullName) {
    const signatures = new Set();
    const employee = normalizeRevenueMatchText(employeeName);
    const ad = normalizeRevenueMatchText(cleanRevenueAdName(adName));
    const full = normalizeRevenueMatchText(fullName);

    if (employee && ad) signatures.add(`EMP_AD_LOOSE||${employee}||${ad}`);
    if (full) signatures.add(`FULL_LOOSE||${full}`);

    try {
        const parts = extractAdDuplicateParts(adName || '');
        if (employee && parts && parts.skuKey) signatures.add(`EMP_SKU||${employee}||${parts.skuKey}`);
        if (employee && parts && parts.productKey) signatures.add(`EMP_PRODUCT||${employee}||${parts.productKey}`);
    } catch (error) {}

    return Array.from(signatures);
}

function getRevenueLooseSignaturesForMetaRow(item) {
    const signatures = new Set(getRevenueLooseSignatures(
        item && item.employee,
        item && item.adName,
        item && item.fullName
    ));

    const originals = Array.isArray(item && item.original_adset_rows)
        ? item.original_adset_rows
        : (Array.isArray(item && item._duplicateRows) ? item._duplicateRows : []);

    originals.forEach(row => {
        getRevenueLooseSignatures(
            row && (row.employee || item.employee),
            row && (row.adName || row.cleanAdName || item.adName),
            row && (row.fullName || '')
        ).forEach(value => signatures.add(value));
    });

    return Array.from(signatures);
}

function getRevenueLooseSignaturesForSourceEntry(entry) {
    return getRevenueLooseSignatures(
        entry && (entry.employeeName || entry.employee),
        entry && (entry.adName || entry.cleanAdName),
        entry && entry.fullName
    );
}

function allocateLatestRevenueToMetaRows(metaRows, revenueSource) {
    const rows = (Array.isArray(metaRows) ? metaRows : []).map(item => ({ ...item, revenue: 0 }));
    const sourceEntries = normalizeFirebaseList(revenueSource && revenueSource.entries);
    const hasAdColumn = !!(revenueSource && revenueSource.hasAdColumn);
    const keyToRowIndexes = new Map();
    const looseKeyToRowIndexes = new Map();

    rows.forEach((item, rowIndex) => {
        getRevenueCandidateKeysForMetaRow(item, hasAdColumn).forEach(key => {
            if (!keyToRowIndexes.has(key)) keyToRowIndexes.set(key, []);
            const indexes = keyToRowIndexes.get(key);
            if (!indexes.includes(rowIndex)) indexes.push(rowIndex);
        });

        getRevenueLooseSignaturesForMetaRow(item).forEach(key => {
            if (!looseKeyToRowIndexes.has(key)) looseKeyToRowIndexes.set(key, []);
            const indexes = looseKeyToRowIndexes.get(key);
            if (!indexes.includes(rowIndex)) indexes.push(rowIndex);
        });
    });

    let matchedSourceRows = 0;
    let matchedRevenue = 0;
    let unmatchedRevenue = 0;

    sourceEntries.forEach(entry => {
        const revenue = Number(entry && (entry.revenue ?? entry.amount) || 0);
        const matchKey = String(entry && entry.matchKey || buildRevenueMatchKey(
            entry && entry.employeeName,
            entry && entry.adName,
            hasAdColumn
        ) || '');
        let indexes = keyToRowIndexes.get(matchKey) || [];

        if (!indexes.length) {
            const looseIndexes = new Set();
            getRevenueLooseSignaturesForSourceEntry(entry).forEach(key => {
                (looseKeyToRowIndexes.get(key) || []).forEach(index => looseIndexes.add(index));
            });
            indexes = Array.from(looseIndexes);
        }

        if (!indexes.length) {
            unmatchedRevenue += revenue;
            return;
        }

        const totalSpend = indexes.reduce((sum, index) => sum + Number(rows[index].spend || 0), 0);
        let allocated = 0;

        indexes.forEach((index, position) => {
            let assigned;
            if (position === indexes.length - 1) {
                assigned = revenue - allocated;
            } else if (totalSpend > 0) {
                assigned = revenue * (Number(rows[index].spend || 0) / totalSpend);
            } else {
                assigned = revenue / indexes.length;
            }

            allocated += assigned;
            rows[index].revenue = Number(rows[index].revenue || 0) + assigned;
        });

        matchedSourceRows++;
        matchedRevenue += revenue;
    });

    return {
        rows,
        summary: {
            sourceRows: sourceEntries.length,
            matchedSourceRows,
            unmatchedSourceRows: Math.max(0, sourceEntries.length - matchedSourceRows),
            matchedRevenue,
            unmatchedRevenue
        }
    };
}

function enrichMetaRowsWithLatestFinanceSource(metaRows, companyId = CURRENT_COMPANY, explicitPeriodKey = '') {
    const source = getMetaLiveFinanceSource(companyId, explicitPeriodKey);
    const revenueSource = source && source.revenue ? source.revenue : null;
    const statementSource = source && source.statement ? source.statement : null;
    const allocation = allocateLatestRevenueToMetaRows(metaRows, revenueSource || {});
    const rows = allocation.rows;

    const totalMetaWithVat = rows.reduce((sum, item) => sum + Number(item.spend || 0) * 1.1, 0);
    const statementTotal = statementSource ? Number(statementSource.total || 0) : 0;
    const totalFee = statementSource ? Math.max(statementTotal - totalMetaWithVat, 0) : 0;
    const feePerRow = rows.length > 0 ? totalFee / rows.length : 0;

    return rows.map(item => ({
        ...item,
        fee: feePerRow,
        finance_source_type: 'meta_live_latest_sources',
        revenue_source_loaded: !!revenueSource,
        statement_source_loaded: !!statementSource,
        revenue_source_file: revenueSource ? String(revenueSource.fileName || '') : '',
        statement_source_file: statementSource ? String(statementSource.fileName || '') : '',
        statement_total: statementTotal,
        finance_match_summary: allocation.summary
    }));
}

function enrichMetaReportRowsWithLatestFinanceSources(metaRows, explicitPeriodKey = '') {
    const grouped = new Map();

    (Array.isArray(metaRows) ? metaRows : []).forEach(item => {
        const company = String(item && item.company || '').toUpperCase();
        if (!grouped.has(company)) grouped.set(company, []);
        grouped.get(company).push(item);
    });

    return Array.from(grouped.entries()).flatMap(([company, rows]) => (
        enrichMetaRowsWithLatestFinanceSource(rows, company, explicitPeriodKey)
    ));
}

function isRevenueReadyForItem(item) {
    if (item && item.finance_source_type === 'meta_live_latest_sources') {
        return !!item.revenue_source_loaded;
    }
    return isBatchRevenueUploaded(item && item.batchId);
}

function renderMetaLiveFinanceSourceStatus() {
    const box = document.getElementById('meta-live-finance-source-status');
    if (!box) return;

    let source = {};
    let context = null;
    try {
        context = getMetaLiveFinanceContext(CURRENT_COMPANY);
        source = getMetaLiveFinanceSource(CURRENT_COMPANY, context.periodKey);
    } catch (error) {}

    const revenue = source && source.revenue;
    const statement = source && source.statement;
    const periodText = context ? `${context.period.from} → ${context.period.to}` : 'Kỳ hiện tại';

    box.innerHTML = `
        <span><b>Chi phí:</b> Meta Live realtime</span>
        <span><b>Doanh thu:</b> ${revenue ? escapeHtml(revenue.fileName || 'Đã cập nhật') : 'Chưa tải'}</span>
        <span><b>Sao kê:</b> ${statement ? escapeHtml(statement.fileName || 'Đã cập nhật') : 'Chưa tải'}</span>
        <span class="finance-source-period">${escapeHtml(periodText)}</span>
    `;
}

function isBatchRevenueUploaded(batchId) {
    if (!batchId) return false;
    const log = RAW_UPLOAD_LOGS ? RAW_UPLOAD_LOGS[batchId] : null;
    return !!(log && (log.revenueUploaded === true || log.revenueFileName));
}

function isRevenueAvailableForData(data) {
    const rows = Array.isArray(data) ? data.filter(Boolean) : [];
    return rows.length > 0 && rows.every(isRevenueReadyForItem);
}

function getProductGroupKey(adName) {

    if (!adName) return "Chưa xác định";

    const matches = [...adName.matchAll(/\(([^)]+)\)/g)];

    if (matches.length > 0) {

        return matches.map(m => m[1]).join(', ').trim(); 

    }

    return adName.replace(/\s+/g, ' ').trim();

}



function normalizeAdsText(str) {
    return (str || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanDuplicateProductName(str) {
    return (str || '')
        .toString()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\b(vs|ver|version|v|copy|test)\s*\d+\b/gi, ' ')
        .replace(/\b(bản|ban)\s*\d+\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractAdDuplicateParts(adName) {
    const raw = (adName || '').toString().replace(/\s+/g, ' ').trim();
    const matches = [...raw.matchAll(/\(([^)]+)\)/g)];
    const sku = matches.length > 0 ? matches.map(m => m[1].trim()).filter(Boolean).join(', ') : '';
    const productName = cleanDuplicateProductName(raw);
    const cleanAdName = productName && sku ? `${productName} (${sku})` : (productName || raw);

    return {
        sku,
        productName,
        cleanAdName,
        skuKey: normalizeAdsText(sku),
        productKey: normalizeAdsText(productName)
    };
}

function parseAdsBudgetValue(rawValue, rawType) {
    const valueText = rawValue === null || rawValue === undefined ? '' : rawValue.toString().trim();
    const typeText = rawType === null || rawType === undefined ? '' : rawType.toString().trim();
    const normalizedValue = normalizeAdsText(valueText);

    const usesCampaignBudget = normalizedValue.includes('su dung ngan sach chien dich')
        || normalizedValue.includes('using campaign budget')
        || normalizedValue.includes('campaign budget');

    if (usesCampaignBudget) {
        return {
            amount: 0,
            type: typeText || 'Ngân sách chiến dịch',
            usesCampaignBudget: true,
            display: 'Sử dụng ngân sách chiến dịch'
        };
    }

    const amount = parseCleanNumber(rawValue);
    return {
        amount: amount > 0 ? amount : 0,
        type: typeText,
        usesCampaignBudget: false,
        display: amount > 0 ? amount : valueText
    };
}

function getMetaBudgetRowRecency(row, fallbackIndex = 0) {
    // Ưu tiên thời gian vận hành thật của nhóm quảng cáo.
    // Không dùng report_end/syncedAt khi đã có ngày chạy vì các dòng trong cùng snapshot
    // thường có chung ngày báo cáo, dễ làm mất thứ tự nhóm nào chạy gần nhất.
    const runValues = [
        row?.updatedAt,
        row?.runEndIso,
        row?.run_end_iso,
        row?.runStartIso,
        row?.run_start_iso
    ];

    const runTimes = runValues
        .filter(Boolean)
        .map(value => Date.parse(value))
        .filter(time => Number.isFinite(time));

    if (runTimes.length) return Math.max(...runTimes);

    const reportValues = [
        row?.reportEndIso,
        row?.report_end_iso,
        row?.syncedAt
    ];
    const reportTimes = reportValues
        .filter(Boolean)
        .map(value => Date.parse(value))
        .filter(time => Number.isFinite(time));

    if (reportTimes.length) return Math.max(...reportTimes);
    return Number(fallbackIndex || 0);
}

function getLatestStoppedBudgetRow(rows) {
    const stoppedRows = (Array.isArray(rows) ? rows : [])
        .map((row, index) => ({ row, index }))
        .filter(entry => entry.row && entry.row.status !== 'Đang chạy');

    if (!stoppedRows.length) return null;

    stoppedRows.sort((a, b) => {
        const timeDiff = getMetaBudgetRowRecency(b.row, b.index) - getMetaBudgetRowRecency(a.row, a.index);
        if (timeDiff !== 0) return timeDiff;
        return b.index - a.index;
    });

    return stoppedRows[0].row;
}

function getEffectiveGroupedBudgetInfo(item) {
    const running = item?.status === 'Đang chạy';

    if (running) {
        const amount = Number(
            item?.active_budget !== undefined
                ? item.active_budget
                : (item?.budget || 0)
        );
        const usesCampaignBudget = !!(
            item?.active_budget_uses_campaign !== undefined
                ? item.active_budget_uses_campaign
                : item?.budget_uses_campaign
        );
        const type = String(item?.active_budget_type || item?.budget_type || '').trim();
        return { amount, usesCampaignBudget, type, source: 'running' };
    }

    const amount = Number(
        item?.latest_stopped_budget !== undefined
            ? item.latest_stopped_budget
            : (item?.budget || 0)
    );
    const usesCampaignBudget = !!(
        item?.latest_stopped_budget_uses_campaign !== undefined
            ? item.latest_stopped_budget_uses_campaign
            : item?.budget_uses_campaign
    );
    const type = String(item?.latest_stopped_budget_type || item?.budget_type || '').trim();

    return { amount, usesCampaignBudget, type, source: 'latest_stopped' };
}

function getBudgetExportValue(item) {
    const budgetInfo = getEffectiveGroupedBudgetInfo(item);
    const amount = Number(budgetInfo.amount || 0);
    const usesCampaignBudget = !!budgetInfo.usesCampaignBudget;

    if (usesCampaignBudget && amount > 0) {
        return `${new Intl.NumberFormat('vi-VN').format(amount)} + NS chiến dịch`;
    }
    if (usesCampaignBudget) return 'Sử dụng ngân sách chiến dịch';
    return amount > 0 ? amount : (item?.budget_display || '');
}

function isoToDisplayDate(isoDate) {
    if (!isoDate) return '-';
    const m = isoDate.toString().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return formatExcelDate(isoDate);
    return `${m[3]}/${m[2]}/${m[1]}`;
}

function isAdRowRelevantToReportPeriod(item) {
    if (!item || Number(item.spend || 0) <= 0) return false;

    const reportStart = item.report_start_iso || '';
    const reportEnd = item.report_end_iso || reportStart;
    const runStart = item.run_start_iso || '';

    // Nếu file thiếu dữ liệu ngày để đối chiếu, vẫn giữ dòng vì dòng này có phát sinh chi phí.
    if (!reportStart || !reportEnd || !runStart) return true;

    let effectiveRunEnd = item.run_end_iso || '';
    if (item.status === 'Đang chạy') {
        effectiveRunEnd = '9999-12-31';
    } else if (!effectiveRunEnd) {
        effectiveRunEnd = runStart;
    }

    return runStart <= reportEnd && effectiveRunEnd >= reportStart;
}

function buildDuplicateSourceRowInfo(item, parts) {
    return {
        accountId: item.accountId || '',
        campaignId: item.campaignId || '',
        campaignName: item.campaignName || '',
        adsetId: item.adsetId || '',
        fullName: item.fullName || `${item.employee} - ${item.adName}`,
        employee: item.employee || '',
        adName: item.adName || '',
        cleanAdName: parts.cleanAdName || item.adName || '',
        sku: parts.sku || '',
        productName: parts.productName || '',
        spend: Number(item.spend || 0),
        result: Number(item.result || 0),
        messages: Number(item.messages || 0),
        ctr: Number(item.ctr || 0),
        linkClicks: Number(item.linkClicks || 0),
        impressions: Number(item.impressions || 0),
        clicks: Number(item.clicks || 0),
        reach: Number(item.reach || 0),
        freq: Number(item.freq || 0),
        rawCpm: Number(item.rawCpm || 0),
        rawCpa: Number(item.rawCpa || 0),
        budget: Number(item.budget || 0),
        budgetType: item.budget_type || '',
        budgetUsesCampaign: !!item.budget_uses_campaign,
        budgetDisplay: getBudgetExportValue(item),
        status: item.status || '',
        runStart: item.run_start || '',
        runEnd: item.run_end || '',
        runStartIso: item.run_start_iso || '',
        runEndIso: item.run_end_iso || '',
        reportStart: item.report_start || '',
        reportEnd: item.report_end || '',
        reportStartIso: item.report_start_iso || '',
        reportEndIso: item.report_end_iso || '',
        relevantToReportPeriod: isAdRowRelevantToReportPeriod(item),
        hasDeliveryData: hasMetaLiveDeliveryData(item),
        dataState: hasMetaLiveDeliveryData(item) ? 'delivered' : 'configured_only',
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
        rawStatus: item.rawStatus || '',
        ads: Array.isArray(item.ads)
            ? item.ads.map(ad => ({ ...ad }))
            : [],
        adCount: Array.isArray(item.ads) ? item.ads.length : Number(item.adCount || 0),
        budgetHistory: normalizeMetaLiveBudgetHistory(item.budgetHistory || [])
    };
}

function mergeDuplicateAdsData(parsedData) {
    const originalCount = parsedData.length;
    const map = {};

    parsedData.forEach(item => {
        const parts = extractAdDuplicateParts(item.adName);
        const employeeKey = normalizeAdsText(item.employee);

        // Ưu tiên gom theo: Tên chiến dịch/nhân sự + Mã SKU.
        // Ví dụ: "... (ONNV110)" và "... (ONNV110) VS2" sẽ được hiểu là cùng một bài/sản phẩm.
        // Nếu không có SKU thì fallback theo: Tên chiến dịch/nhân sự + Tên sản phẩm đã chuẩn hóa.
        const configuredOnlyMetaRow = !!(
            item &&
            item.source === 'meta_api' &&
            item.data_state === 'configured_only' &&
            !hasMetaLiveDeliveryData(item)
        );

        /*
         * V148: Nhóm mới chưa có Insights phải hiện thành một hàng nhóm riêng
         * (nền xám, trạng thái vàng), không bị hấp thụ vào hàng cũ cùng sản phẩm.
         * Khi nhóm bắt đầu phát sinh dữ liệu, nó quay về mergeKey chuẩn và được gom
         * giống cơ chế hiện tại.
         */
        const configuredIdentity = String(
            item.adsetId ||
            item.fullName ||
            `${item.employee || ''}-${item.adName || ''}`
        ).trim();

        const matchType = configuredOnlyMetaRow
            ? 'Nhóm chưa phát sinh - hiển thị riêng'
            : (parts.skuKey ? 'Theo nhân sự + mã sản phẩm' : 'Theo nhân sự + tên sản phẩm');

        const mergeKey = configuredOnlyMetaRow
            ? `${employeeKey}||CONFIGURED_ONLY||${configuredIdentity}`
            : (parts.skuKey
                ? `${employeeKey}||SKU||${parts.skuKey}`
                : `${employeeKey}||PRODUCT||${parts.productKey}`);

        if (!map[mergeKey]) {
            map[mergeKey] = {
                ...item,
                adName: parts.cleanAdName || item.adName,
                fullName: `${item.employee} - ${parts.cleanAdName || item.adName}`,
                revenue: item.revenue || 0,
                fee: item.fee || 0,
                // budget: tổng ngân sách lịch sử của các dòng được gom, dùng để hiển thị chi tiết bài.
                budget: item.budget || 0,
                budget_type: item.budget_type || '',
                budget_uses_campaign: !!item.budget_uses_campaign,
                budget_display: item.budget_display || '',

                // active_budget: chỉ ngân sách của các dòng đang chạy, dùng để tính tổng chiến dịch/nhân sự.
                active_budget: item.status === 'Đang chạy' ? (item.budget || 0) : 0,
                active_budget_uses_campaign: item.status === 'Đang chạy' && !!item.budget_uses_campaign,
                active_budget_type: item.status === 'Đang chạy' ? (item.budget_type || '') : '',
                duplicate_sku: parts.sku,
                duplicate_product_key: parts.productKey,
                duplicate_match_type: matchType,
                merged_count: 1,
                merged_names: [item.fullName || `${item.employee} - ${item.adName}`],
                _duplicateRows: [buildDuplicateSourceRowInfo(item, parts)],
                _mergeKey: mergeKey,
                meta_live_row_key: mergeKey,
                linkClicks: Number(item.linkClicks || 0),
                impressions: Number(item.impressions || 0),
                clicks: Number(item.clicks || 0),
                _ctrSpendSum: (item.ctr || 0) * (item.spend || 0),
                _freqSpendSum: (item.freq || 0) * (item.spend || 0),
                _reportStartList: item.report_start_iso ? [item.report_start_iso] : [],
                _reportEndList: item.report_end_iso ? [item.report_end_iso] : [],
                _runStartList: item.run_start_iso ? [item.run_start_iso] : [],
                _runEndList: item.run_end_iso ? [item.run_end_iso] : [],
                _validRunStartList: isAdRowRelevantToReportPeriod(item) && item.run_start_iso ? [item.run_start_iso] : [],
                _validRunEndList: isAdRowRelevantToReportPeriod(item) && item.run_end_iso ? [item.run_end_iso] : [],
                _hasRunning: item.status === 'Đang chạy',
                _hasDeliveryData: hasMetaLiveDeliveryData(item),
                _budgetTypes: item.budget_type ? [item.budget_type] : [],
                _activeBudgetTypes: item.status === 'Đang chạy' && item.budget_type ? [item.budget_type] : [],
                _usesCampaignBudget: !!item.budget_uses_campaign
            };
            return;
        }

        const target = map[mergeKey];

        target.spend += item.spend || 0;
        target.result += item.result || 0;
        target.messages += item.messages || 0;
        target.revenue = (target.revenue || 0) + (item.revenue || 0);
        target.fee = (target.fee || 0) + (item.fee || 0);

        // Ngân sách lịch sử của bài: vẫn cộng tất cả dòng để phần chi tiết bài không mất dữ liệu.
        target.budget = (target.budget || 0) + (item.budget || 0);
        if (item.budget_type) target._budgetTypes.push(item.budget_type);
        if (item.budget_uses_campaign) target._usesCampaignBudget = true;

        // Ngân sách đang hoạt động: CHỈ cộng dòng có trạng thái Đang chạy.
        // Ví dụ 1 dòng đã tắt 200k + 1 dòng đang chạy 300k:
        // - budget = 500k để đối chiếu chi tiết lịch sử
        // - active_budget = 300k để tính tổng ngân sách chiến dịch/nhân sự
        if (item.status === 'Đang chạy') {
            target.active_budget = (target.active_budget || 0) + (item.budget || 0);
            if (item.budget_uses_campaign) target.active_budget_uses_campaign = true;
            if (item.budget_type) target._activeBudgetTypes.push(item.budget_type);
        }

        target.linkClicks = Number(target.linkClicks || 0) + Number(item.linkClicks || 0);
        target.impressions = Number(target.impressions || 0) + Number(item.impressions || 0);
        target.clicks = Number(target.clicks || 0) + Number(item.clicks || 0);

        target._ctrSpendSum += (item.ctr || 0) * (item.spend || 0);
        target._freqSpendSum += (item.freq || 0) * (item.spend || 0);

        if (item.report_start_iso) target._reportStartList.push(item.report_start_iso);
        if (item.report_end_iso) target._reportEndList.push(item.report_end_iso);
        if (item.run_start_iso) target._runStartList.push(item.run_start_iso);
        if (item.run_end_iso) target._runEndList.push(item.run_end_iso);
        if (isAdRowRelevantToReportPeriod(item)) {
            if (item.run_start_iso) target._validRunStartList.push(item.run_start_iso);
            if (item.run_end_iso) target._validRunEndList.push(item.run_end_iso);
        }
        if (item.status === 'Đang chạy') target._hasRunning = true;
        if (hasMetaLiveDeliveryData(item)) target._hasDeliveryData = true;

        target.merged_count += 1;
        target.merged_names.push(item.fullName || `${item.employee} - ${item.adName}`);
        target._duplicateRows.push(buildDuplicateSourceRowInfo(item, parts));
    });

    const duplicateGroups = [];

    const mergedRows = Object.values(map).map(item => {
        item.ctr = calculateAggregatedCtr(
            item.linkClicks,
            item.impressions,
            item._ctrSpendSum,
            item.spend
        );
        item.ctr_type = item.impressions > 0 ? 'link_click' : (item.ctr_type || 'fallback');
        item.freq = item.spend > 0 ? item._freqSpendSum / item.spend : 0;

        // Sau khi gom, giá tin/CPA phải tính lại theo tổng số liệu đã gom.
        item.rawCpm = item.messages > 0 ? item.spend / item.messages : 0;
        item.rawCpa = item.result > 0 ? item.spend / item.result : 0;

        const starts = item._reportStartList.sort();
        const ends = item._reportEndList.sort();

        item.report_start_iso = starts[0] || item.report_start_iso || '';
        item.report_end_iso = ends[ends.length - 1] || item.report_end_iso || item.report_start_iso || '';
        item.report_month = getMonthFromISO(item.report_end_iso || item.report_start_iso);
        item.report_start = item.report_start_iso ? isoToDisplayDate(item.report_start_iso) : item.report_start;
        item.report_end = item.report_end_iso ? isoToDisplayDate(item.report_end_iso) : item.report_end;

        // Chỉ lấy ngày bắt đầu sớm nhất của các dòng có phát sinh chi phí
        // và có thời gian chạy giao với kỳ báo cáo hiện tại.
        const validRunStarts = (item._validRunStartList || []).filter(Boolean).sort();
        const allRunStarts = (item._runStartList || []).filter(Boolean).sort();
        const validRunEnds = (item._validRunEndList || []).filter(Boolean).sort();
        const allRunEnds = (item._runEndList || []).filter(Boolean).sort();

        item.run_start_iso = validRunStarts[0] || allRunStarts[0] || item.run_start_iso || '';
        item.run_start = item.run_start_iso ? isoToDisplayDate(item.run_start_iso) : item.run_start;

        item.status = item._hasRunning ? 'Đang chạy' : item.status;
        item.has_delivery_data = !!item._hasDeliveryData;
        item.data_state = item.has_delivery_data ? 'delivered' : 'configured_only';
        if (item.status === 'Đang chạy') {
            item.run_end_iso = '';
            item.run_end = 'Đang diễn ra';
        } else {
            item.run_end_iso = validRunEnds[validRunEnds.length - 1] || allRunEnds[allRunEnds.length - 1] || item.run_end_iso || '';
            item.run_end = item.run_end_iso ? isoToDisplayDate(item.run_end_iso) : item.run_end;
        }

        // Chuẩn hóa ngân sách đang hoạt động sau khi gom. Không suy ra lại từ status đã gom,
        // vì status Đang chạy có thể đến từ chỉ 1 trong nhiều dòng trùng.
        item.active_budget = Number(item.active_budget || 0);
        item.active_budget_uses_campaign = !!item.active_budget_uses_campaign;

        const uniqueActiveBudgetTypes = Array.from(new Set((item._activeBudgetTypes || []).filter(Boolean)));
        item.active_budget_type = uniqueActiveBudgetTypes.length === 1
            ? uniqueActiveBudgetTypes[0]
            : (uniqueActiveBudgetTypes.length > 1 ? 'Nhiều loại ngân sách đang chạy' : '');

        const uniqueBudgetTypes = Array.from(new Set((item._budgetTypes || []).filter(Boolean)));
        item.budget_type = uniqueBudgetTypes.length === 1 ? uniqueBudgetTypes[0] : (uniqueBudgetTypes.length > 1 ? 'Nhiều loại ngân sách' : (item.budget_type || ''));
        item.budget_uses_campaign = !!item._usesCampaignBudget;

        // Giữ lại đầy đủ các dòng nhóm quảng cáo gốc để mở popup chi tiết
        // sau khi bảng chính đã gom theo nhân sự + SKU/tên sản phẩm.
        item.original_adset_rows = (item._duplicateRows || []).map(sourceRow => ({ ...sourceRow }));

        // Quy tắc ngân sách sau khi gom:
        // - Còn ít nhất một nhóm đang chạy: chỉ cộng ngân sách các nhóm đang chạy.
        // - Tắt toàn bộ: chỉ lấy ngân sách của nhóm tắt gần nhất, không cộng dồn các nhóm trùng.
        item.merged_budget_total = Number(item.budget || 0);
        const latestStoppedBudgetRow = getLatestStoppedBudgetRow(item.original_adset_rows);
        item.latest_stopped_budget = latestStoppedBudgetRow
            ? Number(latestStoppedBudgetRow.budget || 0)
            : Number(item.budget || 0);
        item.latest_stopped_budget_uses_campaign = latestStoppedBudgetRow
            ? !!latestStoppedBudgetRow.budgetUsesCampaign
            : !!item.budget_uses_campaign;
        item.latest_stopped_budget_type = latestStoppedBudgetRow
            ? String(latestStoppedBudgetRow.budgetType || '')
            : String(item.budget_type || '');
        item.latest_stopped_budget_adset_id = latestStoppedBudgetRow
            ? String(latestStoppedBudgetRow.adsetId || '')
            : '';

        const effectiveBudgetInfo = getEffectiveGroupedBudgetInfo(item);
        item.effective_budget = Number(effectiveBudgetInfo.amount || 0);
        item.effective_budget_uses_campaign = !!effectiveBudgetInfo.usesCampaignBudget;
        item.effective_budget_type = effectiveBudgetInfo.type || '';
        item.budget_display = getBudgetExportValue(item);

        if (item.merged_count > 1) {
            duplicateGroups.push({
                key: item._mergeKey,
                employee: item.employee || '',
                sku: item.duplicate_sku || '',
                productName: item.adName || '',
                finalName: item.fullName || `${item.employee} - ${item.adName}`,
                matchType: item.duplicate_match_type || '',
                rowCount: item.merged_count,
                spend: item.spend || 0,
                result: item.result || 0,
                messages: item.messages || 0,
                ctr: item.ctr || 0,
                freq: item.freq || 0,
                rawCpm: item.rawCpm || 0,
                rawCpa: item.rawCpa || 0,
                budget: Number(getEffectiveGroupedBudgetInfo(item).amount || 0),
                budgetType: getEffectiveGroupedBudgetInfo(item).type || '',
                budgetDisplay: getBudgetExportValue(item),
                activeBudget: item.active_budget || 0,
                activeBudgetUsesCampaign: !!item.active_budget_uses_campaign,
                rows: item._duplicateRows || []
            });
        }

        delete item._duplicateRows;
        delete item._mergeKey;
        delete item._ctrSpendSum;
        delete item._freqSpendSum;
        delete item._reportStartList;
        delete item._reportEndList;
        delete item._runStartList;
        delete item._runEndList;
        delete item._validRunStartList;
        delete item._validRunEndList;
        delete item._hasRunning;
        delete item._hasDeliveryData;
        delete item._budgetTypes;
        delete item._activeBudgetTypes;
        delete item._usesCampaignBudget;

        return item;
    });

    mergedRows.mergeInfo = {
        originalCount,
        mergedCount: mergedRows.length,
        duplicateCount: originalCount - mergedRows.length,
        duplicateGroupCount: duplicateGroups.length,
        duplicateGroups
    };

    return mergedRows;
}

function showDuplicateMergeReviewModal(mergeInfo, onConfirm, onCancel) {
    const groups = mergeInfo?.duplicateGroups || [];
    if (groups.length === 0) {
        if (typeof onConfirm === 'function') onConfirm();
        return;
    }

    const oldModal = document.getElementById('ads-duplicate-review-modal');
    if (oldModal) oldModal.remove();

    const fm = num => new Intl.NumberFormat('vi-VN').format(Math.round(isNaN(num) ? 0 : num));
    const fmDecimal = num => (isNaN(num) ? 0 : num).toFixed(2);

    const groupRowsHtml = groups.map((g, idx) => {
        const detailRows = (g.rows || []).map(row => `
            <div style="padding:6px 0; border-bottom:1px dashed #e0e0e0;">
                <div style="font-weight:700; color:#202124; line-height:1.35;">• ${escapeHtml(row.fullName)}</div>
                <div style="font-size:10px; color:#5f6368; margin-top:2px;">
                    Ngân sách: <b>${typeof row.budgetDisplay === 'number' ? fm(row.budgetDisplay) + 'đ' : escapeHtml(row.budgetDisplay || '-')}</b> • Chi phí: <b>${fm(row.spend)}đ</b> • Tin: <b>${fm(row.messages)}</b> • Mua: <b>${fm(row.result)}</b> • CTR: <b>${fmDecimal(row.ctr)}%</b> • Freq: <b>${fmDecimal(row.freq)}</b>
                </div>
            </div>
        `).join('');

        return `
            <tr>
                <td style="text-align:center; font-weight:700; color:#1a73e8; vertical-align:top;">${idx + 1}</td>
                <td style="vertical-align:top;">
                    <div style="font-weight:700; color:#1a73e8; margin-bottom:4px;">${escapeHtml(g.employee)}</div>
                    <div style="font-weight:700; color:#333; line-height:1.35;">${escapeHtml(g.productName)}</div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:6px;">
                        <span style="background:#e8f0fe; color:#1a73e8; padding:2px 6px; border-radius:5px; font-size:10px; font-weight:700;">${escapeHtml(g.matchType)}</span>
                        ${g.sku ? `<span style="background:#e6f4ea; color:#137333; padding:2px 6px; border-radius:5px; font-size:10px; font-weight:700;">SKU: ${escapeHtml(g.sku)}</span>` : ''}
                    </div>
                    <div style="margin-top:8px; background:#f8f9fa; border:1px solid #eee; border-radius:8px; padding:8px; max-height:150px; overflow:auto;">
                        ${detailRows}
                    </div>
                </td>
                <td style="text-align:center; font-weight:700; color:#d93025; vertical-align:top;">${g.rowCount} dòng</td>
                <td style="text-align:right; vertical-align:top; font-weight:700; color:#333;">
                    ${fm(g.spend)}đ
                    <div style="font-size:10px; color:#5f6368; font-weight:600; margin-top:4px;">Sau gom</div>
                </td>
                <td style="text-align:center; vertical-align:top;">
                    <div><b>${fm(g.messages)}</b> tin</div>
                    <div><b>${fm(g.result)}</b> mua</div>
                    <div style="font-size:10px; color:#5f6368; margin-top:4px;">Giá tin: ${fm(g.rawCpm)}đ</div>
                    <div style="font-size:10px; color:#5f6368;">CPA: ${fm(g.rawCpa)}đ</div>
                </td>
            </tr>
        `;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'ads-duplicate-review-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:100006; display:flex; align-items:center; justify-content:center; padding:18px; backdrop-filter:blur(3px);';

    modal.innerHTML = `
        <div style="background:#fff; width:96%; max-width:1120px; max-height:90vh; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.35); display:flex; flex-direction:column; font-family:'Segoe UI', Arial, sans-serif;">
            <div style="background:linear-gradient(135deg,#0d47a1,#1a73e8); color:#fff; padding:18px 22px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                <div>
                    <div style="font-size:17px; font-weight:700; text-transform:uppercase;">🔍 Kiểm tra dữ liệu trùng trước khi lưu</div>
                    <div style="font-size:12px; opacity:0.9; margin-top:4px;">Hệ thống phát hiện các bài quảng cáo có cùng nhân sự/chiến dịch và cùng mã sản phẩm. Vui lòng kiểm tra trước khi xác nhận gom.</div>
                </div>
                <button id="dup-close-btn" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.35); border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:700;">✕</button>
            </div>

            <div style="padding:14px 18px; background:#f8fbff; border-bottom:1px solid #e8eef7; display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px;">
                <div style="background:#fff; border:1px solid #e8eef7; border-radius:10px; padding:10px; text-align:center;">
                    <div style="font-size:10px; color:#5f6368; font-weight:700; text-transform:uppercase;">Dòng gốc</div>
                    <div style="font-size:20px; color:#1a73e8; font-weight:700;">${fm(mergeInfo.originalCount)}</div>
                </div>
                <div style="background:#fff; border:1px solid #e8eef7; border-radius:10px; padding:10px; text-align:center;">
                    <div style="font-size:10px; color:#5f6368; font-weight:700; text-transform:uppercase;">Sau khi gom</div>
                    <div style="font-size:20px; color:#137333; font-weight:700;">${fm(mergeInfo.mergedCount)}</div>
                </div>
                <div style="background:#fff; border:1px solid #e8eef7; border-radius:10px; padding:10px; text-align:center;">
                    <div style="font-size:10px; color:#5f6368; font-weight:700; text-transform:uppercase;">Dòng bị gom</div>
                    <div style="font-size:20px; color:#d93025; font-weight:700;">${fm(mergeInfo.duplicateCount)}</div>
                </div>
                <div style="background:#fff; border:1px solid #e8eef7; border-radius:10px; padding:10px; text-align:center;">
                    <div style="font-size:10px; color:#5f6368; font-weight:700; text-transform:uppercase;">Nhóm trùng</div>
                    <div style="font-size:20px; color:#b06000; font-weight:700;">${fm(groups.length)}</div>
                </div>
            </div>

            <div style="padding:16px 18px; overflow:auto; flex:1;">
                <table class="ads-table" style="width:100%; min-width:980px; border-collapse:separate; border-spacing:0; font-size:11px;">
                    <thead>
                        <tr>
                            <th style="width:45px; text-align:center;">STT</th>
                            <th style="text-align:left;">Nhóm sẽ gom</th>
                            <th style="width:85px; text-align:center;">Số dòng</th>
                            <th style="width:130px; text-align:right;">Tổng chi phí</th>
                            <th style="width:145px; text-align:center;">Tin / Mua</th>
                        </tr>
                    </thead>
                    <tbody>${groupRowsHtml}</tbody>
                </table>
            </div>

            <div style="padding:14px 18px; border-top:1px solid #eee; background:#fff; display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
                <div style="font-size:11px; color:#5f6368; line-height:1.4;">
                    <b>Lưu ý:</b> Nếu bấm xác nhận, hệ thống sẽ lưu dữ liệu đã gom vào Firebase. Nếu thấy gom sai, bấm hủy rồi kiểm tra lại tên nhóm quảng cáo trong file.
                </div>
                <div style="display:flex; gap:8px;">
                    <button id="dup-cancel-btn" style="border:none; background:#f1f3f4; color:#3c4043; padding:9px 14px; border-radius:8px; cursor:pointer; font-weight:700;">HỦY UPLOAD</button>
                    <button id="dup-confirm-btn" style="border:none; background:#137333; color:#fff; padding:9px 16px; border-radius:8px; cursor:pointer; font-weight:700; box-shadow:0 3px 10px rgba(19,115,51,0.25);">XÁC NHẬN GOM & LƯU</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeAndCancel = () => {
        modal.remove();
        if (typeof onCancel === 'function') onCancel();
    };

    modal.querySelector('#dup-close-btn').onclick = closeAndCancel;
    modal.querySelector('#dup-cancel-btn').onclick = closeAndCancel;
    modal.querySelector('#dup-confirm-btn').onclick = () => {
        const btn = modal.querySelector('#dup-confirm-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'ĐANG LƯU...';
            btn.style.opacity = '0.7';
        }
        modal.remove();
        if (typeof onConfirm === 'function') onConfirm();
    };
}

function saveParsedAdsBatch(file, result, mergeInfo, btnText) {
    const batchId = Date.now().toString(); 
    const totalSpend = result.reduce((sum, i) => sum + i.spend, 0); 
    const reportInfo = getBatchReportInfo(result);

    db.ref('upload_logs/' + batchId).set({
        timestamp: new Date().toISOString(), 
        fileName: file.name, 
        rowCount: result.length, 
        originalRowCount: mergeInfo.originalCount,
        mergedRowCount: mergeInfo.mergedCount,
        duplicateMergedCount: mergeInfo.duplicateCount,
        duplicateGroupCount: mergeInfo.duplicateGroupCount || 0,
        totalSpend: totalSpend, 
        company: CURRENT_COMPANY,
        uploader: window.myIdentity || "Ẩn danh",
        reportStart: reportInfo.reportStart,
        reportEnd: reportInfo.reportEnd,
        reportMonth: reportInfo.reportMonth,
        reportLabel: reportInfo.reportLabel,
        revenueUploaded: false
    }); 

    const updates = {}; 
    result.forEach(item => { 
        const newKey = db.ref().child('ads_data').push().key; 
        item.batchId = batchId; 
        item.company = CURRENT_COMPANY; 
        item.revenue = 0; 
        item.fee = 0; 
        updates['/ads_data/' + newKey] = item; 
    }); 

    db.ref().update(updates).then(() => { 
        const duplicateMsg = mergeInfo.duplicateCount > 0 ? ` sau khi gom ${mergeInfo.duplicateCount} dòng trùng (${mergeInfo.duplicateGroupCount || 0} nhóm)` : '';
        showToast(`✅ Đã lưu ${result.length} dòng${duplicateMsg}.`, 'success'); 

        if(btnText) btnText.innerText = "Upload Excel"; 
        const inputEl = document.getElementById('ads-file-input');
        if (inputEl) inputEl.value = ""; 

        ACTIVE_BATCH_ID = batchId; 
        USER_EXPLICIT_VIEW_ALL = false;

        PERIOD_FILTER_USER_CHANGED = false;
        applyCurrentMonthToDateDefaults(true);

        applyFilters(); 
    }).catch(err => {
        console.error(err);
        showToast("❌ Lỗi lưu dữ liệu: " + err.message, 'error');
        if(btnText) btnText.innerText = "Upload Excel";
    });
}

function injectCustomStyles() {

    const styleId = 'ads-custom-styles';

    if (document.getElementById(styleId)) return;

    

    const style = document.createElement('style');

    style.id = styleId;

    style.innerHTML = `

        #toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }

        .custom-toast { pointer-events: auto; min-width: 350px; padding: 12px 20px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); color: #333; border-radius: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-family: sans-serif; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,0,0,0.05); animation: slideDownFade 0.4s forwards; }

        .toast-icon { margin-right: 10px; font-size: 18px; }

        @keyframes slideDownFade { from { opacity: 0; transform: translateY(-20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        

        .kpi-section { display: none; animation: fadeIn 0.3s; }

        .kpi-section.active { display: grid; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }



        .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; position: relative; }

        .ads-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; font-family: sans-serif; font-size: 11px; min-width: 900px; }

        .ads-table th { position: sticky; top: 0; z-index: 10; background: #f5f5f5; color: #333; text-transform: uppercase; font-weight: bold; padding: 8px; border-bottom: 2px solid #ddd; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }

        .ads-table td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }



        tr.roas-good td { background-color: #e6f4ea !important; }

        tr.roas-bad td { background-color: #fce8e6 !important; }



        .btn-export-excel { background:#137333; color:white; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:8px; transition:0.2s; box-shadow: 0 2px 6px rgba(19,115,51,0.2); text-transform:uppercase; letter-spacing:0.5px;}

        .btn-export-excel:hover { background:#0d5323; transform:translateY(-2px); box-shadow: 0 4px 12px rgba(19,115,51,0.3); }



        .btn-toggle-history { background:#fff; color:#5f6368; border:1px solid #dadce0; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; display:inline-flex; align-items:center; gap:5px; transition:0.2s; }

        .btn-toggle-history:hover { background:#f8f9fa; border-color:#9aa0a6; }



        .btn-view-all { background: #1a73e8; color: #fff; border: none; padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 10px; font-weight: bold; white-space: nowrap; transition: 0.2s; box-shadow: 0 2px 5px rgba(26,115,232,0.2); }

        .btn-view-all:hover { background: #1557b0; transform: translateY(-1px); }



        .history-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 15px; }

        .history-box { background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #eee; }

        .history-title { font-weight:700; color: #333; font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; }

        

        .history-search-wrapper { position: relative; display: flex; align-items: center; flex: 1; margin: 0 15px; }

        .history-search-box { width: 100%; padding: 4px 10px 4px 25px; border: 1px solid #e0e0e0; border-radius: 20px; font-size: 11px; background: #f8f9fa; outline: none; transition: 0.2s; }

        .history-search-box:focus { background: #fff; border-color: #1a73e8; }

        .search-icon { position: absolute; left: 8px; color: #999; font-size: 11px; }



        .user-badge { background: #e8f0fe; color: #1a73e8; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; display: inline-block; margin-top: 4px; }

        .export-badge { background: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; display: inline-block; }

        

        .delete-btn-admin { background-color: #d93025; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 10px; cursor: pointer; transition: 0.2s; }

        .delete-btn-admin:hover { background-color: #b71c1c; }



        .scroll-area { max-height: 250px; overflow-y: auto; overflow-x: hidden; padding-right: 5px; }

        .scroll-area::-webkit-scrollbar { width: 5px; }

        .scroll-area::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; }



        .diag-btn { cursor: pointer; transition: transform 0.1s; display: inline-block; }

        .diag-btn:hover { transform: scale(1.05); }

        /* Đồng bộ font chữ cho toàn bộ nút và bộ lọc trong module Ads */
        #ads-analysis-result button,
        #ads-analysis-result select,
        #ads-analysis-result input,
        #ads-duplicate-review-modal button {
            font-family: Tahoma, Arial, 'Segoe UI', sans-serif !important;
            letter-spacing: 0 !important;
            font-synthesis-weight: none;
        }

        #ads-analysis-result button {
            font-weight:700 !important;
            line-height: 1.2;
        }

        .report-table-filter-select {
            width:100%;
            max-width:170px;
            padding:6px 9px;
            border:1px solid #d7deea;
            border-radius:8px;
            font-size:11px;
            font-weight:700;
            color:#24324a;
            background:#fff;
            outline:none;
            cursor:pointer;
            transition:0.2s;
        }

        .report-table-filter-select:focus {
            border-color:#1a73e8;
            box-shadow:0 0 0 3px rgba(26,115,232,0.12);
        }

        .report-table-clear-btn {
            padding:7px 12px;
            border:none;
            border-radius:8px;
            background:#fce8e6;
            color:#d93025;
            font-size:10px;
            font-weight:700;
            cursor:pointer;
            transition:0.2s;
        }

        .report-table-clear-btn:hover {
            background:#fad2cf;
            transform:translateY(-1px);
        }

        /* Nút sắp xếp tăng/giảm ở bảng ROAS nhân sự */
        .employee-roas-sort-th {
            cursor:pointer;
            user-select:none;
            transition:background-color 0.18s ease, color 0.18s ease;
            white-space:nowrap;
        }

        .employee-roas-sort-th:hover {
            background:#e8f0fe !important;
            color:#1a73e8 !important;
        }

        .employee-roas-sort-head {
            display:inline-flex;
            align-items:center;
            justify-content:inherit;
            gap:5px;
        }

        .employee-roas-sort-control {
            width:19px;
            height:19px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            flex:0 0 19px;
            border:1px solid #cbd5e1;
            border-radius:6px;
            background:#fff;
            color:#7a879b;
            font-size:9px;
            font-weight:700;
            line-height:1;
            box-shadow:0 1px 2px rgba(15,23,42,0.06);
            transition:0.18s ease;
        }

        .employee-roas-sort-th:hover .employee-roas-sort-control {
            border-color:#8ab4f8;
            color:#1a73e8;
            background:#f5f9ff;
        }

        .employee-roas-sort-th.active-sort {
            color:#1a73e8 !important;
            background:#eef4ff !important;
        }

        .employee-roas-sort-th.active-sort .employee-roas-sort-control {
            color:#fff;
            background:#1a73e8;
            border-color:#1a73e8;
            box-shadow:0 2px 6px rgba(26,115,232,0.25);
        }

        /* Cây thư mục chi tiết bài quảng cáo trong bảng ROAS nhân sự */
        .employee-roas-parent-row {
            cursor:pointer;
        }

        .employee-roas-parent-row td,
        .employee-roas-child-row td {
            transition:background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, font-weight 0.18s ease;
        }

        /* Hover hàng chiến dịch / nhân sự: làm nổi toàn bộ dữ liệu trên cùng một hàng */
        .employee-roas-parent-row:hover td {
            background:#e8f0fe !important;
            box-shadow:inset 0 1px 0 #c6daf7, inset 0 -1px 0 #c6daf7;
        }

        .employee-roas-parent-row:hover td:first-child {
            box-shadow:inset 4px 0 0 #1a73e8, inset 0 1px 0 #c6daf7, inset 0 -1px 0 #c6daf7;
        }

        .employee-roas-parent-row:hover td:nth-child(n+3) {
            color:#0d47a1 !important;
            font-weight:700 !important;
        }

        .employee-roas-parent-row:hover td:nth-child(6) {
            color:#0f7a3f !important;
        }

        .employee-roas-parent-row.expanded td {
            background:#eaf2ff !important;
            border-bottom-color:#c7d8f5 !important;
        }

        .employee-roas-tree-toggle {
            width:20px;
            height:20px;
            flex:0 0 20px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border-radius:6px;
            background:#e8f0fe;
            color:#1a73e8;
            font-size:10px;
            font-weight:700;
            transition:transform 0.18s ease, background 0.18s ease;
        }

        .employee-roas-parent-row:hover .employee-roas-tree-toggle {
            background:#d2e3fc;
        }

        .employee-roas-child-row td {
            background:#fbfcff !important;
            border-bottom:1px dashed #d9e2f1 !important;
        }

        /* Hover bài quảng cáo con: nổi bật đúng hàng đang xem */
        .employee-roas-child-row:hover td {
            background:#edf5ff !important;
            box-shadow:inset 0 1px 0 #c9dcf7, inset 0 -1px 0 #c9dcf7;
        }

        .employee-roas-child-row:hover td:first-child {
            box-shadow:inset 4px 0 0 #4f8edc, inset 0 1px 0 #c9dcf7, inset 0 -1px 0 #c9dcf7;
            color:#1a73e8 !important;
        }

        .employee-roas-child-row:hover td:nth-child(n+3) {
            color:#174ea6 !important;
            font-weight:700 !important;
        }

        .employee-roas-child-row:hover td:nth-child(6) {
            color:#0f7a3f !important;
        }

        .employee-roas-child-row:hover .employee-roas-child-name {
            color:#0d47a1;
            font-weight:600;
        }

        .employee-roas-child-row:hover .employee-roas-child-meta {
            color:#3f506a;
        }

        .employee-roas-child-row:hover .employee-roas-tree-branch {
            color:#1a73e8;
        }

        .employee-roas-tree-branch {
            color:#8aa4c8;
            font-family:Consolas, 'Courier New', monospace;
            font-weight:700;
            margin-right:7px;
            white-space:nowrap;
        }

        .employee-roas-child-name {
            font-family: Arial, Helvetica, sans-serif;
            font-size:11px;
            font-weight:400;
            color:#46546a;
            line-height:1.45;
            letter-spacing:0.05px;
        }

        .employee-roas-child-name-label {
            display:inline-block;
            margin-right:5px;
            color:#8a96a8;
            font-family:'Segoe UI', Arial, sans-serif;
            font-size:8px;
            font-weight:700;
            letter-spacing:0.45px;
            text-transform:uppercase;
            vertical-align:1px;
        }

        .employee-roas-child-meta {
            display:flex;
            flex-wrap:wrap;
            gap:5px 10px;
            margin-top:4px;
            font-size:9px;
            color:#6b778c;
            line-height:1.35;
        }

        .employee-roas-child-meta span {
            white-space:nowrap;
        }

        .report-filter-card { background:#ffffff; padding:10px 12px; border-radius:14px; border:1px solid #dfe3eb; display:flex; align-items:center; gap:10px; flex-wrap:wrap; box-shadow:0 4px 14px rgba(26,115,232,0.08); }
        .report-filter-main { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .report-filter-group { display:flex; flex-direction:column; gap:4px; }
        .report-filter-label { font-size:10px; color:#5f6368; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; }
        .report-filter-input { min-height:30px; border:1px solid #dfe3eb; border-radius:9px; padding:4px 9px; outline:none; font-size:12px; color:#202124; font-weight:700; background:#f8fbff; transition:0.2s; }
        .report-filter-input:focus { background:#fff; border-color:#1a73e8; box-shadow:0 0 0 3px rgba(26,115,232,0.12); }
        .report-filter-divider { display:flex; align-items:center; justify-content:center; color:#9aa0a6; font-size:10px; font-weight:700; text-transform:uppercase; padding-top:14px; }
        .report-date-range { display:flex; flex-direction:row; align-items:flex-end; gap:6px; }
        .report-date-unit { display:flex; flex-direction:column; gap:4px; }
        .report-date-arrow { padding-bottom:7px; color:#9aa0a6; font-weight:700; font-size:11px; }
        .report-clear-btn { min-height:31px; border:none; background:#fce8e6; color:#d93025; padding:6px 11px; border-radius:9px; cursor:pointer; font-weight:700; font-size:11px; transition:0.2s; margin-top:14px; }
        .report-clear-btn:hover { background:#fad2cf; transform:translateY(-1px); }
        .report-sort-th { cursor:pointer; user-select:none; transition:0.2s; }
        .report-sort-th:hover { background:#e8f0fe !important; color:#1a73e8; }
        .report-sort-icon { font-size:9px; color:#1a73e8; margin-left:3px; }



        /* =========================================================
           V134 META LIVE SMART SEARCH
           Tìm theo chiến dịch → nhóm quảng cáo → ngân sách/trạng thái.
        ========================================================= */
        #ads-analysis-result .meta-live-search-area {
            position:relative;
            width:min(720px,58vw);
            min-width:360px;
            font-family:Tahoma,Arial,Verdana,sans-serif!important;
        }

        #ads-analysis-result .meta-live-search-shell {
            min-height:40px;
            display:flex;
            align-items:center;
            gap:6px;
            flex-wrap:wrap;
            padding:5px 126px 5px 8px;
            border:1px solid #d7e0ea;
            border-radius:11px;
            background:#fff;
            box-shadow:0 2px 7px rgba(15,23,42,.04);
            transition:border-color .16s ease,box-shadow .16s ease;
            cursor:text;
        }

        #ads-analysis-result .meta-live-search-shell:focus-within {
            border-color:#6d9ff5;
            box-shadow:0 0 0 3px rgba(31,111,255,.11);
        }

        #ads-analysis-result .meta-live-search-icon {
            flex:0 0 auto;
            color:#718096;
            font-size:14px;
            line-height:1;
        }

        #ads-analysis-result .meta-live-search-tokens {
            display:flex;
            align-items:center;
            gap:5px;
            flex-wrap:wrap;
        }

        #ads-analysis-result .meta-live-search-token {
            max-width:230px;
            min-height:27px;
            display:inline-flex;
            align-items:center;
            gap:5px;
            padding:4px 7px 4px 8px;
            border:1px solid #c9dcfb;
            border-radius:8px;
            background:#edf4ff;
            color:#174ea6;
            font-size:9.5px;
            line-height:1.25;
            font-weight:700;
        }

        #ads-analysis-result .meta-live-search-token[data-type="adset"] {
            border-color:#d9cef9;
            background:#f5f1ff;
            color:#6d28d9;
        }

        #ads-analysis-result .meta-live-search-token[data-type="budget"] {
            border-color:#cbe8d8;
            background:#eefaf3;
            color:#137333;
        }

        #ads-analysis-result .meta-live-search-token[data-type="status"] {
            border-color:#f3d6a8;
            background:#fff7e8;
            color:#9a5b00;
        }

        #ads-analysis-result .meta-live-search-token-label {
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
        }

        #ads-analysis-result .meta-live-search-token button {
            width:17px;
            height:17px;
            flex:0 0 17px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border:0;
            border-radius:5px;
            background:rgba(255,255,255,.68);
            color:inherit;
            font-size:13px;
            line-height:1;
            padding:0;
            cursor:pointer;
        }

        #ads-analysis-result .meta-live-search-input {
            min-width:150px;
            flex:1 1 180px;
            height:27px;
            border:0!important;
            outline:0!important;
            padding:2px 3px!important;
            background:transparent!important;
            box-shadow:none!important;
            color:#24364a!important;
            font-family:Tahoma,Arial,Verdana,sans-serif!important;
            font-size:11px!important;
            font-weight:400!important;
        }

        #ads-analysis-result .meta-live-search-input::placeholder {
            color:#8b99a8;
            font-weight:400;
        }

        #ads-analysis-result .meta-live-search-clear {
            position:absolute;
            top:7px;
            right:7px;
            width:27px;
            height:27px;
            display:none;
            align-items:center;
            justify-content:center;
            border:0;
            border-radius:8px;
            background:#f1f4f7;
            color:#607286;
            font-size:17px;
            line-height:1;
            cursor:pointer;
        }

        #ads-analysis-result .meta-live-search-clear.visible { display:flex; }

        #ads-analysis-result .meta-live-search-hint {
            margin-top:5px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            color:#8190a1;
            font-size:9px;
            line-height:1.35;
        }

        #ads-analysis-result .meta-live-search-count {
            position:absolute;
            top:8px;
            right:41px;
            min-height:25px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            padding:0 8px;
            border:1px solid #d8e6fb;
            border-radius:7px;
            background:#edf4ff;
            color:#1f6fff;
            font-size:9.5px;
            font-weight:700;
            line-height:1;
            white-space:nowrap;
            pointer-events:none;
        }

        #ads-analysis-result .meta-live-search-suggestions {
            position:absolute;
            top:47px;
            left:0;
            right:0;
            z-index:120;
            display:none;
            max-height:310px;
            overflow:auto;
            padding:6px;
            border:1px solid #d8e1eb;
            border-radius:12px;
            background:#fff;
            box-shadow:0 18px 42px rgba(15,23,42,.18);
        }

        #ads-analysis-result .meta-live-search-suggestions.open { display:block; }

        #ads-analysis-result .meta-live-search-suggestion {
            width:100%;
            min-height:44px;
            display:grid;
            grid-template-columns:84px minmax(0,1fr) auto;
            align-items:center;
            gap:8px;
            padding:7px 9px;
            border:0;
            border-radius:9px;
            background:#fff;
            color:#2c4055;
            text-align:left;
            cursor:pointer;
            font-family:Tahoma,Arial,Verdana,sans-serif!important;
        }

        #ads-analysis-result .meta-live-search-suggestion:hover,
        #ads-analysis-result .meta-live-search-suggestion.active {
            background:#edf5ff;
        }

        #ads-analysis-result .meta-live-search-suggestion-type {
            display:inline-flex;
            justify-content:center;
            align-items:center;
            min-height:22px;
            padding:3px 6px;
            border-radius:7px;
            background:#eaf2ff;
            color:#1f6fff;
            font-size:8.5px;
            font-weight:700;
            white-space:nowrap;
        }

        #ads-analysis-result .meta-live-search-suggestion[data-type="adset"] .meta-live-search-suggestion-type {
            background:#f3efff;
            color:#6d28d9;
        }

        #ads-analysis-result .meta-live-search-suggestion[data-type="budget"] .meta-live-search-suggestion-type {
            background:#edf9f2;
            color:#137333;
        }

        #ads-analysis-result .meta-live-search-suggestion[data-type="status"] .meta-live-search-suggestion-type {
            background:#fff5e5;
            color:#9a5b00;
        }

        #ads-analysis-result .meta-live-search-suggestion-main {
            min-width:0;
        }

        #ads-analysis-result .meta-live-search-suggestion-value {
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            color:#253b52;
            font-size:10.5px;
            font-weight:700;
        }

        #ads-analysis-result .meta-live-search-suggestion-sub {
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            margin-top:2px;
            color:#8291a6;
            font-size:8.8px;
            font-weight:400;
        }

        #ads-analysis-result .meta-live-search-suggestion-count {
            color:#718096;
            font-size:9px;
            font-weight:700;
            white-space:nowrap;
        }

        #ads-analysis-result .meta-live-search-empty {
            padding:15px 12px;
            color:#718096;
            font-size:10px;
            text-align:center;
        }

        @media (max-width:640px) {
            #ads-analysis-result .meta-live-search-shell {
                padding-right:112px;
            }
            #ads-analysis-result .meta-live-search-count {
                max-width:72px;
                overflow:hidden;
                text-overflow:ellipsis;
            }
        }

        @media (max-width:980px) {
            #ads-analysis-result .meta-live-search-area {
                width:100%;
                min-width:0;
            }
        }

        .ads-meta-live-toolbar {
            display:flex;
            align-items:center;
            justify-content:flex-end;
            gap:8px;
            flex-wrap:wrap;
        }

        .meta-live-status-chip {
            min-height:34px;
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:7px 11px;
            border:1px solid #dbe5ef;
            border-radius:999px;
            background:#f8fafc;
            color:#5f7083;
            font-size:10px;
            font-weight:700;
            line-height:1.25;
        }

        .meta-live-pulse {
            width:8px;
            height:8px;
            flex:0 0 8px;
            border-radius:50%;
            background:#94a3b8;
        }

        .meta-live-status-chip.is-loading {
            color:#1d4ed8;
            border-color:#bfdbfe;
            background:#eff6ff;
        }

        .meta-live-status-chip.is-loading .meta-live-pulse {
            background:#2563eb;
            box-shadow:0 0 0 0 rgba(37,99,235,.34);
            animation:metaLivePulse 1.3s infinite;
        }

        .meta-live-status-chip.is-success {
            color:#137333;
            border-color:#bbdfc8;
            background:#f0faf4;
        }

        .meta-live-status-chip.is-success .meta-live-pulse {
            background:#16a34a;
        }

        .meta-live-status-chip.is-error {
            color:#b42318;
            border-color:#f4c7c3;
            background:#fff5f4;
        }

        .meta-live-status-chip.is-error .meta-live-pulse {
            background:#d93025;
        }

        .meta-live-refresh-btn {
            min-height:34px;
            padding:0 12px;
            border:1px solid #1f6fff;
            border-radius:9px;
            background:#1f6fff;
            color:#fff;
            font-size:10px;
            font-weight:700;
            cursor:pointer;
            transition:.18s ease;
        }

        .meta-live-refresh-btn:hover:not(:disabled) {
            background:#155fd8;
            transform:translateY(-1px);
        }

        .meta-live-refresh-btn:disabled {
            opacity:.65;
            cursor:not-allowed;
        }

        @keyframes metaLivePulse {
            0% { box-shadow:0 0 0 0 rgba(37,99,235,.35); }
            70% { box-shadow:0 0 0 7px rgba(37,99,235,0); }
            100% { box-shadow:0 0 0 0 rgba(37,99,235,0); }
        }

        /* =========================================================
           V114 ENTERPRISE UI — INSPIRED BY LARGE ADMIN PLATFORMS
           Visual only: no changes to Firebase, calculations, filters or export logic.
        ========================================================= */
        #ads-analysis-result {
            --ui-bg:#f3f6f9;
            --ui-surface:#ffffff;
            --ui-surface-soft:#f8fafc;
            --ui-border:#dfe6ee;
            --ui-text:#172b3f;
            --ui-muted:#6b7d90;
            --ui-primary:#1f6fff;
            --ui-primary-soft:#eaf2ff;
            --ui-green:#16885f;
            --ui-red:#d64545;
            --ui-orange:#d97706;
            --ui-purple:#7c4dff;
            --ui-shadow:0 10px 28px rgba(19,44,71,.07);
            padding:0 !important;
            border-radius:18px !important;
            overflow:hidden;
            background:var(--ui-bg) !important;
            color:var(--ui-text);
            font-family:Tahoma,Arial,"Segoe UI",sans-serif !important;
            box-shadow:0 20px 50px rgba(16,39,64,.08);
        }

        #ads-analysis-result *,
        #upload-controls-container * { box-sizing:border-box; }

        #ads-analysis-result button,
        #ads-analysis-result input,
        #ads-analysis-result select,
        #upload-controls-container button,
        #upload-controls-container input {
            font-family:Tahoma,Arial,"Segoe UI",sans-serif !important;
        }

        #ads-analysis-result .ads-enterprise-shell {
            min-height:780px;
            display:grid;
            grid-template-columns:238px minmax(0,1fr);
            background:var(--ui-bg);
        }

        #ads-analysis-result .ads-enterprise-sidebar {
            position:relative;
            z-index:2;
            padding:20px 14px;
            background:#ffffff;
            border-right:1px solid var(--ui-border);
            display:flex;
            flex-direction:column;
            min-height:100%;
        }

        #ads-analysis-result .ads-sidebar-brand {
            display:flex;
            align-items:center;
            gap:11px;
            padding:4px 8px 20px;
            border-bottom:1px solid #edf1f5;
        }

        #ads-analysis-result .ads-sidebar-logo {
            width:38px;
            height:38px;
            border-radius:11px;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#fff;
            font-weight:700;
            font-size:17px;
            background:linear-gradient(135deg,#1f6fff,#67a3ff);
            box-shadow:0 8px 16px rgba(31,111,255,.22);
        }

        #ads-analysis-result .ads-sidebar-brand strong {
            display:block;
            font-size:12px;
            letter-spacing:.7px;
            color:#14283b;
        }

        #ads-analysis-result .ads-sidebar-brand small {
            display:block;
            margin-top:2px;
            color:#8a98a8;
            font-size:10px;
        }

        #ads-analysis-result .ads-sidebar-section-label {
            margin:20px 9px 8px;
            font-size:9px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:1px;
            color:#99a6b5;
        }

        #ads-analysis-result .ads-tabs.ads-sidebar-nav {
            display:flex !important;
            flex-direction:column;
            gap:6px;
            border:0 !important;
            margin:0 !important;
            overflow:visible !important;
        }

        #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
            width:100%;
            min-height:58px;
            padding:9px 10px !important;
            border:0 !important;
            border-radius:12px !important;
            background:transparent !important;
            display:flex;
            align-items:center;
            gap:10px;
            color:#40556b !important;
            text-align:left;
            box-shadow:none !important;
            transition:.18s ease;
            position:relative;
        }

        #ads-analysis-result .ads-sidebar-nav .ads-tab-btn::before {
            content:"";
            position:absolute;
            left:-14px;
            top:12px;
            bottom:12px;
            width:3px;
            border-radius:0 4px 4px 0;
            background:transparent;
        }

        #ads-analysis-result .ads-sidebar-nav .ads-tab-btn:hover {
            background:#f5f8fc !important;
            transform:none !important;
        }

        #ads-analysis-result .ads-sidebar-nav .ads-tab-btn.active {
            background:#eaf2ff !important;
            color:#1459cb !important;
        }

        #ads-analysis-result .ads-sidebar-nav .ads-tab-btn.active::before {
            background:#1f6fff;
        }

        #ads-analysis-result .ads-nav-icon {
            width:32px;
            height:32px;
            flex:0 0 32px;
            border-radius:9px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#f1f5f9;
            color:#50657a;
            font-size:15px;
            font-weight:700;
        }

        #ads-analysis-result .ads-tab-btn.active .ads-nav-icon {
            background:#ffffff;
            color:#1f6fff;
            box-shadow:0 4px 12px rgba(31,111,255,.12);
        }

        #ads-analysis-result .ads-nav-copy { min-width:0; }
        #ads-analysis-result .ads-nav-copy b {
            display:block;
            font-size:12px;
            font-weight:700;
        }
        #ads-analysis-result .ads-nav-copy small {
            display:block;
            margin-top:2px;
            color:#8a99a9;
            font-size:9.5px;
            font-weight:600;
        }

        #ads-analysis-result .ads-sidebar-activity {
            margin:16px 2px 0;
            padding:15px 6px 0;
            border-top:1px solid #e7edf4;
        }

        #ads-analysis-result .ads-sidebar-activity-head {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:8px;
            margin:0 4px 9px;
        }

        #ads-analysis-result .ads-sidebar-activity-head strong {
            color:#607286;
            font-size:9px;
            font-weight:700;
            letter-spacing:.8px;
            text-transform:uppercase;
        }

        #ads-analysis-result .ads-sidebar-activity-badge {
            min-width:29px;
            height:18px;
            padding:0 7px;
            border-radius:999px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            background:#eaf2ff;
            color:#1f6fff;
            font-size:8px;
            font-weight:700;
        }

        #ads-analysis-result .ads-sidebar-activity-badge.has-alert {
            background:#fff0f0;
            color:#d93025;
        }

        #ads-analysis-result .ads-sidebar-activity-list {
            display:flex;
            flex-direction:column;
            gap:6px;
        }

        #ads-analysis-result .ads-sidebar-activity-item,
        #ads-analysis-result .ads-sidebar-activity-empty {
            min-width:0;
            display:flex;
            align-items:flex-start;
            gap:8px;
            padding:8px 7px;
            border:1px solid #edf1f5;
            border-radius:10px;
            background:#fafcfe;
        }

        #ads-analysis-result .ads-sidebar-activity-item:hover {
            background:#f5f8fc;
        }

        #ads-analysis-result .ads-sidebar-activity-dot,
        #ads-analysis-result .ads-sidebar-activity-pulse {
            width:7px;
            height:7px;
            flex:0 0 7px;
            margin-top:4px;
            border-radius:50%;
            background:#f4b400;
            box-shadow:0 0 0 3px rgba(244,180,0,.12);
        }

        #ads-analysis-result .ads-sidebar-activity-item.tone-success .ads-sidebar-activity-dot,
        #ads-analysis-result .ads-sidebar-activity-empty.is-success .ads-sidebar-activity-pulse {
            background:#21a366;
            box-shadow:0 0 0 3px rgba(33,163,102,.12);
        }

        #ads-analysis-result .ads-sidebar-activity-item.tone-info .ads-sidebar-activity-dot {
            background:#1f6fff;
            box-shadow:0 0 0 3px rgba(31,111,255,.12);
        }

        #ads-analysis-result .ads-sidebar-activity-item.tone-danger .ads-sidebar-activity-dot {
            background:#d93025;
            box-shadow:0 0 0 3px rgba(217,48,37,.12);
        }

        #ads-analysis-result .ads-sidebar-activity-item.tone-muted .ads-sidebar-activity-dot {
            background:#98a6b5;
            box-shadow:0 0 0 3px rgba(152,166,181,.12);
        }

        #ads-analysis-result .ads-sidebar-activity-copy,
        #ads-analysis-result .ads-sidebar-activity-empty > div {
            min-width:0;
            flex:1;
        }

        #ads-analysis-result .ads-sidebar-activity-line {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:6px;
        }

        #ads-analysis-result .ads-sidebar-activity-line b,
        #ads-analysis-result .ads-sidebar-activity-empty b {
            min-width:0;
            display:block;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            color:#334a60;
            font-size:9.5px;
            font-weight:700;
        }

        #ads-analysis-result .ads-sidebar-activity-line time {
            flex:0 0 auto;
            color:#a0abba;
            font-size:8px;
            font-weight:600;
        }

        #ads-analysis-result .ads-sidebar-activity-copy > small,
        #ads-analysis-result .ads-sidebar-activity-empty small {
            display:block;
            margin-top:2px;
            color:#76879a;
            font-size:8.5px;
            line-height:1.35;
            font-weight:600;
        }

        #ads-analysis-result .ads-sidebar-activity-context {
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            color:#9aa7b5 !important;
        }

        #ads-analysis-result .ads-sidebar-help {
            margin-top:auto;
            display:flex;
            align-items:center;
            gap:9px;
            padding:12px;
            border:1px solid #e6edf4;
            border-radius:12px;
            background:#f9fbfd;
        }

        #ads-analysis-result .ads-sidebar-help-dot {
            width:9px;
            height:9px;
            border-radius:50%;
            background:#2eb67d;
            box-shadow:0 0 0 4px rgba(46,182,125,.12);
        }

        #ads-analysis-result .ads-sidebar-help b {
            display:block;
            font-size:10px;
            color:#24445f;
        }
        #ads-analysis-result .ads-sidebar-help small {
            display:block;
            margin-top:2px;
            color:#8c9aaa;
            font-size:9px;
        }

        #ads-analysis-result .ads-enterprise-main {
            min-width:0;
            padding:22px;
            display:grid;
            align-content:start;
            gap:16px;
        }

        #ads-analysis-result .ads-enterprise-topbar {
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:18px;
        }

        #ads-analysis-result .ads-page-breadcrumb {
            color:#8190a1;
            font-size:10px;
            font-weight:700;
            margin-bottom:5px;
        }
        #ads-analysis-result .ads-page-heading h1 {
            margin:0;
            color:#172b3f;
            font-size:25px;
            line-height:1.2;
            font-weight:700;
            letter-spacing:-.45px;
        }
        #ads-analysis-result .ads-page-heading p {
            margin:6px 0 0;
            color:#728397;
            font-size:12px;
            line-height:1.6;
        }

        #ads-analysis-result .ads-topbar-status {
            display:flex;
            align-items:center;
            gap:8px;
            padding:9px 12px;
            border:1px solid #dce9e3;
            border-radius:999px;
            background:#f6fbf8;
            color:#357259;
            font-size:10px;
            font-weight:700;
            white-space:nowrap;
        }
        #ads-analysis-result .ads-topbar-status span {
            width:8px;
            height:8px;
            border-radius:50%;
            background:#2eb67d;
        }

        /* V150: chuyển động sống nhẹ cho các điểm trạng thái xanh, không nhấp nháy gắt. */
        #ads-analysis-result .ads-topbar-status span,
        #ads-analysis-result .ads-sidebar-help-dot,
        #ads-analysis-result .ads-sidebar-activity-empty.is-success .ads-sidebar-activity-pulse {
            transform-origin:center;
            will-change:transform, box-shadow, opacity;
            animation:adsLiveStatusBreath 2.6s ease-in-out infinite;
        }

        #ads-analysis-result .ads-sidebar-activity-empty.is-success .ads-sidebar-activity-pulse {
            animation-delay:.35s;
        }

        #ads-analysis-result .ads-sidebar-help-dot {
            animation-delay:.7s;
        }

        @keyframes adsLiveStatusBreath {
            0%, 100% {
                transform:scale(1);
                opacity:.92;
                box-shadow:0 0 0 3px rgba(46,182,125,.13);
            }
            50% {
                transform:scale(1.14);
                opacity:1;
                box-shadow:0 0 0 7px rgba(46,182,125,0);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            #ads-analysis-result .ads-topbar-status span,
            #ads-analysis-result .ads-sidebar-help-dot,
            #ads-analysis-result .ads-sidebar-activity-empty.is-success .ads-sidebar-activity-pulse {
                animation:none;
            }
        }

        #ads-analysis-result .ads-command-bar {
            display:grid;
            grid-template-columns:minmax(150px,1.2fr) minmax(145px,1fr) minmax(145px,1fr) minmax(135px,.9fr) auto minmax(130px,.9fr) auto minmax(130px,.9fr) auto;
            gap:10px;
            align-items:end;
            padding:14px;
            background:#ffffff;
            border:1px solid var(--ui-border);
            border-radius:14px;
            box-shadow:var(--ui-shadow);
        }

        #ads-analysis-result .ads-command-item {
            display:flex;
            flex-direction:column;
            gap:6px;
            min-width:0;
        }
        #ads-analysis-result .ads-command-item label {
            color:#7d8da0;
            font-size:9px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.55px;
        }

        #ads-analysis-result .company-select,
        #ads-analysis-result .report-filter-input,
        #ads-analysis-result .ads-matrix-controls input {
            width:100%;
            height:36px;
            min-width:0 !important;
            padding:6px 10px !important;
            border:1px solid #d8e1eb !important;
            border-radius:9px !important;
            background:#ffffff !important;
            color:#1b344c !important;
            font-size:11px !important;
            font-weight:700 !important;
            outline:none;
            box-shadow:none !important;
        }

        #ads-analysis-result .company-select:focus,
        #ads-analysis-result .report-filter-input:focus,
        #ads-analysis-result .ads-matrix-controls input:focus {
            border-color:#77a9ff !important;
            box-shadow:0 0 0 3px rgba(31,111,255,.1) !important;
        }

        #ads-analysis-result .ads-command-separator {
            height:36px;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#a0adba;
            font-size:9px;
            font-weight:700;
            text-transform:uppercase;
        }
        #ads-analysis-result .ads-date-arrow {
            height:36px;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#8ea0b2;
        }

        #ads-analysis-result .report-clear-btn {
            height:36px;
            margin:0 !important;
            padding:0 13px !important;
            border:1px solid #d9e2eb !important;
            border-radius:9px !important;
            background:#f8fafc !important;
            color:#5e7083 !important;
            font-size:10px !important;
            font-weight:700 !important;
            cursor:pointer;
        }
        #ads-analysis-result .report-clear-btn:hover {
            background:#eef3f7 !important;
            transform:none !important;
        }

        #ads-analysis-result .ads-kpi-workspace { display:grid;gap:12px; }
        #ads-analysis-result .ads-metric-card {
            min-height:112px;
            padding:14px !important;
            border:1px solid #e1e8f0 !important;
            border-radius:13px !important;
            background:#ffffff !important;
            box-shadow:0 7px 20px rgba(22,48,73,.05) !important;
            text-align:left !important;
            position:relative;
            overflow:hidden;
        }
        #ads-analysis-result .ads-metric-card::before {
            content:"";
            position:absolute;
            left:0;
            top:0;
            bottom:0;
            width:3px;
            background:#1f6fff;
        }
        #ads-analysis-result .metric-red::before { background:#e05252; }
        #ads-analysis-result .metric-purple::before { background:#8359e8; }
        #ads-analysis-result .metric-blue::before { background:#1f6fff; }
        #ads-analysis-result .metric-slate::before { background:#64748b; }
        #ads-analysis-result .metric-amber::before { background:#e49a18; }
        #ads-analysis-result .metric-green::before { background:#1f9b6c; }

        #ads-analysis-result .ads-metric-head {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
        }
        #ads-analysis-result .ads-metric-head span {
            color:#6d7e90;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.4px;
        }
        #ads-analysis-result .ads-metric-head i {
            font-style:normal;
            color:#a3afbc;
            font-size:9px;
            font-weight:700;
        }
        #ads-analysis-result .ads-metric-card h3 {
            margin:14px 0 0 !important;
            color:#172b3f !important;
            font-size:23px !important;
            line-height:1.1;
            font-weight:700;
        }
        #ads-analysis-result .ads-metric-card p {
            margin:7px 0 0 !important;
            color:#8795a4 !important;
            font-size:10px !important;
            font-weight:700 !important;
            text-transform:none !important;
        }

        #ads-analysis-result .ads-tab-content { display:none;animation:fadeIn .2s ease; }
        #ads-analysis-result .ads-tab-content.active { display:grid;gap:16px; }

        #ads-analysis-result .ads-content-card {
            padding:17px;
            border:1px solid var(--ui-border);
            border-radius:14px;
            background:#ffffff;
            box-shadow:var(--ui-shadow);
            min-width:0;
        }
        #ads-analysis-result .ads-content-card-head {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:12px;
            margin-bottom:13px;
        }
        #ads-analysis-result .ads-content-head-actions { align-items:center;flex-wrap:wrap; }
        #ads-analysis-result .ads-section-kicker {
            display:block;
            color:#7c8da0;
            font-size:9px;
            font-weight:700;
            letter-spacing:.8px;
            text-transform:uppercase;
            margin-bottom:4px;
        }
        #ads-analysis-result .ads-content-card-head h2,
        #ads-analysis-result .ads-rule-panel h2 {
            margin:0;
            color:#172b3f;
            font-size:17px;
            font-weight:700;
        }

        /* V145: tab lọc dữ liệu đặt cùng hàng với tiêu đề bảng */
        #ads-analysis-result .ads-title-with-scope-tabs {
            display:flex;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
            min-width:0;
        }
        #ads-analysis-result .ads-inline-scope-tabs {
            display:inline-flex;
            align-items:center;
            gap:3px;
            padding:3px;
            border:1px solid #dce5ef;
            border-radius:10px;
            background:#f5f8fc;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.8);
        }
        #ads-analysis-result .ads-inline-scope-tab {
            min-height:28px;
            padding:5px 11px;
            border:0;
            border-radius:7px;
            background:transparent;
            color:#6c7d90;
            font-family:Tahoma,Arial,Verdana,sans-serif;
            font-size:10.5px;
            font-weight:700;
            line-height:1;
            cursor:pointer;
            white-space:nowrap;
            transition:background .16s ease,color .16s ease,box-shadow .16s ease;
        }
        #ads-analysis-result .ads-inline-scope-tab:hover {
            color:#1f6fff;
            background:#edf4ff;
        }
        #ads-analysis-result .ads-inline-scope-tab.active {
            color:#ffffff;
            background:#1f6fff;
            box-shadow:0 4px 10px rgba(31,111,255,.22);
        }
        #ads-analysis-result .report-filter-input[type="month"] {
            cursor:pointer;
        }
        #ads-analysis-result .ads-card-note,
        #ads-analysis-result .ads-section-description {
            color:#7c8c9d;
            font-size:10.5px;
            line-height:1.6;
        }
        #ads-analysis-result .ads-section-description { margin:5px 0 0; }

        #ads-analysis-result .ads-chart-canvas {
            height:340px;
            padding:10px;
            border:1px solid #e6ecf2;
            border-radius:11px;
            background:#fbfcfe;
        }
        #ads-analysis-result .ads-matrix-canvas { height:430px; }

        #ads-analysis-result .table-responsive {
            overflow:auto;
            border:1px solid #e3e9ef !important;
            border-radius:11px !important;
            background:#ffffff;
        }
        #ads-analysis-result .ads-table {
            min-width:920px;
            width:100%;
            border-collapse:separate;
            border-spacing:0;
            background:#ffffff !important;
            font-size:10.5px;
        }
        #ads-analysis-result .ads-table th {
            position:sticky;
            top:0;
            z-index:4;
            padding:10px !important;
            border-bottom:1px solid #dfe7ee !important;
            background:#f7f9fb !important;
            color:#45596d !important;
            box-shadow:none !important;
            font-family:Arial, Helvetica, sans-serif !important;
            font-size:10px;
            line-height:1.35;
            font-weight:700;
            letter-spacing:0;
            text-rendering:optimizeLegibility;
            -webkit-font-smoothing:antialiased;
            -moz-osx-font-smoothing:grayscale;
        }

        #ads-analysis-result .ads-table-head-note {
            display:inline-block;
            margin-left:3px;
            color:#94a3b3;
            font-size:8.5px;
            line-height:1;
            font-style:italic;
            font-weight:400;
            letter-spacing:0;
            white-space:nowrap;
        }
        #ads-analysis-result .ads-table td {
            padding:9px 10px !important;
            border-bottom:1px solid #eef2f5 !important;
            color:#263d53;
            background:#ffffff;
        }
        #ads-analysis-result .ads-table tbody tr:hover td {
            background:#f7fbff !important;
        }

        #ads-analysis-result .ads-table-actions,
        #ads-analysis-result .ads-matrix-controls {
            display:flex;
            gap:8px;
            flex-wrap:wrap;
        }
        #ads-analysis-result .btn-export-excel,
        #ads-analysis-result .btn-toggle-history {
            min-height:34px;
            padding:0 12px !important;
            border-radius:8px !important;
            font-size:10px !important;
            font-weight:700 !important;
            display:inline-flex;
            align-items:center;
            gap:6px;
            box-shadow:none !important;
        }
        #ads-analysis-result .btn-export-excel {
            background:#1f6fff !important;
            color:#ffffff !important;
            border:1px solid #1f6fff !important;
        }
        #ads-analysis-result .btn-export-excel:hover {
            background:#145fdc !important;
            transform:none !important;
        }
        #ads-analysis-result .btn-toggle-history {
            background:#ffffff !important;
            color:#506479 !important;
            border:1px solid #d8e1e9 !important;
        }

        #ads-analysis-result .ads-export-history {
            margin-top:14px;
            padding:13px;
            border:1px solid #e2e9f0;
            border-radius:11px;
            background:#fafcfe;
        }
        #ads-analysis-result .ads-export-history-title {
            margin-bottom:9px;
            color:#31485e;
            font-size:11px;
            font-weight:700;
        }

        #ads-analysis-result .ads-trend-layout {
            display:grid;
            grid-template-columns:260px minmax(0,1fr);
            gap:16px;
        }
        #ads-analysis-result .ads-rule-list { display:grid;gap:8px;margin-top:14px; }
        #ads-analysis-result .ads-rule-item {
            padding:10px 11px;
            border:1px solid #e5ebf1;
            border-left:3px solid #94a3b8;
            border-radius:9px;
            background:#fbfcfd;
        }
        #ads-analysis-result .ads-rule-item b {
            display:block;
            color:#334b60;
            font-size:10.5px;
        }
        #ads-analysis-result .ads-rule-item span {
            display:block;
            margin-top:3px;
            color:#7f8e9e;
            font-size:9.5px;
            line-height:1.5;
        }
        #ads-analysis-result .rule-red { border-left-color:#e05252; }
        #ads-analysis-result .rule-green { border-left-color:#1f9b6c; }
        #ads-analysis-result .rule-blue { border-left-color:#1f6fff; }
        #ads-analysis-result .rule-orange { border-left-color:#e49a18; }
        #ads-analysis-result .rule-purple { border-left-color:#8359e8; }
        #ads-analysis-result .rule-gray { border-left-color:#8b9aa9; }

        #ads-analysis-result .ads-matrix-controls label {
            display:flex;
            flex-direction:column;
            gap:5px;
            color:#6f8092;
            font-size:9px;
            font-weight:700;
        }
        #ads-analysis-result .ads-matrix-controls input { width:135px; }

        #ads-analysis-result .ads-report-preview {
            min-height:160px;
            overflow:auto;
            border:1px solid #e4eaf0;
            border-radius:11px;
            background:#fbfcfd;
            padding:14px;
        }

        #upload-controls-container {
            margin:0 !important;
        }
        #upload-controls-container .ads-data-center {
            padding:15px;
            border:1px solid var(--ui-border);
            border-radius:14px;
            background:#ffffff;
            box-shadow:var(--ui-shadow);
        }
        #upload-controls-container .ads-data-center-head {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:15px;
        }
        #upload-controls-container .ads-data-center-head h2 {
            margin:3px 0 4px;
            color:#172b3f;
            font-size:16px;
            font-weight:700;
        }
        #upload-controls-container .ads-data-center-head p {
            margin:0;
            color:#7c8c9c;
            font-size:10.5px;
            line-height:1.5;
        }
        #upload-controls-container .ads-data-actions {
            display:grid;
            grid-template-columns:repeat(3,minmax(150px,1fr));
            gap:8px;
            min-width:500px;
        }
        #upload-controls-container .ads-data-action {
            min-height:58px;
            padding:9px 10px;
            border:1px solid #dde5ed;
            border-radius:10px;
            background:#ffffff;
            display:flex;
            align-items:center;
            gap:9px;
            text-align:left;
            cursor:pointer;
            transition:.15s ease;
        }
        #upload-controls-container .ads-data-action:hover {
            border-color:#a9c8ff;
            background:#f8fbff;
        }
        #upload-controls-container .ads-data-action-icon {
            width:32px;
            height:32px;
            flex:0 0 32px;
            border-radius:9px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#eef4ff;
            color:#1f6fff;
            font-size:15px;
            font-weight:700;
        }
        #upload-controls-container .action-revenue .ads-data-action-icon { background:#e9f7f1;color:#16885f; }
        #upload-controls-container .action-bank .ads-data-action-icon { background:#f2edff;color:#7651d6; }
        #upload-controls-container .ads-data-action b {
            display:block;
            color:#2c4358;
            font-size:10.5px;
        }
        #upload-controls-container .ads-data-action small {
            display:block;
            margin-top:2px;
            color:#8a98a7;
            font-size:9px;
        }

        #upload-controls-container .ads-history-workspace {
            margin-top:12px;
            padding-top:12px;
            border-top:1px solid #edf1f4;
        }
        #upload-controls-container .ads-history-toolbar {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin-bottom:8px;
        }
        #upload-controls-container .history-search-wrapper {
            margin:0 !important;
            max-width:360px;
        }
        #upload-controls-container .history-search-box {
            width:100%;
            min-height:34px;
            padding:6px 10px 6px 28px;
            border:1px solid #dce4ec;
            border-radius:8px;
            background:#fbfcfd;
            font-size:10px;
        }
        #upload-controls-container .search-icon { left:9px;color:#93a0ae; }
        #upload-controls-container .btn-view-all {
            min-height:32px;
            padding:0 11px;
            border:1px solid #d8e1e9;
            border-radius:8px;
            background:#ffffff;
            color:#53677b;
            font-size:9px;
            font-weight:700;
            box-shadow:none;
        }
        #upload-controls-container .history-grid,
        #upload-controls-container .history-box {
            margin:0 !important;
            padding:0 !important;
            border:0 !important;
            background:transparent !important;
            box-shadow:none !important;
        }
        #upload-controls-container .ads-data-history-scroll {
            max-height:260px;
            border:1px solid #e5ebf1;
            border-radius:9px;
            background:#ffffff;
            padding:0 !important;
        }

        #ads-upload-area,
        .upload-area#ads-upload-area { display:none !important; }


        /* =========================================================
           V116 SIDEBAR STICKY + COLLAPSE / NO SCROLLBAR
           Chỉ thay hành vi giao diện, không thay logic dữ liệu.
        ========================================================= */
        #ads-analysis-result {
            overflow:visible !important;
        }

        #ads-analysis-result .ads-enterprise-shell {
            align-items:start;
            border-radius:18px;
            transition:grid-template-columns .22s ease;
        }

        #ads-analysis-result .ads-enterprise-sidebar {
            position:sticky !important;
            top:12px;
            z-index:40;
            height:calc(100vh - 24px);
            min-height:560px;
            overflow-y:auto;
            overflow-x:visible;
            align-self:start;
            border:1px solid var(--ui-border);
            border-left:0;
            border-radius:0 16px 16px 0;
            box-shadow:0 12px 34px rgba(16,39,64,.08);
            transition:padding .22s ease, width .22s ease;
        }

        #ads-analysis-result .ads-enterprise-sidebar::-webkit-scrollbar { width:4px; }
        #ads-analysis-result .ads-enterprise-sidebar::-webkit-scrollbar-thumb {
            background:#d4dee8;
            border-radius:999px;
        }

        #ads-analysis-result .ads-sidebar-toggle {
            position:absolute;
            top:18px;
            right:-14px;
            z-index:5;
            width:30px;
            height:30px;
            border:1px solid #d8e2ec;
            border-radius:10px;
            background:#ffffff;
            color:#31506d;
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            font-size:21px;
            font-weight:700;
            line-height:1;
            box-shadow:0 6px 16px rgba(16,39,64,.12);
            transition:.18s ease;
        }

        #ads-analysis-result .ads-sidebar-toggle:hover {
            color:#1f6fff;
            border-color:#9fc0ff;
            transform:translateY(-1px);
        }

        #ads-analysis-result .ads-enterprise-shell.sidebar-collapsed {
            grid-template-columns:78px minmax(0,1fr);
        }

        #ads-analysis-result .sidebar-collapsed .ads-enterprise-sidebar {
            padding-left:10px;
            padding-right:10px;
            align-items:center;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-brand {
            width:100%;
            justify-content:center;
            padding-left:0;
            padding-right:0;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-brand > div:last-child,
        #ads-analysis-result .sidebar-collapsed .ads-sidebar-section-label,
        #ads-analysis-result .sidebar-collapsed .ads-nav-copy,
        #ads-analysis-result .sidebar-collapsed .ads-sidebar-activity,
        #ads-analysis-result .sidebar-collapsed .ads-sidebar-help div {
            display:none !important;
        }

        #ads-analysis-result .sidebar-collapsed .ads-tabs.ads-sidebar-nav {
            width:100%;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-nav .ads-tab-btn {
            justify-content:center;
            padding:8px !important;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-nav .ads-tab-btn::before {
            left:-10px;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-help {
            justify-content:center;
            padding:10px;
        }

        #ads-analysis-result #tab-finance #ads-data-center-mount {
            margin-bottom:14px;
        }

        #upload-controls-container .ads-data-actions {
            grid-template-columns:repeat(4,minmax(135px,1fr));
            min-width:660px;
        }

        #upload-controls-container .action-history .ads-data-action-icon {
            background:#fff4e6;
            color:#d97706;
        }

        #upload-controls-container .ads-data-action.action-history.active {
            border-color:#f4b65e;
            background:#fffaf1;
            box-shadow:0 0 0 3px rgba(217,119,6,.08);
        }

        #upload-controls-container .ads-history-workspace {
            animation:adsHistoryReveal .2s ease;
        }

        @keyframes adsHistoryReveal {
            from { opacity:0; transform:translateY(-5px); }
            to { opacity:1; transform:translateY(0); }
        }

        @media (max-width:1250px) {
            #ads-analysis-result .ads-command-bar {
                grid-template-columns:repeat(4,minmax(130px,1fr));
            }
            #ads-analysis-result .ads-command-separator,
            #ads-analysis-result .ads-date-arrow { display:none; }
            #ads-analysis-result .ads-trend-layout { grid-template-columns:1fr; }
            #upload-controls-container .ads-data-center-head { flex-direction:column; }
            #upload-controls-container .ads-data-actions { min-width:0;width:100%;grid-template-columns:repeat(2,minmax(0,1fr)); }
        }

        @media (max-width:980px) {
            #ads-analysis-result .ads-enterprise-shell { grid-template-columns:76px minmax(0,1fr); }
            #ads-analysis-result .ads-sidebar-brand > div:last-child,
            #ads-analysis-result .ads-sidebar-section-label,
            #ads-analysis-result .ads-nav-copy,
            #ads-analysis-result .ads-sidebar-activity,
            #ads-analysis-result .ads-sidebar-help div { display:none; }
            #ads-analysis-result .ads-enterprise-sidebar { padding:16px 10px;align-items:center; }
            #ads-analysis-result .ads-sidebar-brand { padding:0 0 16px;border:0; }
            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn { justify-content:center;padding:8px !important; }
            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn::before { left:-10px; }
            #ads-analysis-result .ads-sidebar-help { padding:10px; }
            #ads-analysis-result #kpi-performance,
            #ads-analysis-result #kpi-finance { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
        }

        @media (max-width:760px) {
            #ads-analysis-result .ads-enterprise-shell { display:block; }
            #ads-analysis-result .ads-enterprise-sidebar {
                min-height:0;
                padding:10px;
                border-right:0;
                border-bottom:1px solid var(--ui-border);
                align-items:stretch;
            }
            #ads-analysis-result .ads-sidebar-brand,
            #ads-analysis-result .ads-sidebar-help { display:none; }
            #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                display:grid !important;
                grid-template-columns:repeat(4,1fr);
            }
            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                min-height:46px;
            }
            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn::before { display:none; }
            #ads-analysis-result .ads-enterprise-main { padding:14px; }
            #ads-analysis-result .ads-enterprise-topbar { flex-direction:column; }
            #ads-analysis-result .ads-command-bar { grid-template-columns:repeat(2,minmax(0,1fr)); }
            #upload-controls-container .ads-data-actions { grid-template-columns:1fr; }
            #ads-analysis-result .ads-enterprise-sidebar { position:sticky !important;top:0;height:auto;min-height:0;border-radius:0; }
            #ads-analysis-result .ads-sidebar-toggle { display:none; }
            #ads-analysis-result .ads-content-card-head { flex-direction:column; }
        }

        @media (max-width:520px) {
            #ads-analysis-result .ads-tabs.ads-sidebar-nav { grid-template-columns:repeat(2,1fr); }
            #ads-analysis-result .ads-command-bar { grid-template-columns:1fr; }
            #ads-analysis-result #kpi-performance,
            #ads-analysis-result #kpi-finance { grid-template-columns:1fr !important; }
            #ads-analysis-result .ads-chart-canvas { height:310px; }
            #ads-analysis-result .ads-matrix-canvas { height:360px; }
        }

        /* =========================================================
           V116 SIDEBAR DISPLAY FIX
           Nút thu gọn luôn nằm trọn bên trong, sidebar không có scrollbar.
        ========================================================= */
        #ads-analysis-result .ads-enterprise-sidebar {
            box-sizing:border-box;
            overflow:hidden !important;
            scrollbar-width:none !important;
            -ms-overflow-style:none !important;
            padding-top:18px !important;
        }

        #ads-analysis-result .ads-enterprise-sidebar::-webkit-scrollbar {
            display:none !important;
            width:0 !important;
            height:0 !important;
        }

        #ads-analysis-result .ads-sidebar-toggle {
            top:14px !important;
            right:10px !important;
            left:auto !important;
            width:32px !important;
            height:32px !important;
            flex:0 0 32px;
            border-radius:10px !important;
            z-index:60 !important;
            overflow:hidden;
        }

        #ads-analysis-result .ads-sidebar-brand {
            min-height:48px;
            padding-right:42px !important;
        }

        #ads-analysis-result .sidebar-collapsed .ads-enterprise-sidebar {
            padding-left:9px !important;
            padding-right:9px !important;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-toggle {
            top:13px !important;
            right:50% !important;
            transform:translateX(50%) !important;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-toggle:hover {
            transform:translateX(50%) translateY(-1px) !important;
        }

        #ads-analysis-result .sidebar-collapsed .ads-sidebar-brand {
            padding-top:42px !important;
            padding-right:0 !important;
            min-height:86px;
        }

        #ads-analysis-result .ads-tabs.ads-sidebar-nav {
            overflow:hidden !important;
            flex:0 0 auto;
        }

        #ads-analysis-result .ads-sidebar-help {
            flex:0 0 auto;
        }

        @media (max-height:760px) and (min-width:901px) {
            #ads-analysis-result .ads-enterprise-sidebar {
                top:8px !important;
                height:calc(100vh - 16px) !important;
                min-height:0 !important;
                padding-top:14px !important;
                padding-bottom:12px !important;
            }

            #ads-analysis-result .ads-sidebar-brand {
                padding-bottom:12px !important;
            }

            #ads-analysis-result .ads-sidebar-section-label {
                margin-top:12px !important;
                margin-bottom:6px !important;
            }

            #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                gap:4px !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                min-height:48px !important;
                padding-top:7px !important;
                padding-bottom:7px !important;
            }

            #ads-analysis-result .ads-nav-icon {
                width:29px !important;
                height:29px !important;
                flex-basis:29px !important;
            }

            #ads-analysis-result .ads-sidebar-help {
                padding:9px !important;
            }
        }

        @media (max-width:900px) {
            #ads-analysis-result .ads-enterprise-sidebar {
                overflow:hidden !important;
            }

            #ads-analysis-result .ads-sidebar-brand {
                padding-right:0 !important;
            }
        }


        /* =========================================================
           V155 RESPONSIVE LAYOUT
           - Không cho trang tổng bị tràn ngang.
           - Bảng rộng chỉ cuộn bên trong khung bảng.
           - Tablet/mobile chuyển sidebar thành thanh điều hướng trên.
        ========================================================= */
        #ads-analysis-result,
        #upload-controls-container {
            width:100% !important;
            max-width:100% !important;
            min-width:0 !important;
        }

        #ads-analysis-result {
            overflow-x:hidden !important;
        }

        #ads-analysis-result .ads-enterprise-shell,
        #ads-analysis-result .ads-enterprise-main,
        #ads-analysis-result .ads-tab-content,
        #ads-analysis-result .ads-kpi-workspace,
        #ads-analysis-result .ads-content-card,
        #ads-analysis-result .ads-content-card-head,
        #ads-analysis-result .ads-chart-canvas,
        #ads-analysis-result .ads-report-preview,
        #ads-analysis-result .ads-trend-layout,
        #upload-controls-container .ads-data-center,
        #upload-controls-container .ads-history-workspace {
            min-width:0 !important;
            max-width:100% !important;
        }

        #ads-analysis-result .ads-enterprise-main,
        #ads-analysis-result .ads-tab-content,
        #ads-analysis-result .ads-content-card,
        #ads-analysis-result .ads-chart-canvas,
        #ads-analysis-result .ads-report-preview {
            width:100% !important;
        }

        #ads-analysis-result .ads-enterprise-topbar > *,
        #ads-analysis-result .ads-content-card-head > *,
        #upload-controls-container .ads-data-center-head > * {
            min-width:0 !important;
            max-width:100% !important;
        }

        #ads-analysis-result .table-responsive,
        #ads-analysis-result .ads-report-preview,
        #upload-controls-container .table-responsive {
            width:100% !important;
            max-width:100% !important;
            overflow-x:auto !important;
            overflow-y:auto;
            overscroll-behavior-inline:contain;
            -webkit-overflow-scrolling:touch;
        }

        #ads-analysis-result .table-responsive .ads-table,
        #ads-analysis-result .ads-report-preview .ads-table,
        #upload-controls-container .table-responsive table {
            width:max-content !important;
            min-width:100% !important;
            max-width:none !important;
        }

        #ads-analysis-result canvas {
            display:block;
            max-width:100% !important;
        }

        #ads-analysis-result .ads-page-heading,
        #ads-analysis-result .ads-page-heading h1,
        #ads-analysis-result .ads-page-heading p,
        #ads-analysis-result .ads-title-with-scope-tabs,
        #ads-analysis-result .meta-live-search-area,
        #ads-analysis-result .meta-live-search-shell,
        #ads-analysis-result .meta-live-search-tokens {
            min-width:0 !important;
            max-width:100% !important;
        }

        #ads-analysis-result .ads-page-heading h1,
        #ads-analysis-result .ads-page-heading p,
        #ads-analysis-result .ads-content-card-head h2,
        #ads-analysis-result .ads-card-note,
        #ads-analysis-result .ads-section-description {
            overflow-wrap:anywhere;
        }

        #ads-analysis-result .meta-live-search-input {
            min-width:110px !important;
            max-width:100% !important;
        }

        #ads-analysis-result .custom-toast,
        .custom-toast {
            min-width:0 !important;
            width:min(420px, calc(100vw - 24px)) !important;
            max-width:calc(100vw - 24px) !important;
            white-space:normal !important;
            overflow-wrap:anywhere;
        }

        @media (max-width:1024px) {
            #ads-analysis-result .ads-enterprise-shell {
                display:block !important;
                min-height:0 !important;
            }

            #ads-analysis-result .ads-enterprise-sidebar {
                position:sticky !important;
                top:0 !important;
                z-index:80 !important;
                width:100% !important;
                height:auto !important;
                min-height:0 !important;
                padding:9px 10px 10px !important;
                border-right:0 !important;
                border-bottom:1px solid var(--ui-border) !important;
                border-radius:0 !important;
                align-items:stretch !important;
                background:rgba(255,255,255,.98) !important;
                backdrop-filter:blur(12px);
            }

            #ads-analysis-result .ads-sidebar-toggle,
            #ads-analysis-result .ads-sidebar-brand,
            #ads-analysis-result .ads-sidebar-section-label,
            #ads-analysis-result .ads-sidebar-help {
                display:none !important;
            }

            #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                display:grid !important;
                grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                gap:6px !important;
                width:100% !important;
                overflow:visible !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                min-width:0 !important;
                min-height:48px !important;
                justify-content:center !important;
                padding:7px 8px !important;
                gap:7px !important;
                text-align:center !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn::before {
                display:none !important;
            }

            #ads-analysis-result .ads-nav-icon {
                width:28px !important;
                height:28px !important;
                flex:0 0 28px !important;
                font-size:13px !important;
            }

            #ads-analysis-result .ads-nav-copy {
                display:block !important;
                min-width:0 !important;
            }

            #ads-analysis-result .ads-nav-copy b {
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
                font-size:10px !important;
            }

            #ads-analysis-result .ads-nav-copy small {
                display:none !important;
            }

            #ads-analysis-result .ads-sidebar-activity {
                display:block !important;
                margin:8px 0 0 !important;
                padding:8px 0 0 !important;
            }

            #ads-analysis-result .ads-sidebar-activity-head {
                margin:0 2px 6px !important;
            }

            #ads-analysis-result .ads-sidebar-activity-list {
                display:grid !important;
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                gap:6px !important;
                max-height:96px;
                overflow:auto;
            }

            #ads-analysis-result .ads-sidebar-activity-item,
            #ads-analysis-result .ads-sidebar-activity-empty {
                min-height:42px;
            }

            #ads-analysis-result .ads-enterprise-main {
                padding:14px !important;
                gap:13px !important;
            }

            #ads-analysis-result .ads-enterprise-topbar {
                align-items:flex-start !important;
                flex-wrap:wrap !important;
            }

            #ads-analysis-result .ads-command-bar {
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                gap:9px !important;
                padding:12px !important;
            }

            #ads-analysis-result .ads-command-separator,
            #ads-analysis-result .ads-date-arrow {
                display:none !important;
            }

            #ads-analysis-result .report-clear-btn {
                width:100% !important;
            }

            #ads-analysis-result #kpi-performance,
            #ads-analysis-result #kpi-finance {
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            }

            #ads-analysis-result .ads-trend-layout {
                grid-template-columns:1fr !important;
            }

            #upload-controls-container .ads-data-center-head {
                flex-direction:column !important;
            }

            #upload-controls-container .ads-data-actions {
                width:100% !important;
                min-width:0 !important;
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            }
        }

        @media (max-width:640px) {
            #ads-analysis-result {
                border-radius:0 !important;
            }

            #ads-analysis-result .ads-enterprise-sidebar {
                padding:8px !important;
            }

            #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                justify-content:flex-start !important;
                text-align:left !important;
            }

            #ads-analysis-result .ads-sidebar-activity-list {
                grid-template-columns:1fr !important;
                max-height:88px;
            }

            #ads-analysis-result .ads-enterprise-main {
                padding:10px !important;
                gap:10px !important;
            }

            #ads-analysis-result .ads-enterprise-topbar {
                gap:10px !important;
            }

            #ads-analysis-result .ads-page-heading h1 {
                font-size:20px !important;
            }

            #ads-analysis-result .ads-page-heading p {
                font-size:10.5px !important;
            }

            #ads-analysis-result .ads-topbar-status {
                width:100%;
                justify-content:center;
            }

            #ads-analysis-result .ads-command-bar {
                grid-template-columns:1fr !important;
                padding:10px !important;
            }

            #ads-analysis-result #kpi-performance,
            #ads-analysis-result #kpi-finance {
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                gap:8px !important;
            }

            #ads-analysis-result .ads-metric-card {
                min-height:94px !important;
                padding:11px !important;
            }

            #ads-analysis-result .ads-metric-card h3 {
                font-size:18px !important;
                margin-top:10px !important;
            }

            #ads-analysis-result .ads-content-card {
                padding:11px !important;
                border-radius:11px !important;
            }

            #ads-analysis-result .ads-content-card-head,
            #ads-analysis-result .ads-data-center-head {
                flex-direction:column !important;
                align-items:stretch !important;
            }

            #ads-analysis-result .ads-content-head-actions .ads-table-actions,
            #ads-analysis-result .ads-content-head-actions > .btn-export-excel,
            #ads-analysis-result .ads-inline-scope-tabs,
            #ads-analysis-result .ads-title-with-scope-tabs {
                width:100% !important;
            }

            #ads-analysis-result .ads-table-actions {
                display:grid !important;
                grid-template-columns:1fr 1fr !important;
            }

            #ads-analysis-result .btn-export-excel,
            #ads-analysis-result .btn-toggle-history {
                justify-content:center !important;
                width:100% !important;
            }

            #ads-analysis-result .ads-inline-scope-tabs {
                display:grid !important;
                grid-template-columns:1fr 1fr !important;
            }

            #ads-analysis-result .meta-live-search-shell {
                min-height:42px !important;
                padding:6px 7px !important;
                flex-wrap:wrap !important;
            }

            #ads-analysis-result .meta-live-search-tokens {
                width:100% !important;
                order:1;
            }

            #ads-analysis-result .meta-live-search-input {
                order:2;
                flex:1 1 130px !important;
            }

            #ads-analysis-result .meta-live-search-count {
                order:3;
                margin-left:auto;
            }

            #ads-analysis-result .meta-live-search-clear {
                order:4;
            }

            #ads-analysis-result .ads-chart-canvas {
                height:280px !important;
                padding:6px !important;
            }

            #ads-analysis-result .ads-matrix-canvas {
                height:320px !important;
            }

            #ads-analysis-result .ads-report-preview {
                padding:8px !important;
            }

            #ads-analysis-result .report-mkt-wrapper {
                min-width:720px;
            }

            #upload-controls-container .ads-data-actions {
                grid-template-columns:1fr !important;
            }
        }

        @media (max-width:430px) {
            #ads-analysis-result #kpi-performance,
            #ads-analysis-result #kpi-finance {
                grid-template-columns:1fr !important;
            }

            #ads-analysis-result .ads-table-actions {
                grid-template-columns:1fr !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                min-height:43px !important;
            }

            #ads-analysis-result .ads-nav-icon {
                width:25px !important;
                height:25px !important;
                flex-basis:25px !important;
            }
        }


    `;

    document.head.appendChild(style);



    if (!document.getElementById('toast-container')) {

        const div = document.createElement('div');

        div.id = 'toast-container';

        document.body.appendChild(div);

    }

}



function resetInterface() {

    const container = document.getElementById('ads-analysis-result');

    if (container) {

        container.style.display = 'block';

        let optionsHtml = COMPANIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');



        container.innerHTML = `
            <style>
                .text-left { text-align:left; }
                .text-right { text-align:right; }
                .text-center { text-align:center; }
            </style>

            <div class="ads-enterprise-shell">
                <aside class="ads-enterprise-sidebar">
                    <button type="button" id="ads-sidebar-toggle" class="ads-sidebar-toggle" onclick="window.toggleAdsSidebar()" aria-label="Thu gọn thanh điều hướng" aria-expanded="true" title="Thu gọn thanh điều hướng">‹</button>
                    <div class="ads-sidebar-brand">
                        <div class="ads-sidebar-logo">A</div>
                        <div>
                            <strong>ADS CONTROL</strong>
                            <small>Marketing Analytics</small>
                        </div>
                    </div>

                    <div class="ads-sidebar-section-label">Không gian làm việc</div>
                    <nav class="ads-tabs ads-sidebar-nav">
                        <button class="ads-tab-btn active" onclick="window.switchAdsTab('performance')" id="btn-tab-perf" title="Meta Live">
                            <span class="ads-nav-icon">◫</span>
                            <span class="ads-nav-copy"><b>Meta Live</b><small>Facebook Ads trực tiếp</small></span>
                        </button>
                        <button class="ads-tab-btn" onclick="window.switchAdsTab('finance')" id="btn-tab-fin" title="Tài chính">
                            <span class="ads-nav-icon">₫</span>
                            <span class="ads-nav-copy"><b>Tài chính</b><small>Doanh thu · ROAS</small></span>
                        </button>
                        <button class="ads-tab-btn" onclick="window.switchAdsTab('trend')" id="btn-tab-trend" title="Ma trận">
                            <span class="ads-nav-icon">◎</span>
                            <span class="ads-nav-copy"><b>Ma trận</b><small>Chẩn đoán tối ưu</small></span>
                        </button>
                        <button class="ads-tab-btn" onclick="window.switchAdsTab('report')" id="btn-tab-report" title="Báo cáo MKT">
                            <span class="ads-nav-icon">▤</span>
                            <span class="ads-nav-copy"><b>Báo cáo MKT</b><small>Tổng hợp · xuất file</small></span>
                        </button>
                    </nav>

                    <section class="ads-sidebar-activity" id="ads-sidebar-activity" aria-label="Hoạt động quảng cáo gần đây">
                        <div class="ads-sidebar-activity-head">
                            <strong>Hoạt động quảng cáo</strong>
                            <span class="ads-sidebar-activity-badge" id="ads-sidebar-activity-badge">LIVE</span>
                        </div>
                        <div class="ads-sidebar-activity-list" id="ads-sidebar-activity-list" aria-live="polite">
                            <div class="ads-sidebar-activity-empty">
                                <span class="ads-sidebar-activity-pulse"></span>
                                <div><b>Đang chờ dữ liệu Meta</b><small>Hoạt động mới sẽ xuất hiện tại đây.</small></div>
                            </div>
                        </div>
                    </section>

                    <div class="ads-sidebar-help">
                        <span class="ads-sidebar-help-dot"></span>
                        <div>
                            <b>Nguồn hiệu quả</b>
                            <small>Meta Marketing API</small>
                        </div>
                    </div>
                </aside>

                <main class="ads-enterprise-main">
                    <header class="ads-enterprise-topbar">
                        <div class="ads-page-heading">
                            <div class="ads-page-breadcrumb">Marketing System / Quảng cáo</div>
                            <h1>Trung tâm phân tích hiệu quả Ads</h1>
                            <p>Quản lý dữ liệu quảng cáo, tài chính và báo cáo trên một màn hình làm việc thống nhất.</p>
                        </div>
                        <div class="ads-topbar-status">
                            <span></span>
                            Hệ thống hoạt động
                        </div>
                    </header>

                    <section class="ads-command-bar">
                        <div class="ads-command-item ads-command-company">
                            <label>Công ty</label>
                            <select id="company-selector" class="company-select" onchange="window.changeCompany(this.value)">
                                ${optionsHtml}
                            </select>
                        </div>

                        <div class="ads-command-item">
                            <label>Góc nhìn</label>
                            <select id="view-mode-selector" class="company-select" onchange="window.changeViewMode(this.value)">
                                <option value="employee">Theo Chiến Dịch</option>
                                <option value="product">Theo Sản Phẩm (SKU)</option>
                            </select>
                        </div>

                        <div class="ads-command-item">
                            <label>Sắp xếp biểu đồ</label>
                            <select id="sort-mode-selector" class="company-select" onchange="window.changeSortMode(this.value)">
                                <option value="spend">Tiền Đã Chi</option>
                                <option value="purchases">Lượt Mua</option>
                                <option value="messages">Lượt Tin Nhắn</option>
                                <option value="cr">Tỷ Lệ Mua/Tin</option>
                            </select>
                        </div>

                        <div class="ads-command-item ads-command-period">
                            <label>Kỳ báo cáo</label>
                            <input type="month" id="report-month-filter" class="report-filter-input" value="${REPORT_MONTH}" onclick="window.openReportMonthPicker(this)" onchange="window.applyReportMonthFilter()">
                        </div>

                        <div class="ads-command-separator"><span>hoặc</span></div>

                        <div class="ads-command-item ads-command-date">
                            <label>Từ ngày</label>
                            <input type="date" id="date-from" class="report-filter-input" value="${DATE_FROM}" onchange="window.applyDateFilter()">
                        </div>

                        <div class="ads-date-arrow">→</div>

                        <div class="ads-command-item ads-command-date">
                            <label>Đến ngày</label>
                            <input type="date" id="date-to" class="report-filter-input" value="${DATE_TO}" onchange="window.applyDateFilter()">
                        </div>

                        <button onclick="window.clearDateFilter()" class="report-clear-btn">Đặt lại</button>
                    </section>

                    <section class="ads-kpi-workspace">
                        <div id="kpi-performance" class="kpi-section active" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:0;">
                            <article class="ads-card ads-metric-card metric-red">
                                <div class="ads-metric-head"><span>Chi phí Ads</span><i>01</i></div>
                                <h3 id="perf-spend">0 ₫</h3>
                                <p>Chưa bao gồm VAT</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-purple">
                                <div class="ads-metric-head"><span>Tin nhắn</span><i>02</i></div>
                                <h3 id="perf-msg">0</h3>
                                <p>Tổng lượt liên hệ</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-blue">
                                <div class="ads-metric-head"><span>Lượt mua</span><i>03</i></div>
                                <h3 id="perf-leads">0</h3>
                                <p>Tổng chuyển đổi mua</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-slate">
                                <div class="ads-metric-head"><span>Chi phí / đơn</span><i>04</i></div>
                                <h3 id="perf-cpl">0 ₫</h3>
                                <p>CPA trung bình</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-amber">
                                <div class="ads-metric-head"><span>Mua / tin</span><i>05</i></div>
                                <h3 id="perf-ctr">0%</h3>
                                <p>Tỷ lệ chuyển đổi</p>
                            </article>
                        </div>

                        <div id="kpi-finance" class="kpi-section" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:0;">
                            <article class="ads-card ads-metric-card metric-red">
                                <div class="ads-metric-head"><span>Tổng chi Ads <small style="font-size:8px;color:#1f6fff;">LIVE</small></span><i>01</i></div>
                                <h3 id="fin-spend">0 ₫</h3>
                                <p>Chi phí Meta realtime + VAT</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-purple">
                                <div class="ads-metric-head"><span>Sao kê</span><i>02</i></div>
                                <h3 id="fin-statement">0 ₫</h3>
                                <p>Tổng tiền ngân hàng</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-blue">
                                <div class="ads-metric-head"><span>Lượt mua</span><i>03</i></div>
                                <h3 id="fin-leads">0</h3>
                                <p>Tổng chuyển đổi</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-green">
                                <div class="ads-metric-head"><span>Doanh thu</span><i>04</i></div>
                                <h3 id="fin-revenue">0 ₫</h3>
                                <p>Doanh thu đã khớp</p>
                            </article>
                            <article class="ads-card ads-metric-card metric-amber">
                                <div class="ads-metric-head"><span>ROAS tổng</span><i>05</i></div>
                                <h3 id="fin-roas">0x</h3>
                                <p>Doanh thu / tổng chi</p>
                            </article>
                        </div>
                    </section>

                    <div id="tab-performance" class="ads-tab-content active">
                        <section class="ads-content-card ads-chart-card">
                            <div class="ads-content-card-head">
                                <div>
                                    <span class="ads-section-kicker">META LIVE / TỔNG QUAN HIỆU SUẤT</span>
                                    <h2>Biểu đồ hiệu quả quảng cáo trực tiếp</h2>
                                </div>
                                <div class="ads-meta-live-toolbar">
                                    <div id="meta-live-status-chip" class="meta-live-status-chip is-loading">
                                        <span class="meta-live-pulse"></span>
                                        <span id="meta-live-status-text">Đang kết nối Meta Live...</span>
                                    </div>
                                    <button type="button" id="meta-live-refresh-btn" class="meta-live-refresh-btn" onclick="window.refreshMetaAdsLive(true)">
                                        ↻ Cập nhật Meta
                                    </button>
                                </div>
                            </div>
                            <div class="ads-chart-canvas"><canvas id="chart-ads-perf"></canvas></div>
                        </section>

                        <section class="ads-content-card ads-data-card">
                            <div class="ads-content-card-head ads-content-head-actions">
                                <div>
                                    <span class="ads-section-kicker">DỮ LIỆU CHI TIẾT</span>
                                    <div class="ads-title-with-scope-tabs">
                                        <h2>Danh sách bài quảng cáo <span style="font-size:10px;color:#1f6fff;background:#eaf2ff;padding:3px 7px;border-radius:999px;vertical-align:2px;">META LIVE</span></h2>
                                        <div class="ads-inline-scope-tabs" aria-label="Phạm vi dữ liệu Meta Live">
                                            <button type="button" class="ads-inline-scope-tab active" data-ads-scope-target="performance" data-ads-scope-value="overview" onclick="window.changeAdsDataScope('performance','overview')">Tổng quan</button>
                                            <button type="button" class="ads-inline-scope-tab" data-ads-scope-target="performance" data-ads-scope-value="marketing" onclick="window.changeAdsDataScope('performance','marketing')">Marketing</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="meta-live-search-area" id="meta-live-search-area">
                                    <div class="meta-live-search-shell" id="meta-live-search-shell">
                                        <span class="meta-live-search-icon">⌕</span>
                                        <div class="meta-live-search-tokens" id="meta-live-search-tokens"></div>
                                        <input type="text" id="meta-live-search-input" class="meta-live-search-input" autocomplete="off" spellcheck="false" placeholder="Tìm tên chiến dịch...">
                                        <span id="meta-live-search-count" class="meta-live-search-count">0 kết quả</span>
                                        <button type="button" id="meta-live-search-clear" class="meta-live-search-clear" title="Xóa tìm kiếm">×</button>
                                    </div>
                                    <div id="meta-live-search-suggestions" class="meta-live-search-suggestions"></div>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="ads-table">
                                    <thead><tr>
                                        <th class="text-left">Tên Chiến Dịch</th>
                                        <th class="text-left">Nhóm Quảng Cáo <span class="ads-table-head-note">(đã gom)</span></th>
                                        <th class="text-center">Trạng Thái</th>
                                        <th class="text-right">Ngân Sách Hiện Tại</th>
                                        <th class="text-right">Chi Phí</th>
                                        <th class="text-center">Tin / Mua</th>
                                        <th class="text-center">Tỷ Lệ M/T</th>
                                        <th class="text-center">CTR</th>
                                        <th class="text-right">Giá Tin<br><span style="font-size:9px;color:#718096;">(Giá Đơn)</span></th>
                                        <th class="text-center">Ngày Bắt Đầu</th>
                                    </tr></thead>
                                    <tbody id="ads-table-perf"></tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    <div id="tab-finance" class="ads-tab-content">
                        <div id="ads-data-center-mount"></div>
                        <section class="ads-content-card ads-chart-card">
                            <div class="ads-content-card-head">
                                <div>
                                    <span class="ads-section-kicker">TÀI CHÍNH QUẢNG CÁO</span>
                                    <h2>Chi phí, doanh thu và ROAS</h2>
                                </div>
                            </div>
                            <div class="ads-chart-canvas"><canvas id="chart-ads-fin"></canvas></div>
                        </section>

                        <section class="ads-content-card ads-data-card">
                            <div class="ads-content-card-head ads-content-head-actions">
                                <div>
                                    <span class="ads-section-kicker">BẢNG TÀI CHÍNH</span>
                                    <div class="ads-title-with-scope-tabs">
                                        <h2>Chi tiết tổng chi theo bài</h2>
                                        <div class="ads-inline-scope-tabs" aria-label="Phạm vi dữ liệu Tài chính">
                                            <button type="button" class="ads-inline-scope-tab active" data-ads-scope-target="finance" data-ads-scope-value="overview" onclick="window.changeAdsDataScope('finance','overview')">Tổng quan</button>
                                            <button type="button" class="ads-inline-scope-tab" data-ads-scope-target="finance" data-ads-scope-value="marketing" onclick="window.changeAdsDataScope('finance','marketing')">Marketing</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="ads-table-actions">
                                    <button class="btn-toggle-history" onclick="window.toggleExportHistory()"><span>◷</span> Lịch sử xuất</button>
                                    <button class="btn-export-excel" onclick="window.exportFinanceToExcel()"><span>⇩</span> Xuất Excel</button>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="ads-table">
                                    <thead><tr>
                                        <th class="text-left">Tên Chiến Dịch</th>
                                        <th class="text-left">Sản Phẩm Chạy Quảng Cáo</th>
                                        <th class="text-right">Chi Phí<br><span style="font-size:9px;color:#718096;">(Gốc)</span></th>
                                        <th class="text-right" style="color:#d93025;">VAT (10%)</th>
                                        <th class="text-right" style="color:#e67c73;">Phí Chênh Lệch</th>
                                        <th class="text-right" style="font-weight:700;">TỔNG CHI</th>
                                        <th class="text-right" style="color:#137333;">Doanh Thu</th>
                                        <th class="text-center">ROAS</th>
                                    </tr></thead>
                                    <tbody id="ads-table-fin"></tbody>
                                </table>
                            </div>

                            <div id="export-history-container" class="ads-export-history" style="display:none;">
                                <div class="ads-export-history-title">Lịch sử các lần xuất dữ liệu</div>
                                <div class="table-responsive" style="max-height:220px;">
                                    <table class="ads-table">
                                        <thead><tr>
                                            <th class="text-left" style="width:130px;">Thời Gian</th>
                                            <th class="text-left">Tài Khoản Xuất</th>
                                            <th class="text-right">Số Dữ Liệu</th>
                                        </tr></thead>
                                        <tbody id="export-history-table-body"></tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div id="tab-trend" class="ads-tab-content">
                        <div class="ads-trend-layout">
                            <aside class="ads-content-card ads-rule-panel">
                                <span class="ads-section-kicker">BỘ QUY TẮC PHÂN TÍCH</span>
                                <h2>Hướng dẫn đọc ma trận</h2>
                                <div class="ads-rule-list">
                                    <div class="ads-rule-item rule-red"><b>Cần tắt</b><span>ROAS thấp hoặc chỉ đạt tối đa 2 điều kiện.</span></div>
                                    <div class="ads-rule-item rule-green"><b>Hoàn hảo</b><span>Đạt 5/5 chỉ số, có thể scale.</span></div>
                                    <div class="ads-rule-item rule-blue"><b>Tiềm năng LV1</b><span>Đạt 4/5, tiếp tục theo dõi.</span></div>
                                    <div class="ads-rule-item rule-orange"><b>Cần tối ưu</b><span>Đạt 3/5, cần can thiệp.</span></div>
                                    <div class="ads-rule-item rule-purple"><b>Kém</b><span>Phễu yếu nhưng có doanh thu cứu.</span></div>
                                    <div class="ads-rule-item rule-gray"><b>Máy học</b><span>Dưới mốc test, chưa đánh giá tắt.</span></div>
                                </div>
                            </aside>

                            <section class="ads-content-card ads-matrix-panel">
                                <div class="ads-content-card-head ads-content-head-actions">
                                    <div>
                                        <span class="ads-section-kicker">MA TRẬN HÀNH ĐỘNG</span>
                                        <h2>Bản đồ tối ưu chiến dịch</h2>
                                    </div>
                                    <div class="ads-matrix-controls">
                                        <label>Mốc ngân sách test<input type="number" id="matrix-test-budget" placeholder="500000" onchange="window.applyFilters()"></label>
                                        <label>Mốc CPA mục tiêu<input type="number" id="matrix-target-cpa" placeholder="50000" onchange="window.applyFilters()"></label>
                                    </div>
                                </div>
                                <div class="ads-chart-canvas ads-matrix-canvas"><canvas id="chart-ads-trend"></canvas></div>
                            </section>
                        </div>
                    </div>

                    <div id="tab-report" class="ads-tab-content">
                        <section class="ads-content-card ads-report-workspace">
                            <div class="ads-content-card-head ads-content-head-actions">
                                <div>
                                    <span class="ads-section-kicker">MARKETING REPORT</span>
                                    <h2>Báo cáo tổng hợp MKT</h2>
                                    <p class="ads-section-description">Dữ liệu được cập nhật theo bộ lọc chung phía trên.</p>
                                </div>
                                <button class="btn-export-excel" onclick="window.exportReportToExcel()"><span>⇩</span> Xuất Báo Cáo</button>
                            </div>
                            <div id="report-preview-container" class="ads-report-preview">
                                <p style="text-align:center;color:#8291a6;">Đang tải số liệu...</p>
                            </div>
                        </section>
                    </div>
                </main>
            </div>

        `;

        restoreAdsSidebarState();
        renderMetaSidebarActivity();

        document.getElementById('company-selector').value = CURRENT_COMPANY;

        

        setTimeout(() => {

            let viewEl = document.getElementById('view-mode-selector');

            let sortEl = document.getElementById('sort-mode-selector');

            let monthEl = document.getElementById('report-month-filter');

            let fromEl = document.getElementById('date-from');

            let toEl = document.getElementById('date-to');

            if (viewEl) viewEl.value = VIEW_MODE;

            if (sortEl) sortEl.value = SORT_MODE;

            if (monthEl) monthEl.value = REPORT_MONTH;

            if (fromEl) fromEl.value = DATE_FROM;

            if (toEl) toEl.value = DATE_TO;

        }, 50);

    }



    const uploadArea = document.querySelector('.upload-area');

    if(uploadArea) {

        const oldContainer = document.getElementById('upload-controls-container');

        if(oldContainer) oldContainer.remove();



        const controlsDiv = document.createElement('div');

        controlsDiv.id = 'upload-controls-container';

        

        controlsDiv.innerHTML = `
            <section class="ads-data-center">
                <div class="ads-data-center-head">
                    <div>
                        <span class="ads-section-kicker">DATA CENTER</span>
                        <h2>Nạp và quản lý dữ liệu</h2>
                        <p>Chi phí hiện tại lấy từ Meta Live; doanh thu và sao kê dùng file mới nhất theo từng kỳ. File Ads cũ chỉ lưu lịch sử.</p>
                    </div>
                    <div class="ads-data-actions" id="upload-buttons-row">
                        <button class="ads-data-action action-primary" onclick="document.getElementById('ads-file-input').click()">
                            <span class="ads-data-action-icon">＋</span>
                            <span><b>Lưu file Ads lịch sử</b><small>Không dùng tính hiện tại</small></span>
                        </button>
                        <button class="ads-data-action action-revenue" onclick="window.triggerRevenueUpload()">
                            <span class="ads-data-action-icon">₫</span>
                            <span><b>Up doanh thu</b><small>Doanh thu chatbot</small></span>
                        </button>
                        <button class="ads-data-action action-bank" onclick="window.triggerStatementUpload()">
                            <span class="ads-data-action-icon">▦</span>
                            <span><b>Up sao kê</b><small>Sao kê ngân hàng</small></span>
                        </button>
                        <button type="button" id="ads-data-history-toggle" class="ads-data-action action-history" onclick="window.toggleDataHistory()" aria-expanded="false">
                            <span class="ads-data-action-icon">⌕</span>
                            <span><b class="history-toggle-label">Tìm file & lịch sử</b><small>Mở kho dữ liệu đã upload</small></span>
                        </button>
                    </div>
                </div>

                <div id="meta-live-finance-source-status" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;padding:9px 11px;border:1px solid #dbe7f3;border-radius:12px;background:#f8fbff;color:#475569;font-size:10px;font-weight:600;"></div>

                <div style="display:none;">
                    <input type="file" id="revenue-file-input" accept=".csv, .xlsx, .xls" onchange="window.handleRevenueUpload(this)">
                    <input type="file" id="statement-file-input" accept=".csv, .xlsx, .xls" onchange="window.handleStatementUpload(this)">
                </div>

                <div class="ads-history-workspace" id="ads-history-workspace" style="display:none;">
                    <div class="ads-history-toolbar">
                        <div class="history-search-wrapper">
                            <span class="search-icon">⌕</span>
                            <input type="text" placeholder="Tìm tên file..." class="history-search-box" onkeyup="window.searchHistory(this.value)">
                        </div>
                        <button id="history-view-more" class="btn-view-all" onclick="window.toggleHistoryView()" style="display:none;">Xem tất cả</button>
                    </div>
                    <div class="history-grid">
                        <div class="history-box">
                            <div class="scroll-area ads-data-history-scroll">
                                <table style="width:100%;border-collapse:collapse;">
                                    <tbody id="upload-history-body"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        `;

        uploadArea.style.display = 'none';
        const dataMount = document.getElementById('ads-data-center-mount');
        if (dataMount) {
            dataMount.appendChild(controlsDiv);
        } else {
            uploadArea.parentNode.insertBefore(controlsDiv, uploadArea.nextSibling);
        }

    }

}



function toggleExportHistory() {

    const container = document.getElementById('export-history-container');

    if(container) {

        if(container.style.display === 'none' || container.style.display === '') {

            container.style.display = 'block';

            container.style.animation = 'slideDownFade 0.3s ease-out forwards';

            setTimeout(() => { container.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);

        } else {

            container.style.display = 'none';

        }

    }

}



function loadUploadHistory() {

    if(!db) return;

    

    db.ref('upload_logs').on('value', snapshot => {

        RAW_UPLOAD_LOGS = snapshot.val() || {};

        updateHistoryAndExport();

    });



    db.ref('export_logs').on('value', snapshot => {

        RAW_EXPORT_LOGS = snapshot.val() || {};

        updateHistoryAndExport();

    });

}



function updateHistoryAndExport() {

    META_LIVE_FINANCE_SOURCES = RAW_UPLOAD_LOGS[META_LIVE_FINANCE_SOURCE_NODE] || {};
    scheduleLegacyFinanceSourceMigration();

    GLOBAL_HISTORY_LIST = Object.entries(RAW_UPLOAD_LOGS)

        .filter(([key]) => key !== META_LIVE_FINANCE_SOURCE_NODE)

        .filter(([key, log]) => !log.company || log.company === CURRENT_COMPANY)

        .sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

        

    GLOBAL_EXPORT_LIST = Object.values(RAW_EXPORT_LOGS)

        .filter(log => !log.company || log.company === CURRENT_COMPANY)

        .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));



    if (GLOBAL_HISTORY_LIST.length > 0) {

        const isActiveValid = GLOBAL_HISTORY_LIST.some(([k, l]) => k === ACTIVE_BATCH_ID);

        if ((!ACTIVE_BATCH_ID || !isActiveValid) && !USER_EXPLICIT_VIEW_ALL) {

            ACTIVE_BATCH_ID = GLOBAL_HISTORY_LIST[0][0]; 

        }

    } else {

        ACTIVE_BATCH_ID = null;

    }

        

    renderHistoryUI();

    renderExportUI();
    renderMetaLiveFinanceSourceStatus();

    

    applyFilters(); 

}



function searchHistory(val) { HISTORY_SEARCH_TERM = val.toLowerCase(); renderHistoryUI(); }

function toggleHistoryView() { SHOW_ALL_HISTORY = !SHOW_ALL_HISTORY; renderHistoryUI(); }



function selectUploadBatch(id) { 

    PERIOD_FILTER_USER_CHANGED = true;

    if (ACTIVE_BATCH_ID === id) { 

        ACTIVE_BATCH_ID = null; 

        USER_EXPLICIT_VIEW_ALL = true; 

    } else { 

        ACTIVE_BATCH_ID = id; 

        USER_EXPLICIT_VIEW_ALL = false; 

        

        const monthEl = document.getElementById('report-month-filter');
        if (monthEl) monthEl.value = '';

        document.getElementById('date-from').value = '';

        document.getElementById('date-to').value = '';

        REPORT_MONTH = '';
        DATE_FROM = ''; DATE_TO = '';

    }

    renderHistoryUI(); 

    applyFilters(); 

}



function viewAllData() { 

    PERIOD_FILTER_USER_CHANGED = true;
    ACTIVE_BATCH_ID = null; 

    USER_EXPLICIT_VIEW_ALL = true; 

    const monthEl = document.getElementById('report-month-filter');
    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');

    if (monthEl) monthEl.value = '';
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';

    REPORT_MONTH = '';
    DATE_FROM = '';
    DATE_TO = '';

    renderHistoryUI(); 

    applyFilters(); 

}



function renderHistoryUI() {

    const tbody = document.getElementById('upload-history-body');

    const btnMore = document.getElementById('history-view-more');

    if(!tbody) return;

    

    let filtered = GLOBAL_HISTORY_LIST;

    if(HISTORY_SEARCH_TERM) { 

        filtered = filtered.filter(([key, log]) => log.fileName.toLowerCase().includes(HISTORY_SEARCH_TERM)); 

    }

    

    if(filtered.length === 0) { 

        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#999; font-size:10px;'>Không tìm thấy file</td></tr>"; 

        if(btnMore) btnMore.style.display = 'none'; 

        return; 

    }

    

    let displayList = filtered;

    if (!HISTORY_SEARCH_TERM && !SHOW_ALL_HISTORY) { 

        displayList = filtered.slice(0, 5); 

    }



    let html = "";

    

    let validBatchIds = new Set();

    if (REPORT_MONTH) {

        getLatestBatchIdsByReport({
            companyId: CURRENT_COMPANY,
            month: REPORT_MONTH
        }).forEach(id => validBatchIds.add(id));

    } else if (DATE_FROM || DATE_TO) {

        getLatestBatchIdsByReport({
            companyId: CURRENT_COMPANY,
            from: DATE_FROM,
            to: DATE_TO,
            groupByMonth: true
        }).forEach(id => validBatchIds.add(id));

    }



    displayList.forEach(([key, log]) => {

        const timeStr = formatDateTime(log.timestamp);

        const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);

        

        const isActive = (key === ACTIVE_BATCH_ID) || validBatchIds.has(key);

        const activeStyle = isActive ? 'background:#e8f0fe; border-left:4px solid #1a73e8;' : 'border-left:4px solid transparent;';

        

        const deleteBtn = isSuperAdmin() ? `<button class="delete-btn-admin" onclick="window.deleteUploadBatch('${key}', '${escapeHtml(log.fileName)}')">XÓA</button>` : '';

        const uploaderName = log.uploader || "Hệ thống cũ";
        const reportLabel = log.reportLabel || (getLogReportMonth(log) ? `Tháng ${getLogReportMonth(log).slice(5,7)}/${getLogReportMonth(log).slice(0,4)}` : 'Chưa có kỳ báo cáo');
        const reportRange = log.reportStart && log.reportEnd ? `${formatExcelDate(log.reportStart)} - ${formatExcelDate(log.reportEnd)}` : '';



        html += `

            <tr data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer; ${activeStyle}" onclick="window.selectUploadBatch('${key}')">

                <td style="padding:8px 4px 8px 10px; font-size:10px; width:110px; vertical-align:middle; color:#666;">${timeStr}</td>

                <td style="padding:8px 4px; vertical-align:middle;">

                    <div style="font-weight:${isActive ? '800' : '600'}; color:${isActive ? '#1a73e8' : '#333'}; word-break:break-word; font-size:11px; line-height:1.2;">

                        📊 ${escapeHtml(log.fileName)}

                    </div>

                    <div class="user-badge">👤 ${escapeHtml(uploaderName)}</div>
                    <div class="user-badge" style="background:#fef7e0; color:#b06000;">📅 ${escapeHtml(reportLabel)} ${reportRange ? ' • ' + escapeHtml(reportRange) : ''}</div>

                </td>

                <td style="padding:8px 4px; text-align:right; font-size:10px; font-weight:bold; color:#1a73e8; width:80px; vertical-align:middle;">${money}</td>

                <td style="padding:8px 0; text-align:center; width:50px; vertical-align:middle;">

                    ${deleteBtn}

                </td>

            </tr>

        `;



        if (isActive) {

            let childFiles = [];

            if (log.revenueFileName) {

                const revUploader = log.revenueUploader ? ` • 👤 ${log.revenueUploader}` : '';

                childFiles.push({ icon: '💰', name: log.revenueFileName, color: '#137333', time: log.revenueTime, uploader: revUploader });

            }

            if (log.statementFileName) {

                const stateUploader = log.statementUploader ? ` • 👤 ${log.statementUploader}` : '';

                childFiles.push({ icon: '💸', name: log.statementFileName, color: '#d93025', time: log.statementTime, uploader: stateUploader });

            }



            if (childFiles.length > 0) {

                childFiles.forEach((file, index) => {

                    const isLast = (index === childFiles.length - 1);

                    const branchChar = isLast ? "└──" : "├──";

                    const timeTag = file.time ? `<span style="font-size:9px; color:#9aa0a6; margin-left:8px; font-style:italic;">🕒 ${formatDateTime(file.time)}${escapeHtml(file.uploader) || ''}</span>` : '';



                    html += `

                        <tr style="background:#f8f9fa; border-left:4px solid #1a73e8;">

                            <td></td>

                            <td colspan="3" style="padding:4px 4px 6px 0; font-size:10px; color:#5f6368;">

                                <span style="color:#ccc; margin-right:5px; font-family: monospace; font-size:12px;">${branchChar}</span>

                                <span style="color:${file.color}; font-weight:bold;">${file.icon} ${escapeHtml(file.name)}</span>

                                <br><span style="margin-left: 20px;">${timeTag}</span>

                            </td>

                        </tr>

                    `;

                });

            } else {

                html += `

                    <tr style="background:#f8f9fa; border-left:4px solid #1a73e8;">

                        <td></td>

                        <td colspan="3" style="padding:4px 4px 6px 0; font-size:9px; color:#9aa0a6; font-style:italic;">

                            <span style="color:#ccc; margin-right:5px; font-family: monospace; font-size:12px;">└──</span>

                            (Chưa up kèm Doanh thu / Sao kê)

                        </td>

                    </tr>

                `;

            }

        }

    });

    

    tbody.innerHTML = html;

    

    if(btnMore) { 

        if(HISTORY_SEARCH_TERM || filtered.length <= 5) { 

            btnMore.style.display = 'none'; 

        } else { 

            btnMore.style.display = 'inline-block'; 

            btnMore.innerText = SHOW_ALL_HISTORY ? "Thu gọn ⬆" : `Xem tất cả (${filtered.length}) ⬇`; 

        } 

    }

    enforceGuestRestrictions();

}



function renderExportUI() {

    const tbody = document.getElementById('export-history-table-body');

    if(!tbody) return;

    

    if(GLOBAL_EXPORT_LIST.length === 0) {

        tbody.innerHTML = "<tr><td colspan='3' class='text-center' style='padding:15px; color:#999; font-size:11px; font-style:italic;'>Chưa có lượt xuất file nào.</td></tr>";

        return;

    }



    let displayList = GLOBAL_EXPORT_LIST.slice(0, 30);

    let html = "";

    displayList.forEach(log => {

        const timeStr = formatDateTime(log.timestamp);

        html += `

            <tr>

                <td class="text-left" style="color:#666; font-size:11px;">${timeStr}</td>

                <td class="text-left"><div class="export-badge">👤 ${escapeHtml(log.exporter) || 'Khách'}</div></td>

                <td class="text-right" style="font-weight:bold; color:#137333;">${log.recordCount} dòng</td>

            </tr>

        `;

    });

    tbody.innerHTML = html;

}



function changeCompany(companyId) { 

    CURRENT_COMPANY = companyId;
    META_LIVE_SEARCH_QUERY = '';
    META_LIVE_SEARCH_TOKENS = [];
    META_LIVE_SEARCH_SUGGESTIONS = [];
    META_LIVE_SEARCH_ACTIVE_INDEX = 0;
    META_LIVE_SEARCH_OPEN = false;

    ACTIVE_BATCH_ID = null; 

    // Nếu đang lọc theo kỳ/khoảng ngày báo cáo thì giữ bộ lọc khi đổi công ty
    if (REPORT_MONTH || DATE_FROM || DATE_TO) {
        USER_EXPLICIT_VIEW_ALL = true;
    } else {
        USER_EXPLICIT_VIEW_ALL = false;
    }

    VIEW_MODE = 'employee';

    SORT_MODE = 'spend';

    const viewEl = document.getElementById('view-mode-selector');

    const sortEl = document.getElementById('sort-mode-selector');

    if(viewEl) viewEl.value = VIEW_MODE;

    if(sortEl) sortEl.value = SORT_MODE;

    // Cập nhật lịch sử và nguồn doanh thu/sao kê mới nhất của công ty đang chọn.
    updateHistoryAndExport(); 

    if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        META_LIVE_DATA = [];
        META_LIVE_STATE.key = '';
        clearMetaLiveView();

        refreshMetaLive(true, false).catch(() => {});
    }

    if (CURRENT_TAB === 'report') {
        renderReportPreview();
    }

    showToast(`Đã chuyển sang: ${COMPANIES.find(c=>c.id===companyId).name}`, 'success'); 

}



function restoreAdsSidebarState() {
    const shell = document.querySelector('#ads-analysis-result .ads-enterprise-shell');
    const button = document.getElementById('ads-sidebar-toggle');
    if (!shell) return;

    let collapsed = false;
    try {
        collapsed = localStorage.getItem('ads_sidebar_collapsed') === '1';
    } catch (error) {
        collapsed = false;
    }

    shell.classList.toggle('sidebar-collapsed', collapsed);
    if (button) {
        button.textContent = collapsed ? '›' : '‹';
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        button.setAttribute('aria-label', collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng');
        button.title = collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng';
    }
}

function toggleAdsSidebar() {
    const shell = document.querySelector('#ads-analysis-result .ads-enterprise-shell');
    const button = document.getElementById('ads-sidebar-toggle');
    if (!shell) return;

    const collapsed = shell.classList.toggle('sidebar-collapsed');
    try {
        localStorage.setItem('ads_sidebar_collapsed', collapsed ? '1' : '0');
    } catch (error) {
        console.warn('Không thể lưu trạng thái sidebar:', error);
    }

    if (button) {
        button.textContent = collapsed ? '›' : '‹';
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        button.setAttribute('aria-label', collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng');
        button.title = collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng';
    }
}

function toggleDataHistory(forceOpen) {
    const workspace = document.getElementById('ads-history-workspace');
    const button = document.getElementById('ads-data-history-toggle');
    if (!workspace) return;

    const currentlyOpen = workspace.style.display !== 'none';
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !currentlyOpen;
    workspace.style.display = shouldOpen ? 'block' : 'none';

    if (button) {
        button.classList.toggle('active', shouldOpen);
        button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        const label = button.querySelector('.history-toggle-label');
        const description = button.querySelector('small');
        if (label) label.textContent = shouldOpen ? 'Thu gọn lịch sử' : 'Tìm file & lịch sử';
        if (description) description.textContent = shouldOpen ? 'Ẩn khu tìm kiếm và lịch sử' : 'Mở kho dữ liệu đã upload';
    }
}

function switchAdsTab(tabName) { 

    CURRENT_TAB = tabName; 

    ['perf', 'fin', 'trend', 'report'].forEach(t => {

        let btn = document.getElementById('btn-tab-' + t);

        if(btn) btn.classList.remove('active');

    });



    let activeBtnId = 'btn-tab-' + (tabName === 'performance' ? 'perf' : (tabName === 'finance' ? 'fin' : (tabName === 'trend' ? 'trend' : 'report')));

    let activeBtn = document.getElementById(activeBtnId);

    if(activeBtn) activeBtn.classList.add('active');



    ['performance', 'finance', 'trend', 'report'].forEach(t => {

        let tab = document.getElementById('tab-' + t);

        if(tab) tab.classList.remove('active');

        let kpi = document.getElementById('kpi-' + t);

        if(kpi) kpi.classList.remove('active');

    });



    let activeTab = document.getElementById('tab-' + tabName);

    if(activeTab) activeTab.classList.add('active');



    let activeKpi = document.getElementById('kpi-' + tabName);

    if(activeKpi) activeKpi.classList.add('active');



    if(tabName === 'report') {

        unbindMetaLiveSnapshot();
        renderReportPreview();
        refreshMetaLiveReport(false, true).catch(error => {
            console.warn('Không tải được Meta Live cho Báo cáo MKT:', error.message);
        });

    } else if (tabName === 'performance' || tabName === 'finance') {

        unbindMetaLiveReportSnapshots();
        refreshMetaLive(false, true).catch(error => {
            console.warn('Không tải được Meta Live:', error.message);
        });
        applyFilters();

    } else {

        // Ma trận vẫn dùng dữ liệu upload như trước.
        unbindMetaLiveSnapshot();
        unbindMetaLiveReportSnapshots();
        applyFilters(); 

    }

}



function handleFirebaseUpload(e) { 
    if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");

    const file = e.target.files[0]; if(!file) return; 
    const fileNameNorm = file.name.toLowerCase().replace(/[-_]/g, ' '); 
    const conflictComp = COMPANIES.find(c => c.id !== CURRENT_COMPANY && c.keywords.some(kw => fileNameNorm.includes(kw))); 
    if (conflictComp) { showToast(`❌ Cảnh báo: File này có thể của "${conflictComp.name}"!`, 'error'); e.target.value = ""; return; } 
    
    const btnText = document.querySelector('.upload-text'); if(btnText) btnText.innerText = "⏳ Đang xử lý..."; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const data = new Uint8Array(e.target.result); 
            const workbook = XLSX.read(data, {type: 'array'}); 
            const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
            const result = parseDataCore(json); 
            const mergeInfo = result.mergeInfo || { originalCount: result.length, mergedCount: result.length, duplicateCount: 0, duplicateGroupCount: 0, duplicateGroups: [] };
            
            if (result.length > 0) { 
                const proceedSave = () => saveParsedAdsBatch(file, result, mergeInfo, btnText);
                const cancelUpload = () => {
                    if(btnText) btnText.innerText = "Upload Excel";
                    const inputEl = document.getElementById('ads-file-input');
                    if (inputEl) inputEl.value = "";
                    showToast("Đã hủy upload để kiểm tra lại dữ liệu.", "warning");
                };

                if ((mergeInfo.duplicateGroups || []).length > 0) {
                    if(btnText) btnText.innerText = "🔍 Chờ xác nhận gom trùng...";
                    showDuplicateMergeReviewModal(mergeInfo, proceedSave, cancelUpload);
                } else {
                    proceedSave();
                }
            } else { 
                showToast("❌ File không đúng định dạng FB Ads!", 'error'); 
                if(btnText) btnText.innerText = "Upload Excel"; 
            } 
        } catch (err) { 
            showToast("Lỗi: " + err.message, 'error'); 
            if(btnText) btnText.innerText = "Upload Excel"; 
        } 
    }; 
    reader.readAsArrayBuffer(file); 
}

function handleRevenueUpload(input) {
    if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");

    const file = input.files[0];
    if(!file) return;

    let financeContext;
    try {
        financeContext = getMetaLiveFinanceContext(CURRENT_COMPANY);
    } catch (error) {
        input.value = '';
        return showToast(error.message, 'error');
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1});

            let headerIdx = -1, colNameIdx = -1, colAdNameIdx = -1, colRevIdx = -1;

            for(let i = 0; i < Math.min(json.length, 10); i++) {
                const row = json[i];
                if(!row) continue;

                const rowStr = row.map(c => c ? c.toString().toLowerCase() : '').join('|');
                if(rowStr.includes('tên nhóm') || rowStr.includes('tên chiến dịch')) {
                    headerIdx = i;
                    row.forEach((cell, idx) => {
                        if(!cell) return;
                        const txt = cell.toString().toLowerCase().trim();
                        if(txt.includes('tên nhóm') || txt.includes('tên chiến dịch')) colNameIdx = idx;
                        if(txt.includes('sản phẩm chạy')) colAdNameIdx = idx;
                        if(txt.includes('doanh thu') || txt.includes('thành tiền')) colRevIdx = idx;
                    });
                    break;
                }
            }

            if(headerIdx === -1 || colNameIdx === -1 || colRevIdx === -1) {
                showToast('❌ Thiếu cột Tên nhóm hoặc Doanh thu', 'error');
                return;
            }

            const hasAdColumn = colAdNameIdx !== -1;
            const revenueMap = new Map();
            const revenueDetails = new Map();
            let revenueSourceRowCount = 0;

            for(let i = headerIdx + 1; i < json.length; i++) {
                const row = json[i];
                if(!row || !row[colNameIdx]) continue;

                const employeeName = row[colNameIdx].toString().trim();
                const adName = hasAdColumn && row[colAdNameIdx] ? row[colAdNameIdx].toString().trim() : '';
                const revenue = parseCleanNumber(row[colRevIdx]);
                const matchKey = buildRevenueMatchKey(employeeName, adName, hasAdColumn);

                if(!matchKey) continue;
                revenueMap.set(matchKey, (revenueMap.get(matchKey) || 0) + revenue);
                if(!revenueDetails.has(matchKey)) revenueDetails.set(matchKey, { employeeName, adName });
                revenueSourceRowCount++;
            }

            if(revenueMap.size === 0) {
                showToast('⚠️ File doanh thu không có dòng dữ liệu hợp lệ.', 'warning');
                return;
            }

            const entries = Array.from(revenueMap.entries()).map(([matchKey, revenue]) => {
                const detail = revenueDetails.get(matchKey) || {};
                return {
                    matchKey,
                    employeeName: detail.employeeName || '',
                    adName: detail.adName || '',
                    revenue
                };
            });
            const totalRevenue = entries.reduce((sum, entry) => sum + Number(entry.revenue || 0), 0);
            const now = new Date().toISOString();
            const revenueSource = {
                fileName: file.name,
                time: now,
                uploader: window.myIdentity || 'Ẩn danh',
                company: financeContext.company,
                from: financeContext.period.from,
                to: financeContext.period.to,
                periodKey: financeContext.periodKey,
                hasAdColumn,
                sourceRowCount: revenueSourceRowCount,
                uniqueMatchCount: entries.length,
                total: totalRevenue,
                entries,
                sourceMode: 'latest_replace_meta_live_direct_match'
            };

            db.ref(`${financeContext.sourcePath}/revenue`).set(revenueSource).then(() => {
                META_LIVE_FINANCE_SOURCES[financeContext.company] = META_LIVE_FINANCE_SOURCES[financeContext.company] || {};
                META_LIVE_FINANCE_SOURCES[financeContext.company][financeContext.periodKey] = META_LIVE_FINANCE_SOURCES[financeContext.company][financeContext.periodKey] || {};
                META_LIVE_FINANCE_SOURCES[financeContext.company][financeContext.periodKey].revenue = revenueSource;

                const currentMetaRows = META_LIVE_DATA.filter(item => item.company === financeContext.company);
                const preview = allocateLatestRevenueToMetaRows(currentMetaRows, revenueSource);
                const matched = preview.summary.matchedSourceRows;
                const unmatched = preview.summary.unmatchedSourceRows;

                showToast(
                    `✅ Đã thay file doanh thu mới nhất: ${matched}/${entries.length} nhóm khớp Meta Live` +
                    (unmatched > 0 ? `, ${unmatched} nhóm chưa khớp` : '') +
                    ` • ${new Intl.NumberFormat('vi-VN').format(totalRevenue)}đ`,
                    unmatched > 0 ? 'warning' : 'success'
                );
                switchAdsTab('finance');
                applyFilters();
            }).catch(err => {
                showToast('❌ Không thể lưu doanh thu mới nhất: ' + err.message, 'error');
            });
        } catch(err) {
            showToast(err.message, 'error');
        }
    };

    reader.readAsArrayBuffer(file);
    input.value = '';
}

function handleStatementUpload(input) {

    if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");

    const file = input.files[0];
    if(!file) return;

    let financeContext;
    try {
        financeContext = getMetaLiveFinanceContext(CURRENT_COMPANY);
    } catch (error) {
        input.value = '';
        return showToast(error.message, 'error');
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1});

            let headerIdx = -1, colAmountIdx = -1;
            for(let i = 0; i < Math.min(json.length, 30); i++) {
                const row = json[i];
                if(!row) continue;

                row.forEach((cell, idx) => {
                    if(!cell) return;
                    const txt = cell.toString().toLowerCase().trim();
                    const validHeaders = ['nợ', 'debit', 'ghi nợ', 'phát sinh nợ', 'phát sinh giảm', 'số tiền ghi nợ', 'rút tiền', 'số tiền trừ', 'nợ/ debit'];

                    if(validHeaders.some(kw => txt === kw || txt.includes(kw)) && !txt.includes('có') && !txt.includes('thu') && !txt.includes('số dư') && !txt.includes('balance') && !txt.includes('dư nợ')) {
                        headerIdx = i;
                        colAmountIdx = idx;
                    }
                });
                if(colAmountIdx !== -1) break;
            }

            if(colAmountIdx === -1) {
                showToast("❌ File sao kê không đúng định dạng. Cần có cột Nợ/ Debit", 'error');
                return;
            }

            let totalStatement = 0;
            let sourceRowCount = 0;
            for(let i = headerIdx + 1; i < json.length; i++) {
                const row = json[i];
                if(!row) continue;
                const amount = parseCleanNumber(row[colAmountIdx]);
                if(amount !== 0) sourceRowCount++;
                totalStatement += amount;
            }

            if(totalStatement === 0) {
                showToast("⚠️ Không tìm thấy số tiền nào được trừ!", 'warning');
                return;
            }

            const currentMetaRows = META_LIVE_DATA.filter(item => item.company === financeContext.company);
            const totalMetaWithVat = currentMetaRows.reduce((sum, item) => sum + Number(item.spend || 0) * 1.1, 0);
            const feeDifference = Math.max(totalStatement - totalMetaWithVat, 0);
            const now = new Date().toISOString();
            const statementSource = {
                fileName: file.name,
                time: now,
                uploader: window.myIdentity || 'Ẩn danh',
                company: financeContext.company,
                from: financeContext.period.from,
                to: financeContext.period.to,
                periodKey: financeContext.periodKey,
                total: totalStatement,
                sourceRowCount,
                metaCostWithVatAtUpload: totalMetaWithVat,
                feeDifferenceAtUpload: feeDifference,
                sourceMode: 'latest_replace_meta_live_reconcile'
            };

            db.ref(`${financeContext.sourcePath}/statement`).set(statementSource).then(() => {
                META_LIVE_FINANCE_SOURCES[financeContext.company] = META_LIVE_FINANCE_SOURCES[financeContext.company] || {};
                META_LIVE_FINANCE_SOURCES[financeContext.company][financeContext.periodKey] = META_LIVE_FINANCE_SOURCES[financeContext.company][financeContext.periodKey] || {};
                META_LIVE_FINANCE_SOURCES[financeContext.company][financeContext.periodKey].statement = statementSource;

                showToast(
                    `✅ Đã thay file sao kê mới nhất: ${new Intl.NumberFormat('vi-VN').format(totalStatement)}đ` +
                    ` • Chênh lệch hiện tại ${new Intl.NumberFormat('vi-VN').format(feeDifference)}đ`,
                    'success'
                );
                switchAdsTab('finance');
                applyFilters();
            }).catch(error => {
                showToast('❌ Không thể lưu sao kê mới nhất: ' + error.message, 'error');
            });
        } catch(err) {
            showToast(err.message, 'error');
        }
    };

    reader.readAsArrayBuffer(file);
    input.value = '';
}

function deleteUploadBatch(batchId, fileName) { 

    if(!isSuperAdmin()) return showToast("Chỉ Super Admin mới có quyền XÓA file!", "error");

    if (event) event.stopPropagation(); 

    if(!confirm(`Xóa file: "${fileName}"?`)) return; 

    

    if (ACTIVE_BATCH_ID === batchId) { 

        ACTIVE_BATCH_ID = null; 

        document.getElementById('ads-table-perf').innerHTML = ""; 

        document.getElementById('ads-table-fin').innerHTML = ""; 

    } 

    const updates = {}; 

    updates['/upload_logs/' + batchId] = null; 

    db.ref('ads_data').orderByChild('batchId').equalTo(batchId).once('value', snapshot => { 

        if (snapshot.exists()) { snapshot.forEach(child => { updates['/ads_data/' + child.key] = null; }); } 

        db.ref().update(updates).then(() => { showToast("🗑️ Đã xóa file", 'success'); }); 

    }); 

}



function parseDataCore(rows) { 

    if (rows.length < 2) return []; 

    let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1, colMsgIdx = -1, colStartIdx = -1, colEndIdx = -1, colCtrIdx = -1, colFreqIdx = -1;
    let colReportStartIdx = -1, colReportEndIdx = -1;
    let colBudgetIdx = -1, colBudgetTypeIdx = -1;

    let colCpmIdx = -1, colCpaIdx = -1; // Biến lưu vị trí 2 cột mới

    

    for (let i = 0; i < Math.min(rows.length, 15); i++) { 

        const row = rows[i]; 

        if (!row) continue; 

        const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|"); 

        

        if (rowStr.includes("tên nhóm") && (rowStr.includes("số tiền") || rowStr.includes("amount"))) { 

            headerIndex = i; 

            row.forEach((cell, idx) => { 

                if(!cell) return; 

                const txt = cell.toString().toLowerCase().trim(); 

                if (txt.includes("tên nhóm")) colNameIdx = idx; 

                if ((txt.includes("số tiền đã chi") || txt.includes("amount spent")) && !txt.includes("chi phí")) colSpendIdx = idx; 

                if (txt === "lượt mua" || txt === "purchase" || txt === "purchases") colResultIdx = idx; 

                if (txt === "tổng số người liên hệ nhắn tin") colMsgIdx = idx; 

                if (txt === "bắt đầu") colStartIdx = idx; 

                if (txt === "kết thúc") colEndIdx = idx; 

                if (txt.includes("lượt bắt đầu báo cáo") || txt.includes("reporting starts") || txt.includes("report start")) colReportStartIdx = idx;

                if (txt.includes("lượt kết thúc báo cáo") || txt.includes("reporting ends") || txt.includes("report end")) colReportEndIdx = idx;

                if (txt.includes("ctr") && (txt.includes("tỷ lệ nhấp") || txt.includes("tỷ lệ click"))) colCtrIdx = idx; 

                if (txt === "tần suất" || txt.includes("frequency")) colFreqIdx = idx;

                // NGÂN SÁCH: lấy từ cấp Nhóm quảng cáo trong file Meta Ads.
                if (txt === "ngân sách nhóm quảng cáo" || txt === "ad set budget") colBudgetIdx = idx;
                if (txt === "loại ngân sách nhóm quảng cáo" || txt === "ad set budget type") colBudgetTypeIdx = idx;

                

                // NHẬN DIỆN CHÍNH XÁC 2 CỘT CHI PHÍ THEO YÊU CẦU

                if (txt.includes("chi phí trên mỗi lượt bắt đầu cuộc trò chuyện qua tin nhắn")) colCpmIdx = idx;

                if (txt.includes("chi phí trên mỗi lượt mua")) colCpaIdx = idx;

            }); 

            break; 

        } 

    } 

    

    if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) return []; 

    

    let parsedData = []; 

    for (let i = headerIndex + 1; i < rows.length; i++) { 

        const row = rows[i]; 

        if (!row) continue; 

        const rawName = row[colNameIdx]; 

        if (!rawName) continue; 

        

        let spend = parseCleanNumber(row[colSpendIdx]); 

        if (spend <= 0) continue; 

        

        let result = (colResultIdx > -1) ? parseCleanNumber(row[colResultIdx]) : 0; 

        let messages = (colMsgIdx > -1) ? parseCleanNumber(row[colMsgIdx]) : 0; 

        

        let ctr = colCtrIdx > -1 ? parseCleanNumber(row[colCtrIdx]) : 0;

        let freq = colFreqIdx > -1 ? parseCleanNumber(row[colFreqIdx]) : 0;

        

        // Lấy giá trị chính xác từ file FB

        let rawCpm = colCpmIdx > -1 ? parseCleanNumber(row[colCpmIdx]) : 0;

        let rawCpa = colCpaIdx > -1 ? parseCleanNumber(row[colCpaIdx]) : 0;

        const rawBudget = colBudgetIdx > -1 ? row[colBudgetIdx] : '';
        const rawBudgetType = colBudgetTypeIdx > -1 ? row[colBudgetTypeIdx] : '';
        const budgetInfo = parseAdsBudgetValue(rawBudget, rawBudgetType);

        

        let rawStart = (colStartIdx > -1 && row[colStartIdx]) ? row[colStartIdx] : ""; 

        let rawEnd = (colEndIdx > -1 && row[colEndIdx]) ? row[colEndIdx] : ""; 

        let rawReportStart = (colReportStartIdx > -1 && row[colReportStartIdx]) ? row[colReportStartIdx] : rawStart;

        let rawReportEnd = (colReportEndIdx > -1 && row[colReportEndIdx]) ? row[colReportEndIdx] : rawReportStart;

        let displayStart = formatExcelDate(rawStart); 

        let displayEnd = formatExcelDate(rawEnd); 

        let runStartIso = parseExcelDateToISO(rawStart);

        let runEndIso = parseExcelDateToISO(rawEnd);

        let reportStartIso = parseExcelDateToISO(rawReportStart);

        let reportEndIso = parseExcelDateToISO(rawReportEnd);

        if (!reportEndIso && reportStartIso) {
            reportEndIso = reportStartIso;
        }

        let reportMonth = getMonthFromISO(reportEndIso || reportStartIso);

        

        let status = "Đã tắt"; 

        let endStr = rawEnd ? rawEnd.toString().trim().toLowerCase() : ""; 

        if (endStr.includes("đang diễn ra") || endStr.includes("ongoing")) { status = "Đang chạy"; } 

        

        let rawNameStr = rawName.toString().trim(); 

        let firstHyphenIndex = rawNameStr.indexOf('-'); 

        let employee = "KHÁC"; 

        let adName = "Chung"; 

        if (firstHyphenIndex !== -1) { 

            employee = rawNameStr.substring(0, firstHyphenIndex).trim().toUpperCase(); 

            adName = rawNameStr.substring(firstHyphenIndex + 1).trim(); 

        } else { 

            employee = rawNameStr.toUpperCase(); 

        } 

        

        parsedData.push({ 

            fullName: rawNameStr, employee: employee, adName: adName, 

            spend: spend, result: result, messages: messages, ctr: ctr, freq: freq,

            rawCpm: rawCpm, rawCpa: rawCpa, // LƯU VÀO DATABASE

            budget: budgetInfo.amount,
            budget_type: budgetInfo.type,
            budget_uses_campaign: budgetInfo.usesCampaignBudget,
            budget_display: budgetInfo.display,

            run_start: displayStart, 
            run_end: displayEnd, 
            run_start_iso: runStartIso,
            run_end_iso: runEndIso,
            status: status,

            report_start: formatExcelDate(rawReportStart),
            report_end: formatExcelDate(rawReportEnd),
            report_start_iso: reportStartIso,
            report_end_iso: reportEndIso,
            report_month: reportMonth

        }); 

    } 
    return mergeDuplicateAdsData(parsedData); 

}



function loadAdsData() { 

    if(!db) return; 

    db.ref('ads_data').on('value', snapshot => { 

        const data = snapshot.val(); 
        META_LIVE_LEGACY_ADS_DATA_READY = true;

        if(!data) { GLOBAL_ADS_DATA = []; scheduleLegacyFinanceSourceMigration(); applyFilters(); return; } 

        GLOBAL_ADS_DATA = Object.values(data); 
        scheduleLegacyFinanceSourceMigration();

        applyFilters(); 

    }); 

}




// =========================================================
// META LIVE SMART SEARCH V132
// =========================================================
function normalizeMetaLiveSearchText(value) {
    return normalizeAdsText(value)
        .replace(/\bngan sach\b/g, 'ngan sach')
        .trim();
}

function getMetaLiveSearchCampaignValues(item) {
    const values = [
        item && item.employee,
        item && item.campaignName
    ];

    (Array.isArray(item && item.original_adset_rows) ? item.original_adset_rows : []).forEach(row => {
        values.push(row && row.employee);
        values.push(row && row.campaignName);
    });

    return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}

function getMetaLiveSearchAdsetValues(item) {
    const values = [
        item && item.adName,
        item && item.fullName
    ];

    (Array.isArray(item && item.original_adset_rows) ? item.original_adset_rows : []).forEach(row => {
        values.push(row && row.adName);
        values.push(row && row.cleanAdName);
        values.push(row && row.fullName);
        values.push(row && row.productName);
        values.push(row && row.sku);
    });

    return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}

function getMetaLiveSearchBudgetInfo(item) {
    const running = item && item.status === 'Đang chạy';
    const effectiveBudget = getEffectiveGroupedBudgetInfo(item || {});
    const value = Number(effectiveBudget.amount || 0);
    const usesCampaign = !!effectiveBudget.usesCampaignBudget;
    const type = String(effectiveBudget.type || '').trim();

    let label = 'Không có ngân sách';
    if (usesCampaign && value > 0) label = `${formatMetaLiveInteger(value)} ₫ + NS chiến dịch`;
    else if (usesCampaign) label = 'Sử dụng ngân sách chiến dịch';
    else if (value > 0) label = `${formatMetaLiveInteger(value)} ₫`;

    const aliases = [
        label,
        type,
        String(value),
        value > 0 ? `${Math.round(value / 1000)}k` : '',
        value > 0 ? `${Math.round(value / 1000)} nghin` : '',
        value >= 1000000 ? `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)} trieu` : '',
        usesCampaign ? 'ngan sach chien dich' : '',
        running ? 'ngan sach dang chay' : 'ngan sach bai da tat'
    ].filter(Boolean);

    return { value, usesCampaign, type, label, aliases };
}

function metaLiveLevenshteinDistance(a, b) {
    a = String(a || '');
    b = String(b || '');
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    const current = new Array(b.length + 1);

    for (let i = 1; i <= a.length; i++) {
        current[0] = i;
        for (let j = 1; j <= b.length; j++) {
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        for (let j = 0; j <= b.length; j++) previous[j] = current[j];
    }

    return previous[b.length];
}

function metaLiveFuzzyScore(query, value) {
    const q = normalizeMetaLiveSearchText(query);
    const v = normalizeMetaLiveSearchText(value);

    if (!q) return 1;
    if (!v) return 0;
    if (v === q) return 100;
    if (v.startsWith(q)) return 94 - Math.min(14, (v.length - q.length) * 0.08);
    if (v.includes(q)) return 84 - Math.min(18, v.indexOf(q) * 0.15);

    const queryWords = q.split(/\s+/).filter(Boolean);
    const valueWords = v.split(/\s+/).filter(Boolean);
    let totalWordScore = 0;

    for (const queryWord of queryWords) {
        let best = 0;
        for (const valueWord of valueWords) {
            if (valueWord.startsWith(queryWord)) {
                best = Math.max(best, 0.94);
                continue;
            }
            if (valueWord.includes(queryWord)) {
                best = Math.max(best, 0.84);
                continue;
            }
            if (queryWord.length >= 3) {
                const distance = metaLiveLevenshteinDistance(queryWord, valueWord);
                const ratio = 1 - distance / Math.max(queryWord.length, valueWord.length, 1);
                best = Math.max(best, ratio);
            }
        }
        totalWordScore += best;
    }

    const wordAverage = queryWords.length ? totalWordScore / queryWords.length : 0;

    let sequenceIndex = 0;
    for (let index = 0; index < v.length && sequenceIndex < q.length; index++) {
        if (v[index] === q[sequenceIndex]) sequenceIndex++;
    }
    const sequenceScore = q.length ? sequenceIndex / q.length : 0;

    return Math.max(wordAverage * 78, sequenceScore * 60);
}

function metaLiveSearchValueMatches(query, values) {
    const q = normalizeMetaLiveSearchText(query);
    if (!q) return true;

    const threshold = q.length <= 2 ? 78 : (q.length <= 4 ? 58 : 51);
    return (Array.isArray(values) ? values : [values]).some(value => (
        metaLiveFuzzyScore(q, value) >= threshold
    ));
}

/**
 * Chuyển nội dung tìm ngân sách về số tiền tuyệt đối.
 * Hỗ trợ: 400000, 400.000, 400 000, 400k, 400 nghìn,
 * "ngân sách 400000", 1.5 triệu, 1,5tr.
 * Trả về null nếu nội dung không phải một truy vấn ngân sách/số tiền thuần.
 */
function parseMetaLiveBudgetSearchQuery(query) {
    let raw = String(query || '').trim().toLowerCase();
    if (!raw) return null;

    try {
        raw = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (error) {}

    raw = raw
        .replace(/đ/g, 'd')
        .replace(/\b(ngan sach|budget|ns)\b/g, ' ')
        .replace(/\b(vnd|dong|d)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const match = raw.match(/^(\d[\d.,\s]*?)(?:\s*(k|nghin|ngan|tr|trieu|m))?$/i);
    if (!match) return null;

    const suffix = String(match[2] || '').toLowerCase();
    let numberText = String(match[1] || '').trim();
    if (!numberText) return null;

    if (suffix) {
        // Có hậu tố thì dấu phẩy/chấm cuối được hiểu là phần thập phân.
        numberText = numberText.replace(/\s+/g, '').replace(',', '.');
        const dotCount = (numberText.match(/\./g) || []).length;
        if (dotCount > 1) {
            const parts = numberText.split('.');
            numberText = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        }
        const base = Number(numberText);
        if (!Number.isFinite(base)) return null;
        if (suffix === 'k' || suffix === 'nghin' || suffix === 'ngan') return Math.round(base * 1000);
        return Math.round(base * 1000000);
    }

    // Không có hậu tố: dấu chấm/phẩy/khoảng trắng được xem là phân cách hàng nghìn.
    const digits = numberText.replace(/[^0-9]/g, '');
    if (!digits) return null;
    const value = Number(digits);
    return Number.isFinite(value) ? value : null;
}

function getMetaLiveDirectSearchValues(item) {
    const budget = getMetaLiveSearchBudgetInfo(item);
    const spend = Number(item && item.spend || 0);
    const messages = Number(item && item.messages || 0);
    const purchases = Number(item && item.result || 0);
    const ctr = Number(item && item.ctr || 0);
    const cpm = Number(item && item.rawCpm || (messages > 0 ? spend / messages : 0));
    const cpa = Number(item && item.rawCpa || (purchases > 0 ? spend / purchases : 0));

    return [
        ...budget.aliases,
        item && item.status,
        item && item.run_start,
        item && item.run_end,
        `chi phi ${Math.round(spend)}`,
        `tien chi ${Math.round(spend)}`,
        `tin nhan ${Math.round(messages)}`,
        `luot mua ${Math.round(purchases)}`,
        `ctr ${ctr.toFixed(2)}`,
        `gia tin ${Math.round(cpm)}`,
        `cpa ${Math.round(cpa)}`
    ].filter(Boolean);
}

function metaLiveSearchQueryMatchesItem(query, item) {
    const q = String(query || '').trim();
    if (!q) return true;

    /*
     * Lọc ngân sách theo đúng nội dung người dùng đang gõ:
     * - Không hậu tố: đối chiếu chuỗi số tức thời. Ví dụ 4, 40, 400
     *   đều có thể khớp ngân sách 400000 ngay khi gõ.
     * - Có hậu tố k/nghìn/tr/triệu: quy đổi thành số tiền đầy đủ và
     *   đối chiếu chính xác. Ví dụ 400k = 400000.
     */
    let rawBudgetQuery = q.toLowerCase();
    try {
        rawBudgetQuery = rawBudgetQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (error) {}

    rawBudgetQuery = rawBudgetQuery
        .replace(/đ/g, 'd')
        .replace(/\b(ngan sach|budget|ns)\b/g, ' ')
        .replace(/\b(vnd|dong|d)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const numericBudgetMatch = rawBudgetQuery.match(
        /^(\d[\d.,\s]*?)(?:\s*(k|nghin|ngan|tr|trieu|m))?$/i
    );

    if (numericBudgetMatch) {
        const suffix = String(numericBudgetMatch[2] || '').toLowerCase();
        const currentBudget = Math.round(
            Number(getMetaLiveSearchBudgetInfo(item).value || 0)
        );

        if (suffix) {
            const budgetQuery = parseMetaLiveBudgetSearchQuery(q);
            return budgetQuery !== null && currentBudget === Math.round(budgetQuery);
        }

        const typedDigits = String(numericBudgetMatch[1] || '')
            .replace(/[^0-9]/g, '');
        const currentBudgetDigits = String(Math.max(0, currentBudget));

        return !!typedDigits && currentBudgetDigits.includes(typedDigits);
    }

    // Chỉ tên chiến dịch và tên nhóm quảng cáo được phép so khớp gần đúng.
    const nameMatch = metaLiveSearchValueMatches(q, [
        ...getMetaLiveSearchCampaignValues(item),
        ...getMetaLiveSearchAdsetValues(item)
    ]);
    if (nameMatch) return true;

    // Các dữ liệu còn lại chỉ khớp trực tiếp, không fuzzy và không tạo gợi ý.
    const normalizedQuery = normalizeMetaLiveSearchText(q);
    return getMetaLiveDirectSearchValues(item).some(value => (
        normalizeMetaLiveSearchText(value).includes(normalizedQuery)
    ));
}

function metaLiveSearchTokenMatchesItem(token, item) {
    if (!token || !item) return true;

    if (token.type === 'campaign') {
        return getMetaLiveSearchCampaignValues(item).some(value => (
            normalizeMetaLiveSearchText(value) === normalizeMetaLiveSearchText(token.value)
        ));
    }

    if (token.type === 'adset') {
        return getMetaLiveSearchAdsetValues(item).some(value => (
            normalizeMetaLiveSearchText(value) === normalizeMetaLiveSearchText(token.value) ||
            normalizeMetaLiveSearchText(value).includes(normalizeMetaLiveSearchText(token.value))
        ));
    }

    if (token.type === 'budget') {
        const budget = getMetaLiveSearchBudgetInfo(item);
        return normalizeMetaLiveSearchText(budget.label) === normalizeMetaLiveSearchText(token.value) ||
            budget.aliases.some(alias => normalizeMetaLiveSearchText(alias) === normalizeMetaLiveSearchText(token.value));
    }

    if (token.type === 'status') {
        return normalizeMetaLiveSearchText(item.status) === normalizeMetaLiveSearchText(token.value);
    }

    return true;
}

function getMetaLiveSearchAllValues(item) {
    const budget = getMetaLiveSearchBudgetInfo(item);
    const spend = Number(item && item.spend || 0);
    const messages = Number(item && item.messages || 0);
    const purchases = Number(item && item.result || 0);
    const ctr = Number(item && item.ctr || 0);
    const cpm = Number(item && item.rawCpm || (messages > 0 ? spend / messages : 0));
    const cpa = Number(item && item.rawCpa || (purchases > 0 ? spend / purchases : 0));

    return [
        ...getMetaLiveSearchCampaignValues(item),
        ...getMetaLiveSearchAdsetValues(item),
        ...budget.aliases,
        item && item.status,
        item && item.run_start,
        item && item.run_end,
        `chi phi ${spend}`,
        `tien chi ${spend}`,
        `tin nhan ${messages}`,
        `luot mua ${purchases}`,
        `ctr ${ctr.toFixed(2)}`,
        `gia tin ${Math.round(cpm)}`,
        `cpa ${Math.round(cpa)}`
    ].filter(Boolean);
}

function filterMetaLiveSearchRows(rows) {
    const source = Array.isArray(rows) ? rows : [];
    const query = META_LIVE_SEARCH_QUERY.trim();

    const filtered = source.filter(item => {
        const tokensMatch = META_LIVE_SEARCH_TOKENS.every(token => (
            metaLiveSearchTokenMatchesItem(token, item)
        ));
        if (!tokensMatch) return false;
        return metaLiveSearchQueryMatchesItem(query, item);
    });

    META_LIVE_SEARCH_RESULT_COUNT = filtered.length;
    return filtered;
}

function getMetaLiveSearchStage() {
    if (!META_LIVE_SEARCH_TOKENS.some(token => token.type === 'campaign')) return 'campaign';
    if (!META_LIVE_SEARCH_TOKENS.some(token => token.type === 'adset')) return 'adset';
    return 'direct';
}

function getMetaLiveSearchTypeLabel(type) {
    if (type === 'campaign') return 'Chiến dịch';
    if (type === 'adset') return 'Nhóm QC';
    return 'Dữ liệu';
}

function buildMetaLiveSearchCandidates() {
    const stage = getMetaLiveSearchStage();
    const query = META_LIVE_SEARCH_QUERY.trim();
    const rows = META_LIVE_DATA
        .filter(item => item.company === CURRENT_COMPANY)
        .filter(item => META_LIVE_SEARCH_TOKENS.every(token => metaLiveSearchTokenMatchesItem(token, item)));
    const map = new Map();

    function addCandidate(type, value, subtitle, item) {
        const cleanValue = String(value || '').trim();
        if (!cleanValue) return;
        const key = `${type}||${normalizeMetaLiveSearchText(cleanValue)}`;
        const score = query ? metaLiveFuzzyScore(query, [cleanValue, subtitle].filter(Boolean).join(' ')) : 70;
        const threshold = query.length <= 2 ? 72 : (query.length <= 4 ? 54 : 48);
        if (query && score < threshold) return;

        if (!map.has(key)) {
            map.set(key, {
                type,
                value: cleanValue,
                label: cleanValue,
                subtitle: String(subtitle || '').trim(),
                count: 0,
                score,
                spend: 0
            });
        }

        const candidate = map.get(key);
        candidate.count += 1;
        candidate.score = Math.max(candidate.score, score);
        candidate.spend += Number(item && item.spend || 0);
    }

    // Chỉ tạo gợi ý cho tên chiến dịch và tên nhóm quảng cáo.
    // Khi người dùng đang nhập ngân sách/số liệu, không mở danh sách gợi ý.
    if (stage === 'direct' || parseMetaLiveBudgetSearchQuery(query) !== null) {
        META_LIVE_SEARCH_SUGGESTIONS = [];
        META_LIVE_SEARCH_ACTIVE_INDEX = 0;
        return META_LIVE_SEARCH_SUGGESTIONS;
    }

    rows.forEach(item => {
        if (stage === 'campaign') {
            const campaignLabel = String(item.employee || item.campaignName || '').trim();
            addCandidate('campaign', campaignLabel, item.campaignName && item.campaignName !== campaignLabel ? item.campaignName : 'Ưu tiên tìm theo tên chiến dịch', item);
            return;
        }

        if (stage === 'adset') {
            const originals = Array.isArray(item.original_adset_rows) && item.original_adset_rows.length
                ? item.original_adset_rows
                : [item];
            originals.forEach(row => {
                const label = String(row.cleanAdName || row.adName || item.adName || '').trim();
                const subtitle = String(row.fullName || item.fullName || '').trim();
                addCandidate('adset', label, subtitle && subtitle !== label ? subtitle : 'Nhóm quảng cáo thuộc chiến dịch đã chọn', item);
            });
        }
    });

    const typePriority = { campaign: 0, adset: 1 };
    META_LIVE_SEARCH_SUGGESTIONS = Array.from(map.values())
        .sort((a, b) => (
            b.score - a.score ||
            typePriority[a.type] - typePriority[b.type] ||
            b.spend - a.spend ||
            a.label.localeCompare(b.label, 'vi')
        ))
        .slice(0, 12);

    if (META_LIVE_SEARCH_ACTIVE_INDEX >= META_LIVE_SEARCH_SUGGESTIONS.length) {
        META_LIVE_SEARCH_ACTIVE_INDEX = 0;
    }

    return META_LIVE_SEARCH_SUGGESTIONS;
}

function getMetaLiveSearchPlaceholder() {
    const isMobile = !!(
        window.matchMedia &&
        window.matchMedia('(max-width: 640px)').matches
    );

    // V161: mobile bỏ ghi chú dài "Tìm tên chiến dịch..."
    // để không chiếm chỗ và không làm vỡ header bảng.
    if (isMobile) return 'Tìm...';

    const stage = getMetaLiveSearchStage();
    if (stage === 'campaign') return 'Tìm tên chiến dịch...';
    if (stage === 'adset') return 'Gõ tiếp tên nhóm quảng cáo...';
    return 'Nhập ngân sách hoặc số liệu để lọc...';
}

function getMetaLiveSearchGuideText() {
    return '';
}

function renderMetaLiveSearchUi() {
    const input = document.getElementById('meta-live-search-input');
    const tokenBox = document.getElementById('meta-live-search-tokens');
    const suggestionBox = document.getElementById('meta-live-search-suggestions');
    const clearButton = document.getElementById('meta-live-search-clear');
    const guide = document.getElementById('meta-live-search-guide');
    const count = document.getElementById('meta-live-search-count');

    if (!input || !tokenBox || !suggestionBox) return;

    input.placeholder = getMetaLiveSearchPlaceholder();
    if (input.value !== META_LIVE_SEARCH_QUERY) input.value = META_LIVE_SEARCH_QUERY;

    tokenBox.innerHTML = META_LIVE_SEARCH_TOKENS.map((token, index) => `
        <span class="meta-live-search-token" data-type="${escapeHtml(token.type)}" title="${escapeHtml(getMetaLiveSearchTypeLabel(token.type))}: ${escapeHtml(token.label)}">
            <span class="meta-live-search-token-label">${escapeHtml(token.label)}</span>
            <button type="button" data-search-token-index="${index}" aria-label="Xóa điều kiện">×</button>
        </span>
    `).join('');

    tokenBox.querySelectorAll('[data-search-token-index]').forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            removeMetaLiveSearchToken(Number(button.getAttribute('data-search-token-index')));
        });
    });

    if (clearButton) {
        clearButton.classList.toggle('visible', !!(META_LIVE_SEARCH_QUERY || META_LIVE_SEARCH_TOKENS.length));
    }
    if (guide) guide.textContent = getMetaLiveSearchGuideText();
    if (count) count.textContent = `${formatMetaLiveInteger(META_LIVE_SEARCH_RESULT_COUNT)} kết quả`;

    buildMetaLiveSearchCandidates();
    const suggestionStage = getMetaLiveSearchStage();
    const suggestionsAllowed = (
        suggestionStage === 'campaign' || suggestionStage === 'adset'
    ) && parseMetaLiveBudgetSearchQuery(META_LIVE_SEARCH_QUERY) === null;

    if (!suggestionsAllowed) {
        suggestionBox.innerHTML = '';
    } else if (!META_LIVE_SEARCH_SUGGESTIONS.length) {
        suggestionBox.innerHTML = '<div class="meta-live-search-empty">Không tìm thấy tên gần khớp.</div>';
    } else {
        suggestionBox.innerHTML = META_LIVE_SEARCH_SUGGESTIONS.map((suggestion, index) => `
            <button type="button" class="meta-live-search-suggestion ${index === META_LIVE_SEARCH_ACTIVE_INDEX ? 'active' : ''}" data-search-suggestion-index="${index}" data-type="${escapeHtml(suggestion.type)}">
                <span class="meta-live-search-suggestion-type">${escapeHtml(getMetaLiveSearchTypeLabel(suggestion.type))}</span>
                <span class="meta-live-search-suggestion-main">
                    <span class="meta-live-search-suggestion-value">${escapeHtml(suggestion.label)}</span>
                    <span class="meta-live-search-suggestion-sub">${escapeHtml(suggestion.subtitle || '')}</span>
                </span>
                <span class="meta-live-search-suggestion-count">${formatMetaLiveInteger(suggestion.count)} nhóm</span>
            </button>
        `).join('');

        suggestionBox.querySelectorAll('[data-search-suggestion-index]').forEach(button => {
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', () => {
                selectMetaLiveSearchSuggestion(Number(button.getAttribute('data-search-suggestion-index')));
            });
        });
    }

    suggestionBox.classList.toggle('open', META_LIVE_SEARCH_OPEN && suggestionsAllowed);
}

function selectMetaLiveSearchSuggestion(index) {
    const suggestion = META_LIVE_SEARCH_SUGGESTIONS[index];
    if (!suggestion) return;

    const order = ['campaign', 'adset'];
    const selectedOrder = order.indexOf(suggestion.type);

    META_LIVE_SEARCH_TOKENS = META_LIVE_SEARCH_TOKENS.filter(token => {
        const tokenOrder = order.indexOf(token.type);
        return tokenOrder < selectedOrder;
    });

    META_LIVE_SEARCH_TOKENS.push({
        type: suggestion.type,
        value: suggestion.value,
        label: suggestion.label
    });
    META_LIVE_SEARCH_QUERY = '';
    META_LIVE_SEARCH_ACTIVE_INDEX = 0;
    META_LIVE_SEARCH_OPEN = true;

    applyFilters();
    const input = document.getElementById('meta-live-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
}

function removeMetaLiveSearchToken(index) {
    const order = ['campaign', 'adset'];
    const token = META_LIVE_SEARCH_TOKENS[index];
    if (!token) return;
    const removedOrder = order.indexOf(token.type);
    META_LIVE_SEARCH_TOKENS = META_LIVE_SEARCH_TOKENS.filter(item => order.indexOf(item.type) < removedOrder);
    META_LIVE_SEARCH_ACTIVE_INDEX = 0;
    META_LIVE_SEARCH_OPEN = true;
    applyFilters();

    const input = document.getElementById('meta-live-search-input');
    if (input) input.focus();
}

function clearMetaLiveSmartSearch(keepFocus = false) {
    META_LIVE_SEARCH_QUERY = '';
    META_LIVE_SEARCH_TOKENS = [];
    META_LIVE_SEARCH_SUGGESTIONS = [];
    META_LIVE_SEARCH_ACTIVE_INDEX = 0;
    META_LIVE_SEARCH_OPEN = false;
    META_LIVE_SEARCH_RESULT_COUNT = filterAdsRowsByDataScope(
        META_LIVE_DATA.filter(item => item.company === CURRENT_COMPANY),
        META_LIVE_DATA_SCOPE
    ).length;

    const input = document.getElementById('meta-live-search-input');
    if (input) input.value = '';
    applyFilters();
    if (keepFocus && input) {
        input.focus();
        META_LIVE_SEARCH_OPEN = true;
        renderMetaLiveSearchUi();
    }
}

function setupMetaLiveSmartSearch() {
    const area = document.getElementById('meta-live-search-area');
    const shell = document.getElementById('meta-live-search-shell');
    const input = document.getElementById('meta-live-search-input');
    const clearButton = document.getElementById('meta-live-search-clear');

    if (!area || !shell || !input || input.dataset.smartSearchBound === '1') {
        renderMetaLiveSearchUi();
        return;
    }

    input.dataset.smartSearchBound = '1';

    shell.addEventListener('click', event => {
        if (event.target && event.target.closest && event.target.closest('button')) return;
        input.focus();
    });

    input.addEventListener('focus', () => {
        META_LIVE_SEARCH_OPEN = true;
        META_LIVE_SEARCH_ACTIVE_INDEX = 0;
        renderMetaLiveSearchUi();
    });

    input.addEventListener('input', () => {
        META_LIVE_SEARCH_QUERY = input.value;
        META_LIVE_SEARCH_OPEN = true;
        META_LIVE_SEARCH_ACTIVE_INDEX = 0;
        applyFilters();
    });

    input.addEventListener('keydown', event => {
        const suggestions = META_LIVE_SEARCH_SUGGESTIONS;

        if (event.key === 'ArrowDown' && suggestions.length) {
            event.preventDefault();
            META_LIVE_SEARCH_OPEN = true;
            META_LIVE_SEARCH_ACTIVE_INDEX = (META_LIVE_SEARCH_ACTIVE_INDEX + 1) % suggestions.length;
            renderMetaLiveSearchUi();
            return;
        }

        if (event.key === 'ArrowUp' && suggestions.length) {
            event.preventDefault();
            META_LIVE_SEARCH_OPEN = true;
            META_LIVE_SEARCH_ACTIVE_INDEX = (META_LIVE_SEARCH_ACTIVE_INDEX - 1 + suggestions.length) % suggestions.length;
            renderMetaLiveSearchUi();
            return;
        }

        if ((event.key === 'Tab' || event.key === 'Enter') && suggestions.length && META_LIVE_SEARCH_OPEN) {
            event.preventDefault();
            selectMetaLiveSearchSuggestion(META_LIVE_SEARCH_ACTIVE_INDEX);
            return;
        }

        if (event.key === 'Backspace' && !input.value && META_LIVE_SEARCH_TOKENS.length) {
            event.preventDefault();
            removeMetaLiveSearchToken(META_LIVE_SEARCH_TOKENS.length - 1);
            return;
        }

        if (event.key === 'Escape') {
            META_LIVE_SEARCH_OPEN = false;
            renderMetaLiveSearchUi();
        }
    });

    if (clearButton) {
        clearButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            clearMetaLiveSmartSearch(true);
        });
    }

    document.addEventListener('click', event => {
        if (!area.contains(event.target)) {
            META_LIVE_SEARCH_OPEN = false;
            renderMetaLiveSearchUi();
        }
    });

    META_LIVE_SEARCH_RESULT_COUNT = META_LIVE_DATA.filter(item => item.company === CURRENT_COMPANY).length;
    renderMetaLiveSearchUi();
}


function getUploadedRowsForCompanyContext(companyId) {
    let rows = GLOBAL_ADS_DATA.filter(item => item.company === companyId);

    if (ACTIVE_BATCH_ID) {
        return rows.filter(item => item.batchId === ACTIVE_BATCH_ID);
    }

    if (REPORT_MONTH) {
        const validBatchIds = new Set(getLatestBatchIdsByReport({
            companyId,
            month: REPORT_MONTH
        }));
        return rows.filter(item => validBatchIds.has(item.batchId));
    }

    if (DATE_FROM || DATE_TO) {
        const validBatchIds = new Set(getLatestBatchIdsByReport({
            companyId,
            from: DATE_FROM,
            to: DATE_TO,
            groupByMonth: true
        }));
        return rows.filter(item => validBatchIds.has(item.batchId));
    }

    const validBatchIds = new Set(getLatestBatchIdsByReport({
        companyId,
        groupByMonth: true
    }));

    return validBatchIds.size > 0
        ? rows.filter(item => validBatchIds.has(item.batchId))
        : rows;
}

function getRealtimeFinanceRowsForCurrentCompany() {
    const metaRows = META_LIVE_DATA.filter(item => (
        item.company === CURRENT_COMPANY &&
        hasMetaLiveDeliveryData(item)
    ));

    // File chi phí cũ không còn là dữ liệu dự phòng cho Tài chính.
    // Khi snapshot Meta Live chưa về, giao diện chờ snapshot thay vì dùng số liệu lịch sử.
    if (!metaRows.length) return [];

    let periodKey = '';
    try { periodKey = getMetaLivePeriodKey(getMetaLivePeriod()); }
    catch (error) {}

    return enrichMetaRowsWithLatestFinanceSource(metaRows, CURRENT_COMPANY, periodKey);
}

// =========================================================
// V145: PHẠM VI DỮ LIỆU TỔNG QUAN / MARKETING
// Marketing được xác định khi tên chiến dịch hoặc tên nhóm quảng cáo
// (kể cả các nhóm gốc trước khi gom) có chứa chữ "marketing".
// =========================================================
function isMarketingAdsRow(item) {
    if (!item) return false;

    const values = [
        item.employee,
        item.campaignName,
        item.adName,
        item.cleanAdName,
        item.fullName
    ];

    const originals = Array.isArray(item.original_adset_rows)
        ? item.original_adset_rows
        : [];

    originals.forEach(row => {
        values.push(row && row.employee);
        values.push(row && row.campaignName);
        values.push(row && row.adName);
        values.push(row && row.cleanAdName);
        values.push(row && row.fullName);
    });

    return values.some(value => (
        normalizeMetaLiveSearchText(value).includes('marketing')
    ));
}

function filterAdsRowsByDataScope(rows, scope) {
    const source = Array.isArray(rows) ? rows : [];
    return scope === 'marketing'
        ? source.filter(isMarketingAdsRow)
        : source;
}

function syncAdsDataScopeTabs() {
    document.querySelectorAll('[data-ads-scope-target][data-ads-scope-value]').forEach(button => {
        const target = button.getAttribute('data-ads-scope-target');
        const value = button.getAttribute('data-ads-scope-value');
        const current = target === 'finance'
            ? FINANCE_DATA_SCOPE
            : META_LIVE_DATA_SCOPE;
        const active = current === value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

window.changeAdsDataScope = function(target, scope) {
    const normalizedScope = scope === 'marketing' ? 'marketing' : 'overview';

    if (target === 'finance') {
        FINANCE_DATA_SCOPE = normalizedScope;
    } else {
        META_LIVE_DATA_SCOPE = normalizedScope;
    }

    applyFilters();
};

window.openReportMonthPicker = function(input) {
    if (!input) return;
    try { input.focus({ preventScroll: true }); }
    catch (error) { try { input.focus(); } catch (focusError) {} }

    try {
        if (typeof input.showPicker === 'function') input.showPicker();
    } catch (error) {
        // Trình duyệt không hỗ trợ showPicker vẫn mở theo hành vi mặc định của input month.
    }
};

function applyFilters() {

    const useMetaLivePerformance = CURRENT_TAB === 'performance';
    const useMetaLiveFinance = CURRENT_TAB === 'finance';
    const useMetaLive = useMetaLivePerformance || useMetaLiveFinance;
    const uploadedContextRows = getUploadedRowsForCompanyContext(CURRENT_COMPANY);

    let filtered = useMetaLivePerformance
        ? META_LIVE_DATA.filter(item => item.company === CURRENT_COMPANY)
        : (useMetaLiveFinance
            ? getRealtimeFinanceRowsForCurrentCompany()
            : uploadedContextRows);

    if (VIEW_MODE === 'employee') {
        filtered.sort((a,b) => a.employee.localeCompare(b.employee) || b.spend - a.spend);
    } else {
        filtered.sort((a,b) => getProductGroupKey(a.adName).localeCompare(getProductGroupKey(b.adName)) || b.spend - a.spend);
    }

    const tableScope = useMetaLivePerformance
        ? META_LIVE_DATA_SCOPE
        : (useMetaLiveFinance ? FINANCE_DATA_SCOPE : 'overview');
    const scopedTableRows = useMetaLive
        ? filterAdsRowsByDataScope(filtered, tableScope)
        : filtered;
    const performanceTableData = useMetaLivePerformance
        ? filterMetaLiveSearchRows(scopedTableRows)
        : scopedTableRows;

    CURRENT_FILTERED_DATA = useMetaLivePerformance
        ? performanceTableData
        : (useMetaLiveFinance ? scopedTableRows : filtered);
    syncAdsDataScopeTabs();
    if (useMetaLivePerformance) renderMetaLiveSearchUi();
    if (useMetaLiveFinance) renderMetaLiveFinanceSourceStatus();

    let totalSpendFB = 0, totalLeads = 0, totalMessages = 0, totalRevenue = 0, totalCostAll = 0;
    let totalStatementAmount = 0;

    // Tài chính hiện tại: sao kê lấy từ file sao kê mới nhất độc lập theo công ty/kỳ.
    if (useMetaLiveFinance) {
        const currentFinanceSource = getMetaLiveFinanceSource(CURRENT_COMPANY);
        totalStatementAmount = Number(currentFinanceSource && currentFinanceSource.statement && currentFinanceSource.statement.total || 0);
    } else {
        const uniqueBatches = [...new Set(filtered.map(i => i.batchId).filter(Boolean))];
        uniqueBatches.forEach(bId => {
            const log = GLOBAL_HISTORY_LIST.find(([k]) => k === bId);
            if (log && log[1].statementTotal) totalStatementAmount += Number(log[1].statementTotal || 0);
        });
    }

    filtered.forEach(item => {
        totalSpendFB += Number(item.spend || 0);
        totalLeads += Number(item.result || 0);
        totalMessages += Number(item.messages || 0);

        const vat = Number(item.spend || 0) * 0.1;
        const fee = Number(item.fee || 0);
        const total = Number(item.spend || 0) + vat + fee;

        totalCostAll += total;
        totalRevenue += Number(item.revenue || 0);
    });

    if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        const pSpend = document.getElementById('perf-spend');

        if (pSpend) {
            const avgCpa = totalLeads > 0 ? Math.round(totalSpendFB / totalLeads) : 0;
            const crNumber = totalMessages > 0
                ? (totalLeads / totalMessages) * 100
                : (totalLeads > 0 ? 100 : 0);
            const cr = crNumber.toFixed(2);

            if (useMetaLivePerformance) {
                setMetaLiveMetricValue('perf-spend', new Intl.NumberFormat('vi-VN').format(totalSpendFB) + " ₫", totalSpendFB);
                setMetaLiveMetricValue('perf-msg', new Intl.NumberFormat('vi-VN').format(totalMessages), totalMessages);
                setMetaLiveMetricValue('perf-leads', new Intl.NumberFormat('vi-VN').format(totalLeads), totalLeads);
                setMetaLiveMetricValue('perf-cpl', new Intl.NumberFormat('vi-VN').format(avgCpa) + " ₫", avgCpa);
                setMetaLiveMetricValue('perf-ctr', cr + "%", crNumber);
            } else {
                pSpend.innerText = new Intl.NumberFormat('vi-VN').format(totalSpendFB) + " ₫";

                const pMsg = document.getElementById('perf-msg');
                if (pMsg) pMsg.innerText = new Intl.NumberFormat('vi-VN').format(totalMessages);

                const perfLeads = document.getElementById('perf-leads');
                const perfCpl = document.getElementById('perf-cpl');
                const perfCtrEl = document.getElementById('perf-ctr');

                if (perfLeads) perfLeads.innerText = new Intl.NumberFormat('vi-VN').format(totalLeads);
                if (perfCpl) perfCpl.innerText = new Intl.NumberFormat('vi-VN').format(avgCpa) + " ₫";
                if (perfCtrEl) perfCtrEl.innerText = cr + "%";
            }

            const totalSpendWithVat = totalSpendFB * 1.1;
            const finSpend = document.getElementById('fin-spend');
            const finStatement = document.getElementById('fin-statement');
            const finLeads = document.getElementById('fin-leads');
            const finRevenue = document.getElementById('fin-revenue');
            const finRoas = document.getElementById('fin-roas');

            if (finSpend) finSpend.innerText = new Intl.NumberFormat('vi-VN').format(totalSpendWithVat) + " ₫";
            if (finStatement) finStatement.innerText = new Intl.NumberFormat('vi-VN').format(totalStatementAmount) + " ₫";
            if (finLeads) finLeads.innerText = new Intl.NumberFormat('vi-VN').format(totalLeads);
            if (finRevenue) finRevenue.innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫";

            const roas = totalCostAll > 0 ? (totalRevenue / totalCostAll) : 0;
            if (finRoas) finRoas.innerText = roas.toFixed(2) + "x";
        }
    }

    renderPerformanceTable(useMetaLivePerformance ? performanceTableData : filtered);
    renderFinanceTable(useMetaLiveFinance ? scopedTableRows : filtered);

    if (CURRENT_TAB === 'performance') drawChartPerf(filtered);
    else if (CURRENT_TAB === 'finance') drawChartFin(filtered);
    else if (CURRENT_TAB === 'trend') drawChartTrend(filtered);
}


function formatMetaLiveOriginalBudget(row) {
    const value = Number(row && row.budget || 0);
    const usesCampaignBudget = !!(row && row.budgetUsesCampaign);

    if (usesCampaignBudget && value > 0) {
        return `${formatMetaLiveInteger(value)} ₫ + NS chiến dịch`;
    }
    if (usesCampaignBudget) return 'Sử dụng ngân sách chiến dịch';
    if (value > 0) return `${formatMetaLiveInteger(value)} ₫`;
    return '—';
}

function buildMetaLiveOriginalRowFallback(item) {
    const parts = extractAdDuplicateParts(item && item.adName || '');
    return buildDuplicateSourceRowInfo(item || {}, parts);
}

function formatMetaLiveCompactDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('vi-VN');
}


function formatMetaLiveBudgetHistoryTime(value) {
    if (!value) return 'Không rõ thời điểm';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatMetaLiveBudgetHistoryValue(value, usesCampaign, type) {
    const amount = Number(value || 0);
    if (usesCampaign && amount <= 0) return 'NS chiến dịch';
    if (amount <= 0) return '—';
    return `${formatMetaLiveInteger(amount)} ₫${type ? ` · ${type}` : ''}`;
}

function buildMetaLiveBudgetHistoryHtml(row) {
    const history = normalizeMetaLiveBudgetHistory(
        row && (row.budgetHistory || row.budget_history) || []
    ).slice().sort((a, b) => Number(b.atMs || 0) - Number(a.atMs || 0));

    const currentBudget = Number(row && row.budget || 0);
    const currentUsesCampaign = !!(row && row.budgetUsesCampaign);
    const currentType = String(row && row.budgetType || '');

    if (!history.length) {
        return `
            <div style="padding:10px 12px 0;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #dfe6ee;border-radius:10px;background:#fff;">
                    <div>
                        <div style="font-weight:700;color:#334155;">Lịch sử tăng ngân sách</div>
                        <div style="margin-top:3px;font-size:9px;color:#8291a6;">Chưa ghi nhận lần tăng nào kể từ khi cài bản V135.</div>
                    </div>
                    <span style="padding:5px 8px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:9px;font-weight:700;white-space:nowrap;">
                        Hiện tại: ${escapeHtml(formatMetaLiveBudgetHistoryValue(currentBudget, currentUsesCampaign, currentType))}
                    </span>
                </div>
            </div>
        `;
    }

    const events = history.map((entry, index) => `
        <div style="display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 0;${index < history.length - 1 ? 'border-bottom:1px dashed #dfe6ee;' : ''}">
            <div style="font-size:9px;color:#64748b;font-weight:700;white-space:nowrap;">${escapeHtml(formatMetaLiveBudgetHistoryTime(entry.at || entry.atMs))}</div>
            <div style="min-width:0;display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                <span style="color:#64748b;font-size:9.5px;">${escapeHtml(formatMetaLiveBudgetHistoryValue(entry.fromBudget, entry.fromUsesCampaign, entry.fromType))}</span>
                <span style="color:#94a3b8;">→</span>
                <span style="color:#137333;font-size:9.5px;font-weight:700;">${escapeHtml(formatMetaLiveBudgetHistoryValue(entry.toBudget, entry.toUsesCampaign, entry.toType))}</span>
            </div>
            <span style="padding:5px 8px;border-radius:8px;background:#eaf7ef;color:#137333;font-size:9px;font-weight:700;white-space:nowrap;">+${formatMetaLiveInteger(entry.increase)} ₫</span>
        </div>
    `).join('');

    return `
        <div style="padding:10px 12px 0;">
            <div style="padding:10px 12px;border:1px solid #cfe6d8;border-radius:10px;background:#f7fcf9;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:3px;">
                    <div style="font-weight:700;color:#1f5132;">Lịch sử tăng ngân sách · ${history.length} lần</div>
                    <div style="font-size:9px;color:#5f7f69;">Mới nhất hiển thị trước</div>
                </div>
                <div>${events}</div>
            </div>
        </div>
    `;
}

function buildMetaLiveAdDetailHtml(ads, adsetIndex) {
    const rows = Array.isArray(ads) ? ads : [];

    if (!rows.length) {
        return `
            <div style="padding:16px;text-align:center;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:10px;">
                Chưa có dữ liệu cấp bài quảng cáo trong snapshot này. Sau khi cập nhật Code.gs, bấm “Cập nhật Meta” để tải dữ liệu mới.
            </div>
        `;
    }

    const body = rows.map((ad, index) => {
        const spend = Number(ad.spend || 0);
        const messages = Number(ad.messages || 0);
        const purchases = Number(ad.result || 0);
        const cr = messages > 0 ? (purchases / messages) * 100 : (purchases > 0 ? 100 : 0);
        const cpm = Number(ad.rawCpm || (messages > 0 ? spend / messages : 0));
        const cpa = Number(ad.rawCpa || (purchases > 0 ? spend / purchases : 0));
        const isRunning = ad.status === 'Đang chạy';
        const hasDeliveryData = hasMetaLiveDeliveryData(ad);
        const statusHtml = renderMetaLiveStatusHtml(ad.status, hasDeliveryData, '');
        const createdText = formatMetaLiveCompactDate(ad.createdAt);
        const meta = [
            ad.adId ? `ID: ${ad.adId}` : '',
            createdText ? `Tạo: ${createdText}` : ''
        ].filter(Boolean).join(' • ');

        return `
            <tr style="${!hasDeliveryData ? 'background:#f3f4f6;' : ''}">
                <td style="text-align:center;color:#64748b;font-weight:700;">${index + 1}</td>
                <td style="min-width:260px;">
                    <div style="font-weight:700;color:#1e3a5f;line-height:1.42;">${escapeHtml(ad.adName || 'Bài quảng cáo')}</div>
                    ${meta ? `<div style="margin-top:3px;font-size:9px;color:#8291a6;">${escapeHtml(meta)}</div>` : ''}
                </td>
                <td style="text-align:center;">${statusHtml}</td>
                <td style="text-align:right;font-weight:700;white-space:nowrap;">${formatMetaLiveInteger(spend)} ₫</td>
                <td style="text-align:center;font-weight:700;white-space:nowrap;"><span style="color:#e36414;">${formatMetaLiveInteger(messages)}</span> / <span style="color:#137333;">${formatMetaLiveInteger(purchases)}</span></td>
                <td style="text-align:center;font-weight:700;color:#a15c00;">${cr.toFixed(1)}%</td>
                <td style="text-align:center;font-weight:700;color:#1a73e8;">${Number(ad.ctr || 0).toFixed(2)}%</td>
                <td style="text-align:center;white-space:nowrap;">
                    <div style="font-weight:700;">${formatMetaLiveInteger(ad.linkClicks || 0)} / ${formatMetaLiveInteger(ad.impressions || 0)}</div>
                    <div style="font-size:9px;color:#8291a6;margin-top:2px;">Link / hiển thị</div>
                </td>
                <td style="text-align:center;font-weight:700;">${Number(ad.freq || 0).toFixed(2)}</td>
                <td style="text-align:right;white-space:nowrap;">
                    <div style="font-weight:700;">${formatMetaLiveInteger(cpm)} ₫</div>
                    <div style="font-size:9px;color:#8291a6;margin-top:2px;">Giá tin</div>
                </td>
                <td style="text-align:right;white-space:nowrap;">
                    <div style="font-weight:700;color:#c5221f;">${formatMetaLiveInteger(cpa)} ₫</div>
                    <div style="font-size:9px;color:#8291a6;margin-top:2px;">CPA</div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div style="padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="font-weight:700;color:#334155;">Chi tiết ${rows.length} bài quảng cáo trong nhóm</div>
                <div style="font-size:9px;color:#8291a6;">Số liệu theo kỳ báo cáo đang chọn</div>
            </div>
            <div style="overflow:auto;border:1px solid #dfe6ee;border-radius:10px;background:#fff;">
                <table style="width:100%;min-width:1180px;border-collapse:separate;border-spacing:0;font-size:10px;">
                    <thead>
                        <tr>
                            <th style="text-align:center;width:42px;">STT</th>
                            <th style="text-align:left;">Bài quảng cáo</th>
                            <th style="text-align:center;">Trạng thái</th>
                            <th style="text-align:right;">Chi phí</th>
                            <th style="text-align:center;">Tin / Mua</th>
                            <th style="text-align:center;">Mua / Tin</th>
                            <th style="text-align:center;">CTR</th>
                            <th style="text-align:center;">Link / Hiển thị</th>
                            <th style="text-align:center;">Tần suất</th>
                            <th style="text-align:right;">Giá tin</th>
                            <th style="text-align:right;">CPA</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        </div>
    `;
}

window.closeMetaLiveOriginalRowsModal = function(event) {
    const modal = document.getElementById('meta-live-original-rows-modal');
    if (!modal) return;

    if (!event || event.target === modal || event.currentTarget === modal) {
        modal.remove();
    }
};

window.toggleMetaLiveAdDetail = function(index, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const detail = document.getElementById(`meta-live-ad-detail-${index}`);
    const arrow = document.getElementById(`meta-live-ad-arrow-${index}`);
    if (!detail) return;

    const opening = detail.style.display === 'none' || !detail.style.display;
    detail.style.display = opening ? 'table-row' : 'none';
    if (arrow) arrow.textContent = opening ? '▾' : '▸';
};

window.showMetaLiveOriginalRows = function(rowKey) {
    const allRows = Array.isArray(META_LIVE_DATA) ? META_LIVE_DATA : [];
    const item = allRows.find(row => getMetaLiveRowKey(row) === String(rowKey || ''));

    if (!item) {
        showToast('Không tìm thấy dữ liệu nhóm quảng cáo cần xem.', 'error');
        return;
    }

    const originalRows = (
        Array.isArray(item.original_adset_rows) && item.original_adset_rows.length
            ? item.original_adset_rows
            : [buildMetaLiveOriginalRowFallback(item)]
    ).slice().sort((a, b) => {
        const aRunning = a.status === 'Đang chạy' ? 1 : 0;
        const bRunning = b.status === 'Đang chạy' ? 1 : 0;
        if (aRunning !== bRunning) return bRunning - aRunning;
        return Number(b.spend || 0) - Number(a.spend || 0);
    });

    const totalSpend = originalRows.reduce((sum, row) => sum + Number(row.spend || 0), 0);
    const totalMessages = originalRows.reduce((sum, row) => sum + Number(row.messages || 0), 0);
    const totalPurchases = originalRows.reduce((sum, row) => sum + Number(row.result || 0), 0);
    const totalAds = originalRows.reduce((sum, row) => sum + (Array.isArray(row.ads) ? row.ads.length : 0), 0);
    const runningCount = originalRows.filter(row => row.status === 'Đang chạy').length;

    const rowsHtml = originalRows.map((row, index) => {
        const spend = Number(row.spend || 0);
        const messages = Number(row.messages || 0);
        const purchases = Number(row.result || 0);
        const cpm = Number(row.rawCpm || (messages > 0 ? spend / messages : 0));
        const cpa = Number(row.rawCpa || (purchases > 0 ? spend / purchases : 0));
        const cr = messages > 0 ? (purchases / messages) * 100 : (purchases > 0 ? 100 : 0);
        const isRunning = row.status === 'Đang chạy';
        const hasDeliveryData = row.hasDeliveryData === true || hasMetaLiveDeliveryData(row);
        const ads = Array.isArray(row.ads) ? row.ads : [];
        const statusHtml = renderMetaLiveStatusHtml(row.status, hasDeliveryData, row.runEnd || row.run_end || '');
        const campaignText = row.campaignName || item.campaignName || '—';
        const adsetMeta = [
            row.adsetId ? `ID: ${row.adsetId}` : '',
            row.sku ? `SKU: ${row.sku}` : ''
        ].filter(Boolean).join(' • ');
        const budgetHistory = normalizeMetaLiveBudgetHistory(row.budgetHistory || []);
        const buttonParts = [];
        if (ads.length > 0) buttonParts.push(`${ads.length} bài`);
        if (budgetHistory.length > 0) buttonParts.push(`${budgetHistory.length} lần tăng`);
        const buttonText = buttonParts.length ? buttonParts.join(' · ') : 'Xem chi tiết';

        return `
            <tr class="meta-live-adset-row" style="cursor:pointer;${!hasDeliveryData ? 'background:#f3f4f6;' : ''}" onclick="window.toggleMetaLiveAdDetail(${index}, event)">
                <td style="text-align:center;font-weight:700;color:#64748b;">${index + 1}</td>
                <td style="min-width:200px;">
                    <div style="font-weight:700;color:#334155;line-height:1.4;">${escapeHtml(campaignText)}</div>
                    ${row.campaignId ? `<div style="font-size:9px;color:#94a3b8;margin-top:3px;">ID: ${escapeHtml(row.campaignId)}</div>` : ''}
                </td>
                <td style="min-width:280px;">
                    <div style="font-weight:700;color:#1d4ed8;line-height:1.42;">${escapeHtml(row.fullName || row.adName || '—')}</div>
                    ${adsetMeta ? `<div style="font-size:9px;color:#7c8c9d;margin-top:4px;">${escapeHtml(adsetMeta)}</div>` : ''}
                </td>
                <td style="text-align:center;">${statusHtml}</td>
                <td style="text-align:right;min-width:140px;font-weight:700;white-space:nowrap;">
                    ${escapeHtml(formatMetaLiveOriginalBudget(row))}
                    ${row.budgetType ? `<div style="font-size:9px;color:#7c8c9d;margin-top:3px;">${escapeHtml(row.budgetType)}</div>` : ''}
                </td>
                <td style="text-align:right;font-weight:700;white-space:nowrap;">${formatMetaLiveInteger(spend)} ₫</td>
                <td style="text-align:center;font-weight:700;white-space:nowrap;"><span style="color:#e36414;">${formatMetaLiveInteger(messages)}</span> / <span style="color:#137333;">${formatMetaLiveInteger(purchases)}</span></td>
                <td style="text-align:center;font-weight:700;color:#a15c00;">${cr.toFixed(1)}%</td>
                <td style="text-align:center;font-weight:700;color:#1a73e8;">${Number(row.ctr || 0).toFixed(2)}%</td>
                <td style="text-align:center;font-weight:700;">${Number(row.freq || 0).toFixed(2)}</td>
                <td style="text-align:right;white-space:nowrap;">
                    <div style="font-weight:700;">${formatMetaLiveInteger(cpm)} ₫</div>
                    <div style="font-size:9px;color:#7c8c9d;margin-top:2px;">CPA ${formatMetaLiveInteger(cpa)} ₫</div>
                </td>
                <td style="text-align:center;white-space:nowrap;">
                    <button type="button" style="border:1px solid #c9daf8;border-radius:8px;background:#eef4ff;color:#174ea6;padding:6px 9px;font-weight:700;cursor:pointer;min-width:82px;">
                        <span id="meta-live-ad-arrow-${index}">▸</span> ${escapeHtml(buttonText)}
                    </button>
                </td>
            </tr>
            <tr id="meta-live-ad-detail-${index}" class="meta-live-ad-detail-row" style="display:none;">
                <td colspan="12" style="padding:0!important;">
                    ${buildMetaLiveBudgetHistoryHtml(row)}
                    ${buildMetaLiveAdDetailHtml(ads, index)}
                </td>
            </tr>
        `;
    }).join('');

    const oldModal = document.getElementById('meta-live-original-rows-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="meta-live-original-rows-modal" style="position:fixed;inset:0;z-index:100020;background:rgba(15,23,42,.66);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;" onclick="window.closeMetaLiveOriginalRowsModal(event)">
            <div style="width:min(1540px,98vw);max-height:94vh;background:#fff;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.35);overflow:hidden;display:flex;flex-direction:column;" onclick="event.stopPropagation()">
                <div style="padding:15px 18px;background:linear-gradient(135deg,#174ea6,#1f6fff);color:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
                    <div>
                        <div style="font-size:9px;font-weight:700;letter-spacing:.8px;opacity:.85;">META LIVE · NHÓM GỐC VÀ BÀI QUẢNG CÁO</div>
                        <h3 style="margin:5px 0 0;font-size:17px;line-height:1.35;font-weight:700;">${escapeHtml(item.employee)} — ${escapeHtml(item.adName)}</h3>
                        <div style="margin-top:5px;font-size:10.5px;opacity:.9;">Nhấn vào từng nhóm để xem lịch sử tăng ngân sách và các bài quảng cáo bên trong</div>
                    </div>
                    <button type="button" onclick="window.closeMetaLiveOriginalRowsModal()" style="width:34px;height:34px;border:1px solid rgba(255,255,255,.3);border-radius:9px;background:rgba(255,255,255,.12);color:#fff;font-size:22px;line-height:1;cursor:pointer;">×</button>
                </div>

                <div style="padding:11px 14px;background:#f8fbff;border-bottom:1px solid #e6edf5;display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:8px;">
                    <div style="padding:9px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:9px;color:#7c8c9d;font-weight:700;text-transform:uppercase;">Nhóm gốc</div><div style="margin-top:3px;font-size:17px;font-weight:700;color:#174ea6;">${formatMetaLiveInteger(originalRows.length)}</div></div>
                    <div style="padding:9px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:9px;color:#7c8c9d;font-weight:700;text-transform:uppercase;">Bài quảng cáo</div><div style="margin-top:3px;font-size:17px;font-weight:700;color:#6d28d9;">${formatMetaLiveInteger(totalAds)}</div></div>
                    <div style="padding:9px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:9px;color:#7c8c9d;font-weight:700;text-transform:uppercase;">Tổng chi phí</div><div style="margin-top:3px;font-size:17px;font-weight:700;color:#c5221f;">${formatMetaLiveInteger(totalSpend)} ₫</div></div>
                    <div style="padding:9px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:9px;color:#7c8c9d;font-weight:700;text-transform:uppercase;">Tin nhắn</div><div style="margin-top:3px;font-size:17px;font-weight:700;color:#e36414;">${formatMetaLiveInteger(totalMessages)}</div></div>
                    <div style="padding:9px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:9px;color:#7c8c9d;font-weight:700;text-transform:uppercase;">Lượt mua</div><div style="margin-top:3px;font-size:17px;font-weight:700;color:#137333;">${formatMetaLiveInteger(totalPurchases)}</div></div>
                </div>

                <div style="padding:13px;overflow:auto;flex:1;background:#f5f7fa;">
                    <div style="min-width:1390px;background:#fff;border:1px solid #dfe6ee;border-radius:11px;overflow:hidden;">
                        <table class="ads-table" style="width:100%;min-width:1390px;border-collapse:separate;border-spacing:0;font-size:10px;">
                            <thead>
                                <tr>
                                    <th style="text-align:center;width:42px;">STT</th>
                                    <th style="text-align:left;">Chiến dịch</th>
                                    <th style="text-align:left;">Nhóm quảng cáo gốc</th>
                                    <th style="text-align:center;">Trạng thái</th>
                                    <th style="text-align:right;">Ngân sách</th>
                                    <th style="text-align:right;">Chi phí</th>
                                    <th style="text-align:center;">Tin / Mua</th>
                                    <th style="text-align:center;">Mua / Tin</th>
                                    <th style="text-align:center;">CTR</th>
                                    <th style="text-align:center;">Tần suất</th>
                                    <th style="text-align:right;">Giá tin / CPA</th>
                                    <th style="text-align:center;">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                </div>

                <div style="padding:10px 14px;border-top:1px solid #e6edf5;background:#fff;color:#64748b;font-size:10px;display:flex;justify-content:space-between;gap:12px;align-items:center;">
                    <span>${originalRows.length} nhóm gốc • ${runningCount} nhóm đang chạy • ${totalAds} bài có dữ liệu trong kỳ</span>
                    <button type="button" onclick="window.closeMetaLiveOriginalRowsModal()" style="border:0;border-radius:8px;background:#1f6fff;color:#fff;padding:8px 15px;font-weight:700;cursor:pointer;">Đóng</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

function renderPerformanceTable(data) { 

    const tbody = document.getElementById('ads-table-perf'); 

    if(!tbody) return; 

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        let message = 'Không có dữ liệu trong khoảng ngày đang chọn.';

        if (CURRENT_TAB === 'performance' && META_LIVE_STATE.loading) {
            message = '⏳ Đang lấy dữ liệu trực tiếp từ Meta...';
        } else if (CURRENT_TAB === 'performance' && META_LIVE_STATE.error) {
            message = `❌ ${escapeHtml(META_LIVE_STATE.error)}`;
        } else if (CURRENT_TAB === 'performance' && META_LIVE_DATA_SCOPE === 'marketing') {
            message = 'Không có chiến dịch hoặc nhóm quảng cáo Marketing trong khoảng ngày đang chọn.';
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="padding:30px;text-align:center;color:#7c8c9d;font-weight:700;">
                    ${message}
                </td>
            </tr>
        `;
        return;
    }

    data.slice(0, 300).forEach(item => { 

        const cpa = item.rawCpa || (item.result > 0 ? Math.round(item.spend/item.result) : 0); 

        const cpm = item.rawCpm || ((item.messages || 0) > 0 ? Math.round(item.spend/item.messages) : 0);

        const crValue = (item.messages || 0) > 0 ? (item.result / item.messages) * 100 : (item.result > 0 ? 100 : 0);

        const previousValues = getMetaLivePreviousValues(item);

        const previousCpa = previousValues
            ? (
                previousValues.rawCpa ||
                (
                    previousValues.result > 0
                        ? Math.round(previousValues.spend / previousValues.result)
                        : 0
                )
            )
            : cpa;

        const previousCpm = previousValues
            ? (
                previousValues.rawCpm ||
                (
                    previousValues.messages > 0
                        ? Math.round(previousValues.spend / previousValues.messages)
                        : 0
                )
            )
            : cpm;

        const previousCrValue = previousValues
            ? (
                previousValues.messages > 0
                    ? (previousValues.result / previousValues.messages) * 100
                    : (previousValues.result > 0 ? 100 : 0)
            )
            : crValue;

        const spendHtml = renderMetaLiveRowNumber(
            item,
            'spend',
            formatMetaLiveInteger(item.spend),
            formatMetaLiveInteger(previousValues ? previousValues.spend : item.spend)
        );

        const messagesHtml = renderMetaLiveRowNumber(
            item,
            'messages',
            formatMetaLiveInteger(item.messages || 0),
            formatMetaLiveInteger(previousValues ? previousValues.messages : (item.messages || 0))
        );

        const resultHtml = renderMetaLiveRowNumber(
            item,
            'result',
            formatMetaLiveInteger(item.result),
            formatMetaLiveInteger(previousValues ? previousValues.result : item.result)
        );

        const crHtml = renderMetaLiveRowNumber(
            item,
            ['messages', 'result'],
            crValue.toFixed(1) + '%',
            previousCrValue.toFixed(1) + '%'
        );

        const ctrHtml = renderMetaLiveRowNumber(
            item,
            ['ctr', 'linkClicks', 'impressions'],
            Number(item.ctr || 0).toFixed(2) + '%',
            Number(previousValues ? previousValues.ctr : (item.ctr || 0)).toFixed(2) + '%'
        );

        const cpmHtml = renderMetaLiveRowNumber(
            item,
            ['spend', 'messages', 'rawCpm'],
            formatMetaLiveInteger(cpm),
            formatMetaLiveInteger(previousCpm)
        );

        const cpaHtml = renderMetaLiveRowNumber(
            item,
            ['spend', 'result', 'rawCpa'],
            formatMetaLiveInteger(cpa),
            formatMetaLiveInteger(previousCpa)
        );

        // Nhóm còn chạy: chỉ hiển thị tổng ngân sách của các nhóm đang chạy.
        // Nhóm đã tắt toàn bộ: chỉ hiển thị ngân sách của nhóm tắt gần nhất.
        const isRunningBudget = item.status === 'Đang chạy';
        const effectiveBudgetInfo = getEffectiveGroupedBudgetInfo(item);
        const currentBudgetValue = Number(effectiveBudgetInfo.amount || 0);
        const previousBudgetValue = Number(
            previousValues
                ? (isRunningBudget ? previousValues.activeBudget : previousValues.budget)
                : currentBudgetValue
        );
        const currentUsesCampaignBudget = !!effectiveBudgetInfo.usesCampaignBudget;
        const previousUsesCampaignBudget = !!(
            previousValues
                ? (
                    isRunningBudget
                        ? previousValues.activeBudgetUsesCampaign
                        : previousValues.budgetUsesCampaign
                )
                : currentUsesCampaignBudget
        );
        const budgetChanged = isMetaLiveValueChanged(
            item,
            isRunningBudget
                ? ['activeBudget', 'activeBudgetUsesCampaign']
                : ['budget', 'budgetUsesCampaign']
        );

        function formatBudgetDisplay(value, usesCampaignBudget) {
            if (usesCampaignBudget && value > 0) {
                return `${formatMetaLiveInteger(value)} ₫ + NS chiến dịch`;
            }
            if (usesCampaignBudget) {
                return 'Sử dụng ngân sách chiến dịch';
            }
            if (value > 0) {
                return `${formatMetaLiveInteger(value)} ₫`;
            }
            return '—';
        }

        const currentBudgetDisplay = formatBudgetDisplay(
            currentBudgetValue,
            currentUsesCampaignBudget
        );
        const previousBudgetDisplay = formatBudgetDisplay(
            previousBudgetValue,
            previousUsesCampaignBudget
        );
        const budgetHtml = budgetChanged
            ? (
                /\d/.test(currentBudgetDisplay)
                    ? renderMetaLiveDigitDifference(
                        previousBudgetDisplay,
                        currentBudgetDisplay,
                        true
                    )
                    : `<span class="meta-live-digit-change">${escapeHtml(currentBudgetDisplay)}</span>`
            )
            : escapeHtml(currentBudgetDisplay);
        const displayedBudgetType = effectiveBudgetInfo.type || '';
        const budgetTypeHtml = displayedBudgetType
            ? `<div style="font-size:9px;color:#7c8c9d;margin-top:2px;">${escapeHtml(displayedBudgetType)}</div>`
            : '';

        const hasDeliveryData = hasMetaLiveDeliveryData(item);
        let statusHtml;

        statusHtml = renderMetaLiveStatusHtml(
            item.status,
            hasDeliveryData,
            item.run_end || ''
        );

        const tr = document.createElement('tr'); 
        const originalRowCount = Array.isArray(item.original_adset_rows)
            ? item.original_adset_rows.length
            : 1;
        const rowKey = getMetaLiveRowKey(item);

        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.style.cursor = 'pointer';
        if (!hasDeliveryData) {
            tr.style.backgroundColor = '#f3f4f6';
            tr.setAttribute('data-meta-live-configured-only', '1');
        }
        tr.title = !hasDeliveryData
            ? 'Nhóm quảng cáo đã đồng bộ từ Trình quản lý quảng cáo nhưng chưa phát sinh dữ liệu. Nhấn để xem chi tiết.'
            : `Nhấn để xem ${originalRowCount} nhóm quảng cáo gốc trước khi gộp`;
        tr.setAttribute('data-meta-live-original-count', String(originalRowCount));
        tr.addEventListener('click', function() {
            window.showMetaLiveOriginalRows(rowKey);
        });

        tr.innerHTML = `

            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${escapeHtml(item.employee)}</td>

            <td class="text-left" style="color:#333;">
                <div>${escapeHtml(item.adName)}</div>
                <div style="margin-top:3px;font-size:9px;color:#1f6fff;font-weight:700;">Xem ${originalRowCount} nhóm gốc ›</div>
            </td>

            <td class="text-center">${statusHtml}</td>

            <td class="text-right" style="font-weight:bold;white-space:nowrap;">
                <div>${budgetHtml}</div>
                ${budgetTypeHtml}
            </td>

            <td class="text-right" style="font-weight:bold;"><span>${spendHtml}</span></td>

            <td class="text-center" style="font-weight:bold;"><span style="color:#ff6d00">${messagesHtml}</span> / <span style="color:#137333">${resultHtml}</span></td>

            <td class="text-center" style="font-weight:bold; color:#f4b400;"><span>${crHtml}</span></td>

            <td class="text-center" style="font-weight:bold; color:#1a73e8;">
                <span title="${new Intl.NumberFormat('vi-VN').format(item.linkClicks || 0)} lượt nhấp liên kết / ${new Intl.NumberFormat('vi-VN').format(item.impressions || 0)} lượt hiển thị">
                    ${ctrHtml}
                </span>
            </td>

            <td class="text-right" style="font-weight:bold;">
                <div style="color:#333;">${cpmHtml}</div>
                <div style="font-size:9px; color:#d93025; margin-top:2px;">(Đơn: ${cpaHtml})</div>
            </td>

            <td class="text-center" style="font-size:10px; color:#555;">${item.run_start}</td>

        `; 

        tbody.appendChild(tr); 

    }); 

}



function renderFinanceTable(data) { 

    const tbody = document.getElementById('ads-table-fin'); 

    if(!tbody) return; 

    tbody.innerHTML = ""; 

    if (!data || data.length === 0) {
        const message = FINANCE_DATA_SCOPE === 'marketing'
            ? 'Không có dữ liệu tài chính thuộc Marketing trong khoảng ngày đang chọn.'
            : 'Không có dữ liệu tài chính trong khoảng ngày đang chọn.';
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="padding:30px;text-align:center;color:#7c8c9d;font-weight:700;">
                    ${message}
                </td>
            </tr>
        `;
        return;
    }

    data.slice(0, 300).forEach(item => { 

        const vat = item.spend * 0.1; 

        const fee = item.fee || 0; 

        const total = item.spend + vat + fee; 

        const rev = item.revenue || 0; 

        const roas = total > 0 ? (rev / total) : 0; 

        

        let rowClass = '';

        let roasHtml = '-';



        if (total > 0 || item.spend > 0) {

            let roasVal = roas.toFixed(2) + 'x';

            if (roas >= 8.0) {

                rowClass = 'roas-good';

                roasHtml = `<div style="display:inline-flex; align-items:center; gap:4px; background:#e6f4ea; color:#137333; padding:3px 10px; border-radius:12px; border:1px solid #ceead6; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><span style="font-weight:700;">${roasVal}</span><span style="font-size:11px;">✅</span></div>`;

            } else if (roas < 2.0) { 

                rowClass = 'roas-bad';

                roasHtml = `<div style="display:inline-flex; align-items:center; gap:4px; background:#fce8e6; color:#d93025; padding:3px 10px; border-radius:12px; border:1px solid #fad2cf; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><span style="font-weight:700;">${roasVal}</span><span style="font-size:11px;">❗</span></div>`;

            } else {

                roasHtml = `<span style="font-weight:bold; color:#f4b400; font-size:12px;">${roasVal}</span>`;

            }

        }



        const tr = document.createElement('tr'); 

        if (rowClass) { tr.classList.add(rowClass); }

        

        tr.innerHTML = `

            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${escapeHtml(item.employee)}</td>

            <td class="text-left" style="color:#333;">${escapeHtml(item.adName)}</td>

            <td class="text-right">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>

            <td class="text-right" style="color:#d93025;">${new Intl.NumberFormat('vi-VN').format(vat)}</td>

            <td class="text-right" style="color:#e67c73;">${fee != 0 ? new Intl.NumberFormat('vi-VN').format(fee) : '-'}</td>

            <td class="text-right" style="font-weight:700; color:#333;">${new Intl.NumberFormat('vi-VN').format(Math.round(total))}</td>

            <td class="text-right" style="font-weight:bold; color:#137333;">${rev > 0 ? new Intl.NumberFormat('vi-VN').format(rev) : '-'}</td>

            <td class="text-center">${roasHtml}</td>

        `; 

        tbody.appendChild(tr); 

    }); 

}



function exportFinanceToExcel() {

    if (!CURRENT_FILTERED_DATA || CURRENT_FILTERED_DATA.length === 0) {

        showToast("⚠️ Không có dữ liệu để xuất!", "warning");

        return;

    }



    if (window.EXCEL_STYLE_LOADED !== true) {

        showToast("⏳ Đang tải thư viện Excel nâng cao, vui lòng click lại sau 1 giây...", "warning");

        return;

    }



    const exportData = CURRENT_FILTERED_DATA.map(item => {

        const vat = item.spend * 0.1;

        const fee = item.fee || 0;

        const total = item.spend + vat + fee;

        const rev = item.revenue || 0;

        const roas = total > 0 ? parseFloat((rev / total).toFixed(2)) : 0;



        // Tính tỷ lệ Mua / Tin

        const crValue = (item.messages || 0) > 0 ? (item.result / item.messages) * 100 : (item.result > 0 ? 100 : 0);



        let extractedSKU = "";

        let cleanAdName = item.adName || "";

        if (item.adName) {

            const matches = [...item.adName.matchAll(/\(([^)]+)\)/g)];

            if (matches.length > 0) {

                extractedSKU = matches.map(m => m[1]).join(', '); 

                cleanAdName = item.adName.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();

            }

        }



        return {

            "Tên Chiến Dịch": item.employee,

            "Sản Phẩm Chạy Quảng Cáo": cleanAdName, 

            "SKU": extractedSKU,                    

            "Bắt Đầu": item.run_start,

            "Kết Thúc": item.run_end,

            "Ngân sách": getBudgetExportValue(item),

            "Tin Nhắn": item.messages || 0,

            "Lượt Mua": item.result || 0,

            "CTR": item.ctr ? item.ctr.toFixed(2) + "%" : "0.00%",         // Thêm ký hiệu % và làm tròn 2 số thập phân

            "Tần Suất": item.freq ? parseFloat(item.freq.toFixed(1)) : 0,  // Làm tròn 1 số thập phân

            "Tỷ lệ Mua/Tin (%)": parseFloat(crValue.toFixed(2)),

            "Chi Phí": item.spend,

            "VAT 10%": vat,

            "Phí Chênh Lệch": fee,

            "TỔNG CHI": Math.round(total),

            "DOANH THU": rev,

            "Tỷ lệ": "",            

            "ROAS": roas,

            "Nhân Viên": item.employee, 

            "Ghi chú": ""            

        };

    });



    const ws = XLSX.utils.json_to_sheet(exportData);

    

    // Đã thêm 3 cột nên cần cập nhật lại độ rộng (tổng cộng 20 cột)

    ws['!cols'] = [ 

        { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, 

        { wch: 10 }, { wch: 10 }, { wch: 15 }, // Độ rộng 3 cột mới (CTR, Tần suất, Tỷ lệ M/T)

        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 25 }

    ];



    const headerStyle = { 

        font: { bold: true, color: { rgb: "000000" }, sz: 12 }, 

        fill: { fgColor: { rgb: "FFFFFF" } }, 

        alignment: { horizontal: "center", vertical: "center" }, 

        border: { 

            top: {style: "thin", color: {rgb: "000000"}}, 

            bottom: {style: "thin", color: {rgb: "000000"}}, 

            left: {style: "thin", color: {rgb: "000000"}}, 

            right: {style: "thin", color: {rgb: "000000"}} 

        } 

    };



    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let C = range.s.c; C <= range.e.c; ++C) {

        const cell_ref = XLSX.utils.encode_cell({c: C, r: 0});

        if (ws[cell_ref]) ws[cell_ref].s = headerStyle;

    }



    for (let R = 1; R <= range.e.r; ++R) {

        for (let C = range.s.c; C <= range.e.c; ++C) {

            const cell_ref = XLSX.utils.encode_cell({c: C, r: R});

            

            if (!ws[cell_ref]) {

                ws[cell_ref] = { t: 's', v: '' }; 

            }

            

            ws[cell_ref].s = {

                font: { sz: 11, color: { rgb: "000000" } }, 

                fill: { fgColor: { rgb: "FFFFFF" } }, 

                border: { 

                    top: {style: "thin", color: {rgb: "000000"}}, 

                    bottom: {style: "thin", color: {rgb: "000000"}}, 

                    left: {style: "thin", color: {rgb: "000000"}}, 

                    right: {style: "thin", color: {rgb: "000000"}} 

                }, 

                alignment: { vertical: "center" }

            };

            

            // Cập nhật lại Index canh giữa: Bao gồm cả 3 cột mới (8, 9, 10)

            if ([2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 18].includes(C)) { 

                ws[cell_ref].s.alignment.horizontal = "center"; 

            }
            // Cột Ngân sách (index 5): định dạng tiền khi giá trị là số.
            if (C === 5 && typeof ws[cell_ref].v === 'number') {
                ws[cell_ref].z = '#,##0';
                ws[cell_ref].s.alignment.horizontal = 'right';
            }




            // Cập nhật lại Index định dạng Tiền (Từ cột 11 đến 15)

            if (C >= 11 && C <= 15) {

                // Cột 13 = Phí Chênh Lệch: giữ số lẻ, không ép hiển thị số nguyên
                if (C === 13) {
                    ws[cell_ref].z = '#,##0.##########';
                } else {
                    ws[cell_ref].z = '#,##0';
                }

                // Cột Tổng Chi (14) và Doanh Thu (15) được in đậm

                if (C === 14 || C === 15) { ws[cell_ref].s.font.bold = true; } 

            }

            

            // Cập nhật lại Index cột ROAS (bị đẩy xuống cột số 17)

            if (C === 17) { 

                ws[cell_ref].s.alignment.horizontal = "center"; 

                ws[cell_ref].s.font.bold = true; 

            }

            

            // Cột Tên Chiến dịch in đậm

            if (C === 0) { ws[cell_ref].s.font.bold = true; }

        }

    }



    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "TaiChinh_ROAS");

    

    const fileCompMap = { 'NNV': 'NongNghiepViet', 'VN': 'VietNhat', 'KF': 'KingFarm', 'ABC': 'ABCVietNam' };

    const compName = fileCompMap[CURRENT_COMPANY] || CURRENT_COMPANY;

    const d = new Date();

    const dateStr = ("0" + d.getDate()).slice(-2) + ("0" + (d.getMonth() + 1)).slice(-2) + d.getFullYear();

    const fileName = `ChiPhiQC_${compName}_${dateStr}.xlsx`;



    try {

        XLSX.writeFile(wb, fileName);

        showToast("✅ Đã xuất báo cáo Excel thành công!", "success");

        if (db) {

            db.ref('export_logs').push({

                timestamp: new Date().toISOString(), exporter: window.myIdentity || "Khách", company: CURRENT_COMPANY, recordCount: CURRENT_FILTERED_DATA.length

            });

        }

    } catch (err) {

        console.error(err);

        showToast("⚠️ Xuất file chuẩn...", "warning");

        XLSX.writeFile(wb, fileName); 

    }

}

function drawChartPerf(data) { 

    try { 

        const ctx = document.getElementById('chart-ads-perf'); 

        if(!ctx || typeof Chart === 'undefined') return; 

        if(window.myAdsChart) window.myAdsChart.destroy(); 

        

        let agg = {}; 

        data.forEach(item => { 

            let groupKey = VIEW_MODE === 'employee' ? item.employee : getProductGroupKey(item.adName);

            

            if(!agg[groupKey]) agg[groupKey] = { spend: 0, result: 0, messages: 0 }; 

            agg[groupKey].spend += item.spend; 

            agg[groupKey].result += item.result; 

            agg[groupKey].messages += (item.messages || 0);

        }); 

        

        const sorted = Object.entries(agg).map(([name, val]) => {

            let cr = val.messages > 0 ? (val.result / val.messages) * 100 : (val.result > 0 ? 100 : 0);

            return { 

                name: name, 

                spend: val.spend, 

                result: val.result,

                messages: val.messages,

                cpa: val.result > 0 ? Math.round(val.spend / val.result) : 0,

                cpm: val.messages > 0 ? Math.round(val.spend / val.messages) : 0,

                cr: parseFloat(cr.toFixed(2))

            };

        }).sort((a,b) => {

            if (SORT_MODE === 'purchases') return b.result - a.result;

            if (SORT_MODE === 'spend') return b.spend - a.spend;

            if (SORT_MODE === 'messages') return b.messages - a.messages;

            if (SORT_MODE === 'cr') return b.cr - a.cr;

            if (VIEW_MODE === 'product') return b.result - a.result;

            return b.spend - a.spend; 

        }).slice(0, 15); 

        

        let barLabel = 'Tiền Đã Chi';

        let barData = sorted.map(i => i.spend);

        let leftAxisTitle = 'Tổng Tiền (VNĐ)';

        

        if (SORT_MODE === 'purchases') {

            barLabel = 'Lượt Mua';

            barData = sorted.map(i => i.result);

            leftAxisTitle = 'Số Lượng Mua (Đơn)';

        } else if (SORT_MODE === 'messages') {

            barLabel = 'Lượt Tin Nhắn';

            barData = sorted.map(i => i.messages);

            leftAxisTitle = 'Số Lượng Tin Nhắn';

        } else if (SORT_MODE === 'cr') {

            barLabel = 'Tỷ Lệ Mua / Tin (%)';

            barData = sorted.map(i => i.cr);

            leftAxisTitle = 'Tỷ Lệ Mua/Tin (%)';

        }



        window.myAdsChart = new Chart(ctx, { 

            type: 'bar', 

            data: { 

                labels: sorted.map(i => i.name), 

                datasets: [

                    { 

                        label: barLabel, 

                        data: barData, 

                        backgroundColor: '#d93025', 

                        borderColor: '#d93025',

                        borderWidth: 1,

                        yAxisID: 'y',

                        order: 3

                    }, 

                    {
    label: 'Giá / Đơn (CPA)',
    data: sorted.map(i => i.cpa),
    type: 'line',

    backgroundColor: '#00a3ff',
    borderColor: '#00a3ff',

    borderWidth: 4,
    tension: 0.25,
    fill: false,

    pointRadius: 5,
    pointHoverRadius: 7,

    pointBackgroundColor: '#00a3ff',
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,

    yAxisID: 'y1',
    order: 1
},

                    { 

                        label: 'Giá / Tin Nhắn', 

                        data: sorted.map(i => i.cpm), 

                        type: 'line', 

                        backgroundColor: '#FFFF00', 

                        borderColor: '#FFFF00',     

                        borderWidth: 3,             

                        pointRadius: 5, 

                        pointBackgroundColor: '#fff',

                        yAxisID: 'y1',

                        order: 2

                    }

                ] 

            }, 

            options: { 

                responsive: true, 

                maintainAspectRatio: false, 

                interaction: { mode: 'index', intersect: false },

                onClick: (event, elements) => {

                    if (elements && elements.length > 0) {

                        const index = elements[0].index;

                        const groupKey = sorted[index].name;

                        window.showGroupDetails(groupKey, data, false);

                    }

                },

                onHover: (event, chartElement) => {

                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';

                },

                plugins: {

                    tooltip: {

                        usePointStyle: true, 

                        padding: 12,

                        boxPadding: 6,

                        titleFont: { size: 13, weight: 'bold' },

                        bodyFont: { size: 12 },

                        footerFont: { size: 11, weight: 'normal' },

                        callbacks: {

                            title: function(context) {

                                let prefix = VIEW_MODE === 'employee' ? '👤 ' : '📦 SKU: ';

                                return prefix + context[0].label;

                            },

                            label: function(context) {

                                let value = context.parsed.y;

                                let formattedVal = new Intl.NumberFormat('vi-VN').format(value);

                                

                                if (context.datasetIndex === 0) {

                                    if (SORT_MODE === 'purchases') return 'Lượt mua : ' + formattedVal;

                                    if (SORT_MODE === 'spend') return 'Tổng chi : ' + formattedVal + ' ₫';

                                    if (SORT_MODE === 'messages') return 'Tin nhắn : ' + formattedVal;

                                    if (SORT_MODE === 'cr') return 'Tỷ lệ Mua/Tin: ' + formattedVal + '%';

                                } else if (context.datasetIndex === 1) {

                                    return 'Giá / Đơn: ' + formattedVal + ' ₫';

                                } else if (context.datasetIndex === 2) {

                                    return 'Giá / Tin : ' + formattedVal + ' ₫'; 

                                }

                            },

                            footer: function(tooltipItems) {

                                let dataIndex = tooltipItems[0].dataIndex;

                                let totalSpend = sorted[dataIndex].spend;

                                let totalLeads = sorted[dataIndex].result;

                                let totalMsgs = sorted[dataIndex].messages;

                                let cr = sorted[dataIndex].cr;

                                

                                return [

                                    '',

                                    '💰 Đã chi     : ' + new Intl.NumberFormat('vi-VN').format(totalSpend) + ' ₫',

                                    '📦 Lượt mua  : ' + new Intl.NumberFormat('vi-VN').format(totalLeads),

                                    '✉️ Tin nhắn  : ' + new Intl.NumberFormat('vi-VN').format(totalMsgs),

                                    '⚡ Tỷ lệ Mua/Tin: ' + cr + '%',

                                    '',

                                    '🖱️ BẤM VÀO ĐỂ XEM CHI TIẾT'

                                ];

                            }

                        }

                    }

                },

                scales: { 

                    y: { 

                        type: 'linear', display: true, position: 'left',

                        title: { display: true, text: leftAxisTitle, font: {weight: 'bold', size: 10} }

                    }, 

                    y1: { 

                        type: 'linear', display: true, position: 'right',

                        title: { display: true, text: 'Giá CPA & Giá 1 Tin (VNĐ)', font: {weight: 'bold', size: 10}, color: '#333' },

                        grid: { drawOnChartArea: false }

                    } 

                } 

            } 

        }); 

    } catch(e) { console.error("Chart Error", e); } 

}



function drawChartFin(data) { 

    try { 

        const ctx = document.getElementById('chart-ads-fin'); 

        if(!ctx || typeof Chart === 'undefined') return;

        if(window.myAdsChart) window.myAdsChart.destroy(); 

        

        let agg = {}; 

        data.forEach(item => { 

            let groupKey = VIEW_MODE === 'employee' ? item.employee : getProductGroupKey(item.adName);



            if(!agg[groupKey]) agg[groupKey] = { cost: 0, rev: 0 }; 

            agg[groupKey].cost += (item.spend * 1.1) + (item.fee || 0); 

            agg[groupKey].rev += (item.revenue || 0); 

        }); 

        

        const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 15); 

        

        window.myAdsChart = new Chart(ctx, { 

            type: 'bar', 

            data: { 

                labels: sorted.map(i => i.name), 

                datasets: [

                    { label: 'Tổng Chi Phí (All)', data: sorted.map(i => i.cost), backgroundColor: '#d93025', order: 2 }, 

                    { label: 'Doanh Thu', data: sorted.map(i => i.rev), backgroundColor: '#137333', order: 3 }, 

                    { label: 'ROAS', data: sorted.map(i => i.cost > 0 ? (i.rev / i.cost) : 0), type: 'line', borderColor: '#f4b400', backgroundColor: '#f4b400', borderWidth: 3, pointRadius: 4, yAxisID: 'y1', order: 1 }

                ] 

            }, 

            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: true }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } } } 

        }); 

    } catch(e) { console.error("Chart Error", e); } 

}



// ==========================================

// HỆ THỐNG ĐÁNH GIÁ KỊCH BẢN MEDIA BUYING (CHUẨN HÓA 32 TRƯỜNG HỢP)

// ==========================================

function getMatrixThresholds(fullData) {
    let targetCPA = parseFloat(document.getElementById('matrix-target-cpa')?.value) || 0;
    let testBudget = parseFloat(document.getElementById('matrix-test-budget')?.value) || 0;

    if (targetCPA === 0) targetCPA = ADS_CPA_TARGET_DEFAULT; 
    if (testBudget === 0) testBudget = ADS_TEST_BUDGET_DEFAULT;

    return { targetCPA: targetCPA, testBudget: testBudget };
}

function getSystemDiagnosis(spend, cpa, cpm, roas, ctr, freq, cr, thresholds, hasRevenue) {

    const { targetCPA, testBudget } = thresholds;

    const formatNumber = num => new Intl.NumberFormat('vi-VN').format(num);



    if (spend === 0) {

        return { 

            color: 'rgba(153, 153, 153, 0.7)', border: '#999999', label: '⏳ CHƯA DATA', 

            htmlBadge: '<div class="diag-btn"><span style="color:#666; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px;">⏳ CHƯA DATA</span></div>',

            adStatusObj: { label: "⏳ CHƯA CÓ DỮ LIỆU", reason: "Chiến dịch chưa tiêu tiền hoặc vừa lên xong.", action: "Chờ Facebook phân phối thêm." }

        };

    }



    let isLearning = spend < testBudget;

    

    // ĐÁNH GIÁ 5 TIÊU CHÍ (Giá/Mua, Tần suất, CTR, Mua/Tin, ROAS)

    let cpaOk = (cpa > 0 && cpa <= targetCPA);

    // ROAS > 5 là kim bài miễn tử: có thể tối ưu nhưng không được tắt.
    let roasSafe = hasRevenue && roas > ADS_ROAS_SAFE_THRESHOLD;
    let roasDanger = hasRevenue && roas < 2.0;
    let roasOk = (!hasRevenue) ? true : roasSafe; 

    let ctrOk = (ctr >= 1.0);

    let freqOk = (freq > 0 && freq <= 3.0) || freq === 0; 

    let crOk = (cr >= 20.0);

    

    // Đếm số lỗi trên Phễu (Bỏ qua ROAS vì xử lý riêng)

    let funnelFails = [];

    if (!cpaOk) funnelFails.push('GIÁ/MUA');

    if (!ctrOk) funnelFails.push('CTR');

    if (!freqOk) funnelFails.push('TẦN SUẤT');

    if (!crOk) funnelFails.push('CHỐT SALE');



    let failCount = funnelFails.length; 

    let metCount = 5 - failCount - (hasRevenue && !roasOk ? 1 : 0);



    let label, badgeStyle, color, border, reason, action;



    // GÓI DỮ LIỆU ĐỂ HIỂN THỊ CỬA SỔ CHI TIẾT

    let tooltipList = '';

    if(isLearning) tooltipList += `<li style="color:#F2C94C; list-style:none; font-weight:bold; margin-bottom:8px;">👉 Đang Test Ngân Sách (${formatNumber(spend)}đ)</li>`;

    

    if(!freqOk) tooltipList += `<li style="color:#E74C3C"><b>Tần suất (${freq.toFixed(1)} &gt; 3):</b> Bão hòa, cần thay bài mới.</li>`;

    else if(freq > 0) tooltipList += `<li style="color:#2ECC71"><b>Tần suất (${freq.toFixed(1)}):</b> Phân phối tốt.</li>`;



    if(!ctrOk) tooltipList += `<li style="color:#E74C3C"><b>CTR (${ctr.toFixed(2)}% &lt; 1%):</b> Kém thu hút, khách lướt qua.</li>`;

    else tooltipList += `<li style="color:#2ECC71"><b>CTR (${ctr.toFixed(2)}%):</b> Nội dung thu hút.</li>`;



    if(!crOk) tooltipList += `<li style="color:#E74C3C"><b>Mua/Tin (${cr.toFixed(1)}% &lt; 20%):</b> Sale trượt nhiều.</li>`;

    else tooltipList += `<li style="color:#2ECC71"><b>Mua/Tin (${cr.toFixed(1)}%):</b> Chốt sale tốt.</li>`;



    if(!cpaOk && cpa > 0) tooltipList += `<li style="color:#E74C3C"><b>Giá/Mua (${formatNumber(cpa)}đ &gt; ${formatNumber(targetCPA)}đ):</b> Giá trên mỗi lượt mua đang cao.</li>`;

    else if(!cpaOk) tooltipList += `<li style="color:#E74C3C"><b>Giá/Mua:</b> Chưa có lượt mua nên tiêu chí CPA chưa đạt.</li>`;

    else if(cpaOk && cpa > 0) tooltipList += `<li style="color:#2ECC71"><b>Giá/Mua (${formatNumber(cpa)}đ):</b> Tối ưu.</li>`;



    if(hasRevenue) {

        if(roasDanger) tooltipList += `<li style="color:#E74C3C"><b>ROAS (${roas.toFixed(2)}x &lt; 2):</b> Đang lỗ vốn.</li>`;

        else if (roasSafe) tooltipList += `<li style="color:#2ECC71"><b>ROAS (${roas.toFixed(2)}x &gt; 5):</b> Kim bài miễn tử, không được tắt.</li>`;

        else if (roas > 0) tooltipList += `<li style="color:#F2C94C"><b>ROAS (${roas.toFixed(2)}x):</b> Chưa đạt ngưỡng miễn tử &gt; 5, cần tối ưu thêm.</li>`;

    }



    // ----------------------------------------------------

    // LOGIC CHẨN ĐOÁN (32 KỊCH BẢN BẢO VỆ ROAS)

    // ----------------------------------------------------



    // 1. DƯỚI NGÂN SÁCH TEST -> BỌC GIÁP MÁY HỌC (Không bao giờ tắt)

    if (isLearning) {

        label = '⏳ MÁY HỌC (Đang Test)';

        badgeStyle = 'color:#666; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #999;';

        color = 'rgba(153, 153, 153, 0.7)'; border = '#999999';

        reason = `Thuật toán đang tìm tệp khách hàng. Chưa tiêu qua mốc test ${formatNumber(testBudget)}đ.`;

        action = 'TUYỆT ĐỐI KHÔNG TẮT. Cứ để yên cho máy học tiếp tục phân phối.';

    }

    // ĐÃ QUA NGÂN SÁCH TEST -> PHÁN XÉT

    else {

        // 2. NHÓM LỖ NẶNG (Có Doanh thu và ROAS < 2) -> CẦN TẮT GẤP

        if (roasDanger) {

            label = '❌ CẦN TẮT (Lỗ)';

            badgeStyle = 'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #d93025;';

            color = 'rgba(217, 48, 37, 0.7)'; border = '#d93025';

            reason = `Bất kể chỉ số khác ra sao, lợi nhuận gánh không nổi chi phí quảng cáo (ROAS ${roas.toFixed(2)}x &lt; 2).`;

            action = 'CẦN TẮT GẤP. Không nuối tiếc.';

        }

        // 3. NHÓM CÒN LẠI (ROAS > 5 được bảo vệ, chưa up doanh thu thì xét phễu)

        else {

            // A. Nhóm rớt >= 3 tiêu chí (Tức là chỉ đạt 0, 1 hoặc 2 tiêu chí)

            if (failCount >= 3) {

                // Nếu có ROAS cứu giá -> Kém (Ăn may)

                if (hasRevenue && roasOk) {

                    label = '⚠️ KÉM (Ăn may)';

                    badgeStyle = 'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #d93025;';

                    color = 'rgba(217, 48, 37, 0.7)'; border = '#d93025';

                    reason = `Phễu đã gãy (${funnelFails.join(', ')}). Đang ngáp ngoải nhưng được cứu bởi đơn lớn (ROAS &gt; 5).`;

                    action = 'TUYỆT ĐỐI KHÔNG TĂNG NGÂN SÁCH. Giữ chạy để vắt kiệt lãi, rớt đơn to là Tắt ngay.';

                } 

                // Nếu không có ROAS cứu giá (chưa up doanh thu) -> Tắt luôn

                else {

                    label = '❌ CẦN TẮT (Trượt nhiều)';

                    badgeStyle = 'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #d93025;';

                    color = 'rgba(217, 48, 37, 0.7)'; border = '#d93025';

                    reason = `Trượt ${failCount}/4 điều kiện phễu Traffic. Hiệu quả quá kém.`;

                    action = 'CẦN TẮT LUÔN để bảo vệ ngân sách.';

                }

            }

            // B. Nhóm Cần Tối Ưu (Rớt 2 tiêu chí)

            else if (failCount === 2) {

                label = '⚡ CẦN TỐI ƯU';

                badgeStyle = 'color:#ff6d00; font-weight:bold; background:#fff3e0; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #ff6d00;';

                color = 'rgba(255, 109, 0, 0.7)'; border = '#ff6d00';

                

                if (funnelFails.includes('CTR') && funnelFails.includes('TẦN SUẤT')) {

                    reason = 'Ít người click + Lặp lại tệp người cũ. Bài cũ đã hết vòng đời.';

                    action = 'Bắt buộc lên bài quảng cáo (Content/Creative) mới hoàn toàn.';

                } else if (funnelFails.includes('CTR') && funnelFails.includes('CHỐT SALE')) {

                    reason = 'Khách lướt qua nhiều + Vào nhắn cũng không mua. Khả năng "treo đầu dê bán thịt chó".';

                    action = 'Làm lại Content trung thực hơn và xem lại Target.';

                } else if (funnelFails.includes('CTR') && funnelFails.includes('GIÁ/MUA')) {

                    reason = 'Ít click dẫn đến CPC đắt, kéo theo Giá/Mua đắt.';

                    action = 'Tối ưu lại Hình ảnh/Video cấp bách để tăng lượng nhấp.';

                } else if (funnelFails.includes('TẦN SUẤT') && funnelFails.includes('GIÁ/MUA')) {

                    reason = 'Quảng cáo nhai lại trong tệp nhỏ khiến giá thầu tăng vọt.';

                    action = 'Mở rộng tệp khách hàng (Target) ngay lập tức.';

                } else if (funnelFails.includes('TẦN SUẤT') && funnelFails.includes('CHỐT SALE')) {

                    reason = 'Tiếp cận lại người cũ đã không có nhu cầu nên tỷ lệ chốt rớt thảm.';

                    action = 'Lên content góc nhìn mới hoặc đổi tệp khách hàng.';

                } else if (funnelFails.includes('CHỐT SALE') && funnelFails.includes('GIÁ/MUA')) {

                    reason = 'Chi phí tìm khách đã đắt mà sale lại trượt nhiều.';

                    action = 'Báo động đỏ cho khâu Sale. Rà soát quy trình tư vấn ngay.';

                } else {

                    reason = `Đang bị hụt 2 chỉ số: ${funnelFails.join(' và ')}.`;

                    action = `Tập trung phân tích và khắc phục ${funnelFails.join(', ')}.`;

                }

            }

            // C. Nhóm Tiềm Năng LV1 (Rớt 1 tiêu chí)

            else if (failCount === 1) {

                label = '🚀 TIỀM NĂNG LV1';

                badgeStyle = 'color:#f4b400; font-weight:bold; background:#fef7e0; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #f4b400;';

                color = 'rgba(244, 180, 0, 0.7)'; border = '#f4b400';

                

                if (funnelFails.includes('CTR')) {

                    reason = `Bài hiển thị nhiều nhưng ít người bấm (CTR = ${ctr.toFixed(2)}%).`;

                    action = 'Thay Thumbnail hoặc làm lại đoạn Hook 3 giây đầu để giữ chân người xem.';

                } else if (funnelFails.includes('TẦN SUẤT')) {

                    reason = `Tệp đang bị chai, lặp lại khách hàng cũ (Tần suất = ${freq.toFixed(2)}).`;

                    action = 'Tạo biến thể nội dung mới hoặc mở rộng Target/vùng địa lý để tiếp cận khách mới.';

                } else if (funnelFails.includes('CHỐT SALE')) {

                    reason = `Khách nhắn nhiều, tin rẻ, nhưng chốt kém (Tỷ lệ chốt = ${cr.toFixed(1)}%).`;

                    action = 'Ép Sale/Đổi kịch bản. Đào tạo lại đội sale, xem lại cách báo giá.';

                } else if (funnelFails.includes('GIÁ/MUA')) {

                    reason = `Giá/Mua hơi cao nhưng khách nét, chốt tốt nên vẫn có thể duy trì.`;

                    action = 'Giữ nguyên ăn lãi, đồng thời nhân bản nhóm sang target khác để kéo CPA xuống.';

                }

            }

            // D. Nhóm Hoàn Hảo (Đạt 5/5)

            else if (failCount === 0) {

                label = '⭐ TỐT (Hoàn hảo)';

                badgeStyle = 'color:#0f9d58; font-weight:bold; background:#e6f4ea; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #0f9d58;';

                color = 'rgba(15, 157, 88, 0.7)'; border = '#0f9d58';

                reason = `Đạt chuẩn mọi điều kiện phễu. Mọi thứ đang đi đúng hướng.`;

                action = 'Scale (tăng ngân sách) từ 15-20% mỗi ngày/tuần để hớt váng thị trường.';

            }

        }

    }



    const shortBadgeLabel = label.split(' (')[0];

    const adStatusObj = { label: label, reason: reason, action: action };



    // HTML DẠNG NÚT BẤM KÍCH HOẠT CỬA SỔ

    const htmlBadge = `

        <div class="diag-btn" onclick="event.stopPropagation(); window.showDetailedDiagnosis(this.nextElementSibling.innerHTML)">

            <span style="${badgeStyle}">${shortBadgeLabel}</span>

        </div>

        <div style="display:none;">

            <div style="font-size:14px; font-weight:bold; border-bottom:1px solid #444; padding-bottom:8px; margin-bottom:10px; color:#4DD0E1; text-transform:uppercase;">📊 BÁO CÁO PHÂN TÍCH: ${shortBadgeLabel}</div>

            <ul style="margin:4px 0 15px 0; padding-left:18px; font-size:13px; line-height:1.6;">${tooltipList}</ul>

            <div style="background:#1A1A1A; padding:12px; border-radius:8px; border-left:4px solid #FF9800;">

                <div style="margin-bottom:6px;"><span style="color:#4DD0E1; font-weight:bold;">🔍 Tình trạng:</span> <span style="color:#eee;">${reason}</span></div>

                <div><span style="color:#4CAF50; font-weight:bold;">💡 Đề xuất:</span> <span style="color:#fff; font-weight:bold;">${action}</span></div>

            </div>

        </div>

    `;



    return { color, border, label, htmlBadge, adStatusObj };

}



// BẢNG POPUP BỆNH ÁN CHI TIẾT

window.showDetailedDiagnosis = function(innerHtmlData) {

    let modalHtml = `

        <div id="diag-deep-dive-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:100005; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);" onclick="document.getElementById('diag-deep-dive-modal').remove()">

            <div style="background:#2C2C2C; color:#ecf0f1; width:90%; max-width:450px; border-radius:12px; border:1px solid #555; box-shadow:0 10px 40px rgba(0,0,0,0.5); animation:fadeIn 0.2s;" onclick="event.stopPropagation()">

                <div style="padding:15px 20px; font-size:14px; line-height:1.5;">

                    ${innerHtmlData}

                </div>

                <div style="padding:10px 20px; border-top:1px solid #444; text-align:right;">

                    <button onclick="document.getElementById('diag-deep-dive-modal').remove()" style="background:#4CAF50; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer; font-weight:bold;">Đã Hiểu</button>

                </div>

            </div>

        </div>

    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

};



// HÀM HIỂN THỊ BẢNG CHI TIẾT NHÓM QUẢNG CÁO

window.showGroupDetails = function(groupKey, fullData, isTrendTab = false) {

    const groupAds = fullData.filter(item => {

        if (VIEW_MODE === 'employee') return item.employee === groupKey;

        return getProductGroupKey(item.adName) === groupKey;

    }).sort((a,b) => b.spend - a.spend);

    

    let titleStr = "";

    let cleanProductName = groupKey;

    if (VIEW_MODE === 'employee') {

        titleStr = `NHÂN VIÊN: ${escapeHtml(groupKey)}`;

    } else {

        if (groupAds.length > 0 && groupAds[0].adName) {

            cleanProductName = groupAds[0].adName.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();

        }

        titleStr = `SẢN PHẨM: ${escapeHtml(groupKey)} - ${escapeHtml(cleanProductName)}`;

    }



    let tableHeaderCol = VIEW_MODE === 'employee' ? 'Sản Phẩm Đang Chạy' : 'Chi Tiết Bài Chạy';

    const thresholds = getMatrixThresholds(CURRENT_FILTERED_DATA);

    const groupRevenueReady = isRevenueAvailableForData(groupAds);



    let tbodyHtml = '';

    let totalSpend = 0, totalMsgs = 0, totalLeads = 0, totalRevenue = 0, totalCost = 0, totalCtrSpendSum = 0, totalFreqSpendSum = 0, totalLinkClicks = 0, totalImpressions = 0;



    groupAds.forEach(ad => {

        totalSpend += ad.spend;

        totalMsgs += (ad.messages || 0);

        totalLeads += ad.result;

        totalRevenue += (ad.revenue || 0);

        totalCost += (ad.spend * 1.1) + (ad.fee || 0);

        totalLinkClicks += Number(ad.linkClicks || 0);
        totalImpressions += Number(ad.impressions || 0);
        totalCtrSpendSum += (ad.ctr || 0) * (ad.spend || 0);

        totalFreqSpendSum += (ad.freq || 0) * (ad.spend || 0);



        const cpa = ad.result > 0 ? Math.round(ad.spend / ad.result) : 0;

        const cpm = (ad.messages || 0) > 0 ? Math.round(ad.spend / ad.messages) : 0;

        const crValue = (ad.messages || 0) > 0 ? (ad.result / ad.messages) * 100 : (ad.result > 0 ? 100 : 0);

        

        let statusHtml = ad.status === 'Đang chạy' ? '<span style="color:#0f9d58; font-weight:bold;">Đang chạy</span>' : '<span style="color:#999;">Đã tắt</span>';

        

        const adTotalCost = (ad.spend * 1.1) + (ad.fee || 0);

        const roas = adTotalCost > 0 ? (ad.revenue || 0) / adTotalCost : 0;

        

        // CHẠY QUA HÀM ĐÁNH GIÁ (32 Kịch bản)

        const diagnosis = getSystemDiagnosis(ad.spend, cpa, cpm, roas, ad.ctr, ad.freq, crValue, thresholds, isRevenueReadyForItem(ad));



        let firstColHtml = VIEW_MODE === 'employee' 

            ? escapeHtml(ad.adName) 

            : `👤 ${escapeHtml(ad.employee)}<br><span style="color:#666; font-size:10px;">${escapeHtml(ad.adName)}</span>`;



        // GỘP CỘT GIÁ TIN VÀ CPA THÀNH 1 CỘT

        tbodyHtml += `

            <tr style="border-bottom: 1px solid #eee;">

                <td style="padding: 8px; color:#1a73e8; font-weight:600; font-size:11px;">${firstColHtml}</td>

                <td style="padding: 8px; text-align:right; font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(ad.spend)} ₫</td>

                <td style="padding: 8px; text-align:center; font-weight:bold;"><span style="color:#ff6d00">${new Intl.NumberFormat('vi-VN').format(ad.messages || 0)}</span> / <span style="color:#137333">${new Intl.NumberFormat('vi-VN').format(ad.result)}</span></td>

                <td style="padding: 8px; text-align:center; color:#f4b400; font-weight:bold;">${crValue.toFixed(1)}%</td>

                <td style="padding: 8px; text-align:right; font-weight:bold;">

                    <div style="color:#d93025;">${new Intl.NumberFormat('vi-VN').format(cpa)} ₫</div>

                    <div style="font-size:9px; color:#666; margin-top:2px;">Giá tin: ${new Intl.NumberFormat('vi-VN').format(cpm)} ₫</div>

                </td>

                <td style="padding: 8px; text-align:center; font-size:11px; color:#555;"><b>${ad.ctr.toFixed(2)}%</b><br><span style="font-size:9px;color:#888;">F: ${ad.freq.toFixed(2)}</span></td>

                <td style="padding: 8px; text-align:center; font-size:10px;">${statusHtml}</td>

                <td style="padding: 8px; text-align:center;">${diagnosis.htmlBadge}</td>

            </tr>

        `;

    });



    const avgCpa = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

    const avgCpm = totalMsgs > 0 ? Math.round(totalSpend / totalMsgs) : 0;

    const avgCr = totalMsgs > 0 ? ((totalLeads / totalMsgs) * 100) : (totalLeads > 0 ? 100 : 0);

    const avgRoas = totalCost > 0 ? (totalRevenue / totalCost) : 0;

    const avgCtr = calculateAggregatedCtr(totalLinkClicks, totalImpressions, totalCtrSpendSum, totalSpend);

    const avgFreq = totalSpend > 0 ? (totalFreqSpendSum / totalSpend) : 0;



    let groupDiagnosisHtml = '';

    if (isTrendTab) {

        const groupDiag = getSystemDiagnosis(totalSpend, avgCpa, avgCpm, avgRoas, avgCtr, avgFreq, avgCr, thresholds, groupRevenueReady);

        groupDiagnosisHtml = `

            <div style="background: #2C2C2C; border: 1px solid #444; border-left: 6px solid ${groupDiag.border}; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">

                    <span style="background:#4CAF50; color:#fff; padding:4px 8px; border-radius:4px; font-weight:700; font-size:12px;">ĐÁNH GIÁ TỔNG QUAN:</span>

                    <span style="color:${groupDiag.border}; font-weight:bold; font-size:14px; text-transform:uppercase;">${groupDiag.adStatusObj.label}</span>

                </div>

                <p style="margin: 0 0 5px 0; color: #eee; font-size: 13px;"><span style="color:#4DD0E1; font-weight:bold;">🔍 Tình trạng:</span> ${groupDiag.adStatusObj.reason}</p>

                <p style="margin: 0; color: #fff; font-size: 13px;"><span style="color:#4CAF50; font-weight:bold;">💡 Đề xuất:</span> <b>${groupDiag.adStatusObj.action}</b></p>

            </div>

        `;

    }



    let modalHtml = `

        <div class="ads-modal-overlay" id="ads-detail-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:100000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);" onclick="window.closeAdsModal(event)">

            <div class="ads-modal-content" style="background:#fff; width:95%; max-width:1000px; max-height:85vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3); animation:slideDownFade 0.2s;" onclick="event.stopPropagation()">

                <div style="padding:15px 20px; background:#1a73e8; color:#fff; display:flex; justify-content:space-between; align-items:center;">

                    <h3 style="margin:0; font-size:16px; text-transform:uppercase;">📊 BÁO CÁO NHÓM: ${titleStr}</h3>

                    <button onclick="window.closeAdsModal()" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1;">&times;</button>

                </div>

                

                <div style="padding:20px; overflow-y:auto; overflow-x:hidden; background:#f4f6f8; flex:1;">

                    ${groupDiagnosisHtml}



                    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:15px;">

                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">

                            <div style="font-size:10px; color:#666; font-weight:bold;">TỔNG CHI PHÍ</div>

                            <div style="font-size:16px; font-weight:700; color:#1a73e8;">${new Intl.NumberFormat('vi-VN').format(totalSpend)} ₫</div>

                        </div>

                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">

                            <div style="font-size:10px; color:#666; font-weight:bold;">TỔNG TIN / MUA</div>

                            <div style="font-size:16px; font-weight:700; color:#333;"><span style="color:#ff6d00">${new Intl.NumberFormat('vi-VN').format(totalMsgs)}</span> / <span style="color:#137333">${new Intl.NumberFormat('vi-VN').format(totalLeads)}</span></div>

                        </div>

                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">

                            <div style="font-size:10px; color:#666; font-weight:bold;">TỶ LỆ (MUA/TIN)</div>

                            <div style="font-size:16px; font-weight:700; color:#f4b400;">${avgCr.toFixed(1)}%</div>

                        </div>

                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">

                            <div style="font-size:10px; color:#666; font-weight:bold;">GIÁ / MUA (CPA)</div>

                            <div style="font-size:16px; font-weight:700; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(avgCpa)} ₫</div>

                        </div>

                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">

                            <div style="font-size:10px; color:#666; font-weight:bold;">LỢI TỨC (ROAS)</div>

                            <div style="font-size:16px; font-weight:700; color:${avgRoas>ADS_ROAS_SAFE_THRESHOLD?'#0f9d58':'#d93025'};">${avgRoas.toFixed(2)}x</div>

                        </div>

                    </div>



                    <div style="background:#fff; border:1px solid #ddd; border-radius:8px; overflow-x:auto;">

                        <table class="ads-table">

                            <thead>

                                <tr style="background:#e8f0fe;">

                                    <th style="padding:10px 8px; text-align:left; border-bottom:2px solid #ddd;">${tableHeaderCol}</th>

                                    <th style="padding:10px 8px; text-align:right; border-bottom:2px solid #ddd;">Chi Phí</th>

                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Tin/Mua</th>

                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Tỷ lệ M/T</th>

                                    <th style="padding:10px 8px; text-align:right; border-bottom:2px solid #ddd;">Giá/Mua<br><span style="font-size:9px; color:#666;">(Giá Tin)</span></th>

                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">CTR / Tần suất</th>

                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Trạng Thái</th>

                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Chẩn Đoán Tối Ưu</th>

                                </tr>

                            </thead>

                            <tbody>${tbodyHtml}</tbody>

                        </table>

                    </div>

                    <div style="text-align:right; font-size:11px; color:#d93025; margin-top:10px; font-weight:bold; animation:pulse 2s infinite;">

                        <i>👉 NHẤP VÀO TỪNG NHÃN ĐÁNH GIÁ ĐỂ XEM HỒ SƠ BỆNH ÁN CHI TIẾT.</i>

                    </div>

                    <style>@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }</style>

                </div>

            </div>

        </div>

    `;



    let existingModal = document.getElementById('ads-detail-modal');

    if(existingModal) existingModal.remove(); 

    

    document.body.insertAdjacentHTML('beforeend', modalHtml);

};



window.closeAdsModal = function(e) {

    const modal = document.getElementById('ads-detail-modal');

    if(modal) {

        if(!e || e.target === modal || e.currentTarget === modal) {

            modal.remove();

        }

    }

};



function drawChartTrend(companyData) {

    try {

        const ctx = document.getElementById('chart-ads-trend');

        if(!ctx || typeof Chart === 'undefined') return;

        if(window.myAdsTrendChart) window.myAdsTrendChart.destroy();



        const thresholds = getMatrixThresholds(companyData);

        let targetCPA = thresholds.targetCPA;

        let agg = {};

        companyData.forEach(item => {

            let groupKey = VIEW_MODE === 'employee' ? item.employee : getProductGroupKey(item.adName);

            if(!agg[groupKey]) agg[groupKey] = { spend: 0, result: 0, messages: 0, sumCtr: 0, sumFreq: 0, totalCost: 0, revenue: 0, nameClean: item.adName, batchIds: [] };

            agg[groupKey].spend += item.spend;

            agg[groupKey].result += item.result;

            agg[groupKey].messages += (item.messages || 0);

            

            // Tính trung bình trọng số cho biểu đồ bong bóng

            agg[groupKey].sumCtr += item.ctr * item.spend;

            agg[groupKey].sumFreq += item.freq * item.spend;

            agg[groupKey].totalCost += (item.spend * 1.1) + (item.fee || 0);

            agg[groupKey].revenue += (item.revenue || 0);
            if (item.batchId && !agg[groupKey].batchIds.includes(item.batchId)) agg[groupKey].batchIds.push(item.batchId);

        });



        const points = Object.entries(agg).map(([name, val]) => {

            let cpa = val.result > 0 ? Math.round(val.spend / val.result) : 0;

            let ctrAvg = val.spend > 0 ? (val.sumCtr / val.spend) : 0;

            let freqAvg = val.spend > 0 ? (val.sumFreq / val.spend) : 0;

            let roasGroup = val.totalCost > 0 ? (val.revenue / val.totalCost) : 0;

            let crGroup = val.messages > 0 ? (val.result / val.messages) * 100 : 0;

            let cpmAvg = val.messages > 0 ? Math.round(val.spend / val.messages) : (val.spend > 0 ? val.spend : 0);

            

            let displayName = name;

            if (VIEW_MODE === 'product') {

                 let clean = val.nameClean.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();

                 displayName = `${name} - ${clean}`;

            }



            return { 

                name: displayName, 

                groupKey: name, 

                spend: val.spend, 

                result: val.result, 

                messages: val.messages,

                ctr: ctrAvg,

                freq: freqAvg,

                roas: roasGroup,

                cr: crGroup,

                cpm: cpmAvg,

                cpa: cpa,
                revenueReady: (val.batchIds || []).length > 0 && (val.batchIds || []).every(isBatchRevenueUploaded) 

            };

        });



        if(points.length === 0) return;



        const bubbleData = points.map(p => {

            const info = getSystemDiagnosis(p.spend, p.cpa, p.cpm, p.roas, p.ctr, p.freq, p.cr, thresholds, p.revenueReady);



            return {

                x: p.spend, y: p.cpa, // Trục Y hiển thị Giá trên mỗi lượt mua (CPA)

                r: Math.max(8, Math.min(p.result * 2 + 5, 40)),

                campName: escapeHtml(p.name), groupKey: escapeHtml(p.groupKey), result: p.result, messages: p.messages,

                freq: p.freq.toFixed(2), ctr: p.ctr.toFixed(2), roas: p.roas, cr: p.cr.toFixed(2), cpm: p.cpm, cpa: p.cpa,

                color: info.color, borderColor: info.border, recommendation: info.adStatusObj.action

            };

        });



        window.myAdsTrendChart = new Chart(ctx, {

            type: 'bubble',

            data: {

                datasets: [{

                    label: 'Chiến dịch',

                    data: bubbleData,

                    backgroundColor: bubbleData.map(d => d.color),

                    borderColor: bubbleData.map(d => d.borderColor),

                    borderWidth: 2

                }]

            },

            options: { 

                responsive: true, maintainAspectRatio: false, 

                onClick: (event, elements) => {

                    if (elements && elements.length > 0) {

                        const index = elements[0].index;

                        const groupKey = points[index].groupKey; // Sử dụng points gốc chứa tên chưa mã hóa HTML

                        window.showGroupDetails(groupKey, CURRENT_FILTERED_DATA, true);

                    }

                },

                onHover: (event, chartElement) => {

                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';

                },

                plugins: { 

                    legend: { display: false },

                    tooltip: {

                        usePointStyle: true, padding: 12,

                        callbacks: {

                            label: function(context) {

                                const data = context.raw;

                                return [

                                    `${data.campName}`,

                                    `━━━━━━━━━━━━━━━━━`,

                                    `💡 Đề xuất: ${data.recommendation}`,

                                    ``,

                                    `💰 Tiền đã chi : ${new Intl.NumberFormat('vi-VN').format(data.x)} ₫`,

                                    `🎯 Giá / Mua   : ${new Intl.NumberFormat('vi-VN').format(data.y)} ₫`,

                                    `📦 Lượt mua    : ${new Intl.NumberFormat('vi-VN').format(data.result)}`,

                                    `━━━━━━━━━━━━━━━━━`,

                                    `📊 CHỈ SỐ TRAFFIC GỐC:`,

                                    `- Tần suất lặp  : ${data.freq} lần`,

                                    `- Tỷ lệ Click (CTR) : ${data.ctr}%`,

                                    `- Tỷ lệ Mua/Tin (CR): ${data.cr}%`,

                                    `- Lợi tức (ROAS)    : ${data.roas.toFixed(2)}x`,

                                    ``,

                                    `🖱️ CLICK ĐỂ XEM BỆNH ÁN CHI TIẾT`

                                ];

                            }

                        }

                    }

                }, 

                scales: { 

                    x: { title: { display: true, text: 'Tổng Tiền Đã Chi (VNĐ)', font: {weight: 'bold'} }, min: 0 }, 

                    y: { title: { display: true, text: 'Giá trên mỗi lượt mua (CPA)', font: {weight: 'bold'} }, min: 0 } 

                } 

            }

        });

        

        const inputCpa = document.getElementById('matrix-target-cpa');

        if (inputCpa && !inputCpa.value) inputCpa.placeholder = `Auto: ~${Math.round(targetCPA/1000)}k`;



    } catch(e) { console.error("Matrix Chart Error", e); }

}



function parseCleanNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

    const raw = val.toString().trim();
    if (!raw) return 0;

    const isPercent = raw.includes('%');
    const isNegativeByParentheses = /^\s*\(.*\)\s*$/.test(raw);

    // Giữ lại chữ số, dấu âm và dấu phân cách. Loại tiền tệ/ký tự mô tả.
    let s = raw
        .replace(/[\u00A0\s]/g, '')
        .replace(/[^0-9,\.\-]/g, '');

    if (!s || s === '-') return 0;

    const commaCount = (s.match(/,/g) || []).length;
    const dotCount = (s.match(/\./g) || []).length;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (commaCount > 0 && dotCount > 0) {
        // Dấu nằm sau cùng được xem là dấu thập phân.
        if (lastComma > lastDot) {
            s = s.replace(/\./g, '').replace(/,/g, '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (commaCount > 0) {
        const parts = s.split(',');
        const lastPart = parts[parts.length - 1];
        const looksLikeThousands = !isPercent && parts.length > 1 && parts.slice(1).every(p => p.length === 3);

        if (looksLikeThousands) {
            s = parts.join('');
        } else {
            s = parts.slice(0, -1).join('') + '.' + lastPart;
        }
    } else if (dotCount > 0) {
        const parts = s.split('.');
        const lastPart = parts[parts.length - 1];
        const looksLikeThousands = !isPercent && parts.length > 1 && parts.slice(1).every(p => p.length === 3);

        if (looksLikeThousands) {
            s = parts.join('');
        } else if (parts.length > 2) {
            s = parts.slice(0, -1).join('') + '.' + lastPart;
        }
    }

    let result = Number.parseFloat(s);
    if (!Number.isFinite(result)) return 0;
    if (isNegativeByParentheses && result > 0) result = -result;
    return result;
}

function formatExcelDate(input) { 

    if (!input) return "-"; 

    if (typeof input === 'number') { return formatDateObj(new Date((input - 25569) * 86400 * 1000)); } 

    let str = input.toString().trim(); 

    let datePart = str.split(' ')[0]; 

    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) { 

        const parts = datePart.split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; 

    } 

    if (datePart.match(/^\d{4}\/\d{2}\/\d{2}$/)) { 

        const parts = datePart.split('/'); return `${parts[2]}/${parts[1]}/${parts[0]}`; 

    } 

    return str; 

}



function formatDateObj(d) { 

    if (isNaN(d.getTime())) return "-"; 

    return `${("0" + d.getDate()).slice(-2)}/${("0" + (d.getMonth() + 1)).slice(-2)}/${d.getFullYear()}`; 

}

// Khởi tạo biến lưu kỳ báo cáo đang chọn

if (typeof window.CURRENT_REPORT_PERIOD === 'undefined') {

    window.CURRENT_REPORT_PERIOD = 'latest';

}



function renderReportPreview() {

    const container = document.getElementById('report-preview-container');

    if (!container) return;



   // V146: Báo cáo MKT dùng trực tiếp bộ lọc chung phía trên.
   // Không tạo thêm bộ chọn kỳ riêng trong nội dung báo cáo.
   const sharedReportPeriod = getMetaLivePeriod();
   const selectedMonth = REPORT_MONTH || String(sharedReportPeriod.from || '').slice(0, 7);
   const sharedReportPeriodLabel = `${formatMetaLiveCompactDate(sharedReportPeriod.from)} → ${formatMetaLiveCompactDate(sharedReportPeriod.to)}`;
   window.CURRENT_REPORT_PERIOD = selectedMonth || 'latest';

// File chi phí cũ chỉ còn vai trò lịch sử; không tham gia dữ liệu báo cáo hiện tại.
let liveReportData = [];
let desiredLivePeriodKey = '';
try {
    const livePeriod = getMetaLivePeriod();
    desiredLivePeriodKey = getMetaLivePeriodKey(livePeriod);
    if (META_LIVE_REPORT_PERIOD_KEY === desiredLivePeriodKey) {
        liveReportData = META_LIVE_REPORT_DATA.filter(item => (
            item.report_start_iso === livePeriod.from &&
            item.report_end_iso === livePeriod.to
        ));
    }
} catch (error) {
    liveReportData = [];
}

// Báo cáo hiện tại chỉ dùng Meta Live + doanh thu mới nhất + sao kê mới nhất.
// Công ty chưa có snapshot Meta Live sẽ chờ snapshot, không lấy file chi phí cũ làm dữ liệu dự phòng.
let reportData = liveReportData.length
    ? enrichMetaReportRowsWithLatestFinanceSources(liveReportData, desiredLivePeriodKey)
    : [];

const REPORT_USING_META_LIVE = reportData.length > 0;
const reportCompanyCount = new Set(reportData.map(item => item.company).filter(Boolean)).size;



    if (reportData.length === 0) {

        container.innerHTML = `

            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, #0d47a1, #1a73e8); color: #fff; padding: 15px 20px; border-radius: 10px; margin-bottom: 25px; display:flex; justify-content:space-between; align-items:center;">

                <h3 style="margin:0; font-size:16px; font-weight:700; text-transform:uppercase;">🌐 BÁO CÁO TỔNG HỢP MKT</h3>

                <div style="font-size:12px;font-weight:700;opacity:.92;">${sharedReportPeriodLabel}</div>

            </div>

            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align:center; padding:30px; color:#999; font-size:14px;">Chưa có dữ liệu trong kỳ này hoặc hệ thống đang chờ snapshot Meta Live đầu tiên.</div>

        `;

        return;

    }



    // ---------------------------------------------------------

    // BƯỚC 3: TÍNH TOÁN CÁC CHỈ SỐ

    // ---------------------------------------------------------

    let gCamps = 0, gCost = 0, gRev = 0, gMsgs = 0, gSpend = 0, gCtrSum = 0;

    let compAgg = {}, skuAgg = {}, empAgg = {}, campList = [];



    // Riêng mục 2 — ROAS tổng theo Chiến dịch / Nhân sự:
    // reportData tại đây đã được gom nhóm trùng theo nhân sự + SKU/tên sản phẩm.
    // Quy tắc V144:
    // 1) Khóa ngân sách đúng tại từng nhóm sau gom.
    // 2) Chỉ cộng các nhóm sau gom đang chạy.
    // 3) Nhóm đã tắt không tham gia tổng ngân sách chiến dịch.
    // 4) Nếu toàn bộ nhóm đều tắt, hiển thị "Đã tắt" thay vì một con số.
    const reportCampaignBudgetAgg = {};
    const reportCampaignBudgetSeen = new Set();

    reportData.forEach(item => {
        const comp = item.company || 'Khác';
        const emp = item.employee || 'Khác';
        const campaignKey = `${comp}||${emp}`;
        const mergedGroupKey = String(
            item.meta_live_row_key ||
            item.duplicate_sku ||
            item.adsetId ||
            `${normalizeAdsText(item.employee)}||${normalizeAdsText(item.adName)}`
        );
        const uniqueKey = `${campaignKey}||${mergedGroupKey}`;
        if (reportCampaignBudgetSeen.has(uniqueKey)) return;
        reportCampaignBudgetSeen.add(uniqueKey);

        if (!reportCampaignBudgetAgg[campaignKey]) {
            reportCampaignBudgetAgg[campaignKey] = {
                amount: 0,
                usesCampaignBudget: false,
                groupedCount: 0,
                activeGroupedCount: 0,
                stoppedGroupedCount: 0
            };
        }

        const campaignBudget = reportCampaignBudgetAgg[campaignKey];
        campaignBudget.groupedCount += 1;

        const isActiveGroupedItem = String(item.status || '').trim() === 'Đang chạy';
        if (!isActiveGroupedItem) {
            campaignBudget.stoppedGroupedCount += 1;
            return;
        }

        const budgetInfo = getEffectiveGroupedBudgetInfo(item);
        campaignBudget.amount += Number(budgetInfo.amount || 0);
        campaignBudget.usesCampaignBudget =
            campaignBudget.usesCampaignBudget || !!budgetInfo.usesCampaignBudget;
        campaignBudget.activeGroupedCount += 1;
    });


reportData.forEach(item => {

        const cost = (item.spend * 1.1) + (item.fee || 0);

        const rev = item.revenue || 0;

        const msgs = item.messages || 0;

        const leads = item.result || 0;

        const comp = item.company || 'Khác';

        const emp = item.employee || 'Khác';

        

        let skuExtracted = getProductGroupKey(item.adName);

        let cleanName = item.adName.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();

        let fullProductName = cleanName ? `${cleanName} (${skuExtracted})` : skuExtracted;



        // Tổng Global

        gCamps++; gCost += cost; gRev += rev; gMsgs += msgs; gSpend += item.spend;

        gCtrSum += ((item.ctr || 0) * item.spend);



        // 1. Gom nhóm CÔNG TY

        if (!compAgg[comp]) compAgg[comp] = { camps: 0, msgs: 0, leads: 0, rev: 0, cost: 0, spend: 0, ctrSum: 0, freqSum: 0 };

        compAgg[comp].camps++;

        compAgg[comp].msgs += msgs; compAgg[comp].leads += leads; compAgg[comp].rev += rev;

        compAgg[comp].cost += cost; compAgg[comp].spend += item.spend;

        compAgg[comp].ctrSum += ((item.ctr || 0) * item.spend);

        compAgg[comp].freqSum += ((item.freq || 0) * item.spend);

        // 2. Gom nhóm CHIẾN DỊCH

        const cpaForReport = leads > 0 ? (item.spend / leads) : 0;
        const reportBudgetInfo = getEffectiveGroupedBudgetInfo(item);
        campList.push({ 
            name: item.adName,
            productName: cleanName,
            sku: skuExtracted,
            emp: item.employee,
            comp: comp,
            spend: item.spend,
            budget: Number(reportBudgetInfo.amount || 0),
            budgetDisplay: getBudgetExportValue(item),
            budgetType: reportBudgetInfo.type || '',
            budgetUsesCampaign: !!reportBudgetInfo.usesCampaignBudget,
            revenueReady: isRevenueReadyForItem(item),
            cost: cost,
            rev: rev,
            msgs: msgs,
            leads: leads,
            cr: msgs>0?(leads/msgs*100):0,
            roas: cost>0?(rev/cost):0,
            ctr: item.ctr || 0,
            freq: item.freq || 0,
            cpa: cpaForReport,
            status: item.status || '',
            runStart: item.run_start || '',
            runEnd: item.run_end || ''
        });



        // 3. Gom nhóm SKU (SỬA LỖI Ở ĐÂY)

        // Gom theo skuExtracted thay vì fullProductName để loại bỏ lỗi khác khoảng trắng

        let skuKey = comp + '||' + skuExtracted; 

        if (!skuAgg[skuKey]) {

            skuAgg[skuKey] = { 

                comp: comp, 

                productName: fullProductName, // Giữ lại tên đầy đủ để hiển thị cho đẹp

                msgs: 0, leads: 0, rev: 0, cost: 0, spend: 0, ctrSum: 0 

            };

        }

        skuAgg[skuKey].msgs += msgs; 

        skuAgg[skuKey].leads += leads; 

        skuAgg[skuKey].rev += rev;

        skuAgg[skuKey].cost += cost; 

        skuAgg[skuKey].spend += item.spend;

        skuAgg[skuKey].ctrSum += ((item.ctr || 0) * item.spend);



        // 4. Gom nhóm NHÂN VIÊN

        let empKey = comp + '||' + emp;

        if (!empAgg[empKey]) {
            const campaignBudget = reportCampaignBudgetAgg[empKey] || {
                amount: 0,
                usesCampaignBudget: false,
                groupedCount: 0,
                activeGroupedCount: 0,
                stoppedGroupedCount: 0
            };
            const campaignAllStopped =
                Number(campaignBudget.groupedCount || 0) > 0 &&
                Number(campaignBudget.activeGroupedCount || 0) === 0;

            empAgg[empKey] = {
                comp,
                emp,
                camps: 0,
                msgs: 0,
                leads: 0,
                rev: 0,
                cost: 0,
                spend: 0,
                budget: Number(campaignBudget.amount || 0),
                budgetUsesCampaign: !!campaignBudget.usesCampaignBudget,
                campaignAllStopped: campaignAllStopped,
                campaignActiveGroupCount: Number(campaignBudget.activeGroupedCount || 0),
                campaignStoppedGroupCount: Number(campaignBudget.stoppedGroupedCount || 0),
                ctrSum: 0,
                batchIds: []
            };
        }

        empAgg[empKey].camps++; empAgg[empKey].msgs += msgs; empAgg[empKey].leads += leads;

        empAgg[empKey].rev += rev; empAgg[empKey].cost += cost; empAgg[empKey].spend += item.spend;

        // Ngân sách của mục 2 đã được tính riêng từ reportCampaignBudgetAgg:
        // gom nhóm trùng trước, sau đó mới cộng lên toàn chiến dịch/nhân sự.

        empAgg[empKey].ctrSum += ((item.ctr || 0) * item.spend);
        if (!Array.isArray(empAgg[empKey].batchIds)) empAgg[empKey].batchIds = [];
        if (item.batchId && !empAgg[empKey].batchIds.includes(item.batchId)) empAgg[empKey].batchIds.push(item.batchId);

    });



    let gRoas = gCost > 0 ? (gRev / gCost) : 0;

    let gCtr = gSpend > 0 ? (gCtrSum / gSpend) : 0;



    const fm = num => new Intl.NumberFormat('vi-VN').format(Math.round(isNaN(num) ? 0 : num));

    const fmP = num => (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',') + '%';

    const fmN = num => (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',');



    // ---------------------------------------------------------

    // BƯỚC 4: RENDER GIAO DIỆN BÁO CÁO CĂN CHỈNH CHUẨN

    // ---------------------------------------------------------

    let html = `

        <style>

            .report-mkt-wrapper {

                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;

                color: #333;

                line-height: 1.5;

            }

            .report-mkt-wrapper table, .report-mkt-wrapper th, .report-mkt-wrapper td {

                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;

            }

            .report-mkt-wrapper h3, .report-mkt-wrapper h4 {

                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;

                letter-spacing: 0.3px;

            }

        </style>

        <div class="report-mkt-wrapper">

            <div style="background: linear-gradient(135deg, #0d47a1, #1a73e8); color: #fff; padding: 20px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(26,115,232,0.3);">

                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:12px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">

                    <h3 style="margin:0; font-size:16px; font-weight:700; text-transform:uppercase;">🌐 BÁO CÁO TỔNG HỢP MKT (${reportCompanyCount} CÔNG TY) <span style="font-size:9px;background:rgba(255,255,255,.18);padding:4px 7px;border-radius:999px;vertical-align:2px;">${REPORT_USING_META_LIVE ? 'META LIVE' : 'ĐANG NỐI META'}</span></h3>

                    <div style="font-size:12px;font-weight:700;opacity:.92;white-space:nowrap;">

                        ${sharedReportPeriodLabel}

                    </div>

                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:12px; text-align:center;">

                    <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">

                        <div style="font-size:12px; opacity:0.9; margin-bottom:6px; font-weight:600;">SỐ BÀI QUẢNG CÁO</div>

                        <div style="font-size:24px; font-weight:700;">${fm(gCamps)}</div>

                    </div>

                    <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">

                        <div style="font-size:12px; opacity:0.9; margin-bottom:6px; font-weight:600;">CHI PHÍ (VAT + PHÍ)</div>

                        <div style="font-size:24px; font-weight:700;">${fm(gCost)} đ</div>

                    </div>

                    <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px; border:2px solid rgba(129,201,149,0.5);">

                        <div style="font-size:12px; opacity:0.9; margin-bottom:6px; font-weight:600;">DOANH THU</div>

                        <div style="font-size:24px; font-weight:700; color:#81c995;">${fm(gRev)} đ</div>

                    </div>

                    <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px; border:2px solid rgba(242,139,130,0.5);">

                        <div style="font-size:12px; opacity:0.9; margin-bottom:6px; font-weight:600;">ROAS TỔNG</div>

                        <div style="font-size:24px; font-weight:700; color:#f28b82;">${fmN(gRoas)}x</div>

                    </div>

                    <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">

                        <div style="font-size:12px; opacity:0.9; margin-bottom:6px; font-weight:600;">CTR TRUNG BÌNH</div>

                        <div style="font-size:24px; font-weight:700; color:#fde293;">${fmP(gCtr)}</div>

                    </div>

                    <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">

                        <div style="font-size:12px; opacity:0.9; margin-bottom:6px; font-weight:600;">TIN NHẮN</div>

                        <div style="font-size:24px; font-weight:700;">${fm(gMsgs)}</div>

                    </div>

                </div>

            </div>

    `;



    // 1. TÓM TẮT THEO CÔNG TY

    html += `<h4 style="margin:20px 0 10px; color:#1a73e8; font-size:15px; font-weight:bold; text-transform:uppercase; border-left:4px solid #1a73e8; padding-left:8px;">1. Tóm tắt theo Công ty</h4>

             <table class="ads-table" style="margin-bottom:20px; width:100%;">

                <thead><tr style="background:#f8f9fa;">

                    <th style="text-align:left;">Công ty</th><th style="text-align:center;">Camp</th><th style="text-align:center;">Tin nhắn</th><th style="text-align:center;">Lượt mua</th>

                    <th style="text-align:center;">Mua/Tin</th><th style="text-align:right;">Tổng chi</th><th style="text-align:right;">Doanh thu</th><th style="text-align:right;">CP/Tin</th>

                    <th style="text-align:right;">CP/Mua</th><th style="text-align:center;">ROAS</th><th style="text-align:center;">CTR</th><th style="text-align:center;">Tần suất</th>

                </tr></thead><tbody>`;

    Object.keys(compAgg).forEach(comp => {

        let d = compAgg[comp];

        let cr = d.msgs > 0 ? (d.leads/d.msgs)*100 : 0;

        let roas = d.cost > 0 ? (d.rev/d.cost) : 0;

        let ctr = d.spend > 0 ? (d.ctrSum/d.spend) : 0;

        let freq = d.spend > 0 ? (d.freqSum/d.spend) : 0;

        

        // Ở cấp công ty phải dùng toàn bộ chi phí, kể cả bài chưa có tin/mua.
        let cpm = d.msgs > 0 ? (d.spend / d.msgs) : 0;

        let cpa = d.leads > 0 ? (d.spend / d.leads) : 0;



        html += `<tr>

            <td style="font-weight:bold; color:#1a73e8; text-align:left;">${comp}</td><td class="text-center">${d.camps}</td><td class="text-center">${fm(d.msgs)}</td><td class="text-center">${fm(d.leads)}</td>

            <td class="text-center" style="color:#b06000; font-weight:bold;">${fmP(cr)}</td><td class="text-right">${fm(d.cost)}đ</td><td class="text-right" style="color:#137333; font-weight:bold;">${fm(d.rev)}đ</td>

            <td class="text-right">${fm(cpm)}đ</td><td class="text-right">${fm(cpa)}đ</td><td class="text-center" style="font-weight:700; color:#d93025; font-size:14px;">${fmN(roas)}</td>

            <td class="text-center">${fmP(ctr)}</td><td class="text-center">${fmN(freq)}</td>

        </tr>`;

    });

    html += `</tbody></table>`;



    // 2. CAMPAIGN NỔI BẬT / CẦN CẮT BỎ - THỐNG KÊ THEO CÔNG TY + BỘ LỌC
    const evaluateReportCampaign = (c) => {
        const isOverTest = c.spend >= ADS_TEST_BUDGET_DEFAULT;
        const ctrOk = (c.ctr || 0) >= 1;
        const freqOk = ((c.freq || 0) > 0 && (c.freq || 0) <= 3) || (c.freq || 0) === 0;
        const crOk = (c.cr || 0) >= 20;
        const cpaOk = (c.cpa || 0) > 0 && (c.cpa || 0) <= ADS_CPA_TARGET_DEFAULT;
        const passCount = [freqOk, ctrOk, crOk, cpaOk].filter(Boolean).length;

        if (isOverTest) {
            // Chưa upload doanh thu: tuyệt đối không dùng ROAS = 0 để kết luận cắt bài.
            if (!c.revenueReady) {
                return { group: 'neutral', label: 'CHƯA UP DT', color: '#5f6368', bg: '#f1f3f4', passCount };
            }
            if (c.roas > ADS_ROAS_SAFE_THRESHOLD) {
                return { group: 'top', label: 'NỔI BẬT', color: '#137333', bg: '#e6f4ea', passCount };
            }
            if (c.roas > 2) {
                return { group: 'neutral', label: 'CẦN TỐI ƯU', color: '#b06000', bg: '#fef7e0', passCount };
            }
            return { group: 'bad', label: 'CẦN CẮT', color: '#d93025', bg: '#fce8e6', passCount };
        }

        // DƯỚI 500K: chỉ được gọi TEST TỐT khi đạt đủ 4/4 tiêu chí.
        if (passCount === 4) {
            return { group: 'top', label: 'TEST TỐT', color: '#137333', bg: '#e6f4ea', passCount };
        }
        if (passCount <= 1) {
            return { group: 'bad', label: 'TEST YẾU', color: '#d93025', bg: '#fce8e6', passCount };
        }
        return { group: 'neutral', label: 'THEO DÕI', color: '#b06000', bg: '#fef7e0', passCount };
    };

    campList.forEach(c => { c.eval = evaluateReportCampaign(c); });

    // 3. SẢN PHẨM HIỆU QUẢ THEO CÔNG TY
    const productList = Object.values(skuAgg).map(d => {
        d.roas = d.cost > 0 ? (d.rev / d.cost) : 0;
        d.ctr = d.spend > 0 ? (d.ctrSum / d.spend) : 0;
        d.cr = d.msgs > 0 ? (d.leads / d.msgs) * 100 : 0;
        return d;
    });

    const productByCompany = {};
    productList.forEach(d => {
        if (!productByCompany[d.comp]) productByCompany[d.comp] = [];
        productByCompany[d.comp].push(d);
    });

    let productRankRows = [];
    Object.keys(productByCompany).sort().forEach(comp => {
        const list = [...productByCompany[comp]].sort((a,b) => b.rev - a.rev || b.roas - a.roas);
        const highList = list.slice(0, 5).map(d => ({...d, productRankType: 'DOANH THU CAO'}));
        const highKeys = new Set(highList.map(d => d.productName));
        const lowList = [...list]
            .sort((a,b) => a.rev - b.rev || a.roas - b.roas)
            .filter(d => !highKeys.has(d.productName))
            .slice(0, 5)
            .map(d => ({...d, productRankType: 'DOANH THU KÉM'}));

        productRankRows = productRankRows.concat(highList, lowList);
    });

    // ROAS TỔNG THEO CHIẾN DỊCH / NHÂN SỰ
    // Không lấy trung bình ROAS từng sản phẩm. Công thức chuẩn:
    // Tổng doanh thu của người đó / Tổng chi phí đã gồm VAT + phí chênh lệch.
    const employeeRoasRows = Object.values(empAgg).map(d => ({
        ...d,
        roas: d.cost > 0 ? (d.rev / d.cost) : 0,
        cr: d.msgs > 0 ? (d.leads / d.msgs) * 100 : 0,
        ctr: d.spend > 0 ? (d.ctrSum / d.spend) : 0,
        budgetDisplay: d.campaignAllStopped
            ? 'Đã tắt'
            : getBudgetExportValue({
                budget: d.budget || 0,
                budget_uses_campaign: !!d.budgetUsesCampaign
            }),
        status: (d.cost > 0 ? (d.rev / d.cost) : 0) >= 8
            ? 'Từ 1:8 trở lên'
            : ((d.cost > 0 ? (d.rev / d.cost) : 0) >= 4 ? 'Từ 1:4 đến dưới 1:8' : 'Dưới 1:4')
    })).sort((a, b) => b.roas - a.roas || b.rev - a.rev || a.emp.localeCompare(b.emp, 'vi'));

    // Lưu trạng thái bung/thu gọn của từng nhân sự khi Tab 4 render lại.
    window.REPORT_EMPLOYEE_EXPANDED = window.REPORT_EMPLOYEE_EXPANDED || {};

    window.toggleEmployeeRoasTree = function(stateKey, treeId) {
        window.REPORT_EMPLOYEE_EXPANDED = window.REPORT_EMPLOYEE_EXPANDED || {};

        const nextExpanded = !window.REPORT_EMPLOYEE_EXPANDED[stateKey];
        window.REPORT_EMPLOYEE_EXPANDED[stateKey] = nextExpanded;

        const childRows = document.querySelectorAll(`tr[data-employee-tree="${treeId}"]`);
        childRows.forEach(row => {
            row.style.display = nextExpanded ? 'table-row' : 'none';
        });

        const icon = document.getElementById(`${treeId}-icon`);
        if (icon) icon.textContent = nextExpanded ? '▼' : '▶';

        const hint = document.getElementById(`${treeId}-hint`);
        if (hint) hint.textContent = `Bấm để ${nextExpanded ? 'thu gọn' : 'xem'} ${childRows.length} bài quảng cáo`;

        const parentRow = document.getElementById(`${treeId}-parent`);
        if (parentRow) {
            parentRow.classList.toggle('expanded', nextExpanded);
            parentRow.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
        }
    };

    // BỘ LỌC HIỂN THỊ TAB 4 - ĐẶT TRỰC TIẾP TRONG TỪNG BẢNG DỮ LIỆU
    window.REPORT_TABLE_FILTERS = window.REPORT_TABLE_FILTERS || {};
    if (!window.REPORT_TABLE_FILTERS.campaignCompany) window.REPORT_TABLE_FILTERS.campaignCompany = 'all';
    if (!window.REPORT_TABLE_FILTERS.employeeRoasCompany) window.REPORT_TABLE_FILTERS.employeeRoasCompany = 'all';

    window.changeReportTableFilter = function(key, value) {
        window.REPORT_TABLE_FILTERS = window.REPORT_TABLE_FILTERS || {};
        window.REPORT_TABLE_FILTERS[key] = value;
        window.renderReportPreview();
    };
    window.clearReportTableFilters = function(scope) {
        window.REPORT_TABLE_FILTERS = window.REPORT_TABLE_FILTERS || {};
        if (scope === 'campaign') {
            window.REPORT_TABLE_FILTERS.campaignCompany = 'all';
        } else if (scope === 'employeeRoas') {
            window.REPORT_TABLE_FILTERS.employeeRoasCompany = 'all';
        } else {
            window.REPORT_TABLE_FILTERS = {
                campaignCompany: 'all',
                employeeRoasCompany: 'all'
            };
        }
        window.renderReportPreview();
    };

    const reportFilters = window.REPORT_TABLE_FILTERS;
    const availableCampaignCompanies = Array.from(new Set(campList.map(c => c.comp))).filter(Boolean).sort();
    const availableEmployeeRoasCompanies = Array.from(new Set(employeeRoasRows.map(e => e.comp))).filter(Boolean).sort();

    if (reportFilters.campaignCompany !== 'all' && !availableCampaignCompanies.includes(reportFilters.campaignCompany)) reportFilters.campaignCompany = 'all';
    if (reportFilters.employeeRoasCompany !== 'all' && !availableEmployeeRoasCompanies.includes(reportFilters.employeeRoasCompany)) reportFilters.employeeRoasCompany = 'all';

    const optionHtml = (value, label, selected) => `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    const campaignCompanyOptions = [optionHtml('all', 'Tất cả công ty', reportFilters.campaignCompany === 'all')]
        .concat(availableCampaignCompanies.map(c => optionHtml(c, c, reportFilters.campaignCompany === c))).join('');
    const employeeRoasCompanyOptions = [optionHtml('all', 'Tất cả công ty', reportFilters.employeeRoasCompany === 'all')]
        .concat(availableEmployeeRoasCompanies.map(c => optionHtml(c, c, reportFilters.employeeRoasCompany === c))).join('');

    const tableFilterSelectStyle = "width:100%; max-width:170px; padding:6px 9px; border:1px solid #d7deea; border-radius:8px; font-family:'Segoe UI',Tahoma,Arial,sans-serif; font-size:11px; font-weight:700; color:#24324a; background:#fff; outline:none; cursor:pointer;";
    const tableClearButtonStyle = "padding:7px 12px; border:none; border-radius:8px; background:#fce8e6; color:#d93025; font-family:'Segoe UI',Tahoma,Arial,sans-serif; font-size:10px; font-weight:700; cursor:pointer; letter-spacing:0;";

    window.REPORT_CAMPAIGN_SORT = window.REPORT_CAMPAIGN_SORT || REPORT_CAMPAIGN_SORT || { key: 'roas', dir: 'desc' };
    if (!window.REPORT_CAMPAIGN_SORT.key || window.REPORT_CAMPAIGN_SORT.key === 'default') {
        window.REPORT_CAMPAIGN_SORT = { key: 'roas', dir: 'desc' };
    }
    REPORT_CAMPAIGN_SORT = window.REPORT_CAMPAIGN_SORT;

    window.sortReportCampaign = function(key) {
        window.REPORT_CAMPAIGN_SORT = window.REPORT_CAMPAIGN_SORT || { key: 'roas', dir: 'desc' };

        if (window.REPORT_CAMPAIGN_SORT.key === key) {
            window.REPORT_CAMPAIGN_SORT.dir = window.REPORT_CAMPAIGN_SORT.dir === 'asc' ? 'desc' : 'asc';
        } else {
            window.REPORT_CAMPAIGN_SORT.key = key;
            window.REPORT_CAMPAIGN_SORT.dir = ['budget', 'cost', 'rev', 'cr', 'cpa', 'ctr', 'freq', 'roas'].includes(key) ? 'desc' : 'asc';
        }

        REPORT_CAMPAIGN_SORT = window.REPORT_CAMPAIGN_SORT;
        window.renderReportPreview();
    };

    const campaignSort = window.REPORT_CAMPAIGN_SORT;
    const numericCampaignKeys = new Set(['budget', 'cost', 'rev', 'cr', 'cpa', 'ctr', 'freq', 'roas']);

    const getCampaignSortValue = (row, key) => {
        if (key === 'comp') return row.comp || '';
        if (key === 'name') return row.name || '';
        if (key === 'budget') return row.budget || 0;
        if (key === 'cost') return row.cost || 0;
        if (key === 'rev') return row.rev || 0;
        if (key === 'cr') return row.cr || 0;
        if (key === 'cpa') return row.cpa || 0;
        if (key === 'ctr') return row.ctr || 0;
        if (key === 'freq') return row.freq || 0;
        if (key === 'roas') return row.roas || 0;
        return '';
    };

    const compareCampaignRows = (a, b) => {
        const key = campaignSort?.key || 'roas';
        const av = getCampaignSortValue(a, key);
        const bv = getCampaignSortValue(b, key);
        let result = 0;

        if (numericCampaignKeys.has(key)) {
            result = av - bv;
        } else {
            result = av.toString().localeCompare(bv.toString(), 'vi', { sensitivity: 'base' });
        }

        if (result === 0 && key !== 'roas') result = b.roas - a.roas;
        if (result === 0) result = b.cost - a.cost;
        return campaignSort.dir === 'asc' ? result : -result;
    };

    const sortIcon = (key) => {
        if (!campaignSort || campaignSort.key !== key) return '<span class="report-sort-icon">↕</span>';
        return `<span class="report-sort-icon">${campaignSort.dir === 'asc' ? '▲' : '▼'}</span>`;
    };

    const sortTh = (label, key, align = 'center', width = '') => {
        const widthStyle = width ? `width:${width};` : '';
        return `<th class="report-sort-th" onclick="window.sortReportCampaign('${key}')" style="text-align:${align}; ${widthStyle}">${label}${sortIcon(key)}</th>`;
    };

    // SẮP XẾP BẢNG ROAS THEO CHIẾN DỊCH / NHÂN SỰ
    window.REPORT_EMPLOYEE_ROAS_SORT = window.REPORT_EMPLOYEE_ROAS_SORT || REPORT_EMPLOYEE_ROAS_SORT || { key: 'roas', dir: 'desc' };
    REPORT_EMPLOYEE_ROAS_SORT = window.REPORT_EMPLOYEE_ROAS_SORT;

    window.sortReportEmployeeRoas = function(key) {
        window.REPORT_EMPLOYEE_ROAS_SORT = window.REPORT_EMPLOYEE_ROAS_SORT || { key: 'roas', dir: 'desc' };

        if (window.REPORT_EMPLOYEE_ROAS_SORT.key === key) {
            window.REPORT_EMPLOYEE_ROAS_SORT.dir = window.REPORT_EMPLOYEE_ROAS_SORT.dir === 'asc' ? 'desc' : 'asc';
        } else {
            window.REPORT_EMPLOYEE_ROAS_SORT.key = key;
            // Cột số mặc định xếp cao xuống thấp; cột chữ mặc định A → Z.
            window.REPORT_EMPLOYEE_ROAS_SORT.dir = ['budget', 'spend', 'cost', 'rev', 'roas'].includes(key) ? 'desc' : 'asc';
        }

        REPORT_EMPLOYEE_ROAS_SORT = window.REPORT_EMPLOYEE_ROAS_SORT;
        window.renderReportPreview();
    };

    const employeeRoasSort = window.REPORT_EMPLOYEE_ROAS_SORT;
    const employeeRoasNumericKeys = new Set(['budget', 'spend', 'cost', 'rev', 'roas']);

    const getEmployeeRoasSortValue = (row, key) => {
        if (key === 'comp') return row.comp || '';
        if (key === 'emp') return row.emp || '';
        if (key === 'budget') return row.budget || 0;
        if (key === 'spend') return row.spend || 0;
        if (key === 'cost') return row.cost || 0;
        if (key === 'rev') return row.rev || 0;
        if (key === 'roas') return row.roas || 0;
        return '';
    };

    const compareEmployeeRoasRows = (a, b) => {
        const key = employeeRoasSort?.key || 'roas';
        const av = getEmployeeRoasSortValue(a, key);
        const bv = getEmployeeRoasSortValue(b, key);
        let result = 0;

        if (employeeRoasNumericKeys.has(key)) {
            result = av - bv;
        } else {
            result = av.toString().localeCompare(bv.toString(), 'vi', { sensitivity: 'base', numeric: true });
        }

        // Nếu bằng nhau thì ưu tiên ROAS và doanh thu cao hơn để thứ tự luôn ổn định.
        if (result === 0 && key !== 'roas') result = b.roas - a.roas;
        if (result === 0 && key !== 'rev') result = b.rev - a.rev;
        if (result === 0) result = (a.emp || '').localeCompare(b.emp || '', 'vi', { sensitivity: 'base', numeric: true });

        return employeeRoasSort.dir === 'asc' ? result : -result;
    };

    const employeeRoasSortIcon = key => {
        if (!employeeRoasSort || employeeRoasSort.key !== key) return '↕';
        return employeeRoasSort.dir === 'asc' ? '▲' : '▼';
    };

    const employeeRoasSortTh = (label, key, align = 'center', width = '') => {
        const widthStyle = width ? `width:${width};` : '';
        const activeClass = employeeRoasSort?.key === key ? ' active-sort' : '';
        const justify = align === 'left' ? 'flex-start' : (align === 'right' ? 'flex-end' : 'center');

        return `<th class="employee-roas-sort-th${activeClass}" onclick="window.sortReportEmployeeRoas('${key}')" style="text-align:${align}; ${widthStyle}">
            <span class="employee-roas-sort-head" style="justify-content:${justify}; width:100%;">
                <span>${label}</span>
                <span class="employee-roas-sort-control" title="Sắp xếp tăng/giảm">${employeeRoasSortIcon(key)}</span>
            </span>
        </th>`;
    };

    const filteredEmployeeRoasRows = employeeRoasRows
        .filter(e => reportFilters.employeeRoasCompany === 'all' || e.comp === reportFilters.employeeRoasCompany)
        .sort(compareEmployeeRoasRows);

    html += `<h4 style="margin:30px 0 6px; color:#1a73e8; font-size:15px; font-weight:bold; text-transform:uppercase; border-left:4px solid #1a73e8; padding-left:8px;">2. ROAS tổng theo Chiến dịch / Nhân sự</h4>
             <div style="font-size:11px; color:#5f6368; margin:0 0 10px 12px;">ROAS được tính bằng <b>Tổng doanh thu ÷ Tổng chi phí đã gồm VAT và phí chênh lệch</b> của từng người. Cột <b>Ngân sách</b> được tính riêng theo đúng cấp chiến dịch: các nhóm quảng cáo trùng được gom trước; mỗi nhóm sau gom lấy ngân sách hiệu lực, rồi mới cộng thành tổng ngân sách của chiến dịch/nhân sự. <b>Bấm vào hàng để xem số liệu từng bài; bấm nút ▲/▼ trên tiêu đề cột để sắp xếp.</b></div>
             <table class="ads-table" style="margin-bottom:20px; width:100%;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        ${employeeRoasSortTh('Công ty', 'comp', 'center', '90px')}
                        ${employeeRoasSortTh('Chiến dịch / Nhân sự', 'emp', 'left')}
                        ${employeeRoasSortTh('Ngân sách', 'budget', 'right')}
                        ${employeeRoasSortTh('Chi phí Ads gốc', 'spend', 'right')}
                        ${employeeRoasSortTh('Tổng chi', 'cost', 'right')}
                        ${employeeRoasSortTh('Doanh thu', 'rev', 'right')}
                        ${employeeRoasSortTh('ROAS tổng', 'roas', 'center')}
                    </tr>
                    <tr style="background:#fff;">
                        <th style="text-align:center;">
                            <select class="report-table-filter-select" onclick="event.stopPropagation()" onchange="window.changeReportTableFilter('employeeRoasCompany', this.value)">${employeeRoasCompanyOptions}</select>
                        </th>
                        <th colspan="6" style="text-align:left;">
                            <button class="report-table-clear-btn" onclick="event.stopPropagation(); window.clearReportTableFilters('employeeRoas')">XÓA LỌC CÔNG TY</button>
                        </th>
                    </tr>
                </thead>
                <tbody>`;

    if (filteredEmployeeRoasRows.length === 0) {
        html += `<tr><td colspan="7" style="text-align:center; color:#999; font-style:italic; padding:14px;">Không có dữ liệu ROAS chiến dịch phù hợp với công ty đã chọn.</td></tr>`;
    } else {
        filteredEmployeeRoasRows.forEach((e, employeeIndex) => {
            const roasColor = e.roas >= 7 ? '#137333' : (e.roas >= 3 ? '#b06000' : '#d93025');
            const roasBg = e.roas >= 7 ? '#e6f4ea' : (e.roas >= 3 ? '#fef7e0' : '#fce8e6');
            const stateKey = encodeURIComponent(`${e.comp}||${e.emp}`).replace(/'/g, '%27');
            const treeId = `employee-roas-tree-${employeeIndex}`;
            const isExpanded = !!window.REPORT_EMPLOYEE_EXPANDED[stateKey];

            const employeeAds = campList
                .filter(ad => ad.comp === e.comp && ad.emp === e.emp)
                .sort((a, b) => {
                    const key = employeeRoasSort?.key || 'spend';
                    let result = 0;

                    if (key === 'emp' || key === 'comp') {
                        result = (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base', numeric: true });
                    } else if (key === 'budget') {
                        result = (a.budget || 0) - (b.budget || 0);
                    } else if (key === 'spend') {
                        result = (a.spend || 0) - (b.spend || 0);
                    } else if (key === 'cost') {
                        result = (a.cost || 0) - (b.cost || 0);
                    } else if (key === 'rev') {
                        result = (a.rev || 0) - (b.rev || 0);
                    } else if (key === 'roas') {
                        result = (a.roas || 0) - (b.roas || 0);
                    } else {
                        // Số nhóm Ads là chỉ số cấp nhân sự; bài con mặc định xếp theo chi phí.
                        result = (a.spend || 0) - (b.spend || 0);
                    }

                    if (result === 0) result = (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base', numeric: true });
                    return employeeRoasSort.dir === 'asc' ? result : -result;
                });

            html += `<tr id="${treeId}-parent"
                         class="employee-roas-parent-row${isExpanded ? ' expanded' : ''}"
                         aria-expanded="${isExpanded ? 'true' : 'false'}"
                         onclick="window.toggleEmployeeRoasTree('${stateKey}', '${treeId}')">
                <td class="text-center" style="font-weight:700; color:#1a73e8;">${escapeHtml(e.comp)}</td>
                <td style="text-align:left; color:#24324a;">
                    <div style="display:flex; align-items:center; gap:8px; font-weight:700;">
                        <span id="${treeId}-icon" class="employee-roas-tree-toggle">${isExpanded ? '▼' : '▶'}</span>
                        <span>${escapeHtml(e.emp)}</span>
                    </div>
                    <div id="${treeId}-hint" style="font-size:9px; color:#7a879b; margin:4px 0 0 28px; font-weight:600;">Bấm để ${isExpanded ? 'thu gọn' : 'xem'} ${employeeAds.length} bài quảng cáo</div>
                </td>
                <td class="text-right" style="font-weight:700; color:#5f6368;">${typeof e.budgetDisplay === 'number' ? fm(e.budgetDisplay) + 'đ' : escapeHtml(e.budgetDisplay || '-')}</td>
                <td class="text-right">${fm(e.spend)}đ</td>
                <td class="text-right" style="font-weight:700;">${fm(e.cost)}đ</td>
                <td class="text-right" style="font-weight:700; color:#137333;">${fm(e.rev)}đ</td>
                <td class="text-center">
                    <span style="display:inline-flex; min-width:62px; justify-content:center; padding:4px 10px; border-radius:999px; background:${roasBg}; color:${roasColor}; font-weight:700; font-size:13px;">${fmN(e.roas)}x</span>
                </td>
            </tr>`;

            employeeAds.forEach((ad, adIndex) => {
                const isLastChild = adIndex === employeeAds.length - 1;
                const branch = isLastChild ? '└──' : '├──';
                const childRoasColor = ad.roas >= 7 ? '#137333' : (ad.roas >= 3 ? '#b06000' : '#d93025');
                const childRoasBg = ad.roas >= 7 ? '#e6f4ea' : (ad.roas >= 3 ? '#fef7e0' : '#fce8e6');
                const statusColor = ad.status === 'Đang chạy' ? '#137333' : '#7a879b';
                const dateRange = [ad.runStart, ad.runEnd].filter(Boolean).join(' → ');

                html += `<tr class="employee-roas-child-row"
                             data-employee-tree="${treeId}"
                             style="display:${isExpanded ? 'table-row' : 'none'};">
                    <td class="text-center" style="color:#8aa4c8; font-size:12px; font-weight:700;">↳</td>
                    <td style="text-align:left; padding-left:18px;">
                        <div style="display:flex; align-items:flex-start;">
                            <span class="employee-roas-tree-branch">${branch}</span>
                            <div>
                                <div class="employee-roas-child-name"><span class="employee-roas-child-name-label">Bài quảng cáo</span>${escapeHtml(ad.name)}</div>
                                <div class="employee-roas-child-meta">
                                    <span>📦 SKU: <b>${escapeHtml(ad.sku || '-')}</b></span>
                                    <span>💬 Tin/Mua: <b>${fm(ad.msgs)}/${fm(ad.leads)}</b></span>
                                    <span>🎯 CPA: <b>${fm(ad.cpa)}đ</b></span>
                                    <span>📈 CTR: <b>${fmP(ad.ctr)}</b></span>
                                    <span>🔁 Tần suất: <b>${fmN(ad.freq)}</b></span>
                                    <span style="color:${statusColor};">● ${escapeHtml(ad.status || 'Chưa xác định')}</span>
                                    ${dateRange ? `<span>🗓️ ${escapeHtml(dateRange)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="text-right" style="font-size:10px; color:#5f6368; font-weight:700;">
                        ${typeof ad.budgetDisplay === 'number' ? fm(ad.budgetDisplay) + 'đ' : escapeHtml(ad.budgetDisplay || '-')}
                    </td>
                    <td class="text-right">${fm(ad.spend)}đ</td>
                    <td class="text-right" style="font-weight:700;">${fm(ad.cost)}đ</td>
                    <td class="text-right" style="font-weight:700; color:#137333;">${fm(ad.rev)}đ</td>
                    <td class="text-center">
                        <span style="display:inline-flex; min-width:56px; justify-content:center; padding:3px 8px; border-radius:999px; background:${childRoasBg}; color:${childRoasColor}; font-weight:700; font-size:11px;">${fmN(ad.roas)}x</span>
                    </td>
                </tr>`;
            });
        });
    }

    html += `</tbody></table>`;

    let filteredCampaignRows = campList
        .filter(c => reportFilters.campaignCompany === 'all' || c.comp === reportFilters.campaignCompany)
        .sort(compareCampaignRows);

    html += `<h4 style="margin:30px 0 6px; color:#1a73e8; font-size:15px; font-weight:bold; text-transform:uppercase; border-left:4px solid #1a73e8; padding-left:8px;">3. Campaign Nổi bật / Cần cắt bỏ theo Công ty</h4>
             <div style="font-size:11px; color:#5f6368; margin:0 0 10px 12px; font-style:italic;">Hiển thị toàn bộ bài quảng cáo trong kỳ. Cột Tổng chi đã gồm chi phí Ads, VAT 10% và phí chênh lệch; đây cũng là số dùng để tính ROAS. Mặc định ROAS được sắp xếp từ cao xuống thấp; bấm tiêu đề cột để thay đổi.</div>
             <table class="ads-table" style="margin-bottom:20px; width:100%;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        ${sortTh('Công ty', 'comp', 'center', '90px')}
                        ${sortTh('Tên chiến dịch', 'name', 'left')}
                        ${sortTh('Ngân sách', 'budget', 'right')}
                        ${sortTh('Tổng chi', 'cost', 'right')}
                        ${sortTh('Doanh thu', 'rev', 'right')}
                        ${sortTh('Mua/Tin', 'cr', 'center')}
                        ${sortTh('CPA', 'cpa', 'right')}
                        ${sortTh('CTR', 'ctr', 'center')}
                        ${sortTh('Tần suất', 'freq', 'center')}
                        ${sortTh('ROAS', 'roas', 'center')}
                    </tr>
                    <tr style="background:#fff;">
                        <th style="text-align:center;"><select style="${tableFilterSelectStyle}" onchange="window.changeReportTableFilter('campaignCompany', this.value)">${campaignCompanyOptions}</select></th>
                        <th colspan="9" style="text-align:left;"><button onclick="window.clearReportTableFilters('campaign')" style="${tableClearButtonStyle}">XÓA LỌC CÔNG TY</button></th>
                    </tr>
                </thead><tbody>`;

    if (filteredCampaignRows.length === 0) {
        html += `<tr><td colspan="10" style="text-align:center; color:#999; font-style:italic; padding:14px;">Không có campaign phù hợp với bộ lọc hiện tại.</td></tr>`;
    } else {
        filteredCampaignRows.forEach(c => {
            const campaignBudgetDisplay = typeof c.budgetDisplay === 'number'
                ? `${fm(c.budgetDisplay)}đ`
                : escapeHtml(c.budgetDisplay || '-');
            const campaignRoasColor = c.roas >= 8 ? '#137333' : (c.roas >= 4 ? '#b06000' : '#d93025');
            const campaignRoasBg = c.roas >= 8 ? '#e6f4ea' : (c.roas >= 4 ? '#fef7e0' : '#fce8e6');

            html += `<tr>
                <td class="text-center" style="font-weight:bold; color:#1a73e8;">${escapeHtml(c.comp)}</td>
                <td style="text-align:left;"><div style="font-weight:600; color:#333;">${escapeHtml(c.name)}</div><div style="font-size:11px; color:#666; margin-top:3px;">Nhân sự: <b>${escapeHtml(c.emp)}</b></div></td>
                <td class="text-right" style="font-weight:700; color:#5f6368;">${campaignBudgetDisplay}</td>
                <td class="text-right" style="font-weight:bold; color:#d93025;">${fm(c.cost)}đ</td>
                <td class="text-right" style="font-weight:700; color:#137333;">${fm(c.rev)}đ</td>
                <td class="text-center">${fmP(c.cr)}</td>
                <td class="text-right" style="font-weight:bold;">${fm(c.cpa)}đ</td>
                <td class="text-center">${fmP(c.ctr)}</td>
                <td class="text-center">${fmN(c.freq)}</td>
                <td class="text-center" style="background:${campaignRoasBg}; border-left:2px solid ${campaignRoasColor}; border-right:2px solid ${campaignRoasColor};">
                    <span style="display:inline-flex; min-width:62px; justify-content:center; padding:4px 10px; border-radius:999px; color:${campaignRoasColor}; font-weight:800; font-size:14px;">${c.revenueReady ? fmN(c.roas) : '-'}</span>
                </td>
            </tr>`;
        });
    }
    html += `</tbody></table>`;

    // 4. HIỆU SUẤT THEO NHÂN VIÊN

    let empList = employeeRoasRows.map(d => ({ ...d }));

    

    const statusGroups = {
        'Từ 1:8 trở lên': [],
        'Từ 1:4 đến dưới 1:8': [],
        'Dưới 1:4': []
    };

    empList.forEach(e => statusGroups[e.status].push(e));



    html += `<h4 style="margin:30px 0 10px; color:#1a73e8; font-size:15px; font-weight:bold; text-transform:uppercase; border-left:4px solid #1a73e8; padding-left:8px;">4. Đánh giá Năng lực Nhân sự</h4>

             <table class="ads-table" style="width:100%; border-collapse:collapse;">

                <thead><tr style="background:#f8f9fa;">

                    <th style="text-align:center; width:145px;">Phân loại</th><th style="text-align:center;">Công ty</th><th style="text-align:left;">Tên Nhân sự</th><th style="text-align:center;">Camp</th>

                    <th style="text-align:center;">CTR</th><th style="text-align:center;">Tin</th><th style="text-align:center;">Mua</th><th style="text-align:center;">Mua/Tin</th>

                    <th style="text-align:right;">Tổng chi</th><th style="text-align:right;">Doanh thu</th>

                    <th style="text-align:center; background:#163b65; color:#fff; border-left:2px solid #0d47a1; border-right:2px solid #0d47a1; font-size:12px;">ROAS</th>

                </tr></thead><tbody>`;

    

    ['Từ 1:8 trở lên', 'Từ 1:4 đến dưới 1:8', 'Dưới 1:4'].forEach(status => {

        let group = statusGroups[status].sort((a,b) => b.roas - a.roas || b.rev - a.rev);

        if(group.length === 0) return;

        

        let color = status === 'Từ 1:8 trở lên' ? '#137333' : (status === 'Từ 1:4 đến dưới 1:8' ? '#b06000' : '#d93025');

        let bgStatus = status === 'Từ 1:8 trở lên' ? '#e6f4ea' : (status === 'Từ 1:4 đến dưới 1:8' ? '#fef7e0' : '#fce8e6');

        

        group.forEach((e, idx) => {

            html += `<tr>

                ${idx===0 ? `<td rowspan="${group.length}" style="color:${color}; font-weight:800; text-align:center; vertical-align:middle; background:${bgStatus}; border-right:1px solid #ddd; padding:10px 8px;">${status}</td>` : ''}

                <td class="text-center" style="font-weight:bold;">${escapeHtml(e.comp)}</td>

                <td style="text-align:left; font-weight:bold; color:#333;">${escapeHtml(e.emp)}</td>
                <td class="text-center">${e.camps}</td>
                <td class="text-center">${fmP(e.ctr)}</td>
                <td class="text-center">${fm(e.msgs)}</td>
                <td class="text-center">${fm(e.leads)}</td>
                <td class="text-center" style="font-weight:bold;">${fmP(e.cr)}</td>
                <td class="text-right">${fm(e.cost)}đ</td>
                <td class="text-right" style="font-weight:700; color:#137333;">${fm(e.rev)}đ</td>
                <td class="text-center" style="background:${bgStatus}; border-left:2px solid ${color}; border-right:2px solid ${color}; padding:7px 6px;">
                    <span style="display:inline-flex; min-width:72px; justify-content:center; padding:5px 12px; border-radius:999px; background:#fff; color:${color}; font-weight:900; font-size:15px; box-shadow:0 1px 4px rgba(0,0,0,.08);">${fmN(e.roas)}</span>
                </td>

            </tr>`;

        });

    });

    html += `</tbody></table>

        </div>`; 



    container.innerHTML = html;

}



// =========================================================
// V156 — XUẤT BÁO CÁO MKT SẠCH, KHÔNG KÈM BÀI CON Ở SHEET ROAS TỔNG
// - Không xuất nút, select, input, dòng bộ lọc, icon hoặc ký tự sắp xếp.
// - Mỗi bảng là một sheet có tiêu đề, kỳ báo cáo và thời điểm xuất.
// - Thêm sheet Tổng quan để file dễ gửi, dễ in và dễ kiểm tra.
// =========================================================
function cleanReportExportText(value) {
    return String(value || '')
        .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ')
        .replace(/[↕▲▼▶◀↳└├─⌕⇩◷×●◫◎▤]/g, ' ')
        .replace(/\s*→\s*/g, ' đến ')
        .replace(/\s*\|\s*\|+/g, ' | ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getCleanReportCellText(cell) {
    const clone = cell.cloneNode(true);

    clone.querySelectorAll('script, style, svg, canvas, input, select, textarea').forEach(node => node.remove());
    clone.querySelectorAll(
        '.report-sort-icon, .employee-roas-sort-control, .employee-roas-tree-toggle, ' +
        '.employee-roas-tree-branch, [id$="-hint"], [aria-hidden="true"]'
    ).forEach(node => node.remove());

    // Các nút còn sót chỉ là điều khiển giao diện, không phải dữ liệu báo cáo.
    clone.querySelectorAll('button').forEach(node => node.remove());
    clone.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode(' ')));

    // Giữ các thông tin phụ trong dòng bài quảng cáo nhưng phân cách rõ ràng.
    clone.querySelectorAll('.employee-roas-child-meta > span').forEach((node, index, list) => {
        if (index < list.length - 1) node.appendChild(document.createTextNode(' | '));
    });

    return cleanReportExportText(clone.textContent || '');
}

function buildCleanReportTable(sourceTable, options = {}) {
    const cleanTable = sourceTable.cloneNode(true);

    if (options.excludeEmployeeChildRows) {
        cleanTable.querySelectorAll('.employee-roas-child-row, tr[data-employee-tree]').forEach(row => row.remove());
    }

    Array.from(cleanTable.querySelectorAll('tr')).forEach(row => {
        // Dòng có bộ lọc hoặc nút xóa lọc chỉ phục vụ thao tác trên giao diện.
        if (row.querySelector('select, input, textarea, .report-table-clear-btn')) {
            row.remove();
            return;
        }

        const rowText = cleanReportExportText(row.textContent || '');
        if (/^XÓA LỌC/i.test(rowText) || /XÓA LỌC BẢNG/i.test(rowText)) {
            row.remove();
            return;
        }

        Array.from(row.cells || []).forEach(cell => {
            const value = getCleanReportCellText(cell);
            cell.removeAttribute('onclick');
            cell.removeAttribute('title');
            cell.removeAttribute('style');
            cell.className = '';
            cell.textContent = value;
        });

        row.removeAttribute('onclick');
        row.removeAttribute('style');
        row.className = '';
    });

    cleanTable.removeAttribute('style');
    cleanTable.className = '';
    return cleanTable;
}

function getReportTableHeading(table, index) {
    let headingEl = table.previousElementSibling;
    while (headingEl && headingEl.tagName !== 'H4') {
        headingEl = headingEl.previousElementSibling;
    }
    return cleanReportExportText(
        headingEl && headingEl.textContent ? headingEl.textContent : `Phần ${index + 1}`
    ).replace(/^\d+\.\s*/, '');
}

function countReportTableColumns(table) {
    let maxColumns = 1;
    Array.from(table.rows || []).forEach(row => {
        const count = Array.from(row.cells || []).reduce((sum, cell) => sum + Math.max(1, Number(cell.colSpan || 1)), 0);
        if (count > maxColumns) maxColumns = count;
    });
    return maxColumns;
}

function getReportExportColumnWidths(table, columnCount) {
    const widths = Array.from({ length: columnCount }, () => 12);

    Array.from(table.rows || []).forEach(row => {
        let columnIndex = 0;
        Array.from(row.cells || []).forEach(cell => {
            const span = Math.max(1, Number(cell.colSpan || 1));
            const textLength = cleanReportExportText(cell.textContent || '').length;
            if (span === 1 && columnIndex < widths.length) {
                widths[columnIndex] = Math.max(widths[columnIndex], Math.min(42, textLength + 3));
            }
            columnIndex += span;
        });
    });

    return widths.map(width => ({ wch: Math.max(10, Math.min(42, width)) }));
}

function styleReportExportSheet(ws, columnCount, headerRowIndex, table) {
    if (!ws || !ws['!ref']) return;

    const range = XLSX.utils.decode_range(ws['!ref']);
    const lastColumnName = XLSX.utils.encode_col(Math.max(0, columnCount - 1));
    const roasColumnIndexes = [];
    for (let col = 0; col < columnCount; col += 1) {
        const headerRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
        const headerText = cleanReportExportText(ws[headerRef]?.v || '').toUpperCase();
        if (headerText === 'ROAS' || headerText.includes('ROAS TỔNG')) roasColumnIndexes.push(col);
    }

    ws['!merges'] = ws['!merges'] || [];
    if (columnCount > 1) {
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } });
        ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } });
        ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: columnCount - 1 } });
    }

    ws['!cols'] = getReportExportColumnWidths(table, columnCount);
    ws['!rows'] = ws['!rows'] || [];
    ws['!rows'][0] = { hpt: 28 };
    ws['!rows'][1] = { hpt: 20 };
    ws['!rows'][2] = { hpt: 20 };
    ws['!rows'][headerRowIndex] = { hpt: 26 };

    const titleStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 15 },
        fill: { fgColor: { rgb: '163B65' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const metaStyle = {
        font: { bold: true, color: { rgb: '40566E' }, sz: 10 },
        fill: { fgColor: { rgb: 'EEF4FA' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: 'D7E2EC' } } }
    };
    const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { fgColor: { rgb: '1F6FFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
            top: { style: 'thin', color: { rgb: 'FFFFFF' } },
            bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
            left: { style: 'thin', color: { rgb: 'FFFFFF' } },
            right: { style: 'thin', color: { rgb: 'FFFFFF' } }
        }
    };
    const bodyBorder = {
        top: { style: 'thin', color: { rgb: 'DDE6EF' } },
        bottom: { style: 'thin', color: { rgb: 'DDE6EF' } },
        left: { style: 'thin', color: { rgb: 'DDE6EF' } },
        right: { style: 'thin', color: { rgb: 'DDE6EF' } }
    };

    const titleCell = ws['A1'];
    const periodCell = ws['A2'];
    const exportCell = ws['A3'];
    if (titleCell) titleCell.s = titleStyle;
    if (periodCell) periodCell.s = metaStyle;
    if (exportCell) exportCell.s = metaStyle;

    for (let row = headerRowIndex; row <= range.e.r; row += 1) {
        for (let col = 0; col < columnCount; col += 1) {
            const ref = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[ref]) ws[ref] = { t: 's', v: '' };

            const isRoasColumn = roasColumnIndexes.includes(col);
            if (row === headerRowIndex) {
                ws[ref].s = isRoasColumn ? {
                    ...headerStyle,
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
                    fill: { fgColor: { rgb: '163B65' } },
                    border: {
                        top: { style: 'medium', color: { rgb: '0D47A1' } },
                        bottom: { style: 'medium', color: { rgb: '0D47A1' } },
                        left: { style: 'medium', color: { rgb: '0D47A1' } },
                        right: { style: 'medium', color: { rgb: '0D47A1' } }
                    }
                } : headerStyle;
                continue;
            }

            const textValue = String(ws[ref].v ?? '');
            const isNumberLike = /^-?[\d.,]+(?:\s?(?:đ|%|x))?$/.test(textValue.trim());
            ws[ref].s = isRoasColumn ? {
                font: { bold: true, color: { rgb: '0D47A1' }, sz: 11 },
                fill: { fgColor: { rgb: 'EAF2FF' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: {
                    top: { style: 'thin', color: { rgb: '9DB7D5' } },
                    bottom: { style: 'thin', color: { rgb: '9DB7D5' } },
                    left: { style: 'medium', color: { rgb: '0D47A1' } },
                    right: { style: 'medium', color: { rgb: '0D47A1' } }
                }
            } : {
                font: { color: { rgb: '24384D' }, sz: 10 },
                fill: { fgColor: { rgb: row % 2 === 0 ? 'F7FAFD' : 'FFFFFF' } },
                alignment: {
                    horizontal: isNumberLike ? 'right' : 'left',
                    vertical: 'center',
                    wrapText: true
                },
                border: bodyBorder
            };
        }
    }

    if (range.e.r >= headerRowIndex + 1) {
        ws['!autofilter'] = { ref: `A${headerRowIndex + 1}:${lastColumnName}${range.e.r + 1}` };
    }
}

function buildReportCoverSheet(sections, period, exportedAt) {
    const companySelect = document.getElementById('company-selector');
    const companyLabel = companySelect && companySelect.selectedOptions && companySelect.selectedOptions[0]
        ? companySelect.selectedOptions[0].textContent.trim()
        : CURRENT_COMPANY;

    const rows = [
        ['BÁO CÁO TỔNG HỢP MARKETING'],
        [`Công ty đang chọn: ${companyLabel}`],
        [`Kỳ dữ liệu: ${formatMetaLiveCompactDate(period.from)} đến ${formatMetaLiveCompactDate(period.to)}`],
        [`Thời điểm xuất: ${exportedAt}`],
        [],
        ['STT', 'Nội dung báo cáo', 'Tên sheet', 'Số dòng dữ liệu']
    ];

    sections.forEach((section, index) => {
        rows.push([index + 1, section.heading, section.sheetName, section.rowCount]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }
    ];
    ws['!cols'] = [{ wch: 8 }, { wch: 42 }, { wch: 30 }, { wch: 18 }];
    ws['!rows'] = [{ hpt: 34 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, {}, { hpt: 25 }];

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = 0; row <= range.e.r; row += 1) {
        for (let col = 0; col <= 3; col += 1) {
            const ref = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[ref]) ws[ref] = { t: 's', v: '' };

            if (row === 0) {
                ws[ref].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 17 },
                    fill: { fgColor: { rgb: '163B65' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            } else if (row >= 1 && row <= 3) {
                ws[ref].s = {
                    font: { bold: true, color: { rgb: '40566E' }, sz: 10 },
                    fill: { fgColor: { rgb: 'EEF4FA' } },
                    alignment: { horizontal: 'left', vertical: 'center' }
                };
            } else if (row === 5) {
                ws[ref].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
                    fill: { fgColor: { rgb: '1F6FFF' } },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: {
                        top: { style: 'thin', color: { rgb: 'FFFFFF' } },
                        bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
                        left: { style: 'thin', color: { rgb: 'FFFFFF' } },
                        right: { style: 'thin', color: { rgb: 'FFFFFF' } }
                    }
                };
            } else if (row > 5) {
                ws[ref].s = {
                    font: { color: { rgb: '24384D' }, sz: 10 },
                    fill: { fgColor: { rgb: row % 2 === 0 ? 'F7FAFD' : 'FFFFFF' } },
                    alignment: { horizontal: col === 0 || col === 3 ? 'center' : 'left', vertical: 'center', wrapText: true },
                    border: {
                        top: { style: 'thin', color: { rgb: 'DDE6EF' } },
                        bottom: { style: 'thin', color: { rgb: 'DDE6EF' } },
                        left: { style: 'thin', color: { rgb: 'DDE6EF' } },
                        right: { style: 'thin', color: { rgb: 'DDE6EF' } }
                    }
                };
            }
        }
    }

    if (sections.length) ws['!autofilter'] = { ref: `A6:D${6 + sections.length}` };
    return ws;
}

function makeUniqueReportSheetName(rawName, usedNames) {
    const base = cleanReportExportText(rawName)
        .replace(/[\\/?*\[\]:]/g, '')
        .substring(0, 31) || 'Bao cao';
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) {
        const suffixText = ` ${suffix}`;
        name = `${base.substring(0, 31 - suffixText.length)}${suffixText}`;
        suffix += 1;
    }
    usedNames.add(name);
    return name;
}

function exportReportToExcel() {
    if (typeof XLSX === 'undefined') {
        showToast('Thư viện Excel chưa tải xong, vui lòng thử lại.', 'warning');
        return;
    }

    const container = document.getElementById('report-preview-container');
    if (!container) return showToast('Không tìm thấy báo cáo để xuất.', 'error');

    const sourceTables = Array.from(container.querySelectorAll('table'));
    if (!sourceTables.length) return showToast('Chưa có dữ liệu báo cáo để xuất.', 'warning');

    const period = getMetaLivePeriod();
    const now = new Date();
    const exportedAt = new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(now);

    const wb = XLSX.utils.book_new();
    const usedNames = new Set(['Tổng quan']);
    const sections = [];

    sourceTables.forEach((sourceTable, index) => {
        const heading = getReportTableHeading(sourceTable, index);
        const isEmployeeRoasSummary = /ROAS tổng theo Chiến dịch|ROAS tổng theo Chiến dịch \/ Nhân sự/i.test(heading);
        const cleanTable = buildCleanReportTable(sourceTable, {
            excludeEmployeeChildRows: isEmployeeRoasSummary
        });
        if (!cleanTable.rows.length) return;
        const sheetName = makeUniqueReportSheetName(heading, usedNames);
        const columnCount = countReportTableColumns(cleanTable);
        const ws = XLSX.utils.aoa_to_sheet([]);

        XLSX.utils.sheet_add_aoa(ws, [
            [heading.toUpperCase()],
            [`Kỳ dữ liệu: ${formatMetaLiveCompactDate(period.from)} đến ${formatMetaLiveCompactDate(period.to)}`],
            [`Thời điểm xuất: ${exportedAt}`],
            [],
            []
        ], { origin: 'A1' });

        XLSX.utils.sheet_add_dom(ws, cleanTable, { origin: 'A6', raw: true });
        styleReportExportSheet(ws, columnCount, 5, cleanTable);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const bodyRowCount = cleanTable.tBodies && cleanTable.tBodies[0]
            ? cleanTable.tBodies[0].rows.length
            : Math.max(0, cleanTable.rows.length - 1);
        sections.push({ heading, sheetName, rowCount: bodyRowCount });
    });

    if (!sections.length) {
        showToast('Không có bảng dữ liệu hợp lệ để xuất.', 'warning');
        return;
    }

    const coverSheet = buildReportCoverSheet(sections, period, exportedAt);
    // Đưa sheet Tổng quan lên đầu workbook.
    wb.SheetNames.unshift('Tổng quan');
    wb.Sheets['Tổng quan'] = coverSheet;

    const safeFrom = String(period.from || '').replace(/-/g, '.');
    const safeTo = String(period.to || '').replace(/-/g, '.');
    const fileName = `Bao-cao-MKT-${safeFrom}-${safeTo}.xlsx`;

    XLSX.writeFile(wb, fileName);
    showToast('Đã xuất báo cáo MKT sạch và đầy đủ biểu mẫu.', 'success');
}
window.exportReportToExcel = exportReportToExcel;

window.renderReportPreview = renderReportPreview;
window.refreshMetaLiveReport = refreshMetaLiveReport;

window.mapMetaStatus = mapMetaStatus;
window.resolveMetaLiveDisplayStatus = resolveMetaLiveDisplayStatus;

/* =========================================================
   V157 UI LAYOUT — SALES CONSOLE STRUCTURE
   Mục tiêu:
   - Chỉ thay giao diện/bố cục.
   - Không đổi Firebase, Meta Live, ROAS, lọc, upload, export.
   - Sidebar gọn.
   - Full màn hình.
   - KPI phía trên.
   - Desktop: biểu đồ bên trái, bảng dữ liệu bên phải.
   - Giữ nguyên hệ màu hiện tại.
   ========================================================= */

(function installAdsV157SalesConsoleLayout() {
    const STYLE_ID = 'ads-v157-sales-console-layout';

    function ensureOverrideStyleLast() {
        const oldStyle = document.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* ===== 1. FULL WIDTH / FULL SCREEN ===== */
            #page-ads {
                width:100% !important;
                max-width:none !important;
                padding:0 !important;
                margin:0 !important;
                overflow-x:hidden !important;
                background:#f3f6f9 !important;
            }

            #page-ads > .section-box {
                width:100% !important;
                max-width:none !important;
                margin:0 !important;
                padding:0 !important;
                border:0 !important;
                border-radius:0 !important;
                box-shadow:none !important;
                background:transparent !important;
            }

            #page-ads > .section-box > .section-title {
                display:none !important;
            }

            #ads-analysis-result {
                width:100% !important;
                max-width:none !important;
                margin:0 !important;
                border-radius:0 !important;
                box-shadow:none !important;
                background:#f3f6f9 !important;
                overflow:visible !important;
            }

            #ads-analysis-result .ads-enterprise-shell {
                width:100% !important;
                max-width:none !important;
                min-height:100vh !important;
                grid-template-columns:132px minmax(0,1fr) !important;
                align-items:start !important;
                border-radius:0 !important;
                background:#f3f6f9 !important;
            }

            /* ===== 2. SIDEBAR GỌN — ÍT CHỮ ===== */
            #ads-analysis-result .ads-enterprise-sidebar {
                position:sticky !important;
                top:0 !important;
                z-index:80 !important;
                width:132px !important;
                height:100vh !important;
                min-height:100vh !important;
                padding:14px 10px !important;
                border:0 !important;
                border-right:1px solid #dfe6ee !important;
                border-radius:0 !important;
                box-shadow:none !important;
                background:#ffffff !important;
                overflow:hidden !important;
            }

            #ads-analysis-result .ads-sidebar-brand {
                min-height:54px !important;
                justify-content:flex-start !important;
                gap:8px !important;
                padding:0 34px 12px 2px !important;
                margin-bottom:8px !important;
                border-bottom:1px solid #edf1f5 !important;
            }

            #ads-analysis-result .ads-sidebar-logo {
                width:34px !important;
                height:34px !important;
                min-width:34px !important;
                border-radius:10px !important;
                font-size:15px !important;
            }

            #ads-analysis-result .ads-sidebar-brand > div:last-child {
                display:none !important;
            }

            #ads-analysis-result .ads-sidebar-section-label,
            #ads-analysis-result .ads-sidebar-activity {
                display:none !important;
            }

            #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                display:flex !important;
                flex-direction:column !important;
                gap:5px !important;
                width:100% !important;
                margin:0 !important;
                overflow:visible !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                width:100% !important;
                min-height:46px !important;
                padding:7px 8px !important;
                border-radius:10px !important;
                display:flex !important;
                flex-direction:row !important;
                align-items:center !important;
                justify-content:flex-start !important;
                gap:8px !important;
                text-align:left !important;
                white-space:nowrap !important;
            }

            #ads-analysis-result .ads-sidebar-nav .ads-tab-btn::before {
                left:-10px !important;
                top:9px !important;
                bottom:9px !important;
                width:3px !important;
            }

            #ads-analysis-result .ads-nav-icon {
                width:28px !important;
                height:28px !important;
                flex:0 0 28px !important;
                border-radius:8px !important;
                font-size:13px !important;
            }

            #ads-analysis-result .ads-nav-copy {
                min-width:0 !important;
                display:block !important;
            }

            #ads-analysis-result .ads-nav-copy b {
                font-size:10.5px !important;
                line-height:1.15 !important;
                overflow:hidden !important;
                text-overflow:ellipsis !important;
                white-space:nowrap !important;
            }

            #ads-analysis-result .ads-nav-copy small {
                display:none !important;
            }

            #ads-analysis-result .ads-sidebar-help {
                margin-top:auto !important;
                min-height:42px !important;
                padding:9px !important;
                justify-content:center !important;
                border-radius:10px !important;
            }

            #ads-analysis-result .ads-sidebar-help div {
                display:none !important;
            }

            #ads-analysis-result .ads-sidebar-toggle {
                top:14px !important;
                right:8px !important;
                width:28px !important;
                height:28px !important;
                border-radius:8px !important;
                font-size:18px !important;
            }

            #ads-analysis-result .ads-enterprise-shell.sidebar-collapsed {
                grid-template-columns:68px minmax(0,1fr) !important;
            }

            #ads-analysis-result .sidebar-collapsed .ads-enterprise-sidebar {
                width:68px !important;
                padding-left:8px !important;
                padding-right:8px !important;
            }

            #ads-analysis-result .sidebar-collapsed .ads-sidebar-brand {
                justify-content:center !important;
                padding:38px 0 12px !important;
            }

            #ads-analysis-result .sidebar-collapsed .ads-sidebar-nav .ads-tab-btn {
                justify-content:center !important;
                padding:7px !important;
            }

            #ads-analysis-result .sidebar-collapsed .ads-nav-copy {
                display:none !important;
            }

            /* ===== 3. MAIN WORKSPACE ===== */
            #ads-analysis-result .ads-enterprise-main {
                width:100% !important;
                max-width:none !important;
                min-width:0 !important;
                padding:14px 16px 18px !important;
                gap:11px !important;
                background:#f3f6f9 !important;
            }

            /* ===== 4. HEADER GỌN ===== */
            #ads-analysis-result .ads-enterprise-topbar {
                min-height:38px !important;
                margin:0 !important;
                display:flex !important;
                align-items:center !important;
                justify-content:space-between !important;
                gap:12px !important;
            }

            #ads-analysis-result .ads-page-breadcrumb,
            #ads-analysis-result .ads-page-heading p {
                display:none !important;
            }

            #ads-analysis-result .ads-page-heading h1 {
                margin:0 !important;
                font-size:20px !important;
                line-height:1.15 !important;
                letter-spacing:-.25px !important;
            }

            #ads-analysis-result .ads-topbar-status {
                min-height:30px !important;
                padding:6px 10px !important;
                font-size:9.5px !important;
            }

            /* ===== 5. FILTER BAR — MỘT HÀNG, GỌN ===== */
            #ads-analysis-result .ads-command-bar {
                width:100% !important;
                padding:10px !important;
                gap:8px !important;
                display:grid !important;
                grid-template-columns:
                    minmax(135px,1fr)
                    minmax(135px,1fr)
                    minmax(145px,1.05fr)
                    minmax(140px,.95fr)
                    minmax(138px,.95fr)
                    18px
                    minmax(138px,.95fr)
                    auto !important;
                align-items:end !important;
                border-radius:12px !important;
                box-shadow:0 4px 14px rgba(22,48,73,.05) !important;
            }

            #ads-analysis-result .ads-command-separator {
                display:none !important;
            }

            #ads-analysis-result .ads-command-item {
                gap:4px !important;
            }

            #ads-analysis-result .ads-command-item label {
                font-size:8.5px !important;
                letter-spacing:.35px !important;
            }

            #ads-analysis-result .company-select,
            #ads-analysis-result .report-filter-input,
            #ads-analysis-result .report-clear-btn {
                height:32px !important;
                min-height:32px !important;
                border-radius:8px !important;
                font-size:10px !important;
            }

            #ads-analysis-result .ads-date-arrow {
                height:32px !important;
                font-size:10px !important;
            }

            #ads-analysis-result .report-clear-btn {
                padding:0 11px !important;
                white-space:nowrap !important;
            }

            /* ===== 6. KPI HÀNG TRÊN ===== */
            #ads-analysis-result .ads-kpi-workspace {
                gap:8px !important;
            }

            #ads-analysis-result #kpi-performance,
            #ads-analysis-result #kpi-finance {
                grid-template-columns:repeat(5,minmax(0,1fr)) !important;
                gap:8px !important;
            }

            #ads-analysis-result .ads-metric-card {
                min-height:92px !important;
                padding:11px 12px !important;
                border-radius:11px !important;
                box-shadow:0 3px 12px rgba(22,48,73,.045) !important;
            }

            #ads-analysis-result .ads-metric-head span {
                font-size:9px !important;
                letter-spacing:.25px !important;
            }

            #ads-analysis-result .ads-metric-head i {
                width:24px !important;
                height:24px !important;
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                border-radius:50% !important;
                background:#f5f8fc !important;
                color:#7d8da0 !important;
                font-size:8px !important;
            }

            #ads-analysis-result .ads-metric-card h3 {
                margin-top:9px !important;
                font-size:19px !important;
            }

            #ads-analysis-result .ads-metric-card p {
                margin-top:5px !important;
                font-size:8.8px !important;
            }

            /* ===== 7. PERFORMANCE: CHART TRÁI — TABLE PHẢI ===== */
            #ads-analysis-result #tab-performance.ads-tab-content.active {
                display:grid !important;
                grid-template-columns:minmax(420px,42%) minmax(0,58%) !important;
                gap:10px !important;
                align-items:stretch !important;
            }

            #ads-analysis-result #tab-performance > .ads-chart-card,
            #ads-analysis-result #tab-performance > .ads-data-card {
                min-width:0 !important;
                height:clamp(520px, calc(100vh - 255px), 760px) !important;
                margin:0 !important;
            }

            #ads-analysis-result #tab-performance > .ads-chart-card {
                display:flex !important;
                flex-direction:column !important;
            }

            #ads-analysis-result #tab-performance > .ads-data-card {
                display:flex !important;
                flex-direction:column !important;
                overflow:hidden !important;
            }

            #ads-analysis-result #tab-performance .ads-chart-canvas {
                flex:1 1 auto !important;
                min-height:0 !important;
                height:auto !important;
                padding:7px !important;
            }

            #ads-analysis-result #tab-performance .ads-data-card > .table-responsive {
                flex:1 1 auto !important;
                min-height:0 !important;
                height:auto !important;
                overflow:auto !important;
            }

            /* ===== 8. FINANCE: DATA CENTER FULL WIDTH + CHART/TR TABLE ===== */
            #ads-analysis-result #tab-finance.ads-tab-content.active {
                display:grid !important;
                grid-template-columns:minmax(420px,42%) minmax(0,58%) !important;
                gap:10px !important;
                align-items:start !important;
            }

            #ads-analysis-result #tab-finance #ads-data-center-mount {
                grid-column:1 / -1 !important;
                min-width:0 !important;
                margin:0 !important;
            }

            #ads-analysis-result #tab-finance > .ads-chart-card,
            #ads-analysis-result #tab-finance > .ads-data-card {
                min-width:0 !important;
                height:clamp(520px, calc(100vh - 310px), 760px) !important;
                margin:0 !important;
            }

            #ads-analysis-result #tab-finance > .ads-chart-card {
                display:flex !important;
                flex-direction:column !important;
            }

            #ads-analysis-result #tab-finance > .ads-data-card {
                display:flex !important;
                flex-direction:column !important;
                overflow:hidden !important;
            }

            #ads-analysis-result #tab-finance .ads-chart-canvas {
                flex:1 1 auto !important;
                min-height:0 !important;
                height:auto !important;
                padding:7px !important;
            }

            #ads-analysis-result #tab-finance .ads-data-card > .table-responsive {
                flex:1 1 auto !important;
                min-height:0 !important;
                height:auto !important;
                overflow:auto !important;
            }

            /* ===== 9. CARD HEADS / TABLE ===== */
            #ads-analysis-result .ads-content-card {
                padding:12px !important;
                border-radius:11px !important;
                box-shadow:0 4px 14px rgba(22,48,73,.05) !important;
            }

            #ads-analysis-result .ads-content-card-head {
                min-height:39px !important;
                margin-bottom:8px !important;
                gap:8px !important;
            }

            #ads-analysis-result .ads-section-kicker {
                margin-bottom:2px !important;
                font-size:8px !important;
                letter-spacing:.55px !important;
            }

            #ads-analysis-result .ads-content-card-head h2 {
                font-size:13px !important;
                line-height:1.25 !important;
            }

            #ads-analysis-result .ads-meta-live-toolbar {
                gap:5px !important;
            }

            #ads-analysis-result .meta-live-status-chip,
            #ads-analysis-result .meta-live-refresh-btn {
                min-height:29px !important;
                height:29px !important;
                padding:0 9px !important;
                font-size:8.8px !important;
            }

            #ads-analysis-result .meta-live-search-area {
                width:min(480px,100%) !important;
                min-width:260px !important;
            }

            #ads-analysis-result .meta-live-search-shell {
                min-height:32px !important;
                padding-top:3px !important;
                padding-bottom:3px !important;
                border-radius:8px !important;
            }

            #ads-analysis-result .ads-table {
                min-width:900px !important;
                font-size:9.5px !important;
            }

            #ads-analysis-result .ads-table th {
                padding:8px 7px !important;
                font-size:9px !important;
            }

            #ads-analysis-result .ads-table td {
                padding:7px !important;
                font-size:9.5px !important;
            }

            #ads-analysis-result .table-responsive {
                border-radius:9px !important;
            }

            /* Scrollbar gọn như dashboard lớn */
            #ads-analysis-result .table-responsive::-webkit-scrollbar,
            #ads-analysis-result .ads-report-preview::-webkit-scrollbar {
                width:7px !important;
                height:7px !important;
            }

            #ads-analysis-result .table-responsive::-webkit-scrollbar-thumb,
            #ads-analysis-result .ads-report-preview::-webkit-scrollbar-thumb {
                background:#cfd8e3 !important;
                border-radius:999px !important;
            }

            #ads-analysis-result .table-responsive::-webkit-scrollbar-track,
            #ads-analysis-result .ads-report-preview::-webkit-scrollbar-track {
                background:#f4f7fa !important;
            }

            /* ===== 10. DATA CENTER GỌN ===== */
            #upload-controls-container .ads-data-center {
                padding:10px !important;
                border-radius:11px !important;
                box-shadow:0 3px 12px rgba(22,48,73,.045) !important;
            }

            #upload-controls-container .ads-data-center-head h2 {
                font-size:13px !important;
            }

            #upload-controls-container .ads-data-center-head p {
                display:none !important;
            }

            #upload-controls-container .ads-data-actions {
                min-width:0 !important;
                width:auto !important;
                grid-template-columns:repeat(4,minmax(120px,1fr)) !important;
                gap:6px !important;
            }

            #upload-controls-container .ads-data-action {
                min-height:46px !important;
                padding:6px 8px !important;
                border-radius:8px !important;
            }

            #upload-controls-container .ads-data-action-icon {
                width:28px !important;
                height:28px !important;
                flex-basis:28px !important;
                border-radius:8px !important;
            }

            #upload-controls-container .ads-data-action b {
                font-size:9.5px !important;
            }

            #upload-controls-container .ads-data-action small {
                display:none !important;
            }

            /* ===== 11. TREND / REPORT GIỮ FULL WIDTH ===== */
            #ads-analysis-result #tab-trend.ads-tab-content.active,
            #ads-analysis-result #tab-report.ads-tab-content.active {
                display:grid !important;
                grid-template-columns:1fr !important;
                gap:10px !important;
            }

            /* ===== 12. DESKTOP NHỎ: XẾP DỌC ĐỂ KHÔNG BỂ ===== */
            @media (max-width:1280px) {
                #ads-analysis-result .ads-enterprise-shell {
                    grid-template-columns:78px minmax(0,1fr) !important;
                }

                #ads-analysis-result .ads-enterprise-sidebar {
                    width:78px !important;
                }

                #ads-analysis-result .ads-nav-copy,
                #ads-analysis-result .ads-sidebar-brand > div:last-child {
                    display:none !important;
                }

                #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                    justify-content:center !important;
                }

                #ads-analysis-result .ads-command-bar {
                    grid-template-columns:repeat(4,minmax(125px,1fr)) !important;
                }

                #ads-analysis-result .ads-date-arrow {
                    display:none !important;
                }

                #ads-analysis-result #tab-performance.ads-tab-content.active,
                #ads-analysis-result #tab-finance.ads-tab-content.active {
                    grid-template-columns:1fr !important;
                }

                #ads-analysis-result #tab-performance > .ads-chart-card,
                #ads-analysis-result #tab-performance > .ads-data-card,
                #ads-analysis-result #tab-finance > .ads-chart-card,
                #ads-analysis-result #tab-finance > .ads-data-card {
                    height:auto !important;
                    min-height:430px !important;
                }

                #ads-analysis-result #tab-performance .ads-chart-canvas,
                #ads-analysis-result #tab-finance .ads-chart-canvas {
                    height:360px !important;
                    min-height:360px !important;
                    flex:none !important;
                }
            }

            /* ===== 13. TABLET / MOBILE: tôn trọng responsive V155 ===== */
            @media (max-width:1024px) {
                #page-ads {
                    background:#f3f6f9 !important;
                }

                #ads-analysis-result .ads-enterprise-shell {
                    display:block !important;
                    min-height:0 !important;
                }

                #ads-analysis-result .ads-enterprise-sidebar {
                    position:sticky !important;
                    top:0 !important;
                    width:100% !important;
                    height:auto !important;
                    min-height:0 !important;
                    padding:8px !important;
                    border-right:0 !important;
                    border-bottom:1px solid #dfe6ee !important;
                }

                #ads-analysis-result .ads-sidebar-brand,
                #ads-analysis-result .ads-sidebar-toggle,
                #ads-analysis-result .ads-sidebar-help {
                    display:none !important;
                }

                #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                    display:grid !important;
                    grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                }

                #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                    justify-content:center !important;
                    min-height:42px !important;
                }

                #ads-analysis-result .ads-nav-copy {
                    display:block !important;
                }

                #ads-analysis-result .ads-enterprise-main {
                    padding:10px !important;
                }

                #ads-analysis-result .ads-command-bar {
                    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                }

                #ads-analysis-result #kpi-performance,
                #ads-analysis-result #kpi-finance {
                    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                }
            }

            @media (max-width:640px) {
                #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                }

                #ads-analysis-result .ads-command-bar {
                    grid-template-columns:1fr !important;
                }

                #ads-analysis-result #kpi-performance,
                #ads-analysis-result #kpi-finance {
                    grid-template-columns:1fr 1fr !important;
                }

                #ads-analysis-result .ads-content-card-head {
                    flex-direction:column !important;
                    align-items:stretch !important;
                }

                #ads-analysis-result .meta-live-search-area {
                    width:100% !important;
                    min-width:0 !important;
                }
            }

            @media (max-width:430px) {
                #ads-analysis-result #kpi-performance,
                #ads-analysis-result #kpi-finance {
                    grid-template-columns:1fr !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function compactSidebarText() {
        const shell = document.querySelector('#ads-analysis-result .ads-enterprise-shell');
        if (!shell) return false;

        // Không đổi ID / onclick / logic. Chỉ rút gọn phần chữ hiển thị.
        const map = [
            ['btn-tab-perf', 'Meta Live'],
            ['btn-tab-fin', 'Tài chính'],
            ['btn-tab-trend', 'Ma trận'],
            ['btn-tab-report', 'Báo cáo']
        ];

        map.forEach(([id, label]) => {
            const button = document.getElementById(id);
            if (!button) return;
            const bold = button.querySelector('.ads-nav-copy b');
            if (bold) bold.textContent = label;
        });

        shell.classList.add('ads-v157-layout-ready');

        // Chart.js sẽ tự quan sát kích thước, nhưng resize thêm một nhịp
        // giúp bố cục mới ổn định ngay sau khi resetInterface dựng DOM.
        setTimeout(() => {
            try { window.dispatchEvent(new Event('resize')); } catch (error) {}
            try { if (window.myAdsChart && typeof window.myAdsChart.resize === 'function') window.myAdsChart.resize(); } catch (error) {}
            try { if (window.myAdsTrendChart && typeof window.myAdsTrendChart.resize === 'function') window.myAdsTrendChart.resize(); } catch (error) {}
        }, 80);

        return true;
    }

    function applyLayout() {
        ensureOverrideStyleLast();
        compactSidebarText();
    }

    // Chạy ngay nếu module đã dựng xong.
    applyLayout();

    // Chạy lại sau khi initAdsAnalysis/resetInterface dựng lại giao diện.
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(applyLayout, 60);
        setTimeout(applyLayout, 450);
    });

    window.addEventListener('load', () => {
        setTimeout(applyLayout, 120);
        setTimeout(applyLayout, 800);
    });

    // Theo dõi riêng vùng Ads; không can thiệp dữ liệu.
    const observer = new MutationObserver(() => {
        const shell = document.querySelector('#ads-analysis-result .ads-enterprise-shell');
        if (shell && !shell.classList.contains('ads-v157-layout-ready')) {
            setTimeout(applyLayout, 0);
        }
    });

    const startObserver = () => {
        const root = document.getElementById('page-ads') || document.body;
        if (!root) return;
        observer.observe(root, { childList:true, subtree:true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver, { once:true });
    } else {
        startObserver();
    }

    // Khi đổi tab / thu gọn sidebar, resize chart mà không thay hàm logic gốc.
    document.addEventListener('click', event => {
        const target = event.target && event.target.closest
            ? event.target.closest('#btn-tab-perf,#btn-tab-fin,#btn-tab-trend,#btn-tab-report,#ads-sidebar-toggle')
            : null;

        if (!target) return;

        setTimeout(() => {
            try { window.dispatchEvent(new Event('resize')); } catch (error) {}
            try { if (window.myAdsChart && typeof window.myAdsChart.resize === 'function') window.myAdsChart.resize(); } catch (error) {}
            try { if (window.myAdsTrendChart && typeof window.myAdsTrendChart.resize === 'function') window.myAdsTrendChart.resize(); } catch (error) {}
        }, 180);
    });
})();

/* =========================================================
   V161 UI + EXACT-DAY COMPARE + MOBILE FIX
   ---------------------------------------------------------
   Chỉ mở rộng giao diện và dữ liệu so sánh KPI.
   Không thay đổi logic nguồn chính Meta Live / Firebase / ROAS / upload / export.

   Yêu cầu V161:
   - Ẩn nút "Cập nhật Meta", giữ tiến trình đồng bộ.
   - Trục tiền trên biểu đồ: 100.000 => 100k, 1.000.000 => 1tr.
   - Gộp Từ ngày + Đến ngày thành 1 bộ lọc khoảng ngày.
   - Thêm "So với kỳ": 7 ngày trước / 30 ngày trước / ngày cụ thể; mặc định 7 ngày trước.
   - 7 ngày trước = hôm nay so với đúng ngày cách đây 7 ngày.
   - 30 ngày trước = hôm nay so với đúng ngày cách đây 30 ngày.
   - Hai lựa chọn này độc lập hoàn toàn với kỳ tháng/khoảng ngày chính.
   - KPI có mini trend thực dựa trên 2 mốc tổng hợp: kỳ so sánh -> kỳ hiện tại.
     Không tự bịa dữ liệu ngày khi nguồn Meta hiện tại không có daily breakdown.
   - Search nằm cùng hàng Tổng quan / Marketing.
   - Sidebar có nền kéo dài theo toàn bộ workspace.
   - Bỏ "Hệ thống hoạt động".
   - Mobile bỏ khoảng trống lớn phía trên nội dung.
   - Legend biểu đồ luôn nằm trên một hàng.
   ========================================================= */

(function installAdsV158UiAndComparison() {
    const STYLE_ID = 'ads-v158-ui-compare-style';
    const COMPARE_CACHE = new Map();
    const compareState = {
        mode: '7d',
        customFrom: '',
        customTo: '',
        loading: false,
        rows: [],
        key: '',
        currentRows: [],
        currentKey: '',
        error: '',
        requestToken: 0
    };

    function padV158(value) {
        return String(value).padStart(2, '0');
    }

    function parseIsoDateV158(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
        return isNaN(date.getTime()) ? null : date;
    }

    function toIsoDateV158(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${padV158(date.getMonth() + 1)}-${padV158(date.getDate())}`;
    }

    function shiftIsoDateV158(iso, days) {
        const date = parseIsoDateV158(iso);
        if (!date) return '';
        date.setDate(date.getDate() + Number(days || 0));
        return toIsoDateV158(date);
    }

    function formatDateShortV158(iso) {
        const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : String(iso || '');
    }

    function getPrimaryPeriodV158() {
        try {
            if (typeof getMetaLivePeriod === 'function') return getMetaLivePeriod();
        } catch (error) {}

        const today = toIsoDateV158(new Date());
        return {
            from: String(window.DATE_FROM || '') || `${today.slice(0, 7)}-01`,
            to: String(window.DATE_TO || '') || today
        };
    }

    function ensureDefaultCustomCompareV158() {
        const today = toIsoDateV158(new Date());
        if (!today) return;
        if (!compareState.customTo) compareState.customTo = today;
        if (!compareState.customFrom) compareState.customFrom = shiftIsoDateV158(today, -6);
    }

    function getComparePeriodV158() {
        if (compareState.mode === 'custom') {
            ensureDefaultCustomCompareV158();
            if (!compareState.customFrom || !compareState.customTo) return null;
            if (compareState.customFrom > compareState.customTo) return null;
            return {
                from: compareState.customFrom,
                to: compareState.customTo,
                label: 'kỳ tùy chọn',
                shortLabel: `${formatDateShortV158(compareState.customFrom)} – ${formatDateShortV158(compareState.customTo)}`
            };
        }

        // V161:
        // "7 ngày trước"  = HÔM NAY so với đúng NGÀY cách đây 7 ngày.
        // "30 ngày trước" = HÔM NAY so với đúng NGÀY cách đây 30 ngày.
        // Hoàn toàn độc lập REPORT_MONTH / DATE_FROM / DATE_TO.
        const days = compareState.mode === '30d' ? 30 : 7;
        const today = toIsoDateV158(new Date());
        if (!today) return null;

        const compareDate = shiftIsoDateV158(today, -days);

        return {
            from: compareDate,
            to: compareDate,
            label: `${days} ngày trước`,
            shortLabel: `${days} ngày trước`,
            exactDate: compareDate,
            today
        };
    }

    function buildCompareContextV158(companyId, period) {
        const company = String(companyId || window.CURRENT_COMPANY || 'NNV').toUpperCase();
        const periodKey = `${period.from}_${period.to}`;
        return {
            company,
            period: { from: period.from, to: period.to },
            periodKey,
            requestKey: `${company}||${period.from}||${period.to}`,
            snapshotPath: `meta_live_snapshots_v1/${company}/${periodKey}`,
            lockPath: `meta_live_locks_v1/${company}/${periodKey}`,
            requestPath: `meta_live_refresh_requests_v1/${company}/${periodKey}`
        };
    }

    function getCompareKeyV158() {
        const period = getComparePeriodV158();
        const company = String(window.CURRENT_COMPANY || 'NNV');
        return period ? `${company}||${period.from}||${period.to}` : '';
    }

    function formatCompactMoneyAxisV158(value) {
        const number = Number(value || 0);
        if (!Number.isFinite(number)) return value;
        const abs = Math.abs(number);

        function viNumber(n, maxDigits) {
            return new Intl.NumberFormat('vi-VN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: maxDigits
            }).format(n);
        }

        if (abs >= 1000000) {
            const scaled = number / 1000000;
            const digits = Math.abs(scaled) >= 10 || Number.isInteger(scaled) ? 0 : 1;
            return `${viNumber(scaled, digits)}tr`;
        }
        if (abs >= 1000) {
            const scaled = number / 1000;
            const digits = Math.abs(scaled) >= 10 || Number.isInteger(scaled) ? 0 : 1;
            return `${viNumber(scaled, digits)}k`;
        }
        return viNumber(number, 0);
    }

    window.formatAdsCompactMoneyAxis = formatCompactMoneyAxisV158;

    function injectStyleV158() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* V158 có specificity cao để luôn thắng lớp V157 cũ. */
            html body #ads-analysis-result .meta-live-refresh-btn {
                display:none !important;
            }

            html body #ads-analysis-result .ads-topbar-status {
                display:none !important;
            }

            html body #ads-analysis-result .ads-enterprise-topbar {
                min-height:34px !important;
                align-items:center !important;
            }

            /* Nền sidebar kéo dài theo toàn bộ chiều cao workspace. */
            html body #ads-analysis-result .ads-enterprise-shell {
                align-items:stretch !important;
                background:
                    linear-gradient(
                        to right,
                        #ffffff 0,
                        #ffffff 132px,
                        #dfe6ee 132px,
                        #dfe6ee 133px,
                        #f3f6f9 133px,
                        #f3f6f9 100%
                    ) !important;
            }

            html body #ads-analysis-result .ads-enterprise-shell.sidebar-collapsed {
                background:
                    linear-gradient(
                        to right,
                        #ffffff 0,
                        #ffffff 68px,
                        #dfe6ee 68px,
                        #dfe6ee 69px,
                        #f3f6f9 69px,
                        #f3f6f9 100%
                    ) !important;
            }

            html body #ads-analysis-result .ads-enterprise-sidebar {
                background:#ffffff !important;
                border-right:0 !important;
            }

            /* Ẩn hai ô ngày cũ nhưng giữ DOM để logic V156 tiếp tục dùng. */
            html body #ads-analysis-result .ads-command-date,
            html body #ads-analysis-result .ads-date-arrow,
            html body #ads-analysis-result .ads-command-separator {
                display:none !important;
            }

            html body #ads-analysis-result .ads-command-bar {
                grid-template-columns:
                    minmax(125px,1fr)
                    minmax(125px,1fr)
                    minmax(135px,1fr)
                    minmax(135px,.95fr)
                    minmax(205px,1.2fr)
                    minmax(155px,.95fr)
                    auto !important;
                overflow:visible !important;
            }

            html body #ads-analysis-result .ads-v158-range-item,
            html body #ads-analysis-result .ads-v158-compare-item {
                position:relative;
                min-width:0;
            }

            html body #ads-analysis-result .ads-v158-range-button {
                width:100%;
                height:32px;
                min-height:32px;
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:7px;
                padding:0 9px;
                border:1px solid #d8e1eb;
                border-radius:8px;
                background:#ffffff;
                color:#1b344c;
                font-size:10px;
                font-weight:700;
                cursor:pointer;
                white-space:nowrap;
                overflow:hidden;
            }

            html body #ads-analysis-result .ads-v158-range-button:hover,
            html body #ads-analysis-result .ads-v158-range-button.is-open {
                border-color:#77a9ff;
                box-shadow:0 0 0 3px rgba(31,111,255,.09);
            }

            html body #ads-analysis-result .ads-v158-range-button span:first-child {
                overflow:hidden;
                text-overflow:ellipsis;
            }

            html body #ads-analysis-result .ads-v158-popover {
                position:absolute;
                top:48px;
                right:0;
                z-index:500;
                width:310px;
                padding:11px;
                border:1px solid #dce4ed;
                border-radius:11px;
                background:#ffffff;
                box-shadow:0 18px 42px rgba(15,23,42,.18);
                display:none;
            }

            html body #ads-analysis-result .ads-v158-popover.open {
                display:block;
            }

            html body #ads-analysis-result .ads-v158-popover-title {
                margin-bottom:8px;
                color:#334a60;
                font-size:10px;
                font-weight:700;
            }

            html body #ads-analysis-result .ads-v158-popover-grid {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:8px;
            }

            html body #ads-analysis-result .ads-v158-popover label {
                display:flex;
                flex-direction:column;
                gap:4px;
                color:#7c8c9d;
                font-size:8.5px;
                font-weight:700;
                text-transform:uppercase;
            }

            html body #ads-analysis-result .ads-v158-popover input {
                width:100%;
                height:32px;
                padding:5px 7px;
                border:1px solid #d8e1eb;
                border-radius:8px;
                outline:none;
                color:#24364a;
                background:#fff;
                font-size:10px;
                font-weight:700;
            }

            html body #ads-analysis-result .ads-v158-popover-actions {
                display:flex;
                justify-content:flex-end;
                gap:6px;
                margin-top:10px;
            }

            html body #ads-analysis-result .ads-v158-popover-actions button {
                min-height:30px;
                padding:0 10px;
                border-radius:8px;
                border:1px solid #d8e1eb;
                background:#fff;
                color:#53677b;
                font-size:9px;
                font-weight:700;
                cursor:pointer;
            }

            html body #ads-analysis-result .ads-v158-popover-actions button.primary {
                border-color:#1f6fff;
                background:#1f6fff;
                color:#fff;
            }

            html body #ads-analysis-result .ads-v158-compare-select {
                width:100%;
                height:32px;
                padding:0 9px;
                border:1px solid #d8e1eb;
                border-radius:8px;
                background:#fff;
                color:#1b344c;
                font-size:10px;
                font-weight:700;
                outline:none;
                cursor:pointer;
            }

            html body #ads-analysis-result .ads-v158-compare-note {
                position:absolute;
                left:0;
                right:0;
                top:54px;
                z-index:490;
                display:none;
                padding:7px 9px;
                border:1px solid #dce4ed;
                border-radius:8px;
                background:#fff;
                box-shadow:0 10px 25px rgba(15,23,42,.12);
                color:#65778a;
                font-size:8.5px;
                line-height:1.35;
            }

            html body #ads-analysis-result .ads-v158-compare-note.visible {
                display:block;
            }

            /* KPI mini trend */
            html body #ads-analysis-result .ads-metric-card {
                padding-bottom:9px !important;
            }

            html body #ads-analysis-result .ads-v158-kpi-foot {
                margin-top:7px;
                min-height:29px;
                display:grid;
                grid-template-columns:minmax(0,1fr) 86px;
                align-items:end;
                gap:6px;
            }

            html body #ads-analysis-result .ads-v158-kpi-compare {
                min-width:0;
                color:#77889a;
                font-size:8px;
                line-height:1.25;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
            }

            html body #ads-analysis-result .ads-v158-kpi-compare b {
                font-size:8.5px;
                font-weight:700;
            }

            html body #ads-analysis-result .ads-v158-kpi-compare.is-up b { color:#16885f; }
            html body #ads-analysis-result .ads-v158-kpi-compare.is-down b { color:#d64545; }
            html body #ads-analysis-result .ads-v158-kpi-compare.is-neutral b { color:#64748b; }
            html body #ads-analysis-result .ads-v158-kpi-compare.is-loading b { color:#1f6fff; }

            html body #ads-analysis-result .ads-v158-kpi-spark {
                width:86px;
                height:28px;
                overflow:visible;
                display:block;
            }

            /* V160 SEARCH LAYOUT
               Tổng quan / Marketing giữ thành một cụm độc lập bên trái.
               Search là sibling bên phải, tuyệt đối không nằm bên trong cụm tab. */
            html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head {
                width:100% !important;
                display:grid !important;
                grid-template-columns:minmax(260px,1fr) minmax(310px,480px) !important;
                align-items:center !important;
                gap:10px !important;
            }

            html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head > div:first-child {
                min-width:0 !important;
            }

            html body #ads-analysis-result #tab-performance .ads-data-card .ads-section-kicker {
                margin-bottom:4px !important;
            }

            html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs {
                width:auto !important;
                max-width:100% !important;
                display:flex !important;
                align-items:center !important;
                gap:7px !important;
                flex-wrap:nowrap !important;
                min-width:0 !important;
            }

            html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs > h2 {
                flex:0 1 auto !important;
                min-width:0 !important;
                margin-right:1px !important;
                white-space:nowrap !important;
                overflow:hidden !important;
                text-overflow:ellipsis !important;
            }

            html body #ads-analysis-result #tab-performance .ads-inline-scope-tabs {
                flex:0 0 auto !important;
                white-space:nowrap !important;
            }

            html body #ads-analysis-result #tab-performance .meta-live-search-area {
                grid-column:2 !important;
                width:100% !important;
                min-width:0 !important;
                max-width:480px !important;
                margin-left:auto !important;
                align-self:center !important;
            }

            html body #ads-analysis-result #tab-performance .meta-live-search-shell {
                width:100% !important;
                min-height:32px !important;
                height:32px !important;
                padding-top:2px !important;
                padding-bottom:2px !important;
                border-radius:9px !important;
            }

            @media (max-width:1480px) {
                html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head {
                    grid-template-columns:minmax(240px,1fr) minmax(270px,390px) !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-area {
                    max-width:390px !important;
                }
            }

            @media (max-width:1180px) {
                html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head {
                    grid-template-columns:1fr !important;
                    align-items:stretch !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-area {
                    grid-column:1 !important;
                    width:100% !important;
                    max-width:none !important;
                    margin-left:0 !important;
                }
            }

            /* Legend HTML: một hàng duy nhất. */
            html body #ads-analysis-result .ads-v158-chart-legend {
                width:100%;
                min-height:25px;
                display:flex;
                align-items:center;
                gap:14px;
                flex-wrap:nowrap;
                overflow-x:auto;
                overflow-y:hidden;
                padding:0 3px 6px;
                margin-top:-1px;
                color:#53677b;
                font-size:9px;
                font-weight:700;
                scrollbar-width:none;
            }

            html body #ads-analysis-result .ads-v158-chart-legend::-webkit-scrollbar {
                display:none;
            }

            html body #ads-analysis-result .ads-v158-chart-legend-item {
                flex:0 0 auto;
                display:inline-flex;
                align-items:center;
                gap:5px;
                white-space:nowrap;
            }

            html body #ads-analysis-result .ads-v158-chart-legend-mark {
                width:13px;
                height:4px;
                border-radius:999px;
                display:inline-block;
            }

            html body #ads-analysis-result .ads-v158-chart-legend-mark.is-bar {
                width:10px;
                height:8px;
                border-radius:3px;
            }

            @media (max-width:1280px) {
                html body #ads-analysis-result .ads-command-bar {
                    grid-template-columns:repeat(3,minmax(150px,1fr)) !important;
                }

                html body #ads-analysis-result .ads-title-with-scope-tabs {
                    flex-wrap:wrap !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-area {
                    flex:1 1 100% !important;
                    width:100% !important;
                    min-width:0 !important;
                }
            }

            @media (max-width:1024px) {
                /* Mobile/tablet: bỏ khoảng cách lớn giữa menu Ads và nội dung Meta Live/Tài chính. */
                html body #ads-analysis-result .ads-enterprise-shell,
                html body #ads-analysis-result .ads-enterprise-shell.sidebar-collapsed {
                    background:#f3f6f9 !important;
                }

                html body #ads-analysis-result .ads-enterprise-topbar {
                    display:none !important;
                }

                html body #ads-analysis-result .ads-enterprise-main {
                    padding-top:4px !important;
                    gap:8px !important;
                }

                html body #ads-analysis-result .ads-enterprise-sidebar {
                    margin-bottom:0 !important;
                    padding-bottom:7px !important;
                }

                html body #ads-analysis-result .ads-command-bar {
                    margin-top:0 !important;
                    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                }

                html body #ads-analysis-result .ads-v158-popover {
                    left:0;
                    right:auto;
                    width:min(310px,calc(100vw - 28px));
                }
            }

            @media (max-width:640px) {
                html body #ads-analysis-result .ads-command-bar {
                    grid-template-columns:1fr !important;
                    gap:7px !important;
                }

                html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs {
                    flex-wrap:wrap !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-area {
                    flex:1 1 100% !important;
                    width:100% !important;
                    min-width:0 !important;
                }

                html body #ads-analysis-result .ads-v158-kpi-foot {
                    grid-template-columns:minmax(0,1fr) 76px;
                }

                html body #ads-analysis-result .ads-v158-kpi-spark {
                    width:76px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function updateRangeButtonV158() {
        const button = document.getElementById('ads-v158-date-range-btn');
        if (!button) return;
        const primary = getPrimaryPeriodV158();
        const label = primary && primary.from && primary.to
            ? `${formatDateShortV158(primary.from)} – ${formatDateShortV158(primary.to)}`
            : 'Chọn khoảng ngày';
        const text = button.querySelector('[data-range-label]');
        if (text) text.textContent = label;
        button.title = label;
    }

    function updateCompareNoteV158() {
        const note = document.getElementById('ads-v158-compare-note');
        if (!note) return;
        const period = getComparePeriodV158();
        if (!period) {
            note.textContent = 'Khoảng so sánh chưa hợp lệ.';
            return;
        }
        if (compareState.mode === '7d' || compareState.mode === '30d') {
            const today = toIsoDateV158(new Date());
            note.textContent = `Hôm nay ${formatDateShortV158(today)} so với ${period.label} (${formatDateShortV158(period.from)})`;
        } else {
            note.textContent = period.from === period.to
                ? `So sánh với ngày ${formatDateShortV158(period.from)}`
                : `So sánh với ${formatDateShortV158(period.from)} – ${formatDateShortV158(period.to)}`;
        }
    }

    function closeAllPopoversV158() {
        document.querySelectorAll('#ads-analysis-result .ads-v158-popover.open').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('#ads-analysis-result .ads-v158-range-button.is-open').forEach(el => el.classList.remove('is-open'));
        document.querySelectorAll('#ads-analysis-result .ads-v158-compare-note.visible').forEach(el => el.classList.remove('visible'));
    }

    function applyPrimaryRangeV158(from, to) {
        if (!from || !to || from > to) {
            if (typeof showToast === 'function') showToast('Khoảng ngày không hợp lệ.', 'error');
            return;
        }

        const fromInput = document.getElementById('date-from');
        const toInput = document.getElementById('date-to');
        const monthInput = document.getElementById('report-month-filter');

        if (fromInput) fromInput.value = from;
        if (toInput) toInput.value = to;
        if (monthInput) monthInput.value = '';

        try {
            DATE_FROM = from;
            DATE_TO = to;
            REPORT_MONTH = '';
            PERIOD_FILTER_USER_CHANGED = true;
        } catch (error) {}

        updateRangeButtonV158();
        closeAllPopoversV158();
        invalidateCompareV158();

        if (typeof window.applyDateFilter === 'function') {
            window.applyDateFilter();
        } else if (typeof applyFilters === 'function') {
            applyFilters();
        }

        scheduleCompareLoadV158(true, 180);
    }

    function applyCustomCompareV158(from, to) {
        if (!from || !to || from > to) {
            if (typeof showToast === 'function') showToast('Khoảng ngày so sánh không hợp lệ.', 'error');
            return;
        }
        compareState.mode = 'custom';
        compareState.customFrom = from;
        compareState.customTo = to;
        const select = document.getElementById('ads-v158-compare-mode');
        if (select) select.value = 'custom';
        updateCompareNoteV158();
        closeAllPopoversV158();
        invalidateCompareV158();
        scheduleCompareLoadV158(true, 50);
    }

    function ensureFilterControlsV158() {
        const commandBar = document.querySelector('#ads-analysis-result .ads-command-bar');
        if (!commandBar) return false;

        let rangeItem = document.getElementById('ads-v158-date-range-item');
        if (!rangeItem) {
            rangeItem = document.createElement('div');
            rangeItem.id = 'ads-v158-date-range-item';
            rangeItem.className = 'ads-command-item ads-v158-range-item';
            rangeItem.innerHTML = `
                <label>Khoảng ngày</label>
                <button type="button" id="ads-v158-date-range-btn" class="ads-v158-range-button" aria-expanded="false">
                    <span data-range-label>Chọn khoảng ngày</span>
                    <span>⌄</span>
                </button>
                <div id="ads-v158-date-range-popover" class="ads-v158-popover">
                    <div class="ads-v158-popover-title">Chọn khoảng dữ liệu chính</div>
                    <div class="ads-v158-popover-grid">
                        <label>Từ ngày<input type="date" id="ads-v158-primary-from"></label>
                        <label>Đến ngày<input type="date" id="ads-v158-primary-to"></label>
                    </div>
                    <div class="ads-v158-popover-actions">
                        <button type="button" data-v158-close>Đóng</button>
                        <button type="button" class="primary" id="ads-v158-primary-apply">Áp dụng</button>
                    </div>
                </div>
            `;

            const resetButton = commandBar.querySelector('.report-clear-btn');
            commandBar.insertBefore(rangeItem, resetButton || null);
        }

        let compareItem = document.getElementById('ads-v158-compare-item');
        if (!compareItem) {
            compareItem = document.createElement('div');
            compareItem.id = 'ads-v158-compare-item';
            compareItem.className = 'ads-command-item ads-v158-compare-item';
            compareItem.innerHTML = `
                <label>So với kỳ</label>
                <select id="ads-v158-compare-mode" class="ads-v158-compare-select">
                    <option value="7d">7 ngày trước</option>
                    <option value="30d">30 ngày trước</option>
                    <option value="custom">Chọn ngày cụ thể</option>
                </select>
                <div id="ads-v158-compare-note" class="ads-v158-compare-note"></div>
                <div id="ads-v158-compare-popover" class="ads-v158-popover">
                    <div class="ads-v158-popover-title">Chọn khoảng so sánh</div>
                    <div class="ads-v158-popover-grid">
                        <label>Từ ngày<input type="date" id="ads-v158-compare-from"></label>
                        <label>Đến ngày<input type="date" id="ads-v158-compare-to"></label>
                    </div>
                    <div class="ads-v158-popover-actions">
                        <button type="button" data-v158-close>Đóng</button>
                        <button type="button" class="primary" id="ads-v158-compare-apply">Áp dụng</button>
                    </div>
                </div>
            `;

            const resetButton = commandBar.querySelector('.report-clear-btn');
            commandBar.insertBefore(compareItem, resetButton || null);
        }

        const primary = getPrimaryPeriodV158();
        const primaryFrom = document.getElementById('ads-v158-primary-from');
        const primaryTo = document.getElementById('ads-v158-primary-to');
        if (primaryFrom && primary) primaryFrom.value = primary.from || '';
        if (primaryTo && primary) primaryTo.value = primary.to || '';

        ensureDefaultCustomCompareV158();
        const compareFrom = document.getElementById('ads-v158-compare-from');
        const compareTo = document.getElementById('ads-v158-compare-to');
        if (compareFrom) compareFrom.value = compareState.customFrom || '';
        if (compareTo) compareTo.value = compareState.customTo || '';

        const select = document.getElementById('ads-v158-compare-mode');
        if (select) select.value = compareState.mode;

        updateRangeButtonV158();
        updateCompareNoteV158();
        bindFilterControlsV158();
        return true;
    }

    function bindFilterControlsV158() {
        const rangeButton = document.getElementById('ads-v158-date-range-btn');
        if (rangeButton && rangeButton.dataset.boundV158 !== '1') {
            rangeButton.dataset.boundV158 = '1';
            rangeButton.addEventListener('click', event => {
                event.stopPropagation();
                const popover = document.getElementById('ads-v158-date-range-popover');
                const willOpen = popover && !popover.classList.contains('open');
                closeAllPopoversV158();
                if (popover && willOpen) {
                    const primary = getPrimaryPeriodV158();
                    const from = document.getElementById('ads-v158-primary-from');
                    const to = document.getElementById('ads-v158-primary-to');
                    if (from && primary) from.value = primary.from || '';
                    if (to && primary) to.value = primary.to || '';
                    popover.classList.add('open');
                    rangeButton.classList.add('is-open');
                    rangeButton.setAttribute('aria-expanded', 'true');
                }
            });
        }

        const primaryApply = document.getElementById('ads-v158-primary-apply');
        if (primaryApply && primaryApply.dataset.boundV158 !== '1') {
            primaryApply.dataset.boundV158 = '1';
            primaryApply.addEventListener('click', () => {
                applyPrimaryRangeV158(
                    document.getElementById('ads-v158-primary-from')?.value || '',
                    document.getElementById('ads-v158-primary-to')?.value || ''
                );
            });
        }

        const compareSelect = document.getElementById('ads-v158-compare-mode');
        if (compareSelect && compareSelect.dataset.boundV158 !== '1') {
            compareSelect.dataset.boundV158 = '1';
            compareSelect.addEventListener('change', () => {
                compareState.mode = compareSelect.value === '30d'
                    ? '30d'
                    : (compareSelect.value === 'custom' ? 'custom' : '7d');

                updateCompareNoteV158();
                invalidateCompareV158();

                if (compareState.mode === 'custom') {
                    ensureDefaultCustomCompareV158();
                    const from = document.getElementById('ads-v158-compare-from');
                    const to = document.getElementById('ads-v158-compare-to');
                    if (from) from.value = compareState.customFrom;
                    if (to) to.value = compareState.customTo;
                    const popover = document.getElementById('ads-v158-compare-popover');
                    closeAllPopoversV158();
                    if (popover) popover.classList.add('open');
                } else {
                    closeAllPopoversV158();
                    scheduleCompareLoadV158(true, 40);
                }
            });

            compareSelect.addEventListener('mouseenter', () => {
                const note = document.getElementById('ads-v158-compare-note');
                updateCompareNoteV158();
                if (note) note.classList.add('visible');
            });
            compareSelect.addEventListener('mouseleave', () => {
                const note = document.getElementById('ads-v158-compare-note');
                if (note) note.classList.remove('visible');
            });
        }

        const compareApply = document.getElementById('ads-v158-compare-apply');
        if (compareApply && compareApply.dataset.boundV158 !== '1') {
            compareApply.dataset.boundV158 = '1';
            compareApply.addEventListener('click', () => {
                applyCustomCompareV158(
                    document.getElementById('ads-v158-compare-from')?.value || '',
                    document.getElementById('ads-v158-compare-to')?.value || ''
                );
            });
        }

        document.querySelectorAll('#ads-analysis-result [data-v158-close]').forEach(button => {
            if (button.dataset.boundV158 === '1') return;
            button.dataset.boundV158 = '1';
            button.addEventListener('click', closeAllPopoversV158);
        });
    }

    function moveSearchInlineV158() {
        const cardHead = document.querySelector(
            '#ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head'
        );
        const search = document.getElementById('meta-live-search-area');
        if (!cardHead || !search) return false;

        // Search là một khối độc lập bên phải.
        // Không append vào .ads-title-with-scope-tabs vì sẽ làm vỡ cụm Tổng quan / Marketing.
        if (search.parentElement !== cardHead) {
            cardHead.appendChild(search);
        }

        return true;
    }

    function buildMiniTrendSvgV158(current, previous, color) {
        const width = 86;
        const height = 28;
        const left = 3;
        const right = width - 3;
        const top = 4;
        const bottom = height - 4;
        const a = Number(previous || 0);
        const b = Number(current || 0);
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        const span = max - min;

        const scaleY = value => {
            if (!span) return (top + bottom) / 2;
            return bottom - ((value - min) / span) * (bottom - top);
        };

        const y1 = scaleY(a);
        const y2 = scaleY(b);
        const c1x = left + (right - left) * 0.34;
        const c2x = left + (right - left) * 0.68;
        const bend = Math.max(-4, Math.min(4, (y1 - y2) * 0.16));
        const c1y = y1 - bend;
        const c2y = y2 + bend;
        const linePath = `M ${left} ${y1.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${right} ${y2.toFixed(2)}`;
        const areaPath = `${linePath} L ${right} ${height - 1} L ${left} ${height - 1} Z`;
        const safeColor = color || '#1f6fff';
        const gradientId = `v158Grad_${Math.random().toString(36).slice(2)}`;

        return `
            <svg class="ads-v158-kpi-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${safeColor}" stop-opacity="0.20"></stop>
                        <stop offset="100%" stop-color="${safeColor}" stop-opacity="0"></stop>
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#${gradientId})"></path>
                <path d="${linePath}" fill="none" stroke="${safeColor}" stroke-width="2" stroke-linecap="round"></path>
                <circle cx="${left}" cy="${y1.toFixed(2)}" r="1.8" fill="#fff" stroke="${safeColor}" stroke-width="1.3"></circle>
                <circle cx="${right}" cy="${y2.toFixed(2)}" r="2" fill="${safeColor}"></circle>
            </svg>
        `;
    }

    function ensureKpiFootV158(card) {
        if (!card) return null;
        let foot = card.querySelector('.ads-v158-kpi-foot');
        if (!foot) {
            foot = document.createElement('div');
            foot.className = 'ads-v158-kpi-foot';
            foot.innerHTML = `
                <div class="ads-v158-kpi-compare is-loading"><b>Đang tải kỳ so sánh...</b></div>
                <div class="ads-v158-kpi-spark-wrap"></div>
            `;
            card.appendChild(foot);
        }
        return foot;
    }

    function renderKpiCompareOneV158(elementId, current, previous, options = {}) {
        const valueElement = document.getElementById(elementId);
        const card = valueElement && valueElement.closest('.ads-metric-card');
        const foot = ensureKpiFootV158(card);
        if (!foot) return;

        const textBox = foot.querySelector('.ads-v158-kpi-compare');
        const sparkBox = foot.querySelector('.ads-v158-kpi-spark-wrap');
        const period = getComparePeriodV158();
        const compareLabel = period ? period.shortLabel : 'kỳ so sánh';

        if (options.loading) {
            textBox.className = 'ads-v158-kpi-compare is-loading';
            textBox.innerHTML = '<b>Đang tải kỳ so sánh...</b>';
            sparkBox.innerHTML = '';
            return;
        }

        if (options.available === false) {
            textBox.className = 'ads-v158-kpi-compare is-neutral';
            textBox.innerHTML = `<b>Chưa có dữ liệu</b><br>so với ${escapeHtml(compareLabel)}`;
            sparkBox.innerHTML = '';
            return;
        }

        const cur = Number(current || 0);
        const prev = Number(previous || 0);
        const rawDelta = prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : (cur !== 0 ? null : 0);
        const lowerBetter = options.lowerBetter === true;
        const isImproved = rawDelta === null
            ? cur > 0
            : (lowerBetter ? rawDelta < 0 : rawDelta > 0);
        const isDeclined = rawDelta === null
            ? false
            : (lowerBetter ? rawDelta > 0 : rawDelta < 0);
        const tone = isImproved ? 'is-up' : (isDeclined ? 'is-down' : 'is-neutral');
        const color = isImproved ? '#16885f' : (isDeclined ? '#d64545' : '#64748b');

        let deltaText;
        if (rawDelta === null) {
            deltaText = cur > 0 ? 'Mới' : '0%';
        } else {
            const arrow = rawDelta > 0 ? '▲' : (rawDelta < 0 ? '▼' : '•');
            deltaText = `${arrow} ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Math.abs(rawDelta))}%`;
        }

        textBox.className = `ads-v158-kpi-compare ${tone}`;
        textBox.innerHTML = `<b>${escapeHtml(deltaText)}</b><br>so với ${escapeHtml(compareLabel)}`;
        sparkBox.innerHTML = buildMiniTrendSvgV158(cur, prev, color);
    }

    function calcPerformanceMetricsV158(rows) {
        let spend = 0;
        let messages = 0;
        let purchases = 0;
        (Array.isArray(rows) ? rows : []).forEach(item => {
            spend += Number(item && item.spend || 0);
            messages += Number(item && item.messages || 0);
            purchases += Number(item && item.result || 0);
        });
        return {
            spend,
            messages,
            purchases,
            cpa: purchases > 0 ? spend / purchases : 0,
            cr: messages > 0 ? purchases / messages * 100 : (purchases > 0 ? 100 : 0)
        };
    }

    function calcFinanceMetricsV158(rows, periodKey, companyId) {
        const source = typeof getMetaLiveFinanceSource === 'function'
            ? getMetaLiveFinanceSource(companyId, periodKey)
            : {};
        const revenueReady = !!(source && source.revenue);
        const statementReady = !!(source && source.statement);
        const enriched = typeof enrichMetaRowsWithLatestFinanceSource === 'function'
            ? enrichMetaRowsWithLatestFinanceSource(rows, companyId, periodKey)
            : (Array.isArray(rows) ? rows : []);

        let spend = 0;
        let purchases = 0;
        let revenue = 0;
        let totalCost = 0;
        enriched.forEach(item => {
            const itemSpend = Number(item && item.spend || 0);
            const fee = Number(item && item.fee || 0);
            spend += itemSpend;
            purchases += Number(item && item.result || 0);
            revenue += Number(item && item.revenue || 0);
            totalCost += itemSpend * 1.1 + fee;
        });

        return {
            spendWithVat: spend * 1.1,
            statement: statementReady ? Number(source.statement.total || 0) : 0,
            purchases,
            revenue,
            roas: totalCost > 0 ? revenue / totalCost : 0,
            statementReady,
            revenueReady
        };
    }

    function getCurrentRowsForCompareV158() {
        return (Array.isArray(window.META_LIVE_DATA) ? window.META_LIVE_DATA : (typeof META_LIVE_DATA !== 'undefined' ? META_LIVE_DATA : []))
            .filter(item => String(item && item.company || '') === String(window.CURRENT_COMPANY || (typeof CURRENT_COMPANY !== 'undefined' ? CURRENT_COMPANY : 'NNV')));
    }

    function updateKpiComparisonV158() {
        const currentTab = typeof CURRENT_TAB !== 'undefined' ? CURRENT_TAB : 'performance';
        const company = typeof CURRENT_COMPANY !== 'undefined' ? CURRENT_COMPANY : 'NNV';
        const comparePeriod = getComparePeriodV158();
        const currentPeriod = getPrimaryPeriodV158();

        const allIds = ['perf-spend','perf-msg','perf-leads','perf-cpl','perf-ctr','fin-spend','fin-statement','fin-leads','fin-revenue','fin-roas'];
        if (compareState.loading) {
            allIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) renderKpiCompareOneV158(id, 0, 0, { loading:true });
            });
            return;
        }

        if (!comparePeriod || !compareState.key) return;

        // V161: phần % so sánh KPI dùng HÔM NAY, không dùng tổng kỳ tháng đang xem.
        // Số KPI lớn vẫn theo bộ lọc chính hiện tại; phần tăng/giảm bên dưới là daily compare độc lập.
        const currentRows = Array.isArray(compareState.currentRows)
            ? compareState.currentRows
            : [];
        const compareRows = Array.isArray(compareState.rows) ? compareState.rows : [];

        const currentPerf = calcPerformanceMetricsV158(currentRows);
        const comparePerf = calcPerformanceMetricsV158(compareRows);
        const currentHasRows = currentRows.length > 0;
        const compareHasRows = compareRows.length > 0;
        const dailyCompareAvailable = currentHasRows && compareHasRows;

        renderKpiCompareOneV158('perf-spend', currentPerf.spend, comparePerf.spend, { available:dailyCompareAvailable });
        renderKpiCompareOneV158('perf-msg', currentPerf.messages, comparePerf.messages, { available:dailyCompareAvailable });
        renderKpiCompareOneV158('perf-leads', currentPerf.purchases, comparePerf.purchases, { available:dailyCompareAvailable });
        renderKpiCompareOneV158('perf-cpl', currentPerf.cpa, comparePerf.cpa, { available:dailyCompareAvailable, lowerBetter:true });
        renderKpiCompareOneV158('perf-ctr', currentPerf.cr, comparePerf.cr, { available:dailyCompareAvailable });

        const todayForCompare = toIsoDateV158(new Date());
        const currentPeriodKey = todayForCompare
            ? `${todayForCompare}_${todayForCompare}`
            : '';
        const comparePeriodKey = `${comparePeriod.from}_${comparePeriod.to}`;

        const currentFinance = calcFinanceMetricsV158(currentRows.filter(item => typeof hasMetaLiveDeliveryData !== 'function' || hasMetaLiveDeliveryData(item)), currentPeriodKey, company);
        const compareFinance = calcFinanceMetricsV158(compareRows.filter(item => typeof hasMetaLiveDeliveryData !== 'function' || hasMetaLiveDeliveryData(item)), comparePeriodKey, company);

        renderKpiCompareOneV158('fin-spend', currentFinance.spendWithVat, compareFinance.spendWithVat, { available:dailyCompareAvailable });
        renderKpiCompareOneV158('fin-statement', currentFinance.statement, compareFinance.statement, { available:compareFinance.statementReady });
        renderKpiCompareOneV158('fin-leads', currentFinance.purchases, compareFinance.purchases, { available:dailyCompareAvailable });
        renderKpiCompareOneV158('fin-revenue', currentFinance.revenue, compareFinance.revenue, { available:compareFinance.revenueReady });
        renderKpiCompareOneV158('fin-roas', currentFinance.roas, compareFinance.roas, { available:compareFinance.revenueReady && dailyCompareAvailable });

        // Chỉ cập nhật phần đang hiện nhưng vẫn chuẩn bị sẵn dữ liệu cho khi đổi tab.
        void currentTab;
    }

    function invalidateCompareV158() {
        compareState.rows = [];
        compareState.key = '';
        compareState.currentRows = [];
        compareState.currentKey = '';
        compareState.error = '';
        compareState.requestToken += 1;
    }

    async function loadSinglePeriodRowsV161(period, company, force, token) {
        if (!period || !period.from || !period.to) return { rows: [], key: '' };

        const context = buildCompareContextV158(company, period);
        const cacheKey = context.requestKey;

        if (!force && COMPARE_CACHE.has(cacheKey)) {
            const cached = COMPARE_CACHE.get(cacheKey);
            return {
                rows: cached && Array.isArray(cached.rows) ? cached.rows : [],
                key: cacheKey
            };
        }

        const database = typeof getDatabase === 'function'
            ? getDatabase()
            : (typeof db !== 'undefined' ? db : null);

        if (!database) throw new Error('Firebase Database chưa sẵn sàng.');

        let snapshot = await database.ref(context.snapshotPath).once('value');
        let value = snapshot.val();

        // Chỉ gọi cơ chế snapshot Meta khi chưa có snapshot usable.
        // Với ngày lịch sử, snapshot đã tồn tại thì dùng lại; không ép làm mới chỉ vì timestamp cũ.
        if (!value && typeof ensureMetaSnapshotFreshForContext === 'function') {
            await ensureMetaSnapshotFreshForContext(context, false, true).catch(() => null);
            snapshot = await database.ref(context.snapshotPath).once('value');
            value = snapshot.val();
        }

        if (token !== compareState.requestToken) return { rows: [], key: cacheKey };

        let rows = [];
        if (value && typeof normalizeMetaLiveRows === 'function') {
            rows = normalizeMetaLiveRows(
                value.rows || [],
                company,
                context.period,
                value.syncedAt || value.checkedAt || value.updatedAt || ''
            );
        }

        COMPARE_CACHE.set(cacheKey, {
            rows,
            checkedAt: Date.now(),
            period: context.period
        });

        return { rows, key: cacheKey };
    }

    async function loadCompareRowsV158(force = false) {
        const comparePeriod = getComparePeriodV158();
        const company = typeof CURRENT_COMPANY !== 'undefined' ? CURRENT_COMPANY : 'NNV';
        const today = toIsoDateV158(new Date());

        if (!comparePeriod || !today) return [];

        const todayPeriod = { from: today, to: today };
        const token = ++compareState.requestToken;

        compareState.loading = true;
        compareState.error = '';
        updateKpiComparisonV158();

        try {
            const [todayResult, compareResult] = await Promise.all([
                loadSinglePeriodRowsV161(todayPeriod, company, force, token),
                loadSinglePeriodRowsV161(comparePeriod, company, force, token)
            ]);

            if (token !== compareState.requestToken) return [];

            compareState.currentRows = todayResult.rows || [];
            compareState.currentKey = todayResult.key || '';
            compareState.rows = compareResult.rows || [];
            compareState.key = compareResult.key || '';
            compareState.error = '';
            compareState.loading = false;

            updateKpiComparisonV158();
            return compareState.rows;
        } catch (error) {
            if (token !== compareState.requestToken) return [];

            compareState.loading = false;
            compareState.error = error && error.message
                ? error.message
                : 'Không tải được dữ liệu so sánh.';
            compareState.currentRows = [];
            compareState.currentKey = '';
            compareState.rows = [];
            compareState.key = getCompareKeyV158();

            updateKpiComparisonV158();
            return [];
        }
    }

    let compareLoadTimerV158 = null;
    function scheduleCompareLoadV158(force = false, delay = 220) {
        clearTimeout(compareLoadTimerV158);
        compareLoadTimerV158 = setTimeout(() => loadCompareRowsV158(force), delay);
    }

    function datasetColorV158(dataset) {
        let color = dataset && (dataset.borderColor || dataset.backgroundColor) || '#1f6fff';
        if (Array.isArray(color)) color = color[0];
        return typeof color === 'string' ? color : '#1f6fff';
    }

    function renderHtmlLegendV158(chart, canvasId) {
        if (!chart || !canvasId) return;
        const canvas = document.getElementById(canvasId);
        const card = canvas && canvas.closest('.ads-chart-card');
        const chartCanvas = canvas && canvas.closest('.ads-chart-canvas');
        if (!card || !chartCanvas) return;

        let legend = card.querySelector('.ads-v158-chart-legend');
        if (!legend) {
            legend = document.createElement('div');
            legend.className = 'ads-v158-chart-legend';
            card.insertBefore(legend, chartCanvas);
        }

        const datasets = chart.data && Array.isArray(chart.data.datasets) ? chart.data.datasets : [];
        legend.innerHTML = datasets.map(dataset => {
            const color = datasetColorV158(dataset);
            const isBar = !dataset.type || dataset.type === 'bar';
            return `
                <span class="ads-v158-chart-legend-item">
                    <span class="ads-v158-chart-legend-mark ${isBar ? 'is-bar' : ''}" style="background:${escapeHtml(color)}"></span>
                    <span>${escapeHtml(dataset.label || '')}</span>
                </span>
            `;
        }).join('');

        if (chart.options && chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.display = false;
        }
    }

    function decoratePerfChartV158() {
        const chart = window.myAdsChart;
        const canvas = document.getElementById('chart-ads-perf');
        if (!chart || !canvas || chart.canvas !== canvas) return;

        try {
            const sortMode = typeof SORT_MODE !== 'undefined' ? SORT_MODE : 'spend';
            if (chart.options?.scales?.y?.ticks) {
                chart.options.scales.y.ticks.callback = value => {
                    if (sortMode === 'spend') return formatCompactMoneyAxisV158(value);
                    if (sortMode === 'cr') return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits:1 }).format(Number(value || 0))}%`;
                    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits:0 }).format(Number(value || 0));
                };
            }
            if (chart.options?.scales?.y1?.ticks) {
                chart.options.scales.y1.ticks.callback = value => formatCompactMoneyAxisV158(value);
            }
            renderHtmlLegendV158(chart, 'chart-ads-perf');
            chart.update('none');
        } catch (error) {}
    }

    function decorateFinanceChartV158() {
        const chart = window.myAdsChart;
        const canvas = document.getElementById('chart-ads-fin');
        if (!chart || !canvas || chart.canvas !== canvas) return;

        try {
            if (chart.options?.scales?.y?.ticks) {
                chart.options.scales.y.ticks.callback = value => formatCompactMoneyAxisV158(value);
            }
            if (chart.options?.scales?.y1?.ticks) {
                chart.options.scales.y1.ticks.callback = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits:1 }).format(Number(value || 0));
            }
            renderHtmlLegendV158(chart, 'chart-ads-fin');
            chart.update('none');
        } catch (error) {}
    }

    function decorateTrendChartV158() {
        const chart = window.myAdsTrendChart;
        const canvas = document.getElementById('chart-ads-trend');
        if (!chart || !canvas || chart.canvas !== canvas) return;

        try {
            if (chart.options?.scales?.x?.ticks) {
                chart.options.scales.x.ticks.callback = value => formatCompactMoneyAxisV158(value);
            }
            if (chart.options?.scales?.y?.ticks) {
                chart.options.scales.y.ticks.callback = value => formatCompactMoneyAxisV158(value);
            }
            chart.update('none');
        } catch (error) {}
    }

    function wrapChartFunctionsV158() {
        if (window.__ADS_V158_CHART_WRAPPED__) return;
        if (typeof drawChartPerf !== 'function' || typeof drawChartFin !== 'function') return;
        window.__ADS_V158_CHART_WRAPPED__ = true;

        const originalPerf = drawChartPerf;
        drawChartPerf = function(data) {
            const result = originalPerf.apply(this, arguments);
            setTimeout(decoratePerfChartV158, 0);
            return result;
        };

        const originalFin = drawChartFin;
        drawChartFin = function(data) {
            const result = originalFin.apply(this, arguments);
            setTimeout(decorateFinanceChartV158, 0);
            return result;
        };

        if (typeof drawChartTrend === 'function') {
            const originalTrend = drawChartTrend;
            drawChartTrend = function(data) {
                const result = originalTrend.apply(this, arguments);
                setTimeout(decorateTrendChartV158, 0);
                return result;
            };
        }
    }

    function ensureUiV158() {
        injectStyleV158();
        ensureFilterControlsV158();
        moveSearchInlineV158();
        wrapChartFunctionsV158();

        // Xóa hẳn nút cập nhật Meta khỏi DOM; updateMetaLiveStatus vốn đã kiểm tra null.
        const refreshButton = document.getElementById('meta-live-refresh-btn');
        if (refreshButton) refreshButton.remove();

        const systemStatus = document.querySelector('#ads-analysis-result .ads-topbar-status');
        if (systemStatus) systemStatus.setAttribute('aria-hidden', 'true');

        updateRangeButtonV158();
        updateCompareNoteV158();
    }

    // Đồng bộ lại KPI mini trend sau các lần render dữ liệu chính.
    function wrapApplyFiltersV158() {
        if (window.__ADS_V158_APPLY_FILTERS_WRAPPED__) return;
        if (typeof applyFilters !== 'function') return;
        window.__ADS_V158_APPLY_FILTERS_WRAPPED__ = true;
        const original = applyFilters;
        applyFilters = function() {
            const result = original.apply(this, arguments);
            setTimeout(() => {
                ensureUiV158();
                updateKpiComparisonV158();
            }, 0);
            return result;
        };
    }

    function afterPrimaryPeriodMayChangeV158() {
        setTimeout(() => {
            updateRangeButtonV158();
            invalidateCompareV158();
            scheduleCompareLoadV158(true, 100);
        }, 90);
    }

    function bindGlobalDelegationV158() {
        if (window.__ADS_V158_DELEGATION_BOUND__) return;
        window.__ADS_V158_DELEGATION_BOUND__ = true;

        document.addEventListener('click', event => {
            const inside = event.target && event.target.closest
                ? event.target.closest('.ads-v158-range-item,.ads-v158-compare-item')
                : null;
            if (!inside) closeAllPopoversV158();

            const target = event.target && event.target.closest
                ? event.target.closest('#btn-tab-perf,#btn-tab-fin,#btn-tab-trend,#btn-tab-report,.report-clear-btn')
                : null;
            if (!target) return;

            if (target.classList.contains('report-clear-btn')) {
                compareState.mode = '7d';
                compareState.customFrom = '';
                compareState.customTo = '';
                setTimeout(() => {
                    const select = document.getElementById('ads-v158-compare-mode');
                    if (select) select.value = '7d';
                    afterPrimaryPeriodMayChangeV158();
                }, 40);
            } else {
                setTimeout(() => {
                    ensureUiV158();
                    updateKpiComparisonV158();
                    decoratePerfChartV158();
                    decorateFinanceChartV158();
                }, 160);
            }
        });

        document.addEventListener('change', event => {
            const id = event.target && event.target.id;
            if (id === 'company-selector' || id === 'report-month-filter') {
                afterPrimaryPeriodMayChangeV158();
            }
        });
    }

    function bootV158() {
        ensureUiV158();
        wrapApplyFiltersV158();
        bindGlobalDelegationV158();
        scheduleCompareLoadV158(false, 350);
        setTimeout(decoratePerfChartV158, 350);
        setTimeout(decorateFinanceChartV158, 350);
        setTimeout(decorateTrendChartV158, 350);
    }

    // resetInterface có thể dựng lại DOM; theo dõi và tái áp dụng UI.
    let observerTimerV158 = null;
    const observerV158 = new MutationObserver(() => {
        clearTimeout(observerTimerV158);
        observerTimerV158 = setTimeout(() => {
            if (document.querySelector('#ads-analysis-result .ads-enterprise-shell')) {
                ensureUiV158();
                wrapApplyFiltersV158();
            }
        }, 35);
    });

    function startObserverV158() {
        const root = document.getElementById('page-ads') || document.body;
        if (root) observerV158.observe(root, { childList:true, subtree:true });
    }

    // V157 còn có timer ghi style muộn; V158 cố tình áp lại sau các mốc này.
    bootV158();
    setTimeout(bootV158, 120);
    setTimeout(bootV158, 520);
    setTimeout(bootV158, 1050);
    setTimeout(bootV158, 2100);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            startObserverV158();
            setTimeout(bootV158, 40);
        }, { once:true });
    } else {
        startObserverV158();
    }

    window.addEventListener('load', () => {
        setTimeout(bootV158, 180);
        setTimeout(bootV158, 1150);
    });

    window.refreshAdsKpiComparison = function() {
        invalidateCompareV158();
        return loadCompareRowsV158(true);
    };

    window.getAdsComparePeriod = function() {
        return getComparePeriodV158();
    };
})();

/* =========================================================
   V161 MOBILE + FILTER + SEARCH ALIGNMENT FIX
   - Mobile: tab không che bộ lọc.
   - Mobile: xóa khoảng trống lớn giữa header Quảng cáo và tab.
   - Desktop: khôi phục cảm giác bố cục ban đầu:
     tiêu đề + Tổng quan/Marketing bên trái, search độc lập bên phải,
     nhưng cùng một hàng và thẳng hàng.
   - Mobile search: placeholder ngắn "Tìm...".
   ========================================================= */
(function installAdsV161ResponsiveAlignmentFix() {
    const STYLE_ID = 'ads-v161-responsive-alignment-fix';

    function injectV161Style() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* ===== DESKTOP: KHÔI PHỤC HEADER BẢNG META LIVE SẠCH ===== */
            html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head {
                display:flex !important;
                flex-direction:row !important;
                align-items:flex-end !important;
                justify-content:space-between !important;
                gap:14px !important;
                width:100% !important;
                min-width:0 !important;
                flex-wrap:nowrap !important;
            }

            html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head > div:first-child {
                flex:1 1 auto !important;
                min-width:0 !important;
                max-width:calc(100% - 360px) !important;
            }

            html body #ads-analysis-result #tab-performance .ads-data-card .ads-section-kicker {
                display:block !important;
                margin:0 0 5px !important;
            }

            html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs {
                display:flex !important;
                flex-direction:row !important;
                align-items:center !important;
                justify-content:flex-start !important;
                gap:10px !important;
                width:auto !important;
                min-width:0 !important;
                max-width:100% !important;
                flex-wrap:nowrap !important;
            }

            html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs > h2 {
                flex:0 1 auto !important;
                min-width:0 !important;
                margin:0 !important;
                white-space:nowrap !important;
                overflow:hidden !important;
                text-overflow:ellipsis !important;
            }

            html body #ads-analysis-result #tab-performance .ads-inline-scope-tabs {
                flex:0 0 auto !important;
                display:inline-flex !important;
                width:auto !important;
                min-width:auto !important;
                height:34px !important;
                padding:3px !important;
                gap:3px !important;
                border-radius:9px !important;
                white-space:nowrap !important;
            }

            html body #ads-analysis-result #tab-performance .ads-inline-scope-tab {
                min-height:28px !important;
                height:28px !important;
                padding:0 10px !important;
                line-height:28px !important;
                border-radius:7px !important;
            }

            html body #ads-analysis-result #tab-performance .meta-live-search-area {
                position:relative !important;
                flex:0 1 430px !important;
                width:430px !important;
                min-width:280px !important;
                max-width:430px !important;
                margin:0 !important;
                align-self:flex-end !important;
            }

            html body #ads-analysis-result #tab-performance .meta-live-search-shell {
                width:100% !important;
                min-height:34px !important;
                height:34px !important;
                border-radius:9px !important;
                padding-top:3px !important;
                padding-bottom:3px !important;
            }

            /* Không để search hoặc dropdown gợi ý chèn vào/đè lên cụm tab. */
            html body #ads-analysis-result #tab-performance .meta-live-search-suggestions {
                top:39px !important;
                left:0 !important;
                right:0 !important;
                width:100% !important;
            }

            /* ===== LAPTOP NHỎ: vẫn cùng hàng nếu còn đủ chỗ ===== */
            @media (max-width:1360px) and (min-width:1025px) {
                html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head > div:first-child {
                    max-width:calc(100% - 315px) !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-area {
                    flex-basis:300px !important;
                    width:300px !important;
                    min-width:250px !important;
                    max-width:300px !important;
                }

                html body #ads-analysis-result #tab-performance .ads-inline-scope-tab {
                    padding-left:8px !important;
                    padding-right:8px !important;
                }
            }

            /* ===== MOBILE / TABLET ===== */
            @media (max-width:1024px) {
                /* Xóa mọi khoảng trống dư từ page/module cũ. */
                html body #page-ads,
                html body #page-ads .section-box,
                html body #page-ads .section-content,
                html body #page-ads #ads-analysis-result,
                html body #ads-analysis-result,
                html body #ads-analysis-result .ads-enterprise-shell {
                    margin-top:0 !important;
                    padding-top:0 !important;
                    top:auto !important;
                    min-height:0 !important;
                }

                html body #page-ads {
                    transform:none !important;
                }

                /* Quan trọng: sidebar mobile nằm trong flow bình thường.
                   Không sticky/fixed nên không thể che bộ lọc phía dưới. */
                html body #ads-analysis-result .ads-enterprise-shell {
                    display:flex !important;
                    flex-direction:column !important;
                    align-items:stretch !important;
                    gap:0 !important;
                    background:#f3f6f9 !important;
                }

                html body #ads-analysis-result .ads-enterprise-sidebar {
                    position:relative !important;
                    inset:auto !important;
                    top:auto !important;
                    left:auto !important;
                    right:auto !important;
                    bottom:auto !important;
                    order:0 !important;
                    z-index:20 !important;
                    width:100% !important;
                    height:auto !important;
                    min-height:0 !important;
                    margin:0 !important;
                    padding:7px 8px !important;
                    border:0 !important;
                    border-bottom:1px solid #dfe6ee !important;
                    border-radius:0 !important;
                    box-shadow:none !important;
                    overflow:visible !important;
                    background:#fff !important;
                }

                html body #ads-analysis-result .ads-enterprise-main {
                    position:relative !important;
                    order:1 !important;
                    z-index:1 !important;
                    width:100% !important;
                    min-width:0 !important;
                    margin:0 !important;
                    padding:8px 9px 12px !important;
                }

                /* Tab luôn 1 hàng, gọn hơn và không phủ content. */
                html body #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                    display:grid !important;
                    grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                    gap:4px !important;
                    width:100% !important;
                    margin:0 !important;
                    padding:0 !important;
                    overflow:visible !important;
                }

                html body #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                    min-width:0 !important;
                    width:100% !important;
                    min-height:44px !important;
                    height:44px !important;
                    padding:5px 6px !important;
                    gap:5px !important;
                    justify-content:center !important;
                    border-radius:9px !important;
                }

                html body #ads-analysis-result .ads-nav-icon {
                    width:25px !important;
                    height:25px !important;
                    flex:0 0 25px !important;
                    font-size:11px !important;
                    border-radius:7px !important;
                }

                html body #ads-analysis-result .ads-nav-copy {
                    display:block !important;
                    min-width:0 !important;
                }

                html body #ads-analysis-result .ads-nav-copy b {
                    font-size:9.5px !important;
                    white-space:nowrap !important;
                    overflow:hidden !important;
                    text-overflow:ellipsis !important;
                }

                html body #ads-analysis-result .ads-nav-copy small,
                html body #ads-analysis-result .ads-sidebar-activity,
                html body #ads-analysis-result .ads-sidebar-help,
                html body #ads-analysis-result .ads-sidebar-brand,
                html body #ads-analysis-result .ads-sidebar-toggle {
                    display:none !important;
                }

                /* Bộ lọc luôn nằm sau tab, không thể trượt lên dưới tab. */
                html body #ads-analysis-result .ads-command-bar {
                    position:relative !important;
                    z-index:2 !important;
                    clear:both !important;
                    width:100% !important;
                    margin:0 !important;
                    padding:9px !important;
                    overflow:visible !important;
                }

                /* Popover ngày mở phía trên các card, không bị cắt. */
                html body #ads-analysis-result .ads-v158-popover,
                html body #ads-analysis-result .ads-v158-compare-note {
                    z-index:200 !important;
                }

                /* Header bảng Meta Live: mobile xếp sạch thành 2 hàng,
                   tab scope không bị search đè. */
                html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head {
                    display:flex !important;
                    flex-direction:column !important;
                    align-items:stretch !important;
                    justify-content:flex-start !important;
                    gap:7px !important;
                }

                html body #ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head > div:first-child {
                    width:100% !important;
                    max-width:100% !important;
                    min-width:0 !important;
                }

                html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs {
                    width:100% !important;
                    min-width:0 !important;
                    display:flex !important;
                    align-items:center !important;
                    gap:7px !important;
                    flex-wrap:nowrap !important;
                }

                html body #ads-analysis-result #tab-performance .ads-title-with-scope-tabs > h2 {
                    flex:1 1 auto !important;
                    min-width:0 !important;
                    white-space:nowrap !important;
                    overflow:hidden !important;
                    text-overflow:ellipsis !important;
                }

                html body #ads-analysis-result #tab-performance .ads-inline-scope-tabs {
                    flex:0 0 auto !important;
                    width:auto !important;
                    height:32px !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-area {
                    flex:none !important;
                    width:100% !important;
                    min-width:0 !important;
                    max-width:none !important;
                    margin:0 !important;
                    align-self:stretch !important;
                }

                html body #ads-analysis-result #tab-performance .meta-live-search-shell {
                    width:100% !important;
                    height:34px !important;
                    min-height:34px !important;
                }

                html body #ads-analysis-result .meta-live-search-hint {
                    display:none !important;
                }
            }

            @media (max-width:640px) {
                /* Trên điện thoại giữ 4 tab một hàng nhưng giảm chữ/icon. */
                html body #ads-analysis-result .ads-tabs.ads-sidebar-nav {
                    grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                }

                html body #ads-analysis-result .ads-sidebar-nav .ads-tab-btn {
                    min-height:42px !important;
                    height:42px !important;
                    padding:4px 3px !important;
                    gap:4px !important;
                }

                html body #ads-analysis-result .ads-nav-icon {
                    width:23px !important;
                    height:23px !important;
                    flex-basis:23px !important;
                    font-size:10px !important;
                }

                html body #ads-analysis-result .ads-nav-copy b {
                    font-size:8.8px !important;
                }

                /* Không hiển thị ghi chú dài "Tìm tên chiến dịch..." */
                html body #ads-analysis-result #meta-live-search-input::placeholder {
                    color:#8b99a8 !important;
                }

                html body #ads-analysis-result .ads-command-bar {
                    margin-top:0 !important;
                    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                    gap:7px !important;
                }

                html body #ads-analysis-result .ads-command-item label {
                    font-size:8px !important;
                }
            }

            @media (max-width:430px) {
                html body #ads-analysis-result .ads-command-bar {
                    grid-template-columns:1fr 1fr !important;
                }

                html body #ads-analysis-result .ads-inline-scope-tab {
                    padding-left:7px !important;
                    padding-right:7px !important;
                    font-size:9px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function normalizeCompareLabelsV161() {
        const select = document.getElementById('ads-v158-compare-mode');
        if (select) {
            const option7 = select.querySelector('option[value="7d"]');
            const option30 = select.querySelector('option[value="30d"]');
            if (option7) option7.textContent = '7 ngày trước';
            if (option30) option30.textContent = '30 ngày trước';
        }
    }

    function rehomeSearchV161() {
        const head = document.querySelector(
            '#ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head'
        );
        const search = document.getElementById('meta-live-search-area');
        if (!head || !search) return false;

        // Search là sibling độc lập của block tiêu đề/tab.
        if (search.parentElement !== head) head.appendChild(search);
        return true;
    }

    function shortenMobileSearchPlaceholderV161() {
        const input = document.getElementById('meta-live-search-input');
        if (!input) return;

        const mobile = !!(
            window.matchMedia &&
            window.matchMedia('(max-width:640px)').matches
        );

        if (mobile && (!input.value || document.activeElement !== input)) {
            input.placeholder = 'Tìm...';
        }
    }

    function applyV161Fix() {
        injectV161Style();
        normalizeCompareLabelsV161();
        rehomeSearchV161();
        shortenMobileSearchPlaceholderV161();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV161Fix, 55);
    });

    function bootV161() {
        applyV161Fix();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.adsV161Observer) {
            root.dataset.adsV161Observer = '1';
            observer.observe(root, {
                childList:true,
                subtree:true
            });
        }

        setTimeout(applyV161Fix, 120);
        setTimeout(applyV161Fix, 550);
        setTimeout(applyV161Fix, 1300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootV161, { once:true });
    } else {
        bootV161();
    }

    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(applyV161Fix, 100);
    });
})();
