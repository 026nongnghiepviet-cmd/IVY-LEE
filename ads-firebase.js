/* V308: TỔNG QUAN ADS DẠNG CÂY — gom theo Nhân viên → Chiến dịch → Nhóm quảng cáo → Bài quảng cáo; cấp Bài mở popup creative thật từ Meta. Giữ số liệu cấp bài V307 và refresh thông minh 2 phút. */
/* V307: TỔNG QUAN ADS THEO NỘI DUNG THẬT TỪ META — bỏ DATA CENTER; summary nhận creative + insights cấp bài; giao diện ưu tiên ảnh/video/caption/headline và chỉ số bài. Giữ refresh thông minh 2 phút. */
/* V306: CONTENT PERFORMANCE OVERVIEW — giữ nguyên Meta Live và refresh thông minh 2 phút, chỉ thiết kế lại tab Tổng quan Ads theo hướng nội dung dựa trên dữ liệu Meta đã lấy; không tạo Content Center/Firebase data mới. */
/* V305: REFRESH THÔNG MINH 2 PHÚT — quay lại tab/chuyển khu vực chỉ gọi Meta khi dữ liệu hiện tại đã cũ >=120 giây; nếu dưới 2 phút dùng ngay cache đang có. Nút Cập nhật Meta vẫn ép lấy dữ liệu mới ngay. Không có countdown và không auto-refresh nền. */
/* V304.1: META LIVE TINH GỌN + VAT + NGƯNG BUDGET TRACKING — bỏ truy cập tab Tài chính và scope Theo dõi ngân sách; mọi chi phí hiển thị trong Meta Live = Meta spend + VAT 10%, giữ spend gốc trong dữ liệu để đối chiếu API; đổi nhãn CTR thành CTR liên kết. */
/* V303: FOREGROUND REFRESH — khi tab trình duyệt chuyển từ hidden -> visible, Meta Live/Tài chính gọi Meta mới ngay; không có auto-refresh khi người dùng ở nguyên màn hình. */
/* V301: BÁO CÁO THEO THÁNG — lưu nhiều bộ file Tài chính theo tháng trong cùng node Firebase; tab Báo Cáo có bộ chọn tháng độc lập, chọn tháng nào đọc/xuất đúng dữ liệu tháng đó; upload tháng mới không xóa tháng cũ; xóa chỉ tháng đang chọn; tương thích tự động dữ liệu V299/V300 hiện hành. */
/* V300: CHUẨN HÓA ALIAS NHÂN VIÊN GIỮA TÊN NHÓM CŨ/MỚI — ví dụ `BÍCH THÙY NNV` và `Huỳnh Thị Bích Thùy` được nhận là cùng một nhân viên khi đối chiếu duy nhất. Ưu tiên họ tên đầy đủ từ cấu trúc nhóm mới và hồ sơ Marketing System; chỉ tự gộp khi không mơ hồ. Áp dụng trước mergeDuplicateAdsData nên Meta Live, Tài chính, biểu đồ, ngân sách và xuất Excel dùng chung danh tính chuẩn. Không đổi tên nhóm Meta gốc. */
/* V298: BÁO CÁO ĐỌC FILE TÀI CHÍNH — tab Báo Cáo không còn lấy Meta Live; Admin/ads=edit upload trực tiếp file Excel do tab Tài chính xuất (TaiChinh_ROAS). Hỗ trợ nhiều file/4 công ty, upload cùng kỳ sẽ thay đúng công ty và giữ các công ty còn lại; khác kỳ sẽ tạo bộ báo cáo mới. */
/* V302: META DIRECT NO COUNTDOWN — Meta Live/Tài chính không còn timer 5 phút. Mỗi thao tác mở/đổi công ty/đổi kỳ/quay lại tab/bấm cập nhật sẽ bỏ qua cache client và yêu cầu backend lấy Meta mới ngay; vẫn chống request trùng đang chạy. Báo Cáo V301 tiếp tục dùng file Tài chính theo tháng. */
/* V297: Tài chính khôi phục doanh thu đúng kỳ sau khi quay lại; bộ lọc khoảng ngày đồng bộ Kỳ báo cáo theo tháng của ngày kết thúc; chủ động đọc lại nguồn doanh thu/sao kê Firebase trước khi render. */
/* V296: Báo cáo mục 3 dùng TÊN NHÓM QUẢNG CÁO RÚT GỌN (tên sản phẩm) thay vì Campaign thật.
   - Chỉ ảnh hưởng mục 3. Nhóm quảng cáo Nổi bật / Cần cắt bỏ theo Công ty.
   - Với format mới: Tên sản phẩm | Họ tên nhân viên | Công ty | QC-Mã SP -> chỉ hiển thị Tên sản phẩm.
   - Campaign thật ở Meta Live/Tài chính/Xuất Excel/Báo cáo khác vẫn giữ nguyên.
   - Cơ chế gom nhóm Nhân viên + SKU/sản phẩm và toàn bộ chỉ số/xếp hạng không thay đổi. */
