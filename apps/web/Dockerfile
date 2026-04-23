FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json /workspace/
COPY packages /workspace/packages
COPY apps/web /workspace/apps/web

RUN pnpm install --filter @campusstudy/web...

WORKDIR /workspace/apps/web

CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

