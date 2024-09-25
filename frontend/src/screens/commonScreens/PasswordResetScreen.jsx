import { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useResetPasswordMutation } from '../../slices/userApiSlice';

const PasswordResetScreen = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword] = useResetPasswordMutation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get the reset token from the URL query string
  const resetToken = searchParams.get('reset_token');

  useEffect(() => {
    if (!resetToken) {
      toast.error('Invalid or missing reset token.');
      navigate('/login');
    }
  }, [resetToken, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    try {
      await resetPassword({ resetToken, password }).unwrap();
      toast.success('Password reset successfully. You can now log in with the new password.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <Form onSubmit={submitHandler} style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h3>Reset Password</h3>
      <Form.Group controlId="password">
      <Form.Label style={{ fontSize: '0.9rem' }}>New Password</Form.Label>
        <Form.Control
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ fontSize: '0.85rem' }}
        />
      </Form.Group>

      <Form.Group controlId="confirmPassword">
      <Form.Label style={{ fontSize: '0.9rem' }}>Confirm New Password</Form.Label>
        <Form.Control
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Form.Check 
          type="checkbox" 
          label="Show Password"
          className="mt-2"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          style={{ fontSize: '0.85rem' }}
        />
      </Form.Group>

      <Button type="submit" variant="primary" disabled={!password || !confirmPassword} className="mt-3" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
        Reset Password
      </Button>
    </Form>
  );
};

export default PasswordResetScreen;
