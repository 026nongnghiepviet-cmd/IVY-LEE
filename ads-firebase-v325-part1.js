/* V331 R1: SHARED WARM 4 COMPANY + 2-MIN GLOBAL REFRESH GATE; giữ V330 exact Page/Post resolver. */
/* V330 R2 CLEAN: bỏ các hàm test/chẩn đoán thủ công dư thừa; giữ nguyên logic vận hành. */
/* V329 R1: ABC EXACT PAGE TOKEN + DARK POST PROMOTABLE POSTS; giữ V328 VN/KF fixes. */
/* V328 R1: VN ADS FALLBACK + KF CREATIVE IDENTITY/PAGE RESOLVER */
/* V321: STRICT FANPAGE CONTENT + ORIGINAL 4:5 MEDIA — GMAIL1 */
/* V318.7: SAFE 4-TOKEN ISOLATION + NNV DEDICATED CONFIG + OAUTH. */
/* V317: POSTER SOURCE PRIORITY — Photo.images Fanpage 4:5 > Ad Images image_hash > attachment/full_picture > rendered > thumbnail; rendered 4096 không còn được coi là kích thước thật. */
/* V317: HIRES SUMMARY FALLBACK — GMAIL1: summary hydrate Ad Images + rendered 4096; tăng khả năng lấy poster thật Fanpage; cache namespace mới. */
/* V310: ORIGINAL FANPAGE PHOTO RESOLVER — GMAIL1: lấy Photo.images lớn nhất của attachment bài Facebook; fallback 2048 creative thumbnail/ad image. */
/* V309: FANPAGE POSTER SOURCE — GMAIL1: ưu tiên ảnh attachment/full_picture thật của bài Facebook cho summary và detail, tránh dùng thumbnail nhỏ làm preview chính. */
/* V307: CONTENT FEED SUMMARY — summary Meta trả creative + Insights cấp bài để Tổng quan Ads hiển thị ảnh/video/caption và KPI đúng từng bài. */
// V304 ACCURACY: Insights yêu cầu use_unified_attribution_setting=true để bám attribution setting của ad set/Ads Manager; giữ Meta Direct V302.
/* V302 META DIRECT NO COUNTDOWN — GMAIL1: hỗ trợ request.force=true để summary/full bỏ cache Apps Script 5 phút và gọi Meta mới ngay. ad_details vẫn cache để tránh tải lại media không cần thiết. */
/* V225: NHẬN DẠNG TÊN NHÓM QUẢNG CÁO MỚI AICHATGPTNNV_GMAIL1 — hỗ trợ `Tên sản phẩm | Họ tên nhân viên | Công ty | QC-Mã SP`; giữ parser legacy làm fallback. */
/* V223: VIDEO + MULTI IMAGE MEDIA AICHATGPTNNV_GMAIL1 — video thumbnail/video permalink, multi-image gallery, Facebook-only click URL, không dùng Instagram permalink làm link bài. */
/* V222: FIX REFERENCE ERROR AICHATGPTNNV_GMAIL1 — khai báo directCreativeImage đúng scope trong extractMetaCreativePreviewV215_; bump detail cache để bỏ payload lỗi V221. */
/* V221: DEEP CREATIVE MEDIA RESOLVER AICHATGPTNNV_GMAIL1 — phân loại image/video/post/dynamic; video dùng /thumbnails; fix subattachment avatar scoring; backend quyết định duy nhất ảnh chính. */
/* V220: TRUE CREATIVE IMAGE AICHATGPTNNV_GMAIL1 — fix account scope trong ad_details; lấy thumbnail render lớn trực tiếp từ AdCreative, rồi Ad Images; Page story chỉ fallback. */
/* V219: CORRECT POST IMAGE AICHATGPTNNV_GMAIL1 — ưu tiên attachment/subattachment ảnh bài, không để full_picture/avatar Fanpage đè ảnh creative; cache detail mới. */
/* V218: SHARP POST PREVIEW AICHATGPTNNV_GMAIL1 — ưu tiên full_picture/attachments của effective_object_story_id, sau đó mới Ad Images/image_url/thumbnail. */
/* V217: HIGH-RES AD PREVIEW AICHATGPTNNV_GMAIL1 — ưu tiên ảnh gốc từ Meta Ad Images theo image_hash; thumbnail chỉ là fallback cuối; đổi detail cache namespace. */
/* V216: FIX AD PREVIEW AICHATGPTNNV_GMAIL1 — creative fields được lấy đúng trong luồng ad_details; bump detail cache để bỏ payload cũ thiếu creative. */
/* V215: Bổ sung preview creative bài quảng cáo lazy trong ad_details để frontend mở xem trực tiếp. */
// V214 EXACT 3-ACCOUNT ACTIVITY — AICHATGPTNNV_GMAIL1
// Bổ sung metadata Activity đủ 3 cấp Campaign / Adset / Ad trên đúng CODE.GS gốc của tài khoản này.
// Giữ nguyên toàn bộ logic Meta, Firebase, Lazy Detail và System Admin Bridge nếu file gốc có.

const META_API_VERSION = 'v25.0';
const META_TIMEZONE = 'Asia/Ho_Chi_Minh';
const META_CACHE_SECONDS = 300;
const META_CACHE_CHUNK_CHARS = 20000;
const META_CACHE_VERSION = 'V209_MOBILE_BRIDGE_SECURE';
const META_DETAIL_VERSION = 'V209_MOBILE_BRIDGE_SECURE';


/**
 * V206 — Cache dùng chung cho toàn bộ Web App.
 * - Mỗi company + khoảng ngày dùng chung một cache 5 phút.
 * - Chia JSON thành nhiều chunk để không vướng giới hạn ~100 KB / cache item.
 * - Cache chỉ là lớp giảm request; nếu Google loại cache sớm thì lần kế tiếp gọi Meta lại.
 */
function buildMetaSharedCacheKey_(company, from, to) {
  return [
    'meta_direct_v206',
    String(company || '').toUpperCase(),
    getMetaTokenEpochV318_(company),
    String(from || ''),
    String(to || '')
  ].join('_');
}

function readChunkedScriptCache_(baseKey) {
  const cache = CacheService.getScriptCache();
  const manifestText = cache.get(baseKey + '__manifest');
  if (!manifestText) return null;

  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    return null;
  }

  const chunkCount = Number(manifest && manifest.chunkCount || 0);
  if (!chunkCount || chunkCount < 1 || chunkCount > 100) return null;

  const keys = [];
  for (let index = 0; index < chunkCount; index++) {
    keys.push(baseKey + '__chunk_' + index);
  }

  const parts = cache.getAll(keys);
  let json = '';
  for (let index = 0; index < keys.length; index++) {
    const part = parts[keys[index]];
    if (typeof part !== 'string') return null;
    json += part;
  }

  try {
    const payload = JSON.parse(json);
    const serverNowMs = Date.now();
    const storedAtMs = Number(manifest && manifest.storedAt || 0);
    const expiresAtMs = storedAtMs > 0
      ? storedAtMs + (META_CACHE_SECONDS * 1000)
      : serverNowMs;
    const remainingMs = Math.max(0, expiresAtMs - serverNowMs);

    payload.cacheInfo = Object.assign({}, payload.cacheInfo || {}, {
      hit: true,
      ttlSeconds: META_CACHE_SECONDS,
      servedAt: Utilities.formatDate(
        new Date(serverNowMs),
        META_TIMEZONE,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
      serverNowMs: serverNowMs,
      storedAtMs: storedAtMs,
      expiresAtMs: expiresAtMs,
      remainingMs: remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      cacheVersion: META_CACHE_VERSION
    });
    return payload;
  } catch (error) {
    return null;
  }
}

function writeChunkedScriptCache_(baseKey, payload) {
  const cache = CacheService.getScriptCache();
  const json = JSON.stringify(payload || {});
  const chunks = [];

  for (let index = 0; index < json.length; index += META_CACHE_CHUNK_CHARS) {
    chunks.push(json.slice(index, index + META_CACHE_CHUNK_CHARS));
  }

  if (!chunks.length || chunks.length > 100) {
    console.warn('Bỏ qua cache Meta V206 vì payload quá lớn.');
    return false;
  }

  const values = {};
  chunks.forEach(function (chunk, index) {
    values[baseKey + '__chunk_' + index] = chunk;
  });

  cache.putAll(values, META_CACHE_SECONDS);
  cache.put(
    baseKey + '__manifest',
    JSON.stringify({
      version: META_CACHE_VERSION,
      chunkCount: chunks.length,
      storedAt: Date.now(),
      chars: json.length
    }),
    META_CACHE_SECONDS
  );

  return true;
}

function readMetaAdsSharedCache_(company, from, to) {
  return readChunkedScriptCache_(
    buildMetaSharedCacheKey_(company, from, to)
  );
}

/**
 * Chỉ một execution được phép tạo cache mới tại cùng thời điểm.
 * Sau khi lấy lock phải kiểm tra cache lại vì execution trước có thể vừa ghi xong.
 */
function getMetaAdsLiveForUserCached_(company, from, to) {
  const cached = readMetaAdsSharedCache_(company, from, to);
  if (cached) return cached;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const cachedAfterLock = readMetaAdsSharedCache_(company, from, to);
    if (cachedAfterLock) return cachedAfterLock;

    // forceRefresh=true ở tầng thấp chỉ có nghĩa là bỏ qua bước đọc cache cũ.
    // Sau khi Meta trả về, getMetaAdsLive_ vẫn ghi cache chia chunk 5 phút.
    return getMetaAdsLive_(company, from, to, true);
  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}

function getSystemUsersCached_(databaseUrl, firebaseIdToken) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'mkt_system_users_v206';
  const cached = cache.get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached) || {};
    } catch (error) {}
  }

  const usersResponse = UrlFetchApp.fetch(
    databaseUrl +
      '/system_settings/users.json?auth=' +
      encodeURIComponent(firebaseIdToken),
    {
      method: 'get',
      muteHttpExceptions: true
    }
  );

  const usersStatus = usersResponse.getResponseCode();
  if (usersStatus < 200 || usersStatus >= 300) {
    throw new Error('Không kiểm tra được người dùng trên Firebase.');
  }

  let systemUsers = {};
  try {
    systemUsers = JSON.parse(usersResponse.getContentText()) || {};
  } catch (error) {
    throw new Error('Dữ liệu người dùng Firebase không hợp lệ.');
  }

  try {
    const json = JSON.stringify(systemUsers);
    if (json.length < 90000) cache.put(cacheKey, json, META_CACHE_SECONDS);
  } catch (error) {}

  return systemUsers;
}
// V154: Giữ ưu tiên ngày kết thúc và chuẩn hóa đối tượng đã xóa, dọn trạng thái Không xác định.


/* =========================================================
   V318 — META MULTI-BUSINESS TOKEN ROUTER
   - Mỗi công ty ưu tiên META_ACCESS_TOKEN_<COMPANY>.
   - Nếu chưa migrate công ty đó, fallback META_ACCESS_TOKEN cũ.
   - META_TOKEN_EPOCH_<COMPANY> làm namespace cache để token mới có hiệu lực ngay.
   ========================================================= */
function normalizeMetaCompanyV318_(company) {
  const code = String(company || '').trim().toUpperCase();
  if (['NNV', 'VN', 'KF', 'ABC'].indexOf(code) === -1) {
    throw new Error('Công ty không hợp lệ: ' + code);
  }
  return code;
}

function getMetaTokenEpochV318_(company) {
  const code = normalizeMetaCompanyV318_(company);
  return String(
    PropertiesService.getScriptProperties().getProperty(
      'META_TOKEN_EPOCH_' + code
    ) || '0'
  );
}

function bumpMetaTokenEpochV318_(company) {
  const code = normalizeMetaCompanyV318_(company);
  const epoch = String(Date.now());
  PropertiesService.getScriptProperties().setProperty(
    'META_TOKEN_EPOCH_' + code,
    epoch
  );
  return epoch;
}


function getMetaDedicatedTokenStatusV318_() {
  const props = PropertiesService.getScriptProperties();
  const result = {};
  ['NNV', 'VN', 'KF', 'ABC'].forEach(function (code) {
    result[code] = !!String(
      props.getProperty('META_ACCESS_TOKEN_' + code) || ''
    ).trim();
  });
  return result;
}

function hasAllDedicatedMetaTokensV318_() {
  const status = getMetaDedicatedTokenStatusV318_();
  return !!(status.NNV && status.VN && status.KF && status.ABC);
}

function isStrictMetaTokenModeV318_() {
  const props = PropertiesService.getScriptProperties();
  const explicit = String(
    props.getProperty('META_TOKEN_MODE') || ''
  ).trim().toLowerCase();

  if (explicit === 'strict') return true;
  if (explicit === 'legacy') return false;

  // AUTO: đủ 4 token riêng thì không cần fallback token chung nữa.
  return hasAllDedicatedMetaTokensV318_();
}

function getMetaCompanyTokenV318_(company, allowLegacy) {
  const code = normalizeMetaCompanyV318_(company);
  const props = PropertiesService.getScriptProperties();

  const own = String(
    props.getProperty('META_ACCESS_TOKEN_' + code) || ''
  ).trim();

  if (own) return own;

  // Khi đã vào strict mode, tuyệt đối không dùng token chung.
  if (isStrictMetaTokenModeV318_()) {
    return '';
  }

  if (allowLegacy !== false) {
    return String(
      props.getProperty('META_ACCESS_TOKEN') || ''
    ).trim();
  }

  return '';
}



/**
 * Cấu hình bốn tài khoản từ Script Properties.
 */

function getMetaAccounts_() {
  const props = PropertiesService.getScriptProperties();
  const legacyToken = String(props.getProperty('META_ACCESS_TOKEN') || '').trim();

  const accounts = [
    {
      company: 'NNV',
      name: 'Nông Nghiệp Việt',
      accountId: props.getProperty('META_AD_ACCOUNT_NNV')
    },
    {
      company: 'VN',
      name: 'Hóa Nông Việt Nhật',
      accountId: props.getProperty('META_AD_ACCOUNT_VN')
    },
    {
      company: 'KF',
      name: 'KingFarm',
      accountId: props.getProperty('META_AD_ACCOUNT_KF')
    },
    {
      company: 'ABC',
      name: 'ABC Việt Nam',
      accountId: props.getProperty('META_AD_ACCOUNT_ABC')
    }
  ];

  const strictMode = isStrictMetaTokenModeV318_();

  accounts.forEach(function (account) {
    const dedicated = String(
      props.getProperty('META_ACCESS_TOKEN_' + account.company) || ''
    ).trim();

    account.token = dedicated || (strictMode ? '' : legacyToken);
    account.tokenSource = dedicated
      ? 'company'
      : (!strictMode && legacyToken ? 'legacy' : 'missing');
  });

  const missingIds = accounts.filter(function (account) {
    return !account.accountId;
  });
  if (missingIds.length > 0) {
    throw new Error(
      'Thiếu ID tài khoản: ' +
      missingIds.map(function (item) { return item.company; }).join(', ')
    );
  }

  const missingTokens = accounts.filter(function (account) {
    return !account.token;
  });
  if (missingTokens.length > 0) {
    throw new Error(
      'Thiếu Meta token cho: ' +
      missingTokens.map(function (item) { return item.company; }).join(', ') +
      '. Cấu hình META_ACCESS_TOKEN_<COMPANY> hoặc giữ META_ACCESS_TOKEN legacy.'
    );
  }

  return {
    token: strictMode ? '' : legacyToken,
    legacyToken: legacyToken,
    strictCompanyTokens: strictMode,
    accounts: accounts
  };
}

/**
 * Kiểm tra nhanh token có đọc được đủ bốn tài khoản.
 */


/**
 * Chạy hàm này ở bước 3.
 * Lấy dữ liệu NNV từ đầu tháng hiện tại đến hôm nay.
 */


/**
 * Hàm chính lấy dữ liệu một công ty.
 */
function getMetaAdsLive_(company, from, to, forceRefresh) {
  const config = getMetaAccounts_();

  const companyCode = String(company || '').toUpperCase();

  const account = config.accounts.find(function (item) {
    return item.company === companyCode;
  });

  if (!account) {
    throw new Error(
      'Mã công ty không hợp lệ: ' + companyCode
    );
  }

  validateDateRange_(from, to);

  const cacheKey = buildMetaSharedCacheKey_(
    companyCode,
    from,
    to
  );

  if (!forceRefresh) {
    const cached = readChunkedScriptCache_(cacheKey);
    if (cached) return cached;
  }

  const insightFields = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'frequency',
    'actions',
    'cost_per_action_type',
    'date_start',
    'date_stop'
  ].join(',');

  /*
   * Dữ liệu cấp bài quảng cáo dùng cho popup drill-down.
   * Vẫn giữ số tổng cấp nhóm quảng cáo làm nguồn chính của bảng ngoài.
   */
  const adInsightFields = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'frequency',
    'actions',
    'cost_per_action_type',
    'date_start',
    'date_stop'
  ].join(',');

  const adsetFields = [
    'id',
    'name',
    'effective_status',
    'status',
    'created_time',
    'updated_time',
    'start_time',
    'end_time',
    'daily_budget',
    'lifetime_budget',
    'campaign{id,name}'
  ].join(',');

  /*
   * Lấy toàn bộ bài quảng cáo đã thiết lập để giao diện có thể hiển thị
   * ngay cả khi bài chưa phát sinh Insights trong kỳ đang chọn.
   */
  const adFields = [
    'id',
    'name',
    'effective_status',
    'status',
    'created_time',
    'updated_time',
    'adset{id,name}',
    'campaign{id,name}',
    'creative{id,name,thumbnail_url,image_url,effective_object_story_id,object_story_spec,object_type,call_to_action_type,link_url,url_tags,instagram_permalink_url,title,body}'
  ].join(',');

  const insightsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/insights',
    {
      level: 'adset',
      use_unified_attribution_setting: true,
      fields: insightFields,
      time_range: JSON.stringify({
        since: from,
        until: to
      }),
      limit: 500
    }
  );

  const adInsightsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/insights',
    {
      level: 'ad',
      use_unified_attribution_setting: true,
      fields: adInsightFields,
      time_range: JSON.stringify({
        since: from,
        until: to
      }),
      limit: 500
    }
  );

  const adsetsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/adsets',
    {
      fields: adsetFields,
      limit: 500
    }
  );

  const adsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/ads',
    {
      fields: adFields,
      limit: 500
    }
  );

  const insights = fetchMetaPages_(
    insightsUrl,
    (account.token || config.token),
    companyCode + ' Insights'
  );

  let adsets = fetchMetaPages_(
    adsetsUrl,
    (account.token || config.token),
    companyCode + ' Adsets'
  );

  /*
   * Metadata toàn bộ bài quảng cáo. Đây là nguồn danh sách cấu hình,
   * còn adInsights chỉ là nguồn số liệu hiệu quả theo kỳ.
   */
  let allAdsMetadata = [];
  try {
    allAdsMetadata = fetchMetaPages_(
      adsUrl,
      (account.token || config.token),
      companyCode + ' Ads'
    );
  } catch (adsMetadataError) {
    console.warn(
      companyCode +
      ' không tải được toàn bộ bài quảng cáo: ' +
      adsMetadataError.message
    );
  }

  const adInsights = fetchMetaPages_(
    adInsightsUrl,
    (account.token || config.token),
    companyCode + ' Ad Insights'
  );

  /*
   * V148: Có trường hợp endpoint /ads đã trả bài mới nhưng edge /adsets
   * chưa kịp trả nhóm tương ứng trong cùng lần gọi. Khi đó cấp bài xuất hiện
   * nhưng cấp nhóm bị thiếu. Lấy toàn bộ adset_id được tham chiếu bởi bài/Insights,
   * rồi đọc trực tiếp metadata các nhóm còn thiếu theo ID.
   */
  const referencedAdsetIds = {};

  allAdsMetadata.forEach(function (ad) {
    const adset = ad && ad.adset && typeof ad.adset === 'object'
      ? ad.adset
      : {};
    const adsetId = String(adset.id || '').trim();
    if (adsetId) referencedAdsetIds[adsetId] = true;
  });

  adInsights.forEach(function (insight) {
    const adsetId = String(insight && insight.adset_id || '').trim();
    if (adsetId) referencedAdsetIds[adsetId] = true;
  });

  const loadedAdsetIds = {};
  adsets.forEach(function (adset) {
    const adsetId = String(adset && adset.id || '').trim();
    if (adsetId) loadedAdsetIds[adsetId] = true;
  });

  const missingAdsetIds = Object.keys(referencedAdsetIds).filter(function (adsetId) {
    return !loadedAdsetIds[adsetId];
  });

  if (missingAdsetIds.length) {
    try {
      const missingAdsets = fetchMetaObjectsByIds_(
        missingAdsetIds,
        adsetFields,
        (account.token || config.token),
        companyCode + ' Missing Adsets'
      );

      missingAdsets.forEach(function (adset) {
        const adsetId = String(adset && adset.id || '').trim();
        if (!adsetId || loadedAdsetIds[adsetId]) return;
        loadedAdsetIds[adsetId] = true;
        adsets.push(adset);
      });
    } catch (missingAdsetError) {
      console.warn(
        companyCode +
        ' không bổ sung được metadata nhóm quảng cáo còn thiếu: ' +
        missingAdsetError.message
      );
    }
  }

  const adMetadataById = {};
  allAdsMetadata.forEach(function (ad) {
    if (ad && ad.id) adMetadataById[String(ad.id)] = ad;
  });

  /*
   * Nếu một bài có Insights nhưng không còn xuất hiện trong endpoint /ads,
   * vẫn tạo metadata tối thiểu để không làm mất dữ liệu lịch sử.
   */
  adInsights.forEach(function (insight) {
    const adId = String(insight.ad_id || '');
    if (!adId || adMetadataById[adId]) return;

    adMetadataById[adId] = {
      id: adId,
      name: insight.ad_name || '',
      // Có Insights lịch sử nhưng không còn tồn tại trong /ads: xem là đã xóa,
      // không để trạng thái rỗng khiến giao diện hiển thị Không xác định.
      effective_status: 'DELETED',
      status: 'DELETED',
      deleted_from_meta: true,
      adset: {
        id: insight.adset_id || '',
        name: insight.adset_name || ''
      },
      campaign: {
        id: insight.campaign_id || '',
        name: insight.campaign_name || ''
      }
    };
  });

  /*
   * Nhóm nào có ít nhất một bài cấu hình liên quan tới kỳ đang xem cũng phải
   * xuất hiện ở cấp nhóm, kể cả /adsets chưa trả đủ hoặc nhóm chưa có Insights.
   */
  const adInsightIdsForPeriod = {};
  adInsights.forEach(function (insight) {
    const adId = String(insight && insight.ad_id || '').trim();
    if (adId) adInsightIdsForPeriod[adId] = true;
  });

  const relevantAdsetIdsFromAds = {};
  const adsetFallbackById = {};

  Object.keys(adMetadataById).forEach(function (adId) {
    const ad = adMetadataById[adId] || {};
    const adset = ad.adset && typeof ad.adset === 'object'
      ? ad.adset
      : {};
    const campaign = ad.campaign && typeof ad.campaign === 'object'
      ? ad.campaign
      : {};
    const adsetId = String(adset.id || '').trim();
    if (!adsetId) return;

    if (!adsetFallbackById[adsetId]) {
      adsetFallbackById[adsetId] = {
        id: adsetId,
        name: adset.name || '',
        campaign: campaign,
        effective_status: '',
        status: '',
        created_time: ad.created_time || '',
        updated_time: ad.updated_time || ''
      };
    }

    if (isMetaAdsetRelevantToPeriod_(
      ad,
      from,
      to,
      !!adInsightIdsForPeriod[adId]
    )) {
      relevantAdsetIdsFromAds[adsetId] = true;
    }
  });

  const adsByAdsetId = buildMetaAdsByAdset_(
    adInsights,
    adMetadataById,
    from,
    to,
    syncedAtPlaceholder_()
  );

  /*
   * Ghép bằng adset_id, tuyệt đối không ghép bằng tên.
   */
  const adsetsById = {};

  adsets.forEach(function (adset) {
    adsetsById[String(adset.id)] = adset;
  });

  const syncedAt = Utilities.formatDate(
    new Date(),
    META_TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );

  /* Gắn lại thời gian đồng bộ chuẩn vào từng bài quảng cáo. */
  Object.keys(adsByAdsetId).forEach(function (adsetId) {
    adsByAdsetId[adsetId].forEach(function (ad) {
      ad.syncedAt = syncedAt;
    });
  });

  const insightsByAdsetId = {};
  insights.forEach(function (insight) {
    const adsetId = String(insight.adset_id || '');
    if (adsetId) insightsByAdsetId[adsetId] = insight;
  });

  /*
   * Danh sách ngoài được dựng từ toàn bộ nhóm quảng cáo đã thiết lập,
   * không dựng từ Insights. Những nhóm chưa có số liệu vẫn được trả về
   * với các chỉ số bằng 0 và trạng thái/ngân sách lấy từ cấu hình Meta.
   */
  const rowAdsetIds = [];
  const rowAdsetSeen = {};
  const excludedAdsetIds = {};

  adsets.forEach(function (metadata) {
    const adsetId = String(metadata && metadata.id || '');
    if (!adsetId) return;

    const hasInsight = !!insightsByAdsetId[adsetId];

    // V153: ngày kết thúc khóa kỳ trước mọi nguồn khác, kể cả Insights,
    // updated_time hoặc việc vừa gạt công tắc trong kỳ hiện tại.
    if (isMetaObjectEndedBeforePeriod_(metadata, from)) {
      excludedAdsetIds[adsetId] = true;
      return;
    }

    const relevantFromConfiguredAd = !!relevantAdsetIdsFromAds[adsetId];
    if (
      !isMetaAdsetRelevantToPeriod_(metadata, from, to, hasInsight) &&
      !relevantFromConfiguredAd
    ) return;

    rowAdsetSeen[adsetId] = true;
    rowAdsetIds.push(adsetId);
  });

  /*
   * Bổ sung nhóm được phát hiện từ cấp bài nhưng chưa có trong edge /adsets.
   * Metadata trực tiếp theo ID ở trên sẽ được ưu tiên; nếu Meta chưa trả kịp,
   * vẫn tạo hàng nhóm tối thiểu từ quan hệ ad -> adset.
   */
  Object.keys(relevantAdsetIdsFromAds).forEach(function (adsetId) {
    if (!adsetId || rowAdsetSeen[adsetId] || excludedAdsetIds[adsetId]) return;
    rowAdsetSeen[adsetId] = true;
    rowAdsetIds.push(adsetId);
  });

  /*
   * Nhóm đã có số liệu nhưng metadata không còn đọc được vẫn phải giữ.
   */
  insights.forEach(function (insight) {
    const adsetId = String(insight.adset_id || '');
    if (!adsetId || rowAdsetSeen[adsetId]) return;
    rowAdsetSeen[adsetId] = true;
    rowAdsetIds.push(adsetId);
  });

  const rows = rowAdsetIds.map(function (adsetId) {
    const insight = insightsByAdsetId[adsetId] || {};
    const metadata = adsetsById[adsetId] || adsetFallbackById[adsetId] || {};
    const configuredAds = adsByAdsetId[adsetId] || [];
    const fallbackConfiguredStatus = getMetaFallbackStatusFromAds_(configuredAds);

    const fullName =
      metadata.name ||
      insight.adset_name ||
      '';

    const nameParts = parseAdsetName_(fullName);

    const messages = getActionValue_(
      insight.actions,
      'onsite_conversion.messaging_conversation_started_7d'
    );

    const purchases = getActionValue_(
      insight.actions,
      'omni_purchase'
    );

    const costPerMessage = getActionValue_(
      insight.cost_per_action_type,
      'onsite_conversion.messaging_conversation_started_7d'
    );

    const costPerPurchase = getActionValue_(
      insight.cost_per_action_type,
      'omni_purchase'
    );

    const campaign =
      metadata.campaign &&
      typeof metadata.campaign === 'object'
        ? metadata.campaign
        : {};

    const linkCtrMetrics = getMetaLinkCtrMetrics_(insight);
    const spend = toNumber_(insight.spend);
    const impressions = linkCtrMetrics.impressions;
    const reach = toNumber_(insight.reach);
    const clicks = toNumber_(insight.clicks);
    const hasDeliveryData = (
      spend > 0 ||
      impressions > 0 ||
      reach > 0 ||
      clicks > 0 ||
      linkCtrMetrics.linkClicks > 0 ||
      messages > 0 ||
      purchases > 0
    );

    const deliveryStatus = resolveMetaDeliveryStatus_(
      metadata,
      hasDeliveryData
    );

    return {
      source: 'meta_api',
      company: companyCode,
      accountId: account.accountId,

      campaignId:
        campaign.id ||
        insight.campaign_id ||
        '',

      campaignName:
        campaign.name ||
        insight.campaign_name ||
        '',

      adsetId: adsetId,

      ads: configuredAds,
      adCount: configuredAds.length,

      fullName: fullName,
      employee: nameParts.employee,
      adName: nameParts.adName,
      productName: nameParts.productName || '',
      sku: nameParts.sku || '',
      skus: nameParts.sku ? [nameParts.sku] : [],
      adsetCompanyCode: nameParts.companyCode || '',
      adsetNamingMode: nameParts.namingMode || 'legacy',

      spend: spend,
      result: purchases,
      messages: messages,

      ctr: linkCtrMetrics.ctr,
      ctrType: linkCtrMetrics.ctrType,
      linkClicks: linkCtrMetrics.linkClicks,
      freq: toNumber_(insight.frequency),

      rawCpm: costPerMessage,
      rawCpa: costPerPurchase,

      impressions: impressions,
reach: reach,
      clicks: clicks,

      run_start:
        metadata.start_time ||
        metadata.created_time ||
        '',

      run_end: metadata.end_time || '',

      created_time: metadata.created_time || '',
      updated_time: metadata.updated_time || '',

      // delivery_status dùng để hiển thị; effective/configured giữ nguyên
      // để đối chiếu đúng từng cấp với dữ liệu Meta.
      status: deliveryStatus || fallbackConfiguredStatus || '',
      delivery_status: deliveryStatus || fallbackConfiguredStatus || '',

      effective_status:
        metadata.effective_status ||
        fallbackConfiguredStatus ||
        '',

      configured_status:
        metadata.status ||
        fallbackConfiguredStatus ||
        '',

      raw_effective_status: metadata.effective_status || '',
      raw_configured_status: metadata.status || '',

      daily_budget:
        metadata.daily_budget !== undefined
          ? toNumber_(metadata.daily_budget)
          : null,

      lifetime_budget:
        metadata.lifetime_budget !== undefined
          ? toNumber_(metadata.lifetime_budget)
          : null,

      has_insights: !!insightsByAdsetId[adsetId],
      has_delivery_data: hasDeliveryData,
      data_state: hasDeliveryData ? 'delivered' : 'configured_only',

      report_start: insight.date_start || from,
      report_end: insight.date_stop || to,

      report_start_iso: insight.date_start || from,
      report_end_iso: insight.date_stop || to,

      report_month: String(
        insight.date_stop || to
      ).slice(0, 7),

      syncedAt: syncedAt
    };
  });

  const result = {
    success: true,
    source: 'meta_api',
    metricVersion: 'v154_deleted_unknown_cleanup',
    company: companyCode,
    companyName: account.name,
    accountId: account.accountId,

    period: {
      from: from,
      to: to
    },

    syncedAt: syncedAt,

    cacheInfo: {
      hit: false,
      ttlSeconds: META_CACHE_SECONDS,
      fetchedAt: syncedAt,
      cacheVersion: META_CACHE_VERSION
    },

    totals: calculateTotals_(rows),

    rows: rows
  };

  /*
   * V206: cache dùng chung 5 phút, chia nhiều chunk để payload lớn vẫn cache được.
   * Cache nằm ở Apps Script, không phát sinh Firebase Realtime Database download.
   */
  try {
    writeChunkedScriptCache_(cacheKey, result);
  } catch (error) {
    console.warn('Không ghi được cache Meta V206: ' + error.message);
  }

  return result;
}


/**
 * Trả ngày YYYY-MM-DD từ chuỗi thời gian Meta.
 */
function metaDateOnly_(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Chỉ đưa nhóm chưa có Insights vào kỳ đang xem khi nhóm thực sự liên quan:
 * - được tạo/cập nhật trong kỳ;
 * - có lịch bắt đầu/kết thúc trong kỳ;
 * - hoặc kỳ hiện tại và nhóm đang ở trạng thái có thể phân phối.
 */

/**
 * V151: Chuẩn hóa trạng thái giao hàng gần với cách Ads Manager hiển thị.
 * - effective_status là trạng thái giao hàng thực tế do Meta trả về.
 * - status là trạng thái cấu hình bật/tắt.
 * - ACTIVE nhưng chưa có bất kỳ dữ liệu phân phối nào được xem là PREPARING,
 *   không gắn nhãn Đang chạy quá sớm.
 */
function resolveMetaDeliveryStatus_(metadata, hasDeliveryData) {
  metadata = metadata || {};

  const effective = String(
    metadata.effective_status ||
    metadata.delivery_status ||
    metadata.status ||
    ''
  ).toUpperCase();

  const configured = String(
    metadata.status ||
    metadata.configured_status ||
    ''
  ).toUpperCase();

  if (effective === 'IN_PROCESS' || effective === 'PREPARING') {
    return 'PREPARING';
  }

  if (effective === 'ACTIVE') {
    const today = Utilities.formatDate(
      new Date(),
      META_TIMEZONE,
      'yyyy-MM-dd'
    );
    const start = metaDateOnly_(metadata.start_time);

    if (start && start > today) return 'SCHEDULED';
    if (!hasDeliveryData) return 'PREPARING';
    return 'ACTIVE';
  }

  return effective || configured || '';
}

/**
 * Nhóm đã có ngày kết thúc trước kỳ đang xem không được đưa trở lại kỳ mới
 * chỉ vì người dùng vừa gạt nút tắt hoặc Meta cập nhật updated_time.
 */
function isMetaObjectEndedBeforePeriod_(metadata, from) {
  if (!metadata || !from) return false;
  const end = metaDateOnly_(metadata.end_time);
  return !!(end && end < from);
}

function getMetaFallbackStatusFromAds_(ads) {
  const rows = Array.isArray(ads) ? ads : [];
  if (!rows.length) return '';

  const priority = [
    'ACTIVE',
    'PENDING_REVIEW',
    'IN_PROCESS',
    'PENDING_BILLING_INFO',
    'PREAPPROVED',
    'SCHEDULED',
    'WITH_ISSUES',
    'LIMITED',
    'DISAPPROVED',
    'PAUSED',
    'ADSET_PAUSED',
    'CAMPAIGN_PAUSED',
    'ARCHIVED',
    'DELETED'
  ];

  const statuses = rows.map(function (row) {
    return String(
      row && (
        row.effective_status ||
        row.configured_status ||
        row.rawStatus ||
        row.status
      ) || ''
    ).toUpperCase();
  }).filter(Boolean);

  for (let index = 0; index < priority.length; index++) {
    if (statuses.indexOf(priority[index]) !== -1) return priority[index];
  }

  return statuses[0] || '';
}

function isMetaAdsetRelevantToPeriod_(adset, from, to, hasInsight) {
  if (!adset) return false;

  const created = metaDateOnly_(adset.created_time);
  const updated = metaDateOnly_(adset.updated_time);
  const start = metaDateOnly_(adset.start_time);
  const end = metaDateOnly_(adset.end_time);

  /*
   * V153 — ngày kết thúc là điều kiện ưu tiên cao nhất.
   * Khi đã có end_time, tuyệt đối không dùng updated_time hoặc thao tác gạt nút
   * để kéo nhóm sang một kỳ nằm sau ngày kết thúc.
   */
  if (end) {
    if (end < from) return false;
    if (start && start > to) return false;

    // Có số liệu trong kỳ hoặc lịch chạy giao với kỳ đang xem thì giữ.
    if (hasInsight) return true;
    if (start) return start <= to && end >= from;
    if (created) return created <= to && end >= from;
    return end >= from && end <= to;
  }

  // Chỉ khi chưa đặt ngày kết thúc mới xét Insights và thao tác bật/tắt.
  if (hasInsight) return true;
  if (created && created >= from && created <= to) return true;
  if (start && start >= from && start <= to) return true;
  if (updated && updated >= from && updated <= to) return true;

  const today = Utilities.formatDate(
    new Date(),
    META_TIMEZONE,
    'yyyy-MM-dd'
  );
  const includesToday = from <= today && to >= today;
  if (!includesToday) return false;

  const status = String(
    adset.effective_status ||
    adset.status ||
    ''
  ).toUpperCase();

  const liveStatuses = [
    'ACTIVE',
    'PENDING_REVIEW',
    'IN_PROCESS',
    'PENDING_BILLING_INFO',
    'PREAPPROVED',
    'WITH_ISSUES',
    'SCHEDULED'
  ];

  return liveStatuses.indexOf(status) !== -1;
}

/**
 * Giá trị tạm để dựng cấu trúc trước khi có syncedAt chính thức.
 */
function syncedAtPlaceholder_() {
  return '';
}

/**
 * Đọc metadata theo danh sách ID, chia nhỏ để URL không quá dài.
 */
function fetchMetaObjectsByIds_(ids, fields, token, label) {
  ids = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!ids.length) return [];

  const chunkSize = 50;
  const requests = [];

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    requests.push({
      url:
        'https://graph.facebook.com/' +
        META_API_VERSION +
        '/?ids=' +
        encodeURIComponent(chunk.join(',')) +
        '&fields=' +
        encodeURIComponent(fields),
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token
      },
      muteHttpExceptions: true
    });
  }

  const responses = UrlFetchApp.fetchAll(requests);
  let output = [];

  responses.forEach(function (response, index) {
    const payload = parseMetaResponse_(
      response,
      label + ' lô ' + (index + 1)
    );

    Object.keys(payload || {}).forEach(function (id) {
      const value = payload[id];
      if (value && !value.error) output.push(value);
    });
  });

  return output;
}

/**
 * Chuẩn hóa số liệu cấp bài quảng cáo và gom theo adset_id.
 */
function firstNonEmptyMetaTextV215_(values) {
  for (var i = 0; i < (values || []).length; i++) {
    var value = values[i];
    if (value === null || value === undefined) continue;
    value = String(value).trim();
    if (value) return value;
  }
  return '';
}

