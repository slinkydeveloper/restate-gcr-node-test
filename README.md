# 🚀 Restate + Cloud Run Template

Welcome to the **Restate TypeScript + Cloud Run** template! ✨

## 🛠️ Local Development

Install dependencies:
```bash
npm install
```

Launch the local Restate server:
```bash
npx @restatedev/restate-server
```

Start the service locally:
```bash
npm run dev
```

Connect your local service to Restate:
```bash
npx @restatedev/restate dep register http://localhost:9080
```

Iterate! 🔧

## 🚀 Deploy

This repository contains a GitHub action that on each push to main:

1. Builds the container with your application
2. Pushes the container to Google Artifact Registry
3. Deploys to Google Cloud Run a new revision
4. Registers the new revision to Restate

### 🔧 Google Cloud Run Setup

Enable Artifact registry and Google Cloud Run:

```bash
export PROJECT_ID=<GOOGLE_CLOUD_PROJECT_ID>

gcloud services enable artifactregistry.googleapis.com run.googleapis.com iam.googleapis.com --project="${PROJECT_ID}"
```

Create an Artifact Registry Docker repository:

```bash
export GAR_REPOSITORY=<CONTAINER_REGISTRY_NAME_TO_CREATE>
export GCP_REGION=<GOOGLE_CLOUD_REGION>

gcloud artifacts repositories create "${GAR_REPOSITORY}" \
  --project="${PROJECT_ID}" \
  --repository-format=docker \
  --location="${GCP_REGION}"
```

Create a Service Account for GitHub Actions:

```bash
gcloud iam service-accounts create "github-deployer" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Deployer"
```

Grant the required roles to the Service Account:

```bash
# Cloud run admin to create/update services
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Service account user
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Writer to container registry
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

Create a Workload Identity Pool:

```bash
gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

Get the ID of the Workload Identity Pool:

```bash
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(name)")
```

Create a Workload Identity Provider with an attribute condition:

```bash
export GITHUB_ORG=<YOUR_GITHUB_ORG_OR_USERNAME> # e.g. restatedev

gcloud iam workload-identity-pools providers create-oidc "my-repo" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="My GitHub repo Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

Allow authentications from the Workload Identity Pool to your Service Account:
```bash
export GITHUB_REPO=<FULLY_QUALIFIED_GITHUB_REPO_NAME> # e.g. your-org/your-repo

gcloud iam service-accounts add-iam-policy-binding "github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

Extract the Workload Identity Provider resource name (use this as `WIF_PROVIDER`):
```bash
gcloud iam workload-identity-pools providers describe "my-repo" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --format="value(name)"
```

### 📦 On Restate Cloud

Now you're ready to set up the GitHub Actions variables:

**GitHub Variables** (Settings → Secrets and variables → Actions → Variables):
- `GCP_PROJECT_ID` — Your GCP project ID
- `GCP_REGION` — Region for Cloud Run and Artifact Registry (e.g. `us-central1`)
- `GAR_REPOSITORY` — Artifact Registry repository name (from setup above)
- `CLOUD_RUN_SERVICE` — Cloud Run service name (e.g. `my-service`)
- `WIF_PROVIDER` — Output from the last gcloud command above (e.g. `projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo`)
- `WIF_SERVICE_ACCOUNT` — The full name of the service account created above, (e.g. `github-deployer@${PROJECT_ID}.iam.gserviceaccount.com`)

**GitHub Secrets** (Settings → Secrets and variables → Actions → Secrets):
- `RESTATE_ADMIN_URL`: The Admin URL. You can find it in [Developers > Admin URL](https://cloud.restate.dev/to/developers/integration#admin)
- `RESTATE_AUTH_TOKEN`: Your Restate Cloud auth token. To get one, go to [Developers > API Keys > Create API Key](https://cloud.restate.dev?createApiKey=true&createApiKeyDescription=deployment-key&createApiKeyRole=rst:role::AdminAccess), and make sure to select **Admin** for role

Once the repo is set up, **just push to the main branch**. The workflow will build, deploy to Cloud Run with a tagged revision URL (e.g. `https://rev-abc1234---myservice-xyz.run.app`), and automatically register the deployment to Restate.

### 🔧 Manual Deployment

You can also deploy manually by following the [Restate + Cloud Run documentation](https://docs.restate.dev/category/cloud-run).

## 🎯 Next Steps

- 🔐 Secure your endpoint as shown in your [Restate Cloud Dashboard > Developers > Security](https://cloud.restate.dev/to/developers/integration#security)
- 📖 Explore the [Restate documentation](https://docs.restate.dev)
- 🔍 Check out more [examples and tutorials](https://github.com/restatedev/examples)
- 💬 Join the [Restate Discord community](https://discord.gg/skW3AZ6uGd)

Happy building! 🎉
