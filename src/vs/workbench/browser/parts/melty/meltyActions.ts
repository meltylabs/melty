import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IMeltyService } from './meltyService';

export class ToggleMeltyAction extends Action2 {
	static readonly ID = 'workbench.action.toggleMelty';

	constructor() {
		super({
			id: ToggleMeltyAction.ID,
			title: { value: 'Toggle Melty Popup', original: 'Toggle Melty Popup' },
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		const meltyService = accessor.get(IMeltyService);
		meltyService.toggle();
	}
}

registerAction2(ToggleMeltyAction);
