// Helpers 
export function pluralize(val) {
    if (val.endsWith('s')) return val;
    return val + 's';
}

export function singularize(val) {
    if (val.endsWith('s')) return val.slice(0, -1);
    return val;
}

export function capitalize(val) {
    return val.charAt(0).toUpperCase() + val.slice(1);
}

export function getNamespaces(val){
    let name = pluralize(val.toLowerCase());
    let nameSingular = val.toLowerCase();
    let nameCapitalized = capitalize(name);
    return {
        name,
        nameSingular,
        nameCapitalized
    }
}
/**
 * 
 * @param {string} str 
 * @returns {Array<{name: string, type: string}>}
 */
export function transformFieldsToObject(str) {
    let outputArray = [];
    str.split(' ').map(s => {
        const e = s.includes(':') ? s : s + ':string';
        const [name, type] = e.split(':');
        // if name is empty, skip
        if (name === '') return;
        outputArray = [...outputArray, { name, type }];
    });
    return outputArray;
}

export function styledBy(options) {
    const optionsString = options._.join(' ');
    const optionsArray = options._;
    if (optionsArray.length < 3) return [false, '', '', ''];

    const firstThreeOptions = optionsString.substring(0, 3);
    const firstTwoOptionsString = optionsArray[0] + ' ' + optionsArray[1];
    const lastOptionString = optionsArray[2];

    if (firstTwoOptionsString === 'styled by' || firstTwoOptionsString === 'styled with') {
        let output = [false, '', ''];
        switch (lastOptionString) {
            case "tailwind":
                output = [true, 'tailwind', 'npx svelte-add tailwindcss', 'https://github.com/svelte-add/tailwindcss'];
                break;
            case "tailwindcss":
                output = [true, 'tailwind', 'npx svelte-add tailwindcss', 'https://github.com/svelte-add/tailwindcss'];
                break;
            case "bootstrap":
                output = [true, 'bootstrap', 'npx svelte-add bootstrap', 'https://github.com/svelte-add/bootstrap'];
                break;
            case "bulma":
                output = [true, 'bulma', 'npx svelte-add bulma', 'https://github.com/svelte-add/bulma'];
                break;
            default:
                output = [false, '', '', ''];
                break;
        }
        return output;
    } else {
        return [false, '', '', ''];
    }

}

export const CONSOLE_COLOR = {
    RED: '\x1b[31m%s\x1b[0m',
    BLUE: '\x1b[36m%s\x1b[0m',
    GREEN: '\x1b[32m%s\x1b[0m',
}



/**
 * @typedef {Object} Replacement
 * @property {string} key
 * @property {string} value
 *
 * @param {string} content 
 * @param {Array<Replacement>} replacements 
 * @returns 
 */
export function stringReplacer(content, replacements) {
    
    let newContent = content;
    for (const replacement of replacements) {
        // Using a regular expression to globally replace all occurrences of the placeholder
        const regex = new RegExp(replacement.key, 'g');
        newContent = newContent.replace(regex, replacement.value);
    }
    return newContent;
}

export function fieldValidation(fields) {
    let f = transformFieldsToObject(fields);
    let validation = true;
    let validFieldTypes = ['string', 'number', 'boolean', 'date', 'json', 'text'];

    f.forEach(field => {
        if (field.name === '') {
            validation = false;
        }
        if (!validFieldTypes.includes(field.type)) {
            validation = false;
        }

    });
    return validation;
}

export function consoleLog(color, messageInColor, messageNotInColor){
    console.log(color, messageInColor, messageNotInColor);
}