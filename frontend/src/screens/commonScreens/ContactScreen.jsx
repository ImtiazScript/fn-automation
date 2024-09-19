import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const ContactScreen = () => {
  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Contact</Breadcrumb.Item>
      </Breadcrumb>
      <div>Replace contact page context</div>
    </>
  );
};

export default ContactScreen;
