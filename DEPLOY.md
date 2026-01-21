# Vercel Deployment Guide

## 1. Prerequisites
- A [Vercel Account](https://vercel.com).
- Your Source Code (which you have).
- **Supabase Credentials** (Project URL and Anon Key).

## 2. Configuration Files
I have already created the necessary `vercel.json` file for you. This allows Vercel to handle React's "client-side routing" correctly (so refreshing the page causing 404s doesn't happen).

## 3. Environment Variables (CRITICAL)
When you deploy to Vercel, you **MUST** add these Environment Variables in the Project Settings.
**If you don't do this, the app will open but won't be able to connect to the database.**

Go to **Vercel > Project Settings > Environment Variables** and add:

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://fexirpsrgyblvgknolbf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Your Anon Key)* |

> **Note:** You can find these values in your local `.env` file or `src/lib/supabase.js`.

## 4. Deploying via Web UI (Recommended)
1. Push your code to a GitHub repository (if not already).
2. Go to Vercel Dashboard -> **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.
4. **Build Command:** `vite build` (Vercel should auto-detect this).
5. **Output Directory:** `dist` (Vercel should auto-detect this).
6. **Add the Environment Variables** mentioned above.
7. Click **Deploy**.

## 5. Deploying via CLI (Alternative)
If you have Vercel CLI installed:
1. Open terminal in the project folder.
2. Run `npx vercel`.
3. Follow the prompts.
4. When asked "Want to modify verify build settings?", generally say No (defaults work).
5. **IMPORTANT:** Check your dashboard afterwards to ensure Env Vars are set!
