#!/usr/bin/env node

import path from 'path';
import sade from 'sade';

import {
    addModelToDBFile, createAPIRoutes, createController,
    createModel, createRoutePages, init, createFormComponent, writeDeleteButtonComponent, createHooksServerFile, addNewRouteOrComponent, getDebugValue, setDebugValue,
    createSitemap
} from './lib/functions.js';
import { scaffoldFromDatabase } from './lib/scaffold.js';
import { spawn } from 'child_process';
import { destroyButtonTemplate } from './lib/templates/component_templates.js';
import { CONSOLE_COLOR, styledBy, fieldValidation, consoleLog } from './lib/helpers.js';

import { readFileSync } from 'fs';

let pjson;
try {
    const pkgPath = new URL('./package.json', import.meta.url);
    const pkgData = readFileSync(pkgPath);
    pjson = JSON.parse(pkgData);
} catch (err) {
    console.error('Error reading package.json:', err);
}


const prog = sade('chic');

prog
    .version(pjson.version);

prog
    .command('new <name>')
    .describe('Create a new Sveltekit app. To add styles, add "styled with tailwind", for example.')
    .example('new myapp')
    .example('new myapp styled with tailwind')
    .action((name, options, opts) => {
        console.log(CONSOLE_COLOR.BLUE, `• Creating a new Sveltekit project named ${name}`);
        const [isStyled, styleFrameworkName, styleInstallCommand, styleDocsURL] = styledBy(options);

        const createSvelteProcess = spawn('npm', ['create', 'svelte@latest', name], {
            stdio: 'inherit', // this will show the live output of the command
            shell: true
        });

        createSvelteProcess.on('error', (error) => {
            console.error(`Error creating the project: ${error}`);
        });

        createSvelteProcess.on('exit', async (code) => {
            if (code !== 0) {
                console.error(`The process exited with code ${code}`);
            } else {
                console.log('Project created successfully!');
                // Change directory in the Node.js process
                process.chdir(path.join(process.cwd(), name));

                // Run init function
                await init();

                // Install sequelize
                console.log(`> Installing sequelize in project ${name}`);
                const installSequelizeProcess = spawn('npm', ['install', 'sequelize', '--save'], {
                    stdio: 'inherit',
                    shell: true
                });

                installSequelizeProcess.on('error', (error) => {
                    console.error(`Error installing sequelize: ${error}`);
                });

                installSequelizeProcess.on('exit', (code) => {
                    if (code !== 0) {
                        console.error(`The process exited with code ${code}`);
                    } else {
                        console.log('Sequelize installed successfully');

                        // Install Sqlite
                        console.log(`> Installing sqlite3 in project ${name}`);
                        const installSsqlite3Process = spawn('npm', ['install', 'sqlite3', '--save'], {
                            stdio: 'inherit',
                            shell: true
                        });

                        installSsqlite3Process.on('error', (error) => {
                            console.error(`Error installing sqlite3: ${error}`);
                        });

                        installSsqlite3Process.on('exit', (code) => {
                            if (code !== 0) {
                                console.error(`The process exited with code ${code}`);
                            } else {
                                console.log('Sqlite3 installed successfully');
                                console.log('\x1b[36m%s\x1b[0m', `----------------------------------------`);
                                console.log("Project created successfully!");
                                if (isStyled) {
                                    addStylesToProject(styleFrameworkName, styleInstallCommand, styleDocsURL);
                                }
                                console.log(`
                                
🌟 Next steps:
--------------
  1: cd ${name}
  2: npm install
  3: chic make <resource> <fields>
  4: chic s

                                `)
                                console.log('\x1b[36m%s\x1b[0m', `To start the server run: chic s`);
                                console.log(CONSOLE_COLOR.GREEN, `Donate to support us: https://ko-fi.com/sveltesafari`);
                            }
                        });
                    }
                });

            }
        });
    });

prog
    .command('add <what>')
    .describe('Adds a new route or component to your project.\n Put a / in front to create a new route, otherwise it will create a new component.\n See examples below.')
    .example('add /about')
    .example('add Login')
    .action((what) => {
        addNewRouteOrComponent(what);
    });

prog
    .command('debug <command>')
    .describe('Checks and sets CHIC_DEBUG mode. If ON, the routes endpoint will be active. Be sure to set CHIC_DEBUG=OFF in your .env file before deploying.')
    .example('chic debug status')
    .example('chic debug ON')
    .example('chic debug OFF')
    .action((command) => {
        const v = command.toUpperCase();
        switch (v) {
            case "STATUS":
                console.log(!getDebugValue() ? CONSOLE_COLOR.RED : CONSOLE_COLOR.BLUE, `• CHIC_DEBUG is currently ${!getDebugValue() ? "not specified in your .env file" : getDebugValue()}`);
                break;
            case "ON":
                console.log('\x1b[36m%s\x1b[0m', `• Turning on debug mode...`);
                setDebugValue("ON");
                break;
            case "OFF":
                console.log('\x1b[36m%s\x1b[0m', `• Turning off debug mode...`);
                setDebugValue("OFF");
                break;
            default:
                console.log('\x1b[36m%s\x1b[0m', `CHIC_DEBUG is currently ${!getDebugValue() ? "not specified in your .env file" : getDebugValue()}`);
                break;
        }

    });



