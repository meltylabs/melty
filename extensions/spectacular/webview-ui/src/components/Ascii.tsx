import React, { useState, useEffect } from 'react';

const Ascii = () => {
	const [text, setText] = useState('');
	const fullText = `    _ _
  _ __ ___   ___| | |_ _   _
 | '_ \` _ \\ / _ \\ | __| | | |
 | | | | | |  __/ | |_| |_| |
 |_| |_| |_|\\___|_|\\__|\\__, |
                       |___/`;

	useEffect(() => {
		let index = 0;
		const timer = setInterval(() => {
			setText((prev) => prev + fullText[index]);
			index++;
			if (index === fullText.length) {
				clearInterval(timer);
			}
		}, 5); // Adjust this value to control the speed

		return () => clearInterval(timer);
	}, []);

	return (
		<pre
			style={{
				fontFamily: 'monospace',
				whiteSpace: 'pre',
				display: 'block',
				padding: '1em',
				borderRadius: '4px',
				lineHeight: '1',
			}}
		>
			{text}
		</pre>
	);
};

export default Ascii;
