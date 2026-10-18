/* V322 ADS UI — JavaScript renderer only. Static Ads HTML/CSS lives in Blogger. */
/* V321 SAFE SEPARATION: CSS lives in Blogger; this file keeps UI/data behavior only. */
/* V321 FRONTEND UI: based on V320, Blogger CSS separated. */
/* V317 FRONTEND PART 2: source-fidelity poster selector — ảnh Fanpage gốc > Ad Images > attachment/full_picture > rendered > thumbnail. */
(function installAdsV157SalesConsoleLayout() {
    const STYLE_ID = 'ads-v157-sales-console-layout';

    function ensureOverrideStyleLast() {
        const oldStyle = document.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */
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
   V188 AFTER SPEND SIGNATURE FIX
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
    const COMPARE_MODE_STORAGE_V260 = 'MKT_ADS_COMPARE_MODE_V260';

    function readCompareModePreferenceV260() {
        try {
            const saved = String(localStorage.getItem(COMPARE_MODE_STORAGE_V260) || '').trim();
            if (['previous','yesterday','week','month','custom'].includes(saved)) return saved;
        } catch (error) {}
        return 'month';
    }

    function saveCompareModePreferenceV260(mode) {
        try {
            if (['previous','yesterday','week','month','custom'].includes(String(mode || ''))) {
                localStorage.setItem(COMPARE_MODE_STORAGE_V260, String(mode));
            }
        } catch (error) {}
    }

    const compareState = {
        mode: readCompareModePreferenceV260(),
        customFrom: '',
        customTo: '',
        loading: false,
        rows: [],
        key: '',
        currentRows: [],
        currentKey: '',
        error: '',
        requestToken: 0,
        startupRetryCountV221: 0
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
        const primary = getPrimaryPeriodV158();
        if (!primary || !primary.from || !primary.to) return;

        if (!compareState.customFrom || !compareState.customTo) {
            const days = diffDaysInclusiveV168(
                primary.from,
                primary.to
            );

            const compareTo = shiftIsoDateV158(
                primary.from,
                -1
            );

            const compareFrom = shiftIsoDateV158(
                compareTo,
                -(Math.max(1,days) - 1)
            );

            if (!compareState.customFrom) {
                compareState.customFrom = compareFrom;
            }
            if (!compareState.customTo) {
                compareState.customTo = compareTo;
            }
        }
    }

    function diffDaysInclusiveV168(fromIso, toIso) {
        const from = parseIsoDateV158(fromIso);
        const to = parseIsoDateV158(toIso);
        if (!from || !to || to < from) return 0;
        return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
    }

    function shiftMonthClampedV168(iso, monthOffset) {
        const date = parseIsoDateV158(iso);
        if (!date) return '';

        const originalDay = date.getDate();
        const target = new Date(
            date.getFullYear(),
            date.getMonth() + Number(monthOffset || 0),
            1,
            12,0,0,0
        );

        const lastDay = new Date(
            target.getFullYear(),
            target.getMonth() + 1,
            0,
            12,0,0,0
        ).getDate();

        target.setDate(Math.min(originalDay, lastDay));
        return toIsoDateV158(target);
    }

    function getComparePeriodV158() {
        const primary = getPrimaryPeriodV158();
        if (!primary || !primary.from || !primary.to || primary.from > primary.to) {
            return null;
        }

        if (compareState.mode === 'custom') {
            ensureDefaultCustomCompareV158();

            if (!compareState.customFrom || !compareState.customTo) return null;
            if (compareState.customFrom > compareState.customTo) return null;

            return {
                from: compareState.customFrom,
                to: compareState.customTo,
                label: 'kỳ tùy chọn',
                shortLabel:
                    `${formatDateShortV158(compareState.customFrom)} – ` +
                    `${formatDateShortV158(compareState.customTo)}`
            };
        }

        if (compareState.mode === 'yesterday') {
            const yesterday = shiftIsoDateV158(toIsoDateV158(new Date()), -1);

            return {
                from: yesterday,
                to: yesterday,
                label: 'hôm qua',
                shortLabel: formatDateShortV158(yesterday)
            };
        }

        if (compareState.mode === 'week') {
            const from = shiftIsoDateV158(primary.from, -7);
            const to = shiftIsoDateV158(primary.to, -7);

            return {
                from,
                to,
                label: 'cùng kỳ tuần trước',
                shortLabel:
                    `${formatDateShortV158(from)} – ${formatDateShortV158(to)}`
            };
        }

        if (compareState.mode === 'month') {
            const from = shiftMonthClampedV168(primary.from, -1);
            const to = shiftMonthClampedV168(primary.to, -1);

            return {
                from,
                to,
                label: 'cùng kỳ tháng trước',
                shortLabel:
                    `${formatDateShortV158(from)} – ${formatDateShortV158(to)}`
            };
        }

        // Mặc định chuẩn dashboard:
        // Kỳ đang xem được so với một khoảng LIỀN TRƯỚC có đúng cùng số ngày.
        const days = diffDaysInclusiveV168(primary.from, primary.to);
        if (!days) return null;

        const to = shiftIsoDateV158(primary.from, -1);
        const from = shiftIsoDateV158(to, -(days - 1));

        return {
            from,
            to,
            label: 'kỳ liền trước',
            shortLabel:
                `${formatDateShortV158(from)} – ${formatDateShortV158(to)}`
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
        style.textContent = ''; /* V321 CSS lives in Blogger */
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

        const primary = getPrimaryPeriodV158();
        const period = getComparePeriodV158();

        if (!primary || !period) {
            note.textContent = 'Khoảng so sánh chưa hợp lệ.';
            return;
        }

        const currentLabel =
            `${formatDateShortV158(primary.from)} – ` +
            `${formatDateShortV158(primary.to)}`;

        const compareLabel =
            `${formatDateShortV158(period.from)} – ` +
            `${formatDateShortV158(period.to)}`;

        note.textContent =
            `${currentLabel} so với ${compareLabel} (${period.label})`;
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

        const today = toIsoDateV158(new Date());
        if (today && to > today) {
            if (typeof showToast === 'function') showToast('Ngày kết thúc không được lớn hơn hôm nay.', 'error');
            return;
        }

        // Đồng bộ vào toàn bộ state cũ để các hàm V156/V163 vẫn đọc đúng kỳ.
        const fromInput = document.getElementById('date-from');
        const toInput = document.getElementById('date-to');
        const monthInput = document.getElementById('report-month-filter');

        if (fromInput) fromInput.value = from;
        if (toInput) toInput.value = to;

        DATE_FROM = from;
        DATE_TO = to;
        // V297: bộ chọn Khoảng ngày và ô Kỳ báo cáo phải cùng ngữ cảnh tháng.
        // Kỳ báo cáo lấy tháng của ngày kết thúc, trong khi DATE_FROM/DATE_TO
        // vẫn giữ nguyên để Meta/Tài chính dùng đúng khoảng chi tiết.
        const syncedMonthV297 = syncReportMonthFromDateRangeV297(from, to);
        if (monthInput) monthInput.value = syncedMonthV297;
        PERIOD_FILTER_USER_CHANGED = true;

        ACTIVE_BATCH_ID = null;
        USER_EXPLICIT_VIEW_ALL = true;

        updateRangeButtonV158();
        closeAllPopoversV158();
        invalidateCompareV158();

        try {
            if (typeof syncPeriodFilterControls === 'function') {
                syncPeriodFilterControls();
            }
        } catch (error) {}

        try {
            if (typeof renderHistoryUI === 'function') renderHistoryUI();
        } catch (error) {}

        // V164: thay kỳ Meta phải tháo listener cũ trước,
        // nếu không có thể tiếp tục nhìn snapshot của khoảng ngày trước đó.
        if (CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
            try {
                if (typeof unbindMetaLiveSnapshot === 'function') {
                    unbindMetaLiveSnapshot();
                }
            } catch (error) {}

            try {
                META_LIVE_CURRENT_SNAPSHOT = null;
                META_LIVE_LAST_APPLIED_KEY = '';
                META_LIVE_STATE.key = '';
                META_LIVE_STATE.from = from;
                META_LIVE_STATE.to = to;
            } catch (error) {}

            // Giữ UI phản hồi ngay rằng kỳ đã đổi.
            try {
                if (typeof clearMetaLiveView === 'function') clearMetaLiveView();
            } catch (error) {}

            Promise.resolve()
                .then(() => CURRENT_TAB === 'finance' ? reloadCurrentFinanceSourceV297() : false)
                .then(() => refreshMetaLive(false, false))
                .then(() => {
                    try { if (typeof applyFilters === 'function') applyFilters(); } catch (error) {}
                    if (CURRENT_TAB === 'finance') {
                        try { renderMetaLiveFinanceSourceStatus(); } catch (error) {}
                    }
                })
                .catch(error => {
                    console.warn('Không áp dụng được Khoảng ngày Meta Live:', error && error.message ? error.message : error);
                    if (typeof showToast === 'function') {
                        showToast(
                            `Không tải được dữ liệu ${formatDateShortV158(from)} – ${formatDateShortV158(to)}.`,
                            'error'
                        );
                    }
                });
        } else if (CURRENT_TAB === 'report') {
            try {
                if (typeof unbindMetaLiveReportSnapshots === 'function') {
                    unbindMetaLiveReportSnapshots();
                }
            } catch (error) {}

            Promise.resolve()
                .then(() => refreshMetaLiveReport(false, true))
                .then(() => {
                    if (typeof renderReportPreview === 'function') renderReportPreview();
                })
                .catch(error => {
                    console.warn('Không áp dụng được Khoảng ngày báo cáo:', error && error.message ? error.message : error);
                });
        } else {
            // Ma trận vẫn dùng dữ liệu upload lịch sử.
            if (typeof applyFilters === 'function') applyFilters();
        }

        // So sánh KPI là luồng riêng.
        scheduleCompareLoadV158(true, 220);

        if (typeof showToast === 'function') {
            showToast(
                `Đã chọn ${formatDateShortV158(from)} – ${formatDateShortV158(to)}`,
                'success'
            );
        }
    }

    function applyCustomCompareV158(from, to) {
        if (!from || !to || from > to) {
            if (typeof showToast === 'function') showToast('Khoảng ngày so sánh không hợp lệ.', 'error');
            return;
        }
        compareState.mode = 'custom';
        saveCompareModePreferenceV260('custom');
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
                    <option value="previous">Kỳ liền trước</option>
                    <option value="yesterday">Hôm qua</option>
                    <option value="week">Cùng kỳ tuần trước</option>
                    <option value="month">Cùng kỳ tháng trước</option>
                    <option value="custom">Tùy chọn</option>
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
        const primaryPopover = document.getElementById('ads-v158-date-range-popover');
        const primaryPopoverOpen = !!(
            primaryPopover &&
            primaryPopover.classList.contains('open')
        );
        const primaryEditing = !!(
            (primaryFrom && primaryFrom.dataset.v165Dirty === '1') ||
            (primaryTo && primaryTo.dataset.v165Dirty === '1') ||
            document.activeElement === primaryFrom ||
            document.activeElement === primaryTo
        );

        // V165: tuyệt đối không ghi đè ngày người dùng đang chọn.
        if (!primaryPopoverOpen && !primaryEditing) {
            if (primaryFrom && primary) primaryFrom.value = primary.from || '';
            if (primaryTo && primary) primaryTo.value = primary.to || '';
        }

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
                    const today = toIsoDateV158(new Date());

                    if (from) {
                        from.dataset.v165Dirty = '0';
                        if (today) from.max = today;
                        if (primary) from.value = primary.from || '';
                    }
                    if (to) {
                        to.dataset.v165Dirty = '0';
                        if (today) to.max = today;
                        if (primary) to.value = primary.to || '';
                    }

                    popover.classList.add('open');
                    rangeButton.classList.add('is-open');
                    rangeButton.setAttribute('aria-expanded', 'true');
                }
            });
        }

        const primaryDateInputs = [
            document.getElementById('ads-v158-primary-from'),
            document.getElementById('ads-v158-primary-to')
        ].filter(Boolean);

        primaryDateInputs.forEach(input => {
            if (input.dataset.boundDateV165 === '1') return;
            input.dataset.boundDateV165 = '1';

            const today = toIsoDateV158(new Date());
            if (today) input.max = today;

            const markDirty = () => {
                input.dataset.v165Dirty = '1';
            };

            input.addEventListener('input', markDirty);
            input.addEventListener('change', markDirty);
            input.addEventListener('focus', markDirty);

            // Toàn bộ ô ngày có thể bấm để mở lịch trên Chrome/Edge/Android.
            input.addEventListener('click', event => {
                event.stopPropagation();
                markDirty();
                try {
                    if (typeof input.showPicker === 'function') input.showPicker();
                } catch (error) {
                    // Trình duyệt không hỗ trợ showPicker vẫn dùng hành vi native.
                }
            });

            input.addEventListener('pointerdown', event => {
                event.stopPropagation();
            });
        });

        const primaryApply = document.getElementById('ads-v158-primary-apply');
        if (primaryApply && primaryApply.dataset.boundV158 !== '1') {
            primaryApply.dataset.boundV158 = '1';
            primaryApply.addEventListener('click', () => {
                const fromInput = document.getElementById('ads-v158-primary-from');
                const toInput = document.getElementById('ads-v158-primary-to');
                const fromValue = fromInput?.value || '';
                const toValue = toInput?.value || '';

                if (fromInput) fromInput.dataset.v165Dirty = '0';
                if (toInput) toInput.dataset.v165Dirty = '0';

                applyPrimaryRangeV158(fromValue, toValue);
            });
        }

        const compareSelect = document.getElementById('ads-v158-compare-mode');
        if (compareSelect && compareSelect.dataset.boundV158 !== '1') {
            compareSelect.dataset.boundV158 = '1';
            compareSelect.addEventListener('change', () => {
                compareState.mode =
                    compareSelect.value === 'yesterday'
                        ? 'yesterday'
                        : (
                            compareSelect.value === 'week'
                                ? 'week'
                                : (
                                    compareSelect.value === 'month'
                                        ? 'month'
                                        : (
                                            compareSelect.value === 'custom'
                                                ? 'custom'
                                                : 'previous'
                                        )
                                )
                        );

                saveCompareModePreferenceV260(compareState.mode);
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
            button.addEventListener('click', () => {
                const fromInput = document.getElementById('ads-v158-primary-from');
                const toInput = document.getElementById('ads-v158-primary-to');
                if (fromInput) fromInput.dataset.v165Dirty = '0';
                if (toInput) toInput.dataset.v165Dirty = '0';
                closeAllPopoversV158();
            });
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
        // V168: đây là BIỂU ĐỒ SO SÁNH 2 KỲ, không phải sparkline xu hướng.
        // Hai thanh tránh tạo cảm giác giả rằng dữ liệu "đi lên/đi xuống" theo ngày.
        const width = 86;
        const height = 28;
        const previousValue = Math.max(0, Number(previous || 0));
        const currentValue = Math.max(0, Number(current || 0));
        const max = Math.max(previousValue, currentValue, 1);

        const maxWidth = 58;
        const prevWidth = Math.max(
            previousValue > 0 ? 3 : 0,
            (previousValue / max) * maxWidth
        );
        const curWidth = Math.max(
            currentValue > 0 ? 3 : 0,
            (currentValue / max) * maxWidth
        );

        const currentColor = color || '#1f6fff';

        return `
            <svg class="ads-v158-kpi-spark ads-v168-kpi-compare-bars"
                 viewBox="0 0 ${width} ${height}"
                 preserveAspectRatio="none"
                 aria-hidden="true">
                <text x="1" y="9" font-size="5.8" fill="#94a3b8">Trước</text>
                <rect x="25" y="4" width="${prevWidth.toFixed(2)}" height="6" rx="3" fill="#cbd5e1"></rect>

                <text x="1" y="22" font-size="5.8" fill="#64748b">Nay</text>
                <rect x="25" y="17" width="${curWidth.toFixed(2)}" height="6" rx="3" fill="${currentColor}"></rect>
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

        // V168: so sánh đúng 2 khoảng thời gian tương đương.
        // KPI chính và % tăng/giảm cùng dùng kỳ đang xem, không trộn tổng kỳ với dữ liệu 1 ngày.
        const currentRows = Array.isArray(compareState.currentRows)
            ? compareState.currentRows
            : [];
        const compareRows = Array.isArray(compareState.rows)
            ? compareState.rows
            : [];

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

        const currentPeriodKey =
            currentPeriod && currentPeriod.from && currentPeriod.to
                ? `${currentPeriod.from}_${currentPeriod.to}`
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
        compareState.startupRetryCountV221 = 0;
    }

    async function loadSinglePeriodRowsV161(period, company, force, token) {
        if (!period || !period.from || !period.to) return { rows: [], key: '' };

        const context = buildCompareContextV158(company, period);
        const cacheKey = context.requestKey;

        // force ở lớp so sánh chỉ có nghĩa là bỏ memo của COMPARE_CACHE.
        // Không được biến thao tác đổi bộ lọc thành "force Meta", vì V215 đã tự quyết định:
        // - kỳ có hôm nay: sessionStorage + TTL server 5 phút;
        // - kỳ quá khứ: IndexedDB, không refresh 5 phút, chốt lại sau cuối tháng +50h.
        if (!force && COMPARE_CACHE.has(cacheKey)) {
            const cached = COMPARE_CACHE.get(cacheKey);
            return {
                rows: cached && Array.isArray(cached.rows) ? cached.rows : [],
                key: cacheKey
            };
        }

        if (token !== compareState.requestToken) {
            return { rows: [], key: cacheKey };
        }

        // Nếu đúng kỳ chính đang hiển thị và Meta Live đã có kết quả, dùng ngay dữ liệu đó.
        // Việc này tránh request lặp khi KPI so sánh khởi tạo cùng lúc với bảng chính.
        try {
            const mainReady = (
                typeof META_LIVE_STATE !== 'undefined' &&
                META_LIVE_STATE &&
                META_LIVE_STATE.key === cacheKey &&
                META_LIVE_STATE.loading === false &&
                typeof META_LIVE_DATA !== 'undefined' &&
                Array.isArray(META_LIVE_DATA)
            );

            if (mainReady) {
                const mainRows = META_LIVE_DATA.slice();
                COMPARE_CACHE.set(cacheKey, {
                    rows: mainRows,
                    checkedAt: Date.now(),
                    period: context.period,
                    source: 'meta_live_main_v215'
                });
                return { rows: mainRows, key: cacheKey };
            }
        } catch (error) {}

        // V216: period snapshot Firebase đã bị loại khỏi kiến trúc Meta V215.
        // So với kỳ phải đi qua API cache chung này để dùng đúng sessionStorage/IndexedDB/50h.
        if (typeof window.requestMetaSummaryCachedV215 !== 'function') {
            throw new Error('Meta Direct V215 chưa sẵn sàng cho dữ liệu so sánh.');
        }

        const entry = await window.requestMetaSummaryCachedV215({
            company: String(company || 'NNV').toUpperCase(),
            from: String(period.from || ''),
            to: String(period.to || ''),
            silent: true,
            force: false,
            skipSupportLedgers: true
        });

        if (token !== compareState.requestToken) {
            return { rows: [], key: cacheKey };
        }

        const rows = entry && Array.isArray(entry.rows)
            ? entry.rows
            : [];

        COMPARE_CACHE.set(cacheKey, {
            rows,
            checkedAt: Date.now(),
            period: context.period,
            source: 'meta_direct_v215',
            syncedAt: entry && entry.syncedAt ? entry.syncedAt : ''
        });

        return { rows, key: cacheKey };
    }

    async function loadCompareRowsV158(force = false) {
        const currentPeriod = getPrimaryPeriodV158();
        const comparePeriod = getComparePeriodV158();
        const company = typeof CURRENT_COMPANY !== 'undefined'
            ? CURRENT_COMPANY
            : 'NNV';

        if (
            !currentPeriod ||
            !currentPeriod.from ||
            !currentPeriod.to ||
            !comparePeriod
        ) return [];

        const token = ++compareState.requestToken;

        compareState.loading = true;
        compareState.error = '';
        updateKpiComparisonV158();

        try {
            const [currentResult, compareResult] = await Promise.all([
                loadSinglePeriodRowsV161(
                    currentPeriod,
                    company,
                    force,
                    token
                ),
                loadSinglePeriodRowsV161(
                    comparePeriod,
                    company,
                    force,
                    token
                )
            ]);

            if (token !== compareState.requestToken) return [];

            compareState.currentRows = currentResult.rows || [];
            compareState.currentKey = currentResult.key || '';
            compareState.rows = compareResult.rows || [];
            compareState.key = compareResult.key || '';
            compareState.error = '';
            compareState.loading = false;
            compareState.startupRetryCountV221 = 0;

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

            // Lần mở hệ thống đầu tiên có thể gặp Meta Bridge/Auth chưa sẵn sàng trong vài nhịp.
            // Chỉ retry ngắn cho lỗi khởi tạo; lỗi quyền tài khoản tuyệt đối không lặp request.
            const transientStartupV221 = /chưa sẵn sàng|bridge|chưa kết nối|không tìm thấy phiên đăng nhập|authentication chưa sẵn sàng/i.test(compareState.error || '');
            if (transientStartupV221 && compareState.startupRetryCountV221 < 4) {
                compareState.startupRetryCountV221 += 1;
                setTimeout(() => ensureCompareAutoLoadV221(), 260 * compareState.startupRetryCountV221);
            }
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
    // V221: lần đăng nhập đầu, Meta chính có thể sẵn sàng sau lần boot của khối So với.
    // Khi applyFilters được gọi từ applyDirectEntryV206, tự tải So với nếu còn thiếu.
    // Không force Meta; V215 vẫn tự dùng sessionStorage/IndexedDB/cache server.
    function ensureCompareAutoLoadV221() {
        if (compareState.loading) return;
        const currentPeriod = getPrimaryPeriodV158();
        const compareKey = getCompareKeyV158();
        const company = typeof CURRENT_COMPANY !== 'undefined' ? CURRENT_COMPANY : 'NNV';
        const currentKey = currentPeriod && currentPeriod.from && currentPeriod.to
            ? `${company}||${currentPeriod.from}||${currentPeriod.to}`
            : '';
        if (!currentKey || !compareKey) return;
        let mainReady = false;
        try {
            mainReady = !!(
                META_LIVE_STATE &&
                META_LIVE_STATE.loading === false &&
                !META_LIVE_STATE.error &&
                META_LIVE_STATE.key === currentKey &&
                Array.isArray(META_LIVE_DATA)
            );
        } catch (error) {}
        if (!mainReady) return;
        const needsLoad = !!(
            compareState.error ||
            !compareState.key ||
            compareState.key !== compareKey ||
            !compareState.currentKey ||
            compareState.currentKey !== currentKey
        );
        if (needsLoad) scheduleCompareLoadV158(false, 80);
    }

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
                ensureCompareAutoLoadV221();
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
                // V260: mặc định hệ thống là Cùng kỳ tháng trước.
                compareState.mode = 'month';
                saveCompareModePreferenceV260('month');
                compareState.customFrom = '';
                compareState.customTo = '';
                setTimeout(() => {
                    const select = document.getElementById('ads-v158-compare-mode');
                    if (select) select.value = 'month';
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
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    function normalizeCompareLabelsV161() {
        const select = document.getElementById('ads-v158-compare-mode');
        if (!select) return;

        const labels = {
            previous:'Kỳ liền trước',
            yesterday:'Hôm qua',
            week:'Cùng kỳ tuần trước',
            month:'Cùng kỳ tháng trước',
            custom:'Tùy chọn'
        };

        Object.keys(labels).forEach(value => {
            const option = select.querySelector(`option[value="${value}"]`);
            if (option) option.textContent = labels[value];
        });
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

/* =========================================================
   V162 SEARCH + SCOPE HEADER STABILITY FIX
   Mục tiêu:
   - Mobile: placeholder + số kết quả luôn nằm TRONG ô search.
   - Desktop: không mất "Danh sách bài quảng cáo".
   - "DỮ LIỆU CHI TIẾT" không bị gãy dòng.
   - Tổng quan / Marketing giữ nguyên hình dáng sạch như bản gốc.
   - Sticky thead không được đè lên scope tabs.
   ========================================================= */
(function installAdsV162SearchScopeHeaderFix() {
    const STYLE_ID = 'ads-v162-search-scope-header-fix';

    function injectV162Style() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    function rehomeSearchV162() {
        const head = document.querySelector(
            '#ads-analysis-result #tab-performance .ads-data-card .ads-content-card-head'
        );
        const search = document.getElementById('meta-live-search-area');
        if (!head || !search) return;

        // Search phải là sibling thứ 2 của block tiêu đề,
        // tuyệt đối không nằm trong .ads-title-with-scope-tabs.
        if (search.parentElement !== head) {
            head.appendChild(search);
        }
    }

    function enforceCompactPlaceholderV162() {
        const input = document.getElementById('meta-live-search-input');
        if (!input) return;

        const compact = !!(
            window.matchMedia &&
            window.matchMedia('(max-width:1024px)').matches
        );

        if (compact) {
            input.placeholder = 'Tìm...';
        }
    }

    function resetPerformanceTableScrollV162() {
        const scroller = document.querySelector(
            '#ads-analysis-result #tab-performance .ads-data-card > .table-responsive'
        );
        if (!scroller) return;
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
    }

    function applyV162() {
        injectV162Style();
        rehomeSearchV162();
        enforceCompactPlaceholderV162();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV162, 60);
    });

    function bootV162() {
        applyV162();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.adsV162Observer) {
            root.dataset.adsV162Observer = '1';
            observer.observe(root, {
                childList:true,
                subtree:true
            });
        }

        setTimeout(applyV162, 140);
        setTimeout(applyV162, 600);
        setTimeout(applyV162, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootV162, { once:true });
    } else {
        bootV162();
    }

    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(applyV162, 100);
    });

    /* Phòng trường hợp code cũ render lại search khi người dùng bấm scope tab. */
    document.addEventListener('click', event => {
        const scope = event.target && event.target.closest
            ? event.target.closest('[data-ads-scope-target="performance"]')
            : null;

        if (!scope) return;

        setTimeout(() => {
            resetPerformanceTableScrollV162();
            applyV162();
        }, 40);

        setTimeout(() => {
            resetPerformanceTableScrollV162();
            applyV162();
        }, 180);
    });
})();

/* =========================================================
   V163 FINANCE SCOPE HEADER GAP FIX
   Chỉ sửa tab Tài chính:
   - Tổng quan / Marketing giữ nguyên.
   - Khi chọn Tổng quan, header bảng không còn dính sát scope tabs.
   - Sticky thead không giữ vị trí cũ sau khi đổi scope.
   ========================================================= */
(function installAdsV163FinanceScopeHeaderFix() {
    const STYLE_ID = 'ads-v163-finance-scope-header-fix';

    function injectV163Style() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    function syncFinanceScopeClassV163() {
        const financeTab = document.getElementById('tab-finance');
        if (!financeTab) return;

        let scope = 'overview';
        try {
            if (typeof FINANCE_DATA_SCOPE !== 'undefined' && FINANCE_DATA_SCOPE === 'marketing') {
                scope = 'marketing';
            }
        } catch (error) {}

        financeTab.classList.toggle('finance-scope-overview', scope === 'overview');
        financeTab.classList.toggle('finance-scope-marketing', scope === 'marketing');
    }

    function resetFinanceTableScrollV163() {
        const scroller = document.querySelector(
            '#ads-analysis-result #tab-finance .ads-data-card > .table-responsive'
        );
        if (!scroller) return;

        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
    }

    function applyV163() {
        injectV163Style();
        syncFinanceScopeClassV163();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV163, 60);
    });

    function bootV163() {
        applyV163();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.adsV163Observer) {
            root.dataset.adsV163Observer = '1';
            observer.observe(root, {
                childList:true,
                subtree:true
            });
        }

        setTimeout(applyV163, 120);
        setTimeout(applyV163, 550);
        setTimeout(applyV163, 1300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootV163, { once:true });
    } else {
        bootV163();
    }

    /* Sau khi bấm Tổng quan / Marketing trong tab Tài chính,
       reset bảng nhiều nhịp vì applyFilters render lại DOM bất đồng bộ. */
    document.addEventListener('click', event => {
        const scopeButton = event.target && event.target.closest
            ? event.target.closest('[data-ads-scope-target="finance"]')
            : null;

        if (!scopeButton) return;

        [30, 120, 260].forEach(delay => {
            setTimeout(() => {
                syncFinanceScopeClassV163();
                resetFinanceTableScrollV163();
                applyV163();
            }, delay);
        });
    });

    /* Khi chuyển vào tab Tài chính cũng đưa bảng về vị trí chuẩn. */
    document.addEventListener('click', event => {
        const financeTabButton = event.target && event.target.closest
            ? event.target.closest('#btn-tab-fin')
            : null;

        if (!financeTabButton) return;

        setTimeout(() => {
            syncFinanceScopeClassV163();
            resetFinanceTableScrollV163();
            applyV163();
        }, 180);
    });
})();

/* =========================================================
   V164 BUDGET CHANGE HISTORY + DATE RANGE FIX
   - Ghi nhận cả tăng/giảm/đổi loại ngân sách.
   - Khoảng ngày áp dụng trực tiếp vào Meta/Firebase context.
   ========================================================= */
(function installAdsV164DateRangeUiFix() {
    const STYLE_ID = 'ads-v164-date-range-ui-fix';

    function injectStyleV164() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    function keepPrimaryInputsSyncedV164() {
        const from = document.getElementById('ads-v158-primary-from');
        const to = document.getElementById('ads-v158-primary-to');
        const popover = document.getElementById('ads-v158-date-range-popover');

        if (!from || !to) return;

        const isOpen = !!(popover && popover.classList.contains('open'));
        const isEditing = (
            from.dataset.v165Dirty === '1' ||
            to.dataset.v165Dirty === '1' ||
            document.activeElement === from ||
            document.activeElement === to
        );

        // V165: observer không được đụng vào giá trị ngày khi người dùng đang chọn.
        if (isOpen || isEditing) return;

        try {
            const period = typeof getMetaLivePeriod === 'function'
                ? getMetaLivePeriod()
                : null;

            if (period) {
                from.value = period.from || '';
                to.value = period.to || '';
            }
        } catch (error) {}
    }

    function applyV164Ui() {
        injectStyleV164();
        keepPrimaryInputsSyncedV164();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV164Ui, 80);
    });

    function bootV164() {
        applyV164Ui();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.adsV164Observer) {
            root.dataset.adsV164Observer = '1';
            observer.observe(root, { childList:true, subtree:true });
        }

        setTimeout(applyV164Ui, 180);
        setTimeout(applyV164Ui, 700);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootV164, { once:true });
    } else {
        bootV164();
    }
})();

/* =========================================================
   V165 DATE PICKER INTERACTION FIX
   - Không để observer ghi đè ngày đang chọn.
   - Click toàn bộ ô ngày mở native calendar.
   - Giữ popup mở trong lúc chọn ngày.
   ========================================================= */
(function installAdsV165DatePickerFix() {
    const STYLE_ID = 'ads-v165-date-picker-fix';

    function injectStyleV165() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    function bindRuntimeV165() {
        const popover = document.getElementById('ads-v158-date-range-popover');
        const inputs = [
            document.getElementById('ads-v158-primary-from'),
            document.getElementById('ads-v158-primary-to')
        ].filter(Boolean);

        if (!popover || !inputs.length) return;

        const today = (() => {
            try {
                return typeof toIsoDateV158 === 'function'
                    ? toIsoDateV158(new Date())
                    : '';
            } catch (error) {
                return '';
            }
        })();

        inputs.forEach(input => {
            if (today) input.max = today;

            if (input.dataset.runtimeV165 === '1') return;
            input.dataset.runtimeV165 = '1';

            const keep = event => {
                input.dataset.v165Dirty = '1';
                event.stopPropagation();
            };

            input.addEventListener('pointerdown', keep, true);
            input.addEventListener('click', event => {
                keep(event);
                try {
                    if (typeof input.showPicker === 'function') input.showPicker();
                } catch (error) {}
            }, true);
            input.addEventListener('input', keep, true);
            input.addEventListener('change', keep, true);
        });

        if (popover.dataset.runtimeV165 !== '1') {
            popover.dataset.runtimeV165 = '1';
            popover.addEventListener('pointerdown', event => {
                event.stopPropagation();
            });
            popover.addEventListener('click', event => {
                event.stopPropagation();
            });
        }
    }

    function applyV165() {
        injectStyleV165();
        bindRuntimeV165();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV165, 40);
    });

    function bootV165() {
        applyV165();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.adsV165Observer) {
            root.dataset.adsV165Observer = '1';
            observer.observe(root, {
                childList:true,
                subtree:true
            });
        }

        setTimeout(applyV165, 120);
        setTimeout(applyV165, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootV165, { once:true });
    } else {
        bootV165();
    }
})();

/* =========================================================
   V167 — SAU ĐỔI NGÂN SÁCH (nâng cấp từ V166)
   - Tài chính: đúng 12 cột trước/sau theo yêu cầu.
   - Meta Live: thêm scope "Theo dõi ngân sách", giữ nhóm chỉ số Meta và hiển thị tăng/giảm so với giai đoạn NS liền trước.
   - Meta Live + Tài chính: bảng full width phía trên, biểu đồ phía dưới, responsive mobile.
   Nguồn:
   - Budget events: Meta Live / Firebase.
   - Doanh thu: roas_statistics/revenue_ledger_v1 từ ROAS Statistics V27; V227 dedupe theo Mã đơn và phân bổ duy nhất.
   - ROAS Ads sau đổi = Doanh thu / (Meta + VAT 10%).
   Phí chênh lệch sao kê không tự phân bổ vào từng event.
   ========================================================= */
(function installBudgetPerformanceUiV166(){
    if (typeof META_BUDGET_TRACKING_DISABLED_V304 !== 'undefined' && META_BUDGET_TRACKING_DISABLED_V304) return;
    const STYLE_ID = 'ads-v166-budget-performance-style';
    const state = {
        company:'',
        loading:false,
        error:'',
        events:[],
        ledger:[],
        rows:[],
        allRows:[],
        filterFrom:'',
        filterTo:'',
        filterGroupV243:'',
        referencePeriod:null,
        referenceRows:[],
        referenceSnapshot:null,
        referenceSyncedAt:'',
        referenceCompany:'',
        referenceKey:'',
        referenceCache:{},
        currentSpendCache:{},
        loadedAt:0,
        revenueMaxOrderAtMs:0,
        revenueLastUploadAt:'',
        trackingControls:{},
        rangeMetricCache:{},
        rangeMetaSummaryV288:null
    };

    // =====================================================
    // V290 — DOANH THU THEO DÕI NGÂN SÁCH
    // - Không còn upload doanh thu tại màn hình Theo dõi ngân sách.
    // - Doanh thu chỉ đọc Revenue Ledger dùng chung do Thống kê ROAS quản lý.
    // - Tránh tạo hai điểm nhập cùng một nguồn dữ liệu và giảm rủi ro upload trùng.
    // =====================================================
    function normalizeListV166(value) {
        if (Array.isArray(value)) return value.filter(Boolean);
        if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
        return [];
    }

    // =====================================================
    // V242 — BỘ LỌC GỌN + KPI CHI PHÍ / DOANH THU / ROAS RIÊNG
    // V241 — PHẠM VI RIÊNG CHO "THEO DÕI NGÂN SÁCH"
    // - Không đọc DATE_FROM / DATE_TO / REPORT_MONTH của bộ lọc chung.
    // - Khôi phục bộ lọc Từ ngày / Đến ngày ngay trong scope Theo dõi ngân sách.
    // - Bộ lọc chỉ thay đổi khoảng xem và số liệu hiển thị; không sửa event Firebase,
    //   không thay đổi timeline mốc thủ công/tự động và không tác động tab khác.
    // =====================================================
    function isBudgetIsoDateV198(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
    }

    // V232 — ô "Dữ liệu từ ngày" dùng text để tránh Chrome/Windows tự nhảy năm
    // khi input type=date đang có min/max. Chỉ chuẩn hóa sau khi người dùng hoàn tất.
    function normalizeManualBudgetDateInputV232(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';

        let year = 0;
        let month = 0;
        let day = 0;
        let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

        if (match) {
            year = Number(match[1]);
            month = Number(match[2]);
            day = Number(match[3]);
        } else {
            match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
            if (!match) return '';
            day = Number(match[1]);
            month = Number(match[2]);
            year = Number(match[3]);
        }

        if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return '';

        const date = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) return '';

        const pad = number => String(number).padStart(2,'0');
        return `${year}-${pad(month)}-${pad(day)}`;
    }

    function getBudgetFilterStartMsV198() {
        if (!isBudgetIsoDateV198(state.filterFrom)) return 0;
        const value = new Date(`${state.filterFrom}T00:00:00+07:00`).getTime();
        return Number.isFinite(value) ? value : 0;
    }

    function getBudgetTodayIsoV199() {
        return getLocalIsoDate(new Date());
    }

    // V200 — reference Meta của Theo dõi ngân sách phải sống độc lập khi đổi tab.
    // Cache theo đúng company + from + to; chỉ thay bản đang dùng sau khi đọc được
    // snapshot hợp lệ mới. Không xóa dữ liệu tốt trước khi request mới hoàn tất.
    function getBudgetReferenceKeyV200(company, period) {
        return [
            String(company || CURRENT_COMPANY || 'NNV').toUpperCase(),
            String(period && period.from || ''),
            String(period && period.to || '')
        ].join('||');
    }

    function applyBudgetReferenceValueV200(company, period, value) {
        if (!value || !period) return false;

        const companyCode = String(company || CURRENT_COMPANY || 'NNV').toUpperCase();
        if (
            String(value.company || '').toUpperCase() !== companyCode ||
            String(value.from || '') !== String(period.from || '') ||
            String(value.to || '') !== String(period.to || '')
        ) {
            return false;
        }

        const syncedAt =
            value.syncedAt ||
            value.checkedAt ||
            value.updatedAt ||
            '';

        const sourceRowsV226 = Array.isArray(value.rows)
            ? value.rows
            : Object.values(value.rows || {});

        // V226: snapshotLike khôi phục từ sessionStorage có thể chứa chính các
        // dòng đã normalize (budget, active_budget, report_start_iso...).
        // Normalize lần hai sẽ làm mất daily_budget/lifetime_budget và biến NS thành 0.
        const rowsAlreadyNormalizedV226 = sourceRowsV226.length > 0 &&
            sourceRowsV226.every(row => (
                row &&
                (
                    row.budget !== undefined ||
                    row.active_budget !== undefined ||
                    row.latest_stopped_budget !== undefined
                ) &&
                (
                    row.report_start_iso !== undefined ||
                    row.report_end_iso !== undefined ||
                    row.batchId !== undefined
                )
            ));

        const rows = rowsAlreadyNormalizedV226
            ? sourceRowsV226.map(row => ({
                ...row,
                company: companyCode,
                syncedAt: row.syncedAt || syncedAt || ''
            }))
            : normalizeMetaLiveRows(
                sourceRowsV226,
                companyCode,
                period,
                syncedAt
            );

        const referenceKey = getBudgetReferenceKeyV200(companyCode, period);
        const cacheEntry = {
            company:companyCode,
            period:{
                from:String(period.from || ''),
                to:String(period.to || '')
            },
            snapshot:value,
            rows,
            syncedAt,
            cachedAt:Date.now()
        };

        state.referenceCache[referenceKey] = cacheEntry;
        state.referenceCompany = companyCode;
        state.referenceKey = referenceKey;
        state.referencePeriod = cacheEntry.period;
        state.referenceSnapshot = value;
        state.referenceRows = rows;
        state.referenceSyncedAt = syncedAt;

        return true;
    }

    function restoreBudgetReferenceCacheV200(company, period) {
        const key = getBudgetReferenceKeyV200(company, period);
        const cached = state.referenceCache[key];
        if (!cached) return false;

        state.referenceCompany = cached.company;
        state.referenceKey = key;
        state.referencePeriod = cached.period;
        state.referenceSnapshot = cached.snapshot;
        state.referenceRows = Array.isArray(cached.rows) ? cached.rows : [];
        state.referenceSyncedAt = cached.syncedAt || '';
        return true;
    }

    function getBudgetCurrentSpendCacheKeyV200(event) {
        const company = String(event && event.company || state.company || CURRENT_COMPANY || 'NNV').toUpperCase();
        const period = state.referencePeriod || getBudgetReferencePeriodV198();
        const entityKey = budgetStageEntityKeyV196(event);
        if (!entityKey) return '';
        return `${getBudgetReferenceKeyV200(company, period)}||${entityKey}`;
    }

    function rememberBudgetCurrentSpendV200(event, spendValue, matchMode) {
        const spend = Number(spendValue);
        if (!Number.isFinite(spend) || spend < 0) return;
        const key = getBudgetCurrentSpendCacheKeyV200(event);
        if (!key) return;

        state.currentSpendCache[key] = {
            spend,
            matchMode:String(matchMode || ''),
            syncedAt:String(state.referenceSyncedAt || ''),
            cachedAt:Date.now()
        };
    }

    function readBudgetCurrentSpendV200(event) {
        const key = getBudgetCurrentSpendCacheKeyV200(event);
        return key && state.currentSpendCache[key]
            ? state.currentSpendCache[key]
            : null;
    }

    function getBudgetFilterEndMsV198() {
        const today = getBudgetTodayIsoV199();
        const selectedTo = (
            isBudgetIsoDateV198(state.filterTo) &&
            state.filterTo <= today
        ) ? state.filterTo : today;
        const value = new Date(`${selectedTo}T23:59:59.999+07:00`).getTime();
        return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
    }

    function hasBudgetViewFilterV241() {
        return !!(
            String(state.filterGroupV243 || '').trim() ||
            isBudgetIsoDateV198(state.filterFrom) ||
            isBudgetIsoDateV198(state.filterTo)
        );
    }

    function applyBudgetInternalFilterV198(rows) {
        const list = Array.isArray(rows) ? rows : [];
        if (!hasBudgetViewFilterV241()) return list.slice();

        const fromMs = getBudgetFilterStartMsV198();
        const toMs = getBudgetFilterEndMsV198();

        // V241: lọc theo GIAO NHAU của stage với khoảng ngày, không chỉ ngày bắt đầu mốc.
        return list.filter(row => {
            const startMs = Number(row && (row.startMs || row.changedAtMs) || 0);
            const endMs = Number(row && row.endMs || startMs || 0);
            if (!startMs) return false;

            const safeEnd = Math.max(startMs,endMs || startMs);
            if (fromMs && safeEnd < fromMs) return false;
            if (Number.isFinite(toMs) && startMs > toMs) return false;
            return true;
        });
    }

    function getBudgetReferencePeriodV198() {
        // V241: bộ lọc hiển thị Từ/Đến ngày KHÔNG được đổi Meta reference kỹ thuật
        // đang dùng để dựng timeline stage. Việc tính số liệu cho khoảng lọc có cache/query
        // riêng bên dưới, tránh làm đứt baseline của mốc ngân sách.
        const current = getCurrentMonthToDatePeriod();
        return {
            from:String(current.from || ''),
            to:getBudgetTodayIsoV199() || String(current.to || '')
        };
    }

    function buildBudgetMetaContextV198(company, period) {
        const companyCode = String(company || CURRENT_COMPANY || 'NNV').toUpperCase();
        const safePeriod = period || getBudgetReferencePeriodV198();
        const periodKey = getMetaLivePeriodKey(safePeriod);

        return {
            company:companyCode,
            period:{
                from:String(safePeriod.from || ''),
                to:String(safePeriod.to || '')
            },
            periodKey,
            requestKey:getMetaLiveRequestKey(
                companyCode,
                String(safePeriod.from || ''),
                String(safePeriod.to || '')
            ),
            snapshotPath:`${META_LIVE_SNAPSHOT_ROOT}/${companyCode}/${periodKey}`,
            lockPath:`${META_LIVE_LOCK_ROOT}/${companyCode}/${periodKey}`,
            requestPath:`${META_LIVE_REFRESH_REQUEST_ROOT}/${companyCode}/${periodKey}`
        };
    }

    async function loadBudgetReferenceMetaV198() {
        if (!db) db = getDatabase();

        const company = String(
            state.company ||
            CURRENT_COMPANY ||
            'NNV'
        ).toUpperCase();

        const period = getBudgetReferencePeriodV198();
        const referenceKey = getBudgetReferenceKeyV200(company, period);

        // V200: khôi phục ngay snapshot đã dùng thành công trước đó. Khi đổi tab
        // bảng vẫn có Chi Meta sau đổi tức thì, không rơi về trạng thái thiếu dữ liệu.
        const restored = restoreBudgetReferenceCacheV200(company, period);

        if (!restored && state.referenceKey !== referenceKey) {
            // Context thật sự khác thì không được dùng nhầm snapshot công ty/kỳ cũ.
            state.referenceCompany = company;
            state.referenceKey = referenceKey;
            state.referencePeriod = period;
            state.referenceRows = [];
            state.referenceSnapshot = null;
            state.referenceSyncedAt = '';
        } else {
            state.referencePeriod = period;
        }

        if (
            !db ||
            !isBudgetIsoDateV198(period.from) ||
            !isBudgetIsoDateV198(period.to) ||
            period.from > period.to
        ) {
            return Array.isArray(state.referenceRows) ? state.referenceRows : [];
        }

        const context = buildBudgetMetaContextV198(company, period);

        // V206: nhân viên lấy reference trực tiếp từ Apps Script/cache chung,
        // không đọc snapshot Firebase chỉ vì mở Theo dõi ngân sách.
        if (
            window.isMetaDirectStaffV206 &&
            window.isMetaDirectStaffV206() &&
            typeof window.fetchMetaDirectContextV206 === 'function'
        ) {
            try {
                const direct = await window.fetchMetaDirectContextV206(
                    context,
                    true,
                    false
                );

                if (direct && direct.snapshotLike) {
                    applyBudgetReferenceValueV200(
                        company,
                        period,
                        direct.snapshotLike
                    );
                }
            } catch (error) {
                console.warn(
                    'Không tải được Meta Direct reference của Theo dõi ngân sách V206:',
                    error && error.message ? error.message : error
                );
            }

            return state.referenceRows;
        }

        try {
            // Dùng đúng TTL 5 phút + chốt lịch sử 50 giờ của Meta Live.
            // Không force và không đụng bộ lọc chung.
            await ensureMetaSnapshotFreshForContext(
                context,
                false,
                true
            ).catch(error => {
                console.warn(
                    'Budget Meta reference V198 refresh:',
                    error && error.message ? error.message : error
                );
                return null;
            });

            const snapshot = await db.ref(context.snapshotPath).once('value');
            const value = snapshot.val();

            if (value) {
                applyBudgetReferenceValueV200(company, period, value);
            }
        } catch(error) {
            console.warn(
                'Không tải được Meta reference riêng của Theo dõi ngân sách V198:',
                error && error.message ? error.message : error
            );
        }

        return state.referenceRows;
    }

    async function refreshBudgetViewsForInternalFilterV198() {
        await loadBudgetReferenceMetaV198();
        buildBudgetPerformanceRowsV166();
        await applyBudgetViewRangeMetricsV241();

        if (FINANCE_DATA_SCOPE === 'budget-change') {
            renderBudgetPerformanceV166();
        }

        if (META_LIVE_DATA_SCOPE === 'budget-change') {
            renderMetaBudgetPerformanceV167();
        }

        if (typeof window.__syncAdsLayoutV183 === 'function') {
            window.__syncAdsLayoutV183();
        }

        return state.rows;
    }

    async function setBudgetCalculationStartV199(fromValue) {
        const from = String(fromValue || '').trim();
        const today = getBudgetTodayIsoV199();

        if (from && !isBudgetIsoDateV198(from)) {
            throw new Error('Ngày bắt đầu tính dữ liệu không hợp lệ.');
        }

        if (from && from > today) {
            throw new Error('Ngày bắt đầu tính dữ liệu không được lớn hơn hôm nay.');
        }

        state.filterFrom = from;
        state.filterTo = today;

        return refreshBudgetViewsForInternalFilterV198();
    }

    // Tương thích nếu console/code cũ còn gọi hai hàm V198.
    // Không có nút lọc bên ngoài; clear = bỏ giới hạn ngày bắt đầu, đến hôm nay.
    window.applyBudgetInternalFilterV198 = async function() {
        return setBudgetCalculationStartV199(state.filterFrom || '');
    };

    window.clearBudgetInternalFilterV198 = async function() {
        return setBudgetCalculationStartV199('');
    };


    // =====================================================
    // V241 — BỘ LỌC KHOẢNG NGÀY CHO THEO DÕI NGÂN SÁCH
    // - Từ/Đến ngày là bộ lọc VIEW độc lập.
    // - Revenue lọc chính xác theo createdAtMs của Revenue Ledger.
    // - Với stage bị cắt bởi khoảng ngày, cumulative Meta được đọc theo đúng
    //   hàng đã gom để tính lại spend/metrics khi có thể.
    // =====================================================
    function budgetFilterDateRangeV241() {
        const today = getBudgetTodayIsoV199();
        const from = isBudgetIsoDateV198(state.filterFrom) ? state.filterFrom : '';
        const to = isBudgetIsoDateV198(state.filterTo) ? state.filterTo : '';
        const safeTo = to && to <= today ? to : (to ? today : '');

        return {
            from,
            to:safeTo,
            fromMs:from ? new Date(`${from}T00:00:00+07:00`).getTime() : 0,
            toMs:safeTo ? new Date(`${safeTo}T23:59:59.999+07:00`).getTime() : Number.POSITIVE_INFINITY
        };
    }

    function formatBudgetFilterDateV241(value) {
        if (!isBudgetIsoDateV198(value)) return '';
        const parts = value.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }


    // =====================================================
    // V244 — SMART FILTER NHÂN VIÊN / NHÓM ĐÃ GOM
    // - Cùng một ô tìm kiếm như Tổng quan, nhưng gợi ý có 2 cấp:
    //   + Nhân viên: tính tất cả nhóm đã gom của người đó.
    //   + Nhóm đã gom: chỉ tính đúng nhóm được chọn.
    // - Revenue vẫn phân bổ duy nhất trên TOÀN BỘ nhóm trước khi áp phạm vi,
    //   tránh một đơn bị đổi nhóm hoặc cộng trùng chỉ vì người dùng đang lọc.
    // =====================================================
    function budgetGroupedIdentityV243(row) {
        try {
            const context = getRevenueGroupedContextV228(row || {});
            return String(context && context.signature || '').trim();
        } catch (error) {
            return '';
        }
    }

    function budgetEmployeeIdentityV244(row) {
        row = row || {};
        let context = null;
        try { context = getRevenueGroupedContextV228(row); } catch (error) { context = null; }

        return normalizeAdsText(String(
            row.employee ||
            (context && context.employee) ||
            row.campaignName ||
            ''
        ).trim());
    }

    function budgetEmployeeLabelV244(row) {
        row = row || {};
        let context = null;
        try { context = getRevenueGroupedContextV228(row); } catch (error) { context = null; }
        return String(
            row.employee ||
            (context && context.employee) ||
            row.campaignName ||
            'Nhân viên'
        ).trim();
    }

    function budgetGroupedLabelV243(row) {
        row = row || {};
        let context = null;
        try { context = getRevenueGroupedContextV228(row); } catch (error) { context = null; }

        const employee = String(
            row.employee ||
            (context && context.employee) ||
            row.campaignName ||
            ''
        ).trim();

        const adName = String(
            row.adName ||
            (context && context.adName) ||
            row.fullName ||
            ''
        ).trim();

        const skus = Array.from(new Set(
            []
                .concat(row.skus || [])
                .concat(context && context.skus || [])
                .map(value => String(value || '').trim())
                .filter(Boolean)
        ));

        const parts = [];
        if (employee) parts.push(employee);
        if (adName && normalizeAdsText(adName) !== normalizeAdsText(employee)) parts.push(adName);

        let label = parts.join(' — ') || 'Nhóm quảng cáo';
        if (skus.length) label += ` (${skus.join(', ')})`;
        return label;
    }

    function makeBudgetEmployeeTargetV244(employeeKey) {
        return employeeKey ? `employee::${employeeKey}` : '';
    }

    function makeBudgetGroupTargetV244(groupSignature) {
        return groupSignature ? `group::${groupSignature}` : '';
    }

    function parseBudgetFilterTargetV244(value) {
        const raw = String(value || '').trim();
        if (!raw) return { type:'', key:'', raw:'' };
        if (raw.startsWith('employee::')) {
            return { type:'employee', key:raw.slice('employee::'.length), raw };
        }
        if (raw.startsWith('group::')) {
            return { type:'group', key:raw.slice('group::'.length), raw };
        }
        // Tương thích state V243 trong cùng phiên: giá trị cũ là signature nhóm thuần.
        return { type:'group', key:raw, raw };
    }

    function getBudgetGroupedOptionsV243() {
        const employeeMap = new Map();
        const groupMap = new Map();

        (Array.isArray(state.allRows) ? state.allRows : []).forEach(row => {
            const employeeKey = budgetEmployeeIdentityV244(row);
            const employeeLabel = budgetEmployeeLabelV244(row);
            const groupSignature = budgetGroupedIdentityV243(row);
            const groupLabel = budgetGroupedLabelV243(row);

            if (employeeKey && !employeeMap.has(employeeKey)) {
                employeeMap.set(employeeKey, {
                    value:makeBudgetEmployeeTargetV244(employeeKey),
                    type:'employee',
                    key:employeeKey,
                    label:employeeLabel,
                    subLabel:'Tất cả nhóm đã gom của nhân viên này'
                });
            }

            if (groupSignature && !groupMap.has(groupSignature)) {
                groupMap.set(groupSignature, {
                    value:makeBudgetGroupTargetV244(groupSignature),
                    type:'group',
                    key:groupSignature,
                    employeeKey,
                    label:groupLabel,
                    subLabel:'Chỉ nhóm quảng cáo đã gom này'
                });
            }
        });

        const employees = Array.from(employeeMap.values()).sort((a,b) =>
            String(a.label || '').localeCompare(String(b.label || ''),'vi')
        );
        const groups = Array.from(groupMap.values()).sort((a,b) =>
            String(a.label || '').localeCompare(String(b.label || ''),'vi')
        );

        return employees.concat(groups);
    }

    function getSelectedBudgetTargetMetaV244() {
        const selected = String(state.filterGroupV243 || '').trim();
        if (!selected) return null;
        const parsed = parseBudgetFilterTargetV244(selected);
        const options = getBudgetGroupedOptionsV243();
        const exact = options.find(item => item.value === selected);
        if (exact) return exact;

        // Tương thích V243: signature nhóm thuần.
        if (parsed.type === 'group') {
            const legacy = options.find(item => item.type === 'group' && item.key === parsed.key);
            if (legacy) return legacy;
        }
        return null;
    }

    function getSelectedBudgetGroupLabelV243() {
        const meta = getSelectedBudgetTargetMetaV244();
        return meta ? meta.label : '';
    }

    function budgetFilterTargetMatchesV244(row,targetValue) {
        const target = parseBudgetFilterTargetV244(targetValue);
        if (!target.type || !target.key) return true;
        if (target.type === 'employee') {
            return budgetEmployeeIdentityV244(row) === target.key;
        }
        return budgetGroupedIdentityV243(row) === target.key;
    }

    function budgetRangeFilterHtmlV241(scope) {
        const key = scope === 'finance' ? 'finance' : 'performance';
        const today = getBudgetTodayIsoV199();
        const range = budgetFilterDateRangeV241();
        const selectedTarget = String(state.filterGroupV243 || '').trim();
        const targetMeta = getSelectedBudgetTargetMetaV244();
        const targetLabel = targetMeta ? targetMeta.label : '';

        const scopeText = targetMeta
            ? (targetMeta.type === 'employee' ? `Nhân viên: ${targetLabel}` : `Nhóm: ${targetLabel}`)
            : 'Chọn nhân viên hoặc nhóm đã gom để xem Chi phí · Doanh thu · ROAS';
        const label = targetMeta
            ? `${scopeText} · ${range.from ? formatBudgetFilterDateV241(range.from) : 'đầu timeline'} → ${range.to ? formatBudgetFilterDateV241(range.to) : 'hôm nay'}`
            : scopeText;

        return `
            <div class="budget-range-filter-v241 budget-range-filter-v243 budget-range-filter-v244" data-budget-filter-scope="${key}">
                <div class="budget-range-filter-fields-v241">
                    <label class="budget-range-group-field-v243">
                        <span>Phạm vi</span>
                        <div class="budget-range-group-search-wrap-v243">
                            <input
                                type="search"
                                id="budget-filter-group-search-v243-${key}"
                                class="budget-range-group-search-v243"
                                autocomplete="off"
                                placeholder="Gõ tên nhân viên, nhóm hoặc SKU..."
                                value="${escapeHtml(targetLabel || '')}"
                            />
                            <input type="hidden" id="budget-filter-group-v243-${key}" value="${escapeHtml(selectedTarget)}" />
                            <div id="budget-filter-group-suggestions-v243-${key}" class="budget-range-group-suggestions-v243"></div>
                        </div>
                    </label>
                    <label>
                        <span>Từ ngày</span>
                        <input type="date" id="budget-filter-from-v241-${key}" value="${escapeHtml(state.filterFrom || '')}" max="${escapeHtml(today)}" />
                    </label>
                    <span class="budget-range-filter-arrow-v241">→</span>
                    <label>
                        <span>Đến ngày</span>
                        <input type="date" id="budget-filter-to-v241-${key}" value="${escapeHtml(state.filterTo || '')}" max="${escapeHtml(today)}" />
                    </label>
                    <button type="button" class="budget-range-filter-apply-v241" onclick="window.applyBudgetRangeFilterV241('${key}')">Áp dụng</button>
                    <button type="button" class="budget-range-filter-clear-v241" onclick="window.clearBudgetRangeFilterV241()">Đặt lại</button>
                </div>
                <div class="budget-range-filter-status-v241">${escapeHtml(label)}</div>
            </div>
        `;
    }

    function budgetRangeSummaryHtmlV242() {
        if (!hasBudgetViewFilterV241() || !String(state.filterGroupV243 || '').trim()) return '';

        const rows = Array.isArray(state.rows) ? state.rows : [];
        const directMeta = state.rangeMetaSummaryV288;
        const totalCost = directMeta && directMeta.available === true
            ? Number(directMeta.totalAdsCost || 0)
            : null;
        const totalMetaSpend = directMeta && directMeta.available === true
            ? Number(directMeta.spend || 0)
            : null;
        const totalRevenue = rows.reduce((sum,row) => sum + Number(row && row.revenue || 0),0);
        const roas = totalCost !== null && totalCost > 0 ? totalRevenue / totalCost : 0;
        const range = budgetFilterDateRangeV241();
        const periodLabel = `${range.from ? formatBudgetFilterDateV241(range.from) : 'đầu timeline'} → ${range.to ? formatBudgetFilterDateV241(range.to) : 'hôm nay'}`;
        const targetMeta = getSelectedBudgetTargetMetaV244();
        const targetLabel = targetMeta ? targetMeta.label : getSelectedBudgetGroupLabelV243();
        const scopeTitle = targetMeta && targetMeta.type === 'employee' ? 'NHÂN VIÊN' : 'NHÓM ĐÃ GOM';
        const scopeNote = targetMeta && targetMeta.type === 'employee'
            ? 'Tất cả nhóm đã gom của nhân viên'
            : 'Chỉ nhóm quảng cáo đã gom được chọn';

        return `
            <div class="budget-range-kpi-shell-v243 budget-range-kpi-shell-v244">
                <div class="budget-range-kpi-group-v243">
                    <span>${escapeHtml(scopeTitle)}</span>
                    <strong>${escapeHtml(targetLabel)}</strong>
                    <small>${escapeHtml(scopeNote)} · ${escapeHtml(periodLabel)}</small>
                </div>
                <div class="budget-range-kpi-v242" aria-label="Số liệu trong khoảng lọc">
                <div class="budget-range-kpi-card-v242">
                    <span>Chi phí trong khoảng</span>
                    <strong>${totalCost !== null ? formatMetaLiveInteger(totalCost) + ' ₫' : '—'}</strong>
                    <small>${totalCost !== null
                        ? `Meta ${formatMetaLiveInteger(totalMetaSpend)} ₫ + VAT 10% · ${escapeHtml(periodLabel)}`
                        : 'Chưa tải được Meta trực tiếp cho khoảng đã chọn'}</small>
                </div>
                <div class="budget-range-kpi-card-v242 is-revenue">
                    <span>Doanh thu trong khoảng</span>
                    <strong>${formatMetaLiveInteger(totalRevenue)} ₫</strong>
                    <small>Revenue Ledger đã chống trùng</small>
                </div>
                <div class="budget-range-kpi-card-v242 is-roas">
                    <span>ROAS trong khoảng</span>
                    <strong>${totalCost !== null && totalCost > 0 ? Number(roas).toFixed(2) + 'x' : '—'}</strong>
                    <small>Doanh thu / chi phí Meta trực tiếp + VAT</small>
                </div>
                </div>
            </div>
        `;
    }

    function renderBudgetGroupedSuggestionsV243(scope,query) {
        const key = scope === 'finance' ? 'finance' : 'performance';
        const box = document.getElementById(`budget-filter-group-suggestions-v243-${key}`);
        if (!box) return;

        const normalizedQuery = normalizeAdsText(String(query || '').trim());
        const options = getBudgetGroupedOptionsV243();
        const matches = options.filter(item => {
            if (!normalizedQuery) return true;
            const haystack = normalizeAdsText(`${item.label || ''} ${item.subLabel || ''}`);
            return haystack.indexOf(normalizedQuery) !== -1;
        }).sort((a,b) => {
            if (a.type !== b.type) return a.type === 'employee' ? -1 : 1;
            return String(a.label || '').localeCompare(String(b.label || ''),'vi');
        }).slice(0,14);

        if (!matches.length) {
            box.innerHTML = '<div class="budget-range-group-no-result-v243">Không tìm thấy nhân viên hoặc nhóm phù hợp</div>';
            box.classList.add('is-open');
            return;
        }

        box.innerHTML = matches.map((item,index) => `
            <button type="button" class="budget-range-group-suggestion-v243 budget-range-group-suggestion-v244 is-${escapeHtml(item.type)}" data-budget-group-index="${index}">
                <span class="budget-range-suggestion-main-v244">
                    <b>${escapeHtml(item.label)}</b>
                    <small>${escapeHtml(item.subLabel || '')}</small>
                </span>
                <em>${item.type === 'employee' ? 'Nhân viên' : 'Nhóm'}</em>
            </button>
        `).join('');
        box.classList.add('is-open');

        Array.from(box.querySelectorAll('.budget-range-group-suggestion-v243')).forEach((button,index) => {
            button.onclick = function(event) {
                event.preventDefault();
                event.stopPropagation();
                const item = matches[index];
                if (!item) return;
                const input = document.getElementById(`budget-filter-group-search-v243-${key}`);
                const hidden = document.getElementById(`budget-filter-group-v243-${key}`);
                if (input) input.value = item.label || '';
                if (hidden) hidden.value = item.value || '';
                box.classList.remove('is-open');
                box.innerHTML = '';
            };
        });
    }

    function resolveBudgetTypedTargetV244(scope) {
        const key = scope === 'finance' ? 'finance' : 'performance';
        const input = document.getElementById(`budget-filter-group-search-v243-${key}`);
        const hidden = document.getElementById(`budget-filter-group-v243-${key}`);
        const current = String(hidden && hidden.value || '').trim();
        if (current) return current;

        const query = normalizeAdsText(String(input && input.value || '').trim());
        if (!query) return '';
        const options = getBudgetGroupedOptionsV243();

        // Nếu chỉ gõ đúng tên nhân viên rồi Áp dụng/Enter, ưu tiên phạm vi Nhân viên.
        const employeeExact = options.find(item => (
            item.type === 'employee' && normalizeAdsText(item.label || '') === query
        ));
        if (employeeExact) {
            if (hidden) hidden.value = employeeExact.value;
            if (input) input.value = employeeExact.label;
            return employeeExact.value;
        }

        const exact = options.find(item => normalizeAdsText(item.label || '') === query);
        if (exact) {
            if (hidden) hidden.value = exact.value;
            if (input) input.value = exact.label;
            return exact.value;
        }
        return '';
    }

    function bindBudgetGroupedSearchV243(scope) {
        const key = scope === 'finance' ? 'finance' : 'performance';
        const input = document.getElementById(`budget-filter-group-search-v243-${key}`);
        const hidden = document.getElementById(`budget-filter-group-v243-${key}`);
        const box = document.getElementById(`budget-filter-group-suggestions-v243-${key}`);
        if (!input || !hidden || !box || input.dataset.budgetGroupBoundV243 === '1') return;
        input.dataset.budgetGroupBoundV243 = '1';

        const clearSelectionIfTyping = () => {
            const selectedLabel = getSelectedBudgetGroupLabelV243();
            if (normalizeAdsText(input.value || '') !== normalizeAdsText(selectedLabel || '')) {
                hidden.value = '';
            }
        };

        input.addEventListener('focus', function() {
            renderBudgetGroupedSuggestionsV243(key,input.value || '');
        });
        input.addEventListener('input', function() {
            clearSelectionIfTyping();
            renderBudgetGroupedSuggestionsV243(key,input.value || '');
        });
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                box.classList.remove('is-open');
                return;
            }
            if (event.key === 'Enter') {
                const typedTarget = resolveBudgetTypedTargetV244(key);
                if (typedTarget) {
                    event.preventDefault();
                    box.classList.remove('is-open');
                    box.innerHTML = '';
                    return;
                }
                const first = box.querySelector('.budget-range-group-suggestion-v243');
                if (first) {
                    event.preventDefault();
                    first.click();
                }
            }
        });
        input.addEventListener('blur', function() {
            setTimeout(() => box.classList.remove('is-open'),160);
        });
    }

    function syncBudgetRangeFilterInputsV241() {
        ['finance','performance'].forEach(key => {
            const group = document.getElementById(`budget-filter-group-v243-${key}`);
            const search = document.getElementById(`budget-filter-group-search-v243-${key}`);
            const from = document.getElementById(`budget-filter-from-v241-${key}`);
            const to = document.getElementById(`budget-filter-to-v241-${key}`);
            if (group) group.value = state.filterGroupV243 || '';
            if (search) search.value = getSelectedBudgetGroupLabelV243() || '';
            if (from) from.value = state.filterFrom || '';
            if (to) to.value = state.filterTo || '';
        });
    }

    function zeroMetricV241() {
        return {spend:0,messages:0,result:0,linkClicks:0,impressions:0,clicks:0,reach:0};
    }

    function normalizeMetricSnapshotV241(source, spendFallback) {
        if (!source && (spendFallback === null || spendFallback === undefined)) return null;
        const metric = metricFromCurrentRowV166(source || {});
        if (spendFallback !== null && spendFallback !== undefined && Number.isFinite(Number(spendFallback))) {
            metric.spend = Number(spendFallback);
        }
        return metric;
    }

    function eventBaselineMetricV241(event) {
        if (!event) return null;
        return normalizeMetricSnapshotV241(
            event.manualBaselineMetrics || event.baselineMetrics || null,
            event.startCumulativeSpend !== undefined ? event.startCumulativeSpend : event.manualBaselineSpend
        );
    }

    function eventAtBoundaryV241(row,boundaryMs) {
        const key = budgetStageEntityKeyV196(row);
        if (!key || !boundaryMs) return null;
        const expanded = expandManualFollowupEventsV234(state.events);
        return expanded.find(event => (
            budgetStageEntityKeyV196(event) === key &&
            Math.abs(Number(event.changedAtMs || 0) - Number(boundaryMs || 0)) <= 1500
        )) || null;
    }

    function currentMetricForEventV241(row) {
        if (row && row.manualCurrentMetrics) {
            return normalizeMetricSnapshotV241(row.manualCurrentMetrics,row.manualCurrentSpend);
        }
        try {
            const context = getCurrentEventContextV186(row || {});
            if (context && context.metricRow) return metricFromCurrentRowV166(context.metricRow);
        } catch(error) {}
        return null;
    }

    function exactBoundaryMetricV241(row,boundaryMs,side) {
        if (!row || !boundaryMs) return null;
        const tolerance = 1500;

        if (side === 'start' && Math.abs(Number(boundaryMs) - Number(row.startMs || 0)) <= tolerance) {
            return eventBaselineMetricV241(row);
        }

        if (side === 'end' && Math.abs(Number(boundaryMs) - Number(row.endMs || 0)) <= tolerance) {
            const control = row.trackingControlV210 || null;
            if (control && control.stopMetrics) {
                return normalizeMetricSnapshotV241(control.stopMetrics,control.stopCumulativeSpend);
            }

            const nextBoundaryEvent = eventAtBoundaryV241(row,boundaryMs);
            if (nextBoundaryEvent && nextBoundaryEvent !== row) {
                const metric = eventBaselineMetricV241(nextBoundaryEvent);
                if (metric) return metric;
            }

            const current = currentMetricForEventV241(row);
            if (current && (row.isOpen || !row.hasNextEventV213)) return current;

            if (row.endCumulativeSpend !== null && row.endCumulativeSpend !== undefined) {
                return normalizeMetricSnapshotV241(null,row.endCumulativeSpend);
            }
        }

        return null;
    }

    function resolveMetricRowFromRowsV241(event,rows,company,period) {
        const saved = {
            referenceCompany:state.referenceCompany,
            referenceKey:state.referenceKey,
            referencePeriod:state.referencePeriod,
            referenceRows:state.referenceRows,
            referenceSnapshot:state.referenceSnapshot,
            referenceSyncedAt:state.referenceSyncedAt
        };

        try {
            state.referenceCompany = company;
            state.referencePeriod = period;
            state.referenceKey = getBudgetReferenceKeyV200(company,period);
            state.referenceRows = Array.isArray(rows) ? rows : [];
            state.referenceSnapshot = null;
            state.referenceSyncedAt = '';
            const resolved = getCurrentEventContextV186(event || {});
            return resolved && resolved.metricRow ? resolved.metricRow : null;
        } finally {
            Object.assign(state,saved);
        }
    }

    async function fetchBudgetRangeEntryV241(company,from,to) {
        if (!isBudgetIsoDateV198(from) || !isBudgetIsoDateV198(to) || from > to) return null;
        const key = `${String(company || '').toUpperCase()}||${from}||${to}`;
        if (state.rangeMetricCache[key]) return state.rangeMetricCache[key];

        if (typeof window.fetchMetaDirectContextV206 !== 'function') return null;

        const context = buildBudgetMetaContextV198(company,{from,to});
        context.skipSupportLedgersV215 = true;

        try {
            const entry = await window.fetchMetaDirectContextV206(context,true,false);
            if (entry && Array.isArray(entry.rows)) {
                const cached = {rows:entry.rows,period:{from,to},syncedAt:entry.syncedAt || '',cachedAt:Date.now()};
                state.rangeMetricCache[key] = cached;
                return cached;
            }
        } catch(error) {
            console.warn('Budget range metric V241:',error && error.message ? error.message : error);
        }
        return null;
    }

    // =====================================================
    // V288 — CHI PHÍ TRONG KHOẢNG PHẢI LẤY TRỰC TIẾP TỪ META
    // - Không cộng spend/totalAdsCost của các stage ngân sách.
    // - Nhân viên: cộng đúng tất cả grouped rows của nhân viên trong Meta range.
    // - Nhóm: lấy đúng grouped row được chọn trong Meta range.
    // - Meta spend chỉ được lấy một lần cho đúng Từ ngày/Đến ngày, sau đó + VAT 10%.
    // =====================================================
    async function refreshBudgetRangeMetaSummaryV288() {
        const selectedTarget = String(state.filterGroupV243 || '').trim();
        if (!selectedTarget) {
            state.rangeMetaSummaryV288 = null;
            return null;
        }

        const company = String(state.company || CURRENT_COMPANY || 'NNV').toUpperCase();
        const range = budgetFilterDateRangeV241();
        const referencePeriod = getBudgetReferencePeriodV198();
        const from = String(range.from || referencePeriod.from || '').slice(0,10);
        const to = String(range.to || referencePeriod.to || getBudgetTodayIsoV199() || '').slice(0,10);

        if (!isBudgetIsoDateV198(from) || !isBudgetIsoDateV198(to) || from > to) {
            state.rangeMetaSummaryV288 = {
                available:false,
                company,
                from,
                to,
                spend:0,
                vat:0,
                totalAdsCost:0,
                matchedRowCount:0,
                source:'meta_direct_range_v288',
                error:'Khoảng ngày không hợp lệ.'
            };
            return state.rangeMetaSummaryV288;
        }

        const entry = await fetchBudgetRangeEntryV241(company,from,to);
        if (!entry || !Array.isArray(entry.rows)) {
            state.rangeMetaSummaryV288 = {
                available:false,
                company,
                from,
                to,
                spend:0,
                vat:0,
                totalAdsCost:0,
                matchedRowCount:0,
                source:'meta_direct_range_v288',
                error:'Chưa tải được dữ liệu Meta cho khoảng đã chọn.'
            };
            return state.rangeMetaSummaryV288;
        }

        const context = buildBudgetMetaContextV198(company,{from,to});
        const groupedRows = normalizeBudgetGroupedRowsV253(entry.rows,context,entry.syncedAt || '');
        const matchedRows = groupedRows.filter(row => budgetFilterTargetMatchesV244(row,selectedTarget));
        const spend = matchedRows.reduce((sum,row) => sum + Number(row && row.spend || 0),0);
        const vat = spend * 0.1;

        state.rangeMetaSummaryV288 = {
            available:true,
            company,
            from,
            to,
            spend,
            vat,
            totalAdsCost:spend + vat,
            matchedRowCount:matchedRows.length,
            source:'meta_direct_range_v288',
            syncedAt:String(entry.syncedAt || ''),
            target:selectedTarget
        };
        return state.rangeMetaSummaryV288;
    }

    async function cumulativeMetricThroughDateV241(row,throughDate) {
        if (!row || !isBudgetIsoDateV198(throughDate)) return null;
        const company = String(row.company || state.company || CURRENT_COMPANY || 'NNV').toUpperCase();
        let anchor = String(
            row.baselinePeriodFrom ||
            row.manualBaselineAutoFrom ||
            row.manualRangeFrom ||
            ''
        ).slice(0,10);

        if (!isBudgetIsoDateV198(anchor)) {
            const startDate = dateOnlyLocalV172(row.startMs || row.changedAtMs || Date.now());
            anchor = startDate ? `${startDate.slice(0,7)}-01` : '';
        }
        if (!isBudgetIsoDateV198(anchor)) return null;
        if (throughDate < anchor) return zeroMetricV241();

        const entry = await fetchBudgetRangeEntryV241(company,anchor,throughDate);
        if (!entry) return null;
        const metricRow = resolveMetricRowFromRowsV241(row,entry.rows,company,entry.period);
        return metricRow ? metricFromCurrentRowV166(metricRow) : null;
    }

    function deriveFilteredMetaMetricsV241(delta) {
        if (!delta) return {available:false,spend:0,messages:0,purchases:0,linkClicks:0,impressions:0,reach:0,cr:0,ctr:0,frequency:0,costPerMessage:0,cpa:0};
        const spend = Number(delta.spend || 0);
        const messages = Number(delta.messages || 0);
        const purchases = Number(delta.result || 0);
        const linkClicks = Number(delta.linkClicks || 0);
        const impressions = Number(delta.impressions || 0);
        const reach = Number(delta.reach || 0);
        return {
            available:true,spend,messages,purchases,linkClicks,impressions,reach,
            cr:messages > 0 ? (purchases/messages)*100 : (purchases > 0 ? 100 : 0),
            ctr:impressions > 0 ? (linkClicks/impressions)*100 : 0,
            frequency:reach > 0 ? impressions/reach : 0,
            costPerMessage:messages > 0 ? spend/messages : 0,
            cpa:purchases > 0 ? spend/purchases : 0
        };
    }

    async function applyBudgetViewRangeMetricsV241() {
        const baseRows = Array.isArray(state.allRows) ? state.allRows : [];
        if (!hasBudgetViewFilterV241()) {
            state.rangeMetaSummaryV288 = null;
            state.rows = baseRows.slice();
            return state.rows;
        }

        const range = budgetFilterDateRangeV241();
        const allRangeCandidates = applyBudgetInternalFilterV198(baseRows).map(source => {
            const originalStartMs = Number(source.startMs || source.changedAtMs || 0);
            const originalEndMs = Math.max(originalStartMs,Number(source.endMs || originalStartMs));
            const clipStartMs = Math.max(originalStartMs,range.fromMs || originalStartMs);
            const clipEndMs = Math.min(originalEndMs,Number.isFinite(range.toMs) ? range.toMs : originalEndMs);
            return {
                ...source,
                originalStageStartMsV241:originalStartMs,
                originalStageEndMsV241:originalEndMs,
                startMs:clipStartMs,
                endMs:Math.max(clipStartMs,clipEndMs),
                duration:formatDurationV166(clipStartMs,Math.max(clipStartMs,clipEndMs)),
                viewFilteredV241:true,
                viewFilterFromV241:range.from,
                viewFilterToV241:range.to
            };
        });

        // QUAN TRỌNG V243:
        // Phân bổ doanh thu trên toàn bộ nhóm trước, sau đó mới lọc nhóm người dùng chọn.
        // Không để việc chọn riêng một nhóm làm mất các candidate cạnh tranh và gây cộng sai đơn.
        applyUniqueRevenueAllocationV227(allRangeCandidates);

        const selectedTargetV244 = String(state.filterGroupV243 || '').trim();
        const candidates = selectedTargetV244
            ? allRangeCandidates.filter(row => budgetFilterTargetMatchesV244(row,selectedTargetV244))
            : allRangeCandidates;

        // V288: KPI "Chi phí trong khoảng" lấy một lần trực tiếp từ Meta cho đúng phạm vi.
        // Không dùng tổng các stage phía dưới để suy ra chi phí của khoảng lọc.
        if (selectedTargetV244) {
            await refreshBudgetRangeMetaSummaryV288();
        } else {
            state.rangeMetaSummaryV288 = null;
        }

        for (const row of candidates) {
            const clipStartMs = Number(row.startMs || 0);
            const clipEndMs = Number(row.endMs || clipStartMs);
            const fullStart = Number(row.originalStageStartMsV241 || 0);
            const fullEnd = Number(row.originalStageEndMsV241 || fullStart);
            const isFullStage = clipStartMs === fullStart && clipEndMs === fullEnd;

            if (!isFullStage && clipEndMs > clipStartMs) {
                let startMetric = exactBoundaryMetricV241(row,clipStartMs,'start');
                let endMetric = exactBoundaryMetricV241(row,clipEndMs,'end');

                if (!startMetric) {
                    const clipStartDate = dateOnlyLocalV172(clipStartMs);
                    const previousDate = getMetaCheckpointPreviousDateV196(clipStartDate);
                    startMetric = previousDate
                        ? await cumulativeMetricThroughDateV241(row,previousDate)
                        : zeroMetricV241();
                }

                if (!endMetric) {
                    const clipEndDate = dateOnlyLocalV172(clipEndMs);
                    endMetric = clipEndDate
                        ? await cumulativeMetricThroughDateV241(row,clipEndDate)
                        : null;
                }

                const delta = metricDeltaV166(startMetric,endMetric);
                const meta = deriveFilteredMetaMetricsV241(delta);

                if (meta.available) {
                    row.metaAfter = meta;
                    row.spend = meta.spend;
                    row.messages = meta.messages;
                    row.purchases = meta.purchases;
                    row.cpa = meta.cpa;
                    row.costPerMessage = meta.costPerMessage;
                    row.cr = meta.cr;
                    row.ctr = meta.ctr;
                    row.frequency = meta.frequency;
                    row.costAvailable = true;
                    row.vat = meta.spend * 0.1;
                    row.totalAdsCost = meta.spend + row.vat;
                    row.metricQuality = 'Khoảng lọc Meta theo hàng đã gom';
                } else {
                    row.costAvailable = false;
                    row.metricQuality = 'Chưa đủ Meta để tính khoảng lọc';
                }
            }

            row.matchedOrderCount = Array.isArray(row.matchedLedger) ? row.matchedLedger.length : 0;
            row.revenue = (row.matchedLedger || []).reduce((sum,item) => sum + Number(item.amount || 0),0);
            row.roas = row.costAvailable && Number(row.totalAdsCost || 0) > 0
                ? row.revenue / Number(row.totalAdsCost || 0)
                : 0;
            row.revenueQuality = `DT trong khoảng ${range.from ? formatBudgetFilterDateV241(range.from) : 'đầu stage'} → ${range.to ? formatBudgetFilterDateV241(range.to) : 'hôm nay'}`;
        }

        state.rows = candidates.sort((a,b) => Number(b.originalStageStartMsV241 || b.startMs || 0) - Number(a.originalStageStartMsV241 || a.startMs || 0));
        return state.rows;
    }

    window.applyBudgetRangeFilterV241 = async function(scope) {
        const key = scope === 'finance' ? 'finance' : 'performance';
        const groupEl = document.getElementById(`budget-filter-group-v243-${key}`);
        const fromEl = document.getElementById(`budget-filter-from-v241-${key}`);
        const toEl = document.getElementById(`budget-filter-to-v241-${key}`);
        let group = String(groupEl && groupEl.value || '').trim();
        const from = String(fromEl && fromEl.value || '').trim();
        const to = String(toEl && toEl.value || '').trim();
        const today = getBudgetTodayIsoV199();

        if (!group) group = resolveBudgetTypedTargetV244(key);
        if (!group) return showToast('Vui lòng gõ và chọn Nhân viên hoặc Nhóm quảng cáo đã gom trong danh sách gợi ý.','warning');
        if (from && !isBudgetIsoDateV198(from)) return showToast('Từ ngày không hợp lệ.','error');
        if (to && !isBudgetIsoDateV198(to)) return showToast('Đến ngày không hợp lệ.','error');
        if (from && to && from > to) return showToast('Từ ngày không được lớn hơn Đến ngày.','error');
        if ((from && from > today) || (to && to > today)) return showToast('Khoảng lọc không được vượt quá hôm nay.','error');

        state.filterGroupV243 = group;
        state.filterFrom = from;
        state.filterTo = to;
        syncBudgetRangeFilterInputsV241();

        try {
            showToast('Đang tính lại Theo dõi ngân sách theo khoảng ngày...','info');
            await applyBudgetViewRangeMetricsV241();
            renderBudgetPerformanceV166();
            renderMetaBudgetPerformanceV167();
            if (typeof window.__syncAdsLayoutV183 === 'function') window.__syncAdsLayoutV183();
        } catch(error) {
            console.error('Budget range filter V241:',error);
            showToast(`Không áp dụng được khoảng lọc: ${error && error.message ? error.message : error}`,'error');
        }
        return state.rows;
    };

    window.clearBudgetRangeFilterV241 = async function() {
        state.filterGroupV243 = '';
        state.filterFrom = '';
        state.filterTo = '';
        state.rangeMetaSummaryV288 = null;
        state.rows = Array.isArray(state.allRows) ? state.allRows.slice() : [];
        renderBudgetPerformanceV166();
        renderMetaBudgetPerformanceV167();
        if (typeof window.__syncAdsLayoutV183 === 'function') window.__syncAdsLayoutV183();
        return state.rows;
    };

    function isInvalidAutoZeroBudgetEventV226(event) {
        if (!event || event.isManual === true || String(event.source || '').startsWith('manual')) return false;

        const fromBudget = finiteBudgetNumberV210(event.fromBudget);
        const toBudget = finiteBudgetNumberV210(event.toBudget);
        const switchedToCampaignBudget = !!(
            event.toUsesCampaign ||
            event.toUsesCampaignBudget ||
            event.toBudgetUsesCampaign
        );

        // Meta không có một adset budget hợp lệ = 0. Nếu không phải chuyển sang
        // ngân sách chiến dịch thì đây là dấu vết của cache normalized bị đọc như raw.
        return !!(
            fromBudget !== null &&
            fromBudget > 0 &&
            toBudget === 0 &&
            !switchedToCampaignBudget
        );
    }

    // =====================================================
    // V234 — CHUẨN HÓA THỜI ĐIỂM EVENT TỰ ĐỘNG
    // Event cũ từng dùng adset.updated_time làm changedAt. Trường này không phải
    // lịch sử đổi ngân sách. Nếu có detectedAt (snapshot đầu tiên phát hiện đổi),
    // dùng detectedAt làm mốc hiển thị/tính stage và giữ changedAt cũ để audit.
    // =====================================================
    function normalizeAutoBudgetEventTimeV234(event) {
        if (!event || typeof event !== 'object') return event;

        const isManual = event.isManual === true || String(event.source || '').startsWith('manual');
        if (isManual) return event;

        const detectedAt = String(event.detectedAt || '').trim();
        const detectedMs = detectedAt ? new Date(detectedAt).getTime() : 0;
        if (!Number.isFinite(detectedMs) || detectedMs <= 0) return event;

        const originalChangedAt = String(event.changedAt || '');
        const originalChangedAtMs = Number(event.changedAtMs || 0);

        return {
            ...event,
            originalChangedAtV234:event.originalChangedAtV234 || originalChangedAt,
            originalChangedAtMsV234:Number(event.originalChangedAtMsV234 || originalChangedAtMs || 0),
            changedAt:new Date(detectedMs).toISOString(),
            changedAtMs:detectedMs,
            changedAtPrecision:String(event.changedAtPrecision || 'meta_snapshot_detection_5m'),
            changeWindowStartAt:String(event.changeWindowStartAt || event.baselineCapturedAt || ''),
            changeWindowEndAt:String(event.changeWindowEndAt || new Date(detectedMs).toISOString()),
            actualChangeTimeKnown:event.actualChangeTimeKnown === true
        };
    }

    function flattenBudgetEventsV166(root) {
        const rows = [];
        if (!root || typeof root !== 'object') return rows;

        Object.values(root).forEach(entityNode => {
            if (!entityNode || typeof entityNode !== 'object') return;
            Object.values(entityNode).forEach(event => {
                if (event && event.eventId && event.changedAtMs) rows.push(event);
            });
        });

        return rows.sort((a,b) => Number(a.changedAtMs || 0) - Number(b.changedAtMs || 0));
    }

    // =====================================================
    // V227 — DEDUPE REVENUE LEDGER AN TOÀN HƠN
    // - Nếu có Mã đơn hàng: Công ty + Mã đơn là danh tính chính.
    //   Upload lại cùng đơn nhưng sửa số tiền/SKU sẽ lấy bản upload mới nhất,
    //   không tạo thêm một doanh thu chỉ vì fingerprint cũ thay đổi.
    // - Nếu không có Mã đơn: giữ nguyên fallback fingerprint V25/V27.
    // - Chỉ đọc/chuẩn hóa ở client, KHÔNG thay đổi cấu trúc Firebase cũ.
    // =====================================================
    function normalizeRevenueOrderIdV227(value) {
        const normalized = normalizeAdsText(value || '').replace(/\s+/g,'');
        if (!normalized) return '';
        if (['0','na','n/a','none','null','khongco','khongcoma'].includes(normalized)) return '';
        return normalized;
    }

    function getRevenueLedgerIdentityV227(row, fallbackKey) {
        row = row || {};

        // Tương thích nếu ROAS phiên bản sau có ghi sẵn dedupeKey.
        const supplied = String(row.dedupeKeyV28 || row.dedupeKey || '').trim();
        if (supplied) return `supplied:${supplied}`;

        const orderId = normalizeRevenueOrderIdV227(row.orderId);
        const company = normalizeAdsText(row.company || '');
        if (orderId) return `order:${company}:${orderId}`;

        return `fingerprint:${String(row.fingerprint || fallbackKey || '')}`;
    }

    function flattenRevenueLedgerV166(root) {
        const byIdentity = new Map();
        let maxOrderAtMs = 0;
        let latestUploadAt = '';

        if (!root || typeof root !== 'object') {
            return { rows:[], maxOrderAtMs:0, latestUploadAt:'' };
        }

        Object.values(root).forEach(uploadNode => {
            if (!uploadNode || typeof uploadNode !== 'object') return;

            const meta = uploadNode._meta || {};
            if (String(meta.uploadedAt || '') > latestUploadAt) {
                latestUploadAt = String(meta.uploadedAt || '');
            }
            maxOrderAtMs = Math.max(
                maxOrderAtMs,
                Number(meta.maxOrderAtMs || 0)
            );

            Object.entries(uploadNode).forEach(([key, row]) => {
                if (key === '_meta' || !row || typeof row !== 'object') return;
                if (!Number(row.amount || 0) || !Number(row.createdAtMs || 0)) return;

                const identity = getRevenueLedgerIdentityV227(row, key);
                const current = byIdentity.get(identity);

                // File upload sau thắng metadata. Cùng Mã đơn chỉ được tính 1 lần.
                if (
                    !current ||
                    String(row.uploadedAt || '') >= String(current.uploadedAt || '')
                ) {
                    byIdentity.set(identity, {
                        ...row,
                        revenueIdentityV227:identity
                    });
                }

                maxOrderAtMs = Math.max(
                    maxOrderAtMs,
                    Number(row.createdAtMs || 0)
                );
                if (String(row.uploadedAt || '') > latestUploadAt) {
                    latestUploadAt = String(row.uploadedAt || '');
                }
            });
        });

        return {
            rows:Array.from(byIdentity.values()),
            maxOrderAtMs,
            latestUploadAt
        };
    }

    function sameEmployeeV166(a,b) {
        const na = normalizeAdsText(a || '');
        const nb = normalizeAdsText(b || '');
        if (!na || !nb) return false;
        if (na === nb) return true;
        if (na.includes(nb) || nb.includes(na)) return true;

        const aa = na.split(/\s+/).filter(Boolean);
        const bb = nb.split(/\s+/).filter(Boolean);
        const al = aa[aa.length - 1] || '';
        const bl = bb[bb.length - 1] || '';

        if (aa.length === 1 && al.length >= 3 && al === bl) return true;
        if (bb.length === 1 && bl.length >= 3 && al === bl) return true;
        return false;
    }

    function normalizeSkuV166(value) {
        return String(value || '').trim().toUpperCase();
    }

    function hasSkuIntersectionV166(a,b) {
        const aa = (Array.isArray(a) ? a : [])
            .map(normalizeSkuV166)
            .filter(Boolean);
        const bb = new Set(
            (Array.isArray(b) ? b : [])
                .map(normalizeSkuV166)
                .filter(Boolean)
        );
        return aa.some(value => bb.has(value));
    }

    function getCurrentOriginalAdsetV166(event) {
        const mergedRows = Array.isArray(META_LIVE_DATA) ? META_LIVE_DATA : [];

        for (const item of mergedRows) {
            const originals = Array.isArray(item && item.original_adset_rows)
                ? item.original_adset_rows
                : [item];

            for (const source of originals) {
                if (!source) continue;

                if (
                    event.adsetId &&
                    String(source.adsetId || '') === String(event.adsetId)
                ) {
                    return source;
                }

                if (
                    event.entityKey &&
                    String(
                        source.adsetId ||
                        source.fullName ||
                        ''
                    ) === String(event.entityKey)
                ) {
                    return source;
                }
            }
        }

        return null;
    }

    function getCurrentEventContextV186(event) {
        const company = String(
            event && event.company ||
            CURRENT_COMPANY ||
            'NNV'
        ).toUpperCase();

        /*
         * V198:
         * Theo dõi ngân sách dùng snapshot reference RIÊNG của chính module này.
         * Tuyệt đối không đọc META_LIVE_DATA / META_LIVE_CURRENT_SNAPSHOT của
         * bộ lọc ngày chung, vì đổi kỳ phía trên không được làm mất hoặc đổi số
         * của bảng Theo dõi ngân sách.
         */
        const expectedReferenceKey = getBudgetReferenceKeyV200(
            company,
            state.referencePeriod || getBudgetReferencePeriodV198()
        );

        let mergedRows = (
            state.referenceCompany === company &&
            state.referenceKey === expectedReferenceKey &&
            Array.isArray(state.referenceRows)
                ? state.referenceRows
                : []
        ).filter(row => (
            row &&
            (
                !row.company ||
                String(row.company).toUpperCase() === company
            )
        ));

        if (
            !mergedRows.length &&
            state.referenceSnapshot &&
            Array.isArray(state.referenceSnapshot.rows) &&
            state.referencePeriod
        ) {
            try {
                mergedRows = normalizeMetaLiveRows(
                    state.referenceSnapshot.rows,
                    company,
                    state.referencePeriod,
                    state.referenceSnapshot.syncedAt ||
                    state.referenceSnapshot.checkedAt ||
                    new Date().toISOString()
                );
            } catch(error) {}
        }

        const targetAdsetId = String(
            event && event.adsetId || ''
        ).trim();

        const targetEntityKey = String(
            event && event.entityKey || ''
        ).trim();

        const targetFullName = normalizeAdsText(
            event && event.fullName || ''
        );

        const targetEmployee = normalizeAdsText(
            event && event.employee || ''
        );

        const targetSkus = Array.isArray(
            event && event.skus
        )
            ? event.skus
                .map(value => normalizeAdsText(value))
                .filter(Boolean)
            : [];

        const targetProductKey = normalizeAdsText(
            event && (
                event.productName ||
                event.adName ||
                ''
            ) || ''
        );

        const savedGroupedSignature = String(
            event &&
            event.manualBaselineGroupedSignature ||
            ''
        ).trim();

        const savedMatchedNames = Array.isArray(
            event &&
            event.manualBaselineMatchedNames
        )
            ? event.manualBaselineMatchedNames
                .map(value => normalizeAdsText(value))
                .filter(Boolean)
            : [];

        function partsV188(source) {
            source = source || {};

            const parsed = parseMetaLiveAdsetName(
                source.fullName || '',
                source.employee || '',
                source.adName || ''
            );

            const employee = String(
                source.employee ||
                parsed.employee ||
                ''
            ).trim().toUpperCase();

            const adName = String(
                source.adName ||
                parsed.adName ||
                ''
            ).trim();

            const adParts = extractAdDuplicateParts(
                adName
            );

            const sourceSkus = Array.isArray(source.skus)
                ? source.skus
                : String(
                    source.skus ||
                    source.sku ||
                    adParts.sku ||
                    ''
                ).split(/[,;\/]+/);

            return {
                employeeKey:normalizeAdsText(employee),
                productKey:normalizeAdsText(
                    source.productName ||
                    adParts.productName ||
                    adName
                ),
                skuKeys:Array.from(
                    new Set(
                        sourceSkus
                            .map(value => normalizeAdsText(value))
                            .filter(Boolean)
                    )
                )
            };
        }

        function signatureV188(source) {
            const parts = partsV188(source);

            if (
                parts.employeeKey &&
                parts.skuKeys.length
            ) {
                return (
                    `${parts.employeeKey}` +
                    `||SKU||` +
                    `${parts.skuKeys
                        .slice()
                        .sort()
                        .join(',')}`
                );
            }

            if (
                parts.employeeKey &&
                parts.productKey
            ) {
                return (
                    `${parts.employeeKey}` +
                    `||PRODUCT||` +
                    `${parts.productKey}`
                );
            }

            return '';
        }

        function resultV188(
            item,
            sourceRow,
            matchMode
        ) {
            const groupedBaseline = !!(
                savedGroupedSignature ||
                String(
                    event &&
                    event.manualBaselineMatchMode ||
                    ''
                ) === 'grouped_same_as_table' ||
                String(
                    event &&
                    event.manualBaselineSource ||
                    ''
                ) === 'meta_auto_date_grouped'
            );

            return {
                groupedRow:item,
                sourceRow:sourceRow || item,

                /*
                 * Baseline gom như bảng thì current spend
                 * cũng bắt buộc lấy đúng grouped row.
                 */
                metricRow:groupedBaseline
                    ? item
                    : (sourceRow || item),

                budgetInfo:
                    getEffectiveGroupedBudgetInfo(
                        item
                    ),

                matchMode
            };
        }

        /*
         * STEP 1 — khóa ưu tiên:
         * signature đã được lưu ngay lúc bấm "Lấy".
         */
        if (savedGroupedSignature) {
            const signatureMatches =
                mergedRows.filter(item => (
                    signatureV188(item) ===
                    savedGroupedSignature
                ));

            if (signatureMatches.length === 1) {
                return resultV188(
                    signatureMatches[0],
                    signatureMatches[0],
                    'saved_grouped_signature'
                );
            }

            /*
             * Nếu có nhiều row cùng signature:
             * gom spend lại, đúng bản chất baseline đã gom.
             */
            if (signatureMatches.length > 1) {
                const combined = {
                    ...signatureMatches[0],

                    spend:signatureMatches.reduce(
                        (sum,row) => (
                            sum +
                            Number(row && row.spend || 0)
                        ),
                        0
                    ),

                    messages:signatureMatches.reduce(
                        (sum,row) => (
                            sum +
                            Number(row && row.messages || 0)
                        ),
                        0
                    ),

                    result:signatureMatches.reduce(
                        (sum,row) => (
                            sum +
                            Number(row && row.result || 0)
                        ),
                        0
                    ),

                    impressions:signatureMatches.reduce(
                        (sum,row) => (
                            sum +
                            Number(row && row.impressions || 0)
                        ),
                        0
                    ),

                    clicks:signatureMatches.reduce(
                        (sum,row) => (
                            sum +
                            Number(row && row.clicks || 0)
                        ),
                        0
                    ),

                    reach:signatureMatches.reduce(
                        (sum,row) => (
                            sum +
                            Number(row && row.reach || 0)
                        ),
                        0
                    )
                };

                return resultV188(
                    combined,
                    combined,
                    'saved_grouped_signature_combined'
                );
            }
        }

        /*
         * STEP 2 — các tên nhóm đã khớp lúc lấy baseline.
         */
        if (savedMatchedNames.length) {
            const nameMatches =
                mergedRows.filter(item => {
                    const names = [
                        normalizeAdsText(
                            item.fullName || ''
                        ),
                        normalizeAdsText(
                            `${item.employee || ''} - ${item.adName || ''}`
                        )
                    ].filter(Boolean);

                    return names.some(name => (
                        savedMatchedNames.includes(name)
                    ));
                });

            if (nameMatches.length === 1) {
                return resultV188(
                    nameMatches[0],
                    nameMatches[0],
                    'saved_matched_name'
                );
            }
        }

        function sourceMatches(source) {
            if (!source) return false;

            const sourceAdsetId = String(
                source.adsetId ||
                source.adset_id ||
                source.id ||
                ''
            ).trim();

            const sourceFullName =
                normalizeAdsText(
                    source.fullName ||
                    source.adsetName ||
                    source.adset_name ||
                    ''
                );

            if (
                targetAdsetId &&
                sourceAdsetId &&
                targetAdsetId === sourceAdsetId
            ) {
                return true;
            }

            if (
                targetEntityKey &&
                (
                    sourceAdsetId === targetEntityKey ||
                    String(
                        source.fullName || ''
                    ).trim() === targetEntityKey
                )
            ) {
                return true;
            }

            if (
                targetFullName &&
                sourceFullName &&
                targetFullName === sourceFullName
            ) {
                return true;
            }

            return false;
        }

        /*
         * STEP 3 — exact raw ID/name nằm trong grouped row.
         */
        for (const item of mergedRows) {
            if (!item) continue;

            const originals = (
                Array.isArray(
                    item.original_adset_rows
                ) &&
                item.original_adset_rows.length
            )
                ? item.original_adset_rows
                : [item];

            const exactSource =
                originals.find(
                    sourceMatches
                );

            if (exactSource) {
                return resultV188(
                    item,
                    exactSource,
                    'exact_original_in_group'
                );
            }
        }

        /*
         * STEP 4 — employee + SKU / product.
         */
        const candidates = [];

        for (const item of mergedRows) {
            if (!item) continue;

            const parts =
                partsV188(item);

            if (
                targetEmployee &&
                parts.employeeKey &&
                targetEmployee !==
                    parts.employeeKey
            ) {
                continue;
            }

            const hasSku = (
                targetSkus.length &&
                parts.skuKeys.some(
                    sku => targetSkus.includes(sku)
                )
            );

            const hasProduct = (
                targetProductKey &&
                parts.productKey &&
                targetProductKey ===
                    parts.productKey
            );

            if (hasSku || hasProduct) {
                candidates.push({
                    item,
                    mode:hasSku
                        ? 'employee_sku'
                        : 'employee_product'
                });
            }
        }

        if (candidates.length === 1) {
            return resultV188(
                candidates[0].item,
                candidates[0].item,
                candidates[0].mode
            );
        }

        /*
         * STEP 5 — unique SKU only.
         * Chỉ dùng nếu có duy nhất một dòng để tránh gán nhầm.
         */
        if (targetSkus.length) {
            const skuMatches =
                mergedRows.filter(item => {
                    const parts =
                        partsV188(item);

                    return parts.skuKeys.some(
                        sku => targetSkus.includes(sku)
                    );
                });

            if (skuMatches.length === 1) {
                return resultV188(
                    skuMatches[0],
                    skuMatches[0],
                    'unique_sku_only'
                );
            }
        }

        return {
            groupedRow:null,
            sourceRow:null,
            metricRow:null,
            budgetInfo:null,
            matchMode:'unresolved'
        };
    }

    function getBaselinePeriodStartMsV186(event) {
        const from = String(
            event && (
                event.baselinePeriodFrom ||
                event.manualBaselineAutoFrom ||
                ''
            ) || ''
        ).slice(0,10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
            return 0;
        }

        const value = new Date(
            `${from}T00:00:00`
        ).getTime();

        return Number.isFinite(value)
            ? value
            : 0;
    }


    function metricFromCurrentRowV166(row) {
        row = row || {};
        return {
            spend:Number(row.spend || 0),
            messages:Number(row.messages || 0),
            result:Number(row.result || 0),
            linkClicks:Number(row.linkClicks || 0),
            impressions:Number(row.impressions || 0),
            clicks:Number(row.clicks || 0),
            reach:Number(row.reach || 0)
        };
    }

    function metricDeltaV166(start,end) {
        if (!start || !end) return null;
        return {
            spend:Math.max(0, Number(end.spend || 0) - Number(start.spend || 0)),
            messages:Math.max(0, Number(end.messages || 0) - Number(start.messages || 0)),
            result:Math.max(0, Number(end.result || 0) - Number(start.result || 0)),
            linkClicks:Math.max(0, Number(end.linkClicks || 0) - Number(start.linkClicks || 0)),
            impressions:Math.max(0, Number(end.impressions || 0) - Number(start.impressions || 0)),
            clicks:Math.max(0, Number(end.clicks || 0) - Number(start.clicks || 0)),
            reach:Math.max(0, Number(end.reach || 0) - Number(start.reach || 0))
        };
    }

    // =====================================================
    // V229 — FIX RUNTIME V228: NGỮ CẢNH DOANH THU THEO HÀNG ĐÃ GOM
    // - V228 đã gọi hai helper này nhưng bản xuất cuối bị thiếu khai báo.
    // - Mọi doanh thu Theo dõi ngân sách tiếp tục lấy HÀNG ĐÃ GOM làm danh tính chuẩn.
    // - Adset Meta gốc chỉ là member để đối chiếu matchedAdsetName / adsetId.
    // =====================================================
    function getRevenueGroupedContextV228(event) {
        event = event || {};

        let groupedRow = null;
        try {
            const resolved = getCurrentEventContextV186(event);
            groupedRow = resolved && resolved.groupedRow
                ? resolved.groupedRow
                : null;
        } catch (error) {
            // Reference Meta có thể chưa sẵn sàng ở nhịp render đầu.
            // Khi đó vẫn dựng context an toàn từ event đã lưu.
            groupedRow = null;
        }

        const source = groupedRow || event;
        const parsed = parseMetaLiveAdsetName(
            source.fullName || event.fullName || '',
            source.employee || event.employee || '',
            source.adName || event.adName || ''
        );

        const employee = String(
            source.employee ||
            parsed.employee ||
            event.employee ||
            ''
        ).trim().toUpperCase();

        const adName = String(
            source.adName ||
            parsed.adName ||
            event.adName ||
            ''
        ).trim();

        const adParts = extractAdDuplicateParts(
            adName || source.fullName || event.fullName || ''
        );

        const skuValues = [];
        function collectSkus(value) {
            if (Array.isArray(value)) {
                value.forEach(collectSkus);
                return;
            }
            String(value || '')
                .split(/[,;\/]+/)
                .map(normalizeSkuV166)
                .filter(Boolean)
                .forEach(sku => skuValues.push(sku));
        }

        collectSkus(source.skus);
        collectSkus(source.sku);
        collectSkus(event.skus);
        collectSkus(event.sku);
        collectSkus(adParts.sku);

        const skus = Array.from(new Set(skuValues));
        const productName = String(
            source.productName ||
            event.productName ||
            adParts.productName ||
            adName ||
            ''
        ).trim();

        const fullName = String(
            source.fullName ||
            event.fullName ||
            (employee && adName ? `${employee} - ${adName}` : (adName || employee))
        ).trim();

        let signature = String(
            source.groupedSignature ||
            source.manualBaselineGroupedSignature ||
            source.meta_live_row_key ||
            event.groupedSignature ||
            event.manualBaselineGroupedSignature ||
            event.meta_live_row_key ||
            ''
        ).replace(/^group:/,'').trim();

        if (!signature) {
            try {
                signature = manualGroupedSignatureV209(source);
            } catch (error) {
                signature = '';
            }
        }

        // Fallback cuối cùng phải cùng chuẩn gom của bảng chính:
        // Nhân sự + SKU; nếu thiếu SKU mới dùng Nhân sự + tên sản phẩm.
        if (!signature) {
            const employeeKey = normalizeAdsText(employee);
            const normalizedSkus = skus
                .map(normalizeAdsText)
                .filter(Boolean)
                .sort();
            const productKey = normalizeAdsText(productName || adName);

            if (employeeKey && normalizedSkus.length) {
                signature = `${employeeKey}||SKU||${normalizedSkus.join(',')}`;
            } else if (employeeKey && productKey) {
                signature = `${employeeKey}||PRODUCT||${productKey}`;
            } else {
                signature = normalizeAdsText(fullName || adName || employee);
            }
        }

        const memberAdsetIds = new Set();
        const memberNames = new Set();

        function addMemberId(value) {
            const id = String(value || '').trim();
            if (id) memberAdsetIds.add(id);
        }

        function addMemberName(value) {
            const name = String(value || '').trim();
            if (name) memberNames.add(name);
        }

        [source,event].forEach(item => {
            if (!item) return;
            (Array.isArray(item.memberAdsetIds) ? item.memberAdsetIds : [])
                .forEach(addMemberId);
            (Array.isArray(item.memberNames) ? item.memberNames : [])
                .forEach(addMemberName);
            addMemberId(item.adsetId || item.adset_id || '');
            addMemberName(item.fullName || item.adsetName || item.adset_name || '');
        });

        try {
            const members = manualGroupedMembersV209(source);
            (members.memberAdsetIds || []).forEach(addMemberId);
            (members.memberNames || []).forEach(addMemberName);
        } catch (error) {}

        addMemberName(fullName);
        if (employee && adName) addMemberName(`${employee} - ${adName}`);

        return {
            groupedRow,
            sourceRow:source,
            signature,
            employee,
            skus,
            productName,
            adName,
            fullName,
            memberAdsetIds:Array.from(memberAdsetIds),
            memberNames:Array.from(memberNames)
        };
    }

    function revenueGroupedStageKeyV228(row) {
        row = row || {};
        const context = getRevenueGroupedContextV228(row);
        const company = String(
            row.company || CURRENT_COMPANY || 'NNV'
        ).trim().toUpperCase();

        const identity = String(
            context.signature ||
            `${normalizeAdsText(context.employee || '')}||${(context.skus || []).map(normalizeSkuV166).sort().join(',')}` ||
            normalizeAdsText(context.fullName || '')
        ).trim();

        const startMs = Number(row.startMs || 0);
        const endMs = Number(row.endMs || 0);

        // Cùng hàng gom nhưng khác khoảng thời gian là hai stage khác nhau.
        // Cùng hàng gom + cùng start/end là một stage duy nhất dù có nhiều raw adset/event.
        return [
            company,
            identity || 'UNKNOWN_GROUP',
            Number.isFinite(startMs) ? Math.floor(startMs) : 0,
            Number.isFinite(endMs) ? Math.floor(endMs) : 0
        ].join('||');
    }

    // V230 — chuẩn hóa tên adset dùng để đối chiếu Revenue Ledger với HÀNG ĐÃ GOM.
    // Giữ SKU/tên sản phẩm, chỉ loại biến thể kỹ thuật như VS1/V2/COPY/TEST để
    // matchedAdsetName từ ROAS có thể khớp với mọi member adset của cùng hàng gom.
    function normalizeAdsetRevenueNameV227(value) {
        let text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';

        text = text
            // Hậu tố thực tế của tên nhóm trong ROAS.
            .replace(/\s+VS\s*\d+\s*$/i, ' ')
            .replace(/\s+V\s*\d+\s*$/i, ' ')
            // Các biến thể kỹ thuật có thể nằm giữa/cuối tên nhóm Meta.
            .replace(/\b(?:VS|VER|VERSION|V|COPY|TEST)\s*\d+\b/gi, ' ')
            .replace(/\b(?:BẢN|BAN)\s*\d+\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Không dùng cleanDuplicateProductName() ở đây vì hàm đó loại ngoặc,
        // trong khi ngoặc đang chứa SKU cần giữ để tăng độ chính xác khi đối chiếu.
        return normalizeAdsText(text);
    }

    function normalizeRoasGroupKeyV227(value) {
        const raw = String(value || '');
        const splitAt = raw.indexOf('|');
        if (splitAt < 0) return '';

        const employee = normalizeAdsText(raw.slice(0,splitAt));
        const sku = normalizeSkuV166(raw.slice(splitAt + 1));
        return employee && sku ? `${employee}|${sku}` : '';
    }

    function eventRoasGroupKeysV227(event) {
        if (!event) return [];
        const context = getRevenueGroupedContextV228(event);
        const employee = normalizeAdsText(context.employee || event.employee || '');
        if (!employee) return [];

        return (context.skus || [])
            .map(normalizeSkuV166)
            .filter(Boolean)
            .map(sku => `${employee}|${sku}`);
    }

    function getLedgerEventContextScoreV227(ledger,event) {
        if (!ledger || !event) return -1;

        const context = getRevenueGroupedContextV228(event);
        let score = 0;
        const eventSkus = (context.skus || [])
            .map(normalizeSkuV166)
            .filter(Boolean);

        const matchedSku = normalizeSkuV166(ledger.matchedSku || '');
        if (matchedSku) {
            if (!eventSkus.includes(matchedSku)) return -1;
            score += 80;
        }

        const matchedGroupKey = normalizeRoasGroupKeyV227(ledger.matchedGroupKey);
        if (matchedGroupKey) {
            const eventKeys = eventRoasGroupKeysV227(event);
            if (!eventKeys.includes(matchedGroupKey)) return -1;
            score += 180;
        }

        // V228: matchedAdsetName của ROAS được đối chiếu với TOÀN BỘ adset thành viên
        // của hàng gom. Không bắt buộc phải trùng tên canonical đang hiển thị.
        const matchedAdset = normalizeAdsetRevenueNameV227(ledger.matchedAdsetName || '');
        if (matchedAdset) {
            const groupedNames = Array.from(new Set([
                context.fullName,
                context.adName,
                context.productName,
                ...(context.memberNames || [])
            ]
                .map(normalizeAdsetRevenueNameV227)
                .filter(Boolean)));

            if (groupedNames.includes(matchedAdset)) {
                score += 1200;
            } else if (groupedNames.some(name => (
                name.includes(matchedAdset) || matchedAdset.includes(name)
            ))) {
                score += 900;
            }
        }

        // Có grouped signature là bằng chứng rằng doanh thu đang được xét ở cấp hàng gom.
        if (context.signature) score += 40;

        return score;
    }

    function matchLedgerToEventV166(ledger,event,startMs,endMs) {
        if (!ledger || !event) return false;
        if (String(ledger.company || '') !== String(event.company || '')) return false;

        const time = Number(ledger.createdAtMs || 0);
        if (!time || time < startMs || time >= endMs) return false;

        const context = getRevenueGroupedContextV228(event);
        const groupedEmployee = context.employee || event.employee || '';
        if (!sameEmployeeV166(ledger.employee, groupedEmployee)) return false;

        const eventSkus = Array.isArray(context.skus) ? context.skus : [];
        const ledgerSkus = Array.isArray(ledger.skus) ? ledger.skus : [];

        // Theo dõi doanh thu sau đổi NS cần SKU để tránh gán sai doanh thu.
        if (!eventSkus.length || !ledgerSkus.length) return false;
        if (!hasSkuIntersectionV166(eventSkus, ledgerSkus)) return false;

        // Nếu ROAS đã xác nhận SKU/Group cụ thể thì phải tôn trọng kết quả đó.
        const matchedSku = normalizeSkuV166(ledger.matchedSku || '');
        if (matchedSku) {
            const normalizedEventSkus = eventSkus.map(normalizeSkuV166).filter(Boolean);
            if (!normalizedEventSkus.includes(matchedSku)) return false;
        }

        const matchedGroupKey = normalizeRoasGroupKeyV227(ledger.matchedGroupKey);
        if (matchedGroupKey) {
            if (!eventRoasGroupKeysV227(event).includes(matchedGroupKey)) return false;
        }

        return true;
    }

    // V228 — mỗi đơn chỉ được gán TỐI ĐA MỘT LẦN cho HÀNG ĐÃ GOM phù hợp nhất.
    // Các raw adset/event cùng đại diện cho một group-stage được gom candidate trước,
    // nên không tạo ambiguity giả và tuyệt đối không nhân đôi doanh thu.
    function applyUniqueRevenueAllocationV227(stageRows) {
        const rows = Array.isArray(stageRows) ? stageRows : [];
        const ledgerRows = Array.isArray(state.ledger) ? state.ledger : [];
        const ambiguous = [];
        const unassigned = [];

        rows.forEach(row => {
            const context = getRevenueGroupedContextV228(row);
            row.revenueGroupedSignatureV228 = context.signature || '';
            row.revenueGroupedMemberNamesV228 = (context.memberNames || []).slice();
            row.revenueGroupedMemberAdsetIdsV228 = (context.memberAdsetIds || []).slice();
            row.matchedLedger = [];
            row.matchedOrderCount = 0;
            row.revenue = 0;
            row.revenueAllocationV227 = 'unique_grouped_order_allocation_v228';
        });

        ledgerRows.forEach(ledger => {
            const rawCandidates = rows
                .filter(row => matchLedgerToEventV166(
                    ledger,
                    row,
                    Number(row.startMs || 0),
                    Number(row.endMs || 0)
                ))
                .map(row => ({
                    row,
                    score:getLedgerEventContextScoreV227(ledger,row),
                    groupStageKey:revenueGroupedStageKeyV228(row)
                }))
                .filter(item => item.score >= 0);

            // Dedupe các candidate raw cùng thuộc một hàng gom + cùng stage thời gian.
            const byGroupedStage = new Map();
            rawCandidates.forEach(item => {
                const key = item.groupStageKey;
                const current = byGroupedStage.get(key);
                if (!current || item.score > current.score) {
                    byGroupedStage.set(key,item);
                }
            });
            const candidates = Array.from(byGroupedStage.values());

            if (!candidates.length) {
                unassigned.push(ledger);
                return;
            }

            const bestScore = Math.max(...candidates.map(item => item.score));
            const best = candidates.filter(item => item.score === bestScore);

            if (best.length !== 1) {
                ambiguous.push({
                    ledger,
                    candidateGroupedStages:best.map(item => item.groupStageKey),
                    candidateEventIds:best.map(item => String(item.row.eventId || item.row.entityKey || item.row.adsetId || '')),
                    score:bestScore
                });
                return;
            }

            best[0].row.matchedLedger.push(ledger);
        });

        rows.forEach(row => {
            row.matchedOrderCount = row.matchedLedger.length;
            row.revenue = row.matchedLedger.reduce(
                (sum,ledger) => sum + Number(ledger.amount || 0),
                0
            );
            row.roas = row.costAvailable && Number(row.totalAdsCost || 0) > 0
                ? row.revenue / Number(row.totalAdsCost || 0)
                : 0;
        });

        state.revenueAllocationDiagnosticsV227 = {
            version:'V228_GROUPED_REVENUE',
            totalLedgerRows:ledgerRows.length,
            allocatedOrders:rows.reduce((sum,row) => sum + Number(row.matchedOrderCount || 0),0),
            ambiguousOrders:ambiguous.length,
            unassignedOrders:unassigned.length,
            ambiguous,
            updatedAt:Date.now()
        };

        return rows;
    }

    function formatDateTimeV166(value) {
        if (!value) return '-';
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toLocaleString('vi-VN', {
            hour:'2-digit',
            minute:'2-digit',
            day:'2-digit',
            month:'2-digit',
            year:'numeric'
        });
    }

    function budgetChangedAtNoteV234(row) {
        if (!row) return '';
        if (row.isVirtualManualFollowupV234) return 'Mốc thủ công chính xác';
        if (row.isManual) return 'Mốc thủ công';
        if (String(row.changedAtPrecision || '') === 'meta_snapshot_detection_5m') {
            return 'Tự ghi nhận · độ chính xác ≤ 5 phút';
        }
        return '';
    }

    function formatDurationV166(startMs,endMs) {
        const ms = Math.max(0, Number(endMs || 0) - Number(startMs || 0));
        const hours = ms / 3600000;
        if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)} giờ`;
        const days = hours / 24;
        return `${days.toFixed(days < 10 ? 1 : 0)} ngày`;
    }

    function budgetStageEntityKeyV196(event) {
        if (!event) return '';

        const adsetId = String(event.adsetId || event.adset_id || '').trim();
        if (adsetId) return `adset:${adsetId}`;

        const entityKey = String(event.entityKey || '').trim();
        if (entityKey) return `entity:${entityKey}`;

        const fullName = normalizeAdsText(event.fullName || '');
        return fullName ? `name:${fullName}` : '';
    }

    // =====================================================
    // V210 — TRACKING SESSION CHO THAY ĐỔI NGÂN SÁCH
    // - Tăng ngân sách => bắt đầu/tiếp tục theo dõi.
    // - Giảm nhưng vẫn cao hơn mức nền trước lần tăng => vẫn theo dõi.
    // - Giảm về bằng/thấp hơn mức nền => tự ngưng theo dõi.
    // - Người dùng có thể ngưng thủ công tại trạng thái "Đang theo dõi".
    // =====================================================
    function finiteBudgetNumberV210(value) {
        if (value === '' || value === null || value === undefined) return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    // V226: 0 chỉ được xem là "chưa xác định" cho ngân sách adset hiện tại.
    // Meta adset budget hợp lệ phải > 0; trường hợp dùng ngân sách chiến dịch
    // được biểu diễn riêng bằng usesCampaignBudget và không được suy diễn thành giảm về 0.
    function reliableCurrentBudgetAmountV226(info) {
        if (!info || info.usesCampaignBudget) return null;
        const value = finiteBudgetNumberV210(info.amount);
        return value !== null && value > 0 ? value : null;
    }

    function normalizeBudgetTrackingControlsV210(root) {
        const out = {};
        if (!root || typeof root !== 'object') return out;

        Object.entries(root).forEach(([key,value]) => {
            if (!value || typeof value !== 'object') return;
            const eventId = String(value.eventId || key || '').trim();
            if (!eventId) return;
            out[eventId] = {
                ...value,
                eventId,
                stoppedAtMs:Number(value.stoppedAtMs || 0),
                stopCumulativeSpend:finiteBudgetNumberV210(value.stopCumulativeSpend),
                stopMetrics:value.stopMetrics && typeof value.stopMetrics === 'object'
                    ? value.stopMetrics
                    : null
            };
        });

        return out;
    }

    function getBudgetTrackingControlV210(event) {
        if (!event) return null;
        const eventId = String(event.eventId || '').trim();
        return eventId && state.trackingControls
            ? (state.trackingControls[eventId] || null)
            : null;
    }

    function getBudgetDirectionV210(fromBudget,toBudget) {
        const from = finiteBudgetNumberV210(fromBudget);
        const to = finiteBudgetNumberV210(toBudget);
        if (from === null || to === null) return 'change';
        if (to > from) return 'increase';
        if (to < from) return 'decrease';
        return 'change';
    }

    // =====================================================
    // V234 — MỐC ĐỔI TIẾP THEO CỦA EVENT THỦ CÔNG
    // Ví dụ: 200→300 lúc 23/07 17:00, sau đó 300→390 lúc 30/07 09:00.
    // Nếu người dùng nhập thời điểm đổi tiếp theo, sinh một event ảo 300→390
    // tại ĐÚNG 30/07 09:00 để stage 300 kết thúc đúng mốc. Event ảo chỉ dùng
    // để tính/hiển thị, không ghi thêm node Firebase.
    // =====================================================
    function expandManualFollowupEventsV234(sourceEvents) {
        const base = (Array.isArray(sourceEvents) ? sourceEvents : []).slice();
        const expanded = base.slice();

        base.forEach(event => {
            if (!event || event.isManual !== true) return;
            if (String(event.manualToBudgetMode || '') !== 'fixed') return;

            const startMs = Number(event.changedAtMs || 0);
            const followMs = Number(event.manualNextChangeAtMs || 0);
            if (!startMs || !followMs || followMs <= startMs || followMs > Date.now()) return;

            const fromBudget = finiteBudgetNumberV210(event.toBudget);
            const toBudget = finiteBudgetNumberV210(
                event.manualNextBudgetTo !== null && event.manualNextBudgetTo !== undefined
                    ? event.manualNextBudgetTo
                    : event.manualCurrentBudget
            );

            if (fromBudget === null || toBudget === null || fromBudget === toBudget) return;

            const eventKey = budgetStageEntityKeyV196(event);

            // Nếu hệ thống đã có một event thật cùng entity trong khoảng này thì
            // event thật luôn ưu tiên; không tạo mốc ảo chồng lên lịch sử tự động.
            const hasRecordedEvent = base.some(other => {
                if (!other || other === event) return false;
                if (budgetStageEntityKeyV196(other) !== eventKey) return false;
                if (String(other.parentManualEventIdV236 || '') === String(event.eventId || '')) return true;
                const otherMs = Number(other.changedAtMs || 0);
                return otherMs > startMs && otherMs <= followMs;
            });
            if (hasRecordedEvent) return;

            const followAt = new Date(followMs).toISOString();
            expanded.push({
                ...event,
                eventId:`${String(event.eventId || 'manual')}__followup_v234`,
                source:'manual_followup_virtual_v234',
                isManual:false,
                isVirtualManualFollowupV234:true,
                parentManualEventIdV234:String(event.eventId || ''),

                changedAt:followAt,
                changedAtMs:followMs,
                detectedAt:followAt,
                sourceUpdatedAt:followAt,
                changedAtPrecision:'manual_exact',
                actualChangeTimeKnown:true,

                fromBudget,
                toBudget,
                effectiveToBudget:toBudget,
                delta:toBudget - fromBudget,
                direction:getBudgetDirectionV210(fromBudget,toBudget),
                manualToBudgetMode:'fixed',

                baselineMetrics:event.manualNextBaselineMetrics || null,
                manualBaselineMetrics:event.manualNextBaselineMetrics || null,
                manualBaselineSpend:finiteBudgetNumberV210(event.manualNextBaselineSpend),
                baselineCapturedAt:String(event.manualNextBaselineSyncedAt || followAt),
                baselineCapturedAtMs:followMs,
                baselinePrecision:String(event.manualNextBaselinePrecision || 'manual_followup_v234'),
                baselinePeriodTo:dateOnlyLocalV172(followAt),

                manualCurrentMetrics:event.manualCurrentMetrics || null,
                manualCurrentSpend:event.manualCurrentSpend,
                manualCurrentBudget:toBudget,
                manualCurrentBudgetUsesCampaign:!!event.manualCurrentBudgetUsesCampaign,
                manualCurrentBudgetType:String(event.manualCurrentBudgetType || ''),
                manualCurrentBudgetSource:String(event.manualCurrentBudgetSource || 'manual_followup_v234')
            });
        });

        return expanded;
    }

    function buildBudgetPerformanceRowsV166() {
        const company = String(CURRENT_COMPANY || 'NNV');
        const events = expandManualFollowupEventsV234(state.events)
            .filter(event => String(event.company || '') === company)
            .sort((a,b) => Number(a.changedAtMs || 0) - Number(b.changedAtMs || 0));

        const byEntity = new Map();
        events.forEach(event => {
            // V196: adsetId là danh tính ổn định nhất. Tránh mốc thủ công và tự động
            // của cùng adset bị tách thành 2 chuỗi chỉ vì entityKey khác cách biểu diễn.
            const key = budgetStageEntityKeyV196(event);
            if (!key) return;
            if (!byEntity.has(key)) byEntity.set(key, []);
            byEntity.get(key).push(event);
        });

        const output = [];
        const nowMs = Date.now();

        function deriveStageMetricsV167(deltaMetrics) {
            if (!deltaMetrics) {
                return {
                    available:false,
                    spend:0,
                    messages:0,
                    purchases:0,
                    linkClicks:0,
                    impressions:0,
                    reach:0,
                    cr:0,
                    ctr:0,
                    frequency:0,
                    costPerMessage:0,
                    cpa:0
                };
            }

            const spend = Number(deltaMetrics.spend || 0);
            const messages = Number(deltaMetrics.messages || 0);
            const purchases = Number(deltaMetrics.result || 0);
            const linkClicks = Number(deltaMetrics.linkClicks || 0);
            const impressions = Number(deltaMetrics.impressions || 0);
            const reach = Number(deltaMetrics.reach || 0);

            return {
                available:true,
                spend,
                messages,
                purchases,
                linkClicks,
                impressions,
                reach,
                cr:messages > 0
                    ? (purchases / messages) * 100
                    : (purchases > 0 ? 100 : 0),
                ctr:impressions > 0
                    ? (linkClicks / impressions) * 100
                    : 0,
                frequency:reach > 0
                    ? impressions / reach
                    : 0,
                costPerMessage:messages > 0
                    ? spend / messages
                    : 0,
                cpa:purchases > 0
                    ? spend / purchases
                    : 0
            };
        }

        function finiteNumberOrNullV172(value) {
            if (value === '' || value === null || value === undefined) return null;
            const number = Number(value);
            return Number.isFinite(number) ? number : null;
        }

        function eventCumulativeSpendV172(event) {
            if (!event) return null;

            const manual = finiteNumberOrNullV172(event.manualBaselineSpend);
            if (manual !== null) return manual;

            const baselineSpend = finiteNumberOrNullV172(
                event.baselineMetrics && event.baselineMetrics.spend
            );

            return baselineSpend;
        }


        function isManualDateBaselineAmbiguousV196(event, entityEvents) {
            if (!event) return false;

            const isManual = (
                event.isManual === true ||
                String(event.source || '') === 'manual_v172'
            );

            if (!isManual) return false;

            const source = String(event.manualBaselineSource || '');
            if (!source.startsWith('meta_auto_date')) return false;

            const eventDay = dateOnlyLocalV172(event.changedAt || event.changedAtMs || 0);
            if (!eventDay) return false;

            return (Array.isArray(entityEvents) ? entityEvents : []).some(other => (
                other !== event &&
                dateOnlyLocalV172(other && (other.changedAt || other.changedAtMs) || 0) === eventDay
            ));
        }

        function eventCumulativeSpendForStageV196(event, entityEvents) {
            if (isManualDateBaselineAmbiguousV196(event, entityEvents)) {
                // Baseline cũ chỉ theo ngày không thể phân tách 2 lần đổi trong cùng ngày.
                // Không dùng số này để tránh kéo stage đến hiện tại hoặc trừ sai mốc.
                return null;
            }

            return eventCumulativeSpendV172(event);
        }


        // =========================================================
        // V287 — BASELINE BIÊN BỀN VỮNG CHO STAGE ĐÃ ĐÓNG
        // Khi một mốc mới xuất hiện, stage trước không còn được phép lấy chi lũy kế
        // "hiện tại". Biên kết thúc phải lấy từ chính baseline đã lưu của mốc kế tiếp.
        // Đọc nhiều trường tương thích để không mất số khi event đến từ V203/V253/V264.
        // =========================================================
        function eventBoundaryCumulativeSpendV287(event, entityEvents) {
            if (!event) return null;

            const candidates = [
                event.startCumulativeSpend,
                event.manualBaselineSpend,
                event.manualBaselineMetrics && event.manualBaselineMetrics.spend,
                event.baselineMetrics && event.baselineMetrics.spend,
                event.previousObservedMetrics && event.previousObservedMetrics.spend
            ];

            for (const value of candidates) {
                const number = finiteNumberOrNullV172(value);
                if (number !== null && number >= 0) return number;
            }

            return eventCumulativeSpendForStageV196(event, entityEvents);
        }

        function cachedClosedStageBoundarySpendV287(event, nextEvent, startSpend) {
            if (!event || !nextEvent) return null;
            const cached = readBudgetCurrentSpendV200(event);
            if (!cached) return null;

            const spend = finiteNumberOrNullV172(cached.spend);
            if (spend === null || (startSpend !== null && spend < startSpend)) return null;

            const boundaryMs = Number(nextEvent.changedAtMs || 0);
            const cachedSyncedMs = new Date(cached.syncedAt || '').getTime();

            // Cache này chỉ được chấp nhận nếu là số đã quan sát trước/đúng lúc mốc mới.
            // Cho dung sai 6 phút vì Auto Budget dùng snapshot khoảng 5 phút.
            if (
                boundaryMs > 0 &&
                Number.isFinite(cachedSyncedMs) &&
                cachedSyncedMs > boundaryMs + 6 * 60 * 1000
            ) return null;

            return spend;
        }

        byEntity.forEach(entityEvents => {
            entityEvents.sort((a,b) => Number(a.changedAtMs || 0) - Number(b.changedAtMs || 0));

            // V210: mức nền là ngân sách NGAY TRƯỚC lần tăng đầu tiên của một phiên theo dõi.
            // Giảm vẫn được ghi nhận; chỉ khi giảm về <= mức nền thì phiên theo dõi tự đóng.
            let activeTrackingBaseV210 = null;

            entityEvents.forEach((event,index) => {
                const nextEvent = entityEvents[index + 1] || null;
                const startMs = Number(event.changedAtMs || 0);
                const naturalEndMsV210 = nextEvent
                    ? Number(nextEvent.changedAtMs || 0)
                    : nowMs;
                let endMs = naturalEndMsV210;

                // V235: mốc ảo sinh từ một mốc thủ công (ví dụ 300→390) vẫn là
                // một stage thủ công dẫn xuất. Phải được phép dùng manualCurrentSpend/
                // manualCurrentMetrics đã lưu tới hiện tại; nếu không stage cuối sẽ báo
                // sai "Chưa có chi lũy kế hiện tại" dù 390 chính là ngân sách hiện tại.
                const isManual = (
                    event.isManual === true ||
                    event.isVirtualManualFollowupV234 === true ||
                    String(event.source || '') === 'manual_v172'
                );

                const samePeriodWithNext = !!(
                    nextEvent &&
                    String(nextEvent.baselinePeriodFrom || '') ===
                        String(event.baselinePeriodFrom || '')
                );

                const currentContext = !nextEvent
                    ? getCurrentEventContextV186(event)
                    : {
                        groupedRow:null,
                        sourceRow:null,
                        metricRow:null,
                        budgetInfo:null,
                        matchMode:'closed_stage'
                    };

                const currentSource =
                    currentContext.metricRow || null;

                const storedCurrentBudgetV213 = finiteNumberOrNullV172(
                    event && event.manualCurrentBudget
                );

                const currentBudgetInfo =
                    currentContext.budgetInfo || (
                        isManual && storedCurrentBudgetV213 !== null
                            ? {
                                amount:storedCurrentBudgetV213,
                                usesCampaignBudget:!!event.manualCurrentBudgetUsesCampaign,
                                type:String(event.manualCurrentBudgetType || ''),
                                source:String(event.manualCurrentBudgetSource || 'manual_popup_current_v213')
                            }
                            : null
                    );

                // V173: manual event có thể bỏ trống Ngân sách sau.
                // Ưu tiên suy ra theo lịch sử thực tế:
                // 1) Có mốc kế tiếp => NS trước của mốc kế tiếp.
                // 2) Chưa có mốc kế tiếp => NS Meta hiện tại đang chạy.
                let effectiveToBudget = finiteNumberOrNullV172(event.toBudget);
                let toBudgetResolvedFrom = 'stored';

                if (
                    isManual &&
                    String(event.manualToBudgetMode || '') === 'current' &&
                    effectiveToBudget === null
                ) {
                    const nextFromBudget = finiteNumberOrNullV172(
                        nextEvent && nextEvent.fromBudget
                    );

                    if (nextFromBudget !== null) {
                        effectiveToBudget = nextFromBudget;
                        toBudgetResolvedFrom = 'next_event';
                    } else if (currentBudgetInfo) {
                        const currentBudget = reliableCurrentBudgetAmountV226(
                            currentBudgetInfo
                        );

                        if (currentBudget !== null) {
                            effectiveToBudget = currentBudget;
                            toBudgetResolvedFrom = 'meta_current_logic';
                        } else {
                            // Không được biến dữ liệu cache thiếu budget thành một lần giảm về 0.
                            toBudgetResolvedFrom = currentBudgetInfo.usesCampaignBudget
                                ? 'campaign_budget_unresolved'
                                : 'unresolved';
                        }
                    } else {
                        toBudgetResolvedFrom = 'unresolved';
                    }
                }

                // -------- V210 TRACKING STATE --------
                const fromBudgetV210 = finiteBudgetNumberV210(event.fromBudget);
                const resolvedToBudgetV210 = finiteBudgetNumberV210(effectiveToBudget);
                const directionV210 = getBudgetDirectionV210(
                    fromBudgetV210,
                    resolvedToBudgetV210
                );

                const trackingControlV210 = getBudgetTrackingControlV210(event);
                const controlStopMsV210 = Number(
                    trackingControlV210 && trackingControlV210.stoppedAtMs || 0
                );
                const validStoredStopV210 = !!(
                    trackingControlV210 &&
                    controlStopMsV210 >= startMs &&
                    controlStopMsV210 <= naturalEndMsV210
                );
                const storedStopReasonV210 = String(
                    trackingControlV210 && trackingControlV210.reason || ''
                );
                const validManualStopV210 = !!(
                    validStoredStopV210 && storedStopReasonV210 === 'manual'
                );
                const validAutoControlStopV210 = !!(
                    validStoredStopV210 && storedStopReasonV210 !== 'manual'
                );

                let trackingStartedHereV210 = false;
                let trackingParticipatesV210 = false;
                let trackingAutoStoppedV210 = false;
                let trackingAutoStoppedByCurrentV210 = false;
                let trackingBaseForRowV210 = activeTrackingBaseV210;
                let trackingStopReasonV210 = '';
                let trackingStopBudgetV210 = null;

                if (activeTrackingBaseV210 === null) {
                    // Chỉ TĂNG ngân sách mới khởi tạo một phiên theo dõi mới.
                    if (
                        fromBudgetV210 !== null &&
                        resolvedToBudgetV210 !== null &&
                        resolvedToBudgetV210 > fromBudgetV210
                    ) {
                        activeTrackingBaseV210 = fromBudgetV210;
                        trackingBaseForRowV210 = fromBudgetV210;
                        trackingStartedHereV210 = true;
                        trackingParticipatesV210 = true;
                    }
                } else {
                    trackingBaseForRowV210 = activeTrackingBaseV210;

                    if (
                        resolvedToBudgetV210 !== null &&
                        !(event && event.toUsesCampaign) &&
                        resolvedToBudgetV210 <= activeTrackingBaseV210
                    ) {
                        // Đã giảm về mức trước lần tăng (hoặc thấp hơn): tự ngưng.
                        trackingAutoStoppedV210 = true;
                        trackingStopReasonV210 = 'auto_return_to_base';
                        trackingStopBudgetV210 = resolvedToBudgetV210;
                    } else {
                        // Có thể là tăng tiếp hoặc giảm nhẹ nhưng vẫn cao hơn mức nền.
                        trackingParticipatesV210 = true;
                    }
                }

                // Nếu đã bấm ngưng thủ công ở chính stage này thì stage kết thúc đúng lúc bấm.
                if (validStoredStopV210) {
                    trackingParticipatesV210 = true;
                    trackingStopReasonV210 = storedStopReasonV210 || 'manual';
                    trackingStopBudgetV210 = finiteBudgetNumberV210(
                        trackingControlV210.stopBudget
                    );
                    endMs = Math.min(endMs, controlStopMsV210);
                }

                // Event giảm về mức nền chỉ là MỐC ĐÓNG, không tạo một stage mới kéo đến hiện tại.
                if (trackingAutoStoppedV210) {
                    endMs = startMs;
                }

                // Event giảm độc lập (không có phiên tăng đang theo dõi) vẫn được ghi nhận,
                // nhưng không được tính là một phiên đang chạy đến hiện tại.
                if (!trackingParticipatesV210 && !trackingAutoStoppedV210) {
                    endMs = startMs;
                }

                // Trường hợp chưa kịp có event giảm tương ứng nhưng Meta hiện tại đã
                // về <= mức nền: đóng ngay theo dữ liệu thực tế của grouped row đang theo dõi.
                if (
                    !nextEvent &&
                    trackingParticipatesV210 &&
                    !validStoredStopV210 &&
                    activeTrackingBaseV210 !== null &&
                    currentBudgetInfo &&
                    !currentBudgetInfo.usesCampaignBudget
                ) {
                    const currentBudgetValueV210 = reliableCurrentBudgetAmountV226(
                        currentBudgetInfo
                    );

                    if (
                        currentBudgetValueV210 !== null &&
                        currentBudgetValueV210 <= activeTrackingBaseV210
                    ) {
                        trackingAutoStoppedByCurrentV210 = true;
                        trackingStopReasonV210 = 'auto_current_budget_returned';
                        trackingStopBudgetV210 = currentBudgetValueV210;

                        const referenceStopMsV210 = new Date(
                            state.referenceSyncedAt || Date.now()
                        ).getTime();

                        endMs = Number.isFinite(referenceStopMsV210)
                            ? Math.min(nowMs, Math.max(startMs, referenceStopMsV210))
                            : nowMs;
                    }
                }

                // V198: kỳ hiện tại để tính stage là Meta reference riêng
                // của Theo dõi ngân sách, không phải kỳ chung phía trên.
                let currentPeriodFrom = String(
                    state.referencePeriod &&
                    state.referencePeriod.from ||
                    ''
                );

                const eventBaselineFrom = String(
                    event.baselinePeriodFrom ||
                    event.manualBaselineAutoFrom ||
                    ''
                );

                /*
                 * V187:
                 * Không phụ thuộc META_LIVE_STATE.from phải luôn có giá trị.
                 * Nếu mốc thủ công có baseline cùng ngày bắt đầu kỳ đang xem,
                 * chi Meta hiện tại có thể dùng để trừ baseline.
                 */
                const currentPeriodMatches = !!(
                    currentSource &&
                    (
                        !eventBaselineFrom ||
                        !currentPeriodFrom ||
                        currentPeriodFrom === eventBaselineFrom
                    )
                );

                // -------- FULL META METRICS --------
                // V203: mốc thủ công có thể lưu baseline/current Metrics riêng từ popup.
                const startMetrics = isManual
                    ? (event.manualBaselineMetrics || event.baselineMetrics || null)
                    : (event.baselineMetrics || null);
                let endMetrics = null;

                if (
                    validStoredStopV210 &&
                    trackingControlV210 &&
                    trackingControlV210.stopMetrics
                ) {
                    // Ngưng thủ công: đóng băng metrics đúng lúc bấm ngưng.
                    endMetrics = trackingControlV210.stopMetrics;
                } else if (trackingAutoStoppedV210 || (!trackingParticipatesV210 && endMs === startMs)) {
                    // Mốc giảm về nền / giảm độc lập chỉ dùng để ghi nhận thay đổi,
                    // không tạo thêm dữ liệu sau đổi kéo đến hiện tại.
                    endMetrics = startMetrics;
                } else if (nextEvent && samePeriodWithNext) {
                    endMetrics = nextEvent.manualBaselineMetrics || nextEvent.baselineMetrics || null;
                } else if (!nextEvent && currentPeriodMatches && currentSource) {
                    endMetrics = metricFromCurrentRowV166(currentSource);
                } else if (!nextEvent && isManual && event.manualCurrentMetrics) {
                    // V235: áp dụng cả cho mốc tiếp nối thủ công 300→390. Nếu 390 là
                    // ngân sách hiện tại, currentMetrics là số lũy kế từ Phạm vi dữ liệu
                    // đến hôm nay; trừ baseline tại mốc 390 để ra đúng stage 390→hiện tại.
                    endMetrics = event.manualCurrentMetrics;
                }

                let deltaMetrics = null;
                if (startMetrics && endMetrics) {
                    deltaMetrics = metricDeltaV166(startMetrics,endMetrics);
                }

                const metaAfter = deriveStageMetricsV167(deltaMetrics);

                // -------- COST BASELINE --------
                const startCumulativeSpend = eventCumulativeSpendForStageV196(event, entityEvents);

                let endCumulativeSpend = null;
                let costBoundarySourceV287 = '';

                if (
                    validStoredStopV210 &&
                    trackingControlV210 &&
                    trackingControlV210.stopCumulativeSpend !== null &&
                    trackingControlV210.stopCumulativeSpend !== undefined
                ) {
                    endCumulativeSpend = finiteNumberOrNullV172(
                        trackingControlV210.stopCumulativeSpend
                    );
                } else if (trackingAutoStoppedV210 || (!trackingParticipatesV210 && endMs === startMs)) {
                    endCumulativeSpend = startCumulativeSpend;
                } else if (nextEvent) {
                    // V287: mốc kế tiếp chính là biên đóng của stage hiện tại.
                    // Không phụ thuộc baselinePeriodFrom có trùng chuỗi hay không.
                    const nextBoundarySpendV287 = eventBoundaryCumulativeSpendV287(
                        nextEvent,
                        entityEvents
                    );

                    if (
                        nextBoundarySpendV287 !== null &&
                        (
                            startCumulativeSpend === null ||
                            nextBoundarySpendV287 >= startCumulativeSpend
                        )
                    ) {
                        endCumulativeSpend = nextBoundarySpendV287;
                        costBoundarySourceV287 = 'next_event_saved_baseline';
                    } else {
                        // Nếu nhịp event vừa phát sinh nhưng baseline child chưa sẵn sàng,
                        // giữ số lũy kế hợp lệ mà stage này đã biết ở nhịp trước.
                        const cachedBoundaryV287 = cachedClosedStageBoundarySpendV287(
                            event,
                            nextEvent,
                            startCumulativeSpend
                        );
                        if (cachedBoundaryV287 !== null) {
                            endCumulativeSpend = cachedBoundaryV287;
                            costBoundarySourceV287 = 'previous_resolved_current_spend';
                        }
                    }
                } else if (!nextEvent && currentPeriodMatches) {
                    endCumulativeSpend = finiteNumberOrNullV172(
                        currentSource && currentSource.spend
                    );

                    if (endCumulativeSpend !== null) {
                        rememberBudgetCurrentSpendV200(
                            event,
                            endCumulativeSpend,
                            currentContext.matchMode || 'reference_snapshot'
                        );
                    }

                    /*
                     * V187 fallback:
                     * Nếu event được baseline theo dữ liệu đã gom,
                     * ưu tiên tổng chi của groupedRow đang hiển thị.
                     */
                    if (
                        startCumulativeSpend !== null &&
                        (
                            endCumulativeSpend === null ||
                            endCumulativeSpend < startCumulativeSpend
                        ) &&
                        currentContext.groupedRow
                    ) {
                        const groupedSpend = finiteNumberOrNullV172(
                            currentContext.groupedRow.spend
                        );

                        if (
                            groupedSpend !== null &&
                            groupedSpend >= startCumulativeSpend
                        ) {
                            endCumulativeSpend = groupedSpend;
                            rememberBudgetCurrentSpendV200(
                                event,
                                groupedSpend,
                                'grouped_reference_snapshot'
                            );
                        }
                    }
                }

                // V203: mốc thủ công ưu tiên dữ liệu current đã lưu cùng event.
                // Nhờ vậy đổi tab/công ty hoặc bộ lọc chung không làm mất “Chi Meta sau đổi”.
                if (!nextEvent && endCumulativeSpend === null && isManual) {
                    // V235: mốc tiếp nối thủ công đang là ngân sách hiện tại được đóng
                    // bằng Chi Meta lũy kế tới hôm nay đã lưu trong popup/reference.
                    const storedManualCurrentSpend = finiteNumberOrNullV172(
                        event.manualCurrentSpend
                    );
                    if (storedManualCurrentSpend !== null) {
                        endCumulativeSpend = storedManualCurrentSpend;
                    }
                }

                // V200: nếu render lại do chuyển tab trong lúc reference đang nạp,
                // dùng Chi Meta lũy kế hợp lệ gần nhất đã resolve cho đúng company + kỳ + entity.
                // Đây chỉ là fallback hiển thị; snapshot mới khi có sẽ thay thế ngay.
                if (!nextEvent && endCumulativeSpend === null) {
                    const cachedCurrentSpend = readBudgetCurrentSpendV200(event);
                    if (cachedCurrentSpend) {
                        endCumulativeSpend = finiteNumberOrNullV172(
                            cachedCurrentSpend.spend
                        );
                    }
                }

                const costAvailable = !!(
                    startCumulativeSpend !== null &&
                    endCumulativeSpend !== null &&
                    endCumulativeSpend >= startCumulativeSpend
                );

                const spend = costAvailable
                    ? Math.max(0,endCumulativeSpend - startCumulativeSpend)
                    : (metaAfter.available ? Number(metaAfter.spend || 0) : 0);

                let finalCostAvailable = costAvailable || metaAfter.available;

                const fixedManualBudgetV234 = isManual && String(event.manualToBudgetMode || '') === 'fixed'
                    ? finiteNumberOrNullV172(event.toBudget)
                    : null;
                const liveBudgetForTimelineV234 = !nextEvent && currentBudgetInfo
                    ? reliableCurrentBudgetAmountV226(currentBudgetInfo)
                    : null;
                const timelineUnresolvedV234 = !!(
                    isManual &&
                    !nextEvent &&
                    fixedManualBudgetV234 !== null &&
                    liveBudgetForTimelineV234 !== null &&
                    Math.abs(liveBudgetForTimelineV234 - fixedManualBudgetV234) > 0.000001
                );

                // V234: nếu biết ngân sách hiện tại đã khác nhưng KHÔNG biết thời điểm
                // đổi tiếp theo, tuyệt đối không tính cả quãng thời gian như một stage.
                if (timelineUnresolvedV234) finalCostAvailable = false;

                const manualDateBaselineAmbiguousV196 =
                    isManualDateBaselineAmbiguousV196(event, entityEvents) ||
                    isManualDateBaselineAmbiguousV196(nextEvent, entityEvents);

                let metricQuality = 'Đủ dữ liệu';

                if (isManual && finalCostAvailable && !metaAfter.available) {
                    const manualSource = String(event.manualBaselineSource || '');
                    metricQuality = manualSource === 'meta_checkpoint_5m'
                        ? 'Checkpoint Meta trước mốc (≤5 phút)'
                        : (
                            manualSource.startsWith('meta_auto_date')
                                ? (
                                    manualDateBaselineAmbiguousV196
                                        ? 'Baseline theo ngày không đủ tách nhiều mốc'
                                        : 'Baseline Meta tự động theo ngày'
                                )
                                : 'Đủ baseline chi phí'
                        );
                } else if (isManual && !finalCostAvailable) {
                    metricQuality = manualDateBaselineAmbiguousV196
                        ? 'Baseline theo ngày không đủ tách nhiều mốc — cần nhập baseline tay'
                        : 'Thiếu baseline chi phí';
                } else if (!isManual && metaAfter.available && String(event.baselinePrecision || '') === 'previous_snapshot_5m') {
                    metricQuality = 'Checkpoint tự động trước mốc (≤5 phút)';
                } else if (!isManual && !metaAfter.available) {
                    if (nextEvent && !samePeriodWithNext) {
                        metricQuality = 'Khác kỳ baseline';
                    } else if (!nextEvent && !currentPeriodMatches) {
                        metricQuality = 'Chờ Meta đúng kỳ baseline';
                    } else {
                        metricQuality = 'Thiếu baseline Meta';
                    }
                }

                if (timelineUnresolvedV234) {
                    metricQuality = 'Thiếu thời điểm đổi tiếp theo';
                }

                // -------- REVENUE --------
                const matchedLedger = timelineUnresolvedV234
                    ? []
                    : state.ledger.filter(row => (
                        matchLedgerToEventV166(
                            row,
                            event,
                            startMs,
                            endMs
                        )
                    ));

                const revenue = matchedLedger.reduce(
                    (sum,row) => sum + Number(row.amount || 0),
                    0
                );

                const vat = finalCostAvailable ? spend * 0.1 : 0;
                const totalAdsCost = finalCostAvailable ? spend + vat : 0;
                const roas = finalCostAvailable && totalAdsCost > 0
                    ? revenue / totalAdsCost
                    : 0;

                const revenueThroughMs = state.revenueMaxOrderAtMs || 0;
                const revenueCompleteThroughEnd =
                    revenueThroughMs >= Math.min(endMs,nowMs);

                const revenueQuality = !event.skus || !event.skus.length
                    ? ''
                    : (
                        revenueThroughMs
                            ? (
                                revenueCompleteThroughEnd
                                    ? 'Đã cập nhật'
                                    : `DT đến ${formatDateTimeV166(revenueThroughMs)}`
                            )
                            : 'Chưa có Revenue Ledger'
                    );

                output.push({
                    ...event,
                    isManual,
                    effectiveToBudget,
                    toBudgetResolvedFrom,
                    hasNextEventV213:!!nextEvent,
                    timelineUnresolvedV234,

                    currentBudgetAmount:
                        currentBudgetInfo
                            ? reliableCurrentBudgetAmountV226(currentBudgetInfo)
                            : null,

                    currentBudgetUsesCampaign:
                        currentBudgetInfo
                            ? !!currentBudgetInfo.usesCampaignBudget
                            : false,

                    currentBudgetType:
                        currentBudgetInfo
                            ? String(currentBudgetInfo.type || '')
                            : '',

                    currentBudgetSource:
                        currentBudgetInfo
                            ? String(currentBudgetInfo.source || '')
                            : '',

                    currentBudgetMatchMode:
                        String(currentContext.matchMode || ''),

                    startMs,
                    endMs,
                    endAt:new Date(endMs).toISOString(),
                    // V210: chỉ latest stage của một phiên TĂNG còn hiệu lực mới là Đang theo dõi.
                    isOpen:!!(
                        !nextEvent &&
                        trackingParticipatesV210 &&
                        !validStoredStopV210 &&
                        !trackingAutoStoppedV210 &&
                        !trackingAutoStoppedByCurrentV210
                    ),
                    duration:formatDurationV166(startMs,endMs),

                    budgetDirectionV210:directionV210,
                    trackingBaseBudgetV210:trackingBaseForRowV210,
                    trackingStartedHereV210,
                    trackingParticipatesV210,
                    trackingManualStoppedV210:validManualStopV210,
                    trackingAutoStoppedV210:!!(validAutoControlStopV210 || trackingAutoStoppedV210 || trackingAutoStoppedByCurrentV210),
                    trackingStopReasonV210,
                    trackingStopBudgetV210,
                    trackingStopAtMsV210:validStoredStopV210
                        ? controlStopMsV210
                        : ((trackingAutoStoppedV210 || trackingAutoStoppedByCurrentV210) ? endMs : 0),
                    trackingControlV210:trackingControlV210 || null,

                    costAvailable:finalCostAvailable,
                    startCumulativeSpend,
                    endCumulativeSpend,
                    costBoundarySourceV287,

                    currentPeriodFrom,
                    eventBaselineFrom,
                    currentPeriodMatches,

                    spend,
                    vat,
                    totalAdsCost,

                    messages:metaAfter.available
                        ? metaAfter.messages
                        : 0,
                    purchases:metaAfter.available
                        ? metaAfter.purchases
                        : 0,
                    cpa:metaAfter.available
                        ? metaAfter.cpa
                        : 0,
                    costPerMessage:metaAfter.available
                        ? metaAfter.costPerMessage
                        : 0,
                    cr:metaAfter.available
                        ? metaAfter.cr
                        : 0,
                    ctr:metaAfter.available
                        ? metaAfter.ctr
                        : 0,
                    frequency:metaAfter.available
                        ? metaAfter.frequency
                        : 0,
                    metaAfter,

                    revenue,
                    roas,
                    matchedOrderCount:matchedLedger.length,
                    matchedLedger,
                    metricQuality,
                    revenueQuality,
                    revenueThroughMs,

                    beforeAvailable:false,
                    beforeSpend:0,
                    beforeVat:0,
                    beforeTotalAdsCost:0,
                    beforeRevenue:0,
                    beforeRoas:0,
                    beforeMessages:0,
                    beforePurchases:0,
                    beforeCpa:0,
                    beforeCostPerMessage:0,
                    beforeCr:0,
                    beforeCtr:0,
                    beforeFrequency:0,
                    previousStageStartMs:0,
                    previousStageEndMs:0
                });

                // V210: cập nhật trạng thái phiên cho mốc kế tiếp.
                if (
                    validStoredStopV210 ||
                    trackingAutoStoppedV210 ||
                    trackingAutoStoppedByCurrentV210
                ) {
                    activeTrackingBaseV210 = null;
                }
            });
        });

        // =========================================================
        // V264 — KHÓA CHI PHÍ STAGE BẰNG BASELINE CỦA MỐC KẾ TIẾP
        //
        // Ví dụ:
        //   300 → 400  (stage 400 đang chạy)
        //   400 → 300  (mốc kế tiếp)
        //
        // baselineSpend của mốc 400→300 chính là chi Meta lũy kế tại thời điểm
        // stage 400 kết thúc. Vì vậy:
        //   Chi stage 400 = baseline mốc 300 - baseline lúc bắt đầu stage 400.
        //
        // Code cũ chỉ làm điều này khi baselinePeriodFrom giống hệt nhau.
        // Sau khi Meta Direct / nhiều Bridge hoạt động, hai lần quan sát có thể mang
        // metadata period khác nhau dù số baseline biên vẫn là dữ liệu thật đã ghi.
        // V264 ưu tiên tính liên tục theo CHÍNH CÁC MỐC ĐÃ LƯU, không làm mất stage.
        // =========================================================
        function repairClosedStageCostFromNextBoundaryV264(rows) {
            const list = Array.isArray(rows) ? rows : [];
            const grouped = new Map();

            list.forEach(row => {
                const key = budgetStageEntityKeyV196(row);
                if (!key) return;
                if (!grouped.has(key)) grouped.set(key,[]);
                grouped.get(key).push(row);
            });

            grouped.forEach(stages => {
                stages.sort(
                    (a,b) =>
                        Number(a.startMs || a.changedAtMs || 0) -
                        Number(b.startMs || b.changedAtMs || 0)
                );

                for (let index = 0; index < stages.length - 1; index++) {
                    const previous = stages[index];
                    const current = stages[index + 1];

                    if (!previous || !current) continue;

                    const previousStartMs =
                        Number(previous.startMs || previous.changedAtMs || 0);
                    const previousEndMs =
                        Number(previous.endMs || previousStartMs);
                    const currentStartMs =
                        Number(current.startMs || current.changedAtMs || 0);

                    // Chỉ sửa đúng hai stage liền nhau.
                    if (
                        !previousStartMs ||
                        !currentStartMs ||
                        currentStartMs < previousStartMs
                    ) continue;

                    const previousStartSpend =
                        eventBoundaryCumulativeSpendV287(
                            previous,
                            stages
                        );

                    const nextBoundarySpend =
                        eventBoundaryCumulativeSpendV287(
                            current,
                            stages
                        );

                    if (
                        previousStartSpend === null ||
                        nextBoundarySpend === null ||
                        nextBoundarySpend < previousStartSpend
                    ) continue;

                    const boundarySpend =
                        Math.max(0,nextBoundarySpend);

                    const stageSpend =
                        Math.max(
                            0,
                            boundarySpend -
                            previousStartSpend
                        );

                    /*
                     * Chỉ cần sửa khi stage cũ đang thiếu cost hoặc end boundary
                     * chưa được khóa đúng. Không ghi đè stage đã có số hợp lệ.
                     */
                    if (
                        previous.costAvailable &&
                        previous.endCumulativeSpend !== null &&
                        previous.endCumulativeSpend !== undefined
                    ) continue;

                    /*
                     * Một event giảm độc lập có end=start không phải stage thật.
                     * Không biến nó thành stage chỉ vì phía sau có một event khác.
                     */
                    if (
                        Number(previousEndMs || 0) <=
                        Number(previousStartMs || 0)
                    ) continue;

                    previous.endCumulativeSpend = boundarySpend;
                    previous.spend = stageSpend;
                    previous.vat = stageSpend * 0.1;
                    previous.totalAdsCost =
                        previous.spend +
                        previous.vat;
                    previous.costAvailable = true;

                    if (
                        Number(previous.totalAdsCost || 0) > 0
                    ) {
                        previous.roas =
                            Number(previous.revenue || 0) /
                            Number(previous.totalAdsCost || 0);
                    }

                    previous.metricQuality =
                        'Chi phí đóng theo baseline mốc kế tiếp';

                    previous.costBoundarySourceV264 =
                        'next_stage_baseline';
                    previous.costBoundarySourceV287 =
                        previous.costBoundarySourceV287 || 'next_stage_baseline_repair';

                    previous.costBoundaryAtMsV264 =
                        currentStartMs;

                    previous.costBoundaryEventIdV264 =
                        String(
                            current.eventId ||
                            ''
                        );

                    previous.costBoundaryBudgetV264 =
                        finiteNumberOrNullV172(
                            current.fromBudget
                        );
                }
            });

            return list;
        }

        repairClosedStageCostFromNextBoundaryV264(output);

        // V227: sau khi tất cả stage đã có start/end thật, phân bổ Revenue Ledger duy nhất.
        // Làm tại đây để việc chọn event có thể nhìn toàn bộ stage đang giao nhau,
        // nhưng vẫn giữ nguyên toàn bộ logic cost/Meta/tracking đã tính phía trên.
        applyUniqueRevenueAllocationV227(output);

        // V264: Revenue vừa được phân bổ lại theo stage thật, tính lại ROAS cho
        // những stage đã được khóa chi phí bằng mốc kế tiếp.
        output.forEach(row => {
            if (
                row &&
                row.costBoundarySourceV264 === 'next_stage_baseline' &&
                row.costAvailable
            ) {
                row.roas =
                    Number(row.totalAdsCost || 0) > 0
                        ? Number(row.revenue || 0) /
                          Number(row.totalAdsCost || 0)
                        : 0;
            }
        });

        // "Trước đổi" = giai đoạn ngân sách liền trước của cùng adset.
        const previousByEntity = new Map();

        output
            .sort((a,b) => Number(a.startMs || 0) - Number(b.startMs || 0))
            .forEach(row => {
                const key = budgetStageEntityKeyV196(row);
                const previous = previousByEntity.get(key) || null;

                if (previous) {
                    // Có giai đoạn đã được ghi nhận trước đó:
                    // "Trước đổi" = chính giai đoạn liền trước.
                    row.beforeAvailable = !!previous.costAvailable;
                    row.beforeSource = 'previous_stage';

                    // Meta Live: dùng beforeSpend.
                    row.beforeSpend = Number(previous.spend || 0);

                    // Tài chính: dùng Meta + VAT 10%.
                    row.beforeVat = Number(previous.vat || 0);
                    row.beforeTotalAdsCost = Number(previous.totalAdsCost || 0);

                    row.beforeRevenue = Number(previous.revenue || 0);
                    row.beforeRoas = previous.costAvailable
                        ? Number(previous.roas || 0)
                        : 0;

                    row.beforeMessages = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.messages || 0)
                        : 0;
                    row.beforePurchases = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.purchases || 0)
                        : 0;
                    row.beforeCpa = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.cpa || 0)
                        : 0;
                    row.beforeCostPerMessage = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.costPerMessage || 0)
                        : 0;
                    row.beforeCr = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.cr || 0)
                        : 0;
                    row.beforeCtr = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.ctr || 0)
                        : 0;
                    row.beforeFrequency = previous.metaAfter && previous.metaAfter.available
                        ? Number(previous.frequency || 0)
                        : 0;

                    row.previousStageStartMs = Number(previous.startMs || 0);
                    row.previousStageEndMs = Number(previous.endMs || 0);
                } else {
                    /*
                     * V186:
                     * Mốc thủ công đầu tiên không có event trước đó,
                     * nhưng manualBaselineSpend chính là Chi Meta lũy kế
                     * từ đầu kỳ -> thời điểm đổi.
                     *
                     * Vì vậy:
                     * - Meta Live "Chi Meta trước đổi" = baseline.
                     * - Tài chính "Chi phí trước đổi" = baseline + VAT 10%.
                     */
                    const baselineBeforeSpend =
                        finiteNumberOrNullV172(
                            row.startCumulativeSpend
                        );

                    if (baselineBeforeSpend !== null) {
                        const baselineStartMs =
                            getBaselinePeriodStartMsV186(row);

                        row.beforeAvailable = true;
                        row.beforeSource = 'manual_baseline';

                        row.beforeSpend =
                            Math.max(
                                0,
                                baselineBeforeSpend
                            );

                        row.beforeVat =
                            row.beforeSpend * 0.1;

                        row.beforeTotalAdsCost =
                            row.beforeSpend +
                            row.beforeVat;

                        const beforeLedger = (
                            baselineStartMs &&
                            row.startMs > baselineStartMs
                        )
                            ? state.ledger.filter(ledger => (
                                matchLedgerToEventV166(
                                    ledger,
                                    row,
                                    baselineStartMs,
                                    row.startMs
                                )
                            ))
                            : [];

                        row.beforeRevenue =
                            beforeLedger.reduce(
                                (sum,ledger) => (
                                    sum +
                                    Number(ledger.amount || 0)
                                ),
                                0
                            );

                        row.beforeMatchedOrderCount =
                            beforeLedger.length;

                        row.beforeRoas =
                            row.beforeTotalAdsCost > 0
                                ? row.beforeRevenue /
                                    row.beforeTotalAdsCost
                                : 0;

                        row.previousStageStartMs =
                            baselineStartMs || 0;

                        row.previousStageEndMs =
                            Number(row.startMs || 0);
                    }
                }

                row.previousRoas = row.beforeAvailable
                    ? Number(row.beforeRoas || 0)
                    : 0;

                row.roasDelta = (
                    row.beforeAvailable &&
                    row.costAvailable
                )
                    ? Number(row.roas || 0) - Number(row.beforeRoas || 0)
                    : 0;

                previousByEntity.set(key,row);
            });

        // =====================================================
        // V213 — MỐC TIẾP NỐI CHO “NGÂN SÁCH SAU” NHẬP THỦ CÔNG
        // =====================================================
        // Nếu mốc thủ công cuối cùng nhập cố định 100k → 300k:
        // - hàng gốc chỉ là mốc lịch sử 100k → 300k;
        // - tự sinh thêm một hàng theo dõi 300k → NS Meta hiện tại;
        // - chi phí/kết quả của giai đoạn sau đổi nằm ở hàng tiếp nối này.
        // Không ghi một event giả mới lên Firebase, tránh bịa thời điểm đổi ngân sách
        // tiếp theo. Mốc tiếp nối được dựng từ changedAt của mốc thủ công đến current sync.
        const expandedOutputV213 = [];

        output.forEach(row => {
            const fixedToBudgetV213 = finiteNumberOrNullV172(row && row.toBudget);
            const liveCurrentBudgetV226 = finiteNumberOrNullV172(row && row.currentBudgetAmount);
            const storedCurrentBudgetV226 = finiteNumberOrNullV172(row && row.manualCurrentBudget);
            const currentBudgetV213 = (
                liveCurrentBudgetV226 !== null && liveCurrentBudgetV226 > 0
            )
                ? liveCurrentBudgetV226
                : (
                    storedCurrentBudgetV226 !== null && storedCurrentBudgetV226 > 0
                        ? storedCurrentBudgetV226
                        : null
                );

            // V234: không còn tự bịa continuation từ changedAt của mốc cũ.
            // Mốc tiếp nối chỉ được tạo ở expandManualFollowupEventsV234() khi có
            // thời điểm đổi tiếp theo rõ ràng (hoặc event tự động thật đã tồn tại).
            const shouldCreateContinuationV213 = false;

            if (!shouldCreateContinuationV213) {
                expandedOutputV213.push(row);
                return;
            }

            // Clone TRƯỚC khi biến hàng gốc thành marker.
            const continuationV213 = {
                ...row,
                isManual:false,
                isVirtualContinuationV213:true,
                isManualFixedTransitionV213:false,
                source:'manual_current_continuation_v213',
                fromBudget:fixedToBudgetV213,
                toBudget:currentBudgetV213,
                effectiveToBudget:currentBudgetV213,
                manualToBudgetMode:'current_continuation_v213',
                toBudgetResolvedFrom:'meta_current_v213',
                delta:currentBudgetV213 - fixedToBudgetV213,
                direction:getBudgetDirectionV210(fixedToBudgetV213,currentBudgetV213),
                budgetDirectionV210:getBudgetDirectionV210(fixedToBudgetV213,currentBudgetV213),
                continuationFromEventIdV213:String(row.eventId || ''),
                continuationStartBudgetV213:fixedToBudgetV213,
                continuationCurrentBudgetV213:currentBudgetV213,
                currentBudgetAmount:currentBudgetV213,
                currentBudgetUsesCampaign:!!row.manualCurrentBudgetUsesCampaign || !!row.currentBudgetUsesCampaign,
                currentBudgetType:String(row.manualCurrentBudgetType || row.currentBudgetType || ''),
                currentBudgetSource:String(row.manualCurrentBudgetSource || row.currentBudgetSource || 'meta_current_v213'),
                currentBudgetMatchMode:String(row.currentBudgetMatchMode || row.manualBaselineMatchMode || 'manual_popup_current_v213')
            };

            // Hàng gốc chỉ còn vai trò đánh dấu lịch sử “NS trước → NS sau”.
            row.isManualFixedTransitionV213 = true;
            row.isOpen = false;
            row.trackingParticipatesV210 = false;
            row.endMs = Number(row.startMs || 0);
            row.endAt = new Date(Number(row.startMs || 0)).toISOString();
            row.duration = 'Mốc thay đổi';
            row.costAvailable = false;
            row.endCumulativeSpend = row.startCumulativeSpend;
            row.spend = 0;
            row.vat = 0;
            row.totalAdsCost = 0;
            row.messages = 0;
            row.purchases = 0;
            row.cpa = 0;
            row.costPerMessage = 0;
            row.cr = 0;
            row.ctr = 0;
            row.frequency = 0;
            row.metaAfter = {
                available:false,
                spend:0,
                messages:0,
                purchases:0,
                linkClicks:0,
                impressions:0,
                reach:0,
                cr:0,
                ctr:0,
                frequency:0,
                costPerMessage:0,
                cpa:0
            };
            row.revenue = 0;
            row.roas = 0;
            row.matchedOrderCount = 0;
            row.matchedLedger = [];
            row.metricQuality = 'Mốc thay đổi thủ công';
            row.revenueQuality = '';

            expandedOutputV213.push(row,continuationV213);
        });

        // V199: luôn tính stage bằng TOÀN BỘ lịch sử để mốc trước/mốc sau
        // không bị đứt chuỗi. Ngày bắt đầu trong popup chỉ giới hạn dữ liệu
        // SAU KHI đã tính xong; bên ngoài không có thanh lọc.
        state.allRows = expandedOutputV213.sort(
            (a,b) => {
                const timeDiff = Number(b.startMs || 0) - Number(a.startMs || 0);
                if (timeDiff !== 0) return timeDiff;
                // cùng mốc thời gian: mốc tiếp nối hiện tại nằm trên marker lịch sử.
                return Number(!!b.isVirtualContinuationV213) - Number(!!a.isVirtualContinuationV213);
            }
        );

        if (state.filterGroupV243) {
            const selectedV244 = String(state.filterGroupV243 || '').trim();
            const parsedV244 = parseBudgetFilterTargetV244(selectedV244);
            const optionsV244 = getBudgetGroupedOptionsV243();
            const exactV244 = optionsV244.some(item => item.value === selectedV244);
            const legacyGroupV244 = parsedV244.type === 'group' && optionsV244.some(
                item => item.type === 'group' && item.key === parsedV244.key
            );
            if (!exactV244 && !legacyGroupV244) state.filterGroupV243 = '';
        }

        // V241: state.allRows luôn giữ timeline đầy đủ để không đứt chuỗi.
        // state.rows là lớp VIEW theo khoảng ngày; số liệu partial sẽ được tính lại
        // bất đồng bộ bởi applyBudgetViewRangeMetricsV241().
        state.rows = applyBudgetInternalFilterV198(state.allRows);

        return state.rows;
    }


    function formatSignedNumberV167(value, formatter) {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return '—';
        const abs = formatter ? formatter(Math.abs(n)) : formatMetaLiveInteger(Math.abs(n));
        if (Math.abs(n) < 0.000001) return '0';
        return `${n > 0 ? '+' : '-'}${abs}`;
    }

    function renderMetricDeltaV167(current, previous, options = {}) {
        if (!options.beforeAvailable) {
            return '<span class="budget-v167-delta is-muted">Chưa có giai đoạn trước</span>';
        }

        const currentValue = Number(current || 0);
        const previousValue = Number(previous || 0);
        const delta = currentValue - previousValue;
        const lowerBetter = !!options.lowerBetter;
        const improved = lowerBetter ? delta <= 0 : delta >= 0;
        const colorClass = Math.abs(delta) < 0.000001
            ? 'is-muted'
            : (improved ? 'is-good' : 'is-bad');

        let text = '';
        if (options.percentUnit) {
            text = `${delta >= 0 ? '+' : ''}${delta.toFixed(options.decimals ?? 2)}đ`;
        } else if (options.xUnit) {
            text = `${delta >= 0 ? '+' : ''}${delta.toFixed(options.decimals ?? 2)}x`;
        } else {
            const formatter = options.formatter || (value => formatMetaLiveInteger(value));
            text = formatSignedNumberV167(delta, formatter);
        }

        let percentText = '';
        if (
            options.showPercent !== false &&
            Math.abs(previousValue) > 0.000001 &&
            !options.percentUnit &&
            !options.xUnit
        ) {
            const pct = (delta / Math.abs(previousValue)) * 100;
            percentText = ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
        }

        return `<span class="budget-v167-delta ${colorClass}">${escapeHtml(text + percentText)}</span>`;
    }

    function getBudgetChangeDisplayV167(row) {
        const from = Number(row.fromBudget || 0);

        const effectiveRaw = (
            row.effectiveToBudget !== null &&
            row.effectiveToBudget !== undefined &&
            row.effectiveToBudget !== ''
        )
            ? row.effectiveToBudget
            : row.toBudget;

        const hasToBudget = (
            effectiveRaw !== null &&
            effectiveRaw !== undefined &&
            effectiveRaw !== '' &&
            Number.isFinite(Number(effectiveRaw))
        );

        const to = hasToBudget
            ? Number(effectiveRaw)
            : null;

        const delta = hasToBudget
            ? to - from
            : null;

        const pct = (
            hasToBudget &&
            from > 0
        )
            ? (delta / from) * 100
            : 0;

        let sourceNote = '';

        if (row && row.isVirtualContinuationV213) {
            sourceNote = ' • NS hiện tại';
        } else if (
            row.isManual &&
            String(row.manualToBudgetMode || '') === 'current'
        ) {
            if (row.toBudgetResolvedFrom === 'next_event') {
                sourceNote = ' • suy từ mốc kế tiếp';
            } else if (
                row.toBudgetResolvedFrom === 'meta_current' ||
                row.toBudgetResolvedFrom === 'meta_current_logic'
            ) {
                sourceNote = ' • NS hiện tại';
            } else if (!hasToBudget) {
                sourceNote = ' • chờ NS hiện tại';
            }
        }

        return {
            main:hasToBudget
                ? `${formatMetaLiveInteger(from)} → ${formatMetaLiveInteger(to)}`
                : `${formatMetaLiveInteger(from)} → Hiện tại`,
            delta:!hasToBudget
                ? `Tự lấy ngân sách hiện tại${sourceNote}`
                : (
                    Math.abs(delta) < 0.000001
                        ? `Không đổi giá trị${sourceNote}`
                        : (
                            `${delta > 0 ? '+' : '-'}${formatMetaLiveInteger(Math.abs(delta))} ` +
                            `(${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)${sourceNote}`
                        )
                ),
            color:!hasToBudget
                ? '#174ea6'
                : (
                    delta > 0
                        ? '#137333'
                        : (delta < 0 ? '#c5221f' : '#174ea6')
                )
        };
    }

    function budgetStatusV167(row) {
        if (row && row.isManualFixedTransitionV213) {
            return {
                label:'Mốc thủ công',
                className:'is-closed',
                note:'Đã tạo mốc theo dõi hiện tại từ ngân sách sau',
                clickable:false
            };
        }

        if (row.isOpen) {
            return {
                label:'Đang theo dõi',
                className:'is-running',
                note:row.revenueQuality || '',
                clickable:true
            };
        }

        if (row.trackingManualStoppedV210) {
            return {
                label:'Đã ngưng thủ công',
                className:'is-closed',
                note:'Người dùng chủ động ngưng theo dõi',
                clickable:false
            };
        }

        if (row.trackingAutoStoppedV210) {
            return {
                label:'Đã ngưng tự động',
                className:'is-closed',
                note:'Ngân sách đã giảm về mức trước lần tăng',
                clickable:false
            };
        }

        if (String(row.budgetDirectionV210 || '') === 'decrease' && !row.trackingParticipatesV210) {
            return {
                label:'Đã ghi nhận giảm',
                className:'is-closed',
                note:'Mức giảm được lưu lịch sử nhưng không mở phiên theo dõi mới',
                clickable:false
            };
        }

        if (row.trackingParticipatesV210) {
            return {
                label:'Đã chuyển mức',
                className:'is-closed',
                note:'Phiên theo dõi tiếp tục ở mốc ngân sách kế tiếp',
                clickable:false
            };
        }

        return {
            label:'Đã ghi nhận',
            className:'is-closed',
            note:row.revenueQuality || '',
            clickable:false
        };
    }

    function budgetStatusHtmlV210(row,status) {
        const eventId = escapeHtml(String(row && row.eventId || ''));
        const label = escapeHtml(String(status && status.label || ''));
        const className = escapeHtml(String(status && status.className || 'is-closed'));

        if (status && status.clickable && eventId) {
            return `
                <button
                    type="button"
                    class="budget-v167-status ${className} budget-tracking-status-btn-v210"
                    onclick="window.openBudgetTrackingMenuV210('${eventId}', this)"
                    title="Bấm để chọn ngưng theo dõi thủ công"
                >${label}</button>
            `;
        }

        return `<span class="budget-v167-status ${className}">${label}</span>`;
    }

    function setBudgetChartTitleV167(target, active) {
        const tab = document.getElementById(
            target === 'finance' ? 'tab-finance' : 'tab-performance'
        );
        const card = tab && tab.querySelector(':scope > .ads-chart-card');
        if (!card) return;

        const kicker = card.querySelector('.ads-section-kicker');
        const h2 = card.querySelector('h2');

        if (kicker && !kicker.dataset.originalV167) {
            kicker.dataset.originalV167 = kicker.textContent || '';
        }
        if (h2 && !h2.dataset.originalV167) {
            h2.dataset.originalV167 = h2.textContent || '';
        }

        if (active) {
            if (kicker) {
                kicker.textContent = target === 'finance'
                    ? 'BUDGET PERFORMANCE / TÀI CHÍNH'
                    : 'META LIVE / THEO MỨC NGÂN SÁCH';
            }
            if (h2) {
                h2.textContent = target === 'finance'
                    ? 'Chi phí, doanh thu và ROAS theo từng mức ngân sách'
                    : 'Chi Meta và kết quả theo từng mức ngân sách';
            }
        } else {
            if (kicker && kicker.dataset.originalV167) {
                kicker.textContent = kicker.dataset.originalV167;
            }
            if (h2 && h2.dataset.originalV167) {
                h2.textContent = h2.dataset.originalV167;
            }
        }
    }

    function financeBudgetChartRowsV167(rows) {
        return (rows || [])
            .filter(row => row && (row.totalAdsCost > 0 || row.revenue > 0 || row.costAvailable))
            .slice(0, 12)
            .reverse();
    }

    function compactBudgetValueV211(value) {
        const n = Number(value || 0);
        if (!Number.isFinite(n) || n <= 0) return 'NS';
        if (n >= 1000000) {
            const m = n / 1000000;
            return `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}tr`;
        }
        if (n >= 1000) {
            const k = n / 1000;
            return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(0)}k`;
        }
        return formatMetaLiveInteger(n);
    }

    function budgetChartStageLabelV211(row) {
        const sku = String((row && row.skus || [])[0] || '').trim();
        const employee = String(row && (row.employee || row.campaignName) || 'Ads').trim();
        const product = String(row && (row.adName || row.fullName) || '').trim();
        const rawBudget = (
            row && row.effectiveToBudget !== null && row.effectiveToBudget !== undefined
                ? row.effectiveToBudget
                : (row && row.toBudget)
        );
        const budget = finiteBudgetNumberV210(rawBudget);
        const key = sku || product;
        return `${employee}${key ? ' · ' + key : ''} · ${budget !== null ? compactBudgetValueV211(budget) : 'NS'}`;
    }

    function drawBudgetFinanceChartV167(rows) {
        const canvas = document.getElementById('chart-ads-fin');
        if (!canvas || typeof Chart === 'undefined') return;

        if (window.myAdsChart) {
            try { window.myAdsChart.destroy(); } catch(e) {}
        }

        const chartRows = financeBudgetChartRowsV167(rows);
        const labels = chartRows.map(budgetChartStageLabelV211);

        // V211: giống biểu đồ Tài chính Tổng quan — chỉ 2 cột Chi phí/Doanh thu,
        // ROAS là đường. Mỗi mốc ngân sách là một điểm trên trục X.
        window.myAdsChart = new Chart(canvas,{
            type:'bar',
            data:{
                labels,
                datasets:[
                    {
                        label:'Chi phí',
                        data:chartRows.map(row => row.costAvailable ? Number(row.totalAdsCost || 0) : null),
                        backgroundColor:'#d93025',
                        borderRadius:5,
                        order:2
                    },
                    {
                        label:'Doanh thu',
                        data:chartRows.map(row => Number(row.revenue || 0)),
                        backgroundColor:'#137333',
                        borderRadius:5,
                        order:3
                    },
                    {
                        type:'line',
                        label:'ROAS',
                        data:chartRows.map(row => row.costAvailable ? Number(row.roas || 0) : null),
                        borderColor:'#f4b400',
                        backgroundColor:'#f4b400',
                        borderWidth:3,
                        pointRadius:4,
                        pointHoverRadius:6,
                        tension:.22,
                        yAxisID:'y1',
                        order:1
                    }
                ]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                animation:false,
                interaction:{mode:'index',intersect:false},
                plugins:{
                    legend:{
                        position:'top',
                        labels:{boxWidth:10,boxHeight:10,font:{size:9},usePointStyle:true}
                    },
                    tooltip:{
                        enabled: !isAdsMobileChartViewportV225(),
                        callbacks:{
                            label(context){
                                const value = Number(context.raw || 0);
                                if (context.dataset.yAxisID === 'y1') {
                                    return `ROAS: ${value.toFixed(2)}x`;
                                }
                                return `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
                            }
                        }
                    }
                },
                scales:{
                    x:{
                        ticks:{autoSkip:false,maxRotation:0,minRotation:0,font:{size:9,weight:'600'}}
                    },
                    y:{
                        beginAtZero:true,
                        ticks:{
                            callback(value){
                                const n = Number(value || 0);
                                if (Math.abs(n) >= 1000000) return `${(n/1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}tr`;
                                if (Math.abs(n) >= 1000) return `${Math.round(n/1000)}k`;
                                return n;
                            }
                        }
                    },
                    y1:{
                        beginAtZero:true,
                        position:'right',
                        grid:{drawOnChartArea:false},
                        ticks:{callback(value){ return `${Number(value || 0).toFixed(1)}x`; }},
                        title:{display:true,text:'ROAS'}
                    }
                }
            }
        });
    }

    function drawBudgetMetaChartV167(rows) {
        const canvas = document.getElementById('chart-ads-perf');
        if (!canvas || typeof Chart === 'undefined') return;

        if (window.myAdsChart) {
            try { window.myAdsChart.destroy(); } catch(e) {}
        }

        const chartRows = (rows || [])
            .filter(row => row && (row.spend > 0 || row.messages > 0 || row.purchases > 0 || row.costAvailable))
            .slice(0,12)
            .reverse();
        const labels = chartRows.map(budgetChartStageLabelV211);

        // V211: không dựng nhiều cột Trước/Sau. Mỗi mức ngân sách chỉ có 1 cột Chi Meta;
        // Tin nhắn và Lượt mua dùng đường để biểu đồ thoáng hơn.
        window.myAdsChart = new Chart(canvas,{
            type:'bar',
            data:{
                labels,
                datasets:[
                    {
                        label:'Chi Meta',
                        data:chartRows.map(row => row.costAvailable ? Number(row.spend || 0) : null),
                        backgroundColor:'#1f6fff',
                        borderRadius:5,
                        order:3
                    },
                    {
                        type:'line',
                        label:'Tin nhắn',
                        data:chartRows.map(row => Number(row.messages || 0)),
                        borderColor:'#e36414',
                        backgroundColor:'#e36414',
                        borderWidth:2,
                        pointRadius:3,
                        tension:.24,
                        yAxisID:'y1',
                        order:1
                    },
                    {
                        type:'line',
                        label:'Lượt mua',
                        data:chartRows.map(row => Number(row.purchases || 0)),
                        borderColor:'#137333',
                        backgroundColor:'#137333',
                        borderWidth:3,
                        pointRadius:4,
                        tension:.24,
                        yAxisID:'y1',
                        order:1
                    }
                ]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                animation:false,
                interaction:{mode:'index',intersect:false},
                plugins:{
                    legend:{
                        position:'top',
                        labels:{boxWidth:10,boxHeight:10,font:{size:9},usePointStyle:true}
                    },
                    tooltip:{
                        enabled: !isAdsMobileChartViewportV225(),
                        callbacks:{
                            label(context){
                                const value = Number(context.raw || 0);
                                if (context.dataset.yAxisID === 'y1') {
                                    return `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(value)}`;
                                }
                                return `Chi Meta: ${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
                            }
                        }
                    }
                },
                scales:{
                    x:{ticks:{autoSkip:false,maxRotation:0,minRotation:0,font:{size:9,weight:'600'}}},
                    y:{
                        beginAtZero:true,
                        ticks:{
                            callback(value){
                                const n = Number(value || 0);
                                if (Math.abs(n) >= 1000000) return `${(n/1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}tr`;
                                if (Math.abs(n) >= 1000) return `${Math.round(n/1000)}k`;
                                return n;
                            }
                        }
                    },
                    y1:{
                        beginAtZero:true,
                        position:'right',
                        grid:{drawOnChartArea:false},
                        title:{display:true,text:'Tin / Mua'}
                    }
                }
            }
        });
    }

    function ensurePerformanceBudgetButtonV167() {
        const tabs = document.querySelector(
            '#ads-analysis-result #tab-performance .ads-inline-scope-tabs'
        );
        if (!tabs) return;

        let button = tabs.querySelector('[data-ads-scope-value="budget-change"]');
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'ads-inline-scope-tab';
            button.setAttribute('data-ads-scope-target','performance');
            button.setAttribute('data-ads-scope-value','budget-change');
            button.textContent = 'Theo dõi ngân sách';
            button.onclick = function(){
                window.changePerformanceBudgetScopeV167();
            };
            tabs.appendChild(button);
        }
    }

    function ensurePerformanceBudgetPanelV167() {
        const card = document.querySelector(
            '#ads-analysis-result #tab-performance .ads-data-card'
        );
        if (!card) return null;

        let panel = document.getElementById('performance-budget-performance-v167');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'performance-budget-performance-v167';
            panel.className = 'performance-budget-performance-v167';
            panel.style.display = 'none';

            const normalTable = card.querySelector(':scope > .table-responsive');
            if (normalTable) card.insertBefore(panel, normalTable);
            else card.appendChild(panel);
        }
        return panel;
    }


    // =====================================================
    // V172 — MANUAL HISTORICAL BUDGET EVENTS
    // =====================================================
    let manualBudgetEditEventV172 = null;

    function toLocalDatetimeInputV172(value) {
        const d = value ? new Date(value) : new Date();

        if (isNaN(d.getTime())) return '';

        const pad = number => String(number).padStart(2,'0');

        return (
            `${d.getFullYear()}-` +
            `${pad(d.getMonth() + 1)}-` +
            `${pad(d.getDate())}T` +
            `${pad(d.getHours())}:` +
            `${pad(d.getMinutes())}`
        );
    }

    function dateOnlyLocalV172(value) {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';

        const pad = number => String(number).padStart(2,'0');

        return (
            `${d.getFullYear()}-` +
            `${pad(d.getMonth() + 1)}-` +
            `${pad(d.getDate())}`
        );
    }

    // =====================================================
    // V209 — NHÓM THỦ CÔNG PHẢI THEO ĐÚNG LOGIC GOM CỦA BẢNG CHÍNH
    // =====================================================
    function manualGroupedSignatureV209(item) {
        item = item || {};

        const direct = String(
            item.meta_live_row_key ||
            item.groupedSignature ||
            item.manualBaselineGroupedSignature ||
            ''
        ).trim();

        if (direct) return direct.replace(/^group:/,'');

        const employeeKey = normalizeAdsText(item.employee || '');
        const adParts = extractAdDuplicateParts(item.adName || item.fullName || '');

        if (employeeKey && adParts.skuKey) {
            return `${employeeKey}||SKU||${adParts.skuKey}`;
        }

        if (employeeKey && adParts.productKey) {
            return `${employeeKey}||PRODUCT||${adParts.productKey}`;
        }

        return normalizeAdsText(item.fullName || item.adName || '');
    }

    function manualGroupedMembersV209(item) {
        item = item || {};

        const originals = (
            Array.isArray(item.original_adset_rows) &&
            item.original_adset_rows.length
        )
            ? item.original_adset_rows
            : [item];

        const memberAdsetIds = Array.from(new Set(
            originals
                .map(source => String(
                    source && (
                        source.adsetId ||
                        source.adset_id ||
                        source.id ||
                        ''
                    ) || ''
                ).trim())
                .filter(Boolean)
        ));

        const memberNames = Array.from(new Set(
            originals
                .map(source => String(
                    source && (
                        source.fullName ||
                        source.adsetName ||
                        source.adset_name ||
                        ''
                    ) || ''
                ).trim())
                .filter(Boolean)
        ));

        return {
            originals,
            memberAdsetIds,
            memberNames,
            mergedCount:Math.max(
                1,
                Number(item.merged_count || 0),
                originals.length
            )
        };
    }

    // V234: tìm event ngân sách đã ghi nhận thật của cùng HÀNG GOM sau mốc thủ công.
    // Dùng signature/member adset/nhân sự+SKU để event auto raw vẫn nhận ra entity grouped.
    function isSameBudgetGroupedEntityV234(entity, event) {
        entity = entity || {};
        event = event || {};

        const entitySignature = String(
            entity.groupedSignature ||
            (String(entity.entityKey || '').startsWith('group:') ? String(entity.entityKey).slice(6) : '') ||
            ''
        ).replace(/^group:/,'').trim();

        const eventContext = getRevenueGroupedContextV228(event);
        const eventSignature = String(eventContext && eventContext.signature || '').replace(/^group:/,'').trim();

        if (entitySignature && eventSignature && entitySignature === eventSignature) return true;

        const entityMembers = new Set(
            (Array.isArray(entity.memberAdsetIds) ? entity.memberAdsetIds : [])
                .map(value => String(value || '').trim())
                .filter(Boolean)
        );
        const eventMembers = (eventContext && Array.isArray(eventContext.memberAdsetIds))
            ? eventContext.memberAdsetIds
            : [];

        if (entityMembers.size && eventMembers.some(id => entityMembers.has(String(id || '').trim()))) {
            return true;
        }

        const entityEmployee = normalizeAdsText(entity.employee || '');
        const eventEmployee = normalizeAdsText(eventContext && eventContext.employee || event.employee || '');
        if (!entityEmployee || !eventEmployee || entityEmployee !== eventEmployee) return false;

        const entitySkus = new Set(
            (Array.isArray(entity.skus) ? entity.skus : [])
                .map(normalizeSkuV166)
                .filter(Boolean)
        );
        const eventSkus = (eventContext && Array.isArray(eventContext.skus))
            ? eventContext.skus.map(normalizeSkuV166).filter(Boolean)
            : [];

        return entitySkus.size > 0 && eventSkus.some(sku => entitySkus.has(sku));
    }

    function findRecordedNextBudgetEventV234(entity, changedDate, expectedCurrentBudget) {
        const startMs = changedDate instanceof Date
            ? changedDate.getTime()
            : new Date(changedDate || 0).getTime();
        if (!Number.isFinite(startMs) || startMs <= 0) return null;

        const expected = finiteBudgetNumberV210(expectedCurrentBudget);

        const candidates = (Array.isArray(state.events) ? state.events : [])
            .filter(event => {
                if (!event || event.isManual === true || String(event.source || '').startsWith('manual')) return false;
                const eventMs = Number(event.changedAtMs || 0);
                if (!eventMs || eventMs <= startMs) return false;
                return isSameBudgetGroupedEntityV234(entity,event);
            })
            .sort((a,b) => Number(a.changedAtMs || 0) - Number(b.changedAtMs || 0));

        if (!candidates.length) return null;

        // Nếu biết mức hiện tại, ưu tiên event thật đưa ngân sách tới đúng mức đó.
        if (expected !== null) {
            const exact = candidates.filter(event => {
                const to = finiteBudgetNumberV210(event.toBudget);
                return to !== null && Math.abs(to - expected) < 0.000001;
            });
            if (exact.length) return exact[exact.length - 1];
        }

        // Không có exact target thì lấy lần đổi thật đầu tiên sau mốc thủ công.
        return candidates[0];
    }

    function buildManualGroupedEntityV209(item, source) {
        item = item || {};

        const raw = getRawMetaEntityInfoV166(item);
        const members = manualGroupedMembersV209(item);
        const groupedSignature = manualGroupedSignatureV209(item);

        const groupEntityKey = groupedSignature
            ? `group:${groupedSignature}`
            : `group:${normalizeAdsText(raw.fullName || raw.entityKey || 'unknown')}`;

        return {
            ...raw,

            // Quan trọng: event thủ công mới đại diện cho HÀNG ĐÃ GOM,
            // không đại diện cho một adset Meta gốc bất kỳ.
            entityKey:groupEntityKey,
            adsetId:'',
            isGroupedEntity:true,
            groupedSignature,
            memberAdsetIds:members.memberAdsetIds,
            memberNames:members.memberNames,
            mergedCount:members.mergedCount,
            source:source || 'meta_grouped_v209'
        };
    }

    function collectManualBudgetEntitiesV172() {
        const map = new Map();

        // V209: state.referenceRows đã là kết quả normalizeMetaLiveRows()
        // và mergeDuplicateAdsData(). Vì vậy dùng trực tiếp MỖI HÀNG ĐÃ GOM.
        // Tuyệt đối không bung original_adset_rows để tạo dropdown nữa.
        const sourceRows = Array.isArray(state.referenceRows)
            ? state.referenceRows
            : [];

        sourceRows
            .filter(item => (
                item &&
                (
                    !item.company ||
                    String(item.company).toUpperCase() === String(CURRENT_COMPANY || '').toUpperCase()
                )
            ))
            .forEach(item => {
                const entity = buildManualGroupedEntityV209(
                    item,
                    'meta_current_grouped_v209'
                );

                if (!entity || !entity.entityKey) return;
                map.set(String(entity.entityKey),entity);
            });

        // Cho phép sửa event cũ dù entity hiện không còn trong Meta Live kỳ đang xem.
        state.events
            .filter(event => (
                event &&
                String(event.company || '') === String(CURRENT_COMPANY || '')
            ))
            .forEach(event => {
                const groupedSignature = String(
                    event.groupedSignature ||
                    event.manualBaselineGroupedSignature ||
                    ''
                ).replace(/^group:/,'').trim();

                const key = String(
                    event.entityKey ||
                    (groupedSignature ? `group:${groupedSignature}` : '') ||
                    event.adsetId ||
                    event.fullName ||
                    ''
                );

                if (!key || map.has(key)) return;

                map.set(key,{
                    entityKey:key,
                    adsetId:String(event.adsetId || ''),
                    campaignId:String(event.campaignId || ''),
                    campaignName:String(event.campaignName || ''),
                    fullName:String(event.fullName || ''),
                    employee:String(event.employee || ''),
                    adName:String(event.adName || ''),
                    productName:String(event.productName || ''),
                    skus:Array.isArray(event.skus) ? event.skus : [],
                    isGroupedEntity:!!(event.isGroupedEntity || groupedSignature),
                    groupedSignature,
                    memberAdsetIds:Array.isArray(event.memberAdsetIds) ? event.memberAdsetIds : [],
                    memberNames:Array.isArray(event.memberNames) ? event.memberNames : [],
                    mergedCount:Number(event.mergedCount || event.manualBaselineMatchedCount || 1),
                    source:'event_history'
                });
            });

        return Array.from(map.values())
            .sort((a,b) => (
                String(a.employee || a.campaignName || '').localeCompare(
                    String(b.employee || b.campaignName || ''),
                    'vi'
                )
            ));
    }

    function manualEntityLabelV172(entity) {
        const employee = String(entity.employee || '').trim();
        const adName = String(entity.adName || entity.fullName || '').trim();
        const skus = Array.isArray(entity.skus)
            ? entity.skus.join(', ')
            : '';
        const mergedCount = Number(entity.mergedCount || 0);

        return [
            employee,
            adName,
            skus ? `[${skus}]` : '',
            entity.isGroupedEntity && mergedCount > 1
                ? `Gom ${mergedCount} nhóm Meta`
                : ''
        ].filter(Boolean).join(' • ');
    }

    function findManualEventV172(eventId) {
        return state.events.find(event => (
            event &&
            String(event.eventId || '') === String(eventId || '') &&
            String(event.company || '') === String(CURRENT_COMPANY || '')
        )) || null;
    }

    function manualEventFirebasePathV172(event) {
        if (!event) return '';

        return [
            META_MANUAL_BUDGET_ROOT_V182,
            String(event.company || CURRENT_COMPANY || 'NNV'),
            safeMetaBudgetKeyV166(
                event.entityKey ||
                event.adsetId ||
                event.fullName ||
                'unknown'
            ),
            String(event.eventId || '')
        ].join('/');
    }

    function closeManualBudgetModalV172() {
        const modal = document.getElementById(
            'manual-budget-event-modal-v172'
        );

        if (modal) modal.remove();

        manualBudgetEditEventV172 = null;
    }


    // =====================================================
    // V203 — META RANGE RIÊNG CHO POPUP THỦ CÔNG
    // =====================================================
    async function fetchManualBudgetRangeSnapshotV203(company, from, to) {
        if (!db) db = getDatabase();
        if (!db) throw new Error('Firebase Database chưa sẵn sàng.');

        const companyCode = String(company || CURRENT_COMPANY || 'NNV').toUpperCase();
        let period = { from:String(from || ''), to:String(to || '') };

        if (
            !isBudgetIsoDateV198(period.from) ||
            !isBudgetIsoDateV198(period.to) ||
            period.from > period.to
        ) {
            throw new Error('Phạm vi dữ liệu không hợp lệ.');
        }

        // V212: popup dùng cùng giới hạn range với Meta Direct chính.
        const safePeriodV212 = normalizeMetaApiPeriodV212(period.from, period.to);
        if (!safePeriodV212.supported) {
            if (safePeriodV212.reason === 'too_old') {
                throw new Error(`Phạm vi này nằm ngoài giới hạn Meta. Hãy chọn từ ${safePeriodV212.earliest} trở đi.`);
            }
            throw new Error('Phạm vi dữ liệu không hợp lệ.');
        }
        if (safePeriodV212.clamped) {
            throw new Error(`Meta chỉ hỗ trợ phạm vi bắt đầu từ ${safePeriodV212.earliest} trở đi. Hệ thống không tự đổi ngày bạn đã nhập.`);
        }

        const context = buildBudgetMetaContextV198(companyCode, period);

        // V206: popup thủ công dùng chính Phạm vi dữ liệu để gọi Meta Direct.
        // Không phụ thuộc bộ lọc ngoài và không cần snapshot Firebase của nhân viên.
        if (
            window.isMetaDirectStaffV206 &&
            window.isMetaDirectStaffV206() &&
            typeof window.fetchMetaDirectContextV206 === 'function'
        ) {
            const direct = await window.fetchMetaDirectContextV206(
                context,
                true,
                false
            );

            if (!direct || !direct.snapshotLike) {
                throw new Error(`Meta Direct chưa trả dữ liệu cho ${period.from} → ${period.to}.`);
            }

            const key = getBudgetReferenceKeyV200(companyCode, period);
            state.referenceCache[key] = {
                company:companyCode,
                period:{...period},
                snapshot:direct.snapshotLike,
                rows:Array.isArray(direct.rows) ? direct.rows : [],
                syncedAt:String(direct.syncedAt || ''),
                cachedAt:Date.now()
            };

            return {
                company:companyCode,
                period,
                context,
                snapshot:direct.snapshotLike,
                rows:Array.isArray(direct.rows) ? direct.rows : [],
                syncedAt:String(direct.syncedAt || ''),
                cacheRemainingSeconds:Math.ceil(Math.max(0, Number(direct.expiresAtLocal || 0) - Date.now()) / 1000),
                serverCacheHit:!!(direct.cacheInfo && direct.cacheInfo.hit),
                cacheExpiresAt:Number(direct.expiresAtLocal || 0)
            };
        }

        // Guest/legacy vẫn đọc snapshot Firebase gần nhất.
        // V202 policy vẫn được tôn trọng ở đây:
        // có hôm nay = TTL 5 phút; khoảng quá khứ trong tháng = lấy 1 lần;
        // tháng đã kết thúc = hậu kiểm theo chính sách 2 lần / mốc 50 giờ.
        await ensureMetaSnapshotFreshForContext(context, false, true);

        const snap = await db.ref(context.snapshotPath).once('value');
        const value = snap.val();
        if (!value) {
            throw new Error(`Meta chưa tạo được snapshot cho ${period.from} → ${period.to}.`);
        }

        const syncedAt = value.syncedAt || value.checkedAt || value.updatedAt || '';
        const rows = normalizeMetaLiveRows(
            value.rows || [],
            companyCode,
            period,
            syncedAt
        );

        // Cache RAM theo đúng company + range để mở lại popup trong cùng phiên không bị trắng.
        const key = getBudgetReferenceKeyV200(companyCode, period);
        state.referenceCache[key] = {
            company:companyCode,
            period:{...period},
            snapshot:value,
            rows,
            syncedAt,
            cachedAt:Date.now()
        };

        return { company:companyCode, period, context, snapshot:value, rows, syncedAt };
    }

    function collectManualBudgetEntitiesFromRowsV203(rows) {
        const map = new Map();

        // V209: rows đã được normalize + gom theo đúng bảng chính.
        // Dropdown phải lấy mỗi hàng gom đúng 1 lần, không bung nhóm Meta gốc.
        (Array.isArray(rows) ? rows : []).forEach(item => {
            if (!item) return;

            const entity = buildManualGroupedEntityV209(
                item,
                'meta_popup_range_grouped_v209'
            );

            if (!entity || !entity.entityKey) return;
            map.set(String(entity.entityKey),entity);
        });

        return Array.from(map.values()).sort((a,b) => (
            String(a.employee || a.campaignName || '').localeCompare(
                String(b.employee || b.campaignName || ''),
                'vi'
            )
        ));
    }

    function findManualBudgetMetricInRowsV203(entity, rows) {
        entity = entity || {};

        const targetAdsetId = String(entity.adsetId || entity.adset_id || '').trim();
        const targetEntityKey = String(entity.entityKey || '').trim();
        const targetFullName = normalizeAdsText(entity.fullName || '');
        const targetGroupedSignature = String(
            entity.groupedSignature ||
            (targetEntityKey.indexOf('group:') === 0 ? targetEntityKey.slice(6) : '') ||
            ''
        ).replace(/^group:/,'').trim();

        const targetMemberAdsetIds = new Set(
            (Array.isArray(entity.memberAdsetIds) ? entity.memberAdsetIds : [])
                .map(value => String(value || '').trim())
                .filter(Boolean)
        );

        // V209 STEP 1: nhóm thủ công mới phải khớp HÀNG ĐÃ GOM.
        // metricRow = item để spend/messages/result... là tổng của tất cả adset
        // thuộc cùng hàng gom, đúng y như bảng Hiệu quả Ads.
        if (entity.isGroupedEntity || targetGroupedSignature || targetEntityKey.indexOf('group:') === 0) {
            for (const item of (Array.isArray(rows) ? rows : [])) {
                if (!item) continue;

                const itemSignature = manualGroupedSignatureV209(item);

                if (
                    targetGroupedSignature &&
                    itemSignature &&
                    itemSignature === targetGroupedSignature
                ) {
                    return {
                        metricRow:item,
                        groupedRow:item,
                        matchMode:'grouped_same_as_table',
                        groupedSignature:itemSignature
                    };
                }
            }

            // Fallback khi signature thay đổi do dữ liệu tên: tìm grouped row có thành viên adset cũ.
            if (targetMemberAdsetIds.size) {
                const candidates = (Array.isArray(rows) ? rows : []).filter(item => {
                    if (!item) return false;
                    const members = manualGroupedMembersV209(item).memberAdsetIds;
                    return members.some(id => targetMemberAdsetIds.has(String(id || '').trim()));
                });

                if (candidates.length === 1) {
                    return {
                        metricRow:candidates[0],
                        groupedRow:candidates[0],
                        matchMode:'grouped_member_adset_fallback',
                        groupedSignature:manualGroupedSignatureV209(candidates[0])
                    };
                }
            }

            // Fallback cuối cho entity grouped: tên hàng gom duy nhất.
            if (targetFullName) {
                const nameCandidates = (Array.isArray(rows) ? rows : []).filter(item => (
                    normalizeAdsText(item && item.fullName || '') === targetFullName
                ));

                if (nameCandidates.length === 1) {
                    return {
                        metricRow:nameCandidates[0],
                        groupedRow:nameCandidates[0],
                        matchMode:'grouped_full_name_fallback',
                        groupedSignature:manualGroupedSignatureV209(nameCandidates[0])
                    };
                }
            }
        }

        // V209 STEP 2: tương thích event cũ — vẫn cho phép khớp adset/raw entity lịch sử.
        for (const item of (Array.isArray(rows) ? rows : [])) {
            if (!item) continue;

            const originals = (
                Array.isArray(item.original_adset_rows) &&
                item.original_adset_rows.length
            )
                ? item.original_adset_rows
                : [item];

            for (const source of originals) {
                if (!source) continue;

                const sourceAdsetId = String(
                    source.adsetId ||
                    source.adset_id ||
                    source.id ||
                    ''
                ).trim();

                const sourceFullName = normalizeAdsText(
                    source.fullName ||
                    source.adsetName ||
                    source.adset_name ||
                    ''
                );

                if (targetAdsetId && sourceAdsetId === targetAdsetId) {
                    return {
                        metricRow:source,
                        groupedRow:item,
                        matchMode:'exact_adset_id_range'
                    };
                }

                if (
                    targetEntityKey &&
                    (
                        sourceAdsetId === targetEntityKey ||
                        String(source.fullName || '').trim() === targetEntityKey
                    )
                ) {
                    return {
                        metricRow:source,
                        groupedRow:item,
                        matchMode:'exact_entity_range'
                    };
                }

                if (targetFullName && sourceFullName === targetFullName) {
                    return {
                        metricRow:source,
                        groupedRow:item,
                        matchMode:'exact_full_name_range'
                    };
                }
            }
        }

        return null;
    }

    async function resolveManualBudgetRangeDataV203(entity, rangeFrom, changedDate, todayIso) {
        const company = String(CURRENT_COMPANY || 'NNV').toUpperCase();
        const from = String(rangeFrom || '').trim();
        const today = String(todayIso || getBudgetTodayIsoV199());
        const changed = changedDate instanceof Date ? changedDate : new Date(changedDate);

        if (!isBudgetIsoDateV198(from)) {
            throw new Error('Vui lòng chọn ngày bắt đầu của Phạm vi dữ liệu.');
        }
        if (isNaN(changed.getTime())) {
            throw new Error('Thời điểm đổi ngân sách không hợp lệ.');
        }

        const changedDay = dateOnlyLocalV172(changed);
        if (!changedDay || changedDay < from) {
            throw new Error('Ngày đổi ngân sách phải nằm trong Phạm vi dữ liệu đã chọn.');
        }
        if (changedDay > today) {
            throw new Error('Ngày đổi ngân sách không được lớn hơn hôm nay.');
        }

        const baselineRange = await fetchManualBudgetRangeSnapshotV203(
            company,
            from,
            changedDay
        );

        const currentRange = changedDay === today
            ? baselineRange
            : await fetchManualBudgetRangeSnapshotV203(
                company,
                from,
                today
            );

        const baselineMatch = findManualBudgetMetricInRowsV203(entity, baselineRange.rows);
        const currentMatch = findManualBudgetMetricInRowsV203(entity, currentRange.rows);

        if (!baselineMatch) {
            throw new Error(`Không tìm thấy nhóm quảng cáo trong Meta ở phạm vi ${from} → ${changedDay}.`);
        }
        if (!currentMatch) {
            throw new Error(`Không tìm thấy nhóm quảng cáo trong Meta ở phạm vi ${from} → ${today}.`);
        }

        const baselineMetrics = metricFromCurrentRowV166(baselineMatch.metricRow);
        const currentMetrics = metricFromCurrentRowV166(currentMatch.metricRow);

        // V213: cùng lúc lấy luôn ngân sách Meta HIỆN TẠI của đúng hàng đã gom.
        // Đây là dữ liệu dùng để tự tạo mốc tiếp nối khi người dùng nhập cố định
        // “Ngân sách sau” cho một mốc lịch sử.
        const currentBudgetRowV213 = currentMatch.groupedRow || currentMatch.metricRow || null;
        const currentBudgetInfoV213 = currentBudgetRowV213
            ? getEffectiveGroupedBudgetInfo(currentBudgetRowV213)
            : null;

        const matchedGroup = currentMatch.groupedRow || baselineMatch.groupedRow || null;
        const matchedMembers = matchedGroup
            ? manualGroupedMembersV209(matchedGroup)
            : {
                memberAdsetIds:Array.isArray(entity.memberAdsetIds) ? entity.memberAdsetIds : [],
                memberNames:Array.isArray(entity.memberNames) ? entity.memberNames : [],
                mergedCount:Number(entity.mergedCount || 1)
            };

        return {
            rangeFrom:from,
            rangeTo:today,
            baselineTo:changedDay,
            baselineSpend:Number(baselineMetrics.spend || 0),
            currentSpend:Number(currentMetrics.spend || 0),
            baselineMetrics,
            currentMetrics,
            baselineSyncedAt:String(baselineRange.syncedAt || ''),
            currentSyncedAt:String(currentRange.syncedAt || ''),
            currentBudget:currentBudgetInfoV213
                ? Number(currentBudgetInfoV213.amount || 0)
                : null,
            currentBudgetUsesCampaign:currentBudgetInfoV213
                ? !!currentBudgetInfoV213.usesCampaignBudget
                : false,
            currentBudgetType:currentBudgetInfoV213
                ? String(currentBudgetInfoV213.type || '')
                : '',
            currentBudgetSource:currentBudgetInfoV213
                ? String(currentBudgetInfoV213.source || '')
                : '',
            baselinePrecision:'meta_date_range_end_of_day',
            matchMode:String(currentMatch.matchMode || baselineMatch.matchMode || 'grouped_same_as_table'),
            groupedSignature:String(
                currentMatch.groupedSignature ||
                baselineMatch.groupedSignature ||
                entity.groupedSignature ||
                (matchedGroup ? manualGroupedSignatureV209(matchedGroup) : '') ||
                ''
            ).replace(/^group:/,''),
            matchedCount:Number(matchedMembers.mergedCount || 1),
            matchedNames:Array.isArray(matchedMembers.memberNames) ? matchedMembers.memberNames : [],
            matchedAdsetIds:Array.isArray(matchedMembers.memberAdsetIds) ? matchedMembers.memberAdsetIds : []
        };
    }

    async function resolveManualBaselineSpendAutoV175(entity, period, changedDate) {
        if (!entity || !changedDate) {
            throw new Error('Thiếu thông tin để tự lấy chi Meta baseline.');
        }

        const changed = changedDate instanceof Date
            ? changedDate
            : new Date(changedDate);

        if (isNaN(changed.getTime())) {
            throw new Error('Thời điểm đổi ngân sách không hợp lệ.');
        }

        const company = String(
            CURRENT_COMPANY || 'NNV'
        ).toUpperCase();

        const adsetId = String(
            entity.adsetId ||
            entity.adset_id ||
            entity.id ||
            ''
        ).trim();

        if (!adsetId) {
            throw new Error(
                'Nhóm quảng cáo này không còn adsetId để tìm checkpoint. ' +
                'Vui lòng nhập Chi Meta lũy kế bằng tay.'
            );
        }

        const checkpoint = await findMetaSpendCheckpointBeforeV196(
            company,
            period,
            adsetId,
            changed
        );

        if (!checkpoint) {
            throw new Error(
                'Không có checkpoint Meta Live trước thời điểm đổi (mốc có thể thuộc dữ liệu cũ hoặc quá thời gian lưu checkpoint). ' +
                'Vui lòng nhập "Chi Meta lũy kế tại thời điểm đổi" bằng tay để không ước lượng sai.'
            );
        }

        const gapMs = Math.max(
            0,
            changed.getTime() - Number(checkpoint.capturedAtMs || 0)
        );

        const checkpointPeriod = parseMetaLiveFinancePeriodKey(
            checkpoint.periodKey || ''
        );

        return {
            spend:Number(checkpoint.spend || 0),
            source:'meta_checkpoint_5m',
            precision:'snapshot_5m',
            matchMode:'exact_adset_id_checkpoint',
            matchedCount:1,
            matchedNames:[
                String(
                    entity.fullName ||
                    entity.adName ||
                    adsetId
                )
            ].filter(Boolean),
            groupedSignature:'',
            from:String(
                checkpointPeriod && checkpointPeriod.from ||
                `${dateOnlyLocalV172(changed).slice(0,8)}01`
            ),
            to:dateOnlyLocalV172(changed),
            changedAt:changed.toISOString(),
            baselineThrough:String(checkpoint.capturedAt || ''),
            syncedAt:String(checkpoint.capturedAt || ''),
            checkpointGapMs:gapMs,
            checkpointPeriodKey:String(checkpoint.periodKey || '')
        };
    }


    // V235 — giữ input native date/datetime-local như cũ nhưng năm chỉ 4 chữ số.
    // Không dùng min động và không tự clamp sang năm khác. Nếu trình duyệt cho nhập
    // năm > 9999, hoàn tác về giá trị 4 chữ số hợp lệ gần nhất khi input phát value.
    function bindManualNativeYear4V235(input) {
        if (!input || input.dataset.year4BoundV235 === '1') return;
        input.dataset.year4BoundV235 = '1';

        const isDateTime = String(input.type || '').toLowerCase() === 'datetime-local';
        const fourYearPattern = isDateTime
            ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
            : /^\d{4}-\d{2}-\d{2}$/;

        let lastValid = fourYearPattern.test(String(input.value || ''))
            ? String(input.value || '')
            : '';

        const validateCommittedValue = () => {
            const value = String(input.value || '');
            if (!value) return;

            const yearMatch = value.match(/^(\d+)-/);
            const valid = !!(
                yearMatch &&
                yearMatch[1].length === 4 &&
                Number(yearMatch[1]) >= 1 &&
                Number(yearMatch[1]) <= 9999 &&
                fourYearPattern.test(value)
            );

            if (valid) {
                lastValid = value;
                return;
            }

            if (yearMatch && yearMatch[1].length > 4) {
                input.value = lastValid;
                if (typeof showToast === 'function') {
                    showToast('Năm chỉ được nhập tối đa 4 chữ số.', 'warning');
                }
            }
        };

        input.addEventListener('input', validateCommittedValue);
        input.addEventListener('change', validateCommittedValue);
    }

    function hasManualNativeYear4V235(value) {
        const text = String(value || '').trim();
        if (!text) return true;
        const match = text.match(/^(\d+)-/);
        return !!(match && match[1].length === 4 && Number(match[1]) >= 1 && Number(match[1]) <= 9999);
    }

    function openManualBudgetEventModalV172(eventId = '') {
        closeManualBudgetModalV172();

        const editEvent = eventId
            ? findManualEventV172(eventId)
            : null;

        manualBudgetEditEventV172 = editEvent;

        const entities = collectManualBudgetEntitiesV172();

        // V203: không chặn mở popup khi bộ lọc chung chưa có nhóm.
        // Người dùng chọn Phạm vi dữ liệu trong popup và chính popup sẽ tự tải Meta.

        // V198: modal thủ công dùng reference riêng của Theo dõi ngân sách.
        // Không lấy getMetaLivePeriod() vì đó là bộ lọc chung phía trên.
        const period = state.referencePeriod || getBudgetReferencePeriodV198();

        const selectedKey = editEvent
            ? String(
                editEvent.entityKey ||
                editEvent.adsetId ||
                editEvent.fullName ||
                ''
            )
            : String((entities[0] && entities[0].entityKey) || '');

        let allEntities = entities.slice();

        if (
            editEvent &&
            !allEntities.some(item => String(item.entityKey) === selectedKey)
        ) {
            allEntities.unshift({
                entityKey:selectedKey,
                adsetId:String(editEvent.adsetId || ''),
                campaignId:String(editEvent.campaignId || ''),
                campaignName:String(editEvent.campaignName || ''),
                fullName:String(editEvent.fullName || ''),
                employee:String(editEvent.employee || ''),
                adName:String(editEvent.adName || ''),
                productName:String(editEvent.productName || ''),
                skus:Array.isArray(editEvent.skus) ? editEvent.skus : [],
                isGroupedEntity:!!editEvent.isGroupedEntity,
                groupedSignature:String(editEvent.groupedSignature || editEvent.manualBaselineGroupedSignature || '').replace(/^group:/,''),
                memberAdsetIds:Array.isArray(editEvent.memberAdsetIds) ? editEvent.memberAdsetIds : [],
                memberNames:Array.isArray(editEvent.memberNames) ? editEvent.memberNames : [],
                mergedCount:Number(editEvent.mergedCount || editEvent.manualBaselineMatchedCount || 1)
            });
        }

        const entityOptions = allEntities.length
            ? allEntities.map(entity => (
                `<option value="${escapeHtml(entity.entityKey)}" ` +
                `${String(entity.entityKey) === selectedKey ? 'selected' : ''}>` +
                `${escapeHtml(manualEntityLabelV172(entity))}` +
                `</option>`
            )).join('')
            : '<option value="">Chọn Phạm vi dữ liệu để tải nhóm quảng cáo</option>';

        const initialDate = editEvent
            ? toLocalDatetimeInputV172(editEvent.changedAt)
            : toLocalDatetimeInputV172(new Date());

        const fromBudget = editEvent
            ? Number(editEvent.fromBudget || 0)
            : '';

        const toBudget = editEvent
            ? (
                String(editEvent.manualToBudgetMode || '') === 'current'
                    ? ''
                    : (
                        editEvent.toBudget !== null &&
                        editEvent.toBudget !== undefined
                            ? Number(editEvent.toBudget)
                            : ''
                    )
            )
            : '';

        const selectedEntityForNextV234 = allEntities.find(
            item => String(item.entityKey) === selectedKey
        ) || null;
        const recordedNextForEditV234 = editEvent && selectedEntityForNextV234
            ? findRecordedNextBudgetEventV234(
                selectedEntityForNextV234,
                editEvent.changedAt || editEvent.changedAtMs,
                editEvent.manualCurrentBudget
            )
            : null;
        const nextChangeInitialV234 = editEvent && editEvent.manualNextChangeAt
            ? toLocalDatetimeInputV172(editEvent.manualNextChangeAt)
            : (recordedNextForEditV234
                ? toLocalDatetimeInputV172(recordedNextForEditV234.changedAt)
                : '');
        const nextBaselineSpendInitialV234 = editEvent &&
            editEvent.manualNextBaselineSpend !== null &&
            editEvent.manualNextBaselineSpend !== undefined
                ? Number(editEvent.manualNextBaselineSpend)
                : '';

        const baselineSpend = editEvent &&
            editEvent.manualBaselineSpend !== null &&
            editEvent.manualBaselineSpend !== undefined
                ? Number(editEvent.manualBaselineSpend)
                : '';

        const note = editEvent
            ? String(editEvent.manualNote || '')
            : '';

        // V203: phạm vi là của riêng event đang thêm/sửa, không dùng state.filterFrom
        // và không kế thừa bộ lọc/ngày của lần thao tác trước.
        const rawCalcFromInitialV212 = editEvent
            ? String(
                editEvent.manualDataRangeFrom ||
                editEvent.manualCalculationFrom ||
                editEvent.baselinePeriodFrom ||
                ''
            )
            : '';
        const earliestMetaDateV212 = getMetaDirectEarliestAllowedDateV212();
        const calcFromInitialV199 = rawCalcFromInitialV212 && rawCalcFromInitialV212 < earliestMetaDateV212
            ? earliestMetaDateV212
            : rawCalcFromInitialV212;

        const modal = document.createElement('div');
        modal.id = 'manual-budget-event-modal-v172';
        modal.className = 'manual-budget-overlay-v172';

        modal.innerHTML = `
            <div class="manual-budget-modal-v172" role="dialog" aria-modal="true">
                <div class="manual-budget-head-v172">
                    <div>
                        <h3>${editEvent ? 'Sửa' : 'Thêm'} thay đổi ngân sách thủ công</h3>
                        <p>
                            Dùng để bổ sung các lần đổi ngân sách xảy ra trước khi hệ thống bắt đầu ghi lịch sử.
                        </p>
                    </div>
                    <button type="button" class="manual-budget-close-v172">×</button>
                </div>

                <div class="manual-budget-body-v172">
                    <div class="manual-budget-period-v172">
                        <b>Phạm vi dữ liệu riêng:</b>
                        popup tự truy xuất Meta theo phạm vi này; không đọc bộ lọc ngày/tháng bên ngoài.
                        Dữ liệu đã lấy sẽ được lưu cùng mốc để đổi tab hoặc đổi công ty rồi quay lại vẫn hiển thị.
                    </div>

                    <div class="manual-budget-calc-range-v199">
                        <div class="manual-budget-calc-copy-v199">
                            <b>Phạm vi dữ liệu</b>
                            <small>
                                Chọn ngày bắt đầu để popup tự truy xuất dữ liệu Meta từ ngày đó đến <strong>hôm nay</strong>.
                                Đây là phạm vi duy nhất dùng cho mốc thủ công, không phụ thuộc bộ lọc bên ngoài.
                            </small>
                        </div>
                        <div class="manual-budget-calc-controls-v199">
                            <label>
                                <span>Dữ liệu từ ngày</span>
                                <input
                                    id="manual-budget-calc-from-v199"
                                    type="date"
                                    max="9999-12-31"
                                    value="${escapeHtml(calcFromInitialV199)}"
                                >
                            </label>
                            <div class="manual-budget-calc-today-v199">
                                <span>Đến ngày</span>
                                <b>${escapeHtml(getBudgetTodayIsoV199())} · Hôm nay</b>
                            </div>
                        </div>
                        <div id="manual-budget-range-status-v203" class="manual-budget-range-status-v203">
                            ${calcFromInitialV199 ? 'Đang chuẩn bị dữ liệu phạm vi đã lưu...' : 'Chọn ngày bắt đầu để tải nhóm quảng cáo và dữ liệu Meta.'}
                        </div>
                    </div>

                    <label class="manual-budget-field-v172">
                        <span>Nhóm quảng cáo</span>
                        <select id="manual-budget-entity-v172" ${editEvent ? 'disabled' : ''}>
                            ${entityOptions}
                        </select>
                    </label>

                    <div class="manual-budget-grid-v172">
                        <label class="manual-budget-field-v172">
                            <span>Thời điểm đổi ngân sách</span>
                            <input
                                id="manual-budget-time-v172"
                                type="datetime-local"
                                max="9999-12-31T23:59"
                                value="${escapeHtml(initialDate)}"
                            >
                        </label>

                        <label class="manual-budget-field-v172">
                            <span>Chi Meta lũy kế tại thời điểm đổi</span>
                            <input
                                id="manual-budget-baseline-spend-v172"
                                type="number"
                                min="0"
                                step="1000"
                                value="${escapeHtml(baselineSpend)}"
                                placeholder="Ví dụ: 1250000"
                            >
                        </label>

                        <label class="manual-budget-field-v172">
                            <span>Ngân sách trước</span>
                            <input
                                id="manual-budget-from-v172"
                                type="number"
                                min="0"
                                step="1000"
                                value="${escapeHtml(fromBudget)}"
                                placeholder="200000"
                            >
                        </label>

                        <label class="manual-budget-field-v172">
                            <span>Ngân sách sau <em style="font-weight:500;color:#8a98a8;">(có thể bỏ trống)</em></span>
                            <input
                                id="manual-budget-to-v172"
                                type="number"
                                min="0"
                                step="1000"
                                value="${escapeHtml(toBudget)}"
                                placeholder="Bỏ trống = lấy NS hiện tại"
                            >
                            <small>
                                Đây là mức ngân sách bắt đầu ngay tại “Thời điểm đổi ngân sách” phía trên.
                            </small>
                        </label>

                        <label class="manual-budget-field-v172">
                            <span>Thời điểm đổi tiếp theo <em style="font-weight:500;color:#8a98a8;">(nếu sau đó đã đổi tiếp)</em></span>
                            <input
                                id="manual-budget-next-time-v234"
                                type="datetime-local"
                                max="9999-12-31T23:59"
                                value="${escapeHtml(nextChangeInitialV234)}"
                            >
                        </label>

                        <label class="manual-budget-field-v172">
                            <span>Chi Meta lũy kế tại thời điểm đổi tiếp theo <em style="font-weight:500;color:#8a98a8;">(không bắt buộc)</em></span>
                            <input
                                id="manual-budget-next-baseline-v234"
                                type="number"
                                min="0"
                                step="1000"
                                value="${escapeHtml(nextBaselineSpendInitialV234)}"
                                placeholder="Nhập nếu cần chính xác theo giờ/phút"
                            >
                        </label>
                    </div>

                    <label class="manual-budget-field-v172">
                        <span>Ghi chú</span>
                        <textarea
                            id="manual-budget-note-v172"
                            rows="5"
                            placeholder="Ví dụ: Tăng NS sau khi ROAS ổn định..."
                        >${escapeHtml(note)}</textarea>
                    </label>

                    <div class="manual-budget-warning-v172">
                        <b>Lưu ý:</b>
                        Phạm vi dữ liệu trong popup là nguồn truy xuất chính. Hệ thống lưu lại baseline và
                        chi Meta hiện tại cùng event trên Firebase; việc đổi tab/công ty không làm mất số đã lấy.
                    </div>
                </div>

                <div class="manual-budget-foot-v172">
                    <button
                        type="button"
                        class="btn-toggle-history manual-budget-cancel-v172"
                    >Hủy</button>

                    <button
                        type="button"
                        class="btn-export-excel manual-budget-save-v172"
                    >${editEvent ? 'Cập nhật' : 'Lưu thay đổi'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // V203: phạm vi trong popup tự tải Meta và cập nhật danh sách nhóm,
        // không cần người dùng đổi bộ lọc bên ngoài trước.
        let modalRangeDataV203 = null;

        async function loadModalRangeV203(fromValue, keepKey = '') {
            const from = String(fromValue || '').trim();
            const statusEl = modal.querySelector('#manual-budget-range-status-v203');
            const selectEl = modal.querySelector('#manual-budget-entity-v172');
            const today = getBudgetTodayIsoV199();

            if (!from) {
                if (statusEl) statusEl.textContent = 'Chọn ngày bắt đầu để tải nhóm quảng cáo và dữ liệu Meta.';
                return null;
            }
            if (!isBudgetIsoDateV198(from) || from > today) {
                if (statusEl) statusEl.textContent = 'Ngày bắt đầu không hợp lệ.';
                return null;
            }

            // V233: input date native giữ nguyên như cũ. Không clamp và không ghi ngược
            // ngày/năm khác vào ô trong lúc người dùng thao tác.
            const safeModalPeriodV212 = normalizeMetaApiPeriodV212(from, today);
            if (!safeModalPeriodV212.supported) {
                if (statusEl) statusEl.textContent = safeModalPeriodV212.reason === 'too_old'
                    ? `Meta chỉ hỗ trợ phạm vi bắt đầu từ ${safeModalPeriodV212.earliest} trở đi.`
                    : 'Phạm vi dữ liệu không hợp lệ.';
                return null;
            }
            if (safeModalPeriodV212.clamped) {
                if (statusEl) {
                    statusEl.textContent = `Meta chỉ hỗ trợ phạm vi bắt đầu từ ${safeModalPeriodV212.earliest} trở đi. Ngày bạn chọn vẫn được giữ nguyên.`;
                }
                return null;
            }

            if (statusEl) statusEl.textContent = `Đang truy xuất Meta ${from} → ${today} • cache chung 5 phút...`;
            if (selectEl && !editEvent) selectEl.disabled = true;

            try {
                modalRangeDataV203 = await fetchManualBudgetRangeSnapshotV203(
                    CURRENT_COMPANY,
                    from,
                    today
                );

                const fetchedEntities = collectManualBudgetEntitiesFromRowsV203(
                    modalRangeDataV203.rows
                );

                if (editEvent) {
                    const editKey = String(editEvent.entityKey || editEvent.adsetId || editEvent.fullName || '');
                    if (!fetchedEntities.some(item => String(item.entityKey) === editKey)) {
                        fetchedEntities.unshift({
                            entityKey:editKey,
                            adsetId:String(editEvent.adsetId || ''),
                            campaignId:String(editEvent.campaignId || ''),
                            campaignName:String(editEvent.campaignName || ''),
                            fullName:String(editEvent.fullName || ''),
                            employee:String(editEvent.employee || ''),
                            adName:String(editEvent.adName || ''),
                            productName:String(editEvent.productName || ''),
                            skus:Array.isArray(editEvent.skus) ? editEvent.skus : [],
                            isGroupedEntity:!!editEvent.isGroupedEntity,
                            groupedSignature:String(editEvent.groupedSignature || editEvent.manualBaselineGroupedSignature || '').replace(/^group:/,''),
                            memberAdsetIds:Array.isArray(editEvent.memberAdsetIds) ? editEvent.memberAdsetIds : [],
                            memberNames:Array.isArray(editEvent.memberNames) ? editEvent.memberNames : [],
                            mergedCount:Number(editEvent.mergedCount || editEvent.manualBaselineMatchedCount || 1),
                            source:'event_history'
                        });
                    }
                }

                allEntities = fetchedEntities;

                if (selectEl) {
                    const wantedKey = String(
                        keepKey ||
                        selectEl.value ||
                        selectedKey ||
                        (allEntities[0] && allEntities[0].entityKey) ||
                        ''
                    );

                    selectEl.innerHTML = allEntities.length
                        ? allEntities.map(entity => (
                            `<option value="${escapeHtml(entity.entityKey)}" ${String(entity.entityKey) === wantedKey ? 'selected' : ''}>` +
                            `${escapeHtml(manualEntityLabelV172(entity))}</option>`
                        )).join('')
                        : '<option value="">Không có nhóm quảng cáo trong phạm vi này</option>';

                    if (!editEvent) selectEl.disabled = false;
                }

                if (statusEl) {
                    const cacheSecondsV212 = Number(modalRangeDataV203 && modalRangeDataV203.cacheRemainingSeconds);
                    const cacheTextV212 = Number.isFinite(cacheSecondsV212)
                        ? ` • cache 5 phút còn ${Math.max(0, cacheSecondsV212)}s`
                        : ' • cache chung 5 phút';
                    statusEl.textContent = `Đã tải ${allEntities.length} nhóm • Meta ${from} → ${today}${cacheTextV212}.`;
                }

                return modalRangeDataV203;
            } catch(error) {
                if (statusEl) statusEl.textContent = `Không tải được Meta: ${error && error.message ? error.message : error}`;
                if (selectEl && !editEvent) selectEl.disabled = false;
                throw error;
            }
        }

        // V235: giữ giao diện lịch native, chỉ giới hạn phần năm còn 4 chữ số.
        [
            modal.querySelector('#manual-budget-calc-from-v199'),
            modal.querySelector('#manual-budget-time-v172'),
            modal.querySelector('#manual-budget-next-time-v234')
        ].forEach(bindManualNativeYear4V235);

        const rangeInputV203 = modal.querySelector('#manual-budget-calc-from-v199');
        if (rangeInputV203) {
            rangeInputV203.addEventListener('change', function(){
                loadModalRangeV203(
                    this.value,
                    modal.querySelector('#manual-budget-entity-v172')?.value || ''
                ).catch(error => console.warn('Popup range V233:', error && error.message ? error.message : error));
            });
        }

        if (calcFromInitialV199) {
            setTimeout(() => {
                loadModalRangeV203(calcFromInitialV199, selectedKey)
                    .catch(error => console.warn('Popup initial range V203:', error && error.message ? error.message : error));
            }, 0);
        }

        const close = () => closeManualBudgetModalV172();

        modal.addEventListener('click',event => {
            if (event.target === modal) close();
        });

        modal.querySelector('.manual-budget-close-v172').onclick = close;
        modal.querySelector('.manual-budget-cancel-v172').onclick = close;

        modal.querySelector('.manual-budget-save-v172').onclick = async () => {
            const entityKey = String(
                document.getElementById('manual-budget-entity-v172')?.value || ''
            );

            const calcFromRawV232 = String(
                document.getElementById('manual-budget-calc-from-v199')?.value || ''
            ).trim();
            let calcFromV199 = calcFromRawV232 && isBudgetIsoDateV198(calcFromRawV232)
                ? calcFromRawV232
                : '';

            const changedLocal = String(
                document.getElementById('manual-budget-time-v172')?.value || ''
            );

            const fromBudgetValue = Number(
                document.getElementById('manual-budget-from-v172')?.value || 0
            );

            const toBudgetRaw = String(
                document.getElementById('manual-budget-to-v172')?.value || ''
            ).trim();

            const toBudgetValue = toBudgetRaw === ''
                ? null
                : Number(toBudgetRaw);

            const nextChangedLocalV234 = String(
                document.getElementById('manual-budget-next-time-v234')?.value || ''
            ).trim();
            // V236: phân biệt thời điểm đổi tiếp theo do người dùng thật sự nhập
            // với thời điểm đã được hệ thống tự điền từ event Meta.
            const nextChangedWasUserProvidedV236 = !!nextChangedLocalV234 && (
                !editEvent ||
                String(editEvent.manualNextTimeSource || '') === 'manual_exact' ||
                String(nextChangedLocalV234) !== String(nextChangeInitialV234 || '')
            );
            const nextBaselineRawV234 = String(
                document.getElementById('manual-budget-next-baseline-v234')?.value || ''
            ).trim();
            const nextBaselineManualV234 = nextBaselineRawV234 === ''
                ? null
                : Number(nextBaselineRawV234);

            const baselineRaw = String(
                document.getElementById('manual-budget-baseline-spend-v172')?.value || ''
            ).trim();

            let manualBaselineSpend = baselineRaw === ''
                ? null
                : Number(baselineRaw);

            let manualBaselineMeta = baselineRaw === ''
                ? null
                : {
                    source:'manual_input',
                    precision:'manual',
                    // V198: baseline nhập tay không lấy ngày bắt đầu từ bộ lọc chung.
                    // Mặc định theo đầu tháng của chính thời điểm đổi.
                    from:'',
                    to:dateOnlyLocalV172(
                        new Date(
                            document.getElementById('manual-budget-time-v172')?.value || ''
                        )
                    )
                };

            const manualNote = String(
                document.getElementById('manual-budget-note-v172')?.value || ''
            ).trim();

            if (!entityKey) {
                showToast('Vui lòng chọn nhóm quảng cáo.','warning');
                return;
            }

            if (!changedLocal) {
                showToast('Vui lòng chọn thời điểm đổi ngân sách.','warning');
                return;
            }

            const todayV199 = getBudgetTodayIsoV199();

            if (calcFromRawV232 && !hasManualNativeYear4V235(calcFromRawV232)) {
                showToast('Năm trong “Dữ liệu từ ngày” chỉ được nhập 4 chữ số.', 'warning');
                return;
            }
            if (changedLocal && !hasManualNativeYear4V235(changedLocal)) {
                showToast('Năm trong “Thời điểm đổi ngân sách” chỉ được nhập 4 chữ số.', 'warning');
                return;
            }
            if (nextChangedLocalV234 && !hasManualNativeYear4V235(nextChangedLocalV234)) {
                showToast('Năm trong “Thời điểm đổi tiếp theo” chỉ được nhập 4 chữ số.', 'warning');
                return;
            }

            if (
                calcFromRawV232 &&
                (
                    !calcFromV199 ||
                    !isBudgetIsoDateV198(calcFromV199) ||
                    calcFromV199 > todayV199
                )
            ) {
                showToast(
                    'Ngày bắt đầu tính dữ liệu không hợp lệ hoặc lớn hơn hôm nay.',
                    'warning'
                );
                return;
            }

            if (
                !Number.isFinite(fromBudgetValue) ||
                fromBudgetValue < 0
            ) {
                showToast(
                    'Ngân sách trước chưa hợp lệ.',
                    'warning'
                );
                return;
            }

            if (
                toBudgetValue !== null &&
                (
                    !Number.isFinite(toBudgetValue) ||
                    toBudgetValue < 0 ||
                    fromBudgetValue === toBudgetValue
                )
            ) {
                showToast(
                    'Ngân sách sau chưa hợp lệ hoặc không có thay đổi.',
                    'warning'
                );
                return;
            }

            if (
                manualBaselineSpend !== null &&
                (
                    !Number.isFinite(manualBaselineSpend) ||
                    manualBaselineSpend < 0
                )
            ) {
                showToast('Chi Meta lũy kế chưa hợp lệ.','warning');
                return;
            }

            if (
                nextBaselineManualV234 !== null &&
                (
                    !Number.isFinite(nextBaselineManualV234) ||
                    nextBaselineManualV234 < 0
                )
            ) {
                showToast('Chi Meta lũy kế tại thời điểm đổi tiếp theo chưa hợp lệ.','warning');
                return;
            }

            const changedDate = new Date(changedLocal);

            if (
                isNaN(changedDate.getTime()) ||
                changedDate.getTime() > Date.now()
            ) {
                showToast(
                    'Thời điểm đổi ngân sách không hợp lệ hoặc lớn hơn hiện tại.',
                    'warning'
                );
                return;
            }

            const changedDateOnly = dateOnlyLocalV172(changedDate);

            let nextChangedDateV234 = null;
            let autoDetectedNextEventV234 = null;
            if (nextChangedLocalV234) {
                if (toBudgetValue === null) {
                    showToast(
                        'Chỉ nhập “Thời điểm đổi tiếp theo” khi đã nhập một mức “Ngân sách sau” cố định.',
                        'warning'
                    );
                    return;
                }

                nextChangedDateV234 = new Date(nextChangedLocalV234);
                if (
                    isNaN(nextChangedDateV234.getTime()) ||
                    nextChangedDateV234.getTime() <= changedDate.getTime() ||
                    nextChangedDateV234.getTime() > Date.now()
                ) {
                    showToast(
                        'Thời điểm đổi tiếp theo phải lớn hơn mốc đổi đầu tiên và không được lớn hơn hiện tại.',
                        'warning'
                    );
                    return;
                }
            }

            // V213: nếu người dùng nhập cố định “Ngân sách sau” nhưng để trống
            // Phạm vi dữ liệu, hệ thống vẫn phải có current budget/current metrics
            // để tạo mốc tiếp nối. Tự dùng đầu tháng của ngày đổi làm range mặc định.
            // Baseline chi phí nhập tay (nếu có) vẫn được tôn trọng, Meta chỉ bổ sung
            // metrics + ngân sách hiện tại.
            if (toBudgetValue !== null && !calcFromV199 && changedDateOnly) {
                const autoFromCandidateV213 = `${changedDateOnly.slice(0,8)}01`;
                const safeAutoPeriodV213 = normalizeMetaApiPeriodV212(
                    autoFromCandidateV213,
                    todayV199
                );

                if (!safeAutoPeriodV213.supported) {
                    showToast(
                        safeAutoPeriodV213.reason === 'too_old'
                            ? `Mốc này vượt giới hạn Meta 37 tháng. Hãy chọn Phạm vi dữ liệu từ ${safeAutoPeriodV213.earliest} trở đi.`
                            : 'Không xác định được Phạm vi dữ liệu cho mốc thủ công.',
                        'warning'
                    );
                    return;
                }

                calcFromV199 = safeAutoPeriodV213.from;
                const rangeInputAutoV213 = document.getElementById('manual-budget-calc-from-v199');
                if (rangeInputAutoV213) rangeInputAutoV213.value = calcFromV199;
            }

            if (
                manualBaselineMeta &&
                manualBaselineMeta.source === 'manual_input'
            ) {
                manualBaselineMeta.from = changedDateOnly
                    ? `${changedDateOnly.slice(0,8)}01`
                    : '';
            }

            // V198: không chặn mốc theo kỳ báo cáo chung.
            // Mốc lịch sử được phép thêm/sửa trực tiếp ở bất kỳ ngày hợp lệ nào.

            const entity = allEntities.find(
                item => String(item.entityKey) === entityKey
            );

            if (!entity) {
                showToast('Không tìm thấy thông tin nhóm quảng cáo.','error');
                return;
            }

            // V234: nếu bỏ trống thời điểm đổi tiếp theo, chỉ tự điền khi đã có
            // event tự động THẬT của cùng hàng gom. Không dùng thời điểm mốc cũ.
            if (!nextChangedDateV234 && toBudgetValue !== null) {
                autoDetectedNextEventV234 = findRecordedNextBudgetEventV234(
                    entity,
                    changedDate,
                    null
                );

                if (autoDetectedNextEventV234) {
                    const detected = new Date(
                        autoDetectedNextEventV234.changedAt ||
                        autoDetectedNextEventV234.changedAtMs ||
                        0
                    );
                    if (!isNaN(detected.getTime()) && detected.getTime() > changedDate.getTime()) {
                        nextChangedDateV234 = detected;
                        const input = document.getElementById('manual-budget-next-time-v234');
                        if (input) input.value = toLocalDatetimeInputV172(detected);
                    }
                }
            }

            // V209: kể cả khi baseline do người dùng nhập tay, current spend vẫn phải
            // bám đúng HÀNG GOM của bảng chính. Vì vậy lưu signature + danh sách thành viên.
            if (entity.isGroupedEntity && manualBaselineMeta) {
                manualBaselineMeta.matchMode = 'grouped_same_as_table';
                manualBaselineMeta.matchedCount = Number(entity.mergedCount || 1);
                manualBaselineMeta.matchedNames = Array.isArray(entity.memberNames)
                    ? entity.memberNames.slice()
                    : [String(entity.fullName || entity.adName || '')].filter(Boolean);
                manualBaselineMeta.groupedSignature = String(entity.groupedSignature || '').replace(/^group:/,'');
            }

            if (!db) db = getDatabase();

            if (!db) {
                showToast('Firebase Database chưa sẵn sàng.','error');
                return;
            }

            // V203: phạm vi popup là độc lập, không ghi vào state.filterFrom và không
            // thay đổi phạm vi hiển thị bên ngoài.
            // V203: baseline/current sẽ được truy xuất theo chính phạm vi popup.
            let manualRangeMetaV203 = null;
            let manualNextRangeMetaV234 = null;

            if (calcFromV199) {
                const saveButton = modal.querySelector('.manual-budget-save-v172');
                const previousLabel = saveButton ? saveButton.textContent : '';

                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = 'Đang truy xuất Meta...';
                }

                try {
                    manualRangeMetaV203 = await resolveManualBudgetRangeDataV203(
                        entity,
                        calcFromV199,
                        changedDate,
                        todayV199
                    );

                    if (nextChangedDateV234) {
                        manualNextRangeMetaV234 = await resolveManualBudgetRangeDataV203(
                            entity,
                            calcFromV199,
                            nextChangedDateV234,
                            todayV199
                        );
                    }

                    if (manualBaselineSpend === null) {
                        manualBaselineSpend = Number(manualRangeMetaV203.baselineSpend || 0);
                        const baselineInput = document.getElementById('manual-budget-baseline-spend-v172');
                        if (baselineInput) baselineInput.value = String(manualBaselineSpend);
                    }

                    if (baselineRaw === '') {
                        manualBaselineMeta = {
                            source:'meta_popup_range_grouped_v209',
                            precision:manualRangeMetaV203.baselinePrecision || 'date_range',
                            matchMode:manualRangeMetaV203.matchMode || 'grouped_same_as_table',
                            matchedCount:Number(manualRangeMetaV203.matchedCount || entity.mergedCount || 1),
                            matchedNames:Array.isArray(manualRangeMetaV203.matchedNames) && manualRangeMetaV203.matchedNames.length
                                ? manualRangeMetaV203.matchedNames
                                : (Array.isArray(entity.memberNames) ? entity.memberNames : [String(entity.fullName || entity.adName || '')].filter(Boolean)),
                            groupedSignature:String(
                                manualRangeMetaV203.groupedSignature ||
                                entity.groupedSignature ||
                                ''
                            ).replace(/^group:/,''),
                            from:calcFromV199,
                            to:manualRangeMetaV203.baselineTo,
                            syncedAt:manualRangeMetaV203.baselineSyncedAt || '',
                            currentSyncedAt:manualRangeMetaV203.currentSyncedAt || ''
                        };
                    }

                    showToast(
                        `Đã lấy Meta theo phạm vi ${calcFromV199} → ${todayV199}. ` +
                        `Baseline: ${formatMetaLiveInteger(manualBaselineSpend)} ₫ • ` +
                        `Hiện tại: ${formatMetaLiveInteger(manualRangeMetaV203.currentSpend)} ₫.`,
                        'success'
                    );
                } catch(error) {
                    console.error('Manual Range Meta V203:', error);
                    showToast(
                        `Không truy xuất được dữ liệu Meta theo Phạm vi dữ liệu: ${
                            error && error.message ? error.message : error
                        }`,
                        'error'
                    );

                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = previousLabel || (editEvent ? 'Cập nhật' : 'Lưu thay đổi');
                    }
                    return;
                } finally {
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = previousLabel || (editEvent ? 'Cập nhật' : 'Lưu thay đổi');
                    }
                }
            } else if (manualBaselineSpend === null) {
                showToast(
                    'Vui lòng chọn “Dữ liệu từ ngày” để hệ thống tự truy xuất Meta, hoặc nhập Chi Meta lũy kế bằng tay.',
                    'warning'
                );
                return;
            }

            const changedAt = changedDate.toISOString();
            const changedAtMs = changedDate.getTime();

            const existing = manualBudgetEditEventV172;

            const eventId = existing && existing.eventId
                ? String(existing.eventId)
                : `manual_${changedAtMs}_${metaLiveStableHash({
                    company:CURRENT_COMPANY,
                    entityKey,
                    changedAtMs,
                    fromBudgetValue,
                    toBudgetValue,
                    manualToBudgetMode:toBudgetValue === null ? 'current' : 'fixed'
                })}`;

            const delta = toBudgetValue === null
                ? null
                : toBudgetValue - fromBudgetValue;

            const payload = {
                version:2,
                source:'manual_v172',
                isManual:true,
                eventId,

                company:String(CURRENT_COMPANY || 'NNV'),
                entityKey:String(entity.entityKey || entityKey),
                adsetId:String(entity.adsetId || ''),
                campaignId:String(entity.campaignId || ''),
                campaignName:String(entity.campaignName || ''),
                fullName:String(entity.fullName || ''),
                employee:String(entity.employee || ''),
                adName:String(entity.adName || ''),
                productName:String(entity.productName || ''),
                skus:Array.isArray(entity.skus) ? entity.skus : [],

                // V209: lưu danh tính của HÀNG GOM để lần sau không rơi về adset gốc.
                isGroupedEntity:!!entity.isGroupedEntity,
                groupedSignature:String(entity.groupedSignature || '').replace(/^group:/,''),
                memberAdsetIds:Array.isArray(entity.memberAdsetIds) ? entity.memberAdsetIds : [],
                memberNames:Array.isArray(entity.memberNames) ? entity.memberNames : [],
                mergedCount:Number(entity.mergedCount || 1),

                changedAt,
                changedAtMs,
                detectedAt:new Date().toISOString(),
                sourceUpdatedAt:changedAt,

                fromBudget:fromBudgetValue,

                // V173: để null khi muốn tự lấy ngân sách sau.
                // Firebase sẽ không giữ child toBudget nếu null, nên có mode riêng.
                toBudget:toBudgetValue,
                manualToBudgetMode:toBudgetValue === null
                    ? 'current'
                    : 'fixed',

                delta,
                direction:toBudgetValue === null
                    ? 'current'
                    : (
                        delta > 0
                            ? 'increase'
                            : (delta < 0 ? 'decrease' : 'change')
                    ),

                fromType:String(existing && existing.fromType || 'daily'),
                toType:String(existing && existing.toType || 'daily'),
                fromUsesCampaign:!!(existing && existing.fromUsesCampaign),
                toUsesCampaign:!!(existing && existing.toUsesCampaign),

                baselinePeriodFrom:String(calcFromV199 || ''),
                baselinePeriodTo:String(
                    manualRangeMetaV203 && manualRangeMetaV203.baselineTo || changedDateOnly || ''
                ),

                // V203: phạm vi dữ liệu là thuộc tính riêng của event và là nguồn truy xuất Meta.
                manualCalculationFrom:calcFromV199,
                manualCalculationToMode:'today',
                manualDataRangeFrom:calcFromV199,
                manualDataRangeTo:todayV199,

                // V203: lưu cả baseline/current đã truy xuất để đổi tab/công ty không mất dữ liệu.
                // V213: dù Chi Meta baseline được nhập tay, nếu popup đã tải range
                // thì vẫn giữ baseline metrics Meta để tính Tin nhắn/Lượt mua/CTR... sau đổi.
                // Chỉ riêng spend baseline ưu tiên số người dùng nhập.
                baselineMetrics:manualRangeMetaV203
                    ? manualRangeMetaV203.baselineMetrics
                    : (existing && existing.baselineMetrics || null),
                manualBaselineMetrics:manualRangeMetaV203
                    ? manualRangeMetaV203.baselineMetrics
                    : (existing && existing.manualBaselineMetrics || null),
                manualCurrentMetrics:manualRangeMetaV203
                    ? manualRangeMetaV203.currentMetrics
                    : (existing && existing.manualCurrentMetrics || null),
                manualBaselineSpend,
                manualCurrentSpend:manualRangeMetaV203
                    ? Number(manualRangeMetaV203.currentSpend || 0)
                    : (existing && existing.manualCurrentSpend !== undefined
                        ? Number(existing.manualCurrentSpend || 0)
                        : null),

                // V213: lưu luôn ngân sách hiện tại của đúng grouped row.
                // Nhờ vậy reload/đổi tab vẫn dựng được mốc tiếp nối mà không phụ thuộc
                // reference snapshot bên ngoài popup.
                manualCurrentBudget:manualRangeMetaV203 && manualRangeMetaV203.currentBudget !== null && manualRangeMetaV203.currentBudget !== undefined
                    ? Number(manualRangeMetaV203.currentBudget || 0)
                    : (existing && existing.manualCurrentBudget !== undefined
                        ? Number(existing.manualCurrentBudget || 0)
                        : null),
                manualCurrentBudgetUsesCampaign:manualRangeMetaV203
                    ? !!manualRangeMetaV203.currentBudgetUsesCampaign
                    : !!(existing && existing.manualCurrentBudgetUsesCampaign),
                manualCurrentBudgetType:manualRangeMetaV203
                    ? String(manualRangeMetaV203.currentBudgetType || '')
                    : String(existing && existing.manualCurrentBudgetType || ''),
                manualCurrentBudgetSource:manualRangeMetaV203
                    ? String(manualRangeMetaV203.currentBudgetSource || '')
                    : String(existing && existing.manualCurrentBudgetSource || ''),
                manualCurrentBudgetSyncedAt:manualRangeMetaV203
                    ? String(manualRangeMetaV203.currentSyncedAt || '')
                    : String(existing && existing.manualCurrentBudgetSyncedAt || ''),

                // V234: thời điểm riêng cho lần đổi tiếp theo (nếu có).
                manualNextChangeAt:nextChangedDateV234
                    ? nextChangedDateV234.toISOString()
                    : '',
                manualNextChangeAtMs:nextChangedDateV234
                    ? nextChangedDateV234.getTime()
                    : 0,
                manualNextBaselineSpend:nextBaselineManualV234 !== null
                    ? nextBaselineManualV234
                    : (manualNextRangeMetaV234
                        ? Number(manualNextRangeMetaV234.baselineSpend || 0)
                        : null),
                manualNextBaselineMetrics:manualNextRangeMetaV234
                    ? manualNextRangeMetaV234.baselineMetrics
                    : null,
                manualNextBaselineSyncedAt:manualNextRangeMetaV234
                    ? String(manualNextRangeMetaV234.baselineSyncedAt || '')
                    : '',
                manualNextBaselinePrecision:nextBaselineManualV234 !== null
                    ? 'manual_exact'
                    : (manualNextRangeMetaV234
                        ? String(manualNextRangeMetaV234.baselinePrecision || 'meta_date_range_end_of_day')
                        : ''),
                manualNextBudgetFrom:toBudgetValue,
                manualNextBudgetTo:autoDetectedNextEventV234 && autoDetectedNextEventV234.toBudget !== null && autoDetectedNextEventV234.toBudget !== undefined
                    ? Number(autoDetectedNextEventV234.toBudget || 0)
                    : (manualNextRangeMetaV234 && manualNextRangeMetaV234.currentBudget !== null && manualNextRangeMetaV234.currentBudget !== undefined
                        ? Number(manualNextRangeMetaV234.currentBudget || 0)
                        : (manualRangeMetaV203 && manualRangeMetaV203.currentBudget !== null && manualRangeMetaV203.currentBudget !== undefined
                            ? Number(manualRangeMetaV203.currentBudget || 0)
                            : null)),
                manualNextTimeSource:autoDetectedNextEventV234
                    ? 'auto_recorded_event'
                    : (nextChangedDateV234 ? 'manual_exact' : 'auto_recorded_event_only'),

                manualContinuationModeV213:toBudgetValue !== null
                    ? 'fixed_to_budget_requires_real_next_time_v234'
                    : 'direct_to_current',

                manualRangeBaselineSyncedAt:manualRangeMetaV203
                    ? String(manualRangeMetaV203.baselineSyncedAt || '')
                    : String(existing && existing.manualRangeBaselineSyncedAt || ''),
                manualRangeCurrentSyncedAt:manualRangeMetaV203
                    ? String(manualRangeMetaV203.currentSyncedAt || '')
                    : String(existing && existing.manualRangeCurrentSyncedAt || ''),

                manualBaselineSource:
                    manualBaselineMeta && manualBaselineMeta.source
                        ? manualBaselineMeta.source
                        : 'manual_input',

                manualCurrentSource:manualRangeMetaV203
                    ? 'meta_popup_range_grouped_v209'
                    : String(existing && existing.manualCurrentSource || ''),

                manualBaselinePrecision:
                    manualBaselineMeta && manualBaselineMeta.precision
                        ? manualBaselineMeta.precision
                        : 'manual',

                manualBaselineAutoFrom:
                    manualBaselineMeta && manualBaselineMeta.from
                        ? manualBaselineMeta.from
                        : '',

                manualBaselineAutoTo:
                    manualBaselineMeta && manualBaselineMeta.to
                        ? manualBaselineMeta.to
                        : '',

                manualBaselineAutoSyncedAt:
                    manualBaselineMeta && manualBaselineMeta.syncedAt
                        ? manualBaselineMeta.syncedAt
                        : '',

                manualBaselineMatchMode:
                    manualBaselineMeta && manualBaselineMeta.matchMode
                        ? manualBaselineMeta.matchMode
                        : '',

                manualBaselineMatchedCount:
                    manualBaselineMeta && manualBaselineMeta.matchedCount
                        ? Number(manualBaselineMeta.matchedCount)
                        : 0,

                manualBaselineMatchedNames:
                    manualBaselineMeta && Array.isArray(manualBaselineMeta.matchedNames)
                        ? manualBaselineMeta.matchedNames
                        : [],

                manualBaselineGroupedSignature:
                    manualBaselineMeta && manualBaselineMeta.groupedSignature
                        ? String(manualBaselineMeta.groupedSignature)
                        : '',

                manualNote,

                manualCreatedByUid:String(
                    (firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid) ||
                    ''
                ),
                manualCreatedByEmail:String(
                    (firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) ||
                    ''
                ),
                manualCreatedBy:String(
                    (window.myIdentity || '') ||
                    'Marketing System'
                ),
                manualUpdatedAt:firebase.database.ServerValue.TIMESTAMP
            };

            // V182: lưu manual event vào node riêng, không đụng meta_live_snapshots_v1.
            const path = [
                META_MANUAL_BUDGET_ROOT_V182,
                payload.company,
                safeMetaBudgetKeyV166(payload.entityKey),
                eventId
            ].join('/');

            try {
                // V236: parent và mốc tiếp theo do người dùng nhập được lưu thành
                // hai event độc lập. Mốc Meta tự phát hiện không bị sao chép sang manual.
                const rootUpdatesV236 = {};
                rootUpdatesV236[`/${path}`] = payload;

                const followupPathV236 = independentManualFollowupPathV236(payload);
                const followupBudgetToV236 = manualNextRangeMetaV234 && manualNextRangeMetaV234.currentBudget !== null && manualNextRangeMetaV234.currentBudget !== undefined
                    ? Number(manualNextRangeMetaV234.currentBudget || 0)
                    : (manualRangeMetaV203 && manualRangeMetaV203.currentBudget !== null && manualRangeMetaV203.currentBudget !== undefined
                        ? Number(manualRangeMetaV203.currentBudget || 0)
                        : finiteBudgetNumberV210(payload.manualNextBudgetTo));

                if (nextChangedWasUserProvidedV236 && nextChangedDateV234) {
                    const followupPayloadV236 = buildIndependentManualFollowupV236(payload,{
                        nextChangedDate:nextChangedDateV234,
                        nextBudgetTo:followupBudgetToV236,
                        nextBaselineSpend:payload.manualNextBaselineSpend,
                        nextBaselineMetrics:payload.manualNextBaselineMetrics,
                        nextBaselineSyncedAt:payload.manualNextBaselineSyncedAt,
                        nextBaselinePrecision:payload.manualNextBaselinePrecision || 'manual_exact',
                        currentMetrics:payload.manualCurrentMetrics,
                        currentSpend:payload.manualCurrentSpend
                    });
                    if (followupPayloadV236 && followupPathV236) {
                        rootUpdatesV236[`/${followupPathV236}`] = followupPayloadV236;
                    }
                } else if (followupPathV236) {
                    // Nếu người dùng xóa thời điểm thủ công hoặc chuyển sang dùng mốc Meta tự động,
                    // dọn đúng child manual cũ; event Meta thật không nằm ở path này nên không bị ảnh hưởng.
                    rootUpdatesV236[`/${followupPathV236}`] = null;
                }

                await db.ref().update(rootUpdatesV236);

                closeManualBudgetModalV172();

                await loadBudgetPerformanceV166();

                showToast(
                    autoDetectedNextEventV234
                        ? 'Đã lưu mốc thủ công. Thời điểm đổi tiếp theo được lấy từ event Meta đã ghi nhận thật.'
                        : (nextChangedDateV234
                            ? 'Đã lưu mốc thủ công và thời điểm đổi tiếp theo riêng biệt.'
                            : (manualBaselineSpend === null
                                ? 'Đã lưu mốc thủ công. Nếu ngân sách còn đổi tiếp nhưng hệ thống chưa có mốc tự động, hãy bổ sung thời điểm đổi tiếp theo để tách stage chính xác.'
                                : 'Đã lưu mốc thủ công và baseline chi phí.')),
                    'success'
                );
            } catch(error) {
                console.error('Manual Budget V172:',error);

                const rawMessage = error && error.message
                    ? error.message
                    : String(error || '');

                const permissionDenied = /PERMISSION_DENIED|permission denied/i.test(rawMessage);

                showToast(
                    permissionDenied
                        ? 'Firebase đang chặn quyền ghi mốc ngân sách thủ công. Cần cập nhật Rules cho meta_budget_manual_events_v1.'
                        : `Không lưu được mốc ngân sách thủ công: ${rawMessage}`,
                    'error'
                );
            }
        };
    }

    // =====================================================
    // V236 — MỐC THỦ CÔNG ĐỘC LẬP
    // Nếu người dùng tự nhập “Thời điểm đổi tiếp theo”, mốc đó phải là một
    // event Firebase riêng. Nhờ vậy xóa mốc trước không làm mất mốc sau.
    // Event Meta tự ghi nhận vẫn nằm ở auto ledger và tuyệt đối không có nút xóa.
    // =====================================================
    function buildIndependentManualFollowupV236(parentPayload, options) {
        options = options || {};
        if (!parentPayload || !options.nextChangedDate) return null;

        const nextDate = options.nextChangedDate;
        const nextMs = nextDate instanceof Date ? nextDate.getTime() : Number(nextDate || 0);
        if (!nextMs || !Number.isFinite(nextMs)) return null;

        const fromBudget = finiteBudgetNumberV210(parentPayload.toBudget);
        const toBudget = finiteBudgetNumberV210(options.nextBudgetTo);
        if (fromBudget === null || toBudget === null || fromBudget === toBudget) return null;

        const changedAt = new Date(nextMs).toISOString();
        const eventId = `${String(parentPayload.eventId || 'manual')}__manual_followup_v236`;
        const currentMetrics = options.currentMetrics && typeof options.currentMetrics === 'object'
            ? options.currentMetrics
            : (parentPayload.manualCurrentMetrics || null);
        const currentSpend = options.currentSpend !== null && options.currentSpend !== undefined
            ? Number(options.currentSpend || 0)
            : (parentPayload.manualCurrentSpend !== null && parentPayload.manualCurrentSpend !== undefined
                ? Number(parentPayload.manualCurrentSpend || 0)
                : null);
        const nextBaselineSpend = options.nextBaselineSpend !== null && options.nextBaselineSpend !== undefined
            ? Number(options.nextBaselineSpend || 0)
            : null;

        return {
            ...parentPayload,
            version:3,
            source:'manual_followup_v236',
            isManual:true,
            eventId,
            parentManualEventIdV236:String(parentPayload.eventId || ''),
            isIndependentManualFollowupV236:true,

            changedAt,
            changedAtMs:nextMs,
            detectedAt:new Date().toISOString(),
            sourceUpdatedAt:changedAt,
            changedAtPrecision:'manual_exact',
            actualChangeTimeKnown:true,

            fromBudget,
            toBudget,
            manualToBudgetMode:'fixed',
            delta:toBudget - fromBudget,
            direction:getBudgetDirectionV210(fromBudget,toBudget),

            baselinePeriodTo:dateOnlyLocalV172(nextDate),
            baselineMetrics:options.nextBaselineMetrics || null,
            manualBaselineMetrics:options.nextBaselineMetrics || null,
            manualBaselineSpend:nextBaselineSpend,
            baselineCapturedAt:String(options.nextBaselineSyncedAt || changedAt),
            baselineCapturedAtMs:nextMs,
            baselinePrecision:String(options.nextBaselinePrecision || 'manual_exact'),

            manualCurrentMetrics:currentMetrics,
            manualCurrentSpend:currentSpend,
            manualCurrentBudget:toBudget,
            manualCurrentBudgetUsesCampaign:!!parentPayload.manualCurrentBudgetUsesCampaign,
            manualCurrentBudgetType:String(parentPayload.manualCurrentBudgetType || ''),
            manualCurrentBudgetSource:String(parentPayload.manualCurrentBudgetSource || 'manual_followup_v236'),
            manualCurrentBudgetSyncedAt:String(parentPayload.manualCurrentBudgetSyncedAt || ''),

            // Event độc lập này không phụ thuộc tiếp vào parent để tồn tại.
            manualNextChangeAt:'',
            manualNextChangeAtMs:0,
            manualNextBaselineSpend:null,
            manualNextBaselineMetrics:null,
            manualNextBaselineSyncedAt:'',
            manualNextBaselinePrecision:'',
            manualNextBudgetFrom:null,
            manualNextBudgetTo:null,
            manualNextTimeSource:'',
            manualContinuationModeV213:'direct_to_current',

            manualNote:String(parentPayload.manualNote || ''),
            manualUpdatedAt:firebase.database.ServerValue.TIMESTAMP
        };
    }

    function independentManualFollowupPathV236(parentPayload) {
        if (!parentPayload) return '';
        const eventId = `${String(parentPayload.eventId || 'manual')}__manual_followup_v236`;
        return [
            META_MANUAL_BUDGET_ROOT_V182,
            String(parentPayload.company || CURRENT_COMPANY || 'NNV'),
            safeMetaBudgetKeyV166(parentPayload.entityKey || parentPayload.adsetId || parentPayload.fullName || 'unknown'),
            eventId
        ].join('/');
    }

    async function deleteManualBudgetEventV172(eventId) {
        const event = findManualEventV172(eventId);

        if (!event || !event.isManual) return;

        if (!window.confirm(
            `Xóa mốc thủ công ${formatDateTimeV166(event.changedAt)} ` +
            `${formatMetaLiveInteger(event.fromBudget)} → ${
                String(event.manualToBudgetMode || '') === 'current'
                    ? 'Hiện tại'
                    : formatMetaLiveInteger(event.toBudget)
            }?`
        )) return;

        if (!db) db = getDatabase();

        const path = manualEventFirebasePathV172(event);

        try {
            // V236: chỉ xóa đúng node event được bấm. Không xóa parent/child khác,
            // và không đụng auto event trong meta_live_snapshots_v1.
            await Promise.all([
                db.ref(path).remove(),
                db.ref(
                    budgetTrackingControlPathV210(
                        event.company || CURRENT_COMPANY,
                        event.eventId
                    )
                ).remove().catch(() => null)
            ]);

            await loadBudgetPerformanceV166();

            showToast('Đã xóa mốc ngân sách thủ công.','success');
        } catch(error) {
            const rawMessage = error && error.message
                ? error.message
                : String(error || '');

            showToast(
                /PERMISSION_DENIED|permission denied/i.test(rawMessage)
                    ? 'Firebase đang chặn quyền xóa mốc thủ công. Cần cập nhật Rules cho meta_budget_manual_events_v1.'
                    : `Không xóa được mốc thủ công: ${rawMessage}`,
                'error'
            );
        }
    }

    // =====================================================
    // V210 — NGƯNG THEO DÕI THỦ CÔNG / TỰ ĐỘNG
    // Dùng chung root meta_budget_manual_events_v1 để không cần thêm một
    // Firebase root/rule mới. Tracking controls nằm tại _tracking_controls.
    // =====================================================
    function budgetTrackingControlPathV210(company,eventId) {
        return [
            META_MANUAL_BUDGET_ROOT_V182,
            String(company || CURRENT_COMPANY || 'NNV').toUpperCase(),
            '_tracking_controls',
            safeMetaBudgetKeyV166(eventId)
        ].join('/');
    }

    function ensureBudgetTrackingStyleV210() {
        if (document.getElementById('budget-tracking-v210-style')) return;
        const style = document.createElement('style');
        style.id = 'budget-tracking-v210-style';
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    function closeBudgetTrackingMenuV210() {
        const oldMenu = document.getElementById('budget-tracking-menu-v210');
        if (oldMenu) oldMenu.remove();
        const popup = document.getElementById('budget-tracking-popup-backdrop-v211');
        if (popup) popup.remove();
    }

    function findBudgetTrackingRowV210(eventId) {
        return buildBudgetPerformanceRowsV166().find(row => (
            String(row && row.eventId || '') === String(eventId || '')
        )) || null;
    }

    function buildTrackingStopSnapshotV210(row) {
        const currentContext = getCurrentEventContextV186(row || {});
        const metricRow = currentContext && currentContext.metricRow
            ? currentContext.metricRow
            : null;
        const stopMetrics = metricRow
            ? metricFromCurrentRowV166(metricRow)
            : (
                row && row.trackingControlV210 && row.trackingControlV210.stopMetrics
                    ? row.trackingControlV210.stopMetrics
                    : null
            );

        let stopCumulativeSpend = finiteBudgetNumberV210(
            row && row.endCumulativeSpend
        );
        if (stopCumulativeSpend === null && stopMetrics) {
            stopCumulativeSpend = finiteBudgetNumberV210(stopMetrics.spend);
        }

        const stopBudget = finiteBudgetNumberV210(
            currentContext && currentContext.budgetInfo
                ? currentContext.budgetInfo.amount
                : (row && row.currentBudgetAmount)
        );

        return {
            stopMetrics,
            stopCumulativeSpend,
            stopBudget,
            matchMode:String(currentContext && currentContext.matchMode || '')
        };
    }

    async function saveBudgetTrackingControlV210(row,reason,stoppedAtMs,opts) {
        if (!row || !row.eventId) return false;
        if (!db) db = getDatabase();
        if (!db) throw new Error('Firebase Database chưa sẵn sàng.');

        const company = String(row.company || CURRENT_COMPANY || 'NNV').toUpperCase();
        const snapshot = opts || buildTrackingStopSnapshotV210(row);
        const safeStoppedAtMs = Number(stoppedAtMs || Date.now());
        const payload = {
            version:210,
            eventId:String(row.eventId),
            company,
            entityKey:String(row.entityKey || ''),
            groupedSignature:String(row.manualBaselineGroupedSignature || ''),
            stoppedAt:new Date(safeStoppedAtMs).toISOString(),
            stoppedAtMs:safeStoppedAtMs,
            reason:String(reason || 'manual'),
            stopBudget:snapshot.stopBudget === null ? null : Number(snapshot.stopBudget),
            stopCumulativeSpend:snapshot.stopCumulativeSpend === null
                ? null
                : Number(snapshot.stopCumulativeSpend),
            stopMetrics:snapshot.stopMetrics || null,
            matchMode:String(snapshot.matchMode || ''),
            stoppedBy:String(window.myIdentity || 'Marketing System'),
            updatedAt:firebase.database.ServerValue.TIMESTAMP
        };

        await db.ref(budgetTrackingControlPathV210(company,row.eventId)).set(payload);
        state.trackingControls[String(row.eventId)] = {
            ...payload,
            updatedAt:Date.now()
        };
        return true;
    }

    async function persistAutoBudgetTrackingStopsV210(rows) {
        const candidates = (Array.isArray(rows) ? rows : [])
            .filter(row => (
                row &&
                row.trackingAutoStoppedV210 &&
                String(row.trackingStopReasonV210 || '') === 'auto_current_budget_returned' &&
                !getBudgetTrackingControlV210(row) &&
                Number(row.trackingStopAtMsV210 || 0) > 0
            ));

        if (!candidates.length) return;

        for (const row of candidates) {
            try {
                const snapshot = buildTrackingStopSnapshotV210(row);
                await saveBudgetTrackingControlV210(
                    row,
                    'auto_return_to_base',
                    Number(row.trackingStopAtMsV210 || Date.now()),
                    snapshot
                );
            } catch (error) {
                console.warn(
                    'V210 không lưu được mốc tự ngưng theo dõi:',
                    error && error.message ? error.message : error
                );
            }
        }
    }

    window.openBudgetTrackingMenuV210 = function(eventId,anchor) {
        ensureBudgetTrackingStyleV210();
        closeBudgetTrackingMenuV210();

        const row = findBudgetTrackingRowV210(eventId);
        if (!row || !row.isOpen) {
            showToast('Mốc này hiện không còn ở trạng thái Đang theo dõi.','warning');
            return;
        }

        const popup = document.createElement('div');
        popup.id = 'budget-tracking-popup-backdrop-v211';
        popup.className = 'budget-tracking-popup-backdrop-v211';
        popup.innerHTML = `
            <div class="budget-tracking-popup-v211" role="dialog" aria-modal="true" aria-label="Theo dõi ngân sách">
                <h4>Theo dõi ngân sách</h4>
                <p>Ngưng theo dõi mốc này? Chi phí và doanh thu sau đổi sẽ được chốt tại thời điểm hiện tại.</p>
                <div class="budget-tracking-popup-actions-v211">
                    <button type="button" class="budget-tracking-popup-cancel-v211">Hủy</button>
                    <button type="button" class="budget-tracking-popup-stop-v211">Ngưng theo dõi</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        const card = popup.querySelector('.budget-tracking-popup-v211');
        const cancel = popup.querySelector('.budget-tracking-popup-cancel-v211');
        const stop = popup.querySelector('.budget-tracking-popup-stop-v211');

        popup.onclick = function(ev){
            if (ev.target === popup) closeBudgetTrackingMenuV210();
        };
        if (card) card.onclick = function(ev){ ev.stopPropagation(); };
        if (cancel) cancel.onclick = closeBudgetTrackingMenuV210;
        if (stop) stop.onclick = function(){
            closeBudgetTrackingMenuV210();
            window.stopBudgetTrackingV210(eventId,true);
        };
    };

    window.stopBudgetTrackingV210 = async function(eventId,skipConfirmV211) {
        const row = findBudgetTrackingRowV210(eventId);
        if (!row || !row.isOpen) {
            showToast('Mốc này đã ngưng theo dõi.','warning');
            return;
        }

        if (!window.confirm(
            'Ngưng theo dõi thủ công mốc ngân sách này?\n\n' +
            'Chi phí và doanh thu sau đổi sẽ dừng tại thời điểm bấm ngưng.'
        )) return;

        try {
            await saveBudgetTrackingControlV210(row,'manual',Date.now());
            buildBudgetPerformanceRowsV166();
            renderBudgetPerformanceV166();
            renderMetaBudgetPerformanceV167();
            showToast('Đã ngưng theo dõi thủ công.','success');
        } catch (error) {
            const raw = error && error.message ? error.message : String(error || '');
            showToast(
                /PERMISSION_DENIED|permission denied/i.test(raw)
                    ? 'Firebase đang chặn quyền ghi trạng thái ngưng theo dõi trong meta_budget_manual_events_v1.'
                    : `Không ngưng được theo dõi: ${raw}`,
                'error'
            );
        }
    };

    window.getBudgetTrackingStatusV210 = function() {
        return buildBudgetPerformanceRowsV166().map(row => ({
            eventId:String(row.eventId || ''),
            company:String(row.company || ''),
            group:String(row.adName || row.fullName || ''),
            fromBudget:Number(row.fromBudget || 0),
            toBudget:finiteBudgetNumberV210(row.effectiveToBudget),
            direction:String(row.budgetDirectionV210 || ''),
            trackingBase:finiteBudgetNumberV210(row.trackingBaseBudgetV210),
            status:budgetStatusV167(row).label,
            isOpen:!!row.isOpen,
            stopReason:String(row.trackingStopReasonV210 || ''),
            stoppedAt:row.trackingStopAtMsV210
                ? new Date(Number(row.trackingStopAtMsV210)).toISOString()
                : ''
        }));
    };

    window.openManualBudgetEventV172 = openManualBudgetEventModalV172;
    window.editManualBudgetEventV172 = function(eventId) {
        openManualBudgetEventModalV172(eventId);
    };
    window.deleteManualBudgetEventV172 = deleteManualBudgetEventV172;

    (function injectBudgetRangeFilterStyleV241(){
        if (document.getElementById('budget-range-filter-style-v241')) return;
        const style=document.createElement('style');
        style.id='budget-range-filter-style-v241';
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    })();

    function renderMetaBudgetPerformanceV167() {
        ensureBudgetTrackingStyleV210();
        ensurePerformanceBudgetButtonV167();
        const panel = ensurePerformanceBudgetPanelV167();
        if (!panel) return;

        const active = META_LIVE_DATA_SCOPE === 'budget-change';
        panel.style.display = active ? 'block' : 'none';

        const performanceTab = document.getElementById('tab-performance');
        const dataCard = performanceTab && performanceTab.querySelector(':scope > .ads-data-card');
        const normalTable = dataCard && dataCard.querySelector(':scope > .table-responsive');
        const searchArea = document.getElementById('meta-live-search-area');
        const dataCardTitle = dataCard && dataCard.querySelector('.ads-title-with-scope-tabs > h2');
        const topAnalytics = performanceTab && performanceTab.querySelector('.ads-performance-insights-v260');

        if (performanceTab) {
            performanceTab.classList.toggle('performance-budget-mode-v167',active);
        }

        if (normalTable) {
            // V262: V261 có display:block!important cho bảng full-width,
            // nên phải dùng important mới ẩn thật khi vào Theo dõi ngân sách.
            normalTable.style.setProperty(
                'display',
                active ? 'none' : 'block',
                'important'
            );
        }

        if (topAnalytics) {
            topAnalytics.style.setProperty(
                'display',
                active ? 'none' : 'flex',
                'important'
            );
        }

        if (dataCardTitle) {
            dataCardTitle.textContent = active
                ? 'Theo dõi ngân sách'
                : 'Danh sách bài quảng cáo';
        }

        if (searchArea) searchArea.style.display = active ? 'none' : '';

        setBudgetChartTitleV167('performance',active);

        document.querySelectorAll(
            '#ads-analysis-result [data-ads-scope-target="performance"][data-ads-scope-value]'
        ).forEach(button => {
            button.classList.toggle(
                'active',
                button.getAttribute('data-ads-scope-value') === META_LIVE_DATA_SCOPE
            );
        });

        if (!active) return;

        const rows = state.loadedAt ? (Array.isArray(state.rows) ? state.rows : []) : buildBudgetPerformanceRowsV166();

        let body = '';
        if (!rows.length) {
            body = `
                <tr>
                    <td colspan="10" class="budget-v167-empty">
                        ${state.allRows.length
                            ? 'Không có stage ngân sách giao với khoảng ngày đang lọc.'
                            : 'Chưa có sự kiện thay đổi ngân sách. Các lần tăng/giảm mới sẽ được ghi nhận khi Meta Live đồng bộ.'}
                    </td>
                </tr>
            `;
        } else {
            body = rows.map(row => {
                const budget = getBudgetChangeDisplayV167(row);
                const status = budgetStatusV167(row);

                const spendDelta = renderMetricDeltaV167(
                    row.spend,
                    row.beforeSpend,
                    { beforeAvailable:row.beforeAvailable }
                );

                const messageDelta = renderMetricDeltaV167(
                    row.messages,
                    row.beforeMessages,
                    { beforeAvailable:row.beforeAvailable, showPercent:false }
                );

                const purchaseDelta = renderMetricDeltaV167(
                    row.purchases,
                    row.beforePurchases,
                    { beforeAvailable:row.beforeAvailable, showPercent:false }
                );

                const crDelta = renderMetricDeltaV167(
                    row.cr,
                    row.beforeCr,
                    {
                        beforeAvailable:row.beforeAvailable,
                        percentUnit:true,
                        decimals:1
                    }
                );

                const ctrDelta = renderMetricDeltaV167(
                    row.ctr,
                    row.beforeCtr,
                    {
                        beforeAvailable:row.beforeAvailable,
                        percentUnit:true,
                        decimals:2
                    }
                );

                const priceMessageDelta = renderMetricDeltaV167(
                    row.costPerMessage,
                    row.beforeCostPerMessage,
                    {
                        beforeAvailable:row.beforeAvailable,
                        lowerBetter:true
                    }
                );

                const cpaDelta = renderMetricDeltaV167(
                    row.cpa,
                    row.beforeCpa,
                    {
                        beforeAvailable:row.beforeAvailable,
                        lowerBetter:true
                    }
                );

                return `
                    <tr>
                        <td class="text-left">
                            <div class="budget-v167-primary">${escapeHtml(row.campaignName || row.employee || '-')}</div>
                            ${row.employee ? `<div class="budget-v167-sub">${escapeHtml(row.employee)}</div>` : ''}
                        </td>
                        <td class="text-left budget-v167-group-cell">
                            <div class="budget-v167-primary">${escapeHtml(row.adName || row.fullName || '-')}</div>
                            <div class="budget-v167-sub">${escapeHtml((row.skus || []).join(', ') || 'Không có SKU')}</div>
                        </td>
                        <td class="text-center budget-v167-nowrap">
                            ${escapeHtml(formatDateTimeV166(row.changedAt))}
                            ${budgetChangedAtNoteV234(row) ? `<div class="budget-v167-sub">${escapeHtml(budgetChangedAtNoteV234(row))}</div>` : ''}
                        </td>
                        <td class="text-right budget-v167-nowrap">
                            <div class="budget-v167-primary">${escapeHtml(budget.main)}</div>
                            <div class="budget-v167-sub" style="color:${budget.color};font-weight:700;">${escapeHtml(budget.delta)}</div>
                        </td>
                        <td class="text-center">
                            ${budgetStatusHtmlV210(row,status)}
                            ${row.isManual ? `
                                <div class="manual-budget-row-actions-v172">
                                    <span class="manual-budget-badge-v172">Thủ công</span>
                                    <button type="button" onclick="window.editManualBudgetEventV172('${escapeHtml(row.eventId)}')">Sửa</button>
                                    <button type="button" class="is-delete" onclick="window.deleteManualBudgetEventV172('${escapeHtml(row.eventId)}')">Xóa</button>
                                </div>
                            ` : `
                                <div class="manual-budget-row-actions-v172">
                                    <span class="auto-budget-badge-v239">Tự động</span>
                                </div>
                            `}
                            ${status.note ? `<div class="budget-v167-sub budget-v167-status-note">${escapeHtml(status.note)}</div>` : ''}
                        </td>
                        <td class="text-right">
                            <div class="budget-v167-primary">
                                ${row.beforeAvailable
                                    ? formatMetaLiveInteger(row.beforeSpend) + ' ₫'
                                    : '—'}
                            </div>
                            <div class="budget-v167-sub">
                                ${row.beforeSource === 'manual_baseline'
                                    ? 'Baseline từ đầu kỳ → lúc đổi'
                                    : (row.beforeAvailable ? 'Giai đoạn liền trước' : 'Chưa có dữ liệu trước')}
                            </div>
                        </td>

                        <td class="text-right">
                            <div class="budget-v167-primary">
                                ${row.costAvailable
                                    ? formatMetaLiveInteger(row.spend) + ' ₫'
                                    : '—'}
                            </div>

                            ${row.costAvailable
                                ? spendDelta
                                : `
                                    <div class="budget-v167-sub" style="color:#b42318;">
                                        ${row.isManualFixedTransitionV213
                                            ? 'Mốc chuyển ngân sách thủ công'
                                            : (row.currentBudgetMatchMode === 'unresolved'
                                                ? 'Chưa khớp nhóm Meta hiện tại'
                                                : 'Chưa có chi lũy kế hiện tại')}
                                    </div>
                                `}
                        </td>
                        <td class="text-center">
                            <div class="budget-v167-primary">
                                ${row.metaAfter && row.metaAfter.available
                                    ? `
                                        <span style="color:#e36414;">${formatMetaLiveInteger(row.messages)}</span>
                                        /
                                        <span style="color:#137333;">${formatMetaLiveInteger(row.purchases)}</span>
                                    `
                                    : '—'}
                            </div>
                            <div class="budget-v167-double-delta">
                                ${messageDelta}
                                <span>tin</span>
                                ${purchaseDelta}
                                <span>mua</span>
                            </div>
                        </td>
                        <td class="text-center">
                            <div class="budget-v167-primary">${row.metaAfter && row.metaAfter.available ? Number(row.cr || 0).toFixed(1) + '%' : '—'}</div>
                            ${crDelta}
                        </td>
                        <td class="text-center">
                            <div class="budget-v167-primary">${row.metaAfter && row.metaAfter.available ? Number(row.ctr || 0).toFixed(2) + '%' : '—'}</div>
                            ${ctrDelta}
                        </td>
                        <td class="text-right">
                            <div class="budget-v167-price-pair">
                                <div>
                                    <span>Giá tin</span>
                                    <b>${row.costPerMessage > 0 ? formatMetaLiveInteger(row.costPerMessage) + ' ₫' : '—'}</b>
                                    ${priceMessageDelta}
                                </div>
                                <div>
                                    <span>CPA</span>
                                    <b>${row.cpa > 0 ? formatMetaLiveInteger(row.cpa) + ' ₫' : '—'}</b>
                                    ${cpaDelta}
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        panel.innerHTML = `
            <div class="budget-v172-manual-toolbar">
                <div class="budget-v167-inline-note">
                    <b>Theo dõi ngân sách:</b>
                    số chính là giai đoạn hiện tại/sau đổi; dòng nhỏ bên dưới là chênh lệch so với giai đoạn ngân sách liền trước.
                </div>
                <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                    <button
                        type="button"
                        class="btn-export-excel budget-v172-add-manual"
                        onclick="window.openManualBudgetEventV172()"
                    >+ Thêm thay đổi NS</button>
                </div>
            </div>
            ${budgetRangeFilterHtmlV241('performance')}
            ${budgetRangeSummaryHtmlV242()}
            <div class="table-responsive budget-v167-table-wrap">
                <table class="ads-table budget-v167-meta-table">
                    <thead>
                        <tr>
                            <th class="text-left">Tên chiến dịch</th>
                            <th class="text-left">Tên nhóm quảng cáo</th>
                            <th>Thời điểm đổi NS</th>
                            <th class="text-right">Ngân sách</th>
                            <th>Trạng thái</th>
                            <th class="text-right">Chi Meta trước đổi</th>
                            <th class="text-right">Chi Meta sau đổi</th>
                            <th>Tin / Mua sau đổi</th>
                            <th>Tỷ lệ M/T</th>
                            <th>CTR</th>
                            <th class="text-right">Giá tin / CPA</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;

        requestAnimationFrame(() => {
            bindBudgetGroupedSearchV243('performance');
            drawBudgetMetaChartV167(rows);
        });
    }

    function ensureFinanceBudgetButtonV166() {
        const tabs = document.querySelector(
            '#ads-analysis-result #tab-finance .ads-inline-scope-tabs'
        );
        if (!tabs) return;

        let button = tabs.querySelector('[data-ads-scope-value="budget-change"]');
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'ads-inline-scope-tab';
            button.setAttribute('data-ads-scope-target','finance');
            button.setAttribute('data-ads-scope-value','budget-change');
            button.textContent = 'Theo dõi ngân sách';
            button.onclick = function(){
                window.changeFinanceBudgetScopeV166();
            };
            tabs.appendChild(button);
        }
    }

    function ensureBudgetPanelV166() {
        const card = document.querySelector(
            '#ads-analysis-result #tab-finance .ads-data-card'
        );
        if (!card) return null;

        let panel = document.getElementById('finance-budget-performance-v166');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'finance-budget-performance-v166';
            panel.className = 'finance-budget-performance-v166';
            panel.style.display = 'none';

            const normalTable = card.querySelector(':scope > .table-responsive');
            if (normalTable) card.insertBefore(panel, normalTable);
            else card.appendChild(panel);
        }
        return panel;
    }

    function renderBudgetPerformanceV166() {
        ensureBudgetTrackingStyleV210();
        ensureFinanceBudgetButtonV166();
        const panel = ensureBudgetPanelV166();
        if (!panel) return;

        const active = FINANCE_DATA_SCOPE === 'budget-change';
        panel.style.display = active ? 'block' : 'none';

        const financeTab = document.getElementById('tab-finance');
        const dataCard = financeTab && financeTab.querySelector(':scope > .ads-data-card');
        const normalTable = dataCard && dataCard.querySelector(':scope > .table-responsive');
        const exportHistory = document.getElementById('export-history-container');
        const actions = dataCard && dataCard.querySelector('.ads-table-actions');

        if (financeTab) {
            financeTab.classList.toggle('finance-budget-mode-v166',active);
            financeTab.classList.toggle('finance-budget-mode-v167',active);
        }

        if (normalTable) normalTable.style.display = active ? 'none' : '';
        if (exportHistory) exportHistory.style.display = 'none';
        if (actions) actions.style.display = active ? 'none' : '';

        setBudgetChartTitleV167('finance',active);

        document.querySelectorAll(
            '#ads-analysis-result [data-ads-scope-target="finance"][data-ads-scope-value]'
        ).forEach(button => {
            const value = button.getAttribute('data-ads-scope-value');
            button.classList.toggle('active', value === FINANCE_DATA_SCOPE);
        });

        if (!active) return;

        const rows = state.loadedAt ? (Array.isArray(state.rows) ? state.rows : []) : buildBudgetPerformanceRowsV166();

        let body = '';

        if (!rows.length) {
            body = `
                <tr>
                    <td colspan="12" class="budget-v167-empty">
                        ${state.allRows.length
                            ? 'Không có stage ngân sách giao với khoảng ngày đang lọc.'
                            : 'Chưa có sự kiện thay đổi ngân sách. Các lần tăng/giảm mới sẽ được ghi nhận khi Meta Live đồng bộ.'}
                    </td>
                </tr>
            `;
        } else {
            body = rows.map(row => {
                const budget = getBudgetChangeDisplayV167(row);
                const status = budgetStatusV167(row);
                const roasColor = Number(row.roas || 0) >= 5
                    ? '#137333'
                    : (Number(row.roas || 0) < 2 ? '#c5221f' : '#a15c00');

                const deltaColor = !row.beforeAvailable
                    ? '#94a3b8'
                    : (row.roasDelta >= 0 ? '#137333' : '#c5221f');

                return `
                    <tr>
                        <td class="text-left">
                            <div class="budget-v167-primary">${escapeHtml(row.campaignName || row.employee || '-')}</div>
                            ${row.employee ? `<div class="budget-v167-sub">${escapeHtml(row.employee)}</div>` : ''}
                        </td>

                        <td class="text-left budget-v167-group-cell">
                            <div class="budget-v167-primary">${escapeHtml(row.adName || row.fullName || '-')}</div>
                            <div class="budget-v167-sub">${escapeHtml((row.skus || []).join(', ') || 'Không có SKU')}</div>
                        </td>

                        <td class="text-center budget-v167-nowrap">
                            ${escapeHtml(formatDateTimeV166(row.changedAt))}
                            ${budgetChangedAtNoteV234(row) ? `<div class="budget-v167-sub">${escapeHtml(budgetChangedAtNoteV234(row))}</div>` : ''}
                        </td>

                        <td class="text-right budget-v167-nowrap">
                            <div class="budget-v167-primary">${escapeHtml(budget.main)}</div>
                            <div class="budget-v167-sub" style="color:${budget.color};font-weight:700;">${escapeHtml(budget.delta)}</div>
                        </td>

                        <td class="text-right">
                            <div class="budget-v167-primary">
                                ${row.beforeAvailable ? formatMetaLiveInteger(row.beforeTotalAdsCost) + ' ₫' : '—'}
                            </div>
                            ${row.beforeAvailable
                                ? `
                                    <div class="budget-v167-sub">
                                        Meta ${formatMetaLiveInteger(row.beforeSpend)} ₫ + VAT 10%
                                        ${row.beforeSource === 'manual_baseline'
                                            ? ' • baseline'
                                            : ''}
                                    </div>
                                `
                                : '<div class="budget-v167-sub">Chưa có dữ liệu trước</div>'}
                        </td>

                        <td class="text-right">
                            <div class="budget-v167-primary" style="color:#137333;">
                                ${row.beforeAvailable ? formatMetaLiveInteger(row.beforeRevenue) + ' ₫' : '—'}
                            </div>
                        </td>

                        <td class="text-right">
                            <div class="budget-v167-primary">
                                ${row.costAvailable
                                    ? formatMetaLiveInteger(row.totalAdsCost) + ' ₫'
                                    : '—'}
                            </div>

                            ${row.costAvailable
                                ? `
                                    <div class="budget-v167-sub">
                                        Meta ${formatMetaLiveInteger(row.spend)} ₫ + VAT 10%
                                        ${(row.costBoundarySourceV264 === 'next_stage_baseline' || row.costBoundarySourceV287)
                                            ? ' • khóa tại mốc kế tiếp'
                                            : ''}
                                    </div>
                                `
                                : `
                                    <div class="budget-v167-sub" style="color:#b42318;">
                                        ${row.isManualFixedTransitionV213
                                            ? 'Mốc chuyển ngân sách thủ công'
                                            : (row.currentBudgetMatchMode === 'unresolved'
                                                ? 'Chưa khớp nhóm Meta hiện tại'
                                                : 'Chưa có chi lũy kế hiện tại')}
                                    </div>
                                `}
                        </td>

                        <td class="text-right">
                            <div class="budget-v167-primary" style="color:#137333;">
                                ${formatMetaLiveInteger(row.revenue)} ₫
                            </div>
                            <div class="budget-v167-sub">${formatMetaLiveInteger(row.matchedOrderCount)} đơn khớp</div>
                        </td>

                        <td class="text-center">
                            <div class="budget-v167-roas">
                                ${row.beforeAvailable ? Number(row.beforeRoas || 0).toFixed(2) + 'x' : '—'}
                            </div>
                        </td>

                        <td class="text-center">
                            <div class="budget-v167-roas" style="color:${roasColor};">
                                ${row.costAvailable ? Number(row.roas || 0).toFixed(2) + 'x' : '—'}
                            </div>
                        </td>

                        <td class="text-center">
                            <div class="budget-v167-roas" style="color:${deltaColor};">
                                ${row.beforeAvailable && row.costAvailable
                                    ? `${row.roasDelta >= 0 ? '+' : ''}${Number(row.roasDelta || 0).toFixed(2)}x`
                                    : '—'}
                            </div>
                        </td>

                        <td class="text-center">
                            ${budgetStatusHtmlV210(row,status)}
                            ${row.isManual ? `
                                <div class="manual-budget-row-actions-v172">
                                    <span class="manual-budget-badge-v172">Thủ công</span>
                                    <button type="button" onclick="window.editManualBudgetEventV172('${escapeHtml(row.eventId)}')">Sửa</button>
                                    <button type="button" class="is-delete" onclick="window.deleteManualBudgetEventV172('${escapeHtml(row.eventId)}')">Xóa</button>
                                </div>
                            ` : `
                                <div class="manual-budget-row-actions-v172">
                                    <span class="auto-budget-badge-v239">Tự động</span>
                                </div>
                            `}
                            <div class="budget-v167-sub budget-v167-status-note">
                                ${status.note ? `${escapeHtml(status.note)}<br>` : ''}
                                ${row.revenueQuality ? escapeHtml(row.revenueQuality || '') : ''}
                                ${row.metricQuality === 'Thiếu baseline chi phí'
                                    ? '<br><span style="color:#c5221f;font-weight:700;">Thiếu baseline chi phí</span>'
                                    : ''}
                                ${row.metricQuality === 'Baseline Meta tự động theo ngày'
                                    ? '<br><span style="color:#174ea6;font-weight:700;">Baseline tự động theo ngày</span>'
                                    : ''}
                                ${row.metricQuality === 'Thiếu thời điểm đổi tiếp theo'
                                    ? '<br><span style="color:#c5221f;font-weight:700;">Ngân sách hiện tại đã khác nhưng chưa xác định được lúc đổi tiếp theo — cần nhập thời gian hoặc chờ mốc tự động thật.</span>'
                                    : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        panel.innerHTML = `
            <div class="budget-v166-head budget-v167-head">
                <div>
                    <span class="ads-section-kicker">BUDGET PERFORMANCE</span>
                    <h3>Hiệu quả tài chính trước / sau thay đổi ngân sách</h3>
                    <p>
                        “Trước đổi” ưu tiên giai đoạn ngân sách liền trước; nếu đây là mốc thủ công đầu tiên
                        thì dùng Chi Meta lũy kế baseline từ đầu kỳ đến lúc đổi. Chi phí Tài chính = Meta + VAT 10%.
                        Doanh thu lấy duy nhất từ Revenue Ledger dùng chung của Thống kê ROAS; hệ thống chống trùng theo Mã đơn và phân bổ duy nhất theo HÀNG ĐÃ GOM cùng chuẩn Meta Live.
                    </p>
                </div>
                <div class="budget-v166-actions">
                    <button type="button" class="btn-export-excel" onclick="window.openManualBudgetEventV172()">+ Thêm thay đổi NS</button>
                    <button type="button" class="btn-toggle-history" onclick="window.refreshBudgetPerformanceV166()">↻ Làm mới</button>
                    <button type="button" class="btn-export-excel" onclick="window.exportBudgetPerformanceV166()">⇩ Xuất Excel</button>
                </div>
            </div>
            ${budgetRangeFilterHtmlV241('finance')}
            ${budgetRangeSummaryHtmlV242()}

            <div class="table-responsive budget-v166-table-wrap budget-v167-table-wrap">
                <table class="ads-table budget-v167-finance-table">
                    <thead>
                        <tr>
                            <th class="text-left">Tên chiến dịch</th>
                            <th class="text-left">Tên nhóm quảng cáo</th>
                            <th>Thời điểm đổi NS</th>
                            <th class="text-right">Ngân sách</th>
                            <th class="text-right">Chi phí trước đổi</th>
                            <th class="text-right">Doanh thu trước khi đổi</th>
                            <th class="text-right">Chi phí sau đổi</th>
                            <th class="text-right">Doanh thu sau khi đổi</th>
                            <th>ROAS trước đổi</th>
                            <th>ROAS sau đổi</th>
                            <th>ROAS chênh lệch</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;

        requestAnimationFrame(() => {
            bindBudgetGroupedSearchV243('finance');
            drawBudgetFinanceChartV167(rows);
        });
    }

    async function loadBudgetPerformanceV166() {
        if (!db) db = getDatabase();
        if (!db) {
            state.error = 'Firebase Database chưa sẵn sàng.';
            renderBudgetPerformanceV166();
            return [];
        }

        state.loading = true;
        state.error = '';
        const previousBudgetCompanyV199 = String(state.company || '');
        state.company = String(CURRENT_COMPANY || 'NNV');
        if (previousBudgetCompanyV199 && previousBudgetCompanyV199 !== state.company) {
            state.filterGroupV243 = '';
            state.filterFrom = '';
            state.filterTo = '';
            state.rangeMetricCache = {};
        }

        // V200: KHÔNG xóa reference Meta đang tốt khi đổi tab / tải lại module.
        // loadBudgetReferenceMetaV198() sẽ tự thay thế khi có snapshot hợp lệ mới.

        // Auto events vẫn đọc từ node cũ để không phá lịch sử đã có.
        const autoEventPath = `${META_LIVE_SNAPSHOT_ROOT}/${state.company}/${META_BUDGET_PERFORMANCE_NODE_V166}`;

        // V182: manual events đọc từ node riêng có RBAC rõ ràng.
        const manualEventPath = `${META_MANUAL_BUDGET_ROOT_V182}/${state.company}`;
        const revenuePath = `${ROAS_REVENUE_LEDGER_ROOT_V166}/${state.company}`;

        try {
            const [autoEventSnap,manualEventSnap,revenueSnap] = await Promise.all([
                // Nếu rule cũ không cho đọc node auto legacy, trả null thay vì làm hỏng cả tab.
                db.ref(autoEventPath).once('value').catch(error => {
                    console.warn('Budget auto legacy read V182:', error && error.message ? error.message : error);
                    return { val:() => null };
                }),
                db.ref(manualEventPath).once('value'),
                db.ref(revenuePath).once('value')
            ]);

            const autoEvents = flattenBudgetEventsV166(
                autoEventSnap && typeof autoEventSnap.val === 'function'
                    ? (autoEventSnap.val() || {})
                    : {}
            )
                .map(normalizeAutoBudgetEventTimeV234)
                .filter(event => !isInvalidAutoZeroBudgetEventV226(event));

            const manualRootV210 = manualEventSnap && typeof manualEventSnap.val === 'function'
                ? (manualEventSnap.val() || {})
                : {};

            state.trackingControls = normalizeBudgetTrackingControlsV210(
                manualRootV210._tracking_controls || {}
            );

            const manualEventsRootV210 = { ...manualRootV210 };
            delete manualEventsRootV210._tracking_controls;

            const manualEvents = flattenBudgetEventsV166(
                manualEventsRootV210
            ).map(event => ({
                ...event,
                isManual:true,
                source:String(event.source || 'manual_v172')
            }));

            // Gộp auto + manual; eventId là khóa audit chính.
            const mergedMap = new Map();
            [...autoEvents,...manualEvents].forEach(event => {
                if (!event) return;
                const key = String(
                    event.eventId ||
                    `${event.entityKey || event.adsetId || event.fullName || ''}|${event.changedAtMs || event.changedAt || ''}`
                );
                mergedMap.set(key,event);
            });

            state.events = Array.from(mergedMap.values());

            const ledger = flattenRevenueLedgerV166(revenueSnap.val() || {});
            state.ledger = ledger.rows;
            state.revenueMaxOrderAtMs = ledger.maxOrderAtMs;
            state.revenueLastUploadAt = ledger.latestUploadAt;

            // V198: tải snapshot Meta reference độc lập với bộ lọc chung.
            await loadBudgetReferenceMetaV198();

            // V210: đối chiếu ngân sách Meta hiện tại với mức nền của phiên tăng.
            // Nếu đã giảm về mức nền thì tự đóng và lưu mốc dừng để không bị mở lại về sau.
            const reconciledRowsV210 = buildBudgetPerformanceRowsV166();
            await persistAutoBudgetTrackingStopsV210(reconciledRowsV210);
            await applyBudgetViewRangeMetricsV241();

            state.loadedAt = Date.now();
            state.loading = false;

            renderBudgetPerformanceV166();
            renderMetaBudgetPerformanceV167();
            return state.rows;
        } catch(error) {
            state.loading = false;
            state.error = error && error.message ? error.message : String(error || '');
            console.warn('Budget Performance V182:', state.error);

            const panel = ensureBudgetPanelV166();
            if (panel && FINANCE_DATA_SCOPE === 'budget-change') {
                panel.innerHTML = `
                    <div style="padding:24px;border:1px solid #f4c7c3;border-radius:12px;background:#fff5f4;color:#b42318;">
                        Không đọc được dữ liệu Theo dõi ngân sách: ${escapeHtml(state.error)}
                    </div>
                `;
            }

            const performancePanel = ensurePerformanceBudgetPanelV167();
            if (performancePanel && META_LIVE_DATA_SCOPE === 'budget-change') {
                performancePanel.innerHTML = `
                    <div style="padding:24px;border:1px solid #f4c7c3;border-radius:12px;background:#fff5f4;color:#b42318;">
                        Không đọc được dữ liệu Theo dõi ngân sách: ${escapeHtml(state.error)}
                    </div>
                `;
            }

            return [];
        }
    }

    function styleBudgetExportSheetV166(ws, aoa) {
        if (!ws || !aoa || !aoa.length) return;

        const border = {
            top:{style:'thin',color:{rgb:'D9E2EC'}},
            bottom:{style:'thin',color:{rgb:'D9E2EC'}},
            left:{style:'thin',color:{rgb:'D9E2EC'}},
            right:{style:'thin',color:{rgb:'D9E2EC'}}
        };

        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let c = range.s.c; c <= range.e.c; c++) {
            const ref = XLSX.utils.encode_cell({r:0,c});
            if (!ws[ref]) continue;
            ws[ref].s = {
                font:{name:'Arial',bold:true,color:{rgb:'FFFFFF'},sz:11},
                fill:{patternType:'solid',fgColor:{rgb:'1F6FFF'}},
                alignment:{horizontal:'center',vertical:'center',wrapText:true},
                border
            };
        }

        for (let r = 1; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const ref = XLSX.utils.encode_cell({r,c});
                if (!ws[ref]) ws[ref] = {t:'s',v:''};
                ws[ref].s = {
                    font:{name:'Arial',sz:10,color:{rgb:'263D53'}},
                    alignment:{vertical:'center',wrapText:true},
                    border
                };
            }
        }
    }

    window.exportBudgetPerformanceV166 = function() {
        if (window.EXCEL_STYLE_LOADED !== true || typeof XLSX === 'undefined') {
            showToast('Thư viện Excel chưa sẵn sàng.', 'warning');
            return;
        }

        const rows = buildBudgetPerformanceRowsV166();
        if (!rows.length) {
            showToast('Chưa có dữ liệu Theo dõi ngân sách để xuất.', 'warning');
            return;
        }

        // Sheet chính: đúng 12 cột theo cấu trúc người dùng chốt.
        const mainHeader = [
            'Tên chiến dịch',
            'Tên nhóm quảng cáo',
            'Thời điểm đổi NS',
            'Ngân sách',
            'Chi phí trước đổi',
            'Doanh thu trước khi đổi',
            'Chi phí sau đổi',
            'Doanh thu sau khi đổi',
            'ROAS trước đổi',
            'ROAS sau đổi',
            'ROAS chênh lệch',
            'Trạng thái'
        ];

        const mainAoa = [mainHeader].concat(rows.map(row => {
            const budget = getBudgetChangeDisplayV167(row);
            return [
                row.campaignName || row.employee || '',
                row.adName || row.fullName || '',
                formatDateTimeV166(row.changedAt),
                `${budget.main} | ${budget.delta}`,
                row.beforeAvailable ? Number(row.beforeTotalAdsCost || 0) : '',
                row.beforeAvailable ? Number(row.beforeRevenue || 0) : '',
                row.costAvailable ? Number(row.totalAdsCost || 0) : '',
                Number(row.revenue || 0),
                row.beforeAvailable ? Number(row.beforeRoas || 0) : '',
                row.costAvailable ? Number(row.roas || 0) : '',
                row.beforeAvailable ? Number(row.roasDelta || 0) : '',
                budgetStatusV167(row).label
            ];
        }));

        const historyHeader = [
            'Công ty','Adset ID','Chiến dịch','Nhân viên','Nhóm quảng cáo','SKU',
            'Thời điểm đổi','NS trước','NS sau','Chênh lệch','Hướng',
            'Loại NS trước','Loại NS sau','Baseline From','Baseline To'
        ];

        const historyAoa = [historyHeader].concat(
            state.events
                .slice()
                .sort((a,b) => Number(b.changedAtMs || 0) - Number(a.changedAtMs || 0))
                .map(event => [
                    event.company || '',
                    event.adsetId || '',
                    event.campaignName || '',
                    event.employee || '',
                    event.adName || '',
                    (event.skus || []).join(', '),
                    formatDateTimeV166(event.changedAt),
                    Number(event.fromBudget || 0),
                    Number(event.toBudget || 0),
                    Number(event.delta || 0),
                    event.direction || '',
                    event.fromType || '',
                    event.toType || '',
                    event.baselinePeriodFrom || '',
                    event.baselinePeriodTo || ''
                ])
        );

        const usedFingerprints = new Set();
        rows.forEach(row => {
            (row.matchedLedger || []).forEach(order => {
                usedFingerprints.add(String(order.fingerprint || ''));
            });
        });

        const revenueHeader = [
            'Fingerprint','Công ty','Ngày giờ đơn','Nhân viên','SKU',
            'Khách hàng','Doanh thu','Page','Quảng cáo','File nguồn','Upload ID'
        ];

        const revenueAoa = [revenueHeader].concat(
            state.ledger
                .filter(order => usedFingerprints.has(String(order.fingerprint || '')))
                .sort((a,b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0))
                .map(order => [
                    order.fingerprint || '',
                    order.company || '',
                    order.createdAtDisplay || formatDateTimeV166(order.createdAtIso),
                    order.employee || '',
                    (order.skus || []).join(', '),
                    order.customer || '',
                    Number(order.amount || 0),
                    order.page || '',
                    order.adText || '',
                    order.sourceFileName || '',
                    order.sourceUploadId || ''
                ])
        );

        const wb = XLSX.utils.book_new();
        const wsMain = XLSX.utils.aoa_to_sheet(mainAoa);
        const wsHistory = XLSX.utils.aoa_to_sheet(historyAoa);
        const wsRevenue = XLSX.utils.aoa_to_sheet(revenueAoa);

        styleBudgetExportSheetV166(wsMain,mainAoa);
        styleBudgetExportSheetV166(wsHistory,historyAoa);
        styleBudgetExportSheetV166(wsRevenue,revenueAoa);

        wsMain['!cols'] = [
            {wch:22},{wch:42},{wch:20},{wch:28},
            {wch:19},{wch:22},{wch:18},{wch:22},
            {wch:16},{wch:15},{wch:18},{wch:18}
        ];

        // Định dạng tiền/ROAS sheet chính.
        for (let r = 1; r < mainAoa.length; r++) {
            [4,5,6,7].forEach(c => {
                const ref = XLSX.utils.encode_cell({r:r,c:c});
                if (wsMain[ref] && typeof wsMain[ref].v === 'number') {
                    wsMain[ref].z = '#,##0';
                }
            });
            [8,9,10].forEach(c => {
                const ref = XLSX.utils.encode_cell({r:r,c:c});
                if (wsMain[ref] && typeof wsMain[ref].v === 'number') {
                    wsMain[ref].z = '0.00"x"';
                }
            });
        }

        XLSX.utils.book_append_sheet(wb,wsMain,'Sau doi ngan sach');
        XLSX.utils.book_append_sheet(wb,wsHistory,'Lich su thay doi NS');
        XLSX.utils.book_append_sheet(wb,wsRevenue,'Doanh thu doi chieu');

        const d = new Date();
        const fileName =
            `ROAS_SAU_DOI_NGAN_SACH_${CURRENT_COMPANY}_` +
            `${String(d.getDate()).padStart(2,'0')}.` +
            `${String(d.getMonth()+1).padStart(2,'0')}.` +
            `${d.getFullYear()}.xlsx`;

        XLSX.writeFile(wb,fileName,{bookType:'xlsx',compression:true});
        showToast(`Đã xuất ${fileName}`,'success');
    };

    window.refreshBudgetPerformanceV166 = function() {
        return loadBudgetPerformanceV166();
    };

    window.changeFinanceBudgetScopeV166 = function() {
        FINANCE_DATA_SCOPE = 'overview';
        return false;
    };

    window.changePerformanceBudgetScopeV167 = function() {
        META_LIVE_DATA_SCOPE = 'overview';
        syncAdsDataScopeTabs();
        applyFilters();
        if (typeof showToast === 'function') showToast('Theo dõi ngân sách đã ngưng sử dụng.', 'info');
        return false;
    };

    function wrapFinanceScopeV166() {
        if (
            window.__BUDGET_SCOPE_V166_WRAPPED__ ||
            typeof window.changeAdsDataScope !== 'function'
        ) return;

        window.__BUDGET_SCOPE_V166_WRAPPED__ = true;

        const original =
            window.changeAdsDataScope;

        window.changeAdsDataScope =
            function(target,scope) {
                if (scope === 'budget-change') {
                    if (target === 'finance') {
                        return window.changeFinanceBudgetScopeV166();
                    }

                    if (target === 'performance') {
                        return window.changePerformanceBudgetScopeV167();
                    }
                }

                /*
                 * V187:
                 * original() set scope + applyFilters().
                 * Ngay sau đó restore normal panel/table đồng bộ,
                 * không chờ setTimeout 20ms như trước.
                 */
                const result =
                    original.apply(
                        this,
                        arguments
                    );

                if (target === 'finance') {
                    renderBudgetPerformanceV166();
                    setBudgetChartTitleV167(
                        'finance',
                        false
                    );
                }

                if (target === 'performance') {
                    renderMetaBudgetPerformanceV167();
                    setBudgetChartTitleV167(
                        'performance',
                        false
                    );
                }

                if (
                    typeof window.__syncAdsLayoutV183 ===
                    'function'
                ) {
                    window.__syncAdsLayoutV183();
                }

                return result;
            };
    }

    function wrapCompanyChangeV166() {
        if (
            window.__BUDGET_COMPANY_V166_WRAPPED__ ||
            typeof window.changeCompany !== 'function'
        ) return;

        window.__BUDGET_COMPANY_V166_WRAPPED__ = true;
        const original = window.changeCompany;

        window.changeCompany = function(companyId) {
            const result = original.apply(this,arguments);

            if (
                FINANCE_DATA_SCOPE === 'budget-change' ||
                META_LIVE_DATA_SCOPE === 'budget-change'
            ) {
                setTimeout(() => {
                    renderBudgetPerformanceV166();
                    renderMetaBudgetPerformanceV167();
                    loadBudgetPerformanceV166();
                },180);
            }

            return result;
        };
    }

    function injectStyleV166() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }


    function injectStyleV167() {
        const STYLE_ID_V167 = 'ads-v167-budget-layout-style';
        const old = document.getElementById(STYLE_ID_V167);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID_V167;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    // V232 — khi quay lại tab có scope Theo dõi ngân sách, chart cũ có thể đã bị
    // chart của tab kia destroy vì hệ thống dùng chung window.myAdsChart.
    // Expose một redraw thuần RAM để switchAdsTab dựng lại đúng chart mà không gọi Meta thêm.
    window.redrawBudgetChartForActiveTabV232 = function(target) {
        if (target === 'performance') {
            renderMetaBudgetPerformanceV167();
            return true;
        }
        if (target === 'finance') {
            renderBudgetPerformanceV166();
            return true;
        }
        return false;
    };

    function applyV166() {
        injectStyleV166();
        injectStyleV167();

        ensureFinanceBudgetButtonV166();
        ensureBudgetPanelV166();

        ensurePerformanceBudgetButtonV167();
        ensurePerformanceBudgetPanelV167();

        wrapFinanceScopeV166();
        wrapCompanyChangeV166();

        renderBudgetPerformanceV166();
        renderMetaBudgetPerformanceV167();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV166,80);
    });

    function bootV166() {
        applyV166();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.budgetV166Observer) {
            root.dataset.budgetV166Observer = '1';
            observer.observe(root,{childList:true,subtree:true});
        }

        setTimeout(applyV166,200);
        setTimeout(applyV166,900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded',bootV166,{once:true});
    } else {
        bootV166();
    }
})();

/* =========================================================
   V168 MOBILE NAV FLOW + PERIOD COMPARISON FIX
   ========================================================= */
(function installAdsV168MobileAndCompareFix() {
    const STYLE_ID = 'ads-v168-mobile-compare-fix';

    function injectV168Style() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    function normalizeCompareUiV168() {
        const select = document.getElementById('ads-v158-compare-mode');
        if (!select) return;

        const wanted = [
            ['previous','Kỳ liền trước'],
            ['yesterday','Hôm qua'],
            ['week','Cùng kỳ tuần trước'],
            ['month','Cùng kỳ tháng trước'],
            ['custom','Tùy chọn']
        ];

        wanted.forEach(([value,label]) => {
            let option = select.querySelector(`option[value="${value}"]`);
            if (!option) {
                option = document.createElement('option');
                option.value = value;
                select.appendChild(option);
            }
            option.textContent = label;
        });

        Array.from(select.options).forEach(option => {
            if (!wanted.some(item => item[0] === option.value)) {
                option.remove();
            }
        });

        if (!wanted.some(item => item[0] === compareState.mode)) {
            compareState.mode = 'month';
            saveCompareModePreferenceV260('month');
        }

        select.value = compareState.mode;
    }

    function applyV168() {
        injectV168Style();
        normalizeCompareUiV168();

        if (typeof updateCompareNoteV158 === 'function') {
            updateCompareNoteV158();
        }
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV168,70);
    });

    function bootV168() {
        applyV168();

        const root = document.getElementById('page-ads') || document.body;
        if (root && !root.dataset.adsV168Observer) {
            root.dataset.adsV168Observer = '1';
            observer.observe(root,{
                childList:true,
                subtree:true
            });
        }

        setTimeout(applyV168,120);
        setTimeout(applyV168,550);
        setTimeout(applyV168,1400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            bootV168,
            {once:true}
        );
    } else {
        bootV168();
    }

    window.addEventListener('resize',() => {
        clearTimeout(timer);
        timer = setTimeout(applyV168,100);
    });
})();

/* =========================================================
   V169 — LAYOUT SCOPE FIX
   Chỉ "Theo dõi ngân sách" mới dùng:
   BẢNG FULL WIDTH Ở TRÊN -> BIỂU ĐỒ Ở DƯỚI.

   Tổng quan / Marketing:
   khôi phục layout chuẩn trước V167:
   DESKTOP = Biểu đồ trái + Bảng phải.
   MOBILE = dùng responsive bình thường, không ép budget layout.
   ========================================================= */
(function installAdsV169BudgetOnlyLayoutFix() {
    const STYLE_ID = 'ads-v169-budget-only-layout-fix';

    function injectStyleV169() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    function syncBudgetLayoutClassesV169() {
        const perf = document.getElementById('tab-performance');
        const fin = document.getElementById('tab-finance');

        if (perf) {
            const budget =
                typeof META_LIVE_DATA_SCOPE !== 'undefined' &&
                META_LIVE_DATA_SCOPE === 'budget-change';

            perf.classList.toggle(
                'performance-budget-mode-v167',
                budget
            );
        }

        if (fin) {
            const budget =
                typeof FINANCE_DATA_SCOPE !== 'undefined' &&
                FINANCE_DATA_SCOPE === 'budget-change';

            fin.classList.toggle(
                'finance-budget-mode-v167',
                budget
            );
            fin.classList.toggle(
                'finance-budget-mode-v166',
                budget
            );
        }
    }

    function applyV169() {
        injectStyleV169();
        syncBudgetLayoutClassesV169();
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV169, 65);
    });

    function bootV169() {
        applyV169();

        const root =
            document.getElementById('page-ads') ||
            document.body;

        if (root && !root.dataset.adsV169Observer) {
            root.dataset.adsV169Observer = '1';
            observer.observe(root, {
                childList:true,
                subtree:true
            });
        }

        setTimeout(applyV169, 120);
        setTimeout(applyV169, 500);
        setTimeout(applyV169, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            bootV169,
            { once:true }
        );
    } else {
        bootV169();
    }

    document.addEventListener('click', event => {
        const scopeButton =
            event.target &&
            event.target.closest
                ? event.target.closest(
                    '[data-ads-scope-target][data-ads-scope-value]'
                )
                : null;

        if (!scopeButton) return;

        [20, 100, 260].forEach(delay => {
            setTimeout(applyV169, delay);
        });
    });

    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(applyV169, 100);
    });
})();

/* =========================================================
   V170 — MARKETING PRODUCT CHART + ALWAYS-VISIBLE BUDGET TAB
          + META LIVE COUNTDOWN
   ========================================================= */
(function installAdsV170MarketingBudgetCountdownFix() {
    const STYLE_ID = 'ads-v170-marketing-budget-countdown-fix';

    let countdownTimerV170 = null;
    let metaStatusModeV170 = '';
    let metaStatusBaseMessageV170 = '';

    function injectStyleV170() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    function ensureBudgetButtonsV170() {
        const configs = [
            {
                target:'performance',
                selector:'#ads-analysis-result #tab-performance .ads-inline-scope-tabs',
                handler:() => {
                    if (typeof window.changePerformanceBudgetScopeV167 === 'function') {
                        window.changePerformanceBudgetScopeV167();
                    }
                }
            },
            {
                target:'finance',
                selector:'#ads-analysis-result #tab-finance .ads-inline-scope-tabs',
                handler:() => {
                    if (typeof window.changeFinanceBudgetScopeV166 === 'function') {
                        window.changeFinanceBudgetScopeV166();
                    }
                }
            }
        ];

        configs.forEach(config => {
            const tabs = document.querySelector(config.selector);
            if (!tabs) return;

            let button = tabs.querySelector(
                '[data-ads-scope-value="budget-change"]'
            );

            if (!button) {
                button = document.createElement('button');
                button.type = 'button';
                button.className = 'ads-inline-scope-tab';
                button.setAttribute('data-ads-scope-target',config.target);
                button.setAttribute('data-ads-scope-value','budget-change');
                button.textContent = 'Theo dõi ngân sách';
                tabs.appendChild(button);
            }

            if (
                !button.getAttribute('onclick') &&
                button.dataset.boundV170 !== '1'
            ) {
                button.dataset.boundV170 = '1';
                button.addEventListener('click',config.handler);
            }
        });
    }

    function getCountdownSecondsV170() {
        // V202: countdown 5 phút chỉ hiển thị khi khoảng đang xem có chứa hôm nay.
        // Khoảng đã kết thúc trước hôm nay (kể cả vẫn trong tháng hiện tại) dùng snapshot
        // đầu tiên và không refresh 5 phút; tháng đã đóng dùng lịch hậu kiểm 2 lần/50 giờ.
        try {
            if (
                typeof getMetaRefreshPolicyV202 === 'function' &&
                typeof META_LIVE_ACTIVE_CONTEXT !== 'undefined' &&
                META_LIVE_ACTIVE_CONTEXT
            ) {
                const historicalState = getMetaRefreshPolicyV202(
                    META_LIVE_ACTIVE_CONTEXT,
                    typeof META_LIVE_CURRENT_SNAPSHOT !== 'undefined'
                        ? META_LIVE_CURRENT_SNAPSHOT
                        : null
                );

                if (
                    historicalState &&
                    (historicalState.historicalMonth || historicalState.pastRangeInOpenMonth)
                ) {
                    return null;
                }
            }
        } catch (error) {}

        let checkedAt = 0;

        try {
            checkedAt = Number(
                (typeof META_LIVE_STATE !== 'undefined' &&
                    META_LIVE_STATE &&
                    META_LIVE_STATE.checkedAt) ||
                (typeof META_LIVE_CURRENT_SNAPSHOT !== 'undefined' &&
                    META_LIVE_CURRENT_SNAPSHOT &&
                    (
                        META_LIVE_CURRENT_SNAPSHOT.checkedAt ||
                        META_LIVE_CURRENT_SNAPSHOT.updatedAt
                    )) ||
                0
            );
        } catch (error) {}

        if (!checkedAt) return null;

        let now = Date.now();

        try {
            if (typeof getMetaLiveFirebaseNow === 'function') {
                now = Number(getMetaLiveFirebaseNow()) || now;
            }
        } catch (error) {}

        const interval =
            typeof META_LIVE_REFRESH_INTERVAL_MS !== 'undefined'
                ? Number(META_LIVE_REFRESH_INTERVAL_MS || 300000)
                : 300000;

        // V171: cho phép số âm để biết đã trễ bao nhiêu giây.
        // Ví dụ -4 nghĩa là đã quá lịch đồng bộ 4 giây.
        return Math.min(
            Math.ceil(interval / 1000),
            Math.ceil((checkedAt + interval - now) / 1000)
        );
    }

    function renderCountdownV170() {
        // V302: status không còn gắn số giây countdown.
        if (metaStatusModeV170 !== 'success') return;
        const textEl = document.getElementById('meta-live-status-text');
        if (!textEl) return;
        textEl.textContent = metaStatusBaseMessageV170;
    }

    function startCountdownV170() {
        // V302: tắt timer countdown legacy.
        if (countdownTimerV170) {
            clearInterval(countdownTimerV170);
            countdownTimerV170 = null;
        }
        renderCountdownV170();
    }

    function wrapMetaStatusV170() {
        if (
            window.__META_STATUS_COUNTDOWN_V170_WRAPPED__ ||
            typeof updateMetaLiveStatus !== 'function'
        ) return;

        window.__META_STATUS_COUNTDOWN_V170_WRAPPED__ = true;

        const original = updateMetaLiveStatus;

        updateMetaLiveStatus = function(mode,message) {
            metaStatusModeV170 = String(mode || '');
            metaStatusBaseMessageV170 = String(
                message || 'Meta Live'
            ).replace(/\s*•\s*\+?\d+s\s*$/i,'');

            const result = original.apply(this,arguments);

            if (metaStatusModeV170 === 'success') {
                startCountdownV170();
                renderCountdownV170();
            }

            return result;
        };
    }

    function recoverCurrentStatusV170() {
        const el = document.getElementById('meta-live-status-text');
        if (!el) return;

        const current = String(el.textContent || '').trim();

        if (
            /^Meta Live\s*•/i.test(current) &&
            !metaStatusBaseMessageV170
        ) {
            metaStatusBaseMessageV170 = current.replace(
                /\s*•\s*\+?\d+s\s*$/i,
                ''
            );
            metaStatusModeV170 = 'success';
            startCountdownV170();
            renderCountdownV170();
        }
    }

    function applyV170() {
        injectStyleV170();
        ensureBudgetButtonsV170();
        wrapMetaStatusV170();
        recoverCurrentStatusV170();
    }

    let timer = null;

    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV170,55);
    });

    function bootV170() {
        applyV170();

        const root =
            document.getElementById('page-ads') ||
            document.body;

        if (root && !root.dataset.adsV170Observer) {
            root.dataset.adsV170Observer = '1';
            observer.observe(root,{
                childList:true,
                subtree:true
            });
        }

        // resetInterface có thể dựng DOM sau khi patch đã boot.
        // Kiểm tra nhiều nhịp để tab thứ 3 xuất hiện ngay lần đầu.
        [50,150,350,700,1400].forEach(delay => {
            setTimeout(applyV170,delay);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            bootV170,
            {once:true}
        );
    } else {
        bootV170();
    }

    window.addEventListener('resize',() => {
        clearTimeout(timer);
        timer = setTimeout(applyV170,100);
    });
})();

/* =========================================================
   V171 — FINANCE DATA CENTER TOP
          + MOBILE DETAIL KPI FIX
          + PRODUCT CODE CHART ALIGNMENT
          + OVERDUE COUNTDOWN
   ========================================================= */
(function installAdsV171UiStabilityFix() {
    const STYLE_ID = 'ads-v171-ui-stability-fix';

    function injectStyleV171() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    function keepFinanceDataCenterFirstV171() {
        const finance = document.getElementById('tab-finance');
        const dataCenter = document.getElementById('ads-data-center-mount');

        if (!finance || !dataCenter) return;

        // DOM thật cũng đưa lên đầu để không phụ thuộc CSS grid/flex.
        if (finance.firstElementChild !== dataCenter) {
            finance.insertBefore(
                dataCenter,
                finance.firstElementChild || null
            );
        }
    }

    function applyV171() {
        injectStyleV171();
        keepFinanceDataCenterFirstV171();
    }

    let timer = null;

    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(applyV171,60);
    });

    function bootV171() {
        applyV171();

        const root =
            document.getElementById('page-ads') ||
            document.body;

        if (root && !root.dataset.adsV171Observer) {
            root.dataset.adsV171Observer = '1';

            observer.observe(root,{
                childList:true,
                subtree:true
            });
        }

        [80,250,700,1400].forEach(delay => {
            setTimeout(applyV171,delay);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            bootV171,
            {once:true}
        );
    } else {
        bootV171();
    }

    document.addEventListener('click',event => {
        const financeButton =
            event.target &&
            event.target.closest
                ? event.target.closest(
                    '#btn-tab-fin,[data-ads-scope-target="finance"]'
                )
                : null;

        if (!financeButton) return;

        [20,100,260].forEach(delay => {
            setTimeout(applyV171,delay);
        });
    });

    window.addEventListener('resize',() => {
        clearTimeout(timer);
        timer = setTimeout(applyV171,100);
    });
})();

/* =========================================================
   V172 — MANUAL HISTORICAL BUDGET EVENTS
   ========================================================= */
(function installAdsV172ManualBudgetUi() {
    const STYLE_ID = 'ads-v172-manual-budget-ui';

    function injectStyleV172() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    function applyV172() {
        injectStyleV172();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            applyV172,
            {once:true}
        );
    } else {
        applyV172();
    }
})();

/* =========================================================
   V173 — OPTIONAL "NGÂN SÁCH SAU"
   ========================================================= */
(function installAdsV173OptionalToBudgetUi() {
    const STYLE_ID = 'ads-v173-optional-to-budget-ui';

    function injectStyleV173() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            injectStyleV173,
            {once:true}
        );
    } else {
        injectStyleV173();
    }
})();

/* =========================================================
   V180 — BASELINE MATCHES GROUPED TABLE LOGIC
   ========================================================= */
(function installAdsV180BaselineMatchInfo() {
    const STYLE_ID = 'ads-v180-baseline-match-info';

    function injectStyleV180() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            injectStyleV180,
            {once:true}
        );
    } else {
        injectStyleV180();
    }
})();

/* =========================================================
   V183 — SINGLE STABLE ADS LAYOUT MANAGER
   Mục tiêu:
   - Loại bỏ rung/chớp do V176 + V178 + V181 chạy chồng nhau.
   - Bảng <=12 dòng: cao tự nhiên.
   - Bảng >12 dòng: đúng 12 dòng + scroll.
   - Wheel tới đầu/cuối bảng sẽ tiếp tục cuộn trang.
   - Desktop Tổng quan: chart lấy chiều cao theo data card.
   - Marketing: giữ nguyên tuyệt đối geometry của Tổng quan.
   - Inner chart có padding và nhìn rõ đủ 4 góc bo tròn.
   - Meta Live + Tài chính.
   - Theo dõi ngân sách giữ layout riêng.
   ========================================================= */
(function installAdsV183StableLayoutManager() {
    const STYLE_ID = 'ads-v183-stable-layout-manager';
    const MAX_VISIBLE_ROWS = 12;

    const overviewGeometry = {
        performance: {
            cardHeight: 0,
            frameHeight: 0
        },
        finance: {
            cardHeight: 0,
            frameHeight: 0
        }
    };

    let rafId = 0;
    let resizeTimer = null;

    function injectStyle() {
        const old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(style);
    }

    function scopeOf(target) {
        try {
            return target === 'performance'
                ? String(META_LIVE_DATA_SCOPE || 'overview')
                : String(FINANCE_DATA_SCOPE || 'overview');
        } catch(error) {
            return 'overview';
        }
    }

    function isBudget(target) {
        return scopeOf(target) === 'budget-change';
    }

    function tabOf(target) {
        return document.getElementById(
            target === 'performance'
                ? 'tab-performance'
                : 'tab-finance'
        );
    }

    function visibleRows(tbody) {
        if (!tbody) return [];

        return Array.from(
            tbody.querySelectorAll(':scope > tr')
        ).filter(row => {
            const style = window.getComputedStyle(row);
            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden'
            );
        });
    }

    function clearTableWrapper(wrapper) {
        if (!wrapper) return;

        wrapper.classList.remove(
            'ads-v183-table-natural',
            'ads-v183-table-scroll',
            'ads-v176-natural-table',
            'ads-v176-scroll-table',
            'ads-v178-natural-table',
            'ads-v178-scroll-table',
            'ads-v177-fixed-scroll',
            'ads-v177-fixed-no-scroll'
        );

        wrapper.style.removeProperty('height');
        wrapper.style.removeProperty('min-height');
        wrapper.style.removeProperty('max-height');
        wrapper.style.removeProperty('overflow-y');
    }

    function applyTable(tbodyId,target) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        const table = tbody.closest('table');
        const wrapper = tbody.closest('.table-responsive');

        if (!table || !wrapper) return;

        clearTableWrapper(wrapper);

        if (isBudget(target)) return;

        const rows = visibleRows(tbody);

        if (rows.length <= MAX_VISIBLE_ROWS) {
            wrapper.classList.add(
                'ads-v183-table-natural'
            );
            return;
        }

        const thead = table.querySelector('thead');

        const headHeight = thead
            ? Math.ceil(
                thead.getBoundingClientRect().height
            )
            : 0;

        const rowsHeight = rows
            .slice(0,MAX_VISIBLE_ROWS)
            .reduce(
                (sum,row) => (
                    sum +
                    Math.max(
                        1,
                        Math.ceil(
                            row.getBoundingClientRect().height
                        )
                    )
                ),
                0
            );

        const height =
            headHeight +
            rowsHeight +
            2;

        wrapper.classList.add(
            'ads-v183-table-scroll'
        );

        wrapper.style.setProperty(
            'height',
            `${height}px`,
            'important'
        );

        wrapper.style.setProperty(
            'min-height',
            `${height}px`,
            'important'
        );

        wrapper.style.setProperty(
            'max-height',
            `${height}px`,
            'important'
        );

        wrapper.style.setProperty(
            'overflow-y',
            'auto',
            'important'
        );
    }

    function clearChartLock(target) {
        const tab = tabOf(target);
        if (!tab) return;

        const card = tab.querySelector(
            ':scope > .ads-chart-card'
        );

        if (!card) return;

        card.style.removeProperty('height');
        card.style.removeProperty('min-height');
        card.style.removeProperty('max-height');

        const frame = card.querySelector(
            '.ads-chart-canvas'
        );

        if (frame) {
            frame.style.removeProperty('height');
            frame.style.removeProperty('min-height');
            frame.style.removeProperty('max-height');
        }
    }

    function measureOverview(target) {
        if (
            window.innerWidth <= 1024 ||
            isBudget(target) ||
            scopeOf(target) !== 'overview'
        ) {
            return;
        }

        const tab = tabOf(target);
        if (!tab) return;

        const dataCard = tab.querySelector(
            ':scope > .ads-data-card'
        );

        const chartCard = tab.querySelector(
            ':scope > .ads-chart-card'
        );

        if (!dataCard || !chartCard) return;

        const cardHeight = Math.ceil(
            dataCard.getBoundingClientRect().height
        );

        if (!cardHeight || cardHeight < 120) return;

        /*
         * Set card first, then calculate the frame height from its
         * actual top offset. This guarantees 12px bottom gap, so
         * all 4 rounded corners remain visible.
         */
        chartCard.style.setProperty(
            'height',
            `${cardHeight}px`,
            'important'
        );
        chartCard.style.setProperty(
            'min-height',
            `${cardHeight}px`,
            'important'
        );
        chartCard.style.setProperty(
            'max-height',
            `${cardHeight}px`,
            'important'
        );

        const frame = chartCard.querySelector(
            '.ads-chart-canvas'
        );

        if (!frame) return;

        const cardRect =
            chartCard.getBoundingClientRect();

        const frameRect =
            frame.getBoundingClientRect();

        const frameTop = Math.max(
            0,
            Math.ceil(
                frameRect.top -
                cardRect.top
            )
        );

        const frameHeight = Math.max(
            150,
            cardHeight -
            frameTop -
            12
        );

        overviewGeometry[target] = {
            cardHeight,
            frameHeight
        };
    }

    function applyChart(target) {
        if (
            window.innerWidth <= 1024 ||
            isBudget(target)
        ) {
            clearChartLock(target);
            return;
        }

        const tab = tabOf(target);
        if (!tab) return;

        if (scopeOf(target) === 'overview') {
            measureOverview(target);
        }

        const geometry =
            overviewGeometry[target];

        if (
            !geometry.cardHeight ||
            !geometry.frameHeight
        ) {
            return;
        }

        const card = tab.querySelector(
            ':scope > .ads-chart-card'
        );

        const frame = card &&
            card.querySelector(
                '.ads-chart-canvas'
            );

        if (!card || !frame) return;

        card.style.setProperty(
            'height',
            `${geometry.cardHeight}px`,
            'important'
        );
        card.style.setProperty(
            'min-height',
            `${geometry.cardHeight}px`,
            'important'
        );
        card.style.setProperty(
            'max-height',
            `${geometry.cardHeight}px`,
            'important'
        );

        frame.style.setProperty(
            'height',
            `${geometry.frameHeight}px`,
            'important'
        );
        frame.style.setProperty(
            'min-height',
            `${geometry.frameHeight}px`,
            'important'
        );
        frame.style.setProperty(
            'max-height',
            `${geometry.frameHeight}px`,
            'important'
        );
    }

    function bindWheel(wrapper) {
        if (
            !wrapper ||
            wrapper.dataset.adsV183WheelBound === '1'
        ) return;

        wrapper.dataset.adsV183WheelBound = '1';

        wrapper.addEventListener(
            'wheel',
            event => {
                if (
                    !wrapper.classList.contains(
                        'ads-v183-table-scroll'
                    )
                ) return;

                const dy = Number(
                    event.deltaY || 0
                );

                if (!dy) return;

                const max = Math.max(
                    0,
                    wrapper.scrollHeight -
                    wrapper.clientHeight
                );

                const atTop =
                    wrapper.scrollTop <= 1;

                const atBottom =
                    wrapper.scrollTop >=
                    max - 1;

                const chain =
                    (dy < 0 && atTop) ||
                    (dy > 0 && atBottom);

                if (!chain) return;

                event.preventDefault();

                window.scrollBy({
                    top:dy,
                    left:0,
                    behavior:'auto'
                });
            },
            {
                passive:false
            }
        );
    }

    function bindTableObservers() {
        [
            ['ads-table-perf','performance'],
            ['ads-table-fin','finance']
        ].forEach(([tbodyId,target]) => {
            const tbody =
                document.getElementById(tbodyId);

            if (!tbody) return;

            bindWheel(
                tbody.closest('.table-responsive')
            );

            if (
                tbody.dataset.adsV183Observed === '1'
            ) return;

            tbody.dataset.adsV183Observed = '1';

            const observer =
                new MutationObserver(
                    scheduleSync
                );

            observer.observe(
                tbody,
                {
                    childList:true,
                    subtree:true,
                    characterData:true
                }
            );
        });
    }

    function syncNow() {
        injectStyle();

        applyTable(
            'ads-table-perf',
            'performance'
        );

        applyTable(
            'ads-table-fin',
            'finance'
        );

        applyChart('performance');
        applyChart('finance');

        bindTableObservers();

        /*
         * Không gọi chart.resize() ở đây.
         * Khi scope đổi, Chart.js được tạo lại đồng bộ bên trong
         * drawChartPerf/drawChartFin với animation:false và parent
         * đã giữ geometry cũ, nên không có nhịp scale thứ hai.
         */
    }

    function scheduleSync() {
        cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(
            syncNow
        );
    }

    window.__syncAdsLayoutV183 =
        scheduleSync;

    function boot() {
        injectStyle();

        /*
         * Một observer khởi tạo tạm thời, tự ngắt khi hai tbody đã có.
         * Không giữ root observer chạy mãi nên tránh chớp khi thao tác.
         */
        const tryBind = () => {
            bindTableObservers();

            const perf =
                document.getElementById(
                    'ads-table-perf'
                );

            const fin =
                document.getElementById(
                    'ads-table-fin'
                );

            scheduleSync();

            return !!(perf && fin);
        };

        if (tryBind()) return;

        const root =
            document.getElementById(
                'page-ads'
            ) ||
            document.body;

        const startupObserver =
            new MutationObserver(() => {
                if (tryBind()) {
                    startupObserver.disconnect();
                }
            });

        startupObserver.observe(
            root,
            {
                childList:true,
                subtree:true
            }
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {once:true}
        );
    } else {
        boot();
    }

    window.addEventListener(
        'resize',
        () => {
            clearTimeout(resizeTimer);

            resizeTimer = setTimeout(
                () => {
                    if (
                        scopeOf('performance') ===
                        'overview'
                    ) {
                        overviewGeometry.performance = {
                            cardHeight:0,
                            frameHeight:0
                        };
                    }

                    if (
                        scopeOf('finance') ===
                        'overview'
                    ) {
                        overviewGeometry.finance = {
                            cardHeight:0,
                            frameHeight:0
                        };
                    }

                    scheduleSync();
                },
                140
            );
        }
    );
})();

/* =========================================================
   V184 — META LIVE TRAFFIC ESTIMATE UI
   ========================================================= */
(function installMetaLiveTrafficEstimateV184() {
    const STYLE_ID =
        'meta-live-traffic-estimate-v184';

    function injectStyleV184() {
        const old =
            document.getElementById(
                STYLE_ID
            );

        if (old) old.remove();

        const style =
            document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(
            style
        );

        renderMetaLiveUsageEstimateV184();
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            injectStyleV184,
            {once:true}
        );
    } else {
        injectStyleV184();
    }
})();

/* =========================================================
   V185 — META LIVE HEIGHT FIX ONLY
   Nguyên nhân:
   CSS legacy đang ép #tab-performance chart/data card:
   height: clamp(520px, calc(100vh - 255px), 760px) !important;

   V185 chỉ sửa Meta Live:
   - Data card <=12 dòng: cao tự nhiên.
   - >12 dòng: cao theo wrapper 12 dòng.
   - Chart card bám đúng chiều cao data card.
   - Marketing giữ geometry Tổng quan.
   - Tài chính không thay đổi.
   ========================================================= */
(function installAdsV185MetaLiveHeightFix() {
    const STYLE_ID =
        'ads-v185-meta-live-height-fix';

    function injectStyleV185() {
        const old =
            document.getElementById(
                STYLE_ID
            );

        if (old) old.remove();

        const style =
            document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(
            style
        );
    }

    const perfGeometryV185 = {
        cardHeight:0,
        frameHeight:0
    };

    function perfScopeV185() {
        try {
            return String(
                META_LIVE_DATA_SCOPE ||
                'overview'
            );
        } catch(error) {
            return 'overview';
        }
    }

    function isBudgetV185() {
        return (
            perfScopeV185() ===
            'budget-change'
        );
    }

    function clearLegacyPerfDataHeightV185() {
        const tab =
            document.getElementById(
                'tab-performance'
            );

        if (!tab) return;

        const dataCard =
            tab.querySelector(
                ':scope > .ads-data-card'
            );

        if (!dataCard) return;

        dataCard.style.setProperty(
            'height',
            'auto',
            'important'
        );

        dataCard.style.setProperty(
            'min-height',
            '0',
            'important'
        );

        dataCard.style.setProperty(
            'max-height',
            'none',
            'important'
        );
    }

    function measureOverviewV185() {
        if (
            window.innerWidth <= 1024 ||
            isBudgetV185() ||
            perfScopeV185() !== 'overview'
        ) {
            return;
        }

        const tab =
            document.getElementById(
                'tab-performance'
            );

        if (!tab) return;

        clearLegacyPerfDataHeightV185();

        const dataCard =
            tab.querySelector(
                ':scope > .ads-data-card'
            );

        const chartCard =
            tab.querySelector(
                ':scope > .ads-chart-card'
            );

        if (
            !dataCard ||
            !chartCard
        ) return;

        /*
         * Sau khi bỏ clamp legacy,
         * đây là chiều cao thật:
         * header + bảng thực tế (tối đa 12 dòng).
         */
        const cardHeight =
            Math.ceil(
                dataCard
                    .getBoundingClientRect()
                    .height
            );

        if (
            !cardHeight ||
            cardHeight < 100
        ) {
            return;
        }

        const frame =
            chartCard.querySelector(
                '.ads-chart-canvas'
            );

        if (!frame) return;

        /*
         * Chốt card trước để lấy đúng vị trí frame.
         */
        chartCard.style.setProperty(
            'height',
            `${cardHeight}px`,
            'important'
        );

        chartCard.style.setProperty(
            'min-height',
            `${cardHeight}px`,
            'important'
        );

        chartCard.style.setProperty(
            'max-height',
            `${cardHeight}px`,
            'important'
        );

        const cardRect =
            chartCard
                .getBoundingClientRect();

        const frameRect =
            frame
                .getBoundingClientRect();

        const top =
            Math.max(
                0,
                Math.ceil(
                    frameRect.top -
                    cardRect.top
                )
            );

        /*
         * Chừa 12px đáy để nhìn rõ
         * hai góc bo dưới của frame.
         */
        const frameHeight =
            Math.max(
                130,
                cardHeight -
                top -
                12
            );

        perfGeometryV185.cardHeight =
            cardHeight;

        perfGeometryV185.frameHeight =
            frameHeight;
    }

    function applyPerfGeometryV185() {
        if (
            window.innerWidth <= 1024 ||
            isBudgetV185()
        ) {
            return;
        }

        const tab =
            document.getElementById(
                'tab-performance'
            );

        if (!tab) return;

        /*
         * Chỉ Tổng quan được đo lại.
         * Marketing dùng nguyên geometry này.
         */
        if (
            perfScopeV185() ===
            'overview'
        ) {
            measureOverviewV185();
        }

        const cardHeight =
            Number(
                perfGeometryV185.cardHeight ||
                0
            );

        const frameHeight =
            Number(
                perfGeometryV185.frameHeight ||
                0
            );

        if (
            !cardHeight ||
            !frameHeight
        ) return;

        const chartCard =
            tab.querySelector(
                ':scope > .ads-chart-card'
            );

        const frame =
            chartCard &&
            chartCard.querySelector(
                '.ads-chart-canvas'
            );

        if (
            !chartCard ||
            !frame
        ) return;

        chartCard.style.setProperty(
            'height',
            `${cardHeight}px`,
            'important'
        );

        chartCard.style.setProperty(
            'min-height',
            `${cardHeight}px`,
            'important'
        );

        chartCard.style.setProperty(
            'max-height',
            `${cardHeight}px`,
            'important'
        );

        frame.style.setProperty(
            'height',
            `${frameHeight}px`,
            'important'
        );

        frame.style.setProperty(
            'min-height',
            `${frameHeight}px`,
            'important'
        );

        frame.style.setProperty(
            'max-height',
            `${frameHeight}px`,
            'important'
        );
    }

    let rafV185 = 0;

    function syncV185() {
        injectStyleV185();

        cancelAnimationFrame(
            rafV185
        );

        rafV185 =
            requestAnimationFrame(
                () => {
                    /*
                     * V183 đã xử lý table trước.
                     * V185 chỉ sửa chiều cao Meta Live.
                     */
                    clearLegacyPerfDataHeightV185();

                    requestAnimationFrame(
                        applyPerfGeometryV185
                    );
                }
            );
    }

    /*
     * Gắn sau manager V183,
     * không tạo observer riêng kéo dài.
     */
    const priorSyncV183 =
        typeof window.__syncAdsLayoutV183 ===
        'function'
            ? window.__syncAdsLayoutV183
            : null;

    if (priorSyncV183) {
        window.__syncAdsLayoutV183 =
            function() {
                priorSyncV183();

                requestAnimationFrame(
                    syncV185
                );
            };
    }

    function bootV185() {
        injectStyleV185();

        /*
         * Chỉ phục vụ initial render/F5.
         * Không dùng nhiều timer khi đổi tab.
         */
        requestAnimationFrame(
            syncV185
        );

        setTimeout(
            syncV185,
            250
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            bootV185,
            {once:true}
        );
    } else {
        bootV185();
    }

    /*
     * Khi đổi scope:
     * một lần duy nhất sau click.
     */
    let clickTimerV185 = null;

    document.addEventListener(
        'click',
        event => {
            const button =
                event.target &&
                event.target.closest
                    ? event.target.closest(
                        '[data-ads-scope-target="performance"]'
                    )
                    : null;

            if (!button) return;

            clearTimeout(
                clickTimerV185
            );

            clickTimerV185 =
                setTimeout(
                    syncV185,
                    70
                );
        }
    );
})();

/* =========================================================
   V186 — BUDGET BEFORE-COST + CURRENT BUDGET FIX
   ========================================================= */
(function installAdsV186BudgetCostFix() {
    const STYLE_ID =
        'ads-v186-budget-cost-fix';

    function injectStyleV186() {
        const old =
            document.getElementById(
                STYLE_ID
            );

        if (old) old.remove();

        const style =
            document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(
            style
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            injectStyleV186,
            {once:true}
        );
    } else {
        injectStyleV186();
    }
})();

/* =========================================================
   V187 — SCOPE FIRST-CLICK + AFTER-SPEND + MOBILE 3 TABS
   ========================================================= */
(function installAdsV187ScopeAndMobileFix() {
    const STYLE_ID =
        'ads-v187-scope-mobile-fix';

    function injectStyleV187() {
        const old =
            document.getElementById(
                STYLE_ID
            );

        if (old) old.remove();

        const style =
            document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = ''; /* V321 CSS lives in Blogger */

        document.head.appendChild(
            style
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            injectStyleV187,
            {once:true}
        );
    } else {
        injectStyleV187();
    }
})();

/* =========================================================
   V188 — AFTER SPEND SIGNATURE FIX
   Baseline và current spend dùng cùng grouped identity.
   ========================================================= */


/* =========================================================
   V208 — REALTIME META COUNTDOWN
   - Thay chip Snapshot/Ước tính bằng số giây thực từ TTL server.
   - 300s → 0s, cập nhật từng giây.
   - Về 0 chỉ gọi summary của company/kỳ đang mở nếu Ads đang hiển thị.
   - Rời Ads hoặc công ty khác: không gọi nền.

   V206 — META DIRECT ON-DEMAND + APPS SCRIPT SHARED CACHE
   =========================================================
   Mục tiêu:
   - Nhân viên: KHÔNG đọc Meta Live từ Firebase snapshot.
   - Chỉ gọi Apps Script khi thực sự cần dữ liệu.
   - Apps Script cache chung 5 phút nên 20 người cùng xem một company/kỳ
     không làm Meta bị gọi 20 lần.
   - Client cũng cache 5 phút để chuyển Hiệu quả <-> Tài chính không gọi Web App lại.
   - Không có timer tự gọi Meta nền.
   - Báo cáo MKT chỉ dùng dữ liệu Meta đã có trong RAM của phiên hiện tại.
   - Guest: không gọi Apps Script Workspace; chỉ đọc snapshot Firebase gần nhất.
   - Khi Apps Script thật sự vừa gọi Meta (cache miss), đúng 1 client ghi snapshot
     Firebase làm bản dự phòng cho Guest + giữ lịch sử trạng thái/ngân sách.
   ========================================================= */
(function installMetaDirectV206(){
    const CLIENT_TTL_MS = 300000;
    const directCache = new Map();
    const directInFlight = new Map();
    const directCountdownRetryAt = new Map();
    let directCountdownTimerV208 = null;
    let directCountdownRefreshKeyV208 = '';

    // V211: giữ summary + hạn TTL trong sessionStorage để F5 không reset 300s
    // và không gọi Apps Script/Meta lại khi dữ liệu của đúng company+kỳ vẫn còn hạn.
    const DIRECT_SESSION_PREFIX_V211 = 'MKT_META_DIRECT_SUMMARY_V215::';

    // V215 — chính sách cache client theo thời gian dữ liệu.
    // - Kỳ có hôm nay: sessionStorage + TTL Meta/Apps Script 5 phút.
    // - Kỳ kết thúc trước hôm nay: IndexedDB lâu dài, KHÔNG refresh mỗi 5 phút.
    // - Sau 50 giờ kể từ cuối tháng chứa ngày `to`: phải có ít nhất 1 lần Meta source
    //   được tạo sau mốc 50h rồi mới xem là "Đã chốt".
    const META_HIST_DB_NAME_V215 = 'MKT_META_DIRECT_CACHE_V215';
    const META_HIST_DB_STORE_V215 = 'summary_cache';
    const META_HIST_DB_VERSION_V215 = 1;
    const META_HIST_FINAL_AFTER_MS_V215 = 50 * 60 * 60 * 1000;
    let metaHistDbPromiseV215 = null;

    function isoDatePartsV215(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        return {y:Number(match[1]), m:Number(match[2]), d:Number(match[3])};
    }

    function todayIsoV215() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
    }

    function metaTemporalPolicyV215(period, nowMs) {
        period = period || {};
        const from = String(period.from || '').slice(0, 10);
        const to = String(period.to || '').slice(0, 10);
        const today = todayIsoV215();
        const now = Number(nowMs || Date.now());
        const parts = isoDatePartsV215(to);
        const includesToday = !!(from && to && from <= today && to >= today);
        const historical = !!(to && to < today);

        let monthEndAt = 0;
        if (parts) {
            monthEndAt = new Date(parts.y, parts.m, 0, 23, 59, 59, 999).getTime();
        }
        const finalRefreshDueAt = monthEndAt > 0
            ? monthEndAt + META_HIST_FINAL_AFTER_MS_V215
            : 0;

        return {
            from,
            to,
            today,
            includesToday,
            historical,
            monthEndAt,
            monthEnded:monthEndAt > 0 && now > monthEndAt,
            finalRefreshDueAt,
            finalRefreshDue:historical && finalRefreshDueAt > 0 && now >= finalRefreshDueAt,
            mode:includesToday ? 'live_5m' : (historical ? 'historical_indexeddb' : 'other')
        };
    }

    function metaSourceFetchAtV215(entry) {
        if (!entry) return 0;
        const cacheInfo = entry.cacheInfo || {};
        const candidates = [
            Number(entry.sourceFetchAt || 0),
            Number(cacheInfo.storedAtMs || 0),
            Number(entry.serverStoredAtMs || 0),
            Date.parse(String(entry.syncedAt || '')) || 0,
            Number(entry.cachedAt || 0)
        ].filter(v => Number.isFinite(v) && v > 0);
        return candidates.length ? Math.max.apply(Math, candidates) : 0;
    }

    function isHistoricalFinalizedV215(entry, policy) {
        if (!entry || !policy || !policy.historical || !policy.finalRefreshDueAt) return false;
        const doneAt = Number(entry.finalRefreshDoneAt || 0);
        if (doneAt >= policy.finalRefreshDueAt) return true;
        return metaSourceFetchAtV215(entry) >= policy.finalRefreshDueAt;
    }

    function openMetaHistDbV215() {
        if (metaHistDbPromiseV215) return metaHistDbPromiseV215;
        metaHistDbPromiseV215 = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB không khả dụng.'));
                return;
            }
            const req = indexedDB.open(META_HIST_DB_NAME_V215, META_HIST_DB_VERSION_V215);
            req.onupgradeneeded = function() {
                const idb = req.result;
                if (!idb.objectStoreNames.contains(META_HIST_DB_STORE_V215)) {
                    idb.createObjectStore(META_HIST_DB_STORE_V215, {keyPath:'id'});
                }
            };
            req.onsuccess = function() { resolve(req.result); };
            req.onerror = function() { reject(req.error || new Error('Không mở được IndexedDB.')); };
        }).catch(error => {
            metaHistDbPromiseV215 = null;
            throw error;
        });
        return metaHistDbPromiseV215;
    }

    function histRecordIdV215(requestKey, ownerUid) {
        return String(ownerUid || '') + '|' + String(requestKey || '');
    }

    async function getHistoricalRecordV215(requestKey, ownerUid) {
        try {
            const idb = await openMetaHistDbV215();
            return await new Promise((resolve, reject) => {
                const tx = idb.transaction(META_HIST_DB_STORE_V215, 'readonly');
                const req = tx.objectStore(META_HIST_DB_STORE_V215).get(histRecordIdV215(requestKey, ownerUid));
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error || new Error('Không đọc được IndexedDB.'));
            });
        } catch (error) {
            console.warn('Meta V215 IndexedDB read:', error && error.message ? error.message : error);
            return null;
        }
    }

    async function putHistoricalRecordV215(entry) {
        if (!entry || !entry.key) return false;
        const policy = metaTemporalPolicyV215(entry.period);
        if (!policy.historical) return false;
        try {
            const idb = await openMetaHistDbV215();
            const record = {
                id:histRecordIdV215(entry.key, entry.ownerUid || ''),
                version:215,
                ownerUid:String(entry.ownerUid || ''),
                requestKey:String(entry.key || ''),
                company:String(entry.company || ''),
                period:entry.period || {},
                syncedAt:String(entry.syncedAt || ''),
                rows:Array.isArray(entry.rows) ? entry.rows : [],
                rawRows:Array.isArray(entry.rawRows) ? entry.rawRows : [],
                totals:entry.totals || {},
                cacheInfo:entry.cacheInfo || {},
                snapshotLike:entry.snapshotLike || null,
                cachedAt:Number(entry.cachedAt || Date.now()),
                sourceFetchAt:metaSourceFetchAtV215(entry),
                finalRefreshDoneAt:Number(entry.finalRefreshDoneAt || 0),
                finalRefreshDueAt:Number(policy.finalRefreshDueAt || 0),
                monthEndAt:Number(policy.monthEndAt || 0),
                updatedAt:Date.now()
            };
            await new Promise((resolve, reject) => {
                const tx = idb.transaction(META_HIST_DB_STORE_V215, 'readwrite');
                tx.objectStore(META_HIST_DB_STORE_V215).put(record);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error || new Error('Không ghi được IndexedDB.'));
                tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction bị hủy.'));
            });
            return true;
        } catch (error) {
            console.warn('Meta V215 IndexedDB write:', error && error.message ? error.message : error);
            return false;
        }
    }

    async function removeHistoricalRecordV215(requestKey, ownerUid) {
        try {
            const idb = await openMetaHistDbV215();
            await new Promise((resolve, reject) => {
                const tx = idb.transaction(META_HIST_DB_STORE_V215, 'readwrite');
                tx.objectStore(META_HIST_DB_STORE_V215).delete(histRecordIdV215(requestKey, ownerUid));
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error || new Error('Không xóa được IndexedDB.'));
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    function historicalRecordToEntryV215(record) {
        if (!record || !record.requestKey) return null;
        const now = Date.now();
        const rows = Array.isArray(record.rows) ? record.rows : [];
        const period = record.period || {};
        const snapshotLike = record.snapshotLike || {
            version:215,
            source:'meta_direct_indexeddb',
            company:String(record.company || ''),
            from:String(period.from || ''),
            to:String(period.to || ''),
            periodKey:`${String(period.from || '')}_${String(period.to || '')}`,
            totals:record.totals || {},
            rows:Array.isArray(record.rawRows) && record.rawRows.length ? record.rawRows : rows,
            rowCount:rows.length,
            syncedAt:String(record.syncedAt || ''),
            checkedAt:Number(record.updatedAt || now),
            updatedAt:Number(record.updatedAt || now),
            cacheInfo:record.cacheInfo || {}
        };
        return {
            key:String(record.requestKey || ''),
            ownerUid:String(record.ownerUid || ''),
            company:String(record.company || ''),
            period:{...period},
            syncedAt:String(record.syncedAt || ''),
            rows,
            rawRows:Array.isArray(record.rawRows) ? record.rawRows : [],
            totals:record.totals || {},
            cacheInfo:record.cacheInfo || {},
            snapshotLike,
            wrapper:null,
            cachedAt:Number(record.cachedAt || record.updatedAt || now),
            localStoredAt:Number(record.updatedAt || record.cachedAt || now),
            expiresAtLocal:0,
            serverStoredAtMs:Number(record.cacheInfo && record.cacheInfo.storedAtMs || 0),
            serverExpiresAtMs:Number(record.cacheInfo && record.cacheInfo.expiresAtMs || 0),
            ttlMs:CLIENT_TTL_MS,
            sourceFetchAt:Number(record.sourceFetchAt || 0),
            finalRefreshDoneAt:Number(record.finalRefreshDoneAt || 0),
            finalRefreshDueAt:Number(record.finalRefreshDueAt || 0),
            persistenceModeV215:'historical_indexeddb',
            restoredFromIndexedDbV215:true
        };
    }

    async function restoreHistoricalEntryV215(context) {
        const key = directCacheKeyV206(context);
        const ownerUid = currentDirectOwnerUidV211();
        const record = await getHistoricalRecordV215(key, ownerUid);
        const entry = historicalRecordToEntryV215(record);
        if (!entry) return null;
        directCache.set(key, entry);
        return entry;
    }

    function currentDirectOwnerUidV211() {
        try {
            const user = getMetaLiveAuthUser();
            return String(user && (user.uid || user.email) || '');
        } catch (error) {
            return '';
        }
    }

    function directSessionStorageKeyV211(key) {
        return DIRECT_SESSION_PREFIX_V211 + encodeURIComponent(String(key || ''));
    }

    function removeDirectSessionEntryV211(key) {
        try { sessionStorage.removeItem(directSessionStorageKeyV211(key)); }
        catch (error) {}
    }

    function persistDirectSessionEntryV211(entry) {
        if (!entry || !entry.key) return;
        const policyV215 = metaTemporalPolicyV215(entry.period);
        if (!policyV215.includesToday) {
            removeDirectSessionEntryV211(entry.key);
            return;
        }
        try {
            const ownerUid = currentDirectOwnerUidV211();
            const payload = {
                version:215,
                key:String(entry.key || ''),
                ownerUid,
                company:String(entry.company || ''),
                period:entry.period || {},
                syncedAt:String(entry.syncedAt || ''),
                rows:Array.isArray(entry.rows) ? entry.rows : [],
                totals:entry.totals || {},
                cacheInfo:entry.cacheInfo || {},
                cachedAt:Number(entry.cachedAt || Date.now()),
                localStoredAt:Number(entry.localStoredAt || entry.cachedAt || Date.now()),
                expiresAtLocal:Number(entry.expiresAtLocal || 0),
                serverStoredAtMs:Number(entry.serverStoredAtMs || 0),
                serverExpiresAtMs:Number(entry.serverExpiresAtMs || 0),
                ttlMs:Number(entry.ttlMs || CLIENT_TTL_MS)
            };
            sessionStorage.setItem(
                directSessionStorageKeyV211(entry.key),
                JSON.stringify(payload)
            );
        } catch (error) {
            // sessionStorage chỉ là cache tăng tốc; quota đầy không được làm lỗi hệ thống.
        }
    }

    function restoreDirectSessionCacheV211() {
        try {
            const now = Date.now();
            const restored = [];
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const storageKey = sessionStorage.key(i);
                if (!storageKey || !storageKey.startsWith(DIRECT_SESSION_PREFIX_V211)) continue;

                let saved = null;
                try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); }
                catch (error) { saved = null; }

                const period = saved && saved.period || {};
                const policyV215 = metaTemporalPolicyV215(period, now);
                if (!saved || !saved.key || !policyV215.includesToday || Number(saved.expiresAtLocal || 0) <= now) {
                    try { sessionStorage.removeItem(storageKey); } catch (error) {}
                    continue;
                }

                const rows = Array.isArray(saved.rows) ? saved.rows : [];
                const snapshotLike = {
                    version:215,
                    source:'meta_direct_session_v215',
                    company:String(saved.company || ''),
                    from:String(period.from || ''),
                    to:String(period.to || ''),
                    periodKey:`${String(period.from || '')}_${String(period.to || '')}`,
                    totals:saved.totals || {},
                    rows,
                    rowCount:rows.length,
                    syncedAt:String(saved.syncedAt || ''),
                    checkedAt:Number(saved.localStoredAt || saved.cachedAt || now),
                    updatedAt:Number(saved.localStoredAt || saved.cachedAt || now),
                    cacheInfo:saved.cacheInfo || {}
                };

                const entry = {
                    key:String(saved.key),
                    ownerUid:String(saved.ownerUid || ''),
                    company:String(saved.company || ''),
                    period:{...period},
                    syncedAt:String(saved.syncedAt || ''),
                    rows,
                    rawRows:[],
                    totals:saved.totals || {},
                    cacheInfo:saved.cacheInfo || {},
                    snapshotLike,
                    wrapper:null,
                    cachedAt:Number(saved.cachedAt || now),
                    localStoredAt:Number(saved.localStoredAt || saved.cachedAt || now),
                    expiresAtLocal:Number(saved.expiresAtLocal || 0),
                    serverStoredAtMs:Number(saved.serverStoredAtMs || 0),
                    serverExpiresAtMs:Number(saved.serverExpiresAtMs || 0),
                    ttlMs:Number(saved.ttlMs || CLIENT_TTL_MS),
                    restoredFromSessionV211:true
                };

                directCache.set(entry.key, entry);
                restored.push(entry.key);
            }
            return restored;
        } catch (error) {
            return [];
        }
    }

    // Chạy ngay khi file JS được nạp, trước khi init Ads yêu cầu dữ liệu.
    restoreDirectSessionCacheV211();

    const legacyBindMetaLiveSnapshotV206 = bindMetaLiveSnapshot;
    const legacyUnbindMetaLiveSnapshotV206 = unbindMetaLiveSnapshot;
    const legacyBindMetaLiveReportSnapshotsV206 = bindMetaLiveReportSnapshots;
    const legacyUnbindMetaLiveReportSnapshotsV206 = unbindMetaLiveReportSnapshots;

    const META_GUEST_DISABLED_TITLE_V218 = 'Meta Live đã ngưng hỗ trợ trên tài khoản khách';
    const META_GUEST_DISABLED_DETAIL_V218 = 'Hãy đăng nhập bằng tài khoản Google Workspace vd: mkt@phanbon.com.vn để có thể sử dụng được tính năng này.';
    const META_UNREGISTERED_TITLE_V286 = 'Tài khoản chưa được cấp quyền Meta Live';
    const META_UNREGISTERED_DETAIL_V286 = 'Tài khoản Google này chưa được tạo trong Marketing System. Vui lòng liên hệ Quản trị hệ thống để được cấp quyền.';

    function isMetaUnregisteredGoogleV286() {
        try {
            const user = getMetaLiveAuthUser();
            if (!user || user.isAnonymous === true) return false;
            const email = String(user.email || '').trim().toLowerCase();
            if (!email) return false;

            if (String(window.MKT_CURRENT_ROLE || '').toLowerCase() === 'unregistered') return true;
            if (window.MKT_UNREGISTERED_SESSION === true) return true;
            if (window.MKTRBAC && typeof window.MKTRBAC.isUnregisteredSession === 'function') {
                return window.MKTRBAC.isUnregisteredSession() === true;
            }
        } catch (error) {}
        return false;
    }

    function clearMetaClientDataForUnregisteredV286() {
        try { directCache.clear(); } catch (error) {}
        try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(DIRECT_SESSION_PREFIX_V211)) sessionStorage.removeItem(key);
            }
        } catch (error) {}
        META_LIVE_DATA = [];
        CURRENT_FILTERED_DATA = [];
        META_LIVE_CURRENT_SNAPSHOT = null;
        META_LIVE_STATE.loading = false;
        META_LIVE_STATE.error = '';
        META_LIVE_STATE.source = 'unregistered_google_meta_denied_v286';
        META_LIVE_STATE.leader = false;
        try { applyFilters(); } catch (error) {}
    }

    function showMetaUnregisteredDisabledV286(silent) {
        clearMetaClientDataForUnregisteredV286();
        updateMetaLiveStatus('error', META_UNREGISTERED_TITLE_V286);
        if (!silent) {
            if (window.MKTRBAC && typeof window.MKTRBAC.showMetaAccessNotice === 'function') {
                window.MKTRBAC.showMetaAccessNotice(META_UNREGISTERED_DETAIL_V286);
            } else if (typeof showToast === 'function') {
                showToast(META_UNREGISTERED_TITLE_V286, 'warning');
            }
        }
        return null;
    }


    function isWorkspaceGoogleSessionV218() {
        try {
            const user = getMetaLiveAuthUser();
            if (!user || user.isAnonymous === true) return false;

            const email = String(user.email || '').trim().toLowerCase();
            if (!email.endsWith('@phanbon.com.vn')) return false;

            const providers = Array.isArray(user.providerData) ? user.providerData : [];
            if (!providers.length) {
                // Firebase đôi khi cập nhật providerData chậm một nhịp; backend vẫn xác minh Google provider.
                return true;
            }

            return providers.some(provider =>
                String(provider && provider.providerId || '').toLowerCase() === 'google.com'
            );
        } catch (error) {}
        return false;
    }

    function isWorkspaceDomainSessionV219() {
        try {
            const user = getMetaLiveAuthUser();
            if (!user || user.isAnonymous === true) return false;
            const email = String(user.email || '').trim().toLowerCase();
            return email.endsWith('@phanbon.com.vn');
        } catch (error) {}
        return false;
    }

    function isMetaGuestBlockedV218() {
        /*
         * V220 — "Tài khoản khách" của thông báo Meta chỉ là Firebase Anonymous
         * được tạo bởi nút Xem với tư cách Khách.
         * Không dùng role RBAC=guest, body.guest-mode hoặc quyền module để hiện
         * thông báo ngưng hỗ trợ. Tài khoản có email/role sẽ đi tới backend và
         * backend trả lỗi quyền phù hợp nếu Admin đã chặn Ads.
         */
        try {
            const user = getMetaLiveAuthUser();
            return !!(user && user.isAnonymous === true);
        } catch (error) {}
        return false;
    }

    function isMetaAccessDeniedErrorV221(error) {
        const message = String(error && error.message ? error.message : error || '').toLowerCase();
        if (!message) return false;
        return (
            message.includes('chưa được thêm vào marketing system') ||
            message.includes('chưa được cấp quyền') ||
            message.includes('không có quyền') ||
            message.includes('permission denied') ||
            message.includes('permission_denied') ||
            message.includes('firebase đã bị vô hiệu hóa') ||
            message.includes('phiên đăng nhập đã hết hạn') ||
            (message.includes('phiên đăng nhập') && message.includes('không hợp lệ'))
        );
    }

    function showMetaAccessDeniedErrorV221(error) {
        if (!isMetaAccessDeniedErrorV221(error)) return false;
        const message = String(error && error.message ? error.message : error || '').replace(/^Error:\s*/i, '').trim();

        // RBAC được tải sau ads-firebase trong Blogspot. Nếu lỗi xảy ra ngay lúc khôi phục phiên,
        // chờ RBAC sẵn sàng để vẫn hiện đúng popup thay vì chỉ còn dòng lỗi kỹ thuật.
        let attempts = 0;
        const openWhenReady = () => {
            attempts += 1;
            if (window.MKTRBAC && typeof window.MKTRBAC.showMetaAccessNotice === 'function') {
                window.MKTRBAC.showMetaAccessNotice(message);
                return;
            }
            if (attempts < 20) {
                setTimeout(openWhenReady, 150);
                return;
            }
            if (typeof showToast === 'function') {
                showToast(message || 'Tài khoản hiện tại không được phép xem dữ liệu Meta Live.', 'warning');
            }
        };
        openWhenReady();
        return true;
    }

    function showMetaGuestDisabledV218(silent) {
        META_LIVE_DATA = [];
        CURRENT_FILTERED_DATA = [];
        META_LIVE_CURRENT_SNAPSHOT = null;
        META_LIVE_STATE.loading = false;
        META_LIVE_STATE.error = '';
        META_LIVE_STATE.source = 'anonymous_guest_meta_disabled_v220';
        META_LIVE_STATE.leader = false;

        try { applyFilters(); } catch (error) {}
        updateMetaLiveStatus('error', META_GUEST_DISABLED_TITLE_V218);

        // V219: không tự mở popup cảnh báo chỉ vì vừa khôi phục một phiên Anonymous cũ
        // hoặc vừa truy cập deep-link. Popup chỉ do RBAC kích hoạt sau khi người dùng
        // bấm nút Khách và Firebase Anonymous đăng nhập thành công.
        if (
            window.MKTRBAC &&
            typeof window.MKTRBAC.renderMetaGuestInlineNotice === 'function'
        ) {
            window.MKTRBAC.renderMetaGuestInlineNotice();
        } else if (!silent && typeof showToast === 'function') {
            showToast(META_GUEST_DISABLED_TITLE_V218, 'warning');
        }
        return null;
    }

    function isStaffDirectV206() {
        const user = getMetaLiveAuthUser();
        if (!user) return false;
        // V286: Anonymous Guest vẫn bị chặn Meta theo cơ chế cũ dù Guest có ads:view.
        if (user.isAnonymous === true) return false;
        // Chỉ bổ sung chặn Google/Firebase user chưa có hồ sơ trong Marketing System.
        if (isMetaUnregisteredGoogleV286()) {
            clearMetaClientDataForUnregisteredV286();
            return false;
        }
        return true;
    }

    function directCacheKeyV206(context) {
        return context && context.requestKey
            ? String(context.requestKey)
            : getMetaLiveRequestKey(
                String(context && context.company || CURRENT_COMPANY || 'NNV'),
                String(context && context.period && context.period.from || ''),
                String(context && context.period && context.period.to || '')
            );
    }

    function getDirectCacheEntryV206(context, allowExpired) {
        const key = directCacheKeyV206(context);
        const entry = directCache.get(key);
        if (!entry) return null;

        // V211: cache F5 chỉ được dùng lại cho đúng tài khoản đã tạo nó.
        const currentUid = currentDirectOwnerUidV211();
        if (entry.ownerUid && currentUid && String(entry.ownerUid) !== currentUid) {
            return null;
        }

        if (allowExpired === true) return entry;

        const policyV215 = metaTemporalPolicyV215(entry.period);
        if (policyV215.historical || entry.persistenceModeV215 === 'historical_indexeddb') {
            // Quá khứ không hết hạn mỗi 5 phút. Chỉ bắt buộc gọi lại đúng 1 lần
            // khi đã qua mốc cuối-tháng + 50 giờ mà source hiện có vẫn được tạo trước mốc đó.
            if (policyV215.finalRefreshDue && !isHistoricalFinalizedV215(entry, policyV215)) {
                return null;
            }
            return entry;
        }

        const expiresAtLocal = Number(entry.expiresAtLocal || 0);
        if (expiresAtLocal > 0) {
            if (Date.now() < expiresAtLocal) return entry;
            directCache.delete(key);
            removeDirectSessionEntryV211(key);
            return null;
        }

        if ((Date.now() - Number(entry.cachedAt || 0)) >= CLIENT_TTL_MS) {
            directCache.delete(key);
            removeDirectSessionEntryV211(key);
            return null;
        }
        return entry;
    }

    function resolveDirectCacheWindowV208(cacheInfo) {
        cacheInfo = cacheInfo || {};

        const ttlMs = Math.max(
            1000,
            Number(cacheInfo.ttlSeconds || 300) * 1000
        );
        const serverNowMs = Number(cacheInfo.serverNowMs || 0);
        const expiresAtMs = Number(cacheInfo.expiresAtMs || 0);

        let remainingMs = Number(cacheInfo.remainingMs);
        if (!Number.isFinite(remainingMs)) {
            remainingMs = (
                serverNowMs > 0 && expiresAtMs > 0
                    ? expiresAtMs - serverNowMs
                    : ttlMs
            );
        }

        remainingMs = Math.max(0, Math.min(ttlMs, remainingMs));

        return {
            ttlMs,
            remainingMs,
            expiresAtLocal: Date.now() + remainingMs,
            serverNowMs,
            serverStoredAtMs: Number(cacheInfo.storedAtMs || 0),
            serverExpiresAtMs: expiresAtMs
        };
    }

    function isMainMetaContextV206(context) {
        if (!context) return false;
        if (CURRENT_TAB !== 'performance' && CURRENT_TAB !== 'finance') return false;
        try {
            const mainContext = buildMetaLiveContext();
            return !!(
                mainContext &&
                mainContext.requestKey === context.requestKey
            );
        } catch (error) {
            return false;
        }
    }

    function buildSnapshotLikeV206(metaData, context) {
        metaData = metaData || {};
        return {
            version:206,
            source:'meta_direct',
            company:context.company,
            from:context.period.from,
            to:context.period.to,
            periodKey:context.periodKey,
            totals:metaData.totals || {},
            rows:Array.isArray(metaData.rows)
                ? metaData.rows
                : Object.values(metaData.rows || {}),
            rowCount:Array.isArray(metaData.rows)
                ? metaData.rows.length
                : Object.keys(metaData.rows || {}).length,
            syncedAt:metaData.syncedAt || new Date().toISOString(),
            checkedAt:Date.now(),
            updatedAt:Date.now(),
            cacheInfo:metaData.cacheInfo || {}
        };
    }

    function applyDirectEntryV206(entry, context) {
        if (!entry || !context) return null;

        const rows = Array.isArray(entry.rows) ? entry.rows : [];
        const sameContext = META_LIVE_LAST_APPLIED_KEY === context.requestKey;

        prepareMetaLiveChangedFields(
            META_LIVE_DATA,
            rows,
            sameContext
        );

        META_LIVE_DATA = rows;
        META_CONTENT_ADS_V307 = Array.isArray(entry && entry.activityAds)
            ? entry.activityAds.filter(Boolean)
            : [];
        META_LIVE_LAST_APPLIED_KEY = context.requestKey;
        META_LIVE_CURRENT_SNAPSHOT = entry.snapshotLike || null;
        META_LIVE_ACTIVE_CONTEXT = context;

        META_LIVE_STATE = {
            loading:false,
            company:context.company,
            from:context.period.from,
            to:context.period.to,
            key:context.requestKey,
            syncedAt:entry.syncedAt || '',
            checkedAt:Number(entry.localStoredAt || entry.cachedAt || Date.now()),
            error:'',
            rowCount:rows.length,
            source:'meta_direct',
            leader:false
        };

        renderMetaSidebarActivity();
        applyFilters();
        try {
            if (window.MKTRBAC && typeof window.MKTRBAC.closeMetaAccessNotice === 'function') window.MKTRBAC.closeMetaAccessNotice();
        } catch (error) {}
        updateMetaLiveStatus(
            'success',
            `Meta Direct • ${formatMetaLiveSyncTime(entry.syncedAt)}`
        );

        return entry;
    }

    async function persistFreshDirectAsGuestSnapshotV206(context, wrapper, previousEntryV214) {
        if (!db) db = getDatabase();
        if (!db || !context || !wrapper || !wrapper.data) return null;

        const cacheInfo = wrapper.data.cacheInfo || {};
        // Chỉ xử lý khi Apps Script vừa thực sự lấy Meta mới. Cache-hit không tạo checkpoint/event lặp.
        if (cacheInfo.hit === true) return null;

        try {
            const rawRows = Array.isArray(wrapper.data.rows)
                ? wrapper.data.rows
                : Object.values(wrapper.data.rows || {});
            const previousRows = previousEntryV214 && Array.isArray(previousEntryV214.rawRows) && previousEntryV214.rawRows.length
                ? previousEntryV214.rawRows
                : (previousEntryV214 && Array.isArray(previousEntryV214.rows) ? previousEntryV214.rows : []);
            const syncedAt = String(wrapper.data.syncedAt || new Date().toISOString());

            // V304: không ghi period snapshot và đã ngưng toàn bộ ledger Theo dõi ngân sách/checkpoint.
            // Fresh sync chỉ còn ghi Activity Campaign/Adset/Ad phục vụ thông báo.
            const activityAdsV267 = Array.isArray(wrapper.data.activityAds)
                ? wrapper.data.activityAds
                : Object.values(wrapper.data.activityAds || {});
            const activityAdsetsV267 = Array.isArray(wrapper.data.activityAdsets)
                ? wrapper.data.activityAdsets
                : Object.values(wrapper.data.activityAdsets || {});
            const activityCampaignsV267 = Array.isArray(wrapper.data.activityCampaigns)
                ? wrapper.data.activityCampaigns
                : Object.values(wrapper.data.activityCampaigns || {});

            const results = await Promise.all([
                persistCampaignMetaActivitiesV267(
                    context,
                    rawRows,
                    activityCampaignsV267,
                    activityAdsetsV267,
                    activityAdsV267,
                    syncedAt
                )
            ]);

            META_LIVE_STATE.source = 'meta_direct_no_snapshot';
            META_LIVE_STATE.leader = false;
            return {
                savedSnapshot:false,
                budgetEvents:null,
                spendCheckpoint:null,
                campaignActivities:results[0] || null
            };
        } catch (error) {
            console.warn(
                'Meta Direct V304: không lưu được Activity hỗ trợ thông báo:',
                error && error.message ? error.message : error
            );
            return null;
        }
    }

    async function fetchMetaDirectContextV206(context, silent, ignoreClientCache) {
        if (!context) throw new Error('Thiếu context Meta Direct.');
        if (isMetaUnregisteredGoogleV286()) {
            showMetaUnregisteredDisabledV286(silent === true);
            const error = new Error(META_UNREGISTERED_TITLE_V286);
            error.code = 'MKT_META_LIVE_UNREGISTERED_GOOGLE_DENIED';
            throw error;
        }
        if (!isStaffDirectV206()) {
            showMetaGuestDisabledV218(silent === true);
            const error = new Error(META_GUEST_DISABLED_TITLE_V218);
            error.code = 'MKT_META_LIVE_ANONYMOUS_GUEST_DISABLED';
            throw error;
        }
        if (typeof window.requestMetaAdsLive !== 'function') {
            throw new Error('Cầu nối Meta Ads chưa sẵn sàng.');
        }

        const key = directCacheKeyV206(context);
        const policyV215 = metaTemporalPolicyV215(context.period);
        let historicalFallbackV215 = null;

        // V214/V215: giữ bản trước để so ngân sách khi Meta trả dữ liệu mới.
        let previousEntryForSupportV214 = getDirectCacheEntryV206(context, true);
        if (
            policyV215.historical &&
            policyV215.finalRefreshDue &&
            previousEntryForSupportV214 &&
            !isHistoricalFinalizedV215(previousEntryForSupportV214, policyV215)
        ) {
            historicalFallbackV215 = previousEntryForSupportV214;
        }

        if (!ignoreClientCache) {
            let cached = getDirectCacheEntryV206(context, false);
            if (!cached && policyV215.historical) {
                const restored = await restoreHistoricalEntryV215(context);
                if (restored) {
                    previousEntryForSupportV214 = restored;
                    if (policyV215.finalRefreshDue && !isHistoricalFinalizedV215(restored, policyV215)) {
                        historicalFallbackV215 = restored;
                    } else {
                        cached = restored;
                    }
                }
            }
            if (cached) {
                if (isMainMetaContextV206(context)) {
                    applyDirectEntryV206(cached, context);
                }
                return cached;
            }
        } else if (policyV215.historical && !previousEntryForSupportV214) {
            previousEntryForSupportV214 = await restoreHistoricalEntryV215(context);
            historicalFallbackV215 = previousEntryForSupportV214;
        }

        if (directInFlight.has(key)) {
            return directInFlight.get(key);
        }

        const applyToMain = isMainMetaContextV206(context);

        if (applyToMain) {
            META_LIVE_STATE.loading = true;
            META_LIVE_STATE.error = '';
            META_LIVE_ACTIVE_CONTEXT = context;

            updateMetaLiveStatus(
                'loading',
                `Đang lấy Meta • ${context.company} • ${isoToDisplayDate(context.period.from)} - ${isoToDisplayDate(context.period.to)}`
            );
        }

        const promise = window.requestMetaAdsLive({
            company:context.company,
            from:context.period.from,
            to:context.period.to,
            // V302: khi caller yêu cầu bỏ cache client thì backend cũng phải bỏ cache Apps Script.
            // Nhờ vậy Meta Live/Tài chính nhận dữ liệu Meta mới ngay theo thao tác.
            force:ignoreClientCache === true,
            mode:'summary'
        }).then(wrapper => {
            if (!wrapper || wrapper.success === false || !wrapper.data) {
                throw new Error(
                    wrapper && wrapper.error && wrapper.error.message
                        ? wrapper.error.message
                        : 'Meta Direct không trả dữ liệu hợp lệ.'
                );
            }

            const metaData = wrapper.data || {};
            const syncedAt = metaData.syncedAt || new Date().toISOString();
            const snapshotLike = buildSnapshotLikeV206(metaData, context);
            const rows = normalizeMetaLiveRows(
                metaData.rows || [],
                context.company,
                context.period,
                syncedAt
            );

            const cacheInfo = metaData.cacheInfo || {};
            const cacheWindow = resolveDirectCacheWindowV208(cacheInfo);
            const receivedAt = Date.now();
            const policyAfterFetchV215 = metaTemporalPolicyV215(context.period, receivedAt);
            const sourceFetchAtV215 = Number(cacheInfo.storedAtMs || 0) || (Date.parse(String(syncedAt || '')) || receivedAt);
            const finalDoneAtV215 = (
                policyAfterFetchV215.historical &&
                policyAfterFetchV215.finalRefreshDueAt > 0 &&
                sourceFetchAtV215 >= policyAfterFetchV215.finalRefreshDueAt
            ) ? sourceFetchAtV215 : 0;

            const entry = {
                key,
                ownerUid:currentDirectOwnerUidV211(),
                company:context.company,
                period:{...context.period},
                syncedAt,
                rows,
                rawRows:Array.isArray(metaData.rows)
                    ? metaData.rows
                    : Object.values(metaData.rows || {}),
                activityAds:Array.isArray(metaData.activityAds)
                    ? metaData.activityAds
                    : Object.values(metaData.activityAds || {}),
                activityAdsets:Array.isArray(metaData.activityAdsets)
                    ? metaData.activityAdsets
                    : Object.values(metaData.activityAdsets || {}),
                activityCampaigns:Array.isArray(metaData.activityCampaigns)
                    ? metaData.activityCampaigns
                    : Object.values(metaData.activityCampaigns || {}),
                totals:metaData.totals || {},
                cacheInfo:cacheInfo,
                snapshotLike,
                wrapper,
                cachedAt:receivedAt,
                localStoredAt:receivedAt - Math.max(0, cacheWindow.ttlMs - cacheWindow.remainingMs),
                expiresAtLocal:policyAfterFetchV215.includesToday ? cacheWindow.expiresAtLocal : 0,
                serverStoredAtMs:cacheWindow.serverStoredAtMs,
                serverExpiresAtMs:cacheWindow.serverExpiresAtMs,
                ttlMs:cacheWindow.ttlMs,
                sourceFetchAt:sourceFetchAtV215,
                finalRefreshDoneAt:finalDoneAtV215,
                finalRefreshDueAt:Number(policyAfterFetchV215.finalRefreshDueAt || 0),
                persistenceModeV215:policyAfterFetchV215.historical ? 'historical_indexeddb' : 'live_session'
            };

            directCache.set(key, entry);
            if (policyAfterFetchV215.includesToday) {
                persistDirectSessionEntryV211(entry);
            } else if (policyAfterFetchV215.historical) {
                removeDirectSessionEntryV211(key);
                putHistoricalRecordV215(entry).catch(() => false);
                // Nếu vừa chạm mốc 50h nhưng Apps Script trả cache được tạo TRƯỚC 50h,
                // chờ cache server hết hạn rồi thử lại để bảo đảm lần chốt thật sự sau 50h.
                if (policyAfterFetchV215.finalRefreshDue && !isHistoricalFinalizedV215(entry, policyAfterFetchV215)) {
                    const retryAt = cacheWindow.expiresAtLocal > Date.now()
                        ? cacheWindow.expiresAtLocal
                        : (Date.now() + Math.max(1000, Number(cacheInfo.remainingMs || 30000)));
                    directCountdownRetryAt.set(key, retryAt);
                }
            }
            if (applyToMain) {
                applyDirectEntryV206(entry, context);
            }

            // Không ghi period snapshot. Chỉ Ads chính mới cần ledger ngân sách/checkpoint nhỏ.
            if (!context.skipSupportLedgersV215) {
                persistFreshDirectAsGuestSnapshotV206(context, wrapper, previousEntryForSupportV214).catch(() => {});
            }

            if (!silent) {
                const serverHit = entry.cacheInfo && entry.cacheInfo.hit === true;
                showToast(
                    serverHit
                        ? '✅ Đã nhận dữ liệu Meta'
                        : '✅ Đã lấy dữ liệu mới trực tiếp từ Meta',
                    'success'
                );
            }

            return entry;
        }).catch(error => {
            if (historicalFallbackV215) {
                // Không bỏ trống dữ liệu lịch sử nếu lần chốt 50h tạm lỗi.
                // Giữ bản IndexedDB và thử lại sau, nhưng KHÔNG đánh dấu đã chốt.
                directCache.set(key, historicalFallbackV215);
                directCountdownRetryAt.set(key, Date.now() + 30000);
                if (applyToMain) {
                    applyDirectEntryV206(historicalFallbackV215, context);
                    META_LIVE_STATE.error = '';
                    updateMetaLiveStatus('success', `Đang dùng bản lịch sử • chờ chốt Meta sau 50h`);
                    if (!silent) showToast('⚠️ Chưa chốt lại được Meta sau 50h; đang dùng bản lịch sử đã lưu.', 'warning');
                }
                return historicalFallbackV215;
            }
            if (applyToMain) {
                META_LIVE_STATE.loading = false;
                META_LIVE_STATE.error = error.message || 'Không lấy được Meta Direct.';
                updateMetaLiveStatus('error', `Lỗi Meta Direct: ${META_LIVE_STATE.error}`);
                const accessDeniedV221 = showMetaAccessDeniedErrorV221(error);
                if (!silent && !accessDeniedV221) showToast(`❌ ${META_LIVE_STATE.error}`, 'error');
            }
            throw error;
        }).finally(() => {
            directInFlight.delete(key);
        });

        directInFlight.set(key, promise);
        return promise;
    }

    function getDirectCountdownContextV208() {
        if (!isStaffDirectV206()) return null;
        if (CURRENT_TAB !== 'performance' && CURRENT_TAB !== 'finance') return null;
        if (document.hidden) return null;

        const adsPage = document.getElementById('page-ads');
        if (!adsPage || !adsPage.classList.contains('active')) return null;

        try {
            return buildMetaLiveContext();
        } catch (error) {
            return null;
        }
    }

    function renderDirectCountdownV208() {
        // V302: không còn countdown 5 phút. Chip chỉ báo chế độ nguồn dữ liệu.
        const chips = document.querySelectorAll('[data-meta-live-usage-v184]');
        if (!chips.length) return;

        const isStaff = isStaffDirectV206();
        const context = getDirectCountdownContextV208();
        const entry = context ? getDirectCacheEntryV206(context, true) : null;

        let display = isStaff ? 'LIVE' : 'Không Meta';
        let title = isStaff
            ? 'Meta Direct: quay lại tab hoặc mở lại khu vực chỉ lấy mới khi dữ liệu đã cũ từ 2 phút; nút Cập nhật Meta luôn lấy mới ngay. Không có auto-refresh nền.'
            : 'Tài khoản Khách không được gọi Meta Direct.';

        if (isStaff && entry && entry.syncedAt) {
            title += ` Lần lấy gần nhất: ${formatMetaLiveSyncTime(entry.syncedAt)}.`;
        }

        chips.forEach(chip => {
            chip.textContent = display;
            chip.title = title;
            chip.dataset.metaCountdownSeconds = '';
            chip.classList.remove('is-meta-countdown-warning-v208');
            chip.classList.remove('is-meta-countdown-ready-v208');
        });
    }

    function shouldAutoRefreshDirectV208(context, entry) {
        if (!context || !entry || !isStaffDirectV206()) return false;
        if (document.hidden) return false;
        if (CURRENT_TAB !== 'performance' && CURRENT_TAB !== 'finance') return false;

        const adsPage = document.getElementById('page-ads');
        if (!adsPage || !adsPage.classList.contains('active')) return false;

        const currentContext = getDirectCountdownContextV208();
        if (!currentContext || currentContext.requestKey !== context.requestKey) return false;

        const policyV215 = metaTemporalPolicyV215(context.period);
        if (policyV215.includesToday) {
            return Date.now() >= Number(entry.expiresAtLocal || 0);
        }
        if (policyV215.historical) {
            return policyV215.finalRefreshDue && !isHistoricalFinalizedV215(entry, policyV215);
        }
        return false;
    }

    function tickDirectCountdownV208() {
        // V302: không còn auto-refresh theo timer.
        // Việc lấy Meta chỉ xảy ra theo thao tác người dùng/visibility event.
        renderDirectCountdownV208();
    }

    function startDirectCountdownV208() {
        // V302: dừng hẳn timer countdown/auto-refresh cũ.
        if (directCountdownTimerV208) {
            clearInterval(directCountdownTimerV208);
            directCountdownTimerV208 = null;
        }
        renderDirectCountdownV208();
    }

    function injectDirectCountdownStyleV208() {
        if (document.getElementById('meta-direct-countdown-style-v208')) return;
        const style = document.createElement('style');
        style.id = 'meta-direct-countdown-style-v208';
        style.textContent = ''; /* V321 CSS lives in Blogger */
        document.head.appendChild(style);
    }

    async function loadGuestSnapshotV206(context, silent) {
        // V218: chỉ Anonymous Guest không đọc Meta Direct/cache; Workspace role guest vẫn dùng Direct.
        legacyUnbindMetaLiveSnapshotV206();
        legacyUnbindMetaLiveReportSnapshotsV206();
        return showMetaGuestDisabledV218(silent === true);
    }

    async function ensureDirectOrGuestContextV206(context, silent, ignoreClientCache) {
        if (isStaffDirectV206()) {
            // Nhân viên không giữ listener snapshot Firebase.
            legacyUnbindMetaLiveSnapshotV206();
            return fetchMetaDirectContextV206(context, silent, ignoreClientCache === true);
        }
        return loadGuestSnapshotV206(context, silent);
    }

    function getMetaDirectEntryAgeV305(context) {
        if (!context) return Number.POSITIVE_INFINITY;
        const entry = getDirectCacheEntryV206(context, true);
        if (!entry) return Number.POSITIVE_INFINITY;

        const referenceAt = Number(
            entry.sourceFetchAt ||
            entry.serverStoredAtMs ||
            entry.cachedAt ||
            entry.localStoredAt ||
            0
        );

        if (!referenceAt) return Number.POSITIVE_INFINITY;
        return Math.max(0, Date.now() - referenceAt);
    }

    function shouldForceMetaRefreshV305(context, manualForce) {
        if (manualForce === true) return true;
        if (!context) return true;

        const policy = metaTemporalPolicyV215(context.period);
        if (policy.historical) {
            // Kỳ quá khứ tiếp tục dùng chính sách chốt lịch sử hiện có.
            const valid = getDirectCacheEntryV206(context, false);
            return !valid;
        }

        const age = getMetaDirectEntryAgeV305(context);
        return !Number.isFinite(age) || age >= META_RETURN_REFRESH_MIN_INTERVAL_MS_V305;
    }

    function applyRecentMetaEntryV305(context) {
        const entry = getDirectCacheEntryV206(context, true);
        if (!entry) return null;
        if (isMainMetaContextV206(context)) {
            applyDirectEntryV206(entry, context);
        }
        return entry;
    }

    async function refreshMetaLiveV206(forceRefresh, silent) {
        if (CURRENT_TAB !== 'performance' && CURRENT_TAB !== 'finance') {
            return Promise.resolve(null);
        }

        // V206 on-demand: đăng nhập vào Trang chủ không được tự gọi Meta.
        // Chỉ khi trang Quảng cáo thật sự đang mở mới lấy dữ liệu.
        const adsPage = document.getElementById('page-ads');
        if (!adsPage || !adsPage.classList.contains('active') || document.hidden) {
            return Promise.resolve(null);
        }

        let context;
        try {
            context = buildMetaLiveContext();
        } catch (error) {
            META_LIVE_STATE.error = error.message;
            updateMetaLiveStatus('error', error.message);
            if (!silent) showToast(`❌ ${error.message}`, 'error');
            throw error;
        }

        // V305: thao tác tự động (mở lại trang / quay lại browser tab / đổi khu vực)
        // chỉ gọi Meta khi lần lấy gần nhất đã cũ >= 2 phút.
        // Manual refresh (forceRefresh=true) luôn ép backend lấy mới ngay.
        const forceNowV305 = shouldForceMetaRefreshV305(context, forceRefresh === true);

        if (!forceNowV305 && isStaffDirectV206()) {
            const recentEntryV305 = applyRecentMetaEntryV305(context);
            if (recentEntryV305) {
                META_LIVE_STATE.loading = false;
                META_LIVE_STATE.error = '';
                updateMetaLiveStatus('success', 'LIVE • dữ liệu còn mới dưới 2 phút');
                renderDirectCountdownV208();
                return Promise.resolve(recentEntryV305);
            }
        }

        return ensureDirectOrGuestContextV206(
            context,
            silent === true,
            forceNowV305
        );
    }

    async function ensureMetaSnapshotFreshV206(forceRefresh, silent) {
        const context = buildMetaLiveContext();
        return ensureDirectOrGuestContextV206(
            context,
            silent === true,
            forceRefresh === true
        );
    }

    async function ensureMetaSnapshotFreshForContextV206(context, forceRefresh, silent) {
        return ensureDirectOrGuestContextV206(
            context,
            silent === true,
            forceRefresh === true
        );
    }

    async function requestSharedMetaLiveRefreshV206() {
        if (isStaffDirectV206()) {
            const context = buildMetaLiveContext();
            return fetchMetaDirectContextV206(
                context,
                false,
                true
            );
        }

        const context = buildMetaLiveContext();
        return loadGuestSnapshotV206(context, false);
    }

    function rebuildReportFromDirectCacheV206() {
        let period;
        try { period = getMetaLivePeriod(); }
        catch (error) { return []; }

        COMPANIES.forEach(company => {
            const context = buildMetaLiveContextForCompany(company.id);
            const entry = getDirectCacheEntryV206(context, true);
            META_LIVE_REPORT_ROWS_BY_COMPANY[company.id] = entry && Array.isArray(entry.rows)
                ? entry.rows
                : [];
        });

        META_LIVE_REPORT_PERIOD_KEY = getMetaLivePeriodKey(period);
        rebuildMetaLiveReportData();
        scheduleMetaLiveReportRender();
        return META_LIVE_REPORT_DATA;
    }

    // =========================================================
    // V255 — BÁO CÁO MKT TỰ BẢO ĐẢM ĐỦ 4 CÔNG TY
    // - Dùng chung directCache/sessionStorage/IndexedDB + Apps Script cache 5 phút.
    // - Công ty còn cache hợp lệ: dùng ngay, KHÔNG gọi Meta.
    // - Công ty chưa có cache / cache hết hạn: gọi đúng công ty đó.
    // - Apps Script vẫn quyết định cache server 5 phút, nên nếu máy khác vừa gọi
    //   thì request này nhận cache hit thay vì gọi Meta lại.
    // - Khi Báo cáo MKT đang Dừng đồng bộ: tuyệt đối không gọi Meta.
    // =========================================================
    let marketingReportAllCompaniesPromiseV255 = null;
    let marketingReportLastCheckAtV255 = 0;
    const MARKETING_REPORT_CACHE_CHECK_INTERVAL_V255 = 5000;

    async function waitMarketingReportSyncReadyV255() {
        if (MARKETING_REPORT_SYNC_STATE_V254.loaded) {
            return MARKETING_REPORT_SYNC_STATE_V254;
        }

        try { bindMarketingReportSyncV254(); } catch (error) {}

        if (!db) db = getDatabase();
        if (!db) return MARKETING_REPORT_SYNC_STATE_V254;

        try {
            const snapshot = await db.ref(MARKETING_REPORT_SYNC_PATH_V254).once('value');
            MARKETING_REPORT_SYNC_STATE_V254 = normalizeMarketingReportSyncStateV254(snapshot.val());
            renderMarketingReportSyncControlsV254();
        } catch (error) {
            console.warn('V255 không đọc được trạng thái đồng bộ Báo cáo MKT:', error && error.message ? error.message : error);
        }

        return MARKETING_REPORT_SYNC_STATE_V254;
    }

    async function ensureMarketingReportAllCompaniesV255(silent) {
        if (marketingReportAllCompaniesPromiseV255) {
            return marketingReportAllCompaniesPromiseV255;
        }

        marketingReportAllCompaniesPromiseV255 = (async () => {
            const syncState = await waitMarketingReportSyncReadyV255();

            // V298: Báo Cáo chỉ dùng file Tài chính đã upload; không đi xuống bất kỳ nhánh Meta nào.
            const selectedDatasetV301 = getMarketingReportDatasetV301();
            return selectedDatasetV301 && Array.isArray(selectedDatasetV301.frozenRows) ? selectedDatasetV301.frozenRows : [];

            if (!isStaffDirectV206()) {
                legacyUnbindMetaLiveReportSnapshotsV206();
                COMPANIES.forEach(company => {
                    META_LIVE_REPORT_ROWS_BY_COMPANY[company.id] = [];
                });
                rebuildMetaLiveReportData();
                scheduleMetaLiveReportRender();
                return META_LIVE_REPORT_DATA;
            }

            legacyUnbindMetaLiveReportSnapshotsV206();

            const period = getMetaLivePeriod();
            const periodKey = getMetaLivePeriodKey(period);
            let changed = META_LIVE_REPORT_PERIOD_KEY !== periodKey;
            const failures = [];

            const jobs = COMPANIES.map(async company => {
                const context = buildMetaLiveContextForCompany(company.id);
                context.skipSupportLedgersV215 = true;

                const staleEntry = getDirectCacheEntryV206(context, true);
                let entry = getDirectCacheEntryV206(context, false);

                if (!entry) {
                    try {
                        entry = await fetchMetaDirectContextV206(
                            context,
                            true,
                            false
                        );
                    } catch (error) {
                        if (staleEntry && Array.isArray(staleEntry.rows)) {
                            entry = staleEntry;
                        } else {
                            failures.push({
                                company: company.id,
                                error: error && error.message ? error.message : String(error)
                            });
                        }
                    }
                }

                return {
                    company: company.id,
                    entry: entry || null
                };
            });

            const results = await Promise.all(jobs);

            results.forEach(result => {
                const nextRows = result.entry && Array.isArray(result.entry.rows)
                    ? result.entry.rows
                    : [];
                if (META_LIVE_REPORT_ROWS_BY_COMPANY[result.company] !== nextRows) {
                    META_LIVE_REPORT_ROWS_BY_COMPANY[result.company] = nextRows;
                    changed = true;
                }
            });

            META_LIVE_REPORT_PERIOD_KEY = periodKey;

            if (changed) {
                rebuildMetaLiveReportData();
                scheduleMetaLiveReportRender();
            }

            if (failures.length) {
                console.warn('V255 Báo cáo MKT chưa tải đủ công ty:', failures);
                if (!silent && typeof showToast === 'function') {
                    showToast(
                        `⚠️ Báo cáo MKT chưa tải được ${failures.map(item => item.company).join(', ')}. Các công ty còn lại vẫn dùng dữ liệu hiện có.`,
                        'warning'
                    );
                }
            }

            return META_LIVE_REPORT_DATA;
        })();

        try {
            return await marketingReportAllCompaniesPromiseV255;
        } finally {
            marketingReportAllCompaniesPromiseV255 = null;
            marketingReportLastCheckAtV255 = Date.now();
        }
    }

    async function refreshMetaLiveReportV206(forceRefresh, silent) {
        if (CURRENT_TAB !== 'report') return Promise.resolve(null);
        // V298: giữ API cũ để các call-site không lỗi, nhưng tuyệt đối không gọi Meta.
        await waitMarketingReportSyncReadyV255();
        const selectedDatasetV301 = getMarketingReportDatasetV301();
        return selectedDatasetV301 && Array.isArray(selectedDatasetV301.frozenRows)
            ? selectedDatasetV301.frozenRows
            : [];
    }

    function startMetaLiveAutoRefreshV206() {
        // V302: không còn chu kỳ 5 phút và không gọi nền theo timer.
        // Chỉ giữ listener visibility; khi người dùng quay lại tab sẽ lấy Meta mới.
        if (META_LIVE_TIMER) {
            clearInterval(META_LIVE_TIMER);
            META_LIVE_TIMER = null;
        }

        injectDirectCountdownStyleV208();
        startDirectCountdownV208();

        if (META_LIVE_VISIBILITY_BOUND) return;
        META_LIVE_VISIBILITY_BOUND = true;

        document.addEventListener('visibilitychange', () => {
            renderDirectCountdownV208();

            if (document.hidden) {
                legacyUnbindMetaLiveSnapshotV206();
                legacyUnbindMetaLiveReportSnapshotsV206();
                return;
            }

            // V305: quay lại tab chỉ lấy Meta mới khi dữ liệu hiện tại đã cũ >= 2 phút.
            // Nếu mới lấy dưới 2 phút thì dùng cache hiện có; không có timer nền.
            if (CURRENT_TAB === 'report') {
                // Báo Cáo dùng file Tài chính đã upload, tuyệt đối không gọi Meta.
                renderReportPreview();
                return;
            }

            if (isMetaLivePageVisible()) {
                refreshMetaLiveV206(false, true).catch(error => {
                    console.warn('Không cập nhật Meta khi quay lại tab:', error && error.message ? error.message : error);
                });
            }
        });
    }

    // V215: API dùng chung cho Trang chủ và các module khác.
    // Nó dùng CÙNG directCache/sessionStorage/IndexedDB nên Trang chủ gọi xong thì Ads
    // có thể dùng lại cùng company+kỳ mà không truyền payload qua Firebase.
    window.requestMetaSummaryCachedV215 = async function(options) {
        options = options || {};

        if (isMetaUnregisteredGoogleV286()) {
            showMetaUnregisteredDisabledV286(options.silent === true);
            const error = new Error(META_UNREGISTERED_TITLE_V286);
            error.code = 'MKT_META_LIVE_UNREGISTERED_GOOGLE_DENIED';
            throw error;
        }

        // Anonymous Guest vẫn dùng đúng cơ chế cũ: có thể ads:view nhưng không gọi Meta.
        if (!isStaffDirectV206()) {
            showMetaGuestDisabledV218(options.silent === true);
            const error = new Error(META_GUEST_DISABLED_TITLE_V218);
            error.code = 'MKT_META_LIVE_ANONYMOUS_GUEST_DISABLED';
            throw error;
        }

        const company = String(options.company || 'NNV').toUpperCase();
        const from = String(options.from || '');
        const to = String(options.to || '');
        if (!company || !from || !to) throw new Error('Thiếu company/from/to cho Meta V215.');
        const context = {
            company,
            period:{from,to},
            periodKey:`${from}_${to}`,
            requestKey:getMetaLiveRequestKey(company, from, to),
            skipSupportLedgersV215:options.skipSupportLedgers !== false
        };
        return fetchMetaDirectContextV206(
            context,
            options.silent !== false,
            options.force === true
        );
    };

    window.getMetaClientCachePolicyV215 = function(from, to) {
        return metaTemporalPolicyV215({from:String(from || ''), to:String(to || '')});
    };

    window.clearHistoricalMetaClientCacheV215 = async function(company, from, to) {
        const cid = String(company || '').toUpperCase();
        const f = String(from || '');
        const t = String(to || '');
        const requestKey = getMetaLiveRequestKey(cid, f, t);
        directCache.delete(requestKey);
        removeDirectSessionEntryV211(requestKey);
        return removeHistoricalRecordV215(requestKey, currentDirectOwnerUidV211());
    };

    // Export cho popup Theo dõi ngân sách và chẩn đoán.
    window.isMetaDirectStaffV206 = isStaffDirectV206;
    window.isMetaUnregisteredGoogleV286 = isMetaUnregisteredGoogleV286;
    window.showMetaUnregisteredDisabledV286 = showMetaUnregisteredDisabledV286;
    window.isMetaGuestBlockedV218 = isMetaGuestBlockedV218;
    window.isMetaGuestBlockedV217 = isMetaGuestBlockedV218; // alias tương thích
    window.isWorkspaceGoogleMetaSessionV218 = isWorkspaceGoogleSessionV218;
    window.isWorkspaceDomainMetaSessionV219 = isWorkspaceDomainSessionV219;
    window.showMetaGuestDisabledV218 = showMetaGuestDisabledV218;
    window.fetchMetaDirectContextV206 = fetchMetaDirectContextV206;
    window.getMetaDirectCacheStatusV206 = function() {
        return Array.from(directCache.values()).map(entry => ({
            company:entry.company,
            from:entry.period && entry.period.from,
            to:entry.period && entry.period.to,
            syncedAt:entry.syncedAt,
            serverCacheHit:!!(entry.cacheInfo && entry.cacheInfo.hit),
            ageMs:Date.now() - Number(entry.localStoredAt || entry.cachedAt || 0),
            remainingMs:Math.max(0, Number(entry.expiresAtLocal || 0) - Date.now()),
            remainingSeconds:Math.ceil(Math.max(0, Number(entry.expiresAtLocal || 0) - Date.now()) / 1000),
            rows:Array.isArray(entry.rows) ? entry.rows.length : 0
        }));
    };

    window.getMetaRangeGuardV212 = function(from, to) {
        return normalizeMetaApiPeriodV212(String(from || ''), String(to || getLocalIsoDate(new Date())));
    };


    window.getMetaNoSnapshotStatusV214 = function() {
        return {
            version:'V215_INDEXEDDB_NO_PERIOD_SNAPSHOT',
            staffDirect:isStaffDirectV206(),
            periodSnapshotRead:false,
            periodSnapshotWrite:false,
            guestSnapshotRead:false,
            budgetLedgerPath:`${META_LIVE_SNAPSHOT_ROOT}/{COMPANY}/${META_BUDGET_PERFORMANCE_NODE_V166}`,
            spendCheckpointPath:`${META_LIVE_SNAPSHOT_ROOT}/{COMPANY}/${META_SPEND_CHECKPOINT_NODE_V196}`,
            note:'Meta period data không đọc/ghi Firebase. Current=tạm trong sessionStorage 5 phút; historical=IndexedDB; sau cuối tháng +50h chốt lại Meta 1 lần. Có thể xóa child kỳ YYYY-MM-DD_YYYY-MM-DD nhưng giữ các node bắt đầu bằng _ nếu cần lịch sử ngân sách/checkpoint.'
        };
    };

    window.getMetaCountdownV208 = function() {
        const context = getDirectCountdownContextV208();
        const entry = context ? getDirectCacheEntryV206(context, true) : null;
        return {
            version:'V305_META_2_MIN_SMART_REFRESH',
            company:context ? context.company : '',
            from:context && context.period ? context.period.from : '',
            to:context && context.period ? context.period.to : '',
            remainingSeconds:null,
            cacheMode:'direct_smart_2min',
            syncedAt:entry ? entry.syncedAt : '',
            serverCacheHit:!!(entry && entry.cacheInfo && entry.cacheInfo.hit),
            rule:'Không countdown/auto-refresh nền. Quay lại tab hoặc mở lại khu vực chỉ gọi Meta nếu dữ liệu cũ >=2 phút; nút Cập nhật Meta luôn force trực tiếp.'
        };
    };

    // Ghi đè các entry point cũ. Các logic bảng/normalize/gom nhóm vẫn giữ nguyên.
    refreshMetaLive = refreshMetaLiveV206;
    ensureMetaSnapshotFresh = ensureMetaSnapshotFreshV206;
    ensureMetaSnapshotFreshForContext = ensureMetaSnapshotFreshForContextV206;
    requestSharedMetaLiveRefresh = requestSharedMetaLiveRefreshV206;
    refreshMetaLiveReport = refreshMetaLiveReportV206;
    startMetaLiveAutoRefresh = startMetaLiveAutoRefreshV206;

    window.refreshMetaLive = refreshMetaLiveV206;
    window.ensureMetaSnapshotFresh = ensureMetaSnapshotFreshV206;
    window.ensureMetaSnapshotFreshForContext = ensureMetaSnapshotFreshForContextV206;
    window.requestSharedMetaLiveRefresh = requestSharedMetaLiveRefreshV206;
    window.refreshMetaLiveReport = refreshMetaLiveReportV206;
    window.startMetaLiveAutoRefresh = startMetaLiveAutoRefreshV206;

    // V305: nút "Cập nhật Meta" là thao tác chủ động nên luôn ép lấy mới ngay.
    window.refreshMetaAdsLive = function() {
        return refreshMetaLiveV206(true, false).catch(error => {
            console.warn('Meta Live manual refresh:', error && error.message ? error.message : error);
            return null;
        });
    };


    // V302: legacy V202 đã có thể khởi tạo interval 5 phút trước khi patch Direct được cài.
    // Dừng interval đó ngay tại thời điểm cài V302 để bảo đảm không còn request nền theo chu kỳ.
    if (META_LIVE_TIMER) {
        clearInterval(META_LIVE_TIMER);
        META_LIVE_TIMER = null;
    }

    injectDirectCountdownStyleV208();
    startDirectCountdownV208();
})();

/* =========================================================
   V207 — LAZY META THEO PHẦN
   =========================================================
   - Mở NNV chỉ lấy SUMMARY của NNV. VN/KF/ABC không gọi Meta.
   - SUMMARY chỉ có dữ liệu cấp nhóm cần cho bảng chính.
   - Không tải ads[] ở bước mở công ty.
   - Khi người dùng bấm xem nhóm gốc/bài quảng cáo mới gọi ad_details
     cho đúng các adset đang cần xem.
   - Chi tiết bài có cache RAM 5 phút + cache chung Apps Script 5 phút.
   - Hiệu quả / Tài chính dùng chung summary đã có.
   - Báo cáo MKT không tự gọi công ty khác; chỉ dùng company đã có trong RAM.
   ========================================================= */
(function installMetaLazyV207(){
    const DETAIL_CLIENT_TTL_MS = 300000;
    const detailCache = new Map();
    const detailInFlight = new Map();
    const legacyShowMetaLiveOriginalRowsV207 = window.showMetaLiveOriginalRows;

    function getCurrentPeriodV207() {
        try {
            return getMetaLivePeriod();
        } catch (error) {
            const today = getLocalIsoDate(new Date());
            return {
                from:`${today.slice(0, 8)}01`,
                to:today
            };
        }
    }

    function getDetailContextV207(item) {
        const period = getCurrentPeriodV207();
        return {
            company:String(item && item.company || CURRENT_COMPANY || 'NNV').toUpperCase(),
            from:String(period.from || ''),
            to:String(period.to || '')
        };
    }

    function getOriginalRowsV207(item) {
        if (!item) return [];
        if (Array.isArray(item.original_adset_rows) && item.original_adset_rows.length) {
            return item.original_adset_rows;
        }

        const fallback = typeof buildMetaLiveOriginalRowFallback === 'function'
            ? buildMetaLiveOriginalRowFallback(item)
            : {
                adsetId:item.adsetId || '',
                fullName:item.fullName || '',
                employee:item.employee || '',
                adName:item.adName || '',
                status:item.status || '',
                spend:Number(item.spend || 0),
                messages:Number(item.messages || 0),
                result:Number(item.result || 0),
                ctr:Number(item.ctr || 0),
                freq:Number(item.freq || 0),
                ads:[]
            };

        item.original_adset_rows = [fallback];
        return item.original_adset_rows;
    }

    function getAdsetIdsV207(item) {
        return Array.from(new Set(
            getOriginalRowsV207(item)
                .map(row => String(row && row.adsetId || '').trim())
                .filter(Boolean)
        )).sort();
    }

    function buildDetailKeyV207(item) {
        const context = getDetailContextV207(item);
        return [
            context.company,
            context.from,
            context.to,
            getAdsetIdsV207(item).join(',')
        ].join('||');
    }

    function isDetailCacheFreshV207(entry) {
        return !!(
            entry &&
            (Date.now() - Number(entry.cachedAt || 0)) < DETAIL_CLIENT_TTL_MS
        );
    }

    function applyDetailsToItemV207(item, detailsByAdset, context) {
        if (!item) return item;

        const rows = getOriginalRowsV207(item);
        const allAds = [];

        rows.forEach(row => {
            const adsetId = String(row && row.adsetId || '').trim();
            const detail = detailsByAdset && detailsByAdset[adsetId]
                ? detailsByAdset[adsetId]
                : null;

            if (!detail) {
                if (!Array.isArray(row.ads)) row.ads = [];
                return;
            }

            const normalizedAds = normalizeMetaLiveAdDetails(
                detail.ads || [],
                {
                    from:context.from,
                    to:context.to
                }
            );

            row.ads = normalizedAds;
            row.adCount = normalizedAds.length;
            row.detailsLoaded = true;
            row.details_loaded = true;
            row.detailSyncedAt = detail.syncedAt || '';
            row.detailCacheHit = !!(detail.cacheInfo && detail.cacheInfo.hit);

            normalizedAds.forEach(ad => allAds.push(ad));
        });

        item.ads = allAds;
        item.adCount = allAds.length;
        item.detailsLoaded = true;
        item.details_loaded = true;
        item.detailSyncedAt = new Date().toISOString();

        // Sau khi tải chi tiết, sidebar hoạt động có thể hiển thị thêm trạng thái cấp bài.
        try { renderMetaSidebarActivity(); } catch (error) {}
        return item;
    }

    async function loadItemAdDetailsV207(item, silent) {
        if (!item) throw new Error('Không tìm thấy hàng Meta cần tải chi tiết.');

        const ids = getAdsetIdsV207(item);
        if (!ids.length) return item;

        const context = getDetailContextV207(item);
        const key = buildDetailKeyV207(item);
        const cached = detailCache.get(key);

        if (isDetailCacheFreshV207(cached)) {
            applyDetailsToItemV207(item, cached.detailsByAdset, context);
            return item;
        }

        if (detailInFlight.has(key)) {
            await detailInFlight.get(key);
            const after = detailCache.get(key);
            if (after) applyDetailsToItemV207(item, after.detailsByAdset, context);
            return item;
        }

        if (typeof window.requestMetaAdsLive !== 'function') {
            throw new Error('Cầu nối Meta chưa sẵn sàng.');
        }

        if (!silent) {
            showToast('⏳ Đang tải bài quảng cáo của nhóm được chọn...', 'success');
        }

        const promise = window.requestMetaAdsLive({
            mode:'ad_details',
            company:context.company,
            from:context.from,
            to:context.to,
            adsetIds:ids,
            force:false
        }).then(wrapper => {
            if (!wrapper || wrapper.success === false || !wrapper.data) {
                throw new Error(
                    wrapper && wrapper.error && wrapper.error.message
                        ? wrapper.error.message
                        : 'Meta không trả dữ liệu chi tiết bài quảng cáo.'
                );
            }

            const data = wrapper.data || {};
            const entry = {
                detailsByAdset:data.detailsByAdset || {},
                cachedAt:Date.now(),
                syncedAt:data.syncedAt || ''
            };

            detailCache.set(key, entry);
            return entry;
        }).finally(() => {
            detailInFlight.delete(key);
        });

        detailInFlight.set(key, promise);
        const entry = await promise;
        applyDetailsToItemV207(item, entry.detailsByAdset, context);
        return item;
    }

    window.loadMetaAdDetailsV207 = loadItemAdDetailsV207;

    // Ghi đè duy nhất thao tác mở popup nhóm/bài. Bảng chính vẫn dùng toàn bộ logic gom cũ.
    window.showMetaLiveOriginalRows = async function(rowKey) {
        const allRows = Array.isArray(META_LIVE_DATA) ? META_LIVE_DATA : [];
        const item = allRows.find(row => getMetaLiveRowKey(row) === String(rowKey || ''));

        if (!item) {
            showToast('Không tìm thấy dữ liệu nhóm quảng cáo cần xem.', 'error');
            return;
        }

        try {
            const user = getMetaLiveAuthUser();
            const canDirect = !!(
                user &&
                user.isAnonymous !== true
            );

            // V220: chỉ Anonymous Guest bị chặn chi tiết. Role/UI tạm thời không được
            // dùng để quyết định Meta; backend là lớp xác minh cuối cùng.
            if (canDirect) {
                await loadItemAdDetailsV207(item, false);
            }

            return legacyShowMetaLiveOriginalRowsV207(rowKey);
        } catch (error) {
            console.error('Meta Lazy V207 detail:', error);
            showToast(
                'Không tải được chi tiết bài quảng cáo: ' +
                (error && error.message ? error.message : error),
                'error'
            );
        }
    };

    window.getMetaLazyV207Status = function() {
        let period = null;
        try { period = getMetaLivePeriod(); } catch (error) {}

        return {
            version:'V211_F5_PERSIST_REALTIME_COUNTDOWN',
            currentCompany:String(CURRENT_COMPANY || ''),
            currentTab:String(CURRENT_TAB || ''),
            period:period,
            mainRows:Array.isArray(META_LIVE_DATA) ? META_LIVE_DATA.length : 0,
            detailCache:Array.from(detailCache.entries()).map(([key, entry]) => ({
                key,
                ageMs:Date.now() - Number(entry.cachedAt || 0),
                adsets:Object.keys(entry.detailsByAdset || {}).length
            })),
            rule:'Chỉ công ty đang mở gọi summary; bài quảng cáo chỉ gọi khi mở chi tiết.'
        };
    };
})();


// ===== V213 DIAGNOSTIC: MANUAL FIXED BUDGET CONTINUATION =====
try {
    window.getManualBudgetContinuationStatusV213 = function(){
        return {
            version:'V213',
            company:String(typeof CURRENT_COMPANY !== 'undefined' ? CURRENT_COMPANY : ''),
            description:'Ngân sách sau thủ công tạo mốc tiếp nối đến ngân sách Meta hiện tại'
        };
    };
} catch(e) {}

/* =========================================================
   V221 — MOBILE SCOPE TABS VISIBILITY FIX
   Tổng quan / Marketing / Theo dõi ngân sách luôn nằm trên header bảng.
   Mobile dùng hàng cuộn ngang thay vì ép 3 cột quá hẹp.
   ========================================================= */
(function installAdsV221MobileScopeFix() {
    if (document.getElementById('ads-v221-mobile-scope-fix')) return;
    const style = document.createElement('style');
    style.id = 'ads-v221-mobile-scope-fix';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();



/* =========================================================
   V222 — ADS HEADER / SCOPE / MOBILE META TOOLBAR FINAL OVERRIDE
   - Tiêu đề nằm riêng hàng trên, ba scope tab nằm riêng hàng dưới.
   - Ba tab luôn cùng một hàng ở Performance và Finance.
   - Desktop search/action không được che tab Theo dõi ngân sách.
   - Mobile status Meta + countdown cùng một hàng; nút refresh xuống hàng kế.
   ========================================================= */
(function installAdsV222FinalLayoutFix(){
    if (document.getElementById('ads-v222-final-layout-fix')) return;
    const style = document.createElement('style');
    style.id = 'ads-v222-final-layout-fix';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();


/* =========================================================
   V223 — SCOPE TABS + HEADER ACTIONS FINAL LAYOUT
   - Desktop Performance: title + 3 scope tabs cùng hàng; search bên phải, không che tab.
   - Desktop Finance: title + 3 scope tabs cùng hàng; Lịch sử xuất + Xuất Excel cùng hàng bên phải.
   - Mobile: title ở trên; 3 scope tabs luôn đúng một hàng; action buttons luôn đúng một hàng.
   - Ép hiện đủ cả 3 tab kể cả khi legacy responsive CSS còn tồn tại.
   ========================================================= */
(function installAdsV223ScopeHeaderLayout(){
    if (document.getElementById('ads-v223-scope-header-layout')) return;
    const style = document.createElement('style');
    style.id = 'ads-v223-scope-header-layout';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();


/* =========================================================
   V224 — MOBILE PERFORMANCE TABS + FINANCE COUNTDOWN + DOT LOADING
   - Mobile Meta Live:
     + Hàng 1: Danh sách bài quảng cáo | Tổng quan.
     + Hàng 2: Marketing | Theo dõi ngân sách.
   - Mobile Finance: countdown nằm cùng header "TÀI CHÍNH QUẢNG CÁO / Chi phí, doanh thu và ROAS".
   - Khôi phục animation ba chấm vì CSS ổn định chart cũ đặt animation-duration:0s !important.
   ========================================================= */
(function installAdsV224MobileLayoutLoadingFix(){
    if (document.getElementById('ads-v224-mobile-layout-loading-fix')) return;

    const style = document.createElement('style');
    style.id = 'ads-v224-mobile-layout-loading-fix';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

/* V225 — mobile tooltip + dot animation verification flag */
window.ADS_V225_MOBILE_FIX = {
    tooltipDisabledOnMobile: isAdsMobileChartViewportV225(),
    dotAnimation: 'adsMetaDotV225'
};



/* =========================================================
   V226 — FINANCE BUDGET MODE ACTIONS
   - Trong Tài chính > Theo dõi ngân sách: ẩn 2 nút chung Lịch sử xuất / Xuất Excel.
   - Giữ nguyên 3 nút riêng của Budget Performance: Thêm thay đổi NS / Làm mới / Xuất Excel.
   ========================================================= */
(function installAdsV226FinanceBudgetActionsFix(){
    if (document.getElementById('ads-v226-finance-budget-actions-fix')) return;
    const style = document.createElement('style');
    style.id = 'ads-v226-finance-budget-actions-fix';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.ADS_V226_BUDGET_FIX = {
    normalizedCacheBudgetSafe:true,
    zeroBudgetGuard:true,
    financeBudgetGlobalExportHidden:true
};


/* =========================================================
   V233 — META LIVE TỔNG QUAN: 3 CHẤM LOADING
   Rule ổn định chart cũ ép animation-duration:0s!important cho mọi phần tử
   trong .ads-chart-card. Selector dưới đây chỉ mở lại animation cho 3 chấm
   trạng thái Meta Live Tổng quan, không tác động chart hay tab ngân sách.
   ========================================================= */
(function installAdsV233OverviewDotsFix(){
    if (document.getElementById('ads-v233-overview-dots-fix')) return;
    const style = document.createElement('style');
    style.id = 'ads-v233-overview-dots-fix';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.ADS_V233_NATIVE_DATE_OVERVIEW_DOTS_FIX = {
    nativeDate:true,
    noDateClampWriteback:true,
    overviewDotsAnimation:'adsMetaOverviewDotV233'
};


/* =========================================================
   V244 — EMPLOYEE/GROUP SMART RANGE FILTER + TABLE HEADER ALIGNMENT
   ========================================================= */
(function installBudgetV243UiFix(){
    const id='ads-v243-budget-group-filter-style';
    const old=document.getElementById(id);
    if(old) old.remove();
    const style=document.createElement('style');
    style.id=id;
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();



/* =========================================================
   V244 SMART SEARCH + HEADER ALIGNMENT FINAL OVERRIDE
   ========================================================= */
(function installBudgetV243SearchFinalFix(){
    if (document.getElementById('ads-v243-budget-group-search-final-style')) return;
    const style=document.createElement('style');
    style.id='ads-v243-budget-group-search-final-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();


/* =========================================================
   V244 — SMART SEARCH TYPE BADGES (NHÂN VIÊN / NHÓM)
   ========================================================= */
(function installBudgetV244SmartSearchStyle(){
    if (document.getElementById('ads-v244-budget-smart-search-style')) return;
    const style=document.createElement('style');
    style.id='ads-v244-budget-smart-search-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.ADS_V244_SMART_BUDGET_FILTER = {
    version:'V244_EMPLOYEE_GROUP_SMART_FILTER',
    employeeScope:'all_grouped_rows_for_employee',
    groupScope:'one_grouped_row_only',
    revenueAllocation:'global_before_filter'
};

/* ===== V254 REPORT SYNC TOGGLE READY ===== */
window.MKT_ADS_REPORT_SYNC_VERSION = 'V254_REPORT_SYNC_TOGGLE';


/* =========================================================
   V260 — META LIVE PRODUCT MIX ANALYTICS LAYOUT
   ========================================================= */
(function installAdsV260PerformanceAnalyticsStyle(){
    if (document.getElementById('ads-v260-performance-analytics-style')) return;

    const style = document.createElement('style');
    style.id = 'ads-v260-performance-analytics-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.ADS_V260_PERFORMANCE_ANALYTICS = {
    version:'V260_PRODUCT_MIX_ANALYTICS',
    compareDefault:'month',
    compareYesterday:true,
    productShare:'spend',
    miniCharts:['purchases','purchase_to_message']
};


/* =========================================================
   V261 — HARD DOM LAYOUT FIX FOR META LIVE
   Chart/analytics top row + ad table below.
   ========================================================= */
(function installAdsV261HardPerformanceLayout(){
    if (document.getElementById('ads-v261-hard-performance-layout')) return;

    const style = document.createElement('style');
    style.id = 'ads-v261-hard-performance-layout';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.ADS_V261_LAYOUT_STATUS = {
    version:'V261_HARD_DOM_LAYOUT',
    tablePosition:'below',
    analyticsPosition:'right',
    productChart:'doughnut'
};


/* =========================================================
   V262 — 46/54 ANALYTICS + PRODUCT NAME + BUDGET SCOPE FIX
   ========================================================= */
(function installAdsV262PerformanceRefinement(){
    if (document.getElementById('ads-v262-performance-refinement')) return;

    const style = document.createElement('style');
    style.id = 'ads-v262-performance-refinement';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.ADS_V262_REFINEMENT = {
    version:'V262_46_54_PRODUCT_NAME_BUDGET_SCOPE_FIX',
    topLayout:{performance:46,analytics:54},
    productPrimary:'name',
    productSecondary:'sku',
    budgetOverviewTableHidden:true
};


/* =========================================================
   V263 — EXECUTIVE MONTHLY BUDGET PLAN
   ========================================================= */
(function installAdsV263BudgetPlanStyle(){
    if (document.getElementById('ads-v263-budget-plan-style')) return;

    const style = document.createElement('style');
    style.id = 'ads-v263-budget-plan-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.MKT_MARKETING_BUDGET_V263 = {
    refresh:window.refreshMarketingBudgetPlanV263,
    openEditor:window.openMarketingBudgetPlanEditorV263,
    changeMonth:window.changeMarketingBudgetPlanMonthV295,
    getPeriod:marketingBudgetMonthPeriodV263,
    state:MARKETING_BUDGET_PLAN_STATE_V263,
    version:'V295_BUDGET_MONTH_SELECTOR'
};


/* =========================================================
   V265 — KH & BC SUBTABS
   ========================================================= */
(function installAdsV265KhbcStyle(){
    if (document.getElementById('ads-v265-khbc-style')) return;

    const style = document.createElement('style');
    style.id = 'ads-v265-khbc-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.ADS_V265_KHBC = {
    version:'V265_KH_BC',
    getView:window.getKhbcViewV265,
    switchView:window.switchKhbcViewV265
};


/* =========================================================
   V270 — PRODUCT NOTES / BUDGET CHART / BUDGET SEARCH / LIVE KPI
   ========================================================= */
(function installAdsV270UiRefinement(){
    if (document.getElementById('ads-v270-ui-refinement')) return;

    const style = document.createElement('style');
    style.id = 'ads-v270-ui-refinement';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.ADS_V270_UI_REFINEMENT = {
    version:'V270_UI_REFINEMENT',
    productLegendScroll:false,
    productTextWrap:true,
    budgetChartCompact:true,
    budgetSearchWide:true,
    metaSpendLiveBadge:true
};


/* =========================================================
   V271 — DYNAMIC MATRIX SETTINGS
   ========================================================= */
const ADS_MATRIX_SETTINGS_ROOT_V271 = 'ads_matrix_settings_v1/current';

const MATRIX_LEGACY_DEFAULTS_V271 = Object.freeze({
    ctrMin:1,
    crMin:20,
    freqMax:3,
    cpaMax:50000,
    cpmMax:null,
    roasMin:5,
    testBudget:500000
});

const MATRIX_SETTINGS_STATE_V271 = {
    bound:false,
    ref:null,
    loaded:false,
    exists:false,
    settings:Object.assign({},MATRIX_LEGACY_DEFAULTS_V271),
    updatedAt:0,
    updatedByName:'',
    updatedByEmail:''
};

function normalizeMatrixThresholdNumberV271(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) return null;

    const number = Number(value);
    return Number.isFinite(number) && number >= 0
        ? number
        : null;
}

function normalizeMatrixSettingsV271(raw, exists) {
    raw = raw || {};
    const source = raw.thresholds || {};

    if (!exists) {
        return Object.assign({},MATRIX_LEGACY_DEFAULTS_V271);
    }

    return {
        ctrMin:normalizeMatrixThresholdNumberV271(source.ctrMin),
        crMin:normalizeMatrixThresholdNumberV271(source.crMin),
        freqMax:normalizeMatrixThresholdNumberV271(source.freqMax),
        cpaMax:normalizeMatrixThresholdNumberV271(source.cpaMax),
        cpmMax:normalizeMatrixThresholdNumberV271(source.cpmMax),
        roasMin:normalizeMatrixThresholdNumberV271(source.roasMin),
        testBudget:normalizeMatrixThresholdNumberV271(source.testBudget)
    };
}

function canEditMatrixSettingsV271() {
    try {
        if (
            window.MKTRBAC &&
            typeof window.MKTRBAC.canEdit === 'function' &&
            window.MKTRBAC.canEdit('ads')
        ) return true;
    } catch (error) {}

    try {
        if (
            window.MKTRBAC &&
            typeof window.MKTRBAC.isAdmin === 'function' &&
            window.MKTRBAC.isAdmin()
        ) return true;
    } catch (error) {}

    return String(
        window.MKT_PERMISSIONS &&
        window.MKT_PERMISSIONS.ads ||
        ''
    ).toLowerCase() === 'edit';
}

function matrixThresholdConfiguredV271(value) {
    return (
        value !== null &&
        value !== undefined &&
        Number.isFinite(Number(value))
    );
}

function matrixThresholdSummaryV271(settings) {
    settings = settings || MATRIX_SETTINGS_STATE_V271.settings || {};

    const labels = [];
    if (matrixThresholdConfiguredV271(settings.ctrMin)) {
        labels.push(`CTR ≥ ${Number(settings.ctrMin)}%`);
    }
    if (matrixThresholdConfiguredV271(settings.crMin)) {
        labels.push(`Mua/Tin ≥ ${Number(settings.crMin)}%`);
    }
    if (matrixThresholdConfiguredV271(settings.freqMax)) {
        labels.push(`F ≤ ${Number(settings.freqMax)}`);
    }
    if (matrixThresholdConfiguredV271(settings.cpaMax)) {
        labels.push(`Giá/Mua ≤ ${new Intl.NumberFormat('vi-VN').format(Number(settings.cpaMax))}đ`);
    }
    if (matrixThresholdConfiguredV271(settings.cpmMax)) {
        labels.push(`Giá/Tin ≤ ${new Intl.NumberFormat('vi-VN').format(Number(settings.cpmMax))}đ`);
    }
    if (matrixThresholdConfiguredV271(settings.roasMin)) {
        labels.push(`ROAS ≥ ${Number(settings.roasMin)}x`);
    }
    if (matrixThresholdConfiguredV271(settings.testBudget)) {
        labels.push(`Test < ${new Intl.NumberFormat('vi-VN').format(Number(settings.testBudget))}đ`);
    }

    return labels;
}

function bindMatrixSettingsV271() {
    if (!db) db = getDatabase();
    if (!db) return;

    if (
        MATRIX_SETTINGS_STATE_V271.bound &&
        MATRIX_SETTINGS_STATE_V271.ref
    ) return;

    MATRIX_SETTINGS_STATE_V271.ref = db.ref(
        ADS_MATRIX_SETTINGS_ROOT_V271
    );
    MATRIX_SETTINGS_STATE_V271.bound = true;

    MATRIX_SETTINGS_STATE_V271.ref.on(
        'value',
        snapshot => {
            const exists = snapshot.exists();
            const raw = snapshot.val() || {};

            MATRIX_SETTINGS_STATE_V271.exists = exists;
            MATRIX_SETTINGS_STATE_V271.loaded = true;
            MATRIX_SETTINGS_STATE_V271.settings =
                normalizeMatrixSettingsV271(raw,exists);
            MATRIX_SETTINGS_STATE_V271.updatedAt =
                Number(raw.updatedAt || 0);
            MATRIX_SETTINGS_STATE_V271.updatedByName =
                String(raw.updatedByName || '');
            MATRIX_SETTINGS_STATE_V271.updatedByEmail =
                String(raw.updatedByEmail || '');

            renderMatrixSettingsControlsV271();

            if (CURRENT_TAB === 'trend') {
                try { applyFilters(); } catch (error) {
                    console.warn(
                        'Không cập nhật được Ma trận sau khi đổi ngưỡng V271:',
                        error && error.message ? error.message : error
                    );
                }
            }
        },
        error => {
            console.warn(
                'Không đọc được ngưỡng Ma trận V271:',
                error && error.message ? error.message : error
            );
            MATRIX_SETTINGS_STATE_V271.loaded = true;
            renderMatrixSettingsControlsV271();
        }
    );
}

function setMatrixInputValueV271(id,value) {
    const input = document.getElementById(id);
    if (!input) return;

    input.value = matrixThresholdConfiguredV271(value)
        ? String(value)
        : '';
}

function renderMatrixSettingsControlsV271() {
    const settings = MATRIX_SETTINGS_STATE_V271.settings || {};
    const canEdit = canEditMatrixSettingsV271();

    setMatrixInputValueV271('matrix-ctr-min-v271',settings.ctrMin);
    setMatrixInputValueV271('matrix-cr-min-v271',settings.crMin);
    setMatrixInputValueV271('matrix-freq-max-v271',settings.freqMax);
    setMatrixInputValueV271('matrix-cpa-max-v271',settings.cpaMax);
    setMatrixInputValueV271('matrix-cpm-max-v271',settings.cpmMax);
    setMatrixInputValueV271('matrix-roas-min-v271',settings.roasMin);
    setMatrixInputValueV271('matrix-test-budget-v271',settings.testBudget);

    [
        'matrix-ctr-min-v271',
        'matrix-cr-min-v271',
        'matrix-freq-max-v271',
        'matrix-cpa-max-v271',
        'matrix-cpm-max-v271',
        'matrix-roas-min-v271',
        'matrix-test-budget-v271'
    ].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.disabled = !canEdit;
        input.title = canEdit
            ? 'Chỉnh ngưỡng rồi bấm Lưu & áp dụng'
            : 'Tài khoản chỉ được xem ngưỡng Ma trận';
    });

    const saveBtn = document.getElementById(
        'matrix-settings-save-v271'
    );
    if (saveBtn) {
        saveBtn.style.display = canEdit
            ? 'inline-flex'
            : 'none';
    }

    const status = document.getElementById(
        'matrix-settings-status-v271'
    );
    if (status) {
        if (!MATRIX_SETTINGS_STATE_V271.loaded) {
            status.textContent = 'Đang tải...';
            status.className =
                'ads-matrix-settings-status-v271 is-loading';
        } else if (!canEdit) {
            status.textContent = 'Chỉ xem';
            status.className =
                'ads-matrix-settings-status-v271 is-view';
        } else if (!MATRIX_SETTINGS_STATE_V271.exists) {
            status.textContent = 'Mặc định hiện tại';
            status.className =
                'ads-matrix-settings-status-v271 is-default';
        } else {
            status.textContent = 'Đang áp dụng';
            status.className =
                'ads-matrix-settings-status-v271 is-ready';
        }
    }

    const summary = document.getElementById(
        'matrix-active-rule-summary-v271'
    );
    if (summary) {
        const labels = matrixThresholdSummaryV271(settings);
        summary.textContent = labels.length
            ? `Đang dùng ${labels.length} điều kiện: ${labels.join(' · ')}`
            : 'Không có điều kiện nào đang áp dụng.';
    }
}

function readMatrixInputV271(id) {
    const input = document.getElementById(id);
    if (!input) return null;

    const raw = String(input.value || '').trim();
    if (!raw) return null;

    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(
            'Ngưỡng phải là số lớn hơn hoặc bằng 0.'
        );
    }

    return value;
}

window.saveMatrixSettingsV271 = async function() {
    if (!canEditMatrixSettingsV271()) {
        if (typeof showToast === 'function') {
            showToast(
                'Chỉ Admin hoặc tài khoản có quyền Chỉnh sửa Quảng cáo mới được cập nhật ngưỡng Ma trận.',
                'error'
            );
        }
        return false;
    }

    if (!db) db = getDatabase();
    if (!db) {
        if (typeof showToast === 'function') {
            showToast('Firebase Database chưa sẵn sàng.','error');
        }
        return false;
    }

    let values;
    try {
        values = {
            ctrMin:readMatrixInputV271('matrix-ctr-min-v271'),
            crMin:readMatrixInputV271('matrix-cr-min-v271'),
            freqMax:readMatrixInputV271('matrix-freq-max-v271'),
            cpaMax:readMatrixInputV271('matrix-cpa-max-v271'),
            cpmMax:readMatrixInputV271('matrix-cpm-max-v271'),
            roasMin:readMatrixInputV271('matrix-roas-min-v271'),
            testBudget:readMatrixInputV271('matrix-test-budget-v271')
        };
    } catch (error) {
        if (typeof showToast === 'function') {
            showToast(error.message || String(error),'error');
        }
        return false;
    }

    const thresholds = {};
    Object.keys(values).forEach(key => {
        if (matrixThresholdConfiguredV271(values[key])) {
            thresholds[key] = Number(values[key]);
        }
    });

    const authUser =
        window.sysAuth &&
        window.sysAuth.currentUser;

    const payload = {
        version:1,
        thresholds,
        updatedAt:firebase.database.ServerValue.TIMESTAMP,
        updatedByUid:String(authUser && authUser.uid || ''),
        updatedByEmail:String(authUser && authUser.email || ''),
        updatedByName:String(
            window.myIdentity ||
            authUser && authUser.displayName ||
            authUser && authUser.email ||
            ''
        )
    };

    try {
        await db.ref(ADS_MATRIX_SETTINGS_ROOT_V271).set(payload);

        if (typeof showToast === 'function') {
            const count = Object.keys(thresholds).length;
            showToast(
                count
                    ? `✅ Đã lưu và áp dụng ${count} ngưỡng Ma trận.`
                    : '✅ Đã lưu. Hiện Ma trận không áp dụng ngưỡng đánh giá nào.',
                'success'
            );
        }

        return true;
    } catch (error) {
        console.error('Lưu Matrix Settings V271:',error);
        if (typeof showToast === 'function') {
            showToast(
                `Không lưu được ngưỡng Ma trận: ${
                    error && error.message
                        ? error.message
                        : error
                }`,
                'error'
            );
        }
        return false;
    }
};

/*
 * Override hàm cũ.
 * Nếu chưa có record Firebase: giữ đúng ngưỡng legacy để không làm đổi kết quả
 * ngay sau khi nâng cấp. Sau khi user Lưu lần đầu, ô trống = null = không áp dụng.
 */
function getMatrixThresholds(fullData) {
    bindMatrixSettingsV271();

    const s =
        MATRIX_SETTINGS_STATE_V271.settings ||
        MATRIX_LEGACY_DEFAULTS_V271;

    return {
        ctrMin:s.ctrMin,
        crMin:s.crMin,
        freqMax:s.freqMax,
        cpaMax:s.cpaMax,
        cpmMax:s.cpmMax,
        roasMin:s.roasMin,
        testBudget:s.testBudget,

        // Alias tương thích code cũ.
        targetCPA:matrixThresholdConfiguredV271(s.cpaMax)
            ? Number(s.cpaMax)
            : 0
    };
}

function matrixCriterionV271(
    key,
    label,
    enabled,
    actual,
    threshold,
    pass,
    comparator,
    dataReady
) {
    return {
        key,
        label,
        enabled:!!enabled,
        actual:Number(actual || 0),
        threshold:Number(threshold || 0),
        pass:!!pass,
        comparator:String(comparator || ''),
        dataReady:dataReady !== false
    };
}

function getSystemDiagnosis(
    spend,
    cpa,
    cpm,
    roas,
    ctr,
    freq,
    cr,
    thresholds,
    hasRevenue
) {
    thresholds = thresholds || getMatrixThresholds();

    const formatNumber = num =>
        new Intl.NumberFormat('vi-VN').format(
            Number(num || 0)
        );

    if (Number(spend || 0) === 0) {
        return {
            color:'rgba(153, 153, 153, 0.7)',
            border:'#999999',
            label:'⏳ CHƯA DATA',
            htmlBadge:
                '<div class="diag-btn"><span style="color:#666; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px;">⏳ CHƯA DATA</span></div>',
            adStatusObj:{
                label:'⏳ CHƯA CÓ DỮ LIỆU',
                reason:'Chiến dịch chưa tiêu tiền hoặc vừa lên xong.',
                action:'Chờ Facebook phân phối thêm.'
            }
        };
    }

    const testEnabled =
        matrixThresholdConfiguredV271(
            thresholds.testBudget
        );

    const isLearning =
        testEnabled &&
        Number(spend || 0) <
        Number(thresholds.testBudget || 0);

    const criteria = [
        matrixCriterionV271(
            'CTR',
            'CTR',
            matrixThresholdConfiguredV271(thresholds.ctrMin),
            ctr,
            thresholds.ctrMin,
            Number(ctr || 0) >= Number(thresholds.ctrMin || 0),
            'min',
            true
        ),
        matrixCriterionV271(
            'CHỐT SALE',
            'Mua/Tin',
            matrixThresholdConfiguredV271(thresholds.crMin),
            cr,
            thresholds.crMin,
            Number(cr || 0) >= Number(thresholds.crMin || 0),
            'min',
            true
        ),
        matrixCriterionV271(
            'TẦN SUẤT',
            'Tần suất',
            matrixThresholdConfiguredV271(thresholds.freqMax),
            freq,
            thresholds.freqMax,
            Number(freq || 0) === 0 ||
            Number(freq || 0) <= Number(thresholds.freqMax || 0),
            'max',
            true
        ),
        matrixCriterionV271(
            'GIÁ/MUA',
            'Giá/Mua',
            matrixThresholdConfiguredV271(thresholds.cpaMax),
            cpa,
            thresholds.cpaMax,
            Number(cpa || 0) > 0 &&
            Number(cpa || 0) <= Number(thresholds.cpaMax || 0),
            'max',
            true
        ),
        matrixCriterionV271(
            'GIÁ/TIN',
            'Giá/Tin',
            matrixThresholdConfiguredV271(thresholds.cpmMax),
            cpm,
            thresholds.cpmMax,
            Number(cpm || 0) > 0 &&
            Number(cpm || 0) <= Number(thresholds.cpmMax || 0),
            'max',
            true
        ),
        matrixCriterionV271(
            'ROAS',
            'ROAS',
            matrixThresholdConfiguredV271(thresholds.roasMin),
            roas,
            thresholds.roasMin,
            Number(roas || 0) >= Number(thresholds.roasMin || 0),
            'min',
            hasRevenue === true
        )
    ];

    const configuredCriteria =
        criteria.filter(item => item.enabled);

    const evaluatedCriteria =
        configuredCriteria.filter(
            item => item.dataReady
        );

    const failed =
        evaluatedCriteria.filter(
            item => !item.pass
        );

    const passed =
        evaluatedCriteria.filter(
            item => item.pass
        );

    const funnelFails =
        failed.map(item => item.key);

    const failCount = failed.length;
    const evaluatedCount = evaluatedCriteria.length;
    const passCount = passed.length;
    const failRatio =
        evaluatedCount > 0
            ? failCount / evaluatedCount
            : 0;

    const roasCriterion =
        evaluatedCriteria.find(
            item => item.key === 'ROAS'
        );

    const roasPass =
        !!(roasCriterion && roasCriterion.pass);

    let tooltipList = '';

    if (isLearning) {
        tooltipList +=
            `<li style="color:#F2C94C; list-style:none; font-weight:bold; margin-bottom:8px;">👉 Đang Test Ngân Sách (${formatNumber(spend)}đ / mốc ${formatNumber(thresholds.testBudget)}đ)</li>`;
    }

    criteria.forEach(item => {
        if (!item.enabled) return;

        if (
            item.key === 'ROAS' &&
            !item.dataReady
        ) {
            tooltipList +=
                '<li style="color:#B0BEC5"><b>ROAS:</b> Đang áp dụng nhưng chưa có dữ liệu doanh thu để chấm điều kiện này.</li>';
            return;
        }

        const goodColor =
            item.pass ? '#2ECC71' : '#E74C3C';

        let actualText = '';
        let thresholdText = '';

        if (
            item.key === 'GIÁ/MUA' ||
            item.key === 'GIÁ/TIN'
        ) {
            actualText =
                `${formatNumber(item.actual)}đ`;
            thresholdText =
                `${formatNumber(item.threshold)}đ`;
        } else if (
            item.key === 'CTR' ||
            item.key === 'CHỐT SALE'
        ) {
            actualText =
                `${Number(item.actual).toFixed(2)}%`;
            thresholdText =
                `${Number(item.threshold)}%`;
        } else if (item.key === 'ROAS') {
            actualText =
                `${Number(item.actual).toFixed(2)}x`;
            thresholdText =
                `${Number(item.threshold)}x`;
        } else {
            actualText =
                Number(item.actual).toFixed(2);
            thresholdText =
                String(Number(item.threshold));
        }

        const sign =
            item.comparator === 'min'
                ? '≥'
                : '≤';

        tooltipList +=
            `<li style="color:${goodColor}"><b>${item.label} (${actualText}):</b> ${
                item.pass ? 'Đạt' : 'Chưa đạt'
            } ngưỡng ${sign} ${thresholdText}.</li>`;
    });

    let label;
    let badgeStyle;
    let color;
    let border;
    let reason;
    let action;

    if (isLearning) {
        label = '⏳ MÁY HỌC (Đang Test)';
        badgeStyle =
            'color:#666; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #999;';
        color = 'rgba(153, 153, 153, 0.7)';
        border = '#999999';
        reason =
            `Chưa tiêu qua Mốc ngân sách test ${formatNumber(thresholds.testBudget)}đ.`;
        action =
            'Chưa dùng các điều kiện khác để kết luận tắt. Tiếp tục theo dõi đến khi qua mốc test.';
    } else if (!configuredCriteria.length) {
        label = '⚙️ CHƯA CẤU HÌNH';
        badgeStyle =
            'color:#5f6368; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #bdc1c6;';
        color = 'rgba(95, 99, 104, 0.55)';
        border = '#5f6368';
        reason =
            'Không có điều kiện đánh giá nào đang được áp dụng.';
        action =
            'Người có quyền Chỉnh sửa Quảng cáo hãy nhập ngưỡng cần dùng rồi bấm Lưu & áp dụng.';
    } else if (!evaluatedCount) {
        label = '⏳ CHƯA ĐỦ DATA';
        badgeStyle =
            'color:#5f6368; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #bdc1c6;';
        color = 'rgba(95, 99, 104, 0.55)';
        border = '#5f6368';
        reason =
            'Các điều kiện đang bật chưa có đủ dữ liệu để đánh giá.';
        action =
            'Chờ bổ sung dữ liệu cần thiết rồi hệ thống sẽ tự đánh giá lại.';
    } else if (failCount === 0) {
        label = '⭐ TỐT (Hoàn hảo)';
        badgeStyle =
            'color:#0f9d58; font-weight:bold; background:#e6f4ea; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #0f9d58;';
        color = 'rgba(15, 157, 88, 0.7)';
        border = '#0f9d58';
        reason =
            `Đạt ${passCount}/${evaluatedCount} điều kiện đang được áp dụng.`;
        action =
            'Giữ và có thể cân nhắc scale theo nguyên tắc ngân sách hiện hành.';
    } else if (failCount === 1 || failRatio <= 0.25) {
        label = '🚀 TIỀM NĂNG LV1';
        badgeStyle =
            'color:#f4b400; font-weight:bold; background:#fef7e0; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #f4b400;';
        color = 'rgba(244, 180, 0, 0.7)';
        border = '#f4b400';
        reason =
            `Đạt ${passCount}/${evaluatedCount}; đang hụt ${funnelFails.join(', ')}.`;
        action =
            matrixActionFromFailuresV271(funnelFails,false);
    } else if (failRatio <= 0.5) {
        label = '⚡ CẦN TỐI ƯU';
        badgeStyle =
            'color:#ff6d00; font-weight:bold; background:#fff3e0; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #ff6d00;';
        color = 'rgba(255, 109, 0, 0.7)';
        border = '#ff6d00';
        reason =
            `Rớt ${failCount}/${evaluatedCount} điều kiện: ${funnelFails.join(', ')}.`;
        action =
            matrixActionFromFailuresV271(funnelFails,false);
    } else if (roasPass) {
        label = '⚠️ KÉM (ROAS cứu)';
        badgeStyle =
            'color:#7e57c2; font-weight:bold; background:#ede7f6; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #7e57c2;';
        color = 'rgba(126, 87, 194, 0.7)';
        border = '#7e57c2';
        reason =
            `Rớt ${failCount}/${evaluatedCount} điều kiện nhưng ROAS vẫn đạt ngưỡng đang đặt.`;
        action =
            'Không tăng ngân sách vội. Giữ để theo dõi và sửa các điểm yếu trước khi scale.';
    } else {
        label = '❌ CẦN TẮT';
        badgeStyle =
            'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border:1px solid #d93025;';
        color = 'rgba(217, 48, 37, 0.7)';
        border = '#d93025';
        reason =
            `Rớt ${failCount}/${evaluatedCount} điều kiện đang áp dụng: ${funnelFails.join(', ')}.`;
        action =
            matrixActionFromFailuresV271(funnelFails,true);
    }

    const shortBadgeLabel =
        label.split(' (')[0];

    const adStatusObj = {
        label,
        reason,
        action,
        evaluatedCount,
        passCount,
        failCount,
        activeCriteria:configuredCriteria.map(
            item => item.key
        )
    };

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

    return {
        color,
        border,
        label,
        htmlBadge,
        adStatusObj
    };
}

function matrixActionFromFailuresV271(fails, severe) {
    const list = Array.isArray(fails)
        ? fails
        : [];

    const actions = [];

    if (list.includes('CTR')) {
        actions.push(
            'Tối ưu Hook/Thumbnail/Creative để tăng CTR'
        );
    }
    if (list.includes('TẦN SUẤT')) {
        actions.push(
            'Làm mới nội dung hoặc mở rộng tệp để giảm lặp'
        );
    }
    if (list.includes('CHỐT SALE')) {
        actions.push(
            'Rà soát kịch bản tư vấn và chất lượng Sale'
        );
    }
    if (list.includes('GIÁ/MUA')) {
        actions.push(
            'Giảm chi phí tạo đơn hoặc thay nhóm/creative kém'
        );
    }
    if (list.includes('GIÁ/TIN')) {
        actions.push(
            'Tối ưu quảng cáo để kéo giá tin nhắn xuống'
        );
    }
    if (list.includes('ROAS')) {
        actions.push(
            'Kiểm tra doanh thu, biên lợi nhuận và chi phí Ads'
        );
    }

    if (!actions.length) {
        return severe
            ? 'Xem lại toàn bộ chiến dịch trước khi tiếp tục chi.'
            : 'Tiếp tục theo dõi và tối ưu chỉ số đang yếu.';
    }

    return (
        severe
            ? 'Ưu tiên xử lý: '
            : 'Cần xử lý: '
    ) + actions.join(' · ') + '.';
}

window.MKTMatrixSettingsV271 = {
    version:'V271_DYNAMIC_MATRIX_SETTINGS',
    state:MATRIX_SETTINGS_STATE_V271,
    bind:bindMatrixSettingsV271,
    render:renderMatrixSettingsControlsV271,
    save:window.saveMatrixSettingsV271,
    canEdit:canEditMatrixSettingsV271,
    getThresholds:getMatrixThresholds
};


(function installAdsV271MatrixSettingsStyle(){
    if (document.getElementById('ads-v271-matrix-settings-style')) return;

    const style = document.createElement('style');
    style.id = 'ads-v271-matrix-settings-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.testProductSkuGroupingV272 = function() {
    const mock = [
        {adName:'SẢN PHẨM A (VNB1, VNB5)',spend:100,result:1,messages:2},
        {adName:'SP A NGẮN (VNB5)',spend:200,result:2,messages:3},
        {adName:'SP C (VNB8, VNB9)',spend:300,result:3,messages:4},
        {adName:'SP BẮC CẦU (VNB5, VNB8)',spend:400,result:4,messages:5}
    ];

    const result = buildPerformanceProductStatsV260(mock);
    console.log('V272 SKU grouping test:',result);
    return result;
};

window.ADS_V272_PRODUCT_SKU_GROUPING = {
    version:'V272_OVERLAP_SKU_CONNECTED_COMPONENTS',
    rule:'ANY_SHARED_SKU_MERGES_GROUP',
    transitive:true,
    test:window.testProductSkuGroupingV272
};

/* =========================================================
   V273 — FINANCE CHART/TABLE HEIGHT RESTORE
   Tổng quan / Marketing: chart card = data card height.
   Theo dõi ngân sách: giữ nguyên layout riêng.
   ========================================================= */
(function installFinanceHeightRestoreV273(){
    if (window.__MKT_FINANCE_HEIGHT_RESTORE_V273) return;
    window.__MKT_FINANCE_HEIGHT_RESTORE_V273 = true;

    let rafId = 0;
    let resizeObserver = null;
    let observedDataCard = null;

    function isFinanceNormalScopeV273() {
        const tab = document.getElementById('tab-finance');
        if (!tab || !tab.classList.contains('active')) return false;

        if (
            tab.classList.contains('finance-budget-mode-v167') ||
            tab.classList.contains('finance-budget-mode-v166')
        ) return false;

        try {
            return String(FINANCE_DATA_SCOPE || 'overview') !== 'budget-change';
        } catch (error) {
            return true;
        }
    }

    function clearFinanceHeightLockV273() {
        const tab = document.getElementById('tab-finance');
        if (!tab) return;

        const chartCard = tab.querySelector(':scope > .ads-chart-card');
        const frame = chartCard && chartCard.querySelector('.ads-chart-canvas');

        if (chartCard) {
            ['height','min-height','max-height'].forEach(prop => {
                chartCard.style.removeProperty(prop);
            });
        }

        if (frame) {
            ['height','min-height','max-height'].forEach(prop => {
                frame.style.removeProperty(prop);
            });
        }
    }

    function syncFinanceHeightV273() {
        cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(() => {
            if (window.innerWidth <= 1024 || !isFinanceNormalScopeV273()) {
                clearFinanceHeightLockV273();
                return;
            }

            const tab = document.getElementById('tab-finance');
            if (!tab) return;

            const dataCard = tab.querySelector(':scope > .ads-data-card');
            const chartCard = tab.querySelector(':scope > .ads-chart-card');
            const frame = chartCard && chartCard.querySelector('.ads-chart-canvas');

            if (!dataCard || !chartCard || !frame) return;

            const dataHeight = Math.ceil(
                dataCard.getBoundingClientRect().height
            );

            if (!dataHeight || dataHeight < 120) return;

            // Khôi phục đúng tỷ lệ cũ: 2 card cao bằng nhau.
            ['height','min-height','max-height'].forEach(prop => {
                chartCard.style.setProperty(
                    prop,
                    `${dataHeight}px`,
                    'important'
                );
            });

            const cardRect = chartCard.getBoundingClientRect();
            const frameRect = frame.getBoundingClientRect();
            const frameTop = Math.max(
                0,
                Math.ceil(frameRect.top - cardRect.top)
            );

            const frameHeight = Math.max(
                90,
                dataHeight - frameTop - 12
            );

            ['height','min-height','max-height'].forEach(prop => {
                frame.style.setProperty(
                    prop,
                    `${frameHeight}px`,
                    'important'
                );
            });

            // Chart.js lấy lại đúng kích thước parent sau khi khóa geometry.
            try {
                if (
                    window.myAdsChart &&
                    typeof window.myAdsChart.resize === 'function'
                ) {
                    window.myAdsChart.resize();
                }
            } catch (error) {}
        });
    }

    function bindFinanceDataCardObserverV273() {
        const tab = document.getElementById('tab-finance');
        const dataCard = tab && tab.querySelector(':scope > .ads-data-card');

        if (!dataCard || dataCard === observedDataCard) return;

        if (resizeObserver) {
            try { resizeObserver.disconnect(); } catch (error) {}
        }

        observedDataCard = dataCard;

        if (typeof ResizeObserver === 'function') {
            resizeObserver = new ResizeObserver(() => {
                syncFinanceHeightV273();
            });
            resizeObserver.observe(dataCard);
        }
    }

    function bootV273() {
        bindFinanceDataCardObserverV273();
        syncFinanceHeightV273();

        // Bảng/scope có thể render lại sau request Meta/Firebase.
        setTimeout(() => {
            bindFinanceDataCardObserverV273();
            syncFinanceHeightV273();
        }, 80);
        setTimeout(syncFinanceHeightV273, 250);
    }

    // Nối vào manager layout hiện tại thay vì tạo cơ chế cạnh tranh.
    const priorSyncV183V273 =
        typeof window.__syncAdsLayoutV183 === 'function'
            ? window.__syncAdsLayoutV183
            : null;

    if (priorSyncV183V273) {
        window.__syncAdsLayoutV183 = function(){
            priorSyncV183V273();
            setTimeout(syncFinanceHeightV273,0);
            setTimeout(syncFinanceHeightV273,80);
        };
    }

    document.addEventListener('click',event => {
        const financeControl = event.target && event.target.closest
            ? event.target.closest(
                '#btn-tab-fin,[data-ads-scope-target="finance"]'
              )
            : null;

        if (!financeControl) return;

        setTimeout(bootV273,0);
        setTimeout(bootV273,120);
        setTimeout(bootV273,350);
    },true);

    window.addEventListener('resize',() => {
        setTimeout(bootV273,80);
    });

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            bootV273,
            {once:true}
        );
    } else {
        bootV273();
    }

    window.syncFinanceHeightV273 = syncFinanceHeightV273;
})();

window.ADS_V273_FINANCE_HEIGHT_RESTORE = {
    version:'V273_FINANCE_CHART_TABLE_EQUAL_HEIGHT',
    scope:'overview_marketing_only',
    budgetScopeUntouched:true
};

window.getMarketingBudgetActualStatusV274 = function() {
    const period = marketingBudgetMonthPeriodV263();
    const actuals = MARKETING_BUDGET_PLAN_STATE_V263.actualByCompany || {};
    return {
        version:'V274_BC_KH_ACTUAL_FIX',
        period,
        loading:MARKETING_BUDGET_PLAN_STATE_V263.loading,
        loadedAt:MARKETING_BUDGET_PLAN_STATE_V263.loadedAt,
        lastError:MARKETING_BUDGET_PLAN_STATE_V263.lastError,
        companies:Object.keys(actuals).reduce((out,key) => {
            const item = actuals[key] || {};
            out[key] = {
                metaSpend:Number(item.metaSpend || 0),
                totalCost:Number(item.totalCost || 0),
                rowCount:Number(item.rowCount || 0),
                syncedAt:String(item.syncedAt || ''),
                cacheHit:item.cacheHit === true
            };
            return out;
        },{})
    };
};

window.ADS_V274_BC_KH = {
    version:'V274_BC_KH_ACTUAL_FIX',
    tabLabel:'BC & KH',
    actualSource:'requestMetaSummaryCachedV215',
    vatRate:0.10,
    forecast:'monthly_spend_only'
};

(function installMetaAdPreviewStyleV275(){
    if (document.getElementById('meta-ad-preview-style-v275')) return;
    const style = document.createElement('style');
    style.id = 'meta-ad-preview-style-v275';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.getMetaAdPreviewRegistryStatusV275 = function() {
    const registry = window.__META_AD_PREVIEW_REGISTRY_V275 || {};
    return {
        version:'V275_AD_PREVIEW_MODAL',
        count:Object.keys(registry).length,
        sampleKey:Object.keys(registry)[0] || ''
    };
};

window.handleMetaPreviewImageLoadV276 = function(img) {
    if (!img) return;

    const naturalWidth = Number(img.naturalWidth || 0);
    const naturalHeight = Number(img.naturalHeight || 0);

    /*
     * Không ép một thumbnail nhỏ phủ kín khung lớn.
     * Nếu ảnh thực quá nhỏ, chỉ hiển thị tối đa kích thước tự nhiên.
     */
    if (
        naturalWidth > 0 &&
        naturalHeight > 0 &&
        naturalWidth < 900
    ) {
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '520px';
        img.style.margin = '0 auto';
        img.style.objectFit = 'contain';

        const wrap = img.closest(
            '.meta-ad-preview-media-wrap-v275'
        );

        if (wrap) {
            wrap.classList.add(
                'is-low-natural-resolution-v276'
            );
        }
    }
};

(function installMetaAdPreviewSharpStyleV276(){
    if (document.getElementById('meta-ad-preview-sharp-style-v276')) return;

    const style = document.createElement('style');
    style.id = 'meta-ad-preview-sharp-style-v276';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
})();

window.ADS_V276_PREVIEW_SHARPNESS = {
    version:'V276_STORY_FULL_PICTURE_NO_UPSCALE',
    priority:[
        'story_full_picture',
        'adimages',
        'creative_image',
        'attachment',
        'thumbnail'
    ]
};


(function installMetaAdTableThumbStyleV277(){
    if (document.getElementById('meta-ad-table-thumb-style-v277')) return;

    const style = document.createElement('style');
    style.id = 'meta-ad-table-thumb-style-v277';
    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.ADS_V277_COMPACT_AD_IMAGE = {
    version:'V277_IMAGE_AFTER_STT',
    modalPreview:false,
    imageClickOpensFacebook:true
};


let META_AD_THUMB_CLICK_TIMER_V278 = null;

window.handleMetaAdThumbSingleClickV278 = function(button,event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    clearTimeout(META_AD_THUMB_CLICK_TIMER_V278);

    const postUrl = String(
        button &&
        button.dataset &&
        button.dataset.postUrl ||
        ''
    ).trim();

    if (!postUrl) return;

    /*
     * Delay ngắn để phân biệt click đơn với double-click.
     * Double-click sẽ hủy timer này.
     */
    META_AD_THUMB_CLICK_TIMER_V278 = setTimeout(() => {
        META_AD_THUMB_CLICK_TIMER_V278 = null;
        window.open(
            postUrl,
            '_blank',
            'noopener,noreferrer'
        );
    }, 260);
};

window.handleMetaAdThumbDoubleClickV278 = function(button,event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    clearTimeout(META_AD_THUMB_CLICK_TIMER_V278);
    META_AD_THUMB_CLICK_TIMER_V278 = null;

    const imageUrl = String(
        button &&
        button.dataset &&
        button.dataset.imageUrl ||
        ''
    ).trim();

    if (!imageUrl) return;

    window.openMetaAdImageLightboxV278(
        imageUrl
    );
};

window.openMetaAdImageLightboxV278 = function(imageUrl) {
    imageUrl = String(imageUrl || '').trim();
    if (!imageUrl) return;

    const old = document.getElementById(
        'meta-ad-image-lightbox-v278'
    );
    if (old) old.remove();

    const lightbox =
        document.createElement('div');

    lightbox.id =
        'meta-ad-image-lightbox-v278';

    lightbox.className =
        'meta-ad-image-lightbox-v278';

    lightbox.innerHTML = `
        <div class="meta-ad-image-lightbox-stage-v278">
            <button
                type="button"
                class="meta-ad-image-lightbox-close-v278"
                onclick="window.closeMetaAdImageLightboxV278()"
                aria-label="Đóng"
            >×</button>

            <img
                src="${escapeHtml(imageUrl)}"
                alt="Ảnh bài quảng cáo"
                class="meta-ad-image-lightbox-img-v278"
            >
        </div>
    `;

    lightbox.addEventListener(
        'click',
        function(ev) {
            if (ev.target === lightbox) {
                window.closeMetaAdImageLightboxV278();
            }
        }
    );

    document.body.appendChild(lightbox);
};

window.closeMetaAdImageLightboxV278 = function() {
    const lightbox = document.getElementById(
        'meta-ad-image-lightbox-v278'
    );
    if (lightbox) lightbox.remove();
};

(function installMetaAdThumbV278Style(){
    if (
        document.getElementById(
            'meta-ad-thumb-v278-style'
        )
    ) return;

    const style =
        document.createElement('style');

    style.id =
        'meta-ad-thumb-v278-style';

    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.ADS_V278_THUMB_INTERACTION = {
    version:'V278_SINGLE_LINK_DOUBLE_IMAGE',
    singleClick:'open_post',
    doubleClick:'open_image_lightbox',
    clickDelayMs:260
};


window.getMetaAdImageSourcesV279 = function() {
    const rows = Array.isArray(META_LIVE_DATA)
        ? META_LIVE_DATA
        : [];

    const output = [];

    rows.forEach(row => {
        const originalRows =
            Array.isArray(row.original_adset_rows)
                ? row.original_adset_rows
                : [];

        originalRows.forEach(adset => {
            const adsRows =
                Array.isArray(adset.ads)
                    ? adset.ads
                    : [];

            adsRows.forEach(ad => {
                const media =
                    getMetaAdPreviewMediaV275(ad);

                output.push({
                    company:String(
                        row.company ||
                        CURRENT_COMPANY ||
                        ''
                    ),
                    adId:String(ad.adId || ''),
                    adName:String(ad.adName || ''),
                    source:String(
                        media && media.source || ''
                    ),
                    renderedThumbnail:
                        String(
                            ad.renderedThumbnailUrl || ''
                        ),
                    adImage:
                        String(
                            ad.highresImageUrl || ''
                        ),
                    story:
                        String(
                            ad.storyImageUrl || ''
                        ),
                    selected:
                        String(
                            media && media.url || ''
                        )
                });
            });
        });
    });

    console.table(output);
    return output;
};

window.ADS_V279_TRUE_CREATIVE_IMAGE = {
    version:'V279_TRUE_CREATIVE_IMAGE',
    priority:[
        'ad_creative_render_1080',
        'adimages_image_hash',
        'direct_creative',
        'creative_image_url',
        'page_story_attachment',
        'page_story_fallback',
        'thumbnail_default'
    ],
    singleClick:'open_post',
    doubleClick:'image_lightbox'
};


window.getMetaAdImageSourcesV280 = function() {
    const result = [];

    const rows =
        Array.isArray(META_LIVE_DATA)
            ? META_LIVE_DATA
            : [];

    rows.forEach(row => {
        const originals =
            Array.isArray(
                row.original_adset_rows
            )
                ? row.original_adset_rows
                : [];

        originals.forEach(adset => {
            const adsRows =
                Array.isArray(adset.ads)
                    ? adset.ads
                    : [];

            adsRows.forEach(ad => {
                const media =
                    getMetaAdPreviewMediaV275(
                        ad
                    );

                result.push({
                    company:String(
                        row.company ||
                        CURRENT_COMPANY ||
                        ''
                    ),
                    adId:String(ad.adId || ''),
                    adName:String(
                        ad.adName || ''
                    ),
                    backendSource:String(
                        ad.primaryMediaSource || ''
                    ),
                    uiSource:String(
                        media.source || ''
                    ),
                    selected:String(
                        media.url || ''
                    )
                });
            });
        });
    });

    console.table(result);
    return result;
};

window.ADS_V280_DEEP_MEDIA_RESOLVER = {
    version:'V280_BACKEND_MEDIA_SOURCE_OF_TRUTH',
    backendRequired:'V221',
    renderedThumbnailPriority:false,
    postSubattachmentHugeBoost:false,
    videoThumbnailSupported:true,
    singleClick:'open_post',
    doubleClick:'image_lightbox'
};


window.handleMetaAdThumbDoubleClickV281 = function(button,event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    clearTimeout(META_AD_THUMB_CLICK_TIMER_V278);
    META_AD_THUMB_CLICK_TIMER_V278 = null;

    const galleryKey = String(
        button &&
        button.dataset &&
        button.dataset.galleryKey ||
        ''
    ).trim();

    const registry =
        getMetaAdGalleryRegistryV281();

    const payload =
        registry[galleryKey];

    if (
        payload &&
        Array.isArray(payload.items) &&
        payload.items.length
    ) {
        window.openMetaAdGalleryV281(
            galleryKey,
            0
        );
        return;
    }

    const imageUrl = String(
        button &&
        button.dataset &&
        button.dataset.imageUrl ||
        ''
    ).trim();

    if (imageUrl) {
        window.openMetaAdImageLightboxV278(
            imageUrl
        );
    }
};

window.openMetaAdGalleryV281 = function(galleryKey,index) {
    const registry =
        getMetaAdGalleryRegistryV281();

    const payload =
        registry[String(galleryKey || '')];

    if (
        !payload ||
        !Array.isArray(payload.items) ||
        !payload.items.length
    ) return;

    const total =
        payload.items.length;

    index =
        Math.max(
            0,
            Math.min(
                total - 1,
                Number(index || 0)
            )
        );

    const item =
        payload.items[index];

    const old =
        document.getElementById(
            'meta-ad-image-lightbox-v278'
        );

    if (old) old.remove();

    const lightbox =
        document.createElement('div');

    lightbox.id =
        'meta-ad-image-lightbox-v278';

    lightbox.className =
        'meta-ad-image-lightbox-v278';

    const prevIndex =
        index <= 0
            ? total - 1
            : index - 1;

    const nextIndex =
        index >= total - 1
            ? 0
            : index + 1;

    lightbox.innerHTML = `
        <div class="meta-ad-image-lightbox-stage-v278 meta-ad-gallery-stage-v281">
            <button
                type="button"
                class="meta-ad-image-lightbox-close-v278"
                onclick="window.closeMetaAdImageLightboxV278()"
                aria-label="Đóng"
            >×</button>

            ${
                total > 1
                    ? `
                        <button
                            type="button"
                            class="meta-ad-gallery-nav-v281 is-prev"
                            onclick="event.stopPropagation();window.openMetaAdGalleryV281('${escapeHtml(galleryKey)}',${prevIndex})"
                            aria-label="Ảnh trước"
                        >‹</button>

                        <button
                            type="button"
                            class="meta-ad-gallery-nav-v281 is-next"
                            onclick="event.stopPropagation();window.openMetaAdGalleryV281('${escapeHtml(galleryKey)}',${nextIndex})"
                            aria-label="Ảnh sau"
                        >›</button>
                    `
                    : ''
            }

            <div class="meta-ad-gallery-main-v281">
                ${
                    String(payload.mediaKind || '') === 'video'
                        ? '<div class="meta-ad-gallery-video-label-v281">▶ VIDEO · Ảnh thumbnail</div>'
                        : ''
                }

                <img
                    src="${escapeHtml(item.url)}"
                    alt="${escapeHtml(payload.adName || 'Ảnh bài quảng cáo')}"
                    class="meta-ad-image-lightbox-img-v278"
                >

                <div class="meta-ad-gallery-caption-v281">
                    <span>${escapeHtml(payload.adName || 'Bài quảng cáo')}</span>
                    <b>${index + 1} / ${total}</b>
                </div>
            </div>

            ${
                total > 1
                    ? `
                        <div class="meta-ad-gallery-thumbs-v281">
                            ${payload.items.map((thumb,thumbIndex) => `
                                <button
                                    type="button"
                                    class="meta-ad-gallery-mini-v281${thumbIndex === index ? ' is-active' : ''}"
                                    onclick="event.stopPropagation();window.openMetaAdGalleryV281('${escapeHtml(galleryKey)}',${thumbIndex})"
                                >
                                    <img src="${escapeHtml(thumb.url)}" alt="Ảnh ${thumbIndex + 1}">
                                </button>
                            `).join('')}
                        </div>
                    `
                    : ''
            }
        </div>
    `;

    lightbox.addEventListener(
        'click',
        function(ev) {
            if (ev.target === lightbox) {
                window.closeMetaAdImageLightboxV278();
            }
        }
    );

    document.body.appendChild(
        lightbox
    );
};

(function installMetaMediaV281Style(){
    if (
        document.getElementById(
            'meta-media-v281-style'
        )
    ) return;

    const style =
        document.createElement('style');

    style.id =
        'meta-media-v281-style';

    style.textContent = ''; /* V321 CSS lives in Blogger */

    document.head.appendChild(style);
})();

window.ADS_V281_MEDIA_UI = {
    version:'V281_VIDEO_MULTIIMAGE_GALLERY',
    singleClick:'facebook_only',
    doubleClick:'gallery_or_large_image',
    videoBadge:true,
    instagramLink:false
};



// =========================================================
// V285 — ACTION TIME NOT SYNC TIME
// Mục tiêu:
// - Notification Campaign/Adset/Ad dùng thời gian hành động Meta nếu có.
// - Created -> createdAtMeta (Meta created_time).
// - Name/status/schedule/objective/campaign budget/restored -> updatedAtMeta.
// - Removed -> firstMissingAtMs (mốc phát hiện mất đầu tiên; Meta không trả giờ xóa chính xác).
// - Budget group V253/V264 giữ detection time vì adset.updated_time có thể thay đổi bởi thao tác khác.
// - Luôn giữ detectedAtMs riêng để biết hệ thống phát hiện lúc nào.
// =========================================================
(function installActivityActionTimeV285(){
    'use strict';

    if (window.__MKT_ACTIVITY_ACTION_TIME_V285_INSTALLED) return;
    window.__MKT_ACTIVITY_ACTION_TIME_V285_INSTALLED = true;

    function parseActivityTimeV285(value) {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            return { ms:value, iso:new Date(value).toISOString() };
        }
        const parsed = new Date(String(value || '')).getTime();
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return { ms:parsed, iso:new Date(parsed).toISOString() };
    }

    function activityStateSectionV285(objectType) {
        const type = String(objectType || '').toLowerCase();
        if (type === 'campaign') return 'campaigns';
        if (type === 'adset') return 'adsets';
        if (type === 'ad') return 'ads';
        return '';
    }

    function activityTimeKindV285(eventType) {
        const type = String(eventType || '').toLowerCase();
        if (/_created$/.test(type)) return 'created';
        if (/_removed$/.test(type)) return 'removed';
        if (/_restored$/.test(type)) return 'updated';
        if (
            /_name_changed$/.test(type) ||
            /_status_changed$/.test(type) ||
            /_schedule_changed$/.test(type) ||
            /_objective_changed$/.test(type) ||
            /campaign_budget_(increase|decrease)$/.test(type)
        ) return 'updated';
        return 'detected';
    }

    async function resolveActivityActionTimeV285(event) {
        event = event || {};

        const detectedAtMs = Number(event.createdAtMs || Date.now());
        const detectedAt = String(
            event.createdAt ||
            new Date(detectedAtMs).toISOString()
        );

        const objectType = String(event.objectType || '').toLowerCase();
        const eventType = String(event.eventType || '').toLowerCase();
        const kind = activityTimeKindV285(eventType);

        // Auto Budget Tracking cố ý dùng detection window ~5 phút.
        if (objectType === 'budget_group' || /^budget_(increase|decrease|change)$/.test(eventType)) {
            return {
                actionAtMs:detectedAtMs,
                actionAt:detectedAt,
                detectedAtMs,
                detectedAt,
                source:'meta_snapshot_detection',
                precision:'detection_window_5m',
                exact:false
            };
        }

        const section = activityStateSectionV285(objectType);
        const company = String(event.company || '').toUpperCase();
        const objectId = String(event.objectId || '').trim();

        if (!section || !company || !objectId || !db) {
            return {
                actionAtMs:detectedAtMs,
                actionAt:detectedAt,
                detectedAtMs,
                detectedAt,
                source:'system_detection',
                precision:'detected_at',
                exact:false
            };
        }

        let state = null;
        try {
            const key = campaignActivitySafeKeyV266(objectId);
            const snap = await db.ref(
                `${CAMPAIGN_ACTIVITY_STATE_ROOT_V266}/${company}/${section}/${key}`
            ).once('value');
            state = snap.val() || null;
        } catch (error) {
            state = null;
        }

        if (!state) {
            return {
                actionAtMs:detectedAtMs,
                actionAt:detectedAt,
                detectedAtMs,
                detectedAt,
                source:'system_detection',
                precision:'detected_at',
                exact:false
            };
        }

        let candidate = null;
        let source = '';
        let precision = '';
        let exact = false;

        if (kind === 'created') {
            candidate = parseActivityTimeV285(
                state.createdAtMeta || state.created_time || state.createdAt
            );
            source = candidate ? 'meta_created_time' : '';
            precision = candidate ? 'meta_timestamp' : '';
            exact = !!candidate;
        } else if (kind === 'updated') {
            candidate = parseActivityTimeV285(
                state.updatedAtMeta || state.updated_time || state.updatedAt
            );
            source = candidate ? 'meta_updated_time' : '';
            precision = candidate ? 'meta_timestamp' : '';
            exact = !!candidate;
        } else if (kind === 'removed') {
            candidate = parseActivityTimeV285(
                Number(state.firstMissingAtMs || 0) || state.firstMissingAt || ''
            );
            source = candidate ? 'first_missing_detection' : '';
            precision = candidate ? 'first_detection_window' : '';
            exact = false;
        }

        if (!candidate) {
            candidate = parseActivityTimeV285(detectedAtMs);
            source = 'system_detection';
            precision = 'detected_at';
            exact = false;
        }

        // Không chấp nhận timestamp Meta vô lý nằm xa tương lai so với lúc phát hiện.
        if (candidate.ms > detectedAtMs + 5 * 60 * 1000) {
            candidate = parseActivityTimeV285(detectedAtMs);
            source = 'system_detection';
            precision = 'detected_at';
            exact = false;
        }

        return {
            actionAtMs:candidate.ms,
            actionAt:candidate.iso,
            detectedAtMs,
            detectedAt,
            source,
            precision,
            exact
        };
    }

    const emitOriginalV285 = emitCampaignActivityNotificationV267;

    emitCampaignActivityNotificationV267 = async function(event) {
        event = event || {};

        const timing = await resolveActivityActionTimeV285(event);
        const nextEvent = Object.assign({}, event, {
            createdAtMs:Number(timing.actionAtMs || event.createdAtMs || Date.now()),
            createdAt:String(
                timing.actionAt ||
                event.createdAt ||
                new Date(Number(event.createdAtMs || Date.now())).toISOString()
            )
        });

        const result = await emitOriginalV285(nextEvent);

        // Bổ sung bằng chứng: thời điểm hành động và thời điểm hệ thống phát hiện.
        // Không thay đổi Rules/node/người nhận.
        if (result && result.activityId && db) {
            const timeMeta = {
                actionAtMs:Number(timing.actionAtMs || 0),
                actionAt:String(timing.actionAt || ''),
                detectedAtMs:Number(timing.detectedAtMs || 0),
                detectedAt:String(timing.detectedAt || ''),
                eventTimeSource:String(timing.source || ''),
                eventTimePrecision:String(timing.precision || ''),
                actualActionTimeKnown:timing.exact === true
            };

            const writes = [];
            if (result.globalSaved) {
                writes.push(
                    db.ref(`campaign_activity_global_v1/${result.activityId}`)
                        .update(timeMeta)
                        .catch(() => null)
                );
            }
            if (result.personalSaved && result.userKey) {
                writes.push(
                    db.ref(
                        `${CAMPAIGN_ACTIVITY_NOTIFICATION_ROOT_V266}/` +
                        `${result.userKey}/${result.activityId}`
                    ).update(timeMeta)
                    .catch(() => null)
                );
            }
            if (writes.length) await Promise.allSettled(writes);
        }

        return result;
    };

    // Export lại wrapper mới để các nơi gọi qua window cũng dùng timestamp V285.
    if (window.MKTCampaignActivityV267) {
        window.MKTCampaignActivityV267.emit = emitCampaignActivityNotificationV267;
        window.MKTCampaignActivityV267.version = 'V285_ACTION_TIME_NOT_SYNC_TIME';
    }

    // Sidebar/status history: nếu trạng thái Meta thật sự đổi, dùng updated_time.
    // Nếu chỉ chuyển từ chưa phân phối -> có dữ liệu (không có Meta updated_time mới),
    // vẫn dùng thời điểm hệ thống phát hiện để tránh gán sai giờ cũ.
    appendMetaLiveStatusEvent = function(history, entity, info, syncedAt, isInitial) {
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
            const sourceUpdatedAt = String(
                entity && (entity.updated_time || entity.updatedAt) || ''
            );
            const sourceCreatedAt = String(
                entity && (entity.created_time || entity.createdAt) || ''
            );

            const metaStateChanged = !!(
                last && (
                    String(last.rawStatus || '') !== String(info.rawStatus || '') ||
                    String(last.effectiveStatus || '') !== String(info.effectiveStatus || '') ||
                    String(last.configuredStatus || '') !== String(info.configuredStatus || '')
                )
            );

            let eventAt = String(syncedAt || new Date().toISOString());
            if (isInitial) {
                eventAt = sourceCreatedAt || sourceUpdatedAt || eventAt;
            } else if (metaStateChanged && sourceUpdatedAt) {
                eventAt = sourceUpdatedAt;
            }

            normalized.push(makeMetaLiveStatusHistoryEntry(
                entity,
                info,
                eventAt,
                sourceUpdatedAt
            ));
        }

        return normalizeMetaLiveStatusHistory(normalized);
    };

    window.MKT_ACTIVITY_ACTION_TIME_V285 = {
        version:'V285_ACTION_TIME_NOT_SYNC_TIME',
        resolve:resolveActivityActionTimeV285
    };
})();

/* =========================================================
   V308 — CAMPAIGN TREE OVERVIEW
   Nhân viên → Chiến dịch → Nhóm quảng cáo → Bài quảng cáo.
   - Nhân viên là lớp gom hiển thị, không thay cấu trúc Meta.
   - Campaign/Adset/Ad dùng đúng ID Meta để tránh gom nhầm theo tên.
   - Cấp bài dùng Insights cấp Ad từ V307.
   - Click bài mở popup creative Meta qua openContentAdV307().
   ========================================================= */
let CONTENT_TREE_OPEN_V308 = new Set();
let CONTENT_TREE_NODE_KEYS_V308 = [];
let CONTENT_TREE_LAST_ROWS_V308 = [];
let CONTENT_TREE_CONTEXT_V308 = '';

function injectContentTreeStylesV308() {
    if (document.getElementById('content-tree-v308-style')) return;
    const style = document.createElement('style');
    style.id = 'content-tree-v308-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
}

function contentTreeInitialsV308(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'NV';
    return parts.slice(-2).map(item => item.charAt(0).toUpperCase()).join('');
}

function contentTreeMetricV308(ads) {
    const rows = Array.isArray(ads) ? ads : [];
    let spendRaw = 0, messages = 0, purchases = 0, impressions = 0, linkClicks = 0;
    rows.forEach(ad => {
        spendRaw += Number(ad && ad.spend || 0);
        messages += Number(ad && ad.messages || 0);
        purchases += Number(ad && ad.result || 0);
        impressions += Number(ad && ad.impressions || 0);
        linkClicks += Number(ad && ad.linkClicks || 0);
    });
    const spend = metaCostWithVatV304(spendRaw);
    const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    return {spendRaw,spend,messages,purchases,impressions,linkClicks,ctr,cpa};
}

function contentTreeAllowedAdsetEmployeesV308(groupedRows) {
    const map = new Map();
    (Array.isArray(groupedRows) ? groupedRows : []).forEach(item => {
        if (!item) return;
        const employee = String(item.employee || '').replace(/\s+/g,' ').trim();
        const ids = [];
        if (item.adsetId) ids.push(String(item.adsetId));
        (Array.isArray(item.original_adset_rows) ? item.original_adset_rows : []).forEach(row => {
            if (row && row.adsetId) ids.push(String(row.adsetId));
        });
        ids.forEach(id => { if (id && employee) map.set(id, employee); });
    });
    return map;
}

function contentTreeAdsV308(groupedRows) {
    const allowedEmployees = contentTreeAllowedAdsetEmployeesV308(groupedRows);
    const allowedIds = new Set(allowedEmployees.keys());
    const rawAds = Array.isArray(META_CONTENT_ADS_V307) ? META_CONTENT_ADS_V307 : [];

    const canonicalSources = (Array.isArray(groupedRows) ? groupedRows : []).slice();
    rawAds.forEach(ad => {
        const adset = ad && ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
        canonicalSources.push({
            company:String(ad && ad.company || CURRENT_COMPANY || '').toUpperCase(),
            employee:String(ad && ad.employee || ''),
            fullName:String(adset.name || ''),
            adsetName:String(adset.name || '')
        });
    });
    const canonicalIndex = buildEmployeeCanonicalIndexV300(canonicalSources);
    const query = String(META_LIVE_SEARCH_QUERY || '').trim().toLocaleLowerCase('vi-VN');

    return rawAds.map(source => {
        const ad = source || {};
        const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
        const campaign = ad.campaign && typeof ad.campaign === 'object' ? ad.campaign : {};
        const adsetId = String(ad.adsetId || ad.adset_id || adset.id || '').trim();
        const company = String(ad.company || CURRENT_COMPANY || '').trim().toUpperCase();
        let employee = String(allowedEmployees.get(adsetId) || ad.employee || '').replace(/\s+/g,' ').trim();
        if (employee) {
            const identity = resolveCanonicalEmployeeV300(employee, company, canonicalIndex);
            if (identity && identity.matched) employee = identity.display;
        }
        return {
            ...ad,
            company,
            employee:employee || 'Chưa xác định nhân viên',
            adsetId,
            adset:{...adset,id:adsetId,name:String(adset.name || '')},
            campaign:{...campaign,id:String(campaign.id || ''),name:String(campaign.name || '')}
        };
    }).filter(ad => {
        if (allowedIds.size && !allowedIds.has(String(ad.adsetId || ''))) return false;
        const spend = Number(ad.spend || 0);
        const messages = Number(ad.messages || 0);
        const purchases = Number(ad.result || 0);
        const status = String(ad.effective_status || ad.status || '').toUpperCase();
        const relevant = spend > 0 || messages > 0 || purchases > 0 || ['ACTIVE','PREPARING','IN_PROCESS','PENDING_REVIEW','SCHEDULED'].includes(status);
        if (!relevant) return false;
        if (!query) return true;
        const searchable = [
            ad.employee,
            ad.name,
            ad.preview_body,
            ad.preview_title,
            ad.preview_description,
            ad.productName,
            ad.sku,
            ad.adset && ad.adset.name,
            ad.campaign && ad.campaign.name
        ].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');
        return searchable.includes(query);
    });
}

function contentTreeBuildV308(groupedRows) {
    const ads = contentTreeAdsV308(groupedRows);
    const employees = new Map();

    ads.forEach(ad => {
        const employeeName = String(ad.employee || 'Chưa xác định nhân viên').trim();
        const employeeKey = normalizeAdsText(employeeName) || employeeName;
        if (!employees.has(employeeKey)) {
            employees.set(employeeKey,{key:employeeKey,name:employeeName,campaigns:new Map(),ads:[]});
        }
        const employee = employees.get(employeeKey);
        employee.ads.push(ad);

        const campaign = ad.campaign || {};
        const campaignName = String(campaign.name || 'Chiến dịch chưa xác định').trim();
        const campaignId = String(campaign.id || '').trim();
        const campaignKey = campaignId || `name:${normalizeAdsText(campaignName)}`;
        if (!employee.campaigns.has(campaignKey)) {
            employee.campaigns.set(campaignKey,{key:campaignKey,id:campaignId,name:campaignName,adsets:new Map(),ads:[]});
        }
        const campaignNode = employee.campaigns.get(campaignKey);
        campaignNode.ads.push(ad);

        const adset = ad.adset || {};
        const adsetName = String(adset.name || 'Nhóm quảng cáo chưa xác định').trim();
        const adsetId = String(ad.adsetId || adset.id || '').trim();
        const adsetKey = adsetId || `name:${normalizeAdsText(adsetName)}`;
        if (!campaignNode.adsets.has(adsetKey)) {
            campaignNode.adsets.set(adsetKey,{key:adsetKey,id:adsetId,name:adsetName,ads:[]});
        }
        campaignNode.adsets.get(adsetKey).ads.push(ad);
    });

    const output = Array.from(employees.values()).map(employee => {
        employee.campaigns = Array.from(employee.campaigns.values()).map(campaign => {
            campaign.adsets = Array.from(campaign.adsets.values()).map(adset => {
                adset.ads.sort((a,b) => {
                    if (SORT_MODE === 'purchases') return Number(b.result||0)-Number(a.result||0) || Number(b.spend||0)-Number(a.spend||0);
                    if (SORT_MODE === 'messages') return Number(b.messages||0)-Number(a.messages||0) || Number(b.spend||0)-Number(a.spend||0);
                    return Number(b.spend||0)-Number(a.spend||0) || Number(b.result||0)-Number(a.result||0);
                });
                adset.metric = contentTreeMetricV308(adset.ads);
                return adset;
            }).sort((a,b) => b.metric.spend-a.metric.spend || a.name.localeCompare(b.name,'vi'));
            campaign.metric = contentTreeMetricV308(campaign.ads);
            return campaign;
        }).sort((a,b) => b.metric.spend-a.metric.spend || a.name.localeCompare(b.name,'vi'));
        employee.metric = contentTreeMetricV308(employee.ads);
        return employee;
    }).sort((a,b) => b.metric.spend-a.metric.spend || a.name.localeCompare(b.name,'vi'));

    return {employees:output,ads};
}

function contentTreeContextSignatureV308() {
    try {
        const period = getMetaLivePeriod();
        return [CURRENT_COMPANY, period.from, period.to, META_LIVE_DATA_SCOPE].join('|');
    } catch (error) {
        return [CURRENT_COMPANY, META_LIVE_DATA_SCOPE].join('|');
    }
}

function contentTreeNodeKeyV308(type, parts) {
    return [type].concat(parts || []).join('::');
}

function contentTreeEnsureDefaultsV308(tree) {
    const signature = contentTreeContextSignatureV308();
    if (CONTENT_TREE_CONTEXT_V308 === signature) return;
    CONTENT_TREE_CONTEXT_V308 = signature;
    CONTENT_TREE_OPEN_V308 = new Set();
    (tree.employees || []).forEach(employee => {
        CONTENT_TREE_OPEN_V308.add(contentTreeNodeKeyV308('emp',[employee.key]));
        (employee.campaigns || []).forEach(campaign => {
            CONTENT_TREE_OPEN_V308.add(contentTreeNodeKeyV308('cmp',[employee.key,campaign.key]));
        });
    });
}

window.toggleContentTreeV308 = function(encodedKey) {
    const key = decodeURIComponent(String(encodedKey || ''));
    if (!key) return;
    if (CONTENT_TREE_OPEN_V308.has(key)) CONTENT_TREE_OPEN_V308.delete(key);
    else CONTENT_TREE_OPEN_V308.add(key);
    renderContentPerformanceOverviewV306(CONTENT_TREE_LAST_ROWS_V308);
};

window.expandAllContentTreeV308 = function() {
    CONTENT_TREE_NODE_KEYS_V308.forEach(key => CONTENT_TREE_OPEN_V308.add(key));
    renderContentPerformanceOverviewV306(CONTENT_TREE_LAST_ROWS_V308);
};

window.collapseAllContentTreeV308 = function() {
    CONTENT_TREE_OPEN_V308.clear();
    renderContentPerformanceOverviewV306(CONTENT_TREE_LAST_ROWS_V308);
};

function contentTreeMiniMetricsHtmlV308(metric) {
    return `
        <span class="content-tree-mini-metrics-v308">
            <span>Chi + VAT <b>${formatMetaLiveInteger(Math.round(metric.spend || 0))} ₫</b></span>
            <span>Tin <b>${formatMetaLiveInteger(metric.messages || 0)}</b></span>
            <span>Mua <b>${formatMetaLiveInteger(metric.purchases || 0)}</b></span>
            <span>CTR <b>${Number(metric.ctr || 0).toFixed(2)}%</b></span>
        </span>`;
}

function contentTreeAdHtmlV308(ad) {
    const adId = String(ad && (ad.id || ad.adId) || '');
    const media = contentAdMediaUrlV307(ad);
    const isVideo = String(ad && (ad.preview_type || ad.primary_media_kind) || '').toLowerCase() === 'video';
    const title = String(ad && (ad.name || ad.preview_title) || 'Bài quảng cáo').trim();
    const copy = String(ad && (ad.preview_body || ad.preview_description) || 'Meta chưa trả caption cho bài này.').trim();
    const spend = metaCostWithVatV304(ad && ad.spend);
    const messages = Number(ad && ad.messages || 0);
    const purchases = Number(ad && ad.result || 0);
    const ctr = Number(ad && ad.ctr || 0);
    const cpa = purchases > 0 ? spend / purchases : 0;
    const status = contentAdStatusV307(ad);
    const product = String(ad && ad.productName || '').trim();
    const sku = String(ad && ad.sku || '').trim();
    return `
        <div class="content-tree-ad-v308" role="button" tabindex="0" onclick="window.openContentAdV307('${escapeHtml(adId)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.openContentAdV307('${escapeHtml(adId)}')}">
            <div class="content-tree-ad-media-v308">
                ${media ? `<img src="${escapeHtml(media)}" alt="${escapeHtml(title)}" loading="lazy">` : '<div class="ph">AD</div>'}
                ${isVideo ? '<span class="content-tree-video-v308">▶ VIDEO</span>' : ''}
            </div>
            <div class="content-tree-ad-main-v308">
                <b>${escapeHtml(title)}</b>
                <p>${escapeHtml(copy)}</p>
                <small>${escapeHtml([status.label,product,sku ? `SKU ${sku}` : ''].filter(Boolean).join(' · '))}</small>
            </div>
            <div class="content-tree-ad-metrics-v308">
                <span><small>Chi + VAT</small><b>${formatMetaLiveInteger(Math.round(spend))} ₫</b></span>
                <span><small>Tin / Mua</small><b>${formatMetaLiveInteger(messages)} / ${formatMetaLiveInteger(purchases)}</b></span>
                <span><small>CTR link</small><b>${ctr.toFixed(2)}%</b></span>
                <span><small>CPA + VAT</small><b>${purchases > 0 ? formatMetaLiveInteger(Math.round(cpa)) + ' ₫' : '—'}</b></span>
            </div>
            <span class="content-tree-ad-open-v308">Xem nội dung</span>
        </div>`;
}

function renderContentPerformanceOverviewV306(data) {
    injectContentTreeStylesV308();
    CONTENT_TREE_LAST_ROWS_V308 = Array.isArray(data) ? data : [];

    const summary = document.getElementById('content-ad-summary-v307');
    const feed = document.getElementById('content-ad-feed-v307');
    const note = document.getElementById('content-feed-note-v307');
    if (!summary || !feed) return;

    const tree = contentTreeBuildV308(CONTENT_TREE_LAST_ROWS_V308);
    contentTreeEnsureDefaultsV308(tree);

    const campaigns = tree.employees.reduce((sum,employee) => sum + employee.campaigns.length,0);
    const adsets = tree.employees.reduce((sum,employee) => sum + employee.campaigns.reduce((n,campaign) => n + campaign.adsets.length,0),0);
    const totalMetric = contentTreeMetricV308(tree.ads);

    summary.innerHTML = `
        <div class="content-ad-summary-card-v307"><span>Nhân viên</span><b>${formatMetaLiveInteger(tree.employees.length)}</b><small>Đã gom alias tên cũ/mới</small></div>
        <div class="content-ad-summary-card-v307"><span>Chiến dịch</span><b>${formatMetaLiveInteger(campaigns)}</b><small>Gom dưới từng nhân viên</small></div>
        <div class="content-ad-summary-card-v307"><span>Nhóm quảng cáo</span><b>${formatMetaLiveInteger(adsets)}</b><small>Theo đúng Adset ID Meta</small></div>
        <div class="content-ad-summary-card-v307 is-good"><span>Bài quảng cáo</span><b>${formatMetaLiveInteger(tree.ads.length)}</b><small>Click để xem creative Meta</small></div>
        <div class="content-ad-summary-card-v307"><span>Chi phí + VAT</span><b>${new Intl.NumberFormat('vi-VN',{notation:'compact',maximumFractionDigits:1}).format(totalMetric.spend || 0)} ₫</b><small>${formatMetaLiveInteger(totalMetric.purchases)} lượt mua</small></div>`;

    if (note) {
        note.textContent = tree.ads.length
            ? `${tree.employees.length} nhân viên · ${campaigns} chiến dịch · ${adsets} nhóm · ${tree.ads.length} bài`
            : 'Chưa có bài quảng cáo phù hợp bộ lọc hiện tại.';
    }

    if (!tree.employees.length) {
        feed.innerHTML = '<div class="content-tree-empty-v308">Chưa có dữ liệu để dựng cây Chiến dịch → Nhóm → Bài. Hãy kiểm tra công ty, kỳ dữ liệu hoặc bộ lọc tìm kiếm.</div>';
        CONTENT_TREE_NODE_KEYS_V308 = [];
        return;
    }

    const allNodeKeys = [];
    const html = tree.employees.map(employee => {
        const employeeKey = contentTreeNodeKeyV308('emp',[employee.key]);
        allNodeKeys.push(employeeKey);
        const employeeOpen = CONTENT_TREE_OPEN_V308.has(employeeKey);
        const campaignHtml = employee.campaigns.map(campaign => {
            const campaignKey = contentTreeNodeKeyV308('cmp',[employee.key,campaign.key]);
            allNodeKeys.push(campaignKey);
            const campaignOpen = CONTENT_TREE_OPEN_V308.has(campaignKey);
            const adsetHtml = campaign.adsets.map(adset => {
                const adsetKey = contentTreeNodeKeyV308('adset',[employee.key,campaign.key,adset.key]);
                allNodeKeys.push(adsetKey);
                const adsetOpen = CONTENT_TREE_OPEN_V308.has(adsetKey);
                const sample = adset.ads[0] || {};
                const product = String(sample.productName || '').trim();
                const sku = String(sample.sku || '').trim();
                return `
                    <div class="content-tree-adset-v308 ${adsetOpen ? 'content-tree-node-open-v308' : ''}">
                        <button type="button" class="content-tree-toggle-v308 content-tree-adset-head-v308" onclick="window.toggleContentTreeV308('${escapeHtml(encodeURIComponent(adsetKey))}')">
                            <span class="content-tree-caret-v308">›</span>
                            <span class="content-tree-adset-icon-v308">N</span>
                            <span class="content-tree-copy-v308"><b>${escapeHtml(product || adset.name)}</b><small>${escapeHtml([sku ? `SKU ${sku}` : '', adset.name, `${adset.ads.length} bài`].filter(Boolean).join(' · '))}</small></span>
                            ${contentTreeMiniMetricsHtmlV308(adset.metric)}
                        </button>
                        <div class="content-tree-children-v308"><div class="content-tree-ads-v308">${adset.ads.map(contentTreeAdHtmlV308).join('')}</div></div>
                    </div>`;
            }).join('');

            return `
                <div class="content-tree-campaign-v308 ${campaignOpen ? 'content-tree-node-open-v308' : ''}">
                    <button type="button" class="content-tree-toggle-v308 content-tree-campaign-head-v308" onclick="window.toggleContentTreeV308('${escapeHtml(encodeURIComponent(campaignKey))}')">
                        <span class="content-tree-caret-v308">›</span>
                        <span class="content-tree-folder-v308">▰</span>
                        <span class="content-tree-copy-v308"><b>${escapeHtml(campaign.name)}</b><small>${campaign.adsets.length} nhóm · ${campaign.ads.length} bài</small></span>
                        ${contentTreeMiniMetricsHtmlV308(campaign.metric)}
                    </button>
                    <div class="content-tree-children-v308">${adsetHtml}</div>
                </div>`;
        }).join('');

        return `
            <section class="content-tree-employee-v308 ${employeeOpen ? 'content-tree-node-open-v308' : ''}">
                <button type="button" class="content-tree-toggle-v308 content-tree-employee-head-v308" onclick="window.toggleContentTreeV308('${escapeHtml(encodeURIComponent(employeeKey))}')">
                    <span class="content-tree-caret-v308">›</span>
                    <span class="content-tree-avatar-v308">${escapeHtml(contentTreeInitialsV308(employee.name))}</span>
                    <span class="content-tree-copy-v308"><b>${escapeHtml(employee.name)}</b><small>${employee.campaigns.length} chiến dịch · ${employee.ads.length} bài quảng cáo</small></span>
                    ${contentTreeMiniMetricsHtmlV308(employee.metric)}
                </button>
                <div class="content-tree-children-v308">${campaignHtml}</div>
            </section>`;
    }).join('');

    CONTENT_TREE_NODE_KEYS_V308 = allNodeKeys;
    feed.innerHTML = `<div class="content-tree-v308">${html}</div>`;
}

window.MKT_CONTENT_TREE_V308 = {
    version:'V308_EMPLOYEE_CAMPAIGN_ADSET_AD_TREE',
    expandAll:window.expandAllContentTreeV308,
    collapseAll:window.collapseAllContentTreeV308
};


/* =========================================================
   V309 — CONTENT TREE SPLIT VIEW
   Nhân viên → Nhóm đã gom theo SKU/tên sản phẩm → Bài quảng cáo.
   - Bỏ cấp Chiến dịch khỏi giao diện.
   - Khung trái: cây thư mục.
   - Khung phải: preview lớn, cố định theo bài đang chọn.
   - Mặc định chọn bài đầu tiên.
   - Poster ưu tiên fanpage_media_url do backend V309 trả về.
   ========================================================= */
let CONTENT_BROWSER_OPEN_V309 = new Set();
let CONTENT_BROWSER_SELECTED_AD_V309 = '';
let CONTENT_BROWSER_LAST_GROUPED_ROWS_V309 = [];
let CONTENT_BROWSER_LAST_TREE_V309 = null;
let CONTENT_BROWSER_CONTEXT_V309 = '';

function injectContentBrowserStylesV309() {
    if (document.getElementById('content-browser-v309-style')) return;
    const style = document.createElement('style');
    style.id = 'content-browser-v309-style';
    style.textContent = ''; /* V321 CSS lives in Blogger */
    document.head.appendChild(style);
}

contentAdMediaUrlV307 = function(ad) {
    return String(ad && (
        ad.fanpage_media_url ||
        ad.fanpageMediaUrl ||
        ad.primary_media_url ||
        ad.highres_image_url ||
        ad.facebook_post_media_url ||
        ad.image_url ||
        ad.thumbnail_url ||
        ad.rendered_thumbnail_url
    ) || '').trim();
};

function contentBrowserGroupKeyV309(item, index) {
    const company = String(item && item.company || CURRENT_COMPANY || '').toUpperCase();
    const employee = String(item && item.employee || '').trim();
    const sku = String(item && (item.sku || item.duplicate_sku) || '').trim().toUpperCase();
    const product = String(item && (item.productName || item.cleanAdName || item.adName) || '').trim();
    return String(item && item.meta_live_row_key || '') || [company, normalizeAdsText(employee), normalizeAdsText(sku || product), index].join('||');
}

function contentBrowserBuildV309(groupedRows) {
    const rows = Array.isArray(groupedRows) ? groupedRows : [];
    const ads = contentTreeAdsV308(rows);
    const groupByAdset = new Map();
    const groupsByKey = new Map();

    rows.forEach((item,index) => {
        if (!item) return;
        const employee = String(item.employee || 'Chưa xác định nhân viên').replace(/\s+/g,' ').trim();
        const key = contentBrowserGroupKeyV309(item,index);
        const sku = String(item.sku || item.duplicate_sku || '').trim().toUpperCase();
        const product = String(item.productName || item.cleanAdName || item.adName || 'Nhóm quảng cáo').replace(/\s+/g,' ').trim();
        const node = {key,employee,sku,product,item,adsetIds:new Set(),ads:[]};
        if (item.adsetId) node.adsetIds.add(String(item.adsetId));
        (Array.isArray(item.original_adset_rows) ? item.original_adset_rows : []).forEach(r => {
            if (r && r.adsetId) node.adsetIds.add(String(r.adsetId));
        });
        node.adsetIds.forEach(id => groupByAdset.set(id,node));
        groupsByKey.set(key,node);
    });

    ads.forEach(ad => {
        const adsetId = String(ad && ad.adsetId || '').trim();
        let group = groupByAdset.get(adsetId);
        if (!group) {
            const employee = String(ad && ad.employee || 'Chưa xác định nhân viên').trim();
            const sku = String(ad && ad.sku || '').trim().toUpperCase();
            const product = String(ad && ad.productName || (ad.adset && ad.adset.name) || 'Nhóm quảng cáo').trim();
            const key = ['fallback',normalizeAdsText(employee),normalizeAdsText(sku || product)].join('||');
            group = groupsByKey.get(key);
            if (!group) {
                group = {key,employee,sku,product,item:null,adsetIds:new Set(),ads:[]};
                groupsByKey.set(key,group);
            }
        }
        group.ads.push(ad);
    });

    const employees = new Map();
    Array.from(groupsByKey.values()).forEach(group => {
        if (!group.ads.length) return;
        group.ads.sort((a,b) => {
            if (SORT_MODE === 'purchases') return Number(b.result||0)-Number(a.result||0) || Number(b.spend||0)-Number(a.spend||0);
            if (SORT_MODE === 'messages') return Number(b.messages||0)-Number(a.messages||0) || Number(b.spend||0)-Number(a.spend||0);
            return Number(b.spend||0)-Number(a.spend||0) || Number(b.result||0)-Number(a.result||0);
        });
        group.metric = contentTreeMetricV308(group.ads);
        const empKey = normalizeAdsText(group.employee) || group.employee;
        if (!employees.has(empKey)) employees.set(empKey,{key:empKey,name:group.employee,groups:[],ads:[]});
        const emp = employees.get(empKey);
        emp.groups.push(group);
        emp.ads.push(...group.ads);
    });

    const output = Array.from(employees.values()).map(emp => {
        emp.groups.sort((a,b) => b.metric.spend-a.metric.spend || a.product.localeCompare(b.product,'vi'));
        emp.metric = contentTreeMetricV308(emp.ads);
        return emp;
    }).sort((a,b) => b.metric.spend-a.metric.spend || a.name.localeCompare(b.name,'vi'));

    return {employees:output,ads};
}

function contentBrowserContextV309() {
    try {
        const period = getMetaLivePeriod();
        return [CURRENT_COMPANY,period.from,period.to,META_LIVE_DATA_SCOPE].join('|');
    } catch (e) {
        return [CURRENT_COMPANY,META_LIVE_DATA_SCOPE].join('|');
    }
}

function contentBrowserFindAdV309(adId) {
    adId = String(adId || '');
    const tree = CONTENT_BROWSER_LAST_TREE_V309;
    return tree && Array.isArray(tree.ads)
        ? tree.ads.find(ad => String(ad && (ad.id || ad.adId) || '') === adId)
        : null;
}

function contentBrowserEnsureStateV309(tree) {
    const signature = contentBrowserContextV309();
    const validIds = new Set((tree.ads || []).map(ad => String(ad && (ad.id || ad.adId) || '')).filter(Boolean));
    if (CONTENT_BROWSER_CONTEXT_V309 !== signature) {
        CONTENT_BROWSER_CONTEXT_V309 = signature;
        CONTENT_BROWSER_OPEN_V309 = new Set();
        (tree.employees || []).forEach(emp => CONTENT_BROWSER_OPEN_V309.add('emp::' + emp.key));
        const firstEmp = tree.employees && tree.employees[0];
        const firstGroup = firstEmp && firstEmp.groups && firstEmp.groups[0];
        if (firstEmp && firstGroup) CONTENT_BROWSER_OPEN_V309.add('grp::' + firstEmp.key + '::' + firstGroup.key);
        const firstRenderedAdV309 = tree.employees && tree.employees[0] && tree.employees[0].groups && tree.employees[0].groups[0] && tree.employees[0].groups[0].ads && tree.employees[0].groups[0].ads[0];
        CONTENT_BROWSER_SELECTED_AD_V309 = firstRenderedAdV309 ? String(firstRenderedAdV309.id || firstRenderedAdV309.adId || '') : '';
    } else if (!validIds.has(CONTENT_BROWSER_SELECTED_AD_V309)) {
        const firstRenderedAdV309 = tree.employees && tree.employees[0] && tree.employees[0].groups && tree.employees[0].groups[0] && tree.employees[0].groups[0].ads && tree.employees[0].groups[0].ads[0];
        CONTENT_BROWSER_SELECTED_AD_V309 = firstRenderedAdV309 ? String(firstRenderedAdV309.id || firstRenderedAdV309.adId || '') : '';
    }
}

function contentBrowserFirstAdOfGroupV311(groupTreeKey) {
    const tree = CONTENT_BROWSER_LAST_TREE_V309;
    if (!tree || !groupTreeKey) return null;
    for (const emp of (tree.employees || [])) {
        for (const group of (emp.groups || [])) {
            const key = 'grp::' + emp.key + '::' + group.key;
            if (key === groupTreeKey) {
                return Array.isArray(group.ads) && group.ads.length ? group.ads[0] : null;
            }
        }
    }
    return null;
}

window.toggleContentBrowserV309 = function(encodedKey) {
    const key = decodeURIComponent(String(encodedKey || ''));
    if (!key) return;

    // V311: bấm vào Nhóm quảng cáo thì luôn đưa bài đầu tiên của nhóm đó
    // lên khung chi tiết bên phải. Việc mở/đóng cây vẫn giữ như cũ.
    if (key.indexOf('grp::') === 0) {
        const firstAd = contentBrowserFirstAdOfGroupV311(key);
        if (firstAd) {
            CONTENT_BROWSER_SELECTED_AD_V309 = String(firstAd.id || firstAd.adId || '');
        }
    }

    if (CONTENT_BROWSER_OPEN_V309.has(key)) CONTENT_BROWSER_OPEN_V309.delete(key);
    else CONTENT_BROWSER_OPEN_V309.add(key);
    renderContentPerformanceOverviewV306(CONTENT_BROWSER_LAST_GROUPED_ROWS_V309);
};

window.expandAllContentBrowserV309 = function() {
    const tree = CONTENT_BROWSER_LAST_TREE_V309;
    if (!tree) return;
    (tree.employees || []).forEach(emp => {
        CONTENT_BROWSER_OPEN_V309.add('emp::' + emp.key);
        (emp.groups || []).forEach(group => CONTENT_BROWSER_OPEN_V309.add('grp::' + emp.key + '::' + group.key));
    });
    renderContentPerformanceOverviewV306(CONTENT_BROWSER_LAST_GROUPED_ROWS_V309);
};

window.collapseAllContentBrowserV309 = function() {
    CONTENT_BROWSER_OPEN_V309.clear();
    renderContentPerformanceOverviewV306(CONTENT_BROWSER_LAST_GROUPED_ROWS_V309);
};

window.selectContentAdV309 = function(adId) {
    const id = String(adId || '').trim();
    const ad = contentBrowserFindAdV309(id);
    if (!ad) return;
    CONTENT_BROWSER_SELECTED_AD_V309 = id;
    document.querySelectorAll('#content-browser-tree-v309 .content-browser-ad-v309').forEach(el => {
        el.classList.toggle('is-selected-v309', el.getAttribute('data-ad-id') === id);
    });
    const detail = document.getElementById('content-browser-detail-v309');
    if (detail) detail.innerHTML = contentBrowserDetailHtmlV309(ad);
};

function contentBrowserAdRowHtmlV309(ad) {
    const adId = String(ad && (ad.id || ad.adId) || '');
    const media = contentAdMediaUrlV307(ad);
    const title = String(ad && (ad.name || ad.preview_title) || 'Bài quảng cáo').trim();
    const copy = String(ad && (ad.preview_body || ad.preview_description) || '').trim();
    const spend = metaCostWithVatV304(ad && ad.spend);
    const purchases = Number(ad && ad.result || 0);
    const messages = Number(ad && ad.messages || 0);
    const selected = adId === CONTENT_BROWSER_SELECTED_AD_V309;
    return `
        <div class="content-browser-ad-v309 ${selected ? 'is-selected-v309' : ''}" data-ad-id="${escapeHtml(adId)}" role="button" tabindex="0" onclick="window.selectContentAdV309('${escapeHtml(adId)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.selectContentAdV309('${escapeHtml(adId)}')}">
            <div class="content-browser-ad-thumb-v309">${media ? `<img src="${escapeHtml(media)}" alt="${escapeHtml(title)}" loading="lazy">` : '<div class="ph">AD</div>'}</div>
            <div class="content-browser-ad-copy-v309"><b>${escapeHtml(title)}</b><p>${escapeHtml(copy || 'Chưa có caption trong dữ liệu Meta.')}</p></div>
            <div class="content-browser-ad-kpi-v309"><b>${formatMetaLiveInteger(messages)} tin · ${formatMetaLiveInteger(purchases)} mua</b><small>${formatMetaLiveInteger(Math.round(spend))} ₫ + VAT</small></div>
        </div>`;
}

function contentBrowserDetailHtmlV309(ad) {
    if (!ad) return '<div class="content-browser-empty-v309">Chọn một bài quảng cáo ở cây bên trái để xem nội dung.</div>';
    const adId = String(ad.id || ad.adId || '');
    const media = contentAdMediaUrlV307(ad);
    const source = String(ad.fanpage_media_source || ad.fanpageMediaSource || ad.primary_media_source || 'Meta/Fanpage').trim();
    const title = String(ad.preview_title || ad.name || 'Bài quảng cáo').trim();
    const body = String(ad.preview_body || '').trim();
    const description = String(ad.preview_description || '').trim();
    const employee = String(ad.employee || '').trim();
    const product = String(ad.productName || '').trim();
    const sku = String(ad.sku || '').trim();
    const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
    const spend = metaCostWithVatV304(ad.spend);
    const messages = Number(ad.messages || 0);
    const purchases = Number(ad.result || 0);
    const ctr = Number(ad.ctr || 0);
    const cpa = purchases > 0 ? spend / purchases : 0;
    const cr = messages > 0 ? (purchases / messages) * 100 : (purchases > 0 ? 100 : 0);
    const postUrl = String(ad.preview_post_url || '').trim();
    const status = contentAdStatusV307(ad);
    const mediaKind = String(ad.preview_type || ad.primary_media_kind || '').toLowerCase();
    return `
        <div class="content-browser-detail-scroll-v309">
            <div class="content-browser-detail-head-v309">
                <div class="content-browser-detail-kicker-v309">NỘI DUNG BÀI QUẢNG CÁO</div>
                <h3>${escapeHtml(title)}</h3>
                <div class="content-browser-detail-context-v309">
                    <span>${escapeHtml(status.label)}</span>
                    ${employee ? `<span>👤 ${escapeHtml(employee)}</span>` : ''}
                    ${product ? `<span>🌱 ${escapeHtml(product)}</span>` : ''}
                    ${sku ? `<span>SKU ${escapeHtml(sku)}</span>` : ''}
                    ${adset.name ? `<span>Nhóm: ${escapeHtml(adset.name)}</span>` : ''}
                </div>
            </div>
            <div class="content-browser-media-v309">
                ${media ? `<img src="${escapeHtml(media)}" alt="${escapeHtml(title)}">${mediaKind === 'video' ? '<span class="content-tree-video-v308">▶ VIDEO</span>' : ''}<span class="content-browser-media-source-v309">${escapeHtml(source)}</span>` : '<div class="content-browser-media-empty-v309">Meta/Fanpage chưa trả media của bài này. Nội dung chữ và chỉ số vẫn được giữ để đối chiếu.</div>'}
            </div>
            <div class="content-browser-detail-body-v309">
                <div class="content-browser-copy-full-v309">${escapeHtml(body || 'Meta chưa trả caption của bài này.').replace(/\n/g,'<br>')}</div>
                ${description ? `<div class="content-browser-headline-v309"><b>${escapeHtml(title)}</b><p>${escapeHtml(description)}</p></div>` : ''}
                <div class="content-browser-kpis-v309">
                    <div><span>Chi phí + VAT</span><b>${formatMetaLiveInteger(Math.round(spend))} ₫</b></div>
                    <div><span>Tin nhắn</span><b>${formatMetaLiveInteger(messages)}</b></div>
                    <div><span>Lượt mua</span><b>${formatMetaLiveInteger(purchases)}</b></div>
                    <div><span>CTR link</span><b>${ctr.toFixed(2)}%</b></div>
                    <div><span>CPA + VAT</span><b>${purchases > 0 ? formatMetaLiveInteger(Math.round(cpa)) + ' ₫' : '—'}</b></div>
                    <div><span>Mua / Tin</span><b>${cr.toFixed(2)}%</b></div>
                </div>
                <div class="content-browser-detail-actions-v309">
                    <button type="button" class="primary" onclick="window.openContentAdV307('${escapeHtml(adId)}')">Mở popup chi tiết</button>
                    ${postUrl ? `<a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener">Mở bài Facebook</a>` : ''}
                </div>
            </div>
        </div>`;
}

renderContentPerformanceOverviewV306 = function(data) {
    injectContentBrowserStylesV309();
    CONTENT_BROWSER_LAST_GROUPED_ROWS_V309 = Array.isArray(data) ? data : [];
    const summary = document.getElementById('content-ad-summary-v307');
    const feed = document.getElementById('content-ad-feed-v307');
    const note = document.getElementById('content-feed-note-v307');
    if (!summary || !feed) return;

    const tree = contentBrowserBuildV309(CONTENT_BROWSER_LAST_GROUPED_ROWS_V309);
    CONTENT_BROWSER_LAST_TREE_V309 = tree;
    contentBrowserEnsureStateV309(tree);
    const groupCount = tree.employees.reduce((sum,emp) => sum + emp.groups.length,0);
    const metric = contentTreeMetricV308(tree.ads);

    summary.innerHTML = `
        <div class="content-ad-summary-card-v307"><span>Nhân viên</span><b>${formatMetaLiveInteger(tree.employees.length)}</b><small>Đã gom alias tên cũ/mới</small></div>
        <div class="content-ad-summary-card-v307"><span>Nhóm đã gom</span><b>${formatMetaLiveInteger(groupCount)}</b><small>Theo SKU / sản phẩm</small></div>
        <div class="content-ad-summary-card-v307 is-good"><span>Bài quảng cáo</span><b>${formatMetaLiveInteger(tree.ads.length)}</b><small>Chọn bài để xem bên phải</small></div>
        <div class="content-ad-summary-card-v307"><span>Chi phí + VAT</span><b>${new Intl.NumberFormat('vi-VN',{notation:'compact',maximumFractionDigits:1}).format(metric.spend || 0)} ₫</b><small>${formatMetaLiveInteger(metric.purchases)} lượt mua</small></div>`;

    if (note) note.textContent = tree.ads.length
        ? `${tree.employees.length} nhân viên · ${groupCount} nhóm đã gom · ${tree.ads.length} bài quảng cáo`
        : 'Chưa có bài quảng cáo phù hợp bộ lọc hiện tại.';

    if (!tree.employees.length) {
        feed.innerHTML = '<div class="content-browser-empty-v309">Chưa có dữ liệu để hiển thị cây Nhân viên → Nhóm → Bài.</div>';
        return;
    }

    const leftHtml = tree.employees.map(emp => {
        const empKey = 'emp::' + emp.key;
        const empOpen = CONTENT_BROWSER_OPEN_V309.has(empKey);
        const groupsHtml = emp.groups.map(group => {
            const grpKey = 'grp::' + emp.key + '::' + group.key;
            const grpOpen = CONTENT_BROWSER_OPEN_V309.has(grpKey);
            return `
                <div class="content-browser-group-v309 ${grpOpen ? 'is-open-v309' : ''}">
                    <button type="button" class="content-browser-toggle-v309 content-browser-group-head-v309" onclick="window.toggleContentBrowserV309('${escapeHtml(encodeURIComponent(grpKey))}')">
                        <span class="content-browser-caret-v309">›</span>
                        <span class="content-browser-group-icon-v309">N</span>
                        <span class="content-browser-copy-v309"><b>${escapeHtml(group.product)}</b><small>${escapeHtml([group.sku ? `SKU ${group.sku}` : '', `${group.ads.length} bài`].filter(Boolean).join(' · '))}</small></span>
                        <span class="content-browser-mini-v309">${formatMetaLiveInteger(group.metric.messages)} tin · ${formatMetaLiveInteger(group.metric.purchases)} mua</span>
                    </button>
                    <div class="content-browser-children-v309"><div class="content-browser-ads-v309">${group.ads.map(contentBrowserAdRowHtmlV309).join('')}</div></div>
                </div>`;
        }).join('');
        return `
            <section class="content-browser-employee-v309 ${empOpen ? 'is-open-v309' : ''}">
                <button type="button" class="content-browser-toggle-v309 content-browser-employee-head-v309" onclick="window.toggleContentBrowserV309('${escapeHtml(encodeURIComponent(empKey))}')">
                    <span class="content-browser-caret-v309">›</span>
                    <span class="content-browser-avatar-v309">${escapeHtml(contentTreeInitialsV308(emp.name))}</span>
                    <span class="content-browser-copy-v309"><b>${escapeHtml(emp.name)}</b><small>${emp.groups.length} nhóm đã gom · ${emp.ads.length} bài</small></span>
                    <span class="content-browser-mini-v309">${formatMetaLiveInteger(emp.metric.messages)} tin · ${formatMetaLiveInteger(emp.metric.purchases)} mua</span>
                </button>
                <div class="content-browser-children-v309">${groupsHtml}</div>
            </section>`;
    }).join('');

    const firstRenderedAdV309 = tree.employees && tree.employees[0] && tree.employees[0].groups && tree.employees[0].groups[0] && tree.employees[0].groups[0].ads && tree.employees[0].groups[0].ads[0];
    const selected = contentBrowserFindAdV309(CONTENT_BROWSER_SELECTED_AD_V309) || firstRenderedAdV309 || tree.ads[0];
    feed.innerHTML = `
        <div class="content-browser-v309">
            <div class="content-browser-left-v309">
                <div class="content-browser-left-head-v309"><div><b>Cây nội dung quảng cáo</b><small>Nhân viên → Nhóm đã gom → Bài</small></div><div class="content-browser-actions-v309"><button type="button" onclick="window.expandAllContentBrowserV309()">Mở tất cả</button><button type="button" onclick="window.collapseAllContentBrowserV309()">Thu gọn</button></div></div>
                <div id="content-browser-tree-v309" class="content-browser-tree-v309">${leftHtml}</div>
            </div>
            <aside id="content-browser-detail-v309" class="content-browser-right-v309">${contentBrowserDetailHtmlV309(selected)}</aside>
        </div>`;
};



/* =========================================================
   V310 — MEDIA QUALITY SELECTOR
   - Ưu tiên ảnh Fanpage gốc khi có kích thước đủ lớn.
   - Nếu Fanpage trả ảnh nhỏ, chọn nguồn Meta có độ phân giải thực cao hơn.
   - Không tự nội suy/upscale giả pixel ở client.
   ========================================================= */
function contentAdBestMediaV310(ad) {
    ad = ad || {};
    const candidates = [];
    const ratioDistance = (w,h) => {
        w = Number(w || 0); h = Number(h || 0);
        if (!(w > 0 && h > 0)) return 999;
        return Math.abs((w / h) - 0.8);
    };
    const sourceRank = (source, fallbackRank) => {
        const s = String(source || '').toLowerCase();
        if (s.includes('facebook_photo_images_original')) return 1000;
        if (s.includes('adimage_hash') || s.includes('meta ad images')) return 900;
        if (s.includes('facebook_post_attachment') || s.includes('attachment_')) return 800;
        if (s.includes('facebook_full_picture') || s.includes('full_picture')) return 700;
        if (s.includes('facebook') || s.includes('fanpage') || s.includes('story')) return 650;
        if (s.includes('creative_image')) return 350;
        if (s.includes('rendered')) return 120;
        if (s.includes('thumbnail')) return 60;
        return Number(fallbackRank || 0);
    };
    const add = (url,width,height,source,rank) => {
        url = String(url || '').trim();
        if (!url) return;
        source = String(source || '');
        width = Number(width || 0);
        height = Number(height || 0);
        // Rendered 4096 là kích thước YÊU CẦU render, không phải kích thước asset thật.
        if (/rendered|thumbnail_fallback/i.test(source)) { width = 0; height = 0; }
        const baseRank = sourceRank(source, rank);
        const delta = ratioDistance(width,height);
        const ratioBonus = delta <= 0.04 ? 80 : (delta <= 0.10 ? 45 : (height > width && width > 0 ? 15 : 0));
        candidates.push({
            url,width,height,source,
            rank:baseRank,
            score:baseRank + ratioBonus,
            area:width*height,
            ratioDelta:delta
        });
    };

    // 1) Ảnh thật của bài Fanpage (Photo.images/attachment/full_picture theo source backend).
    add(ad.fanpage_media_url || ad.fanpageMediaUrl,
        ad.fanpage_media_width || ad.fanpageMediaWidth,
        ad.fanpage_media_height || ad.fanpageMediaHeight,
        ad.fanpage_media_source || ad.fanpageMediaSource || 'Facebook/Fanpage',950);

    // 2) Ad Images theo image_hash — asset quảng cáo gốc, giữ width/height thật.
    add(ad.highres_image_url || ad.highresImageUrl,
        ad.highres_width || ad.highresWidth,
        ad.highres_height || ad.highresHeight,
        'adimage_hash',900);

    // 3) primary/story chỉ là fallback bổ sung. Rank được suy ra từ source thật.
    add(ad.primary_media_url || ad.primaryMediaUrl,
        ad.primary_media_width || ad.primaryMediaWidth,
        ad.primary_media_height || ad.primaryMediaHeight,
        ad.primary_media_source || ad.primaryMediaSource || 'Meta primary',500);
    add(ad.story_image_url || ad.storyImageUrl,
        ad.story_image_width || ad.storyImageWidth,
        ad.story_image_height || ad.storyImageHeight,
        ad.story_image_source || ad.storyImageSource || 'Facebook story',650);
    add(ad.video_thumbnail_url || ad.videoThumbnailUrl,
        ad.video_thumbnail_width || ad.videoThumbnailWidth,
        ad.video_thumbnail_height || ad.videoThumbnailHeight,
        'video_thumbnail',500);

    // 4) Rendered/thumbnail chỉ là đường lui cuối cùng.
    add(ad.rendered_thumbnail_url || ad.renderedThumbnailUrl,0,0,'rendered_thumbnail_fallback',120);
    add(ad.image_url || ad.imageUrl,0,0,'creative_image_url',350);
    add(ad.thumbnail_url || ad.thumbnailUrl,0,0,'creative_thumbnail_fallback',60);

    if (!candidates.length) return {url:'',width:0,height:0,source:'',rank:0,score:0,area:0,ratioDelta:999};

    // Khử URL trùng; giữ bản có source tin cậy hơn.
    const bestByUrl = new Map();
    candidates.forEach(item => {
        const old = bestByUrl.get(item.url);
        if (!old || item.score > old.score || (item.score === old.score && item.area > old.area)) bestByUrl.set(item.url,item);
    });
    const unique = Array.from(bestByUrl.values());
    unique.sort((a,b) => {
        if (a.score !== b.score) return b.score-a.score;
        if (a.area !== b.area) return b.area-a.area;
        return a.ratioDelta-b.ratioDelta;
    });
    return unique[0];
}

function contentBrowserMediaMetaV320(ad) {
    ad = ad || {};
    const bestMedia = contentAdBestMediaV310(ad);
    const videoSource = String(ad.video_source_url || ad.videoSourceUrl || '').trim();
    const videoPermalink = String(ad.video_permalink_url || ad.videoPermalinkUrl || ad.preview_post_url || ad.previewPostUrl || '').trim();
    const previewType = String(ad.preview_type || ad.previewType || ad.primary_media_kind || ad.primaryMediaKind || '').trim().toLowerCase();
    const mediaKind = videoSource ? 'video' : String(bestMedia.kind || previewType || 'image').toLowerCase();
    const width = Number(bestMedia.width || 0);
    const height = Number(bestMedia.height || 0);
    const ratio = width > 0 && height > 0 ? width / height : 0;
    const ratioLabel = ratio > 0 && Math.abs(ratio - 0.8) <= 0.08
        ? '4:5'
        : (width > 0 && height > 0 ? `${width}×${height}` : '4:5');
    return {
        imageUrl:String(bestMedia.url || '').trim(),
        videoSource:videoSource,
        videoPermalink:videoPermalink,
        mediaKind:mediaKind,
        source:String(bestMedia.source || (videoSource ? 'Facebook video source' : 'Meta/Fanpage')),
        width:width,
        height:height,
        dimension:width > 0 && height > 0 ? `${width}×${height}px` : 'kích thước chưa được Meta công bố',
        ratioLabel:ratioLabel
    };
}


contentAdMediaUrlV307 = function(ad) {
    return contentAdBestMediaV310(ad).url;
};

contentBrowserDetailHtmlV309 = function(ad) {
    if (!ad) return '<div class="content-browser-empty-v309">Chọn một bài quảng cáo ở cây bên trái để xem nội dung.</div>';
    const adId = String(ad.id || ad.adId || '');
    const mediaMeta = contentBrowserMediaMetaV320(ad);
    const imageUrl = mediaMeta.imageUrl;
    const videoSource = mediaMeta.videoSource;
    const videoPermalink = mediaMeta.videoPermalink;
    const source = mediaMeta.source || 'Meta/Fanpage';
    const dimension = mediaMeta.dimension || 'kích thước chưa được Meta công bố';
    const ratioLabel = mediaMeta.ratioLabel || '4:5';
    const title = String(ad.preview_title || ad.previewTitle || ad.name || 'Bài quảng cáo').trim();
    const body = String(ad.preview_body || ad.previewBody || '').trim();
    const description = String(ad.preview_description || ad.previewDescription || '').trim();
    const employee = String(ad.employee || '').trim();
    const product = String(ad.productName || '').trim();
    const sku = String(ad.sku || '').trim();
    const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
    const spend = metaCostWithVatV304(ad.spend);
    const messages = Number(ad.messages || 0);
    const purchases = Number(ad.result || 0);
    const ctr = Number(ad.ctr || 0);
    const cpa = purchases > 0 ? spend / purchases : 0;
    const cr = messages > 0 ? (purchases / messages) * 100 : (purchases > 0 ? 100 : 0);
    const postUrl = String(ad.preview_post_url || ad.previewPostUrl || '').trim();
    const status = contentAdStatusV307(ad);
    const isVideo = mediaMeta.mediaKind === 'video' || !!videoSource;

    let mediaBlock = '';
    if (videoSource) {
        mediaBlock = `<div class="content-browser-media-frame-v320"><video controls playsinline preload="metadata" src="${escapeHtml(videoSource)}"${imageUrl ? ` poster="${escapeHtml(imageUrl)}"` : ''}></video><span class="content-browser-media-source-v309">VIDEO · ${escapeHtml(source)} · ${escapeHtml(dimension)}</span></div>`;
    } else if (imageUrl) {
        mediaBlock = `<div class="content-browser-media-frame-v320"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">${isVideo && (videoPermalink || postUrl) ? `<a class="content-browser-media-play-v320" href="${escapeHtml(videoPermalink || postUrl)}" target="_blank" rel="noopener">▶ Xem video</a>` : ''}<span class="content-browser-media-source-v309">${escapeHtml(ratioLabel)} · ${escapeHtml(source)} · nguồn ${escapeHtml(dimension)}</span></div>`;
    } else {
        mediaBlock = '<div class="content-browser-media-empty-v309">Meta/Fanpage chưa trả media của bài này. Nội dung chữ và chỉ số vẫn được giữ để đối chiếu.</div>';
    }

    return `
        <div class="content-browser-detail-scroll-v309">
            <div class="content-browser-detail-head-v309">
                <div class="content-browser-detail-kicker-v309">NỘI DUNG BÀI QUẢNG CÁO</div>
                <h3>${escapeHtml(title)}</h3>
                <div class="content-browser-detail-context-v309">
                    <span>${escapeHtml(status.label)}</span>
                    ${employee ? `<span>👤 ${escapeHtml(employee)}</span>` : ''}
                    ${product ? `<span>🌱 ${escapeHtml(product)}</span>` : ''}
                    ${sku ? `<span>SKU ${escapeHtml(sku)}</span>` : ''}
                    ${adset.name ? `<span>Nhóm: ${escapeHtml(adset.name)}</span>` : ''}
                </div>
            </div>
            <div class="content-browser-media-v309">${mediaBlock}</div>
            <div class="content-browser-detail-body-v309">
                <div class="content-browser-copy-full-v309">${escapeHtml(body || 'Meta chưa trả caption của bài này.').replace(/\n/g,'<br>')}</div>
                ${description ? `<div class="content-browser-headline-v309"><b>${escapeHtml(title)}</b><p>${escapeHtml(description)}</p></div>` : ''}
                <div class="content-browser-kpis-v309">
                    <div><span>Chi phí + VAT</span><b>${formatMetaLiveInteger(Math.round(spend))} ₫</b></div>
                    <div><span>Tin nhắn</span><b>${formatMetaLiveInteger(messages)}</b></div>
                    <div><span>Lượt mua</span><b>${formatMetaLiveInteger(purchases)}</b></div>
                    <div><span>CTR link</span><b>${ctr.toFixed(2)}%</b></div>
                    <div><span>CPA + VAT</span><b>${purchases > 0 ? formatMetaLiveInteger(Math.round(cpa)) + ' ₫' : '—'}</b></div>
                    <div><span>Mua / Tin</span><b>${cr.toFixed(2)}%</b></div>
                </div>
                <div class="content-browser-detail-actions-v309">
                    <button type="button" class="primary" onclick="window.openContentAdV307('${escapeHtml(adId)}')">Mở popup chi tiết</button>
                    ${postUrl ? `<a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener">Mở bài Facebook</a>` : ''}
                    ${isVideo && (videoPermalink || postUrl) ? `<a href="${escapeHtml(videoPermalink || postUrl)}" target="_blank" rel="noopener">▶ Xem video</a>` : ''}
                </div>
            </div>
        </div>`;
};

window.MKT_CONTENT_BROWSER_V309 = {
    version:'V322_BLOGGER_HTML_CSS_GITHUB_JS',
    select:window.selectContentAdV309,
    expandAll:window.expandAllContentBrowserV309,
    collapseAll:window.collapseAllContentBrowserV309
};


/* V315 hard export + diagnostics */
window.MKT_ADS_PART2_BUILD = 'V322_ADS_UI';
window.MKT_ADS_MODULE_BUILD = 'V322_ADS_READY';
if (typeof initAdsAnalysis === 'function') window.initAdsAnalysis = initAdsAnalysis;
window.getAdsModuleBuildV322 = function(){ return { build: window.MKT_ADS_MODULE_BUILD || '', part1: window.MKT_ADS_PART1_BUILD || '', part2: window.MKT_ADS_PART2_BUILD || '', initType: typeof window.initAdsAnalysis }; };
