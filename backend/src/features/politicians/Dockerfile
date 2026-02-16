FROM public.ecr.aws/lambda/nodejs:22

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy all source code (needed for relative imports)
COPY src/ ./src/

# The handler is at src/features/politicians/index.handler
CMD ["src/features/politicians/index.handler"]
