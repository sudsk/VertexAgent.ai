# File Upload Feature for VertexAgent.ai

This document provides an overview and setup instructions for the file upload feature in VertexAgent.ai, which allows users to upload files and have the AI agent analyze and answer questions about them.

## Overview

The file upload feature enhances VertexAgent.ai by allowing users to:

- Upload files (diagrams, code, text, images, etc.) directly in the agent playground
- Ask the AI agent questions about the uploaded files
- Generate content based on the file contents (e.g., create Terraform from architecture diagrams)

Files are securely stored in Google Cloud Storage, and their contents are processed and provided as context to the AI agent.

## Architecture

1. **Frontend**:
   - New `FileUpload` component for the UI
   - Integration with the agent playground
   - File metadata tracking

2. **Backend**:
   - File upload API endpoints
   - GCS integration for secure storage
   - File content processing

3. **Agent Integration**:
   - File content processing
   - Context building for agent prompts

## Setup Instructions

### 1. Google Cloud Storage Setup

1. Create a GCS bucket in your Google Cloud project:
   ```bash
   gsutil mb -l us-central1 gs://vertexagent-uploads
   ```

2. Make sure your service account has storage admin access:
   ```bash
   gcloud projects add-iam-policy-binding YOUR-PROJECT-ID \
     --member=serviceAccount:YOUR-SERVICE-ACCOUNT@YOUR-PROJECT-ID.iam.gserviceaccount.com \
     --role=roles/storage.admin
   ```

### 2. Environment Configuration

1. Add the following variables to your `.env` file:
   ```
   # Google Cloud Storage Configuration
   GCS_BUCKET_NAME=vertexagent-uploads
   GCS_PROJECT_ID=your-project-id
   GCS_BUCKET_LOCATION=us-central1
   GCS_SIGNED_URL_EXPIRATION_MINUTES=15

   # File Upload Configuration
   MAX_FILE_SIZE_MB=20
   ALLOWED_FILE_TYPES=image/*,text/*,application/pdf,application/json,application/xml
   ```

### 3. Install Dependencies

1. Install required Python packages:
   ```bash
   pip install google-cloud-storage python-multipart requests
   ```

## Usage

1. Navigate to the agent playground
2. Click the file upload button (paperclip icon)
3. Upload one or more files
4. Ask questions that refer to the uploaded files

## File Type Support

The system currently supports the following file types:

| File Type | Support Level | Notes |
|-----------|---------------|-------|
| Text files (.txt, .md) | Full | Complete text extraction |
| JSON files (.json) | Full | Complete text extraction |
| XML/SVG files (.xml, .svg) | Full | Complete text extraction |
| CSV files (.csv) | Full | Treated as text |
| PDF files (.pdf) | Basic | File acknowledged, no content extraction |
| Images (.jpg, .png, etc.) | Basic | File acknowledged, no content extraction |

## Security Considerations

- Files are stored in your own GCS bucket, maintaining data sovereignty
- Signed URLs are used for temporary access
- File cleanup job removes files after 24 hours
- All file access is logged for audit purposes

## Limitations

- Maximum file size is configurable (default 20MB)
- Long text files may be truncated in the agent context to avoid token limits
- Binary files like PDFs and images are acknowledged but their content is not directly processed

## Future Enhancements

- PDF text extraction
- Image analysis with Vertex AI Vision
- CSV/spreadsheet parsing
- Enhanced file visualization in the UI
