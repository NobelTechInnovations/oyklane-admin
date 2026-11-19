# Oyklane seller admin (Next.js): one container on the AWS server, behind
# the shared Caddy proxy (see deploy/aws.md).
FROM node:22-bookworm-slim
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# Dependencies first (cached between deploys when only code changes).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .nvmrc ./
COPY apps/admin/package.json apps/admin/
COPY packages/theme-schema/package.json packages/theme-schema/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
COPY packages/validation/package.json packages/validation/
RUN pnpm install --frozen-lockfile

# Addresses compiled into the build (NEXT_PUBLIC_* reach the browser), set
# in deploy/docker-compose.*.yml.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN
COPY . .
RUN pnpm --filter @shopcycle/admin build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/login',{redirect:'manual'}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/admin/server.js"]
