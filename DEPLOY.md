# Deployment Guide (Vercel + Convex)

This project is ready for production. Follow these steps to deploy.

## 1. Environment Variables
You must configure the following variables in your Vercel Project Settings:

### Core Configuration
| Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CONVEX_URL` | `https://wary-otter-917.convex.cloud` | Production Convex URL |
| `CONVEX_DEPLOYMENT` | *(Retrieve from Dashboard)* | Internal Deployment ID |

### Authentication (Clerk)
| Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Your Clerk Publishable Key |
| `CLERK_SECRET_KEY` | `sk_test_...` | Your Clerk Secret Key |
| `CLERK_ISSUER_URL` | `https://...` | Clerk Issuer URL (Required for Convex Auth) |
| `CLERK_WEBHOOK_SECRET` | *(Optional for now)* | For syncing users via webhooks |

### Media (Cloudinary)
| Variable | Value | Description |
| :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | `dptqxjhb8` | Your Cloud Name |
| `CLOUDINARY_API_KEY` | *(Retrieve from Dashboard)* | API Key |
| `CLOUDINARY_API_SECRET` | *(Retrieve from Dashboard)* | API Secret |

---

## 2. Deploy Steps
1. Push your code to GitHub.
2. Import the repository in Vercel.
3. Paste the Environment Variables above.
4. Click **Deploy**.

## 3. Post-Deploy Verification
- Visit the public URL.
- Navigate to `/workshop`, `/study`, `/boathouse` to verify routing.
- Check that background videos/images load (Cloudinary connection).
- Log in to `/studio` to verify Clerk authentication.

## 4. Troubleshooting
- **"Locating..." stuck?** -> Ensure `seeds:seedAll` was run on the *production* Convex instance.
- **Images not loading?** -> Check `CLOUDINARY_CLOUD_NAME`.
