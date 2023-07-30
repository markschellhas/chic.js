import { singularize, capitalize } from "../helpers.js";

// Resource API Routes:
export function APIIndexRouteTemplate(resourceName) {
    const singResourceWord = singularize(resourceName);
    const listMethodName = `list${capitalize(resourceName)}`;
    const createMethodName = `create${capitalize(singResourceWord)}`;
    return `
import { ${listMethodName}, ${createMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
    const ${resourceName} = await ${listMethodName}();
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
import { ${methodName}, ${updateMethodName}, ${deleteMethodName} } from '$lib/controllers/${resourceName}/${resourceName}_controller';
import { json } from '@sveltejs/kit';

// API Endpoints for ${singResourceWord} resource
// Access at /api/${resourceName}

// Get ${singResourceWord} endpoint
/** @type {import('./$types').RequestHandler} */
export async function GET({ params  }) {
    const { id } = params;
    const ${singResourceWord} = await ${methodName}(id);
    return json(${singResourceWord});
}

// Update ${singResourceWord} endpoint
/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request  }) {
    const { id } = params;
    const body = request.body;
    const ${singularize(resourceName)} = await ${updateMethodName}(body, { where: { id: id } } );
    return json(${singularize(resourceName)});
}

// Delete ${singResourceWord} endpoint
/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, request  }) {
    const { id } = params;
    const ${singularize(resourceName)} = await ${deleteMethodName}(id);
    return json(${singularize(resourceName)});
}

`;
}
