# Deployment steps

## How to deploy on VPS

Run the following commands on the VPS in `/opt/sakuranew`.

### 1) Update Nginx configuration (first-time or when config changes)

```bash
cd /opt/sakuranew
sudo cp /opt/sakuranew/files/project/nginx.sakura-production.online.conf /etc/nginx/sites-available/sakura-production.online.conf
sudo ln -s /etc/nginx/sites-available/sakura-production.online.conf /etc/nginx/sites-enabled/sakura-production.online.conf
```

Edit `/etc/nginx/nginx.conf` and ensure this include is inside `http { ... }`:

```nginx
include /opt/sakuranew/files/project/nginx.http-zones.conf;
```

Then validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 2) Deploy the application

Ensure required environment variables are set in the shell (do not print them):

```bash
export POSTGRES_PASSWORD=***
export NEXTAUTH_URL=***
export NEXTAUTH_SECRET=***
export AUTH_SECRET=***
```

Run the deploy helper:

```bash
cd /opt/sakuranew/files/project
./scripts/deploy-vps.sh
```

Optional rollback (deploy a specific SHA):

```bash
export DEPLOY_ROLLBACK_SHA=<commit-sha>
./scripts/deploy-vps.sh
```

### 3) Verify

```bash
curl -f http://127.0.0.1:3000/api/health
curl -I https://sakura-production.online
```

### 4) Logs and status

```bash
docker compose ps

docker compose logs --tail=200

sudo journalctl -u nginx --since "10 minutes ago"
```
