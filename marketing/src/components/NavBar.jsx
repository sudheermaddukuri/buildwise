import React from 'react';
import { AppBar, Toolbar, Stack, Button, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import logo from '../assets/logo.svg';

export default function NavBar({ route }) {
	const isMdUp = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width:900px)').matches;
	const scrollTo = (id) => {
		const el = document.getElementById(id);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};
	const go = (hash) => {
		if (typeof window !== 'undefined') {
			window.location.hash = hash;
		}
	};
	const isHome = route === '#/' || route === '' || route === '#';
	return (
		<AppBar
			position="sticky"
			elevation={0}
			color="default"
			sx={{
				backgroundColor: 'rgba(255,255,255,.8)',
				backdropFilter: 'blur(8px)',
				borderBottom: '1px solid',
				borderColor: 'divider',
				color: 'text.primary'
			}}
		>
			<Toolbar style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => { if (!isHome) { go('#/'); } else { scrollTo('top'); } }}>
					<img src={logo} alt="BuildWise AI" width="120" height="24" />
				</Box>
				{isMdUp ? (
					<Stack direction="row" spacing={1}>
						<Button color="inherit" onClick={() => go('#/why')}>Why Buildwise</Button>
						<Button color="inherit" onClick={() => go('#/packages')}>Packages</Button>
						<Button color="inherit" onClick={() => go('#/pricing')}>Pricing</Button>
          <Button color="inherit" onClick={() => go('#/onsite')}>Onsite Build</Button>
						<Button color="inherit" onClick={() => { if (isHome) { scrollTo('faq'); } else { go('#/'); setTimeout(() => scrollTo('faq'), 50); } }}>FAQ</Button>
						<Button variant="contained" sx={{ color: '#0b1220' }} onClick={() => { if (isHome) { scrollTo('contact'); } else { go('#/'); setTimeout(() => scrollTo('contact'), 50); } }}>Get in touch</Button>
					</Stack>
				) : (
					<IconButton color="inherit" onClick={() => { if (isHome) { scrollTo('contact'); } else { go('#/'); } }}>
						<MenuIcon />
					</IconButton>
				)}
			</Toolbar>
		</AppBar>
	);
}


