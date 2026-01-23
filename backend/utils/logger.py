import json
import datetime
from pathlib import Path
import logging

# --- 🛰️ LOGGING INFRASTRUCTURE ---
BASE_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOG_FILE = LOG_DIR / "forensic.log"


def log_event(payload: str, ai_result: dict):
    """
    BLACKBOX RECORDER: บันทึกหลักฐานดิจิทัลเพื่อใช้ในการพิสูจน์หลักฐาน (Forensics)
    """
    try:
        # เตรียมข้อมูลสำหรับบันทึก
        record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "payload_preview": payload[:500],  # ตัดตอนเพื่อไม่ให้ Log บวมเกินไป
            "attack_type": ai_result.get("attack_type", "Unknown"),
            "severity": ai_result.get("severity", "Medium"),
            "status": ai_result.get("status", "Logged"),
            "ai_verdict": ai_result.get("ai_verdict", "No detailed verdict available"),
            "meta": {
                "engine": ai_result.get("engine", "Unknown"),
                "is_suspicious": ai_result.get("is_suspicious", True),
            },
        }

        # บันทึกแบบ Append (ต่อท้ายไฟล์)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    except Exception as e:
        # หากบันทึกลงไฟล์ไม่ได้ ให้พ่นออกทาง Console เพื่อให้ท่านจอมพลทราบ
        print(f"[!] CRITICAL LOGGING FAILURE: {str(e)}")
