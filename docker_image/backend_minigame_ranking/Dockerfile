#1. base 이미지
FROM node:18-alpine

#2. working directory
WORKDIR /app

#3. dependencies
COPY package*.json ./
RUN npm install

#4. app source
# server.js 뿐만 아니라 dynamoClient.js도 필요하므로 현재 폴더의 모든 파일을 복사합니다.
# (.dockerignore 에 있는 파일들은 자동으로 제외됩니다)
COPY . .

# 5. 환경변수 
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# 6. 실행 명령어 (필수!)
CMD ["node", "server.js"]