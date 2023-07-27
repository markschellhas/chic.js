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

export function transformFieldsToObject(str) {
    let outputArray = [];
    str.split(' ').map(s => {
        const [name, type] = s.split(':');
        outputArray = [...outputArray, { name, type }];
    });
    return outputArray;
}