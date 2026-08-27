FROM node:24-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json ./
COPY packages/schema/package.json packages/schema/
COPY apps/api/package.json apps/api/
RUN npm ci
COPY packages/schema packages/schema
COPY apps/api apps/api
RUN npm run build --workspace @lavion/schema \
 && npm run build --workspace @lavion/api

FROM node:24-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/schema/dist packages/schema/dist
COPY --from=build /repo/packages/schema/package.json packages/schema/
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/package.json apps/api/
USER node
EXPOSE 4000
# Docker owns process supervision. No PM2 inside the container — two
# supervisors with two restart policies produce untraceable outages.
CMD ["node", "apps/api/dist/server.js"]
