variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-northeast-1"
}

variable "backend_image_tag" {
  description = "Docker image tag for the backend service"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Docker image tag for the frontend service"
  type        = string
  default     = "latest"
}

variable "cors_origin" {
  description = "CORS origin for the backend (frontend URL)"
  type        = string
  default     = "http://localhost:3000"
}

variable "api_url" {
  description = "API URL for the frontend to reach the backend"
  type        = string
  default     = "http://localhost:3001"
}
