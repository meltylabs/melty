import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, HomeIcon } from 'lucide-react';

export const NavBar: React.FC = () => {
	const location = useLocation();
	const navigate = useNavigate();

	const isHelpPage = location.pathname === '/help';


	return (
		<nav className="mb-2 mt-2 h-7 bg-gray-50 flex items-center justify-end relative border-b border-gray-200">

		</nav>
	);
};
