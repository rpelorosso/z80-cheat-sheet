// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

const InstructionDataIndices = {
    INSTRUCTION: 0,
    TIMING_Z80: 1,
    TIMING_Z80P_M1: 2,
    TIMING_R800: 3,
    TIMING_R800P_WAIT: 4,
    OPCODE: 5,
    SIZE: 6
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// read instructions file
	const extensionPath = vscode.Uri.joinPath(context.extensionUri, 'src/assets', 'instructions.json');
	const filePath = path.join(extensionPath.fsPath); // Convert to file system path
	const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

	const provider = new Z80CheatSheetProvider(context.extensionUri);
	provider.instructions = jsonContent;

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(Z80CheatSheetProvider.viewType, provider));

	const disposable = vscode.window.onDidChangeTextEditorSelection((event) => {
		const editor = event.textEditor;
		const selection = event.selections[0];

		if (selection) {
			const lineNumber = selection.start.line; // Line number where the cursor is located (0-based index)

			if (editor) {
				const document = editor.document;
				const lineContent = document.lineAt(lineNumber).text; // Get the text of the current line

				// Optionally, you can display the line content in the status bar
				//vscode.window.setStatusBarMessage(`Current Line: ${lineContent}`, 2000); // Message disappears after 2 seconds

				provider.processLine(lineContent);
			}
		}
	});

	context.subscriptions.push(disposable);


}

// This method is called when your extension is deactivated
export function deactivate() { }

class Z80CheatSheetProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'z80-cheat-sheet.webView';
	public instructions: Object = {};

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = "";

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	public processLine(line: string) {

		if (this._view) {
			const content = this._getHtmlForWebview(line);
			if (content) {
				this._view.webview.html = content;
			}
		}
	}

	private _getHtmlForWebview(line: string) {

		// get OP from line
		const parts = line.trim().toUpperCase().split(' ');

		// no op, return
		if (parts.length === 0) {
			return undefined;
		}

		// get instruction information
		const op = parts[0];

		// no op in this list
		if (!Object.keys(this.instructions).includes(op)) {
			return undefined;
		}

		const insData = (this.instructions as any)[op as string];

		const versions = insData.instructions.map((ins: any) => {
			return `<pre>${ins[InstructionDataIndices.INSTRUCTION]}</pre>`;
		});

        const style = `<style>pre{margin:0px}</style>`;

		return `${style}<b>${op}</br></b>${insData.usage}</br></br>` + versions.join('') + `</br>${insData.usage_extended || ''}`;
	}
}
