# Likelee AI Documentation

Welcome to the Likelee AI documentation. This directory contains comprehensive documentation for developers, operators, and stakeholders.

---

## Quick Navigation

### Getting Started

| Document | Purpose |
|----------|---------|
| [SERVICES.md](./SERVICES.md) | External services reference, tiers, and cost estimates |
| [guides/development-setup.md](./guides/development-setup.md) | Local development environment setup |
| [guides/testing-quick-start.md](./guides/testing-quick-start.md) | Testing guide and conventions |

### Architecture

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview |
| [storage/README.md](./storage/README.md) | Storage architecture and organization |
| [database/er-diagram.md](./database/er-diagram.md) | Entity-relationship diagrams |

### Features

| Document | Purpose |
|----------|---------|
| [features/access-control.md](./features/access-control.md) | Access control and permissions system |
| [features/role-separation.md](./features/role-separation.md) | Role separation policy |
| [features/analytics-dashboard.md](./features/analytics-dashboard.md) | Analytics dashboard documentation |

### Guides

| Document | Purpose |
|----------|---------|
| [guides/deployment-staging.md](./guides/deployment-staging.md) | Staging deployment guide |
| [guides/cron-setup.md](./guides/cron-setup.md) | Cron job configuration |
| [conventions/coding-conventions.md](./conventions/coding-conventions.md) | Coding standards |

### API Reference

| Document | Purpose |
|----------|---------|
| [api/reference.md](./api/reference.md) | API endpoint documentation |

---

## Directory Structure

```
docs/
├── README.md                    # This file - navigation index
├── ARCHITECTURE.md              # System architecture overview
├── SERVICES.md                  # External services reference
├── design.md                    # Main design documentation
├── WORKFLOW.md                  # Development workflow
│
├── storage/                     # Storage documentation
│   ├── README.md               # Storage overview
│   ├── architecture.md         # Detailed storage architecture
│   ├── client-server-cache.md  # Client/server caching layers
│   └── testing-guide.md        # Storage testing guide
│
├── features/                    # Feature documentation
│   ├── access-control.md       # Access control system
│   ├── analytics-dashboard.md  # Analytics dashboard
│   ├── role-separation.md      # Role separation policy
│   └── user-profile-separation.md
│
├── guides/                      # Development guides
│   ├── development-setup.md    # Development setup
│   ├── testing-quick-start.md  # Testing guide
│   ├── deployment-staging.md   # Deployment guide
│   └── cron-setup.md           # Cron job setup
│
├── api/                         # API documentation
│   └── reference.md            # API endpoint reference
│
├── conventions/                 # Coding standards
│   └── coding-conventions.md   # Coding conventions
│
├── database/                    # Database documentation
│   ├── er-diagram.md           # Entity relationships
│   └── repository-relations.md # Repository architecture
│
└── archive/                     # Historical documentation
    └── ticket-499-checklist.md # Completed implementation tracking
```

---

## Key Concepts

### User Types

- **Agencies**: Manage talent rosters, handle licensing, process payouts
- **Creators (Faces/Talents)**: Manage profiles, approve licenses, receive payouts
- **Brands**: Discover talent, create campaigns, manage deliverables

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Rust, Axum, PostgREST
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (public, private, temp buckets)
- **Auth**: Supabase Auth (JWT)
- **Payments**: Stripe (Checkout + Connect)
- **AI**: Fal AI
- **KYC**: Veriff
- **Contracts**: DocuSeal

### Cache Architecture

The system uses a three-level **in-memory** caching strategy (no Redis):

1. **L1 (Request Cache)**: Per-request scoped
2. **L2 (Session Cache)**: User session-scoped (5-30 min TTL)
3. **L3 (Application Cache)**: Application-wide shared (1-60 min TTL)

---

## External Dependencies

| Service | Purpose | Required |
|---------|---------|----------|
| Supabase | Database, Storage, Auth | ✅ Yes |
| Stripe | Payments, Connect | ✅ Yes |
| Veriff | KYC verification | ✅ Yes |
| DocuSeal | Contract signing | ✅ Yes |
| Fal AI | AI generation | ✅ Yes |
| Calendly | IRL booking | Optional |
| ElevenLabs | Voice synthesis | Optional |
| Apify | Instagram scraping | Optional |

See [SERVICES.md](./SERVICES.md) for detailed tier recommendations and cost estimates.

---

## Related Resources

### Code Repositories

- `likelee-server/` - Rust backend
- `likelee-ui/` - React frontend
- `supabase/` - Database migrations

### Configuration

- Root `.env.example` - Environment variable reference
- `likelee-server/.env.example` - Server-specific config
- `deploy/ec2/.env.example` - Frontend build config
