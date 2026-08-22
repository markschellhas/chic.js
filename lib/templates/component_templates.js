import { capitalize, transformFieldsToObject } from '../helpers.js';

/**
 * Template for form component
 */
export let formComponentTemplate = `
<script>
    let { data = $bindable({}), action = '' } = $props();
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

/**
 * Generates a Svelte form component from a space-delimited field specification.
 * @param {string} fields - The fields to include in the form.
 * @returns {string} The generated Svelte component.
 */
export function generateFormComponentTemplate(fields) {
    const formFields = transformFieldsToObject(fields);
    const encoding = formFields.some((field) => field.type === 'file') ? ' enctype="multipart/form-data"' : '';
    let formHtml = `<form method="POST" action={action}${encoding}>\n`;

    formHtml += `
        {#if data?.id}
            <input name="id" value={data.id} type="hidden" readonly />
        {/if}

        `;

    formFields.forEach((field) => {
        formHtml += `  <label for="${field.name}">${capitalize(field.name)}</label>\n`;
        formHtml += `  ${formFieldTemplate(field)}\n`;
    });

    formHtml += '  <button type="submit">Submit</button>\n';
    formHtml += '</form>\n';

    return formComponentTemplate.replace('{chic_form}', formHtml);
}

function formFieldTemplate(field) {
    const attributes = `id="${field.name}" name="${field.name}"`;

    switch (field.type) {
        case 'text':
            return `<textarea ${attributes} bind:value={data.${field.name}}></textarea>`;
        case 'number':
            return `<input ${attributes} bind:value={data.${field.name}} type="number" />`;
        case 'file':
            return `<input ${attributes} type="file" />`;
        default:
            return `<input ${attributes} bind:value={data.${field.name}} type="text" />`;
    }
}

/**
 * Template for a delete button component
 */
export let destroyButtonTemplate = `
<script>
    let { resource, id } = $props();
    
    function confirmDelete(event) {
        event.preventDefault();
        if (window.confirm("Are you sure you want to delete this?")) {
            event.currentTarget.form.submit();
        }
    }
</script>

<form class="button_to" method="post" action="/{resource}s?/destroy">
    <input type="hidden" name="_method" value="destroy" autocomplete="off">
    <input type="hidden" name="id" value="{id}" autocomplete="off">
    <button type="submit" onclick={confirmDelete}>Delete this {resource}</button>
</form>

<style>
    button {
        border: none;
        background: none;
        padding: 0;
        color: red;
        cursor: pointer;
    }
</style>
`;