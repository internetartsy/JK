use actix_web::{web, App, HttpServer, HttpResponse, Responder, HttpRequest, middleware};
use actix_web::http::StatusCode;
use log::{info, warn, error};
use std::env;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

struct AppState {
    db: Pool<Postgres>,
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

async fn proxy_handler(req: HttpRequest, _body: web::Bytes) -> impl Responder {
    let path = req.path();
    let method = req.method().as_str();
    
    let target_service = if path.starts_with("/app") || path.starts_with("/assets") || path.starts_with("/files") {
        "Frappe (ERPNext) at port 8001"
    } else if path.starts_with("/api/v1/ocr") {
        "FastAPI (OCR Engine) at port 8000 [Compute Intensive]"
    } else if path.starts_with("/api") {
        "FastAPI (Core Backend) at port 8000"
    } else {
        "Unknown/Blocked"
    };

    info!("Request: {} {} -> Routing to {}", method, path, target_service);

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Request passed GeoShield Security Gateway",
        "routing_decision": {
            "path": path,
            "target": target_service
        },
        "status": "forwarded (mock)"
    }))
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
        .expect("Failed to create pool");
    
    info!("✅ Connected to PostGIS");

    let port = 8090;
    info!("🛡️  GeoShield Security Gateway starting on port {}", port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(AppState {
                db: pool.clone(),
            }))
            .wrap(middleware::Logger::default())
            .route("/health", web::get().to(health_check))
            .route("/db-check", web::get().to(db_check))
            .default_service(web::to(proxy_handler))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
