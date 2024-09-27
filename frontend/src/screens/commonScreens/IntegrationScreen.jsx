import { useState } from 'react';
import { Form, Button, Badge, Alert } from 'react-bootstrap';
import FormContainer from '../../components/FormContainer';
import { useDispatch, useSelector } from 'react-redux';
import {
  useIntegrateUserMutation,
} from '../../slices/userApiSlice';
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { setIntegrationInfo } from '../../slices/integrationSlice';

const IntegrationScreen = () => {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.auth);
  const integrationInfo = useSelector((state) => state.integration.integrationInfo);
  const [userName, setUserName] = useState(integrationInfo?.fnUserName);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [integrateUser, { isLoading }] = useIntegrateUserMutation();

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!userName || !password) {
      toast.error('Please fill in both username and password!');
      return;
    }
    try {
      const data = {
        userId: userInfo?.userId,
        username: userName,
        password: password,
      };
      const result = await integrateUser(data).unwrap();
      dispatch(setIntegrationInfo(result));
      toast.success('Account connected successfully');
    } catch (err) {
      toast.error(
        'Unable to connect. Please ensure your Field Nation username and password are both entered correctly.',
      );
    }
  };

  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Connect Account</Breadcrumb.Item>
      </Breadcrumb>
      <FormContainer>
        <h3 style={{ margin: '5px auto 10px auto' }}>
          Connect to Field Nation
        </h3>
        <Badge
          pill
          bg={integrationInfo?.integrationStatus === 'Connected' ? 'success' : 'danger'}
          style={{ margin: '5px auto 10px auto' }}
        >
          {integrationInfo?.lastTimeRefreshTokenGeneratedAt && integrationInfo?.integrationStatus === 'Connected'
            ? integrationInfo?.integrationStatus + ': ' + integrationInfo?.lastTimeRefreshTokenGeneratedAt
            : integrationInfo?.integrationStatus
            ? integrationInfo?.integrationStatus
            : 'Not connected yet'}
        </Badge>

        <Form onSubmit={submitHandler}>
          <Form.Group className="my-2" controlId="userName">
            <Form.Label>Field Nation Username</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter name here..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="my-2" controlId="password">
            <Form.Label>Field Nation Password</Form.Label>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your field nation password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <div className="d-flex justify-content-end">
            <Button type="submit" variant="primary" className="mt-3">
              Connect
            </Button>
          </div>
        </Form>

        {(isLoading) && <Loader />}
        {/* Info Box */}
        <div style={{ marginTop: '20px' }}>
          <Alert variant="info">
            {userInfo?.isAdmin
              ? 'As a service company admin, you must connect once every 14 days to maintain your connection.'
              : 'As a service company managed provider, you should connect your account with Field Nation at least once.'}
          </Alert>
        </div>
      </FormContainer>
    </>
  );
};

export default IntegrationScreen;
