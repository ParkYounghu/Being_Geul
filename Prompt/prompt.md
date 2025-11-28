```
(1.png 이미지를 보여주며)
지금 이상태로 DB까지 불러왔는데 두번째 이미지처럼 table의 column이 너무 지저분해
내가 원하는건 기간 / 공고 제목 / link만 원하는데 어떻게 워크플로우를 짜야 깔끔하게 나올까?
```


###  [n8n Gemini 노드 prompt]

```

{{ $json.text }}

해당 내용을 모두 요약해줘. 너의 설명은 절대 적지말고 50자 내로 요약해하면서 청년층들의 어그로를 끌 수 있게 해줘. 그리고 , 표시를 지워서 작성해줘 DB에서 특정 항목에만 들어가고 다른 항목에 들어가지 않도록

```

### [gemini Prompt, 외부에서 받은 파일 main.py 연결]

```

내가 지금 Visual studio code에 다른 사람에게 받은 html 파일과 거기에 디자인으로 들어갈 js파일,css 그냥 같은 폴더에 구분없이 넣어놨어. 이걸 main.py 을 이용해서 연결하고 구축하고 싶은데 gemini CLI 에 어떻게 프롬프트를 써야 좋을지 json 형식으로 프롬프트를 작성해줘
파이썬 버전은 3.12.12 고 각 파일의 이름을 밑에 적어줄게 프로젝트에서 그 어떤 폴더도 들어가있지 않은 상태야. 각 html 파일을 보고 CLI 가 알아서 잘 딱 깔끔하게 센스있게 분석하고 구현이 되었으면 해 

[html]
index_01.html / index_02.html / index_03.html / index_04.html

[js]
script.js

[css]
style.css

```

### 결과물

```

{
  "role": "Senior Python Backend Developer",
  "task": "Refactor a flat directory of HTML/CSS/JS files into a structured FastAPI project.",
  "environment": {
    "python_version": "3.12.12",
    "frameworks": ["FastAPI", "Uvicorn", "Jinja2Templates"]
  },
  "project_context": {
    "current_status": "Flat directory. All files (html, js, css) are in the root.",
    "files": {
      "html": ["index_01.html", "index_02.html", "index_03.html", "index_04.html"],
      "js": ["script.js"],
      "css": ["style.css"]
    }
  },
  "requirements": [
    "1. Automation Script (setup.py): Write a Python script using the 'os' and 'shutil' modules to automatically create 'templates' and 'static' directories and move the files into them (HTML -> templates, CSS/JS -> static).",
    "2. FastAPI App (main.py): Create the main application file using FastAPI and Jinja2Templates.",
    "3. Routing: Map 'index_01.html' to root ('/'). Create generic routes for the other HTML files.",
    "4. Template Logic: Explain how to update the <link> and <script> tags in the HTML files to point to the new '/static/' path (e.g., href='/static/style.css').",
    "5. No Bootstrap: Do not include Bootstrap; rely only on the provided custom 'style.css' and 'script.js'."
  ],
  "output_style": "Code-focused, providing the 'setup.py' first for organization, then 'main.py'.",
  "output_language": "Korean"
}

```

#### [gemini Prompt, DB being_geul 연결 prompt]

```

gemini CLI 에 쓸 프롬프트를 json 형식으로 만들어줘

postgresql_db 에 being_geul 이라는 table에 있는 데이터를 써서 기존에 있던 웹페이지의 내용을 바꾸고 싶어 (index_01~04.html) , (style.css) (script.js) 이렇게 파일이 있는 상태고 being_geul 에는 기본으로 있는 id, 그리고 title / summary / period / link 항목이 있어 해당하는 title에 따라 썸네일(이미지)를 만들어주는데, 인물같은 이미지가 아닌 그냥 검은바탕에 흰색 텍스트로 title,summary,period 내용이 나오고 클릭하면 link 에 적혀있는 웹페이지로 넘어가게 하고 싶어

파이썬 버전 3.12.12 / fastapi 와 jinja2template 쓰고, 알아서 파일정리 및 수정했으면 좋겠어

```

#### [gemini CLI prompt]

```

{
  "role": "Senior Full Stack Python Developer",
  "task": "Refactor existing flat HTML/CSS/JS files into a structured FastAPI application connected to a PostgreSQL database, implementing dynamic content rendering.",
  "environment": {
    "python_version": "3.12.12",
    "frameworks": ["FastAPI", "Uvicorn", "Jinja2Templates", "SQLAlchemy"],
    "database": "PostgreSQL (Driver: psycopg2-binary)"
  },
  "project_context": {
    "current_files": {
      "html": ["index_01.html", "index_02.html", "index_03.html", "index_04.html"],
      "css": ["style.css"],
      "js": ["script.js"]
    },
    "database_schema": {
      "table_name": "being_geul",
      "columns": [
        "id (Integer, Primary Key)",
        "title (String)",
        "summary (String)",
        "period (String)",
        "link (String, External URL)"
      ]
    }
  },
  "requirements": [
    "1. File Organization (setup.py): Create a script to move HTML files to 'templates/' and CSS/JS files to 'static/'. Update HTML references to use '/static/' path.",
    "2. Database Model (main.py): Define the SQLAlchemy model for the 'being_geul' table containing the specified columns.",
    "3. Backend Logic (main.py): Create a FastAPI app that queries all records from 'being_geul' and passes them to the templates.",
    "4. Dynamic Rendering (Jinja2): Modify 'index_01.html' (and others if needed) to replace static content with a loop iterating over the database records.",
    "5. UI/Design Specification (Important):",
    "   - Instead of image thumbnails, create 'Text Cards' using CSS.",
    "   - Style: Background color #000000 (Black), Text color #FFFFFF (White).",
    "   - Content: Display 'title', 'summary', and 'period' inside the card.",
    "   - Interaction: The entire card must be clickable. When clicked, it should navigate to the URL specified in the 'link' column."
  ],
  "deliverables": [
    "setup.py (For reorganizing files)",
    "main.py (Complete FastAPI server code)",
    "Updated HTML snippet (Jinja2 loop structure)",
    "Updated CSS snippet (For the black text-card styling)"
  ],
  "output_language": "Korean"
}

```

### [n8n 두번째 gemini prompt]

```

{{ $('Code in JavaScript').item.json.text }}

위 내용은 정부 지원 사업에 관련한 내용이야. 사람들의 선호도를 구분할 수 있는 카테고리나 장르를 하나만 정해줘. 너의 설명은 빼고 한 단어로 정의해줘.

```