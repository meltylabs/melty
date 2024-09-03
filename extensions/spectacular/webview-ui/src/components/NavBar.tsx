import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NavBar: React.FC = () => {
	const location = useLocation();

	return (
		<nav className="mb-6 mt-4 mx-3 relative">
			<ul className="flex justify-between">
				<li></li>
				<li>
					<Link to="/">
						<h1 className="text-3xl font-extrabold tracking-tighter text-center">
							melty
						</h1>
					</Link>
				</li>
				<li>
				</li>
			</ul>

			<Link to="/help" className="absolute right-4 top-2">
				<HelpCircle />
			</Link>
		</nav>
	);
};
