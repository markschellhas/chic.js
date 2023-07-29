import { capitalize, singularize } from "./helpers.js";

export let formComponentTemplate = `
<script>
 export let data = {};
 export let action = '';
</script>

{chic_form}

<style>
    form {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 500px;
    }
    input, textarea {
        margin-bottom: 1rem;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
</style>
`;

export let modelContentTemplate = `
// {MODEL_NAME} model definition:
const {MODEL_NAME}Model = function(sequelize, DataTypes) {
    return sequelize.define('{MODEL_NAME}', {
{FIELDS}
    },
    {
      sequelize,
      tableName: '{TABLE_NAME}',
      timestamps: false,
    })
  }
  
  export { {MODEL_NAME}Model }
`;

export let routePageTemplate = `
<script>
    {FORM_IMPORT}
    {DATA_IMPORT}
    // place your js code here
    
</script>

<svelte:head>
    <title>{NAME_CAP}</title>
    <meta name="description" content="{NAME_CAP} page" />
</svelte:head>

<h1>{NAME_CAP}</h1>

  {FORM_PLACEMENT}

  {MAIN_CONTENT}

  {LINKS}

{STYLES}
`;

export let routeServerFormPageTemplate = `
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    default: async ({ cookies, request }) => {
        const data = await request.formData();
        const body = Object.fromEntries(data.entries());
        throw redirect(303, '/posts');
    }
};
`;

export function routeServerIndexPageTemplate(resourceName) {
    const dbMethodName = `list${capitalize(resourceName)}`;
    const createMethodName = `create${capitalize(singularize(resourceName))}`;
    const resourceNameSingular = singularize(resourceName);
    return `
import { ${dbMethodName}, ${createMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    new: async ({ request }) => {
        const data = await request.formData();
        return ${createMethodName}(data)
            .then(${resourceNameSingular} => {
                console.log('${resourceNameSingular} created: ', ${resourceNameSingular});
                return { success: true };
            })
            .catch(err => {
                console.log('${resourceNameSingular} failed to create');
                return fail(err);
            });
    }
};

export async function load({ params }) {
    const list = await ${dbMethodName}();
    const ${resourceName} = list.map(${resourceNameSingular} => ${resourceNameSingular}.toJSON());

    return {
        ${resourceName}: ${resourceName}
    };
}
`;
}

export function routeServerEditPageTemplate(resourceName) {
    const dbGetMethodName = `get${capitalize(singularize(resourceName))}`;
    const resourceNameSingular = singularize(resourceName);
    return `
import { ${dbGetMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';

// Get the ${resourceNameSingular} to edit
export async function load({ params }) {
    const { id } = params;
    const x = await ${dbGetMethodName}(parseInt(id));
    const ${resourceNameSingular} = x.get();
    return {
        ${resourceNameSingular}: ${resourceNameSingular}
    };
}
`;
}

export function routeServerShowPageTemplate(resourceName) {
    const dbMethodName = `get${capitalize(singularize(resourceName))}`;
    const updateMethodName = `edit${capitalize(singularize(resourceName))}`;
    const resourceNameSingular = singularize(resourceName);
    return `
import { ${dbMethodName}, ${updateMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';

export async function load({ params }) {
    const { id } = params;
    const x = await ${dbMethodName}(parseInt(id));
    const ${resourceNameSingular} = x.get();
    return {
        ${resourceNameSingular}: ${resourceNameSingular}
    };
}

/** @type {import('./$types').Actions} */
export const actions = {
    update: async ({ request }) => {
        const data = await request.formData();
        return ${updateMethodName}(data)
            .then(${resourceNameSingular} => {
                console.log('${resourceNameSingular} updated: ', ${resourceNameSingular});
                return { success: true };
            })
            .catch(err => {
                console.log('${resourceNameSingular} failed to updated');
                return fail(err);
            });
    }
};
`;
}

// Resource Form Page:
export function linksOnFormPageTemplate(resourceName) {
  return `<a href="/${resourceName}">Back to ${resourceName}</a>`;
}

export let stylesOnFormPageTemplate = `
<style>
    h1 {
        width: 100%;
        margin-bottom: 30px;
    }
    .links {
        display: flex;
        margin-top: 30px;
    }
    .links a {
        margin-right: 1rem;
        text-decoration: underline;
    }
</style>
`;

// Resource Index Page:
export function mainContentOnIndexPage(resourceName, firstFieldName) {
    return `
    <ul>
    {#each data.${resourceName} as item}
      <li>
          <a href={"/${resourceName}/"+item.id}>{item.${firstFieldName}}</a>
      </li>
    {/each}
    </ul>
`;
}

export function linksOnIndexPageTemplate(resourceName) {
  return `
  <div class="links">
    <a href="/${resourceName}/new">Create a new ${singularize(resourceName)}</a>
  </div>
`;
}

// Resource Detail Page:
export function mainContentOnShowPage(resourceName) {
    return `
    {#each Object.entries(data.${singularize(resourceName)}) as [key, val]}
      <p><b>{key}:</b> {val}</p>
    {/each}
`;
}

