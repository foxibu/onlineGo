# ── Stage 1: Build KataGo (Eigen / CPU-only, works on ARM64) ──────────────────
FROM ubuntu:22.04 AS builder

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake build-essential git ca-certificates \
    libzip-dev zlib1g-dev libeigen3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth=1 --branch v1.12.4 \
    https://github.com/lightvector/KataGo.git .

WORKDIR /src/cpp
RUN cmake . \
    -DUSE_BACKEND=EIGEN \
    -DNO_GIT_REVISION=1 \
    -DBUILD_TESTS=0 \
    && make -j$(nproc) katago

# ── Stage 2: Runtime image ─────────────────────────────────────────────────────
FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzip4 wget ca-certificates python3 python3-pip \
    && pip3 install --no-cache-dir aiohttp \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/cpp/katago /usr/local/bin/katago

# Download b18c384nbt-uec model bundled with v1.12.4 (~93 MB)
RUN wget -q -L -O /model.bin.gz \
    "https://github.com/lightvector/KataGo/releases/download/v1.12.4/b18c384nbt-uec.bin.gz"

WORKDIR /app
COPY server.py analysis.cfg ./

EXPOSE 8080
CMD ["python3", "server.py"]
