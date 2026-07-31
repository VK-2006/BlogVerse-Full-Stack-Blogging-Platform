@echo off
setlocal

echo ============================================
echo        BlogVerse Project Setup
echo ============================================
echo.

if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
  echo Created backend\.env from example.
  echo IMPORTANT: Update DATABASE_URL before migration.
)

echo.
echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 goto :error

echo.
echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 goto :error

cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 goto :error

cd ..

echo.
echo ============================================
echo Setup complete.
echo.
echo Next:
echo 1. Update backend\.env DATABASE_URL
echo 2. Run: cd backend
echo 3. Run: npx prisma migrate dev --name init
echo 4. Run: npm run seed
echo 5. Run: npm run dev
echo 6. In another terminal: cd frontend ^&^& npm run dev
echo ============================================
pause
exit /b 0

:error
echo.
echo Setup failed. Check the error above.
pause
exit /b 1
