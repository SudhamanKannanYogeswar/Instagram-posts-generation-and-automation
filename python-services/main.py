from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from video_generator import create_reel_video

app = FastAPI(title="Instagram Reels Video Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    content_id: str
    hook: str
    script: str
    image_urls: List[str]
    duration: Optional[int] = 30
    background_music: Optional[str] = None

class VideoResponse(BaseModel):
    success: bool
    video_url: str
    thumbnail_url: str
    duration: int

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Instagram Reels Video Generator"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/generate-video", response_model=VideoResponse)
async def generate_video(request: VideoRequest):
    """
    Generate a Reel video from content and images
    """
    try:
        # Create output directory
        output_dir = f"output/{request.content_id}"
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate video
        video_path, thumbnail_path, duration = create_reel_video(
            content_id=request.content_id,
            hook=request.hook,
            script=request.script,
            image_urls=request.image_urls,
            output_dir=output_dir,
            target_duration=request.duration,
            background_music=request.background_music
        )
        
        return VideoResponse(
            success=True,
            video_url=video_path,
            thumbnail_url=thumbnail_path,
            duration=duration
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
