<!-- README_HEADER -->
<div align="center">
  <h1>🚀 Maplewood Scheduler</h1>
  <p><em>Smart scheduling for modern teams</em></p>
  
  <p>
    <a href="https://github.com/<org>/<repo>/actions/workflows/ci.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/<org>/<repo>/ci.yml?label=build&style=flat-square"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-0ea5e9?style=flat-square"></a>
    <a href="https://github.com/<org>/<repo>/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/<org>/<repo>?style=flat-square"></a>
    <a href="https://github.com/<org>/<repo>/issues"><img alt="Issues" src="https://img.shields.io/github/issues/<org>/<repo>?style=flat-square"></a>
    <a href="https://github.com/<org>/<repo>/pulls"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-0ea5e9?style=flat-square"></a>
    <a href="https://github.com/<org>/<repo>/commits"><img alt="Last Commit" src="https://img.shields.io/github/last-commit/<org>/<repo>?style=flat-square"></a>
    <img alt="Made with love" src="https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-0ea5e9?style=flat-square">
  </p>
</div>

> Maplewood Scheduler keeps teams on track with a friendly UI and robust API. Plan shifts, track coverage, and ship with confidence.

<p align="center">
  <img src="https://img.shields.io/badge/%E2%9C%A8-Fast-0ea5e9?style=flat-square" alt="Fast">
  <img src="https://img.shields.io/badge/%F0%9F%A7%A0-Smart-0ea5e9?style=flat-square" alt="Smart">
  <img src="https://img.shields.io/badge/%F0%9F%94%92-Secure-0ea5e9?style=flat-square" alt="Secure">
  <img src="https://img.shields.io/badge/%F0%9F%93%B1-Mobile--first-0ea5e9?style=flat-square" alt="Mobile first">
</p>

<p align="center">
  <a href="TODO">Live Demo</a> •
  <a href="#installation--quick-start">Quickstart</a> •
  <a href="https://github.com/codespaces/new">Open in Codespaces</a>
</p>

<details>
<summary>Table of Contents</summary>

- [Screenshots](#screenshots)
- [Live Demo & Quick Links](#live-demo--quick-links)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation & Quick Start](#installation--quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Why this project?](#why-this-project)
- [Performance & Accessibility](#performance--accessibility)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [Acknowledgements](#acknowledgements)
- [License](#license)

</details>

## Screenshots

Screenshots are stored in `./docs/media/` and are not tracked in git.
Replace the placeholders below with your own images.

![Home screen](./docs/media/screenshot-1.png "Home screen")

| ![Scheduler](./docs/media/screenshot-1.png "Scheduler") | ![Analytics](./docs/media/screenshot-2.png "Analytics") | ![Mobile demo](./docs/media/screenshot-3.gif "Mobile") |
|:--:|:--:|:--:|
| Calendar board | Reports view | Responsive UI |

## Live Demo & Quick Links

- 🌐 [Live Demo](TODO)
- 📚 [Docs](./docs/OVERVIEW.md)
- 🐞 [Issues](https://github.com/<org>/<repo>/issues)
- 💬 [Discussions](https://github.com/<org>/<repo>/discussions)
- 🛣️ [Roadmap](#roadmap)

## Features

- 🚀 **Real-time updates** – see changes instantly.
- 🎯 **Smart recommendations** – suggest optimal schedules.
- 🔄 **Bulk actions** – manage multiple shifts quickly.
- 🔒 **Secure by design** – token-based auth.
- 📱 **Responsive** – works on any device.

## Architecture

```mermaid
flowchart LR
  user[User 👤] --> ui[Maplewood Scheduler UI]
  ui --> api[(API)]
  api --> db[(Database)]
  ui --> cache[(Cache/Persistence)]
  subgraph Integrations
    sso[SSO/OAuth]
    cdn[CDN/Assets]
    logs[Logging/Analytics]
  end
  api --> logs
  ui --> cdn
```

## Tech Stack

- ⚛️ React
- 🌀 Vite
- 🟦 TypeScript
- 🗄️ Express
- 🧪 Vitest

## Installation & Quick Start

```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>
npm install
npm run dev
```

## Configuration

| Variable | Default | Description |
|---------|---------|-------------|
| `ANALYTICS_AUTH_TOKEN` | – | Bearer token for analytics endpoints |
| `PORT` | `3000` | Server port |

Example `.env.local`:

```bash
ANALYTICS_AUTH_TOKEN=mys3cret
PORT=3000
```

## Usage

```ts
import { getVacancies } from "./src/utils/api";

getVacancies().then(console.log);
```

## Why this project?

1. 🎯 Focused on scheduling pains of small teams.
2. 🌈 Friendly, accessible interface.
3. 🧩 Flexible architecture for integrations.

## Performance & Accessibility

- ✅ Lazy-loaded routes and code-splitting.
- ✅ Tested with keyboard and screen readers.
- ✅ Color-contrast checked against WCAG AA.

## Security

Please report vulnerabilities via [responsible disclosure](./SECURITY.md).

## Roadmap

- [ ] Public API
- [ ] Mobile PWA
- [ ] Plugin marketplace

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Code of Conduct

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

## FAQ

**How do I reset the database?**
: Remove `storage` data and restart the server.

**Can I deploy on Windows?**
: Yes, via Docker or Node 18+.

**Is there a dark mode?**
: Yes, toggle via the 🌓 icon in the header.

**Does it support mobile?**
: Fully responsive with touch support.

**Where can I get help?**
: Open a [discussion](https://github.com/<org>/<repo>/discussions).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Use Node 18+ and run `npm cache clean --force`. |
| Port already in use | Set `PORT` in `.env.local`. |

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Acknowledgements

Built with <span style="color:#0ea5e9">community support</span> and lots of ☕.

## License

Released under the [MIT](./LICENSE) License.

---

<p align="center">
If this project helps you, ⭐ the repo or <a href="https://github.com/sponsors/yourname">become a sponsor</a>.
</p>
