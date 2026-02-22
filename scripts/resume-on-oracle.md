# Oracle 서버에서 Claude Code로 이어받기

## 1. 서버 접속 후 레포 클론
```bash
ssh ubuntu@your-oracle-ip
git clone https://github.com/YOUR_USER/onlineGo.git
cd onlineGo
```

## 2. Claude Code로 설치 시작
```bash
claude
```

Claude Code에서 아래 명령 실행:
```
Supabase를 이 Oracle ARM 서버에 설치해줘.
scripts/setup-oracle.sh 스크립트를 실행하고, 도메인은 [너의도메인.com], 이메일은 [너의이메일]로 설정해.
완료되면 Vercel 환경변수용 키를 알려줘.
```

## 3. 수동 설치 (Claude Code 없이)
```bash
chmod +x scripts/setup-oracle.sh
sudo ./scripts/setup-oracle.sh your-domain.com your@email.com
```

## 4. 설치 후 확인
```bash
# Supabase 상태 확인
docker compose -f /opt/supabase/docker/docker-compose.yml ps

# API 테스트
curl https://your-domain.com/rest/v1/ -H "apikey: YOUR_ANON_KEY"

# Realtime 확인
curl https://your-domain.com/realtime/v1/websocket
```

## 5. Vercel 배포
1. GitHub repo를 Vercel에 연결
2. 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-domain.com`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (setup 스크립트 출력에서 복사)
3. Deploy

## 6. 문제 해결 시 Claude Code에서
```
Oracle 서버에서 Supabase가 안되는데 확인해줘.
docker compose logs를 보고 문제를 진단해줘.
```
