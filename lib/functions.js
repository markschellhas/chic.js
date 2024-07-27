import fs from 'fs';
import fsp from 'fs/promises';
import readline from 'readline';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { getNamespaces, singularize, pluralize, transformFieldsToObject, capitalize, CONSOLE_COLOR, stringReplacer } from './helpers.js';

import { contentReplaceIndexPage, contentReplaceShowPage, generateControllerContent, contentReplaceEditFormPage, contentReplaceNewFormPage } from './templates/template_utils.js';
import { routePageTemplate, routeServerIndexPageTemplate, routeServerShowPageTemplate, routeServerEditPageTemplate } from './templates/page_templates.js';
import { modelContentTemplate } from './templates/model_templates.js';
import { dbTemplate } from './templates/db_templates.js';
import { APIIndexRouteTemplate, APIItemRouteTemplate } from './templates/api_endpoint_templates.js';
import { formComponentTemplate } from './templates/component_templates.js';
import { error } from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function requireLocalPackage(packageName) {
    try {
        const require = createRequire(import.meta.url);
        const packagePath = require.resolve(packageName, { paths: [process.cwd()] });
        const module = require(packagePath);
        return module.default || module;  // Handle both ES and CommonJS modules
    } catch (error) {
        console.error(`Error: Package '${packageName}' is not installed in the local project.`);
        console.error(`Please install it using: npm install ${packageName}`);
        console.error('Original error:', error);
        process.exit(1);
    }
}

function packageDirName() {
    const __filename = fileURLToPath(import.meta.url);
    const dname = dirname(__filename);
    return dname;
}

/**
 * Initializes chic by creating a chic configuration file and a database configuration file.
 * @returns {Promise<void>} A promise that resolves when the initialization is complete.
 */
export async function init() {
    console.log('\x1b[36m%s\x1b[0m', '🏁 Initializing chic...');
    // set up data
    const chicConfig = {
        models: [],
        components: [],
        routes: []
    };
    const chicDBConfig = {
        env: 'development',
        db: {
            development: {
                dialect: 'sqlite',
                database: 'chic.sqlite'
            },
            test: {
                dialect: 'sqlite',
                database: 'chic_test.sqlite'
            },
            production: {
                dialect: 'sqlite',
                database: 'chic_production.sqlite'
            }
        }
    }
    // serialize data to JSON string
    const data = JSON.stringify(chicConfig, null, 2);
    const dataDB = JSON.stringify(chicDBConfig, null, 2);

    // Copy file from this package to the project's root directory:
    const dirname = packageDirName();

    // open file relative to this npm package:
    const routesTableFile = fs.readFileSync(join(dirname, '../ui/renderedRoutesTable.js'), 'utf8');
    // copy file to project root:
    const projectRoot = findProjectRoot(process.cwd());
    const newFilePath = join(projectRoot, 'src', 'RoutesTable.js');
    fs.writeFileSync(newFilePath, routesTableFile);
    // write database config file:
    const dbConfigDir = join(projectRoot, 'src', 'lib', 'db');
    if (!fs.existsSync(dbConfigDir)) {
        fs.mkdirSync(dbConfigDir, { recursive: true });
    }
    const dbConfigFilePath = join(projectRoot, 'src', 'lib', 'db', 'database_config.json');
    await fsp.writeFile(dbConfigFilePath, dataDB);


    // create a file:
    return fs.writeFile('chic.json', data, async (err) => {
        if (err) {
            console.error('Error creating file:', err);
        } else {
            console.log('\x1b[32m%s\x1b[0m', '- chic config file created.');
            await createDBConfigFile();
            console.log('\x1b[32m%s\x1b[0m', '🌟 chic initialized successfully');
        }
    });


};

// ROUTES:
/**
 * Creates route pages for a given input name, paths and fields.
 * @param {string} inputName - The name of the input.
 * @param {Array<string>} paths - An array of paths.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 * @returns {void} Nothing is returned.
 */
