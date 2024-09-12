import { Navbar, Nav, Container, Row, Col } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { FaHome, FaInfoCircle, FaPhone } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer bg-dark">
      <Container>
        <Row className="w-100 align-items-center">
          {/* First Row: Navigation Icons */}
          <Col xs={12} lg={6} className="d-flex justify-content-center justify-content-lg-start mb-1">
            <Nav>
              {/* <LinkContainer to="/">
                <Nav.Link className="text-white mx-2">
                  <FaHome /> Home
                </Nav.Link>
              </LinkContainer> */}
              <LinkContainer to="/about">
                <Nav.Link className="text-white mx-2">
                  <FaInfoCircle /> About
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/contact">
                <Nav.Link className="text-white mx-2">
                  <FaPhone /> Contact
                </Nav.Link>
              </LinkContainer>
            </Nav>
          </Col>
          {/* Second Row: All rights reserved */}
          <Col xs={12} lg={6} className="d-flex justify-content-center justify-content-lg-end">
            <Navbar.Text className="copyright mb-0">
              &copy; {new Date().getFullYear()} FN Automation. All rights reserved.
            </Navbar.Text>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
