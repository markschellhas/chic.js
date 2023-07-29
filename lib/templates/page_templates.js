import { capitalize, singularize } from "../helpers";

/**
 * Template for a route page component
 */
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

/**
 * Template for a server form page component
 */
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

/**
 * Template for a server index page component
 * @param {string} resourceName - The name of the resource
 */
export function routeServerIndexPageTemplate(resourceName) {
    const dbMethodName = `list${capitalize(resourceName)}`;
    const createMethodName = `create${capitalize(singularize(resourceName))}`;
    const destroyMethodName = `destroy${capitalize(singularize(resourceName))}`;
    const resourceNameSingular = singularize(resourceName);
    return `
import { ${dbMethodName}, ${createMethodName}, ${destroyMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    new: async ({ request }) => {
        const data = await request.formData();
        const body = Object.fromEntries(data.entries());
        return ${createMethodName}(body)
            .then(${resourceNameSingular} => {
                console.log('${resourceNameSingular} created: ', ${resourceNameSingular});
                return { success: true };
            })
            .catch(err => {
                console.log('${resourceNameSingular} failed to create');
                return fail(err);
            });
    },
    destroy: async ({ request }) => {
        const data = await request.formData();
        const body = Object.fromEntries(data.entries());
        return ${destroyMethodName}(body)
            .then(${resourceNameSingular} => {
                console.log('${resourceNameSingular} destroyed: ', ${resourceNameSingular});
                return { success: true };
            })
            .catch(err => {
                console.log('${resourceNameSingular} failed to destroy');
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


/**
 * Template for a server edit page component
 * @param {string} resourceName - The name of the resource
 */
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


/**
 * Template for a server show page component
 * @param {string} resourceName - The name of the resource
 */
export function routeServerShowPageTemplate(resourceName) {
    const dbMethodName = `get${capitalize(singularize(resourceName))}`;
    const updateMethodName = `update${capitalize(singularize(resourceName))}`;
    const resourceNameSingular = singularize(resourceName);
    return `
import { ${dbMethodName}, ${updateMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { fail } from '@sveltejs/kit';

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
        const body = Object.fromEntries(data.entries());
        return ${updateMethodName}(body)
            .then(${resourceNameSingular} => {
                console.log('${resourceNameSingular} updated: ', ${resourceNameSingular});
                return { success: true };
            })
            .catch(err => {
                console.log('${resourceNameSingular} failed to update');
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

export function linksOnUpdatePageTemplate(resourceName) {
  return `
  <div class="links">
    <a href="/${resourceName}">Back to ${resourceName}</a> <DestroyButton resource='${singularize(resourceName)}' id={data.${singularize(resourceName)}.id} />
</div>
`;
}