import { Outlet, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/CommonComponents/Header';
import Footer from './components/CommonComponents/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  return (
    <>
      <Header />
      <div className="container-content">
        <ToastContainer />
        <Container className="my-2">
          <Outlet />
        </Container>
      </div>
      <Footer />
    </>
  );
};

export default App;
