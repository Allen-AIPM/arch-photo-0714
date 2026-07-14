@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动建筑师灵感库 React 预览...
echo.
if not exist node_modules (
  echo 第一次启动需要安装依赖，请稍等...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo 依赖安装失败，请检查 Node.js 是否可用。
    pause
    exit /b 1
  )
)
echo.
echo 启动后请访问 http://localhost:5173/
echo 按 Ctrl+C 可以停止预览。
echo.
start "" "http://localhost:5173/"
call npm.cmd run dev
pause
