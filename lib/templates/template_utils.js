import { capitalize, singularize, pluralize } from "../helpers.js";
import { controllerTemplate } from "./controller_templates.js";
import { mainContentOnIndexPage, linksOnIndexPageTemplate, stylesOnFormPageTemplate, linksOnUpdatePageTemplate, linksOnShowPageTemplate, mainContentOnShowPage } from "./page_templates.js";

/**
 * Replaces placeholders in index page template with content
 * @param {string} content - The content to replace placeholders with
 * @param {string} resourceName - The name of the resource
 * @param {string} firstFieldName - The name of the first field
 */
export function contentReplaceIndexPage(content, resourceName, firstFieldName) {
    content = content.replace('{FORM_IMPORT}', "");
    content = content.replace('{FORM_PLACEMENT}', "");
    content = content.replace('{DATA_IMPORT}', `
/** @type {import('./$types').PageData} */
export let data;`);
    content = content.replace('{MAIN_CONTENT}', mainContentOnIndexPage(resourceName, firstFieldName));
    content = content.replace('{LINKS}', linksOnIndexPageTemplate(resourceName));
    content = content.replace('{STYLES}', stylesOnFormPageTemplate); //TODO: change name of template to be more generic
    return content;
}

/**
 * Replaces placeholders in create resource page template with content
 * @param {string} content - The content to replace placeholders with
 * @param {string} resourceName - The name of the resource
 */
export function contentReplaceNewFormPage(content, resourceName) {
    content = content.replace('{FORM_IMPORT}', "import Form from '$lib/components/" + resourceName + "/Form.svelte';");
    content = content.replace('{DATA_IMPORT}', "");
    content = content.replace('{FORM_PLACEMENT}', `<Form action='/${resourceName}?/new' />`);
    content = content.replace('{MAIN_CONTENT}', "");
    content = content.replace('{STYLES}', stylesOnFormPageTemplate);
    content = content.replace('{LINKS}', `<a href="/${resourceName}">Back to ${resourceName}</a>`);
    return content;
}

/**
 * Replaces placeholders in update resource page template with content
 * @param {string} content - The content to replace placeholders with
 * @param {string} resourceName - The name of the resource
 */
export function contentReplaceEditFormPage(content, resourceName) {
    content = content.replace('{FORM_IMPORT}', `import Form from '$lib/components/${resourceName}/Form.svelte';\nimport DestroyButton from '$lib/components/chicjs/DestroyButton.svelte';`);
    content = content.replace('{DATA_IMPORT}', "export let data;");
    content = content.replace('{FORM_PLACEMENT}', `<Form data={data.${singularize(resourceName)}} action='/${resourceName}/{data.${singularize(resourceName)}.id}?/update' />`);
    content = content.replace('{MAIN_CONTENT}', "");
    content = content.replace('{STYLES}', stylesOnFormPageTemplate);
    content = content.replace('{LINKS}', linksOnUpdatePageTemplate(resourceName));
    return content;
}

/**
 * Replaces placeholders in show resource page template with content
 * @param {string} content - The content to replace placeholders with
 * @param {string} resourceName - The name of the resource
 */
export function contentReplaceShowPage(content, resourceName) {
    content = content.replace('{FORM_IMPORT}', "");
    content = content.replace('{DATA_IMPORT}', "export let data;");
    content = content.replace('{FORM_PLACEMENT}', "");
    content = content.replace('{MAIN_CONTENT}', mainContentOnShowPage(resourceName));
    content = content.replace('{STYLES}', stylesOnFormPageTemplate);
    content = content.replace('{LINKS}', linksOnShowPageTemplate(resourceName));
    return content;
}

/**
 * Replaces placeholders in controller template with content
 * @param {string} resourceName - The name of the resource
 */
export function generateControllerContent(resourceName) {
    const modelName = capitalize(singularize(resourceName));
    const modelNamePluralCap = capitalize(pluralize(resourceName));
    const modelNameLowercase = modelName.toLowerCase();
    const modelNameLowercasePlural = pluralize(modelNameLowercase);

    let content = controllerTemplate;
    content = content.replace(/{MODEL_NAME}/g, modelName);
    content = content.replace(/{MODEL_NAME_PLURAL_CAP}/g, modelNamePluralCap);
    content = content.replace(/{MODEL_NAME_LOWERCASE}/g, modelNameLowercase);
    content = content.replace(/{MODEL_NAME_LOWERCASE_PLURAL}/g, modelNameLowercasePlural);
    return content;
}