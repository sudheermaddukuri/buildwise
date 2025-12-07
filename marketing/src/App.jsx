import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import NavBar from './components/NavBar.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import Segments from './components/Segments.jsx';
import Pricing from './components/Pricing.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import FAQ from './components/FAQ.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import Why from './pages/Why.jsx';
import PricingPage from './pages/PricingPage.jsx';
import Onsite from './pages/Onsite.jsx';
import Packages from './pages/Packages.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  const [route, setRoute] = useState(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const isHome = route === '#/' || route === '' || route === '#';

  return (
    <Box>
      <NavBar route={route} />
      {isHome ? (
        <>
          <Hero />
          {/* Home = summary sections */}
          <Features />
          <Segments />
          <Pricing />
          <HowItWorks />
          <FAQ />
          <Contact />
        </>
      ) : route.startsWith('#/why') ? (
        <Why />
      ) : route.startsWith('#/pricing') ? (
        <PricingPage />
      ) : route.startsWith('#/onsite') ? (
        <Onsite />
      ) : route.startsWith('#/packages') ? (
        <Packages />
      ) : route.startsWith('#/register') ? (
        <Register />
      ) : (
        <>
          <Hero />
          <Features />
          <Contact />
        </>
      )}
      <Footer />
    </Box>
  );
}


