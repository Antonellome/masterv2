import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('App', () => {
  it('should render the login page for unauthenticated users', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // Wait for the login page to be rendered by looking for a distinctive element.
    // findByRole is more specific and robust.
    const loginTitle = await screen.findByRole('heading', { name: /accedi/i });

    // Assert that the login page title is in the document.
    expect(loginTitle).toBeInTheDocument();
  });
});
