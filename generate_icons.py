import os
from PIL import Image, ImageOps, ImageDraw

logo_path = r"D:\GOVLYX\govlyx-logo.png.jpeg"
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

    for folder, s in sizes.items():
        folder_path = os.path.join(res_path, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        launcher_size = s["launcher"]
        
        # 1. Generate ic_launcher.png (regular square)
        launcher_img = img.resize((launcher_size, launcher_size), resample_filter)
        launcher_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        
        # 2. Generate ic_launcher_round.png (with circular mask)
        mask = Image.new('L', (launcher_size, launcher_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, launcher_size - 1, launcher_size - 1), fill=255)
        
        round_img = Image.new('RGBA', (launcher_size, launcher_size), (0, 0, 0, 0))
        round_img.paste(launcher_img, (0, 0), mask=mask)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        
        # 3. Generate ic_launcher_foreground.png (with padding for adaptive icon)
        fg_size = s["foreground"]
        # Adaptive icon foreground safe zone is roughly 66% center
        logo_target_size = int(fg_size * 0.66)
        resized_logo = img.resize((logo_target_size, logo_target_size), resample_filter)
        
        # Paste resized logo into center of a transparent canvas
        fg_img = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        offset = (fg_size - logo_target_size) // 2
        fg_img.paste(resized_logo, (offset, offset))
        fg_img.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated icons for {folder}")

    print("Success: All launcher icons have been updated!")

if __name__ == "__main__":
    main()
