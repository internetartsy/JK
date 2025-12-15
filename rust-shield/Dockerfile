FROM rust:1-slim-bookworm AS builder

WORKDIR /app

# Install system dependencies (OpenSSL needed for some crates)
RUN apt-get update && apt-get install -y pkg-config libssl-dev

# Create a dummy project to cache dependencies
RUN cargo new --bin rust-shield
WORKDIR /app/rust-shield

# Copy manifests
COPY Cargo.toml ./

# Build dependencies only (cache layer)
RUN cargo build --release
RUN rm src/*.rs

# Copy source code
COPY src ./src

# Build the actual application
RUN rm ./target/release/deps/rust_shield*
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies and upgrade packages to fix vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y libssl-dev ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/rust-shield/target/release/rust-shield /app/rust-shield

# Environment variables
ENV DATABASE_URL=""
ENV RUST_LOG=info

EXPOSE 8090

CMD ["./rust-shield"]
