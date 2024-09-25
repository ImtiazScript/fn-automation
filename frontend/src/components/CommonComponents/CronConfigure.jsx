import { useState, useEffect } from 'react';
import {
  Card,
  Col,
  Container,
  Row,
  ListGroup,
  Badge,
  Button,
} from 'react-bootstrap';
import CronConfigModal from './CronConfigModal';

const CronConfigure = ({ cron, typesOfWorkOrder }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [workOrderTypeOptions, setWorkOrderTypeOptions] = useState([]);
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

  const handleEditClick = () => setShowEditModal(true);

  console.log('rendering cron configure');

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
                    <strong>Per Device Payment:</strong> $
                    {cron.perDevicePayment}/device
                  </ListGroup.Item>
                )}
                {cron.isBlended && (
                  <ListGroup.Item>
                    <strong>Blended Payment:</strong> ${cron.firstHourlyPayment}
                    /hour (first hours), ${cron.additionalHourlyPayment}/hour
                    (additional hours)
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
            <strong>Counter-offer:</strong>{' '}
            <Col md={12}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Counter Offer:</strong>{' '}
                  {cron.isEnabledCounterOffer ? 'Enabled' : 'Disabled'}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            {cron.isEnabledCounterOffer && (
              <>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Payment Change Note:</strong>{' '}
                      {cron.paymentChangeNote}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Schedule Change Note:</strong>{' '}
                      {cron.scheduleChangeNote}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={12}>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Schedule & Payment Change Note:</strong>{' '}
                      {cron.scheduleAndPayChangeNote}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </>
            )}
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
                            href={`${
                              import.meta.env.VITE_FN_FRONT_END_BASE_URL
                            }/workorders/${woId}`}
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

      <CronConfigModal
        cron={cron}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        typesOfWorkOrder={typesOfWorkOrder}
      />
    </Container>
  );
};

export default CronConfigure;
