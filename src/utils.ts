import * as vscode from 'vscode';
import { getDryRunCommand, } from './commands';
const fs = require('fs');
const path = require('path');
const { execSync, ChildProcess, spawn } = require('child_process');
import { DataformCompiledJson, ConfigBlockMetadata, Table } from './types';
import { dataformTags } from './extension';
import { queryDryRun } from './bigqueryDryRun';
import { setDiagnostics } from './setDiagnostics';

let supportedExtensions = ['sqlx'];

export let declarationsAndTargets: string[] = [];

const shell = (cmd: string) => execSync(cmd, { encoding: 'utf8' });

export function executableIsAvailable(name: string) {
    try { shell(`which ${name}`); return true; }
    catch (error) {
        if (name === 'formatdataform') {
            vscode.window.showWarningMessage('Install formatdataform to enable sqlfluff formatting');
            return;
        } else {
            vscode.window.showErrorMessage(`${name} cli not found in path`);
        }
        return false;
    }
}

export function getFileNameFromDocument(document: vscode.TextDocument): string {
    var filename = document.uri.fsPath;
    let basenameSplit = path.basename(filename).split('.');
    let extension = basenameSplit[1];
    let validFileType = supportedExtensions.includes(extension);
    if (!validFileType) {
        // vscode.window.showWarningMessage(`vscode-dataform-tools extension currently only supports ${supportedExtensions} files`);
        return "";
    }
    filename = basenameSplit[0];
    return filename;
}

export function getWorkspaceFolder(): string {
    let workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceFolder !== undefined) {
        if (isDataformWorkspace(workspaceFolder) === false) {
            vscode.window.showWarningMessage(`Not a Dataform workspace. Workspace: ${workspaceFolder} does not have workflow_settings.yaml or dataform.json`);
            return "";
        }
        return workspaceFolder;
    }
    return "";
}

export function isDataformWorkspace(workspacePath: string) {
    const dataformSignatureFiles = ['workflow_settings.yaml', 'dataform.json'];
    let fileExists = false;

    for (let i = 0; dataformSignatureFiles.length; i++) {
        const filePath = path.join(workspacePath, dataformSignatureFiles[i]);
        let fileExists = fs.existsSync(filePath);
        if (fileExists) {
            return fileExists;
        }
    }
    return fileExists;
}

export function runCommandInTerminal(command: string) {
    if (vscode.window.activeTerminal === undefined) {
        const terminal = vscode.window.createTerminal('dataform');
        terminal.sendText(command);
        terminal.show();
    } else {
        const terminal = vscode.window.activeTerminal;
        vscode.window.activeTerminal.sendText(command);
        terminal.show();
    }
}

/**
    Suggestion if provided from dry is expected to along the lines of

    `googleapi: Error 400: Unrecognized name: MODELID; Did you mean MODEL_ID? at [27:28], invalidQuery`

    From the above string the function attempts to extract the suggestion which we assumed based on observations to be separated by ";"
    followed by `Did you mean **fix**? at [lineNumber:columnNumber]`
**/
export function extractFixFromDiagnosticMessage(diagnosticMessage: string) {
    const diagnosticSuggestion = diagnosticMessage.split(';')[1];

    if (!diagnosticSuggestion) {
        return null;
    }

    const regex = /Did you mean (\w+)\?/;
    const match = diagnosticSuggestion.match(regex);
    const fix = match ? match[1] : null;
    return fix;
}


// Get start and end line number of the config block in the .sqlx file
// This assumes that the user is using config { } block at the top of the .sqlx file
//
// @return [start_of_config_block: number, end_of_config_block: number]
export const getLineNumberWhereConfigBlockTerminates = (): ConfigBlockMetadata => {
    let startOfConfigBlock = 0;
    let endOfConfigBlock = 0;
    let isInInnerConfigBlock = false;
    let innerConfigBlockCount = 0;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return { startLine: 0, endLine: 0 };
    }

    const document = editor.document;
    document.save();
    const totalLines = document.lineCount;

    for (let i = 0; i < totalLines; i++) {
        const lineContents = document.lineAt(i).text;

        if (lineContents.match("config")) {
            startOfConfigBlock = i + 1;
        } else if (lineContents.match("{")) {
            isInInnerConfigBlock = true;
            innerConfigBlockCount += 1;
        } else if (lineContents.match("}") && isInInnerConfigBlock && innerConfigBlockCount >= 1) {
            innerConfigBlockCount -= 1;
        } else if (lineContents.match("}") && innerConfigBlockCount === 0) {
            endOfConfigBlock = i + 1;
            return { startLine: startOfConfigBlock, endLine: endOfConfigBlock };
        }
    }

    return { startLine: startOfConfigBlock, endLine: endOfConfigBlock };
};

