// ==================================================
// CONFIGURATION & GLOBAL STATE
// ==================================================

// ⚠️ ห้าม getElementById ตอนนี้ เพราะ DOM ยังไม่พร้อม
let chatWindow;
let userInput;
let executeBtn;
let imageUpload;
let previewContainer;

// ---------- STATE ----------
let chatHistories = {};
let currentChatId = null;
let isMuted = false;
let isSwitchingMission = false;
let currentBase64Image = null;

// ---------- PAGINATION ----------
let currentPage = 1;
const ITEMS_PER_PAGE = 5;
const aiContentDict = {};
const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    // 🔗 1. Bind DOM Elements
    chatWindow = document.getElementById('chat-container');
    userInput = document.getElementById('user_input');
    executeBtn = document.getElementById('execute-btn');
    imageUpload = document.getElementById('image-upload');
    previewContainer = document.getElementById('image-preview-container');

    // 🛡️ GLOBAL RELOAD BLOCKER (Silent Mode)
    (function preventReload() {
        window.location.reload = function () {
            console.warn("⛔ Reload blocked by DARK GEMINI kernel.");
        };
    })();

    // 🛡️ ป้องกัน form submit/reload ทุกกรณี
    document.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
    });

    // 🔄 2. Restore Data
    restoreChats();

    // 🎯 3. เลือก Mission ที่จะแสดง
    const allBaseKeys = Object.keys(chatHistories).filter(k => !k.endsWith('_title'));

    if (currentChatId && chatHistories[currentChatId]) {
        loadMissionDetail(currentChatId);
    } else if (allBaseKeys.length > 0) {
        const lastMission = allBaseKeys.sort((a, b) => b.split('-')[1] - a.split('-')[1])[0];
        loadMissionDetail(lastMission);
    } else {
        resetToDefaultView();
        currentChatId = "mission-" + Date.now();
        persistChats();
    }

    // 🔊 4. Startup Greeting (คลิกครั้งแรกเท่านั้น)
    const startupGreeting = () => {
        if (typeof systemStartupGreeting === "function") systemStartupGreeting();
        window.removeEventListener('click', startupGreeting);
    };
    window.addEventListener('click', startupGreeting);

    // 🖱️ 5. ผูก Event Listeners (ไม่ซ้ำ)
    document.getElementById('new-chat-btn')?.addEventListener('click', startNewChat);
    executeBtn?.addEventListener('click', sendOrder);

    userInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendOrder();
        }
    });

    // ✅ ปุ่มปิดรูปภาพ (แทน onclick)
    previewContainer?.addEventListener('click', e => {
        if (e.target.classList.contains('close-preview')) {
            removeImage();
        }
    });

    // 📜 6. Render Sidebar History
    renderMissionPage();
});

// ==================================================
// 🛡️ ระบบจัดการชื่อ (กวาดล้างขยะตัวเลข)
// ==================================================
function getMissionTitle(id) {
    let title = chatHistories[id + "_title"];

    // ถ้าไม่มีชื่อ หรือชื่อเป็น ID ตัวเลข ให้ขุดจากแชทจริง
    if (!title || title.startsWith('mission-')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chatHistories[id] || "";
        const firstMsg = tempDiv.querySelector('.user-message .message-content div');
        if (firstMsg) {
            title = firstMsg.innerText.trim();
            chatHistories[id + "_title"] = title;
            persistChats();
        } else {
            title = "ภารกิจใหม่ (รอคำสั่ง)";
        }
    }

    let cleanTitle = title.replace(/⚔️|🗂/g, '').trim();
    return cleanTitle.length > 20 ? cleanTitle.substring(0, 20) + "..." : cleanTitle;
}

// ==================================================
// CORE FUNCTIONS
// ==================================================
window.triggerUpload = () => imageUpload && imageUpload.click();

window.clearHistory = function () {
    if (confirm("ท่านจอมพล... ยืนยันการกวาดล้างบันทึกภารกิจทั้งหมดหรือไม่?")) {
        chatHistories = {};
        currentChatId = null;
        localStorage.clear();
        startNewChat();
    }
};

