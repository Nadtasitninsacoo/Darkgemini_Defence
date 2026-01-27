import os
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# 🛡️ IMPORT ASYNC ENGINE
# English: Connect to the Gemini API wrapper we built in ask_ai.py
from backend.ai_core.ask_ai import ask_ai

# 🔽 IMPORTS CORE
try:
    from backend.ai_core.prompts import process_commander_input, format_commander_prompt
except ImportError:
    # Fallback protocol if paths are disconnected
    def process_commander_input(x):
        return x

    def format_commander_prompt(x, **kwargs):
        return x

# ==================================================
# 🦾 1. INITIALIZE CONFIG & NEURAL LINK (CLOUD ADAPTED)
# ==================================================
load_dotenv()
logger = logging.getLogger("SENTINEL_CORE")

# 📡 [COMMANDER_INFO]: บน Render เราจะข้ามการโหลด Llama() และ ctypes
# เพื่อป้องกันการใช้ RAM เกินและ Error จากระบบปฏิบัติการ Linux
sentinel_llm = None 

# ==================================================
# 🦾 2. WEAPONRY SYSTEM (EMULATION MODE FOR CLOUD)
# ==================================================
class WeaponMock:
    def launch_strike(self, *args):
        print("🛰️ [SYSTEM]: SOFTWARE EMULATION STRIKE ACTIVE.")

strikeforce = WeaponMock()

# ==================================================
# 📡 PATH CONFIGURATION (UNIVERSAL DEPLOYMENT)
# ==================================================
CURRENT_DIR = Path(__file__).resolve().parent
history_dir = CURRENT_DIR.parent.parent / "frontend" / "public" / "data"
history_file = history_dir / "latest_strike.json"

# ==================================================
# 📡 CORE OPERATION FUNCTION (GEMINI POWERED LOGIC)
# ==================================================

async def run_total_annihilation(target_info):
    """
    [MISSION_REFORM]: Replaced heavy Llama-cpp with Satellite Link (Gemini API)
    English: Main mission logic that uses the async generator from ask_ai.
    """
    refined_target = process_commander_input(target_info)
    logger.info(f"🔥 [WAR_ROOM]: TARGETING -> {refined_target}")

    full_prompt = format_commander_prompt(refined_target, audit_mode=True)
    report_content = ""

    try:
        # 🎯 Logic เดิม: ตรวจสอบสถานะโจมตี
        # หมายเหตุ: บน Cloud เราใช้ Emulation เพื่อไม่ให้ระบบพัง
        if os.getenv("OFFENSIVE_MODE") == "True":
            strikeforce.launch_strike(100)

        logger.info("⚡ [SYSTEM]: CONSULTING SATELLITE ENGINE (GEMINI)...")

        # 🎯 ดึงพลังจากสมองกลผ่านระบบ Streaming (Gemini API)
        async for chunk in ask_ai(full_prompt):
            if chunk:
                report_content += chunk

    except Exception as e:
        logger.error(f"❌ [CRITICAL_ERROR]: {e}")
        report_content = f"MISSION_FAILURE: {str(e)}"

    save_to_dashboard(report_content)
    return report_content

# ==================================================
# 📡 CORE OPERATION FUNCTION (REPORTING)
# ==================================================

def save_to_dashboard(content):
    """
    Sends mission reports to the frontend dashboard.
    """
    try:
        history_dir.mkdir(parents=True, exist_ok=True)

        data = {
            "sender": "SENTINEL-X",
            "result": content,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "COMPLETED",
            "mode": "CLOUD_STRIKE",
        }

        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        logger.info("🚩 [SUCCESS]: REPORT SENT TO COMMAND DASHBOARD.")
    except Exception as e:
        logger.error(f"⚠️ [FILE_ERROR]: {e}")

async def run_sentinel_mission(target_info):
    """
    Alias function for main_api.py connection.
    """
    logger.info(f"📡 [DIRECTIVE]: ท่านจอมพลสั่งลั่นไกภารกิจ -> {target_info}")
    return await run_total_annihilation(target_info)

# ==================================================
# ⌨️ COMMAND LINE INTERFACE
# ==================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["offensive", "standby"], default="standby")
    args = parser.parse_args()

    # ตั้งค่าโหมดผ่าน Environment สำหรับ Async Logic
    os.environ["OFFENSIVE_MODE"] = "True" if args.mode == "offensive" else "False"

    import asyncio
    target = "TARGET_INFRASTRUCTURE_V26"
    asyncio.run(run_total_annihilation(target))
