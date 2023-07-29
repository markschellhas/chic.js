import { routeServerIndexPageTemplate, routeServerShowPageTemplate, routeServerEditPageTemplate,  } from "../lib/templates/page_templates";

describe('route server index page template', () => {
    it('return the template in the correct format', () => {

      expect(routeServerIndexPageTemplate('cats')).toEqual(`
import { listCats, createCat, destroyCat } from '$lib/controllers/cats/cats_controller';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    new: async ({ request }) => {
        const data = await request.formData();
        const body = Object.fromEntries(data.entries());
        return createCat(body)
            .then(cat => {
                console.log('cat created: ', cat);
                return { success: true };
            })
            .catch(err => {
                console.log('cat failed to create');
                return fail(err);
            });
    },
    destroy: async ({ request }) => {
        const data = await request.formData();
        const body = Object.fromEntries(data.entries());
        return destroyCat(body)
            .then(cat => {
                console.log('cat destroyed: ', cat);
                return { success: true };
            })
            .catch(err => {
                console.log('cat failed to destroy');
                return fail(err);
            });
    }
};

export async function load({ params }) {
    const list = await listCats();
    const cats = list.map(cat => cat.toJSON());

    return {
        cats: cats
    };
}
`);
    });

});

describe('route server show page template', () => {
    it('return the template in the correct format', () => {

      expect(routeServerShowPageTemplate('cats')).toEqual(`
import { getCat, updateCat } from '$lib/controllers/cats/cats_controller';
import { fail } from '@sveltejs/kit';

export async function load({ params }) {
    const { id } = params;
    const x = await getCat(parseInt(id));
    const cat = x.get();
    return {
        cat: cat
    };
}

/** @type {import('./$types').Actions} */
export const actions = {
    update: async ({ request }) => {
        const data = await request.formData();
        const body = Object.fromEntries(data.entries());
        return updateCat(body)
            .then(cat => {
                console.log('cat updated: ', cat);
                return { success: true };
            })
            .catch(err => {
                console.log('cat failed to update');
                return fail(err);
            });
    }
};
`);
    })
});

describe('route server edit page template', () => {
    it('return the template in the correct format', () => {

      expect(routeServerEditPageTemplate('colors')).toEqual(`
import { getColor } from '$lib/controllers/colors/colors_controller';

// Get the color to edit
export async function load({ params }) {
    const { id } = params;
    const x = await getColor(parseInt(id));
    const color = x.get();
    return {
        color: color
    };
}
`);
    })
});
