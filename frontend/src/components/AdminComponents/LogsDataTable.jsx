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
import { JSONTree } from 'react-json-tree';

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

  const isJsonString = (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
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

  const getCronColor = (level) => {
    switch (level) {
      case 'availableWorkOrders':
        return 'purple';
      case 'cleanOlderLogs':
        return 'orange';
      case 'getAssignedWorkOrders':
        return 'yellow';
      case 'routedWorkOrders':
        return 'brown';
      case 'updateAccessTokens':
        return 'pink';
      default:
        return 'gray';
    }
  };  

  const parseMetaData = (meta) => {
    return typeof meta.metadata === 'string'
    ? JSON.parse(meta.metadata)
    : meta.metadata;
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
              <th className="text-center align-middle d-none d-md-table-cell">
                Index
              </th>
              <th className="text-center align-middle d-none d-md-table-cell">Time</th>
              <th className="text-center align-middle d-none d-md-table-cell">Level</th>
              <th className="text-center align-middle d-none d-md-table-cell">Cron</th>
              <th className="text-center align-middle d-none d-md-table-cell">Message</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr key={log._id}>
                <td>{totalLogs - index - (currentPage - 1) * limit}</td>
                <td>
                  {format(new Date(log.timestamp), 'MM/dd/yyyy HH:mm:ss')}
                </td>
                <td style={{ color: getLogLevelColor(log.level) }}>
                  {log.level}
                </td>
                <td style={{ color: getCronColor(parseMetaData(log.meta)?.cron) }}>
                  {parseMetaData(log.meta)?.cron}
                </td>
                <td
                  onClick={() => handleLogDetailClick(log._id)}
                  style={{ cursor: 'pointer' }}
                >
                  {log.message.length > 500
                    ? log.message.substring(0, 500) + '...'
                    : log.message}
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
                <strong>Level:</strong>{' '}
                <span style={{ color: getLogLevelColor(selectedLog.level) }}>
                  {selectedLog.level}
                </span>
              </p>
              <div>
                <strong>Message:</strong>{' '}
                {isJsonString(selectedLog.message) ? (
                  <pre>
                    {JSON.stringify(JSON.parse(selectedLog.message), null, 2)}
                  </pre>
                ) : (
                  selectedLog.message
                )}
              </div>
              <p></p>
              <div>
              <strong>Meta:</strong>{' '}
              <JSONTree 
                data={parseMetaData(selectedLog.meta)}
                theme={{
                  scheme: 'monokai',
                  base00: '#272822', base01: '#383830', base02: '#49483e', base03: '#75715e',
                  base04: '#a59f85', base05: '#f8f8f2', base06: '#f5f4f1', base07: '#f9f8f5',
                  base08: '#f92672', base09: '#fd971f', base0A: '#f4bf75', base0B: '#a6e22e',
                  base0C: '#a1efe4', base0D: '#66d9ef', base0E: '#ae81ff', base0F: '#cc6633'
                }}
                shouldExpandNodeInitially={() => true} // Expands all nodes initially
              />
              </div>
              <p></p>
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
