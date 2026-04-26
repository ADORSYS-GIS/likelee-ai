# Development & Deployment Workflow

## Quick Reference

### Branches

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | Production EC2 + Prod Supabase |
| `develop` | Integration & testing | Staging EC2 + Staging Supabase |
| `feature/*` | Individual features | No automatic deploy |

### URLs

| Environment | Frontend | API Health |
|-------------|----------|------------|
| Production | `https://app.yourdomain.com/` | `https://app.yourdomain.com/api/health` |
| Staging | `https://staging.yourdomain.com/` | `https://staging.yourdomain.com/api/health` |

---

## Daily Workflow

### 1. Start New Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
```

### 2. Develop & Commit

```bash
# Make changes, commit regularly
git add .
git commit -m "Add feature X"
```

### 3. Create Pull Request to `develop`

```bash
git push origin feature/my-new-feature
```

Then on GitHub:
- Create PR targeting `develop`
- CI runs (lint, test, build)
- Merge when approved

### 4. Test on Staging

After merging to `develop`:
- GitHub Actions automatically deploys to staging
- Visit staging URL to test
- Share with client for review

### 5. Deploy to Production

When staging is validated:
- Create PR from `develop` to `main`
- Merge → auto-deploy to production
- Verify on production URL

---

## Rollback

### Production Rollback

Go to GitHub Actions → `Manual Rollback to Previous Tag (EC2)` → Run workflow

### Staging Rollback

Go to GitHub Actions → `Manual Rollback Staging` → Run workflow

---

## Database Migrations

### Create Migration

```bash
# Using Supabase CLI
supabase migration new my_migration_name
```

### Apply to Staging First

```bash
# Link to staging
supabase link --project-ref <staging-ref>
supabase db push

# Test thoroughly on staging
```

### Apply to Production

```bash
# Link to production
supabase link --project-ref <prod-ref>
supabase db push
```

---

## Environment Secrets Required

In GitHub Settings → Secrets → Actions:

### Production
- `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `GHCR_USER`, `GHCR_TOKEN` (optional)

### Staging
- `STAGING_EC2_HOST`, `STAGING_EC2_USER`, `STAGING_EC2_SSH_KEY`
- `STAGING_VITE_SUPABASE_URL`, `STAGING_VITE_SUPABASE_ANON_KEY`
- `STAGING_GHCR_USER`, `STAGING_GHCR_TOKEN` (optional)