prog
    .command('make <what> <options>')
    .describe('Scaffolds a new MVC resource. Options are the field names of the model. You can also use a config file by running "chic make from file"')
    // .option('--from-database', 'What kind of database should be used?')
    .example('make Guitar name:string brand:string price:number')
    .example('make from file')
    .action( async (what, options, opts) => {

        console.log(what, options, opts);
        if (what === "from" && options === "database") {
            console.log(CONSOLE_COLOR.BLUE, '> Scaffolding from an existing database...');
            const scaffoldResponse = await scaffoldFromDatabase();
            console.log(scaffoldResponse);
        } else if (what === "from") {
            console.log(CONSOLE_COLOR.RED, '❓ Did you mean to scaffold from an existing database?');
            console.log(CONSOLE_COLOR.BLUE, '💡 Run: chic make from database');
            throw new Error('Command not found. See info above. 👆');
        } else {
            console.log(CONSOLE_COLOR.BLUE, `> Scaffolding a new ${what}`);
            const allOptions = [options, ...opts._].join(' ');

            const v = fieldValidation(allOptions);
            if (!v) { 
                consoleLog(CONSOLE_COLOR.RED, 'Invalid field types!', 'Please use string, number, boolean, date, json, or text.');
                process.exit(1);
            }
            createModel(what, allOptions, null);
            addModelToDBFile(what);
            createFormComponent(what, ['new', '[id]/edit'], allOptions);
            writeDeleteButtonComponent(destroyButtonTemplate); // TODO: only create once.
            createRoutePages(what, ['', 'new', '[id]', '[id]/edit'], allOptions);
            createAPIRoutes(what, ['', '[id]']);
            createController(what);
            createHooksServerFile();
        }

    });

prog
    .command('routes')
    .describe('Updates routes.')
    // .option('-d, --database', 'What kind of database should be used?')
    .action((what, options, opts) => {
        createHooksServerFile();
    });

prog
    .command('s')
    .describe('Starts the development server')
    .action(() => {
        console.log(`> Running development server`);
        console.log("");
        console.log('\x1b[36m%s\x1b[0m', `To stop server, hit Ctrl+C`);
        const runServerProcess = spawn('npm', ['run', 'dev'], {
            stdio: 'inherit', // this will show the live output of the command
            shell: true
        });

        runServerProcess.on('error', (error) => {
            console.error(`Error creating the project: ${error}`);
        });

        runServerProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`The server stopped.`);
            } else {
                console.log('Server ran successfully.');
            }
        });

    });

prog
    .command('sitemap <url>')
    .describe('Generates a sitemap.xml file for your project.')
    .example('sitemap https://example.com')
    .action((url) => {
        createSitemap(url);
    });


// if command not found, show help
prog
    .command('*', '', { default: true })
    .action(() => {
        console.log(CONSOLE_COLOR.BLUE, "╔═╗┬ ┬┬┌─┐  ┬┌─┐");
        console.log(CONSOLE_COLOR.BLUE, "║  ├─┤││    │└─┐");
        console.log(CONSOLE_COLOR.BLUE, "╚═╝┴ ┴┴└─┘o└┘└─┘");
        console.log(CONSOLE_COLOR.BLUE, `Version: ${pjson.version}`);
        console.log(CONSOLE_COLOR.BLUE, `Author: Mark Schellhas`);
        console.log(CONSOLE_COLOR.BLUE, `For help, run chic --help`);
        console.log(CONSOLE_COLOR.GREEN, `--------------------`);
        console.log(CONSOLE_COLOR.GREEN, `Donate to support this project: https://ko-fi.com/sveltesafari`);
        console.log(CONSOLE_COLOR.GREEN, `--------------------`);
    });

prog.parse(process.argv);

/**
 * 
 * @param {String} styleFrameworkName 
 * @param {Array<string>} styleInstallCommand 
 * @param {String} styleDocsURL 
 */
function addStylesToProject(styleFrameworkName, styleInstallCommand, styleDocsURL) {
    console.log('\x1b[36m%s\x1b[0m', `• Styling the project with ${styleFrameworkName}`);
    console.log('\x1b[36m%s\x1b[0m', `• Installing ${styleFrameworkName}...`);
    let styleCmnd = styleInstallCommand.split(' ');
    let styledOptions = styleCmnd.slice(1);
    console.log(styleCmnd);
    console.log(styledOptions);
    const installStyleProcess = spawn(styleCmnd[0], styledOptions, {
        stdio: 'inherit',
        shell: true
    });

    installStyleProcess.on('error', (error) => {
        console.error(`Error installing ${styleFrameworkName}: ${error}`);
    });

    installStyleProcess.on('exit', (code) => {
        if (code !== 0) {
            console.error(`The process exited with code ${code}`);
        } else {
            console.log(`${styleFrameworkName} installed successfully`);
            console.log('\x1b[36m%s\x1b[0m', `• For more info: ${styleDocsURL}...`);
        }
    });
}