use super::providers;
use super::types::*;
use super::wallet;
use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    extract::{Multipart, Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use tracing::{error, info, warn};
use uuid::Uuid;

fn parse_postgrest_array(body: &str) -> Result<Vec<serde_json::Value>, (StatusCode, String)> {
    serde_json::from_str::<Vec<serde_json::Value>>(body).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse response: {}", e),
        )
    })
}

#[derive(serde::Deserialize)]
pub struct ListGenerationsQuery {
    pub generation_type: Option<String>,
    pub limit: Option<u32>,
}

/// POST /api/studio/generate
/// Submit a new generation job
pub async fn generate(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(req): Json<GenerateRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_id = auth_user.id;
    info!(
        user_id = %user_id,
        provider = ?req.provider,
        model = %req.model,
        "studio_generate_request"
    );

    let provider_str = req.provider.as_str();
    let generation_type_str = req.generation_type.as_str();

    // Get cost for this generation
    let cost = wallet::get_generation_cost(&state.pg, provider_str, &req.model, generation_type_str)
        .await
        .map_err(|e| {
            error!(error = %e, "failed to get generation cost");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to get generation cost: {}", e))
        })?;

    // Check if user has sufficient balance
    let has_balance = wallet::check_balance(&state.pg, &user_id, cost)
        .await
        .map_err(|e| {
            error!(error = %e, "failed to check balance");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to check balance: {}", e))
        })?;

    if !has_balance {
        return Err((
            StatusCode::PAYMENT_REQUIRED,
            format!("Insufficient credits. Required: {}, please purchase more credits.", cost),
        ));
    }

    // Create generation record
    let generation_id = Uuid::new_v4().to_string();
    let campaign_id_value = req.campaign_id.as_ref().map(|s| json!(s)).unwrap_or(json!(null));

    let generation = json!({
        "id": generation_id,
        "user_id": user_id,
        "campaign_id": campaign_id_value,
        "provider": provider_str,
        "model": req.model,
        "generation_type": generation_type_str,
        "status": "pending",
        "input_params": req.input_params,
        "credits_used": cost
    });

    let insert_resp = state.pg
        .from("studio_generations")
        .insert(generation.to_string())
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "failed to insert generation");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create generation: {}", e))
        })?;

    if !insert_resp.status().is_success() {
        let error_text = insert_resp.text().await.unwrap_or_default();
        error!(error = %error_text, "failed to insert generation");
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create generation: {}", error_text),
        ));
    }

    // Deduct credits from wallet
    wallet::deduct_credits(&state.pg, &user_id, cost, provider_str, &generation_id)
        .await
        .map_err(|e| {
            error!(error = %e, "failed to deduct credits");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to deduct credits: {}", e))
        })?;

    // Submit job to provider
    let provider_job_id = match req.provider {
        Provider::Fal => {
            let submit_result = providers::fal_submit_job(
                &state.fal_api_key,
                &state.fal_api_url,
                &req.model,
                &req.input_params,
            )
            .await;

            match submit_result {
                Ok(result) => {
                    // Store Fal-provided status/response URLs so we never reconstruct them wrongly
                    let meta = serde_json::json!({
                        "fal_status_url": result.status_url,
                        "fal_response_url": result.response_url
                    });
                    let _ = state.pg
                        .from("studio_generations")
                        .eq("id", &generation_id)
                        .update(serde_json::json!({ "output_metadata": meta }).to_string())
                        .execute()
                        .await;
                    Ok(result.request_id)
                }
                Err(e) => Err(e),
            }
        }
    };

    match provider_job_id {
        Ok(job_id) => {
            // Update generation with provider job ID and status
            let update = json!({
                "provider_job_id": job_id,
                "status": "processing",
                "updated_at": chrono::Utc::now().to_rfc3339()
            });

            let _ = state.pg
                .from("studio_generations")
                .eq("id", &generation_id)
                .update(update.to_string())
                .execute()
                .await;

            info!(
                generation_id = %generation_id,
                provider_job_id = %job_id,
                "generation_submitted"
            );

            Ok(Json(GenerateResponse {
                generation_id: generation_id.clone(),
                status: GenerationStatus::Processing,
                credits_used: cost,
            }))
        }
        Err(e) => {
            error!(error = %e, generation_id = %generation_id, "provider_submission_failed");

            // Update generation as failed
            let update = json!({
                "status": "failed",
                "error_message": e.to_string(),
                "updated_at": chrono::Utc::now().to_rfc3339()
            });

            let _ = state.pg
                .from("studio_generations")
                .eq("id", &generation_id)
                .update(update.to_string())
                .execute()
                .await;

            // Refund credits
            let _ = wallet::refund_credits(&state.pg, &user_id, cost, provider_str, &generation_id).await;

            Err((
                StatusCode::BAD_GATEWAY,
                format!("Provider error: {}", e),
            ))
        }
    }
}

