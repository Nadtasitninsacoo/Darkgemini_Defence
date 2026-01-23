import re


def fast_scan(payload: str) -> bool:
    """
    ADVANCED SIGNATURE SCANNER (V18.5)
    ด่านหน้าตรวจจับรูปแบบการโจมตีมาตรฐาน (SQLi, XSS, Path Traversal)
    """
    if not payload or not isinstance(payload, str):
        return False

    # 🛡️ รายการรูปแบบภัยคุกคาม (Regex Patterns)
    # ใช้ \b เพื่อตรวจจับ "คำโดดๆ" ป้องกันการบล็อกคำทั่วไป
    threat_patterns = [
        # --- SQL Injection Patterns ---
        r"\bSELECT\b.*\bFROM\b",
        r"\bUNION\b.*\bSELECT\b",
        r"\bDROP\b.*\bTABLE\b",
        r"\bOR\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?",
        r"--",
        r"/\*.*\*/",
        # --- Cross-Site Scripting (XSS) ---
        r"<script.*?>",
        r"javascript:",
        r"onerror\s*=",
        r"alert\(.*?\)",
        # --- Path Traversal & OS Commands ---
        r"\.\./\.\./",
        r"\bXP_CMDSHELL\b",
        r"\bETC/PASSWD\b",
        r"\|\s*\bBIN/SH\b",
    ]

    payload_upper = payload.upper()

    # ตรวจสอบการพยายามทำ Encoding เพื่อพรางตา (เช่น %27 หรือ %3C)
    # หากพบสัญลักษณ์ที่ถูก Encode บ่อยเกินไป ให้ถือว่าน่าสงสัย
    if payload.count("%") > 5:
        return True

    for pattern in threat_patterns:
        if re.search(pattern, payload_upper, re.IGNORECASE):
            return True

    return False