window.renderMissionPage = function () {
    const list = document.getElementById('mission-history-list');
    if (!list) return;
    list.innerHTML = '';

    // 🛡️ กลยุทธ์ใหม่: เน้นดึงข้อมูลกลับมาให้ครบ แต่ยังกัน "ผี" ที่ว่างเปล่าจริงๆ ออกไป
    const allIds = Object.keys(chatHistories)
        .filter(key => {
            // 1. ต้องเป็น Key หลัก (ไม่ใช่ _title)
            const isBaseKey = !key.endsWith('_title');

            // 2. ดึงเนื้อหา
            const content = chatHistories[key] || "";

            // 3. [ปรับปรุงใหม่] กรองแค่ว่า "ต้องไม่ว่าง" และ "ต้องไม่เป็นแค่หน้า ASCII เริ่มต้น"
            // เราจะยอมให้แสดงถ้ามีข้อความอะไรก็ได้ที่ท่านเคยคุยไว้
            const isNotBlank = content.trim() !== "";
            const isNotJustBanner = !content.includes('ascii-logo') || content.includes('message-content');

            return isBaseKey && isNotBlank && isNotJustBanner;
        })
        .sort((a, b) => b.localeCompare(a));

    // --- ส่วนการคำนวณหน้า (Pagination) ---
    // ท่านจอมพลครับ เช็ก ITEMS_PER_PAGE ด้วยนะครับ ว่าตั้งไว้กี่รายการ (ปกติคือ 5)
    const totalPages = Math.ceil(allIds.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = allIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    pageItems.forEach(id => {
        const li = document.createElement('li');
        li.className = `mission-item ${id === currentChatId ? 'active' : ''}`;

        // ถ้า getMissionTitle คืนค่าว่าง ให้ใช้ ID แทนเพื่อไม่ให้รายการหาย
        const displayTitle = getMissionTitle(id) || id;

        li.innerHTML = `
            <div class="mission-wrapper" style="display:flex; width:100%; align-items:center;">
                <span class="mission-text" onclick="loadMissionDetail('${id}')" style="flex-grow:1; cursor:pointer;">
                    ⚔️ ${displayTitle}
                </span>
                <button class="delete-mission-btn-hidden" 
                        onclick="deleteMission(event, '${id}')" 
                        style="cursor:pointer; background:none; border:none; color:inherit; padding:0 8px;">
                    ⛧
                </button>
            </div>
        `;
        list.appendChild(li);
    });

    renderPaginationControls(totalPages);
};

// ==================================================
// 🚨 ปฏิบัติการกวาดล้าง (ลบให้สิ้นซาก)
// ==================================================
window.deleteMission = function (event, id) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (!confirm("ทำลายบันทึกภารกิจนี้?")) return;

    // ลบทั้งข้อมูลแชทและชื่อภารกิจ
    delete chatHistories[id];
    delete chatHistories[id + "_title"];

    persistChats();

    if (currentChatId === id) {
        startNewChat();
    } else {
        renderMissionPage();
    }
};