export async function createRoutePages(inputName, paths, fields) {
    console.log('create route pages name:', inputName);
    let { name, nameSingular, nameCapitalized } = getNamespaces(inputName);
    const formFieldsSpec = transformFieldsToObject(fields);
    const firstFieldName = formFieldsSpec[0].name;
    console.log('\x1b[36m%s\x1b[0m', `• ${capitalize(singularize(name))} routes:`);

    // create a svelte route:
    let content = routePageTemplate;
    content = content.replace(/{NAME_CAP}/g, inputName);

    let promises = [];

    for (let index = 0; index < paths.length; index++) {
        const p = paths[index];
        let a = new Promise((resolve, reject) => {
            fsp.mkdir(join('src', 'routes', name, p), { recursive: true })
                .then(async () => {
                    let contentToWrite = content;
                    switch (p) {
                        case '':
                            contentToWrite = contentReplaceIndexPage(contentToWrite, inputName, firstFieldName);
                            break;
                        case 'new':
                            contentToWrite = contentReplaceNewFormPage(contentToWrite, name);
                            break;
                        case '[id]':
                            contentToWrite = contentReplaceShowPage(contentToWrite, inputName);
                            break;
                        case '[id]/edit':
                            contentToWrite = contentReplaceEditFormPage(contentToWrite, name);
                            break;

                        default:
                            break;
                    }

                    if (p !== 'new') {
                        await createRouteServerPage(inputName, p);
                    }

                    const filePath = join('src', 'routes', name, p, `+page.svelte`);
                    return fsp.writeFile(filePath, contentToWrite);
                }).then(() => {
                    console.log('\x1b[32m%s\x1b[0m', `Page created:`, p);
                    resolve();
                }).catch((error) => {
                    console.error('Error creating file:', error);
                    reject(error);
                });
        });
        promises.push(a);

    }

    await Promise.all(promises);

    // paths.forEach((p) => {
    //     const dirPath = join('src', 'routes', name, p);

    //     fs.mkdir(dirPath, { recursive: true }, (err) => {
    //         if (err) {
    //             console.error('Error creating directory:', err);
    //             return;
    //         }

    //         let contentToWrite = content

    //         switch (p) {
    //             case '':
    //                 contentToWrite = contentReplaceIndexPage(contentToWrite, inputName, firstFieldName);
    //                 addRouteToChicJson(
    //                     {
    //                         method: "GET", path: `/${name}`, description: `List ${name}`, action: ""
    //                     }
    //                 );
    //                 break;
    //             case 'new':
    //                 contentToWrite = contentReplaceNewFormPage(contentToWrite, name);
    //                 addRouteToChicJson(
    //                     { method: "GET", path: `/${name}/new`, description: `Create a new ${singularize(name)}`, action: "" }
    //                 );
    //                 break;
    //             case '[id]':
    //                 contentToWrite = contentReplaceShowPage(contentToWrite, inputName);
    //                 addRouteToChicJson(
    //                     { method: "GET", path: `/${name}/[id]`, description: `View a ${singularize(name)}`, action: "" }
    //                 );
    //                 break;
    //             case '[id]/edit':
    //                 contentToWrite = contentReplaceEditFormPage(contentToWrite, name);
    //                 addRouteToChicJson(
    //                     { method: "GET", path: `/${name}/[id]/edit`, description: `Edit a ${singularize(name)}`, action: "" }
    //                 );
    //                 break;

    //             default:
    //                 break;
    //         }

    //         const filePath = join(dirPath, `+page.svelte`);
    //         fs.writeFile(filePath, contentToWrite, (err) => {
    //             if (err) {
    //                 console.error('Error creating file:', err);
    //             } else {
    //                 console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
    //             }
    //         });

    //         if (p !== 'new') {
    //             createRouteServerPage(inputName, p);
    //         }

    //     });
    // });

};


/**
 * Creates API routes for a given input name and paths.
 * @param {string} inputName - The name of the input.
 * @param {Array<string>} paths - An array of paths.
 * @returns {void} Nothing is returned.
 */
