import base64
from fastapi import UploadFile, HTTPException
from typing import Dict

"""
    Process uploaded image and convert to format for Claude API.
    
    Args:
        file: FastAPI UploadFile object
        
    Returns:
        Dictionary with 'type' and 'image' (base64), or None if invalid
    """

async def process_uploaded_image(file:UploadFile) -> Dict[str,str]:

    ALLOWED_TYPES = ['image/jpeg','image/jpg', 'image/png']
    
    # mime type
    mime_type = file.content_type
    
    # Validate type
    if mime_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Only JPEG, JPG, PNG images are allowed. Got: {mime_type}"
        )
    
    # Read file bytes and encode to base64
    image_bytes = await file.read()
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    return {
        'type': mime_type,
        'image': base64_image
    }