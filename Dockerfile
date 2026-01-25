# ----------- Stage 1: Build -----------
FROM node:22-alpine AS builder 

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma


#Add OpenSSL and CA certs to the image 
RUN apk add --no-cache openssl ca-certificates

RUN npm install --no-audit --no-fund

RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src

RUN npm run build

RUN npm prune --production

# ----------- Stage 2: Runtime -----------
FROM node:22-alpine 

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