// ==================================================
// MISSION OPERATIONS & ASCII LOGO (SENTINEL V26)
// ==================================================
function resetToDefaultView() {
    const chatWindow = document.getElementById('chat-container');

    // 🛡️ คงโครงสร้างเดิมของท่านจอมพลไว้ แต่กำกับ Class .ascii-logo เพื่อหนีจาก CSS ใหม่
    chatWindow.innerHTML = `
        <div class="hero-banner" id="commander-hero">
            <div class="banner-overlay"></div>
            <div class="ascii-row">
                <pre class="ascii-logo">
██████╗  █████╗ ██████╗ ██╗  ██╗
██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝
██║  ██║███████║██████╔╝█████╔╝ 
██║  ██║██╔══██║██╔══██║██╔═██╗ 
██████╔╝██║  ██║██║  ██║██║  ██╗
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
                </pre>
                <pre class="ascii-logo">
 ██████╗ ███████╗███╗   ███╗██╗███╗   ██╗██╗
██╔════╝ ██╔════╝████╗ ████║██║████╗  ██║██║
██║  ███╗█████╗  ██╔████╔██║██║██╔██╗ ██║██║
██║   ██║██╔══╝  ██║╚██╔╝██║██║██║╚██╗██║██║
╚██████╔╝███████╗██║ ╚═╝ ██║██║██║ ╚████║██║
 ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝
                </pre>
                <pre class="ascii-logo">
██████╗ ███████╗███████╗███████╗███╗   ██╗ ██████╗███████╗
██╔══██╗██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
██║  ██║█████╗  █████╗  █████╗  ██╔██╗ ██║██║     █████╗  
██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██║╚██╗██║██║     ██╔══╝  
██████╔╝███████╗██║     ███████╗██║ ╚████║╚██████╗███████╗
╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
                </pre>
            </div>
        </div>
    `;
    console.log("🦾 [SYSTEM]: หน้าจอหลักถูกรีเซ็ตและแยก Layer สำเร็จ!");
}

function startNewChat() {
    isSwitchingMission = true;
    if (currentChatId) saveCurrentChat();
    const newChatId = "mission-" + Date.now();
    currentChatId = newChatId;
    chatHistories[newChatId] = "";
    resetToDefaultView();
    persistChats();
    renderMissionPage();
    isSwitchingMission = false;
}

window.loadMissionDetail = function (chatId) {
    if (!chatHistories[chatId]) return;
    if (currentChatId && currentChatId !== chatId) saveCurrentChat();
    currentChatId = chatId;
    const content = chatHistories[chatId];
    if (content.trim() === "" || content.includes('ascii-logo')) resetToDefaultView();
    else chatWindow.innerHTML = content;
    renderMissionPage();
    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (window.Prism) Prism.highlightAllUnder(chatWindow);
    addCopyButtons();
};

/// ==================================================
// 🔊 SYSTEM VOICE ENGINE (กล่องเสียง AI)
// ==================================================
window.toggleMute = function () {
    isMuted = !isMuted;
    const speakBtn = document.getElementById('speak-btn');
    if (!speakBtn) return;
    if (isMuted) {
        window.speechSynthesis.cancel();
        speakBtn.innerHTML = '🔇';
        speakBtn.style.color = '#ff0000';
    } else {
        speakBtn.innerHTML = '🔊';
        speakBtn.style.color = '#00ff41';
    }
};

