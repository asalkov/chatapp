resource "aws_ecr_repository" "backend" {
  name = "chatapp-backend"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Project = "ChatApp"
  }
}

resource "aws_ecr_repository" "frontend" {
  name = "chatapp-frontend"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Project = "ChatApp"
  }
}
