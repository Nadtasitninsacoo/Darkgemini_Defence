import os
import json
import ctypes
import argparse
import re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from llama_cpp import Llama  # ✅ เปลี่ยนมาใช้ตัวขับเคลื่อนสมองกลโดยตรง

# 🔽 IMPORTS CORE
# รักษาฟังก์ชันการประมวลผลคำสั่งเดิมไว้
try:
    from backend.ai_core.prompts import process_commander_input, format_commander_prompt
except ImportError:
    # Fallback กรณีหา Path ไม่เจอ
    def process_commander_input(x):
        return x

    def format_commander_prompt(x, **kwargs):
        return x


# ==================================================
# 🦾 1. INITIALIZE CONFIG & NEURAL LINK
# ==================================================
load_dotenv()

# พิกัดคลังแสงหลักที่ท่านจอมพลกำหนด (Drive D)
LOCAL_MODEL_PATH = r"D:\AI_Models\Llama-3-8B-Instruct-32k-v0.1.Q4_K_M.gguf"

# 🎯 โหลดสมองกลโดยตรง (Direct GGUF Access)
try:
    sentinel_llm = Llama(
        model_path=LOCAL_MODEL_PATH,
        n_ctx=2048,  # รักษาระดับความเสถียรของ RAM
        n_threads=4,  # รีดพลัง i3 อย่างสมดุล
        n_gpu_layers=0,  # บังคับใช้ CPU 100%
        verbose=False,
    )
    print("✅ [SYSTEM]: AGENT NEURAL LINK ACTIVE (DIRECT GGUF AT DRIVE D).")
except Exception as e:
    sentinel_llm = None
    print(f"❌ [CRITICAL]: AGENT LINK FAILURE: {e}")


# ==================================================
# 📡 2. ASYNC STREAMING ENGINE (หัวใจหลักของการพ่นรหัส)
# ==================================================
async def ask_ai(prompt: str):
    if not sentinel_llm:
        yield "❌ [ERROR]: สมองกลไม่ได้ประจำการ (Model Not Found)"
        return

    # ปรับจูนรูปแบบการตอบโต้ (Template)
    formatted_prompt = f"Q: {prompt}\nA:"

    try:
        # เริ่มต้นการสร้างคำตอบแบบ Streaming
        response_stream = sentinel_llm(
            formatted_prompt, max_tokens=2048, stream=True, stop=["Q:", "\n\n"]
        )

        for chunk in response_stream:
            if "choices" in chunk:
                text = chunk["choices"][0]["text"]
                if text:
                    yield text  # ส่งรหัสออกไปทีละอักขระ
    except Exception as e:
        yield f"\n⚠️ [SYSTEM_STRIKE_FAILURE]: {str(e)}"


# 3. WEAPONRY SYSTEM (คงเดิม)
try:
    DLL_BASE = r"C:\Users\user\DarkGemini_Defense\backend\security"
    strikeforce = ctypes.WinDLL(os.path.join(DLL_BASE, "strikeforce.dll"))
    print("⚔️ [SYSTEM]: HARDWARE ACCELERATION ACTIVE.")
except Exception:

    class WeaponMock:
        def launch_strike(self, *args):
            print("🛰️ [SYSTEM]: SOFTWARE EMULATION STRIKE ACTIVE.")

    strikeforce = WeaponMock()

# ==================================================
# 📡 แผนที่พิกัดคลังข้อมูล (Path Configuration)
# ==================================================

# --- ❌ รหัสเดิม (ใส่ # ไว้เพื่อปลดประจำการ) ---
# base_path = Path(__file__).resolve().parent.parent.parent
# history_dir = base_path / "frontend" / "public" / "data"
# history_file = history_dir / "latest_strike.json"

# --- ✅ รหัสใหม่ (เริ่มปฏิบัติการด้วยพิกัดที่แม่นยำกว่า) ---
CURRENT_DIR = Path(__file__).resolve().parent
history_dir = CURRENT_DIR.parent.parent / "frontend" / "public" / "data"
history_file = history_dir / "latest_strike.json"

# 🛡️ บรรทัดตรวจสอบพิกัด (เปิดไว้เพื่อความมั่นใจ)
print(f"🎯 [DEBUG]: เป้าหมายการส่งรายงานอยู่ที่ -> {history_file}")

# ==================================================
# 📡 CORE OPERATION FUNCTION (ปรับปรุงส่วน Invoke)
# ==================================================


def run_total_annihilation(target_info):
    refined_target = process_commander_input(target_info)
    print(f"🔥 [WAR_ROOM]: TARGETING -> {refined_target}")

    full_prompt = format_commander_prompt(refined_target, audit_mode=True)

    try:
        if OFFENSIVE_MODE:
            strikeforce.launch_strike(100)

        print("⚡ [SYSTEM]: CONSULTING DIRECT ENGINE (BYPASSING OLLAMA)...")

        # 🎯 เปลี่ยนจาก .invoke() เป็นการเรียกใช้ llm ตรงๆ
        response = sentinel_llm(
            full_prompt, max_tokens=1024, stop=["<|eot_id|>"], temperature=0.0
        )
        report_content = response["choices"][0]["text"]

    except Exception as e:
        print(f"❌ [CRITICAL_ERROR]: {e}")
        report_content = f"DATABASE_FAILURE: {str(e)}"

    save_to_dashboard(report_content)
    return report_content


def save_to_dashboard(content):
    """ส่งข้อมูลไปยังหน้าบ้าน (Frontend)"""
    try:
        # 🛡️ ยุทธวิธีป้องกัน: สร้างโฟลเดอร์อัตโนมัติหากไม่มีอยู่จริง
        history_dir.mkdir(parents=True, exist_ok=True)

        data = {
            "sender": "SENTINEL-X",
            "result": content,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "COMPLETED",
            "mode": "OFFENSIVE" if OFFENSIVE_MODE else "STANDBY",
        }

        # 🎯 เขียนไฟล์โดยใช้ Path ที่ประกาศไว้ด้านบน
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("🚩 [SUCCESS]: REPORT SENT TO COMMAND DASHBOARD.")
    except Exception as e:
        print(f"⚠️ [FILE_ERROR]: {e}")


def run_sentinel_mission(target_info):
    """
    Alias function สำหรับการเชื่อมต่อกับ main_api.py
    เพื่อให้ระบบเดิมเรียกใช้งานได้โดยไม่ต้องแก้ไขโค้ดที่หน้าบ้านเยอะ
    """
    print(f"📡 [DIRECTIVE]: ท่านจอมพลสั่งลั่นไกภารกิจ -> {target_info}")
    return run_total_annihilation(target_info)


# ==================================================
# ⌨️ COMMAND LINE INTERFACE
# ==================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["offensive", "standby"], default="standby")
    args = parser.parse_args()

    # Override โหมดการทำงาน
    OFFENSIVE_MODE = args.mode == "offensive"

    target = "TARGET_INFRASTRUCTURE_V26"
    run_total_annihilation(target)