function buildMetaPostUrlV215_(storyId, pageId) {
  var raw = String(storyId || '').trim();
  if (!raw) return '';

  var pieces = raw.split('_');
  if (pieces.length >= 2) {
    var page = String(pageId || pieces[0] || '').trim();
    var post = String(pieces[1] || '').trim();
    if (page && post) {
      return 'https://www.facebook.com/' + encodeURIComponent(page) + '/posts/' + encodeURIComponent(post);
    }
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}



function hydrateRenderedCreativeThumbnailsV220_(
  adsMetadata,
  token,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  var byCreative = {};
  var creativeIds = [];

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var creativeId = String(
      creative.id || ''
    ).trim();

    if (!/^\d+$/.test(creativeId)) return;

    if (!byCreative[creativeId]) {
      byCreative[creativeId] = [];
      creativeIds.push(creativeId);
    }

    byCreative[creativeId].push(ad);
  });

  if (!creativeIds.length) {
    return adsMetadata;
  }

  /*
   * thumbnail_url lồng trong ad->creative thường dùng thumbnail mặc định nhỏ.
   * V220 đọc TRỰC TIẾP AdCreative node với thumbnail_width/height lớn.
   * Đây là ảnh render của creative quảng cáo, không phụ thuộc Page post.
   */
  var chunkSize = 40;

  for (
    var offset = 0;
    offset < creativeIds.length;
    offset += chunkSize
  ) {
    var chunk = creativeIds.slice(
      offset,
      offset + chunkSize
    );

    var url =
      'https://graph.facebook.com/' +
      META_API_VERSION +
      '/?ids=' +
      encodeURIComponent(chunk.join(',')) +
      '&fields=' +
      encodeURIComponent(
        'id,thumbnail_url,image_hash,image_url,effective_object_story_id'
      ) +
      '&thumbnail_width=4096' +
      '&thumbnail_height=4096';

    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token
      },
      muteHttpExceptions: true
    });

    var payload;
    var requestedRenderSizeV317 = 4096;
    try {
      payload = parseMetaResponse_(
        response,
        label + ' 4096 lô ' + (Math.floor(offset / chunkSize) + 1)
      );
    } catch (render4096ErrorV317) {
      // Meta có thể không chấp nhận 4096 ở một số creative/account.
      // Retry 2048 để không làm hỏng toàn bộ luồng ảnh.
      requestedRenderSizeV317 = 2048;
      var fallbackUrl =
        'https://graph.facebook.com/' +
        META_API_VERSION +
        '/?ids=' +
        encodeURIComponent(chunk.join(',')) +
        '&fields=' +
        encodeURIComponent('id,thumbnail_url,image_hash,image_url,effective_object_story_id') +
        '&thumbnail_width=2048' +
        '&thumbnail_height=2048';

      var fallbackResponse = UrlFetchApp.fetch(fallbackUrl, {
        method: 'get',
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      });
      payload = parseMetaResponse_(
        fallbackResponse,
        label + ' fallback 2048 lô ' + (Math.floor(offset / chunkSize) + 1)
      );
    }

    Object.keys(payload || {}).forEach(
      function (creativeId) {
        var resolved = payload[creativeId];

        if (
          !resolved ||
          resolved.error
        ) return;

        var linkedAds =
          byCreative[creativeId] || [];

        linkedAds.forEach(function (ad) {
          if (
            !ad ||
            !ad.creative ||
            typeof ad.creative !== 'object'
          ) return;

          var creative = ad.creative;

          creative._v220_rendered_thumbnail_url =
            String(
              resolved.thumbnail_url || ''
            ).trim();

          creative._v220_rendered_thumbnail_requested_width =
            requestedRenderSizeV317;

          creative._v220_rendered_thumbnail_requested_height =
            requestedRenderSizeV317;

          /*
           * Direct creative GET đôi khi trả image_hash/image_url đầy đủ
           * hơn field expansion lồng trong /ads.
           */
          if (
            !creative.image_hash &&
            resolved.image_hash
          ) {
            creative.image_hash =
              String(resolved.image_hash);
          }

          if (
            !creative.image_url &&
            resolved.image_url
          ) {
            creative.image_url =
              String(resolved.image_url);
          }

          if (
            !creative.effective_object_story_id &&
            resolved.effective_object_story_id
          ) {
            creative.effective_object_story_id =
              String(
                resolved.effective_object_story_id
              );
          }
        });
      }
    );
  }

  return adsMetadata;
}

function collectCreativeImageHashesV217_(creative) {
  creative = creative && typeof creative === 'object' ? creative : {};

  var output = [];
  var seen = {};

  function addHash(value) {
    var hash = String(value || '').trim();
    if (!hash || seen[hash]) return;
    seen[hash] = true;
    output.push(hash);
  }

  function scanObject(value, depth) {
    if (!value || depth > 7) return;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        scanObject(item, depth + 1);
      });
      return;
    }

    if (typeof value !== 'object') return;

    Object.keys(value).forEach(function (key) {
      var child = value[key];

      if (
        key === 'image_hash' ||
        key === 'hash'
      ) {
        /*
         * Chỉ nhận hash có hình dạng hash Meta tương đối dài.
         * Tránh lấy nhầm các trường hash không phải image.
         */
        var candidate = String(child || '').trim();
        if (/^[A-Za-z0-9_-]{12,}$/.test(candidate)) {
          addHash(candidate);
        }
      }

      if (
        key === 'images' ||
        key === 'image_hashes' ||
        key === 'asset_feed_spec' ||
        key === 'object_story_spec' ||
        key === 'link_data' ||
        key === 'video_data' ||
        key === 'template_data' ||
        key === 'child_attachments'
      ) {
        scanObject(child, depth + 1);
      }
    });
  }

  addHash(creative.image_hash);
  scanObject(creative.object_story_spec, 0);
  scanObject(creative.asset_feed_spec, 0);

  return output;
}

function fetchMetaAdImagesByHashesV217_(
  accountId,
  hashes,
  token,
  label
) {
  hashes = Array.isArray(hashes)
    ? hashes.filter(Boolean)
    : [];

  if (!hashes.length) return {};

  var unique = [];
  var seen = {};
  hashes.forEach(function (hash) {
    hash = String(hash || '').trim();
    if (!hash || seen[hash]) return;
    seen[hash] = true;
    unique.push(hash);
  });

  var output = {};
  var chunkSize = 50;

  for (var index = 0; index < unique.length; index += chunkSize) {
    var chunk = unique.slice(index, index + chunkSize);

    var url = buildMetaUrl_(
      'act_' + accountId + '/adimages',
      {
        hashes: JSON.stringify(chunk),
        fields: 'hash,url,url_128,width,height',
        limit: 500
      }
    );

    var rows = fetchMetaPages_(
      url,
      token,
      label + ' lô ' + (Math.floor(index / chunkSize) + 1)
    );

    rows.forEach(function (row) {
      var hash = String(row && row.hash || '').trim();
      if (!hash) return;

      output[hash] = {
        hash: hash,
        url: String(row && row.url || '').trim(),
        url128: String(row && row.url_128 || '').trim(),
        width: toNumber_(row && row.width),
        height: toNumber_(row && row.height)
      };
    });
  }

  return output;
}

function hydrateHighResolutionAdImagesV217_(
  accountId,
  adsMetadata,
  token,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  var allHashes = [];
  var adHashes = {};

  adsMetadata.forEach(function (ad) {
    var adId = String(ad && ad.id || '').trim();
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var hashes = collectCreativeImageHashesV217_(creative);
    adHashes[adId] = hashes;

    hashes.forEach(function (hash) {
      allHashes.push(hash);
    });
  });

  if (!allHashes.length) return adsMetadata;

  var imageMap = fetchMetaAdImagesByHashesV217_(
    accountId,
    allHashes,
    token,
    label
  );

  adsMetadata.forEach(function (ad) {
    var adId = String(ad && ad.id || '').trim();
    if (
      !ad ||
      !ad.creative ||
      typeof ad.creative !== 'object'
    ) return;

    var hashes = adHashes[adId] || [];
    var candidates = hashes
      .map(function (hash) {
        return imageMap[hash] || null;
      })
      .filter(Boolean)
      .filter(function (image) {
        return !!image.url;
      });

    // V317: nếu Dynamic/Flexible creative có nhiều image_hash, ưu tiên asset gần 4:5,
    // sau đó mới xét diện tích pixel. Đây vẫn là ảnh gốc Ad Images, không phải thumbnail render.
    candidates = sortPosterCandidatesV317_(candidates);

    if (!candidates.length) return;

    /*
     * V223: giữ toàn bộ ảnh theo image_hash để hỗ trợ
     * carousel / flexible / bài có nhiều ảnh.
     */
    ad.creative._v223_adimage_gallery =
      candidates.map(function (image) {
        return {
          url:String(image.url || ''),
          width:Number(image.width || 0),
          height:Number(image.height || 0),
          source:'adimage_hash',
          hash:String(image.hash || '')
        };
      });

    var best = candidates[0];

    ad.creative._v217_highres_image_url =
      String(best.url || '');

    ad.creative._v217_highres_image_hash =
      String(best.hash || '');

    ad.creative._v217_highres_width =
      Number(best.width || 0);

    ad.creative._v217_highres_height =
      Number(best.height || 0);
  });

  return adsMetadata;
}


function extractBestStoryImageV218_(payload) {
  payload =
    payload && typeof payload === 'object'
      ? payload
      : {};

  var attachmentCandidates = [];
  var fallbackCandidates = [];

  function add(
    target,
    url,
    width,
    height,
    source,
    mediaType
  ) {
    url = String(url || '').trim();
    if (!url) return;

    target.push({
      url: url,
      width: toNumber_(width),
      height: toNumber_(height),
      source: String(source || ''),
      mediaType: String(mediaType || '')
    });
  }

  /*
   * full_picture của một số tài khoản/page có thể là avatar Fanpage.
   * Vì vậy chỉ giữ nó làm fallback, KHÔNG xếp ngang hàng với attachment.
   */
  add(
    fallbackCandidates,
    payload.full_picture,
    0,
    0,
    'post_full_picture_fallback',
    ''
  );

  function scanAttachment(
    attachment,
    prefix,
    depth
  ) {
    attachment =
      attachment && typeof attachment === 'object'
        ? attachment
        : {};

    var media =
      attachment.media &&
      typeof attachment.media === 'object'
        ? attachment.media
        : {};

    var image =
      media.image &&
      typeof media.image === 'object'
        ? media.image
        : {};

    var mediaType = String(
      attachment.media_type ||
      attachment.type ||
      ''
    ).toUpperCase();

    add(
      attachmentCandidates,
      image.src,
      image.width,
      image.height,
      prefix + '_media_image',
      mediaType
    );

    var sub =
      attachment.subattachments &&
      Array.isArray(
        attachment.subattachments.data
      )
        ? attachment.subattachments.data
        : [];

    sub.forEach(function (item, index) {
      scanAttachment(
        item,
        prefix + '_sub_' + index,
        Number(depth || 0) + 1
      );
    });
  }

  var attachments =
    payload.attachments &&
    Array.isArray(payload.attachments.data)
      ? payload.attachments.data
      : [];

  attachments.forEach(
    function (attachment, index) {
      scanAttachment(
        attachment,
        'attachment_' + index,
        0
      );
    }
  );

  function candidateScore(candidate) {
    var width = Number(candidate.width || 0);
    var height = Number(candidate.height || 0);
    var area = width * height;
    var source = String(candidate.source || '');

    /*
     * subattachment thường là media thật của carousel/dynamic post.
     * Cho ưu tiên nhẹ hơn main attachment nếu kích thước ngang nhau.
     */
    var sourceBoost =
      source.indexOf('_sub_') >= 0
        ? 2000000000
        : 1000000000;

    return sourceBoost + area;
  }

  if (attachmentCandidates.length) {
    attachmentCandidates.sort(function (a, b) {
      return candidateScore(b) - candidateScore(a);
    });

    return attachmentCandidates[0];
  }

  return fallbackCandidates.length
    ? fallbackCandidates[0]
    : null;
}

function hydrateStoryFullPicturesV218_(
  adsMetadata,
  token,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  var byStory = {};
  var storyIds = [];

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var storyId = String(
      creative.effective_object_story_id || ''
    ).trim();

    if (!storyId) return;

    if (!byStory[storyId]) {
      byStory[storyId] = [];
      storyIds.push(storyId);
    }

    byStory[storyId].push(ad);
  });

  if (!storyIds.length) return adsMetadata;

  var chunkSize = 30;

  for (
    var index = 0;
    index < storyIds.length;
    index += chunkSize
  ) {
    var chunk = storyIds.slice(
      index,
      index + chunkSize
    );

    var url =
      'https://graph.facebook.com/' +
      META_API_VERSION +
      '/?ids=' +
      encodeURIComponent(chunk.join(',')) +
      '&fields=' +
      encodeURIComponent(
        'full_picture,permalink_url,attachments{media_type,type,media,subattachments{media_type,type,media,url,target,title,description},url,target,title,description}'
      );

    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token
      },
      muteHttpExceptions: true
    });

    var payload = parseMetaResponse_(
      response,
      label +
      ' lô ' +
      (Math.floor(index / chunkSize) + 1)
    );

    Object.keys(payload || {}).forEach(
      function (storyId) {
        var story = payload[storyId];

        if (
          !story ||
          story.error
        ) return;

        var best =
          extractBestStoryImageV218_(story);

        var linkedAds =
          byStory[storyId] || [];

        linkedAds.forEach(function (ad) {
          if (
            !ad ||
            !ad.creative ||
            typeof ad.creative !== 'object'
          ) return;

          ad.creative._v218_story_permalink =
            String(
              story.permalink_url || ''
            ).trim();

          if (best && best.url) {
            ad.creative._v218_story_image_url =
              String(best.url || '');

            ad.creative._v218_story_image_width =
              Number(best.width || 0);

            ad.creative._v218_story_image_height =
              Number(best.height || 0);

            ad.creative._v218_story_image_source =
String(best.source || '');
          }
        });
      }
    );
  }

  return adsMetadata;
}


function getDirectCreativeImageV219_(creative) {
  creative =
    creative && typeof creative === 'object'
      ? creative
      : {};

  var story =
    creative.object_story_spec &&
    typeof creative.object_story_spec === 'object'
      ? creative.object_story_spec
      : {};

  var linkData =
    story.link_data &&
    typeof story.link_data === 'object'
      ? story.link_data
      : {};

  var videoData =
    story.video_data &&
    typeof story.video_data === 'object'
      ? story.video_data
      : {};

  var templateData =
    story.template_data &&
    typeof story.template_data === 'object'
      ? story.template_data
      : {};

  var asset =
    creative.asset_feed_spec &&
    typeof creative.asset_feed_spec === 'object'
      ? creative.asset_feed_spec
      : {};

  var images =
    Array.isArray(asset.images)
      ? asset.images
      : [];

  var assetImage = '';

  for (var i = 0; i < images.length; i++) {
    var item = images[i] || {};
    assetImage = firstNonEmptyMetaTextV215_([
      item.url,
      item.image_url,
      item.picture
    ]);
    if (assetImage) break;
  }

  return firstNonEmptyMetaTextV215_([
    linkData.picture,
    linkData.image_url,
    videoData.image_url,
    videoData.picture,
    templateData.picture,
    templateData.image_url,
    assetImage
  ]);
}



function collectDirectCreativeGalleryV223_(creative) {
  creative =
    creative && typeof creative === 'object'
      ? creative
      : {};

  var output = [];
  var seen = {};

  function add(url, source) {
    url = String(url || '').trim();
    if (!url || seen[url]) return;
    seen[url] = true;

    output.push({
      url:url,
      width:0,
      height:0,
      source:String(source || 'direct_creative')
    });
  }

  var story =
    creative.object_story_spec &&
    typeof creative.object_story_spec === 'object'
      ? creative.object_story_spec
      : {};

  var linkData =
    story.link_data &&
    typeof story.link_data === 'object'
      ? story.link_data
      : {};

  var templateData =
    story.template_data &&
    typeof story.template_data === 'object'
      ? story.template_data
      : {};

  var videoData =
    story.video_data &&
    typeof story.video_data === 'object'
      ? story.video_data
      : {};

  [linkData, templateData].forEach(
    function (data, dataIndex) {
      add(
        data.picture,
        dataIndex === 0
          ? 'link_data_picture'
          : 'template_data_picture'
      );

      add(
        data.image_url,
        dataIndex === 0
          ? 'link_data_image'
          : 'template_data_image'
      );

      var children =
        Array.isArray(data.child_attachments)
          ? data.child_attachments
          : [];

      children.forEach(function (child, index) {
        child =
          child && typeof child === 'object'
            ? child
            : {};

        add(
          child.picture,
          'child_attachment_' + index
        );

        add(
          child.image_url,
          'child_attachment_image_' + index
        );
      });
    }
  );

  add(
    videoData.picture,
    'video_data_picture'
  );

  add(
    videoData.image_url,
    'video_data_image'
  );

  var asset =
    creative.asset_feed_spec &&
    typeof creative.asset_feed_spec === 'object'
      ? creative.asset_feed_spec
      : {};

  var images =
    Array.isArray(asset.images)
      ? asset.images
      : [];

  images.forEach(function (image, index) {
    image =
      image && typeof image === 'object'
        ? image
        : {};

    add(
      image.url,
      'asset_image_url_' + index
    );

    add(
      image.image_url,
      'asset_image_' + index
    );

    add(
      image.picture,
      'asset_picture_' + index
    );
  });

  return output;
}

function extractFacebookPostGalleryV223_(payload) {
  payload =
    payload && typeof payload === 'object'
      ? payload
      : {};

  var output = [];
  var seen = {};

  function add(
    url,
    width,
    height,
    source,
    depth,
    mediaType
  ) {
    url = String(url || '').trim();
    if (!url || seen[url]) return;

    var inferred =
      inferMediaDimensionsFromUrlV221_(
        url
      );

    width =
      toNumber_(width) ||
      Number(inferred.width || 0);

    height =
      toNumber_(height) ||
      Number(inferred.height || 0);

    seen[url] = true;

    output.push({
      url:url,
      width:Number(width || 0),
      height:Number(height || 0),
      source:String(source || ''),
      depth:Number(depth || 0),
      mediaType:String(mediaType || '')
    });
  }

  function scan(attachment, prefix, depth) {
    attachment =
      attachment && typeof attachment === 'object'
        ? attachment
        : {};

    var media =
      attachment.media &&
      typeof attachment.media === 'object'
        ? attachment.media
        : {};

    var image =
      media.image &&
      typeof media.image === 'object'
        ? media.image
        : {};

    var mediaType = String(
      attachment.media_type ||
      attachment.type ||
      ''
    ).toUpperCase();

    add(
      image.src,
      image.width,
      image.height,
      prefix + '_media',
      depth,
      mediaType
    );

    var subs =
      attachment.subattachments &&
      Array.isArray(
        attachment.subattachments.data
      )
        ? attachment.subattachments.data
        : [];

    subs.forEach(function (sub, index) {
      scan(
        sub,
        prefix + '_sub_' + index,
        Number(depth || 0) + 1
      );
    });
  }

  var attachments =
    payload.attachments &&
    Array.isArray(payload.attachments.data)
      ? payload.attachments.data
      : [];

  attachments.forEach(function (attachment, index) {
    scan(
      attachment,
      'attachment_' + index,
      0
    );
  });

  /*
   * Nếu attachment API trả nhiều ảnh thì không đưa full_picture
   * vào gallery vì full_picture có thể là avatar/page image.
   */
  if (!output.length) {
    add(
      payload.full_picture,
      0,
      0,
      'full_picture_fallback',
      0,
      ''
    );
  }

  /*
   * Sắp xếp:
   * - ảnh có kích thước thật lớn trước
   * - nếu bằng nhau, giữ thứ tự gần root trước
   * Không loại ảnh vuông vì creative sản phẩm có thể là 1:1.
   */
  output.sort(function (a, b) {
    var areaA =
      Number(a.width || 0) *
      Number(a.height || 0);

    var areaB =
      Number(b.width || 0) *
      Number(b.height || 0);

    if (areaA !== areaB) {
      return areaB - areaA;
    }

    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }

    return 0;
  });

  /*
   * Nếu có ít nhất một ảnh lớn, loại các ảnh cực nhỏ <=180x180
   * thường là avatar/icon, nhưng chỉ khi dimensions thực sự biết.
   */
  var hasLarge =
    output.some(function (item) {
      return (
        Number(item.width || 0) >= 400 ||
        Number(item.height || 0) >= 400
      );
    });

  if (hasLarge) {
    var filtered =
      output.filter(function (item) {
        var width =
          Number(item.width || 0);
        var height =
          Number(item.height || 0);

        if (!width || !height) return true;

        return !(
          width <= 180 &&
          height <= 180
        );
      });

    if (filtered.length) {
      output = filtered;
    }
  }

  return output;
}

function collectCreativeMediaGalleryV223_(
  creative,
  selectedMedia
) {
  creative =
    creative && typeof creative === 'object'
      ? creative
      : {};

  selectedMedia =
    selectedMedia &&
    typeof selectedMedia === 'object'
      ? selectedMedia
      : {};

  var output = [];
  var seen = {};

  function add(item) {
    item =
      item && typeof item === 'object'
        ? item
        : {};

    var url =
      String(item.url || '').trim();

    if (!url || seen[url]) return;

    seen[url] = true;

    output.push({
      url:url,
      width:Number(item.width || 0),
      height:Number(item.height || 0),
      source:String(item.source || '')
    });
  }

  add(selectedMedia);

  /*
   * Video chỉ có một thumbnail đại diện; không trộn ảnh post/avatar
   * vào gallery video.
   */
  if (
    String(selectedMedia.kind || '') === 'video'
  ) {
    return output;
  }

  (
    Array.isArray(
      creative._v223_adimage_gallery
    )
      ? creative._v223_adimage_gallery
      : []
  ).forEach(add);

  collectDirectCreativeGalleryV223_(
    creative
  ).forEach(add);

  (
    Array.isArray(
      creative._v223_post_gallery
    )
      ? creative._v223_post_gallery
      : []
  ).forEach(add);

  return output.slice(0, 20);
}

function hydrateVideoNodeFallbackV223_(
  adsMetadata,
  token,
  label
) {
  adsMetadata =
    Array.isArray(adsMetadata)
      ? adsMetadata
      : [];

  var byVideo = {};
  var ids = [];

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var videoIds =
      Array.isArray(creative._v221_video_ids)
        ? creative._v221_video_ids
        : collectCreativeVideoIdsV221_(
            creative
          );

    videoIds.forEach(function (videoId) {
      videoId =
        String(videoId || '').trim();

      if (!videoId) return;

      if (!byVideo[videoId]) {
        byVideo[videoId] = [];
        ids.push(videoId);
      }

      byVideo[videoId].push(ad);
    });
  });

  if (!ids.length) return adsMetadata;

  var chunkSize = 30;

  for (
    var offset = 0;
    offset < ids.length;
    offset += chunkSize
  ) {
    var chunk =
      ids.slice(
        offset,
        offset + chunkSize
      );

    var url =
      'https://graph.facebook.com/' +
      META_API_VERSION +
      '/?ids=' +
      encodeURIComponent(
        chunk.join(',')
      ) +
      '&fields=' +
      encodeURIComponent(
        'source,picture,permalink_url,post_id'
      );

    var response =
      UrlFetchApp.fetch(
        url,
        {
          method:'get',
          headers:{
            Authorization:'Bearer ' + token
          },
          muteHttpExceptions:true
        }
      );

    var payload =
      parseMetaResponse_(
        response,
        label +
        ' lô ' +
        (Math.floor(offset / chunkSize) + 1)
      );

    Object.keys(payload || {})
      .forEach(function (videoId) {
        var video =
          payload[videoId];

        if (
          !video ||
          video.error
        ) return;

        (byVideo[videoId] || [])
          .forEach(function (ad) {
            if (
              !ad ||
              !ad.creative ||
              typeof ad.creative !== 'object'
            ) return;

            var creative =
              ad.creative;

            if (
              !creative
                ._v221_video_thumbnail_url &&
              video.picture
            ) {
              creative
                ._v223_video_picture =
                  String(
                    video.picture
                  ).trim();
            }

            if (
              video.source &&
              !creative
                ._v320_video_source_url
            ) {
              creative
                ._v320_video_source_url =
                  String(video.source).trim();
            }

            if (
              videoId &&
              !creative
                ._v320_video_id
            ) {
              creative
                ._v320_video_id =
                  String(videoId).trim();
            }

            if (
              video.permalink_url &&
              !creative
                ._v223_video_permalink
            ) {
              creative
                ._v223_video_permalink =
                  String(
                    video.permalink_url
                  ).trim();
            }

            if (
              video.post_id &&
              !creative
                ._v223_video_post_id
            ) {
              creative
                ._v223_video_post_id =
                  String(
                    video.post_id
                  ).trim();
            }
          });
      });
  }

  return adsMetadata;
}

function collectCreativeVideoIdsV221_(creative) {
  creative =
    creative && typeof creative === 'object'
      ? creative
      : {};

  var output = [];
  var seen = {};

  function add(value) {
    var id = String(value || '').trim();
    if (!/^\d+$/.test(id) || seen[id]) return;
    seen[id] = true;
    output.push(id);
  }

  function scan(value, depth) {
    if (!value || depth > 8) return;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        scan(item, depth + 1);
      });
      return;
    }

    if (typeof value !== 'object') return;

    Object.keys(value).forEach(function (key) {
      var child = value[key];

      if (
        key === 'video_id' ||
        key === 'videoId'
      ) {
        add(child);
      }

      if (
        typeof child === 'object' &&
        child !== null
      ) {
        scan(child, depth + 1);
      }
    });
  }

  add(creative.video_id);
  scan(creative.object_story_spec, 0);
  scan(creative.asset_feed_spec, 0);

  return output;
}

function chooseBestVideoThumbnailV221_(rows) {
  rows = Array.isArray(rows) ? rows : [];

  if (!rows.length) return null;

  var normalized = rows
    .map(function (row) {
      return {
        url:String(
          row && (
            row.uri ||
            row.url ||
            ''
          ) || ''
        ).trim(),
        width:toNumber_(row && row.width),
        height:toNumber_(row && row.height),
        preferred:row && row.is_preferred === true,
        scale:toNumber_(row && row.scale)
      };
    })
    .filter(function (row) {
      return !!row.url;
    });

  if (!normalized.length) return null;

  normalized.sort(function (a, b) {
    if (a.preferred !== b.preferred) {
      return a.preferred ? -1 : 1;
    }

    var areaA =
      Number(a.width || 0) *
      Number(a.height || 0);

    var areaB =
      Number(b.width || 0) *
      Number(b.height || 0);

    if (areaA !== areaB) {
      return areaB - areaA;
    }

    return Number(b.scale || 0) -
      Number(a.scale || 0);
  });

  return normalized[0];
}

function hydrateVideoThumbnailsV221_(
  adsMetadata,
  token,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  var byVideo = {};
  var videoIds = [];

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var ids =
      collectCreativeVideoIdsV221_(
        creative
      );

    creative._v221_video_ids = ids.slice();

    ids.forEach(function (videoId) {
      if (!byVideo[videoId]) {
        byVideo[videoId] = [];
        videoIds.push(videoId);
      }

      byVideo[videoId].push(ad);
    });
  });

  videoIds.forEach(function (videoId) {
    try {
      var url = buildMetaUrl_(
        videoId + '/thumbnails',
        {
          fields:
            'uri,width,height,is_preferred,scale',
          limit:100
        }
      );

      var rows = fetchMetaPages_(
        url,
        token,
        label + ' video ' + videoId
      );

      var best =
        chooseBestVideoThumbnailV221_(
          rows
        );

      if (!best || !best.url) return;

      (byVideo[videoId] || [])
        .forEach(function (ad) {
          if (
            !ad ||
            !ad.creative ||
            typeof ad.creative !== 'object'
          ) return;

          /*
           * Nếu một creative có nhiều video asset,
           * giữ thumbnail có diện tích lớn hơn.
           */
          var oldArea =
            Number(
              ad.creative
                ._v221_video_thumbnail_width ||
              0
            ) *
            Number(
              ad.creative
                ._v221_video_thumbnail_height ||
              0
            );

          var newArea =
            Number(best.width || 0) *
            Number(best.height || 0);

          if (
            ad.creative
              ._v221_video_thumbnail_url &&
            oldArea > newArea
          ) return;

          ad.creative
            ._v221_video_thumbnail_url =
              String(best.url || '');

          ad.creative
            ._v221_video_thumbnail_width =
              Number(best.width || 0);

          ad.creative
            ._v221_video_thumbnail_height =
              Number(best.height || 0);

          ad.creative
            ._v221_video_thumbnail_preferred =
              best.preferred === true;

          ad.creative
            ._v221_video_thumbnail_video_id =
              String(videoId);
        });
    } catch (error) {
      console.warn(
        label +
        ' không đọc được thumbnail video ' +
        videoId +
        ': ' +
        error.message
      );
    }
  });

  return adsMetadata;
}

function inferMediaDimensionsFromUrlV221_(
  url
) {
  url = String(url || '');

  var matches = url.match(
    /(?:^|[_?=&-])(?:s|p)?(\d{2,4})x(\d{2,4})(?:[_?=&-]|$)/i
  );

  if (!matches) {
    return {
      width:0,
      height:0
    };
  }

  return {
    width:Number(matches[1] || 0),
    height:Number(matches[2] || 0)
  };
}

function extractBestFacebookPostMediaV221_(
  payload
) {
  payload =
    payload && typeof payload === 'object'
      ? payload
      : {};

  var candidates = [];

  function add(
    url,
    width,
    height,
    source,
    mediaType,
    depth
  ) {
    url = String(url || '').trim();
    if (!url) return;

    var inferred =
      inferMediaDimensionsFromUrlV221_(
        url
      );

    width =
      toNumber_(width) ||
      Number(inferred.width || 0);

    height =
      toNumber_(height) ||
      Number(inferred.height || 0);

    candidates.push({
      url:url,
      width:width,
      height:height,
      source:String(source || ''),
      mediaType:String(mediaType || ''),
      depth:Number(depth || 0)
    });
  }

  function scan(
    attachment,
    prefix,
    depth
  ) {
    attachment =
      attachment &&
      typeof attachment === 'object'
        ? attachment
        : {};

    var media =
      attachment.media &&
      typeof attachment.media === 'object'
        ? attachment.media
        : {};

    var image =
      media.image &&
      typeof media.image === 'object'
        ? media.image
        : {};

    var mediaType = String(
      attachment.media_type ||
      attachment.type ||
      ''
    ).toUpperCase();

    add(
      image.src,
      image.width,
      image.height,
      prefix + '_media_image',
      mediaType,
      depth
    );

    var subs =
      attachment.subattachments &&
      Array.isArray(
        attachment.subattachments.data
      )
        ? attachment.subattachments.data
        : [];

    subs.forEach(
      function (sub, index) {
        scan(
          sub,
          prefix + '_sub_' + index,
          Number(depth || 0) + 1
        );
      }
    );
  }

  var attachments =
payload.attachments &&
    Array.isArray(payload.attachments.data)
      ? payload.attachments.data
      : [];

  attachments.forEach(
    function (attachment, index) {
      scan(
        attachment,
        'attachment_' + index,
        0
      );
    }
  );

  if (candidates.length) {
    /*
     * V221 FIX QUAN TRỌNG:
     * Không còn cộng 1–2 tỷ điểm chỉ vì subattachment.
     * Ưu tiên diện tích ảnh thực; subattachment chỉ là tie-break nhỏ.
     */
    candidates.sort(function (a, b) {
      var areaA =
        Number(a.width || 0) *
        Number(a.height || 0);

      var areaB =
        Number(b.width || 0) *
        Number(b.height || 0);

      if (areaA !== areaB) {
        return areaB - areaA;
      }

      /*
       * Nếu API không trả kích thước, ưu tiên attachment
       * gần root hơn để tránh avatar/logo nested.
       */
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }

      return 0;
    });

    var hasLarge =
      candidates.some(function (item) {
        return (
          Number(item.width || 0) >= 400 ||
          Number(item.height || 0) >= 400
        );
      });

    if (hasLarge) {
      var largeOnly =
        candidates.filter(function (item) {
          return !(
            Number(item.width || 0) > 0 &&
            Number(item.height || 0) > 0 &&
            Number(item.width || 0) <= 220 &&
            Number(item.height || 0) <= 220
          );
        });

      if (largeOnly.length) {
        return largeOnly[0];
      }
    }

    return candidates[0];
  }

  /*
   * full_picture chỉ dùng khi không có attachment image.
   * Nó không được cạnh tranh với attachment nữa.
   */
  var fullPicture =
    String(
      payload.full_picture || ''
    ).trim();

  if (fullPicture) {
    var size =
      inferMediaDimensionsFromUrlV221_(
        fullPicture
      );

    return {
      url:fullPicture,
      width:Number(size.width || 0),
      height:Number(size.height || 0),
      source:'full_picture_fallback',
      mediaType:'',
      depth:0
    };
  }

  return null;
}

function collectFacebookPostIdsV221_(
  creative
) {
  creative =
    creative && typeof creative === 'object'
      ? creative
      : {};

  var output = [];
  var seen = {};

  function add(id, source, priority) {
    id = String(id || '').trim();
    if (!id || seen[id]) return;

    seen[id] = true;
    output.push({
      id:id,
      source:source,
      priority:Number(priority || 0)
    });
  }

  /*
   * source_facebook_post_id là original post nếu creative dùng bài có sẵn.
   * Ưu tiên nó trước effective story.
   */
  add(
    creative.source_facebook_post_id,
    'source_facebook_post_id',
    30
  );

  add(
    creative.object_story_id,
    'object_story_id',
    20
  );

  add(
    creative.effective_object_story_id,
    'effective_object_story_id',
    10
  );

  return output.sort(function (a, b) {
    return b.priority - a.priority;
  });
}

function hydrateFacebookPostMediaV221_(
  adsMetadata,
  token,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  var byPost = {};
  var ids = [];

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var posts =
      collectFacebookPostIdsV221_(
        creative
      );

    creative._v221_post_candidates =
      posts.slice();

    posts.forEach(function (post) {
      if (!byPost[post.id]) {
        byPost[post.id] = [];
        ids.push(post.id);
      }

      byPost[post.id].push({
        ad:ad,
        priority:post.priority,
        source:post.source
      });
    });
  });

  if (!ids.length) return adsMetadata;

  var chunkSize = 30;

  for (
    var offset = 0;
    offset < ids.length;
    offset += chunkSize
  ) {
    var chunk =
      ids.slice(
        offset,
        offset + chunkSize
      );

    var url =
      'https://graph.facebook.com/' +
      META_API_VERSION +
      '/?ids=' +
      encodeURIComponent(
        chunk.join(',')
      ) +
      '&fields=' +
      encodeURIComponent(
        'full_picture,permalink_url,attachments{media_type,type,media,subattachments{media_type,type,media,url,target,title,description},url,target,title,description}'
      );

    var response = UrlFetchApp.fetch(
      url,
      {
        method:'get',
        headers:{
          Authorization:'Bearer ' + token
        },
        muteHttpExceptions:true
      }
    );

    var payload =
      parseMetaResponse_(
        response,
        label +
        ' lô ' +
        (Math.floor(offset / chunkSize) + 1)
      );

    Object.keys(payload || {})
      .forEach(function (postId) {
        var post = payload[postId];

        if (
          !post ||
          post.error
        ) return;

        var gallery =
          extractFacebookPostGalleryV223_(
            post
          );

        var best =
          gallery.length
            ? gallery[0]
            : extractBestFacebookPostMediaV221_(
                post
              );

        (byPost[postId] || [])
          .forEach(function (link) {
            var ad = link.ad;

            if (
              !ad ||
              !ad.creative ||
              typeof ad.creative !== 'object'
            ) return;

            var creative = ad.creative;

            var currentPriority =
              Number(
                creative
                  ._v221_post_media_priority ||
                -1
              );

            if (
              currentPriority >
              Number(link.priority || 0)
            ) return;

            if (post.permalink_url) {
              creative
                ._v221_post_permalink =
                  String(
                    post.permalink_url
                  ).trim();
            }

            if (
              gallery &&
              gallery.length
            ) {
              creative
                ._v223_post_gallery =
                  gallery.map(function (item) {
                    return {
                      url:String(item.url || ''),
                      width:Number(item.width || 0),
                      height:Number(item.height || 0),
                      source:String(
                        link.source +
                        ':' +
                        item.source
                      )
                    };
                  });
            }

            if (
              best &&
              best.url
            ) {
              creative
                ._v221_post_media_url =
                  String(best.url);

              creative
                ._v221_post_media_width =
                  Number(best.width || 0);

              creative
                ._v221_post_media_height =
                  Number(best.height || 0);

              creative
                ._v221_post_media_source =
                  String(
                    link.source +
                    ':' +
                    best.source
                  );

              creative
                ._v221_post_media_priority =
                  Number(link.priority || 0);
            }
          });
      });
  }

  return adsMetadata;
}

function hydrateInstagramMediaV221_(
  adsMetadata,
  token,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  var byMedia = {};
  var ids = [];

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var candidates = [
      creative.source_instagram_media_id,
      creative.effective_instagram_media_id
    ];

    candidates.forEach(
      function (mediaId) {
        mediaId =
          String(mediaId || '').trim();

        if (!mediaId) return;

        if (!byMedia[mediaId]) {
          byMedia[mediaId] = [];
          ids.push(mediaId);
        }

        byMedia[mediaId].push(ad);
      }
    );
  });

  if (!ids.length) return adsMetadata;

  var chunkSize = 30;

  for (
    var offset = 0;
    offset < ids.length;
    offset += chunkSize
  ) {
    var chunk =
      ids.slice(
        offset,
        offset + chunkSize
      );

    var url =
      'https://graph.facebook.com/' +
      META_API_VERSION +
      '/?ids=' +
      encodeURIComponent(
        chunk.join(',')
      ) +
      '&fields=' +
      encodeURIComponent(
        'media_type,media_url,thumbnail_url,permalink'
      );

    var response = UrlFetchApp.fetch(
      url,
      {
        method:'get',
        headers:{
          Authorization:'Bearer ' + token
        },
        muteHttpExceptions:true
      }
    );

    var payload =
      parseMetaResponse_(
        response,
        label +
        ' lô ' +
        (Math.floor(offset / chunkSize) + 1)
      );

    Object.keys(payload || {})
      .forEach(function (mediaId) {
        var media = payload[mediaId];

        if (
          !media ||
          media.error
        ) return;

        var mediaUrl =
          firstNonEmptyMetaTextV215_([
            media.media_url,
            media.thumbnail_url
          ]);

        (byMedia[mediaId] || [])
          .forEach(function (ad) {
            if (
              !ad ||
              !ad.creative ||
              typeof ad.creative !== 'object'
            ) return;

            if (
              mediaUrl &&
              !ad.creative
                ._v221_instagram_media_url
            ) {
              ad.creative
                ._v221_instagram_media_url =
                  String(mediaUrl);
            }

            if (
              media.permalink &&
              !ad.creative
                ._v221_instagram_permalink
            ) {
              ad.creative
                ._v221_instagram_permalink =
                  String(
                    media.permalink
                  );
            }

            ad.creative
              ._v221_instagram_media_type =
                String(
                  media.media_type || ''
                );
          });
      });
  }

  return adsMetadata;
}

