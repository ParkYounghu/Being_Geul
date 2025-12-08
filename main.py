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
from collections import Counter

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

# --- 모델 정의 ---

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

# 닉네임 생성 API (수정됨: 1순위, 2순위 조합 로직)
@app.post("/api/generate-nickname")
def generate_nickname(likes: UserLikes):
    genres = likes.liked_genres
    if not genres:
        return {"nickname": "아직 모르는 정책 탐험가"}

    # 장르별 카운트 및 내림차순 정렬
    count = Counter(genres)
    sorted_genres = count.most_common() # [('장르1', 5), ('장르2', 3), ...]
    
    # 1순위, 2순위 추출
    first_genre = sorted_genres[0][0]
    second_genre = sorted_genres[1][0] if len(sorted_genres) > 1 else None

    # 조합 매핑 데이터
    nickname_map = {
        "금융/자산": {
            "default": "티끌 모아 태산? 아니, 티끌 모아 황금!",
            "취업/창업": "연봉 점프업 야망가",
            "주거/생활": "내 집 마련 영끌러",
            "교육/역량": "가성비 갑 짠테크 천재",
            "복지/건강": "실속 챙기는 스마트 컨슈머",
            "참여/권리": "착한 소비, 가치 투자자"
        },
        "취업/창업": {
            "default": "내 일(Job)로 내 일(Life)을 만든다.",
            "금융/자산": "성공한 영앤리치 꿈나무",
            "주거/생활": "직주근접 워커홀릭",
            "교육/역량": "대체불가 만렙 능력자",
            "복지/건강": "오래 일하고픈 롱런러",
            "참여/권리": "세상을 바꾸는 소셜 벤처"
        },
        "주거/생활": {
            "default": "일단 내 몸 누일 곳이 편안해야 한다.",
            "금융/자산": "청약 당첨 1일 1기도",
            "취업/창업": "프로 재택 근무러",
            "교육/역량": "방구석 자기계발왕",
            "복지/건강": "슬기로운 집콕 생활자",
            "참여/권리": "우리 동네 핵인싸 반장"
        },
        "교육/역량": {
            "default": "배움에는 끝이 없고, 내 스펙엔 한계가 없다.",
            "금융/자산": "내 몸값 투자 전략가",
            "취업/창업": "준비된 육각형 인재",
            "주거/생활": "도서관 옆집 장학생",
            "복지/건강": "건강한 멘탈의 수험생",
            "참여/권리": "깨어있는 지식 탐구자"
        },
        "복지/건강": {
            "default": "몸도 마음도 튼튼해야 뭐든 할 수 있지!",
            "금융/자산": "병원비 아끼는 헬스보이/걸",
            "취업/창업": "워라밸 수호 요정",
            "주거/생활": "쾌적한 힐링 하우스지기",
            "교육/역량": "마음 근육 단련가",
            "참여/권리": "모두의 행복 지킴이"
        },
        "참여/권리": {
            "default": "함께 목소리를 내고, 같이 잘 살고 싶어.",
            "금융/자산": "투명한 지갑 감시단",
            "취업/창업": "혁신적인 체인지 메이커",
            "주거/생활": "쉐어하우스 커뮤니티 리더",
            "교육/역량": "논리정연 프로 토론러",
            "복지/건강": "동네방네 소식통"
        }
    }

    # 매핑 찾기
    if first_genre in nickname_map:
        genre_group = nickname_map[first_genre]
        # 2순위가 있고 매핑에 존재하면 해당 닉네임, 없으면 1순위 대표 문구(default) 사용
        if second_genre and second_genre in genre_group:
            final_nickname = genre_group[second_genre]
        else:
            final_nickname = genre_group["default"]
    else:
        # 예외 처리
        final_nickname = f"미래의 {first_genre} 마스터 🌟"

    return {"nickname": final_nickname}