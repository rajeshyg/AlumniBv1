import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '../avatar';

describe('Avatar', () => {
  it('renders avatar with fallback', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('applies custom className to avatar components', () => {
    render(
      <Avatar className="test-avatar">
        <AvatarFallback className="test-fallback">JD</AvatarFallback>
      </Avatar>
    );

    const avatar = screen.getByText('JD').parentElement;
    expect(avatar).toHaveClass('test-avatar');
    expect(screen.getByText('JD')).toHaveClass('test-fallback');
  });

  it('renders avatar with image when loaded', async () => {
    render(
      <Avatar>
        <AvatarImage
          src="test.jpg"
          alt="Test User"
          role="img"
          aria-label="Test User"
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    const image = screen.getByRole('img', { name: 'Test User' });
    expect(image).toBeInTheDocument();
  });
});