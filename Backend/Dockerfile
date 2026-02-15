FROM node:18-alpine

RUN apk add --no-cache \
    curl \
    bash \
    ca-certificates \
    openssl \
    git


RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash


ARG KUBECTL_VERSION=v1.29.0

RUN curl -LO https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl


RUN helm version && kubectl version --client


WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000
CMD ["npm", "start"]