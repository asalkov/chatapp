# PowerShell deployment script for Chat App
# Run this from the project root: c:\Users\salko\chatapp

Write-Host "=== Building and Pushing Chat App Images to ECR ===" -ForegroundColor Cyan

# Backend
Write-Host "`n[1/6] Building backend..." -ForegroundColor Yellow
Set-Location backend
docker build -t chatapp-backend .

Write-Host "`n[2/6] Logging in to ECR..." -ForegroundColor Yellow
cmd /c "aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 270163127745.dkr.ecr.us-east-1.amazonaws.com"

Write-Host "`n[3/6] Tagging and pushing backend image..." -ForegroundColor Yellow
docker tag chatapp-backend:latest 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-backend:latest
docker push 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-backend:latest

# Frontend
Write-Host "`n[4/6] Building frontend..." -ForegroundColor Yellow
Set-Location ..\frontend
docker build -t chatapp-frontend .

Write-Host "`n[5/6] Tagging and pushing frontend image..." -ForegroundColor Yellow
docker tag chatapp-frontend:latest 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-frontend:latest
docker push 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-frontend:latest

Write-Host "`n[6/6] Deployment complete!" -ForegroundColor Green
Write-Host "Images have been pushed to ECR. You can now run 'terraform apply' to deploy." -ForegroundColor Green

# Return to root
Set-Location ..
