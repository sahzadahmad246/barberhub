export default function TestNavbar() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-4">Navigation Test Page</h1>
            <p className="text-lg text-muted-foreground">
                This page is used to test the navigation component. The navigation bar should be visible at the top of the page.
            </p>
            <div className="mt-8 space-y-4">
                <h2 className="text-xl font-semibold">Navigation Features:</h2>
                <ul className="list-disc list-inside space-y-2">
                    <li>Barber Hub branding in the top left</li>
                    <li>Navigation links for Home, Pricing, and Contact</li>
                    <li>Login button when not authenticated</li>
                    <li>User profile dropdown when authenticated</li>
                    <li>Responsive design with mobile menu</li>
                </ul>
            </div>
        </div>
    );
}