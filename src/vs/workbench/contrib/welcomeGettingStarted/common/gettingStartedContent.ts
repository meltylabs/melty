/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import themePickerContent from 'vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker';
import notebookProfileContent from 'vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile';
import { localize } from 'vs/nls';
import { Codicon } from 'vs/base/common/codicons';
import { ThemeIcon } from 'vs/base/common/themables';
import { registerIcon } from 'vs/platform/theme/common/iconRegistry';
import { NotebookSetting } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { URI } from 'vs/base/common/uri';

interface IGettingStartedContentProvider {
	(): string;
}

class GettingStartedContentProviderRegistry {

	private readonly providers = new Map<string, IGettingStartedContentProvider>();

	registerProvider(moduleId: string, provider: IGettingStartedContentProvider): void {
		this.providers.set(moduleId, provider);
	}

	getProvider(moduleId: string): IGettingStartedContentProvider | undefined {
		return this.providers.get(moduleId);
	}
}
export const gettingStartedContentRegistry = new GettingStartedContentProviderRegistry();

export async function moduleToContent(resource: URI): Promise<string> {
	if (!resource.query) {
		throw new Error('Getting Started: invalid resource');
	}

	const query = JSON.parse(resource.query);
	if (!query.moduleId) {
		throw new Error('Getting Started: invalid resource');
	}

	const provider = gettingStartedContentRegistry.getProvider(query.moduleId);
	if (!provider) {
		throw new Error(`Getting Started: no provider registered for ${query.moduleId}`);
	}

	return provider();
}

gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker', themePickerContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile', notebookProfileContent);

const setupIcon = registerIcon('getting-started-setup', Codicon.zap, localize('getting-started-setup-icon', "Icon used for the setup category of welcome page"));

export type BuiltinGettingStartedStep = {
	id: string;
	title: string;
	description: string;
	completionEvents?: string[];
	when?: string;
	media:
	| { type: 'image'; path: string | { hc: string; hcLight?: string; light: string; dark: string }; altText: string }
	| { type: 'svg'; path: string; altText: string }
	| { type: 'markdown'; path: string };
};

export type BuiltinGettingStartedCategory = {
	id: string;
	title: string;
	description: string;
	isFeatured: boolean;
	next?: string;
	icon: ThemeIcon;
	when?: string;
	content:
	| { type: 'steps'; steps: BuiltinGettingStartedStep[] };
};

export type BuiltinGettingStartedStartEntry = {
	id: string;
	title: string;
	description: string;
	icon: ThemeIcon;
	when?: string;
	content:
	| { type: 'startEntry'; command: string };
};

type GettingStartedWalkthroughContent = BuiltinGettingStartedCategory[];
type GettingStartedStartEntryContent = BuiltinGettingStartedStartEntry[];

export const startEntries: GettingStartedStartEntryContent = [
	{
		id: 'welcome.showNewFileEntries',
		title: localize('gettingStarted.newFile.title', "New File..."),
		description: localize('gettingStarted.newFile.description', "Open a new untitled text file, notebook, or custom editor."),
		icon: Codicon.newFile,
		content: {
			type: 'startEntry',
			command: 'command:welcome.showNewFileEntries',
		}
	},
	{
		id: 'topLevelOpenMac',
		title: localize('gettingStarted.openMac.title', "Open..."),
		description: localize('gettingStarted.openMac.description', "Open a file or folder to start working"),
		icon: Codicon.folderOpened,
		when: '!isWeb && isMac',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFileFolder',
		}
	},
	{
		id: 'topLevelOpenFile',
		title: localize('gettingStarted.openFile.title', "Open File..."),
		description: localize('gettingStarted.openFile.description', "Open a file to start working"),
		icon: Codicon.goToFile,
		when: 'isWeb || !isMac',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFile',
		}
	},
	{
		id: 'topLevelOpenFolder',
		title: localize('gettingStarted.openFolder.title', "Open Folder..."),
		description: localize('gettingStarted.openFolder.description', "Open a folder to start working"),
		icon: Codicon.folderOpened,
		when: '!isWeb && !isMac',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFolder',
		}
	},
	{
		id: 'topLevelOpenFolderWeb',
		title: localize('gettingStarted.openFolder.title', "Open Folder..."),
		description: localize('gettingStarted.openFolder.description', "Open a folder to start working"),
		icon: Codicon.folderOpened,
		when: '!openFolderWorkspaceSupport && workbenchState == \'workspace\'',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFolderViaWorkspace',
		}
	},
	{
		id: 'topLevelGitClone',
		title: localize('gettingStarted.topLevelGitClone.title', "Clone Git Repository..."),
		description: localize('gettingStarted.topLevelGitClone.description', "Clone a remote repository to a local folder"),
		when: 'config.git.enabled && !git.missing',
		icon: Codicon.sourceControl,
		content: {
			type: 'startEntry',
			command: 'command:git.clone',
		}
	},
	{
		id: 'topLevelGitOpen',
		title: localize('gettingStarted.topLevelGitOpen.title', "Open Repository..."),
		description: localize('gettingStarted.topLevelGitOpen.description', "Connect to a remote repository or pull request to browse, search, edit, and commit"),
		when: 'workspacePlatform == \'webworker\'',
		icon: Codicon.sourceControl,
		content: {
			type: 'startEntry',
			command: 'command:remoteHub.openRepository',
		}
	},
	{
		id: 'topLevelShowWalkthroughs',
		title: localize('gettingStarted.topLevelShowWalkthroughs.title', "Open a Walkthrough..."),
		description: localize('gettingStarted.topLevelShowWalkthroughs.description', "View a walkthrough on the editor or an extension"),
		icon: Codicon.checklist,
		when: 'allWalkthroughsHidden',
		content: {
			type: 'startEntry',
			command: 'command:welcome.showAllWalkthroughs',
		}
	},
	{
		id: 'topLevelRemoteOpen',
		title: localize('gettingStarted.topLevelRemoteOpen.title', "Connect to..."),
		description: localize('gettingStarted.topLevelRemoteOpen.description', "Connect to remote development workspaces."),
		when: '!isWeb',
		icon: Codicon.remote,
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.remote.showMenu',
		}
	},
	{
		id: 'topLevelOpenTunnel',
		title: localize('gettingStarted.topLevelOpenTunnel.title', "Open Tunnel..."),
		description: localize('gettingStarted.topLevelOpenTunnel.description', "Connect to a remote machine through a Tunnel"),
		when: 'isWeb && showRemoteStartEntryInWeb',
		icon: Codicon.remote,
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.remote.showWebStartEntryActions',
		}
	},
];

