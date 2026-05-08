use super::providers;
use super::types::*;
use super::wallet;
use crate::auth::AuthUser;
use crate::config::AppState;
use crate::storage::{
    canonical_object_path, download_object, insert_asset_record, safe_fetch_url,
    sanitize_file_name, upload_object, StorageAssetRecord, StorageContextType, StorageOwnerType,
    StorageVisibility,
};
use crate::team::{require_agency_access, require_brand_access};
use anyhow::anyhow;
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
    let cost = wallet::get_generation_cost(
        &state.pg,
        provider_str,
        &req.model,
        generation_type_str,
        Some(&req.input_params),
    )
    .await
    .map_err(|e| {
        error!(error = %e, "failed to get generation cost");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get generation cost: {}", e),
        )
    })?;

    // Check if user has sufficient balance
    let has_balance = wallet::check_balance(&state.pg, &user_id, cost)
        .await
        .map_err(|e| {
            error!(error = %e, "failed to check balance");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to check balance: {}", e),
            )
        })?;

    if !has_balance {
        return Err((
            StatusCode::PAYMENT_REQUIRED,
            format!(
                "Insufficient credits. Required: {}, please purchase more credits.",
                cost
            ),
        ));
    }

    // Create generation record
    let generation_id = Uuid::new_v4().to_string();
    let campaign_id_value = req
        .campaign_id
        .as_ref()
        .map(|s| json!(s))
        .unwrap_or(json!(null));

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

    let insert_resp = state
        .pg
        .from("studio_generations")
        .insert(generation.to_string())
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "failed to insert generation");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create generation: {}", e),
            )
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to deduct credits: {}", e),
            )
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
                    let _ = state
                        .pg
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
        Provider::Higgsfield | Provider::Kive => Err(anyhow!(
            "Generation not yet implemented for {} provider",
            req.provider.as_str()
        )),
    };

    match provider_job_id {
        Ok(job_id) => {
            // Update generation with provider job ID and status
            let update = json!({
                "provider_job_id": job_id,
                "status": "processing",
                "updated_at": chrono::Utc::now().to_rfc3339()
            });

            let _ = state
                .pg
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

            let _ = state
                .pg
                .from("studio_generations")
                .eq("id", &generation_id)
                .update(update.to_string())
                .execute()
                .await;

            // Refund credits
            let _ = wallet::refund_credits(&state.pg, &user_id, cost, provider_str, &generation_id)
                .await;

            Err((StatusCode::BAD_GATEWAY, format!("Provider error: {}", e)))
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to fetch generation: {}", e),
            )
        })?;

    if !gen_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Generation not found".to_string()));
    }

    let body = gen_resp.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read response: {}", e),
        )
    })?;

    let generation: serde_json::Value = serde_json::from_str(&body).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse generation: {}", e),
        )
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
            output_metadata: generation["output_metadata"]
                .as_object()
                .map(|_| generation["output_metadata"].clone()),
            error_message: generation["error_message"].as_str().map(String::from),
        }));
    }

    // Check status from provider
    if let Some(provider_job_id) = provider_job_id {
        // Read stored Fal URLs from output_metadata (stored during submission)
        let fal_status_url = generation["output_metadata"]["fal_status_url"]
            .as_str()
            .map(String::from);
        let fal_response_url = generation["output_metadata"]["fal_response_url"]
            .as_str()
            .map(String::from);

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
                let update = if matches!(status.status, GenerationStatus::Completed)
                    && !status.output_urls.is_empty()
                {
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
                } else if matches!(status.status, GenerationStatus::Completed)
                    && status.output_urls.is_empty()
                {
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

                let _ = state
                    .pg
                    .from("studio_generations")
                    .eq("id", &job_id)
                    .update(update.to_string())
                    .execute()
                    .await;

                // On successful completion: reconcile the pre-deducted estimated credits
                // against the actual provider cost stored in output_metadata.
                if matches!(status.status, GenerationStatus::Completed)
                    && !status.output_urls.is_empty()
                {
                    let estimated_credits = generation["credits_used"].as_i64().unwrap_or(0);
                    let actual_credits = status
                        .output_metadata
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
                            &state.pg,
                            &user_id,
                            estimated_credits,
                            actual_credits,
                            provider_str,
                            &job_id,
                        )
                        .await;

                        // Update credits_used in the DB to the actual cost
                        let _ = state
                            .pg
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
                    let _ = wallet::refund_credits(
                        &state.pg,
                        &user_id,
                        credits_used,
                        provider_str,
                        &job_id,
                    )
                    .await;
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to get wallet: {}", e),
            )
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to get wallet: {}", e),
            )
        })?;

    // Get transactions
    let resp = state
        .pg
        .from("studio_credit_transactions")
        .select("id,delta,balance_after,reason,provider,generation_id,created_at")
        .eq("wallet_id", &wallet_id)
        .order("created_at.desc")
        .limit(100)
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "failed to fetch transactions");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to fetch transactions: {}", e),
            )
        })?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch transactions: {}", error_text),
        ));
    }

    let body = resp.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read response: {}", e),
        )
    })?;

    let transactions: Vec<serde_json::Value> = serde_json::from_str(&body).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse transactions: {}", e),
        )
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
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read response: {}", e),
        )
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
                (
                    StatusCode::BAD_REQUEST,
                    format!("Failed to read file: {}", e),
                )
            })?);
            break;
        }
    }

    let data = file_data.ok_or((StatusCode::BAD_REQUEST, "No file provided".to_string()))?;
    let ext = file_name
        .as_ref()
        .and_then(|f| f.split('.').next_back())
        .unwrap_or("jpg");

    // Validate file type — allow images and audio
    let ct = content_type
        .as_deref()
        .unwrap_or("application/octet-stream");
    if !ct.starts_with("image/") && !ct.starts_with("audio/") {
        return Err((
            StatusCode::BAD_REQUEST,
            "Only image or audio files are allowed".to_string(),
        ));
    }

    let storage_path = format!(
        "studio-uploads/{}-{}.{}",
        chrono::Utc::now().timestamp_millis(),
        Uuid::new_v4()
            .to_string()
            .split('-')
            .next()
            .unwrap_or("rand"),
        ext
    );

    let bucket = &state.supabase_bucket_public; // Or bucket_temp if you want it to expire
    let upload_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url.trim_end_matches('/'),
        bucket,
        storage_path
    );

    let client = reqwest::Client::new();
    let resp = client
        .post(&upload_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", &state.supabase_service_key)
        .header(header::CONTENT_TYPE, ct)
        .header("x-upsert", "true")
        .body(data)
        .send()
        .await
        .map_err(|e| {
            error!(error = %e, "storage_upload_failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to upload to storage: {}", e),
            )
        })?;

    if !resp.status().is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        error!(error = %error_text, "storage_upload_error_response");
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Storage error: {}", error_text),
        ));
    }

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
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
/// Returns image and audio assets the organization can use in the Studio.
/// For brands: sources assets from agency catalogs linked to approved license requests.
/// For agencies: sources assets from their represented talents (portfolio, reference images, voice recordings).
pub async fn list_licensed_assets(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Detect if user is agency or brand
    let (org_type, org_id) = match require_agency_access(&state, &auth_user).await {
        Ok(access) => ("agency", access.organization_id),
        Err(_) => {
            let access = require_brand_access(&state, &auth_user).await?;
            ("brand", access.organization_id)
        }
    };

    info!(
        user_id = %auth_user.id,
        org_type = %org_type,
        org_id = %org_id,
        "licensed_assets_request"
    );

    let mut assets: Vec<serde_json::Value> = Vec::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Branch based on organization type
    if org_type == "agency" {
        // Agency: get assets from represented talents
        let agency_assets = fetch_agency_talent_assets(&state, &org_id).await;
        assets.extend(agency_assets);
    } else {
        // Brand: get assets from approved licensing requests
        let brand_assets = fetch_brand_licensed_assets(&state, &org_id, &now).await;
        assets.extend(brand_assets);
    }

    info!(user_id = %auth_user.id, org_type = %org_type, count = assets.len(), "licensed_assets_listed");

    Ok(Json(json!({ "assets": assets })))
}

