import { MeltyContext } from '../types';
import * as path from 'path';

/**
 * Wrapper to provide a MeltyContext to other services
 * MeltyContext should come from ContextInitializer
 */
export class ContextProvider {
	private static instance: ContextProvider | null = null;

	constructor(
		readonly meltyContext: MeltyContext
	) {
		this.meltyContext = meltyContext;
	}

	public static initialize(meltyContext: MeltyContext): void {
		this.instance = new ContextProvider(meltyContext);
	}

	public static getInstance(): ContextProvider {
		if (!ContextProvider.instance) {
			throw new Error('ContextProvider has not been initialized');
		}
		return ContextProvider.instance;
	}

	get meltyRootRelative(): string {
		return this.meltyContext.meltyRoot;
	}

	get meltyRootAbsolute(): string {
		return path.join(this.meltyContext.workspaceRoot, this.meltyContext.meltyRoot);
	}

	get workspaceRoot(): string {
		return this.meltyContext.workspaceRoot;
	}

	get gitRepo(): any {
		return this.meltyContext.gitRepo;
	}
}
