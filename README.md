# webhook-tester

Tiny Node webhook receiver exposed publicly via a Cloudflare Quick Tunnel (no account needed).

## Usage

```sh
npm install   # also downloads the cloudflared binary
npm start     # starts server on :3000 and prints the public tunnel URLs
npm run local # server only, no tunnel
```

## Endpoints

| Path    | Logs                             |
|---------|----------------------------------|
| `/auth` | `Auth endpoint called: <DATA>`   |
| `/data` | `Data endpoint called: <DATA>`   |

Any method is accepted. `<DATA>` is the request body (JSON is compacted), or the query params if there's no body.

```sh
curl -X POST https://<your-tunnel>.trycloudflare.com/auth -H 'content-type: application/json' -d '{"token":"abc"}'
```

## Testing retries

Set `AUTH_STATUSES` / `DATA_STATUSES` to a comma-separated list of status codes. Each endpoint returns them in order on its first calls, then `200` for every call after that:

```sh
AUTH_STATUSES=503 DATA_STATUSES=500,429 npm start
# /auth: 503, 200, 200, ...
# /data: 500, 429, 200, ...
```

Call counts reset when the server restarts. Set `PORT` to change the port. New tunnels can take a few seconds before DNS resolves.
