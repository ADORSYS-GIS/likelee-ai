use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Debug, Serialize)]
pub struct CreateSubmissionRequest {
    pub template_id: i32,
    pub send_email: bool,
    pub submitters: Vec<Submitter>,
}

#[derive(Debug, Serialize)]
pub struct Submitter {
    pub name: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}

// Represents the actual object returned inside the array from DocuSeal's submission API
#[derive(Debug, Deserialize, Clone)]
pub struct DocuSealSubmitter {
    pub submission_id: i32,
    pub slug: String,
}

// This remains our internal representation, which we will construct manually
#[derive(Debug, Deserialize)]
pub struct CreateSubmissionResponse {
    pub id: i32,
    pub slug: String,
    pub submitters: Vec<SubmitterResponse>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitterResponse {
    pub id: i32,
    pub slug: String,
    pub email: String,
    pub url: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct GetSubmissionResponse {
    pub id: i32,
    pub slug: String,
    pub status: String,
    pub submitters: Vec<SubmitterResponse>,
    #[serde(default)]
    pub documents: Vec<Document>,
}

#[derive(Debug, Deserialize)]
pub struct Document {
    pub url: String,
    pub name: String,
}

/// DocuSeal API client
pub struct DocuSealClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl DocuSealClient {
    pub fn new(api_key: String, base_url: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url,
        }
    }

    /// Create a new submission (send document for signing)
    pub async fn create_submission(
        &self,
        template_id: i32,
        submitter_name: String,
        submitter_email: String,
    ) -> Result<CreateSubmissionResponse, Box<dyn std::error::Error>> {
        let url = format!("{}/submissions", self.base_url);

        let request_body = CreateSubmissionRequest {
            template_id,
            send_email: true,
            submitters: vec![Submitter {
                name: submitter_name,
                email: submitter_email,
                role: Some("Signer".to_string()),
            }],
        };

        info!(
            template_id,
            url = %url,
            "Creating DocuSeal submission"
        );

        let response = self
            .client
            .post(&url)
            .header("X-Auth-Token", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();
        let headers = response.headers().clone();
        let body_text = response.text().await?;

        if !status.is_success() {
            error!(
                status = %status,
                error = %body_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, body_text).into());
        }

        // The API returns an array of submitters. We need to parse it as such.
        match serde_json::from_str::<Vec<DocuSealSubmitter>>(&body_text) {
            Ok(submitters) => {
                if let Some(first_submitter) = submitters.first() {
                    // Construct our internal response type from the API response.
                    let submission = CreateSubmissionResponse {
                        id: first_submitter.submission_id,
                        slug: first_submitter.slug.clone(),
                        submitters: vec![], // Not needed for this step
                    };
                    info!(submission_id = submission.id, "DocuSeal submission created");
                    Ok(submission)
                } else {
                    let err_msg = "DocuSeal response was an empty array";
                    error!(body = %body_text, err_msg);
                    Err(err_msg.into())
                }
            }
            Err(e) => {
                error!(error = %e, body = %body_text, "Failed to decode DocuSeal response");
                Err(Box::new(e))
            }
        }
    }

    /// Get submission status
    pub async fn get_submission(
        &self,
        submission_id: i32,
    ) -> Result<GetSubmissionResponse, Box<dyn std::error::Error>> {
        let url = format!("{}/submissions/{}", self.base_url, submission_id);

        info!(submission_id, url = %url, "Fetching DocuSeal submission");

        let response = self
            .client
            .get(&url)
            .header("X-Auth-Token", &self.api_key)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        let submission = response.json::<GetSubmissionResponse>().await?;
        info!(
            submission_id = submission.id,
            status = %submission.status,
            "DocuSeal submission fetched"
        );

        Ok(submission)
    }

    /// Archive (void) a submission
    pub async fn archive_submission(
        &self,
        submission_id: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!("{}/submissions/{}/archive", self.base_url, submission_id);

        info!(submission_id, url = %url, "Archiving DocuSeal submission");

        let response = self
            .client
            .patch(&url)
            .header("X-Auth-Token", &self.api_key)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        info!(submission_id, "DocuSeal submission archived");
        Ok(())
    }

    /// Create a JWT token for the embedded builder
    pub fn create_builder_token(
        &self,
        user_email: String,
        user_name: String,
        integration_email: String,
        template_id: Option<i32>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        use jsonwebtoken::{encode, EncodingKey, Header};

        #[derive(Debug, Serialize)]
        struct BuilderClaims {
            user_email: String,
            name: String,
            // integration_email identifies the user in DocuSeal
            integration_email: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            template_id: Option<i32>,
            exp: usize,
        }

        let expiration = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(1))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = BuilderClaims {
            user_email,
            name: user_name,
            integration_email,
            template_id,
            exp: expiration,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.api_key.as_bytes()),
        )?;

