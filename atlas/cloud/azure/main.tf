terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
}

variable "location" { type = string default = "eastus" }
variable "suffix" { type = string }
provider "azurerm" { features {} }

resource "azurerm_resource_group" "atlas" {
  name     = "rg-pipelineforge-atlas-${var.suffix}"
  location = var.location
}

resource "azurerm_storage_account" "atlas" {
  name                     = "pfatlas${var.suffix}"
  resource_group_name      = azurerm_resource_group.atlas.name
  location                 = azurerm_resource_group.atlas.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "lake" {
  name                  = "pipeline-events"
  storage_account_id    = azurerm_storage_account.atlas.id
  container_access_type = "private"
}

output "storage_account" { value = azurerm_storage_account.atlas.name }
