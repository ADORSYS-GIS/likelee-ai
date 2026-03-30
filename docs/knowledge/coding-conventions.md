# Coding Conventions — likelee-server

## Naming Standards

| Element         | Convention             | Example                                         |
| --------------- | ---------------------- | ----------------------------------------------- |
| Variables       | `snake_case`           | `user_id`, `payout_amount`                      |
| Functions       | `snake_case`           | `get_wallet_balance`, `submit_generation`       |
| Structs/Enums   | `PascalCase`           | `ServerConfig`, `AppState`, `Provider`          |
| Constants       | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_SIZE`, `DEFAULT_PORT`               |
| Module files    | `snake_case.rs`        | `payouts.rs`, `studio_wallet.rs`                |
| Database tables | `snake_case` (plural)  | `studio_wallets`, `agency_payouts`              |
| API endpoints   | `kebab-case`           | `/api/studio/generate`, `/api/talent/book-outs` |

## File Organization

```
likelee-server/
├── src/
│   ├── main.rs           # Entry point, server initialization
│   ├── config.rs         # ServerConfig, AppState (centralized config)
│   ├── router.rs         # All API route definitions
│   ├── auth.rs           # JWT authentication middleware
│   ├── error.rs          # Error types and handlers
│   ├── billing.rs        # Stripe checkout sessions
│   ├── payouts.rs        # Stripe Connect, payout logic, webhooks
│   ├── kyc.rs            # Veriff integration
│   ├── liveness.rs       # AWS Rekognition liveness detection
│   ├── voice.rs          # Voice recording and cloning
│   ├── calendly.rs       # Calendly IRL booking integration
│   ├── talent.rs         # Talent Portal endpoints
│   ├── brand_campaigns.rs # Brand campaign and offer management
│   ├── agency_talent_invites.rs # Agency talent invitation system
│   ├── creator_agency_connection.rs # Creator-agency connections
│   ├── face_profiles.rs  # Marketplace and brand connections
│   ├── licenses.rs       # License management
│   ├── invoices.rs       # Invoice CRUD
│   ├── email.rs          # SMTP email sending
│   ├── notifications.rs  # Notification system
│   ├── jobs.rs           # Background jobs (payment reminders, scheduler)
│   └── studio/           # AI generation module
│       ├── mod.rs        # Module exports
│       ├── routes.rs     # Studio API endpoints
│       ├── providers.rs  # Fal/Higgsfield/Kive integrations
│       ├── wallet.rs     # Credit wallet logic
│       └── types.rs      # Request/response types
├── docs/
│   └── knowledge/        # Project documentation
├── .env.example          # Environment variable template
└── Cargo.toml            # Rust dependencies
```

## Code Formatting

- **Formatter**: `rustfmt` (via `cargo fmt`)
- **Config file**: `rustfmt.toml` or `Cargo.toml` `[rustfmt]` section
- **Max line length**: 100 characters (default)
- **Indentation**: 4 spaces
- **Trailing commas**: Yes, for multiline items
- **Brace style**: Same line for functions and structs

Run formatting:

```bash
cargo fmt
```

## Import Ordering

Imports are grouped and ordered as follows:

1. **Standard library** (`std::`, `core::`)
2. **External crates** (`axum::`, `serde::`, `anyhow::`, etc.)
3. **Internal modules** (`crate::`)
4. **Relative imports** (`super::`, `self::`)

Example:

```rust
use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use tracing::{info, error};
use uuid::Uuid;

use crate::config::AppState;
use crate::studio::wallet;
```

## Comment Standards

- **Public APIs**: Document with `///` doc comments
- **Complex logic**: Use `//` comments to explain WHY, not WHAT
- **TODO format**: `// TODO: description` or `// TODO(username): description`
- **Deprecated code**: Use `#[deprecated]` attribute with note

Example:

```rust
/// Deducts credits from a user's wallet for a generation job.
///
/// Returns an error if the user has insufficient balance.
pub async fn deduct_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
) -> Result<(), anyhow::Error> {
    // Check balance first to avoid negative balances
    let has_balance = check_balance(pg, user_id, amount).await?;
    ...
}
```

## Error Handling

- Use `anyhow::Error` for application errors
- Return `(StatusCode, String)` tuples for HTTP error responses
- Use `thiserror` for custom error types when needed

```rust
// Good: Descriptive error with context
.map_err(|e| {
    error!(error = %e, user_id = %user_id, "failed to check balance");
    (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to check balance: {}", e))
})?;

// Good: User-facing error
return Err((
    StatusCode::PAYMENT_REQUIRED,
    "Insufficient credits. Please purchase more.".to_string(),
));
```

## Commit Message Format

Follow Conventional Commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:

- `feat(studio): add silent failure detection for generation jobs`
- `fix(payouts): correct fee calculation for instant payouts`
- `docs(config): document LIVENESS_ENABLED environment variable`

## Code Review Checklist

- [ ] All environment variables added to `ServerConfig` in `config.rs`
- [ ] `.env.example` updated with new variables
- [ ] `docs/design.md` updated for new features
- [ ] No hardcoded secrets or credentials
- [ ] Error handling returns appropriate HTTP status codes
- [ ] Logging statements use `tracing` macros (`info!`, `error!`, `warn!`)
- [ ] Database queries use parameterized inputs (PostgREST handles this)
- [ ] New routes added to `router.rs` with appropriate middleware
