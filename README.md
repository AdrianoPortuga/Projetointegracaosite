# SDR Widget Integration

## Runtime config

Set `SDR_API_BASE_URL` in Vercel Project Environment Variables.

The frontend fetches this value through `/api/sdr-config`.

## Local override options

1. Define `window.__SDR_WIDGET_CONFIG__ = { apiBaseUrl: "http://localhost:8080" };` before loading `sdr-widget.js`.
2. Or set `<meta name="sdr-api-base-url" content="http://localhost:8080" />` in `index.html`.
