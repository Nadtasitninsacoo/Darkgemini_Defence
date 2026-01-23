from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. พิกัดฐานข้อมูล MySQL
# หากท่านมีรหัสผ่าน ให้ใส่หลัง root: เช่น root:password@localhost
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/darkgemini_db"

# 2. สร้าง Engine (ตัด connect_args ออกเพราะ MySQL ไม่ต้องการค่านี้)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. สร้าง Session สำหรับการใช้งาน
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
