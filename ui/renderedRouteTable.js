export const RoutesTable = (routes) => {
    return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>ChicJS Routes</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
    <style>
        .chicjs_routes {
            display: flex;
            flex-direction: column;
            margin: 0 auto;
            width: 100%;
            max-width: 800px;
            padding: 20px;
        }

        .is-hidden {
            display: none !important;
        }

        .header-row,
        .row {
            display: flex;
            flex-direction: row;
            padding: 10px;
            border-bottom: 1px solid #ccc;
        }

        .header-row div {
            font-weight: bold;
        }

        .header-row div,
        .row div {
            flex: 1;
        }
    </style>
</head>

<body>
    <div class="chicjs_routes">
        <h1 class="is-size-3">Routes</h1>
        <p class="pt-4 pb-4">These are the routes that are configured in chic.json. You can edit this file to add more
            routes.</p>
        <div class="field">
            <input class="input" id="search_field" type="text" placeholder="Search for routes" />
        </div>
        <div class="header-row">
            <div>Method</div>
            <div>Path</div>
            <div>Description</div>
            <div>Action</div>
        </div>

        ${routes.map(route => {
        return `
        <div class="row">
            <div><code>${route.method}</code></div>
            <div><a href="${route.path}">${route.path}</a></div>
            <div>${route.description ? route.description : '' }</div>
            <div>${route.action}</div>
        </div>
        `;
        }).join('')}

    </div>
</body>
<script>
    let rows = document.querySelectorAll('.row')

    function liveSearch() {
        let query = document.getElementById("search_field").value;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].textContent.toLowerCase()
                .includes(query.toLowerCase())) {
                rows[i].classList.remove("is-hidden");
            } else {
                rows[i].classList.add("is-hidden");
            }
        }
    }

    //A little delay
    let typingTimer;
    let typeInterval = 100;
    let searchInput = document.getElementById('search_field');

    searchInput.addEventListener('keyup', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(liveSearch, typeInterval);
    });
</script>

</html>
    `;
}