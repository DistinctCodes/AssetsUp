import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

function LoginForm({
  onSubmit,
}: {
  onSubmit: (data: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Email required';
    if (!password) e.password = 'Password required';
    return e;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (!Object.keys(e).length) onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email}</span>}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {errors.password && <span>{errors.password}</span>}
      <button type="submit">Login</button>
    </form>
  );
}

describe('LoginForm', () => {
  it('shows validation errors on empty submit', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(screen.getByText('Email required')).toBeTruthy();
      expect(screen.getByText('Password required')).toBeTruthy();
    });
  });

  it('calls mutation on valid submit', async () => {
    const fn = jest.fn();
    render(<LoginForm onSubmit={fn} />);
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() =>
      expect(fn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' }),
    );
  });
});
