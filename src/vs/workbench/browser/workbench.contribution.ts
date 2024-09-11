/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { localize } from 'vs/nls';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { isMacintosh, isWindows, isLinux, isWeb, isNative } from 'vs/base/common/platform';
import { ConfigurationMigrationWorkbenchContribution, DynamicWorkbenchSecurityConfiguration, IConfigurationMigrationRegistry, workbenchConfigurationNodeBase, Extensions, ConfigurationKeyValuePairs, problemsConfigurationNodeBase, windowConfigurationNodeBase, DynamicWindowConfiguration } from 'vs/workbench/common/configuration';
import { isStandalone } from 'vs/base/browser/browser';
import { WorkbenchPhase, registerWorkbenchContribution2 } from 'vs/workbench/common/contributions';
import { ActivityBarPosition, EditorActionsLocation, EditorTabsMode, LayoutSettings } from 'vs/workbench/services/layout/browser/layoutService';
import { defaultWindowTitle, defaultWindowTitleSeparator } from 'vs/workbench/browser/parts/titlebar/windowTitle';
import { CustomEditorLabelService } from 'vs/workbench/services/editor/common/customEditorLabelService';

const registry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

// Configuration
(function registerConfiguration(): void {

	// Migration support
	registerWorkbenchContribution2(ConfigurationMigrationWorkbenchContribution.ID, ConfigurationMigrationWorkbenchContribution, WorkbenchPhase.Eventually);

	// Dynamic Configuration
	registerWorkbenchContribution2(DynamicWorkbenchSecurityConfiguration.ID, DynamicWorkbenchSecurityConfiguration, WorkbenchPhase.AfterRestored);

	// Workbench
	registry.registerConfiguration({
		...workbenchConfigurationNodeBase,
		'properties': {
			'workbench.colorTheme': {
				'type': 'string',
				'default': 'Melty Light',
				'description': localize('colorTheme', "Specifies the color theme used in the workbench."),
			},
			'workbench.editor.tabActionLocation': {
				'type': 'string',
				'enum': ['left', 'right'],
				'default': 'right',
				'markdownDescription': localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'tabActionLocation' }, "Controls the position of the editor's tabs action buttons (close, unpin). This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.tabActionCloseVisibility': {
				'type': 'boolean',
				'default': true,
				'description': localize('workbench.editor.tabActionCloseVisibility', "Controls the visibility of the tab close action button.")
			},
			'workbench.editor.tabActionUnpinVisibility': {
				'type': 'boolean',
				'default': true,
				'description': localize('workbench.editor.tabActionUnpinVisibility', "Controls the visibility of the tab unpin action button.")
			},
			'workbench.editor.tabSizing': {
				'type': 'string',
				'enum': ['fit', 'shrink', 'fixed'],
				'default': 'fit',
				'enumDescriptions': [
					localize('workbench.editor.tabSizing.fit', "Always keep tabs large enough to show the full editor label."),
					localize('workbench.editor.tabSizing.shrink', "Allow tabs to get smaller when the available space is not enough to show all tabs at once."),
					localize('workbench.editor.tabSizing.fixed', "Make all tabs the same size, while allowing them to get smaller when the available space is not enough to show all tabs at once.")
				],
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'tabSizing' }, "Controls the size of editor tabs. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.tabSizingFixedMinWidth': {
				'type': 'number',
				'default': 50,
				'minimum': 38,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabSizingFixedMinWidth' }, "Controls the minimum width of tabs when {0} size is set to {1}.", '`#workbench.editor.tabSizing#`', '`fixed`')
			},
			'workbench.editor.tabSizingFixedMaxWidth': {
				'type': 'number',
				'default': 160,
				'minimum': 38,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabSizingFixedMaxWidth' }, "Controls the maximum width of tabs when {0} size is set to {1}.", '`#workbench.editor.tabSizing#`', '`fixed`')
			},
			'window.density.editorTabHeight': {
				'type': 'string',
				'enum': ['default', 'compact'],
				'default': 'default',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabHeight' }, "Controls the height of editor tabs. Also applies to the title control bar when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.pinnedTabSizing': {
				'type': 'string',
				'enum': ['normal', 'compact', 'shrink'],
				'default': 'normal',
				'enumDescriptions': [
					localize('workbench.editor.pinnedTabSizing.normal', "A pinned tab inherits the look of non pinned tabs."),
					localize('workbench.editor.pinnedTabSizing.compact', "A pinned tab will show in a compact form with only icon or first letter of the editor name."),
					localize('workbench.editor.pinnedTabSizing.shrink', "A pinned tab shrinks to a compact fixed size showing parts of the editor name.")
				],
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'pinnedTabSizing' }, "Controls the size of pinned editor tabs. Pinned tabs are sorted to the beginning of all opened tabs and typically do not close until unpinned. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.pinnedTabsOnSeparateRow': {
				'type': 'boolean',
				'default': false,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.pinnedTabsOnSeparateRow' }, "When enabled, displays pinned tabs in a separate row above all other tabs. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
			},
			'workbench.editor.preventPinnedEditorClose': {
				'type': 'string',
				'enum': ['keyboardAndMouse', 'keyboard', 'mouse', 'never'],
				'default': 'keyboardAndMouse',
				'enumDescriptions': [
					localize('workbench.editor.preventPinnedEditorClose.always', "Always prevent closing the pinned editor when using mouse middle click or keyboard."),
					localize('workbench.editor.preventPinnedEditorClose.onlyKeyboard', "Prevent closing the pinned editor when using the keyboard."),
					localize('workbench.editor.preventPinnedEditorClose.onlyMouse', "Prevent closing the pinned editor when using mouse middle click."),
					localize('workbench.editor.preventPinnedEditorClose.never', "Never prevent closing a pinned editor.")
				],
				description: localize('workbench.editor.preventPinnedEditorClose', "Controls whether pinned editors should close when keyboard or middle mouse click is used for closing."),
			},
			'workbench.editor.splitSizing': {
				'type': 'string',
				'enum': ['auto', 'distribute', 'split'],
				'default': 'auto',
				'enumDescriptions': [
					localize('workbench.editor.splitSizingAuto', "Splits the active editor group to equal parts, unless all editor groups are already in equal parts. In that case, splits all the editor groups to equal parts."),
					localize('workbench.editor.splitSizingDistribute', "Splits all the editor groups to equal parts."),
					localize('workbench.editor.splitSizingSplit', "Splits the active editor group to equal parts.")
				],
				'description': localize('splitSizing', "Controls the size of editor groups when splitting them.")
			},
			'workbench.editor.splitOnDragAndDrop': {
				'type': 'boolean',
				'default': true,
				'description': localize('splitOnDragAndDrop', "Controls if editor groups can be split from drag and drop operations by dropping an editor or file on the edges of the editor area.")
			},
			'workbench.editor.dragToOpenWindow': {
				'type': 'boolean',
				'default': true,
				'markdownDescription': localize('dragToOpenWindow', "Controls if editors can be dragged out of the window to open them in a new window. Press and hold the `Alt` key while dragging to toggle this dynamically.")
			},
			'workbench.editor.focusRecentEditorAfterClose': {
				'type': 'boolean',
				'description': localize('focusRecentEditorAfterClose', "Controls whether editors are closed in most recently used order or from left to right."),
				'default': true
			},
			'workbench.editor.showIcons': {
				'type': 'boolean',
				'description': localize('showIcons', "Controls whether opened editors should show with an icon or not. This requires a file icon theme to be enabled as well."),
				'default': true
			},
			'workbench.editor.enablePreview': {
				'type': 'boolean',
				'description': localize('enablePreview', "Controls whether preview mode is used when editors open. There is a maximum of one preview mode editor per editor group. This editor displays its filename in italics on its tab or title label and in the Open Editors view. Its contents will be replaced by the next editor opened in preview mode. Making a change in a preview mode editor will persist it, as will a double-click on its label, or the 'Keep Open' option in its label context menu. Opening a file from Explorer with a double-click persists its editor immediately."),
				'default': true
			},
			'workbench.editor.enablePreviewFromQuickOpen': {
				'type': 'boolean',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'enablePreviewFromQuickOpen' }, "Controls whether editors opened from Quick Open show as preview editors. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). When enabled, hold Ctrl before selection to open an editor as a non-preview. This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
				'default': false
			},
			'workbench.editor.enablePreviewFromCodeNavigation': {
				'type': 'boolean',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'enablePreviewFromCodeNavigation' }, "Controls whether editors remain in preview when a code navigation is started from them. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
				'default': false
			},
			'workbench.editor.closeOnFileDelete': {
				'type': 'boolean',
				'description': localize('closeOnFileDelete', "Controls whether editors showing a file that was opened during the session should close automatically when getting deleted or renamed by some other process. Disabling this will keep the editor open  on such an event. Note that deleting from within the application will always close the editor and that editors with unsaved changes will never close to preserve your data."),
				'default': false
			},
			'workbench.editor.openPositioning': {
				'type': 'string',
				'enum': ['left', 'right', 'first', 'last'],
				'default': 'right',
				'markdownDescription': localize({ comment: ['{0}, {1}, {2}, {3} will be a setting name rendered as a link'], key: 'editorOpenPositioning' }, "Controls where editors open. Select {0} or {1} to open editors to the left or right of the currently active one. Select {2} or {3} to open editors independently from the currently active one.", '`left`', '`right`', '`first`', '`last`')
			},
			'workbench.editor.openSideBySideDirection': {
				'type': 'string',
				'enum': ['right', 'down'],
				'default': 'right',
				'markdownDescription': localize('sideBySideDirection', "Controls the default direction of editors that are opened side by side (for example, from the Explorer). By default, editors will open on the right hand side of the currently active one. If changed to `down`, the editors will open below the currently active one.")
			},
			'workbench.editor.closeEmptyGroups': {
				'type': 'boolean',
				'description': localize('closeEmptyGroups', "Controls the behavior of empty editor groups when the last tab in the group is closed. When enabled, empty groups will automatically close. When disabled, empty groups will remain part of the grid."),
				'default': true
			},
			'workbench.editor.revealIfOpen': {
				'type': 'boolean',
				'description': localize('revealIfOpen', "Controls whether an editor is revealed in any of the visible groups if opened. If disabled, an editor will prefer to open in the currently active editor group. If enabled, an already opened editor will be revealed instead of opened again in the currently active editor group. Note that there are some cases where this setting is ignored, such as when forcing an editor to open in a specific group or to the side of the currently active group."),
				'default': false
			},
			'workbench.editor.mouseBackForwardToNavigate': {
				'type': 'boolean',
				'description': localize('mouseBackForwardToNavigate', "Enables the use of mouse buttons four and five for commands 'Go Back' and 'Go Forward'."),
				'default': true
			},
			'workbench.editor.navigationScope': {
				'type': 'string',
				'enum': ['default', 'editorGroup', 'editor'],
				'default': 'default',
				'markdownDescription': localize('navigationScope', "Controls the scope of history navigation in editors for commands such as 'Go Back' and 'Go Forward'."),
				'enumDescriptions': [
					localize('workbench.editor.navigationScopeDefault', "Navigate across all opened editors and editor groups."),
					localize('workbench.editor.navigationScopeEditorGroup', "Navigate only in editors of the active editor group."),
					localize('