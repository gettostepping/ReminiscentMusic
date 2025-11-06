# Cloudflare R2 Setup Guide

This application now uses Cloudflare R2 for file storage instead of local file storage. Follow these steps to set up R2:

## 1. Create an R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the left sidebar
3. Click **Create bucket**
4. Give your bucket a name (e.g., `reminiscent-media`)
5. Choose a location (or leave default)

## 2. Get Your R2 Credentials

1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Give it a name (e.g., `reminiscent-app`)
4. Set permissions to **Object Read & Write**
5. Click **Create API Token**
6. **Save your credentials** - you'll need:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (found in the R2 dashboard URL or in your account settings)

## 3. Set Up Public Access (Optional but Recommended)

To serve files directly from R2 without signed URLs:

1. In your R2 bucket, go to **Settings**
2. Scroll to **Public Access**
3. Click **Connect Domain** or **Allow Access**
4. You can either:
   - Use the default R2.dev domain (e.g., `https://pub-xxxxx.r2.dev`)
   - Connect a custom domain (e.g., `cdn.yourdomain.com`)

## 4. Configure Environment Variables

Add these to your `.env` or `.env.local` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="your-bucket-name"
R2_PUBLIC_DOMAIN="https://pub-xxxxx.r2.dev"  # Optional: Your R2 public domain
R2_ENDPOINT=""  # Optional: Custom endpoint (defaults to https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com)
```

## 5. File Structure in R2

Files will be organized as follows:
- Audio files: `audio/{userId}/{timestamp}-{filename}`
- Artwork images: `artwork/{userId}/{timestamp}-{filename}`

## 6. CORS Configuration (If Needed)

If you need to access R2 files from the browser directly, configure CORS in your R2 bucket:

1. Go to your R2 bucket settings
2. Scroll to **CORS Policy**
3. Add the following CORS configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Notes

- **New uploads**: All new tracks will be uploaded to R2
- **Existing files**: Old files stored locally will continue to work (backward compatible)
- **Migration**: To migrate existing files to R2, you'll need to create a migration script
- **Costs**: R2 is very cost-effective with generous free tier limits

## Troubleshooting

- **"R2 configuration is missing"**: Make sure all environment variables are set correctly
- **Upload failures**: Check that your API token has the correct permissions
- **CORS errors**: Ensure CORS is configured in your R2 bucket settings
- **403 errors**: Verify your R2_PUBLIC_DOMAIN is correct and public access is enabled

