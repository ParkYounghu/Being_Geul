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
# ... (위의 import 부분은 그대로 두세요) ...

@app.get("/")
def read_root(request: Request, db: Session = Depends(get_db)):
    # 1. DB에서 데이터 가져오기 (최신순)
    policies_objects = db.query(BeingGeul).order_by(BeingGeul.id.desc()).all()
    
    # 터미널 로그 확인용
    print(f"------------")
    print(f"DB에서 가져온 전체 데이터 개수: {len(policies_objects)}")
    print(f"------------")

    # 2. [수정됨] 도메인 주소 설정
    BASE_URL = "https://www.bizinfo.go.kr"

    # 3. [수정됨] 딕셔너리 변환 및 링크 수정 로직
    policies_data = []
    for p in policies_objects:
        
        # 링크가 존재하고, http로 시작하지 않는 경우(상대 경로인 경우) 도메인을 붙임
        full_link = p.link
        if p.link and not p.link.startswith("http"):
            full_link = f"{BASE_URL}{p.link}"
            
        policies_data.append({
            "id": p.id,
            "title": p.title,
            # summary가 비어있을 경우 대비 및 줄바꿈 처리
            "summary": p.summary.replace('"', '\\"').replace('\n', ' ') if p.summary else "",
            "period": p.period,
            "link": full_link,  # 완성된 링크 저장
            "genre": p.genre
        })
    
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "policies": policies_data 
    })