export function createAPIRoutes(inputName, paths) {
    const { name, nameSingular, nameCapitalized } = getNamespaces(inputName);
    console.log('\x1b[36m%s\x1b[0m', `• ${capitalize(singularize(name))} API routes:`);

    paths.forEach((p) => {
        const dirPath = join('src', 'routes', 'api', name, p);

        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return;
            }

            let contentToWrite = ""

            switch (p) {
                case '':
                    contentToWrite = APIIndexRouteTemplate(name);
                    addRoutesToChicJson([
                        { method: "GET", path: `/api/${name}`, description: `Lists ${name}`, action: `list${capitalize(name)}` },
                        { method: "POST", path: `/api/${name}`, description: `Creates a new ${singularize(name)}`, action: `create${capitalize(singularize(name))}` }
                    ]);
                    break;
                case '[id]':
                    contentToWrite = APIItemRouteTemplate(name);
                    addRoutesToChicJson([
                        {
                            method: "GET", path: `/api/${name}/[id]`, description: `View a ${singularize(name)}`, action: `get${capitalize(singularize(name))}`
                        },
                        {
                            method: "PUT", path: `/api/${name}/[id]`, description: `Updates a ${singularize(name)}`, action: `update${capitalize(singularize(name))}`
                        },
                        {
                            method: "DELETE", path: `/api/${name}/[id]`, description: `Destroys a ${singularize(name)}`, action: `destroy${capitalize(singularize(name))}`
                        }
                    ]);
                    break;

                default:
                    break;
            }

            const filePath = join(dirPath, `+server.js`);
            fs.writeFile(filePath, contentToWrite, (err) => {
                if (err) {
                    console.error('Error creating file:', err);
                } else {
                    console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
                }
            });

        });

    });
};

/**
 * Creates a server page for a given route path and name.
 * @param {string} name - The name of the route.
 * @param {string} routePath - The path of the route.
 * @returns {void} Nothing is returned.
 */
function createRouteServerPage(name, routePath) {
    const dirPath = join('src', 'routes', pluralize(name.toLowerCase()), routePath);
    const filePath = join(dirPath, `+page.server.js`);

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        let content = "";
        switch (routePath) {
            case "":
                content = routeServerIndexPageTemplate(name);
                break;
            case "[id]":
                content = routeServerShowPageTemplate(name);
                break;
            case "[id]/edit":
                content = routeServerEditPageTemplate(name);
                break;

            default:
                break;
        }

        fs.writeFile(filePath, content, (err) => {
            if (err) {
                console.error('Error creating file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
            }
        });
    });
};

/**
 * Creates a site map for a given domain name.
 * @param {string} domainName - The domain name.
 * @returns {void} Nothing is returned.
 * 
 * @todo Add a way to exclude routes from the sitemap.
 */
export function createSitemap(domainName) {
    // const dirPath = join('src', 'routes');
    const dirPath = join('.svelte-kit', 'output', 'server', 'entries', 'pages');
    const filePath = join('static', 'sitemap.xml');

    fs.readdir(dirPath, (err, files) => {
        if (err) {
            console.log(CONSOLE_COLOR.RED, "The sitemap could not be created because the build folder (.svelte-kit) could not be found. \n\nPlease run `npm run build` first.\n\n");
            console.error('Error reading directory:', err);
            console.log(CONSOLE_COLOR.BLUE, "\n\n💡 To solve this issue: run `npm run build` first. And then run `chic sitemap [domain name]` again.\n\n");
            return;
        }

        let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        content += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;
        content += `  <url>\n`;
        content += `    <loc>${domainName}</loc>\n`;
        content += `    <changefreq>monthly</changefreq>\n`;
        content += `    <priority>1.0</priority>\n`;
        content += `  </url>\n`;

        // Create an array of promises for each file's stat operation
        let statPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                const fullPath = join(dirPath, file);

                fs.stat(fullPath, (err, stats) => {
                    if (err) {
                        console.error('Error getting file stats:', err);
                        reject(err);
                        return;
                    }

                    if (stats.isDirectory() && file !== 'api') {
                        content += `  <url>\n`;
                        content += `    <loc>${domainName}/${file}</loc>\n`;
                        content += `    <changefreq>monthly</changefreq>\n`;
                        content += `    <priority>0.8</priority>\n`;
                        content += `  </url>\n`;
                    }

                    resolve();
                });
            });
        });

        // Wait for all stat operations to complete
        Promise.all(statPromises).then(() => {
            content += `</urlset>\n`;

            // write file to static folder:
            fs.writeFile(filePath, content, (err) => {
                if (err) {
                    console.error(CONSOLE_COLOR.RED, 'Error creating file:', err);
                } else {
                    console.log(CONSOLE_COLOR.GREEN, '- ' + filePath + ' created.');
                }
            });

            // write file to build folder:
            let buildOutputPath = join('.svelte-kit', 'output', 'client', 'sitemap.xml');
            fs.writeFile(buildOutputPath, content, (err) => {
                if (err) {
                    console.error(CONSOLE_COLOR.RED, 'Error creating file:', err);
                } else {
                    console.log(CONSOLE_COLOR.GREEN, '- ' + buildOutputPath + ' created.');
                }
            });

        }).catch(error => {
            console.error('An error occurred:', error);
        });
    });
};


