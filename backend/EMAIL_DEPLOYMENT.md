# Email Deployment

## Recommended Render configuration

Use Resend over HTTPS. Add these Render environment variables:

```text
RESEND_API_KEY=re_...
RESEND_FROM=verified-sender@yourdomain.com
```

`RESEND_FROM` must use a domain verified in the Resend dashboard. After changing variables, redeploy the backend and confirm the startup log says:

```text
Email configured with Resend HTTPS API
```

## Remove the SMTP variables

For the Resend setup, remove these existing Render variables so the deployment is unambiguous:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_SECURE
SMTP_FROM
```

Do not paste API keys or passwords into source control or chat. Render stores the values securely.

## SMTP fallback

If SMTP must be used instead, keep the existing SMTP variables and verify that the provider allows outbound connections from Render. Gmail requires an app password, not the normal account password:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM=your-email@gmail.com
```