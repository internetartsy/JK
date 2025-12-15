use actix_web::{
    dev::{ServiceRequest, ServiceResponse},
    Error,
};
use actix_web::dev::{Service, Transform};
use futures::future::{ok, Ready, LocalBoxFuture};
use std::rc::Rc;
use governor::{Quota, RateLimiter, DefaultKeyedRateLimiter};
use governor::clock::DefaultClock;
use std::num::NonZeroU32;
use log::warn;

// Refactored to use Keyed Rate Limiter (Per IP)
// Key type is String (IP Address)

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
        // Allow 20 requests per second per IP with burst of 50
        let quota = Quota::per_second(NonZeroU32::new(20).unwrap()).allow_burst(NonZeroU32::new(50).unwrap());
        // Use a Keyed rate limiter. Note: Actix runs multiple threads, but `Rc` confines this middleware instance to one thread.
        // Governor handles internal state thread-safely with Arc usually, but here we are creating one limiter per worker thread if using Rc.
        // This effectively means 20 req/s/IP *per worker*. This is acceptable for high perf.
        let limiter = Rc::new(RateLimiter::keyed(quota));
        
        ok(RateLimitMiddleware {
            service: Rc::new(service),
            limiter,
        })
    }
}

pub struct RateLimitMiddleware<S> {
    service: Rc<S>,
    // Keyed: Key is String (IP)
    limiter: Rc<DefaultKeyedRateLimiter<String>>,
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
        
        // Extract IP for rate limiting key
        let ip = req.peer_addr().map(|a| a.ip().to_string()).unwrap_or_else(|| "unknown".to_string());

        Box::pin(async move {
            // Check Rate Limit for this IP
            if let Err(_negative) = limiter.check_key(&ip) {
                warn!("Rate limit exceeded for IP: {}", ip);
                 return Err(actix_web::error::ErrorTooManyRequests("Rate limit exceeded"));
            }

            srv.call(req).await
        })
    }
}