/**
 * Creates a controller for a given inpdut name and fields.
 * @param {string} inputName - The name of the input.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 * @returns {void} Nothing is returned.
 */
export async function createController(inputName) {
    try {

        let controllerContent = generateControllerContent(inputName);
        const c = await writeControllerFile(controllerContent, inputName);
        return c;
    } catch (error) {
        throw error;
    }

}

/**
 * Creates a model for a given input name and fields.
 * @param {string} inputName - The name of the input.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 * @param {Array<{name:string, type:string}>} jsonFields - An array of objects representing the fields.
 * @returns {void} Nothing is returned.
 */
export function createModel(inputName, fields, jsonFields) {
    let { name, nameSingular, nameCapitalized } = getNamespaces(inputName);
    let formFieldsSpec = []
    if (jsonFields !== null) {
        formFieldsSpec = jsonFields;
    } else {
        formFieldsSpec = transformFieldsToObject(fields);
    }
    let modelContent = generateModelContent(inputName.toLowerCase(), formFieldsSpec);
    writeModelFile(modelContent, capitalize(nameSingular));

    // Add model to chic.json:
    if (jsonFields === null) {
        const model = {
            name: nameCapitalized,
            fields: formFieldsSpec
        };
        updateConfig({
            models: [...readConfig().models, model]
        });
    }
}

/**
 * Generates the content for a model file based on the input model name and fields.
 * @param {string} modelName - The name of the model.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 * @returns {string} The content for the model file.
 */
function generateModelContent(modelName, fields) {
    let name = capitalize(modelName);
    let tableName = pluralize(modelName).toLowerCase();
    let content = modelContentTemplate;
    let fieldsString = '';

    fields.forEach(field => {
        fieldsString += `      ${field.name}:      { type: DataTypes.${field.type === "file" ? "STRING" : field.type.toUpperCase()} },\n`;
    });

    content = content.replace(/{MODEL_NAME}/g, name);
    content = content.replace('{FIELDS}', fieldsString);
    content = content.replace('{TABLE_NAME}', tableName);

    return content;
}

/**
 * Writes the content of a model file to disk.
 * @param {string} content - The content of the model file.
 * @param {string} modelName - The name of the model.
 * @returns {void} Nothing is returned.
 */
function writeModelFile(content, modelName) {

    console.log(CONSOLE_COLOR.BLUE, `• ${modelName} model:`);

    const dirPath = join('src', 'lib', 'models');
    const filePath = join(dirPath, `${modelName}.js`);

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, content, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m%s', 'Created: ', filePath);
            }
        });
    });
}

/**
 * Writes the content of a controller file to disk.
 * @param {string} content - The content of the controller file.
 * @param {string} modelName - The name of the model.
 * @returns {void} Nothing is returned.
 */
