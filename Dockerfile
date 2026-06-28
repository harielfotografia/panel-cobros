FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG JWT_SECRET
ARG CRON_SECRET
ARG DATABASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG COOKIE_SECURE
ARG TRANSBANK_ENV
ARG MP_ACCESS_TOKEN
ARG SMTP_HOST
ARG SMTP_USER
ARG SMTP_PASS
ARG SMTP_FROM
ENV JWT_SECRET=$JWT_SECRET
ENV CRON_SECRET=$CRON_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV COOKIE_SECURE=$COOKIE_SECURE
ENV TRANSBANK_ENV=$TRANSBANK_ENV
ENV MP_ACCESS_TOKEN=$MP_ACCESS_TOKEN
ENV SMTP_HOST=$SMTP_HOST
ENV SMTP_USER=$SMTP_USER
ENV SMTP_PASS=$SMTP_PASS
ENV SMTP_FROM=$SMTP_FROM
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
