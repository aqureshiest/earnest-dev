I'll update the README file based on the information provided. Here's the revised version:

# Earnest AI Tools Local Development Guide

This guide will walk you through setting up the project for local development.

## Prerequisites

- Git
- Docker and Docker Compose
- AWS CLI
- saml2aws
- Node.js environment (for local development outside Docker)

## Setup Process

### 1. Clone the Repository

```bash
git clone https://github.com/aqureshiest/earnest-dev
cd earnest-dev
```

### 2. GitHub App Authentication

We require GitHub App authentication:

1. Create a new GitHub App:
   - Go to your GitHub account
   - Navigate to **Settings** > **Developer settings** > **GitHub Apps**
   - Click **New GitHub App**
   - Name it `earnest-ai-tools`
   - For Homepage URL, specify `http://localhost:3000`
   - Uncheck "Active" under Webhook
   - Save the app

2. Configure app permissions:
   - Under Repository permissions, set both **Contents** and **Pull Requests** to **Read & write**

3. Generate authentication credentials:
   - Generate a private key and download it
   - Generate a client secret
   - Install the GitHub App on your repositories (all or selected)

4. Generate JWT token using this script:
   ```bash
   # Save this as gh-jwt.sh
   #!/usr/bin/env bash

    set -o pipefail

    client_id=$1 # Client ID as first argument

    pem=$( cat $2 ) # file path of the private key as second argument

    now=$(date +%s)
    iat=$((${now} - 60)) # Issues 60 seconds in the past
    exp=$((${now} + 600)) # Expires 10 minutes in the future

    b64enc() { openssl base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n'; }

    header_json='{
        "typ":"JWT",
        "alg":"RS256"
    }'
    # Header encode
    header=$( echo -n "${header_json}" | b64enc )

    payload_json="{
        \"iat\":${iat},
        \"exp\":${exp},
        \"iss\":\"${client_id}\"
    }"
    # Payload encode
    payload=$( echo -n "${payload_json}" | b64enc )

    # Signature
    header_payload="${header}"."${payload}"
    signature=$(
        openssl dgst -sha256 -sign <(echo -n "${pem}") \
        <(echo -n "${header_payload}") | b64enc
    )

    # Create JWT
    JWT="${header_payload}"."${signature}"
    printf '%s\n' "JWT: $JWT"
   ```

5. Run the script to get your JWT:
   ```bash
   bash gh-jwt.sh <client-id> <path-to-private-key>
   ```

6. Get the installation ID:
   ```bash
   curl -X GET \
   -H "Authorization: Bearer <jwt_token>" \
   -H "Accept: application/vnd.github+json" \
   https://api.github.com/app/installations
   ```
   The `id` in the response is your installation ID.

### 3. Environment Configuration

Create a `.env.production` file in the project root with the following contents:

```
# Application Configuration
NODE_ENV=production
PORT=3000

# GitHub App Authentication
GITHUB_PRIVATE_KEY=<contents-of-your-private-key-file>
GITHUB_APP_ID=<your-github-app-id>
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_INSTALLATION_ID=<your-github-installation-id>
NEXT_PUBLIC_GITHUB_OWNER=<your-github-username>

# defined in docker compose
# DATABASE_URL=postgres://postgres@localhost:5432/

# app settings
WRITE_RUN_INFO_TO_FILE=true
AI_SERVICE_USE_CACHE=true

EMBEDDING_PROVIDER=titan

METRICS_LOGGING_ENABLED=true

BUGSNAG_API_KEY=abc_123

# AWS configuration
AWS_REGION=us-east-1
AWS_PROFILE=<your-aws-profile-name>
```

Replace the placeholder values with your actual GitHub App credentials and AWS profile.

### 4. AWS Access Setup

#### Verify AWS Bedrock Model Access

Before proceeding, ensure you have access to the required AWS Bedrock models:

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

2. Identify your AWS profile name:
   ```bash
   cat ~/.aws/credentials
   ```
   Look for a profile name like `est-development-Okta-Development-Eng` in the output.

3. Update your `.env.production` file with this profile name:
   ```
   AWS_PROFILE=est-development-Okta-Development-Eng
   ```
   Note: Your profile name might be different.

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
- Build the application container
- Start a PostgreSQL container with pgvector extension
- Mount your AWS credentials into the container
- Expose the application on http://localhost:3000