interface Setting {
    label: string;
    href: string;
}

export const userSettings: Setting[] = [
    { label: 'Change Password', href: '/(profile)/settings/change-password' },
    { label: 'Verify your Account', href: '/(profile)/settings/verify-account' },
];