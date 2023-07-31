#!/usr/bin/env node

import path from 'path';
import sade from 'sade';

import {
    addModelToDBFile, createAPIRoutes, createController,
    createModel, createRoutePages, init, createFormComponent, writeDeleteButtonComponent, createHooksServerFile
} from './lib/functions.js';
import { spawn } from 'child_process';
import { destroyButtonTemplate } from './lib/templates/component_templates.js';

const prog = sade('chic');

prog
    .version('1.0.2')

prog
    .command('new <name>')
    .describe('Create a new Sveltekit app.')
    .action((name) => {
        console.log('\x1b[36m%s\x1b[0m', `• Creating a new Sveltekit project named ${name}`);

        const createSvelteProcess = spawn('npm', ['create', 'svelte@latest', name], {
            stdio: 'inherit', // this will show the live output of the command
            shell: true
        });

        createSvelteProcess.on('error', (error) => {
            console.error(`Error creating the project: ${error}`);
        });

        createSvelteProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`The process exited with code ${code}`);
            } else {
                console.log('Project created successfully!');
                // Change directory in the Node.js process
                process.chdir(path.join(process.cwd(), name));

                // Run init function
                init();

                // Install chic.js as dependency:
                console.log(`> Installing chic.js in project ${name}`);
                const installChicProcess = spawn('npm', ['install', 'chic.js', '--save'], {
                    stdio: 'inherit',
                    shell: true
                });

                installChicProcess.on('error', (error) => {
                    console.error(`Error installing chic.js: ${error}`);
                });

                installChicProcess.on('exit', (code) => {
                    if (code !== 0) {
                        console.error(`The process exited with code ${code}`);
                    } else {
                        console.log('Chic.js installed successfully');

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
                                console.log(`
                                
🌟 Next steps:
--------------
  1: cd ${name}
  2: chic make <resource> <fields>
  3: chic s

                                `)
                                console.log('\x1b[36m%s\x1b[0m', `To start the server run: chic s`);
                                console.log('\x1b[36m%s\x1b[0m', `More info: https://chicjs.org`);
                                console.log('\x1b[36m%s\x1b[0m', `----------------------------------------`);
                            }
                        });
                    }
                });
                    }
                });

            }
        });
    });



prog
    .command('make <what> <options>')
    .describe('Will scaffold a new MVC resource. Options are the field names of the model.')
    // .option('-d, --database', 'What kind of database should be used?')
    .action((what, options, opts) => {
        console.log(`> Scaffolding a new ${what}`);
        console.log('> Model fields', options);
        const allOptions = [options, ...opts._].join(' ');
        createModel(what, allOptions);
        addModelToDBFile(what);
        createFormComponent(what, ['new', '[id]/edit'], allOptions);
        writeDeleteButtonComponent(destroyButtonTemplate); // TODO: only create once.
        createRoutePages(what, ['', 'new', '[id]', '[id]/edit'], allOptions);
        createAPIRoutes(what, ['', '[id]']);
        createController(what);
        createHooksServerFile();
    });

prog
    .command('routes')
    .describe('Will update routes for endpoint.')
    // .option('-d, --database', 'What kind of database should be used?')
    .action((what, options, opts) => {
        createHooksServerFile();
    });

prog
    .command('s')
    .describe('Will start the development server')
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

prog.parse(process.argv);