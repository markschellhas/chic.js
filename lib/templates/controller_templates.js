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
        const {MODEL_NAME_LOWERCASE} = await {MODEL_NAME}.create(data);
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
export const update{MODEL_NAME} = async (data) => {

    try {
        const {MODEL_NAME_LOWERCASE} = await {MODEL_NAME}.update(data, {
            where: { id: data.id }
        });
        return {MODEL_NAME_LOWERCASE};

    } catch (error) {
        console.log('create {MODEL_NAME_LOWERCASE} error: ', error);
        return error;
    }
};

/**
 * Destroys a {MODEL_NAME_LOWERCASE} with the provided data.
 *
 * @async
 * @param {(any[]|FormData)} data - The data to destroy the {MODEL_NAME_LOWERCASE} with.
 * @returns {Promise<{MODEL_NAME}|Error>} A promise that resolves to the destroyed {MODEL_NAME_LOWERCASE} or an error.
 */
export const destroy{MODEL_NAME} = async (data) => {

    try {
        const id = data.id;
        const {MODEL_NAME_LOWERCASE} = await {MODEL_NAME}.destroy({where: {id}});
        return {MODEL_NAME_LOWERCASE};

    } catch (error) {
        console.log('destroy {MODEL_NAME_LOWERCASE} error: ', error);
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