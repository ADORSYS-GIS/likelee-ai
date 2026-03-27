use anyhow::{anyhow, Result};
use postgrest::Postgrest;
use serde_json::json;

/// Get or create a wallet for a user
pub async fn get_or_create_wallet(pg: &Postgrest, user_id: &str) -> Result<(String, i64)> {
    // Try to get existing wallet
    let resp = pg
        .from("studio_wallets")
        .select("id,balance")
        .eq("user_id", user_id)
        .execute()
        .await?;

    if resp.status().is_success() {
        let body = resp.text().await?;
        let wallets: Vec<serde_json::Value> = serde_json::from_str(&body)?;

        if let Some(wallet) = wallets.first() {
            let wallet_id = wallet["id"]
                .as_str()
                .ok_or_else(|| anyhow!("missing wallet id"))?
                .to_string();
            let balance = wallet["balance"]
                .as_i64()
                .ok_or_else(|| anyhow!("missing balance"))?;
            return Ok((wallet_id, balance));
        }
    }

    // Create new wallet if doesn't exist
    let new_wallet = json!({
        "user_id": user_id,
        "balance": 0
    });

    let resp = pg
        .from("studio_wallets")
        .insert(new_wallet.to_string())
        .execute()
        .await?;

    if !resp.status().is_success() {
        let error_text = resp.text().await?;
        return Err(anyhow!("failed to create wallet: {}", error_text));
    }

    let body = resp.text().await?;
    let created: Vec<serde_json::Value> = serde_json::from_str(&body)?;

    let wallet = created
        .first()
        .ok_or_else(|| anyhow!("no wallet returned"))?;
    let wallet_id = wallet["id"]
        .as_str()
        .ok_or_else(|| anyhow!("missing wallet id"))?
        .to_string();

    Ok((wallet_id, 0))
}

/// Internal helper to call the atomic adjust_wallet_credits RPC function.
/// Returns (balance_before, balance_after) on success.
async fn call_adjust_wallet_credits(
    pg: &Postgrest,
    user_id: &str,
    delta: i64,
    reason: &str,
    provider: Option<&str>,
    generation_id: Option<&str>,
    stripe_session_id: Option<&str>,
) -> Result<(i64, i64)> {
    let payload = json!({
        "p_user_id": user_id,
        "p_delta": delta,
        "p_reason": reason,
        "p_provider": provider,
        "p_generation_id": generation_id,
        "p_stripe_session_id": stripe_session_id
    });

    let resp = pg
        .rpc("adjust_wallet_credits", payload.to_string())
        .execute()
        .await?;

    if !resp.status().is_success() {
        let error_text = resp.text().await?;
        return Err(anyhow!("adjust_wallet_credits RPC failed: {}", error_text));
    }

    let body = resp.text().await?;
    let result: serde_json::Value = serde_json::from_str(&body)?;

    let balance_before = result["balance_before"]
        .as_i64()
        .ok_or_else(|| anyhow!("missing balance_before in RPC response"))?;
    let balance_after = result["balance_after"]
        .as_i64()
        .ok_or_else(|| anyhow!("missing balance_after in RPC response"))?;

    Ok((balance_before, balance_after))
}

/// Get the cost for a specific provider/model/generation_type
pub async fn get_generation_cost(
    pg: &Postgrest,
    provider: &str,
    model: &str,
    generation_type: &str,
    input_params: Option<&serde_json::Value>,
) -> Result<i64> {
    let resp = pg
        .from("studio_provider_costs")
        .select("cost_per_generation,cost_modifiers")
        .eq("provider", provider)
        .eq("model", model)
        .eq("generation_type", generation_type)
        .eq("enabled", "true")
        .single()
        .execute()
        .await?;

    if !resp.status().is_success() {
        // If cost not found in DB, return a default cost based on type
        return Ok(match generation_type {
            "video" => 5,
            "image" => 1,
            "image_to_video" => 5,
            "video_upscale" => 15,
            _ => 5,
        });
    }

    let body = resp.text().await?;
    let cost_obj: serde_json::Value = serde_json::from_str(&body)?;
    let base_cost = cost_obj["cost_per_generation"]
        .as_i64()
        .ok_or_else(|| anyhow!("missing cost_per_generation"))?;

    // Apply modifiers if input_params provided
    let mut final_cost = base_cost;
    if let Some(params) = input_params {
        if let Some(modifiers) = cost_obj["cost_modifiers"].as_object() {
            // High Resolution Multipliers
            if let Some(res_multipliers) = modifiers.get("resolution_multipliers") {
                if let Some(requested_res) = params.get("resolution").and_then(|r| r.as_str()) {
                    if let Some(multiplier) =
                        res_multipliers.get(requested_res).and_then(|m| m.as_f64())
                    {
                        final_cost = (base_cost as f64 * multiplier).round() as i64;
                    }
                }
            }
        }
    }

    Ok(final_cost)
}