function selectPrimaryCreativeMediaV221_(
  creative
) {
  creative =
    creative && typeof creative === 'object'
      ? creative
      : {};

  var direct =
    getDirectCreativeImageV219_(
      creative
    );

  var videoIds =
    Array.isArray(
      creative._v221_video_ids
    )
      ? creative._v221_video_ids
      : collectCreativeVideoIdsV221_(
          creative
        );

  var imageHashes =
    collectCreativeImageHashesV217_(
      creative
    );

  var story =
    creative.object_story_spec &&
    typeof creative.object_story_spec === 'object'
      ? creative.object_story_spec
      : {};

  var videoData =
    story.video_data &&
    typeof story.video_data === 'object'
      ? story.video_data
      : {};

  var explicitVideo =
    !!(
      creative.video_id ||
      videoData.video_id
    );

  var explicitImage =
    !!(
      creative.image_hash ||
      creative.image_url ||
      (
        story.link_data &&
        (
          story.link_data.image_hash ||
          story.link_data.picture
        )
      )
    );

  var candidates = [];

  function add(
    url,
    width,
    height,
    source,
    priority,
    kind
  ) {
    url = String(url || '').trim();
    if (!url) return;

    candidates.push({
      url:url,
      width:Number(width || 0),
      height:Number(height || 0),
      source:String(source || ''),
      priority:Number(priority || 0),
      kind:String(kind || 'image')
    });
  }

  /*
   * VIDEO:
   * preferred thumbnail edge -> video.picture -> creative.thumbnail_url.
   * Không dùng avatar/post image làm nguồn đầu của video.
   */
  if (explicitVideo || videoIds.length) {
    add(
      creative._v221_video_thumbnail_url,
      creative._v221_video_thumbnail_width,
      creative._v221_video_thumbnail_height,
      'video_thumbnail',
      1200,
      'video'
    );

    add(
      creative._v223_video_picture,
      0,
      0,
      'video_picture',
      1150,
      'video'
    );

    add(
      creative.thumbnail_url,
      0,
      0,
      'video_creative_thumbnail',
      1100,
      'video'
    );
  }

  /*
   * IMAGE/CAROUSEL/FLEXIBLE
   */
  if (
    explicitImage ||
    imageHashes.length
  ) {
    add(
      creative._v217_highres_image_url,
      creative._v217_highres_width,
      creative._v217_highres_height,
      'adimage_hash',
      1000,
      'image'
    );
  }

  add(
    direct,
    0,
    0,
    'object_story_asset',
    900,
    'image'
  );

  add(
    creative.image_url,
    0,
    0,
    'creative_image_url',
    880,
    'image'
  );

  add(
    creative._v221_post_media_url,
    creative._v221_post_media_width,
    creative._v221_post_media_height,
    'facebook_post_media:' +
      String(
        creative._v221_post_media_source ||
        ''
      ),
    820,
    'image'
  );

  /*
   * rendered thumbnail/avatar chỉ fallback rất thấp cho IMAGE.
   * Với video đã có fallback thumbnail riêng phía trên.
   */
  if (!(explicitVideo || videoIds.length)) {
    add(
      creative._v220_rendered_thumbnail_url,
      0,
      0,
      'rendered_thumbnail_fallback',
      150,
      'image'
    );

    add(
      creative.thumbnail_url,
      0,
      0,
      'creative_thumbnail_fallback',
      100,
      'image'
    );
  }

  if (!candidates.length) {
    return {
      url:'',
      width:0,
      height:0,
      source:'none',
      kind:'none',
      videoIds:videoIds,
      imageHashes:imageHashes
    };
  }

  candidates.sort(function (a, b) {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    var areaA =
      Number(a.width || 0) *
      Number(a.height || 0);

    var areaB =
      Number(b.width || 0) *
      Number(b.height || 0);

    return areaB - areaA;
  });

  var best = candidates[0];

  return {
    url:best.url,
    width:best.width,
    height:best.height,
    source:best.source,
    kind:best.kind,
    videoIds:videoIds,
    imageHashes:imageHashes
  };
}

function extractMetaCreativePreviewV215_(creative) {
  creative = creative && typeof creative === 'object' ? creative : {};

  var story = creative.object_story_spec && typeof creative.object_story_spec === 'object'
    ? creative.object_story_spec
    : {};
  var linkData = story.link_data && typeof story.link_data === 'object'
    ? story.link_data
    : {};
  var videoData = story.video_data && typeof story.video_data === 'object'
    ? story.video_data
    : {};
  var templateData = story.template_data && typeof story.template_data === 'object'
    ? story.template_data
    : {};

  var attachmentSource = Array.isArray(linkData.child_attachments)
    ? linkData.child_attachments
    : (Array.isArray(templateData.child_attachments)
        ? templateData.child_attachments
        : []);

  var attachments = attachmentSource.map(function (attachment) {
    attachment = attachment && typeof attachment === 'object' ? attachment : {};
    return {
      name: firstNonEmptyMetaTextV215_([attachment.name]),
      description: firstNonEmptyMetaTextV215_([attachment.description]),
      link: firstNonEmptyMetaTextV215_([attachment.link]),
      picture: firstNonEmptyMetaTextV215_([attachment.picture, attachment.image_url])
    };
  }).filter(function (attachment) {
    return attachment.name || attachment.description || attachment.link || attachment.picture;
  });

  /*
   * V222:
   * Biến này được trả ra ở direct_creative_image_url và phải tồn tại
   * trong đúng scope của hàm preview. V221 đã refactor bộ chọn media
   * nhưng bỏ sót khai báo này, gây ReferenceError khi build row.
   */
  var directCreativeImage =
    getDirectCreativeImageV219_(
      creative
    );

  var selectedMedia =
    selectPrimaryCreativeMediaV221_(
      creative
    );

  var primaryMedia =
    String(
      selectedMedia.url || ''
    ).trim();

  var mediaGallery =
    collectCreativeMediaGalleryV223_(
      creative,
      selectedMedia
    );

  var previewType =
    String(selectedMedia.kind || '') === 'video'
      ? 'video'
      : (
          mediaGallery.length > 1
            ? 'carousel'
            : (
                primaryMedia
                  ? 'image'
                  : 'text'
              )
        );


  var body = firstNonEmptyMetaTextV215_([
    videoData.message,
    linkData.message,
    templateData.message,
    creative.body
  ]);

  var title = firstNonEmptyMetaTextV215_([
    videoData.title,
    linkData.name,
    templateData.name,
    creative.title,
    creative.name
  ]);

  var description = firstNonEmptyMetaTextV215_([
    videoData.link_description,
    linkData.description,
    templateData.description
  ]);

  var cta = firstNonEmptyMetaTextV215_([
    videoData.call_to_action && videoData.call_to_action.type,
    linkData.call_to_action && linkData.call_to_action.type,
    templateData.call_to_action && templateData.call_to_action.type,
    creative.call_to_action_type
  ]);

  var destination = firstNonEmptyMetaTextV215_([
    videoData.call_to_action && videoData.call_to_action.value && videoData.call_to_action.value.link,
    linkData.link,
    templateData.link,
    creative.link_url
  ]);

  var pageId = firstNonEmptyMetaTextV215_([story.page_id]);
  var storyId = firstNonEmptyMetaTextV215_([creative.effective_object_story_id]);
  var postUrl = firstNonEmptyMetaTextV215_([
    creative._v221_post_permalink,
    creative._v223_video_permalink,
    creative._v218_story_permalink,
    buildMetaPostUrlV215_(storyId, pageId)
  ]);

  return {
    creative_id: String(creative.id || ''),
    creative_name: String(creative.name || ''),
    preview_type: previewType,
    image_url: String(creative.image_url || ''),
    thumbnail_url: String(creative.thumbnail_url || ''),
    rendered_thumbnail_url: String(creative._v220_rendered_thumbnail_url || ''),
    rendered_thumbnail_requested_width: Number(creative._v220_rendered_thumbnail_requested_width || 0),
    rendered_thumbnail_requested_height: Number(creative._v220_rendered_thumbnail_requested_height || 0),
    story_image_url: String(creative._v218_story_image_url || ''),
    story_image_width: Number(creative._v218_story_image_width || 0),
    story_image_height: Number(creative._v218_story_image_height || 0),
    story_image_source: String(creative._v218_story_image_source || ''),
    story_permalink: String(creative._v218_story_permalink || ''),
    direct_creative_image_url: String(directCreativeImage || ''),
    highres_image_url: String(creative._v217_highres_image_url || ''),
    highres_image_hash: String(creative._v217_highres_image_hash || ''),
    highres_width: Number(creative._v217_highres_width || 0),
    highres_height: Number(creative._v217_highres_height || 0),
    primary_media_url: primaryMedia,
    primary_media_source: String(selectedMedia.source || ''),
    primary_media_kind: String(selectedMedia.kind || ''),
    primary_media_width: Number(selectedMedia.width || 0),
    primary_media_height: Number(selectedMedia.height || 0),
    media_gallery: mediaGallery,
    video_thumbnail_url: String(creative._v221_video_thumbnail_url || ''),
    video_thumbnail_width: Number(creative._v221_video_thumbnail_width || 0),
    video_thumbnail_height: Number(creative._v221_video_thumbnail_height || 0),
    video_source_url: String(creative._v320_video_source_url || ''),
    video_permalink_url: String(creative._v223_video_permalink || ''),
    video_id: String(creative._v320_video_id || creative._v221_video_thumbnail_video_id || ''),
    facebook_post_media_url: String(creative._v221_post_media_url || ''),
    facebook_post_media_source: String(creative._v221_post_media_source || ''),
    instagram_media_url: '',
    body: body,
    title: title,
    description: description,
    cta: cta,
    destination_url: destination,
    post_url: postUrl,
    page_id: pageId,
    effective_object_story_id: storyId,
    object_type: String(creative.object_type || ''),
    attachments: attachments
  };
}

function buildMetaAdsByAdset_(adInsights, metadataById, from, to, syncedAt) {
  const grouped = {};
  const insightsByAdId = {};

  (Array.isArray(adInsights) ? adInsights : []).forEach(function (insight) {
    const adId = String(insight.ad_id || '');
    if (adId) insightsByAdId[adId] = insight;
  });

  const adIds = {};
  Object.keys(metadataById || {}).forEach(function (adId) {
    adIds[String(adId)] = true;
  });
  Object.keys(insightsByAdId).forEach(function (adId) {
    adIds[String(adId)] = true;
  });

  Object.keys(adIds).forEach(function (adId) {
    const insight = insightsByAdId[adId] || {};
    const metadata = (metadataById || {})[adId] || {};
    const metadataAdset =
      metadata.adset && typeof metadata.adset === 'object'
        ? metadata.adset
        : {};
    const metadataCampaign =
      metadata.campaign && typeof metadata.campaign === 'object'
        ? metadata.campaign
        : {};
    const metadataCreative =
      metadata.creative && typeof metadata.creative === 'object'
        ? metadata.creative
        : {};
    const creativePreview = extractMetaCreativePreviewV215_(metadataCreative);

    const adsetId = String(
      metadataAdset.id ||
      insight.adset_id ||
      ''
    );

    if (!adsetId) return;

    const createdDate = metaDateOnly_(metadata.created_time);
    if (!insightsByAdId[adId] && createdDate && createdDate > to) return;

    const messages = getActionValue_(
      insight.actions,
      'onsite_conversion.messaging_conversation_started_7d'
    );

    const purchases = getActionValue_(
      insight.actions,
      'omni_purchase'
    );

    const costPerMessage = getActionValue_(
      insight.cost_per_action_type,
      'onsite_conversion.messaging_conversation_started_7d'
    );

    const costPerPurchase = getActionValue_(
      insight.cost_per_action_type,
      'omni_purchase'
    );

    const linkMetrics = getMetaLinkCtrMetrics_(insight);
    const spend = toNumber_(insight.spend);
    const impressions = linkMetrics.impressions;
    const reach = toNumber_(insight.reach);
    const clicks = toNumber_(insight.clicks);
    const hasDeliveryData = (
      spend > 0 ||
      impressions > 0 ||
      reach > 0 ||
      clicks > 0 ||
      linkMetrics.linkClicks > 0 ||
      messages > 0 ||
      purchases > 0
    );

    const deliveryStatus = resolveMetaDeliveryStatus_(
      metadata,
      hasDeliveryData
    );

    const row = {
      adId: adId,
      adName:
        metadata.name ||
        insight.ad_name ||
        'Bài quảng cáo ' + adId,
      adsetId: adsetId,
      adsetName:
        metadataAdset.name ||
        insight.adset_name ||
        '',
      campaignId:
        metadataCampaign.id ||
        insight.campaign_id ||
        '',
      campaignName:
        metadataCampaign.name ||
        insight.campaign_name ||
        '',
      status: deliveryStatus || '',
      delivery_status: deliveryStatus || '',
      effective_status: metadata.effective_status || '',
      configured_status: metadata.status || '',
      raw_effective_status: metadata.effective_status || '',
      raw_configured_status: metadata.status || '',
      deleted_from_meta: metadata.deleted_from_meta === true,
      spend: spend,
      result: purchases,
      messages: messages,
      ctr: linkMetrics.ctr,
ctrType: linkMetrics.ctrType,
      linkClicks: linkMetrics.linkClicks,
      impressions: impressions,
      reach: reach,
      clicks: clicks,
      freq: toNumber_(insight.frequency),
      rawCpm: costPerMessage,
      rawCpa: costPerPurchase,
      has_insights: !!insightsByAdId[adId],
      has_delivery_data: hasDeliveryData,
      data_state: hasDeliveryData ? 'delivered' : 'configured_only',
      report_start: insight.date_start || from,
      report_end: insight.date_stop || to,
      report_start_iso: insight.date_start || from,
      report_end_iso: insight.date_stop || to,
      created_time: metadata.created_time || '',
      updated_time: metadata.updated_time || '',
      syncedAt: syncedAt || '',
      creative_id: creativePreview.creative_id,
      creative_name: creativePreview.creative_name,
      preview_type: creativePreview.preview_type,
      image_url: creativePreview.image_url,
      thumbnail_url: creativePreview.thumbnail_url,
      rendered_thumbnail_url: creativePreview.rendered_thumbnail_url,
      rendered_thumbnail_requested_width: creativePreview.rendered_thumbnail_requested_width,
      rendered_thumbnail_requested_height: creativePreview.rendered_thumbnail_requested_height,
      story_image_url: creativePreview.story_image_url,
      story_image_width: creativePreview.story_image_width,
      story_image_height: creativePreview.story_image_height,
      story_image_source: creativePreview.story_image_source,
      story_permalink: creativePreview.story_permalink,
      direct_creative_image_url: creativePreview.direct_creative_image_url,
      highres_image_url: creativePreview.highres_image_url,
      highres_image_hash: creativePreview.highres_image_hash,
      highres_width: creativePreview.highres_width,
      highres_height: creativePreview.highres_height,
      fanpage_post_found: !!metadataCreative._v321_fanpage_post_found,
      fanpage_post_id: String(metadataCreative._v321_fanpage_post_id || ''),
      fanpage_page_id: String(metadataCreative._v321_fanpage_page_id || ''),
      fanpage_page_name: String(metadataCreative._v321_fanpage_page_name || ''),
      fanpage_post_message: String(metadataCreative._v321_fanpage_post_message || ''),
      fanpage_post_permalink: String(metadataCreative._v321_fanpage_post_permalink || ''),
      fanpage_post_created_time: String(metadataCreative._v321_fanpage_post_created_time || ''),
      fanpage_media_kind: String(metadataCreative._v321_fanpage_media_kind || ''),
      fanpage_video_id: String(metadataCreative._v321_fanpage_video_id || ''),
      fanpage_video_source_url: String(metadataCreative._v321_fanpage_video_source_url || ''),
      fanpage_video_permalink_url: String(metadataCreative._v321_fanpage_video_permalink_url || ''),
      fanpage_content_source: metadataCreative._v321_fanpage_post_found ? 'facebook_page_api' : '',
      fanpage_content_version: 'V330_R1_EXACT_POST_FIRST_NO_MIXED_BATCH',
      fanpage_error_code: String(metadataCreative._v327_fanpage_error_code || ''),
      fanpage_error_message: String(metadataCreative._v327_fanpage_error_message || ''),
      fanpage_resolution_path: String(metadataCreative._v327_fanpage_resolution_path || ''),
      fanpage_token_source: String(metadataCreative._v327_fanpage_token_source || ''),
      fanpage_attempts: Number(metadataCreative._v327_fanpage_attempts || 0),
      fanpage_candidate_ids: Array.isArray(metadataCreative._v327_fanpage_candidate_ids) ? metadataCreative._v327_fanpage_candidate_ids : [],
      fanpage_media_url: String(metadataCreative._v321_fanpage_media_url || ''),
      fanpage_media_width: Number(metadataCreative._v321_fanpage_media_width || 0),
      fanpage_media_height: Number(metadataCreative._v321_fanpage_media_height || 0),
      fanpage_media_source: String(metadataCreative._v321_fanpage_media_source || ''),
      fanpage_gallery: Array.isArray(metadataCreative._v321_fanpage_gallery) ? metadataCreative._v321_fanpage_gallery : [],
      primary_media_url: String(metadataCreative._v310_fanpage_original_image || metadataCreative._v309_fanpage_image || metadataCreative._v221_post_media_url || metadataCreative._v218_story_image_url || creativePreview.primary_media_url || ''),
      primary_media_source: String((metadataCreative._v310_fanpage_original_image || metadataCreative._v309_fanpage_image) ? (metadataCreative._v310_fanpage_original_source || metadataCreative._v309_fanpage_source || 'facebook_original') : (metadataCreative._v221_post_media_url ? ('facebook_fanpage_post:' + (metadataCreative._v221_post_media_source || 'attachment')) : (metadataCreative._v218_story_image_url ? (metadataCreative._v218_story_image_source || 'facebook_story') : (creativePreview.primary_media_source || '')))),
      primary_media_kind: creativePreview.primary_media_kind,
      primary_media_width: Number(metadataCreative._v310_fanpage_original_width || metadataCreative._v309_fanpage_width || metadataCreative._v221_post_media_width || metadataCreative._v218_story_image_width || creativePreview.primary_media_width || 0),
      primary_media_height: Number(metadataCreative._v310_fanpage_original_height || metadataCreative._v309_fanpage_height || metadataCreative._v221_post_media_height || metadataCreative._v218_story_image_height || creativePreview.primary_media_height || 0),
      media_gallery: Array.isArray(metadataCreative._v223_post_gallery) && metadataCreative._v223_post_gallery.length ? metadataCreative._v223_post_gallery : creativePreview.media_gallery,
      video_thumbnail_url: creativePreview.video_thumbnail_url,
      video_thumbnail_width: creativePreview.video_thumbnail_width,
      video_thumbnail_height: creativePreview.video_thumbnail_height,
      video_source_url: creativePreview.video_source_url,
      video_permalink_url: creativePreview.video_permalink_url,
      video_id: creativePreview.video_id,
      facebook_post_media_url: creativePreview.facebook_post_media_url,
      facebook_post_media_source: creativePreview.facebook_post_media_source,
      instagram_media_url: creativePreview.instagram_media_url,
      preview_body: creativePreview.body,
      preview_title: creativePreview.title,
      preview_description: creativePreview.description,
      preview_cta: creativePreview.cta,
      preview_destination_url: creativePreview.destination_url,
      preview_post_url: creativePreview.post_url,
      preview_page_id: creativePreview.page_id,
      effective_object_story_id: creativePreview.effective_object_story_id,
      preview_object_type: creativePreview.object_type,
      preview_attachments: creativePreview.attachments
    };

    if (!grouped[adsetId]) grouped[adsetId] = [];
    grouped[adsetId].push(row);
  });

  Object.keys(grouped).forEach(function (adsetId) {
    grouped[adsetId].sort(function (a, b) {
      const aRunning = String(a.status || '').toUpperCase() === 'ACTIVE' ? 1 : 0;
      const bRunning = String(b.status || '').toUpperCase() === 'ACTIVE' ? 1 : 0;
      if (aRunning !== bRunning) return bRunning - aRunning;

      const aDelivered = a.has_delivery_data ? 1 : 0;
      const bDelivered = b.has_delivery_data ? 1 : 0;
      if (aDelivered !== bDelivered) return bDelivered - aDelivered;

      return toNumber_(b.spend) - toNumber_(a.spend);
    });
  });

  return grouped;
}

/**
 * Lấy toàn bộ các trang dữ liệu từ Meta.
 */
function fetchMetaPages_(firstUrl, token, label) {
  let url = firstUrl;
  let pageCount = 0;
  let allRows = [];

  while (url) {
    pageCount++;

    if (pageCount > 50) {
      throw new Error(
        label + ': vượt quá giới hạn 50 trang.'
      );
    }

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token
      },
      muteHttpExceptions: true
    });

    const payload = parseMetaResponse_(
      response,
      label + ' trang ' + pageCount
    );

    if (Array.isArray(payload.data)) {
      allRows = allRows.concat(payload.data);
    }

    url =
      payload.paging &&
      payload.paging.next
        ? payload.paging.next
        : '';
  }

  return allRows;
}

/**
 * Kiểm tra phản hồi Meta, không làm lộ token.
 */
function parseMetaResponse_(response, label) {
  const statusCode = response.getResponseCode();
  const content = response.getContentText();

  let payload;

  try {
    payload = JSON.parse(content);
  } catch (error) {
    throw new Error(
      label +
      ': Meta trả dữ liệu không phải JSON. HTTP ' +
      statusCode
    );
  }

  if (
    statusCode < 200 ||
    statusCode >= 300 ||
    payload.error
  ) {
    const metaError = payload.error || {};

    throw new Error(
      label +
      ': HTTP ' +
      statusCode +
      ' - ' +
      (
        metaError.message ||
        'Không lấy được dữ liệu từ Meta.'
      )
    );
  }

  return payload;
}

/**
 * Tạo URL Graph API an toàn.
 */
function buildMetaUrl_(path, params) {
  const query = Object.keys(params || {})
    .map(function (key) {
      return (
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(params[key])
      );
    })
    .join('&');

  return (
    'https://graph.facebook.com/' +
    META_API_VERSION +
    '/' +
    path +
    (query ? '?' + query : '')
  );
}

/**
 * Lấy giá trị action đúng loại.
 */
function getActionValue_(actions, actionType) {
  if (!Array.isArray(actions)) {
    return 0;
  }

  const item = actions.find(function (action) {
    return action.action_type === actionType;
  });

  return item ? toNumber_(item.value) : 0;
}


/**
 * Tính CTR nhấp vào liên kết theo đúng công thức Meta:
 * link_click / impressions × 100.
 *
 * Ưu tiên inline_link_clicks do Insights trả trực tiếp.
 * Nếu trường này không có thì dự phòng bằng action_type = link_click.
 */
function getMetaLinkCtrMetrics_(insight) {
  insight = insight || {};

  const impressions = toNumber_(
    insight.impressions
  );

  const directLinkClicks = toNumber_(
    insight.inline_link_clicks
  );

  const actionLinkClicks = getActionValue_(
    insight.actions,
    'link_click'
  );

  const linkClicks =
    directLinkClicks > 0
      ? directLinkClicks
      : actionLinkClicks;

  const directLinkCtr = toNumber_(
    insight.inline_link_click_ctr
  );

  return {
    impressions: impressions,
    linkClicks: linkClicks,
    // Ưu tiên đúng field CTR liên kết do Meta Insights trả về.
    // Chỉ tự tính khi endpoint/row không trả inline_link_click_ctr.
    ctr:
      directLinkCtr > 0
        ? directLinkCtr
        : (impressions > 0 ? (linkClicks / impressions) * 100 : 0),
    ctrType: directLinkCtr > 0 ? 'inline_link_click_ctr' : 'link_click_calculated'
  };
}

/**
 * Tách tên nhân viên và tên quảng cáo.
 */
function normalizeStructuredAdsetCompanyV225_(value) {
  const key = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const map = {
    'NNV':'NNV',
    'NONG NGHIEP VIET':'NNV',
    'VN':'VN',
    'VIET NHAT':'VN',
    'HOA NONG VIET NHAT':'VN',
    'KF':'KF',
    'KINGFARM':'KF',
    'KING FARM':'KF',
    'ABC':'ABC',
    'ABC VIET NAM':'ABC'
  };

  return map[key] || '';
}

/**
 * V225 — Tên nhóm mới:
 * Tên sản phẩm | Họ tên nhân viên | Công ty | QC-Mã SP
 * Ví dụ: 22-22-22+TE | Nguyễn Thị Bé Thảo | VN | QC-OVN89
 * Parser cũ vẫn được giữ làm fallback để dữ liệu lịch sử không hỏng.
 */
function parseAdsetName_(fullName) {
  const text = String(fullName || '').replace(/\s+/g, ' ').trim();

  if (!text) {
    return {
      namingMode:'legacy',
      employee:'',
      adName:'',
      productName:'',
      companyCode:'',
      sku:''
    };
  }

  if (text.indexOf('|') !== -1) {
    const structuredParts = text.split('|').map(function (value) {
      return String(value || '').trim();
    });

    if (structuredParts.length === 4) {
      const productName = structuredParts[0];
      const employee = structuredParts[1].replace(/\s+/g, ' ').trim();
      const companyCode = normalizeStructuredAdsetCompanyV225_(structuredParts[2]);
      const codeMatch = structuredParts[3].match(/^QC\s*-\s*(.+)$/i);
      const sku = codeMatch
        ? String(codeMatch[1] || '').trim().toUpperCase()
        : '';

      if (productName && employee && companyCode && sku) {
        return {
          namingMode:'pipe_qc_v225',
          employee:employee,
          productName:productName,
          companyCode:companyCode,
          sku:sku,
          // Giữ adName dạng Tên sản phẩm (SKU) để frontend/logic gom nhóm cũ
          // vẫn nhận SKU mà không cần thay toàn bộ hệ thống cùng lúc.
          adName:productName + ' (' + sku + ')'
        };
      }
    }
  }

  const parts = text.split(/\s+-\s+/);

  if (parts.length < 2) {
    return {
      namingMode:'legacy',
      employee:text,
      adName:text,
      productName:text,
      companyCode:'',
      sku:''
    };
  }

  const employee = parts.shift().trim();
  const adName = parts.join(' - ').trim();
  return {
    namingMode:'legacy',
    employee:employee,
    adName:adName,
    productName:adName,
    companyCode:'',
    sku:''
  };
}

/**
 * Tính tổng số liệu chính.
 * CTR tổng được tính từ tổng link_click / tổng impressions,
 * không lấy trung bình CTR theo chi tiêu.
 */
function calculateTotals_(rows) {
  const totals = rows.reduce(
    function (total, row) {
      total.spend += toNumber_(row.spend);
      total.messages += toNumber_(row.messages);
      total.purchases += toNumber_(row.result);
      total.impressions += toNumber_(row.impressions);
      total.clicks += toNumber_(row.clicks);
      total.linkClicks += toNumber_(row.linkClicks);

      return total;
    },
    {
      spend: 0,
      messages: 0,
      purchases: 0,
      impressions: 0,
      clicks: 0,
      linkClicks: 0,
      ctr: 0,
      ctrType: 'link_click'
    }
  );

  totals.ctr =
    totals.impressions > 0
      ? (totals.linkClicks / totals.impressions) * 100
      : 0;

  return totals;
}

function toNumber_(value) {
  const number = Number(value);
  return isFinite(number) ? number : 0;
}

/**
 * Ngày đầu tháng hiện tại đến hôm nay.
 */
function getCurrentMonthPeriod_() {
  const today = Utilities.formatDate(
    new Date(),
    META_TIMEZONE,
    'yyyy-MM-dd'
  );

  return {
    from: today.slice(0, 8) + '01',
    to: today
  };
}

function validateDateRange_(from, to) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(String(from || '')) ||
    !datePattern.test(String(to || ''))
  ) {
    throw new Error(
      'Ngày phải có định dạng YYYY-MM-DD.'
    );
  }

  if (from > to) {
    throw new Error(
      'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
    );
  }
}


/* =========================================================
   V318 — FACEBOOK LOGIN FOR BUSINESS / MULTI BUSINESS OAUTH
   App ID: 1719325009086681
   Configuration ID: 1993134122091031
   OAuth được xử lý DUY NHẤT ở Gmail 1 public bridge.
   App Secret KHÔNG nằm trong code. Đặt trong Script Property META_APP_SECRET.
   ========================================================= */
const META_OAUTH_APP_ID_V318 = '1719325009086681';
const META_OAUTH_CONFIG_ID_V318 = '1993134122091031';
const META_OAUTH_CONFIG_ID_NNV_V318 = '1515794753657377';
const META_OAUTH_STATE_TTL_MS_V318 = 20 * 60 * 1000;
const META_SYNC_WORKSPACE_URL_V318 = 'https://script.google.com/macros/s/AKfycbwxZzFrTgebI_vcuXfnaQf4QCCduMISHNi3i-IyCP74nKH7ycneau_eG24z9PjTznWW/exec';
const META_SYNC_GMAIL2_URL_V318 = 'https://script.google.com/macros/s/AKfycbymaP0N39hhuccy42-RNEGRuZ8a1GF1ChrxCkSPJF2zwATZzn6p2iGuS7hdNzX4t0U/exec';

function htmlEscapeMetaV318_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getMetaOAuthSettingsV318_() {
  const props = PropertiesService.getScriptProperties();
  const appId = String(
    props.getProperty('META_APP_ID') || META_OAUTH_APP_ID_V318
  ).trim();
  const configId = String(
    props.getProperty('META_OAUTH_CONFIG_ID') || META_OAUTH_CONFIG_ID_V318
  ).trim();
  const appSecret = String(
    props.getProperty('META_APP_SECRET') || ''
  ).trim();
  const redirectUri = String(
    props.getProperty('META_OAUTH_REDIRECT_URI') ||
    ScriptApp.getService().getUrl() || ''
  ).trim();

  if (!/^\d+$/.test(appId)) throw new Error('META_APP_ID không hợp lệ.');
  if (!/^\d+$/.test(configId)) throw new Error('META_OAUTH_CONFIG_ID không hợp lệ.');
  if (!appSecret) throw new Error('Thiếu META_APP_SECRET trong Script Properties Gmail 1.');
  if (!/^https:\/\//i.test(redirectUri)) {
    throw new Error('Thiếu META_OAUTH_REDIRECT_URI hoặc Web App chưa deploy.');
  }

  return {
    appId: appId,
    configId: configId,
    appSecret: appSecret,
    redirectUri: redirectUri
  };
}

function metaQueryStringV318_(params) {
  return Object.keys(params || {})
    .filter(function (key) {
      return params[key] !== null && params[key] !== undefined && params[key] !== '';
    })
    .map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key]));
    })
    .join('&');
}

function createMetaOAuthStateV318_(company) {
  const code = normalizeMetaCompanyV318_(company);
  const nonce = Utilities.getUuid().replace(/-/g, '');
  const state = code + '_' + nonce;
  PropertiesService.getScriptProperties().setProperty(
    'META_OAUTH_PENDING_' + nonce,
    JSON.stringify({
      company: code,
      state: state,
      createdAt: Date.now()
    })
  );
  return state;
}

function consumeMetaOAuthStateV318_(state) {
  state = String(state || '').trim();
  const match = state.match(/^([A-Z]{2,3})_([A-Fa-f0-9]{32})$/);
  if (!match) throw new Error('OAuth state không hợp lệ.');

  const nonce = match[2];
  const key = 'META_OAUTH_PENDING_' + nonce;
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(key);
  props.deleteProperty(key);

  if (!raw) throw new Error('OAuth state đã hết hạn hoặc đã được sử dụng.');

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error('OAuth state bị lỗi.');
  }

  if (String(data.state || '') !== state) {
    throw new Error('OAuth state không khớp.');
  }
  if (Date.now() - Number(data.createdAt || 0) > META_OAUTH_STATE_TTL_MS_V318) {
    throw new Error('OAuth state đã hết hạn. Hãy kết nối lại.');
  }

  return normalizeMetaCompanyV318_(data.company);
}


function getMetaOAuthConfigIdForCompanyV318_(company) {
  const code = normalizeMetaCompanyV318_(company);
  const props = PropertiesService.getScriptProperties();

  // Cho phép override bằng Script Properties nếu cần đổi sau này mà không sửa code.
  const companyOverride = String(
    props.getProperty('META_OAUTH_CONFIG_ID_' + code) || ''
  ).trim();

  if (companyOverride) return companyOverride;

  if (code === 'NNV') {
    return META_OAUTH_CONFIG_ID_NNV_V318;
  }

  return String(
    props.getProperty('META_OAUTH_CONFIG_ID') ||
    META_OAUTH_CONFIG_ID_V318
  ).trim();
}

function buildMetaOAuthAuthorizeUrlV318_(company) {
  const settings = getMetaOAuthSettingsV318_();
  const companyCode = normalizeMetaCompanyV318_(company);
  const state = createMetaOAuthStateV318_(companyCode);
  const configId = getMetaOAuthConfigIdForCompanyV318_(companyCode);

  return 'https://www.facebook.com/' + META_API_VERSION + '/dialog/oauth?' +
    metaQueryStringV318_({
      client_id: settings.appId,
      redirect_uri: settings.redirectUri,
      config_id: configId,
      response_type: 'code',
      override_default_response_type: 'true',
      state: state
    });
}

function renderMetaOAuthStartV318_(e) {
  try {
    const company = normalizeMetaCompanyV318_(
      e && e.parameter ? e.parameter.company : ''
    );
    const url = buildMetaOAuthAuthorizeUrlV318_(company);
    const safeUrl = htmlEscapeMetaV318_(url);

    // V318.2:
    // Apps Script HtmlService chạy trong iframe sandbox.
    // Facebook từ chối render trong iframe (X-Frame-Options/CSP), vì vậy
    // KHÔNG tự redirect bằng window.location/meta refresh.
    // Người dùng bấm nút để mở OAuth ở tab top-level mới.
    return HtmlService.createHtmlOutput(
      '<!doctype html><html><head>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>' +
      'html,body{margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033}' +
      '.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}' +
      '.card{width:min(520px,100%);background:#fff;border:1px solid #e5eaf1;border-radius:18px;padding:28px;box-shadow:0 14px 38px rgba(15,23,42,.10);text-align:center}' +
      '.logo{width:52px;height:52px;border-radius:16px;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px;font-weight:800}' +
      'h2{margin:0 0 8px;font-size:21px}p{margin:0 0 20px;color:#667085;line-height:1.6;font-size:14px}' +
      '.company{display:inline-block;margin-bottom:18px;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#175cd3;font-size:12px;font-weight:700}' +
      '.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 20px;border-radius:11px;background:#1877f2;color:#fff!important;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 6px 16px rgba(24,119,242,.22)}' +
      '.note{margin-top:16px;font-size:12px;color:#98a2b3}' +
      '</style></head><body>' +
      '<div class="wrap"><div class="card">' +
      '<div class="logo">f</div>' +
      '<h2>Kết nối Meta Business</h2>' +
      '<div class="company">' + htmlEscapeMetaV318_(company) + '</div>' +
      '<p>Facebook không cho phép mở màn hình đăng nhập bên trong iframe của Google Apps Script. Bấm nút bên dưới để mở Facebook ở tab mới.</p>' +
      '<a class="btn" href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">Mở Facebook để kết nối</a>' +
      '<div class="note">Sau khi xác nhận trên Facebook, Meta sẽ tự chuyển về Apps Script để hoàn tất lưu token.</div>' +
      '</div></div></body></html>'
    )
      .setTitle('Kết nối Meta ' + company)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return renderMetaOAuthResultV318_(false, {
      title: 'Không thể bắt đầu kết nối Meta',
      message: error && error.message ? error.message : String(error)
    });
  }
}

function parseJsonResponseMetaV318_(response, label) {
  const status = response.getResponseCode();
  const text = response.getContentText();
  let payload = {};
  try {
    payload = JSON.parse(text || '{}');
  } catch (error) {
    throw new Error((label || 'Meta') + ': phản hồi không phải JSON. HTTP ' + status);
  }

  if (status < 200 || status >= 300 || payload.error) {
    const message = payload && payload.error && payload.error.message
      ? payload.error.message
      : ('HTTP ' + status);
    throw new Error((label || 'Meta') + ': ' + message);
  }
  return payload;
}

function exchangeMetaOAuthCodeV318_(code) {
  const settings = getMetaOAuthSettingsV318_();
  const response = UrlFetchApp.fetch(
    'https://graph.facebook.com/' + META_API_VERSION + '/oauth/access_token',
    {
      method: 'post',
      payload: {
        client_id: settings.appId,
        client_secret: settings.appSecret,
        redirect_uri: settings.redirectUri,
        code: String(code || '').trim()
      },
      muteHttpExceptions: true
    }
  );

  const payload = parseJsonResponseMetaV318_(response, 'Đổi OAuth code');
  const token = String(payload.access_token || '').trim();
  if (token.length < 50) throw new Error('Meta không trả Access Token hợp lệ.');

  return {
    accessToken: token,
    tokenType: String(payload.token_type || ''),
    expiresIn: Number(payload.expires_in || 0)
  };
}

