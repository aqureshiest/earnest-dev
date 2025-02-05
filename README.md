# Earnest AI Dev

Earnest AI Dev is a project designed to empower developers at Earnest by leveraging AI assistants to generate code.

## Table of Contents

- [Core Setup](#core-setup)
  - [GitHub Token](#github-token)
  - [Supabase](#supabase)
- [AI Model Setup](#ai-model-setup)
  - [AWS Bedrock](#aws-bedrock)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
- [Docker Setup](#docker-setup)
  - [Development Environment](#development-environment)
  - [Production Deployment](#production-deployment)
- [Installation and Setup](#installation-and-setup)
- [Running the Project](#running-the-project)
- [Environment Example File](#environment-example-file)

## Core Setup

These steps are required regardless of which AI models you plan to use.

### GitHub Token

1. Go to your GitHub account.
2. Navigate to **Settings** > **Developer settings** > **Personal access tokens**.
3. Generate a new token with `repo` scope to allow access to your repositories.
4. Under `Permissions`, select `Read and write` for `Pull requests` and `Contents`.
5. Copy the token and set it as the value for `GITHUB_TOKEN` and `NEXT_PUBLIC_GITHUB_TOKEN` in your `.env.local` file.
6. The `NEXT_PUBLIC_GITHUB_OWNER` should be set to the GitHub username or organization name owning the repositories.

### Supabase

1. Sign up or log in to [Supabase](https://supabase.com/).
2. Create a new project or select an existing one.
3. Go to the **Project Settings** > **API** section.
4. Copy the `URL` and `anon` key provided.
5. Set the `NEXT_PUBLIC_SUPABASE_URL` to the copied `URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the `anon` key in your `.env.local` file.
6. Run the SQL from `src/modules/db/schema.sql` in Supabase SQL editor to create the tables and the function.

## AI Model Setup

Choose and configure one or more of the following AI model providers:

### AWS Bedrock

1. Configure AWS credentials using SAML2AWS:
    ```bash
    saml2aws login
    ```
2. When prompted, log in to your OKTA account and select the AWS development account.

3. Set your AWS profile:
    ```bash
    export AWS_PROFILE=est-development-Okta-Development-Eng
    ```

### OpenAI

1. Sign up or log in to [OpenAI](https://platform.openai.com/).
2. Navigate to **API Keys** under your account settings.
3. Generate a new API key.
4. Copy the key and set it as the value for `OPENAI_API_KEY` in your `.env.local` file.

### Anthropic

1. Sign up or log in to [Anthropic](https://www.anthropic.com/).
2. Navigate to the API section under your account settings.
3. Generate a new API key.
4. Copy the key and set it as the value for `ANTHROPIC_API_KEY` in your `.env.local` file.

## Docker Setup

The project can be run using Docker for both development and production environments.

### Development Environment

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd earnest-dev
   ```

2. Copy the Docker environment example file:
   ```bash
   cp .env.docker.example .env
   ```

3. Start the development environment:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

The application will be available at http://localhost:3000 with hot reloading enabled.

### Production Deployment

1. Build the production image:
   ```bash
   docker build -t earnest-dev:latest .
   ```

2. Start the production stack:
   ```bash
   docker compose up -d
   ```

For detailed Docker instructions, please refer to [DOCKER.md](DOCKER.md).

## Installation and Setup

To set up the project locally without Docker, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/earnest-dev.git
    ```
2. Navigate to the project directory:
    ```bash
    cd earnest-dev
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Set up your `.env.local` file with the necessary environment variables as described above.

## Running the Project

To run the Next.js project locally, use the following command:

```bash
npm run dev
```

This will start the development server, and you can view the project at http://localhost:3000.

## Environment Example File

Below is an example .env file. You can use this as a template by saving it as .env.local and replacing the placeholder values with your actual keys.

```
GITHUB_TOKEN=your_github_token
NEXT_PUBLIC_GITHUB_TOKEN=your_github_token
NEXT_PUBLIC_GITHUB_OWNER=your_github_username_or_organization

# only needed if you are running openai models
OPENAI_API_KEY=your_openai_api_key

# only needed if you are running anthropic claude models
ANTHROPIC_API_KEY=your_anthropic_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```