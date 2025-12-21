# Vercel Deployment Fix

The build is failing because Vercel lacks permission to run `convex codegen` during installation.

## Critical Step: Add the Deploy Key

1.  **Get the Key**:
    *   Open your [Convex Dashboard](https://dashboard.convex.dev).
    *   Navigate to **Settings** -> **Deploy Keys**.
    *   Generate a new key (name it "Vercel").
    *   Copy it.

2.  **Add to Vercel**:
    *   Go to your Vercel Project -> **Settings** -> **Environment Variables**.
    *   Add a new variable:
        *   **Key**: `CONVEX_DEPLOY_KEY`
        *   **Value**: *(Paste the key you copied)*

3.  **Redeploy**:
    *   Go to the **Deployments** tab in Vercel.
    *   Find the failed commit and click **Redeploy**.

## Why is this needed?
We updated `package.json` to run `convex codegen` on `postinstall` to ensure your types are always up to date. This command requires authentication to fetch the latest schema from Convex.
