import { useState, useEffect } from 'react';
import {
  Button,
  Table,
  Modal,
  Badge,
  Row,
  Col,
  Dropdown,
  Form as BootstrapForm,
} from 'react-bootstrap';
import {
  useGetCronsDataMutation,
  useGetTypesOfWorkOrderMutation,
  useDeleteCronMutation,
} from '../../slices/commonApiSlice';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import CronConfigModal from './CronConfigModal';

const CronsDataTable = () => {
  const [crons, setCrons] = useState([]);
  const [cronsDataFromAPI, { isLoading }] = useGetCronsDataMutation();
  const [typesOfWorkOrder, setTypesOfWorkOrder] = useState([]);
  const [typesOfWorkOrderFromAPI, { isLoadingTypesOfWorkOrder }] =
    useGetTypesOfWorkOrderMutation();
  const [totalCrons, setTotalCrons] = useState(0);
  const limit = 10;
  const totalPages = Math.ceil(totalCrons / limit);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    try {
      const fetchData = async () => {
        if (!crons.length || !totalCrons) {
          const responseFromApiCall = await cronsDataFromAPI({ currentPage });
          const cronsData = responseFromApiCall.data.cronsData;
          setCrons(cronsData);
          const totalCrons = responseFromApiCall.data.totalCrons;
          setTotalCrons(totalCrons);
        }

        if (!typesOfWorkOrder.length) {
          // Getting types of work order
          const typesOfWorkOrderFromApiCall = await typesOfWorkOrderFromAPI();
          const typesOfWorkOrderArray = typesOfWorkOrderFromApiCall.data;
          setTypesOfWorkOrder(typesOfWorkOrderArray);
        }
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.message || err);
      console.error('Error fetching crons:', err);
    }
  }, [currentPage]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };
  const handleAddClick = () => setShowAddModal(true);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [cronIdToDelete, setCronIdToDelete] = useState(null); // Track the user ID to delete
  const [deleteCron, { isDeleteLoading }] = useDeleteCronMutation();
  const handleDelete = async () => {
    try {
      const responseFromApiCall = await deleteCron({ cronId: cronIdToDelete });
      toast.success('Cron Deleted Successfully.');
      setCronIdToDelete(null);
      setShowDeleteConfirmation(false);
      window.location.reload();
    } catch (err) {
      toast.error(err?.data?.message || err?.error);
    }
  };
  // const filteredCrons = crons;
  const filteredCrons = crons.filter((cron) =>
    cron.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  console.log('rendering cronDataTable');

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mt-3">
        <BootstrapForm>
          <BootstrapForm.Group
            controlId="exampleForm.ControlInput1"
            className="mb-0"
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

        <Button variant="primary" onClick={handleAddClick}>
          Add Cron +
        </Button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#ID</th>
              <th>Provider</th>
              <th className="text-center align-middle d-none d-md-table-cell">
                Driving Radius
              </th>
              <th>#WO</th>
              <th className="text-center align-middle d-none d-md-table-cell">
                Status
              </th>
              <th className="text-center align-middle d-none d-md-table-cell">
                Configure
              </th>
              <th className="text-center align-middle d-none d-md-table-cell">
                Delete
              </th>
              <th className="text-center align-middle d-md-none">Status</th>
              <th className="text-center align-middle d-md-none">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrons.map((cron, index) => (
              <tr key={index}>
                <td className="text-center align-middle">{cron.cronId}</td>
                <td>{cron?.userDetails?.name}</td>
                <td className="text-center align-middle d-none d-md-table-cell">
                  {cron.drivingRadius}
                </td>
                <td className="text-center align-middle">
                  {cron.totalRequested}
                </td>
                <td className="text-center align-middle d-none d-md-table-cell">
                  <Badge
                    bg={cron.status === 'active' ? 'success' : 'secondary'}
                  >
                    {cron.status}
                  </Badge>
                </td>
                <td className="text-center align-middle d-none d-md-table-cell">
                  <Link to={`/crons/configure-cron/${cron.cronId}`}>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="mt-3"
                    >
                      Configure
                    </Button>
                  </Link>
                </td>
                <td className="text-center align-middle d-none d-md-table-cell">
                  <Button
                    type="button"
                    variant={'danger'}
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setCronIdToDelete(cron._id);
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    Delete
                  </Button>
                </td>

                <td className="text-center align-middle d-md-none">
                  <span
                    className={
                      cron.status === 'active' ? 'active-dot' : 'inactive-dot'
                    }
                    title={cron.status}
                  ></span>
                </td>
                <td className="text-center align-middle d-md-none">
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="primary"
                      id="dropdown-basic"
                      size="sm"
                    >
                      Actions
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item
                        className="custom-dropdown-item mb-1"
                        style={{ backgroundColor: 'gray', color: '#fff' }}
                        as={Link}
                        to={`/crons/configure-cron/${cron.cronId}`}
                      >
                        Configure
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="custom-dropdown-item mb-1"
                        style={{ backgroundColor: '#f44336', color: '#fff' }}
                        onClick={() => {
                          setCronIdToDelete(cron._id);
                          setShowDeleteConfirmation(true);
                        }}
                      >
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
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

      {showAddModal && (
        <CronConfigModal
          showEditModal={showAddModal}
          setShowEditModal={setShowAddModal}
          typesOfWorkOrder={typesOfWorkOrder}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Modal
        show={showDeleteConfirmation}
        onHide={() => setShowDeleteConfirmation(false)}
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this cron?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirmation(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleteLoading}
          >
            {isDeleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CronsDataTable;
