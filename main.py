import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
import uvicorn

# 1. .env 로드 및 환경변수 설정 (기본값 설정으로 에러 방지)
load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password") # .env에 비번이 없으면 이 값이 쓰입니다.
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432") # 포트가 없으면 기본값 5432 사용
DB_NAME = os.getenv("DB_NAME", "my_database")

# DB 접속 URL 조합
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 2. SQLAlchemy 설정
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 3. 데이터베이스 모델 정의 (genre 포함)
class BeingGeul(Base):
    __tablename__ = "being_geul"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    period = Column(String)
    link = Column(String)
    genre = Column(String, default="기타") # 장르 컬럼

# 테이블 생성 (서버 시작 시 테이블이 없으면 자동 생성)
Base.metadata.create_all(bind=engine)

# 4. FastAPI 앱 설정
app = FastAPI()

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# DB 세션 의존성 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 5. 라우팅 (HTML 사이드바 링크와 주소를 일치시킴) ---

# 1. 메인 (오늘의 정책 - 스와이프 UI)
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request, db: Session = Depends(get_db)):
    policies = db.query(BeingGeul).all()
    # active_page를 넘겨줘야 사이드바 색상이 변합니다.
    return templates.TemplateResponse("index_01.html", {
        "request": request, 
        "policies": policies, 
        "active_page": "/" 
    })

# 2. 찜한 정책 (HTML 링크: /index_02)
@app.get("/index_02", response_class=HTMLResponse)
def read_liked(request: Request, db: Session = Depends(get_db)):
    policies = db.query(BeingGeul).all()
    return templates.TemplateResponse("index_02.html", {
        "request": request, 
        "policies": policies, 
        "active_page": "/index_02"
    })

# 3. 취향 분석 (HTML 링크: /index_03)
@app.get("/index_03", response_class=HTMLResponse)
def read_analysis(request: Request, db: Session = Depends(get_db)):
    policies = db.query(BeingGeul).all()
    return templates.TemplateResponse("index_03.html", {
        "request": request, 
        "policies": policies, 
        "active_page": "/index_03"
    })

# 4. 정책 탐색 (HTML 링크: /index_04)
@app.get("/index_04", response_class=HTMLResponse)
def read_search(request: Request, db: Session = Depends(get_db)):
    policies = db.query(BeingGeul).all()
    return templates.TemplateResponse("index_04.html", {
        "request": request, 
        "policies": policies, 
        "active_page": "/index_04"
    })

if __name__ == "__main__":
    # 포트 충돌 방지를 위해 8000번 사용 (충돌 시 8001로 변경 가능)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)