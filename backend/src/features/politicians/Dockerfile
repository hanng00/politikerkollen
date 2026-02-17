FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 AS aws-lambda-adapter
FROM oven/bun:1-debian

# Install CA certificates for TLS (required for MotherDuck / gRPC)
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy Lambda adapter
COPY --from=aws-lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=8080
ENV AWS_LWA_INVOKE_MODE=buffered

WORKDIR /var/task

# Lambda writable paths
ENV HOME=/tmp
ENV BUN_HOME=/tmp/bun
ENV DUCKDB_HOME=/tmp/.duckdb

COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile || bun install --production

COPY src/ ./src/

CMD ["bun", "run", "src/features/politicians/index.ts"]