function writeControllerFile(content, modelName) {
    return new Promise((resolve, reject) => {
        let pluralName = pluralize(modelName);

        console.log('\x1b[36m%s\x1b[0m', `• ${modelName} controller:`);
        const rootDir = getRootDir();
        const dirPath = join(rootDir, 'src', 'lib', 'controllers', pluralName.toLowerCase());
        const filePath = join(dirPath, `${pluralName.toLowerCase()}_controller.js`);

        fsp.mkdir(dirPath, { recursive: true })
            .then(() => fsp.writeFile(filePath, content))
            .then(() => {
                console.log('\x1b[32m%s\x1b[0m%s', 'Created: ', filePath);
                resolve();
            })
            .catch(reject);

    });
}

/**
 * Creates sqlite database.
 */
function writeDBFile() {
    const dirPath = join('src', 'lib', 'db');
    const filePath = join(dirPath, `chic.sqlite`);

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, "", (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
            }
        });
    });
}

/**
 * Creates a database configuration file.
 * @returns {Promise<void>} A promise that resolves when the database configuration file is created.
 * @async 
*/
async function createDBConfigFile() {

    return new Promise(async (resolve, reject) => {
        // read config:
        const chicConfig = readDBConfig();
        let sequelizeConfig = chicConfig;

        const dirPath = join('src', 'lib', 'db');

        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return;
            }

            let contentToWrite = dbTemplate;

            const filePath = join(dirPath, `db.js`);
            fs.writeFile(filePath, contentToWrite, (err) => {
                if (err) {
                    console.error('Error creating file:', err);
                    reject(err);
                } else {
                    console.log('\x1b[32m%s\x1b[0m', '- chic sqlite db config created.');
                    writeDBFile();
                    resolve();
                }
            });
        });


    })
};


/**
 * Reads the contents of the .env file and returns the value of the DEBUG variable.
 * @returns {string|boolean} The value of the DEBUG variable, or false if it is not found.
 */
export function getDebugValue() {
    // read file
    try {
        const data = fs.readFileSync('.env');
        // find line with DEBUG and show the value:
        const lines = data.toString().split('\n');
        let debug = false;
        lines.forEach((line) => {
            if (line.startsWith('CHIC_DEBUG')) {
                debug = line.split('=')[1];
            }
        });
        return debug;
    } catch (error) {
        console.log(CONSOLE_COLOR.RED, "Could not read .env file. Are you sure you have one in your project?");
        return false;
    }
};

export function setDebugValue(val) {
    // read file
    const data = fs.readFileSync('.env');
    // find line with DEBUG and show the value:
    const lines = data.toString().split('\n');
    let currentValue = false;
    lines.forEach((line) => {
        if (line.startsWith('CHIC_DEBUG')) {
            currentValue = line.split('=')[1];
        }
    });

    try {
        if (currentValue) {
            // replace the value:
            const newData = data.toString().replace(`CHIC_DEBUG=${currentValue}`, `CHIC_DEBUG=${val}`);
            fs.writeFileSync('.env', newData);
            return "Updated CHIC_DEBUG value."
        } else {
            // add the value:
            const newData = data.toString() + `\nCHIC_DEBUG=${val}`;
            fs.writeFileSync('.env', newData);
            return "Updated CHIC_DEBUG value."
        }
    } catch (error) {
        console.log(error);
        return "Could not update CHIC_DEBUG value."
    }
};

export function readConfig() {
    const rootDir = getRootDir();
    console.log(rootDir);
    const filePath = join(rootDir, 'chic.json');
    // read file
    const data = fs.readFileSync(filePath);
    // parse JSON
    const chicConfig = JSON.parse(data);
    // return config
    return chicConfig;
};

/**
 * Returns DB config for the current environment.
 * @typedef {Object} DBConfig
 * @property {string} dialect - The database dialect.
 * @property {string} database - The database name.
 * @property {string} username - The database username.
 * @property {string} password - The database password.
 * @property {string} host - The database host.
 * @property {string} port - The database port.
 * @returns {Object} The database configuration object.
 * 
 **/
