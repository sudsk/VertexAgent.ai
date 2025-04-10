import os
import uuid
import shutil
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, UploadedFile

router = APIRouter()

# Configure upload directory
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/files/upload")
async def upload_file(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict:
    """Uploads one or more files and returns metadata about them."""
    try:
        if not session_id:
            session_id = str(uuid.uuid4())
            
        # Create session directory if it doesn't exist
        session_dir = os.path.join(UPLOAD_DIR, session_id)
        if not os.path.exists(session_dir):
            os.makedirs(session_dir)
            
        uploaded_files = []
        
        for file in files:
            # Generate a unique filename to avoid collisions
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{file_id}{file_extension}"
            file_path = os.path.join(session_dir, unique_filename)
            
            # Save file to disk
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
                
            # Store file metadata in database
            file_record = UploadedFile(
                id=file_id,
                session_id=session_id,
                original_filename=file.filename,
                stored_filename=unique_filename,
                file_path=file_path,
                file_type=file.content_type,
                file_size=os.path.getsize(file_path)
            )
            
            db.add(file_record)
            uploaded_files.append({
                "file_id": file_id,
                "filename": file.filename,
                "content_type": file.content_type,
                "size": os.path.getsize(file_path)
            })
            
        db.commit()
        
        return {
            "session_id": session_id,
            "files": uploaded_files
        }
        
    except Exception as e:
        # Clean up any partial uploads in case of error
        if 'session_dir' in locals() and os.path.exists(session_dir):
            shutil.rmtree(session_dir)
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
        
@router.get("/files/sessions/{session_id}")
async def get_session_files(
    session_id: str,
    db: Session = Depends(get_db)
) -> Dict:
    """Gets metadata for all files in a session."""
    try:
        files = db.query(UploadedFile).filter(UploadedFile.session_id == session_id).all()
        
        if not files:
            return {"session_id": session_id, "files": []}
            
        return {
            "session_id": session_id,
            "files": [
                {
                    "file_id": file.id,
                    "filename": file.original_filename,
                    "content_type": file.file_type,
                    "size": file.file_size
                }
                for file in files
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving session files: {str(e)}")

@router.delete("/files/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db)
) -> Dict:
    """Deletes all files associated with a session."""
    try:
        # Get all files for the session
        files = db.query(UploadedFile).filter(UploadedFile.session_id == session_id).all()
        
        if not files:
            return {"success": True, "message": "No files found for session"}
            
        # Delete files from disk
        session_dir = os.path.join(UPLOAD_DIR, session_id)
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
            
        # Delete records from database
        for file in files:
            db.delete(file)
            
        db.commit()
        
        return {"success": True, "message": f"Deleted {len(files)} files from session"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")
