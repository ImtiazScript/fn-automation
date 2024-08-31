import { useState, useEffect } from "react";
import { Button, Modal, Table, Form as BootstrapForm, Row, Col } from "react-bootstrap";
import { useGetLogsMutation, useGetLogByIdMutation } from "../../slices/adminApiSlice";
import { format } from 'date-fns';
import { toast } from "react-toastify";

const LogsDataTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10); // Number of logs per page
  const [fromDate, setFromDate] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetailModal, setShowLogDetailModal] = useState(false);

  const [getLogs] = useGetLogsMutation();
  const [getLogById] = useGetLogByIdMutation();

  useEffect(() => {
    fetchLogs();
  }, [currentPage, fromDate, untilDate]);

  const fetchLogs = async () => {
    try {
      const from = fromDate ? new Date(fromDate).toISOString() : undefined;
      const until = untilDate ? new Date(untilDate).toISOString() : undefined;
      
      const response = await getLogs({ from, until, limit, start: (currentPage - 1) * limit }).unwrap();
      setLogs(response.logs);
      setTotalLogs(response.totalLogs); // Assuming `totalLogs` is sent in the API response
    } catch (error) {
      toast.error("Failed to fetch logs.");
      console.error(error);
    }
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleLogDetailClick = async (logId) => {
    try {
      const response = await getLogById(logId).unwrap();
      setSelectedLog(response.log);
      setShowLogDetailModal(true);
    } catch (error) {
      toast.error("Failed to fetch log details.");
      console.error(error);
    }
  };

  const filteredLogs = logs.filter(
    (log) => log.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalLogs / limit);

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
            placeholder="Search: Enter Log Message"
            onChange={handleSearch}
          />
        </Col>
      </Row>
      <div style={{ marginTop: "20px" }}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Index</th>
              <th>Time</th>
              <th>Level</th>
              <th>Message</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr key={log._id}>
                <td>{index + 1 + (currentPage - 1) * limit}</td>
                <td>{format(new Date(log.timestamp), "dd-MM-yyyy HH:mm:ss")}</td>
                <td>{log.level}</td>
                <td>{log.message}</td>
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
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </Col>
      </Row>

      {/* Log Detail Modal */}
      <Modal show={showLogDetailModal} onHide={() => setShowLogDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Log Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <p><strong>Timestamp:</strong> {format(new Date(selectedLog.timestamp), "dd-MM-yyyy HH:mm:ss")}</p>
              <p><strong>Level:</strong> {selectedLog.level}</p>
              <p><strong>Message:</strong> {selectedLog.message}</p>
              <p><strong>Meta:</strong> {selectedLog.meta ? selectedLog.meta : 'N/A'}</p>
              <p><strong>Host Name:</strong> {selectedLog.hostname}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LogsDataTable;
