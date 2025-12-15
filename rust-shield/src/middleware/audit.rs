use actix_web::{
    dev::{ServiceRequest, ServiceResponse},
    Error, HttpMessage,
};
use actix_web::dev::{Service, Transform};
use futures::future::{ok, Ready, LocalBoxFuture};
use std::rc::Rc;
use std::time::Instant;
use log::info;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Claims {
    sub: String,
}

pub struct AuditLog;

impl<S, B> Transform<S, ServiceRequest> for AuditLog
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuditLogMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(AuditLogMiddleware {
            service: Rc::new(service),
        })
    }
}

pub struct AuditLogMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuditLogMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, ctx: &mut core::task::Context<'_>) -> core::task::Poll<Result<(), Self::Error>> {
        self.service.poll_ready(ctx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let srv = self.service.clone();
        
        // Extract User ID (sub) with Signature Verification
        let user_id = if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                if auth_str.starts_with("Bearer ") {
                     let token = &auth_str[7..];
                     let mut validation = Validation::new(Algorithm::HS256);
                     // Enforce expiration check by default
                     
                     let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "supersecretjwt".to_string());
                     
                     decode::<Claims>(token, &DecodingKey::from_secret(jwt_secret.as_bytes()), &validation)
                        .map(|data| data.claims.sub)
                        .unwrap_or_else(|_| "invalid_token".to_string())
                } else {
                    "anonymous".to_string()
                }
            } else {
                "anonymous".to_string()
            }
        } else {
            "anonymous".to_string()
        };

        Box::pin(async move {
            let start_time = Instant::now();
            let method = req.method().to_string();
            let path = req.path().to_string();
            let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_else(|| "-".to_string());
            
            // Call the service
            let res = srv.call(req).await?;
            
            let duration = start_time.elapsed();
            let status = res.status().as_u16();
            
            // Async Log (Formatted as JSON for ingestion)
            info!(target: "audit", 
                "{{ \"method\": \"{}\", \"path\": \"{}\", \"status\": {}, \"duration_ms\": {}, \"ip\": \"{}\", \"user_id\": \"{}\" }}",
                method, path, status, duration.as_millis(), ip, user_id
            );

            Ok(res)
        })
    }
}
