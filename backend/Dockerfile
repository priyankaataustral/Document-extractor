FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for TypeScript build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "run", "start"]