/// GET /api/studio/jobs/:id
/// Check status of a generation job
pub async fn job_status(
    State(state): State<AppState>,
    Path(job_id): Path<String>,
    auth_user: AuthUser,
) -> Result<Json<JobStatusResponse>, (StatusCode, String)> {
    let user_id = auth_user.id;
    // Load generation by id (we use generation_id as the job id)
    let gen_resp = state
        .pg
        .from("studio_generations")
        .select("*")
        .eq("id", &job_id)
        .eq("user_id", &user_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "failed to fetch generation");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch generation: {}", e))
        })?;

    if !gen_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Generation not found".to_string()));
    }

    let body = gen_resp.text().await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read response: {}", e))
    })?;

    let generation: serde_json::Value = serde_json::from_str(&body).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse generation: {}", e))
    })?;

    let status_str = generation["status"].as_str().unwrap_or("pending");
    let provider_job_id = generation["provider_job_id"].as_str();
    let provider_str = generation["provider"].as_str().unwrap_or("fal");
    let model = generation["model"].as_str().unwrap_or("");

    // If already completed or failed (with URLs), return from DB
    // Exception: completed with empty output_urls — we fall through to re-fetch from provider
    let db_output_urls: Vec<String> = generation["output_urls"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    if (status_str == "completed" && !db_output_urls.is_empty())
        || status_str == "failed"
        || status_str == "cancelled"
    {
        return Ok(Json(JobStatusResponse {
            generation_id: job_id,
            status: match status_str {
                "completed" => GenerationStatus::Completed,
                "failed" => GenerationStatus::Failed,
                "cancelled" => GenerationStatus::Cancelled,
                _ => GenerationStatus::Pending,
            },
            output_urls: db_output_urls,
            output_metadata: generation["output_metadata"].as_object().map(|_| generation["output_metadata"].clone()),
            error_message: generation["error_message"].as_str().map(String::from),
        }));
    }

    // Check status from provider
    if let Some(provider_job_id) = provider_job_id {
        // Read stored Fal URLs from output_metadata (stored during submission)
        let fal_status_url = generation["output_metadata"]["fal_status_url"].as_str().map(String::from);
        let fal_response_url = generation["output_metadata"]["fal_response_url"].as_str().map(String::from);

        let provider_status = match provider_str {
            "fal" => {
                providers::fal_check_status(
                    &state.fal_api_key,
                    &state.fal_api_url,
                    model,
                    provider_job_id,
                    fal_status_url.as_deref(),
                    fal_response_url.as_deref(),
                )
                .await
            }
            _ => {
                return Err((StatusCode::BAD_REQUEST, "Unknown provider".to_string()));
            }
        };

        match provider_status {
            Ok(status) => {
                // Build the DB update:
                // - Final state with URLs: write status + output_urls + output_metadata
                // - Final state (failed): write status + error + output_metadata
                // - Intermediate (pending/processing/completed-no-urls): ONLY update status
                //   so we never overwrite the fal_status_url / fal_response_url stored at submission
                let update = if matches!(status.status, GenerationStatus::Completed) && !status.output_urls.is_empty() {
                    json!({
                        "status": status.status.as_str(),
                        "output_urls": status.output_urls,
                        "output_metadata": status.output_metadata,
                        "error_message": status.error_message,
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    })
                } else if matches!(status.status, GenerationStatus::Failed) {
                    json!({
                        "status": status.status.as_str(),
                        "output_metadata": status.output_metadata,
                        "error_message": status.error_message,
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    })
                } else if matches!(status.status, GenerationStatus::Completed) && status.output_urls.is_empty() {
                    // Fal says completed, but we found no URLs. 
                    // This case is now mostly handled inside `fal_check_status` (returns Failed if inference time < 1s).
                    // If we get here, it means inference time was > 1s but still no URLs.
                    // We'll log a warning and keep it as processing for one more poll, 
                    // but we should eventually time out (handled by frontend poll cap).
                    warn!(
                        generation_id = %job_id,
                        "fal_check_status: reported completed but no URLs found (and not flagged as silent failure); keeping as processing"
                    );
                    json!({
                        "status": "processing",
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    })
                } else {
                    // Still in flight — only record the latest status string;
                    // do NOT touch output_metadata so fal_status_url survives
                    json!({
                        "status": status.status.as_str(),
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    })
                };

                let _ = state.pg
                    .from("studio_generations")
                    .eq("id", &job_id)
                    .update(update.to_string())
                    .execute()
                    .await;

                // On successful completion: reconcile the pre-deducted estimated credits
                // against the actual provider cost stored in output_metadata.
                if matches!(status.status, GenerationStatus::Completed) && !status.output_urls.is_empty() {
                    let estimated_credits = generation["credits_used"].as_i64().unwrap_or(0);
                    let actual_credits = status.output_metadata
                        .as_ref()
                        .and_then(|m| m.get("fal_cost_credits"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0);

                    if actual_credits > 0 {
                        info!(
                            generation_id = %job_id,
                            estimated = estimated_credits,
                            actual = actual_credits,
                            "reconciling_fal_credits"
                        );
                        let _ = wallet::reconcile_credits(
                            &state.pg, &user_id,
                            estimated_credits, actual_credits,
                            provider_str, &job_id,
                        ).await;

                        // Update credits_used in the DB to the actual cost
                        let _ = state.pg
                            .from("studio_generations")
                            .eq("id", &job_id)
                            .update(json!({ "credits_used": actual_credits }).to_string())
                            .execute()
                            .await;
                    }
                }

                // On failure: refund the full estimated cost
                if matches!(status.status, GenerationStatus::Failed) {
                    let credits_used = generation["credits_used"].as_i64().unwrap_or(0);
                    let _ = wallet::refund_credits(&state.pg, &user_id, credits_used, provider_str, &job_id).await;
                }

                Ok(Json(JobStatusResponse {
                    generation_id: job_id,
                    status: status.status,
                    output_urls: status.output_urls,
                    output_metadata: status.output_metadata,
                    error_message: status.error_message,
                }))
            }
            Err(e) => {
                error!(error = %e, "failed to check provider status");
                // Return current DB status if provider check fails
                let output_urls: Vec<String> = generation["output_urls"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                Ok(Json(JobStatusResponse {
                    generation_id: job_id,
                    status: GenerationStatus::Processing,
                    output_urls,
                    output_metadata: None,
                    error_message: Some(format!("Failed to check status: {}", e)),
                }))
            }
        }
    } else {
        // No provider job ID yet
        Ok(Json(JobStatusResponse {
            generation_id: job_id,
            status: GenerationStatus::Pending,
            output_urls: vec![],
            output_metadata: None,
            error_message: None,
        }))
    }
}

/// GET /api/studio/wallet
/// Get user's wallet balance
pub async fn get_wallet(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<WalletResponse>, (StatusCode, String)> {
    let user_id = auth_user.id;
    let (_, balance) = wallet::get_or_create_wallet(&state.pg, &user_id)
        .await
        .map_err(|e| {
            error!(error = %e, "failed to get wallet");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to get wallet: {}", e))
        })?;

    let plan_resp = state
        .pg
        .from("studio_wallets")
        .select("current_plan")
        .eq("user_id", &user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let current_plan = if plan_resp.status().is_success() {
        let text = plan_resp.text().await.unwrap_or_else(|_| "[]".into());
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        rows.first()
            .and_then(|r| r.get("current_plan"))
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    } else {
        None
    };

    Ok(Json(WalletResponse {
        balance,
        user_id: user_id.clone(),
        current_plan,
    }))
}

/// GET /api/studio/transactions
/// Get user's transaction history
pub async fn list_transactions(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<TransactionResponse>>, (StatusCode, String)> {
    let user_id = auth_user.id;
    let (wallet_id, _) = wallet::get_or_create_wallet(&state.pg, &user_id)
        .await
        .map_err(|e| {
            error!(error = %e, "failed to get wallet");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to get wallet: {}", e))
        })?;

    // Get transactions
    let resp = state.pg
        .from("studio_credit_transactions")
        .select("id,delta,balance_after,reason,provider,generation_id,created_at")
        .eq("wallet_id", &wallet_id)
        .order("created_at.desc")
        .limit(100)
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "failed to fetch transactions");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch transactions: {}", e))
        })?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch transactions: {}", error_text),
        ));
    }

    let body = resp.text().await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read response: {}", e))
    })?;

    let transactions: Vec<serde_json::Value> = serde_json::from_str(&body).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse transactions: {}", e))
    })?;

    let result: Vec<TransactionResponse> = transactions
        .iter()
        .map(|t| TransactionResponse {
            id: t["id"].as_str().unwrap_or("").to_string(),
            delta: t["delta"].as_i64().unwrap_or(0),
            balance_after: t["balance_after"].as_i64().unwrap_or(0),
            reason: t["reason"].as_str().unwrap_or("").to_string(),
            provider: t["provider"].as_str().map(String::from),
            generation_id: t["generation_id"].as_str().map(String::from),
            created_at: t["created_at"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(Json(result))
}

/// GET /api/studio/campaigns/:campaign_id/generations
/// Get generations for a campaign
pub async fn list_campaign_generations(
    State(state): State<AppState>,
    Path(campaign_id): Path<String>,
    auth_user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let user_id = auth_user.id;
    let resp = state
        .pg
        .from("studio_generations")
        .select("*")
        .eq("campaign_id", &campaign_id)
        .eq("user_id", &user_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "failed to fetch campaign generations");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch generations: {}", e))
        })?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch generations: {}", error_text),
        ));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows = parse_postgrest_array(&body)?;
    Ok(Json(rows))
}

