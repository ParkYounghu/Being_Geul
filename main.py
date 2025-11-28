import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

if not all([DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME]):
    print("경고: .env 설정이 확인되지 않았습니다.")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class BeingGeul(Base):
    __tablename__ = "being_geul"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    period = Column(String)
    link = Column(String)
    genre = Column(String, default="기타")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

async def get_all_policies(db: SessionLocal = Depends(get_db)):
    return db.query(BeingGeul).all()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, policies: list = Depends(get_all_policies)):
    return templates.TemplateResponse("index_01.html", {"request": request, "policies": policies, "active_page": "/"})

@app.get("/{page_name}", response_class=HTMLResponse)
async def read_page(page_name: str, request: Request, policies: list = Depends(get_all_policies)):
    if ".." in page_name or "/" in page_name:
        raise HTTPException(status_code=400, detail="Invalid page name")
    template_file = f"{page_name}.html"
    template_path = os.path.join(templates.directory, template_file)
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Page not found")
    return templates.TemplateResponse(template_file, {"request": request, "policies": policies, "active_page": f"/{page_name}"})