function speakText(text) {
    if (isMuted || !text) return;
    window.speechSynthesis.cancel();
    let cleanText = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/[#*~_]/g, "")
        .replace(/\n+/g, " ")
        .trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 0.8;
    window.speechSynthesis.speak(utterance);
}

// 🔊 ฟังก์ชันรายงานตัวเมื่อท่านจอมพลเข้าสู่ระบบ
function systemStartupGreeting() {
    const greetings = [
        "ระบบ Dark Gemini พร้อมรับคำสั่งแล้วครับ",
        "ยินดีต้อนรับกลับเข้าสู่กองบัญชาการครับ ท่านจอมพล",
        "กระผม Dark Gemini รอรับคำสั่งจากท่านจอมพลครับ"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    // บังคับพูด (ถ้าไม่ Mute)
    if (!isMuted) {
        speakText(randomGreeting);
    }
}

function appendMessage(sender, text, className = '') {
    if (!chatWindow) chatWindow = document.getElementById('chat-container');
    if (!chatWindow) return null;

    const id = 'msg-' + Date.now();

    // ⚔️ ยุทธการที่ 1: บันทึกข้อความลง Dict สำหรับระบบแปลภาษา
    aiContentDict[id] = text;

    // ⚔️ ยุทธการที่ 2: ตรวจสอบว่าเป็นรายงานจากหน่วยรบหรือไม่
    const isSentinelLog = text.includes('📡') || text.includes('⚡') || text.includes('🛡️') || text.includes('🔐');

    // ปรับเปลี่ยนคลาสอัตโนมัติเพื่อความสวยงามตามบัญชาท่านจอมพล
    let finalClassName = className;
    if (isSentinelLog) {
        finalClassName += ' sentinel-log-entry';
    }

    let actionButtons = "";
    if (className && className.includes('ai-message') && !isSentinelLog) {
        // ปุ่มแปลภาษาจะแสดงเฉพาะข้อความตอบกลับปกติ ไม่แสดงใน Log ปฏิบัติการ
        actionButtons = `
            <div class="message-actions">
                <button class="translate-btn" onclick="translateMessage('${id}')">
                    <span class="btn-icon">🌐</span> TRANSLATE
                </button>
            </div>`;
    }

    // ⚔️ ยุทธการที่ 3: จัดระเบียบเนื้อหา (ขึ้นบรรทัดใหม่เมื่อเจอข้อ 1 หรือ 2 ตามคำสั่ง)
    let formattedText = text;
    if (isSentinelLog) {
        // แยก Phase และขึ้นบรรทัดใหม่ให้เป็นระเบียบ
        formattedText = text
            .replace(/\[PHASE/g, '<div class="phase-header">[PHASE')
            .replace(/\]/g, ']</div>')
            .replace(/\.\s/g, '.<br>');
    } else {
        // ใช้ marked สำหรับข้อความปกติ (ถ้ามี)
        formattedText = typeof marked !== 'undefined' ? marked.parse(text) : text;
    }

    const messageHTML = `
        <div id="${id}" class="chat-message ${finalClassName}">
            <div class="sender-label">
                <span class="sender-name">${sender}</span> 
                ${actionButtons}
            </div>
            <div class="message-content">${formattedText}</div>
        </div>`;

    chatWindow.insertAdjacentHTML('beforeend', messageHTML);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // ⚔️ ยุทธการที่ 4: กระตุ้นระบบ Highlighting ถ้ามีบล็อกโค้ด
    if (window.Prism) {
        Prism.highlightAllUnder(document.getElementById(id));
    }

    return id;
}

function safeHighlight(element) {
    // เช็คว่าหน่วย Prism พร้อมรบหรือไม่
    if (window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
        try {
            window.Prism.highlightAllUnder(element);
        } catch (err) {
            console.warn("🚩 [SYSTEM]: การตกแต่งรหัสขัดข้องชั่วคราว");
        }
    }
}

function generateSuggestions(content, messageId) {
    const container = document.createElement('div');
    container.className = 'suggestion-container';

    // 🎯 รายการคำสั่งยุทธวิธีแบบไดนามิก
    let suggestions = ["🔍 วิเคราะห์จุดวิกฤต", "📋 สรุปรายงานย่อ"];

    // ตรวจสอบบริบทเพื่อเพิ่มปุ่มที่เหมาะสม
    if (content.includes("```")) {
        suggestions.push("🏗️ เขียนโครงสร้างไฟล์เพิ่ม");
        suggestions.push("🧪 สร้างสคริปต์ทดสอบ (Test)");
    }

    if (content.includes("Security") || content.includes("Vulnerability") || content.includes("ช่องโหว่")) {
        suggestions.push("🛡️ วางมาตรการ Hardening");
        suggestions.push("⚠️ จำลองสถานการณ์บุกรุก");
    }

    suggestions.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.innerHTML = text;

        btn.onclick = () => {
            // ส่งคำสั่งไปยัง AI ทันที
            const inputField = document.querySelector('.command-input');
            if (inputField) {
                inputField.value = `ปฏิบัติการ: ${text}`;
                sendOrder(); // เรียกใช้ฟังก์ชันส่งข้อความเดิมของท่านจอมพล
            }
            container.style.opacity = '0.5';
            container.style.pointerEvents = 'none'; // ป้องกันการกดซ้ำ
        };
        container.appendChild(btn);
    });

    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
        // วางต่อท้าย message-content
        const contentDiv = messageDiv.querySelector('.message-content');
        contentDiv.appendChild(container);
    }
}

