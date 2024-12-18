import { Container, Card, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

import { useSelector } from 'react-redux';

import {
  PROFILE_IMAGE_DIR_PATH,
  PROFILE_PLACEHOLDER_IMAGE_NAME,
} from '../../utils/constants';

const Hero = () => {
  const { userInfo } = useSelector((state) => state.auth);

  return (
    <div className=" py-5">
      <Container className="d-flex justify-content-center">
        <Card className="p-5 d-flex flex-column align-items-center hero-card bg-light w-75">
          {userInfo ? (
            <>
              <img
                src={
                  userInfo.profileImageName
                    ? PROFILE_IMAGE_DIR_PATH + userInfo.profileImageName
                    : PROFILE_IMAGE_DIR_PATH + PROFILE_PLACEHOLDER_IMAGE_NAME
                }
                alt={userInfo.name}
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
              <h2 className="text-center mb-4">
                {' '}
                Welcome back {userInfo.name}{' '}
              </h2>
              <p className="text-center mb-4"> Email: {userInfo.email} </p>
              {!userInfo.isActive ? (
                <>
                  <p className="text-center mb-4">
                    {' '}
                    Admin needs to activate your profile before you can use the
                    system, please reach out to admin: biolaajibola21@gmail.com{' '}
                  </p>
                </>
              ) : (
                <> </>
              )}
              <div className="d-flex"></div>
            </>
          ) : (
            <>
              <h2 className="text-center mb-4"> FN Automation </h2>
              <p className="text-center mb-4">
                {' '}
                Please Login to access Dashboard{' '}
              </p>
              <div className="d-flex">
                <LinkContainer to="/login">
                  <Button variant="primary" className="me-3">
                    Login
                  </Button>
                </LinkContainer>
              </div>
            </>
          )}
        </Card>
      </Container>
    </div>
  );
};

export default Hero;
