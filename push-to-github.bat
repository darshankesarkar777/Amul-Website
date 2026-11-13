@echo off
echo ====================================================
echo Pushing Amul Kool Koko Project to GitHub...
echo Repository: https://github.com/darshankesarkar777/Amul-Website.git
echo ====================================================
echo.

"C:\Users\darsh\AppData\Local\Programs\MinGit\cmd\git.exe" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================
    echo SUCCESS! Repository successfully pushed to GitHub.
    echo You can now deploy it on Vercel at: https://vercel.com/new
    echo ====================================================
) else (
    echo.
    echo Push encountered an authentication request.
    echo Please make sure you are signed into GitHub.
)
pause