async function sendOrder() {
    const text = userInput.value.trim();
    if (!text && !currentBase64Image) return;

    // --- 🛡️ QUICK SLASH COMMAND (คงเดิม) ---
    if (text.startsWith('/scan ')) {
        const target = text.replace('/scan ', '').trim();
        appendMessage('COMMANDER 😈', `📡 <b>SCAN:</b> <code>${target}</code>`, 'user-message');
        if (typeof checkDarkWebLeaks === "function") checkDarkWebLeaks(target);
        clearInputAll(); return;
    }

    // 1. ทะยานข้อความ COMMANDER ขึ้นหน้าจอ
    let userHTML = currentBase64Image ? `<img src="${currentBase64Image}" class="chat-inline-img">` : "";
    userHTML += `<div>${text.replace(/\n/g, '<br>')}</div>`;
    appendMessage('COMMANDER 😈', userHTML, 'user-message');

    // 2. เตรียมพื้นที่ AI (เปลี่ยน Loading Text ให้ดุดันขึ้น)
    const loadingId = appendMessage('DARK GEMINI 🤖', '<span class="status-loader">⚡ กำลังรีดพลังสมองกล Llama (Direct GGUF)...</span>', 'ai-message sentinel-msg');
    const aiContent = document.getElementById(loadingId).querySelector('.message-content');

    clearInputAll();

    try {
        // 🎯 จุดแก้ไข: ตัด SYSTEM_RULE_OVERRIDE ที่ซ้ำซ้อนออก เพราะ Backend เราคุมไว้แล้ว
        // และนำ ai_choice ออกเพื่อให้ Payload กระชับที่สุด
        const response = await fetch('http://127.0.0.1:8000/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: text,
                image: currentBase64Image
            })
        });

        if (!response.ok) throw new Error("Connection Failure");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let isFirstChunk = true;

        // ==================================================
        // ⚔️ SUPER-SONIC STREAMING LOOP
        // ==================================================
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;


            if (isFirstChunk && chunk.trim()) {
                aiContent.innerHTML = "";
                isFirstChunk = false;
            }

            // ⚡ ใช้ requestAnimationFrame เพื่อความลื่นไหลระดับ 60FPS
            requestAnimationFrame(() => {
                aiContent.innerHTML = marked.parse(fullResponse);

                // ✨ Highlight ระหว่าง stream (เฉพาะเมื่อมี <pre><code>)
                if (window.Prism) {
                    const blocks = aiContent.querySelectorAll('pre code');
                    blocks.forEach(block => {
                        if (!block.className || block.className.includes('undefined')) {
                            block.classList.add('language-javascript');
                        }
                        Prism.highlightElement(block);
                    });
                }

                if (chatWindow.scrollHeight - chatWindow.scrollTop < 2000) {
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                }
            });

        }

        // ==================================================
        // 🛡️ POST-MISSION: จัดการหลังจบภารกิจ
        // ==================================================

        // 1. ไฮไลท์สี Code (Prism) - ทำงานเพียงครั้งเดียวเมื่อจบ Stream
        if (window.Prism) {
            const blocks = aiContent.querySelectorAll('pre code');
            blocks.forEach(block => {
                // ถ้า AI ไม่ระบุภาษา ให้ Default เป็น Javascript เพื่อความสวยงาม
                if (!block.className || block.className.includes('undefined')) {
                    block.classList.add('language-javascript');
                }
            });
            Prism.highlightAllUnder(aiContent);
        }

        // 2. บันทึกประวัติและหน่วยความจำ
        chatHistories[currentChatId] = chatWindow.innerHTML;
        aiContentDict[loadingId] = fullResponse;

        persistChats();
        addCopyButtons();
        if (typeof generateSuggestions === "function") generateSuggestions(fullResponse, loadingId);
        renderMissionPage();

        // 🔊 สั่งให้ AI อ่านสรุปสั้นๆ (300 ตัวแรก)
        if (fullResponse.trim()) speakText(fullResponse.substring(0, 300));

    } catch (err) {
        console.error("🚩 [SYSTEM ERROR]:", err);
        aiContent.innerHTML = `<span style="color:#ff4d4d;">❌ ขัดข้อง: สัญญาณจากสมองกลขาดหาย (โปรดเช็ค Uvicorn)</span>`;
    }
}

