from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent / 'webos-app'
for name, size in [('icon.png', 80), ('largeIcon.png', 130)]:
    image = Image.new('RGB', (size, size), '#101923')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((3, 3, size - 4, size - 4), radius=size // 5, outline='#bff5df', width=3)
    draw.line([(size * .23, size * .26), (size * .5, size * .75), (size * .77, size * .26)], fill='#bff5df', width=max(5, size // 10))
    image.save(root / name)
