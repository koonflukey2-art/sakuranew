# VPS Nginx setup (sakura-production.online)

This guide installs the production Nginx config safely and ensures the HTTP-level zone definitions are loaded in the correct place.

## Install the server block

1. Copy the server block file into the Nginx sites-available directory:

   ```bash
   sudo cp /opt/sakuranew/files/project/nginx.sakura-production.online.conf /etc/nginx/sites-available/sakura-production.online.conf
   ```

2. Enable it with a symlink in sites-enabled:

   ```bash
   sudo ln -s /etc/nginx/sites-available/sakura-production.online.conf /etc/nginx/sites-enabled/sakura-production.online.conf
   ```

## Install the HTTP-level zones snippet

You must include `nginx.http-zones.conf` inside the **global** `http { ... }` block.

**Do not** include it inside a `server { ... }` block or inside a file under `sites-enabled/`. It will fail to load.

Option A (recommended: direct include from repo path):

```nginx
http {
  include /opt/sakuranew/files/project/nginx.http-zones.conf;
  # ... existing http config ...
}
```

Option B (copy into snippets directory):

```bash
sudo cp /opt/sakuranew/files/project/nginx.http-zones.conf /etc/nginx/snippets/nginx.http-zones.conf
```

Then include it from `/etc/nginx/nginx.conf` inside `http { ... }`:

```nginx
http {
  include /etc/nginx/snippets/nginx.http-zones.conf;
  # ... existing http config ...
}
```

## Validate and reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verification checklist

- `nginx -t` passes without errors.
- `/api/cron/*` is blocked from outside (allow localhost only).
- Webhook endpoints return HTTP 200 on missing signature (and do not process payloads).