/// Check if user has sufficient balance
pub async fn check_balance(pg: &Postgrest, user_id: &str, required_credits: i64) -> Result<bool> {
    let (_, balance) = get_or_create_wallet(pg, user_id).await?;
    Ok(balance >= required_credits)
}

/// Deduct credits from wallet and record transaction atomically.
/// Uses PostgreSQL RPC to ensure atomicity: both balance update and transaction
/// record succeed together or roll back together.
/// Returns new balance on success.
pub async fn deduct_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
    provider: &str,
    generation_id: &str,
) -> Result<i64> {
    // Use atomic RPC: negative delta for deduction
    let (_, balance_after) = call_adjust_wallet_credits(
        pg,
        user_id,
        -amount, // negative for deduction
        "generation_deduction",
        Some(provider),
        Some(generation_id),
        None,
    )
    .await?;

    Ok(balance_after)
}

pub async fn set_current_plan(pg: &Postgrest, user_id: &str, plan: Option<&str>) -> Result<()> {
    let plan = plan.unwrap_or("").trim().to_lowercase();
    if plan != "lite" && plan != "pro" {
        return Ok(());
    }

    let (wallet_id, _) = get_or_create_wallet(pg, user_id).await?;
    let update = json!({
        "current_plan": plan,
        "updated_at": chrono::Utc::now().to_rfc3339()
    });
    let resp = pg
        .from("studio_wallets")
        .eq("id", &wallet_id)
        .update(update.to_string())
        .execute()
        .await?;
    if !resp.status().is_success() {
        let error_text = resp.text().await?;
        return Err(anyhow!("failed to update current plan: {}", error_text));
    }

    Ok(())
}

/// Refund credits to wallet (e.g., on generation failure) atomically.
/// Uses PostgreSQL RPC to ensure atomicity: both balance update and transaction
/// record succeed together or roll back together.
/// Returns new balance on success.
pub async fn refund_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
    provider: &str,
    generation_id: &str,
) -> Result<i64> {
    // Use atomic RPC: positive delta for refund
    let (_, balance_after) = call_adjust_wallet_credits(
        pg,
        user_id,
        amount, // positive for refund
        "generation_refund",
        Some(provider),
        Some(generation_id),
        None,
    )
    .await?;

    Ok(balance_after)
}

/// Add credits to wallet (for purchases) atomically.
/// Uses PostgreSQL RPC to ensure atomicity: both balance update and transaction
/// record succeed together or roll back together.
/// Returns new balance on success.
pub async fn add_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
    stripe_session_id: Option<&str>,
) -> Result<i64> {
    // Use atomic RPC: positive delta for credit addition
    let (_, balance_after) = call_adjust_wallet_credits(
        pg,
        user_id,
        amount,
        "purchase",
        None,
        None,
        stripe_session_id,
    )
    .await?;

    Ok(balance_after)
}

/// Reconcile credits after a generation completes with a known actual provider cost.
///
/// `estimated` – credits already deducted at submission time.
/// `actual`    – real credits consumed (from provider billing data).
///
/// Positive diff (estimated > actual): we overcharged → refund the surplus.
/// Negative diff (actual > estimated): we undercharged → deduct the extra.
/// Zero diff: no-op.
/// Uses PostgreSQL RPC to ensure atomicity: both balance update and transaction
/// record succeed together or roll back together.
pub async fn reconcile_credits(
    pg: &Postgrest,
    user_id: &str,
    estimated: i64,
    actual: i64,
    provider: &str,
    generation_id: &str,
) -> Result<i64> {
    let diff = estimated - actual; // positive ⟹ refund, negative ⟹ extra charge
    if diff == 0 {
        let (_, bal) = get_or_create_wallet(pg, user_id).await?;
        return Ok(bal);
    }

    let reason = if diff > 0 {
        "generation_refund_reconcile"
    } else {
        "generation_extra_deduction"
    };

    // Use atomic RPC for the adjustment
    let (_, balance_after) = call_adjust_wallet_credits(
        pg,
        user_id,
        diff,
        reason,
        Some(provider),
        Some(generation_id),
        None,
    )
    .await?;

    Ok(balance_after)
}
