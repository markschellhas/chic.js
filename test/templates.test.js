import { routeServerIndexPageTemplate } from "../lib/templates";

describe('route server index page template', () => {
    it('return the template in the correct format', () => {
      expect(routeServerIndexPageTemplate('cats')).toEqual(`
import { listCats, createCat } from '$lib/controllers/cats/cats_controller';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    new: async ({ request }) => {
        const data = await request.formData();
        return createCat(data)
            .then(cat => {
                console.log('cat created: ', cat);
                return { success: true };
            })
            .catch(err => {
                console.log('cat failed to create');
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