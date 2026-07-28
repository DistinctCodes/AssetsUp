export const sidebarNavigation = [
  // ... Existing Navigation Items ...
  {
    title: 'Settings / Admin',
    items: [
      {
        title: 'Audit Log',
        href: '/audit-log',
        icon: 'ShieldCheck', // Lucide icon
        roles: ['ADMIN'], // Filtered in sidebar component based on user role
      },
    ],
  },
];