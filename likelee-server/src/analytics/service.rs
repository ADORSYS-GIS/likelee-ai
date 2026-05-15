use crate::auth::{AuthUser, RoleGuard};
use crate::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::json;
use std::collections::{HashMap, HashSet};


use super::*;

pub fn parse_mode(mode: Option<&str>) -> AnalyticsMode {
    match mode.unwrap_or("irl").to_lowercase().as_str() {
        "ai" => AnalyticsMode::Ai,
        _ => AnalyticsMode::Irl,
    }
}


pub fn format_currency(cents: i64) -> String {
    let dollars = (cents as f64 / 100.0).round() as i64;
    let s = dollars.to_string();
    let is_negative = s.starts_with('-');
    let abs_s = if is_negative { &s[1..] } else { &s };
    let mut out = String::new();
    for (i, c) in abs_s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    let formatted: String = out.chars().rev().collect();
    if is_negative {
        format!("-${}", formatted)
    } else {
        format!("${}", formatted)
    }
}


