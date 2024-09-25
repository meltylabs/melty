import { ChangeSet } from "../types";
import fs from "fs";
import path from "path";
import * as files from "./meltyFiles";
import { ContextProvider } from 'services/ContextProvider';

export function createEmpty(): ChangeSet {
	return {
		filesChanged: {},
	};
}

export function isEmpty(changeSet: ChangeSet) {
	return Object.keys(changeSet.filesChanged).length === 0;
}

/**
 * Applies a change set to disk. No git stuff.
 * @param changeSet The change set to apply
 * @param gitRepo The git repo to apply the change set to
 */
export function applyChangeSet(changeSet: ChangeSet): void {
	const meltyRootAbsolute = ContextProvider.getInstance().meltyRootAbsolute;

	Object.entries(changeSet.filesChanged).forEach(
		([_path, { original, updated }]) => {
			fs.mkdirSync(path.dirname(files.absolutePath(updated, meltyRootAbsolute)), {
				recursive: true,
			});
			fs.writeFileSync(
				files.absolutePath(updated, meltyRootAbsolute),
				files.contents(updated)
			);
		}
	);
}

