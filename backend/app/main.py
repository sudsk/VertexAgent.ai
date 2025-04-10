import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from app.api import agents, files

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="VertexAgent.ai API",
    description="Backend API for managing Vertex AI Agent Engine",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(files.router, prefix="/api", tags=["files"])

# Mount static files directory for uploaded files (if needed)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Health check endpoint
@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "vertexagent-ai-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", "5000")), 
        reload=True
    )
