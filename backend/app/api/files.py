import os
import uuid
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, UploadedFile
from app.services.storage_service import StorageService

router = APIRouter()

# Initialize GCS storage service
storage_service = StorageService()

@router.post("/files/upload")
async def upload_file(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict:
    """Uploads one or more files to Google Cloud Storage and returns metadata."""
    try:
        if not session_id:
            session_id = str(uuid.uuid4())
            
        uploaded_files = []
        
        for file in files:
            # Upload file to GCS
            file_metadata = storage_service.upload_file(
                file_obj=file.file,
                filename=file.filename,
                content_type=file.content_type,
                session_id=session_id
            )
            
            # Store file metadata in database
            file_record = UploadedFile(
                id=file_metadata["file_id"],
                session_id=session_id,
                original_filename=file.filename,
                stored_filename=file_metadata["blob_name"],
                file_path=file_metadata["gs_uri"],
                file_type=file.content_type,
                file_size=file_metadata["size"]
            )
            
            db.add(file_record)
            
            # Generate temporary signed URL for accessing the file
            signed_url = storage_service.generate_signed_url(file_metadata["blob_name"])
            
            uploaded_files.append({
                "file_id": file_metadata["file_id"],
                "filename": file.filename,
                "content_type": file.content_type,
                "size": file_metadata["size"],
                "url": signed_url,
                "gs_uri": file_metadata["gs_uri"]
            })
            
        db.commit()
        
        return {
            "session_id": session_id,
            "files": uploaded_files
        }
        
    except Exception as e:
        # Clean up any partial uploads in case of error
        if 'session_id' in locals():
            try:
                storage_service.delete_session_files(session_id)
            except Exception as cleanup_error:
                print(f"Error cleaning up session files: {str(cleanup_error)}")
                
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
            
        result_files = []
        for file in files:
            # Generate fresh signed URLs for each file
            signed_url = storage_service.generate_signed_url(file.stored_filename)
            
            result_files.append({
                "file_id": file.id,
                "filename": file.original_filename,
                "content_type": file.file_type,
                "size": file.file_size,
                "url": signed_url,
                "gs_uri": file.file_path
            })
            
        return {
            "session_id": session_id,
            "files": result_files
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
            
        # Delete files from GCS
        deleted_blobs = storage_service.delete_session_files(session_id)
            
        # Delete records from database
        for file in files:
            db.delete(file)
            
        db.commit()
        
        return {"success": True, "message": f"Deleted {len(deleted_blobs)} files from session"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@router.get("/files/{file_id}/url")
async def get_file_url(
    file_id: str,
    db: Session = Depends(get_db)
) -> Dict:
    """Gets a temporary signed URL for accessing a file."""
    try:
        file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
            
        # Generate a fresh signed URL
        signed_url = storage_service.generate_signed_url(file.stored_filename)
        
        return {
            "file_id": file.id,
            "filename": file.original_filename,
            "url": signed_url,
            "expires_in": "15 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating file URL: {str(e)}")
