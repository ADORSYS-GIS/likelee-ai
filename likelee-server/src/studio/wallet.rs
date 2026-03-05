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

/// Get the cost for a specific provider/model/generation_type
pub async fn get_generation_cost(
    pg: &Postgrest,
    provider: &str,
    model: &str,
    generation_type: &str,
) -> Result<i64> {
    let resp = pg
        .from("studio_provider_costs")
        .select("cost_per_generation")
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
            "video" => 15,
            "image" => 3,
            "image_to_video" => 15,
            _ => 5,
        });
    }

    let body = resp.text().await?;
    let cost_obj: serde_json::Value = serde_json::from_str(&body)?;
    let cost = cost_obj["cost_per_generation"]
        .as_i64()
        .ok_or_else(|| anyhow!("missing cost_per_generation"))?;

    Ok(cost)
}

/// Check if user has sufficient balance
pub async fn check_balance(pg: &Postgrest, user_id: &str, required_credits: i64) -> Result<bool> {
    let (_, balance) = get_or_create_wallet(pg, user_id).await?;
    Ok(balance >= required_credits)
}

/// Deduct credits from wallet and record transaction
/// Returns new balance
pub async fn deduct_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
    provider: &str,
    generation_id: &str,
) -> Result<i64> {
    let (wallet_id, current_balance) = get_or_create_wallet(pg, user_id).await?;

    if current_balance < amount {
        return Err(anyhow!(
            "insufficient credits: have {}, need {}",
            current_balance,
            amount
        ));
    }

    let new_balance = current_balance - amount;

    // Update wallet balance
    let update = json!({
        "balance": new_balance,
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
        return Err(anyhow!("failed to update wallet: {}", error_text));
    }

    // Record transaction
    let transaction = json!({
        "wallet_id": wallet_id,
        "delta": -amount,
        "balance_after": new_balance,
        "reason": "generation_deduction",
        "provider": provider,
        "generation_id": generation_id
    });

    let _ = pg
        .from("studio_credit_transactions")
        .insert(transaction.to_string())
        .execute()
        .await?;

    Ok(new_balance)
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

/// Refund credits to wallet (e.g., on generation failure)
pub async fn refund_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
    provider: &str,
    generation_id: &str,
) -> Result<i64> {
    let (wallet_id, current_balance) = get_or_create_wallet(pg, user_id).await?;
    let new_balance = current_balance + amount;

    // Update wallet balance
    let update = json!({
        "balance": new_balance,
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
        return Err(anyhow!("failed to update wallet: {}", error_text));
    }

    // Record transaction
    let transaction = json!({
        "wallet_id": wallet_id,
        "delta": amount,
        "balance_after": new_balance,
        "reason": "generation_refund",
        "provider": provider,
        "generation_id": generation_id
    });

    let _ = pg
        .from("studio_credit_transactions")
        .insert(transaction.to_string())
        .execute()
        .await?;

    Ok(new_balance)
}

/// Add credits to wallet (for purchases)
pub async fn add_credits(
    pg: &Postgrest,
    user_id: &str,
    amount: i64,
    stripe_session_id: Option<&str>,
) -> Result<i64> {
    let (wallet_id, current_balance) = get_or_create_wallet(pg, user_id).await?;
    let new_balance = current_balance + amount;

    // Update wallet balance
    let update = json!({
        "balance": new_balance,
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
        return Err(anyhow!("failed to update wallet: {}", error_text));
    }

    // Record transaction
    let transaction = json!({
        "wallet_id": wallet_id,
        "delta": amount,
        "balance_after": new_balance,
        "reason": "purchase",
        "stripe_session_id": stripe_session_id
    });

    let _ = pg
        .from("studio_credit_transactions")
        .insert(transaction.to_string())
        .execute()
        .await?;

    Ok(new_balance)
}

/// Reconcile credits after a generation completes with a known actual provider cost.
///
/// `estimated` – credits already deducted at submission time.
/// `actual`    – real credits consumed (from provider billing data).
///
/// Positive diff (estimated > actual): we overcharged → refund the surplus.
/// Negative diff (actual > estimated): we undercharged → deduct the extra.
/// Zero diff: no-op.
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

    let (wallet_id, current_balance) = get_or_create_wallet(pg, user_id).await?;
    let new_balance = current_balance + diff;

    let update = json!({
        "balance": new_balance,
        "updated_at": chrono::Utc::now().to_rfc3339()
    });
    let resp = pg
        .from("studio_wallets")
        .eq("id", &wallet_id)
        .update(update.to_string())
        .execute()
        .await?;
    if !resp.status().is_success() {
        let err = resp.text().await?;
        return Err(anyhow!("failed to reconcile wallet: {}", err));
    }

    let reason = if diff > 0 {
        "generation_refund_reconcile"
    } else {
        "generation_extra_deduction"
    };
    let transaction = json!({
        "wallet_id": wallet_id,
        "delta": diff,
        "balance_after": new_balance,
        "reason": reason,
        "provider": provider,
        "generation_id": generation_id
    });
    let _ = pg
        .from("studio_credit_transactions")
        .insert(transaction.to_string())
        .execute()
        .await?;

    Ok(new_balance)
}
