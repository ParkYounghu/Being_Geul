# services/db.py
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

def get_db_connection():
    """데이터베이스 연결을 생성합니다."""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "db_postgresql"),
            dbname=os.getenv("DB_NAME", "main_db"),
            user=os.getenv("DB_USER", "admin"),
            password=os.getenv("DB_PASSWORD", "admin123"),
            port=os.getenv("DB_PORT", "5432")
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"데이터베이스 연결 오류: {e}")
        return None

def init_db():
    """데이터베이스 테이블을 초기화합니다."""
    conn = get_db_connection()
    if conn is None:
        return
        
    try:
        with conn.cursor() as cur:
            # 기존 테이블 구조와 다르므로 충돌 방지를 위해 기존 테이블이 있다면 삭제하고 다시 만듭니다.
            # (주의: 기존 데이터가 있다면 날아갑니다!)
            # cur.execute("DROP TABLE IF EXISTS being_geul;") 
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS being_geul (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category TEXT,
                    deadline TEXT,
                    link TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            print("✅ 데이터베이스 테이블(being_geul)이 성공적으로 초기화되었습니다.")
    except Exception as e:
        print(f"테이블 생성 오류: {e}")
    finally:
        if conn:
            conn.close()

# --- 아래 함수들이 being.py에서 호출하는 함수 이름과 정확히 일치합니다 ---

def get_all_projects():
    """모든 프로젝트 목록을 가져옵니다."""
    conn = get_db_connection()
    if conn is None:
        return []

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM being_geul ORDER BY id DESC")
            projects = cur.fetchall()
            return projects
    except Exception as e:
        print(f"목록 조회 오류: {e}")
        return []
    finally:
        if conn:
            conn.close()

def create_project(title, description, category, deadline, link):
    """새 프로젝트를 저장합니다."""
    conn = get_db_connection()
    if conn is None:
        return

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO being_geul (title, description, category, deadline, link)
                VALUES (%s, %s, %s, %s, %s)
            """, (title, description, category, deadline, link))
            conn.commit()
    except Exception as e:
        print(f"생성 오류: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

def get_project_by_id(id):
    """ID로 프로젝트 상세 정보를 가져옵니다."""
    conn = get_db_connection()
    if conn is None:
        return None

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM being_geul WHERE id = %s", (id,))
            project = cur.fetchone()
            return project
    except Exception as e:
        print(f"상세 조회 오류: {e}")
        return None
    finally:
        if conn:
            conn.close()

def update_project(id, title, description, category, deadline, link):
    """프로젝트 정보를 수정합니다."""
    conn = get_db_connection()
    if conn is None:
        return

    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE being_geul 
                SET title = %s, description = %s, category = %s, deadline = %s, link = %s
                WHERE id = %s
            """, (title, description, category, deadline, link, id))
            conn.commit()
    except Exception as e:
        print(f"수정 오류: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

def delete_project(id):
    """프로젝트를 삭제합니다."""
    conn = get_db_connection()
    if conn is None:
        return

    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM being_geul WHERE id = %s", (id,))
            conn.commit()
    except Exception as e:
        print(f"삭제 오류: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    init_db()