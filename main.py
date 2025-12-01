import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, Session, declarative_base

# .env 파일 로드 (건드리지 않음)
load_dotenv()

# 데이터베이스 연결 정보
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 데이터베이스 모델
class BeingGeul(Base):
    __tablename__ = "being_geul"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    period = Column(String)
    link = Column(String)
    genre = Column(String)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SPA 통합 엔드포인트
@app.get("/")
def read_root(request: Request, db: Session = Depends(get_db)):
    # [수정됨] limit(20) 제거 -> 모든 데이터를 가져옵니다.
    # 최신순 정렬(ID 내림차순)은 유지합니다.
    policies_objects = db.query(BeingGeul).order_by(BeingGeul.id.desc()).all()
    
    # 터미널 로그 (데이터 개수 확인용)
    print(f"------------")
    print(f"DB에서 가져온 전체 데이터 개수: {len(policies_objects)}")
    if len(policies_objects) > 0:
        print(f"첫 번째 데이터: {policies_objects[0].title}")
    print(f"------------")

    # 딕셔너리 변환
    policies_data = [
        {
            "id": p.id,
            "title": p.title,
            "summary": p.summary.replace('"', '\\"').replace('\n', ' ') if p.summary else "",
            "period": p.period,
            "link": p.link,
            "genre": p.genre
        } for p in policies_objects
    ]
    
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "policies": policies_data 
    })