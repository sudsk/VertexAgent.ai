# backend/app/services/storage_service.py
import os
import uuid
from google.cloud import storage
from typing import Dict, Optional, List, BinaryIO

class StorageService:
    """Service for interacting with Google Cloud Storage."""
    
    def __init__(self):
        self.client = storage.Client()
        self.bucket_name = os.getenv("GCS_BUCKET_NAME", "vertexagent-uploads")
        self.initialized = False
        
    def _ensure_bucket_exists(self):
        """Ensure the configured bucket exists, creating it if necessary."""
        if self.initialized:
            return
            
        try:
            # Check if bucket exists
            self.bucket = self.client.get_bucket(self.bucket_name)
        except Exception:
            # Create bucket if it doesn't exist
            self.bucket = self.client.create_bucket(self.bucket_name)
            
        self.initialized = True
            
    def upload_file(self, file_obj: BinaryIO, filename: str, content_type: Optional[str] = None, session_id: Optional[str] = None) -> Dict:
        """
        Upload a file to Google Cloud Storage.
        
        Args:
            file_obj: File-like object to upload
            filename: Original filename
            content_type: MIME type of the file
            session_id: Optional session ID to group files
            
        Returns:
            Dict with file metadata
        """
        self._ensure_bucket_exists()
        
        # Generate a unique ID for the file
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(filename)[1]
        
        # Use session_id in the path if provided
        if session_id:
            blob_name = f"{session_id}/{file_id}{file_extension}"
        else:
            blob_name = f"{file_id}{file_extension}"
            
        # Create a new blob and upload the file
        blob = self.bucket.blob(blob_name)
        blob.upload_from_file(file_obj, content_type=content_type, rewind=True)
        
        # Make the blob publicly readable (optional, may want to use signed URLs instead)
        # blob.make_public()
        
        # Get the size of the uploaded file
        file_obj.seek(0, os.SEEK_END)
        file_size = file_obj.tell()
        file_obj.seek(0)  # Reset file pointer
        
        # Return file metadata
        return {
            "file_id": file_id,
            "bucket_name": self.bucket_name,
            "blob_name": blob_name,
            "filename": filename,
            "content_type": content_type,
            "size": file_size,
            "public_url": blob.public_url if hasattr(blob, 'public_url') else None,
            "gs_uri": f"gs://{self.bucket_name}/{blob_name}"
        }
        
    def delete_session_files(self, session_id: str) -> List[str]:
        """
        Delete all files for a session.
        
        Args:
            session_id: Session ID to delete files for
            
        Returns:
            List of deleted blob names
        """
        self._ensure_bucket_exists()
        
        deleted_blobs = []
        blobs = list(self.bucket.list_blobs(prefix=f"{session_id}/"))
        
        if blobs:
            for blob in blobs:
                blob.delete()
                deleted_blobs.append(blob.name)
                
        return deleted_blobs
        
    def generate_signed_url(self, blob_name: str, expiration_minutes: int = 15) -> str:
        """
        Generate a signed URL for temporary access to a file.
        
        Args:
            blob_name: Name of the blob in storage
            expiration_minutes: How long the URL should be valid for
            
        Returns:
            Signed URL with temporary access
        """
        self._ensure_bucket_exists()
        
        blob = self.bucket.blob(blob_name)
        url = blob.generate_signed_url(
            version="v4",
            expiration=expiration_minutes * 60,  # Convert to seconds
            method="GET"
        )
        
        return url
