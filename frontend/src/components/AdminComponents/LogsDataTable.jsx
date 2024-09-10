import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Table,
  Form as BootstrapForm,
  Row,
  Col,
} from 'react-bootstrap';
import {
  useGetLogsMutation,
  useGetLogByIdMutation,
} from '../../slices/adminApiSlice';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const LogsDataTable = () => {
  const [getLogs] = useGetLogsMutation();
  const [getLogById] = useGetLogByIdMutation();

  const limit = 50;
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalLogs / limit);

  const [fromDate, setFromDate] = useState('');
  const [untilDate, setUntilDate] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetailModal, setShowLogDetailModal] = useState(false);

  const fetchLogs = async () => {
    try {
      const from = fromDate ? new Date(fromDate).toISOString() : 0;
      const until = untilDate ? new Date(untilDate).toISOString() : 0;

      const response = await getLogs({from, until, currentPage}).unwrap();
      setLogs(response.logs);
      setTotalLogs(response.totalLogs);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, fromDate, untilDate]);

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };
  const filteredLogs = logs.filter((log) =>
    log.message.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLogDetailClick = async (logId) => {
    try {
      const response = await getLogById(logId).unwrap();
      setSelectedLog(response.log);
      setShowLogDetailModal(true);
    } catch (error) {
      toast.error('Failed to fetch log details.');
      console.error(error);
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'info':
        return 'green';
      case 'error':
        return 'red';
      case 'debug':
        return 'blue';
      default:
        return 'black';
    }
  };

  return (
    <>
      <Row className="mb-3">
        <Col md={4}>
          <BootstrapForm.Control
            type="date"
            placeholder="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <BootstrapForm.Control
            type="date"
            placeholder="Until"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <BootstrapForm.Control
            value={searchQuery}
            type="text"
            placeholder="Filter logs: Enter Log Message"
            onChange={handleSearch}
          />
        </Col>
      </Row>
      <div style={{ marginTop: '20px' }}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th className="text-center align-middle d-none d-md-table-cell">Index</th>
              <th>Time</th>
              <th>Level</th>
              <th>Message</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr key={log._id}>
                {/* Descending order index */}
                <td>{(totalLogs - index) - (currentPage - 1) * limit}</td>
                {/* Ascending order index */}
                {/* <td>{index + 1 + (currentPage - 1) * limit}</td> */}
                {/* log id index */}
                {/* //<td className="text-center align-middle d-none d-md-table-cell">{log._id}</td> */}
                <td>
                  {format(new Date(log.timestamp), 'MM/dd/yyyy HH:mm:ss')}
                </td>
                <td style={{ color: getLogLevelColor(log.level) }}>{log.level}</td>
                <td>{log.message.length > 500 
                ? log.message.substring(0, 500) + '...' 
                : log.message}</td>
                <td>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleLogDetailClick(log._id)}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Row className="mt-4">
        <Col className="text-center">
          <Button
            variant="secondary"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="mx-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </Col>
      </Row>

      {/* Log Detail Modal */}
      <Modal
        show={showLogDetailModal}
        onHide={() => setShowLogDetailModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Log Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <p>
                <strong>Timestamp:</strong>{' '}
                {format(new Date(selectedLog.timestamp), 'MM/dd/yyyy HH:mm:ss')}
              </p>
              <p>
                <strong>Level:</strong> <span style={{ color: getLogLevelColor(selectedLog.level) }}>{selectedLog.level}</span>
              </p>
              <p>
                <strong>Message:</strong> {selectedLog.message}
              </p>
              <p>
                <strong>Meta:</strong>{' '}
                {selectedLog.meta && selectedLog.meta.metadata ? JSON.stringify(selectedLog.meta.metadata) : 'N/A'}
              </p>
              <p>
                <strong>Host Name:</strong> {selectedLog.hostname}
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLogDetailModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LogsDataTable;
