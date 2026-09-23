terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "region" { type = string  default = "us-east-1" }
variable "suffix" { type = string }
provider "aws" { region = var.region }

resource "aws_s3_bucket" "atlas_lake" {
  bucket = "pipelineforge-atlas-${var.suffix}"
  tags = { Project = "pipelineforge-atlas", Layer = "data-lake" }
}

resource "aws_s3_bucket_versioning" "atlas_lake" {
  bucket = aws_s3_bucket.atlas_lake.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_cloudwatch_log_group" "atlas" {
  name              = "/pipelineforge/atlas"
  retention_in_days = 14
}

output "lake_uri" { value = "s3://${aws_s3_bucket.atlas_lake.bucket}" }