export function isNotUndefined(value: unknown): any {
    if (typeof value === undefined) { throw new Error("Not a string"); }
}

function getFullTableIdFromDjDryRunJson(dryRunJson: any): string {
    let fileName = dryRunJson.FileName;
    let schema = dryRunJson.Schema;
    let database = dryRunJson.Database;
    let fullTableId = `${database}.${schema}.${fileName}`;
    return fullTableId;
}


export async function writeCompiledSqlToFile(compiledQuery: string, filePath: string) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf8');
    }

    // Write the compiled output to the file
    fs.writeFileSync(filePath, compiledQuery, 'utf8');

    // Open the output file in a vertical split
    const outputDocument = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(outputDocument, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true });
}

export async function getStdoutFromCliRun(exec: any, cmd: string): Promise<any> {
    // const workingDirectory = path.dirname(vscode.window.activeTextEditor?.document.uri.fsPath);
    let workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    if (!workspaceFolder) {
        return;
    }

    return new Promise((resolve, reject) => {

        exec(cmd, { cwd: workspaceFolder }, (err: any, stdout: any, stderr: any) => {
            if (stderr) {
                reject(new Error(stderr));
                return;
            }

            try {
                const output = stdout.toString();
                resolve(output);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
}


export function runCurrentFile(exec: any, includDependencies: boolean, includeDownstreamDependents: boolean) {
    let document = vscode.window.activeTextEditor?.document;
    if (document === undefined) {
        vscode.window.showErrorMessage('No active document');
        return;
    }
    var filename = getFileNameFromDocument(document);
    let workspaceFolder = getWorkspaceFolder();

    const getDryRunCmd = getDryRunCommand(workspaceFolder, filename);

    getStdoutFromCliRun(exec, getDryRunCmd).then((dryRunString) => {

        let allActions = dryRunString.split('\n');
        let actionsList: string[] = [];
        let dataformActionCmd = "";


        // get a list of tables & assertions that will be ran
        for (let i = 0; i < allActions.length - 1; i++) {
            let dryRunJson = JSON.parse(allActions[i]);
            let projectId = dryRunJson.Database;
            let dataset = dryRunJson.Schema;
            let table = dryRunJson.FileName;
            let fullTableName = `${projectId}.${dataset}.${table}`;
            actionsList.push(fullTableName);
        }

        // create the dataform run command for the list of actions from actionsList
        for (let i = 0; i < actionsList.length; i++) {
            let fullTableName = actionsList[i];
            if (i === 0) {
                if (includDependencies) {
                    dataformActionCmd = (`dataform run ${workspaceFolder} --actions "${fullTableName}" --include-deps`);
                } else if (includeDownstreamDependents) {
                    dataformActionCmd = (`dataform run ${workspaceFolder} --actions "${fullTableName}" --include-dependents`);
                }
                else {
                    dataformActionCmd = `dataform run ${workspaceFolder} --actions "${fullTableName}"`;
                }
            } else {
                if (includDependencies) {
                    dataformActionCmd += ` --actions "${fullTableName}"`;
                } else {
                    dataformActionCmd += ` --actions "${fullTableName}"`;
                }
            }
        }

        runCommandInTerminal(dataformActionCmd);
    })
        .catch((err) => {
            ;
            vscode.window.showErrorMessage(`Error running file: ${err}`);
            return;
        });

};

async function getDataformTags(compiledJson: DataformCompiledJson) {
    let dataformTags: string[] = [];
    let tables = compiledJson?.tables;
    if (tables) {
        tables.forEach((table) => {
            table?.tags?.forEach((tag) => {
                if (dataformTags.includes(tag) === false) {
                    dataformTags.push(tag);
                }
            });
        });
    };
    let assertions = compiledJson?.assertions;
    if (assertions) {
        assertions.forEach((assertion) => {
            assertion?.tags?.forEach((tag) => {
                if (dataformTags.includes(tag) === false) {
                    dataformTags.push(tag);
                }
            });
        });
    }
    return dataformTags;
}


async function getQueryForCurrentFile(fileName: string, compiledJson: DataformCompiledJson): Promise<Table> {
    let tables = compiledJson.tables;
    for (let i = 0; i < tables.length; i++) {
        let table = tables[i];
        let tableFileName = path.basename(table.fileName).split('.')[0];
        if (fileName === tableFileName) {
            let query = table.query;
            return { tags: table.tags, fileName: fileName, query: query, target: table.target };
        }
    }
    return { tags: [], fileName: "", query: "", target: { database: "", schema: "", name: "" } };
};


function compileDataform(workspaceFolder: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const command = process.platform !== "win32" ? "dataform" : "dataform.cmd";
        const spawnedProcess = spawn(command, ["compile", workspaceFolder, "--json"]);

        let output = '';
        let errorOutput = '';

        spawnedProcess.stdout.on('data', (data: string) => {
            output += data.toString();
        });

        spawnedProcess.stderr.on('data', (data: string) => {
            errorOutput += data.toString();
        });

        spawnedProcess.on('close', (code: number) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
            }
        });

        spawnedProcess.on('error', (err: Error) => {
            reject(err);
        });
    });
}

// Usage
async function runCompilation() {
    try {
        let workspaceFolder = getWorkspaceFolder();
        let compileResult = await compileDataform(workspaceFolder);
        const dataformCompiledJson: DataformCompiledJson = JSON.parse(compileResult);
        return dataformCompiledJson;
    } catch (error) {
        vscode.window.showErrorMessage(`Error compiling Dataform: ${error}`);
    }
}

async function getDependenciesAutoCompletionItems(compiledJson: DataformCompiledJson) {
    let targets  = compiledJson.targets;
    let declarations  = compiledJson.declarations;
    let dependencies: string[] = [];
    for (let i = 0; i < targets.length; i++){
        let targetName = targets[i].name;
       if (dependencies.includes(targetName) === false) {
            dependencies.push(targetName);
       }
    }

    for (let i = 0; i < declarations.length; i++){
        let targetName = declarations[i].target.name;
       if (dependencies.includes(targetName) === false) {
            dependencies.push(targetName);
       }
    }
    return dependencies;
}


export async function compiledQueryWtDryRun(exec: any, document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection, queryStringOffset: number, compiledSqlFilePath: string, showCompiledQueryInVerticalSplitOnSave: boolean | undefined) {
    diagnosticCollection.clear();

    var filename = getFileNameFromDocument(document);
    if (filename === "") { return; }

    let workspaceFolder = getWorkspaceFolder();
    if (workspaceFolder === "") { return; }

    let configBlockRange = getLineNumberWhereConfigBlockTerminates();
    let configBlockStart = configBlockRange.startLine || 0;
    let configBlockEnd = configBlockRange.endLine || 0;
    let configBlockOffset = (configBlockEnd - configBlockStart) + 1;
    let configLineOffset = configBlockOffset - queryStringOffset;


    let dataformCompiledJson = await runCompilation();
    if (dataformCompiledJson) {
        // TODO: Call them asyc and do wait for all promises to settle
        let declarationsAndTargets = await getDependenciesAutoCompletionItems(dataformCompiledJson);
        let dataformTags = await getDataformTags(dataformCompiledJson);
        let tableMetadata = await getQueryForCurrentFile(filename, dataformCompiledJson);

        if (tableMetadata.query === "") {
            vscode.window.showErrorMessage(`Query for ${filename} not found in compiled json`);
            return;
        }

        if (showCompiledQueryInVerticalSplitOnSave !== true) {
            showCompiledQueryInVerticalSplitOnSave = vscode.workspace.getConfiguration('vscode-dataform-tools').get('showCompiledQueryInVerticalSplitOnSave');
        }
        if (showCompiledQueryInVerticalSplitOnSave) {
            writeCompiledSqlToFile(tableMetadata.query, compiledSqlFilePath);
        }

        let dryRunResult = await queryDryRun(tableMetadata.query);
        if (dryRunResult.error.hasError) {
            setDiagnostics(document, dryRunResult.error, compiledSqlFilePath, diagnosticCollection, configLineOffset);
            return;
        }
        let targetTableId = tableMetadata.target.database + '.' + tableMetadata.target.schema + '.' + tableMetadata.target.name;
        vscode.window.showInformationMessage(`GB: ${dryRunResult.statistics.totalBytesProcessed} - ${targetTableId}`);
        return [dataformTags, declarationsAndTargets];
    } else {
        vscode.window.showInformationMessage(`Could not compile Dataform ??`);
        return;
    }
}