/// GET /api/studio/generations
/// List recent generations for the current user (optionally filtered by generation_type)
pub async fn list_generations(
    State(state): State<AppState>,
    Query(q): Query<ListGenerationsQuery>,
    auth_user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let user_id = auth_user.id;
    let mut req = state
        .pg
        .from("studio_generations")
        .select("*")
        .eq("user_id", &user_id)
        .order("created_at.desc");

    if let Some(gt) = q.generation_type.as_ref() {
        req = req.eq("generation_type", gt);
    }

    if let Some(limit) = q.limit {
        req = req.limit(limit as usize);
    } else {
        req = req.limit(20);
    }

    let resp = req.execute().await.map_err(|e| {
        error!(error = %e, "failed to fetch generations");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch generations: {}", e),
        )
    })?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch generations: {}", error_text),
        ));
    }

    let body = resp.text().await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read response: {}", e))
    })?;

    let generations: Vec<serde_json::Value> = serde_json::from_str(&body).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse generations: {}", e),
        )
    })?;

    Ok(Json(generations))
}

/// POST /api/studio/upload
/// Upload a file to temp storage and return its public URL
pub async fn upload_file(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut file_data = None;
    let mut file_name = None;
    let mut content_type = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            file_name = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            file_data = Some(field.bytes().await.map_err(|e| {
                (StatusCode::BAD_REQUEST, format!("Failed to read file: {}", e))
            })?);
            break;
        }
    }

    let data = file_data.ok_or((StatusCode::BAD_REQUEST, "No file provided".to_string()))?;
    let ext = file_name
        .as_ref()
        .and_then(|f| f.split('.').last())
        .unwrap_or("jpg");
    
    // Validate file type — allow images and audio
    let ct = content_type.as_deref().unwrap_or("application/octet-stream");
    if !ct.starts_with("image/") && !ct.starts_with("audio/") {
        return Err((StatusCode::BAD_REQUEST, "Only image or audio files are allowed".to_string()));
    }

    let storage_path = format!("studio-uploads/{}-{}.{}", 
        chrono::Utc::now().timestamp_millis(),
        Uuid::new_v4().to_string().split('-').next().unwrap_or("rand"),
        ext
    );

    let bucket = &state.supabase_bucket_public; // Or bucket_temp if you want it to expire
    let upload_url = format!("{}/storage/v1/object/{}/{}", 
        state.supabase_url.trim_end_matches('/'),
        bucket,
        storage_path
    );

    let client = reqwest::Client::new();
    let resp = client
        .post(&upload_url)
        .header("Authorization", format!("Bearer {}", state.supabase_service_key))
        .header("apikey", &state.supabase_service_key)
        .header(header::CONTENT_TYPE, ct)
        .header("x-upsert", "true")
        .body(data)
        .send()
        .await
        .map_err(|e| {
            error!(error = %e, "storage_upload_failed");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to upload to storage: {}", e))
        })?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        error!(error = %error_text, "storage_upload_error_response");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Storage error: {}", error_text)));
    }

    let public_url = format!("{}/storage/v1/object/public/{}/{}", 
        state.supabase_url.trim_end_matches('/'),
        bucket,
        storage_path
    );

    info!(url = %public_url, "file_uploaded_to_storage");

    Ok(Json(json!({
        "file_url": public_url,
        "path": storage_path
    })))
}

