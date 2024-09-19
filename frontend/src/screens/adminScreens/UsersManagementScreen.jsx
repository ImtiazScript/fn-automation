import UsersDataTable from '../../components/AdminComponents/UserDataTable';
import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const UserManagementScreen = () => {
  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Users List</Breadcrumb.Item>
      </Breadcrumb>
      <h1>Users List</h1>
      <UsersDataTable />
    </div>
  );
};

export default UserManagementScreen;
