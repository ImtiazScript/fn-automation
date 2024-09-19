import CronsDataTable from '../../components/CommonComponents/CronDataTable';
import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const CronsManagementScreen = () => {
  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Manage Crons</Breadcrumb.Item>
      </Breadcrumb>
      <CronsDataTable />
      <h1>Crons List</h1>
    </div>
  );
};

export default CronsManagementScreen;
