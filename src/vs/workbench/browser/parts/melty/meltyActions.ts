import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IMeltyService } from './meltyService';
import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';

export class CloseMeltyAction extends Action2 {
	static readonly ID = 'workbench.action.closeMelty';

	constructor() {
		super({
			id: CloseMeltyAction.ID,
			title: { value: 'Close Melty Popup', original: 'Close Melty Popup' },
			f1: true,
			keybinding: {
				weight: 200,
				primary: KeyCode.Escape,
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		const meltyService = accessor.get(IMeltyService);
		meltyService.close();
	}
}

export class ToggleMeltyAction extends Action2 {
	static readonly ID = 'workbench.action.toggleMelty';

	constructor() {
		super({
			id: ToggleMeltyAction.ID,
			title: { value: 'Toggle Melty Popup', original: 'Toggle Melty Popup' },
			f1: true,
			keybinding: {
				weight: 250,
				primary: KeyMod.CtrlCmd | KeyCode.KeyM,
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		const meltyService = accessor.get(IMeltyService);
		meltyService.toggle();
	}
}

registerAction2(ToggleMeltyAction);
registerAction2(CloseMeltyAction);
