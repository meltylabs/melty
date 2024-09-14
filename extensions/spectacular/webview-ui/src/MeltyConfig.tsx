import { RpcClient } from '@/RpcClient';
import { MeltyConfig } from '@/types';
import { createContext, useCallback, useState, useEffect, ReactNode } from 'react';

export const MeltyConfigContext = createContext<MeltyConfig>({
	debugMode: false
});

interface MeltyConfigProviderProps {
	children: ReactNode;
}

export const MeltyConfigProvider: React.FC<MeltyConfigProviderProps> = ({ children, }) => {
	const [config, setConfig] = useState<MeltyConfig>({
		debugMode: false,
	});

	const fetchConfig = useCallback(async () => {
		setConfig(await RpcClient.getInstance().run('getMeltyConfig'));
	}, []);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	return (
		<MeltyConfigContext.Provider value={config}>
			{children}
		</MeltyConfigContext.Provider>
	);
};
