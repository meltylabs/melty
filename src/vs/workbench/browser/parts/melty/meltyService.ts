import { registerSingleton, InstantiationType } from 'vs/platform/instantiation/common/extensions';
import { IDisposable } from 'vs/base/common/lifecycle';
import { MeltyPart } from './meltyPart';
import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';

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

export class MeltyService implements IMeltyService {

	declare readonly _serviceBrand: undefined;

	private readonly _meltyPart: MeltyPart;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService
	) {
		this._meltyPart = this.instantiationService.createInstance(MeltyPart);
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

	dispose(): void {
		this._meltyPart.dispose();
	}
}

registerSingleton(IMeltyService, MeltyService, InstantiationType.Eager);
