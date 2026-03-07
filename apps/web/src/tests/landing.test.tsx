import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../features/auth/LandingPage';

describe('LandingPage', () => {
  it('renders primary call to action', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Consistency engine/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Started/i })).toBeInTheDocument();
  });
});
