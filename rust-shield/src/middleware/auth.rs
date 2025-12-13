use actix_web::{
    dev::{ServiceRequest, ServiceResponse},
    Error,
};
use actix_web::dev::{Service, Transform};
use futures::future::{ok, Ready, LocalBoxFuture};
use std::rc::Rc;
use log::warn;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize)]
struct Claims {
    // sub: String,
    exp: usize,
}

pub struct Authentication;

impl<S, B> Transform<S, ServiceRequest> for Authentication
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthenticationMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(AuthenticationMiddleware {
            service: Rc::new(service),
        })
    }
}

pub struct AuthenticationMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuthenticationMiddleware<S>
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

        Box::pin(async move {
            // Bypass auth for health check and certain paths (e.g. docs, public assets)
            let path = req.path();
            if path == "/health" || path == "/db-check" || path == "/" 
                || path.starts_with("/assets") || path.starts_with("/app") 
                || path.starts_with("/files") || path.starts_with("/api") {
                 return srv.call(req).await;
            }

            // Check for Authorization Header
            if let Some(auth_header) = req.headers().get("Authorization") {
                if let Ok(auth_str) = auth_header.to_str() {
                    if auth_str.starts_with("Bearer ") {
                        let token = &auth_str[7..];
                        
                        // Get Secret
                        let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
                        
                        // Validate Token
                        let validation = Validation::new(Algorithm::HS256);
                        let key = DecodingKey::from_secret(secret.as_bytes());

                        match decode::<Claims>(token, &key, &validation) {
                            Ok(_) => {
                                // Valid token, proceed
                                return srv.call(req).await;
                            },
                            Err(e) => {
                                warn!("Invalid token: {:?}", e);
                            }
                        }
                    }
                }
            }

            // If we are here, auth failed or was missing
            warn!("Unauthorized access attempt to {}", path);
            Err(actix_web::error::ErrorUnauthorized("Unauthorized"))
        })
    }
}
