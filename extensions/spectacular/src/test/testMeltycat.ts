// import * as fs from 'fs';
// import * as path from 'path';
// import SummaryService from '../SummaryService';
// import * as chokidar from 'chokidar';

// jest.mock('fs', () => ({
// 	promises: {
// 		readFile: jest.fn(),
// 		writeFile: jest.fn(),
// 		stat: jest.fn(),
// 		readdir: jest.fn(),
// 	},
// }));
// jest.mock('chokidar', () => ({
// 	watch: jest.fn(() => ({
// 		on: jest.fn(() => ({
// 			on: jest.fn(),
// 		})),
// 	})),
// }));
// jest.mock('ignore', () => jest.fn(() => ({
// 	add: jest.fn(),
// 	ignores: jest.fn(),
// })));

// describe('SummaryService', () => {
// 	let service: SummaryService;
// 	const mockTargetDir = '/mock/target/directory';

// 	beforeEach(() => {
// 		jest.clearAllMocks();
// 		service = new SummaryService(mockTargetDir, {
// 			pollMode: false,
// 			pollInterval: 1000,
// 			batchSize: 100,
// 		});
// 	});

// 	test('constructor sets correct paths with given target directory', () => {
// 		expect((service as any).watchPath).toBe(mockTargetDir);
// 		expect((service as any).summaryPath).toBe(path.join(mockTargetDir, '.meltycat'));
// 	});

// 	test('loadIgnoreFiles reads and adds ignore patterns from target directory', async () => {
// 		const mockIgnoreContent = '*.log\nnode_modules/';
// 		(fs.promises.readFile as jest.Mock).mockResolvedValue(mockIgnoreContent);

// 		await (service as any).loadIgnoreFiles();

// 		expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(mockTargetDir, '.meltycatignore'), 'utf-8');
// 		expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(mockTargetDir, '.gitignore'), 'utf-8');
// 		expect((service as any).ignoreFilter.add).toHaveBeenCalledWith(mockIgnoreContent);
// 		expect((service as any).ignoreFilter.add).toHaveBeenCalledWith('**/.git');
// 		expect((service as any).ignoreFilter.add).toHaveBeenCalledWith('**/.meltycatignore');
// 		expect((service as any).ignoreFilter.add).toHaveBeenCalledWith('**/.meltycat');
// 	});

// 	test('isIgnored checks if file should be ignored relative to target directory', () => {
// 		const mockFilePath = path.join(mockTargetDir, 'test.log');
// 		((service as any).ignoreFilter.ignores as jest.Mock).mockReturnValue(true);

// 		const result = (service as any).isIgnored(mockFilePath);

// 		expect(result).toBe(true);
// 		expect((service as any).ignoreFilter.ignores).toHaveBeenCalledWith('test.log');
// 	});

// 	test('handleFileRemove removes file from summary relative to target directory', async () => {
// 		(service as any).summaries.set('test.txt', { file: 'test.txt', content: 'Test content' });
// 		(service as any).updateSummaryFile = jest.fn().mockResolvedValue(undefined);

// 		await (service as any).handleFileRemove(path.join(mockTargetDir, 'test.txt'));

// 		expect((service as any).summaries.has('test.txt')).toBe(false);
// 		expect((service as any).updateSummaryFile).toHaveBeenCalled();
// 	});

// 	test('regenerateSummary creates summary from scratch in target directory', async () => {
// 		const mockFiles = ['file1.txt', 'file2.txt'].map(file => path.join(mockTargetDir, file));
// 		(service as any).getAllFiles = jest.fn().mockResolvedValue(mockFiles);
// 		(service as any).handleFileChange = jest.fn().mockResolvedValue(undefined);
// 		(service as any).updateSummaryFile = jest.fn().mockResolvedValue(undefined);

// 		await (service as any).regenerateSummary();

// 		expect((service as any).getAllFiles).toHaveBeenCalledWith(mockTargetDir);
// 		expect((service as any).handleFileChange).toHaveBeenCalledTimes(2);
// 		expect((service as any).updateSummaryFile).toHaveBeenCalled();
// 	});

