# About Chic.js

Chic.js is a rapid prototyping tool for Sveltekit. Use the CLI to scaffold your app quickly, and focus on the fun stuff.  
📺 Watch a walkthrough video by [Svelte Safari](https://www.youtube.com/@SvelteSafari) here: https://www.youtube.com/watch?v=AZdUtR4GYtE


# Getting started

## Installation

`npm install -g chic.js`

## Usage

1. Create a new Sveltekit app with `chic new MyApp`
2. Change into your app directory with `cd MyApp`
3. Use the `chic make` command to scaffold views, models, routes & API endpoints for a new resource. For example: `chic make Book title:string author:string about:text`, will create a Book resource with all the views, model and controllers need for CRUD operations on your resource.
4. Run the development server with `chic s`
5. And voila! You have a working app with a Book resource.

## Routes

Chic.js adds a `/routes` endpoint to your app, which shows all the routes in your app - for example API endpoints for your resources created by Chic.js. This is useful for debugging and development. To hide the `/routes` endpoint in production, set `CHIC_DEBUG=OFF` in your `.env` file.


## Chic commands

| Command | Description |
| --- | --- |
| `chic --help` | Displays help information about Chic.js commands |
| `chic --version` | Displays the current version of Chic.js |
| `chic new GuitarStore` | Creates a new Sveltekit app, called `GuitarStore` |
| `chic new GuitarStore styled with tailwind` | Creates a new Sveltekit app, called `GuitarStore`, with Tailwind CSS styling framework. Options currently available: `bootstrap`, `tailwind` and `bulma` |
| `chic make Guitar name:string type:string description:text` | Creates pages, API routes, model and form components for CRUD operations on the `Guitar` resource |
| `chic add /about` | Creates an "About" page in the `src/routes` directory |
| `chic add ContactForm` | Creates a `ContactForm.svelte` component in the `src/lib/components` directory |
| `chic sitemap [domain name]` | Creates a sitemap (note: build your project locally first before running this command) |
| `chic s` | Runs the development server |
| `chic debug status` | Shows the status of `CHIC_DEBUG` in your `.env` file |
| `chic debug ON` | Sets `CHIC_DEBUG` value to `ON`. When `ON`, the routes endpoint will be active |
| `chic debug OFF` | Sets `CHIC_DEBUG` value to `OFF`. When `OFF`, the routes endpoint will be inactive |