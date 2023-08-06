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