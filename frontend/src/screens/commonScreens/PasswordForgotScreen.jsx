import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useForgotPasswordMutation } from '../../slices/userApiSlice';
import Loader from '../../components/Loader';

const PasswordForgotScreen = () => {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading }]= useForgotPasswordMutation();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
      toast.success('Password reset link sent. Check your email.');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send reset link');
    }
  };

  return (
    <Form onSubmit={submitHandler}>
      <h1>Reset Password</h1>
      <Form.Group controlId="email">
        <Form.Label>Email Address</Form.Label>
        <Form.Control
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Form.Group>
      {isLoading ? (
        <Loader />
      ) : (
        <Button
          type="submit"
          variant="primary"
          disabled={!email}
          className="mt-3"
        >
          Send Reset Link
        </Button>
      )}
    </Form>
  );
};

export default PasswordForgotScreen;
