import os
import requests
from typing import List, Tuple
from moviepy.editor import (
    ImageClip, TextClip, CompositeVideoClip, 
    concatenate_videoclips, AudioFileClip
)
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def download_image(url: str, save_path: str) -> str:
    """Download image from URL"""
    response = requests.get(url)
    with open(save_path, 'wb') as f:
        f.write(response.content)
    return save_path

def create_text_overlay(
    text: str, 
    size: Tuple[int, int] = (1080, 1920),
    fontsize: int = 60,
    color: str = 'white',
    bg_color: str = 'black',
    position: str = 'center'
) -> np.ndarray:
    """Create a text overlay image"""
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Try to use a nice font, fallback to default
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontsize)
    except:
        font = ImageFont.load_default()
    
    # Word wrap text
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        current_line.append(word)
        test_line = ' '.join(current_line)
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] > size[0] - 100:  # 50px padding on each side
            current_line.pop()
            lines.append(' '.join(current_line))
            current_line = [word]
    
    if current_line:
        lines.append(' '.join(current_line))
    
    # Calculate total text height
    line_height = fontsize + 10
    total_height = len(lines) * line_height
    
    # Starting Y position
    if position == 'top':
        y = 100
    elif position == 'bottom':
        y = size[1] - total_height - 100
    else:  # center
        y = (size[1] - total_height) // 2
    
    # Draw each line
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = (size[0] - text_width) // 2
        
        # Draw background rectangle
        padding = 20
        draw.rectangle(
            [x - padding, y - padding, x + text_width + padding, y + fontsize + padding],
            fill=bg_color
        )
        
        # Draw text
        draw.text((x, y), line, font=font, fill=color)
        y += line_height
    
    return np.array(img)

def create_reel_video(
    content_id: str,
    hook: str,
    script: str,
    image_urls: List[str],
    output_dir: str,
    target_duration: int = 30,
    background_music: str = None
) -> Tuple[str, str, int]:
    """
    Create an Instagram Reel video
    
    Returns:
        Tuple of (video_path, thumbnail_path, duration_seconds)
    """
    
    # Download images
    image_paths = []
    for i, url in enumerate(image_urls):
        img_path = os.path.join(output_dir, f"image_{i}.jpg")
        download_image(url, img_path)
        image_paths.append(img_path)
    
    # Video dimensions (Instagram Reels: 1080x1920, 9:16 aspect ratio)
    size = (1080, 1920)
    
    clips = []
    
    # Hook section (first 3 seconds)
    if image_paths:
        hook_clip = ImageClip(image_paths[0]).set_duration(3)
        hook_clip = hook_clip.resize(size)
        
        # Add hook text overlay
        hook_text = create_text_overlay(hook, size=size, fontsize=70, position='center')
        hook_text_clip = ImageClip(hook_text).set_duration(3).set_position('center')
        
        hook_composite = CompositeVideoClip([hook_clip, hook_text_clip])
        clips.append(hook_composite)
    
    # Script sections (remaining time)
    remaining_duration = target_duration - 3
    script_parts = script.split('\n\n')  # Split by paragraphs
    
    if len(script_parts) > 0 and len(image_paths) > 1:
        duration_per_part = remaining_duration / len(script_parts)
        
        for i, part in enumerate(script_parts):
            if not part.strip():
                continue
                
            # Use different images or cycle through them
            img_index = (i + 1) % len(image_paths)
            
            img_clip = ImageClip(image_paths[img_index]).set_duration(duration_per_part)
            img_clip = img_clip.resize(size)
            
            # Add text overlay
            text_overlay = create_text_overlay(
                part.strip(), 
                size=size, 
                fontsize=50, 
                position='bottom'
            )
            text_clip = ImageClip(text_overlay).set_duration(duration_per_part).set_position('center')
            
            composite = CompositeVideoClip([img_clip, text_clip])
            clips.append(composite)
    
    # Concatenate all clips
    final_video = concatenate_videoclips(clips, method="compose")
    
    # Add background music if provided
    if background_music and os.path.exists(background_music):
        audio = AudioFileClip(background_music)
        audio = audio.subclip(0, min(audio.duration, final_video.duration))
        final_video = final_video.set_audio(audio)
    
    # Export video
    video_path = os.path.join(output_dir, "reel.mp4")
    final_video.write_videofile(
        video_path,
        fps=30,
        codec='libx264',
        audio_codec='aac',
        temp_audiofile='temp-audio.m4a',
        remove_temp=True,
        preset='medium'
    )
    
    # Generate thumbnail (first frame)
    thumbnail_path = os.path.join(output_dir, "thumbnail.jpg")
    final_video.save_frame(thumbnail_path, t=0)
    
    duration = int(final_video.duration)
    
    # Clean up
    final_video.close()
    
    return video_path, thumbnail_path, duration
