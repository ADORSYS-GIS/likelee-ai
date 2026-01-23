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

        let submission = response.json::<CreateSubmissionResponse>().await?;
        info!(submission_id = submission.id, "DocuSeal submission created");

        Ok(submission)
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
}

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
