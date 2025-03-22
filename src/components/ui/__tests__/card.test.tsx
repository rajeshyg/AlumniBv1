import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card', () => {
  it('renders card with all its parts', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });

  it('applies custom className to card components', () => {
    render(
      <Card className="test-class">
        <CardHeader className="header-class">
          <CardTitle className="title-class">Title</CardTitle>
        </CardHeader>
      </Card>
    );

    expect(screen.getByText('Title').parentElement?.parentElement).toHaveClass('test-class');
    expect(screen.getByText('Title').parentElement).toHaveClass('header-class');
    expect(screen.getByText('Title')).toHaveClass('title-class');
  });
});