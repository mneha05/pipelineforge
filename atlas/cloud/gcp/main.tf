terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
}

variable "project_id" { type = string }
variable "region" { type = string default = "us-central1" }
variable "suffix" { type = string }

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "atlas_lake" {
  name                        = "pipelineforge-atlas-${var.suffix}"
  location                    = var.region
  uniform_bucket_level_access = true
  versioning { enabled = true }
}

output "lake_uri" { value = "gs://${google_storage_bucket.atlas_lake.name}" }
