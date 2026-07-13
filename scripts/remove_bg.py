import os
import sys

# 使用本地模型，不下载到C盘
os.environ["U2NET_HOME"] = r"E:\solo\models"
os.environ["MODEL_CHECKSUM_DISABLED"] = "1"

from rembg import remove
from PIL import Image

# 支持命令行传参，默认使用 luosifen/input.jpg
if len(sys.argv) > 1:
    input_path = sys.argv[1]
else:
    input_path = r"e:\solo\react-video-editor\my-video\public\luosifen\input.jpg"

# 输出路径：与输入同目录，扩展名改为 .png
output_path = os.path.splitext(input_path)[0] + "_cutout.png"

img = Image.open(input_path)
print(f"Loaded image: {img.size}")

output_img = remove(img)

output_img.save(output_path)
print(f"Saved result to: {output_path}")
print(f"Output size: {output_img.size}")