// ==================================================
// PERSISTENCE
// ==================================================
function persistChats() {
    localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
    localStorage.setItem('currentChatId', currentChatId);
}

function restoreChats() {
    const saved = localStorage.getItem('chatHistories');
    if (saved) chatHistories = JSON.parse(saved);
    currentChatId = localStorage.getItem('currentChatId');
}

// ==================================================
// CHAT STATE
// ==================================================
function saveCurrentChat() {
    if (currentChatId && !isSwitchingMission) {
        chatHistories[currentChatId] = chatWindow.innerHTML;
        persistChats();
    }
}

function clearInputAll() {
    userInput.value = "";
    currentBase64Image = null;
    imageUpload.value = "";
    previewContainer.innerHTML = "";
    previewContainer.classList.add('hidden');
}

function renderPaginationControls(totalPages) {
    let nav = document.getElementById('mission-pagination');

    if (!nav) {
        nav = document.createElement('div');
        nav.id = 'mission-pagination';
        nav.className = 'pagination-container'; // คอนเทนเนอร์หลัก
        const historyList = document.getElementById('mission-history-list');
        if (historyList) historyList.after(nav);
    }

    // ⚔️ ยุทธการซ่อน/แสดง: ถ้ามีหน้าเดียวไม่ต้องโชว์
    nav.style.display = totalPages <= 1 ? 'none' : 'flex';

    // 🚩 ปรับปรุงโครงสร้าง HTML ให้เจาะจงมากขึ้น
    nav.innerHTML = `
        <button class="pagination-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(-1)">
            <span class="btn-icon">«</span>
        </button>
        
        <div class="page-counter">
            <span class="label">PAGE:</span>
            <span class="current-num">${currentPage}</span>
            <span class="separator">/</span>
            <span class="total-num">${totalPages}</span>
        </div>
        
        <button class="pagination-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(1)">
            <span class="btn-icon">»</span>
        </button>
    `;
}

window.changePage = (step) => {
    currentPage += step;
    renderMissionPage();
};

// ปรับปรุงส่วนนี้ใน chat.js ของท่านจอมพล
function addCopyButtons() {
    document.querySelectorAll('.message-content pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.innerHTML = '📋 COPY'; // ใช้ innerHTML เพื่อรองรับ Icon ในอนาคต

        btn.onclick = () => {
            // ดึงข้อความจากแท็ก <code> ถ้ามี ถ้าไม่มีให้เอาจาก <pre> ตรงๆ
            const target = pre.querySelector('code') || pre;
            const code = target.innerText.replace('📋 COPY', '').trim();

            navigator.clipboard.writeText(code).then(() => {
                btn.innerHTML = '✅ DONE';
                btn.classList.add('copy-success'); // เพิ่ม Class เพื่อเปลี่ยนสีเขียวใน CSS
                setTimeout(() => {
                    btn.innerHTML = '📋 COPY';
                    btn.classList.remove('copy-success');
                }, 1500);
            });
        };
        pre.appendChild(btn);
    });
}

// ==================================================
// IMAGE UPLOAD / PREVIEW
// ==================================================
function handleImage(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        currentBase64Image = e.target.result;

        previewContainer.innerHTML = `
            <div class="preview-item">
                <button class="close-preview" onclick="removeImage()">✕</button>
                <img src="${currentBase64Image}">
            </div>
        `;
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentBase64Image = null;
    imageUpload.value = "";
    previewContainer.innerHTML = "";
    previewContainer.classList.add('hidden');
}

