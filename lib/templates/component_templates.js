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