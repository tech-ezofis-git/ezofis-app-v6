# API Service Dockerfile Template
FROM node:20-alpine
WORKDIR /api
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
