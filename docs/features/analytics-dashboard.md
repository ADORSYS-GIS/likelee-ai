# Analytics Dashboard Documentation

## Overview
The Analytics Dashboard provides agencies with comprehensive insights into their performance, earnings, licenses, and team metrics in both AI and IRL modes.

## Accessing the Dashboard
Navigate to **Agency Dashboard → Analytics → Analytics Dashboard**

## Dashboard Modes

### AI Mode
For agencies managing AI-generated content licensing
- Earnings from licensing payouts
- Active licenses tracking
- AI usage metrics from catalogs
- External creator consent management

### IRL Mode
For agencies managing traditional bookings
- Earnings from payments
- Active campaigns tracking
- Talent roster performance
- Internal talent consent management

## Key Metrics

### 1. Total Earnings (30d)
- Shows revenue from the last 30 days
- Growth percentage vs previous 30 days
- **AI Mode**: From `licensing_payouts` table
- **IRL Mode**: From `payments` table

### 2. Active Licenses/Campaigns
- Current active licenses (AI) or campaigns (IRL)
- Growth percentage vs 30 days ago
- Helps track business expansion

### 3. AI Usage (30d) - AI Mode Only
- Total assets (images, videos, voice) from catalogs sent to clients
- Growth percentage vs previous period
- Asset type distribution (Image/Video/Voice)

### 4. Consent Status Breakdown
Shows contract status for external creator connections:
- **Complete**: Both parties signed (status='active')
- **Missing**: Pending or declined contracts
- **Expired**: Terminated or expired contracts

### 5. Verification Rate
Shows talent verification status:
- Verified: Talents with portal access AND approved KYC
- Total: All talents in agency roster

## Compliance Tab (AI Mode)

### Metrics Cards
1. **Verification Rate**: Percentage of verified talents
2. **Active Consents**: Percentage of completed contracts
3. **Expired Contracts**: Count of expired licenses this month

### License Expiry Pipeline
- Shows licenses expiring in the current month
- **Renew License** button:
  - Opens License Templates tab
  - Pre-fills template with license details
  - Allows quick renewal process

## Important Notes

### Growth Percentages
- All growth percentages are capped at ±100%
- Prevents misleading displays like "300% growth"
- Calculated by comparing current vs previous period

### Separate Totals
- **Consent Status**: Uses total contracts as denominator
- **Verification Rate**: Uses total talents as denominator
- These are independent metrics with different totals

### Current Month Filtering
- Expired licenses shown are from current month only
- Expired Contracts card shows current month count
- Helps focus on immediate renewal needs

## Data Sources

### AI Mode
| Metric | Table | Key Fields |
|--------|-------|------------|
| Earnings | `licensing_payouts` | `amount_cents`, `paid_at` |
| Active Licenses | `licensing_requests` | `status`, `deadline` |
| AI Usage | `agency_catalogs`, `agency_catalog_assets` | `asset_type` |
| Consent Status | `agency_creator_marketplace_contracts` | `status`, `docuseal_status` |
| Verification | `agency_users`, `creators` | `creator_id`, `kyc_status` |

### IRL Mode
| Metric | Table | Key Fields |
|--------|-------|------------|
| Earnings | `payments` | `gross_cents`, `paid_at` |
| Active Campaigns | `bookings_campaigns` | `status` |
| Consent Status | `agency_users` | `consent_status` |
| Verification | `agency_users`, `creators` | `creator_id`, `kyc_status` |

## Troubleshooting

### No Data Showing
- Ensure you have the correct permissions (Pro access required)
- Check that you're in the correct mode (AI/IRL)
- Verify data exists in the relevant tables

### Expired Licenses Not Showing
- Only current month expired licenses are displayed
- Check if licenses have `template_id` for renewal
- Ensure licenses have `status='approved'` and past deadline

### Renew License Not Working
- Verify the license has a `template_id`
- Check that the template still exists
- Ensure you have permission to create licenses

## API Endpoints

### Main Dashboard
```
GET /api/agency/analytics/dashboard?mode={ai|irl}
```
Returns overview metrics, campaign status, AI usage, monthly trends, and consent status.

### Expired Licenses
```
GET /api/agency/analytics/expired-licenses
```
Returns expired licenses for the current month with template information.

### Roster Insights
```
GET /api/agency/analytics/roster?mode={ai|irl}
```
Returns talent performance metrics and top performers.

### Clients & Campaigns
```
GET /api/agency/analytics/clients-campaigns?mode={ai|irl}
```
Returns client earnings, geographic distribution, and performance metrics.

## Best Practices

1. **Regular Monitoring**: Check dashboard weekly to track trends
2. **Renewal Management**: Address expired licenses promptly using the pipeline
3. **Verification**: Maintain high verification rates for compliance
4. **Growth Tracking**: Monitor growth percentages to identify trends
5. **Mode Selection**: Use the correct mode for your agency type

## Future Enhancements
- Custom date range filtering
- Export to PDF/Excel
- Scheduled email reports
- Predictive analytics for renewals
- Custom dashboard widgets

---

For technical implementation details, see the codebase:
- Backend: `likelee-server/src/analytics.rs`
- Frontend: `likelee-ui/src/components/agency/AnalyticsDashboardView.tsx`
