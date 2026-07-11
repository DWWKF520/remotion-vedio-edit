#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rename tmp_*.png to Chinese filenames."""
import os
import shutil

output_dir = r"e:\solo\react-video-editor\my-video\public\luosifen"

mapping = {
    1: "北方背景.png",
    2: "螺蛳粉碗.png",
    3: "干捞螺蛳粉.png",
    4: "骨汤螺蛳粉.png",
    5: "鹿茸菌螺蛳粉.png",
    6: "麻酱螺蛳粉.png",
}

for idx, name in mapping.items():
    src = os.path.join(output_dir, f"tmp_{idx}.png")
    dst = os.path.join(output_dir, name)
    if not os.path.exists(src):
        print(f"!! {src} not found")
        continue
    if os.path.exists(dst):
        os.remove(dst)
    shutil.move(src, dst)
    print(f"  -> {name} ({os.path.getsize(dst)} bytes)")

print("DONE")
