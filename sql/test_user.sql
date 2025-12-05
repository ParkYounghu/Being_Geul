-- PostgreSQL 전용 문법입니다.

-- 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,            -- INTEGER AUTOINCREMENT 대신 SERIAL 사용
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

