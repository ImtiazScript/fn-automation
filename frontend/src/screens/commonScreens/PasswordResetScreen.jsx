import { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useResetPasswordMutation } from '../../slices/userApiSlice';

const PasswordResetScreen = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    <Form onSubmit={submitHandler}>
      <h1>Reset Password</h1>
      <Form.Group controlId="password">
        <Form.Label>New Password</Form.Label>
        <Form.Control
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Group>

      <Form.Group controlId="confirmPassword">
        <Form.Label>Confirm New Password</Form.Label>
        <Form.Control
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </Form.Group>

      <Button type="submit" variant="primary" disabled={!password || !confirmPassword} className="mt-3">
        Reset Password
      </Button>
    </Form>
  );
};

export default PasswordResetScreen;