function graphObjectMetaV318_(path, params, token, label) {
  const url = 'https://graph.facebook.com/' + META_API_VERSION + '/' +
    String(path || '').replace(/^\/+/, '') + '?' +
    metaQueryStringV318_(params || {});

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });

  return parseJsonResponseMetaV318_(response, label || path);
}

function graphListMetaV318_(path, params, token, label) {
  let payload = graphObjectMetaV318_(path, params, token, label);
  let rows = Array.isArray(payload.data) ? payload.data.slice() : [];
  let next = payload && payload.paging ? payload.paging.next : '';
  let guard = 0;

  while (next && guard < 20) {
    guard++;
    const response = UrlFetchApp.fetch(next, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    payload = parseJsonResponseMetaV318_(response, label || path);
    if (Array.isArray(payload.data)) rows = rows.concat(payload.data);
    next = payload && payload.paging ? payload.paging.next : '';
  }

  return rows;
}

function normalizeAdAccountIdMetaV318_(value) {
  return String(value || '').trim().replace(/^act_/i, '');
}


function getMetaPermissionStatusMapV318_(accessToken, company) {
  const result = {
    rows: [],
    map: {},
    error: ''
  };

  try {
    const rows = graphListMetaV318_(
      'me/permissions',
      { limit: 200 },
      accessToken,
      company + ' Permissions'
    );

    result.rows = rows.map(function (item) {
      const permission = String(item && item.permission || '');
      const status = String(item && item.status || '');
      if (permission) result.map[permission] = status;
      return {
        permission: permission,
        status: status
      };
    });
  } catch (error) {
    result.error = error && error.message ? error.message : String(error);
  }

  return result;
}

function debugMetaAccessTokenV318_(accessToken) {
  const settings = getMetaOAuthSettingsV318_();
  const result = {
    valid: null,
    appId: '',
    userId: '',
    scopes: [],
    granularScopes: [],
    expiresAt: 0,
    dataAccessExpiresAt: 0,
    error: ''
  };

  try {
    const appAccessToken = settings.appId + '|' + settings.appSecret;
    const url = 'https://graph.facebook.com/' + META_API_VERSION + '/debug_token?' +
      metaQueryStringV318_({
        input_token: accessToken,
        access_token: appAccessToken
      });

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true
    });

    const payload = parseJsonResponseMetaV318_(
      response,
      'OAuth Token Debug'
    );

    const data = payload && payload.data ? payload.data : {};

    result.valid = !!data.is_valid;
    result.appId = String(data.app_id || '');
    result.userId = String(data.user_id || '');
    result.scopes = Array.isArray(data.scopes) ? data.scopes.slice() : [];
    result.granularScopes = Array.isArray(data.granular_scopes)
      ? data.granular_scopes.map(function (item) {
          return {
            scope: String(item && item.scope || ''),
            targetIds: Array.isArray(item && item.target_ids)
              ? item.target_ids.map(String)
              : []
          };
        })
      : [];
    result.expiresAt = Number(data.expires_at || 0);
    result.dataAccessExpiresAt = Number(data.data_access_expires_at || 0);
  } catch (error) {
    result.error = error && error.message ? error.message : String(error);
  }

  return result;
}

function inspectMetaOAuthDiagnosticV318_(company, accessToken) {
  const code = normalizeMetaCompanyV318_(company);
  const props = PropertiesService.getScriptProperties();

  const diagnostic = {
    version: 'V318.4_OAUTH_PERMISSION_DIAGNOSTIC',
    company: code,
    systemUserId: '',
    systemUserName: '',
    tokenDebug: null,
    permissions: {},
    permissionsRows: [],
    permissionsError: '',
    pagesOk: false,
    pagesCount: 0,
    pages: [],
    pagesError: '',
    adAccountsOk: false,
    adAccountsCount: 0,
    adAccounts: [],
    adAccountsError: '',
    expectedAdAccountId: normalizeAdAccountIdMetaV318_(
      props.getProperty('META_AD_ACCOUNT_' + code)
    ),
    expectedAdAccountFound: false,
    checkedAt: new Date().toISOString()
  };

  try {
    const me = graphObjectMetaV318_(
      'me',
      { fields: 'id,name' },
      accessToken,
      code + ' Diagnostic /me'
    );
    diagnostic.systemUserId = String(me && me.id || '');
    diagnostic.systemUserName = String(me && me.name || '');
  } catch (error) {
    diagnostic.meError = error && error.message ? error.message : String(error);
  }

  diagnostic.tokenDebug = debugMetaAccessTokenV318_(accessToken);

  const permissionInfo = getMetaPermissionStatusMapV318_(
    accessToken,
    code
  );
  diagnostic.permissions = permissionInfo.map || {};
  diagnostic.permissionsRows = permissionInfo.rows || [];
  diagnostic.permissionsError = permissionInfo.error || '';

  try {
    const pagesRaw = graphListMetaV318_(
      'me/accounts',
      { fields: 'id,name,tasks', limit: 100 },
      accessToken,
      code + ' Diagnostic Pages'
    );

    diagnostic.pagesOk = true;
    diagnostic.pagesCount = pagesRaw.length;
    diagnostic.pages = pagesRaw.map(function (item) {
      return {
        id: String(item && item.id || ''),
        name: String(item && item.name || ''),
        tasks: Array.isArray(item && item.tasks) ? item.tasks : []
      };
    });
  } catch (error) {
    diagnostic.pagesError = error && error.message
      ? error.message
      : String(error);
  }

  try {
    const adsRaw = graphListMetaV318_(
      'me/adaccounts',
      { fields: 'id,name,account_status,business{id,name}', limit: 100 },
      accessToken,
      code + ' Diagnostic Ad Accounts'
    );

    diagnostic.adAccountsOk = true;
    diagnostic.adAccountsCount = adsRaw.length;
    diagnostic.adAccounts = adsRaw.map(function (item) {
      return {
        id: String(item && item.id || ''),
        name: String(item && item.name || ''),
        account_status: item && item.account_status,
        business: item && item.business
          ? {
              id: String(item.business.id || ''),
              name: String(item.business.name || '')
            }
          : null
      };
    });

    if (diagnostic.expectedAdAccountId) {
      diagnostic.expectedAdAccountFound = diagnostic.adAccounts.some(
        function (item) {
          return normalizeAdAccountIdMetaV318_(item.id) ===
            diagnostic.expectedAdAccountId;
        }
      );
    }
  } catch (error) {
    diagnostic.adAccountsError = error && error.message
      ? error.message
      : String(error);
  }

  try {
    props.setProperty(
      'META_OAUTH_LAST_DIAG_' + code,
      JSON.stringify(diagnostic)
    );
  } catch (error) {}

  return diagnostic;
}

function permissionLabelMetaV318_(diagnostic, permission) {
  const map = diagnostic && diagnostic.permissions
    ? diagnostic.permissions
    : {};
  const status = String(map[permission] || '');

  if (status) return status;

  const scopes = diagnostic &&
    diagnostic.tokenDebug &&
    Array.isArray(diagnostic.tokenDebug.scopes)
      ? diagnostic.tokenDebug.scopes
      : [];

  return scopes.indexOf(permission) >= 0 ? 'granted' : 'missing';
}

function renderMetaOAuthDiagnosticHtmlV318_(diagnostic) {
  diagnostic = diagnostic || {};

  const importantPermissions = [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_ads',
    'pages_manage_metadata',
    'pages_messaging'
  ];

  let html = '<div style="margin-top:18px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc">';
  html += '<h3 style="margin:0 0 12px;color:#172033">Chẩn đoán quyền OAuth</h3>';

  html += '<p><b>System User ID:</b> ' +
    htmlEscapeMetaV318_(diagnostic.systemUserId || 'Không lấy được') +
    '</p>';

  html += '<p><b>System User:</b> ' +
    htmlEscapeMetaV318_(diagnostic.systemUserName || 'Không xác định') +
    '</p>';

  if (diagnostic.tokenDebug) {
    html += '<p><b>Token hợp lệ:</b> ' +
      (diagnostic.tokenDebug.valid === true ? 'Có' :
        diagnostic.tokenDebug.valid === false ? 'Không' : 'Không xác định') +
      '</p>';

    if (diagnostic.tokenDebug.appId) {
      html += '<p><b>App ID trên token:</b> ' +
        htmlEscapeMetaV318_(diagnostic.tokenDebug.appId) +
        '</p>';
    }
  }

  html += '<div style="margin:12px 0"><b>Permissions:</b><div style="margin-top:8px;display:grid;gap:6px">';
  importantPermissions.forEach(function (permission) {
    const status = permissionLabelMetaV318_(diagnostic, permission);
const ok = status === 'granted';
    html += '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 9px;background:#fff;border:1px solid #e5e7eb;border-radius:8px">' +
      '<span>' + htmlEscapeMetaV318_(permission) + '</span>' +
      '<b style="color:' + (ok ? '#137333' : '#b42318') + '">' +
      htmlEscapeMetaV318_(status || 'missing') +
      '</b></div>';
  });
  html += '</div></div>';

  html += '<p><b>Page access:</b> ' +
    (diagnostic.pagesOk
      ? ('OK · ' + Number(diagnostic.pagesCount || 0) + ' Page')
      : ('LỖI · ' + htmlEscapeMetaV318_(diagnostic.pagesError || 'Không xác định'))) +
    '</p>';

  html += '<p><b>Ad Account access:</b> ' +
    (diagnostic.adAccountsOk
      ? ('OK · ' + Number(diagnostic.adAccountsCount || 0) + ' tài khoản')
      : ('LỖI · ' + htmlEscapeMetaV318_(diagnostic.adAccountsError || 'Không xác định'))) +
    '</p>';

  if (diagnostic.expectedAdAccountId) {
    html += '<p><b>Ad Account NNV đang cấu hình:</b> ' +
      htmlEscapeMetaV318_(diagnostic.expectedAdAccountId) +
      ' · ' +
      (diagnostic.expectedAdAccountFound ? 'ĐÃ TÌM THẤY' : 'CHƯA TÌM THẤY') +
      '</p>';
  }

  if (diagnostic.permissionsError) {
    html += '<p><b>Lỗi /me/permissions:</b> ' +
      htmlEscapeMetaV318_(diagnostic.permissionsError) +
      '</p>';
  }

  if (
    diagnostic.tokenDebug &&
    diagnostic.tokenDebug.error
  ) {
    html += '<p><b>Lỗi debug token:</b> ' +
      htmlEscapeMetaV318_(diagnostic.tokenDebug.error) +
      '</p>';
  }

  html += '</div>';
  return html;
}


function inspectMetaConnectionV318_(company, accessToken) {
  const code = normalizeMetaCompanyV318_(company);
  const props = PropertiesService.getScriptProperties();

  const me = graphObjectMetaV318_(
    'me',
    { fields: 'id,name' },
    accessToken,
    code + ' /me'
  );

  const pagesRaw = graphListMetaV318_(
    'me/accounts',
    { fields: 'id,name,access_token,tasks', limit: 100 },
    accessToken,
    code + ' Pages'
  );

  const adAccountsRaw = graphListMetaV318_(
    'me/adaccounts',
    { fields: 'id,name,account_status,business{id,name}', limit: 100 },
    accessToken,
    code + ' Ad Accounts'
  );

  if (!pagesRaw.length) {
    throw new Error(code + ': kết nối không trả Page nào. Kiểm tra tài sản Trang trong Login Configuration.');
  }

  const expectedAdId = normalizeAdAccountIdMetaV318_(
    props.getProperty('META_AD_ACCOUNT_' + code)
  );

  if (expectedAdId) {
    const matchedExpected = adAccountsRaw.some(function (item) {
      return normalizeAdAccountIdMetaV318_(item && item.id) === expectedAdId;
    });
    if (!matchedExpected) {
      throw new Error(
        code + ': token mới không thấy tài khoản quảng cáo đang cấu hình ' +
        expectedAdId + '. Hãy kết nối lại và chọn đúng Ad Account của công ty.'
      );
    }
  }

  const pageTokens = {};
  const pages = pagesRaw.map(function (item) {
    const id = String(item && item.id || '');
    const pageToken = String(item && item.access_token || '').trim();
    if (id && pageToken) pageTokens[id] = pageToken;
    return {
      id: id,
      name: String(item && item.name || ''),
      tasks: Array.isArray(item && item.tasks) ? item.tasks : []
    };
  });

  const adAccounts = adAccountsRaw.map(function (item) {
    return {
      id: String(item && item.id || ''),
      name: String(item && item.name || ''),
      account_status: item && item.account_status,
      business: item && item.business ? {
        id: String(item.business.id || ''),
        name: String(item.business.name || '')
      } : null
    };
  });

  return {
    company: code,
    systemUserId: String(me && me.id || ''),
    systemUserName: String(me && me.name || ''),
    pages: pages,
    pageTokens: pageTokens,
    adAccounts: adAccounts,
    expectedAdAccountId: expectedAdId
  };
}

function saveMetaOAuthConnectionV318_(connection, accessToken) {
  const company = normalizeMetaCompanyV318_(connection.company);
  const props = PropertiesService.getScriptProperties();
  const connectedAt = new Date().toISOString();
  const values = {};

  values['META_ACCESS_TOKEN_' + company] = String(accessToken || '');
  values['META_OAUTH_SYSTEM_USER_ID_' + company] = String(connection.systemUserId || '');
  values['META_OAUTH_SYSTEM_USER_NAME_' + company] = String(connection.systemUserName || '');
  values['META_OAUTH_CONNECTED_AT_' + company] = connectedAt;
  values['META_OAUTH_PAGES_' + company] = JSON.stringify(connection.pages || []);
  values['META_OAUTH_PAGE_TOKENS_' + company] = JSON.stringify(connection.pageTokens || {});
  values['META_OAUTH_AD_ACCOUNTS_' + company] = JSON.stringify(connection.adAccounts || []);

  props.setProperties(values, false);
  const epoch = bumpMetaTokenEpochV318_(company);

  return {
    company: company,
    connectedAt: connectedAt,
    epoch: epoch
  };
}

function syncMetaCompanyTokenToBridgeV318_(url, payload, label) {
  url = String(url || '').trim();
  if (!url) return { success: false, label: label, skipped: true, error: 'Thiếu URL bridge' };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true
    });
    const status = response.getResponseCode();
    const text = String(response.getContentText() || '');
    const headers = response.getAllHeaders ? response.getAllHeaders() : {};
    let body = null;
    try { body = JSON.parse(text || '{}'); } catch (error) {}

    if (status >= 200 && status < 300 && body && body.success) {
      return {
        success: true,
        label: label,
        status: status,
        version: body.version || '',
        company: body.company || ''
      };
    }

    const preview = text
      .replace(/\s+/g, ' ')
      .slice(0, 260);

    return {
      success: false,
      label: label,
      status: status,
      contentType: String(headers['Content-Type'] || headers['content-type'] || ''),
      error: body && body.error
        ? body.error
        : (
            'Bridge không xác nhận đồng bộ.' +
            (preview ? ' Phản hồi: ' + preview : '')
          )
    };
  } catch (error) {
    return {
      success: false,
      label: label,
      error: error && error.message ? error.message : String(error)
    };
  }
}

function syncMetaOAuthConnectionV318_(connection, accessToken, connectedAt) {
  const props = PropertiesService.getScriptProperties();
  const secret = String(props.getProperty('META_TOKEN_SYNC_SECRET') || '').trim();

  if (secret.length < 24) {
    return [{
      success: false,
      label: 'Token Sync',
      skipped: true,
      error: 'Gmail 1 chưa cấu hình META_TOKEN_SYNC_SECRET.'
    }];
  }

  const payload = {
    action: 'sync_meta_company_token_v318',
    syncSecret: secret,
    company: connection.company,
    accessToken: accessToken,
    systemUserId: connection.systemUserId,
    systemUserName: connection.systemUserName,
    connectedAt: connectedAt,
    pages: connection.pages || [],
    pageTokens: connection.pageTokens || {},
    adAccounts: connection.adAccounts || []
  };

  /*
   * V327: Workspace phanbon.com.vn đang nằm ngoài phạm vi xử lý.
   * Chỉ đồng bộ Gmail 1 -> Gmail 2; tuyệt đối không gọi Workspace.
   */
  const gmail2Url = String(
    props.getProperty('META_SYNC_GMAIL2_URL') || META_SYNC_GMAIL2_URL_V318
  ).trim();

  return [
    {
      success: true,
      label: 'Workspace',
      skipped: true,
      note: 'V327 không đồng bộ/chỉnh sửa Workspace phanbon.com.vn.'
    },
    syncMetaCompanyTokenToBridgeV318_(gmail2Url, payload, 'Gmail 2')
  ];
}

function renderMetaOAuthResultV318_(success, data) {
  data = data || {};
  const title = data.title || (success ? 'Kết nối Meta thành công' : 'Kết nối Meta thất bại');
  const color = success ? '#137333' : '#b42318';
  const bg = success ? '#ecfdf3' : '#fef3f2';

  let details = '';
  if (success) {
    const pages = Array.isArray(data.pages) ? data.pages : [];
    const ads = Array.isArray(data.adAccounts) ? data.adAccounts : [];
    const syncRows = Array.isArray(data.syncResults) ? data.syncResults : [];
    details += '<p><b>Công ty:</b> ' + htmlEscapeMetaV318_(data.company || '') + '</p>';
    details += '<p><b>System User:</b> ' + htmlEscapeMetaV318_(data.systemUserName || '') + ' (' + htmlEscapeMetaV318_(data.systemUserId || '') + ')</p>';
    details += '<p><b>Pages:</b> ' + pages.length + ' — ' + htmlEscapeMetaV318_(pages.map(function(x){return x.name || x.id;}).join(', ')) + '</p>';
    details += '<p><b>Ad Accounts:</b> ' + ads.length + ' — ' + htmlEscapeMetaV318_(ads.map(function(x){return x.name || x.id;}).join(', ')) + '</p>';
    if (syncRows.length) {
      details += '<p><b>Đồng bộ bridge:</b> ' + syncRows.map(function (row) {
        return htmlEscapeMetaV318_(row.label || '') + ': ' + (row.success ? 'OK' : ('LỖI - ' + htmlEscapeMetaV318_(row.error || '')));
      }).join(' · ') + '</p>';
    }
  } else {
    details = '<p>' + htmlEscapeMetaV318_(data.message || 'Không xác định') + '</p>';
    if (data.diagnostic) {
      details += renderMetaOAuthDiagnosticHtmlV318_(data.diagnostic);
    }
  }

  const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#172033;padding:24px}.card{max-width:760px;margin:40px auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;box-shadow:0 12px 35px rgba(15,23,42,.08)}.status{display:inline-block;padding:6px 10px;border-radius:999px;background:' + bg + ';color:' + color + ';font-weight:700;font-size:12px}h2{margin:14px 0 16px;color:' + color + '}p{line-height:1.6;color:#475569}.close{margin-top:18px;padding:10px 14px;border:0;border-radius:10px;background:#111827;color:#fff;font-weight:700;cursor:pointer}</style></head><body>' +
    '<div class="card"><span class="status">' + (success ? 'THÀNH CÔNG' : 'LỖI') + '</span><h2>' + htmlEscapeMetaV318_(title) + '</h2>' +
    details + '<p>Không chia sẻ Access Token hoặc App Secret từ màn hình quản trị.</p>' +
    '<button class="close" onclick="window.close()">Đóng cửa sổ</button></div></body></html>';

  return HtmlService.createHtmlOutput(html).setTitle(title);
}

function handleMetaOAuthCallbackV318_(e) {
  const params = e && e.parameter ? e.parameter : {};
  try {
    const company = consumeMetaOAuthStateV318_(params.state);

    if (params.error) {
      throw new Error(
        'Meta từ chối kết nối: ' +
        String(params.error_description || params.error_message || params.error)
      );
    }

    const code = String(params.code || '').trim();
    if (!code) throw new Error('Meta không trả authorization code.');

    const exchanged = exchangeMetaOAuthCodeV318_(code);

    // V318.4: chẩn đoán token trước khi strict inspect.
    // Không lưu access token nếu quyền/tài sản chưa hợp lệ.
    const diagnostic = inspectMetaOAuthDiagnosticV318_(
      company,
      exchanged.accessToken
    );

    if (!diagnostic.adAccountsOk) {
      return renderMetaOAuthResultV318_(false, {
        title: 'Kết nối Meta chưa hoàn tất',
        message: diagnostic.adAccountsError ||
          (company + ' chưa đọc được tài khoản quảng cáo.'),
        diagnostic: diagnostic
      });
    }

    const connection = inspectMetaConnectionV318_(company, exchanged.accessToken);
    const saved = saveMetaOAuthConnectionV318_(connection, exchanged.accessToken);
    const syncResults = syncMetaOAuthConnectionV318_(
      connection,
      exchanged.accessToken,
      saved.connectedAt
    );

    return renderMetaOAuthResultV318_(true, {
      company: company,
      systemUserId: connection.systemUserId,
      systemUserName: connection.systemUserName,
      pages: connection.pages,
      adAccounts: connection.adAccounts,
      syncResults: syncResults
    });
  } catch (error) {
    return renderMetaOAuthResultV318_(false, {
      title: 'Kết nối Meta chưa hoàn tất',
      message: error && error.message ? error.message : String(error)
    });
  }
}

function getMetaOAuthStartLinksV318_() {
  const settings = getMetaOAuthSettingsV318_();
  const base = settings.redirectUri;
  const result = {};
  ['NNV', 'VN', 'KF', 'ABC'].forEach(function (company) {
    result[company] = base + '?action=meta_oauth_start&company=' + company;
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}



/**
 * V318.1 — PUBLIC TEST FUNCTIONS
 * Các hàm không có dấu "_" ở cuối để hiện trong menu Run của Apps Script.
 */


/**
 * API Web App trả dữ liệu Meta Ads dưới dạng JSON.
 *
 * Ví dụ:
 * ?company=NNV
 * ?company=NNV&from=2026-07-01&to=2026-07-29
 */

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || '').trim();

  // V318: endpoint bắt đầu Facebook Login for Business.
  if (action === 'meta_oauth_start') {
    return renderMetaOAuthStartV318_(e);
  }

  // V318: Meta redirect về đúng /exec với code + state.
  if (params.state && (params.code || params.error || params.error_code)) {
    return handleMetaOAuthCallbackV318_(e);
  }

  return renderExistingMetaAdsBridgeV318_(e);
}

