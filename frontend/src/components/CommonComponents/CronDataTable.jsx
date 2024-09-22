import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Button,
  Table,
  Modal,
  Badge,
  Row,
  Col,
  Dropdown,
  Alert,
  Form as BootstrapForm,
} from 'react-bootstrap';
import {
  useGetCronsDataMutation,
  useGetTypesOfWorkOrderMutation,
  useAddCronMutation,
  useDeleteCronMutation,
} from '../../slices/commonApiSlice';
import { useGetProvidersMutation } from '../../slices/adminApiSlice';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { useSelector } from 'react-redux';
import TimeZoneSelect from '../utils/TimeZoneSelect';

const CronsDataTable = () => {
  const [crons, setCrons] = useState([]);
  const [cronsDataFromAPI, { isLoading }] = useGetCronsDataMutation();
  const [typesOfWorkOrder, setTypesOfWorkOrder] = useState([]);
  const [typesOfWorkOrderFromAPI, { isLoadingTypesOfWorkOrder }] =
    useGetTypesOfWorkOrderMutation();

  const { userInfo } = useSelector((state) => state.auth);
  const [activeProvidersFromAPI, { isLoadingActiveProviders }] =
    useGetProvidersMutation();
  const [activeProviders, setActiveProviders] = useState([]);

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

        if (activeProviders && !activeProviders.length) {
          // Getting activeProviders
          const activeProvidersFromAPICall = await activeProvidersFromAPI();
          const activeProvidersArray =
            activeProvidersFromAPICall.data.providers;
          setActiveProviders(activeProvidersArray);
        }
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.message || err);
      console.error('Error fetching crons:', err);
    }
  }, [currentPage]);

  const [addCron] = useAddCronMutation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workOrderTypeOptions, setWorkOrderTypeOptions] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [formData, setFormData] = useState({
    user: 0,
    cronStartAt: '',
    cronEndAt: '',
    workingWindowStartAt: '',
    workingWindowEndAt: '',
    drivingRadius: '',
    status: '',
    centerZip: '',
    // Request configuration
    isFixed: false,
    fixedPayment: '',
    isHourly: false,
    hourlyPayment: '',
    isPerDevice: false,
    perDevicePayment: '',
    isBlended: false,
    firstHourlyPayment: '',
    additionalHourlyPayment: '',
    // Counter offer
    isEnabledCounterOffer: false,
    // Time-off and Off-day
    offDays: [],
    timeOffStartAt: '',
    timeOffEndAt: '',
    timeZone: '',
  });

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };
  const handleAddClick = () => setShowAddModal(true);
  const handleClose = () => setShowAddModal(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const allWorkOrderTypeOptions = typesOfWorkOrder.map((type) => ({
    value: type.fnTypeId.toString(), // Convert to string if necessary
    label: type.fnTypeName,
  }));

  const handleWorkOrderTypeChange = (selectedOptions) => {
    setWorkOrderTypeOptions(selectedOptions);
  };

  const allActiveProvidersOptions =
    activeProviders && activeProviders.length
      ? activeProviders.map((provider) => ({
          value: provider.userId,
          label: provider.name,
        }))
      : [];

  const handleProviderChange = (selectedUser) => {
    setFormData({ ...formData, user: selectedUser });
  };

  useEffect(() => {
    let isValid =
      formData.cronStartAt &&
      formData.cronEndAt &&
      formData.workingWindowStartAt &&
      formData.workingWindowEndAt &&
      formData.drivingRadius &&
      formData.status &&
      formData.centerZip &&
      formData.timeZone &&
      workOrderTypeOptions.length > 0;
    if (userInfo.isAdmin) {
      // making sure, provider is also selected
      isValid = isValid && formData.user;
    }
    setIsFormValid(isValid);
  }, [formData, workOrderTypeOptions]);

  const formatDateForInput = (dateTime) => {
    return dateTime ? format(new Date(dateTime), "yyyy-MM-dd'T'HH:mm") : '';
  };

  const handleOffDayChange = (e) => {
    const value = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      offDays: prevData.offDays.includes(value)
        ? prevData.offDays.filter((day) => day !== value)
        : [...prevData.offDays, value],
    }));
  };

  const handleSaveChanges = async () => {
    const selectedFnTypeIds = workOrderTypeOptions.map(
      (workOrderType) => workOrderType.value,
    );
    try {
      // Prepare the data to be sent
      const data = {
        userId: userInfo.isAdmin && formData.user ? formData.user?.value : 0,
        centerZip: formData.centerZip,
        cronStartAt: formData.cronStartAt,
        cronEndAt: formData.cronEndAt,
        workingWindowStartAt: formData.workingWindowStartAt,
        workingWindowEndAt: formData.workingWindowEndAt,
        drivingRadius: formData.drivingRadius,
        status: formData.status,
        typesOfWorkOrder: selectedFnTypeIds,
        isFixed: formData.isFixed,
        fixedPayment: formData.fixedPayment ? parseInt(formData.fixedPayment) : 0,
        isHourly: formData.isHourly,
        hourlyPayment: formData.hourlyPayment ? parseInt(formData.hourlyPayment) : 0,
        isPerDevice: formData.isPerDevice,
        perDevicePayment: formData.perDevicePayment ? parseInt(formData.perDevicePayment) : 0,
        isBlended: formData.isBlended,
        firstHourlyPayment: formData.firstHourlyPayment ? parseInt(formData.firstHourlyPayment) : 0,
        additionalHourlyPayment: formData.additionalHourlyPayment ? parseInt(formData.additionalHourlyPayment) : 0,
        isEnabledCounterOffer: formData.isEnabledCounterOffer,
        offDays: formData.offDays,
        timeOffStartAt: formData.timeOffStartAt,
        timeOffEndAt: formData.timeOffEndAt,
        timeZone: formData.timeZone,
      };

      const response = await addCron(data).unwrap();

      // Handle success (e.g., show a toast message or refresh the data)
      toast.success('Cron added successfully');

      // Close the modal
      // setShowEditModal(false);
      window.location.reload();
    } catch (error) {
      // Handle error (e.g., show an error message)
      toast.error('Failed to add cron.');
    }
  };

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

      {/* Add cron modal */}
      <Modal show={showAddModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Cron Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BootstrapForm>
            {userInfo.isAdmin && (
              <Row style={{ marginBottom: '20px' }}>
                <Col>
                  <BootstrapForm.Group controlId="providerName">
                    <BootstrapForm.Label>Provider</BootstrapForm.Label>
                    <Select
                      value={formData.user}
                      name="userId"
                      options={allActiveProvidersOptions}
                      onChange={(selectedOption) =>
                        handleProviderChange(selectedOption)
                      }
                      classNamePrefix="select"
                      required
                    />
                  </BootstrapForm.Group>
                </Col>
              </Row>
            )}

            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="cronStartAt">
                  <BootstrapForm.Label>Cron Start At</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="datetime-local"
                    name="cronStartAt"
                    value={formatDateForInput(formData.cronStartAt)}
                    onChange={handleChange}
                    required
                  />
                </BootstrapForm.Group>
              </Col>
              <Col>
                <BootstrapForm.Group controlId="cronEndAt">
                  <BootstrapForm.Label>Cron End At</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="datetime-local"
                    name="cronEndAt"
                    value={formatDateForInput(formData.cronEndAt)}
                    onChange={handleChange}
                    required
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="centerZip">
                  <BootstrapForm.Label>Center Zip</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    name="centerZip"
                    value={formData.centerZip || ''}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col>
                <BootstrapForm.Group controlId="drivingRadius">
                  <BootstrapForm.Label>Driving Radius</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="number"
                    name="drivingRadius"
                    value={formData.drivingRadius || ''}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <BootstrapForm.Group controlId="workOrderTypes">
              <BootstrapForm.Label>Types of Work Order</BootstrapForm.Label>
              <Select
                value={workOrderTypeOptions}
                isMulti
                name="types_of_work_order"
                options={allWorkOrderTypeOptions}
                onChange={(selectedOptions) =>
                  handleWorkOrderTypeChange(selectedOptions)
                }
                className="basic-multi-select"
                classNamePrefix="select"
                required
              />
            </BootstrapForm.Group>

            <div style={{ marginTop: '20px' }}>
              <h5>Payments</h5>
            </div>

            {/* Fixed checkbox and conditional field */}
            <Row style={{ marginBottom: '10px' }}>
              <Col>
                <BootstrapForm.Group controlId="fixedPayment">
                  <BootstrapForm.Check
                    type="checkbox"
                    label="Fixed"
                    checked={formData.isFixed}
                    onChange={(e) =>
                      setFormData({ ...formData, isFixed: e.target.checked })
                    }
                  />
                  {formData.isFixed && (
                    <div style={{ marginTop: '10px' }}>
                      <BootstrapForm.Control
                        type="number"
                        placeholder="Total payment"
                        value={formData.fixedPayment || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fixedPayment: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </BootstrapForm.Group>
              </Col>

              {/* Hourly checkbox and conditional field */}
              <Col>
                <BootstrapForm.Group controlId="hourlyPayment">
                  <BootstrapForm.Check
                    type="checkbox"
                    label="Hourly"
                    checked={formData.isHourly}
                    onChange={(e) =>
                      setFormData({ ...formData, isHourly: e.target.checked })
                    }
                  />
                  {formData.isHourly && (
                    <div style={{ marginTop: '10px' }}>
                      <BootstrapForm.Control
                        type="number"
                        placeholder="Hourly payment"
                        value={formData.hourlyPayment || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hourlyPayment: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </BootstrapForm.Group>
              </Col>
            </Row>

            {/* Per Device checkbox and conditional field */}
            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="perDevicePayment">
                  <BootstrapForm.Check
                    type="checkbox"
                    label="Per Device"
                    checked={formData.isPerDevice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isPerDevice: e.target.checked,
                      })
                    }
                  />
                  {formData.isPerDevice && (
                    <div style={{ marginTop: '10px' }}>
                      <BootstrapForm.Control
                        type="number"
                        placeholder="Per device payment"
                        value={formData.perDevicePayment || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            perDevicePayment: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </BootstrapForm.Group>
              </Col>

              {/* Blended checkbox and conditional fields */}
              <Col>
                <BootstrapForm.Group controlId="blendedPayment">
                  <BootstrapForm.Check
                    type="checkbox"
                    label="Blended"
                    checked={formData.isBlended}
                    onChange={(e) =>
                      setFormData({ ...formData, isBlended: e.target.checked })
                    }
                  />
                  {formData.isBlended && (
                    <>
                      <div style={{ marginTop: '10px' }}>
                        <BootstrapForm.Control
                          type="number"
                          placeholder="Fixed hourly payment"
                          value={formData.firstHourlyPayment || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstHourlyPayment: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <BootstrapForm.Control
                          type="number"
                          placeholder="Additional hourly payment"
                          value={formData.additionalHourlyPayment || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              additionalHourlyPayment: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </BootstrapForm.Group>
              </Col>
            </Row>

            <div style={{ marginTop: '20px' }}>
              <h5>Schedule</h5>
            </div>
            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <TimeZoneSelect
                  onChange={(value) =>
                    setFormData({ ...formData, timeZone: value })
                  }
                  selectedTimeZone={formData.timeZone}
                />
              </Col>
            </Row>

            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="workingWindowStartAt">
                  <BootstrapForm.Label>Daily Start At</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="time"
                    name="workingWindowStartAt"
                    value={formData.workingWindowStartAt}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col>
                <BootstrapForm.Group controlId="workingWindowEndAt">
                  <BootstrapForm.Label>Daily End At</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="time"
                    name="workingWindowEndAt"
                    value={formData.workingWindowEndAt}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <div>
              <h6>Off Days</h6>
            </div>
            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="offDays">
                  <Row style={{ marginBottom: '20px' }}>
                    {[
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday',
                    ].map((day) => (
                      <Col sm={4} key={day}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            value={day}
                            checked={
                              formData.offDays && formData.offDays.includes(day)
                            }
                            onChange={handleOffDayChange}
                            id={`offDayCheckbox-${day}`} // Unique id for each checkbox
                          />
                          <label
                            htmlFor={`offDayCheckbox-${day}`}
                            style={{ marginLeft: '8px' }}
                          >
                            {day}
                          </label>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </BootstrapForm.Group>
              </Col>
            </Row>

            <div>
              <h6>Planned Time-Off</h6>
            </div>
            <Row style={{ marginBottom: '20px' }}>
              <Col md={6}>
                <BootstrapForm.Group controlId="timeOffStartAt">
                  <BootstrapForm.Label>Start Date-Time</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="datetime-local"
                    name="timeOffStartAt"
                    value={formatDateForInput(formData.timeOffStartAt)}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col md={6}>
                <BootstrapForm.Group controlId="timeOffEndAt">
                  <BootstrapForm.Label>End Date-Time</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="datetime-local"
                    name="timeOffEndAt"
                    value={formatDateForInput(formData.timeOffEndAt)}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row style={{ marginBottom: '20px' }}>
              <Col>
                {/* Counter-offer checkbox and conditional field */}
                <BootstrapForm.Group controlId="counterOffer">
                  <BootstrapForm.Check
                    type="checkbox"
                    label="Counter Offer"
                    checked={formData.isEnabledCounterOffer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isEnabledCounterOffer: e.target.checked,
                      })
                    }
                  />

                  <div style={{ marginTop: '10px' }}>
                    <Alert variant="info">
                      If counter offer is enabled, the cron will counter-offer
                      work orders that don't meet the configured payment and
                      schedule conditions.
                    </Alert>
                  </div>
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="status">
                  <BootstrapForm.Label>Status</BootstrapForm.Label>
                  <BootstrapForm.Control
                    as="select"
                    name="status"
                    value={formData.status || ''}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </BootstrapForm.Control>
                </BootstrapForm.Group>
              </Col>
            </Row>
          </BootstrapForm>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveChanges}
            disabled={!isFormValid}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

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
