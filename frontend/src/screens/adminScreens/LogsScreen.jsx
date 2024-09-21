import LogsDataTable from '../../components/AdminComponents/LogsDataTable';
import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const LogsScreen = () => {
  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>System Logs</Breadcrumb.Item>
      </Breadcrumb>
      <h1>System Logs:</h1>
      <LogsDataTable />
    </div>
  );
};

export default LogsScreen;
