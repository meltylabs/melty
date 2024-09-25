import * as fs from "fs";
import * as path from "path";
import { ContextProvider } from "services/ContextProvider";

export class RepoMapMeltycat {
	constructor(
		private readonly _contextProvider: ContextProvider = ContextProvider.getInstance()
	) { }

	public async getRepoMap(_: string[]): Promise<string> {
		return fs.readFileSync(path.join(this._contextProvider.meltyRootAbsolute, '.meltycat'), 'utf-8');
	}
}
