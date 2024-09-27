import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginMutation } from '../../slices/userApiSlice';
import { setCredentials } from '../../slices/authSlice';
import FormContainer from '../../components/FormContainer';
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import {
  useIntegrationInfoByUserIdMutation,
  useUserContextMutation,
} from '../../slices/userApiSlice';
import { setIntegrationInfo } from '../../slices/integrationSlice';
import { setuserContext } from '../../slices/userContextSlice';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      navigate('/');
    }
  }, [navigate, userInfo]);

  const [getIntegrationInfoByUserId] = useIntegrationInfoByUserIdMutation();
  const [getUserContext] = useUserContextMutation();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const loginResponse = await login({ email, password }).unwrap();
      dispatch(setCredentials({ ...loginResponse }));

      if (loginResponse?.userId) {
        try {
          const userContext = await getUserContext().unwrap();
          dispatch(setuserContext(userContext));

          const integrationResponse = await getIntegrationInfoByUserId(loginResponse.userId).unwrap();
          dispatch(setIntegrationInfo(integrationResponse));
        } catch (err) {
          // console.error('Integration error:', err);
        }
      }
      navigate('/');
    } catch (err) {
      toast.error(err?.data?.message || err?.error);
    }
  };

  return (
    <FormContainer>
      <h1>Sign In</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="my-2" controlId="email">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          ></Form.Control>
        </Form.Group>
        <Form.Group className="my-2" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Form.Check 
            type="checkbox" 
            label="Show Password" 
            className="mt-2"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)} 
          />
        </Form.Group>
        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" className="mt-3">
            {' '}
            Sign In{' '}
          </Button>
        </div>
      </Form>

      {isLoading && (
        <>
          {' '}
          <Loader />{' '}
        </>
      )}
      <Row className="py-3">
        <Col>
          New Customer? <Link to="/register">Register</Link>
          <br />
          <Link to="/forgot-password">Forgot Password?</Link>
        </Col>
      </Row>
    </FormContainer>
  );
};

export default LoginScreen;
