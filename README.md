# About Chic.js

Chic.js is a rapid prototyping tool for Sveltekit. Use the CLI to scaffold your app quickly, and focus on the fun stuff.

# Getting started

## Installation

`npm install -g chic.js`

## Usage

1. Create a new Sveltekit app with `chic new MyApp`
2. Change into your app directory with `cd MyApp`
3. Use the `chic make` command to scaffold views, models, routes & API endpoints for a new resource. For example: `chic make Book title:string author:string about:text`, will create a Book resource with all the views, model and controllers need for CRUD operations on your resource.
4. Run the development server with `chic s`
5. And voila! You have a working app with a Book resource.

## Chic commands

### Create a new app
#### `chic new MyApp`  
Creates a new Sveltekit app, called `MyApp`

### With styling framework: `chic new MyApp styled with tailwind`
Creates a new Sveltekit app, called `MyApp`, with Tailwind CSS styling framework, for example.

Currently works with `bootstrap`, `tailwind` and `bulma`.

#### `chic make Book title:string author:string about:text`   
Creates pages, API routes, model and form components for CRUD operations.