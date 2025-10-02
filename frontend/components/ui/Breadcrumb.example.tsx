import Breadcrumb from './Breadcrumb';

// Example usage in a Dashboard page
export const DashboardBreadcrumb = () => {
    return (
        <Breadcrumb
            items={[
                { label: 'Home', href: '/' },
                { label: 'Dashboard' }
            ]}
        />
    );
};

// Example usage in a Profile page
export const ProfileBreadcrumb = () => {
    return (
        <Breadcrumb
            items={[
                { label: 'Home', href: '/' },
                { label: 'Settings', href: '/settings' },
                { label: 'Profile' }
            ]}
        />
    );
};

// Example usage with nested navigation
export const AssetDetailBreadcrumb = () => {
    return (
        <Breadcrumb
            items={[
                { label: 'Home', href: '/' },
                { label: 'Assets', href: '/assets' },
                { label: 'Equipment', href: '/assets/equipment' },
                { label: 'Laptop #12345' }
            ]}
        />
    );
};