# Security

The app uses bearer tokens for analytics endpoints and follows least-privilege
principles. Client data persists locally; server data stays on the server.

## Threat Model

- 🔒 Authentication guards administrative routes.
- 🛡️ Input validation prevents injection attacks.
- 📦 Dependencies are scanned during CI.

## Reporting

See [../SECURITY.md](../SECURITY.md) for disclosure process and contacts.
