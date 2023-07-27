import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNamespaces, singularize, pluralize, transformFieldsToObject, capitalize } from './helpers.js';
import { contentReplaceIndexPage, contentReplaceShowPage, generateControllerContent, contentReplaceEditFormPage, contentReplaceNewFormPage } from './template_utils.js';
import { routePageTemplate, modelContentTemplate, routeServerIndexPageTemplate, routeServerNewPageTemplate, routeServerShowPageTemplate, routeServerEditPageTemplate, dbTemplate, APIItemRouteTemplate, APIIndexRouteTemplate, formComponentTemplate } from './templates.js';

export function init() {
    console.log('\x1b[36m%s\x1b[0m', '🏁 Initializing chic...');
    // set up data
    const chicConfig = {
        version: '0.0.1',
        models: [],
        components: [],
        routes: [],
        db: {
            type: 'sqlite',
            name: 'chic.sqlite'
        }
    };
    // serialize data to JSON string
    const data = JSON.stringify(chicConfig, null, 2);

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
export function createRoutePages(inputName, paths, fields) {
    let { name, nameSingular, nameCapitalized } = getNamespaces(inputName);
    const formFieldsSpec = transformFieldsToObject(fields);
    const firstFieldName = formFieldsSpec[0].name;
    console.log('\x1b[36m%s\x1b[0m', `• ${capitalize(singularize(name))} routes:`);
    
    // create a svelte route:
    let content = routePageTemplate;
    content = content.replace(/{NAME_CAP}/g, nameCapitalized);

    paths.forEach((p) => {
        const dirPath = path.join('src', 'routes', name, p);

        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return;
            }

            let contentToWrite = content

            switch (p) {
                case '':
                    contentToWrite = contentReplaceIndexPage(contentToWrite, name, firstFieldName);    
                    break;
                case 'new':
                    contentToWrite = contentReplaceNewFormPage(contentToWrite, name);    
                    break;
                case '[id]':
                    contentToWrite = contentReplaceShowPage(contentToWrite, name);
                    break;
                case '[id]/edit':
                    contentToWrite = contentReplaceEditFormPage(contentToWrite, name);
                    break;
            
                default:
                    break;
            }

            const filePath = path.join(dirPath, `+page.svelte`);
            fs.writeFile(filePath, contentToWrite, (err) => {
                if (err) {
                    console.error('Error creating file:', err);
                } else {
                    console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
                }
            });

            createRouteServerPage(name, p);
        });
    });

};

export function createAPIRoutes(inputName, paths) {
    const { name, nameSingular, nameCapitalized } = getNamespaces(inputName);
    console.log('\x1b[36m%s\x1b[0m', `• ${capitalize(singularize(name))} API routes:`);

    paths.forEach((p) => {
        const dirPath = path.join('src', 'routes', 'api', name, p);

        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return;
            }

            let contentToWrite = ""

            switch (p) {
                case '':
                    contentToWrite = APIIndexRouteTemplate(name);
                    break;
                case '[id]':
                    contentToWrite = APIItemRouteTemplate(name);
                    break;
            
                default:
                    break;
            }

            const filePath = path.join(dirPath, `+server.js`);
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

function createRouteServerPage(name, routePath) {
    const dirPath = path.join('src', 'routes', name, routePath);
    const filePath = path.join(dirPath, `+page.server.js`);

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
            case "new":
                content = routeServerNewPageTemplate(name);
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

// CONTROLLER:
export function createController(inputName, fields) {
    let controllerContent = generateControllerContent(inputName, fields);
    writeControllerFile(controllerContent, inputName);
}

// MODELS:
export function createModel(inputName, fields) {
    let { name, nameSingular, nameCapitalized } = getNamespaces(inputName);
    const formFieldsSpec = transformFieldsToObject(fields);
    let modelContent = generateModelContent(inputName.toLowerCase(), formFieldsSpec);
    writeModelFile(modelContent, capitalize(nameSingular));
}

function generateModelContent(modelName, fields) {
    let name = capitalize(modelName);
    let tableName = pluralize(modelName).toLowerCase();
    let content = modelContentTemplate;
    let fieldsString = '';

    fields.forEach(field => {
        fieldsString += `      ${field.name}:      { type: DataTypes.${field.type.toUpperCase()} },\n`;
    });

    content = content.replace(/{MODEL_NAME}/g, name);
    content = content.replace('{FIELDS}', fieldsString);
    content = content.replace('{TABLE_NAME}', tableName);

    return content;
}

function writeModelFile(content, modelName) {
    
    console.log('\x1b[36m%s\x1b[0m', `• ${modelName} model:`);
    
    const dirPath = path.join('src', 'lib', 'models');
    const filePath = path.join(dirPath, `${modelName}.js`);

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, content, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
            }
        });
    });
}

function writeControllerFile(content, modelName) {
    let pluralName = pluralize(modelName);
    
    console.log('\x1b[36m%s\x1b[0m', `• ${modelName} controller:`);
    
    const dirPath = path.join('src', 'lib', 'controllers', pluralName.toLowerCase());
    const filePath = path.join(dirPath, `${pluralName.toLowerCase()}_controller.js`);

    fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        fs.writeFile(filePath, content, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `- ${filePath} created.`);
            }
        });
    });
}

function writeDBFile() {
    const dirPath = path.join('src', 'lib', 'db');
    const filePath = path.join(dirPath, `chic.sqlite`);

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

async function createDBConfigFile() {

    return new Promise(async (resolve, reject) => {
        // read config:
        const chicConfig = readConfig();
        let sequelizeConfig = chicConfig.db;

        const dirPath = path.join('src', 'lib', 'db');

        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return;
            }

            let contentToWrite = dbTemplate;

            const filePath = path.join(dirPath, `db.js`);
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

function readConfig() {
    // read file
    const data = fs.readFileSync('chic.json');
    // parse JSON
    const chicConfig = JSON.parse(data);
    // return config
    return chicConfig;
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

// Database actions:
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

    const dirPath = path.join('src', 'lib', 'db');
    const filePath = path.join(dirPath, 'db.js');
    processFile(filePath, name); // replace with the actual file path
};

// FORM COMPONENTS:
export function createFormComponent(modelName, fields) {
    const name = modelName.toLowerCase();
    const formFieldsSpec = transformFieldsToObject(fields);
    let formFields = addHtmlFields(formFieldsSpec);
    let formHtml = generateHtmlForm(formFields);
    let componentContent = insertForm(formComponentTemplate, formHtml);
    writeFormComponent(componentContent, name);
}

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
            default:
                html = `<input name="${field.name}" bind:value={data.${field.name}} type="text" />`;
                break;
        }

        return { ...field, html };
    });
}

function generateHtmlForm(fields) {
    let formHtml = '<form method="POST">\n';
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

function insertForm(html, form) {
    return html.replace('{chic_form}', form);
}

function writeFormComponent(html, folderName) {
    const dirPath = path.join('src', 'lib', 'components', pluralize(folderName));
    const filePath = path.join(dirPath, 'Form.svelte');

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

function findProjectRoot(startDir) {
    const packageJsonPath = path.join(startDir, 'package.json');

    // Check if package.json exists in the current directory
    if (fs.existsSync(packageJsonPath)) {
        return startDir;
    }

    // If package.json is not found, move one directory up and check again
    const parentDir = path.dirname(startDir);
    if (parentDir === startDir) {
        // We've reached the root directory, but still no package.json found
        throw new Error('Could not find the project root directory.');
    }

    return findProjectRoot(parentDir);
}