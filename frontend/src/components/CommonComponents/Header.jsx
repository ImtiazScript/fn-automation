import { Navbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { LinkContainer } from 'react-router-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLogoutMutation } from '../../slices/userApiSlice.js';
import { logout } from '../../slices/authSlice.js';
import { clearIntegrationInfo } from '../../slices/integrationSlice.js';
import { clearuserContext } from '../../slices/userContextSlice.js';

const Header = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutApiCall] = useLogoutMutation();

  const logOutHandler = async () => {
    try {
      await logoutApiCall().unwrap();
      dispatch(logout());
      dispatch(clearuserContext());
      dispatch(clearIntegrationInfo());
      navigate('/');
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <header>
      <Navbar bg="dark" variant="dark" expand="lg" collapseOnSelect>
        <Container>
          <LinkContainer to="/">
            <Navbar.Brand>FN Automation</Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              {userInfo ? (
                <>
                  {userInfo.isAdmin ? (
                    <NavDropdown title={userInfo.name} id="userName">
                      <LinkContainer to="/admin/profile">
                        <NavDropdown.Item> Profile </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/manage-users">
                        <NavDropdown.Item> Manage Users </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/connect-account">
                        <NavDropdown.Item> Connect Account </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/crons/manage-crons">
                        <NavDropdown.Item> Manage Crons </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/logs">
                        <NavDropdown.Item> Logs </NavDropdown.Item>
                      </LinkContainer>
                      <NavDropdown.Item onClick={logOutHandler}>
                        {' '}
                        Logout{' '}
                      </NavDropdown.Item>
                    </NavDropdown>
                  ) : (
                    <NavDropdown title={userInfo.name} id="userName">
                      <LinkContainer to="/profile">
                        <NavDropdown.Item> Profile </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/connect-account">
                        <NavDropdown.Item> Connect Account </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/crons/manage-crons">
                        <NavDropdown.Item> Manage Crons </NavDropdown.Item>
                      </LinkContainer>
                      <NavDropdown.Item onClick={logOutHandler}>
                        {' '}
                        Logout{' '}
                      </NavDropdown.Item>
                    </NavDropdown>
                  )}
                </>
              ) : (
                <>
                  <LinkContainer to="/login">
                    <Nav.Link>
                      <FaSignInAlt /> Sign In
                    </Nav.Link>
                  </LinkContainer>

                  <LinkContainer to="/register">
                    <Nav.Link>
                      <FaSignOutAlt /> Sign Up
                    </Nav.Link>
                  </LinkContainer>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
