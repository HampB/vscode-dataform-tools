document.addEventListener('DOMContentLoaded', () => {
    hljs.addPlugin(new CopyButtonPlugin({
        autohide: false, // Always show the copy button
    }));
});


const navLinks = document.querySelectorAll('.topnav a');

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));

        // Add active class to clicked link
        this.classList.add('active');
        if (this.getAttribute('href') === '#compilation') {
            document.getElementById("compilationBlock").style.display = "";
            document.getElementById("schemaBlock").style.display = "none";
        } else {
            document.getElementById("schemaBlock").style.display = "";
            document.getElementById("compilationBlock").style.display = "none";
        }
    });
});


// Function to update and rehighlight code blocks
function removeExistingCopyElements() {
    document.querySelectorAll('.hljs-copy-wrapper').forEach(el => {
        el.classList.remove('hljs-copy-wrapper');
    });
    document.querySelectorAll('.hljs-copy-button').forEach(el => {
        el.remove();
    });
}

window.addEventListener('message', event => {
    let data = {
        "preOperations": event?.data?.preOperations,
        "postOperations": event?.data?.postOperations,
        "tableOrViewQuery": event?.data?.tableOrViewQuery,
        "assertionQuery": event?.data?.assertionQuery,
        "incrementalPreOpsQuery": event?.data?.incrementalPreOpsQuery,
        "incrementalQuery": event?.data?.incrementalQuery,
        "nonIncrementalQuery": event?.data?.nonIncrementalQuery,
        "operationsQuery": event?.data?.operationsQuery,
        "relativeFilePath": event?.data?.relativeFilePath,
        "errorMessage": event?.data?.errorMessage,
        "dryRunStat": event?.data?.dryRunStat,
    };
    removeExistingCopyElements();

    let compiledQuerySchema =  event?.data?.compiledQuerySchema;
    if (compiledQuerySchema){
        compiledQuerySchema = compiledQuerySchema.fields.map(({ name, type }) => ({ name, type }));
        new Tabulator("#schemaTable", {
            data: compiledQuerySchema,
            autoColumns: true,
            layout: "fitColumns",
            rowHeader: {
                formatter: "rownum", 
                headerSort: false, 
                hozAlign: "center", 
                resizable: false, 
                frozen: true,
                width: 40
            },
        });
    }

    Object.entries(data).forEach(([key, value]) => {
        const element = document.getElementById(key);
        const divElement = document.getElementById(key + "Div");

        if (value === undefined || value === null || value === "") {
            if (divElement?.style){
                divElement.style.display = "none";
            }
        } else {
            if(key === "errorMessage"){
                if (value === " "){
                    divElement.style.display = "none";
                } else {
                    divElement.style.display = "";
                    element.textContent = value;
                }
            }
            else if (key === "dryRunStat"){
                if (value === "0 GB"){
                    divElement.style.display = "none";
                } else {
                    divElement.style.display = "";
                    element.textContent = `This query will process ${value} when run.`;
                }
            } else {
                if (divElement?.style){
                    divElement.style.display = "";
                }
                element.textContent = value;

                // Reset highlighting
                element.removeAttribute('data-highlighted');
                element.className = element.className.replace(/\bhljs\b/, '');

                // Re-apply highlighting
                hljs.highlightElement(element);
                hljs.lineNumbersBlock(element);
            }
        }
    });
});