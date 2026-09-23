# Multi-cloud infrastructure

The same data-lake boundary is expressed three ways so the code shows **provider fluency rather than pretending the clouds are identical**.

| Provider | Module | Provisioned primitive |
| --- | --- | --- |
| AWS | `aws/main.tf` | S3 versioned lake + CloudWatch log group |
| Azure | `azure/main.tf` | Resource group + Storage Account + private Blob container |
| GCP | `gcp/main.tf` | Versioned Google Cloud Storage bucket |

Each module is intentionally small enough to inspect in an interview. It is real Terraform, but it is **not claimed as deployed** because cloud-account credentials are not stored in this repository.
