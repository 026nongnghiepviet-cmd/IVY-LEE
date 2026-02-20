/**
 * AI CHATBOT MODULE (Độc lập)
 * - Tự động nhúng giao diện Chatbot vào góc phải màn hình.
 * - Đọc trực tiếp dữ liệu từ file ads-firebase.js (thông qua biến toàn cục).
 * - Hoàn toàn không can thiệp vào logic của file chính.
 */

// Đợi trang web tải xong thì tự động kích hoạt AI
document.addEventListener('DOMContentLoaded', initFloatingAIAssistant);

function initFloatingAIAssistant() {
    if (document.getElementById('ai-chatbot-wrapper')) return;

    // 1. CHÈN CSS CHO GIAO DIỆN CHATBOT
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-chatbot-wrapper { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: sans-serif; }
        #ai-chatbot-btn { width: 50px; height: 50px; border-radius: 25px; background: #1a73e8; color: white; border: none; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(26,115,232,0.4); display: flex; justify-content: center; align-items: center; transition: 0.3s; }
        #ai-chatbot-btn:hover { transform: scale(1.05); }
        #ai-chatbot-window { display: none; width: 350px; height: 450px; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; position: absolute; bottom: 65px; right: 0; border: 1px solid #e0e0e0; animation: slideUpChat 0.3s ease-out forwards;}
        @keyframes slideUpChat { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        #ai-chatbot-header { background: #1a73e8; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
        #ai-chatbot-close { background: none; border: none; color: white; font-size: 16px; cursor: pointer; }
        #ai-chatbot-body { flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa; display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
        .chat-msg { max-width: 85%; padding: 8px 12px; border-radius: 8px; line-height: 1.4; word-wrap: break-word; }
        .chat-msg.user { background: #1a73e8; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
        .chat-msg.ai { background: #e8eaed; color: #333; align-self: flex-start; border-bottom-left-radius: 2px; }
        .chat-msg.ai strong { color: #1a73e8; }
        #ai-chatbot-footer { padding: 10px; border-top: 1px solid #eee; display: flex; gap: 8px; background: #fff; }
        #ai-chatbot-input { flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 20px; outline: none; font-size: 13px; }
        #ai-chatbot-input:focus { border-color: #1a73e8; }
        #ai-chatbot-send { background: #1a73e8; color: white; border: none; width: 34px; height: 34px; border-radius: 17px; cursor: pointer; display: flex; justify-content: center; align-items: center; }
        @media (max-width: 400px) { #ai-chatbot-window { width: 300px; height: 400px; } }
    `;
    document.head.appendChild(style);

    // 2. CHÈN KHUNG HTML CHO CHATBOT
    const wrapper = document.createElement('div');
    wrapper.id = 'ai-chatbot-wrapper';
    wrapper.innerHTML = `
        <button id="ai-chatbot-btn" onclick="toggleAIChat()">✨</button>
        <div id="ai-chatbot-window">
            <div id="ai-chatbot-header">
                <span>🤖 Trợ Lý Trưởng Phòng Ads</span>
                <button id="ai-chatbot-close" onclick="toggleAIChat()">✖</button>
            </div>
            <div id="ai-chatbot-body">
                <div class="chat-msg ai">Xin chào sếp! Tôi là AI theo dõi hệ thống quảng cáo. Sếp muốn phân tích hay hỏi gì về dữ liệu hiện tại không?</div>
            </div>
            <div id="ai-chatbot-footer">
                <input type="text" id="ai-chatbot-input" placeholder="Hỏi AI phân tích, tìm ai chạy tốt nhất..." onkeypress="if(event.key === 'Enter') sendAIMessage()">
                <button id="ai-chatbot-send" onclick="sendAIMessage()">➤</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
}

// Hàm Bật/Tắt khung chat
window.toggleAIChat = function() {
    const chatWin = document.getElementById('ai-chatbot-window');
    chatWin.style.display = (chatWin.style.display === 'none' || chatWin.style.display === '') ? 'flex' : 'none';
};

// Hàm Gửi tin nhắn và Nhận trả lời từ Gemini
window.sendAIMessage = async function() {
    const inputEl = document.getElementById('ai-chatbot-input');
    const text = inputEl.value.trim();
    if(!text) return;
    
    appendChatMessage('user', text);
    inputEl.value = '';
    
    const typingId = appendChatMessage('ai', '⏳ Đang đọc bảng số liệu và phân tích...');

    // ĐỌC DỮ LIỆU TỪ FILE V71 (Biến toàn cục window.CURRENT_FILTERED_DATA)
    let contextData = "Chưa có dữ liệu. Hãy up file Excel trước.";
    if (window.CURRENT_FILTERED_DATA && window.CURRENT_FILTERED_DATA.length > 0) {
        let tSpend = 0, tLeads = 0, tRev = 0;
        let empStats = {};

        window.CURRENT_FILTERED_DATA.forEach(i => { 
            tSpend += i.spend; 
            tLeads += i.result; 
            tRev += (i.revenue || 0); 
            
            // Tóm tắt hiệu quả từng nhân viên cho AI đọc
            if(!empStats[i.employee]) empStats[i.employee] = { spend: 0, leads: 0 };
            empStats[i.employee].spend += i.spend;
            empStats[i.employee].leads += i.result;
        });

        let roas = tSpend > 0 ? (tRev/tSpend).toFixed(2) : 0;
        let empString = Object.entries(empStats).map(([name, s]) => `${name}: Chi ${s.spend}đ, Kết quả ${s.leads}`).join('; ');

        contextData = `Dữ liệu công ty đang chọn: Tổng chi ${tSpend} VNĐ, Tổng Kết quả ${tLeads}, Doanh thu ${tRev} VNĐ, ROAS: ${roas}. Chi tiết nhân sự: ${empString}.`;
    }

    // 🔥 BẠN HÃY THAY MÃ API KEY CỦA BẠN VÀO ĐÂY 🔥
    const API_KEY = "YOUR_API_KEY_HERE";
    
    if (API_KEY === "AIzaSyDS0YupAAAmSqXsnnoQXJYNd9N2V7FinKw") {
        updateChatMessage(typingId, "⚠️ <span style='color:red'>Lỗi: Hãy thay API Key của Google Gemini vào file ai-chatbot.js để sử dụng tính năng này!</span>");
        return;
    }

    const promptText = `Bạn là Trợ lý AI Cấp Cao quản lý Marketing. Dưới đây là dữ liệu chạy Ads hiện tại: [${contextData}]. Trả lời câu hỏi sau của người dùng một cách chuyên nghiệp, đi thẳng vào trọng tâm, có số liệu dẫn chứng nếu cần. Câu hỏi: "${text}"`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();
        if(data && data.candidates && data.candidates[0].content.parts[0].text) {
            let aiText = data.candidates[0].content.parts[0].text;
            aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Định dạng chữ đậm
            updateChatMessage(typingId, aiText);
        } else {
            updateChatMessage(typingId, "❌ Trợ lý AI đang bận, không thể trả lời lúc này.");
        }
    } catch (error) {
        updateChatMessage(typingId, "❌ Mất kết nối tới máy chủ AI: " + error.message);
    }
};

function appendChatMessage(sender, htmlText) {
    const body = document.getElementById('ai-chatbot-body');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.id = 'msg-' + Date.now();
    div.innerHTML = htmlText;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight; // Tự cuộn xuống dưới cùng
    return div.id;
}

function updateChatMessage(id, htmlText) {
    const div = document.getElementById(id);
    if(div) {
        div.innerHTML = htmlText;
        const body = document.getElementById('ai-chatbot-body');
        body.scrollTop = body.scrollHeight;
    }
}