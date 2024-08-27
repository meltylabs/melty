import { registerSingleton, InstantiationType } from 'vs/platform/instantiation/common/extensions';
import { Disposable, IDisposable } from 'vs/base/common/lifecycle';
import { MeltyPart } from './meltyPart';
import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITerminalService } from 'vs/workbench/contrib/terminal/browser/terminal';

export const IMeltyService = createDecorator<IMeltyService>('meltyService');

export interface IMeltyService extends IDisposable {
	readonly _serviceBrand: undefined;

	/**
	 * Returns the MeltyPart instance.
	 */
	readonly meltyPart: MeltyPart;

	/**
	 * Shows the Melty popup.
	 */
	show(): void;

	/**
	 * Hides the Melty popup.
	 */
	hide(): void;

	/**
	 * Toggles the visibility of the Melty popup.
	 */
	toggle(): void;
}

export class MeltyService extends Disposable implements IMeltyService {

	declare readonly _serviceBrand: undefined;

	private readonly _meltyPart: MeltyPart;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEditorService private readonly _editorService: IEditorService,
		@ITerminalService private readonly _terminalService: ITerminalService,
	) {
		super();
		this._meltyPart = this.instantiationService.createInstance(MeltyPart);
		this.registerListeners();
	}


	private registerListeners(): void {
		this._register(this._editorService.onDidActiveEditorChange(() => {
			this.hide();
		}));

		this._register(this._terminalService.onDidFocusInstance(() => {
			this.hide();
		}));
	}

	get meltyPart(): MeltyPart {
		return this._meltyPart;
	}

	show(): void {
		this._meltyPart.show();
	}

	hide(): void {
		this._meltyPart.hide();
	}

	toggle(): void {
		this._meltyPart.toggle();
	}

	override dispose(): void {
		super.dispose();
		this._meltyPart.dispose();
	}
}

registerSingleton(IMeltyService, MeltyService, InstantiationType.Eager);
