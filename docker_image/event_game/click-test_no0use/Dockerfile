FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY server.js ./
COPY client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server.js"]
