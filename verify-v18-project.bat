@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo BlogVerse V18 Full Project Verification
echo ============================================

echo.
echo [1/4] Backend dependencies...
cd backend
call npm install
if errorlevel 1 goto :error

echo.
echo [2/4] Prisma validation and generation...
call npx prisma validate
if errorlevel 1 goto :error
call npx prisma generate
if errorlevel 1 goto :error

echo.
echo [3/4] Backend JavaScript syntax...
for /r src %%F in (*.js) do (
  node --check "%%F"
  if errorlevel 1 goto :error
)
node --check prisma\seed.js
if errorlevel 1 goto :error

cd ..\frontend
echo.
echo [4/4] Frontend production build...
call npm install
if errorlevel 1 goto :error
call npm run ui:verify
if errorlevel 1 goto :error
call npm run build
if errorlevel 1 goto :error

cd ..
echo.
echo ALL BLOGVERSE V18 CHECKS PASSED.
pause
exit /b 0

:error
echo.
echo Verification failed. Review the error above.
pause
exit /b 1
