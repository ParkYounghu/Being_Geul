import os
import shutil
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

def generate_main_py():
    """main.py 파일 생성"""
    main_py_content = """import os
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
"""
    with open("main.py", "w", encoding="utf-8") as f:
        f.write(main_py_content)
    print("✅ main.py 생성 완료")

def generate_templates_and_static_files():
    """템플릿 및 정적 파일 생성"""
    os.makedirs("templates", exist_ok=True)
    os.makedirs("static", exist_ok=True)

    # 1. index_01.html (스와이프 UI)
    index_01_html = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오늘의 정책</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body class="dark-mode">
    <div class="main-container">
        <aside class="sidebar">
            <div class="logo-area">Policy Matcher</div>
            <nav class="menu">
                <a href="/" class="menu-item {% if active_page == '/' %}active{% endif %}"><i class="fas fa-layer-group"></i><span>오늘의 정책</span></a>
                <a href="/index_02" class="menu-item {% if active_page == '/index_02' %}active{% endif %}"><i class="fas fa-bookmark"></i><span>찜한 정책</span></a>
                <a href="/index_03" class="menu-item {% if active_page == '/index_03' %}active{% endif %}"><i class="fas fa-chart-pie"></i><span>취향 분석</span></a>
                <a href="/index_04" class="menu-item {% if active_page == '/index_04' %}active{% endif %}"><i class="fas fa-search"></i><span>정책 탐색</span></a>
            </nav>
        </aside>
        <main class="content-area">
            <div class="content-header">
                <h2>오늘의 정책 추천</h2>
                <p>좌우로 넘겨서 취향을 알려주세요 (오른쪽: LIKE, 왼쪽: NOPE)</p>
            </div>
            <div class="card-stack-container">
                <div class="card-stack" id="cardStack">
                    {% for policy in policies %}
                    <div class="swipe-card" data-id="{{ policy.id }}" data-genre="{{ policy.genre }}">
                        <div class="card-info">
                            <span class="card-badge">{{ policy.genre }}</span>
                            <h3 class="card-title">{{ policy.title }}</h3>
                            <p class="card-desc">{{ policy.summary }}</p>
                            <span class="period">{{ policy.period }}</span>
                        </div>
                        <div class="status-text like-text">LIKE</div>
                        <div class="status-text nope-text">NOPE</div>
                    </div>
                    {% else %}
                    <div class="no-data-message"><p>표시할 정책 데이터가 없습니다.</p></div>
                    {% endfor %}
                </div>
            </div>
        </main>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>"""
    with open("templates/index_01.html", "w", encoding="utf-8") as f:
        f.write(index_01_html)

    # 2. index_02.html (찜한 정책)
    index_02_html = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>찜한 정책</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body class="dark-mode">
    <div class="main-container">
        <aside class="sidebar">
            <div class="logo-area">Policy Matcher</div>
            <nav class="menu">
                <a href="/" class="menu-item {% if active_page == '/' %}active{% endif %}"><i class="fas fa-layer-group"></i><span>오늘의 정책</span></a>
                <a href="/index_02" class="menu-item {% if active_page == '/index_02' %}active{% endif %}"><i class="fas fa-bookmark"></i><span>찜한 정책</span></a>
                <a href="/index_03" class="menu-item {% if active_page == '/index_03' %}active{% endif %}"><i class="fas fa-chart-pie"></i><span>취향 분석</span></a>
                <a href="/index_04" class="menu-item {% if active_page == '/index_04' %}active{% endif %}"><i class="fas fa-search"></i><span>정책 탐색</span></a>
            </nav>
        </aside>
        <main class="content-area">
            <div class="content-header"><h2>내가 찜한 정책</h2></div>
            <div class="policy-grid-container" id="likedPoliciesGrid">
                {% for policy in policies %}
                <a href="{{ policy.link }}" target="_blank" class="policy-grid-item" data-id="{{ policy.id }}">
                    <div class="grid-info">
                        <span class="grid-genre">{{ policy.genre }}</span>
                        <h4>{{ policy.title }}</h4>
                        <p>{{ policy.summary }}</p>
                    </div>
                </a>
                {% endfor %}
                <p id="noLikedItemsMessage" class="no-data-message" style="display:none; grid-column: 1 / -1;">찜한 정책이 없습니다.</p>
            </div>
        </main>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>"""
    with open("templates/index_02.html", "w", encoding="utf-8") as f:
        f.write(index_02_html)

    # 3. index_03.html (취향 분석)
    index_03_html = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>취향 분석</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body class="dark-mode">
    <div class="main-container">
        <aside class="sidebar">
            <div class="logo-area">Policy Matcher</div>
            <nav class="menu">
                <a href="/" class="menu-item {% if active_page == '/' %}active{% endif %}"><i class="fas fa-layer-group"></i><span>오늘의 정책</span></a>
                <a href="/index_02" class="menu-item {% if active_page == '/index_02' %}active{% endif %}"><i class="fas fa-bookmark"></i><span>찜한 정책</span></a>
                <a href="/index_03" class="menu-item {% if active_page == '/index_03' %}active{% endif %}"><i class="fas fa-chart-pie"></i><span>취향 분석</span></a>
                <a href="/index_04" class="menu-item {% if active_page == '/index_04' %}active{% endif %}"><i class="fas fa-search"></i><span>정책 탐색</span></a>
            </nav>
        </aside>
        <main class="content-area analysis-page">
            <div class="content-header"><h2>나의 정책 취향 분석</h2></div>
            <div class="analysis-results">
                <p id="noAnalysisDataMessage" class="no-data-message" style="display:none;">분석할 데이터가 없습니다.</p>
                <div id="genreAnalysisChart" class="chart-container"></div>
                <div id="genreAnalysisList" class="analysis-list"></div>
            </div>
             {% for policy in policies %}
                <div class="hidden-policy-data" data-id="{{ policy.id }}" data-genre="{{ policy.genre }}" data-title="{{ policy.title }}" data-summary="{{ policy.summary }}" data-period="{{ policy.period }}" data-link="{{ policy.link }}"></div>
            {% endfor %}
        </main>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>"""
    with open("templates/index_03.html", "w", encoding="utf-8") as f:
        f.write(index_03_html)

    # 4. index_04.html (전체 보기)
    index_04_html = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>정책 탐색</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body class="dark-mode">
    <div class="main-container">
        <aside class="sidebar">
            <div class="logo-area">Policy Matcher</div>
            <nav class="menu">
                <a href="/" class="menu-item {% if active_page == '/' %}active{% endif %}"><i class="fas fa-layer-group"></i><span>오늘의 정책</span></a>
                <a href="/index_02" class="menu-item {% if active_page == '/index_02' %}active{% endif %}"><i class="fas fa-bookmark"></i><span>찜한 정책</span></a>
                <a href="/index_03" class="menu-item {% if active_page == '/index_03' %}active{% endif %}"><i class="fas fa-chart-pie"></i><span>취향 분석</span></a>
                <a href="/index_04" class="menu-item {% if active_page == '/index_04' %}active{% endif %}"><i class="fas fa-search"></i><span>정책 탐색</span></a>
            </nav>
        </aside>
        <main class="content-area">
            <div class="content-header"><h2>전체 정책 탐색</h2></div>
            <div class="policy-grid-container">
                {% for policy in policies %}
                <a href="{{ policy.link }}" target="_blank" class="policy-grid-item" data-id="{{ policy.id }}">
                    <div class="grid-info">
                        <span class="grid-genre">{{ policy.genre }}</span>
                        <h4>{{ policy.title }}</h4>
                        <p>{{ policy.summary }}</p>
                    </div>
                </a>
                {% else %}
                <p class="no-data-message">데이터가 없습니다.</p>
                {% endfor %}
            </div>
        </main>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>"""
    with open("templates/index_04.html", "w", encoding="utf-8") as f:
        f.write(index_04_html)

    # 5. style.css (스타일)
    style_css = """* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, sans-serif; height: 100vh; overflow: hidden; background-color: #1a1a1a; color: #f0f0f0; }
a { text-decoration: none; color: inherit; }
.main-container { display: flex; height: 100%; }
.sidebar { width: 250px; background-color: #222; padding: 20px; display: flex; flex-direction: column; }
.logo-area { font-size: 24px; font-weight: 700; margin-bottom: 40px; text-align: center; }
.menu { display: flex; flex-direction: column; gap: 10px; }
.menu-item { display: flex; align-items: center; padding: 15px 20px; border-radius: 10px; color: #bdc3c7; }
.menu-item:hover, .menu-item.active { background-color: #555; color: white; }
.menu-item i { width: 25px; margin-right: 15px; text-align: center; }
.content-area { flex: 1; background-color: #282828; padding: 40px; overflow-y: auto; position: relative; }
.content-header { margin-bottom: 30px; }
.card-stack-container { display: flex; justify-content: center; align-items: center; min-height: 500px; position: relative; }
.card-stack { position: relative; width: 400px; height: 600px; }
.swipe-card { position: absolute; width: 100%; height: 100%; background: #000; border-radius: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.4); display: flex; flex-direction: column; padding: 25px; transition: transform 0.3s; cursor: grab; }
.swipe-card:active { cursor: grabbing; }
.card-info { flex: 1; }
.card-badge { background: #333; color: #4facfe; padding: 6px 12px; border-radius: 15px; font-size: 13px; font-weight: bold; }
.card-title { font-size: 28px; margin: 15px 0; }
.card-desc { color: #e0e0e0; line-height: 1.6; }
.period { display: block; text-align: right; color: #bbb; margin-top: 20px; font-size: 14px; }
.status-text { position: absolute; top: 40px; padding: 10px 20px; border: 4px solid; border-radius: 10px; font-size: 36px; font-weight: 800; opacity: 0; transform: rotate(-15deg); transition: opacity 0.2s; }
.like-text { right: 40px; color: #4ade80; border-color: #4ade80; transform: rotate(15deg); }
.nope-text { left: 40px; color: #f87171; border-color: #f87171; }
.policy-grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.policy-grid-item { background: #000; border-radius: 15px; padding: 20px; transition: transform 0.2s; display: flex; flex-direction: column; }
.policy-grid-item:hover { transform: translateY(-5px); }
.grid-info h4 { margin: 10px 0; font-size: 18px; }
.grid-genre { background: #333; color: #4facfe; padding: 4px 8px; border-radius: 10px; font-size: 11px; }
.analysis-page { flex-direction: column; align-items: center; }
.analysis-results { width: 100%; max-width: 800px; background: #000; padding: 30px; border-radius: 15px; text-align: center; }
.chart-container { margin: 20px 0; font-size: 24px; font-weight: bold; color: #4facfe; }
.analysis-list div { font-size: 18px; margin: 10px 0; display: flex; justify-content: space-between; padding: 0 40px; }
.hidden-policy-data { display: none; }
"""
    with open("static/style.css", "w", encoding="utf-8") as f:
        f.write(style_css)

    # 6. script.js (로직: 스와이프, 찜하기, 분석)
    script_js = """
const Storage = {
    get: k => JSON.parse(localStorage.getItem(k) || '[]'),
    add: (k, v) => {
        let d = Storage.get(k);
        if(!d.includes(v)) { d.push(v); localStorage.setItem(k, JSON.stringify(d)); }
    }
};

let allPolicies = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. 데이터 로드
    document.querySelectorAll('.hidden-policy-data').forEach(el => {
        allPolicies.push({
            id: parseInt(el.dataset.id),
            title: el.dataset.title,
            genre: el.dataset.genre
        });
    });

    // 2. 스와이프 로직 (index_01)
    const cardStack = document.getElementById('cardStack');
    if(cardStack) {
        let cards = Array.from(cardStack.querySelectorAll('.swipe-card'));
        let current = cards[cards.length - 1];
        let isDragging = false, startX = 0;

        function endDrag(e) {
            if(!current || !isDragging) return;
            isDragging = false;
            let deltaX = (e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX) - startX;
            
            if(deltaX > 100) { // LIKE (오른쪽)
                current.style.transform = `translate(100vw, 0) rotate(30deg)`;
                Storage.add('liked', parseInt(current.dataset.id));
                setTimeout(() => current.remove(), 300);
            } else if(deltaX < -100) { // NOPE (왼쪽)
                current.style.transform = `translate(-100vw, 0) rotate(-30deg)`;
                setTimeout(() => current.remove(), 300);
            } else {
                current.style.transform = '';
                current.querySelector('.like-text').style.opacity = 0;
                current.querySelector('.nope-text').style.opacity = 0;
            }
            // 다음 카드 준비
            cards.pop();
            current = cards[cards.length - 1];
        }

        const start = e => { 
            if(e.target.closest('.swipe-card') !== current) return;
            isDragging = true; 
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; 
        };
        const move = e => {
            if(!isDragging || !current) return;
            let x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - startX;
            current.style.transform = `translate(${x}px, 0) rotate(${x/20}deg)`;
            current.querySelector('.like-text').style.opacity = x > 50 ? 1 : 0;
            current.querySelector('.nope-text').style.opacity = x < -50 ? 1 : 0;
        };

        cardStack.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', endDrag);
        cardStack.addEventListener('touchstart', start);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', endDrag);
    }

    // 3. 찜한 목록 (index_02)
    const likedGrid = document.getElementById('likedPoliciesGrid');
    if(likedGrid) {
        const liked = Storage.get('liked');
        let count = 0;
        likedGrid.querySelectorAll('.policy-grid-item').forEach(item => {
            if(liked.includes(parseInt(item.dataset.id))) {
                item.style.display = 'flex';
                count++;
            } else {
                item.style.display = 'none';
            }
        });
        document.getElementById('noLikedItemsMessage').style.display = count === 0 ? 'block' : 'none';
    }

    // 4. 취향 분석 (index_03)
    const analysisChart = document.getElementById('genreAnalysisChart');
    if(analysisChart) {
        const liked = Storage.get('liked');
        if(liked.length === 0) {
            document.getElementById('noAnalysisDataMessage').style.display = 'block';
        } else {
            const counts = {};
            let total = 0;
            allPolicies.filter(p => liked.includes(p.id)).forEach(p => {
                counts[p.genre] = (counts[p.genre] || 0) + 1;
                total++;
            });
            
            // 가장 많이 본 장르 찾기
            let topGenre = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            analysisChart.innerHTML = `가장 선호하는 정책: <span style="color:#4facfe">${topGenre}</span>`;
            
            const list = document.getElementById('genreAnalysisList');
            for(let [genre, cnt] of Object.entries(counts)) {
                list.innerHTML += `<div><span>${genre}</span><span>${Math.round(cnt/total*100)}%</span></div>`;
            }
        }
    }
});
"""
    with open("static/script.js", "w", encoding="utf-8") as f:
        f.write(script_js)
    print("✅ 모든 파일 생성 완료!")

if __name__ == "__main__":
    generate_main_py()
    generate_templates_and_static_files()