import { useState } from 'react';
import { Button, Table, Form as BootstrapForm } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const CronsDataTable = ({ crons }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };
  // const filteredCrons = crons;
  const filteredCrons = crons.filter((cron) =>
    cron.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <BootstrapForm>
        <BootstrapForm.Group
          className="mt-3"
          controlId="exampleForm.ControlInput1"
        >
          <BootstrapForm.Control
            style={{ width: '500px' }}
            value={searchQuery}
            type="text"
            placeholder="Search: Enter Provider Name........"
            onChange={handleSearch}
          />
        </BootstrapForm.Group>
      </BootstrapForm>
      <div style={{ marginTop: '20px' }}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Cron Id</th>
              <th>Provider Name</th>
              <th className="text-center align-middle d-none d-md-table-cell">Driving Radius</th>
              <th>Status</th>
              <th>Total #WO</th>
              <th>Configure</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrons.map((cron, index) => (
              <tr key={index}>
                <td>{cron.cronId}</td>
                <td>{cron?.userDetails?.name}</td>
                <td className="text-center align-middle d-none d-md-table-cell">{cron.drivingRadius}</td>
                <td>{cron.status}</td>
                <td>{cron.totalRequested}</td>
                <td>
                  <Link to={`/crons/configure-cron/${cron.cronId}`}>
                    <Button type="button" variant="primary" className="mt-3">
                      Configure
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default CronsDataTable;
