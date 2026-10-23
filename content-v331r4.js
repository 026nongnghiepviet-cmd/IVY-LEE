/* V331 R4: CONTENT CENTER R11 — repackaged with unique filename. */
/*
 * MKT SYSTEM — CONTENT MANAGEMENT CENTER V326 R11
 * - Overlay độc lập, chạy sau V325 Part 1 + Part 2.
 * - Không thay đổi dữ liệu báo cáo cũ.
 * - Quản lý thư viện nội dung, workflow, cảnh báo, tác vụ và tự động hóa.
 */
(function installContentCenterV326() {
    'use strict';

    const BUILD = 'V326_R11_NEW_UI_PERIOD_SCOPED_ADS_TREE_COLLAPSED';
    const LAYOUT_BUILD = 'V326_R11_CONTENT_MANAGER_PERIOD_ADS_TREE_MANUAL_EXPAND';
    const STYLE_ID = 'content-center-v326-r11-style';
    if (window.MKT_CONTENT_CENTER_BUILD === BUILD && window.MKT_CONTENT_CENTER_V326) {
        try { window.MKT_CONTENT_CENTER_V326.mount(); } catch (error) {}
        return;
    }
    const DATA_ROOT = 'content_manager_v326';
    const STORAGE_PREFIX = 'MKT_CONTENT_CENTER_V326_';
    const MAX_SAVED_VIEWS = 12;

    const WORKFLOW_OPTIONS = [
        { value: 'idea', label: 'Ý tưởng' },
        { value: 'draft', label: 'Đang soạn' },
        { value: 'review', label: 'Chờ duyệt' },
        { value: 'approved', label: 'Đã duyệt' },
        { value: 'live', label: 'Đang chạy' },
        { value: 'optimize', label: 'Cần tối ưu' },
        { value: 'done', label: 'Hoàn tất' },
        { value: 'archive', label: 'Lưu trữ' }
    ];

    const DEFAULT_SETTINGS = {
        autoRefreshMinutes: 0,
        autoCreateTasks: false,
        healthSnapshot: true,
        spendNoPurchase: 300000,
        spendNoMessage: 150000,
        lowCtr: 0.8,
        highFrequency: 3.5,
        winnerPurchases: 3,
        winnerConversionRate: 10,
        staleDays: 30,
        legacyVisible: false
    };


    const DEFAULT_FILTERS_R8 = {
        query: '',
        content: 'all',
        workflow: 'all',
        owner: 'all',
        issue: 'all',
        sort: 'spend_desc'
    };

    const VALID_CONTENT_FILTERS_R8 = new Set(['all','resolved','missing','image','video','winner','risk']);
    const VALID_WORKFLOW_FILTERS_R8 = new Set(['all'].concat(WORKFLOW_OPTIONS.map(item => item.value)));
    const VALID_ISSUE_FILTERS_R8 = new Set(['all','missing_content','spend_no_purchase','spend_no_message','low_ctr','high_frequency','overdue']);
    const VALID_SORT_FILTERS_R8 = new Set(['spend_desc','purchase_desc','message_desc','ctr_desc','risk_first','newest','due_asc']);

    const state = {
        company: 'NNV',
        sourceRows: [],
        ads: [],
        filteredAds: [],
        selectedAdId: '',
        selectedIds: new Set(),
        workflow: {},
        workflowRef: null,
        workflowListener: null,
        mounted: false,
        rendering: false,
        lastRenderAt: 0,
        lastDataSignature: '',
        view: 'library',
        filters: Object.assign({}, DEFAULT_FILTERS_R8),
        pendingFilterRecoveryR8: true,
        lastFilterRecoveryR8: null,
        settings: Object.assign({}, DEFAULT_SETTINGS),
        savedViews: [],
        autoRefreshTimer: null,
        lastAutoRefreshAt: 0,
        lastHealthPersistAt: 0,
        treeOpen: new Set(),
        treeContext: '',
        treeCollapseAll: false,
        hooksInstalled: false,
        originalRender: null,
        originalInit: null,
        originalChangeCompany: null
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function safeNumber(value) {
        const number = Number(value || 0);
        return Number.isFinite(number) ? number : 0;
    }

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function formatInteger(value) {
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
            .format(Math.round(safeNumber(value)));
    }

    function formatMoney(value) {
        return formatInteger(value) + ' ₫';
    }

    function compactMoney(value) {
        const number = safeNumber(value);
        return new Intl.NumberFormat('vi-VN', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(number) + ' ₫';
    }

    function dateInputValue(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        const date = new Date(text);
        if (Number.isNaN(date.getTime())) return text.slice(0, 10);
        return date.toISOString().slice(0, 10);
    }

    function formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value).slice(0, 10) || '—';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function getCurrentCompany() {
        try {
            if (typeof window.getAdsReentryStatusV258 === 'function') {
                const status = window.getAdsReentryStatusV258();
                if (status && status.currentCompany) {
                    return String(status.currentCompany).toUpperCase();
                }
            }
        } catch (error) {}

        const selector = document.getElementById('company-selector');
        return String(selector && selector.value || state.company || 'NNV').toUpperCase();
    }

    function getDb() {
        try {
            if (window.sysDb) return window.sysDb;
            if (typeof getDatabase === 'function') return getDatabase();
            if (window.firebase && firebase.database) return firebase.database();
        } catch (error) {}
        return null;
    }

    function currentUserInfo() {
        const user = window.sysAuth && window.sysAuth.currentUser;
        return {
            uid: String(user && user.uid || ''),
            email: String(user && user.email || ''),
            name: String(
                window.myIdentity ||
                user && user.displayName ||
                user && user.email ||
                'Người dùng'
            )
        };
    }

    function canWrite() {
        try {
            if (typeof isGuestMode === 'function' && isGuestMode()) return false;
            if (typeof isViewOnlyMode === 'function' && isViewOnlyMode()) return false;
        } catch (error) {}
        return true;
    }

    function notify(message, type) {
        try {
            if (typeof showToast === 'function') {
                showToast(message, type || 'success');
                return;
            }
            if (typeof window.showToast === 'function') {
                window.showToast(message, type || 'success');
                return;
            }
        } catch (error) {}
        console[type === 'error' ? 'error' : 'log']('[Content Center]', message);
    }

    function storageKey(name, company) {
        return STORAGE_PREFIX + String(company || state.company || 'NNV') + '_' + name;
    }

    function safeLocalGet(key, fallback) {
        try {
            const value = window.localStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function safeLocalSet(key, value) {
        try {
            window.localStorage.setItem(key, String(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function loadJson(key, fallback) {
        try {
            const raw = safeLocalGet(key, '');
            if (!raw) return fallback;
            const value = JSON.parse(raw);
            return value == null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function saveJson(key, value) {
        try {
            return safeLocalSet(key, JSON.stringify(value));
        } catch (error) {
            return false;
        }
    }

    function sanitizeFiltersR8(filters) {
        const next = Object.assign({}, DEFAULT_FILTERS_R8, filters || {});
        next.query = String(next.query || '');
        next.content = VALID_CONTENT_FILTERS_R8.has(String(next.content || '')) ? String(next.content) : 'all';
        next.workflow = VALID_WORKFLOW_FILTERS_R8.has(String(next.workflow || '')) ? String(next.workflow) : 'all';
        next.owner = String(next.owner || 'all').trim() || 'all';
        next.issue = VALID_ISSUE_FILTERS_R8.has(String(next.issue || '')) ? String(next.issue) : 'all';
        next.sort = VALID_SORT_FILTERS_R8.has(String(next.sort || '')) ? String(next.sort) : 'spend_desc';
        return next;
    }

    function loadLocalState() {
        const company = state.company;
        state.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            loadJson(storageKey('SETTINGS', company), {})
        );
        // R9: giao diện Quản lý nội dung mới luôn là giao diện chính. Không khôi phục legacyVisible từ localStorage.
        state.settings.legacyVisible = false;
        state.savedViews = loadJson(storageKey('SAVED_VIEWS', company), []);
        if (!Array.isArray(state.savedViews)) state.savedViews = [];

        // R8: luôn reset về mặc định trước khi đọc bộ lọc của công ty hiện tại.
        // Tránh VN kế thừa Owner/Workflow/Search từ NNV/KF/ABC khi công ty đó chưa có LAST_FILTERS.
        const savedFilters = loadJson(storageKey('LAST_FILTERS', company), null);
        state.filters = sanitizeFiltersR8(savedFilters && typeof savedFilters === 'object' ? savedFilters : DEFAULT_FILTERS_R8);

        const savedView = String(safeLocalGet(storageKey('VIEW', company), 'library') || 'library');
        state.view = ['library','issues','workflow'].includes(savedView) ? savedView : 'library';
        state.pendingFilterRecoveryR8 = true;
    }

    function hasActiveFiltersR8() {
        return !!(
            normalizeText(state.filters.query) ||
            state.filters.content !== 'all' ||
            state.filters.workflow !== 'all' ||
            state.filters.owner !== 'all' ||
            state.filters.issue !== 'all' ||
            state.view !== 'library'
        );
    }

    function resetFiltersR8(persist) {
        state.filters = Object.assign({}, DEFAULT_FILTERS_R8);
        state.view = 'library';
        state.selectedIds.clear();
        if (persist) saveLocalState();
    }

    function recoverFiltersAfterSourceLoadR8() {
        if (!state.pendingFilterRecoveryR8) return false;
        state.pendingFilterRecoveryR8 = false;
        if (!Array.isArray(state.ads) || !state.ads.length) return false;

        // Owner cũ không còn tồn tại ở dữ liệu công ty này thì bỏ riêng Owner trước.
        if (state.filters.owner !== 'all') {
            const availableOwners = new Set(state.ads.map(ad => employeeOf(ad)).filter(Boolean));
            if (!availableOwners.has(state.filters.owner)) state.filters.owner = 'all';
        }

        filterAds();
        if (state.filteredAds.length) return false;
        if (!hasActiveFiltersR8()) return false;

        const previous = Object.assign({}, state.filters, { view: state.view });
        resetFiltersR8(true);
        filterAds();
        state.lastFilterRecoveryR8 = {
            company: state.company,
            at: new Date().toISOString(),
            previous: previous,
            recoveredCount: state.filteredAds.length
        };
        try { console.info('[Content Center R8] Đã tự đặt lại bộ lọc rỗng:', state.lastFilterRecoveryR8); } catch (error) {}
        return true;
    }

    function saveLocalState() {
        saveJson(storageKey('SETTINGS', state.company), state.settings);
        saveJson(storageKey('SAVED_VIEWS', state.company), state.savedViews);
        saveJson(storageKey('LAST_FILTERS', state.company), state.filters);
        safeLocalSet(storageKey('VIEW', state.company), state.view);
    }

    function adId(ad, index) {
        return String(
            ad && (ad.adId || ad.id || ad.creative_id) ||
            'content_' + index
        ).trim();
    }

    function mergeAd(base, incoming) {
        const output = Object.assign({}, base || {});
        Object.keys(incoming || {}).forEach(key => {
            const value = incoming[key];
            const current = output[key];
            const incomingUseful = value !== undefined && value !== null && value !== '' &&
                !(Array.isArray(value) && value.length === 0);
            const currentEmpty = current === undefined || current === null || current === '' ||
                (Array.isArray(current) && current.length === 0);
            if (currentEmpty && incomingUseful) output[key] = value;
            else if (key === 'spend' || key === 'result' || key === 'messages') {
                if (safeNumber(value) > safeNumber(current)) output[key] = value;
            }
        });
        return output;
    }

    function looksLikeAd(node) {
        if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
        const id = String(node.adId || node.id || '').trim();
        if (!id) return false;
        return !!(
            node.fanpage_post_found !== undefined ||
            node.fanpage_post_id ||
            node.preview_body ||
            node.preview_title ||
            node.creative_id ||
            node.adset ||
            node.adsetId ||
            node.campaign ||
            node.result !== undefined ||
            node.messages !== undefined
        );
    }

    function flattenAdsFallback(rows) {
        const map = new Map();
        const visited = new Set();

        function add(node, inherited) {
            if (!looksLikeAd(node)) return;
            const merged = Object.assign({}, inherited || {}, node || {});
            const id = adId(merged, map.size);
            if (!id) return;
            map.set(id, mergeAd(map.get(id), merged));
        }

        function walk(value, depth, inherited) {
            if (depth > 7 || value == null) return;
            if (Array.isArray(value)) {
                value.forEach(item => walk(item, depth + 1, inherited));
                return;
            }
            if (typeof value !== 'object') return;
            if (visited.has(value)) return;
            visited.add(value);

            const inheritedNext = Object.assign({}, inherited || {});
            ['company','employee','productName','sku','campaignName','adsetId'].forEach(key => {
                if (value[key] !== undefined && value[key] !== '') inheritedNext[key] = value[key];
            });
            if (value.campaign && typeof value.campaign === 'object') {
                inheritedNext.campaign = value.campaign;
            }
            if (value.adset && typeof value.adset === 'object') {
                inheritedNext.adset = value.adset;
            }

            add(value, inheritedNext);

            [
                'ads',
                'activityAds',
                'original_ads',
                'original_ad_rows',
                'original_adset_rows',
                'rows',
                'children',
                'items'
            ].forEach(key => {
                if (value[key]) walk(value[key], depth + 1, inheritedNext);
            });
        }

        walk(rows, 0, {});
        return Array.from(map.values());
    }

    function groupedMetaByAdsetR7(rows) {
        const map = new Map();
        (Array.isArray(rows) ? rows : []).forEach(item => {
            if (!item) return;
            const ids = [];
            if (item.adsetId) ids.push(String(item.adsetId));
            (Array.isArray(item.original_adset_rows) ? item.original_adset_rows : []).forEach(row => {
                if (row && row.adsetId) ids.push(String(row.adsetId));
            });
            ids.forEach(id => {
                if (!id) return;
                map.set(id, item);
            });
        });
        return map;
    }

    function directMetaAdsR7() {
        let source = [];
        try {
            if (typeof META_CONTENT_ADS_V307 !== 'undefined' && Array.isArray(META_CONTENT_ADS_V307)) {
                source = META_CONTENT_ADS_V307;
            }
        } catch (error) {}
        const company = String(state.company || getCurrentCompany() || '').toUpperCase();
        return (Array.isArray(source) ? source : []).filter(ad => {
            const adCompany = String(ad && ad.company || company).toUpperCase();
            return !company || !adCompany || adCompany === company;
        });
    }

    // R10: cây Ads phải bám đúng tập dữ liệu đang xuất hiện ở Bảng Meta chi tiết
    // sau khi đã áp dụng công ty + khoảng ngày + scope Tổng quan/Marketing + tìm kiếm.
    function periodScopeR10(rows) {
        const adsetIds = new Set();
        const groupKeys = new Set();

        function addGroupKey(item) {
            if (!item) return;
            const employee = String(item.employee || '').replace(/\s+/g, ' ').trim();
            const sku = String(item.sku || item.duplicate_sku || '').trim().toUpperCase();
            const product = String(
                item.productName ||
                item.cleanAdName ||
                item.adName ||
                item.fullName ||
                item.adsetName ||
                ''
            ).replace(/\s+/g, ' ').trim();
            const key = [normalizeText(employee), normalizeText(sku || product)].join('||');
            if (key !== '||') groupKeys.add(key);
        }

        (Array.isArray(rows) ? rows : []).forEach(item => {
            if (!item) return;
            [item.adsetId, item.adset_id].forEach(value => {
                value = String(value || '').trim();
                if (value) adsetIds.add(value);
            });
            (Array.isArray(item.adsetIds) ? item.adsetIds : []).forEach(value => {
                value = String(value || '').trim();
                if (value) adsetIds.add(value);
            });
            (Array.isArray(item.memberAdsetIds) ? item.memberAdsetIds : []).forEach(value => {
                value = String(value || '').trim();
                if (value) adsetIds.add(value);
            });
            (Array.isArray(item.original_adset_rows) ? item.original_adset_rows : []).forEach(row => {
                const value = String(row && (row.adsetId || row.adset_id) || '').trim();
                if (value) adsetIds.add(value);
                addGroupKey(row);
            });
            addGroupKey(item);
        });

        return { adsetIds, groupKeys };
    }

    function adScopeKeyR10(ad) {
        ad = ad || {};
        const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
        const employee = String(ad.employee || '').replace(/\s+/g, ' ').trim();
        const sku = String(ad.sku || ad.duplicate_sku || '').trim().toUpperCase();
        const product = String(
            ad.productName ||
            ad.cleanAdName ||
            ad.adName ||
            adset.name ||
            ''
        ).replace(/\s+/g, ' ').trim();
        return [normalizeText(employee), normalizeText(sku || product)].join('||');
    }

    function adMatchesPeriodScopeR10(ad, scope) {
        ad = ad || {};
        const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
        const adsetId = String(ad.adsetId || ad.adset_id || adset.id || '').trim();
        if (adsetId && scope.adsetIds.has(adsetId)) return true;
        const key = adScopeKeyR10(ad);
        return key !== '||' && scope.groupKeys.has(key);
    }

    function adHasPeriodActivityR10(ad) {
        ad = ad || {};
        if (ad.has_insights === true || ad.has_delivery_data === true) return true;
        return [
            ad.spend,
            ad.messages,
            ad.result,
            ad.purchases,
            ad.impressions,
            ad.reach,
            ad.clicks,
            ad.linkClicks,
            ad.inline_link_clicks
        ].some(value => safeNumber(value) > 0);
    }

    function flattenAds(rows) {
        const periodRows = Array.isArray(rows) ? rows : [];
        const groupedMap = groupedMetaByAdsetR7(periodRows);
        const scope = periodScopeR10(periodRows);

        // Nếu Bảng Meta chi tiết không có dòng nào trong kỳ thì cây cũng phải rỗng.
        if (!periodRows.length) return [];

        let output = directMetaAdsR7();

        // Cây chỉ giữ bài thuộc đúng các nhóm đang có mặt ở Bảng Meta chi tiết
        // và bản thân bài phải có phát sinh/Insights trong đúng khoảng ngày.
        output = (Array.isArray(output) ? output : []).filter(ad =>
            adMatchesPeriodScopeR10(ad, scope) && adHasPeriodActivityR10(ad)
        );

        if (!output.length) {
            try {
                if (typeof contentTreeAdsV308 === 'function') {
                    output = contentTreeAdsV308(periodRows).filter(ad =>
                        adMatchesPeriodScopeR10(ad, scope) && adHasPeriodActivityR10(ad)
                    );
                }
            } catch (error) {
                console.warn('R10 fallback contentTreeAdsV308:', error);
            }
        }

        const map = new Map();
        output.filter(Boolean).forEach((ad, index) => {
            const id = adId(ad, index);
            const adset = ad && ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
            const adsetId = String(ad && (ad.adsetId || ad.adset_id) || adset.id || '').trim();
            const grouped = groupedMap.get(adsetId) || {};
            const normalized = Object.assign({}, ad, {
                id: String(ad.id || id),
                adId: String(ad.adId || ad.id || id),
                company: String(ad.company || state.company || '').toUpperCase(),
                employee: String(ad.employee || grouped.employee || 'Chưa xác định nhân viên'),
                productName: String(ad.productName || grouped.productName || grouped.cleanAdName || grouped.adName || ''),
                sku: String(ad.sku || grouped.sku || grouped.duplicate_sku || '')
            });
            map.set(id, mergeAd(map.get(id), normalized));
        });
        return Array.from(map.values());
    }

    function getWorkflow(ad) {
        return state.workflow[firebaseKey(adId(ad))] || {};
    }

    function firebaseKey(value) {
        return String(value || '').replace(/[.#$\[\]/]/g, '_');
    }

    function mediaInfo(ad) {
        ad = ad || {};
        const contentSource = String(ad.fanpage_content_source || '').trim();
        const found = ad.fanpage_post_found === true && contentSource.indexOf('facebook_page_api') === 0;
        const kind = String(ad.fanpage_media_kind || '').toLowerCase();
        const image = found ? String(ad.fanpage_media_url || '').trim() : '';
        const video = found ? String(ad.fanpage_video_source_url || '').trim() : '';
        const width = found ? safeNumber(ad.fanpage_media_width) : 0;
        const height = found ? safeNumber(ad.fanpage_media_height) : 0;
        const resolvedKind = video ? 'video' : (image ? (kind || 'image') : 'none');
        const ratio = width > 0 && height > 0
            ? width / height
            : (resolvedKind === 'video' ? 9 / 16 : 4 / 5);
        const nearFourFive = Math.abs(ratio - (4 / 5)) <= 0.08;
        const nearNineSixteen = Math.abs(ratio - (9 / 16)) <= 0.06;
        const ratioLabel = nearFourFive
            ? '4:5'
            : (nearNineSixteen ? '9:16' : (width > 0 && height > 0 ? `${width}:${height}` : (resolvedKind === 'video' ? '9:16' : '4:5')));
        return {
            found,
            kind: resolvedKind,
            image,
            video,
            width,
            height,
            ratio,
            ratioLabel,
            dimension: width > 0 && height > 0 ? `${formatInteger(width)}×${formatInteger(height)} px` : 'kích thước Page API',
            permalink: found ? String(ad.fanpage_post_permalink || ad.fanpage_video_permalink_url || '').trim() : ''
        };
    }

    function captionOf(ad) {
        return String(ad && ad.fanpage_post_message || '').trim();
    }

    function titleOf(ad) {
        return String(
            ad.productName ||
            ad.preview_title ||
            ad.name ||
            ad.adName ||
            'Bài quảng cáo'
        ).replace(/\s+/g, ' ').trim();
    }

    function employeeOf(ad) {
        return String(ad.employee || 'Chưa phân công').replace(/\s+/g, ' ').trim();
    }

    function workflowLabel(value) {
        const found = WORKFLOW_OPTIONS.find(item => item.value === value);
        return found ? found.label : 'Chưa phân loại';
    }

    function workflowClass(value) {
        return 'wf-' + String(value || 'none').replace(/[^a-z0-9_-]/gi, '');
    }

    function metricsOf(ad) {
        const spendRaw = safeNumber(ad.spend);
        const spend = typeof metaCostWithVatV304 === 'function'
            ? safeNumber(metaCostWithVatV304(spendRaw))
            : spendRaw * 1.1;
        const purchases = safeNumber(ad.result || ad.purchases);
        const messages = safeNumber(ad.messages);
        const ctr = safeNumber(ad.ctr);
        const frequency = safeNumber(ad.freq || ad.frequency);
        const cpa = purchases > 0 ? spend / purchases : 0;
        const cpm = messages > 0 ? spend / messages : 0;
        const conversionRate = messages > 0
            ? purchases / messages * 100
            : (purchases > 0 ? 100 : 0);
        return { spend, purchases, messages, ctr, frequency, cpa, cpm, conversionRate };
    }

    function daysOld(value) {
        const date = new Date(value || '');
        if (Number.isNaN(date.getTime())) return 0;
        return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    }

    function evaluateAd(ad) {
        const metrics = metricsOf(ad);
        const media = mediaInfo(ad);
        const workflow = getWorkflow(ad);
        const issues = [];
        const status = String(ad.effective_status || ad.status || '').toUpperCase();
        const found = ad.fanpage_post_found === true &&
            String(ad.fanpage_content_source || '').indexOf('facebook_page_api') === 0;

        if (!found) {
            issues.push({
                code: 'missing_content',
                severity: 'critical',
                label: 'Thiếu bài gốc Fanpage',
                detail: String(
                    ad.fanpage_error_message ||
                    'Page API chưa trả nội dung gốc.'
                )
            });
        }

        if (metrics.spend >= state.settings.spendNoPurchase && metrics.purchases === 0) {
            issues.push({
                code: 'spend_no_purchase',
                severity: 'critical',
                label: 'Chi cao · chưa có đơn',
                detail: `${formatMoney(metrics.spend)} nhưng chưa ghi nhận lượt mua.`
            });
        }

        if (metrics.spend >= state.settings.spendNoMessage && metrics.messages === 0) {
            issues.push({
                code: 'spend_no_message',
                severity: 'high',
                label: 'Chi cao · chưa có tin',
                detail: `${formatMoney(metrics.spend)} nhưng chưa có cuộc trò chuyện.`
            });
        }

        if (metrics.spend > 0 && metrics.ctr > 0 && metrics.ctr < state.settings.lowCtr) {
            issues.push({
                code: 'low_ctr',
                severity: 'medium',
                label: 'CTR thấp',
                detail: `CTR ${metrics.ctr.toFixed(2)}%, thấp hơn ngưỡng ${state.settings.lowCtr}%.`
            });
        }

        if (metrics.frequency >= state.settings.highFrequency && metrics.purchases === 0) {
            issues.push({
                code: 'high_frequency',
                severity: 'medium',
                label: 'Tần suất cao',
                detail: `Tần suất ${metrics.frequency.toFixed(2)} nhưng chưa có đơn.`
            });
        }

        if (['DISAPPROVED','WITH_ISSUES','LIMITED'].includes(status)) {
            issues.push({
                code: 'delivery_issue',
                severity: 'high',
                label: 'Meta đang hạn chế',
                detail: `Trạng thái Meta: ${status}.`
            });
        }

        const age = daysOld(ad.fanpage_post_created_time || ad.created_time);
        if (age >= state.settings.staleDays && metrics.spend > 0) {
            issues.push({
                code: 'stale_content',
                severity: 'low',
                label: 'Nội dung đã cũ',
                detail: `Bài đã chạy khoảng ${age} ngày.`
            });
        }

        if (workflow.dueDate) {
            const due = new Date(workflow.dueDate + 'T23:59:59');
            if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now() &&
                !['done','archive'].includes(String(workflow.status || ''))) {
                issues.push({
                    code: 'overdue',
                    severity: 'high',
                    label: 'Tác vụ quá hạn',
                    detail: `Hạn xử lý ${formatDate(workflow.dueDate)}.`
                });
            }
        }

        const winner = metrics.purchases >= state.settings.winnerPurchases ||
            (metrics.purchases > 0 && metrics.conversionRate >= state.settings.winnerConversionRate);

        return {
            found,
            winner,
            risk: issues.some(item => ['critical','high'].includes(item.severity)),
            issues,
            metrics,
            media,
            age
        };
    }

    function searchHaystack(ad) {
        const campaign = ad.campaign && typeof ad.campaign === 'object' ? ad.campaign : {};
        const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
        const workflow = getWorkflow(ad);
        return normalizeText([
            titleOf(ad),
            captionOf(ad),
            ad.name,
            ad.productName,
            ad.sku,
            employeeOf(ad),
            campaign.name,
            ad.campaignName,
            adset.name,
            ad.adsetName,
            ad.fanpage_page_name,
            ad.fanpage_post_id,
            workflow.owner,
            workflow.tags,
            workflow.note
        ].filter(Boolean).join(' '));
    }

    function filterAds() {
        const query = normalizeText(state.filters.query);
        const contentFilter = state.filters.content;
        const issueFilter = state.filters.issue;
        const workflowFilter = state.filters.workflow;
        const ownerFilter = state.filters.owner;

        let rows = state.ads.filter(ad => {
            const evaluation = evaluateAd(ad);
            const workflow = getWorkflow(ad);
            if (query && !searchHaystack(ad).includes(query)) return false;

            if (contentFilter === 'resolved' && !evaluation.found) return false;
            if (contentFilter === 'missing' && evaluation.found) return false;
            if (contentFilter === 'image' && evaluation.media.kind !== 'image') return false;
            if (contentFilter === 'video' && evaluation.media.kind !== 'video') return false;
            if (contentFilter === 'winner' && !evaluation.winner) return false;
            if (contentFilter === 'risk' && !evaluation.risk) return false;

            if (workflowFilter !== 'all' && String(workflow.status || '') !== workflowFilter) return false;
            if (ownerFilter !== 'all' && String(workflow.owner || employeeOf(ad)) !== ownerFilter) return false;
            if (issueFilter !== 'all' && !evaluation.issues.some(item => item.code === issueFilter)) return false;

            if (state.view === 'issues' && !evaluation.issues.length) return false;
            if (state.view === 'workflow' && !workflow.status && !workflow.owner && !workflow.dueDate) return false;
            return true;
        });

        const sort = state.filters.sort;
        rows.sort((a, b) => {
            const ea = evaluateAd(a);
            const eb = evaluateAd(b);
            const wa = getWorkflow(a);
            const wb = getWorkflow(b);
            if (sort === 'purchase_desc') return eb.metrics.purchases - ea.metrics.purchases;
            if (sort === 'message_desc') return eb.metrics.messages - ea.metrics.messages;
            if (sort === 'ctr_desc') return eb.metrics.ctr - ea.metrics.ctr;
            if (sort === 'newest') {
                return new Date(b.fanpage_post_created_time || b.created_time || 0) -
                    new Date(a.fanpage_post_created_time || a.created_time || 0);
            }
            if (sort === 'due_asc') {
                return String(wa.dueDate || '9999-99-99').localeCompare(String(wb.dueDate || '9999-99-99'));
            }
            if (sort === 'risk_first') {
                return Number(eb.risk) - Number(ea.risk) || eb.metrics.spend - ea.metrics.spend;
            }
            return eb.metrics.spend - ea.metrics.spend;
        });

        state.filteredAds = rows;
        return rows;
    }

    function summaryStats() {
        const rows = state.ads;
        const stats = {
            total: rows.length,
            resolved: 0,
            missing: 0,
            winners: 0,
            risks: 0,
            overdue: 0,
            spend: 0,
            purchases: 0,
            messages: 0
        };
        rows.forEach(ad => {
            const evaluation = evaluateAd(ad);
            stats[evaluation.found ? 'resolved' : 'missing']++;
            if (evaluation.winner) stats.winners++;
            if (evaluation.risk) stats.risks++;
            if (evaluation.issues.some(item => item.code === 'overdue')) stats.overdue++;
            stats.spend += evaluation.metrics.spend;
            stats.purchases += evaluation.metrics.purchases;
            stats.messages += evaluation.metrics.messages;
        });
        return stats;
    }

    function owners() {
        const set = new Set();
        state.ads.forEach(ad => {
            const workflow = getWorkflow(ad);
            const owner = String(workflow.owner || employeeOf(ad)).trim();
            if (owner) set.add(owner);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
    }

    function rootElement() {
        return document.getElementById('content-center-v326');
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #ads-analysis-result .content-center-v326{--cc-bg:#f5f7fb;--cc-card:#fff;--cc-border:#e5eaf1;--cc-text:#172033;--cc-muted:#69768a;--cc-primary:#2563eb;--cc-primary-soft:#eff6ff;--cc-good:#138a55;--cc-good-soft:#ecfdf3;--cc-warn:#b65d05;--cc-warn-soft:#fff7ed;--cc-danger:#c83232;--cc-danger-soft:#fff1f2;--cc-purple:#6d4bc3;--cc-purple-soft:#f5f3ff;font-family:Inter,Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--cc-text);background:var(--cc-bg);border:1px solid var(--cc-border);border-radius:22px;overflow:hidden;box-shadow:0 16px 45px rgba(15,23,42,.08);margin:2px 0 18px;min-width:0}
            #ads-analysis-result .cc-hero-v326{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 24px 18px;background:linear-gradient(135deg,#10233d 0%,#17365e 52%,#1f4f7f 100%);color:#fff}
            #ads-analysis-result .cc-kicker-v326{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#a8d4ff}
            #ads-analysis-result .cc-hero-v326 h2{margin:7px 0 6px!important;font-size:24px!important;line-height:1.15!important;color:#fff!important;font-weight:800!important}
            #ads-analysis-result .cc-hero-v326 p{margin:0!important;max-width:760px;color:#d5e4f4!important;font-size:11px!important;line-height:1.6!important}
            #ads-analysis-result .cc-hero-actions-v326{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
            #ads-analysis-result .cc-chip-v326{display:inline-flex;align-items:center;gap:7px;padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);font-size:9px;font-weight:800;white-space:nowrap}
            #ads-analysis-result .cc-chip-v326 i{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.15)}
            #ads-analysis-result .cc-btn-v326{appearance:none;border:1px solid var(--cc-border);background:#fff;color:#334155;border-radius:11px;padding:9px 11px;font-size:9.5px;font-weight:800;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
            #ads-analysis-result .cc-btn-v326:hover{transform:translateY(-1px);border-color:#b9c7d9;box-shadow:0 8px 20px rgba(15,23,42,.08)}
            #ads-analysis-result .cc-btn-v326.primary{border-color:#2563eb;background:#2563eb;color:#fff}
            #ads-analysis-result .cc-btn-v326.danger{border-color:#fecaca;background:#fff1f2;color:#b42318}
            #ads-analysis-result .cc-btn-v326.dark{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:#fff}
            #ads-analysis-result .cc-btn-v326:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
            #ads-analysis-result .cc-summary-v326{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;padding:14px 18px;background:#fff;border-bottom:1px solid var(--cc-border)}
            #ads-analysis-result .cc-stat-v326{position:relative;min-width:0;padding:13px 14px;border:1px solid var(--cc-border);border-radius:15px;background:#fff;overflow:hidden}
            #ads-analysis-result .cc-stat-v326:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#94a3b8}
            #ads-analysis-result .cc-stat-v326.good:before{background:var(--cc-good)}#ads-analysis-result .cc-stat-v326.warn:before{background:var(--cc-warn)}#ads-analysis-result .cc-stat-v326.danger:before{background:var(--cc-danger)}#ads-analysis-result .cc-stat-v326.blue:before{background:var(--cc-primary)}#ads-analysis-result .cc-stat-v326.purple:before{background:var(--cc-purple)}
            #ads-analysis-result .cc-stat-v326 span{display:block;color:var(--cc-muted);font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-stat-v326 b{display:block;margin-top:6px;font-size:21px;line-height:1;color:var(--cc-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-stat-v326 small{display:block;margin-top:5px;color:#8b98a9;font-size:8.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-controls-v326{padding:14px 18px;border-bottom:1px solid var(--cc-border);background:#fbfcfe}
            #ads-analysis-result .cc-view-tabs-v326{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px}
            #ads-analysis-result .cc-view-tab-v326{border:1px solid var(--cc-border);background:#fff;color:#64748b;border-radius:10px;padding:8px 10px;font-size:9px;font-weight:800;cursor:pointer}
            #ads-analysis-result .cc-view-tab-v326.active{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}
            #ads-analysis-result .cc-filter-grid-v326{display:grid;grid-template-columns:minmax(220px,2fr) repeat(5,minmax(120px,1fr)) auto;gap:8px;align-items:end}
            #ads-analysis-result .cc-field-v326{min-width:0}
            #ads-analysis-result .cc-field-v326 label{display:block;margin:0 0 5px;color:#7a8798;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
            #ads-analysis-result .cc-field-v326 input,#ads-analysis-result .cc-field-v326 select,#ads-analysis-result .cc-field-v326 textarea{width:100%;box-sizing:border-box;border:1px solid #dbe3ed;border-radius:10px;background:#fff;color:#273548;padding:9px 10px;font-size:9.5px;outline:none;transition:border-color .15s ease,box-shadow .15s ease}
            #ads-analysis-result .cc-field-v326 input:focus,#ads-analysis-result .cc-field-v326 select:focus,#ads-analysis-result .cc-field-v326 textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
            #ads-analysis-result .cc-body-v326{display:grid;grid-template-columns:minmax(350px,43%) minmax(0,57%);min-height:650px;background:var(--cc-bg)}
            #ads-analysis-result .cc-library-v326{border-right:1px solid var(--cc-border);min-width:0;display:flex;flex-direction:column}
            #ads-analysis-result .cc-list-head-v326{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:#fff;border-bottom:1px solid var(--cc-border)}
            #ads-analysis-result .cc-list-head-v326 b{font-size:11px}.cc-list-head-v326 small{display:block;margin-top:3px;color:var(--cc-muted);font-size:8.5px}
            #ads-analysis-result .cc-bulk-v326{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
            #ads-analysis-result .cc-bulk-v326 select{border:1px solid var(--cc-border);border-radius:9px;background:#fff;padding:7px 8px;font-size:8.5px;font-weight:700}
            #ads-analysis-result .cc-list-v326{flex:1;min-height:0;overflow:auto;padding:10px;scrollbar-gutter:stable}
            #ads-analysis-result .cc-tree-v326{display:grid;gap:9px}
            #ads-analysis-result .cc-tree-employee-v326{border:1px solid var(--cc-border);border-radius:15px;background:#fff;overflow:hidden}
            #ads-analysis-result .cc-tree-node-button-v326{width:100%;appearance:none;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
            #ads-analysis-result .cc-tree-employee-head-v326{display:grid;grid-template-columns:22px 34px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 11px;background:linear-gradient(135deg,#f8fbff,#fff)}
            #ads-analysis-result .cc-tree-caret-v326{width:20px;height:20px;border:1px solid #dce5ef;border-radius:7px;background:#fff;color:#64748b;display:grid;place-items:center;font-size:9px;font-weight:900;transition:transform .15s ease,background .15s ease}
            #ads-analysis-result .cc-tree-employee-v326.open>.cc-tree-node-button-v326 .cc-tree-caret-v326,#ads-analysis-result .cc-tree-group-v326.open>.cc-tree-node-button-v326 .cc-tree-caret-v326{transform:rotate(90deg);background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
            #ads-analysis-result .cc-tree-avatar-v326{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;display:grid;place-items:center;font-size:9px;font-weight:900}
            #ads-analysis-result .cc-tree-copy-v326{min-width:0}.cc-tree-copy-v326 b{display:block;color:#172033;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-tree-copy-v326 small{display:block;margin-top:3px;color:#8793a3;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-tree-total-v326{text-align:right;white-space:nowrap}.cc-tree-total-v326 b{display:block;color:#334155;font-size:8.5px}.cc-tree-total-v326 small{display:block;margin-top:2px;color:#94a3b8;font-size:7.5px}
            #ads-analysis-result .cc-tree-children-v326{display:none;border-top:1px solid #edf2f7}#ads-analysis-result .cc-tree-employee-v326.open>.cc-tree-children-v326,#ads-analysis-result .cc-tree-group-v326.open>.cc-tree-children-v326{display:block}
            #ads-analysis-result .cc-tree-group-v326{border-bottom:1px solid #eef2f7;background:#fcfdff}.cc-tree-group-v326:last-child{border-bottom:0}
            #ads-analysis-result .cc-tree-group-head-v326{display:grid;grid-template-columns:20px 28px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 10px 9px 26px}
            #ads-analysis-result .cc-tree-group-head-v326:hover{background:#f4f8ff}.cc-tree-folder-v326{width:26px;height:26px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;display:grid;place-items:center;font-size:11px}
            #ads-analysis-result .cc-tree-ads-v326{display:grid;gap:5px;padding:0 8px 9px 52px}
            #ads-analysis-result .cc-tree-ad-v326{display:grid;grid-template-columns:20px 44px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px;border:1px solid #e7ecf3;border-radius:11px;background:#fff;cursor:pointer;transition:border-color .14s ease,background .14s ease,box-shadow .14s ease}
            #ads-analysis-result .cc-tree-ad-v326:hover{border-color:#bfdbfe;background:#f8fbff}#ads-analysis-result .cc-tree-ad-v326.selected{border-color:#2563eb;background:#eff6ff;box-shadow:0 0 0 2px rgba(37,99,235,.07)}
            #ads-analysis-result .cc-tree-check-v326{display:grid;place-items:center}.cc-tree-check-v326 input{accent-color:#2563eb}
            #ads-analysis-result .cc-tree-thumb-v326{position:relative;width:44px;height:54px;border-radius:8px;overflow:hidden;background:#eef2f7;display:grid;place-items:center;color:#94a3b8;font-size:7px;font-weight:900}.cc-tree-thumb-v326 img{width:100%;height:100%;object-fit:cover;display:block}.cc-tree-thumb-v326 span{position:absolute;left:3px;bottom:3px;padding:3px 4px;border-radius:999px;background:rgba(15,23,42,.78);color:#fff;font-size:6px}
            #ads-analysis-result .cc-tree-ad-main-v326{min-width:0}.cc-tree-ad-main-v326 b{display:block;color:#253247;font-size:9.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-tree-ad-main-v326 p{margin:3px 0 0!important;color:#7b8798!important;font-size:7.8px!important;line-height:1.35!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cc-tree-ad-main-v326 small{display:block;margin-top:4px;color:#64748b;font-size:7.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-tree-ad-kpi-v326{text-align:right;white-space:nowrap}.cc-tree-ad-kpi-v326 b{display:block;color:#334155;font-size:8px}.cc-tree-ad-kpi-v326 small{display:block;margin-top:2px;color:#94a3b8;font-size:7px}
            #ads-analysis-result .cc-card-v326{display:grid;grid-template-columns:22px 80px minmax(0,1fr);gap:10px;padding:10px;margin-bottom:8px;border:1px solid var(--cc-border);border-radius:15px;background:#fff;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}
            #ads-analysis-result .cc-card-v326:hover{border-color:#b9c8da;box-shadow:0 8px 22px rgba(15,23,42,.07);transform:translateY(-1px)}
            #ads-analysis-result .cc-card-v326.selected{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
            #ads-analysis-result .cc-card-check-v326{display:flex;align-items:flex-start;justify-content:center;padding-top:3px}.cc-card-check-v326 input{accent-color:#2563eb}
            #ads-analysis-result .cc-thumb-v326{position:relative;width:80px;height:92px;border-radius:11px;overflow:hidden;background:linear-gradient(135deg,#e8edf4,#f8fafc);display:grid;place-items:center;color:#94a3b8;font-weight:900}
            #ads-analysis-result .cc-thumb-v326 img,#ads-analysis-result .cc-thumb-v326 video{width:100%;height:100%;object-fit:cover;display:block}
            #ads-analysis-result .cc-thumb-badge-v326{position:absolute;left:5px;bottom:5px;padding:4px 6px;border-radius:999px;background:rgba(15,23,42,.78);color:#fff;font-size:7px;font-weight:800}
            #ads-analysis-result .cc-card-main-v326{min-width:0}
            #ads-analysis-result .cc-card-top-v326{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
            #ads-analysis-result .cc-card-title-v326{min-width:0;font-size:10.5px;line-height:1.4;font-weight:800;color:#1e293b;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
            #ads-analysis-result .cc-card-copy-v326{margin-top:6px;color:#64748b;font-size:8.8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
            #ads-analysis-result .cc-badges-v326{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
            #ads-analysis-result .cc-badge-v326{display:inline-flex;align-items:center;max-width:100%;padding:4px 6px;border-radius:999px;background:#f1f5f9;color:#526074;font-size:7.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-badge-v326.good{background:var(--cc-good-soft);color:#087b49}.cc-badge-v326.warn{background:var(--cc-warn-soft);color:#9a4d04}.cc-badge-v326.danger{background:var(--cc-danger-soft);color:#b42318}.cc-badge-v326.blue{background:var(--cc-primary-soft);color:#1d4ed8}.cc-badge-v326.purple{background:var(--cc-purple-soft);color:#6540ad}
            #ads-analysis-result .cc-mini-metrics-v326{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:8px}
            #ads-analysis-result .cc-mini-metrics-v326 span{min-width:0;padding:5px 6px;border-radius:8px;background:#f8fafc;color:#7a8798;font-size:7px}.cc-mini-metrics-v326 b{display:block;margin-top:2px;color:#334155;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-empty-v326{padding:45px 18px;text-align:center;color:#718096;font-size:10px;line-height:1.7}
            #ads-analysis-result .cc-detail-v326{min-width:0;background:#fff;display:flex;flex-direction:column}
            #ads-analysis-result .cc-detail-scroll-v326{height:100%;max-height:760px;overflow:auto;scrollbar-gutter:stable}
            #ads-analysis-result .cc-detail-placeholder-v326{height:100%;min-height:620px;display:grid;place-items:center;padding:30px;text-align:center;color:#7b8797}
            #ads-analysis-result .cc-detail-head-v326{position:sticky;top:0;z-index:6;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 17px;border-bottom:1px solid var(--cc-border);background:rgba(255,255,255,.96);backdrop-filter:blur(12px)}
            #ads-analysis-result .cc-detail-head-v326 h3{margin:4px 0 0!important;color:#172033!important;font-size:15px!important;line-height:1.35!important}.cc-detail-head-v326 small{color:#758296;font-size:8.5px}
            #ads-analysis-result .cc-detail-actions-v326{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
            #ads-analysis-result .cc-detail-visual-v326{display:grid;grid-template-columns:minmax(195px,30%) minmax(0,70%);min-height:560px;border-bottom:1px solid var(--cc-border);background:#f4f7fb}
            #ads-analysis-result .cc-detail-metrics-v326{min-width:0;padding:15px 13px;background:#fff;border-right:1px solid var(--cc-border);display:flex;flex-direction:column;gap:11px;overflow:auto}
            #ads-analysis-result .cc-detail-metrics-head-v326 span{display:block;color:#2563eb;font-size:7.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.cc-detail-metrics-head-v326 b{display:block;margin-top:5px;color:#172033;font-size:12px;line-height:1.35}.cc-detail-metrics-head-v326 small{display:block;margin-top:4px;color:#8b98a9;font-size:8px}
            #ads-analysis-result .cc-detail-state-v326{display:flex;gap:5px;flex-wrap:wrap}
            #ads-analysis-result .cc-detail-metric-grid-v326{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
            #ads-analysis-result .cc-detail-metric-v326{min-width:0;padding:10px 9px;border:1px solid var(--cc-border);border-radius:12px;background:#fbfcfe}#ads-analysis-result .cc-detail-metric-v326.wide{grid-column:1/-1}#ads-analysis-result .cc-detail-metric-v326.primary{border-color:#bfdbfe;background:linear-gradient(135deg,#eff6ff,#fff)}.cc-detail-metric-v326 span{display:block;color:#8793a3;font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}.cc-detail-metric-v326 b{display:block;margin-top:4px;color:#273548;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-detail-metric-v326.primary b{font-size:14px;color:#1d4ed8}
            #ads-analysis-result .cc-detail-context-v326{display:grid;gap:7px;margin-top:auto}.cc-detail-context-item-v326{padding:9px;border:1px solid var(--cc-border);border-radius:11px;background:#fff}.cc-detail-context-item-v326 span{display:block;color:#94a3b8;font-size:7px;font-weight:800;text-transform:uppercase}.cc-detail-context-item-v326 b{display:block;margin-top:4px;color:#475569;font-size:8.5px;line-height:1.4;word-break:break-word}
            #ads-analysis-result .cc-media-shell-v326{min-width:0;min-height:560px;padding:16px;background:#0b1220;display:grid;place-items:center;overflow:hidden}
            #ads-analysis-result .cc-media-v326{--cc-media-ratio:.8;position:relative;height:clamp(390px,62vh,690px);max-width:100%;aspect-ratio:var(--cc-media-ratio);border-radius:18px;background:#111c2e;display:grid;place-items:center;overflow:hidden;box-shadow:0 18px 44px rgba(0,0,0,.26)}
            #ads-analysis-result .cc-media-v326 img,#ads-analysis-result .cc-media-v326 video{display:block;width:100%;height:100%;object-fit:contain;background:#0b1220}
            #ads-analysis-result .cc-media-empty-v326{padding:50px 24px;color:#cbd5e1;text-align:center;line-height:1.7}
            #ads-analysis-result .cc-media-label-v326{position:absolute;left:10px;bottom:10px;max-width:calc(100% - 20px);padding:7px 9px;border-radius:999px;background:rgba(15,23,42,.82);color:#fff;font-size:7.5px;font-weight:800;backdrop-filter:blur(8px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            #ads-analysis-result .cc-detail-content-v326{padding:16px 18px 22px}
            #ads-analysis-result .cc-copy-v326{padding:14px;border:1px solid var(--cc-border);border-radius:14px;background:#fff;color:#425066;font-size:10.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
            #ads-analysis-result .cc-section-v326{margin-top:14px;padding-top:14px;border-top:1px solid var(--cc-border)}.cc-section-v326 h4{margin:0 0 9px!important;color:#283548!important;font-size:11px!important}
            #ads-analysis-result .cc-issue-v326{display:flex;align-items:flex-start;gap:9px;padding:10px 11px;border-radius:12px;border:1px solid #fed7aa;background:#fff7ed;margin-bottom:7px}.cc-issue-v326.critical,.cc-issue-v326.high{border-color:#fecaca;background:#fff1f2}.cc-issue-v326.low{border-color:#dbeafe;background:#eff6ff}.cc-issue-v326 i{width:8px;height:8px;border-radius:50%;background:#f97316;margin-top:4px;flex:0 0 auto}.cc-issue-v326.critical i,.cc-issue-v326.high i{background:#ef4444}.cc-issue-v326.low i{background:#3b82f6}.cc-issue-v326 b{display:block;font-size:9.5px;color:#334155}.cc-issue-v326 small{display:block;margin-top:3px;color:#64748b;font-size:8.5px;line-height:1.5}
            #ads-analysis-result .cc-diagnostic-v326{padding:12px;border:1px solid #fecaca;border-radius:14px;background:#fff1f2}.cc-diagnostic-v326 b{display:block;color:#b42318;font-size:10px}.cc-diagnostic-v326 p{margin:6px 0 0!important;color:#7f1d1d!important;font-size:9px!important;line-height:1.6!important}.cc-diagnostic-v326 code{display:block;margin-top:8px;padding:8px;border-radius:9px;background:#fff;color:#7f1d1d;font-size:8px;white-space:pre-wrap}
            #ads-analysis-result .cc-workflow-grid-v326{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.cc-workflow-grid-v326 .wide{grid-column:1/-1}.cc-workflow-grid-v326 textarea{min-height:84px;resize:vertical}
            #ads-analysis-result .cc-workflow-actions-v326{display:flex;justify-content:flex-end;gap:7px;margin-top:10px;flex-wrap:wrap}
            #ads-analysis-result .cc-modal-backdrop-v326{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.45);display:grid;place-items:center;padding:20px;backdrop-filter:blur(4px)}
            #ads-analysis-result .cc-modal-v326{width:min(620px,100%);max-height:90vh;overflow:auto;border-radius:18px;background:#fff;box-shadow:0 30px 80px rgba(15,23,42,.28)}.cc-modal-head-v326{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid var(--cc-border)}.cc-modal-head-v326 h3{margin:0!important;font-size:15px!important}.cc-modal-body-v326{padding:17px 18px}.cc-modal-foot-v326{display:flex;justify-content:flex-end;gap:8px;padding:13px 18px;border-top:1px solid var(--cc-border)}
            #ads-analysis-result .cc-legacy-note-v326{padding:11px 15px;background:#fffbeb;border-bottom:1px solid #fde68a;color:#854d0e;font-size:9px}
            #ads-analysis-result .cc-hidden-v326{display:none!important}
            #ads-analysis-result .content-center-enabled-v326 #content-ad-summary-v307,#ads-analysis-result .content-center-enabled-v326>.content-feed-toolbar-v307,#ads-analysis-result .content-center-enabled-v326>#content-ad-feed-v307{display:none!important}
            #ads-analysis-result .content-center-enabled-v326.cc-show-legacy-v326 #content-ad-summary-v307,#ads-analysis-result .content-center-enabled-v326.cc-show-legacy-v326>.content-feed-toolbar-v307,#ads-analysis-result .content-center-enabled-v326.cc-show-legacy-v326>#content-ad-feed-v307{display:grid!important}
            #ads-analysis-result .content-center-enabled-v326.cc-show-legacy-v326>.content-feed-toolbar-v307{display:flex!important}
            @media(max-width:1450px){#ads-analysis-result .cc-summary-v326{grid-template-columns:repeat(3,minmax(0,1fr))}#ads-analysis-result .cc-filter-grid-v326{grid-template-columns:minmax(220px,2fr) repeat(3,minmax(130px,1fr))}#ads-analysis-result .cc-filter-grid-v326 .cc-filter-secondary-v326{display:none}}
            @media(max-width:1180px){#ads-analysis-result .cc-detail-visual-v326{grid-template-columns:minmax(185px,34%) minmax(0,66%)}#ads-analysis-result .cc-detail-metric-grid-v326{grid-template-columns:1fr}#ads-analysis-result .cc-detail-metric-v326.wide{grid-column:auto}}
            @media(max-width:1050px){#ads-analysis-result .cc-body-v326{grid-template-columns:1fr}#ads-analysis-result .cc-library-v326{border-right:0;border-bottom:1px solid var(--cc-border);max-height:620px}#ads-analysis-result .cc-detail-scroll-v326{max-height:none}#ads-analysis-result .cc-filter-grid-v326{grid-template-columns:repeat(2,minmax(0,1fr))}#ads-analysis-result .cc-field-v326:first-child{grid-column:1/-1}#ads-analysis-result .cc-hero-v326{flex-direction:column}#ads-analysis-result .cc-hero-actions-v326{justify-content:flex-start}#ads-analysis-result .cc-detail-visual-v326{grid-template-columns:minmax(210px,28%) minmax(0,72%)}}
            @media(max-width:760px){#ads-analysis-result .cc-detail-visual-v326{grid-template-columns:1fr}#ads-analysis-result .cc-media-shell-v326{order:1;min-height:420px;padding:12px}#ads-analysis-result .cc-detail-metrics-v326{order:2;border-right:0;border-top:1px solid var(--cc-border)}#ads-analysis-result .cc-detail-metric-grid-v326{grid-template-columns:repeat(2,minmax(0,1fr))}#ads-analysis-result .cc-detail-metric-v326.wide{grid-column:1/-1}}
            @media(max-width:680px){#ads-analysis-result .content-center-v326{border-radius:14px}#ads-analysis-result .cc-hero-v326{padding:17px 15px}#ads-analysis-result .cc-hero-v326 h2{font-size:19px!important}#ads-analysis-result .cc-summary-v326{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}#ads-analysis-result .cc-controls-v326{padding:10px}#ads-analysis-result .cc-filter-grid-v326{grid-template-columns:1fr}#ads-analysis-result .cc-field-v326:first-child{grid-column:auto}#ads-analysis-result .cc-tree-group-head-v326{padding-left:14px}#ads-analysis-result .cc-tree-ads-v326{padding-left:14px}#ads-analysis-result .cc-tree-ad-v326{grid-template-columns:20px 40px minmax(0,1fr)}#ads-analysis-result .cc-tree-ad-kpi-v326{display:none}#ads-analysis-result .cc-workflow-grid-v326{grid-template-columns:1fr}#ads-analysis-result .cc-workflow-grid-v326 .wide{grid-column:auto}#ads-analysis-result .cc-media-v326{height:clamp(330px,62vh,560px)}}
        `;
        document.head.appendChild(style);
    }

    function summaryHtml(stats) {
        const rate = stats.total > 0 ? stats.resolved / stats.total * 100 : 0;
        return `
            <div class="cc-stat-v326 blue"><span>Tổng nội dung</span><b>${formatInteger(stats.total)}</b><small>${compactMoney(stats.spend)} chi phí + VAT</small></div>
            <div class="cc-stat-v326 good"><span>Đã lấy bài gốc</span><b>${formatInteger(stats.resolved)}</b><small>${rate.toFixed(1)}% thư viện</small></div>
            <div class="cc-stat-v326 danger"><span>Thiếu nội dung</span><b>${formatInteger(stats.missing)}</b><small>${state.company === 'KF' ? 'Ưu tiên khắc phục KF' : 'Cần kiểm tra Page API'}</small></div>
            <div class="cc-stat-v326 purple"><span>Nội dung thắng</span><b>${formatInteger(stats.winners)}</b><small>${formatInteger(stats.purchases)} lượt mua</small></div>
            <div class="cc-stat-v326 warn"><span>Cảnh báo cần xử lý</span><b>${formatInteger(stats.risks)}</b><small>${formatInteger(stats.overdue)} tác vụ quá hạn</small></div>
            <div class="cc-stat-v326"><span>Tin nhắn</span><b>${formatInteger(stats.messages)}</b><small>Từ nội dung đang theo dõi</small></div>
        `;
    }

    function filterControlsHtml() {
        const ownerOptions = owners().map(owner =>
            `<option value="${escapeHtml(owner)}" ${state.filters.owner === owner ? 'selected' : ''}>${escapeHtml(owner)}</option>`
        ).join('');
        const workflowOptions = WORKFLOW_OPTIONS.map(item =>
            `<option value="${item.value}" ${state.filters.workflow === item.value ? 'selected' : ''}>${escapeHtml(item.label)}</option>`
        ).join('');
        const savedOptions = state.savedViews.map((view, index) =>
            `<option value="${index}">${escapeHtml(view.name || 'Bộ lọc ' + (index + 1))}</option>`
        ).join('');

        return `
            <div class="cc-view-tabs-v326">
                <button class="cc-view-tab-v326 ${state.view === 'library' ? 'active' : ''}" data-cc-view="library">Thư viện nội dung</button>
                <button class="cc-view-tab-v326 ${state.view === 'issues' ? 'active' : ''}" data-cc-view="issues">Cảnh báo tự động</button>
                <button class="cc-view-tab-v326 ${state.view === 'workflow' ? 'active' : ''}" data-cc-view="workflow">Quy trình công việc</button>
            </div>
            <div class="cc-filter-grid-v326">
                <div class="cc-field-v326">
                    <label>Tìm nhanh</label>
                    <input id="cc-query-v326" type="search" value="${escapeHtml(state.filters.query)}" placeholder="Caption, sản phẩm, SKU, nhân viên, Fanpage...">
                </div>
                <div class="cc-field-v326">
                    <label>Loại nội dung</label>
                    <select id="cc-content-filter-v326">
                        <option value="all">Tất cả</option>
                        <option value="resolved" ${state.filters.content === 'resolved' ? 'selected' : ''}>Đã lấy bài gốc</option>
                        <option value="missing" ${state.filters.content === 'missing' ? 'selected' : ''}>Thiếu bài gốc</option>
                        <option value="image" ${state.filters.content === 'image' ? 'selected' : ''}>Hình ảnh</option>
                        <option value="video" ${state.filters.content === 'video' ? 'selected' : ''}>Video</option>
                        <option value="winner" ${state.filters.content === 'winner' ? 'selected' : ''}>Nội dung thắng</option>
                        <option value="risk" ${state.filters.content === 'risk' ? 'selected' : ''}>Có rủi ro</option>
                    </select>
                </div>
                <div class="cc-field-v326">
                    <label>Trạng thái việc</label>
                    <select id="cc-workflow-filter-v326"><option value="all">Tất cả</option>${workflowOptions}</select>
                </div>
                <div class="cc-field-v326 cc-filter-secondary-v326">
                    <label>Người phụ trách</label>
                    <select id="cc-owner-filter-v326"><option value="all">Tất cả</option>${ownerOptions}</select>
                </div>
                <div class="cc-field-v326 cc-filter-secondary-v326">
                    <label>Cảnh báo</label>
                    <select id="cc-issue-filter-v326">
                        <option value="all">Tất cả</option>
                        <option value="missing_content" ${state.filters.issue === 'missing_content' ? 'selected' : ''}>Thiếu bài gốc</option>
                        <option value="spend_no_purchase" ${state.filters.issue === 'spend_no_purchase' ? 'selected' : ''}>Chi cao chưa có đơn</option>
                        <option value="spend_no_message" ${state.filters.issue === 'spend_no_message' ? 'selected' : ''}>Chi cao chưa có tin</option>
                        <option value="low_ctr" ${state.filters.issue === 'low_ctr' ? 'selected' : ''}>CTR thấp</option>
                        <option value="high_frequency" ${state.filters.issue === 'high_frequency' ? 'selected' : ''}>Tần suất cao</option>
                        <option value="overdue" ${state.filters.issue === 'overdue' ? 'selected' : ''}>Quá hạn</option>
                    </select>
                </div>
                <div class="cc-field-v326">
                    <label>Sắp xếp</label>
                    <select id="cc-sort-v326">
                        <option value="spend_desc" ${state.filters.sort === 'spend_desc' ? 'selected' : ''}>Chi phí cao trước</option>
                        <option value="purchase_desc" ${state.filters.sort === 'purchase_desc' ? 'selected' : ''}>Nhiều đơn trước</option>
                        <option value="message_desc" ${state.filters.sort === 'message_desc' ? 'selected' : ''}>Nhiều tin trước</option>
                        <option value="ctr_desc" ${state.filters.sort === 'ctr_desc' ? 'selected' : ''}>CTR cao trước</option>
                        <option value="risk_first" ${state.filters.sort === 'risk_first' ? 'selected' : ''}>Rủi ro trước</option>
                        <option value="newest" ${state.filters.sort === 'newest' ? 'selected' : ''}>Mới nhất</option>
                        <option value="due_asc" ${state.filters.sort === 'due_asc' ? 'selected' : ''}>Gần hạn trước</option>
                    </select>
                </div>
                <div class="cc-field-v326">
                    <label>Bộ lọc đã lưu</label>
                    <div style="display:flex;gap:5px"><select id="cc-saved-view-v326" style="min-width:90px"><option value="">Chọn...</option>${savedOptions}</select><button class="cc-btn-v326" id="cc-save-view-v326" type="button" title="Lưu bộ lọc hiện tại">＋</button></div>
                </div>
            </div>
        `;
    }

    function cardHtml(ad, index) {
        const id = adId(ad, index);
        const evaluation = evaluateAd(ad);
        const workflow = getWorkflow(ad);
        const media = evaluation.media;
        const caption = captionOf(ad);
        const selected = id === state.selectedAdId;
        const checked = state.selectedIds.has(id);
        const topIssue = evaluation.issues[0];
        const workflowStatus = String(workflow.status || '');
        const pageName = String(ad.fanpage_page_name || '').trim();

        const mediaHtml = media.image
            ? `<img src="${escapeHtml(media.image)}" alt="${escapeHtml(titleOf(ad))}" loading="lazy">`
            : `<span>${media.kind === 'video' ? 'VIDEO' : 'AD'}</span>`;

        return `
            <article class="cc-card-v326 ${selected ? 'selected' : ''}" data-cc-ad-id="${escapeHtml(id)}">
                <div class="cc-card-check-v326"><input type="checkbox" data-cc-select="${escapeHtml(id)}" ${checked ? 'checked' : ''} aria-label="Chọn bài"></div>
                <div class="cc-thumb-v326">${mediaHtml}<span class="cc-thumb-badge-v326">${escapeHtml(media.kind.toUpperCase())}</span></div>
                <div class="cc-card-main-v326">
                    <div class="cc-card-top-v326">
                        <div class="cc-card-title-v326">${escapeHtml(titleOf(ad))}</div>
                        <span class="cc-badge-v326 ${evaluation.found ? 'good' : 'danger'}">${evaluation.found ? 'PAGE API' : 'THIẾU BÀI'}</span>
                    </div>
                    <div class="cc-card-copy-v326">${escapeHtml(caption || 'Chưa có caption bài gốc Fanpage.')}</div>
                    <div class="cc-badges-v326">
                        <span class="cc-badge-v326 blue">${escapeHtml(employeeOf(ad))}</span>
                        ${ad.sku ? `<span class="cc-badge-v326">SKU ${escapeHtml(ad.sku)}</span>` : ''}
                        ${pageName ? `<span class="cc-badge-v326">${escapeHtml(pageName)}</span>` : ''}
                        ${workflowStatus ? `<span class="cc-badge-v326 purple ${workflowClass(workflowStatus)}">${escapeHtml(workflowLabel(workflowStatus))}</span>` : ''}
                        ${evaluation.winner ? '<span class="cc-badge-v326 good">NỘI DUNG THẮNG</span>' : ''}
                        ${topIssue ? `<span class="cc-badge-v326 ${topIssue.severity === 'critical' || topIssue.severity === 'high' ? 'danger' : 'warn'}">${escapeHtml(topIssue.label)}</span>` : ''}
                    </div>
                    <div class="cc-mini-metrics-v326">
                        <span>Chi + VAT<b>${compactMoney(evaluation.metrics.spend)}</b></span>
                        <span>Tin<b>${formatInteger(evaluation.metrics.messages)}</b></span>
                        <span>Mua<b>${formatInteger(evaluation.metrics.purchases)}</b></span>
                        <span>CTR<b>${evaluation.metrics.ctr.toFixed(2)}%</b></span>
                    </div>
                </div>
            </article>
        `;
    }

    function adsTreeTitleR6(ad) {
        return String(ad && (ad.name || ad.adName || ad.preview_title) || 'Bài quảng cáo')
            .replace(/\s+/g, ' ').trim();
    }

    function adsTreeCaptionR6(ad) {
        return String(ad && (ad.preview_body || ad.preview_description || ad.creative_body) || '').trim();
    }

    function adsTreeMediaR6(ad) {
        ad = ad || {};
        return String(
            ad.primary_media_url ||
            ad.highres_image_url ||
            ad.image_url ||
            ad.thumbnail_url ||
            ad.rendered_thumbnail_url ||
            ''
        ).trim();
    }

    function adsTreeGroupKeyR6(item, index) {
        const company = String(item && item.company || state.company || getCurrentCompany() || '').toUpperCase();
        const employee = String(item && item.employee || '').trim();
        const sku = String(item && (item.sku || item.duplicate_sku) || '').trim().toUpperCase();
        const product = String(item && (item.productName || item.cleanAdName || item.adName || item.fullName || item.adsetName) || '').trim();
        return String(item && item.meta_live_row_key || '') || [
            company,
            normalizeText(employee),
            normalizeText(sku || product),
            index
        ].join('||');
    }

    function folderKey(prefix) {
        const parts = Array.prototype.slice.call(arguments, 1).map(value =>
            encodeURIComponent(normalizeText(value) || 'khong-xac-dinh')
        );
        return [prefix].concat(parts).join('::');
    }

    function treeInitials(value) {
        const words = String(value || '').trim().split(/\s+/).filter(Boolean);
        return (words.slice(-2).map(word => word.charAt(0)).join('') || 'NV').toUpperCase();
    }

    function treeMetric(ads) {
        return (Array.isArray(ads) ? ads : []).reduce((total, ad) => {
            const metric = metricsOf(ad);
            total.spend += metric.spend;
            total.messages += metric.messages;
            total.purchases += metric.purchases;
            return total;
        }, { spend: 0, messages: 0, purchases: 0 });
    }

    function buildFolderTree(rows) {
        const ads = Array.isArray(rows) ? rows.filter(Boolean) : [];
        const groupedRows = Array.isArray(state.sourceRows) ? state.sourceRows : [];
        const groupByAdset = new Map();
        const groupsByKey = new Map();

        // Bám đúng mô hình V325: groupedRows là nguồn cây Ads đã gom,
        // còn từng bài được gắn vào nhóm bằng Adset ID thật của Meta.
        groupedRows.forEach((item, index) => {
            if (!item) return;
            const employee = String(item.employee || 'Chưa xác định nhân viên').replace(/\s+/g, ' ').trim();
            const key = adsTreeGroupKeyR6(item, index);
            const sku = String(item.sku || item.duplicate_sku || '').trim().toUpperCase();
            const product = String(
                item.productName ||
                item.cleanAdName ||
                item.adName ||
                item.fullName ||
                item.adsetName ||
                'Nhóm quảng cáo'
            ).replace(/\s+/g, ' ').trim();
            const node = { key, employee, sku, product, item, adsetIds: new Set(), ads: [] };

            if (item.adsetId) node.adsetIds.add(String(item.adsetId));
            (Array.isArray(item.original_adset_rows) ? item.original_adset_rows : []).forEach(row => {
                if (row && row.adsetId) node.adsetIds.add(String(row.adsetId));
            });
            node.adsetIds.forEach(id => groupByAdset.set(id, node));
            groupsByKey.set(key, node);
        });

        ads.forEach(ad => {
            const adset = ad && ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
            const adsetId = String(ad && (ad.adsetId || ad.adset_id) || adset.id || '').trim();
            let group = groupByAdset.get(adsetId);

            if (!group) {
                const employee = String(ad && ad.employee || 'Chưa xác định nhân viên').replace(/\s+/g, ' ').trim();
                const sku = String(ad && (ad.sku || ad.duplicate_sku) || '').trim().toUpperCase();
                const product = String(
                    ad && (ad.productName || ad.cleanAdName) ||
                    adset.name ||
                    'Nhóm quảng cáo'
                ).replace(/\s+/g, ' ').trim();
                const key = ['fallback', normalizeText(employee), normalizeText(sku || product)].join('||');
                group = groupsByKey.get(key);
                if (!group) {
                    group = { key, employee, sku, product, item: null, adsetIds: new Set(), ads: [] };
                    groupsByKey.set(key, group);
                }
            }
            group.ads.push(ad);
        });

        const employees = new Map();
        Array.from(groupsByKey.values()).forEach(group => {
            if (!group.ads.length) return;
            group.ads.sort((a, b) => {
                if (typeof SORT_MODE !== 'undefined' && SORT_MODE === 'purchases') {
                    return safeNumber(b.result) - safeNumber(a.result) || safeNumber(b.spend) - safeNumber(a.spend);
                }
                if (typeof SORT_MODE !== 'undefined' && SORT_MODE === 'messages') {
                    return safeNumber(b.messages) - safeNumber(a.messages) || safeNumber(b.spend) - safeNumber(a.spend);
                }
                return safeNumber(b.spend) - safeNumber(a.spend) || safeNumber(b.result) - safeNumber(a.result);
            });
            group.metric = treeMetric(group.ads);
            const employeeKey = folderKey('emp', group.employee);
            if (!employees.has(employeeKey)) {
                employees.set(employeeKey, { key: employeeKey, name: group.employee, groups: [], ads: [] });
            }
            const employeeNode = employees.get(employeeKey);
            employeeNode.groups.push(group);
            employeeNode.ads.push(...group.ads);
        });

        const output = Array.from(employees.values()).map(employee => {
            employee.groups.sort((a, b) => b.metric.spend - a.metric.spend || a.product.localeCompare(b.product, 'vi'));
            employee.metric = treeMetric(employee.ads);
            return employee;
        }).sort((a, b) => b.metric.spend - a.metric.spend || a.name.localeCompare(b.name, 'vi'));

        return { employees: output, ads };
    }

    function ensureFolderTreeState(tree) {
        const context = [state.company, state.view].join('|');

        // R11: mặc định ĐÓNG toàn bộ cây. Chỉ click vào Nhân viên/Nhóm mới bung ra.
        // Không tự mở tất cả nhân viên, không tự mở nhóm chứa bài đang chọn.
        if (state.treeContext !== context) {
            state.treeContext = context;
            state.treeOpen = new Set();
            state.treeCollapseAll = false;
        }

        // Khi khoảng ngày / scope làm cây thay đổi, chỉ giữ trạng thái mở của node còn tồn tại.
        const validKeys = new Set();
        (tree.employees || []).forEach(employee => {
            validKeys.add(employee.key);
            (employee.groups || []).forEach(group => validKeys.add(group.key));
        });
        state.treeOpen = new Set(
            Array.from(state.treeOpen || []).filter(key => validKeys.has(key))
        );
    }

    function folderAdHtml(ad, index) {
        const id = adId(ad, index);
        const evaluation = evaluateAd(ad);
        const selected = id === state.selectedAdId;
        const checked = state.selectedIds.has(id);
        const title = adsTreeTitleR6(ad);
        const caption = adsTreeCaptionR6(ad);
        const media = adsTreeMediaR6(ad);
        const workflow = getWorkflow(ad);
        const workflowStatus = String(workflow.status || '');
        const mediaKind = String(ad && (ad.preview_type || ad.primary_media_kind) || '').toLowerCase();
        const mediaHtml = media
            ? `<img src="${escapeHtml(media)}" alt="${escapeHtml(title)}" loading="lazy">`
            : 'AD';
        return `
            <div class="cc-tree-ad-v326 ${selected ? 'selected' : ''}" data-cc-ad-id="${escapeHtml(id)}">
                <label class="cc-tree-check-v326"><input type="checkbox" data-cc-select="${escapeHtml(id)}" ${checked ? 'checked' : ''} aria-label="Chọn bài"></label>
                <div class="cc-tree-thumb-v326">${mediaHtml}<span>${escapeHtml(mediaKind === 'video' ? 'VIDEO' : 'ADS')}</span></div>
                <div class="cc-tree-ad-main-v326">
                    <b>${escapeHtml(title)}</b>
                    <p>${escapeHtml(caption || 'Bài quảng cáo chưa có nội dung creative trong dữ liệu Ads.')}</p>
                    <small>${escapeHtml([
                        'ADS',
                        workflowStatus ? workflowLabel(workflowStatus) : '',
                        ad.sku ? 'SKU ' + ad.sku : ''
                    ].filter(Boolean).join(' · '))}</small>
                </div>
                <div class="cc-tree-ad-kpi-v326">
                    <b>${formatInteger(evaluation.metrics.messages)} tin · ${formatInteger(evaluation.metrics.purchases)} mua</b>
                    <small>${compactMoney(evaluation.metrics.spend)}</small>
                </div>
            </div>
        `;
    }

    function folderGroupHtml(employee, group) {
        const open = state.treeOpen.has(group.key);
        return `
            <div class="cc-tree-group-v326 ${open ? 'open' : ''}" data-cc-tree-node="${escapeHtml(group.key)}">
                <button class="cc-tree-node-button-v326" type="button" data-cc-tree-toggle="${escapeHtml(group.key)}" aria-expanded="${open ? 'true' : 'false'}">
                    <div class="cc-tree-group-head-v326">
                        <span class="cc-tree-caret-v326">›</span>
                        <span class="cc-tree-folder-v326">▰</span>
                        <span class="cc-tree-copy-v326"><b>${escapeHtml(group.product)}</b><small>${escapeHtml([group.sku ? 'SKU ' + group.sku : '', group.ads.length + ' bài'].filter(Boolean).join(' · '))}</small></span>
                        <span class="cc-tree-total-v326"><b>${compactMoney(group.metric.spend)}</b><small>${formatInteger(group.metric.messages)} tin · ${formatInteger(group.metric.purchases)} mua</small></span>
                    </div>
                </button>
                <div class="cc-tree-children-v326"><div class="cc-tree-ads-v326">${group.ads.map(folderAdHtml).join('')}</div></div>
            </div>
        `;
    }

    function folderEmployeeHtml(employee) {
        const open = state.treeOpen.has(employee.key);
        return `
            <section class="cc-tree-employee-v326 ${open ? 'open' : ''}" data-cc-tree-node="${escapeHtml(employee.key)}">
                <button class="cc-tree-node-button-v326" type="button" data-cc-tree-toggle="${escapeHtml(employee.key)}" aria-expanded="${open ? 'true' : 'false'}">
                    <div class="cc-tree-employee-head-v326">
                        <span class="cc-tree-caret-v326">›</span>
                        <span class="cc-tree-avatar-v326">${escapeHtml(treeInitials(employee.name))}</span>
                        <span class="cc-tree-copy-v326"><b>${escapeHtml(employee.name)}</b><small>${employee.groups.length} nhóm · ${employee.ads.length} bài quảng cáo</small></span>
                        <span class="cc-tree-total-v326"><b>${compactMoney(employee.metric.spend)}</b><small>${formatInteger(employee.metric.messages)} tin · ${formatInteger(employee.metric.purchases)} mua</small></span>
                    </div>
                </button>
                <div class="cc-tree-children-v326">${employee.groups.map(group => folderGroupHtml(employee, group)).join('')}</div>
            </section>
        `;
    }

    function expandFolderTree(expand) {
        const tree = buildFolderTree(state.filteredAds);
        if (expand) {
            state.treeCollapseAll = false;
            (tree.employees || []).forEach(employee => {
                state.treeOpen.add(employee.key);
                (employee.groups || []).forEach(group => state.treeOpen.add(group.key));
            });
        } else {
            state.treeCollapseAll = true;
            state.treeOpen.clear();
        }
        renderListAndDetail();
    }

    function workflowOptionsHtml(selected) {
        return `<option value="">Chưa phân loại</option>` + WORKFLOW_OPTIONS.map(item =>
            `<option value="${item.value}" ${selected === item.value ? 'selected' : ''}>${escapeHtml(item.label)}</option>`
        ).join('');
    }

    function detailHtml(ad) {
        if (!ad) {
            return `<div class="cc-detail-placeholder-v326"><div><b>Chọn một nội dung để quản lý</b><p>Xem bài gốc Fanpage, hiệu quả, cảnh báo và giao việc trong cùng một màn hình.</p></div></div>`;
        }

        const id = adId(ad);
        const evaluation = evaluateAd(ad);
        const media = evaluation.media;
        const workflow = getWorkflow(ad);
        const caption = captionOf(ad);
        const campaign = ad.campaign && typeof ad.campaign === 'object' ? ad.campaign : {};
        const adset = ad.adset && typeof ad.adset === 'object' ? ad.adset : {};
        const errorCode = String(ad.fanpage_error_code || '').trim();
        const errorMessage = String(ad.fanpage_error_message || '').trim();
        const attempts = safeNumber(ad.fanpage_attempts);
        const resolutionPath = String(ad.fanpage_resolution_path || '').trim();

        let mediaBlock = `<div class="cc-media-empty-v326">Page API chưa trả media gốc cho nội dung này.</div>`;
        if (media.kind === 'video' && media.video) {
            mediaBlock = `<video controls playsinline preload="metadata" src="${escapeHtml(media.video)}"></video>`;
        } else if (media.image) {
            mediaBlock = `<img src="${escapeHtml(media.image)}" alt="${escapeHtml(titleOf(ad))}">`;
        }

        const issueHtml = evaluation.issues.length
            ? evaluation.issues.map(issue => `
                <div class="cc-issue-v326 ${escapeHtml(issue.severity)}"><i></i><div><b>${escapeHtml(issue.label)}</b><small>${escapeHtml(issue.detail)}</small></div></div>
            `).join('')
            : `<div class="cc-issue-v326 low"><i></i><div><b>Chưa phát hiện rủi ro lớn</b><small>Hệ thống vẫn tiếp tục theo dõi khi dữ liệu Meta được cập nhật.</small></div></div>`;

        const diagnosticHtml = !evaluation.found
            ? `<div class="cc-diagnostic-v326"><b>Không lấy được bài gốc · ${escapeHtml(errorCode || 'CHƯA XÁC ĐỊNH')}</b><p>${escapeHtml(errorMessage || 'Backend chưa trả mã lỗi cho bài này. Hãy triển khai CODE.GS V328 R1 trên các Public Bridge rồi bấm Cập nhật Meta.')}</p><code>Công ty: ${escapeHtml(state.company)}\nAd ID: ${escapeHtml(id)}\nPage ID: ${escapeHtml(ad.fanpage_page_id || 'chưa xác định')}\nSố lần thử: ${formatInteger(attempts)}\nĐường xử lý: ${escapeHtml(resolutionPath || 'chưa có')}</code></div>`
            : '';

        return `
            <div class="cc-detail-scroll-v326" data-cc-detail-id="${escapeHtml(id)}">
                <div class="cc-detail-head-v326">
                    <div><small>${escapeHtml([state.company, ad.sku ? 'SKU ' + ad.sku : '', employeeOf(ad)].filter(Boolean).join(' · '))}</small><h3>${escapeHtml(titleOf(ad))}</h3></div>
                    <div class="cc-detail-actions-v326">
                        <button class="cc-btn-v326" type="button" data-cc-action="copy-caption" data-ad-id="${escapeHtml(id)}">Sao chép caption</button>
                        ${media.permalink ? `<a class="cc-btn-v326 primary" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener">Mở bài gốc</a>` : ''}
                        <button class="cc-btn-v326" type="button" data-cc-action="open-ad" data-ad-id="${escapeHtml(id)}">Dữ liệu Ads</button>
                    </div>
                </div>
                <div class="cc-detail-visual-v326">
                    <aside class="cc-detail-metrics-v326">
                        <div class="cc-detail-metrics-head-v326">
                            <span>Hiệu quả nội dung</span>
                            <b>${evaluation.found ? 'Bài gốc Fanpage đã sẵn sàng' : 'Chưa lấy được bài gốc Fanpage'}</b>
                            <small>${escapeHtml(media.ratioLabel)} · ${escapeHtml(media.dimension)}</small>
                        </div>
                        <div class="cc-detail-state-v326">
                            <span class="cc-badge-v326 ${evaluation.found ? 'good' : 'danger'}">${evaluation.found ? 'PAGE API' : 'THIẾU BÀI'}</span>
                            ${evaluation.winner ? '<span class="cc-badge-v326 good">NỘI DUNG THẮNG</span>' : ''}
                            ${evaluation.issues[0] ? `<span class="cc-badge-v326 ${evaluation.issues[0].severity === 'critical' || evaluation.issues[0].severity === 'high' ? 'danger' : 'warn'}">${escapeHtml(evaluation.issues[0].label)}</span>` : ''}
                        </div>
                        <div class="cc-detail-metric-grid-v326">
                            <div class="cc-detail-metric-v326 primary wide"><span>Chi phí + VAT</span><b>${formatMoney(evaluation.metrics.spend)}</b></div>
                            <div class="cc-detail-metric-v326"><span>Tin nhắn</span><b>${formatInteger(evaluation.metrics.messages)}</b></div>
                            <div class="cc-detail-metric-v326"><span>Lượt mua</span><b>${formatInteger(evaluation.metrics.purchases)}</b></div>
                            <div class="cc-detail-metric-v326"><span>CPA + VAT</span><b>${evaluation.metrics.purchases > 0 ? formatMoney(evaluation.metrics.cpa) : '—'}</b></div>
                            <div class="cc-detail-metric-v326"><span>CTR liên kết</span><b>${evaluation.metrics.ctr.toFixed(2)}%</b></div>
                            <div class="cc-detail-metric-v326"><span>Mua / Tin</span><b>${evaluation.metrics.conversionRate.toFixed(2)}%</b></div>
                            <div class="cc-detail-metric-v326"><span>Tần suất</span><b>${evaluation.metrics.frequency.toFixed(2)}</b></div>
                        </div>
                        <div class="cc-detail-context-v326">
                            <div class="cc-detail-context-item-v326"><span>Fanpage</span><b>${escapeHtml(ad.fanpage_page_name || ad.fanpage_page_id || '—')}</b></div>
                            <div class="cc-detail-context-item-v326"><span>Ngày đăng</span><b>${formatDate(ad.fanpage_post_created_time || ad.created_time)}</b></div>
                        </div>
                    </aside>
                    <div class="cc-media-shell-v326">
                        <div class="cc-media-v326" style="--cc-media-ratio:${Math.max(0.25, Math.min(2.5, media.ratio || 0.8)).toFixed(5)}">${mediaBlock}<span class="cc-media-label-v326">${evaluation.found ? 'FANPAGE · PAGE API · V326 · ' + media.ratioLabel : 'CHƯA CÓ BÀI GỐC'}</span></div>
                    </div>
                </div>
                <div class="cc-detail-content-v326">
                    ${diagnosticHtml}
                    <div class="cc-section-v326"><h4>Nội dung bài gốc</h4><div class="cc-copy-v326">${escapeHtml(caption || 'Bài Fanpage chưa có caption.').replace(/\n/g, '<br>')}</div></div>
                    <div class="cc-section-v326"><h4>Cảnh báo và đề xuất tự động</h4>${issueHtml}</div>
                    <div class="cc-section-v326">
                        <h4>Quản lý quy trình</h4>
                        <div class="cc-workflow-grid-v326">
                            <div class="cc-field-v326"><label>Trạng thái</label><select id="cc-detail-status-v326">${workflowOptionsHtml(String(workflow.status || ''))}</select></div>
                            <div class="cc-field-v326"><label>Người phụ trách</label><input id="cc-detail-owner-v326" value="${escapeHtml(workflow.owner || employeeOf(ad))}" placeholder="Tên nhân viên"></div>
                            <div class="cc-field-v326"><label>Deadline</label><input id="cc-detail-due-v326" type="date" value="${escapeHtml(dateInputValue(workflow.dueDate))}"></div>
                            <div class="cc-field-v326"><label>Thẻ</label><input id="cc-detail-tags-v326" value="${escapeHtml(Array.isArray(workflow.tags) ? workflow.tags.join(', ') : workflow.tags || '')}" placeholder="mít, video, remarketing..."></div>
                            <div class="cc-field-v326 wide"><label>Ghi chú xử lý</label><textarea id="cc-detail-note-v326" placeholder="Rõ việc, rõ người chịu trách nhiệm, rõ hướng xử lý...">${escapeHtml(workflow.note || '')}</textarea></div>
                        </div>
                        <div class="cc-workflow-actions-v326">
                            <button class="cc-btn-v326" type="button" data-cc-action="create-task" data-ad-id="${escapeHtml(id)}">Tạo tác vụ tối ưu</button>
                            <button class="cc-btn-v326 primary" type="button" data-cc-action="save-workflow" data-ad-id="${escapeHtml(id)}" ${canWrite() ? '' : 'disabled'}>Lưu quy trình</button>
                        </div>
                    </div>
                    <div class="cc-section-v326"><h4>Đối chiếu kỹ thuật</h4><div class="cc-copy-v326">Chiến dịch: ${escapeHtml(campaign.name || ad.campaignName || '—')}<br>Nhóm quảng cáo: ${escapeHtml(adset.name || ad.adsetName || '—')}<br>Ad ID: ${escapeHtml(id)}<br>Post ID: ${escapeHtml(ad.fanpage_post_id || '—')}<br>Page ID: ${escapeHtml(ad.fanpage_page_id || '—')}<br>Nguồn token: ${escapeHtml(ad.fanpage_token_source || '—')}<br>Đường xử lý: ${escapeHtml(resolutionPath || 'v325_exact_page_api')}</div></div>
                </div>
            </div>
        `;
    }

    function listHtml() {
        const rows = filterAds();
        if (!rows.length) {
            const active = [
                state.filters.query ? 'Tìm: ' + state.filters.query : '',
                state.filters.content !== 'all' ? 'Loại: ' + state.filters.content : '',
                state.filters.workflow !== 'all' ? 'Việc: ' + state.filters.workflow : '',
                state.filters.owner !== 'all' ? 'Người: ' + state.filters.owner : '',
                state.filters.issue !== 'all' ? 'Cảnh báo: ' + state.filters.issue : '',
                state.view !== 'library' ? 'Chế độ: ' + state.view : ''
            ].filter(Boolean).join(' · ');
            return `<div class="cc-empty-v326"><b>Không có nội dung phù hợp bộ lọc</b><br>${active ? escapeHtml(active) : 'Dữ liệu Ads chưa sẵn sàng cho cây nội dung.'}<div style="margin-top:10px"><button class="cc-btn-v326 primary" id="cc-reset-filters-r8" type="button">Đặt lại bộ lọc</button></div></div>`;
        }
        const tree = buildFolderTree(rows);
        ensureFolderTreeState(tree);
        return `<div class="cc-tree-v326">${tree.employees.map(folderEmployeeHtml).join('')}</div>`;
    }

    function heroHtml(stats) {
        const autoText = state.settings.autoRefreshMinutes > 0
            ? `Tự cập nhật ${state.settings.autoRefreshMinutes} phút`
            : 'Tự cập nhật đang tắt';
        return `
            <div>
                <div class="cc-kicker-v326">CONTENT MANAGEMENT CENTER · V326 R11 · ${escapeHtml(LAYOUT_BUILD)}</div>
                <h2>Trung tâm quản lý nội dung ${escapeHtml(state.company)}</h2>
                <p>Cây thư mục bên trái lấy từ Meta Ads; khung quản lý bên phải lấy nội dung gốc từ Fanpage/Page API, kèm hiệu quả, quy trình và cảnh báo.</p>
            </div>
            <div class="cc-hero-actions-v326">
                <span class="cc-chip-v326"><i></i>R9 · GIAO DIỆN MỚI + CÂY ADS</span>
                <span class="cc-chip-v326"><i></i>${escapeHtml(autoText)}</span>
                ${state.company === 'KF' && stats.missing > 0 ? '<button class="cc-btn-v326 dark" type="button" id="cc-repair-kf-v326">Khắc phục KF ngay</button>' : ''}
                <button class="cc-btn-v326 dark" type="button" id="cc-export-v326">Xuất CSV</button>
                <button class="cc-btn-v326 dark" type="button" id="cc-settings-v326">Tự động hóa</button>
            </div>
        `;
    }

    function shellHtml() {
        const stats = summaryStats();
        const selected = state.filteredAds.find(ad => adId(ad) === state.selectedAdId) || state.filteredAds[0] || state.ads[0] || null;
        if (selected) state.selectedAdId = adId(selected);
        return `
            <div class="cc-hero-v326">${heroHtml(stats)}</div>
            <div class="cc-summary-v326">${summaryHtml(stats)}</div>
            <div class="cc-controls-v326">${filterControlsHtml()}</div>
            <div class="cc-body-v326">
                <section class="cc-library-v326">
                    <div class="cc-list-head-v326">
                        <div><b id="cc-result-count-v326">${formatInteger(state.filteredAds.length)} nội dung</b><small>${escapeHtml(state.view === 'issues' ? 'Cây Ads: Nhân viên → Nhóm/Sản phẩm → Bài' : state.view === 'workflow' ? 'Cây Ads: Nhân viên → Nhóm/Sản phẩm → Bài' : 'Cây Ads: Nhân viên → Nhóm/Sản phẩm → Bài')}</small></div>
                        <div class="cc-bulk-v326">
                            <button class="cc-btn-v326" type="button" id="cc-tree-expand-v326">Mở tất cả</button>
                            <button class="cc-btn-v326" type="button" id="cc-tree-collapse-v326">Thu gọn</button>
                            <button class="cc-btn-v326" type="button" id="cc-select-all-v326">Chọn tất cả</button>
                            <select id="cc-bulk-status-v326"><option value="">Đổi trạng thái...</option>${WORKFLOW_OPTIONS.map(item => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join('')}</select>
                            <button class="cc-btn-v326 primary" type="button" id="cc-apply-bulk-v326" ${canWrite() ? '' : 'disabled'}>Áp dụng</button>
                        </div>
                    </div>
                    <div class="cc-list-v326" id="cc-list-v326">${listHtml()}</div>
                </section>
                <section class="cc-detail-v326" id="cc-detail-v326">${detailHtml(selected)}</section>
            </div>
        `;
    }

    function findHost() {
        const summary = document.getElementById('content-ad-summary-v307');
        if (summary && summary.parentElement) return summary.parentElement;
        return document.querySelector('#tab-performance .content-performance-shell-v306') ||
            document.querySelector('#tab-performance .content-feed-shell-v307');
    }

    function renderAll(options) {
        if (state.rendering) return;
        state.rendering = true;
        try {
            state.company = getCurrentCompany();
            const host = findHost();
            if (!host) return;
            injectStyles();
            host.classList.add('content-center-enabled-v326');
            // R9: khóa giao diện mới; cây Ads được render bên trong Content Center, không bật lại giao diện V325 bên dưới.
            state.settings.legacyVisible = false;
            host.classList.remove('cc-show-legacy-v326');

            let root = rootElement();
            if (!root) {
                root = document.createElement('div');
                root.id = 'content-center-v326';
                root.className = 'content-center-v326';
                const summary = document.getElementById('content-ad-summary-v307');
                if (summary) host.insertBefore(root, summary);
                else host.appendChild(root);
            }

            filterAds();
            if (!state.selectedAdId || !state.ads.some(ad => adId(ad) === state.selectedAdId)) {
                state.selectedAdId = state.filteredAds[0] ? adId(state.filteredAds[0]) : (state.ads[0] ? adId(state.ads[0]) : '');
            }
            root.innerHTML = shellHtml();
            bindEvents();
            state.mounted = true;
            state.lastRenderAt = Date.now();
            scheduleHealthAutomation();
        } finally {
            state.rendering = false;
        }
    }

    function renderListAndDetail() {
        const root = rootElement();
        if (!root) return renderAll();
        filterAds();
        const list = document.getElementById('cc-list-v326');
        const detail = document.getElementById('cc-detail-v326');
        const count = document.getElementById('cc-result-count-v326');
        if (list) list.innerHTML = listHtml();
        if (count) count.textContent = formatInteger(state.filteredAds.length) + ' nội dung';
        let selected = state.filteredAds.find(ad => adId(ad) === state.selectedAdId) || state.filteredAds[0] || null;
        if (selected) state.selectedAdId = adId(selected);
        else state.selectedAdId = '';
        if (detail) detail.innerHTML = detailHtml(selected);
        bindDynamicEvents();
    }

    function refreshSourceRows(rows) {
        state.sourceRows = Array.isArray(rows) ? rows : [];
        state.company = getCurrentCompany();
        state.ads = flattenAds(state.sourceRows);
        recoverFiltersAfterSourceLoadR8();
        const signature = state.company + '|' + state.ads.length + '|' + state.ads.map(ad => adId(ad)).slice(0, 10).join(',');
        state.lastDataSignature = signature;
        if (!state.selectedAdId && state.ads[0]) state.selectedAdId = adId(state.ads[0]);
        loadWorkflow(state.company);
        window.requestAnimationFrame(() => renderAll());
    }

    function bindFilter(id, key, eventName) {
        const element = document.getElementById(id);
        if (!element) return;
        element.addEventListener(eventName || 'change', () => {
            state.filters[key] = element.value;
            saveLocalState();
            renderListAndDetail();
        });
    }

    function bindEvents() {
        bindFilter('cc-content-filter-v326', 'content');
        bindFilter('cc-workflow-filter-v326', 'workflow');
        bindFilter('cc-owner-filter-v326', 'owner');
        bindFilter('cc-issue-filter-v326', 'issue');
        bindFilter('cc-sort-v326', 'sort');

        const query = document.getElementById('cc-query-v326');
        if (query) {
            let timer = null;
            query.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    state.filters.query = query.value;
                    saveLocalState();
                    renderListAndDetail();
                }, 180);
            });
        }

        document.querySelectorAll('#content-center-v326 [data-cc-view]').forEach(button => {
            button.addEventListener('click', () => {
                state.view = button.getAttribute('data-cc-view') || 'library';
                saveLocalState();
                renderAll();
            });
        });

        const saveView = document.getElementById('cc-save-view-v326');
        if (saveView) saveView.addEventListener('click', openSaveViewModal);

        const savedView = document.getElementById('cc-saved-view-v326');
        if (savedView) savedView.addEventListener('change', () => {
            const index = Number(savedView.value);
            if (!Number.isInteger(index) || !state.savedViews[index]) return;
            state.filters = Object.assign({}, state.filters, state.savedViews[index].filters || {});
            state.view = state.savedViews[index].view || state.view;
            saveLocalState();
            renderAll();
        });

        const resetFiltersButtonR8 = document.getElementById('cc-reset-filters-r8');
        if (resetFiltersButtonR8) resetFiltersButtonR8.addEventListener('click', () => {
            resetFiltersR8(true);
            renderAll();
        });

        const exportButton = document.getElementById('cc-export-v326');
        if (exportButton) exportButton.addEventListener('click', exportCsv);

        const settingsButton = document.getElementById('cc-settings-v326');
        if (settingsButton) settingsButton.addEventListener('click', openSettingsModal);

        const repairKf = document.getElementById('cc-repair-kf-v326');
        if (repairKf) repairKf.addEventListener('click', () => {
            notify('Đang yêu cầu Meta cập nhật lại Page Token và nội dung KF...', 'success');
            try {
                if (typeof window.refreshMetaAdsLive === 'function') {
                    window.refreshMetaAdsLive(false);
                }
            } catch (error) {
                notify('Không gọi được cập nhật Meta: ' + error.message, 'error');
            }
        });

        const expandTree = document.getElementById('cc-tree-expand-v326');
        if (expandTree) expandTree.addEventListener('click', () => expandFolderTree(true));

        const collapseTree = document.getElementById('cc-tree-collapse-v326');
        if (collapseTree) collapseTree.addEventListener('click', () => expandFolderTree(false));

        const selectAll = document.getElementById('cc-select-all-v326');
        if (selectAll) selectAll.addEventListener('click', () => {
            const allSelected = state.filteredAds.length > 0 && state.filteredAds.every(ad => state.selectedIds.has(adId(ad)));
            state.filteredAds.forEach(ad => {
                const id = adId(ad);
                if (allSelected) state.selectedIds.delete(id);
                else state.selectedIds.add(id);
            });
            renderListAndDetail();
        });

        const applyBulk = document.getElementById('cc-apply-bulk-v326');
        if (applyBulk) applyBulk.addEventListener('click', applyBulkStatus);

        bindDynamicEvents();
    }

    function bindDynamicEvents() {
        const resetFiltersButtonR8 = document.getElementById('cc-reset-filters-r8');
        if (resetFiltersButtonR8 && !resetFiltersButtonR8.__ccR8Bound) {
            resetFiltersButtonR8.__ccR8Bound = true;
            resetFiltersButtonR8.addEventListener('click', () => {
                resetFiltersR8(true);
                renderAll();
            });
        }

        document.querySelectorAll('#content-center-v326 .cc-tree-ad-v326, #content-center-v326 .cc-card-v326').forEach(card => {
            card.addEventListener('click', event => {
                if (event.target && event.target.matches('input[type="checkbox"]')) return;
                state.selectedAdId = card.getAttribute('data-cc-ad-id') || '';
                renderListAndDetail();
            });
        });

        document.querySelectorAll('#content-center-v326 [data-cc-tree-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-cc-tree-toggle') || '';
                if (!key) return;
                const node = button.closest('.cc-tree-employee-v326, .cc-tree-group-v326');
                const willOpen = !state.treeOpen.has(key);
                state.treeCollapseAll = false;
                if (willOpen) state.treeOpen.add(key);
                else state.treeOpen.delete(key);
                if (node) node.classList.toggle('open', willOpen);
                button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            });
        });

        document.querySelectorAll('#content-center-v326 [data-cc-select]').forEach(check => {
            check.addEventListener('change', () => {
                const id = check.getAttribute('data-cc-select') || '';
                if (check.checked) state.selectedIds.add(id);
                else state.selectedIds.delete(id);
            });
        });

        document.querySelectorAll('#content-center-v326 [data-cc-action]').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-cc-action');
                const id = button.getAttribute('data-ad-id') || state.selectedAdId;
                const ad = state.ads.find(row => adId(row) === id);
                if (!ad) return;
                if (action === 'copy-caption') copyCaption(ad);
                if (action === 'open-ad') openAd(ad);
                if (action === 'save-workflow') saveWorkflowFromDetail(ad);
                if (action === 'create-task') createTaskFromAd(ad);
            });
        });
    }

    function copyCaption(ad) {
        const caption = captionOf(ad);
        if (!caption) return notify('Nội dung này chưa có caption để sao chép.', 'error');
        navigator.clipboard.writeText(caption)
            .then(() => notify('Đã sao chép caption.', 'success'))
            .catch(() => {
                const area = document.createElement('textarea');
                area.value = caption;
                document.body.appendChild(area);
                area.select();
                document.execCommand('copy');
                area.remove();
                notify('Đã sao chép caption.', 'success');
            });
    }

    function openAd(ad) {
        const id = adId(ad);
        try {
            if (typeof window.openContentAdV307 === 'function') {
                window.openContentAdV307(id);
                return;
            }
        } catch (error) {}
        const permalink = mediaInfo(ad).permalink;
        if (permalink) window.open(permalink, '_blank', 'noopener');
    }

    function workflowRefFor(ad) {
        const db = getDb();
        if (!db) return null;
        return db.ref(`${DATA_ROOT}/items/${state.company}/${firebaseKey(adId(ad))}`);
    }

    function serverTimestamp() {
        try {
            if (window.firebase && firebase.database && firebase.database.ServerValue) {
                return firebase.database.ServerValue.TIMESTAMP;
            }
        } catch (error) {}
        return Date.now();
    }

    function saveWorkflow(ad, payload) {
        if (!canWrite()) {
            notify('Tài khoản hiện tại chỉ được xem, không được sửa quy trình.', 'error');
            return Promise.reject(new Error('view_only'));
        }
        const ref = workflowRefFor(ad);
        if (!ref) {
            notify('Chưa kết nối được Firebase để lưu quy trình.', 'error');
            return Promise.reject(new Error('firebase_unavailable'));
        }
        const user = currentUserInfo();
        const next = Object.assign({}, payload || {}, {
            adId: adId(ad),
            company: state.company,
            adName: String(ad.name || ''),
            title: titleOf(ad),
            employee: employeeOf(ad),
            productName: String(ad.productName || ''),
            sku: String(ad.sku || ''),
            fanpagePostId: String(ad.fanpage_post_id || ''),
            fanpagePermalink: String(ad.fanpage_post_permalink || ''),
            updatedAt: serverTimestamp(),
            updatedAtIso: nowIso(),
            updatedBy: user
        });
        return ref.update(next).then(() => {
            notify('Đã lưu quy trình nội dung.', 'success');
            return next;
        });
    }

    function saveWorkflowFromDetail(ad) {
        const status = document.getElementById('cc-detail-status-v326');
        const owner = document.getElementById('cc-detail-owner-v326');
        const due = document.getElementById('cc-detail-due-v326');
        const tags = document.getElementById('cc-detail-tags-v326');
        const note = document.getElementById('cc-detail-note-v326');
        const payload = {
            status: String(status && status.value || ''),
            owner: String(owner && owner.value || '').trim(),
            dueDate: String(due && due.value || ''),
            tags: String(tags && tags.value || '').split(',').map(item => item.trim()).filter(Boolean),
            note: String(note && note.value || '').trim()
        };
        saveWorkflow(ad, payload).catch(() => {});
    }

    function createTaskFromAd(ad) {
        const evaluation = evaluateAd(ad);
        const primaryIssue = evaluation.issues[0];
        const tomorrow = new Date(Date.now() + 86400000);
        const dueDate = tomorrow.toISOString().slice(0, 10);
        const payload = {
            status: 'optimize',
            owner: String(getWorkflow(ad).owner || employeeOf(ad)),
            dueDate: String(getWorkflow(ad).dueDate || dueDate),
            tags: ['Tự động hóa', primaryIssue ? primaryIssue.code : 'content_review'],
            note: primaryIssue
                ? `Tác vụ tạo từ cảnh báo: ${primaryIssue.label}. ${primaryIssue.detail}`
                : 'Rà soát và tối ưu nội dung theo dữ liệu Meta mới nhất.',
            taskSource: 'content_center_v326_manual',
            taskCreatedAt: serverTimestamp()
        };
        saveWorkflow(ad, payload).catch(() => {});
    }

    function applyBulkStatus() {
        const select = document.getElementById('cc-bulk-status-v326');
        const status = String(select && select.value || '');
        if (!status) return notify('Chọn trạng thái cần áp dụng.', 'error');
        if (!state.selectedIds.size) return notify('Chưa chọn nội dung nào.', 'error');
        if (!canWrite()) return notify('Tài khoản hiện tại chỉ được xem.', 'error');
        const db = getDb();
        if (!db) return notify('Chưa kết nối Firebase.', 'error');
        const user = currentUserInfo();
        const updates = {};
        state.ads.forEach(ad => {
            const id = adId(ad);
            if (!state.selectedIds.has(id)) return;
            const base = `/${DATA_ROOT}/items/${state.company}/${firebaseKey(id)}`;
            updates[base + '/status'] = status;
            updates[base + '/adId'] = id;
            updates[base + '/company'] = state.company;
            updates[base + '/title'] = titleOf(ad);
            updates[base + '/updatedAt'] = serverTimestamp();
            updates[base + '/updatedAtIso'] = nowIso();
            updates[base + '/updatedBy'] = user;
        });
        db.ref().update(updates).then(() => {
            notify(`Đã cập nhật ${state.selectedIds.size} nội dung.`, 'success');
            state.selectedIds.clear();
        }).catch(error => notify('Không cập nhật được: ' + error.message, 'error'));
    }

    function loadWorkflow(company) {
        const db = getDb();
        if (!db) return;
        const normalized = String(company || state.company || 'NNV').toUpperCase();
        if (state.workflowRef && state.workflowListener) {
            try { state.workflowRef.off('value', state.workflowListener); } catch (error) {}
        }
        state.workflow = {};
        state.workflowRef = db.ref(`${DATA_ROOT}/items/${normalized}`);
        state.workflowListener = snapshot => {
            state.workflow = snapshot.val() || {};
            if (state.mounted) renderAll();
        };
        state.workflowRef.on('value', state.workflowListener, error => {
            console.warn('V326 không đọc được workflow:', error);
        });
    }

    function csvCell(value) {
        return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    }

    function exportCsv() {
        const rows = filterAds();
        const headers = [
            'Công ty','Ad ID','Tên nội dung','Sản phẩm','SKU','Nhân viên','Fanpage','Post ID',
            'Trạng thái bài gốc','Loại media','Chi phí + VAT','Tin nhắn','Lượt mua','CTR','CPA + VAT',
            'Workflow','Người phụ trách','Deadline','Cảnh báo','Caption','Link bài gốc'
        ];
        const data = [headers.map(csvCell).join(',')];
        rows.forEach(ad => {
            const evaluation = evaluateAd(ad);
            const workflow = getWorkflow(ad);
            data.push([
                state.company,
                adId(ad),
                titleOf(ad),
                ad.productName || '',
                ad.sku || '',
                employeeOf(ad),
                ad.fanpage_page_name || '',
                ad.fanpage_post_id || '',
                evaluation.found ? 'Đã lấy bài gốc' : 'Thiếu bài gốc',
                evaluation.media.kind,
                Math.round(evaluation.metrics.spend),
                evaluation.metrics.messages,
                evaluation.metrics.purchases,
                evaluation.metrics.ctr.toFixed(2),
                Math.round(evaluation.metrics.cpa),
                workflowLabel(workflow.status),
                workflow.owner || '',
                workflow.dueDate || '',
                evaluation.issues.map(item => item.label).join(' | '),
                captionOf(ad),
                evaluation.media.permalink
            ].map(csvCell).join(','));
        });
        const blob = new Blob(['\ufeff' + data.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Content_Center_${state.company}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function modalHtml(title, body, saveLabel, saveAction) {
        return `
            <div class="cc-modal-backdrop-v326" id="cc-modal-backdrop-v326">
                <div class="cc-modal-v326" role="dialog" aria-modal="true">
                    <div class="cc-modal-head-v326"><h3>${escapeHtml(title)}</h3><button class="cc-btn-v326" type="button" data-cc-modal-close>Đóng</button></div>
                    <div class="cc-modal-body-v326">${body}</div>
                    <div class="cc-modal-foot-v326"><button class="cc-btn-v326" type="button" data-cc-modal-close>Hủy</button><button class="cc-btn-v326 primary" type="button" id="cc-modal-save-v326" data-action="${escapeHtml(saveAction)}">${escapeHtml(saveLabel)}</button></div>
                </div>
            </div>
        `;
    }

    function openModal(html, onSave) {
        const root = rootElement();
        if (!root) return;
        root.insertAdjacentHTML('beforeend', html);
        const backdrop = document.getElementById('cc-modal-backdrop-v326');
        if (!backdrop) return;
        backdrop.querySelectorAll('[data-cc-modal-close]').forEach(button => {
            button.addEventListener('click', () => backdrop.remove());
        });
        backdrop.addEventListener('click', event => {
            if (event.target === backdrop) backdrop.remove();
        });
        const save = document.getElementById('cc-modal-save-v326');
        if (save) save.addEventListener('click', () => {
            if (onSave() !== false) backdrop.remove();
        });
    }

    function openSaveViewModal() {
        const body = `<div class="cc-field-v326"><label>Tên bộ lọc</label><input id="cc-view-name-v326" placeholder="Ví dụ: KF thiếu bài gốc"></div>`;
        openModal(modalHtml('Lưu bộ lọc hiện tại', body, 'Lưu bộ lọc', 'save-view'), () => {
            const input = document.getElementById('cc-view-name-v326');
            const name = String(input && input.value || '').trim();
            if (!name) {
                notify('Nhập tên bộ lọc.', 'error');
                return false;
            }
            state.savedViews.unshift({
                name,
                view: state.view,
                filters: Object.assign({}, state.filters),
                createdAt: nowIso()
            });
            state.savedViews = state.savedViews.slice(0, MAX_SAVED_VIEWS);
            saveLocalState();
            renderAll();
            return true;
        });
    }

    function openSettingsModal() {
        const s = state.settings;
        const body = `
            <div class="cc-workflow-grid-v326">
                <div class="cc-field-v326"><label>Tự cập nhật Meta</label><select id="cc-set-refresh-v326"><option value="0" ${s.autoRefreshMinutes === 0 ? 'selected' : ''}>Tắt</option><option value="5" ${s.autoRefreshMinutes === 5 ? 'selected' : ''}>Mỗi 5 phút</option><option value="15" ${s.autoRefreshMinutes === 15 ? 'selected' : ''}>Mỗi 15 phút</option><option value="30" ${s.autoRefreshMinutes === 30 ? 'selected' : ''}>Mỗi 30 phút</option><option value="60" ${s.autoRefreshMinutes === 60 ? 'selected' : ''}>Mỗi 60 phút</option></select></div>
                <div class="cc-field-v326"><label>Tự tạo tác vụ cảnh báo</label><select id="cc-set-auto-task-v326"><option value="false" ${!s.autoCreateTasks ? 'selected' : ''}>Tắt</option><option value="true" ${s.autoCreateTasks ? 'selected' : ''}>Bật</option></select></div>
                <div class="cc-field-v326"><label>Chi phí chưa có đơn</label><input id="cc-set-spend-purchase-v326" type="number" min="0" value="${escapeHtml(s.spendNoPurchase)}"></div>
                <div class="cc-field-v326"><label>Chi phí chưa có tin</label><input id="cc-set-spend-message-v326" type="number" min="0" value="${escapeHtml(s.spendNoMessage)}"></div>
                <div class="cc-field-v326"><label>CTR thấp hơn (%)</label><input id="cc-set-ctr-v326" type="number" min="0" step="0.1" value="${escapeHtml(s.lowCtr)}"></div>
                <div class="cc-field-v326"><label>Tần suất cao hơn</label><input id="cc-set-freq-v326" type="number" min="0" step="0.1" value="${escapeHtml(s.highFrequency)}"></div>
                <div class="cc-field-v326"><label>Đơn để nhận diện bài thắng</label><input id="cc-set-winner-v326" type="number" min="1" value="${escapeHtml(s.winnerPurchases)}"></div>
                <div class="cc-field-v326"><label>Nội dung cũ sau (ngày)</label><input id="cc-set-stale-v326" type="number" min="1" value="${escapeHtml(s.staleDays)}"></div>
                <div class="cc-field-v326 wide"><label><input id="cc-set-health-v326" type="checkbox" ${s.healthSnapshot ? 'checked' : ''}> Lưu ảnh chụp sức khỏe nội dung tối đa 1 lần/giờ vào Firebase</label></div>
            </div>
            <div class="cc-issue-v326 low" style="margin-top:12px"><i></i><div><b>Nguyên tắc an toàn</b><small>Tự động hóa chỉ ghi trong nhánh content_manager_v326, không tự tắt quảng cáo, không sửa ngân sách và không dùng token chéo công ty.</small></div></div>
        `;
        openModal(modalHtml('Cấu hình tự động hóa', body, 'Lưu cấu hình', 'save-settings'), () => {
            state.settings.autoRefreshMinutes = safeNumber(document.getElementById('cc-set-refresh-v326').value);
            state.settings.autoCreateTasks = document.getElementById('cc-set-auto-task-v326').value === 'true';
            state.settings.spendNoPurchase = safeNumber(document.getElementById('cc-set-spend-purchase-v326').value);
            state.settings.spendNoMessage = safeNumber(document.getElementById('cc-set-spend-message-v326').value);
            state.settings.lowCtr = safeNumber(document.getElementById('cc-set-ctr-v326').value);
            state.settings.highFrequency = safeNumber(document.getElementById('cc-set-freq-v326').value);
            state.settings.winnerPurchases = Math.max(1, safeNumber(document.getElementById('cc-set-winner-v326').value));
            state.settings.staleDays = Math.max(1, safeNumber(document.getElementById('cc-set-stale-v326').value));
            state.settings.healthSnapshot = document.getElementById('cc-set-health-v326').checked;
            saveLocalState();
            configureAutoRefresh();
            renderAll();
            return true;
        });
    }

    function configureAutoRefresh() {
        if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
        state.autoRefreshTimer = setInterval(() => {
            const minutes = safeNumber(state.settings.autoRefreshMinutes);
            if (!minutes || document.hidden) return;
            const page = document.getElementById('page-ads');
            if (page && !page.classList.contains('active')) return;
            if (Date.now() - state.lastAutoRefreshAt < minutes * 60000) return;
            state.lastAutoRefreshAt = Date.now();
            try {
                if (typeof window.refreshMetaAdsLive === 'function') {
                    window.refreshMetaAdsLive(false);
                }
            } catch (error) {
                console.warn('V326 auto refresh:', error);
            }
        }, 30000);
    }

    function healthSnapshotPayload() {
        const stats = summaryStats();
        return {
            version: BUILD,
            company: state.company,
            capturedAt: serverTimestamp(),
            capturedAtIso: nowIso(),
            total: stats.total,
            resolved: stats.resolved,
            missing: stats.missing,
            winners: stats.winners,
            risks: stats.risks,
            overdue: stats.overdue,
            spend: Math.round(stats.spend),
            purchases: stats.purchases,
            messages: stats.messages,
            resolvedRate: stats.total > 0 ? Number((stats.resolved / stats.total * 100).toFixed(2)) : 0
        };
    }

    function persistHealthSnapshot() {
        if (!state.settings.healthSnapshot || !canWrite()) return;
        const db = getDb();
        if (!db || !state.ads.length) return;
        const localKey = storageKey('LAST_HEALTH', state.company);
        const last = safeNumber(safeLocalGet(localKey, '0'));
        if (Date.now() - last < 60 * 60 * 1000) return;
        const day = new Date().toISOString().slice(0, 10);
        db.ref(`${DATA_ROOT}/health/${state.company}/${day}`)
            .update(healthSnapshotPayload())
            .then(() => {
                safeLocalSet(localKey, String(Date.now()));
                state.lastHealthPersistAt = Date.now();
            })
            .catch(error => console.warn('V326 health snapshot:', error));
    }

    function ensureAutoTasks() {
        if (!state.settings.autoCreateTasks || !canWrite()) return;
        const db = getDb();
        if (!db) return;
        const updates = {};
        let count = 0;
        const user = currentUserInfo();
        state.ads.some(ad => {
            if (count >= 20) return true;
            const evaluation = evaluateAd(ad);
            const critical = evaluation.issues.find(issue => ['critical','high'].includes(issue.severity));
            if (!critical) return false;
            const current = getWorkflow(ad);
            if (current.autoIssueCode === critical.code && !['done','archive'].includes(current.status)) return false;
            const id = firebaseKey(adId(ad));
            const base = `/${DATA_ROOT}/items/${state.company}/${id}`;
            updates[base + '/adId'] = adId(ad);
            updates[base + '/company'] = state.company;
            updates[base + '/title'] = titleOf(ad);
            updates[base + '/status'] = current.status || 'review';
            updates[base + '/owner'] = current.owner || employeeOf(ad);
            updates[base + '/note'] = `Tự động tạo từ cảnh báo: ${critical.label}. ${critical.detail}`;
            updates[base + '/autoGenerated'] = true;
            updates[base + '/autoIssueCode'] = critical.code;
            updates[base + '/updatedAt'] = serverTimestamp();
            updates[base + '/updatedAtIso'] = nowIso();
            updates[base + '/updatedBy'] = user;
            count++;
            return false;
        });
        if (count) db.ref().update(updates).catch(error => console.warn('V326 auto tasks:', error));
    }

    function scheduleHealthAutomation() {
        setTimeout(() => {
            persistHealthSnapshot();
            ensureAutoTasks();
        }, 500);
    }

    function currentGroupedRowsR7() {
        try {
            if (typeof CONTENT_BROWSER_LAST_GROUPED_ROWS_V309 !== 'undefined' && Array.isArray(CONTENT_BROWSER_LAST_GROUPED_ROWS_V309)) {
                return CONTENT_BROWSER_LAST_GROUPED_ROWS_V309;
            }
        } catch (error) {}
        try {
            if (typeof META_LIVE_DATA !== 'undefined' && Array.isArray(META_LIVE_DATA)) return META_LIVE_DATA;
        } catch (error) {}
        return [];
    }

    function openDataFromExistingTree() {
        const grouped = currentGroupedRowsR7();
        const directAds = directMetaAdsR7();
        if (directAds.length || grouped.length) {
            refreshSourceRows(grouped);
            return true;
        }
        return false;
    }

    function syncCompanyDataR7() {
        const company = String(getCurrentCompany() || state.company || '').toUpperCase();
        if (company !== state.company) return false;
        const directAds = directMetaAdsR7();
        const grouped = currentGroupedRowsR7();
        if (!directAds.length && !grouped.length) return false;
        refreshSourceRows(grouped);
        return true;
    }

    function installHooks() {
        if (state.hooksInstalled) return;
        state.hooksInstalled = true;

        try {
            if (typeof renderContentPerformanceOverviewV306 === 'function') {
                state.originalRender = renderContentPerformanceOverviewV306;
                const wrapped = function contentCenterRenderHookV326(data) {
                    const result = state.originalRender.apply(this, arguments);
                    refreshSourceRows(data);
                    return result;
                };
                wrapped.__mktContentCenterV326 = true;
                renderContentPerformanceOverviewV306 = wrapped;
                window.renderContentPerformanceOverviewV306 = wrapped;
            }
        } catch (error) {
            console.warn('V326 không hook được renderer:', error);
        }

        try {
            if (typeof window.initAdsAnalysis === 'function') {
                state.originalInit = window.initAdsAnalysis;
                window.initAdsAnalysis = function contentCenterInitHookV326() {
                    const result = state.originalInit.apply(this, arguments);
                    setTimeout(() => {
                        state.company = getCurrentCompany();
                        loadLocalState();
                        openDataFromExistingTree();
                        renderAll();
                    }, 80);
                    return result;
                };
            }
        } catch (error) {
            console.warn('V326 không hook được init:', error);
        }

        try {
            if (typeof window.changeCompany === 'function') {
                state.originalChangeCompany = window.changeCompany;
                window.changeCompany = function contentCenterCompanyHookV326(company) {
                    const result = state.originalChangeCompany.apply(this, arguments);
                    state.company = String(company || getCurrentCompany()).toUpperCase();
                    state.selectedAdId = '';
                    state.selectedIds.clear();
                    state.treeOpen.clear();
                    state.treeContext = '';
                    state.treeCollapseAll = false;
                    state.sourceRows = [];
                    state.ads = [];
                    state.filteredAds = [];
                    state.filters = Object.assign({}, DEFAULT_FILTERS_R8);
                    state.view = 'library';
                    state.pendingFilterRecoveryR8 = true;
                    loadLocalState();
                    loadWorkflow(state.company);
                    renderAll();
                    [120, 450, 1200, 2500].forEach(delay => setTimeout(syncCompanyDataR7, delay));
                    return result;
                };
            }
        } catch (error) {}
    }

    function mount() {
        state.company = getCurrentCompany();
        state.pendingFilterRecoveryR8 = true;
        loadLocalState();
        configureAutoRefresh();
    
    window.getContentCenterStatusV326R11 = status;
    window.getContentSourceContractV326R11 = function () {
        return {
            build: BUILD,
            layoutBuild: LAYOUT_BUILD,
            interface: 'new_content_management_center',
            leftColumn: 'ads_folder_tree',
            treeSource: 'META_CONTENT_ADS_V307_scoped_by_performanceTableData',
            periodScopeSource: 'same_rows_as_Bang_Meta_chi_tiet',
            treeStructure: 'employee > product_sku_adset > ad',
            defaultTreeExpansion: 'collapsed',
            expansionRule: 'manual_click_only',
            autoOpenSelectedPath: false,
            rightColumn: 'content_management_detail',
            rightContentSource: 'facebook_page_api',
            rightPanelFallbackToAds: false,
            legacyInterfaceVisible: false,
            workflowPreserved: true,
            filtersPreserved: true
        };
    };

    window.getContentCenterStatusV326R10 = status;
    window.getContentSourceContractV326R10 = function () {
        return {
            build: BUILD,
            layoutBuild: LAYOUT_BUILD,
            interface: 'new_content_management_center',
            leftColumn: 'ads_folder_tree',
            treeSource: 'META_CONTENT_ADS_V307_scoped_by_performanceTableData',
            periodScopeSource: 'same_rows_as_Bang_Meta_chi_tiet',
            adVisibilityRule: 'adset_in_current_table && (has_insights || has_delivery_data || metrics_in_period)',
            treeStructure: 'employee > product_sku_adset > ad',
            rightColumn: 'content_management_detail',
            rightContentSource: 'facebook_page_api',
            rightPanelFallbackToAds: false,
            legacyInterfaceVisible: false,
            workflowPreserved: true,
            filtersPreserved: true
        };
    };

    installHooks();
        loadWorkflow(state.company);
        if (!openDataFromExistingTree()) renderAll();
        return true;
    }

    function status() {
        const stats = summaryStats();
        return {
            build: BUILD,
            layoutBuild: LAYOUT_BUILD,
            layout: 'new_content_management_ui__ads_tree_left__page_api_content_right',
            directAdsCount: directMetaAdsR7().length,
            activeFilters: Object.assign({}, state.filters),
            activeView: state.view,
            lastFilterRecoveryR8: state.lastFilterRecoveryR8,
            company: state.company,
            mounted: state.mounted,
            ads: state.ads.length,
            filtered: state.filteredAds.length,
            resolved: stats.resolved,
            missing: stats.missing,
            workflowItems: Object.keys(state.workflow || {}).length,
            autoRefreshMinutes: state.settings.autoRefreshMinutes,
            autoCreateTasks: state.settings.autoCreateTasks,
            firebaseConnected: !!getDb(),
            canWrite: canWrite(),
            legacyInterfaceVisible: false
        };
    }

    window.resetContentCenterFiltersV326R8 = function () {
        resetFiltersR8(true);
        renderAll();
        return { company: state.company, filters: Object.assign({}, state.filters), view: state.view, ads: state.ads.length, filtered: state.filteredAds.length };
    };
    window.getContentCenterFilterStatusV326R8 = function () {
        return {
            company: state.company,
            ads: state.ads.length,
            filtered: state.filteredAds.length,
            filters: Object.assign({}, state.filters),
            view: state.view,
            lastRecovery: state.lastFilterRecoveryR8
        };
    };

    window.MKT_CONTENT_CENTER_BUILD = BUILD;
    window.MKT_CONTENT_CENTER_LAYOUT_BUILD = LAYOUT_BUILD;
    window.MKT_CONTENT_CENTER_V326 = {
        build: BUILD,
        layoutBuild: LAYOUT_BUILD,
        mount,
        rebuild: renderAll,
        refreshSourceRows,
        getStatus: status,
        getState: function () {
            return {
                company: state.company,
                ads: state.ads.slice(),
                filteredAds: state.filteredAds.slice(),
                filters: Object.assign({}, state.filters),
                settings: Object.assign({}, state.settings)
            };
        }
    };
    window.getContentCenterStatusV326 = status;
    window.getContentCenterStatusV326R4 = status;
    window.getContentCenterStatusV326R6 = status;
    window.getContentCenterStatusV326R7 = status;
    window.getContentSourceContractV326R7 = function () {
        return {
            build: BUILD,
            treeSource: 'META_CONTENT_ADS_V307_direct',
            treeStructure: 'employee > product_sku_adset > ad',
            leftMediaSource: 'ads_creative',
            rightContentSource: 'facebook_page_api',
            rightPanelFallbackToAds: false,
            workflowPreserved: true
        };
    };

    window.getContentCenterStatusV326R9 = status;
    window.getContentSourceContractV326R9 = function () {
        return {
            build: BUILD,
            layoutBuild: LAYOUT_BUILD,
            interface: 'new_content_management_center',
            leftColumn: 'ads_folder_tree',
            treeSource: 'META_CONTENT_ADS_V307_direct',
            treeStructure: 'employee > product_sku_adset > ad',
            rightColumn: 'content_management_detail',
            rightContentSource: 'facebook_page_api',
            rightPanelFallbackToAds: false,
            legacyInterfaceVisible: false,
            workflowPreserved: true,
            filtersPreserved: true
        };
    };

    installHooks();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0), { once: true });
    } else {
        setTimeout(mount, 0);
    }
})();
