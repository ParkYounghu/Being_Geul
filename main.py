import os

import random

from dotenv import load_dotenv

from fastapi import FastAPI, Depends, Request, HTTPException

from fastapi.templating import Jinja2Templates

from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

from sqlalchemy import create_engine, Column, Integer, String, Text

from sqlalchemy.orm import sessionmaker, Session, declarative_base

from typing import List



# 1. .env 파일 로드

load_dotenv()



# 2. DB 설정 (PostgreSQL)

DB_USER = os.getenv("DB_USER", "user")

DB_PASSWORD = os.getenv("DB_PASSWORD", "password")

DB_HOST = os.getenv("DB_HOST", "localhost")

DB_PORT = os.getenv("DB_PORT", "5432")

DB_NAME = os.getenv("DB_NAME", "dbname")



# PostgreSQL 연결 주소

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"



# 엔진 생성

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()



# --- 모델 정의 (이 부분이 지워져서 에러가 났던 겁니다!) ---



# 기존 정책 테이블

class BeingGeul(Base):

    __tablename__ = "being_geul"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, index=True)

    summary = Column(Text)

    period = Column(String)

    link = Column(String)

    genre = Column(String)



# [필수] 유저 테이블 (회원가입/로그인용)

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, index=True)

    password = Column(String) # 실제 서비스 시 해시 암호화 권장



# 테이블 생성 (없으면 자동 생성)

Base.metadata.create_all(bind=engine)



# --- Pydantic 모델 (API 요청 데이터 검증용) ---

class UserAuth(BaseModel):

    username: str

    password: str



class UserLikes(BaseModel):

    liked_titles: List[str]

    liked_genres: List[str]



app = FastAPI()



# [중요] 정적 파일 마운트

app.mount("/static", StaticFiles(directory="static"), name="static")

app.mount("/images", StaticFiles(directory="images"), name="images")



templates = Jinja2Templates(directory="templates")



# DB 세션 의존성 함수

def get_db():

    db = SessionLocal()

    try: yield db

    finally: db.close()



# 정책 데이터 가공 함수

def get_processed_policies(db: Session):

    policies_objects = db.query(BeingGeul).order_by(BeingGeul.id.desc()).all()

    BASE_URL = "https://www.bizinfo.go.kr"

    policies_data = []

    for p in policies_objects:

        full_link = p.link

        # 링크가 상대경로인 경우 기본 URL 추가

        if p.link and not p.link.startswith("http"):

            full_link = f"{BASE_URL}{p.link}"

           

        policies_data.append({

            "id": p.id,

            "title": p.title,

            "summary": p.summary if p.summary else "내용 없음",

            "period": p.period,

            "link": full_link,

            "genre": p.genre

        })

    return policies_data



# --- 라우터 ---



@app.get("/")

def read_root(request: Request, db: Session = Depends(get_db)):

    data = get_processed_policies(db)

    return templates.TemplateResponse("index.html", {"request": request, "policies": data})



@app.get("/mypage.html")

def read_mypage(request: Request, db: Session = Depends(get_db)):

    data = get_processed_policies(db)

    return templates.TemplateResponse("mypage.html", {"request": request, "policies": data})



# [기능 추가] 회원가입 API

@app.post("/api/signup")

def signup(user_data: UserAuth, db: Session = Depends(get_db)):

    # 중복 아이디 확인

    existing_user = db.query(User).filter(User.username == user_data.username).first()

    if existing_user:

        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")

   

    # 유저 생성 및 저장

    new_user = User(username=user_data.username, password=user_data.password)

    db.add(new_user)

    db.commit()

   

    return {"message": "회원가입 성공"}



# [기능 추가] 로그인 API

@app.post("/api/login")

def login(user_data: UserAuth, db: Session = Depends(get_db)):

    # 아이디 조회

    user = db.query(User).filter(User.username == user_data.username).first()

   

    # 아이디가 없거나 비밀번호가 틀린 경우

    if not user or user.password != user_data.password:

        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")

   

    return {"message": "로그인 성공", "username": user.username}



# 닉네임 생성 API

@app.post("/api/generate-nickname")

def generate_nickname(likes: UserLikes):

    genres = likes.liked_genres

    # 가장 많이 선택한 장르 찾기 (없으면 '정책' 기본값)

    most_common_genre = max(set(genres), key=genres.count) if genres else "정책"

   

    nicknames = [

        f"야망 있는 {most_common_genre} 사냥꾼 🏹",

        f"빈틈 없는 {most_common_genre} 전략가 🧠",

        f"미래의 {most_common_genre} 마스터 🌟",

        f"꼼꼼한 혜택 수집가 🐿️",

        f"스마트한 {most_common_genre} 리더 👑"

    ]

    return {"nickname": random.choice(nicknames)}