        Ok(token)
    }

    /// List templates from DocuSeal
    pub async fn list_templates(
        &self,
        limit: Option<i32>,
    ) -> Result<ListTemplatesResponse, Box<dyn std::error::Error>> {
        let url = format!("{}/templates", self.base_url);
        let limit = limit.unwrap_or(100);

        info!(url = %url, "Fetching DocuSeal templates");

        let response = self
            .client
            .get(&url)
            .header("X-Auth-Token", &self.api_key)
            .query(&[("limit", limit)])
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        let templates = response.json::<ListTemplatesResponse>().await?;
        info!(count = templates.data.len(), "DocuSeal templates fetched");

        Ok(templates)
    }

    /// Create a new template from a document
    pub async fn create_template(
        &self,
        name: String,
        document_name: String,
        document_base64: String,
    ) -> Result<CreateTemplateResponse, Box<dyn std::error::Error>> {
        let url = format!("{}/templates/pdf", self.base_url);

        let request_body = CreateTemplateRequest {
            name,
            documents: vec![TemplateDocument {
                name: document_name,
                file: document_base64,
            }],
        };

        info!(url = %url, "Creating DocuSeal template");

        let response = self
            .client
            .post(&url)
            .header("X-Auth-Token", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        let template = response.json::<CreateTemplateResponse>().await?;
        info!(template_id = template.id, "DocuSeal template created");

        Ok(template)
    }

    /// Get template details
    pub async fn get_template(
        &self,
        template_id: i32,
    ) -> Result<TemplateDetails, Box<dyn std::error::Error>> {
        let url = format!("{}/templates/{}", self.base_url, template_id);

        info!(template_id, url = %url, "Fetching DocuSeal template details");

        let response = self
            .client
            .get(&url)
            .header("X-Auth-Token", &self.api_key)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        let template = response.json::<TemplateDetails>().await?;
        info!(template_id = template.id, "DocuSeal template details fetched");

        Ok(template)
    }

    /// Update an existing template's documents
    pub async fn update_template_documents(
        &self,
        template_id: i32,
        document_name: String,
        document_base64: String,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!("{}/templates/{}/documents", self.base_url, template_id);

        let request_body = json!({
            "documents": vec![TemplateDocument {
                name: document_name,
                file: document_base64,
            }],
        });

        info!(template_id, url = %url, "Updating DocuSeal template documents");

        let response = self
            .client
            .put(&url)
            .header("X-Auth-Token", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        info!(template_id, "DocuSeal template documents updated");
        Ok(())
    }

    /// Update an existing template's metadata (e.g. name)
    pub async fn update_template(
        &self,
        template_id: i32,
        name: String,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!("{}/templates/{}", self.base_url, template_id);

        let request_body = json!({
            "name": name,
        });

        info!(template_id, name = %name, url = %url, "Updating DocuSeal template metadata");

        let response = self
            .client
            .patch(&url)
            .header("X-Auth-Token", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        info!(template_id, "DocuSeal template metadata updated");
        Ok(())
    }

    /// Delete a template
    pub async fn delete_template(
        &self,
        template_id: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!("{}/templates/{}", self.base_url, template_id);

        info!(template_id, url = %url, "Deleting DocuSeal template");

        let response = self
            .client
            .delete(&url)
            .header("X-Auth-Token", &self.api_key)
            .query(&[("permanently", "true")])
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!(
                status = %status,
                error = %error_text,
                "DocuSeal API error"
            );
            return Err(format!("DocuSeal API error: {} - {}", status, error_text).into());
        }

        info!(template_id, "DocuSeal template deleted");
        Ok(())
    }
}

use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct ListTemplatesResponse {
    pub data: Vec<Template>,
}

#[derive(Debug, Deserialize)]
pub struct Template {
    pub id: i32,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct TemplateDetails {
    pub id: i32,
    pub name: String,
    pub documents: Vec<TemplateDocumentDetails>,
}

#[derive(Debug, Deserialize)]
pub struct TemplateDocumentDetails {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub documents: Vec<TemplateDocument>,
}

#[derive(Debug, Serialize)]
pub struct TemplateDocument {
    pub name: String,
    pub file: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateResponse {
    pub id: i32,
    pub slug: String,
    pub name: String,
}
