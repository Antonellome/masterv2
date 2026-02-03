// src/components/NotificationPanel.tsx
import React from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemText, CircularProgress, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface Notification {
  id: string;
  messaggio: string;
  data: string; // O Date
  read: boolean;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose, notifications, loading }) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifiche</Typography>
            <IconButton onClick={onClose}>
                <CloseIcon />
            </IconButton>
        </Box>
        <hr style={{ margin: '16px 0' }}/>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <ListItem key={notif.id} sx={{ opacity: notif.read ? 0.6 : 1 }}>
                  <ListItemText
                    primary={notif.messaggio}
                    secondary={new Date(notif.data).toLocaleString()}
                  />
                </ListItem>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>Nessuna notifica.</Typography>
            )}
          </List>
        )}
      </Box>
    </Drawer>
  );
};