// ✅ ฟังก์ชันแปลภาษาแบบหน่วยรบพิเศษ (Streaming + Cache)
async function translateMessage(id, originalText) {
    const aiContent = document.getElementById(id).querySelector('.message-content');
    const translateBtn = document.getElementById(id).querySelector('.translate-btn');

    // 1. ตรวจสอบว่ามีข้อมูลภาษาไทยที่เคยแปลไว้แล้วหรือไม่ (Cache Check)
    if (aiContent.dataset.isTranslated === "true") {
        // สลับกลับไปภาษาเดิม (เร็วทันใจ)
        aiContent.innerHTML = marked.parse(aiContent.dataset.original);
        aiContent.dataset.isTranslated = "false";
        translateBtn.innerText = "🌐 แปลไทย";

        // บังคับให้ Prism ทำงานใหม่หลังเปลี่ยนเนื้อหา
        if (window.Prism) Prism.highlightAllUnder(aiContent);
        return;
    }

    // 2. ถ้ายังไม่เคยแปล ให้ตรวจสอบว่ามี Cache ภาษาไทยเก็บไว้ไหม
    if (aiContent.dataset.translatedCache) {
        aiContent.innerHTML = marked.parse(aiContent.dataset.translatedCache);
        aiContent.dataset.isTranslated = "true";
        translateBtn.innerText = "🌐 Original";
        if (window.Prism) Prism.highlightAllUnder(aiContent);
        return;
    }

    // 3. เริ่มกระบวนการถอดรหัส (ส่งคำร้องใหม่)
    aiContent.dataset.original = originalText;
    aiContent.innerHTML = "<span class='decoding-status'>⏳ กำลังถอดรหัสสัญญาณภาษา...</span>";
    translateBtn.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `แปลข้อความนี้เป็นภาษาไทย โดยคงรูปแบบ Markdown และ Code Block ไว้เหมือนเดิม: ${originalText}`
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let translatedText = "";
        aiContent.innerHTML = ""; // ล้างสถานะ Loading เพื่อเตรียมรับ Stream

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            translatedText += chunk;

            // แสดงผลแบบ Real-time Streaming
            aiContent.innerHTML = marked.parse(translatedText);

            // เลื่อนหน้าจอตามข้อความที่ไหลออกมา
            const chatWindow = document.getElementById('chat-container');
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }

        // เก็บผลลัพธ์ลงใน Cache เพื่อคราวหน้าจะได้ไม่ต้องรอ
        aiContent.dataset.translatedCache = translatedText;
        aiContent.dataset.isTranslated = "true";
        translateBtn.innerText = "🌐 Original";

        if (window.Prism) Prism.highlightAllUnder(aiContent);

    } catch (err) {
        aiContent.innerHTML = "❌ การเชื่อมต่อฐานข้อมูลแปลภาษาขัดข้อง";
    } finally {
        translateBtn.disabled = false;
    }
}

// ฟังก์ชันจำลองการเพิ่ม Code Wrapper หลังการ Render Markdown
function formatCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        if (block.parentElement.classList.contains('code-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';

        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `<span>SENTINEL_EXECUTOR // CODE_OUTPUT</span>
                            <button class="copy-btn" onclick="copyToClipboard(this)">Copy</button>`;

        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(header);
        wrapper.appendChild(block);
    });
}

// ฟังก์ชันสั่ง Copy
function copyToClipboard(btn) {
    const code = btn.parentElement.nextElementSibling.innerText;
    navigator.clipboard.writeText(code).then(() => {
        btn.innerText = 'DONE!';
        setTimeout(() => btn.innerText = 'Copy', 2000);
    });
}