/* V295: Ngân sách kế hoạch vs thực tế bổ sung bộ chọn tháng; mặc định tháng hiện tại, cho xem lại tháng cũ với Meta cả tháng và kế hoạch Firebase đúng tháng; tháng đã đóng không dự báo giả. */
/* V294: TÁCH TÊN CHIẾN DỊCH THẬT KHỎI TÊN NHÓM — Tên chiến dịch luôn lấy từ campaign_name/campaignName của Meta Ads Manager; tên nhóm mới chỉ dùng để tách Sản phẩm + Nhân viên + Công ty + SKU. Cơ chế gom nhóm vẫn giữ Nhân viên + SKU/tên sản phẩm như V293. Nếu một hàng gom chứa nhiều campaign thật, giao diện/Excel hiển thị đầy đủ danh sách campaign, không suy diễn campaign từ tên nhân viên. */
/* V293: NHẬN DẠNG TÊN NHÓM QUẢNG CÁO MỚI — hỗ trợ cấu trúc `Tên sản phẩm | Họ tên nhân viên | Công ty | QC-Mã SP` (vd `22-22-22+TE | Nguyễn Thị Bé Thảo | VN | QC-OVN89`). Nhận đúng sản phẩm, họ tên đầy đủ, công ty và SKU; giữ parser cũ làm fallback cho dữ liệu lịch sử. Các chức năng Meta Live, gom nhóm, Theo dõi ngân sách, Revenue Ledger, Tài chính và xuất Excel dùng dữ liệu đã chuẩn hóa; không đổi logic số liệu. */
/* V292: Tên file Excel Tài chính dùng Từ ngày_Đến ngày của kỳ đang xem, ví dụ ChiPhiQC_NongNghiepViet_01082026_31082026.xlsx. */
/* V291: XUẤT TÀI CHÍNH HỌ TÊN ĐẦY ĐỦ — cột Nhân Viên trong Excel ưu tiên userName từ campaign_employee_links_v1; fallback resolveCampaignOwnerV266 rồi mới dùng nhãn rút gọn item.employee. Không đổi logic số liệu Tài chính. */
/* V290: Theo dõi ngân sách bỏ hoàn toàn Upload doanh thu; doanh thu chỉ đọc Revenue Ledger dùng chung từ Thống kê ROAS. Giữ nguyên toàn bộ logic V289 và trước đó. */
/* V289: Notification Ad Preview — nút “Xem quảng cáo” ở thông báo cấp Bài mở trực tiếp popup creative Facebook gồm nội dung + ảnh/video/carousel; tự khôi phục adsetId từ Activity State nếu thông báo cũ chưa lưu. */
/* V288: Theo dõi ngân sách — KPI Chi phí trong khoảng lấy trực tiếp Meta theo đúng Nhân viên/Nhóm + Từ ngày/Đến ngày; không cộng chi phí các stage ngân sách. */
/* V287: Theo dõi ngân sách — khi có mốc giảm/tăng kế tiếp, khóa Chi Meta sau đổi của stage trước bằng baseline đã lưu của mốc kế tiếp; không làm mất số đã có khi 400→150 rồi 150→100. */
/* V286: META ACCESS — chỉ chặn Google/Firebase user chưa có hồ sơ Marketing System; Anonymous Guest giữ ads:view nhưng vẫn bị chặn Meta theo cơ chế V220 hiện tại. Không đổi backend Meta. */
/* V285: ACTION TIME NOT SYNC TIME — thông báo Activity ưu tiên created_time/updated_time thật từ Meta; không còn lấy giờ đồng bộ cho tạo mới/đổi tên/trạng thái/lịch/mục tiêu. Sự kiện không có timestamp chính xác (removed, auto budget grouped) giữ thời điểm phát hiện và lưu rõ độ chính xác. */
/* V284: SPECIAL OWNER PHÒNG MKT — chỉ chiến dịch có nhãn MARKETING (sau khi bỏ suffix công ty) được liên kết tới tài khoản tên chính xác “Phòng MKT”; mọi user khác giữ nguyên logic ghép tên V266. */
/* V282: Notification Delivery Receipt — giữ nguyên cơ chế phát V269; ghi trạng thái Global/Cá nhân vào chính global activity để Admin kiểm tra trong tab Ghi nhận. */
/* V281: Media UI — video thumbnail có badge ▶; multi-image có +N; double-click mở gallery giữa màn hình; click đơn chỉ mở Facebook link. */
/* V280: Frontend không tự chọn ảnh lại; dùng primary_media_url/source do backend V221 quyết định. Giữ click đơn mở bài, double-click phóng ảnh. */
/* V279: Ưu tiên ảnh render lớn của chính AdCreative V220; Page story chỉ fallback. Giữ click đơn mở link + double click phóng ảnh. */
/* V278: Thumbnail interactions — click 1 lần mở bài Facebook; double-click mở ảnh lớn giữa màn hình; không hiện popup thông tin. */
/* V277: Đơn giản xem bài quảng cáo — bỏ nút/popup preview; thêm thumbnail sau STT, click ảnh mở bài Facebook. */
/* V276: Preview sharpness — hỗ trợ story full_picture V218, không phóng ảnh vượt kích thước tự nhiên, hiển thị nguồn ảnh preview. */
/* V275: Xem bài quảng cáo trực tiếp trên giao diện với popup preview hiện đại, sạch và rõ ràng. */
/* V274: Đổi KH & BC thành BC & KH; sửa Kế hoạch lấy Thực tế/Dự báo qua API Meta Direct public requestMetaSummaryCachedV215 thay vì gọi hàm private trong IIFE V206. */
/* V273: Khôi phục tỷ lệ chiều cao Tài chính Tổng quan/Marketing: card biểu đồ luôn bằng card bảng dữ liệu; không ảnh hưởng Theo dõi ngân sách. */
/* V272: Sửa gom sản phẩm trong Tỷ trọng & chất lượng quảng cáo theo giao nhau SKU: chỉ cần trùng ít nhất 1 mã là cùng nhóm; hỗ trợ liên kết bắc cầu; ghi chú gộp mã duy nhất. */
/* V271: Ma trận dùng ngưỡng động Firebase: CTR, Mua/Tin, F, Giá/Mua, Giá/Tin, ROAS, Mốc ngân sách test; bỏ trống = không áp dụng; chỉ Admin/ads=edit được lưu; mọi chẩn đoán/chart/modal cập nhật realtime theo cấu hình. */
/* V270: UI refinement — bỏ scroll Tỷ trọng & chất lượng quảng cáo, thu nhỏ biểu đồ Theo dõi ngân sách, kéo dài ô tìm kiếm ngân sách, thêm LIVE xanh dương vào KPI Chi phí Ads Meta Live. */
/* V269: Phân luồng thông báo theo quyền: cá nhân nhận Ads của mình; ads=edit nhận toàn bộ Ads; Admin nhận Account feed toàn hệ thống qua RBAC V20.13; chống trùng theo activityId. */
/* V268: Migration-safe cho Activity 3 cấp: lần fresh sync đầu sau nâng cấp chỉ dựng baseline Campaign/Adset/Ad, không gửi hàng loạt thông báo cũ; từ fresh sync tiếp theo mới phát event. */
/* V267: Activity Notification đầy đủ 3 cấp Chiến dịch/Nhóm/Bài: tạo mới, đổi tên, trạng thái, lịch chạy, campaign budget/objective, gỡ khỏi Meta & xuất hiện lại; ngân sách nhóm dùng Budget Tracking để tránh trùng. */
/* V266: Liên kết chiến dịch → tài khoản nhân viên theo hậu tố tên; thông báo theo tài khoản cho bài/nhóm mới, đổi trạng thái, tăng/giảm ngân sách. */
/* V265: Dời Ngân sách kế hoạch vs thực tế vào KH & BC; đổi tab Báo cáo MKT thành KH & BC; tách 2 mục con Báo cáo/Kế hoạch; chỉ đồng bộ kế hoạch khi mở mục Kế hoạch. */
/* V264: Sửa chuỗi stage Theo dõi ngân sách khi giảm/tăng tiếp: baseline chi phí của mốc kế tiếp đóng chính xác mốc trước; không còn mất Chi phí trước đổi / báo Chưa có chi lũy kế hiện tại sau khi 400→300. */
/* V263: Ngân sách kế hoạch vs thực tế + dự báo chi phí cuối tháng; chuông thông báo theo UID; gom cơ cấu sản phẩm bằng SKU, tên hiển thị ngắn nhất. */
/* V262: Cân layout Meta Live 46/54; biểu đồ cơ cấu hiển thị TÊN SẢN PHẨM và SKU là ghi chú; sửa Theo dõi ngân sách không còn hiện bảng Tổng quan/analytics. */
/* V261: Sửa layout Meta Live V260 bằng wrapper DOM thật: chart + phân tích ở hàng trên, Danh sách bài quảng cáo full-width ở hàng dưới; ổn định render doughnut chart. */
/* V260: So với kỳ thêm Hôm qua, mặc định Cùng kỳ tháng trước và nhớ lựa chọn người dùng; Meta Live chuyển Danh sách bài quảng cáo xuống dưới, bên phải là phân tích cơ cấu sản phẩm + mini charts. */
/* V259: Theo dõi ngân sách có Upload doanh thu trực tiếp theo đúng cấu trúc file ROAS V28; ghi chung Revenue Ledger, chống trùng đơn, chỉ ads=edit được upload. */
/* V258: Sửa quay lại menu Ads bị reset DOM, kẹt 'Đang kết nối Meta Live...' và mất chart; module chỉ mount UI một lần, re-entry dùng cache + redraw. */
/* V256: Báo cáo thêm scope Tổng quan/Marketing; tinh chỉnh khoảng cách cột Doanh thu-ROAS ở Đánh giá Năng lực Nhân sự. */
/* V255: Báo cáo MKT tự bảo đảm đủ Meta Live 4 công ty theo cùng cache 5 phút; chỉnh căn giữa nút Bật/Dừng đồng bộ. */
/* V253: Sửa Auto Budget Tracking cho Meta Direct/Multi-Bridge: baseline ngân sách dùng chung trên Firebase, không phụ thuộc cache trình duyệt; ghi event theo grouped row và không cần meta_live_locks legacy. */
/* V243: Bộ lọc Theo dõi ngân sách bắt buộc chọn Nhóm quảng cáo đã gom; KPI chỉ tính đúng nhóm + khoảng ngày; thanh tìm kiếm có gợi ý; sửa căn cột Trạng thái và Giá tin/CPA. */
/* V240: Auto budget events persist by grouped Meta Live row; increases/decreases above tracking base remain one chain; return <= base closes tracking. */
/* V241: Khôi phục bộ lọc Từ ngày/Đến ngày cho Theo dõi ngân sách; lọc theo stage giao nhau và tính lại chi phí/doanh thu/ROAS của khoảng xem. */
/* V239: Auto budget events visible + badge; Firebase Rules must allow _budget_performance_v166. */
/**
 * - V235: Khóa năm 4 chữ số trong popup mốc thủ công; stage tiếp nối tới ngân sách hiện tại dùng current spend/metrics đã lưu hoặc Meta hiện tại để tính từ mốc đổi tiếp theo đến hôm nay.

 * ADS MODULE V202 META LIVE (HÔM NAY 5 PHÚT + KHOẢNG CŨ 1 LẦN + HẬU KIỂM 50 GIỜ)

 * - FIX LỖI SẬP CHART: Loại bỏ plugin gây trắng Tab 3.

 * - FIX LỖI POPUP: Thêm hàm escapeHtml bọc thép dữ liệu chống gãy Layout khi click.

 * - LOGIC: Mốc Máy Học 500k. ROAS > 5 là kim bài miễn tử / không được tắt. Dưới 500k chỉ TEST TỐT khi đạt đủ 4/4 tiêu chí.

 * - V234: Sửa timeline thay đổi ngân sách: mốc thủ công có thời điểm đổi tiếp theo riêng; không còn tự gán ngân sách hiện tại về thời điểm mốc cũ. Auto event dùng thời điểm snapshot đầu tiên phát hiện thay đổi (độ chính xác theo chu kỳ Meta ~5 phút), không dùng adset.updated_time làm thời điểm đổi.
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
 * - V204: Meta chỉ gọi một lần theo snapshot dùng chung; Báo cáo MKT chỉ đọc Firebase, không tự gọi Meta.
 * - V190: Kỳ quá khứ chốt sau 50 giờ: nếu snapshot cuối còn trước mốc chốt thì refresh đúng một lần cuối, sau đó không tự gọi Meta lại.
 * - V201: Kỳ tháng cũ bỏ TTL 5 phút sau khi tháng kết thúc: tối đa 2 lần Meta sau cuối tháng (lần đầu sau khi đóng tháng, lần cuối tại/sau mốc 50 giờ); countdown đỏ không chạy cho tháng cũ; giữ nguyên trạng thái gom nhóm từ Meta.
 * - V202: Khoảng ngày đã kết thúc trước hôm nay trong tháng hiện tại chỉ gọi Meta đúng lần đầu nếu chưa có snapshot; sau đó luôn dùng Firebase, không hết hạn 5 phút. Khoảng chứa hôm nay vẫn TTL 5 phút. Khi tháng kết thúc, mọi snapshot của tháng chuyển sang tối đa 2 lần hậu kiểm, lần cuối tại/sau 50 giờ.
 * - V193: Lưu checkpoint spend 5 phút theo adset để mốc ngân sách thủ công có baseline gần thời điểm đổi mà không phải gọi Meta riêng.
 * - V196: Sửa chuỗi Theo dõi ngân sách: mỗi mốc kết thúc tại mốc kế tiếp; gom event theo adsetId ổn định; mốc tự động dùng checkpoint trước khi phát hiện đổi và ghi rõ độ chính xác 5 phút.
 * - V198: Theo dõi ngân sách tách hoàn toàn khỏi bộ lọc ngày chung; có phạm vi ngày nội bộ riêng và Meta reference độc lập.
 * - V199: Bỏ bộ lọc hiển thị bên ngoài Theo dõi ngân sách; ngày bắt đầu tùy chọn chỉ nằm trong popup Thêm/Sửa mốc thủ công và ngày kết thúc là hôm nay.
 * - V203: Popup Thêm/Sửa mốc thủ công tự truy xuất Meta theo Phạm vi dữ liệu riêng; lưu baseline/current vào Firebase event, không phụ thuộc bộ lọc chung và không mất khi đổi tab/công ty.
 * - V219: Workspace @phanbon.com.vn đăng nhập bằng Google luôn được Meta; Workspace đăng nhập bằng mật khẩu được Meta khi backend xác nhận tài khoản đã tồn tại trong Marketing System. Client không chặn sớm các email Workspace, để backend quyết định. Popup cảnh báo Guest chỉ do thao tác đăng nhập Guest thành công kích hoạt, không bật khi vừa mở link/khôi phục phiên cũ.
 * - V215: Meta hiện tại (kỳ có hôm nay) dùng sessionStorage + TTL server 5 phút; kỳ quá khứ lưu IndexedDB, không tự refresh 5 phút. Sau khi tháng chứa ngày kết thúc đóng đủ 50 giờ, kỳ quá khứ bắt buộc chốt lại Meta 1 lần (hoặc lần truy cập đầu tiên sau mốc đó) rồi lưu lâu dài. Không dùng Firebase period snapshot.
 * - V220: Chỉ Firebase Anonymous Guest bị chặn/hiện cảnh báo ngưng Meta. Mọi tài khoản có email/role được phép đi tới backend để backend quyết định quyền; Workspace không bị role guest tạm thời chặn. Loại bỏ isGuestMode khỏi lazy detail để tránh sai trạng thái sau khi RBAC vừa cập nhật.
 * - V227: Revenue Ledger ưu tiên chống trùng theo Công ty + Mã đơn hàng (fallback fingerprint), tận dụng matchedGroupKey/matchedAdsetName/matchedSku từ ROAS và phân bổ mỗi đơn tối đa một lần cho giai đoạn ngân sách phù hợp nhất; trường hợp nhiều adset cùng khớp nhưng không thể xác định duy nhất sẽ không nhân đôi doanh thu.
 * - V230: Fix runtime thiếu normalizeAdsetRevenueNameV227; chuẩn hóa tên member adset nhưng giữ SKU để ghép Revenue Ledger đúng hàng đã gom.
 * - V232: Popup mốc ngân sách thủ công không còn tự nhảy năm ở ô Dữ liệu từ ngày; cho nhập YYYY-MM-DD hoặc DD/MM/YYYY và chỉ chuẩn hóa sau khi người dùng hoàn tất. Khi đổi tab Meta Live/Tài chính, biểu đồ được dựng lại sau khi tab ổn định kích thước; scope Theo dõi ngân sách cũng tự redraw, không cần bấm qua lại.
 * - V233: Trả ô Dữ liệu từ ngày về input date native như cũ; bỏ min/max và không tự clamp/ghi đè ngày người dùng chọn. Sửa riêng animation 3 chấm Meta Live Tổng quan bị rule chart-card ép duration=0.
 * - V229: Fix runtime thiếu getRevenueGroupedContextV228/revenueGroupedStageKeyV228; giữ nguyên logic V228.
 * - V228: Theo dõi ngân sách lấy HÀNG ĐÃ GOM (cùng logic Meta Live: Nhân sự + SKU/tên sản phẩm) làm danh tính chuẩn khi ghép Revenue Ledger; adset gốc chỉ là thành viên đối chiếu, matchedAdsetName được so với toàn bộ memberNames của nhóm gom và candidate trùng cùng group-stage được dedupe trước khi phân bổ doanh thu.
 * - V221: So với kỳ tự tải lại ngay khi Meta chính sẵn sàng; popup thân thiện cho tài khoản không được xem Meta thật; mobile scope Tổng quan/Marketing/Theo dõi ngân sách không bị header bảng đè.
 * - V222: Tách tiêu đề và 3 scope tab thành hai hàng; desktop search không che Theo dõi ngân sách; mobile status + countdown cùng hàng; loading Meta dùng ba chấm; bỏ badge META LIVE cạnh Danh sách bài quảng cáo.
 * - V224: Mobile Meta Live đặt Tổng quan cùng hàng tiêu đề, Marketing + Theo dõi ngân sách ở hàng kế; Finance countdown nằm cùng header Tài chính; khôi phục animation ba chấm bị CSS chart-card vô hiệu hóa.
 * - V226: Không coi cache normalized thiếu daily_budget/lifetime_budget là ngân sách giảm về 0; giữ ngân sách khi khôi phục sessionStorage và ẩn Lịch sử xuất/Xuất Excel ở riêng tab Tài chính > Theo dõi ngân sách.
 * - V236: Đổi tên “Sau đổi ngân sách” thành “Theo dõi ngân sách”; mốc đổi tiếp theo do người dùng nhập được lưu thành event thủ công độc lập để xóa/sửa riêng, còn mốc Meta tự ghi nhận không có nút xóa. Xóa một mốc chỉ xóa đúng event Firebase đó.
 * - V216: Sửa So với kỳ dùng Meta Direct V215 + sessionStorage/IndexedDB thay vì Firebase period snapshot; nút Đặt lại mặc định Kỳ liền trước.
 * - V218: Chỉ Anonymous Guest bị chặn Meta Live. Google Workspace @phanbon.com.vn luôn được dùng Meta Direct/cache kể cả RBAC đang là guest hoặc chưa có hồ sơ hệ thống; quyền các module khác vẫn do RBAC xử lý độc lập.
 * - V214: Meta Live không còn ghi/đọc period snapshot Firebase. Nhân viên + Trang chủ dùng Meta Direct on-demand; Guest không tải snapshot. Chỉ giữ các ledger nhỏ phục vụ lịch sử ngân sách/checkpoint.
 * - V209: Popup Thêm/Sửa thay đổi ngân sách thủ công chỉ hiển thị nhóm ĐÃ GOM đúng logic bảng chính; baseline/current được cộng theo toàn bộ adset thuộc hàng gom, không bung về nhóm Meta gốc.
 * - V210: Ghi nhận cả tăng/giảm ngân sách; chỉ theo dõi khi ngân sách tăng. Khi ngân sách của đúng nhóm giảm về bằng/thấp hơn mức trước lần tăng thì tự ngưng theo dõi. Trạng thái Đang theo dõi có menu ngưng thủ công và lưu mốc dừng vào Firebase.
 * - V211: F5 giữ nguyên TTL/data summary trong sessionStorage nên không reset giây và không gọi Meta lại khi cache còn hạn; biểu đồ Theo dõi ngân sách giản lược theo từng mức ngân sách; trạng thái mở popup nhỏ thay dropdown và ẩn ghi chú Thiếu SKU.
 * - V212: Phạm vi popup thủ công dùng cùng cache Meta 5 phút; chặn/điều chỉnh ngày bắt đầu vượt cửa sổ 37 tháng trước khi gửi request để tránh lỗi Meta #3018 khi đổi công ty.
 * - V200: Giữ Chi Meta sau đổi ổn định khi chuyển tab bằng cache reference theo công ty + khoảng ngày; không xóa snapshot hợp lệ trước khi có bản mới. Xóa chữ/nút “Toàn bộ” khỏi popup thủ công.
 * - V189: Mọi company + khoảng ngày dùng TTL Meta Live 5 phút như nhau; kỳ quá khứ không bị đóng băng, snapshot rỗng vẫn hợp lệ, chỉ context đang được xem mới được kiểm tra/làm mới.
 * - V185: Toàn bộ Meta Live dùng chung chu kỳ 5 phút; chuyển tab/công ty/đổi kỳ/nút cập nhật chỉ kiểm tra Firebase, không ép gọi Meta trước khi snapshot hết hạn.

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

// V205: Ngăn initAdsAnalysis gắn trùng các listener Firebase nặng khi auth/UI khởi tạo lại.
// Không thay đổi dữ liệu hoặc cơ chế Meta Live; chỉ bảo đảm mỗi listener lịch sử tồn tại 1 lần/tab trình duyệt.
let ADS_UPLOAD_HISTORY_LISTENERS_BOUND_V205 = false;
let ADS_DATA_LISTENER_BOUND_V205 = false;



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
let REPORT_DATA_SCOPE = 'overview'; // V256: Báo cáo Tổng quan / Marketing

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
// V202: TTL 5 phút CHỈ áp dụng cho khoảng ngày có chứa hôm nay.
// Khoảng đã kết thúc trước hôm nay trong tháng hiện tại: nếu đã có snapshot hợp lệ
// thì dùng Firebase luôn, không gọi Meta lại dù đã quá 5 phút.
// Khi tháng kết thúc, toàn bộ snapshot của tháng chuyển sang chính sách hậu kỳ:
// tối đa 2 lần gọi Meta, lần cuối tại/sau mốc 50 giờ kể từ cuối tháng.
// Chỉ chỉnh con số này khi muốn đổi chu kỳ cho dữ liệu có chứa hôm nay. 300000 ms = 5 phút.
const META_LIVE_REFRESH_INTERVAL_MS = 300000;
// V305: ngưỡng freshness theo thao tác người dùng, độc lập cache server legacy 5 phút.
const META_RETURN_REFRESH_MIN_INTERVAL_MS_V305 = 120000;

// Snapshot có chứa hôm nay chỉ được xem là hết hạn sau đúng một chu kỳ 5 phút.
// Snapshot rỗng (rows = []) vẫn hợp lệ nếu có checkedAt.
// Khoảng đã kết thúc trước hôm nay không dùng TTL sau lần lấy đầu tiên.
// Với tháng đã đóng, canUseMetaSnapshotWithoutRefreshV202() dùng lịch 2 lần hậu kỳ.
const META_LIVE_STALE_AFTER_MS = META_LIVE_REFRESH_INTERVAL_MS;

// Lease leader chỉ chống nhiều máy gọi Meta đồng thời; không phải chu kỳ đồng bộ.
const META_LIVE_LOCK_LEASE_MS = 120000;

// V201: Chính sách tháng cũ sau khi tháng kết thúc.
// - Không còn refresh theo TTL 5 phút cho tháng đã đóng.
// - Tối đa 2 lần kiểm tra Meta sau cuối tháng:
//   (1) lần đầu tiên sau khi tháng đóng để lấy dữ liệu hậu kỳ mới nhất;
//   (2) lần cuối tại/sau mốc 50 giờ kể từ cuối tháng.
// - Sau lần cuối, snapshot được chốt và không tự gọi Meta lại.
// Nếu người dùng chỉ mở tháng cũ lần đầu sau mốc 50 giờ thì chỉ cần 1 lần gọi cuối.
const META_HISTORICAL_FINALIZE_AFTER_MS = 50 * 60 * 60 * 1000;
const META_HISTORICAL_POST_CLOSE_REFRESH_LIMIT = 2;

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
// Báo cáo MKT dùng chung đúng chu kỳ Meta Live 5 phút, không có đồng hồ riêng.
const META_LIVE_REPORT_REFRESH_INTERVAL_MS = META_LIVE_REFRESH_INTERVAL_MS;


// =========================================================
// V254 — BÁO CÁO MKT BẬT / DỪNG ĐỒNG BỘ
// - Không tạo lịch sử snapshot theo từng lần upload.
// - Chỉ dùng 1 node hiện hành: marketing_report_sync_v1/current.
// - Dừng: ghi đè đúng bộ reportData đang hiển thị + kỳ dữ liệu.
// - Bật: xóa frozenRows khỏi node hiện hành và dùng lại dữ liệu live.
// - Chỉ user có ads=edit (hoặc Admin) mới được thay đổi trạng thái.
// =========================================================
const MARKETING_REPORT_SYNC_PATH_V254 = 'marketing_report_sync_v1/current';
const MARKETING_REPORT_SYNC_VERSION_V254 = 'V254_REPORT_SYNC_TOGGLE';
let MARKETING_REPORT_SYNC_REF_V254 = null;
let MARKETING_REPORT_SYNC_BOUND_V254 = false;
let MARKETING_REPORT_SYNC_STATE_V254 = {
    loaded: false,
    enabled: true,
    sourceMode: '',
    frozenRows: [],
    files: [],
    datasets: {},
    period: null,
    frozenAt: 0,
    updatedAt: 0,
    updatedByUid: '',
    updatedByEmail: '',
    updatedByName: ''
};

const MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301 = 'MKT_REPORT_SELECTED_MONTH_V301';
let MARKETING_REPORT_SELECTED_MONTH_V301 = '';
try {
    MARKETING_REPORT_SELECTED_MONTH_V301 = String(localStorage.getItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301) || '').trim();
} catch (error) {}

function canManageMarketingReportSyncV254() {
    try {
        if (window.MKTRBAC && typeof window.MKTRBAC.canEdit === 'function') {
            return window.MKTRBAC.canEdit('ads') === true;
        }
        if (window.MKTRBAC && typeof window.MKTRBAC.isAdmin === 'function' && window.MKTRBAC.isAdmin()) {
            return true;
        }
    } catch (error) {}
    try {
        if (String(window.MKT_CURRENT_ROLE || '').toLowerCase() === 'admin') return true;
        if (window.MKT_PERMISSIONS && String(window.MKT_PERMISSIONS.ads || '').toLowerCase() === 'edit') return true;
        if (window.USER_PERMISSIONS && String(window.USER_PERMISSIONS.ads || '').toLowerCase() === 'edit') return true;
    } catch (error) {}
    return false;
}

function getMarketingReportActorV254() {
    let user = null;
    try {
        user = (window.sysAuth && window.sysAuth.currentUser) ||
            (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null);
    } catch (error) {}

    return {
        uid: String(user && user.uid || '').trim(),
        email: String(user && user.email || '').trim().toLowerCase(),
        name: String(
            window.myIdentity ||
            (user && user.displayName) ||
            (user && user.email) ||
            ''
        ).trim()
    };
}

function normalizeMarketingReportSyncStateV254(value) {
    value = value && typeof value === 'object' ? value : {};

    // V301: Báo Cáo chỉ chấp nhận nguồn file Excel Tài chính, nhưng có thể giữ nhiều tháng.
    const sourceMode = String(value.sourceMode || '');
    const isFinanceFileSource = sourceMode === 'finance_excel_upload_v298';
    const datasets = {};

    if (isFinanceFileSource && value.datasets && typeof value.datasets === 'object') {
        Object.keys(value.datasets).forEach(monthKey => {
            if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) return;
            const raw = value.datasets[monthKey];
            if (!raw || typeof raw !== 'object') return;
            const rawPeriod = raw.period && typeof raw.period === 'object' ? raw.period : {};
            const from = String(rawPeriod.from || '');
            const to = String(rawPeriod.to || '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return;

            datasets[monthKey] = {
                monthKey,
                period: {
                    from,
                    to,
                    periodKey: String(rawPeriod.periodKey || `${from}_${to}`)
                },
                frozenRows: Array.isArray(raw.frozenRows) ? raw.frozenRows : [],
                files: Array.isArray(raw.files) ? raw.files : [],
                rowCount: Number(raw.rowCount || (Array.isArray(raw.frozenRows) ? raw.frozenRows.length : 0)),
                frozenAt: Number(raw.frozenAt || 0),
                updatedAt: Number(raw.updatedAt || 0),
                updatedByUid: String(raw.updatedByUid || ''),
                updatedByEmail: String(raw.updatedByEmail || ''),
                updatedByName: String(raw.updatedByName || '')
            };
        });
    }

    // Tự migrate trong RAM dữ liệu V299/V300 chỉ có một kỳ ở top-level.
    const legacyPeriod = isFinanceFileSource && value.period && typeof value.period === 'object'
        ? {
            from: String(value.period.from || ''),
            to: String(value.period.to || ''),
            periodKey: String(value.period.periodKey || '')
        }
        : null;

    if (
        legacyPeriod &&
        /^\d{4}-\d{2}-\d{2}$/.test(legacyPeriod.from) &&
        /^\d{4}-\d{2}-\d{2}$/.test(legacyPeriod.to)
    ) {
        const legacyMonth = legacyPeriod.to.slice(0, 7);
        if (!datasets[legacyMonth]) {
            datasets[legacyMonth] = {
                monthKey: legacyMonth,
                period: legacyPeriod,
                frozenRows: Array.isArray(value.frozenRows) ? value.frozenRows : [],
                files: Array.isArray(value.files) ? value.files : [],
                rowCount: Number(value.rowCount || (Array.isArray(value.frozenRows) ? value.frozenRows.length : 0)),
                frozenAt: Number(value.frozenAt || 0),
                updatedAt: Number(value.updatedAt || 0),
                updatedByUid: String(value.updatedByUid || ''),
                updatedByEmail: String(value.updatedByEmail || ''),
                updatedByName: String(value.updatedByName || '')
            };
        }
    }

    return {
        loaded: true,
        // Giữ false để cơ chế cũ tuyệt đối không tự gọi Meta cho Báo Cáo.
        enabled: false,
        sourceMode: isFinanceFileSource ? sourceMode : '',
        frozenRows: isFinanceFileSource && Array.isArray(value.frozenRows) ? value.frozenRows : [],
        period: legacyPeriod,
        files: isFinanceFileSource && Array.isArray(value.files) ? value.files : [],
        datasets,
        rowCount: isFinanceFileSource ? Number(value.rowCount || 0) : 0,
        frozenAt: Number(value.frozenAt || 0),
        updatedAt: Number(value.updatedAt || 0),
        updatedByUid: String(value.updatedByUid || ''),
        updatedByEmail: String(value.updatedByEmail || ''),
        updatedByName: String(value.updatedByName || ''),
        version: String(value.version || '')
    };
}

function formatMarketingReportSyncTimeV254(ms) {
    const value = Number(ms || 0);
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(new Date(value));
    } catch (error) {
        return new Date(value).toLocaleString('vi-VN');
    }
}


function getMarketingReportAvailableMonthsV301() {
    const datasets = MARKETING_REPORT_SYNC_STATE_V254 && MARKETING_REPORT_SYNC_STATE_V254.datasets;
    return Object.keys(datasets && typeof datasets === 'object' ? datasets : {})
        .filter(month => /^\d{4}-\d{2}$/.test(month))
        .sort((a,b) => b.localeCompare(a));
}

function getMarketingReportDatasetV301(monthValue) {
    const datasets = MARKETING_REPORT_SYNC_STATE_V254 && MARKETING_REPORT_SYNC_STATE_V254.datasets;
    const map = datasets && typeof datasets === 'object' ? datasets : {};
    const requested = String(monthValue !== undefined ? monthValue : MARKETING_REPORT_SELECTED_MONTH_V301 || '').trim();

    if (requested) return map[requested] || null;

    const months = getMarketingReportAvailableMonthsV301();
    return months.length ? (map[months[0]] || null) : null;
}

function ensureMarketingReportSelectedMonthV301() {
    if (MARKETING_REPORT_SELECTED_MONTH_V301) return MARKETING_REPORT_SELECTED_MONTH_V301;
    const months = getMarketingReportAvailableMonthsV301();
    if (months.length) {
        MARKETING_REPORT_SELECTED_MONTH_V301 = months[0];
        try { localStorage.setItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301, MARKETING_REPORT_SELECTED_MONTH_V301); } catch (error) {}
    }
    return MARKETING_REPORT_SELECTED_MONTH_V301;
}

function formatMarketingReportMonthLabelV301(monthKey) {
    const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
    return match ? `Tháng ${match[2]}/${match[1]}` : 'Chưa chọn tháng';
}

function syncMarketingReportMonthControlV301() {
    const input = document.getElementById('report-month-select-v301');
    if (!input) return;
    const selected = ensureMarketingReportSelectedMonthV301();
    input.value = selected || '';
}

function changeMarketingReportMonthV301(value) {
    const month = String(value || '').trim();
    if (month && !/^\d{4}-\d{2}$/.test(month)) return;

    MARKETING_REPORT_SELECTED_MONTH_V301 = month;
    try {
        if (month) localStorage.setItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301, month);
        else localStorage.removeItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301);
    } catch (error) {}

    renderMarketingReportSyncControlsV254();
    if (CURRENT_TAB === 'report') renderReportPreview();
}
window.changeMarketingReportMonthV301 = changeMarketingReportMonthV301;
window.getMarketingReportAvailableMonthsV301 = getMarketingReportAvailableMonthsV301;
window.getMarketingReportDatasetV301 = getMarketingReportDatasetV301;

function getEffectiveMarketingReportPeriodV254() {
    ensureMarketingReportSelectedMonthV301();
    const dataset = getMarketingReportDatasetV301();
    if (
        dataset && dataset.period &&
        /^\d{4}-\d{2}-\d{2}$/.test(String(dataset.period.from || '')) &&
        /^\d{4}-\d{2}-\d{2}$/.test(String(dataset.period.to || ''))
    ) {
        return {
            from: dataset.period.from,
            to: dataset.period.to
        };
    }
    return { from:'', to:'' };
}

function renderMarketingReportSyncControlsV254() {
    // V301: trạng thái và nút thao tác luôn đi theo tháng Báo Cáo đang chọn.
    const status = document.getElementById('report-upload-status-v298');
    const uploadButton = document.getElementById('report-upload-btn-v298');
    const clearButton = document.getElementById('report-clear-btn-v298');
    const monthInput = document.getElementById('report-month-select-v301');
    const allowed = canManageMarketingReportSyncV254();
    const state = MARKETING_REPORT_SYNC_STATE_V254;

    ensureMarketingReportSelectedMonthV301();
    const selectedMonth = MARKETING_REPORT_SELECTED_MONTH_V301;
    const dataset = getMarketingReportDatasetV301(selectedMonth);

    if (monthInput) {
        monthInput.value = selectedMonth || '';
        const months = getMarketingReportAvailableMonthsV301();
        monthInput.title = months.length
            ? `Đã có dữ liệu: ${months.map(formatMarketingReportMonthLabelV301).join(', ')}`
            : 'Chưa có tháng nào được upload.';
    }

    if (uploadButton) {
        uploadButton.style.display = allowed ? 'inline-flex' : 'none';
        uploadButton.disabled = !state.loaded;
    }

    if (clearButton) {
        clearButton.style.display = allowed && state.loaded && dataset && Array.isArray(dataset.frozenRows) && dataset.frozenRows.length
            ? 'inline-flex'
            : 'none';
    }

    if (!status) return;

    if (!state.loaded) {
        status.className = 'report-sync-status-v254 is-loading';
        status.textContent = 'Đang đọc file Báo Cáo';
        return;
    }

    if (!selectedMonth) {
        status.className = 'report-sync-status-v254 is-paused';
        status.textContent = 'Chưa chọn tháng';
        status.title = 'Chọn tháng cần xem hoặc up file Tài chính.';
        return;
    }

    const rows = dataset && Array.isArray(dataset.frozenRows) ? dataset.frozenRows : [];
    if (!rows.length || state.sourceMode !== 'finance_excel_upload_v298') {
        status.className = 'report-sync-status-v254 is-paused';
        status.textContent = `${formatMarketingReportMonthLabelV301(selectedMonth)} • Chưa có file`;
        status.title = 'Hãy up file Excel được xuất từ tab Tài chính cho tháng này.';
        return;
    }

    const fileCount = Array.isArray(dataset.files) ? dataset.files.length : 0;
    const when = formatMarketingReportSyncTimeV254(dataset.updatedAt || dataset.frozenAt || state.updatedAt || state.frozenAt);
    status.className = 'report-sync-status-v254 is-live';
    status.textContent = `${formatMarketingReportMonthLabelV301(selectedMonth)} • ${fileCount || 1} file • ${rows.length} dòng${when ? ' • ' + when : ''}`;
    status.title = (dataset.files || []).map(item => item && item.fileName).filter(Boolean).join('\n');
}

function bindMarketingReportSyncV254() {
    if (MARKETING_REPORT_SYNC_BOUND_V254 && MARKETING_REPORT_SYNC_REF_V254) {
        renderMarketingReportSyncControlsV254();
        return Promise.resolve(MARKETING_REPORT_SYNC_STATE_V254);
    }

    if (!db) db = getDatabase();
    if (!db) {
        MARKETING_REPORT_SYNC_STATE_V254 = {
            ...MARKETING_REPORT_SYNC_STATE_V254,
            loaded: true,
            enabled: true
        };
        renderMarketingReportSyncControlsV254();
        return Promise.resolve(MARKETING_REPORT_SYNC_STATE_V254);
    }

    MARKETING_REPORT_SYNC_BOUND_V254 = true;
    MARKETING_REPORT_SYNC_REF_V254 = db.ref(MARKETING_REPORT_SYNC_PATH_V254);

    MARKETING_REPORT_SYNC_REF_V254.on('value', snapshot => {
        MARKETING_REPORT_SYNC_STATE_V254 = normalizeMarketingReportSyncStateV254(snapshot.val());
        ensureMarketingReportSelectedMonthV301();
        renderMarketingReportSyncControlsV254();
        if (CURRENT_TAB === 'report') {
            clearTimeout(META_LIVE_REPORT_RENDER_TIMER);
            META_LIVE_REPORT_RENDER_TIMER = setTimeout(() => renderReportPreview(), 20);
        }
    }, error => {
        console.warn('Không đọc được trạng thái đồng bộ Báo cáo MKT:', error && error.message ? error.message : error);
        MARKETING_REPORT_SYNC_STATE_V254 = {
            ...MARKETING_REPORT_SYNC_STATE_V254,
            loaded: true,
            enabled: true
        };
        renderMarketingReportSyncControlsV254();
        if (CURRENT_TAB === 'report') renderReportPreview();
    });

    return Promise.resolve(MARKETING_REPORT_SYNC_STATE_V254);
}

function getLiveMarketingReportDataV254(period) {
    const livePeriod = period || getMetaLivePeriod();
    const desiredPeriodKey = getMetaLivePeriodKey(livePeriod);
    let liveRows = [];

    if (META_LIVE_REPORT_PERIOD_KEY === desiredPeriodKey) {
        liveRows = META_LIVE_REPORT_DATA.filter(item => (
            item.report_start_iso === livePeriod.from &&
            item.report_end_iso === livePeriod.to
        ));
    }

    return {
        period: livePeriod,
        periodKey: desiredPeriodKey,
        liveRows,
        reportData: liveRows.length
            ? enrichMetaReportRowsWithLatestFinanceSources(liveRows, desiredPeriodKey)
            : []
    };
}

function cloneMarketingReportRowsForFirebaseV254(rows) {
    try {
        return JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : []));
    } catch (error) {
        throw new Error('Không thể đóng băng dữ liệu Báo cáo MKT hiện tại.');
    }
}

async function toggleMarketingReportSyncV254() {
    // V298 compatibility: nút đồng bộ cũ không còn tồn tại.
    // Nếu code cũ gọi hàm này thì mở hộp chọn file Tài chính, tuyệt đối không gọi Meta.
    openMarketingReportFinanceUploadV298();
    return true;
}

window.toggleMarketingReportSyncV254 = toggleMarketingReportSyncV254;
window.getMarketingReportSyncStateV254 = function() {
    return {
        ...MARKETING_REPORT_SYNC_STATE_V254,
        frozenRows: Array.isArray(MARKETING_REPORT_SYNC_STATE_V254.frozenRows)
            ? `[${MARKETING_REPORT_SYNC_STATE_V254.frozenRows.length} rows]`
            : '[]'
    };
};
window.bindMarketingReportSyncV254 = bindMarketingReportSyncV254;


// =========================================================
// V298 — BÁO CÁO TỪ FILE EXCEL XUẤT Ở TAB TÀI CHÍNH
// - Không gọi Meta Live cho tab Báo Cáo.
// - File chuẩn: ChiPhiQC_{Company}_{ddMMyyyy}_{ddMMyyyy}.xlsx
// - V299: chấp nhận hậu tố file trùng do Windows/Chrome tự thêm, ví dụ ` (3)`.
// - Sheet chuẩn: TaiChinh_ROAS.
// - Có thể chọn nhiều file cùng lúc; cùng kỳ sẽ ghép 4 công ty.
// - Upload lại một công ty cùng kỳ sẽ thay đúng công ty đó.
// - V301: lưu nhiều tháng; upload tháng mới không xóa tháng cũ, chọn tháng nào xem tháng đó.
// =========================================================
const MARKETING_REPORT_FILE_SOURCE_V298 = 'finance_excel_upload_v298';
const MARKETING_REPORT_FILE_VERSION_V298 = 'V301_REPORT_MONTHLY_FINANCE_FILE_UPLOAD';

function financeReportCompanyFromFileV298(fileName) {
    const normalized = normalizeAdsText(String(fileName || '').replace(/\.[^.]+$/, ''));
    const map = [
        { company:'NNV', keys:['chiph\u00edqc nongnghiepviet','chiphiqc nongnghiepviet','nongnghiepviet'] },
        { company:'VN', keys:['chiph\u00edqc vietnhat','chiphiqc vietnhat','vietnhat'] },
        { company:'KF', keys:['chiph\u00edqc kingfarm','chiphiqc kingfarm','kingfarm'] },
        { company:'ABC', keys:['chiph\u00edqc abcvietnam','chiphiqc abcvietnam','abcvietnam'] }
    ];

    for (const item of map) {
        if (item.keys.some(key => normalized.includes(normalizeAdsText(key)))) return item.company;
    }
    return '';
}

function financeReportDateTokenV298(token) {
    const match = String(token || '').match(/^(\d{2})(\d{2})(\d{4})$/);
    if (!match) return '';
    return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseFinanceReportFileMetaV298(fileName) {
    const base = String(fileName || '').replace(/\.[^.]+$/, '');
    // V299: trình duyệt/Windows có thể tự thêm ` (1)`, ` (2)`, ` (3)` khi tải trùng tên.
    // Phần hậu tố này không thuộc kỳ báo cáo nên bỏ qua khi đọc hai mốc ngày cuối.
    const match = base.match(/_(\d{8})_(\d{8})(?:\s*\(\d+\))?$/i);
    const company = financeReportCompanyFromFileV298(fileName);
    const from = match ? financeReportDateTokenV298(match[1]) : '';
    const to = match ? financeReportDateTokenV298(match[2]) : '';

    if (!company) {
        throw new Error(`Không xác định được công ty từ tên file “${fileName}”. Hãy dùng đúng file xuất từ tab Tài chính.`);
    }
    if (!from || !to || from > to) {
        throw new Error(`Không đọc được kỳ báo cáo từ tên file “${fileName}”. Hệ thống chấp nhận cả tên gốc và hậu tố trùng như (1), (2), (3).`);
    }

    return {
        company,
        from,
        to,
        periodKey:`${from}_${to}`,
        fileName:String(fileName || '')
    };
}

function financeReportCellV298(row, aliases) {
    row = row && typeof row === 'object' ? row : {};
    const wanted = new Set((Array.isArray(aliases) ? aliases : [aliases]).map(normalizeAdsText));
    for (const key of Object.keys(row)) {
        if (wanted.has(normalizeAdsText(key))) return row[key];
    }
    return '';
}

function financeReportPercentV298(value) {
    return Number(parseCleanNumber(value) || 0);
}

function financeReportBudgetV298(value) {
    const raw = String(value === null || value === undefined ? '' : value).trim();
    const normalized = normalizeAdsText(raw);
    const usesCampaignBudget = normalized.includes('ngan sach chien dich') || normalized.includes('ns chien dich');
    const amount = Number(parseCleanNumber(value) || 0);
    return {
        amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
        usesCampaignBudget,
        display: raw
    };
}

function normalizeFinanceReportRowV298(row, meta, sourceRowNumber) {
    const campaignName = String(financeReportCellV298(row, ['Tên Chiến Dịch','Tên chiến dịch']) || '').trim();
    const productName = String(financeReportCellV298(row, ['Sản Phẩm Chạy Quảng Cáo','Sản phẩm chạy quảng cáo']) || '').replace(/\s+/g,' ').trim();
    const sku = String(financeReportCellV298(row, ['SKU']) || '').trim().toUpperCase();
    const employee = String(financeReportCellV298(row, ['Nhân Viên','Nhân viên']) || '').replace(/\s+/g,' ').trim();
    const spend = Number(parseCleanNumber(financeReportCellV298(row, ['Chi Phí','Chi phí'])) || 0);
    const revenue = Number(parseCleanNumber(financeReportCellV298(row, ['DOANH THU','Doanh Thu','Doanh thu'])) || 0);
    const fee = Number(parseCleanNumber(financeReportCellV298(row, ['Phí Chênh Lệch','Phí chênh lệch'])) || 0);
    const vatFromFile = Number(parseCleanNumber(financeReportCellV298(row, ['VAT 10%','VAT'])) || 0);
    const totalCostFromFile = Number(parseCleanNumber(financeReportCellV298(row, ['TỔNG CHI','Tổng chi'])) || 0);
    const messages = Number(parseCleanNumber(financeReportCellV298(row, ['Tin Nhắn','Tin nhắn'])) || 0);
    const result = Number(parseCleanNumber(financeReportCellV298(row, ['Lượt Mua','Lượt mua'])) || 0);
    const ctr = financeReportPercentV298(financeReportCellV298(row, ['CTR']));
    const freq = Number(parseCleanNumber(financeReportCellV298(row, ['Tần Suất','Tần suất'])) || 0);
    const runStart = String(financeReportCellV298(row, ['Bắt Đầu','Bắt đầu']) || '').trim();
    const runEnd = String(financeReportCellV298(row, ['Kết Thúc','Kết thúc']) || '').trim();
    const budget = financeReportBudgetV298(financeReportCellV298(row, ['Ngân sách','Ngân Sách']));

    if (!campaignName && !productName && !employee && spend === 0 && revenue === 0) return null;
    if (!productName) {
        throw new Error(`${meta.fileName}: dòng ${sourceRowNumber} thiếu “Sản Phẩm Chạy Quảng Cáo”.`);
    }
    if (!employee) {
        throw new Error(`${meta.fileName}: dòng ${sourceRowNumber} thiếu “Nhân Viên”.`);
    }

    const endKey = normalizeAdsText(runEnd);
    const isRunning = !runEnd || endKey.includes('dang dien ra');
    const adName = sku ? `${productName} (${sku})` : productName;
    const groupIdentity = sku || productName;
    const groupKey = `${meta.company}||${normalizeAdsText(employee)}||${normalizeAdsText(groupIdentity)}`;

    return {
        source: MARKETING_REPORT_FILE_SOURCE_V298,
        finance_source_type: MARKETING_REPORT_FILE_SOURCE_V298,
        revenue_source_loaded: true,
        company: meta.company,
        campaignName: campaignName || 'Chưa xác định',
        campaign_name: campaignName || '',
        employee,
        productName,
        cleanAdName: productName,
        sku,
        skus: sku ? sku.split(/[,;\/]+/).map(v => String(v || '').trim().toUpperCase()).filter(Boolean) : [],
        duplicate_sku: sku,
        adName,
        fullName: `${productName} | ${employee} | ${meta.company}${sku ? ` | QC-${sku}` : ''}`,
        adsetCompanyCode: meta.company,
        adsetNamingMode: 'finance_excel_upload_v298',
        meta_live_row_key: groupKey,
        batchId: `REPORT_FILE_${meta.company}_${meta.periodKey}`,
        spend,
        revenue,
        fee,
        vat_from_file_v298: vatFromFile,
        total_cost_from_file_v298: totalCostFromFile,
        messages,
        result,
        ctr,
        freq,
        budget: budget.amount,
        budget_display: budget.display,
        budget_type: budget.usesCampaignBudget ? 'Ngân sách chiến dịch' : '',
        budget_uses_campaign: budget.usesCampaignBudget,
        active_budget: isRunning ? budget.amount : 0,
        active_budget_uses_campaign: isRunning && budget.usesCampaignBudget,
        latest_stopped_budget: !isRunning ? budget.amount : 0,
        latest_stopped_budget_uses_campaign: !isRunning && budget.usesCampaignBudget,
        status: isRunning ? 'Đang chạy' : 'Đã tắt',
        run_start: runStart,
        run_end: isRunning ? 'Đang diễn ra' : runEnd,
        report_start_iso: meta.from,
        report_end_iso: meta.to,
        report_start: isoToDisplayDate(meta.from),
        report_end: isoToDisplayDate(meta.to),
        report_month: meta.to.slice(0,7),
        source_file_name_v298: meta.fileName,
        source_row_number_v298: sourceRowNumber,
        merged_count: 1,
        has_delivery_data: spend > 0 || messages > 0 || result > 0,
        data_state: (spend > 0 || messages > 0 || result > 0) ? 'delivered' : 'configured_only'
    };
}

async function readFinanceReportFileV298(file) {
    if (typeof XLSX === 'undefined') {
        throw new Error('Thư viện Excel chưa tải xong. Vui lòng thử lại.');
    }

    const meta = parseFinanceReportFileMetaV298(file && file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type:'array', cellDates:false });
    const sheet = workbook.Sheets['TaiChinh_ROAS'] || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error(`${meta.fileName}: không tìm thấy sheet TaiChinh_ROAS.`);

    const rows = XLSX.utils.sheet_to_json(sheet, { defval:'', raw:true });
    if (!rows.length) throw new Error(`${meta.fileName}: sheet Tài chính không có dữ liệu.`);

    const headers = Object.keys(rows[0] || {}).map(normalizeAdsText);
    const required = [
        'Tên Chiến Dịch',
        'Sản Phẩm Chạy Quảng Cáo',
        'Nhân Viên',
        'Chi Phí',
        'DOANH THU'
    ];
    const missing = required.filter(name => !headers.includes(normalizeAdsText(name)));
    if (missing.length) {
        throw new Error(`${meta.fileName}: thiếu cột ${missing.join(', ')}. Chỉ dùng file được xuất trực tiếp từ tab Tài chính.`);
    }

    const normalizedRows = rows
        .map((row,index) => normalizeFinanceReportRowV298(row, meta, index + 2))
        .filter(Boolean);

    if (!normalizedRows.length) throw new Error(`${meta.fileName}: không có dòng hợp lệ để lập Báo Cáo.`);

    return {
        meta,
        rows: normalizedRows,
        fileInfo: {
            fileName: meta.fileName,
            company: meta.company,
            from: meta.from,
            to: meta.to,
            periodKey: meta.periodKey,
            rowCount: normalizedRows.length,
            size: Number(file && file.size || 0)
        }
    };
}

function openMarketingReportFinanceUploadV298() {
    if (!canManageMarketingReportSyncV254()) {
        if (typeof showToast === 'function') showToast('Chỉ tài khoản có quyền Chỉnh sửa Quảng cáo mới được up file Báo Cáo.', 'warning');
        return;
    }
    const input = document.getElementById('report-finance-file-input-v298');
    if (input) input.click();
}

async function handleMarketingReportFinanceUploadV298(fileList) {
    const files = Array.from(fileList || []).filter(file => /\.xlsx?$/i.test(String(file && file.name || '')));
    if (!files.length) return;

    if (!canManageMarketingReportSyncV254()) {
        if (typeof showToast === 'function') showToast('Tài khoản hiện tại không có quyền up file Báo Cáo.', 'warning');
        return;
    }

    const uploadButton = document.getElementById('report-upload-btn-v298');
    if (uploadButton) uploadButton.disabled = true;

    try {
        const parsedFiles = await Promise.all(files.map(readFinanceReportFileV298));
        const periodKeys = new Set(parsedFiles.map(item => item.meta.periodKey));
        if (periodKeys.size !== 1) {
            throw new Error('Các file được chọn không cùng kỳ. Hãy up các file Tài chính có cùng Từ ngày - Đến ngày.');
        }

        const companies = parsedFiles.map(item => item.meta.company);
        if (new Set(companies).size !== companies.length) {
            throw new Error('Có từ 2 file trở lên thuộc cùng một công ty trong lần up này. Chỉ chọn 1 file mới nhất cho mỗi công ty.');
        }

        if (!db) db = getDatabase();
        if (!db) throw new Error('Firebase Database chưa sẵn sàng.');

        const first = parsedFiles[0];
        const newPeriodKey = first.meta.periodKey;
        // Chuẩn chọn tháng Báo Cáo theo tháng của ngày kết thúc kỳ Tài chính.
        const monthKey = String(first.meta.to || '').slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('Không xác định được tháng Báo Cáo từ file Tài chính.');

        // Đọc bản hiện hành để giữ nguyên toàn bộ các tháng khác và các công ty chưa upload lại.
        const currentSnapshotV301 = await db.ref(MARKETING_REPORT_SYNC_PATH_V254).once('value');
        const current = normalizeMarketingReportSyncStateV254(currentSnapshotV301.val());
        const datasets = { ...(current.datasets || {}) };
        const currentMonthDataset = datasets[monthKey] || null;
        const samePeriod = !!(currentMonthDataset && currentMonthDataset.period && currentMonthDataset.period.periodKey === newPeriodKey);
        const replaceCompanies = new Set(companies);

        const baseRows = samePeriod && Array.isArray(currentMonthDataset.frozenRows)
            ? currentMonthDataset.frozenRows.filter(row => !replaceCompanies.has(String(row && row.company || '').toUpperCase()))
            : [];
        const nextRows = baseRows.concat(...parsedFiles.map(item => item.rows));

        const baseFiles = samePeriod && Array.isArray(currentMonthDataset.files)
            ? currentMonthDataset.files.filter(item => !replaceCompanies.has(String(item && item.company || '').toUpperCase()))
            : [];
        const nextFiles = baseFiles.concat(parsedFiles.map(item => item.fileInfo));

        const actor = getMarketingReportActorV254();
        if (!actor.uid) throw new Error('Chưa xác định được tài khoản Firebase.');

        const datasetPayload = {
            monthKey,
            period:{
                from:first.meta.from,
                to:first.meta.to,
                periodKey:newPeriodKey
            },
            frozenAt:Date.now(),
            frozenRows:nextRows,
            rowCount:nextRows.length,
            files:nextFiles,
            updatedAt:Date.now(),
            updatedByUid:actor.uid,
            updatedByEmail:actor.email,
            updatedByName:actor.name
        };
        datasets[monthKey] = datasetPayload;

        // Top-level tiếp tục mirror tháng vừa upload để tương thích Rules/phiên bản cũ.
        await db.ref(MARKETING_REPORT_SYNC_PATH_V254).set({
            enabled:false,
            version:MARKETING_REPORT_FILE_VERSION_V298,
            sourceMode:MARKETING_REPORT_FILE_SOURCE_V298,
            period:datasetPayload.period,
            frozenAt:firebase.database.ServerValue.TIMESTAMP,
            frozenRows:nextRows,
            rowCount:nextRows.length,
            files:nextFiles,
            datasets,
            updatedAt:firebase.database.ServerValue.TIMESTAMP,
            updatedByUid:actor.uid,
            updatedByEmail:actor.email,
            updatedByName:actor.name
        });

        MARKETING_REPORT_SELECTED_MONTH_V301 = monthKey;
        try { localStorage.setItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301, monthKey); } catch (error) {}

        if (typeof showToast === 'function') {
            showToast(`Đã lưu ${formatMarketingReportMonthLabelV301(monthKey)} • ${parsedFiles.length} file • ${nextRows.length} dòng • ${new Set(nextRows.map(row => row.company)).size} công ty.`, 'success');
        }
    } catch (error) {
        console.error('V301 không up được file Báo Cáo:', error);
        if (typeof showToast === 'function') showToast(`Không up được file Báo Cáo: ${error && error.message ? error.message : error}`, 'error');
    } finally {
        if (uploadButton) uploadButton.disabled = false;
        renderMarketingReportSyncControlsV254();
        if (CURRENT_TAB === 'report') renderReportPreview();
    }
}

async function clearMarketingReportFinanceUploadV298() {
    if (!canManageMarketingReportSyncV254()) {
        if (typeof showToast === 'function') showToast('Tài khoản hiện tại không có quyền xóa dữ liệu Báo Cáo.', 'warning');
        return;
    }

    ensureMarketingReportSelectedMonthV301();
    const selectedMonth = MARKETING_REPORT_SELECTED_MONTH_V301;
    const selectedDataset = getMarketingReportDatasetV301(selectedMonth);
    if (!selectedMonth || !selectedDataset) {
        if (typeof showToast === 'function') showToast('Tháng đang chọn chưa có dữ liệu để xóa.', 'warning');
        return;
    }

    if (!window.confirm(`Xóa toàn bộ file Tài chính của ${formatMarketingReportMonthLabelV301(selectedMonth)}? Các tháng khác vẫn được giữ nguyên.`)) return;

    if (!db) db = getDatabase();
    if (!db) return;

    try {
        const snap = await db.ref(MARKETING_REPORT_SYNC_PATH_V254).once('value');
        const current = normalizeMarketingReportSyncStateV254(snap.val());
        const datasets = { ...(current.datasets || {}) };
        delete datasets[selectedMonth];

        const remainingMonths = Object.keys(datasets).filter(month => /^\d{4}-\d{2}$/.test(month)).sort((a,b) => b.localeCompare(a));
        if (!remainingMonths.length) {
            await db.ref(MARKETING_REPORT_SYNC_PATH_V254).remove();
            MARKETING_REPORT_SELECTED_MONTH_V301 = '';
            try { localStorage.removeItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301); } catch (error) {}
        } else {
            const fallbackMonth = remainingMonths[0];
            const fallback = datasets[fallbackMonth];
            const actor = getMarketingReportActorV254();
            await db.ref(MARKETING_REPORT_SYNC_PATH_V254).set({
                enabled:false,
                version:MARKETING_REPORT_FILE_VERSION_V298,
                sourceMode:MARKETING_REPORT_FILE_SOURCE_V298,
                period:fallback.period,
                frozenAt:Number(fallback.frozenAt || Date.now()),
                frozenRows:Array.isArray(fallback.frozenRows) ? fallback.frozenRows : [],
                rowCount:Number(fallback.rowCount || 0),
                files:Array.isArray(fallback.files) ? fallback.files : [],
                datasets,
                updatedAt:firebase.database.ServerValue.TIMESTAMP,
                updatedByUid:actor.uid,
                updatedByEmail:actor.email,
                updatedByName:actor.name
            });
            MARKETING_REPORT_SELECTED_MONTH_V301 = fallbackMonth;
            try { localStorage.setItem(MARKETING_REPORT_SELECTED_MONTH_STORAGE_V301, fallbackMonth); } catch (error) {}
        }

        if (typeof showToast === 'function') showToast(`Đã xóa dữ liệu ${formatMarketingReportMonthLabelV301(selectedMonth)}.`, 'success');
    } catch (error) {
        if (typeof showToast === 'function') showToast(`Không xóa được dữ liệu Báo Cáo: ${error && error.message ? error.message : error}`, 'error');
    }
}

window.openMarketingReportFinanceUploadV298 = openMarketingReportFinanceUploadV298;
window.handleMarketingReportFinanceUploadV298 = handleMarketingReportFinanceUploadV298;
window.clearMarketingReportFinanceUploadV298 = clearMarketingReportFinanceUploadV298;

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

const META_VAT_RATE_V304 = 0.10;
function metaCostWithVatV304(value) {
    const raw = Number(value || 0);
    return Number.isFinite(raw) ? raw * (1 + META_VAT_RATE_V304) : 0;
}

function metaUnitCostWithVatV304(spend, count) {
    const qty = Number(count || 0);
    return qty > 0 ? metaCostWithVatV304(spend) / qty : 0;
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

// V212 — cửa sổ Meta Insights tối đa 37 tháng tính từ ngày hiện tại.
const META_DIRECT_MAX_LOOKBACK_MONTHS_V212 = 37;
let META_DIRECT_RANGE_NOTICE_KEY_V212 = '';

function getMetaDirectEarliestAllowedDateV212() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth() - META_DIRECT_MAX_LOOKBACK_MONTHS_V212, 1, 12, 0, 0, 0);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return getLocalIsoDate(new Date(first.getFullYear(), first.getMonth(), Math.min(today.getDate(), lastDay), 12, 0, 0, 0));
}

function normalizeMetaApiPeriodV212(fromValue, toValue) {
    const from = String(fromValue || '').slice(0,10);
    const to = String(toValue || '').slice(0,10);
    const earliest = getMetaDirectEarliestAllowedDateV212();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
        return {supported:false, reason:'invalid', from, to, earliest, clamped:false};
    }
    if (to < earliest) {
        return {supported:false, reason:'too_old', from, to, earliest, clamped:false};
    }
    const safeFrom = from < earliest ? earliest : from;
    return {supported:true, reason:'', from:safeFrom, to, earliest, clamped:safeFrom !== from, originalFrom:from};
}

function notifyMetaRangeClampV212(originalFrom, safeFrom) {
    const key = `${originalFrom}=>${safeFrom}`;
    if (!originalFrom || !safeFrom || originalFrom === safeFrom || META_DIRECT_RANGE_NOTICE_KEY_V212 === key) return;
    META_DIRECT_RANGE_NOTICE_KEY_V212 = key;
    setTimeout(() => {
        if (typeof showToast === 'function') {
            showToast(`Meta chỉ nhận tối đa ${META_DIRECT_MAX_LOOKBACK_MONTHS_V212} tháng. Đã chỉnh ngày bắt đầu ${originalFrom} → ${safeFrom}.`, 'warning');
        }
    }, 0);
}

window.getMetaDirectEarliestAllowedDateV212 = getMetaDirectEarliestAllowedDateV212;

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

function deriveReportMonthFromDateRangeV297(fromValue, toValue) {
    const from = String(fromValue || '').slice(0, 10);
    const to = String(toValue || '').slice(0, 10);
    // Chuẩn nghiệp vụ Ads: Kỳ báo cáo đi theo tháng của ngày kết thúc.
    // Nếu mới có Từ ngày thì tạm dùng tháng của Từ ngày.
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) return to.slice(0, 7);
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) return from.slice(0, 7);
    return '';
}

function syncReportMonthFromDateRangeV297(fromValue, toValue) {
    const month = deriveReportMonthFromDateRangeV297(fromValue, toValue);
    REPORT_MONTH = month;
    window.CURRENT_REPORT_PERIOD = month || '';
    const monthEl = document.getElementById('report-month-filter');
    if (monthEl) monthEl.value = month;
    return month;
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
            refreshMetaLive(false, false).catch(() => {});
        } else {
            applyFilters();
        }

        if (CURRENT_TAB === 'report') {
            refreshMetaLiveReport(false, true).catch(() => {});
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

    // V212: không gửi request chắc chắn bị Meta từ chối (#3018).
    const safePeriodV212 = normalizeMetaApiPeriodV212(from, to);
    if (!safePeriodV212.supported) {
        if (safePeriodV212.reason === 'too_old') {
            throw new Error(`Kỳ này nằm ngoài giới hạn Meta. Ngày sớm nhất có thể gọi trực tiếp hiện là ${safePeriodV212.earliest}.`);
        }
        throw new Error('Khoảng ngày Meta Live không hợp lệ.');
    }
    if (safePeriodV212.clamped) {
        const originalFromV212 = from;
        from = safePeriodV212.from;
        DATE_FROM = from;
        syncReportMonthFromDateRangeV297(DATE_FROM, DATE_TO || to);
        const fromElV212 = document.getElementById('date-from');
        if (fromElV212) fromElV212.value = from;
        notifyMetaRangeClampV212(originalFromV212, from);
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

function normalizeStructuredAdsetCompanyV293(value) {
    const key = normalizeAdsText(value || '').replace(/\s+/g, ' ').trim();
    const map = {
        'nnv':'NNV',
        'nong nghiep viet':'NNV',
        'vn':'VN',
        'viet nhat':'VN',
        'hoa nong viet nhat':'VN',
        'kf':'KF',
        'kingfarm':'KF',
        'king farm':'KF',
        'abc':'ABC',
        'abc viet nam':'ABC'
    };
    return map[key] || '';
}

function parseStructuredMetaAdsetNameV293(fullName) {
    const raw = String(fullName || '').replace(/\s+/g, ' ').trim();
    if (!raw || raw.indexOf('|') === -1) return null;

    const parts = raw.split('|').map(value => String(value || '').trim());
    if (parts.length !== 4) return null;

    const productName = parts[0];
    const employee = parts[1].replace(/\s+/g, ' ').trim();
    const companyCode = normalizeStructuredAdsetCompanyV293(parts[2]);
    const codeMatch = parts[3].match(/^QC\s*-\s*(.+)$/i);
    const sku = codeMatch ? String(codeMatch[1] || '').trim().toUpperCase() : '';

    if (!productName || !employee || !companyCode || !sku) return null;

    return {
        namingMode:'pipe_qc_v293',
        productName,
        employee,
        companyCode,
        sku,
        skus:[sku],
        // Giữ dạng Tên sản phẩm (SKU) ở adName để toàn bộ logic gom nhóm/SKU cũ
        // tiếp tục hoạt động mà không phải tạo một hệ quy chiếu song song.
        adName:`${productName} (${sku})`,
        originalName:raw
    };
}

function parseMetaLiveAdsetName(fullName, fallbackEmployee, fallbackAdName) {
    const raw = String(fullName || '').replace(/\s+/g, ' ').trim();
    const structured = parseStructuredMetaAdsetNameV293(raw);
    if (structured) return structured;

    if (!raw) {
        return {
            namingMode:'legacy',
            productName:String(fallbackAdName || 'Chung').trim(),
            employee:String(fallbackEmployee || 'KHÁC').trim().toUpperCase(),
            companyCode:'',
            sku:'',
            skus:[],
            adName:String(fallbackAdName || 'Chung').trim(),
            originalName:raw
        };
    }

    const hyphenIndex = raw.indexOf('-');

    if (hyphenIndex === -1) {
        return {
            namingMode:'legacy',
            productName:String(fallbackAdName || 'Chung').trim(),
            employee:String(fallbackEmployee || raw).trim().toUpperCase(),
            companyCode:'',
            sku:'',
            skus:[],
            adName:String(fallbackAdName || 'Chung').trim(),
            originalName:raw
        };
    }

    const legacyAdName = raw.substring(hyphenIndex + 1).trim() || 'Chung';
    const legacyParts = extractAdDuplicateParts(legacyAdName);
    return {
        namingMode:'legacy',
        productName:legacyParts.productName || legacyAdName,
        employee:raw.substring(0, hyphenIndex).trim().toUpperCase() || 'KHÁC',
        companyCode:'',
        sku:legacyParts.sku || '',
        skus:legacyParts.sku ? legacyParts.sku.split(/[,;\/]+/).map(v => String(v || '').trim().toUpperCase()).filter(Boolean) : [],
        adName:legacyAdName,
        originalName:raw
    };
}


// V294 — Campaign là thực thể riêng của Meta, tuyệt đối không suy ra từ tên nhóm quảng cáo.
// Hàng chính vẫn có thể được gom qua nhiều adset/campaign theo Nhân viên + SKU.
function getTrueCampaignNamesV294(item) {
    const names = [];
    const seen = new Set();

    function add(value) {
        const raw = String(value || '').replace(/\s+/g, ' ').trim();
        if (!raw) return;
        const key = normalizeAdsText(raw);
        if (!key || seen.has(key)) return;
        seen.add(key);
        names.push(raw);
    }

    add(item && (item.campaignName || item.campaign_name));

    const originalRows = item && Array.isArray(item.original_adset_rows)
        ? item.original_adset_rows
        : [];
    originalRows.forEach(row => add(row && (row.campaignName || row.campaign_name)));

    return names;
}

function getTrueCampaignDisplayV294(item, separator) {
    const names = getTrueCampaignNamesV294(item);
    return names.length ? names.join(separator || ' • ') : 'Chưa xác định';
}


// V296 — Riêng mục 3 Báo cáo: hiển thị đối tượng đang được đánh giá là nhóm quảng cáo đã gom,
// không dùng Campaign thật làm tên dòng. Với cấu trúc mới chỉ lấy phần Tên sản phẩm trước dấu |.
function getReportGroupedAdsetShortNameV296(item) {
    item = item || {};

    const directProduct = String(item.productName || '').replace(/\s+/g, ' ').trim();
    if (directProduct) return directProduct;

    const originalName = String(item.fullName || item.adsetName || item.originalAdsetName || '').replace(/\s+/g, ' ').trim();
    if (originalName && originalName.indexOf('|') !== -1) {
        const firstPart = String(originalName.split('|')[0] || '').trim();
        if (firstPart) return firstPart;
    }

    const adName = String(item.adName || item.cleanAdName || '').replace(/\s+/g, ' ').trim();
    if (adName) {
        const withoutSku = adName
            .replace(/\s*\([^)]*\)\s*$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (withoutSku) return withoutSku;
    }

    return 'Chưa xác định';
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

        const attachments = (Array.isArray(ad.preview_attachments)
            ? ad.preview_attachments
            : Array.isArray(ad.attachments)
                ? ad.attachments
                : []).map(item => ({
                    name:String(item && item.name || '').trim(),
                    description:String(item && item.description || '').trim(),
                    link:String(item && item.link || '').trim(),
                    picture:String(item && (item.picture || item.image_url) || '').trim()
                })).filter(item => item.name || item.description || item.link || item.picture);

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
            statusHistory: normalizeMetaLiveStatusHistory(ad.status_history || ad.statusHistory || []),
            previewType: String(ad.preview_type || ad.previewType || '').trim(),
            creativeId: String(ad.creative_id || ad.creativeId || '').trim(),
            creativeName: String(ad.creative_name || ad.creativeName || '').trim(),
            imageUrl: String(ad.image_url || ad.imageUrl || '').trim(),
            thumbnailUrl: String(ad.thumbnail_url || ad.thumbnailUrl || '').trim(),
            renderedThumbnailUrl: String(ad.rendered_thumbnail_url || ad.renderedThumbnailUrl || '').trim(),
            renderedThumbnailRequestedWidth: Number(ad.rendered_thumbnail_requested_width || ad.renderedThumbnailRequestedWidth || 0),
            renderedThumbnailRequestedHeight: Number(ad.rendered_thumbnail_requested_height || ad.renderedThumbnailRequestedHeight || 0),
            storyImageUrl: String(ad.story_image_url || ad.storyImageUrl || '').trim(),
            storyImageWidth: Number(ad.story_image_width || ad.storyImageWidth || 0),
            storyImageHeight: Number(ad.story_image_height || ad.storyImageHeight || 0),
            storyImageSource: String(ad.story_image_source || ad.storyImageSource || '').trim(),
            storyPermalink: String(ad.story_permalink || ad.storyPermalink || '').trim(),
            directCreativeImageUrl: String(ad.direct_creative_image_url || ad.directCreativeImageUrl || '').trim(),
            highresImageUrl: String(ad.highres_image_url || ad.highresImageUrl || '').trim(),
            highresWidth: Number(ad.highres_width || ad.highresWidth || 0),
            highresHeight: Number(ad.highres_height || ad.highresHeight || 0),
            primaryMediaUrl: String(ad.primary_media_url || ad.primaryMediaUrl || '').trim(),
            primaryMediaSource: String(ad.primary_media_source || ad.primaryMediaSource || '').trim(),
            primaryMediaKind: String(ad.primary_media_kind || ad.primaryMediaKind || '').trim(),
            primaryMediaWidth: Number(ad.primary_media_width || ad.primaryMediaWidth || 0),
            primaryMediaHeight: Number(ad.primary_media_height || ad.primaryMediaHeight || 0),
            mediaGallery: (Array.isArray(ad.media_gallery) ? ad.media_gallery : []).map(item => ({
                url:String(item && item.url || '').trim(),
                width:Number(item && item.width || 0),
                height:Number(item && item.height || 0),
                source:String(item && item.source || '').trim()
            })).filter(item => item.url),
            videoThumbnailUrl: String(ad.video_thumbnail_url || ad.videoThumbnailUrl || '').trim(),
            videoThumbnailWidth: Number(ad.video_thumbnail_width || ad.videoThumbnailWidth || 0),
            videoThumbnailHeight: Number(ad.video_thumbnail_height || ad.videoThumbnailHeight || 0),
            facebookPostMediaUrl: String(ad.facebook_post_media_url || ad.facebookPostMediaUrl || '').trim(),
            facebookPostMediaSource: String(ad.facebook_post_media_source || ad.facebookPostMediaSource || '').trim(),
            instagramMediaUrl: String(ad.instagram_media_url || ad.instagramMediaUrl || '').trim(),
            previewBody: String(ad.preview_body || ad.previewBody || '').trim(),
            previewTitle: String(ad.preview_title || ad.previewTitle || '').trim(),
            previewDescription: String(ad.preview_description || ad.previewDescription || '').trim(),
            previewCTA: String(ad.preview_cta || ad.previewCTA || '').trim(),
            previewDestinationUrl: String(ad.preview_destination_url || ad.previewDestinationUrl || '').trim(),
            previewPostUrl: String(ad.preview_post_url || ad.previewPostUrl || '').trim(),
            previewPageId: String(ad.preview_page_id || ad.previewPageId || '').trim(),
            effectiveObjectStoryId: String(ad.effective_object_story_id || ad.effectiveObjectStoryId || '').trim(),
            previewObjectType: String(ad.preview_object_type || ad.previewObjectType || '').trim(),
            attachments: attachments
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
            productName: nameParts.productName || '',
            sku: String(nameParts.sku || row.sku || '').trim().toUpperCase(),
            skus: Array.from(new Set(
                ([]).concat(nameParts.skus || [], row.skus || [], row.sku || [])
                    .map(value => String(value || '').trim().toUpperCase())
                    .filter(Boolean)
            )),
            adsetCompanyCode: nameParts.companyCode || '',
            adsetNamingMode: nameParts.namingMode || 'legacy',
            adsetCompanyMatchesAccount: !nameParts.companyCode || nameParts.companyCode === String(company || '').toUpperCase(),

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


/* =========================================================
   V184 — SNAPSHOT SIZE + MONTHLY TRAFFIC ESTIMATE
   ========================================================= */
let META_LIVE_USAGE_ESTIMATE_V184 = {
    bytes:0,
    monthlyBytes:0,
    intervalMs:0,
    callsPerMonth:0,
    company:'',
    from:'',
    to:''
};

function estimateJsonUtf8BytesV184(value) {
    try {
        const json = JSON.stringify(value || {});
        if (typeof Blob !== 'undefined') {
            return new Blob([json]).size;
        }

        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(json).length;
  
