from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routes.auth_routes import router as auth_router
from app.routes.student_routes import router as student_router

app = FastAPI(title="Student Portal Backend")

# Ensure the static directories exist on startup
os.makedirs("static/avatars", exist_ok=True)

# Allowed Origins for CORS
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://student-portal-capstone-2qp4.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Updated to include localhost:5174
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(student_router, prefix="/api/student", tags=["Student"])


@app.get("/")
async def root():
    return {"message": "Student Portal Backend Running"}