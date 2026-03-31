# Deployment Guide — Intune Assignments Visualizer

This guide covers deploying the app to **Azure App Service** (Linux, Node.js) in the **Canada Central** region.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and authenticated (`az login`)
- Node.js 20+ and npm installed
- Repository cloned locally

## 1. Create Azure Resources

```bash
# Create resource group
az group create --name rg-intune-visualizer --location canadacentral

# Create App Service Plan (B1 tier, Linux)
az appservice plan create \
  --name asp-intune-visualizer \
  --resource-group rg-intune-visualizer \
  --location canadacentral \
  --sku B1 \
  --is-linux

# Create Web App (Node 20)
az webapp create \
  --name intune-assignments-visualizer \
  --resource-group rg-intune-visualizer \
  --plan asp-intune-visualizer \
  --runtime "NODE:20-lts"
```

## 2. Configure App Settings

```bash
az webapp config appsettings set \
  --name intune-assignments-visualizer \
  --resource-group rg-intune-visualizer \
  --settings \
  NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<your-client-id> \
  NEXT_PUBLIC_AZURE_AD_TENANT_ID=<your-tenant-id> \
  PORT=3000 \
  HOSTNAME=0.0.0.0

# Set startup command
az webapp config set \
  --name intune-assignments-visualizer \
  --resource-group rg-intune-visualizer \
  --startup-file "node server.js"
```

## 3. Update Entra App Redirect URI

Add the Azure URL as a SPA redirect URI:

```bash
APP_OBJECT_ID=$(az ad app show --id <your-client-id> --query id -o tsv)

az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/$APP_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body '{"spa":{"redirectUris":["http://localhost:3001/","https://intune-assignments-visualizer.azurewebsites.net/"]}}'
```

## 4. Build for Production

```bash
# Install dependencies
npm install

# Build Next.js standalone
npm run build

# Copy static assets into standalone folder
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

> On Windows (PowerShell):
> ```powershell
> Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
> Copy-Item -Recurse -Force public .next\standalone\public
> ```

## 5. Create Deployment Zip

```bash
cd .next/standalone
zip -r ../../deploy.zip .
cd ../..
```

> On Windows (PowerShell):
> ```powershell
> Compress-Archive -Path ".next\standalone\*" -DestinationPath deploy.zip -Force
> ```

## 6. Deploy to Azure

```bash
az webapp deploy \
  --name intune-assignments-visualizer \
  --resource-group rg-intune-visualizer \
  --src-path deploy.zip \
  --type zip \
  --async true
```

Wait for the deployment to complete. You can monitor logs with:

```bash
az webapp log tail \
  --name intune-assignments-visualizer \
  --resource-group rg-intune-visualizer
```

You should see:
```
▲ Next.js 16.2.1
- Local:   http://localhost:3000
- Network: http://0.0.0.0:3000
✓ Ready in 0ms
```

## 7. Verify

Open: **https://intune-assignments-visualizer.azurewebsites.net**

---

## Quick Redeploy (after code changes)

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone && zip -r ../../deploy.zip . && cd ../..
az webapp deploy --name intune-assignments-visualizer --resource-group rg-intune-visualizer --src-path deploy.zip --type zip --async true
```

## Azure Resources Summary

| Resource | Name | Location |
|---|---|---|
| Resource Group | `rg-intune-visualizer` | Canada Central |
| App Service Plan | `asp-intune-visualizer` | Canada Central (B1 Linux) |
| Web App | `intune-assignments-visualizer` | Canada Central |
| Live URL | https://intune-assignments-visualizer.azurewebsites.net | — |

## Cleanup

To delete all resources:

```bash
az group delete --name rg-intune-visualizer --yes --no-wait
```
