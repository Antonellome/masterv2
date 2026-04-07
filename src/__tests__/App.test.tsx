import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('should render the login page for unauthenticated users', async () => {
    render(<App />);

    // Wait for the login page to be rendered by looking for a distinctive element.
    // findByText is async and will wait for the element to appear.
    const loginTitle = await screen.findByText(/accedi/i);

    // Assert that the login page title is in the document.
    expect(loginTitle).toBeInTheDocument();
  });
});
