# syntax=docker/dockerfile:1

# ---- Build Stage ----
FROM rust:1.88-slim AS builder
WORKDIR /app

# Cache deps
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
COPY likelee-server/Cargo.toml likelee-server/Cargo.lock* ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && rm -rf src

# Build actual
COPY likelee-server/ ./
RUN cargo build --release

# ---- Runtime Stage ----
FROM debian:stable-slim AS runtime
RUN useradd -m -u 10001 appuser && \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/likelee-server /usr/local/bin/likelee-server

EXPOSE 8787
USER 10001
ENV RUST_LOG=info

# Note: healthcheck path may differ; adjust if you add a /health endpoint
# HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:8787/health || exit 1

CMD ["/usr/local/bin/likelee-server"]
