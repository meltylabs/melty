import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NavBar: React.FC = () => {
	const location = useLocation();
	const navigate = useNavigate();

	const isHelpPage = location.pathname === '/help';

	const toggleHelp = () => {
		if (isHelpPage) {
			navigate('/');
		} else {
			navigate('/help');
		}
	};

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

			<button onClick={toggleHelp} className="absolute right-4 top-2">
				<HelpCircle />
			</button>
		</nav>
	);
};
