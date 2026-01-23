/**
 * DARK GEMINI DEFENCE - Sidebar UI Controller
 * หน้าที่: ควบคุมการสไลด์เปิด-ปิด และจำสถานะความกว้างของเมนูเท่านั้น
 */

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');

    // 1. ตรวจสอบสถานะเดิมจากหน่วยความจำ (LocalStorage)
    const savedStatus = localStorage.getItem('sidebarStatus');
    if (savedStatus === 'closed') {
        sidebar.classList.add('collapsed');
    }

    // 2. ฟังก์ชันสลับสถานะ เปิด-ปิด (Toggle)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');

            // บันทึกสถานะลง Memory ทันที
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarStatus', isCollapsed ? 'closed' : 'open');
        });
    }

    // 3. สั่งให้ระบบหลัก (chat.js) วาดรายการภารกิจทันทีที่หน้าจอพร้อม
    if (typeof window.renderMissionPage === 'function') {
        window.renderMissionPage();
    }
});