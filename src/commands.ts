
export function getDryRunCommand(workspaceFolder: string, filename: string): string {
    return `dataform compile ${workspaceFolder} --json \
		| dj table-ops cost --compact=true --include-assertions=true --file ${filename}`;
}

export function compiledQueryCommand(workspaceFolder: string, filename: string): string {
    return `dataform compile ${workspaceFolder} --json \
		| dj table-ops query --file ${filename}`;
}

export function getRunTagsCommand(workspaceFolder: string, tag: string): string {
    return `dataform run ${workspaceFolder} --tags=${tag}`;
}

export function getRunTagsWtDepsCommand(workspaceFolder: string, tag: string): string {
    return `dataform run ${workspaceFolder} --tags=${tag} --include-deps`;
}

export function getRunTagsWtDownstreamDepsCommand(workspaceFolder: string, tag: string): string {
    return `dataform run ${workspaceFolder} --tags=${tag} --include-dependents`;
}


export function getFormatDataformFileCommand(relativeFilePath: string): string {
    return `formatdataform format ${relativeFilePath}`;
}
