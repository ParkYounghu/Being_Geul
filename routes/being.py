# routes/being.py
from fastapi import APIRouter, Request, Depends, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.status import HTTP_303_SEE_OTHER
from services import db


# APIRouter 인스턴스 생성
router = APIRouter()

# Jinja2 템플릿 설정
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse, summary="정부지원사업 전체 목록")
async def get_all_projects_page(request: Request):
    """
    모든 정부 지원 사업 목록을 조회하여 HTML 페이지로 반환합니다.
    """
    try:
        projects = db.get_all_projects()
        return templates.TemplateResponse("being/list.html", {"request": request, "projects": projects})
    except Exception as e:
        # 데이터베이스 연결 실패 등 예외 처리
        raise HTTPException(status_code=500, detail=f"서버 오류가 발생했습니다: {e}")


@router.get("/create", response_class=HTMLResponse, summary="새 정부지원사업 입력 폼")
async def create_project_form(request: Request):
    """
    새로운 정부 지원 사업을 등록하기 위한 HTML 폼을 반환합니다.
    """
    return templates.TemplateResponse("being/create.html", {"request": request})


@router.post("/create", summary="새 정부지원사업 DB 저장")
async def create_project_data(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(None),
    deadline: str = Form(None),
    link: str = Form(None)
):
    """
    폼으로 전송된 데이터를 받아 새로운 정부 지원 사업을 데이터베이스에 저장합니다.
    저장 후 목록 페이지로 리디렉션합니다.
    """
    db.create_project(title, description, category, deadline, link)
    return RedirectResponse(url="/being", status_code=HTTP_303_SEE_OTHER)


@router.get("/detail/{id}", response_class=HTMLResponse, summary="상세 페이지")
async def get_project_detail(request: Request, id: int):
    """
    특정 ID의 정부 지원 사업 상세 정보를 조회하여 HTML 페이지로 반환합니다.
    """
    project = db.get_project_by_id(id)
    if not project:
        raise HTTPException(status_code=404, detail="해당 ID의 사업을 찾을 수 없습니다.")
    return templates.TemplateResponse("being/detail.html", {"request": request, "project": project})


@router.get("/update/{id}", response_class=HTMLResponse, summary="업데이트 폼")
async def update_project_form(request: Request, id: int):
    """
    기존 정부 지원 사업 정보를 수정하기 위한 HTML 폼을 반환합니다.
    폼에는 기존 데이터가 채워져 있습니다.
    """
    project = db.get_project_by_id(id)
    if not project:
        raise HTTPException(status_code=404, detail="해당 ID의 사업을 찾을 수 없습니다.")
    return templates.TemplateResponse("being/update.html", {"request": request, "project": project})


@router.post("/update/{id}", summary="DB 업데이트")
async def update_project_data(
    id: int,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(None),
    deadline: str = Form(None),
    link: str = Form(None)
):
    """
    폼으로 전송된 데이터를 받아 특정 ID의 정부 지원 사업 정보를 업데이트합니다.
    업데이트 후 상세 페이지로 리디렉션합니다.
    """
    db.update_project(id, title, description, category, deadline, link)
    return RedirectResponse(url=f"/being/detail/{id}", status_code=HTTP_303_SEE_OTHER)


@router.post("/delete/{id}", summary="데이터 삭제")
async def delete_project_data(id: int):
    """
    특정 ID의 정부 지원 사업 정보를 데이터베이스에서 삭제합니다.
    삭제 후 목록 페이지로 리디렉션합니다.
    """
    db.delete_project(id)
    return RedirectResponse(url="/being", status_code=HTTP_303_SEE_OTHER)
