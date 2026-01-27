import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# 🛡️ ยุทธวิธี: ดึงค่าจาก Environment Variables
# สำหรับ Render ให้ใช้คีย์ "DATABASE_URL" (เป็นชื่อมาตรฐานของ Render)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# 🚨 ระบบจัดการ URL (Render มักให้ postgres:// มา แต่ SQLAlchemy ต้องการ postgresql://)
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# กรณีทดสอบในเครื่อง (ถ้าไม่มีค่าจาก Env ให้ใส่ URL ของ Render ไว้เป็นค่าสำรองได้ครับ)
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "postgresql://darkgemini_db_user:XxJyYXkRnaYkK54nh0DlSH5Jk2KFXDkv@dpg-d5sf12ggjchc73ffsq3g-a.oregon-postgres.render.com/darkgemini_db"

# 🎯 สร้าง Engine สำหรับ PostgreSQL
# หมายเหตุ: PostgreSQL ไม่ต้องใช้ check_same_thread เหมือน SQLite และไม่ต้องใช้ pymysql
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,        # จำกัดจำนวนการเชื่อมต่อเพื่อไม่ให้ฐานข้อมูลทำงานหนักเกินไป
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
