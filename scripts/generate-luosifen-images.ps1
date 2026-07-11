$ErrorActionPreference = "Stop"
chcp 65001 | Out-Null

$outputDir = "e:\solo\react-video-editor\my-video\public\luosifen"
if (!(Test-Path $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$script = "C:\Users\wkf\.agents\skills\agnes-ai-generation\scripts\agnes_api.py"
$python = "E:\anconda\python.exe"

# (id, size, prompt, chineseFilename)
$images = @(
  @{
    id = 1
    size = "1920x1080"
    prompt = "A beautiful northern Chinese winter landscape with snow-capped mountains in the background, a traditional gray-brick courtyard house with red lanterns in the foreground, soft golden hour sunset light, atmospheric haze, cinematic photography, 4K, ultra detailed"
    name = "北方背景.png"
  }
  @{
    id = 2
    size = "1024x1024"
    prompt = "A steaming hot bowl of authentic Chinese Liuzhou snail rice noodles (luosifen) with rich amber spicy broth, visible rice noodles, golden fried peanuts, crispy fried tofu skin strips, tender bamboo shoot strips, bright red chili oil droplets, chopped green scallions, served in a white ceramic bowl on a dark wooden table, overhead view, professional food photography, soft natural lighting, 4K, ultra detailed"
    name = "螺蛳粉碗.png"
  }
  @{
    id = 3
    size = "1024x1024"
    prompt = "A plate of dry mixed Chinese Liuzhou snail rice noodles (ganlao luosifen) tossed with bright red chili oil, glossy rice noodles, golden fried peanuts, crispy fried tofu skin, tender bamboo shoots, pickled long beans, chopped scallions, served on a white round plate, side view, professional food photography, 4K, ultra detailed"
    name = "干捞螺蛳粉.png"
  }
  @{
    id = 4
    size = "1024x1024"
    prompt = "A bowl of Chinese Liuzhou snail rice noodles in rich milky white bone broth (gutang luosifen), visible rice noodles, golden fried peanuts, crispy fried tofu skin, tender bamboo shoots, chopped green scallions, served in a traditional Chinese ceramic bowl with blue pattern, warm lighting, professional food photography, 4K, ultra detailed"
    name = "骨汤螺蛳粉.png"
  }
  @{
    id = 5
    size = "1024x1024"
    prompt = "A premium bowl of Chinese Liuzhou snail rice noodles with special deer antler mushrooms (lurongjun), rich amber broth, visible rice noodles, golden fried peanuts, crispy fried tofu skin, sliced deer antler mushrooms with distinctive coral-like shape, chopped scallions, served in an elegant ceramic bowl, professional food photography, warm lighting, 4K, ultra detailed"
    name = "鹿茸菌螺蛳粉.png"
  }
  @{
    id = 6
    size = "1024x1024"
    prompt = "A bowl of Chinese Liuzhou snail rice noodles with thick creamy sesame paste sauce (majiang luosifen), glossy rice noodles coated in beige sesame sauce, golden fried peanuts, crispy fried tofu skin, bamboo shoots, chopped scallions, served in a ceramic bowl, professional food photography, warm lighting, 4K, ultra detailed"
    name = "麻酱螺蛳粉.png"
  }
)

foreach ($img in $images) {
  Write-Host "[$($img.id)/6] $($img.name) - generating..." -ForegroundColor Cyan
  $json = & $python $script image --prompt $img.prompt --size $img.size 2>&1 | Out-String
  $obj = $json | ConvertFrom-Json
  if ($obj.urls -and $obj.urls.Length -gt 0) {
    $url = $obj.urls[0]
    $tmp = Join-Path $outputDir ("tmp_$($img.id).png")
    Write-Host "  downloading $url"
    try {
      Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
      $finalPath = Join-Path $outputDir $img.name
      if (Test-Path $finalPath) { Remove-Item $finalPath -Force }
      # 用 .NET 重命名以支持中文文件名
      [System.IO.File]::Move($tmp, $finalPath)
      Write-Host "  -> saved $($img.name) ($((Get-Item $finalPath).Length) bytes)" -ForegroundColor Green
    } catch {
      Write-Host "  !! download failed: $_" -ForegroundColor Red
    }
  } else {
    Write-Host "  !! no URL in response" -ForegroundColor Red
    Write-Host $json
  }
}

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
Get-ChildItem $outputDir | Select-Object Name, Length | Format-Table -AutoSize
