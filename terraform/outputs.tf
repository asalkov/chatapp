output "public_ip" {
  value = aws_instance.app_server.public_ip
}

output "ssh_command" {
  value = "ssh -i chat_app_key.pem ec2-user@${aws_instance.app_server.public_ip}"
}

output "https_url" {
  value = "https://${aws_instance.app_server.public_ip}"
  description = "HTTPS URL for the chat application (self-signed certificate)"
}

output "http_url" {
  value = "http://${aws_instance.app_server.public_ip} (redirects to HTTPS)"
  description = "HTTP URL (will redirect to HTTPS)"
}
