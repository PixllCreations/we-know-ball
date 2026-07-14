# syntax=docker/dockerfile:1

FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.25-alpine AS backend-build
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -tags embed -o /server .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=backend-build /server /server
EXPOSE 8080
ENV PORT=8080
CMD ["/server"]
