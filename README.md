# Earnest AI Tools Local Development Guide

This guide will walk you through setting up the project for local development.

## Prerequisites

-   Git
-   Docker and Docker Compose
-   AWS CLI
-   saml2aws
-   Node.js environment (for local development outside Docker)

## Setup Process

### 1. Clone the Repository

```bash
git clone https://github.com/aqureshiest/earnest-dev
cd earnest-dev
```

### 2. GitHub Access Token

You'll need a GitHub personal access token with appropriate permissions:

1. Go to your GitHub account
2. Navigate to **Settings** > **Developer settings** > **Personal access tokens**
3. Generate a new token with access to all or selected repositories.
4. Under `Permissions`, select `Read and write` for both `Pull requests` and `Contents`
5. Copy the generated token for the next step

### 3. Environment Configuration

Create a `.env.production` file in the project root with the following contents:

```
# Application Configuration
NODE_ENV=production
PORT=3000

GITHUB_TOKEN=your-github-token
NEXT_PUBLIC_GITHUB_TOKEN=your-github-token
NEXT_PUBLIC_GITHUB_OWNER=your-github-username

# defined in docker compose
# DATABASE_URL=postgres://postgres@localhost:5432/

# app settings
WRITE_RUN_INFO_TO_FILE=true
AI_SERVICE_USE_CACHE=true

EMBEDDING_PROVIDER=titan

METRICS_LOGGING_ENABLED=true

BUGSNAG_API_KEY=abc_123

export AWS_REGION=us-east-1
export AWS_PROFILE=your_aws_profile
```

Replace `your-github-token` with the token you generated in step 2, and `your-github-username` with your GitHub username.
Replace `aws_profile` with your aws dev profile.

### 4. AWS Access Setup

#### Verify AWS Bedrock Model Access

Before proceeding, you'll need to ensure you have access to the required AWS Bedrock models:

1. Login to Okta
2. Select AWS Dev from the available applications
3. Navigate to AWS Bedrock service
4. Click on **Model Catalog** under Foundation Models
5. Verify you have access to:
    - **Claude 3.7 Sonnet**
    - **Claude 3.5 Haiku**
    - **Titan Text Embeddings V2**

If you don't have access to these models, request access.

#### Configure AWS Credentials

1. Authenticate and obtain AWS credentials:
    ```bash
    saml2aws login
    ```
    This will populate your `~/.aws/credentials` file with temporary AWS credentials.

### 5. Set AWS Credentials Permissions

Set proper permissions on your AWS credentials to ensure Docker can access them:

```bash
chmod 755 ~/.aws
chmod 644 ~/.aws/credentials
```

### 6. Start the Application

Build and start the Docker containers:

```bash
docker compose up --build
```

This will:

-   Build the application container
-   Start a PostgreSQL container with pgvector extension
-   Mount your AWS credentials into the container
-   Expose the application on http://localhost:3000
