import { Part } from 'vs/workbench/browser/part';
import { IWorkbenchLayoutService, Parts } from 'vs/workbench/services/layout/browser/layoutService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { $ } from 'vs/base/browser/dom';
import { AbstractPaneCompositePart } from 'vs/workbench/browser/parts/paneCompositePart';

import 'vs/css!./media/sidebarpart';
import 'vs/workbench/browser/parts/sidebar/sidebarActions';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IHoverService } from 'vs/platform/hover/browser/hover';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IMenuService } from 'vs/platform/actions/common/actions';

export class MeltyPart extends AbstractPaneCompositePart {
	static readonly ID = 'workbench.parts.melty';

	//#region IView

	readonly minimumWidth: number = 300;
	readonly maximumWidth: number = 800;
	readonly minimumHeight: number = 200;
	readonly maximumHeight: number = 600;

	//#endregion

	private content: HTMLElement | undefined;

	constructor(
		@INotificationService notificationService: INotificationService,
		@IStorageService storageService: IStorageService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IHoverService hoverService: IHoverService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IExtensionService extensionService: IExtensionService,
		@ICommandService private commandService: ICommandService,
		@IMenuService menuService: IMenuService,
	) {
		super(
			Parts.MELTY_PART,
			{ hasTitle: true },
			MeltyPart.activePanelSettingsKey, // TODO
			ActivePanelContext.bindTo(contextKeyService), // TODO
			PanelFocusContext.bindTo(contextKeyService), // TODO
			'meltypopup',
			'meltypopup',
			undefined,
			notificationService,
			storageService,
			contextMenuService,
			layoutService,
			keybindingService,
			hoverService,
			instantiationService,
			themeService,
			viewDescriptorService,
			contextKeyService,
			extensionService,
			menuService,
		);
	}


	// constructor(
	// 	// @IInstantiationService private readonly instantiationService: IInstantiationService,
	// 	@IThemeService themeService: IThemeService,
	// 	@IStorageService storageService: IStorageService,
	// 	@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService
	// ) {
	// 	super(MeltyPart.ID, { hasTitle: false }, themeService, storageService, layoutService);
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

		return this.content;
	}


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

