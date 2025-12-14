use actix_web::{web, App, HttpServer, HttpResponse, Responder, HttpRequest, middleware as actix_middleware, Error};
mod middleware;

use log::{info, error};
use std::env;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

struct AppState {
    db: Pool<Postgres>,
    client: reqwest::Client,
}

async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"status": "healthy", "service": "rust-shield"}))
}

async fn db_check(data: web::Data<AppState>) -> impl Responder {
    let query_result: Result<(String,), _> = sqlx::query_as("SELECT postgis_full_version()")
        .fetch_one(&data.db)
        .await;

    match query_result {
        Ok((version,)) => HttpResponse::Ok().json(serde_json::json!({
            "status": "connected",
            "postgis_version": version
        })),
        Err(e) => {
            error!("Database connection failed: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

async fn proxy_handler(req: HttpRequest, body: web::Bytes, data: web::Data<AppState>) -> Result<HttpResponse, Error> {
    let path = req.path();
    let method = req.method().clone();
    
    // Determine target service
    let target_base = if path.starts_with("/api/v1") {
        env::var("BACKEND_URL").unwrap_or_else(|_| "http://backend:8000".to_string())
    } else if path.starts_with("/app") || path.starts_with("/assets") || path.starts_with("/files") || path.starts_with("/api") {
       env::var("FRAPPE_URL").unwrap_or_else(|_| "http://frappe:8000".to_string())
    } else {
        // Default to frontend for all other routes
       env::var("FRONTEND_URL").unwrap_or_else(|_| "http://frontend:3000".to_string())
    };

    let target_url = format!("{}{}", target_base, path);
    // Append query string if present
    let target_url = if let Some(qs) = req.query_string().is_empty().then(|| "").or(Some(req.query_string())) {
        if !qs.is_empty() {
             format!("{}?{}", target_url, qs)
        } else {
            target_url
        }
    } else {
        target_url
    };

    info!("Proxying {} {} -> {}", method, path, target_url);

    // Forward Request using reqwest
    let mut request_builder = data.client.request(method.clone(), &target_url);
    
    // Copy headers (excluding host to avoid confusion)
    for (key, value) in req.headers() {
        if key != "host" && key != "content-length" {
             request_builder = request_builder.header(key, value);
        }
    }
    
    request_builder = request_builder.body(body.to_vec());

    match request_builder.send().await {
        Ok(resp) => {
            let status = resp.status();
            let mut client_resp = HttpResponse::build(status);
            
            // Copy response headers
            for (key, value) in resp.headers() {
                 client_resp.append_header((key, value));
            }
            
            let bytes = resp.bytes().await.map_err(|e| {
                error!("Failed to read response bytes: {}", e);
                actix_web::error::ErrorInternalServerError(e)
            })?;
            
            Ok(client_resp.body(bytes))
        },
        Err(e) => {
            error!("Proxy request failed: {}", e);
            Ok(HttpResponse::BadGateway().body(format!("Service unavailable: {}", e)))
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    
    info!("✅ Connected to PostGIS");

    let port = 8090;
    info!("🛡️  GeoShield Security Gateway starting on port {}", port);
    
    let client = reqwest::Client::new();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(AppState {
                db: pool.clone(),
                client: client.clone(),
            }))
            .wrap(actix_middleware::Logger::default())
            .wrap(middleware::headers::SecurityHeaders)
            .wrap(middleware::ratelimit::RateLimit)
            .wrap(middleware::audit::AuditLog)
            .wrap(middleware::auth::Authentication)
            .route("/health", web::get().to(health_check))
            .route("/api/health", web::get().to(health_check))
            .route("/db-check", web::get().to(db_check))
            .default_service(web::to(proxy_handler))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
