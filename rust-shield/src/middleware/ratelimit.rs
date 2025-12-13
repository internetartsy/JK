use actix_web::{
    dev::{ServiceRequest, ServiceResponse},
    Error,
};
use actix_web::dev::{Service, Transform};
use futures::future::{ok, Ready, LocalBoxFuture};
use std::rc::Rc;
use governor::{Quota, RateLimiter, Jitter};
use governor::state::{InMemoryState, NotKeyed};
use std::num::NonZeroU32;
use log::warn;

// We will use a simple global rate limiter for this example, 
// or a keyed one if we want per-IP (more complex to share clean state in Actix middleware w/o Arc<Mutex>)
// For simplicity in this "MVP", we'll use a globally shared RateLimiter wrapped in a structural middleware.
// But Keyed rate limiting is better. Let's try to do it properly with per-IP.

// Actix middleware for Governor is often tricky because of the valid lifetime requirements.
// We'll use a simplified approach: specific strict quota.

pub struct RateLimit;


impl<S, B> Transform<S, ServiceRequest> for RateLimit
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = RateLimitMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        // Allow 20 requests per second with burst of 50
        let quota = Quota::per_second(NonZeroU32::new(20).unwrap()).allow_burst(NonZeroU32::new(50).unwrap());
        let limiter = Rc::new(RateLimiter::direct(quota));
        
        ok(RateLimitMiddleware {
            service: Rc::new(service),
            limiter,
        })
    }
}

pub struct RateLimitMiddleware<S> {
    service: Rc<S>,
    limiter: Rc<RateLimiter<NotKeyed, InMemoryState, governor::clock::DefaultClock>>,
}

impl<S, B> Service<ServiceRequest> for RateLimitMiddleware<S>
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
        let limiter = self.limiter.clone();

        Box::pin(async move {
            // Check Rate Limit
            if let Err(_negative) = limiter.check() {
                warn!("Rate limit exceeded");
                 return Err(actix_web::error::ErrorTooManyRequests("Rate limit exceeded"));
            }

            srv.call(req).await
        })
    }
}
