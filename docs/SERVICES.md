# Likelee AI - Services Reference

**Version**: 1.0  
**Last Updated**: 2026-05-06  

This document provides a comprehensive reference for all external services used by the Likelee AI platform, including tier recommendations, cost estimates, and setup requirements.

---

## Services Overview

| Service | Function | Tier Required | Monthly Cost (Est.) | Required |
|---------|----------|---------------|---------------------|----------|
| **Supabase** | PostgreSQL database, Storage buckets, Authentication | Pro Plan | $25/mo base + storage | ✅ Yes |
| **Stripe** | Payment processing, Connect for payouts, Subscriptions | Standard | 2.9% + $0.30 per transaction | ✅ Yes |
| **DocuSeal** | Contract signing, document workflows | Starter or Business | $20/mo | ✅ Yes |
| **Veriff** | KYC identity verification | Plus | $99/mo + per-session | ✅ Yes |
| **Calendly** | IRL booking scheduling | Free or Standard | Free or $10/mo/user | ✅ Yes |
| **ElevenLabs** | Voice synthesis, TTS | Free or Starter | Free (20min/mo) | ✅ Yes |
| **Apify** | Instagram profile scraping | Free or Starter | $1.39/1000 request|  ✅ Yes
| **SMTP Provider** | Transactional email | Included | google smtp srver | ✅ Yes |
| **Fal AI** | AI image/video generation for Studio | Pro Plan | $49/mo + usage | ✅ Yes |

---

## Core Services (Required)

### Supabase

**Purpose**: Database, Storage, Authentication

**Tier**: Pro Plan ($25/mo)

**Cost Breakdown**:
- Base: $25/mo
- Storage: $0.125/GB beyond included
- Bandwidth: $0.09/GB beyond included

**Environment Variables**:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_BUCKET_PRIVATE=likelee-private
SUPABASE_BUCKET_PUBLIC=likelee-public
SUPABASE_BUCKET_TEMP=likelee-temp
```

**Setup**:
1. Create project at supabase.com
2. Enable Row Level Security (RLS)
3. Create storage buckets (private, public, temp)
4. Configure bucket policies
5. Copy credentials to `.env`

---

### Stripe

**Purpose**: Payment processing, Connect for payouts, Subscriptions

**Tier**: Standard (transaction-based pricing)

**Cost Breakdown**:
- Processing: 2.9% + $0.30 per transaction
- Connect transfers: $0.25 per payout (instant payouts may have additional fees)
- No monthly fee

**Environment Variables**:
```env
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_CLIENT_ID=...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup**:
1. Create Stripe account
2. Enable Stripe Connect
3. Create products and prices for each subscription tier
4. Set up webhook endpoints
5. Copy API keys and price IDs to `.env`

**Price IDs Required**:
- Agency: Basic (monthly/annual), Pro (monthly/annual), IRL Booking
- Creator: Basic, Pro (monthly/annual)
- Brand: Basic, Pro (monthly/annual), Studio Addon
- Studio: Credit packs (Lite, Pro)

---

### DocuSeal

**Purpose**: Contract signing, document workflows

**Tier**: Starter ($49/mo) or Business ($99/mo)

**Cost Breakdown**:
- Starter: $49/mo, 100 documents/mo
- Business: $99/mo, unlimited documents
- Enterprise: Custom pricing

**Environment Variables**:
```env
DOCUSEAL_API_KEY=...
DOCUSEAL_API_URL=https://api.docuseal.com
DOCUSEAL_APP_URL=https://docuseal.co
DOCUSEAL_MASTER_TEMPLATE_ID=...
```

**Setup**:
1. Create DocuSeal account
2. Create master contract template
3. Copy template ID and API key
4. Configure webhook URL for status updates

---

### Fal AI

**Purpose**: AI image/video generation for Studio module

**Tier**: Pro ($49/mo)

**Cost Breakdown**:
- Pro: $49/mo + usage costs
- Usage: ~$0.01-0.10 per generation (varies by model)

**Environment Variables**:
```env
FAL_API_KEY=...
FAL_API_URL=https://queue.fal.run
```

**Setup**:
1. Create Fal account
2. Subscribe to Pro plan
3. Copy API key
4. Monitor usage in dashboard

---

### Veriff

**Purpose**: KYC identity verification for agencies and creators

**Tier**: Business ($99/mo)

**Cost Breakdown**:
- Business: $99/mo platform fee
- Per-session: $0.50-2.00 per verification (varies by region/depth)

