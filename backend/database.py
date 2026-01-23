import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# 🛡️ ยุทธวิธี: ดึงค่าจาก Environment Variables หากไม่มีให้ใช้ค่า Default (สำหรับ Test ในเครื่อง)
# ใน Render ให้ท่านตั้งค่า SQLALCHEMY_DATABASE_URL ในหน้า Environment Variables ครับ
SQLALCHEMY_DATABASE_URL = os.getenv(
    "SQLALCHEMY_DATABASE_URL", 
    "mysql+pymysql://root:@localhost/darkgemini_db"
)

# 🎯 สร้าง Engine
# เพิ่ม pool_pre_ping=True เพื่อป้องกันการหลุดการเชื่อมต่อ (Connection Timeout)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
