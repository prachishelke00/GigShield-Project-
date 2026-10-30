@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd"
cd /d C:\Users\Dell\Desktop\GigSheild
echo ==============================================
echo   Pushing GigShield to GitHub...
echo ==============================================
git push -u origin main
pause