/// GET /api/studio/licensed-assets
/// Returns image and audio assets the brand can use in the Studio.
/// Scoped to campaigns where the brand has an approved (active) licensing request.
pub async fn list_licensed_assets(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // 1. Find all talent_ids from approved licensing requests for this brand user
    let lr_resp = state.pg
        .from("licensing_requests")
        .select("talent_id,campaign_title,talent_name,agency_users(full_legal_name,stage_name,profile_photo_url)")
        .eq("brand_user_id", &auth_user.id)
        .eq("status", "approved")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let lr_text = lr_resp.text().await.unwrap_or_else(|_| "[]".into());
    let lr_rows: Vec<serde_json::Value> = serde_json::from_str(&lr_text).unwrap_or_default();

    let mut assets: Vec<serde_json::Value> = Vec::new();

    for row in &lr_rows {
        let talent_id = row["talent_id"].as_str().unwrap_or("");
        if talent_id.is_empty() { continue; }

        let campaign_name = row["campaign_title"].as_str()
            .or_else(|| row["talent_name"].as_str())
            .unwrap_or("Licensed Campaign")
            .to_string();

        let talent_display = row.get("agency_users")
            .and_then(|u| u["stage_name"].as_str().or_else(|| u["full_legal_name"].as_str()))
            .or_else(|| row["talent_name"].as_str())
            .unwrap_or("Talent")
            .to_string();

        let avatar = row.get("agency_users")
            .and_then(|u| u["profile_photo_url"].as_str())
            .map(String::from);

        // 2a. Portrait / profile image asset
        if let Some(ref av) = avatar {
            assets.push(json!({
                "id": format!("avatar-{}", talent_id),
                "type": "image",
                "name": format!("{} – Profile Photo", talent_display),
                "url": av,
                "campaign_name": campaign_name,
                "talent_name": talent_display,
                "source": "licensed"
            }));
        }

        // 2b. Voice recordings accessible for this talent
        let vr_resp = state.pg
            .from("voice_recordings")
            .select("id,file_name,storage_bucket,storage_path")
            .eq("user_id", talent_id)
            .eq("accessible", "true")
            .execute()
            .await;

        if let Ok(vr_resp) = vr_resp {
            let vr_text = vr_resp.text().await.unwrap_or_else(|_| "[]".into());
            let recordings: Vec<serde_json::Value> = serde_json::from_str(&vr_text).unwrap_or_default();
            for rec in recordings {
                let rec_id = rec["id"].as_str().unwrap_or("").to_string();
                let file_name = rec["file_name"].as_str().unwrap_or("voice").to_string();
                let bucket = rec["storage_bucket"].as_str().unwrap_or("likelee-private");
                let path = rec["storage_path"].as_str().unwrap_or("");
                let url = format!("{}/storage/v1/object/public/{}/{}",
                    state.supabase_url.trim_end_matches('/'),
                    bucket, path
                );
                assets.push(json!({
                    "id": format!("voice-{}", rec_id),
                    "type": "audio",
                    "name": format!("{} – {}", talent_display, file_name),
                    "url": url,
                    "campaign_name": campaign_name,
                    "talent_name": talent_display,
                    "source": "licensed"
                }));
            }
        }

        // 2c. Agency talent portfolio images
        let pa_resp = state.pg
            .from("portfolio_items")
            .select("id,title,media_url,media_type")
            .eq("user_id", talent_id)
            .eq("media_type", "image")
            .limit(10)
            .execute()
            .await;

        if let Ok(pa_resp) = pa_resp {
            let pa_text = pa_resp.text().await.unwrap_or_else(|_| "[]".into());
            let items: Vec<serde_json::Value> = serde_json::from_str(&pa_text).unwrap_or_default();
            for item in items {
                let item_id = item["id"].as_str().unwrap_or("").to_string();
                let title = item["title"].as_str().unwrap_or("Portfolio Image").to_string();
                let url = item["media_url"].as_str().unwrap_or("").to_string();
                if url.is_empty() { continue; }
                assets.push(json!({
                    "id": format!("portfolio-{}", item_id),
                    "type": "image",
                    "name": format!("{} – {}", talent_display, title),
                    "url": url,
                    "campaign_name": campaign_name,
                    "talent_name": talent_display,
                    "source": "licensed"
                }));
            }
        }
    }

    info!(user_id = %auth_user.id, count = assets.len(), "licensed_assets_listed");

    Ok(Json(json!({ "assets": assets })))
}