function renderExistingMetaAdsBridgeV318_(e) {
  const props = PropertiesService.getScriptProperties();

  const originsText = String(
    props.getProperty('MKT_ALLOWED_ORIGINS') || ''
  ).trim();

  const allowedOrigins = originsText
    .split(',')
    .map(function (origin) {
      return String(origin || '')
        .trim()
        .replace(/\/+$/, '');
    })
    .filter(function (origin) {
      return /^https:\/\/[^/]+$/i.test(origin);
    });

  if (!allowedOrigins.length) {
    return HtmlService
      .createHtmlOutput(
        '<h3>Thiếu cấu hình MKT_ALLOWED_ORIGINS</h3>'
      )
      .setTitle('Meta Ads Bridge Error');
  }

  const bridgeChannel = String(
    e && e.parameter
      ? e.parameter.bridge_channel || ''
      : ''
  ).trim();

  if (!/^[A-Za-z0-9_-]{20,100}$/.test(bridgeChannel)) {
    return HtmlService
      .createHtmlOutput(
        '<h3>Meta Ads Bridge V3 đang hoạt động</h3>' +
        '<p>Trang này nhận Bridge Marketing System và Meta OAuth V318.</p>'
      )
      .setTitle('Meta Ads Bridge V3')
      .setXFrameOptionsMode(
        HtmlService.XFrameOptionsMode.ALLOWALL
      );
  }

  const template = HtmlService.createTemplateFromFile('Bridge');
  template.allowedOriginsJson = JSON.stringify(allowedOrigins);
  template.bridgeChannelJson = JSON.stringify(bridgeChannel);

  return template
    .evaluate()
    .setTitle('Meta Ads Bridge V3')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Trả kết quả JSON chuẩn.
 */
function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(
      JSON.stringify(payload)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/* =========================================================
   V318 — SECURE TOKEN SYNC RECEIVER
   Gmail 1 OAuth Bridge đồng bộ token sang các bridge dự phòng.
   Yêu cầu Script Property META_TOKEN_SYNC_SECRET giống nhau ở cả 3 project.
   ========================================================= */
function safeEqualMetaV318_(left, right) {
  left = String(left || '');
  right = String(right || '');
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

function storeSyncedMetaCompanyTokenV318_(payload) {
  payload = payload || {};
  const company = normalizeMetaCompanyV318_(payload.company);
  const token = String(payload.accessToken || '').trim();
  if (token.length < 50) {
    throw new Error('Token đồng bộ không hợp lệ.');
  }

  const props = PropertiesService.getScriptProperties();
  const expectedSecret = String(
    props.getProperty('META_TOKEN_SYNC_SECRET') || ''
  ).trim();
  const receivedSecret = String(payload.syncSecret || '').trim();

  if (expectedSecret.length < 24) {
    throw new Error('Bridge chưa cấu hình META_TOKEN_SYNC_SECRET.');
  }
  if (!safeEqualMetaV318_(expectedSecret, receivedSecret)) {
    throw new Error('Khóa đồng bộ token không hợp lệ.');
  }

  const values = {};
  values['META_ACCESS_TOKEN_' + company] = token;
  values['META_OAUTH_SYSTEM_USER_ID_' + company] = String(
    payload.systemUserId || ''
  );
  values['META_OAUTH_SYSTEM_USER_NAME_' + company] = String(
    payload.systemUserName || ''
  );
  values['META_OAUTH_CONNECTED_AT_' + company] = String(
    payload.connectedAt || new Date().toISOString()
  );
  values['META_OAUTH_PAGES_' + company] = JSON.stringify(
    Array.isArray(payload.pages) ? payload.pages : []
  );
  values['META_OAUTH_PAGE_TOKENS_' + company] = JSON.stringify(
    payload.pageTokens && typeof payload.pageTokens === 'object'
      ? payload.pageTokens
      : {}
  );
  values['META_OAUTH_AD_ACCOUNTS_' + company] = JSON.stringify(
    Array.isArray(payload.adAccounts) ? payload.adAccounts : []
  );

  props.setProperties(values, false);
  const epoch = bumpMetaTokenEpochV318_(company);

  return {
    success: true,
    version: 'V318_MULTI_BUSINESS_OAUTH',
    company: company,
    epoch: epoch
  };
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    if (String(body.action || '') !== 'sync_meta_company_token_v318') {
      return jsonOutput_({
        success: false,
        error: 'Unsupported POST action.'
      });
    }

    return jsonOutput_(storeSyncedMetaCompanyTokenV318_(body));
  } catch (error) {
    return jsonOutput_({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

/**
 * Kiểm tra doGet của Bridge V3 ngay trong Apps Script.
 * Bridge V3 trả HTML, không trả JSON trực tiếp qua URL.
 */

/**
 * Hàm công khai để Bridge.html gọi.
 * Không gọi trực tiếp từ URL.
 */
function getMetaAdsForUser(request) {
  request = request || {};

  const firebaseIdToken = String(
    request.firebaseIdToken || ''
  ).trim();

  if (!firebaseIdToken) {
    throw new Error(
      'Không tìm thấy phiên đăng nhập Firebase.'
    );
  }

  /*
   * Chỉ yêu cầu phiên Firebase hợp lệ.
   *
   * Mọi tài khoản có email hợp lệ đã đăng nhập có thể được máy khách bầu làm leader Meta Live.
   * Anonymous Guest bị verifyFirebaseAdsUser_ chặn ở backend.
   * Việc chỉ chọn một máy gọi Meta được kiểm soát bằng
   * Firebase transaction ở ads-firebase.js.
   */
  const authenticatedUser =
    verifyFirebaseAdsUser_(firebaseIdToken);

  const company = String(
    request.company || 'NNV'
  ).toUpperCase();

  const allowedCompanies = [
    'NNV',
    'VN',
    'KF',
    'ABC'
  ];

  if (allowedCompanies.indexOf(company) === -1) {
    throw new Error(
      'Công ty không hợp lệ.'
    );
  }

  const defaultPeriod = getCurrentMonthPeriod_();

  const from = String(
    request.from || defaultPeriod.from
  );

  const to = String(
    request.to || defaultPeriod.to
  );

  /*
   * V206: Web App luôn tôn trọng cache dùng chung 5 phút.
   * Tham số force từ trình duyệt không được phép làm 20 người cùng phá cache.
   */
  const result = getMetaAdsLiveForUserCached_(
    company,
    from,
    to
  );

  return {
    success: true,
    api: 'meta_ads_live',
    requestedBy: {
      uid: authenticatedUser.uid,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      isGuest: authenticatedUser.isGuest === true
    },
    data: result
  };
}


/**
 * Xác thực Firebase ID Token.
 * Phiên có email hợp lệ và có hồ sơ Marketing System mới được dùng Meta Live;
 * Anonymous Guest và email chưa được cấp bị chặn ở backend.
 */
function verifyFirebaseAdsUser_(firebaseIdToken) {
  const props =
    PropertiesService.getScriptProperties();

  const firebaseApiKey =
    props.getProperty('FIREBASE_WEB_API_KEY');

  const databaseUrl = String(
    props.getProperty('FIREBASE_DATABASE_URL') || ''
  ).replace(/\/+$/, '');

  if (!firebaseApiKey) {
    throw new Error(
      'Thiếu FIREBASE_WEB_API_KEY.'
    );
  }

  if (!databaseUrl) {
    throw new Error(
      'Thiếu FIREBASE_DATABASE_URL.'
    );
  }

  /*
   * Xác thực ID Token với Firebase Authentication.
   */
  const lookupResponse = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
      encodeURIComponent(firebaseApiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        idToken: firebaseIdToken
      }),
      muteHttpExceptions: true
    }
  );

  const lookupStatus =
    lookupResponse.getResponseCode();

  let lookupPayload = {};

  try {
    lookupPayload = JSON.parse(
      lookupResponse.getContentText()
    );
  } catch (error) {
    throw new Error(
      'Firebase Authentication trả dữ liệu không hợp lệ.'
    );
  }

  if (
    lookupStatus < 200 ||
    lookupStatus >= 300 ||
    !lookupPayload.users ||
    !lookupPayload.users.length
  ) {
    throw new Error(
      'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.'
    );
  }

  const firebaseUser = lookupPayload.users[0];

  if (firebaseUser.disabled) {
    throw new Error(
      'Tài khoản Firebase đã bị vô hiệu hóa.'
    );
  }

  const uid = String(
    firebaseUser.localId || ''
  ).trim();

  const email = String(
    firebaseUser.email || ''
  ).trim().toLowerCase();

  if (!uid) {
    throw new Error(
      'Firebase không trả về UID hợp lệ.'
    );
  }

  /*
   * V209 SECURITY + MOBILE BRIDGE:
   * Web App có thể được triển khai cho phép tải Bridge mà không phụ thuộc
   * cookie Google trong iframe mobile. Vì vậy quyền dữ liệu Meta phải được
   * quyết định hoàn toàn ở đây bằng Firebase ID Token.
   * Anonymous Guest bị chặn đúng với chính sách giao diện RBAC.
   */
  if (!email) {
    throw new Error(
      'Meta Live không hỗ trợ tài khoản khách. Hãy đăng nhập bằng tài khoản đã được cấp trong Marketing System.'
    );
  }

  /*
   * Với tài khoản có email, vẫn xác nhận đây là người dùng
   * đã được thêm vào Marketing System. Không phân biệt quyền
   * ads=view hay ads=edit khi lấy dữ liệu Meta Live.
   */
  /*
   * V206: danh sách user hệ thống dùng cache 5 phút để mỗi request Web App
   * không tải lại toàn bộ system_settings/users từ Realtime Database.
   */
  const systemUsers = getSystemUsersCached_(
    databaseUrl,
    firebaseIdToken
  );

  let matchedUser = null;

  Object.keys(systemUsers).some(function (key) {
    const user = systemUsers[key] || {};

    const userEmail = String(
      user.email || ''
    ).trim().toLowerCase();

    const userAuthUid = String(
      user.authUid || ''
    ).trim();

    if (
      userAuthUid === uid ||
      userEmail === email
    ) {
      matchedUser = user;
      return true;
    }

    return false;
  });

  if (!matchedUser) {
    throw new Error(
      'Tài khoản chưa được thêm vào Marketing System.'
    );
  }

  return {
    uid: uid,
    email: email,
    name:
      matchedUser.name ||
      firebaseUser.displayName ||
      email,
    role: matchedUser.role || 'staff',
    isGuest: false
  };
}


/**
 * Hàm tương thích cũ cho các luồng khác.
 * Meta Live V127 không dùng hàm này để phân biệt view/edit.
 */
function hasMetaAdsPermission_(user) {
  user = user || {};

  if (user.role === 'admin') {
    return true;
  }

  const permissions =
    user.permissions || {};

  const permissionValue =
    permissions.ads;

  const normalizedPermission =
    String(permissionValue || '')
      .trim()
      .toLowerCase();

  if (
    permissionValue === true ||
    normalizedPermission === 'true' ||
    normalizedPermission === 'view' ||
    normalizedPermission === 'edit'
  ) {
    return true;
  }

  const features =
    user.features || {};

  return features.ads === true;
}


/**
 * V206 — kiểm tra cache Meta dùng chung 5 phút.
 * Chạy một lần sau khi deploy. Lần gọi thứ hai phải có cacheInfo.hit = true.
 */


/**
 * Chỉ kiểm tra cấu hình bước 6.
 */

/* =========================================================
   V208 — SERVER TTL REALTIME COUNTDOWN + LAZY META
   - Apps Script trả chính xác cửa sổ cache server: storedAt/expiresAt/remaining.
   - Client dùng mốc này để đếm giây thật, không reset 300s khi server cache đã cũ.

   V207 — LAZY META PAYLOAD
   - Mở công ty: chỉ lấy dữ liệu cấp NHÓM cần cho bảng chính.
   - Không lấy Insights cấp bài / danh sách bài ở request đầu.
   - Chỉ khi người dùng mở chi tiết nhóm mới lấy bài quảng cáo của đúng adset đó.
   - Cache chung Apps Script 5 phút cho summary và từng adset detail.
   ========================================================= */

function buildMetaV207SummaryCacheKey_(company, from, to) {
  return [
    'meta_v327_content_manager_summary',
    String(company || '').toUpperCase(),
    getMetaTokenEpochV318_(company),
    String(from || ''),
    String(to || '')
  ].join('_');
}

function buildMetaV207DetailCacheKey_(company, from, to, adsetId) {
  return [
    'meta_v327_content_manager_detail',
    String(company || '').toUpperCase(),
    getMetaTokenEpochV318_(company),
    String(from || ''),
    String(to || ''),
    String(adsetId || '')
  ].join('_');
}

function markMetaV207CacheHit_(payload, mode) {
  payload = payload || {};
  const existing = payload.cacheInfo || {};
  const serverNowMs = Number(existing.serverNowMs || Date.now());
  const expiresAtMs = Number(existing.expiresAtMs || 0);
  const remainingMs = expiresAtMs > 0
    ? Math.max(0, expiresAtMs - serverNowMs)
    : Number(existing.remainingMs || 0);

  payload.cacheInfo = Object.assign({}, existing, {
    hit: true,
    ttlSeconds: META_CACHE_SECONDS,
    cacheVersion: 'V208_SERVER_TTL_REALTIME_COUNTDOWN',
    payloadMode: mode,
    remainingMs: remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    servedAt: Utilities.formatDate(
      new Date(serverNowMs),
      META_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    )
  });
  return payload;
}

function readMetaV207Cache_(key, mode) {
  const cached = readChunkedScriptCache_(key);
  return cached ? markMetaV207CacheHit_(cached, mode) : null;
}

function writeMetaV207Cache_(key, payload) {
  try {
    return writeChunkedScriptCache_(key, payload);
  } catch (error) {
    console.warn('Không ghi được cache Meta V207: ' + error.message);
    return false;
  }
}

function getMetaAccountForCompanyV207_(company) {
  const config = getMetaAccounts_();
  const companyCode = String(company || '').toUpperCase();
  const account = config.accounts.find(function (item) {
    return item.company === companyCode;
  });

  if (!account) {
    throw new Error('Mã công ty không hợp lệ: ' + companyCode);
  }

  return {
    config: config,
    account: account,
    companyCode: companyCode
  };
}

/**
 * Payload nhẹ cho bảng chính.
 * Chỉ gọi:
 * 1) Insights cấp adset.
 * 2) Metadata adsets.
 * Không gọi /ads và không gọi Insights cấp ad.
 */

function collectFanpagePhotoTargetsV310_(post) {
  post = post && typeof post === 'object' ? post : {};
  var output = [];
  var seen = {};
  function add(id) {
    id = String(id || '').trim();
    if (!/^\d+$/.test(id) || seen[id]) return;
    seen[id] = true;
    output.push(id);
  }
  function addFromUrl(url) {
    url = String(url || '').trim();
    if (!url) return;
    var patterns = [
      /[?&]fbid=(\d+)/i,
      /\/photos\/(?:[^/]+\/)?(\d+)(?:[/?#]|$)/i,
      /\/photo\/?(?:\?|$).*?[?&]fbid=(\d+)/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = url.match(patterns[i]);
      if (match && match[1]) { add(match[1]); return; }
    }
  }
  function scan(attachment) {
    attachment = attachment && typeof attachment === 'object' ? attachment : {};
    var mediaType = String(attachment.media_type || attachment.type || '').toUpperCase();
    var target = attachment.target && typeof attachment.target === 'object' ? attachment.target : {};
    var looksLikePhoto = mediaType.indexOf('PHOTO') >= 0 || mediaType.indexOf('IMAGE') >= 0;
    if (target.id && looksLikePhoto) add(target.id);
    addFromUrl(attachment.url);
    addFromUrl(target.url);
    var subs = attachment.subattachments && Array.isArray(attachment.subattachments.data)
      ? attachment.subattachments.data : [];
    subs.forEach(scan);
  }
  var attachments = post.attachments && Array.isArray(post.attachments.data)
    ? post.attachments.data : [];
  attachments.forEach(scan);
  return output;
}

function fetchFanpageOriginalPhotosV310_(photoIds, token, label) {
  photoIds = Array.isArray(photoIds) ? photoIds.filter(Boolean) : [];
  var unique = [];
  var seen = {};
  photoIds.forEach(function(id){ id=String(id||'').trim(); if(id && !seen[id]){seen[id]=true;unique.push(id);} });
  var output = {};
  var chunkSize = 40;
  for (var offset=0; offset<unique.length; offset+=chunkSize) {
    var chunk = unique.slice(offset,offset+chunkSize);
    var url = 'https://graph.facebook.com/' + META_API_VERSION + '/?ids=' +
      encodeURIComponent(chunk.join(',')) + '&fields=' + encodeURIComponent('images');
    var response = UrlFetchApp.fetch(url,{method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
    var payload = parseMetaResponse_(response,label+' lô '+(Math.floor(offset/chunkSize)+1));
    Object.keys(payload||{}).forEach(function(photoId){
      var photo = payload[photoId];
      if (!photo || photo.error || !Array.isArray(photo.images)) return;
      var rows = photo.images.map(function(img){
        return {url:String(img && (img.source||img.src) || '').trim(),width:toNumber_(img&&img.width),height:toNumber_(img&&img.height)};
      }).filter(function(img){return !!img.url;});
      rows.sort(function(a,b){return (b.width*b.height)-(a.width*a.height);});
      if (rows.length) output[photoId]=rows[0];
    });
  }
  return output;
}


function posterRatioDistanceV317_(width, height) {
  width = Number(width || 0);
  height = Number(height || 0);
  if (!(width > 0 && height > 0)) return 999;
  return Math.abs((width / height) - 0.8);
}

function sortPosterCandidatesV317_(rows) {
  rows = Array.isArray(rows) ? rows.slice() : [];
  rows.sort(function (a, b) {
    var da = posterRatioDistanceV317_(a && a.width, a && a.height);
    var db = posterRatioDistanceV317_(b && b.width, b && b.height);
    var nearA = da <= 0.08 ? 1 : 0;
    var nearB = db <= 0.08 ? 1 : 0;
    if (nearA !== nearB) return nearB - nearA;
    var portraitA = Number(a && a.height || 0) > Number(a && a.width || 0) ? 1 : 0;
    var portraitB = Number(b && b.height || 0) > Number(b && b.width || 0) ? 1 : 0;
    if (portraitA !== portraitB) return portraitB - portraitA;
    var areaA = Number(a && a.width || 0) * Number(a && a.height || 0);
    var areaB = Number(b && b.width || 0) * Number(b && b.height || 0);
    if (areaA !== areaB) return areaB - areaA;
    if (da !== db) return da - db;
    return 0;
  });
  return rows;
}

function hasTrustedPosterV317_(ad) {
  var creative = ad && ad.creative && typeof ad.creative === 'object' ? ad.creative : {};
  var fanpageUrl = String(creative._v309_fanpage_image || creative._v310_fanpage_original_image || '').trim();
  var fanpageSource = String(creative._v309_fanpage_source || creative._v310_fanpage_original_source || '').toLowerCase();
  var fanpageTrusted = !!fanpageUrl && fanpageSource.indexOf('full_picture') === -1;
  return !!(fanpageTrusted || creative._v217_highres_image_url);
}


/* =========================================================
   V321 — STRICT FANPAGE CONTENT SOURCE
   Ads chỉ dùng để tìm post ID. Nội dung bên phải lấy trực tiếp
   từ Page API bằng Page Access Token của đúng công ty.
   ========================================================= */

/* =========================================================
   V324 — PAGE TOKEN AUTO-REFRESH + POST ID NORMALIZER
   - Không lộ Page Access Token trong diagnostic.
   - Tự đọc /me/accounts bằng token công ty.
   - Tự suy ra Page ID từ creative/object_story_spec/story IDs.
   ========================================================= */

function getMetaPageTokenMapV321_(companyCode) {
  companyCode = String(companyCode || '').trim().toUpperCase();
  var props = PropertiesService.getScriptProperties();
  var raw = String(
    props.getProperty('META_OAUTH_PAGE_TOKENS_' + companyCode) || ''
  ).trim();

  if (!raw) return {};

  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn(
      companyCode +
      ' META_OAUTH_PAGE_TOKENS JSON lỗi: ' +
      error.message
    );
    return {};
  }
}

function refreshMetaPageTokenMapV324_(
  companyCode,
  accountToken,
  force
) {
  companyCode = String(companyCode || '').trim().toUpperCase();
  accountToken = String(accountToken || '').trim();

  var props = PropertiesService.getScriptProperties();
  var current = getMetaPageTokenMapV321_(companyCode);
  var refreshedAt = Number(
    props.getProperty(
      'META_OAUTH_PAGE_TOKENS_REFRESHED_AT_' + companyCode
    ) || 0
  );

  var stale =
    !refreshedAt ||
    (Date.now() - refreshedAt) > (6 * 60 * 60 * 1000);

  if (
    !force &&
    Object.keys(current).length > 0 &&
    !stale
  ) {
    return {
      success:true,
      refreshed:false,
      pageTokens:current,
      pageCount:Object.keys(current).length,
      pages:[]
    };
  }

  if (!accountToken) {
    return {
      success:false,
      refreshed:false,
      pageTokens:current,
      pageCount:Object.keys(current).length,
      pages:[],
      error:'Thiếu account token để làm mới Page Access Token.'
    };
  }

  try {
    var url =
      'https://graph.facebook.com/' +
      META_API_VERSION +
      '/me/accounts?' +
      'fields=' +
      encodeURIComponent(
        'id,name,access_token,tasks'
      ) +
      '&limit=100';

    var response = UrlFetchApp.fetch(url, {
      method:'get',
      headers:{
        Authorization:'Bearer ' + accountToken
      },
      muteHttpExceptions:true
    });

    var status = Number(response.getResponseCode() || 0);
    var bodyText = String(response.getContentText() || '');
    var payload = {};

    try {
      payload = JSON.parse(bodyText || '{}');
    } catch (parseError) {
      payload = {};
    }

    if (
      status < 200 ||
      status >= 300 ||
      !payload ||
      !Array.isArray(payload.data)
    ) {
      var apiMessage =
        payload &&
        payload.error &&
        payload.error.message
          ? String(payload.error.message)
          : ('HTTP ' + status);

      return {
        success:false,
        refreshed:false,
        pageTokens:current,
        pageCount:Object.keys(current).length,
        pages:[],
        error:apiMessage
      };
    }

    var tokenMap = {};
    var pages = [];

    payload.data.forEach(function (item) {
      var id = String(item && item.id || '').trim();
      var pageToken = String(
        item && item.access_token || ''
      ).trim();

      if (id && pageToken) {
        tokenMap[id] = pageToken;
      }

      pages.push({
        id:id,
        name:String(item && item.name || ''),
        hasAccessToken:!!pageToken,
        tasks:Array.isArray(item && item.tasks)
          ? item.tasks.slice()
          : []
      });
    });

    /*
     * Không xóa map cũ nếu Meta tạm thời trả thiếu Page.
     * Gộp token cũ + token vừa refresh, token mới thắng.
     */
    var merged = {};
    Object.keys(current).forEach(function (id) {
      if (current[id]) merged[id] = current[id];
    });
    Object.keys(tokenMap).forEach(function (id) {
      if (tokenMap[id]) merged[id] = tokenMap[id];
    });

    props.setProperty(
      'META_OAUTH_PAGE_TOKENS_' + companyCode,
      JSON.stringify(merged)
    );
    props.setProperty(
      'META_OAUTH_PAGE_TOKENS_REFRESHED_AT_' + companyCode,
      String(Date.now())
    );
    props.setProperty(
      'META_OAUTH_PAGES_REFRESHED_' + companyCode,
      JSON.stringify(pages)
    );

    return {
      success:true,
      refreshed:true,
      pageTokens:merged,
      pageCount:Object.keys(merged).length,
      pages:pages
    };
  } catch (error) {
    return {
      success:false,
      refreshed:false,
      pageTokens:current,
      pageCount:Object.keys(current).length,
      pages:[],
      error:error && error.message
        ? error.message
        : String(error)
    };
  }
}

function getPageIdFromFacebookPostIdV321_(postId) {
  postId = String(postId || '').trim();
  var match = postId.match(/^(\d+)_\d+$/);
  return match && match[1] ? String(match[1]) : '';
}

function getNumericPostIdFromUrlV324_(value) {
  value = String(value || '').trim();
  if (!value) return '';

  var patterns = [
    /\/posts\/(\d+)(?:[/?#]|$)/i,
    /\/videos\/(\d+)(?:[/?#]|$)/i,
    /[?&]story_fbid=(\d+)/i,
    /[?&]fbid=(\d+)/i
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = value.match(patterns[i]);
    if (match && match[1]) return String(match[1]);
  }

  return '';
}

function inferPageIdFromCreativeV324_(creative, rawPostId) {
  creative =
    creative &&
    typeof creative === 'object'
      ? creative
      : {};

  var storySpec =
    creative.object_story_spec &&
    typeof creative.object_story_spec === 'object'
      ? creative.object_story_spec
      : {};

  var candidates = [
    getPageIdFromFacebookPostIdV321_(rawPostId),
    String(storySpec.page_id || '').trim(),
    getPageIdFromFacebookPostIdV321_(
      creative.source_facebook_post_id
    ),
    getPageIdFromFacebookPostIdV321_(
      creative.object_story_id
    ),
    getPageIdFromFacebookPostIdV321_(
      creative.effective_object_story_id
    ),
    String(
      creative._v321_fanpage_page_id || ''
    ).trim()
  ];

  for (var i = 0; i < candidates.length; i++) {
    var value = String(candidates[i] || '').trim();
    if (/^\d+$/.test(value)) return value;
  }

  return '';
}

function normalizeFanpagePostIdV324_(rawPostId, creative) {
  rawPostId = String(rawPostId || '').trim();
  if (!rawPostId) return {
    postId:'',
    pageId:'',
    rawPostId:''
  };

  var pageId =
    inferPageIdFromCreativeV324_(
      creative,
      rawPostId
    );

  if (/^\d+_\d+$/.test(rawPostId)) {
    return {
      postId:rawPostId,
      pageId:
        pageId ||
        getPageIdFromFacebookPostIdV321_(rawPostId),
      rawPostId:rawPostId
    };
  }

  var numericPostId = /^\d+$/.test(rawPostId)
    ? rawPostId
    : getNumericPostIdFromUrlV324_(rawPostId);

  if (numericPostId && pageId) {
    return {
      postId:pageId + '_' + numericPostId,
      pageId:pageId,
      rawPostId:rawPostId
    };
  }

  return {
    postId:rawPostId,
    pageId:pageId,
    rawPostId:rawPostId
  };
}

function saveFanpageDiagnosticV324_(companyCode, diag) {
  companyCode = String(companyCode || '').trim().toUpperCase();
  diag = diag || {};

  try {
    /*
     * Tuyệt đối không lưu token vào diagnostic.
     */
    PropertiesService
      .getScriptProperties()
      .setProperty(
        'META_FANPAGE_LAST_DIAG_' + companyCode,
        JSON.stringify(diag)
      );
  } catch (error) {}
}


function collectFanpageVideoTargetsV321_(post) {
  post = post && typeof post === 'object' ? post : {};
  var output = [];
  var seen = {};
  function add(id) {
    id = String(id || '').trim();
    if (!/^\d+$/.test(id) || seen[id]) return;
    seen[id] = true;
    output.push(id);
  }
  function addFromUrl(url) {
    url = String(url || '').trim();
    if (!url) return;
    var patterns = [
      /\/videos\/(\d+)(?:[/?#]|$)/i,
      /[?&]v=(\d+)/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = url.match(patterns[i]);
      if (m && m[1]) { add(m[1]); return; }
    }
  }
  function scan(attachment) {
    attachment = attachment && typeof attachment === 'object' ? attachment : {};
    var mediaType = String(attachment.media_type || attachment.type || '').toUpperCase();
    var target = attachment.target && typeof attachment.target === 'object' ? attachment.target : {};
    var looksLikeVideo = mediaType.indexOf('VIDEO') >= 0;
    if (looksLikeVideo && target.id) add(target.id);
    addFromUrl(attachment.url);
    addFromUrl(target.url);
    var subs = attachment.subattachments && Array.isArray(attachment.subattachments.data)
      ? attachment.subattachments.data : [];
    subs.forEach(scan);
  }
  var attachments = post.attachments && Array.isArray(post.attachments.data)
    ? post.attachments.data : [];
  attachments.forEach(scan);
  return output;
}

function fetchFanpageVideoNodesV321_(videoIds, token, label) {
  videoIds = Array.isArray(videoIds) ? videoIds.filter(Boolean) : [];
  var unique = [];
  var seen = {};
  videoIds.forEach(function(id){
    id = String(id || '').trim();
    if (id && !seen[id]) { seen[id] = true; unique.push(id); }
  });
  var output = {};
  var chunkSize = 40;
  for (var offset = 0; offset < unique.length; offset += chunkSize) {
    var chunk = unique.slice(offset, offset + chunkSize);
    var url = 'https://graph.facebook.com/' + META_API_VERSION + '/?ids=' +
      encodeURIComponent(chunk.join(',')) + '&fields=' +
      encodeURIComponent('id,source,picture,permalink_url,post_id');
    var response = UrlFetchApp.fetch(url, {
      method:'get',
      headers:{Authorization:'Bearer ' + token},
      muteHttpExceptions:true
    });
    var payload = parseMetaResponse_(response, label + ' lô ' + (Math.floor(offset/chunkSize)+1));
    Object.keys(payload || {}).forEach(function(videoId){
      var item = payload[videoId];
      if (!item || item.error) return;
      output[videoId] = {
        id:String(item.id || videoId),
        source:String(item.source || '').trim(),
        picture:String(item.picture || '').trim(),
        permalink_url:String(item.permalink_url || '').trim(),
        post_id:String(item.post_id || '').trim()
      };
    });
  }
  return output;
}

function attachmentMediaKindV321_(post) {
  post = post && typeof post === 'object' ? post : {};
  var found = '';
  function scan(attachment) {
    if (found === 'video') return;
    attachment = attachment && typeof attachment === 'object' ? attachment : {};
    var mediaType = String(attachment.media_type || attachment.type || '').toUpperCase();
    if (mediaType.indexOf('VIDEO') >= 0) found = 'video';
    else if (!found && (mediaType.indexOf('PHOTO') >= 0 || mediaType.indexOf('IMAGE') >= 0)) found = 'image';
    var subs = attachment.subattachments && Array.isArray(attachment.subattachments.data)
      ? attachment.subattachments.data : [];
    subs.forEach(scan);
  }
  var attachments = post.attachments && Array.isArray(post.attachments.data)
    ? post.attachments.data : [];
  attachments.forEach(scan);
  return found || (post.full_picture ? 'image' : '');
}


function hydrateStrictFanpageContentV321_(
  adsMetadata,
  accountToken,
  companyCode,
  label
) {
  adsMetadata = Array.isArray(adsMetadata)
    ? adsMetadata
    : [];

  companyCode = String(
    companyCode || ''
  ).trim().toUpperCase();

  accountToken = String(
    accountToken || ''
  ).trim();

  var initialRefresh =
    refreshMetaPageTokenMapV324_(
      companyCode,
      accountToken,
      false
    );

  var pageTokens =
    initialRefresh.pageTokens ||
    getMetaPageTokenMapV321_(companyCode);

  var byPost = {};
  var groups = {};
  var neededPageIds = {};
  var candidateCount = 0;
  var foundPostIds = {};
  var apiErrors = [];
  var missingTokenPageIds = {};
  var normalizationSamples = [];

  function registerNeededPage(pageId) {
    pageId = String(pageId || '').trim();
    if (/^\d+$/.test(pageId)) {
      neededPageIds[pageId] = true;
    }
  }

  /*
   * Pass 1: thu thập Page ID trước.
   * Nếu Page token map thiếu một Page đang chạy Ads,
   * ép /me/accounts refresh đúng một lần.
   */
  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    [
      creative.source_facebook_post_id,
      creative.object_story_id,
      creative.effective_object_story_id
    ].forEach(function (rawId) {
      if (!rawId) return;
      registerNeededPage(
        inferPageIdFromCreativeV324_(
          creative,
          rawId
        )
      );
    });
  });

  var missingBeforeRefresh =
    Object.keys(neededPageIds)
      .filter(function (pageId) {
        return !pageTokens[pageId];
      });

  var forcedRefresh = null;
  if (
    missingBeforeRefresh.length > 0 ||
    Object.keys(pageTokens).length === 0
  ) {
    forcedRefresh =
      refreshMetaPageTokenMapV324_(
        companyCode,
        accountToken,
        true
      );

    if (
      forcedRefresh &&
      forcedRefresh.pageTokens
    ) {
      pageTokens =
        forcedRefresh.pageTokens;
    }
  }

  function addPost(
    rawPostId,
    ad,
    priority,
    sourceKind
  ) {
    rawPostId = String(
      rawPostId || ''
    ).trim();

    if (!rawPostId) return;

    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    var normalized =
      normalizeFanpagePostIdV324_(
        rawPostId,
        creative
      );

    var pageId = String(
      normalized.pageId || ''
    ).trim();

    var postIds = [];
    if (normalized.postId) {
      postIds.push(
        String(normalized.postId)
      );
    }

    /*
     * Nếu raw ID khác normalized ID thì giữ raw làm
     * phương án thử thứ hai. Điều này hữu ích với một số
     * creative cũ / dark post.
     */
    if (
      rawPostId &&
      postIds.indexOf(rawPostId) === -1
    ) {
      postIds.push(rawPostId);
    }

    if (normalizationSamples.length < 12) {
      normalizationSamples.push({
        sourceKind:String(sourceKind || ''),
        rawPostId:rawPostId,
        normalizedPostId:String(
          normalized.postId || ''
        ),
        pageId:pageId
      });
    }

    postIds.forEach(function (postId, index) {
      candidateCount++;

      if (!byPost[postId]) {
        byPost[postId] = [];
      }

      byPost[postId].push({
        ad:ad,
        priority:
          Number(priority || 0) -
          index,
        sourceKind:
          String(sourceKind || '') +
          (index > 0 ? '_raw_fallback' : '')
      });

      var token = String(
        pageTokens[pageId] ||
        accountToken ||
        ''
      ).trim();

      if (
        pageId &&
        !pageTokens[pageId]
      ) {
        missingTokenPageIds[pageId] = true;
      }

      var groupKey =
        (pageId || 'NO_PAGE') +
        '||' +
        (token ? 'HAS_TOKEN' : 'NO_TOKEN');

      if (!groups[groupKey]) {
        groups[groupKey] = {
          pageId:pageId,
          token:token,
          postIds:[]
        };
      }

      if (
        groups[groupKey].postIds
          .indexOf(postId) < 0
      ) {
        groups[groupKey]
          .postIds
          .push(postId);
      }
    });
  }

  adsMetadata.forEach(function (ad) {
    var creative =
      ad &&
      ad.creative &&
      typeof ad.creative === 'object'
        ? ad.creative
        : {};

    addPost(
      creative.source_facebook_post_id,
      ad,
      300,
      'source_facebook_post_id'
    );

    addPost(
      creative.object_story_id,
      ad,
      250,
      'object_story_id'
    );

    addPost(
      creative.effective_object_story_id,
      ad,
      200,
      'effective_object_story_id'
    );
  });

  Object.keys(groups).forEach(function (groupKey) {
    var group = groups[groupKey];

    if (
      !group ||
      !group.postIds.length
    ) {
      return;
    }

    if (!group.token) {
      apiErrors.push({
        pageId:String(group.pageId || ''),
        postId:'',
        code:'NO_TOKEN',
        message:'Không có token để gọi Page API.'
      });
      return;
    }

    var chunkSize = 40;

    for (
      var offset = 0;
      offset < group.postIds.length;
      offset += chunkSize
    ) {
      var chunk =
        group.postIds.slice(
          offset,
          offset + chunkSize
        );

      var fields = [
        'id',
        'message',
        'created_time',
        'permalink_url',
        'full_picture',
        'from{id,name}',
        'attachments{' +
          'media_type,type,media,' +
          'target{id,url},' +
          'subattachments{' +
            'media_type,type,media,url,' +
            'target{id,url},' +
            'title,description' +
          '},' +
          'url,title,description' +
        '}'
      ].join(',');

      var url =
'https://graph.facebook.com/' +
        META_API_VERSION +
        '/?ids=' +
        encodeURIComponent(
          chunk.join(',')
        ) +
        '&fields=' +
        encodeURIComponent(fields);

      var payload = {};

      try {
        var response =
          UrlFetchApp.fetch(url, {
            method:'get',
            headers:{
              Authorization:
                'Bearer ' + group.token
            },
            muteHttpExceptions:true
          });

        var status =
          Number(
            response.getResponseCode() || 0
          );

        var responseText =
          String(
            response.getContentText() || ''
          );

        try {
          payload =
            JSON.parse(
              responseText || '{}'
            );
        } catch (parseError) {
          payload = {};
        }

        if (
          status < 200 ||
          status >= 300
        ) {
          var wholeMessage =
            payload &&
            payload.error &&
            payload.error.message
              ? String(
                  payload.error.message
                )
              : ('HTTP ' + status);

          apiErrors.push({
            pageId:String(group.pageId || ''),
            postId:chunk.join(','),
            code:
              payload &&
              payload.error &&
              payload.error.code !== undefined
                ? String(payload.error.code)
                : String(status),
            message:wholeMessage
          });

          continue;
        }
      } catch (fetchError) {
        apiErrors.push({
          pageId:String(group.pageId || ''),
          postId:chunk.join(','),
          code:'FETCH_ERROR',
          message:
            fetchError &&
            fetchError.message
              ? fetchError.message
              : String(fetchError)
        });
        continue;
      }

      var allPhotoIds = [];
      var allVideoIds = [];
      var photoTargetsByPost = {};
      var videoTargetsByPost = {};

      Object.keys(payload || {})
        .forEach(function (postId) {
          var post = payload[postId];

          if (!post) return;

          if (post.error) {
            apiErrors.push({
              pageId:String(
                group.pageId || ''
              ),
              postId:String(postId || ''),
              code:
                post.error.code !== undefined
                  ? String(post.error.code)
                  : 'POST_ERROR',
              message:String(
                post.error.message || ''
              )
            });
            return;
          }

          foundPostIds[postId] = true;

          var photoIds =
            collectFanpagePhotoTargetsV310_(
              post
            );

          var videoIds =
            collectFanpageVideoTargetsV321_(
              post
            );

          photoTargetsByPost[postId] =
            photoIds;

          videoTargetsByPost[postId] =
            videoIds;

          allPhotoIds =
            allPhotoIds.concat(photoIds);

          allVideoIds =
            allVideoIds.concat(videoIds);
        });

      var originalPhotoMap = {};
      var videoMap = {};

      try {
        originalPhotoMap =
          fetchFanpageOriginalPhotosV310_(
            allPhotoIds,
            group.token,
            label + ' Page Photos'
          );
      } catch (photoError) {
        apiErrors.push({
          pageId:String(group.pageId || ''),
          postId:'',
          code:'PHOTO_FETCH',
          message:
            photoError &&
            photoError.message
              ? photoError.message
              : String(photoError)
        });
      }

      try {
        videoMap =
          fetchFanpageVideoNodesV321_(
            allVideoIds,
            group.token,
            label + ' Page Videos'
          );
      } catch (videoError) {
        apiErrors.push({
          pageId:String(group.pageId || ''),
          postId:'',
          code:'VIDEO_FETCH',
          message:
            videoError &&
            videoError.message
              ? videoError.message
              : String(videoError)
        });
      }

      Object.keys(payload || {})
        .forEach(function (postId) {
          var post = payload[postId];

          if (
            !post ||
            post.error
          ) {
            return;
          }

          var from =
            post.from &&
            typeof post.from === 'object'
              ? post.from
              : {};

          var pageId = String(
            from.id ||
            group.pageId ||
            getPageIdFromFacebookPostIdV321_(
              postId
            ) ||
            ''
          ).trim();

          var pageName = String(
            from.name || ''
          ).trim();

          var mediaKind =
            attachmentMediaKindV321_(post);

          var photoCandidates =
            (
              photoTargetsByPost[postId] ||
              []
            ).map(function (id) {
              var item =
                originalPhotoMap[id];

              return (
                item &&
                item.url
              ) ? {
                url:String(item.url),
                width:Number(
                  item.width || 0
                ),
                height:Number(
                  item.height || 0
                ),
                source:
                  'facebook_page_photo_images_original',
                photoId:String(id || '')
              } : null;
            }).filter(Boolean);

          photoCandidates =
            sortPosterCandidatesV317_(
              photoCandidates
            );

          var attachmentGallery = [];

          try {
            attachmentGallery =
              extractFacebookPostGalleryV223_(
                post
              ) || [];
          } catch (error) {
            attachmentGallery = [];
          }

          attachmentGallery =
            sortPosterCandidatesV317_(
              attachmentGallery
            );

          var bestImage =
            photoCandidates[0] ||
            attachmentGallery[0] ||
            null;

          if (
            !bestImage &&
            post.full_picture
          ) {
            bestImage = {
              url:String(
                post.full_picture
              ),
              width:0,
              height:0,
              source:
                'facebook_page_full_picture'
            };
          }

          var video = null;

          var videoIds =
            videoTargetsByPost[postId] ||
            [];

          for (
            var vi = 0;
            vi < videoIds.length;
            vi++
          ) {
            if (videoMap[videoIds[vi]]) {
              video =
                videoMap[videoIds[vi]];
              break;
            }
          }

          var gallery = [];
          var seenUrls = {};

          photoCandidates
            .concat(attachmentGallery)
            .forEach(function (item) {
              if (
                !item ||
                !item.url ||
                seenUrls[item.url]
              ) {
                return;
              }

              seenUrls[item.url] = true;

              gallery.push({
                url:String(item.url),
                width:Number(
                  item.width || 0
                ),
                height:Number(
                  item.height || 0
                ),
                source:String(
                  item.source ||
                  'facebook_page_attachment'
                )
              });
            });

          (byPost[postId] || [])
            .forEach(function (link) {
              var ad =
                link &&
                link.ad;

              if (
                !ad ||
                !ad.creative ||
                typeof ad.creative !== 'object'
              ) {
                return;
              }

              var creative =
                ad.creative;

              var incomingPriority =
                Number(
                  link.priority || 0
                );

              var currentPriority =
                Number(
                  creative
                    ._v321_fanpage_priority ||
                  0
                );

              if (
                incomingPriority <
                currentPriority
              ) {
                return;
              }

              creative
                ._v321_fanpage_priority =
                  incomingPriority;

              creative
                ._v321_fanpage_post_found =
                  true;

              creative
                ._v321_fanpage_source_kind =
                  String(
                    link.sourceKind || ''
                  );

              creative
                ._v321_fanpage_post_id =
                  String(
                    post.id ||
                    postId ||
                    ''
                  );

              creative
                ._v321_fanpage_page_id =
                  pageId;

              creative
                ._v321_fanpage_page_name =
                  pageName;

              creative
                ._v321_fanpage_post_message =
                  String(
                    post.message || ''
                  ).trim();

              creative
                ._v321_fanpage_post_permalink =
                  String(
                    post.permalink_url || ''
                  ).trim();

              creative
                ._v321_fanpage_post_created_time =
                  String(
                    post.created_time || ''
                  ).trim();

              creative
                ._v321_fanpage_media_kind =
                  video
                    ? 'video'
                    : (
                        mediaKind ||
                        (
                          bestImage
                            ? 'image'
                            : ''
                        )
                      );

              creative
                ._v321_fanpage_video_id =
                  String(
                    video &&
                    video.id ||
                    ''
                  ).trim();

              creative
                ._v321_fanpage_video_source_url =
                  String(
                    video &&
                    video.source ||
                    ''
                  ).trim();

              creative
                ._v321_fanpage_video_permalink_url =
                  String(
                    video &&
                    video.permalink_url ||
                    ''
                  ).trim();

              creative
                ._v321_fanpage_media_url =
                  String(
                    bestImage &&
                    bestImage.url ||
                    (
                      video &&
                      video.picture
                    ) ||
                    ''
                  ).trim();

              creative
                ._v321_fanpage_media_width =
                  Number(
                    bestImage &&
                    bestImage.width ||
                    0
                  );

              creative
                ._v321_fanpage_media_height =
                  Number(
                    bestImage &&
                    bestImage.height ||
                    0
                  );

              creative
                ._v321_fanpage_media_source =
                  String(
                    bestImage &&
                    bestImage.source ||
                    (
                      video &&
                      video.picture
                        ? 'facebook_page_video_picture'
                        : ''
                    ) ||
                    ''
                  ).trim();

              creative
                ._v321_fanpage_gallery =
                  gallery;

              if (
                creative
                  ._v321_fanpage_media_url
              ) {
                creative
                  ._v309_fanpage_image =
                    creative
                      ._v321_fanpage_media_url;

                creative
                  ._v309_fanpage_width =
                    creative
                      ._v321_fanpage_media_width;

                creative
                  ._v309_fanpage_height =
                    creative
                      ._v321_fanpage_media_height;

                creative
                  ._v309_fanpage_source =
                    creative
                      ._v321_fanpage_media_source ||
                    'facebook_page_api_v324';

                creative
                  ._v309_fanpage_gallery =
                    gallery;
              }

              creative
                ._v307_post_message =
                  creative
                    ._v321_fanpage_post_message;

              creative
                ._v307_post_permalink =
                  creative
                    ._v321_fanpage_post_permalink;
            });
        });
    }
  });

  var diagnostic = {
    version:'V324_PAGE_TOKEN_POST_ID_AUTO_FIX',
    company:companyCode,
    checkedAt:new Date().toISOString(),
    pageTokenCount:
      Object.keys(pageTokens).length,
    pageTokensInitialRefreshSuccess:
      initialRefresh.success === true,
    pageTokensInitialRefreshed:
      initialRefresh.refreshed === true,
    pageTokensInitialError:
      String(initialRefresh.error || ''),
    pageTokensForcedRefresh:
      !!forcedRefresh,
    pageTokensForcedRefreshSuccess:
      forcedRefresh
        ? forcedRefresh.success === true
        : null,
    pageTokensForcedRefreshError:
      forcedRefresh
        ? String(
            forcedRefresh.error || ''
          )
        : '',
    neededPageIds:
      Object.keys(neededPageIds),
    missingPageTokenIds:
      Object.keys(missingTokenPageIds),
    postCandidateCount:
      Number(candidateCount || 0),
    uniquePostCandidateCount:
      Object.keys(byPost).length,
    foundPostCount:
      Object.keys(foundPostIds).length,
    foundPostIds:
      Object.keys(foundPostIds).slice(0, 30),
    normalizationSamples:
      normalizationSamples,
    apiErrors:
      apiErrors.slice(0, 30)
  };

  saveFanpageDiagnosticV324_(
    companyCode,
    diagnostic
  );

  return adsMetadata;
}


function hydrateContentPostPreviewV307_(adsMetadata, token, label) {
  adsMetadata = Array.isArray(adsMetadata) ? adsMetadata : [];
  var byPost = {};
  var postIds = [];

  function addPost(postId, ad, priority, sourceKind) {
    postId = String(postId || '').trim();
    if (!postId) return;
    if (!byPost[postId]) { byPost[postId] = []; postIds.push(postId); }
    byPost[postId].push({
      ad: ad,
      priority: Number(priority || 0),
      sourceKind: String(sourceKind || '')
    });
  }

  adsMetadata.forEach(function(ad){
    var creative=ad&&ad.creative&&typeof ad.creative==='object'?ad.creative:{};
    // V317: truy bài gốc trước; effective story chỉ là fallback.
    addPost(creative.source_facebook_post_id, ad, 300, 'source_facebook_post_id');
    addPost(creative.object_story_id, ad, 250, 'object_story_id');
    addPost(creative.effective_object_story_id, ad, 200, 'effective_object_story_id');
  });

  if (!postIds.length) return adsMetadata;
  var chunkSize=40;
  for (var offset=0; offset<postIds.length; offset+=chunkSize) {
    var chunk=postIds.slice(offset,offset+chunkSize);
    var url='https://graph.facebook.com/'+META_API_VERSION+'/?ids='+encodeURIComponent(chunk.join(','))+'&fields='+
      encodeURIComponent('message,full_picture,permalink_url,attachments{media_type,type,media,target{id,url},subattachments{media_type,type,media,url,target{id,url},title,description},url,title,description}');
    var response=UrlFetchApp.fetch(url,{method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
    var payload=parseMetaResponse_(response,label+' lô '+(Math.floor(offset/chunkSize)+1));

    var targetsByPost={};
    var allPhotoIds=[];
    Object.keys(payload||{}).forEach(function(postId){
      var post=payload[postId];
      if(!post||post.error)return;
      var ids=collectFanpagePhotoTargetsV310_(post);
      targetsByPost[postId]=ids;
      allPhotoIds=allPhotoIds.concat(ids);
    });

    var originalPhotoMap={};
    try { originalPhotoMap=fetchFanpageOriginalPhotosV310_(allPhotoIds,token,label+' Original Photo V317'); }
    catch(originalError){ console.warn(label+' không lấy được Photo.images V317: '+originalError.message); originalPhotoMap={}; }

    Object.keys(payload||{}).forEach(function(postId){
      var post=payload[postId];
      if(!post||post.error)return;

      var gallery=[];
      try { gallery=extractFacebookPostGalleryV223_(post)||[]; } catch(e){ gallery=[]; }

      var originalCandidates=(targetsByPost[postId]||[]).map(function(id){
        var item=originalPhotoMap[id];
        return item&&item.url?{
          url:item.url,
          width:Number(item.width||0),
          height:Number(item.height||0),
          source:'facebook_photo_images_original',
          photoId:String(id||'')
        }:null;
      }).filter(Boolean);

      originalCandidates=sortPosterCandidatesV317_(originalCandidates);
      gallery=sortPosterCandidatesV317_(gallery);

      // Nguồn ưu tiên tuyệt đối: Photo.images của bài gốc. Attachment chỉ fallback.
      var best=originalCandidates[0] || gallery[0] || null;
      var combined=[]; var seenUrls={};
      originalCandidates.concat(gallery).forEach(function(item){
        if(!item||!item.url||seenUrls[item.url])return; seenUrls[item.url]=true;
        combined.push({
          url:String(item.url),
          width:Number(item.width||0),
          height:Number(item.height||0),
          source:String(item.source||'facebook_post_attachment'),
          photoId:String(item.photoId||'')
        });
      });

      (byPost[postId]||[]).forEach(function(link){
        var ad=link&&link.ad;
        if(!ad||!ad.creative||typeof ad.creative!=='object')return;
        var creative=ad.creative;
        var incomingPriority=Number(link.priority||0);
        var currentPriority=Number(creative._v317_fanpage_post_priority||0);

        // Caption/permalink cũng ưu tiên source post gốc.
        if (incomingPriority >= currentPriority) {
          if(post.message) creative._v307_post_message=String(post.message||'').trim();
          if(post.permalink_url) creative._v307_post_permalink=String(post.permalink_url||'').trim();
        }

        if(best&&best.url&&incomingPriority>=currentPriority){
          creative._v317_fanpage_post_priority=incomingPriority;
          creative._v317_fanpage_post_source=String(link.sourceKind||'');
          creative._v310_fanpage_original_image=String(best.url||'').trim();
          creative._v310_fanpage_original_width=Number(best.width||0);
          creative._v310_fanpage_original_height=Number(best.height||0);
          creative._v310_fanpage_original_source=String(best.source||'facebook_post_attachment');
          creative._v309_fanpage_image=creative._v310_fanpage_original_image;
          creative._v309_fanpage_width=creative._v310_fanpage_original_width;
          creative._v309_fanpage_height=creative._v310_fanpage_original_height;
          creative._v309_fanpage_source=creative._v310_fanpage_original_source;
          creative._v309_fanpage_gallery=combined;
        }

        // full_picture chỉ fallback nếu không có Photo.images/attachment của bài.
        if(post.full_picture&&incomingPriority>=currentPriority) creative._v307_post_image=String(post.full_picture||'').trim();
        if(!creative._v309_fanpage_image&&creative._v307_post_image&&incomingPriority>=currentPriority){
          creative._v317_fanpage_post_priority=incomingPriority;
          creative._v317_fanpage_post_source=String(link.sourceKind||'');
          creative._v309_fanpage_image=creative._v307_post_image;
          creative._v309_fanpage_width=0;
          creative._v309_fanpage_height=0;
          creative._v309_fanpage_source='facebook_full_picture';
        }
      });
    });
  }
  return adsMetadata;
}

function getMetaAdsSummaryV207_(company, from, to) {
  validateDateRange_(from, to);

  const resolved = getMetaAccountForCompanyV207_(company);
  const config = resolved.config;
  const account = resolved.account;
  const companyCode = resolved.companyCode;

  const insightFields = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'frequency',
    'actions',
    'cost_per_action_type',
    'date_start',
    'date_stop'
  ].join(',');

  const adsetFields = [
    'id',
    'name',
    'effective_status',
    'status',
    'created_time',
    'updated_time',
    'start_time',
    'end_time',
    'daily_budget',
    'lifetime_budget',
    'campaign{id,name}'
  ].join(',');

  /*
   * V214 Activity 3 cấp:
   * - Adset: dùng chính metadata adsets đã tải cho bảng summary, không gọi thêm.
   * - Campaign: tải metadata nhẹ để phát hiện tạo mới/đổi tên/trạng thái/lịch/ngân sách CBO/mục tiêu.
   * - Ad: tải metadata nhẹ để phát hiện bài mới/đổi tên/trạng thái.
   * Không lấy Insights cấp bài tại request summary.
   */
  const activityCampaignFields = [
    'id',
    'name',
    'effective_status',
    'status',
    'created_time',
    'updated_time',
    'start_time',
    'stop_time',
    'daily_budget',
    'lifetime_budget',
    'objective'
  ].join(',');

  const activityAdFields = [
    'id',
    'name',
    'effective_status',
    'status',
    'created_time',
    'updated_time',
    'adset{id,name}',
    'campaign{id,name}',
    'creative{id,name,thumbnail_url,image_url,image_hash,video_id,object_type,object_story_id,effective_object_story_id,source_facebook_post_id,object_story_spec,asset_feed_spec,call_to_action_type,link_url,title,body}'
  ].join(',');

  const activityAdInsightFieldsV307 = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'frequency',
    'actions',
    'cost_per_action_type',
    'date_start',
    'date_stop'
  ].join(',');

  const insightsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/insights',
    {
      level: 'adset',
      use_unified_attribution_setting: true,
      fields: insightFields,
      time_range: JSON.stringify({
        since: from,
        until: to
      }),
      limit: 500
    }
  );

  const adsetsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/adsets',
    {
      fields: adsetFields,
      limit: 500
    }
  );

  const activityCampaignsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/campaigns',
    {
      fields: activityCampaignFields,
      limit: 500
    }
  );

  const activityAdsUrl = buildMetaUrl_(
    'act_' + account.accountId + '/ads',
    {
      fields: activityAdFields,
      limit: 500
    }
  );

  const activityAdInsightsUrlV307 = buildMetaUrl_(
    'act_' + account.accountId + '/insights',
    {
      level: 'ad',
      use_unified_attribution_setting: true,
      fields: activityAdInsightFieldsV307,
      time_range: JSON.stringify({since: from, until: to}),
      limit: 500
    }
  );

  // Hai nguồn độc lập nên tải song song trang đầu; phần paging tiếp tục dùng helper chuẩn.
  // Để giữ paging đầy đủ và logic cũ ổn định, dùng fetchMetaPages_ cho từng nguồn.
  const insights = fetchMetaPages_(
    insightsUrl,
    (account.token || config.token),
    companyCode + ' Summary Insights'
  );

  const adsets = fetchMetaPages_(
    adsetsUrl,
    (account.token || config.token),
    companyCode + ' Summary Adsets'
  );

  /*
   * Activity metadata là lớp phụ trợ.
   * Nếu một endpoint phụ bị lỗi, bảng Meta Live chính vẫn phải hoạt động.
   */
  let activityCampaigns = [];
  try {
    activityCampaigns = fetchMetaPages_(
      activityCampaignsUrl,
      (account.token || config.token),
      companyCode + ' Activity Campaigns V214'
    );
  } catch (activityCampaignsError) {
    console.warn(
      companyCode +
      ' không tải được Activity Campaigns V214: ' +
      activityCampaignsError.message
    );
    activityCampaigns = [];
  }

  let activityAds = [];
  try {
    activityAds = fetchMetaPages_(
      activityAdsUrl,
      (account.token || config.token),
      companyCode + ' Activity Ads V214'
    );
  } catch (activityAdsError) {
    console.warn(
      companyCode +
      ' không tải được Activity Ads V214: ' +
      activityAdsError.message
    );
    activityAds = [];
  }

  let activityAdInsightsV307 = [];
  try {
    activityAdInsightsV307 = fetchMetaPages_(
      activityAdInsightsUrlV307,
      (account.token || config.token),
      companyCode + ' Content Ad Insights V307'
    );
  } catch (activityAdInsightsErrorV307) {
    console.warn(
      companyCode +
      ' không tải được Content Ad Insights V307: ' +
      activityAdInsightsErrorV307.message
    );
    activityAdInsightsV307 = [];
  }

  const activityAdInsightsByIdV307 = {};
  activityAdInsightsV307.forEach(function (insight) {
    const adId = String(insight && insight.ad_id || '');
    if (adId) activityAdInsightsByIdV307[adId] = insight;
  });

  /* V328: nếu /ads đầy đủ rỗng/lỗi, thử endpoint nhẹ trước khi dùng Insights. */
  if (!activityAds.length) {
    try {
      const activityAdsFallbackUrlV328 = buildMetaUrl_(
        'act_' + account.accountId + '/ads',
        {
          fields:[
            'id','name','effective_status','status','created_time','updated_time',
            'adset{id,name}','campaign{id,name}',
            'creative{id,name,object_story_id,effective_object_story_id,object_story_spec,thumbnail_url,image_url}'
          ].join(','),
          limit:500
        }
      );
      activityAds = fetchMetaPages_(
        activityAdsFallbackUrlV328,
        (account.token || config.token),
        companyCode + ' Activity Ads Fallback V328'
      );
    } catch (activityAdsFallbackErrorV328) {
      console.warn(companyCode + ' Activity Ads fallback V328 lỗi: ' + activityAdsFallbackErrorV328.message);
    }
  }

  if (!activityAds.length && activityAdInsightsV307.length) {
    activityAds = contentManagerBuildAdsFromInsightsV328_(activityAdInsightsV307);
    console.warn(companyCode + ' V328 dựng cây Ads từ Ad Insights vì endpoint /ads không trả dữ liệu.');
  }

  // V317: Poster Resolver theo độ tin cậy nguồn, KHÔNG theo số pixel render giả.
  // Thứ tự: Photo.images bài Fanpage -> Ad Images image_hash -> attachment/full_picture
  // -> rendered creative -> thumbnail. Rendered 4096 chỉ là fallback và không được coi là 4096px thật.
  const contentActivityAdsV317 = activityAds.filter(function (ad) {
    const adId = String(ad && ad.id || '');
    const status = String(ad && (ad.effective_status || ad.status) || '').toUpperCase();
    return !!activityAdInsightsByIdV307[adId] ||
      ['ACTIVE','PREPARING','IN_PROCESS','PENDING_REVIEW','SCHEDULED'].indexOf(status) >= 0;
  });

  // Bước 1: truy bài gốc / Photo.images trước.
  try {
    hydrateStrictFanpageContentV327_(
      contentActivityAdsV317,
      (account.token || config.token),
      companyCode,
      companyCode + ' Content Strict Fanpage V321'
    );
  } catch (contentPostErrorV317) {
    console.warn(companyCode + ' không tải được poster/caption Fanpage V317: ' + contentPostErrorV317.message);
  }

  // Bước 2: image_hash/asset_feed_spec đã có trong metadata -> Ad Images gốc.
  try {
    hydrateHighResolutionAdImagesV217_(
      account.accountId,
      contentActivityAdsV317,
      (account.token || config.token),
      companyCode + ' Summary Ad Images Original V317'
    );
  } catch (summaryHighResErrorV317) {
    console.warn(companyCode + ' không lấy được Ad Images gốc V317: ' + summaryHighResErrorV317.message);
  }

  // V320: lấy nguồn video trực tiếp cho khung nội dung bên phải.
  // Nếu Meta không trả source, frontend vẫn dùng thumbnail + nút mở bài Facebook.
  try {
    hydrateVideoThumbnailsV221_(
      contentActivityAdsV317,
      (account.token || config.token),
      companyCode + ' Summary Video Thumbnails V320'
    );
  } catch (summaryVideoThumbErrorV320) {
    console.warn(companyCode + ' không lấy được thumbnail video V320: ' + summaryVideoThumbErrorV320.message);
  }

  try {
    hydrateVideoNodeFallbackV223_(
      contentActivityAdsV317,
      (account.token || config.token),
      companyCode + ' Summary Direct Video Source V320'
    );
  } catch (summaryVideoSourceErrorV320) {
    console.warn(companyCode + ' không lấy được source video V320: ' + summaryVideoSourceErrorV320.message);
  }

  // Bước 3: chỉ những bài vẫn chưa có nguồn tin cậy mới gọi rendered/direct creative.
  const contentFallbackAdsV317 = contentActivityAdsV317.filter(function (ad) {
    return !hasTrustedPosterV317_(ad);
  });
  if (contentFallbackAdsV317.length) {
    try {
      hydrateRenderedCreativeThumbnailsV220_(
        contentFallbackAdsV317,
        (account.token || config.token),
        companyCode + ' Summary Creative Fallback 4096 V317'
      );
    } catch (summaryRenderedErrorV317) {
      console.warn(companyCode + ' không lấy được rendered fallback V317: ' + summaryRenderedErrorV317.message);
    }

    // Direct AdCreative có thể vừa bổ sung image_hash -> thử Ad Images thêm một lần.
    try {
      hydrateHighResolutionAdImagesV217_(
        account.accountId,
        contentFallbackAdsV317,
(account.token || config.token),
        companyCode + ' Summary Ad Images Retry V317'
      );
    } catch (summaryHighResRetryErrorV317) {
      console.warn(companyCode + ' không lấy được Ad Images retry V317: ' + summaryHighResRetryErrorV317.message);
    }
  }

  const insightsByAdsetId = {};
  insights.forEach(function (insight) {
    const adsetId = String(insight && insight.adset_id || '');
    if (adsetId) insightsByAdsetId[adsetId] = insight;
  });

  const adsetsById = {};
  adsets.forEach(function (adset) {
    const adsetId = String(adset && adset.id || '');
    if (adsetId) adsetsById[adsetId] = adset;
  });

  const rowIds = [];
  const seen = {};

  adsets.forEach(function (metadata) {
    const adsetId = String(metadata && metadata.id || '');
    if (!adsetId) return;

    if (isMetaObjectEndedBeforePeriod_(metadata, from)) return;

    const hasInsight = !!insightsByAdsetId[adsetId];
    if (!isMetaAdsetRelevantToPeriod_(metadata, from, to, hasInsight)) return;

    seen[adsetId] = true;
    rowIds.push(adsetId);
  });

  // Nếu metadata edge chưa trả nhưng Insights có số liệu thì vẫn giữ hàng lịch sử.
  insights.forEach(function (insight) {
    const adsetId = String(insight && insight.adset_id || '');
    if (!adsetId || seen[adsetId]) return;
    seen[adsetId] = true;
    rowIds.push(adsetId);
  });

  const syncedAt = Utilities.formatDate(
    new Date(),
    META_TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );

  const rows = rowIds.map(function (adsetId) {
    const insight = insightsByAdsetId[adsetId] || {};
    const metadata = adsetsById[adsetId] || {};
    const fullName = metadata.name || insight.adset_name || '';
    const nameParts = parseAdsetName_(fullName);

    const messages = getActionValue_(
      insight.actions,
      'onsite_conversion.messaging_conversation_started_7d'
    );

    const purchases = getActionValue_(
      insight.actions,
      'omni_purchase'
    );

    const costPerMessage = getActionValue_(
      insight.cost_per_action_type,
      'onsite_conversion.messaging_conversation_started_7d'
    );

    const costPerPurchase = getActionValue_(
      insight.cost_per_action_type,
      'omni_purchase'
    );

    const campaign = metadata.campaign && typeof metadata.campaign === 'object'
      ? metadata.campaign
      : {};

    const linkCtrMetrics = getMetaLinkCtrMetrics_(insight);
    const spend = toNumber_(insight.spend);
    const impressions = linkCtrMetrics.impressions;
    const reach = toNumber_(insight.reach);
    const clicks = toNumber_(insight.clicks);
    const hasDeliveryData = (
      spend > 0 ||
      impressions > 0 ||
      reach > 0 ||
      clicks > 0 ||
      linkCtrMetrics.linkClicks > 0 ||
      messages > 0 ||
      purchases > 0
    );

    const deliveryStatus = resolveMetaDeliveryStatus_(
      metadata,
      hasDeliveryData
    );

    return {
      source: 'meta_api',
      payload_mode: 'summary',
      details_loaded: false,
      company: companyCode,
      accountId: account.accountId,
      campaignId: campaign.id || insight.campaign_id || '',
      campaignName: campaign.name || insight.campaign_name || '',
      adsetId: adsetId,

      // V207: KHÔNG gửi danh sách bài ở request mở công ty.
      ads: [],
      adCount: null,

      fullName: fullName,
      employee: nameParts.employee,
      adName: nameParts.adName,
      productName: nameParts.productName || '',
      sku: nameParts.sku || '',
      skus: nameParts.sku ? [nameParts.sku] : [],
      adsetCompanyCode: nameParts.companyCode || '',
      adsetNamingMode: nameParts.namingMode || 'legacy',
      spend: spend,
      result: purchases,
      messages: messages,
      ctr: linkCtrMetrics.ctr,
      ctrType: linkCtrMetrics.ctrType,
      linkClicks: linkCtrMetrics.linkClicks,
      freq: toNumber_(insight.frequency),
      rawCpm: costPerMessage,
      rawCpa: costPerPurchase,
      impressions: impressions,
      reach: reach,
      clicks: clicks,
      run_start: metadata.start_time || metadata.created_time || '',
      run_end: metadata.end_time || '',
      created_time: metadata.created_time || '',
      updated_time: metadata.updated_time || '',
      status: deliveryStatus || metadata.effective_status || metadata.status || '',
      delivery_status: deliveryStatus || metadata.effective_status || metadata.status || '',
      effective_status: metadata.effective_status || '',
      configured_status: metadata.status || '',
      raw_effective_status: metadata.effective_status || '',
      raw_configured_status: metadata.status || '',
      daily_budget: metadata.daily_budget !== undefined
        ? toNumber_(metadata.daily_budget)
        : null,
      lifetime_budget: metadata.lifetime_budget !== undefined
        ? toNumber_(metadata.lifetime_budget)
        : null,
      has_insights: !!insightsByAdsetId[adsetId],
      has_delivery_data: hasDeliveryData,
      data_state: hasDeliveryData ? 'delivered' : 'configured_only',
      report_start: insight.date_start || from,
      report_end: insight.date_stop || to,
      report_start_iso: insight.date_start || from,
      report_end_iso: insight.date_stop || to,
      report_month: String(insight.date_stop || to).slice(0, 7),
      syncedAt: syncedAt
    };
  });

  return {
    success: true,
    source: 'meta_api',
    payloadMode: 'summary',
    metricVersion: 'v214_lazy_summary_activity_3_levels_exact',
    company: companyCode,
    companyName: account.name,
    accountId: account.accountId,
    period: {from: from, to: to},
    syncedAt: syncedAt,
    cacheInfo: (function () {
      const serverNowMs = Date.now();
      return {
        hit: false,
        ttlSeconds: META_CACHE_SECONDS,
        fetchedAt: syncedAt,
        serverNowMs: serverNowMs,
        storedAtMs: serverNowMs,
        expiresAtMs: serverNowMs + (META_CACHE_SECONDS * 1000),
        remainingMs: META_CACHE_SECONDS * 1000,
        remainingSeconds: META_CACHE_SECONDS,
        cacheVersion: 'V208_SERVER_TTL_REALTIME_COUNTDOWN',
        payloadMode: 'summary'
      };
    })(),
    /*
     * V214 — metadata Activity 3 cấp.
     * Các mảng này KHÔNG phải Insights; chỉ dùng so sánh trạng thái giữa các fresh sync.
     */
    activityCampaigns: activityCampaigns.map(function (campaign) {
      return {
        id: String(campaign && campaign.id || ''),
        name: String(campaign && campaign.name || ''),
        effective_status: String(campaign && campaign.effective_status || ''),
        status: String(campaign && campaign.status || ''),
        created_time: String(campaign && campaign.created_time || ''),
        updated_time: String(campaign && campaign.updated_time || ''),
        start_time: String(campaign && campaign.start_time || ''),
        stop_time: String(campaign && campaign.stop_time || ''),
        daily_budget:
          campaign && campaign.daily_budget !== undefined
            ? toNumber_(campaign.daily_budget)
            : 0,
        lifetime_budget:
          campaign && campaign.lifetime_budget !== undefined
            ? toNumber_(campaign.lifetime_budget)
            : 0,
        objective: String(campaign && campaign.objective || '')
      };
    }),

    /*
     * Không gọi thêm endpoint Adset: tận dụng đúng `adsets` đang dùng cho bảng chính.
     */
    activityAdsets: adsets.map(function (adset) {
      const campaign =
        adset && adset.campaign && typeof adset.campaign === 'object'
          ? adset.campaign
          : {};

      return {
        id: String(adset && adset.id || ''),
        name: String(adset && adset.name || ''),
        effective_status: String(adset && adset.effective_status || ''),
        status: String(adset && adset.status || ''),
        created_time: String(adset && adset.created_time || ''),
        updated_time: String(adset && adset.updated_time || ''),
        start_time: String(adset && adset.start_time || ''),
        end_time: String(adset && adset.end_time || ''),
        daily_budget:
          adset && adset.daily_budget !== undefined
            ? toNumber_(adset.daily_budget)
            : 0,
        lifetime_budget:
          adset && adset.lifetime_budget !== undefined
            ? toNumber_(adset.lifetime_budget)
            : 0,
        campaign: {
          id: String(campaign.id || ''),
          name: String(campaign.name || '')
        }
      };
    }),

    activityAds: activityAds.map(function (ad) {
      const adset =
        ad && ad.adset && typeof ad.adset === 'object'
          ? ad.adset
          : {};
      const campaign =
        ad && ad.campaign && typeof ad.campaign === 'object'
          ? ad.campaign
          : {};
      const creative =
        ad && ad.creative && typeof ad.creative === 'object'
          ? ad.creative
          : {};
      const preview = extractMetaCreativePreviewV215_(creative);
      const adId = String(ad && ad.id || '');
      const insight = activityAdInsightsByIdV307[adId] || {};
      const nameParts = parseAdsetName_(String(adset.name || insight.adset_name || ''));
      const messages = getActionValue_(
        insight.actions,
        'onsite_conversion.messaging_conversation_started_7d'
      );
      const purchases = getActionValue_(
        insight.actions,
        'omni_purchase'
      );
      const costPerMessage = getActionValue_(
        insight.cost_per_action_type,
        'onsite_conversion.messaging_conversation_started_7d'
      );
      const costPerPurchase = getActionValue_(
        insight.cost_per_action_type,
        'omni_purchase'
      );
      const linkMetrics = getMetaLinkCtrMetrics_(insight);
      const spend = toNumber_(insight.spend);
      const hasDeliveryData = (
        spend > 0 ||
        toNumber_(insight.impressions) > 0 ||
        toNumber_(insight.reach) > 0 ||
        toNumber_(insight.clicks) > 0 ||
        linkMetrics.linkClicks > 0 ||
        messages > 0 ||
        purchases > 0
      );

      return {
        id: adId,
        adId: adId,
        name: String(ad && ad.name || insight.ad_name || ''),
        company: companyCode,
        employee: nameParts.employee || '',
        productName: nameParts.productName || nameParts.adName || '',
        sku: nameParts.sku || '',
        effective_status: String(ad && ad.effective_status || ''),
        status: String(ad && ad.status || ''),
        created_time: String(ad && ad.created_time || ''),
        updated_time: String(ad && ad.updated_time || ''),
        adsetId: String(adset.id || insight.adset_id || ''),
        adset: {
          id: String(adset.id || insight.adset_id || ''),
          name: String(adset.name || insight.adset_name || '')
        },
        campaign: {
          id: String(campaign.id || insight.campaign_id || ''),
          name: String(campaign.name || insight.campaign_name || '')
        },
        spend: spend,
        result: purchases,
        messages: messages,
        ctr: linkMetrics.ctr,
        ctrType: linkMetrics.ctrType,
        linkClicks: linkMetrics.linkClicks,
        freq: toNumber_(insight.frequency),
        impressions: toNumber_(insight.impressions),
        reach: toNumber_(insight.reach),
        clicks: toNumber_(insight.clicks),
        rawCpm: costPerMessage,
        rawCpa: costPerPurchase,
        has_insights: !!activityAdInsightsByIdV307[adId],
        has_delivery_data: hasDeliveryData,
        data_state: hasDeliveryData ? 'delivered' : 'configured_only',
        report_start: String(insight.date_start || from),
        report_end: String(insight.date_stop || to),
        preview_type: preview.preview_type || '',
        fanpage_post_found: !!creative._v321_fanpage_post_found,
        fanpage_post_id: String(creative._v321_fanpage_post_id || ''),
        fanpage_page_id: String(creative._v321_fanpage_page_id || ''),
        fanpage_page_name: String(creative._v321_fanpage_page_name || ''),
        fanpage_post_message: String(creative._v321_fanpage_post_message || ''),
        fanpage_post_permalink: String(creative._v321_fanpage_post_permalink || ''),
        fanpage_post_created_time: String(creative._v321_fanpage_post_created_time || ''),
        fanpage_media_kind: String(creative._v321_fanpage_media_kind || ''),
        fanpage_video_id: String(creative._v321_fanpage_video_id || ''),
        fanpage_video_source_url: String(creative._v321_fanpage_video_source_url || ''),
        fanpage_video_permalink_url: String(creative._v321_fanpage_video_permalink_url || ''),
        fanpage_content_source: creative._v321_fanpage_post_found ? 'facebook_page_api' : '',
        fanpage_content_version: 'V330_R1_EXACT_POST_FIRST_NO_MIXED_BATCH',
        fanpage_error_code: String(creative._v327_fanpage_error_code || ''),
        fanpage_error_message: String(creative._v327_fanpage_error_message || ''),
        fanpage_resolution_path: String(creative._v327_fanpage_resolution_path || ''),
        fanpage_token_source: String(creative._v327_fanpage_token_source || ''),
        fanpage_attempts: Number(creative._v327_fanpage_attempts || 0),
        fanpage_candidate_ids: Array.isArray(creative._v327_fanpage_candidate_ids) ? creative._v327_fanpage_candidate_ids : [],
        fanpage_media_url: creative._v321_fanpage_media_url || '',
        fanpage_media_width: Number(creative._v321_fanpage_media_width || 0),
        fanpage_media_height: Number(creative._v321_fanpage_media_height || 0),
        fanpage_media_source: creative._v321_fanpage_media_source || '',
        fanpage_gallery: Array.isArray(creative._v321_fanpage_gallery) ? creative._v321_fanpage_gallery : [],
        primary_media_url: creative._v309_fanpage_image || creative._v307_post_image || preview.primary_media_url || '',
        primary_media_source: creative._v309_fanpage_image ? (creative._v309_fanpage_source || 'facebook_post_attachment') : (creative._v307_post_image ? 'facebook_full_picture' : (preview.primary_media_source || '')),
        primary_media_kind: preview.primary_media_kind || '',
        primary_media_width: Number(creative._v309_fanpage_width || preview.primary_media_width || 0),
        primary_media_height: Number(creative._v309_fanpage_height || preview.primary_media_height || 0),
        media_gallery: Array.isArray(creative._v309_fanpage_gallery) && creative._v309_fanpage_gallery.length ? creative._v309_fanpage_gallery : (Array.isArray(preview.media_gallery) ? preview.media_gallery : []),
        image_url: preview.image_url || '',
        thumbnail_url: preview.thumbnail_url || '',
        rendered_thumbnail_url: preview.rendered_thumbnail_url || '',
        highres_image_url: preview.highres_image_url || '',
        highres_width: Number(preview.highres_width || 0),
        highres_height: Number(preview.highres_height || 0),
        highres_image_hash: preview.highres_image_hash || '',
        video_thumbnail_url: preview.video_thumbnail_url || '',
        video_thumbnail_width: Number(preview.video_thumbnail_width || 0),
        video_thumbnail_height: Number(preview.video_thumbnail_height || 0),
        video_source_url: creative._v321_fanpage_video_source_url || preview.video_source_url || '',
        video_permalink_url: preview.video_permalink_url || creative._v223_video_permalink || '',
        video_id: preview.video_id || creative._v320_video_id || '',
        preview_body: creative._v307_post_message || preview.body || '',
        preview_title: preview.title || '',
        preview_description: preview.description || '',
        preview_cta: preview.cta || '',
        preview_destination_url: preview.destination_url || '',
        preview_post_url: creative._v307_post_permalink || preview.post_url || ''
      };
    }),

    totals: calculateTotals_(rows),
    rows: rows
  };
}

function getMetaAdsSummaryCachedV207_(company, from, to) {
  const key = buildMetaV207SummaryCacheKey_(company, from, to);
  const cached = readMetaV207Cache_(key, 'summary');
  if (cached) return cached;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const afterLock = readMetaV207Cache_(key, 'summary');
    if (afterLock) return afterLock;

    const result = getMetaAdsSummaryV207_(company, from, to);
    writeMetaV207Cache_(key, result);
    return result;
  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}

function getMetaAdDetailV207_(company, from, to, adsetId) {
  validateDateRange_(from, to);

  const resolved = getMetaAccountForCompanyV207_(company);
  const config = resolved.config;
  const account = resolved.account;
  const companyCode = resolved.companyCode;
  const safeAdsetId = String(adsetId || '').trim();

  if (!/^\d+$/.test(safeAdsetId)) {
    throw new Error('Adset ID không hợp lệ.');
  }

  const adInsightFields = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'frequency',
    'actions',
    'cost_per_action_type',
    'date_start',
    'date_stop'
  ].join(',');

  const adFields = [
    'id',
    'name',
    'effective_status',
    'status',
    'created_time',
    'updated_time',
    'adset{id,name}',
    'campaign{id,name}',
    'creative{id,name,thumbnail_url,image_url,image_hash,video_id,object_type,object_story_id,effective_object_story_id,source_facebook_post_id,source_instagram_media_id,effective_instagram_media_id,instagram_permalink_url,object_story_spec,asset_feed_spec}'
  ].join(',');

  const adInsightsUrl = buildMetaUrl_(
    safeAdsetId + '/insights',
    {
      level: 'ad',
      use_unified_attribution_setting: true,
      fields: adInsightFields,
      time_range: JSON.stringify({since: from, until: to}),
      limit: 500
    }
  );

  const adsUrl = buildMetaUrl_(
    safeAdsetId + '/ads',
    {
      fields: adFields,
      limit: 500
    }
  );

  let adsMetadata = [];
  try {
    adsMetadata = fetchMetaPages_(
      adsUrl,
      (account.token || config.token),
      companyCode + ' Detail Ads ' + safeAdsetId
    );
  } catch (error) {
    console.warn('Không tải được metadata bài ' + safeAdsetId + ': ' + error.message);
  }


  // V317 DETAIL: dùng cùng thứ tự nguồn với Summary.
  // Truy bài Fanpage/Photo.images trước, sau đó Ad Images; rendered chỉ cho bài chưa có nguồn tốt.
  try {
    hydrateStrictFanpageContentV327_(adsMetadata, (account.token || config.token), companyCode, companyCode + ' Detail Strict Fanpage V321 ' + safeAdsetId);
  } catch (fanpageDetailFirstErrorV317) {
    console.warn(companyCode + ' không lấy được poster Fanpage V317 cho adset ' + safeAdsetId + ': ' + fanpageDetailFirstErrorV317.message);
  }

  try {
    hydrateHighResolutionAdImagesV217_(
      account.accountId,
      adsMetadata,
      (account.token || config.token),
      companyCode + ' Detail Ad Images Original V317 ' + safeAdsetId
    );
  } catch (highResErrorV317) {
    console.warn(companyCode + ' không lấy được Ad Images V317 cho adset ' + safeAdsetId + ': ' + highResErrorV317.message);
  }

  var detailFallbackAdsV317 = adsMetadata.filter(function (ad) {
    return !hasTrustedPosterV317_(ad);
  });
  if (detailFallbackAdsV317.length) {
    try {
      hydrateRenderedCreativeThumbnailsV220_(
        detailFallbackAdsV317,
        (account.token || config.token),
        companyCode + ' Detail Creative Fallback 4096 V317 ' + safeAdsetId
      );
    } catch (renderedDetailErrorV317) {
      console.warn(companyCode + ' không lấy được rendered fallback V317 cho adset ' + safeAdsetId + ': ' + renderedDetailErrorV317.message);
    }
    try {
      hydrateHighResolutionAdImagesV217_(
        account.accountId,
        detailFallbackAdsV317,
        (account.token || config.token),
        companyCode + ' Detail Ad Images Retry V317 ' + safeAdsetId
      );
    } catch (highResRetryErrorV317) {
      console.warn(companyCode + ' không lấy được Ad Images retry V317 cho adset ' + safeAdsetId + ': ' + highResRetryErrorV317.message);
    }
  }

  try {
    hydrateVideoThumbnailsV221_(
      adsMetadata,
      (account.token || config.token),
      companyCode + ' Detail Video Thumbnails V221 ' + safeAdsetId
    );
  } catch (videoThumbError) {
    console.warn(
      companyCode +
      ' không lấy được video thumbnail V221 cho adset ' +
      safeAdsetId +
      ': ' +
      videoThumbError.message
    );
  }

  try {
    hydrateVideoNodeFallbackV223_(
      adsMetadata,
      (account.token || config.token),
      companyCode + ' Detail Video Node V223 ' + safeAdsetId
    );
  } catch (videoNodeError) {
    console.warn(
      companyCode +
      ' không lấy được video node V223 cho adset ' +
      safeAdsetId +
      ': ' +
      videoNodeError.message
    );
  }

  try {
    hydrateFacebookPostMediaV221_(
      adsMetadata,
      (account.token || config.token),
      companyCode + ' Detail Facebook Post Media V221 ' + safeAdsetId
    );
  } catch (postMediaError) {
    console.warn(
      companyCode +
      ' không lấy được post media V221 cho adset ' +
      safeAdsetId +
      ': ' +
      postMediaError.message
    );
  }



  const adInsights = fetchMetaPages_(
    adInsightsUrl,
    (account.token || config.token),
    companyCode + ' Detail Insights ' + safeAdsetId
  );

  const metadataById = {};
  adsMetadata.forEach(function (ad) {
    if (ad && ad.id) metadataById[String(ad.id)] = ad;
  });

  // Bài đã xóa khỏi /ads nhưng vẫn có Insights lịch sử.
  adInsights.forEach(function (insight) {
    const adId = String(insight && insight.ad_id || '');
    if (!adId || metadataById[adId]) return;
    metadataById[adId] = {
      id: adId,
      name: insight.ad_name || '',
      effective_status: 'DELETED',
      status: 'DELETED',
      deleted_from_meta: true,
      adset: {
        id: insight.adset_id || safeAdsetId,
        name: insight.adset_name || ''
      },
      campaign: {
        id: insight.campaign_id || '',
        name: insight.campaign_name || ''
      }
    };
  });

  const syncedAt = Utilities.formatDate(
    new Date(),
    META_TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );

  const grouped = buildMetaAdsByAdset_(
    adInsights,
    metadataById,
    from,
    to,
    syncedAt
  );

  const ads = grouped[safeAdsetId] || [];

  return {
    success: true,
    source: 'meta_api',
    payloadMode: 'ad_details',
    company: companyCode,
    adsetId: safeAdsetId,
    period: {from: from, to: to},
    syncedAt: syncedAt,
    cacheInfo: {
      hit: false,
      ttlSeconds: META_CACHE_SECONDS,
      fetchedAt: syncedAt,
      cacheVersion: 'V208_SERVER_TTL_REALTIME_COUNTDOWN',
      payloadMode: 'ad_details'
    },
    adCount: ads.length,
    ads: ads
  };
}

function getMetaAdDetailCachedV207_(company, from, to, adsetId) {
  const key = buildMetaV207DetailCacheKey_(company, from, to, adsetId);
  const cached = readMetaV207Cache_(key, 'ad_details');
  if (cached) return cached;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const afterLock = readMetaV207Cache_(key, 'ad_details');
    if (afterLock) return afterLock;

    const result = getMetaAdDetailV207_(company, from, to, adsetId);
    writeMetaV207Cache_(key, result);
    return result;
  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}

function getMetaAdDetailsBatchV207_(company, from, to, adsetIds) {
  const ids = Array.from(new Set(
    (Array.isArray(adsetIds) ? adsetIds : [])
      .map(function (value) { return String(value || '').trim(); })
      .filter(function (value) { return /^\d+$/.test(value); })
  ));

  if (!ids.length) {
    throw new Error('Không có Adset ID hợp lệ để lấy chi tiết.');
  }

  // Một popup nhóm đã gom thường chỉ có vài adset. Giới hạn để tránh request quá rộng.
  if (ids.length > 30) {
    throw new Error('Một lần chỉ tải tối đa 30 nhóm quảng cáo chi tiết.');
  }

  const detailsByAdset = {};
  ids.forEach(function (adsetId) {
    detailsByAdset[adsetId] = getMetaAdDetailCachedV207_(
      company,
      from,
      to,
      adsetId
    );
  });

  return {
    success: true,
    source: 'meta_api',
    payloadMode: 'ad_details',
    company: String(company || '').toUpperCase(),
    period: {from: from, to: to},
    adsetIds: ids,
    detailsByAdset: detailsByAdset,
    syncedAt: Utilities.formatDate(
      new Date(),
      META_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    )
  };
}

/**
 * V207 public endpoint.
 * summary = payload mặc định, nhẹ.
 * ad_details = chỉ khi người dùng mở chi tiết một hàng đã gom.
 * full = tương thích/debug, dùng luồng V206 đầy đủ khi thật sự cần.
 */

/* =========================================================
   V331 R1 — SHARED META WARM + 2-MINUTE GLOBAL REFRESH GATE
   - Bất kỳ user hợp lệ nào cũng có thể khởi động warm 4 công ty.
   - Warm leader chỉ là lease tạm thời, KHÔNG gắn cố định với một user.
   - Nếu leader rời web / execution dừng, lease hết hạn để user khác tiếp quản.
   - Summary refresh tự động chỉ gọi Meta thật khi shared cache >= 2 phút.
   - Manual refresh có forceDirect=true vẫn được phép gọi Meta ngay.
   ========================================================= */
const META_SHARED_FRESH_MS_V331 = 2 * 60 * 1000;
const META_WARM_LEASE_MS_V331 = 5 * 60 * 1000;
const META_WARM_STATE_PREFIX_V331 = 'META_WARM_STATE_V331_';

function metaWarmStateKeyV331_(from, to) {
  return META_WARM_STATE_PREFIX_V331 +
    String(from || '').replace(/[^0-9]/g, '') + '_' +
    String(to || '').replace(/[^0-9]/g, '');
}

function readMetaWarmStateV331_(from, to) {
  var raw = String(
    PropertiesService.getScriptProperties().getProperty(
      metaWarmStateKeyV331_(from, to)
    ) || ''
  ).trim();

  if (!raw) {
    return {
      version: 'V331_SHARED_WARM',
      from: String(from || ''),
      to: String(to || ''),
      owner: '',
      leaseExpiresAt: 0,
      startedAt: 0,
      completedAt: 0,
      companies: {}
    };
  }

  try {
    var parsed = JSON.parse(raw);
    parsed.companies = parsed.companies &&
      typeof parsed.companies === 'object'
        ? parsed.companies
        : {};
    return parsed;
  } catch (error) {
    return {
      version: 'V331_SHARED_WARM',
      from: String(from || ''),
      to: String(to || ''),
      owner: '',
      leaseExpiresAt: 0,
      startedAt: 0,
      completedAt: 0,
      companies: {}
    };
  }
}

function writeMetaWarmStateV331_(from, to, state) {
  state = state && typeof state === 'object' ? state : {};
  PropertiesService.getScriptProperties().setProperty(
    metaWarmStateKeyV331_(from, to),
    JSON.stringify(state)
  );
  return state;
}

function metaSummaryCacheStateV331_(company, from, to) {
  var key = buildMetaV207SummaryCacheKey_(company, from, to);
  var cached = readMetaV207Cache_(key, 'summary');

  if (!cached) {
    return {
      key: key,
      cached: null,
      storedAtMs: 0,
      ageMs: Number.POSITIVE_INFINITY,
      fresh2m: false
    };
  }

  var cacheInfo = cached.cacheInfo || {};
  var storedAtMs = Number(cacheInfo.storedAtMs || 0);

  if (!storedAtMs) {
    storedAtMs = Date.parse(String(cached.syncedAt || '')) || 0;
  }

  var ageMs = storedAtMs > 0
    ? Math.max(0, Date.now() - storedAtMs)
    : Number.POSITIVE_INFINITY;

  return {
    key: key,
    cached: cached,
    storedAtMs: storedAtMs,
    ageMs: ageMs,
    fresh2m: Number.isFinite(ageMs) &&
      ageMs < META_SHARED_FRESH_MS_V331
  };
}

function decorateMetaSharedGateV331_(payload, info) {
  payload = payload || {};
  payload.cacheInfo = Object.assign({}, payload.cacheInfo || {}, {
    sharedGateVersion: 'V331_SHARED_2MIN_GATE',
    sharedFreshMs: META_SHARED_FRESH_MS_V331,
    sharedCacheAgeMs: Number(
      info && Number.isFinite(info.ageMs)
        ? info.ageMs
        : 0
    ),
    sharedRefreshReason: String(
      info && info.reason || ''
    ),
    sharedRefreshPerformed:
      !!(info && info.refreshed === true)
  });
  return payload;
}

function getMetaAdsSummarySmartV331_(
  company,
  from,
  to,
  refreshRequested,
  forceDirect,
  reason
) {
  validateDateRange_(from, to);

  var before = metaSummaryCacheStateV331_(
    company,
    from,
    to
  );

  if (forceDirect !== true) {
    if (before.cached && refreshRequested !== true) {
      return decorateMetaSharedGateV331_(
        before.cached,
        {
          ageMs: before.ageMs,
          reason: reason || 'cache',
          refreshed: false
        }
      );
    }

    if (before.cached && before.fresh2m) {
      return decorateMetaSharedGateV331_(
        before.cached,
        {
          ageMs: before.ageMs,
          reason: reason || 'shared_fresh',
          refreshed: false
        }
      );
    }
  }

  var lock = LockService.getScriptLock();
  var locked = false;

  try {
    locked = lock.tryLock(30000);
  } catch (lockError) {
    locked = false;
  }

  /*
   * Nếu một execution khác đang refresh, ưu tiên trả cache cũ để UI không bị treo.
   * Trường hợp chưa có cache thì mới gọi trực tiếp như fallback cuối.
   */
  if (!locked) {
    var duringBusy = metaSummaryCacheStateV331_(
      company,
      from,
      to
    );

    if (duringBusy.cached) {
      return decorateMetaSharedGateV331_(
        duringBusy.cached,
        {
          ageMs: duringBusy.ageMs,
          reason: 'shared_refresh_in_progress',
          refreshed: false
        }
      );
    }

    var emergency = getMetaAdsSummaryV207_(
      company,
      from,
      to
    );
    writeMetaV207Cache_(
      buildMetaV207SummaryCacheKey_(company, from, to),
      emergency
    );
    return decorateMetaSharedGateV331_(
      emergency,
      {
        ageMs: 0,
        reason: 'no_cache_lock_fallback',
        refreshed: true
      }
    );
  }

  try {
    var afterLock = metaSummaryCacheStateV331_(
      company,
      from,
      to
    );

    if (forceDirect !== true) {
      if (afterLock.cached && refreshRequested !== true) {
        return decorateMetaSharedGateV331_(
          afterLock.cached,
          {
            ageMs: afterLock.ageMs,
            reason: reason || 'cache_after_lock',
            refreshed: false
          }
        );
      }

      if (afterLock.cached && afterLock.fresh2m) {
        return decorateMetaSharedGateV331_(
          afterLock.cached,
          {
            ageMs: afterLock.ageMs,
            reason: reason || 'shared_fresh_after_lock',
            refreshed: false
          }
        );
      }
    }

    var result = getMetaAdsSummaryV207_(
      company,
      from,
      to
    );

    writeMetaV207Cache_(
      buildMetaV207SummaryCacheKey_(company, from, to),
      result
    );

    return decorateMetaSharedGateV331_(
      result,
      {
        ageMs: 0,
        reason: reason || (
          forceDirect === true
            ? 'manual_force'
            : 'shared_stale_refresh'
        ),
        refreshed: true
      }
    );
  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}

function claimMetaWarmLeaseV331_(from, to) {
  var lock = LockService.getScriptLock();
  var locked = false;

  try {
    locked = lock.tryLock(10000);
  } catch (error) {
    locked = false;
  }

  if (!locked) {
    var busyState = readMetaWarmStateV331_(from, to);
    return {
      leader: false,
      owner: '',
      state: busyState,
      retryAfterMs: Math.max(
        15000,
        Number(busyState.leaseExpiresAt || 0) - Date.now()
      )
    };
  }

  try {
    var now = Date.now();
    var state = readMetaWarmStateV331_(from, to);
    var activeOwner = String(state.owner || '').trim();
    var leaseExpiresAt = Number(state.leaseExpiresAt || 0);

    if (activeOwner && leaseExpiresAt > now) {
      return {
        leader: false,
        owner: activeOwner,
        state: state,
        retryAfterMs: Math.max(
          15000,
          leaseExpiresAt - now
        )
      };
    }

    var owner = Utilities.getUuid();
    state.version = 'V331_SHARED_WARM';
    state.from = String(from || '');
    state.to = String(to || '');
    state.owner = owner;
    state.startedAt = now;
    state.leaseExpiresAt = now + META_WARM_LEASE_MS_V331;
    state.companies = state.companies &&
      typeof state.companies === 'object'
        ? state.companies
        : {};

    writeMetaWarmStateV331_(from, to, state);

    return {
      leader: true,
      owner: owner,
      state: state,
      retryAfterMs: 0
    };
  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}

function warmAllMetaCompaniesV331_(
  from,
  to,
  preferredCompany
) {
  validateDateRange_(from, to);

  var allowed = ['NNV','VN','KF','ABC'];
  preferredCompany = String(
    preferredCompany || ''
  ).trim().toUpperCase();

  var lease = claimMetaWarmLeaseV331_(
    from,
    to
  );

  if (!lease.leader) {
    return {
      success: true,
      version: 'V331_SHARED_WARM',
      leader: false,
      warmInProgress: true,
      retryAfterMs: Number(
        lease.retryAfterMs || 15000
      ),
      period: {
        from: from,
        to: to
      },
      state: {
        startedAt: Number(
          lease.state && lease.state.startedAt || 0
        ),
        completedAt: Number(
          lease.state && lease.state.completedAt || 0
        ),
        leaseExpiresAt: Number(
          lease.state && lease.state.leaseExpiresAt || 0
        )
      }
    };
  }

  var owner = lease.owner;
  var order = allowed.slice();

  if (allowed.indexOf(preferredCompany) >= 0) {
    order = [preferredCompany].concat(
      allowed.filter(function (code) {
        return code !== preferredCompany;
      })
    );
  }

  var state = lease.state || {};
  state.companies = state.companies || {};
  var results = [];

  try {
    order.forEach(function (company) {
      var before = metaSummaryCacheStateV331_(
        company,
        from,
        to
      );

      var item = {
        company: company,
        success: false,
        refreshed: false,
        usedSharedCache: false,
        beforeAgeMs: Number.isFinite(before.ageMs)
          ? before.ageMs
          : null,
        rows: 0,
        syncedAt: '',
        error: ''
      };

      try {
        var summary = getMetaAdsSummarySmartV331_(
          company,
          from,
          to,
          true,
          false,
          'warm_all_first_access'
        );

        var cacheInfo = summary &&
          summary.cacheInfo
            ? summary.cacheInfo
            : {};

        item.success = true;
        item.refreshed =
          cacheInfo.sharedRefreshPerformed === true;
        item.usedSharedCache =
          !item.refreshed;
        item.rows = Array.isArray(
          summary && summary.rows
        ) ? summary.rows.length : 0;
        item.syncedAt = String(
          summary && summary.syncedAt || ''
        );
      } catch (error) {
        item.error = String(
          error && error.message || error
        );
      }

      results.push(item);

      state = readMetaWarmStateV331_(
        from,
        to
      );

      /*
       * Chỉ execution đang giữ owner mới cập nhật lease.
       * Nếu owner đã bị thay sau khi lease hết hạn thì dừng ghi.
       */
      if (String(state.owner || '') !== owner) {
        return;
      }

      state.companies = state.companies || {};
      state.companies[company] = {
        success: item.success,
        refreshed: item.refreshed,
        usedSharedCache: item.usedSharedCache,
        rows: item.rows,
        syncedAt: item.syncedAt,
        error: item.error,
        checkedAt: Date.now()
      };

      state.leaseExpiresAt =
        Date.now() + META_WARM_LEASE_MS_V331;

      writeMetaWarmStateV331_(
        from,
        to,
        state
      );
    });
  } finally {
    state = readMetaWarmStateV331_(
      from,
      to
    );

    if (String(state.owner || '') === owner) {
      state.owner = '';
      state.leaseExpiresAt = 0;
      state.completedAt = Date.now();
      writeMetaWarmStateV331_(
        from,
        to,
        state
      );
    }
  }

  return {
    success: results.some(function (item) {
      return item.success;
    }),
    version: 'V331_SHARED_WARM',
    leader: true,
    warmInProgress: false,
    retryAfterMs: 0,
    period: {
      from: from,
      to: to
    },
    order: order,
    results: results,
    completedAt: Number(
      state.completedAt || Date.now()
    )
  };
}


function getMetaAdsForUser(request) {
  request = request || {};

  const firebaseIdToken = String(request.firebaseIdToken || '').trim();
  if (!firebaseIdToken) {
    throw new Error('Không tìm thấy phiên đăng nhập Firebase.');
  }

  const authenticatedUser = verifyFirebaseAdsUser_(firebaseIdToken);
  const company = String(request.company || 'NNV').toUpperCase();
  const allowedCompanies = ['NNV', 'VN', 'KF', 'ABC'];
  if (allowedCompanies.indexOf(company) === -1) {
    throw new Error('Công ty không hợp lệ.');
  }

  const defaultPeriod = getCurrentMonthPeriod_();
  const from = String(request.from || defaultPeriod.from);
  const to = String(request.to || defaultPeriod.to);
  validateDateRange_(from, to);

  const mode = String(request.mode || 'summary').trim().toLowerCase();

  const refreshRequested = (
    request.force === true ||
    String(request.force || '').trim().toLowerCase() === 'true'
  );

  const forceDirect = (
    request.forceDirect === true ||
    String(request.forceDirect || '').trim().toLowerCase() === 'true'
  );

  const refreshReason = String(
    request.refreshReason ||
    (forceDirect
      ? 'manual_force'
      : (refreshRequested ? 'shared_refresh_check' : 'cache'))
  ).trim();

  let result;

  if (mode === 'warm_all') {
    result = warmAllMetaCompaniesV331_(
      from,
      to,
      company
    );
  } else if (mode === 'ad_details') {
    // Creative/detail vẫn giữ cache riêng vì ảnh/video không cần làm mới theo từng thao tác số liệu.
    result = getMetaAdDetailsBatchV207_(
      company,
      from,
      to,
      request.adsetIds
    );
  } else if (mode === 'full') {
    // Luồng full giữ tương thích cũ. Manual mới dùng forceDirect.
    result = forceDirect
      ? getMetaAdsLive_(company, from, to, true)
      : getMetaAdsLiveForUserCached_(company, from, to);
  } else {
    /*
     * V331:
     * - force=true của thao tác tự động chỉ là "xin kiểm tra refresh".
     * - Shared cache < 2 phút => trả ngay, KHÔNG gọi Meta.
     * - Shared cache >= 2 phút / chưa có => một execution lấy lock và gọi Meta.
     * - Manual forceDirect=true => gọi Meta thật ngay.
     */
    result = getMetaAdsSummarySmartV331_(
      company,
      from,
      to,
      refreshRequested,
      forceDirect,
      refreshReason
    );
  }

  return {
    success: true,
    api: mode === 'warm_all'
      ? 'meta_ads_warm_all'
      : (
          mode === 'ad_details'
            ? 'meta_ads_ad_details'
            : (mode === 'full' ? 'meta_ads_full' : 'meta_ads_summary')
        ),
    requestedBy: {
      uid: authenticatedUser.uid,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      isGuest: authenticatedUser.isGuest === true
    },
    data: result
  };
}


/* =========================================================
   V211 — FIXED SYSTEM ADMIN BRIDGE
   - Tách thao tác quản trị Firebase Authentication khỏi Meta Bridge pool.
   - Backend chỉ chấp nhận Firebase ID Token của user có admin_uids/{uid}=true
     hoặc bootstrap admin legacy.
   - delete_user: xóa Firebase Authentication trước, sau đó mới dọn hồ sơ RBAC.
   - invalidate_users_cache: xóa cache system_settings/users dùng chung.
   - Tự khôi phục UID từ authUid / uid_user_map / permissions_by_uid / email.
   - Chặn xóa chính mình và chặn xóa user đang là Admin.
   ========================================================= */

const SYSTEM_ADMIN_API_VERSION = 'V211_FIXED_SYSTEM_ADMIN_BRIDGE';
const SYSTEM_USERS_CACHE_KEY_V211 = 'mkt_system_users_v206';
const SYSTEM_ADMIN_BOOTSTRAP_EMAIL_V211 = 'aichatgptnnv@gmail.com';

function getSystemAdminConfigV211_() {
  const props = PropertiesService.getScriptProperties();

  const firebaseApiKey = String(
    props.getProperty('FIREBASE_WEB_API_KEY') || ''
  ).trim();

  const databaseUrl = String(
    props.getProperty('FIREBASE_DATABASE_URL') || ''
  ).trim().replace(/\/+$/, '');

  let projectId = String(
    props.getProperty('FIREBASE_PROJECT_ID') || ''
  ).trim();

  if (!firebaseApiKey) {
    throw new Error('Thiếu FIREBASE_WEB_API_KEY trong Script Properties.');
  }

  if (!databaseUrl) {
    throw new Error('Thiếu FIREBASE_DATABASE_URL trong Script Properties.');
  }

  // Fallback cho Firebase Realtime Database mặc định.
  if (!projectId) {
    try {
      const host = new URL(databaseUrl).hostname.split('.')[0] || '';
      projectId = host
        .replace(/-default-rtdb$/i, '')
        .replace(/-default-rtdb-[a-z0-9-]+$/i, '');
    } catch (error) {}
  }

  if (!projectId) {
    throw new Error(
      'Thiếu FIREBASE_PROJECT_ID trong Script Properties. ' +
      'Hãy đặt FIREBASE_PROJECT_ID=mkt-system-nnv.'
    );
  }

  return {
    firebaseApiKey: firebaseApiKey,
    databaseUrl: databaseUrl,
    projectId: projectId
  };
}

function parseJsonResponseV211_(response) {
  const text = response ? String(response.getContentText() || '') : '';
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function firebaseRestGetV211_(databaseUrl, path, firebaseIdToken) {
  const url =
    databaseUrl + '/' +
    String(path || '').replace(/^\/+|\/+$/g, '') +
    '.json?auth=' + encodeURIComponent(firebaseIdToken);

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const payload = parseJsonResponseV211_(response);

  if (status < 200 || status >= 300) {
    throw new Error(
      'Firebase từ chối đọc ' + path +
      '. HTTP ' + status +
      (payload && payload.error ? ': ' + payload.error : '')
    );
  }

  return payload;
}

function firebaseRootPatchV211_(databaseUrl, updates, firebaseIdToken) {
  const url =
    databaseUrl +
    '/.json?auth=' +
    encodeURIComponent(firebaseIdToken);

  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(updates || {}),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const payload = parseJsonResponseV211_(response);

  if (status < 200 || status >= 300) {
    throw new Error(
      'Firebase từ chối dọn dữ liệu RBAC. HTTP ' +
      status +
      (payload && payload.error ? ': ' + payload.error : '')
    );
  }

  return payload;
}

function lookupFirebaseSessionV211_(firebaseIdToken, firebaseApiKey) {
  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
      encodeURIComponent(firebaseApiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        idToken: firebaseIdToken
      }),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();
  const payload = parseJsonResponseV211_(response);

  if (
    status < 200 ||
    status >= 300 ||
    !payload.users ||
    !payload.users.length
  ) {
    throw new Error(
      'Phiên đăng nhập Firebase không hợp lệ hoặc đã hết hạn.'
    );
  }

  const user = payload.users[0] || {};

  if (user.disabled === true) {
    throw new Error('Tài khoản Firebase đang bị vô hiệu hóa.');
  }

  const uid = String(user.localId || '').trim();
  const email = String(user.email || '').trim().toLowerCase();

  if (!uid || !email) {
    throw new Error('Firebase không trả về UID/email hợp lệ.');
  }

  return {
    uid: uid,
    email: email,
    displayName: String(user.displayName || '').trim()
  };
}

function verifyFirebaseSystemAdminV211_(firebaseIdToken) {
  const config = getSystemAdminConfigV211_();
  const session = lookupFirebaseSessionV211_(
    firebaseIdToken,
    config.firebaseApiKey
  );

  let adminFlag = false;

  try {
    adminFlag = firebaseRestGetV211_(
      config.databaseUrl,
      'system_settings/admin_uids/' + encodeURIComponent(session.uid),
      firebaseIdToken
    ) === true;
  } catch (error) {
    throw new Error(
      'Không xác minh được quyền Quản trị hệ thống: ' +
      error.message
    );
  }

  const bootstrapAdmin =
    session.email === SYSTEM_ADMIN_BOOTSTRAP_EMAIL_V211;

  if (!adminFlag && !bootstrapAdmin) {
    throw new Error(
      'Tài khoản ' + session.email +
      ' không có quyền Quản trị hệ thống.'
    );
  }

  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    adminFlag: adminFlag,
    bootstrapAdmin: bootstrapAdmin,
    config: config
};
}

function clearSystemUsersCacheV211_() {
  try {
    CacheService
      .getScriptCache()
      .remove(SYSTEM_USERS_CACHE_KEY_V211);
  } catch (error) {
    console.warn(
      'Không xóa được cache user Apps Script: ' +
      error.message
    );
  }

  return {
    success: true,
    cacheKey: SYSTEM_USERS_CACHE_KEY_V211
  };
}

function getGoogleOAuthTokenV211_() {
  try {
    return ScriptApp.getOAuthToken();
  } catch (error) {
    throw new Error(
      'Không lấy được OAuth token của Admin Bridge: ' +
      error.message
    );
  }
}

function identityToolkitAdminRequestV211_(url, payload, operationLabel) {
  const oauthToken = getGoogleOAuthTokenV211_();

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + oauthToken
    },
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const data = parseJsonResponseV211_(response);

  if (status >= 200 && status < 300) {
    return {
      status: status,
      data: data
    };
  }

  const apiMessage = String(
    data &&
    data.error &&
    data.error.message ||
    data &&
    data.error ||
    data &&
    data.raw ||
    ''
  ).trim();

  const lower = apiMessage.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    lower.indexOf('insufficient authentication scopes') !== -1 ||
    lower.indexOf('insufficient permission') !== -1
  ) {
    throw new Error(
      operationLabel +
      ': Admin Bridge chưa đủ quyền Google. ' +
      'Cần oauthScopes identitytoolkit trong appsscript.json và tài khoản sở hữu/deploy Apps Script phải có IAM Firebase Authentication Admin ' +
      '(firebaseauth.users.get / firebaseauth.users.delete). ' +
      'Google trả: ' + (apiMessage || ('HTTP ' + status))
    );
  }

  const err = new Error(
    operationLabel +
    ': HTTP ' + status +
    (apiMessage ? ' - ' + apiMessage : '')
  );

  err.httpStatus = status;
  err.apiPayload = data;
  throw err;
}

function lookupFirebaseAuthUidByEmailV211_(projectId, email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return '';

  const url =
    'https://identitytoolkit.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/accounts:lookup';

  const result = identityToolkitAdminRequestV211_(
    url,
    {
      email: [email]
    },
    'Không tra được Firebase Authentication user'
  );

  const users =
    result &&
    result.data &&
    Array.isArray(result.data.users)
      ? result.data.users
      : [];

  if (!users.length) return '';

  return String(users[0].localId || '').trim();
}

function resolveTargetUidV211_(adminContext, request, profile) {
  const config = adminContext.config;
  const firebaseIdToken = String(
    request.firebaseIdToken || ''
  ).trim();

  const directUid = String(
    request.authUid ||
    profile.authUid ||
    ''
  ).trim();

  if (directUid) return directUid;

  const userKey = String(request.userKey || '').trim();

  // 1. uid_user_map: UID -> userKey
  try {
    const uidMap = firebaseRestGetV211_(
      config.databaseUrl,
      'system_settings/uid_user_map',
      firebaseIdToken
    ) || {};

    const uidFromMap = Object.keys(uidMap).find(function (uid) {
      return String(uidMap[uid] || '') === userKey;
    });

    if (uidFromMap) return String(uidFromMap);
  } catch (error) {
    console.warn(
      'Không dò được uid_user_map: ' + error.message
    );
  }

  // 2. permissions_by_uid: userKey/email
  try {
    const permissionMap = firebaseRestGetV211_(
      config.databaseUrl,
      'system_settings/permissions_by_uid',
      firebaseIdToken
    ) || {};

    const wantedEmail = String(
      request.email ||
      profile.email ||
      ''
    ).trim().toLowerCase();

    const uidFromPermissions = Object.keys(permissionMap).find(
      function (uid) {
        const item = permissionMap[uid] || {};
        return (
          String(item.userKey || '') === userKey ||
          (
            wantedEmail &&
            String(item.email || '').trim().toLowerCase() ===
              wantedEmail
          )
        );
      }
    );

    if (uidFromPermissions) {
      return String(uidFromPermissions);
    }
  } catch (error) {
    console.warn(
      'Không dò được permissions_by_uid: ' +
      error.message
    );
  }

  // 3. Cuối cùng tra thẳng Firebase Authentication theo email.
  return lookupFirebaseAuthUidByEmailV211_(
    config.projectId,
    request.email || profile.email || ''
  );
}

function deleteFirebaseAuthUserByUidV211_(projectId, targetUid) {
  const url =
    'https://identitytoolkit.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/accounts:delete';

  try {
    identityToolkitAdminRequestV211_(
      url,
      {
        localId: targetUid
      },
      'Không xóa được Firebase Authentication user'
    );

    return {
      deleted: true,
      alreadyMissing: false
    };
  } catch (error) {
    const message = String(error && error.message || '');
    const payload = error && error.apiPayload
      ? error.apiPayload
      : {};
    const apiMessage = String(
      payload &&
      payload.error &&
      payload.error.message ||
      ''
    ).toUpperCase();

    if (
      apiMessage.indexOf('USER_NOT_FOUND') !== -1 ||
      message.toUpperCase().indexOf('USER_NOT_FOUND') !== -1
    ) {
      return {
        deleted: false,
        alreadyMissing: true
      };
    }

    throw error;
  }
}

function deleteSystemUserV211_(adminContext, request) {
  const config = adminContext.config;
  const firebaseIdToken = String(
    request.firebaseIdToken || ''
  ).trim();

  const userKey = String(
    request.userKey || ''
  ).trim();

  if (!/^[A-Za-z0-9_-]{1,180}$/.test(userKey)) {
    throw new Error('userKey không hợp lệ.');
  }

  const profile = firebaseRestGetV211_(
    config.databaseUrl,
    'system_settings/users/' + userKey,
    firebaseIdToken
  );

  if (!profile || typeof profile !== 'object') {
    throw new Error(
      'Không tìm thấy hồ sơ user cần xóa trong system_settings/users.'
    );
  }

  const profileRole = String(
    profile.role || ''
  ).trim().toLowerCase();

  if (profileRole === 'admin') {
    throw new Error(
      'Không được xóa tài khoản Quản trị hệ thống.'
    );
  }

  const targetUid = resolveTargetUidV211_(
    adminContext,
    request,
    profile
  );

  if (!targetUid) {
    throw new Error(
      'Không tìm thấy Firebase UID của user. ' +
      'Đã kiểm tra authUid, uid_user_map, permissions_by_uid và email.'
    );
  }

  if (targetUid === adminContext.uid) {
    throw new Error(
      'Không được tự xóa chính tài khoản Admin đang đăng nhập.'
    );
  }

  // Backend kiểm tra lại target có phải Admin hay không.
  let targetAdminFlag = false;
  try {
    targetAdminFlag = firebaseRestGetV211_(
      config.databaseUrl,
      'system_settings/admin_uids/' + encodeURIComponent(targetUid),
      firebaseIdToken
    ) === true;
  } catch (error) {
    throw new Error(
      'Không kiểm tra được trạng thái Admin của user cần xóa: ' +
      error.message
    );
  }

  if (targetAdminFlag) {
    throw new Error(
      'Không được xóa tài khoản đang có admin_uids=true.'
    );
  }

  /*
   * Fail-closed:
   * 1) Firebase Authentication phải xác nhận xóa trước.
   * 2) Chỉ sau đó mới dọn hồ sơ/quyền Realtime Database.
   */
  const authDeleteResult =
    deleteFirebaseAuthUserByUidV211_(
      config.projectId,
      targetUid
    );

  const updates = {};
  updates['system_settings/users/' + userKey] = null;
  updates['system_settings/uid_user_map/' + targetUid] = null;
  updates['system_settings/permissions_by_uid/' + targetUid] = null;
  updates['system_settings/admin_uids/' + targetUid] = null;

  firebaseRootPatchV211_(
    config.databaseUrl,
    updates,
    firebaseIdToken
  );

  clearSystemUsersCacheV211_();

  return {
    success: true,
    action: 'delete_user',
    apiVersion: SYSTEM_ADMIN_API_VERSION,
    userKey: userKey,
    uid: targetUid,
    email: String(
      request.email ||
      profile.email ||
      ''
    ).trim().toLowerCase(),
    authDeleted: authDeleteResult.deleted === true,
    authAlreadyMissing:
      authDeleteResult.alreadyMissing === true,
    databaseCleaned: true,
    requestedBy: {
      uid: adminContext.uid,
      email: adminContext.email
    }
  };
}

/**
 * Hàm PUBLIC để Bridge.html gọi bằng google.script.run.
 */
function handleSystemAdminRequest(request) {
  request = request || {};

  const firebaseIdToken = String(
    request.firebaseIdToken || ''
  ).trim();

  if (!firebaseIdToken) {
    throw new Error(
      'Không tìm thấy Firebase ID Token của Admin.'
    );
  }

  const action = String(
    request.action || ''
  ).trim().toLowerCase();

  const adminContext =
    verifyFirebaseSystemAdminV211_(
      firebaseIdToken
    );

  if (action === 'invalidate_users_cache') {
    const cacheResult =
      clearSystemUsersCacheV211_();

    return {
      success: true,
      action: action,
      apiVersion: SYSTEM_ADMIN_API_VERSION,
      cacheKey: cacheResult.cacheKey,
      requestedBy: {
        uid: adminContext.uid,
        email: adminContext.email
      }
    };
  }

  if (action === 'delete_user') {
    return deleteSystemUserV211_(
      adminContext,
      request
    );
  }

  throw new Error(
    'System Admin action không được hỗ trợ: ' +
    action
  );
}

/*
 * Alias tương thích để Bridge cũ/mới có thể gọi cùng backend
 * mà không phải thay logic quản trị một lần nữa.
 */
function systemAdminRequest(request) {
  return handleSystemAdminRequest(request);
}

function processSystemAdminRequest(request) {
  return handleSystemAdminRequest(request);
}

function executeSystemAdminAction(request) {
  return handleSystemAdminRequest(request);
}

function handleMktSystemAdminRequest(request) {
  return handleSystemAdminRequest(request);
}

/**
 * Test an toàn: chỉ kiểm tra cấu hình, token OAuth và quyền lookup.
 * KHÔNG xóa user.
 * Đặt Script Property SYSTEM_ADMIN_TEST_EMAIL bằng một email Firebase hợp lệ
 * trước khi chạy nếu muốn kiểm tra lookup thực tế.
 */


/* =========================================================
   V214 — TEST ACTIVITY 3 CẤP (AICHATGPTNNV_GMAIL1)
   Chỉ đọc metadata, KHÔNG ghi/xóa dữ liệu.
   ========================================================= */


/**
 * V327 — Test server-to-server chỉ tới Gmail 2.
 * Workspace phanbon.com.vn được bỏ qua; chỉ PING, không ghi/đổi access token.
 */



/**
 * V318.5 — So sánh OAuth/token của 4 công ty.
 * KHÔNG trả Access Token/App Secret/sync secret.
 *
 * Ưu tiên:
 * 1) Nếu đã có META_ACCESS_TOKEN_<COMPANY> thì chẩn đoán trực tiếp token đang dùng.
 * 2) Nếu chưa có token riêng nhưng đã có META_OAUTH_LAST_DIAG_<COMPANY>,
 *    dùng diagnostic gần nhất (trường hợp NNV OAuth lỗi trước khi lưu token).
 */


/**
 * Xem lại kết quả compare gần nhất mà không gọi Meta lại.
 */


/**
 * V318.7 — Kiểm tra trạng thái tách 4 token trên Gmail 1.
 * Không hiển thị giá trị token.
 */


/**
 * Chỉ xóa META_ACCESS_TOKEN khi đủ cả 4 token riêng.
 * Hàm này chỉ tác động Apps Script hiện tại.
 */
function finalizeMetaTokenIsolationLocalV318() {
  const props = PropertiesService.getScriptProperties();
  const dedicated = getMetaDedicatedTokenStatusV318_();

  if (!(dedicated.NNV && dedicated.VN && dedicated.KF && dedicated.ABC)) {
    throw new Error(
      'Chưa đủ 4 token riêng. Không được xóa META_ACCESS_TOKEN legacy.'
    );
  }

  props.setProperty('META_TOKEN_MODE', 'strict');
  props.deleteProperty('META_ACCESS_TOKEN');

  const result = {
    success: true,
    receiver: 'Gmail 1',
    strictMode: true,
    legacyTokenPresent: false,
    dedicated: dedicated
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}



/**
 * V322 — Diagnostic không lộ token.
 * Kiểm tra backend hiện tại có phải bản STRICT FANPAGE hay không.
 */


/**
 * V325 — kiểm tra contract nguồn Fanpage ổn định.
 * Không hiển thị token.
 */

/* =========================================================
   V327 — ALL-COMPANY STRICT PAGE RESOLVER
   Mục tiêu:
   - Giữ STRICT FANPAGE: chỉ Page API mới được đánh dấu là bài gốc.
   - Tự sửa Post ID/Page ID không khớp token Page cho cả NNV, VN, KF và ABC.
   - Chỉ thử Page Token trong đúng công ty; tuyệt đối không dùng token chéo công ty.
   - Ghi lỗi rõ theo từng bài, không lưu/không in Access Token.
   ========================================================= */

function contentManagerUniqueV327_(values) {
  var output = [];
  var seen = {};
  (Array.isArray(values) ? values : []).forEach(function (value) {
    value = String(value || '').trim();
    if (!value || seen[value]) return;
    seen[value] = true;
    output.push(value);
  });
  return output;
}

function contentManagerCreativeV327_(ad) {
  if (!ad || typeof ad !== 'object') return {};
  if (!ad.creative || typeof ad.creative !== 'object') ad.creative = {};
  return ad.creative;
}

function contentManagerAdIdV327_(ad) {
  return String(ad && (ad.id || ad.adId) || '').trim();
}

function contentManagerPageNamesV327_(companyCode) {
  var props = PropertiesService.getScriptProperties();
  var names = {};
  [
    'META_OAUTH_PAGES_' + companyCode,
    'META_OAUTH_PAGES_REFRESHED_' + companyCode
  ].forEach(function (key) {
    var raw = String(props.getProperty(key) || '').trim();
    if (!raw) return;
    try {
      var rows = JSON.parse(raw);
      (Array.isArray(rows) ? rows : []).forEach(function (row) {
        var id = String(row && row.id || '').trim();
        if (id && !names[id]) names[id] = String(row && row.name || '').trim();
      });
    } catch (error) {}
  });
  return names;
}


/* =========================================================
   V328 R1 — CREATIVE IDENTITY RECOVERY + ADS LIST FALLBACK
   - Sửa KF: đọc lại AdCreative trực tiếp từ Ad ID trước khi ghép Page/Post.
   - Sửa VN: khi endpoint /ads đầy đủ lỗi/rỗng, dùng endpoint nhẹ và Ad Insights
     để không làm mất cây quảng cáo.
   - Không dùng token chéo công ty.
   ========================================================= */
function contentManagerMergeMissingV328_(target, source) {
  target = target && typeof target === 'object' ? target : {};
  source = source && typeof source === 'object' ? source : {};
  Object.keys(source).forEach(function (key) {
    var incoming = source[key];
    var current = target[key];
    if (incoming === undefined || incoming === null || incoming === '') return;
    if (
      current === undefined || current === null || current === '' ||
      (Array.isArray(current) && current.length === 0) ||
      (typeof current === 'object' && !Array.isArray(current) && Object.keys(current).length === 0)
    ) {
      target[key] = incoming;
      return;
    }
    if (
      typeof current === 'object' && !Array.isArray(current) &&
      typeof incoming === 'object' && !Array.isArray(incoming)
    ) {
      contentManagerMergeMissingV328_(current, incoming);
    }
  });
  return target;
}

function contentManagerCreativeIdentityFieldsV328_(safeMode) {
  if (safeMode) {
    return 'id,creative{id,name,object_story_id,effective_object_story_id,object_story_spec}';
  }
  return 'id,creative{' + [
    'id','name','thumbnail_url','image_url','image_hash','video_id','object_type',
    'object_story_id','effective_object_story_id','source_facebook_post_id',
    'object_story_spec','asset_feed_spec','title','body'
  ].join(',') + '}';
}

function contentManagerHydrateCreativeIdentityV328_(adsMetadata, accountToken, companyCode, label) {
  adsMetadata = Array.isArray(adsMetadata) ? adsMetadata : [];
  accountToken = String(accountToken || '').trim();
  companyCode = String(companyCode || '').trim().toUpperCase();
  label = String(label || companyCode || 'Creative Identity V328');

  var targets = adsMetadata.filter(function (ad) {
    var adId = contentManagerAdIdV327_(ad);
    if (!adId) return false;
    var creative = contentManagerCreativeV327_(ad);
    return !creative.object_story_id ||
      !creative.effective_object_story_id ||
      !(creative.object_story_spec && typeof creative.object_story_spec === 'object' && creative.object_story_spec.page_id);
  });

  var diagnostic = {
    attemptedAds: targets.length,
    hydratedAds: 0,
    safeRetry: false,
    errors: []
  };
  if (!targets.length || !accountToken) return diagnostic;

  var byAdId = {};
  targets.forEach(function (ad) { byAdId[contentManagerAdIdV327_(ad)] = ad; });
  var ids = Object.keys(byAdId);

  function run(fields, safeRetry) {
    var hydrated = 0;
    for (var offset = 0; offset < ids.length; offset += 40) {
      var chunk = ids.slice(offset, offset + 40);
      var url = 'https://graph.facebook.com/' + META_API_VERSION + '/?ids=' +
        encodeURIComponent(chunk.join(',')) + '&fields=' + encodeURIComponent(fields);
      try {
        var response = UrlFetchApp.fetch(url, {
          method:'get',
          headers:{Authorization:'Bearer ' + accountToken},
          muteHttpExceptions:true
        });
        var status = Number(response.getResponseCode() || 0);
        var payload = {};
        try { payload = JSON.parse(String(response.getContentText() || '{}')); } catch (e) { payload = {}; }
        if (status < 200 || status >= 300) {
          var topError = payload && payload.error ? payload.error : {};
          diagnostic.errors.push({
            code:String(topError.code !== undefined ? topError.code : status),
            message:String(topError.message || ('HTTP ' + status)),
            safeRetry:!!safeRetry
          });
          continue;
        }
        Object.keys(payload || {}).forEach(function (adId) {
          var node = payload[adId];
          if (!node || node.error || !node.creative || !byAdId[adId]) {
            if (node && node.error) diagnostic.errors.push({
              adId:String(adId),
              code:String(node.error.code !== undefined ? node.error.code : 'AD_ERROR'),
              message:String(node.error.message || ''),
              safeRetry:!!safeRetry
            });
            return;
          }
          var creative = contentManagerCreativeV327_(byAdId[adId]);
          contentManagerMergeMissingV328_(creative, node.creative);
          creative._v328_identity_refreshed = true;
          creative._v328_identity_source = safeRetry ? 'direct_ad_safe' : 'direct_ad_full';
          hydrated++;
        });
      } catch (error) {
        diagnostic.errors.push({
          code:'FETCH_ERROR',
          message:String(error && error.message || error),
          safeRetry:!!safeRetry
        });
      }
    }
    return hydrated;
  }

  diagnostic.hydratedAds += run(contentManagerCreativeIdentityFieldsV328_(false), false);
  if (diagnostic.hydratedAds < targets.length) {
    diagnostic.safeRetry = true;
    diagnostic.hydratedAds += run(contentManagerCreativeIdentityFieldsV328_(true), true);
  }
  return diagnostic;
}

function contentManagerBuildAdsFromInsightsV328_(insights) {
  return (Array.isArray(insights) ? insights : []).map(function (insight) {
    return {
      id:String(insight && insight.ad_id || ''),
      name:String(insight && insight.ad_name || ''),
      effective_status:'',
      status:'',
      created_time:'',
      updated_time:'',
      adset:{
        id:String(insight && insight.adset_id || ''),
        name:String(insight && insight.adset_name || '')
      },
      campaign:{
        id:String(insight && insight.campaign_id || ''),
        name:String(insight && insight.campaign_name || '')
      },
      creative:{},
      _v328_ads_source:'ad_insights_fallback'
    };
  }).filter(function (ad) { return !!ad.id; });
}

function contentManagerProbeAccountExactV328_(accountToken, unresolvedInfos, apiErrors, label) {
  accountToken = String(accountToken || '').trim();
  unresolvedInfos = Array.isArray(unresolvedInfos) ? unresolvedInfos : [];
  apiErrors = Array.isArray(apiErrors) ? apiErrors : [];
  if (!accountToken || !unresolvedInfos.length) return 0;

  var byCandidate = {};
  var candidateIds = [];
  unresolvedInfos.forEach(function (info) {
    if (!info || !info.creative || info.creative._v321_fanpage_post_found) return;
    var candidates = contentManagerUniqueV327_([].concat(info.candidates || [], info.rawIds || []))
      .filter(function (value) { return /^\d+(?:_\d+)?$/.test(String(value || '')); })
      .slice(0, 12);
    if (!candidates.length) return;
    info.creative._v327_fanpage_attempts = Number(info.creative._v327_fanpage_attempts || 0) + 1;
    candidates.forEach(function (candidate) {
      if (!byCandidate[candidate]) { byCandidate[candidate] = []; candidateIds.push(candidate); }
      byCandidate[candidate].push({
        ad:info.ad,
        sourceKind:'v328_company_account_exact',
        resolutionPath:'company_account_exact_post_id'
      });
    });
  });
  if (!candidateIds.length) return 0;

  var repaired = 0;
  var fields = contentManagerGraphFieldsV327_();
  for (var offset = 0; offset < candidateIds.length; offset += 40) {
    var chunk = candidateIds.slice(offset, offset + 40);
    var url = 'https://graph.facebook.com/' + META_API_VERSION + '/?ids=' +
      encodeURIComponent(chunk.join(',')) + '&fields=' + encodeURIComponent(fields);
    var payload = {};
    try {
      var response = UrlFetchApp.fetch(url, {
        method:'get', headers:{Authorization:'Bearer ' + accountToken}, muteHttpExceptions:true
      });
      var status = Number(response.getResponseCode() || 0);
      try { payload = JSON.parse(String(response.getContentText() || '{}')); } catch (e) { payload = {}; }
      if (status < 200 || status >= 300) {
        var topError = payload && payload.error ? payload.error : {};
        apiErrors.push({
          pageId:'', postId:chunk.slice(0,5).join(','),
          code:String(topError.code !== undefined ? topError.code : status),
          message:String(topError.message || ('HTTP ' + status)),
          tokenSource:'company_account_exact'
        });
        continue;
      }
    } catch (error) {
      apiErrors.push({pageId:'',postId:chunk.slice(0,5).join(','),code:'FETCH_ERROR',message:String(error && error.message || error),tokenSource:'company_account_exact'});
      continue;
    }

    Object.keys(payload || {}).forEach(function (postId) {
      var post = payload[postId];
      if (!post || post.error) {
        if (post && post.error) apiErrors.push({
          pageId:'',postId:String(postId),
          code:String(post.error.code !== undefined ? post.error.code : 'POST_ERROR'),
          message:String(post.error.message || ''),tokenSource:'company_account_exact'
        });
        return;
      }
      var links = byCandidate[postId] || [];
      if (!links.length) return;
      var from = post.from && typeof post.from === 'object' ? post.from : {};
      var pageRow = {
        pageId:String(from.id || getPageIdFromFacebookPostIdV321_(postId) || ''),
        pageName:String(from.name || ''),
        token:accountToken,
        source:'company_account_exact'
      };
      var before = links.filter(function (link) { return !contentManagerCreativeV327_(link.ad)._v321_fanpage_post_found; }).length;
      contentManagerApplyPostV327_(post, postId, links, pageRow, {}, {});
      var after = links.filter(function (link) { return contentManagerCreativeV327_(link.ad)._v321_fanpage_post_found; }).length;
      repaired += Math.min(before, after);
    });
  }
  return repaired;
}

function contentManagerPostInfoV327_(ad) {
  var creative = contentManagerCreativeV327_(ad);

  /*
   * V330 R1:
   * Ưu tiên Story ID đầy đủ PAGEID_POSTID trước.
   * source_facebook_post_id dạng số rời chỉ được xem là "tail",
   * KHÔNG gọi trực tiếp như một Graph object vì có thể bị Meta hiểu
   * thành singular statuses legacy và trả lỗi #12.
   */
  var rawIds = contentManagerUniqueV327_([
    creative.object_story_id,
    creative.effective_object_story_id,
    creative._v321_fanpage_post_id,
    creative.source_facebook_post_id
  ]);

  var pageIds = [];
  var tails = [];
  var candidates = [];

  function addPage(value) {
    value = String(value || '').trim();
    if (/^\d+$/.test(value)) pageIds.push(value);
  }

  function addTail(value) {
    value = String(value || '').trim();
    if (/^\d+$/.test(value)) tails.push(value);
  }

  function addCandidate(value) {
    value = String(value || '').trim();
    if (!value) return;

    /* Candidate Graph Post an toàn nhất: PAGEID_POSTID. */
    if (/^\d+_\d+$/.test(value)) {
      candidates.push(value);
      return;
    }

    /*
     * URL Facebook có thể normalize thành PAGEID_POSTID;
     * không giữ URL thô trong probe Graph.
     */
    var normalized = normalizeFanpagePostIdV324_(value, creative);
    if (
      normalized &&
      /^\d+_\d+$/.test(String(normalized.postId || ''))
    ) {
      candidates.push(String(normalized.postId));
    }
    if (normalized && normalized.pageId) addPage(normalized.pageId);
  }

  var storySpec = creative.object_story_spec &&
    typeof creative.object_story_spec === 'object'
      ? creative.object_story_spec
      : {};

  addPage(storySpec.page_id);
  addPage(creative._v321_fanpage_page_id);

  rawIds.forEach(function (rawId) {
    rawId = String(rawId || '').trim();
    if (!rawId) return;

    var pair = rawId.match(/^(\d+)_(\d+)$/);
    if (pair) {
      addPage(pair[1]);
      addTail(pair[2]);
      addCandidate(rawId);
      return;
    }

    /*
     * ID số rời (thường source_facebook_post_id) chỉ là post tail.
     * Không add vào candidates trực tiếp.
     */
    if (/^\d+$/.test(rawId)) {
      addTail(rawId);
      return;
    }

    var normalized = normalizeFanpagePostIdV324_(rawId, creative);
    if (normalized && normalized.pageId) addPage(normalized.pageId);
    if (
      normalized &&
      /^\d+_\d+$/.test(String(normalized.postId || ''))
    ) {
      addCandidate(normalized.postId);
      var normalizedPair = String(normalized.postId).match(/^(\d+)_(\d+)$/);
      if (normalizedPair) {
        addPage(normalizedPair[1]);
        addTail(normalizedPair[2]);
      }
    } else {
      addTail(getNumericPostIdFromUrlV324_(rawId));
    }
  });

  pageIds = contentManagerUniqueV327_(pageIds);
  tails = contentManagerUniqueV327_(tails);

  /*
   * Exact Story IDs luôn đứng trước candidate recomposed.
   * Việc recomposition được thực hiện theo đúng pageRow ở probe.
   */
  candidates = contentManagerUniqueV327_(candidates);

  return {
    adId: contentManagerAdIdV327_(ad),
    ad: ad,
    creative: creative,
    rawIds: rawIds,
    pageIds: pageIds,
    tails: tails,
    candidates: candidates
  };
}

function contentManagerDiscoverExactPageTokensV329_(companyCode, accountToken, neededPageIds) {
  companyCode = String(companyCode || '').trim().toUpperCase();
  accountToken = String(accountToken || '').trim();
  neededPageIds = contentManagerUniqueV327_(neededPageIds);

  var props = PropertiesService.getScriptProperties();
  var tokenMap = getMetaPageTokenMapV321_(companyCode);
  var pageNames = contentManagerPageNamesV327_(companyCode);
  var discovered = [];
  var errors = [];
  var changed = false;

  if (!accountToken || !neededPageIds.length) {
    return {tokenMap:tokenMap, pageNames:pageNames, discovered:discovered, errors:errors};
  }

  neededPageIds.forEach(function (pageId) {
    pageId = String(pageId || '').trim();
    if (!/^\d+$/.test(pageId)) return;
    if (String(tokenMap[pageId] || '').trim()) return;

    var url = 'https://graph.facebook.com/' + META_API_VERSION + '/' + pageId +
      '?fields=' + encodeURIComponent('id,name,access_token,tasks');

    try {
      var response = UrlFetchApp.fetch(url, {
        method:'get',
        headers:{Authorization:'Bearer ' + accountToken},
        muteHttpExceptions:true
      });
      var status = Number(response.getResponseCode() || 0);
      var payload = {};
      try { payload = JSON.parse(String(response.getContentText() || '{}')); }
      catch (parseError) { payload = {}; }

      if (status < 200 || status >= 300 || !payload || payload.error) {
        var apiError = payload && payload.error ? payload.error : {};
        errors.push({
          pageId:pageId,
          code:String(apiError.code !== undefined ? apiError.code : status),
          message:String(apiError.message || ('HTTP ' + status))
        });
        return;
      }

      var exactId = String(payload.id || pageId).trim();
      var pageToken = String(payload.access_token || '').trim();
      if (payload.name) pageNames[exactId] = String(payload.name);

      if (pageToken) {
        tokenMap[exactId] = pageToken;
        changed = true;
        discovered.push({
          pageId:exactId,
          pageName:String(payload.name || ''),
          hasAccessToken:true,
          tasks:Array.isArray(payload.tasks) ? payload.tasks : []
        });
      } else {
        errors.push({
          pageId:exactId,
          code:'NO_PAGE_ACCESS_TOKEN',
          message:'Account token đọc được Page nhưng Meta không trả access_token cho Page này.'
        });
      }
    } catch (error) {
      errors.push({
        pageId:pageId,
        code:'FETCH_ERROR',
        message:String(error && error.message || error)
      });
    }
  });

  if (changed) {
    try {
      props.setProperty(
        'META_OAUTH_PAGE_TOKENS_' + companyCode,
        JSON.stringify(tokenMap)
      );
      props.setProperty(
        'META_OAUTH_PAGE_TOKENS_REFRESHED_AT_' + companyCode,
        String(Date.now())
      );
    } catch (error) {}
  }

  return {
    tokenMap:tokenMap,
    pageNames:pageNames,
    discovered:discovered,
    errors:errors
  };
}

function contentManagerPageRowsV327_(companyCode, accountToken, neededPageIds) {
  companyCode = String(companyCode || '').trim().toUpperCase();
  accountToken = String(accountToken || '').trim();
  neededPageIds = contentManagerUniqueV327_(neededPageIds);

  var props = PropertiesService.getScriptProperties();
  var refresh = refreshMetaPageTokenMapV324_(
    companyCode,
    accountToken,
    true
  );
  var tokenMap = refresh && refresh.pageTokens
    ? refresh.pageTokens
    : getMetaPageTokenMapV321_(companyCode);

  // V329: /me/accounts có thể thiếu một số Page của cùng business/system user.
  // Khi creative đã cho biết page_id, đọc trực tiếp Page đó để xin exact Page Access Token.
  var exactDiscoveryV329 = contentManagerDiscoverExactPageTokensV329_(
    companyCode,
    accountToken,
    neededPageIds
  );
  if (exactDiscoveryV329 && exactDiscoveryV329.tokenMap) {
    tokenMap = exactDiscoveryV329.tokenMap;
  }
  var pageNames = exactDiscoveryV329 && exactDiscoveryV329.pageNames
    ? exactDiscoveryV329.pageNames
    : contentManagerPageNamesV327_(companyCode);
  var rows = [];
  var seen = {};

  function add(pageId, token, source, priority) {
    pageId = String(pageId || '').trim();
    token = String(token || '').trim();
    if (!/^\d+$/.test(pageId) || !token) return;
    var key = pageId + '||' + token;
    if (seen[key]) return;
    seen[key] = true;
    rows.push({
      pageId: pageId,
      pageName: String(pageNames[pageId] || ''),
      token: token,
      source: String(source || ''),
      priority: Number(priority || 0)
    });
  }

  var primaryPageId = String(
    props.getProperty('META_PRIMARY_PAGE_ID_' + companyCode) || ''
  ).trim();
  var primaryPageToken = String(
    props.getProperty('META_PRIMARY_PAGE_TOKEN_' + companyCode) || ''
  ).trim();
  add(primaryPageId, primaryPageToken, 'manual_primary_page', 1000);

  neededPageIds.forEach(function (pageId) {
    var manual = String(
      props.getProperty(
        'META_PAGE_TOKEN_OVERRIDE_' + companyCode + '_' + pageId
      ) || ''
    ).trim();
    add(pageId, manual, 'manual_page_override', 950);
    add(pageId, tokenMap[pageId], 'exact_company_page_token', 900);
  });

  Object.keys(tokenMap || {}).forEach(function (pageId) {
    add(pageId, tokenMap[pageId], 'company_page_token_probe', 500);
  });

  /*
   * Account token chỉ được ghép với Page ID thuộc cùng công ty đang xử lý.
   * Không bao giờ đọc META_ACCESS_TOKEN của công ty khác.
   */
  neededPageIds.forEach(function (pageId) {
    add(pageId, accountToken, 'company_account_token_probe', 150);
  });

  rows.sort(function (a, b) {
    var aNeeded = neededPageIds.indexOf(a.pageId) >= 0 ? 1 : 0;
    var bNeeded = neededPageIds.indexOf(b.pageId) >= 0 ? 1 : 0;
    if (aNeeded !== bNeeded) return bNeeded - aNeeded;
    return b.priority - a.priority;
  });

  return {
    rows: rows.slice(0, 40),
    pageTokenCount: Object.keys(tokenMap || {}).length,
    availablePageIds: Object.keys(tokenMap || {}),
    refreshSuccess: refresh && refresh.success === true,
    refreshError: String(refresh && refresh.error || ''),
    exactPageTokenDiscoveryV329: exactDiscoveryV329 && Array.isArray(exactDiscoveryV329.discovered)
      ? exactDiscoveryV329.discovered
      : [],
    exactPageTokenErrorsV329: exactDiscoveryV329 && Array.isArray(exactDiscoveryV329.errors)
      ? exactDiscoveryV329.errors
      : []
  };
}

function contentManagerGraphFieldsV327_() {
  return [
    'id',
    'message',
    'created_time',
    'permalink_url',
    'full_picture',
    'from{id,name}',
    'attachments{' +
      'media_type,type,media,' +
      'target{id,url},' +
      'subattachments{' +
        'media_type,type,media,url,' +
        'target{id,url},' +
        'title,description' +
      '},' +
      'url,title,description' +
    '}'
  ].join(',');
}

function contentManagerApplyPostV327_(
  post,
  postId,
  links,
  pageRow,
  photoMap,
  videoMap
) {
  post = post && typeof post === 'object' ? post : {};
  links = Array.isArray(links) ? links : [];
  photoMap = photoMap || {};
  videoMap = videoMap || {};

  var from = post.from && typeof post.from === 'object' ? post.from : {};
  var pageId = String(
    from.id ||
    pageRow.pageId ||
    getPageIdFromFacebookPostIdV321_(postId) ||
    ''
  ).trim();
  var pageName = String(from.name || pageRow.pageName || '').trim();
  var mediaKind = attachmentMediaKindV321_(post);

  var photoIds = collectFanpagePhotoTargetsV310_(post);
  var photoCandidates = photoIds.map(function (id) {
    var item = photoMap[id];
    return item && item.url ? {
      url: String(item.url),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      source: 'facebook_page_photo_images_original',
      photoId: String(id || '')
    } : null;
  }).filter(Boolean);

  photoCandidates = sortPosterCandidatesV317_(photoCandidates);

  var attachmentGallery = [];
  try {
    attachmentGallery = extractFacebookPostGalleryV223_(post) || [];
  } catch (error) {
    attachmentGallery = [];
  }
  attachmentGallery = sortPosterCandidatesV317_(attachmentGallery);

  var bestImage = photoCandidates[0] || attachmentGallery[0] || null;
  if (!bestImage && post.full_picture) {
    bestImage = {
      url: String(post.full_picture),
      width: 0,
      height: 0,
      source: 'facebook_page_full_picture'
    };
  }

  var video = null;
  var videoIds = collectFanpageVideoTargetsV321_(post);
  for (var vi = 0; vi < videoIds.length; vi++) {
    if (videoMap[videoIds[vi]]) {
      video = videoMap[videoIds[vi]];
      break;
    }
  }

  var gallery = [];
  var seenUrls = {};
  photoCandidates.concat(attachmentGallery).forEach(function (item) {
    if (!item || !item.url || seenUrls[item.url]) return;
    seenUrls[item.url] = true;
    gallery.push({
      url: String(item.url),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      source: String(item.source || 'facebook_page_attachment')
    });
  });

  links.forEach(function (link) {
    var ad = link && link.ad;
    var creative = contentManagerCreativeV327_(ad);
    if (!ad || !creative || creative._v321_fanpage_post_found) return;

    creative._v321_fanpage_priority = 1000;
    creative._v321_fanpage_post_found = true;
    creative._v321_fanpage_source_kind = String(
      link.sourceKind || 'v327_page_token_probe'
    );
    creative._v321_fanpage_post_id = String(post.id || postId || '');
    creative._v321_fanpage_page_id = pageId;
    creative._v321_fanpage_page_name = pageName;
    creative._v321_fanpage_post_message = String(post.message || '').trim();
    creative._v321_fanpage_post_permalink = String(post.permalink_url || '').trim();
    creative._v321_fanpage_post_created_time = String(post.created_time || '').trim();
    creative._v321_fanpage_media_kind = video
      ? 'video'
      : (mediaKind || (bestImage ? 'image' : ''));
    creative._v321_fanpage_video_id = String(video && video.id || '').trim();
    creative._v321_fanpage_video_source_url = String(video && video.source || '').trim();
    creative._v321_fanpage_video_permalink_url = String(
      video && video.permalink_url || ''
    ).trim();
    creative._v321_fanpage_media_url = String(
      bestImage && bestImage.url ||
      video && video.picture ||
      ''
    ).trim();
    creative._v321_fanpage_media_width = Number(bestImage && bestImage.width || 0);
    creative._v321_fanpage_media_height = Number(bestImage && bestImage.height || 0);
    creative._v321_fanpage_media_source = String(
      bestImage && bestImage.source ||
      (video && video.picture ? 'facebook_page_video_picture' : '') ||
      'facebook_page_api_v327'
    ).trim();
    creative._v321_fanpage_gallery = gallery;

    if (creative._v321_fanpage_media_url) {
      creative._v309_fanpage_image = creative._v321_fanpage_media_url;
      creative._v309_fanpage_width = creative._v321_fanpage_media_width;
      creative._v309_fanpage_height = creative._v321_fanpage_media_height;
      creative._v309_fanpage_source = creative._v321_fanpage_media_source;
      creative._v309_fanpage_gallery = gallery;
    }

    creative._v307_post_message = creative._v321_fanpage_post_message;
    creative._v307_post_permalink = creative._v321_fanpage_post_permalink;

    creative._v327_fanpage_resolution_path = String(
      link.resolutionPath || 'page_id_recomposition'
    );
    creative._v327_fanpage_token_source = String(pageRow.source || 'company_page_token');
    creative._v327_fanpage_error_code = '';
    creative._v327_fanpage_error_message = '';
  });
}

function contentManagerProbePageV327_(
  pageRow,
  unresolvedInfos,
  apiErrors,
  label
) {
  pageRow = pageRow || {};
  unresolvedInfos = Array.isArray(unresolvedInfos) ? unresolvedInfos : [];
  apiErrors = Array.isArray(apiErrors) ? apiErrors : [];

  if (!pageRow.token || !pageRow.pageId) return 0;

  var fields = contentManagerGraphFieldsV327_();
  var repaired = 0;

  /*
   * V330 R1 — EXACT POST FIRST / NO MIXED BATCH FAILURE
   *
   * Không còn gom nhiều candidate khác nhau vào /?ids=...
   * Một candidate sai không được phép làm rớt candidate đúng trong cùng lô.
   *
   * Với mỗi Ads:
   * 1) Nếu đã biết Page ID từ object_story_id => chỉ probe đúng Page đó.
   * 2) Thử exact PAGEID_POSTID trước.
   * 3) Sau đó mới thử PAGEID + post tail.
   * 4) Mỗi candidate gọi riêng; HTTP 200 thì apply ngay và dừng Ads đó.
   */
  unresolvedInfos.forEach(function (info) {
    if (
      !info ||
      !info.creative ||
      info.creative._v321_fanpage_post_found
    ) return;

    var knownPages = contentManagerUniqueV327_(info.pageIds || []);
    if (
      knownPages.length &&
      knownPages.indexOf(String(pageRow.pageId || '')) === -1
    ) {
      return;
    }

    var candidates = [];

    /* Exact Story ID cùng Page đứng đầu. */
    (info.candidates || []).forEach(function (candidate) {
      candidate = String(candidate || '').trim();
      if (!/^\d+_\d+$/.test(candidate)) return;

      var candidatePage =
        getPageIdFromFacebookPostIdV321_(candidate);

      if (
        candidatePage &&
        candidatePage === String(pageRow.pageId || '')
      ) {
        candidates.push({
          id: candidate,
          path: 'exact_story_id_v330'
        });
      }
    });

    /* Fallback: ghép đúng Page ID với các post tail đã biết. */
    (info.tails || []).forEach(function (tail) {
      tail = String(tail || '').trim();
      if (!/^\d+$/.test(tail)) return;

      var recomposed =
        String(pageRow.pageId || '') + '_' + tail;

      candidates.push({
        id: recomposed,
        path: 'page_id_recomposition_v330'
      });
    });

    var seenCandidate = {};
    candidates = candidates.filter(function (item) {
      if (
        !item ||
        !/^\d+_\d+$/.test(String(item.id || '')) ||
        seenCandidate[item.id]
      ) return false;

      seenCandidate[item.id] = true;
      return true;
    }).slice(0, 8);

    if (!candidates.length) return;

    info.creative._v327_fanpage_attempts =
      Number(info.creative._v327_fanpage_attempts || 0) + 1;

    for (
      var ci = 0;
      ci < candidates.length &&
      !info.creative._v321_fanpage_post_found;
      ci++
    ) {
      var candidate = candidates[ci];
      var postId = String(candidate.id || '');

      var url =
        'https://graph.facebook.com/' +
        META_API_VERSION +
        '/' +
        encodeURIComponent(postId) +
        '?fields=' +
        encodeURIComponent(fields);

      var response;
      var status = 0;
      var payload = {};

      try {
        response = UrlFetchApp.fetch(url, {
          method: 'get',
          headers: {
            Authorization: 'Bearer ' + pageRow.token
          },
          muteHttpExceptions: true
        });

        status = Number(response.getResponseCode() || 0);
        var text = String(response.getContentText() || '');

        try {
          payload = JSON.parse(text || '{}');
        } catch (parseError) {
          payload = {};
        }
      } catch (fetchError) {
        apiErrors.push({
          pageId: String(pageRow.pageId || ''),
          postId: postId,
          code: 'FETCH_ERROR',
          message:
            fetchError && fetchError.message
              ? fetchError.message
              : String(fetchError),
          tokenSource: String(pageRow.source || ''),
          resolutionPath: String(candidate.path || '')
        });
        continue;
      }

      if (
        status < 200 ||
        status >= 300 ||
        !payload ||
        payload.error
      ) {
        var errorPayload =
          payload && payload.error
            ? payload.error
            : {};

        apiErrors.push({
          pageId: String(pageRow.pageId || ''),
          postId: postId,
          code: String(
            errorPayload.code !== undefined
              ? errorPayload.code
              : status
          ),
          message: String(
            errorPayload.message ||
            ('HTTP ' + status)
          ),
          tokenSource: String(pageRow.source || ''),
          resolutionPath: String(candidate.path || '')
        });

        /*
         * Candidate lỗi chỉ bị bỏ riêng candidate này.
         * Tuyệt đối không bỏ những candidate kế tiếp.
         */
        continue;
      }

      /*
       * Graph node đọc thành công.
       * Xác nhận ID trả về vẫn thuộc Page đang probe nếu có prefix.
       */
      var returnedPostId = String(
        payload.id || postId || ''
      ).trim();

      var returnedPage =
        getPageIdFromFacebookPostIdV321_(returnedPostId);

      if (
        returnedPage &&
        returnedPage !== String(pageRow.pageId || '')
      ) {
        apiErrors.push({
          pageId: String(pageRow.pageId || ''),
          postId: returnedPostId,
          code: 'PAGE_MISMATCH',
          message:
            'Post đọc được nhưng thuộc Page ' +
            returnedPage +
            ', không phải Page ' +
            String(pageRow.pageId || '') +
            '.',
          tokenSource: String(pageRow.source || ''),
          resolutionPath: String(candidate.path || '')
        });
        continue;
      }

      var photoMap = {};
      var videoMap = {};

      try {
        photoMap = fetchFanpageOriginalPhotosV310_(
          collectFanpagePhotoTargetsV310_(payload),
          pageRow.token,
          String(label || 'Content') +
            ' V330 Photos ' +
            String(pageRow.pageId || '')
        );
      } catch (photoError) {
        apiErrors.push({
          pageId: String(pageRow.pageId || ''),
          postId: returnedPostId,
          code: 'PHOTO_FETCH',
          message: String(
            photoError && photoError.message ||
            photoError
          ),
          tokenSource: String(pageRow.source || ''),
          resolutionPath: String(candidate.path || '')
        });
      }

      try {
        videoMap = fetchFanpageVideoNodesV321_(
          collectFanpageVideoTargetsV321_(payload),
          pageRow.token,
          String(label || 'Content') +
            ' V330 Videos ' +
            String(pageRow.pageId || '')
        );
      } catch (videoError) {
        apiErrors.push({
          pageId: String(pageRow.pageId || ''),
          postId: returnedPostId,
          code: 'VIDEO_FETCH',
          message: String(
            videoError && videoError.message ||
            videoError
          ),
          tokenSource: String(pageRow.source || ''),
          resolutionPath: String(candidate.path || '')
        });
      }

      contentManagerApplyPostV327_(
        payload,
        returnedPostId,
        [{
          ad: info.ad,
          sourceKind: 'v330_exact_single_post_probe',
          resolutionPath: String(candidate.path || '')
        }],
        pageRow,
        photoMap,
        videoMap
      );

      if (info.creative._v321_fanpage_post_found) {
        info.creative._v330_exact_candidate = returnedPostId;
        info.creative._v330_exact_page_id =
          String(pageRow.pageId || '');
        repaired++;
        break;
      }
    }
  });

  return repaired;
}

function contentManagerProbePromotablePostsV329_(
  pageRow,
  unresolvedInfos,
  apiErrors,
  label
) {
  pageRow = pageRow || {};
  unresolvedInfos = Array.isArray(unresolvedInfos) ? unresolvedInfos : [];
  apiErrors = Array.isArray(apiErrors) ? apiErrors : [];

  var pageId = String(pageRow.pageId || '').trim();
  var token = String(pageRow.token || '').trim();
  if (!/^\d+$/.test(pageId) || !token) return 0;

  var targets = unresolvedInfos.filter(function (info) {
    if (!info || !info.creative || info.creative._v321_fanpage_post_found) return false;
    if (!Array.isArray(info.tails) || !info.tails.length) return false;
    // Nếu creative biết page_id thì chỉ quét đúng Page đó.
    return !info.pageIds.length || info.pageIds.indexOf(pageId) >= 0;
  });
  if (!targets.length) return 0;

  targets.forEach(function (info) {
    info.creative._v327_fanpage_attempts = Number(
      info.creative._v327_fanpage_attempts || 0
    ) + 1;
  });

  var fields = contentManagerGraphFieldsV327_();
  var url = 'https://graph.facebook.com/' + META_API_VERSION + '/' + pageId +
    '/promotable_posts?fields=' + encodeURIComponent(fields) + '&limit=100';

  var posts = [];
  try {
    posts = fetchMetaPages_(
      url,
      token,
      String(label || 'Content V329') + ' Promotable Posts ' + pageId
    );
  } catch (error) {
    apiErrors.push({
      pageId:pageId,
      postId:'',
      code:'PROMOTABLE_POSTS_ERROR',
      message:String(error && error.message || error),
      tokenSource:String(pageRow.source || '')
    });
    return 0;
  }

  if (!posts.length) return 0;

  var postByTail = {};
  posts.forEach(function (post) {
    var postId = String(post && post.id || '').trim();
    if (!postId) return;
    var pair = postId.match(/^(\d+)_(\d+)$/);
    var tail = pair ? pair[2] : (/^\d+$/.test(postId) ? postId : '');
    if (tail && !postByTail[tail]) postByTail[tail] = post;
  });

  var linksByPostId = {};
  var matchedPosts = {};
  targets.forEach(function (info) {
    for (var ti = 0; ti < info.tails.length; ti++) {
      var tail = String(info.tails[ti] || '').trim();
      var post = postByTail[tail];
      if (!post || !post.id) continue;
      var postId = String(post.id);
      matchedPosts[postId] = post;
      if (!linksByPostId[postId]) linksByPostId[postId] = [];
      linksByPostId[postId].push({
        ad:info.ad,
        sourceKind:'v329_promotable_posts',
        resolutionPath:'page_promotable_posts_tail_match'
      });
      break;
    }
  });

  var postIds = Object.keys(matchedPosts);
  if (!postIds.length) return 0;

  var allPhotoIds = [];
  var allVideoIds = [];
  postIds.forEach(function (postId) {
    var post = matchedPosts[postId];
    allPhotoIds = allPhotoIds.concat(collectFanpagePhotoTargetsV310_(post));
    allVideoIds = allVideoIds.concat(collectFanpageVideoTargetsV321_(post));
  });

  var photoMap = {};
  var videoMap = {};
  try {
    photoMap = fetchFanpageOriginalPhotosV310_(
      allPhotoIds,
      token,
      String(label || 'Content V329') + ' Promotable Photos ' + pageId
    );
  } catch (error) {}
  try {
    videoMap = fetchFanpageVideoNodesV321_(
      allVideoIds,
      token,
      String(label || 'Content V329') + ' Promotable Videos ' + pageId
    );
  } catch (error) {}

  var repaired = 0;
  postIds.forEach(function (postId) {
    var links = linksByPostId[postId] || [];
    var before = links.filter(function (link) {
      return !contentManagerCreativeV327_(link.ad)._v321_fanpage_post_found;
    }).length;

    contentManagerApplyPostV327_(
      matchedPosts[postId],
      postId,
      links,
      pageRow,
      photoMap,
      videoMap
    );

    var after = links.filter(function (link) {
      return contentManagerCreativeV327_(link.ad)._v321_fanpage_post_found;
    }).length;
    repaired += Math.min(before, after);
  });

  return repaired;
}

function contentManagerErrorFromAttemptsV327_(info, pageState, apiErrors) {
  if (!info.rawIds.length && !info.tails.length) {
    return {
      code: 'NO_POST_ID',
      message: 'Meta chưa trả Post ID cho creative này; chưa thể đối chiếu bài gốc Fanpage.'
    };
  }

  if (!pageState.rows.length) {
    return {
      code: 'NO_PAGE_TOKEN',
      message: 'Không có Page Access Token của đúng công ty để gọi Page API.'
    };
  }

  var relevant = (Array.isArray(apiErrors) ? apiErrors : []).filter(function (row) {
    return !row.postId || info.candidates.some(function (candidate) {
      return String(row.postId || '').indexOf(candidate) >= 0;
    }) || info.tails.some(function (tail) {
      return String(row.postId || '').indexOf('_' + tail) >= 0;
    });
  });

  var authLike = relevant.some(function (row) {
    return ['10','100','190','200','OAuthException'].indexOf(String(row.code || '')) >= 0 ||
      /permission|permissions|access token|oauth|unsupported get request|cannot be loaded|quyền|không có quyền/i.test(String(row.message || ''));
  });

  if (authLike) {
    return {
      code: 'PERMISSION_OR_TOKEN',
      message: 'Token của ' + String(info && info.ad && info.ad.company || 'công ty') + ' chưa có quyền đọc Page/Post này hoặc Page chưa được cấp vào kết nối Meta.'
    };
  }

  var graphFailure = relevant.some(function (row) {
    return row.code === 'FETCH_ERROR' || /^5\d\d$/.test(String(row.code || ''));
  });
  if (graphFailure) {
    return {
      code: 'GRAPH_API_ERROR',
      message: 'Page API gặp lỗi tạm thời; hệ thống sẽ thử lại ở lần cập nhật tiếp theo.'
    };
  }

  return {
    code: 'POST_NOT_FOUND_OR_PAGE_MISMATCH',
    message: 'Không tìm thấy bài với các Page Token của đúng công ty. Kiểm tra Page được chọn, quyền Page và trạng thái bài/dark post.'
  };
}

function saveFanpageDiagnosticV327_(companyCode, diagnostic) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      'META_FANPAGE_LAST_DIAG_V327_' + companyCode,
      JSON.stringify(diagnostic || {})
    );
  } catch (error) {}

  /* Giữ tương thích màn chẩn đoán cũ nhưng không chứa token. */
  try { saveFanpageDiagnosticV324_(companyCode, diagnostic || {}); } catch (error) {}
}

function hydrateStrictFanpageContentV327_(
  adsMetadata,
  accountToken,
  companyCode,
  label
) {
  adsMetadata = Array.isArray(adsMetadata) ? adsMetadata : [];
  companyCode = String(companyCode || '').trim().toUpperCase();
  accountToken = String(accountToken || '').trim();
  label = String(label || companyCode || 'Content V327');

  var oldError = '';
  try {
    hydrateStrictFanpageContentV321_(
      adsMetadata,
      accountToken,
      companyCode,
      label + ' Legacy Exact'
    );
  } catch (error) {
    oldError = error && error.message ? error.message : String(error);
  }

  var creativeIdentityV328 = {attemptedAds:0,hydratedAds:0,safeRetry:false,errors:[]};
  try {
    creativeIdentityV328 = contentManagerHydrateCreativeIdentityV328_(
      adsMetadata.filter(function (ad) {
        return !contentManagerCreativeV327_(ad)._v321_fanpage_post_found;
      }),
      accountToken,
      companyCode,
      label + ' Creative Identity V328'
    );
  } catch (identityErrorV328) {
    creativeIdentityV328.errors = [{code:'IDENTITY_ERROR',message:String(identityErrorV328 && identityErrorV328.message || identityErrorV328)}];
  }

  var initialFound = 0;
  var unresolvedInfos = [];
  var neededPageIds = [];

  adsMetadata.forEach(function (ad) {
    var creative = contentManagerCreativeV327_(ad);
    if (creative._v321_fanpage_post_found) {
      initialFound++;
      if (!creative._v327_fanpage_resolution_path) {
        creative._v327_fanpage_resolution_path = 'v325_exact_page_api';
        creative._v327_fanpage_token_source = 'v325_exact_token';
      }
      creative._v327_fanpage_error_code = '';
      creative._v327_fanpage_error_message = '';
      creative._v327_fanpage_attempts = Number(
        creative._v327_fanpage_attempts || 1
      );
      return;
    }

    var info = contentManagerPostInfoV327_(ad);
    unresolvedInfos.push(info);
    neededPageIds = neededPageIds.concat(info.pageIds);
    creative._v327_fanpage_candidate_ids = info.candidates.slice(0, 12);
    creative._v327_fanpage_attempts = Number(
      creative._v327_fanpage_attempts || 0
    );
  });

  neededPageIds = contentManagerUniqueV327_(neededPageIds);

  var deepRepairEnabled =
    ['NNV','VN','KF','ABC'].indexOf(companyCode) >= 0;

  var apiErrors = [];
  var repaired = 0;
  var accountExactRepairedV328 = 0;
  if (unresolvedInfos.length && deepRepairEnabled) {
    accountExactRepairedV328 = contentManagerProbeAccountExactV328_(
      accountToken, unresolvedInfos, apiErrors, label
    );
    repaired += accountExactRepairedV328;
  }

  var pageState = {
    rows: [],
    pageTokenCount: Object.keys(getMetaPageTokenMapV321_(companyCode)).length,
    availablePageIds: Object.keys(getMetaPageTokenMapV321_(companyCode)),
    refreshSuccess: null,
    refreshError: ''
  };

  if (unresolvedInfos.some(function (info) { return !info.creative._v321_fanpage_post_found; }) && deepRepairEnabled) {
    pageState = contentManagerPageRowsV327_(
      companyCode,
      accountToken,
      neededPageIds
    );

    for (var pi = 0; pi < pageState.rows.length; pi++) {
      var stillMissing = unresolvedInfos.filter(function (info) {
        return !info.creative._v321_fanpage_post_found;
      });
      if (!stillMissing.length) break;

      repaired += contentManagerProbePageV327_(
        pageState.rows[pi],
        stillMissing,
        apiErrors,
        label
      );

      // V329: nếu exact post ID vẫn không mở được, thử edge promotable_posts
      // của đúng Page để khớp dark/unpublished post theo phần numeric tail.
      var afterExactStillMissingV329 = unresolvedInfos.filter(function (info) {
        return !info.creative._v321_fanpage_post_found;
      });
      if (afterExactStillMissingV329.length) {
        repaired += contentManagerProbePromotablePostsV329_(
          pageState.rows[pi],
          afterExactStillMissingV329,
          apiErrors,
          label
        );
      }
    }
  }

  var unresolvedOutput = [];
  unresolvedInfos.forEach(function (info) {
    if (info.creative._v321_fanpage_post_found) return;
    var failure = contentManagerErrorFromAttemptsV327_(
      info,
      pageState,
      apiErrors
    );
    if (!deepRepairEnabled) {
      failure = {
        code: 'SELF_HEAL_NOT_ENABLED',
        message: 'Bộ tự sửa sâu chưa được bật cho mã công ty này.'
      };
    }
    info.creative._v327_fanpage_error_code = failure.code;
    info.creative._v327_fanpage_error_message = failure.message;
    info.creative._v327_fanpage_resolution_path = '';
    info.creative._v327_fanpage_token_source = '';

    unresolvedOutput.push({
      adId: info.adId,
      pageIds: info.pageIds.slice(0, 8),
      candidateIds: info.candidates.slice(0, 8),
      tails: info.tails.slice(0, 8),
      attempts: Number(info.creative._v327_fanpage_attempts || 0),
      errorCode: failure.code,
      errorMessage: failure.message
    });
  });

  var finalFound = adsMetadata.filter(function (ad) {
    return !!contentManagerCreativeV327_(ad)._v321_fanpage_post_found;
  }).length;

  var diagnostic = {
    version: 'V330_R1_EXACT_POST_FIRST_NO_MIXED_BATCH',
    company: companyCode,
    checkedAt: new Date().toISOString(),
    strictFanpage: true,
    crossCompanyTokenAllowed: false,
    deepRepairEnabled: deepRepairEnabled,
    inputAdCount: adsMetadata.length,
    foundBeforeRepair: initialFound,
    repairedByV327: Math.max(0, finalFound - initialFound),
    repairedByAccountExactV328: accountExactRepairedV328,
    creativeIdentityV328: creativeIdentityV328,
    foundAfterRepair: finalFound,
    unresolvedCount: Math.max(0, adsMetadata.length - finalFound),
    neededPageIds: neededPageIds,
    availablePageIds: pageState.availablePageIds || [],
    pageTokenCount: Number(pageState.pageTokenCount || 0),
    pageTokenRefreshSuccess: pageState.refreshSuccess,
    pageTokenRefreshError: String(pageState.refreshError || ''),
    exactPageTokenDiscoveryV329: pageState.exactPageTokenDiscoveryV329 || [],
    exactPageTokenErrorsV329: pageState.exactPageTokenErrorsV329 || [],
    probedPages: (pageState.rows || []).map(function (row) {
      return {
        pageId: String(row.pageId || ''),
        pageName: String(row.pageName || ''),
        tokenSource: String(row.source || '')
      };
    }).slice(0, 40),
    legacyResolverError: oldError,
    apiErrors: apiErrors.slice(0, 40),
    unresolved: unresolvedOutput.slice(0, 40)
  };

  saveFanpageDiagnosticV327_(companyCode, diagnostic);
  return adsMetadata;
}


function scheduledContentMaintenanceV327() {
  var output = {};
  ['NNV','VN','KF','ABC'].forEach(function (company) {
    var token = '';
    try { token = getMetaCompanyTokenV318_(company, true); } catch (error) {}
    var result = refreshMetaPageTokenMapV324_(company, token, true);
    output[company] = {
      success: result.success === true,
      pageCount: Number(result.pageCount || 0),
      error: String(result.error || '')
    };
  });
  PropertiesService.getScriptProperties().setProperty(
    'META_CONTENT_MAINTENANCE_LAST_V327',
    JSON.stringify({checkedAt:new Date().toISOString(),companies:output})
  );
  console.log(JSON.stringify(output, null, 2));
  return output;
}

function installContentAutomationTriggersV327() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'scheduledContentMaintenanceV327') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('scheduledContentMaintenanceV327')
    .timeBased()
    .everyHours(6)
    .create();

  var output = {
    success: true,
    version: 'V327_ALL_COMPANY_PAGE_RESOLVER',
    receiver: 'Gmail 1',
    handler: 'scheduledContentMaintenanceV327',
    intervalHours: 6,
    workspaceTouched: false
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}


/* =========================================================
   V327 R1 — ALL 4 COMPANIES PUBLIC DIAGNOSTIC
   Tree source is Ads on frontend; content source is Page API.
   No Access Token is returned or logged.
   ========================================================= */


/** V328 R1 — kiểm tra bản vá VN/KF, không lộ token. */


/** Chẩn đoán nhanh VN + KF sau khi deploy V328 R1. Không trả token. */


/* =========================================================
   V330 R1 — EXACT POST FIRST / NO MIXED BATCH
   - Page quyền OK nhưng candidate rời lỗi không được làm rớt exact story ID.
   - Chỉ probe Page đã suy ra khi creative có Page ID.
   - Mỗi PAGEID_POSTID gọi riêng; success dừng ngay.
   ========================================================= */