/// Fetch licensed assets for a brand from approved license requests and agency catalogs
async fn fetch_brand_licensed_assets(
    state: &AppState,
    brand_id: &str,
    now: &str,
) -> Vec<serde_json::Value> {
    let mut assets: Vec<serde_json::Value> = Vec::new();

    // 1. Get approved licensing_requests for this brand
    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,talent_id,talent_name,campaign_title,status")
        .eq("brand_id", brand_id)
        .eq("status", "approved")
        .execute()
        .await;

    let approved_licenses: Vec<serde_json::Value> = if let Ok(resp) = lr_resp {
        if let Ok(text) = resp.text().await {
            serde_json::from_str(&text).unwrap_or_default()
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    info!(
        brand_id = %brand_id,
        approved_licenses = approved_licenses.len(),
        "brand_approved_licenses_found"
    );

    // 2. For each approved license, find its catalog
    for license in &approved_licenses {
        let license_id = license.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let talent_name = license
            .get("talent_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Talent")
            .to_string();
        let campaign_name = license
            .get("campaign_title")
            .and_then(|v| v.as_str())
            .unwrap_or("Licensed Campaign")
            .to_string();

        if license_id.is_empty() {
            continue;
        }

        // Find catalog linked to this license request
        let catalog_resp = state
            .pg
            .from("agency_catalogs")
            .select("id,title,expires_at")
            .eq("licensing_request_id", license_id)
            .limit(1)
            .execute()
            .await;

        let catalog: Option<serde_json::Value> = if let Ok(resp) = catalog_resp {
            if let Ok(text) = resp.text().await {
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                rows.into_iter().next()
            } else {
                None
            }
        } else {
            None
        };

        let catalog = match catalog {
            Some(c) => c,
            None => continue, // No catalog for this license
        };

        // Check if catalog is expired
        let expires_at = catalog.get("expires_at").and_then(|v| v.as_str());
        if let Some(exp) = expires_at {
            if exp < now {
                info!(license_id = %license_id, expires_at = %exp, "catalog_expired_skipping");
                continue;
            }
        }

        let catalog_id = catalog.get("id").and_then(|v| v.as_str()).unwrap_or("");
        if catalog_id.is_empty() {
            continue;
        }

        // 3. Get catalog items
        let items_resp = state
            .pg
            .from("agency_catalog_items")
            .select("id,talent_id")
            .eq("catalog_id", catalog_id)
            .execute()
            .await;

        let items: Vec<serde_json::Value> = if let Ok(resp) = items_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        // 4. For each item, get assets and recordings
        for item in &items {
            let item_id = item.get("id").and_then(|v| v.as_str()).unwrap_or("");

            // 4a. Get digital assets (images)
            let assets_resp = state
                .pg
                .from("agency_catalog_assets")
                .select("id,asset_id,asset_type,sort_order")
                .eq("catalog_item_id", item_id)
                .order("sort_order.asc")
                .execute()
                .await;

            if let Ok(resp) = assets_resp {
                if let Ok(text) = resp.text().await {
                    let cat_assets: Vec<serde_json::Value> =
                        serde_json::from_str(&text).unwrap_or_default();

                    for cat_asset in cat_assets {
                        let asset_id = cat_asset
                            .get("asset_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        let asset_type = cat_asset
                            .get("asset_type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("image");

                        if asset_id.is_empty() {
                            continue;
                        }

                        // Resolve asset URL from reference_images or agency_files
                        let url = resolve_asset_url(state, asset_id).await;

                        if let Some(asset_url) = url {
                            let type_str = if asset_type == "audio" {
                                "audio"
                            } else {
                                "image"
                            };

                            assets.push(json!({
                                "id": format!("catalog-asset-{}", asset_id),
                                "type": type_str,
                                "name": format!("{} – Licensed Asset", talent_name),
                                "url": asset_url,
                                "campaign_name": campaign_name.clone(),
                                "talent_name": talent_name.clone(),
                                "source": "licensed"
                            }));
                        }
                    }
                }
            }

            // 4b. Get voice recordings
            let recs_resp = state
                .pg
                .from("agency_catalog_recordings")
                .select("recording_id,emotion_tag,sort_order")
                .eq("catalog_item_id", item_id)
                .order("sort_order.asc")
                .execute()
                .await;

            if let Ok(resp) = recs_resp {
                if let Ok(text) = resp.text().await {
                    let recordings: Vec<serde_json::Value> =
                        serde_json::from_str(&text).unwrap_or_default();

                    for rec in recordings {
                        let rec_id = rec
                            .get("recording_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");

                        if rec_id.is_empty() {
                            continue;
                        }

                        // Get recording details
                        let vr_resp = state
                            .pg
                            .from("voice_recordings")
                            .select("storage_bucket,storage_path")
                            .eq("id", rec_id)
                            .limit(1)
                            .execute()
                            .await;

                        if let Ok(vr_resp) = vr_resp {
                            if let Ok(vr_text) = vr_resp.text().await {
                                let vr_rows: Vec<serde_json::Value> =
                                    serde_json::from_str(&vr_text).unwrap_or_default();

                                if let Some(vr) = vr_rows.into_iter().next() {
                                    let bucket = vr
                                        .get("storage_bucket")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("");
                                    let path = vr
                                        .get("storage_path")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("");

                                    if !bucket.is_empty() && !path.is_empty() {
                                        let url = format!(
                                            "{}/storage/v1/object/public/{}/{}",
                                            state.supabase_url.trim_end_matches('/'),
                                            bucket,
                                            path
                                        );
                                        assets.push(json!({
                                            "id": format!("catalog-recording-{}", rec_id),
                                            "type": "audio",
                                            "name": format!("{} – Voice Recording", talent_name),
                                            "url": url,
                                            "campaign_name": campaign_name.clone(),
                                            "talent_name": talent_name.clone(),
                                            "source": "licensed"
                                        }));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 5. Also include assets from brand_license_requests via brand_licensed_deliverables
    // This handles brand-initiated licenses
    let blr_resp = state
        .pg
        .from("brand_license_requests")
        .select("id,talent_name,campaign_title")
        .eq("brand_id", brand_id)
        .eq("status", "approved")
        .execute()
        .await;

    if let Ok(resp) = blr_resp {
        if let Ok(text) = resp.text().await {
            let blr_rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

            for blr in blr_rows {
                let req_id = blr.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let talent_name = blr
                    .get("talent_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Talent")
                    .to_string();
                let campaign_name = blr
                    .get("campaign_title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Licensed Campaign")
                    .to_string();

                // Get deliverables for this license request
                let del_resp = state
                    .pg
                    .from("brand_licensed_deliverables")
                    .select("id,asset_type,asset_name,asset_url,mime_type")
                    .eq("license_request_id", req_id)
                    .is("deleted_at", "null")
                    .execute()
                    .await;

                if let Ok(del_resp) = del_resp {
                    if let Ok(del_text) = del_resp.text().await {
                        let deliverables: Vec<serde_json::Value> =
                            serde_json::from_str(&del_text).unwrap_or_default();

                        for del in deliverables {
                            let del_id = del.get("id").and_then(|v| v.as_str()).unwrap_or("");
                            let asset_type = del
                                .get("asset_type")
                                .and_then(|v| v.as_str())
                                .unwrap_or("image");
                            let asset_name = del
                                .get("asset_name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Asset")
                                .to_string();
                            let asset_url =
                                del.get("asset_url").and_then(|v| v.as_str()).unwrap_or("");
                            let mime_type =
                                del.get("mime_type").and_then(|v| v.as_str()).unwrap_or("");

                            if asset_url.is_empty() {
                                continue;
                            }

                            let type_str = if asset_type == "voice_recording"
                                || mime_type.starts_with("audio/")
                            {
                                "audio"
                            } else {
                                "image"
                            };

                            assets.push(json!({
                                "id": format!("deliverable-{}", del_id),
                                "type": type_str,
                                "name": asset_name,
                                "url": asset_url,
                                "campaign_name": campaign_name.clone(),
                                "talent_name": talent_name.clone(),
                                "source": "licensed"
                            }));
                        }
                    }
                }
            }
        }
    }

    // 6. Get campaign offer deliverables for paid offers
    let cod_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .select("id,asset_type,caption,status,offer_id,brand_campaigns(name),campaign_offers(payment_status,expires_at)")
        .eq("brand_id", brand_id)
        .eq("status", "approved")
        .execute()
        .await;

    if let Ok(resp) = cod_resp {
        if let Ok(text) = resp.text().await {
            let deliverables: Vec<serde_json::Value> =
                serde_json::from_str(&text).unwrap_or_default();

            for del in deliverables {
                let offer = del.get("campaign_offers");
                let payment_status = offer
                    .and_then(|o| o.get("payment_status"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("unpaid");
                let expires_at = offer
                    .and_then(|o| o.get("expires_at"))
                    .and_then(|v| v.as_str());

                if payment_status != "paid" {
                    continue;
                }
                if let Some(exp) = expires_at {
                    if exp < now {
                        continue;
                    }
                }

                let del_id = del.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let offer_id = del.get("offer_id").and_then(|v| v.as_str()).unwrap_or("");
                let asset_type = del
                    .get("asset_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("file");
                let campaign_name = del
                    .get("brand_campaigns")
                    .and_then(|bc| bc.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("Campaign")
                    .to_string();

                if !del_id.is_empty() && !offer_id.is_empty() {
                    let secure_url = format!(
                        "/api/campaign-offers/{}/deliverables/{}/file",
                        offer_id, del_id
                    );
                    let type_str = match asset_type {
                        "video" => "video",
                        "audio" => "audio",
                        _ => "image",
                    };

                    assets.push(json!({
                        "id": format!("campaign-deliverable-{}", del_id),
                        "type": type_str,
                        "name": del.get("caption").and_then(|v| v.as_str()).unwrap_or("Campaign Deliverable").to_string(),
                        "url": secure_url,
                        "campaign_name": campaign_name,
                        "source": "licensed"
                    }));
                }
            }
        }
    }

    assets
}

/// Fetch assets from talents represented by the agency
/// This includes portfolio items, reference images, and voice recordings
async fn fetch_agency_talent_assets(state: &AppState, agency_id: &str) -> Vec<serde_json::Value> {
    let mut assets: Vec<serde_json::Value> = Vec::new();

    // 1. Get all talents represented by this agency
    let talents_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("creator_id,status")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .execute()
        .await;

    let talents: Vec<serde_json::Value> = if let Ok(resp) = talents_resp {
        if let Ok(text) = resp.text().await {
            serde_json::from_str(&text).unwrap_or_default()
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    let talent_ids: Vec<&str> = talents
        .iter()
        .filter_map(|t| t.get("creator_id").and_then(|v| v.as_str()))
        .collect();

    info!(
        agency_id = %agency_id,
        talent_count = talent_ids.len(),
        "agency_talents_found"
    );

    // 2. Get talent names for these creators
    let mut talent_names: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for talent_id in &talent_ids {
        let creator_resp = state
            .pg
            .from("creators")
            .select("id,full_name")
            .eq("id", talent_id)
            .limit(1)
            .execute()
            .await;

        if let Ok(resp) = creator_resp {
            if let Ok(text) = resp.text().await {
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.into_iter().next() {
                    if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                        let name = row
                            .get("full_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Talent")
                            .to_string();
                        talent_names.insert(id.to_string(), name);
                    }
                }
            }
        }
    }

    // 3. Get portfolio items for each talent
    for talent_id in &talent_ids {
        let talent_name = talent_names
            .get(*talent_id)
            .cloned()
            .unwrap_or_else(|| "Talent".to_string());

        // 3a. Talent portfolio items
        let portfolio_resp = state
            .pg
            .from("talent_portfolio_items")
            .select("id,storage_bucket,storage_path,public_url")
            .eq("talent_id", talent_id)
            .order("created_at.desc")
            .limit(50)
            .execute()
            .await;

        if let Ok(resp) = portfolio_resp {
            if let Ok(text) = resp.text().await {
                let items: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

                for item in items {
                    let item_id = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let public_url = item
                        .get("public_url")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let bucket = item
                        .get("storage_bucket")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let path = item
                        .get("storage_path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    let url = if !public_url.is_empty() {
                        public_url.to_string()
                    } else if !bucket.is_empty() && !path.is_empty() {
                        format!(
                            "{}/storage/v1/object/public/{}/{}",
                            state.supabase_url.trim_end_matches('/'),
                            bucket,
                            path
                        )
                    } else {
                        continue;
                    };

                    assets.push(json!({
                        "id": format!("portfolio-{}", item_id),
                        "type": "image",
                        "name": format!("{} – Portfolio", talent_name),
                        "url": url,
                        "talent_name": talent_name.clone(),
                        "source": "talent"
                    }));
                }
            }
        }

        // 3b. Reference images
        let ref_images_resp = state
            .pg
            .from("reference_images")
            .select("id,public_url,storage_bucket,storage_path")
            .eq("user_id", talent_id)
            .order("created_at.desc")
            .limit(50)
            .execute()
            .await;

        if let Ok(resp) = ref_images_resp {
            if let Ok(text) = resp.text().await {
                let images: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();

                for img in images {
                    let img_id = img.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let public_url = img.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                    let bucket = img
                        .get("storage_bucket")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let path = img
                        .get("storage_path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    let url = if !public_url.is_empty() {
                        public_url.to_string()
                    } else if !bucket.is_empty() && !path.is_empty() {
                        format!(
                            "{}/storage/v1/object/public/{}/{}",
                            state.supabase_url.trim_end_matches('/'),
                            bucket,
                            path
                        )
                    } else {
                        continue;
                    };

                    assets.push(json!({
                        "id": format!("refimg-{}", img_id),
                        "type": "image",
                        "name": format!("{} – Reference Image", talent_name),
                        "url": url,
                        "talent_name": talent_name.clone(),
                        "source": "talent"
                    }));
                }
            }
        }

        // 3c. Voice recordings
        let recordings_resp = state
            .pg
            .from("voice_recordings")
            .select("id,storage_bucket,storage_path,emotion_tag")
            .eq("creator_id", talent_id)
            .eq("accessible", "true")
            .order("created_at.desc")
            .limit(20)
            .execute()
            .await;

        if let Ok(resp) = recordings_resp {
            if let Ok(text) = resp.text().await {
                let recordings: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();

                for rec in recordings {
                    let rec_id = rec.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let bucket = rec
                        .get("storage_bucket")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let path = rec
                        .get("storage_path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let emotion_tag = rec
                        .get("emotion_tag")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Voice");

                    if bucket.is_empty() || path.is_empty() {
                        continue;
                    }

                    let url = format!(
                        "{}/storage/v1/object/public/{}/{}",
                        state.supabase_url.trim_end_matches('/'),
                        bucket,
                        path
                    );

                    assets.push(json!({
                        "id": format!("rec-{}", rec_id),
                        "type": "audio",
                        "name": format!("{} – {} Recording", talent_name, emotion_tag),
                        "url": url,
                        "talent_name": talent_name.clone(),
                        "source": "talent"
                    }));
                }
            }
        }
    }

    assets
}

/// Helper to resolve asset URL from reference_images or agency_files
async fn resolve_asset_url(state: &AppState, asset_id: &str) -> Option<String> {
    // Try reference_images first
    let ri_resp = state
        .pg
        .from("reference_images")
        .select("public_url,storage_bucket,storage_path")
        .eq("id", asset_id)
        .limit(1)
        .execute()
        .await;

    if let Ok(resp) = ri_resp {
        if let Ok(text) = resp.text().await {
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            if let Some(ri) = rows.into_iter().next() {
                let pu = ri.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                if !pu.is_empty() {
                    return Some(pu.to_string());
                }
                let bucket = ri
                    .get("storage_bucket")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let path = ri
                    .get("storage_path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if !bucket.is_empty() && !path.is_empty() {
                    return Some(format!(
                        "{}/storage/v1/object/public/{}/{}",
                        state.supabase_url.trim_end_matches('/'),
                        bucket,
                        path
                    ));
                }
            }
        }
    }

    // Try agency_files
    let af_resp = state
        .pg
        .from("agency_files")
        .select("public_url,storage_bucket,storage_path")
        .eq("id", asset_id)
        .limit(1)
        .execute()
        .await;

    if let Ok(resp) = af_resp {
        if let Ok(text) = resp.text().await {
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            if let Some(af) = rows.into_iter().next() {
                let pu = af.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                if !pu.is_empty() {
                    return Some(pu.to_string());
                }
                let bucket = af
                    .get("storage_bucket")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let path = af
                    .get("storage_path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if !bucket.is_empty() && !path.is_empty() {
                    return Some(format!(
                        "{}/storage/v1/object/public/{}/{}",
                        state.supabase_url.trim_end_matches('/'),
                        bucket,
                        path
                    ));
                }
            }
        }
    }

    None
}

/// GET /api/studio/presets
/// Fetch style presets and motion templates from Fal
pub async fn list_presets(
    State(_state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let all_presets = providers::fetch_fal_presets().await.map_err(|e| {
        error!(error = %e, "failed to fetch fal presets");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to fetch presets".to_string(),
        )
    })?;

    let mut all_presets = all_presets;

    // Sort by name for consistency
    all_presets.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(Json(json!({ "presets": all_presets })))
}

/// POST /api/studio/generations/:generation_id/save-to-storage
/// Save generation outputs to org storage
pub async fn save_generation_to_storage(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(generation_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let user_id = &auth_user.id;

    let gen_resp = state
        .pg
        .from("studio_generations")
        .select("id,user_id,output_urls,output_metadata,generation_type,provider,model")
        .eq("id", &generation_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let gen_text = gen_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let gen_rows: Vec<serde_json::Value> = serde_json::from_str(&gen_text).unwrap_or_default();
    let gen = gen_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "Generation not found".to_string()))?;

    let output_urls: Vec<String> = gen
        .get("output_urls")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    if output_urls.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Generation has no output URLs".into(),
        ));
    }

    let (org_type, org_id) = match require_agency_access(&state, &auth_user).await {
        Ok(access) => ("agency", access.organization_id),
        Err(_) => {
            let access = require_brand_access(&state, &auth_user).await?;
            ("brand", access.organization_id)
        }
    };

    let (file_table, owner_col, owner_type, _context_type) = if org_type == "agency" {
        (
            "agency_files",
            "agency_id",
            StorageOwnerType::Agency,
            StorageContextType::AgencyStorage,
        )
    } else {
        (
            "brand_files",
            "brand_id",
            StorageOwnerType::Brand,
            StorageContextType::BrandStorage,
        )
    };

    let mut folder_id: Option<String> = None;
    let mut cumulative_new_size: i64 = 0;
    if org_type == "brand" {
        let _limit =
            crate::brand_storage::ensure_brand_storage_settings_row(&state, &org_id).await?;
        let used = crate::brand_storage::get_brand_used_storage_bytes(&state, &org_id).await?;
        cumulative_new_size = used;
        folder_id =
            Some(crate::brand_storage::get_or_create_default_folder(&state, &org_id).await?);
    }

    let mut saved = Vec::new();

    for (idx, url) in output_urls.iter().enumerate() {
        let downloaded = match download_object(&state, &state.supabase_bucket_public, url).await {
            Ok(d) => d,
            Err(_) => match safe_fetch_url(url, None).await {
                Ok(d) => d,
                Err(e) => {
                    warn!(generation_id = %generation_id, idx, error = ?e, "failed to safely fetch generation output from external URL");
                    continue;
                }
            },
        };

        let file_bytes = downloaded.bytes.to_vec();
        let new_size = file_bytes.len() as i64;
        let ct = downloaded.content_type.as_deref();

        if org_type == "brand" {
            let limit =
                crate::brand_storage::ensure_brand_storage_settings_row(&state, &org_id).await?;
            if cumulative_new_size + new_size > limit {
                warn!(
                    generation_id = %generation_id,
                    idx,
                    cumulative = cumulative_new_size,
                    new_size,
                    limit,
                    "skipping generation output due to quota limit"
                );
                continue;
            }
        }

        let ext = match ct {
            Some(m) if m.contains("png") => "png",
            Some(m) if m.contains("jpeg") || m.contains("jpg") => "jpg",
            Some(m) if m.contains("webp") => "webp",
            Some(m) if m.contains("mp4") => "mp4",
            Some(m) if m.contains("gif") => "gif",
            _ => "bin",
        };
        let fname = format!("generation_{}.{}", idx, ext);
        let sanitized = sanitize_file_name(&fname);
        let visibility = StorageVisibility::Private;
        let path = canonical_object_path(
            &format!("{org_type}s/{org_id}/studio-generations"),
            &sanitized,
            chrono::Utc::now().timestamp_millis(),
        );

        let uploaded = match upload_object(&state, visibility, &path, file_bytes, ct).await {
            Ok(u) => u,
            Err(e) => {
                warn!(generation_id = %generation_id, idx, error = %e.1, "failed to upload generation output to storage");
                continue;
            }
        };

        let insert = if org_type == "brand" {
            json!({
                owner_col: org_id,
                "file_name": fname,
                "storage_bucket": uploaded.bucket,
                "storage_path": uploaded.path,
                "public_url": uploaded.public_url,
                "folder_id": folder_id,
                "size_bytes": new_size,
                "mime_type": ct,
                "source_type": "studio_generation",
                "generation_id": generation_id,
            })
        } else {
            json!({
                owner_col: org_id,
                "file_name": fname,
                "storage_bucket": uploaded.bucket,
                "storage_path": uploaded.path,
                "public_url": uploaded.public_url,
                "size_bytes": new_size,
                "mime_type": ct,
            })
        };
        let resp = state
            .pg
            .from(file_table)
            .insert(insert.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let txt = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
        let rec = arr.first().cloned().unwrap_or(json!({"id": ""}));
        let id = rec
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let storage_record = StorageAssetRecord {
            owner_type,
            owner_id: org_id.clone(),
            context_type: StorageContextType::StudioGeneration,
            context_id: Some(generation_id.clone()),
            visibility,
            object_path: uploaded.path.clone(),
            original_file_name: Some(fname.clone()),
            mime_type: ct.map(|s| s.to_string()),
            size_bytes: Some(new_size),
            checksum_sha256: None,
            source_table: Some(file_table.to_string()),
            source_id: if id.is_empty() {
                None
            } else {
                Some(id.clone())
            },
            created_by: Some(user_id.clone()),
            counts_toward_quota: true,
        };
        if let Err(err) = insert_asset_record(&state, &storage_record).await {
            warn!(org_id = %org_id, file_id = %id, error = %err.1, "failed to mirror generation output into storage_assets");
        }

        cumulative_new_size += new_size;

        saved.push(json!({
            "id": id,
            "file_name": fname,
            "storage_path": uploaded.path,
            "public_url": uploaded.public_url,
        }));
    }

    info!(
        generation_id = %generation_id,
        org_type = org_type,
        org_id = %org_id,
        saved_count = saved.len(),
        "generation_saved_to_storage"
    );

    Ok(Json(json!({ "saved": saved })))
}
