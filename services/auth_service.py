from passlib.context import CryptContext
from services.db import get_db_connection
from psycopg2.extras import RealDictCursor


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# -------------------------
# 비밀번호 유틸
# -------------------------
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# -------------------------
# DB 연결 기반 CRUD
# -------------------------
def get_user_by_email(email: str):
    """
    이메일로 사용자 조회
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM users WHERE email = %s",
                (email,)
            )
            return cur.fetchone()
    finally:
        conn.close()


def create_user(email: str, password: str, is_admin: bool = False):
    """
    새 사용자 생성
    """
    hashed_pw = get_password_hash(password)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, is_admin)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (email, hashed_pw, is_admin)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        print(f"Error creating user: {e}")
        return None
    finally:
        conn.close()


def get_user_count():
    """
    사용자 수 조회
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(id) FROM users")
            return cur.fetchone()[0]
    finally:
        conn.close()
