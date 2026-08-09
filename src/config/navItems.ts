import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ArticleIcon from '@mui/icons-material/Article';
import EngineeringIcon from '@mui/icons-material/Engineering';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import FolderIcon from '@mui/icons-material/Folder';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Icona per Reportistica

export const navItems = [
  {
    text: 'Dashboard',
    icon: DashboardIcon,
    path: '/'
  },
  {
    text: 'Reportistica',
    icon: AssessmentIcon,
    path: '/reportistica' // Assumiamo questo path
  },
  {
    text: 'Tecnici',
    icon: EngineeringIcon,
    path: '/anagrafiche/tecnici'
  },
  {
    text: 'Presenze',
    icon: EventAvailableIcon,
    path: '/presenze' // Assumiamo questo path
  },
    {
    text: 'Anagrafiche',
    icon: PeopleIcon,
    path: '/anagrafiche/clienti' // Path generico, potrebbe puntare a clienti
  },
  {
    text: 'Documenti',
    icon: FolderIcon,
    path: '/documenti' // Assumiamo questo path
  },
  {
    text: 'Scadenze',
    icon: EventBusyIcon,
    path: '/scadenze' // Assumiamo questo path
  },
  {
    text: 'Notifiche',
    icon: NotificationsIcon,
    path: '/notifiche'
  }
];
