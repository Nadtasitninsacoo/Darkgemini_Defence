from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from sqlalchemy.orm import declarative_base
import sys
import os

# 🛡️ ยุทธวิธี: เชื่อมต่อกับคลังข้อมูล (Database Engine)
try:
    # พยายามดึง engine มาจากไฟล์ database.py ในโฟลเดอร์เดียวกัน
    from backend.database import engine
except ImportError:
    # กรณีรันไฟล์นี้โดยตรงเพื่อสร้างตาราง
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from database import engine

# 🎯 กำหนดฐานรากของตาราง
Base = declarative_base()

class ThreatLog(Base):
    __tablename__ = "threat_logs"
    # English comments for code: Database schema for threat detection logs
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    payload = Column(Text)
    severity = Column(String(50))
    attack_type = Column(String(100))
    ai_verdict = Column(Text)
    engine_source = Column(String(50))
    status = Column(String(50))

class MissionLog(Base):
    __tablename__ = "mission_logs"
    # English comments for code: Database schema for commander directives
    id = Column(Integer, primary_key=True, index=True)
    directive = Column(Text)
    response = Column(Text)
    intel_type = Column(String(100))
    timestamp = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

# 🚀 3. ปฏิบัติการสร้างตาราง (รันเฉพาะเมื่อสั่งตรงเท่านั้น)
if __name__ == "__main__":
    print("🛰️ [SYSTEM]: กำลังสร้างคลังข้อมูลใน PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✅ [SUCCESS]: คลังแสงถูกจัดเตรียมเรียบร้อย: ตารางพร้อมใช้งานแล้ว!")
