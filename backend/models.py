from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from sqlalchemy.orm import declarative_base

# 🚩 ลบ 'from database import engine' บรรทัดบนทิ้ง
# และใช้โครงสร้างนี้แทนเพื่อความเบ็ดเสร็จ
try:
    from backend.database import engine
except ImportError:
    import sys
    import os

    # เพิ่มทางเชื่อมให้ Python มองเห็นไฟล์ในโฟลเดอร์เดียวกัน
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from database import engine

Base = declarative_base()


class ThreatLog(Base):
    __tablename__ = "threat_logs"

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

    id = Column(Integer, primary_key=True, index=True)
    directive = Column(Text)
    response = Column(Text)
    # 2. 🛡️ แก้ไขจุดนี้: ระบุความยาวให้ intel_type
    intel_type = Column(String(100))
    timestamp = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


# 3. สั่งสร้างตาราง
if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("✅ คลังแสงถูกจัดเตรียมเรียบร้อย: ตารางพร้อมใช้งานแล้ว!")
