# Earnest AI Dev

Earnest AI Dev is a project designed to empower developers at Earnest by leveraging AI assistants to generate code.

## Table of Contents

- [Environment Variables](#environment-variables)
  - [GitHub Token](#github-token)
  - [OpenAI API Key](#openai-api-key)
  - [Anthropic API Key](#anthropic-api-key)
  - [Supabase](#supabase)
  - [Ably API Key](#ably-api-key)
- [Installation and Setup](#installation-and-setup)
- [Running the Project](#running-the-project)
- [Environment Example File](#environment-example-file)

## Environment Variables

To run this project, you need to set up several environment variables. Follow the steps below to obtain and configure each one.

### GitHub Token

1. Go to your GitHub account.
2. Navigate to **Settings** > **Developer settings** > **Personal access tokens**.
3. Generate a new token with `repo` scope to allow access to your repositories.
4. Copy the token and set it as the value for `GITHUB_TOKEN` and `NEXT_PUBLIC_GITHUB_TOKEN` in your `.env.local` file.
5. The `NEXT_PUBLIC_GITHUB_OWNER` should be set to the GitHub username or organization name owning the repositories.

### OpenAI API Key

1. Sign up or log in to [OpenAI](https://platform.openai.com/).
2. Navigate to **API Keys** under your account settings.
3. Generate a new API key.
4. Copy the key and set it as the value for `OPENAI_API_KEY` in your `.env.local` file.

### Anthropic API Key

1. Sign up or log in to [Anthropic](https://www.anthropic.com/).
2. Navigate to the API section under your account settings.
3. Generate a new API key.
4. Copy the key and set it as the value for `ANTHROPIC_API_KEY` in your `.env.local` file.

### Supabase

1. Sign up or log in to [Supabase](https://supabase.com/).
2. Create a new project or select an existing one.
3. Go to the **Project Settings** > **API** section.
4. Copy the `URL` and `anon` key provided.
5. Set the `NEXT_PUBLIC_SUPABASE_URL` to the copied `URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the `anon` key in your `.env.local` file.
6. Run the SQL from `src/modules/db/schema.sql` in Supabase SQL editor to create the tables and the function.

### Ably API Key

1. Sign up or log in to [Ably](https://ably.com/).
2. Create a new app or select an existing one.
3. Go to the **API Keys** section of the app.
4. Copy the `API key` provided.
5. Set the value for `NEXT_PUBLIC_ABLY_API_KEY` in your `.env.local` file.

## Installation and Setup

To set up the project locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/earnest-ai-dev.git
    ```
2. Navigate to the project directory:
    ```bash
    cd earnest-ai-dev
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

OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

NEXT_PUBLIC_ABLY_API_KEY=your_ably_api_key
```