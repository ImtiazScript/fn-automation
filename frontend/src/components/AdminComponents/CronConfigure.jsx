import { useState, useEffect } from "react";
import { Card, Col, Container, Row, ListGroup, Badge, Button, Modal, Form as BootstrapForm } from "react-bootstrap";
import { format } from 'date-fns';
import { useUpdateCronByCronIdMutation } from "../../slices/adminApiSlice";
import { toast } from "react-toastify";
import Select from 'react-select'

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
      });
    }
  }, [cron]);

  // Effect to update workOrderTypeOptions based on selectedWorkOrderTypesIds
  useEffect(() => {
    if (typesOfWorkOrder.length > 0 && cron.typesOfWorkOrder && cron.typesOfWorkOrder.length > 0) {
      const previouslySelectedOptions = typesOfWorkOrder
        .filter(type => cron.typesOfWorkOrder.includes(type.fnTypeId.toString()))
        .map(type => ({
          value: type.fnTypeId.toString(),
          label: type.fnTypeName,
        }));
      setWorkOrderTypeOptions(previouslySelectedOptions);
    }
  }, [cron.typesOfWorkOrder, typesOfWorkOrder]);

  const allWorkOrderTypeOptions = typesOfWorkOrder.map(type => ({
    value: type.fnTypeId.toString(), // Convert to string if necessary
    label: type.fnTypeName
  }));

  const handleWorkOrderTypeChange = (selectedOptions) => {
    setWorkOrderTypeOptions(selectedOptions);
  };

  const selectedFnTypeNames = workOrderTypeOptions.map((workOrderType) => workOrderType.label);

  const formatDateTime = (dateTime) => {
    return dateTime ? format(new Date(dateTime), 'MM/dd/yyyy hh:mm a') : 'N/A';
  };

  const formatDateForInput = (dateTime) => {
    return dateTime ? format(new Date(dateTime), "yyyy-MM-dd'T'HH:mm") : '';
  };

  const handleEditClick = () => setShowEditModal(true);
  const handleClose = () => setShowEditModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveChanges = async () => {
    const selectedFnTypeIds = workOrderTypeOptions.map((workOrderType) => workOrderType.value);
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
        typesOfWorkOrder: selectedFnTypeIds
      };

      // Call the mutation function
      const response = await updateCron(data).unwrap();
      // Close the modal
      // setShowEditModal(false);
      window.location.reload();

      // Handle success (e.g., show a toast message or refresh the data)
      toast.success("Cron updated successfully!");

    } catch (error) {
      // Handle error (e.g., show an error message)
      toast.error("Failed to update cron.");
    }
  };

  return (
    <Container>
      <Card className="my-4">
        <Card.Header as="h5">Cron Details</Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Cron Id:</strong> {cron.cronId}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Provider Name:</strong> {cron.name}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Cron Start At:</strong> {formatDateTime(cron.cronStartAt)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Cron End At:</strong> {formatDateTime(cron.cronEndAt)}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={4}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Center Zip:</strong> {cron.centerZip}
                </ListGroup.Item>
              <ListGroup.Item>
                  <strong>Driving Radius:</strong> {cron.drivingRadius} miles
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Work Start:</strong> {formatDateTime(cron.workingWindowStartAt)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Work End:</strong> {formatDateTime(cron.workingWindowEndAt)}
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
          <Row className="mt-4">
            <Col md={4}>
              <ListGroup variant="flush">
              <ListGroup.Item>
                  <strong>Status:</strong> <Badge bg={cron.status === 'active' ? 'success' : 'secondary'}>{cron.status}</Badge>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Total Requested:</strong> {cron.totalRequested}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>WO IDs:</strong> {cron.requestedWoIds && cron.requestedWoIds.length > 0 ? cron.requestedWoIds.join(', ') : 'None'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Created At:</strong> {formatDateTime(cron.createdAt)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Last Updated At:</strong> {formatDateTime(cron.updatedAt)}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={8}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Types or Work Order:</strong>
                </ListGroup.Item>
                {selectedFnTypeNames.reduce((result, typeName, index) => {
                  if (index % 3 === 0) {
                    // Start a new row for every three items
                    result.push([typeName]);
                  } else {
                    // Add to the existing row
                    result[result.length - 1].push(typeName);
                  }
                  return result;
                }, []).map((trio, trioIndex) => (
                  <ListGroup.Item key={trioIndex}>
                    <Row>
                      <Col><div className="label-item">{trio[0]}</div></Col>
                      {trio[1] && <Col><div className="label-item">{trio[1]}</div></Col>}
                      {trio[2] && <Col><div className="label-item">{trio[2]}</div></Col>}
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Col>


          </Row>
          <Row className="mt-4">
            <Col className="d-flex justify-content-end">
              <Button variant="primary" onClick={handleEditClick}>Edit</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Modal show={showEditModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Cron Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BootstrapForm>
            <BootstrapForm.Group controlId="cronStartAt">
              <BootstrapForm.Label>Cron Start At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="datetime-local"
                name="cronStartAt"
                value={formatDateForInput(formData.cronStartAt)}
                onChange={handleChange}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="cronEndAt">
              <BootstrapForm.Label>Cron End At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="datetime-local"
                name="cronEndAt"
                value={formatDateForInput(formData.cronEndAt)}
                onChange={handleChange}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="workingWindowStartAt">
              <BootstrapForm.Label>Working Window Start At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="datetime-local"
                name="workingWindowStartAt"
                value={formatDateForInput(formData.workingWindowStartAt)}
                onChange={handleChange}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="workingWindowEndAt">
              <BootstrapForm.Label>Working Window End At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="datetime-local"
                name="workingWindowEndAt"
                value={formatDateForInput(formData.cronStartAt)}
                onChange={handleChange}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="drivingRadius">
              <BootstrapForm.Label>Driving Radius</BootstrapForm.Label>
              <BootstrapForm.Control
                type="number"
                name="drivingRadius"
                value={formData.drivingRadius || ''}
                onChange={handleChange}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="status">
            <BootstrapForm.Label>Status</BootstrapForm.Label>
              <BootstrapForm.Control
                as="select"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
              >
                <option value="" disabled>Select Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </BootstrapForm.Control>
            </BootstrapForm.Group>

            <BootstrapForm.Group controlId="centerZip">
              <BootstrapForm.Label>Center Zip</BootstrapForm.Label>
              <BootstrapForm.Control
                type="text"
                name="centerZip"
                value={formData.centerZip || ''}
                onChange={handleChange}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="workOrderTypes">
              <BootstrapForm.Label>Types of Work Order</BootstrapForm.Label>
              <Select
                value={workOrderTypeOptions}
                isMulti
                name="types_of_work_order"
                options={allWorkOrderTypeOptions}
                onChange={(selectedOptions) => handleWorkOrderTypeChange(selectedOptions)}
                className="basic-multi-select"
                classNamePrefix="select" />
            </BootstrapForm.Group>
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
