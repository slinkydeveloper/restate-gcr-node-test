# Hello world - TypeScript example

Sample project configuration of a Restate service using the TypeScript SDK.

Have a look at the [TypeScript Quickstart guide](https://docs.restate.dev/get_started/quickstart?sdk=ts) for more information on how to use this template.

## Continuous deployment to Google Cloud Run

This repo is configured to automatically build a Docker image and deploy it to Google Cloud Run on every push to `main`. After a successful deployment, the workflow optionally registers the service with your Restate control plane.

The workflow lives at `.github/workflows/release-cloudrun.yml` and follows Google’s example: https://github.com/google-github-actions/example-workflows/blob/main/workflows/deploy-cloudrun/cloudrun-docker.yml

### Prerequisites in Google Cloud

1. Enable required APIs for your project:
   - Artifact Registry API
   - Cloud Run Admin API
   - Cloud Build API (only if you switch to Cloud Build; current workflow builds with Docker)
2. Create an Artifact Registry repository for Docker images:
   - Format: `Docker`
   - Location (region): e.g. `us`, `europe`, or `asia` (this is `GAR_LOCATION`)
   - Repository ID: e.g. `restate-services` (this is `GAR_REPOSITORY`)
3. Create a Service Account used by GitHub Actions and grant roles:
   - `roles/run.admin` (Cloud Run Admin)
   - `roles/iam.serviceAccountUser` (Service Account User)
   - `roles/artifactregistry.writer` (Artifact Registry Writer)
   - Optionally `roles/viewer` for basic read operations during deploy.

### Authentication from GitHub Actions to Google Cloud

You can use either Workload Identity Federation (recommended) or a JSON key. Configure one of the two options below.

Option A — Workload Identity Federation (recommended):
- Create a Workload Identity Pool and a Provider that trusts your GitHub org/repo.
- Bind the Service Account to the pool with `roles/iam.workloadIdentityUser`.
- Save the following GitHub repository secrets:
  - `WIF_PROVIDER`: The full resource name of the provider, e.g. `projects/123456789/locations/global/workloadIdentityPools/gh-pool/providers/gh-provider`.
  - `WIF_SERVICE_ACCOUNT`: The service account email, e.g. `github-deployer@<PROJECT_ID>.iam.gserviceaccount.com`.

Option B — Service Account key (simpler, less secure):
- Create a key for the service account and download the JSON.
- Save the JSON as the `GCP_SA_KEY` GitHub secret.

Reference: https://github.com/google-github-actions/deploy-cloudrun?tab=readme-ov-file#authorization

### Required GitHub Secrets

Populate these repository secrets so the workflow can build and deploy:

- `GCP_PROJECT_ID` — Your Google Cloud project ID.
- `GCP_REGION` — Cloud Run region, e.g. `us-central1`.
- `GAR_LOCATION` — Artifact Registry location scope, e.g. `us`, `europe`, `asia`.
- `GAR_REPOSITORY` — Artifact Registry repository name, e.g. `restate-services`.
- `CLOUD_RUN_SERVICE` — The Cloud Run service name to create/update, e.g. `ts-hello-world`.
- One of the auth options:
  - `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT`, or
  - `GCP_SA_KEY`

Optional (for Restate registration after deploy):
- `RESTATE_URL` — Base URL of your Restate control plane (e.g. `https://my-restate.example.com`).
- `RESTATE_TOKEN` — Bearer token to call the Restate Admin API.
- `RESTATE_SERVICE_SECRET` — Optional secret shared with the service for verification.

### What the workflow does

- Checks out the code.
- Authenticates to Google Cloud (WIF if configured, otherwise SA key).
- Configures Docker to push to Artifact Registry.
- Builds the image from the provided `Dockerfile` and pushes it to `LOCATION-docker.pkg.dev/PROJECT/REPOSITORY/SERVICE:SHA`.
- Deploys the image to Cloud Run (public by default via `allow_unauthenticated: true`).
- If `RESTATE_URL` and `RESTATE_TOKEN` are provided, calls the Restate Admin API to register the deployed service URL. You can adapt the payload to your control-plane version; see the Vercel example flow for reference: https://docs.restate.dev/services/deploy/vercel

### Dockerfile

A production-ready multi-step `Dockerfile` is included and works on Cloud Run. It:
- Installs dependencies and builds the TypeScript app
- Prunes dev dependencies
- Runs the app with `dumb-init` on port `9080`

If you need a different port, update both the `Dockerfile` `EXPOSE` and your service code, and optionally set a Cloud Run env var `PORT` if your framework relies on it.

### First-time deployment tips

- Ensure the Artifact Registry repository exists in the `GAR_LOCATION` region you configured.
- The first deploy will create the Cloud Run service if it doesn't exist.
- If you require private Cloud Run (no unauthenticated access), set `allow_unauthenticated: false` in the workflow and configure IAM accordingly.
- Verify the deployed URL printed by the workflow logs.

### Local development

- `npm install`
- `npm run build`
- `npm start` (or run the compiled `dist/app.js`)