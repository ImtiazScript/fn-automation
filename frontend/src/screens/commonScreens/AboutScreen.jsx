import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const AboutScreen = () => {
  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>About</Breadcrumb.Item>
      </Breadcrumb>
      <div>Replace about page context</div>
    </>
  );
};

export default AboutScreen;
