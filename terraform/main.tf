terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_vpc" "default" {
  default = true
}

# Security Group
resource "aws_security_group" "chat_sg" {
  name        = "chat_app_sg"
  description = "Allow SSH, HTTP, and App ports"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# SSH Key Pair
resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "kp" {
  key_name   = "chat_app_key"
  public_key = tls_private_key.pk.public_key_openssh
}

resource "local_file" "ssh_key" {
  filename = "${path.module}/chat_app_key.pem"
  content  = tls_private_key.pk.private_key_pem
  file_permission = "0400"
}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.kp.key_name
  vpc_security_group_ids = [aws_security_group.chat_sg.id]
  associate_public_ip_address = true
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name = "ChatAppServer"
  }

  # ----- USER DATA -----
  user_data = file("${path.module}/user_data.sh")
  user_data_replace_on_change = true

  # Keep the file provisioners that copy your docker-compose.yml
  provisioner "file" {
    source      = "../docker-compose.yml"
    destination = "/home/ec2-user/app/docker-compose.yml"
  }

  # (Optional) keep a minimal remote-exec just to verify the service is up
  provisioner "remote-exec" {
    inline = [
      "echo 'Instance ready – checking containers:'",
      "docker ps"
    ]
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = tls_private_key.pk.private_key_pem
    host        = self.public_ip
    timeout     = "30m"
    agent       = false
  }
}
