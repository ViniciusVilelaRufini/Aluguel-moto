# PostgreSQL 16 + PostGIS 3 multi-arquitetura (a imagem postgis/postgis não publica arm64; a instância é Graviton).
FROM postgres:16-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
 && rm -rf /var/lib/apt/lists/*