export function linksOnShowPageTemplate(resourceName) {
  return `
  <div class="links">
    <a href="/${resourceName}">Back to ${resourceName}</a> <a href="/${resourceName}/{data.${singularize(resourceName)}.id}/edit">Edit ${singularize(resourceName)}</a>
</div>
`;
}

// Resource Controller:
export let controllerTemplate = `
import { {MODEL_NAME} } from "$lib/db/db";

/**
 * Creates a new {MODEL_NAME_LOWERCASE} with the provided data.
 *
 * @async
 * @param {(any[]|FormData)} data - The data to create the {MODEL_NAME_LOWERCASE} with.
 * @returns {Promise<{MODEL_NAME}|Error>} A promise that resolves to the created {MODEL_NAME_LOWERCASE} or an error.
 */
export const create{MODEL_NAME} = async (data) => {

    try {
        const body = Object.fromEntries(data.entries());
        const {MODEL_NAME_LOWERCASE} = await {MODEL_NAME}.create(body);
        return {MODEL_NAME_LOWERCASE};

    } catch (error) {
        console.log('create {MODEL_NAME_LOWERCASE} error: ', error);
        return error;
    }
};

/**
 * Updates a {MODEL_NAME_LOWERCASE} with the provided data.
 *
 * @async
 * @param {(any[]|FormData)} data - The data to update the {MODEL_NAME_LOWERCASE} with.
 * @returns {Promise<{MODEL_NAME}|Error>} A promise that resolves to the updated {MODEL_NAME_LOWERCASE} or an error.
 */
export const edit{MODEL_NAME} = async (data) => {

    try {
        const body = Object.fromEntries(data.entries());
        const {MODEL_NAME_LOWERCASE} = await {MODEL_NAME}.update(body, {
            where: { id: body.id }
        });
        return {MODEL_NAME_LOWERCASE};

    } catch (error) {
        console.log('create {MODEL_NAME_LOWERCASE} error: ', error);
        return error;
    }
};

/**
 * Gets {MODEL_NAME_LOWERCASE} with the provided id.
 * 
 * @async
 * @param {number} id - The id of the {MODEL_NAME_LOWERCASE} to get.
 * @returns {Promise<{MODEL_NAME}|Error>} A promise that resolves to the {MODEL_NAME_LOWERCASE} or an error. 
 * 
*/
export const get{MODEL_NAME} = async (id) => {
    
        try {
            const {MODEL_NAME_LOWERCASE} = await {MODEL_NAME}.findByPk(id);
            return {MODEL_NAME_LOWERCASE};
    
        } catch (error) {
            console.log('get post error: ', error);
            return error;
        }
};

export const list{MODEL_NAME_PLURAL_CAP} = async () => {

    try {
        const {MODEL_NAME_LOWERCASE_PLURAL} = await {MODEL_NAME}.findAll();
        return {MODEL_NAME_LOWERCASE_PLURAL};

    } catch (error) {
        console.log('list {MODEL_NAME_LOWERCASE_PLURAL} error: ', error);
        return error;
    }
};
`;
// Resource API Routes:
export function APIIndexRouteTemplate(resourceName) {
    const singResourceWord = singularize(resourceName);
    const createMethodName = `create${capitalize(singResourceWord)}`;
    return `
import { list${capitalize(resourceName)} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
    const ${resourceName} = await list${capitalize(resourceName)}();
    return json(${resourceName});
}

// Create ${singResourceWord}
/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const body = request.body;
    const ${resourceName} = await ${createMethodName}(body);
    return json(${resourceName});
}
`;
}

export function APIItemRouteTemplate(resourceName) {
    const singResourceWord = singularize(resourceName);
    const methodName = `get${capitalize(singResourceWord)}`;
    const updateMethodName = `update${capitalize(singResourceWord)}`;
    const deleteMethodName = `delete${capitalize(singResourceWord)}`;


    return `
import { ${methodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { json } from '@sveltejs/kit';

// Get ${singResourceWord}
/** @type {import('./$types').RequestHandler} */
export async function GET({ params  }) {
    const { id } = params;
    const ${singResourceWord} = await ${methodName}(id);
    return json(${singResourceWord});
}

// Update ${singResourceWord}
/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request  }) {
    const { id } = params;
    const body = request.body;
    const ${singularize(resourceName)} = await ${updateMethodName}(body, { where: { id: id } } );
    return json(${singularize(resourceName)});
}

// Delete ${singResourceWord}
/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, request  }) {
    const { id } = params;
    const ${singularize(resourceName)} = await ${deleteMethodName}(id);
    return json(${singularize(resourceName)});
}


`;
}

// Resource database file:
export let dbTemplate = `

import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';
// import models:

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'chic.sqlite',
    dialectOptions: {
        // Your sqlite3 options here
        // for instance, this is how you can configure the database opening mode:
        mode: SQLite.OPEN_READWRITE | SQLite.OPEN_CREATE | SQLite.OPEN_FULLMUTEX,
      },
});

// const sequelize = new Sequelize("sqlite::memory:");
//  catch error if db connection fails
try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}
sequelize.sync();

// define resources:

export {}
`;