export async function readDBConfig() {

    try {
        const rootDir = getRootDir();
        console.log(rootDir);
        const filePath = join(rootDir, 'src', 'lib', 'db', 'database_config.json');
        // read file
        const data = await fsp.readFile(filePath);
        const x = JSON.parse(data);
        const env = x.env;
        return x.db[env];
    } catch (error) {
        console.log(error);
        throw new Error("Could not read database configuration.", error)

    }

};

export function updateConfig(payload) {
    // read file
    const data = fs.readFileSync('chic.json');
    // parse JSON
    const chicConfig = JSON.parse(data);
    // update config
    const prevState = chicConfig;

    const newState = {
        ...prevState,
        ...payload
    };

    // write to file
    fs.writeFileSync('chic.json', JSON.stringify(newState, null, 2));
};

/**
 * Add route to chic.json
 * @param {Object} payload
 * @param {string} payload.method
 * @param {string} payload.path
 * @param {string} payload.action
*/
export function addRouteToChicJson(payload) {
    // read file
    const data = fs.readFileSync('chic.json');
    // parse JSON
    const chicConfig = JSON.parse(data);
    // update config
    let prevState = chicConfig;
    let routes = prevState.routes;
    routes.push(payload);


    const newState = {
        ...prevState,
        routes: routes
    };

    // write to file
    fs.writeFileSync('chic.json', JSON.stringify(newState, null, 2));
};

/**
 * Add routes to chic.json
 * @param {Array} payload 
 */
export function addRoutesToChicJson(payload) {
    // read file
    const data = fs.readFileSync('chic.json');
    // parse JSON
    const chicConfig = JSON.parse(data);
    // update config
    let prevState = chicConfig;
    let routes = [...prevState.routes, ...payload];


    const newState = {
        ...prevState,
        routes: routes
    };

    // write to file
    fs.writeFileSync('chic.json', JSON.stringify(newState, null, 2));
};

// Database actions:
/**
 * Adds a model to the database configuration file.
 * @param {string} modelName - The name of the model.
 * @returns {void} Nothing is returned.
 */
export function addModelToDBFile(modelName) {
    const name = capitalize(modelName);

    async function processFile(path, n) {
        const fileStream = fs.createReadStream(path);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let lastImportLine = 0;
        let lastModelAssignmentLine = 0;
        let lines = [];

        let lineNumber = 0;

        for await (const line of rl) {
            lineNumber++;

            if (line.trim().startsWith('// import models')) {
                lastImportLine = lineNumber;
            }

            if (line.trim().startsWith('// define resources')) {
                lastModelAssignmentLine = lineNumber;
            }

            if (line.trim().startsWith('export')) {
                // Check if export statement is empty
                if (line.trim() === 'export {}') {
                    lines.push(line.replace(`{}`, `{ ${n} }`)); // replace with the actual item you want to add
                } else {
                    lines.push(line.replace(`}`, `, ${n}}`)); // replace with the actual item you want to add
                }
            } else {
                lines.push(line);
            }
        }

        // Insert new lines
        lines.splice(lastImportLine, 0, `import { ${n}Model } from '../models/${n}.js';`);
        lines.splice(lastModelAssignmentLine + 1, 0, `const ${n} = ${n}Model(sequelize, Sequelize);`); // Add 1 because we've added a new line before

        // Write file
        fs.writeFileSync(path, lines.join('\n'));
    }

    const dirPath = join('src', 'lib', 'db');
    const filePath = join(dirPath, 'db.js');
    processFile(filePath, name); // replace with the actual file path
};

// FORM COMPONENTS:
/**
 * Creates a form component for a given model name, paths and fields.
 * @param {string} modelName - The name of the model.
 * @param {Array<string>} paths - An array of paths.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 * @returns {void} Nothing is returned.
 */
export async function createFormComponent(modelName, paths, fields) {
    const name = modelName.toLowerCase();
    const formFieldsSpec = transformFieldsToObject(fields);
    let formFields = addHtmlFields(formFieldsSpec);
    let formHtml = generateHtmlForm(formFields, paths);
    let componentContent = insertForm(formComponentTemplate, formHtml, formFieldsSpec);
    await writeFormComponent(componentContent, name);
}

