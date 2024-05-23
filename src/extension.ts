// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
var path = require("path");

//TODO:
/*
1. Automatically execute on save / other event ?
3. Current file should have `.sqlx` extension
*/

import { executableIsAvailable, getLineNumberWhereConfigBlockTerminates } from './utils';
// import {isNotUndefined} from './utils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let executablesToCheck = ['dataform', 'dj'];
	for (let i = 0; i < executablesToCheck.length; i++) {
		if (executableIsAvailable(executablesToCheck[i]) !== true) {
			vscode.window.showErrorMessage(`${executablesToCheck[i]} does not exsits`);
			return;
		}
	}

	let queryStringOffset = 3;
	let diagnosticCollection = vscode.languages.createDiagnosticCollection('myDiagnostics');
	context.subscriptions.push(diagnosticCollection);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "vs-extension" is now active!');


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('dataform-lsp-vscode.dataformDryRunFile', () => {
		// The code you place here will be executed every time your command is executed
		diagnosticCollection.clear();

		var filename = vscode.window.activeTextEditor?.document.uri.fsPath;

		let basenameSplit = path.basename(filename).split('.');
		let extension = basenameSplit[1];
		if (extension !== 'sqlx') {
			return;
		}
		filename = basenameSplit[0];

		let workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		console.log(filename);
		console.log(workspaceFolder);


		const { spawn } = require('child_process');
		let errorRunningCli = false;
		let configBlockRange = getLineNumberWhereConfigBlockTerminates();

		let configBlockStart = configBlockRange[0] || 0;
		let configBlockEnd = configBlockRange[1] || 0;

		let configBlockOffset = (configBlockStart + configBlockEnd ) - 1;
		console.log(`configBlockStart: ${configBlockStart} | configBlockEnd: ${configBlockEnd}`);

		let configLineOffset = configBlockOffset - queryStringOffset;

		const cmd = `dataform compile ${workspaceFolder} --json \
		| dj table-ops cost --include-assertions=true -t ${filename}`;

		const process = spawn(cmd, [], { shell: true });

		const editor = vscode.window.activeTextEditor;
		const document = editor?.document;
		const diagnostics: vscode.Diagnostic[] = [];

		process.stderr.on('data', (data: any) => {
			// console.log(`stderr: ${data}`);
			vscode.window.showErrorMessage(`Error running cli: ${data}`);
			errorRunningCli = true;
			return;
		});

		process.stdout.on('data', (data: any) => {
			if (errorRunningCli) {return;}

			let jsonData = JSON.parse(data.toString());

			// console.log(jsonData);

			let isError = jsonData.Error?.IsError;
			console.log(jsonData.Error);
			console.log(isError);

			if (isError === false) {
				let GBProcessed = jsonData.GBProcessed;
				let fileName = jsonData.FileName;
				vscode.window.showInformationMessage(`GB ${GBProcessed}: File: ${fileName}`);
			}

			let errLineNumber = jsonData.Error?.LineNumber + configLineOffset;
			let errColumnNumber = jsonData.Error?.ColumnNumber;


			const range = new vscode.Range(new vscode.Position(errLineNumber, errColumnNumber), new vscode.Position(errLineNumber, errColumnNumber + 5));
			const message = jsonData.Error?.ErrorMsg;
			const severity = vscode.DiagnosticSeverity.Error;
			const diagnostic = new vscode.Diagnostic(range, message, severity);
			if (diagnostics.length === 0) {
				diagnostics.push(diagnostic);
				if (document !== undefined) {
					diagnosticCollection.set(document.uri, diagnostics);
				}
			}
		});


		// vscode.window.showInformationMessage(`GB processed ${GBProcessed}`);


	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }

