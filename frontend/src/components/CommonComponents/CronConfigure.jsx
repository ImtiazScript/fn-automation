import { useState, useEffect } from 'react';
import {
  Card,
  Col,
  Container,
  Row,
  ListGroup,
  Badge,
  Button,
  Modal,
  Alert,
  Form as BootstrapForm,
} from 'react-bootstrap';
import { format } from 'date-fns';
import { useUpdateCronByCronIdMutation } from '../../slices/commonApiSlice';
import { toast } from 'react-toastify';
import Select from 'react-select';
import TimeZoneSelect from '../utils/TimeZoneSelect';

const CronConfigure = ({ cron, typesOfWorkOrder }) => {
  const [updateCron] = useUpdateCronByCronIdMutation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [workOrderTypeOptions, setWorkOrderTypeOptions] = useState([]);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (cron) {
      setFormData({
        cronStartAt: cron.cronStartAt,
        cronEndAt: cron.cronEndAt,
        workingWindowStartAt: cron.workingWindowStartAt,
        workingWindowEndAt: cron.workingWindowEndAt,
        drivingRadius: cron.drivingRadius,
        status: cron.status,
        centerZip: cron.centerZip,
        // Request configuration
        isFixed: cron.isFixed || false,
        fixedPayment: cron.fixedPayment,
        isHourly: cron.isHourly || false,
        hourlyPayment: cron.hourlyPayment,
        isPerDevice: cron.isPerDevice || false,
        perDevicePayment: cron.perDevicePayment,
        isBlended: cron.isBlended || false,
        firstHourlyPayment: cron.firstHourlyPayment,
        additionalHourlyPayment: cron.additionalHourlyPayment,
        // Counter offer
        isEnabledCounterOffer: cron.isEnabledCounterOffer || false,
        offDays: cron.offDays || [],
        timeOffStartAt: cron.timeOffStartAt,
        timeOffEndAt: cron.timeOffEndAt,
        timeZone: cron.timeZone,
      });
    }
  }, [cron]);

  // Effect to update workOrderTypeOptions based on selectedWorkOrderTypesIds
  useEffect(() => {
    if (
      typesOfWorkOrder.length > 0 &&
      cron.typesOfWorkOrder &&
      cron.typesOfWorkOrder.length > 0
    ) {
      const previouslySelectedOptions = typesOfWorkOrder
        .filter((type) =>
          cron.typesOfWorkOrder.includes(type.fnTypeId.toString()),
        )
        .map((type) => ({
          value: type.fnTypeId.toString(),
          label: type.fnTypeName,
        }));
      setWorkOrderTypeOptions(previouslySelectedOptions);
    }
  }, [cron.typesOfWorkOrder, typesOfWorkOrder]);

  const allWorkOrderTypeOptions = typesOfWorkOrder.map((type) => ({
    value: type.fnTypeId.toString(), // Convert to string if necessary
    label: type.fnTypeName,
  }));

  const handleWorkOrderTypeChange = (selectedOptions) => {
    setWorkOrderTypeOptions(selectedOptions);
  };

  const selectedFnTypeNames = workOrderTypeOptions.map(
    (workOrderType) => workOrderType.label,
  );

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
  
    // Split the dateTime string into date and time parts
    const [date, time] = dateTime.split('T');
    const [year, month, day] = date.split('-');
    let [hours, minutes] = time.split(':');
  
    // Convert to 12-hour format and determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 hours to 12 for AM
  
    // Return formatted date and time
    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) {
      return;
    }
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(hours, minutes);

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateForInput = (dateTime) => {
    if (!dateTime) return '';
  
    // Split the dateTime string into date and time parts
    const [date, time] = dateTime.split('T');
    const [year, month, day] = date.split('-');
    let [hours, minutes] = time.split(':');
  
    // Ensure hours and minutes are two digits for proper input formatting
    hours = hours.padStart(2, '0');
    minutes = minutes.padStart(2, '0');
  
    // Return the date in the correct format for input
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEditClick = () => setShowEditModal(true);
  const handleClose = () => setShowEditModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
        cronId: cron.cronId,
        centerZip: formData.centerZip,
        cronStartAt: formData.cronStartAt,
        cronEndAt: formData.cronEndAt,
        workingWindowStartAt: formData.workingWindowStartAt,
        workingWindowEndAt: formData.workingWindowEndAt,
        drivingRadius: formData.drivingRadius,
        status: formData.status,
        typesOfWorkOrder: selectedFnTypeIds,
        isFixed: formData.isFixed,
        fixedPayment: formData.fixedPayment
          ? parseInt(formData.fixedPayment)
          : 0,
        isHourly: formData.isHourly,
        hourlyPayment: formData.hourlyPayment
          ? parseInt(formData.hourlyPayment)
          : 0,
        isPerDevice: formData.isPerDevice,
        perDevicePayment: formData.perDevicePayment
          ? parseInt(formData.perDevicePayment)
          : 0,
        isBlended: formData.isBlended,
        firstHourlyPayment: formData.firstHourlyPayment
          ? parseInt(formData.firstHourlyPayment)
          : 0,
        additionalHourlyPayment: formData.additionalHourlyPayment
          ? parseInt(formData.additionalHourlyPayment)
          : 0,
        isEnabledCounterOffer: formData.isEnabledCounterOffer,
        offDays: formData.offDays,
        timeOffStartAt: formData.timeOffStartAt,
        timeOffEndAt: formData.timeOffEndAt,
        timeZone: formData.timeZone,
      };

      // Call the mutation function
      const response = await updateCron(data).unwrap();
      // Close the modal
      // setShowEditModal(false);
      window.location.reload();

      // Handle success (e.g., show a toast message or refresh the data)
      toast.success('Cron updated successfully!');
    } catch (error) {
      // Handle error (e.g., show an error message)
      toast.error('Failed to update cron.');
    }
  };

  console.log(cron.cronStartAt);

  return (
    <Container>
      <Card className="my-4">
        <Card.Header as="h5">Cron Details</Card.Header>
        <Card.Body>
          <Row style={{ marginBottom: '20px' }}>
            <Col md={8}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Cron Id:</strong> {cron.cronId}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Provider Name:</strong> {cron.name}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Cron Start At:</strong>{' '}
                  {formatDateTime(cron.cronStartAt)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Cron End At:</strong> {formatDateTime(cron.cronEndAt)}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={4}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Status:</strong>{' '}
                  <Badge
                    bg={cron.status === 'active' ? 'success' : 'secondary'}
                  >
                    {cron.status}
                  </Badge>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Center Zip:</strong> {cron.centerZip}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Driving Radius:</strong> {cron.drivingRadius} miles
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>

          <Row style={{ marginBottom: '20px' }}>
            <Col md={8}>
            <strong>Payment Types:</strong>{' '}
              <ListGroup variant="flush">
              {cron.isFixed && (
                    <ListGroup.Item>
                      <strong>Fixed Payment:</strong> ${cron.fixedPayment}
                    </ListGroup.Item>
                  )}
                  {cron.isHourly && (
                    <ListGroup.Item>
                      <strong>Hourly Payment:</strong> ${cron.hourlyPayment}/hour
                    </ListGroup.Item>
                  )}
                  {cron.isPerDevice && (
                    <ListGroup.Item>
                      <strong>Per Device Payment:</strong> ${cron.perDevicePayment}/device
                    </ListGroup.Item>
                  )}
                  {cron.isBlended && (
                    <ListGroup.Item>
                      <strong>Blended Payment:</strong> ${cron.firstHourlyPayment}/hour (first hours),
                      ${cron.additionalHourlyPayment}/hour (additional hours)
                    </ListGroup.Item>
                  )}
              </ListGroup>
            </Col>

            <Col md={4}>
            <strong>Schedule:</strong>{' '}
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Daily Working Schedule:</strong>{' '}
                  {formatTime(cron.workingWindowStartAt)} to{' '}
                  {formatTime(cron.workingWindowEndAt)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Off Days:</strong>{' '}
                  {cron.offDays?.length > 0 ? cron.offDays.join(', ') : 'None'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Planned Time Off:</strong>{' '}
                  {cron.timeOffStartAt && cron.timeOffEndAt ? (
                    <span>
                      {' '}
                      {formatDateTime(cron.timeOffStartAt)} to{' '}
                      {formatDateTime(cron.timeOffEndAt)}
                    </span>
                  ) : (
                    'None'
                  )}
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>

          <Row style={{ marginBottom: '20px' }}>
            <Col md={8}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Counter Offer:</strong>{' '}
                  {cron.isEnabledCounterOffer ? 'Enabled' : 'Disabled'}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            {/* <Col md={4}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Counter Offer:</strong>
                  {cron.isEnabledCounterOffer ? 'Enabled' : 'Disabled'}
                </ListGroup.Item>
              </ListGroup>
            </Col> */}
          </Row>

          <Row className="mt-4">
            <Col md={4}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Total Requested:</strong> {cron.totalRequested}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>WO IDs:</strong>{' '}
                  {cron.requestedWoIds && cron.requestedWoIds.length > 0
                    ? cron.requestedWoIds.map((woId, index) => (
                        <span key={woId}>
                          <a
                            href={`https://ui-qa5.fndev.net/workorders/${woId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            {woId}
                          </a>
                          {index < cron.requestedWoIds.length - 1 && ', '}
                        </span>
                      ))
                    : 'None'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Created At:</strong> {formatDateTime(cron.createdAt)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Last Updated At:</strong>{' '}
                  {formatDateTime(cron.updatedAt)}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={8}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Types or Work Order:</strong>
                </ListGroup.Item>
                {selectedFnTypeNames
                  .reduce((result, typeName, index) => {
                    if (index % 3 === 0) {
                      // Start a new row for every three items
                      result.push([typeName]);
                    } else {
                      // Add to the existing row
                      result[result.length - 1].push(typeName);
                    }
                    return result;
                  }, [])
                  .map((trio, trioIndex) => (
                    <ListGroup.Item key={trioIndex}>
                      <Row style={{ marginBottom: '20px' }}>
                        <Col>
                          <div className="label-item">{trio[0]}</div>
                        </Col>
                        {trio[1] && (
                          <Col>
                            <div className="label-item">{trio[1]}</div>
                          </Col>
                        )}
                        {trio[2] && (
                          <Col>
                            <div className="label-item">{trio[2]}</div>
                          </Col>
                        )}
                      </Row>
                    </ListGroup.Item>
                  ))}
              </ListGroup>
            </Col>
          </Row>
          <Row className="mt-4">
            <Col className="d-flex justify-content-end">
              <Button variant="primary" onClick={handleEditClick}>
                Edit
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Cron configuration update modal */}
      <Modal size="lg" show={showEditModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Cron Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BootstrapForm>
            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="cronStartAt">
                  <BootstrapForm.Label>Cron Start At</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="datetime-local"
                    name="cronStartAt"
                    value={formatDateForInput(formData.cronStartAt)}
                    onChange={handleChange}
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
                onChange={(value) => setFormData({ ...formData, timeZone: value })}
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
          <Button variant="primary" onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CronConfigure;
