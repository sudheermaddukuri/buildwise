import React from 'react';
import { Box, Container, Stack, Link, Typography } from '@mui/material';
import logo from '../assets/logo.svg';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 3, background: 'rgba(255,255,255,.7)' }}>
      <Container maxWidth="lg" sx={{ display: 'grid', gap: 1, alignItems: 'center', gridTemplateColumns: { md: '1fr auto 1fr' } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
          <img src={logo} alt="" width="120" height="24" />
          <Typography>BuildWise AI</Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ justifySelf: { xs: 'start', md: 'center' } }}>
          <Link href="#features" underline="none" color="text.secondary">Features</Link>
          <Link href="#pricing" underline="none" color="text.secondary">Pricing</Link>
          <Link href="#faq" underline="none" color="text.secondary">FAQ</Link>
          <Link href="#contact" underline="none" color="text.secondary">Contact</Link>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ justifySelf: { xs: 'start', md: 'end' } }}>
          © {year} Laitysol LLC. All Rights Reserved.
        </Typography>
      </Container>
    </Box>
  );
}


