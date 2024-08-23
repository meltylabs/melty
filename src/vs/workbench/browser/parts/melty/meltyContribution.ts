// import { Registry } from 'vs/platform/registry/common/platform';
// import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from 'vs/workbench/common/contributions';
// import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
// import { MeltyPart } from './meltyPart';
// import { IWorkbenchLayoutService, Parts } from 'vs/workbench/services/layout/browser/layoutService';
// import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

// class MeltyContribution implements IWorkbenchContribution {
// 	constructor(
// 		@IInstantiationService private readonly instantiationService: IInstantiationService,
// 		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
// 	) {
// 		this.registerMeltyPart();
// 	}

// 	private registerMeltyPart(): void {
// 		const meltyPart = this.instantiationService.createInstance(MeltyPart);
// 		this.layoutService.registerPart(meltyPart);

// 		// Position the MeltyPart in the layout
// 		this.layoutService.addPart(meltyPart, Parts.MELTY_PART, 'center');
// 	}
// }

// // Register the contribution
// Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
// 	.registerWorkbenchContribution(MeltyContribution, LifecyclePhase.Starting);
