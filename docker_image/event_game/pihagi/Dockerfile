# Base Image
FROM node:18-alpine

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App Source (Only Server)
COPY server.js ./

# Env
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