**Environment Variables**:
```env
VERIFF_BASE_URL=https://veriff.me.api
VERIFF_API_KEY=...
VERIFF_SHARED_SECRET=...
```

**Setup**:
1. Create Veriff account
2. Complete business verification
3. Copy API key and shared secret from Integrations page
4. Configure webhook URL for verification callbacks

---

### SMTP Provider

**Purpose**: Transactional email (notifications, reminders, contact)

**Tier**: Usually free with hosting provider

**Options**:
- Gmail SMTP (free, requires app password)
- SendGrid (free tier: 100 emails/day)
- AWS SES ($0.10 per 1000 emails)
- Mailgun (free tier: 5000 emails/mo)

**Environment Variables**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=noreply@likelee.ai
```

---

## Optional Services

### Calendly

**Purpose**: IRL booking scheduling for agencies

**Tier**: Free or Standard ($8/mo/user)

**Cost Breakdown**:
- Free: Basic scheduling
- Standard: $8/mo/user, group events, reminders

**Environment Variables**:
```env
CALENDLY_BOOKING_URL=...
CALENDLY_API_TOKEN=...
```

**When to Use**: Agencies offering IRL (in-real-life) booking services

---

### ElevenLabs

**Purpose**: Voice synthesis, text-to-speech for Studio

**Tier**: Free or Starter ($5/mo)

**Cost Breakdown**:
- Free: 10,000 characters/mo (~10 min audio)
- Starter: $5/mo, 30,000 characters (~30 min)

**Environment Variables**:
```env
ELEVENLABS_API_KEY=...
```

**When to Use**: Pro creators requesting voice synthesis features

---

### Apify

**Purpose**: Instagram profile scraping for talent discovery

**Tier**: Free or Starter ($49/mo)

**Cost Breakdown**:
- Free: Limited runs, shared proxies
- Starter: $49/mo, dedicated proxies, more runs

**Environment Variables**:
```env
APIFY_API_TOKEN=...
APIFY_INSTAGRAM_PROFILE_SCRAPER_ACTOR_ID=apify/instagram-profile-scraper
```

**When to Use**: Talent scouting and Instagram profile import features

---

## Estimated Monthly Costs by Scale

| Scale | Estimated Monthly Cost | Breakdown |
|-------|------------------------|-----------|
| **MVP/Launch** | ~$150-200/mo | Supabase Pro ($25), DocuSeal Starter ($49), Fal Pro ($49), Stripe (transactional), SMTP (free) |
| **Growth** | ~$300-500/mo | Add Veriff ($99), upgrade DocuSeal, higher AI usage |
| **Scale** | ~$500-1000/mo | Higher storage, more AI generations, more KYC sessions, Calendly Pro |

---

## Service Dependency Matrix

| Feature | Required Services |
|---------|-------------------|
| User Authentication | Supabase |
| File Storage | Supabase Storage |
| Agency Onboarding | Supabase, Veriff |
| Contract Signing | DocuSeal |
| Subscription Billing | Stripe |
| Creator Payouts | Stripe Connect |
| AI Image Generation | Fal AI |
| IRL Booking | Calendly |
| Voice Synthesis | ElevenLabs |
| Instagram Import | Apify |
| Email Notifications | SMTP |

---

## Environment Variable Reference

See the root `.env.example` file for the complete list of environment variables organized by service.

**Required for Core Operation**:
- All Supabase variables
- All Stripe variables
- Veriff variables (for agency KYC)
- DocuSeal variables (for contracts)
- Fal variables (for Studio)
- SMTP variables (for notifications)

**Optional Features**:
- Calendly variables → IRL booking
- ElevenLabs variables → Voice synthesis
- Apify variables → Instagram scraping

---

## Getting Started Checklist

### Minimum Viable Setup

- [ ] Create Supabase project (Pro plan)
- [ ] Configure Stripe account and products
- [ ] Set up DocuSeal template
- [ ] Configure SMTP provider
- [ ] Copy all credentials to `.env`

### Full Feature Setup

- [ ] Complete minimum setup above
- [ ] Create Veriff account (Business plan)
- [ ] Create Fal AI account (Pro plan)
- [ ] (Optional) Configure Calendly for IRL booking
- [ ] (Optional) Configure ElevenLabs for voice
- [ ] (Optional) Configure Apify for Instagram scraping

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [storage/README.md](./storage/README.md) - Storage documentation
- Root `.env.example` - Complete environment variable reference
