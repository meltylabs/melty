import { DialogTrigger } from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import React from 'react';

import { Dialog, DialogContent } from './ui/dialog';
import { cn } from '@/lib/utils';

interface PreviewImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	handleRemoveImage: () => void;
	src: string;
	// when set to true, it will stop the propagation of the escape key event and prevent the parent dialog from closing
	stopEscapePropagation?: boolean;
}

export function PreviewImage({
	handleRemoveImage,
	src,
	stopEscapePropagation,
	className,
	...props
}: PreviewImageProps) {
	return (
		<Dialog>
			<button
				onClick={() => handleRemoveImage()}
				className="absolute right-1 top-1 -translate-y-1/2 translate-x-1/2 rounded-full bg-black text-white"
			>
				<XIcon className="h-4 w-4" />
			</button>
			<DialogTrigger asChild>
				<img src={src} alt="preview-image" className={cn('w-16 h-16 object-cover cursor-pointer', className)} {...props} />
			</DialogTrigger>

			<DialogContent className='outline-none focus:outline-none' onEscapeKeyDown={e => stopEscapePropagation && e.stopPropagation()}>
				<img src={src} alt="preview-image" className='w-full' />
			</DialogContent>
		</Dialog>
	)
}
