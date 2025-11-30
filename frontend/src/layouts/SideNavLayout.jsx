import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import HomeIcon from '@mui/icons-material/Home'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import LogoutIcon from '@mui/icons-material/Logout'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import ListSubheader from '@mui/material/ListSubheader'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import RoofingIcon from '@mui/icons-material/Roofing'
import DesignServicesIcon from '@mui/icons-material/DesignServices'
import { api } from '../api/client'
import DescriptionIcon from '@mui/icons-material/Description'
import ContactsIcon from '@mui/icons-material/Contacts'
import EventIcon from '@mui/icons-material/Event'
import BuildIcon from '@mui/icons-material/Build'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined'
import ChatIcon from '@mui/icons-material/Chat'
import SettingsIcon from '@mui/icons-material/Settings'

const drawerWidth = 260

export default function SideNavLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [homeTitle, setHomeTitle] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/')
      }
    } catch {}
  }, [navigate])

  const currentHomeId = useMemo(() => {
    const m = location.pathname.match(/^\/homes\/([^/]+)/)
    return m ? m[1] : ''
  }, [location.pathname])

  useEffect(() => {
    let mounted = true
    if (currentHomeId) {
      api.getHome(currentHomeId)
        .then((h) => { if (mounted) setHomeTitle(h?.name || '') })
        .catch(() => { if (mounted) setHomeTitle('') })
    } else {
      setHomeTitle('')
    }
    return () => { mounted = false }
  }, [currentHomeId])

  function go(path) {
    if (location.pathname !== path) navigate(path)
  }

  function logout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('userEmail')
    } catch {}
    navigate('/')
  }

  const userEmail = (() => {
    try { return localStorage.getItem('userEmail') || '' } catch { return '' }
  })()

  return (
    <Box sx={{ display: 'flex' }}>
      {isMobile && (
        <AppBar position="fixed" color="default" elevation={0}>
          <Toolbar>
            <IconButton edge="start" aria-label="menu" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, cursor: 'pointer' }} onClick={() => go('/homes')}>
              <img src="/logo.svg" alt="Buildwise AI" style={{ height: 24, marginRight: 8 }} />
              <span className="brand-text">Buildwise AI</span>
            </Box>
          </Toolbar>
        </AppBar>
      )}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          },
          display: { xs: 'block', sm: 'block' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => go('/homes')}>
            <img src="/logo.svg" alt="Buildwise AI" style={{ height: 26, marginRight: 8 }} />
            <span className="brand-text">Buildwise AI</span>
          </Box>
        </Box>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => go('/homes')}>
              <ListItemIcon><HomeIcon /></ListItemIcon>
              <ListItemText primary="Homes" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => go('/onboarding')}>
              <ListItemIcon><AddCircleOutlineIcon /></ListItemIcon>
              <ListItemText primary="Onboard New Home" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => go('/templates')}>
              <ListItemIcon><DesignServicesOutlinedIcon /></ListItemIcon>
              <ListItemText primary="Templates" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => go('/account')}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Account" />
            </ListItemButton>
          </ListItem>
        </List>
        {currentHomeId && (
          <>
            <Divider />
            <List subheader={<ListSubheader component="div" disableSticky sx={{ bgcolor: 'transparent' }}>{homeTitle || 'Selected Home'}</ListSubheader>}>
              <ListSubheader component="div" disableSticky sx={{ bgcolor: 'transparent', color: 'text.secondary', fontSize: 12, lineHeight: '28px' }}>
                Progress by Phase
              </ListSubheader>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/preconstruction')} onClick={() => go(`/homes/${currentHomeId}/preconstruction`)}>
                  <ListItemIcon><DesignServicesIcon /></ListItemIcon>
                  <ListItemText primary="PreConstruction" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/exterior')} onClick={() => go(`/homes/${currentHomeId}/exterior`)}>
                  <ListItemIcon><RoofingIcon /></ListItemIcon>
                  <ListItemText primary="Exterior Build" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/interior')} onClick={() => go(`/homes/${currentHomeId}/interior`)}>
                  <ListItemIcon><AssignmentTurnedInIcon /></ListItemIcon>
                  <ListItemText primary="Interior / Finish Out" />
                </ListItemButton>
              </ListItem>
              <Divider sx={{ my: 1 }} />
              <ListSubheader component="div" disableSticky sx={{ bgcolor: 'transparent', color: 'text.secondary', fontSize: 12, lineHeight: '28px' }}>
                General
              </ListSubheader>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/dashboard')} onClick={() => go(`/homes/${currentHomeId}/dashboard`)}>
                  <ListItemIcon><DashboardIcon /></ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/budget')} onClick={() => go(`/homes/${currentHomeId}/budget`)}>
                  <ListItemIcon><AttachMoneyIcon /></ListItemIcon>
                  <ListItemText primary="Budget" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/messages')} onClick={() => go(`/homes/${currentHomeId}/messages`)}>
                  <ListItemIcon><ChatIcon /></ListItemIcon>
                  <ListItemText primary="Messages" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/trades')} onClick={() => go(`/homes/${currentHomeId}/trades`)}>
                  <ListItemIcon><BuildIcon /></ListItemIcon>
                  <ListItemText primary="Trades" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/documents')} onClick={() => go(`/homes/${currentHomeId}/documents`)}>
                  <ListItemIcon><DescriptionIcon /></ListItemIcon>
                  <ListItemText primary="Documents" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/contacts')} onClick={() => go(`/homes/${currentHomeId}/contacts`)}>
                  <ListItemIcon><ContactsIcon /></ListItemIcon>
                  <ListItemText primary="Contacts" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={location.pathname.includes('/schedule')} onClick={() => go(`/homes/${currentHomeId}/schedule`)}>
                  <ListItemIcon><EventIcon /></ListItemIcon>
                  <ListItemText primary="Schedule" />
                </ListItemButton>
              </ListItem>
            </List>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {userEmail || 'Logged in'}
          </Typography>
          <ListItem disablePadding>
            <ListItemButton color="inherit" onClick={logout}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: isMobile ? 8 : 3 }}>
        <Container maxWidth="md">
          <Outlet />
          <Box sx={{ mt: 6, mb: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Laitysol LLC. All Rights Reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}


