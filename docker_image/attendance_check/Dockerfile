# 1. Base Image (Lightweight Alpine)
FROM node:18-alpine

# 2. Working Directory
WORKDIR /app

# 3. Dependencies
# Copy package files first to leverage cache
COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production

# 4. Copy Source Code
COPY . .

# 5. Environment & Port
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# 6. Run
CMD ["node", "index.js"]
