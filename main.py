from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv


from routes.auth import router as auth_router
from routes.programs import router as programs_router
from routes.admin import router as admin_router
from routes.notify import router as notify_router
from services.db import init_db
import os

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="정부지원사업 알림 웹사이트",
    description="정부지원사업을 정리하고 알림 기능을 제공하는 FastAPI 기반 웹사이트",
    version="1.0.0"
)

# Add session middleware
# Make sure to set a secure secret key in a real application
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "a_very_secret_key"))

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(programs_router, prefix="/programs", tags=["Programs"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(notify_router, prefix="/notify", tags=["Notifications"])


@app.on_event("startup")
def on_startup():
    """
    This function is called when the application starts.
    It initializes the database.
    """
    print("Application starting up...")
    try:
        init_db()
        print("Database initialization complete.")
    except Exception as e:
        print(f"FATAL: Database initialization failed: {e}")
        # In a real-world scenario, you might want to prevent the app from starting
        # or handle this more gracefully.
        
@app.get("/")
async def root():
    """
    Redirects the root URL to the programs list page.
    """
    return RedirectResponse(url="/programs")

# This is necessary for the .vscode/launch.json "Python: FastAPI" configuration
# to work correctly. It allows uvicorn to find the app object.
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
