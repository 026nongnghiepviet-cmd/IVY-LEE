/**
 * AI CHATBOT MODULE (Đã sửa lỗi Model & Gắn sẵn API Key)
 */

document.addEventListener('DOMContentLoaded', initFloatingAIAssistant);

function initFloatingAIAssistant() {
    if (document.getElementById('ai-chatbot-wrapper')) return;

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

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-chatbot-wrapper';
    wrapper.innerHTML = `
        <button id="ai-chatbot-btn" onclick="toggleAIChat()">✨</button>
        <div id="ai-chatbot-window">
            <div id="ai-chatbot-header">
                <span>🤖 Trợ Lý AI NNV</span>
                <button id="ai-chatbot-close" onclick="toggleAIChat()">✖</button>
            </div>
            <div id="ai-chatbot-body">
                <div class="chat-msg ai">Xin chào Sếp! Tôi đã kết nối thành công. Sếp muốn tôi phân tích gì hôm nay?</div>
            </div>
            <div id="ai-chatbot-footer">
                <input type="text" id="ai-chatbot-input" placeholder="Hỏi AI phân tích..." onkeypress="if(event.key === 'Enter') sendAIMessage()">
                <button id="ai-chatbot-send" onclick="sendAIMessage()">➤</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
}

window.toggleAIChat = function() {
    const chatWin = document.getElementById('ai-chatbot-window');
    chatWin.style.display = (chatWin.style.display === 'none' || chatWin.style.display === '') ? 'flex' : 'none';
};

window.sendAIMessage = async function() {
    const inputEl = document.getElementById('ai-chatbot-input');
    const text = inputEl.value.trim();
    if(!text) return;
    
    appendChatMessage('user', text);
    inputEl.value = '';
    
    const typingId = appendChatMessage('ai', '⏳ Đang phân tích dữ liệu, Sếp đợi xíu...');

    let contextData = "Chưa có dữ liệu. Hãy up file Excel trước.";
    if (window.CURRENT_FILTERED_DATA && window.CURRENT_FILTERED_DATA.length > 0) {
        let tSpend = 0, tLeads = 0, tRev = 0;
        let empStats = {};

        window.CURRENT_FILTERED_DATA.forEach(i => { 
            tSpend += i.spend; 
            tLeads += i.result; 
            tRev += (i.revenue || 0); 
            
            if(!empStats[i.employee]) empStats[i.employee] = { spend: 0, leads: 0 };
            empStats[i.employee].spend += i.spend;
            empStats[i.employee].leads += i.result;
        });

        let roas = tSpend > 0 ? (tRev/tSpend).toFixed(2) : 0;
        let empString = Object.entries(empStats).map(([name, s]) => `${name}: Chi ${s.spend}đ, Kết quả ${s.leads}`).join('; ');

        contextData = `Dữ liệu công ty đang chọn: Tổng chi ${tSpend} VNĐ, Tổng Kết quả ${tLeads}, Doanh thu ${tRev} VNĐ, ROAS: ${roas}. Chi tiết nhân sự: ${empString}.`;
    }

    // ĐÃ GẮN SẴN MÃ API KEY CỦA BẠN (Không cần thay đổi)
    const API_KEY = "AIzaSyDS0YupAAAmSqXsnnoQXJYNd9N2V7FinKw";

    const promptText = `Bạn là Trợ lý AI Giám đốc Marketing. Dưới đây là dữ liệu chạy Ads hiện tại: [${contextData}]. Trả lời câu hỏi sau của người dùng một cách chuyên nghiệp, đi thẳng vào trọng tâm, có số liệu dẫn chứng. Tự động chuyển đổi đơn vị VNĐ thành triệu, trăm ngàn cho dễ đọc. Câu hỏi: "${text}"`;

    try {
        // Đã đổi Model Name thành phiên bản gemini-1.5-flash-latest để khắc phục lỗi Not Found
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Backup phương án 2 nếu flash-latest vẫn không chạy được ở server của bạn
            let errorMsg = data.error ? data.error.message : "Lỗi không xác định";
            if(errorMsg.includes("not found") || errorMsg.includes("not supported")) {
                const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                });
                const fallbackData = await fallbackRes.json();
                if (!fallbackRes.ok) {
                    updateChatMessage(typingId, `❌ <b>Lỗi Google API:</b> ${fallbackData.error.message}`);
                    return;
                }
                let aiText = fallbackData.candidates[0].content.parts[0].text;
                aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
                updateChatMessage(typingId, aiText);
                return;
            }
            updateChatMessage(typingId, `❌ <b>Lỗi API Google:</b> ${errorMsg}`);
            return;
        }

        if(data && data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            let aiText = data.candidates[0].content.parts[0].text;
            // Xử lý chuyển đổi định dạng **in đậm** của AI sang mã HTML
            aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
            updateChatMessage(typingId, aiText);
        } else {
            updateChatMessage(typingId, "❌ AI đã trả lời nhưng cấu trúc bị sai.");
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
    body.scrollTop = body.scrollHeight; 
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