/**
 * Adds HTML fields to an array of fields based on their type.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 * @returns {Array<Object>} An array of objects representing the fields with added HTML fields.
 */
function addHtmlFields(fields) {
    return fields.map(field => {
        let html;
        switch (field.type) {
            case 'string':
                html = `<input name="${field.name}" bind:value={data.${field.name}} type="text" />`;
                break;
            case 'text':
                html = `<textarea name="${field.name}" bind:value={data.${field.name}} />`;
                break;
            case 'number':
                html = `<input name="${field.name}" bind:value={data.${field.name}} type="number" />`;
                break;
            case 'file':
                html = `<input name="${field.name}" bind:value={data.${field.name}} type="file" />`;
                break;
            case 'date':
                html = `<input name="${field.name}" bind:value={data.${field.name}} type="date" />`;
                break;
            default:
                html = `<input name="${field.name}" bind:value={data.${field.name}} type="text" />`;
                break;
        }

        return { ...field, html };
    });
}

/**
 * Generates the HTML for a form based on the input fields.
 * @param {Array<Object>} fields - An array of objects representing the fields.
 */
function generateHtmlForm(fields) {

    let formHtml = `<form method="POST" action="{action ? action : ''}">\n`;
    formHtml += `
        {#if data?.id}
            <input name="id" value={data.id} type="hidden" readonly />
        {/if}

        `;

    fields.forEach(field => {
        formHtml += `  <label for="${field.name}">${capitalize(field.name)}</label>\n`;
        formHtml += `  ${field.html}\n`;
    });

    formHtml += '  <button type="submit">Submit</button>\n';
    formHtml += '</form>\n';

    return formHtml;
}

/**
 * Inserts a form into a component template.
 * @param {string} html - The component template.
 * @param {string} form - The form to insert.
 * @param {Object} formFieldsSpec - The form fields specification.
 * @returns {string} The component template with the form inserted.
 */
function insertForm(html, form, formFieldsSpec) {
    let typeDef = "/**\n";
    typeDef += "* @typedef {Object} Data\n";
    formFieldsSpec.forEach(field => {
        typeDef += ` * @property {${field.type}} ${field.name}\n`;
    });
    typeDef += " *\n";
    typeDef += " *\n";
    typeDef += " *\n";
    typeDef += " * @param {Data} Data\n";
    typeDef += " **/";

    return stringReplacer(html, [
        { key: '{data_type_def}', value: typeDef },
        { key: '{chic_form}', value: form },
    ])
}

/**
 * Writes the content of a form component file to disk.
 * @param {string} html - The content of the form component file.
 * @param {string} folderName - The name of the folder.
 * @returns {void} Nothing is returned.
 */
function writeFormComponent(html, folderName) {
    return new Promise((resolve, reject) => {

        const dirPath = join('src', 'lib', 'components', pluralize(folderName));
        const filePath = join(dirPath, 'Form.svelte');

        fsp.mkdir(dirPath, { recursive: true })
            .then(() => fsp.writeFile(filePath, html))
            .then(() => {
                console.log('\x1b[32m%s\x1b[0m%s', 'Created: ', filePath);
                resolve();
            })
            .catch(error => {
                console.error('Error creating file:', error);
                reject(error);
            });
    });
}

/**
 * Creates a destroy button component.
 * @param {html} html 
 * @returns {void} Nothing is returned.
 */
export function writeDeleteButtonComponent(html) {
    const dirPath = join('src', 'lib', 'components', 'chicjs');
    const filePath = join(dirPath, 'DestroyButton.svelte');

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, html, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
            }
        });
    });
}

// function to create a hooks.server.js file in the src directory:
export function createHooksServerFile() {
    const dirPath = join('src');
    const filePath = join(dirPath, 'hooks.server.js');
    const dirname = packageDirName();


    // open txt file and get the contents:
    // const data = fs.readFileSync('./templates/hooks.server.js.txt', 'utf8');

    // open file relative to this npm package:
    const data = fs.readFileSync(join(dirname, '../lib/templates/hooks_server_template.txt'), 'utf8');


    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, data, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                // console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
                console.log('\x1b[32m%s\x1b[0m', `- Routes updated: see all at /routes`);
            }
        });
    });
}

