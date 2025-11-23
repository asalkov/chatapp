# Chat App

A simple real-time chat application built with NestJS, React (MUI), and Docker. Deployed to AWS EC2 using Terraform.

## Project Structure
- `backend`: NestJS application (WebSocket Gateway).
- `frontend`: React application (Vite + Material UI).
- `terraform`: Infrastructure as Code for AWS deployment.
- `docker-compose.yml`: Orchestration for local and remote execution.

## Deployment
See [walkthrough.md](walkthrough.md) (if available) or follow these steps:

1. `cd terraform`
2. `terraform init`
3. `terraform apply`
4. Wait for the instance to provision and build the app (~5 mins).
5. Access via the output Public IP.
