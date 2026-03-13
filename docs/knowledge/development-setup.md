# Development Setup — likelee-server

## Prerequisites

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| Rust | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` |
| Cargo | Included with Rust | - |
| Supabase CLI | Latest | `npm install -g supabase` or `brew install supabase/tap/supabase` |
| Git | 2.40+ | `brew install git` or package manager |

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ADORSYS-GIS/Likelee-AI.git
cd Likelee-AI/likelee-server
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key from Supabase dashboard |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret from Supabase dashboard |
| `FRONTEND_URL` | Yes | Frontend URL for redirects |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | From Stripe CLI or dashboard |
| `FAL_API_KEY` | For Studio | Fal API key for AI generation |
| `VERIFF_API_KEY` | For KYC | Veriff API key |

### 3. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations:
   ```bash
   supabase db push
   ```
   Or apply migrations manually via the Supabase dashboard SQL editor.

3. Enable Row Level Security (RLS) - included in migrations

4. Create storage buckets:
   - `likelee-private` (private)
   - `likelee-public` (public)
   - `likelee-temp` (temporary)

## Running Locally

```bash
# From likelee-server directory
cargo run
```

Or with auto-reload using `cargo-watch`:
```bash
cargo install cargo-watch
cargo watch -x run
```

The server will be available at `http://localhost:8787`.

## Running Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture
```

## Linting and Formatting

```bash
# Format code
cargo fmt

# Check for issues
cargo clippy

# Fix auto-fixable issues
cargo clippy --fix
```

## Building for Production

```bash
# Build optimized binary
cargo build --release

# Binary location
./target/release/likelee-server
```

## Stripe Webhooks (Local Development)

For local Stripe webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8787/webhooks/stripe
```

## Database Migrations

Migrations are stored in `supabase/migrations/` at the repository root.

### Creating a New Migration

```bash
# From repository root
supabase migration new your_migration_name
```

### Applying Migrations

```bash
supabase db push
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `SUPABASE_URL` not found | Ensure `.env` file exists in `likelee-server/` directory |
| JWT validation fails | Check `SUPABASE_JWT_SECRET` matches your Supabase project |
| Stripe webhooks not received | Run `stripe listen --forward-to localhost:8787/webhooks/stripe` |
| Port already in use | Change `PORT` in `.env` or kill the process using port 8787 |
| Rekognition errors | Ensure AWS credentials are set via env vars or IAM role |
| Build fails | Run `cargo clean` then `cargo build` |

### Debug Logging

Enable debug logs:
```bash
RUST_LOG=debug cargo run
```

### Checking Configuration

The server logs configuration on startup. Check console output for:
- `payout_config_loaded` - Payout settings
- `storage buckets ensured` - Storage bucket creation
- `rekognition: disabled` or `AWS Rekognition client initialized`
