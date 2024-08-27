import { Part } from 'vs/workbench/browser/part';
import { IWorkbenchLayoutService, Parts } from 'vs/workbench/services/layout/browser/layoutService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { $, getActiveWindow } from 'vs/base/browser/dom';

// import type { Webview } from 'vscode';
import { IWebviewViewService, WebviewView } from 'vs/workbench/contrib/webviewView/browser/webviewViewService';
import { CancellationTokenSource } from 'vs/base/common/cancellation';

import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WebviewService } from 'vs/workbench/contrib/webview/browser/webviewService';
// import { URI } from 'vs/base/common/uri';

// import { Registry } from 'vs/platform/registry/common/platform';
// import { IViewContainersRegistry, Extensions } from 'vs/workbench/common/views';


export class MeltyPart extends Part {
	static readonly ID = 'workbench.parts.melty';

	//#region IView

	readonly minimumWidth: number = 300;
	readonly maximumWidth: number = 800;
	readonly minimumHeight: number = 200;
	readonly maximumHeight: number = 600;

	//#endregion

	private content: HTMLElement | undefined;
	private webviewView: WebviewView | undefined;
	private _webviewService: WebviewService | undefined;

	constructor(
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IWebviewViewService private readonly _webviewViewService: IWebviewViewService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super(MeltyPart.ID, { hasTitle: false }, themeService, storageService, layoutService);

		this._webviewService = this._instantiationService.createInstance(WebviewService);

		this.initialize();
	}

	private async initialize() {
		// 0. create an IOverlayWebview
		const webview = this._webviewService!.createWebviewOverlay({
			title: 'Melty',
			options: {
				enableFindWidget: false,
			},
			contentOptions: {
				allowScripts: true,
				localResourceRoots: [
					// Uri.joinPath(this._meltyUri, 'out'),
					// URI.joinPath(meltyUri, 'webview-ui/build'),
				],
			},
			extension: undefined,
		});

		webview.claim(this, getActiveWindow(), undefined);

		// 1. initialize this.webviewView by creating a WebviewView
		this.webviewView = {
			webview,
			onDidChangeVisibility: () => { return { dispose: () => { } }; },
			onDispose: () => { return { dispose: () => { } }; },

			get title(): string | undefined { return undefined; },
			set title(value: string | undefined) { },

			get description(): string | undefined { return undefined; },
			set description(value: string | undefined) { },

			get badge() { return undefined; },
			set badge(badge) { },

			dispose: () => {
				// Only reset and clear the webview itself. Don't dispose of the view container
				// this._activated = false;
				// this._webview.clear();
				// // this._webviewDisposables.clear();
			},

			show: (preserveFocus) => {
				// this.viewService.openView(this.id, !preserveFocus);
			}
		};

		// 2. in createContentArea, we call webviewView.webview.layoutWebviewOverElement(meltyMagicWebview);

		// 3. ask the webviewViewService to connect our webviewView to the webviewViewProvider, i.e., HelloWorldPanel
		const source = new CancellationTokenSource(); // todo add to disposables
		console.log("resolving webview 0")
		await this._webviewViewService.resolve('melty.magicWebview', this.webviewView!, source.token);
		// now re-render the webview view?
		if (this.content) {
			this.webviewView?.webview.layoutWebviewOverElement(this.content!);
		}
	}

	// public registerWebview(webview: IOverlayWebview) {
	// 	this.webview = webview;
	// }

	protected override createContentArea(parent: HTMLElement): HTMLElement {
		this.element = parent;
		this.content = $('div.melty-content');
		parent.appendChild(this.content);

		// Add visible content and styling
		this.content.style.margin = '40px';
		this.content.style.borderRadius = '40px';
		this.content.style.backgroundColor = 'white'; // Semi-transparent blue
		this.content.style.color = '#333';
		this.content.style.fontSize = '24px';
		this.content.style.display = 'flex';
		this.content.style.justifyContent = 'center';
		this.content.style.alignItems = 'center';
		this.content.style.position = 'absolute';
		this.content.style.top = '0';
		this.content.style.left = '0';
		this.content.style.right = '0';
		this.content.style.bottom = '0';

		this.content.textContent = 'Melty Fullscreen Popup';

		// const meltyMagicWebview = $('div.melty-magic-webview');
		// this.content.appendChild(meltyMagicWebview);

		return this.content;
	}

	// 3. get the webview provider from the melty extension
	// this will have to be done by reading ExtHostWebviewViews

	// 4. resolve the WebviewView using
	// await provider.resolveWebviewView(webview, { state }, cancellation);


	// const webviewHtml = this._extHostWebview.getWebviewHtml('melty.magicWebview');
	// this.createWebview(meltyMagicWebview);

	// const source = new CancellationTokenSource(); // todo save this somewhere
	// ExtHostWebviewViews.resolve('melty.magicWebview', this.webview!, source);

	// await this._proxy.$resolveWebviewView(handle, viewType, webviewView.title, state, cancellation);

	// this.content.innerHTML = this.meltyMagicWebview!.html;

	// const viewContainersRegistry = Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry);

	// viewContainersRegistry.registerViewContainer

	// const helloWorldPanel = new HelloWorldPanel(meltyUri);
	// helloWorldPanel.resolveWebview(this.webview);







	// private createWebview(parent: HTMLElement) {
	// 	const meltyUri = URI.file('/Users/jdecampos/Development/code/extensions/spectacular/');

	// 	this.webview = this._webviewService.createWebviewElement({
	// 		title: 'Melty Webview',
	// 		options: {
	// 			enableFindWidget: false,
	// 			retainContextWhenHidden: true,
	// 		},
	// 		contentOptions: {
	// 			allowScripts: true,
	// 			localResourceRoots: [
	// 				// Uri.joinPath(this._meltyUri, 'out'),
	// 				URI.joinPath(meltyUri, 'webview-ui/build'),
	// 			],
	// 		},
	// 		extension: undefined,
	// 	});

	// 	this.webview.mountTo(parent, getActiveWindow());
	// }

	override layout(width: number, height: number, top: number, left: number): void {
		super.layout(width, height, top, left);

		if (this.content) {
			this.content.style.width = `${width}px`;
			this.content.style.height = `${height}px`;
		}
	}

	focus(): void {
		if (this.content) {
			this.content.focus();
		}
	}

	show(): void {
		if (this.content) {
			this.content.style.display = 'block';
		}
	}

	hide(): void {
		if (this.content) {
			this.content.style.display = 'none';
		}
	}

	toggle(): void {
		if (this.content) {
			this.content.style.display = this.content.style.display === 'flex' ? 'none' : 'flex';
		}
	}

	toJSON(): object {
		return {
			type: Parts.MELTY_PART
		};
	}
}

