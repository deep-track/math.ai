import base64
from fastapi import UploadFile, HTTPException
from typing import Dict, Optional

"""
    Process uploaded image and convert to format for Claude API.
    
    Args:
        file: FastAPI UploadFile object
        
    Returns:
        Dictionary with 'type' and 'image' (base64), or None if invalid
    """

async def process_uploaded_image(file: UploadFile) -> Dict[str, str]:

    allowed_types = {
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
    }

    # Read file bytes first (needed to sniff when MIME type is missing or generic)
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    def sniff_mime(data: bytes) -> Optional[str]:
        if data.startswith(b"\xFF\xD8\xFF"):
            return 'image/jpeg'
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return 'image/png'
        if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
            return 'image/gif'
        if data.startswith(b"RIFF") and b"WEBP" in data[8:16]:
            return 'image/webp'
        if b"ftypavif" in data[:64] or b"ftypavis" in data[:64]:
            return 'image/avif'
        return None

    # mime type from client
    mime_type = (file.content_type or '').strip().lower()
    if mime_type not in allowed_types:
        sniffed = sniff_mime(image_bytes)
        if sniffed and sniffed in allowed_types:
            mime_type = sniffed
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Only JPEG, JPG, PNG, GIF, WebP, AVIF images are allowed. Got: {mime_type or 'unknown'}",
            )

    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    return {
        'type': mime_type,
        'image': base64_image
    }