# Seller admin on AWS Lightsail (Docker)

Runs on the API's server (`ubuntu@13.200.105.217`) in `~/apps/oyklane-admin`, behind the shared Caddy in `~/apps/proxy`
(server layout: `oyklane-api/deploy/aws.md`). Set up with `oyklane-api/deploy/frontends-setup.sh`.

- **Address:** store.oyklane.com.
- **Deploy:** every push to `main` runs `.github/workflows/deploy.yml` → `~/apps/bin/deploy-oyklane-admin.sh` (pull, rebuild, restart).
  By hand: `~/apps/bin/deploy-oyklane-admin.sh`.
- **Settings:** addresses are build arguments in `deploy/docker-compose.prod.yml` (edit and push).
- **HTTPS:** `~/apps/proxy/sites/oyklane-admin.caddy` (copy of `deploy/oyklane-admin.caddy`).

## UAT
Branch `uat` → **https://uat-admin.oyklane.com** (`~/apps/oyklane-admin-uat`, `deploy/docker-compose.uat.yml`), against the UAT API.
Every push to `uat` runs `.github/workflows/deploy-uat.yml` (secret `AWS_UAT_SSH_KEY`). Set up with `frontends-setup.sh --uat`.

## Useful
```bash
cd ~/apps/oyklane-admin
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs --since 1h web
```