// 	test('getAllFiles respects max depth relative to target directory', async () => {
// 		const mockEntries = [
// 			{ name: 'file1.txt', isDirectory: () => false },
// 			{ name: 'dir', isDirectory: () => true },
// 		];
// 		(fs.promises.readdir as jest.Mock).mockResolvedValue(mockEntries);
// 		(service as any).isIgnored = jest.fn().mockReturnValue(false);

// 		const result = await (service as any).getAllFiles(mockTargetDir, 9); // One less than max depth

// 		expect(result).toEqual([path.join(mockTargetDir, 'file1.txt')]);
// 		expect(fs.promises.readdir).toHaveBeenCalledTimes(1);
// 	});

// 	test('updateSummaryFile writes summary content to target directory', async () => {
// 		(service as any).summaries.set('file1.txt', { file: 'file1.txt', content: 'Content 1' });
// 		(service as any).summaries.set('file2.txt', { file: 'file2.txt', content: 'Content 2' });

// 		await (service as any).updateSummaryFile();

// 		expect(fs.promises.writeFile).toHaveBeenCalledWith(
// 			path.join(mockTargetDir, '.meltycat'),
// 			expect.stringContaining('<file_contents file="file1.txt">\nContent 1\n</file_contents>'),
// 			'utf8'
// 		);
// 		expect(fs.promises.writeFile).toHaveBeenCalledWith(
// 			path.join(mockTargetDir, '.meltycat'),
// 			expect.stringContaining('<file_contents file="file2.txt">\nContent 2\n</file_contents>'),
// 			'utf8'
// 		);
// 	});

// 	test('start method initializes service correctly with target directory', async () => {
// 		const mockWatcher = {
// 			on: jest.fn().mockImplementation((event, callback) => {
// 				if (event === 'ready') {
// 					// Simulate the 'ready' event being fired asynchronously
// 					process.nextTick(callback);
// 				}
// 				return mockWatcher;
// 			}),
// 		};
// 		(chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

// 		(service as any).loadIgnoreFiles = jest.fn().mockResolvedValue(undefined);
// 		(service as any).regenerateSummary = jest.fn().mockResolvedValue(undefined);

// 		const startPromise = service.start();

// 		// Wait for the next tick to allow the 'ready' event to fire
// 		await new Promise(process.nextTick);

// 		// Now wait for the start promise to resolve
// 		await startPromise;

// 		expect((service as any).loadIgnoreFiles).toHaveBeenCalled();
// 		expect(chokidar.watch).toHaveBeenCalledWith(mockTargetDir, expect.objectContaining({
// 			ignoreInitial: false,
// 			depth: expect.any(Number),
// 			usePolling: false,
// 			interval: undefined,
// 		}));
// 		expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
// 		expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
// 		expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
// 		expect(mockWatcher.on).toHaveBeenCalledWith('ready', expect.any(Function));
// 		expect((service as any).regenerateSummary).toHaveBeenCalled();
// 	});


// 	test('start method initializes service correctly in poll mode', async () => {
// 		const pollService = new SummaryService(mockTargetDir, {
// 			pollMode: true,
// 			pollInterval: 2000,
// 			batchSize: 500,
// 		});

// 		const mockWatcher = {
// 			on: jest.fn().mockImplementation((event, callback) => {
// 				if (event === 'ready') {
// 					process.nextTick(callback);
// 				}
// 				return mockWatcher;
// 			}),
// 		};
// 		(chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

// 		(pollService as any).loadIgnoreFiles = jest.fn().mockResolvedValue(undefined);
// 		(pollService as any).regenerateSummary = jest.fn().mockResolvedValue(undefined);

// 		const startPromise = pollService.start();

// 		await new Promise(process.nextTick);
// 		await startPromise;

// 		expect(chokidar.watch).toHaveBeenCalledWith(mockTargetDir, expect.objectContaining({
// 			ignoreInitial: false,
// 			depth: expect.any(Number),
// 			usePolling: true,
// 			interval: 2000,
// 		}));
// 	});
// });
