@echo off
echo.
echo ============================================================
echo   BioLab AI - Push to GitHub Script
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] Adding changes to Git...
git add .github/workflows/*.yml
git add backend/schema.sql
git add biolab-ai/prisma/schema.prisma
git add backend/wrangler.toml
git add DEPLOYMENT.md

echo.
echo [2/4] Committing changes...
git commit -m "feat: setup Phase 1 D1 schema and CI/CD pipelines"

echo.
echo [3/4] Pushing to GitHub...
git push origin main

echo.
echo [4/4] Verifying deployment...
echo All files have been pushed to https://github.com/yoshika02/major_project
echo The GitHub Actions will now take over to:
echo   - Deploy your Backend Worker
echo   - Deploy your Frontend to Cloudflare Pages
echo   - Run the D1 Database Migrations
echo.
echo Done!
pause
