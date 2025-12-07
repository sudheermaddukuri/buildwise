import React, { useState } from 'react';
import { Box, Container, Paper, Stack, Typography, TextField, Button, Alert, RadioGroup, FormControlLabel, Radio } from '@mui/material';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [planId, setPlanId] = useState('ai_assurance'); // guide | ai_assurance
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  React.useEffect(() => {
    try {
      const hash = window.location.hash || ''
      const q = hash.includes('?') ? hash.split('?')[1] : ''
      const params = new URLSearchParams(q)
      const p = params.get('plan')
      if (p && (p === 'guide' || p === 'ai_assurance')) setPlanId(p)
    } catch {}
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      setSubmitting(true);
      const res = await fetch('/api/auth/register-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, password, planId })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Registration failed');
      }
      setSuccess('Thanks! Please check your email to confirm your account.');
      setFullName(''); setEmail(''); setPassword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: 3, backgroundColor: 'background.paper', borderColor: 'divider' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Start Free Trial</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            90‑day free trial. Choose Guide or AI Assurance. You’ll confirm your email after signup.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required fullWidth />
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
              <Typography variant="subtitle2">Choose your plan</Typography>
              <RadioGroup row value={planId} onChange={(_, v) => setPlanId(v)}>
                <FormControlLabel value="guide" control={<Radio />} label="Guide" />
                <FormControlLabel value="ai_assurance" control={<Radio />} label="AI Assurance" />
              </RadioGroup>
              <Button type="submit" variant="contained" sx={{ color: '#0b1220' }} disabled={submitting || !fullName || !email || !password}>
                {submitting ? 'Submitting…' : 'Start Free Trial'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}


