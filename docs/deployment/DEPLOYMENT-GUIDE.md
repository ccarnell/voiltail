# Deployment Guide

## Overview
This guide covers deploying Voiltail to production with all services properly configured.

## Prerequisites

### Required Accounts
- [ ] Vercel account (Pro plan recommended)
- [ ] Supabase account
- [ ] Stripe account
- [ ] Resend account
- [ ] PostHog account
- [ ] Sentry account
- [ ] Upstash account

### Domain Setup
- [ ] Domain registered and configured
- [ ] DNS access for email verification

## Environment Variables

### Production Environment Variables
```env
# Core API Keys
GOOGLE_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-claude-api-key

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Authentication (BetterAuth)
BETTER_AUTH_SECRET=your-random-secret-key
BETTER_AUTH_URL=https://yourdomain.com

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_PRICE_ID=price_...

# Email (Resend)
RESEND_API_KEY=re_...

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Monitoring (Sentry)
SENTRY_DSN=https://...@sentry.io/...

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Optional: Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Deployment Steps

### 1. Prepare Codebase

```bash
# Ensure all dependencies are installed
npm install

# Build and test locally
npm run build
npm run start

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### 2. Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Note project URL and keys

2. **Run Database Migrations**
   - Copy SQL from `docs/phases/PHASE-4-PRODUCTION-SYSTEM.md`
   - Run in Supabase SQL Editor
   - Verify tables and policies are created

3. **Configure RLS Policies**
   - Ensure Row Level Security is enabled
   - Test policies with sample data

### 3. External Service Configuration

#### Stripe Setup
1. **Create Products and Prices**
   ```
   Product: Voiltail Pro
   Price: $39/month (recurring)
   ```

2. **Configure Webhooks**
   - Endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

3. **Test in Stripe Test Mode**
   - Use test API keys initially
   - Verify webhook delivery
   - Test complete checkout flow

#### Resend Email Setup
1. **Verify Domain**
   - Add domain to Resend
   - Configure DNS records
   - Verify domain ownership

2. **Update Email Templates**
   - Replace `voiltail.com` with your domain
   - Test email delivery

#### Other Services
- **PostHog**: Create project, get API key
- **Sentry**: Create Next.js project, get DSN
- **Upstash**: Create Redis database, get credentials

### 4. Vercel Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and link project
   vercel login
   vercel link
   ```

2. **Configure Environment Variables**
   - Add all production environment variables in Vercel dashboard
   - Use Vercel CLI for bulk import:
   ```bash
   vercel env add VARIABLE_NAME production
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   ```

4. **Configure Custom Domain**
   - Add domain in Vercel dashboard
   - Update DNS records
   - Enable SSL certificate

### 5. Post-Deployment Configuration

#### Update Service URLs
1. **BetterAuth**
   - Update `BETTER_AUTH_URL` to production domain

2. **Stripe**
   - Update webhook URL to production
   - Switch to live API keys
   - Test live payments

3. **Email Templates**
   - Update all URLs to production domain
   - Test email delivery

#### Monitoring Setup
1. **Sentry**
   - Verify error tracking works
   - Set up alerts

2. **PostHog**
   - Verify analytics tracking
   - Set up dashboards

3. **Upstash**
   - Verify rate limiting works
   - Monitor Redis usage

## Testing Checklist

### Pre-Production Testing
- [ ] All environment variables set correctly
- [ ] Database migrations completed
- [ ] Stripe webhooks receiving events
- [ ] Email delivery working
- [ ] Rate limiting functional
- [ ] Error tracking active
- [ ] Analytics capturing events

### Production Testing
- [ ] Complete user registration flow
- [ ] Email verification working
- [ ] Stripe checkout and billing
- [ ] Pro tier features accessible
- [ ] Basic tier rate limiting
- [ ] Error handling and monitoring
- [ ] Performance under load

## Monitoring and Maintenance

### Daily Checks
- [ ] Error rates in Sentry
- [ ] API usage and costs
- [ ] User feedback and support requests

### Weekly Checks
- [ ] Conversion metrics in PostHog
- [ ] Subscription and billing reports
- [ ] Database performance
- [ ] Rate limiting effectiveness

### Monthly Checks
- [ ] Cost analysis and optimization
- [ ] User retention and churn analysis
- [ ] Feature usage analytics
- [ ] Security audit

## Troubleshooting

### Common Issues

**Stripe Webhooks Not Working**
- Verify webhook URL is correct
- Check webhook secret matches
- Ensure endpoint is publicly accessible
- Check Stripe dashboard for delivery attempts

**Email Delivery Issues**
- Verify domain is properly configured
- Check DNS records for email authentication
- Test with different email providers
- Monitor Resend dashboard for delivery status

**Database Connection Issues**
- Verify DATABASE_URL format
- Check Supabase project status
- Ensure connection pooling is configured
- Monitor connection limits

**Rate Limiting Problems**
- Verify Upstash Redis connectivity
- Check rate limit configuration
- Monitor Redis usage and limits
- Test with different user types

### Performance Optimization

**Database Optimization**
- Monitor slow queries
- Add indexes for common queries
- Optimize RLS policies
- Consider read replicas for high traffic

**API Optimization**
- Implement caching where appropriate
- Monitor API response times
- Optimize model API calls
- Consider request batching

**Frontend Optimization**
- Monitor Core Web Vitals
- Optimize bundle size
- Implement proper caching headers
- Use CDN for static assets

## Security Considerations

### Environment Variables
- Never commit secrets to version control
- Use Vercel's secure environment variable storage
- Rotate API keys regularly
- Monitor for exposed credentials

### Database Security
- Ensure RLS policies are properly configured
- Use service role key only for server-side operations
- Monitor for unauthorized access attempts
- Regular security audits

### API Security
- Implement proper rate limiting
- Validate all inputs
- Use HTTPS everywhere
- Monitor for suspicious activity

## Backup and Recovery

### Database Backups
- Supabase provides automatic backups
- Consider additional backup strategy for critical data
- Test restore procedures regularly

### Code Backups
- Use Git for version control
- Tag releases for easy rollback
- Maintain staging environment for testing

### Configuration Backups
- Document all environment variables
- Backup service configurations
- Maintain deployment runbooks

---

*For detailed implementation instructions, see the phase documents in `docs/phases/`*