// ✅ ฟังก์ชันสั่งการหน่วยข่าวกรองตลาดมืด
async function checkDarkWebLeaks(targetIdentifier) {
    if (!targetIdentifier) return;

    console.log(`🔍 [SURVEILLANCE]: กำลังเจาะระบบฐานข้อมูลตลาดมืดเพื่อค้นหา: ${targetIdentifier}...`);

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/darkweb-monitor?query=${encodeURIComponent(targetIdentifier)}`);
        const data = await response.json();

        // สร้าง HTML สำหรับการแจ้งเตือนระดับยุทธวิธี
        let alertHTML = "";
        if (data.leaks_found > 0) {
            alertHTML = `
                <div class="darkweb-alert-box critical">
                    <div class="alert-header">🚨 พบช่องโหว่ระดับวิกฤต!</div>
                    <p>${data.intel_report}</p>
                    <div class="source-tags">
                        ${data.sources.map(s => `<span class="tag">${s}</span>`).join('')}
                    </div>
                    <button class="action-btn" onclick="startDigitalPurge('${data.query}')">สั่งการกวาดล้างลายนิ้วมือดิจิทัล</button>
                </div>
            `;
            speakText("ท่านจอมพลครับ พบข้อมูลรั่วไหลในตลาดมืด โปรดพิจารณาสั่งการกวาดล้างด่วน!");
        } else {
            alertHTML = `
                <div class="darkweb-alert-box secure">
                    <div class="alert-header">✅ ตรวจสอบแล้ว: ปลอดภัย</div>
                    <p>${data.intel_report}</p>
                </div>
            `;
        }

        appendMessage('SYSTEM MONITOR 🚨', alertHTML, 'ai-message emergency-msg');

    } catch (err) {
        console.error("📡 [SIGNAL ERROR]: ไม่สามารถติดต่อหน่วยข่าวกรองได้", err);
    }
}

// ฟังก์ชันจำลองการกวาดล้าง (ให้ท่านจอมพลเอาไปต่อยอด)
window.startDigitalPurge = (target) => {
    alert(`⚡ กำลังเริ่มปฏิบัติการกวาดล้างข้อมูลของ ${target} ในระบบคลาวด์...`);
};

// --- [หน่วยสอดแนมรายงานจากขุนพล - VERSION 2.0] ---
let lastReportTimestamp = null; // ตัวแปรเก็บเวลาล่าสุดที่ได้รับรายงาน

// --- [หน่วยสอดแนมรายงานจากขุนพล - VERSION 2.2 (STABLE CORE)] ---
setInterval(async () => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/data/latest_strike.json?t=${Date.now()}`);
        if (!response.ok) return;
        const data = await response.json();

        if (!data.result || data.result.trim() === "" || data.result === window.lastInjectedResult) return;

        window.lastInjectedResult = data.result;

        const aiMessages = document.querySelectorAll('.ai-message.sentinel-msg .message-content');
        if (!aiMessages.length) return;

        const lastAiMsg = aiMessages[aiMessages.length - 1];
        lastAiMsg.innerHTML = marked.parse(data.result);

        // 🛡️ ปรับปรุง: ไม่ต้องสั่ง Prism ทุก 3 วินาที ให้ทำแค่ครั้งเดียวตอนที่คิดว่าจบ หรือเรียกใช้แบบประหยัดพลังงาน
        // if (window.Prism) Prism.highlightAllUnder(lastAiMsg); 

        // ❌ [ยกเลิกการบันทึกซ้ำซ้อน] บรรทัดล่างนี้คือตัวการทำเครื่องร้อนและรีเฟรช
        // chatHistories[currentChatId] = chatWindow.innerHTML;
        // persistChats();

    } catch (err) { }
}, 3000);

// 🎨 ฟังก์ชันสุดท้ายเพื่อความสวยงามตามบัญชา
function applyStructuralBeauty() {
    if (document.getElementById('structural-beauty-style')) return; // กัน inject ซ้ำ
    const style = document.createElement('style');
    style.id = 'structural-beauty-style';
    style.innerHTML = `
        .message-content b, .message-content strong {
            display: block !important;
            margin-top: 15px !important;
            color: #ff1111 !important;
        }
    `;
    document.head.appendChild(style);
}
applyStructuralBeauty();