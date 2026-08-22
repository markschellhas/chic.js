# Change Log
All notable changes to this project will be documented in this file. 

To upgrade simply reinstall the package:
 
```bash
npm install -g chic.js
```

or in your project directory:

```bash
npm install chic.js
```

## [2.0.0] - Unreleased

- Makes Drizzle with SQLite the default persistence stack
- Generates TypeScript and Svelte 5 CRUD resources with Zod validation
- Adds atomic generation, dry runs, collision policies, and scaffold destruction
- Adds paired SQL migrations with migrate, rollback, reset, seed, studio, and console commands
- Adds model, controller, route, component, migration, and config-file generators
- Adds REST, no-API, and experimental remote-function scaffold modes
- Adds `chic doctor`, safe route inspection, source-based sitemaps, and modern `sv` add-ons
- Adds generated-project integration coverage and pull-request CI
- Preserves existing SvelteKit hooks and defaults production debug routes to off


## [1.5.2] - 2026-08-21

- Requires Node.js `^22.18.0 || >=24.11.0` (Active LTS is Node 24)
- Upgrades development dependencies: Babel 8 and Jest 30.4
- Updates GitHub Actions to `actions/checkout@v7` and `actions/setup-node@v7`
- Security upgrades on transitive dependencies

## [1.5.1] - 2025-12-31

- Security upgrades on dependencies

## [1.5.0] - 2025-12-13

- Swaps out `create-svelte` (deprecated) for `sv` package instead 

## [1.4.3] - 2024-07-17

- small refactor: removes `chic.js` as a dependency in `package.json` file

## [1.4.3] - 2024-03-04

- bug fix on destroy method for api endpoints

## [1.4.2] - 2024-03-01

- adds npm funding link

## [1.4.1] - 2024-03-01

- refactors version indication and removes version test
- adds catch all command
- adds donation support link

## [1.4.0] - 2024-01-31

Adds sitemap generation command `chic sitemap`

## [1.3.0] - 2023-08-08

Adds funcitonality to hide `/routes` for production deployments by settings `CHIC_DEBUG=OFF` in the `.env` file.

### Changed
- Adds `debug` mode command. Usage example: `chic debug status`, which will show the current `CHIC_DEBUG` value set in the `.env` file. If `ON` routes table will be shown. If `OFF` routes table will not be shown.

## [1.2.0] - 2023-08-06

Minor changes and bug fixes

### Changed
- formating changes to README
- adds created model to `chic.json` file (experimental)
- New `chic add` command adds ability to create a new Page or Component.

## [1.1.1] - 2023-08-03

Minor changes to README

### Changed
- updated descriptions of commands

## [1.1.0] - 2023-08-03

Adds `styled with` feature to easily add styling frameworks to your project on creation.

### Changed
- adds error notice message to `renderedRouteTable`
- adds `styled with <framework>` option to `new` command. Usage example: `chic new my-app styled with bootstrap`
- adds version check test to avoid publishing incorrect version numbers

## [1.0.2] - 2023-07-31

Minor bug fixes

### Changed
- removes `test.html`


## [1.0.1] - 2023-07-31

To upgrade simply reinstall the package:
 
```bash
npm install -g chic.js
```

or using npx:

```bash
npx chic new my-app
```

### Added
- `chic.js` now automatically added as a dependency so that it can be used in `hooks.server.js` file without having to install it as a dependency in the project.

## [0.11.0] - 2023-07-31

To upgrade simply reinstall the package:
 
```bash
npm install -g chic.js
```

### Added
- ui hook for `routes` endpoint
- `RoutesTable` UI module. To use `import { RoutesTable } from 'chic.js/ui'` in `hooks.server.js` file.

### Changed
- Improved `routes` UI

## [0.10.0] - 2023-07-30
 
To upgrade simply reinstall the package:
 
```bash
npm install -g chic.js
```
 
### Added
- `.npmignore` file added to prevent unnecessary files being published to npm
- Updated website url in `package.json`
- Comments in MVC files
- Adds more documentation
- Adds `routes` command to update routes endpoint

 
### Changed
- Refactored templates
- `edit` controller functions renamed to `update`
- Removed unused functions
 
### Fixed

## [0.9.0] - 2023-07-29
 
To upgrade simply reinstall the package:
 
```bash
npm install -g chic.js
```
 
### Added
- More test coverage
- More documentation
- Destroy resource button component added to editing forms
- CRUD operations added to API endpoints

 
### Changed
- Refactored templates
- `edit` controller functions renamed to `update`
- Removed unused functions
 
### Fixed
