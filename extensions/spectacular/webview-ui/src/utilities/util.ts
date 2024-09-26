import * as path from 'path';

const languageMap: { [key: string]: string } = {
	'.js': 'javascript',
	'.jsx': 'javascript',
	'.ts': 'typescript',
	'.tsx': 'typescript',
	'.py': 'python',
	'.java': 'java',
	'.c': 'c',
	'.cpp': 'cpp',
	'.cs': 'csharp',
	'.html': 'html',
	'.css': 'css',
	'.php': 'php',
	'.rb': 'ruby',
	'.go': 'go',
	'.rs': 'rust',
	'.swift': 'swift',
	'.kt': 'kotlin',
};

/**
 * For use with react-syntax-highlighter
 */
export function guessLanguage(filePath: string): string {
	const extension = path.extname(filePath).toLowerCase();
	return languageMap[extension] || 'text';
}
