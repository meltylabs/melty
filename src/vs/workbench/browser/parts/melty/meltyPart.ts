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

	private state: 'loading' | 'open' | 'closed' = 'loading';

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
		// 1. create an IOverlayWebview
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

		// 2. initialize this.webviewView by creating a WebviewView
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

		// 3. ask the webviewViewService to connect our webviewView to the webviewViewProvider, i.e., HelloWorldPanel
		const source = new CancellationTokenSource(); // todo add to disposables
		await this._webviewViewService.resolve('melty.magicWebview', this.webviewView!, source.token);

		// if both content and webview are ready, end loading state and open
		if (this.content && this.webviewView) {
			this.webviewView?.webview.layoutWebviewOverElement(this.content);
			this.open();
		} else {
			// hide stuff while we load
			this.webviewView!.webview.container.style.display = 'none';
		}
	}

	protected override createContentArea(parent: HTMLElement): HTMLElement {
		this.content = $('div.melty-popup-container');
		this.content.style.margin = '50px';
		// this.content.style.boxShadow = '0 0 20px 0 rgba(0, 0, 0, 0.5)';
		// this.content.style.borderRadius = '40px';
		// this.content.style.backgroundColor = 'white';
		// this.content.style.color = '#333';
		// this.content.style.fontSize = '24px';
		// this.content.style.display = 'flex';
		// this.content.style.justifyContent = 'center';
		// this.content.style.alignItems = 'center';
		this.content.style.zIndex = '-10';
		this.content.style.position = 'absolute';
		this.content.style.top = '0';
		this.content.style.left = '0';
		this.content.style.right = '0';
		this.content.style.bottom = '0';

		this.element = parent;
		parent.appendChild(this.content!);

		// if both content and webview are ready, end loading state and open
		if (this.content && this.webviewView) {
			this.webviewView?.webview.layoutWebviewOverElement(this.content);
			this.open();
		} else {
			// hide stuff while we load
			this.content!.style.display = 'none';
		}

		return this.content!;
	}

	override layout(width: number, height: number, top: number, left: number): void {
		super.layout(width, height, top, left);

		if (this.state !== 'loading') {
			this.content!.style.width = `${width}px`;
			this.content!.style.height = `${height}px`;
			this.webviewView!.webview.layoutWebviewOverElement(this.content!);
		}
	}

	private open() {
		this.state = 'open';
		this.content!.style.display = 'flex';
		this.webviewView!.webview.container.style.display = 'flex';
		this.webviewView!.webview.container.style.boxSizing = 'border-box';
		this.webviewView!.webview.container.style.boxShadow = '0 0 20px 0 rgba(0, 0, 0, 0.5)';
		this.webviewView!.webview.container.style.borderRadius = '30px';
		this.webviewView!.webview.container.style.padding = '20px';
		this.webviewView!.webview.container.style.backgroundColor = 'white';
		this.webviewView!.webview.container.style.zIndex = '100';
	}

	private close() {
		this.state = 'closed';
		this.content!.style.display = 'none';
		this.webviewView!.webview.container.style.display = 'none';
	}

	private toggleOpenClose() {
		this.state === 'open' ? this.close() : this.open();
	}

	focus(): void {
		if (this.webviewView) {
			this.webviewView.webview.focus();
		}
	}

	show(): void {
		if (this.state === 'loading') {
			console.warn('Can\'t open Melty while loading');
			return;
		}

		this.open();
	}

	hide(): void {
		if (this.state === 'loading') {
			console.warn('Can\'t close Melty while loading');
			return;
		}
		this.close();
	}

	toggle(): void {
		if (this.state === 'loading') {
			console.warn('Can\'t toggle Melty while loading');
			return;
		}
		this.toggleOpenClose();
	}

	toJSON(): object {
		return {
			type: Parts.MELTY_PART
		};
	}
}

