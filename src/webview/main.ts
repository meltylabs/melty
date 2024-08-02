// file: src/webview/main.ts

import {
  provideVSCodeDesignSystem,
  vsCodeButton,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(vsCodeButton());