const Button = (title: string, href: string) => `[${title}](${href})`;

export const walkthroughs: GettingStartedWalkthroughContent = [
	{
		id: 'Setup',
		title: 'Start Melting',
		description: localize('gettingStarted.setup.description', "Customize Melty, learn the basics, and start melting."),
		isFeatured: true,
		icon: setupIcon,
		when: '!isWeb',
		next: 'Beginner',
		content: {
			type: 'steps',
			steps: [

				{
					id: 'extensionsWeb',
					title: localize('gettingStarted.extensions.title', "Code with extensions"),
					description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', "Browse Popular Web Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
					when: 'workspacePlatform == \'webworker\'',
					media: {
						type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
					},
				},
				{
					id: 'settings',
					title: 'Import your VS Code settings and keybindings into Melty',
					description: localize('gettingStarted.settings.description.interpolated', "Melty supports VS Code's settings and keyboard shortcuts. \n{0}", Button(localize('copySettings', "Copy Settings"), 'command:melty.copySettings')),
					media: {
						type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
					},
				},
				{
					id: 'settingsSync',
					title: 'Import your VS Code extensions to Melty',
					description: localize('gettingStarted.settingsSync.description.interpolated', "Import all your VS Code extensions to Melty.\n{0}", Button(localize('copyExtensions', "Copy Extensions"), 'command:melty.copyExtensions')),
					media: {
						type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
					},
				},
				{
					id: 'openTerminal',
					title: 'Open the integrated terminal',
					description: localize('gettingStarted.terminal.description.interpolated', "Quickly run shell commands and monitor build output, right next to your code.\n{0}", Button(localize('openTerminal', "Open Terminal"), 'command:workbench.action.terminal.toggleTerminal')),
					media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'terminal.svg' },
				},
				{
					id: 'openMeltyOverlay',
					title: 'Say hello to Melty',
					description: localize('gettingStarted.openMeltyOverlay.description.interpolated', "Open the Melty popup! \n{0}", Button(localize('openMelty', "Open Melty"), 'command:workbench.action.toggleMelty')),
					media: {
						type: 'image', altText: 'Melty logo', path: 'ice.png'
					},
				},
				{
					id: 'pickAFolderTask-Mac',
					title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
					description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFileFolder')),
					when: 'isMac && workspaceFolderCount == 0',
					media: {
						type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
					}
				},
				{
					id: 'pickAFolderTask-Other',
					title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
					description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFolder')),
					when: '!isMac && workspaceFolderCount == 0',
					media: {
						type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
					}
				},
				// {
				// 	id: 'videoTutorial',
				// 	title: localize('gettingStarted.videoTutorial.title', "Watch video tutorials"),
				// 	description: localize('gettingStarted.videoTutorial.description.interpolated', "Watch the first in a series of short & practical video tutorials for VS Code's key features.\n{0}", Button(localize('watch', "Watch Tutorial"), 'https://aka.ms/vscode-getting-started-video')),
				// 	media: { type: 'svg', altText: 'VS Code Settings', path: 'learn.svg' },
				// }
			]
		}
	},

	{
		id: 'SetupWeb',
		title: localize('gettingStarted.setupWeb.title', "Get Started with VS Code for the Web"),
		description: localize('gettingStarted.setupWeb.description', "Customize your editor, learn the basics, and start coding"),
		isFeatured: true,
		icon: setupIcon,
		when: 'isWeb',
		next: 'Beginner',
		content: {
			type: 'steps',
			steps: [
				{
					id: 'pickColorThemeWeb',
					title: localize('gettingStarted.pickColor.title', "Choose your theme"),
					description: localize('gettingStarted.pickColor.description.interpolated', "The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}", Button(localize('titleID', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
					completionEvents: [
						'onSettingChanged:workbench.colorTheme',
						'onCommand:workbench.action.selectTheme'
					],
					media: { type: 'markdown', path: 'theme_picker', }
				},
				{
					id: 'menuBarWeb',
					title: localize('gettingStarted.menuBar.title', "Just the right amount of UI"),
					description: localize('gettingStarted.menuBar.description.interpolated', "The full menu bar is available in the dropdown menu to make room for your code. Toggle its appearance for faster access. \n{0}", Button(localize('toggleMenuBar', "Toggle Menu Bar"), 'command:workbench.action.toggleMenuBar')),
					when: 'isWeb',
					media: {
						type: 'svg', altText: 'Comparing menu dropdown with the visible menu bar.', path: 'menuBar.svg'
					},
				},
				{
					id: 'extensionsWebWeb',
					title: localize('gettingStarted.extensions.title', "Code with extensions"),
					description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', "Browse Popular Web Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
					when: 'workspacePlatform == \'webworker\'',
					media: {
						type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
					},
				},
				{
					id: 'findLanguageExtensionsWeb',
					title: localize('gettingStarted.findLanguageExts.title', "Rich support for all your languages"),
					description: localize('gettingStarted.findLanguageExts.description.interpolated', "Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}", Button(localize('browseLangExts', "Browse Language Extensions"), 'command:workbench.extensions.action.showLanguageExtensions')),
					when: 'workspacePlatform != \'webworker\'',
					media: {
						type: 'svg', altText: 'Language extensions', path: 'languages.svg'
					},
				},
				{
					id: 'settingsSyncWeb',
					title: localize('gettingStarted.settingsSync.title', "Sync settings across devices"),
					description: localize('gettingStarted.settingsSync.description.interpolated', "Keep your essential customizations backed up and updated across all your devices.\n{0}", Button(localize('enableSync', "Backup and Sync Settings"), 'command:workbench.userDataSync.actions.turnOn')),
					when: 'syncStatus != uninitialized',
					completionEvents: ['onEvent:sync-enabled'],
					media: {
						type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
					},
				},
				{
					id: 'commandPaletteTaskWeb',
					title: localize('gettingStarted.commandPalette.title', "Unlock productivity with the Command Palette "),
					description: localize('gettingStarted.commandPalette.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
					media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
				},
				{
					id: 'pickAFolderTask-WebWeb',
					title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
					description: localize('gettingStarted.setup.OpenFolderWeb.description.interpolated', "You're all set to start coding. You can open a local project or a remote repository to get your files into VS Code.\n{0}\n{1}", Button(localize('openFolder', "Open Folder"), 'command:workbench.action.addRootFolder'), Button(localize('openRepository', "Open Repository"), 'command:remoteHub.openRepository')),
					when: 'workspaceFolderCount == 0',
					media: {
						type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
					}
				},
				{
					id: 'quickOpenWeb',
					title: localize('gettingStarted.quickOpen.title', "Quickly navigate between your files"),
					description: localize('gettingStarted.quickOpen.description.interpolated', "Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}", Button(localize('quickOpen', "Quick Open a File"), 'command:toSide:workbench.action.quickOpen')),
					when: 'workspaceFolderCount != 0',
					media: {
						type: 'svg', altText: 'Go to file in quick search.', path: 'search.svg'
					}
				}
			]
		}
	},
	{
		id: 'notebooks',
		title: localize('gettingStarted.notebook.title', "Customize Notebooks"),
		description: '',
		icon: setupIcon,
		isFeatured: false,
		when: `config.${NotebookSetting.openGettingStarted} && userHasOpenedNotebook`,
		content: {
			type: 'steps',
			steps: [
				{
					completionEvents: ['onCommand:notebook.setProfile'],
					id: 'notebookProfile',
					title: localize('gettingStarted.notebookProfile.title', "Select the layout for your notebooks"),
					description: localize('gettingStarted.notebookProfile.description', "Get notebooks to feel just the way you prefer"),
					when: 'userHasOpenedNotebook',
					media: {
						type: 'markdown', path: 'notebookProfile'
					}
				},
			]
		}
	}
];