export function getRootDir() {
    let currentDir = process.cwd();
    let packageJsonPath = join(currentDir, 'package.json');
    let found = false;
    while (!found) {
        if (fs.existsSync(packageJsonPath)) {
            found = true;
        } else {
            currentDir = join(currentDir, '..');
            packageJsonPath = join(currentDir, 'package.json');
        }
    }
    return currentDir;
}

export function findProjectRoot(startDir) {
    const packageJsonPath = join(startDir, 'package.json');

    // Check if package.json exists in the current directory
    if (fs.existsSync(packageJsonPath)) {
        return startDir;
    }

    // If package.json is not found, move one directory up and check again
    const parentDir = dirname(startDir);
    if (parentDir === startDir) {
        // We've reached the root directory, but still no package.json found
        throw new Error('Could not find the project root directory.');
    }

    return findProjectRoot(parentDir);
}

export function addNewRouteOrComponent(n) {

    // settings for new component:
    let name = n.toLowerCase();
    let dirPath = join('src', 'lib', 'components');
    let filePath = join(dirPath, `${n}.svelte`);
    let templateName = 'component_template.txt';
    let type = 'component';

    // if the name starts with a slash, it's a route:
    if (name.startsWith('/')) {
        // remove the first slash:
        name = name.substring(1);
        console.log(`> Adding a new route: ${name}`);
        dirPath = join('src', 'routes', name);
        name = capitalize(name);
        filePath = join(dirPath, '+page.svelte');
        templateName = 'route_template.txt';
        type = 'route';
    } else {
        console.log(`> Adding a new component: ${n}`);
    }

    const dirname = packageDirName();

    let data = fs.readFileSync(join(dirname, `../lib/templates/${templateName}`), 'utf8');
    data = data.replace(/{NAME}/g, name);

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, data, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);

                if (type === 'route') {
                    // updates chic.json:
                    const chicConfig = readConfig();
                    name = name.toLowerCase();
                    const routes = chicConfig.routes;
                    const newRoute = {
                        method: "GET",
                        path: `/${name}`,
                        description: `${name} page`,
                        action: ""
                    };
                    routes.push(newRoute);
                    updateConfig({ routes: routes });
                    console.log('\x1b[32m%s\x1b[0m', `- Routes updated: see all at /routes`);
                }

            }
        });
    });
}

export function setFieldType(dbColumnType) {
    switch (dbColumnType) {
        case dbColumnType.includes('VARCHAR'):
            return 'string';
            break;
        case dbColumnType.includes('TEXT'):
            return 'text';
            break;
        case dbColumnType.includes('INTEGER'):
            return 'number';
            break;
        case dbColumnType.includes('DATE'):
            return 'date';
            break;
        case dbColumnType.includes('BOOLEAN'):
            return 'boolean';
            break;
        case dbColumnType.includes('BLOB'):
            return 'file';
            break;

        default:
            return 'string';
            break;
    }
}

export function setORMFieldType(dbColumnType) {
    console.log('dbColumnType:', dbColumnType);

    // Convert to uppercase for case-insensitive comparison
    dbColumnType = dbColumnType.toUpperCase();

    if (dbColumnType.includes('VARCHAR')) {
        return 'STRING';
    } else if (dbColumnType === 'TEXT') {
        return 'TEXT';
    } else if (dbColumnType === 'INTEGER' || dbColumnType.includes('INTEGER')) {
        return 'INTEGER';
    } else if (dbColumnType === 'DATE' || dbColumnType === 'DATETIME' || dbColumnType.includes('DATE')) {
        return 'DATE';
    } else if (dbColumnType === 'BOOLEAN') {
        return 'BOOLEAN';
    } else if (dbColumnType === 'TINYINT' || dbColumnType.startsWith('TINYINT')) {
        return 'BOOLEAN';
    } else if (dbColumnType === 'BLOB') {
        return 'BLOB';
    } else {
        console.log('Unrecognized type:', dbColumnType);
        return 'STRING';
    }
}