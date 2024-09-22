import { useState, useEffect } from 'react';
import { Form, Button, Badge, Alert } from 'react-bootstrap';
import FormContainer from '../../components/FormContainer';
import { useDispatch, useSelector } from 'react-redux';
import {
  useIntegrateUserMutation,
  useIntegrationInfoByUserIdMutation,
} from '../../slices/userApiSlice';
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const IntegrationScreen = () => {
  const [userId, setUserId] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState('');
  const [lastTimeRefreshTokenGeneratedAt, setLastTimeRefreshTokenGeneratedAt] =
    useState('');

  const [
    getIntegrationInfoByUserId,
    { data: integrateUserInfo, isLoading: isLoadingIntegrationInfo },
  ] = useIntegrationInfoByUserIdMutation();

  const [integrateUser, { isLoading }] = useIntegrateUserMutation();
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo.userId) {
      setUserId(userInfo.userId);
      setIsAdmin(userInfo.isAdmin);
      getIntegrationInfoByUserId(userInfo.userId);
    }
  }, [userInfo, getIntegrationInfoByUserId]);

  useEffect(() => {
    if (integrateUserInfo) {
      setUserName(integrateUserInfo.fnUserName || '');
      setIntegrationStatus(integrateUserInfo.integrationStatus || '');
      setLastTimeRefreshTokenGeneratedAt(
        integrateUserInfo.lastTimeRefreshTokenGeneratedAt || '',
      );
    }
  }, [integrateUserInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!userName || !password) {
      toast.error('Please fill in both username and password!');
      return;
    }

    try {
      const data = {
        userId: userId,
        username: userName,
        password: password,
      };

      const result = await integrateUser(data).unwrap();
      setIntegrationStatus(result.integrationStatus || '');
      setLastTimeRefreshTokenGeneratedAt(result.lastTimeRefreshTokenGeneratedAt || '');
      toast.success('Account connected successfully');
    } catch (err) {
      setIntegrationStatus('Not Connected');
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
          bg={integrationStatus === 'Connected' ? 'success' : 'danger'}
          style={{ margin: '5px auto 10px auto' }}
        >
          {lastTimeRefreshTokenGeneratedAt && integrationStatus === 'Connected'
            ? integrationStatus + ': ' + lastTimeRefreshTokenGeneratedAt
            : integrationStatus
            ? integrationStatus
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
              type="password"
              placeholder="Enter your field nation password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex justify-content-end">
            <Button type="submit" variant="primary" className="mt-3">
              Connect
            </Button>
          </div>
        </Form>

        {(isLoading || isLoadingIntegrationInfo) && <Loader />}
        {/* Info Box */}
        <div style={{ marginTop: '20px' }}>
          <Alert variant="info">
            {isAdmin
              ? 'As a service company admin, you must connect once every 14 days to maintain your connection.'
              : 'As a service company managed provider, you should connect your account with Field Nation at least once.'}
          </Alert>
        </div>
      </FormContainer>
    </>
  );
};

export default IntegrationScreen;
