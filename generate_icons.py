import os
from PIL import Image, ImageOps, ImageDraw

logo_path = r"d:\GOVLYX\govlyx-logo.png"
res_path = r"D:\GOVLYX\Govlyx\Govlyx\android\app\src\main\res"

sizes = {
    "mipmap-mdpi": {"launcher": 48, "foreground": 108},
    "mipmap-hdpi": {"launcher": 72, "foreground": 162},
    "mipmap-xhdpi": {"launcher": 96, "foreground": 216},
    "mipmap-xxhdpi": {"launcher": 144, "foreground": 324},
    "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432}
}

try:
    resample_filter = Image.Resampling.LANCZOS
except AttributeError:
    try:
        resample_filter = Image.LANCZOS
    except AttributeError:
        resample_filter = Image.ANTIALIAS

def main():
    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        return

    img = Image.open(logo_path)

    # Ensure in RGBA
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Create legacy_img with shrunk inner blue circle for legacy launcher icons
    legacy_img = img.copy()
    w, h = img.size
    left, top, right, bottom = int(w * 0.141), int(h * 0.141), int(w * 0.859), int(h * 0.859)
    blue_circle = img.crop((left, top, right, bottom))
    bg_color = img.getpixel((w // 2, 20))
    
    # Fill old blue circle with background color
    draw = ImageDraw.Draw(legacy_img)
    draw.ellipse((left - 2, top - 2, right + 2, bottom + 2), fill=bg_color)
    
    # Shrink the blue circle to 70% of its original size
    scale_factor = 0.70
    new_w = int((right - left) * scale_factor)
    new_h = int((bottom - top) * scale_factor)
    
    # Create circular mask for clean edges
    circle_mask = Image.new('L', (blue_circle.width, blue_circle.height), 0)
    mask_draw = ImageDraw.Draw(circle_mask)
    mask_draw.ellipse((0, 0, blue_circle.width - 1, blue_circle.height - 1), fill=255)
    
    clean_blue = Image.new('RGBA', blue_circle.size, (0, 0, 0, 0))
    clean_blue.paste(blue_circle, (0, 0), mask=circle_mask)
    
    smaller_blue = clean_blue.resize((new_w, new_h), resample_filter)
    smaller_mask = circle_mask.resize((new_w, new_h), resample_filter)
    
    paste_x = left + ((right - left) - new_w) // 2
    paste_y = top + ((bottom - top) - new_h) // 2
    legacy_img.paste(smaller_blue, (paste_x, paste_y), mask=smaller_mask)

    for folder, s in sizes.items():
        folder_path = os.path.join(res_path, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        launcher_size = s["launcher"]
        
        # 1. Generate ic_launcher.png (regular square)
        launcher_img = legacy_img.resize((launcher_size, launcher_size), resample_filter)
        launcher_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        
        # 2. Generate ic_launcher_round.png (with circular mask)
        mask = Image.new('L', (launcher_size, launcher_size), 0)
        draw_round = ImageDraw.Draw(mask)
        draw_round.ellipse((0, 0, launcher_size - 1, launcher_size - 1), fill=255)
        
        round_img = Image.new('RGBA', (launcher_size, launcher_size), (0, 0, 0, 0))
        round_img.paste(launcher_img, (0, 0), mask=mask)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        
        # 3. Generate ic_launcher_foreground.png (with padding for adaptive icon)
        fg_size = s["foreground"]
        # Crop the blue circle from the original squircle logo proportionally
        blue_circle_src = img.crop((left, top, right, bottom))
        
        # Adaptive icon foreground target size reduced to 46% for better padding
        logo_target_size = int(fg_size * 0.46)
        resized_blue_circle = blue_circle_src.resize((logo_target_size, logo_target_size), resample_filter)
        
        # Paste resized blue circle into center of a transparent canvas
        fg_img = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        offset = (fg_size - logo_target_size) // 2
        fg_img.paste(resized_blue_circle, (offset, offset))
        fg_img.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated icons for {folder}")

    print("Success: All launcher icons have been updated!")

if __name__ == "__main__":
    main()
